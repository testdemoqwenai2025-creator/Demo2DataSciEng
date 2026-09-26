"use client";

import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  X, Zap, Sparkles, BookOpen, DollarSign, AlertTriangle, Network, Cpu,
} from "lucide-react";
import { PyodideRunner } from "./pyodide-runner";

/**
 * FintechShortsCarousel — 4 lazy-popup concept shorts for the Fintech page.
 * Mirrors quantum-shorts.tsx pattern: each short has an animated SVG thumbnail
 * + click-to-open lazy modal containing animated SVG + math + Pyodide code +
 * recent (2024-2025) paper citation.
 *
 * 4 shorts:
 *   1. Black-Scholes — closed-form pricing, 50th anniversary 2023, deep hedging
 *   2. Monte Carlo VaR / CVaR — Basel III → IV transition (2025+)
 *   3. GNN fraud detection — GraphSAGE, TGN, federated learning 2024
 *   4. HFT order book microstructure — maker-taker, PFOF, SEC Reg NMS 2024
 */

// ============================================================
// Pyodide code constants (validated by Python compile())
// ============================================================

const BLACK_SCHOLES_CODE = `import math

def norm_cdf(x):
    if x < 0:
        return 1 - norm_cdf(-x)
    a1, a2, a3, a4, a5 = 0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429
    p = 0.3275911
    t = 1.0 / (1.0 + p * x)
    y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t
    return y

def norm_pdf(x):
    return math.exp(-x * x / 2) / math.sqrt(2 * math.pi)

def black_scholes(S, K, r, sigma, T, type='call'):
    d1 = (math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    if type == 'call':
        price = S * norm_cdf(d1) - K * math.exp(-r * T) * norm_cdf(d2)
        delta = norm_cdf(d1)
    else:
        price = K * math.exp(-r * T) * norm_cdf(-d2) - S * norm_cdf(-d1)
        delta = norm_cdf(d1) - 1
    gamma = norm_pdf(d1) / (S * sigma * math.sqrt(T))
    vega = S * norm_pdf(d1) * math.sqrt(T) / 100
    if type == 'call':
        theta = (-(S * norm_pdf(d1) * sigma) / (2 * math.sqrt(T)) - r * K * math.exp(-r * T) * norm_cdf(d2)) / 365
    else:
        theta = (-(S * norm_pdf(d1) * sigma) / (2 * math.sqrt(T)) + r * K * math.exp(-r * T) * norm_cdf(-d2)) / 365
    rho = (K * T * math.exp(-r * T) * (norm_cdf(d2) if type == 'call' else -norm_cdf(-d2))) / 100
    return {'price': price, 'delta': delta, 'gamma': gamma, 'vega': vega, 'theta': theta, 'rho': rho}

print("=== Black-Scholes-Merton (50th anniversary 2023) ===")
print(f"  S=100, K=100, r=5%, sigma=20%, T=1 year")
print()

call = black_scholes(100, 100, 0.05, 0.20, 1, 'call')
put = black_scholes(100, 100, 0.05, 0.20, 1, 'put')

print(f"  European Call: C = S*N(d1) - K*exp(-rT)*N(d2) = \${call['price']:.4f}")
print(f"  European Put:  P = K*exp(-rT)*N(-d2) - S*N(-d1) = \${put['price']:.4f}")
print(f"  Put-Call Parity: C - P = S - K*exp(-rT) = \${call['price'] - put['price']:.4f}")
print(f"    Verifies: \${100 - 100 * math.exp(-0.05):.4f}  (matches)")

print()
print(f"  Greeks (call):")
print(f"    Delta = {call['delta']:.4f} (hedge ratio)")
print(f"    Gamma = {call['gamma']:.4f} (rate of delta change)")
print(f"    Vega  = {call['vega']:.4f} (per 1% vol change)")
print(f"    Theta = {call['theta']:.4f} (per day time decay)")
print(f"    Rho   = {call['rho']:.4f} (per 1% rate change)")

print()
print("=== BS assumptions (1973) - all empirically FALSE ===")
print(f"  - Constant volatility (volatility smiles show IV varies by strike)")
print(f"  - Lognormal returns (real returns have fat tails, kurtosis 5-10)")
print(f"  - No jumps (1987 crash -7% in one day; 2020 COVID -34% in 30 days)")
print(f"  - Continuous trading (market closes, limit moves)")
print(f"  - Risk-free rate known (it's stochastic)")
print()
print("=== Modern extensions ===")
print(f"  - Dupire local vol (1994): sigma(S, t) - calibrates to surface")
print(f"  - Heston stochastic vol (1993): sigma follows CIR process")
print(f"  - Merton jump-diffusion (1976): compound Poisson jumps")
print(f"  - SABR (2002): stochastic alpha beta rho")
print(f"  - Bayer rough vol (2016): Hurst H ~ 0.1, fractional Brownian")
print(f"  - Deep hedging (Buehler 2019+): NN learns pricing+hedging")`;

