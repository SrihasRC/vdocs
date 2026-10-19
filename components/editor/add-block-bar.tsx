"use client";

import { Block } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Terminal,
  ListOrdered,
  HelpCircle,
  Paperclip,
  Plus,
  FolderPlus,
  AlertCircle,
  TableProperties,
  Globe,
} from "lucide-react";

interface AddBlockBarProps {
  onAddBlock: (type: Block["type"]) => void;
  onOpenCreateSubpage?: () => void;
}

export function AddBlockBar({
  onAddBlock,
  onOpenCreateSubpage,
}: AddBlockBarProps) {
  return (
    <div className="my-6 rounded-lg border border-dashed border-fd-border/80 bg-fd-secondary/20 p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-medium text-fd-muted-foreground flex items-center gap-1.5 pl-1">
          <Plus className="h-3.5 w-3.5 text-amber-400" />
          Add Content Block:
        </span>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAddBlock("note")}
            className="h-7 text-xs gap-1.5 bg-fd-background hover:border-amber-400/40 hover:text-amber-400"
          >
            <FileText className="h-3 w-3 text-amber-400" />
            Note
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAddBlock("command")}
            className="h-7 text-xs gap-1.5 bg-fd-background hover:border-amber-400/40 hover:text-amber-400"
          >
            <Terminal className="h-3 w-3 text-amber-400" />
            Command
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAddBlock("steps")}
            className="h-7 text-xs gap-1.5 bg-fd-background hover:border-amber-400/40 hover:text-amber-400"
          >
            <ListOrdered className="h-3 w-3 text-amber-400" />
            Steps
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAddBlock("qa")}
            className="h-7 text-xs gap-1.5 bg-fd-background hover:border-amber-400/40 hover:text-amber-400"
          >
            <HelpCircle className="h-3 w-3 text-amber-400" />
            Q&A
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAddBlock("callout")}
            className="h-7 text-xs gap-1.5 bg-fd-background hover:border-amber-400/40 hover:text-amber-400 cursor-pointer"
          >
            <AlertCircle className="h-3 w-3 text-amber-400" />
            Callout
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAddBlock("kv")}
            className="h-7 text-xs gap-1.5 bg-fd-background hover:border-amber-400/40 hover:text-amber-400 cursor-pointer"
          >
            <TableProperties className="h-3 w-3 text-amber-400" />
            Cheatsheet
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAddBlock("api")}
            className="h-7 text-xs gap-1.5 bg-fd-background hover:border-amber-400/40 hover:text-amber-400 cursor-pointer"
          >
            <Globe className="h-3 w-3 text-amber-400" />
            API
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAddBlock("file")}
            className="h-7 text-xs gap-1.5 bg-fd-background hover:border-amber-400/40 hover:text-amber-400 cursor-pointer"
          >
            <Paperclip className="h-3 w-3 text-amber-400" />
            File
          </Button>

          {onOpenCreateSubpage && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenCreateSubpage}
              className="h-7 text-xs gap-1.5 bg-fd-secondary/50 border-fd-border text-fd-foreground hover:border-amber-400/40 hover:text-amber-400 ml-1"
            >
              <FolderPlus className="h-3 w-3 text-amber-400" />
              Add Sub-page
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
