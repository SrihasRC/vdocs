"use client";

import { CommandBlock } from "@/lib/db/schema";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Terminal, ShieldAlert } from "lucide-react";

interface CommandEditorProps {
  block: CommandBlock;
  onChange: (updated: CommandBlock) => void;
}

export function CommandEditor({ block, onChange }: CommandEditorProps) {
  const { title, description, shell, command, sudo, os, notes } = block.data;

  const update = (partial: Partial<CommandBlock["data"]>) => {
    onChange({
      ...block,
      data: {
        ...block.data,
        ...partial,
      },
    });
  };

  const handleOsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const list = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    update({ os: list });
  };

  return (
    <div className="space-y-3.5 p-3.5">
      {/* Title & Shell */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 space-y-1.5">
          <label className="text-xs font-medium text-fd-muted-foreground">
            Title
          </label>
          <Input
            value={title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="e.g. System Upgrade & Clean Packages"
            className="h-8 text-xs bg-fd-background"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-fd-muted-foreground">
            Shell / Environment
          </label>
          <Input
            value={shell || "bash"}
            onChange={(e) => update({ shell: e.target.value })}
            placeholder="bash / zsh / sh"
            className="h-8 text-xs font-mono bg-fd-background"
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-fd-muted-foreground">
          Description (optional)
        </label>
        <Input
          value={description || ""}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Brief summary of what this command accomplishes"
          className="h-8 text-xs bg-fd-background"
        />
      </div>

      {/* Command Textarea */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-fd-muted-foreground flex items-center justify-between">
          <span>Command</span>
          <span className="text-[10px] font-mono text-fd-muted-foreground">
            executable CLI string
          </span>
        </label>
        <Textarea
          value={command}
          onChange={(e) => update({ command: e.target.value })}
          placeholder="e.g. sudo pacman -Syu"
          className="min-h-[75px] font-mono text-xs leading-relaxed bg-[#0d0d0f] text-fd-foreground"
        />
      </div>

      {/* Sudo Toggle & OS Tags */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="flex items-center gap-2.5 rounded-lg border border-fd-border/60 bg-fd-secondary/20 px-3 py-2">
          <Switch
            id={`sudo-${block.id}`}
            checked={sudo}
            onCheckedChange={(checked) => update({ sudo: checked })}
          />
          <label
            htmlFor={`sudo-${block.id}`}
            className="text-xs font-medium text-fd-foreground flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
            Requires root / sudo
          </label>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-fd-muted-foreground">
            OS Tags (comma-separated)
          </label>
          <Input
            value={(os || []).join(", ")}
            onChange={handleOsChange}
            placeholder="Linux, macOS, Arch Linux"
            className="h-8 text-xs bg-fd-background"
          />
        </div>
      </div>

      {/* Notes / Tips */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-fd-muted-foreground">
          Notes / Warnings (optional)
        </label>
        <Input
          value={notes || ""}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="e.g. Check release news before running major kernel updates"
          className="h-8 text-xs bg-fd-background"
        />
      </div>
    </div>
  );
}