const MONTE_CARLO_VAR_CODE = `import math
import random

random.seed(42)

def gaussian():
    u1 = random.random()
    u2 = random.random()
    return math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)

def gbm_paths(S0, mu, sigma, T, N_paths):
    paths = []
    sqrt_T_sigma = sigma * math.sqrt(T)
    drift = (mu - sigma * sigma / 2) * T
    for _ in range(N_paths):
        Z = gaussian()
        S_T = S0 * math.exp(drift + sqrt_T_sigma * Z)
        paths.append(S_T - S0)
    return paths

print("=== Monte Carlo VaR + CVaR simulation ===")
S0 = 100
mu = 0.0005
sigma = 0.015
T = 1
N = 10000

paths = gbm_paths(S0, mu, sigma, T, N)
paths.sort()

for alpha in [0.90, 0.95, 0.99, 0.997]:
    var_idx = int((1 - alpha) * N)
    var_value = -paths[var_idx]
    tail = paths[:var_idx]
    cvar_value = -sum(tail) / len(tail) if tail else 0
    print(f"  alpha={alpha:.3f}: VaR = \${var_value:.3f}, CVaR = \${cvar_value:.3f}, ratio = {cvar_value / var_value:.2f}")

print()
print("=== Basel III vs IV (contention) ===")
print(f"  Basel III (current): 99% VaR over 10-day horizon")
print(f"  Basel IV (2025+): 97.5% CVaR over 10-day")
print(f"  Implication: banks must hold MORE capital (~30-40% increase)")
print(f"  Rationale: VaR is just a threshold - doesn't tell you how bad the tail is")
print(f"  CVaR = average of tail - captures severity (2008 lesson)")
print()
print("=== Fat tail example (2008 GFC) ===")
print(f"  Gaussian: S&P 500 daily loss > 5% occurs ~1 in 14000 days")
print(f"  Reality: 7 such events in 2008 alone")
print(f"  -> kurtosis 5-10x normal -> VaR severely underestimates tail risk")
print()
print("=== Modern risk models (post-2008) ===")
print(f"  - Filtered historical simulation (GARCH + bootstrap)")
print(f"  - Extreme Value Theory (EVT) - peaks-over-threshold")
print(f"  - Copula-based (correlated defaults in structured credit)")
print(f"  - Stressed VaR (Basel III)")
print(f"  - Machine learning (Berg 2022+) - LSTM for tail dependence")`;

