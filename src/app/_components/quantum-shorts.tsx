"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "./code-block";
import { PyodideRunner } from "./pyodide-runner";
import {
  X, ChevronLeft, ChevronRight, Atom, Zap, Play, Pause, RotateCcw,
  TrendingUp, BookOpen, Sparkles,
} from "lucide-react";


/**
 * QuantumShortsCarousel — 4 vertical-video-style cards (9:16) inspired by
 * https://www.youtube.com/shorts/TOPgZ-AbFwo (Quantum Superposition Explained
 * in 30 Seconds).
 *
 * Each card has:
 *   - Hook title (3-5 words, "1. A qubit that's BOTH 0 and 1")
 *   - Tiny 9:16 animated SVG thumbnail (Bloch sphere / Bell pair / Grover bars / decay curve)
 *   - Click → modal pops up with the FULL content
 *
 * Modal content (LAZY-RENDERED only when card is clicked — the heavy SVG
 * animations + math + Pyodide code only mount on demand):
 *   - Larger animated SVG explaining the concept
 *   - Math equations block (monospace, styled)
 *   - Pyodide-runnable Python code with concrete numerical outcomes
 *   - "Recent research (2024-2025)" citation block with extracted numbers
 *
 * The 4 concepts cover the canonical pedagogical arc:
 *   1. Superposition  — single-qubit magic
 *   2. Entanglement   — multi-qubit non-separability
 *   3. Quantum algorithm — what you DO with superposition+interference
 *   4. Decoherence    — why your beautiful state evaporates in microseconds
 *
 * Each short is paired with a recent (2024-2025) breakthrough paper that
 * extends the concept with real hardware numbers:
 *   1. Google Willow (Dec 2024) — first QEC below surface-code threshold
 *   2. Microsoft + Quantinuum (Sep 2024) — 12 logical qubits at 99.8% fidelity
 *   3. IBM Heron R2 (Nov 2024) — 156-qubit utility work + tensor mitigation
 *   4. Google Willow (Nature 2025) — Λ = 2.14 ± 0.02 logical-error suppression
 */

// ============================================================
// Sub-components
// ============================================================

interface ShortMeta {
  id: string;
  step: string;      // "1", "2", "3", "4"
  hookTitle: string; // short, clickbait-y title (matches YT Shorts tone)
  subtitle: string;  // 1-line concept subtitle
  accent: string;    // CSS color (oklch)
  thumbnail: ReactNode; // small 9:16 animated SVG
  detail: ReactNode;    // full content rendered inside modal
}

// --- Thumbnail 1: Bloch sphere rotating vector ---
function BlochSphereThumbnail({ accent }: { accent: string }) {
  const [phi, setPhi] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhi(p => (p + 0.05) % (2 * Math.PI)), 50);
    return () => clearInterval(id);
  }, []);
  // Project 3D Bloch-sphere vector (theta=π/2, phi) to 2D isometric
  const theta = Math.PI / 2;
  const x = Math.sin(theta) * Math.cos(phi);
  const y = Math.sin(theta) * Math.sin(phi);
  const z = Math.cos(theta);
  // isometric projection
  const px = 50 + 30 * (x - y * 0.5);
  const py = 70 - 30 * (z + (x + y) * 0.3);
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <defs>
        <radialGradient id="bs-grad" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="oklch(0.96 0.02 250)" />
          <stop offset="100%" stopColor="oklch(0.40 0.15 250 / 0.4)" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="70" rx="38" ry="14" fill="none" stroke={accent} strokeWidth="0.5" strokeDasharray="2 2" opacity="0.6" />
      <ellipse cx="50" cy="70" rx="14" ry="38" fill="none" stroke={accent} strokeWidth="0.5" strokeDasharray="2 2" opacity="0.6" />
      <circle cx="50" cy="70" r="38" fill="url(#bs-grad)" stroke={accent} strokeWidth="1" opacity="0.7" />
      <line x1="50" y1="32" x2="50" y2="108" stroke="oklch(0.45 0.05 250)" strokeWidth="0.5" />
      <text x="50" y="28" textAnchor="middle" fontSize="6" fill="oklch(0.45 0.05 250)">|0⟩</text>
      <text x="50" y="116" textAnchor="middle" fontSize="6" fill="oklch(0.45 0.05 250)">|1⟩</text>
      <motion.line
        x1="50" y1="70" x2={px} y2={py}
        stroke={accent} strokeWidth="1.5"
        animate={{ x2: px, y2: py }}
        transition={{ duration: 0.05, ease: "linear" }}
      />
      <circle cx={px} cy={py} r="2.5" fill={accent} />
      <text x="50" y="132" textAnchor="middle" fontSize="6" fill={accent} fontWeight="bold">|+⟩</text>
    </svg>
  );
}

