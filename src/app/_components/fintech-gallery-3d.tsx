"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { PyodideRunner } from "./pyodide-runner";
import {
  X, Atom, Zap, Box, Layers, Network, Cpu, DollarSign, BarChart3, TrendingUp, Activity,
} from "lucide-react";

/**
 * FintechGallery3D — quant-finance analog of QuantumGallery3D.
 *
 * Replaces static PNG art with procedural SVG-based 3D animations of the
 * four canonical quant-finance visualisations: the Black-Scholes call
 * price surface, Monte-Carlo GBM paths with VaR / CVaR tails, the
 * implied-volatility surface (smile + term structure), and the Treasury
 * yield curve with a 10Y-3M recession indicator.
 *
 * Each card has:
 *   - A small animated 3D SVG thumbnail (CSS 3D transforms + framer-motion)
 *   - Click → lazy modal popup (AnimatePresence) — heavy SVG only mounts
 *     when the user opens the card
 *   - Inside the modal:
 *       * A LARGE animated 3D SVG of the concept
 *       * An n-D toggle (3D / 4D / 5D / N-D) — shows how the concept
 *         scales across the firm's risk universe:
 *             - 3D: single stock / single curve
 *             - 4D: portfolio (multi-asset) — cross-correlation enters
 *             - 5D: derivatives portfolio — non-linear payoffs + greeks
 *             - N-D: full risk grid (all asset classes × all maturities)
 *       * A floating math/code background — quant equations drift
 *         subtly behind the main visualisation
 *       * A caption explaining what the visual shows
 */

// ============================================================
// Shared math/code snippets for the floating background layer
// (24 fintech snippets — Black-Scholes, VaR, GBM, greeks, etc.)
// ============================================================
const FLOATING_SNIPPETS = [
  "C = S·N(d₁) - K·e^(-rT)·N(d₂)",
  "d₁ = (ln(S/K)+(r+σ²/2)T)/(σ√T)",
  "d₂ = d₁ - σ√T",
  "GBM: dS = μS·dt + σS·dW",
  "VaR = -Q_α(P&L)",
  "CVaR = -E[L|L>VaR]",
  "Sharpe = (μ-r)/σ",
  "Markowitz: min w'Σw",
  "Heston: dv = κ(θ-v)dt + ξ√v·dW'",
  "Black-76: F·N(d₁) - K·N(d₂)",
  "SABR: σ_imp(K) = α·(FK)^(β-1)",
  "Itô: df = (∂f/∂t + μS∂f/∂S + ½σ²S²∂²f/∂S²)dt",
  "put-call parity: C - P = S - K·e^(-rT)",
  "risk-free rate r · strike K",
  "implied volatility σ_imp",
  "maturity T · delta ∂C/∂S",
  "gamma ∂²C/∂S² · vega ∂C/∂σ",
  "theta ∂C/∂t · rho ∂C/∂r",
  "Basel IV · FRTB · Expected Shortfall",
  "duration = Σ t·CF_t / P",
  "convexity = Σ t(t+1)·CF_t / (P·(1+y)²)",
  "OLS: β = (X'X)^-1·X'y",
  "ARIMA(p,d,q): φ(B)(1-B)^d·y_t = θ(B)ε_t",
  "max drawdown = max_t(P_t/P_max - 1)",
];

// ============================================================
// 3D scene wrappers
// ============================================================

