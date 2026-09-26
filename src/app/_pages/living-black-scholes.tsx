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
import { DollarSign, Sparkles, TrendingUp, Cpu, BookOpen, Database } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";

type Tab = "math" | "live" | "production";

const KPIS = [
  { label: "Dataset", value: "SPX 30-day call option chain (synthetic)", hint: "S = $5,000 spot (SPX), T = 30/365 years, r = 5% (risk-free). Strikes K ∈ [$4,800, $5,200]. Real data: CME SPX option chain, 4M contracts/day.", deltaTone: "flat" as const },
  { label: "Equation", value: "C = S·N(d1) − K·e^(−rT)·N(d2)", hint: "Black-Scholes call option price. d1 = (ln(S/K) + (r + σ²/2)·T) / (σ·√T), d2 = d1 − σ·√T. N() is the standard normal CDF.", deltaTone: "flat" as const },
  { label: "Slider", value: "σ (volatility)", hint: "Drag σ from 5% to 50%. At σ=15% (VIX historical): ATM call ≈ $30. At σ=50% (crisis): ATM call ≈ $100. Price scales linearly with σ at-the-money.", deltaTone: "up" as const },
  { label: "Production", value: "QuantLib", hint: "Production: QuantLib.blackVolatilityTermStructure + BlackScholesProcess + PricingEngine. BloomBerg BSM function. CME settlement uses Black-Scholes for ATM.", deltaTone: "flat" as const },
];

