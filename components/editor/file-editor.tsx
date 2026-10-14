"use client";

import { FileBlock } from "@/lib/db/schema";
import { Input } from "@/components/ui/input";

interface FileEditorProps {
  block: FileBlock;
  onChange: (updated: FileBlock) => void;
}

export function FileEditor({ block, onChange }: FileEditorProps) {
  const { fileId, caption } = block.data;

  const update = (partial: Partial<FileBlock["data"]>) => {
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
          File Identifier / Storage Key
        </label>
        <Input
          value={fileId}
          onChange={(e) => update({ fileId: e.target.value })}
          placeholder="e.g. resume-latest.pdf or file uuid"
          className="h-8 text-xs font-mono bg-fd-background"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-fd-muted-foreground">
          Caption / Download Note (optional)
        </label>
        <Input
          value={caption || ""}
          onChange={(e) => update({ caption: e.target.value })}
          placeholder="e.g. Official single-page PDF version for software engineering applications"
          className="h-8 text-xs bg-fd-background"
        />
      </div>
    </div>
  );
}
