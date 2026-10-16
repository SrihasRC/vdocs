"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Terminal,
  HelpCircle,
  FileText,
  Loader2,
  Check,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { parseTerminalPaste, type SmartPasteResult } from "@/lib/smart-paste";
import {
  getCaptureTargets,
  quickCaptureBlock,
  type CaptureTarget,
} from "@/app/actions/capture";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface QuickCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPageId?: string;
}

export function QuickCaptureDialog({
  open,
  onOpenChange,
  defaultPageId,
}: QuickCaptureDialogProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"smart" | "command" | "qa" | "note">("smart");

  // Targets
  const [targets, setTargets] = useState<CaptureTarget[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [loadingTargets, setLoadingTargets] = useState(false);

  // Smart Paste State
  const [rawPaste, setRawPaste] = useState("");
  const [smartTitle, setSmartTitle] = useState("");
  const [smartFormat, setSmartFormat] = useState<"command" | "steps">("command");
  const [smartResult, setSmartResult] = useState<SmartPasteResult | null>(null);

  // Command State
  const [cmdTitle, setCmdTitle] = useState("");
  const [cmdText, setCmdText] = useState("");
  const [cmdShell, setCmdShell] = useState("bash");
  const [cmdSudo, setCmdSudo] = useState(false);
  const [cmdOs, setCmdOs] = useState<string[]>(["Linux"]);
  const [cmdDesc, setCmdDesc] = useState("");

  // QA State
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaShort, setQaShort] = useState("");
  const [qaLong, setQaLong] = useState("");

  // Note State
  const [noteTitle, setNoteTitle] = useState("");
  const [noteMarkdown, setNoteMarkdown] = useState("");

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{
    title: string;
    path: string;
  } | null>(null);

  // Load capture destinations when dialog opens
  useEffect(() => {
    if (!open) {
      setSuccessInfo(null);
      return;
    }

    async function load() {
      setLoadingTargets(true);
      try {
        const list = await getCaptureTargets();
        setTargets(list);
        if (defaultPageId && list.some((t) => t.id === defaultPageId)) {
          setSelectedTargetId(defaultPageId);
        } else if (list.length > 0) {
          setSelectedTargetId(list[0].id);
        }
      } catch (err) {
        console.error("Failed to load targets", err);
      } finally {
        setLoadingTargets(false);
      }
    }
    load();
  }, [open, defaultPageId]);

  // Handle Smart Paste Parsing
  const handleRawPasteChange = (val: string) => {
    setRawPaste(val);
    if (!val.trim()) {
      setSmartResult(null);
      return;
    }

    const parsed = parseTerminalPaste(val);
    setSmartResult(parsed);

    // Auto-suggest format: if multi-line with multiple steps or comments, suggest steps
    if (parsed.isMultiLine && parsed.parsedSteps.length > 1) {
      setSmartFormat("steps");
    } else {
      setSmartFormat("command");
    }

    if (!smartTitle) {
      // Suggest title from first command or comment
      const firstLine = val.trim().split("\n")[0].replace(/^#+\s*/, "").replace(/^(\$|>|❯|%)\s*/, "");
      setSmartTitle(firstLine.slice(0, 40));
    }
  };

  const handleCapture = async () => {
    setIsSubmitting(true);
    setSuccessInfo(null);

    let block: any = null;

    if (tab === "smart") {
      if (!rawPaste.trim()) return;
      const parsed = smartResult || parseTerminalPaste(rawPaste);

      if (smartFormat === "steps") {
        block = {
          id: `steps-${Date.now()}`,
          type: "steps",
          data: {
            title: smartTitle.trim() || "Terminal Runbook",
            steps: parsed.parsedSteps,
          },
        };
      } else {
        block = {
          id: `cmd-${Date.now()}`,
          type: "command",
          data: {
            title: smartTitle.trim() || "Captured Command",
            command: parsed.cleanCommand,
            shell: parsed.detectedShell,
            sudo: parsed.hasSudo,
            os: ["Linux"],
          },
        };
      }
    } else if (tab === "command") {
      if (!cmdTitle.trim() || !cmdText.trim()) return;
      block = {
        id: `cmd-${Date.now()}`,
        type: "command",
        data: {
          title: cmdTitle.trim(),
          command: cmdText.trim(),
          shell: cmdShell,
          sudo: cmdSudo,
          os: cmdOs,
          description: cmdDesc.trim() || undefined,
        },
      };
    } else if (tab === "qa") {
      if (!qaQuestion.trim()) return;
      block = {
        id: `qa-${Date.now()}`,
        type: "qa",
        data: {
          question: qaQuestion.trim(),
          short: qaShort.trim() || undefined,
          long: qaLong.trim() || undefined,
        },
      };
    } else if (tab === "note") {
      if (!noteMarkdown.trim()) return;
      block = {
        id: `note-${Date.now()}`,
        type: "note",
        data: {
          title: noteTitle.trim() || undefined,
          markdown: noteMarkdown.trim(),
        },
      };
    }

    if (!block) {
      setIsSubmitting(false);
      return;
    }

    const res = await quickCaptureBlock({
      targetPageId: selectedTargetId || undefined,
      block,
    });

    setIsSubmitting(false);

    if (res.success && res.targetPath) {
      setSuccessInfo({
        title: res.targetPageTitle || "Document",
        path: res.targetPath,
      });

      // Clear form fields
      setRawPaste("");
      setSmartTitle("");
      setCmdTitle("");
      setCmdText("");
      setQaQuestion("");
      setQaShort("");
      setQaLong("");
      setNoteTitle("");
      setNoteMarkdown("");

      router.refresh();
    } else {
      alert(res.error || "Failed to capture block");
    }
  };

  // Keyboard shortcut to submit: Cmd+Enter or Ctrl+Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleCapture();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onKeyDown={handleKeyDown}
        className="max-w-xl bg-[#111113] border-fd-border text-fd-foreground rounded-xl shadow-2xl p-0 overflow-hidden"
      >
        <DialogHeader className="p-4 pb-3 border-b border-fd-border/60">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Zap className="h-4 w-4 text-amber-400" />
              Quick Capture
            </DialogTitle>
            <span className="text-[11px] font-mono text-fd-muted-foreground mr-6">
              <kbd className="px-1 py-0.5 rounded border border-fd-border bg-fd-secondary/30">
                Cmd+Enter
              </kbd>{" "}
              to save
            </span>
          </div>
          <DialogDescription className="text-xs text-fd-muted-foreground">
            Instantly capture terminal snippets, Q&A answers, or notes into your vault.
          </DialogDescription>

          {/* Mode Tabs */}
          <div className="flex items-center gap-1 mt-3 p-1 rounded-lg bg-fd-secondary/30 border border-fd-border/70 w-fit">
            <button
              type="button"
              onClick={() => {
                setTab("smart");
                setSuccessInfo(null);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors",
                tab === "smart"
                  ? "bg-fd-background text-fd-foreground shadow-sm font-semibold"
                  : "text-fd-muted-foreground hover:text-fd-foreground"
              )}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Smart Paste
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("command");
                setSuccessInfo(null);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors",
                tab === "command"
                  ? "bg-fd-background text-fd-foreground shadow-sm font-semibold"
                  : "text-fd-muted-foreground hover:text-fd-foreground"
              )}
            >
              <Terminal className="h-3.5 w-3.5 text-amber-400" />
              Command
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("qa");
                setSuccessInfo(null);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors",
                tab === "qa"
                  ? "bg-fd-background text-fd-foreground shadow-sm font-semibold"
                  : "text-fd-muted-foreground hover:text-fd-foreground"
              )}
            >
              <HelpCircle className="h-3.5 w-3.5 text-amber-400" />
              Q&A
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("note");
                setSuccessInfo(null);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors",
                tab === "note"
                  ? "bg-fd-background text-fd-foreground shadow-sm font-semibold"
                  : "text-fd-muted-foreground hover:text-fd-foreground"
              )}
            >
              <FileText className="h-3.5 w-3.5 text-amber-400" />
              Note
            </button>
          </div>
        </DialogHeader>

        {/* Success Alert Banner */}
        {successInfo && (
          <div className="mx-4 mt-3 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between text-xs text-emerald-400">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>Captured successfully to <strong>{successInfo.title}</strong></span>
            </div>
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                router.push(`/docs/${successInfo.path}`.replace(/\/+/g, "/"));
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 hover:underline"
            >
              Open Page <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Tab Form Contents */}
        <div className="p-4 space-y-3.5 max-h-[60vh] overflow-y-auto">
          {tab === "smart" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-fd-muted-foreground flex items-center justify-between">
                  <span>Paste Terminal Output or Commands</span>
                  <span className="text-[11px] text-amber-400/80">
                    Auto-strips $ and # prompts
                  </span>
                </label>
                <Textarea
                  value={rawPaste}
                  onChange={(e) => handleRawPasteChange(e.target.value)}
                  placeholder={`$ sudo pacman -Syu\n# Clean package cache\n$ sudo pacman -Sc`}
                  className="font-mono text-xs h-28 bg-[#0d0d0f] border-fd-border resize-none"
                  autoFocus
                />
              </div>

              {rawPaste.trim() && smartResult && (
                <div className="p-3 rounded-lg border border-fd-border/70 bg-fd-secondary/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-fd-muted-foreground">
                      Detected Format
                    </span>
                    <div className="flex items-center gap-1 rounded border border-fd-border bg-fd-background p-0.5">
                      <button
                        type="button"
                        onClick={() => setSmartFormat("command")}
                        className={cn(
                          "px-2 py-0.5 text-[11px] rounded font-medium transition-colors",
                          smartFormat === "command"
                            ? "bg-amber-400 text-black font-semibold"
                            : "text-fd-muted-foreground hover:text-fd-foreground"
                        )}
                      >
                        Single Command
                      </button>
                      <button
                        type="button"
                        onClick={() => setSmartFormat("steps")}
                        className={cn(
                          "px-2 py-0.5 text-[11px] rounded font-medium transition-colors",
                          smartFormat === "steps"
                            ? "bg-amber-400 text-black font-semibold"
                            : "text-fd-muted-foreground hover:text-fd-foreground"
                        )}
                      >
                        Step-by-Step ({smartResult.parsedSteps.length} steps)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-fd-muted-foreground">
                      Title
                    </label>
                    <Input
                      value={smartTitle}
                      onChange={(e) => setSmartTitle(e.target.value)}
                      placeholder="e.g. System Update & Cache Clean"
                      className="h-8 text-xs bg-fd-background"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "command" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-fd-muted-foreground">
                  Command Title
                </label>
                <Input
                  value={cmdTitle}
                  onChange={(e) => setCmdTitle(e.target.value)}
                  placeholder="e.g. Restart Docker Daemon"
                  className="h-8 text-xs bg-fd-background"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-fd-muted-foreground">
                  Command Code
                </label>
                <Textarea
                  value={cmdText}
                  onChange={(e) => setCmdText(e.target.value)}
                  placeholder="systemctl restart docker"
                  className="font-mono text-xs h-20 bg-[#0d0d0f] border-fd-border resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-fd-muted-foreground">
                    Shell
                  </label>
                  <select
                    value={cmdShell}
                    onChange={(e) => setCmdShell(e.target.value)}
                    className="w-full h-8 rounded-md border border-fd-border bg-fd-background px-2.5 text-xs text-fd-foreground"
                  >
                    <option value="bash">bash</option>
                    <option value="zsh">zsh</option>
                    <option value="sh">sh</option>
                    <option value="powershell">powershell</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={cmdSudo}
                      onChange={(e) => setCmdSudo(e.target.checked)}
                      className="rounded border-fd-border accent-amber-400"
                    />
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                    <span>Requires Sudo</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-fd-muted-foreground">
                  Description / Note (optional)
                </label>
                <Input
                  value={cmdDesc}
                  onChange={(e) => setCmdDesc(e.target.value)}
                  placeholder="Use when containers fail to initialize"
                  className="h-8 text-xs bg-fd-background"
                />
              </div>
            </div>
          )}

          {tab === "qa" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-fd-muted-foreground">
                  Question
                </label>
                <Input
                  value={qaQuestion}
                  onChange={(e) => setQaQuestion(e.target.value)}
                  placeholder="e.g. Tell me about a challenging distributed bug you resolved"
                  className="h-8 text-xs bg-fd-background"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-fd-muted-foreground">
                  Short Answer (Quick Form / Elevator Pitch)
                </label>
                <Textarea
                  value={qaShort}
                  onChange={(e) => setQaShort(e.target.value)}
                  placeholder="Concise 1-2 sentence response..."
                  className="text-xs h-16 bg-[#0d0d0f] border-fd-border resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-fd-muted-foreground">
                  Long Answer (STAR Method / In-Depth)
                </label>
                <Textarea
                  value={qaLong}
                  onChange={(e) => setQaLong(e.target.value)}
                  placeholder="Detailed situation, task, action, and outcome..."
                  className="text-xs h-24 bg-[#0d0d0f] border-fd-border resize-none"
                />
              </div>
            </div>
          )}

          {tab === "note" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-fd-muted-foreground">
                  Note Title (optional)
                </label>
                <Input
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="e.g. Kubernetes Cluster Networking Architecture"
                  className="h-8 text-xs bg-fd-background"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-fd-muted-foreground">
                  Markdown Content
                </label>
                <Textarea
                  value={noteMarkdown}
                  onChange={(e) => setNoteMarkdown(e.target.value)}
                  placeholder="Write documentation notes in GitHub Flavored Markdown..."
                  className="font-mono text-xs h-32 bg-[#0d0d0f] border-fd-border resize-none"
                />
              </div>
            </div>
          )}

          {/* Destination Selector */}
          <div className="pt-3 border-t border-fd-border/60 flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-fd-muted-foreground shrink-0">
              Save To Page:
            </span>
            <select
              value={selectedTargetId}
              onChange={(e) => setSelectedTargetId(e.target.value)}
              disabled={loadingTargets}
              className="flex-1 h-8 rounded-md border border-fd-border bg-fd-background px-2.5 text-xs text-fd-foreground focus:outline-none focus:ring-1 focus:ring-fd-ring truncate"
            >
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.isInbox ? t.title : `${t.title} (/${t.path})`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter className="p-4 pt-3 border-t border-fd-border/60 bg-fd-card/40 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs text-fd-muted-foreground hover:text-fd-foreground"
          >
            Cancel (Esc)
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleCapture}
            disabled={isSubmitting}
            className="h-8 text-xs bg-amber-400 text-black hover:bg-amber-300 font-semibold gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            Capture & Save (Cmd+Enter)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
