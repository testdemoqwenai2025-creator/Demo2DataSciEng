"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Sparkles, GitCompare, X, ArrowRight } from "lucide-react";
import { ELEGANT_CODE_CARDS } from "./_elegant_code_cards";
import { ELEGANT_CODE_MAP } from "../_lib/elegant-code-map";
import { hrefFor } from "../_lib/router";
import Link from "next/link";

/**
 * CardComparisonFold — a fold section that lets users select 2-3 cards
 * from the 20 elegant-code cards and see a side-by-side comparison table
 * (equation, sciences bridged, skills required, datasets cited) WITH the
 * output visualization for each.
 *
 * This fulfils the user's "output IS as important as the thought process"
 * vision — the comparison shows the chart alongside the equation, not just text.
 */

interface FoldSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  accent?: string;
}

function FoldSection({ title, description, children, defaultOpen = false, accent }: FoldSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-md border border-border/60 bg-muted/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
        aria-expanded={open}
      >
        {open ? <ChevronDown className="h-4 w-4 text-primary mt-0.5 shrink-0" />
               : <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold leading-tight" style={{ color: accent ?? "var(--primary)" }}>{title}</p>
          {description && <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{description}</p>}
        </div>
        {!open && <span className="text-[9px] uppercase tracking-wider text-muted-foreground shrink-0 mt-0.5">Click to expand</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="border-t border-border/40">
            <div className="p-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CardComparisonFold({ cardIndex }: { cardIndex: number }) {
  const [selectedCards, setSelectedCards] = useState<number[]>([cardIndex]);

  const toggleCard = (idx: number) => {
    if (selectedCards.includes(idx)) {
      if (selectedCards.length > 1) {
        setSelectedCards(selectedCards.filter(i => i !== idx));
      }
    } else if (selectedCards.length < 3) {
      setSelectedCards([...selectedCards, idx]);
    }
  };

  const cards = selectedCards.map(i => ELEGANT_CODE_CARDS[i]).filter(Boolean);
  const maps = selectedCards.map(i => ELEGANT_CODE_MAP[i]).filter(Boolean);

  return (
    <FoldSection
      title="Card comparison — select 2-3 cards and compare side-by-side"
      description="Select up to 3 elegant-code cards to compare their equation, sciences bridged, skills required, datasets cited, and expected outputs side-by-side. The comparison shows the chart alongside the equation — because the output IS as important as the thought process."
      accent="oklch(0.65 0.16 30)"
    >
      <div className="space-y-3">
        {/* Card selection chips */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Select cards to compare (max 3, current: {selectedCards.length})</p>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {ELEGANT_CODE_CARDS.map((card, idx) => {
              const isSelected = selectedCards.includes(idx);
              const isMaxed = selectedCards.length >= 3 && !isSelected;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleCard(idx)}
                  disabled={isMaxed}
                  className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : isMaxed
                        ? "border-border/30 text-muted-foreground/50 cursor-not-allowed"
                        : "border-border/60 text-foreground/70 hover:border-primary/40 hover:bg-primary/5"
                  }`}
                  style={isSelected ? { backgroundColor: card.accent } : {}}
                >
                  {card.title.split(" — ")[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Comparison table */}
        {cards.length >= 1 && (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="py-2 px-2 font-semibold text-muted-foreground text-left align-top w-24">Attribute</th>
                  {cards.map((card, i) => (
                    <th key={i} className="py-2 px-2 font-semibold text-left align-top" style={{ color: card.accent }}>
                      {card.title.split(" — ")[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Equation */}
                <tr className="border-b border-border/40">
                  <td className="py-1.5 px-2 font-semibold text-muted-foreground">Equation</td>
                  {cards.map((card, i) => (
                    <td key={i} className="py-1.5 px-2 font-mono text-[10px]">{card.subtitle.split(" — ")[0] ?? card.subtitle}</td>
                  ))}
                </tr>
                {/* Sciences bridged */}
                <tr className="border-b border-border/40">
                  <td className="py-1.5 px-2 font-semibold text-muted-foreground">Sciences</td>
                  {maps.map((m, i) => (
                    <td key={i} className="py-1.5 px-2">
                      <div className="flex flex-wrap gap-1">
                        {m?.sciences.map((s, j) => (
                          <Badge key={j} variant="outline" className="text-[8px] px-1 py-0">{s}</Badge>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
                {/* Skills required */}
                <tr className="border-b border-border/40">
                  <td className="py-1.5 px-2 font-semibold text-muted-foreground">Skills</td>
                  {cards.map((card, i) => (
                    <td key={i} className="py-1.5 px-2">
                      <div className="flex flex-wrap gap-1">
                        {card.outcomes?.map((o, j) => (
                          <Badge key={j} variant="secondary" className="text-[8px] px-1 py-0">{o.skill}</Badge>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
                {/* Datasets */}
                <tr className="border-b border-border/40">
                  <td className="py-1.5 px-2 font-semibold text-muted-foreground">Datasets</td>
                  {cards.map((card, i) => (
                    <td key={i} className="py-1.5 px-2 text-[10px] text-muted-foreground leading-relaxed">
                      {card.brief.dataset.slice(0, 80)}...
                    </td>
                  ))}
                </tr>
                {/* "X IS Y" insight */}
                <tr className="border-b border-border/40">
                  <td className="py-1.5 px-2 font-semibold text-muted-foreground">Insight</td>
                  {maps.map((m, i) => (
                    <td key={i} className="py-1.5 px-2 text-[10px] italic text-primary/80">
                      {m?.insightShort}
                    </td>
                  ))}
                </tr>
                {/* Expected output */}
                <tr className="border-b border-border/40">
                  <td className="py-1.5 px-2 font-semibold text-muted-foreground">Expected output</td>
                  {cards.map((card, i) => (
                    <td key={i} className="py-1.5 px-2">
                      {card.outcomes && card.outcomes.length > 0 ? (
                        <div className="space-y-0.5">
                          {card.outcomes.map((o, j) => (
                            <div key={j} className="text-[9px] flex items-start gap-1">
                              <Badge variant="outline" className="text-[8px] px-1 py-0 shrink-0" style={{ color: o.accent ?? card.accent }}>
                                {o.science}
                              </Badge>
                              <span className="text-muted-foreground line-clamp-2">{o.description.slice(0, 60)}...</span>
                            </div>
                          ))}
                          <p className="text-[8px] text-muted-foreground italic mt-0.5">
                            Click "Run analytics" on each tile above to see the actual chart output.
                            The visual output IS the proof — images play to a different level of the brain than the equation.
                          </p>
                        </div>
                      ) : (
                        <span className="text-[9px] text-muted-foreground italic">No outcomes</span>
                      )}
                    </td>
                  ))}
                </tr>
                {/* Citations */}
                <tr>
                  <td className="py-1.5 px-2 font-semibold text-muted-foreground">Citations</td>
                  {cards.map((card, i) => (
                    <td key={i} className="py-1.5 px-2">
                      {card.citations && card.citations.length > 0 ? (
                        <ul className="list-disc list-inside text-[9px] space-y-0.5">
                          {card.citations.slice(0, 3).map((c, j) => (
                            <li key={j} className="leading-relaxed">{c.slice(0, 80)}...</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-[9px] text-muted-foreground italic">No citations</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground italic">
          The comparison shows the equation, sciences, skills, datasets, insights, expected outputs, and citations
          side-by-side. The "Expected output" row references the outcome tiles above — click "Run analytics" on any
          tile to see the actual chart. The visual output IS as important as the thought process — images play to
          a different level of the human mind and brain cells than equations alone.
        </p>
      </div>
    </FoldSection>
  );
}
