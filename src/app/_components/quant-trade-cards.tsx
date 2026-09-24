"use client";

import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  X, Cpu, Activity, Brain, Sparkles,
  TrendingUp, Shield,
} from "lucide-react";
import { PyodideRunner } from "./pyodide-runner";
import { CodeBlock } from "./code-block";

/**
 * QuantTradeCards — production-style quant scenarios following the
 * LHC ingestion pattern (cards with lazy popups, multi-language code).
 *
 * Four scenarios, each presented as a clickable card that opens a lazy
 * modal containing:
 *   - Scenario brief (Derivative / Problem / Quant Solution)
 *   - A matrix/table visualising the dynamics
 *   - Multi-language code (Python, Rust, Scala, Elixir) with tabs
 *   - Python version runnable in-browser via Pyodide
 *   - Math foundation + Implementation insight callouts
 *
 * Scenarios:
 *   1. Dynamic Delta Hedging (Black-Scholes Δ hedge over 10 days)
 *   2. Monte Carlo Asian Option (path-dependent arithmetic-average)
 *   3. LSTM Price-Direction Predictor (60-day lookback)
 *   4. GNN Fraud Ring Detection (transaction graph, 2-layer message passing)
 */

// ============================================================
// Shared LazyModal (mirrors LHC ingestion LazyModal)
// ============================================================

interface LazyModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  accent: string;
  icon: ReactNode;
  children: ReactNode;
}

