"use client";

import Link from "next/link";
import { SectionCard, PageHeader } from "../_components/section-card";
import { RelatedTopics } from "../_components/related-topics";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Sparkles, Atom, Brain, Activity, Database, Cpu, Zap, Globe } from "lucide-react";

const KPIS = [
  { label: "Technology turnover", value: "10-20 years", hint: "Specific tools (Snowflake, Kafka, PyTorch) will be replaced. The math (SVD, Attention, Poisson) won't.", deltaTone: "flat" as const },
  { label: "Math longevity", value: "100-150 years", hint: "SVD (1873), Bayes (1763), FFT (Gauss 1805). The equations have already survived a century. They'll survive the next two.", deltaTone: "up" as const },
  { label: "Platform design", value: "Fold pattern", hint: "The fold architecture lets us update tools without rewriting pages. New sections can be added without cluttering existing views.", deltaTone: "flat" as const },
  { label: "Growth trajectory", value: "Organic graph", hint: "20 cards today → 50+ in a decade. Each new card creates new cousin edges. The graph gets denser, not bigger.", deltaTone: "up" as const },
];

// Technology projections: current tool → what replaces it → the math that stays.
const PROJECTIONS = [
  { current: "Snowflake", future: "Quantum-optimised columnar store (Q-CS)", mathStays: "SQL + relational algebra (Codd 1970)", year: "~2035", accent: "oklch(0.65 0.16 240)" },
  { current: "Apache Kafka", future: "Photon-streaming (light-speed in-memory event mesh)", mathStays: "Poisson process + queueing theory", year: "~2035", accent: "oklch(0.65 0.16 0)" },
  { current: "PyTorch", future: "Neuro-symbolic tensor compiler (NSTC)", mathStays: "Gradient descent + backpropagation (chain rule)", year: "~2033", accent: "oklch(0.65 0.16 280)" },
  { current: "NumPy + Pyodide", future: "WebGPU-native array operations (WGPU-AO)", mathStays: "Linear algebra (SVD, FFT, matrix multiply)", year: "~2030", accent: "oklch(0.65 0.16 30)" },
  { current: "1000-Genomes Project", future: "100M-Genomes Project (whole-genome, all populations)", mathStays: "SVD + PCA + Poisson coverage model", year: "~2035", accent: "oklch(0.65 0.16 120)" },
  { current: "AlphaFold2 (Jumper 2021)", future: "AlphaFold-X (full atomic dynamics, quantum-level)", mathStays: "Attention + diffusion + SE(3)-equivariance", year: "~2030", accent: "oklch(0.65 0.16 200)" },
  { current: "MarineTraffic AIS", future: "Satellite quantum-tracking (SQT) — real-time, global, sub-meter", mathStays: "Kalman filter + Haversine + Markov port-states", year: "~2035", accent: "oklch(0.65 0.16 60)" },
  { current: "Black-Scholes + QuantLib", future: "Quantum option pricing (QOP) — amplitude estimation", mathStays: "GBM + risk-neutral valuation + no-arbitrage", year: "~2038", accent: "oklch(0.65 0.16 300)" },
  { current: "D3.js force graph", future: "Holographic spatial graph (HSG) — 3D AR navigation", mathStays: "Force-directed layout + eigenvector centrality", year: "~2033", accent: "oklch(0.65 0.16 160)" },
  { current: "Pyodide (Python in WASM)", future: "Native browser Python (WebPython) — no WASM layer", mathStays: "Python syntax (irrelevant to the math)", year: "~2030", accent: "oklch(0.65 0.16 90)" },
];

