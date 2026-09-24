"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KNOWLEDGE_SHORTS, type KnowledgeShort } from "../_data/synthetic";
import { hrefFor } from "../_lib/router";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, ChevronRight, Play, Pause, RotateCcw,
  Heart, Eye, Clock, Sparkles, TrendingUp,
} from "lucide-react";

// ============================================================
// Thompson sampling bandit — adaptive next-short recommendation
// ============================================================
// Tracks per-short (alpha, beta) where:
//   alpha = wins (clicks + completions)
//   beta  = losses (skips + bounces)
// Posterior P(click) ~ Beta(alpha, beta); we sample + pick max.
// Persists to localStorage so the bandit learns across sessions.

interface BanditState {
  [shortId: string]: { alpha: number; beta: number };
}

const BANDIT_KEY = "mdse-shorts-bandit-v1";

function loadBandit(): BanditState {
  try {
    const raw = localStorage.getItem(BANDIT_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  // Cold start: uniform Beta(1, 1) per short
  const init: BanditState = {};
  for (const s of KNOWLEDGE_SHORTS) {
    init[s.id] = { alpha: 1, beta: 1 };
  }
  return init;
}

function saveBandit(state: BanditState) {
  try {
    localStorage.setItem(BANDIT_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

// Sample from Beta(α, β) using two Gamma samples (Marsaglia-Tsang)
function sampleBeta(alpha: number, beta: number): number {
  // Use the simple ratio-of-uniforms approximation for speed
  // Beta(α, β) ≈ Gamma(α) / (Gamma(α) + Gamma(β))
  const x = sampleGamma(alpha);
  const y = sampleGamma(beta);
  return x / (x + y);
}

function sampleGamma(shape: number): number {
  // Marsaglia-Tsang for shape >= 1
  if (shape < 1) shape = 1;
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x = 0, v = 0;
    do {
      x = randomNormal();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function randomNormal(): number {
  // Box-Muller
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function pickNextShort(currentIdx: number, bandit: BanditState): number {
  // Sample from each short's posterior + pick the max
  // Excludes the current short
  let bestIdx = currentIdx;
  let bestSample = -1;
  for (let i = 0; i < KNOWLEDGE_SHORTS.length; i++) {
    if (i === currentIdx) continue;
    const state = bandit[KNOWLEDGE_SHORTS[i].id] ?? { alpha: 1, beta: 1 };
    const sample = sampleBeta(state.alpha, state.beta);
    if (sample > bestSample) {
      bestSample = sample;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function posteriorMean(alpha: number, beta: number): number {
  return alpha / (alpha + beta);
}

// ============================================================
// Animated SVG diagrams per short topic
// ============================================================
function ShortDiagram({ short, progress }: { short: KnowledgeShort; progress: number }) {
  // progress is 0..1 — how much of the animation has played
  switch (short.id) {
    case "ks-1": // Bronze append-only
      return <BronzeAppendDiagram progress={progress} />;
    case "ks-2": // SCD2
      return <SCD2Diagram progress={progress} />;
    case "ks-3": // Delta log
      return <DeltaLogDiagram progress={progress} />;
    case "ks-4": // Snowflake RLS
      return <RLSDiagram progress={progress} />;
    case "ks-5": // dbt slim CI
      return <SlimCIDiagram progress={progress} />;
    case "ks-6": // Medallion
      return <MedallionDiagram progress={progress} />;
    case "ks-7": // Unity Catalogue tags
      return <TaggingDiagram progress={progress} />;
    case "ks-8": // Reverse-ETL
      return <ReverseETLDiagram progress={progress} />;
    case "ks-9": // Airflow + Dagster
      return <HybridOrchDiagram progress={progress} />;
    case "ks-10": // Semantic layer
      return <SemanticLayerDiagram progress={progress} />;
    default:
      return null;
  }
}

// ============================================================
// SVG diagrams
// ============================================================
function BronzeAppendDiagram({ progress }: { progress: number }) {
  // Show rows being appended — no updates. 5 rows appear over the animation.
  const rowsShown = Math.min(5, Math.floor(progress * 5) + 1);
  return (
    <svg viewBox="0 0 320 240" className="w-full h-full">
      <text x="160" y="20" textAnchor="middle" fill="var(--foreground)" fontSize="11" fontWeight="600">Bronze (append-only)</text>
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.rect
          key={i}
          x="40"
          y={40 + i * 32}
          width="240"
          height="24"
          rx="3"
          fill={i < rowsShown ? "var(--chart-2)" : "var(--muted)"}
          opacity={i < rowsShown ? 0.85 : 0.25}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: i < rowsShown ? 0.85 : 0.25, x: 0 }}
          transition={{ delay: i * 0.15 }}
        />
      ))}
      <text x="160" y="220" textAnchor="middle" fill="var(--muted-foreground)" fontSize="9">
        {progress < 0.95 ? "rows append → never overwrite" : "← Bronze = evidence locker"}
      </text>
    </svg>
  );
}

function SCD2Diagram({ progress }: { progress: number }) {
  const showOld = progress > 0.2;
  const showNew = progress > 0.5;
  const showValidTo = progress > 0.75;
  return (
    <svg viewBox="0 0 320 240" className="w-full h-full">
      <text x="160" y="20" textAnchor="middle" fill="var(--foreground)" fontSize="11" fontWeight="600">SCD2 — segment change</text>
      {/* Old row */}
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: showOld ? 1 : 0 }}>
        <rect x="40" y="50" width="240" height="36" rx="3" fill="var(--chart-3)" opacity="0.4" />
        <text x="50" y="72" fill="white" fontSize="10">cust_1 · segment=Standard</text>
        {showValidTo && (
          <text x="270" y="72" fill="white" fontSize="9" textAnchor="end">valid_to=Mar</text>
        )}
      </motion.g>
      {/* Arrow */}
      {showNew && (
        <motion.path
          d="M 160 90 L 160 110 L 160 130"
          stroke="var(--primary)"
          strokeWidth="2"
          markerEnd="url(#arrow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
        />
      )}
      {/* New row */}
      <motion.g initial={{ opacity: 0, y: -10 }} animate={{ opacity: showNew ? 1 : 0, y: showNew ? 0 : -10 }}>
        <rect x="40" y="130" width="240" height="36" rx="3" fill="var(--chart-1)" />
        <text x="50" y="152" fill="white" fontSize="10">cust_1 · segment=VIP</text>
        <text x="50" y="164" fill="white" opacity="0.7" fontSize="9">valid_from=Mar · valid_to=NULL</text>
      </motion.g>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <polygon points="0 0, 8 4, 0 8" fill="var(--primary)" />
        </marker>
      </defs>
    </svg>
  );
}

function DeltaLogDiagram({ progress }: { progress: number }) {
  const commits = Math.min(3, Math.floor(progress * 3) + 1);
  return (
    <svg viewBox="0 0 320 240" className="w-full h-full">
      <text x="160" y="20" textAnchor="middle" fill="var(--foreground)" fontSize="11" fontWeight="600">Delta = Parquet + log</text>
      {/* Log entries */}
      {[0, 1, 2].map((i) => (
        <motion.g key={i} initial={{ opacity: 0, y: -10 }} animate={{ opacity: i < commits ? 1 : 0, y: 0 }} transition={{ delay: i * 0.25 }}>
          <rect x="40" y={40 + i * 28} width="120" height="22" rx="3" fill="var(--chart-3)" opacity="0.6" />
          <text x="50" y={55 + i * 28} fill="white" fontSize="9">v{i + 1}: commit</text>
        </motion.g>
      ))}
      {/* Parquet files */}
      {[0, 1, 2].map((i) => (
        <motion.rect
          key={i}
          x="200"
          y={40 + i * 28}
          width="80"
          height="22"
          rx="3"
          fill="var(--chart-2)"
          opacity={i < commits ? 0.85 : 0.2}
          initial={{ opacity: 0 }}
          animate={{ opacity: i < commits ? 0.85 : 0.2 }}
          transition={{ delay: i * 0.25 + 0.1 }}
        />
      ))}
      <text x="100" y="180" textAnchor="middle" fill="var(--muted-foreground)" fontSize="9">log</text>
      <text x="240" y="180" textAnchor="middle" fill="var(--muted-foreground)" fontSize="9">Parquet</text>
      <line x1="160" y1="50" x2="200" y2="50" stroke="var(--muted-foreground)" strokeWidth="1" strokeDasharray="2 2" />
    </svg>
  );
}

function RLSDiagram({ progress }: { progress: number }) {
  const filtered = progress > 0.6;
  return (
    <svg viewBox="0 0 320 240" className="w-full h-full">
      <text x="160" y="20" textAnchor="middle" fill="var(--foreground)" fontSize="11" fontWeight="600">RLS via session context</text>
      {/* User */}
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <circle cx="50" cy="120" r="14" fill="var(--chart-4)" />
        <text x="50" y="125" textAnchor="middle" fill="white" fontSize="9">U</text>
        <text x="50" y="155" textAnchor="middle" fill="var(--muted-foreground)" fontSize="8">SSO region=UK</text>
      </motion.g>
      {/* View */}
      <motion.rect x="120" y="100" width="80" height="40" rx="3" fill="var(--chart-1)" opacity="0.6" />
      <text x="160" y="125" textAnchor="middle" fill="white" fontSize="9">SECURE VIEW</text>
      {/* Rows */}
      {[0, 1, 2, 3].map((i) => (
        <motion.rect
          key={i}
          x="220"
          y={60 + i * 28}
          width="60"
          height="22"
          rx="2"
          fill="var(--chart-3)"
          opacity={filtered && i % 2 === 0 ? 0.85 : 0.2}
        />
      ))}
      <text x="250" y="185" textAnchor="middle" fill="var(--muted-foreground)" fontSize="8">{filtered ? "UK rows visible" : "all rows"}</text>
    </svg>
  );
}

function SlimCIDiagram({ progress }: { progress: number }) {
  const selectedIdx = Math.floor(progress * 8) % 8;
  return (
    <svg viewBox="0 0 320 240" className="w-full h-full">
      <text x="160" y="20" textAnchor="middle" fill="var(--foreground)" fontSize="11" fontWeight="600">dbt slim CI — only changed + downstream</text>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <motion.rect
          key={i}
          x={20 + (i % 4) * 75}
          y={50 + Math.floor(i / 4) * 50}
          width="65"
          height="36"
          rx="3"
          fill={i === 3 || (selectedIdx === i) ? "var(--chart-1)" : "var(--muted)"}
          opacity={i === 3 || (selectedIdx === i) ? 0.85 : 0.25}
        />
      ))}
      <text x="50" y="72" fill="white" fontSize="8" textAnchor="middle">model_3</text>
      <text x="160" y="200" textAnchor="middle" fill="var(--muted-foreground)" fontSize="9">only changed + downstream → runs</text>
    </svg>
  );
}

function MedallionDiagram({ progress }: { progress: number }) {
  return (
    <svg viewBox="0 0 320 240" className="w-full h-full">
      <text x="160" y="20" textAnchor="middle" fill="var(--foreground)" fontSize="11" fontWeight="600">Bronze → Silver → Gold</text>
      {["Bronze", "Silver", "Gold"].map((layer, i) => {
        const colors = ["var(--chart-2)", "var(--chart-3)", "var(--chart-1)"];
        const active = progress * 3 > i;
        return (
          <motion.g key={layer} initial={{ opacity: 0, x: -20 }} animate={{ opacity: active ? 1 : 0.2, x: 0 }} transition={{ delay: i * 0.3 }}>
            <rect x="40" y={50 + i * 50} width="240" height="36" rx="3" fill={colors[i]} />
            <text x="160" y={72 + i * 50} textAnchor="middle" fill="white" fontSize="10">{layer}</text>
          </motion.g>
        );
      })}
    </svg>
  );
}

function TaggingDiagram({ progress }: { progress: number }) {
  const consumers = ["Hightouch", "Tableau", "Monte Carlo", "Immuta"];
  return (
    <svg viewBox="0 0 320 240" className="w-full h-full">
      <text x="160" y="20" textAnchor="middle" fill="var(--foreground)" fontSize="11" fontWeight="600">Tag once → enforce everywhere</text>
      <rect x="120" y="50" width="80" height="36" rx="3" fill="var(--chart-3)" />
      <text x="160" y="72" textAnchor="middle" fill="white" fontSize="9">pii=true</text>
      {consumers.map((c, i) => {
        const angle = (i / 4) * 2 * Math.PI;
        const x = 160 + 80 * Math.cos(angle);
        const y = 160 + 40 * Math.sin(angle);
        const active = progress > (i + 1) / 5;
        return (
          <motion.g key={c} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: active ? 1 : 0.2, scale: active ? 1 : 0.8 }}>
            <line x1="160" y1="86" x2={x} y2={y} stroke="var(--muted-foreground)" strokeWidth="1" strokeDasharray="2 2" />
            <rect x={x - 32} y={y - 10} width="64" height="20" rx="3" fill="var(--chart-1)" opacity="0.6" />
            <text x={x} y={y + 4} textAnchor="middle" fill="white" fontSize="8">{c}</text>
          </motion.g>
        );
      })}
    </svg>
  );
}

