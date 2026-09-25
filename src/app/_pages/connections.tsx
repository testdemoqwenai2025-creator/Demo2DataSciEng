"use client";

import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { ELEGANT_CODE_MAP, cardsOnHostPage, recommendedCards } from "../_lib/elegant-code-map";
import { ELEGANT_CODE_CARDS } from "../_components/_elegant_code_cards";
import { hrefFor, pageById, type PageId } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Network, Sparkles, TrendingUp, ArrowRight, Boxes, Brain, Atom, Layers } from "lucide-react";

const KPIS = [
  { label: "Cards", value: "10 equations", hint: "Each card bridges 3+ sciences with the same math: SVD, Attention, Poisson, FFT, Verlet, Navier-Stokes, Gradient Descent, Bayes, Euler, Entropy.", deltaTone: "flat" as const },
  { label: "Host pages", value: "9 contextual", hint: "Where each card is propagated inline — readers meet the thesis where it matters most, not only on /elegant-code.", deltaTone: "up" as const },
  { label: "Code blocks", value: "50 (10 × 5 langs)", hint: "Same Scala/Rust/Go/Elixir/Zig snippets shared via ELEGANT_CODE_CARDS — no duplication.", deltaTone: "flat" as const },
  { label: "Science bridges", value: "30+ connections", hint: "10 cards × 3+ sciences each — the cross-disciplinary adjacencies that no single PhD sees alone.", deltaTone: "up" as const },
];

