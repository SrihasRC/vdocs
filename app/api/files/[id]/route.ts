import { NextRequest, NextResponse } from "next/server";
import { getFileDownloadUrl } from "@/app/actions/files";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { url, file, isR2Configured } = await getFileDownloadUrl(id);

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (!isR2Configured || !url) {
      return NextResponse.json(
        {
          error: "Cloudflare R2 storage is not configured yet in .env.local",
          file: {
            id: file.id,
            label: file.label,
            kind: file.kind,
            sizeBytes: file.sizeBytes,
            storageKey: file.storageKey,
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.redirect(url, 302);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to download file" },
      { status: 500 }
    );
  }
}
