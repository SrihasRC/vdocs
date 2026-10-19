import { NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { uploadR2Object, isR2Configured } from "@/lib/r2";
import { revalidatePath } from "next/cache";

export const instant = false;

export async function POST(request: NextRequest) {
  await connection();
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const label = (formData.get("label") as string) || "";
    const kind = (formData.get("kind") as any) || "other";
    const tagsRaw = (formData.get("tags") as string) || "";

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file was provided in the request" }, { status: 400 });
    }

    if (!label.trim()) {
      return NextResponse.json({ error: "File label is required" }, { status: 400 });
    }

    if (!isR2Configured()) {
      return NextResponse.json(
        {
          error:
            "Cloudflare R2 storage credentials are not configured in .env.local. Please check R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.",
        },
        { status: 503 }
      );
    }

    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    // Check if a file with same label and kind exists to replace cleanly without duplicating storage
    const existing = await db
      .select()
      .from(files)
      .where(and(eq(files.label, label.trim()), eq(files.kind, kind)))
      .limit(1);

    // Prepare storage key
    const cleanFilename = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const storageKey = `vault/${Date.now()}-${cleanFilename}`;
    const mimeType = file.type || "application/octet-stream";

    // Upload binary buffer directly to Cloudflare R2
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await uploadR2Object(storageKey, fileBuffer, mimeType);

    let savedFile;
    if (existing.length > 0) {
      // Clean up previous R2 file to prevent duplicate storage
      const oldStorageKey = existing[0].storageKey;
      if (oldStorageKey && oldStorageKey !== storageKey) {
        try {
          const { deleteR2Object } = await import("@/lib/r2");
          await deleteR2Object(oldStorageKey);
        } catch (e) {
          console.warn("Could not delete old R2 object:", e);
        }
      }

      // Update existing record
      const [updated] = await db
        .update(files)
        .set({
          storageKey,
          mimeType,
          sizeBytes: file.size,
          tags,
          isCurrent: true,
          version: 1,
        })
        .where(eq(files.id, existing[0].id))
        .returning();
      savedFile = updated;
    } else {
      // Record new file in database
      const [inserted] = await db
        .insert(files)
        .values({
          label: label.trim(),
          kind,
          version: 1,
          isCurrent: true,
          storageKey,
          mimeType,
          sizeBytes: file.size,
          tags,
        })
        .returning();
      savedFile = inserted;
    }

    revalidatePath("/docs");
    revalidatePath("/docs/files");

    return NextResponse.json({
      success: true,
      file: savedFile,
    });
  } catch (error: any) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload file to Cloudflare R2" },
      { status: 500 }
    );
  }
}
