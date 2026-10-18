"use server";

import { db, pages, pathRedirects, type Block, blockSchema } from "@/lib/db";
import { eq, asc, sql, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { flattenBlocksToSearchText } from "@/lib/search-text";

/**
 * Saves updated blocks for a page, recomputes full-text search text,
 * and revalidates cached routes.
 */
export async function savePageBlocks(pageId: string, rawBlocks: any[]) {
  try {
    // 1. Validate each block against the Zod schema
    const validatedBlocks: Block[] = rawBlocks.map((b) => blockSchema.parse(b));

    // 2. Fetch page for title and tags to regenerate search text
    const [page] = await db
      .select({
        id: pages.id,
        path: pages.path,
        title: pages.title,
        tags: pages.tags,
      })
      .from(pages)
      .where(eq(pages.id, pageId));

    if (!page) {
      return { success: false, error: "Page not found" };
    }

    const searchText = flattenBlocksToSearchText(
      page.title,
      validatedBlocks,
      page.tags || []
    );

    // 3. Update database
    await db
      .update(pages)
      .set({
        blocks: validatedBlocks,
        searchText,
        updatedAt: new Date(),
      })
      .where(eq(pages.id, pageId));

    // 4. Revalidate routes
    revalidatePath(`/docs/${page.path}`.replace(/\/+/g, "/"), "page");
    revalidatePath("/docs", "layout");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to save page blocks:", error);
    return { success: false, error: error?.message || "Failed to save blocks" };
  }
}

/**
 * Updates page settings (title, template, tags, status).
 */
export async function updatePageMetadata(
  pageId: string,
  metadata: {
    title?: string;
    template?: string;
    tags?: string[];
    status?: "draft" | "published";
  }
) {
  try {
    const [page] = await db
      .select()
      .from(pages)
      .where(eq(pages.id, pageId));

    if (!page) {
      return { success: false, error: "Page not found" };
    }

    const newTitle = metadata.title !== undefined ? metadata.title : page.title;
    const newTags = metadata.tags !== undefined ? metadata.tags : page.tags;
    const newTemplate = metadata.template !== undefined ? metadata.template : page.template;
    const newStatus = metadata.status !== undefined ? metadata.status : page.status;

    const searchText = flattenBlocksToSearchText(
      newTitle,
      page.blocks,
      newTags || []
    );

    await db
      .update(pages)
      .set({
        title: newTitle,
        tags: newTags,
        template: newTemplate,
        status: newStatus,
        searchText,
        updatedAt: new Date(),
      })
      .where(eq(pages.id, pageId));

    revalidatePath(`/docs/${page.path}`.replace(/\/+/g, "/"), "page");
    revalidatePath("/docs", "layout");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to update page metadata:", error);
    return { success: false, error: error?.message || "Failed to update page settings" };
  }
}

/**
 * Creates a new document under a category (as a top-level page) or under a parent page (as a sub-page).
 */
export async function createPage({
  parentId = null,
  category = "",
  title,
  slug,
  template = "note",
  tags = [],
}: {
  parentId?: string | null;
  category?: string;
  title: string;
  slug: string;
  template?: string;
  tags?: string[];
}) {
  try {
    let parentPath = "";
    if (parentId) {
      const [parent] = await db
        .select({ path: pages.path })
        .from(pages)
        .where(eq(pages.id, parentId));
      if (parent) {
        parentPath = parent.path;
      }
    } else if (category) {
      parentPath = category.trim().replace(/^\/+|\/+$/g, "");
    }

    // Clean slug
    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-_]/g, "-").replace(/-+/g, "-");
    const fullPath = parentPath ? `${parentPath}/${cleanSlug}`.replace(/^\/+/, "") : cleanSlug;

    // Check path uniqueness
    const [existing] = await db
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.path, fullPath));

    if (existing) {
      return { success: false, error: `A page with path '${fullPath}' already exists` };
    }

    // Initial starter block based on template
    let initialBlocks: Block[] = [];
    if (template === "command") {
      initialBlocks = [
        {
          id: `cmd-${Date.now()}`,
          type: "command",
          data: {
            title: `${title} Command`,
            command: "echo 'hello world'",
            shell: "bash",
            sudo: false,
            os: ["Linux"],
          },
        },
      ];
    } else if (template === "qa") {
      initialBlocks = [
        {
          id: `qa-${Date.now()}`,
          type: "qa",
          data: {
            question: `${title}?`,
            short: "Concise summary answer.",
            long: "Detailed explanation and context.",
          },
        },
      ];
    } else if (template === "steps") {
      initialBlocks = [
        {
          id: `steps-${Date.now()}`,
          type: "steps",
          data: {
            title: "Step-by-Step Instructions",
            steps: [{ text: "First step instruction" }, { text: "Second step instruction" }],
          },
        },
      ];
    } else {
      initialBlocks = [
        {
          id: `note-${Date.now()}`,
          type: "note",
          data: {
            title: title,
            markdown: "Write your documentation notes here in GitHub Flavored Markdown...",
          },
        },
      ];
    }

    const searchText = flattenBlocksToSearchText(title, initialBlocks, tags);

    const [newPage] = await db
      .insert(pages)
      .values({
        parentId,
        slug: cleanSlug,
        path: fullPath,
        title,
        template,
        blocks: initialBlocks,
        tags,
        status: "published",
        searchText,
      })
      .returning();

    revalidatePath("/docs", "layout");
    return { success: true, page: newPage };
  } catch (error: any) {
    console.error("Failed to create page:", error);
    return { success: false, error: error?.message || "Failed to create page" };
  }
}

