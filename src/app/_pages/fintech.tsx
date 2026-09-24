"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { ImageModal } from "../_components/image-modal";
import { FintechInteractives } from "../_components/fintech-interactives";
import { FintechShortsCarousel } from "../_components/fintech-shorts";
import { FintechGallery3D } from "../_components/fintech-gallery-3d";
import { QuantTradeCards } from "../_components/quant-trade-cards";
import {
  LOWLEVEL_RUST,
  LOWLEVEL_SCALA,
  LOWLEVEL_ELIXIR,
  LOWLEVEL_C,
} from "../_components/_quant_trade_lowlevel";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Cpu, Zap, TrendingUp, Terminal, Brain, Activity, Atom, Network, Sparkles } from "lucide-react";
import { RelatedTopics } from "../_components/related-topics";

const KPIS = [
  { label: "Black-Scholes", value: "C = S·N(d₁) - K·e^(-rT)·N(d₂)", hint: "Closed-form European option pricing (Black 1973)", deltaTone: "flat" as const },
  { label: "Monte Carlo", value: "100M paths/s", hint: "GPU-accelerated GBM simulation for exotic payoffs", deltaTone: "up" as const },
  { label: "Risk", value: "VaR + CVaR", hint: "Quantile P(L&gt;VaR)=1-α, CVaR=E[L|L&gt;VaR]", deltaTone: "flat" as const },
  { label: "LSTM trading", value: "52% accuracy", hint: "Price-direction hit rate vs 50% random baseline", deltaTone: "up" as const },
];

// ============================================================
// Fintech "short" — 5-phase looping animation
// ============================================================
function FintechShort() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setStep((s) => (s + 1) % 5), 1400);
    return () => clearInterval(interval);
  }, []);

  const phases = [
    { name: "Price chart", desc: "GBM price path S(t) = S₀·exp((μ-½σ²)t + σ·W(t))" },
    { name: "Option payoff", desc: "max(S(T) - K, 0) — European call expiry" },
    { name: "Monte Carlo paths", desc: "10⁴–10⁸ simulated trajectories → E[payoff]" },
    { name: "VaR percentile", desc: "5% tail of P&L distribution → VaR₉₅" },
    { name: "Fraud graph", desc: "GNN over transaction network detects rings" },
  ];
  const phase = phases[step];

  // Simulated GBM-like price path (deterministic so loop is stable)
  const pricePath = Array.from({ length: 40 }, (_, i) => {
    const t = i / 40;
    return 100 * Math.exp((0.08 - 0.5 * 0.04) * t + 0.2 * Math.sqrt(t) * Math.sin(i * 0.7));
  });
  const maxP = Math.max(...pricePath);
  const minP = Math.min(...pricePath);

  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <p className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        Quant pipeline — 5 phases (loop)
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">
          phase {step + 1}/5 · {phase.name}
        </span>
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Left: SVG canvas — what's being shown */}
        <div className="rounded-md border border-border/60 bg-muted/30 p-3">
          <svg viewBox="0 0 320 180" className="w-full h-auto">
            {/* grid */}
            {[40, 80, 120, 160].map((y) => (
              <line key={y} x1="20" y1={y} x2="310" y2={y} stroke="var(--border)" strokeWidth="0.5" opacity="0.5" />
            ))}

            {/* Phase 0/2: GBM price path / Monte Carlo fan */}
            {(step === 0 || step === 2) && (
              <>
                {step === 2 && (
                  // Fan of grey Monte Carlo paths
                  Array.from({ length: 14 }).map((_, k) => {
                    const seed = k * 0.7;
                    const path = Array.from({ length: 40 }, (_, i) => {
                      const t = i / 40;
                      const noise = Math.sin(i * 0.5 + seed) * Math.cos(i * 0.3 + seed * 0.7);
                      return 100 * Math.exp((0.08 - 0.5 * 0.04) * t + 0.2 * Math.sqrt(t) * noise);
                    });
                    const mx = Math.max(...path), mn = Math.min(...path);
                    const rng = mx - mn || 1;
                    const pts = path
                      .map((p, i) => `${20 + (i * 290) / 39},${160 - ((p - mn) / rng) * 120 - 20}`)
                      .join(" ");
                    return (
                      <polyline
                        key={k}
                        points={pts}
                        fill="none"
                        stroke="var(--muted-foreground)"
                        strokeWidth="0.6"
                        opacity="0.35"
                      />
                    );
                  })
                )}
                {/* Main path */}
                <polyline
                  points={pricePath
                    .map((p, i) => `${20 + (i * 290) / 39},${160 - ((p - minP) / (maxP - minP || 1)) * 120 - 20}`)
                    .join(" ")}
                  fill="none"
                  stroke="var(--chart-2)"
                  strokeWidth="2"
                />
                <text x="160" y="15" textAnchor="middle" fontSize="9" fill="var(--foreground)">
                  {step === 0 ? "Price chart S(t)" : "Monte Carlo paths (10⁴)"}
                </text>
              </>
            )}

            {/* Phase 1: Option payoff */}
            {step === 1 && (
              <>
                <line x1="20" y1="100" x2="310" y2="100" stroke="var(--border)" strokeWidth="0.8" />
                <text x="160" y="90" fontSize="8" fill="var(--muted-foreground)" textAnchor="middle">strike K</text>
                {/* payoff curve: flat 0 then rising past K */}
                <polyline
                  points={Array.from({ length: 60 }, (_, i) => {
                    const s = 70 + (i * 200) / 59; // spot from 70 to 270
                    const payoff = Math.max(s - 180, 0);
                    return `${20 + (i * 290) / 59},${160 - payoff * 0.7}`;
                  }).join(" ")}
                  fill="none"
                  stroke="var(--chart-3)"
                  strokeWidth="2.2"
                />
                <text x="160" y="15" textAnchor="middle" fontSize="9" fill="var(--foreground)">
                  Call payoff = max(S - K, 0)
                </text>
              </>
            )}

            {/* Phase 3: VaR percentile — histogram + tail */}
            {step === 3 && (
              <>
                {Array.from({ length: 28 }).map((_, i) => {
                  const x = 20 + i * 10;
                  const center = 14;
                  const dist = Math.exp(-((i - center) ** 2) / 80);
                  const h = dist * 90;
                  const isTail = i < 4;
                  return (
                    <motion.rect
                      key={i}
                      x={x}
                      y={160 - h}
                      width="8"
                      height={h}
                      fill={isTail ? "var(--chart-1)" : "var(--chart-4)"}
                      opacity={isTail ? 0.9 : 0.55}
                      initial={{ height: 0 }}
                      animate={{ height: h }}
                    />
                  );
                })}
                <line x1="55" y1="20" x2="55" y2="160" stroke="var(--chart-1)" strokeWidth="1" strokeDasharray="3,2" />
                <text x="60" y="30" fontSize="9" fill="var(--chart-1)">VaR₉₅</text>
                <text x="160" y="15" textAnchor="middle" fontSize="9" fill="var(--foreground)">
                  P&amp;L distribution — 5% left tail
                </text>
              </>
            )}

            {/* Phase 4: Fraud graph */}
            {step === 4 && (
              <>
                {(() => {
                  // 12 transaction nodes laid out; a "fraud ring" of 3 nodes is highlighted
                  const nodes = Array.from({ length: 12 }, (_, i) => {
                    const angle = (i / 12) * 2 * Math.PI;
                    return { x: 160 + Math.cos(angle) * 70, y: 90 + Math.sin(angle) * 55, i };
                  });
                  const fraudRing = [2, 5, 8];
                  return (
                    <>
                      {/* edges */}
                      {Array.from({ length: 18 }).map((_, k) => {
                        const a = nodes[k % 12];
                        const b = nodes[(k + 3 + (k % 4)) % 12];
                        const isRing = fraudRing.includes(a.i) && fraudRing.includes(b.i);
                        return (
                          <line
                            key={k}
                            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                            stroke={isRing ? "var(--chart-1)" : "var(--border)"}
                            strokeWidth={isRing ? 1.4 : 0.8}
                            opacity={isRing ? 0.9 : 0.4}
                          />
                        );
                      })}
                      {/* nodes */}
                      {nodes.map((n) => {
                        const isFraud = fraudRing.includes(n.i);
                        return (
                          <circle
                            key={n.i}
                            cx={n.x} cy={n.y} r={isFraud ? 5 : 3.5}
                            fill={isFraud ? "var(--chart-1)" : "var(--chart-4)"}
                          />
                        );
                      })}
                    </>
                  );
                })()}
                <text x="160" y="15" textAnchor="middle" fontSize="9" fill="var(--foreground)">
                  Transaction graph — fraud ring flagged
                </text>
              </>
            )}
          </svg>
        </div>

        {/* Right: phase explanation */}
        <div className="flex flex-col gap-2">
          {phases.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: i === step ? 1 : 0.4 }}
              className={`rounded-md border p-2.5 ${
                i === step ? "border-primary/60 bg-primary/10" : "border-border/40 bg-muted/20"
              }`}
            >
              <p className="text-xs font-semibold flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${i === step ? "bg-primary" : "bg-muted-foreground/40"}`} />
                {i + 1}. {p.name}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 ml-4 font-mono">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center mt-3">
        Phase 1: GBM price chart. Phase 2: option payoff at expiry.
        Phase 3: Monte Carlo paths fan for pricing. Phase 4: P&amp;L histogram with VaR tail.
        Phase 5: transaction graph GNN flags fraud rings.
      </p>
    </div>
  );
}

