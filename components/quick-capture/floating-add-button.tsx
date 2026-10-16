"use client";

import { useState, useEffect } from "react";
import { Plus, Zap } from "lucide-react";
import { QuickCaptureDialog } from "./quick-capture-dialog";
import { cn } from "@/lib/utils";

export function FloatingAddButton() {
  const [open, setOpen] = useState(false);

  // Global Keyboard Shortcut: Alt + C or Cmd+Shift+A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + C
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      // Cmd+Shift+A / Ctrl+Shift+A
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-9 max-sm:bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] max-sm:right-4 z-40 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-fd-border bg-[#131315] text-amber-400 shadow-lg transition-all duration-150",
          "hover:bg-[#1a1a1d] hover:border-fd-border/80 hover:text-amber-300 active:scale-95 group",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
        )}
        title="Quick Capture (Alt + C)"
        aria-label="Quick Capture"
      >
        <Plus className="h-5 w-5 transition-transform duration-150 group-hover:rotate-90" />
      </button>

      <QuickCaptureDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
