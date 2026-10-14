"use client";

import { QABlock } from "@/lib/db/schema";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface QAEditorProps {
  block: QABlock;
  onChange: (updated: QABlock) => void;
}

export function QAEditor({ block, onChange }: QAEditorProps) {
  const { question, short, long } = block.data;

  const update = (partial: Partial<QABlock["data"]>) => {
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
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-fd-muted-foreground">
          Question / Prompt
        </label>
        <Input
          value={question}
          onChange={(e) => update({ question: e.target.value })}
          placeholder="e.g. Tell me about a time you optimized a slow database query"
          className="h-8 text-xs bg-fd-background"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-fd-muted-foreground flex items-center justify-between">
          <span>Short Answer / Takeaway</span>
          <span className="text-[10px] text-fd-muted-foreground">
            for quick copy-pasting
          </span>
        </label>
        <Textarea
          value={short || ""}
          onChange={(e) => update({ short: e.target.value })}
          placeholder="Concise 1-2 sentence response summary"
          className="min-h-[60px] text-xs bg-fd-background"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-fd-muted-foreground flex items-center justify-between">
          <span>Detailed Explanation / STAR Response</span>
          <span className="text-[10px] text-fd-muted-foreground">
            supports markdown
          </span>
        </label>
        <Textarea
          value={long || ""}
          onChange={(e) => update({ long: e.target.value })}
          placeholder="Full contextual answer with situation, task, action, and results..."
          className="min-h-[120px] text-xs leading-relaxed bg-fd-background"
        />
      </div>
    </div>
  );
}
