"use client";

import { NoteBlock } from "@/lib/db/schema";
import { CopyButton } from "@/components/ui/copy-button";
import { FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface NoteBlockProps {
  block: NoteBlock;
}

export function NoteBlockRenderer({ block }: NoteBlockProps) {
  const { title, markdown } = block.data;
  const blockAnchor = `block-${block.id}`;

  return (
    <div id={blockAnchor} className="my-6 scroll-mt-20">
      {title && (
        <h3 className="text-xl font-bold tracking-tight text-fd-foreground mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-amber-400" />
          <a
            href={`#${blockAnchor}`}
            className="hover:underline underline-offset-4 decoration-fd-primary/50"
          >
            {title}
          </a>
        </h3>
      )}

      <div className="prose prose-neutral dark:prose-invert max-w-none leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            pre({ children, ...props }) {
              return (
                <div className="relative group/code my-4 rounded-lg border border-fd-border bg-[#0d0d0f] p-4 text-sm font-mono overflow-x-auto shadow-inner">
                  <pre {...props}>{children}</pre>
                </div>
              );
            },
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "");
              const isInline = !match && typeof children === "string" && !children.includes("\n");

              if (isInline) {
                return (
                  <code
                    className="rounded-md border border-fd-border/70 bg-fd-secondary/40 px-1.5 py-0.5 text-xs font-mono text-amber-400/90"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }

              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
            a({ href, children, ...props }) {
              return (
                <a
                  href={href}
                  className="font-medium text-amber-400 underline underline-offset-4 hover:text-amber-300 transition-colors"
                  {...props}
                >
                  {children}
                </a>
              );
            },
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}