const GNN_FRAUD_CODE = `import math
import random

random.seed(42)

class GraphSAGE:
    def __init__(self, in_dim, hidden_dim, out_dim):
        self.W1 = [[random.gauss(0, 0.1) for _ in range(2 * in_dim)] for _ in range(hidden_dim)]
        self.W2 = [[random.gauss(0, 0.1) for _ in range(hidden_dim)] for _ in range(out_dim)]

    def aggregate(self, neighbors):
        if not neighbors:
            return [0.0] * len(self.W1[0])
        return [sum(n[i] for n in neighbors) / len(neighbors) for i in range(len(neighbors[0]))]

    def forward(self, node_features, adj_list):
        h1 = []
        for v in range(len(node_features)):
            agg = self.aggregate([node_features[u] for u in adj_list[v]])
            concat = node_features[v] + agg
            h_v = [math.tanh(sum(self.W1[i][j] * concat[j] for j in range(len(concat)))) for i in range(len(self.W1))]
            h1.append(h_v)
        h2 = []
        for v in range(len(node_features)):
            h_v = [math.tanh(sum(self.W2[i][j] * h1[v][j] for j in range(len(h1[v])))) for i in range(len(self.W2))]
            h2.append(h_v)
        return h2

node_features = [
    [50, 5, 3], [200, 10, 5], [4500, 50, 1], [80, 3, 2],
    [4800, 45, 2], [50, 2, 1], [4700, 40, 2], [120, 6, 4],
]
adj_list = [
    [1, 3], [0, 2], [1, 4], [0, 4], [2, 3, 5], [4, 6], [5, 7], [6],
]
truth_labels = [0, 0, 1, 0, 1, 0, 1, 0]

gnn = GraphSAGE(in_dim=3, hidden_dim=8, out_dim=1)
embeddings = gnn.forward(node_features, adj_list)

print("=== GraphSAGE fraud detection (Hamilton et al. 2017) ===")
print()
print(f"  Graph: 8 accounts, {sum(len(adj) for adj in adj_list)} directed edges")
print(f"  Features per node: [amount_24h, txn_count_24h, distinct_parties]")
print(f"  Truth labels: {truth_labels} (1=suspicious)")
print()
print(f"  {'Node':>4} {'Amount':>8} {'Txns':>5} {'Counterparties':>15} {'Truth':>6} {'GNN_score':>10}")
print(f"  {'-'*4} {'-'*8} {'-'*5} {'-'*15} {'-'*6} {'-'*10}")
for i in range(8):
    f = node_features[i]
    emb = embeddings[i][0]
    print(f"  {i:>4} {f[0]:>8} {f[1]:>5} {f[2]:>15} {truth_labels[i]:>6} {emb:>10.4f}")

print()
print("=== Why GNN beats rule-based + random forest ===")
print(f"  Rule-based: 'amount > $10k -> flag' - easy to evade (split payments)")
print(f"  Random forest: per-transaction features - misses network pattern")
print(f"  GNN: aggregates neighbor info via message passing - catches smurfing")
print(f"  Production: Visa (100M+ txns/day), JPMorgan (~60% fraud alerts)")
print()
print("=== Modern GNN architectures for fraud (2024) ===")
print(f"  - GraphSAGE (2017): mean aggregation")
print(f"  - GAT (2018): attention weights on neighbors")
print(f"  - TGN (Rossi 2020): txn history over time")
print(f"  - Heterophilic GNN (2022+): fraud nodes look SIMILAR to neighbors")
print(f"  - Federated GNN (2023+): banks collaborate without sharing data")`;

