"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  X, Cpu, Database, Atom, Sparkles, TrendingUp, Boxes, Zap,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Cell,
} from "recharts";
import { PyodideRunner } from "./pyodide-runner";
import { CodeBlock } from "./code-block";
import { SkillConstellation } from "./skill-constellation";
import { FoldSection, EquationFamilyFold, DeeperMathFold, ProductionPatternsFold, CitationsFold, ExpectedOutputFold } from "./fold-section";

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

/**
 * ExpectedOutcome — one science the equation bridges, with the chart/analytics
 * it produces, the skill needed to read it, and the talent the sector rewards.
 *
 * Rendered as a 3-tile grid in the modal. Each tile has a compact PyodideRunner
 * that produces the analytics output (numbers, ASCII chart, etc.).
 */
export interface ExpectedOutcome {
  /** Science name (e.g., "Genomics") */
  science: string;
  /** Real-world sector / dataset (e.g., "1000-Genomes Project") */
  sector: string;
  /** Skill needed to interpret the output (e.g., "Computational biologist") */
  skill: string;
  /** Talent the sector rewards (e.g., "sees population structure in matrices") */
  talent: string;
  /** Python code that produces the analytics output (ASCII chart or numbers) */
  code: string;
  /** What the output reveals — the insight that comes from reading it */
  description: string;
  /** Optional accent color (defaults to card accent) */
  accent?: string;
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
  /** Optional: expected outcomes per science the equation bridges (typically 3 tiles). */
  outcomes?: ExpectedOutcome[];
  /** Optional: LaTeX-formatted mathematical derivation for DeeperMathFold. */
  math?: string;
  /** Optional: explicit citations per card (author, year, title, URL). */
  citations?: string[];
}

interface DatasetCardsProps {
  examples: DatasetExample[];
  intro?: string;
  /** Optional: returns the list of host page IDs that the card at this index appears on. */
  hostedOnByIndex?: (index: number) => string[];
  /** Optional: returns the live-demo URL for the card at this index, or null/undefined if none. */
  liveDemoByIndex?: (index: number) => string | null | undefined;
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
// OutcomeTile — one science's expected outcome (chart + skill + talent)
// ============================================================

function OutcomeTile({ outcome, accent }: { outcome: ExpectedOutcome; accent: string }) {
  const [chartData, setChartData] = useState<unknown>(null);
  const [chartType, setChartType] = useState<"bar" | "line" | "multi-line" | null>(null);

  // Try to parse the stdout as JSON and infer chart type from the structure.
  const handleOutput = (stdout: string) => {
    const nonEmptyLines = stdout.split("\n").filter((l) => l.trim().length > 0);
    if (nonEmptyLines.length === 0) return;
    const lastLine = nonEmptyLines[nonEmptyLines.length - 1];
    try {
      const parsed = JSON.parse(lastLine);
      // Detect chart shape:
      // - Array of {x, y, [series]} → if 'series' field exists, multi-line; else single line
      // - Array of {label, value} → bar chart
      // - Object with "chart_type" field → use that
      // - Object with "series" field → multi-series line chart
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object") {
        const first = parsed[0];
        const hasXY = "x" in first && "y" in first;
        const hasLabelValue = "label" in first && "value" in first;
        const hasSeries = "series" in first;
        if (hasXY && hasSeries) {
          // Multi-series line: [{x, y, series}, ...] — group by series.
          setChartData(parsed);
          setChartType("multi-line");
          return;
        }
        if (hasXY || hasLabelValue) {
          setChartData(parsed);
          setChartType(hasLabelValue ? "bar" : "line");
          return;
        }
      }
      if (parsed && typeof parsed === "object" && "chart_type" in parsed) {
        const t = (parsed as { chart_type: string }).chart_type;
        if (t === "bar" || t === "line" || t === "multi-line") {
          setChartData(parsed);
          setChartType(t);
          return;
        }
      }
      // Object with explicit "series" array → multi-series line chart
      if (parsed && typeof parsed === "object" && "series" in parsed
          && Array.isArray((parsed as { series: unknown[] }).series)) {
        setChartData(parsed);
        setChartType("multi-line");
        return;
      }
      // Not a recognised chart shape — keep text output.
      setChartData(null);
      setChartType(null);
    } catch {
      setChartData(null);
      setChartType(null);
    }
  };

