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
import { Button } from "@/components/ui/button";
import { deleteCategory } from "@/app/actions/pages";
import { Trash2, AlertTriangle, Loader2, FolderTree, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeleteCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categorySlug: string;
  categoryTitle: string;
  childCount: number;
}

export function DeleteCategoryDialog({
  open,
  onOpenChange,
  categorySlug,
  categoryTitle,
  childCount,
}: DeleteCategoryDialogProps) {
  const router = useRouter();
  const [deleteChildPages, setDeleteChildPages] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const res = await deleteCategory({
      categorySlug,
      deleteChildPages,
    });
    setIsDeleting(false);

    if (res.success) {
      onOpenChange(false);
      router.push("/docs");
      router.refresh();
    } else {
      alert(res.error || "Failed to delete category");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#111113] border-fd-border text-fd-foreground rounded-xl p-5 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <div className="p-1.5 rounded-lg bg-destructive/10 border border-destructive/20">
              <Trash2 className="size-4 text-destructive" />
            </div>
            <DialogTitle className="text-base font-semibold text-fd-foreground">
              Delete Category: {categoryTitle}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-fd-muted-foreground pt-1">
            This will permanently remove the <code className="font-mono text-amber-400">/docs/{categorySlug}</code> category section from your vault and sidebar.
          </DialogDescription>
        </DialogHeader>

        {childCount > 0 ? (
          <div className="py-3 space-y-3">
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300 flex items-start gap-2.5">
              <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold text-amber-400">
                  {childCount} nested {childCount === 1 ? "document" : "documents"} found
                </span>
                <p className="text-[11px] text-amber-300/90 leading-relaxed">
                  Choose what happens to the pages currently filed under this category:
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors text-xs",
                  !deleteChildPages
                    ? "border-amber-400/50 bg-amber-400/5 text-fd-foreground"
                    : "border-fd-border bg-fd-secondary/30 text-fd-muted-foreground hover:bg-fd-secondary/50"
                )}
              >
                <input
                  type="radio"
                  name="deleteOption"
                  checked={!deleteChildPages}
                  onChange={() => setDeleteChildPages(false)}
                  className="mt-0.5 accent-amber-400"
                />
                <div className="space-y-0.5">
                  <span className="font-semibold block text-fd-foreground">
                    Move pages to Vault root (Recommended)
                  </span>
                  <span className="text-[11px] text-fd-muted-foreground block">
                    Keeps all runbooks and snippets safe, moving them to <code className="font-mono text-amber-300">/docs/[slug]</code>.
                  </span>
                </div>
              </label>

              <label
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors text-xs",
                  deleteChildPages
                    ? "border-destructive/60 bg-destructive/10 text-fd-foreground"
                    : "border-fd-border bg-fd-secondary/30 text-fd-muted-foreground hover:bg-fd-secondary/50"
                )}
              >
                <input
                  type="radio"
                  name="deleteOption"
                  checked={deleteChildPages}
                  onChange={() => setDeleteChildPages(true)}
                  className="mt-0.5 accent-destructive"
                />
                <div className="space-y-0.5">
                  <span className="font-semibold block text-destructive">
                    Delete category and all {childCount} document{childCount > 1 ? "s" : ""}
                  </span>
                  <span className="text-[11px] text-fd-muted-foreground block">
                    Permanently deletes the category and all nested pages from the database.
                  </span>
                </div>
              </label>
            </div>
          </div>
        ) : (
          <div className="py-3">
            <p className="text-xs text-fd-muted-foreground leading-relaxed">
              This category has no nested child documents. Deleting it will remove the section root from your sidebar.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 pt-3 border-t border-fd-border/40">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="text-xs h-8 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-xs h-8 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold gap-1.5 cursor-pointer shadow-xs"
          >
            {isDeleting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            Delete Category
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
