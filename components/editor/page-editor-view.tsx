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
import { savePageBlocks } from "@/app/actions/pages";
import { Button } from "@/components/ui/button";
import {
  Edit3,
  Check,
  Save,
  Settings,
  Loader2,
  Sparkles,
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

  // Save blocks handler
  const saveNow = useCallback(async () => {
    setIsSaving(true);
    const res = await savePageBlocks(page.id, blocksRef.current);
    setIsSaving(false);

    if (res.success) {
      setHasUnsavedChanges(false);
      setLastSavedTime(new Date());
      router.refresh();
    } else {
      console.error("Save error:", res.error);
    }
  }, [page.id, router]);

  // Debounced autosave when blocks change in edit mode
  useEffect(() => {
    if (!hasUnsavedChanges || !isEditing) return;

    const timer = setTimeout(() => {
      saveNow();
    }, 2500);

    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, isEditing, saveNow]);

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

      // Cmd+S / Ctrl+S to save
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        if (isEditing) {
          e.preventDefault();
          saveNow();
        }
        return;
      }

      // Esc to exit edit mode
      if (e.key === "Escape" && isEditing) {
        if (!isInput) {
          e.preventDefault();
          if (hasUnsavedChanges) {
            saveNow();
          }
          setIsEditing(false);
        }
        return;
      }

      // E to toggle edit mode
      if (e.key.toLowerCase() === "e" && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsEditing((prev) => {
          if (prev && hasUnsavedChanges) {
            saveNow();
          }
          return !prev;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, hasUnsavedChanges, saveNow]);

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
      case "file":
        newBlock = {
          id,
          type: "file",
          data: {
            fileId: "file-id",
            caption: "Download attachment",
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
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="h-8 text-xs gap-1.5 text-fd-muted-foreground hover:text-fd-foreground"
              >
                <Settings className="h-3.5 w-3.5" />
                Settings
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={saveNow}
                disabled={isSaving || !hasUnsavedChanges}
                className="h-8 text-xs gap-1.5"
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
                onClick={() => {
                  if (hasUnsavedChanges) saveNow();
                  setIsEditing(false);
                }}
                className="h-8 text-xs bg-amber-400 text-black hover:bg-amber-300 font-semibold gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                Done (Esc)
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 text-xs gap-1.5 hover:border-amber-400/40 hover:text-amber-400 transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5 text-amber-400" />
              Edit Page (E)
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area: Swaps between Read & Edit mode */}
      {isEditing ? (
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
      ) : (
        <div>
          <BlockListRenderer blocks={blocks} files={filesMap} />
          <ChildPagesGrid childrenPages={childPages} />
        </div>
      )}

      {/* Page Settings & Metadata Dialog */}
      <PageSettingsDialog
        page={{
          id: page.id,
          title: page.title,
          path: page.path,
          template: page.template,
          tags: page.tags || [],
          status: page.status,
        }}
        open={showSettings}
        onOpenChange={setShowSettings}
        onSaved={(updatedTitle, updatedTags) => {
          // Update in-page reflection
          page.title = updatedTitle;
          page.tags = updatedTags;
        }}
      />

      {/* Create Sub-Page Dialog */}
      <CreatePageDialog
        parentId={page.id}
        parentPath={page.path}
        open={showCreateSubpage}
        onOpenChange={setShowCreateSubpage}
      />
    </div>
  );
}
