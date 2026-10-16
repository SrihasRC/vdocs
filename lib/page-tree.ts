import type * as PageTree from "fumadocs-core/page-tree";
import { db, pages, type Page } from "@/lib/db";
import { asc, eq } from "drizzle-orm";
import { flattenBlocksToSearchText } from "@/lib/search-text";

/**
 * Builds a Fumadocs PageTree.Root from a list of database page rows.
 */
/**
 * Builds a Fumadocs PageTree.Root from a list of database page rows,
 * organizing pages into scoped root tabs (Vault, Commands, Applications)
 * with section category separators.
 */
export function buildPageTreeFromPages(
  allPages: Page[],
  baseUrl: string = "/docs"
): PageTree.Root {
  // 1. Discover all root categories
  // Default recognized categories
  const knownCategories = new Map<
    string,
    { rootName: string; rootDesc: string; categoryLabel: string; sortOrder: number }
  >();

  knownCategories.set("commands", {
    rootName: "Commands",
    rootDesc: "System commands & CLI snippets",
    categoryLabel: "Runbooks & Tools",
    sortOrder: 1,
  });

  knownCategories.set("applications", {
    rootName: "Applications",
    rootDesc: "Job applications, questions & profiles",
    categoryLabel: "Career & Preparation",
    sortOrder: 2,
  });

  // Dynamically discover any other custom root categories
  let customOrder = 3;
  for (const p of allPages) {
    if (!p.path || p.path === "quickstart" || p.path === "inbox") continue;
    const firstSegment = p.path.split("/")[0];
    if (firstSegment && !knownCategories.has(firstSegment)) {
      const rootPage = allPages.find((ap) => ap.path === firstSegment);
      knownCategories.set(firstSegment, {
        rootName: rootPage
          ? rootPage.title
          : firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1),
        rootDesc: `${firstSegment} documentation`,
        categoryLabel: "Documents",
        sortOrder: customOrder++,
      });
    }
  }

  // 2. Partition pages into buckets by category
  const vaultPages: Page[] = [];
  const categoryBuckets = new Map<string, Page[]>();

  for (const catKey of knownCategories.keys()) {
    categoryBuckets.set(catKey, []);
  }

  for (const p of allPages) {
    let matchedCategory: string | null = null;
    for (const catKey of knownCategories.keys()) {
      if (p.path === catKey || p.path.startsWith(`${catKey}/`)) {
        matchedCategory = catKey;
        break;
      }
    }

    if (matchedCategory && categoryBuckets.has(matchedCategory)) {
      categoryBuckets.get(matchedCategory)!.push(p);
    } else {
      vaultPages.push(p);
    }
  }

  const sortPages = (items: Page[]) => {
    return items.sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return a.title.localeCompare(b.title);
    });
  };

  const buildSection = ({
    sectionPages,
    sectionKey,
    rootName,
    rootDesc,
    categoryLabel,
  }: {
    sectionPages: Page[];
    sectionKey: string;
    rootName: string;
    rootDesc: string;
    categoryLabel: string;
  }): PageTree.Folder => {
    // Locate the section index page
    const indexPage =
      sectionPages.find((p) => p.path === sectionKey) ||
      sectionPages.find((p) => p.path === "");

    const otherPages = sectionPages.filter((p) => p !== indexPage);

    const pagesById = new Map<string, Page>();
    const childrenByParent = new Map<string | null, Page[]>();

    for (const p of otherPages) {
      pagesById.set(p.id, p);
    }

    for (const p of otherPages) {
      let parentKey = p.parentId;
      if (!parentKey || (indexPage && parentKey === indexPage.id)) {
        parentKey = null;
      } else if (!pagesById.has(parentKey)) {
        const parts = p.path.split("/");
        parts.pop();
        const parentPath = parts.join("/");
        const parentByPath = otherPages.find((op) => op.path === parentPath);
        parentKey = parentByPath ? parentByPath.id : null;
      }

      if (!childrenByParent.has(parentKey)) {
        childrenByParent.set(parentKey, []);
      }
      childrenByParent.get(parentKey)!.push(p);
    }

    const buildSubTree = (parentId: string | null): PageTree.Node[] => {
      const childPages = childrenByParent.get(parentId) || [];
      const sorted = sortPages(childPages);

      return sorted.map((p): PageTree.Node => {
        const url = `${baseUrl}/${p.path}`.replace(/\/+/g, "/").replace(/\/$/, "");
        const subChildren = buildSubTree(p.id);
        const displayName = p.status === "draft" ? `${p.title} (Draft)` : p.title;

        if (subChildren.length > 0) {
          const folderNode: PageTree.Folder = {
            type: "folder",
            name: displayName,
            index: {
              type: "page",
              name: displayName,
              url,
            },
            children: subChildren,
          };
          (folderNode as any).$id = p.id;
          return folderNode;
        }

        const itemNode: PageTree.Item = {
          type: "page",
          name: displayName,
          url,
        };
        (itemNode as any).$id = p.id;
        return itemNode;
      });
    };

    const rootNodes = buildSubTree(null);

    const sectionUrl = sectionKey
      ? `${baseUrl}/${sectionKey}`.replace(/\/+/g, "/")
      : baseUrl;

    const sectionIndexItem: PageTree.Node[] = indexPage
      ? [
          {
            type: "page",
            name: indexPage.status === "draft" ? `${indexPage.title} (Draft)` : indexPage.title,
            url: sectionUrl,
          },
        ]
      : [];
    if (sectionIndexItem[0]) {
      (sectionIndexItem[0] as any).$id = indexPage?.id;
    }

    const children: PageTree.Node[] = [
      {
        type: "separator",
        name: categoryLabel,
      },
      ...sectionIndexItem,
      ...rootNodes,
    ];

    const folder: PageTree.Folder = {
      type: "folder",
      name: rootName,
      description: rootDesc,
      root: true,
      defaultOpen: true,
      index: {
        type: "page",
        name: indexPage ? indexPage.title : rootName,
        url: sectionUrl,
      },
      children,
    };
    (folder as any).$id = `root-${sectionKey || "vault"}`;

    return folder;
  };

  // Build Vault Section
  const vaultFolder = buildSection({
    sectionPages: vaultPages,
    sectionKey: "",
    rootName: "Vault",
    rootDesc: "Personal docs & knowledge base",
    categoryLabel: "Introduction",
  });

  // Build All Category Sections
  const sortedCategories = Array.from(knownCategories.entries()).sort(
    (a, b) => a[1].sortOrder - b[1].sortOrder
  );

  const categoryFolders = sortedCategories.map(([catKey, catInfo]) => {
    return buildSection({
      sectionPages: categoryBuckets.get(catKey) || [],
      sectionKey: catKey,
      rootName: catInfo.rootName,
      rootDesc: catInfo.rootDesc,
      categoryLabel: catInfo.categoryLabel,
    });
  });

  const tree: PageTree.Root = {
    name: "vdocs",
    children: [vaultFolder, ...categoryFolders],
  };

  return tree;
}

