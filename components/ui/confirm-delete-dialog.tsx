"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  isDeleting?: boolean;
  onConfirm: () => void;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description = "This action cannot be undone. Any child pages under this document will also be removed.",
  isDeleting = false,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw] bg-[#111113] border-fd-border text-fd-foreground rounded-xl p-5 shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-4 shrink-0 text-red-400" />
            <DialogTitle className="text-base font-semibold text-fd-foreground">
              Delete &quot;{title}&quot;?
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-fd-muted-foreground leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-fd-border/40 mt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
            className="text-xs h-8 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isDeleting}
            onClick={onConfirm}
            className="text-xs h-8 font-medium gap-1.5 cursor-pointer bg-red-600 hover:bg-red-700 text-white shadow-xs"
          >
            {isDeleting && <Loader2 className="size-3.5 animate-spin" />}
            Delete Document
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
