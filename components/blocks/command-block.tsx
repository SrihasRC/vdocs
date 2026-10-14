"use client";

import { CommandBlock } from "@/lib/db/schema";
import { CopyButton } from "@/components/ui/copy-button";
import { Terminal, ShieldAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandBlockProps {
  block: CommandBlock;
}

export function CommandBlockRenderer({ block }: CommandBlockProps) {
  const { title, description, shell, command, sudo, os, notes } = block.data;
  const blockAnchor = `block-${block.id}`;

  return (
    <div id={blockAnchor} className="group/block my-6 scroll-mt-20">
      <div className="flex flex-col gap-2 mb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-fd-foreground">
              <a
                href={`#${blockAnchor}`}
                className="hover:underline underline-offset-4 decoration-fd-primary/50"
              >
                {title}
              </a>
            </h3>
          </div>

          {/* Badges: Sudo & OS Tags */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {sudo && (
              <span className="rounded-md flex items-center gap-1 border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-mono capitalize">
                <ShieldAlert className="h-3 w-3" />
                sudo
              </span>
            )}
            {os &&
              os.map((item) => (
                <span
                  key={item}
                  className="rounded-md border border-fd-border/70 bg-fd-secondary/40 px-1.5 py-0.5 text-[11px] font-mono text-fd-muted-foreground capitalize"
                >
                  {item}
                </span>
              ))}
          </div>
        </div>

        {description && (
          <p className="text-sm text-fd-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Terminal Block */}
      <div className="not-prose relative rounded-lg border border-fd-border bg-[#0d0d0f] overflow-hidden">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-3.5 py-2 border-b border-fd-border/60 bg-[#121215]/80 text-xs text-fd-muted-foreground font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[11px] tracking-wide text-fd-foreground/80">
              {shell || "bash"}
            </span>
          </div>
          <CopyButton text={command} label="Copy" variant="ghost" size="sm" />
        </div>

        {/* Command Body */}
        <pre className="p-3.5 overflow-x-auto text-sm font-mono leading-relaxed text-fd-foreground bg-transparent select-text m-0">
          <code className="bg-transparent border-0 p-0 text-inherit font-mono font-normal">
            {command}
          </code>
        </pre>
      </div>

      {/* Optional Notes */}
      {notes && (
        <div className="mt-2.5 flex items-start gap-2.5 rounded-lg border border-fd-border/60 bg-fd-card/40 p-2.5 text-xs text-fd-muted-foreground">
          <Info className="h-4 w-4 shrink-0 text-amber-400/80 mt-0.5" />
          <div className="leading-relaxed">{notes}</div>
        </div>
      )}
    </div>
  );
}
