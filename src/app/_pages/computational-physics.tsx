"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { Foldable } from "../_components/foldable";
import { ScienceShort } from "../_components/science-short";
import { DatasetCards } from "../_components/dataset-cards";
import { ELEGANT_CODE_CARDS } from "../_components/_elegant_code_cards";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import {
  Cpu, Atom, Sparkles, History, TrendingUp, Boxes,
  Network, Sigma, Zap, Activity, Layers, Gauge, Waves, Grid3x3,
} from "lucide-react";

const KPIS = [
  { label: "Lattice QCD", value: "Wilson fermions + SU(3) gauge", hint: "Path integral on a 4D lattice: S = Σ_x Σ_μ |U_μ(x)|² + Σ_f ψ̄(D[U]+m)ψ. Quarks on sites, gluons on links. Monte Carlo integration with HMC.", deltaTone: "up" as const },
  { label: "Monte Carlo", value: "Metropolis-Hastings + MCMC", hint: "P(accept) = min(1, e^(-ΔE/kT)). Sample from any distribution by detailed balance. O(N) per step. Importance sampling reweights to physical parameters.", deltaTone: "flat" as const },
  { label: "FEA (FEM)", value: "COMSOL + ANSYS", hint: "Weak form: ∫Ω (∇v)·(k∇u) dΩ = ∫Ω f·v dΩ. Galerkin: project onto basis functions, assemble global stiffness matrix K, solve Ku=F. Mesh + adaptive refinement.", deltaTone: "flat" as const },
  { label: "CFD", value: "Navier-Stokes + Re", hint: "∂u/∂t + u·∇u = -∇p/ρ + ν∇²u · Re = ρvL/ν. DNS resolves all turbulence scales (Re^9/4 cells); RANS averages (k-ε model). OpenFOAM + ANSYS Fluent.", deltaTone: "up" as const },
];

// ============================================================
// ScienceShort — 5-phase looping animation
// ============================================================