function ReverseETLDiagram({ progress }: { progress: number }) {
  const targets = ["Salesforce", "Klaviyo", "Meta Ads"];
  return (
    <svg viewBox="0 0 320 240" className="w-full h-full">
      <text x="160" y="20" textAnchor="middle" fill="var(--foreground)" fontSize="11" fontWeight="600">Define once → sync to many</text>
      <rect x="120" y="50" width="80" height="36" rx="3" fill="var(--chart-1)" />
      <text x="160" y="72" textAnchor="middle" fill="white" fontSize="9">SQL model</text>
      {targets.map((t, i) => {
        const active = progress > (i + 1) / 4;
        return (
          <motion.g key={t} initial={{ opacity: 0 }} animate={{ opacity: active ? 1 : 0.2 }}>
            <line x1="160" y1="86" x2={50 + i * 100} y2="130" stroke="var(--muted-foreground)" strokeWidth="1" />
            <rect x={20 + i * 100} y="130" width="80" height="28" rx="3" fill="var(--chart-4)" opacity="0.6" />
            <text x={60 + i * 100} y="148" textAnchor="middle" fill="white" fontSize="9">{t}</text>
          </motion.g>
        );
      })}
    </svg>
  );
}

function HybridOrchDiagram({ progress }: { progress: number }) {
  return (
    <svg viewBox="0 0 320 240" className="w-full h-full">
      <text x="160" y="20" textAnchor="middle" fill="var(--foreground)" fontSize="11" fontWeight="600">Airflow (time) + Dagster (assets)</text>
      <rect x="30" y="60" width="120" height="40" rx="3" fill="var(--chart-3)" opacity={progress > 0.3 ? 0.85 : 0.2} />
      <text x="90" y="84" textAnchor="middle" fill="white" fontSize="9">Airflow (DAG)</text>
      <rect x="170" y="60" width="120" height="40" rx="3" fill="var(--chart-1)" opacity={progress > 0.6 ? 0.85 : 0.2} />
      <text x="230" y="84" textAnchor="middle" fill="white" fontSize="9">Dagster (asset)</text>
      <motion.text x="160" y="160" textAnchor="middle" fill="var(--muted-foreground)" fontSize="9" initial={{ opacity: 0 }} animate={{ opacity: progress > 0.85 ? 1 : 0 }}>
        both emit OpenLineage →
      </motion.text>
    </svg>
  );
}

