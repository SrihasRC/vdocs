"use client";

import { useState } from "react";
import { HardDrive } from "lucide-react";
import { VaultBackupDialog } from "./vault-backup-dialog";

export function VaultBackupTrigger({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className || "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-accent/50 transition-colors"}
        title="Vault Backup & Export"
        aria-label="Vault Backup & Export"
      >
        <HardDrive className="h-4 w-4 text-amber-400/80" />
        <span className="hidden sm:inline">Backup</span>
      </button>

      <VaultBackupDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