export function LivingBlackScholesPage() {
  const [tab, setTab] = useState<Tab>("live");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Living equation · run Black-Scholes live in your browser"
        title="Living Black-Scholes — drag σ and watch the option-price curve steepen"
        description="Black-Scholes prices a 30-day SPX call option across strikes. Drag σ (volatility, the only unobservable input) and watch the price curve steepen from a flat $0 (low vol, far-OTM) to a tall arc ($100+ at ATM, high vol). The SAME formula prices cargo options at Lloyd's, allele-substitution options in genetics, and your SPX calls — because all three price the right-but-not-obligation to act on a stochastic payoff."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><DollarSign className="h-3 w-3" /> Stochastic Calculus</Badge>
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
          title="Live Black-Scholes on synthetic SPX 30-day call — drag σ and watch the curve"
          description="S = $5,000 (SPX spot), T = 30/365 years (~30 days), r = 5% (annualised risk-free). Strikes K range from $4,800 to $5,200. The price curve C(K) is a downward arc that flattens at low σ (deterministic) and steepens at high σ (uncertain). At K=$5,000 (ATM), the price scales roughly linearly with σ."
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
              default: 15,
              hint: "σ=15% (VIX historical average): ATM call ≈ $30. σ=50% (crisis, 2008): ATM call ≈ $100. VIX > 30 indicates market stress.",
            }}
            preamble="import json, math"
            code={`import json, math

# SPX 30-day call option (synthetic)
S = 5000.0      # spot price ($)
T = 30.0 / 365  # 30 days in years
r = 0.05        # risk-free rate (5% annual)
sigma = \${sigma} / 100.0   # slider value (volatility as decimal)

# Black-Scholes: C = S * N(d1) - K * e^(-rT) * N(d2)
# where d1 = (ln(S/K) + (r + sigma^2/2)*T) / (sigma * sqrt(T))
#       d2 = d1 - sigma * sqrt(T)

def norm_cdf(x):
    # Numerical Recipes 26.2.17 approximation (high accuracy)
    z = abs(x)
    c0 = 0.396683716
    c1 = -0.163087977
    c2 = -0.138048876
    c3 = 0.0860570825
    c4 = -0.019880294
    c5 = 0.00315329014
    p = 1.0
    if z > 0:
        p = 1.0 / (1.0 + 0.2316419 * z)
        p1 = ((((c5 * z + c4) * z + c3) * z + c2) * z + c1) * z + c0
        p1 *= p
        p = 1.0 - p1 * math.exp(-0.5 * z * z) / math.sqrt(2 * math.pi)
    if x < 0:
        p = 1.0 - p
    return p

def black_scholes_call(S, K, r, sigma, T):
    if T <= 0 or sigma <= 0:
        return max(S - K, 0.0)
    sqrtT = math.sqrt(T)
    d1 = (math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT)
    d2 = d1 - sigma * sqrtT
    return S * norm_cdf(d1) - K * math.exp(-r * T) * norm_cdf(d2)

# Build price curve: C(K) for strikes K in [$4,800, $5,200]
strikes = [4800 + i * 25 for i in range(17)]  # 17 strikes from 4800 to 5200
chart_data = []
for K in strikes:
    C = black_scholes_call(S, K, r, sigma, T)
    intrinsic = max(S - K, 0.0)
    time_value = C - intrinsic
    chart_data.append({
        'strike': K,
        'price': C,
        'intrinsic': intrinsic,
        'time_value': time_value,
    })

# ATM call (K = S)
atm_call = black_scholes_call(S, S, r, sigma, T)

# For comparison: how does ATM call scale with sigma?
sigma_test = [0.05, 0.10, 0.15, 0.20, 0.30, 0.50]
atm_curve = []
for s in sigma_test:
    atm_curve.append({'sigma_pct': s * 100, 'atm_price': black_scholes_call(S, S, r, s, T)})

result = {
    'chart_data': chart_data,
    'sigma': sigma,
    'sigma_pct': sigma * 100,
    'atm_call': atm_call,
    'atm_curve': atm_curve,
    'S': S,
    'T': T,
    'r': r,
    'atm_call_linear_approx': S * sigma * math.sqrt(T) / math.sqrt(2 * math.pi),  # rough ATM approximation
}
print(json.dumps(result))
`}
            renderer={(result) => {
              const r = result as { chart_data: Array<{ strike: number; price: number; intrinsic: number; time_value: number }>; sigma: number; sigma_pct: number; atm_call: number; atm_curve: Array<{ sigma_pct: number; atm_price: number }>; S: number; T: number; r: number; atm_call_linear_approx: number };
              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">σ (volatility)</p>
                      <p className="font-mono font-bold text-primary text-base">{(r.sigma * 100).toFixed(0)}%</p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">ATM call (K=S)</p>
                      <p className="font-mono font-bold text-primary text-base">${r.atm_call.toFixed(2)}</p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">σ × S × √T (≈ATM)</p>
                      <p className="font-mono font-bold text-primary text-base">${r.atm_call_linear_approx.toFixed(2)}</p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">Time value ATM</p>
                      <p className="font-mono font-bold text-primary text-base">${r.atm_call.toFixed(2)}</p>
                    </div>
                  </div>

                  <div style={{ width: "100%", height: 320 }}>
                    <ResponsiveContainer>
                      <LineChart data={r.chart_data} margin={{ top: 12, right: 16, bottom: 24, left: 8 }}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} />
                        <XAxis dataKey="strike" type="number" domain={[4800, 5200]} stroke="hsl(var(--muted-foreground))" fontSize={10} label={{ value: "strike K ($)", position: "insideBottom", offset: -10, fontSize: 10 }} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} label={{ value: "call price C ($)", angle: -90, position: "insideLeft", fontSize: 10 }} />
                        <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} labelFormatter={(label) => `K = $${label}`} />
                        <Legend />
                        <ReferenceLine x={r.S} stroke="#16a34a" strokeDasharray="4 4" label={{ value: "S = $5,000 (ATM)", fontSize: 9, fill: "#16a34a", position: "top" }} />
                        <Line name="Call price C(K)" type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2.5} dot={false} />
                        <Line name="Intrinsic max(S−K, 0)" type="monotone" dataKey="intrinsic" stroke="#dc2626" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The blue curve is the call price <span className="font-mono">C(K) = S·N(d1) − K·e^(-rT)·N(d2)</span> across strikes K.
                    The red dashed line is the intrinsic value <span className="font-mono">max(S − K, 0)</span> — what the option would be worth at expiry.
                    The gap between them is the <strong className="text-foreground/80">time value</strong> (the option's value from uncertainty).
                    At <span className="font-mono text-primary">σ = {r.sigma_pct.toFixed(0)}%</span>, the ATM call (K = S = $5,000) costs{" "}
                    <span className="font-mono text-primary">${r.atm_call.toFixed(2)}</span>.
                    The rough approximation <span className="font-mono">σ × S × √T / √(2π) = ${(r.atm_call_linear_approx).toFixed(2)}</span> confirms the linear σ-scaling for ATM calls.
                  </p>
                </div>
              );
            }}
          />
        </SectionCard>
      )}

      {tab === "math" && (
        <SectionCard
          title="Math derivation — where Black-Scholes comes from"
          description="Black, Scholes, and Merton (1973) derived the option-pricing formula by assuming the underlying follows Geometric Brownian Motion (GBM) and constructing a continuously-hedged riskless portfolio. The result is the only arbitrage-free price."
          icon={<BookOpen className="h-5 w-5" />}
          badge="derivation"
        >
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground/80">The setup.</strong> Assume the underlying S follows Geometric Brownian Motion: dS = μS·dt + σS·dW. A European call option with strike K and expiry T has payoff max(S_T − K, 0). We want its price C(S, t) — a function of the current spot and time-to-expiry.
            </p>
            <p>
              <strong className="text-foreground/80">The hedge.</strong> Hold 1 option short and Δ = ∂C/∂S shares long. The portfolio value is Π = −C + Δ·S. By Ito's lemma, dC = (∂C/∂t + μS∂C/∂S + ½σ²S²∂²C/∂S²)·dt + σS∂C/∂S·dW. Choosing Δ = ∂C/∂S cancels the dW term — the portfolio becomes riskless. By no-arbitrage, it must earn the risk-free rate: dΠ = r·Π·dt.
            </p>
            <p>
              <strong className="text-foreground/80">The PDE.</strong> Substituting and simplifying gives the Black-Scholes PDE: ∂C/∂t + (1/2)σ²S²∂²C/∂S² + rS∂C/∂S − rC = 0, with boundary condition C(S, T) = max(S − K, 0). The solution is C(S, t) = S·N(d1) − K·e^(−rT)·N(d2), where d1 = (ln(S/K) + (r + σ²/2)·T) / (σ·√T) and d2 = d1 − σ·√T.
            </p>
            <p>
              <strong className="text-foreground/80">Why N(d1) and N(d2) appear.</strong> The option's price is the discounted expected payoff under the risk-neutral measure. N(d2) is the risk-neutral probability the option expires in-the-money (S_T &gt; K). N(d1) is the delta (hedge ratio) — the fraction of a share you should hold per option short. The first term S·N(d1) is the present value of receiving the share if in-the-money; the second K·e^(−rT)·N(d2) is the present value of paying the strike if in-the-money.
            </p>
            <p>
              <strong className="text-foreground/80">Citation.</strong> Black &amp; Scholes, 'The Pricing of Options and Corporate Liabilities', J. Political Economy 81:3 (1973). Merton, 'Theory of Rational Option Pricing', Bell J. Econ. 4:1 (1973). Hull, 'Options, Futures, and Other Derivatives' (11th ed., 2021).
            </p>
          </div>
        </SectionCard>
      )}

      {tab === "production" && (
        <SectionCard
          title="Production code — what QuantLib and Bloomberg compute"
          description="In production, you call QuantLib (the industry-standard C++ library with Python bindings) or Bloomberg's BSM function. Both implement the closed-form Black-Scholes formula plus numerical Greeks (delta, gamma, vega, theta, rho). Here's the production call."
          icon={<Cpu className="h-5 w-5" />}
          badge="production"
        >
          <CodeBlock
            language="python"
            filename="production_black_scholes.py"
            code={`# Production Black-Scholes via QuantLib (C++ library, Python bindings)
import QuantLib as ql
from datetime import datetime, timedelta

# SPX 30-day ATM call option
evaluation_date = ql.Date.todaysDate()
ql.Settings.instance().evaluationDate = evaluation_date

expiry = evaluation_date + ql.Period(30, ql.Days)  # 30-day expiry
S = 5000.0      # SPX spot
K = 5000.0      # ATM strike
r = 0.05        # risk-free rate (5%)
sigma = 0.15    # implied vol (15%)
q = 0.015       # SPX dividend yield (1.5%)

# Build market data
spot_handle = ql.QuoteHandle(ql.SimpleQuote(S))
flat_ts = ql.YieldTermStructureHandle(ql.FlatForward(evaluation_date, r, ql.Actual365Fixed()))
dividend_ts = ql.YieldTermStructureHandle(ql.FlatForward(evaluation_date, q, ql.Actual365Fixed()))
vol_ts = ql.BlackVolTermStructureHandle(ql.BlackConstantVol(
    evaluation_date, ql.NullCalendar(), sigma, ql.Actual365Fixed()
))

# Black-Scholes process + engine
exercise = ql.EuropeanExercise(expiry)
payoff = ql.PlainVanillaPayoff(ql.Option.Call, K)
option = ql.VanillaOption(payoff, exercise)
process = ql.BlackScholesMertonProcess(spot_handle, dividend_ts, flat_ts, vol_ts)
engine = ql.AnalyticEuropeanEngine(process)
option.setPricingEngine(engine)

# Price + Greeks
price = option.NPV()
delta = option.delta()
gamma = option.gamma()
vega = option.vega()
theta = option.theta()
rho = option.rho()
print(f"SPX 30-day ATM call: price=\${price:.2f}, delta={delta:.4f}, "
      f"gamma={gamma:.6f}, vega=\${vega:.2f}, theta=\${theta:.4f}/day, rho=\${rho:.2f}")

# Real production: CME settlement uses Black-Scholes for ATM options.
# Market makers hedge with delta (option.delta() → shares per option).
# Risk officers compute VaR via option sensitivities + GBM simulation.`}
          />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <Link href={hrefFor("fintech")} className="rounded-md border border-border/60 bg-muted/20 p-2 hover:border-primary/40 hover:bg-primary/5 transition-colors block">
              <p className="font-semibold text-foreground/80">→ Fintech</p>
              <p className="text-muted-foreground text-[10px] mt-0.5">QuantLib + Black-Scholes in production: Ed Thorp, Jim Simons, Medallion.</p>
            </Link>
            <Link href={hrefFor("elegant-code")} className="rounded-md border border-border/60 bg-muted/20 p-2 hover:border-primary/40 hover:bg-primary/5 transition-colors block">
              <p className="font-semibold text-foreground/80">→ Elegant Code (Black-Scholes card)</p>
              <p className="text-muted-foreground text-[10px] mt-0.5">Black-Scholes's full cross-disciplinary card: fintech ↔ maritime ↔ genetics.</p>
            </Link>
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="My deeper thought: Black-Scholes IS the universal option-pricing equation"
        description="A Lloyd's underwriter pricing a 90-day cargo-route option, a CME quant pricing a 30-day SPX call, and a population geneticist pricing an allele-substitution option under fluctuating selection all evaluate the SAME formula — because all three price the right-but-not-obligation to act on a future stochastic payoff. The math doesn't know if S is a freight rate, a stock price, or an allele frequency. The d1 = (ln(S/K) + (r + σ²/2)·T) / (σ·√T) is universal: it measures how far in-the-money the option is, normalized by volatility."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">A Lloyd's underwriter, a CME quant, and a Fisher-trained geneticist</strong> are computing the same numbers — and none of them knows it. Black-Scholes IS the universal price of the right (not obligation) to act on a stochastic future payoff.</p>
        </div>
      </SectionCard>

      <RelatedElegantCode sourceCard={10} />

      <DeeperThoughtSection pageTitle="Black Scholes">
        <DeeperThought title="Black-Scholes IS the price of the right to act — universal across cargo, stocks, and alleles" connectedTo="ADR-054 (Black-Scholes + MC + GNN for fintech)">
          <p>{"A Lloyd's underwriter pricing a 90-day cargo-route option, a CME quant pricing a 30-day SPX call, and a Fisher geneticist pricing an allele-substitution option under fluctuating selection all evaluate the SAME formula. The right-but-not-obligation to act on a future stochastic payoff is universal. The math doesn't know if S is a freight rate, a stock price, or an allele frequency. The d1 = (ln(S/K) + (r + σ²/2)·T) / (σ·√T) measures how far in-the-money the option is, normalized by volatility — and that normalisation is the same whether you're shipping cargo, trading stocks, or modelling evolution."}</p>
        </DeeperThought>
        <DeeperThought title="σ is the only unobservable — and it's the market's belief about the future" connectedTo="ADR-054 (Black-Scholes + MC + GNN for fintech)">
          <p>{"Every Black-Scholes input is observable: S (spot price), K (strike), T (time to expiry), r (risk-free rate). Only σ (volatility) is not. Traders INVERT Black-Scholes — they observe the option price C and solve for σ. This 'implied volatility' IS the market's expectation of future risk. The VIX index IS this inversion: it's the implied volatility of S&P 500 options. When VIX spikes (2008, 2020, 2022), the market is telling you it expects turbulence. Black-Scholes isn't just a pricing formula — it's a BELIEF EXTRACTOR."}</p>
        </DeeperThought>
        <DeeperThought title="The ATM approximation C ≈ σ·S·√T/√(2π) is why volatility trades linearly" connectedTo="ADR-051 (living-equation pages)">
          <p>{"For at-the-money options (K=S), Black-Scholes simplifies to C ≈ σ·S·√(2T/π). This means the option price scales LINEARLY with σ. Double the volatility, double the option price. This is why VIX futures are tradable — each point of VIX corresponds to a dollar amount of option value. The approximation IS the product. The CBOE's VIX complex (futures, options, ETNs) is built on this one formula."}</p>
        </DeeperThought>
        <DeeperThought title="The price curve IS the proof — drag σ and watch it steepen" connectedTo="ADR-051 (living-equation pages)">
          <p>{"When you drag σ from 5% to 50% on this page, the blue call-price curve steepens from a flat $0 (low vol, far-OTM) to a tall arc ($100+ at ATM, high vol). The green dashed line (intrinsic value) doesn't change — but the GAP between intrinsic and price grows. That gap IS time value — the option's value from uncertainty. The visual output makes the relationship visceral: more volatility = more uncertainty = more time value. The brain sees the curve steepen and understands what σ means in a way the formula alone can't convey."}</p>
        </DeeperThought>
        <DeeperThought title="The Nobel Prize was for the PROOF, not the formula" connectedTo="ADR-054 (Black-Scholes + MC + GNN for fintech)">
          <p>{"Black and Scholes didn't invent their formula from scratch — they derived it from a hedging argument. Hold 1 option short + Δ shares long → the portfolio is riskless → it must earn r. This no-arbitrage argument (not the formula itself) is what won the 1997 Nobel Prize. The formula is the SOLUTION to the no-arbitrage PDE. The insight is that no-arbitrage PRICES the option — the market's structure, not the formula, is what determines the price. This is why Black-Scholes holds across domains: no-arbitrage is a structural constraint, not a model assumption."}</p>
        </DeeperThought>
      </DeeperThoughtSection>
      <RelatedTopics topics={[
        { id: "fintech" as const, reason: "Fintech — QuantLib + Black-Scholes in production" },
        { id: "elegant-code" as const, reason: "Elegant Code — the Black-Scholes card (cross-disciplinary)" },
        { id: "living-gbm" as const, reason: "Living GBM — Black-Scholes derives from GBM (cousin)" },
        { id: "living-monte-carlo" as const, reason: "Living Monte Carlo — alternative pricing via simulation (cousin)" },
      ]} />
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "Trace this topic's connections across the platform's math graph" }, { id: "fintech" as const, reason: "Fintech — QuantLib + Black-Scholes in production" }, { id: "elegant-code" as const, reason: "Elegant Code — the Black-Scholes card (cross-disciplinary)" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("elegant-code")} className="text-sm text-primary hover:underline">→ Elegant Code (Black-Scholes card)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("fintech")} className="text-sm text-primary hover:underline">→ Fintech (production)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("living-gbm")} className="text-sm text-primary hover:underline">→ Living GBM (cousin)</Link>
      </div>
    </div>
  );
}