function SemanticLayerDiagram({ progress }: { progress: number }) {
  const consumers = ["Tableau", "Hightouch", "AI agent"];
  return (
    <svg viewBox="0 0 320 240" className="w-full h-full">
      <text x="160" y="20" textAnchor="middle" fill="var(--foreground)" fontSize="11" fontWeight="600">MetricFlow — single source</text>
      <rect x="120" y="50" width="80" height="36" rx="3" fill="var(--chart-1)" />
      <text x="160" y="72" textAnchor="middle" fill="white" fontSize="9">revenue_gbp</text>
      {consumers.map((c, i) => {
        const active = progress > (i + 1) / 4;
        return (
          <motion.g key={c} initial={{ opacity: 0 }} animate={{ opacity: active ? 1 : 0.2 }}>
            <line x1="160" y1="86" x2={60 + i * 100} y2="130" stroke="var(--muted-foreground)" strokeWidth="1" />
            <rect x={20 + i * 100} y="130" width="80" height="28" rx="3" fill="var(--chart-4)" opacity="0.6" />
            <text x={60 + i * 100} y="148" textAnchor="middle" fill="white" fontSize="9">{c}</text>
          </motion.g>
        );
      })}
    </svg>
  );
}

// ============================================================
// Subtitle reveal — word-by-word
// ============================================================
function SubtitleReveal({ text, progress }: { text: string; progress: number }) {
  const words = text.split(" ");
  const visibleCount = Math.min(words.length, Math.floor(progress * words.length) + 1);
  return (
    <p className="text-[11px] text-foreground/90 leading-snug text-center px-2">
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: i < visibleCount ? 1 : 0, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="inline-block mr-1"
        >
          {w}
        </motion.span>
      ))}
    </p>
  );
}

