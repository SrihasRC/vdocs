import type { Block } from "@/lib/db/schema";

/**
 * Flattens all textual content from structured blocks and page metadata
 * into a single search text string for Postgres pg_trgm and full-text indexing.
 */
export function flattenBlocksToSearchText(
  title: string,
  blocks: Block[],
  tags: string[] = []
): string {
  const parts: string[] = [title, ...tags];

  for (const block of blocks) {
    switch (block.type) {
      case "command":
        parts.push(block.data.title);
        if (block.data.description) parts.push(block.data.description);
        parts.push(block.data.command);
        if (block.data.shell) parts.push(block.data.shell);
        if (block.data.os && block.data.os.length > 0) parts.push(...block.data.os);
        if (block.data.notes) parts.push(block.data.notes);
        break;

      case "steps":
        if (block.data.title) parts.push(block.data.title);
        for (const step of block.data.steps) {
          parts.push(step.text);
          if (step.command) parts.push(step.command);
        }
        break;

      case "qa":
        parts.push(block.data.question);
        if (block.data.short) parts.push(block.data.short);
        if (block.data.long) parts.push(block.data.long);
        break;

      case "note":
        if (block.data.title) parts.push(block.data.title);
        if (block.data.markdown) parts.push(block.data.markdown);
        break;

      case "file":
        if (block.data.caption) parts.push(block.data.caption);
        break;

      case "callout":
        if (block.data.title) parts.push(block.data.title);
        if (block.data.content) parts.push(block.data.content);
        break;

      case "kv":
        if (block.data.title) parts.push(block.data.title);
        if (block.data.description) parts.push(block.data.description);
        for (const row of block.data.rows || []) {
          if (row.key) parts.push(row.key);
          if (row.value) parts.push(row.value);
          if (row.description) parts.push(row.description);
        }
        break;
    }
  }

  return parts.filter(Boolean).join(" ").trim();
}
