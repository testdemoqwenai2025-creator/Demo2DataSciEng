"use client";

import Link from "next/link";
import { SectionCard, PageHeader } from "../_components/section-card";
import { NextSteps } from "../_components/next-steps";
import { RelatedTopics } from "../_components/related-topics";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import { GenealogyTimeline } from "../_components/genealogy-timeline";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { History, Sparkles, TrendingUp, Atom, Brain, BookOpen, Calculator, Cpu } from "lucide-react";

const KPIS = [
  { label: "Time span", value: "1713 — 2024", hint: "311 years of formal math discovery. From Bernoulli's law of large numbers to AlphaFold3 + Boltz.", deltaTone: "flat" as const },
  { label: "Survival rate", value: "100%", hint: "Every milestone in this timeline is still in active use today. None has been deprecated.", deltaTone: "up" as const },
  { label: "Eras covered", value: "5 eras", hint: "Foundational (pre-1800), Industrial (1800-1900), Modern axioms (1900-1950), Computational (1950-2000), Data-driven (2000+).", deltaTone: "flat" as const },
  { label: "Platform pages", value: "30+ links", hint: "Each milestone links to the platform page that builds on it — click any node in the timeline to jump.", deltaTone: "up" as const },
];

interface EraCard {
  era: string;
  years: string;
  icon: typeof Atom;
  accent: string;
  bgColor: string;
  summary: string;
  highlights: Array<{ year: number; name: string; mathematician: string; note: string }>;
}