// ============================================================
// Main component
// ============================================================
const SHORT_DURATION_MS = 18000; // 18s per short

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
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [bandit, setBandit] = useState<BanditState>({});
  const [lastInteraction, setLastInteraction] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load bandit state on mount
  useEffect(() => {
    setBandit(loadBandit());
  }, []);

  // Register reward (must be declared before useEffect that uses it)
  const registerReward = useCallback((idx: number, alphaDelta: number, betaDelta: number) => {
    const id = KNOWLEDGE_SHORTS[idx].id;
    setBandit((prev) => {
      const current = prev[id] ?? { alpha: 1, beta: 1 };
      const next = {
        ...prev,
        [id]: {
          alpha: current.alpha + alphaDelta,
          beta: current.beta + betaDelta,
        },
      };
      saveBandit(next);
      return next;
    });
  }, []);

  // Animation loop — advance progress, then auto-advance to next short
  useEffect(() => {
    if (!playing) return;
    const tick = 100; // 100ms
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        const next = p + tick / SHORT_DURATION_MS;
        if (next >= 1) {
          // Reward: completed the short → alpha +1
          registerReward(active, 1, 0);
          // Pick next via bandit
          const nextIdx = pickNextShort(active, loadBandit());
          setActive(nextIdx);
          return 0;
        }
        return next;
      });
    }, tick);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, active, registerReward]);

  function handleNext() {
    registerReward(active, 0, 1); // skip = beta +1
    const nextIdx = pickNextShort(active, loadBandit());
    setActive(nextIdx);
    setProgress(0);
    setLastInteraction(Date.now());
  }

  function handlePrev() {
    setActive((i) => (i - 1 + KNOWLEDGE_SHORTS.length) % KNOWLEDGE_SHORTS.length);
    setProgress(0);
    setLastInteraction(Date.now());
  }

  function handleSelect(idx: number) {
    registerReward(idx, 1, 0); // click = alpha +1
    setActive(idx);
    setProgress(0);
    setLastInteraction(Date.now());
  }

  function handleRestart() {
    setProgress(0);
    setPlaying(true);
  }

  const s = KNOWLEDGE_SHORTS[active];
  const posterior = bandit[s.id] ? posteriorMean(bandit[s.id].alpha, bandit[s.id].beta) : 0.5;

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 oklch(0.55 0.16 165 / 0); }
          50% { box-shadow: 0 0 20px 0 oklch(0.55 0.16 165 / 0.3); }
        }
        .short-card-playing { animation: pulseGlow 2.5s ease-in-out infinite; }
      `}</style>

      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        {/* Active short — vertical video card */}
        <div className="flex flex-col items-center">
          <div
            className={`relative w-64 aspect-[9/16] rounded-xl overflow-hidden bg-gradient-to-br ${ACCENT_BG[s.accent]} shadow-lg ${playing ? "short-card-playing" : ""}`}
          >
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 p-2.5 flex items-center justify-between z-10">
              <span className="text-[9px] uppercase tracking-wider text-white/85 font-semibold">
                {s.topic}
              </span>
              <span className="text-[9px] font-mono text-white/85 bg-black/30 px-1.5 py-0.5 rounded">
                {Math.floor(progress * 30)}s / 30s
              </span>
            </div>

            {/* SVG diagram — animated, takes ~60% of the card */}
            <div className="absolute top-8 left-0 right-0 h-[45%] flex items-center justify-center">
              <div className="w-full h-full">
                <ShortDiagram short={s} progress={progress} />
              </div>
            </div>

            {/* Subtitle body — word-by-word reveal */}
            <div className="absolute top-[55%] left-0 right-0 px-3 pb-12">
              <SubtitleReveal text={s.body} progress={progress} />
            </div>

            {/* Key takeaway — appears at the end */}
            <AnimatePresence>
              {progress > 0.85 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-10 left-2 right-2 rounded-md bg-white/15 backdrop-blur-sm px-2 py-1.5 text-white text-[10px] font-medium text-center"
                >
                  {s.key_takeaway}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress bar at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
              <motion.div
                className="h-full bg-white"
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ ease: "linear" }}
              />
            </div>

            {/* Play/Pause overlay button */}
            <button
              onClick={() => setPlaying((p) => !p)}
              className="absolute top-2 right-12 z-10 p-1.5 rounded-full bg-black/30 backdrop-blur hover:bg-black/40 transition-colors"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="h-3 w-3 text-white" /> : <Play className="h-3 w-3 text-white" />}
            </button>
          </div>

          {/* Controls + metrics */}
          <div className="mt-3 flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrev} aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleRestart} aria-label="Restart">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNext} aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {s.views}</span>
            <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {s.likes}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> 0:30</span>
          </div>
        </div>

        {/* Right panel — short detail + bandit explanation */}
        <div className="space-y-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="rounded-md border border-border/60 p-4 bg-muted/20"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="outline" className="text-[10px]">{s.topic}</Badge>
                <span className="text-[10px] font-mono text-muted-foreground">short {active + 1} of {KNOWLEDGE_SHORTS.length}</span>
              </div>
              <p className="text-base font-semibold leading-snug mb-2">{s.title}</p>
              <p className="text-xs text-foreground/80 leading-relaxed mb-3">{s.body}</p>
              <div className="rounded-md border border-primary/40 bg-primary/5 p-2.5 mb-3">
                <p className="text-[10px] uppercase tracking-wider text-primary/80 mb-0.5">Key takeaway</p>
                <p className="text-sm font-medium text-foreground">{s.key_takeaway}</p>
              </div>
              <Link href={hrefFor(s.related_page as never)} className="text-xs text-primary hover:underline">
                → See this implemented on the {s.related_page} page
              </Link>
            </motion.div>
          </AnimatePresence>

          {/* Bandit explanation — adaptive recommendation */}
          <div className="rounded-md border border-dashed border-border/60 p-3 bg-muted/10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-semibold">Adaptive recommendation (Thompson sampling)</p>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">
              The next short is picked by sampling from each short&apos;s Beta posterior — the bandit learns from your
              clicks (+α) and skips (+β). Over time, the carousel surfaces shorts you&apos;re more likely to engage with.
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              {KNOWLEDGE_SHORTS.map((ks, i) => {
                const state = bandit[ks.id] ?? { alpha: 1, beta: 1 };
                const mean = posteriorMean(state.alpha, state.beta);
                return (
                  <button
                    key={ks.id}
                    onClick={() => handleSelect(i)}
                    className={`flex items-center justify-between gap-1 rounded px-1.5 py-0.5 border transition-colors ${
                      i === active ? "border-primary bg-primary/10" : "border-border/40 hover:bg-accent"
                    }`}
                  >
                    <span className="font-mono text-[9px] truncate">{ks.id}</span>
                    <span className={`font-mono text-[9px] ${mean > 0.6 ? "text-emerald-600 dark:text-emerald-400" : mean < 0.4 ? "text-muted-foreground" : ""}`}>
                      {(mean * 100).toFixed(0)}%
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">
              Current: P(click) = <span className="font-mono text-foreground/80">{(posterior * 100).toFixed(1)}%</span>
              {" "}({bandit[s.id]?.alpha ?? 1}α / {bandit[s.id]?.beta ?? 1}β)
            </div>
          </div>

          {/* Hint */}
          <div className="text-[10px] text-muted-foreground italic">
            <TrendingUp className="inline h-3 w-3 mr-1" />
            Tip: click any short in the grid above to feed the bandit a &quot;win&quot; — the carousel will start surfacing related topics.
          </div>
        </div>
      </div>
    </div>
  );
}
