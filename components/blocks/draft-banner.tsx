"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { togglePageStatus } from "@/app/actions/pages";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface DraftBannerProps {
  pageId: string;
  initialStatus: string;
}

export function DraftBanner({ pageId, initialStatus }: DraftBannerProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [isToggling, setIsToggling] = useState(false);

  if (status === "published") {
    return null;
  }

  const handlePublish = async () => {
    setIsToggling(true);
    const res = await togglePageStatus(pageId);
    setIsToggling(false);

    if (res.success && res.status) {
      setStatus(res.status);
      router.refresh();
    }
  };

  return (
    <div className="not-prose mb-6 flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
      <div className="flex items-center gap-2 min-w-0">
        <AlertCircle className="size-4 shrink-0 text-amber-400" />
        <span className="truncate">
          <strong>Draft Document</strong> — This page is unpublished and only visible to you.
        </span>
      </div>

      <Button
        type="button"
        size="sm"
        disabled={isToggling}
        onClick={handlePublish}
        className="shrink-0 h-7 px-3 text-xs cursor-pointer bg-amber-400 text-black hover:bg-amber-300 font-semibold gap-1.5 shadow-xs"
      >
        {isToggling ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <CheckCircle className="size-3" />
        )}
        Publish Now
      </Button>
    </div>
  );
}
