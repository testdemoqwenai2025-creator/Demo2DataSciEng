"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";

/**
 * Foldable — a reusable collapsible section.
 * Shows title + summary always visible; content hidden until clicked.
 * This is the "progressive disclosure" pattern for deep content.
 *
 * Usage:
 * <Foldable title="Mathematical Foundations" summary="5 equations with derivations">
 *   <div>...deep content here...</div>
 * </Foldable>
 *
 * Props:
 *   title — always-visible heading
 *   summary — 1-sentence teaser (shown when collapsed)
 *   defaultOpen — start expanded (default: false)
 *   accent — color for the chevron (default: var(--primary))
 */

interface FoldableProps {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  accent?: string;
  children: ReactNode;
}

export function Foldable({ title, summary, defaultOpen = false, accent, children }: FoldableProps) {
  const [open, setOpen] = useState(defaultOpen);
  const color = accent || "var(--primary)";

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/20 transition-colors"
        aria-expanded={open}
      >
        <motion.div
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
          style={{ color }}
        >
          <ChevronRight className="h-4 w-4" />
        </motion.div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color }}>
            {title}
          </p>
          {summary && !open && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {summary}
            </p>
          )}
        </div>
        {summary && open && (
          <span className="text-[10px] text-muted-foreground font-mono shrink-0">
            click to collapse
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * FoldableGroup — a collection of Foldables with accordion behavior
 * (only one open at a time — optional).
 */
export function FoldableGroup({ children, accordion = false }: { children: ReactNode; accordion?: boolean }) {
  if (accordion) {
    // For accordion behavior, we'd need state management at the group level.
    // For now, just render children — each Foldable manages its own state.
    // True accordion would require lifting state up.
  }
  return <div className="space-y-2">{children}</div>;
}
