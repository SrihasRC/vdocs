"use client";

import { Block } from "@/lib/db/schema";
import { CommandBlockRenderer } from "./command-block";
import { StepsBlockRenderer } from "./steps-block";
import { QABlockRenderer } from "./qa-block";
import { NoteBlockRenderer } from "./note-block";
import { FileBlockRenderer } from "./file-block";
import { CalloutBlockRenderer } from "./callout-block";
import { KVBlockRenderer } from "./kv-block";
import { ApiBlockRenderer } from "./api-block";

interface BlockListRendererProps {
  blocks: Block[];
  files?: Record<string, any>;
}

export function BlockListRenderer({ blocks, files = {} }: BlockListRendererProps) {
  if (!blocks || blocks.length === 0) {
    return (
      <div className="my-8 rounded-xl border border-dashed border-fd-border/80 p-8 text-center text-sm text-fd-muted-foreground">
        This page has no content blocks yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {blocks.map((block) => {
        switch (block.type) {
          case "command":
            return <CommandBlockRenderer key={block.id} block={block} />;
          case "steps":
            return <StepsBlockRenderer key={block.id} block={block} />;
          case "qa":
            return <QABlockRenderer key={block.id} block={block} />;
          case "note":
            return <NoteBlockRenderer key={block.id} block={block} />;
          case "callout":
            return <CalloutBlockRenderer key={block.id} block={block} />;
          case "kv":
            return <KVBlockRenderer key={block.id} block={block} />;
          case "api":
            return <ApiBlockRenderer key={block.id} block={block} />;
          case "file":
            return (
              <FileBlockRenderer
                key={block.id}
                block={block}
                fileData={files[block.data.fileId]}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