export function FuturePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="The platform's most ambitious deeper thought — a page about its own future"
        title="Future Evolution — where this platform goes in 10-20 years"
        description="In a decade, the specific tools on this platform will be unrecognisable. Snowflake will be a historical curiosity. Kafka will have been replaced. PyTorch will be a legacy framework. But SVD will still decompose matrices. Attention will still measure correlation. Poisson will still govern rare events. Bayes will still update beliefs. The math survives technology turnover — and this platform is designed for exactly that. The fold pattern lets us update the tools without rewriting the pages. The equations are the anchor; the tools are the amplifier."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><TrendingUp className="h-3 w-3" /> 10-20 year horizon</Badge>
            <Badge variant="outline" className="gap-1.5"><Sparkles className="h-3 w-3" /> Math survives</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-md border border-border/60 bg-muted/30 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.label}</p>
            <p className="font-mono text-sm font-bold text-primary mt-0.5">{k.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{k.hint}</p>
          </div>
        ))}
      </div>

      {/* Technology projections table */}
      <SectionCard
        title="Technology projections — current tools → future replacements → the math that stays"
        description="Each row projects a current platform technology forward 10-20 years. The 'current tool' column is what we use today. The 'future replacement' is a speculative (but plausible) successor. The 'math that stays' column is the equation that won't change — the anchor that makes this platform survive technology turnover."
        icon={<Cpu className="h-5 w-5" />}
        badge="10 projections"
      >
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-left border-b border-border/60">
                <th className="py-2 px-2 font-semibold text-foreground/80">Current tool</th>
                <th className="py-2 px-2 font-semibold text-foreground/80">Future replacement (speculative)</th>
                <th className="py-2 px-2 font-semibold text-foreground/80">Math that stays</th>
                <th className="py-2 px-2 font-semibold text-foreground/80">ETA</th>
              </tr>
            </thead>
            <tbody>
              {PROJECTIONS.map((p, i) => (
                <tr key={i} className="border-b border-border/40 align-top">
                  <td className="py-2 px-2">
                    <span className="font-mono font-semibold" style={{ color: p.accent }}>{p.current}</span>
                  </td>
                  <td className="py-2 px-2 text-muted-foreground">{p.future}</td>
                  <td className="py-2 px-2">
                    <span className="font-mono text-primary">{p.mathStays}</span>
                  </td>
                  <td className="py-2 px-2 text-muted-foreground font-mono">{p.year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Technology evolution timeline — 1800-2050 */}
      <SectionCard
        title="Technology evolution timeline — equations (1800s-1960s) vs tools (2000s-2030s) vs future (2030-2050)"
        description="A visual timeline showing when each equation was invented (top row, green — these survive) vs when each tool was created (middle row, blue — these turnover) vs when each tool will be replaced (bottom row, orange — projected). The math persists; the tools don't. The timeline makes this visceral — the equations span 150+ years while the tools span 10-20."
        icon={<Activity className="h-5 w-5" />}
        badge="1800-2050"
      >
        <div className="space-y-4">
          {/* Equations row — survives */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold mb-2 flex items-center gap-1">
              <Atom className="h-3 w-3" /> Equations (invented 1800s-1960s — SURVIVE)
            </p>
            <div className="relative h-20 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2 overflow-x-auto">
              <div className="flex items-end gap-1 min-w-max">
                {[
                  { name: "Haversine", year: 1805, color: "#16a34a" },
                  { name: "Bayes", year: 1763, color: "#16a34a" },
                  { name: "SVD", year: 1873, color: "#16a34a" },
                  { name: "Boltzmann S", year: 1877, color: "#16a34a" },
                  { name: "Euler method", year: 1768, color: "#16a34a" },
                  { name: "GBM", year: 1900, color: "#16a34a" },
                  { name: "Markov", year: 1906, color: "#16a34a" },
                  { name: "Kelly", year: 1956, color: "#16a34a" },
                  { name: "Kalman", year: 1960, color: "#16a34a" },
                  { name: "FFT", year: 1965, color: "#16a34a" },
                  { name: "MC method", year: 1946, color: "#16a34a" },
                  { name: "Shannon H", year: 1948, color: "#16a34a" },
                  { name: "B-S", year: 1973, color: "#16a34a" },
                  { name: "Verlet", year: 1967, color: "#16a34a" },
                  { name: "PageRank", year: 1998, color: "#16a34a" },
                  { name: "Lloyd's", year: 1957, color: "#16a34a" },
                  { name: "Navier-Stokes", year: 1822, color: "#16a34a" },
                  { name: "Gradient Descent", year: 1847, color: "#16a34a" },
                  { name: "VaR", year: 1994, color: "#16a34a" },
                  { name: "Attention", year: 2017, color: "#16a34a" },
                ].map(eq => (
                  <div key={eq.name} className="flex flex-col items-center shrink-0" style={{ minWidth: 45 }}>
                    <span className="text-[8px] text-muted-foreground font-mono">{eq.year}</span>
                    <div className="w-1 h-8 rounded-full my-0.5" style={{ backgroundColor: eq.color }} />
                    <span className="text-[8px] text-foreground/80 font-semibold text-center leading-tight">{eq.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground italic mt-1">Span: 1763-2017 (254 years). All still in active use. All will still be used in 2050.</p>
          </div>

          {/* Tools row — turnover */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 font-semibold mb-2 flex items-center gap-1">
              <Cpu className="h-3 w-3" /> Tools (created 2000s-2020s — TURNOVER)
            </p>
            <div className="relative h-20 rounded-md border border-blue-500/30 bg-blue-500/5 p-2 overflow-x-auto">
              <div className="flex items-end gap-1 min-w-max">
                {[
                  { name: "NumPy", year: 2005, color: "#2563eb" },
                  { name: "SciPy", year: 2001, color: "#2563eb" },
                  { name: "PyTorch", year: 2016, color: "#2563eb" },
                  { name: "QuantLib", year: 2003, color: "#2563eb" },
                  { name: "filterpy", year: 2015, color: "#2563eb" },
                  { name: "geopy", year: 2011, color: "#2563eb" },
                  { name: "D3.js", year: 2011, color: "#2563eb" },
                  { name: "Pyodide", year: 2018, color: "#2563eb" },
                  { name: "AlphaFold2", year: 2021, color: "#2563eb" },
                  { name: "ESM-2", year: 2023, color: "#2563eb" },
                ].map(tool => (
                  <div key={tool.name} className="flex flex-col items-center shrink-0" style={{ minWidth: 50 }}>
                    <span className="text-[8px] text-muted-foreground font-mono">{tool.year}</span>
                    <div className="w-1 h-6 rounded-full my-0.5" style={{ backgroundColor: tool.color }} />
                    <span className="text-[8px] text-foreground/80 font-semibold text-center leading-tight">{tool.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground italic mt-1">Span: 2001-2023 (22 years). Most will be replaced by 2030-2040. The math they implement won't change.</p>
          </div>

          {/* Future projections row */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-orange-600 dark:text-orange-400 font-semibold mb-2 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Future replacements (projected 2030-2050)
            </p>
            <div className="relative h-20 rounded-md border border-orange-500/30 bg-orange-500/5 p-2 overflow-x-auto">
              <div className="flex items-end gap-1 min-w-max">
                {PROJECTIONS.map(p => (
                  <div key={p.current} className="flex flex-col items-center shrink-0" style={{ minWidth: 55 }}>
                    <span className="text-[8px] text-muted-foreground font-mono">{p.year}</span>
                    <div className="w-1 h-6 rounded-full my-0.5" style={{ backgroundColor: p.accent }} />
                    <span className="text-[8px] text-foreground/80 font-semibold text-center leading-tight line-clamp-2">{p.current} → {p.future.split("(")[0].trim()}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground italic mt-1">Span: ~2030-2038. Each replacement implements the SAME math — just faster/different.</p>
          </div>

          {/* Summary insight */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground/80">The equations span 254 years (1763-2017).</strong> The tools span 22 years (2001-2023).
              The replacements are projected within 15 years (~2030-2038). The ratio is visceral: the math outlasts the tools
              by <strong className="text-primary">10× or more</strong>. That's why this platform invests in the math, not the tools.
              When the tools are replaced, the pages' fold sections are updated — but the equations stay.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Deeper thoughts about the future */}
      <DeeperThoughtSection pageTitle="Future Evolution">
        <DeeperThought title="The math is the anchor; the tools are the amplifier" connectedTo="ADR-001 (platform architecture)">
          <p>{"SVD was invented in 1873. It runs on NumPy today. It will run on whatever replaces NumPy tomorrow — a WebGPU-native array library, a quantum linear algebra solver, or something we can't imagine yet. The equation A = UΣV^T doesn't change when the implementation changes. The platform invests in the MATH, not the tools, because the math is the part that survives. Every page on this platform has a 'Production patterns' fold section that lists the current tools — when a tool is replaced, we update that fold. The equation stays. The fold evolves. That's the design."}</p>
        </DeeperThought>
        <DeeperThought title="The fold pattern IS the platform's immune system against obsolescence" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"When Snowflake is replaced by a quantum-optimised columnar store, we don't rewrite the /snowflake page — we update its 'Production patterns' fold. When Kafka is replaced by a photon-streaming event mesh, we update /kafka's fold. The basic content (the architecture, the patterns, the deeper thoughts) stays. The fold is the UPDATE LAYER — the part of the page that changes when technology changes. Without the fold pattern, every tool replacement would require a full page rewrite. With it, the page survives because the fold absorbs the change. Progressive disclosure isn't just UX — it's obsolescence insurance."}</p>
        </DeeperThought>
        <DeeperThought title="In 2040, a reader will still find SVD useful — even if NumPy is gone" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"A reader in 2040 will arrive at /living-svd and see a Pyodide demo running on whatever Python-in-browser technology exists then (maybe WebPython, maybe something else). The synthetic 1000-Genomes data will be replaced by synthetic 100M-Genomes data. The chart will be rendered by whatever visualization library exists then (maybe holographic AR, maybe neural implants). But the SVD equation will be the same. The 'X IS Y' insight will be the same. The reader will still see Out-of-Africa emerge from a genotype matrix. The math doesn't care about the century."}</p>
        </DeeperThought>
        <DeeperThought title="The graph gets denser — 20 cards today, 50+ in a decade" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"The platform's 20 elegant-code cards will grow. New equations will be discovered (or rediscovered): differential privacy primitives, quantum error correction codes, topological data analysis, neural ODEs, diffusion models for generative chemistry. Each new card creates new cousin edges in the graph — new connections to existing cards via shared mathematics. The /connections D3 graph will get denser, not bigger. The fold sections will accommodate new content without cluttering existing views. The platform is designed for organic growth — it's a graph, not a tree, and graphs get denser over time."}</p>
        </DeeperThought>
        <DeeperThought title="The deeper thoughts are the platform's META — they comment on the platform's own relationship to time" connectedTo="ADR-022 (pgvector for variant embeddings)">
          <p>{"Every page now has 5+ 'My deeper thought' sections. Some are specific (hand-crafted on the 10 living-equation pages + home). Some are generic (on 113 other pages). All share a common thread: 'the technology will change; the math won't.' This META-commentary is the platform's immune system. When a reader encounters a page about a deprecated tool, the deeper thought reminds them (and the maintainer) that the page's VALUE is the math underneath, not the tool on top. The thoughts give permission to update the page without feeling like the old version was wasted. They're the platform's way of saying: 'I know I'll be obsolete. That's OK. The math underneath me won't be.'"}</p>
        </DeeperThought>
        <DeeperThought title="This /future page IS the platform's most ambitious thought" connectedTo="ADR-001 (platform architecture)">
          <p>{"A page ABOUT the platform's own future is a bold claim. It says: 'this platform will exist in 10-20 years, and here's how it will evolve.' That's not a guarantee — it's a design statement. The platform is built to survive technology turnover. The math is the anchor. The fold is the update layer. The graph grows organically. The deeper thoughts are the immune system. If the platform is still here in 2040, it will be because the DESIGN was right — not because the specific tools were right. This page is the proof of that design."}</p>
        </DeeperThought>
      </DeeperThoughtSection>

      <RelatedTopics topics={[
        { id: "elegant-code" as const, reason: "Elegant Code — the 20 equations that survive technology turnover" },
        { id: "resources" as const, reason: "Resources — the datasets and papers that ground the math" },
        { id: "research" as const, reason: "Research — the ADRs that document design decisions" },
        { id: "connections" as const, reason: "Connections — the graph that gets denser over time" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("elegant-code")} className="text-sm text-primary hover:underline">→ Elegant Code (the math that stays)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("research")} className="text-sm text-primary hover:underline">→ Research (the ADRs that document the design)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("home")} className="text-sm text-primary hover:underline">→ Home</Link>
      </div>
    </div>
  );
}