function Scene3D({ children, w = 240, h = 320 }: { children: ReactNode; w?: number; h?: number }) {
  return (
    <div
      className="ft-3d-scene relative"
      style={{ width: w, height: h, perspective: "900px" }}
    >
      <style>{`
        .ft-3d-stage {
          transform-style: preserve-3d;
          transform: rotateX(15deg) rotateY(20deg);
          animation: ft-3d-rotate 8s linear infinite;
        }
        @keyframes ft-3d-rotate {
          from { transform: rotateX(15deg) rotateY(0deg); }
          to   { transform: rotateX(15deg) rotateY(360deg); }
        }
        .ft-bg-float {
          position: absolute;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          color: oklch(0.65 0.15 250 / 0.18);
          pointer-events: none;
          white-space: nowrap;
          font-size: 11px;
          line-height: 1.4;
          animation: ft-bg-drift linear infinite;
        }
        @keyframes ft-bg-drift {
          from { transform: translateY(0) translateX(0); opacity: 0.0; }
          10%  { opacity: 1.0; }
          90%  { opacity: 1.0; }
          to   { transform: translateY(-180px) translateX(40px); opacity: 0.0; }
        }
      `}</style>
      <div className="ft-3d-stage w-full h-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// ============================================================
// Floating math/code background layer
// ============================================================
function FloatingBackground() {
  // Deterministic placement per snippet index — stable across re-renders
  const items = FLOATING_SNIPPETS.map((text, i) => ({
    text,
    x: (i * 53) % 95,
    y: (i * 37) % 90,
    delay: (i * 1.7) % 14,
    duration: 14 + (i % 7),
    size: 10 + ((i * 3) % 5),
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {items.map((it, i) => (
        <div
          key={i}
          className="ft-bg-float"
          style={{
            left: `${it.x}%`,
            bottom: `${it.y - 50}%`,
            animationDelay: `${it.delay}s`,
            animationDuration: `${it.duration}s`,
            fontSize: `${it.size}px`,
          }}
        >
          {it.text}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Black-Scholes helpers (normal CDF + European call)
// ============================================================

// Abramowitz-Stegun approximation of the standard normal CDF Φ(x).
function normCDF(x: number): number {
  if (x > 6) return 1;
  if (x < -6) return 0;
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d =
    0.3989423 * Math.exp((-x * x) / 2) *
    t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - d : d;
}

// European Black-Scholes call price.
function bsCall(S: number, K: number, T: number, r: number, sigma: number): number {
  if (T < 1e-6) return Math.max(0, S - K);
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2);
}

// ============================================================
// Concept 1: Black-Scholes call surface C(S, T)
// ============================================================
function BlackScholesSurface3D({ dim = 3 }: { dim?: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 100), 100);
    return () => clearInterval(id);
  }, []);

  // n-D toggle: 3D → 1 underlying, 4D → 3-asset basket, 5D → 5, N-D → 8
  const nAssets = dim === 3 ? 1 : dim === 4 ? 3 : dim === 5 ? 5 : 8;
  const assetColors = [
    "oklch(0.65 0.16 250)",
    "oklch(0.65 0.16 165)",
    "oklch(0.65 0.16 30)",
    "oklch(0.65 0.16 320)",
    "oklch(0.65 0.16 200)",
    "oklch(0.65 0.16 130)",
    "oklch(0.65 0.16 60)",
    "oklch(0.65 0.16 280)",
  ];

  // Current (S, T) — pulsing point moves around
  const curS = 100 + 25 * Math.sin(tick / 18);
  const curT = 0.5 + 0.4 * Math.sin(tick / 23);

  // Surface parameters
  const K = 100;
  const r = 0.05;
  const sigma = 0.2;
  const S_vals = [60, 70, 80, 90, 100, 110, 120, 130, 140];
  const T_vals = [0.05, 0.15, 0.3, 0.5, 0.7, 1.0];

  // Isometric projection: (S, T, C) -> (x, y)
  // S axis: positive x  ·  T axis: positive x + negative y (back)
  // C axis: negative y (up)
  const project = (s: number, t: number, c: number) => {
    const sNorm = (s - 60) / 80;
    const tNorm = t / 1.0;
    const x = 60 + sNorm * 200 + tNorm * 70;
    const y = 260 + c * 4 - tNorm * 50;
    return { x, y };
  };

  return (
    <svg viewBox="0 0 360 320" width="100%" height="100%">
      <defs>
        <radialGradient id="bs-dot-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.85 0.20 25 / 0.95)" />
          <stop offset="100%" stopColor="oklch(0.50 0.18 25 / 0.0)" />
        </radialGradient>
      </defs>

      {/* axes */}
      <line x1="60" y1="260" x2="330" y2="260" stroke="oklch(0.55 0.10 250 / 0.6)" strokeWidth="0.8" />
      <line x1="60" y1="60" x2="60" y2="260" stroke="oklch(0.55 0.10 250 / 0.6)" strokeWidth="0.8" />
      <text x="320" y="270" textAnchor="end" fontSize="9" fill="oklch(0.65 0.10 250)">S</text>
      <text x="56" y="65" textAnchor="end" fontSize="9" fill="oklch(0.65 0.10 250)">C</text>
      <text x="130" y="318" textAnchor="middle" fontSize="8" fill="oklch(0.55 0.10 250)">T → back</text>

      {/* Per-asset loop — 3D shows single surface, higher dims overlay more */}
      {Array.from({ length: nAssets }).map((_, ai) => {
        const assetK = K + (ai - (nAssets - 1) / 2) * 4;
        const color = assetColors[ai % assetColors.length];
        const opacity = nAssets === 1 ? 0.9 : 0.45 / nAssets * 3;

        // Constant-T curves (vary S, fixed T) — the canonical call profile
        const tCurves = T_vals.map((t, ti) => {
          const points = S_vals.map((s) => project(s, t, bsCall(s, assetK, t, r, sigma)));
          return { ti, points };
        });
        // Constant-S curves (vary T, fixed S) — time value decay profile
        const sCurves = S_vals.map((s, si) => {
          const points = T_vals.map((t) => project(s, t, bsCall(s, assetK, t, r, sigma)));
          return { si, points };
        });

        // Perimeter polygon — gives the surface a translucent body
        const front = S_vals.map((s) => project(s, T_vals[0], bsCall(s, assetK, T_vals[0], r, sigma)));
        const right = T_vals.map((t) =>
          project(S_vals[S_vals.length - 1], t, bsCall(S_vals[S_vals.length - 1], assetK, t, r, sigma)),
        );
        const back = S_vals.slice().reverse().map((s) =>
          project(s, T_vals[T_vals.length - 1], bsCall(s, assetK, T_vals[T_vals.length - 1], r, sigma)),
        );
        const left = T_vals.slice().reverse().map((t) =>
          project(S_vals[0], t, bsCall(S_vals[0], assetK, t, r, sigma)),
        );
        const perimeter = [...front, ...right, ...back, ...left];

        return (
          <g key={`asset-${ai}`} opacity={opacity}>
            {nAssets === 1 && (
              <polygon
                points={perimeter.map((p) => `${p.x},${p.y}`).join(" ")}
                fill={color} fillOpacity="0.08" stroke="none"
              />
            )}
            {/* constant-T curves — heavy lines */}
            {tCurves.map((tc) => (
              <polyline
                key={`t-${ai}-${tc.ti}`}
                points={tc.points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none" stroke={color} strokeWidth="1.2"
              />
            ))}
            {/* constant-S curves — dashed */}
            {sCurves.map((sc) => (
              <polyline
                key={`s-${ai}-${sc.si}`}
                points={sc.points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none" stroke={color} strokeWidth="0.6"
                strokeDasharray="2 2" opacity="0.6"
              />
            ))}
          </g>
        );
      })}

      {/* Pulsing dot at (curS, curT) — only on the primary asset for clarity */}
      {(() => {
        const c = bsCall(curS, K, curT, r, sigma);
        const p = project(curS, curT, c);
        return (
          <g>
            <motion.circle
              cx={p.x} cy={p.y} r={5} fill="url(#bs-dot-glow)"
              animate={{ r: [3, 7, 3] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <circle cx={p.x} cy={p.y} r="2" fill="oklch(0.85 0.20 25)" />
            <text x={p.x + 8} y={p.y - 6} fontSize="9" fill="oklch(0.85 0.20 25)" fontWeight="bold">
              C={c.toFixed(2)}
            </text>
            <text x={p.x + 8} y={p.y + 4} fontSize="8" fill="oklch(0.65 0.10 250)" fontFamily="monospace">
              S={curS.toFixed(1)} T={curT.toFixed(2)}
            </text>
          </g>
        );
      })()}

      <text x="180" y="305" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
        {nAssets === 1 ? "Black-Scholes C(S, T)" : `${nAssets}-asset basket surface`} · r={r} σ={sigma}
      </text>
    </svg>
  );
}

// ============================================================
// Concept 2: Monte Carlo GBM paths + VaR / CVaR histogram
// ============================================================
function MonteCarloPaths3D({ dim = 3 }: { dim?: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 80), 100);
    return () => clearInterval(id);
  }, []);

  // n-D: 3D → 20 single-stock paths, 4D → 30 portfolio, 5D → 40 deriv P&L, N-D → 60
  const nPaths = dim === 3 ? 20 : dim === 4 ? 30 : dim === 5 ? 40 : 60;
  const S0 = 100;
  const mu = 0.08;
  const sigma = 0.2;
  const T = 1.0;
  const nSteps = 30;
  const curStep = Math.min(tick, nSteps);

  // Deterministic PRNG (stable paths across re-renders)
  const seedR = (i: number) => {
    const x = Math.sin(i * 9999.7) * 10000;
    return x - Math.floor(x);
  };
  const gauss = (i: number, step: number) => {
    const u1 = Math.max(1e-6, seedR(i * 100 + step * 7));
    const u2 = seedR(i * 100 + step * 7 + 1);
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  const paths = Array.from({ length: nPaths }, (_, i) => {
    const path = [S0];
    for (let step = 1; step <= nSteps; step++) {
      const dt = T / nSteps;
      const z = gauss(i, step);
      const Sprev = path[step - 1];
      const Snew = Sprev * Math.exp((mu - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * z);
      path.push(Snew);
    }
    return path;
  });

  // Final-distribution histogram (meaningful once paths reach T)
  const showHist = tick >= nSteps - 1;
  const finalPrices = paths.map((p) => p[nSteps]).slice().sort((a, b) => a - b);
  const minP = Math.max(40, finalPrices[0] ?? 80);
  const maxP = Math.min(220, finalPrices[finalPrices.length - 1] ?? 120);
  const nBins = 8;
  const binWidth = Math.max(1e-6, (maxP - minP) / nBins);
  const bins = Array.from({ length: nBins }, (_, b) => {
    const lo = minP + b * binWidth;
    const hi = lo + binWidth;
    return finalPrices.filter((p) => p >= lo && (b === nBins - 1 ? p <= hi : p < hi)).length;
  });
  const maxBin = Math.max(...bins, 1);

  // VaR (5%) and CVaR (Expected Shortfall) price thresholds
  const varIdx = Math.max(0, Math.floor(0.05 * finalPrices.length));
  const varPrice = finalPrices[varIdx] ?? S0;
  const cvarSlice = finalPrices.slice(0, varIdx + 1);
  const cvarPrice = cvarSlice.length
    ? cvarSlice.reduce((a, b) => a + b, 0) / cvarSlice.length
    : varPrice;

  // Plot region: x: 30-245 (time), y: 50-280 (price 40-220)
  const xMap = (step: number) => 30 + (step / nSteps) * 215;
  const yMap = (price: number) => 280 - ((price - 40) / 180) * 230;

  return (
    <svg viewBox="0 0 360 320" width="100%" height="100%">
      <defs>
        <radialGradient id="mc-path-tip" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.85 0.18 165 / 0.9)" />
          <stop offset="100%" stopColor="oklch(0.50 0.16 165 / 0.0)" />
        </radialGradient>
      </defs>

      {/* axes */}
      <line x1="30" y1="50" x2="30" y2="280" stroke="oklch(0.55 0.10 250 / 0.7)" strokeWidth="0.8" />
      <line x1="30" y1="280" x2="245" y2="280" stroke="oklch(0.55 0.10 250 / 0.7)" strokeWidth="0.8" />
      <text x="135" y="300" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
        time t (years) → T={T.toFixed(1)}
      </text>
      <text x="20" y="55" textAnchor="end" fontSize="9" fill="oklch(0.65 0.10 250)">S(t)</text>

      {/* S₀ marker line */}
      <line x1="30" y1={yMap(S0)} x2="245" y2={yMap(S0)} stroke="oklch(0.55 0.10 250 / 0.3)" strokeDasharray="2 2" strokeWidth="0.6" />
      <text x="34" y={yMap(S0) - 4} textAnchor="start" fontSize="8" fill="oklch(0.65 0.10 250)">S₀=100</text>

      {/* Monte-Carlo paths */}
      {paths.map((path, i) => {
        const hue = 30 + ((i * 23) % 300);
        const pts = path.slice(0, curStep + 1).map((s, step) => `${xMap(step)},${yMap(s)}`).join(" ");
        return (
          <polyline
            key={`path-${i}`}
            points={pts}
            fill="none"
            stroke={`oklch(0.65 0.16 ${hue} / 0.55)`}
            strokeWidth="0.7"
          />
        );
      })}

      {/* Histogram at right edge — grows in as paths reach T */}
      {showHist && bins.map((b, i) => {
        const priceLo = minP + i * binWidth;
        const priceHi = priceLo + binWidth;
        const yLo = yMap(priceHi);
        const yHi = yMap(priceLo);
        const barLen = (b / maxBin) * 55;
        return (
          <motion.rect
            key={`bin-${i}`}
            x={255} y={yLo}
            width={barLen} height={Math.max(1, yHi - yLo - 1)}
            fill="oklch(0.65 0.16 165 / 0.45)"
            stroke="oklch(0.65 0.16 165)" strokeWidth="0.4"
            initial={{ width: 0 }}
            animate={{ width: barLen }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
          />
        );
      })}

      {/* VaR / CVaR horizontal threshold lines */}
      {showHist && (
        <g>
          <line
            x1="30" y1={yMap(varPrice)} x2="245" y2={yMap(varPrice)}
            stroke="oklch(0.85 0.20 25)" strokeWidth="1" strokeDasharray="5 3"
          />
          <text x="240" y={yMap(varPrice) - 4} textAnchor="end" fontSize="9" fill="oklch(0.85 0.20 25)" fontWeight="bold">
            VaR(5%)={varPrice.toFixed(1)}
          </text>
          <line
            x1="30" y1={yMap(cvarPrice)} x2="245" y2={yMap(cvarPrice)}
            stroke="oklch(0.85 0.20 320)" strokeWidth="1" strokeDasharray="5 3"
          />
          <text x="240" y={yMap(cvarPrice) + 10} textAnchor="end" fontSize="9" fill="oklch(0.85 0.20 320)" fontWeight="bold">
            CVaR={cvarPrice.toFixed(1)}
          </text>
        </g>
      )}

      {/* "histogram" axis label */}
      {showHist && (
        <text x="282" y="295" textAnchor="middle" fontSize="8" fill="oklch(0.55 0.10 250)">
          terminal S_T distribution
        </text>
      )}

      <text x="180" y="318" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
        {nPaths} GBM paths · μ={mu} σ={sigma} · step {curStep}/{nSteps}{showHist ? " · distribution ready" : ""}
      </text>
    </svg>
  );
}

// ============================================================
// Concept 3: Implied-volatility surface σ_imp(K, T)
// ============================================================
function VolatilitySurface3D({ dim = 3 }: { dim?: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 100), 100);
    return () => clearInterval(id);
  }, []);

  // n-D: 3D → 1 underlying smile+term, 4D → 3 assets' surfaces, 5D → 5, N-D → 8
  const nSurfaces = dim === 3 ? 1 : dim === 4 ? 3 : dim === 5 ? 5 : 8;
  const surfaceColors = [
    "oklch(0.65 0.16 165)",
    "oklch(0.65 0.16 30)",
    "oklch(0.65 0.16 320)",
    "oklch(0.65 0.16 200)",
    "oklch(0.65 0.16 130)",
    "oklch(0.65 0.16 60)",
    "oklch(0.65 0.16 280)",
    "oklch(0.65 0.16 100)",
  ];

  // Current (K, T) — pulsing point moves around
  const curK = 100 + 20 * Math.sin(tick / 18);
  const curT = 0.5 + 0.35 * Math.sin(tick / 23);

  const K_vals = [70, 80, 90, 95, 100, 105, 110, 120, 130];
  const T_vals = [0.05, 0.15, 0.3, 0.5, 0.7, 1.0];

  // σ_imp(K, T) = U-shape smile + sqrt term structure + small skew
  const iv = (K: number, T: number, offset: number = 0) => {
    const moneyness = (K - 100) / 100;
    const smile = 0.18 + 1.2 * moneyness * moneyness;
    const term = 0.04 * Math.sqrt(T);
    const skew = -0.05 * moneyness;
    return Math.max(0.05, smile + term + skew + offset);
  };

  // Isometric projection: (K, T, σ) -> (x, y)
  const project = (k: number, t: number, sig: number) => {
    const kNorm = (k - 70) / 60;
    const tNorm = t / 1.0;
    const x = 50 + kNorm * 210 + tNorm * 60;
    const y = 270 - sig * 380 - tNorm * 50;
    return { x, y };
  };

  return (
    <svg viewBox="0 0 360 320" width="100%" height="100%">
      <defs>
        <radialGradient id="vol-dot-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.85 0.20 25 / 0.95)" />
          <stop offset="100%" stopColor="oklch(0.50 0.18 25 / 0.0)" />
        </radialGradient>
      </defs>

      {/* axes */}
      <line x1="50" y1="270" x2="320" y2="270" stroke="oklch(0.55 0.10 250 / 0.6)" strokeWidth="0.8" />
      <line x1="50" y1="50" x2="50" y2="270" stroke="oklch(0.55 0.10 250 / 0.6)" strokeWidth="0.8" />
      <text x="310" y="280" textAnchor="end" fontSize="9" fill="oklch(0.65 0.10 250)">K</text>
      <text x="46" y="55" textAnchor="end" fontSize="9" fill="oklch(0.65 0.10 250)">σ_imp</text>
      <text x="120" y="315" textAnchor="middle" fontSize="8" fill="oklch(0.55 0.10 250)">T → back (term structure)</text>

      {/* Per-surface loop */}
      {Array.from({ length: nSurfaces }).map((_, si) => {
        const surfOffset = (si - (nSurfaces - 1) / 2) * 0.01;
        const color = surfaceColors[si % surfaceColors.length];
        const opacity = nSurfaces === 1 ? 0.9 : 0.4 / nSurfaces * 3;

        // Constant-T curves — the smile at each maturity
        const tCurves = T_vals.map((t, ti) => {
          const points = K_vals.map((k) => project(k, t, iv(k, t, surfOffset)));
          return { ti, points };
        });
        // Constant-K curves — the term structure at each strike
        const kCurves = K_vals.map((k, ki) => {
          const points = T_vals.map((t) => project(k, t, iv(k, t, surfOffset)));
          return { ki, points };
        });

        return (
          <g key={`surf-${si}`} opacity={opacity}>
            {/* constant-T smile curves — heavy lines */}
            {tCurves.map((tc) => (
              <polyline
                key={`tv-${si}-${tc.ti}`}
                points={tc.points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none" stroke={color} strokeWidth="1.2"
              />
            ))}
            {/* constant-K term-structure curves — dashed */}
            {kCurves.map((kc) => (
              <polyline
                key={`kv-${si}-${kc.ki}`}
                points={kc.points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none" stroke={color} strokeWidth="0.5"
                strokeDasharray="2 2" opacity="0.55"
              />
            ))}
          </g>
        );
      })}

      {/* Pulsing dot at (curK, curT) — primary surface only */}
      {(() => {
        const sig = iv(curK, curT);
        const p = project(curK, curT, sig);
        return (
          <g>
            <motion.circle
              cx={p.x} cy={p.y} r={5} fill="url(#vol-dot-glow)"
              animate={{ r: [3, 7, 3] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <circle cx={p.x} cy={p.y} r="2" fill="oklch(0.85 0.20 25)" />
            <text x={p.x + 8} y={p.y - 6} fontSize="9" fill="oklch(0.85 0.20 25)" fontWeight="bold">
              σ={(sig * 100).toFixed(1)}%
            </text>
            <text x={p.x + 8} y={p.y + 4} fontSize="8" fill="oklch(0.65 0.10 250)" fontFamily="monospace">
              K={curK.toFixed(1)} T={curT.toFixed(2)}
            </text>
          </g>
        );
      })()}

      <text x="180" y="305" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
        {nSurfaces === 1 ? "Implied vol σ_imp(K,T)" : `${nSurfaces}-asset vol surfaces`} · smile + term structure
      </text>
    </svg>
  );
}

// ============================================================
// Concept 4: Treasury yield curve + 10Y-3M recession indicator
// ============================================================
function YieldCurve3D({ dim = 3 }: { dim?: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 100), 100);
    return () => clearInterval(id);
  }, []);

  // n-D: 3D → single Treasury curve, 4D → multi-curve (Treasury+swap+OIS),
  // 5D → + forward curve, N-D → multi-currency grid
  const nCurves = dim === 3 ? 1 : dim === 4 ? 3 : dim === 5 ? 4 : 6;
  const curveColors = [
    "oklch(0.65 0.16 250)",
    "oklch(0.65 0.16 165)",
    "oklch(0.65 0.16 30)",
    "oklch(0.65 0.16 320)",
    "oklch(0.65 0.16 200)",
    "oklch(0.65 0.16 130)",
  ];
  const curveLabels = ["UST", "Swap", "OIS", "Fwd", "EUR", "JPY"];
  const curveOffsets = [0, -0.005, -0.012, 0.003, -0.008, -0.015];

  // 8 maturities — canonical Treasury benchmarks
  const baseYields = [
    { label: "3M", t: 0.25, y: 0.043 },
    { label: "6M", t: 0.5, y: 0.045 },
    { label: "1Y", t: 1.0, y: 0.047 },
    { label: "2Y", t: 2.0, y: 0.046 },
    { label: "5Y", t: 5.0, y: 0.044 },
    { label: "7Y", t: 7.0, y: 0.045 },
    { label: "10Y", t: 10.0, y: 0.048 },
    { label: "30Y", t: 30.0, y: 0.052 },
  ];

  // Animated breathing — yields drift up / down subtly over time
  const breath = 0.002 * Math.sin(tick / 18);
  const curves = Array.from({ length: nCurves }, (_, ci) => ({
    label: curveLabels[ci % curveLabels.length],
    color: curveColors[ci % curveColors.length],
    offset: curveOffsets[ci],
    points: baseYields.map((p) => ({
      ...p,
      yAnim: p.y + curveOffsets[ci] + breath + Math.sin(tick / 10 + p.t) * 0.001,
    })),
  }));

  // 10Y-3M spread on the PRIMARY curve (UST)
  const primary = curves[0].points;
  const y10y = primary[6].yAnim;
  const y3m = primary[0].yAnim;
  const spread = y10y - y3m;
  const inverted = spread < 0;

  // Plot: x = log(t) scaled, y = yield (0 to 8%)
  const xMap = (t: number) => 30 + (Math.log(t / 0.25) / Math.log(120)) * 260;
  const yMap = (y: number) => 280 - (y / 0.08) * 230;

  return (
    <svg viewBox="0 0 360 320" width="100%" height="100%">
      <defs>
        <radialGradient id="yc-point-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.85 0.20 25 / 0.95)" />
          <stop offset="100%" stopColor="oklch(0.50 0.18 25 / 0.0)" />
        </radialGradient>
      </defs>

      {/* axes */}
      <line x1="30" y1="50" x2="30" y2="280" stroke="oklch(0.55 0.10 250 / 0.7)" strokeWidth="0.8" />
      <line x1="30" y1="280" x2="320" y2="280" stroke="oklch(0.55 0.10 250 / 0.7)" strokeWidth="0.8" />
      <text x="320" y="294" textAnchor="end" fontSize="9" fill="oklch(0.65 0.10 250)">maturity</text>
      <text x="24" y="55" textAnchor="end" fontSize="9" fill="oklch(0.65 0.10 250)">yield</text>

      {/* Recession-warning backdrop (when inverted) */}
      {inverted && (
        <motion.rect
          x="30" y="50" width="290" height="230"
          fill="oklch(0.70 0.20 25 / 0.08)"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Gridlines at 0%, 2%, 4%, 6%, 8% */}
      {[0, 0.02, 0.04, 0.06, 0.08].map((y) => (
        <g key={`grid-${y}`}>
          <line
            x1="30" y1={yMap(y)} x2="320" y2={yMap(y)}
            stroke="oklch(0.55 0.10 250 / 0.25)" strokeDasharray="2 2" strokeWidth="0.5"
          />
          <text x="28" y={yMap(y) + 3} textAnchor="end" fontSize="8" fill="oklch(0.55 0.10 250)">
            {(y * 100).toFixed(0)}%
          </text>
        </g>
      ))}

      {/* Curves */}
      {curves.map((c, ci) => {
        const opacity = ci === 0 ? 1 : 0.55;
        return (
          <g key={`curve-${ci}`} opacity={opacity}>
            <polyline
              points={c.points.map((p) => `${xMap(p.t)},${yMap(p.yAnim)}`).join(" ")}
              fill="none" stroke={c.color} strokeWidth={ci === 0 ? 2 : 1.4}
            />
            {c.points.map((p, i) => {
              const pulse = 3 + 1.5 * Math.sin(tick / 5 + i);
              return (
                <g key={`yc-${ci}-${i}`}>
                  <motion.circle
                    cx={xMap(p.t)} cy={yMap(p.yAnim)} r={pulse}
                    fill={ci === 0 && inverted ? "oklch(0.85 0.20 25)" : c.color}
                    animate={{ r: [3, 5, 3] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                  />
                  {ci === 0 && (
                    <text x={xMap(p.t)} y={yMap(p.yAnim) - 10} textAnchor="middle" fontSize="8" fill="oklch(0.75 0.10 250)">
                      {p.label}
                    </text>
                  )}
                </g>
              );
            })}
            {ci > 0 && (
              <text
                x={xMap(c.points[c.points.length - 1].t) + 4}
                y={yMap(c.points[c.points.length - 1].yAnim) + 3}
                fontSize="8" fill={c.color} fontWeight="bold"
              >
                {c.label}
              </text>
            )}
          </g>
        );
      })}

      {/* 10Y-3M spread indicator — vertical bar between the two points */}
      <g>
        <line
          x1={xMap(0.25)} y1={yMap(y3m)} x2={xMap(10)} y2={yMap(y3m)}
          stroke="oklch(0.65 0.10 250 / 0.4)" strokeWidth="0.5" strokeDasharray="3 3"
        />
        <line
          x1={xMap(10)} y1={yMap(y3m)} x2={xMap(10)} y2={yMap(y10y)}
          stroke={inverted ? "oklch(0.85 0.20 25)" : "oklch(0.85 0.16 165)"}
          strokeWidth="2"
        />
      </g>

      <text
        x="180" y="305" textAnchor="middle" fontSize="10"
        fill={inverted ? "oklch(0.85 0.20 25)" : "oklch(0.85 0.16 165)"}
        fontWeight="bold"
      >
        {inverted ? "⚠ INVERTED — recession warning" : "normal: 10Y > 3M"}
      </text>
      <text x="180" y="318" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)" fontFamily="monospace">
        10Y-3M spread = {(spread * 100).toFixed(2)}%   ·   {nCurves > 1 ? `${nCurves} curves` : "Treasury only"}
      </text>
    </svg>
  );
}

// ============================================================
// n-D toggle (3D / 4D / 5D / N-D) — fintech edition
// ============================================================
function DimToggle({ value, onChange }: { value: number; onChange: (d: number) => void }) {
  const options = [
    { d: 3, label: "3D", hint: "single stock / single curve" },
    { d: 4, label: "4D", hint: "portfolio (multi-asset)" },
    { d: 5, label: "5D", hint: "derivatives portfolio" },
    { d: 99, label: "N-D", hint: "full risk grid (all classes × all maturities)" },
  ];
  return (
    <div className="flex flex-wrap gap-1.5 items-center justify-center bg-muted/30 rounded-md p-1.5 border border-border/40">
      <span className="text-[10px] text-muted-foreground px-1 flex items-center gap-1">
        <Layers className="h-3 w-3" /> Risk scope:
      </span>
      {options.map((o) => (
        <button
          key={o.d}
          type="button"
          onClick={() => onChange(o.d)}
          className={`text-[10px] px-2 py-1 rounded transition-colors ${
            value === o.d
              ? "bg-primary text-primary-foreground font-semibold"
              : "hover:bg-accent text-foreground/70"
          }`}
          title={o.hint}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================
// The 4 cards

// Code constructs - Python that computes the math behind each 3D visual
const BS_GALLERY_CODE = `import math
def norm_cdf(x):
    if x < 0: return 1 - norm_cdf(-x)
    a1,a2,a3,a4,a5 = 0.254829592,-0.284496736,1.421413741,-1.453152027,1.061405429
    p = 0.3275911; t = 1.0/(1.0+p*x)
    return 1.0 - (((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t
def bs_call(S, K, r, sigma, T):
    d1 = (math.log(S/K) + (r + sigma*sigma/2)*T) / (sigma*math.sqrt(T))
    d2 = d1 - sigma*math.sqrt(T)
    return S * norm_cdf(d1) - K * math.exp(-r*T) * norm_cdf(d2)
print("=== Black-Scholes call surface ===")
for S in [80, 90, 100, 110, 120]:
    for T in [0.25, 0.5, 1.0]:
        C = bs_call(S, 100, 0.05, 0.2, T)
        print(f"  S={S:>3} T={T:.2f} -> C={C:.4f}")`;

const MC_GALLERY_CODE = `import math, random
random.seed(42)
def gaussian():
    u1 = random.random(); u2 = random.random()
    return math.sqrt(-2*math.log(u1)) * math.cos(2*math.pi*u2)
print("=== Monte Carlo GBM paths ===")
S0 = 100; mu = 0.0005; sigma = 0.015
for i in range(5):
    Z = gaussian()
    S_T = S0 * math.exp((mu - sigma*sigma/2) + sigma * Z)
    pnl = S_T - S0
    print(f"  path {i+1}: Z={Z:+.3f} -> S_T={S_T:.2f} PnL={pnl:+.2f}")`;

const VOL_SURFACE_CODE = `print("=== Volatility surface (SVI parametric) ===")
print("  Smile: sigma(k) = a + b*(rho*k + sqrt(k^2 + sigma^2))")
print("  Term:  sigma(T) = sigma_inf + (sigma_0 - sigma_inf)*exp(-alpha*T)")
for k in [-0.3, -0.1, 0.0, 0.1, 0.3]:
    iv = 0.18 + 0.04 * k**2 + 0.02 * k
    print(f"  k={k:+.1f} -> IV={iv*100:.1f}%")`;

const YIELD_CURVE_CODE = `print("=== Treasury yield curve (Nelson-Siegel) ===")
print("  y(t) = y_inf + (y_0 - y_inf)*exp(-alpha*t)")
for name, y in [("3M",5.0),("1Y",4.5),("5Y",4.1),("10Y",4.0),("30Y",4.3)]:
    print(f"  {name:>3}: {y:.1f}%")
spread = 4.0 - 5.0
print(f"  10Y-3M = {spread:.1f}% -> {'RECESSION SIGNAL' if spread < 0 else 'normal growth'}")`;

// ============================================================
interface GalleryCard {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  icon: ReactNode;
  thumb: ReactNode;
  detail: ReactNode;
  caption: string;
  code?: string;
  mathExpr?: string;
}

const CARDS: GalleryCard[] = [
  {
    id: "bs-surface",
    title: "Black-Scholes surface",
    subtitle: "C(S, T) call price",
    accent: "oklch(0.65 0.16 250)",
    icon: <Box className="h-4 w-4" />,
    thumb: <BlackScholesSurface3D dim={3} />,
    detail: <BlackScholesSurface3D dim={3} />,
    caption:
      "Black-Scholes call surface — European call price C as a function of spot S and time-to-maturity T. The surface asymptotes to max(S−K, 0) at expiry (intrinsic value) and grows smoothly as T increases (time value). At-the-money options have the highest time-value decay (theta). The pulsing dot tracks the live (S, T) point and shows its current call price.",
    code: BS_GALLERY_CODE,
    mathExpr: "C = S*N(d1) - K*exp(-rT)*N(d2)  ·  d1 = (ln(S/K)+(r+sigma^2/2)T)/(sigma*sqrt(T))",
  },
  {
    id: "monte-carlo",
    title: "Monte Carlo paths",
    subtitle: "GBM + VaR / CVaR tails",
    accent: "oklch(0.65 0.16 165)",
    icon: <Activity className="h-4 w-4" />,
    thumb: <MonteCarloPaths3D dim={3} />,
    detail: <MonteCarloPaths3D dim={3} />,
    caption:
      "Monte Carlo simulation — 20 GBM paths dS = μS·dt + σS·dW fan out from S₀=100. Once they reach T, the right-edge histogram shows the terminal-price distribution. VaR(5%) marks the 5th-percentile price floor (the loss threshold exceeded only 5% of the time); CVaR is the conditional mean of the tail beyond VaR (Expected Shortfall). The two together quantify tail risk under the log-normal model.",
    code: MC_GALLERY_CODE,
    mathExpr: "GBM: S_T = S_0*exp((mu-sigma^2/2)T + sigma*sqrt(T)*Z)  ·  VaR = -Q_alpha(PnL)",
  },
  {
    id: "vol-surface",
    title: "Volatility surface",
    subtitle: "σ_imp(K, T) smile + term",
    accent: "oklch(0.65 0.16 320)",
    icon: <TrendingUp className="h-4 w-4" />,
    thumb: <VolatilitySurface3D dim={3} />,
    detail: <VolatilitySurface3D dim={3} />,
    caption:
      "Implied-volatility surface — σ_imp as a function of strike K (the smile) and maturity T (the term structure). The smile is U-shaped because out-of-the-money puts and calls are pricier than Black-Scholes predicts (crash premium). Term structure typically slopes upward in calm regimes and downward in stressed ones. The pulsing dot marks the ATM implied vol for the current (K, T).",
    code: VOL_SURFACE_CODE,
    mathExpr: "sigma(k) = a + b*(rho*k + sqrt(k^2 + sigma^2))  (SVI parametric)",
  },
  {
    id: "yield-curve",
    title: "Treasury yield curve",
    subtitle: "8 maturities · 10Y-3M spread",
    accent: "oklch(0.65 0.16 30)",
    icon: <BarChart3 className="h-4 w-4" />,
    thumb: <YieldCurve3D dim={3} />,
    detail: <YieldCurve3D dim={3} />,
    caption:
      "Treasury yield curve — 8 maturities from 3M to 30Y. The 10Y-3M spread is the canonical recession indicator: every US recession since 1970 was preceded by a negative spread (inversion). An inverted curve flashes red here. Higher dimensions overlay swap / OIS / forward curves and other currencies, exposing basis risk across funding markets.",
    code: YIELD_CURVE_CODE,
    mathExpr: "y(t) = y_inf + (y_0 - y_inf)*exp(-alpha*t)  ·  10Y-3M < 0 = recession",
  },
];

// ============================================================
// Main grid + lazy modal
// ============================================================
export function FintechGallery3D() {
  const [dim, setDim] = useState(3);
  const [openId, setOpenId] = useState<string | null>(null);

  const openCard = openId ? CARDS.find((c) => c.id === openId) : null;

  // Esc to close
  useEffect(() => {
    if (!openId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [openId]);

  // Stable click handlers (so re-renders don't thrash)
  const handleCardClick = useCallback((id: string) => setOpenId(id), []);
  const handleClose = useCallback(() => setOpenId(null), []);

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5 flex-wrap">
        <DollarSign className="h-3 w-3 text-emerald-500" />
        Click any card to pop up an animated 3D scene with a risk-scope toggle + floating quant-math background.
        <span className="text-[10px]">Modal content is lazy-rendered — no SVG animations mount until the card is opened.</span>
      </p>

      {/* 4 cards — grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {CARDS.map((c) => (
          <motion.button
            key={c.id}
            type="button"
            onClick={() => handleCardClick(c.id)}
            className="relative rounded-xl overflow-hidden border border-border/60 hover:border-primary/60 hover:shadow-lg transition-all bg-gradient-to-br from-card to-muted/30 group"
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            aria-label={`Open 3D gallery: ${c.title}`}
          >
            {/* 9:16 thumbnail with 3D animated scene */}
            <div className="relative w-full bg-gradient-to-br from-muted/40 to-card" style={{ aspectRatio: "9 / 14", maxHeight: 280 }}>
              <div className="absolute inset-0 p-2">
                {c.thumb}
              </div>
              <div className="absolute top-2 left-2 z-10">
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-0.5"
                  style={{ backgroundColor: c.accent + "20", color: c.accent }}>
                  {c.icon} 3D
                </Badge>
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ opacity: 1, scale: 1 }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur rounded-full p-2.5 border border-border shadow-md"
                >
                  <DollarSign className="h-4 w-4 text-primary" />
                </motion.div>
              </div>
            </div>
            {/* caption */}
            <div className="p-2.5 border-t border-border/40 bg-background/80">
              <p className="text-xs font-semibold leading-tight" style={{ color: c.accent }}>
                {c.title}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{c.subtitle}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* LAZY modal — only mounts the heavy SVG + background when open */}
      <AnimatePresence>
        {openCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 md:p-6 overflow-y-auto"
            onClick={handleClose}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-3 right-3 z-30 p-2 rounded-full bg-background/90 border border-border hover:bg-accent transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            {/* Title pill */}
            <div className="absolute top-3 left-3 z-30 px-3 py-1.5 rounded-full bg-background/90 border border-border flex items-center gap-2 text-xs font-semibold">
              <span style={{ color: openCard.accent }}>{openCard.icon}</span>
              <span style={{ color: openCard.accent }}>{openCard.title}</span>
              <span className="text-muted-foreground font-normal">· 3D animated · lazy-loaded</span>
            </div>
            {/* Modal body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-4xl my-8 rounded-xl border border-border bg-background shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with dim toggle */}
              <div className="border-b border-border/40 bg-muted/20 px-4 md:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                    style={{ backgroundColor: openCard.accent + "20" }}
                  >
                    {openCard.icon}
                  </div>
                  <div>
                    <p className="text-base font-bold leading-tight" style={{ color: openCard.accent }}>
                      {openCard.title}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">{openCard.subtitle}</p>
                  </div>
                </div>
                <DimToggle value={dim} onChange={setDim} />
              </div>

              {/* Main animated scene with floating math/code background */}
              <div className="relative bg-gradient-to-br from-background to-muted/30 p-4 md:p-6">
                {/* Floating background — math/code snippets drifting subtly */}
                <FloatingBackground />
                {/* Foreground — the actual 3D scene */}
                <div className="relative z-10 max-h-[70vh] overflow-hidden rounded-lg bg-card/40 backdrop-blur-sm">
                  <Scene3D w={360} h={320}>
                    {openCard.id === "bs-surface" && <BlackScholesSurface3D dim={dim} />}
                    {openCard.id === "monte-carlo" && <MonteCarloPaths3D dim={dim} />}
                    {openCard.id === "vol-surface" && <VolatilitySurface3D dim={dim} />}
                    {openCard.id === "yield-curve" && <YieldCurve3D dim={dim} />}
                  </Scene3D>
                </div>
              </div>

              {/* Math foundation */}
              {openCard.mathExpr && (
                <div className="border-t border-border/40 bg-primary/5 px-4 md:px-6 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Math foundation</p>
                  <p className="font-mono text-xs text-primary leading-relaxed">{openCard.mathExpr}</p>
                </div>
              )}
              {/* Code construct */}
              {openCard.code && (
                <div className="border-t border-border/40 px-4 md:px-6 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Code construct - run the computation</p>
                  <PyodideRunner
                    buttonLabel="Run computation (Pyodide)"
                    code={openCard.code}
                  />
                </div>
              )}

              {/* Footer with caption */}
              <div className="border-t border-border/40 bg-muted/20 px-4 md:px-6 py-3">
                <p className="text-xs text-muted-foreground leading-relaxed">{openCard.caption}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-2">
                  Toggle the risk scope above — 3D shows the simplest case (single stock / single curve).
                  Higher dimensions add more underlyings, asset classes, or currencies, revealing
                  how the concept scales across a real trading book. The drifting background shows
                  the quant math (Black-Scholes, GBM, Heston, SABR, VaR / CVaR, greeks) that powers
                  the visual.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
