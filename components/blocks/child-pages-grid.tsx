"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Folder, ArrowRight, FileCode, Terminal, HelpCircle, Plus, Trash2, Loader2 } from "lucide-react";
import { deletePage } from "@/app/actions/pages";

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
  onAddSubpage,
}: ChildPagesGridProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (childrenPages.length === 0 && !onAddSubpage) return null;

  const getTemplateIcon = (template: string) => {
    switch (template) {
      case "command":
        return <Terminal className="h-4 w-4 text-amber-400" />;
      case "qa":
        return <HelpCircle className="h-4 w-4 text-amber-400" />;
      case "index":
        return <Folder className="h-4 w-4 text-amber-400" />;
      default:
        return <FileCode className="h-4 w-4 text-amber-400" />;
    }
  };

  const handleDelete = async (e: React.MouseEvent, page: ChildPageItem) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete "${page.title}" and any child pages under it?`)) {
      return;
    }

    setDeletingId(page.id);
    const res = await deletePage(page.id);
    setDeletingId(null);

    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "Failed to delete page");
    }
  };

  return (
    <div className="not-prose mt-8 pt-6 border-t border-fd-border/70">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fd-muted-foreground">
          {title}
        </h3>

        {onAddSubpage && (
          <button
            type="button"
            onClick={onAddSubpage}
            className="cursor-pointer inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium"
          >
            <Plus className="size-3.5" />
            <span>Add Page</span>
          </button>
        )}
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
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-fd-border/60 bg-fd-secondary/30">
                    {getTemplateIcon(page.template)}
                  </div>
                  <span className="text-sm font-semibold text-fd-foreground group-hover:text-amber-400 transition-colors truncate">
                    {page.title}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, page)}
                    disabled={deletingId === page.id}
                    title="Delete this subpage"
                    className="cursor-pointer p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-fd-muted-foreground hover:text-destructive transition-all"
                  >
                    {deletingId === page.id ? (
                      <Loader2 className="size-3.5 animate-spin text-destructive" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
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

        {/* Dashed Add Card */}
        {onAddSubpage && (
          <button
            type="button"
            onClick={onAddSubpage}
            className="cursor-pointer group flex flex-col items-center justify-center min-h-[96px] rounded-lg border border-dashed border-fd-border/80 bg-fd-secondary/10 p-3.5 transition-all hover:bg-fd-secondary/25 hover:border-amber-400/50"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-fd-foreground group-hover:text-amber-400 transition-colors">
              <Plus className="size-4 text-amber-400" />
              <span>Create New Page in this Section</span>
            </div>
            <span className="text-[11px] text-fd-muted-foreground mt-1">
              Add a command runbook, notes, or sub-document
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
