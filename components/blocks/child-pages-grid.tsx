"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Trash2 } from "lucide-react";
import { deletePage } from "@/app/actions/pages";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";

export interface ChildPageItem {
  id: string;
  slug: string;
  path: string;
  title: string;
  template: string;
  description?: string;
  tags?: string[];
}

interface ChildPagesGridProps {
  childrenPages: ChildPageItem[];
  title?: string;
  onAddSubpage?: () => void;
}

export function ChildPagesGrid({
  childrenPages,
  title = "In this section",
}: ChildPagesGridProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<ChildPageItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (childrenPages.length === 0) return null;

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const res = await deletePage(deleteTarget.id);
    setIsDeleting(false);
    setDeleteTarget(null);

    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "Failed to delete page");
    }
  };

  return (
    <>
      <div className="not-prose mt-8 pt-6 border-t border-fd-border/70">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-fd-muted-foreground">
            {title}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {childrenPages.map((page) => (
            <Link
              key={page.id}
              href={`/docs/${page.path}`.replace(/\/+/g, "/")}
              className="group relative flex flex-col justify-between rounded-lg border border-fd-border bg-fd-card/40 p-3.5 transition-all hover:bg-fd-accent/40 hover:border-amber-400/40 hover:shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-sm font-semibold text-fd-foreground group-hover:text-amber-400 transition-colors truncate">
                    {page.title}
                  </span>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteTarget(page);
                      }}
                      title="Delete this document"
                      className="cursor-pointer p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-fd-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                    <ArrowRight className="h-4 w-4 text-fd-muted-foreground group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>

                {page.description && (
                  <p className="text-xs text-fd-muted-foreground line-clamp-2 leading-relaxed mt-1">
                    {page.description}
                  </p>
                )}
              </div>

              {page.tags && page.tags.length > 0 && (
                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  {page.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded border border-fd-border/60 bg-fd-secondary/20 px-1.5 py-0.5 text-[10px] font-mono text-fd-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget?.title || ""}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