const PYODIDE_CODE = `# ============================================================
# Quant finance in pure Python (Pyodide, no numpy needed)
#   1. Black-Scholes call/put pricing
#   2. Monte Carlo simulation (10000 GBM paths)
#   3. VaR / CVaR (historical, 95% confidence)
#   4. Markowitz mean-variance portfolio optimization
# ============================================================

import math
import random

# ------------------------------------------------------------
# 1. Black-Scholes closed-form European option pricing
#    C = S·N(d1) - K·e^(-rT)·N(d2)
#    d1 = (ln(S/K) + (r + σ²/2)·T) / (σ·√T)
#    d2 = d1 - σ·√T
# ------------------------------------------------------------

def norm_cdf(x):
    """Standard normal CDF via the error function."""
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2)))

def norm_pdf(x):
    """Standard normal PDF (used in Greeks)."""
    return math.exp(-0.5 * x * x) / math.sqrt(2 * math.pi)

def black_scholes(S, K, T, r, sigma, option='call'):
    """Black-Scholes European option price + Greeks.

    S     spot price
    K     strike
    T     time to expiry (years)
    r     risk-free rate (annual, continuous)
    sigma volatility (annualised)
    """
    if T <= 0 or sigma <= 0:
        # Intrinsic value at expiry
        if option == 'call':
            return max(S - K, 0.0), 0.0
        return max(K - S, 0.0), 0.0
    sqrt_T = math.sqrt(T)
    d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * sqrt_T)
    d2 = d1 - sigma * sqrt_T
    if option == 'call':
        price = S * norm_cdf(d1) - K * math.exp(-r * T) * norm_cdf(d2)
        delta = norm_cdf(d1)
    else:
        price = K * math.exp(-r * T) * norm_cdf(-d2) - S * norm_cdf(-d1)
        delta = -norm_cdf(-d1)
    gamma = norm_pdf(d1) / (S * sigma * sqrt_T)
    vega = S * norm_pdf(d1) * sqrt_T / 100  # per 1% vol move
    return price, (delta, gamma, vega)

# ------------------------------------------------------------
# 2. Monte Carlo option pricing via Geometric Brownian Motion
#    S(T) = S0 · exp((r - ½σ²)·T + σ·√T·Z),  Z ~ N(0, 1)
#    Variance reduction: antithetic variates (use both +Z and -Z)
# ------------------------------------------------------------

def monte_carlo_call(S0, K, T, r, sigma, n_paths=10000, seed=42):
    """Price a European call via Monte Carlo GBM simulation."""
    random.seed(seed)
    sqrt_T = math.sqrt(T)
    drift = (r - 0.5 * sigma ** 2) * T
    diffusion = sigma * sqrt_T
    total = 0.0
    sum_sq = 0.0
    for _ in range(n_paths):
        Z = random.gauss(0.0, 1.0)
        # Antithetic: also price with -Z, average both
        for z in (Z, -Z):
            ST = S0 * math.exp(drift + diffusion * z)
            payoff = max(ST - K, 0.0)
            total += payoff
            sum_sq += payoff * payoff
    n = 2 * n_paths
    mean = total / n
    var = max((sum_sq - n * mean * mean) / (n - 1), 0.0) if n > 1 else 0.0
    se = math.sqrt(var / n)  # standard error
    return math.exp(-r * T) * mean, se

# ------------------------------------------------------------
# 3. Value at Risk (VaR) and Conditional VaR (CVaR / Expected Shortfall)
#    VaR_α   = -inf{x : P(L > x) ≤ 1 - α}  (the α-quantile of losses)
#    CVaR_α  = E[L | L > VaR_α]            (mean loss in the tail)
# ------------------------------------------------------------

def var_cvar(returns, alpha=0.95):
    """Historical VaR and CVaR from a sample of returns."""
    sorted_r = sorted(returns)
    n = len(sorted_r)
    # Tail index: smallest (1-α) fraction of returns = worst losses
    idx = max(int(math.ceil((1 - alpha) * n)) - 1, 0)
    var = -sorted_r[idx]                       # loss at the α-quantile
    tail = sorted_r[:idx + 1]
    cvar = -sum(tail) / len(tail) if tail else var
    return var, cvar

# ------------------------------------------------------------
# 4. Markowitz mean-variance portfolio optimization
#    minimise  w^T Σ w        (portfolio variance)
#    s.t.      w^T μ = r_target
#              1^T w = 1
#    Closed-form minimum-variance (no return target):
#        w* = Σ^(-1) 1 / (1^T Σ^(-1) 1)
# ------------------------------------------------------------

def matrix_inverse(A):
    """Invert an n×n matrix via Gauss-Jordan elimination."""
    n = len(A)
    aug = [list(A[i]) + [1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]
    for i in range(n):
        piv = aug[i][i]
        if abs(piv) < 1e-12:
            for k in range(i + 1, n):
                if abs(aug[k][i]) > 1e-12:
                    aug[i], aug[k] = aug[k], aug[i]
                    piv = aug[i][i]
                    break
        for j in range(2 * n):
            aug[i][j] /= piv
        for k in range(n):
            if k != i:
                factor = aug[k][i]
                for j in range(2 * n):
                    aug[k][j] -= factor * aug[i][j]
    return [row[n:] for row in aug]

def markowitz(mu, cov):
    """Closed-form minimum-variance portfolio weights."""
    n = len(mu)
    inv = matrix_inverse(cov)
    # Σ^(-1) · 1
    ones = [1.0] * n
    sv = [sum(inv[i][j] * ones[j] for j in range(n)) for i in range(n)]
    total = sum(sv)
    w = [v / total for v in sv]
    port_ret = sum(w[i] * mu[i] for i in range(n))
    port_var = sum(w[i] * w[j] * cov[i][j] for i in range(n) for j in range(n))
    return w, port_ret, math.sqrt(port_var)

# ============================================================
# Demo runs
# ============================================================

print("=" * 64)
print("1. BLACK-SCHOLES OPTION PRICING + GREEKS")
print("=" * 64)
S, K, T, r, sigma = 100.0, 105.0, 1.0, 0.05, 0.20
call, (delta, gamma, vega) = black_scholes(S, K, T, r, sigma, 'call')
put, _ = black_scholes(S, K, T, r, sigma, 'put')
print(f"  S={S}, K={K}, T={T}y, r={r}, σ={sigma}")
print(f"  Call price : {call:.4f}    Delta={delta:.4f}  Gamma={gamma:.6f}  Vega={vega:.4f}")
print(f"  Put  price : {put:.4f}")
parity_lhs = call - put
parity_rhs = S - K * math.exp(-r * T)
print(f"  Put-call parity check: C-P={parity_lhs:.4f}, S-K·e^(-rT)={parity_rhs:.4f}")

print()
print("=" * 64)
print("2. MONTE CARLO CALL (10,000 antithetic paths)")
print("=" * 64)
mc, se = monte_carlo_call(S, K, T, r, sigma, n_paths=10000)
print(f"  MC price  : {mc:.4f} ± {se:.4f} (1 std error)")
print(f"  Closed form: {call:.4f}")
print(f"  |diff|    : {abs(mc - call):.4f}   within 2σ: {abs(mc - call) < 2 * se}")

print()
print("=" * 64)
print("3. VAR / CVAR  (95% confidence, 252 daily returns)")
print("=" * 64)
random.seed(7)
daily = [random.gauss(0.0004, 0.012) for _ in range(252)]
v95, c95 = var_cvar(daily, alpha=0.95)
v99, c99 = var_cvar(daily, alpha=0.99)
print(f"  Daily    VaR(95%) = {v95*100:6.3f}%   CVaR(95%) = {c95*100:6.3f}%")
print(f"  Daily    VaR(99%) = {v99*100:6.3f}%   CVaR(99%) = {c99*100:6.3f}%")
print(f"  Annual   VaR(95%) = {v95*math.sqrt(252)*100:6.2f}%   CVaR = {c95*math.sqrt(252)*100:6.2f}%")

print()
print("=" * 64)
print("4. MARKOWITZ PORTFOLIO OPTIMIZATION (3 assets)")
print("=" * 64)
mu = [0.10, 0.04, 0.06]   # stocks, bonds, gold expected returns
cov = [
    [0.0400, 0.0050, 0.0020],
    [0.0050, 0.0100, -0.0010],
    [0.0020, -0.0010, 0.0200],
]
w, ret, vol = markowitz(mu, cov)
for asset, weight in zip(['Stocks', 'Bonds', 'Gold'], w):
    print(f"  {asset:7s}: {weight*100:6.2f}%")
print(f"  Expected return: {ret*100:5.2f}%    Volatility: {vol*100:5.2f}%")
print(f"  Sharpe (rf=2%):  {(ret - 0.02)/vol:.3f}")
print("=" * 64)`;