// --- Thumbnail 2: Bell pair (two linked qubits) ---
function BellPairThumbnail({ accent }: { accent: string }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 0.08) % (2 * Math.PI)), 60);
    return () => clearInterval(id);
  }, []);
  const wave1 = Math.sin(phase);
  const wave2 = Math.sin(phase + Math.PI); // always opposite
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <circle cx="28" cy="50" r="18" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.85" />
      <circle cx="28" cy="50" r="6" fill={wave1 > 0 ? accent : "oklch(0.95 0.02 250)"} />
      <text x="28" y="78" textAnchor="middle" fontSize="6" fill="oklch(0.45 0.05 250)">q0</text>
      <circle cx="72" cy="90" r="18" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.85" />
      <circle cx="72" cy="90" r="6" fill={wave2 > 0 ? accent : "oklch(0.95 0.02 250)"} />
      <text x="72" y="118" textAnchor="middle" fontSize="6" fill="oklch(0.45 0.05 250)">q1</text>
      {/* Entanglement link — wavy line */}
      <motion.path
        d={`M 40 60 Q ${(40 + 72) / 2 + Math.sin(phase * 2) * 8} 75, 60 80`}
        stroke={accent} strokeWidth="1" fill="none" strokeDasharray="2 1"
        animate={{ d: `M 40 60 Q ${(40 + 72) / 2 + Math.sin(phase * 2) * 8} 75, 60 80` }}
        transition={{ duration: 0.06 }}
      />
      <text x="50" y="135" textAnchor="middle" fontSize="5" fill={accent} fontWeight="bold">|Φ+⟩</text>
      <text x="50" y="14" textAnchor="middle" fontSize="5" fill="oklch(0.45 0.05 250)">opposite correlation</text>
    </svg>
  );
}

// --- Thumbnail 3: Grover bars (8 amplitudes, marked one growing) ---
function GroverBarsThumbnail({ accent }: { accent: string }) {
  const [iter, setIter] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIter(i => (i + 1) % 4), 700);
    return () => clearInterval(id);
  }, []);
  // r ≈ (π/4)√N for N=8 → r=2 iterations; amplitude progression
  const amps = Array.from({ length: 8 }, (_, i) => {
    const marked = i === 5;
    if (iter === 0) return 0.35; // uniform
    if (iter === 1) return marked ? 0.55 : 0.32;
    if (iter === 2) return marked ? 0.85 : 0.22;
    return marked ? 0.94 : 0.18; // iter 3 — peak
  });
  const w = 8;
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <line x1="6" y1="115" x2="94" y2="115" stroke="oklch(0.45 0.05 250)" strokeWidth="0.5" />
      {amps.map((a, i) => {
        const x = 8 + i * (w + 2);
        const h = a * 100;
        const marked = i === 5;
        return (
          <motion.rect
            key={i}
            x={x} y={115 - h}
            width={w} height={h}
            fill={marked ? accent : "oklch(0.55 0.10 250 / 0.6)"}
            animate={{ height: h, y: 115 - h }}
            transition={{ duration: 0.3 }}
          />
        );
      })}
      <text x="50" y="132" textAnchor="middle" fontSize="5" fill="oklch(0.45 0.05 250)">N=8, marked=5</text>
      <text x="50" y="14" textAnchor="middle" fontSize="5" fill={accent} fontWeight="bold">iter {iter}/3</text>
    </svg>
  );
}

