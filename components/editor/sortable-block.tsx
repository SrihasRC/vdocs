"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Block } from "@/lib/db/schema";
import { CommandEditor } from "./command-editor";
import { StepsEditor } from "./steps-editor";
import { QAEditor } from "./qa-editor";
import { NoteEditor } from "./note-editor";
import { FileEditor } from "./file-editor";
import {
  GripVertical,
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
  Terminal,
  HelpCircle,
  FileText,
  ListOrdered,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SortableBlockProps {
  block: Block;
  onChange: (updated: Block) => void;
  onDuplicate: (block: Block) => void;
  onDelete: (blockId: string) => void;
}

export function SortableBlock({
  block,
  onChange,
  onDuplicate,
  onDelete,
}: SortableBlockProps) {
  const [expanded, setExpanded] = useState(true);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getBlockMeta = () => {
    switch (block.type) {
      case "command":
        return {
          icon: <Terminal className="h-3.5 w-3.5 text-amber-400" />,
          label: "Command",
          preview: block.data.title || block.data.command || "Untitled Command",
        };
      case "steps":
        return {
          icon: <ListOrdered className="h-3.5 w-3.5 text-amber-400" />,
          label: "Steps",
          preview:
            block.data.title ||
            `${block.data.steps.length} Step${block.data.steps.length === 1 ? "" : "s"}`,
        };
      case "qa":
        return {
          icon: <HelpCircle className="h-3.5 w-3.5 text-amber-400" />,
          label: "Q&A",
          preview: block.data.question || "Untitled Question",
        };
      case "note":
        return {
          icon: <FileText className="h-3.5 w-3.5 text-amber-400" />,
          label: "Note",
          preview:
            block.data.title ||
            (block.data.markdown.slice(0, 40) || "Markdown note"),
        };
      case "file":
        return {
          icon: <Paperclip className="h-3.5 w-3.5 text-amber-400" />,
          label: "File",
          preview: block.data.caption || block.data.fileId || "Attached file",
        };
    }
  };

  const meta = getBlockMeta();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border border-fd-border bg-fd-card shadow-sm transition-all overflow-hidden",
        isDragging && "opacity-40 border-amber-400 shadow-lg scale-[1.01] z-50",
        !isDragging && "hover:border-fd-primary/30"
      )}
    >
      {/* Header / Drag Bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-fd-border/60 bg-fd-secondary/30 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 -m-1 text-fd-muted-foreground hover:text-fd-foreground transition-colors"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-1.5 rounded-md border border-fd-border/70 bg-fd-secondary/60 px-1.5 py-0.5 text-[10px] font-mono font-medium text-fd-muted-foreground">
            {meta.icon}
            <span>{meta.label}</span>
          </div>

          <span className="text-xs font-medium text-fd-foreground truncate max-w-[280px] sm:max-w-md">
            {meta.preview}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onDuplicate(block)}
            className="h-7 w-7 text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-secondary/60"
            title="Duplicate block"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onDelete(block.id)}
            className="h-7 w-7 text-destructive hover:bg-destructive/10"
            title="Delete block"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(!expanded)}
            className="h-7 w-7 text-fd-muted-foreground hover:text-fd-foreground"
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Editor Body */}
      {expanded && (
        <div className="border-t border-fd-border/20">
          {block.type === "command" && (
            <CommandEditor block={block} onChange={onChange} />
          )}
          {block.type === "steps" && (
            <StepsEditor block={block} onChange={onChange} />
          )}
          {block.type === "qa" && (
            <QAEditor block={block} onChange={onChange} />
          )}
          {block.type === "note" && (
            <NoteEditor block={block} onChange={onChange} />
          )}
          {block.type === "file" && (
            <FileEditor block={block} onChange={onChange} />
          )}
        </div>
      )}
    </div>
  );
}
