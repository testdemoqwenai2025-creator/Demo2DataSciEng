"use client";

import Link from "next/link";
import { SectionCard, PageHeader } from "../_components/section-card";
import { NextSteps } from "../_components/next-steps";
import { RelatedTopics } from "../_components/related-topics";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import { FutureTimeline } from "../_components/future-timeline";
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
        title="Technology evolution timeline — equations (1700s-2020s) vs tools (2000s-2020s) vs future (2030-2050)"
        description="An interactive D3.js timeline showing when each equation was invented (top swimlane, green — these survive) vs when each tool was created (middle swimlane, blue — these turnover) vs when each tool will be replaced (bottom swimlane, orange — projected). The math persists; the tools don't. Hover any milestone for context. The shared year-axis (1740 → 2055) makes the density contrast visceral: equations span 250+ years, tools span 22, future replacements span 15."
        icon={<Activity className="h-5 w-5" />}
        badge="D3 · 1740-2055"
      >
        <FutureTimeline />
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
      <NextSteps relatedPages={[{ id: "elegant-code" as const, reason: "Elegant Code — the 20 equations that survive technology turnover" }, { id: "resources" as const, reason: "Resources — the datasets and papers that ground the math" }, { id: "research" as const, reason: "Research — the ADRs that document design decisions" }]} />

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
