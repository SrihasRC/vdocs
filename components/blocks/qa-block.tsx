"use client";

import { useState } from "react";
import { QABlock } from "@/lib/db/schema";
import { CopyButton } from "@/components/ui/copy-button";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface QABlockProps {
  block: QABlock;
}

export function QABlockRenderer({ block }: QABlockProps) {
  const { question, short, long } = block.data;
  const [expanded, setExpanded] = useState(true);
  const blockAnchor = `block-${block.id}`;

  return (
    <div
      id={blockAnchor}
      className="my-5 rounded-lg border border-fd-border bg-fd-card/60 p-4 shadow-sm scroll-mt-20 hover:border-fd-primary/30 transition-colors"
    >
      {/* Header: Question & Copy Buttons */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <HelpCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <h3 className="text-base font-semibold text-fd-foreground tracking-tight">
            <a
              href={`#${blockAnchor}`}
              className="hover:underline underline-offset-4 decoration-fd-primary/50"
            >
              {question}
            </a>
          </h3>
        </div>

        {/* Copy actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {short && (
            <CopyButton
              text={short}
              label="Short"
              variant="outline"
              size="sm"
            />
          )}
          {long && (
            <CopyButton
              text={long}
              label="Full"
              variant="outline"
              size="sm"
            />
          )}
        </div>
      </div>

      {/* Short Answer (Quick Takeaway) */}
      {short && (
        <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-200/90 leading-relaxed font-medium">
          {short}
        </div>
      )}

      {/* Long Answer */}
      {long && (
        <div className="mt-3">
          {short && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-fd-muted-foreground hover:text-fd-foreground mb-2 transition-colors font-medium"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" /> Hide detailed response
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" /> Show detailed response
                </>
              )}
            </button>
          )}

          <div
            className={cn(
              "prose prose-sm prose-invert max-w-none text-fd-foreground/90 leading-relaxed transition-all",
              !expanded && short && "hidden"
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{long}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