const SHORT_PHASES = [
  {
    name: "Detector",
    desc: "LHC ATLAS/CMS or sensor array → raw collision events → particle tracks + energy deposits",
    svg: (
      <svg viewBox="0 0 300 120" className="w-full h-auto">
        {/* Concentric detector layers */}
        <circle cx="150" cy="60" r="45" fill="none" stroke="oklch(0.65 0.16 30)" strokeWidth="1.5" opacity="0.5" />
        <circle cx="150" cy="60" r="35" fill="none" stroke="oklch(0.65 0.16 60)" strokeWidth="1.5" opacity="0.5" />
        <circle cx="150" cy="60" r="25" fill="none" stroke="oklch(0.65 0.16 165)" strokeWidth="1.5" opacity="0.5" />
        <circle cx="150" cy="60" r="15" fill="oklch(0.65 0.16 250)20" stroke="oklch(0.65 0.16 250)" strokeWidth="1.5" />
        <text x="150" y="62" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 250)" fontWeight="bold">beam</text>
        {/* Particle tracks */}
        <motion.path d="M150,60 L100,30" stroke="oklch(0.65 0.16 30)" strokeWidth="1.2" fill="none"
          animate={{ pathLength: [0, 1, 1, 0] }} transition={{ duration: 2, repeat: Infinity }} />
        <motion.path d="M150,60 L195,35" stroke="oklch(0.65 0.16 60)" strokeWidth="1.2" fill="none"
          animate={{ pathLength: [0, 1, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.3 }} />
        <motion.path d="M150,60 L210,80" stroke="oklch(0.65 0.16 165)" strokeWidth="1.2" fill="none"
          animate={{ pathLength: [0, 1, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.6 }} />
        <motion.path d="M150,60 L85,90" stroke="oklch(0.65 0.16 250)" strokeWidth="1.2" fill="none"
          animate={{ pathLength: [0, 1, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.9 }} />
        <text x="150" y="115" textAnchor="middle" fontSize="6" fill="var(--muted-foreground)">ATLAS/CMS — tracks + calorimetry</text>
      </svg>
    ),
  },
  {
    name: "Monte Carlo",
    desc: "Metropolis: propose x' → ΔE → accept min(1, e^(-ΔE/kT)) → repeat. Detailed balance → Boltzmann distribution",
    svg: (
      <svg viewBox="0 0 300 120" className="w-full h-auto">
        {/* Target distribution curve */}
        <path d="M20,90 Q60,20 100,40 T180,50 T280,90" fill="none" stroke="oklch(0.65 0.16 165)" strokeWidth="1.5" />
        <text x="150" y="22" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.16 165)" fontWeight="bold">P(x) ∝ exp(-E(x)/kT)</text>
        {/* MCMC samples */}
        {Array.from({length: 20}).map((_, i) => {
          const x = 30 + i * 12;
          // density ~ gaussian centered at 90
          const density = Math.exp(-Math.pow((x-90)/40, 2));
          // acceptance: more samples near peak
          const accepted = Math.random() < density;
          return accepted ? (
            <motion.circle key={i} cx={x} cy={95 + (i%2)*4} r="1.5" fill="oklch(0.65 0.16 30)"
              initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1] }} transition={{ delay: i*0.1, duration: 0.4 }} />
          ) : (
            <circle key={i} cx={x} cy={100} r="1" fill="var(--muted-foreground)" opacity="0.3" />
          );
        })}
        {/* Current walker */}
        <motion.circle cx="60" cy="92" r="3" fill="oklch(0.65 0.16 250)" stroke="oklch(0.65 0.16 250)"
          animate={{ cx: [60, 90, 110, 80, 100, 90] }} transition={{ duration: 3, repeat: Infinity }} />
        <text x="150" y="115" textAnchor="middle" fontSize="6" fill="var(--muted-foreground)">MCMC trace — accepted (red) + rejected (dim)</text>
      </svg>
    ),
  },
  {
    name: "FEM mesh",
    desc: "Mesh: triangles/tetrahedra → weak form ∫Ω (∇v)·(k∇u) dΩ = ∫Ω f·v dΩ → assemble K·u=F",
    svg: (
      <svg viewBox="0 0 300 120" className="w-full h-auto">
        {/* Triangular mesh */}
        {Array.from({length: 4}).map((_, j) =>
          Array.from({length: 3}).map((_, i) => {
            const x0 = 50 + i*60;
            const y0 = 20 + j*28;
            const x1 = x0 + 60;
            const y1 = y0;
            const x2 = x0 + 30;
            const y2 = y0 + 28;
            return (
              <g key={`${i}-${j}`}>
                <polygon points={`${x0},${y0} ${x1},${y0} ${x2},${y2}`}
                  fill={`oklch(0.65 0.16 ${(i*30+j*60)%360})15`}
                  stroke={`oklch(0.65 0.16 ${(i*30+j*60)%360})`} strokeWidth="0.8" />
                <polygon points={`${x1},${y0} ${x0+60},${y0+28} ${x2},${y2}`}
                  fill={`oklch(0.65 0.16 ${(i*30+j*60+90)%360})10`}
                  stroke={`oklch(0.65 0.16 ${(i*30+j*60+90)%360})`} strokeWidth="0.8" />
              </g>
            );
          })
        )}
        {/* Highlight one element */}
        <motion.polygon points="110,20 170,20 140,48" fill="oklch(0.65 0.16 30)40" stroke="oklch(0.65 0.16 30)" strokeWidth="1.5"
          animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} />
        <text x="150" y="115" textAnchor="middle" fontSize="6" fill="var(--muted-foreground)">Triangular mesh — Galerkin assembly</text>
      </svg>
    ),
  },
  {
    name: "Publication",
    desc: "matplotlib: PES diagram, mesh plot, error bars → PRL/Physical Review + Jupyter + arXiv",
    svg: (
      <svg viewBox="0 0 300 120" className="w-full h-auto">
        <rect x="40" y="20" width="80" height="60" rx="4" fill="oklch(0.65 0.16 60)20" stroke="oklch(0.65 0.16 60)" strokeWidth="1" />
        <text x="80" y="35" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 60)" fontWeight="bold">PES / mesh plot</text>
        <polyline points="50,70 65,55 80,62 95,42 105,48 115,40" fill="none" stroke="oklch(0.65 0.16 60)" strokeWidth="1.5" />
        <rect x="170" y="20" width="80" height="60" rx="4" fill="oklch(0.65 0.16 250)20" stroke="oklch(0.65 0.16 250)" strokeWidth="1" />
        <text x="210" y="35" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 250)" fontWeight="bold">PRL/arXiv</text>
        <text x="210" y="50" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 250)">Physical Review</text>
        <text x="210" y="62" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 250)">+ Jupyter reproducibility</text>
        <line x1="122" y1="50" x2="168" y2="50" stroke="var(--border)" strokeWidth="1" markerEnd="url(#pub-arrow)" />
        <defs><marker id="pub-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" /></marker></defs>
      </svg>
    ),
  },
  {
    name: "Marketplace",
    desc: "COMSOL (multiphysics), ANSYS (FEA/CFD), OpenFOAM (open CFD), LAMMPS (MD), CFD Research, Rolls-Royce",
    svg: (
      <svg viewBox="0 0 300 120" className="w-full h-auto">
        <rect x="15" y="20" width="65" height="30" rx="4" fill="oklch(0.65 0.16 30)20" stroke="oklch(0.65 0.16 30)" strokeWidth="1" />
        <text x="47" y="35" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 30)" fontWeight="bold">COMSOL</text>
        <rect x="90" y="20" width="60" height="30" rx="4" fill="oklch(0.65 0.16 165)20" stroke="oklch(0.65 0.16 165)" strokeWidth="1" />
        <text x="120" y="35" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 165)" fontWeight="bold">ANSYS</text>
        <rect x="160" y="20" width="60" height="30" rx="4" fill="oklch(0.65 0.16 250)20" stroke="oklch(0.65 0.16 250)" strokeWidth="1" />
        <text x="190" y="35" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 250)" fontWeight="bold">OpenFOAM</text>
        <rect x="230" y="20" width="55" height="30" rx="4" fill="oklch(0.65 0.16 320)20" stroke="oklch(0.65 0.16 320)" strokeWidth="1" />
        <text x="257" y="35" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 320)" fontWeight="bold">LAMMPS</text>
        <text x="150" y="75" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">Simulation software + defense R&D</text>
        <motion.circle cx="47" cy="55" r="4" fill="oklch(0.65 0.16 30)"
          animate={{ cx: [47, 120, 190, 257, 47] }} transition={{ duration: 3, repeat: Infinity }} />
      </svg>
    ),
  },
];

// ============================================================
// Pyodide demo — Metropolis MCMC sampling
// ============================================================