export function ConnectionsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Navigation hub · card → host page → next card"
        title="Connections — the map of the platform's multi-disciplinary thesis"
        description="This page is the navigation hub for the platform's central thesis: that modern computational science is the INTERSECTION of disciplines, and the same equation appears across genomics, physics, ML, finance, audio, aerospace, and games. Below you'll find every one of the 10 cross-disciplinary elegant-code cards mapped to the host page where it appears inline — plus a card-to-card adjacency graph so a reader on any host page can surf the full network of 'X IS Y' connections."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Brain className="h-3 w-3" /> 10 cards</Badge>
            <Badge variant="outline" className="gap-1.5"><Atom className="h-3 w-3" /> 9 hosts</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* Card → Host mapping */}
      <SectionCard
        title="Card → host page map — where each equation surfaces inline"
        description="Each elegant-code card is propagated to the host page where its equation is most contextually relevant. The reader on a host page encounters the thesis naturally — and can navigate back to the central /elegant-code page for the full multi-language code (Scala/Rust/Go/Elixir/Zig)."
        icon={<Network className="h-5 w-5" />}
        badge="10 rows"
      >
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-border/60">
                <th className="py-2 px-2 font-semibold text-foreground/80">#</th>
                <th className="py-2 px-2 font-semibold text-foreground/80">Equation</th>
                <th className="py-2 px-2 font-semibold text-foreground/80">Sciences bridged</th>
                <th className="py-2 px-2 font-semibold text-foreground/80">"X IS Y" insight</th>
                <th className="py-2 px-2 font-semibold text-foreground/80">Host page</th>
                <th className="py-2 px-2 font-semibold text-foreground/80">Why it fits</th>
              </tr>
            </thead>
            <tbody>
              {ELEGANT_CODE_MAP.map((m) => {
                const card = ELEGANT_CODE_CARDS[m.cardIndex];
                return (
                  <tr key={m.cardIndex} className="border-b border-border/40 align-top">
                    <td className="py-3 px-2 text-muted-foreground font-mono text-xs">{String(m.cardIndex + 1).padStart(2, "0")}</td>
                    <td className="py-3 px-2">
                      <div className="font-semibold text-foreground/90">{m.name}</div>
                      <div className="font-mono text-xs text-muted-foreground mt-0.5">{m.equation}</div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex flex-wrap gap-1">
                        {m.sciences.map((s, i) => (
                          <span key={s} className="text-xs">
                            {s}{i < m.sciences.length - 1 && <span className="text-muted-foreground/60 mx-1">↔</span>}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-xs italic text-primary/90">{m.insightShort}</td>
                    <td className="py-3 px-2">
                      <div className="flex flex-col gap-1">
                        {m.hostPages.map((hp, i) => (
                          <Link key={hp} href={hrefFor(hp)} className="text-primary hover:underline text-xs whitespace-nowrap">
                            → {pageById(hp).shortLabel}
                          </Link>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-xs text-muted-foreground leading-relaxed max-w-xs">
                      {m.hostReasons[0]}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Host page → cards inverse map */}
      <SectionCard
        title="Host page → cards — what thesis surfaces where you already are"
        description="The inverse view: every host page and the card(s) propagated onto it. Useful if you're a reader on (say) transformer-deep-dive and want to know which other cards might be worth visiting."
        icon={<Boxes className="h-5 w-5" />}
        badge="9 hosts"
      >
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {uniqueHostPages().map((hp) => {
            const cards = cardsOnHostPage(hp);
            const meta = pageById(hp);
            return (
              <div key={hp} className="rounded-md border border-border/60 bg-muted/20 p-3">
                <Link href={hrefFor(hp)} className="text-sm font-semibold text-primary hover:underline block mb-2">
                  {meta.label}
                </Link>
                <div className="space-y-1.5">
                  {cards.map((c) => (
                    <div key={c.cardIndex} className="text-xs">
                      <Link href={`${hrefFor("elegant-code")}#card-${c.cardIndex}`} className="text-foreground/80 hover:underline font-mono">
                        {c.name}
                      </Link>
                      <span className="text-muted-foreground mx-1.5">·</span>
                      <span className="text-muted-foreground italic">{c.insightShort}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Card → card adjacency graph */}
      <SectionCard
        title="Card → card adjacency — the graph of mathematical cousins"
        description="Each card has up to 3 mathematical cousins: cards whose sciences overlap or whose equation family is mathematically adjacent. SVD ↔ FFT (both are change-of-basis). Verlet ↔ Euler (both are integrators). Bayes ↔ Gradient Descent (both are learning rules). Use this graph to surf the full network of 'X IS Y' connections — start anywhere, end up everywhere."
        icon={<Network className="h-5 w-5" />}
        badge="card graph"
      >
        <div className="grid md:grid-cols-2 gap-3">
          {ELEGANT_CODE_MAP.map((m) => {
            const recs = recommendedCards(m.cardIndex);
            return (
              <div key={m.cardIndex} className="rounded-md border border-border/60 bg-muted/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-semibold text-foreground/90">{m.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{m.equation}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{m.sciences.join(" ↔ ")}</Badge>
                </div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Mathematical cousins</div>
                <div className="flex flex-wrap gap-1.5">
                  {recs.map((ri) => {
                    const c = ELEGANT_CODE_MAP[ri];
                    return (
                      <Link key={ri} href={`${hrefFor("elegant-code")}#card-${ri}`} className="text-xs px-2 py-1 rounded border border-border/60 bg-background text-primary hover:bg-primary/10 hover:underline">
                        {c.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* The thesis */}
      <SectionCard
        title="My deeper thought: the platform IS a graph, not a tree"
        description="Most knowledge platforms are TREES — a homepage → categories → subcategories → articles. The reader drills down. This platform's elegant-code thesis is a GRAPH: any card connects to any other card via shared mathematics. Surfing the graph IS the learning — because the connections are the lesson."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Trees hide the connections.</strong> A tree-based platform puts SVD under "linear algebra", Attention under "deep learning", Poisson under "statistics" — and the reader never sees that SVD and FFT are the same operation (change of basis), or that Attention and Bayes are both learning rules. The tree is the WRONG data structure for cross-disciplinary knowledge — because cross-disciplinary knowledge is, by definition, NOT hierarchical.
          </p>
          <p>
            <strong className="text-foreground/80">A graph surfaces the thesis.</strong> This /connections page is the adjacency list of the graph. The 10 cards are nodes. The "X IS Y" insights are node labels. The 30+ cross-disciplinary bridges are edges. Surf the graph by following any edge — start at SVD, end at Entropy (both compress distributions), then jump to Bayes (also a distribution measure), then to Gradient Descent (also a learning rule). The path is not random; it follows mathematical kinship.
          </p>
          <p>
            <strong className="text-foreground/80">Host pages are entry points.</strong> A reader on transformer-deep-dive arrives via Attention (idx 1) — then jumps to SVD (idx 0, "correlation detection"), then to Gradient Descent (idx 6, "learning rule"), then to Bayes (idx 7, "belief updater"). Four equations, four sciences, four "X IS Y" insights — all from one host page. This is what no single PhD sees alone, and what this platform exists to reveal.
          </p>
          <p>
            <strong className="text-foreground/80">The map IS the value.</strong> The 50 code blocks in 5 languages are the AMPLIFIER; the 30+ cross-disciplinary edges are the SIGNAL. A reader who memorises all 50 code blocks has learned nothing — they've collected snippets. A reader who internalises the 30+ edges has learned the most valuable skill in modern computational science: how to THINK ACROSS DISCIPLINES. The /connections page is the map of those edges.
          </p>
        </div>
      </SectionCard>

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("elegant-code")} className="text-sm text-primary hover:underline">
          → Elegant Code (the 10 cards in full)
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("home")} className="text-sm text-primary hover:underline">
          → Home
        </Link>
      </div>
    </div>
  );
}

/** Collect the unique host pages that have at least one card. */
function uniqueHostPages(): PageId[] {
  const set = new Set<PageId>();
  for (const m of ELEGANT_CODE_MAP) {
    for (const hp of m.hostPages) set.add(hp);
  }
  // Return in ELEGANT_CODE_MAP order of first appearance for stable rendering.
  const seen = new Set<string>();
  const out: PageId[] = [];
  for (const m of ELEGANT_CODE_MAP) {
    for (const hp of m.hostPages) {
      if (!seen.has(hp)) {
        seen.add(hp);
        out.push(hp);
      }
    }
  }
  return out;
}
