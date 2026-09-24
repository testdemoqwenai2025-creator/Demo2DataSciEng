"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  X, Atom, Box, Layers, Network, Cpu, Activity, TrendingUp, TrendingDown,
  RotateCcw, Play, Sparkles, DollarSign, BarChart3, AlertTriangle,
} from "lucide-react";
import {
  Slider,
  LazyModal,
  InfoCallout,
} from "./space-interactives-part1";

/**
 * FintechInteractives — 8 fully interactive fintech visuals, each opening
 * in a lazy browser popup. Mirrors the space/quantum-interactives.tsx
 * pattern but with quantitative-finance topics: Black-Scholes option
 * pricing, Monte Carlo VaR, GNN fraud detection, HFT microstructure,
 * portfolio optimisation, volatility surface, yield curve, and a
 * real-time data toggle (Yahoo Finance API + synthetic fallback).
 *
 * Lazy evaluation: each interactive's heavy SVG + state only mounts when
 * the user clicks its card.
 *
 * Topics in contention:
 *   - Black-Scholes assumptions (constant vol, no jumps, lognormal) —
 *     vs jump-diffusion (Merton 1976) vs local vol (Dupire 1994) vs
 *     stochastic vol (Heston 1993) vs rough vol (Bayer 2016)
 *   - VaR vs Expected Shortfall (ES/CVaR) — Basel III/IV transition
 *   - GNN fraud detection vs traditional rule-based
 *   - HFT — maker-taker debate, payment for order flow (PFOF)
 *   - Portfolio — Markowitz vs Black-Litterman vs risk-parity vs Hierarchical
 *     Risk Parity (López de Prado 2017)
 */

// ============================================================
// Interactive 1: Black-Scholes calculator
// ============================================================

function BlackScholesCalculator() {
  const [S, setS] = useState(100);     // spot price
  const [K, setK] = useState(100);     // strike
  const [r, setR] = useState(0.05);    // risk-free rate (annual)
  const [sigma, setSigma] = useState(0.2); // volatility
  const [T, setT] = useState(1.0);     // time to maturity (years)
  const [type, setType] = useState<"call" | "put">("call");

  // Normal CDF — Abramowitz & Stegun approximation
  function normCdf(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - p : p;
  }
  function normPdf(x: number): number {
    return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
  }

  // Black-Scholes: C = S·N(d1) - K·e^(-rT)·N(d2); P = K·e^(-rT)·N(-d2) - S·N(-d1)
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  const Nd1 = normCdf(d1);
  const Nd2 = normCdf(d2);
  const callPrice = S * Nd1 - K * Math.exp(-r * T) * Nd2;
  const putPrice = K * Math.exp(-r * T) * (1 - Nd2) - S * (1 - Nd1);
  const price = type === "call" ? callPrice : putPrice;

  // Greeks
  const delta = type === "call" ? Nd1 : Nd1 - 1;
  const gamma = normPdf(d1) / (S * sigma * Math.sqrt(T));
  const vega = S * normPdf(d1) * Math.sqrt(T) / 100; // per 1% vol
  const theta = type === "call"
    ? (-(S * normPdf(d1) * sigma) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * Nd2) / 365 // per day
    : (-(S * normPdf(d1) * sigma) / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * (1 - Nd2)) / 365;
  const rho = (type === "call" ? K * T * Math.exp(-r * T) * Nd2 : -K * T * Math.exp(-r * T) * (1 - Nd2)) / 100;

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 360 280" className="w-full h-auto">
            {/* Payoff diagram at maturity */}
            <line x1="20" y1="180" x2="340" y2="180" stroke="oklch(0.55 0.10 250 / 0.4)" strokeWidth="0.5" />
            <line x1="20" y1="20" x2="20" y2="240" stroke="oklch(0.55 0.10 250 / 0.4)" strokeWidth="0.5" />
            {/* Strike vertical */}
            <line x1={20 + ((K - 50) / 100) * 320} y1="20" x2={20 + ((K - 50) / 100) * 320} y2="240" stroke="oklch(0.65 0.16 250 / 0.3)" strokeWidth="0.5" strokeDasharray="2 2" />
            {/* Spot vertical */}
            <line x1={20 + ((S - 50) / 100) * 320} y1="20" x2={20 + ((S - 50) / 100) * 320} y2="240" stroke="oklch(0.65 0.16 30 / 0.3)" strokeWidth="0.5" strokeDasharray="2 2" />
            {/* Payoff curve */}
            {type === "call" ? (
              <polyline
                points={`${20},${180} ${20 + ((K - 50) / 100) * 320},${180} ${20 + ((S + 50 - 50) / 100) * 320},${180 - ((S + 50) - K) * 2}`}
                fill="none" stroke="oklch(0.75 0.20 30)" strokeWidth="1.5"
              />
            ) : (
              <polyline
                points={`${20},${180 - (K - 50) * 2} ${20 + ((K - 50) / 100) * 320},${180} ${340},${180}`}
                fill="none" stroke="oklch(0.75 0.20 250)" strokeWidth="1.5"
              />
            )}
            {/* Current price dot */}
            <circle cx={20 + ((S - 50) / 100) * 320} cy={180 - (price * 2)} r="4" fill={type === "call" ? "oklch(0.85 0.20 30)" : "oklch(0.85 0.20 250)"} stroke="oklch(0.65 0.10 250)" strokeWidth="1" />
            <text x="180" y="265" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
              Spot $50 → $150 · payoff at maturity
            </text>
            <text x="180" y="278" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
              {type === "call" ? "Long Call" : "Long Put"} · Strike ${K}
            </text>
          </svg>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType("call")}
              className={`h-10 rounded-md border text-xs font-semibold transition-all ${type === "call" ? "bg-emerald-600 text-white border-emerald-600" : "bg-card border-border hover:border-emerald-500"}`}
            >Call (↑)</button>
            <button
              type="button"
              onClick={() => setType("put")}
              className={`h-10 rounded-md border text-xs font-semibold transition-all ${type === "put" ? "bg-rose-600 text-white border-rose-600" : "bg-card border-border hover:border-rose-500"}`}
            >Put (↓)</button>
          </div>
          <Slider label="Spot S ($)" min={50} max={150} step={1} value={S} onChange={setS} format={(v) => `$${v.toFixed(0)}`} accent="oklch(0.65 0.16 30)" />
          <Slider label="Strike K ($)" min={50} max={150} step={1} value={K} onChange={setK} format={(v) => `$${v.toFixed(0)}`} accent="oklch(0.65 0.16 30)" />
          <Slider label="Risk-free rate r" min={0} max={0.1} step={0.005} value={r} onChange={setR} format={(v) => `${(v * 100).toFixed(1)}%`} accent="oklch(0.65 0.16 30)" />
          <Slider label="Volatility σ" min={0.05} max={0.8} step={0.01} value={sigma} onChange={setSigma} format={(v) => `${(v * 100).toFixed(0)}%`} accent="oklch(0.65 0.16 30)" />
          <Slider label="Time to maturity T (years)" min={0.05} max={3} step={0.05} value={T} onChange={setT} format={(v) => v.toFixed(2)} accent="oklch(0.65 0.16 30)" />

          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">{type === "call" ? "C = S·N(d₁) - K·e^(-rT)·N(d₂)" : "P = K·e^(-rT)·N(-d₂) - S·N(-d₁)"}</p>
            <p className="font-mono text-xs mt-1">d₁ = {d1.toFixed(3)} · d₂ = {d2.toFixed(3)}</p>
            <p className="font-mono text-2xl font-bold mt-2 text-primary">${price.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">N(d₁)={Nd1.toFixed(4)} · N(d₂)={Nd2.toFixed(4)}</p>
          </div>

          <div className="grid grid-cols-5 gap-1 text-center text-[10px]">
            <div className="rounded-md border border-border/60 bg-card p-1.5">
              <p className="text-muted-foreground">Δ</p>
              <p className="font-mono font-bold">{delta.toFixed(3)}</p>
            </div>
            <div className="rounded-md border border-border/60 bg-card p-1.5">
              <p className="text-muted-foreground">Γ</p>
              <p className="font-mono font-bold">{gamma.toFixed(4)}</p>
            </div>
            <div className="rounded-md border border-border/60 bg-card p-1.5">
              <p className="text-muted-foreground">ν</p>
              <p className="font-mono font-bold">{vega.toFixed(3)}</p>
            </div>
            <div className="rounded-md border border-border/60 bg-card p-1.5">
              <p className="text-muted-foreground">Θ</p>
              <p className="font-mono font-bold">{theta.toFixed(3)}</p>
            </div>
            <div className="rounded-md border border-border/60 bg-card p-1.5">
              <p className="text-muted-foreground">ρ</p>
              <p className="font-mono font-bold">{rho.toFixed(3)}</p>
            </div>
          </div>
        </div>
      </div>
      <InfoCallout
        intent="Pick Call/Put and slide S, K, r, σ, T to see the Black-Scholes price + 5 Greeks update live. The payoff diagram shows the option value at maturity. Greeks: Δ=delta, Γ=gamma, ν=vega (per 1% vol), Θ=theta (per day), ρ=rho (per 1% rate)."
        math="C = S·N(d₁) - K·e^(-rT)·N(d₂) · d₁ = (ln(S/K) + (r+σ²/2)T) / (σ√T) · d₂ = d₁ - σ√T · Δ_call = N(d₁) · Γ = N'(d₁)/(Sσ√T)"
        insight="Black-Scholes (1973, Nobel 1997) assumes constant σ, lognormal returns, no jumps — these are WRONG (volatility smiles, fat tails, gap moves). Modern quant desks use local-vol (Dupire 1994), stochastic-vol (Heston 1993), or rough-vol (Bayer 2016) which all reduce to BS as a special case. The formula survives because it's a closed form — used as a quoting convention even when the underlying model is more sophisticated."
      />
    </div>
  );
}

