"use client";

import Link from "next/link";
import { useState } from "react";
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
import { RelatedElegantCode } from "../_components/related-elegant-code";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Cpu, Brain, Atom, Sparkles, History, TrendingUp, Boxes,
  Server, Network, Zap, Activity, Database, ShieldCheck, Layers,
} from "lucide-react";

const KPIS = [
  { label: "Molecular Dynamics", value: "AMBER + GROMACS", hint: "Verlet integration on N-D arrays: positions (N,3), velocities (N,3), forces (N,3) for N atoms. O(N²) pairwise forces — GPU-accelerated.", deltaTone: "flat" as const },
  { label: "Protein Folding", value: "AlphaFold2 (2020)", hint: "MSA → attention → 3D structure. Evoformer = transformer on sequence alignments. 200M+ structures predicted.", deltaTone: "up" as const },
  { label: "Drug Docking", value: "AutoDock Vina", hint: "N-D conformer search (6D: translation + rotation + torsion). Scoring: ΔG = Σ H-bonds + electrostatics + van der Waals.", deltaTone: "flat" as const },
  { label: "Systems Biology", value: "FBA + ODE", hint: "Flux balance analysis: max c^T v s.t. Sv=0. ODEs: dx/dt = f(x,p). Parameter estimation via optimization.", deltaTone: "up" as const },
];

// ============================================================
// ScienceShort — 5-phase looping animation
// ============================================================