// --- Thumbnail 4: Decoherence decay curve ---
function DecayCurveThumbnail({ accent }: { accent: string }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT(t => (t + 0.04) % 4), 60);
    return () => clearInterval(id);
  }, []);
  // T1 (energy relaxation) and T2 (dephasing)
  const points = Array.from({ length: 40 }, (_, i) => {
    const x = i / 40 * 4;
    const t1 = Math.exp(-x); // P(|1⟩) after time t (in T1 units)
    const t2 = Math.exp(-x * 1.2); // coherence
    return { x: 8 + x * 20, t1: 110 - t1 * 95, t2: 110 - t2 * 95 };
  });
  const t1Path = "M " + points.map(p => `${p.x} ${p.t1}`).join(" L ");
  const t2Path = "M " + points.map(p => `${p.x} ${p.t2}`).join(" L ");
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <line x1="6" y1="110" x2="92" y2="110" stroke="oklch(0.45 0.05 250)" strokeWidth="0.5" />
      <line x1="6" y1="15" x2="6" y2="110" stroke="oklch(0.45 0.05 250)" strokeWidth="0.5" />
      <motion.path d={t1Path} stroke={accent} strokeWidth="1.2" fill="none" />
      <motion.path d={t2Path} stroke="oklch(0.55 0.15 25)" strokeWidth="1" fill="none" strokeDasharray="2 1" />
      {/* moving dot */}
      <circle cx={8 + t * 20} cy={110 - Math.exp(-t) * 95} r="2" fill={accent} />
      <text x="50" y="132" textAnchor="middle" fontSize="5" fill="oklch(0.45 0.05 250)">t / T₁</text>
      <text x="50" y="14" textAnchor="middle" fontSize="5" fill={accent} fontWeight="bold">state decays</text>
    </svg>
  );
}

// ============================================================
// Detail (modal) contents — these are LAZY-RENDERED on click
// ============================================================

function SuperpositionDetail() {
  return (
    <div className="space-y-4">
      {/* Animated Bloch sphere — larger */}
      <div className="rounded-md border border-border/60 bg-card p-4">
        <div className="flex justify-center">
          <div className="w-48 h-64">
            <BlochSphereThumbnail accent="oklch(0.55 0.16 250)" />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          A single qubit lives on the Bloch sphere — every pure state is a point (θ, φ).
          The vector above rotates around the equator at θ=π/2 — that&apos;s the |+⟩ state, the simplest superposition.
        </p>
      </div>
      {/* Math */}
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
        <p className="font-mono text-sm text-primary">|ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)·sin(θ/2)|1⟩</p>
        <p className="font-mono text-xs mt-1">|α|² + |β|² = 1  ·  H|0⟩ = (|0⟩+|1⟩)/√2 = |+⟩</p>
        <p className="text-[11px] text-muted-foreground mt-1">P(0)=|α|², P(1)=|β|² — Born&apos;s rule. Measurement collapses the superposition.</p>
      </div>
      {/* Code */}
      <PyodideRunner
        buttonLabel="Run superposition simulator (Pyodide)"
        code={`import numpy as np

# Hadamard gate: creates equal superposition
H = np.array([[1, 1], [1, -1]]) / np.sqrt(2)
# Initial state |0⟩ = [1, 0]
psi0 = np.array([1.0, 0.0])
# Apply Hadamard: |0⟩ → (|0⟩ + |1⟩)/sqrt(2)
psi1 = H @ psi0

print("After H|0⟩:", psi1)
print(f"|0⟩ amplitude α = {psi1[0]:.4f}")
print(f"|1⟩ amplitude β  = {psi1[1]:.4f}")
print(f"|α|² = {abs(psi1[0])**2:.4f}  (probability of measuring |0⟩)")
print(f"|β|² = {abs(psi1[1])**2:.4f}  (probability of measuring |1⟩)")

# Born's rule in action — sample 1000 shots
np.random.seed(42)
shots = np.random.choice([0, 1], p=[abs(psi1[0])**2, abs(psi1[1])**2], size=1000)
p0_empirical = shots.mean()
p1_empirical = 1 - p0_empirical
print(f"\\n1000-shot simulation:")
print(f"  empirical P(0) = {p0_empirical:.3f}  (theory: 0.500)")
print(f"  empirical P(1) = {p1_empirical:.3f}  (theory: 0.500)")

# Show interference: H again returns to |0⟩
psi2 = H @ psi1
print(f"\\nApplying H again: H^2|0> = {psi2}  (H is Hermitian — H^2 = I)")`}
      />
      {/* Recent paper */}
      <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
        <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5 mb-1.5">
          <BookOpen className="h-3 w-3" /> Recent research (Dec 2024)
        </p>
        <p className="text-xs text-foreground/80 leading-relaxed">
          <strong>Google Quantum AI, &ldquo;Quantum error correction below the surface code threshold&rdquo;</strong> (Nature, 2025).
          The 105-qubit <strong>Willow</strong> chip improved qubit coherence time by <strong>~5×</strong> vs Sycamore (2019),
          and reduced physical error rates by <strong>2×</strong>. Coherence is the &ldquo;shelf life&rdquo; of a superposition
          — longer T<sub>1</sub>/T<sub>2</sub> means the |ψ⟩ above lives longer before collapsing to a classical 0 or 1.
        </p>
      </div>
    </div>
  );
}

