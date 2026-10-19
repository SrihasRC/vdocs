"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  Loader2,
  AlertCircle,
  RotateCw,
} from "lucide-react";

// Configure worker to use our local public worker bundle
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

interface PdfViewerProps {
  url: string;
  title?: string;
  onClose?: () => void;
}

export default function PdfViewer({ url, title }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(680);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Measure container width on window resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const available = Math.floor(rect.width) - 32;
        if (available > 200) {
          setContainerWidth((prev) => {
            if (Math.abs(prev - available) > 25) {
              return available;
            }
            return prev;
          });
        }
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const options = useMemo(
    () => ({
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
      withCredentials: true,
    }),
    []
  );

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      setErrorMessage(null);
    },
    []
  );

  const onDocumentLoadError = useCallback((err: Error) => {
    console.error("PDF load error:", err);
    setErrorMessage(err.message || "Failed to load PDF");
  }, []);

  const handlePrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setPageNumber((prev) => (numPages ? Math.min(prev + 1, numPages) : prev));
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(Number((prev + 0.15).toFixed(2)), 2.5));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(Number((prev - 0.15).toFixed(2)), 0.5));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleResetScale = () => {
    setScale(1.0);
  };

  return (
    <div
      ref={containerRef}
      className="w-full flex flex-col rounded-xl border border-fd-border/70 bg-neutral-950/80 overflow-hidden shadow-inner my-2"
    >
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-fd-border/50 bg-fd-secondary/30 text-xs">
        {/* Page navigation */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={pageNumber <= 1}
            title="Previous Page"
            className="p-1 rounded hover:bg-fd-secondary text-fd-muted-foreground hover:text-fd-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[11px] font-mono text-fd-foreground px-1 select-none">
            {numPages ? (
              <>
                <span className="text-amber-400 font-semibold">{pageNumber}</span> / {numPages}
              </>
            ) : (
              "-- / --"
            )}
          </span>
          <button
            type="button"
            onClick={handleNextPage}
            disabled={!numPages || pageNumber >= numPages}
            title="Next Page"
            className="p-1 rounded hover:bg-fd-secondary text-fd-muted-foreground hover:text-fd-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            title="Zoom Out"
            className="p-1 rounded hover:bg-fd-secondary text-fd-muted-foreground hover:text-fd-foreground disabled:opacity-30 transition-colors cursor-pointer"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetScale}
            title="Reset Zoom"
            className="px-1.5 py-0.5 text-[10px] font-mono rounded hover:bg-fd-secondary text-fd-muted-foreground hover:text-fd-foreground transition-colors cursor-pointer"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 2.5}
            title="Zoom In"
            className="p-1 rounded hover:bg-fd-secondary text-fd-muted-foreground hover:text-fd-foreground disabled:opacity-30 transition-colors cursor-pointer"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>

          <span className="w-px h-3.5 bg-fd-border/60 mx-1" />

          <button
            type="button"
            onClick={handleRotate}
            title="Rotate 90°"
            className="p-1 rounded hover:bg-fd-secondary text-fd-muted-foreground hover:text-fd-foreground transition-colors cursor-pointer"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in New Tab"
            className="p-1 rounded hover:bg-fd-secondary text-fd-muted-foreground hover:text-fd-foreground transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative min-h-[360px] max-h-[750px] overflow-auto flex items-start justify-center p-4 bg-neutral-900/60">
        {errorMessage ? (
          <div className="p-8 text-center max-w-sm space-y-3 m-auto">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 mb-1">
              <AlertCircle className="h-4 w-4" />
            </div>
            <p className="text-xs text-fd-muted-foreground">
              {errorMessage}
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-fd-border text-xs font-medium hover:bg-fd-secondary transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in Browser
            </a>
          </div>
        ) : (
          <Document
            file={url}
            options={options}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            suspense={false}
            loading={
              <div className="flex flex-col items-center justify-center p-12 text-xs text-fd-muted-foreground gap-2 m-auto">
                <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                <span>Loading PDF document...</span>
              </div>
            }
            error={
              <div className="p-8 text-center text-xs text-rose-400 m-auto">
                Could not display PDF document.
              </div>
            }
            className="flex justify-center max-w-full"
          >
            <Page
              pageNumber={pageNumber}
              width={containerWidth ? containerWidth * scale : undefined}
              rotate={rotation}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              suspense={false}
              loading={
                <div className="flex items-center justify-center p-8 text-xs text-fd-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                </div>
              }
              className="shadow-2xl rounded-sm overflow-hidden"
            />
          </Document>
        )}
      </div>
    </div>
  );
}
