"use client";

import { FileBlock } from "@/lib/db/schema";
import {
  Download,
  FileText,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  FileCode,
} from "lucide-react";
import { useState } from "react";
import { getFileDownloadUrl } from "@/app/actions/files";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const PdfViewer = dynamic(() => import("./pdf-viewer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 rounded-xl border border-fd-border/70 bg-neutral-950/40 flex items-center justify-center text-xs text-fd-muted-foreground gap-2">
      <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
      <span>Loading PDF viewer...</span>
    </div>
  ),
});

interface FileBlockProps {
  block: FileBlock;
  fileData?: {
    id: string;
    label: string;
    kind: string;
    version?: number;
    isCurrent?: boolean;
    sizeBytes: number;
    mimeType: string;
    tags?: string[];
    downloadUrl?: string;
  };
}

export function FileBlockRenderer({ block, fileData }: FileBlockProps) {
  const { fileId, caption } = block.data;
  const blockAnchor = `block-${block.id}`;
  const [downloading, setDownloading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const formatSize = (bytes?: number) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isUnassigned = !fileData;
  const label = fileData?.label || (caption ? caption : "Attachment (No file selected)");
  const size = fileData ? formatSize(fileData.sizeBytes) : null;

  const isPdf =
    fileData?.mimeType?.toLowerCase().includes("pdf") ||
    label.toLowerCase().endsWith(".pdf") ||
    fileData?.downloadUrl?.toLowerCase().includes(".pdf");

  const isImage =
    fileData?.mimeType?.toLowerCase().startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|svg)$/i.test(label);

  const canPreview = Boolean(fileId && (isPdf || isImage));

  const handleDownload = async () => {
    if (!fileId || isUnassigned) return;
    setDownloading(true);
    try {
      const res = await getFileDownloadUrl(fileId);
      if (res.url) {
        window.open(res.url, "_blank");
      } else {
        window.open(`/api/files/${fileId}?download=1`, "_blank");
      }
    } catch {
      window.open(`/api/files/${fileId}?download=1`, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  // Hide generic boilerplate captions like "Download attachment"
  const displayCaption =
    caption &&
    caption.trim().toLowerCase() !== "download attachment" &&
    caption.trim().toLowerCase() !== label.trim().toLowerCase()
      ? caption.trim()
      : null;

  const previewUrl = fileId ? `/api/files/${fileId}` : "";

  return (
    <div
      id={blockAnchor}
      className={cn(
        "my-4 rounded-xl border border-fd-border/70 bg-fd-card/40 overflow-hidden shadow-xs hover:border-fd-border transition-colors scroll-mt-20",
        isUnassigned && "border-dashed border-fd-border/60"
      )}
    >
      <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        {/* File info */}
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
              isPdf
                ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
                : "border-amber-500/20 bg-amber-500/10 text-amber-400"
            )}
          >
            {isPdf ? (
              <FileText className="h-5 w-5" />
            ) : (
              <FileCode className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-medium text-fd-foreground truncate text-sm">
                {label}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-fd-muted-foreground">
              {size && <span>{size}</span>}
              {size && <span>•</span>}
              <span>{isPdf ? "PDF Document" : fileData?.mimeType || "File"}</span>
            </div>

            {displayCaption && (
              <p className="text-xs text-fd-muted-foreground/80 pt-0.5 italic">
                {displayCaption}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
          {canPreview && (
            <button
              type="button"
              onClick={() => setShowPreview((prev) => !prev)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                showPreview
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-400"
                  : "border-fd-border bg-fd-secondary/30 text-fd-foreground hover:bg-fd-secondary/70 hover:text-amber-400"
              )}
            >
              {showPreview ? (
                <>
                  <EyeOff className="h-3.5 w-3.5 text-amber-400" />
                  <span>Hide</span>
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5 text-amber-400" />
                  <span>Preview</span>
                </>
              )}
            </button>
          )}

          {fileId && !isUnassigned && (
            <a
              href={`/api/files/${fileId}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Open file in new tab"
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-fd-border bg-fd-secondary/30 text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-secondary/70 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          <button
            type="button"
            disabled={downloading || isUnassigned}
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg border border-fd-border bg-fd-secondary/30 px-3 py-1.5 text-xs font-medium text-fd-foreground hover:bg-fd-secondary/70 hover:border-amber-400/40 hover:text-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-amber-400" />
            {isUnassigned ? "No File" : downloading ? "Downloading..." : "Download"}
          </button>
        </div>
      </div>

      {/* Inline Preview Container */}
      {showPreview && canPreview && (
        <div className="border-t border-fd-border/50 bg-neutral-950/40 p-2 sm:p-3">
          {isPdf ? (
            <PdfViewer url={previewUrl} title={label} />
          ) : isImage ? (
            <div className="flex justify-center p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={label}
                className="max-h-[500px] rounded-lg border border-fd-border/60 object-contain shadow-md"
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