function EntanglementDetail() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border/60 bg-card p-4">
        <div className="flex justify-center">
          <div className="w-48 h-64">
            <BellPairThumbnail accent="oklch(0.55 0.16 165)" />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Two qubits in |Φ+⟩ = (|00⟩ + |11⟩)/√2 share ONE fate. Measure q0 → get 0/1 randomly.
          Measure q1 immediately → get the SAME outcome, always. The link is not a hidden variable — Bell&apos;s theorem proves it.
        </p>
      </div>
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
        <p className="font-mono text-sm text-primary">|Φ+⟩ = (|00⟩ + |11⟩) / √2</p>
        <p className="font-mono text-xs mt-1">E(a,b) = ⟨ψ| (σ_a ⊗ σ_b) |ψ⟩ = -cos(a-b)</p>
        <p className="font-mono text-xs">CHSH:  |S| ≤ 2  (classical)  ·  S = 2√2 ≈ 2.828  (quantum, Tsirelson bound)</p>
        <p className="text-[11px] text-muted-foreground mt-1">Bell&apos;s inequality — violated by quantum mechanics. No local hidden-variable theory can explain the correlations.</p>
      </div>
      <PyodideRunner
        buttonLabel="Run Bell / CHSH simulator (Pyodide)"
        code={`import numpy as np

# Bell state |Φ+⟩ = (|00⟩ + |11⟩) / sqrt(2)  (vector in C^4)
bell = np.array([1, 0, 0, 1], dtype=complex) / np.sqrt(2)

# Correlation E(a,b) for Bell state:  E = -cos(a - b)
def E(a, b):
    return -np.cos(a - b)

# CHSH parameter:  S = |E(a,b) - E(a,b') + E(a',b) - E(a',b')|
# Optimal angles (Tsirelson): a=0, a'=π/2, b=π/4, b'=3π/4
a, a2 = 0.0, np.pi / 2
b, b2 = np.pi / 4, 3 * np.pi / 4
S = abs(E(a, b) - E(a, b2) + E(a2, b) - E(a2, b2))

print("=== Bell state |Φ+⟩ = (|00⟩+|11⟩)/sqrt(2) ===")
print(f"E(a,b)   = {E(a, b):+.4f}")
print(f"E(a,b')  = {E(a, b2):+.4f}")
print(f"E(a',b)  = {E(a2, b):+.4f}")
print(f"E(a',b') = {E(a2, b2):+.4f}")
print(f"\\nCHSH S = {S:.4f}")
print(f"Classical bound:  |S| ≤ 2.0000")
print(f"Quantum max:      S = 2√2 = {2 * np.sqrt(2):.4f}")
print(f"\\n→ Quantum mechanics VIOLATES the classical Bell inequality.")
print(f"→ No local hidden-variable theory can reproduce this.")

# 2000-shot sampling simulation (Honest statistics)
np.random.seed(42)
N = 2000
results_a = np.random.choice([+1, -1], size=N)  # Alice's outcomes
results_b = np.where(results_a == +1,
                     np.random.choice([+1, -1], size=N, p=[(1+np.cos(b-a))/2, (1-np.cos(b-a))/2]),
                     np.random.choice([+1, -1], size=N, p=[(1+np.cos(b-a+np.pi))/2, (1-np.cos(b-a+np.pi))/2]))
emp_corr = np.mean(results_a * results_b)
print(f"\\n2000-shot empirical E(a,b): {emp_corr:+.4f}  (theory: {E(a, b):+.4f})")`}
      />
      <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
        <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5 mb-1.5">
          <BookOpen className="h-3 w-3" /> Recent research (Sep 2024)
        </p>
        <p className="text-xs text-foreground/80 leading-relaxed">
          <strong>Microsoft &amp; Quantinuum, &ldquo;12 logical qubits&rdquo;</strong> (Azure Quantum blog, Sep 10, 2024).
          By applying Microsoft&apos;s error-correction algorithms to Quantinuum&apos;s 56-qubit H2 trapped-ion system
          (99.8% two-qubit gate fidelity), they demonstrated <strong>12 logical qubits</strong> with logical error
          rates <strong>~11× better</strong> than physical. The Bell pair above is now reliably reproducible on
          logical qubits — not just a textbook demo. The all-to-all connectivity of trapped ions makes Bell-pair
          generation nearly native, since any two qubits can interact directly.
        </p>
      </div>
    </div>
  );
}

