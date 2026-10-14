import { NextResponse, type NextRequest } from "next/server";
import { db, pages } from "@/lib/db";
import { and, eq, ilike, or } from "drizzle-orm";

export const instant = false;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    const matched = await db
      .select({
        id: pages.id,
        title: pages.title,
        path: pages.path,
        template: pages.template,
        tags: pages.tags,
        searchText: pages.searchText,
      })
      .from(pages)
      .where(
        and(
          eq(pages.status, "published"),
          or(
            ilike(pages.title, `%${q}%`),
            ilike(pages.searchText, `%${q}%`)
          )
        )
      )
      .limit(10);

    const results = matched.map((p) => {
      // Find a snippet containing the query
      let snippet = "";
      if (p.searchText) {
        const lowerText = p.searchText.toLowerCase();
        const lowerQ = q.toLowerCase();
        const idx = lowerText.indexOf(lowerQ);
        if (idx !== -1) {
          const start = Math.max(0, idx - 30);
          const end = Math.min(p.searchText.length, idx + q.length + 50);
          snippet = (start > 0 ? "..." : "") + p.searchText.slice(start, end).trim() + (end < p.searchText.length ? "..." : "");
        } else {
          snippet = p.searchText.slice(0, 80).trim();
        }
      }

      return {
        id: p.id,
        title: p.title,
        path: p.path,
        template: p.template,
        tags: p.tags,
        snippet,
      };
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search DB error:", error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
