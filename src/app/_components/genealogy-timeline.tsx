"use client";

/**
 * GenealogyTimeline — D3.js vertical timeline of mathematical discoveries.
 *
 * Renders a single-column vertical timeline spanning 1700-2025, with
 * each discovery as a milestone node. Milestones are colored by era:
 *   - Pre-1800: warm sepia  (foundational)
 *   - 1800-1900: deep indigo (industrial revolution math)
 *   - 1900-1950: muted teal  (modern axioms + computation)
 *   - 1950-2000: emerald     (computational era)
 *   - 2000+: violet          (ML + data-driven)
 *
 * Lazy-gated (matches elegant-code-graph.tsx pattern) — D3 simulation
 * is heavy; we don't want it to block initial page render.
 *
 * Each milestone supports hover tooltip + click-to-jump (navigates to
 * the corresponding platform page if it exists).
 */
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useRouter } from "next/navigation";

interface Milestone {
  year: number;
  name: string;
  mathematician: string;
  contribution: string;
  /** Page ID on this platform that builds on this milestone (optional). */
  pageId?: string;
  era: "pre-1800" | "1800-1900" | "1900-1950" | "1950-2000" | "2000+";
}

const ERA_COLORS: Record<Milestone["era"], string> = {
  "pre-1800": "oklch(0.65 0.10 50)",   // warm sepia
  "1800-1900": "oklch(0.55 0.13 270)", // deep indigo
  "1900-1950": "oklch(0.60 0.10 190)", // muted teal
  "1950-2000": "oklch(0.62 0.13 150)", // emerald
  "2000+": "oklch(0.62 0.16 310)",    // violet
};

const ERA_LABELS: Record<Milestone["era"], string> = {
  "pre-1800": "Foundational (pre-1800)",
  "1800-1900": "Industrial (1800-1900)",
  "1900-1950": "Modern axioms (1900-1950)",
  "1950-2000": "Computational (1950-2000)",
  "2000+": "Data-driven (2000+)",
};