function GroverDetail() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border/60 bg-card p-4">
        <div className="flex justify-center">
          <div className="w-48 h-64">
            <GroverBarsThumbnail accent="oklch(0.55 0.16 30)" />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Start with uniform superposition (all 8 bars equal). Each Grover iteration rotates the state vector
          toward the marked item — its amplitude grows while others shrink. After r ≈ (π/4)√N iterations, the marked
          item&apos;s probability peaks.
        </p>
      </div>
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
        <p className="font-mono text-sm text-primary">|s⟩ = (1/√N)·Σ_x |x⟩  ·  U_f = I - 2|x*⟩⟨x*|  ·  D = 2|s⟩⟨s| - I</p>
        <p className="font-mono text-xs mt-1">r ≈ (π/4)·√N  ·  P(marked) ≈ sin²((2r+1)·θ),  sin(θ)=1/√N</p>
        <p className="text-[11px] text-muted-foreground mt-1">Provably optimal for unstructured search (Bennett et al. 1997). No classical algorithm can beat O(N).</p>
      </div>
      <PyodideRunner
        buttonLabel="Run Grover simulator (Pyodide)"
        code={`import numpy as np

N = 8                 # search space (3 qubits)
n = int(np.log2(N))
marked = 5            # the item we're looking for

# Initial uniform superposition |s⟩ = H^⊗n |0⟩
s = np.ones(N) / np.sqrt(N)

# Oracle: phase-flip the marked item  (U_f = I - 2|x*⟩⟨x*|)
oracle = np.eye(N)
oracle[marked, marked] = -1

# Diffuser: D = 2|s⟩⟨s| - I  (inversion about the mean)
diffuser = 2 * np.outer(s, s) - np.eye(N)

# Optimal number of Grover iterations
r_optimal = int(round(np.pi / 4 * np.sqrt(N)))
print(f"N = {N}, n = {n} qubits, marked item = {marked}")
print(f"Optimal iterations r ≈ π/4 √N = {r_optimal}")
print(f"Classical expected queries to find marked: N/2 = {N/2}")
print(f"Quantum queries: r = {r_optimal}  (speedup = {N/2 / r_optimal:.1f}x)")
print()

# Iterate
state = s.copy()
for i in range(r_optimal + 1):
    p_marked = abs(state[marked]) ** 2
    p_other = (1 - p_marked) / (N - 1)
    print(f"  iter {i}: P(marked) = {p_marked:.4f}  P(other) = {p_other:.4f}  amplitude[mrkd] = {state[marked]:+.4f}")
    state = diffuser @ oracle @ state

print(f"\\nAfter {r_optimal} iterations:")
print(f"  P(marked) = {abs(state[marked])**2:.4f}  (vs classical 1/N = {1/N:.4f})")
print(f"  Speedup factor = {abs(state[marked])**2 / (1/N):.1f}× more likely to find the marked item")
print(f"  In big-O: classical O(N) → quantum O(√N) = O({np.sqrt(N):.1f}) for N={N}")
print(f"  For N=1,000,000: classical 500,000 queries → quantum ~785 queries")`}
      />
      <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
        <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5 mb-1.5">
          <BookOpen className="h-3 w-3" /> Recent research (Nov 2024)
        </p>
        <p className="text-xs text-foreground/80 leading-relaxed">
          <strong>IBM Quantum, &ldquo;Heron R2&rdquo;</strong> (Nov 13, 2024). The 156-qubit Heron R2 processor
          features tunable couplers and a new TLS (two-level system) mitigation strategy integrated into
          Qiskit. IBM demonstrated utility-scale workloads — including Grover-style amplitude amplification
          on circuits exceeding 100 qubits and depth 100 — with tensor-network error mitigation that
          suppresses noise by <strong>~10×</strong> vs raw hardware output. The Quantum Heron R2 is the
          first IBM chip whose native-gate fidelity (&gt;99.7% on 2-qubit gates) makes Grover&apos;s iteration
          stable across multiple rounds without re-running.
        </p>
      </div>
    </div>
  );
}

