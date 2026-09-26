"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { hrefFor } from "../_lib/router";
import { ELEGANT_CODE_MAP, recommendedCards } from "../_lib/elegant-code-map";
import { Badge } from "@/components/ui/badge";
import { Compass, ArrowRight, History } from "lucide-react";

/**
 * NextSteps — per-page suggestions for where to go next.
 *
 * Uses the DiscoveryPath (localStorage) to track which elegant-code cards
 * the user has visited, then recommends 2-3 related pages based on:
 *   1. Cousin cards (from the skill-graph adjacency) the user hasn't visited.
 *   2. RelatedTopics from the current page (passed as a prop).
 *   3. If no DiscoveryPath data, falls back to RelatedTopics only.
 *
 * Usage: drop at the bottom of any page, after RelatedTopics.
 *   <NextSteps relatedPages={[{id: "numpy-scipy", reason: "..."}, ...]} />
 */

interface RelatedPage {
  id: import("../_lib/router").PageId;
  reason: string;
}

const STORAGE_KEY = "discovery-path-visited";

export function NextSteps({ relatedPages = [] }: { relatedPages?: RelatedPage[] }) {
  const [visited, setVisited] = useState<number[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Refresh on mount (in case user navigated back) — use setTimeout to avoid setState-in-effect.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setTimeout(() => setVisited(parsed), 0);
      }
    } catch { /* best-effort */ }
  }, []);

  const suggestions = useMemo(() => {
    const out: Array<{ id: import("../_lib/router").PageId; reason: string; isCousin: boolean }> = [];

    // 1. Cousin cards from visited cards' skill-graph adjacency.
    if (visited.length > 0) {
      const cousinCounts: Record<number, number> = {};
      for (const v of visited) {
        for (const c of recommendedCards(v)) {
          if (!visited.includes(c)) {
            cousinCounts[c] = (cousinCounts[c] ?? 0) + 1;
          }
        }
      }
      const sortedCousins = Object.entries(cousinCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      for (const [idx, count] of sortedCousins) {
        const card = ELEGANT_CODE_MAP[Number(idx)];
        if (card) {
          out.push({
            id: "elegant-code" as const,
            reason: `Explore ${card.name} — recommended by ${count} of your visited cards`,
            isCousin: true,
          });
        }
      }
    }

    // 2. RelatedPages from the current page (if not already suggested).
    for (const rp of relatedPages) {
      if (out.length >= 3) break;
      if (!out.find(s => s.id === rp.id)) {
        out.push({ ...rp, isCousin: false });
      }
    }

    // 3. If no suggestions at all, recommend the starting trio.
    if (out.length === 0) {
      out.push({ id: "elegant-code" as const, reason: "Start with the 20 elegant-code cards", isCousin: false });
      out.push({ id: "connections" as const, reason: "See the card → card graph", isCousin: false });
      out.push({ id: "resources" as const, reason: "Browse datasets, papers, libraries", isCousin: false });
    }

    return out.slice(0, 3);
  }, [visited, relatedPages]);

  if (suggestions.length === 0) return null;

  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
      <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5">
        <Compass className="h-3.5 w-3.5" />
        Next steps — where to go from here
        {visited.length > 0 && (
          <span className="text-[9px] text-muted-foreground ml-1">
            ({visited.length} cards explored)
          </span>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s, i) => (
          <Link
            key={i}
            href={hrefFor(s.id)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <ArrowRight className="h-3 w-3" />
            {s.reason}
            {s.isCousin && (
              <Badge variant="outline" className="text-[8px] px-1 py-0 ml-1">cousin</Badge>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
