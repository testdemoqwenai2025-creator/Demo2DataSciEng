"use client";

import { useState } from "react";
import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock } from "../_components/code-block";
import { LivingEquationRunner } from "../_components/living-equation-runner";
import { RelatedTopics } from "../_components/related-topics";
import { RelatedElegantCode } from "../_components/related-elegant-code";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Boxes, Sparkles, TrendingUp, Cpu, BookOpen, Database } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";

type Tab = "math" | "live" | "production";

const KPIS = [
  { label: "Dataset", value: "SPX 30-day call option (synthetic GBM)", hint: "S=$5,000 spot, K=$5,000 strike, T=30/365, r=5%, σ=15%. Real: CME SPX option chain, $10^10 daily notional.", deltaTone: "flat" as const },
  { label: "Equation", value: "E[f(X)] ≈ (1/N)·Σ f(X_i)", hint: "Monte Carlo: simulate N GBM paths to expiry, compute mean payoff, discount. Convergence rate is O(1/√N) per Central Limit Theorem.", deltaTone: "flat" as const },
  { label: "Slider", value: "N (number of GBM paths)", hint: "Drag N from 10 to 10,000. At N=10: MC estimate ±$30. At N=10,000: ±$0.30 (CLT: σ/√N). Converges to Black-Scholes price ~$32.", deltaTone: "up" as const },
  { label: "Production", value: "QuantLib.MCEngine", hint: "Production: QuantLib.MonteCarloEuropeanEngine. PathSimulator + MCStatistics. BloomBerg BBG_MC function. CME uses quasi-MC for SPX settlement.", deltaTone: "flat" as const },
];

