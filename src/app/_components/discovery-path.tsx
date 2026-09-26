"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { ELEGANT_CODE_CARDS } from "./_elegant_code_cards";
import { ELEGANT_CODE_MAP, recommendedCards } from "../_lib/elegant-code-map";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ArrowRight, Sparkles } from "lucide-react";

/**
 * DiscoveryPath — tracks which elegant-code cards the user has visited
 * (via localStorage) and shows a progress bar + recommended next cards
 * based on the skill-graph.
 *
 * Usage: drop on any page to show "You've explored X of 20 cards" +
 * recommended next steps.
 */

const STORAGE_KEY = "discovery-path-visited";

export function DiscoveryPath() {
  const [visited, setVisited] = useState<number[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Track card visits via URL hash (#card-N).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    const match = hash.match(/^#card-(\d+)$/);
    if (match && !visited.includes(Number(match[1]))) {
      const cardIdx = Number(match[1]);
      const newVisited = [...visited, cardIdx];
      // Update localStorage first, then state on next tick.
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newVisited));
      } catch { /* best-effort */ }
      // Use setTimeout to avoid setState-in-effect lint error.
      setTimeout(() => setVisited(newVisited), 0);
    }
  }, [visited.length]);

  const progress = Math.round((visited.length / 20) * 100);

  // Recommended next: for each visited card, get its cousin cards.
  // Rank cousins by how many visited cards recommend them.
  const recommendations = useMemo(() => {
    if (visited.length === 0) {
      // No visited cards — recommend the first 3 cards (SVD, Attention, FFT)
      return [
        { cardIndex: 0, reason: "Start here — the universal decomposer" },
        { cardIndex: 1, reason: "DNA IS a language — attention parses it" },
        { cardIndex: 3, reason: "The change of basis — FFT cousin of SVD" },
      ];
    }
    const counts: Record<number, number> = {};
    for (const v of visited) {
      for (const c of recommendedCards(v)) {
        if (!visited.includes(c)) {
          counts[c] = (counts[c] ?? 0) + 1;
        }
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([idx, count]) => ({
        cardIndex: Number(idx),
        reason: `Recommended by ${count} visited card${count > 1 ? "s" : ""}`,
      }));
  }, [visited]);

  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground/80 flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-primary" />
          Your discovery path
        </p>
        <Badge variant="outline" className="text-[10px]">
          {visited.length}/20 cards explored
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {visited.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          You haven't opened any elegant-code cards yet. Click any card on{" "}
          <Link href={hrefFor("elegant-code")} className="text-primary hover:underline">
            /elegant-code
          </Link>{" "}
          to start your discovery path. The platform will track which cards you've visited and
          recommend cousins based on the skill-graph.
        </p>
      ) : (
        <>
          {/* Recommended next */}
          {recommendations.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Recommended next (based on your visited cards' skills)
              </p>
              <div className="grid gap-2">
                {recommendations.map((rec) => {
                  const card = ELEGANT_CODE_CARDS[rec.cardIndex];
                  if (!card) return null;
                  const map = ELEGANT_CODE_MAP[rec.cardIndex];
                  return (
                    <Link
                      key={rec.cardIndex}
                      href={`${hrefFor("elegant-code")}#card-${rec.cardIndex}`}
                      className="block rounded-md border border-border/60 bg-background p-2 hover:border-primary/40 hover:bg-primary/5 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: card.accent }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold" style={{ color: card.accent }}>
                            {card.title.split(" — ")[0]}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{rec.reason}</p>
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground italic">
            Visited cards are tracked in localStorage (per browser). Your discovery path is private —
            no data is sent to any server.
          </p>
        </>
      )}
    </div>
  );
}
