"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { useSpaciousLayout } from "@fumadocs/base-ui/layouts/spacious";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VaultBackupDialog } from "@/components/export/vault-backup-dialog";
import { Ellipsis, HardDrive, Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function CustomHeaderActions({ className, ...props }: React.ComponentProps<"div">) {
  const { menuItems } = useSpaciousLayout();
  const [backupOpen, setBackupOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const iconLinks = menuItems.filter((item) => item.type === "icon");

  return (
    <>
      <div
        className={cn("flex items-center gap-1 rounded-lg bg-fd-background", className)}
        {...props}
      >
        {/* External icon links (e.g. GitHub) */}
        {iconLinks.map((item, i) => (
          <a
            key={i}
            href={item.url}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noreferrer noopener" : undefined}
            aria-label={item.label}
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-fd-muted-foreground hover:bg-fd-accent/60 hover:text-fd-accent-foreground transition-colors max-lg:hidden"
          >
            {item.icon}
          </a>
        ))}

        {/* 3-dots Options Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Options"
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-fd-muted-foreground hover:bg-fd-accent/60 hover:text-fd-accent-foreground transition-colors focus:outline-none"
          >
            <Ellipsis className="size-4" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-56 p-1.5 bg-[#121214] border-fd-border text-fd-foreground shadow-xl rounded-xl"
          >
            {/* Vault Backup & Export */}
            <DropdownMenuItem
              onClick={() => setBackupOpen(true)}
              className="cursor-pointer gap-2.5 px-2.5 py-2 text-xs rounded-lg text-fd-foreground hover:bg-fd-accent/70 focus:bg-fd-accent/70"
            >
              <HardDrive className="size-3.5 text-amber-400" />
              <span>Vault Backup & Export</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1 bg-fd-border/60" />

            {/* Theme Switcher */}
            <div className="flex items-center justify-between px-2.5 py-1.5">
              <span className="text-xs text-fd-muted-foreground">Theme</span>
              <div className="flex items-center gap-0.5 rounded-full border border-fd-border/70 bg-fd-secondary/40 p-0.5">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={cn(
                    "cursor-pointer size-6 flex items-center justify-center rounded-full transition-colors",
                    theme === "light"
                      ? "bg-fd-background text-fd-foreground shadow-xs"
                      : "text-fd-muted-foreground hover:text-fd-foreground"
                  )}
                  title="Light"
                  aria-label="Light mode"
                >
                  <Sun className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={cn(
                    "cursor-pointer size-6 flex items-center justify-center rounded-full transition-colors",
                    theme === "dark"
                      ? "bg-fd-background text-fd-foreground shadow-xs"
                      : "text-fd-muted-foreground hover:text-fd-foreground"
                  )}
                  title="Dark"
                  aria-label="Dark mode"
                >
                  <Moon className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("system")}
                  className={cn(
                    "cursor-pointer size-6 flex items-center justify-center rounded-full transition-colors",
                    theme === "system"
                      ? "bg-fd-background text-fd-foreground shadow-xs"
                      : "text-fd-muted-foreground hover:text-fd-foreground"
                  )}
                  title="System"
                  aria-label="System mode"
                >
                  <Monitor className="size-3" />
                </button>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <VaultBackupDialog open={backupOpen} onOpenChange={setBackupOpen} />
    </>
  );
}