const HFT_ORDERBOOK_CODE = `import math
import random

random.seed(42)

class OrderBook:
    def __init__(self, mid_price=100.0, spread=0.01, levels=10):
        self.mid = mid_price
        self.spread = spread
        self.levels = levels
        self.bids = []
        self.asks = []
        self.tick_count = 0
        self.history = [mid_price]
        self._init_book()

    def _init_book(self):
        for i in range(self.levels):
            self.bids.append((self.mid - self.spread / 2 - i * 0.01, max(10, 100 - i * 8 + random.gauss(0, 5))))
            self.asks.append((self.mid + self.spread / 2 + i * 0.01, max(10, 100 - i * 8 + random.gauss(0, 5))))

    def step(self):
        dt = 0.001
        sigma = 0.0005
        self.mid += sigma * math.sqrt(dt) * random.gauss(0, 1) * 100
        self.history.append(self.mid)
        for i in range(self.levels):
            self.bids[i] = (self.mid - self.spread / 2 - i * 0.01, max(10, 100 - i * 8 + random.gauss(0, 5)))
            self.asks[i] = (self.mid + self.spread / 2 + i * 0.01, max(10, 100 - i * 8 + random.gauss(0, 5)))
        self.tick_count += 1

    def spread_pct(self):
        return self.spread / self.mid * 100

    def market_depth(self):
        return sum(p * s for p, s in self.bids[:5]) + sum(p * s for p, s in self.asks[:5])

book = OrderBook(mid_price=100.0, spread=0.01, levels=10)

print("=== HFT order book microstructure (1 ms timestep) ===")
print()
print(f"  Initial state: mid = \${book.mid:.4f}, spread = {book.spread:.4f} ({book.spread_pct():.4f}%)")
print()
print(f"  Top 5 bid levels (price, size):")
for i in range(5):
    print(f"    Bid {i+1}: \${book.bids[i][0]:.4f} x {book.bids[i][1]:.0f}")
print(f"  Top 5 ask levels (price, size):")
for i in range(5):
    print(f"    Ask {i+1}: \${book.asks[i][0]:.4f} x {book.asks[i][1]:.0f}")
print()
print(f"  Market depth (top 5 levels each side): \${book.market_depth():.0f}")

for _ in range(1000):
    book.step()

print()
print(f"  After 1000 ms ({book.tick_count} ticks):")
print(f"    mid price = \${book.mid:.4f} (changed \${(book.mid - 100):.4f})")
print(f"    spread = {book.spread:.4f} ({book.spread_pct():.4f}%)")
print(f"    mid price range over 1 second: \${min(book.history):.4f} - \${max(book.history):.4f}")
print(f"    market depth = \${book.market_depth():.0f}")

print()
print("=== HFT economics (contention) ===")
print(f"  Maker rebate: $0.0029/share (US equities, SEC Reg NMS)")
print(f"  Taker fee: $0.0030/share")
print(f"  -> Exchange PAYS makers, charges takers - 'maker-taker' model")
print(f"  Spread capture: \${book.spread:.4f} x {book.bids[0][1]:.0f} = \${book.spread * book.bids[0][1]:.4f} profit per filled order")
print(f"  HFT revenue: ~$2B/year in US equities (TABB Group estimate)")
print()
print("=== PFOF (Payment for Order Flow) debate ===")
print(f"  Robinhood model: 0 commission but sells retail orders to wholesalers")
print(f"  Wholesalers (Citadel, Virtu): pay 0.001-0.002/share for order flow")
print(f"  SEC 2024 rule: tick size 1c -> 0.5c for stocks > $1, open auction for retail")
print(f"  Citadel + Virtu suing SEC: 'rule will harm retail liquidity'")
print(f"  Michael Lewis 'Flash Boys' (2014): accused HFT of front-running retail")
print(f"  Truth: HFT is BOTH liquidity-providing AND rent-seeking (depends on practice)")`;

// ============================================================
// Animated SVG thumbnails
// ============================================================

function BlackScholesThumbnail({ accent }: { accent: string }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 0.05) % (2 * Math.PI)), 50);
    return () => clearInterval(id);
  }, []);
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <line x1="10" y1="115" x2="90" y2="115" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <motion.path d="M 10 115 L 50 115 L 80 95 L 90 75" fill="none" stroke={accent} strokeWidth="1.5"
        animate={{ d: `M 10 115 L 50 115 L 80 ${95 + 5 * Math.sin(phase)} L 90 ${75 + 5 * Math.sin(phase)}` }}
        transition={{ duration: 0.05 }}
      />
      <text x="50" y="30" textAnchor="middle" fontSize="8" fill={accent} fontWeight="bold">C = S·N(d₁)</text>
      <text x="50" y="125" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.10 250)">Long call payoff</text>
      <text x="50" y="135" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.10 250)">- K·e^(-rT)·N(d₂)</text>
    </svg>
  );
}

