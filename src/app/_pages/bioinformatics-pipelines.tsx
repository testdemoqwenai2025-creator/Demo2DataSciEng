"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { Foldable } from "../_components/foldable";
import { ScienceShort } from "../_components/science-short";
import { hrefFor } from "../_lib/router";
import { RelatedElegantCode } from "../_components/related-elegant-code";
import { Badge } from "@/components/ui/badge";
import {
  Workflow, Dna, Microscope, Sparkles, History, TrendingUp, Boxes,
  Activity, Sigma, Layers, FlaskConical, FileText, Beaker,
} from "lucide-react";
import { DatasetCards } from "../_components/dataset-cards";
import { ELEGANT_CODE_CARDS } from "../_components/_elegant_code_cards";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";

const KPIS = [
  { label: "GATK variant calling", value: "BWA → MarkDups → BQSR → HaplotypeCaller", hint: "Pipeline: align reads (BWA-MEM), mark PCR duplicates, recalibrate base quality, call haplotypes locally (de novo assembly), joint genotype, annotate (VEP). 30× WGS = ~100 GB BAM per genome.", deltaTone: "flat" as const },
  { label: "RNA-seq", value: "STAR → featureCounts → DESeq2", hint: "Align reads to transcriptome (STAR/HISAT2), count per gene (featureCounts), test differential expression (DESeq2: negative binomial GLM). Detects fold-changes ≥ 1.5× at FDR 0.05.", deltaTone: "up" as const },
  { label: "ChIP-seq", value: "BWA → MACS2 → HOMER/MEME", hint: "Align immunoprecipitated reads (BWA), call peaks (MACS2: Poisson + control), motif discovery (HOMER/MEME). Identifies TF binding sites genome-wide.", deltaTone: "flat" as const },
  { label: "Variant annotation", value: "VEP + ANNOVAR + SnpEff + ClinVar", hint: "Annotate VCF with gene, consequence, frequency (gnomAD), pathogenicity (ClinVar, CADD). GATK + VEP = clinical-grade pipeline.", deltaTone: "up" as const },
];

// ============================================================
// ScienceShort — 5-phase looping animation
// ============================================================