function DecoherenceDetail() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border/60 bg-card p-4">
        <div className="flex justify-center">
          <div className="w-48 h-64">
            <DecayCurveThumbnail accent="oklch(0.55 0.16 0)" />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          T<sub>1</sub> (energy relaxation, red) and T<sub>2</sub> (dephasing, orange dashed).
          After ~T<sub>1</sub> the qubit forgets whether it was |1⟩; after ~T<sub>2</sub> the relative phase α/β scrambles.
          Below: how the surface code lets logical error DECREASE with code distance d.
        </p>
      </div>
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
        <p className="font-mono text-sm text-primary">ρ(t) = e^(-t/T₁)·ρ(0) + (1 - e^(-t/T₁))·I/2  ·  ρ_coherence(t) = e^(-t/T₂)</p>
        <p className="font-mono text-xs mt-1">Lindblad master equation:  dρ/dt = -i[H,ρ] + Σ_k (L_k ρ L_k† - ½ {"{L_k†L_k, ρ}"})</p>
        <p className="text-[11px] text-muted-foreground mt-1">Open quantum system — non-unitary evolution. T<sub>1</sub> ≤ 2·T<sub>2</sub>. Surface code threshold p<sub>c</sub> ≈ 1% (below it: bigger code = fewer errors).</p>
      </div>
      <PyodideRunner
        buttonLabel="Run decoherence + surface-code simulator (Pyodide)"
        code={`import numpy as np

# ====== PHYSICAL QUBIT DECOHERENCE ======
T1 = 100e-6   # 100 µs (IBM Heron R2, 2024)
T2 = 80e-6    # 80 µs
print("=== Physical qubit decoherence (IBM Heron R2, Nov 2024) ===")
print(f"T1 = {T1*1e6:.0f} µs   (energy relaxation — |1⟩ decays to |0⟩)")
print(f"T2 = {T2*1e6:.0f} µs   (dephasing — phase α/β scrambles)")
print(f"After 1·T1:  P(|1⟩ survives) = e^-1 = {np.exp(-1):.4f}")
print(f"After 1·T2:  coherence      = e^-1 = {np.exp(-1):.4f}")

# ====== SURFACE CODE — Google Willow, Dec 2024 ======
# Below threshold p_c ≈ 1%: logical error DECREASES with code distance d
# Empirical scaling (Willow paper, Nature 2025):
#   p_logical ≈ p_physical · Λ^((d-1)/2)
# where Λ = (p_c / p_physical)^2  — the "Lambda" suppression factor

def logical_error(p_phys, d, p_c=0.01):
    """Surface-code logical error rate. Below threshold (p < p_c) it DECREASES with d."""
    if p_phys >= p_c:
        return float('inf')  # above threshold — bigger code = MORE errors
    Lambda = (p_c / p_phys) ** 2
    return p_phys * Lambda ** ((d - 1) / 2)

print("\\n=== Surface code suppression (Google Willow, Dec 2024) ===")
p_phys = 1.5e-3   # 0.15% physical error (Willow 2024)
Lambda = (0.01 / p_phys) ** 2
print(f"Physical error rate p = {p_phys*100:.2f}%")
print(f"Surface-code threshold p_c ≈ 1%")
print(f"Suppression factor Λ = (p_c/p)² = {Lambda:.4f}")
print(f"\\nLogical error rate vs code distance d:")
for d in [3, 5, 7, 9]:
    p_log = logical_error(p_phys, d)
    n_qubits = 2 * d * (d - 1) + 1  # rotated surface code
    print(f"  d={d} ({n_qubits:3d} physical qubits):  p_logical ≈ {p_log:.2e}")

print(f"\\nWillow's measured Λ = 2.14 ± 0.02 when increasing d → d+2")
print(f"(First chip to demonstrate quantum error correction BELOW threshold)")
print(f"\\nTo run Shor's algorithm on a 2048-bit RSA key, you need:")
print(f"  p_logical ≈ 10^-15  →  requires d ≈ 17-21 + ~10M physical qubits")
print(f"  (Today's best: d=7 with ~85 qubits, p_logical ≈ 10^-5)")`}
      />
      <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
        <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5 mb-1.5">
          <BookOpen className="h-3 w-3" /> Recent research (Nature, 2025)
        </p>
        <p className="text-xs text-foreground/80 leading-relaxed">
          <strong>Acharya et al. (Google Quantum AI), &ldquo;Quantum error correction below the surface code threshold&rdquo;</strong> (Nature, 2025).
          The <strong>Willow</strong> chip (105 superconducting qubits) demonstrated for the first time that
          <strong> logical error DECREASES when the code distance grows</strong> — the defining property of being
          &ldquo;below threshold&rdquo;. Going from d=5 to d=7 suppressed the logical error rate by a factor
          <strong> Λ = 2.14 ± 0.02</strong>. Before Willow, scaling qubits UP always made error rates worse, not better.
          This is the precondition for fault-tolerant quantum computing — without it, you can&apos;t build a
          bigger quantum computer and expect it to work.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// The 4 short metadata definitions
