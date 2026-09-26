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
import { Badge } from "@/components/ui/badge";
import {
  Atom, FlaskConical, Orbit, Sparkles, History, TrendingUp, Boxes,
  Cpu, Sigma, Zap, Activity, Layers, Microscope, Beaker,
} from "lucide-react";

const KPIS = [
  { label: "DFT engine", value: "Gaussian + ORCA", hint: "Self-consistent field (SCF) loop: guess density ρ₀ → solve Kohn-Sham [-½∇² + V_eff[ρ]]ψ_i = ε_iψ_i → new ρ → check |Δρ| → converge. O(N³) diagonalization for N basis functions.", deltaTone: "flat" as const },
  { label: "Solid-state DFT", value: "VASP (plane waves)", hint: "Periodic boundary conditions + plane-wave basis + pseudopotentials. Materials science gold standard — catalysts, semiconductors, batteries.", deltaTone: "up" as const },
  { label: "Functional", value: "B3LYP hybrid", hint: "Becke 3-parameter + Lee-Yang-Parr: mixes exact HF exchange (20%) with GGA. Most-cited functional in chemistry — ~100k publications/year.", deltaTone: "up" as const },
  { label: "Kinetics", value: "Arrhenius k = A·exp(-Ea/RT)", hint: "Reaction rate from activation energy barrier. Compute Ea from DFT transition state (one imaginary frequency). TS theory: k = (k_B T/h)·exp(-ΔG‡/RT).", deltaTone: "flat" as const },
];

// ============================================================
// ScienceShort — 5-phase looping animation
// ============================================================

