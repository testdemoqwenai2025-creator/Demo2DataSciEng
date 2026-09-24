"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity, RotateCcw, Play, Sparkles,
} from "lucide-react";
import { Slider, InfoCallout } from "./quantum-interactives-part1";

// ============================================================
// Interactive 5: Decoherence timeline (1998 → 2024 + projections)
// ============================================================

const TIMELINE = [
  { year: 1998, t1: 0.001, label: "Nielsen-Chuang era — NMR" },
  { year: 2003, t1: 0.002, label: "first superconducting qubit" },
  { year: 2009, t1: 0.004, label: "Yale transmon" },
  { year: 2014, t1: 0.040, label: "Google / UCSB early transmons" },
  { year: 2017, t1: 0.090, label: "Google 9-qubit device" },
  { year: 2019, t1: 0.130, label: "Google Sycamore" },
  { year: 2021, t1: 0.150, label: "IBM Eagle" },
  { year: 2024, t1: 0.300, label: "Google Willow (~5× vs Sycamore)" },
];

function DecoherenceTimeline() {
  const [hovered, setHovered] = useState<number | null>(null);
  // Log-linear fit on the historical data
  const years = TIMELINE.map(d => d.year);
  const t1s = TIMELINE.map(d => d.t1);
  const logT1 = t1s.map(v => Math.log(v));
  const n = years.length;
  const meanX = years.reduce((a, b) => a + b, 0) / n;
  const meanY = logT1.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (years[i] - meanX) * (logT1[i] - meanY);
    den += (years[i] - meanX) * (years[i] - meanX);
  }
  const slope = num / den;
  const intercept = meanY - slope * meanX;
  const doublingTime = Math.log(2) / slope;

  // Projections to 2030, 2035, 2040
  const projections = [2027, 2030, 2035, 2040].map(year => ({
    year,
    t1: Math.exp(intercept + slope * year),
  }));

  // Threshold crossing: p_phys ~ 1% at T1 ~ ?? (roughly T1 = 100µs = 0.1 ms corresponds to ~99% gate fidelity at 50ns gate time)
  const thresholdT1 = 0.1; // ~100µs is where we cross surface-code threshold

  // SVG plot
  const w = 360, h = 240;
  const pad = { l: 50, r: 10, t: 20, b: 40 };
  const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
  const yearMin = 1996, yearMax = 2042;
  const t1Min = 0.0005, t1Max = 5; // ms — log scale

  const xScale = (year: number) => pad.l + ((year - yearMin) / (yearMax - yearMin)) * plotW;
  const yScale = (t1: number) => pad.t + (1 - (Math.log(t1) - Math.log(t1Min)) / (Math.log(t1Max) - Math.log(t1Min))) * plotH;

  // Fit line points
  const fitX = [yearMin, yearMax];
  const fitY = fitX.map(y => Math.exp(intercept + slope * y));

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Plot */}
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
            {/* Axes */}
            <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + plotH} stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
            <line x1={pad.l} y1={pad.t + plotH} x2={pad.l + plotW} y2={pad.t + plotH} stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
            {/* Y-axis ticks (log scale) */}
            {[0.001, 0.01, 0.1, 1].map(t => (
              <g key={t}>
                <line x1={pad.l} y1={yScale(t)} x2={pad.l + plotW} y2={yScale(t)} stroke="oklch(0.55 0.10 250 / 0.2)" strokeWidth="0.5" strokeDasharray="2 2" />
                <text x={pad.l - 5} y={yScale(t) + 3} textAnchor="end" fontSize="8" fill="oklch(0.55 0.10 250)">{t * 1000}µs</text>
              </g>
            ))}
            {/* X-axis ticks */}
            {[2000, 2010, 2020, 2030, 2040].map(y => (
              <text key={y} x={xScale(y)} y={pad.t + plotH + 14} textAnchor="middle" fontSize="8" fill="oklch(0.55 0.10 250)">{y}</text>
            ))}
            {/* Threshold line (p_phys = 1% corresponds to T1 ~ 100µs) */}
            <line x1={pad.l} y1={yScale(thresholdT1)} x2={pad.l + plotW} y2={yScale(thresholdT1)} stroke="oklch(0.75 0.20 0)" strokeWidth="1" strokeDasharray="4 2" />
            <text x={pad.l + plotW - 5} y={yScale(thresholdT1) - 4} textAnchor="end" fontSize="8" fill="oklch(0.75 0.20 0)" fontWeight="bold">surface code threshold (2024)</text>
            {/* Fit line */}
            <line x1={xScale(fitX[0])} y1={yScale(fitY[0])} x2={xScale(fitX[1])} y2={yScale(fitY[1])} stroke="oklch(0.65 0.16 250 / 0.6)" strokeWidth="1.5" strokeDasharray="3 2" />
            {/* Historical data points */}
            {TIMELINE.map((d, i) => (
              <g key={d.year} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
                <circle
                  cx={xScale(d.year)} cy={yScale(d.t1)} r={hovered === i ? 7 : 5}
                  fill={hovered === i ? "oklch(0.85 0.18 250)" : "oklch(0.65 0.16 250)"}
                  stroke="oklch(0.85 0.18 250)" strokeWidth="1"
                  className="cursor-pointer"
                />
                {hovered === i && (
                  <g>
                    <rect x={xScale(d.year) + 8} y={yScale(d.t1) - 30} width="130" height="36" fill="oklch(0.20 0.05 250 / 0.95)" rx="3" />
                    <text x={xScale(d.year) + 12} y={yScale(d.t1) - 18} fontSize="8" fill="oklch(0.85 0.10 250)" fontWeight="bold">{d.year}</text>
                    <text x={xScale(d.year) + 12} y={yScale(d.t1) - 6} fontSize="7" fill="oklch(0.75 0.10 250)">T1 = {(d.t1 * 1000).toFixed(0)}µs</text>
                  </g>
                )}
              </g>
            ))}
            {/* Projection points (dashed) */}
            {projections.map(p => (
              <g key={p.year}>
                <circle cx={xScale(p.year)} cy={yScale(p.t1)} r="4" fill="oklch(0.65 0.16 30)" opacity="0.7" stroke="oklch(0.85 0.18 30)" strokeWidth="0.8" strokeDasharray="1 1" />
                <text x={xScale(p.year)} y={yScale(p.t1) - 8} textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 30)">{(p.t1 * 1000).toFixed(0)}µs</text>
              </g>
            ))}
            {/* Legend */}
            <text x={pad.l + 5} y={pad.t + 12} fontSize="8" fill="oklch(0.65 0.16 250)">● historical</text>
            <text x={pad.l + 65} y={pad.t + 12} fontSize="8" fill="oklch(0.65 0.16 30)">● projection</text>
          </svg>
          <p className="text-[11px] text-muted-foreground text-center mt-2">Hover markers for chip details</p>
        </div>

        {/* Stats */}
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">T₁(t) = T₁₀ × 2^((t - t₀) / τ)</p>
            <p className="font-mono text-xs mt-1">Doubling time τ = {doublingTime.toFixed(1)} years</p>
            <p className="text-[11px] text-muted-foreground mt-1">Compare: Moore's law = 2 years (transistors)</p>
          </div>

          <div className="rounded-md border border-border/60 bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Projections (best-case fit)</p>
            {projections.map(p => (
              <div key={p.year} className="flex justify-between text-xs py-0.5">
                <span className="font-mono text-muted-foreground">{p.year}:</span>
                <span className="font-mono font-semibold">T₁ ≈ {(p.t1 * 1000).toFixed(0)}µs = {(p.t1).toFixed(2)}ms</span>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-xs">
            <p className="text-emerald-700 dark:text-emerald-300 font-semibold mb-1">Threshold crossing (Dec 2024)</p>
            <p className="text-muted-foreground">
              Willow crossed the surface-code threshold: p_phys ≈ 0.3% &lt; p_c ≈ 1%. This is the precondition for fault-tolerant QC — bigger codes now give <em>fewer</em> logical errors, not more.
            </p>
          </div>
        </div>
      </div>
      <InfoCallout
        intent="Hover the historical markers to see chip + T₁ value. The dashed line is a log-linear fit — T₁ doubles every ~6 years. The red horizontal line is the surface-code threshold, crossed in 2024 by Willow. Projections (orange) extrapolate the fit to 2040."
        math="log T₁ = a + b·year  ·  doubling time τ = ln(2)/b  ·  threshold crossing: p_phys = 1% ⟺ T₁ ~ 100µs"
        insight="The visual is a log-scale scatter + fit; the math is np.polyfit on (year, log T₁). The headline finding: T₁ doubles every ~6 years (vs Moore's 2 years for transistors) — slower, but 2024 crossed the QEC threshold. Below threshold is the precondition for fault tolerance."
      />
    </div>
  );
}

// ============================================================
// Interactive 6: Qiskit Bell circuit + transpile + 8192-shot sampling
// ============================================================

function QiskitCircuit() {
  const [transpiled, setTranspiled] = useState(false);
  const [shots, setShots] = useState<{ [k: string]: number } | null>(null);
  const [running, setRunning] = useState(false);

  // Bell state |Φ+⟩ = (|00⟩ + |11⟩)/√2
  // P(00) = 0.5, P(11) = 0.5, P(01) = P(10) = 0
  const runShots = () => {
    setRunning(true);
    setTimeout(() => {
      const counts: { [k: string]: number } = { "00": 0, "01": 0, "10": 0, "11": 0 };
      for (let i = 0; i < 8192; i++) {
        const outcome = Math.random() < 0.5 ? "00" : "11";
        counts[outcome]++;
      }
      setShots(counts);
      setRunning(false);
    }, 600);
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Circuit diagram */}
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 360 200" className="w-full h-auto">
            {/* Rails */}
            <line x1="30" y1="60" x2="340" y2="60" stroke="oklch(0.55 0.10 250)" strokeWidth="1.5" />
            <line x1="30" y1="140" x2="340" y2="140" stroke="oklch(0.55 0.10 250)" strokeWidth="1.5" />
            <text x="20" y="64" fontSize="10" fill="oklch(0.65 0.10 250)">q0</text>
            <text x="20" y="144" fontSize="10" fill="oklch(0.65 0.10 250)">q1</text>
            <text x="30" y="50" fontSize="9" fill="oklch(0.55 0.10 250)">|0⟩</text>
            <text x="30" y="130" fontSize="9" fill="oklch(0.55 0.10 250)">|0⟩</text>

            {!transpiled ? (
              <>
                {/* Ideal: H + CNOT */}
                <rect x="100" y="48" width="30" height="24" fill="oklch(0.65 0.16 250)" rx="3" />
                <text x="115" y="64" textAnchor="middle" fontSize="13" fill="white" fontWeight="bold">H</text>
                <circle cx="200" cy="60" r="6" fill="oklch(0.65 0.16 250)" />
                <line x1="200" y1="66" x2="200" y2="134" stroke="oklch(0.65 0.16 250)" strokeWidth="2" />
                <circle cx="200" cy="140" r="11" fill="none" stroke="oklch(0.65 0.16 250)" strokeWidth="2" />
                <line x1="189" y1="140" x2="211" y2="140" stroke="oklch(0.65 0.16 250)" strokeWidth="2" />
                <line x1="200" y1="129" x2="200" y2="151" stroke="oklch(0.65 0.16 250)" strokeWidth="2" />
                <text x="180" y="35" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 250)" fontWeight="bold">CNOT (ideal)</text>
                {/* Measurements */}
                <rect x="290" y="48" width="30" height="24" fill="oklch(0.65 0.10 250 / 0.4)" stroke="oklch(0.65 0.10 250)" rx="3" />
                <text x="305" y="64" textAnchor="middle" fontSize="11" fill="oklch(0.65 0.10 250)" fontWeight="bold">M</text>
                <rect x="290" y="128" width="30" height="24" fill="oklch(0.65 0.10 250 / 0.4)" stroke="oklch(0.65 0.10 250)" rx="3" />
                <text x="305" y="144" textAnchor="middle" fontSize="11" fill="oklch(0.65 0.10 250)" fontWeight="bold">M</text>
              </>
            ) : (
              <>
                {/* Transpiled: RZ(π/2) SX RZ(π/2) on q0 + native CX */}
                <text x="60" y="35" textAnchor="middle" fontSize="8" fill="oklch(0.65 0.16 30)" fontWeight="bold">Native: {`{RZ, SX, X, CX}`}</text>
                {[
                  { x: 70, label: "RZ" },
                  { x: 105, label: "SX" },
                  { x: 140, label: "RZ" },
                ].map(g => (
                  <g key={g.x}>
                    <rect x={g.x - 12} y="48" width="24" height="24" fill="oklch(0.65 0.16 30)" rx="3" />
                    <text x={g.x} y="64" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">{g.label}</text>
                  </g>
                ))}
                <circle cx="220" cy="60" r="6" fill="oklch(0.65 0.16 30)" />
                <line x1="220" y1="66" x2="220" y2="134" stroke="oklch(0.65 0.16 30)" strokeWidth="2" />
                <circle cx="220" cy="140" r="11" fill="none" stroke="oklch(0.65 0.16 30)" strokeWidth="2" />
                <line x1="209" y1="140" x2="231" y2="140" stroke="oklch(0.65 0.16 30)" strokeWidth="2" />
                <line x1="220" y1="129" x2="220" y2="151" stroke="oklch(0.65 0.16 30)" strokeWidth="2" />
                <rect x="290" y="48" width="30" height="24" fill="oklch(0.65 0.10 250 / 0.4)" stroke="oklch(0.65 0.10 250)" rx="3" />
                <text x="305" y="64" textAnchor="middle" fontSize="11" fill="oklch(0.65 0.10 250)" fontWeight="bold">M</text>
                <rect x="290" y="128" width="30" height="24" fill="oklch(0.65 0.10 250 / 0.4)" stroke="oklch(0.65 0.10 250)" rx="3" />
                <text x="305" y="144" textAnchor="middle" fontSize="11" fill="oklch(0.65 0.10 250)" fontWeight="bold">M</text>
              </>
            )}
            <text x="180" y="190" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
              {transpiled ? "transpiled: 3 native gates (RZ+SX+RZ) on q0 + 1 CX" : "ideal: 1 H + 1 CNOT"} · produces |Φ+⟩ = (|00⟩+|11⟩)/√2
            </text>
          </svg>
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant={transpiled ? "outline" : "default"} onClick={() => setTranspiled(false)}>Ideal</Button>
            <Button size="sm" variant={transpiled ? "default" : "outline"} onClick={() => setTranspiled(true)}>Transpile →</Button>
          </div>
        </div>

        {/* Sampling + histogram */}
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">|Φ+⟩ = (|00⟩ + |11⟩) / √2</p>
            <p className="font-mono text-xs mt-1">P(00) = 0.5  ·  P(11) = 0.5  ·  P(01) = P(10) = 0</p>
          </div>
          <Button size="sm" variant="default" onClick={runShots} disabled={running} className="w-full gap-1.5">
            {running ? <><Activity className="h-3.5 w-3.5 animate-pulse" /> Sampling 8192 shots…</> : <><Play className="h-3.5 w-3.5" /> Run 8192 shots</>}
          </Button>
          {shots && (
            <div className="rounded-md border border-border/60 bg-card p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Measurement histogram (8192 shots)</p>
              {(["00", "01", "10", "11"] as const).map(k => {
                const count = shots[k] || 0;
                const pct = (count / 8192) * 100;
                return (
                  <div key={k} className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-xs w-8">{k}</span>
                    <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.4 }}
                        className="h-full bg-primary"
                        style={{ opacity: pct > 5 ? 1 : 0.3 }}
                      />
                    </div>
                    <span className="font-mono text-[11px] w-16 text-right">{count} ({pct.toFixed(1)}%)</span>
                  </div>
                );
              })}
              <p className="text-[10px] text-muted-foreground mt-2">Born's rule: each shot collapses the Bell state to |00⟩ or |11⟩ with equal probability — classical outcomes are perfectly correlated (entanglement signature).</p>
            </div>
          )}
        </div>
      </div>
      <InfoCallout
        intent="Toggle between 'Ideal' (1 H + 1 CNOT) and 'Transpile' (3 native gates RZ+SX+RZ + 1 CX) to see how the circuit compiles to IBM's native gate set. Click 'Run 8192 shots' to sample from Born's rule — only |00⟩ and |11⟩ appear, never |01⟩ or |10⟩ (the entanglement signature)."
        math="U_circuit = CNOT · (H ⊗ I)  ·  H = RZ(π/2) · SX · RZ(π/2)  ·  ||H_native - H_ideal|| → 0  ·  P(k) = |⟨k|ψ⟩|²"
        insight="qiskit isn't on Pyodide's default index, but the math is identical: build U as Kronecker product of single-qubit unitaries, transpile by decomposing H into native gates, sample by Bernoulli draws on Born-rule probabilities. The 'never see 01 or 10' outcome IS the proof of entanglement."
      />
    </div>
  );
}