const SHORT_PHASES = [
  {
    name: "Wet Lab",
    desc: "Illumina sequencer → FASTQ; mass spec → spectra; cryo-EM → density maps",
    svg: (
      <svg viewBox="0 0 300 120" className="w-full h-auto">
        <rect x="50" y="30" width="80" height="50" rx="4" fill="oklch(0.65 0.16 30)20" stroke="oklch(0.65 0.16 30)" strokeWidth="1.5" />
        <text x="90" y="50" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 30)" fontWeight="bold">DNA Sequencer</text>
        <text x="90" y="62" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 30)">6 TB/run</text>
        <text x="90" y="72" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 30)">FASTQ</text>
        <motion.circle cx="180" cy="55" r="3" fill="oklch(0.65 0.16 30)" animate={{ cx: [160, 200, 160] }} transition={{ duration: 1.5, repeat: Infinity }} />
        <text x="230" y="55" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">→ data</text>
      </svg>
    ),
  },
  {
    name: "NumPy/SciPy",
    desc: "N-D arrays: (atoms×3) positions, (genes×samples×conditions) expression, FFT for spectra",
    svg: (
      <svg viewBox="0 0 300 120" className="w-full h-auto">
        {Array.from({length:3}).map((_,i) =>
          Array.from({length:4}).map((_,j) => (
            <rect key={`${i}-${j}`} x={50+j*50} y={20+i*30} width="44" height="24" rx="2"
              fill={`oklch(0.65 0.16 ${(i*120+j*30)%360})20`} stroke={`oklch(0.65 0.16 ${(i*120+j*30)%360})`} strokeWidth="0.8" />
          ))
        )}
        <text x="150" y="110" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">shape: (genes, samples, conditions) = N-D array</text>
      </svg>
    ),
  },
  {
    name: "Math",
    desc: "Verlet: r(t+Δt) = 2r(t) - r(t-Δt) + F/m × Δt²; Attention: softmax(QK^T/√d_k)×V",
    svg: (
      <svg viewBox="0 0 300 120" className="w-full h-auto">
        <rect x="30" y="20" width="100" height="30" rx="4" fill="oklch(0.65 0.16 165)20" stroke="oklch(0.65 0.16 165)" strokeWidth="1" />
        <text x="80" y="35" textAnchor="middle" fontSize="8" fill="oklch(0.65 0.16 165)" fontWeight="bold">F = -∇V(r)</text>
        <text x="80" y="45" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 165)">Newton's eq.</text>
        <rect x="170" y="20" width="100" height="30" rx="4" fill="oklch(0.65 0.16 250)20" stroke="oklch(0.65 0.16 250)" strokeWidth="1" />
        <text x="220" y="35" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 250)" fontWeight="bold">softmax(QK^T/√d_k)</text>
        <text x="220" y="45" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 250)">Attention</text>
        <text x="150" y="80" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">Verlet integration + AlphaFold attention</text>
        <motion.line x1="80" y1="50" x2="220" y2="50" stroke="var(--border)" strokeWidth="0.8"
          animate={{ strokeDasharray: [0, 200, 0] }} transition={{ duration: 2, repeat: Infinity }} />
      </svg>
    ),
  },
  {
    name: "Publication",
    desc: "matplotlib figures from NumPy arrays → Nature/Science paper → reproducible Jupyter",
    svg: (
      <svg viewBox="0 0 300 120" className="w-full h-auto">
        <rect x="50" y="20" width="80" height="60" rx="4" fill="oklch(0.65 0.16 60)20" stroke="oklch(0.65 0.16 60)" strokeWidth="1" />
        <text x="90" y="40" textAnchor="middle" fontSize="8" fill="oklch(0.65 0.16 60)" fontWeight="bold">Figure</text>
        <polyline points="60,70 70,55 80,60 90,40 100,50 110,45 120,35"
          fill="none" stroke="oklch(0.65 0.16 60)" strokeWidth="1.5" />
        <rect x="170" y="20" width="80" height="60" rx="4" fill="oklch(0.65 0.16 250)20" stroke="oklch(0.65 0.16 250)" strokeWidth="1" />
        <text x="210" y="40" textAnchor="middle" fontSize="8" fill="oklch(0.65 0.16 250)" fontWeight="bold">Paper</text>
        <text x="210" y="55" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 250)">Nature/Science</text>
        <text x="210" y="65" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 250)">+ Jupyter URL</text>
        <line x1="135" y1="50" x2="165" y2="50" stroke="var(--border)" strokeWidth="1" markerEnd="url(#pub-arrow)" />
        <defs><marker id="pub-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" /></marker></defs>
      </svg>
    ),
  },
  {
    name: "Marketplace",
    desc: "23andMe (genomics PCA), Recursion (microscopy ML), Insitro (drug discovery), DeepMind (AlphaFold)",
    svg: (
      <svg viewBox="0 0 300 120" className="w-full h-auto">
        <rect x="20" y="20" width="55" height="30" rx="4" fill="oklch(0.65 0.16 30)20" stroke="oklch(0.65 0.16 30)" strokeWidth="1" />
        <text x="47" y="35" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 30)" fontWeight="bold">23andMe</text>
        <rect x="85" y="20" width="55" height="30" rx="4" fill="oklch(0.65 0.16 165)20" stroke="oklch(0.65 0.16 165)" strokeWidth="1" />
        <text x="112" y="35" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 165)" fontWeight="bold">Recursion</text>
        <rect x="150" y="20" width="55" height="30" rx="4" fill="oklch(0.65 0.16 250)20" stroke="oklch(0.65 0.16 250)" strokeWidth="1" />
        <text x="177" y="35" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 250)" fontWeight="bold">Insitro</text>
        <rect x="215" y="20" width="65" height="30" rx="4" fill="oklch(0.65 0.16 320)20" stroke="oklch(0.65 0.16 320)" strokeWidth="1" />
        <text x="247" y="35" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 320)" fontWeight="bold">DeepMind</text>
        <text x="150" y="70" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">Built on import numpy as np</text>
        <motion.circle cx="47" cy="55" r="4" fill="oklch(0.65 0.16 30)"
          animate={{ cx: [47, 112, 177, 247, 47] }} transition={{ duration: 3, repeat: Infinity }} />
      </svg>
    ),
  },
];

// ============================================================
// Pyodide demo — Verlet integration + force field
// ============================================================

