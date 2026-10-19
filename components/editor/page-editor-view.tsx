"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Block, Page } from "@/lib/db/schema";
import { BlockListRenderer } from "@/components/blocks/block-renderer";
import { ChildPagesGrid, ChildPageItem } from "@/components/blocks/child-pages-grid";
import { SortableBlock } from "./sortable-block";
import { AddBlockBar } from "./add-block-bar";
import { PageSettingsDialog } from "./page-settings-dialog";
import { CreatePageDialog } from "./create-page-dialog";
import { PromoteBlockDialog } from "./promote-block-dialog";
import { QuickCaptureDialog } from "@/components/quick-capture/quick-capture-dialog";
import { savePageBlocks, duplicatePage } from "@/app/actions/pages";
import { DraftBanner } from "@/components/blocks/draft-banner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Edit3,
  Check,
  Save,
  Settings,
  Loader2,
  Sparkles,
  Plus,
  ChevronDown,
  FilePlus,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PageEditorViewProps {
  page: Page;
  filesMap?: Record<string, any>;
  childPages?: ChildPageItem[];
}

export function PageEditorView({
  page,
  filesMap = {},
  childPages = [],
}: PageEditorViewProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>(page.blocks || []);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

  // Dialog states
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateSubpage, setShowCreateSubpage] = useState(false);
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [promotingBlock, setPromotingBlock] = useState<Block | null>(null);

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    const res = await duplicatePage(page.id);
    setIsDuplicating(false);
    if (res.success && res.newPath) {
      router.push(`/docs/${res.newPath}`);
      router.refresh();
    } else {
      alert(res.error || "Failed to duplicate page");
    }
  };

  // Global shortcut Alt + C for Quick Capture
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        setShowQuickCapture((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Document Status State (synced with PageSettingsDialog and DraftBanner)
  const [pageStatus, setPageStatus] = useState<string>(page.status || "published");

  // Determine if this is a top-level category landing page or a nested page
  const isCategoryRoot = !page.parentId && !page.path.includes("/");

  // Keep a ref to latest blocks for save callbacks
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Save blocks handler (silent by default for autosave, refreshes on explicit exit)
  const saveNow = useCallback(
    async (shouldRefresh = false) => {
      setIsSaving(true);
      const res = await savePageBlocks(page.id, blocksRef.current);
      setIsSaving(false);

      if (res.success) {
        setHasUnsavedChanges(false);
        setLastSavedTime(new Date());
        if (shouldRefresh) {
          router.refresh();
        }
      } else {
        console.error("Save error:", res.error);
      }
    },
    [page.id, router]
  );

  // Sync blocks state when server passes updated page props ONLY when NOT in edit mode
  useEffect(() => {
    if (!isEditing) {
      setBlocks(page.blocks);
      blocksRef.current = page.blocks;
    }
  }, [page.blocks, isEditing]);

  // When exiting edit mode, trigger a scroll event to notify TOC IntersectionObserver
  useEffect(() => {
    if (!isEditing) {
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event("scroll"));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isEditing]);

  // Debounced autosave when blocks change in edit mode (silent background save, keeps edit mode active)
  useEffect(() => {
    if (!hasUnsavedChanges || !isEditing) return;

    const timer = setTimeout(() => {
      saveNow(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, isEditing, saveNow]);

  // Handle explicit exit from edit mode
  const handleDone = useCallback(async () => {
    if (hasUnsavedChanges) {
      await saveNow(true);
    } else {
      router.refresh();
    }
    setIsEditing(false);
  }, [hasUnsavedChanges, saveNow, router]);

  // Global Keyboard Shortcuts (E to toggle, Esc to exit, Cmd+S to save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside an input, textarea, or contentEditable
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      // Cmd+S / Ctrl+S to save in place (stays in edit mode)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        if (isEditing) {
          e.preventDefault();
          saveNow(false);
        }
        return;
      }

      // Esc to exit edit mode
      if (e.key === "Escape" && isEditing) {
        if (!isInput) {
          e.preventDefault();
          handleDone();
        }
        return;
      }

      // E to toggle edit mode
      if (e.key.toLowerCase() === "e" && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (isEditing) {
          handleDone();
        } else {
          setIsEditing(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, saveNow, handleDone]);

  // Block Mutations
  const handleBlockChange = (updated: Block) => {
    setBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setHasUnsavedChanges(true);
  };

  const handleBlockDuplicate = (blockToDup: Block) => {
    const dup: Block = {
      ...blockToDup,
      id: `${blockToDup.type}-${Date.now()}`,
    };
    const index = blocks.findIndex((b) => b.id === blockToDup.id);
    const next = [...blocks];
    next.splice(index + 1, 0, dup);
    setBlocks(next);
    setHasUnsavedChanges(true);
  };

  const handleBlockDelete = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setHasUnsavedChanges(true);
  };

  const handleAddBlock = (type: Block["type"]) => {
    const id = `${type}-${Date.now()}`;
    let newBlock: Block;

    switch (type) {
      case "command":
        newBlock = {
          id,
          type: "command",
          data: {
            title: "New Command",
            command: "echo 'hello world'",
            shell: "bash",
            sudo: false,
            os: ["Linux"],
          },
        };
        break;
      case "steps":
        newBlock = {
          id,
          type: "steps",
          data: {
            title: "Numbered Steps",
            steps: [{ text: "First instruction", command: "" }],
          },
        };
        break;
      case "qa":
        newBlock = {
          id,
          type: "qa",
          data: {
            question: "Question prompt",
            short: "Key summary answer.",
            long: "Detailed explanation...",
          },
        };
        break;
      case "callout":
        newBlock = {
          id,
          type: "callout",
          data: {
            type: "info",
            title: "Important Note",
            content: "Write important context, warning, or tip here...",
          },
        };
        break;
      case "kv":
        newBlock = {
          id,
          type: "kv",
          data: {
            title: "Quick Reference",
            description: "Key-value reference table",
            rows: [
              { key: "PORT", value: "3000", description: "Default HTTP server port" },
              { key: "DEBUG", value: "true", description: "Enable verbose console logging" },
            ],
          },
        };
        break;
      case "api":
        newBlock = {
          id,
          type: "api",
          data: {
            method: "GET",
            endpoint: "/api/v1/resource",
            title: "API Endpoint",
            description: "Endpoint description and usage notes.",
            params: [
              { key: "id", value: "string", required: true, description: "Resource identifier" },
            ],
            headers: [
              { key: "Authorization", value: "Bearer <token>", required: true, description: "Bearer token" },
            ],
            requestBody: "",
            responseStatus: 200,
            responseBody: JSON.stringify({ status: "success", data: { id: "123" } }, null, 2),
          },
        };
        break;
      case "file":
        newBlock = {
          id,
          type: "file",
          data: {
            fileId: "",
            caption: "",
          },
        };
        break;
      case "note":
      default:
        newBlock = {
          id,
          type: "note",
          data: {
            title: "Notes",
            markdown: "Write notes here in markdown...",
          },
        };
        break;
    }

    setBlocks((prev) => [...prev, newBlock]);
    setHasUnsavedChanges(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setHasUnsavedChanges(true);
    }
  };

  return (
    <div className="relative">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-3 mb-6 pb-3 border-b border-fd-border/60">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              Editing Mode
            </div>
          ) : (
            <span className="text-xs text-fd-muted-foreground hidden sm:inline">
              Press <kbd className="font-mono text-[10px] border border-fd-border/70 bg-fd-secondary px-1 py-0.5 rounded">E</kbd> to edit
            </span>
          )}

          {isEditing && (
            <span className="text-xs text-fd-muted-foreground hidden sm:inline">
              {isSaving ? (
                <span className="inline-flex items-center gap-1 text-amber-400">
                  <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                </span>
              ) : hasUnsavedChanges ? (
                <span className="text-amber-400/90 font-medium">Unsaved changes (Cmd+S)</span>
              ) : lastSavedTime ? (
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <Check className="h-3 w-3" /> All changes saved
                </span>
              ) : null}
            </span>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="h-8 text-xs gap-1.5 rounded-lg border-fd-border bg-fd-secondary/30 hover:bg-fd-accent/60 text-fd-foreground font-medium cursor-pointer transition-colors"
                title="Page Settings & Export"
              >
                <Settings className="h-3.5 w-3.5 text-amber-400" />
                Settings
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => saveNow(false)}
                disabled={isSaving || !hasUnsavedChanges}
                className="h-8 text-xs gap-1.5 rounded-lg border-fd-border bg-fd-secondary/30 hover:bg-fd-accent/60 text-fd-foreground font-medium cursor-pointer transition-colors"
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5 text-amber-400" />
                )}
                Save
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleDone}
                className="h-8 text-xs bg-amber-400 text-black hover:bg-amber-300 font-semibold gap-1.5 rounded-lg cursor-pointer transition-colors shadow-xs"
              >
                <Check className="h-3.5 w-3.5" />
                Done (Esc)
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              {/* Quick Capture Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowQuickCapture(true)}
                className="h-8 w-8 p-0 rounded-lg border-fd-border bg-fd-secondary/30 hover:bg-fd-accent/60 text-fd-foreground hover:text-amber-400 transition-colors cursor-pointer"
                title="Quick Capture (Alt + C)"
                aria-label="Quick Capture"
              >
                <Plus className="h-4 w-4" />
              </Button>

              {/* Page Options Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Page Options"
                  className="inline-flex items-center h-8 px-2.5 text-xs gap-1.5 rounded-lg border border-fd-border bg-fd-secondary/30 hover:bg-fd-accent/60 text-fd-foreground font-medium transition-colors cursor-pointer select-none focus:outline-none"
                >
                  <Edit3 className="h-3.5 w-3.5 text-amber-400" />
                  <span>Edit</span>
                  <ChevronDown className="h-3 w-3 text-fd-muted-foreground ml-0.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={6}
                  className="w-48 p-1.5 bg-[#121214] border-fd-border text-fd-foreground shadow-xl rounded-xl"
                >
                  <DropdownMenuItem
                    onClick={() => setIsEditing(true)}
                    className="cursor-pointer gap-2.5 px-2.5 py-2 text-xs rounded-lg text-fd-foreground hover:bg-fd-accent/70 focus:bg-fd-accent/70 justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Edit3 className="size-3.5 text-amber-400" />
                      <span>Edit Mode</span>
                    </div>
                    <kbd className="font-mono text-[10px] text-fd-muted-foreground border border-fd-border/70 bg-fd-secondary px-1 py-0.5 rounded">E</kbd>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setShowCreateSubpage(true)}
                    className="cursor-pointer gap-2.5 px-2.5 py-2 text-xs rounded-lg text-fd-foreground hover:bg-fd-accent/70 focus:bg-fd-accent/70"
                  >
                    <FilePlus className="size-3.5 text-amber-400" />
                    <span>{isCategoryRoot ? "New Page..." : "Add Subpage..."}</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={handleDuplicate}
                    disabled={isDuplicating}
                    className="cursor-pointer gap-2.5 px-2.5 py-2 text-xs rounded-lg text-fd-foreground hover:bg-fd-accent/70 focus:bg-fd-accent/70"
                  >
                    {isDuplicating ? (
                      <Loader2 className="size-3.5 text-amber-400 animate-spin" />
                    ) : (
                      <Copy className="size-3.5 text-amber-400" />
                    )}
                    <span>Duplicate Page</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setShowSettings(true)}
                    className="cursor-pointer gap-2.5 px-2.5 py-2 text-xs rounded-lg text-fd-foreground hover:bg-fd-accent/70 focus:bg-fd-accent/70"
                  >
                    <Settings className="size-3.5 text-amber-400" />
                    <span>Page Settings...</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* Edit Mode View (Mounted only on client when editing to avoid DndDescribedBy SSR hydration mismatch) */}
      {isEditing && (
        <div className="space-y-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {blocks.map((block) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    onChange={handleBlockChange}
                    onDuplicate={handleBlockDuplicate}
                    onDelete={handleBlockDelete}
                    onPromote={(b) => setPromotingBlock(b)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Add Block Action Bar */}
          <AddBlockBar
            onAddBlock={handleAddBlock}
            onOpenCreateSubpage={() => setShowCreateSubpage(true)}
          />
        </div>
      )}

      {/* Read Mode View (Kept in DOM so IntersectionObserver stays connected) */}
      <div className={isEditing ? "hidden" : "block space-y-6"}>
        <DraftBanner
          pageId={page.id}
          status={pageStatus}
          onStatusChange={(newStatus) => {
            page.status = newStatus;
            setPageStatus(newStatus);
          }}
        />
        <BlockListRenderer blocks={blocks} files={filesMap} />
        {page.template === "index" && childPages.length > 0 && (
          <ChildPagesGrid childrenPages={childPages} />
        )}
      </div>

      {/* Page Settings & Metadata Dialog */}
      <PageSettingsDialog
        page={{
          id: page.id,
          title: page.title,
          path: page.path,
          template: page.template,
          tags: page.tags || [],
          status: pageStatus,
          parentId: page.parentId,
        }}
        open={showSettings}
        onOpenChange={setShowSettings}
        onSaved={(updatedTitle, updatedTags, updatedStatus) => {
          page.title = updatedTitle;
          page.tags = updatedTags;
          page.status = updatedStatus;
          setPageStatus(updatedStatus);
        }}
      />

      {/* Create Document / Sub-Page Dialog */}
      <CreatePageDialog
        parentId={isCategoryRoot ? null : page.id}
        parentPath={page.path}
        defaultCategory={isCategoryRoot ? page.path : page.path.split("/")[0] || ""}
        open={showCreateSubpage}
        onOpenChange={setShowCreateSubpage}
      />

      {/* Quick Capture Dialog */}
      <QuickCaptureDialog
        open={showQuickCapture}
        onOpenChange={setShowQuickCapture}
        defaultPageId={page.id}
      />

      {/* Promote / Move Block Dialog */}
      <PromoteBlockDialog
        open={Boolean(promotingBlock)}
        onOpenChange={(open) => !open && setPromotingBlock(null)}
        block={promotingBlock}
        sourcePageId={page.id}
        onTransferred={(blockId, removeSource) => {
          if (removeSource) {
            setBlocks((prev) => prev.filter((b) => b.id !== blockId));
            setHasUnsavedChanges(false);
          }
        }}
      />
    </div>
  );
}
