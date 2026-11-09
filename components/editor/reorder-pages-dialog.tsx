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
import { Button } from "@/components/ui/button";
import { reorderPages, getCategoryPages } from "@/app/actions/pages";
import {
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Loader2,
  Check,
  FileText,
  SortAsc,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ReorderPageItem {
  id: string;
  title: string;
  slug: string;
  position?: number;
}

interface ReorderPagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryTitle: string;
  categorySlug: string;
  initialPages?: ReorderPageItem[];
  onReordered?: () => void;
}

export function ReorderPagesDialog({
  open,
  onOpenChange,
  categoryTitle,
  categorySlug,
  initialPages,
  onReordered,
}: ReorderPagesDialogProps) {
  const router = useRouter();
  const [items, setItems] = useState<ReorderPageItem[]>(initialPages || []);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialPages && initialPages.length > 0) {
        setItems(initialPages);
        setHasChanged(false);
      } else if (categorySlug) {
        setIsLoading(true);
        getCategoryPages(categorySlug)
          .then((res) => {
            if (res.success && res.childPages) {
              setItems(res.childPages);
            }
          })
          .finally(() => setIsLoading(false));
        setHasChanged(false);
      }
    }
  }, [open, initialPages, categorySlug]);

  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);

    setItems(newItems);
    setHasChanged(true);
  };

  const sortAlphabetical = () => {
    const sorted = [...items].sort((a, b) => a.title.localeCompare(b.title));
    setItems(sorted);
    setHasChanged(true);
  };

  const handleSave = async () => {
    if (items.length === 0) return;
    setIsSaving(true);

    const orderedIds = items.map((p) => p.id);
    const res = await reorderPages(orderedIds);
    setIsSaving(false);

    if (res.success) {
      onOpenChange(false);
      onReordered?.();
      router.refresh();
    } else {
      alert(res.error || "Failed to update page order");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw] bg-[#111113] border-fd-border text-fd-foreground rounded-xl p-5 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <ArrowUpDown className="size-4 text-amber-400" />
              Reorder Pages
            </DialogTitle>
            {items.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={sortAlphabetical}
                className="h-7 text-xs text-fd-muted-foreground hover:text-fd-foreground gap-1 px-2 cursor-pointer"
                title="Sort A to Z"
              >
                <SortAsc className="size-3.5" />
                <span>Sort A-Z</span>
              </Button>
            )}
          </div>
          <DialogDescription className="text-xs text-fd-muted-foreground">
            Arrange pages in <strong className="text-fd-foreground">{categoryTitle}</strong>. The order is reflected immediately in the sidebar navigation.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-1.5 max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-fd-muted-foreground flex flex-col items-center justify-center gap-2">
              <Loader2 className="size-5 animate-spin text-amber-400" />
              <span>Loading pages...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-xs text-fd-muted-foreground">
              No pages found in this category to reorder.
            </div>
          ) : (
            items.map((page, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === items.length - 1;

              return (
                <div
                  key={page.id}
                  className="flex items-center justify-between gap-2.5 p-2.5 rounded-lg border border-fd-border/70 bg-fd-secondary/30 hover:bg-fd-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex items-center justify-center size-5 rounded bg-fd-secondary text-[11px] font-mono font-semibold text-fd-muted-foreground shrink-0 border border-fd-border/60">
                      {idx + 1}
                    </span>
                    <FileText className="size-3.5 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-fd-foreground block truncate">
                        {page.title}
                      </span>
                      <span className="text-[10px] font-mono text-fd-muted-foreground block truncate">
                        {page.slug}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isFirst || isSaving}
                      onClick={() => moveItem(idx, "up")}
                      className="size-7 text-fd-muted-foreground hover:text-fd-foreground disabled:opacity-30 cursor-pointer"
                      title="Move up"
                    >
                      <ChevronUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isLast || isSaving}
                      onClick={() => moveItem(idx, "down")}
                      className="size-7 text-fd-muted-foreground hover:text-fd-foreground disabled:opacity-30 cursor-pointer"
                      title="Move down"
                    >
                      <ChevronDown className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="gap-2 pt-3 border-t border-fd-border/40">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="text-xs h-8 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !hasChanged || items.length === 0}
            className="text-xs h-8 bg-amber-400 text-black hover:bg-amber-300 active:bg-amber-500 font-semibold gap-1.5 cursor-pointer shadow-xs shadow-amber-500/20 ring-1 ring-inset ring-amber-300/60 transition-all"
          >
            {isSaving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            Save Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
