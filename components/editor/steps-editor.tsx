"use client";

import { StepsBlock } from "@/lib/db/schema";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

interface StepsEditorProps {
  block: StepsBlock;
  onChange: (updated: StepsBlock) => void;
}

export function StepsEditor({ block, onChange }: StepsEditorProps) {
  const { title, steps } = block.data;

  const update = (partial: Partial<StepsBlock["data"]>) => {
    onChange({
      ...block,
      data: {
        ...block.data,
        ...partial,
      },
    });
  };

  const handleStepChange = (
    index: number,
    field: "text" | "command",
    value: string
  ) => {
    const nextSteps = [...steps];
    nextSteps[index] = {
      ...nextSteps[index],
      [field]: value,
    };
    update({ steps: nextSteps });
  };

  const addStep = () => {
    update({
      steps: [...steps, { text: "Next instruction step", command: "" }],
    });
  };

  const removeStep = (index: number) => {
    update({
      steps: steps.filter((_, i) => i !== index),
    });
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    const nextSteps = [...steps];
    const temp = nextSteps[index];
    nextSteps[index] = nextSteps[targetIndex];
    nextSteps[targetIndex] = temp;
    update({ steps: nextSteps });
  };

  return (
    <div className="space-y-4 p-3.5">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-fd-muted-foreground">
          Section Title (optional)
        </label>
        <Input
          value={title || ""}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="e.g. Installation & Quick Setup"
          className="h-8 text-xs bg-fd-background"
        />
      </div>

      <div className="space-y-3">
        <label className="text-xs font-medium text-fd-muted-foreground">
          Steps ({steps.length})
        </label>

        {steps.map((step, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-fd-border/70 bg-fd-secondary/20 p-3 space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-amber-400">
                Step {idx + 1}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-fd-muted-foreground hover:text-fd-foreground"
                  disabled={idx === 0}
                  onClick={() => moveStep(idx, "up")}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-fd-muted-foreground hover:text-fd-foreground"
                  disabled={idx === steps.length - 1}
                  onClick={() => moveStep(idx, "down")}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:bg-destructive/10"
                  onClick={() => removeStep(idx)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <Textarea
              value={step.text}
              onChange={(e) => handleStepChange(idx, "text", e.target.value)}
              placeholder="Step explanation (supports markdown)"
              className="min-h-[50px] text-xs bg-fd-background"
            />

            <Input
              value={step.command || ""}
              onChange={(e) => handleStepChange(idx, "command", e.target.value)}
              placeholder="Optional command (e.g. pnpm install)"
              className="h-7 text-xs font-mono bg-[#0d0d0f]"
            />
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addStep}
          className="w-full h-8 text-xs border-dashed gap-1.5 hover:border-amber-400/40 hover:text-amber-400"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Step
        </Button>
      </div>
    </div>
  );
}
