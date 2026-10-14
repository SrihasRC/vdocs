import { source } from "@/lib/source";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "@fumadocs/base-ui/layouts/spacious/page";
import { notFound, redirect } from "next/navigation";
import { getMDXComponents } from "@/components/mdx";
import type { Metadata } from "next";
import { createRelativeLink } from "fumadocs-ui/mdx";
import { db, pages, files, pathRedirects, type Block } from "@/lib/db";
import { and, asc, eq, inArray } from "drizzle-orm";
import { BlockListRenderer } from "@/components/blocks/block-renderer";
import { ChildPagesGrid } from "@/components/blocks/child-pages-grid";
import { generateTocFromBlocks } from "@/lib/block-toc";
import { PageEditorView } from "@/components/editor/page-editor-view";
import { connection } from "next/server";

export const instant = false;

interface Props {
  params: Promise<{
    slug?: string[];
  }>;
}

export default async function Page({ params }: Props) {
  await connection();
  const { slug } = await params;
  const path = (slug || []).join("/");

  // 1. Query Neon Database for the page
  const [dbPage] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.path, path), eq(pages.status, "published")));

  // 2. Handle database redirect if path was moved or renamed
  if (!dbPage) {
    const [redirectEntry] = await db
      .select()
      .from(pathRedirects)
      .where(eq(pathRedirects.oldPath, path));

    if (redirectEntry) {
      const [targetPage] = await db
        .select()
        .from(pages)
        .where(eq(pages.id, redirectEntry.pageId));

      if (targetPage) {
        redirect(`/docs/${targetPage.path}`.replace(/\/+/g, "/"));
      }
    }
  }

  // 3. Render Database Page
  if (dbPage) {
    // Generate dynamic Table of Contents from blocks
    const toc = generateTocFromBlocks(dbPage.blocks);

    // Fetch child pages for index grids
    const childPages = await db
      .select({
        id: pages.id,
        slug: pages.slug,
        path: pages.path,
        title: pages.title,
        template: pages.template,
        tags: pages.tags,
      })
      .from(pages)
      .where(and(eq(pages.parentId, dbPage.id), eq(pages.status, "published")))
      .orderBy(asc(pages.position));

    // Fetch any attached files metadata
    const fileIds = dbPage.blocks
      .filter((b): b is Extract<Block, { type: "file" }> => b.type === "file")
      .map((b) => b.data.fileId);

    let filesMap: Record<string, any> = {};
    if (fileIds.length > 0) {
      const fileRows = await db
        .select()
        .from(files)
        .where(inArray(files.id, fileIds));
      filesMap = Object.fromEntries(fileRows.map((f) => [f.id, f]));
    }

    const pageKey = `${dbPage.id}-${dbPage.updatedAt?.getTime?.() || 0}-${dbPage.blocks.length}`;

    return (
      <DocsPage key={pageKey} toc={toc}>
        <div className="flex flex-col gap-2">
          <DocsTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-fd-foreground">
            {dbPage.title}
          </DocsTitle>

          {/* Tags */}
          {dbPage.tags && dbPage.tags.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {dbPage.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-fd-border/70 bg-fd-secondary/30 px-2 py-0.5 text-xs font-mono text-fd-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <DocsBody className="mt-6">
          <PageEditorView
            page={dbPage}
            filesMap={filesMap}
            childPages={childPages}
          />
        </DocsBody>
      </DocsPage>
    );
  }

  // 4. Fallback: MDX Page
  const mdxPage = source.getPage(slug);
  if (mdxPage) {
    const MDX = mdxPage.data.body;
    return (
      <DocsPage toc={mdxPage.data.toc} full={mdxPage.data.full}>
        <DocsTitle>{mdxPage.data.title}</DocsTitle>
        <DocsDescription>{mdxPage.data.description}</DocsDescription>
        <DocsBody>
          <MDX
            components={getMDXComponents({
              a: createRelativeLink(source, mdxPage),
            })}
          />
        </DocsBody>
      </DocsPage>
    );
  }

  // 5. Not Found
  notFound();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const path = (slug || []).join("/");

  // Check database first
  const [dbPage] = await db
    .select({ title: pages.title })
    .from(pages)
    .where(and(eq(pages.path, path), eq(pages.status, "published")));

  if (dbPage) {
    return {
      title: `${dbPage.title} - vdocs`,
      description: `${dbPage.title} in vdocs private vault`,
    };
  }

  // Fallback to MDX
  const mdxPage = source.getPage(slug);
  if (mdxPage) {
    return {
      title: `${mdxPage.data.title} - vdocs`,
      description: mdxPage.data.description,
    };
  }

  return {
    title: "Document - vdocs",
  };
}
