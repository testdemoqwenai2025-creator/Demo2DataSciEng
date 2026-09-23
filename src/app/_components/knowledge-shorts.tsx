"use client";

import { useState } from "react";
import Link from "next/link";
import { KNOWLEDGE_SHORTS, type KnowledgeShort } from "../_data/synthetic";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Play, Heart, Eye, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

const ACCENT_BG: Record<KnowledgeShort["accent"], string> = {
  emerald: "from-emerald-600 to-emerald-800",
  amber:   "from-amber-500 to-amber-700",
  violet:  "from-violet-600 to-violet-800",
  cyan:    "from-cyan-500 to-cyan-700",
  yellow:  "from-yellow-500 to-yellow-700",
};

const ACCENT_DOT: Record<KnowledgeShort["accent"], string> = {
  emerald: "bg-emerald-400",
  amber:   "bg-amber-300",
  violet:  "bg-violet-400",
  cyan:    "bg-cyan-300",
  yellow:  "bg-yellow-300",
};

export function KnowledgeShorts() {
  const [active, setActive] = useState(0);
  const total = KNOWLEDGE_SHORTS.length;

  const scrollBy = (delta: number) => {
    setActive((prev) => Math.max(0, Math.min(total - 1, prev + delta)));
  };

  return (
    <div className="space-y-3">
      <style>{`
        @keyframes shortsScrollIn {
          from { opacity: 0; transform: translateY(10px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .shorts-card-enter { animation: shortsScrollIn 0.32s ease-out; }
      `}</style>
      {/* Horizontal scroll container */}
      <div className="relative -mx-1 px-1">
        <div
          className="flex gap-4 overflow-x-auto code-scroll snap-x snap-mandatory pb-3 pt-1"
          style={{ scrollbarWidth: "thin" }}
        >
          {KNOWLEDGE_SHORTS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActive(i)}
              className={`snap-start shrink-0 w-64 text-left transition-transform ${
                i === active ? "scale-100" : "scale-95 opacity-70 hover:opacity-100 hover:scale-100"
              }`}
            >
              {/* Vertical video-style card */}
              <div
                className={`relative aspect-[9/16] rounded-xl overflow-hidden bg-gradient-to-br ${ACCENT_BG[s.accent]} shadow-md`}
              >
                {/* Top bar */}
                <div className="absolute top-0 left-0 right-0 p-2.5 flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-wider text-white/80 font-semibold">
                    {s.topic}
                  </span>
                  <span className="text-[9px] font-mono text-white/80 bg-black/30 px-1.5 py-0.5 rounded">
                    {s.duration}
                  </span>
                </div>
                {/* Center play indicator (decorative — content is text, not video) */}
                <div className="absolute inset-0 flex flex-col items-center justify-center px-3 pt-7 pb-12">
                  <Play className="h-8 w-8 text-white/30 mb-2" fill="currentColor" />
                  <p className="text-white text-sm font-semibold leading-snug text-center text-balance">
                    {s.title}
                  </p>
                  <p className="text-white/70 text-[10px] mt-2 line-clamp-3 leading-snug">
                    {s.body}
                  </p>
                  <div className={`mt-3 rounded-md bg-white/15 px-2 py-1 text-white text-[9px] font-medium`}>
                    {s.key_takeaway}
                  </div>
                </div>
                {/* Bottom bar with metrics */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-black/30 backdrop-blur-sm flex items-center justify-between text-white/85 text-[9px]">
                  <span className="flex items-center gap-1">
                    <Eye className="h-2.5 w-2.5" /> {s.views}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-2.5 w-2.5" /> {s.likes}
                  </span>
                </div>
                {/* Active indicator dot */}
                <span
                  className={`absolute top-2 left-2 h-2 w-2 rounded-full ${ACCENT_DOT[s.accent]} ${
                    i === active ? "ring-2 ring-white/60" : ""
                  }`}
                />
              </div>
            </button>
          ))}
        </div>
        {/* Mobile/desktop horizontal nav buttons */}
        <button
          onClick={() => scrollBy(-1)}
          disabled={active === 0}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 hidden md:flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/80 backdrop-blur disabled:opacity-30 hover:bg-accent transition-colors"
          aria-label="Previous short"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => scrollBy(1)}
          disabled={active === total - 1}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 hidden md:flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/80 backdrop-blur disabled:opacity-30 hover:bg-accent transition-colors"
          aria-label="Next short"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Active short detail panel */}
      <div key={active} className="shorts-card-enter rounded-md border border-border/60 p-4 bg-muted/20">
        {(() => {
          const s = KNOWLEDGE_SHORTS[active];
          return (
            <div className="grid md:grid-cols-[1fr_2fr] gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="outline" className="text-[10px]">{s.topic}</Badge>
                  <Badge variant="secondary" className="text-[10px] font-mono">{s.duration}</Badge>
                </div>
                <p className="text-base font-semibold leading-snug">{s.title}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {s.views} views</span>
                  <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {s.likes} likes</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-foreground/90 leading-relaxed">{s.body}</p>
                <div className="rounded-md border border-primary/40 bg-primary/5 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-primary/80 mb-0.5">Key takeaway</p>
                  <p className="text-sm font-medium text-foreground">{s.key_takeaway}</p>
                </div>
                <div className="flex items-center justify-between">
                  <Link href={hrefFor(s.related_page as never)} className="text-xs text-primary hover:underline">
                    → See this implemented on the {s.related_page} page
                  </Link>
                  <span className="text-[10px] font-mono text-muted-foreground">Short {active + 1} of {total}</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
