"use client";

/**
 * FutureTimeline — D3.js interactive timeline for the /future page.
 *
 * Replaces the previous HTML/CSS bar implementation with an SVG-based
 * timeline that supports hover tooltips, lazy-loading, and responsive
 * width.
 *
 * Three horizontal swimlanes stacked vertically:
 *   1. Equations (green) — 1763 to 2025 — the math that survives
 *   2. Tools (blue) — 2001 to 2025 — current tool implementations
 *   3. Future (orange) — ~2030 to ~2038 — projected replacements
 *
 * All three share ONE year-axis (1750 → 2050) so the reader sees the
 * density contrast: equations span 250+ years, tools span 22, future
 * replacements span 15.
 *
 * Pattern matches existing D3 components (elegant-code-graph.tsx,
 * skill-graph.tsx): useRef + useEffect + d3.select + ResizeObserver
 * + lazy-gate `activated` state to avoid simulation jank.
 */
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface TimelineItem {
  name: string;
  year: number;
  description?: string;
}

interface TimelineLane {
  key: "equations" | "tools" | "future";
  label: string;
  color: string;
  bgColor: string;
  items: TimelineItem[];
}

const LANES: TimelineLane[] = [
  {
    key: "equations",
    label: "Equations (invented 1700s-2010s — SURVIVE)",
    color: "oklch(0.65 0.16 150)",
    bgColor: "oklch(0.65 0.05 150 / 0.08)",
    items: [
      { name: "Bayes", year: 1763, description: "P(H|D) = P(D|H)P(H)/P(D) — belief updater, spam filter + AlphaMissense" },
      { name: "Euler method", year: 1768, description: "y(t+Δt) = y(t) + f(t,y)·Δt — seed of all numerical integration" },
      { name: "Haversine", year: 1805, description: "Great-circle distance on a sphere — maritime, aviation, astronomy" },
      { name: "Fourier", year: 1822, description: "Heat equation → spectral decomposition → FFT" },
      { name: "Navier-Stokes", year: 1822, description: "∂u/∂t + u·∇u = -∇p/ρ + ν∇²u — universal flow PDE" },
      { name: "Gradient Descent", year: 1847, description: "Cauchy 1847 — θ(t+1) = θ(t) - η∇L(θ)" },
      { name: "SVD", year: 1873, description: "Beltrami & Jordan — A = UΣV^T, universal matrix decomposition" },
      { name: "Boltzmann entropy", year: 1877, description: "S = k log W — same formula as Shannon H" },
      { name: "GBM", year: 1900, description: "Bachelier 1900 — dS = μS·dt + σS·dW, the universal SDE" },
      { name: "Markov chain", year: 1906, description: "π(t+1) = π(t)·P — memoryless state transitions" },
      { name: "Kelly", year: 1956, description: "f* = μ/σ² — optimal bet-sizing (Thorp, Simons, Haldane)" },
      { name: "Lloyd's algo", year: 1957, description: "k-means clustering — Bell Labs PCM quantization" },
      { name: "Kalman filter", year: 1960, description: "x̂(t+1) = x̂(t) + K·(z − H·x̂(t)) — Apollo navigation" },
      { name: "Verlet", year: 1967, description: "Symplectic integrator — MD, game physics, orbital mechanics" },
      { name: "FFT", year: 1965, description: "Cooley-Tukey O(N log N) — same math, 10⁶× faster" },
      { name: "Monte Carlo", year: 1946, description: "Metropolis (Los Alamos) — neutron transport → option pricing" },
      { name: "Shannon H", year: 1948, description: "H = -Σ p log p — same as Boltzmann + Haldane heterozygosity" },
      { name: "Black-Scholes", year: 1973, description: "C = S·N(d1) − K·e^(−rT)·N(d2) — universal option pricing" },
      { name: "VaR", year: 1994, description: "JPMorgan RiskMetrics — universal tail-risk quantile" },
      { name: "PageRank", year: 1998, description: "Brin & Page — eigenvector centrality for the web (and genes)" },
      { name: "Attention", year: 2017, description: "softmax(QK^T/√d_k) × V — Vaswani et al. — natural selection" },
    ],
  },
  {
    key: "tools",
    label: "Tools (created 2000s-2020s — TURNOVER)",
    color: "oklch(0.65 0.16 240)",
    bgColor: "oklch(0.65 0.05 240 / 0.08)",
    items: [
      { name: "SciPy", year: 2001, description: "scipy.org — wraps FFTPACK, LAPACK, ODEPACK" },
      { name: "QuantLib", year: 2003, description: "Open-source quant finance — Black-Scholes, Heston, HW" },
      { name: "MapReduce", year: 2004, description: "Dean & Ghemawat — Google's distributed shuffling" },
      { name: "NumPy", year: 2005, description: "Travis Oliphant — np.linalg.svd → everything" },
      { name: "geopy", year: 2011, description: "Python geocoding — Bessel 1841 ellipsoid + Haversine" },
      { name: "D3.js", year: 2011, description: "Mike Bostock — data-driven documents (this very graph)" },
      { name: "filterpy", year: 2015, description: "Kalman + EKF + UKF + particle — Python" },
      { name: "PyTorch", year: 2016, description: "Meta FAIR — autograd + GPU tensors" },
      { name: "Pyodide", year: 2018, description: "CPython compiled to WASM — runs in the browser" },
      { name: "AlphaFold2", year: 2021, description: "DeepMind — Attention + SE(3)-equivariance → protein structure" },
      { name: "ESM-2", year: 2023, description: "Meta — protein language model for variant embedding" },
    ],
  },
  {
    key: "future",
    label: "Future replacements (projected ~2030-2040)",
    color: "oklch(0.65 0.16 30)",
    bgColor: "oklch(0.65 0.05 30 / 0.08)",
    items: [
      { name: "WebGPU-AO", year: 2030, description: "WebGPU-native array ops replace NumPy+Pyodide (SVD still SVD)" },
      { name: "AlphaFold-X", year: 2030, description: "Full atomic dynamics — Attention + diffusion + quantum" },
      { name: "WebPython", year: 2030, description: "Native browser Python — no WASM layer" },
      { name: "NSTC", year: 2033, description: "Neuro-symbolic tensor compiler replaces PyTorch (chain rule stays)" },
      { name: "HSG", year: 2033, description: "Holographic spatial graph replaces D3 — force layout stays" },
      { name: "Q-CS", year: 2035, description: "Quantum-optimised columnar store replaces Snowflake (SQL stays)" },
      { name: "Photon mesh", year: 2035, description: "Light-speed event mesh replaces Kafka (Poisson stays)" },
      { name: "100M-Genomes", year: 2035, description: "100M genomes — SVD + PCA still find structure" },
      { name: "SQT", year: 2035, description: "Satellite quantum tracking replaces AIS (Kalman + Haversine stay)" },
      { name: "QOP", year: 2038, description: "Quantum option pricing — amplitude estimation (GBM stays)" },
    ],
  },
];

