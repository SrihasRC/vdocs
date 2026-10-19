"use server";

import { db, pages, pathRedirects, type Block, blockSchema } from "@/lib/db";
import { eq, asc, sql, isNull, like } from "drizzle-orm";
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

/**
 * Retrieves valid destinations for moving a document (excluding itself and its descendants).
 */
export async function getAvailableMoveDestinations(currentPageId: string) {
  try {
    const allPages = await db
      .select({
        id: pages.id,
        title: pages.title,
        path: pages.path,
        parentId: pages.parentId,
      })
      .from(pages);

    const currentPage = allPages.find((p) => p.id === currentPageId);
    if (!currentPage) return { success: false, categories: [], parentPages: [] };

    const invalidPrefix = `${currentPage.path}/`;

    // Valid pages that are NOT currentPage and NOT descendants of currentPage
    const validPages = allPages.filter(
      (p) => p.id !== currentPageId && !p.path.startsWith(invalidPrefix)
    );

    // Root categories
    const categoriesMap = new Map<string, string>();
    categoriesMap.set("", "Vault (Root)");
    categoriesMap.set("commands", "Commands (Root)");
    categoriesMap.set("applications", "Applications (Root)");

    for (const p of allPages) {
      if (!p.parentId && p.path) {
        const seg = p.path.split("/")[0];
        if (seg && !categoriesMap.has(seg)) {
          categoriesMap.set(seg, `${p.title} (Category)`);
        }
      }
    }

    const categories = Array.from(categoriesMap.entries()).map(([slug, label]) => ({
      slug,
      label,
    }));

    const parentPages = validPages.map((p) => ({
      id: p.id,
      title: p.title,
      path: p.path,
      label: `${p.title} (/docs/${p.path})`,
    }));

    return {
      success: true,
      categories,
      parentPages,
    };
  } catch (err: any) {
    console.error("Failed to get move destinations:", err);
    return { success: false, categories: [], parentPages: [] };
  }
}

/**
 * Moves a page to a new category or under a new parent document,
 * updating its path and all descendant paths, and registering redirects.
 */
export async function movePage({
  pageId,
  destinationType,
  targetCategory,
  targetParentId,
}: {
  pageId: string;
  destinationType: "category" | "parent";
  targetCategory?: string;
  targetParentId?: string;
}) {
  try {
    const [page] = await db
      .select()
      .from(pages)
      .where(eq(pages.id, pageId));

    if (!page) {
      return { success: false, error: "Document not found" };
    }

    const oldPath = page.path;
    let newPath = "";
    let newParentId: string | null = null;

    if (destinationType === "parent" && targetParentId) {
      if (targetParentId === pageId) {
        return { success: false, error: "Cannot move a document into itself" };
      }
      const [parent] = await db
        .select()
        .from(pages)
        .where(eq(pages.id, targetParentId));

      if (!parent) {
        return { success: false, error: "Target parent document not found" };
      }

      if (parent.path === oldPath || parent.path.startsWith(`${oldPath}/`)) {
        return { success: false, error: "Cannot move a document into its own sub-page" };
      }

      newParentId = parent.id;
      newPath = `${parent.path}/${page.slug}`.replace(/\/+/g, "/").replace(/^\/+/, "");
    } else {
      // Destination is a category root or vault root
      const cleanCategory = (targetCategory || "").trim().replace(/^\/+|\/+$/g, "");
      newParentId = null;
      newPath = cleanCategory ? `${cleanCategory}/${page.slug}` : page.slug;
    }

    if (newPath === oldPath) {
      return { success: true, newPath, noChange: true };
    }

    // Check collision
    const [existing] = await db
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.path, newPath));

    if (existing && existing.id !== pageId) {
      return { success: false, error: `A document already exists at path '/docs/${newPath}'` };
    }

    // 1. Record redirect for oldPath -> pageId
    await db
      .insert(pathRedirects)
      .values({
        oldPath,
        pageId,
      })
      .onConflictDoUpdate({
        target: pathRedirects.oldPath,
        set: { pageId, createdAt: new Date() },
      });

    // 2. Update page itself
    await db
      .update(pages)
      .set({
        parentId: newParentId,
        path: newPath,
        updatedAt: new Date(),
      })
      .where(eq(pages.id, pageId));

    // 3. Update all descendants
    const descendantPages = await db
      .select({ id: pages.id, path: pages.path })
      .from(pages)
      .where(like(pages.path, `${oldPath}/%`));

    for (const child of descendantPages) {
      const childOldPath = child.path;
      const childNewPath = `${newPath}${child.path.slice(oldPath.length)}`;

      await db
        .insert(pathRedirects)
        .values({
          oldPath: childOldPath,
          pageId: child.id,
        })
        .onConflictDoUpdate({
          target: pathRedirects.oldPath,
          set: { pageId: child.id, createdAt: new Date() },
        });

      await db
        .update(pages)
        .set({
          path: childNewPath,
          updatedAt: new Date(),
        })
        .where(eq(pages.id, child.id));
    }

    revalidatePath("/docs", "layout");
    return { success: true, newPath };
  } catch (error: any) {
    console.error("Failed to move page:", error);
    return { success: false, error: error?.message || "Failed to move document" };
  }
}