/**
 * Creates a brand new top-level category page (root section).
 */
export async function createCategory({
  title,
  slug,
  description = "",
  template = "index",
}: {
  title: string;
  slug: string;
  description?: string;
  template?: string;
}) {
  try {
    const cleanSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-_]/g, "-")
      .replace(/-+/g, "-");

    const [existing] = await db
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.path, cleanSlug));

    if (existing) {
      return { success: false, error: `A category or page with path '${cleanSlug}' already exists` };
    }

    const initialBlocks: Block[] = [
      {
        id: `note-${Date.now()}`,
        type: "note",
        data: {
          title: title,
          markdown: description
            ? `${description}\n\nBrowse sub-pages and runbooks in this section below.`
            : `Welcome to **${title}**. Browse sub-pages and runbooks in this section below.`,
        },
      },
    ];

    const searchText = flattenBlocksToSearchText(title, initialBlocks, [cleanSlug]);

    const [newCategory] = await db
      .insert(pages)
      .values({
        parentId: null,
        slug: cleanSlug,
        path: cleanSlug,
        title,
        template: template || "index",
        blocks: initialBlocks,
        tags: [cleanSlug],
        status: "published",
        searchText,
      })
      .returning();

    revalidatePath("/docs", "layout");
    return { success: true, page: newCategory };
  } catch (error: any) {
    console.error("Failed to create category:", error);
    return { success: false, error: error?.message || "Failed to create category" };
  }
}

/**
 * Toggles a document between draft and published status.
 */
export async function togglePageStatus(pageId: string) {
  try {
    const [page] = await db
      .select({ id: pages.id, status: pages.status, path: pages.path })
      .from(pages)
      .where(eq(pages.id, pageId));

    if (!page) {
      return { success: false, error: "Page not found" };
    }

    const nextStatus: "draft" | "published" =
      page.status === "published" ? "draft" : "published";

    await db
      .update(pages)
      .set({
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(pages.id, pageId));

    revalidatePath(`/docs/${page.path}`.replace(/\/+/g, "/"), "page");
    revalidatePath("/docs", "layout");

    return { success: true, status: nextStatus };
  } catch (error: any) {
    console.error("Failed to toggle page status:", error);
    return { success: false, error: error?.message || "Failed to toggle status" };
  }
}

/**
 * Deletes a page and revalidates navigation.
 */
export async function deletePage(pageId: string) {
  try {
    const [page] = await db
      .select({ path: pages.path, parentId: pages.parentId })
      .from(pages)
      .where(eq(pages.id, pageId));

    if (!page) {
      return { success: false, error: "Page not found" };
    }

    let parentPath = "";
    if (page.parentId) {
      const [parent] = await db
        .select({ path: pages.path })
        .from(pages)
        .where(eq(pages.id, page.parentId));
      if (parent) {
        parentPath = parent.path;
      }
    }

    await db.delete(pages).where(eq(pages.id, pageId));

    revalidatePath("/docs", "layout");
    return { success: true, parentPath };
  } catch (error: any) {
    console.error("Failed to delete page:", error);
    return { success: false, error: error?.message || "Failed to delete page" };
  }
}

/**
 * Fetches all top-level categories available in the vault.
 */
export async function getVaultCategories() {
  try {
    const rootRows = await db
      .select({
        id: pages.id,
        title: pages.title,
        path: pages.path,
        slug: pages.slug,
      })
      .from(pages)
      .where(isNull(pages.parentId));

    const categoriesMap = new Map<string, { label: string; slug: string }>();
    categoriesMap.set("", { label: "Vault (Root)", slug: "" });
    categoriesMap.set("commands", { label: "Commands", slug: "commands" });
    categoriesMap.set("applications", { label: "Applications", slug: "applications" });

    for (const row of rootRows) {
      if (!row.path) continue;
      const firstSegment = row.path.split("/")[0];
      if (firstSegment && !categoriesMap.has(firstSegment)) {
        categoriesMap.set(firstSegment, {
          label: row.title || (firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1)),
          slug: firstSegment,
        });
      }
    }

    return { success: true, categories: Array.from(categoriesMap.values()) };
  } catch (error: any) {
    console.error("Failed to fetch vault categories:", error);
    return {
      success: true,
      categories: [
        { label: "Vault (Root)", slug: "" },
        { label: "Commands", slug: "commands" },
        { label: "Applications", slug: "applications" },
      ],
    };
  }
}