interface HoveredItem {
  lane: TimelineLane;
  item: TimelineItem;
  x: number;
  y: number;
}

export function FutureTimeline() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(900);
  const [hovered, setHovered] = useState<HoveredItem | null>(null);
  const [activated, setActivated] = useState(false);

  // Year domain for the shared axis.
  const YEAR_MIN = 1740;
  const YEAR_MAX = 2055;

  // Lane Y positions (within a 420-tall SVG).
  const LANE_HEIGHT = 90;
  const LANE_Y: Record<TimelineLane["key"], number> = {
    equations: 60,
    tools: 170,
    future: 280,
  };
  const SVG_HEIGHT = 380;

  // Track container width for responsiveness.
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(Math.max(360, e.contentRect.width));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Render timeline once activated + width is known.
  useEffect(() => {
    if (!svgRef.current || width < 360 || !activated) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const x = d3.scaleLinear().domain([YEAR_MIN, YEAR_MAX]).range([60, width - 30]);
    const xAxis = d3.axisBottom(x).ticks(12).tickFormat((d) => `${d}`);

    // Background swimlane bands.
    for (const lane of LANES) {
      const yTop = LANE_Y[lane.key] - 20;
      svg
        .append("rect")
        .attr("x", 50)
        .attr("y", yTop)
        .attr("width", width - 80)
        .attr("height", LANE_HEIGHT - 10)
        .attr("fill", lane.bgColor)
        .attr("stroke", lane.color)
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 1)
        .attr("rx", 6);

      // Lane label (left side, inside the band)
      svg
        .append("text")
        .attr("x", 60)
        .attr("y", yTop + 14)
        .attr("fill", lane.color)
        .attr("font-size", "9px")
        .attr("font-weight", "600")
        .attr("letter-spacing", "0.05em")
        .text(lane.label);
    }

    // Gridlines (vertical year ticks spanning all three lanes).
    const gridLines = svg.append("g").attr("stroke", "currentColor").attr("stroke-opacity", 0.08).attr("stroke-dasharray", "2,3");
    for (let yr = 1750; yr <= 2050; yr += 25) {
      const xPos = x(yr);
      gridLines
        .append("line")
        .attr("x1", xPos)
        .attr("y1", 40)
        .attr("x2", xPos)
        .attr("y2", 330);
    }

    // Plot each lane's items.
    for (const lane of LANES) {
      const yMid = LANE_Y[lane.key] + 15;

      // Items as circles, with hover handlers.
      const itemGroups = svg
        .append("g")
        .selectAll("g")
        .data(lane.items)
        .enter()
        .append("g")
        .attr("transform", (d) => `translate(${x(d.year)}, ${yMid})`)
        .attr("cursor", "pointer");

      itemGroups
        .append("circle")
        .attr("r", 6)
        .attr("fill", lane.color)
        .attr("fill-opacity", 0.85)
        .attr("stroke", "var(--background)")
        .attr("stroke-width", 1.5)
        .on("mouseenter", function (event, d) {
          d3.select(this).attr("r", 9).attr("fill-opacity", 1);
          setHovered({ lane, item: d as TimelineItem, x: event.clientX, y: event.clientY });
        })
        .on("mousemove", function (event, d) {
          setHovered({ lane, item: d as TimelineItem, x: event.clientX, y: event.clientY });
        })
        .on("mouseleave", function () {
          d3.select(this).attr("r", 6).attr("fill-opacity", 0.85);
          setHovered(null);
        });

      // Label above each circle (rotated -30° to avoid overlap).
      itemGroups
        .append("text")
        .attr("y", -12)
        .attr("text-anchor", "end")
        .attr("font-size", "9px")
        .attr("font-weight", "600")
        .attr("fill", "currentColor")
        .attr("fill-opacity", 0.85)
        .attr("transform", "rotate(-30)")
        .text((d) => `${d.name} (${d.year})`);
    }

    // X-axis at the bottom.
    svg
      .append("g")
      .attr("transform", `translate(0, ${SVG_HEIGHT - 40})`)
      .call(xAxis as any)
      .call((sel) => sel.selectAll("text").attr("font-size", "9px").attr("fill", "currentColor"))
      .call((sel) => sel.selectAll("line").attr("stroke", "currentColor").attr("stroke-opacity", 0.3));

    // Axis label.
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", SVG_HEIGHT - 8)
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("fill", "currentColor")
      .attr("fill-opacity", 0.7)
      .text("Year — note the density: equations span 250 years, tools span 22, future replacements span 15");

    return () => {
      svg.selectAll("*").remove();
    };
  }, [width, activated]);

  return (
    <div ref={containerRef} className="space-y-3">
      {!activated ? (
        <button
          onClick={() => setActivated(true)}
          className="text-xs px-3 py-2 rounded-md border border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 transition"
        >
          ▶ Load interactive timeline (D3.js)
        </button>
      ) : (
        <svg
          ref={svgRef}
          width={width}
          height={SVG_HEIGHT}
          style={{ color: "var(--foreground)", maxWidth: "100%" }}
        />
      )}

      {hovered && (
        <div
          className="fixed pointer-events-none z-50 px-3 py-2 rounded-md border border-border/60 bg-popover/95 shadow-md text-xs max-w-xs"
          style={{ left: Math.min(hovered.x + 14, (typeof window !== "undefined" ? window.innerWidth : 1200) - 240), top: hovered.y + 14 }}
        >
          <p className="font-semibold text-foreground">{hovered.item.name} ({hovered.item.year})</p>
          {hovered.item.description && (
            <p className="text-muted-foreground mt-1 leading-relaxed">{hovered.item.description}</p>
          )}
          <p className="text-[9px] uppercase tracking-wider mt-1.5" style={{ color: hovered.lane.color }}>
            {hovered.lane.label.split("—")[0].trim()}
          </p>
        </div>
      )}
    </div>
  );
}
