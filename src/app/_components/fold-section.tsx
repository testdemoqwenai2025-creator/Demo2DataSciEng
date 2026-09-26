"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react";

/**
 * FoldSection — a collapsible section that's collapsed by default and
 * expands when the user clicks an "Upgrade" / "Expand" button.
 *
 * Used in the card modal to reveal deeper content progressively:
 *   - "Equation family comparison" — siblings in the same equation family
 *   - "Deeper mathematics" — full derivation (LaTeX-style)
 *   - "Production patterns" — additional code examples
 *   - "Expected output examples" — actual chart/image output per science
 *
 * The fold pattern means the basic card content (brief, stats, code,
 * outcomes, constellation, insight) is always visible, but the deeper
 * phases of the repository are revealed only when the user asks.
 *
 * Props:
 *   - title: short label for the fold (e.g., "Equation family")
 *   - description: what's inside the fold
 *   - children: the content to reveal when expanded
 *   - defaultOpen: optional, defaults to false (collapsed)
 */
interface FoldSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  accent?: string;
}

export function FoldSection({
  title,
  description,
  children,
  defaultOpen = false,
  accent,
}: FoldSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-md border border-border/60 bg-muted/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-semibold leading-tight"
            style={{ color: accent ?? "var(--primary)" }}
          >
            {title}
          </p>
          {description && (
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {!open && (
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground shrink-0 mt-0.5">
            Click to expand
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border/40"
          >
            <div className="p-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * EquationFamilyFold — a fold section that shows the equation family
 * comparison for the current card. Built on top of FoldSection + the
 * ELEGANT_CODE_MAP equation family data.
 */
import { ELEGANT_CODE_MAP } from "../_lib/elegant-code-map";
import { ELEGANT_CODE_CARDS } from "./_elegant_code_cards";
import Link from "next/link";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";

// Map card index → equation family.
const EQUATION_FAMILIES: Record<number, { family: string; color: string; description: string }> = {
  // Linear algebra family: SVD, FFT, Lloyd's k-means → blue
  0: { family: "Linear Algebra", color: "oklch(0.65 0.16 240)", description: "Change-of-basis + decomposition + clustering — the universal data-compression family." },
  3: { family: "Linear Algebra", color: "oklch(0.65 0.16 240)", description: "Change-of-basis + decomposition + clustering — the universal data-compression family." },
  19: { family: "Linear Algebra", color: "oklch(0.65 0.16 240)", description: "Change-of-basis + decomposition + clustering — the universal data-compression family." },
  // Deep learning family: Attention, Gradient Descent → purple
  1: { family: "Deep Learning", color: "oklch(0.65 0.16 280)", description: "Learning rules + correlation detection — the family of training algorithms." },
  6: { family: "Deep Learning", color: "oklch(0.65 0.16 280)", description: "Learning rules + correlation detection — the family of training algorithms." },
  // Probability family: Poisson, Bayes, Entropy → red
  2: { family: "Probability", color: "oklch(0.65 0.16 0)", description: "Distributions + belief updates + disorder measures — the family of statistical laws." },
  7: { family: "Probability", color: "oklch(0.65 0.16 0)", description: "Distributions + belief updates + disorder measures — the family of statistical laws." },
  9: { family: "Probability", color: "oklch(0.65 0.16 0)", description: "Distributions + belief updates + disorder measures — the family of statistical laws." },
  // Stochastic processes family: GBM, MC, Black-Scholes, Kalman → orange
  10: { family: "Stochastic Processes", color: "oklch(0.65 0.16 30)", description: "Diffusions + simulations + filtering + option pricing — the family of random-process equations." },
  16: { family: "Stochastic Processes", color: "oklch(0.65 0.16 30)", description: "Diffusions + simulations + filtering + option pricing — the family of random-process equations." },
  17: { family: "Stochastic Processes", color: "oklch(0.65 0.16 30)", description: "Diffusions + simulations + filtering + option pricing — the family of random-process equations." },
  18: { family: "Stochastic Processes", color: "oklch(0.65 0.16 30)", description: "Diffusions + simulations + filtering + option pricing — the family of random-process equations." },
  // Numerical methods family: Verlet, Euler → green
  4: { family: "Numerical Methods", color: "oklch(0.65 0.16 120)", description: "Time integrators + ODE solvers — the family of step-by-step simulation." },
  8: { family: "Numerical Methods", color: "oklch(0.65 0.16 120)", description: "Time integrators + ODE solvers — the family of step-by-step simulation." },
  // Networks family: PageRank, Markov → cyan
  13: { family: "Networks", color: "oklch(0.65 0.16 200)", description: "Centrality + state transitions — the family of graph-based equations." },
  15: { family: "Networks", color: "oklch(0.65 0.16 200)", description: "Centrality + state transitions — the family of graph-based equations." },
  // Risk family: VaR → magenta
  14: { family: "Risk Quantification", color: "oklch(0.65 0.16 300)", description: "Tail-risk measures — the family of loss-distribution quantiles." },
  // Geometry family: Haversine → amber
  11: { family: "Spherical Geometry", color: "oklch(0.65 0.16 60)", description: "Great-circle distances — the family of navigation equations." },
  // Dynamics family: Navier-Stokes → teal
  5: { family: "Fluid Dynamics", color: "oklch(0.65 0.16 160)", description: "Continuum PDEs — the family of flow equations." },
  // Kelly, Markov → cross-family (Kelly is optimization + probability, Markov is probability + networks)
  12: { family: "Optimization", color: "oklch(0.65 0.16 100)", description: "Bet sizing + learning rates — the family of maximisation equations." },
};

export function EquationFamilyFold({ cardIndex, onCardClick }: { cardIndex: number; onCardClick?: (cardIndex: number) => void }) {
  const family = EQUATION_FAMILIES[cardIndex];
  if (!family) return null;
  // Find all sibling cards in the same family.
  const siblings = Object.entries(EQUATION_FAMILIES)
    .filter(([idx, f]) => f.family === family.family && Number(idx) !== cardIndex)
    .map(([idx]) => Number(idx));
  return (
    <FoldSection
      title={`Equation family: ${family.family}`}
      description={`${siblings.length + 1} cards in this family — ${family.description} Click to see siblings + comparison.`}
      accent={family.color}
    >
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          This card belongs to the <strong className="text-foreground/80">{family.family}</strong> family — {family.description}
        </p>
        {siblings.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Sibling cards in this family — click any to open its modal</p>
            <div className="grid gap-2">
              {siblings.map((sibIdx) => {
                const sibCard = ELEGANT_CODE_CARDS[sibIdx];
                if (!sibCard) return null;
                const sibFamily = EQUATION_FAMILIES[sibIdx];
                return (
                  <button
                    key={sibIdx}
                    type="button"
                    onClick={() => onCardClick?.(sibIdx)}
                    className="rounded-md border border-border/60 bg-muted/20 p-2 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors w-full cursor-pointer"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                        style={{ backgroundColor: sibFamily?.color ?? family.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold" style={{ color: sibFamily?.color ?? family.color }}>
                          {sibCard.title.split(" — ")[0]}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5 line-clamp-1">
                          {sibCard.subtitle}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                          {sibCard.brief.why}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {siblings.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            This is the only card in the {family.family} family so far.
          </p>
        )}
      </div>
    </FoldSection>
  );
}

/**
 * DeeperMathFold — a fold section that shows a deeper mathematical
 * derivation for the current card. The math content is derived from
 * the card's brief.why + insight fields (since we don't have LaTeX
 * content stored per-card).
 */
export function DeeperMathFold({ cardIndex }: { cardIndex: number }) {
  const card = ELEGANT_CODE_CARDS[cardIndex];
  if (!card) return null;
  return (
    <FoldSection
      title="Deeper mathematics"
      description="The full mathematical context for this equation — derivation sketch, key theorems, and why the math is universal."
    >
      <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
        {/* LaTeX derivation (if the card has a math: field) */}
        {card.math && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-foreground/80 font-semibold mb-1">LaTeX derivation</p>
            <div className="rounded-md border border-border/40 bg-background p-3 overflow-x-auto">
              <KaTeXRenderer latex={card.math} />
            </div>
          </div>
        )}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-foreground/80 font-semibold mb-1">Why this equation is universal</p>
          <p>{card.brief.why}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-foreground/80 font-semibold mb-1">The "X IS Y" insight</p>
          <p className="italic">{card.insight}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-foreground/80 font-semibold mb-1">Computational tools</p>
          <div className="flex flex-wrap gap-1.5">
            {card.tools.map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
            ))}
          </div>
        </div>
        <p className="text-[10px] italic">
          For the full derivation with citations, see the Math tab on the corresponding
          living-equation page (if this card has one — look for the "Run it live" button
          at the top of this modal).
        </p>
      </div>
    </FoldSection>
  );
}

/**
 * ProductionPatternsFold — shows additional production code patterns
 * beyond the 5-language tabs. Uses the card's tools[] field to list
 * production libraries, plus a generic "how to use in production" note.
 */
export function ProductionPatternsFold({ cardIndex }: { cardIndex: number }) {
  const card = ELEGANT_CODE_CARDS[cardIndex];
  if (!card) return null;
  return (
    <FoldSection
      title="Production patterns — how to use this equation in industry"
      description="Beyond the 5-language representational code, these are the production libraries and patterns that implement this equation at scale."
    >
      <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-foreground/80 font-semibold mb-1.5">Production libraries</p>
          <div className="flex flex-wrap gap-1.5">
            {card.tools.map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-foreground/80 font-semibold mb-1.5">Scale considerations</p>
          <p>The 5-language code shown above is representational — it shows HOW to think, not HOW to run. In production:</p>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li>Use vectorised library calls (NumPy, PyTorch, QuantLib) — not hand-rolled loops.</li>
            <li>Profile before optimising — the equation is usually O(N log N) or O(N²), dominated by I/O.</li>
            <li>Cache intermediate results — the same SVD/FFT/attention is often recomputed unnecessarily.</li>
            <li>Distribute across clusters (Spark, Dask, Ray) when N &gt; 10^6 — the equation is embarrassingly parallel.</li>
            <li>Use GPU acceleration (CUDA, Metal) for matrix operations — 100× speedup is typical.</li>
          </ul>
        </div>
        {card.outcomes && card.outcomes.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-foreground/80 font-semibold mb-1.5">Expected output — click "Run analytics" on each tile above</p>
            <p>The 3 outcome tiles above each have a "Run analytics" button that executes the equation on real data (via Pyodide in your browser). The output — whether a bar chart, line chart, or multi-series chart — IS the proof that the equation works. The visual output plays to a different level of the brain than the prose: seeing the 3 spikes of a C-major chord emerge from FFT, or the Out-of-Africa triangle emerge from SVD, communicates the insight in a way no formula can.</p>
          </div>
        )}
      </div>
    </FoldSection>
  );
}

/**
 * CitationsFold — shows the full bibliography for this card.
 * Currently uses the card's brief.dataset + tools[] as citation anchors.
 * Can be extended with a citations: string[] field on DatasetExample.
 */
export function CitationsFold({ cardIndex }: { cardIndex: number }) {
  const card = ELEGANT_CODE_CARDS[cardIndex];
  if (!card) return null;
  const datasetText = card.brief.dataset;
  const subtitleRefs = card.subtitle.match(/\d{4}/g) || [];
  return (
    <FoldSection
      title="Citations — the sources behind this equation"
      description="The papers, datasets, and libraries that ground this card's claims. Each citation links to the /resources page for the full reference."
    >
      <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
        {/* Explicit citations (if the card has a citations: field) */}
        {card.citations && card.citations.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-foreground/80 font-semibold mb-1">Bibliography</p>
            <ul className="list-disc list-inside space-y-1">
              {card.citations.map((cite, i) => (
                <li key={i} className="text-[11px] leading-relaxed">{cite}</li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-foreground/80 font-semibold mb-1">Dataset sources</p>
          <p>{datasetText}</p>
        </div>
        {subtitleRefs.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-foreground/80 font-semibold mb-1">Historical references (years cited)</p>
            <div className="flex flex-wrap gap-1.5">
              {subtitleRefs.map((year, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">{year}</Badge>
              ))}
            </div>
          </div>
        )}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-foreground/80 font-semibold mb-1">Production libraries</p>
          <p className="mb-1">For the full library documentation URLs, see the /resources page (each library has a deep-link to its docs).</p>
          <div className="flex flex-wrap gap-1.5">
            {card.tools.map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-foreground/80 font-semibold mb-1">Living-equation page (if available)</p>
          <p>For the full mathematical derivation with citations, check the Math tab on the corresponding /living-* page (if this card has a "Run it live" CTA at the top of the modal).</p>
        </div>
        <p className="text-[10px] italic">
          For the complete bibliography of all 20 cards, visit{" "}
          <Link href={hrefFor("resources")} className="text-primary hover:underline">/resources</Link>{" "}
          — the Papers section lists 20 cited papers with DOI/arXiv/JSTOR links.
        </p>
      </div>
    </FoldSection>
  );
}

/**
 * ExpectedOutputFold — shows what the equation produces when it lands
 * on each science's data. Reminds the user to click "Run analytics"
 * on the outcome tiles above, and explains what each output reveals.
 */
export function ExpectedOutputFold({ cardIndex }: { cardIndex: number }) {
  const card = ELEGANT_CODE_CARDS[cardIndex];
  if (!card || !card.outcomes) return null;
  return (
    <FoldSection
      title="Expected output — what each science's chart reveals"
      description="The 3 outcome tiles above each produce a live chart when you click 'Run analytics'. This fold explains what each chart reveals and why the visual output matters as much as the equation."
    >
      <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
        {card.outcomes.map((o, i) => (
          <div key={i} className="rounded-md border border-border/40 bg-muted/20 p-2">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-[9px] shrink-0" style={{ color: o.accent ?? card.accent }}>
                {o.science}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground/80 text-[11px]">{o.sector}</p>
                <p className="text-[10px] mt-0.5 leading-relaxed">{o.description}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="outline" className="text-[9px] px-1 py-0">{o.skill}</Badge>
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 italic">{o.talent}</Badge>
                </div>
              </div>
            </div>
          </div>
        ))}
        <p className="text-[10px] italic mt-2">
          Images play to a different level of expression to the human mind and brain cells.
          The output of the code and mathematics is always as important as the thought process —
          click "Run analytics" on any tile above to see the equation work on real data.
        </p>
      </div>
    </FoldSection>
  );
}

/**
 * KaTeXRenderer — renders a LaTeX string using KaTeX.
 * Falls back to plain text if KaTeX fails to render.
 */

function KaTeXRenderer({ latex }: { latex: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !latex) return;
    try {
      // Dynamic import of katex (client-side only).
      import("katex").then((katex) => {
        if (containerRef.current) {
          try {
            katex.render(latex, containerRef.current, {
              throwOnError: false,
              displayMode: true,
            });
            setRendered(true);
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          }
        }
      }).catch(() => {
        setError("KaTeX module not available.");
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [latex]);

  if (error) {
    return <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap">{latex}</pre>;
  }

  return (
    <div ref={containerRef} className={`text-sm ${!rendered ? "opacity-0" : "opacity-100"} transition-opacity`}>
      {!rendered && <span className="text-[10px] text-muted-foreground italic">Rendering LaTeX…</span>}
    </div>
  );
}
