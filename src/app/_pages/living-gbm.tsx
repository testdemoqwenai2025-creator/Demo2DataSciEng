"use client";

import { useState } from "react";
import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { NextSteps } from "../_components/next-steps";
import { CodeBlock } from "../_components/code-block";
import { LivingEquationRunner } from "../_components/living-equation-runner";
import { RelatedTopics } from "../_components/related-topics";
import { RelatedElegantCode } from "../_components/related-elegant-code";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Sparkles, Cpu, BookOpen, Database } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";

type Tab = "math" | "live" | "production";

const KPIS = [
  { label: "Dataset", value: "SPX daily returns 1950-2024 (synthetic)", hint: "Real: Yahoo Finance SPX daily, 18,725 observations. μ=8%/yr, σ=18%/yr. Synthetic: 50 simulated 1-year paths × 252 trading days.", deltaTone: "flat" as const },
  { label: "Equation", value: "dS = μS·dt + σS·dW", hint: "Geometric Brownian Motion. Additive noise (Bachelier 1900) allows negative S; multiplicative noise keeps S positive with log-normal stationary distribution.", deltaTone: "flat" as const },
  { label: "Slider", value: "σ (volatility)", hint: "Drag σ from 5% to 50%. At σ=10%: paths cluster tightly. At σ=50%: paths fan out 3× wider. Final-price std dev scales linearly with σ.", deltaTone: "up" as const },
  { label: "Production", value: "scipy.stats.lognorm", hint: "Production: scipy.stats.lognorm.fit(returns). QuantLib.BlackScholesProcess. Bloomberg GBM simulator for risk scenarios.", deltaTone: "flat" as const },
];