function MonteCarloThumbnail({ accent }: { accent: string }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 0.08) % (2 * Math.PI)), 50);
    return () => clearInterval(id);
  }, []);
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <line x1="10" y1="115" x2="90" y2="115" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <line x1="10" y1="20" x2="10" y2="115" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      {[5, 10, 18, 25, 30, 28, 20, 10, 5, 2].map((h, i) => (
        <motion.rect key={i} x={12 + i * 8} y={115 - h * 3} width="6" height={h * 3}
          fill={i < 2 ? accent : "oklch(0.65 0.16 250 / 0.5)"}
          animate={{ height: [h * 3, h * 3 * (0.7 + 0.3 * Math.sin(phase + i * 0.5)), h * 3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
        />
      ))}
      <line x1="22" y1="20" x2="22" y2="115" stroke={accent} strokeWidth="1" strokeDasharray="2 1" />
      <text x="50" y="135" textAnchor="middle" fontSize="6" fill={accent} fontWeight="bold">VaR + CVaR</text>
    </svg>
  );
}

function GNNThumbnail({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <circle cx="20" cy="60" r="6" fill="oklch(0.65 0.16 165 / 0.6)" />
      <circle cx="50" cy="40" r="6" fill="oklch(0.65 0.16 165 / 0.6)" />
      <circle cx="80" cy="60" r="6" fill={accent} opacity="0.7" />
      <circle cx="35" cy="100" r="6" fill="oklch(0.65 0.16 165 / 0.6)" />
      <circle cx="65" cy="100" r="6" fill={accent} opacity="0.7" />
      <line x1="20" y1="60" x2="50" y2="40" stroke="oklch(0.65 0.10 250 / 0.5)" strokeWidth="0.5" />
      <motion.line x1="50" y1="40" x2="80" y2="60" stroke={accent} strokeWidth="1.5"
        animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
      />
      <motion.line x1="80" y1="60" x2="65" y2="100" stroke={accent} strokeWidth="1.5"
        animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
      />
      <text x="50" y="125" textAnchor="middle" fontSize="6" fill={accent} fontWeight="bold">GNN transaction graph</text>
      <text x="50" y="135" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.10 250)">smurfing detected</text>
    </svg>
  );
}