const PYTORCH_CODE = `import torch
import torch.nn as nn
import torch.nn.functional as F
import math
from typing import Dict, Tuple, Optional

# ============================================================
# 1. BlackScholesModel — closed-form pricing + 5 Greeks
#    C = S·N(d1) - K·e^(-rT)·N(d2)
#    d1 = (ln(S/K) + (r + σ²/2)·T) / (σ·√T)
#    d2 = d1 - σ·√T
#    Greeks: Delta, Gamma, Vega, Theta, Rho (closed form)
# ============================================================

class BlackScholesModel(nn.Module):
    """Vectorised Black-Scholes European option pricer with Greeks.

    All inputs are tensors and broadcast together. Returns a dict of
    price plus delta / gamma / vega / theta / rho. Differentiable —
    can be used inside a deep hedging loss (Buehler 2019).
    """

    def __init__(self):
        super().__init__()

    @staticmethod
    def _norm_cdf(x: torch.Tensor) -> torch.Tensor:
        # Standard normal CDF via erf — differentiable in PyTorch
        return 0.5 * (1.0 + torch.erf(x / math.sqrt(2.0)))

    @staticmethod
    def _norm_pdf(x: torch.Tensor) -> torch.Tensor:
        return torch.exp(-0.5 * x * x) / math.sqrt(2.0 * math.pi)

    def forward(
        self,
        S: torch.Tensor,
        K: torch.Tensor,
        T: torch.Tensor,
        r: torch.Tensor,
        sigma: torch.Tensor,
        option_type: str = "call",
    ) -> Dict[str, torch.Tensor]:
        sqrt_T = torch.sqrt(T.clamp(min=1e-12))
        d1 = (torch.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * sqrt_T)
        d2 = d1 - sigma * sqrt_T
        N_d1 = self._norm_cdf(d1)
        N_d2 = self._norm_cdf(d2)
        N_neg_d1 = self._norm_cdf(-d1)
        N_neg_d2 = self._norm_cdf(-d2)
        pdf_d1 = self._norm_pdf(d1)
        discount = torch.exp(-r * T)
        if option_type == "call":
            price = S * N_d1 - K * discount * N_d2
            delta = N_d1
            theta = -S * pdf_d1 * sigma / (2 * sqrt_T) - r * K * discount * N_d2
            rho = K * T * discount * N_d2
        else:
            price = K * discount * N_neg_d2 - S * N_neg_d1
            delta = -N_neg_d1
            theta = -S * pdf_d1 * sigma / (2 * sqrt_T) + r * K * discount * N_neg_d2
            rho = -K * T * discount * N_neg_d2
        gamma = pdf_d1 / (S * sigma * sqrt_T)
        vega = S * pdf_d1 * sqrt_T            # per 1.00 (100%) vol
        return {
            "price": price,
            "delta": delta,
            "gamma": gamma,
            "vega": vega / 100.0,             # per 1% vol move
            "theta": theta / 365.0,           # per calendar day
            "rho": rho / 100.0,               # per 1% rate move
        }


# ============================================================
# 2. MonteCarloPricer — GBM simulation + path-dependent options
#    dS_t = μ·S_t·dt + σ·S_t·dW_t
#    S(t+dt) = S(t) · exp((μ - ½σ²)·dt + σ·√dt·Z),  Z ~ N(0,1)
#    Supports: European, Asian (avg), Barrier (knock-out)
#    Variance reduction: antithetic variates (Z and -Z).
# ============================================================

class MonteCarloPricer(nn.Module):
    def __init__(self, n_paths: int = 100_000, n_steps: int = 252,
                 antithetic: bool = True):
        super().__init__()
        self.n_paths = n_paths
        self.n_steps = n_steps
        self.antithetic = antithetic

    def simulate_gbm(self, S0: torch.Tensor, mu: torch.Tensor,
                     sigma: torch.Tensor, T: torch.Tensor) -> torch.Tensor:
        """Return (n_paths, n_steps+1) tensor of GBM price paths."""
        dt = T / self.n_steps
        if self.antithetic:
            half = self.n_paths // 2
            Z = torch.randn(half, self.n_steps, device=S0.device)
            Z = torch.cat([Z, -Z], dim=0)
        else:
            Z = torch.randn(self.n_paths, self.n_steps, device=S0.device)
        drift = (mu - 0.5 * sigma ** 2) * dt
        diffusion = sigma * math.sqrt(dt.item() if isinstance(dt, torch.Tensor) else dt) * Z
        log_increments = drift + diffusion
        log_prices = torch.cat(
            [torch.zeros(self.n_paths, 1, device=S0.device),
             torch.cumsum(log_increments, dim=1)], dim=1)
        return S0 * torch.exp(log_prices)

    def price_european(self, S0, K, T, r, sigma, option="call") -> torch.Tensor:
        paths = self.simulate_gbm(S0, r, sigma, T)  # μ = r (risk-neutral)
        ST = paths[:, -1]
        payoff = torch.clamp(ST - K, min=0.0) if option == "call" else torch.clamp(K - ST, min=0.0)
        return torch.exp(-r * T) * payoff.mean()

    def price_asian(self, S0, K, T, r, sigma, option="call") -> torch.Tensor:
        paths = self.simulate_gbm(S0, r, sigma, T)
        avg = paths[:, 1:].mean(dim=1)
        payoff = torch.clamp(avg - K, min=0.0) if option == "call" else torch.clamp(K - avg, min=0.0)
        return torch.exp(-r * T) * payoff.mean()

    def price_barrier(self, S0, K, T, r, sigma, H, option="call",
                      barrier="up_and_out") -> torch.Tensor:
        paths = self.simulate_gbm(S0, r, sigma, T)
        if barrier == "up_and_out":
            knocked = paths.max(dim=1).values >= H
        elif barrier == "down_and_out":
            knocked = paths.min(dim=1).values <= H
        else:
            knocked = torch.zeros(self.n_paths, dtype=torch.bool, device=S0.device)
        ST = paths[:, -1]
        payoff = torch.clamp(ST - K, min=0.0) if option == "call" else torch.clamp(K - ST, min=0.0)
        payoff = payoff * (~knocked).float()
        return torch.exp(-r * T) * payoff.mean()


# ============================================================
# 3. LSTMPredictor — next-period price-direction prediction
#    Input  : (batch, seq_len, n_features)  e.g. 60 days × 5 features
#    Output : (batch, 1)  predicted next-period return
#    Typical hit rate on daily equity indices: ~52% (Fischer 2018)
# ============================================================

class LSTMPredictor(nn.Module):
    def __init__(self, input_dim: int = 5, hidden_dim: int = 64,
                 n_layers: int = 2, dropout: float = 0.2,
                 output_dim: int = 1):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=n_layers,
            batch_first=True,
            dropout=dropout if n_layers > 1 else 0.0,
        )
        self.head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim // 2, output_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out, _ = self.lstm(x)
        last = out[:, -1, :]
        return self.head(last)

    def predict_direction(self, x: torch.Tensor) -> torch.Tensor:
        """Return 0/1 (down/up) prediction."""
        with torch.no_grad():
            return (self.forward(x).squeeze(-1) > 0).long()


# ============================================================
# 4. FraudGNN — GraphSAGE-style GNN over a transaction graph
#    Each transaction is a node; edges link transactions sharing
#    account / IP / device / merchant. Message passing propagates
#    features across the graph to flag coordinated fraud rings.
#        h_v^(l+1) = σ( W·h_v^(l) + mean_{u∈N(v)} W·h_u^(l) )
# ============================================================

class FraudGNN(nn.Module):
    def __init__(self, node_feat_dim: int = 16, edge_feat_dim: int = 8,
                 hidden_dim: int = 64, n_layers: int = 2,
                 n_classes: int = 2, dropout: float = 0.2):
        super().__init__()
        self.n_layers = n_layers
        self.node_proj = nn.Linear(node_feat_dim, hidden_dim)
        self.edge_proj = nn.Linear(edge_feat_dim, hidden_dim)
        self.layers = nn.ModuleList(
            [nn.Linear(hidden_dim, hidden_dim) for _ in range(n_layers)]
        )
        self.dropout = nn.Dropout(dropout)
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Linear(hidden_dim // 2, n_classes),
        )

    def forward(self, node_feats: torch.Tensor, edge_index: torch.Tensor,
                edge_feats: torch.Tensor) -> torch.Tensor:
        h = self.node_proj(node_feats)
        e = self.edge_proj(edge_feats)
        src, tgt = edge_index[0], edge_index[1]
        n_nodes = node_feats.size(0)
        hidden = h.size(1)
        for layer in self.layers:
            messages = e * h[src]
            agg = torch.zeros(n_nodes, hidden, device=h.device)
            agg.index_add_(0, tgt, messages)
            counts = torch.zeros(n_nodes, 1, device=h.device)
            counts.index_add_(0, tgt, torch.ones(src.size(0), 1, device=h.device))
            agg = agg / counts.clamp(min=1.0)
            h = F.relu(layer(h + agg))
            h = self.dropout(h)
        return self.classifier(h)


# ============================================================
# Demo — exercise every module
# ============================================================

def _demo() -> None:
    torch.manual_seed(42)
    print("=" * 60)
    print("BlackScholesModel — closed-form + Greeks")
    print("=" * 60)
    bs = BlackScholesModel()
    S = torch.tensor(100.0); K = torch.tensor(105.0); T = torch.tensor(1.0)
    r = torch.tensor(0.05); sigma = torch.tensor(0.20)
    out = bs(S, K, T, r, sigma, "call")
    print(f"  Call  : {out['price'].item():.4f}")
    print(f"  Delta : {out['delta'].item():.4f}    Gamma: {out['gamma'].item():.6f}")
    print(f"  Vega  : {out['vega'].item():.4f}    Theta: {out['theta'].item():.6f}")
    print(f"  Rho   : {out['rho'].item():.4f}")

    print()
    print("=" * 60)
    print("MonteCarloPricer — European / Asian / Barrier")
    print("=" * 60)
    mc = MonteCarloPricer(n_paths=50_000, n_steps=100, antithetic=True)
    S0 = torch.tensor(100.0); K2 = torch.tensor(105.0); T2 = torch.tensor(1.0)
    r2 = torch.tensor(0.05); sig = torch.tensor(0.20)
    eur = mc.price_european(S0, K2, T2, r2, sig, "call")
    asia = mc.price_asian(S0, K2, T2, r2, sig, "call")
    bar = mc.price_barrier(S0, K2, T2, r2, sig, torch.tensor(130.0),
                           "call", "up_and_out")
    print(f"  European    : {eur.item():.4f}  (BS closed-form: {out['price'].item():.4f})")
    print(f"  Asian (avg) : {asia.item():.4f}")
    print(f"  Up&Out H=130: {bar.item():.4f}")

    print()
    print("=" * 60)
    print("LSTMPredictor — 60-day lookback, 5 features")
    print("=" * 60)
    lstm = LSTMPredictor(input_dim=5, hidden_dim=64, n_layers=2)
    n = sum(p.numel() for p in lstm.parameters())
    x = torch.randn(32, 60, 5)
    y = lstm(x)
    print(f"  Params : {n:,}")
    print(f"  Input  : {tuple(x.shape)}  ->  Output : {tuple(y.shape)}")

    print()
    print("=" * 60)
    print("FraudGNN — transaction-graph fraud detection")
    print("=" * 60)
    gnn = FraudGNN(node_feat_dim=16, edge_feat_dim=8, hidden_dim=64, n_classes=2)
    ng = sum(p.numel() for p in gnn.parameters())
    nodes = torch.randn(100, 16)
    edge_index = torch.randint(0, 100, (2, 500))
    edge_feats = torch.randn(500, 8)
    logits = gnn(nodes, edge_index, edge_feats)
    preds = logits.argmax(dim=-1)
    print(f"  Params : {ng:,}")
    print(f"  Nodes  : {nodes.shape[0]}   Edges : {edge_index.size(1)}")
    print(f"  Predicted fraudulent: {(preds == 1).sum().item()} / 100")
    print("=" * 60)


if __name__ == "__main__":
    _demo()`;

