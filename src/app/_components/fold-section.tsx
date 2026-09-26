"use client";

import { useState, type ReactNode } from "react";
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
