"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { createPage } from "@/app/actions/pages";
import { FolderPlus, Loader2 } from "lucide-react";

interface CreatePageDialogProps {
  parentId: string | null;
  parentPath?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePageDialog({
  parentId,
  parentPath = "",
  open,
  onOpenChange,
}: CreatePageDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [template, setTemplate] = useState("note");
  const [tagsStr, setTagsStr] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slug || slug === title.toLowerCase().replace(/[^a-z0-9]/g, "-")) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9-_]/g, "-")
          .replace(/-+/g, "-")
      );
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) return;

    setIsCreating(true);
    const tags = tagsStr
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const res = await createPage({
      parentId,
      title,
      slug,
      template,
      tags,
    });

    setIsCreating(false);
    if (res.success && res.page) {
      onOpenChange(false);
      setTitle("");
      setSlug("");
      setTagsStr("");
      const targetUrl = `/docs/${res.page.path}`.replace(/\/+/g, "/");
      router.refresh();
      router.push(targetUrl);
    } else {
      alert(res.error || "Failed to create page");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#111113] border-fd-border text-fd-foreground rounded-lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <FolderPlus className="h-4 w-4 text-amber-400" />
              Create Sub-page
            </DialogTitle>
            <DialogDescription className="text-xs text-fd-muted-foreground">
              Add a new document under {parentPath ? `/${parentPath}` : "root"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-fd-muted-foreground">
                Page Title
              </label>
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Pacman Keyring Troubleshooting"
                required
                className="h-8 text-xs bg-fd-background"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-fd-muted-foreground">
                Slug / URL segment
              </label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="pacman-keyring"
                required
                className="h-8 text-xs font-mono bg-fd-background"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-fd-muted-foreground">
                Template
              </label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full h-8 rounded-lg border border-fd-border bg-fd-background px-2.5 text-xs text-fd-foreground"
              >
                <option value="note">Free Note</option>
                <option value="command">Command Runbook</option>
                <option value="steps">Step-by-Step</option>
                <option value="qa">Q&A / Interview</option>
                <option value="index">Container / Index</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-fd-muted-foreground">
                Tags (comma-separated)
              </label>
              <Input
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                placeholder="system, troubleshooting"
                className="h-8 text-xs bg-fd-background"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-fd-border/40">
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
              disabled={isCreating}
              className="text-xs h-8 bg-amber-400 text-black hover:bg-amber-300 font-semibold gap-1.5 cursor-pointer"
            >
              {isCreating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create Page
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