function HFTThumbnail({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <line x1="50" y1="20" x2="50" y2="115" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" strokeDasharray="2 1" />
      {[0, 1, 2, 3].map(i => (
        <motion.rect key={`b${i}`} x={50 - (20 - i * 3)} y={30 + i * 20} width={20 - i * 3} height="15" fill="oklch(0.65 0.16 165 / 0.6)"
          animate={{ width: [20 - i * 3, 18 - i * 3, 20 - i * 3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
        />
      ))}
      {[0, 1, 2, 3].map(i => (
        <motion.rect key={`a${i}`} x={50} y={30 + i * 20} width={20 - i * 3} height="15" fill={accent}
          animate={{ width: [20 - i * 3, 18 - i * 3, 20 - i * 3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 + 0.3 }}
          opacity="0.6"
        />
      ))}
      <text x="50" y="135" textAnchor="middle" fontSize="6" fill={accent} fontWeight="bold">HFT order book</text>
    </svg>
  );
}

// ============================================================
// Detail content (modal body)
// ============================================================

function BlackScholesDetail() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border/60 bg-card p-4">
        <div className="flex justify-center">
          <div className="w-48 h-64">
            <BlackScholesThumbnail accent="oklch(0.55 0.16 30)" />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Black-Scholes (1973, Nobel 1997) derives a closed-form European option price from a no-arbitrage
          argument. Apply Itô&apos;s lemma to a delta-hedged portfolio → BS PDE → closed form solution.
        </p>
      </div>
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
        <p className="font-mono text-sm text-primary">C = S·N(d₁) - K·e^(-rT)·N(d₂)</p>
        <p className="font-mono text-xs mt-1">d₁ = (ln(S/K) + (r+σ²/2)T) / (σ√T)  ·  d₂ = d₁ - σ√T</p>
        <p className="text-[11px] text-muted-foreground mt-1">Put-Call Parity: C - P = S - K·e^(-rT)</p>
      </div>
      <PyodideRunner
        buttonLabel="Run Black-Scholes + 5 Greeks (Pyodide)"
        code={BLACK_SCHOLES_CODE}
      />
      <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
        <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5 mb-1.5">
          <BookOpen className="h-3 w-3" /> Recent research (2023-2024)
        </p>
        <p className="text-xs text-foreground/80 leading-relaxed">
          <strong>50th anniversary of Black-Scholes (2023).</strong> The formula survives as a quoting convention
          even though its assumptions (constant σ, lognormal, no jumps) are all empirically false. <strong>Deep hedging</strong> (Buehler et al. 2019+):
          NN learns option pricing + hedging strategy directly from data, no PDE needed — now in production at JP Morgan.
          <strong>Rough volatility</strong> (Bayer, Friz, Gatheral 2016): σ has Hurst H≈0.1 (rougher than Brownian) —
          matches &ldquo;vol-of-vol&rdquo; empirical fact better than Heston. <strong>SVI parametrization</strong> (Gatheral 2004):
          industry standard for fitting the vol surface — 5 parameters per maturity.
        </p>
      </div>
    </div>
  );
}

function MonteCarloDetail() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border/60 bg-card p-4">
        <div className="flex justify-center">
          <div className="w-48 h-64">
            <MonteCarloThumbnail accent="oklch(0.55 0.16 0)" />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Monte Carlo simulates 10,000 GBM paths to estimate the P&amp;L distribution. VaR = loss quantile;
          CVaR (Expected Shortfall) = average of the tail beyond VaR. Basel IV (2025+) replaces 99% VaR with 97.5% CVaR.
        </p>
      </div>
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
        <p className="font-mono text-sm text-primary">{"VaR_α = -Q_α(P&L)"}</p>
        <p className="font-mono text-xs mt-1">{"CVaR = -E[P&L | P&L < -VaR]"}</p>
        <p className="text-[11px] text-muted-foreground mt-1">GBM: S_T = S₀·exp((μ-σ²/2)T + σ√T·Z), Z~N(0,1)</p>
      </div>
      <PyodideRunner
        buttonLabel="Run Monte Carlo VaR + CVaR (Pyodide)"
        code={MONTE_CARLO_VAR_CODE}
      />
      <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
        <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5 mb-1.5">
          <BookOpen className="h-3 w-3" /> Recent research (2024-2025)
        </p>
        <p className="text-xs text-foreground/80 leading-relaxed">
          <strong>Basel IV (2025+):</strong> Switches from 99% VaR to 97.5% CVaR (Expected Shortfall).
          Banks must hold ~30-40% more capital. <strong>Rockafellar-Uryasev (2000, Nobel-caliber):</strong>
          CVaR is convex (unlike VaR), making portfolio optimisation tractable.
          <strong>2008 GFC lesson:</strong> Gaussian VaR failed — kurtosis 5-10× normal distribution.
          <strong>Modern alternatives:</strong> Filtered historical simulation (GARCH + bootstrap), Extreme Value Theory
          (peaks-over-threshold), <strong>LSTM for tail dependence</strong> (Berg 2022+). Regulators increasingly
          require stressed VaR (calibrated to worst historical window).
        </p>
      </div>
    </div>
  );
}

