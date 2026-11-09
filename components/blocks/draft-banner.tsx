"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "fumadocs-ui/components/banner";
import { togglePageStatus } from "@/app/actions/pages";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface DraftBannerProps {
  pageId: string;
  status: string;
  onStatusChange?: (newStatus: "published" | "draft") => void;
}

export function DraftBanner({
  pageId,
  status,
  onStatusChange,
}: DraftBannerProps) {
  const router = useRouter();
  const [isToggling, setIsToggling] = useState(false);

  if (status === "published") {
    return null;
  }

  const handlePublish = async () => {
    setIsToggling(true);
    const res = await togglePageStatus(pageId);
    setIsToggling(false);

    if (res.success && res.status) {
      onStatusChange?.(res.status as "published" | "draft");
      router.refresh();
    }
  };

  return (
    <div className="not-prose mb-6">
      <Banner
        changeLayout={false}
        variant="normal"
        className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-300 flex items-center justify-between gap-3 font-normal"
      >
        <div className="flex items-center gap-2 min-w-0">
          <AlertCircle className="size-4 shrink-0 text-amber-400" />
          <span className="truncate">
            <strong className="font-semibold text-amber-400">Work in Progress (WIP)</strong>
            <span className="opacity-90"> — This document is currently in progress.</span>
          </span>
        </div>

        <Button
          type="button"
          size="sm"
          disabled={isToggling}
          onClick={handlePublish}
          className="shrink-0 h-6 px-2.5 text-xs cursor-pointer bg-amber-400 text-black hover:bg-amber-300 active:bg-amber-500 font-semibold gap-1.5 shadow-xs shadow-amber-500/20 ring-1 ring-inset ring-amber-300/60 transition-all"
        >
          {isToggling ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <CheckCircle className="size-3" />
          )}
          Mark as Ready
        </Button>
      </Banner>
    </div>
  );
}
