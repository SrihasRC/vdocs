"use server";

import { db } from "@/lib/db";
import { files, FileRecord, NewFileRecord } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import {
  isR2Configured,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  deleteR2Object,
} from "@/lib/r2";
import { revalidatePath } from "next/cache";

export interface InitiateUploadParams {
  label: string;
  kind: "resume" | "photo" | "certificate" | "other";
  filename: string;
  mimeType: string;
  sizeBytes: number;
  tags?: string[];
}

export interface InitiateUploadResult {
  file: FileRecord;
  uploadUrl: string | null;
  isR2Configured: boolean;
}

/**
 * Fetch all available files from the vault
 */
export async function getFilesList(): Promise<FileRecord[]> {
  try {
    return await db.select().from(files).orderBy(desc(files.createdAt));
  } catch (err) {
    console.error("Error fetching files list:", err);
    return [];
  }
}

/**
 * Fetch single file record by ID
 */
export async function getFile(id: string): Promise<FileRecord | null> {
  try {
    const results = await db.select().from(files).where(eq(files.id, id)).limit(1);
    return results[0] || null;
  } catch (err) {
    console.error("Error getting file:", err);
    return null;
  }
}

/**
 * Prepares file record with automatic versioning and issues a presigned R2 PUT URL.
 */
export async function initiateFileUpload(
  params: InitiateUploadParams
): Promise<InitiateUploadResult> {
  const { label, kind, filename, mimeType, sizeBytes, tags = [] } = params;

  // 1. Versioning: Check if a file with same label and kind exists
  const existingFiles = await db
    .select()
    .from(files)
    .where(and(eq(files.label, label.trim()), eq(files.kind, kind)))
    .orderBy(desc(files.version));

  let nextVersion = 1;
  if (existingFiles.length > 0) {
    nextVersion = (existingFiles[0].version || 1) + 1;
    // Mark previous current file as not current
    await db
      .update(files)
      .set({ isCurrent: false })
      .where(and(eq(files.label, label.trim()), eq(files.kind, kind)));
  }

  // 2. Storage key in R2 bucket
  const cleanFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const storageKey = `vault/${Date.now()}-${cleanFilename}`;

  // 3. Insert record in Neon Postgres
  const [newFile] = await db
    .insert(files)
    .values({
      label: label.trim(),
      kind,
      version: nextVersion,
      isCurrent: true,
      storageKey,
      mimeType: mimeType || "application/octet-stream",
      sizeBytes,
      tags,
    })
    .returning();

  // 4. Generate presigned upload URL if R2 configured
  const r2Ready = isR2Configured();
  let uploadUrl: string | null = null;

  if (r2Ready) {
    try {
      uploadUrl = await getPresignedUploadUrl(storageKey, mimeType, 300);
    } catch (err) {
      console.error("Failed to generate presigned upload URL:", err);
    }
  }

  revalidatePath("/docs");

  return {
    file: newFile,
    uploadUrl,
    isR2Configured: r2Ready,
  };
}

/**
 * Returns a presigned download URL for a file
 */
export async function getFileDownloadUrl(fileId: string): Promise<{
  url: string | null;
  file: FileRecord | null;
  isR2Configured: boolean;
}> {
  const file = await getFile(fileId);
  if (!file) {
    return { url: null, file: null, isR2Configured: isR2Configured() };
  }

  const r2Ready = isR2Configured();
  let url: string | null = null;

  if (r2Ready) {
    try {
      url = await getPresignedDownloadUrl(file.storageKey, file.label, 300);
    } catch (err) {
      console.error("Failed to generate presigned download URL:", err);
    }
  }

  return {
    url,
    file,
    isR2Configured: r2Ready,
  };
}

/**
 * Delete a file record and its R2 storage object
 */
export async function deleteFileAction(fileId: string): Promise<boolean> {
  try {
    const file = await getFile(fileId);
    if (!file) return false;

    // Delete from R2
    if (isR2Configured()) {
      await deleteR2Object(file.storageKey).catch((err) =>
        console.error("Failed to delete R2 object:", err)
      );
    }

    // Delete from DB
    await db.delete(files).where(eq(files.id, fileId));
    revalidatePath("/docs");
    return true;
  } catch (err) {
    console.error("Failed to delete file:", err);
    return false;
  }
}
