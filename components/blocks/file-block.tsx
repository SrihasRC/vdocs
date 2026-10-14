"use client";

import { FileBlock } from "@/lib/db/schema";
import { Download, FileText, Paperclip } from "lucide-react";

interface FileBlockProps {
  block: FileBlock;
  fileData?: {
    label: string;
    kind: string;
    sizeBytes: number;
    mimeType: string;
    downloadUrl?: string;
  };
}

export function FileBlockRenderer({ block, fileData }: FileBlockProps) {
  const { fileId, caption } = block.data;
  const blockAnchor = `block-${block.id}`;

  const formatSize = (bytes?: number) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const label = fileData?.label || `Attached File (${fileId.slice(0, 8)})`;
  const kind = fileData?.kind || "file";
  const size = formatSize(fileData?.sizeBytes);

  return (
    <div
      id={blockAnchor}
      className="my-5 rounded-lg border border-fd-border bg-fd-card/50 p-4 shadow-sm scroll-mt-20 hover:border-fd-primary/30 transition-colors"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-fd-border bg-fd-secondary/30 text-amber-400">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-fd-foreground truncate text-sm">
                {label}
              </span>
              <span className="rounded-md border border-fd-border/70 bg-fd-secondary/40 px-1.5 py-0.5 text-[10px] font-mono text-fd-muted-foreground uppercase">
                {kind}
              </span>
            </div>
            <p className="text-xs text-fd-muted-foreground mt-0.5">
              {size} {fileData?.mimeType && `• ${fileData.mimeType}`}
            </p>
          </div>
        </div>

        {fileData?.downloadUrl ? (
          <a
            href={fileData.downloadUrl}
            download
            className="inline-flex items-center gap-1.5 rounded-lg border border-fd-border bg-fd-secondary/30 px-3 py-1.5 text-xs font-medium text-fd-foreground hover:bg-fd-secondary/60 hover:border-amber-400/40 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-amber-400" />
            Download
          </a>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-fd-border bg-fd-secondary/30 px-3 py-1.5 text-xs font-medium text-fd-foreground hover:bg-fd-secondary/60 hover:border-amber-400/40 transition-colors"
            onClick={() => {
              window.open(`/api/files/${fileId}`, "_blank");
            }}
          >
            <Download className="h-3.5 w-3.5 text-amber-400" />
            Download
          </button>
        )}
      </div>

      {caption && (
        <div className="mt-2.5 pt-2 border-t border-fd-border/40 text-xs text-fd-muted-foreground flex items-center gap-1.5">
          <Paperclip className="h-3 w-3 text-amber-400/80" />
          {caption}
        </div>
      )}
    </div>
  );
}