  // Auto-load PyodideRunner; only show the chart once we have chartData.
  return (
    <div className="rounded-md border border-border/60 bg-muted/30 p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: accent }}>
          {outcome.science}
        </p>
      </div>
      <p className="text-[10px] text-muted-foreground leading-snug">{outcome.sector}</p>
      <div className="flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[9px] px-1 py-0">{outcome.skill}</Badge>
        <Badge variant="secondary" className="text-[9px] px-1 py-0 italic">{outcome.talent}</Badge>
      </div>
      <PyodideRunner
        code={outcome.code}
        buttonLabel="Run analytics"
        compact
        onOutput={handleOutput}
        // Only hide text output if we successfully parsed a chart.
        hideTextOutput={chartData !== null && chartType !== null}
      />
      {/* Real chart (if JSON output was parsed) */}
      {chartData !== null && chartType === "bar" && Array.isArray(chartData) && (
        <div style={{ width: "100%", height: 180 }}>
          <ResponsiveContainer>
            <BarChart data={chartData as Array<Record<string, unknown>>} margin={{ top: 4, right: 8, bottom: 16, left: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={9} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={9} />
              <Tooltip />
              <Bar dataKey="value" fill={accent}>
                {(chartData as Array<Record<string, unknown>>).map((_, i) => (
                  <Cell key={i} fill={accent} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {chartData !== null && chartType === "line" && Array.isArray(chartData) && (
        <div style={{ width: "100%", height: 180 }}>
          <ResponsiveContainer>
            <LineChart data={chartData as Array<Record<string, unknown>>} margin={{ top: 4, right: 8, bottom: 16, left: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} />
              <XAxis dataKey="x" stroke="hsl(var(--muted-foreground))" fontSize={9} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={9} />
              <Tooltip />
              <Line type="monotone" dataKey="y" stroke={accent} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* Multi-series line chart: array of {x, y, series} → group by series */}
      {chartData !== null && chartType === "multi-line" && Array.isArray(chartData) && (() => {
        const rows = chartData as Array<{ x: number | string; y: number; series: string }>;
        // Pivot: rows → {x, [series1]: y1, [series2]: y2, ...}
        const xValues = Array.from(new Set(rows.map((r) => r.x)));
        const seriesNames = Array.from(new Set(rows.map((r) => r.series)));
        const pivotData = xValues.map((x) => {
          const row: Record<string, number | string> = { x };
          for (const sn of seriesNames) {
            const match = rows.find((r) => r.x === x && r.series === sn);
            row[sn] = match ? match.y : 0;
          }
          return row;
        });
        // Distinct colors per series (cycle through hues).
        const seriesColors = ["#2563eb", "#dc2626", "#16a34a", "#ca8a04", "#9333ea", "#0891b2"];
        return (
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={pivotData} margin={{ top: 4, right: 8, bottom: 16, left: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} />
                <XAxis dataKey="x" stroke="hsl(var(--muted-foreground))" fontSize={9} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={9} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                {seriesNames.map((sn, i) => (
                  <Line
                    key={sn}
                    type="monotone"
                    dataKey={sn}
                    stroke={seriesColors[i % seriesColors.length]}
                    strokeWidth={1.5}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })()}
      {/* Multi-series line chart: object with explicit "series" array of {name, data: [{x, y}]} */}
      {chartData !== null && chartType === "multi-line" && !Array.isArray(chartData)
        && typeof chartData === "object" && "series" in (chartData as Record<string, unknown>)
        && Array.isArray((chartData as { series: unknown }).series) && (() => {
        const obj = chartData as { series: Array<{ name: string; color?: string; data: Array<{ x: number | string; y: number }> }> };
        // Pivot: series[] → {x, [series1.name]: y1, ...}
        const xValues = Array.from(new Set(obj.series.flatMap((s) => s.data.map((d) => d.x))));
        const pivotData = xValues.map((x) => {
          const row: Record<string, number | string | undefined> = { x };
          for (const s of obj.series) {
            const match = s.data.find((d) => d.x === x);
            row[s.name] = match ? match.y : undefined;
          }
          return row;
        });
        const fallbackColors = ["#2563eb", "#dc2626", "#16a34a", "#ca8a04", "#9333ea", "#0891b2"];
        return (
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={pivotData} margin={{ top: 4, right: 8, bottom: 16, left: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} />
                <XAxis dataKey="x" stroke="hsl(var(--muted-foreground))" fontSize={9} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={9} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                {obj.series.map((s, i) => (
                  <Line
                    key={s.name}
                    type="monotone"
                    dataKey={s.name}
                    stroke={s.color ?? fallbackColors[i % fallbackColors.length]}
                    strokeWidth={1.5}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })()}
      <p className="text-[10px] text-muted-foreground leading-relaxed">{outcome.description}</p>
    </div>
  );
}

// ============================================================
// Main component
// ============================================================

export function DatasetCards({ examples, intro, hostedOnByIndex, liveDemoByIndex, anchorPrefix }: DatasetCardsProps) {
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
          const liveHref = liveDemoByIndex ? liveDemoByIndex(idx) : null;
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
                {/* Live-demo CTA (only if a live URL is provided for this card) */}
                {liveHref && (
                  <a
                    href={liveHref}
                    className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
                    onClick={(ev) => ev.stopPropagation()}
                  >
                    <Sparkles className="h-3 w-3" /> Run it live →
                  </a>
                )}
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
            {/* View full live demo — deep-link to /living-* page */}
            {(() => {
              const openIdx = examples.findIndex((e) => e.id === openCard.id);
              const liveHref = liveDemoByIndex && openIdx >= 0 ? liveDemoByIndex(openIdx) : null;
              return liveHref ? (
                <a
                  href={liveHref}
                  className="block rounded-md border border-primary/40 bg-primary/5 p-3 hover:bg-primary/10 transition-colors"
                >
                  <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    View full live demo →
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Open {liveHref} in a new tab — drag sliders and watch the math work on real data, with full charts and 3-tab (Math / Live / Production) context.
                  </p>
                </a>
              ) : null;
            })()}

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

            {/* Expected outcomes — what this equation produces in each science */}
            {openCard.outcomes && openCard.outcomes.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                  Expected outcomes — what this equation produces in each science (click "Run analytics" on any tile)
                </p>
                <div className="grid md:grid-cols-3 gap-2">
                  {openCard.outcomes.map((o, i) => (
                    <OutcomeTile key={i} outcome={o} accent={o.accent ?? openCard.accent} />
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground italic mt-2 leading-relaxed">
                  Each tile shows the analytics output when this equation lands on a different science's data.
                  The skill and talent badges name what each sector rewards — so you can see, at a glance,
                  what kind of mind this equation belongs to in each world it walks across.
                </p>
              </div>
            )}

            {/* Skill constellation — where else this card's skills show up */}
            {openCard.outcomes && openCard.outcomes.length > 0 && (() => {
              const openIdx = examples.findIndex((e) => e.id === openCard.id);
              return openIdx >= 0 ? (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                    Skill constellation — where else this card's 3 skills show up
                  </p>
                  <SkillConstellation
                    cardIndex={openIdx}
                    height={240}
                    onCardClick={(targetIdx) => {
                      // Switch the modal to the clicked card (close current + open target).
                      const targetCard = examples[targetIdx];
                      if (targetCard) {
                        setOpenId(targetCard.id);
                        // Scroll to top of modal so the new card is visible from the start.
                        setTimeout(() => {
                          const modal = document.querySelector(".max-h-\\[85vh\\]");
                          if (modal) modal.scrollTop = 0;
                        }, 50);
                      }
                    }}
                  />
                </div>
              ) : null;
            })()}

            {/* Fold sections — deeper phases of the repository, revealed on demand.
                The "fold option" leads for further code examples, mathematics (where
                needed), and desired or expected output. Collapsed by default; the
                user clicks to expand. Keeps the basic card content (brief, stats,
                code, outcomes, constellation, insight) lightweight. */}
            {(() => {
              const openIdx = examples.findIndex((e) => e.id === openCard.id);
              return openIdx >= 0 ? (
                <div className="space-y-2">
                  <EquationFamilyFold
                    cardIndex={openIdx}
                    onCardClick={(targetIdx) => {
                      const targetCard = examples[targetIdx];
                      if (targetCard) {
                        setOpenId(targetCard.id);
                        setTimeout(() => {
                          const modal = document.querySelector(".max-h-\\[85vh\\]");
                          if (modal) modal.scrollTop = 0;
                        }, 50);
                      }
                    }}
                  />
                  <DeeperMathFold cardIndex={openIdx} />
                  <ProductionPatternsFold cardIndex={openIdx} />
                  <ExpectedOutputFold cardIndex={openIdx} />
                  <CitationsFold cardIndex={openIdx} />
                </div>
              ) : null;
            })()}

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