const MATH_DEMO = `# ============================================================
# Computational Physics — Metropolis-Hastings MCMC
# Pure Python (Pyodide, no numpy)
# ============================================================

import math
import random

# Target distribution: bimodal mixture of two Gaussians
# P(x) ~ 0.4*N(-2, 1) + 0.6*N(2, 1)
# We sample via Metropolis-Hastings.

def target_P(x):
    """Unnormalized target density."""
    # mixture of two Gaussians
    g1 = 0.4 * math.exp(-0.5 * ((x + 2.0) / 1.0) ** 2)
    g2 = 0.6 * math.exp(-0.5 * ((x - 2.0) / 1.0) ** 2)
    return g1 + g2

def metropolis_sampler(x0, n_steps, step_size, kT=1.0):
    """
    Metropolis algorithm:
      1. propose x' = x + delta (delta ~ Uniform(-step, +step))
      2. compute dE = -log P(x') + log P(x)  (we use E = -log P)
      3. accept with prob min(1, exp(-dE / kT))
      4. if accept: x = x'
    """
    x = x0
    n_accept = 0
    samples = []
    for step in range(n_steps):
        # propose
        x_prop = x + random.uniform(-step_size, step_size)
        # compute P (avoid div-by-zero)
        p_curr = target_P(x)
        p_prop = target_P(x_prop)
        if p_curr < 1e-12:
            p_curr = 1e-12
        if p_prop < 1e-12:
            p_prop = 1e-12
        # acceptance ratio (Metropolis)
        ratio = p_prop / p_curr
        # accept with probability min(1, ratio)
        if ratio >= 1.0:
            accept = True
        else:
            accept = (random.random() < ratio)
        if accept:
            x = x_prop
            n_accept += 1
        samples.append(x)
    accept_rate = n_accept / n_steps
    return samples, accept_rate

# --- Run the simulation ---
random.seed(42)
N_STEPS = 5000
STEP_SIZE = 1.5

samples, acc = metropolis_sampler(x0=0.0, n_steps=N_STEPS, step_size=STEP_SIZE, kT=1.0)

print("=== Metropolis MCMC Simulation ===")
print(f"Target: bimodal mixture 0.4*N(-2,1) + 0.6*N(+2,1)")
print(f"Steps: {N_STEPS}, step size: {STEP_SIZE}")
print(f"Acceptance rate: {acc*100:.1f}%  (optimal ~25-50%)")
print()

# Burn-in: discard first 500 samples
burn_in = 500
kept = samples[burn_in:]

# Build histogram
n_bins = 12
x_min, x_max = -5.0, 5.0
bin_width = (x_max - x_min) / n_bins
bins = [0] * n_bins
for x in kept:
    idx = int((x - x_min) / bin_width)
    if 0 <= idx < n_bins:
        bins[idx] += 1

# Print ASCII histogram
print("Histogram of sampled x (after burn-in):")
max_count = max(bins)
for i, c in enumerate(bins):
    bin_center = x_min + (i + 0.5) * bin_width
    bar = "#" * int((c / max_count) * 40) if max_count > 0 else ""
    print(f"  x={bin_center:+.2f} | {bar:40s} ({c})")

print()
# Estimate mean + std (pure Python)
mean_x = sum(kept) / len(kept)
var_x = sum((xi - mean_x) ** 2 for xi in kept) / len(kept)
std_x = math.sqrt(var_x)
print(f"Sample mean: {mean_x:+.3f}  (true = 0.4*(-2) + 0.6*(+2) = +0.4)")
print(f"Sample std: {std_x:.3f}    (true ~ 2.4)")

print()
print("=== Insight: Metropolis IS detailed balance ===")
print("By accepting min(1, P(x')/P(x)), we visit each x with frequency")
print("proportional to P(x). The chain is a Markov chain whose stationary")
print("distribution IS the target. This is how Lattice QCD computes")
print("observables: Monte Carlo over gauge field configurations.")`;

// ============================================================
// Metropolis MCMC loop SVG
// ============================================================