const MATH_DEMO = `# ============================================================
# Computational Biology — Verlet integration + force field
# Pure Python (Pyodide, no numpy)
# ============================================================

import math
import random

# --- 1. Velocity Verlet integration ---
# r(t+dt) = r(t) + v(t)*dt + 0.5*a(t)*dt^2
# v(t+dt) = v(t) + 0.5*(a(t) + a(t+dt))*dt
# This is 2nd-order accurate (O(dt^3) per step)

def verlet_step(r, v, a, dt, n_atoms):
    """One Velocity Verlet step for N atoms in 3D."""
    r_new = [[r[i][j] + v[i][j]*dt + 0.5*a[i][j]*dt*dt for j in range(3)] for i in range(n_atoms)]
    # a_new computed from new positions (force field)
    a_new = compute_forces(r_new, n_atoms)
    v_new = [[v[i][j] + 0.5*(a[i][j] + a_new[i][j])*dt for j in range(3)] for i in range(n_atoms)]
    return r_new, v_new, a_new

def compute_forces(r, n_atoms):
    """Lennard-Jones force: F = 24*eps*(2*(sig/r)^12 - (sig/r)^6) / r * r_hat"""
    eps = 1.0  # epsilon (energy)
    sig = 1.0  # sigma (distance)
    forces = [[0.0, 0.0, 0.0] for _ in range(n_atoms)]
    for i in range(n_atoms):
        for j in range(i+1, n_atoms):
            dx = r[j][0] - r[i][0]
            dy = r[j][1] - r[i][1]
            dz = r[j][2] - r[i][2]
            r2 = dx*dx + dy*dy + dz*dz
            if r2 < 0.01: r2 = 0.01  # avoid singularity
            r6 = r2 * r2 * r2
            r12 = r6 * r6
            # F = 24*eps*(2*(sig^12/r^12) - (sig^6/r^6)) / r^2 * dr
            f_mag = 24 * eps * (2 * (sig**12) / r12 - (sig**6) / r6) / r2
            fx, fy, fz = f_mag * dx, f_mag * dy, f_mag * dz
            forces[i][0] -= fx; forces[i][1] -= fy; forces[i][2] -= fz
            forces[j][0] += fx; forces[j][1] += fy; forces[j][2] += fz
    return forces

# --- Simulate 5 atoms in a box ---
random.seed(42)
n_atoms = 5
dt = 0.001  # timestep (1 fs in reduced units)
n_steps = 100

print("=== Molecular Dynamics: Velocity Verlet ===")
print(f"Atoms: {n_atoms}, Steps: {n_steps}, dt: {dt}")
print(f"Force field: Lennard-Jones (eps=1, sig=1)")
print()

r = [[random.uniform(0, 3) for _ in range(3)] for _ in range(n_atoms)]
v = [[random.gauss(0, 0.1) for _ in range(3)] for _ in range(n_atoms)]
a = compute_forces(r, n_atoms)

# Compute kinetic energy at each step
for step in range(n_steps):
    r, v, a = verlet_step(r, v, a, dt, n_atoms)
    if step % 20 == 0:
        ke = sum(0.5 * sum(v[i][j]**2 for j in range(3)) for i in range(n_atoms))
        pe = 0.0
        for i in range(n_atoms):
            for j in range(i+1, n_atoms):
                dx = r[j][0]-r[i][0]; dy = r[j][1]-r[i][1]; dz = r[j][2]-r[i][2]
                r2 = dx*dx+dy*dy+dz*dz
                if r2 > 0.01:
                    r6 = r2**3; r12 = r6**2
                    pe += 4*eps*((sig**12)/r12 - (sig**6)/r6)
        total = ke + pe
        print(f"  Step {step:3d}: KE={ke:.4f}, PE={pe:.4f}, Total={total:.4f}")

print()
print("Key insight: Total energy is conserved (Verlet is symplectic)")
print("This is how AMBER/GROMACS simulate protein dynamics")
print("N-D arrays: r=(N,3), v=(N,3), a=(N,3) → NumPy makes this 100x faster")`;

// ============================================================
// AlphaFold architecture SVG
// ============================================================