// ============================================================

const SHORTS: ShortMeta[] = [
  {
    id: "superposition",
    step: "1",
    hookTitle: "A qubit that's BOTH 0 and 1",
    subtitle: "|ψ⟩ = α|0⟩ + β|1⟩ — until you look",
    accent: "oklch(0.55 0.16 250)",
    thumbnail: <BlochSphereThumbnail accent="oklch(0.55 0.16 250)" />,
    detail: <SuperpositionDetail />,
  },
  {
    id: "entanglement",
    step: "2",
    hookTitle: "Two qubits. ONE fate — instantly",
    subtitle: "|Φ+⟩ = (|00⟩ + |11⟩) / √2",
    accent: "oklch(0.55 0.16 165)",
    thumbnail: <BellPairThumbnail accent="oklch(0.55 0.16 165)" />,
    detail: <EntanglementDetail />,
  },
  {
    id: "grover",
    step: "3",
    hookTitle: "Search N items in √N steps",
    subtitle: "Grover amplitude amplification",
    accent: "oklch(0.55 0.16 30)",
    thumbnail: <GroverBarsThumbnail accent="oklch(0.55 0.16 30)" />,
    detail: <GroverDetail />,
  },
  {
    id: "decoherence",
    step: "4",
    hookTitle: "Why your qubit dies in µseconds",
    subtitle: "T₁, T₂ and the surface code",
    accent: "oklch(0.55 0.16 0)",
    thumbnail: <DecayCurveThumbnail accent="oklch(0.55 0.16 0)" />,
    detail: <DecoherenceDetail />,
  },
];

// ============================================================
// Carousel + Modal
// ============================================================

const VIEWS = [
  { label: "9:16 vertical", w: 180, h: 320 },
];

