import { db, pages } from "@/lib/db";
import { eq } from "drizzle-orm";
import { createSearchAPI } from "fumadocs-core/search/server";

export const instant = false;

export const { GET } = createSearchAPI("simple", {
  indexes: async () => {
    try {
      const dbPages = await db
        .select({
          id: pages.id,
          title: pages.title,
          path: pages.path,
          searchText: pages.searchText,
          template: pages.template,
        })
        .from(pages)
        .where(eq(pages.status, "published"));

      return dbPages.map((p) => ({
        id: p.id,
        title: p.title,
        url: `/docs/${p.path}`.replace(/\/+/g, "/"),
        content: p.searchText || p.title,
        keywords: p.template,
      }));
    } catch (error) {
      console.error("Failed to build search index:", error);
      return [];
    }
  },
});