/**
 * Duplicates an existing document along with all its blocks and metadata.
 */
export async function duplicatePage(pageId: string) {
  try {
    const [page] = await db.select().from(pages).where(eq(pages.id, pageId));
    if (!page) {
      return { success: false, error: "Document not found" };
    }

    const baseSlug = page.slug;
    let newSlug = `${baseSlug}-copy`;
    let counter = 1;

    const pathParts = page.path.split("/");
    pathParts.pop();
    const parentPathPrefix = pathParts.length > 0 ? `${pathParts.join("/")}/` : "";

    let newPath = `${parentPathPrefix}${newSlug}`;

    // Loop until we find an unused slug/path
    while (true) {
      const [existing] = await db
        .select({ id: pages.id })
        .from(pages)
        .where(eq(pages.path, newPath));
      if (!existing) break;
      counter++;
      newSlug = `${baseSlug}-copy-${counter}`;
      newPath = `${parentPathPrefix}${newSlug}`;
    }

    const clonedBlocks = ((page.blocks as Block[]) || []).map((b) => ({
      ...b,
      id: `${b.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    }));

    const title = `${page.title} (Copy)`;
    const searchText = flattenBlocksToSearchText(title, clonedBlocks, page.tags || []);

    const [newPage] = await db
      .insert(pages)
      .values({
        parentId: page.parentId,
        slug: newSlug,
        path: newPath,
        title,
        template: page.template,
        blocks: clonedBlocks,
        tags: [...(page.tags || [])],
        status: page.status,
        searchText,
      })
      .returning();

    revalidatePath("/docs", "layout");
    return { success: true, newPath, page: newPage };
  } catch (error: any) {
    console.error("Failed to duplicate page:", error);
    return { success: false, error: error?.message || "Failed to duplicate page" };
  }
}

/**
 * Promotes a single block into a brand new document in a selected category,
 * optionally removing it from the source page.
 */
export async function promoteBlockToPage({
  sourcePageId,
  block,
  title,
  category = "commands",
  removeSourceBlock = true,
}: {
  sourcePageId: string;
  block: Block;
  title: string;
  category?: string;
  removeSourceBlock?: boolean;
}) {
  try {
    const cleanCategory = (category || "").trim().replace(/^\/+|\/+$/g, "");
    let baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!baseSlug) baseSlug = "promoted-note";

    let newSlug = baseSlug;
    let newPath = cleanCategory ? `${cleanCategory}/${newSlug}` : newSlug;
    let counter = 1;

    while (true) {
      const [existing] = await db
        .select({ id: pages.id })
        .from(pages)
        .where(eq(pages.path, newPath));
      if (!existing) break;
      counter++;
      newSlug = `${baseSlug}-${counter}`;
      newPath = cleanCategory ? `${cleanCategory}/${newSlug}` : newSlug;
    }

    // Determine template
    let template = "note";
    if (block.type === "command") template = "command";
    else if (block.type === "qa") template = "qa";
    else if (block.type === "steps") template = "steps";

    const searchText = flattenBlocksToSearchText(title, [block], [cleanCategory].filter(Boolean));

    const [newPage] = await db
      .insert(pages)
      .values({
        parentId: null,
        slug: newSlug,
        path: newPath,
        title,
        template,
        blocks: [block],
        tags: cleanCategory ? [cleanCategory] : [],
        status: "published",
        searchText,
      })
      .returning();

    // Optionally remove block from source page
    if (removeSourceBlock && sourcePageId) {
      const [sourcePage] = await db
        .select()
        .from(pages)
        .where(eq(pages.id, sourcePageId));
      if (sourcePage) {
        const remainingBlocks = ((sourcePage.blocks as Block[]) || []).filter(
          (b) => b.id !== block.id
        );
        const updatedSearchText = flattenBlocksToSearchText(
          sourcePage.title,
          remainingBlocks,
          sourcePage.tags || []
        );
        await db
          .update(pages)
          .set({
            blocks: remainingBlocks,
            searchText: updatedSearchText,
            updatedAt: new Date(),
          })
          .where(eq(pages.id, sourcePageId));
      }
    }

    revalidatePath("/docs", "layout");
    return { success: true, newPath, pageId: newPage.id };
  } catch (err: any) {
    console.error("Failed to promote block:", err);
    return { success: false, error: err?.message || "Failed to promote block" };
  }
}

/**
 * Retrieves all pages in the vault for the block destination picker.
 */
export async function getPagesForBlockTransfer(currentPageId?: string) {
  try {
    const allPages = await db
      .select({
        id: pages.id,
        title: pages.title,
        path: pages.path,
        slug: pages.slug,
      })
      .from(pages)
      .orderBy(asc(pages.path));

    const validPages = allPages.filter((p) => p.id !== currentPageId);
    return { success: true, pages: validPages };
  } catch (err: any) {
    console.error("Failed to get pages for block transfer:", err);
    return { success: false, pages: [] };
  }
}

/**
 * Moves a block from one document to an existing document in the vault.
 */
export async function moveBlockToPage({
  sourcePageId,
  targetPageId,
  block,
  removeSourceBlock = true,
}: {
  sourcePageId: string;
  targetPageId: string;
  block: Block;
  removeSourceBlock?: boolean;
}) {
  try {
    const [targetPage] = await db
      .select()
      .from(pages)
      .where(eq(pages.id, targetPageId));

    if (!targetPage) {
      return { success: false, error: "Target document not found" };
    }

    // Assign fresh id to prevent collision
    const blockToInsert: Block = {
      ...block,
      id: `${block.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };

    const targetBlocks = (targetPage.blocks as Block[]) || [];
    const updatedTargetBlocks = [...targetBlocks, blockToInsert];
    const targetSearchText = flattenBlocksToSearchText(
      targetPage.title,
      updatedTargetBlocks,
      targetPage.tags || []
    );

    // 1. Update target page
    await db
      .update(pages)
      .set({
        blocks: updatedTargetBlocks,
        searchText: targetSearchText,
        updatedAt: new Date(),
      })
      .where(eq(pages.id, targetPageId));

    // 2. Remove from source page if requested
    if (removeSourceBlock && sourcePageId && sourcePageId !== targetPageId) {
      const [sourcePage] = await db
        .select()
        .from(pages)
        .where(eq(pages.id, sourcePageId));

      if (sourcePage) {
        const remainingBlocks = ((sourcePage.blocks as Block[]) || []).filter(
          (b) => b.id !== block.id
        );
        const sourceSearchText = flattenBlocksToSearchText(
          sourcePage.title,
          remainingBlocks,
          sourcePage.tags || []
        );

        await db
          .update(pages)
          .set({
            blocks: remainingBlocks,
            searchText: sourceSearchText,
            updatedAt: new Date(),
          })
          .where(eq(pages.id, sourcePageId));
      }
    }

    revalidatePath("/docs", "layout");
    return {
      success: true,
      targetPath: targetPage.path,
      targetTitle: targetPage.title,
    };
  } catch (err: any) {
    console.error("Failed to move block to page:", err);
    return { success: false, error: err?.message || "Failed to move block" };
  }
}