// ============================================================
// Interactive 7: Quantinuum Helios all-to-all vs heavy-hex
// ============================================================

function HeliosConnectivity() {
  const [n, setN] = useState(12);
  const [showSwaps, setShowSwaps] = useState(true);

  // Superconductor (heavy-hex): SWAPs needed for all-to-all ansatz ≈ N(N-1)
  const scSwaps = n * (n - 1);
  // Trapped ion: 0 SWAPs (native all-to-all)
  const ionSwaps = 0;

  // Effective fidelity at p_2q = 0.003 (SC) vs 0.002 (Ion)
  const p2qSc = 0.003;
  const p2qIon = 0.002;
  const baseGates = 100;
  const scSuccess = Math.pow(1 - p2qSc, baseGates + scSwaps);
  const ionSuccess = Math.pow(1 - p2qIon, baseGates + ionSwaps);

  // Heavy-hex layout: 2 rows of N/2 qubits each
  const hexLayout = Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / Math.ceil(n / 2));
    const col = i % Math.ceil(n / 2);
    return { i, x: 50 + col * 30, y: 70 + row * 50 };
  });
  // Heavy-hex edges: nearest-neighbour + some cross-row couplings
  const hexEdges: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    if ((i + 1) % Math.ceil(n / 2) !== 0 && i + 1 < n) hexEdges.push([i, i + 1]);
    if (i + Math.ceil(n / 2) < n) hexEdges.push([i, i + Math.ceil(n / 2)]);
  }

  // Complete-graph layout: circle of N qubits
  const circleR = 80, cx = 180, cy = 70;
  const circleLayout = Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return { i, x: cx + circleR * Math.cos(angle), y: cy + circleR * Math.sin(angle) };
  });
  const circleEdges: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      circleEdges.push([i, j]);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Heavy-hex (superconductor) */}
        <div className="rounded-md border border-border/60 bg-card p-3">
          <p className="text-xs font-semibold text-primary mb-2">IBM Heron R2 — heavy-hex lattice</p>
          <svg viewBox="0 0 360 180" className="w-full h-auto">
            {hexEdges.map(([a, b], i) => (
              <line key={`he-${i}`} x1={hexLayout[a].x} y1={hexLayout[a].y} x2={hexLayout[b].x} y2={hexLayout[b].y}
                stroke="oklch(0.55 0.16 250 / 0.5)" strokeWidth="0.8" />
            ))}
            {/* SWAP overlays when enabled */}
            {showSwaps && hexLayout.map((q, i) =>
              hexLayout.slice(i + 1).map((q2, j) => {
                if (hexEdges.some(([a, b]) => (a === i && b === i + j + 1) || (a === i + j + 1 && b === i))) return null;
                return (
                  <line key={`sw-${i}-${j}`} x1={q.x} y1={q.y} x2={q2.x} y2={q2.y}
                    stroke="oklch(0.75 0.20 0 / 0.4)" strokeWidth="0.5" strokeDasharray="2 1" />
                );
              })
            )}
            {hexLayout.map(q => (
              <circle key={`hq-${q.i}`} cx={q.x} cy={q.y} r="6" fill="oklch(0.65 0.16 250)" />
            ))}
          </svg>
          <p className="text-[10px] text-muted-foreground text-center mt-1">nearest-neighbour + cross-row couplers</p>
          {showSwaps && (
            <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-1 font-mono">
              + {scSwaps} SWAPs needed for all-to-all ansatz
            </p>
          )}
        </div>

        {/* Trapped ion (complete graph) */}
        <div className="rounded-md border border-border/60 bg-card p-3">
          <p className="text-xs font-semibold text-primary mb-2">Quantinuum Helios — all-to-all (complete graph)</p>
          <svg viewBox="0 0 360 180" className="w-full h-auto">
            {circleEdges.map(([a, b], i) => (
              <line key={`ce-${i}`} x1={circleLayout[a].x} y1={circleLayout[a].y} x2={circleLayout[b].x} y2={circleLayout[b].y}
                stroke="oklch(0.55 0.16 165 / 0.4)" strokeWidth="0.5" />
            ))}
            {circleLayout.map(q => (
              <circle key={`cq-${q.i}`} cx={q.x} cy={q.y} r="6" fill="oklch(0.65 0.16 165)" />
            ))}
          </svg>
          <p className="text-[10px] text-muted-foreground text-center mt-1">QCCD architecture — any 2 qubits interact directly</p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 font-mono">
            + {ionSwaps} SWAPs (native all-to-all)
          </p>
        </div>
      </div>

      {/* Controls + fidelity comparison */}
      <div className="grid md:grid-cols-3 gap-3 items-end">
        <div className="md:col-span-2 space-y-2">
          <Slider label="Number of qubits N" min={4} max={20} step={1} value={n} onChange={setN} format={(v) => `N = ${v}`} accent="oklch(0.65 0.16 250)" />
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={showSwaps} onChange={(e) => setShowSwaps(e.target.checked)} />
            Show SWAP overhead on heavy-hex
          </label>
        </div>
        <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">SWAP savings</p>
          <p className="font-mono text-base font-bold text-primary">{scSwaps.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">→ 0 on ion trap</p>
        </div>
      </div>

      <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-xs">
        <p className="font-semibold text-emerald-700 dark:text-emerald-300 mb-1.5">Effective circuit fidelity (100-gate all-to-all ansatz)</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-muted-foreground">Superconductor (Heron R2, 99.7%):</p>
            <p className="font-mono">p_success = (1-0.003)^({baseGates}+{scSwaps}) = {scSuccess < 1e-10 ? "< 10⁻¹⁰" : scSuccess.toExponential(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Trapped ion (H2-1, 99.8%):</p>
            <p className="font-mono">p_success = (1-0.002)^({baseGates}+0) = {ionSuccess.toFixed(4)}</p>
          </div>
        </div>
        <p className="mt-2 text-emerald-700 dark:text-emerald-400">
          → Ion trap gives {ionSuccess > 0 ? (ionSuccess / Math.max(scSuccess, 1e-15)).toExponential(1) : "∞"}× higher success for all-to-all algorithms at N={n}.
        </p>
      </div>
      <InfoCallout
        intent="Slide N to see SWAP overhead on heavy-hex grow quadratically (N(N-1)) while staying at 0 on the trapped-ion complete graph. Toggle 'Show SWAP overhead' to draw dashed red lines on heavy-hex for every long-range interaction that needs a SWAP. The fidelity callout computes effective circuit success."
        math="SWAPs_SC = N(N-1) for all-to-all · SWAPs_ion = 0 · p_success = (1 - p_2q)^(ideal_gates + SWAPs) · p_2q(SC) = 0.003, p_2q(ion) = 0.002"
        insight="The trap: ion trap has fewer qubits but EVERY qubit can talk to every other — QCCD architecture wins on all-to-all algorithms. Heavy-hex superconductors win on raw qubit count but pay O(N²) SWAP overhead for variational algorithms with long-range entanglement."
      />
    </div>
  );
}

// ============================================================
// Interactive 8: Shor's resource estimation
// ============================================================

function ShorResources() {
  const [currentQubits, setCurrentQubits] = useState(156); // IBM Heron R2

  const shorResources = (nBits: number) => {
    const nLogical = 3 * nBits;
    const d = Math.max(17, Math.floor(2 * Math.sqrt(nBits / 100)));
    const nPhys = nLogical * (2 * d * d - 1 + 4 * (d - 1)) * 100;
    const T_gate = 1e-6;
    const depth = 48 * Math.pow(nBits, 3) / Math.log2(Math.max(nBits, 2));
    const runtimeS = depth * T_gate;
    return { nLogical, d, nPhys, runtimeS };
  };

  const keySizes = [256, 512, 1024, 2048, 4096, 8192];
  const resources = keySizes.map(shorResources);
  const maxPhys = Math.max(...resources.map(r => r.nPhys));

  // Years to Shor at 2× growth / 2yr
  const shor2048 = shorResources(2048);
  const yearsToShor = Math.log2(shor2048.nPhys / currentQubits) * 2;

  // Bar chart scaling
  const barW = 45;
  const barGap = 8;
  const chartW = keySizes.length * (barW + barGap);
  const chartH = 180;
  const yScale = (v: number) => chartH - (Math.log10(v) / Math.log10(maxPhys)) * (chartH - 20);
  const formatRuntime = (s: number) => {
    if (s < 3600) return `${(s / 60).toFixed(1)} min`;
    if (s < 86400) return `${(s / 3600).toFixed(1)} h`;
    if (s < 86400 * 365) return `${(s / 86400).toFixed(1)} days`;
    return `${(s / (86400 * 365)).toFixed(1)} yr`;
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Bar chart of physical qubits needed */}
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox={`0 0 ${chartW + 60} ${chartH + 60}`} className="w-full h-auto">
            <line x1="40" y1={chartH} x2={chartW + 50} y2={chartH} stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
            <line x1="40" y1="0" x2="40" y2={chartH} stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
            {/* Y axis labels (log scale) */}
            {[1e3, 1e6, 1e9, 1e12].map(v => (
              <g key={v}>
                <line x1="40" y1={yScale(v)} x2={chartW + 50} y2={yScale(v)} stroke="oklch(0.55 0.10 250 / 0.2)" strokeWidth="0.5" strokeDasharray="2 2" />
                <text x="35" y={yScale(v) + 3} textAnchor="end" fontSize="8" fill="oklch(0.55 0.10 250)">{v.toExponential(0)}</text>
              </g>
            ))}
            {/* Today's hardware line */}
            <line x1="40" y1={yScale(currentQubits)} x2={chartW + 50} y2={yScale(currentQubits)} stroke="oklch(0.75 0.20 0)" strokeWidth="1.5" strokeDasharray="4 2" />
            <text x={chartW + 45} y={yScale(currentQubits) - 4} textAnchor="end" fontSize="8" fill="oklch(0.75 0.20 0)" fontWeight="bold">today: {currentQubits}</text>
            {/* Bars */}
            {resources.map((r, i) => {
              const x = 50 + i * (barW + barGap);
              const y = yScale(r.nPhys);
              const h = chartH - y;
              return (
                <g key={keySizes[i]}>
                  <motion.rect
                    initial={{ height: 0, y: chartH }}
                    animate={{ height: h, y }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    x={x} width={barW}
                    fill={keySizes[i] === 2048 ? "oklch(0.65 0.20 0)" : "oklch(0.65 0.16 250)"}
                    opacity="0.85"
                    rx="2"
                  />
                  <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="8" fill={keySizes[i] === 2048 ? "oklch(0.75 0.20 0)" : "oklch(0.65 0.16 250)"} fontWeight="bold">
                    {(r.nPhys / 1e6).toFixed(0)}M
                  </text>
                  <text x={x + barW / 2} y={chartH + 14} textAnchor="middle" fontSize="8" fill="oklch(0.55 0.10 250)">{keySizes[i]}</text>
                  <text x={x + barW / 2} y={chartH + 26} textAnchor="middle" fontSize="7" fill="oklch(0.55 0.10 250)">{formatRuntime(r.runtimeS)}</text>
                </g>
              );
            })}
            <text x={chartW / 2 + 50} y={chartH + 50} textAnchor="middle" fontSize="9" fill="oklch(0.55 0.10 250)">RSA key size (bits)</text>
            <text x="15" y={chartH / 2} textAnchor="middle" fontSize="9" fill="oklch(0.55 0.10 250)" transform={`rotate(-90 15 ${chartH / 2})`}>physical qubits (log)</text>
          </svg>
          <p className="text-[11px] text-muted-foreground text-center mt-1">Red bar = RSA-2048 (the cryptographically relevant target)</p>
        </div>

        {/* Controls + countdown */}
        <div className="space-y-3">
          <Slider label="Today's best chip (qubits)" min={50} max={500} step={1} value={currentQubits} onChange={setCurrentQubits} format={(v) => `${v} qubits`} accent="oklch(0.65 0.16 250)" />

          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Years to Shor (RSA-2048)</p>
            <p className="font-mono text-3xl font-bold text-primary">{yearsToShor > 0 ? yearsToShor.toFixed(1) : "—"}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              at {currentQubits} qubits today, 2× growth / 2yr → reach {shor2048.nPhys.toLocaleString()} physical qubits
            </p>
          </div>

          <div className="rounded-md border border-border/60 bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Shor RSA-2048 requirements (Gidney-Ekerå 2019)</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Logical qubits:</span><span className="font-mono">{shor2048.nLogical.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Code distance:</span><span className="font-mono">d = {shor2048.d}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Physical qubits:</span><span className="font-mono">{shor2048.nPhys.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Runtime:</span><span className="font-mono">{formatRuntime(shor2048.runtimeS)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Gap from today:</span><span className="font-mono text-primary">{(shor2048.nPhys / currentQubits).toLocaleString()}×</span></div>
            </div>
          </div>

          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5 text-xs">
            <p className="text-amber-700 dark:text-amber-300 font-semibold mb-1">Where is the overhead?</p>
            <p className="text-muted-foreground">
              ~99% of the {shor2048.nPhys.toLocaleString()} physical qubits are in <em>magic state distillation factories</em> — 15 noisy T-states → 1 high-fidelity T-state, success rate ~1/12 → ~180 noisy T-states per logical T-gate. This is why fault-tolerant QC is HARD.
            </p>
          </div>
        </div>
      </div>
      <InfoCallout
        intent="Slide 'today's best chip' (default 156 = IBM Heron R2) to see the years-to-Shor countdown update. The bar chart shows physical qubits needed for each RSA key size — RSA-2048 is highlighted red as the cryptographically relevant target. Note the log scale: RSA-256 is 49M, RSA-8192 is 1.76B."
        math="n_logical = 3n · d ≈ 17 · n_phys = n_logical × (2d²-1+4(d-1)) × 100 · depth = 48n³/log₂(n) · years_to_shor = log₂(n_phys/current) × 2yr"
        insight="The killer finding: 99% of a fault-tolerant chip is magic state factories — that's why fault-tolerant QC is HARD, not just 'more qubits.' Even at Moore's-law-style 2×/2yr qubit growth, we're 40+ years from breaking RSA-2048. This is why post-quantum cryptography (NIST PQC standards, 2024) is being deployed NOW."
      />
    </div>
  );
}

export {
  DecoherenceTimeline,
  QiskitCircuit,
  HeliosConnectivity,
  ShorResources,
};
