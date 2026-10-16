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
          "fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-fd-border/80 bg-[#121214]/95 text-amber-400 shadow-xl backdrop-blur-md transition-all duration-200",
          "hover:border-amber-400/50 hover:bg-[#1a1a1d] hover:scale-105 hover:shadow-amber-500/10 active:scale-95 group",
          "focus:outline-none focus:ring-2 focus:ring-amber-400/40"
        )}
        title="Quick Capture (Alt + C)"
        aria-label="Quick Capture"
      >
        <Plus className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90 group-hover:text-amber-300" />
      </button>

      <QuickCaptureDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
