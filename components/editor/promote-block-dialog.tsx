"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Block } from "@/lib/db/schema";
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
import {
  getVaultCategories,
  promoteBlockToPage,
  getPagesForBlockTransfer,
  moveBlockToPage,
} from "@/app/actions/pages";
import { ArrowRight, ArrowUpRight, FileUp, FolderInput, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromoteBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: Block | null;
  sourcePageId: string;
  onTransferred?: (blockId: string, removeSource: boolean) => void;
}

function getDefaultTitle(block: Block | null): string {
  if (!block) return "";
  switch (block.type) {
    case "command":
      return block.data.title || "Runbook Command";
    case "qa":
      return block.data.question || "Q&A Topic";
    case "note":
      return block.data.title || "Note Topic";
    case "steps":
      return block.data.title || "Step-by-Step Guide";
    case "callout":
      return block.data.title || "Important Notice";
    case "kv":
      return block.data.title || "Cheatsheet Reference";
    case "file":
      return block.data.caption || "Attachment";
    default:
      return "New Document";
  }
}

export function PromoteBlockDialog({
  open,
  onOpenChange,
  block,
  sourcePageId,
  onTransferred,
}: PromoteBlockDialogProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"existing" | "new">("existing");

  // Move to Existing Doc state
  const [targetPageId, setTargetPageId] = useState("");
  const [availablePages, setAvailablePages] = useState<
    { id: string; title: string; path: string; slug: string }[]
  >([]);

  // Create New Doc state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("commands");
  const [categories, setCategories] = useState<{ label: string; slug: string }[]>([]);

  // Shared state
  const [removeSource, setRemoveSource] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionDoneMsg, setActionDoneMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open && block) {
      setTitle(getDefaultTitle(block));
      setActionDoneMsg(null);

      // Load destination pages for "Move to Existing"
      getPagesForBlockTransfer(sourcePageId).then((res) => {
        if (res.success && res.pages) {
          setAvailablePages(res.pages);
          if (res.pages.length > 0) {
            setTargetPageId(res.pages[0].id);
          }
        }
      });

      // Load vault categories for "Create New Doc"
      getVaultCategories().then((res) => {
        if (res.success && res.categories) {
          setCategories(res.categories);
        }
      });
    }
  }, [open, block, sourcePageId]);

  // Handle Move to Existing Page
  const handleMoveToExisting = async (shouldOpenTarget: boolean) => {
    if (!block || !targetPageId) return;

    setIsSubmitting(true);
    const res = await moveBlockToPage({
      sourcePageId,
      targetPageId,
      block,
      removeSourceBlock: removeSource,
    });
    setIsSubmitting(false);

    if (res.success) {
      if (shouldOpenTarget && res.targetPath) {
        onOpenChange(false);
        router.push(`/docs/${res.targetPath}`);
        router.refresh();
      } else {
        // Stay on current page and update local state so user can continue triaging
        onTransferred?.(block.id, removeSource);
        setActionDoneMsg(`Moved to "${res.targetTitle || "target document"}"!`);
        setTimeout(() => {
          onOpenChange(false);
          router.refresh();
        }, 800);
      }
    } else {
      alert(res.error || "Failed to move block");
    }
  };

  // Handle Create New Page (Promote)
  const handleCreateNewPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!block || !title.trim()) return;

    setIsSubmitting(true);
    const res = await promoteBlockToPage({
      sourcePageId,
      block,
      title: title.trim(),
      category,
      removeSourceBlock: removeSource,
    });
    setIsSubmitting(false);

    if (res.success && res.newPath) {
      onOpenChange(false);
      router.push(`/docs/${res.newPath}`);
      router.refresh();
    } else {
      alert(res.error || "Failed to create document from block");
    }
  };

  // Group available pages by top category
  const groupedPages = availablePages.reduce((acc, p) => {
    const parts = p.path.split("/");
    const groupSlug = parts.length > 1 ? parts[0] : "";
    const groupLabel =
      groupSlug === ""
        ? "Vault Root"
        : groupSlug.charAt(0).toUpperCase() + groupSlug.slice(1);
    if (!acc[groupLabel]) acc[groupLabel] = [];
    acc[groupLabel].push(p);
    return acc;
  }, {} as Record<string, typeof availablePages>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#111113] border-fd-border text-fd-foreground rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            {mode === "existing" ? (
              <FolderInput className="h-4 w-4 text-amber-400" />
            ) : (
              <FileUp className="h-4 w-4 text-amber-400" />
            )}
            Move or Promote Block
          </DialogTitle>
          <DialogDescription className="text-xs text-fd-muted-foreground">
            Move this block into another document or promote it into its own page.
          </DialogDescription>
        </DialogHeader>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-fd-secondary/40 rounded-lg border border-fd-border/60">
          <button
            type="button"
            onClick={() => setMode("existing")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-md font-medium transition-all cursor-pointer",
              mode === "existing"
                ? "bg-fd-background text-fd-foreground shadow-xs border border-fd-border/70"
                : "text-fd-muted-foreground hover:text-fd-foreground"
            )}
          >
            <FolderInput className="h-3.5 w-3.5 text-amber-400" />
            <span>Move to Existing Doc</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("new")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-md font-medium transition-all cursor-pointer",
              mode === "new"
                ? "bg-fd-background text-fd-foreground shadow-xs border border-fd-border/70"
                : "text-fd-muted-foreground hover:text-fd-foreground"
            )}
          >
            <FileUp className="h-3.5 w-3.5 text-amber-400" />
            <span>Create New Doc</span>
          </button>
        </div>

        {/* Success Confirmation Toast inside modal */}
        {actionDoneMsg && (
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 font-medium">
            <Check className="h-4 w-4 shrink-0" />
            <span>{actionDoneMsg}</span>
          </div>
        )}

        {/* Mode 1: Move to Existing Doc */}
        {mode === "existing" && (
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-fd-muted-foreground">
                Destination Document
              </label>
              <select
                value={targetPageId}
                onChange={(e) => setTargetPageId(e.target.value)}
                className="w-full h-8 rounded-lg border border-fd-border bg-fd-background px-2.5 text-xs text-fd-foreground focus:outline-none focus:ring-1 focus:ring-amber-400"
              >
                {Object.keys(groupedPages).length === 0 ? (
                  <option value="">No other pages found</option>
                ) : (
                  Object.entries(groupedPages).map(([group, pagesList]) => (
                    <optgroup key={group} label={group}>
                      {pagesList.map((p) => (
                        <option key={p.id} value={p.id}>
                          📄 {p.title} (/docs/{p.path})
                        </option>
                      ))}
                    </optgroup>
                  ))
                )}
              </select>
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 text-xs text-fd-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={removeSource}
                  onChange={(e) => setRemoveSource(e.target.checked)}
                  className="rounded border-fd-border accent-amber-400"
                />
                <span>Remove block from current document (Move)</span>
              </label>
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-fd-border/40 sm:justify-between items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs h-8 cursor-pointer"
              >
                Cancel
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting || !targetPageId}
                  onClick={() => handleMoveToExisting(false)}
                  className="text-xs h-8 cursor-pointer border-fd-border hover:bg-fd-secondary"
                  title="Moves block and keeps you on current page to continue triaging"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  Move Block
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isSubmitting || !targetPageId}
                  onClick={() => handleMoveToExisting(true)}
                  className="text-xs h-8 bg-amber-400 text-black hover:bg-amber-300 font-semibold gap-1.5 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5" />
                  )}
                  Move & Open
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}

        {/* Mode 2: Create New Doc (Promote) */}
        {mode === "new" && (
          <form onSubmit={handleCreateNewPage} className="space-y-4 py-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-fd-muted-foreground">
                Document Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Docker Container Cleanup"
                required
                className="h-8 text-xs bg-fd-background"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-fd-muted-foreground">
                Target Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-8 rounded-lg border border-fd-border bg-fd-background px-2.5 text-xs text-fd-foreground focus:outline-none focus:ring-1 focus:ring-amber-400"
              >
                {categories.length > 0 ? (
                  categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.label} {c.slug ? `(/docs/${c.slug})` : "(/docs)"}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="commands">Commands (/docs/commands)</option>
                    <option value="applications">Applications (/docs/applications)</option>
                    <option value="">Vault Root (/docs)</option>
                  </>
                )}
              </select>
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 text-xs text-fd-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={removeSource}
                  onChange={(e) => setRemoveSource(e.target.checked)}
                  className="rounded border-fd-border accent-amber-400"
                />
                <span>Remove block from current document after creating</span>
              </label>
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-fd-border/40">
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
                disabled={isSubmitting || !title.trim()}
                className="text-xs h-8 bg-amber-400 text-black hover:bg-amber-300 font-semibold gap-1.5 cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                )}
                Create & Open Document
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