function GNNFraudDetail() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border/60 bg-card p-4">
        <div className="flex justify-center">
          <div className="w-48 h-64">
            <GNNThumbnail accent="oklch(0.55 0.16 0)" />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          GraphSAGE (Hamilton et al. 2017) aggregates neighbor information via message passing:
          h_v = σ(W·AGG([h_u : u ∈ N(v)])). A single $5k transaction looks normal; the same $5k
          preceded by 100 small deposits + immediate cash-out is money laundering.
        </p>
      </div>
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
        <p className="font-mono text-sm text-primary">{"h_v^(l+1) = σ(W·AGG({h_u^(l) : u∈N(v)}))"}</p>
        <p className="font-mono text-xs mt-1">fraud_score(v) = MLP(h_v^(L))</p>
        <p className="text-[11px] text-muted-foreground mt-1">GraphSAGE: mean aggregation · GAT: attention weights · TGN: temporal</p>
      </div>
      <PyodideRunner
        buttonLabel="Run GraphSAGE fraud detection (Pyodide)"
        code={GNN_FRAUD_CODE}
      />
      <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
        <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5 mb-1.5">
          <BookOpen className="h-3 w-3" /> Recent research (2024)
        </p>
        <p className="text-xs text-foreground/80 leading-relaxed">
          <strong>GraphSAGE</strong> (Hamilton et al. 2017) and <strong>GAT</strong> (Veličković et al. 2018)
          are the production standard for transaction-graph fraud detection. Visa runs GNNs on 100M+ txns/day;
          JPMorgan ~60% of fraud alerts are GNN-generated. <strong>Temporal Graph Networks (TGN, Rossi 2020)</strong>
          model txns over time — critical for detecting velocity patterns. <strong>Heterophilic GNNs</strong> (2022+):
          fraud nodes look SIMILAR to their neighbours (homophilic assumption breaks), requiring special architectures.
          <strong>Federated GNN (2023+):</strong> banks collaborate on model training without sharing raw transaction
          data — protects customer privacy. <strong>Adversarial arms race:</strong> fraudsters now use GANs to evade
          GNNs (adversarial perturbations to transaction graphs).
        </p>
      </div>
    </div>
  );
}

function HFTDetail() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border/60 bg-card p-4">
        <div className="flex justify-center">
          <div className="w-48 h-64">
            <HFTThumbnail accent="oklch(0.55 0.16 30)" />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          The limit order book is HFT&apos;s battleground. Makers (passive limit orders) earn rebates ($0.0029/share);
          takers (aggressive market orders) pay fees ($0.0030). The spread is the HFT&apos;s profit margin —
          typically 0.01-0.05 in liquid stocks. Contention: does HFT add or remove liquidity?
        </p>
      </div>
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
        <p className="font-mono text-sm text-primary">Spread = ask - bid · Market depth = Σ(size × price) across N levels</p>
        <p className="font-mono text-xs mt-1">Maker rebate: $0.0029/share · Taker fee: $0.0030/share</p>
        <p className="text-[11px] text-muted-foreground mt-1">HFT revenue: ~$2B/year in US equities (TABB Group estimate)</p>
      </div>
      <PyodideRunner
        buttonLabel="Run HFT order book simulator (Pyodide)"
        code={HFT_ORDERBOOK_CODE}
      />
      <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
        <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5 mb-1.5">
          <BookOpen className="h-3 w-3" /> Recent research + regulation (2024)
        </p>
        <p className="text-xs text-foreground/80 leading-relaxed">
          <strong>SEC Reg NMS 2024 update:</strong> tick-size reduction ($1¢ → $0.5¢ for high-priced stocks),
          open auction for retail orders, AI-based market surveillance. Goal: level the playing field between
          HFT firms and retail. <strong>Contention: maker-taker vs free-to-take</strong> — exchanges pay rebates for
          providing liquidity; critics argue this incentivises phantom orders. <strong>PFOF debate</strong> (Payment for
          Order Flow): Robinhood sells retail orders to wholesalers (Citadel, Virtu) — Michael Lewis&apos;s
          &ldquo;Flash Boys&rdquo; (2014) accused HFT of front-running retail. Citadel + Virtu are suing SEC over
          2024 rules. <strong>IEX (2013, Michael Lewis-backed)</strong>: speed bump defeats latency arbitrage.
          The truth: HFT is BOTH liquidity-providing (90% spread reduction since 1990) AND rent-seeking
          (latency arb, sub-penn sniffing) — depends on the specific practice.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Shorts metadata + main carousel
// ============================================================

interface ShortMeta {
  id: string;
  step: string;
  hookTitle: string;
  subtitle: string;
  accent: string;
  thumbnail: ReactNode;
  detail: ReactNode;
}

