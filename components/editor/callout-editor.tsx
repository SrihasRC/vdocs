"use client";

import { useState } from "react";
import { CalloutBlock } from "@/lib/db/schema";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Eye, Code, Info, AlertTriangle, AlertCircle, Lightbulb, CheckCircle2 } from "lucide-react";
import { Callout } from "fumadocs-ui/components/callout";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface CalloutEditorProps {
  block: CalloutBlock;
  onChange: (updated: CalloutBlock) => void;
}

const VARIANTS = [
  { id: "info", label: "Info", icon: Info, color: "text-blue-400 border-blue-500/30" },
  { id: "idea", label: "Tip", icon: Lightbulb, color: "text-amber-400 border-amber-500/30" },
  { id: "warning", label: "Warning", icon: AlertTriangle, color: "text-orange-400 border-orange-500/30" },
  { id: "error", label: "Danger", icon: AlertCircle, color: "text-red-400 border-red-500/30" },
  { id: "success", label: "Success", icon: CheckCircle2, color: "text-emerald-400 border-emerald-500/30" },
] as const;

export function CalloutEditor({ block, onChange }: CalloutEditorProps) {
  const { type = "info", title = "", content = "" } = block.data;
  const [tab, setTab] = useState<"write" | "preview">("write");

  const update = (partial: Partial<CalloutBlock["data"]>) => {
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
      {/* Type & Title Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-fd-muted-foreground">
            Callout Variant
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {VARIANTS.map((v) => {
              const Icon = v.icon;
              const isSelected = type === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => update({ type: v.id })}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border transition-all cursor-pointer",
                    isSelected
                      ? "bg-fd-accent text-fd-accent-foreground border-fd-border font-medium shadow-xs"
                      : "bg-fd-background text-fd-muted-foreground border-fd-border/60 hover:text-fd-foreground hover:bg-fd-secondary/40"
                  )}
                >
                  <Icon className={cn("size-3.5", isSelected ? v.color.split(" ")[0] : "")} />
                  <span>{v.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-fd-muted-foreground">
            Title (Optional)
          </label>
          <Input
            value={title || ""}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="e.g. Critical Requirement"
            className="h-8 text-xs bg-fd-background"
          />
        </div>
      </div>

      {/* Content Editor */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-fd-muted-foreground">
            Callout Message (Markdown supported)
          </label>
          <div className="flex items-center gap-1 bg-fd-secondary/40 p-0.5 rounded-lg border border-fd-border/60">
            <Button
              type="button"
              variant={tab === "write" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab("write")}
              className="h-6 text-xs px-2 gap-1 cursor-pointer"
            >
              <Code className="h-3 w-3" />
              Write
            </Button>
            <Button
              type="button"
              variant={tab === "preview" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab("preview")}
              className="h-6 text-xs px-2 gap-1 cursor-pointer"
            >
              <Eye className="h-3 w-3" />
              Preview
            </Button>
          </div>
        </div>

        {tab === "write" ? (
          <Textarea
            value={content}
            onChange={(e) => update({ content: e.target.value })}
            placeholder="Write callout content here..."
            rows={3}
            className="text-xs bg-fd-background leading-relaxed font-mono resize-y min-h-[70px]"
          />
        ) : (
          <div className="rounded-lg border border-fd-border bg-fd-card/50 p-2 text-xs">
            <Callout type={type as any} title={title || undefined}>
              <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-fd-card-foreground/90">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content || "*No content provided.*"}
                </ReactMarkdown>
              </div>
            </Callout>
          </div>
        )}
      </div>
    </div>
  );
}