// Hand-curated list — ~40 milestones spanning 1700-2025. Each entry
// is the moment a math idea first became formal (publication date,
// not when the concept was first intuited).
const MILESTONES: Milestone[] = [
  // ---- Pre-1800: foundational ----
  { year: 1713, name: "Foundations of probability", mathematician: "Jacob Bernoulli", contribution: "Ars Conjectandi — law of large numbers, posthumously published.", era: "pre-1800" },
  { year: 1736, name: "Graph theory", mathematician: "Leonhard Euler", contribution: "Seven Bridges of Königsberg → graph abstraction, foundation of network science.", era: "pre-1800" },
  { year: 1748, name: "Euler's formula", mathematician: "Leonhard Euler", contribution: "e^(iπ) + 1 = 0 — complex-exponential bridge, foundation of Fourier analysis.", era: "pre-1800" },
  { year: 1763, name: "Bayes' theorem", mathematician: "Thomas Bayes (posth.)", contribution: "P(H|D) = P(D|H)P(H)/P(D) — the belief-update rule. Spam filter, AlphaMissense, Kalman filter.", pageId: "alphamissense", era: "pre-1800" },
  { year: 1768, name: "Euler method", mathematician: "Leonhard Euler", contribution: "y(t+Δt) = y(t) + f(t,y)·Δt — first-order numerical integration. Used by every game engine + NASA GMAT.", pageId: "space-science", era: "pre-1800" },
  { year: 1788, name: "Lagrangian mechanics", mathematician: "Joseph-Louis Lagrange", contribution: "L = T − V → action principle. Foundation of physics-informed neural networks (PINNs).", era: "pre-1800" },
  { year: 1799, name: "Least squares", mathematician: "Carl Friedrich Gauss", contribution: "Predicting Ceres orbit from limited observations. Foundation of regression + SVD.", pageId: "numpy-scipy", era: "pre-1800" },

  // ---- 1800-1900: industrial ----
  { year: 1805, name: "Haversine", mathematician: "James Bowring", contribution: "d = 2R·arcsin(√(...)) — great-circle distance on a sphere. Maritime, aviation, astronomy all use this.", pageId: "global-shipping", era: "1800-1900" },
  { year: 1809, name: "Normal distribution", mathematician: "Carl Friedrich Gauss", contribution: "Error distribution: exp(-x²/2σ²). Underpins OLS regression, GBM returns, variant calling.", era: "1800-1900" },
  { year: 1822, name: "Fourier transform", mathematician: "Joseph Fourier", contribution: "Heat equation → spectral decomposition. Mass spec, audio, cryo-EM all use FFT.", pageId: "numpy-scipy", era: "1800-1900" },
  { year: 1822, name: "Navier-Stokes eqn", mathematician: "Claude-Louis Navier & George Stokes", contribution: "∂u/∂t + u·∇u = -∇p/ρ + ν∇²u. Universal fluid flow PDE — weather, blood, turbulence.", pageId: "computational-physics", era: "1800-1900" },
  { year: 1847, name: "Gradient descent", mathematician: "Augustin-Louis Cauchy", contribution: "θ(t+1) = θ(t) - η∇L(θ). Every neural network training run uses this 1847 idea.", pageId: "tabular", era: "1800-1900" },
  { year: 1873, name: "SVD", mathematician: "Eugenio Beltrami & Camille Jordan", contribution: "A = UΣV^T. Universal matrix decomposition — PCA, genomics, audio, finance.", pageId: "numpy-scipy", era: "1800-1900" },
  { year: 1877, name: "Boltzmann entropy", mathematician: "Ludwig Boltzmann", contribution: "S = k log W. Same formula as Shannon H (1948) and Haldane heterozygosity — disorder is universal.", pageId: "systems-biology", era: "1800-1900" },
  { year: 1886, name: "Regression to mean", mathematician: "Francis Galton", contribution: "Tall parents → shorter children. Foundation of regression + the modern statistics era.", era: "1800-1900" },
  { year: 1893, name: "Pearson correlation", mathematician: "Karl Pearson", contribution: "r = cov(X,Y)/(σ_X σ_Y). Foundation of portfolio theory (Markowitz) and PCA.", era: "1800-1900" },
  { year: 1900, name: "Geometric Brownian Motion", mathematician: "Louis Bachelier", contribution: "dS = μS·dt + σS·dW. Pre-Einstein Brownian motion, foundation of Black-Scholes + population genetics.", pageId: "fintech", era: "1800-1900" },

  // ---- 1900-1950: modern axioms ----
  { year: 1900, name: "Hilbert's 23 problems", mathematician: "David Hilbert", contribution: "Set the 20th century math agenda. Problem 10 (Entscheidungsproblem) led to Turing.", era: "1900-1950" },
  { year: 1905, name: "Special relativity", mathematician: "Albert Einstein", contribution: "Lorentz transformations + E=mc². Foundation of GPS time correction (used in Kalman vessel tracking).", pageId: "space-science", era: "1900-1950" },
  { year: 1906, name: "Markov chain", mathematician: "Andrey Markov", contribution: "π(t+1) = π(t)·P — memoryless state transitions. Jukes-Cantor DNA, Moody's, AIS port states.", pageId: "bioinformatics", era: "1900-1950" },
  { year: 1931, name: "Gödel's incompleteness", mathematician: "Kurt Gödel", contribution: "Math can't prove its own consistency. Foundation of computational limits + AI alignment debates.", era: "1900-1950" },
  { year: 1933, name: "Probability axioms", mathematician: "Andrey Kolmogorov", contribution: "Measure-theoretic foundation of probability. Every Bayes update + Monte Carlo + Kalman posterior.", era: "1900-1950" },
  { year: 1936, name: "Turing machine", mathematician: "Alan Turing", contribution: "Universal computation. Every CPU, every LLM, every algorithm runs on this abstraction.", era: "1900-1950" },
  { year: 1946, name: "Monte Carlo method", mathematician: "Stanislaw Ulam + John von Neumann", contribution: "E[f(X)] ≈ (1/N)Σf(X_i). Los Alamos neutron transport → option pricing + variant calling.", pageId: "monte-carlo", era: "1900-1950" },
  { year: 1948, name: "Information entropy", mathematician: "Claude Shannon", contribution: "H = -Σ p log p. Same as Boltzmann + Haldane. Foundation of compression, ML loss functions.", pageId: "systems-biology", era: "1900-1950" },

  // ---- 1950-2000: computational ----
  { year: 1956, name: "Kelly criterion", mathematician: "John Kelly (Bell Labs)", contribution: "f* = μ/σ² — optimal bet sizing. Ed Thorp blackjack, Simons Medallion, Haldane allele fixation.", pageId: "fintech", era: "1950-2000" },
  { year: 1957, name: "Lloyd's algorithm", mathematician: "Stuart Lloyd (Bell Labs)", contribution: "k-means clustering. PCM quantization → 1.4M ImageNet clustering → 50K port clustering.", pageId: "global-shipping", era: "1950-2000" },
  { year: 1957, name: "Fortran", mathematician: "John Backus (IBM)", contribution: "First high-level programming language. NumPy, BLAS, LAPACK all descend from this lineage.", era: "1950-2000" },
  { year: 1960, name: "Kalman filter", mathematician: "Rudolf E. Kálmán", contribution: "x̂(t+1) = x̂(t) + K·(z − H·x̂(t)). Apollo navigation → AIS tracking → 1000-Genomes allele tracking.", pageId: "global-shipping", era: "1950-2000" },
  { year: 1963, name: "Lorenz attractor", mathematician: "Edward Lorenz", contribution: "Chaos theory — deterministic but unpredictable. Foundation of weather forecasting limits + VaR tail risk.", era: "1950-2000" },
  { year: 1965, name: "Fast Fourier Transform", mathematician: "Cooley & Tukey", contribution: "O(N log N) FFT. 1000× faster than DFT. Every MRI, MP3, mass spec uses this.", pageId: "numpy-scipy", era: "1950-2000" },
  { year: 1967, name: "Verlet integration", mathematician: "Loup Verlet", contribution: "Symplectic, time-reversible integrator. AMBER, Havok, NASA JPL all call this. r(t+Δt) = 2r(t) - r(t-Δt) + F/m·Δt².", pageId: "computational-biology", era: "1950-2000" },
  { year: 1973, name: "Black-Scholes", mathematician: "Black, Scholes, Merton", contribution: "C = S·N(d1) − K·e^(−rT)·N(d2). Universal option pricing — Lloyd's underwriters, CME quants, Fisher geneticists.", pageId: "fintech", era: "1950-2000" },
  { year: 1979, name: "Backpropagation", mathematician: "Rumelhart, Hinton, Williams", contribution: "Chain rule applied to multi-layer perceptrons. Every PyTorch training step is this 1979 idea.", pageId: "neural-networks", era: "1950-2000" },
  { year: 1994, name: "Value at Risk", mathematician: "JPMorgan RiskMetrics", contribution: "VaR_α = -(μ + z_α·σ). Universal tail-risk quantile — Basel III, Solvency II, FEMA flood maps.", pageId: "fintech", era: "1950-2000" },
  { year: 1995, name: "Support Vector Machine", mathematician: "Vapnik & Cortes", contribution: "Maximum-margin classifier. Kernel trick = implicit feature embedding. Pre-Attention ML workhorse.", pageId: "neural-networks", era: "1950-2000" },
  { year: 1998, name: "PageRank", mathematician: "Brin & Page", contribution: "PR(p) = (1-d) + d·Σ(PR(q)/L(q)). Eigenvector centrality — now used on BIS systemic risk, UN COMTRADE, STRING.", pageId: "global-shipping", era: "1950-2000" },

  // ---- 2000+: data-driven ----
  { year: 2004, name: "MapReduce", mathematician: "Dean & Ghemawat (Google)", contribution: "Distributed shuffling over commodity machines. Hadoop, Spark, Flink all descend from this.", pageId: "modern-big-data", era: "2000+" },
  { year: 2006, name: "Deep Belief Network", mathematician: "Hinton, Osindero, Teh", contribution: "Greedy layer-wise pretraining → deep learning era begins. Hinton's solution to vanishing gradient.", pageId: "deep-learning", era: "2000+" },
  { year: 2014, name: "Generative Adversarial Net", mathematician: "Ian Goodfellow", contribution: "Minimax game between generator + discriminator. StyleGAN, Stable Diffusion lineage.", pageId: "generative-ai", era: "2000+" },
  { year: 2016, name: "AlphaGo", mathematician: "Silver et al. (DeepMind)", contribution: "Monte Carlo Tree Search + deep RL beats Lee Sedol. The 'intuition' came from self-play.", pageId: "reinforcement-learning", era: "2000+" },
  { year: 2017, name: "Attention Is All You Need", mathematician: "Vaswani et al. (Google)", contribution: "softmax(QK^T/√d_k) × V. GPT-4, AlphaFold2, Stable Diffusion all use this single operation.", pageId: "transformer", era: "2000+" },
  { year: 2020, name: "GPT-3", mathematician: "Brown et al. (OpenAI)", contribution: "175B params, few-shot emergence. First model where 'scale → emergent ability' became undeniable.", pageId: "llm-training", era: "2000+" },
  { year: 2021, name: "AlphaFold2", mathematician: "Jumper et al. (DeepMind)", contribution: "Attention + SE(3)-equivariant diffusion → protein structure from sequence. 200M structures predicted.", pageId: "boltz", era: "2000+" },
  { year: 2022, name: "Diffusion models beat GANs", mathematician: "Dhariwal & Sutskever (OpenAI)", contribution: "Classifier-free guidance + DDPM reverse SDE. Stable Diffusion, DALL-E, Midjourney all use this.", pageId: "diffusion-models-deep-dive", era: "2000+" },
  { year: 2024, name: "AlphaFold3 + Boltz", mathematician: "DeepMind + Boltz OSS", contribution: "Protein-ligand complex structure. Open-source Boltz (MIT license) matches DeepMind's commercial model.", pageId: "boltz", era: "2000+" },
];

