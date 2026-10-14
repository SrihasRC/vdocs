"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Search,
  Terminal,
  HelpCircle,
  FileText,
  Folder,
  Layers,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResultItem {
  id: string;
  title: string;
  path: string;
  template: string;
  tags?: string[];
  snippet?: string;
}

export function GlobalSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isPending, startTransition] = useTransition();

  // Search when query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/db?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch (err) {
        console.error("Search error:", err);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (path: string) => {
    onOpenChange(false);
    startTransition(() => {
      router.push(`/docs/${path}`.replace(/\/+/g, "/"));
    });
  };

  const getTemplateIcon = (template: string) => {
    switch (template) {
      case "command":
        return <Terminal className="h-4 w-4 text-amber-400" />;
      case "qa":
        return <HelpCircle className="h-4 w-4 text-amber-400" />;
      case "index":
        return <Folder className="h-4 w-4 text-amber-400" />;
      default:
        return <FileText className="h-4 w-4 text-amber-400" />;
    }
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search Vault"
      description="Search across all notes, commands, and interview answers"
      className="max-w-xl border-fd-border bg-[#111113] text-fd-foreground shadow-2xl rounded-xl"
    >
      <CommandInput
        placeholder="Search documents, commands, answers..."
        value={query}
        onValueChange={setQuery}
        className="text-sm placeholder:text-fd-muted-foreground"
      />
      <CommandList className="max-h-[380px] p-2 text-sm scrollbar-thin">
        {query.trim().length > 0 && results.length === 0 && (
          <CommandEmpty className="py-6 text-center text-xs text-fd-muted-foreground">
            No results found for &ldquo;{query}&rdquo;.
          </CommandEmpty>
        )}

        {/* Live Search Results */}
        {results.length > 0 && (
          <CommandGroup heading="Results" className="text-xs text-fd-muted-foreground">
            {results.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={() => handleSelect(item.path)}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-fd-foreground hover:bg-fd-secondary/60 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-fd-border/70 bg-fd-secondary/30">
                    {getTemplateIcon(item.template)}
                  </div>
                  <div className="truncate">
                    <p className="font-medium text-xs text-fd-foreground truncate">
                      {item.title}
                    </p>
                    {item.snippet && (
                      <p className="text-[11px] text-fd-muted-foreground truncate">
                        {item.snippet}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="text-[10px] font-mono text-fd-muted-foreground border border-fd-border/60 rounded px-1.5 py-0.2">
                    {item.path || "vault"}
                  </span>
                  <ArrowRight className="h-3 w-3 text-fd-muted-foreground" />
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Quick Links Navigation when query is empty */}
        {query.trim().length === 0 && (
          <>
            <CommandGroup heading="Quick Navigation" className="text-xs text-fd-muted-foreground">
              <CommandItem
                onSelect={() => handleSelect("")}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-fd-foreground hover:bg-fd-secondary/60 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="h-4 w-4 text-amber-400" />
                  <span className="font-medium text-xs">Vault Overview</span>
                </div>
                <span className="text-[10px] font-mono text-fd-muted-foreground">/docs</span>
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect("quickstart")}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-fd-foreground hover:bg-fd-secondary/60 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-amber-400" />
                  <span className="font-medium text-xs">Quick Start</span>
                </div>
                <span className="text-[10px] font-mono text-fd-muted-foreground">/docs/quickstart</span>
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect("commands")}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-fd-foreground hover:bg-fd-secondary/60 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Terminal className="h-4 w-4 text-amber-400" />
                  <span className="font-medium text-xs">Commands & Runbooks</span>
                </div>
                <span className="text-[10px] font-mono text-fd-muted-foreground">/docs/commands</span>
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect("applications/job-answers")}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-fd-foreground hover:bg-fd-secondary/60 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <HelpCircle className="h-4 w-4 text-amber-400" />
                  <span className="font-medium text-xs">Job Applications & Q&A</span>
                </div>
                <span className="text-[10px] font-mono text-fd-muted-foreground">/docs/applications</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export function SearchTriggerButton({
  className,
  hideIfDisabled,
  ...props
}: {
  className?: string;
  hideIfDisabled?: boolean;
  [key: string]: any;
}) {
  const [open, setOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent));

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center justify-between w-full h-9 rounded-lg border border-fd-border/70 bg-fd-secondary/40 px-2.5 text-xs text-fd-muted-foreground transition-all hover:bg-fd-secondary/70 hover:text-fd-foreground hover:border-amber-400/30 group/search",
          className
        )}
        aria-label="Open search dialog"
        {...props}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Search className="h-3.5 w-3.5 text-fd-muted-foreground group-hover/search:text-amber-400 transition-colors shrink-0" />
          <span className="truncate">Search</span>
        </div>
        <kbd className="inline-flex items-center gap-0.5 rounded border border-fd-border/70 bg-[#0d0d0f] px-1.5 py-0.5 text-[10px] font-mono font-medium text-fd-muted-foreground group-hover/search:text-amber-400 group-hover/search:border-amber-400/40 transition-colors">
          <span>{isMac ? "⌘" : "Ctrl"}</span>
          <span>K</span>
        </kbd>
      </button>

      <GlobalSearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function SearchTriggerSmall({
  className,
  ...props
}: {
  className?: string;
  [key: string]: any;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-fd-border/70 bg-fd-secondary/40 text-fd-muted-foreground hover:bg-fd-secondary hover:text-amber-400 transition-colors",
          className
        )}
        aria-label="Open search dialog"
        {...props}
      >
        <Search className="h-4 w-4" />
      </button>
      <GlobalSearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