import { connection } from "next/server";

/**
 * Fetches all pages from the database and returns the Fumadocs PageTree.
 * If the database has no pages, it seeds initial starter documentation.
 */
export async function getDbPageTree(baseUrl: string = "/docs"): Promise<PageTree.Root> {
  await connection();
  try {
    let dbPages = await db
      .select()
      .from(pages)
      .orderBy(asc(pages.position));

    if (dbPages.length === 0) {
      await seedInitialPages();
      dbPages = await db
        .select()
        .from(pages)
        .orderBy(asc(pages.position));
    }

    const tree = buildPageTreeFromPages(dbPages, baseUrl);

    // Compute version hash for Fumadocs TreeContextProvider useMemo invalidation
    const versionKey = `${dbPages.length}-${dbPages
      .map((p) => `${p.id}:${p.updatedAt?.getTime?.() || 0}:${p.status}`)
      .join(",")}`;
    (tree as any).$id = versionKey;

    return tree;
  } catch (error) {
    console.error("Failed to fetch DB page tree:", error);
    return {
      name: "vdocs",
      children: [],
    };
  }
}

/**
 * Seed initial pages into Neon database with structured typed blocks.
 */
export async function seedInitialPages() {
  const existingCount = await db.$count(pages);
  if (existingCount > 0) return;

  // 0. Root Overview Page
  await db.insert(pages).values({
    slug: "index",
    path: "",
    title: "Vault Overview",
    template: "index",
    position: 0,
    tags: ["vault", "overview"],
    status: "published",
    blocks: [
      {
        id: "vault-intro",
        type: "note",
        data: {
          title: "Welcome to your Private Vault",
          markdown:
            "Welcome to **vdocs** — a fast, private documentation vault built for your terminal snippets, runbooks, and interview answers.\n\nEverything here is saved directly to your **Neon Postgres** database with instant search and typed structured blocks.",
        },
      },
      {
        id: "vault-quick-command",
        type: "command",
        data: {
          title: "Search your vault via CLI",
          description: "Instant full-text and trigram fuzzy search across all your notes and commands",
          shell: "bash",
          command: "vdocs search 'system update'",
          sudo: false,
          os: ["Linux", "macOS"],
          notes: "Fast fuzzy search powered by pg_trgm in Postgres.",
        },
      },
      {
        id: "vault-steps",
        type: "steps",
        data: {
          title: "How to use vdocs",
          steps: [
            { text: "Browse runbooks and snippets using the left sidebar navigation." },
            { text: "Use **Ctrl + K** or the top search bar for instant trigram search across all commands and answers.", command: "Ctrl + K" },
            { text: "Press **E** to switch into in-place edit mode to add or update blocks." },
          ],
        },
      },
    ],
    searchText: "Welcome to your Private Vault vdocs Search your vault via CLI How to use vdocs",
  });

  // 1. Root / Quick Start
  const [quickstart] = await db
    .insert(pages)
    .values({
      slug: "quickstart",
      path: "quickstart",
      title: "Quick Start",
      template: "index",
      position: 1,
      tags: ["getting-started", "core"],
      status: "published",
      blocks: [
        {
          id: "intro-note",
          type: "note",
          data: {
            markdown:
              "Welcome to **vdocs** — your personal, private knowledge vault.\n\nEverything here is saved directly to your **Neon Postgres** database with instant search and typed structured blocks.",
          },
        },
        {
          id: "first-command",
          type: "command",
          data: {
            title: "Connect to Neon Database",
            description: "Pull your environment variables and branch configurations",
            shell: "bash",
            command: "npx neonctl branches list",
            sudo: false,
            os: ["Linux", "macOS"],
            notes: "Requires Neon CLI installed.",
          },
        },
        {
          id: "sample-steps",
          type: "steps",
          data: {
            title: "Quick Capture Workflow",
            steps: [
              {
                text: "Press Cmd+K or click the search box to open the command palette.",
              },
              {
                text: "Choose 'New Command' or 'New Q&A' to capture an entry.",
                command: "vdocs capture --type command",
              },
              {
                text: "Copy commands or answers with one click anytime you need them.",
              },
            ],
          },
        },
      ],
      searchText: flattenBlocksToSearchText("Quick Start", [
        {
          id: "intro-note",
          type: "note",
          data: {
            markdown: "Welcome to vdocs. Everything here is saved directly to Neon Postgres.",
          },
        },
      ]),
    })
    .returning();

  // 2. Commands Category & Subpages
  const [commandsCategory] = await db
    .insert(pages)
    .values({
      slug: "commands",
      path: "commands",
      title: "Commands & Runbooks",
      template: "command",
      position: 2,
      tags: ["cli", "terminal"],
      status: "published",
      blocks: [
        {
          id: "system-update-cmd",
          type: "command",
          data: {
            title: "System Update & Clean Packages",
            description: "Full system upgrade with orphan package cleanup",
            shell: "bash",
            command: "sudo pacman -Syu && sudo pacman -Rns $(pacman -Qtdq)",
            sudo: true,
            os: ["Arch Linux"],
            notes: "Run weekly or before major driver updates.",
          },
        },
        {
          id: "docker-cleanup",
          type: "command",
          data: {
            title: "Docker Prune Unused Containers & Images",
            description: "Frees up local disk space from dangling images and volumes",
            shell: "bash",
            command: "docker system prune -a --volumes -f",
            sudo: false,
            os: ["Linux", "macOS"],
          },
        },
      ],
      searchText: flattenBlocksToSearchText("Commands & Runbooks", []),
    })
    .returning();

  // 3. Applications / Q&A
  await db.insert(pages).values({
    slug: "job-answers",
    path: "applications/job-answers",
    title: "Job Applications & Q&A",
    template: "qa",
    position: 3,
    tags: ["career", "applications"],
    status: "published",
    blocks: [
      {
        id: "qa-intro",
        type: "qa",
        data: {
          question: "Tell me about a complex technical challenge you solved.",
          short:
            "Architected a real-time collaborative documentation vault with Neon Postgres, optimistic locking, and presigned Cloudflare R2 uploads.",
          long:
            "Faced with high egress fees and scattered developer notes, I built a structured vault that stores typed content blocks in Postgres jsonb with pg_trgm fuzzy matching. Browser downloads stream directly from R2 using short-lived presigned URLs, keeping application server overhead near zero.",
        },
      },
    ],
    searchText: flattenBlocksToSearchText("Job Applications & Q&A", []),
  });

  console.log("Initial seed pages created in Neon database!");
}
