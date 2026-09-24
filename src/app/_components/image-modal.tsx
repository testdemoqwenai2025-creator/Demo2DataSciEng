"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, ZoomIn } from "lucide-react";

/**
 * ImageModal — reusable click-to-popup image component.
 *
 * Features:
 *   - Inline modal: click thumbnail → animated overlay with full image
 *   - Open in new tab: button to open full-size image in a new browser tab
 *   - Keyboard: Esc closes, click outside closes
 *   - Lazy-loaded (next/image would be ideal, but we use <img> for static exports)
 *
 * Usage:
 *   <ImageModal src="/images/genetics/dna-helix.png" alt="DNA helix" caption="..." />
 */

interface ImageModalProps {
  src: string;
  alt: string;
  caption?: string;
  /** Thumbnail width in px (default 280) */
  thumbWidth?: number;
  /** Show "Open in new tab" button (default true) */
  allowNewTab?: boolean;
  /** Float thumbnail (default false — block layout) */
  float?: "left" | "right" | undefined;
}

/**
 * Prefix image src with basePath for GitHub Pages deployment.
 *
 * Next.js <Link> and <Image> auto-prefix with basePath, but raw <img> tags
 * do NOT. This helper ensures /images/... becomes /DemoAppDataSci/images/...
 * when deployed to GitHub Pages.
 */
function withBasePath(src: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  // Only prefix absolute paths (start with /) — relative paths pass through
  if (src.startsWith("/") && basePath) {
    return `${basePath}${src}`;
  }
  return src;
}

export function ImageModal({
  src,
  alt,
  caption,
  thumbWidth = 280,
  allowNewTab = true,
  float,
}: ImageModalProps) {
  const [open, setOpen] = useState(false);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    // Lock scroll
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open]);

  const openInNewTab = useCallback(() => {
    window.open(withBasePath(src), "_blank", "noopener,noreferrer");
  }, [src]);

  const floatStyle = float === "left"
    ? { float: "left", marginRight: "1rem", marginBottom: "0.5rem" }
    : float === "right"
    ? { float: "right", marginLeft: "1rem", marginBottom: "0.5rem" }
    : {};

  return (
    <>
      {/* Thumbnail — clickable */}
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        className="relative group rounded-md overflow-hidden border border-border/60 hover:border-primary/60 transition-colors shadow-sm"
        style={{ width: thumbWidth, ...floatStyle }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={withBasePath(src)}
          alt={alt}
          width={thumbWidth}
          className="w-full h-auto block"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileHover={{ opacity: 1, scale: 1 }}
            className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-full p-2 border border-border"
          >
            <ZoomIn className="h-4 w-4 text-primary" />
          </motion.div>
        </div>
      </motion.button>

      {/* Inline modal overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
            onClick={() => setOpen(false)}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/80 border border-border hover:bg-accent transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Open in new tab button */}
            {allowNewTab && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openInNewTab();
                }}
                className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-background/80 border border-border hover:bg-accent transition-colors text-xs font-medium flex items-center gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in new tab
              </button>
            )}

            {/* Image */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="relative max-w-[95vw] max-h-[90vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={withBasePath(src)}
                alt={alt}
                className="max-w-full max-h-[80vh] object-contain rounded-lg border-2 border-border/60 shadow-2xl"
              />
              {caption && (
                <p className="mt-3 text-sm text-foreground/90 text-center max-w-2xl">
                  {caption}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
