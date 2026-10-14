"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  className?: string;
  label?: string;
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "icon" | "default";
}

export function CopyButton({
  text,
  className,
  label,
  variant = "ghost",
  size = label ? "sm" : "icon",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label || "Copy to clipboard"}
      className={cn(
        "relative inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-fd-ring disabled:pointer-events-none disabled:opacity-50",
        variant === "ghost" &&
          "text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground",
        variant === "outline" &&
          "border border-fd-border bg-fd-secondary/30 text-fd-foreground hover:bg-fd-secondary/60 hover:border-fd-primary/30",
        size === "icon" && "h-7 w-7 p-0",
        size === "sm" && "h-7 px-2.5 py-1",
        size === "default" && "h-8 px-3 py-1.5",
        copied && "text-amber-400 border-amber-500/40",
        className
      )}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-amber-400 animate-in zoom-in-50 duration-200" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-fd-muted-foreground" />
      )}
      {label && (
        <span className={copied ? "text-amber-400" : ""}>
          {copied ? "Copied!" : label}
        </span>
      )}
    </button>
  );
}