function AlphaFoldDiagram() {
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Atom className="h-3.5 w-3.5 text-primary" />
          AlphaFold2 architecture — MSA → attention → evoformer → structure (custom SVG)
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 400 200" className="w-full h-auto">
          {/* MSA input */}
          <rect x="10" y="60" width="70" height="60" rx="4" fill="oklch(0.65 0.16 30)20" stroke="oklch(0.65 0.16 30)" strokeWidth="1.5" />
          <text x="45" y="78" textAnchor="middle" fontSize="8" fill="oklch(0.65 0.16 30)" fontWeight="bold">MSA</text>
          <text x="45" y="88" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 30)">N_seq × N_res</text>
          <text x="45" y="98" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 30)">amino acid</text>
          <text x="45" y="108" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 30)">alignment</text>
          {/* Evoformer */}
          <rect x="120" y="50" width="120" height="80" rx="4" fill="oklch(0.65 0.16 165)30" stroke="oklch(0.65 0.16 165)" strokeWidth="1.5" />
          <text x="180" y="72" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 165)" fontWeight="bold">Evoformer</text>
          <text x="180" y="84" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 165)">48 layers</text>
          <text x="180" y="96" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 165)">row attention</text>
          <text x="180" y="106" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 165)">col attention</text>
          <text x="180" y="116" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 165)">pair update</text>
          <text x="180" y="126" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 165)">triangle comm.</text>
          {/* Structure module */}
          <rect x="290" y="60" width="70" height="60" rx="4" fill="oklch(0.65 0.16 250)30" stroke="oklch(0.65 0.16 250)" strokeWidth="1.5" />
          <text x="325" y="78" textAnchor="middle" fontSize="8" fill="oklch(0.65 0.16 250)" fontWeight="bold">Structure</text>
          <text x="325" y="88" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 250)">IPA</text>
          <text x="325" y="98" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 250)">3D coords</text>
          <text x="325" y="108" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 250)">(N,3)</text>
          {/* Arrows */}
          <line x1="82" y1="90" x2="118" y2="90" stroke="var(--border)" strokeWidth="1" markerEnd="url(#af-arrow)" />
          <line x1="242" y1="90" x2="288" y2="90" stroke="var(--border)" strokeWidth="1" markerEnd="url(#af-arrow)" />
          <text x="100" y="85" textAnchor="middle" fontSize="6" fill="var(--muted-foreground)">embed</text>
          <text x="265" y="85" textAnchor="middle" fontSize="6" fill="var(--muted-foreground)">predict</text>
          {/* Output: 3D structure */}
          <text x="325" y="140" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 250)" fontWeight="bold">→ 3D protein</text>
          <text x="325" y="150" textAnchor="middle" fontSize="6" fill="var(--muted-foreground)">pLDDT confidence</text>
          <defs><marker id="af-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" /></marker></defs>
        </svg>
      </div>
    </div>
  );
}

// ============================================================
// Main page
// ============================================================

