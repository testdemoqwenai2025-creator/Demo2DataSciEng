"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { ELEGANT_CODE_CARDS } from "./_elegant_code_cards";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Dice5, ArrowRight, Bookmark, Download, Trash2 } from "lucide-react";

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
  // Bookmarked discoveries — lazy-initialized from localStorage (avoids setState-in-effect).
  const [bookmarks, setBookmarks] = useState<RandomTile[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("surprise-me-bookmarks");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const reshuffle = useCallback(() => {
    setPicked(pickThree(allTiles));
    setClickCount((c) => c + 1);
  }, [allTiles]);

  // Bookmark the current 3 tiles.
  const bookmarkCurrent = useCallback(() => {
    if (picked.length === 0) return;
    const newBookmarks = [...bookmarks, ...picked];
    setBookmarks(newBookmarks);
    try {
      localStorage.setItem("surprise-me-bookmarks", JSON.stringify(newBookmarks));
    } catch {
      // best-effort
    }
  }, [picked, bookmarks]);

  // Export bookmarks to a downloadable JSON file (for Google Drive upload etc.).
  const exportBookmarks = useCallback(() => {
    if (bookmarks.length === 0) return;
    const data = JSON.stringify({
      exportedAt: new Date().toISOString(),
      source: "ModernDataSciEng Platform — SurpriseMe discoveries",
      count: bookmarks.length,
      bookmarks: bookmarks.map((b) => ({
        card: b.cardTitle,
        cardIndex: b.cardIndex,
        science: b.outcome.science,
        sector: b.outcome.sector,
        skill: b.outcome.skill,
        talent: b.outcome.talent,
        description: b.outcome.description,
        url: `https://testdemoqwenai2025-creator.github.io/Demo2DataSciEng/elegant-code/#card-${b.cardIndex}`,
      })),
    }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `surprise-me-discoveries-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [bookmarks]);

  // Clear all bookmarks.
  const clearBookmarks = useCallback(() => {
    setBookmarks([]);
    try {
      localStorage.removeItem("surprise-me-bookmarks");
    } catch {
      // best-effort
    }
  }, []);

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
        {picked.length > 0 && (
          <Button
            onClick={bookmarkCurrent}
            size="sm"
            variant="outline"
            className="gap-1.5"
          >
            <Bookmark className="h-3.5 w-3.5" />
            Bookmark these 3
          </Button>
        )}
        {clickCount > 0 && (
          <span className="text-[10px] text-muted-foreground">
            Pick #{clickCount} · {allTiles.length} tiles in the pool
            {bookmarks.length > 0 && ` · ${bookmarks.length} saved`}
          </span>
        )}
      </div>

      {/* Saved discoveries (bookmarks) */}
      {bookmarks.length > 0 && (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Bookmark className="h-3 w-3 text-primary" />
              Saved discoveries ({bookmarks.length} tiles bookmarked — stored in localStorage)
            </p>
            <div className="flex items-center gap-1.5">
              <Button onClick={exportBookmarks} size="sm" variant="ghost" className="h-6 text-[10px] gap-1">
                <Download className="h-3 w-3" /> Export JSON
              </Button>
              <Button onClick={clearBookmarks} size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-rose-600 dark:text-rose-400">
                <Trash2 className="h-3 w-3" /> Clear
              </Button>
            </div>
          </div>
          <p className="text-[9px] text-muted-foreground italic">
            Export the JSON file and upload to your chosen drive for cross-device access.
            Each bookmark records the card, science, sector, skill, talent, and deep-link URL.
          </p>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/40">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Save to your drive:</span>
            <a
              href="https://drive.google.com/drive/my-drive"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors"
              onClick={(e) => { e.preventDefault(); exportBookmarks(); window.open("https://drive.google.com/drive/my-drive", "_blank"); }}
            >
              <Download className="h-3 w-3" /> Google Drive
            </a>
            <a
              href="https://www.dropbox.com/home"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors"
              onClick={(e) => { e.preventDefault(); exportBookmarks(); window.open("https://www.dropbox.com/home", "_blank"); }}
            >
              <Download className="h-3 w-3" /> Dropbox
            </a>
            <a
              href="https://onedrive.live.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors"
              onClick={(e) => { e.preventDefault(); exportBookmarks(); window.open("https://onedrive.live.com/", "_blank"); }}
            >
              <Download className="h-3 w-3" /> OneDrive
            </a>
          </div>
          <p className="text-[9px] text-muted-foreground italic mt-1">
            Click any drive button to download the JSON file, then upload it to your chosen drive.
            No login required — your discoveries stay private in your browser until you export them.
          </p>
        </div>
      )}

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