const ERAS: EraCard[] = [
  {
    era: "Foundational (pre-1800)",
    years: "1713 — 1799",
    icon: BookOpen,
    accent: "text-amber-600 dark:text-amber-400",
    bgColor: "border-amber-500/30 bg-amber-500/5",
    summary: "The axioms that everything else builds on. Bernoulli's law of large numbers (1713) → probability theory. Euler's graph theory (1736) → network science. Bayes' theorem (1763) → every belief update from spam filters to AlphaMissense. The Euler method (1768) → every numerical integration since. Lagrange's mechanics (1788) → physics-informed neural networks. Gauss's least squares (1799) → regression + SVD.",
    highlights: [
      { year: 1713, name: "Law of large numbers", mathematician: "Jacob Bernoulli", note: "Posthumous — Ars Conjectandi" },
      { year: 1736, name: "Graph theory", mathematician: "Leonhard Euler", note: "Seven Bridges of Königsberg" },
      { year: 1763, name: "Bayes' theorem", mathematician: "Thomas Bayes", note: "Posthumous — the belief updater" },
      { year: 1768, name: "Euler method", mathematician: "Leonhard Euler", note: "First numerical integrator" },
      { year: 1788, name: "Lagrangian mechanics", mathematician: "Joseph-Louis Lagrange", note: "L = T − V → PINNs" },
      { year: 1799, name: "Least squares", mathematician: "Carl Friedrich Gauss", note: "Predicted Ceres's orbit" },
    ],
  },
  {
    era: "Industrial (1800-1900)",
    years: "1800 — 1899",
    icon: Calculator,
    accent: "text-indigo-600 dark:text-indigo-400",
    bgColor: "border-indigo-500/30 bg-indigo-500/5",
    summary: "The era when math formalised the physical world. Haversine (1805) for great-circle distance. Fourier (1822) for heat equations → spectra. Navier-Stokes (1822) for fluid flow. Cauchy's gradient descent (1847). Beltrami-Jordan SVD (1873). Boltzmann entropy (1877). Galton's regression to the mean (1886). Pearson correlation (1893). Bachelier's GBM (1900) — pre-Einstein Brownian motion.",
    highlights: [
      { year: 1805, name: "Haversine", mathematician: "James Bowring", note: "Great-circle distance" },
      { year: 1809, name: "Normal distribution", mathematician: "Carl Friedrich Gauss", note: "Error theory → ML loss" },
      { year: 1822, name: "Fourier transform", mathematician: "Joseph Fourier", note: "Heat eqn → spectra → FFT" },
      { year: 1822, name: "Navier-Stokes", mathematician: "Navier & Stokes", note: "Universal fluid PDE" },
      { year: 1847, name: "Gradient descent", mathematician: "Augustin-Louis Cauchy", note: "θ -= η∇L(θ)" },
      { year: 1873, name: "SVD", mathematician: "Beltrami & Jordan", note: "A = UΣV^T" },
      { year: 1877, name: "Boltzmann entropy", mathematician: "Ludwig Boltzmann", note: "S = k log W" },
      { year: 1886, name: "Regression to mean", mathematician: "Francis Galton", note: "Tall parents → shorter kids" },
      { year: 1893, name: "Pearson correlation", mathematician: "Karl Pearson", note: "r = cov/σ²" },
      { year: 1900, name: "GBM (Bachelier)", mathematician: "Louis Bachelier", note: "Pre-Einstein Brownian motion" },
    ],
  },
  {
    era: "Modern axioms (1900-1950)",
    years: "1900 — 1949",
    icon: Brain,
    accent: "text-teal-600 dark:text-teal-400",
    bgColor: "border-teal-500/30 bg-teal-500/5",
    summary: "The era when mathematics examined its own foundations. Hilbert's 23 problems (1900) set the agenda. Einstein's special relativity (1905). Markov chains (1906). Gödel's incompleteness (1931). Kolmogorov's probability axioms (1933). Turing's universal machine (1936). Ulam's Monte Carlo (1946, Los Alamos). Shannon's information entropy (1948) — explicit acknowledgement that H = -Σp log p is the same as Boltzmann.",
    highlights: [
      { year: 1900, name: "Hilbert's 23 problems", mathematician: "David Hilbert", note: "Set 20th-c agenda" },
      { year: 1905, name: "Special relativity", mathematician: "Albert Einstein", note: "Lorentz + E=mc²" },
      { year: 1906, name: "Markov chain", mathematician: "Andrey Markov", note: "π(t+1) = π(t)·P" },
      { year: 1931, name: "Gödel incompleteness", mathematician: "Kurt Gödel", note: "Math can't prove itself" },
      { year: 1933, name: "Probability axioms", mathematician: "Andrey Kolmogorov", note: "Measure theory basis" },
      { year: 1936, name: "Turing machine", mathematician: "Alan Turing", note: "Universal computation" },
      { year: 1946, name: "Monte Carlo method", mathematician: "Ulam + von Neumann", note: "Los Alamos neutron transport" },
      { year: 1948, name: "Information entropy", mathematician: "Claude Shannon", note: "H = Boltzmann + Haldane" },
    ],
  },
  {
    era: "Computational (1950-2000)",
    years: "1950 — 1999",
    icon: Cpu,
    accent: "text-emerald-600 dark:text-emerald-400",
    bgColor: "border-emerald-500/30 bg-emerald-500/5",
    summary: "Math meets silicon. Kelly criterion (1956) → Simons's Medallion. Lloyd's algorithm (1957) → k-means everywhere. Fortran (1957) → BLAS → LAPACK → NumPy. Kalman filter (1960) → Apollo. Lorenz chaos (1963). Cooley-Tukey FFT (1965) → 1000× speedup. Verlet (1967) → AMBER, Havok. Black-Scholes (1973). Backpropagation (Rumelhart-Hinton 1979). VaR (JPM 1994). SVM (Vapnik 1995). PageRank (Brin-Page 1998).",
    highlights: [
      { year: 1956, name: "Kelly criterion", mathematician: "John Kelly", note: "f* = μ/σ²" },
      { year: 1957, name: "Lloyd's algorithm", mathematician: "Stuart Lloyd", note: "Bell Labs PCM → k-means" },
      { year: 1957, name: "Fortran", mathematician: "John Backus", note: "IBM → BLAS → NumPy" },
      { year: 1960, name: "Kalman filter", mathematician: "Rudolf Kálmán", note: "Apollo navigation" },
      { year: 1965, name: "FFT", mathematician: "Cooley & Tukey", note: "O(N log N)" },
      { year: 1967, name: "Verlet integrator", mathematician: "Loup Verlet", note: "Symplectic MD" },
      { year: 1973, name: "Black-Scholes", mathematician: "Black, Scholes, Merton", note: "Universal option pricing" },
      { year: 1979, name: "Backpropagation", mathematician: "Rumelhart-Hinton-Williams", note: "Chain rule → MLPs" },
      { year: 1994, name: "VaR", mathematician: "JPMorgan RiskMetrics", note: "Tail-risk quantile" },
      { year: 1995, name: "SVM", mathematician: "Vapnik & Cortes", note: "Max-margin classifier" },
      { year: 1998, name: "PageRank", mathematician: "Brin & Page", note: "Eigenvector centrality" },
    ],
  },
  {
    era: "Data-driven (2000+)",
    years: "2000 — present",
    icon: Sparkles,
    accent: "text-violet-600 dark:text-violet-400",
    bgColor: "border-violet-500/30 bg-violet-500/5",
    summary: "Math meets web-scale data. MapReduce (Dean-Ghemawat 2004) → Hadoop/Spark. Hinton's Deep Belief Networks (2006) → deep learning era. Goodfellow's GAN (2014). AlphaGo (Silver 2016) — MCTS + self-play beats Lee Sedol. Vaswani's Attention (2017) — softmax(QK^T/√d_k)×V powers GPT-4 and AlphaFold2. GPT-3 (Brown 2020) — emergence at scale. AlphaFold2 (Jumper 2021) — 200M protein structures. Diffusion beats GANs (Dhariwal-Sutskever 2022). AlphaFold3 + Boltz (2024) — open-source matches DeepMind.",
    highlights: [
      { year: 2004, name: "MapReduce", mathematician: "Dean & Ghemawat", note: "Google → Hadoop → Spark" },
      { year: 2006, name: "Deep Belief Network", mathematician: "Hinton et al.", note: "Deep learning era begins" },
      { year: 2014, name: "GAN", mathematician: "Ian Goodfellow", note: "Minimax game" },
      { year: 2016, name: "AlphaGo", mathematician: "Silver et al.", note: "MCTS + self-play" },
      { year: 2017, name: "Attention", mathematician: "Vaswani et al.", note: "softmax(QK^T/√d_k)×V" },
      { year: 2020, name: "GPT-3", mathematician: "Brown et al.", note: "175B params, few-shot" },
      { year: 2021, name: "AlphaFold2", mathematician: "Jumper et al.", note: "200M protein structures" },
      { year: 2022, name: "Diffusion beats GANs", mathematician: "Dhariwal & Sutskever", note: "Classifier-free guidance" },
      { year: 2024, name: "AlphaFold3 + Boltz", mathematician: "DeepMind + Boltz OSS", note: "Open-source matches commercial" },
    ],
  },
];