function MetropolisLoopDiagram() {
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Atom className="h-3.5 w-3.5 text-primary" />
          Metropolis MCMC loop — propose → compute ΔE → accept/reject → repeat (custom SVG)
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 400 240" className="w-full h-auto">
          {/* Step 1: propose */}
          <rect x="20" y="30" width="110" height="50" rx="4" fill="oklch(0.65 0.16 30)20" stroke="oklch(0.65 0.16 30)" strokeWidth="1.5" />
          <text x="75" y="48" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 30)" fontWeight="bold">1. Propose x'</text>
          <text x="75" y="60" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 30)">x' = x + δ</text>
          <text x="75" y="70" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 30)">δ ~ Uniform(-s, +s)</text>

          {/* Step 2: compute delta E */}
          <rect x="160" y="30" width="110" height="50" rx="4" fill="oklch(0.65 0.16 165)25" stroke="oklch(0.65 0.16 165)" strokeWidth="1.5" />
          <text x="215" y="48" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 165)" fontWeight="bold">2. Compute ΔE</text>
          <text x="215" y="60" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 165)">ΔE = E(x') - E(x)</text>
          <text x="215" y="70" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 165)">= -log P(x') + log P(x)</text>

          {/* Step 3: decision */}
          <rect x="290" y="30" width="100" height="50" rx="4" fill="oklch(0.65 0.16 250)25" stroke="oklch(0.65 0.16 250)" strokeWidth="1.5" />
          <text x="340" y="48" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 250)" fontWeight="bold">3. Accept?</text>
          <text x="340" y="60" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 250)">P_acc = min(1,</text>
          <text x="340" y="70" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 250)">exp(-ΔE/kT))</text>

          {/* Accept branch */}
          <rect x="290" y="150" width="100" height="50" rx="4" fill="oklch(0.65 0.16 30)20" stroke="oklch(0.65 0.16 30)" strokeWidth="1.5" />
          <text x="340" y="170" textAnchor="middle" fontSize="8" fill="oklch(0.65 0.16 30)" fontWeight="bold">Accept</text>
          <text x="340" y="182" textAnchor="middle" fontSize="6.5" fill="oklch(0.55 0.05 30)">x ← x'</text>
          <text x="340" y="192" textAnchor="middle" fontSize="6.5" fill="oklch(0.55 0.05 30)">(if ΔE ≤ 0: always)</text>

          {/* Reject branch */}
          <rect x="160" y="150" width="110" height="50" rx="4" fill="oklch(0.65 0.16 60)20" stroke="oklch(0.65 0.16 60)" strokeWidth="1.5" />
          <text x="215" y="170" textAnchor="middle" fontSize="8" fill="oklch(0.65 0.16 60)" fontWeight="bold">Reject</text>
          <text x="215" y="182" textAnchor="middle" fontSize="6.5" fill="oklch(0.55 0.05 60)">x ← x (unchanged)</text>
          <text x="215" y="192" textAnchor="middle" fontSize="6.5" fill="oklch(0.55 0.05 60)">(if ΔE &gt; 0: prob 1 - e^(-ΔE/kT))</text>

          {/* Arrows: 1->2 */}
          <line x1="130" y1="55" x2="158" y2="55" stroke="var(--border)" strokeWidth="1" markerEnd="url(#mt-arrow)" />
          <line x1="270" y1="55" x2="288" y2="55" stroke="var(--border)" strokeWidth="1" markerEnd="url(#mt-arrow)" />
          {/* 3 -> accept (right-down) */}
          <line x1="350" y1="80" x2="350" y2="148" stroke="oklch(0.65 0.16 30)" strokeWidth="1" markerEnd="url(#mt-arrow)" />
          <text x="375" y="118" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.16 30)" fontWeight="bold">yes</text>
          {/* 3 -> reject (down-left) */}
          <line x1="335" y1="80" x2="270" y2="148" stroke="oklch(0.65 0.16 60)" strokeWidth="1" markerEnd="url(#mt-arrow)" />
          <text x="285" y="118" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.16 60)" fontWeight="bold">no</text>
          {/* Loop back: accept → propose (long arc) */}
          <motion.path d="M340,150 Q340,100 200,100 Q75,100 75,80" fill="none" stroke="oklch(0.65 0.16 30)" strokeWidth="1" strokeDasharray="3 2"
            animate={{ strokeDashoffset: [0, -10] }} transition={{ duration: 1, repeat: Infinity }} />
          {/* Loop back: reject → propose (other arc) */}
          <motion.path d="M215,150 Q215,130 75,80" fill="none" stroke="oklch(0.65 0.16 60)" strokeWidth="1" strokeDasharray="3 2"
            animate={{ strokeDashoffset: [0, -10] }} transition={{ duration: 1.2, repeat: Infinity }} />

          <text x="200" y="225" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">
            After N steps: histogram of x ~ target P(x) — detailed balance preserved
          </text>

          <defs><marker id="mt-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" /></marker></defs>
        </svg>
      </div>
    </div>
  );
}

// ============================================================
// Main page
// ============================================================

