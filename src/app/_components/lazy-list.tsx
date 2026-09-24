"use client";

import { useState, useEffect, useRef, useCallback, Fragment, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * LazyList — renders a slice of items + "Show more" button.
 *
 * Lazy evaluation pattern: instead of rendering all items upfront (which
 * increases page HTML, JS hydration time, and memory), renders only
 * the first `initialCount` items. Clicking "Show more" reveals the next
 * `increment` items. Repeated clicks reveal more.
 *
 * Memory-efficient: unrendered items are not in the DOM at all.
 * Bandwidth-efficient: nothing is fetched on demand (items are already
 * in memory from the parent), but DOM nodes are minimised.
 * UX-efficient: progressive disclosure — users see the top, expand
 * only if interested.
 *
 * Optional `intersectionObserver` mode: when true, auto-loads the next
 * batch when the user scrolls near the bottom (no button click needed).
 *
 * Usage:
 *   <LazyList items={ADRS} initialCount={5} increment={5}>
 *     {(adr) => <AdrCard adr={adr} />}
 *   </LazyList>
 */
interface LazyListProps<T> {
  items: T[];
  initialCount?: number;
  increment?: number;
  /** Render each item */
  children: (item: T, index: number) => ReactNode;
  /** Optional: key extractor for stable React keys */
  getKey?: (item: T, index: number) => string | number;
  /** When true, auto-load next batch when scrolled near bottom (IntersectionObserver) */
  autoLoadOnScroll?: boolean;
  /** Show "Show less" button when expanded (collapse back to initialCount) */
  collapsible?: boolean;
  /** Custom "Show more" label, e.g. `Show N more ADRs` */
  showMoreLabel?: (count: number) => string;
  /** Custom "Show less" label */
  showLessLabel?: string;
  /** When true, the list renders all items from the start (no lazy loading). Useful for SSR. */
  disableLazy?: boolean;
  /** When true, items render without the motion.div wrapper (use for table rows inside tbody). */
  disableWrapper?: boolean;
}

export function LazyList<T>({
  items,
  initialCount = 5,
  increment = 5,
  children,
  getKey,
  autoLoadOnScroll = false,
  collapsible = true,
  showMoreLabel,
  showLessLabel = "Show less",
  disableLazy = false,
  disableWrapper = false,
}: LazyListProps<T>) {
  const total = items.length;
  const effectiveInitial = disableLazy ? total : Math.min(initialCount, total);
  const [visibleCount, setVisibleCount] = useState(effectiveInitial);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const canShowMore = visibleCount < total;
  const canShowLess = collapsible && visibleCount > effectiveInitial;

  const showMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + increment, total));
  }, [increment, total]);

  const showLess = useCallback(() => {
    setVisibleCount(effectiveInitial);
  }, [effectiveInitial]);

  // Auto-load on scroll via IntersectionObserver
  useEffect(() => {
    if (!autoLoadOnScroll || !canShowMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            showMore();
            break;
          }
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [autoLoadOnScroll, canShowMore, showMore]);

  // Reset visibleCount when items array changes (e.g. after filtering)
  // Use a ref to track previous items.length so we don't trigger setState on every render
  const prevItemsLength = useRef(items.length);
  useEffect(() => {
    if (prevItemsLength.current !== items.length) {
      prevItemsLength.current = items.length;
      const t = setTimeout(() => setVisibleCount(Math.min(initialCount, items.length)), 0);
      return () => clearTimeout(t);
    }
  }, [items.length, initialCount]);

  const label = showMoreLabel ? showMoreLabel(total - visibleCount) : `Show ${total - visibleCount} more`;

  return (
    <div>
      <AnimatePresence initial={false}>
        {items.slice(0, visibleCount).map((item, idx) =>
          disableWrapper ? (
            // No wrapper — children render directly (for table rows inside tbody)
            <Fragment key={getKey ? getKey(item, idx) : idx}>{children(item, idx)}</Fragment>
          ) : (
            <motion.div
              key={getKey ? getKey(item, idx) : idx}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {children(item, idx)}
            </motion.div>
          )
        )}
      </AnimatePresence>

      {/* Sentinel for IntersectionObserver auto-load */}
      {autoLoadOnScroll && canShowMore && (
        <div ref={sentinelRef} className="h-4" aria-hidden="true" />
      )}

      {/* Action buttons */}
      {(canShowMore || canShowLess) && (
        <div className="mt-3 flex items-center gap-2 justify-center">
          {canShowMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={showMore}
              className="gap-1.5"
            >
              <ChevronDown className="h-3.5 w-3.5" /> {label}
            </Button>
          )}
          {canShowLess && (
            <Button
              variant="ghost"
              size="sm"
              onClick={showLess}
              className="gap-1.5"
            >
              <ChevronUp className="h-3 w-3" /> {showLessLabel}
            </Button>
          )}
        </div>
      )}

      {/* Item count indicator */}
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        Showing {Math.min(visibleCount, total)} of {total}
      </p>
    </div>
  );
}
