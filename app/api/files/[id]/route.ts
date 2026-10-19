import { NextRequest, NextResponse } from "next/server";
import { getFileDownloadUrl } from "@/app/actions/files";
import { getR2Object, isR2Configured } from "@/lib/r2";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { url, file } = await getFileDownloadUrl(id);

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (!isR2Configured() || !url) {
      return NextResponse.json(
        { error: "Cloudflare R2 storage is not configured yet in .env.local" },
        { status: 503 }
      );
    }

    const isDownload = request.nextUrl.searchParams.get("download") === "1";

    if (isDownload) {
      return NextResponse.redirect(url, 302);
    }

    // Stream inline binary directly to avoid browser CORS redirects
    try {
      const r2Res = await getR2Object(file.storageKey);
      if (r2Res.Body) {
        const bytes = await r2Res.Body.transformToByteArray();
        return new NextResponse(Buffer.from(bytes), {
          headers: {
            "Content-Type": file.mimeType || "application/pdf",
            "Content-Length": bytes.length.toString(),
            "Content-Disposition": `inline; filename="${encodeURIComponent(file.label)}"`,
            "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    } catch (streamErr: any) {
      console.error("Error reading file binary from Cloudflare R2:", streamErr);
      return NextResponse.json(
        { error: streamErr.message || "Failed to read file from storage" },
        { status: 500 }
      );
    }

    return NextResponse.redirect(url, 302);
  } catch (err: any) {
    console.error("GET /api/files/[id] error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to download file" },
      { status: 500 }
    );
  }
}
