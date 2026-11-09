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
import { Trash2, Settings, Loader2, Download, HardDrive, FolderInput, ArrowUpDown } from "lucide-react";
import { VaultBackupDialog } from "@/components/export/vault-backup-dialog";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { DeleteCategoryDialog } from "@/components/editor/delete-category-dialog";
import { ReorderPagesDialog } from "@/components/editor/reorder-pages-dialog";
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
  childPages?: { id: string; title: string; slug: string; position?: number }[];
}

export function PageSettingsDialog({
  page,
  open,
  onOpenChange,
  onSaved,
  childPages = [],
}: PageSettingsDialogProps) {
  const router = useRouter();
  const isCategoryRoot = !page.parentId && !page.path.includes("/") && page.path !== "";
  const pageCategorySlug = page.path.includes("/")
    ? page.path.split("/")[0]
    : isCategoryRoot
    ? page.path
    : "";
  const [title, setTitle] = useState(page.title);
  const [template, setTemplate] = useState(page.template);
  const [tagsStr, setTagsStr] = useState((page.tags || []).join(", "));
  const [status, setStatus] = useState<"published" | "draft">(
    (page.status as any) || "published"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteCategory, setShowDeleteCategory] = useState(false);
  const [showReorder, setShowReorder] = useState(false);
  const [showVaultBackup, setShowVaultBackup] = useState(false);

  // Move / Hierarchy State
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    const parts = page.path.split("/");
    return parts.length > 1 ? parts[0] : "";
  });
  const [selectedParentId, setSelectedParentId] = useState<string>(
    () => page.parentId || ""
  );
  const [destinations, setDestinations] = useState<{
    categories: { slug: string; label: string }[];
    parentPages: { id: string; title: string; path: string; label: string }[];
  } | null>(null);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);

  useEffect(() => {
    if (open) {
      const parts = page.path.split("/");
      const currentCat = parts.length > 1 ? parts[0] : "";
      setSelectedCategory(currentCat);
      setSelectedParentId(page.parentId || "");
      setIsMoveOpen(false);
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

  // Compute pages that belong to the currently selected category
  const categoryParentPages = (destinations?.parentPages || []).filter((p) => {
    if (!selectedCategory) {
      return !p.path.includes("/");
    }
    return p.path === selectedCategory || p.path.startsWith(`${selectedCategory}/`);
  });

  // Compute preview path if moved
  const pageSlug = page.path.split("/").pop() || "";
  let previewPath = page.path;
  if (isMoveOpen) {
    if (selectedParentId) {
      const targetParent = destinations?.parentPages.find((p) => p.id === selectedParentId);
      if (targetParent) {
        previewPath = `${targetParent.path}/${pageSlug}`.replace(/\/+/g, "/");
      }
    } else {
      previewPath = selectedCategory ? `${selectedCategory}/${pageSlug}` : pageSlug;
    }
  }
  const isMoving = isMoveOpen && previewPath !== page.path;

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
      if (selectedParentId) {
        moveRes = await movePage({
          pageId: page.id,
          destinationType: "parent",
          targetParentId: selectedParentId,
        });
      } else {
        moveRes = await movePage({
          pageId: page.id,
          destinationType: "category",
          targetCategory: selectedCategory,
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
        <DialogContent className="sm:max-w-lg w-[95vw] bg-[#111113] border-fd-border text-fd-foreground rounded-xl p-5 shadow-2xl">
        <form onSubmit={handleSave} className="space-y-4 w-full min-w-0">
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

            {/* Location & Move Section */}
            <div className="rounded-lg border border-fd-border/70 bg-fd-secondary/20 p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FolderInput className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="text-xs font-medium text-fd-foreground">Location:</span>
                  <span className="text-xs font-mono text-fd-muted-foreground truncate">
                    {`/docs/${page.path}`.replace(/\/+/g, "/")}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMoveOpen(!isMoveOpen)}
                  className="h-6 px-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 cursor-pointer shrink-0 font-medium"
                >
                  {isMoveOpen ? "Cancel Move" : "Move..."}
                </Button>
              </div>

              {isMoveOpen && (
                <div className="pt-2 border-t border-fd-border/50 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-fd-muted-foreground">
                        Category
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => {
                          setSelectedCategory(e.target.value);
                          setSelectedParentId("");
                        }}
                        disabled={isLoadingDestinations || isSaving}
                        className="w-full h-8 rounded-md border border-fd-border bg-fd-background px-2 text-xs text-fd-foreground focus:outline-none focus:ring-1 focus:ring-amber-400"
                      >
                        {destinations?.categories.map((c) => (
                          <option key={c.slug} value={c.slug}>
                            {c.label || "Vault Root"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-fd-muted-foreground">
                        Nest Under Document
                      </label>
                      <select
                        value={selectedParentId}
                        onChange={(e) => setSelectedParentId(e.target.value)}
                        disabled={isLoadingDestinations || isSaving}
                        className="w-full h-8 rounded-md border border-fd-border bg-fd-background px-2 text-xs text-fd-foreground focus:outline-none focus:ring-1 focus:ring-amber-400"
                      >
                        <option value="">(None - Top Level)</option>
                        {categoryParentPages.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title || p.path}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-fd-muted-foreground">
                        New Path Preview
                      </span>
                      {isMoving && (
                        <span className="text-[10px] text-amber-400 font-mono font-medium">
                          Redirect will be created
                        </span>
                      )}
                    </div>
                    <Input
                      value={`/docs/${previewPath}`.replace(/\/+/g, "/")}
                      disabled
                      className={cn(
                        "h-7 text-xs font-mono bg-fd-secondary/40 text-fd-muted-foreground",
                        isMoving && "text-amber-400 border-amber-400/40 bg-amber-400/5 font-semibold"
                      )}
                    />
                  </div>
                </div>
              )}
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
                  <option value="api">API Reference</option>
                  <option value="kv">Cheatsheet / KV Table</option>
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
                  <option value="published">Ready</option>
                  <option value="draft">In Progress (WIP)</option>
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
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-xs text-black font-semibold transition-all cursor-pointer shadow-xs shadow-amber-500/20 ring-1 ring-inset ring-amber-300/60"
                >
                  <HardDrive className="h-3 w-3 text-black" />
                  Full Vault Backup...
                </button>
              </div>
            </div>

            {pageCategorySlug && (
              <div className="space-y-1.5 pt-2 border-t border-fd-border/40">
                <label className="text-xs font-medium text-fd-muted-foreground block">
                  Sidebar Organization
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReorder(true)}
                  className="h-8 text-xs gap-1.5 border-fd-border bg-fd-secondary/30 hover:bg-fd-secondary text-fd-foreground cursor-pointer w-full justify-start"
                >
                  <ArrowUpDown className="h-3.5 w-3.5 text-amber-400" />
                  <span>
                    Reorder Pages in this Category ({pageCategorySlug})
                  </span>
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-fd-border/40">
            {isCategoryRoot ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteCategory(true)}
                disabled={isDeleting || isSaving}
                className="text-destructive hover:bg-destructive/10 text-xs gap-1.5 cursor-pointer font-medium"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Category
              </Button>
            ) : (
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
            )}

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
                className="text-xs h-8 bg-amber-400 text-black hover:bg-amber-300 active:bg-amber-500 font-semibold gap-1.5 cursor-pointer shadow-xs shadow-amber-500/20 ring-1 ring-inset ring-amber-300/60 transition-all"
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

    {isCategoryRoot && (
      <DeleteCategoryDialog
        open={showDeleteCategory}
        onOpenChange={setShowDeleteCategory}
        categorySlug={page.path}
        categoryTitle={page.title}
        childCount={childPages.length}
      />
    )}

    {pageCategorySlug && (
      <ReorderPagesDialog
        open={showReorder}
        onOpenChange={setShowReorder}
        categoryTitle={
          isCategoryRoot
            ? page.title
            : destinations?.categories.find((c) => c.slug === pageCategorySlug)?.label ||
              pageCategorySlug.charAt(0).toUpperCase() + pageCategorySlug.slice(1)
        }
        categorySlug={pageCategorySlug}
        initialPages={childPages.length > 0 ? childPages : undefined}
      />
    )}

    <VaultBackupDialog
      open={showVaultBackup}
      onOpenChange={setShowVaultBackup}
      currentPageId={page.id}
      currentPageTitle={page.title}
    />
    </>
  );
}