interface HoveredMilestone {
  milestone: Milestone;
  x: number;
  y: number;
}

const MARGIN = { top: 20, right: 40, bottom: 30, left: 80 };

export function GenealogyTimeline() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(900);
  const [hovered, setHovered] = useState<HoveredMilestone | null>(null);
  const [activated, setActivated] = useState(false);
  const router = useRouter();

  // Height depends on number of milestones (~30px each).
  const SVG_HEIGHT = Math.max(600, MILESTONES.length * 32 + MARGIN.top + MARGIN.bottom);

  // Track container width.
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(Math.max(360, e.contentRect.width));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || width < 360 || !activated) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const innerWidth = width - MARGIN.left - MARGIN.right;
    const innerHeight = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;

    // Y scale: year → vertical position (top = oldest).
    const y = d3.scaleLinear()
      .domain([1700, 2025])
      .range([0, innerHeight]);

    const g = svg.append("g").attr("transform", `translate(${MARGIN.left}, ${MARGIN.top})`);

    // Vertical axis line (the spine of the timeline).
    const spineX = 30;
    g.append("line")
      .attr("x1", spineX)
      .attr("y1", 0)
      .attr("x2", spineX)
      .attr("y2", innerHeight)
      .attr("stroke", "currentColor")
      .attr("stroke-opacity", 0.25)
      .attr("stroke-width", 2);

    // Era bands (full-width colored stripes for each era).
    const eraBoundaries: Array<{ era: Milestone["era"]; start: number; end: number }> = [
      { era: "pre-1800", start: 1700, end: 1799 },
      { era: "1800-1900", start: 1800, end: 1899 },
      { era: "1900-1950", start: 1900, end: 1949 },
      { era: "1950-2000", start: 1950, end: 1999 },
      { era: "2000+", start: 2000, end: 2025 },
    ];

    for (const band of eraBoundaries) {
      const yTop = y(band.start);
      const yBot = y(band.end);
      const yHeight = Math.max(0, yBot - yTop);
      g.append("rect")
        .attr("x", 0)
        .attr("y", yTop)
        .attr("width", innerWidth)
        .attr("height", yHeight)
        .attr("fill", ERA_COLORS[band.era])
        .attr("fill-opacity", 0.05)
        .attr("stroke", ERA_COLORS[band.era])
        .attr("stroke-opacity", 0.15)
        .attr("stroke-width", 0.5);

      // Era label on the right side of the band.
      g.append("text")
        .attr("x", innerWidth - 4)
        .attr("y", yTop + yHeight / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .attr("font-size", "8px")
        .attr("font-weight", "600")
        .attr("letter-spacing", "0.05em")
        .attr("fill", ERA_COLORS[band.era])
        .attr("fill-opacity", 0.7)
        .text(ERA_LABELS[band.era].toUpperCase());
    }

    // Y-axis (year) on the left.
    const yAxis = d3.axisLeft(y).ticks(15).tickFormat((d) => `${d}`);
    g.append("g")
      .attr("transform", `translate(${spineX - 14}, 0)`)
      .call(yAxis as any)
      .call((sel) => sel.selectAll("text").attr("font-size", "9px").attr("fill", "currentColor"))
      .call((sel) => sel.selectAll("line").attr("stroke", "currentColor").attr("stroke-opacity", 0.3));

    // Milestones — alternate left/right of the spine for visual rhythm.
    const milestonesG = g.append("g");

    MILESTONES.forEach((m, i) => {
      const yPos = y(m.year);
      const onRight = i % 2 === 0;  // alternate sides
      const offset = 16;
      const group = milestonesG.append("g")
        .attr("transform", `translate(${spineX}, ${yPos})`)
        .attr("cursor", m.pageId ? "pointer" : "default");

      // Connector line from spine to milestone text.
      group.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", onRight ? offset : -offset)
        .attr("y2", 0)
        .attr("stroke", ERA_COLORS[m.era])
        .attr("stroke-width", 1.5);

      // Milestone node (circle on the spine).
      group.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 6)
        .attr("fill", ERA_COLORS[m.era])
        .attr("fill-opacity", 0.9)
        .attr("stroke", "var(--background)")
        .attr("stroke-width", 1.5)
        .on("mouseenter", function (event) {
          d3.select(this).attr("r", 9).attr("fill-opacity", 1);
          setHovered({ milestone: m, x: event.clientX, y: event.clientY });
        })
        .on("mousemove", function (event) {
          setHovered({ milestone: m, x: event.clientX, y: event.clientY });
        })
        .on("mouseleave", function () {
          d3.select(this).attr("r", 6).attr("fill-opacity", 0.9);
          setHovered(null);
        })
        .on("click", function () {
          if (m.pageId) router.push(`/${m.pageId}`);
        });

      // Milestone text (alternating sides).
      const textAnchor = onRight ? "start" : "end";
      const textX = onRight ? offset + 6 : -(offset + 6);
      group.append("text")
        .attr("x", textX)
        .attr("y", -3)
        .attr("text-anchor", textAnchor)
        .attr("font-size", "11px")
        .attr("font-weight", "700")
        .attr("fill", "currentColor")
        .text(`${m.name} (${m.year})`);
      group.append("text")
        .attr("x", textX)
        .attr("y", 9)
        .attr("text-anchor", textAnchor)
        .attr("font-size", "9px")
        .attr("font-weight", "500")
        .attr("fill", ERA_COLORS[m.era])
        .attr("fill-opacity", 0.85)
        .text(`— ${m.mathematician}`);
    });

    return () => {
      svg.selectAll("*").remove();
    };
  }, [width, activated, router]);

  return (
    <div ref={containerRef} className="space-y-3">
      {!activated ? (
        <button
          onClick={() => setActivated(true)}
          className="text-xs px-3 py-2 rounded-md border border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 transition"
        >
          ▶ Load interactive genealogy timeline (D3.js)
        </button>
      ) : (
        <div className="rounded-md border border-border/60 bg-muted/20 overflow-hidden">
          <svg
            ref={svgRef}
            width={width}
            height={SVG_HEIGHT}
            style={{ color: "var(--foreground)", display: "block", maxWidth: "100%" }}
          />
        </div>
      )}

      {hovered && (
        <div
          className="fixed pointer-events-none z-50 px-3 py-2 rounded-md border border-border/60 bg-popover/95 shadow-md text-xs max-w-xs"
          style={{ left: Math.min(hovered.x + 14, (typeof window !== "undefined" ? window.innerWidth : 1200) - 280), top: hovered.y + 14 }}
        >
          <p className="font-semibold text-foreground">{hovered.milestone.name} ({hovered.milestone.year})</p>
          <p className="text-primary font-medium mt-0.5">{hovered.milestone.mathematician}</p>
          <p className="text-muted-foreground mt-1 leading-relaxed">{hovered.milestone.contribution}</p>
          {hovered.milestone.pageId && (
            <p className="text-[9px] uppercase tracking-wider mt-1.5 text-primary/80">
              → /{hovered.milestone.pageId} (click to open)
            </p>
          )}
          <p className="text-[9px] uppercase tracking-wider mt-1" style={{ color: ERA_COLORS[hovered.milestone.era] }}>
            {ERA_LABELS[hovered.milestone.era]}
          </p>
        </div>
      )}
    </div>
  );
}
