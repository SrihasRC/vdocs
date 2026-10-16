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
import { Loader2 } from "lucide-react";

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
      <DialogContent className="sm:max-w-xl w-[95vw] bg-[#111113] border-fd-border text-fd-foreground rounded-xl p-5 sm:p-6 shadow-2xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-semibold text-fd-foreground">
            Vault Backup & Export
          </DialogTitle>
          <DialogDescription className="text-xs text-fd-muted-foreground">
            Export your private documentation vault to open formats anytime with zero lock-in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {/* Option 1: Markdown ZIP */}
          <div className="flex items-center justify-between gap-4 p-3.5 rounded-lg border border-fd-border/70 bg-fd-secondary/20 hover:border-fd-border transition-colors">
            <div className="space-y-0.5 min-w-0">
              <div className="text-sm font-medium text-fd-foreground">
                Markdown Archive (.zip)
              </div>
              <p className="text-xs text-fd-muted-foreground leading-relaxed">
                All pages converted to clean Markdown files with YAML frontmatter, organized in directory folders matching your document tree.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={downloadingFormat === "vault-zip"}
              onClick={() => handleDownload("zip", "vault")}
              className="cursor-pointer shrink-0 h-8 text-xs bg-fd-secondary/40 border-fd-border hover:bg-fd-secondary"
            >
              {downloadingFormat === "vault-zip" && (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              )}
              Export .zip
            </Button>
          </div>

          {/* Option 2: Full JSON Database Backup */}
          <div className="flex items-center justify-between gap-4 p-3.5 rounded-lg border border-fd-border/70 bg-fd-secondary/20 hover:border-fd-border transition-colors">
            <div className="space-y-0.5 min-w-0">
              <div className="text-sm font-medium text-fd-foreground">
                Full Database Backup (.json)
              </div>
              <p className="text-xs text-fd-muted-foreground leading-relaxed">
                Complete database snapshot containing structured JSON blocks, file attachments metadata, tags, and path redirects.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={downloadingFormat === "vault-json"}
              onClick={() => handleDownload("json", "vault")}
              className="cursor-pointer shrink-0 h-8 text-xs bg-fd-secondary/40 border-fd-border hover:bg-fd-secondary"
            >
              {downloadingFormat === "vault-json" && (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              )}
              Export .json
            </Button>
          </div>

          {/* Option 3: Current Document Export (if viewing a page) */}
          {currentPageId && (
            <div className="pt-3 border-t border-fd-border/50">
              <div className="text-[11px] font-medium uppercase tracking-wider text-fd-muted-foreground mb-2">
                Current Document ({currentPageTitle || "Untitled"})
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={downloadingFormat === "page-md"}
                  onClick={() => handleDownload("md", "page")}
                  className="cursor-pointer h-8 text-xs justify-center bg-fd-secondary/30 border-fd-border/70 hover:bg-fd-secondary/60"
                >
                  {downloadingFormat === "page-md" && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  )}
                  Download .md
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={downloadingFormat === "page-json"}
                  onClick={() => handleDownload("json", "page")}
                  className="cursor-pointer h-8 text-xs justify-center bg-fd-secondary/30 border-fd-border/70 hover:bg-fd-secondary/60"
                >
                  {downloadingFormat === "page-json" && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
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
