"use client";

import { useSearchContext } from "fumadocs-ui/contexts/search";
import { cn } from "@/lib/utils";

interface TagChipProps {
  tag: string;
  className?: string;
  size?: "sm" | "xs";
  asSpan?: boolean;
}

export function TagChip({ tag, className, size = "sm", asSpan = false }: TagChipProps) {
  const { setOpenSearch } = useSearchContext();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenSearch(true);

    // Pre-populate search query in search input when modal opens
    setTimeout(() => {
      const searchInputs = document.querySelectorAll<HTMLInputElement>(
        'input[type="search"], input[placeholder*="Search"]'
      );
      if (searchInputs.length > 0) {
        const input = searchInputs[searchInputs.length - 1];
        input.value = tag;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.focus();
      }
    }, 120);
  };

  const classes = cn(
    "inline-flex items-center gap-0.5 rounded-md border border-fd-border/70 bg-fd-secondary/30 font-mono text-fd-muted-foreground transition-all hover:bg-amber-400/10 hover:border-amber-400/30 hover:text-amber-400 cursor-pointer select-none",
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-1.5 py-0.2 text-[10px]",
    className
  );

  if (asSpan) {
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleClick(e as any);
          }
        }}
        title={`Search for tag #${tag}`}
        className={classes}
      >
        <span className="opacity-60 text-[10px]">#</span>
        <span>{tag}</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={`Search for tag #${tag}`}
      className={classes}
    >
      <span className="opacity-60 text-[10px]">#</span>
      <span>{tag}</span>
    </button>
  );
}
