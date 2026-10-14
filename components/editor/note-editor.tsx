"use client";

import { useState } from "react";
import { NoteBlock } from "@/lib/db/schema";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Eye, Code } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface NoteEditorProps {
  block: NoteBlock;
  onChange: (updated: NoteBlock) => void;
}

export function NoteEditor({ block, onChange }: NoteEditorProps) {
  const { title, markdown } = block.data;
  const [tab, setTab] = useState<"write" | "preview">("write");

  const update = (partial: Partial<NoteBlock["data"]>) => {
    onChange({
      ...block,
      data: {
        ...block.data,
        ...partial,
      },
    });
  };

  return (
    <div className="space-y-3.5 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-medium text-fd-muted-foreground">
            Section Title (optional)
          </label>
          <Input
            value={title || ""}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="e.g. Architecture Overview"
            className="h-8 text-xs bg-fd-background"
          />
        </div>

        <div className="flex items-center gap-1 self-end bg-fd-secondary/40 p-0.5 rounded-lg border border-fd-border/60">
          <Button
            type="button"
            variant={tab === "write" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab("write")}
            className="h-7 text-xs px-2.5 gap-1"
          >
            <Code className="h-3 w-3" />
            Write
          </Button>
          <Button
            type="button"
            variant={tab === "preview" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab("preview")}
            className="h-7 text-xs px-2.5 gap-1"
          >
            <Eye className="h-3 w-3" />
            Preview
          </Button>
        </div>
      </div>

      {tab === "write" ? (
        <div className="space-y-1.5">
          <Textarea
            value={markdown}
            onChange={(e) => update({ markdown: e.target.value })}
            placeholder="Write documentation in GitHub Flavored Markdown..."
            className="min-h-[160px] font-mono text-xs leading-relaxed bg-fd-background text-fd-foreground"
          />
        </div>
      ) : (
        <div className="min-h-[160px] rounded-lg border border-fd-border/70 bg-fd-background p-4 text-xs prose prose-invert max-w-none">
          {markdown.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
          ) : (
            <span className="text-fd-muted-foreground italic">
              Empty markdown content
            </span>
          )}
        </div>
      )}
    </div>
  );
}
