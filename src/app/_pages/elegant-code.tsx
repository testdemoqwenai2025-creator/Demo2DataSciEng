"use client";

import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { NextSteps } from "../_components/next-steps";
import { DatasetCards } from "../_components/dataset-cards";
import { ELEGANT_CODE_CARDS } from "../_components/_elegant_code_cards";
import { ELEGANT_CODE_MAP } from "../_lib/elegant-code-map";
import { RelatedTopics } from "../_components/related-topics";
import { DiscoveryPath } from "../_components/discovery-path";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Brain, Atom, Sparkles, TrendingUp, Boxes, Network, Cpu } from "lucide-react";

const KPIS = [
  { label: "Math equations", value: "20 cross-disciplinary", hint: "SVD, Attention, Poisson, FFT, Verlet, Navier-Stokes, Gradient Descent, Bayes, Euler, Entropy, Black-Scholes, Haversine, Kelly, Markov, VaR, PageRank, Kalman, Monte Carlo, GBM, Lloyd's — each connecting 3+ sciences via one equation", deltaTone: "up" as const },
  { label: "Languages", value: "5 (Scala/Rust/Go/Elixir/Zig)", hint: "Each equation expressed in 5 languages — showing that elegance transcends language", deltaTone: "flat" as const },
  { label: "Sciences bridged", value: "20+ disciplines", hint: "Genomics, NLP, audio, chemistry, physics, games, aerospace, finance, networks, microscopy, biology, queueing theory, maritime, aviation, astronomy, climate, RL, ML, thermodynamics, evolution", deltaTone: "up" as const },
  { label: "Insight depth", value: "'X IS Y' connections", hint: "The unexpected connections that no single PhD sees alone — this is the platform's core value", deltaTone: "up" as const },
];

