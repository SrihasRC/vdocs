import Link from "next/link";
import { Folder, ArrowRight, FileCode, Terminal, HelpCircle } from "lucide-react";

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
}

export function ChildPagesGrid({
  childrenPages,
  title = "In this section",
}: ChildPagesGridProps) {
  if (childrenPages.length === 0) return null;

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

  return (
    <div className="not-prose mt-8 pt-6 border-t border-fd-border/70">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-fd-muted-foreground mb-4">
        {title}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {childrenPages.map((page) => (
          <Link
            key={page.id}
            href={`/docs/${page.path}`.replace(/\/+/g, "/")}
            className="group relative flex flex-col justify-between rounded-lg border border-fd-border bg-fd-card/40 p-3.5 transition-all hover:bg-fd-accent/40 hover:border-amber-400/40 hover:shadow-sm"
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
                <ArrowRight className="h-4 w-4 shrink-0 text-fd-muted-foreground group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
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
  );
}
