"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  X, Cpu, Database, Atom, Sparkles, TrendingUp, Boxes, Zap,
} from "lucide-react";
import { PyodideRunner } from "./pyodide-runner";
import { CodeBlock } from "./code-block";

/**
 * DatasetCards — reusable cards-with-lazy-popups component for showing
 * large real/synthetic dataset examples in 5 languages (Scala/Rust/Go/Elixir/Zig).
 *
 * Mirrors the QuantTradeCards pattern but for data lakehouse scenarios.
 * Used by /iceberg, /glue, /delta-lake, /hudi, /data-lakehouse, /catalogs.
 *
 * Each card opens a lazy popup with:
 *   - Scenario brief (Dataset / Scale / Why it matters)
 *   - Dataset stats (size, source, fields)
 *   - Multi-language code tabs (Scala · Rust · Go · Elixir · Zig + optional Python)
 *   - Pyodide runner (if Python version provided)
 *   - Implementation insight
 */

interface LangTab {
  lang: string;
  filename: string;
  code: string;
}

export interface DatasetExample {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  accent: string;
  icon: ReactNode;
  badge: string;
  brief: {
    dataset: string;
    scale: string;
    why: string;
  };
  stats: { label: string; value: string }[];
  codeTabs: LangTab[];
  runnablePython?: string;
  insight: string;
  tools: string[];  // computational tools mentioned
}

interface DatasetCardsProps {
  examples: DatasetExample[];
  intro?: string;
  /** Optional: returns the list of host page IDs that the card at this index appears on. */
  hostedOnByIndex?: (index: number) => string[];
  /** Optional: anchor prefix for each card (e.g. "card-" → id="card-0", "card-1", …). */
  anchorPrefix?: string;
}

// ============================================================
// Shared LazyModal — mirrors QuantTradeCards LazyModal
// ============================================================

