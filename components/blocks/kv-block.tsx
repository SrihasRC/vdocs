"use client";

import { KVBlock } from "@/lib/db/schema";
import { CopyButton } from "@/components/ui/copy-button";
import { TableProperties } from "lucide-react";

interface KVBlockRendererProps {
  block: KVBlock;
}

export function KVBlockRenderer({ block }: KVBlockRendererProps) {
  const { title, description, rows = [] } = block.data;
  const blockAnchor = `block-${block.id}`;

  if (!rows || rows.length === 0) {
    return null;
  }

  return (
    <div id={blockAnchor} className="my-6 scroll-mt-20 not-prose">
      {/* Title & Description */}
      {(title || description) && (
        <div className="mb-3 space-y-1">
          {title && (
            <h3 className="text-base font-semibold tracking-tight text-fd-foreground flex items-center gap-2">
              <TableProperties className="h-4 w-4 text-amber-400 shrink-0" />
              <a
                href={`#${blockAnchor}`}
                className="no-underline hover:underline underline-offset-4 decoration-fd-primary/50 text-fd-foreground"
              >
                {title}
              </a>
            </h3>
          )}
          {description && (
            <p className="text-xs text-fd-muted-foreground">{description}</p>
          )}
        </div>
      )}

      {/* Cheatsheet Table */}
      <div className="overflow-x-auto rounded-xl border border-fd-border bg-fd-card shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-fd-border bg-fd-secondary/30 text-fd-muted-foreground font-medium">
              <th className="py-2.5 px-3.5 w-1/4 font-semibold text-fd-foreground">Key / Command</th>
              <th className="py-2.5 px-3.5 w-1/3 font-semibold text-fd-foreground">Value / Shortcut</th>
              <th className="py-2.5 px-3.5 font-semibold text-fd-foreground">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-fd-border/40">
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className="group hover:bg-fd-secondary/20 transition-colors"
              >
                {/* Key */}
                <td className="py-2.5 px-3.5 align-middle font-mono font-medium text-amber-400/90 whitespace-nowrap">
                  <span className="inline-block rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-xs">
                    {row.key}
                  </span>
                </td>

                {/* Value with Quick Copy */}
                <td className="py-2.5 px-3.5 align-middle font-mono text-fd-foreground">
                  {row.value ? (
                    <div className="flex items-center justify-between gap-2 max-w-sm">
                      <span className="truncate select-all bg-fd-background/70 px-2 py-0.5 rounded border border-fd-border/60">
                        {row.value}
                      </span>
                      <CopyButton
                        text={row.value}
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 shrink-0"
                      />
                    </div>
                  ) : (
                    <span className="text-fd-muted-foreground italic text-[11px]">—</span>
                  )}
                </td>

                {/* Description */}
                <td className="py-2.5 px-3.5 align-middle text-fd-muted-foreground leading-relaxed">
                  {row.description || <span className="text-fd-muted-foreground/60">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
