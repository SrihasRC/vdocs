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
import { and, asc, eq, inArray, or, like } from "drizzle-orm";
import { BlockListRenderer } from "@/components/blocks/block-renderer";
import { ChildPagesGrid } from "@/components/blocks/child-pages-grid";
import { generateTocFromBlocks } from "@/lib/block-toc";
import { PageEditorView } from "@/components/editor/page-editor-view";
import { TagChip } from "@/components/ui/tag-chip";
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
    .where(eq(pages.path, path));

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
    const childPagesCondition = dbPage.path
      ? or(
          eq(pages.parentId, dbPage.id),
          like(pages.path, `${dbPage.path}/%`)
        )
      : eq(pages.parentId, dbPage.id);

    const childPages = await db
      .select({
        id: pages.id,
        slug: pages.slug,
        path: pages.path,
        title: pages.title,
        template: pages.template,
        tags: pages.tags,
        position: pages.position,
      })
      .from(pages)
      .where(childPagesCondition)
      .orderBy(asc(pages.position));

    // Fetch any attached files metadata
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const fileIds = dbPage.blocks
      .filter((b): b is Extract<Block, { type: "file" }> => b.type === "file")
      .map((b) => b.data.fileId)
      .filter((id) => id && UUID_REGEX.test(id));

    let filesMap: Record<string, any> = {};
    if (fileIds.length > 0) {
      const fileRows = await db
        .select()
        .from(files)
        .where(inArray(files.id, fileIds));
      filesMap = Object.fromEntries(fileRows.map((f) => [f.id, f]));
    }

    return (
      <DocsPage key={dbPage.id} toc={toc}>
        <div className="flex flex-col gap-2">
          <DocsTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-fd-foreground">
            {dbPage.title}
          </DocsTitle>

          {/* Tags */}
          {dbPage.tags && dbPage.tags.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {dbPage.tags.map((tag) => (
                <TagChip key={tag} tag={tag} />
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
    .where(eq(pages.path, path));

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
