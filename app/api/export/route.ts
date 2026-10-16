import { NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";
import { db, pages, files, pathRedirects } from "@/lib/db";
import { eq, asc, inArray } from "drizzle-orm";
import { pageToMarkdown } from "@/lib/export/markdown";
import JSZip from "jszip";

export async function GET(request: NextRequest) {
  await connection();
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format") || "json"; // "md" | "json" | "zip"
    const scope = searchParams.get("scope") || "vault"; // "page" | "vault"
    const id = searchParams.get("id"); // required if scope === "page"

    const today = new Date().toISOString().split("T")[0];

    // 1. Single Page Export
    if (scope === "page") {
      if (!id) {
        return NextResponse.json({ error: "Missing page id parameter" }, { status: 400 });
      }

      const [page] = await db.select().from(pages).where(eq(pages.id, id));
      if (!page) {
        return NextResponse.json({ error: "Page not found" }, { status: 404 });
      }

      const safeSlug = (page.slug || "document").replace(/[^a-zA-Z0-9_-]/g, "_");

      if (format === "md") {
        // Fetch any attached files metadata
        const fileIds = (page.blocks || [])
          .filter((b: any) => b.type === "file")
          .map((b: any) => b.data.fileId);

        let filesMap: Record<string, any> = {};
        if (fileIds.length > 0) {
          const fileRows = await db.select().from(files).where(inArray(files.id, fileIds));
          filesMap = Object.fromEntries(fileRows.map((f) => [f.id, f]));
        }

        const markdown = pageToMarkdown(page, filesMap);
        return new Response(markdown, {
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Content-Disposition": `attachment; filename="${safeSlug}.md"`,
          },
        });
      }

      // Single Page JSON
      return new Response(JSON.stringify(page, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${safeSlug}.json"`,
        },
      });
    }

    // 2. Full Vault Export
    const allPages = await db.select().from(pages).orderBy(asc(pages.path));
    const allFiles = await db.select().from(files).orderBy(asc(files.createdAt));
    const allRedirects = await db.select().from(pathRedirects);

    if (format === "json") {
      const backupPayload = {
        app: "vdocs",
        version: "1.0",
        exportedAt: new Date().toISOString(),
        stats: {
          totalPages: allPages.length,
          totalFiles: allFiles.length,
          totalRedirects: allRedirects.length,
        },
        vault: {
          pages: allPages,
          files: allFiles,
          pathRedirects: allRedirects,
        },
      };

      return new Response(JSON.stringify(backupPayload, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="vdocs-backup-${today}.json"`,
        },
      });
    }

    if (format === "zip") {
      const zip = new JSZip();

      const filesMap = Object.fromEntries(allFiles.map((f) => [f.id, f]));

      // Add each page as a markdown file into docs/ folder
      for (const p of allPages) {
        const mdContent = pageToMarkdown(p, filesMap);
        let zipFilePath: string;

        if (!p.path || p.path.trim() === "") {
          zipFilePath = "index.md";
        } else {
          zipFilePath = `${p.path.replace(/^\/+|\/+$/g, "")}.md`;
        }

        zip.file(zipFilePath, mdContent);
      }

      // Add vault manifest
      const manifest = {
        exportedAt: new Date().toISOString(),
        totalPages: allPages.length,
        pages: allPages.map((p) => ({
          title: p.title,
          path: p.path,
          template: p.template,
          tags: p.tags,
        })),
        files: allFiles.map((f) => ({
          id: f.id,
          label: f.label,
          kind: f.kind,
          storageKey: f.storageKey,
          sizeBytes: f.sizeBytes,
        })),
      };

      zip.file("vdocs-manifest.json", JSON.stringify(manifest, null, 2));

      const buffer = await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      return new Response(buffer as any, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="vdocs-markdown-export-${today}.zip"`,
        },
      });
    }

    return NextResponse.json({ error: "Unsupported export format" }, { status: 400 });
  } catch (err: any) {
    console.error("Export error:", err);
    return NextResponse.json({ error: err.message || "Export failed" }, { status: 500 });
  }
}
