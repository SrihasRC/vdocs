"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Archive, FileCode2, FileJson, Download, Check, Loader2, HardDrive } from "lucide-react";

interface VaultBackupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPageId?: string;
  currentPageTitle?: string;
}

export function VaultBackupDialog({
  open,
  onOpenChange,
  currentPageId,
  currentPageTitle,
}: VaultBackupDialogProps) {
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  const handleDownload = (format: "zip" | "json" | "md", scope: "vault" | "page") => {
    setDownloadingFormat(`${scope}-${format}`);
    const params = new URLSearchParams({
      format,
      scope,
    });
    if (scope === "page" && currentPageId) {
      params.set("id", currentPageId);
    }

    const downloadUrl = `/api/export?${params.toString()}`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", "");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadingFormat(null);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#111113] border-fd-border text-fd-foreground rounded-lg p-6">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <HardDrive className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-fd-foreground">
                Vault Backup & Export
              </DialogTitle>
              <DialogDescription className="text-xs text-fd-muted-foreground">
                Export your private documentation vault to standard formats anytime. Zero lock-in.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {/* Option 1: Markdown ZIP */}
          <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-fd-border/70 bg-fd-secondary/20 hover:border-fd-border transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-amber-400/10 text-amber-400 mt-0.5 shrink-0">
                <Archive className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-fd-foreground">
                  Markdown Archive (.zip)
                </div>
                <p className="text-xs text-fd-muted-foreground leading-relaxed">
                  All pages converted to standard Markdown files with YAML frontmatter, organized in directory folders matching your document hierarchy. Compatible with Obsidian & static site generators.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={downloadingFormat === "vault-zip"}
              onClick={() => handleDownload("zip", "vault")}
              className="shrink-0 h-8 text-xs gap-1.5 bg-fd-secondary/40 border-fd-border hover:bg-fd-secondary"
            >
              {downloadingFormat === "vault-zip" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Export .zip
            </Button>
          </div>

          {/* Option 2: Full JSON Database Backup */}
          <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-fd-border/70 bg-fd-secondary/20 hover:border-fd-border transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-sky-400/10 text-sky-400 mt-0.5 shrink-0">
                <FileJson className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-fd-foreground">
                  Full Database Backup (.json)
                </div>
                <p className="text-xs text-fd-muted-foreground leading-relaxed">
                  Complete database export containing structured block trees, file attachments metadata, tags, path redirects, and revision history timestamps.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={downloadingFormat === "vault-json"}
              onClick={() => handleDownload("json", "vault")}
              className="shrink-0 h-8 text-xs gap-1.5 bg-fd-secondary/40 border-fd-border hover:bg-fd-secondary"
            >
              {downloadingFormat === "vault-json" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Export .json
            </Button>
          </div>

          {/* Option 3: Current Document Export (if viewing a page) */}
          {currentPageId && (
            <div className="pt-2 border-t border-fd-border/50">
              <div className="text-xs font-semibold uppercase tracking-wider text-fd-muted-foreground mb-2">
                Current Document ({currentPageTitle || "Untitled"})
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={downloadingFormat === "page-md"}
                  onClick={() => handleDownload("md", "page")}
                  className="h-8 text-xs gap-1.5 justify-start bg-fd-secondary/30 border-fd-border/70"
                >
                  {downloadingFormat === "page-md" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                  ) : (
                    <FileCode2 className="h-3.5 w-3.5 text-amber-400" />
                  )}
                  Download .md
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={downloadingFormat === "page-json"}
                  onClick={() => handleDownload("json", "page")}
                  className="h-8 text-xs gap-1.5 justify-start bg-fd-secondary/30 border-fd-border/70"
                >
                  {downloadingFormat === "page-json" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />
                  ) : (
                    <FileJson className="h-3.5 w-3.5 text-sky-400" />
                  )}
                  Download .json
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
