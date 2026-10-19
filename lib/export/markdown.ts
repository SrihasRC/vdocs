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

      case "kv": {
        const { title, description, rows = [] } = block.data;
        if (title) lines.push(`### ${title}\n`);
        if (description) lines.push(`${description}\n`);
        if (rows && rows.length > 0) {
          lines.push("| Key | Value | Description |");
          lines.push("| :--- | :--- | :--- |");
          for (const row of rows) {
            const cleanKey = (row.key || "").replace(/\|/g, "\\|");
            const cleanVal = (row.value || "").replace(/\|/g, "\\|");
            const cleanDesc = (row.description || "").replace(/\|/g, "\\|");
            lines.push(`| \`${cleanKey}\` | \`${cleanVal}\` | ${cleanDesc} |`);
          }
          lines.push("");
        }
        break;
      }

      case "api": {
        const {
          method,
          endpoint,
          title,
          description,
          params = [],
          headers = [],
          requestBody,
          responseStatus,
          responseBody,
        } = block.data;

        const heading = title ? `${title} (\`${method} ${endpoint}\`)` : `\`${method} ${endpoint}\``;
        lines.push(`### ${heading}\n`);
        if (description) lines.push(`${description}\n`);

        if (params && params.length > 0) {
          lines.push("#### Parameters\n");
          lines.push("| Parameter | Example / Value | Required | Description |");
          lines.push("| :--- | :--- | :--- | :--- |");
          for (const p of params) {
            lines.push(
              `| \`${p.key.replace(/\|/g, "\\|")}\` | \`${(p.value || "").replace(/\|/g, "\\|")}\` | ${p.required ? "**Yes**" : "No"} | ${(p.description || "").replace(/\|/g, "\\|")} |`
            );
          }
          lines.push("");
        }

        if (headers && headers.length > 0) {
          lines.push("#### Headers\n");
          lines.push("| Header | Value | Required | Description |");
          lines.push("| :--- | :--- | :--- | :--- |");
          for (const h of headers) {
            lines.push(
              `| \`${h.key.replace(/\|/g, "\\|")}\` | \`${(h.value || "").replace(/\|/g, "\\|")}\` | ${h.required ? "**Yes**" : "No"} | ${(h.description || "").replace(/\|/g, "\\|")} |`
            );
          }
          lines.push("");
        }

        if (requestBody) {
          lines.push("#### Request Body\n```json");
          lines.push(requestBody);
          lines.push("```\n");
        }

        if (responseBody) {
          lines.push(`#### Response (${responseStatus || 200})\n\`\`\`json`);
          lines.push(responseBody);
          lines.push("```\n");
        }
        break;
      }
    }
  }

  return lines.join("\n");
}