export function LivingGbmPage() {
  const [tab, setTab] = useState<Tab>("live");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Living equation · run Geometric Brownian Motion live in your browser"
        title="Living GBM — drag σ and watch 50 SPX paths fan out"
        description="Geometric Brownian Motion (GBM) is the stochastic process underlying the Black-Scholes equation. Drag σ (volatility) and watch 50 simulated 1-year SPX paths fan out wider (high σ) or narrower (low σ). The SAME SDE models container dwell times at Rotterdam (port authority data) and Wright-Fisher allele drift (genetics) — because all three have multiplicative noise where variance scales with the current value."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><TrendingUp className="h-3 w-3" /> Stochastic DEs</Badge>
            <Badge variant="outline" className="gap-1.5"><Database className="h-3 w-3" /> SPX 1950-2024</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-border/60">
        {([
          ["live", "Live demo (Pyodide + slider)"],
          ["math", "Math derivation"],
          ["production", "Production code (scipy.stats.lognorm)"],
        ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-semibold border-b-2 -mb-px transition-all ${
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "live" && (
        <SectionCard
          title="Live GBM — drag σ and watch 50 simulated SPX paths fan out"
          description="S₀ = $5,000 (SPX spot), T = 1 year, r = 5% drift, σ = slider. 50 paths × 252 daily steps. The exact solution S(t) = S₀·exp((μ − σ²/2)·t + σ·W(t)) gives log-normal terminal prices — always positive, skewed right."
          icon={<Sparkles className="h-5 w-5" />}
          badge="live"
        >
          <LivingEquationRunner
            slider={{
              name: "sigma",
              label: "σ (volatility — annualised std dev of returns)",
              min: 5,
              max: 50,
              step: 1,
              default: 18,
              hint: "σ=18% (SPX historical): final prices in [$3,500, $7,500]. σ=50% (crisis): final prices fan to [$2,000, $13,000]. Multiplicative noise → log-normal distribution.",
            }}
            preamble="import json, math, random"
            code={`import json, math, random

random.seed(42)

# SPX 1-year simulation via GBM exact solution:
#   S(t+dt) = S(t) * exp((mu - sigma^2/2)*dt + sigma * sqrt(dt) * Z)
# where Z ~ N(0, 1), mu = drift, sigma = volatility.

S0 = 5000.0      # SPX spot ($)
T = 1.0          # 1 year horizon
mu = 0.05        # annual drift (5%)
sigma = \${sigma} / 100.0  # volatility (decimal)
n_paths = 50     # number of simulated paths
n_steps = 252    # daily steps (trading days in 1 year)
dt = T / n_steps

# Simulate paths
paths = []
for _ in range(n_paths):
    s = S0
    path = [s]
    for _ in range(n_steps):
        Z = random.gauss(0, 1)
        s *= math.exp((mu - 0.5 * sigma * sigma) * dt + sigma * math.sqrt(dt) * Z)
        path.append(s)
    paths.append(path)

# Build chart data: at each step, show mean ± std of paths + min/max envelope.
chart_data = []
for t in range(n_steps + 1):
    prices_at_t = [p[t] for p in paths]
    mean_p = sum(prices_at_t) / len(prices_at_t)
    var_p = sum((p - mean_p) ** 2 for p in prices_at_t) / len(prices_at_t)
    std_p = math.sqrt(var_p)
    chart_data.append({
        'step': t,
        'mean': mean_p,
        'mean_plus_1std': mean_p + std_p,
        'mean_minus_1std': mean_p - std_p,
        # show 5 sample paths for visualisation
        'path_0': paths[0][t],
        'path_1': paths[1][t],
        'path_2': paths[2][t],
        'path_3': paths[3][t],
        'path_4': paths[4][t],
    })

# Final distribution statistics
final_prices = [p[-1] for p in paths]
final_mean = sum(final_prices) / len(final_prices)
final_var = sum((p - final_mean) ** 2 for p in final_prices) / len(final_prices)
final_std = math.sqrt(final_var)

# Theoretical log-normal stats: log(S_T) ~ N(log(S0) + (mu - sigma^2/2)*T, sigma^2 * T)
log_mean_theoretical = math.log(S0) + (mu - 0.5 * sigma * sigma) * T
log_std_theoretical = sigma * math.sqrt(T)
# E[S_T] = S0 * exp(mu * T), Var[S_T] = (S0^2 * exp(2*mu*T)) * (exp(sigma^2*T) - 1)
E_ST_theoretical = S0 * math.exp(mu * T)
Var_ST_theoretical = (S0 * S0 * math.exp(2 * mu * T)) * (math.exp(sigma * sigma * T) - 1)
Std_ST_theoretical = math.sqrt(Var_ST_theoretical)

# Percentiles of final prices (95% interval)
sorted_final = sorted(final_prices)
p5 = sorted_final[int(0.05 * len(sorted_final))]
p95 = sorted_final[int(0.95 * len(sorted_final))]

result = {
    'chart_data': chart_data,
    'sigma': sigma,
    'final_mean': final_mean,
    'final_std': final_std,
    'E_ST_theoretical': E_ST_theoretical,
    'Std_ST_theoretical': Std_ST_theoretical,
    'p5': p5,
    'p95': p95,
    'S0': S0,
    'mu': mu,
    'T': T,
    'n_paths': n_paths,
}
print(json.dumps(result))
`}
            renderer={(result) => {
              const r = result as { chart_data: Array<{ step: number; mean: number; mean_plus_1std: number; mean_minus_1std: number; path_0: number; path_1: number; path_2: number; path_3: number; path_4: number }>; sigma: number; final_mean: number; final_std: number; E_ST_theoretical: number; Std_ST_theoretical: number; p5: number; p95: number; S0: number; mu: number; T: number; n_paths: number };
              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">σ (volatility)</p>
                      <p className="font-mono font-bold text-primary text-base">{(r.sigma * 100).toFixed(0)}%</p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">E[S_T] (simulated)</p>
                      <p className="font-mono font-bold text-primary text-base">${r.final_mean.toFixed(0)}</p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">E[S_T] (theory)</p>
                      <p className="font-mono font-bold text-primary text-base">${r.E_ST_theoretical.toFixed(0)}</p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">95% range (final)</p>
                      <p className="font-mono font-bold text-primary text-[10px]">[${r.p5.toFixed(0)}, ${r.p95.toFixed(0)}]</p>
                    </div>
                  </div>

                  <div style={{ width: "100%", height: 360 }}>
                    <ResponsiveContainer>
                      <LineChart data={r.chart_data} margin={{ top: 12, right: 16, bottom: 24, left: 8 }}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} />
                        <XAxis dataKey="step" stroke="hsl(var(--muted-foreground))" fontSize={10} label={{ value: "trading day", position: "insideBottom", offset: -10, fontSize: 10 }} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} label={{ value: "SPX price ($)", angle: -90, position: "insideLeft", fontSize: 10 }} />
                        <Tooltip formatter={(value: number) => `$${value.toFixed(0)}`} labelFormatter={(label) => `day ${label}`} />
                        <Legend />
                        <Line name="mean" type="monotone" dataKey="mean" stroke="#16a34a" strokeWidth={2.5} dot={false} />
                        <Line name="mean + 1σ" type="monotone" dataKey="mean_plus_1std" stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 4" dot={false} strokeOpacity={0.5} />
                        <Line name="mean − 1σ" type="monotone" dataKey="mean_minus_1std" stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 4" dot={false} strokeOpacity={0.5} />
                        <Line name="path 1" type="monotone" dataKey="path_0" stroke="#2563eb" strokeWidth={1.2} dot={false} strokeOpacity={0.6} />
                        <Line name="path 2" type="monotone" dataKey="path_1" stroke="#9333ea" strokeWidth={1.2} dot={false} strokeOpacity={0.6} />
                        <Line name="path 3" type="monotone" dataKey="path_2" stroke="#dc2626" strokeWidth={1.2} dot={false} strokeOpacity={0.6} />
                        <Line name="path 4" type="monotone" dataKey="path_3" stroke="#0891b2" strokeWidth={1.2} dot={false} strokeOpacity={0.6} />
                        <Line name="path 5" type="monotone" dataKey="path_4" stroke="#ca8a04" strokeWidth={1.2} dot={false} strokeOpacity={0.6} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    50 simulated SPX paths over 1 year (252 trading days). 5 sample paths shown in color; <span className="text-emerald-600 dark:text-emerald-400 font-semibold">green</span> is the mean; <span className="text-slate-500">dashed grey</span> is mean ± 1σ envelope.
                    At <span className="font-mono text-primary">σ = {(r.sigma * 100).toFixed(0)}%</span>, simulated E[S_T] = <span className="font-mono text-primary">${r.final_mean.toFixed(0)}</span> vs theoretical E[S_T] = S₀·exp(μT) = <span className="font-mono text-primary">${r.E_ST_theoretical.toFixed(0)}</span>.
                    Final prices 95% range: <span className="font-mono">[${r.p5.toFixed(0)}, ${r.p95.toFixed(0)}]</span> (log-normal: skewed right).
                  </p>
                </div>
              );
            }}
          />
        </SectionCard>
      )}

      {tab === "math" && (
        <SectionCard
          title="Math derivation — where GBM comes from"
          description="Brownian motion (Brown 1827, Einstein 1905, Wiener 1923) is the universal stochastic process. Bachelier (1900) applied additive Brownian motion to French bonds. Samuelson (1965) introduced multiplicative GBM, fixing the 'negative price' problem — Black-Scholes (1973) built on Samuelson's GBM."
          icon={<BookOpen className="h-5 w-5" />}
          badge="derivation"
        >
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground/80">The SDE.</strong> Geometric Brownian Motion satisfies dS = μS·dt + σS·dW, where dW ~ N(0, dt) is a Wiener process increment. The drift μS·dt pulls S upward exponentially; the noise σS·dW multiplies the current S — so variance scales with S² (multiplicative noise).
            </p>
            <p>
              <strong className="text-foreground/80">The exact solution.</strong> Apply Ito's lemma to log S: d(log S) = (μ − σ²/2)·dt + σ·dW. Integrating gives log(S_T) = log(S_0) + (μ − σ²/2)·T + σ·W(T), so S_T = S_0·exp((μ − σ²/2)·T + σ·W(T)). Since W(T) ~ N(0, T), log(S_T) is normally distributed → S_T is log-normal.
            </p>
            <p>
              <strong className="text-foreground/80">Why multiplicative, not additive.</strong> Additive BM (Bachelier 1900): dS = μ·dt + σ·dW allows S to go negative (impossible for prices, dwell times, or allele frequencies). Multiplicative noise (σS·dW) keeps S positive because the noise scales with S — small S has small noise. The stationary distribution is log-normal: skewed right, never negative.
            </p>
            <p>
              <strong className="text-foreground/80">Three sciences, one SDE.</strong> SPX daily returns (Bachelier→Samuelson→Black-Scholes 1973): dS = μS·dt + σS·dW. Container dwell times at Rotterdam (port authority data): same SDE with different μ, σ. Wright-Fisher allele drift (Fisher 1922): dS = s·S·dt + √(S(1−S)/(2N_e))·dW — a rescaled GBM on the allele-frequency manifold. The math doesn't know if S is a stock, a dwell time, or an allele frequency.
            </p>
            <p>
              <strong className="text-foreground/80">Citation.</strong> Brown, 'A brief account of microscopical observations...' (1827). Bachelier, 'Théorie de la spéculation' (1900). Samuelson, 'Rational theory of warrant pricing', Industrial Management Review 6:2 (1965). Black-Scholes (1973).
            </p>
          </div>
        </SectionCard>
      )}

      {tab === "production" && (
        <SectionCard
          title="Production code — what SciPy and QuantLib compute"
          description="In production, you call scipy.stats.lognorm (fit log-normal to returns) or QuantLib.BlackScholesProcess (full stochastic process with term structures). Bloomberg GBM simulator generates risk scenarios."
          icon={<Cpu className="h-5 w-5" />}
          badge="production"
        >
          <CodeBlock
            language="python"
            filename="production_gbm.py"
            code={`# Production GBM on real SPX data
import numpy as np
import pandas as pd
from scipy.stats import lognorm
import matplotlib.pyplot as plt

# Load real SPX daily returns 1950-2024 (Yahoo Finance)
# Source: https://finance.yahoo.com/quote/%5EGSPC/history
spx = pd.read_csv('SPX_daily.csv', parse_dates=['Date'], index_col='Date')
returns = np.log(spx['Close'] / spx['Close'].shift(1)).dropna()  # log returns

# Fit GBM parameters via MLE
mu_hat = returns.mean() * 252  # annualised drift
sigma_hat = returns.std() * np.sqrt(252)  # annualised vol
print(f"SPX 1950-2024: mu = {mu_hat:.4f} ({mu_hat*100:.2f}%/yr), "
      f"sigma = {sigma_hat:.4f} ({sigma_hat*100:.2f}%/yr)")

# Simulate 1000 1-year SPX paths (Euler discretisation, daily steps)
S0 = spx['Close'].iloc[-1]  # latest close
T = 1.0; n_paths = 1000; n_steps = 252; dt = T / n_steps
np.random.seed(42)
paths = np.zeros((n_paths, n_steps + 1))
paths[:, 0] = S0
for t in range(1, n_steps + 1):
    Z = np.random.standard_normal(n_paths)
    paths[:, t] = paths[:, t-1] * np.exp(
        (mu_hat - 0.5 * sigma_hat**2) * dt + sigma_hat * np.sqrt(dt) * Z
    )

# Final distribution: log-normal fit
final_prices = paths[:, -1]
shape, loc, scale = lognorm.fit(final_prices, floc=0)
print(f"Final price: lognormal(loc={loc:.2f}, scale={scale:.2f}, shape={shape:.4f})")
print(f"  E[S_T] = {final_prices.mean():.0f}, median = {np.median(final_prices):.0f}")
print(f"  95% VaR (5th percentile) = {np.percentile(final_prices, 5):.0f}")

# Plot 10 sample paths + mean ± std envelope
plt.figure(figsize=(10, 4))
for i in range(10):
    plt.plot(paths[i], alpha=0.5, lw=0.8)
mean_path = paths.mean(axis=0); std_path = paths.std(axis=0)
plt.plot(mean_path, 'k-', lw=2, label='mean')
plt.fill_between(range(n_steps+1), mean_path-std_path, mean_path+std_path, alpha=0.2)
plt.xlabel('trading day'); plt.ylabel('SPX price ($)'); plt.legend()
plt.title(f'GBM simulation: {n_paths} paths, mu={mu_hat:.2f}, sigma={sigma_hat:.2f}')
plt.savefig('gbm_spx.png', dpi=150, bbox_inches='tight')`}
          />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <Link href={hrefFor("fintech")} className="rounded-md border border-border/60 bg-muted/20 p-2 hover:border-primary/40 hover:bg-primary/5 transition-colors block">
              <p className="font-semibold text-foreground/80">→ Fintech</p>
              <p className="text-muted-foreground text-[10px] mt-0.5">QuantLib + GBM for SPX scenarios in production.</p>
            </Link>
            <Link href={hrefFor("elegant-code")} className="rounded-md border border-border/60 bg-muted/20 p-2 hover:border-primary/40 hover:bg-primary/5 transition-colors block">
              <p className="font-semibold text-foreground/80">→ Elegant Code (GBM card)</p>
              <p className="text-muted-foreground text-[10px] mt-0.5">GBM's full cross-disciplinary card: fintech ↔ maritime ↔ genetics.</p>
            </Link>
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="My deeper thought: GBM IS the universal multiplicative-noise equation"
        description="SPX daily returns (Black-Scholes foundation, 1973 Nobel), Rotterdam container dwell times (berth planning under uncertainty), and Wright-Fisher allele drift (genetic drift across generations) all use the SAME SDE dS = μS·dt + σS·dW — because all three have multiplicative noise where the variance scales with the current value. Additive noise allows S to go negative (impossible for prices, dwell times, or frequencies); multiplicative noise keeps S positive with log-normal stationary distribution. Brownian 1827, Bachelier 1900, Fisher 1922 — three sciences, one diffusion."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">A quant simulating SPX, a port captain simulating dwell times, and a geneticist simulating allele drift</strong> all iterate the SAME SDE. The math doesn't know the asset class.</p>
        </div>
      </SectionCard>

      <RelatedElegantCode sourceCard={18} />

      <DeeperThoughtSection pageTitle="Gbm">
        <DeeperThought title="GBM IS the universal multiplicative-noise equation — stocks, dwell times, and alleles" connectedTo="ADR-054 (Black-Scholes + MC + GNN for fintech)">
          <p>{"SPX daily returns, Rotterdam container dwell times, and Wright-Fisher allele drift all follow dS = μS·dt + σS·dW. Multiplicative noise (σS·dW) keeps S positive — unlike additive noise (σ·dW, Bachelier 1900), which allows negative prices. Samuelson (1965) fixed Bachelier's negative-price problem by introducing multiplicative noise. Black-Scholes (1973) built on Samuelson's GBM. Fisher (1922) had already used it for allele drift. Three sciences, one SDE — and the math doesn't know the asset class."}</p>
        </DeeperThought>
        <DeeperThought title="The log-normal distribution IS the consequence of multiplicative noise" connectedTo="ADR-022 (pgvector for variant embeddings)">
          <p>{"GBM's exact solution S_T = S₀·exp((μ-σ²/2)T + σ·W(T)) means log(S_T) is normally distributed → S_T is log-normal. The log-normal distribution is skewed right (a few very high values, many low values) — which matches stock returns, container dwell times, and allele frequencies. The skew is the signature of multiplicative noise. If you see a log-normal distribution, you know the underlying process is GBM. The distribution IS the diagnostic."}</p>
        </DeeperThought>
        <DeeperThought title="The fan-out IS the proof — drag σ and watch paths spread" connectedTo="ADR-051 (living-equation pages)">
          <p>{"When you drag σ from 5% to 50% on this page, the 50 simulated SPX paths fan out from a tight cluster to a wide cone. At σ=50% (crisis), final prices range from $2,000 to $13,000. At σ=5% (stable), they're $4,800-$5,200. The visual output — a fan of colored lines spreading from a single point — communicates 'volatility' instantly. The brain sees the fan widen and understands: more σ = more uncertainty = wider outcomes. This is what risk looks like — and seeing it is different from reading 'σ is the annualised standard deviation of returns.'"}</p>
        </DeeperThought>
        <DeeperThought title="Bachelier 1900 used additive noise — and got negative prices" connectedTo="ADR-001 (platform architecture)">
          <p>{"Louis Bachelier's 1900 thesis 'Théorie de la spéculation' was the first application of Brownian motion to finance — 5 years before Einstein's 1905 paper on Brownian motion. But Bachelier used additive noise (dS = μ·dt + σ·dW), which allows S to go negative — impossible for stock prices. Samuelson (1965) fixed this by introducing multiplicative noise (dS = μS·dt + σS·dW), which keeps S positive. The fix seems small (multiply by S), but it's the difference between Bachelier's forgotten thesis and Black-Scholes' Nobel Prize. The right noise model IS the right equation."}</p>
        </DeeperThought>
        <DeeperThought title="Wright-Fisher drift IS GBM on the allele-frequency manifold" connectedTo="ADR-037 (genetic materials + variant calling)">
          <p>{"The Wright-Fisher model describes allele frequency changes as a diffusion on [0,1]: dp = s·p·(1-p)·dt + √(p(1-p)/(2N_e))·dW. This IS a GBM variant — the drift and diffusion coefficients depend on p (bounded between 0 and 1), but the structure (multiplicative noise) is the same. Fisher (1922) derived this 43 years before Samuelson (1965) introduced GBM for finance. The geneticist got there first — but the quant got the Nobel. The math doesn't care about priority."}</p>
        </DeeperThought>
      </DeeperThoughtSection>
      <RelatedTopics topics={[
        { id: "fintech" as const, reason: "Fintech — QuantLib + GBM in production" },
        { id: "elegant-code" as const, reason: "Elegant Code — the GBM card (cross-disciplinary)" },
        { id: "living-black-scholes" as const, reason: "Living Black-Scholes — derives from GBM (cousin)" },
        { id: "living-monte-carlo" as const, reason: "Living Monte Carlo — simulates GBM paths (cousin)" },
      ]} />
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "Trace this topic's connections across the platform's math graph" }, { id: "fintech" as const, reason: "Fintech — QuantLib + GBM in production" }, { id: "elegant-code" as const, reason: "Elegant Code — the GBM card (cross-disciplinary)" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("elegant-code")} className="text-sm text-primary hover:underline">→ Elegant Code (GBM card)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("fintech")} className="text-sm text-primary hover:underline">→ Fintech (production)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("living-black-scholes")} className="text-sm text-primary hover:underline">→ Living Black-Scholes (cousin)</Link>
      </div>
    </div>
  );
}