const SHORT_PHASES = [
  {
    name: "Wet Lab",
    desc: "Synthesis (round-bottom flask) + NMR/IR spectroscopy → molecular structure + spectra",
    svg: (
      <svg viewBox="0 0 300 120" className="w-full h-auto">
        {/* Flask */}
        <path d="M70,30 L70,45 L55,75 L100,75 L85,45 L85,30 Z" fill="oklch(0.65 0.16 30)20" stroke="oklch(0.65 0.16 30)" strokeWidth="1.5" />
        <rect x="68" y="22" width="19" height="8" rx="1" fill="oklch(0.65 0.16 30)20" stroke="oklch(0.65 0.16 30)" strokeWidth="1" />
        <text x="77" y="68" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 30)" fontWeight="bold">RXN</text>
        {/* Bubbles */}
        <motion.circle cx="78" cy="60" r="2" fill="oklch(0.65 0.16 30)" animate={{ cy: [60, 30, 60], opacity: [1, 0, 1] }} transition={{ duration: 1.8, repeat: Infinity }} />
        {/* Spectrometer */}
        <rect x="160" y="35" width="80" height="40" rx="4" fill="oklch(0.65 0.16 200)20" stroke="oklch(0.65 0.16 200)" strokeWidth="1.5" />
        <text x="200" y="50" textAnchor="middle" fontSize="8" fill="oklch(0.65 0.16 200)" fontWeight="bold">NMR/IR</text>
        <polyline points="165,65 175,58 185,62 195,50 205,55 215,45 225,52 235,48" fill="none" stroke="oklch(0.65 0.16 200)" strokeWidth="1.2" />
        <text x="200" y="95" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">spectrum</text>
      </svg>
    ),
  },
  {
    name: "DFT computation",
    desc: "Gaussian/ORCA: guess ρ → solve Kohn-Sham → new ρ → SCF loop until |Δρ| → ε_threshold",
    svg: (
      <svg viewBox="0 0 300 120" className="w-full h-auto">
        <rect x="20" y="35" width="60" height="40" rx="4" fill="oklch(0.65 0.16 165)20" stroke="oklch(0.65 0.16 165)" strokeWidth="1.5" />
        <text x="50" y="52" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 165)" fontWeight="bold">ρ₀</text>
        <text x="50" y="63" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 165)">guess</text>
        <rect x="115" y="30" width="80" height="50" rx="4" fill="oklch(0.65 0.16 250)25" stroke="oklch(0.65 0.16 250)" strokeWidth="1.5" />
        <text x="155" y="48" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 250)" fontWeight="bold">Kohn-Sham</text>
        <text x="155" y="58" textAnchor="middle" fontSize="5.5" fill="oklch(0.55 0.05 250)">[-½∇²+V_eff]ψ=εψ</text>
        <text x="155" y="68" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 250)">SCF loop</text>
        <rect x="220" y="35" width="60" height="40" rx="4" fill="oklch(0.65 0.16 30)20" stroke="oklch(0.65 0.16 30)" strokeWidth="1.5" />
        <text x="250" y="52" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 30)" fontWeight="bold">E, ψ_i</text>
        <text x="250" y="63" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 30)">converged</text>
        {/* Arrows forward */}
        <line x1="80" y1="55" x2="113" y2="55" stroke="var(--border)" strokeWidth="1" markerEnd="url(#cc-arrow)" />
        <line x1="195" y1="55" x2="218" y2="55" stroke="var(--border)" strokeWidth="1" markerEnd="url(#cc-arrow)" />
        {/* Loop-back arrow */}
        <motion.path d="M155,30 Q155,15 100,15 Q50,15 50,35" fill="none" stroke="oklch(0.65 0.16 30)" strokeWidth="1" strokeDasharray="3 2"
          animate={{ strokeDashoffset: [0, -10] }} transition={{ duration: 1, repeat: Infinity }} />
        <defs><marker id="cc-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" /></marker></defs>
      </svg>
    ),
  },
  {
    name: "Molecular Orbitals",
    desc: "HOMO (highest occupied) → LUMO (lowest unoccupied); gap = ε_LUMO - ε_HOMO → reactivity + color",
    svg: (
      <svg viewBox="0 0 300 120" className="w-full h-auto">
        {/* LUMO orbital */}
        <ellipse cx="220" cy="35" rx="35" ry="18" fill="oklch(0.65 0.16 250)25" stroke="oklch(0.65 0.16 250)" strokeWidth="1.5" />
        <ellipse cx="220" cy="35" rx="18" ry="9" fill="oklch(0.65 0.16 250)50" />
        <text x="220" y="20" textAnchor="middle" fontSize="8" fill="oklch(0.65 0.16 250)" fontWeight="bold">LUMO</text>
        <text x="220" y="68" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 250)">empty · ε_L</text>
        {/* HOMO orbital */}
        <ellipse cx="80" cy="85" rx="35" ry="18" fill="oklch(0.65 0.16 30)25" stroke="oklch(0.65 0.16 30)" strokeWidth="1.5" />
        <ellipse cx="80" cy="85" rx="18" ry="9" fill="oklch(0.65 0.16 30)50" />
        <text x="80" y="68" textAnchor="middle" fontSize="8" fill="oklch(0.65 0.16 30)" fontWeight="bold">HOMO</text>
        <text x="80" y="111" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 30)">filled · ε_H</text>
        {/* Gap arrow */}
        <line x1="100" y1="78" x2="200" y2="42" stroke="oklch(0.65 0.16 165)" strokeWidth="1.5" markerEnd="url(#gap-arrow)" />
        <text x="150" y="55" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 165)" fontWeight="bold">ΔE gap</text>
        <motion.circle cx="150" cy="60" r="2" fill="oklch(0.65 0.16 165)" animate={{ cx: [110, 190, 110], opacity: [1, 1, 1] }} transition={{ duration: 2, repeat: Infinity }} />
        <defs><marker id="gap-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill="oklch(0.65 0.16 165)" /></marker></defs>
      </svg>
    ),
  },
  {
    name: "Publication",
    desc: "matplotlib: energy diagram, orbital isosurface, geometry → JACS/JCTC paper + Jupyter+ORCA log",
    svg: (
      <svg viewBox="0 0 300 120" className="w-full h-auto">
        <rect x="40" y="20" width="80" height="60" rx="4" fill="oklch(0.65 0.16 60)20" stroke="oklch(0.65 0.16 60)" strokeWidth="1" />
        <text x="80" y="35" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 60)" fontWeight="bold">Energy diagram</text>
        <line x1="55" y1="70" x2="65" y2="70" stroke="oklch(0.65 0.16 60)" strokeWidth="1.5" />
        <line x1="75" y1="55" x2="85" y2="55" stroke="oklch(0.65 0.16 60)" strokeWidth="1.5" />
        <line x1="95" y1="40" x2="105" y2="40" stroke="oklch(0.65 0.16 60)" strokeWidth="1.5" />
        <line x1="65" y1="65" x2="75" y2="60" stroke="var(--muted-foreground)" strokeWidth="0.8" strokeDasharray="2 2" />
        <line x1="85" y1="50" x2="95" y2="45" stroke="var(--muted-foreground)" strokeWidth="0.8" strokeDasharray="2 2" />
        <text x="80" y="92" textAnchor="middle" fontSize="6" fill="var(--muted-foreground)">E vs reaction coord</text>
        <rect x="170" y="20" width="80" height="60" rx="4" fill="oklch(0.65 0.16 250)20" stroke="oklch(0.65 0.16 250)" strokeWidth="1" />
        <text x="210" y="35" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 250)" fontWeight="bold">JACS/JCTC</text>
        <text x="210" y="50" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 250)">+ Gaussian log</text>
        <text x="210" y="62" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 250)">+ Jupyter</text>
        <line x1="122" y1="50" x2="168" y2="50" stroke="var(--border)" strokeWidth="1" markerEnd="url(#pub2-arrow)" />
        <defs><marker id="pub2-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" /></marker></defs>
      </svg>
    ),
  },
  {
    name: "Marketplace",
    desc: "Schrödinger Inc (drug design), Materials Design (catalysts), QuantummWorks, Aspen (process modeling)",
    svg: (
      <svg viewBox="0 0 300 120" className="w-full h-auto">
        <rect x="15" y="20" width="65" height="30" rx="4" fill="oklch(0.65 0.16 30)20" stroke="oklch(0.65 0.16 30)" strokeWidth="1" />
        <text x="47" y="35" textAnchor="middle" fontSize="6.5" fill="oklch(0.65 0.16 30)" fontWeight="bold">Schrödinger</text>
        <rect x="90" y="20" width="60" height="30" rx="4" fill="oklch(0.65 0.16 165)20" stroke="oklch(0.65 0.16 165)" strokeWidth="1" />
        <text x="120" y="35" textAnchor="middle" fontSize="6.5" fill="oklch(0.65 0.16 165)" fontWeight="bold">Mat. Design</text>
        <rect x="160" y="20" width="55" height="30" rx="4" fill="oklch(0.65 0.16 250)20" stroke="oklch(0.65 0.16 250)" strokeWidth="1" />
        <text x="187" y="35" textAnchor="middle" fontSize="6.5" fill="oklch(0.65 0.16 250)" fontWeight="bold">Aspen</text>
        <rect x="225" y="20" width="60" height="30" rx="4" fill="oklch(0.65 0.16 320)20" stroke="oklch(0.65 0.16 320)" strokeWidth="1" />
        <text x="255" y="35" textAnchor="middle" fontSize="6.5" fill="oklch(0.65 0.16 320)" fontWeight="bold">OpenEye</text>
        <text x="150" y="75" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">Drug discovery + materials science</text>
        <motion.circle cx="47" cy="55" r="4" fill="oklch(0.65 0.16 30)"
          animate={{ cx: [47, 120, 187, 255, 47] }} transition={{ duration: 3, repeat: Infinity }} />
      </svg>
    ),
  },
];

