"use client";

import { useState } from "react";
import { ApiBlock } from "@/lib/db/schema";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Globe,
  Plus,
  Trash2,
  Sparkles,
  Terminal,
} from "lucide-react";

interface ApiEditorProps {
  block: ApiBlock;
  onChange: (updated: ApiBlock) => void;
}

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"] as const;

export function ApiEditor({ block, onChange }: ApiEditorProps) {
  const {
    method = "GET",
    endpoint = "/api",
    title = "",
    description = "",
    headers = [],
    params = [],
    requestBody = "",
    responseStatus = 200,
    responseBody = "",
  } = block.data;

  const [activeTab, setActiveTab] = useState<"params" | "headers" | "request" | "response">("params");

  const update = (partial: Partial<ApiBlock["data"]>) => {
    onChange({
      ...block,
      data: {
        ...block.data,
        ...partial,
      },
    });
  };

  // Param Helpers
  const handleAddParam = () => {
    update({
      params: [...params, { key: "", value: "", required: false, description: "" }],
    });
  };

  const handleRemoveParam = (index: number) => {
    update({ params: params.filter((_, i) => i !== index) });
  };

  const handleParamChange = (index: number, field: string, value: any) => {
    const next = [...params];
    next[index] = { ...next[index], [field]: value };
    update({ params: next });
  };

  // Header Helpers
  const handleAddHeader = (key = "", value = "") => {
    update({
      headers: [...headers, { key, value, required: false, description: "" }],
    });
  };

  const handleRemoveHeader = (index: number) => {
    update({ headers: headers.filter((_, i) => i !== index) });
  };

  const handleHeaderChange = (index: number, field: string, value: any) => {
    const next = [...headers];
    next[index] = { ...next[index], [field]: value };
    update({ headers: next });
  };

  // JSON Formatting Helper
  const formatJson = (field: "requestBody" | "responseBody") => {
    const text = field === "requestBody" ? requestBody : responseBody;
    if (!text) return;
    try {
      const parsed = JSON.parse(text);
      update({ [field]: JSON.stringify(parsed, null, 2) });
    } catch {
      // Ignore if not valid JSON
    }
  };

  return (
    <div className="space-y-4 p-3.5">
      {/* Top Method + Endpoint Line */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="w-full sm:w-36 shrink-0 space-y-1">
          <label className="text-xs font-medium text-fd-muted-foreground flex items-center gap-1.5">
            <Globe className="h-3 w-3 text-amber-400" />
            Method
          </label>
          <select
            value={method}
            onChange={(e) => update({ method: e.target.value as any })}
            className="w-full h-8 rounded-lg border border-fd-border bg-fd-background px-2.5 text-xs font-mono font-bold text-fd-foreground focus:outline-none focus:ring-1 focus:ring-amber-400"
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium text-fd-muted-foreground">
            Endpoint Path
          </label>
          <Input
            value={endpoint}
            onChange={(e) => update({ endpoint: e.target.value })}
            placeholder="e.g. /api/v1/users/:id"
            className="h-8 text-xs font-mono bg-fd-background"
          />
        </div>
      </div>

      {/* Title & Description */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-fd-muted-foreground">
            Endpoint Title (Optional)
          </label>
          <Input
            value={title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="e.g. Fetch Current User Profile"
            className="h-8 text-xs bg-fd-background"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-fd-muted-foreground">
            Description / Summary (Optional)
          </label>
          <Input
            value={description}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="e.g. Returns authentication context and profile info"
            className="h-8 text-xs bg-fd-background"
          />
        </div>
      </div>

      {/* Details Navigation Bar */}
      <div className="border rounded-lg border-fd-border/70 overflow-hidden bg-fd-secondary/10">
        <div className="flex items-center gap-1 p-1.5 border-b border-fd-border/60 bg-fd-secondary/20">
          <button
            type="button"
            onClick={() => setActiveTab("params")}
            className={cn(
              "px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer",
              activeTab === "params"
                ? "bg-fd-background text-fd-foreground shadow-xs border border-fd-border/60"
                : "text-fd-muted-foreground hover:text-fd-foreground"
            )}
          >
            Parameters ({params.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("headers")}
            className={cn(
              "px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer",
              activeTab === "headers"
                ? "bg-fd-background text-fd-foreground shadow-xs border border-fd-border/60"
                : "text-fd-muted-foreground hover:text-fd-foreground"
            )}
          >
            Headers ({headers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("request")}
            className={cn(
              "px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer",
              activeTab === "request"
                ? "bg-fd-background text-fd-foreground shadow-xs border border-fd-border/60"
                : "text-fd-muted-foreground hover:text-fd-foreground"
            )}
          >
            Request Body {requestBody ? "•" : ""}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("response")}
            className={cn(
              "px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer",
              activeTab === "response"
                ? "bg-fd-background text-fd-foreground shadow-xs border border-fd-border/60"
                : "text-fd-muted-foreground hover:text-fd-foreground"
            )}
          >
            Response ({responseStatus}) {responseBody ? "•" : ""}
          </button>
        </div>

        {/* Tab 1: Parameters */}
        {activeTab === "params" && (
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-fd-muted-foreground">
                Path or Query Parameters
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddParam}
                className="h-6 text-xs gap-1 text-amber-400 border-amber-400/30 hover:bg-amber-400/10 cursor-pointer"
              >
                <Plus className="size-3" />
                Add Parameter
              </Button>
            </div>

            {params.length === 0 ? (
              <div className="rounded-lg border border-dashed border-fd-border/60 p-4 text-center text-xs text-fd-muted-foreground">
                No parameters added. Click &quot;Add Parameter&quot; to define query or URL parameters.
              </div>
            ) : (
              <div className="space-y-2">
                {params.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded-lg border border-fd-border/60 bg-fd-background"
                  >
                    <div className="w-1/4">
                      <Input
                        value={p.key}
                        onChange={(e) => handleParamChange(idx, "key", e.target.value)}
                        placeholder="Name (e.g. id)"
                        className="h-7 text-xs font-mono"
                      />
                    </div>
                    <div className="w-1/4">
                      <Input
                        value={p.value}
                        onChange={(e) => handleParamChange(idx, "value", e.target.value)}
                        placeholder="Type/Example"
                        className="h-7 text-xs font-mono"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        value={p.description || ""}
                        onChange={(e) => handleParamChange(idx, "description", e.target.value)}
                        placeholder="Description"
                        className="h-7 text-xs"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-fd-muted-foreground cursor-pointer select-none px-1">
                      <input
                        type="checkbox"
                        checked={p.required}
                        onChange={(e) => handleParamChange(idx, "required", e.target.checked)}
                        className="rounded border-fd-border accent-amber-400"
                      />
                      <span className="text-[11px]">Req</span>
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveParam(idx)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Headers */}
        {activeTab === "headers" && (
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-fd-muted-foreground">
                  HTTP Headers
                </span>
                <button
                  type="button"
                  onClick={() => handleAddHeader("Authorization", "Bearer <token>")}
                  className="text-[10px] px-1.5 py-0.5 rounded border border-fd-border bg-fd-secondary text-fd-muted-foreground hover:text-fd-foreground cursor-pointer"
                >
                  + Auth Bearer
                </button>
                <button
                  type="button"
                  onClick={() => handleAddHeader("Content-Type", "application/json")}
                  className="text-[10px] px-1.5 py-0.5 rounded border border-fd-border bg-fd-secondary text-fd-muted-foreground hover:text-fd-foreground cursor-pointer"
                >
                  + Content-Type JSON
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddHeader()}
                className="h-6 text-xs gap-1 text-amber-400 border-amber-400/30 hover:bg-amber-400/10 cursor-pointer"
              >
                <Plus className="size-3" />
                Add Header
              </Button>
            </div>

            {headers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-fd-border/60 p-4 text-center text-xs text-fd-muted-foreground">
                No headers defined. Click &quot;Add Header&quot; or one of the quick presets above.
              </div>
            ) : (
              <div className="space-y-2">
                {headers.map((h, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded-lg border border-fd-border/60 bg-fd-background"
                  >
                    <div className="w-1/3">
                      <Input
                        value={h.key}
                        onChange={(e) => handleHeaderChange(idx, "key", e.target.value)}
                        placeholder="Header Name"
                        className="h-7 text-xs font-mono"
                      />
                    </div>
                    <div className="w-1/3">
                      <Input
                        value={h.value}
                        onChange={(e) => handleHeaderChange(idx, "value", e.target.value)}
                        placeholder="Value / Format"
                        className="h-7 text-xs font-mono"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        value={h.description || ""}
                        onChange={(e) => handleHeaderChange(idx, "description", e.target.value)}
                        placeholder="Description"
                        className="h-7 text-xs"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-fd-muted-foreground cursor-pointer select-none px-1">
                      <input
                        type="checkbox"
                        checked={h.required}
                        onChange={(e) => handleHeaderChange(idx, "required", e.target.checked)}
                        className="rounded border-fd-border accent-amber-400"
                      />
                      <span className="text-[11px]">Req</span>
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveHeader(idx)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Request Body */}
        {activeTab === "request" && (
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-fd-muted-foreground">
                Request Body (JSON format)
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => formatJson("requestBody")}
                disabled={!requestBody}
                className="h-6 text-xs gap-1 text-fd-muted-foreground hover:text-amber-400 cursor-pointer"
              >
                <Sparkles className="size-3" />
                Format JSON
              </Button>
            </div>
            <Textarea
              value={requestBody}
              onChange={(e) => update({ requestBody: e.target.value })}
              placeholder={`{\n  "email": "user@example.com",\n  "role": "admin"\n}`}
              rows={6}
              className="font-mono text-xs bg-fd-background resize-y"
            />
          </div>
        )}

        {/* Tab 4: Response */}
        {activeTab === "response" && (
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-fd-muted-foreground">Status Code:</span>
                <Input
                  type="number"
                  value={responseStatus}
                  onChange={(e) => update({ responseStatus: parseInt(e.target.value) || 200 })}
                  className="h-7 w-20 text-xs font-mono bg-fd-background"
                />
                <div className="flex items-center gap-1">
                  {[200, 201, 204, 400, 404].map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => update({ responseStatus: code })}
                      className={cn(
                        "text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors cursor-pointer",
                        responseStatus === code
                          ? "border-amber-400 bg-amber-400/10 text-amber-400 font-bold"
                          : "border-fd-border bg-fd-secondary text-fd-muted-foreground hover:text-fd-foreground"
                      )}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => formatJson("responseBody")}
                disabled={!responseBody}
                className="h-6 text-xs gap-1 text-fd-muted-foreground hover:text-amber-400 cursor-pointer"
              >
                <Sparkles className="size-3" />
                Format JSON
              </Button>
            </div>

            <Textarea
              value={responseBody}
              onChange={(e) => update({ responseBody: e.target.value })}
              placeholder={`{\n  "status": "success",\n  "data": {\n    "id": "usr_123",\n    "name": "Jane Doe"\n  }\n}`}
              rows={6}
              className="font-mono text-xs bg-fd-background resize-y"
            />
          </div>
        )}
      </div>
    </div>
  );
}
