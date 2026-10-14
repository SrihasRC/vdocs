"use client";

import { useSearchContext } from "fumadocs-ui/contexts/search";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchTriggerButton({
  className,
  hideIfDisabled: _hideIfDisabled,
  ...props
}: {
  className?: string;
  hideIfDisabled?: boolean;
  [key: string]: any;
}) {
  const { setOpenSearch, hotKey } = useSearchContext();

  return (
    <button
      type="button"
      onClick={() => setOpenSearch(true)}
      className={cn(
        "flex items-center justify-between w-full h-9 rounded-lg border border-fd-border/70 bg-fd-secondary/40 px-2.5 text-xs text-fd-muted-foreground transition-all hover:bg-fd-secondary/70 hover:text-fd-foreground hover:border-amber-400/30 group/search cursor-pointer select-none",
        className
      )}
      aria-label="Open search dialog"
      {...props}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Search className="h-3.5 w-3.5 text-fd-muted-foreground group-hover/search:text-amber-400 transition-colors shrink-0" />
        <span className="truncate">Search</span>
      </div>
      <div className="inline-flex items-center gap-0.5 rounded border border-fd-border/70 bg-[#0d0d0f] px-1.5 py-0.5 text-[10px] font-mono font-medium text-fd-muted-foreground group-hover/search:text-amber-400 group-hover/search:border-amber-400/40 transition-colors">
        {hotKey && hotKey.length > 0 ? (
          hotKey.map((k, i) => <kbd key={i}>{k.display}</kbd>)
        ) : (
          <>
            <kbd>Ctrl</kbd>
            <kbd>K</kbd>
          </>
        )}
      </div>
    </button>
  );
}

export function SearchTriggerSmall({
  className,
  hideIfDisabled: _hideIfDisabled,
  ...props
}: {
  className?: string;
  hideIfDisabled?: boolean;
  [key: string]: any;
}) {
  const { setOpenSearch } = useSearchContext();

  return (
    <button
      type="button"
      onClick={() => setOpenSearch(true)}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-fd-border/70 bg-fd-secondary/40 text-fd-muted-foreground hover:bg-fd-secondary hover:text-amber-400 transition-colors cursor-pointer",
        className
      )}
      aria-label="Open search dialog"
      {...props}
    >
      <Search className="h-4 w-4" />
    </button>
  );
}