function LazyModal({
  open, onClose, title, subtitle, accent, icon, children,
}: {
  open: boolean; onClose: () => void; title: string;
  subtitle?: string; accent: string; icon: ReactNode; children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 md:p-6 overflow-y-auto"
          onClick={onClose}
        >
          <button
            type="button" onClick={onClose}
            className="absolute top-3 right-3 z-30 p-2 rounded-full bg-background/90 border border-border hover:bg-accent transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="absolute top-3 left-3 z-30 px-3 py-1.5 rounded-full bg-background/90 border border-border flex items-center gap-2 text-xs font-semibold">
            <span style={{ color: accent }}>{icon}</span>
            <span style={{ color: accent }}>{title}</span>
            {subtitle && <span className="text-muted-foreground font-normal hidden md:inline">· {subtitle}</span>}
          </div>
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-5xl my-8 rounded-xl border border-border bg-background shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border/40 bg-muted/20 px-4 md:px-6 py-3 flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                style={{ backgroundColor: accent + "20" }}>
                {icon}
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold leading-tight" style={{ color: accent }}>{title}</p>
                {subtitle && <p className="text-xs text-muted-foreground font-mono">{subtitle}</p>}
              </div>
            </div>
            <div className="p-4 md:p-6 max-h-[85vh] overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// Multi-language code tab switcher
// ============================================================

function MultiLangCode({ tabs, runnablePython }: { tabs: LangTab[]; runnablePython?: string }) {
  const [active, setActive] = useState(0);
  const current = tabs[active];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((t, i) => (
          <button
            key={t.lang}
            type="button"
            onClick={() => setActive(i)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
              i === active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border hover:border-primary hover:bg-accent"
            }`}
          >
            {t.lang.toUpperCase()}
          </button>
        ))}
      </div>
      <CodeBlock language={current.lang} filename={current.filename} code={current.code} />
      {runnablePython && (
        <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
          <p className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Python — run in browser (Pyodide)
          </p>
          <PyodideRunner
            buttonLabel={`Run ${current.lang === "python" ? "Python" : "Python equivalent"} (Pyodide)`}
            code={runnablePython}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main component
// ============================================================

export function DatasetCards({ examples, intro, hostedOnByIndex, anchorPrefix }: DatasetCardsProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const openCard = openId ? examples.find((e) => e.id === openId) : null;

  return (
    <div className="space-y-4">
      {intro && (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-primary mb-1 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" /> {examples.length} dataset examples · 5 languages each · click any card
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">{intro}</p>
        </div>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {examples.map((e, idx) => {
          const hostedOn = hostedOnByIndex ? hostedOnByIndex(idx) : [];
          return (
            <motion.button
              key={e.id}
              id={anchorPrefix ? `${anchorPrefix}${idx}` : undefined}
              type="button"
              onClick={() => setOpenId(e.id)}
              className="relative rounded-xl overflow-hidden border border-border/60 hover:border-primary/60 hover:shadow-lg transition-all bg-gradient-to-br from-card to-muted/30 group text-left scroll-mt-20"
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              aria-label={`Open: ${e.title}`}
            >
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                    style={{ backgroundColor: e.accent + "20" }}>
                    {e.icon}
                  </div>
                  <Badge variant="outline" className="text-[10px]" style={{ color: e.accent }}>
                    {e.badge}
                  </Badge>
                </div>
                <p className="text-xs font-bold leading-tight" style={{ color: e.accent }}>
                  {e.title}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 font-mono leading-snug">{e.subtitle}</p>
                {/* Mini preview: dataset stats */}
                <div className="mt-3 space-y-0.5 text-[10px]">
                  {e.stats.slice(0, 3).map((s) => (
                    <div key={s.label} className="flex justify-between text-muted-foreground">
                      <span>{s.label}</span>
                      <span className="font-mono">{s.value}</span>
                    </div>
                  ))}
                </div>
                {/* Hosted-on badge (only if provided) */}
                {hostedOn.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/40">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Hosted on</p>
                    <div className="flex flex-wrap gap-1">
                      {hostedOn.map((h) => (
                        <span key={h} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          /{h}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Step indicator */}
                <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="font-mono">example {e.step}/{examples.length}</span>
                  <span>·</span>
                  <span className="font-mono">Scala · Rust · Go · Elixir · Zig</span>
                </div>
              </div>
              <div className="h-1" style={{ backgroundColor: e.accent }} />
            </motion.button>
          );
        })}
      </div>

      {/* Lazy modal */}
      <LazyModal
        open={!!openCard}
        onClose={() => setOpenId(null)}
        title={openCard?.title ?? ""}
        subtitle={openCard?.subtitle}
        accent={openCard?.accent ?? "oklch(0.55 0.16 250)"}
        icon={openCard?.icon ?? <Cpu className="h-4 w-4" />}
      >
        {openCard && (
          <div className="space-y-5">
            {/* Brief */}
            <div className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-2 text-xs">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Scenario brief</p>
              <div>
                <p className="font-semibold text-foreground/80 inline">Dataset: </p>
                <span className="text-muted-foreground">{openCard.brief.dataset}</span>
              </div>
              <div>
                <p className="font-semibold text-foreground/80 inline">Scale: </p>
                <span className="text-muted-foreground">{openCard.brief.scale}</span>
              </div>
              <div>
                <p className="font-semibold text-foreground/80 inline">Why it matters: </p>
                <span className="text-muted-foreground">{openCard.brief.why}</span>
              </div>
            </div>

            {/* Stats grid */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Dataset stats</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {openCard.stats.map((s) => (
                  <div key={s.label} className="rounded-md border border-border/60 bg-card p-2 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                    <p className="font-mono text-sm font-bold text-primary">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Computational tools */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Computational tooling</p>
              <div className="flex flex-wrap gap-1.5">
                {openCard.tools.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                ))}
              </div>
            </div>

            {/* Multi-language code */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Code — 5 languages (Scala · Rust · Go · Elixir · Zig)
              </p>
              <MultiLangCode tabs={openCard.codeTabs} runnablePython={openCard.runnablePython} />
            </div>

            {/* Insight */}
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-0.5">
                Implementation insight
              </p>
              <p className="text-emerald-700 dark:text-emerald-400 text-xs leading-relaxed">{openCard.insight}</p>
            </div>
          </div>
        )}
      </LazyModal>
    </div>
  );
}

export { DatasetCards };
