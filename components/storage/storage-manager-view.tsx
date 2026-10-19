"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  StorageSummary,
  getR2StorageSummary,
  deleteFileAction,
  getFileDownloadUrl,
} from "@/app/actions/files";
import { FileRecord } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { cn } from "@/lib/utils";
import {
  Cloud,
  HardDrive,
  Upload,
  Download,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Search,
  FileText,
  FileCheck,
  Image,
  Paperclip,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Plus,
  Loader2,
  Eye,
  Link2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PdfViewer = dynamic(() => import("@/components/blocks/pdf-viewer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 rounded-xl border border-fd-border/70 bg-neutral-950/50 flex flex-col items-center justify-center text-xs text-fd-muted-foreground gap-2">
      <Loader2 className="size-5 animate-spin text-amber-400" />
      <span>Loading PDF preview...</span>
    </div>
  ),
});

type EnrichedFile = FileRecord & {
  referencedInPagesCount: number;
  pagesTitles: string[];
};

interface StorageManagerViewProps {
  initialSummary?: StorageSummary | null;
}

export function StorageManagerView({ initialSummary }: StorageManagerViewProps) {
  const [summary, setSummary] = useState<StorageSummary | null>(initialSummary || null);
  const [loading, setLoading] = useState(!initialSummary);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "pdf" | "image" | "unlinked">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // In-app preview modal state
  const [previewTarget, setPreviewTarget] = useState<EnrichedFile | null>(null);

  // Upload Dialog State
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadKind, setUploadKind] = useState<"resume" | "photo" | "certificate" | "other">("other");
  const [uploadTags, setUploadTags] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Delete Dialog State
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string; storageKey: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load / Refresh function
  const refreshStats = async () => {
    setLoading(true);
    try {
      const data = await getR2StorageSummary();
      setSummary(data);
    } catch (err) {
      console.error("Failed to load storage summary:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialSummary) {
      refreshStats();
    }
  }, [initialSummary]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    setUploadLabel(baseName.replace(/[-_]/g, " "));

    const lower = file.name.toLowerCase();
    if (lower.includes("resume") || lower.includes("cv")) {
      setUploadKind("resume");
    } else if (lower.includes("cert") || lower.includes("degree") || lower.includes("diploma")) {
      setUploadKind("certificate");
    } else if (file.type.startsWith("image/")) {
      setUploadKind("photo");
    } else {
      setUploadKind("other");
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadLabel.trim()) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadStatusMsg("Uploading binary directly to Cloudflare R2...");

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("label", uploadLabel.trim());
      formData.append("kind", uploadKind);
      formData.append("tags", uploadTags);

      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Upload failed with status ${res.status}`);
      }

      setUploadOpen(false);
      setUploadFile(null);
      setUploadLabel("");
      setUploadTags("");
      setUploadStatusMsg(null);
      await refreshStats();
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const success = await deleteFileAction(deleteTarget.id);
    setIsDeleting(false);
    setDeleteTarget(null);
    if (success) {
      if (previewTarget?.id === deleteTarget.id) {
        setPreviewTarget(null);
      }
      await refreshStats();
    } else {
      alert("Failed to delete file from storage.");
    }
  };

  const handleDownload = async (fileId: string) => {
    try {
      const res = await getFileDownloadUrl(fileId);
      if (res.url) {
        window.open(res.url, "_blank");
      } else {
        window.open(`/api/files/${fileId}`, "_blank");
      }
    } catch {
      window.open(`/api/files/${fileId}`, "_blank");
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const r2Configured = summary?.r2Stats.configured ?? false;
  const allDbFiles = summary?.dbFiles || [];

  // Filter counts
  const pdfCount = allDbFiles.filter(
    (f) => f.mimeType === "application/pdf" || f.storageKey.toLowerCase().endsWith(".pdf")
  ).length;
  const imageCount = allDbFiles.filter((f) => f.mimeType.startsWith("image/")).length;
  const unlinkedCount = allDbFiles.filter((f) => f.referencedInPagesCount === 0).length;
  const linkedCount = allDbFiles.filter((f) => f.referencedInPagesCount > 0).length;

  // Filter files
  const filteredFiles = allDbFiles.filter((f) => {
    let matchesType = true;
    if (filterType === "pdf") {
      matchesType = f.mimeType === "application/pdf" || f.storageKey.toLowerCase().endsWith(".pdf");
    } else if (filterType === "image") {
      matchesType = f.mimeType.startsWith("image/");
    } else if (filterType === "unlinked") {
      matchesType = f.referencedInPagesCount === 0;
    }

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      f.label.toLowerCase().includes(q) ||
      f.storageKey.toLowerCase().includes(q) ||
      (f.tags || []).some((t) => t.toLowerCase().includes(q));

    return matchesType && matchesSearch;
  });

  return (
    <div className="not-prose space-y-6 max-w-6xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-fd-border/70">
        <div>
          <div className="flex items-center gap-2.5">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-fd-foreground">
                Cloudflare R2 Storage & File Vault
              </h1>
              <p className="text-xs text-fd-muted-foreground">
                Direct S3-compatible private object storage with zero egress fees and inline browser viewing.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refreshStats}
            disabled={loading}
            className="h-8 text-xs gap-1.5 border-fd-border hover:bg-fd-secondary cursor-pointer"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            <span>Refresh</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setUploadOpen(true)}
            className="h-8 text-xs bg-amber-400 text-black hover:bg-amber-300 font-semibold gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="size-3.5" />
            <span>Upload File</span>
          </Button>
        </div>
      </div>

      {/* R2 Metric & Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        {/* Card 1: Connection Status */}
        <div className="rounded-xl border border-fd-border bg-fd-card p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-xs text-fd-muted-foreground">
            <span className="font-medium">R2 Connection</span>
            <ShieldCheck className="size-4 text-amber-400" />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "size-2.5 rounded-full shrink-0",
                r2Configured ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              )}
            />
            <span className="text-sm font-bold text-fd-foreground">
              {r2Configured ? "Connected & Active" : "Config Missing"}
            </span>
          </div>
          <div className="text-[11px] font-mono text-fd-muted-foreground truncate" title={summary?.r2Stats.bucket}>
            Bucket: <span className="text-amber-400/90">{summary?.r2Stats.bucket || "vdocs"}</span>
          </div>
        </div>

        {/* Card 2: Total Objects */}
        <div className="rounded-xl border border-fd-border bg-fd-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-xs text-fd-muted-foreground">
            <span className="font-medium">R2 Stored Objects</span>
            <HardDrive className="size-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-fd-foreground">
            {summary?.r2Stats.totalObjects ?? (summary?.stats.totalFiles || 0)}
          </div>
          <p className="text-[11px] text-fd-muted-foreground">
            {summary?.stats.totalFiles || 0} tracked in database
          </p>
        </div>

        {/* Card 3: Storage Size */}
        <div className="rounded-xl border border-fd-border bg-fd-card p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-xs text-fd-muted-foreground">
            <span className="font-medium">Storage Used</span>
            <Cloud className="size-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-fd-foreground">
            {formatSize(summary?.r2Stats.totalSizeBytes || summary?.stats.totalBytes || 0)}
          </div>
          <p className="text-[11px] text-emerald-400/90 flex items-center gap-1 font-medium">
            <span>Zero egress bandwidth fees</span>
          </p>
        </div>

        {/* Card 4: Vault Status */}
        <div className="rounded-xl border border-fd-border bg-fd-card p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-xs text-fd-muted-foreground">
            <span className="font-medium">Vault File Status</span>
            <Link2 className="size-4 text-amber-400" />
          </div>
          <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-fd-muted-foreground">
            <div>Linked: <span className="text-fd-foreground font-semibold">{linkedCount}</span></div>
            <div>Unlinked: <span className="text-amber-400 font-semibold">{unlinkedCount}</span></div>
            <div>PDFs: <span className="text-fd-foreground font-semibold">{pdfCount}</span></div>
            <div>Images: <span className="text-fd-foreground font-semibold">{imageCount}</span></div>
          </div>
        </div>
      </div>

      {/* R2 Notice if not configured */}
      {!r2Configured && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300 flex items-start gap-2.5">
          <AlertCircle className="size-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <strong className="font-semibold text-amber-400">R2 Environment Keys Required:</strong>
            <p>
              To enable direct uploads and signed downloads, ensure your <code className="bg-[#0f0f10] px-1.5 py-0.5 rounded text-amber-300 font-mono">.env.local</code> contains:{" "}
              <code className="text-amber-200 font-mono">R2_ACCOUNT_ID</code>, <code className="text-amber-200 font-mono">R2_ACCESS_KEY_ID</code>, <code className="text-amber-200 font-mono">R2_SECRET_ACCESS_KEY</code>, and <code className="text-amber-200 font-mono">R2_BUCKET_NAME</code>.
            </p>
          </div>
        </div>
      )}

      {/* Controls: Search & Format Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Format / Status Filters */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-fd-secondary/30 border border-fd-border/70 overflow-x-auto">
          {[
            { id: "all" as const, label: `All Files (${allDbFiles.length})` },
            { id: "pdf" as const, label: `PDFs (${pdfCount})` },
            { id: "image" as const, label: `Images (${imageCount})` },
            { id: "unlinked" as const, label: `Unlinked (${unlinkedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap",
                filterType === tab.id
                  ? "bg-fd-background text-fd-foreground shadow-xs border border-fd-border/60 font-semibold"
                  : "text-fd-muted-foreground hover:text-fd-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-fd-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by label or key..."
            className="pl-8 h-8 text-xs bg-fd-background"
          />
        </div>
      </div>

      {/* Files List / Table */}
      <div className="rounded-xl border border-fd-border bg-fd-card overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-fd-muted-foreground flex flex-col items-center justify-center gap-2">
            <Loader2 className="size-5 animate-spin text-amber-400" />
            <span>Loading storage files from Cloudflare R2...</span>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="p-12 text-center text-xs text-fd-muted-foreground space-y-3">
            <HardDrive className="size-8 mx-auto text-fd-muted-foreground/50" />
            <p className="text-sm font-medium text-fd-foreground">No files found</p>
            <p className="max-w-sm mx-auto">
              {searchQuery
                ? "No storage files match your current search criteria."
                : "Your Cloudflare R2 file vault is currently empty. Click 'Upload File' to add your first document."}
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => setUploadOpen(true)}
              className="h-8 text-xs bg-amber-400 text-black hover:bg-amber-300 font-semibold gap-1.5 cursor-pointer"
            >
              <Upload className="size-3.5" />
              <span>Upload File</span>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse m-0! my-0! p-0!" style={{ margin: 0, borderSpacing: 0 }}>
              <thead>
                <tr className="border-b border-fd-border/70 bg-fd-secondary/40 text-fd-muted-foreground text-[11px]">
                  <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-fd-muted-foreground">File Label & Name</th>
                  <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-fd-muted-foreground">Type</th>
                  <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-fd-muted-foreground">Size</th>
                  <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-fd-muted-foreground">Used in Pages</th>
                  <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-fd-muted-foreground">Uploaded</th>
                  <th className="py-2.5 px-4 font-semibold uppercase tracking-wider text-fd-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fd-border/40 bg-fd-card">
                {filteredFiles.map((file) => {
                  const isPdf = file.mimeType === "application/pdf" || file.storageKey.toLowerCase().endsWith(".pdf");
                  const isImage = file.mimeType.startsWith("image/");

                  const getIcon = () => {
                    if (isPdf) return <FileText className="size-4 text-amber-400" />;
                    if (isImage) return <Image className="size-4 text-sky-400" />;
                    return <Paperclip className="size-4 text-zinc-400" />;
                  };

                  return (
                    <tr key={file.id} className="hover:bg-fd-secondary/20 transition-colors group">
                      {/* Name & Key (clickable to view in browser) */}
                      <td className="py-3 px-4 align-middle">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 rounded-lg border border-fd-border/70 bg-fd-secondary/40 shrink-0">
                            {getIcon()}
                          </div>
                          <div className="min-w-0">
                            <a
                              href={`/api/files/${file.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-fd-foreground hover:text-amber-400 transition-colors block truncate hover:underline"
                              title="Click to view file in browser tab"
                            >
                              {file.label}
                            </a>
                            <span className="font-mono text-[10px] text-fd-muted-foreground block truncate max-w-xs sm:max-w-sm">
                              {file.storageKey}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3 px-3 align-middle font-mono text-fd-muted-foreground text-[11px]">
                        {file.mimeType ? file.mimeType.split("/")[1] || file.mimeType : "file"}
                      </td>

                      {/* Size */}
                      <td className="py-3 px-3 align-middle font-mono text-fd-muted-foreground text-[11px]">
                        {formatSize(file.sizeBytes)}
                      </td>

                      {/* Used In */}
                      <td className="py-3 px-3 align-middle">
                        {file.referencedInPagesCount > 0 ? (
                          <span
                            className="text-[11px] text-amber-400/90 font-medium cursor-help"
                            title={`Referenced in: ${file.pagesTitles.join(", ")}`}
                          >
                            {file.referencedInPagesCount} page{file.referencedInPagesCount > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-[11px] text-fd-muted-foreground/60 italic">
                            Unlinked
                          </span>
                        )}
                      </td>

                      {/* Uploaded Date */}
                      <td className="py-3 px-3 align-middle font-mono text-fd-muted-foreground text-[11px] whitespace-nowrap">
                        {file.createdAt
                          ? new Date(file.createdAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick Preview Modal Button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setPreviewTarget(file)}
                            className="h-7 w-7 text-fd-muted-foreground hover:text-amber-400 cursor-pointer"
                            title="Quick preview without leaving page"
                          >
                            <Eye className="size-3.5" />
                          </Button>

                          {/* Open in Browser Tab */}
                          <a
                            href={`/api/files/${file.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-fd-muted-foreground hover:text-amber-400 hover:bg-fd-secondary transition-colors"
                            title="Open in new browser tab"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>

                          {/* Download */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(file.id)}
                            className="h-7 w-7 text-fd-muted-foreground hover:text-amber-400 cursor-pointer"
                            title="Download file"
                          >
                            <Download className="size-3.5" />
                          </Button>

                          {/* Copy File ID */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopy(file.id, file.id)}
                            className="h-7 w-7 text-fd-muted-foreground hover:text-fd-foreground cursor-pointer"
                            title="Copy File ID to clipboard"
                          >
                            {copiedId === file.id ? (
                              <Check className="size-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                          </Button>

                          {/* Delete */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setDeleteTarget({
                                id: file.id,
                                label: file.label,
                                storageKey: file.storageKey,
                              })
                            }
                            className="h-7 w-7 text-destructive hover:bg-destructive/10 cursor-pointer"
                            title="Delete file from storage"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Preview Modal */}
      <Dialog
        open={Boolean(previewTarget)}
        onOpenChange={(open) => !open && setPreviewTarget(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] bg-[#111113] border-fd-border text-fd-foreground rounded-xl p-5 shadow-2xl flex flex-col">
          {previewTarget && (
            <>
              <DialogHeader className="pb-3 border-b border-fd-border/60">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <DialogTitle className="text-base font-semibold truncate text-fd-foreground">
                      {previewTarget.label}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-fd-muted-foreground font-mono flex items-center gap-2 mt-0.5">
                      <span>{previewTarget.storageKey}</span>
                      <span>•</span>
                      <span>{formatSize(previewTarget.sizeBytes)}</span>
                      <span>•</span>
                      <span className="uppercase text-[10px]">
                        {previewTarget.mimeType ? previewTarget.mimeType.split("/")[1] || previewTarget.mimeType : "file"}
                      </span>
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 pr-6">
                    <a
                      href={`/api/files/${previewTarget.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-fd-secondary hover:bg-fd-accent text-fd-foreground border border-fd-border font-medium transition-colors"
                    >
                      <ExternalLink className="size-3.5" />
                      <span>Open in Browser</span>
                    </a>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(previewTarget.id)}
                      className="h-7 text-xs gap-1 border-fd-border hover:bg-fd-secondary cursor-pointer"
                    >
                      <Download className="size-3.5" />
                      <span>Download</span>
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto py-4 min-h-[350px]">
                {previewTarget.mimeType === "application/pdf" ||
                previewTarget.storageKey.toLowerCase().endsWith(".pdf") ? (
                  <PdfViewer
                    url={`/api/files/${previewTarget.id}`}
                    title={previewTarget.label}
                  />
                ) : previewTarget.mimeType.startsWith("image/") ? (
                  <div className="flex items-center justify-center p-4 bg-neutral-950/70 rounded-xl border border-fd-border/60 min-h-[360px]">
                    <img
                      src={`/api/files/${previewTarget.id}`}
                      alt={previewTarget.label}
                      className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain shadow-md"
                    />
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-fd-muted-foreground space-y-3 bg-neutral-950/40 rounded-xl border border-fd-border/60">
                    <p className="text-sm font-medium text-fd-foreground">
                      Direct preview is not supported for this file format
                    </p>
                    <p className="text-xs">MIME Type: {previewTarget.mimeType}</p>
                    <a
                      href={`/api/files/${previewTarget.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 text-black font-semibold text-xs hover:bg-amber-300 transition-colors"
                    >
                      <ExternalLink className="size-3.5" />
                      <span>Open in Browser</span>
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md bg-[#111113] border-fd-border text-fd-foreground rounded-xl p-5 shadow-2xl">
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                <Upload className="size-4 text-amber-400" />
                Upload to Cloudflare R2
              </DialogTitle>
              <DialogDescription className="text-xs text-fd-muted-foreground">
                Files are streamed directly to your private R2 bucket using secure presigned URLs.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-1">
              {/* File Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-fd-muted-foreground">
                  Select File
                </label>
                <input
                  type="file"
                  required
                  onChange={handleFilePicked}
                  className="w-full text-xs text-fd-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-fd-border file:text-xs file:font-semibold file:bg-fd-secondary file:text-fd-foreground hover:file:bg-fd-accent/60 cursor-pointer"
                />
              </div>

              {/* Label */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-fd-muted-foreground">
                  File Label
                </label>
                <Input
                  value={uploadLabel}
                  onChange={(e) => setUploadLabel(e.target.value)}
                  placeholder="e.g. Master Software Engineer Resume"
                  required
                  className="h-8 text-xs bg-fd-background"
                />
              </div>

              {/* Document Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-fd-muted-foreground">
                  Document Type
                </label>
                <select
                  value={uploadKind}
                  onChange={(e) => setUploadKind(e.target.value as any)}
                  className="w-full h-8 rounded-lg border border-fd-border bg-fd-background px-2.5 text-xs text-fd-foreground cursor-pointer"
                >
                  <option value="resume">Resume / CV</option>
                  <option value="certificate">Certificate / Diploma</option>
                  <option value="photo">Photo / Image</option>
                  <option value="other">General Attachment</option>
                </select>
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-fd-muted-foreground">
                  Tags (optional, comma-separated)
                </label>
                <Input
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="career, 2026, tech"
                  className="h-8 text-xs bg-fd-background"
                />
              </div>
            </div>

            {uploadStatusMsg && (
              <div className="p-2.5 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin shrink-0 text-amber-400" />
                <span>{uploadStatusMsg}</span>
              </div>
            )}

            {uploadError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {uploadError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-fd-border/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUploadOpen(false)}
                disabled={isUploading}
                className="text-xs h-8 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isUploading || !uploadFile || !uploadLabel.trim()}
                className="text-xs h-8 bg-amber-400 text-black hover:bg-amber-300 font-semibold gap-1.5 cursor-pointer shadow-xs"
              >
                {isUploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Upload className="size-3.5" />
                )}
                Upload to R2
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget?.label || "this file"}
        description="This will permanently remove the file from your Cloudflare R2 bucket and database. Any document blocks referencing this file ID will no longer be able to download or display it."
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