export function FintechPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Fintech · Black-Scholes · Monte Carlo · VaR · LSTM · GNN fraud"
        title="Quantitative Finance — Pricing, Risk, Trading & Fraud at HPC Scale"
        description="The mathematical foundations of modern fintech: Black-Scholes-Merton (Black 1973, Nobel 1997) closed-form option pricing C = S·N(d₁) - K·e^(-rT)·N(d₂) with d₁, d₂ derivation; Itô's lemma df = (∂f/∂t + μ·∂f/∂x + ½σ²·∂²f/∂x²)·dt + σ·∂f/∂x·dW as the chain rule of stochastic calculus; Geometric Brownian Motion dS = μ·S·dt + σ·S·dW; Monte Carlo simulation via GBM (Boyle 1977) reaching 100M paths/sec on GPU; VaR quantile P(L&gt;VaR) = 1-α and CVaR = E[L|L&gt;VaR]; Markowitz mean-variance portfolio optimization (Nobel 1990); LSTM trading (Fischer 2018, ~52% directional accuracy); GNN-based transaction fraud detection (Weber 2019); deep hedging (Buehler 2019). With 4 AI-generated illustrations, a looping 5-phase pipeline animation, Pyodide executable demos, low-level PyTorch code (BlackScholesModel + MonteCarloPricer + LSTMPredictor + FraudGNN), and an HPC pipeline ASCII diagram."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Cpu className="h-3 w-3" /> BS + MC + GNN</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Pyodide</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard
            key={k.label}
            label={k.label}
            value={k.value}
            hint={k.hint}
            deltaTone={k.deltaTone}
          />
        ))}
      </div>

      {/* AI gallery */}

      <SectionCard
        title="Fintech concept gallery — 3D animated, click to expand (lazy popup)"
        description="Replaces the previous AI-generated static image gallery. Each card opens a lazy modal with an animated 3D SVG of the concept (Black-Scholes call surface, Monte Carlo paths, volatility surface, yield curve), an n-D dimension toggle (3D single stock → 4D portfolio → 5D derivatives portfolio → N-D full risk grid), and a floating math/code background with quant-finance equations and Python snippets drifting subtly."
        icon={<Atom className="h-5 w-5" />}
        badge="3D gallery"
      >
        <FintechGallery3D />
      </SectionCard>

      <SectionCard
        title="Fintech concept shorts — 4 lazy popups with Pyodide code + 2024-2025 papers"
        description="Four 9:16 vertical cards: Black-Scholes (50th anniversary 2023, deep hedging), Monte Carlo VaR/CVaR (Basel IV 2025+), GNN fraud detection (GraphSAGE, Visa/JPMorgan production 2024), HFT order book (SEC Reg NMS 2024, PFOF debate). Each card opens a lazy popup with animated SVG + math equations + Pyodide-runnable Python code + recent paper citation."
        icon={<Sparkles className="h-5 w-5" />}
        badge="4 shorts"
      >
        <FintechShortsCarousel />
      </SectionCard>


      {/* Looping "short" */}
      <SectionCard
        title="Quant pipeline short — 5 phases (loop)"
        description="Continuous-loop animation showing the core fintech pipeline. Phase 1: GBM price chart S(t) = S₀·exp((μ-½σ²)t + σ·W(t)). Phase 2: European call payoff max(S - K, 0) at expiry. Phase 3: Monte Carlo paths fan for pricing. Phase 4: P&L histogram with 5% VaR tail. Phase 5: transaction-graph GNN flags a fraud ring."
        icon={<Activity className="h-5 w-5" />}
        badge="short"
      >
        <FintechShort />
      </SectionCard>

      <SectionCard
        title="Fintech interactives — 8 fully interactive visuals (quant, derivatives, commodities, real-time data)"
        description="Eight interactive visuals in lazy popups spanning the full quant stack: Black-Scholes option pricing (with 5 live Greeks), Monte Carlo VaR/CVaR (10k paths, Basel III→IV transition), real-time market data toggle (Yahoo Finance API + synthetic GBM fallback — switchable per user request), Markowitz efficient frontier, volatility surface (SVI parametric), Treasury yield curve (recession signal), GNN fraud detection (transaction network), HFT order book microstructure (maker-taker, PFOF debate). Each card opens a lazy popup with: animated SVG visual, math equation, sliders/buttons, 3-part InfoCallout."
        icon={<Sparkles className="h-5 w-5" />}
        badge="8 interactives"
      >
        <FintechInteractives />
      </SectionCard>

      {/* Black-Scholes math */}
      <SectionCard
        title="Black-Scholes math — the closed-form that started quantitative finance"
        description="Black, Scholes & Merton (1973, Nobel 1997) derived the closed-form European option pricing formula by applying Itô's lemma to a portfolio that longs the option and shorts Δ shares of the underlying — the resulting portfolio is locally riskless, so it must earn the risk-free rate r. That no-arbitrage condition yields the Black-Scholes PDE ∂C/∂t + ½σ²S²·∂²C/∂S² + r·S·∂C/∂S - r·C = 0, whose solution is the formula below."
        icon={<Brain className="h-5 w-5" />}
        badge="mathematics"
      >
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">
              C = S·N(d<sub>1</sub>) - K·e^(-rT)·N(d<sub>2</sub>) &nbsp;·&nbsp;
              d<sub>1</sub> = (ln(S/K) + (r + ½σ²)·T) / (σ·√T) &nbsp;·&nbsp;
              d<sub>2</sub> = d<sub>1</sub> - σ·√T
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              N(·) is the standard normal CDF. Put-call parity: C - P = S - K·e^(-rT). Greeks are derivatives: Delta=∂C/∂S, Gamma=∂²C/∂S², Vega=∂C/∂σ, Theta=∂C/∂t, Rho=∂C/∂r.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
              <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">Black-Scholes PDE</p>
              <p className="font-mono text-[11px]">∂C/∂t + ½σ²S²·∂²C/∂S² + r·S·∂C/∂S - r·C = 0</p>
              <p className="text-muted-foreground text-[11px] mt-1">No-arbitrage PDE — geometric Brownian motion assumed. Solvable in closed form for European payoff; numerical (finite-difference, MC) for exotics.</p>
            </div>
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5">
              <p className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-1">Itô's lemma (chain rule)</p>
              <p className="font-mono text-[11px]">df = (∂f/∂t + μ·∂f/∂x + ½σ²·∂²f/∂x²)·dt + σ·∂f/∂x·dW</p>
              <p className="text-muted-foreground text-[11px] mt-1">Stochastic chain rule — the extra ½σ²·∂²f/∂x² term comes from dW² = dt (quadratic variation).</p>
            </div>
            <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-2.5">
              <p className="font-semibold text-sm text-violet-600 dark:text-violet-400 mb-1">Geometric Brownian Motion</p>
              <p className="font-mono text-[11px]">dS = μ·S·dt + σ·S·dW</p>
              <p className="text-muted-foreground text-[11px] mt-1">Asset-price model assumed by Black-Scholes. Solution S(t) = S₀·exp((μ-½σ²)t + σ·W(t)) — log-normal returns.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Risk math — VaR / CVaR */}
      <SectionCard
        title="Risk math — VaR quantile & CVaR expected shortfall"
        description="Value at Risk (VaR) at confidence α answers: 'What is the loss we will not exceed with probability α?' It is a quantile of the loss distribution. Conditional VaR (CVaR, also Expected Shortfall) averages losses in the tail beyond VaR — a coherent risk measure (subadditive) where VaR is not."
        icon={<Brain className="h-5 w-5" />}
        badge="mathematics"
      >
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">
              P(L &gt; VaR<sub>α</sub>) = 1 - α &nbsp;·&nbsp;
              CVaR<sub>α</sub> = E[L | L &gt; VaR<sub>α</sub>]
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              VaR is the α-quantile of the loss distribution (e.g. α=0.95 → 5% tail). CVaR is the mean loss conditional on being in that tail — always ≥ VaR. Under Basel III, CVaR (stressed) is the regulatory capital metric.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-border/60 p-2.5">
              <p className="font-semibold mb-1">Historical VaR</p>
              <p className="font-mono text-[11px]">VaR = -sorted_returns[⌈(1-α)N⌉]</p>
              <p className="text-muted-foreground text-[11px] mt-1">Non-parametric: use the empirical quantile of past losses. Simple but assumes the future resembles the past.</p>
            </div>
            <div className="rounded-md border border-border/60 p-2.5">
              <p className="font-semibold mb-1">Parametric VaR</p>
              <p className="font-mono text-[11px]">VaR = -(μ - z<sub>α</sub>·σ)</p>
              <p className="text-muted-foreground text-[11px] mt-1">Assume normal returns. z<sub>0.95</sub> = 1.645. Underestimates tail risk — real returns are fat-tailed.</p>
            </div>
            <div className="rounded-md border border-border/60 p-2.5">
              <p className="font-semibold mb-1">Monte Carlo VaR</p>
              <p className="font-mono text-[11px]">simulate 10⁵-10⁸ scenarios → quantile</p>
              <p className="text-muted-foreground text-[11px] mt-1">Most flexible — works for any portfolio payoff, any distribution. GPU implementations reach 100M paths/sec.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: Black-Scholes + Monte Carlo + VaR/CVaR + Markowitz (Pyodide)"
        description="Pure-Python implementations running in your browser via Pyodide (Wasm): Black-Scholes call/put with Greeks; antithetic-variate Monte Carlo (10000 GBM paths) for European call pricing with standard-error estimate; historical VaR(95%) and CVaR(95%) on 252 daily returns; Markowitz mean-variance minimum-variance portfolio (closed-form via Gauss-Jordan matrix inversion)."
        icon={<Terminal className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={PYODIDE_CODE} buttonLabel="Run quant finance (Pyodide)" />
      </SectionCard>

      {/* Low-level PyTorch */}
      <SectionCard
        title="Low-level PyTorch — BlackScholesModel, MonteCarloPricer, LSTMPredictor, FraudGNN"
        description="Production-style quant code. BlackScholesModel is fully differentiable — can be plugged into a deep-hedging loss (Buehler 2019). MonteCarloPricer simulates GBM with antithetic variates and prices European, Asian (arithmetic average), and barrier (knock-out) options. LSTMPredictor is a 2-layer LSTM with 60-day lookback for next-period return prediction (~52% directional accuracy, Fischer 2018). FraudGNN is a GraphSAGE-style 2-layer message-passing GNN over a transaction graph (Weber 2019 'Scale')."
        icon={<Cpu className="h-5 w-5" />}
        badge="low-level"
      >
        <CodeBlock
          language="python"
          filename="fintech_quant.py"
          highlight={[
            14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
            31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
            48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64,
            65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81,
            82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98,
            99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112,
            113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126,
            127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140,
            141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154,
            155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168,
            169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182,
            183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196,
            197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210,
            211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224,
            225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238,
            239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252,
            253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266,
            267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280,
          ]}
          code={PYTORCH_CODE}
        />
      </SectionCard>

      {/* Multi-language quant scenarios — 8 cards with lazy popups,
          placed right after the PyTorch code section */}
      <SectionCard
        title="Quant scenarios in 4 languages — Delta Hedging, MC Asian, LSTM, GNN, SVI, Markowitz, Deep Hedging, CVA/XVA"
        description="Eight production-style quant scenarios presented as cards that open lazy popups (mirroring the LHC ingestion pattern on the ELT+ETL page). Each popup contains the scenario brief (Derivative, Problem, Quant Solution), a visualisation matrix (rebalancing table / vol smile / efficient frontier / fraud-ring graph / P&L distribution / exposure profile), multi-language code in Python + Rust + Scala + Elixir, an in-browser Pyodide runner for the Python version, and math-foundation + implementation-insight callouts. Scenarios: (1) Dynamic Delta Hedging — short 1 European call, rebalance Δ daily over 10 days (Black 1973). (2) Monte Carlo Asian Option — arithmetic-average path-dependent payoff via 10⁴ antithetic GBM paths (Boyle 1977, Kemna-Vorst 1990). (3) LSTM Price-Direction Predictor — 60-day OHLCV lookback, 2-layer LSTM(64), ~52% hit rate (Fischer 2018). (4) GNN Fraud Ring Detection — 2-layer GraphSAGE on transaction graph (Weber 2019 'Scale'). (5) SVI Volatility Surface — 5-parameter vol smile calibration (Gatheral 2004). (6) Markowitz Efficient Frontier — closed-form QP, tangency max-Sharpe (Markowitz 1952, Nobel 1990). (7) Deep Hedging — NN learns hedge action via CVaR minimisation (Buehler 2019). (8) CVA/XVA — counterparty credit risk under Basel III FRTB."
        icon={<Sparkles className="h-5 w-5" />}
        badge="8 scenarios × 4 languages"
      >
        <QuantTradeCards />
      </SectionCard>

      {/* Low-level systems-language implementations of the same 4 models */}
      <SectionCard
        title="Low-level systems languages — Rust, Scala, Elixir, C implementations of the same 4 models"
        description="Production-style low-level implementations of BlackScholesModel, MonteCarloPricer, LSTMPredictor, and FraudGNN in four systems languages: Rust (tch-rs + rayon + statrs for production quant libraries), Scala (Spark + DL4J for distributed training across a cluster), Elixir (Nx + GenStage for streaming inference with backpressure on BEAM), and C (AVX2 SIMD + OpenMP for sub-microsecond HFT kernels). The same 4 models as the PyTorch block above, but in lower-level languages used in different deployment contexts — PyTorch for research/training, Rust for production CPU/GPU inference, Scala for distributed batch jobs, Elixir for streaming real-time inference, C for ultra-low-latency option desks."
        icon={<Cpu className="h-5 w-5" />}
        badge="low-level × 4 langs"
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              <strong className="text-foreground/80">Rust</strong> — production quant library. Uses tch-rs (PyTorch bindings) for the LSTM/GNN, rayon for parallel Monte Carlo, statrs for the normal CDF. Compiles to native code; ~50 ns/option on a single core.
            </p>
            <CodeBlock
              language="rust"
              filename="fintech_quant_lowlevel.rs"
              code={LOWLEVEL_RUST}
            />
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">
              <strong className="text-foreground/80">Scala</strong> — distributed quant via Spark + DL4J. Black-Scholes is a Spark UDF applied across the option book; Monte Carlo is an RDD of paths distributed across the cluster; LSTM training uses DL4J's SparkComputationGraph; the GNN uses GraphX message passing across a billion-edge transaction graph.
            </p>
            <CodeBlock
              language="scala"
              filename="FintechQuantLowLevel.scala"
              code={LOWLEVEL_SCALA}
            />
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">
              <strong className="text-foreground/80">Elixir</strong> — streaming inference on the BEAM VM. Each model is a GenServer subscribing to a PubSub topic (e.g. <code className="font-mono">ticks:AAPL</code>); a new tick triggers a forward pass and broadcasts a signal. GenStage handles backpressure automatically — the pipeline never overflows. Uses Nx for tensor ops (BEAM JIT-compiled).
            </p>
            <CodeBlock
              language="elixir"
              filename="fintech_quant_lowlevel.ex"
              code={LOWLEVEL_ELIXIR}
            />
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">
              <strong className="text-foreground/80">C</strong> — ultra-low-latency kernels for HFT. AVX2 SIMD (4 doubles/cycle via <code className="font-mono">__m256d</code> intrinsics) for batch Black-Scholes; OpenMP parallel Monte Carlo; minimal hand-rolled single-layer LSTM forward pass; pointer-based graph with 2-layer message passing. Used in HFT option desks (Citadel Securities, Virtu, Jump Trading) where ~50 ns/option is required.
            </p>
            <CodeBlock
              language="c"
              filename="fintech_quant_lowlevel.c"
              code={LOWLEVEL_C}
            />
          </div>
        </div>
      </SectionCard>

      {/* Modern papers */}
      <SectionCard
        title="Modern papers — Black-Scholes, Monte Carlo, LSTM trading, GNN fraud, Deep hedging"
        description="Five papers that define modern quantitative finance: (1) Black-Scholes (Black 1973, Nobel 1997) — closed-form option pricing. (2) Monte Carlo in finance (Boyle 1977) — numerical option pricing via simulation. (3) LSTM for trading (Fischer 2018) — recurrent networks on price sequences. (4) GNN fraud detection (Weber 2019, 'Scale') — graph neural networks over transaction networks. (5) Deep hedging (Buehler 2019) — neural networks learn hedging strategies that beat Black-Scholes under transaction costs."
        icon={<Network className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Black-Scholes (Black &amp; Scholes 1973, JPE 81):</strong> "The Pricing of Options and Corporate Liabilities." Derived the closed-form formula for European options by constructing a continuously-rebalanced riskless portfolio (long option, short Δ shares) and applying Itô's lemma. The resulting Black-Scholes PDE ∂C/∂t + ½σ²S²·∂²C/∂S² + r·S·∂C/∂S - r·C = 0 has the closed-form solution C = S·N(d₁) - K·e^(-rT)·N(d₂). Awarded the 1997 Nobel Memorial Prize in Economics (Scholes &amp; Merton; Black died 1995). The single most influential paper in quantitative finance — every options market-maker still prices off this formula or its generalisations (Black 1976 for futures, Garman-Kohlhagen 1983 for FX, Black-Derman-Toy 1990 for rates).
          </p>
          <p>
            <strong className="text-foreground/80">Monte Carlo in finance (Boyle 1977, JFE 4):</strong> "Options: A Monte Carlo Approach." First systematic application of Monte Carlo simulation to option pricing — simulate the underlying asset's stochastic process (GBM under risk-neutral measure), evaluate the payoff, discount and average. The method handles path-dependent and exotic payoffs (Asian, barrier, lookback) where no closed form exists. Variance reduction techniques (antithetic variates, control variates, importance sampling) cut compute 10-100×. Modern GPU implementations (CuPy, JAX, PyTorch) reach 100M paths/sec, enabling real-time risk for exotic books.
          </p>
          <p>
            <strong className="text-foreground/80">LSTM for trading (Fischer &amp; Krauss 2018, SSRN 3090978):</strong> "Deep learning with long short-term memory networks for financial market predictions." Applied LSTM (Hochreiter &amp; Schmidhuber 1997) to daily returns of all S&amp;P 500 constituents 1992-2015. Achieves ~52-54% directional accuracy (vs 50% random) — small but economically significant given leverage. Strategy: long the top decile of LSTM predictions, short the bottom decile. Outperforms random forest and logistic regression baselines. Key finding: signal decays fast — strategies must turn over daily. Later work (Zhang 2023) showed transformers (PatchTST, TimeLLM) edge out LSTMs on long-horizon forecasting.
          </p>
          <p>
            <strong className="text-foreground/80">GNN fraud detection (Weber et al. 2019, KDD 'Scale' workshop):</strong> "Anti-Money Laundering in Bitcoin: Graph Machines Learn the Topology of Fraud Rings." Modeled Bitcoin transactions as a graph (addresses = nodes, transactions = edges) and trained a GraphSAGE-style GNN to flag illicit addresses. Multi-hop message passing captures the structure of fraud rings (laundering cycles, peel chains) invisible to per-transaction rule systems. Outperforms random-forest-on-node-features by 30-50% AUC. The same architecture (FraudGNN) now powers production systems at every major payment network — Visa, Mastercard, Stripe, PayPal — flagging 5-10× more fraud than rule-based systems at the same false-positive rate.
          </p>
          <p>
            <strong className="text-foreground/80">Deep hedging (Buehler et al. 2019, arXiv:1802.03042):</strong> "Deep Hedging." Replaces the Black-Scholes continuous-rebalancing recipe with a neural network that learns the optimal hedging strategy by minimising a risk measure (CVaR, entropic risk) over simulated paths. Crucially accounts for transaction costs, market impact, and P&amp;L variance — all ignored by the closed-form Greeks. The network input is the current portfolio state; the output is the next-period hedge trade. Trained on 10⁷-10⁹ simulated GBM paths, the deep hedging network outperforms Black-Scholes Delta hedging by 20-40% in after-cost P&amp;L variance. Production deployed at JP Morgan, HSBC, and Allianz. This is the strongest case for ML in derivatives: not prediction of prices, but optimisation of actions.
          </p>
        </div>
      </SectionCard>

      {/* HPC pipeline ASCII */}
      <SectionCard
        title="HPC pipeline — market data → ingestion → pricing/risk → ML → execution → settlement"
        description="End-to-end fintech HPC pipeline. Microsecond-latency market-data ingestion (multicast UDP + Aeron); vectorised pricing & risk on GPU clusters (Black-Scholes surface + Monte Carlo risk engine); ML models for signal generation (LSTM trading) and fraud detection (GNN); order execution via FIX protocol with smart order routing (SOR); T+1 / T+0 settlement via DLT. Daily VaR / CVaR recompute on the full portfolio; intraday stress tests under regulatory scenarios (Basel III FRTB)."
        icon={<Activity className="h-5 w-5" />}
      >
        <CodeBlock
          language="text"
          filename="fintech_hpc_pipeline.txt"
          code={`┌──────────────────────────────────────────────────────────────────────┐
│  FINTECH HPC PIPELINE (real-time + end-of-day)                       │
│                                                                      │
│  Market data feeds (NYSE, NASDAQ, CME, Eurex, LSE, FX)              │
│    - Multicast UDP + Aeron / Solace PubSub+                          │
│    - Normalized to Apache Arrow in-flight (zero-copy)                │
│    - Throughput: 10M messages/sec, sub-50μs latency                  │
│         ↓                                                             │
│  ┌──────────────────────────────────────────────────────┐            │
│  │ INGESTION (kafka + kdb+/tick)                        │            │
│  │   - Tick normalisation, NBBO construction             │            │
│  │   - 50 TB/day raw, 5 TB/day normalised                │            │
│  │   - Hot tier in-memory (kdb+), warm in Parquet/Iceberg│            │
│  └──────────────────────────────────────────────────────┘            │
│         ↓                                                             │
│  ┌──────────────────────────────────────────────────────┐            │
│  │ PRICING & RISK ENGINE (GPU cluster, 100+ A100)       │            │
│  │   - Black-Scholes closed-form (vectorised, 10M/sec)  │            │
│  │   - Monte Carlo (100M paths/sec, GBM + jump-diffusion)│           │
│  │   - VaR / CVaR (historical, parametric, MC)          │            │
│  │   - Full-revaluation stress tests (Basel III FRTB)   │            │
│  │   - XVA desk: CVA, DVA, FVA, MVA — funding-cost adj. │            │
│  └──────────────────────────────────────────────────────┘            │
│         ↓                                                             │
│  ┌──────────────────────────────────────────────────────┐            │
│  │ ML MODELS (PyTorch, Triton inference server)         │            │
│  │   - LSTMPredictor: 60-day price-direction signal     │            │
│  │     (52% hit rate, 5 features, daily retrain)         │            │
│  │   - FraudGNN: transaction-graph fraud detection      │            │
│  │     (Weber 2019 GraphSAGE, 2-layer, message passing) │            │
│  │   - Deep hedging network (Buehler 2019)              │            │
│  │   - Transformer nowcast: PatchTST for macro forecasts│            │
│  └──────────────────────────────────────────────────────┘            │
│         ↓                                                             │
│  ┌──────────────────────────────────────────────────────┐            │
│  │ EXECUTION (FIX 4.4 / SBE, smart order router)        │            │
│  │   - Venue selection (lit, dark, mid-point, RFQ)      │            │
│  │   - TWAP / VWAP / implementation shortfall (IS) algos │            │
│  │   - Market-making: inventory + adverse selection skew │           │
│  │   - Microsecond latency budget enforced per venue     │            │
│  └──────────────────────────────────────────────────────┘            │
│         ↓                                                             │
│  ┌──────────────────────────────────────────────────────┐            │
│  │ CLEARING & SETTLEMENT (T+1 / T+0 via DLT)            │            │
│  │   - Trade affirmation, position keep, reconciliation │            │
│  │   - DLT settlement (DTCC Tokenized Settlement, EIB)   │            │
│  │   - Regulatory reporting: EMIR/MiFIR, CFTC swap data  │            │
│  │   - Audit trail → OpenTelemetry traces (ADR-054)     │            │
│  └──────────────────────────────────────────────────────┘            │
│                                                                      │
│  Observability: every stage emits OpenTelemetry spans →             │
│  the trade audit trail IS a distributed trace (see MLOps & Tracing). │
└──────────────────────────────────────────────────────────────────────┘`}
        />
      </SectionCard>

      {/* Deeper-thought insight */}
      <SectionCard
        title="My deeper thought: finance IS stochastic control"
        description="The unifying view: Black-Scholes is the heat equation in disguise; Itô's lemma is the chain rule for stochastic calculus; VaR is the quantile function; portfolio optimization is the same convex optimisation as ML training; the market is a stochastic process that ML tries to predict — and trading IS stochastic control with a P&L reward."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Black-Scholes IS the heat equation (after substitution).</strong> Apply the change-of-variables x = ln(S/K), τ = ½σ²·(T-t), u(x, τ) = e^(rT)·C/S — the Black-Scholes PDE collapses to the canonical heat equation ∂u/∂τ = ∂²u/∂x². This is why the closed-form solution involves the Gaussian N(·): the Green's function of the heat equation is a normal PDF. Black-Scholes pricing IS diffusion of an initial payoff through Gaussian heat-kernel smoothing — the same equation that describes temperature spreading through a rod describes how option value relaxes toward payoff at expiry. Once you see this, the formula is obvious rather than magical.
          </p>
          <p>
            <strong className="text-foreground/80">Itô's lemma IS the chain rule for stochastic calculus.</strong> For a deterministic function f(t, x), Taylor gives df = (∂f/∂t)·dt + (∂f/∂x)·dx + ½·(∂²f/∂x²)·dx² + … — and dx² is O(dt²), so it vanishes. But for stochastic x = W(t), the quadratic variation dW² = dt is the same order as dt — the second-order term survives. Itô's lemma is just Taylor expansion that keeps the dx² term because Brownian motion has non-trivial quadratic variation. Everything in stochastic calculus follows from this single fact: dW² = dt.
          </p>
          <p>
            <strong className="text-foreground/80">VaR IS the quantile function; CVaR IS the conditional expectation.</strong> P(L &gt; VaR) = 1-α means VaR is the (1-α)-quantile of the loss distribution — VaR = F⁻¹(1-α). CVaR = E[L | L &gt; VaR] is the conditional expectation over the tail. There is nothing exotic here: VaR and CVaR are the same quantile and conditional-mean functions you learned in introductory statistics, applied to a portfolio loss distribution. The "finance" is in specifying that distribution (via historical samples, Gaussian assumption, or Monte Carlo simulation); the risk metrics themselves are pure descriptive statistics.
          </p>
          <p>
            <strong className="text-foreground/80">Portfolio optimization IS ML training (convex optimisation).</strong> Markowitz minimum-variance is "minimise w^T·Σ·w subject to 1^T·w = 1" — a quadratic program. Linear-regression training is "minimise ||Xw - y||² subject to ||w||₂² ≤ τ" — also a quadratic program. The same solvers (gradient descent, conjugate gradient, interior-point) solve both. The covariance matrix Σ in Markowitz is the same Gram matrix X^T·X/Σ in regression. The "Sharpe ratio" is just the signal-to-noise ratio (mean / std) of portfolio returns. The whole of mean-variance finance IS regularised least-squares ML — understood fifty years before "machine learning" was named.
          </p>
          <p>
            <strong className="text-foreground/80">The market IS a stochastic process that ML tries to predict — and trading IS stochastic control.</strong> The market is a stochastic process (a probability measure on price paths). ML models (LSTM, transformers, GNNs) try to learn features of that measure to predict next-period returns. But prediction is not alpha — alpha requires taking actions (positions) that exploit the prediction under risk and transaction costs. Trading is therefore a stochastic optimal control problem: choose position π_t to maximise E[Σ γ^t · r(π_t, S_t)] subject to constraints. The Bellman equation from RL-agentic IS the HJB equation of stochastic control. Deep hedging (Buehler 2019) IS the policy-network solution to that control problem. Finance IS stochastic control, just with a Sharpe-ratio reward and a Brownian-motion environment. The same RL agents that play Atari play the market — the only difference is the reward function and the noise model.
          </p>
        </div>
      </SectionCard>

      <RelatedTopics topics={[
        { id: "databricks" as const, reason: "Spark for Monte Carlo pricing" },
        { id: "streaming" as const, reason: "Kafka for market data feeds" },
        { id: "neural-networks" as const, reason: "LSTM for price prediction" },
        { id: "quantum-computing" as const, reason: "QEC for Shor on RSA" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("rag-deep-dive")} className="text-sm text-primary hover:underline">
          → RAG Deep Dive (BM25 = portfolio matching)
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("systems-biology")} className="text-sm text-primary hover:underline">
          → Systems Biology (PPI graph = transaction graph)
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("mlops-tracing")} className="text-sm text-primary hover:underline">
          → MLOps &amp; Tracing (trade audit trail = OpenTelemetry)
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">
          → Knowledge Hub (ADR-054: Black-Scholes + MC + GNN for fintech)
        </Link>
      </div>
    </div>
  );
}