const SHORT_PHASES = [
  {
    name: "Sequencer",
    desc: "Illumina NovaSeq: bridge amplification → 2-color chemistry → FASTQ reads (R1 + R2) at ~30× WGS",
    svg: (
      <svg viewBox="0 0 300 120" className="w-full h-auto">
        {/* Flow cell */}
        <rect x="50" y="35" width="100" height="50" rx="4" fill="oklch(0.65 0.16 30)20" stroke="oklch(0.65 0.16 30)" strokeWidth="1.5" />
        <text x="100" y="52" textAnchor="middle" fontSize="8" fill="oklch(0.65 0.16 30)" fontWeight="bold">NovaSeq</text>
        <text x="100" y="64" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 30)">flow cell</text>
        <text x="100" y="74" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 30)">2-color chemistry</text>
        {/* Clusters */}
        {Array.from({length: 6}).map((_, i) =>
          Array.from({length: 4}).map((_, j) => (
            <motion.circle key={`${i}-${j}`} cx={62 + i*15} cy={40 + j*3} r="1" fill="oklch(0.65 0.16 60)"
              animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.8, delay: (i+j)*0.1, repeat: Infinity }} />
          ))
        )}
        {/* Output */}
        <text x="100" y="105" textAnchor="middle" fontSize="6" fill="var(--muted-foreground)">→ FASTQ (R1+R2)</text>
        <rect x="180" y="40" width="80" height="40" rx="4" fill="oklch(0.65 0.16 165)20" stroke="oklch(0.65 0.16 165)" strokeWidth="1" />
        <text x="220" y="55" textAnchor="middle" fontSize="8" fill="oklch(0.65 0.16 165)" fontWeight="bold">FASTQ</text>
        <text x="220" y="68" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 165)">Q30 quality</text>
        <text x="220" y="78" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 165)">150 bp PE</text>
        <line x1="152" y1="60" x2="178" y2="60" stroke="var(--border)" strokeWidth="1" markerEnd="url(#seq-arrow)" />
        <defs><marker id="seq-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" /></marker></defs>
      </svg>
    ),
  },
  {
    name: "GATK pipeline",
    desc: "BWA → MarkDuplicates → BQSR → HaplotypeCaller → GenotypeGVCFs → VEP annotation",
    svg: (
      <svg viewBox="0 0 300 120" className="w-full h-auto">
        {/* 6 pipeline steps */}
        {["BWA", "MarkDups", "BQSR", "HC", "GenGVCFs", "VEP"].map((name, i) => {
          const x = 20 + i * 45;
          const colors = [30, 60, 165, 250, 320, 90];
          const c = colors[i];
          return (
            <g key={name}>
              <rect x={x} y={40} width={40} height={35} rx={3}
                fill={`oklch(0.65 0.16 ${c})20`} stroke={`oklch(0.65 0.16 ${c})`} strokeWidth="1" />
              <text x={x+20} y={62} textAnchor="middle" fontSize="6.5" fill={`oklch(0.65 0.16 ${c})`} fontWeight="bold">{name}</text>
              {i < 5 && (
                <line x1={x+40} y1={57} x2={x+45} y2={57} stroke="var(--border)" strokeWidth="0.8" markerEnd="url(#gatk-arrow)" />
              )}
            </g>
          );
        })}
        {/* Animated dot moving through pipeline */}
        <motion.circle cx="40" cy="57" r="3" fill="oklch(0.65 0.16 30)"
          animate={{ cx: [40, 85, 130, 175, 220, 265, 40] }} transition={{ duration: 3, repeat: Infinity }} />
        <text x="150" y="100" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">FASTQ → BAM → GVCF → VCF → annotated VCF</text>
        <defs><marker id="gatk-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.4" /></marker></defs>
      </svg>
    ),
  },
  {
    name: "Variants (VCF)",
    desc: "VCF: CHROM POS ID REF ALT QUAL FILTER INFO — SNV, indel, SV, CNV; QUAL = Phred Q = -10·log10(P_err)",
    svg: (
      <svg viewBox="0 0 300 120" className="w-full h-auto">
        <rect x="20" y="30" width="260" height="60" rx="4" fill="oklch(0.16 0.005 240)" stroke="oklch(0.65 0.16 250)" strokeWidth="1" />
        <text x="30" y="48" fontSize="6" fill="oklch(0.65 0.16 60)" fontFamily="monospace" fontWeight="bold">CHROM  POS     REF  ALT   QUAL  INFO</text>
        <text x="30" y="62" fontSize="6" fill="oklch(0.97 0.005 60)" fontFamily="monospace">chr1   12345   A    T    500   AC=2;AF=0.001</text>
        <text x="30" y="76" fontSize="6" fill="oklch(0.97 0.005 60)" fontFamily="monospace">chr3   67890   G    GT   350   INDEL;DP=45</text>
        <text x="30" y="90" fontSize="6" fill="oklch(0.97 0.005 60)" fontFamily="monospace">chr7   5518   G    A    999   Pathogenic</text>
        {/* Highlight */}
        <motion.rect x="25" y="86" width="250" height="6" fill="oklch(0.65 0.16 30)30"
          animate={{ opacity: [0.2, 0.6, 0.2] }} transition={{ duration: 1.5, repeat: Infinity }} />
        <text x="150" y="105" textAnchor="middle" fontSize="6" fill="var(--muted-foreground)">VCF — variant call format</text>
      </svg>
    ),
  },
  {
    name: "Clinical report",
    desc: "Pathogenic variant flagged → ACMG classification + drug response (PharmGKB) → oncologist + genetic counselor",
    svg: (
      <svg viewBox="0 0 300 120" className="w-full h-auto">
        <rect x="40" y="20" width="80" height="60" rx="4" fill="oklch(0.65 0.16 60)20" stroke="oklch(0.65 0.16 60)" strokeWidth="1" />
        <text x="80" y="35" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 60)" fontWeight="bold">Clinical report</text>
        <line x1="50" y1="45" x2="110" y2="45" stroke="oklch(0.65 0.16 60)" strokeWidth="0.8" />
        <line x1="50" y1="55" x2="100" y2="55" stroke="oklch(0.65 0.16 60)" strokeWidth="0.8" />
        <line x1="50" y1="65" x2="105" y2="65" stroke="oklch(0.65 0.16 60)" strokeWidth="0.8" />
        <line x1="50" y1="75" x2="90" y2="75" stroke="oklch(0.65 0.16 60)" strokeWidth="0.8" />
        <rect x="170" y="20" width="80" height="60" rx="4" fill="oklch(0.65 0.16 250)20" stroke="oklch(0.65 0.16 250)" strokeWidth="1" />
        <text x="210" y="35" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 250)" fontWeight="bold">ACMG + PharmGKB</text>
        <text x="210" y="50" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 250)">5-tier classification</text>
        <text x="210" y="62" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 250)">drug response</text>
        <text x="210" y="74" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 250)">genetic counsel</text>
        <line x1="122" y1="50" x2="168" y2="50" stroke="var(--border)" strokeWidth="1" markerEnd="url(#rep-arrow)" />
        <defs><marker id="rep-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" /></marker></defs>
      </svg>
    ),
  },
  {
    name: "Marketplace",
    desc: "23andMe (DTC genomics), Foundation Medicine (cancer), Guardant Health (liquid biopsy), Color Health",
    svg: (
      <svg viewBox="0 0 300 120" className="w-full h-auto">
        <rect x="15" y="20" width="65" height="30" rx="4" fill="oklch(0.65 0.16 30)20" stroke="oklch(0.65 0.16 30)" strokeWidth="1" />
        <text x="47" y="35" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 30)" fontWeight="bold">23andMe</text>
        <rect x="90" y="20" width="65" height="30" rx="4" fill="oklch(0.65 0.16 165)20" stroke="oklch(0.65 0.16 165)" strokeWidth="1" />
        <text x="122" y="35" textAnchor="middle" fontSize="6.5" fill="oklch(0.65 0.16 165)" fontWeight="bold">Foundation</text>
        <rect x="165" y="20" width="65" height="30" rx="4" fill="oklch(0.65 0.16 250)20" stroke="oklch(0.65 0.16 250)" strokeWidth="1" />
        <text x="197" y="35" textAnchor="middle" fontSize="6.5" fill="oklch(0.65 0.16 250)" fontWeight="bold">Guardant</text>
        <rect x="240" y="20" width="45" height="30" rx="4" fill="oklch(0.65 0.16 320)20" stroke="oklch(0.65 0.16 320)" strokeWidth="1" />
        <text x="262" y="35" textAnchor="middle" fontSize="6.5" fill="oklch(0.65 0.16 320)" fontWeight="bold">Color</text>
        <text x="150" y="75" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">DTC + clinical cancer + liquid biopsy</text>
        <motion.circle cx="47" cy="55" r="4" fill="oklch(0.65 0.16 30)"
          animate={{ cx: [47, 122, 197, 262, 47] }} transition={{ duration: 3, repeat: Infinity }} />
      </svg>
    ),
  },
];

// ============================================================
// Pyodide demo — Poisson sequencing depth simulation
// ============================================================