export function ComputationalBiologyPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Computational Biology · molecular dynamics · AlphaFold · drug docking · systems biology · Verlet · N-D arrays · wet lab → marketplace"
        title="Computational Biology — from wet lab to marketplace via N-D arrays"
        description="Computational biology is where NumPy N-D arrays meet biology — molecular dynamics uses (N,3) position/velocity/force arrays, AlphaFold uses attention on MSA alignments, drug docking searches N-D conformer space, systems biology solves ODE systems. This page covers the mathematical foundations (Verlet integration, force fields, attention, FBA), custom-designed SVG diagrams (AlphaFold architecture, MD pipeline), Pyodide demos (Verlet + Lennard-Jones), and the full wet-lab-to-marketplace narrative (23andMe, Recursion, Insitro, DeepMind)."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Atom className="h-3 w-3" /> MD + AlphaFold</Badge>
            <Badge variant="outline" className="gap-1.5"><Brain className="h-3 w-3" /> Verlet + attention</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* Short — 5-phase looping animation (the visual hook) */}
      <SectionCard
        title="Scientific pipeline short — wet lab → NumPy → math → publication → marketplace"
        description="A looping 5-phase animation showing the computational biology pipeline. Phase 1: wet lab (sequencer/mass spec/cryo-EM). Phase 2: NumPy N-D arrays. Phase 3: math (Verlet + attention). Phase 4: publication (matplotlib + paper). Phase 5: marketplace (23andMe/Recursion/Insitro/DeepMind)."
        icon={<Activity className="h-5 w-5" />}
        badge="short (loop)"
      >
        <ScienceShort phases={SHORT_PHASES} interval={1500} />
      </SectionCard>

      {/* Mathematical foundations — FOLDED */}
      <Foldable
        title="Mathematical foundations — Verlet, force fields, attention, FBA"
        summary="5 equations: Newton's equations, Verlet integration, Lennard-Jones force field, AlphaFold attention, flux balance analysis"
      >
        <div className="space-y-4">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm font-semibold text-primary mb-2">1. Newton's Equations of Motion</p>
            <p className="font-mono text-xs text-primary mb-2">
              F = -∇V(r) · m_i × d²r_i/dt² = F_i · where V(r) = potential energy
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every atom in a protein obeys Newton's second law. The force F_i on atom i comes from the
              gradient of the potential energy V(r) — the force field. For a protein with N atoms, this is
              an O(N²) computation (all pairwise interactions). NumPy arrays: r=(N,3), v=(N,3), a=(N,3).
              <strong> Why this matters:</strong> MD simulations predict protein dynamics — how a drug binds,
              how an enzyme catalyzes, how a mutation destabilizes structure. AMBER and GROMACS solve
              these equations for millions of timesteps.
            </p>
          </div>
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">2. Velocity Verlet Integration</p>
            <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 mb-2">
              r(t+Δt) = r(t) + v(t)Δt + ½a(t)Δt² · v(t+Δt) = v(t) + ½(a(t)+a(t+Δt))Δt
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Velocity Verlet is 2nd-order accurate (O(Δt³) per step) and symplectic (preserves energy).
              The key: forces at t+Δt require positions at t+Δt — so compute new positions first,
              then new forces, then update velocities. <strong> Why this matters:</strong> Verlet is
              the standard integrator in AMBER, GROMACS, NAMD, OpenMM. The timestep Δt=1 fs
              (10⁻¹⁵ s) means 10⁶ steps for a 1 ns simulation — 10⁹ steps for 1 μs.
            </p>
          </div>
          <div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-3">
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">3. Lennard-Jones Force Field</p>
            <p className="font-mono text-xs text-violet-600 dark:text-violet-400 mb-2">
              V_LJ(r) = 4ε[(σ/r)¹² - (σ/r)⁶] · F_LJ = 24ε[2(σ/r)¹² - (σ/r)⁶]/r
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The Lennard-Jones potential models van der Waals interactions: the r⁻¹² term is repulsive
              (Pauli exclusion), r⁻⁶ is attractive (London dispersion). ε = well depth, σ = zero-crossing distance.
              Plus: Coulomb (electrostatics: q_iq_j/(4πε₀r)), bonds (harmonic: k(r-r₀)²), angles, dihedrals.
              <strong> Why this matters:</strong> The force field IS the physics model — it determines
              whether the simulation is accurate. AMBER ff19SB, CHARMM36m, OPLS-AA are parameterized
              against quantum chemistry calculations.
            </p>
          </div>
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">4. AlphaFold Attention on MSA</p>
            <p className="font-mono text-xs text-amber-600 dark:text-amber-400 mb-2">
              Attention(Q,K,V) = softmax(QK^T/√d_k) × V · where Q,K,V come from MSA row/column embeddings
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              AlphaFold2 uses attention on Multiple Sequence Alignments (MSA) — the MSA is a (N_seq × N_res)
              matrix of aligned amino acids. Row attention finds correlations between residues in the same
              sequence. Column attention finds co-evolution (residues that mutate together are likely in contact).
              The Evoformer alternates row/column attention 48 times — co-evolution signals emerge as
              pairwise distance predictions. <strong> Why this matters:</strong> This is how AlphaFold
              predicts 3D structure from sequence alone — attention on MSA captures the physics of
              protein folding without ever running MD.
            </p>
          </div>
          <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3">
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-2">5. Flux Balance Analysis (FBA)</p>
            <p className="font-mono text-xs text-rose-600 dark:text-rose-400 mb-2">
              max c^T v · subject to Sv = 0 · v_min ≤ v ≤ v_max
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              FBA models metabolism as a linear program: maximize biomass (c^T v) subject to steady-state
              (Sv=0, where S is the stoichiometric matrix) and capacity constraints (v_min ≤ v ≤ v_max).
              The matrix S is (M_reactions × N_metabolites) — a sparse N-D array.
              <strong> Why this matters:</strong> FBA predicts which metabolic pathways are active in a
              cell — used to engineer E. coli for biofuel production, identify drug targets in pathogens,
              and model the human gut microbiome.
            </p>
          </div>
        </div>
      </Foldable>

      {/* AlphaFold architecture */}
      <SectionCard
        title="AlphaFold2 architecture — MSA → evoformer → structure (custom SVG)"
        description="AlphaFold2 (DeepMind 2020) predicts 3D protein structures from amino acid sequences. Input: MSA (N_seq × N_res aligned sequences). Processing: Evoformer (48 layers of row/column attention + pair updates). Output: 3D coordinates (N_res × 3) + confidence (pLDDT). The evoformer is the key innovation — it alternates between row attention (within-sequence correlations) and column attention (between-sequence co-evolution)."
        icon={<Atom className="h-5 w-5" />}
        badge="architecture"
      >
        <AlphaFoldDiagram />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: Velocity Verlet + Lennard-Jones molecular dynamics (Pyodide)"
        description="Pure-Python implementation of molecular dynamics: 5 atoms with Lennard-Jones forces, Velocity Verlet integration, 100 timesteps. Prints kinetic energy, potential energy, and total energy at each checkpoint — showing energy conservation (Verlet is symplectic)."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={MATH_DEMO} buttonLabel="Run molecular dynamics (Pyodide)" />
      </SectionCard>

      {/* Comparison */}
      <SectionCard
        title="MD engines compared — AMBER vs GROMACS vs NAMD vs OpenMM"
        description="Four molecular dynamics engines. AMBER (academic, biomolecule-focused). GROMACS (open-source, fastest on GPU). NAMD (UIUC, parallel scaling). OpenMM (Python, GPU-accelerated, extensible)."
        icon={<Boxes className="h-5 w-5" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30">
              <tr className="border-b border-border/60">
                <th className="text-left px-3 py-2 font-semibold">Feature</th>
                <th className="text-left px-3 py-2 font-semibold">AMBER</th>
                <th className="text-left px-3 py-2 font-semibold text-primary">GROMACS</th>
                <th className="text-left px-3 py-2 font-semibold">NAMD</th>
                <th className="text-left px-3 py-2 font-semibold">OpenMM</th>
              </tr>
            </thead>
            <tbody>
              {[
                { f: "Origin", a: "UCSF 1975", g: "Univ Groningen 1991", n: "UIUC 1995", o: "Stanford 2011" },
                { f: "License", a: "Academic (free)", g: "GPL (open-source)", n: "Academic (free)", o: "MIT (open-source)" },
                { f: "GPU", a: "Yes (pmemd.cuda)", g: "Yes (fastest GPU)", n: "Limited", o: "Yes (native GPU)" },
                { f: "Python API", a: "pytraj", g: "MDAnalysis", n: "Limited", o: "Native (Python)" },
                { f: "Parallel scaling", a: "MPI", g: "MPI+OpenMP", n: "Charm++ (best)", o: "Single GPU" },
                { f: "Best for", a: "Biomolecules", g: "General + speed", n: "Large systems", o: "Custom potentials" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{row.f}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.a}</td>
                  <td className="px-3 py-2 text-primary/80">{row.g}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.n}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.o}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Why evolved — FOLDED */}
      <Foldable
        title="Why computational biology evolved — from hand-drawn structures to AlphaFold"
        summary="4 shortfalls: manual structure determination, no dynamics prediction, no docking automation, no systems-level modeling"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Shortfall 1: X-ray crystallography took years.</strong> Determining a single protein structure required growing crystals + X-ray diffraction + months of computation. AlphaFold2 does it in minutes from sequence alone — 200M+ structures predicted.</p>
          <p><strong className="text-foreground/80">Shortfall 2: No dynamics prediction.</strong> Static structures don't show how proteins move. MD simulations (Verlet + force fields) model dynamics — but required supercomputers. GPU acceleration (GROMACS on A100) made μs-timescale simulations accessible.</p>
          <p><strong className="text-foreground/80">Shortfall 3: Drug docking was manual.</strong> Finding where a drug binds was trial-and-error. AutoDock Vina automates conformer search in N-D space — millions of poses scored in seconds.</p>
          <p><strong className="text-foreground/80">Shortfall 4: No systems-level modeling.</strong> Understanding one protein is not enough — metabolism is a network. FBA models the full metabolic network as a linear program — identifying drug targets and engineering pathways.</p>
        </div>
      </Foldable>

      {/* Unique features */}
      <SectionCard
        title="Truly unique computational biology features"
        description="Four features that make computational biology unique as a discipline."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. N-D arrays for physical reality</p>
            <p className="text-muted-foreground">Proteins are 3D objects — positions (N,3), velocities (N,3), forces (N,3). <strong>NumPy N-D arrays model physical reality directly.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Attention captures co-evolution</p>
            <p className="text-muted-foreground">AlphaFold's column attention on MSA finds co-evolving residues → contact maps → 3D structure. <strong>Attention IS the folding algorithm.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Verlet IS symplectic geometry</p>
            <p className="text-muted-foreground">Velocity Verlet preserves phase-space volume — energy is conserved. <strong>This is Hamiltonian mechanics, discretized.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. FBA IS the metabolic linear program</p>
            <p className="text-muted-foreground">Metabolism as LP: max biomass s.t. Sv=0. <strong>The entire metabolic network as one optimization problem.</strong></p>
          </div>
        </div>
      </SectionCard>

      {/* Computational tooling — FOLDED */}
      <Foldable
        title="Computational tooling — MD engines + AlphaFold + docking + FBA"
        summary="AMBER, GROMACS, NAMD, OpenMM, AlphaFold2, AutoDock Vina, COBRApy, NumPy/SciPy"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Molecular Dynamics</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>AMBER</strong> — biomolecule-focused, ff19SB force field, pmemd.cuda GPU</li>
              <li>• <strong>GROMACS</strong> — fastest GPU MD, 2024 release, Verlet + domain decomposition</li>
              <li>• <strong>NAMD</strong> — Charm++ parallel, million-atom systems, UIUC</li>
              <li>• <strong>OpenMM</strong> — Python API, native GPU, custom force fields</li>
              <li>• <strong>MDAnalysis</strong> — Python trajectory analysis (NumPy arrays)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Atom className="h-3.5 w-3.5 text-primary" /> Structure + Docking + Systems</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>AlphaFold2/3</strong> — DeepMind, MSA → attention → 3D structure</li>
              <li>• <strong>ColabFold</strong> — cloud AlphaFold, free for non-commercial</li>
              <li>• <strong>AutoDock Vina</strong> — N-D conformer search, scoring function</li>
              <li>• <strong>COBRApy</strong> — FBA in Python, metabolic network analysis</li>
              <li>• <strong>RDKit</strong> — cheminformatics, SMILES, molecular fingerprints</li>
            </ul>
          </div>
        </div>
      </Foldable>

      {/* Research — FOLDED */}
      <Foldable
        title="Research + wet lab to marketplace narrative"
        summary="AlphaFold2 (Nature 2021), AMBER (JACS 1975), GROMACS (JCC 1995), AutoDock Vina, FBA papers"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">AlphaFold2 (Jumper et al. 2021, Nature):</strong> "Highly accurate protein structure prediction with AlphaFold." 200M+ structures predicted — more than all experimental structures ever determined. The CASP14 result (92.4 GDT_TS on average) shocked the structural biology community. DeepMind open-sourced the code + weights.</p>
          <p><strong className="text-foreground/80">AMBER (Kollman et al. 1975):</strong> The first molecular dynamics package for biomolecules. The AMBER force field (ff19SB) is parameterized against quantum chemistry — the gold standard for protein simulations.</p>
          <p><strong className="text-foreground/80">GROMACS (Berendsen et al. 1995):</strong> "GROMACS: A message-passing parallel molecular dynamics implementation." The fastest MD engine on GPU — optimized for SIMD (AVX) + GPU (CUDA). Used for 50%+ of published MD simulations.</p>
          <p><strong className="text-foreground/80">23andMe (genomics marketplace):</strong> Founded 2006. NumPy SVD on genotype arrays → PCA for ancestry composition. The "Ancestry Composition" feature is np.linalg.svd + clustering.</p>
          <p><strong className="text-foreground/80">Recursion Pharma (microscopy marketplace):</strong> Founded 2013. High-content microscopy → NumPy N-D arrays → scikit-learn phenotype classification. IPO at USD 3B — built on import numpy as np.</p>
          <p><strong className="text-foreground/80">Insitro (drug discovery marketplace):</strong> Founded 2018. MD simulations (NumPy for force arrays) + ML for target ID + high-content screening. USD 643M raised.</p>
          <p><strong className="text-foreground/80">DeepMind (AlphaFold marketplace):</strong> AlphaFold predicted 200M+ protein structures — the entire UniProt database. Free to academia. Isomorphic Labs (DeepMind spinout) uses AlphaFold3 for drug design — NumPy arrays for attention matrices + structure tensors.</p>
        </div>
      </Foldable>

      {/* Insight — FOLDED */}
      <Foldable
        title="My deeper thought: computational biology IS applied mathematics"
        summary="Newton's equations + attention + linear programming = modern computational biology"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Computational biology IS applied mathematics.</strong> Molecular dynamics IS Newton's equations (F=ma) discretized via Verlet integration. Protein folding IS attention (softmax(QK^T/√d_k) on MSA). Drug docking IS optimization (search N-D conformer space + score). Systems biology IS linear programming (FBA: max c^T v s.t. Sv=0). Every computational biology method IS a classical mathematical technique applied to biological data via NumPy N-D arrays.</p>
          <p><strong className="text-foreground/80">The N-D array IS the universal bio-data structure.</strong> Protein 3D coordinates: (N_atoms, 3) — positions, (N_atoms, 3) — velocities. Gene expression: (N_genes, N_samples, N_conditions). MSA: (N_sequences, N_residues). Microscopy: (x, y, z, channel, time). Mass spec: (m/z, intensity, time, replicate). Every biological measurement IS an N-D array — and NumPy is the universal interface.</p>
          <p><strong className="text-foreground/80">Attention IS the folding algorithm.</strong> AlphaFold didn't learn physics — it learned co-evolution patterns. Residues that mutate together across evolution are in physical contact. Column attention on the MSA finds these co-evolving pairs → distance predictions → 3D structure. The attention matrix IS the contact map — softmax(QK^T) measures co-evolution strength. This is why AlphaFold works: attention captures the statistical signature of folding without ever solving Newton's equations.</p>
        </div>
      </Foldable>

      {/* Cross-disciplinary elegant-code card — Verlet */}
      <SectionCard
        title="Cross-disciplinary elegance — Verlet bridges molecular dynamics, games, and orbits"
        description="Verlet (r(t+Δt) = 2r(t) - r(t-Δt) + F/m×Δt²) IS time-reversal symmetry. A biochemist simulating protein folding (AMBER), a game developer simulating ragdoll physics (Havok), and an aerospace engineer simulating spacecraft (NASA) use the SAME formula because all three simulate Hamiltonian systems."
        icon={<Sparkles className="h-5 w-5" />}
        badge="elegant code"
      >
        <DatasetCards
          examples={ELEGANT_CODE_CARDS.filter((_, i) => i === 4)}
          intro="Verlet (MD ↔ games ↔ orbits): the SAME symplectic integrator for protein folding, ragdoll physics, and spacecraft trajectories."
        />
      </SectionCard>

      {/* Related elegant-code — card → card adjacency footer */}
      <RelatedElegantCode hostPage={"computational-biology" as never} />


      <DeeperThoughtSection pageTitle="Computational Biology">
        <DeeperThought title="Computational Biology IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about Computational Biology is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. Computational Biology connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where Computational Biology sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (Computational Biology) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
        { id: "numpy-scipy" as const, reason: "NumPy N-D arrays power MD + AlphaFold" },
        { id: "transformer-deep-dive" as const, reason: "AlphaFold evoformer = transformer" },
        { id: "gpu-computing" as const, reason: "GPU acceleration for MD + cryo-EM" },
        { id: "bioinformatics" as const, reason: "Bioinformatics (sequence analysis)" },
        { id: "molecular-modelling" as const, reason: "Molecular modelling (AMBER + EGNN)" },
        { id: "alphaproteo" as const, reason: "AlphaProteo (binder design)" },
        { id: "boltz" as const, reason: "Boltz (multi-chain diffusion)" },
        { id: "ai-drug-discovery" as const, reason: "AI drug discovery (Insilico + Recursion)" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("numpy-scipy")} className="text-sm text-primary hover:underline">
          &rarr; NumPy/SciPy (N-D arrays for MD + AlphaFold)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("transformer-deep-dive")} className="text-sm text-primary hover:underline">
          &rarr; Transformer Deep Dive (attention = AlphaFold evoformer)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("molecular-modelling")} className="text-sm text-primary hover:underline">
          &rarr; Molecular Modelling (AMBER + EGNN)
        </Link>
      </div>
    </div>
  );
}
