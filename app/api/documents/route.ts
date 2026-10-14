import { NextResponse } from "next/server";
import { db, documents, sql } from "@/lib/db";
import { desc } from "drizzle-orm";


export async function GET() {
  try {
    const [dbInfo] = await sql`SELECT version(), now() as current_time, current_database() as database`;
    const docs = await db.select().from(documents).orderBy(desc(documents.createdAt));

    return NextResponse.json({
      status: "connected",
      service: "postgres",
      branch: process.env.NEON_BRANCH ?? "production",
      database: dbInfo?.database,
      dbTime: dbInfo?.current_time,
      dbVersion: dbInfo?.version,
      count: docs.length,
      documents: docs,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        service: "postgres",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = body.title || "Untitled Document";
    const content = body.content || "";

    const [newDoc] = await db
      .insert(documents)
      .values({
        title,
        content,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        service: "postgres",
        document: newDoc,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        service: "postgres",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