const MATH_DEMO = `# ============================================================
# Bioinformatics Pipelines — Poisson sequencing depth simulation
# Pure Python (Pyodide, no numpy)
# ============================================================

import math
import random

# Poisson distribution: P(k) = (lambda^k * e^(-lambda)) / k!
# Models the number of reads covering a position (coverage = depth).
# lambda = mean coverage (e.g., 30x WGS).

def poisson_pmf(k, lam):
    """Probability of exactly k reads covering a position."""
    # Use log-space to avoid overflow for large k
    log_pmf = k * math.log(lam) - lam - math.lgamma(k + 1)
    return math.exp(log_pmf)

def poisson_cdf(k_max, lam):
    """Cumulative: P(X <= k_max)."""
    cdf = 0.0
    for k in range(k_max + 1):
        cdf += poisson_pmf(k, lam)
        if cdf > 1.0:
            return 1.0
    return cdf

def p_at_least(n, lam):
    """P(X >= n) = 1 - P(X <= n-1)."""
    if n <= 0:
        return 1.0
    return 1.0 - poisson_cdf(n - 1, lam)

print("=== Poisson Sequencing Depth Simulation ===")
print("P(X) = (lambda^k * e^(-lambda)) / k!  -- reads at a position")
print()
print("Mean    P(>=10x)   P(>=20x)   P(>=30x)   interpretation")
print("-" * 64)

for lam in [5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100]:
    p10 = p_at_least(10, lam)
    p20 = p_at_least(20, lam)
    p30 = p_at_least(30, lam)
    if lam < 15:
        interp = "low (WES-like)"
    elif lam < 25:
        interp = "low-pass WGS"
    elif lam < 40:
        interp = "standard WGS"
    elif lam < 60:
        interp = "deep WGS"
    else:
        interp = "ultra-deep (cancer)"
    print("%5.1fx   %7.3f%%   %7.3f%%   %7.3f%%   %s" % (lam, p10*100, p20*100, p30*100, interp))

print()
print("=== Verify via Monte Carlo (10k samples per lambda) ===")
random.seed(42)
for lam in [10, 30, 60]:
    n_samples = 10000
    count_10x = 0
    for _ in range(n_samples):
        # Sample Poisson(lam) via inverse-transform sampling
        u = random.random()
        cdf = math.exp(-lam)  # P(X = 0)
        k = 0
        while cdf < u and k < 1000:
            k += 1
            cdf += poisson_pmf(k, lam)
        if k >= 10:
            count_10x += 1
    analytic = p_at_least(10, lam) * 100
    print("lambda=%3d  MC P(>=10x) = %5.2f%%   analytic = %5.2f%%" %
          (lam, count_10x/n_samples*100, analytic))

print()
print("=== Insight: depth drives confidence ===")
print("GATK HaplotypeCaller needs >=10x to call a genotype confidently.")
print("30x WGS = ~99.9% of positions have >=10x (Poisson lambda=30).")
print("100x = ultra-deep for tumor/normal cancer calling.")
print("This is why sequencing cost (USD/1000) drives clinical genomics.")`;

// ============================================================
// GATK pipeline flowchart SVG
// ============================================================