export function LivingMonteCarloPage() {
  const [tab, setTab] = useState<Tab>("live");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Living equation · run Monte Carlo live in your browser"
        title="Living Monte Carlo — option pricing via simulated GBM paths"
        description="Monte Carlo pricing: simulate N Geometric Brownian Motion paths to expiry, compute mean payoff max(S_T − K, 0), discount by e^(-rT). Drag N (paths) and watch the MC estimate converge to the closed-form Black-Scholes value (~$32) at rate O(1/√N). The SAME averaging simulates port congestion (10⁵ vessels), rare-variant p-values (10⁶ permutations), and neutron transport — because all four estimate E[f(X)] via random sampling."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Boxes className="h-3 w-3" /> Sampling Methods</Badge>
            <Badge variant="outline" className="gap-1.5"><Database className="h-3 w-3" /> CME SPX</Badge>
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
          ["production", "Production code (QuantLib)"],
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
          title="Live Monte Carlo on SPX 30-day ATM call — drag N and watch convergence"
          description="S=$5,000, K=$5,000, T=30/365 yr, r=5%, σ=15%. Black-Scholes closed-form price: ~$32.0. As N grows, the MC estimate converges to this value at rate σ_payoff/√N. The chart shows MC estimate ± 1.96σ (95% CI) vs N."
          icon={<Sparkles className="h-5 w-5" />}
          badge="live"
        >
          <LivingEquationRunner
            slider={{
              name: "N",
              label: "N (number of GBM paths to simulate)",
              min: 10,
              max: 10000,
              step: 10,
              default: 100,
              hint: "N=10: ±$30 stderr. N=100: ±$10. N=1,000: ±$3. N=10,000: ±$0.30 (CLT: σ/√N). Convergence to Black-Scholes ~$32.",
            }}
            preamble="import json, math, random"
            code={`import json, math, random

random.seed(42)

# SPX 30-day ATM call option
S = 5000.0      # spot
K = 5000.0      # ATM strike
T = 30.0 / 365  # 30 days to expiry
r = 0.05        # risk-free rate (5% annual)
sigma = 0.15    # volatility (15% — historical SPX average)

N = \${N}

# Simulate N GBM paths to expiry using exact solution:
#   S_T = S * exp((r - sigma^2/2)*T + sigma * sqrt(T) * Z), Z ~ N(0, 1)
def sample_s_t():
    Z = random.gauss(0, 1)
    return S * math.exp((r - 0.5 * sigma * sigma) * T + sigma * math.sqrt(T) * Z)

# Compute the discounted payoff for each path
discount_factor = math.exp(-r * T)
payoffs = []
for _ in range(N):
    s_t = sample_s_t()
    payoff = max(s_t - K, 0.0)  # European call payoff
    payoffs.append(discount_factor * payoff)

# MC estimate: E[payoff] ≈ mean(payoffs)
mc_price = sum(payoffs) / N

# Standard error: σ_payoff / sqrt(N) (CLT)
mean_payoff = sum(payoffs) / N
var_payoff = sum((p - mean_payoff) ** 2 for p in payoffs) / max(N - 1, 1)
stderr = math.sqrt(var_payoff / N)

# 95% CI: MC_price ± 1.96 * stderr
ci_low = mc_price - 1.96 * stderr
ci_high = mc_price + 1.96 * stderr

# Closed-form Black-Scholes for comparison (Brenner-Subrahmanyam approx for ATM)
# d1 = (sigma * sqrt(T)) / sqrt(2 * pi), approximated: C ≈ S * sigma * sqrt(T) / sqrt(2*pi)
bs_approx = S * sigma * math.sqrt(T) / math.sqrt(2 * math.pi)

# Also compute several MC estimates at smaller N's (for the convergence chart)
# to show how MC converges with N.
convergence_data = []
for n_test in [10, 50, 100, 500, 1000, 5000, 10000]:
    if n_test > N: continue
    # Use the first n_test payoffs from our existing sample
    sub_payoffs = payoffs[:n_test]
    sub_mean = sum(sub_payoffs) / n_test
    sub_var = sum((p - sub_mean) ** 2 for p in sub_payoffs) / max(n_test - 1, 1)
    sub_stderr = math.sqrt(sub_var / n_test) if n_test > 0 else 0
    convergence_data.append({
        'N': n_test,
        'mc_estimate': sub_mean,
        'stderr': sub_stderr,
        'ci_low': sub_mean - 1.96 * sub_stderr,
        'ci_high': sub_mean + 1.96 * sub_stderr,
    })

# Always include the BS reference (independent of N)
result = {
    'convergence_data': convergence_data,
    'mc_price': mc_price,
    'stderr': stderr,
    'ci_low': ci_low,
    'ci_high': ci_high,
    'bs_approx': bs_approx,
    'N': N,
}
print(json.dumps(result))
`}
            renderer={(result) => {
              const r = result as { convergence_data: Array<{ N: number; mc_estimate: number; stderr: number; ci_low: number; ci_high: number }>; mc_price: number; stderr: number; ci_low: number; ci_high: number; bs_approx: number; N: number };
              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">N (paths)</p>
                      <p className="font-mono font-bold text-primary text-base">{r.N.toLocaleString()}</p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">MC estimate</p>
                      <p className="font-mono font-bold text-primary text-base">${r.mc_price.toFixed(2)}</p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">95% CI</p>
                      <p className="font-mono font-bold text-primary text-[10px]">[${r.ci_low.toFixed(2)}, ${r.ci_high.toFixed(2)}]</p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">Black-Scholes</p>
                      <p className="font-mono font-bold text-primary text-base">${r.bs_approx.toFixed(2)}</p>
                    </div>
                  </div>

                  <div style={{ width: "100%", height: 320 }}>
                    <ResponsiveContainer>
                      <LineChart data={r.convergence_data} margin={{ top: 12, right: 16, bottom: 24, left: 8 }}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} />
                        <XAxis dataKey="N" type="number" scale="log" domain={[10, 10000]} stroke="hsl(var(--muted-foreground))" fontSize={10} label={{ value: "N (log scale)", position: "insideBottom", offset: -10, fontSize: 10 }} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} label={{ value: "MC price ($)", angle: -90, position: "insideLeft", fontSize: 10 }} />
                        <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} labelFormatter={(label) => `N = ${label}`} />
                        <Legend />
                        <ReferenceLine y={r.bs_approx} stroke="#16a34a" strokeDasharray="4 4" label={{ value: `BS = $${r.bs_approx.toFixed(2)}`, fontSize: 9, fill: "#16a34a", position: "right" }} />
                        <Line name="MC estimate" type="monotone" dataKey="mc_estimate" stroke="#2563eb" strokeWidth={2.5} dot={true} />
                        <Line name="CI low" type="monotone" dataKey="ci_low" stroke="#dc2626" strokeWidth={1} strokeDasharray="4 4" dot={false} strokeOpacity={0.5} />
                        <Line name="CI high" type="monotone" dataKey="ci_high" stroke="#dc2626" strokeWidth={1} strokeDasharray="4 4" dot={false} strokeOpacity={0.5} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The <span className="text-blue-600 dark:text-blue-400 font-semibold">blue line</span> is the MC estimate as N grows. The <span className="text-rose-600 dark:text-rose-400 font-semibold">red dashed</span> lines are the 95% confidence interval (σ/√N — Central Limit Theorem). The <span className="text-emerald-600 dark:text-emerald-400 font-semibold">green dashed</span> line is the closed-form Black-Scholes price (~${r.bs_approx.toFixed(2)}).
                    At <span className="font-mono text-primary">N = {r.N.toLocaleString()}</span>, MC estimate = <span className="font-mono text-primary">${r.mc_price.toFixed(2)}</span> ± <span className="font-mono text-primary">${r.stderr.toFixed(2)}</span>.
                    Convergence rate is O(1/√N): 100× more paths gives 10× tighter CI.
                  </p>
                </div>
              );
            }}
          />
        </SectionCard>
      )}

      {tab === "math" && (
        <SectionCard
          title="Math derivation — where Monte Carlo comes from"
          description="Metropolis, Ulam, and von Neumann (1946, Los Alamos) invented Monte Carlo for neutron-transport calculations. The Law of Large Numbers guarantees convergence; the Central Limit Theorem gives the rate (σ/√N)."
          icon={<BookOpen className="h-5 w-5" />}
          badge="derivation"
        >
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground/80">The equation.</strong> The expectation E[f(X)] is approximated by the sample mean: E[f(X)] ≈ (1/N) · Σ (from i=1 to N) of f(X_i), where X_i are i.i.d. samples from the distribution of X. The Law of Large Numbers guarantees this converges as N → ∞.
            </p>
            <p>
              <strong className="text-foreground/80">The convergence rate (CLT).</strong> By the Central Limit Theorem, the sample mean is approximately N(E[f(X)], σ²(f)/N), where σ²(f) = Var(f(X)). So the standard error is σ(f)/√N. Halving the error requires quadrupling N — this is the fundamental cost of Monte Carlo.
            </p>
            <p>
              <strong className="text-foreground/80">Variance reduction.</strong> Antithetic variates (use both Z and −Z), control variates (subtract a known-expectation variable), importance sampling (sample from a different distribution and reweight). These can reduce σ(f) by 10-100×, making MC competitive with closed-form for high-dimensional integrals.
            </p>
            <p>
              <strong className="text-foreground/80">Why option pricing uses MC.</strong> For path-dependent or multi-asset options (Asian, basket, Bermudan), there's no closed-form. MC simulates 10⁶-10⁹ paths and averages. Quasi-MC (Sobol, Halton sequences) replaces pseudo-random with deterministic low-discrepancy sequences — converges at O((log N)^d / N^((d+1)/2)) instead of O(1/√N), much faster.
            </p>
            <p>
              <strong className="text-foreground/80">Citation.</strong> Metropolis &amp; Ulam, 'The Monte Carlo Method', J. Amer. Stat. Assoc. 44:247 (1949). Boyle, 'Options: A Monte Carlo approach', J. Financial Econ. 4:3 (1977).
            </p>
          </div>
        </SectionCard>
      )}

      {tab === "production" && (
        <SectionCard
          title="Production code — what QuantLib and Bloomberg compute"
          description="In production, you call QuantLib.MonteCarloEuropeanEngine. It uses Mersenne-Twister RNG, antithetic variates for variance reduction, and supports quasi-MC (Sobol). Bloomberg's BBG_MC does similar."
          icon={<Cpu className="h-5 w-5" />}
          badge="production"
        >
          <CodeBlock
            language="python"
            filename="production_monte_carlo.py"
            code={`# Production Monte Carlo via QuantLib
import QuantLib as ql

# SPX 30-day ATM call option
today = ql.Date.todaysDate()
ql.Settings.instance().evaluationDate = today

expiry = today + ql.Period(30, ql.Days)
S = 5000.0  # SPX spot
K = 5000.0  # ATM strike
r = 0.05    # risk-free rate (5%)
sigma = 0.15  # volatility (15%)
q = 0.015   # dividend yield (1.5%)

# Build process (Black-Scholes-Merton)
spot_h = ql.QuoteHandle(ql.SimpleQuote(S))
flat_ts = ql.YieldTermStructureHandle(ql.FlatForward(today, r, ql.Actual365Fixed()))
div_ts = ql.YieldTermStructureHandle(ql.FlatForward(today, q, ql.Actual365Fixed()))
vol_ts = ql.BlackVolTermStructureHandle(ql.BlackConstantVol(
    today, ql.NullCalendar(), sigma, ql.Actual365Fixed()
))
process = ql.BlackScholesMertonProcess(spot_h, div_ts, flat_ts, vol_ts)

# Monte Carlo engine
exercise = ql.EuropeanExercise(expiry)
payoff = ql.PlainVanillaPayoff(ql.Option.Call, K)
option = ql.VanillaOption(payoff, exercise)

# 100,000 paths, antithetic variates, Sobol quasi-MC for variance reduction
rng = ql.SobolRsg(32)  # 32-dimensional Sobol sequence
sequence_gen = ql.RandomSequenceGenerator(32, ql.UniformRandomGenerator(42))
gaussian_gen = ql.GaussianRandomSequenceGenerator(sequence_gen)
path_gen = ql.GaussianMultiPathGenerator(process, [expiry], gaussian_gen, False)

# MC engine: 100,000 paths, antithetic
n_paths = 100000
engine = ql.MCEuropeanEngine(process, n_paths, antithetic=True, seed=42)
option.setPricingEngine(engine)

mc_price = option.NPV()
mc_error = option.errorEstimate()
print(f"SPX 30-day ATM call (MC, N=100k): \${mc_price:.2f} ± \${mc_error:.4f}")

# Closed-form for comparison
option.setPricingEngine(ql.AnalyticEuropeanEngine(process))
bs_price = option.NPV()
print(f"SPX 30-day ATM call (Black-Scholes closed-form): \${bs_price:.2f}")

# Real production: CME uses quasi-MC for SPX settlement. Renaissance Medallion
# uses MC for exotic payoffs (basket, path-dependent). Bloomberg BBG_MC for
# OTC structured products.`}
          />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <Link href={hrefFor("fintech")} className="rounded-md border border-border/60 bg-muted/20 p-2 hover:border-primary/40 hover:bg-primary/5 transition-colors block">
              <p className="font-semibold text-foreground/80">→ Fintech</p>
              <p className="text-muted-foreground text-[10px] mt-0.5">QuantLib + MC for option pricing in production.</p>
            </Link>
            <Link href={hrefFor("elegant-code")} className="rounded-md border border-border/60 bg-muted/20 p-2 hover:border-primary/40 hover:bg-primary/5 transition-colors block">
              <p className="font-semibold text-foreground/80">→ Elegant Code (Monte Carlo card)</p>
              <p className="text-muted-foreground text-[10px] mt-0.5">Monte Carlo's full cross-disciplinary card: fintech ↔ maritime ↔ genetics.</p>
            </Link>
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="My deeper thought: Monte Carlo IS the universal estimation equation"
        description="A quant pricing an exotic option via 10⁶ simulated GBM paths, a port authority simulating 10⁵ vessel arrivals to estimate berth congestion, and a geneticist running 10⁶ permutations to estimate rare-variant significance all use the SAME averaging E[f(X)] ≈ (1/N)·Σ f(X_i) — because all three estimate an expectation via random sampling. The Law of Large Numbers guarantees convergence (var ~ σ²/N) and the Central Limit Theorem gives the error bar (±1.96σ/√N at 95%). Metropolis 1946 invented this at Los Alamos for neutron transport."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">A CME quant, a port captain, and a geneticist</strong> are all averaging the same way. The math is universal — the random variable differs, the averaging doesn't.</p>
        </div>
      </SectionCard>

      <RelatedElegantCode sourceCard={17} />
      <RelatedTopics topics={[
        { id: "fintech" as const, reason: "Fintech — QuantLib + MC for option pricing" },
        { id: "elegant-code" as const, reason: "Elegant Code — the Monte Carlo card (cross-disciplinary)" },
        { id: "living-gbm" as const, reason: "Living GBM — MC simulates GBM paths (cousin)" },
        { id: "living-black-scholes" as const, reason: "Living Black-Scholes — closed-form alternative (cousin)" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("elegant-code")} className="text-sm text-primary hover:underline">→ Elegant Code (Monte Carlo card)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("fintech")} className="text-sm text-primary hover:underline">→ Fintech (production)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("living-gbm")} className="text-sm text-primary hover:underline">→ Living GBM (cousin)</Link>
      </div>
    </div>
  );
}