// ============================================================
// Pyodide demo — Arrhenius kinetics simulation
// ============================================================

const MATH_DEMO = `# ============================================================
# Computational Chemistry — Arrhenius kinetics simulation
# Pure Python (Pyodide, no numpy)
# ============================================================

import math

# Arrhenius equation: k = A * exp(-Ea / (R * T))
#   A   = pre-exponential factor (1/s) — collision frequency * orientation
#   Ea  = activation energy (J/mol) — energy barrier
#   R   = gas constant = 8.314 J/(mol*K)
#   T   = absolute temperature (K)

R = 8.314       # J/(mol*K)
A = 1.0e13      # 1/s — typical unimolecular decomposition
Ea = 50000.0    # J/mol (50 kJ/mol) — typical organic reaction

print("=== Arrhenius Kinetics Simulation ===")
print(f"A = {A:.2e} 1/s,  Ea = {Ea/1000.0:.1f} kJ/mol,  R = {R} J/(mol*K)")
print()
print("T (K)    k (1/s)            half-life          comment")
print("-" * 72)

# Run reaction at several temperatures
temperatures = [200, 250, 273, 298, 310, 350, 400, 500, 800, 1000]
for T in temperatures:
    k = A * math.exp(-Ea / (R * T))
    # half-life for first-order reaction: t_half = ln(2) / k
    if k > 0:
        t_half = math.log(2) / k
    else:
        t_half = float("inf")
    # human-readable half-life
    if t_half < 0.001:
        hl = f"{t_half*1e6:.2f} us"
    elif t_half < 1:
        hl = f"{t_half*1000:.2f} ms"
    elif t_half < 60:
        hl = f"{t_half:.2f} s"
    elif t_half < 3600:
        hl = f"{t_half/60:.2f} min"
    elif t_half < 86400:
        hl = f"{t_half/3600:.2f} hr"
    elif t_half < 86400*365:
        hl = f"{t_half/86400:.2f} days"
    else:
        hl = f"{t_half/(86400*365):.2e} yrs"
    # tag for human interpretation
    if k < 1e-6:
        tag = "frozen"
    elif k < 1:
        tag = "slow"
    elif k < 1e3:
        tag = "moderate"
    elif k < 1e6:
        tag = "fast"
    else:
        tag = "explosive"
    print(f"{T:4d}    {k:14.4e}    {hl:14s}     {tag}")

print()
print("=== Insight: rate doubles every ~10 K near room temperature ===")
# Show Q10 effect: rate at 310 K vs 300 K
T1, T2 = 300.0, 310.0
k1 = A * math.exp(-Ea / (R * T1))
k2 = A * math.exp(-Ea / (R * T2))
print(f"k(310 K) / k(300 K) = {k2/k1:.3f}  (Q10 — van't Hoff rule)")
print(f"-> Reaction rate is exponentially sensitive to temperature.")
print(f"-> Ea is computed from DFT: find transition state (one imag. frequency).")
print(f"-> This is how DFT + transition-state theory predicts reaction rates")`;

// ============================================================
// DFT SCF loop SVG
// ============================================================

