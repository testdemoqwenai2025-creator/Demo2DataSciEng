"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { ELEGANT_CODE_CARDS } from "./_elegant_code_cards";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Dice5, ArrowRight } from "lucide-react";

/**
 * SurpriseMe — picks 3 random outcome tiles across all 60 (20 cards × 3
 * outcomes) and lets the user discover connections they wouldn't have
 * searched for. Useful for serendipitous exploration.
 *
 * Each click reshuffles and shows 3 new tiles. Each tile links to its
 * card on /elegant-code#card-N + shows the science, sector, skill, talent.
 */

interface RandomTile {
  cardIndex: number;
  cardTitle: string;
  cardAccent: string;
  outcomeIndex: number;
  outcome: {
    science: string;
    sector: string;
    skill: string;
    talent: string;
    description: string;
  };
}

function pickThree<T>(arr: T[]): T[] {
  // Fisher-Yates partial shuffle — pick 3 distinct items.
  const pool = [...arr];
  const out: T[] = [];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

// Curated live-demo URLs for cards that have a /living-* page.
const liveMap: Record<number, string> = {
  0: "/living-svd",
  1: "/living-attention",
  2: "/living-poisson",
  3: "/living-fft",
  9: "/living-entropy",
  10: "/living-black-scholes",
  11: "/living-haversine",
  16: "/living-kalman",
  17: "/living-monte-carlo",
  18: "/living-gbm",
};

export function SurpriseMe() {
  // Build the full list of 60 tiles once.
  const allTiles = useMemo<RandomTile[]>(() => {
    const out: RandomTile[] = [];
    ELEGANT_CODE_CARDS.forEach((card, idx) => {
      if (!card.outcomes) return;
      card.outcomes.forEach((o, oi) => {
        out.push({
          cardIndex: idx,
          cardTitle: card.title,
          cardAccent: card.accent,
          outcomeIndex: oi,
          outcome: {
            science: o.science,
            sector: o.sector,
            skill: o.skill,
            talent: o.talent,
            description: o.description,
          },
        });
      });
    });
    return out;
  }, []);

  const [picked, setPicked] = useState<RandomTile[]>([]);
  const [clickCount, setClickCount] = useState(0);

  const reshuffle = useCallback(() => {
    setPicked(pickThree(allTiles));
    setClickCount((c) => c + 1);
  }, [allTiles]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          onClick={reshuffle}
          size="sm"
          className="gap-1.5"
        >
          {clickCount > 0 ? (
            <RefreshCw className="h-3.5 w-3.5" />
          ) : (
            <Dice5 className="h-3.5 w-3.5" />
          )}
          {clickCount > 0 ? "Reshuffle" : "Surprise me"}
        </Button>
        {clickCount > 0 && (
          <span className="text-[10px] text-muted-foreground">
            Pick #{clickCount} · {allTiles.length} tiles in the pool
          </span>
        )}
      </div>

      {picked.length === 0 && (
        <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 p-4 text-xs text-muted-foreground italic">
          <p className="font-semibold not-italic text-foreground/80 mb-1">
            Press <span className="text-primary">"Surprise me"</span> to discover 3 random outcome tiles.
          </p>
          Each pick is a different science × sector × skill × talent combination from across the platform's 60 outcome tiles (20 cards × 3 outcomes each). Useful when you don't know what to search for — let randomness surface connections you wouldn't have thought to look for.
        </div>
      )}

      {picked.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          {picked.map((tile) => (
            <Link
              key={`${tile.cardIndex}-${tile.outcomeIndex}`}
              href={`${hrefFor("elegant-code")}#card-${tile.cardIndex}`}
              className="block rounded-md border border-border/60 bg-muted/20 p-3 hover:border-primary/40 hover:bg-primary/5 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: tile.cardAccent }}>
                    {tile.cardTitle.split(" — ")[0]}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mt-1" style={{ color: tile.cardAccent }}>
                    {tile.outcome.science}
                  </p>
                </div>
                {liveMap[tile.cardIndex] && (
                  <Link
                    href={liveMap[tile.cardIndex]}
                    className="text-[10px] text-primary hover:underline flex items-center gap-0.5 shrink-0"
                  >
                    <Sparkles className="h-2.5 w-2.5" /> live
                  </Link>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug mb-2">{tile.outcome.sector}</p>
              <div className="flex flex-wrap gap-1 mb-2">
                <Badge variant="outline" className="text-[9px] px-1 py-0">{tile.outcome.skill}</Badge>
                <Badge variant="secondary" className="text-[9px] px-1 py-0 italic">{tile.outcome.talent}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3">{tile.outcome.description}</p>
              <p className="text-[10px] text-primary mt-2 flex items-center gap-1 group-hover:underline">
                Open full card <ArrowRight className="h-3 w-3" />
              </p>
            </Link>
          ))}
        </div>
      )}

      {picked.length > 0 && (
        <p className="text-[10px] text-muted-foreground italic">
          These 3 tiles were picked at random from {allTiles.length} outcome tiles across {ELEGANT_CODE_CARDS.length} cards.
          The combination highlights one equation × one science × one sector — see what surprises you.
          Press "Reshuffle" for 3 more.
        </p>
      )}
    </div>
  );
}