function GatkPipelineDiagram() {
  const steps = [
    { name: "BWA-MEM", sub: "FASTQ → BAM", color: 30, desc: "align reads to reference (GRCh38)" },
    { name: "MarkDuplicates", sub: "BAM → BAM", color: 60, desc: "tag PCR duplicates (optical + umi)" },
    { name: "BQSR", sub: "BAM → BAM", color: 165, desc: "recalibrate base quality (systematic error model)" },
    { name: "HaplotypeCaller", sub: "BAM → GVCF", color: 250, desc: "local de novo assembly + genotype likelihoods" },
    { name: "GenotypeGVCFs", sub: "GVCF → VCF", color: 320, desc: "joint genotyping across cohort" },
    { name: "VEP", sub: "VCF → VEP", color: 90, desc: "annotate (gene, consequence, ClinVar)" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Workflow className="h-3.5 w-3.5 text-primary" />
          GATK variant calling pipeline — FASTQ → annotated VCF (custom SVG)
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 400 220" className="w-full h-auto">
          {steps.map((s, i) => {
            const x = 10 + i * 65;
            return (
              <g key={s.name}>
                <rect x={x} y="40" width="55" height="55" rx="4"
                  fill={`oklch(0.65 0.16 ${s.color})20`} stroke={`oklch(0.65 0.16 ${s.color})`} strokeWidth="1.5" />
                <text x={x+27.5} y="58" textAnchor="middle" fontSize="7.5" fill={`oklch(0.65 0.16 ${s.color})`} fontWeight="bold">{s.name}</text>
                <text x={x+27.5} y="70" textAnchor="middle" fontSize="5.5" fill={`oklch(0.55 0.05 ${s.color})`} fontFamily="monospace">{s.sub}</text>
                <text x={x+27.5} y="84" textAnchor="middle" fontSize="5" fill={`oklch(0.55 0.05 ${s.color})`}>step {i+1}</text>
                {i < steps.length - 1 && (
                  <line x1={x+55} y1="67" x2={x+65} y2="67" stroke="var(--border)" strokeWidth="1" markerEnd="url(#gatk2-arrow)" />
                )}
              </g>
            );
          })}
          {/* Descriptions below */}
          {steps.map((s, i) => {
            const x = 10 + i * 65;
            return (
              <g key={`${s.name}-desc`}>
                <text x={x+27.5} y="115" textAnchor="middle" fontSize="5.5" fill="var(--muted-foreground)" fontWeight="bold">{s.name}</text>
                {s.desc.split(" ").reduce((acc: string[][], word: string, idx: number) => {
                  const wordIdx = idx % 3;
                  if (wordIdx === 0) acc.push([]);
                  acc[acc.length - 1].push(word);
                  return acc;
                }, []).slice(0, 3).map((line: string[], li) => (
                  <text key={li} x={x+27.5} y={125 + li*7} textAnchor="middle" fontSize="5" fill="var(--muted-foreground)">
                    {line.join(" ")}
                  </text>
                ))}
              </g>
            );
          })}
          {/* Animated dot through pipeline */}
          <motion.circle cx="37" cy="67" r="3" fill="oklch(0.65 0.16 30)"
            animate={{ cx: [37, 102, 167, 232, 297, 362, 37] }} transition={{ duration: 4, repeat: Infinity }} />
          <text x="200" y="170" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">
            Inputs: FASTQ (R1+R2) → BAM → GVCF → VCF → annotated VCF
          </text>
          <text x="200" y="185" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">
            ~6 hours per 30× WGS sample on 16 cores · ~100 GB BAM per genome
          </text>
          <text x="200" y="200" textAnchor="middle" fontSize="6.5" fill="var(--muted-foreground)">
            Output: VCF with CHROM POS ID REF ALT QUAL FILTER INFO + VEP annotations
          </text>
          <defs><marker id="gatk2-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" /></marker></defs>
        </svg>
      </div>
    </div>
  );
}

// ============================================================
// Main page
// ============================================================

export function BioinformaticsPipelinesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Bioinformatics Pipelines · GATK · RNA-seq · ChIP-seq · variant annotation · Poisson · binomial · negative binomial · Phred · Hardy-Weinberg · sequencer → marketplace"
        title="Bioinformatics Pipelines — from sequencer to clinical marketplace via GATK"
        description="Bioinformatics pipelines turn raw sequencing reads into clinical decisions. GATK variant calling runs FASTQ through BWA (alignment) → MarkDuplicates → BQSR (base quality recalibration) → HaplotypeCaller (local de novo assembly + genotype likelihoods) → GenotypeGVCFs (joint cohort genotyping) → VEP annotation (gene, consequence, ClinVar). RNA-seq measures gene expression: STAR aligns to transcriptome, featureCounts aggregates per-gene, DESeq2 fits a negative binomial GLM and tests differential expression. ChIP-seq finds transcription factor binding: BWA aligns, MACS2 calls peaks (Poisson test against control), HOMER/MEME discover motifs. Variant annotation (VEP, ANNOVAR, SnpEff, ClinVar) turns a VCF into a clinical report — ACMG pathogenicity, drug response, carrier status. This page covers the math (Poisson depth, binomial variant test, negative binomial RNA, Phred quality, Hardy-Weinberg), a custom GATK flowchart SVG, a Pyodide Poisson depth demo, comparison of GATK/DeepVariant/Strelka2/FreeBayes, and the full sequencer-to-marketplace narrative (23andMe, Foundation Medicine, Guardant Health, Color Health)."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Workflow className="h-3 w-3" /> GATK + VEP</Badge>
            <Badge variant="outline" className="gap-1.5"><Dna className="h-3 w-3" /> RNA + ChIP</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* Short — 5-phase looping animation */}
      <SectionCard
        title="Scientific pipeline short — sequencer → GATK → VCF → clinical report → marketplace"
        description="A looping 5-phase animation showing the bioinformatics pipeline. Phase 1: sequencer (Illumina NovaSeq → FASTQ). Phase 2: GATK pipeline (BWA → MarkDups → BQSR → HaplotypeCaller → GenotypeGVCFs → VEP). Phase 3: variants (VCF format with Phred quality). Phase 4: clinical report (ACMG + PharmGKB). Phase 5: marketplace (23andMe, Foundation Medicine, Guardant Health, Color Health)."
        icon={<Activity className="h-5 w-5" />}
        badge="short (loop)"
      >
        <ScienceShort phases={SHORT_PHASES} interval={1500} />
      </SectionCard>

      {/* Mathematical foundations — FOLDED */}
      <Foldable
        title="Mathematical foundations — Poisson, binomial, negative binomial, Phred, Hardy-Weinberg"
        summary="5 equations: Poisson depth, binomial variant test, negative binomial RNA-seq, Phred quality, Hardy-Weinberg"
      >
        <div className="space-y-4">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm font-semibold text-primary mb-2">1. Poisson Distribution (sequencing depth)</p>
            <p className="font-mono text-xs text-primary mb-2">
              P(k) = (λ^k · e^(-λ)) / k! · where λ = mean coverage (e.g., 30× WGS)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sequencing depth at any given genomic position follows approximately a Poisson distribution — assuming
              reads are independently and uniformly distributed. The parameter λ is the mean coverage (e.g., 30× for
              standard WGS, 100× for ultra-deep tumor sequencing). The probability of at least n reads covering a
              position is P(X≥n) = 1 - P(X≤n-1). For GATK HaplotypeCaller to confidently call a genotype, ≥10× is
              typically required; at λ=30, P(≥10×) ≈ 99.9%.
              <strong> Why this matters:</strong> Poisson depth drives everything — sequencing cost, sensitivity,
              false-negative rate. If you sequence at 4× (low-pass WGS), P(≥10×) is tiny — you will miss variants.
              The Illumina cost-per-genome curve (USD 3B in 2003 → USD 200 in 2024) directly translates Poisson depth
              into clinical feasibility. RNA-seq count modeling, ChIP-seq peak calling, and 16S microbiome all use
              Poisson as the foundational noise model.
            </p>
          </div>
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">2. Binomial Test (variant calling)</p>
            <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 mb-2">
              P(X≥n) = Σ_(k=n)^N C(N,k) · p^k · (1-p)^(N-k) · p = error rate, N = depth, n = alt reads
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              To decide whether a position has a true variant, GATK and similar callers ask: "If this position were
              truly homozygous reference (no variant), what is the probability of seeing n or more alternate reads
              by sequencing error?" This is a one-sided binomial test. With N reads at the position and per-base error
              rate p (derived from Phred Q scores), P(X≥n | p, N) gives the variant P-value. If P is small (e.g.,
              &lt; 10⁻⁶), call the variant. With N=30, p=0.001, observing n=10 alt reads has P ≈ 10⁻²⁰ —
              overwhelming evidence.
              <strong> Why this matters:</strong> The binomial test is the statistical core of variant calling —
              GATK, FreeBayes, and VarScan all use it (with refinements for genotype likelihoods). The Q-score
              (Phred) determines p, so base quality directly drives variant confidence. Cancer somatic calling
              (Strelka2, Mutect2) extends this to tumor-vs-normal comparisons with a beta-binomial to model
              overdispersion.
            </p>
          </div>
          <div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-3">
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">3. Negative Binomial (RNA-seq DE)</p>
            <p className="font-mono text-xs text-violet-600 dark:text-violet-400 mb-2">
              P(k) = C(k+r-1, k) · (1-p)^r · p^k · with mean μ, variance μ + μ²/r (extra-Poisson overdispersion)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              RNA-seq counts per gene exhibit more variance than Poisson predicts — biological replicates vary even
              when technical replicates agree. The negative binomial (NB) generalization has a free parameter r that
              captures this "extra-Poisson" overdispersion: variance = μ + μ²/r. DESeq2 and edgeR both fit per-gene
              NB GLMs and test for differential expression via the Wald test or likelihood-ratio test on log-fold-change.
              The NB mean-variance relationship is the key: high-expression genes are more variable, but their
              relative differences are smaller — DESeq2 shrinks estimates to borrow information across genes.
              <strong> Why this matters:</strong> RNA-seq DESeq2 called differential expression underlies thousands
              of published biology papers per year — drug MOA studies, disease signatures, developmental atlases.
              The negative binomial is the only distribution that correctly models RNA-seq count overdispersion; using
              Poisson would produce wildly too-significant P-values (false discovery).
            </p>
          </div>
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">4. Phred Quality Score</p>
            <p className="font-mono text-xs text-amber-600 dark:text-amber-400 mb-2">
              Q = -10 · log10(P_error) · Q30 → P_error = 10^(-3) = 1/1000 · Q40 → 1/10000
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every base in a FASTQ file has a Phred quality score encoding the probability that the base was called
              incorrectly. The formula Q = -10·log10(P_error) means each 10-unit increase is a 10× decrease in error
              rate. Q30 (the standard "high-quality" threshold) corresponds to 1 error per 1000 bases — the target
              for Illumina NovaSeq runs. Q40 is 1 per 10,000; Q20 is 1 per 100. The original Sanger chromatogram
              quality scheme (Phred, Ewing et al. 1998) became the universal standard; modern FASTQ uses ASCII-encoded
              Q + 33 (Phred+33) for compact storage.
              <strong> Why this matters:</strong> Phred Q-scores flow through every bioinformatics pipeline. BQSR
              (BaseRecalibration) learns systematic biases in machine-specific error profiles and corrects them;
              variant callers use Q scores to weight evidence per read. A single low-quality variant call in a
              clinical report could trigger a wrong cancer therapy — Phred math IS the safety net.
            </p>
          </div>
          <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3">
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-2">5. Hardy-Weinberg Equilibrium</p>
            <p className="font-mono text-xs text-rose-600 dark:text-rose-400 mb-2">
              p² + 2pq + q² = 1 · where p = ref allele freq, q = alt allele freq, p + q = 1
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hardy-Weinberg equilibrium (HWE) is the null model of population genetics: in a randomly-mating
              population, allele frequencies p (reference) and q = 1-p (alternate) produce genotype frequencies
              p² (hom-ref), 2pq (heterozygous), q² (hom-alt) — constant across generations. Deviations from HWE
              flag either population structure (Wahlund effect), recent selection, inbreeding, or systematic
              genotyping error. GATK VariantFiltration filters sites failing HWE (chi-squared test) as a quality
              check. For a rare variant (q=0.001), HWE predicts 2pq ≈ 0.002 heterozygotes — anything far off
              suggests artifact.
              <strong> Why this matters:</strong> HWE underlies population genetics, genetic counseling, and ancestry
              inference. 23andMe's ancestry composition uses HWE + PCA on genotype arrays. Carrier screening
              (recessive disease risk) uses HWE to estimate carrier frequency from patient cohorts. Clinical
              pipelines filter variants on HWE failure — a basic sanity check that catches genotyping bugs.
            </p>
          </div>
        </div>
      </Foldable>

      {/* GATK pipeline SVG */}
      <SectionCard
        title="GATK pipeline flowchart — FASTQ → annotated VCF (custom SVG)"
        description="The GATK Best Practices germline variant calling pipeline in 6 steps. (1) BWA-MEM aligns paired-end reads to the GRCh38 reference, producing a SAM/BAM. (2) MarkDuplicates tags PCR duplicates for later filtering. (3) BQSR learns systematic base-quality biases from known variants and corrects them. (4) HaplotypeCaller performs local de novo assembly around candidate sites and emits a GVCF with genotype likelihoods. (5) GenotypeGVCFs jointly genotypes a cohort's GVCFs into a single VCF. (6) VEP annotates each variant with gene, consequence, frequency (gnomAD), and pathogenicity (ClinVar). The whole pipeline takes ~6 hours per 30× WGS sample on 16 cores; ~100 GB of disk per BAM."
        icon={<Workflow className="h-5 w-5" />}
        badge="architecture"
      >
        <GatkPipelineDiagram />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: Poisson sequencing depth — compute P(≥10x coverage) for different depths (Pyodide)"
        description="Pure-Python Poisson simulation: analytically computes P(X≥k) for various mean depths λ (5× to 100×), showing why 30× is the standard WGS depth (P(≥10×) ≈ 99.9%) and why 100× is used for tumor sequencing. Then verifies with Monte Carlo inverse-transform sampling (10k samples per λ). Demonstrates the math behind sequencing depth recommendations — the foundation of every clinical genomics protocol."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={MATH_DEMO} buttonLabel="Run Poisson simulation (Pyodide)" />
      </SectionCard>

      {/* Comparison */}
      <SectionCard
        title="Variant callers compared — GATK vs DeepVariant vs Strelka2 vs FreeBayes"
        description="Four production variant callers. GATK (Broad, gold standard, academic free). DeepVariant (Google, CNN-based, 2024 SOTA for WGS). Strelka2 (Illumina, somatic, fastest). FreeBayes (open-source, haplotype-based)."
        icon={<Boxes className="h-5 w-5" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30">
              <tr className="border-b border-border/60">
                <th className="text-left px-3 py-2 font-semibold">Feature</th>
                <th className="text-left px-3 py-2 font-semibold">GATK HaplotypeCaller</th>
                <th className="text-left px-3 py-2 font-semibold text-primary">DeepVariant</th>
                <th className="text-left px-3 py-2 font-semibold">Strelka2</th>
                <th className="text-left px-3 py-2 font-semibold">FreeBayes</th>
              </tr>
            </thead>
            <tbody>
              {[
                { f: "Origin", g: "Broad Institute 2010", d: "Google 2017 (CNN)", s: "Illumina 2018", fb: "Marth Lab 2011 (Erik Garrison)" },
                { f: "License", g: "Academic free / commercial", d: "Apache 2.0 (open)", s: "GPL + BSD (open)", fb: "MIT (open-source)" },
                { f: "Method", g: "Local de novo assembly + HMM", d: "Deep CNN on pileup image", s: "Haplotype + somatic", fb: "Haplotype-based Bayesian" },
                { f: "Best for", g: "Germline WES/WGS", d: "WGS + PacBio +ONT", s: "Somatic tumor/normal", fb: "Small cohorts + pools" },
                { f: "Speed", g: "Slow (~6h/sample)", d: "Fast (GPU)", s: "Fastest (CPU)", fb: "Medium" },
                { f: "Accuracy", g: "Gold-standard", d: "SOTA (best F1)", s: "Best for somatic", fb: "Solid; mature" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{row.f}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.g}</td>
                  <td className="px-3 py-2 text-primary/80">{row.d}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.s}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.fb}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Why evolved — FOLDED */}
      <Foldable
        title="Why bioinformatics pipelines evolved — from Sanger traces to clinical genomics"
        summary="4 shortfalls: manual Sanger reads, no quality scoring, no proper statistical variant model, no clinical annotation"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Shortfall 1: Sanger traces were hand-called.</strong> Early DNA sequencing (Sanger 1977) produced chromatogram traces that biologists read by eye — slow, error-prone, single-sample. The arrival of next-gen sequencing (Illumina 2007, 454 2005) demanded automated pipelines. BWA (Li 2009) and Bowtie2 (Langmead 2009) solved alignment at scale — making 100s of millions of reads per sample tractable.</p>
          <p><strong className="text-foreground/80">Shortfall 2: No per-base quality scoring.</strong> Sanger chromatogram peak heights were a proxy for confidence, but Illumina's millions of bases per run needed a quantitative score. Phred (Ewing 1998, originally for Sanger) was adapted — Q = -10·log10(P_error) became the universal standard. BQSR (Base Quality Score Recalibration, GATK 2010) learned systematic machine biases from known variants and corrected them — improving variant calling sensitivity by 5-10%.</p>
          <p><strong className="text-foreground/80">Shortfall 3: Naive variant counting produced false positives.</strong> Early variant callers simply counted alt reads and called a variant if a fraction was &gt; some threshold — ignoring per-base error rates, mapping quality, and read-pair evidence. GATK HaplotypeCaller (Depristo 2011, Poplin 2018) introduced local de novo assembly + genotype likelihoods — properly modeling the data-generating process. DeepVariant (Google 2017) re-cast the problem as image classification on pileup images — CNN on a 100×100 image of the read pileup beats hand-engineered models.</p>
          <p><strong className="text-foreground/80">Shortfall 4: VCFs were meaningless without annotation.</strong> A raw VCF line says "chr1 12345 A T" — meaningless clinically. VEP (Ensembl 2010) and SnpEff (Cingolani 2012) annotate variants with gene context, consequence (missense/nonsense/splice), allele frequency (gnomAD), and pathogenicity (ClinVar). Without annotation, a clinical report cannot be written. The GATK + VEP combo is now the clinical-grade standard — Foundation Medicine, Guardant, Color all run variants of it.</p>
        </div>
      </Foldable>

      {/* Unique features */}
      <SectionCard
        title="Truly unique bioinformatics pipeline features"
        description="Four features that make bioinformatics pipelines unique as a discipline."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. Phred Q-scores ARE the data quality</p>
            <p className="text-muted-foreground">Q = -10·log10(P_error) — every base has its own error rate. <strong>Quality IS metadata, integrated throughout the pipeline.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Poisson depth drives everything</p>
            <p className="text-muted-foreground">Coverage X ~ Poisson(λ) — sensitivity, FNR, cost all derive from one parameter. <strong>λ = 30 is the magic number.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Negative binomial models biology</p>
            <p className="text-muted-foreground">RNA-seq counts need NB GLM — Poisson underestimates variance. <strong>Overdispersion IS the biology, not noise.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Hard-Weinberg = sanity check</p>
            <p className="text-muted-foreground">p² + 2pq + q² = 1 flags genotyping bugs, inbreeding, and selection. <strong>HWE failure = variant filtering.</strong></p>
          </div>
        </div>
      </SectionCard>

      {/* Computational tooling — FOLDED */}
      <Foldable
        title="Computational tooling — GATK + aligners + RNA-seq + ChIP-seq + annotation"
        summary="GATK, BWA, STAR, HISAT2, featureCounts, MACS2, HOMER, DESeq2, VEP, ANNOVAR, SnpEff, Picard, samtools, bcftools"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Workflow className="h-3.5 w-3.5 text-primary" /> Variant Calling + Annotation</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>GATK</strong> — Broad Institute, HaplotypeCaller + GenotypeGVCFs + VQSR (gold standard)</li>
              <li>• <strong>DeepVariant</strong> — Google, CNN on pileup images, SOTA for WGS</li>
              <li>• <strong>Strelka2</strong> — Illumina, somatic tumor/normal, fastest</li>
              <li>• <strong>FreeBayes</strong> — open-source haplotype-based Bayesian caller</li>
              <li>• <strong>VEP</strong> — Ensembl, gene/consequence/frequency/ClinVar annotation</li>
              <li>• <strong>ANNOVAR / SnpEff</strong> — alternative variant annotators</li>
              <li>• <strong>Picard / samtools / bcftools</strong> — BAM/VCF manipulation toolkit</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Dna className="h-3.5 w-3.5 text-primary" /> Alignment + RNA-seq + ChIP-seq</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>BWA-MEM</strong> — Li 2009, BWT-index, fast + accurate for short reads</li>
              <li>• <strong>Bowtie2</strong> — Langmead, alternative aligner with sensitive/local modes</li>
              <li>• <strong>STAR</strong> — Dobin 2013, splice-aware RNA-seq aligner (fast)</li>
              <li>• <strong>HISAT2</strong> — Kim, HISAT2 + StringTie + Ballgown pipeline</li>
              <li>• <strong>featureCounts</strong> — Liao 2014, per-gene read counting</li>
              <li>• <strong>DESeq2 / edgeR / limma-voom</strong> — differential expression (NB GLM)</li>
              <li>• <strong>MACS2</strong> — Zhang 2008, ChIP-seq peak calling (Poisson vs control)</li>
              <li>• <strong>HOMER / MEME / JASPAR</strong> — motif discovery + enrichment</li>
            </ul>
          </div>
        </div>
      </Foldable>

      {/* Research — FOLDED */}
      <Foldable
        title="Research + sequencer to marketplace narrative"
        summary="Sanger 1977, Illumina 2007, GATK 2010, DeepVariant 2017, 23andMe, Foundation Medicine, Guardant, Color"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Sanger sequencing (Sanger, 1977, Nobel 1980):</strong> "DNA Sequencing with Chain-Terminating Inhibitors." Introduced dideoxy chain-terminating nucleotides (ddNTPs) — read sequences from electrophoresis gel position. The Human Genome Project (USD 3B, 1990-2003) used capillary Sanger — last great Sanger project before NGS took over.</p>
          <p><strong className="text-foreground/80">Illumina (Solexa, 2007):</strong> Acquired Solexa's bridge-amplification technology. Massively parallel sequencing-by-synthesis — millions of clusters per flow cell, 2-color chemistry. Drove sequencing cost from USD 3B (2003) to USD 200 (2024) — a 10-million-fold drop. NovaSeq X 25B now produces 6 Tb per 2-day run — the cost curve broke clinical genomics open.</p>
          <p><strong className="text-foreground/80">GATK HaplotypeCaller (Depristo 2011, Poplin 2018):</strong> "A framework for variation discovery from next-gen DNA sequencing data." Introduced local de novo assembly + genotype likelihoods — the gold standard for germline variant calling. GATK Best Practices became the field's default pipeline. Acquired by Broad Institute — free for academic use, licensed for commercial.</p>
          <p><strong className="text-foreground/80">DeepVariant (Google, 2017):</strong> Re-cast variant calling as image classification on pileup images — a 100×100 RGB image per candidate site, fed to Inception-style CNN. Outperformed GATK on WGS benchmarks — won PrecisionFDA challenges. Open-sourced (Apache 2.0). Showed that learned models can beat hand-engineered statistical pipelines.</p>
          <p><strong className="text-foreground/80">23andMe (DTC genomics marketplace):</strong> Founded 2006. Direct-to-consumer genotyping — Illumina Global Screening Array (~650k SNPs), imputed to ~30M variants. Ancestry composition via PCA + ADMIXTURE on genotype arrays. Carrier status reports (BRCA1/2, CF, sickle cell). FDA-cleared pharmacogenomic + health reports. IPO at USD 3.5B — built on GATK + VEP + PCA.</p>
          <p><strong className="text-foreground/80">Foundation Medicine (cancer marketplace):</strong> Founded 2010. Comprehensive Genomic Profiling (CGP) — hybrid-capture panel of 324 cancer genes, sequenced at 500-1000× tumor depth. FoundationOne CDx is FDA-approved companion diagnostic for 30+ targeted therapies. Acquired by Roche for USD 5B (2018). GATK + Strelka2 + custom CNV/SV callers — clinical cancer pipeline at scale.</p>
          <p><strong className="text-foreground/80">Guardant Health (liquid biopsy marketplace):</strong> Founded 2014. Uses circulating tumor DNA (ctDNA) from a blood draw — no tissue biopsy needed. Guardant360 CDx is FDA-approved for solid tumor genotyping. Reads cell-free DNA at 5000-10000× depth to detect 0.1% allele fraction variants — the marketplace end of bioinformatics pipelines. Revenue USD 600M+ (2024).</p>
        </div>
      </Foldable>

      {/* Insight — FOLDED */}
      <Foldable
        title="My deeper thought: bioinformatics pipelines ARE applied probability theory"
        summary="Poisson + binomial + negative binomial + Phred + Hardy-Weinberg = modern bioinformatics"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Bioinformatics pipelines ARE applied probability theory.</strong> Sequencing depth IS Poisson sampling (P(k) = λ^k·e^(-λ)/k!). Variant calling IS a binomial test (P(X≥n) = Σ C(N,k)·p^k·(1-p)^(N-k)). RNA-seq differential expression IS a negative binomial GLM (overdispersion μ + μ²/r). Base calling IS Phred scoring (Q = -10·log10(P_error)). Population filtering IS Hardy-Weinberg (p² + 2pq + q² = 1). Every step in a bioinformatics pipeline IS a classical probability distribution applied to sequencing data.</p>
          <p><strong className="text-foreground/80">The VCF IS the universal data structure of clinical genomics.</strong> Every variant caller outputs VCF (Variant Call Format) — CHROM, POS, ID, REF, ALT, QUAL, FILTER, INFO. The format was invented for the 1000 Genomes Project (2008) and is now the universal currency of clinical genomics. Annotation (VEP) adds INFO fields (gene, consequence, frequency, pathogenicity). The clinical report IS a curated subset of annotated VCF — ACMG-filtered, ranked by pathogenicity, cross-referenced against PharmGKB for drug response. From FASTQ to clinical report, the VCF is the central abstraction.</p>
          <p><strong className="text-foreground/80">DeepVariant shows ML can beat statistical pipelines — but the math still matters.</strong> DeepVariant (Google 2017) re-cast variant calling as image classification on pileup images — and outperformed the hand-engineered GATK statistical model. This is a recurring pattern in computational science: classical methods encode domain knowledge in probability distributions (binomial, Poisson); ML methods encode it implicitly in learned weights. But the underlying probability theory still informs: data generation IS Poisson, base quality IS Phred, samples ARE conditionally independent given genotypes. The math IS the inductive bias — even when the model is a CNN. The pipeline IS still GATK + VEP + ACMG — the marketplace didn't change because the underlying biology didn't change.</p>
        </div>
      </Foldable>

      {/* Cross-disciplinary elegant-code card — Poisson */}
      <SectionCard
        title="Cross-disciplinary elegance — Poisson bridges sequencing, networks, and radioactive decay"
        description="Poisson (P(k) = λ^k e^(-λ)/k!) IS the law of rare events. Sequencing reads, server requests, and radioactive decays are ALL independent rare events. A bioinformatician and a network engineer are solving the same equation."
        icon={<Sparkles className="h-5 w-5" />}
        badge="elegant code"
      >
        <DatasetCards
          examples={ELEGANT_CODE_CARDS.filter((_, i) => i === 2)}
          intro="Poisson (sequencing ↔ networks ↔ decay): the SAME equation describes read coverage, server load, and radioactivity — because all three are independent rare events."
        />
      </SectionCard>

      {/* Related elegant-code — card → card adjacency footer */}
      <RelatedElegantCode hostPage={"bioinformatics-pipelines" as never} />


      <DeeperThoughtSection pageTitle="Bioinformatics Pipelines">
        <DeeperThought title="Bioinformatics Pipelines IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about Bioinformatics Pipelines is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. Bioinformatics Pipelines connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where Bioinformatics Pipelines sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (Bioinformatics Pipelines) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
        </DeeperThought>
        <DeeperThought title="The fold pattern respects the reader's attention" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"This page has fold sections (collapsed by default) that reveal deeper content on demand — equation family comparisons, LaTeX derivations, production patterns, expected outputs, and citations. The basic content is visible immediately; the deeper phases are there when the reader is ready. Progressive disclosure isn't just UX — it's epistemological. A reader who wants the summary gets it; a reader who wants the derivation clicks to expand. Both are served by the same page."}</p>
        </DeeperThought>
        <DeeperThought title="The output IS the proof — not just the equation" connectedTo="ADR-034 (ESM-2 + AlphaFold2 adoption)">
          <p>{"Where this page has interactive demos (Pyodide + sliders + charts), the visual output IS the argument. Seeing a chart update as you drag a slider communicates the math in a way no formula can. The brain's pattern-recognition system processes the visual output faster than the verbal/analytical pathway. That's why the platform pairs every equation with a live demo — the output plays to a different level of the brain than the prose."}</p>
        </DeeperThought>
        <DeeperThought title="In a decade, this page will evolve — and that's the point" connectedTo="ADR-022 (pgvector for variant embeddings)">
          <p>{"The datasets, libraries, and tools on this page will be updated as technology evolves. The 1000-Genomes Project will become the 10M-Genomes Project. NumPy may be replaced by a WebGPU-native array library. PyTorch may give way to a successor. But the math — SVD, Attention, Poisson, FFT, Bayes, Kalman, GBM — will be the same. The platform is designed for this evolution: the equations are the anchor, the tools are the amplifier, and the fold sections let us update the tools without rewriting the page."}</p>
        </DeeperThought>
      </DeeperThoughtSection>
      <RelatedTopics topics={[
        { id: "bioinformatics" as const, reason: "Bioinformatics (sequence analysis foundations)" },
        { id: "computational-biology" as const, reason: "Computational Biology (MD + AlphaFold)" },
        { id: "computational-chemistry" as const, reason: "Computational Chemistry (DFT for drug design)" },
        { id: "spatial-transcriptomics" as const, reason: "Spatial Transcriptomics (RNA-seq + space)" },
        { id: "singlecell-multiomics" as const, reason: "Single-cell Multiomics (10x + RNA)" },
        { id: "alphamissense" as const, reason: "AlphaMissense (ML variant pathogenicity)" },
        { id: "ai-drug-discovery" as const, reason: "AI Drug Discovery (Foundation Medicine variant data)" },
        { id: "numpy-scipy" as const, reason: "NumPy/SciPy (matrix ops for variant data)" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("bioinformatics")} className="text-sm text-primary hover:underline">
          &rarr; Bioinformatics (sequence analysis)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("computational-biology")} className="text-sm text-primary hover:underline">
          &rarr; Computational Biology (MD + AlphaFold)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("alphamissense")} className="text-sm text-primary hover:underline">
          &rarr; AlphaMissense (ML variant pathogenicity)
        </Link>
      </div>
    </div>
  );
}