export function ComputationalPhysicsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Computational Physics · lattice QCD · Monte Carlo · Metropolis · FEM · CFD · Navier-Stokes · Reynolds · detailed balance · detector → marketplace"
        title="Computational Physics — from detector to marketplace via Monte Carlo and FEM"
        description="Computational physics is where the equations of physics meet large-scale numerical computation — Lattice QCD discretizes the path integral of Quantum Chromodynamics on a 4D space-time lattice and integrates it via Monte Carlo (Wilson fermions on sites, SU(3) gauge links, Metropolis-Hastings with detailed balance). Monte Carlo methods (Metropolis 1953, MCMC) sample arbitrary distributions by accepting proposals with probability min(1, e^(-ΔE/kT)). Finite Element Analysis discretizes PDEs into meshes and assembles a global stiffness matrix from the weak form ∫Ω (∇v)·(k∇u) dΩ = ∫Ω f·v dΩ. Computational Fluid Dynamics solves the Navier-Stokes equations ∂u/∂t + u·∇u = -∇p/ρ + ν∇²u on grids, with the Reynolds number Re = ρvL/ν classifying laminar vs turbulent flow. This page covers the math (Metropolis, Navier-Stokes, Reynolds, FEM weak form, Lattice QCD action), a custom Metropolis-loop SVG, a Pyodide MCMC demo, comparison of COMSOL/ANSYS/OpenFOAM/LAMMPS, and the full detector-to-marketplace narrative (LHC, Boeing, Rolls-Royce, defense)."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Atom className="h-3 w-3" /> QCD + MC</Badge>
            <Badge variant="outline" className="gap-1.5"><Waves className="h-3 w-3" /> FEM + CFD</Badge>
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
        title="Scientific pipeline short — detector → Monte Carlo → FEM mesh → publication → marketplace"
        description="A looping 5-phase animation showing the computational physics pipeline. Phase 1: detector (LHC ATLAS/CMS or sensor array → raw events). Phase 2: Monte Carlo (Metropolis MCMC sampling). Phase 3: FEM mesh (triangular mesh + Galerkin assembly). Phase 4: publication (PRL/arXiv + Jupyter). Phase 5: marketplace (COMSOL, ANSYS, OpenFOAM, LAMMPS)."
        icon={<Activity className="h-5 w-5" />}
        badge="short (loop)"
      >
        <ScienceShort phases={SHORT_PHASES} interval={1500} />
      </SectionCard>

      {/* Mathematical foundations — FOLDED */}
      <Foldable
        title="Mathematical foundations — Metropolis, Navier-Stokes, Reynolds, FEM weak form, Lattice QCD"
        summary="5 equations: Metropolis acceptance, Navier-Stokes momentum conservation, Reynolds number, FEM weak form, Lattice QCD action"
      >
        <div className="space-y-4">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm font-semibold text-primary mb-2">1. Metropolis Acceptance Probability</p>
            <p className="font-mono text-xs text-primary mb-2">
              P(accept) = min(1, e^(-ΔE / (k_B · T))) · where ΔE = E(x') - E(x) and x' is the proposal
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The Metropolis algorithm (Metropolis, Rosenbluth, Teller 1953) is the canonical Markov Chain Monte
              Carlo (MCMC) method. Propose a random move x → x', compute the energy change ΔE, and accept the move
              with probability min(1, e^(-ΔE/kT)). If ΔE ≤ 0 (downhill), always accept; if ΔE &gt; 0 (uphill), accept
              with probability e^(-ΔE/kT) — meaning high-temperature systems accept more uphill moves than cold ones.
              Crucially, this satisfies detailed balance: the chain visits state x with frequency proportional to
              e^(-E(x)/kT) (the Boltzmann distribution).
              <strong> Why this matters:</strong> Metropolis sampling is the engine of Lattice QCD (sample gauge
              field configurations), statistical mechanics (Ising model), and Bayesian inference (posterior
              sampling). MCMC turned Monte Carlo from a one-shot integration method into a general sampling
              algorithm — and won the founders a place in the history of computational science.
            </p>
          </div>
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">2. Navier-Stokes Equations</p>
            <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 mb-2">
              ∂u/∂t + (u·∇)u = -∇p/ρ + ν·∇²u · mass: ∇·u = 0 (incompressible)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The Navier-Stokes equations are Newton's second law for a viscous fluid: the acceleration of a fluid
              element equals the sum of pressure gradients (-∇p/ρ) and viscous diffusion (ν·∇²u), where ν = μ/ρ is
              the kinematic viscosity. The convective term (u·∇)u makes the equations nonlinear — this is the
              mathematical origin of turbulence. The incompressibility constraint ∇·u = 0 (mass conservation)
              couples pressure and velocity: solving for p requires a Poisson equation at each time step.
              <strong> Why this matters:</strong> Navier-Stokes describes weather, ocean currents, blood flow,
              airplane aerodynamics, and combustion. The Clay Mathematics Institute has offered a USD 1M prize
              for proving existence and smoothness of solutions — the equations remain mathematically unsolved.
              CFD codes (OpenFOAM, ANSYS Fluent) discretize them on grids: DNS resolves all scales, RANS averages,
              LES filters in between.
            </p>
          </div>
          <div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-3">
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">3. Reynolds Number</p>
            <p className="font-mono text-xs text-violet-600 dark:text-violet-400 mb-2">
              Re = (ρ · v · L) / ν = (inertial forces) / (viscous forces) · dimensionless
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The Reynolds number Re = ρvL/ν is the single dimensionless parameter that classifies flow regimes.
              When Re is small (≤ ~2000 for pipe flow), viscous forces dominate and the flow is laminar (smooth,
              predictable, layer-on-layer). When Re is large (≥ ~4000), inertial forces dominate and the flow
              becomes turbulent (chaotic, vortical, multi-scale). The transition happens because the nonlinear
              convective term (u·∇)u overwhelms the viscous term ν·∇²u. Reynolds' 1883 dye-flow experiment first
              visualized the laminar-turbulent transition.
              <strong> Why this matters:</strong> Reynolds number sets the cost of CFD: Direct Numerical Simulation
              (DNS) needs O(Re^(9/4)) grid points to resolve all turbulence scales — making high-Re flows (e.g.,
              aircraft at Re~10⁸) computationally infeasible. This is why engineers use RANS (Reynolds-Averaged
              Navier-Stokes with k-ε turbulence models) or LES (Large-Eddy Simulation) — averaging or filtering
              out the smallest turbulent scales.
            </p>
          </div>
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">4. FEM Weak Form (Galerkin)</p>
            <p className="font-mono text-xs text-amber-600 dark:text-amber-400 mb-2">
              ∫_Ω (∇v) · (k ∇u) dΩ = ∫_Ω f · v dΩ · ∀ test functions v
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Finite Element Method (FEM) reformulates a PDE (e.g., -∇·(k∇u) = f) into its weak form: multiply by a
              test function v, integrate by parts, and require the equality to hold for all v in some function space.
              This relaxes the differentiability requirements on u (a "weak" solution can have kinks at element
              boundaries). The Galerkin method restricts u and v to a finite-dimensional subspace spanned by basis
              functions defined locally on each mesh element — typically piecewise-linear "hat" functions on
              triangles (2D) or tetrahedra (3D). The result is a sparse linear system K·u = F, where K is the
              assembled global stiffness matrix and F is the load vector.
              <strong> Why this matters:</strong> FEM is the workhorse of structural mechanics, heat transfer,
              electromagnetics, and fluid dynamics. COMSOL and ANSYS are built on FEM. Adaptive mesh refinement
              (h- and p-refinement) concentrates degrees of freedom where the solution has steep gradients —
              giving exponential convergence for smooth solutions and making FEM the most accurate discretization
              method available.
            </p>
          </div>
          <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3">
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-2">5. Lattice QCD Action</p>
            <p className="font-mono text-xs text-rose-600 dark:text-rose-400 mb-2">
              S[U, ψ, ψ̄] = (β/N) · Σ_x Σ_μ Re Tr[I - U_μ(x)] + Σ_f ψ̄_f (D[U] + m_f) ψ_f
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Lattice QCD discretizes Quantum Chromodynamics (the theory of quarks and gluons) on a 4D Euclidean
              space-time lattice. Gluon fields live on links as SU(3) matrices U_μ(x) (Wilson gauge action); quark
              fields ψ live on sites as Grassmann variables (Wilson fermion action D[U] + m). The path integral
              Z = ∫ DU Dψ Dψ̄ e^(-S) is computed via Monte Carlo: each configuration is sampled by Metropolis-Hastings
              (Hybrid Monte Carlo in practice — a Hamiltonian dynamics version) with detailed balance. Observables
              like hadron masses are computed as expectation values: ⟨O⟩ = (1/N) Σ_i O[U_i].
              <strong> Why this matters:</strong> Lattice QCD is the only first-principles method to compute hadron
              masses, decay constants, and form factors from the Standard Model. It predicted the proton mass to
              ~1% accuracy before experiments confirmed it. Wilson fermions (1974) made the lattice formulation
              chirally symmetric at finite spacing — enabling modern precision QCD. Theorists run on GPUs and
              supercomputers — millions of CPU-hours per measurement.
            </p>
          </div>
        </div>
      </Foldable>

      {/* Metropolis loop SVG */}
      <SectionCard
        title="Metropolis MCMC loop — propose → ΔE → accept/reject → repeat (custom SVG)"
        description="The Metropolis algorithm: from any starting point x, propose x' = x + δ (random step), compute the energy change ΔE = E(x') - E(x), and accept x' with probability min(1, e^(-ΔE/kT)). After many iterations, the histogram of visited x values follows the target Boltzmann distribution e^(-E(x)/kT). This is detailed balance: the Markov chain's stationary distribution IS the target. Optimal acceptance rate is ~25-50% (rule of thumb for choosing step size)."
        icon={<Atom className="h-5 w-5" />}
        badge="algorithm"
      >
        <MetropolisLoopDiagram />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: Metropolis MCMC sampler — sample from a bimodal distribution (Pyodide)"
        description="Pure-Python Metropolis-Hastings: target is a bimodal mixture 0.4·N(-2,1) + 0.6·N(+2,1). Runs 5000 MCMC steps with step size 1.5, prints acceptance rate (target 25-50%), then ASCII histogram of sampled x values after burn-in. Demonstrates how Markov chains with detailed balance converge to any target distribution — the foundation of Lattice QCD, Bayesian inference, and Ising simulations."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={MATH_DEMO} buttonLabel="Run Metropolis MCMC (Pyodide)" />
      </SectionCard>

      {/* Comparison */}
      <SectionCard
        title="Simulation engines compared — COMSOL vs ANSYS vs OpenFOAM vs LAMMPS"
        description="Four production simulation engines. COMSOL (multiphysics FEM, commercial). ANSYS (FEA + CFD + electronics, commercial). OpenFOAM (open-source CFD, finite-volume). LAMMPS (Sandia, molecular dynamics, open-source)."
        icon={<Boxes className="h-5 w-5" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30">
              <tr className="border-b border-border/60">
                <th className="text-left px-3 py-2 font-semibold">Feature</th>
                <th className="text-left px-3 py-2 font-semibold">COMSOL</th>
                <th className="text-left px-3 py-2 font-semibold text-primary">ANSYS</th>
                <th className="text-left px-3 py-2 font-semibold">OpenFOAM</th>
                <th className="text-left px-3 py-2 font-semibold">LAMMPS</th>
              </tr>
            </thead>
            <tbody>
              {[
                { f: "Origin", c: "Sweden 1986 (COMSOL AB)", a: "Swanson 1970 (PA)", o: "Imperial 2004 (Open CFD)", l: "Sandia 1990s (Plimpton)" },
                { f: "License", c: "Commercial (USB-dongle)", a: "Commercial (ANSYS Inc)", o: "GPL (open-source)", l: "GPL (open-source)" },
                { f: "Method", c: "FEM (multiphysics)", a: "FEA + FVM + spectral", o: "Finite-volume (CFD)", l: "Molecular dynamics" },
                { f: "Strength", c: "Coupled physics + GUI", a: "Industry-standard FEA/CFD", o: "Customizable CFD", l: "Parallel MD (10⁹ atoms)" },
                { f: "GPU", c: "Limited", a: "Yes (Fluent GPU)", o: "Yes (CUDA backend)", l: "Yes (KOKKOS + GPU)" },
                { f: "Best for", c: "Research + design", a: "Aerospace/automotive", o: "Custom CFD research", l: "Materials MD + soft matter" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{row.f}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.c}</td>
                  <td className="px-3 py-2 text-primary/80">{row.a}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.o}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.l}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Why evolved — FOLDED */}
      <Foldable
        title="Why computational physics evolved — from hand calculations to exascale"
        summary="4 shortfalls: hand-integrated path integrals, no Monte Carlo sampling, no mesh methods, no turbulence modeling"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Shortfall 1: Path integrals were analytically intractable.</strong> Quantum field theories like QCD require integrating over all field configurations — an infinite-dimensional integral that no analytic method can compute. Wilson (1974) discretized space-time onto a 4D lattice, turning the path integral into a finite (but huge) integral over SU(3) matrices. Hybrid Monte Carlo (1987) made Lattice QCD computational — now a precision Standard Model tool.</p>
          <p><strong className="text-foreground/80">Shortfall 2: Direct Monte Carlo failed for high dimensions.</strong> Plain Monte Carlo integration (sample N random points, average) converges as O(1/√N) but the constant grows with dimensionality — useless for 10⁶-dimensional integrals (Lattice QCD). Metropolis (1953) introduced MCMC: sample preferentially where the integrand is large (importance sampling) by accepting moves with probability min(1, e^(-ΔE/kT). Detailed balance guarantees the chain visits configurations proportional to the target distribution.</p>
          <p><strong className="text-foreground/80">Shortfall 3: No systematic PDE discretization for complex geometries.</strong> Finite differences require rectangular grids — useless for an airplane wing, a turbine blade, or a hip implant. FEM (Courant 1943, Zienkiewicz 1960s) introduced the weak form + Galerkin projection onto piecewise basis functions over arbitrary meshes (triangles, tetrahedra). Adaptive mesh refinement made FEM exponentially accurate for smooth solutions.</p>
          <p><strong className="text-foreground/80">Shortfall 4: No turbulence model for engineering CFD.</strong> Direct Numerical Simulation (DNS) of Navier-Stokes resolves all turbulence scales — but requires O(Re^(9/4)) grid cells, infeasible for aircraft (Re~10⁸). Reynolds (1895) introduced time-averaging (RANS): the velocity field decomposes into mean + fluctuation, with extra unknowns (the Reynolds stress) closed by turbulence models (k-ε, k-ω). Modern industrial CFD (ANSYS Fluent, OpenFOAM) is built on RANS; LES filters in between (medium-eddy simulation).</p>
        </div>
      </Foldable>

      {/* Unique features */}
      <SectionCard
        title="Truly unique computational physics features"
        description="Four features that make computational physics unique as a discipline."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. Detailed balance = exact sampling</p>
            <p className="text-muted-foreground">Metropolis acceptance min(1, e^(-ΔE/kT)) guarantees the Markov chain visits each state with frequency ∝ target. <strong>No bias, asymptotically exact.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Reynolds number classifies regimes</p>
            <p className="text-muted-foreground">Re = ρvL/ν — one dimensionless number determines laminar vs turbulent. <strong>Buckingham Pi theorem at work.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. FEM weak form relaxes regularity</p>
            <p className="text-muted-foreground">Multiply PDE by test function v, integrate by parts. <strong>Solutions can have kinks at element boundaries — weak solutions.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Lattice QCD = path integral computation</p>
            <p className="text-muted-foreground">Discretize 4D space-time, sample gauge configs via HMC. <strong>Only first-principles method for hadron masses.</strong></p>
          </div>
        </div>
      </SectionCard>

      {/* Computational tooling — FOLDED */}
      <Foldable
        title="Computational tooling — QCD + Monte Carlo + FEM + CFD engines"
        summary="Lattice QCD (QUDA, MILC), MCMC (Stan, PyMC, emcee), FEM (COMSOL, ANSYS, FEniCS), CFD (OpenFOAM, Fluent, SU2), MD (LAMMPS, GROMACS)"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Atom className="h-3.5 w-3.5 text-primary" /> Lattice QCD + Monte Carlo</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>QUDA</strong> — GPU library for Lattice QCD on NVIDIA CUDA</li>
              <li>• <strong>MILC</strong> — production QCD code, SU(3) gauge + Kogut-Susskind quarks</li>
              <li>• <strong>Stan</strong> — HMC for Bayesian inference (No-U-Turn sampler)</li>
              <li>• <strong>PyMC / emcee</strong> — Python MCMC (affine-invariant ensemble)</li>
              <li>• <strong>OpenMM</strong> — HMC for molecular dynamics (Langevin thermostat)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Waves className="h-3.5 w-3.5 text-primary" /> FEM + CFD + MD</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>COMSOL</strong> — multiphysics FEM, GUI-driven, coupled physics</li>
              <li>• <strong>ANSYS</strong> — FEA (Mechanical) + CFD (Fluent) + electronics (HFSS)</li>
              <li>• <strong>OpenFOAM</strong> — open-source CFD, finite-volume, customizable</li>
              <li>• <strong>SU2</strong> — Stanford open-source CFD + optimization</li>
              <li>• <strong>LAMMPS</strong> — Sandia MD, 10⁹ atoms parallel, KOKKOS GPU</li>
              <li>• <strong>FEniCS</strong> — Python FEM, automatic weak-form compilation</li>
            </ul>
          </div>
        </div>
      </Foldable>

      {/* Research — FOLDED */}
      <Foldable
        title="Research + detector to marketplace narrative"
        summary="Metropolis 1953, Wilson 1974 (lattice), Navier-Stokes, Reynolds 1883, COMSOL, ANSYS, OpenFOAM, LAMMPS, Boeing, Rolls-Royce"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Metropolis, Rosenbluth, Teller (1953):</strong> "Equation of State Calculations by Fast Computing Machines." Introduced the MCMC algorithm: propose a move, accept with probability min(1, e^(-ΔE/kT). Born at Los Alamos during the hydrogen bomb program — but the algorithm's reach extended far beyond. Won a place in the history of computational science; Nicholas Metropolis is sometimes credited with coining "Monte Carlo" for such methods.</p>
          <p><strong className="text-foreground/80">Wilson Lattice Gauge Theory (1974):</strong> "Confinement of Quarks." Kenneth Wilson discretized QCD onto a 4D lattice, replacing the continuum path integral with a sum over SU(3) link variables. Showed confinement (linear potential between quarks) emerges naturally. Won the 1982 Nobel Prize for related work on phase transitions. Modern Lattice QCD codes (MILC, QUDA) are direct descendants.</p>
          <p><strong className="text-foreground/80">Navier-Stokes equations (Navier 1822, Stokes 1845):</strong> The fundamental PDEs of viscous fluid flow. Existence and smoothness remain a Clay Mathematics USD 1M Millennium Prize problem. Numerical CFD (finite-volume, finite-element, spectral) is the practical resolution — weather forecasting, aircraft design, blood flow modeling.</p>
          <p><strong className="text-foreground/80">Reynolds (1883):</strong> "An Experimental Investigation of the Circumstances Which Determine Whether the Motion of Water Shall Be Direct or Sinuous." Injected dye into pipe flow and observed the laminar-turbulent transition. Derived Re = ρvL/ν as the dimensionless parameter governing the transition — the founding insight of dimensionless analysis.</p>
          <p><strong className="text-foreground/80">COMSOL (multiphysics marketplace):</strong> Founded 1986 in Sweden. COMSOL Multiphysics — the first commercial FEM code to natively couple physics (heat + fluid + EM + chemistry) in one simulation. Used by 100k+ engineers in research and product design. The commercial arm of computational physics for design.</p>
          <p><strong className="text-foreground/80">ANSYS (industrial FEA/CFD marketplace):</strong> Founded 1970 by John Swanson (Westinghouse). ANSYS Mechanical is the industry-standard FEA tool — used by Boeing, Airbus, Ford, Toyota for structural certification. ANSYS Fluent (CFD) + HFSS (electromagnetics) cover the full multiphysics spectrum. Market cap ~USD 25B — the commercial scale of computational physics.</p>
          <p><strong className="text-foreground/80">OpenFOAM + LAMMPS (open-source defense):</strong> OpenFOAM (Imperial College 2004, Open CFD Ltd) — the open-source CFD alternative, dominant in academic research and increasingly in industry. LAMMPS (Sandia 1990s, Plimpton) — open-source MD, scales to billions of atoms on HPC clusters. Both are funded by US Department of Energy and Department of Defense — the defense R&D marketplace that drives computational physics.</p>
        </div>
      </Foldable>

      {/* Insight — FOLDED */}
      <Foldable
        title="My deeper thought: computational physics IS discretized continuum physics"
        summary="Metropolis + Navier-Stokes + FEM + Lattice QCD = modern computational physics"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Computational physics IS discretized continuum physics.</strong> Lattice QCD IS the path integral discretized onto a 4D grid. Monte Carlo IS numerical integration via random sampling. Metropolis IS Markov-chain sampling with detailed balance. FEM IS the weak-form projection of a PDE onto piecewise basis functions. Navier-Stokes IS Newton's second law for a continuum fluid. Reynolds number IS the dimensionless inertial-to-viscous force ratio. Every computational physics method IS a classical continuum or quantum field-theoretic equation, discretized and computed.</p>
          <p><strong className="text-foreground/80">Detailed balance IS the exactness theorem of MCMC.</strong> The Metropolis acceptance probability min(1, e^(-ΔE/kT)) looks like a heuristic — but it is the unique acceptance rule (up to a normalization) that makes the Markov chain's stationary distribution equal to the target e^(-E/kT). This is detailed balance: P(x→x') · π(x) = P(x'→x) · π(x') for all pairs. Any Markov chain satisfying detailed balance converges to its target distribution. This is why MCMC works — and why minor changes to the proposal distribution don't break it (as long as the chain is irreducible and aperiodic).</p>
          <p><strong className="text-foreground/80">The Reynolds number IS dimensional analysis made computational.</strong> Buckingham's Pi theorem says any physical law expressible in n dimensional quantities can be rewritten in n - k dimensionless groups (k = number of base dimensions). Navier-Stokes has 5 dimensional parameters (ρ, v, L, ν, p) → 1 dimensionless ratio Re = ρvL/ν. So the entire flow regime is determined by ONE number — not 5. This is why wind-tunnel tests on a 1/100-scale model at the same Re predict the full-scale aircraft's behavior. Computational physics depends on this insight: simulate at the right dimensionless parameters, not the right dimensional ones. Without it, every CFD simulation would be wrong by a factor of 100 in lengthscale.</p>
        </div>
      </Foldable>

      {/* Cross-disciplinary elegant-code card — Navier-Stokes */}
      <SectionCard
        title="Cross-disciplinary elegance — Navier-Stokes bridges weather, blood flow, and turbulence"
        description="Navier-Stokes (∂u/∂t + u·∇u = -∇p/ρ + ν∇²u) IS the universe's flow equation. A meteorologist simulating a hurricane, a cardiologist simulating arterial blood flow, and an aerospace engineer simulating wing turbulence solve the SAME equation because all three are continuum fluids with viscosity."
        icon={<Sparkles className="h-5 w-5" />}
        badge="elegant code"
      >
        <DatasetCards
          examples={ELEGANT_CODE_CARDS.filter((_, i) => i === 5)}
          intro="Navier-Stokes (weather ↔ blood ↔ turbulence): the SAME PDE governs the atmosphere, the aorta, and a Boeing wing — because all three are viscous fluids."
        />
      </SectionCard>

      <RelatedTopics topics={[
        { id: "quantum-computing" as const, reason: "Quantum Computing (exact path integrals on quantum hardware)" },
        { id: "monte-carlo" as const, reason: "Monte Carlo methods (MCMC + importance sampling)" },
        { id: "numpy-scipy" as const, reason: "NumPy/SciPy (FEM matrix solvers + FFT)" },
        { id: "gpu-computing" as const, reason: "GPU Computing (QUDA + KOKKOS for QCD/MD)" },
        { id: "space-science" as const, reason: "Space Science (LHC + detectors + cosmology)" },
        { id: "computational-biology" as const, reason: "Computational Biology (MD from physics)" },
        { id: "molecular-modelling" as const, reason: "Molecular Modelling (LAMMPS + GROMACS)" },
        { id: "enhanced-sampling" as const, reason: "Enhanced Sampling (Monte Carlo + MD hybrid)" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("quantum-computing")} className="text-sm text-primary hover:underline">
          &rarr; Quantum Computing (exact path integrals)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("monte-carlo")} className="text-sm text-primary hover:underline">
          &rarr; Monte Carlo (MCMC + importance sampling)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("space-science")} className="text-sm text-primary hover:underline">
          &rarr; Space Science (LHC + detectors + cosmology)
        </Link>
      </div>
    </div>
  );
}