// ============================================================
// Interactive 2: Monte Carlo VaR / CVaR
// ============================================================

function MonteCarloVaR() {
  const [horizon, setHorizon] = useState(1);     // days
  const [confidence, setConfidence] = useState(0.95); // 95% confidence
  const [sigma, setSigma] = useState(0.015);     // daily vol
  const [mu, setMu] = useState(0.0005);          // daily drift
  const [paths, setPaths] = useState<number[] | null>(null);
  const [running, setRunning] = useState(false);

  const runMC = () => {
    setRunning(true);
    setTimeout(() => {
      // Geometric Brownian Motion: S_T = S_0 * exp((mu - sigma²/2)·T + sigma·√T·Z)
      const N = 10000;
      const S0 = 100;
      const newPaths: number[] = [];
      for (let i = 0; i < N; i++) {
        const Z = gaussianRandom();
        const ST = S0 * Math.exp((mu - sigma * sigma / 2) * horizon + sigma * Math.sqrt(horizon) * Z);
        newPaths.push(ST - S0); // P&L
      }
      newPaths.sort((a, b) => a - b);
      setPaths(newPaths);
      setRunning(false);
    }, 300);
  };

  function gaussianRandom(): number {
    // Box-Muller
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // Calculate VaR + CVaR from sorted paths
  let varValue = 0, cvarValue = 0;
  if (paths) {
    const N = paths.length;
    const varIdx = Math.floor((1 - confidence) * N);
    varValue = -paths[varIdx];
    // CVaR = mean of losses beyond VaR
    const tail = paths.slice(0, varIdx);
    cvarValue = -tail.reduce((a, b) => a + b, 0) / tail.length;
  }

  // Histogram bins for paths (P&L distribution)
  const bins = paths ? Array.from({ length: 20 }, (_, i) => {
    const min = paths[0];
    const max = paths[paths.length - 1];
    const w = (max - min) / 20;
    const lo = min + i * w;
    const hi = lo + w;
    return paths.filter(p => p >= lo && p < hi).length;
  }) : null;
  const maxBin = bins ? Math.max(...bins) : 1;

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 360 280" className="w-full h-auto">
            <line x1="20" y1="240" x2="340" y2="240" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
            <line x1="20" y1="20" x2="20" y2="240" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
            {bins && bins.map((count, i) => {
              const x = 25 + i * 15;
              const h = (count / maxBin) * 200;
              const isTail = i < Math.floor((1 - confidence) * bins.length);
              return (
                <motion.rect
                  key={i}
                  x={x} y={240 - h} width="13" height={h}
                  fill={isTail ? "oklch(0.75 0.20 0)" : "oklch(0.65 0.16 250 / 0.5)"}
                  initial={{ height: 0, y: 240 }} animate={{ height: h, y: 240 - h }}
                  transition={{ duration: 0.3, delay: i * 0.02 }}
                />
              );
            })}
            {/* VaR line */}
            {paths && (
              <g>
                <line x1={25 + Math.floor((1 - confidence) * 20) * 15} y1="20" x2={25 + Math.floor((1 - confidence) * 20) * 15} y2="240" stroke="oklch(0.85 0.20 0)" strokeWidth="1.5" strokeDasharray="3 2" />
                <text x={25 + Math.floor((1 - confidence) * 20) * 15 + 3} y="35" fontSize="8" fill="oklch(0.85 0.20 0)" fontWeight="bold">VaR</text>
              </g>
            )}
            <text x="180" y="265" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
              P&L distribution (10,000 GBM paths) — {horizon}d horizon
            </text>
            <text x="180" y="278" textAnchor="middle" fontSize="9" fill="oklch(0.55 0.10 250)">
              Red bars = tail beyond VaR (expected shortfall)
            </text>
          </svg>
        </div>

        <div className="space-y-3">
          <Slider label="Horizon (days)" min={1} max={20} step={1} value={horizon} onChange={setHorizon} format={(v) => `${v}d`} accent="oklch(0.65 0.16 0)" />
          <Slider label="Confidence level" min={0.9} max={0.999} step={0.001} value={confidence} onChange={setConfidence} format={(v) => `${(v * 100).toFixed(1)}%`} accent="oklch(0.65 0.16 0)" />
          <Slider label="Daily volatility σ" min={0.005} max={0.05} step={0.001} value={sigma} onChange={setSigma} format={(v) => `${(v * 100).toFixed(2)}%`} accent="oklch(0.65 0.16 0)" />
          <Slider label="Daily drift μ" min={-0.002} max={0.003} step={0.0001} value={mu} onChange={setMu} format={(v) => `${(v * 100).toFixed(3)}%`} accent="oklch(0.65 0.16 0)" />
          <Button size="sm" variant="default" onClick={runMC} disabled={running} className="w-full gap-1.5">
            {running ? <><Activity className="h-3.5 w-3.5 animate-pulse" /> Simulating 10k paths…</> : <><Play className="h-3.5 w-3.5" /> Run 10k GBM paths</>}
          </Button>

          {paths && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
              <p className="font-mono text-sm text-primary">VaR = -Q_{(confidence * 100).toFixed(0)}(P&L)</p>
              <p className="font-mono text-2xl font-bold mt-1 text-rose-600">${varValue.toFixed(2)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">at {(confidence * 100).toFixed(1)}% confidence over {horizon}d</p>
              <p className="font-mono text-sm mt-2 text-primary">CVaR (ES) = E[L | L &gt; VaR]</p>
              <p className="font-mono text-xl font-bold mt-0.5 text-rose-700">${cvarValue.toFixed(2)}</p>
            </div>
          )}

          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
            <p className="font-semibold text-amber-700 dark:text-amber-300 mb-1">VaR vs CVaR debate (Basel III → IV)</p>
            <p className="text-muted-foreground">
              VaR is a quantile — &ldquo;loss not exceeded with prob α&rdquo;. But it doesn&apos;t tell you
              how BAD the tail is. CVaR (Expected Shortfall) averages the tail — &ldquo;given that
              you breach VaR, what&apos;s the expected loss?&rdquo;. Basel IV (2025+) replaces 99% VaR
              with 97.5% CVaR — banks must hold capital against the average tail, not the
              threshold.
            </p>
          </div>
        </div>
      </div>
      <InfoCallout
        intent="Slide horizon (1-20d), confidence (90-99.9%), σ, μ then click 'Run' to simulate 10,000 GBM paths. The histogram shows the P&L distribution; red bars are the tail beyond VaR. VaR is the loss quantile, CVaR (Expected Shortfall) is the average of the tail."
        math="GBM: S_T = S_0·exp((μ-σ²/2)T + σ√T·Z) · VaR_α = -Q_α(P&L) · CVaR = -E[P&L | P&L &lt; -VaR] · Z ~ N(0,1) via Box-Muller"
        insight="VaR is non-convex and ignores the tail beyond the quantile — the 2008 crisis showed banks holding &ldquo;adequate&rdquo; VaR capital still blew up because the tail was fatter than Gaussian assumed. CVaR is convex (Rockafellar-Uryasev 2000) and captures tail severity. Basel IV&apos;s switch from VaR to CVaR is the most consequential regulatory change in 30 years."
      />
    </div>
  );
}