function LazyModal({ open, onClose, title, subtitle, accent, icon, children }: LazyModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

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

function InfoCallout({ intent, math, insight, accent }: { intent: string; math: string; insight: string; accent?: string }) {
  return (
    <div className="mt-4 space-y-2 text-xs">
      <div className="rounded-md border border-border/60 bg-muted/30 p-2.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Design intent</p>
        <p className="text-foreground/80 leading-relaxed">{intent}</p>
      </div>
      <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Math foundation</p>
        <p className="font-mono text-[11px] text-primary leading-relaxed">{math}</p>
      </div>
      <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
        <p className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-0.5">Implementation insight</p>
        <p className="text-emerald-700 dark:text-emerald-400 leading-relaxed">{insight}</p>
      </div>
    </div>
  );
}

// ============================================================
// Multi-language code tab switcher
// ============================================================

interface LangTab {
  lang: string;
  filename: string;
  code: string;
}

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
      <CodeBlock
        language={current.lang}
        filename={current.filename}
        code={current.code}
      />
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
// Scenario card definitions
// ============================================================

interface ScenarioCard {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  accent: string;
  icon: ReactNode;
  badge: string;
  brief: { derivative: string; problem: string; solution: string };
  matrix: ReactNode;
  codeTabs: { lang: string; filename: string; code: string }[];
  runnablePython?: string;
  mathExpr: string;
  intent: string;
  insight: string;
}

// ============================================================
// Delta Hedging matrix (10-day rebalancing table)
// ============================================================

function DeltaHedgeMatrix() {
  const rows = [
    { day: 0,  spot: 100.00, t: 0.0274, delta: 0.5231, action: "Short 1 Call; Buy 0.5231 shares" },
    { day: 1,  spot: 100.53, t: 0.0247, delta: 0.5883, action: "Price rose. Buy 0.0652 more shares" },
    { day: 2,  spot: 101.08, t: 0.0219, delta: 0.6310, action: "Buy 0.0427 more shares" },
    { day: 3,  spot: 101.52, t: 0.0192, delta: 0.6692, action: "Price rose. Buy 0.0382 more shares" },
    { day: 4,  spot: 101.95, t: 0.0164, delta: 0.7108, action: "Buy 0.0416 more shares" },
    { day: 5,  spot: 102.47, t: 0.0137, delta: 0.8610, action: "Price slightly dipped. Sell 0.0012 shares" },
    { day: 6,  spot: 103.10, t: 0.0110, delta: 0.9034, action: "Price rose. Buy 0.0424 more shares" },
    { day: 7,  spot: 103.95, t: 0.0082, delta: 0.9512, action: "Buy 0.0478 more shares" },
    { day: 8,  spot: 104.79, t: 0.0055, delta: 0.9993, action: "Deep ITM. Buy shares up to 0.9993" },
    { day: 9,  spot: 104.85, t: 0.0027, delta: 0.9998, action: "Near expiry. Buy 0.0005 more shares" },
    { day: 10, spot: 104.89, t: 0.0000, delta: 1.0000, action: "Expires ITM. Deliver 1 full share" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          Rebalancing matrix over 10 days (Short 1 Call K=$100, T=10d, σ=20%, r=5%)
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-2 py-1.5 font-semibold">Day</th>
              <th className="text-right px-2 py-1.5 font-semibold">Spot (S)</th>
              <th className="text-right px-2 py-1.5 font-semibold">T (yrs)</th>
              <th className="text-right px-2 py-1.5 font-semibold">Delta (Δ)</th>
              <th className="text-left px-2 py-1.5 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                <td className="px-2 py-1.5 font-mono">{r.day}</td>
                <td className="px-2 py-1.5 font-mono text-right">${r.spot.toFixed(2)}</td>
                <td className="px-2 py-1.5 font-mono text-right">{r.t.toFixed(4)}</td>
                <td className="px-2 py-1.5 font-mono text-right text-primary font-semibold">{r.delta.toFixed(4)}</td>
                <td className="px-2 py-1.5 text-[11px] text-muted-foreground">{r.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 bg-muted/30 border-t border-border/60">
        <p className="text-[10px] text-muted-foreground">
          Delta rises from 0.523 → 1.000 as the option moves deep ITM.
          Continuous rebalancing keeps the portfolio delta-neutral (Δ_short_call + Δ_stock = 0).
          At expiry, algorithm holds 1 full share to cover the assignment.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Asian option payoff diagram
// ============================================================

function AsianPayoffDiagram() {
  // Simulated GBM spot path over 252 days
  const days = 252;
  const path: number[] = [100.0];
  for (let i = 1; i < days; i++) {
    const dt = 1 / 252;
    const z = (Math.sin(i * 0.7) + Math.cos(i * 0.3)) * 0.5;
    const next = path[i - 1] * Math.exp((0.05 - 0.5 * 0.04) * dt + 0.2 * Math.sqrt(dt) * z);
    path.push(next);
  }
  const avg = path.reduce((a, b) => a + b, 0) / path.length;
  const max = Math.max(...path);
  const min = Math.min(...path);
  const range = max - min || 1;

  // 4 sampled points for "average path observation"
  const samples = [63, 126, 189, 252];
  const K = 100;

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-primary" />
          Asian option: arithmetic average vs European payoff (T=1y, 252 obs)
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 400 180" className="w-full h-auto">
          {/* Axes */}
          <line x1="30" y1="140" x2="380" y2="140" stroke="var(--border)" strokeWidth="0.8" />
          <line x1="30" y1="20" x2="30" y2="140" stroke="var(--border)" strokeWidth="0.8" />
          {/* Strike line */}
          <line x1="30" y1={140 - ((K - min) / range) * 110} x2="380"
                y2={140 - ((K - min) / range) * 110}
                stroke="var(--chart-3)" strokeWidth="1" strokeDasharray="4,3" />
          <text x="32" y={140 - ((K - min) / range) * 110 - 4} fontSize="9" fill="var(--chart-3)">
            K=${K}
          </text>
          {/* Average line */}
          <line x1="30" y1={140 - ((avg - min) / range) * 110} x2="380"
                y2={140 - ((avg - min) / range) * 110}
                stroke="var(--chart-2)" strokeWidth="1.5" strokeDasharray="6,3" />
          <text x="280" y={140 - ((avg - min) / range) * 110 - 4} fontSize="9" fill="var(--chart-2)">
            avg = ${avg.toFixed(2)}
          </text>
          {/* Spot path */}
          <polyline
            points={path.map((p, i) => `${30 + (i / (days - 1)) * 350},${140 - ((p - min) / range) * 110}`).join(" ")}
            fill="none"
            stroke="var(--chart-1)"
            strokeWidth="1.5"
          />
          {/* Sample observation points */}
          {samples.map((s, i) => (
            <circle key={i}
              cx={30 + (s / (days - 1)) * 350}
              cy={140 - ((path[s] - min) / range) * 110}
              r="3" fill="var(--chart-4)" stroke="var(--background)" strokeWidth="1" />
          ))}
          {/* Legend */}
          <text x="30" y="14" fontSize="8" fill="var(--foreground)">
            Asian payoff = max(avg(S_i) - K, 0) — less volatile than European
          </text>
        </svg>
      </div>
      <div className="px-3 py-2 bg-muted/30 border-t border-border/60">
        <p className="text-[10px] text-muted-foreground">
          Asian payoff depends on the arithmetic average of 252 daily prices —
          smoother than the European payoff at expiry. Vol-exposure is roughly ½,
          so Asian options trade at lower premium (Asian ≈ $5.4 vs European ≈ $8.0
          for our parameters).
        </p>
      </div>
    </div>
  );
}

// ============================================================
// LSTM architecture diagram
// ============================================================

function LSTMArchitecture() {
  const days = [60, 55, 50, 45, 40, 30, 20, 10, 1];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Brain className="h-3.5 w-3.5 text-primary" />
          LSTM architecture — 60-day OHLCV lookback, 2-layer, 64 hidden
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 400 200" className="w-full h-auto">
          {/* LSTM cells (unrolled) */}
          {days.map((d, i) => {
            const x = 30 + i * 42;
            const isActive = d === 60 || d === 30 || d === 1;
            return (
              <g key={i}>
                <rect x={x} y="70" width="32" height="50" rx="3"
                  fill={isActive ? "oklch(0.65 0.16 250 / 0.4)" : "oklch(0.55 0.05 250 / 0.15)"}
                  stroke={isActive ? "oklch(0.75 0.16 250)" : "oklch(0.45 0.05 250)"}
                  strokeWidth={isActive ? 1.5 : 0.8}
                />
                <text x={x + 16} y="90" textAnchor="middle" fontSize="7"
                      fill={isActive ? "oklch(0.85 0.16 250)" : "oklch(0.55 0.05 250)"}
                      fontWeight="bold">LSTM</text>
                <text x={x + 16} y="100" textAnchor="middle" fontSize="6"
                      fill={isActive ? "oklch(0.75 0.10 250)" : "oklch(0.45 0.05 250)"}>
                  t-{d}
                </text>
                {i < days.length - 1 && (
                  <line x1={x + 32} y1="95" x2={x + 42} y2="95"
                    stroke="oklch(0.55 0.05 250)" strokeWidth="0.8"
                    markerEnd="url(#arrow)" />
                )}
              </g>
            );
          })}
          {/* Hidden state transfer arrow at top */}
          <line x1="60" y1="70" x2="350" y2="70"
            stroke="oklch(0.65 0.16 165)" strokeWidth="1" strokeDasharray="3,2" />
          <text x="200" y="64" textAnchor="middle" fontSize="8"
            fill="oklch(0.65 0.16 165)">hidden state h_t flow</text>

          {/* Input arrows */}
          {days.map((d, i) => {
            const x = 30 + i * 42 + 16;
            return (
              <line key={i} x1={x} y1="140" x2={x} y2="125"
                stroke="oklch(0.55 0.05 60)" strokeWidth="0.8"
                markerEnd="url(#arrow)" />
            );
          })}
          <text x="200" y="155" textAnchor="middle" fontSize="8"
            fill="oklch(0.55 0.16 60)">OHLCV features (5-dim per day)</text>

          {/* Output layer (linear) */}
          <rect x="330" y="70" width="50" height="20" rx="3"
            fill="oklch(0.65 0.16 60 / 0.4)"
            stroke="oklch(0.75 0.16 60)" strokeWidth="1" />
          <text x="355" y="83" textAnchor="middle" fontSize="7"
            fill="oklch(0.85 0.16 60)" fontWeight="bold">Linear</text>
          <line x1="314" y1="95" x2="330" y2="80"
            stroke="oklch(0.55 0.05 250)" strokeWidth="0.8"
            markerEnd="url(#arrow)" />

          {/* Output prediction */}
          <text x="355" y="115" textAnchor="middle" fontSize="9"
            fill="oklch(0.65 0.16 30)" fontWeight="bold">ŷ (up/down)</text>

          {/* Architecture label */}
          <text x="20" y="180" fontSize="8" fill="var(--foreground)">
            Input: (batch=32, seq_len=60, n_features=5) → LSTM(64)×2 → Linear(64→1) → Sigmoid
          </text>
          <text x="20" y="194" fontSize="8" fill="var(--muted-foreground)">
            Fischer 2018: ~52% directional accuracy on S&P 500 daily (1992-2015)
          </text>
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="oklch(0.55 0.05 250 / 0.5)" />
            </marker>
          </defs>
        </svg>
      </div>
    </div>
  );
}

// ============================================================
// GNN fraud ring diagram
// ============================================================

function FraudRingDiagram() {
  // 12 transaction nodes, fraud ring of 3
  const nodes = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 2 * Math.PI;
    return { x: 80 + Math.cos(angle) * 50, y: 60 + Math.sin(angle) * 40, i };
  });
  const fraudRing = [2, 5, 8];
  // Build edges: random + ring
  const edges: { a: number; b: number; isRing: boolean }[] = [];
  for (let k = 0; k < 14; k++) {
    const a = k % 12;
    const b = (k + 3 + (k % 4)) % 12;
    const isRing = fraudRing.includes(a) && fraudRing.includes(b);
    edges.push({ a, b, isRing });
  }
  // Ring cycle
  for (let k = 0; k < fraudRing.length; k++) {
    const a = fraudRing[k];
    const b = fraudRing[(k + 1) % fraudRing.length];
    edges.push({ a, b, isRing: true });
  }

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-primary" />
          GNN fraud ring detection — 2-layer message passing catches cycles
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 200 180" className="w-full h-auto">
          {/* Edges */}
          {edges.map((e, i) => {
            const a = nodes[e.a];
            const b = nodes[e.b];
            return (
              <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={e.isRing ? "oklch(0.65 0.16 0)" : "var(--border)"}
                strokeWidth={e.isRing ? 1.4 : 0.8}
                opacity={e.isRing ? 0.9 : 0.4}
              />
            );
          })}
          {/* Nodes */}
          {nodes.map((n) => {
            const isFraud = fraudRing.includes(n.i);
            return (
              <g key={n.i}>
                <circle cx={n.x} cy={n.y} r={isFraud ? 7 : 4}
                  fill={isFraud ? "oklch(0.65 0.16 0)" : "var(--chart-4)"}
                />
                <text x={n.x} y={n.y - 12} textAnchor="middle" fontSize="7"
                  fill={isFraud ? "oklch(0.65 0.16 0)" : "var(--muted-foreground)"}>
                  T{n.i}
                </text>
              </g>
            );
          })}
          {/* 2-hop message passing arrows */}
          <motion.circle
            cx={nodes[2].x} cy={nodes[2].y} r="14"
            fill="none" stroke="oklch(0.65 0.16 0 / 0.5)"
            strokeWidth="1" strokeDasharray="3,2"
            animate={{ r: [14, 22, 14], opacity: [0.6, 0.1, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
          <motion.circle
            cx={nodes[5].x} cy={nodes[5].y} r="14"
            fill="none" stroke="oklch(0.65 0.16 0 / 0.5)"
            strokeWidth="1" strokeDasharray="3,2"
            animate={{ r: [14, 22, 14], opacity: [0.6, 0.1, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }}
          />
          <text x="100" y="160" textAnchor="middle" fontSize="9"
                fill="var(--foreground)" fontWeight="bold">
            Fraud ring (T2 → T5 → T8 → T2) — 2-hop propagation
          </text>
          <text x="100" y="173" textAnchor="middle" fontSize="8"
                fill="var(--muted-foreground)">
            Per-transaction rules miss this; GNN&apos;s multi-hop features catch it.
          </text>
        </svg>
      </div>
    </div>
  );
}

// ============================================================
// SVI volatility smile diagram
// ============================================================

function SVISmileDiagram() {
  // SVI: w(k) = a + b·[ρ·(k-m) + √((k-m)² + σ²)]
  // Parameters: a=0.04, b=0.30, rho=-0.20, m=0.0, sigma=0.10
  const a = 0.04, b = 0.30, rho = -0.20, m = 0.0, sigma = 0.10, T = 0.25;
  const points = Array.from({ length: 80 }, (_, i) => {
    const k = -0.3 + (i / 79) * 0.6;
    const inner = (k - m) ** 2 + sigma ** 2;
    const w = a + b * (rho * (k - m) + Math.sqrt(inner));
    const vol = Math.sqrt(Math.max(w / T, 0));
    return { k, vol };
  });
  const vols = points.map(p => p.vol);
  const minV = Math.min(...vols), maxV = Math.max(...vols);
  const range = maxV - minV || 1;
  // ATM point (k=0)
  const atmVol = Math.sqrt((a + b * sigma) / T);

  // Market noise around the curve
  const noise = points.map((_, i) => (i % 7 === 0 ? (Math.sin(i) * 0.002) : 0));

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-primary" />
          SVI volatility smile — 3-month European calls on a single underlying
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 400 200" className="w-full h-auto">
          {/* Axes */}
          <line x1="40" y1="170" x2="380" y2="170" stroke="var(--border)" strokeWidth="0.8" />
          <line x1="40" y1="20" x2="40" y2="170" stroke="var(--border)" strokeWidth="0.8" />
          {/* ATM line */}
          <line x1={40 + 0.5 * 340} y1="20" x2={40 + 0.5 * 340} y2="170"
            stroke="var(--chart-3)" strokeWidth="1" strokeDasharray="4,3" />
          <text x={40 + 0.5 * 340 + 4} y="30" fontSize="9" fill="var(--chart-3)">ATM</text>
          {/* SVI curve */}
          <polyline
            points={points.map((p, i) =>
              `${40 + (i / 79) * 340},${170 - ((p.vol - minV) / range) * 130 - 20}`).join(" ")}
            fill="none" stroke="var(--chart-2)" strokeWidth="2"
          />
          {/* Market quotes (noisy dots) */}
          {points.filter((_, i) => i % 5 === 0).map((p, i) => {
            const noisy = p.vol + noise[i * 5];
            return (
              <circle key={i}
                cx={40 + ((i * 5) / 79) * 340}
                cy={170 - ((noisy - minV) / range) * 130 - 20}
                r="3" fill="var(--chart-1)" opacity="0.7" />
            );
          })}
          {/* ATM marker */}
          <circle cx={40 + 0.5 * 340}
            cy={170 - ((atmVol - minV) / range) * 130 - 20}
            r="5" fill="var(--chart-3)" stroke="var(--background)" strokeWidth="1.5" />
          {/* Labels */}
          <text x="20" y="100" textAnchor="middle" fontSize="9" fill="var(--foreground)"
            transform="rotate(-90 20 100)">implied vol</text>
          <text x="210" y="190" textAnchor="middle" fontSize="9" fill="var(--foreground)">
            log-moneyness k = ln(K/F)
          </text>
          <text x="50" y="14" fontSize="9" fill="var(--foreground)" fontWeight="bold">
            SVI: w(k) = a + b·[ρ(k-m) + √((k-m)² + σ²)]
          </text>
          {/* Parameter labels */}
          <text x="270" y="40" fontSize="9" fill="var(--chart-2)">
            a=0.04, b=0.30, ρ=-0.20, m=0, σ=0.10
          </text>
          <text x="270" y="55" fontSize="9" fill="var(--chart-3)">
            ATM vol = {(atmVol * 100).toFixed(2)}%
          </text>
        </svg>
      </div>
      <div className="px-3 py-2 bg-muted/30 border-t border-border/60">
        <p className="text-[10px] text-muted-foreground">
          The 5 SVI parameters (a, b, ρ, m, σ) describe the level, slope, skew, ATM,
          and curvature of the smile. Calibration fits market quotes to the curve
          via Levenberg-Marquardt. No-arbitrage constraint: b·(1+|ρ|) &lt; 4/T.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Markowitz efficient frontier diagram
// ============================================================

function EfficientFrontierDiagram() {
  // 3-asset universe: Stocks, Bonds, Gold
  // mu = [0.10, 0.04, 0.06]
  // Σ = [[0.04, 0.005, 0.002], [0.005, 0.01, -0.001], [0.002, -0.001, 0.02]]
  // rf = 0.02
  const rf = 0.02;
  // MVP point (closed-form): w = Σ^-1·1 / (1'·Σ^-1·1)
  // → roughly stocks 12%, bonds 76%, gold 12%
  const mvp = { vol: 0.094, ret: 0.051 };
  // Tangency point: w = Σ^-1·(μ-rf·1) / (1'·Σ^-1·(μ-rf·1))
  const tan = { vol: 0.152, ret: 0.087 };
  // Frontier curve (parametric from MVP going up)
  const frontier: { vol: number; ret: number }[] = [
    { vol: 0.094, ret: 0.051 },
    { vol: 0.097, ret: 0.055 },
    { vol: 0.105, ret: 0.060 },
    { vol: 0.118, ret: 0.067 },
    { vol: 0.135, ret: 0.075 },
    { vol: 0.152, ret: 0.087 },
    { vol: 0.175, ret: 0.092 },
    { vol: 0.200, ret: 0.100 },
  ];
  // Random feasible portfolios (scatter cloud)
  const cloud = Array.from({ length: 50 }, () => {
    const r1 = Math.random(), r2 = Math.random(), r3 = Math.random();
    const sum = r1 + r2 + r3;
    const w = [r1 / sum, r2 / sum, r3 / sum];
    const mu = [0.10, 0.04, 0.06];
    const cov = [
      [0.040, 0.005, 0.002],
      [0.005, 0.010, -0.001],
      [0.002, -0.001, 0.020],
    ];
    const ret = w.reduce((s, wi, i) => s + wi * mu[i], 0);
    let var_ = 0;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) var_ += w[i] * w[j] * cov[i][j];
    return { vol: Math.sqrt(var_), ret };
  });
  const maxV = 0.22;
  const minX = 40, maxX = 380, minY = 170, maxY = 20;
  const xScale = (v: number) => minX + (v / maxV) * (maxX - minX);
  const yScale = (r: number) => minY - (r / 0.12) * (minY - maxY);

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          Markowitz efficient frontier — 3-asset universe (Stocks, Bonds, Gold)
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 400 200" className="w-full h-auto">
          {/* Axes */}
          <line x1={minX} y1={minY} x2={maxX} y2={minY} stroke="var(--border)" strokeWidth="0.8" />
          <line x1={minX} y1={minY} x2={minX} y2={maxY} stroke="var(--border)" strokeWidth="0.8" />
          {/* Cloud of feasible portfolios */}
          {cloud.map((p, i) => (
            <circle key={i} cx={xScale(p.vol)} cy={yScale(p.ret)} r="2"
              fill="var(--muted-foreground)" opacity="0.4" />
          ))}
          {/* Efficient frontier */}
          <polyline
            points={frontier.map(p => `${xScale(p.vol)},${yScale(p.ret)}`).join(" ")}
            fill="none" stroke="var(--chart-2)" strokeWidth="2"
          />
          {/* MVP */}
          <circle cx={xScale(mvp.vol)} cy={yScale(mvp.ret)} r="5"
            fill="var(--chart-3)" stroke="var(--background)" strokeWidth="1.5" />
          <text x={xScale(mvp.vol) + 8} y={yScale(mvp.ret) - 4} fontSize="9" fill="var(--chart-3)">
            MVP
          </text>
          {/* Tangency portfolio */}
          <circle cx={xScale(tan.vol)} cy={yScale(tan.ret)} r="6"
            fill="var(--chart-1)" stroke="var(--background)" strokeWidth="1.5" />
          <text x={xScale(tan.vol) + 8} y={yScale(tan.ret) - 4} fontSize="9" fill="var(--chart-1)">
            Tangency (max-Sharpe)
          </text>
          {/* Capital Market Line from (0, rf) tangent to frontier */}
          <line x1={xScale(0)} y1={yScale(rf)} x2={maxX}
            y2={yScale(rf) + (maxX - xScale(0)) * ((tan.ret - rf) / tan.vol) * (maxV / 0.12) * -1}
            stroke="var(--chart-4)" strokeWidth="1.5" strokeDasharray="4,3" />
          <text x={maxX - 80} y={yScale(rf) - 6} fontSize="9" fill="var(--chart-4)">
            CML (rf→tangency)
          </text>
          {/* Labels */}
          <text x="20" y="100" textAnchor="middle" fontSize="9" fill="var(--foreground)"
            transform="rotate(-90 20 100)">expected return</text>
          <text x="210" y="190" textAnchor="middle" fontSize="9" fill="var(--foreground)">
            volatility (σ)
          </text>
          <text x="60" y="14" fontSize="9" fill="var(--foreground)" fontWeight="bold">
            min w&apos;Σw  s.t.  w&apos;μ = r_target,  1&apos;w = 1
          </text>
        </svg>
      </div>
      <div className="px-3 py-2 bg-muted/30 border-t border-border/60">
        <p className="text-[10px] text-muted-foreground">
          Frontier = upper envelope of (vol, return) feasible set. MVP minimises
          variance; tangency point maximises Sharpe = (μ_p − rf)/σ_p. Capital
          Market Line (CML) from rf through tangency dominates all portfolios
          on the frontier for a risk-free-asset-inclusive investor.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Deep hedging P&L distribution diagram
// ============================================================

function DeepHedgingPnLDiagram() {
  // Two distributions: BS hedge (wider) vs Deep hedge (tighter tail)
  // Generate via Gaussian mixtures
  const bins = 30;
  const bsHist: number[] = Array.from({ length: bins }, (_, i) => {
    const x = (i - bins / 2) / 5;
    return Math.exp(-(x * x) / 8) * 60;  // wider
  });
  const deepHist: number[] = Array.from({ length: bins }, (_, i) => {
    const x = (i - bins / 2) / 5;
    return Math.exp(-(x * x) / 4) * 80;  // tighter
  });
  const maxH = Math.max(...bsHist, ...deepHist);

  // VaR markers (95%)
  const bsVaR = bins - 1;  // tail right
  const deepVaR = Math.round(bins * 0.85);

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Brain className="h-3.5 w-3.5 text-primary" />
          Deep hedging P&amp;L distribution — tighter tail vs Black-Scholes
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 400 200" className="w-full h-auto">
          {/* Axes */}
          <line x1="30" y1="170" x2="380" y2="170" stroke="var(--border)" strokeWidth="0.8" />
          <line x1="30" y1="20" x2="30" y2="170" stroke="var(--border)" strokeWidth="0.8" />
          {/* BS hedge histogram (red) */}
          {bsHist.map((h, i) => {
            const x = 30 + i * 11.5;
            return (
              <rect key={`bs-${i}`} x={x} y={170 - (h / maxH) * 130}
                width="10" height={(h / maxH) * 130}
                fill="var(--chart-1)" opacity="0.45" />
            );
          })}
          {/* Deep hedge histogram (green) */}
          {deepHist.map((h, i) => {
            const x = 30 + i * 11.5;
            return (
              <motion.rect key={`deep-${i}`}
                initial={{ height: 0, y: 170 }}
                animate={{ height: (h / maxH) * 130, y: 170 - (h / maxH) * 130 }}
                transition={{ duration: 0.3, delay: i * 0.01 }}
                x={x + 1} width="8"
                fill="var(--chart-4)" opacity="0.65" />
            );
          })}
          {/* CVaR markers */}
          <line x1={30 + bsVaR * 11.5} y1="20" x2={30 + bsVaR * 11.5} y2="170"
            stroke="var(--chart-1)" strokeWidth="1.5" strokeDasharray="3,2" />
          <text x={30 + bsVaR * 11.5 - 4} y="14" fontSize="9" fill="var(--chart-1)" textAnchor="end">
            BS CVaR_95
          </text>
          <line x1={30 + deepVaR * 11.5} y1="20" x2={30 + deepVaR * 11.5} y2="170"
            stroke="var(--chart-4)" strokeWidth="1.5" strokeDasharray="3,2" />
          <text x={30 + deepVaR * 11.5 + 4} y="14" fontSize="9" fill="var(--chart-4)">
            Deep CVaR_95
          </text>
          {/* Legend */}
          <rect x="270" y="180" width="10" height="6" fill="var(--chart-1)" opacity="0.6" />
          <text x="285" y="187" fontSize="8" fill="var(--foreground)">BS Delta hedge</text>
          <rect x="160" y="180" width="10" height="6" fill="var(--chart-4)" opacity="0.7" />
          <text x="175" y="187" fontSize="8" fill="var(--foreground)">Deep hedge (Buehler 2019)</text>
          {/* Axis labels */}
          <text x="200" y="195" textAnchor="middle" fontSize="9" fill="var(--foreground)">
            hedged P&amp;L
          </text>
        </svg>
      </div>
      <div className="px-3 py-2 bg-muted/30 border-t border-border/60">
        <p className="text-[10px] text-muted-foreground">
          BS Delta over-trades under transaction costs (assumes zero). Deep
          hedging NN learns to skip small rebalances when cost exceeds the
          gamma benefit → tighter left-tail (lower CVaR) for same mean P&amp;L.
          Buehler 2019 reports 20-40% CVaR reduction on realistic cost levels.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// CVA expected exposure profile diagram
// ============================================================

function CVAExposureDiagram() {
  // EE profile over 5 years (50 time steps)
  // Typical EE rises then falls as time-to-maturity shrinks
  const n = 51;
  const ee = Array.from({ length: n }, (_, i) => {
    const t = i / 50;
    // EE(t) = call value at time t, with random walk
    return 8.5 * Math.exp(-t * 0.1) * (1 + 0.3 * Math.sin(t * 4)) * (1 - t * 0.6);
  });
  const maxEE = Math.max(...ee);
  // EPE = mean of EE profile
  const epe = ee.reduce((a, b) => a + b, 0) / ee.length;

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-primary" />
          CVA expected exposure profile — EE(t) over 5 years
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 400 200" className="w-full h-auto">
          {/* Axes */}
          <line x1="30" y1="170" x2="380" y2="170" stroke="var(--border)" strokeWidth="0.8" />
          <line x1="30" y1="20" x2="30" y2="170" stroke="var(--border)" strokeWidth="0.8" />
          {/* EPE line */}
          <line x1="30" y1={170 - (epe / maxEE) * 130} x2="380"
            y2={170 - (epe / maxEE) * 130}
            stroke="var(--chart-3)" strokeWidth="1.5" strokeDasharray="6,3" />
          <text x="280" y={170 - (epe / maxEE) * 130 - 4} fontSize="9" fill="var(--chart-3)">
            EPE = {epe.toFixed(2)}
          </text>
          {/* EE curve */}
          <polyline
            points={ee.map((v, i) => `${30 + (i / 50) * 350},${170 - (v / maxEE) * 130}`).join(" ")}
            fill="none" stroke="var(--chart-1)" strokeWidth="2" />
          {/* Shaded area under EE */}
          <polyline
            points={`30,170 ` + ee.map((v, i) =>
              `${30 + (i / 50) * 350},${170 - (v / maxEE) * 130}`).join(" ") + ` 380,170`}
            fill="var(--chart-1)" opacity="0.15" />
          {/* Year markers */}
          {[0, 1, 2, 3, 4, 5].map(y => (
            <g key={y}>
              <line x1={30 + (y / 5) * 350} y1="170" x2={30 + (y / 5) * 350} y2="174"
                stroke="var(--border)" strokeWidth="0.8" />
              <text x={30 + (y / 5) * 350} y="184" textAnchor="middle" fontSize="8"
                fill="var(--muted-foreground)">{y}y</text>
            </g>
          ))}
          {/* Labels */}
          <text x="20" y="100" textAnchor="middle" fontSize="9" fill="var(--foreground)"
            transform="rotate(-90 20 100)">EE(t)</text>
          <text x="60" y="14" fontSize="9" fill="var(--foreground)" fontWeight="bold">
            CVA = Σ_t  LGD · EE(t) · PD(t) · DF(t)
          </text>
          <text x="60" y="28" fontSize="9" fill="var(--chart-2)">
            LGD=0.60, hazard=0.02 → CVA ≈ 0.42 USD (rf price 21.07 → 20.65)
          </text>
        </svg>
      </div>
      <div className="px-3 py-2 bg-muted/30 border-t border-border/60">
        <p className="text-[10px] text-muted-foreground">
          EE(t) = mean positive exposure at time t (simulated via GBM).
          EPE = time-averaged EE. CVA = LGD · EPE · PD integrated with
          discounting — the credit risk component of XVA. Other XVA
          components: DVA (own credit), FVA (funding), MVA (margin), KVA (capital).
        </p>
      </div>
    </div>
  );
}

export { LazyModal, InfoCallout, MultiLangCode, DeltaHedgeMatrix, AsianPayoffDiagram, LSTMArchitecture, FraudRingDiagram, SVISmileDiagram, EfficientFrontierDiagram, DeepHedgingPnLDiagram, CVAExposureDiagram };

// ============================================================
// Main component — QuantTradeCards
// ============================================================

import {
  DELTA_HEDGE_PYTHON, DELTA_HEDGE_RUST, DELTA_HEDGE_SCALA, DELTA_HEDGE_ELIXIR,
  ASIAN_OPTION_PYTHON, ASIAN_OPTION_RUST, ASIAN_OPTION_SCALA, ASIAN_OPTION_ELIXIR,
} from "./_quant_trade_code";
import {
  LSTM_PYTHON, LSTM_RUST, LSTM_SCALA, LSTM_ELIXIR,
  GNN_PYTHON, GNN_RUST, GNN_SCALA, GNN_ELIXIR,
} from "./_quant_trade_code2";
import {
  SVI_PYTHON, SVI_RUST, SVI_SCALA, SVI_ELIXIR,
  MARKOWITZ_PYTHON, MARKOWITZ_RUST, MARKOWITZ_SCALA, MARKOWITZ_ELIXIR,
} from "./_quant_trade_code3";
import {
  DEEP_HEDGE_PYTHON, DEEP_HEDGE_RUST, DEEP_HEDGE_SCALA, DEEP_HEDGE_ELIXIR,
  CVA_PYTHON, CVA_RUST, CVA_SCALA, CVA_ELIXIR,
} from "./_quant_trade_code4";

const SCENARIOS: ScenarioCard[] = [
  {
    id: "delta-hedge",
    step: "1",
    title: "Dynamic Delta Hedging",
    subtitle: "Short 1 European Call → rebalance Δ daily over 10 days",
    accent: "oklch(0.65 0.16 30)",
    icon: <TrendingUp className="h-4 w-4" />,
    badge: "Black-Scholes Δ",
    brief: {
      derivative: "Short 1 European Call Option (Strike K=$100, Maturity T=10 days, Volatility σ=20%, Risk-free rate r=5%).",
      problem: "If the stock price rises, the option value goes up, losing the short-seller money.",
      solution: "The algorithm calculates the Delta (Δ) of the option continuously using the Black-Scholes formula and buys a matching fractional share of the underlying stock to immunise the portfolio against small stock price moves.",
    },
    matrix: <DeltaHedgeMatrix />,
    codeTabs: [
      { lang: "python", filename: "delta_hedge.py", code: DELTA_HEDGE_PYTHON },
      { lang: "rust", filename: "delta_hedge.rs", code: DELTA_HEDGE_RUST },
      { lang: "scala", filename: "DeltaHedging.scala", code: DELTA_HEDGE_SCALA },
      { lang: "elixir", filename: "delta_hedge.ex", code: DELTA_HEDGE_ELIXIR },
    ],
    runnablePython: DELTA_HEDGE_PYTHON,
    mathExpr: "Δ_call = N(d₁),  d₁ = (ln(S/K) + (r + σ²/2)·T) / (σ·√T)  ·  rebalance to keep Δ_short_call + Δ_stock = 0",
    intent: "Demonstrate the canonical Black-Scholes delta-hedging recipe: at each tick, hold −Δ shares of stock against a short option position. The resulting portfolio is locally riskless (no first-order S exposure) — the foundation of every options market-maker's risk system.",
    insight: "Continuous rebalancing drives P&L variance to zero (Black-Scholes replication theorem). Discrete daily rebalancing leaves a small gamma/theta residual — that residual is precisely what the Black-Scholes gamma term prices. Modern deep-hedging networks (Buehler 2019) optimise this residual directly under realistic transaction costs.",
  },
  {
    id: "asian-option",
    step: "2",
    title: "Monte Carlo Asian Option (Path-Dependent)",
    subtitle: "Arithmetic-average call via 10⁴ antithetic GBM paths",
    accent: "oklch(0.65 0.16 165)",
    icon: <Activity className="h-4 w-4" />,
    badge: "MC + antithetic",
    brief: {
      derivative: "Asian call option with arithmetic-average payoff: max((1/N)·Σ Sᵢ − K, 0), N=252 daily observations, K=$100, T=1 year.",
      problem: "No closed-form solution exists for arithmetic-average Asian options (unlike geometric-average, which has the Kemna-Vorst 1990 formula). Pricing requires simulation.",
      solution: "Simulate 10,000 GBM price paths under the risk-neutral measure (μ → r), compute the average and payoff on each, then discount and average. Antithetic variates (Z and −Z) cut the standard error by ~50% for free.",
    },
    matrix: <AsianPayoffDiagram />,
    codeTabs: [
      { lang: "python", filename: "asian_option.py", code: ASIAN_OPTION_PYTHON },
      { lang: "rust", filename: "asian_option.rs", code: ASIAN_OPTION_RUST },
      { lang: "scala", filename: "AsianOptionPricer.scala", code: ASIAN_OPTION_SCALA },
      { lang: "elixir", filename: "asian_option.ex", code: ASIAN_OPTION_ELIXIR },
    ],
    runnablePython: ASIAN_OPTION_PYTHON,
    mathExpr: "Payoff = max((1/N)·Σ Sᵢ − K, 0)  ·  Sᵢ = S₀·exp((r − ½σ²)·Δt + σ·√Δt·Zᵢ)  ·  Price = e^(−rT)·E[Payoff]",
    intent: "Showcase Monte Carlo pricing of path-dependent options where no closed form exists. The arithmetic-average Asian is the canonical test case for variance-reduction techniques (antithetic, control variates, importance sampling).",
    insight: "Antithetic variates pair each path Z with −Z, exploiting the negative correlation to halve the standard error at zero extra compute cost. GPU implementations (CuPy, JAX, PyTorch on A100) reach 100M paths/sec, enabling real-time XVA (CVA/DVA/FVA) computation for exotic derivatives books at JP Morgan, HSBC, and Allianz.",
  },
  {
    id: "lstm-predictor",
    step: "3",
    title: "LSTM Price-Direction Predictor",
    subtitle: "60-day OHLCV lookback → 2-layer LSTM(64) → up/down signal",
    accent: "oklch(0.65 0.16 250)",
    icon: <Brain className="h-4 w-4" />,
    badge: "Fischer 2018",
    brief: {
      derivative: "A learned trading signal: predict next-day direction (up/down) of a single stock from 60 days of OHLCV features (open, high, low, close, volume log-returns).",
      problem: "Daily equity returns are dominated by noise (~1% σ) — random baseline is exactly 50% directional accuracy. Any edge must come from weakly-stationary structure (mean reversion, momentum) that LSTM can pick up.",
      solution: "Train a 2-layer LSTM with 64 hidden units on 10+ years of S&P 500 constituents. The hidden state captures multi-timescale dependencies; output head is a single sigmoid for direction. Fischer 2018 reports ~52-54% hit rate — small but economically significant given leverage.",
    },
    matrix: <LSTMArchitecture />,
    codeTabs: [
      { lang: "python", filename: "lstm_predictor.py", code: LSTM_PYTHON },
      { lang: "rust", filename: "lstm_predictor.rs", code: LSTM_RUST },
      { lang: "scala", filename: "LSTMTrainer.scala", code: LSTM_SCALA },
      { lang: "elixir", filename: "lstm_inference.ex", code: LSTM_ELIXIR },
    ],
    runnablePython: LSTM_PYTHON,
    mathExpr: "h_t = o_t · tanh(c_t)  ·  c_t = f_t·c_{t-1} + i_t·g_t  ·  f,i,o = σ(W·[h_{t-1}, x_t])  ·  g = tanh(W·[h_{t-1}, x_t])",
    intent: "Demonstrate the architecture used in the most-cited deep-learning-for-trading paper (Fischer & Krauss 2018). 4-gate LSTM (Hochreiter 1997) is the canonical sequence model; the 2-layer + sigmoid head is the standard config for binary direction prediction.",
    insight: "The 52% hit rate sounds marginal, but corresponds to a Sharpe ratio of ~1.0 when long top-decile / short bottom-decile of predictions (Fischer 2018). Recent transformer-based forecasters (PatchTST, TimeLLM) edge out LSTM on long-horizon tasks, but LSTM remains the production choice for high-frequency signal generation due to lower latency and smaller model size.",
  },
  {
    id: "gnn-fraud",
    step: "4",
    title: "GNN Fraud Ring Detection",
    subtitle: "2-layer GraphSAGE on transaction graph → 2-class classifier",
    accent: "oklch(0.65 0.16 0)",
    icon: <Shield className="h-4 w-4" />,
    badge: "Weber 2019",
    brief: {
      derivative: "A binary classifier on transaction-graph nodes: predict which accounts are part of a coordinated fraud ring (laundering cycle, peel chain, synthetic identity).",
      problem: "Per-transaction rule systems (velocity checks, IP blacklists) cannot detect multi-hop structures — a fraud ring is invisible when each individual transaction looks legitimate.",
      solution: "Build a graph where nodes = accounts and edges = shared attributes (IP, device, merchant). Train a 2-layer GraphSAGE-style GNN that aggregates neighbour features via message passing. Multi-hop propagation lets each node 'see' the structure of its 2-hop neighbourhood — exactly where rings live.",
    },
    matrix: <FraudRingDiagram />,
    codeTabs: [
      { lang: "python", filename: "fraud_gnn.py", code: GNN_PYTHON },
      { lang: "rust", filename: "fraud_gnn.rs", code: GNN_RUST },
      { lang: "scala", filename: "FraudGNN.scala", code: GNN_SCALA },
      { lang: "elixir", filename: "fraud_gnn.ex", code: GNN_ELIXIR },
    ],
    runnablePython: GNN_PYTHON,
    mathExpr: "h_v^(l+1) = σ(W·h_v^(l) + mean_{u∈N(v)} W·h_u^(l))  ·  classifier(h_v^(L)) → P(fraud)",
    intent: "Implement the GraphSAGE architecture (Hamilton 2017) for the Weber 2019 'Scale' fraud-detection benchmark. Multi-hop message passing is the key — single-hop rules cannot see cycles. The same architecture powers Visa, Mastercard, PayPal, and JPMorgan production fraud systems.",
    insight: "GNN-based fraud detection achieves 5-10x higher fraud recall than rule-based systems at the same false-positive rate. The graph structure carries information that no per-transaction feature can — a single fraud ring member is flagged because its 2-hop neighbourhood is unusually dense and reciprocal.",
  },
  {
    id: "svi-vol-surface",
    step: "5",
    title: "SVI Volatility Surface Calibration",
    subtitle: "5-parameter vol smile (Gatheral 2004) — Levenberg-Marquardt fit",
    accent: "oklch(0.65 0.16 200)",
    icon: <Activity className="h-4 w-4" />,
    badge: "Gatheral 2004",
    brief: {
      derivative: "Volatility surface σ(K, T) for an option book — implied vols differ across strikes/maturities (volatility smile/smirk). Must be arbitrage-free.",
      problem: "Direct interpolation of market implied vols often produces arbitrage-violating surfaces (calendar-spread or butterfly arbitrage). Need a parametric form that guarantees no-arbitrage and fits market quotes.",
      solution: "Fit the 5-parameter SVI model: w(k) = a + b·[ρ·(k-m) + √((k-m)² + σ²)] where w is total implied variance, k is log-moneyness. The SVI form guarantees no calendar-spread arbitrage when b·(1+|ρ|) < 4/T. Calibrate via Levenberg-Marquardt.",
    },
    matrix: <SVISmileDiagram />,
    codeTabs: [
      { lang: "python", filename: "svi_calibration.py", code: SVI_PYTHON },
      { lang: "rust", filename: "svi_calibration.rs", code: SVI_RUST },
      { lang: "scala", filename: "SVICalibrator.scala", code: SVI_SCALA },
      { lang: "elixir", filename: "svi_calibrator.ex", code: SVI_ELIXIR },
    ],
    runnablePython: SVI_PYTHON,
    mathExpr: "w(k) = a + b·[ρ·(k-m) + √((k-m)² + σ²)]  ·  no-arb: b·(1+|ρ|) < 4/T",
    intent: "Calibrate the 5-parameter SVI volatility surface (Gatheral 2004) to market implied volatilities. SVI's parametric form guarantees no calendar-spread arbitrage and is the industry standard for listed-option desks (CBOE, CME option market-makers).",
    insight: "SVI is preferred over spline interpolation because it has only 5 parameters (vs 20+ for cubic splines), is smooth, and obeys the Lee-Wingpertinger no-arbitrage bounds. Production calibration uses Levenberg-Marquardt with parameter scaling; the linear part (a, b) for fixed (ρ, m, σ) is solved via OLS as a warm-start, then refined via nonlinear optimisation.",
  },
  {
    id: "markowitz-frontier",
    step: "6",
    title: "Markowitz Efficient Frontier",
    subtitle: "min w'Σw s.t. w'μ = r_target, 1'w = 1 (Markowitz 1952, Nobel 1990)",
    accent: "oklch(0.65 0.16 60)",
    icon: <TrendingUp className="h-4 w-4" />,
    badge: "Markowitz 1952",
    brief: {
      derivative: "A portfolio of 3 assets: Stocks (μ=10%, σ=20%), Bonds (μ=4%, σ=10%), Gold (μ=6%, σ=14%) with given covariance matrix.",
      problem: "Choose weights w to minimise risk (variance) for a target return — or equivalently, maximise return for a given risk budget. The 'efficient frontier' is the upper envelope of feasible (risk, return) points.",
      solution: "Solve the closed-form quadratic program: w(r) = Σ^-1·[μ | 1]·A^-1·[r ; 1] where A is a 2×2 matrix of risk-free-covariance scalars. The frontier traces out the optimal trade-off; the tangency point maximises Sharpe = (μ_p − rf)/σ_p.",
    },
    matrix: <EfficientFrontierDiagram />,
    codeTabs: [
      { lang: "python", filename: "markowitz_frontier.py", code: MARKOWITZ_PYTHON },
      { lang: "rust", filename: "markowitz_frontier.rs", code: MARKOWITZ_RUST },
      { lang: "scala", filename: "MarkowitzOptimizer.scala", code: MARKOWITZ_SCALA },
      { lang: "elixir", filename: "markowitz.ex", code: MARKOWITZ_ELIXIR },
    ],
    runnablePython: MARKOWITZ_PYTHON,
    mathExpr: "min w'Σw  s.t.  w'μ = r_target,  1'w = 1  ·  tangency: w_tan ∝ Σ^-1·(μ − rf·1)",
    intent: "Implement Markowitz's mean-variance optimisation (1952, Nobel 1990) in closed form — the foundation of modern portfolio theory. Compute the efficient frontier, minimum-variance portfolio, and tangency (max-Sharpe) point.",
    insight: "Markowitz IS the same convex optimisation (QP) as regularised least-squares ML training — Σ plays the role of the Gram matrix X'X, the Sharpe ratio is signal-to-noise. The whole of mean-variance finance IS regularised ML, understood fifty years before 'machine learning' was named.",
  },
  {
    id: "deep-hedging",
    step: "7",
    title: "Deep Hedging (Buehler 2019)",
    subtitle: "NN learns hedge action via CVaR minimisation under transaction costs",
    accent: "oklch(0.65 0.16 320)",
    icon: <Brain className="h-4 w-4" />,
    badge: "Buehler 2019",
    brief: {
      derivative: "Hedging a short option position with realistic transaction costs (5 bps per share). Black-Scholes assumes zero costs — real markets have costs that eat P&L.",
      problem: "BS Delta continuously rebalances, which is optimal when costs are zero. With costs, the optimal hedge deviates from BS Delta — small rebalances should be skipped when cost exceeds the gamma P&L benefit.",
      solution: "Train a neural network h(state_t) → hedge action. Loss = CVaR_α of hedged P&L across 10⁷-10⁹ simulated paths. The NN learns to trade less when costs outweigh the gamma benefit, producing tighter P&L tails than BS Delta under realistic frictions.",
    },
    matrix: <DeepHedgingPnLDiagram />,
    codeTabs: [
      { lang: "python", filename: "deep_hedging.py", code: DEEP_HEDGE_PYTHON },
      { lang: "rust", filename: "deep_hedging.rs", code: DEEP_HEDGE_RUST },
      { lang: "scala", filename: "DeepHedger.scala", code: DEEP_HEDGE_SCALA },
      { lang: "elixir", filename: "deep_hedger.ex", code: DEEP_HEDGE_ELIXIR },
    ],
    runnablePython: DEEP_HEDGE_PYTHON,
    mathExpr: "min_θ  CVaR_α( Σ_t h_θ(state_t)·ΔS_t − premium − costs − payoff )  ·  α = 0.95",
    intent: "Implement Buehler 2019's deep-hedging recipe: replace the BS Delta hedge rule with a neural network trained to minimise CVaR of hedged P&L. The NN learns to optimise hedge actions under transaction costs and market impact — things BS Delta ignores.",
    insight: "Deep hedging outperforms BS Delta by 20-40% in after-cost P&L variance under realistic cost levels (Buehler 2019). Production deployed at JP Morgan, HSBC, and Allianz. This is the strongest case for ML in derivatives: not prediction of prices, but optimisation of actions — the same RL-as-stochastic-control framing as Atari agents.",
  },
  {
    id: "cva-xva",
    step: "8",
    title: "CVA / XVA (Counterparty Credit Risk)",
    subtitle: "CVA = E[LGD · EE(t) · PD(t)] — Basel III FRTB regulatory capital",
    accent: "oklch(0.65 0.16 165)",
    icon: <Shield className="h-4 w-4" />,
    badge: "Basel III FRTB",
    brief: {
      derivative: "Counterparty credit risk on a 5-year European call. If the counterparty defaults before expiry, lose the positive replacement value of the trade.",
      problem: "Risk-free option pricing (Black-Scholes) assumes the counterparty never defaults. Real counterparties (corporates, hedge funds) have non-zero default probability — must adjust the price for credit risk.",
      solution: "CVA = E[LGD · EE · PD] integrated over time. LGD = Loss Given Default (1 - recovery rate); EE(t) = Expected Exposure at time t (positive replacement value, simulated via Monte Carlo); PD(t) = Probability of Default between t and t+dt (intensity model from credit spread). CVA + DVA + FVA + MVA + KVA = full XVA framework.",
    },
    matrix: <CVAExposureDiagram />,
    codeTabs: [
      { lang: "python", filename: "cva_xva.py", code: CVA_PYTHON },
      { lang: "rust", filename: "cva_xva.rs", code: CVA_RUST },
      { lang: "scala", filename: "CVAEngine.scala", code: CVA_SCALA },
      { lang: "elixir", filename: "cva_engine.ex", code: CVA_ELIXIR },
    ],
    runnablePython: CVA_PYTHON,
    mathExpr: "CVA = Σ_t  LGD · EE(t) · PD(t) · DF(t)  ·  XVA = CVA + DVA + FVA + MVA + KVA",
    intent: "Compute CVA — the credit valuation adjustment — via Monte Carlo exposure simulation. This is the regulatory capital metric under Basel III FRTB and the foundation of the broader XVA framework (DVA, FVA, MVA, KVA) used by every bank's counterparty risk desk.",
    insight: "CVA is computed daily on the full OTC derivatives portfolio (10⁵-10⁶ trades × 10⁴ paths each = 10⁹-10¹⁰ simulation steps). The XVA desk is now a profit centre at every major bank — AFRM (JP Morgan), EQD (Goldman), etc. pre-trade price XVA, post-trade hedge it. The same exposure profile feeds CVA, DVA, FVA, MVA, and KVA — one simulation, five adjustments.",
  },
];

export function QuantTradeCards() {
  const [openId, setOpenId] = useState<string | null>(null);
  const openCard = openId ? SCENARIOS.find((s) => s.id === openId) : null;

  return (
    <div className="space-y-4">
      {/* Intro */}
      <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
        <p className="text-sm font-semibold text-primary mb-1 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4" /> 8 quant scenarios · 4 languages each · click any card
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Each card opens a lazy popup with the scenario brief (Derivative, Problem, Quant Solution),
          a visualisation matrix (rebalancing table / vol smile / efficient frontier / fraud-ring graph / etc.),
          multi-language code (Python / Rust / Scala / Elixir), an in-browser Pyodide runner, and the
          math-foundation + implementation-insight callouts. The pattern mirrors the LHC ingestion cards
          on the ELT+ETL page — same lazy-modal architecture, different domain (quant finance vs physics data).
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {SCENARIOS.map((s) => (
          <motion.button
            key={s.id}
            type="button"
            onClick={() => setOpenId(s.id)}
            className="relative rounded-xl overflow-hidden border border-border/60 hover:border-primary/60 hover:shadow-lg transition-all bg-gradient-to-br from-card to-muted/30 group text-left"
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            aria-label={`Open: ${s.title}`}
          >
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                  style={{ backgroundColor: s.accent + "20" }}>
                  {s.icon}
                </div>
                <Badge variant="outline" className="text-[10px]" style={{ color: s.accent }}>
                  {s.badge}
                </Badge>
              </div>
              <p className="text-xs font-bold leading-tight" style={{ color: s.accent }}>
                {s.title}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 font-mono leading-snug">{s.subtitle}</p>

              {/* Mini preview: scenario card step indicator */}
              <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="font-mono">step {s.step}/8</span>
                <span>·</span>
                <span className="font-mono">Python · Rust · Scala · Elixir</span>
              </div>
            </div>
            {/* Accent strip */}
            <div className="h-1" style={{ backgroundColor: s.accent }} />
          </motion.button>
        ))}
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
                <p className="font-semibold text-foreground/80 inline">The Derivative: </p>
                <span className="text-muted-foreground">{openCard.brief.derivative}</span>
              </div>
              <div>
                <p className="font-semibold text-foreground/80 inline">The Problem: </p>
                <span className="text-muted-foreground">{openCard.brief.problem}</span>
              </div>
              <div>
                <p className="font-semibold text-foreground/80 inline">The Quant Solution: </p>
                <span className="text-muted-foreground">{openCard.brief.solution}</span>
              </div>
            </div>

            {/* Matrix / diagram */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Visualisation</p>
              {openCard.matrix}
            </div>

            {/* Multi-language code */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Code — 4 languages (Python · Rust · Scala · Elixir)
              </p>
              <MultiLangCode tabs={openCard.codeTabs} runnablePython={openCard.runnablePython} />
            </div>

            {/* Info callout */}
            <InfoCallout
              intent={openCard.intent}
              math={openCard.mathExpr}
              insight={openCard.insight}
              accent={openCard.accent}
            />
          </div>
        )}
      </LazyModal>
    </div>
  );
}
