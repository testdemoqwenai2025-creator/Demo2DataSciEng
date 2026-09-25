"use client";

import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { DatasetCards } from "../_components/dataset-cards";
import { ELEGANT_CODE_CARDS } from "../_components/_elegant_code_cards";
import { RelatedTopics } from "../_components/related-topics";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Brain, Atom, Sparkles, TrendingUp, Boxes, Network, Cpu } from "lucide-react";

const KPIS = [
  { label: "Math equations", value: "5 cross-disciplinary", hint: "SVD, Attention, Poisson, FFT, Verlet — each connecting 3+ sciences via one equation", deltaTone: "up" as const },
  { label: "Languages", value: "5 (Scala/Rust/Go/Elixir/Zig)", hint: "Each equation expressed in 5 languages — showing that elegance transcends language", deltaTone: "flat" as const },
  { label: "Sciences bridged", value: "12+ disciplines", hint: "Genomics, NLP, audio, chemistry, physics, games, aerospace, finance, networks, microscopy, biology, queueing theory", deltaTone: "up" as const },
  { label: "Insight depth", value: "'X IS Y' connections", hint: "The unexpected connections that no single PhD sees alone — this is the platform's core value", deltaTone: "up" as const },
];

export function ElegantCodePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Multi-disciplinary elegance · math → code → science → unexpected connections"
        title="Elegant Code — where mathematics meets life sciences meets software"
        description="This page demonstrates the multi-disciplinary intersection that defines modern computational science. Each card shows ONE mathematical equation that bridges MULTIPLE sciences — the same math applied to genomics, NLP, audio, chemistry, physics, games, and aerospace. The code is not executable — it is REPRESENTATIONAL, showing how mathematics becomes code becomes science. The 'X IS Y' insights reveal unexpected connections that no single PhD sees alone. This is what the platform is building: the thinking process that creates unexpected elegance across disciplines."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Brain className="h-3 w-3" /> 5 equations</Badge>
            <Badge variant="outline" className="gap-1.5"><Atom className="h-3 w-3" /> 12+ sciences</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* The cards — 5 elegant code scenarios */}
      <SectionCard
        title="5 elegant code scenarios — math → code → science → unexpected connection"
        description="Each card opens a lazy popup showing: the mathematical equation (the foundation), elegant code in 5 languages (the expression), the science domain (the application), and the 'X IS Y' insight (the unexpected connection that bridges disciplines). The code is REPRESENTATIONAL — it shows HOW to think, not HOW to run. The elegance emerges from the mathematics; the code is just the expression."
        icon={<Sparkles className="h-5 w-5" />}
        badge="5 cards × 5 langs"
      >
        <DatasetCards
          examples={ELEGANT_CODE_CARDS}
          intro="SVD (genomics ↔ audio ↔ finance), Attention (protein folding ↔ NLP), Poisson (sequencing ↔ networks ↔ decay), FFT (mass spec ↔ audio ↔ cryo-EM), Verlet (MD ↔ games ↔ orbits). Each card shows ONE equation bridging 3+ sciences, with elegant code in Scala/Rust/Go/Elixir/Zig."
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
