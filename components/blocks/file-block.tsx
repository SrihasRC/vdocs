"use client";

import { FileBlock } from "@/lib/db/schema";
import { Download, FileText, Paperclip, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { getFileDownloadUrl } from "@/app/actions/files";

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

  const formatSize = (bytes?: number) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const label = fileData?.label || (fileId ? `File (${fileId.slice(0, 8)})` : "Unassigned File");
  const kind = fileData?.kind || "file";
  const size = formatSize(fileData?.sizeBytes);

  const handleDownload = async () => {
    if (!fileId) return;
    setDownloading(true);
    try {
      const res = await getFileDownloadUrl(fileId);
      if (res.url) {
        window.open(res.url, "_blank");
      } else {
        // Fallback to route handler
        window.open(`/api/files/${fileId}`, "_blank");
      }
    } catch {
      window.open(`/api/files/${fileId}`, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      id={blockAnchor}
      className="my-5 rounded-lg border border-fd-border bg-fd-card/50 p-4 shadow-sm scroll-mt-20 hover:border-fd-primary/30 transition-colors"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-fd-border bg-fd-secondary/30 text-amber-400">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-fd-foreground truncate text-sm">
                {label}
              </span>
              <span className="rounded-md border border-fd-border/70 bg-fd-secondary/40 px-1.5 py-0.5 text-[10px] font-mono text-fd-muted-foreground uppercase">
                {kind}
              </span>
              {fileData?.version && (
                <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-mono text-amber-400">
                  v{fileData.version}
                </span>
              )}
              {fileData?.isCurrent && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Current
                </span>
              )}
            </div>
            <p className="text-xs text-fd-muted-foreground">
              {size} {fileData?.mimeType && `• ${fileData.mimeType}`}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <button
            type="button"
            disabled={downloading || !fileId}
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg border border-fd-border bg-fd-secondary/30 px-3.5 py-2 text-xs font-medium text-fd-foreground hover:bg-fd-secondary/60 hover:border-amber-400/40 hover:text-amber-400 transition-colors disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5 text-amber-400" />
            {downloading ? "Preparing..." : "Download"}
          </button>
        </div>
      </div>

      {/* Tags if present */}
      {fileData?.tags && fileData.tags.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          {fileData.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-fd-secondary/50 px-1.5 py-0.5 text-[10px] font-mono text-fd-muted-foreground"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {caption && (
        <div className="mt-3 pt-2.5 border-t border-fd-border/40 text-xs text-fd-muted-foreground flex items-center gap-1.5">
          <Paperclip className="h-3 w-3 text-amber-400/80 shrink-0" />
          <span>{caption}</span>
        </div>
      )}
    </div>
  );
}