export function ElegantCodePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Where equations refuse to stay in their lane"
        title="Elegant Code — the mathematics that walks across disciplines"
        description="There is a kind of mathematics that refuses to stay where it was born. The Fourier transform that pulls a C-note out of an audio sample is the same operation that pulls a molecular mass out of a mass spectrometer and a 3D structure out of a cryo-EM micrograph. The same SVD that recovers Out-of-Africa migration from 1000-Genomes data is the same SVD that finds Fama-French risk factors in stock returns. The math doesn't know what it's doing — it just keeps showing up, identical, in places no one expected it. This page collects twenty of those moments. Each card holds one equation and three sciences it walks across. Click any card to see the math, the code in five languages (Scala, Rust, Go, Elixir, Zig), the 'X IS Y' that names the connection no single field would surface on its own, and — when you press 'View expected outcomes' — the actual chart, image, or analytics each science produces when the equation lands on its data. Drag the sliders on the live demos and watch the math work on real datasets: gnomAD alleles, 1000-Genomes PCA, SPX option chains, AIS vessel tracks, MarineTraffic port distances, NOAA flood gauges. Specialisation is cheap. Intersections are rare. The next century of computational science belongs to those who refuse to stay in their lane — who see SVD in a genome and the same SVD in a stock portfolio and know, with a small shock of recognition, that it is the same SVD. That seeing is what this platform builds."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Brain className="h-3 w-3" /> 20 equations</Badge>
            <Badge variant="outline" className="gap-1.5"><Atom className="h-3 w-3" /> 20+ sciences</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* The cards — 20 elegant code scenarios */}
      <SectionCard
        title="20 elegant code scenarios — math → code → science → unexpected connection"
        description="Each card opens a lazy popup showing: the mathematical equation (the foundation), elegant code in 5 languages (the expression), the science domain (the application), and the 'X IS Y' insight (the unexpected connection that bridges disciplines). The code is REPRESENTATIONAL — it shows HOW to think, not HOW to run. The elegance emerges from the mathematics; the code is just the expression. The 'Hosted on' badge on each card shows which other pages on the platform surface that card inline."
        icon={<Sparkles className="h-5 w-5" />}
        badge="20 cards × 5 langs"
      >
        <DatasetCards
          examples={ELEGANT_CODE_CARDS}
          anchorPrefix="card-"
          hostedOnByIndex={(i) => ELEGANT_CODE_MAP[i]?.hostPages ?? []}
          liveDemoByIndex={(i) => {
            // Phase K — Living Equations: 10 of 20 cards have live demo pages.
            const liveMap: Record<number, string> = {
              0: "/living-svd",
              1: "/living-attention",
              2: "/living-poisson",
              3: "/living-fft",
              9: "/living-entropy",
              10: "/living-black-scholes",
              11: "/living-haversine",
              16: "/living-kalman",
              17: "/living-monte-carlo",
              18: "/living-gbm",
            };
            return liveMap[i] ?? null;
          }}
          intro="SVD, Attention, Poisson, FFT, Verlet, Navier-Stokes, Gradient Descent, Bayes, Euler, Entropy (Phase J) + Black-Scholes, Haversine, Kelly, Markov, VaR, PageRank, Kalman, Monte Carlo, GBM, Lloyd's (Phase K). Each card shows ONE equation bridging 3+ sciences, with elegant code in Scala/Rust/Go/Elixir/Zig. 10 cards have a 'Run it live' CTA — try SVD, Attention, Poisson, FFT, Entropy, Black-Scholes, Haversine, Kalman, Monte Carlo, or GBM for interactive Pyodide demos with sliders."
        />
      </SectionCard>

      {/* Deeper thought */}
      <SectionCard
        title="My deeper thought: elegance IS the intersection"
        description="The platform's core thesis: modern computational science requires knowledge that spans more than two PhDs. The elegance is not in any single discipline — it's in the CONNECTIONS between them."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">The platform's thesis:</strong> Modern computational science requires knowledge that spans more than two PhDs. A computational biologist needs biology + CS + statistics. A data engineer needs distributed systems + databases + math. An ML researcher needs calculus + linear algebra + neuroscience. No single PhD covers all three. The INTERSECTION is where the value is — and the intersection is where the elegance is.
          </p>
          <p>
            <strong className="text-foreground/80">What PhDs lack:</strong> They know their field deeply. What they DON'T know is how to THINK ACROSS FIELDS. How does a biologist see the math that a physicist sees? How does a computer scientist see the biology that a bioinformatician sees? The 5 cards above demonstrate this: SVD connects genomics to audio to finance. Attention connects protein folding to NLP. Poisson connects sequencing to queueing theory to radioactive decay. FFT connects mass spec to music to cryo-EM. Verlet connects molecular dynamics to game physics to orbital mechanics. Each connection is the SAME math expressed in different domains — and recognizing the connection is the skill that no single PhD teaches.
          </p>
          <p>
            <strong className="text-foreground/80">The code is representational, not executable:</strong> The code shows HOW to think, not HOW to run. A sound software developer can fill in the implementation details. What they can't fill in is the UNEXPECTED CONNECTION — the insight that SVD is the Fourier transform for data, that attention is natural selection, that Poisson is the law of rare events, that FFT is the change of basis, that Verlet is time-reversal symmetry. These insights are not derivable from code — they're derivable from DEEP mathematical understanding applied across domains. THAT is what the platform builds.
          </p>
          <p>
            <strong className="text-foreground/80">The target audience:</strong> People with more than two PhDs' worth of grey matter. They don't need basics — they need the BRIDGES between their silos. The platform's role is to show them: "you already know X in your field. Here's how X appears in three OTHER fields you've never studied. The SAME equation, expressed differently." Once they see the pattern, they can extend it — the platform INSPIRES new thinking, it doesn't replace a textbook.
          </p>
          <p>
            <strong className="text-foreground/80">The computational tools are the medium:</strong> NumPy, Spark, AlphaFold, MLflow, Kafka, Iceberg — these are the TOOLS through which multi-disciplinary mathematics is expressed. The tools don't CREATE the elegance; they ENABLE it. Without NumPy, the SVD that rediscovers human migration from DNA would take weeks instead of seconds. Without AlphaFold, the attention that parses protein language would require supercomputers instead of GPUs. The tools are the amplifier — the math is the signal.
          </p>
        </div>
      </SectionCard>

      <DiscoveryPath />

      <RelatedTopics topics={[
        { id: "numpy-scipy" as const, reason: "NumPy N-D arrays — the computational foundation" },
        { id: "transformer-deep-dive" as const, reason: "Attention = the universal correlation detector" },
        { id: "computational-biology" as const, reason: "Wet lab → NumPy → publication → marketplace" },
        { id: "data-lakehouse" as const, reason: "Medallion Bronze→Silver→Gold for science data" },
        { id: "bioinformatics-pipelines" as const, reason: "GATK pipelines use Poisson for coverage" },
        { id: "mlflow-deep-dive" as const, reason: "Track experiments across disciplines" },
        { id: "fintech" as const, reason: "SVD in finance = risk factors (Fama-French)" },
        { id: "modern-big-data" as const, reason: "Big data stack — tools for multi-disciplinary work" },
      ]} />
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "Trace this topic's connections across the platform's math graph" }, { id: "numpy-scipy" as const, reason: "NumPy N-D arrays — the computational foundation" }, { id: "transformer-deep-dive" as const, reason: "Attention = the universal correlation detector" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("numpy-scipy")} className="text-sm text-primary hover:underline">
          &rarr; NumPy/SciPy — the computational foundation
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("computational-biology")} className="text-sm text-primary hover:underline">
          &rarr; Computational Biology — wet lab to marketplace
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("transformer-deep-dive")} className="text-sm text-primary hover:underline">
          &rarr; Transformer — attention IS natural selection
        </Link>
      </div>
    </div>
  );
}
