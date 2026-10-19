"use client";

import { useState } from "react";
import { ApiBlock } from "@/lib/db/schema";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";
import {
  Globe,
  Terminal,
  Code2,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ApiBlockProps {
  block: ApiBlock;
}

const METHOD_STYLES: Record<string, { badge: string; border: string }> = {
  GET: {
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    border: "hover:border-emerald-500/40",
  },
  POST: {
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    border: "hover:border-blue-500/40",
  },
  PUT: {
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    border: "hover:border-amber-500/40",
  },
  PATCH: {
    badge: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    border: "hover:border-purple-500/40",
  },
  DELETE: {
    badge: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    border: "hover:border-rose-500/40",
  },
  OPTIONS: {
    badge: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
    border: "hover:border-zinc-500/40",
  },
  HEAD: {
    badge: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
    border: "hover:border-zinc-500/40",
  },
};

export function ApiBlockRenderer({ block }: ApiBlockProps) {
  const {
    method = "GET",
    endpoint = "/api",
    title,
    description,
    headers = [],
    params = [],
    requestBody,
    responseStatus = 200,
    responseBody,
  } = block.data;

  const blockAnchor = `block-${block.id}`;
  const methodStyle = METHOD_STYLES[method] || METHOD_STYLES.GET;
  const [curlCopied, setCurlCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "request" | "response" | "curl">(
    requestBody ? "request" : responseBody ? "response" : "details"
  );

  // Generate working cURL command
  const generateCurl = () => {
    let curl = `curl -X ${method} "${endpoint}"`;
    for (const h of headers) {
      if (h.key) {
        curl += ` \\\n  -H "${h.key}: ${h.value || ""}"`;
      }
    }
    if (requestBody && ["POST", "PUT", "PATCH"].includes(method)) {
      try {
        // Test if valid JSON to format single-line or clean
        const parsed = JSON.parse(requestBody);
        curl += ` \\\n  -d '${JSON.stringify(parsed)}'`;
      } catch {
        curl += ` \\\n  -d '${requestBody.replace(/'/g, "\\'")}'`;
      }
    }
    return curl;
  };

  const handleCopyCurl = async () => {
    try {
      await navigator.clipboard.writeText(generateCurl());
      setCurlCopied(true);
      setTimeout(() => setCurlCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy cURL:", err);
    }
  };

  const hasParams = params && params.length > 0;
  const hasHeaders = headers && headers.length > 0;
  const hasRequest = Boolean(requestBody);
  const hasResponse = Boolean(responseBody);

  const getStatusBadgeClass = (status: number) => {
    if (status >= 200 && status < 300) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    if (status >= 300 && status < 400) return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    if (status >= 400 && status < 500) return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    return "bg-rose-500/10 text-rose-400 border-rose-500/30";
  };

  return (
    <div
      id={blockAnchor}
      className={cn(
        "my-6 scroll-mt-20 not-prose rounded-xl border border-fd-border bg-fd-card overflow-hidden shadow-xs transition-colors",
        methodStyle.border
      )}
    >
      {/* Endpoint Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-fd-secondary/30 border-b border-fd-border/70">
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          {/* Method Pill */}
          <span
            className={cn(
              "font-mono text-xs font-bold px-2.5 py-1 rounded-md border tracking-wider",
              methodStyle.badge
            )}
          >
            {method}
          </span>

          {/* Endpoint Path */}
          <div className="flex items-center gap-1.5 font-mono text-xs font-medium text-fd-foreground bg-fd-background/80 px-2.5 py-1 rounded-md border border-fd-border/70 select-all max-w-full overflow-x-auto">
            <span>{endpoint}</span>
            <CopyButton text={endpoint} variant="ghost" size="icon" className="h-5 w-5 shrink-0 opacity-70 hover:opacity-100" />
          </div>

          {/* Optional Title */}
          {title && (
            <span className="text-xs font-semibold text-fd-foreground/90 hidden md:inline-block ml-1">
              — {title}
            </span>
          )}
        </div>

        {/* cURL copy quick button */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleCopyCurl}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-fd-border/70 bg-fd-background text-[11px] font-mono text-fd-muted-foreground hover:text-fd-foreground hover:border-amber-400/40 transition-colors cursor-pointer"
            title="Copy as cURL"
          >
            {curlCopied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied cURL!</span>
              </>
            ) : (
              <>
                <Terminal className="h-3 w-3 text-amber-400" />
                <span>cURL</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Description if present */}
      {description && (
        <div className="px-4 py-2.5 text-xs text-fd-muted-foreground border-b border-fd-border/40 bg-fd-background/40 leading-relaxed">
          {description}
        </div>
      )}

      {/* Segmented Navigation Tabs */}
      {(hasParams || hasHeaders || hasRequest || hasResponse) && (
        <div className="flex items-center gap-1 px-3 pt-2.5 border-b border-fd-border/60 bg-fd-secondary/10 overflow-x-auto">
          {(hasParams || hasHeaders) && (
            <button
              type="button"
              onClick={() => setActiveTab("details")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-t-md transition-colors cursor-pointer border-b-2 -mb-[1px]",
                activeTab === "details"
                  ? "border-amber-400 text-fd-foreground bg-fd-background font-semibold"
                  : "border-transparent text-fd-muted-foreground hover:text-fd-foreground"
              )}
            >
              Parameters & Headers
            </button>
          )}

          {hasRequest && (
            <button
              type="button"
              onClick={() => setActiveTab("request")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-t-md transition-colors cursor-pointer border-b-2 -mb-[1px]",
                activeTab === "request"
                  ? "border-amber-400 text-fd-foreground bg-fd-background font-semibold"
                  : "border-transparent text-fd-muted-foreground hover:text-fd-foreground"
              )}
            >
              Body Payload
            </button>
          )}

          {hasResponse && (
            <button
              type="button"
              onClick={() => setActiveTab("response")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-t-md transition-colors cursor-pointer border-b-2 -mb-[1px] flex items-center gap-1.5",
                activeTab === "response"
                  ? "border-amber-400 text-fd-foreground bg-fd-background font-semibold"
                  : "border-transparent text-fd-muted-foreground hover:text-fd-foreground"
              )}
            >
              <span>Response</span>
              <span className={cn("text-[10px] font-mono px-1 py-0.2 rounded border", getStatusBadgeClass(responseStatus))}>
                {responseStatus}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("curl")}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-t-md transition-colors cursor-pointer border-b-2 -mb-[1px] flex items-center gap-1",
              activeTab === "curl"
                ? "border-amber-400 text-fd-foreground bg-fd-background font-semibold"
                : "border-transparent text-fd-muted-foreground hover:text-fd-foreground"
            )}
          >
            <Terminal className="h-3 w-3 text-amber-400" />
            <span>cURL View</span>
          </button>
        </div>
      )}

      {/* Tab Contents */}
      <div className="p-3.5">
        {/* Tab 1: Parameters & Headers */}
        {activeTab === "details" && (
          <div className="space-y-4">
            {/* Parameters Table */}
            {hasParams && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-fd-foreground/90 uppercase tracking-wider text-[10px]">
                  Query / Path Parameters
                </span>
                <div className="overflow-x-auto rounded-lg border border-fd-border/70 bg-fd-background">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-fd-border/60 bg-fd-secondary/30 text-fd-muted-foreground text-[11px]">
                        <th className="py-2 px-3 font-medium">Parameter</th>
                        <th className="py-2 px-3 font-medium">Type / Example</th>
                        <th className="py-2 px-3 font-medium">Required</th>
                        <th className="py-2 px-3 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-fd-border/30">
                      {params.map((p, idx) => (
                        <tr key={idx} className="hover:bg-fd-secondary/15">
                          <td className="py-2 px-3 font-mono text-amber-400/90 font-medium">
                            {p.key}
                          </td>
                          <td className="py-2 px-3 font-mono text-fd-muted-foreground text-[11px]">
                            {p.value || "string"}
                          </td>
                          <td className="py-2 px-3">
                            {p.required ? (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-400 font-semibold">
                                Required
                              </span>
                            ) : (
                              <span className="text-[10px] text-fd-muted-foreground">Optional</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-fd-muted-foreground leading-relaxed">
                            {p.description || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Headers Table */}
            {hasHeaders && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-fd-foreground/90 uppercase tracking-wider text-[10px]">
                  Request Headers
                </span>
                <div className="overflow-x-auto rounded-lg border border-fd-border/70 bg-fd-background">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-fd-border/60 bg-fd-secondary/30 text-fd-muted-foreground text-[11px]">
                        <th className="py-2 px-3 font-medium">Header</th>
                        <th className="py-2 px-3 font-medium">Value</th>
                        <th className="py-2 px-3 font-medium">Required</th>
                        <th className="py-2 px-3 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-fd-border/30">
                      {headers.map((h, idx) => (
                        <tr key={idx} className="hover:bg-fd-secondary/15">
                          <td className="py-2 px-3 font-mono text-amber-400/90 font-medium">
                            {h.key}
                          </td>
                          <td className="py-2 px-3 font-mono text-fd-muted-foreground text-[11px]">
                            {h.value || "—"}
                          </td>
                          <td className="py-2 px-3">
                            {h.required ? (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-400 font-semibold">
                                Required
                              </span>
                            ) : (
                              <span className="text-[10px] text-fd-muted-foreground">Optional</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-fd-muted-foreground leading-relaxed">
                            {h.description || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Body Payload */}
        {activeTab === "request" && hasRequest && (
          <div className="relative rounded-lg border border-fd-border bg-[#0d0d0f] overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-fd-border/60 bg-[#121215]/80 text-xs text-fd-muted-foreground font-mono">
              <span className="text-[11px] text-fd-foreground/80">application/json</span>
              <CopyButton text={requestBody || ""} label="Copy JSON" variant="ghost" size="sm" />
            </div>
            <pre className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed text-fd-foreground bg-transparent m-0 select-text">
              <code>{requestBody}</code>
            </pre>
          </div>
        )}

        {/* Tab 3: Response */}
        {activeTab === "response" && hasResponse && (
          <div className="relative rounded-lg border border-fd-border bg-[#0d0d0f] overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-fd-border/60 bg-[#121215]/80 text-xs text-fd-muted-foreground font-mono">
              <div className="flex items-center gap-2">
                <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border font-semibold", getStatusBadgeClass(responseStatus))}>
                  {responseStatus}
                </span>
                <span className="text-[11px] text-fd-foreground/80">application/json</span>
              </div>
              <CopyButton text={responseBody || ""} label="Copy JSON" variant="ghost" size="sm" />
            </div>
            <pre className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed text-fd-foreground bg-transparent m-0 select-text">
              <code>{responseBody}</code>
            </pre>
          </div>
        )}

        {/* Tab 4: cURL Preview */}
        {activeTab === "curl" && (
          <div className="relative rounded-lg border border-fd-border bg-[#0d0d0f] overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-fd-border/60 bg-[#121215]/80 text-xs text-fd-muted-foreground font-mono">
              <div className="flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[11px] text-fd-foreground/80">cURL Example</span>
              </div>
              <CopyButton text={generateCurl()} label="Copy cURL" variant="ghost" size="sm" />
            </div>
            <pre className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed text-amber-300/90 bg-transparent m-0 select-text">
              <code>{generateCurl()}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
