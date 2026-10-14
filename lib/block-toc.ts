import type { TOCItemType } from "fumadocs-core/toc";
import type { Block } from "@/lib/db/schema";

/**
 * Extracts Table of Contents items from structured page blocks.
 */
export function generateTocFromBlocks(blocks: Block[]): TOCItemType[] {
  const items: TOCItemType[] = [];

  for (const block of blocks) {
    const anchor = `#block-${block.id}`;

    switch (block.type) {
      case "command":
        if (block.data.title) {
          items.push({
            title: block.data.title,
            url: anchor,
            depth: 2,
          });
        }
        break;

      case "steps":
        if (block.data.title) {
          items.push({
            title: block.data.title,
            url: anchor,
            depth: 2,
          });
        }
        break;

      case "qa":
        if (block.data.question) {
          items.push({
            title: block.data.question,
            url: anchor,
            depth: 2,
          });
        }
        break;

      case "note":
        if (block.data.title) {
          items.push({
            title: block.data.title,
            url: anchor,
            depth: 2,
          });
        }
        break;

      case "file":
        if (block.data.caption) {
          items.push({
            title: block.data.caption,
            url: anchor,
            depth: 2,
          });
        }
        break;
    }
  }

  return items;
}