function ScfLoopDiagram() {
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Atom className="h-3.5 w-3.5 text-primary" />
          DFT self-consistent field (SCF) loop — guess density → Kohn-Sham → new density → convergence (custom SVG)
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 400 220" className="w-full h-auto">
          {/* Step 1: guess density */}
          <rect x="20" y="20" width="100" height="50" rx="4" fill="oklch(0.65 0.16 30)20" stroke="oklch(0.65 0.16 30)" strokeWidth="1.5" />
          <text x="70" y="38" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 30)" fontWeight="bold">1. Guess ρ₀(r)</text>
          <text x="70" y="50" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 30)">superposition</text>
          <text x="70" y="60" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 30)">of atomic densities</text>

          {/* Step 2: solve Kohn-Sham */}
          <rect x="150" y="20" width="120" height="50" rx="4" fill="oklch(0.65 0.16 250)25" stroke="oklch(0.65 0.16 250)" strokeWidth="1.5" />
          <text x="210" y="38" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 250)" fontWeight="bold">2. Solve Kohn-Sham</text>
          <text x="210" y="50" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 250)">[-½∇² + V_eff[ρ]]ψ_i</text>
          <text x="210" y="60" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 250)">= ε_i ψ_i  (eigensolver)</text>

          {/* Step 3: compute new density */}
          <rect x="150" y="110" width="120" height="50" rx="4" fill="oklch(0.65 0.16 165)25" stroke="oklch(0.65 0.16 165)" strokeWidth="1.5" />
          <text x="210" y="128" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 165)" fontWeight="bold">3. New density</text>
          <text x="210" y="140" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 165)">ρ_new(r) = Σ_occ |ψ_i(r)|²</text>
          <text x="210" y="150" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 165)">+ exchange-corr. E_xc[ρ]</text>

          {/* Step 4: convergence check */}
          <rect x="20" y="110" width="100" height="50" rx="4" fill="oklch(0.65 0.16 60)25" stroke="oklch(0.65 0.16 60)" strokeWidth="1.5" />
          <text x="70" y="128" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 60)" fontWeight="bold">4. Converged?</text>
          <text x="70" y="140" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 60)">|ρ_new - ρ_old|</text>
          <text x="70" y="150" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 60)">&lt; ε_threshold?</text>

          {/* Output box */}
          <rect x="290" y="65" width="100" height="50" rx="4" fill="oklch(0.65 0.16 320)25" stroke="oklch(0.65 0.16 320)" strokeWidth="1.5" />
          <text x="340" y="82" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 320)" fontWeight="bold">Output</text>
          <text x="340" y="94" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 320)">E_total[ρ]</text>
          <text x="340" y="104" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 320)">ψ_i, ε_i (HOMO/LUMO)</text>

          {/* Arrows: 1->2 */}
          <line x1="120" y1="45" x2="148" y2="45" stroke="var(--border)" strokeWidth="1" markerEnd="url(#scf-arrow)" />
          {/* 2 -> 3 (down) */}
          <line x1="210" y1="70" x2="210" y2="108" stroke="var(--border)" strokeWidth="1" markerEnd="url(#scf-arrow)" />
          {/* 3 -> 4 (left) */}
          <line x1="148" y1="135" x2="122" y2="135" stroke="var(--border)" strokeWidth="1" markerEnd="url(#scf-arrow)" />
          {/* 4 -> 2 (loop back, up-right) */}
          <motion.path d="M70,110 Q70,85 100,80 Q150,75 150,55" fill="none" stroke="oklch(0.65 0.16 30)" strokeWidth="1.2" strokeDasharray="3 2"
            animate={{ strokeDashoffset: [0, -10] }} transition={{ duration: 1, repeat: Infinity }} />
          <text x="105" y="98" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 30)" fontWeight="bold">no — iterate</text>
          {/* 4 -> output (yes) */}
          <line x1="120" y1="135" x2="220" y2="100" stroke="oklch(0.65 0.16 320)" strokeWidth="1.2" markerEnd="url(#scf-arrow)" />
          <text x="200" y="178" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 320)" fontWeight="bold">yes — done</text>

          {/* Typical iteration count */}
          <text x="200" y="200" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">
            Typical: 10-50 SCF iterations · O(N³) per iteration (diagonalization) · N = # basis functions
          </text>

          <defs><marker id="scf-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" /></marker></defs>
        </svg>
      </div>
    </div>
  );
}

// ============================================================
// Main page
// ============================================================