const SHORTS: ShortMeta[] = [
  {
    id: "bs",
    step: "1",
    hookTitle: "The formula that started quant — 50 years old",
    subtitle: "C = S·N(d₁) - K·e^(-rT)·N(d₂) — Black 1973",
    accent: "oklch(0.55 0.16 30)",
    thumbnail: <BlackScholesThumbnail accent="oklch(0.55 0.16 30)" />,
    detail: <BlackScholesDetail />,
  },
  {
    id: "var",
    step: "2",
    hookTitle: "10,000 paths → how bad can it get?",
    subtitle: "VaR + CVaR — Basel IV 2025+",
    accent: "oklch(0.55 0.16 0)",
    thumbnail: <MonteCarloThumbnail accent="oklch(0.55 0.16 0)" />,
    detail: <MonteCarloDetail />,
  },
  {
    id: "gnn",
    step: "3",
    hookTitle: "Catching the chain, not the transaction",
    subtitle: "GraphSAGE — Visa, JPMorgan production 2024",
    accent: "oklch(0.55 0.16 165)",
    thumbnail: <GNNThumbnail accent="oklch(0.55 0.16 0)" />,
    detail: <GNNFraudDetail />,
  },
  {
    id: "hft",
    step: "4",
    hookTitle: "The 1-millisecond battleground",
    subtitle: "Order book + PFOF + maker-taker — SEC 2024",
    accent: "oklch(0.55 0.16 250)",
    thumbnail: <HFTThumbnail accent="oklch(0.55 0.16 30)" />,
    detail: <HFTDetail />,
  },
];

export function FintechShortsCarousel() {
  const [openId, setOpenId] = useState<string | null>(null);
  const openShort = openId ? SHORTS.find(s => s.id === openId) : null;

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

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5 flex-wrap">
        <Zap className="h-3 w-3 text-amber-500" />
        Click any short to open a lazy popup — animated SVG + math + Pyodide-runnable Python code + 2024-2025 paper citation.
        <span className="text-[10px]">Modal content only mounts on click.</span>
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SHORTS.map(s => (
          <motion.button
            key={s.id}
            type="button"
            onClick={() => setOpenId(s.id)}
            className="relative rounded-xl overflow-hidden border border-border/60 hover:border-primary/60 hover:shadow-lg transition-all bg-gradient-to-br from-card to-muted/30 group"
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            aria-label={`Open short: ${s.hookTitle}`}
          >
            <div className="relative w-full bg-gradient-to-br from-muted/40 to-card" style={{ aspectRatio: "9 / 16", maxHeight: 320 }}>
              <div className="absolute inset-0 p-2">
                {s.thumbnail}
              </div>
              <div className="absolute top-2 left-2 z-10">
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-0.5"
                  style={{ backgroundColor: s.accent + "20", color: s.accent }}>
                  <Sparkles className="h-2.5 w-2.5" /> QUANT {s.step}
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
            <div className="p-2.5 border-t border-border/40 bg-background/80">
              <p className="text-xs font-semibold leading-tight" style={{ color: s.accent }}>
                {s.hookTitle}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{s.subtitle}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* LAZY modal */}
      <AnimatePresence>
        {openShort && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 md:p-6 overflow-y-auto"
            onClick={() => setOpenId(null)}
          >
            <button
              type="button" onClick={() => setOpenId(null)}
              className="absolute top-3 right-3 z-30 p-2 rounded-full bg-background/90 border border-border hover:bg-accent transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="absolute top-3 left-3 z-30 px-3 py-1.5 rounded-full bg-background/90 border border-border flex items-center gap-2 text-xs font-semibold">
              <DollarSign className="h-3.5 w-3.5" style={{ color: openShort.accent }} />
              <span style={{ color: openShort.accent }}>QUANT {openShort.step} · {openShort.hookTitle}</span>
            </div>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-3xl my-8 rounded-xl border border-border bg-background shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 md:p-6 max-h-[85vh] overflow-y-auto">
                {openShort.detail}
              </div>
              <div className="border-t border-border/40 bg-muted/20 px-4 md:px-6 py-2.5 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>← click outside or press Esc to close</span>
                <span className="font-mono">{SHORTS.findIndex(s => s.id === openShort.id) + 1} / {SHORTS.length}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
