import { Block, Page } from "@/lib/db/schema";

/**
 * Converts a database Page and its structured blocks into clean, standard Markdown with YAML frontmatter.
 */
export function pageToMarkdown(
  page: Pick<Page, "title" | "slug" | "path" | "template" | "tags" | "status" | "blocks" | "updatedAt">,
  filesMap: Record<string, { label: string; mimeType: string | null; sizeBytes: number | null }> = {}
): string {
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(page.title)}`,
    `slug: ${JSON.stringify(page.slug)}`,
    `path: ${JSON.stringify(page.path || "")}`,
    `template: ${JSON.stringify(page.template || "note")}`,
    `tags: [${(page.tags || []).map((t: string) => JSON.stringify(t)).join(", ")}]`,
    `status: ${JSON.stringify(page.status || "published")}`,
    `updatedAt: ${JSON.stringify(page.updatedAt ? page.updatedAt.toISOString() : new Date().toISOString())}`,
    "---",
    "",
  ].join("\n");

  const lines: string[] = [frontmatter];
  lines.push(`# ${page.title}\n`);

  const blocks = (page.blocks || []) as Block[];

  for (const block of blocks) {
    switch (block.type) {
      case "command": {
        const { title, description, command, sudo, shell, os, notes } = block.data;
        if (title) lines.push(`### ${title}\n`);
        if (description) lines.push(`${description}\n`);

        const lang = shell || "bash";
        lines.push(`\`\`\`${lang}`);
        lines.push(command);
        lines.push("```\n");

        const metaParts: string[] = [];
        if (sudo) metaParts.push("**Requires sudo**");
        if (os && os.length > 0) metaParts.push(`OS: ${os.join(", ")}`);
        if (notes) metaParts.push(`Note: ${notes}`);

        if (metaParts.length > 0) {
          lines.push(`*${metaParts.join(" • ")}*\n`);
        }
        break;
      }

      case "steps": {
        const { title, steps } = block.data;
        if (title) lines.push(`### ${title}\n`);

        if (steps && Array.isArray(steps)) {
          steps.forEach((step, idx) => {
            lines.push(`${idx + 1}. ${step.text}`);
            if (step.command) {
              lines.push(`   \`\`\`bash`);
              lines.push(step.command.split("\n").map((l: string) => `   ${l}`).join("\n"));
              lines.push("   ```");
            }
            lines.push("");
          });
        }
        break;
      }

      case "qa": {
        const { question, short, long } = block.data;
        lines.push(`### Q: ${question}\n`);

        if (short) {
          lines.push(`**Quick Answer:**\n> ${short.replace(/\n/g, "\n> ")}\n`);
        }

        if (long) {
          lines.push(`**Detailed Explanation:**\n${long}\n`);
        }
        break;
      }

      case "note": {
        const { title, markdown } = block.data;
        if (title) lines.push(`### ${title}\n`);
        if (markdown) lines.push(`${markdown}\n`);
        break;
      }

      case "file": {
        const { fileId, caption } = block.data;
        const fileInfo = filesMap[fileId];
        const fileName = fileInfo?.label || caption || "Download attachment";
        const fileSize = fileInfo?.sizeBytes ? ` (${(fileInfo.sizeBytes / 1024).toFixed(1)} KB)` : "";

        lines.push(`### 📎 ${fileName}${fileSize}\n`);
        if (caption && caption !== fileName) lines.push(`${caption}\n`);
        lines.push(`[Download File](/api/files/${fileId})\n`);
        break;
      }

      case "callout": {
        const { type, title, content } = block.data;
        const alertType =
          type === "warning" ? "WARNING" :
          type === "error" ? "CAUTION" :
          type === "idea" ? "TIP" : "NOTE";

        lines.push(`> [!${alertType}]${title ? ` ${title}` : ""}`);
        if (content) {
          lines.push(`> ${content.replace(/\n/g, "\n> ")}`);
        }
        lines.push("");
        break;
      }
    }
  }

  return lines.join("\n");
}
