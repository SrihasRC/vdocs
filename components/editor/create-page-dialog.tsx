"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createPage, getVaultCategories } from "@/app/actions/pages";
import { FilePlus, Loader2 } from "lucide-react";

interface CreatePageDialogProps {
  parentId?: string | null;
  parentPath?: string;
  defaultCategory?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePageDialog({
  parentId = null,
  parentPath = "",
  defaultCategory = "",
  open,
  onOpenChange,
}: CreatePageDialogProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<{ label: string; slug: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [template, setTemplate] = useState("note");
  const [tagsStr, setTagsStr] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Sync default category when prop changes
  useEffect(() => {
    if (defaultCategory) {
      setSelectedCategory(defaultCategory);
    } else if (parentPath) {
      const firstSegment = parentPath.split("/")[0];
      setSelectedCategory(firstSegment || "");
    }
  }, [defaultCategory, parentPath, open]);

  // Load vault categories when dialog opens
  useEffect(() => {
    if (open) {
      getVaultCategories().then((res) => {
        if (res.success && res.categories) {
          setCategories(res.categories);
        }
      });
    }
  }, [open]);

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

    // If explicit parentId is set (sub-page of existing document), use parentId
    // Otherwise, create under selected category as top-level page
    const res = await createPage({
      parentId: parentId || null,
      category: parentId ? "" : selectedCategory,
      title: title.trim(),
      slug: slug.trim(),
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

  // Preview path
  const previewPath = parentId && parentPath
    ? `/docs/${parentPath}/${slug || "..."}`
    : selectedCategory
    ? `/docs/${selectedCategory}/${slug || "..."}`
    : `/docs/${slug || "..."}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw] bg-[#111113] border-fd-border text-fd-foreground rounded-xl p-5 shadow-2xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <FilePlus className="h-4 w-4 text-amber-400" />
              {parentId ? "Create Sub-page" : "Create New Document"}
            </DialogTitle>
            <DialogDescription className="text-xs text-fd-muted-foreground">
              {parentId
                ? `Add a child document under /${parentPath}.`
                : "Add a document to your knowledge base."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {/* Category Selector (only when not creating a subpage under a specific parent) */}
            {!parentId && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-fd-muted-foreground">
                  Category Section
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-8 rounded-lg border border-fd-border bg-fd-background px-2.5 text-xs text-fd-foreground cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>
                      {cat.label} {cat.slug ? `(/${cat.slug})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-fd-muted-foreground">
                Document Title
              </label>
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Docker Compose Cheatsheet"
                required
                className="h-8 text-xs bg-fd-background"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-fd-muted-foreground">
                URL Slug
              </label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="docker-compose"
                required
                className="h-8 text-xs font-mono bg-fd-background"
              />
              <span className="text-[11px] text-fd-muted-foreground/80 font-mono block truncate">
                Will be available at: <strong className="text-amber-400/90 font-mono">{previewPath}</strong>
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-fd-muted-foreground">
                Template
              </label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full h-8 rounded-lg border border-fd-border bg-fd-background px-2.5 text-xs text-fd-foreground cursor-pointer"
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
                placeholder="docker, devops, cheatsheet"
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
              className="text-xs h-8 bg-amber-400 text-black hover:bg-amber-300 font-semibold gap-1.5 cursor-pointer shadow-xs"
            >
              {isCreating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create Document
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
