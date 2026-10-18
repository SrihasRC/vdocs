"use client";

import { useState, useEffect } from "react";
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
import { updatePageMetadata, deletePage, getAvailableMoveDestinations, movePage } from "@/app/actions/pages";
import { Trash2, Settings, Loader2, Download, HardDrive, FolderInput } from "lucide-react";
import { VaultBackupDialog } from "@/components/export/vault-backup-dialog";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { cn } from "@/lib/utils";

interface PageSettingsDialogProps {
  page: {
    id: string;
    title: string;
    path: string;
    template: string;
    tags: string[];
    status: string;
    parentId?: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (updatedTitle: string, updatedTags: string[], updatedStatus: "published" | "draft") => void;
}

function computeInitialDestination(page: { path: string; parentId?: string | null }) {
  if (page.parentId) {
    return `parent:${page.parentId}`;
  }
  const parts = page.path.split("/");
  if (parts.length > 1) {
    return `category:${parts[0]}`;
  }
  return `category:`;
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showVaultBackup, setShowVaultBackup] = useState(false);

  // Move / Hierarchy State
  const [selectedDestination, setSelectedDestination] = useState<string>(() =>
    computeInitialDestination(page)
  );
  const [initialDestination, setInitialDestination] = useState<string>(() =>
    computeInitialDestination(page)
  );
  const [destinations, setDestinations] = useState<{
    categories: { slug: string; label: string }[];
    parentPages: { id: string; path: string; label: string }[];
  } | null>(null);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);

  useEffect(() => {
    if (open) {
      const initial = computeInitialDestination(page);
      setSelectedDestination(initial);
      setInitialDestination(initial);
      setTitle(page.title);
      setTemplate(page.template);
      setTagsStr((page.tags || []).join(", "));
      setStatus((page.status as any) || "published");

      setIsLoadingDestinations(true);
      getAvailableMoveDestinations(page.id)
        .then((res) => {
          if (res.success) {
            setDestinations({
              categories: res.categories,
              parentPages: res.parentPages,
            });
          }
        })
        .finally(() => {
          setIsLoadingDestinations(false);
        });
    }
  }, [open, page.id, page.path, page.parentId]);

  // Compute preview path if moved
  const pageSlug = page.path.split("/").pop() || "";
  let previewPath = page.path;
  if (selectedDestination.startsWith("category:")) {
    const cat = selectedDestination.slice("category:".length);
    previewPath = cat ? `${cat}/${pageSlug}` : pageSlug;
  } else if (selectedDestination.startsWith("parent:")) {
    const pId = selectedDestination.slice("parent:".length);
    const targetParent = destinations?.parentPages.find((p) => p.id === pId);
    if (targetParent) {
      previewPath = `${targetParent.path}/${pageSlug}`.replace(/\/+/g, "/");
    }
  }
  const isMoving = selectedDestination !== initialDestination;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const tags = tagsStr
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    // 1. Update basic metadata
    const res = await updatePageMetadata(page.id, {
      title,
      template,
      tags,
      status,
    });

    if (!res.success) {
      setIsSaving(false);
      alert(res.error || "Failed to update page settings");
      return;
    }

    // 2. Perform Move / Re-parent if location changed
    let finalPath = page.path;
    if (isMoving) {
      let moveRes;
      if (selectedDestination.startsWith("parent:")) {
        const targetParentId = selectedDestination.slice("parent:".length);
        moveRes = await movePage({
          pageId: page.id,
          destinationType: "parent",
          targetParentId,
        });
      } else {
        const targetCategory = selectedDestination.slice("category:".length);
        moveRes = await movePage({
          pageId: page.id,
          destinationType: "category",
          targetCategory,
        });
      }

      if (!moveRes.success) {
        setIsSaving(false);
        alert(moveRes.error || "Metadata updated, but failed to move document");
        return;
      }

      if (moveRes.newPath) {
        finalPath = moveRes.newPath;
      }
    }

    setIsSaving(false);
    onSaved?.(title, tags, status);
    onOpenChange(false);

    if (isMoving && finalPath !== page.path) {
      router.push(`/docs/${finalPath}`);
    } else {
      router.refresh();
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    const res = await deletePage(page.id);
    setIsDeleting(false);

    if (res.success) {
      setShowDeleteConfirm(false);
      onOpenChange(false);
      const target = res.parentPath ? `/docs/${res.parentPath}` : "/docs";
      router.push(target);
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

            {/* Location / Parent Section */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-fd-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FolderInput className="h-3.5 w-3.5 text-amber-400" />
                  Location / Hierarchy
                </span>
                {isMoving && (
                  <span className="text-[10px] text-amber-400 font-medium">
                    Move Pending
                  </span>
                )}
              </label>
              <select
                value={selectedDestination}
                onChange={(e) => setSelectedDestination(e.target.value)}
                disabled={isLoadingDestinations || isSaving}
                className="w-full h-8 rounded-lg border border-fd-border bg-fd-background px-2.5 text-xs text-fd-foreground focus:outline-none focus:ring-1 focus:ring-amber-400"
              >
                {isLoadingDestinations ? (
                  <option value="">Loading locations...</option>
                ) : (
                  <>
                    <optgroup label="Categories / Roots">
                      {destinations?.categories.map((c) => (
                        <option key={`cat-${c.slug}`} value={`category:${c.slug}`}>
                          📁 {c.label} {c.slug ? `(/docs/${c.slug})` : "(/docs)"}
                        </option>
                      ))}
                    </optgroup>
                    {destinations?.parentPages && destinations.parentPages.length > 0 && (
                      <optgroup label="Nest under Document (Sub-page)">
                        {destinations.parentPages.map((p) => (
                          <option key={`parent-${p.id}`} value={`parent:${p.id}`}>
                            📄 {p.label}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </>
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-fd-muted-foreground flex items-center justify-between">
                <span>Path URL</span>
                {isMoving && (
                  <span className="text-[10px] text-amber-400 font-mono">
                    Redirects will be created
                  </span>
                )}
              </label>
              <Input
                value={`/docs/${previewPath}`.replace(/\/+/g, "/")}
                disabled
                className={cn(
                  "h-8 text-xs font-mono bg-fd-secondary/30 text-fd-muted-foreground transition-colors",
                  isMoving && "text-amber-400 border-amber-400/40 bg-amber-400/5 font-semibold"
                )}
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

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-fd-border/40">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting || isSaving}
              className="text-destructive hover:bg-destructive/10 text-xs gap-1.5 cursor-pointer"
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
                className="text-xs h-8 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="text-xs h-8 bg-amber-400 text-black hover:bg-amber-300 font-semibold gap-1.5 cursor-pointer"
              >
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <ConfirmDeleteDialog
      open={showDeleteConfirm}
      onOpenChange={setShowDeleteConfirm}
      title={page.title}
      isDeleting={isDeleting}
      onConfirm={handleConfirmDelete}
    />

    <VaultBackupDialog
      open={showVaultBackup}
      onOpenChange={setShowVaultBackup}
      currentPageId={page.id}
      currentPageTitle={page.title}
    />
    </>
  );
}
