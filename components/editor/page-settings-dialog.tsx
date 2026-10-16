"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updatePageMetadata, deletePage } from "@/app/actions/pages";
import { Trash2, Settings, Loader2, Download, HardDrive } from "lucide-react";
import { VaultBackupDialog } from "@/components/export/vault-backup-dialog";

interface PageSettingsDialogProps {
  page: {
    id: string;
    title: string;
    path: string;
    template: string;
    tags: string[];
    status: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (updatedTitle: string, updatedTags: string[]) => void;
}

export function PageSettingsDialog({
  page,
  open,
  onOpenChange,
  onSaved,
}: PageSettingsDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState(page.title);
  const [template, setTemplate] = useState(page.template);
  const [tagsStr, setTagsStr] = useState((page.tags || []).join(", "));
  const [status, setStatus] = useState<"published" | "draft">(
    (page.status as any) || "published"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showVaultBackup, setShowVaultBackup] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const tags = tagsStr
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const res = await updatePageMetadata(page.id, {
      title,
      template,
      tags,
      status,
    });

    setIsSaving(false);
    if (res.success) {
      onSaved?.(title, tags);
      onOpenChange(false);
      router.refresh();
    } else {
      alert(res.error || "Failed to update page settings");
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete "${page.title}"? Any child pages under this page will also be removed.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    const res = await deletePage(page.id);
    setIsDeleting(false);

    if (res.success) {
      onOpenChange(false);
      router.push("/docs");
      router.refresh();
    } else {
      alert(res.error || "Failed to delete page");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md bg-[#111113] border-fd-border text-fd-foreground rounded-lg">
        <form onSubmit={handleSave} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Settings className="h-4 w-4 text-amber-400" />
              Page Settings & Properties
            </DialogTitle>
            <DialogDescription className="text-xs text-fd-muted-foreground">
              Modify title, template, tags, or status for this document.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-fd-muted-foreground">
                Page Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="h-8 text-xs bg-fd-background"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-fd-muted-foreground">
                Path URL
              </label>
              <Input
                value={`/docs/${page.path}`.replace(/\/+/g, "/")}
                disabled
                className="h-8 text-xs font-mono bg-fd-secondary/30 text-fd-muted-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-fd-muted-foreground">
                  Template
                </label>
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="w-full h-8 rounded-lg border border-fd-border bg-fd-background px-2.5 text-xs text-fd-foreground"
                >
                  <option value="note">Free Note</option>
                  <option value="command">Command Runbook</option>
                  <option value="steps">Step-by-Step</option>
                  <option value="qa">Q&A / Interview</option>
                  <option value="index">Container / Index</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-fd-muted-foreground">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full h-8 rounded-lg border border-fd-border bg-fd-background px-2.5 text-xs text-fd-foreground"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-fd-muted-foreground">
                Tags (comma-separated)
              </label>
              <Input
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                placeholder="cli, devops, career"
                className="h-8 text-xs bg-fd-background"
              />
            </div>

            {/* Export & Backup Section */}
            <div className="pt-2 border-t border-fd-border/40 space-y-2">
              <label className="text-xs font-medium text-fd-muted-foreground block">
                Export & Backup
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={`/api/export?format=md&scope=page&id=${page.id}`}
                  download
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-fd-border/70 bg-fd-secondary/30 hover:bg-fd-secondary text-xs text-fd-foreground transition-colors"
                >
                  <Download className="h-3 w-3 text-amber-400" />
                  Download .md
                </a>
                <a
                  href={`/api/export?format=json&scope=page&id=${page.id}`}
                  download
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-fd-border/70 bg-fd-secondary/30 hover:bg-fd-secondary text-xs text-fd-foreground transition-colors"
                >
                  <Download className="h-3 w-3 text-sky-400" />
                  Download .json
                </a>
                <button
                  type="button"
                  onClick={() => setShowVaultBackup(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20 text-xs text-amber-400 transition-colors"
                >
                  <HardDrive className="h-3 w-3" />
                  Full Vault Backup...
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 pt-2 border-t border-fd-border/40">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="text-destructive hover:bg-destructive/10 text-xs gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Page
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="text-xs h-8 bg-amber-400 text-black hover:bg-amber-300 font-semibold gap-1.5"
              >
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <VaultBackupDialog
      open={showVaultBackup}
      onOpenChange={setShowVaultBackup}
      currentPageId={page.id}
      currentPageTitle={page.title}
    />
    </>
  );
}