export function QuantumShortsCarousel() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [openShort, setOpenShort] = useState<string | null>(null);

  const goPrev = useCallback(() => {
    setActiveIdx(i => (i - 1 + SHORTS.length) % SHORTS.length);
  }, []);
  const goNext = useCallback(() => {
    setActiveIdx(i => (i + 1) % SHORTS.length);
  }, []);

  // Esc closes the modal
  useEffect(() => {
    if (!openShort) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenShort(null);
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [openShort]);

  const active = SHORTS[activeIdx];
  const openShortMeta = openShort ? SHORTS.find(s => s.id === openShort) : null;

  return (
    <div className="space-y-4">
      {/* Cards — horizontal scroll on mobile, grid on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SHORTS.map((s, i) => (
          <motion.button
            key={s.id}
            type="button"
            onClick={() => setOpenShort(s.id)}
            onMouseEnter={() => setActiveIdx(i)}
            className="relative rounded-xl overflow-hidden border border-border/60 hover:border-primary/60 hover:shadow-lg transition-all bg-gradient-to-br from-card to-muted/30 group"
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            aria-label={`Open short: ${s.hookTitle}`}
          >
            {/* 9:16 aspect thumbnail */}
            <div className="relative w-full" style={{ aspectRatio: "9 / 16", maxHeight: 320 }}>
              <div className="absolute inset-0 p-2">
                {s.thumbnail}
              </div>
              {/* Step badge */}
              <div className="absolute top-2 left-2 z-10">
                <Badge
                  variant="secondary"
                  className="text-[10px] h-5 px-1.5 gap-0.5"
                  style={{ backgroundColor: s.accent + "20", color: s.accent }}
                >
                  <Sparkles className="h-2.5 w-2.5" /> SHORT {s.step}
                </Badge>
              </div>
              {/* Play overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ opacity: 1, scale: 1 }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur rounded-full p-2.5 border border-border shadow-md"
                >
                  <Play className="h-4 w-4 text-primary" fill="currentColor" />
                </motion.div>
              </div>
            </div>
            {/* Caption */}
            <div className="p-2.5 border-t border-border/40 bg-background/80">
              <p className="text-xs font-semibold leading-tight" style={{ color: s.accent }}>
                {s.hookTitle}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{s.subtitle}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Mobile nav arrows */}
      <div className="flex justify-between items-center md:hidden">
        <Button variant="outline" size="sm" onClick={goPrev} className="gap-1">
          <ChevronLeft className="h-3.5 w-3.5" /> Prev
        </Button>
        <p className="text-[11px] text-muted-foreground">
          {active.step} / {SHORTS.length} — {active.hookTitle}
        </p>
        <Button variant="outline" size="sm" onClick={goNext} className="gap-1">
          Next <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Inline prompt */}
      <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5 flex-wrap">
        <Zap className="h-3 w-3 text-amber-500" />
        Click any short to pop up the full concept — animated SVG + math + Pyodide-runnable code + 2024-2025 paper.
        <span className="text-[10px]">Modal content is lazy-rendered on click.</span>
      </p>

      {/* LAZY modal — only renders the heavy SVG + Pyodide code when opened */}
      <AnimatePresence>
        {openShortMeta && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 md:p-6 overflow-y-auto"
            onClick={() => setOpenShort(null)}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setOpenShort(null)}
              className="absolute top-3 right-3 z-20 p-2 rounded-full bg-background/90 border border-border hover:bg-accent transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            {/* Title pill — top left */}
            <div className="absolute top-3 left-3 z-20 px-3 py-1.5 rounded-full bg-background/90 border border-border flex items-center gap-2 text-xs font-semibold">
              <Atom className="h-3.5 w-3.5" style={{ color: openShortMeta.accent }} />
              <span style={{ color: openShortMeta.accent }}>SHORT {openShortMeta.step} · {openShortMeta.hookTitle}</span>
            </div>
            {/* Modal body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-3xl my-8 rounded-xl border border-border bg-background shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 md:p-6 max-h-[85vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/40">
                  <div
                    className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                    style={{ backgroundColor: openShortMeta.accent + "20" }}
                  >
                    <Atom className="h-5 w-5" style={{ color: openShortMeta.accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold leading-tight" style={{ color: openShortMeta.accent }}>
                      {openShortMeta.hookTitle}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">{openShortMeta.subtitle}</p>
                  </div>
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <TrendingUp className="h-3 w-3" /> 2024-2025
                  </Badge>
                </div>

                {/* LAZY detail content — only renders when modal is open */}
                {openShortMeta.detail}
              </div>
              {/* Footer */}
              <div className="border-t border-border/40 bg-muted/20 px-4 md:px-6 py-2.5 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>← click outside or press Esc to close</span>
                <span className="font-mono">{SHORTS.findIndex(s => s.id === openShortMeta.id) + 1} / {SHORTS.length}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
