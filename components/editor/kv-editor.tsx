"use client";

import { KVBlock } from "@/lib/db/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, TableProperties } from "lucide-react";

interface KVEditorProps {
  block: KVBlock;
  onChange: (updated: KVBlock) => void;
}

export function KVEditor({ block, onChange }: KVEditorProps) {
  const { title = "", description = "", rows = [] } = block.data;

  const update = (partial: Partial<KVBlock["data"]>) => {
    onChange({
      ...block,
      data: {
        ...block.data,
        ...partial,
      },
    });
  };

  const handleAddRow = () => {
    update({
      rows: [...rows, { key: "", value: "", description: "" }],
    });
  };

  const handleRemoveRow = (index: number) => {
    const updated = rows.filter((_, i) => i !== index);
    update({ rows: updated });
  };

  const handleRowChange = (index: number, field: "key" | "value" | "description", val: string) => {
    const updated = [...rows];
    updated[index] = {
      ...updated[index],
      [field]: val,
    };
    update({ rows: updated });
  };

  return (
    <div className="space-y-4 p-3.5">
      {/* Title & Description */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-fd-muted-foreground flex items-center gap-1.5">
            <TableProperties className="size-3 text-amber-400" />
            Table Title (Optional)
          </label>
          <Input
            value={title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="e.g. Docker CLI Flags or Env Variables"
            className="h-8 text-xs bg-fd-background"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-fd-muted-foreground">
            Description (Optional)
          </label>
          <Input
            value={description}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="e.g. Common configuration variables for local deployment"
            className="h-8 text-xs bg-fd-background"
          />
        </div>
      </div>

      {/* Rows Editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-fd-muted-foreground">
            Key-Value Rows ({rows.length})
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            className="h-6 text-xs gap-1 border-fd-border/70 bg-fd-secondary/30 hover:bg-fd-secondary text-fd-foreground hover:text-amber-400 cursor-pointer shadow-xs transition-colors"
          >
            <Plus className="size-3" />
            Add Row
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-fd-border/70 p-4 text-center text-xs text-fd-muted-foreground">
            No rows added yet. Click &quot;Add Row&quot; above to create a key-value entry.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 rounded-lg border border-fd-border/70 bg-fd-secondary/20"
              >
                <div className="w-1/4">
                  <Input
                    value={row.key}
                    onChange={(e) => handleRowChange(idx, "key", e.target.value)}
                    placeholder="Key / Flag"
                    className="h-7 text-xs font-mono bg-fd-background"
                  />
                </div>

                <div className="w-1/3">
                  <Input
                    value={row.value}
                    onChange={(e) => handleRowChange(idx, "value", e.target.value)}
                    placeholder="Value / Shortcut"
                    className="h-7 text-xs font-mono bg-fd-background"
                  />
                </div>

                <div className="flex-1">
                  <Input
                    value={row.description || ""}
                    onChange={(e) => handleRowChange(idx, "description", e.target.value)}
                    placeholder="Description / Context"
                    className="h-7 text-xs bg-fd-background"
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveRow(idx)}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                  title="Remove row"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