// ============================================================
// Interactive 3: Real-time market data toggle (Yahoo Finance + synthetic)
// ============================================================

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  history: number[];
  source: "real" | "synthetic";
}

function RealTimeMarketData() {
  const [useRealData, setUseRealData] = useState(true);
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<string>("");

  // Synthetic data generator — random-walk GBM
  function generateSynthetic(symbol: string, basePrice: number, vol = 0.015): StockQuote {
    const history = [basePrice];
    for (let i = 1; i < 30; i++) {
      const r = (Math.random() - 0.5) * vol * 2;
      history.push(history[i - 1] * (1 + r));
    }
    const price = history[history.length - 1];
    const change = price - basePrice;
    return {
      symbol, price, change, changePercent: change / basePrice * 100,
      history, source: "synthetic",
    };
  }

  // Yahoo Finance — query via query1.finance.yahoo.com (CORS-friendly via proxy)
  async function fetchYahoo(symbols: string[]): Promise<StockQuote[]> {
    // Yahoo Finance's chart API doesn't set CORS headers — use the CORS
    // fallback proxy from live-resources-drawer pattern.
    const corsProxy = "https://corsproxy.io/?url=";
    const results: StockQuote[] = [];
    for (const sym of symbols) {
      try {
        // Try direct first, fall back to proxy
        let url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1mo`;
        let resp;
        try {
          resp = await fetch(url);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        } catch {
          // CORS fail — try proxy
          url = corsProxy + encodeURIComponent(url);
          resp = await fetch(url);
        }
        const data = await resp.json();
        const result = data.chart?.result?.[0];
        if (result) {
          const closes = result.indicators.quote[0].close.filter((v: number) => v != null);
          const price = closes[closes.length - 1];
          const prevClose = closes[closes.length - 2] || price;
          const change = price - prevClose;
          results.push({
            symbol: sym,
            price,
            change,
            changePercent: change / prevClose * 100,
            history: closes.slice(-30),
            source: "real",
          });
        }
      } catch {
        // Fallback to synthetic for this symbol
        const basePrice = { AAPL: 195, MSFT: 420, GOOGL: 175, TSLA: 250, NVDA: 880, BTC: 65000 }[sym] || 100;
        results.push(generateSynthetic(sym, basePrice));
      }
    }
    return results;
  }

  const symbols = ["AAPL", "MSFT", "GOOGL", "TSLA", "NVDA", "BTC-USD"];

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (useRealData) {
        const realQuotes = await fetchYahoo(symbols);
        setQuotes(realQuotes);
        setLastFetch(new Date().toISOString().slice(11, 19));
      } else {
        // Synthetic — instant
        const synth = symbols.map(s => {
          const base = { AAPL: 195, MSFT: 420, GOOGL: 175, TSLA: 250, NVDA: 880, "BTC-USD": 65000 }[s] || 100;
          return generateSynthetic(s, base);
        });
        setQuotes(synth);
        setLastFetch(new Date().toISOString().slice(11, 19));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useRealData]);

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 360 280" className="w-full h-auto">
            <line x1="20" y1="240" x2="340" y2="240" stroke="oklch(0.55 0.10 250 / 0.4)" strokeWidth="0.5" />
            <line x1="20" y1="20" x2="20" y2="240" stroke="oklch(0.55 0.10 250 / 0.4)" strokeWidth="0.5" />
            {/* Show price history for first 3 symbols */}
            {quotes.slice(0, 3).map((q, idx) => {
              const prices = q.history;
              if (prices.length < 2) return null;
              const min = Math.min(...prices);
              const max = Math.max(...prices);
              const range = max - min || 1;
              const color = ["oklch(0.75 0.20 30)", "oklch(0.75 0.20 165)", "oklch(0.75 0.20 250)"][idx];
              const pts = prices.map((p, i) => {
                const x = 25 + (i / (prices.length - 1)) * 310;
                const y = 240 - ((p - min) / range) * 200;
                return `${x},${y}`;
              }).join(" ");
              return (
                <g key={q.symbol}>
                  <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
                  <text x={25 + 5} y={35 + idx * 12} fontSize="9" fill={color} fontWeight="bold">{q.symbol}</text>
                </g>
              );
            })}
            <text x="180" y="265" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
              {useRealData ? "Real Yahoo Finance data" : "Synthetic GBM data"} — last refresh {lastFetch || "—"}
            </text>
          </svg>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setUseRealData(true)}
              className={`h-10 rounded-md border text-xs font-semibold transition-all ${useRealData ? "bg-emerald-600 text-white border-emerald-600" : "bg-card border-border hover:border-emerald-500"}`}
            >Real (Yahoo Finance)</button>
            <button
              type="button"
              onClick={() => setUseRealData(false)}
              className={`h-10 rounded-md border text-xs font-semibold transition-all ${!useRealData ? "bg-amber-600 text-white border-amber-600" : "bg-card border-border hover:border-amber-500"}`}
            >Synthetic (fake data)</button>
          </div>
          <Button size="sm" variant="outline" onClick={fetchData} disabled={loading} className="w-full gap-1.5">
            {loading ? <><Activity className="h-3.5 w-3.5 animate-pulse" /> Fetching…</> : <><RotateCcw className="h-3.5 w-3.5" /> Refresh</>}
          </Button>

          {error && (
            <div className="rounded-md border border-rose-500/40 bg-rose-500/5 p-3 text-xs">
              <p className="font-semibold text-rose-700 dark:text-rose-300 mb-1">⚠ Fetch error</p>
              <p className="text-muted-foreground">{error}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Try switching to Synthetic mode if Yahoo Finance CORS is blocked.</p>
            </div>
          )}

          <div className="rounded-md border border-border/60 bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Quotes (6 instruments)</p>
            {quotes.map(q => (
              <div key={q.symbol} className="flex items-center justify-between text-xs py-0.5">
                <span className="font-mono font-semibold w-16">{q.symbol}</span>
                <span className="font-mono w-16 text-right">${q.price.toFixed(2)}</span>
                <span className={`font-mono w-16 text-right ${q.change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {q.change >= 0 ? "+" : ""}{q.changePercent.toFixed(2)}%
                </span>
                <span className={`text-[9px] w-12 text-right ${q.source === "real" ? "text-emerald-600" : "text-amber-600"}`}>
                  {q.source === "real" ? "● real" : "● synth"}
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-xs">
            <p className="font-semibold text-emerald-700 dark:text-emerald-300 mb-1.5">Data sources</p>
            <p className="text-muted-foreground">
              <strong>Real:</strong> Yahoo Finance chart API (query1.finance.yahoo.com) —
              1-month daily history for AAPL, MSFT, GOOGL, TSLA, NVDA, BTC-USD. Uses CORS
              proxy fallback because Yahoo doesn&apos;t set CORS headers.
            </p>
            <p className="text-muted-foreground mt-2">
              <strong>Synthetic:</strong> Geometric Brownian Motion generator (μ=0.0005, σ=0.015 daily).
              Same code path — useful for demos, testing, or when Yahoo is rate-limited.
            </p>
          </div>
        </div>
      </div>
      <InfoCallout
        intent="Toggle between REAL (Yahoo Finance live API) and SYNTHETIC (GBM-generated fake) data. Click Refresh to re-fetch. The chart shows 30-day price history for the first 3 symbols. Each quote row shows source (real/synth) so you always know what you're looking at."
        math="Real: Yahoo chart API /v8/finance/chart/{sym}?interval=1d&range=1mo · Synthetic: GBM S_t = S_0·exp((μ-σ²/2)t + σ√t·Z), Z~N(0,1)"
        insight="Regulated trading systems MUST distinguish real vs synthetic data — many backtest disasters came from accidentally using look-ahead bias or 'phantom' data. The toggle here mirrors the production pattern: hedge funds run synthetic feeds on weekends/holidays when markets close, switch to real-time on Monday open. The same VaR/BS code runs on both — only the data source differs."
      />
    </div>
  );
}

// ============================================================
// Interactive 4: Portfolio optimization (Markowitz efficient frontier)
// ============================================================

function PortfolioOptimization() {
  const [riskAversion, setRiskAversion] = useState(0.5); // 0 = max return, 1 = min var
  // 3 assets with expected returns + covariances (synthetic, representative)
  const assets = [
    { name: "Stocks", mu: 0.10, sigma: 0.18 },
    { name: "Bonds",  mu: 0.04, sigma: 0.06 },
    { name: "Gold",   mu: 0.06, sigma: 0.15 },
  ];
  // Simplified covariance matrix (correlations: stock-bond=0.1, stock-gold=0.0, bond-gold=0.2)
  const cov = [
    [0.18 * 0.18, 0.1 * 0.18 * 0.06, 0.0 * 0.18 * 0.15],
    [0.1 * 0.06 * 0.18, 0.06 * 0.06, 0.2 * 0.06 * 0.15],
    [0.0 * 0.15 * 0.18, 0.2 * 0.15 * 0.06, 0.15 * 0.15],
  ];

  // Markowitz: min w'Σw - λ·w'μ  s.t. Σw = 1
  // Closed-form 3-asset case: w = (λΣ⁻¹μ) / (1'λΣ⁻¹μ)
  // We'll solve numerically via simple iteration
  const lambda = 1 - riskAversion; // higher lambda = more risk-seeking
  // Σ⁻¹ (3x3 inverse — precomputed for the cov above)
  // For demo, just use weight interpolation between max-return and min-var portfolios
  const maxRetWeights = [1, 0, 0]; // 100% stocks (max return)
  const minVarWeights = [0.15, 0.65, 0.20]; // diversified (min var)
  const weights = maxRetWeights.map((w, i) => w * lambda + minVarWeights[i] * (1 - lambda));
  // Normalize
  const sum = weights.reduce((a, b) => a + b, 0);
  const normWeights = weights.map(w => w / sum);
  // Portfolio metrics
  const portReturn = normWeights.reduce((acc, w, i) => acc + w * assets[i].mu, 0);
  const portVar = normWeights.reduce((acc, w, i) =>
    acc + w * w * cov[i][i] + 2 * w * normWeights.reduce((a, w2, j) => i < j ? a + w * w2 * cov[i][j] : a, 0), 0);
  const portSigma = Math.sqrt(Math.max(0, portVar));

  // Efficient frontier points (precomputed for the 3 assets)
  const frontier = Array.from({ length: 20 }, (_, i) => {
    const t = i / 19;
    const w = maxRetWeights.map((ww, j) => ww * (1 - t) + minVarWeights[j] * t);
    const s = w.reduce((acc, ww, j) => acc + ww * j, 0);
    const mu = w.reduce((acc, ww, j) => acc + ww * assets[j].mu, 0);
    const v = w.reduce((acc, ww, j) => acc + ww * ww * cov[j][j] + 2 * ww * w.reduce((a, w2, k) => j < k ? a + ww * w2 * cov[j][k] : a, 0), 0);
    const sig = Math.sqrt(Math.max(0, v));
    return { sigma: sig, mu, weights: w };
  });

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 360 280" className="w-full h-auto">
            <line x1="20" y1="240" x2="340" y2="240" stroke="oklch(0.55 0.10 250 / 0.4)" strokeWidth="0.5" />
            <line x1="20" y1="20" x2="20" y2="240" stroke="oklch(0.55 0.10 250 / 0.4)" strokeWidth="0.5" />
            <text x="335" y="252" textAnchor="end" fontSize="8" fill="oklch(0.55 0.10 250)">σ →</text>
            <text x="30" y="30" fontSize="8" fill="oklch(0.55 0.10 250)">↑ μ</text>
            {/* Efficient frontier */}
            <polyline
              points={frontier.map(p => {
                const x = 30 + p.sigma * 1000;
                const y = 240 - p.mu * 1200;
                return `${x},${y}`;
              }).join(" ")}
              fill="none" stroke="oklch(0.75 0.20 250)" strokeWidth="1.5"
            />
            {/* Individual assets */}
            {assets.map((a, i) => (
              <g key={a.name}>
                <circle cx={30 + a.sigma * 1000} cy={240 - a.mu * 1200} r="3" fill="oklch(0.75 0.20 30)" />
                <text x={30 + a.sigma * 1000 + 4} y={240 - a.mu * 1200 - 5} fontSize="8" fill="oklch(0.65 0.10 250)">{a.name}</text>
              </g>
            ))}
            {/* Current portfolio */}
            <motion.circle cx={30 + portSigma * 1000} cy={240 - portReturn * 1200} r="5" fill="oklch(0.85 0.20 165)"
              animate={{ cx: 30 + portSigma * 1000, cy: 240 - portReturn * 1200 }}
              transition={{ duration: 0.2 }}
            />
            <text x={30 + portSigma * 1000 + 6} y={240 - portReturn * 1200 + 4} fontSize="9" fill="oklch(0.85 0.20 165)" fontWeight="bold">P</text>
            <text x="180" y="265" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
              Efficient frontier — Markowitz (1952)
            </text>
          </svg>
        </div>

        <div className="space-y-3">
          <Slider label="Risk aversion (0=max return, 1=min var)" min={0} max={1} step={0.05} value={riskAversion} onChange={setRiskAversion} format={(v) => v.toFixed(2)} accent="oklch(0.65 0.16 250)" />

          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">min w&apos;Σw - λ·w&apos;μ</p>
            <p className="font-mono text-xs mt-1">λ = {lambda.toFixed(2)} (risk appetite)</p>
            <p className="font-mono text-base font-bold mt-1">μ_p = {(portReturn * 100).toFixed(2)}% · σ_p = {(portSigma * 100).toFixed(2)}%</p>
            <p className="text-[11px] text-muted-foreground mt-1">Sharpe ratio = {((portReturn - 0.03) / portSigma).toFixed(3)} (rf=3%)</p>
          </div>

          <div className="rounded-md border border-border/60 bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Portfolio weights</p>
            {assets.map((a, i) => (
              <div key={a.name} className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold w-14">{a.name}</span>
                <div className="flex-1 h-4 rounded bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${normWeights[i] * 100}%` }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-primary"
                  />
                </div>
                <span className="text-xs font-mono w-12 text-right">{(normWeights[i] * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
            <p className="font-semibold text-amber-700 dark:text-amber-300 mb-1">Portfolio theory in contention</p>
            <ul className="text-muted-foreground ml-3 list-disc">
              <li><strong>Markowitz (1952):</strong> mean-variance — above. Closed-form but assumes known μ, Σ (rarely true)</li>
              <li><strong>Black-Litterman (1992):</strong> combine market priors with analyst views — used by Goldman</li>
              <li><strong>Risk parity (2005):</strong> equal risk contribution — Bridgewater All Weather</li>
              <li><strong>Hierarchical Risk Parity (López de Prado 2016):</strong> ML-based, no μ needed — robust to noise</li>
            </ul>
          </div>
        </div>
      </div>
      <InfoCallout
        intent="Slide risk aversion λ from 0 (100% stocks, max return) to 1 (diversified, min variance). The green dot P moves along the efficient frontier. Watch the Sharpe ratio update — find the tangent (max Sharpe) for the optimal risky portfolio."
        math="Markowitz: min w'Σw - λ·w'μ  s.t. Σw=1 · Σw_j=1 · Frontier = {(σ(λ), μ(λ)) | λ∈[0,1]} · Sharpe = (μ_p - r_f) / σ_p"
        insight="Markowitz won the 1990 Nobel for this. But it has a critical flaw: it assumes you KNOW μ and Σ — you don&apos;t, you estimate them, and small estimation errors cause wild weight swings (the &ldquo;corner portfolio&rdquo; problem). López de Prado&apos;s HRP (2016) avoids μ entirely by clustering — robust to estimation noise. Bridgewater&apos;s All Weather fund uses risk parity (no μ, just σ) and has outperformed for 30 years."
      />
    </div>
  );
}

// ============================================================
// Interactive 5: Volatility surface (3D-ish)
// ============================================================

function VolatilitySurface() {
  const [strike, setStrike] = useState(100);
  const [maturity, setMaturity] = useState(0.25);
  // SVI parametric vol surface (Gatheral 2004): w(k, t) = (a + b·(ρ·(k-m) + √((k-m)² + σ²)))
  // Simplified for demo — vol smile + term structure
  const k = Math.log(strike / 100); // log-moneyness
  // Smile: U-shape, min at k=0, increases for ITM/OTM
  const smileVol = 0.18 + 0.04 * k * k + 0.02 * k;
  // Term structure: mean-reverting — short maturity higher vol
  const termFactor = 1 + 0.5 * Math.exp(-maturity * 2);
  const implVol = smileVol * termFactor;

  // Surface grid (strike × maturity → vol)
  const surface = Array.from({ length: 12 }, (_, i) => {
    const k = -1 + i * 0.2;
    return Array.from({ length: 10 }, (_, j) => {
      const t = 0.05 + j * 0.5;
      const s = (0.18 + 0.04 * k * k + 0.02 * k) * (1 + 0.5 * Math.exp(-t * 2));
      return { k, t, s };
    });
  }).flat();

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 360 280" className="w-full h-auto">
            <line x1="20" y1="240" x2="340" y2="240" stroke="oklch(0.55 0.10 250 / 0.4)" strokeWidth="0.5" />
            <line x1="20" y1="20" x2="20" y2="240" stroke="oklch(0.55 0.10 250 / 0.4)" strokeWidth="0.5" />
            {/* Surface as scatter (each point at (k, σ), color = maturity) */}
            {surface.map((p, i) => {
              const x = 30 + (p.k + 1) * 130;
              const y = 240 - p.s * 500;
              return (
                <circle key={i} cx={x} cy={y} r="1.5"
                  fill={`oklch(0.65 0.16 ${(p.t * 100) % 360})`}
                  opacity={0.5 + (1 - p.t / 5) * 0.5}
                />
              );
            })}
            {/* Current point */}
            <motion.circle cx={30 + (k + 1) * 130} cy={240 - implVol * 500} r="5"
              fill="oklch(0.85 0.20 0)" stroke="oklch(0.65 0.10 250)" strokeWidth="1.5"
              animate={{ cx: 30 + (k + 1) * 130, cy: 240 - implVol * 500 }}
              transition={{ duration: 0.15 }}
            />
            <text x="180" y="265" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
              Vol smile at T={maturity.toFixed(2)}y · σ={implVol.toFixed(3)}
            </text>
            <text x="180" y="278" textAnchor="middle" fontSize="9" fill="oklch(0.55 0.10 250)">
              Each dot = (log-moneyness, vol); color = maturity
            </text>
          </svg>
        </div>

        <div className="space-y-3">
          <Slider label="Strike K ($)" min={50} max={150} step={1} value={strike} onChange={setStrike} format={(v) => `$${v.toFixed(0)}`} accent="oklch(0.65 0.16 0)" />
          <Slider label="Time to maturity T (years)" min={0.05} max={2} step={0.05} value={maturity} onChange={setMaturity} format={(v) => v.toFixed(2)} accent="oklch(0.65 0.16 0)" />

          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">σ_imp(K, T) = smile(k) × term(T)</p>
            <p className="font-mono text-xs mt-1">k = ln(K/S₀) = {k.toFixed(3)} (moneyness)</p>
            <p className="font-mono text-base font-bold mt-1">σ_imp = {(implVol * 100).toFixed(2)}%</p>
          </div>

          <div className="rounded-md border border-border/60 bg-card p-3 text-xs">
            <p className="font-semibold mb-1.5">Volatility smile — why?</p>
            <p className="text-muted-foreground">
              Black-Scholes assumes constant σ — but the market disagrees. After the 1987 crash,
              OTM puts trade at much higher implied vol than ATM (the &ldquo;skew&rdquo;) — the market
              prices in fat-tail crash risk. This is direct empirical evidence that BS is wrong.
            </p>
            <p className="text-muted-foreground mt-2">Models that fit the smile:</p>
            <ul className="text-muted-foreground ml-3 list-disc">
              <li>Local vol (Dupire 1994) — deterministic σ(S, t)</li>
              <li>Stochastic vol (Heston 1993) — σ follows CIR process</li>
              <li>Rough vol (Bayer 2016) — σ has Hurst H≈0.1 (rougher than Brownian)</li>
              <li>SVI (Gatheral 2004) — parametric 5-parameter smile fit</li>
            </ul>
          </div>
        </div>
      </div>
      <InfoCallout
        intent="Slide strike K and maturity T to see the implied vol update on the surface. The smile U-shape reflects market crash hedging — OTM puts are expensive (high IV) because of the 1987 crash. Each dot is a different (k, T) combination; color encodes maturity."
        math="σ_imp(K, T) — BS-implied vol · Smile: σ(k) = a + b·(ρ·k + √(k² + σ²)) (SVI) · Term: σ(T) = σ_∞ + (σ_0 - σ_∞)·e^(-αT)"
        insight="The vol surface is the trader&apos;s bible — every option market-maker fits one and prices from it, NOT from Black-Scholes. The surface&apos;s shape encodes market expectations: skew = crash fear, term structure = event risk (e.g., earnings). Rough vol (Bayer 2016, JPMorgan) is the latest — models σ with Hurst H≈0.1 (more irregular than Brownian) and matches the &ldquo;vol-of-vol&rdquo; empirical fact better than Heston."
      />
    </div>
  );
}

// ============================================================
// Interactive 6: Yield curve
// ============================================================

function YieldCurve() {
  const [curve, setCurve] = useState<"normal" | "inverted" | "flat">("normal");
  // Treasury yields (3M, 6M, 1Y, 2Y, 5Y, 10Y, 20Y, 30Y)
  const curves = {
    normal:   [5.0, 4.9, 4.5, 4.3, 4.1, 4.0, 4.2, 4.3],
    inverted: [5.0, 4.9, 4.5, 4.0, 3.5, 3.2, 3.5, 3.8],
    flat:     [4.0, 4.0, 4.0, 4.0, 4.0, 4.0, 4.0, 4.0],
  };
  const maturities = ["3M", "6M", "1Y", "2Y", "5Y", "10Y", "20Y", "30Y"];
  const yields = curves[curve];
  const tenYearMinusThreeMonth = yields[5] - yields[0];

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 360 280" className="w-full h-auto">
            <line x1="30" y1="240" x2="340" y2="240" stroke="oklch(0.55 0.10 250 / 0.4)" strokeWidth="0.5" />
            <line x1="30" y1="20" x2="30" y2="240" stroke="oklch(0.55 0.10 250 / 0.4)" strokeWidth="0.5" />
            {/* Y-axis (yields 0-6%) */}
            {[0, 1, 2, 3, 4, 5, 6].map(y => (
              <g key={y}>
                <line x1="25" y1={240 - y * 35} x2="30" y2={240 - y * 35} stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
                <text x="22" y={243 - y * 35} textAnchor="end" fontSize="8" fill="oklch(0.55 0.10 250)">{y}%</text>
              </g>
            ))}
            {/* X-axis labels */}
            {maturities.map((m, i) => (
              <text key={m} x={35 + i * 38} y="258" textAnchor="middle" fontSize="8" fill="oklch(0.55 0.10 250)">{m}</text>
            ))}
            {/* Yield curve */}
            <motion.polyline
              points={yields.map((y, i) => `${35 + i * 38},${240 - y * 35}`).join(" ")}
              fill="none" stroke={curve === "inverted" ? "oklch(0.75 0.20 0)" : "oklch(0.75 0.20 250)"} strokeWidth="2"
              animate={{ points: yields.map((y, i) => `${35 + i * 38},${240 - y * 35}`).join(" ") }}
              transition={{ duration: 0.3 }}
            />
            {/* Points */}
            {yields.map((y, i) => (
              <motion.circle key={i} cx={35 + i * 38} cy={240 - y * 35} r="3" fill={curve === "inverted" ? "oklch(0.85 0.20 0)" : "oklch(0.85 0.20 250)"}
                animate={{ cy: 240 - y * 35 }} transition={{ duration: 0.3 }}
              />
            ))}
            <text x="180" y="275" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
              US Treasury yield curve — {curve} shape
            </text>
          </svg>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => setCurve("normal")}
              className={`h-10 rounded-md border text-[11px] font-semibold transition-all ${curve === "normal" ? "bg-emerald-600 text-white border-emerald-600" : "bg-card border-border hover:border-emerald-500"}`}
            >Normal</button>
            <button type="button" onClick={() => setCurve("inverted")}
              className={`h-10 rounded-md border text-[11px] font-semibold transition-all ${curve === "inverted" ? "bg-rose-600 text-white border-rose-600" : "bg-card border-border hover:border-rose-500"}`}
            >Inverted</button>
            <button type="button" onClick={() => setCurve("flat")}
              className={`h-10 rounded-md border text-[11px] font-semibold transition-all ${curve === "flat" ? "bg-amber-600 text-white border-amber-600" : "bg-card border-border hover:border-amber-500"}`}
            >Flat</button>
          </div>

          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">10Y - 3M = {tenYearMinusThreeMonth.toFixed(1)}%</p>
            <p className="font-mono text-xs mt-1">{tenYearMinusThreeMonth > 0 ? "Positive → normal growth" : "Negative → RECESSION signal"}</p>
          </div>

          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
            <p className="font-semibold text-amber-700 dark:text-amber-300 mb-1">Recession forecasting — the yield curve as oracle</p>
            <p className="text-muted-foreground">
              The 10Y-3M spread has predicted every US recession since 1968 — with one false positive (1966).
              When short-term rates &gt; long-term rates (inversion), the bond market expects rate cuts →
              economic slowdown. The 2022-2023 inversion was the deepest in 40 years.
            </p>
            <p className="text-muted-foreground mt-2">
              <strong>2024 status:</strong> Curve has been inverted for ~26 months (longest ever).
              Fed started cutting in Sep 2024 (50bp). Bull steepening = market expects faster cuts.
            </p>
          </div>

          <div className="rounded-md border border-border/60 bg-card p-3 text-xs">
            <p className="font-semibold mb-1.5">Curve shapes — what they mean</p>
            <ul className="text-muted-foreground ml-3 list-disc space-y-0.5">
              <li><strong>Normal:</strong> 10Y &gt; 3M → growth, banks profit from borrow-short/lend-long</li>
              <li><strong>Inverted:</strong> 10Y &lt; 3M → recession signal, banks squeezed</li>
              <li><strong>Flat:</strong> 10Y ≈ 3M → uncertainty, transition phase</li>
              <li><strong>Steep:</strong> 10Y &gt;&gt; 3M → expected inflation or growth</li>
            </ul>
          </div>
        </div>
      </div>
      <InfoCallout
        intent="Toggle Normal / Inverted / Flat curve shapes. The 10Y-3M spread is the canonical recession indicator — negative = recession signal (100% hit rate since 1968). Watch the points move and the spread value update."
        math="y(t) = y_∞ + (y_0 - y_∞)·e^(-αt) (Nelson-Siegel) · Recession signal: y(10y) - y(3m) &lt; 0"
        insight="The yield curve isn&apos;t just a chart — it&apos;s the consensus forecast of millions of bond traders, each betting real money on their view of the next 30 years. When the curve inverts, those millions of bets collectively say &ldquo;the Fed will cut rates because of recession&rdquo;. The 2022-24 inversion was deepest in 40 years — but as of late 2024, no recession has materialised, the longest lag on record. Either we&apos;re overdue, or this cycle is different (AI capex, fiscal stimulus)."
      />
    </div>
  );
}

// ============================================================
// Interactive 7: GNN fraud detection network
// ============================================================

function FraudDetectionGNN() {
  const [fraudThreshold, setFraudThreshold] = useState(0.7);
  // Synthetic transaction network: nodes = accounts, edges = transactions
  const nodes = [
    { id: 0, x: 80, y: 80, label: "A1", type: "normal" },
    { id: 1, x: 180, y: 60, label: "A2", type: "normal" },
    { id: 2, x: 280, y: 100, label: "A3", type: "suspicious" },
    { id: 3, x: 100, y: 180, label: "A4", type: "normal" },
    { id: 4, x: 200, y: 200, label: "A5", type: "suspicious" },
    { id: 5, x: 300, y: 180, label: "A6", type: "normal" },
  ];
  const edges = [
    { from: 0, to: 1, amount: 100, fraudScore: 0.1 },
    { from: 1, to: 2, amount: 5000, fraudScore: 0.85 },  // suspicious (high amount + A3 is suspicious)
    { from: 2, to: 4, amount: 4800, fraudScore: 0.92 },  // suspicious (rapid movement to A5)
    { from: 3, to: 4, amount: 50, fraudScore: 0.2 },
    { from: 4, to: 5, amount: 4700, fraudScore: 0.88 },  // suspicious (cash-out)
    { from: 0, to: 3, amount: 200, fraudScore: 0.05 },
    { from: 1, to: 5, amount: 80, fraudScore: 0.15 },
  ];

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 380 280" className="w-full h-auto">
            {/* Edges (transactions) */}
            {edges.map((e, i) => {
              const from = nodes[e.from];
              const to = nodes[e.to];
              const isFlagged = e.fraudScore > fraudThreshold;
              return (
                <motion.line
                  key={i}
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={isFlagged ? "oklch(0.85 0.20 0)" : "oklch(0.55 0.10 250 / 0.4)"}
                  strokeWidth={isFlagged ? 2 : 0.8}
                  animate={{ stroke: isFlagged ? "oklch(0.85 0.20 0)" : "oklch(0.55 0.10 250 / 0.4)" }}
                  transition={{ duration: 0.2 }}
                />
              );
            })}
            {/* Nodes */}
            {nodes.map(n => {
              const isSusp = n.type === "suspicious";
              return (
                <g key={n.id}>
                  <circle cx={n.x} cy={n.y} r="14"
                    fill={isSusp ? "oklch(0.75 0.20 0 / 0.6)" : "oklch(0.65 0.16 165 / 0.6)"}
                    stroke={isSusp ? "oklch(0.85 0.20 0)" : "oklch(0.75 0.16 165)"}
                    strokeWidth="1.5"
                  />
                  <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">{n.label}</text>
                </g>
              );
            })}
            <text x="190" y="270" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
              Transaction graph — flagged edges = fraud score &gt; {fraudThreshold.toFixed(2)}
            </text>
          </svg>
        </div>

        <div className="space-y-3">
          <Slider label="Fraud detection threshold" min={0.5} max={0.99} step={0.01} value={fraudThreshold} onChange={setFraudThreshold} format={(v) => v.toFixed(2)} accent="oklch(0.65 0.16 0)" />

          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">{"GNN: h_v = σ(W·AGG({h_u : u∈N(v)}))"}</p>
            <p className="font-mono text-xs mt-1">fraud_score(v) = MLP(h_v)</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {edges.filter(e => e.fraudScore > fraudThreshold).length} flagged / {edges.length} total edges
            </p>
          </div>

          <div className="rounded-md border border-border/60 bg-card p-3 text-xs">
            <p className="font-semibold mb-1.5">Why GNN beats rule-based fraud detection</p>
            <ul className="text-muted-foreground ml-3 list-disc space-y-0.5">
              <li><strong>Rules:</strong> &ldquo;transaction &gt; $10k → flag&rdquo; — easy to evade (split payments)</li>
              <li><strong>Random forest:</strong> per-transaction features — misses network patterns</li>
              <li><strong>GNN (GraphSAGE, GAT):</strong> aggregates neighbour info — catches &ldquo;smurfing&rdquo; (split deposits across many accounts)</li>
              <li><strong>Production:</strong> Visa uses GNN on 100M+ txns/day; JPMorgan ~60% of fraud alerts</li>
            </ul>
          </div>

          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-xs">
            <p className="font-semibold text-emerald-700 dark:text-emerald-300 mb-1">2024+ trends</p>
            <ul className="text-muted-foreground ml-3 list-disc space-y-0.5">
              <li>Heterophilic GNNs (fraudulent nodes look SIMILAR to neighbours, not dissimilar)</li>
              <li>Temporal GNNs (TGN, 2020) — model txns over time</li>
              <li>Federated learning across banks (Visa + Mastercard + banks collaborate without sharing data)</li>
              <li>Adversarial robustness — fraudsters now use GANs to evade GNNs</li>
            </ul>
          </div>
        </div>
      </div>
      <InfoCallout
        intent="Slide the fraud threshold and watch flagged edges (red) appear/disappear. The graph shows a synthetic money-laundering pattern: deposit → suspicious account → rapid transfer → cash-out. GNNs catch this by aggregating neighbour information — a single transaction looks normal but the CHAIN is suspicious."
        math="GNN: h_v^(l+1) = σ(W^(l)·AGG({h_u^(l) : u∈N(v)})) · fraud_score = MLP(h_v^(L)) · GraphSAGE aggregate = mean/max/LSTM"
        insight="Graph fraud detection is the killer app for GNNs in fintech — every major bank runs GraphSAGE or GAT in production. The key insight: fraud is a NETWORK property, not a node property. A single $5k transaction is fine; the same $5k preceded by 100 small deposits and followed by immediate cash-out is money laundering. Rule systems miss this; GNNs catch it via message passing."
      />
    </div>
  );
}

// ============================================================
// Interactive 8: HFT order book microstructure
// ============================================================

function HFTOrderBook() {
  const [tick, setTick] = useState(0);
  const [volatility, setVolatility] = useState(0.3);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 200);
    return () => clearInterval(id);
  }, []);

  // Generate synthetic order book (limit orders at price levels)
  const midPrice = 100 + Math.sin(tick / 30) * volatility + (Math.random() - 0.5) * volatility;
  const levels = 10;
  const bids = Array.from({ length: levels }, (_, i) => ({
    price: midPrice - (i + 1) * 0.05,
    size: Math.max(10, 100 - i * 8 + (Math.random() - 0.5) * 30),
  }));
  const asks = Array.from({ length: levels }, (_, i) => ({
    price: midPrice + (i + 1) * 0.05,
    size: Math.max(10, 100 - i * 8 + (Math.random() - 0.5) * 30),
  }));
  const spread = asks[0].price - bids[0].price;
  const maxSize = Math.max(...bids.map(b => b.size), ...asks.map(a => a.size));

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 360 280" className="w-full h-auto">
            {/* Bids (left) */}
            {bids.map((b, i) => {
              const w = (b.size / maxSize) * 130;
              const y = 20 + i * 22;
              return (
                <g key={`bid-${i}`}>
                  <rect x={170 - w} y={y} width={w} height="18" fill="oklch(0.65 0.16 165 / 0.6)" />
                  <text x={175} y={y + 13} fontSize="9" fill="oklch(0.65 0.10 250)">{b.price.toFixed(2)} × {b.size.toFixed(0)}</text>
                </g>
              );
            })}
            {/* Asks (right) */}
            {asks.map((a, i) => {
              const w = (a.size / maxSize) * 130;
              const y = 20 + i * 22;
              return (
                <g key={`ask-${i}`}>
                  <rect x={170} y={y} width={w} height="18" fill="oklch(0.65 0.16 0 / 0.6)" />
                  <text x={175} y={y + 13} fontSize="9" fill="oklch(0.65 0.10 250)">{a.price.toFixed(2)} × {a.size.toFixed(0)}</text>
                </g>
              );
            })}
            {/* Mid price */}
            <line x1="170" y1="20" x2="170" y2="240" stroke="oklch(0.65 0.10 250)" strokeWidth="0.5" strokeDasharray="2 2" />
            <text x="180" y="265" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
              mid = ${midPrice.toFixed(2)} · spread = {spread.toFixed(3)} · t={tick}
            </text>
          </svg>
        </div>

        <div className="space-y-3">
          <Slider label="Market volatility" min={0.05} max={2} step={0.05} value={volatility} onChange={setVolatility} format={(v) => v.toFixed(2)} accent="oklch(0.65 0.16 250)" />

          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">Bid-Ask Spread = {spread.toFixed(4)}</p>
            <p className="font-mono text-xs mt-1">Tick size: $0.01 (US equities)</p>
            <p className="font-mono text-xs">Market depth (top 10): ${((bids[0].size + asks[0].size) * midPrice).toFixed(0)}</p>
          </div>

          <div className="rounded-md border border-border/60 bg-card p-3 text-xs">
            <p className="font-semibold mb-1.5">HFT microstructure topics (in contention)</p>
            <ul className="text-muted-foreground ml-3 list-disc space-y-0.5">
              <li><strong>Maker-Taker:</strong> exchanges pay rebates for providing liquidity (makers), charge for taking</li>
              <li><strong>PFOF (Payment for Order Flow):</strong> Robinhood sells retail orders to wholesalers (Citadel, Virtu) — controversial</li>
              <li><strong>Latency arbitrage:</strong> HFT sees new prices 1-5ms before others — &ldquo;sniping&rdquo; stale quotes</li>
              <li><strong>Flash Crash (2010):</strong> Dow dropped 1000 points in 5 min — HFT liquidity withdrawal</li>
              <li><strong>IEX (2013):</strong> Michael Lewis&apos;s &ldquo;Flash Boys&rdquo; — speed bump to defeat latency arb</li>
            </ul>
          </div>

          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
            <p className="font-semibold text-amber-700 dark:text-amber-300 mb-1">Regulation NMS (2024+ updates)</p>
            <p className="text-muted-foreground">
              SEC&apos;s 2024 rules: tick-size reduction (1¢ → 0.5¢ for high-priced stocks), open
              auction for retail, AI-based surveillance. Goal: level the playing field between
              HFT firms and retail — but the debate rages on whether HFT adds or removes liquidity.
            </p>
          </div>
        </div>
      </div>
      <InfoCallout
        intent="Watch the order book update every 200ms (synthetic). Green bars = bid (buy) orders, red bars = ask (sell) orders. Slide volatility to see the mid-price move more or less. The spread is the HFT&apos;s profit margin — typically 0.01-0.05 in liquid stocks."
        math="Spread = ask - bid · Market depth = Σ(size × price) across N levels · Latency cost = (latency_ms × 1000) × (μ + 2σ) · maker rebate = $0.002/share"
        insight="HFT is the most controversial quant strategy — it adds liquidity (tighter spreads, 90% reduction since 1990) but critics say it&apos;s rent-extraction via speed. Michael Lewis&apos;s &ldquo;Flash Boys&rdquo; (2014) accused HFTs of front-running retail. SEC&apos;s 2024 rules attempt to fix this by forcing wholesalers to compete in open auctions — Citadel and Virtu are suing. The truth: HFT is BOTH liquidity-providing AND rent-seeking — depends on the specific practice."
      />
    </div>
  );
}

export {
  BlackScholesCalculator,
  MonteCarloVaR,
  RealTimeMarketData,
  PortfolioOptimization,
  VolatilitySurface,
  YieldCurve,
  FraudDetectionGNN,
  HFTOrderBook,
};
