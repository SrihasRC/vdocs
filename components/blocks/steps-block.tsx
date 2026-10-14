"use client";

import { StepsBlock } from "@/lib/db/schema";
import { CopyButton } from "@/components/ui/copy-button";
import { ListOrdered } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface StepsBlockProps {
  block: StepsBlock;
}

export function StepsBlockRenderer({ block }: StepsBlockProps) {
  const { title, steps } = block.data;
  const blockAnchor = `block-${block.id}`;

  return (
    <div id={blockAnchor} className="my-6 scroll-mt-20">
      {title && (
        <h3 className="text-lg font-semibold tracking-tight text-fd-foreground mb-4 flex items-center gap-2">
          <ListOrdered className="h-4 w-4 text-amber-400 shrink-0" />
          <a
            href={`#${blockAnchor}`}
            className="no-underline hover:underline underline-offset-4 decoration-fd-primary/50 text-fd-foreground"
          >
            {title}
          </a>
        </h3>
      )}

      <div className="relative border-l border-fd-border ml-3.5 pl-6 space-y-6">
        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          return (
            <div key={idx} className="relative group/step">
              {/* Step Number Dot */}
              <div className="absolute -left-[37px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-fd-border bg-fd-background text-[11px] font-mono font-semibold text-fd-foreground shadow-sm group-hover/step:border-amber-400/60 group-hover/step:text-amber-400 transition-colors">
                {stepNum}
              </div>

              {/* Step Text / Prose */}
              <div className="prose prose-sm prose-invert max-w-none text-fd-foreground/90 leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {step.text}
                </ReactMarkdown>
              </div>

              {/* Optional Step Command Box */}
              {step.command && (
                <div className="not-prose mt-2.5 relative flex items-center justify-between rounded-lg border border-fd-border bg-[#0d0d0f] px-3.5 py-2 text-xs font-mono group/cmd">
                  <span className="text-fd-foreground select-text overflow-x-auto py-0.5 pr-2 font-mono">
                    {step.command}
                  </span>
                  <CopyButton
                    text={step.command}
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-6 w-6"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
