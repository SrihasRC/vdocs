"use client";

import { useState, useEffect, useTransition } from "react";
import {
  StorageSummary,
  getR2StorageSummary,
  initiateFileUpload,
  deleteFileAction,
  getFileDownloadUrl,
} from "@/app/actions/files";
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
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Plus,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StorageManagerViewProps {
  initialSummary?: StorageSummary | null;
}

export function StorageManagerView({ initialSummary }: StorageManagerViewProps) {
  const [summary, setSummary] = useState<StorageSummary | null>(initialSummary || null);
  const [loading, setLoading] = useState(!initialSummary);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterKind, setFilterKind] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    setUploadStatusMsg("Requesting presigned upload URL...");

    try {
      const tagsArray = uploadTags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const res = await initiateFileUpload({
        label: uploadLabel.trim(),
        kind: uploadKind,
        filename: uploadFile.name,
        mimeType: uploadFile.type || "application/octet-stream",
        sizeBytes: uploadFile.size,
        tags: tagsArray,
      });

      if (res.uploadUrl) {
        setUploadStatusMsg("Uploading binary directly to Cloudflare R2...");
        const uploadRes = await fetch(res.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": uploadFile.type || "application/octet-stream",
          },
          body: uploadFile,
        });

        if (!uploadRes.ok) {
          throw new Error(`R2 upload rejected with status ${uploadRes.status}`);
        }
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
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const r2Configured = summary?.r2Stats.configured ?? false;

  // Filter files
  const filteredFiles = (summary?.dbFiles || []).filter((f) => {
    const matchesKind = filterKind === "all" || f.kind === filterKind;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      f.label.toLowerCase().includes(q) ||
      f.storageKey.toLowerCase().includes(q) ||
      (f.tags || []).some((t) => t.toLowerCase().includes(q));
    return matchesKind && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-fd-border/70">
        <div>
          <div className="flex items-center gap-2.5">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-fd-foreground">
                Cloudflare R2 Storage & File Vault
              </h1>
              <p className="text-xs text-fd-muted-foreground">
                Direct S3-compatible private object storage with zero egress fees and automatic file versioning.
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
            <span>✓ Zero egress bandwidth fees</span>
          </p>
        </div>

        {/* Card 4: Categories Breakdown */}
        <div className="rounded-xl border border-fd-border bg-fd-card p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-xs text-fd-muted-foreground">
            <span className="font-medium">Vault Categories</span>
            <Paperclip className="size-4 text-amber-400" />
          </div>
          <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-fd-muted-foreground">
            <div>Resumes: <span className="text-fd-foreground font-semibold">{summary?.stats.resumesCount || 0}</span></div>
            <div>Certs: <span className="text-fd-foreground font-semibold">{summary?.stats.certificatesCount || 0}</span></div>
            <div>Photos: <span className="text-fd-foreground font-semibold">{summary?.stats.photosCount || 0}</span></div>
            <div>Other: <span className="text-fd-foreground font-semibold">{summary?.stats.otherCount || 0}</span></div>
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

      {/* Controls: Search & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Kind Filters */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-fd-secondary/30 border border-fd-border/70 overflow-x-auto">
          {[
            { id: "all", label: "All Files" },
            { id: "resume", label: "Resumes" },
            { id: "certificate", label: "Certificates" },
            { id: "photo", label: "Photos" },
            { id: "other", label: "Other" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterKind(tab.id)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap",
                filterKind === tab.id
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
            placeholder="Search by label, key, or tag..."
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
              <span>Upload First File</span>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-fd-border/70 bg-fd-secondary/30 text-fd-muted-foreground text-[11px]">
                  <th className="py-2.5 px-3.5 font-medium">File Label & Name</th>
                  <th className="py-2.5 px-3 font-medium">Category</th>
                  <th className="py-2.5 px-3 font-medium">Version</th>
                  <th className="py-2.5 px-3 font-medium">Size</th>
                  <th className="py-2.5 px-3 font-medium">Used in Pages</th>
                  <th className="py-2.5 px-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fd-border/40">
                {filteredFiles.map((file) => {
                  const isCurrent = file.isCurrent;
                  const getIcon = () => {
                    if (file.kind === "resume") return <FileText className="size-4 text-amber-400" />;
                    if (file.kind === "certificate") return <FileCheck className="size-4 text-emerald-400" />;
                    if (file.kind === "photo") return <Image className="size-4 text-sky-400" />;
                    return <Paperclip className="size-4 text-zinc-400" />;
                  };

                  return (
                    <tr key={file.id} className="hover:bg-fd-secondary/20 transition-colors group">
                      {/* Name & Key */}
                      <td className="py-3 px-3.5 align-middle">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 rounded-lg border border-fd-border/70 bg-fd-secondary/40 shrink-0">
                            {getIcon()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-fd-foreground block truncate">
                              {file.label}
                            </span>
                            <span className="font-mono text-[10px] text-fd-muted-foreground block truncate max-w-xs sm:max-w-sm">
                              {file.storageKey}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Kind */}
                      <td className="py-3 px-3 align-middle">
                        <span className="rounded-md border border-fd-border/70 bg-fd-secondary/40 px-2 py-0.5 text-[10px] font-mono text-fd-muted-foreground uppercase">
                          {file.kind}
                        </span>
                      </td>

                      {/* Version */}
                      <td className="py-3 px-3 align-middle">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-mono text-amber-400 font-semibold">
                            v{file.version}
                          </span>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                              <CheckCircle2 className="size-3" />
                              Current
                            </span>
                          )}
                        </div>
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

                      {/* Actions */}
                      <td className="py-3 px-3.5 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(file.id)}
                            className="h-7 w-7 text-fd-muted-foreground hover:text-amber-400 cursor-pointer"
                            title="Download file directly from Cloudflare R2"
                          >
                            <Download className="size-3.5" />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopy(file.id, file.id)}
                            className="h-7 w-7 text-fd-muted-foreground hover:text-fd-foreground cursor-pointer"
                            title="Copy File ID to embed in document blocks"
                          >
                            {copiedId === file.id ? (
                              <Check className="size-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget({ id: file.id, label: file.label, storageKey: file.storageKey })}
                            className="h-7 w-7 text-destructive hover:bg-destructive/10 cursor-pointer"
                            title="Delete file from R2 and database"
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
                <span className="text-[10px] text-fd-muted-foreground block">
                  Uploading a file with the same label and category automatically creates a new version (e.g. v2).
                </span>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-fd-muted-foreground">
                  Category
                </label>
                <select
                  value={uploadKind}
                  onChange={(e) => setUploadKind(e.target.value as any)}
                  className="w-full h-8 rounded-lg border border-fd-border bg-fd-background px-2.5 text-xs text-fd-foreground cursor-pointer"
                >
                  <option value="resume">Resume / CV</option>
                  <option value="certificate">Certificate / Diploma</option>
                  <option value="photo">Photo / Headshot</option>
                  <option value="other">Other Attachment</option>
                </select>
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-fd-muted-foreground">
                  Tags (comma-separated)
                </label>
                <Input
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="career, 2026, pdf"
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
        description={`This will permanently remove the file from your Cloudflare R2 bucket and database. Any document blocks referencing this file ID will no longer be able to download it.`}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
