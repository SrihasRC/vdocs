"use client";

import { CalloutBlock } from "@/lib/db/schema";
import { Callout } from "fumadocs-ui/components/callout";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface CalloutBlockRendererProps {
  block: CalloutBlock;
}

export function CalloutBlockRenderer({ block }: CalloutBlockRendererProps) {
  const { type = "info", title, content } = block.data;
  const blockAnchor = `block-${block.id}`;

  return (
    <div id={blockAnchor} className="my-4 scroll-mt-20 not-prose">
      <Callout type={type as any} title={title || undefined}>
        {content ? (
          <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-fd-card-foreground/90 prose-p:my-1 prose-pre:my-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        ) : null}
      </Callout>
    </div>
  );
}