export function GenealogyPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="325 years of equations that survived — from Bernoulli 1713 to AlphaFold 2024"
        title="Genealogy of Mathematical Discoveries"
        description="A vertical D3.js timeline of every equation, theorem, and algorithm that powers this platform — from Jacob Bernoulli's law of large numbers (1713) through Beltrami & Jordan's SVD (1873), Kalman's filter (1960), and Vaswani's attention (2017) to DeepMind's AlphaFold2 (2021) and Boltz (2024). Each milestone is clickable, linking to the platform page that builds on it. The timeline makes one truth visceral: 311 years of math discovery, all of it still in active use today. The math outlasts the tools by 10× or more."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><History className="h-3 w-3" /> 311 years</Badge>
            <Badge variant="outline" className="gap-1.5"><TrendingUp className="h-3 w-3" /> 100% survival</Badge>
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

      {/* Interactive D3 vertical timeline */}
      <SectionCard
        title="Interactive vertical timeline — click any milestone to jump to its host page"
        description="A scrollable D3.js vertical timeline of 45 hand-curated math discoveries, color-coded by era. Hover any milestone for context (mathematician + contribution). Click to navigate to the platform page that builds on it — e.g. click 'SVD (1873)' to open /numpy-scipy, or click 'Attention (2017)' to open /transformer. The visual rhythm of eras (warm sepia → indigo → teal → emerald → violet) makes the acceleration of discovery visceral: pre-1800 has 6 milestones, 1800-1900 has 10, 1900-1950 has 8, 1950-2000 has 11, and 2000+ already has 9 — within just 24 years."
        icon={<History className="h-5 w-5" />}
        badge="D3 · 45 milestones"
      >
        <GenealogyTimeline />
      </SectionCard>

      {/* Era-by-era breakdown */}
      <SectionCard
        title="Era-by-era breakdown — 5 eras, 45 milestones, all still in active use"
        description="Each era represents a phase of math discovery, with its own dominant concerns: foundational axioms (pre-1800), physical-world formalisation (1800-1900), self-examination (1900-1950), computation (1950-2000), and data-driven learning (2000+). What's striking: NONE of these discoveries has been deprecated. Gauss's 1799 least squares is still the workhorse of regression. Bayes's 1763 theorem is still the belief-updater inside AlphaMissense. The math outlasts the tools by 10× or more."
        icon={<BookOpen className="h-5 w-5" />}
        badge="5 eras"
      >
        <div className="space-y-6">
          {ERAS.map((era) => {
            const EraIcon = era.icon;
            return (
              <div key={era.era} className={`rounded-md border ${era.bgColor} p-4`}>
                <div className="flex items-start gap-3 mb-3">
                  <EraIcon className={`h-5 w-5 mt-0.5 ${era.accent} shrink-0`} />
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <h3 className={`text-sm font-bold ${era.accent}`}>{era.era}</h3>
                      <span className="text-[10px] font-mono text-muted-foreground">{era.years}</span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className="text-[10px] text-muted-foreground">{era.highlights.length} milestones</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">{era.summary}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {era.highlights.map((h) => (
                    <div key={`${era.era}-${h.year}-${h.name}`} className="rounded-md border border-border/40 bg-background/50 p-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-xs font-mono font-bold ${era.accent}`}>{h.year}</span>
                        <span className="text-xs font-semibold text-foreground">{h.name}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{h.mathematician}</p>
                      <p className="text-[9px] text-muted-foreground/80 mt-0.5 italic">{h.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Insight: the survival rate */}
      <SectionCard
        title="The survival rate — why this platform invests in the math, not the tools"
        description="Every milestone on this timeline is still in active use today. None has been deprecated. Bayes (1763) is still the belief-updater. SVD (1873) is still the matrix decomposition. Kalman (1960) is still the state estimator. Attention (2017) is still the correlation detector. By contrast, the tools that implement them turn over every 10-20 years: NumPy (2005) will be replaced by WebGPU-native arrays, PyTorch (2016) will be replaced by a neuro-symbolic compiler, Kafka (2011) will be replaced by a photon mesh. The platform's design choice: anchor the pages in the math, update the tools in fold sections."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="100% survival"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4">
            <p className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold mb-2">
              Math longevity — 100-300 years
            </p>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li><span className="font-mono font-bold text-foreground">Bayes (1763)</span> — 263 years old, still the spam filter + AlphaMissense core</li>
              <li><span className="font-mono font-bold text-foreground">SVD (1873)</span> — 153 years old, still np.linalg.svd + PCA + risk factors</li>
              <li><span className="font-mono font-bold text-foreground">FFT (1965)</span> — 61 years old, still np.fft.fft (just faster hardware)</li>
              <li><span className="font-mono font-bold text-foreground">Kalman (1960)</span> — 66 years old, still AIS tracking + Apollo navigation</li>
              <li><span className="font-mono font-bold text-foreground">Attention (2017)</span> — 9 years old, the youngest — already the workhorse</li>
            </ul>
          </div>
          <div className="rounded-md border border-orange-500/30 bg-orange-500/5 p-4">
            <p className="text-xs uppercase tracking-wider text-orange-600 dark:text-orange-400 font-semibold mb-2">
              Tool turnover — 10-20 years
            </p>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li><span className="font-mono font-bold text-foreground">NumPy (2005)</span> — 21 years old, projected to be replaced by WebGPU-AO ~2030</li>
              <li><span className="font-mono font-bold text-foreground">PyTorch (2016)</span> — 10 years old, projected to be replaced by NSTC ~2033</li>
              <li><span className="font-mono font-bold text-foreground">Kafka (2011)</span> — 15 years old, projected to be replaced by photon mesh ~2035</li>
              <li><span className="font-mono font-bold text-foreground">Snowflake (2012)</span> — 14 years old, projected to be replaced by Q-CS ~2035</li>
              <li><span className="font-mono font-bold text-foreground">AlphaFold2 (2021)</span> — 5 years old, already being replaced by AlphaFold3 + Boltz</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground/80">The ratio is visceral: math outlasts tools by 10× or more.</strong> Bayes is 263 years old and still core.
            AlphaFold2 is 5 years old and already being replaced. The math survives; the tools amplify. This platform's pages are
            anchored in the equations (SVD, Attention, Poisson, Bayes, Kalman, GBM) — when the tools turn over, we update the
            "Production patterns" fold sections. The math stays. The page survives.
          </p>
        </div>
      </SectionCard>

      {/* Deeper thoughts */}
      <DeeperThoughtSection pageTitle="Genealogy of Math Discoveries">
        <DeeperThought title="Math discovery is accelerating — but the FOUNDATIONS are unchanged" connectedTo="ADR-001 (platform architecture)">
          <p>{"The pre-1800 era produced 6 milestones in 86 years (one every 14 years). The 1800-1900 era produced 10 in 100 years (one every 10 years). The 1900-1950 era produced 8 in 50 years (one every 6 years). The 1950-2000 era produced 11 in 50 years (one every 4.5 years). The 2000+ era has already produced 9 in 24 years (one every 2.7 years). The acceleration is real — but look at WHAT is being discovered. The pre-1800 discoveries (Bayes, Euler, Lagrange, Gauss) are still FOUNDATIONS. Everything since is AMPLIFICATION of those foundations. Attention (2017) IS Bayes + SVD + Shannon combined. AlphaFold2 IS Attention + SE(3)-equivariance. The math gets denser, not newer. The foundations haven't changed since 1799. We've spent 225 years amplifying them."}</p>
        </DeeperThought>
        <DeeperThought title="Each milestone on this timeline IS a 'X IS Y' insight waiting to be rediscovered" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"When Bayes published P(H|D) = P(D|H)P(H)/P(D) in 1763, he couldn't know it would become the spam filter (2000s), the AlphaMissense variant classifier (2023), and the Kalman filter (1960). When Beltrami published SVD in 1873, he couldn't know it would become PCA (1901), the Fama-French risk factor model (1992), and the ESM-2 protein embedding reducer (2023). When Shannon published H = -Σp log p in 1948, he couldn't know it was the same as Boltzmann (1877) and would become the cross-entropy loss of every neural network. Every milestone on this timeline has this property: the original discovery was domain-specific, but the MATH turned out to be universal. The 'X IS Y' insight is the act of rediscovering this universality — usually 50-150 years after the original publication. This timeline is the platform's homage to that rediscovery process."}</p>
        </DeeperThought>
        <DeeperThought title="Why pre-1800 math dominates: the axioms had to come first" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"Look at the foundational era (pre-1800): probability (Bernoulli 1713, Bayes 1763), graph theory (Euler 1736), numerical integration (Euler 1768), mechanics (Lagrange 1788), regression (Gauss 1799). These are AXIOMS — the minimum set of mathematical ideas from which everything else is derived. You can't do machine learning without probability (Bayes 1763). You can't do neural networks without gradient descent (Cauchy 1847), which itself builds on calculus (Newton/Leibniz 1666-1687). You can't do PCA without SVD (Beltrami 1873), which itself builds on linear algebra (Descartes 1637). The pre-1800 era had to happen first because the axioms had to exist before the theorems. The 1800-1900 era formalised physical reality (Fourier, Navier-Stokes, Boltzmann). The 1900-1950 era examined the axioms themselves (Hilbert, Gödel, Turing, Kolmogorov). The 1950-2000 era applied them computationally (Kalman, FFT, Verlet, Black-Scholes). The 2000+ era applies them at web scale (MapReduce, Attention, AlphaFold). The acceleration is in APPLICATION, not in FOUNDATION."}</p>
        </DeeperThought>
        <DeeperThought title="The 1900-1950 self-examination era is the most underappreciated" connectedTo="ADR-001 (platform architecture)">
          <p>{"The 1900-1950 era looks small (8 milestones) but it's the most consequential. Hilbert's 23 problems (1900) set the agenda. Einstein's relativity (1905) redefined space and time. Markov chains (1906) gave us memoryless transitions. Gödel's incompleteness (1931) proved math can't prove itself. Kolmogorov's axioms (1933) put probability on rigorous measure-theoretic foundations. Turing's universal machine (1936) defined computation itself. Ulam's Monte Carlo (1946) gave us sampling. Shannon's entropy (1948) connected information to physics. This era is underappreciated because the discoveries were META — about math itself, not about the world. But every modern algorithm depends on them. Every neural network training run uses Kolmogorov's probability axioms + Shannon's entropy + Turing's universal computation + Markov's chain (via stochastic gradient descent = Markov chain on parameters). The 1900-1950 era is the META-FOUNDATION that makes the 2000+ era possible."}</p>
        </DeeperThought>
        <DeeperThought title="Attention (2017) is the youngest milestone on this timeline — and the most cross-disciplinary" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"softmax(QK^T/√d_k) × V was published in 2017 by Vaswani et al. at Google. It's 9 years old. Yet it already powers GPT-4 (NLP), AlphaFold2 (protein folding), Stable Diffusion (images), and Boltz (drug discovery). No other milestone on this timeline has had this rate of cross-domain adoption. Bayes (1763) took 240 years to reach spam filtering. SVD (1873) took 130 years to reach PCA for genomics. Kalman (1960) took 50 years to reach AIS vessel tracking. Attention took 4 years to reach protein folding (AlphaFold2 2021). The acceleration isn't just in discovery — it's in CROSS-DOMAIN ADOPTION. The 2000+ era's milestones are BORN cross-disciplinary, because the ML community is inherently cross-disciplinary. This is why the platform invests in 'X IS Y' insights: the future of math discovery is recognizing that the SAME equation in 5 different domains is ONE idea, not five."}</p>
        </DeeperThought>
        <DeeperThought title="This timeline IS the platform's design contract with the future" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page is more than a history. It's a design contract: the platform commits to keeping every milestone on this timeline navigable, readable, and relevant for as long as the math stays in use. Bayes (1763) has been in active use for 263 years — this platform commits to keeping /alphamissense (which builds on Bayes) updated for as long as Bayes is used. SVD (1873) has been in active use for 153 years — this platform commits to keeping /numpy-scipy updated for as long as SVD is used. Attention (2017) is 9 years old and may be replaced in 20 years — when it is, the platform will update its fold sections, not delete the page. The timeline is the proof: 311 years of math, every milestone still active, every milestone still linked to a live page on this platform. That's the contract. The math survives. The platform survives with it."}</p>
        </DeeperThought>
      </DeeperThoughtSection>

      <RelatedTopics topics={[
        { id: "elegant-code" as const, reason: "Elegant Code — the 20 cards that bridge math ↔ domain (SVD, Attention, Bayes, FFT, Kalman, etc.)" },
        { id: "connections" as const, reason: "Connections — the card → host-page graph (where each milestone surfaces)" },
        { id: "future" as const, reason: "Future Evolution — the projected replacements for the tools that implement this math" },
        { id: "resources" as const, reason: "Resources — the papers (Beltrami 1873, Vaswani 2017, Jumper 2021) and libraries" },
      ]} />
      <NextSteps relatedPages={[
        { id: "future" as const, reason: "Future Evolution — what replaces the tools (Snowflake, Kafka, PyTorch) that implement this math" },
        { id: "elegant-code" as const, reason: "Elegant Code — the 20 cross-disciplinary cards that surface these milestones inline" },
        { id: "connections" as const, reason: "Connections — the graph of where each milestone's host page lives" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("elegant-code")} className="text-sm text-primary hover:underline">→ Elegant Code (cross-disciplinary math)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("future")} className="text-sm text-primary hover:underline">→ Future Evolution (where the tools go)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("resources")} className="text-sm text-primary hover:underline">→ Resources (papers + libraries)</Link>
      </div>
    </div>
  );
}
