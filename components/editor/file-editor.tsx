"use client";

import { useState, useEffect } from "react";
import { FileBlock, FileRecord } from "@/lib/db/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getFilesList,
  initiateFileUpload,
} from "@/app/actions/files";
import {
  FileText,
  Upload,
  Check,
  Loader2,
  FileUp,
  Tag,
  AlertCircle,
} from "lucide-react";

interface FileEditorProps {
  block: FileBlock;
  onChange: (updated: FileBlock) => void;
}

export function FileEditor({ block, onChange }: FileEditorProps) {
  const { fileId, caption } = block.data;

  const [tab, setTab] = useState<"select" | "upload">("select");
  const [existingFiles, setExistingFiles] = useState<FileRecord[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadKind, setUploadKind] = useState<
    "resume" | "photo" | "certificate" | "other"
  >("other");
  const [uploadTags, setUploadTags] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoadingFiles(true);
      try {
        const list = await getFilesList();
        setExistingFiles(list);
      } catch (err) {
        console.error("Failed to load files", err);
      } finally {
        setLoadingFiles(false);
      }
    }
    load();
  }, []);

  const update = (partial: Partial<FileBlock["data"]>) => {
    onChange({
      ...block,
      data: {
        ...block.data,
        ...partial,
      },
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    // Suggest label by removing extension
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    setUploadLabel(baseName.replace(/[-_]/g, " "));

    // Auto-guess kind
    const lower = file.name.toLowerCase();
    if (lower.includes("resume") || lower.includes("cv")) {
      setUploadKind("resume");
    } else if (
      lower.includes("cert") ||
      lower.includes("degree") ||
      lower.includes("diploma")
    ) {
      setUploadKind("certificate");
    } else if (file.type.startsWith("image/")) {
      setUploadKind("photo");
    } else {
      setUploadKind("other");
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile || !uploadLabel.trim()) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadMessage("Uploading to Cloudflare R2...");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
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

      // Automatically select this uploaded file
      update({ fileId: data.file.id });
      setExistingFiles((prev) => [data.file, ...prev]);
      setTab("select");
      setSelectedFile(null);
      setUploadLabel("");
      setUploadTags("");
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const selectedFileRecord = existingFiles.find((f) => f.id === fileId);

  return (
    <div className="space-y-4 p-4">
      {/* Mode Switcher */}
      <div className="flex items-center gap-1.5 p-1 rounded-lg bg-fd-secondary/30 border border-fd-border/70 w-fit">
        <button
          type="button"
          onClick={() => setTab("select")}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            tab === "select"
              ? "bg-fd-background text-fd-foreground shadow-sm"
              : "text-fd-muted-foreground hover:text-fd-foreground"
          }`}
        >
          Select from Vault
        </button>
        <button
          type="button"
          onClick={() => setTab("upload")}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            tab === "upload"
              ? "bg-fd-background text-fd-foreground shadow-sm"
              : "text-fd-muted-foreground hover:text-fd-foreground"
          }`}
        >
          Upload New File
        </button>
      </div>

      {tab === "select" ? (
        <div className="space-y-3">
          <label className="text-xs font-medium text-fd-muted-foreground block">
            Choose an uploaded document or file:
          </label>

          {loadingFiles ? (
            <div className="flex items-center justify-center p-6 text-xs text-fd-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading vault files...
            </div>
          ) : existingFiles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-fd-border p-5 text-center text-xs text-fd-muted-foreground">
              <p>No files uploaded to the vault yet.</p>
              <button
                type="button"
                onClick={() => setTab("upload")}
                className="mt-2 text-amber-400 hover:underline"
              >
                Upload your first file &rarr;
              </button>
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {existingFiles.map((f) => {
                const isSelected = f.id === fileId;
                const sizeKb = Math.round(f.sizeBytes / 1024);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => update({ fileId: f.id })}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? "border-amber-400/50 bg-amber-400/10 text-fd-foreground font-medium"
                        : "border-fd-border/70 hover:border-fd-border bg-fd-background text-fd-muted-foreground hover:text-fd-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText
                        className={`h-4 w-4 shrink-0 ${
                          isSelected ? "text-amber-400" : "text-fd-muted-foreground"
                        }`}
                      />
                      <div className="min-w-0 truncate">
                        <span className="font-medium text-fd-foreground">
                          {f.label}
                        </span>
                        <span className="ml-2 text-[10px] text-fd-muted-foreground font-mono">
                          • {sizeKb} KB
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-amber-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Manual ID Input Fallback */}
          <div className="pt-2 border-t border-fd-border/40">
            <label className="text-[11px] font-medium text-fd-muted-foreground">
              Or manually enter File ID / Key:
            </label>
            <Input
              value={fileId}
              onChange={(e) => update({ fileId: e.target.value })}
              placeholder="e.g. 1a2b3c4d-..."
              className="mt-1 h-8 text-xs font-mono bg-fd-background"
            />
          </div>
        </div>
      ) : (
        /* Upload Form */
        <div className="space-y-3.5 rounded-lg border border-fd-border bg-fd-card/40 p-3.5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-fd-muted-foreground">
              Select Local File
            </label>
            <input
              type="file"
              onChange={handleFileSelect}
              className="block w-full text-xs text-fd-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-fd-border file:text-xs file:font-medium file:bg-fd-secondary/40 file:text-fd-foreground hover:file:bg-fd-secondary cursor-pointer"
            />
          </div>

          {selectedFile && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-fd-muted-foreground">
                  File Label (e.g. Resume, AWS Solutions Architect Cert)
                </label>
                <Input
                  value={uploadLabel}
                  onChange={(e) => setUploadLabel(e.target.value)}
                  placeholder="e.g. Software Engineer Resume"
                  className="h-8 text-xs bg-fd-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-fd-muted-foreground">
                    Document Category
                  </label>
                  <select
                    value={uploadKind}
                    onChange={(e: any) => setUploadKind(e.target.value)}
                    className="w-full h-8 rounded-md border border-fd-border bg-fd-background px-2.5 text-xs text-fd-foreground focus:outline-none focus:ring-1 focus:ring-fd-ring"
                  >
                    <option value="resume">Resume / CV</option>
                    <option value="certificate">Certificate</option>
                    <option value="photo">Photo / Identity</option>
                    <option value="other">Other Document</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-fd-muted-foreground">
                    Tags (comma separated)
                  </label>
                  <Input
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    placeholder="resume, 2026, tech"
                    className="h-8 text-xs bg-fd-background"
                  />
                </div>
              </div>

              <div className="pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleUploadSubmit}
                  disabled={isUploading || !uploadLabel.trim()}
                  className="h-8 text-xs bg-amber-400 text-black hover:bg-amber-300 active:bg-amber-500 font-semibold gap-1.5 shadow-xs shadow-amber-500/20 ring-1 ring-inset ring-amber-300/60 transition-all cursor-pointer"
                >
                  {isUploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileUp className="h-3.5 w-3.5" />
                  )}
                  Upload & Attach to Block
                </Button>
              </div>

              {uploadMessage && (
                <p className="text-xs text-amber-400 font-mono mt-1">
                  {uploadMessage}
                </p>
              )}

              {uploadError && (
                <div className="p-2 rounded border border-rose-500/30 bg-rose-500/10 text-xs text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {uploadError}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Caption Field */}
      <div className="space-y-1.5 pt-2 border-t border-fd-border/40">
        <label className="text-xs font-medium text-fd-muted-foreground">
          Caption / Download Note (optional)
        </label>
        <Input
          value={caption || ""}
          onChange={(e) => update({ caption: e.target.value })}
          placeholder="e.g. Official single-page PDF version for software engineering applications"
          className="h-8 text-xs bg-fd-background"
        />
      </div>
    </div>
  );
}
