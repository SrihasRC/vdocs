"use server";

import { db, pages, type Block, blockSchema } from "@/lib/db";
import { eq, asc, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { flattenBlocksToSearchText } from "@/lib/search-text";

export interface CaptureTarget {
  id: string;
  title: string;
  path: string;
  isInbox?: boolean;
}

/**
 * Ensures the Inbox page exists in the database.
 */
export async function getOrCreateInboxPage(): Promise<{ id: string; title: string; path: string }> {
  const [existingInbox] = await db
    .select({
      id: pages.id,
      title: pages.title,
      path: pages.path,
    })
    .from(pages)
    .where(eq(pages.path, "inbox"))
    .limit(1);

  if (existingInbox) {
    return existingInbox;
  }

  // Create default Inbox page
  const [createdInbox] = await db
    .insert(pages)
    .values({
      slug: "inbox",
      path: "inbox",
      title: "Inbox",
      template: "note",
      position: 999,
      tags: ["inbox", "quick-capture"],
      status: "published",
      blocks: [
        {
          id: `note-inbox-welcome`,
          type: "note",
          data: {
            title: "Quick Capture Inbox",
            markdown:
              "Items captured without a specific destination arrive here. You can organize or promote them to dedicated pages anytime.",
          },
        },
      ],
      searchText: "Quick Capture Inbox Items captured without a specific destination arrive here.",
    })
    .returning({
      id: pages.id,
      title: pages.title,
      path: pages.path,
    });

  revalidatePath("/docs", "layout");
  return createdInbox;
}

/**
 * Returns available destination pages for quick capture, prioritizing Inbox.
 */
export async function getCaptureTargets(): Promise<CaptureTarget[]> {
  try {
    const inbox = await getOrCreateInboxPage();

    const otherPages = await db
      .select({
        id: pages.id,
        title: pages.title,
        path: pages.path,
      })
      .from(pages)
      .where(eq(pages.status, "published"))
      .orderBy(asc(pages.title));

    const targets: CaptureTarget[] = [
      { id: inbox.id, title: "📥 Inbox (Quick Capture)", path: inbox.path, isInbox: true },
      ...otherPages
        .filter((p) => p.id !== inbox.id)
        .map((p) => ({
          id: p.id,
          title: p.title,
          path: p.path || "Vault Overview",
          isInbox: false,
        })),
    ];

    return targets;
  } catch (error) {
    console.error("Failed to load capture targets:", error);
    return [];
  }
}

/**
 * Appends a newly captured block to a target page (or Inbox by default).
 */
export async function quickCaptureBlock(params: {
  targetPageId?: string;
  block: Block;
}): Promise<{
  success: boolean;
  targetPageTitle?: string;
  targetPath?: string;
  error?: string;
}> {
  try {
    const validatedBlock = blockSchema.parse(params.block);

    let targetId = params.targetPageId;
    if (!targetId) {
      const inbox = await getOrCreateInboxPage();
      targetId = inbox.id;
    }

    const [page] = await db
      .select()
      .from(pages)
      .where(eq(pages.id, targetId))
      .limit(1);

    if (!page) {
      return { success: false, error: "Target page not found" };
    }

    const currentBlocks = (page.blocks as Block[]) || [];
    const updatedBlocks = [...currentBlocks, validatedBlock];

    const updatedSearchText = flattenBlocksToSearchText(
      page.title,
      updatedBlocks,
      page.tags || []
    );

    await db
      .update(pages)
      .set({
        blocks: updatedBlocks,
        searchText: updatedSearchText,
        updatedAt: new Date(),
      })
      .where(eq(pages.id, targetId));

    revalidatePath("/docs", "layout");
    revalidatePath(`/docs/${page.path}`.replace(/\/+/g, "/"), "page");

    return {
      success: true,
      targetPageTitle: page.title,
      targetPath: page.path,
    };
  } catch (error: any) {
    console.error("Failed to quick-capture block:", error);
    return {
      success: false,
      error: error?.message || "Failed to capture block",
    };
  }
}
