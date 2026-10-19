"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Block } from "@/lib/db/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getVaultCategories, promoteBlockToPage } from "@/app/actions/pages";
import { ArrowUpRight, FileUp, Loader2 } from "lucide-react";

interface PromoteBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: Block | null;
  sourcePageId: string;
}

function getDefaultTitle(block: Block | null): string {
  if (!block) return "";
  switch (block.type) {
    case "command":
      return block.data.title || "Runbook Command";
    case "qa":
      return block.data.question || "Q&A Topic";
    case "note":
      return block.data.title || "Note Topic";
    case "steps":
      return block.data.title || "Step-by-Step Guide";
    case "callout":
      return block.data.title || "Important Notice";
    case "kv":
      return block.data.title || "Cheatsheet Reference";
    case "file":
      return block.data.caption || "Attachment";
    default:
      return "New Document";
  }
}

export function PromoteBlockDialog({
  open,
  onOpenChange,
  block,
  sourcePageId,
}: PromoteBlockDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("commands");
  const [removeSource, setRemoveSource] = useState(true);
  const [isPromoting, setIsPromoting] = useState(false);
  const [categories, setCategories] = useState<{ label: string; slug: string }[]>([]);

  useEffect(() => {
    if (open && block) {
      setTitle(getDefaultTitle(block));
      getVaultCategories().then((res) => {
        if (res.success && res.categories) {
          setCategories(res.categories);
        }
      });
    }
  }, [open, block]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!block || !title.trim()) return;

    setIsPromoting(true);
    const res = await promoteBlockToPage({
      sourcePageId,
      block,
      title: title.trim(),
      category,
      removeSourceBlock: removeSource,
    });
    setIsPromoting(false);

    if (res.success && res.newPath) {
      onOpenChange(false);
      router.push(`/docs/${res.newPath}`);
      router.refresh();
    } else {
      alert(res.error || "Failed to promote block to new document");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#111113] border-fd-border text-fd-foreground rounded-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <FileUp className="h-4 w-4 text-amber-400" />
              Promote Block to New Document
            </DialogTitle>
            <DialogDescription className="text-xs text-fd-muted-foreground">
              Extract this content block into its own dedicated page in your vault.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-fd-muted-foreground">
                Document Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Docker Container Cleanup"
                required
                className="h-8 text-xs bg-fd-background"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-fd-muted-foreground">
                Target Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-8 rounded-lg border border-fd-border bg-fd-background px-2.5 text-xs text-fd-foreground focus:outline-none focus:ring-1 focus:ring-amber-400"
              >
                {categories.length > 0 ? (
                  categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.label} {c.slug ? `(/docs/${c.slug})` : "(/docs)"}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="commands">Commands (/docs/commands)</option>
                    <option value="applications">Applications (/docs/applications)</option>
                    <option value="">Vault Root (/docs)</option>
                  </>
                )}
              </select>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 text-xs text-fd-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={removeSource}
                  onChange={(e) => setRemoveSource(e.target.checked)}
                  className="rounded border-fd-border accent-amber-400"
                />
                <span>Remove block from current document after promoting</span>
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-fd-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPromoting || !title.trim()}
              className="text-xs h-8 bg-amber-400 text-black hover:bg-amber-300 font-semibold gap-1.5 cursor-pointer"
            >
              {isPromoting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowUpRight className="h-3.5 w-3.5" />
              )}
              Create & Open Document
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
