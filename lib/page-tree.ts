import type * as PageTree from "fumadocs-core/page-tree";
import { db, pages, type Page } from "@/lib/db";
import { asc, eq } from "drizzle-orm";
import { flattenBlocksToSearchText } from "@/lib/search-text";

/**
 * Builds a Fumadocs PageTree.Root from a list of database page rows.
 */
export function buildPageTreeFromPages(
  allPages: Page[],
  baseUrl: string = "/docs"
): PageTree.Root {
  // Map pages by ID and group children by parentId
  const pagesById = new Map<string, Page>();
  const childrenByParent = new Map<string | null, Page[]>();

  for (const p of allPages) {
    if (p.status !== "published") continue;
    pagesById.set(p.id, p);

    const parentKey = p.parentId;
    if (!childrenByParent.has(parentKey)) {
      childrenByParent.set(parentKey, []);
    }
    childrenByParent.get(parentKey)!.push(p);
  }

  // Sort helper
  const sortPages = (items: Page[]) => {
    return items.sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return a.title.localeCompare(b.title);
    });
  };

  const buildSubTree = (parentId: string | null): PageTree.Node[] => {
    const childPages = childrenByParent.get(parentId) || [];
    const sorted = sortPages(childPages);

    return sorted.map((p): PageTree.Node => {
      const url = `${baseUrl}/${p.path}`.replace(/\/+/g, "/");
      const subChildren = buildSubTree(p.id);

      if (subChildren.length > 0) {
        const folderNode: PageTree.Folder = {
          type: "folder",
          name: p.title,
          index: {
            type: "page",
            name: p.title,
            url,
          },
          children: subChildren,
        };
        return folderNode;
      }

      const itemNode: PageTree.Item = {
        type: "page",
        name: p.title,
        url,
      };
      return itemNode;
    });
  };

  const rootChildren = buildSubTree(null);

  return {
    name: "vdocs",
    children: rootChildren,
  };
}

import { connection } from "next/server";

/**
 * Fetches all published pages from the database and returns the Fumadocs PageTree.
 * If the database has no pages, it seeds initial starter documentation.
 */
export async function getDbPageTree(baseUrl: string = "/docs"): Promise<PageTree.Root> {
  await connection();
  try {
    let dbPages = await db
      .select()
      .from(pages)
      .where(eq(pages.status, "published"))
      .orderBy(asc(pages.position));

    if (dbPages.length === 0) {
      await seedInitialPages();
      dbPages = await db
        .select()
        .from(pages)
        .where(eq(pages.status, "published"))
        .orderBy(asc(pages.position));
    }

    return buildPageTreeFromPages(dbPages, baseUrl);
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
