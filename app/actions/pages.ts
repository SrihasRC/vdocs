"use server";

import { db, pages, pathRedirects, type Block, blockSchema } from "@/lib/db";
import { eq, asc, sql } from "drizzle-orm";
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
 * Creates a new subpage under a parent page (or root).
 */
export async function createPage({
  parentId = null,
  title,
  slug,
  template = "note",
  tags = [],
}: {
  parentId?: string | null;
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
 * Deletes a page and revalidates navigation.
 */
export async function deletePage(pageId: string) {
  try {
    const [page] = await db
      .select({ path: pages.path })
      .from(pages)
      .where(eq(pages.id, pageId));

    if (!page) {
      return { success: false, error: "Page not found" };
    }

    await db.delete(pages).where(eq(pages.id, pageId));

    revalidatePath("/docs", "layout");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete page:", error);
    return { success: false, error: error?.message || "Failed to delete page" };
  }
}