export function ComputationalChemistryPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Computational Chemistry · DFT · Hartree-Fock · molecular orbitals · Arrhenius · SCF · Schrödinger · Kohn-Sham · wet lab → marketplace"
        title="Computational Chemistry — from Schrödinger to drug design via DFT"
        description="Computational chemistry is where the Schrödinger equation meets chemistry — Hartree-Fock approximates the wavefunction as a Slater determinant (mean-field), DFT replaces the many-electron wavefunction with the electron density ρ(r) and iterates the Kohn-Sham equations to self-consistency (SCF loop). Molecular orbitals (HOMO/LUMO) come from the eigenvalues of the Kohn-Sham Hamiltonian, the gap ΔE = ε_LUMO - ε_HOMO predicts reactivity and color, and Arrhenius kinetics (k = A·exp(-Ea/RT)) translates activation energies into reaction rates. This page covers the math (Schrödinger, Kohn-Sham, Born-Oppenheimer, Arrhenius, HOMO-LUMO), a custom SCF-loop SVG, a Pyodide Arrhenius demo, comparison of Gaussian/ORCA/VASP/Q-Chem, and the full wet-lab-to-marketplace narrative (Schrödinger Inc, Materials Design, Aspen)."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Atom className="h-3 w-3" /> DFT + SCF</Badge>
            <Badge variant="outline" className="gap-1.5"><Orbit className="h-3 w-3" /> HOMO/LUMO</Badge>
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
        title="Scientific pipeline short — wet lab → DFT → molecular orbitals → publication → marketplace"
        description="A looping 5-phase animation showing the computational chemistry pipeline. Phase 1: wet lab (synthesis + NMR/IR spectroscopy). Phase 2: DFT computation (Gaussian/ORCA SCF loop). Phase 3: molecular orbitals (HOMO/LUMO gap). Phase 4: publication (energy diagram + paper). Phase 5: marketplace (Schrödinger, Materials Design, Aspen, OpenEye)."
        icon={<Activity className="h-5 w-5" />}
        badge="short (loop)"
      >
        <ScienceShort phases={SHORT_PHASES} interval={1500} />
      </SectionCard>

      {/* Mathematical foundations — FOLDED */}
      <Foldable
        title="Mathematical foundations — Schrödinger, Kohn-Sham, Born-Oppenheimer, Arrhenius, HOMO-LUMO"
        summary="5 equations: Schrödinger Hψ=Eψ, Kohn-Sham eigenvalue problem, Born-Oppenheimer separation, Arrhenius kinetics, LUMO-HOMO gap"
      >
        <div className="space-y-4">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm font-semibold text-primary mb-2">1. Schrödinger Equation (time-independent)</p>
            <p className="font-mono text-xs text-primary mb-2">
              Ĥψ = Eψ · where Ĥ = T̂ + V̂_ext + V̂_ee · T̂ = kinetic, V̂_ext = nuclei-electron, V̂_ee = electron-electron
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The Schrödinger equation is an eigenvalue problem: the Hamiltonian operator Ĥ acts on the wavefunction ψ,
              yielding energy eigenvalues E. For molecules, Ĥ includes kinetic energy of electrons, the external
              potential from nuclei, and the inter-electron repulsion. The catch: V̂_ee couples all electrons, so the
              equation is impossible to solve exactly for systems with more than one electron.
              <strong> Why this matters:</strong> Every quantum-chemistry method (HF, DFT, post-HF) is an approximation
              to this equation. Hartree-Fock approximates ψ as a Slater determinant of one-electron orbitals; DFT
              reformulates the problem in terms of the electron density ρ(r). The Schrödinger equation is the
              bedrock — without it there is no computational chemistry.
            </p>
          </div>
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">2. Kohn-Sham Equations (DFT)</p>
            <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 mb-2">
              [-½∇² + V_eff[ρ]] ψ_i = ε_i ψ_i · V_eff = V_ext + V_H[ρ] + V_xc[ρ]
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              DFT reformulates the many-electron problem using the electron density ρ(r) instead of the wavefunction ψ.
              The Kohn-Sham trick: replace the interacting system with a fictitious non-interacting system that has
              the same density, then iterate until self-consistent. The effective potential V_eff includes the external
              potential (nuclei), Hartree potential V_H (classical Coulomb repulsion), and exchange-correlation V_xc
              (the magic — captures all quantum many-body effects in one functional).
              <strong> Why this matters:</strong> DFT scales as O(N³) vs O(N⁵) for post-HF methods — accurate results
              for systems with hundreds of atoms. Kohn-Sham won the 1998 Nobel Prize. The catch: the exact V_xc[ρ] is
              unknown, so we use approximations (LDA, GGA, B3LYP hybrid).
            </p>
          </div>
          <div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-3">
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">3. Born-Oppenheimer Approximation</p>
            <p className="font-mono text-xs text-violet-600 dark:text-violet-400 mb-2">
              m_e / m_nucleus ≈ 1/1836 → electrons are fast, nuclei are slow → separate the wavefunction
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The Born-Oppenheimer approximation decouples electron and nuclear motion. Because electrons are ~1836×
              lighter than protons (and ~10⁴× lighter than C/N/O nuclei), electrons effectively instantaneously
              adapt to nuclear positions. This lets us solve the Schrödinger equation for electrons at fixed nuclear
              geometry, then minimize the energy over nuclear coordinates — producing a potential energy surface (PES).
              <strong> Why this matters:</strong> Without Born-Oppenheimer, every nuclear dynamics step would require
              solving the full electron-nucleus coupled equation. With it, geometry optimization (finding equilibrium
              structures) becomes tractable. It breaks down at conical intersections (photochemistry) — but for ground-
              state chemistry, this approximation is the foundation of all quantum chemistry codes.
            </p>
          </div>
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">4. Arrhenius Equation</p>
            <p className="font-mono text-xs text-amber-600 dark:text-amber-400 mb-2">
              k = A × exp(-Ea / (R T)) · ln(k) = ln(A) - Ea/(R T)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The Arrhenius equation gives the temperature dependence of reaction rates. A is the pre-exponential
              factor (collision frequency × steric orientation), Ea is the activation energy (the energy barrier
              between reactants and the transition state), R is the gas constant, T is absolute temperature. The rate
              constant k is exponentially sensitive to temperature — a 10 K rise near 300 K roughly doubles k (van't
              Hoff's Q10 rule). The activation energy Ea comes from DFT: locate the transition state (one imaginary
              frequency), compute its energy relative to reactants.
              <strong> Why this matters:</strong> Arrhenius translates quantum-mechanical barriers into real-world
              kinetics. Without it, DFT would give only energies; with it, DFT predicts shelf life, catalytic turnover
              frequencies, and combustion rates. Transition-state theory refines Arrhenius further: k = (k_B T/h)·exp(-ΔG‡/RT).
            </p>
          </div>
          <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3">
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-2">5. HOMO-LUMO Gap</p>
            <p className="font-mono text-xs text-rose-600 dark:text-rose-400 mb-2">
              ΔE = ε_LUMO - ε_HOMO · gap → reactivity · gap → optical absorption (color)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The Kohn-Sham eigenvalues ε_i are the orbital energies. The Highest Occupied Molecular Orbital (HOMO)
              is the orbital from which electrons are most easily removed (ionization, nucleophilicity); the Lowest
              Unoccupied Molecular Orbital (LUMO) is the orbital to which electrons are most easily added (electron
              affinity, electrophilicity). The gap ΔE = ε_LUMO - ε_HOMO predicts: chemical reactivity (small gap =
              reactive, e.g. radical species), optical absorption gap (the molecule absorbs photons with energy ≥ ΔE),
              and kinetic stability (large gap = stable).
              <strong> Why this matters:</strong> The HOMO-LUMO gap is the single most important output of a DFT
              calculation for chemistry. It explains why ethene (gap ~7 eV) is colorless but beta-carotene (gap ~2 eV)
              is orange — conjugation shrinks the gap into the visible. Frontier Molecular Orbial theory (Fukui,
              Nobel 1981) uses HOMO/LUMO to predict where reactions happen on a molecule.
            </p>
          </div>
        </div>
      </Foldable>

      {/* SCF loop SVG */}
      <SectionCard
        title="DFT self-consistent field (SCF) loop — guess → Kohn-Sham → new density → convergence (custom SVG)"
        description="The SCF loop is the heart of DFT. Step 1: start with a guess density (superposition of atomic densities). Step 2: build V_eff[ρ] and solve the Kohn-Sham eigenvalue problem [-½∇² + V_eff]ψ_i = ε_iψ_i. Step 3: compute a new density ρ_new = Σ_occ |ψ_i|². Step 4: check |ρ_new - ρ_old| against a convergence threshold (typically 10⁻⁶). If not converged, mix densities and iterate. Typical: 10-50 SCF iterations per geometry; each iteration costs O(N³) for the diagonalization."
        icon={<Atom className="h-5 w-5" />}
        badge="algorithm"
      >
        <ScfLoopDiagram />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: Arrhenius kinetics — compute reaction rate at different temperatures (Pyodide)"
        description="Pure-Python Arrhenius simulation: A = 10¹³ 1/s, Ea = 50 kJ/mol (typical organic reaction). Computes rate constant k = A·exp(-Ea/RT) and half-life t₁/₂ = ln(2)/k for temperatures from 200 K to 1000 K. Shows the Q10 rule (rate doubling per 10 K near room temperature) and explains how DFT-computed activation energies translate to real-world reaction kinetics."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={MATH_DEMO} buttonLabel="Run Arrhenius simulation (Pyodide)" />
      </SectionCard>

      {/* Comparison */}
      <SectionCard
        title="DFT engines compared — Gaussian vs ORCA vs VASP vs Q-Chem"
        description="Four production DFT engines. Gaussian (commercial, oldest, ubiquitous). ORCA (free for academic, Frank Neese, multireference). VASP (plane-wave, materials science). Q-Chem (commercial, linear-scaling, UK-based)."
        icon={<Boxes className="h-5 w-5" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30">
              <tr className="border-b border-border/60">
                <th className="text-left px-3 py-2 font-semibold">Feature</th>
                <th className="text-left px-3 py-2 font-semibold">Gaussian</th>
                <th className="text-left px-3 py-2 font-semibold text-primary">ORCA</th>
                <th className="text-left px-3 py-2 font-semibold">VASP</th>
                <th className="text-left px-3 py-2 font-semibold">Q-Chem</th>
              </tr>
            </thead>
            <tbody>
              {[
                { f: "Origin", g: "Pople 1970 (Carnegie-Mellon)", o: "Neese 2004 (MPI Mülheim)", v: "Kresse 1990s (Vienna)", q: "Shao 2015 (Q-Chem Inc)" },
                { f: "License", g: "Commercial (Gaussian Inc)", o: "Free for academic", v: "Commercial (VASP GmbH)", q: "Commercial (Q-Chem Inc)" },
                { f: "Basis focus", g: "Gaussian basis (6-31G)", o: "Gaussian + def2 (Turbomole)", v: "Plane waves + PAW", q: "Gaussian + linear-scaling" },
                { f: "Periodic (solids)", g: "Limited (G16 only)", o: "Limited", v: "Yes (gold standard)", q: "Yes (Python SDK)" },
                { f: "GPU", g: "Gaussian GPU (NVIDIA)", o: "Yes (recent versions)", v: "Yes (OpenMP+GPU)", q: "Limited" },
                { f: "Best for", g: "General chemistry", o: "Spectroscopy + multiref", v: "Materials/catalysts", q: "Large molecules + QM/MM" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{row.f}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.g}</td>
                  <td className="px-3 py-2 text-primary/80">{row.o}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.v}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.q}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Why evolved — FOLDED */}
      <Foldable
        title="Why computational chemistry evolved — from hand-solved hydrogen to DFT"
        summary="4 shortfalls: hand-solved Schrödinger only for H, no electron correlation in HF, no kinetics from first principles, no materials methods"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Shortfall 1: Schrödinger was only solvable for hydrogen.</strong> The Schrödinger equation Hψ=Eψ is analytically solvable for hydrogen (one electron) but intractable for any multi-electron system due to electron-electron repulsion coupling all coordinates. Hartree-Fock (1930s) introduced the mean-field approximation — replace V_ee with an averaged potential. DFT (1965, Kohn-Sham) reformulated the problem using the electron density ρ(r), making 100+ atom calculations feasible.</p>
          <p><strong className="text-foreground/80">Shortfall 2: Hartree-Fock ignores electron correlation.</strong> The mean-field approximation misses the instantaneous Coulomb correlation between electrons. HF predicts atomization energies with ~30% error — useless for chemistry. DFT captures correlation via the exchange-correlation functional V_xc[ρ]. Modern hybrids (B3LYP, ωB97X-D) mix in exact HF exchange, achieving ~1 kcal/mol accuracy (chemical accuracy) for organic molecules.</p>
          <p><strong className="text-foreground/80">Shortfall 3: No way to compute reaction rates from first principles.</strong> Even with accurate energies, predicting k = A·exp(-Ea/RT) required guessing Ea experimentally. DFT changed this: locate the transition state (saddle point on the PES with one imaginary frequency), compute its energy, plug into Arrhenius or Eyring equation. Transition-state theory (Eyring, 1935) connects DFT to kinetics: k = (k_B T/h)·exp(-ΔG‡/RT).</p>
          <p><strong className="text-foreground/80">Shortfall 4: No accurate methods for materials/solids.</strong> Molecular Gaussian-basis DFT works for molecules but fails for periodic solids (metals, semiconductors, catalysts). Plane-wave DFT with pseudopotentials (VASP, 1990s) revolutionized materials science — surfaces, interfaces, batteries, superconductors. VASP powers ~50% of published materials DFT.</p>
        </div>
      </Foldable>

      {/* Unique features */}
      <SectionCard
        title="Truly unique computational chemistry features"
        description="Four features that make computational chemistry unique as a discipline."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. SCF = self-consistent field</p>
            <p className="text-muted-foreground">Iterate the density until input ρ = output ρ. <strong>Nonlinear eigenvalue problem — the hallmark of DFT.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Functionals trade accuracy vs cost</p>
            <p className="text-muted-foreground">LDA (cheap, ~10% error) → GGA (PBE, ~5%) → hybrid (B3LYP, ~1 kcal/mol) → double-hybrid (CCSD-like). <strong>Choose on the accuracy-cost Pareto frontier.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. HOMO-LUMO gap = reactivity + color</p>
            <p className="text-muted-foreground">Eigenvalues of the Kohn-Sham Hamiltonian → frontier orbitals. <strong>One number explains reactivity, conductivity, and color.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Born-Oppenheimer separates scales</p>
            <p className="text-muted-foreground">m_e/m_nucleus ~1/1836 justifies solving electrons-at-fixed-nuclei. <strong>Enables geometry optimization on the Born-Oppenheimer PES.</strong></p>
          </div>
        </div>
      </SectionCard>

      {/* Computational tooling — FOLDED */}
      <Foldable
        title="Computational tooling — DFT engines + functionals + basis sets + visualization"
        summary="Gaussian, ORCA, VASP, Q-Chem, NWChem, CP2K, Psi4, B3LYP, PBE, ωB97X-D, 6-31G, def2-TZVP, plane waves, VESTA, Avogadro"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> DFT Engines</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Gaussian</strong> — Pople 1970, Gaussian basis (6-31G, cc-pVTZ), commercial gold standard</li>
              <li>• <strong>ORCA</strong> — Neese 2004, free for academic, def2 basis, spectroscopy + multireference</li>
              <li>• <strong>VASP</strong> — Kresse 1990s, plane waves + PAW, materials science (solids/surfaces)</li>
              <li>• <strong>Q-Chem</strong> — commercial, linear-scaling DFT, QM/MM, excited states</li>
              <li>• <strong>NWChem / CP2K / Psi4</strong> — open-source DFT, GPU-ready, Python API</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Sigma className="h-3.5 w-3.5 text-primary" /> Functionals + Basis + Visualization</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>LDA</strong> (VWN) — local density approx, cheap, ~10% error</li>
              <li>• <strong>GGA</strong> (PBE, BLYP) — gradient correction, ~5% error</li>
              <li>• <strong>Hybrid</strong> (B3LYP, M06-2X, ωB97X-D) — exact HF exchange, ~1 kcal/mol</li>
              <li>• <strong>Basis sets</strong> — 6-31G*, cc-pVTZ, def2-TZVP (molecules); plane waves + PAW (solids)</li>
              <li>• <strong>Visualization</strong> — VESTA (solids), Avogadro (molecules), GaussView, ChemCraft, VMD</li>
            </ul>
          </div>
        </div>
      </Foldable>

      {/* Research — FOLDED */}
      <Foldable
        title="Research + wet lab to marketplace narrative"
        summary="Kohn-Sham 1965 (Nobel 1998), Hartree-Fock 1930s, B3LYP 1993, VASP 1990s, Schrödinger Inc, Materials Design, Aspen"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Kohn-Sham DFT (Kohn + Sham, 1965; Nobel 1998):</strong> "Self-Consistent Equations Including Exchange and Correlation Effects." Reformulated the many-electron problem in terms of the electron density ρ(r) — reduced dimensionality from 3N (wavefunction) to 3 (density). The Kohn-Sham equations [-½∇² + V_eff[ρ]]ψ_i = ε_iψ_i iterate to self-consistency. Walter Kohn shared the 1998 Nobel with John Pople (Gaussian).</p>
          <p><strong className="text-foreground/80">Hartree-Fock (Hartree 1928 + Fock 1930):</strong> Approximates the wavefunction as a single Slater determinant of one-electron orbitals. Mean-field approximation: each electron moves in the average potential of all others. Misses electron correlation (instantaneous avoidance) — but the foundation for all post-HF methods (MP2, CCSD, CCSD(T)).</p>
          <p><strong className="text-foreground/80">B3LYP hybrid functional (Becke 1993 + Lee-Yang-Parr 1988):</strong> Becke's 3-parameter hybrid mixes 20% exact Hartree-Fock exchange with GGA exchange-correlation. B3LYP became the most-cited functional in chemistry — ~100k publications/year. Achieves "chemical accuracy" (~1 kcal/mol) for organic molecules.</p>
          <p><strong className="text-foreground/80">VASP (Kresse + Furthmüller, 1990s):</strong> VASP = Vienna Ab initio Simulation Package. Plane-wave basis + Projector-Augmented-Wave (PAW) pseudopotentials + periodic boundary conditions. Materials science gold standard — surfaces, interfaces, defects, batteries, catalysts. Used in ~50% of materials DFT papers.</p>
          <p><strong className="text-foreground/80">Schrödinger Inc (drug discovery marketplace):</strong> Founded 1990. DFT (Jaguar) + docking (Glide) + free-energy perturbation (FEP+) — end-to-end small-molecule drug discovery. IPO at ~USD 4B. Built on decades of DFT method development — the commercial arm of computational chemistry.</p>
          <p><strong className="text-foreground/80">Materials Design Inc (materials marketplace):</strong> Founded 1998. MedeA platform wraps VASP for industrial R&D — catalysts, semiconductors, alloys. Industrial users: Boeing, Toyota, Exxon. The commercial translation of plane-wave DFT.</p>
          <p><strong className="text-foreground/80">Aspen Technology (process marketplace):</strong> Founded 1981. Aspen Plus + Aspen Custom Modeler — combines DFT-computed thermodynamics with chemical engineering kinetics. Used by every major chemical company (Dow, BASF, Shell) to design reactors. The marketplace end of computational chemistry — translating quantum calculations into plant-scale processes.</p>
        </div>
      </Foldable>

      {/* Insight — FOLDED */}
      <Foldable
        title="My deeper thought: computational chemistry IS solving the Schrödinger equation approximately"
        summary="Schrödinger + density functional + SCF iteration + Born-Oppenheimer = modern computational chemistry"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Computational chemistry IS the art of approximately solving the Schrödinger equation.</strong> Hartree-Fock IS the mean-field Slater determinant approximation. DFT IS the density-functional reformulation. The SCF loop IS the fixed-point iteration that finds the self-consistent density. Born-Oppenheimer IS the adiabatic separation of electron and nuclear scales. Arrhenius IS the translation from barrier energies to reaction rates. Every computational chemistry method IS an approximation to one underlying equation: Hψ = Eψ.</p>
          <p><strong className="text-foreground/80">The SCF loop IS the algorithmic heart of DFT.</strong> Density in → Kohn-Sham solve → density out. If input = output, you have self-consistency and the converged density determines all properties (energy, dipole, HOMO/LUMO, vibrational frequencies). The SCF loop is a nonlinear fixed-point iteration — like Picard iteration for differential equations, but for an N-electron quantum system. Convergence acceleration (DIIS, Anderson mixing) is what makes DFT practical — 10-50 iterations instead of thousands.</p>
          <p><strong className="text-foreground/80">Functionals ARE the empirical layer of DFT.</strong> The Kohn-Sham formulation is exact — but the exchange-correlation functional V_xc[ρ] is unknown. LDA, GGA, B3LYP, M06-2X, ωB97X-D are ansätze — parameterized against training sets (atomization energies, bond lengths, barrier heights). DFT is "first-principles" only in the sense that the functional form is derived from quantum mechanics; the parameters are empirical. This is why no single functional is best for everything — choose B3LYP for organic molecules, PBE for solids, M06-2X for non-covalent interactions. The functional IS the model — choosing it IS the science.</p>
        </div>
      </Foldable>

      <RelatedTopics topics={[
        { id: "computational-biology" as const, reason: "Computational Biology (MD + force fields from DFT)" },
        { id: "molecular-modelling" as const, reason: "Molecular Modelling (AMBER + force fields)" },
        { id: "enhanced-sampling" as const, reason: "Enhanced Sampling (DFT-informed MD potentials)" },
        { id: "neural-network-potentials" as const, reason: "Neural Network Potentials (DFT surrogate)" },
        { id: "cheminformatics" as const, reason: "Cheminformatics (SMILES + fingerprints)" },
        { id: "ai-drug-discovery" as const, reason: "AI Drug Discovery (DFT training data)" },
        { id: "quantum-computing" as const, reason: "Quantum Computing (exact Schrödinger)" },
        { id: "numpy-scipy" as const, reason: "NumPy/SciPy (eigenvalue solvers)" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("computational-biology")} className="text-sm text-primary hover:underline">
          &rarr; Computational Biology (MD + AlphaFold)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("molecular-modelling")} className="text-sm text-primary hover:underline">
          &rarr; Molecular Modelling (AMBER + EGNN)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("neural-network-potentials")} className="text-sm text-primary hover:underline">
          &rarr; Neural Network Potentials (DFT-surrogate ML)
        </Link>
      </div>
    </div>
  );
}
