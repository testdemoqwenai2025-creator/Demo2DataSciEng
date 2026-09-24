"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { ImageModal } from "../_components/image-modal";
import { QuantumShortsCarousel } from "../_components/quantum-shorts";
import { QuantumGallery3D } from "../_components/quantum-gallery-3d";
import { QuantumInteractives } from "../_components/quantum-interactives";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Cpu, Zap, TrendingUp, Terminal, Brain, Activity, Atom, Network, Sparkles } from "lucide-react";

const KPIS = [
  { label: "Qubit superposition", value: "|ψ⟩ = α|0⟩ + β|1⟩", hint: "|α|² + |β|² = 1, Bloch sphere", deltaTone: "flat" as const },
  { label: "VQE molecular ground state", value: "min⟨ψ(θ)|H|ψ(θ)⟩", hint: "Peruzzo 2014, hybrid QC + classical optimiser", deltaTone: "flat" as const },
  { label: "Grover speedup", value: "O(√N)", hint: "Quadratic vs classical O(N) — unstructured search", deltaTone: "up" as const },
  { label: "Quantum Fourier Transform", value: "O(n log n)", hint: "n qubits, exponentially better than FFT O(N log N)", deltaTone: "up" as const },
];

function QuantumCircuitShort() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setStep((s) => (s + 1) % 5), 1200);
    return () => clearInterval(i);
  }, []);
  const phases = [
    "1. Quantum circuit: gates on qubits",
    "2. Hadamard → superposition |+⟩",
    "3. CNOT → entanglement",
    "4. Bell state |Φ+⟩ = (|00⟩+|11⟩)/√2",
    "5. Measurement → classical bits",
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <style>{`.qc-3d { perspective: 800px; } .qc-stage { transform: rotateX(12deg); transform-style: preserve-3d; }`}</style>
      <p className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Atom className="h-4 w-4 text-primary" /> Quantum circuit → Bell state → measurement (loop){" "}
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">{phases[step]}</span>
      </p>
      <div className="qc-3d">
        <div className="qc-stage flex justify-center">
          <svg width="360" height="200" viewBox="0 0 360 200">
            {/* static rails */}
            <line x1="40" y1="70" x2="320" y2="70" stroke="var(--border)" strokeWidth="1.5" />
            <line x1="40" y1="130" x2="320" y2="130" stroke="var(--border)" strokeWidth="1.5" />
            <text x="20" y="74" textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">q0</text>
            <text x="20" y="134" textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">q1</text>
            <text x="40" y="55" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">|0⟩</text>
            <text x="40" y="115" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">|0⟩</text>

            {/* Step 1: bare circuit */}
            {step === 0 && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <text x="180" y="35" textAnchor="middle" fontSize="10" fill="var(--primary)" fontWeight="bold">Empty quantum circuit</text>
                <text x="180" y="170" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">2 qubits, 2 rails, no gates yet</text>
              </motion.g>
            )}

            {/* Step 2: Hadamard on q0 */}
            {step === 1 && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <rect x="85" y="58" width="24" height="24" fill="oklch(0.55 0.16 250 / 0.85)" rx="3" />
                <text x="97" y="74" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">H</text>
                <text x="180" y="35" textAnchor="middle" fontSize="10" fill="oklch(0.55 0.16 250)" fontWeight="bold">Hadamard → superposition</text>
                <text x="97" y="100" textAnchor="middle" fontSize="9" fill="oklch(0.55 0.16 250)">|0⟩ → (|0⟩+|1⟩)/√2</text>
                <text x="180" y="170" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">q0 now in |+⟩ superposition</text>
              </motion.g>
            )}

            {/* Step 3: CNOT — entanglement forming */}
            {step === 2 && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <rect x="85" y="58" width="24" height="24" fill="oklch(0.55 0.16 250 / 0.85)" rx="3" />
                <text x="97" y="74" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">H</text>
                <circle cx="180" cy="70" r="6" fill="oklch(0.55 0.16 250)" />
                <line x1="180" y1="76" x2="180" y2="124" stroke="oklch(0.55 0.16 250)" strokeWidth="2" />
                <circle cx="180" cy="130" r="10" fill="none" stroke="oklch(0.55 0.16 250)" strokeWidth="2" />
                <line x1="170" y1="130" x2="190" y2="130" stroke="oklch(0.55 0.16 250)" strokeWidth="2" />
                <line x1="180" y1="120" x2="180" y2="140" stroke="oklch(0.55 0.16 250)" strokeWidth="2" />
                <text x="180" y="35" textAnchor="middle" fontSize="10" fill="oklch(0.55 0.16 165)" fontWeight="bold">CNOT — entangling q0 → q1</text>
                <text x="180" y="170" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">Control on q0, target on q1 — non-classical correlation</text>
              </motion.g>
            )}

            {/* Step 4: Bell state */}
            {step === 3 && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <rect x="85" y="58" width="24" height="24" fill="oklch(0.55 0.16 250 / 0.85)" rx="3" />
                <text x="97" y="74" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">H</text>
                <circle cx="180" cy="70" r="6" fill="oklch(0.55 0.16 250)" />
                <line x1="180" y1="76" x2="180" y2="124" stroke="oklch(0.55 0.16 250)" strokeWidth="2" />
                <circle cx="180" cy="130" r="10" fill="none" stroke="oklch(0.55 0.16 250)" strokeWidth="2" />
                <line x1="170" y1="130" x2="190" y2="130" stroke="oklch(0.55 0.16 250)" strokeWidth="2" />
                <line x1="180" y1="120" x2="180" y2="140" stroke="oklch(0.55 0.16 250)" strokeWidth="2" />
                <text x="180" y="35" textAnchor="middle" fontSize="11" fill="oklch(0.6 0.18 25)" fontWeight="bold">|Φ+⟩ = (|00⟩ + |11⟩)/√2</text>
                <text x="180" y="170" textAnchor="middle" fontSize="9" fill="oklch(0.6 0.18 25)">Bell state — non-separable, EPR pair</text>
              </motion.g>
            )}

            {/* Step 5: Measurement */}
            {step === 4 && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <rect x="85" y="58" width="24" height="24" fill="oklch(0.55 0.16 250 / 0.6)" rx="3" />
                <text x="97" y="74" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">H</text>
                <circle cx="180" cy="70" r="6" fill="oklch(0.55 0.16 250 / 0.6)" />
                <line x1="180" y1="76" x2="180" y2="124" stroke="oklch(0.55 0.16 250 / 0.6)" strokeWidth="2" />
                <circle cx="180" cy="130" r="10" fill="none" stroke="oklch(0.55 0.16 250 / 0.6)" strokeWidth="2" />
                <rect x="290" y="55" width="24" height="30" fill="oklch(0.6 0.18 25 / 0.85)" rx="3" />
                <text x="302" y="74" textAnchor="middle" fontSize="14" fill="white" fontWeight="bold">M</text>
                <rect x="290" y="115" width="24" height="30" fill="oklch(0.6 0.18 25 / 0.85)" rx="3" />
                <text x="302" y="134" textAnchor="middle" fontSize="14" fill="white" fontWeight="bold">M</text>
                <text x="180" y="35" textAnchor="middle" fontSize="10" fill="oklch(0.6 0.18 25)" fontWeight="bold">Measurement → 00 or 11 (50/50)</text>
                <text x="180" y="170" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">Collapse to classical bits — but always perfectly correlated</text>
              </motion.g>
            )}
          </svg>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-3">
        Phase 1: empty circuit. Phase 2: Hadamard creates superposition |+⟩ = (|0⟩+|1⟩)/√2. Phase 3: CNOT entangles q0 → q1. Phase 4: Bell state |Φ+⟩ = (|00⟩+|11⟩)/√2 — non-separable. Phase 5: measurement collapses to perfectly-correlated 00 or 11.
      </p>
    </div>
  );
}

const QC_DEMO = `# Quantum Computing — qubits, gates, Bell states, Grover's algorithm
# Pure-Python simulation (no NumPy needed) — runs in Pyodide
import math, cmath, random

# ============================================================
# 1. Qubit state representation
# ============================================================
# A single qubit state |ψ⟩ = α|0⟩ + β|1⟩ where |α|² + |β|² = 1
# State vector lives in C² (complex 2-space)
# Convention: |0⟩ = [1, 0], |1⟩ = [0, 1]

def normalize(state):
    """Normalise a complex state vector to unit length."""
    norm = math.sqrt(sum(abs(x)**2 for x in state))
    return [x / norm for x in state]

def print_state(label, state):
    """Pretty-print a state vector + measurement probabilities."""
    print(f"  {label}: [{', '.join(f'{x.real:+.4f}{x.imag:+.4f}j' if isinstance(x, complex) else f'{x:+.4f}' for x in state)}]")
    probs = [abs(x)**2 for x in state]
    print(f"    |amplitude|²: [{', '.join(f'{p:.4f}' for p in probs)}]  (sum = {sum(probs):.4f})")

# Basis states
ket_0 = [1.0, 0.0]  # |0⟩
ket_1 = [0.0, 1.0]  # |1⟩

print("=" * 64)
print("1. QUBIT STATE REPRESENTATION — C² Hilbert space")
print("=" * 64)
print("\\nBasis states:")
print_state("|0⟩", ket_0)
print_state("|1⟩", ket_1)

# Superposition state |+⟩ = (|0⟩ + |1⟩)/√2
ket_plus = normalize([1.0, 1.0])
print("\\nSuperposition |+⟩ = (|0⟩ + |1⟩)/√2:")
print_state("|+⟩", ket_plus)

# Arbitrary superposition with complex amplitudes
# |ψ⟩ = (1/2)|0⟩ + (i·√3/2)|1⟩  →  |α|² + |β|² = 1/4 + 3/4 = 1
psi = normalize([0.5, 1j * math.sqrt(3)/2])
print("\\nArbitrary state |ψ⟩ = (1/2)|0⟩ + (i√3/2)|1⟩:")
print_state("|ψ⟩", psi)

# ============================================================
# 2. Quantum gates as unitary matrices
# ============================================================
# A gate U is a unitary matrix: U†U = I  (preserves norm)
# Common 1-qubit gates:
#   Hadamard:  H = (1/√2)·[[1, 1], [1, -1]]    — creates superposition
#   Pauli-X:   X = [[0, 1], [1, 0]]            — flips |0⟩ ↔ |1⟩
#   Pauli-Y:   Y = [[0, -i], [i, 0]]            — flips with phase
#   Pauli-Z:   Z = [[1, 0], [0, -1]]            — phase flip on |1⟩

def mat_vec(M, v):
    """Complex matrix-vector multiplication."""
    n = len(M)
    return [sum(M[i][j] * v[j] for j in range(n)) for i in range(n)]

def mat_mat(A, B):
    """Complex matrix-matrix multiplication."""
    n, m, p = len(A), len(B), len(B[0])
    return [[sum(A[i][k] * B[k][j] for k in range(m)) for j in range(p)] for i in range(n)]

def kron(A, B):
    """Tensor (Kronecker) product of two matrices."""
    rows_a, cols_a = len(A), len(A[0])
    rows_b, cols_b = len(B), len(B[0])
    out = [[0] * (cols_a * cols_b) for _ in range(rows_a * rows_b)]
    for i in range(rows_a):
        for j in range(cols_a):
            for k in range(rows_b):
                for l in range(cols_b):
                    out[i*rows_b + k][j*cols_b + l] = A[i][j] * B[k][l]
    return out

inv_sqrt2 = 1.0 / math.sqrt(2)
H  = [[inv_sqrt2,  inv_sqrt2], [inv_sqrt2, -inv_sqrt2]]   # Hadamard
X  = [[0, 1], [1, 0]]                                      # Pauli-X (NOT)
Y  = [[0, -1j], [1j, 0]]                                   # Pauli-Y
Z  = [[1, 0], [0, -1]]                                     # Pauli-Z
I2 = [[1, 0], [0, 1]]                                      # Identity

print(f"\\n{'=' * 64}")
print("2. QUANTUM GATES — UNITARY MATRICES")
print("=" * 64)
print("\\nHadamard  H = (1/√2)·[[1, 1], [1, -1]]")
print("Pauli-X   X = [[0, 1], [1, 0]]       (NOT gate — bit flip)")
print("Pauli-Y   Y = [[0, -i], [i, 0]]      (bit + phase flip)")
print("Pauli-Z   Z = [[1, 0], [0, -1]]      (phase flip on |1⟩)")

# Apply H to |0⟩ → |+⟩
print("\\nApply H to |0⟩:")
print_state("H|0⟩", mat_vec(H, ket_0))

# Apply X to |0⟩ → |1⟩
print("\\nApply X to |0⟩:")
print_state("X|0⟩", mat_vec(X, ket_0))

# Apply Z to |+⟩ → |-⟩ (creates relative phase)
print("\\nApply Z to |+⟩ → |-⟩ = (|0⟩ - |1⟩)/√2:")
print_state("Z|+⟩", mat_vec(Z, ket_plus))

# Verify unitarity: H†H = I (H is Hermitian, so H† = H)
HtH = mat_mat(H, H)  # H·H = I (since H is Hermitian)
print("\\nVerify H is unitary: H·H =")
for row in HtH:
    print(f"  [{', '.join(f'{x.real:+.4f}' for x in row)}]  (should be identity)")

# ============================================================
# 3. Two-qubit system — CNOT gate + Bell state
# ============================================================
# CNOT matrix (basis |00⟩, |01⟩, |10⟩, |11⟩):
#   CNOT = [[1,0,0,0], [0,1,0,0], [0,0,0,1], [0,0,1,0]]
# Flips target qubit iff control = |1⟩
CNOT = [[1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 1],
        [0, 0, 1, 0]]

print(f"\\n{'=' * 64}")
print("3. TWO-QUBIT SYSTEMS — CNOT + ENTANGLEMENT")
print("=" * 64)

# |00⟩ = |0⟩ ⊗ |0⟩
state_00 = kron(ket_0, ket_0)
print("\\n|00⟩ = |0⟩ ⊗ |0⟩:")
print_state("|00⟩", state_00)

# |+0⟩ = |+⟩ ⊗ |0⟩
state_plus_0 = kron(ket_plus, ket_0)
print("\\n|+0⟩ = |+⟩ ⊗ |0⟩:")
print_state("|+0⟩", state_plus_0)

# Apply CNOT to |+0⟩ — partial entanglement step
print("\\nApply CNOT to |+0⟩:")
print_state("CNOT|+0⟩", mat_vec(CNOT, state_plus_0))

# ============================================================
# 4. Bell state creation — entanglement
# ============================================================
# Bell state |Φ+⟩ = (|00⟩ + |11⟩)/√2
# Circuit: |00⟩ → H on q0 → CNOT(q0, q1) → |Φ+⟩
# Bell states are MAXIMALLY entangled — non-separable.
# Measuring q0 instantly determines q1 — "spooky action at a distance" (Einstein)

print(f"\\n{'=' * 64}")
print("4. BELL STATE CREATION — MAXIMAL ENTANGLEMENT")
print("=" * 64)
print("\\nBell state |Φ+⟩ = (|00⟩ + |11⟩)/√2")
print("Circuit: |0⟩ ──H──■──  (q0)")
print("                    │   ")
print("         |0⟩ ─────⊕──  (q1)")

# Step 1: |0⟩ ⊗ |0⟩ = |00⟩
state = kron(ket_0, ket_0)
print("\\nStep 1: initial state |00⟩")
print_state("|00⟩", state)

# Step 2: H on q0 (operator H ⊗ I)
HI = kron(H, I2)
state = mat_vec(HI, state)
print("\\nStep 2: apply H⊗I — q0 in superposition")
print_state("(H⊗I)|00⟩", state)

# Step 3: CNOT
state = mat_vec(CNOT, state)
print("\\nStep 3: apply CNOT — Bell state |Φ+⟩")
print_state("|Φ+⟩", state)

# Verify |Φ+⟩ = (|00⟩ + |11⟩)/√2
expected = normalize([1, 0, 0, 1])
print("\\nExpected |Φ+⟩ = (|00⟩ + |11⟩)/√2:")
print_state("|Φ+⟩", expected)

match = all(abs(state[i] - expected[i]) < 1e-10 for i in range(4))
print(f"\\n  {'✓ Bell state matches!' if match else '✗ Mismatch!'}")
print("  Bell state has zero amplitude on |01⟩ and |10⟩ — only |00⟩ and |11⟩ survive.")
print("  Measurement outcomes: 00 with prob 0.5, 11 with prob 0.5 — perfectly correlated.")

# ============================================================
# 5. Grover's algorithm on 4 items (2 qubits)
# ============================================================
# Grover (1996): find marked item in unsorted database of N items
#   - Classical: O(N) queries on average (N/2 to be precise)
#   - Quantum: O(√N) queries via amplitude amplification
#   - Quadratic speedup (not exponential — but provably optimal for unstructured search)
#
# Algorithm:
#   1. Initialise |s⟩ = H⊗n|0⟩ = (1/√N)·Σ_x |x⟩  (uniform superposition)
#   2. Repeat r ≈ (π/4)·√N times:
#        a. Oracle U_f: |x⟩ → (-1)^{f(x)} |x⟩  (phase flip on marked)
#        b. Diffuser D = 2|s⟩⟨s| - I  (inversion about the mean)
#   3. Measure → |x*⟩ with probability ≈ sin²((2r+1)θ) ≈ 1

print(f"\\n{'=' * 64}")
print("5. GROVER'S ALGORITHM — 4 ITEMS, MARKED = |11⟩")
print("=" * 64)
print("\\nGoal: find the marked item |11⟩ among {|00⟩, |01⟩, |10⟩, |11⟩}.")
print("Classical: needs ~2.25 queries on average. Quantum: 1 Grover iteration!")

# Oracle: marks |11⟩ (index 3) by phase flip
oracle = [[1, 0, 0, 0],
          [0, 1, 0, 0],
          [0, 0, 1, 0],
          [0, 0, 0, -1]]

# Diffuser D = 2|s⟩⟨s| - I
# |s⟩ = (1/2)·[1, 1, 1, 1]  (uniform superposition over 4 basis states)
s = [0.5, 0.5, 0.5, 0.5]
diffuser = [[2*s[i]*s[j] - (1 if i == j else 0) for j in range(4)] for i in range(4)]

# Step 1: |s⟩ = H⊗H |00⟩  (uniform superposition)
HH = kron(H, H)
state = mat_vec(HH, kron(ket_0, ket_0))
print("\\nStep 1: |s⟩ = H⊗H|00⟩ (uniform superposition over all 4 states)")
print_state("|s⟩", state)
print(f"  Probability of |11⟩ = {abs(state[3])**2:.4f} (random chance)")

# Step 2: apply oracle U_f
state = mat_vec(oracle, state)
print("\\nStep 2: apply oracle U_f — phase flip on |11⟩")
print_state("U_f|s⟩", state)
print("  (amplitudes unchanged — only phase of |11⟩ flipped)")

# Step 3: apply diffuser D
state = mat_vec(diffuser, state)
print("\\nStep 3: apply diffuser D = 2|s⟩⟨s| - I (inversion about mean)")
print_state("D·U_f|s⟩", state)

# Measurement
probs = [abs(x)**2 for x in state]
print("\\nFinal measurement probabilities:")
labels = ["|00⟩", "|01⟩", "|10⟩", "|11⟩"]
for i, (lbl, p) in enumerate(zip(labels, probs)):
    marker = "  ← MARKED (target)" if i == 3 else ""
    print(f"  P({lbl}) = {p:.4f}{marker}")

print(f"\\n  ✓ Probability of measuring |11⟩ = {probs[3]:.4f}  (should be 1.0)")
print(f"  After just 1 Grover iteration (vs 2.25 classical queries).")
print(f"  For N items: optimal iterations r ≈ (π/4)·√N = {math.pi/4 * math.sqrt(4):.3f} for N=4.")

# ============================================================
# 6. Recap — quantum advantage intuition
# ============================================================
print(f"\\n{'=' * 64}")
print("6. WHERE QUANTUM ADVANTAGE COMES FROM")
print("=" * 64)
print("""
  Three quantum resources give the speedup:

  1. Superposition: 1 qubit holds α|0⟩ + β|1⟩ — n qubits hold 2ⁿ amplitudes.
     Gate U acts on all 2ⁿ amplitudes "in parallel" (unitary evolution).

  2. Entanglement: qubits become non-separable. Bell state cannot be
     written as product |a⟩⊗|b⟩ — creates correlations classical bits
     cannot reproduce (Bell's theorem, 1964).

  3. Interference: amplitudes are complex — they can cancel (negative
     interference) or reinforce (positive). Grover's diffuser IS
     constructive interference on the marked item.

  Trade-off: quantum speedup is NOT free — measurement collapses the
  superposition. Only ONE outcome is observed. The art of quantum
  algorithm design is to arrange interference so the desired outcome
  has probability → 1.
""")`;

const PYTORCH_CODE = `import torch
import torch.nn as nn
import torch.nn.functional as F
import math
import cmath
from typing import List, Tuple, Optional, Dict

# ============================================================
# 1. QuantumGate — unitary matrix primitives
# ============================================================
# A quantum gate is a unitary matrix U such that U†U = UU† = I.
# Acting on n qubits, U has shape (2^n, 2^n) with complex entries.
# Quantum state |ψ⟩ ∈ C^(2^n) evolves unitarily: |ψ⟩ → U|ψ⟩.

class QuantumGate(nn.Module):
    """Quantum gate primitives — unitary matrices for qubit operations.
    
    Common gates (1-qubit):
        Hadamard:  H = (1/√2)·[[1, 1], [1, -1]]       — creates superposition
        Pauli-X:   X = [[0, 1], [1, 0]]               — bit flip (NOT)
        Pauli-Y:   Y = [[0, -i], [i, 0]]               — bit + phase flip
        Pauli-Z:   Z = [[1, 0], [0, -1]]               — phase flip on |1⟩
        RX(θ):     exp(-iθX/2) = cos(θ/2)I - i·sin(θ/2)X
        RY(θ):     exp(-iθY/2) = cos(θ/2)I - i·sin(θ/2)Y
        RZ(φ):     exp(-iφZ/2) = diag(e^(-iφ/2), e^(iφ/2))
    
    Common gates (2-qubit):
        CNOT:      [[1,0,0,0],[0,1,0,0],[0,0,0,1],[0,0,1,0]]  — control-NOT
        CZ:        diag(1,1,1,-1)                              — control-Z
        SWAP:      [[1,0,0,0],[0,0,1,0],[0,1,0,0],[0,0,0,1]]   — qubit swap
    
    Production: use qiskit.circuit.library for full gate zoo.
    """
    
    # Pauli matrices (class-level constants)
    PAULI_X = torch.tensor([[0., 1.], [1., 0.]], dtype=torch.complex64)
    PAULI_Y = torch.tensor([[0., -1j], [1j, 0.]], dtype=torch.complex64)
    PAULI_Z = torch.tensor([[1., 0.], [0., -1.]], dtype=torch.complex64)
    I2 = torch.eye(2, dtype=torch.complex64)
    
    @staticmethod
    def hadamard() -> torch.Tensor:
        """Hadamard gate: H|0⟩ = |+⟩, H|1⟩ = |-⟩, H² = I."""
        return (1 / math.sqrt(2)) * torch.tensor(
            [[1., 1.], [1., -1.]], dtype=torch.complex64)
    
    @staticmethod
    def cnot() -> torch.Tensor:
        """CNOT (control=q0, target=q1) — flips target iff control=|1⟩."""
        return torch.tensor([
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 1],
            [0, 0, 1, 0],
        ], dtype=torch.complex64)
    
    @staticmethod
    def rotation_x(theta: float) -> torch.Tensor:
        """RX(θ) = exp(-iθX/2) = cos(θ/2)·I - i·sin(θ/2)·X."""
        c, s = math.cos(theta / 2), math.sin(theta / 2)
        return torch.tensor(
            [[c, -1j * s], [-1j * s, c]], dtype=torch.complex64)
    
    @staticmethod
    def rotation_y(theta: float) -> torch.Tensor:
        """RY(θ) = exp(-iθY/2) = cos(θ/2)·I - i·sin(θ/2)·Y."""
        c, s = math.cos(theta / 2), math.sin(theta / 2)
        return torch.tensor(
            [[c, -s], [s, c]], dtype=torch.complex64)
    
    @staticmethod
    def rotation_z(phi: float) -> torch.Tensor:
        """RZ(φ) = exp(-iφZ/2) = diag(e^(-iφ/2), e^(iφ/2))."""
        return torch.tensor([
            [cmath.exp(-1j * phi / 2), 0],
            [0, cmath.exp(1j * phi / 2)],
        ], dtype=torch.complex64)
    
    @staticmethod
    def tensor_product(A: torch.Tensor, B: torch.Tensor) -> torch.Tensor:
        """Kronecker product — combines gates for multi-qubit ops.
        
        H⊗H on |00⟩ = (|00⟩+|01⟩+|10⟩+|11⟩)/2 = uniform superposition.
        """
        return torch.kron(A, B)
    
    @staticmethod
    def is_unitary(U: torch.Tensor, tol: float = 1e-5) -> bool:
        """Verify U†U = I (unitarity condition — preserves norm)."""
        n = U.shape[0]
        prod = U.conj().T @ U
        identity = torch.eye(n, dtype=U.dtype, device=U.device)
        return torch.allclose(prod, identity, atol=tol)


# ============================================================
# 2. QuantumCircuit — sequential gate application
# ============================================================

class QuantumCircuit(nn.Module):
    """A quantum circuit — sequence of unitary gates acting on a state.
    
    State vector: |ψ⟩ ∈ C^(2^n),  where n = number of qubits.
    
    Each gate U_i acts as: |ψ⟩ → U_i |ψ⟩  (left multiplication).
    Final state after L gates:  |ψ_final⟩ = U_L · U_{L-1} · ... · U_1 |ψ_0⟩
    
    Born's rule: probability of measuring outcome |k⟩ is |⟨k|ψ_final⟩|².
    
    Attributes:
        n_qubits: number of qubits n
        dim: Hilbert space dimension 2^n
        gates: list of (name, matrix, target_qubits) tuples
    """
    
    def __init__(self, n_qubits: int):
        super().__init__()
        assert n_qubits >= 1, "Need at least 1 qubit"
        self.n_qubits = n_qubits
        self.dim = 2 ** n_qubits
        # Initial state |0⟩^⊗n = [1, 0, 0, ...]
        initial = torch.zeros(self.dim, dtype=torch.complex64)
        initial[0] = 1.0
        self.register_buffer('initial_state', initial)
        self.gates: List[Tuple[str, torch.Tensor, List[int]]] = []
    
    def add_gate(self, name: str, gate_matrix: torch.Tensor,
                targets: List[int]) -> "QuantumCircuit":
        """Append a gate acting on target qubits. Chainable."""
        for t in targets:
            assert 0 <= t < self.n_qubits, f"Target qubit {t} out of range"
        self.gates.append((name, gate_matrix, targets))
        return self
    
    def _expand_to_full_hilbert(self, gate: torch.Tensor,
                                 targets: List[int]) -> torch.Tensor:
        """Expand a k-qubit gate to act on the full n-qubit Hilbert space.
        
        For a 1-qubit gate U on qubit i:
            U_full = I ⊗ I ⊗ ... ⊗ U (at position i) ⊗ ... ⊗ I
        
        For multi-qubit gates on adjacent qubits: direct tensor product.
        For non-adjacent: needs SWAP network (qiskit handles this in production).
        """
        n = self.n_qubits
        if len(targets) == 1:
            # Single-qubit gate — pad with identities on other qubits
            result = torch.tensor([[1.0]], dtype=torch.complex64)
            target = targets[0]
            for q in range(n):
                if q == target:
                    result = torch.kron(result, gate)
                else:
                    result = torch.kron(result, QuantumGate.I2)
            return result
        elif len(targets) == 2 and targets == sorted(targets) and \
             targets[1] - targets[0] == 1:
            # 2-qubit gate on adjacent qubits — direct
            full = gate
            # Pad before
            for _ in range(targets[0]):
                full = torch.kron(QuantumGate.I2, full)
            # Pad after
            for _ in range(targets[1] + 1, n):
                full = torch.kron(full, QuantumGate.I2)
            return full
        else:
            raise NotImplementedError(
                "Non-adjacent multi-qubit gates need SWAP network — use qiskit")
    
    def forward(self, initial_state: Optional[torch.Tensor] = None) -> Dict[str, torch.Tensor]:
        """Execute the circuit — return final state + measurement probs."""
        state = initial_state if initial_state is not None else self.initial_state.clone()
        for name, gate_matrix, targets in self.gates:
            U_full = self._expand_to_full_hilbert(gate_matrix, targets)
            state = U_full @ state
        # Born's rule: P(k) = |⟨k|ψ⟩|²
        probs = (state * state.conj()).real
        return {'state': state, 'probabilities': probs, 'gates': len(self.gates)}
    
    def sample(self, n_shots: int = 1000) -> Dict[int, int]:
        """Sample measurement outcomes (simulates repeated shot-based execution)."""
        result = self.forward()
        probs = result['probabilities']
        # Multinomial sampling
        outcomes = torch.multinomial(probs, n_shots, replacement=True)
        counts: Dict[int, int] = {}
        for o in outcomes.tolist():
            counts[o] = counts.get(o, 0) + 1
        return counts


# ============================================================
# 3. Bell state circuit — entanglement generator
# ============================================================

def bell_state_circuit() -> QuantumCircuit:
    """Circuit that produces the Bell state |Φ+⟩ = (|00⟩ + |11⟩)/√2.
    
    Circuit diagram:
        q0: |0⟩ ──H──■──  →  Bell state |Φ+⟩
                    │
        q1: |0⟩ ────⊕──
    
    After H:  (H⊗I)|00⟩ = (|00⟩ + |10⟩)/√2
    After CNOT(control=q0,target=q1): CNOT maps |10⟩ → |11⟩,
        giving (|00⟩ + |11⟩)/√2 — the maximally entangled Bell state.
    """
    qc = QuantumCircuit(n_qubits=2)
    qc.add_gate('H', QuantumGate.hadamard(), [0])
    qc.add_gate('CNOT', QuantumGate.cnot(), [0, 1])
    return qc


# ============================================================
# 4. VQE — Variational Quantum Eigensolver (hybrid QC)
# ============================================================
# VQE (Peruzzo et al. 2014) — hybrid quantum-classical algorithm for
# finding molecular ground state energies on NISQ hardware.
#
# Variational principle (Rayleigh-Ritz):
#     E_0 ≤ ⟨ψ(θ)|H|ψ(θ)⟩    for ANY θ
# where E_0 is the ground state energy. The minimum of ⟨ψ|H|ψ⟩ over θ
# equals E_0 when |ψ(θ)⟩ reaches the true ground state.
#
# Algorithm:
#   1. Prepare parameterised ansatz |ψ(θ)⟩ = U(θ)|0⟩
#   2. Quantum: measure E(θ) = ⟨ψ(θ)|H|ψ(θ)⟩ = Σ h_i ⟨P_i⟩ + Σ h_ij ⟨P_i P_j⟩
#   3. Classical: optimise θ to minimise E(θ) (COBYLA, SPSA, Adam)
#   4. Repeat until convergence → θ* gives ground state + energy
#
# The SAME variational principle underlies:
#   - ADR-049 MACE: minimise molecular energy via CG tensor products
#   - AlphaFold: minimise free energy of protein conformations
#   - Neural networks: minimise loss E = ⟨L(f(x), y)⟩ over data distribution

class VQE(nn.Module):
    """Variational Quantum Eigensolver for molecular ground state energy.
    
    Uses a hardware-efficient ansatz: layers of RY rotations + CNOT entanglers.
    Hamiltonian is the H2 molecule in STO-3G basis (simplified to 2 qubits).
    
    Variational principle guarantees E(θ) ≥ E_0 (true ground state).
    """
    
    def __init__(self, n_qubits: int = 2, n_layers: int = 2):
        super().__init__()
        self.n_qubits = n_qubits
        self.n_layers = n_layers
        # Variational parameters θ (initialised near zero = close to identity)
        self.theta = nn.Parameter(torch.randn(n_qubits * n_layers) * 0.1)
    
    def build_hamiltonian(self) -> torch.Tensor:
        """Build the H2 molecular Hamiltonian (2 qubits, STO-3G basis).
        
        H = Σ c_i P_i  where P_i are Pauli strings (I, Z, X, Y on each qubit).
        
        For H2 (simplified, in Hartree):
            H = c_0·I⊗I + c_1·Z⊗I + c_2·I⊗Z + c_3·Z⊗Z + c_4·X⊗X + c_5·Y⊗Y
        with empirically-fit coefficients.
        """
        I2 = QuantumGate.I2
        X = QuantumGate.PAULI_X
        Y = QuantumGate.PAULI_Y
        Z = QuantumGate.PAULI_Z
        # H2 in minimal basis — coefficients in Hartree
        H = (
            -1.05 * torch.kron(I2, I2)
            + 0.40 * torch.kron(Z, I2)
            + 0.40 * torch.kron(I2, Z)
            - 0.20 * torch.kron(Z, Z)
            - 0.20 * torch.kron(X, X)
            - 0.05 * torch.kron(Y, Y)
        )
        return H
    
    def ansatz(self, theta: torch.Tensor) -> torch.Tensor:
        """Hardware-efficient parameterised circuit |ψ(θ)⟩ = U(θ)|0⟩.
        
        Each layer: RY(θ) per qubit + linear CNOT entanglement.
        """
        n = self.n_qubits
        state = torch.zeros(2 ** n, dtype=torch.complex64)
        state[0] = 1.0  # |0⟩^⊗n
        
        for layer in range(self.n_layers):
            # RY rotations on each qubit (simplified — full impl needs gate placement)
            for q in range(n):
                theta_q = theta[layer * n + q]
                ry = QuantumGate.rotation_y(theta_q.item())
                # Apply RY on qubit 0 (extend for general q in production)
                if q == 0:
                    full = torch.kron(ry, torch.eye(2 ** (n - 1), dtype=torch.complex64))
                    state = full @ state
            # CNOT entanglement between adjacent qubits
            for q in range(n - 1):
                if q == 0:
                    cnot = QuantumGate.cnot()
                    full = torch.kron(cnot, torch.eye(2 ** (n - 2), dtype=torch.complex64))
                    state = full @ state
        return state
    
    def forward(self) -> Dict[str, torch.Tensor]:
        """Compute variational energy E(θ) = ⟨ψ(θ)|H|ψ(θ)⟩."""
        psi = self.ansatz(self.theta)
        H = self.build_hamiltonian()
        # E = ψ† H ψ (Rayleigh quotient)
        energy = (psi.conj() * (H @ psi)).sum().real
        return {'energy': energy, 'state': psi}
    
    def optimize(self, n_steps: int = 100, lr: float = 0.05) -> List[float]:
        """Classical optimisation loop — the 'hybrid' part of VQE.
        
        Alternates between:
            - Quantum device: measure E(θ) via repeated circuit execution
            - Classical computer: gradient-based parameter update
        """
        opt = torch.optim.Adam([self.theta], lr=lr)
        history: List[float] = []
        for step in range(n_steps):
            opt.zero_grad()
            result = self.forward()
            loss = result['energy']
            loss.backward()
            opt.step()
            history.append(loss.item())
            if step % 20 == 0:
                print(f"  VQE step {step:3d}: E(θ) = {loss.item():+.4f} Ha")
        return history


# ============================================================
# 5. GroverCircuit — quantum amplitude amplification
# ============================================================
# Grover (1996): quadratic speedup for unstructured search.
#
# Problem: given oracle U_f marking 1 item out of N, find it.
#   - Classical: O(N) queries (N/2 on average)
#   - Quantum:   O(√N) queries  (optimal, provably so — Bennett 1997)
#
# Algorithm:
#   1. |s⟩ = H⊗n|0⟩ = (1/√N) Σ_x |x⟩   (uniform superposition)
#   2. Repeat r ≈ (π/4)·√N times:
#        a. Oracle:    U_f |x⟩ = (-1)^f(x) |x⟩    (phase flip on marked)
#        b. Diffuser:  D = 2|s⟩⟨s| - I            (inversion about mean)
#   3. Measure → |x*⟩ with probability ≈ sin²((2r+1)θ) ≈ 1
#
# Geometric picture: state vector rotates by 2θ per iteration
#   where sin(θ) = 1/√N (initial overlap with marked state).
#   Optimal r ≈ (π/4)·√N lands the state on the marked basis vector.

class GroverCircuit(nn.Module):
    """Grover's quantum search algorithm — amplitude amplification.
    
    Quadratic speedup O(√N) vs classical O(N). Provably optimal
    for unstructured search (Bennett, Bernstein et al. 1997).
    
    Args:
        n_qubits: number of qubits n (search space N = 2^n)
        marked: index of the marked item (0 ≤ marked < N)
    """
    
    def __init__(self, n_qubits: int, marked: int):
        super().__init__()
        assert n_qubits >= 1, "Need at least 1 qubit"
        self.n_qubits = n_qubits
        self.N = 2 ** n_qubits
        self.marked = marked
        # Optimal iteration count: r ≈ (π/4)·√N
        self.optimal_iter = max(1, int(math.pi / 4 * math.sqrt(self.N)))
    
    def build_oracle(self) -> torch.Tensor:
        """Oracle U_f — flips phase of marked state.
        
        U_f = I - 2|x*⟩⟨x*|   (diagonal with -1 at marked index)
        """
        oracle = torch.eye(self.N, dtype=torch.complex64)
        oracle[self.marked, self.marked] = -1.0
        return oracle
    
    def build_diffuser(self) -> torch.Tensor:
        """Diffuser D = 2|s⟩⟨s| - I  (inversion about the mean).
        
        |s⟩ = (1/√N)·[1, 1, ..., 1] is the uniform superposition.
        D reflects any state through |s⟩ — amplifies components along |s⟩.
        """
        s = torch.ones(self.N, dtype=torch.complex64) / math.sqrt(self.N)
        s_proj = torch.outer(s, s.conj())  # |s⟩⟨s|
        return 2 * s_proj - torch.eye(self.N, dtype=torch.complex64)
    
    def forward(self) -> Dict[str, torch.Tensor]:
        """Run Grover's algorithm — return final state + marked probability."""
        n = self.n_qubits
        H = QuantumGate.hadamard()
        # Step 1: |s⟩ = H⊗n |0...0⟩  (uniform superposition)
        H_full = QuantumGate.I2[:1, :1].clone()  # 1×1 identity seed
        H_full = torch.tensor([[1.0]], dtype=torch.complex64)
        for _ in range(n):
            H_full = torch.kron(H_full, H)
        state = H_full @ torch.tensor(
            [1.0] + [0.0] * (self.N - 1), dtype=torch.complex64)
        
        # Step 2: Grover iterations (oracle + diffuser)
        oracle = self.build_oracle()
        diffuser = self.build_diffuser()
        for _ in range(self.optimal_iter):
            state = oracle @ state     # phase flip on marked
            state = diffuser @ state   # inversion about mean
        
        probs = (state * state.conj()).real
        return {
            'state': state,
            'probabilities': probs,
            'marked_probability': probs[self.marked],
            'iterations': self.optimal_iter,
        }


# ============================================================
# Sanity check — Bell state, VQE, Grover
# ============================================================

if __name__ == "__main__":
    print("=== Bell state circuit ===")
    bell_qc = bell_state_circuit()
    result = bell_qc.forward()
    print(f"  Gates applied: {result['gates']}")
    print(f"  Final state:   {result['state'].tolist()}")
    print(f"  Probabilities: {result['probabilities'].tolist()}")
    print(f"  P(00) = {result['probabilities'][0]:.4f}, P(11) = {result['probabilities'][3]:.4f}")
    
    print("\\n=== VQE for H2 (2 qubits) ===")
    vqe = VQE(n_qubits=2, n_layers=2)
    initial = vqe.forward()
    print(f"  Initial E(θ) = {initial['energy'].item():+.4f} Ha")
    history = vqe.optimize(n_steps=60, lr=0.05)
    print(f"  Final E(θ)   = {history[-1]:+.4f} Ha")
    print(f"  True E_0     ≈ -1.85 Ha (H2 ground state in STO-3G)")
    
    print("\\n=== Grover on 4 items (marked = |11⟩, index 3) ===")
    grover = GroverCircuit(n_qubits=2, marked=3)
    result = grover.forward()
    print(f"  Optimal iterations: {result['iterations']}")
    print(f"  P(marked |11⟩) = {result['marked_probability'].item():.4f}")
    print(f"  All probs: {result['probabilities'].tolist()}")
    print(f"  Expected: P(|11⟩) ≈ 1.0 (perfect Grover amplification)")
    
    print("\\n=== Unitarity checks ===")
    for name, gate in [
        ("Hadamard", QuantumGate.hadamard()),
        ("CNOT", QuantumGate.cnot()),
        ("Pauli-X", QuantumGate.PAULI_X),
        ("Pauli-Y", QuantumGate.PAULI_Y),
        ("Pauli-Z", QuantumGate.PAULI_Z),
    ]:
        is_u = QuantumGate.is_unitary(gate)
        print(f"  {name:10s}: unitary = {is_u}")`;

// ============================================================
// Code-preview constants for the 8 improvement suggestions.
// Each block demonstrates the underlying math + computation that
// would power one of the suggested visual improvements.
// ============================================================

const BLOCH_DRAG_CODE = `import numpy as np

# === Math powering a draggable Bloch sphere ===
# Pure single-qubit state on Bloch sphere:
#   |psi> = cos(theta/2)|0> + exp(i*phi) sin(theta/2)|1>

def screen_to_bloch(x, y, r=1.0):
    """Inverse orthographic projection: 2D screen (x, y) -> 3D Bloch (theta, phi)."""
    nx, ny = x / r, y / r
    rho2 = nx * nx + ny * ny
    if rho2 > 1.0:
        s = 1.0 / np.sqrt(rho2)
        nx, ny = nx * s, ny * s
        rho2 = 1.0
    nz = np.sqrt(max(0.0, 1.0 - rho2))
    return np.arccos(nz), np.arctan2(ny, nx)

def bloch_state(theta, phi):
    return np.array([np.cos(theta/2), np.exp(1j*phi) * np.sin(theta/2)], dtype=complex)

def measure(state, shots=1000):
    p0 = abs(state[0])**2
    return np.random.choice([0, 1], size=shots, p=[p0, 1 - p0])

np.random.seed(42)
print("=== Drag (x, y) -> Bloch (theta, phi) -> |psi> -> 1000-shot measurement ===")
print()
for x, y, name in [(0, 1, "north pole = |0>"),
                   (0, -1, "south pole = |1>"),
                   (1, 0, "equator +x = |+>"),
                   (0.5, 0.5, "equator 45 deg")]:
    theta, phi = screen_to_bloch(x, y)
    psi = bloch_state(theta, phi)
    p0 = abs(psi[0])**2
    samples = measure(psi)
    print(f"  drag ({x:+.2f},{y:+.2f}) -> theta={np.degrees(theta):5.1f} deg, phi={np.degrees(phi):5.1f} deg")
    print(f"    |psi> = {psi[0].real:+.4f}|0> + {psi[1].real:+.4f}|1>, P(0)={p0:.3f}")
    print(f"    1000 shots: P_hat(0)={samples.mean():.3f}   [{name}]")
    print()

# Gate = Bloch-sphere rotation about an axis
X = np.array([[0, 1], [1, 0]], dtype=complex)
Z = np.array([[1, 0], [0, -1]], dtype=complex)
H = (X + Z) / np.sqrt(2)
zero = np.array([1, 0], dtype=complex)
print("=== Gates rotate the Bloch vector ===")
print(f"  X|0> = {X @ zero}   (north pole -> south pole)")
print(f"  H|0> = {H @ zero}   (north pole -> equator +x = |+>)")
print(f"  Z|+> = {Z @ H @ zero}   (equator +x -> -x, phase flip)")
print()
print("Implementation: drag = inverse projection; gate = axis rotation; measure = Born sample")
`;

const SURFACE_CODE_CODE = `import numpy as np

# === Surface code: distance-d patch + stabilisers + logical error suppression ===

def surface_code_qubits(d):
    """Count data + ancilla qubits for distance-d rotated surface code."""
    n_data = d * d
    n_ancilla_x = (d - 1) * d
    n_ancilla_z = (d - 1) * d
    return n_data, n_ancilla_x + n_ancilla_z, n_data + n_ancilla_x + n_ancilla_z

print("=== Surface code patch (rotated) — qubit count vs distance ===")
print()
for d in [3, 5, 7, 9, 11, 17, 21]:
    n_d, n_a, n_total = surface_code_qubits(d)
    print(f"  d={d:2d}  data={n_d:3d}  ancilla={n_a:3d}  total={n_total:3d} physical qubits")

print()
print("=== Syndrome decoding: Z error on central data qubit (d=3) ===")
print()
print("  Patch layout (d=3, 9 data + 4 X-ancilla + 4 Z-ancilla = 17 qubits):")
print("    D - Z - D - Z - D")
print("    |   |   |   |   |")
print("    X - D - X - D - X")
print("    |   |   |   |   |")
print("    D - Z - D - Z - D")
print("    |   |   |   |   |")
print("    X - D - X - D - X")
print("    |   |   |   |   |")
print("    D - Z - D - Z - D")
print()
print("  Z error on centre data qubit -> anticommutes with 2 adjacent X stabilisers")
print("  Syndrome: X_top = -1, X_bottom = -1, X_left = +1, X_right = +1")
print("  Decoder: pair (-1, -1) -> unique match -> central Z error -> correctable")

def logical_error(p_phys, d, Lambda):
    """p_logical = p_phys * Lambda^((d-1)/2) below threshold."""
    return p_phys * Lambda ** ((d - 1) / 2)

p_phys_willow = 1.5e-3
Lambda_willow = 2.14
print()
print(f"=== Logical error rate vs distance (Willow p_phys={p_phys_willow*100:.2f}%, Lambda={Lambda_willow}) ===")
print()
for d in [3, 5, 7, 9, 11, 17, 21]:
    p_log = logical_error(p_phys_willow, d, Lambda_willow)
    n_d, n_a, n_total = surface_code_qubits(d)
    print(f"  d={d:2d}  ({n_total:3d} qubits)  p_logical = {p_log:.2e}")

print()
print("Implementation: visual = patch SVG + syndrome highlight; math = Lambda^((d-1)/2) scaling")
`;

const SPEEDUP_CODE = `import numpy as np
import math

# === Big-O scaling for canonical quantum algorithms ===

def classical_search(N): return N / 2.0
def grover_search(N):    return math.pi / 4.0 * math.sqrt(N)
def shor_factoring(n):   return float(n**3)
def classical_factoring_gnfs(n):
    """GNFS complexity: L = exp(c * n^(1/3) * (log n)^(2/3)), c ~ 1.923."""
    return math.exp(1.923 * (n ** (1.0/3.0)) * (math.log(n) ** (2.0/3.0)))
def qft_ops(N):  return math.log2(N) * math.log2(max(math.log2(N), 2))
def fft_ops(N):  return N * math.log2(N)

print("=== Quantum vs classical speedup (concrete queries at N=10^6) ===")
print()
N = 10**6
print(f"  Unstructured search (N={N:,}):")
print(f"    Classical: {classical_search(N):>12,.0f} oracle queries")
print(f"    Grover:    {grover_search(N):>12,.0f} oracle queries")
print(f"    Speedup:   {classical_search(N)/grover_search(N):>12.1f}x  (= sqrt(N))")
print()
print("  Factoring 2048-bit RSA (n=2048):")
n = 2048
print(f"    Classical (GNFS): ~{classical_factoring_gnfs(n):.2e} ops")
print(f"    Shor:             ~{shor_factoring(n):.2e} ops  (= n^3)")
print(f"    Speedup:          ~{classical_factoring_gnfs(n)/shor_factoring(n):.2e}x")
print()
print(f"  Fourier transform (N={N}):")
print(f"    Classical FFT: {fft_ops(N):>10,.0f} ops  (N log N)")
print(f"    Quantum QFT:   {qft_ops(N):>10.1f} ops  (n log n, n=log2 N)")
print(f"    Speedup:       {fft_ops(N)/qft_ops(N):>10.1f}x")

print()
print("=== Quantum hardware feasibility at N=10^6 ===")
print()
n_qubits = int(math.log2(N))
t1_us = 100.0  # IBM Heron R2 ~100 us
gate_time_ns = 50.0  # 2-qubit gate time
max_gates = int(t1_us * 1e3 / gate_time_ns)  # convert us->ns then divide
grover_iters = int(grover_search(N))
print(f"  Qubits needed for search:     {n_qubits}  (IBM Heron R2 has 156)")
print(f"  Circuit depth (Grover):       ~{grover_iters} iterations")
print(f"  NISQ coherence T1:            ~{t1_us:.0f} us  (IBM Heron R2, 2024)")
print(f"  2-qubit gate time:            ~{gate_time_ns:.0f} ns")
print(f"  Max gates before decoherence: ~{max_gates:,}  (= T1 / gate_time)")
print(f"  Feasible today? {'YES' if grover_iters < max_gates else 'NO'}")

print()
print("Implementation: visual = log-log scaling chart; math = Big-O asymptotics + hardware limits")
`;

const MAJORANA_CODE = `import numpy as np

# === Kitaev chain: 1D topological superconductor ===
# H = -mu sum c_n^dag c_n - t sum (c_n^dag c_{n+1} + h.c.) + Delta sum (c_n c_{n+1} + h.c.)
# Topological phase when |mu| < 2t — endpoints host Majorana zero modes

def kitaev_chain(N, mu, t, Delta):
    """Build 2N x 2N BdG Hamiltonian for N-site Kitaev chain."""
    H = np.zeros((2*N, 2*N), dtype=complex)
    for n in range(N):
        H[2*n, 2*n]     = -mu
        H[2*n+1, 2*n+1] = +mu
    for n in range(N-1):
        H[2*n,       2*(n+1)]     = -t
        H[2*(n+1)+1, 2*n+1]      = +t
        H[2*n,       2*(n+1)+1]  = -Delta
        H[2*(n+1),   2*n+1]      = +Delta
    H = H + H.T.conj()
    return H

print("=== Kitaev chain: topological vs trivial phase ===")
print()
N = 20
# Topological: |mu| < 2t
H_topo = kitaev_chain(N, mu=0.0, t=1.0, Delta=1.0)
E_topo = np.linalg.eigvalsh(H_topo)
print(f"  Topological phase (mu=0, t=1, Delta=1) — N={N} sites:")
print(f"    Two lowest |E|: {abs(E_topo[0]):.4f}, {abs(E_topo[1]):.4f}  (Majorana zero modes)")
print(f"    Bulk gap:      {abs(E_topo[2]):.4f}")
# Trivial: |mu| > 2t
H_triv = kitaev_chain(N, mu=3.0, t=1.0, Delta=1.0)
E_triv = np.linalg.eigvalsh(H_triv)
print()
print(f"  Trivial phase (mu=3, t=1, Delta=1) — N={N} sites:")
print(f"    Two lowest |E|: {abs(E_triv[0]):.4f}, {abs(E_triv[1]):.4f}  (gapped, no zero modes)")
print(f"    Bulk gap:      {abs(E_triv[2]):.4f}")

print()
print("=== Topological protection ===")
print()
Delta_topo = abs(E_topo[2])
kBT = 0.025  # T~300mK, kBT in meV
protection = np.exp(-Delta_topo / kBT)
print(f"  Bulk topological gap Delta = {Delta_topo:.4f} meV")
print(f"  Thermal energy kBT (T=300mK) = {kBT:.3f} meV")
print(f"  Local-noise suppression = exp(-Delta/kBT) = {protection:.4f}")
print(f"  -> Local perturbation cannot split Majorana degeneracy below Delta")
print(f"  -> This is why Microsoft Majorana 1 uses topoconductors")

print()
print("Implementation: visual = wire with Majorana endpoints + spectrum; math = BdG diagonalisation")
`;

const DECOHERENCE_TIMELINE_CODE = `import numpy as np
import math

# === Historical T1, T2 progression (1998-2024) ===
timeline = [
    (1998, 0.001, "Nielsen-Chuang era — NMR"),
    (2003, 0.002, "first superconducting qubit"),
    (2009, 0.004, "Yale transmon"),
    (2014, 0.040, "Google / UCSB early transmons"),
    (2017, 0.090, "Google 9-qubit device"),
    (2019, 0.130, "Google Sycamore"),
    (2021, 0.150, "IBM Eagle"),
    (2024, 0.300, "Google Willow (~5x vs Sycamore)"),
]

print("=== T1 coherence time progression (1998 -> 2024) ===")
print()
print(f"  {'Year':>6}  {'T1 (us)':>10}  Chip / milestone")
print(f"  {'----':>6}  {'-------':>10}  --------------")
for year, t1, label in timeline:
    print(f"  {year:>6}  {t1*1e6:>10.1f}  {label}")

# Log-linear fit: T1(t) = T1_0 * 2^(t / doubling_time)
years = np.array([y for y, _, _ in timeline])
t1s = np.array([t for _, t, _ in timeline])
log_t1 = np.log(t1s)
b, a = np.polyfit(years, log_t1, 1)
doubling_time = math.log(2) / b
print()
print(f"  Best-fit doubling time: {doubling_time:.1f} years  (~2x every {doubling_time:.0f} years)")
print(f"  Compare to Moore's law: 2 years")

print()
print(f"  Projections (assuming {doubling_time:.0f}-year doubling continues):")
for year in [2027, 2030, 2035, 2040]:
    projected = t1s[0] * 2 ** ((year - years[0]) / doubling_time)
    print(f"    {year}: T1 = {projected*1e6:.0f} us = {projected*1e3:.1f} ms")

print()
print("=== Surface-code threshold crossing ===")
print()
print(f"  Threshold p_c ~ 1%  (surface code below this works)")
print(f"  1998: p_phys ~ 50% (way above threshold)")
print(f"  2024: p_phys ~ 0.3% (BELOW threshold — Willow, Dec 2024)")
print(f"  -> Fault-tolerant quantum computing now theoretically possible")

print()
print("Implementation: visual = log-scale timeline plot; math = exponential fit + threshold crossing")
`;

const QISKIT_EQUIV_CODE = `import numpy as np

# === Bell state circuit: H on q0, CNOT(q0, q1), measure ===
# (Hand-rolled mini-Qiskit — qiskit isn't on Pyodide's default index,
#  but the math is identical to running qiskit.QuantumCircuit(2, 2).)

def H_gate():
    return np.array([[1, 1], [1, -1]], dtype=complex) / np.sqrt(2)

def CNOT_gate():
    """4x4 CNOT: |a,b> -> |a, a XOR b>."""
    return np.array([[1,0,0,0], [0,1,0,0], [0,0,0,1], [0,0,1,0]], dtype=complex)

def kron(*mats):
    out = np.array([[1.0]], dtype=complex)
    for m in mats:
        out = np.kron(out, m)
    return out

I2 = np.eye(2, dtype=complex)
U_H = kron(H_gate(), I2)
U_CNOT = CNOT_gate()
U_total = U_CNOT @ U_H
zero_zero = np.array([1, 0, 0, 0], dtype=complex)
bell_state = U_total @ zero_zero

print("=== Bell state circuit (hand-rolled mini-Qiskit) ===")
print()
print("  Circuit:  q0 --[H]--*-- M")
print("           q1 --------X-- M")
print()
print(f"  |00> input state:    {zero_zero}")
print(f"  After H (x) I:       {U_H @ zero_zero}")
print(f"  After CNOT:          {bell_state}")
print(f"  -> Bell state |Phi+> = (|00> + |11>) / sqrt(2)")

print()
print(f"  Measurement probabilities:")
for i, label in enumerate(["00", "01", "10", "11"]):
    p = abs(bell_state[i])**2
    print(f"    P({label}) = {p:.4f}  (classical max = 0.25)")

# Transpile to native gate set: {RZ(theta), SX, X, CX}
import math

def RZ(theta):
    return np.array([[np.exp(-1j*theta/2), 0], [0, np.exp(1j*theta/2)]], dtype=complex)

def SX():
    return np.array([[0.5+0.5j, 0.5-0.5j], [0.5-0.5j, 0.5+0.5j]], dtype=complex)

H_native = RZ(math.pi/2) @ SX() @ RZ(math.pi/2)
print()
print(f"  Transpile H -> RZ(pi/2) SX RZ(pi/2):")
print(f"    ||H_native - H|| = {np.linalg.norm(H_native - H_gate()):.2e}  (close to 0 -> valid decomp)")
print(f"    Gate count: 3 native gates vs 1 ideal gate")

# Sample 8192 shots (real IBM hardware default)
np.random.seed(42)
probs = [abs(bell_state[i])**2 for i in range(4)]
samples = np.random.choice([0, 1, 2, 3], p=probs, size=8192)
counts = {bin(i)[2:].zfill(2): int((samples == i).sum()) for i in range(4)}
print()
print(f"  8192 shots sampled:")
for outcome, count in sorted(counts.items()):
    print(f"    {outcome}: {count}  ({count/8192:.3f})")

print()
print("Implementation: visual = circuit diagram + transpiled gate list; math = unitary composition")
`;

const HELIOS_ALLTOALL_CODE = `import numpy as np

# === Connectivity: superconducting heavy-hex vs trapped-ion all-to-all ===

def swaps_superconductor(N):
    """Heavy-hex lattice: ~N/2 SWAPs per long-range 2-qubit gate.
    Full all-to-all needs N(N-1)/2 long-range gates -> ~N(N-1) SWAPs."""
    return N * (N - 1)

def swaps_trapped_ion(N):
    """Native all-to-all — any 2 qubits interact directly."""
    return 0

print("=== Quantinuum Helios: all-to-all vs superconductor nearest-neighbour ===")
print()
print("  H2-1 (Jun 2024): 56 qubits, 99.8% 2-qubit fidelity, all-to-all")
print("  Helios (2025):   96-98 qubits, QCCD architecture, all-to-all")
print("  IBM Heron R2 (Nov 2024): 156 qubits, 99.7% 2-qubit fidelity, heavy-hex")
print()

print(f"  {'N':>4}  {'SWAPs (SC)':>14}  {'SWAPs (Ion)':>14}  {'Ion savings':>14}")
print(f"  {'--':>4}  {'----------':>14}  {'-----------':>14}  {'-----------':>14}")
for N in [10, 20, 50, 100, 156, 200]:
    sc = swaps_superconductor(N)
    ion = swaps_trapped_ion(N)
    savings = sc - ion
    print(f"  {N:>4}  {sc:>14}  {ion:>14}  {savings:>14}")

print()
print("=== Effective circuit fidelity for 100-gate variational ansatz (N=50) ===")
print()
N = 50
gates_ideal = 100
sc_swaps = swaps_superconductor(N)
total_sc_gates = gates_ideal + sc_swaps
total_ion_gates = gates_ideal
p2q_sc = 0.003   # 99.7%
p2q_ion = 0.002  # 99.8%
p_success_sc = (1 - p2q_sc) ** total_sc_gates
p_success_ion = (1 - p2q_ion) ** total_ion_gates
print(f"  N={N} qubits, ansatz needs {gates_ideal} native 2-qubit gates")
print(f"  Superconductor: +{sc_swaps} SWAPs = {total_sc_gates} total gates")
print(f"    Success rate @ p={p2q_sc*100:.1f}%: {p_success_sc:.6f}")
print(f"  Trapped ion: {total_ion_gates} total gates (no SWAPs needed)")
print(f"    Success rate @ p={p2q_ion*100:.1f}%: {p_success_ion:.6f}")
print(f"  -> Ion trap gives {p_success_ion/max(p_success_sc, 1e-12):.1f}x higher success for all-to-all algos")

print()
print("Implementation: visual = lattice vs complete-graph diagram; math = SWAP overhead * fidelity")
`;

const SHOR_RESOURCE_CODE = `import numpy as np
import math

# === Shor's algorithm resource estimation ===
# Per Gidney & Ekerå 2019 (arXiv:1905.09749):
#   ~20M physical qubits for 2048-bit RSA
#   ~8 hours runtime
#   Surface code distance d ~ 17-21
#   Magic state distillation overhead: ~100x the logical qubit count

def surface_code_physical_qubits(d, n_logical):
    """Rotated surface code: 2d^2 - 1 physical per logical + ancilla."""
    return n_logical * (2 * d * d - 1 + 4 * (d - 1))

def shor_resources(n_bits):
    """Estimate physical qubits + time for factoring n_bits-RSA."""
    n_logical = 3 * n_bits  # data + magic factories
    d = max(17, int(2 * math.sqrt(n_bits / 100)))
    n_phys = surface_code_physical_qubits(d, n_logical) * 100
    T_gate = 1e-6  # 1 us per logical Toffoli
    depth = 48.0 * n_bits**3 / math.log2(max(n_bits, 2))
    runtime_s = depth * T_gate
    return n_logical, d, n_phys, runtime_s

print("=== Shor's algorithm — physical qubit + time cost ===")
print()
print(f"  Per Gidney & Ekerå 2019: ~20M qubits, ~8h for RSA-2048")
print()
print(f"  {'Key size':>10}  {'Logical':>10}  {'d':>4}  {'Physical':>15}  {'Runtime':>14}")
print(f"  {'--------':>10}  {'-------':>10}  {'--':>4}  {'--------':>15}  {'-------':>14}")
for n_bits in [256, 512, 1024, 2048, 4096, 8192]:
    n_log, d, n_phys, rt = shor_resources(n_bits)
    if rt < 3600:
        rt_str = f"{rt/60:.1f} min"
    elif rt < 86400:
        rt_str = f"{rt/3600:.1f} h"
    elif rt < 86400*365:
        rt_str = f"{rt/86400:.1f} days"
    else:
        rt_str = f"{rt/(86400*365):.1f} years"
    print(f"  {n_bits:>10}  {n_log:>10}  {d:>4}  {n_phys:>15,}  {rt_str:>14}")

print()
print("=== Today's hardware vs Shor's requirement (RSA-2048) ===")
print()
n_log_2048, d_2048, n_phys_2048, rt_2048 = shor_resources(2048)
current_qubits = 156
print(f"  Shor RSA-2048 needs: ~{n_phys_2048:,} physical qubits")
print(f"  Current best chip:  {current_qubits} qubits  (IBM Heron R2, Nov 2024)")
print(f"  Gap: {n_phys_2048 / current_qubits:,.0f}x more qubits needed")
doubling = 2.0
years_to_shor = math.log2(n_phys_2048 / current_qubits) * doubling
print(f"  At {current_qubits} qubits/chip and 2x qubit growth / 2yr:")
print(f"    Years to Shor: {years_to_shor:.1f} years  (best case)")

print()
print("=== Magic state distillation overhead ===")
print()
print("  T-state distillation: 15 noisy T-states -> 1 high-fidelity T-state")
print("  Success rate ~ 1/12 -> ~180 noisy T-states per logical T-gate")
print("  -> 99% of physical qubits are in magic state factories")
print("  -> This is why fault-tolerant QC is HARD")

print()
print("Implementation: visual = chip-size comparison + Gantt chart; math = Gidney-Ekera 2019 scaling")
`;

export function QuantumComputingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Quantum Computing · NISQ · Hadamard/CNOT/Pauli · Schrödinger · VQE · Grover · QFT"
        title="Quantum Computing — The Variational Principle Made Computational"
        description="Quantum computing exploits three resources classical bits cannot: superposition (|ψ⟩ = α|0⟩ + β|1⟩), entanglement (Bell states, EPR pairs), and interference (Grover amplitude amplification). The Hadamard, CNOT, and Pauli gates are the universal gate set; the Schrödinger equation iℏ d|ψ⟩/dt = H|ψ⟩ governs all unitary evolution. VQE (Peruzzo 2014) finds molecular ground states via min⟨ψ(θ)|H|ψ(θ)⟩ — the variational principle made computational, the SAME principle that powers ADR-049 MACE (energy minimisation), AlphaFold (free-energy minimisation), and neural networks (loss minimisation). Grover gives O(√N) search; QFT gives O(n log n) Fourier transforms. With 4 AI illustrations + a looping Bell-state 'short' + Pyodide circuit simulator + low-level PyTorch QuantumGate / QuantumCircuit / VQE / GroverCircuit."
        right={
          <>
            <Badge variant="outline" className="gap-1.5"><Atom className="h-3 w-3" /> Hadamard + CNOT</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Pyodide</Badge>
          </>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      <SectionCard
        title="Quantum concept gallery — 3D animated, click to expand (lazy popup)"
        description="Replaces the previous AI-generated static image gallery. The old gallery had 4 PNGs, two of which contained random Chinese characters hallucinated by the AI image generator ('睿加意' on the circuit image, '已知'/'求解' on the VQE image). The new gallery is procedural — pure SVG + CSS 3D transforms + framer-motion, no AI images, no Chinese-text issue. Each card opens a lazy modal with: (1) an animated 3D scene, (2) an n-D toggle showing how the concept scales across Hilbert-space dimensions (3D single-qubit Bloch → 4D Bell pair → 5D GHZ → N-D cluster), and (3) a floating math/code background with the actual equations and Python snippets that power the visual."
        icon={<Atom className="h-5 w-5" />}
        badge="3D gallery"
      >
        <QuantumGallery3D />
      </SectionCard>

      <SectionCard title="Bell state short — quantum circuit → superposition → entanglement → Bell state → measurement (loop)" icon={<Atom className="h-5 w-5" />} badge="short">
        <QuantumCircuitShort />
      </SectionCard>

      <SectionCard
        title="Quantum concept shorts — superposition, entanglement, Grover, decoherence (click to pop up)"
        description="Inspired by https://www.youtube.com/shorts/TOPgZ-AbFwo (30-second vertical explainers). Four 9:16 vertical cards — each click opens a LAZY modal with an animated SVG, the governing math equations, Pyodide-runnable Python that prints concrete numerical outcomes, and a 2024-2025 research citation with extracted hardware numbers. Modal content is mounted only when the card is clicked — the heavy SVG + Pyodide bundle never loads for users who don't open the modal."
        icon={<Zap className="h-5 w-5" />}
        badge="4 shorts"
      >
        <QuantumShortsCarousel />
      </SectionCard>

      <SectionCard
        title="Recent breakthroughs (2024-2025) — Willow, Heron R2, H2, Majorana 1"
        description="The quantum-hardware landscape changed dramatically in late 2024 / early 2025. Below: a comparison table of the four most consequential processors of the era — each chip is paired with the specific breakthrough it demonstrated, and a Python snippet showing how to extract its headline number."
        icon={<Atom className="h-5 w-5" />}
        badge="2024-2025"
      >
        <div className="space-y-4">
          {/* Hardware comparison table */}
          <div className="overflow-x-auto rounded-md border border-border/60">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left p-2 font-semibold">Chip</th>
                  <th className="text-left p-2 font-semibold">Vendor</th>
                  <th className="text-left p-2 font-semibold">Date</th>
                  <th className="text-right p-2 font-semibold">Qubits</th>
                  <th className="text-right p-2 font-semibold">2Q fidelity</th>
                  <th className="text-left p-2 font-semibold">Headline breakthrough</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                <tr>
                  <td className="p-2 font-semibold text-primary">Willow</td>
                  <td className="p-2">Google Quantum AI</td>
                  <td className="p-2">Dec 2024</td>
                  <td className="p-2 text-right font-mono">105</td>
                  <td className="p-2 text-right font-mono">99.7%</td>
                  <td className="p-2">First QEC <em>below</em> surface-code threshold — Λ = 2.14 ± 0.02 (Nature 2025)</td>
                </tr>
                <tr>
                  <td className="p-2 font-semibold text-primary">Heron R2</td>
                  <td className="p-2">IBM Quantum</td>
                  <td className="p-2">Nov 2024</td>
                  <td className="p-2 text-right font-mono">156</td>
                  <td className="p-2 text-right font-mono">99.7%</td>
                  <td className="p-2">TLS mitigation + tensor-network error mitigation; utility-scale circuits at depth &gt;100</td>
                </tr>
                <tr>
                  <td className="p-2 font-semibold text-primary">H2-1</td>
                  <td className="p-2">Quantinuum</td>
                  <td className="p-2">Jun 2024</td>
                  <td className="p-2 text-right font-mono">56 (ion)</td>
                  <td className="p-2 text-right font-mono">99.8%</td>
                  <td className="p-2">12 logical qubits with Microsoft QEC; RCS infeasible classically below 56 qubits</td>
                </tr>
                <tr>
                  <td className="p-2 font-semibold text-primary">Majorana 1</td>
                  <td className="p-2">Microsoft</td>
                  <td className="p-2">Feb 2025</td>
                  <td className="p-2 text-right font-mono">8 (topo.)</td>
                  <td className="p-2 text-right font-mono">—</td>
                  <td className="p-2">First topological qubit — uses topoconductor + Majorana zero modes; inherent noise protection</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground/80">The arc:</strong> Willow proves quantum error correction works below threshold (the precondition for scaling).
            Heron R2 pushes NISQ utility via software mitigation. H2 demonstrates logical qubits at scale on trapped ions.
            Majorana 1 bets on a fundamentally different qubit modality (topological) that is theoretically immune to local noise —
            the long-term path to fault tolerance without enormous physical-qubit overheads.
          </p>
          {/* Code that extracts headline numbers from each paper */}
          <PyodideRunner
            buttonLabel="Run hardware-comparison + scalability model (Pyodide)"
            code={`import numpy as np

# ====== HEADLINE NUMBERS FROM 2024-2025 PAPERS ======
chips = [
    {"name": "Willow",    "vendor": "Google",      "year": 2024, "qubits": 105, "p_2q": 1 - 0.997,  "note": "First QEC below threshold (Nature 2025)"},
    {"name": "Heron R2",  "vendor": "IBM",         "year": 2024, "qubits": 156, "p_2q": 1 - 0.997,  "note": "TLS + tensor-network mitigation"},
    {"name": "H2-1",      "vendor": "Quantinuum",  "year": 2024, "qubits":  56, "p_2q": 1 - 0.998,  "note": "12 logical qubits w/ MSFT QEC"},
    {"name": "Majorana 1","vendor": "Microsoft",    "year": 2025, "qubits":   8, "p_2q": None,       "note": "Topological qubit — topoconductor"},
]

print("=" * 80)
print(f"{'Chip':<12} {'Year':<6} {'Qubits':>8} {'2Q error':>10}  Breakthrough")
print("-" * 80)
for c in chips:
    err = f"{c['p_2q']*100:.2f}%" if c['p_2q'] is not None else "n/a"
    print(f"{c['name']:<12} {c['year']:<6} {c['qubits']:>8} {err:>10}  {c['note']}")
print("=" * 80)

# ====== WILLOW: Λ scaling — the breakthrough metric ======
print("\\n=== Google Willow: Λ (logical error suppression) ===")
p_phys = 1.5e-3      # 0.15% physical (Willow 2024)
p_c    = 1.0e-2      # surface code threshold ~1%
Lambda_empirical = 2.14  # measured in Nature 2025 paper

Lambda_predicted = (p_c / p_phys) ** 2
print(f"  p_phys = {p_phys*100:.2f}%,  p_c ≈ {p_c*100:.1f}%")
print(f"  Predicted Λ = (p_c/p)² = {Lambda_predicted:.2f}")
print(f"  Measured Λ = {Lambda_empirical:.2f} ± 0.02  (d=5 → d=7 transition)")
print(f"  → Logical error DECREASES as code grows. Fault tolerance is now within reach.")

# ====== SURFACE CODE: qubit cost for Shor's algorithm ======
print("\\n=== Surface code qubit cost for Shor's algorithm (2048-bit RSA) ===")
# Per Gidney & Ekerå 2019: ~20M physical qubits, depth ~8 hours
# Per surface code d=17-21 with current Willow p_phys:
def qubits_for_distance(d):
    # rotated surface code: 2d^2 - 1 data + ancilla ~ 2d^2 - 1 + 4(d^2-1)/2
    return 2 * d * d - 1 + 2 * (d * d - 1)

for d in [5, 11, 17, 21]:
    print(f"  d={d:2d}  ({qubits_for_distance(d):>7,d} physical qubits)")

# ====== MICROSOFT MAJORANA 1: topological protection factor ======
print("\\n=== Microsoft Majorana 1: topological protection ===")
# Topological gap Δ protects against local noise with rate ~exp(-Δ/kT)
Delta_meV = 0.05   # ~50 µeV gap measured
kBT_meV   = 0.025  # T=300mK, kBT in meV
protection = np.exp(-Delta_meV / kBT_meV)
print(f"  Topological gap Δ ≈ {Delta_meV:.3f} meV")
print(f"  Thermal energy kBT (T=300mK) ≈ {kBT_meV:.3f} meV")
print(f"  Local-noise suppression factor exp(-Δ/kBT) = {protection:.2e}")
print(f"  → Inherent error ~10^-1 — needs to drop to 10^-4 for fault-tolerant topological qubits")
print(f"  → Microsoft's bet: scale Δ via topoconductor engineering, NOT via surface code.")`}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Quantum gates — Hadamard, CNOT, Pauli (X, Y, Z)"
        description="A quantum gate is a unitary matrix U (U†U = I — preserves state norm). Hadamard creates equal superposition: H|0⟩ = (|0⟩ + |1⟩)/√2 = |+⟩. Pauli-X is the quantum NOT (flips |0⟩ ↔ |1⟩). CNOT (control-NOT) entangles two qubits: flips the target iff the control is |1⟩. Together {H, CNOT, RZ(θ)} form a universal gate set — any unitary can be decomposed into them."
        icon={<Brain className="h-5 w-5" />}
        badge="mathematics"
      >
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-xs text-primary">H = (1/√2)·[[1, 1], [1, -1]] &nbsp;·&nbsp; X = [[0,1],[1,0]] &nbsp;·&nbsp; Z = [[1,0],[0,-1]] &nbsp;·&nbsp; CNOT = [[1,0,0,0],[0,1,0,0],[0,0,0,1],[0,0,1,0]]</p>
            <p className="text-[11px] text-muted-foreground mt-1">Universal gate set: any n-qubit unitary decomposes into H, CNOT, and parameterised rotations RZ(θ), RY(θ).</p>
          </div>
          <div className="grid md:grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
              <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">Hadamard — superposition</p>
              <p className="font-mono text-[11px]">H|0⟩ = (|0⟩+|1⟩)/√2 = |+⟩</p>
              <p className="font-mono text-[11px]">H|1⟩ = (|0⟩−|1⟩)/√2 = |-⟩</p>
              <p className="text-muted-foreground text-[11px] mt-1">Creates equal-probability superposition. H² = I (Hermitian). The starting move for almost every quantum algorithm.</p>
            </div>
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5">
              <p className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-1">CNOT — entanglement</p>
              <p className="font-mono text-[11px]">CNOT|10⟩ = |11⟩, CNOT|00⟩ = |00⟩</p>
              <p className="font-mono text-[11px]">Flips target iff control = |1⟩</p>
              <p className="text-muted-foreground text-[11px] mt-1">The entangling gate — required for any non-classical correlation. H + CNOT = Bell state.</p>
            </div>
            <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-2.5">
              <p className="font-semibold text-sm text-violet-600 dark:text-violet-400 mb-1">Pauli-X — bit flip</p>
              <p className="font-mono text-[11px]">X|0⟩ = |1⟩, X|1⟩ = |0⟩</p>
              <p className="font-mono text-[11px]">X = [[0,1],[1,0]]</p>
              <p className="text-muted-foreground text-[11px] mt-1">Quantum NOT gate. Equivalent to Rx(π). Generates Bloch-sphere rotation by π around the x-axis.</p>
            </div>
            <div className="rounded-md border border-rose-500/40 bg-rose-500/5 p-2.5">
              <p className="font-semibold text-sm text-rose-600 dark:text-rose-400 mb-1">Pauli-Z — phase flip</p>
              <p className="font-mono text-[11px]">Z|0⟩ = |0⟩, Z|1⟩ = -|1⟩</p>
              <p className="font-mono text-[11px]">Z = diag(1, -1)</p>
              <p className="text-muted-foreground text-[11px] mt-1">Adds a relative phase of -1 to |1⟩. Combined with H, becomes a bit-flip in the |+⟩/|-⟩ basis.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Schrödinger equation — the dynamics of quantum states"
        description="Closed quantum systems evolve unitarily according to the Schrödinger equation iℏ·d|ψ⟩/dt = H|ψ⟩. The Hamiltonian H is a Hermitian operator (H = H†) whose eigenvalues are the system's allowed energies. The formal solution: |ψ(t)⟩ = exp(-iHt/ℏ)|ψ(0)⟩ — unitary evolution by U = e^(-iHt/ℏ). This is WHY all quantum gates must be unitary — they are special cases of Schrödinger evolution for short times. Measurement, by contrast, is NON-unitary — it collapses the superposition to a single eigenstate (Born's rule: P(k) = |⟨k|ψ⟩|²)."
        icon={<Brain className="h-5 w-5" />}
        badge="mathematics"
      >
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">iℏ · d|ψ⟩/dt = H |ψ⟩ &nbsp;⟹&nbsp; |ψ(t)⟩ = e^(-iHt/ℏ) |ψ(0)⟩</p>
            <p className="text-[11px] text-muted-foreground mt-1">Unitary evolution — closed quantum systems. The propagator U = e^(-iHt/ℏ) is unitary because H is Hermitian.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
              <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">Unitary evolution</p>
              <p className="font-mono text-[11px]">|ψ(t)⟩ = U|ψ(0)⟩</p>
              <p className="font-mono text-[11px]">U†U = I (preserves norm)</p>
              <p className="text-muted-foreground text-[11px] mt-1">Quantum gates ARE short-time Schrödinger evolution. Every gate U = e^(-iHt/ℏ) for some H, t.</p>
            </div>
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5">
              <p className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-1">Measurement collapse</p>
              <p className="font-mono text-[11px]">P(k) = |⟨k|ψ⟩|²</p>
              <p className="font-mono text-[11px]">(Born's rule)</p>
              <p className="text-muted-foreground text-[11px] mt-1">NON-unitary. Collapses to eigenstate |k⟩ with probability given by Born's rule. Information is destroyed.</p>
            </div>
            <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-2.5">
              <p className="font-semibold text-sm text-violet-600 dark:text-violet-400 mb-1">Heisenberg uncertainty</p>
              <p className="font-mono text-[11px]">ΔA·ΔB ≥ ½|⟨[A,B]⟩|</p>
              <p className="font-mono text-[11px]">For [X,P] = iℏ</p>
              <p className="text-muted-foreground text-[11px] mt-1">Non-commuting observables (position/momentum) cannot both be known precisely. Underpins all quantum weirdness.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="VQE — variational principle made computational"
        description="VQE (Peruzzo et al. 2014) is the canonical NISQ-era algorithm for quantum chemistry. It exploits the Rayleigh-Ritz variational principle: E_0 ≤ ⟨ψ(θ)|H|ψ(θ)⟩ for ANY parameterised state |ψ(θ)⟩. By minimising E(θ) over a parameterised ansatz (a parameterised quantum circuit), VQE finds the ground state energy E_0. The quantum device prepares |ψ(θ)⟩ and measures expectation values; a classical optimiser (COBYLA, SPSA, Adam) updates θ. This hybrid loop is NISQ-friendly — only short-depth circuits needed, robust to gate noise."
        icon={<Brain className="h-5 w-5" />}
        badge="mathematics"
      >
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">E_0 = min_θ ⟨ψ(θ)|H|ψ(θ)⟩ &nbsp;·&nbsp; ansatz: |ψ(θ)⟩ = U(θ)|0⟩</p>
            <p className="text-[11px] text-muted-foreground mt-1">Rayleigh-Ritz variational principle — the SAME principle as ADR-049 MACE, AlphaFold, neural-network loss minimisation.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
              <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">Quantum subroutine</p>
              <p className="font-mono text-[11px]">E(θ) = Σ h_i ⟨P_i⟩ + Σ h_ij ⟨P_i P_j⟩</p>
              <p className="text-muted-foreground text-[11px] mt-1">Hamiltonian decomposed into Pauli strings (I, X, Y, Z on each qubit). Quantum device measures each ⟨P_i⟩ via repeated circuit execution.</p>
            </div>
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5">
              <p className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-1">Classical optimiser</p>
              <p className="font-mono text-[11px]">θ_{"{t+1}"} = θ_{"{t}"} - η·∇E(θ_{"{t}"})</p>
              <p className="text-muted-foreground text-[11px] mt-1">COBYLA / SPSA / Adam update variational parameters. Hybrid loop iterates until convergence → ground state.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Grover's algorithm — amplitude amplification"
        description="Grover (1996) gives a QUADRATIC speedup for unstructured search: find 1 marked item in N items with O(√N) oracle queries (vs O(N) classically). Algorithm: (1) prepare uniform superposition |s⟩ = H⊗n|0⟩, (2) repeat r ≈ (π/4)√N times: oracle flips phase of marked state, diffuser D = 2|s⟩⟨s| - I inverts amplitudes about the mean. Geometrically, each Grover iteration rotates the state vector by 2θ toward the marked basis vector, where sin(θ) = 1/√N. After r iterations, the state is almost exactly |x*⟩ — measure → marked item with probability → 1. Provably optimal for unstructured search (Bennett et al. 1997)."
        icon={<Brain className="h-5 w-5" />}
        badge="mathematics"
      >
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">|s⟩ = H⊗n|0⟩ &nbsp;·&nbsp; U_f|x⟩ = (-1)^f(x)|x⟩ &nbsp;·&nbsp; D = 2|s⟩⟨s| - I &nbsp;·&nbsp; r ≈ (π/4)√N</p>
            <p className="text-[11px] text-muted-foreground mt-1">Grover iteration: oracle + diffuser rotates the state vector 2θ toward the marked basis. Optimal r lands on |x*⟩ with prob ≈ sin²((2r+1)θ) ≈ 1.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
              <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">Initial state</p>
              <p className="font-mono text-[11px]">|s⟩ = (1/√N)·Σ_x |x⟩</p>
              <p className="text-muted-foreground text-[11px] mt-1">Uniform superposition over all N = 2ⁿ basis states. Initial overlap with marked: ⟨x*|s⟩ = 1/√N.</p>
            </div>
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5">
              <p className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-1">Oracle</p>
              <p className="font-mono text-[11px]">U_f = I - 2|x*⟩⟨x*|</p>
              <p className="text-muted-foreground text-[11px] mt-1">Phase flip on marked item only. The ONLY place problem-specific information enters. Black-box — query complexity matters.</p>
            </div>
            <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-2.5">
              <p className="font-semibold text-sm text-violet-600 dark:text-violet-400 mb-1">Diffuser</p>
              <p className="font-mono text-[11px]">D = 2|s⟩⟨s| - I</p>
              <p className="text-muted-foreground text-[11px] mt-1">Inversion about the mean amplitude. Amplifies the marked state's amplitude (which became negative after oracle) and suppresses others.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="HPC pipeline — problem → quantum circuit → NISQ hardware → classical optimiser → result" description="End-to-end NISQ-era quantum computing pipeline. Scientific problem (e.g., H2 ground state) → parameterised circuit (ansatz) → transpile to hardware-native gate set → execute on NISQ hardware (shot-based, ~8192 repetitions) → measure expectation values → classical optimiser updates θ → repeat until energy converges. On IBM Eagle (127 qubits), takes minutes per VQE iteration; ~50-100 iterations to converge. The hybrid quantum-classical loop is the canonical NISQ execution pattern." icon={<Activity className="h-5 w-5" />}>
        <CodeBlock language="text" filename="quantum_pipeline.txt" code={`┌──────────────────────────────────────────────────────────────────────┐
│  QUANTUM-COMPUTING HPC PIPELINE (NISQ era)                          │
│                                                                      │
│  Scientific problem (e.g., H2 ground state, MaxCut, TSP)            │
│         ↓                                                            │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │ 1. Map problem → quantum circuit                        │        │
│  │    - VQE: choose ansatz (Hardware-efficient / UCCSD)     │        │
│  │    - Grover: build oracle U_f                            │        │
│  │    - QAOA: mixer + cost Hamiltonian layers               │        │
│  │    - Define Hamiltonian H = Σ h_i P_i + Σ h_ij P_i P_j  │        │
│  │    - Output: parameterised OpenQASM 3.0 circuit          │        │
│  └──────────────────────────────────────────────────────────┘        │
│         ↓                                                            │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │ 2. Transpile for NISQ hardware                          │        │
│  │    - IBM Eagle (127 qubits, heavy-hex topology)           │        │
│  │    - Google Sycamore (53 qubits, Sycamore topology)      │        │
│  │    - Compile to native gate set {RZ, SX, X, CX}          │        │
│  │    - Optimisation level 3 (gate cancellation, routing)   │        │
│  │    - Output: pulse schedule (AVX-calibrated)            │        │
│  └──────────────────────────────────────────────────────────┘        │
│         ↓                                                            │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │ 3. Execute on quantum hardware (shot-based)             │        │
│  │    - 8192 shots per circuit (Poisson noise statistics)    │        │
│  │    - Gate error ~10^-3, T1 ~100 µs, T2 ~80 µs            │        │
│  │    - Readout error ~2%                                    │        │
│  │    - Output: bitstring counts {b_i: count_i}             │        │
│  └──────────────────────────────────────────────────────────┘        │
│         ↓                                                            │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │ 4. Classical post-processing                           │        │
│  │    - For VQE: estimate E(θ) = Σ h_i ⟨P_i⟩                │        │
│  │      (rotate measurement basis per Pauli term)           │        │
│  │    - For Grover: count marked-item outcomes              │        │
│  │    - Mitigation: readout-error correction, ZNE, PEC      │        │
│  │    - Output: scalar energy / probability                 │        │
│  └──────────────────────────────────────────────────────────┘        │
│         ↓                                                            │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │ 5. Classical optimiser (COBYLA / SPSA / Adam)          │        │
│  │    - Gradient via parameter-shift rule:                  │        │
│  │      ∂E/∂θ_i = [E(θ+π/2·e_i) - E(θ-π/2·e_i)] / 2       │        │
│  │    - Update θ to minimise E(θ)                           │        │
│  │    - Convergence: |ΔE| < 10^-4 Ha for 5 consecutive steps│        │
│  │    - Output: new θ vector → next quantum iteration        │        │
│  └──────────────────────────────────────────────────────────┘        │
│         ↓ (loop 50-100 iterations until convergence)                 │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │ 6. Result                                                │        │
│  │    - VQE: ground state energy (H2: -1.85 Ha, exact match)│        │
│  │    - Grover: marked item identified (prob > 0.99)        │        │
│  │    - QAOA: approximate combinatorial optimum (MaxCut)    │        │
│  │    - Output: classical answer + error bars               │        │
│  └──────────────────────────────────────────────────────────┘        │
│                                                                      │
│  Total wall-clock: 10-30 min per VQE iteration on IBM Eagle         │
│  Total convergence: ~50-100 iterations = 8-50 hours                 │
│  Cost: ~$1-5 per shot-batch on IBM Quantum cloud                    │
└──────────────────────────────────────────────────────────────────────┘`} />
      </SectionCard>

      <SectionCard title="Try it: qubit states, Hadamard, Bell state, Grover (Pyodide)" icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={QC_DEMO} buttonLabel="Run quantum circuit simulator (Pyodide)" />
      </SectionCard>

      <SectionCard title="Modern papers — VQE, QAOA, Sycamore, Eagle" icon={<Atom className="h-5 w-5" />}>
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">VQE (Peruzzo et al. 2014, Nature Communications):</strong> The foundational NISQ-era algorithm. Demonstrated on H2 ground state using photonic qubits. Hybrid quantum-classical loop — only short-depth circuits needed. Variational principle guarantees E(θ) ≥ E_0. Enabled quantum chemistry on hardware with ~5 qubits and gate errors ~1%. The most-cited quantum algorithm of the NISQ era.
          </p>
          <p>
            <strong className="text-foreground/80">QAOA (Farhi et al. 2014, arXiv:1411.4028):</strong> Quantum Approximate Optimisation Algorithm — variational algorithm for combinatorial problems (MaxCut, MaxCover). Inspired by adiabatic quantum computing. Parameterised mixer + cost Hamiltonian layers. With p layers, approximates the optimum to within O(1/p) — better than any classical polytime algorithm for some problems (assuming P ≠ NP). Bridges gate-based and adiabatic QC.
          </p>
          <p>
            <strong className="text-foreground/80">Google Sycamore (Arute et al. 2019, Nature):</strong> Quantum supremacy using a 53-qubit programmable superconducting processor. Sampled random quantum circuits in 200 seconds — claimed classical supercomputers would need ~10,000 years. IBM disputed the estimate (suggested 2.5 days with better algorithm), but the proof-of-principle stood: a quantum device did something classically infeasible. The dawn of NISQ-era quantum advantage.
          </p>
          <p>
            <strong className="text-foreground/80">IBM Eagle (127 qubits, 2022):</strong> First quantum processor to exceed 100 qubits. Heavy-hex topology (no degree-3 nodes, reduces error). Demonstrated simulation of a Heisenberg spin model — claimed first "utility" quantum computation beating classical brute-force statevector simulation. The gateway to fault-tolerant scale: ~1000+ physical qubits needed for 1 logical qubit (surface code, distance ~7-9).
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Low-level PyTorch — QuantumGate, QuantumCircuit, VQE, GroverCircuit" icon={<Cpu className="h-5 w-5" />} badge="low-level">
        <CodeBlock language="python" filename="quantum_computing.py" code={PYTORCH_CODE} />
      </SectionCard>

      <SectionCard
        title="Quantum interactives — 8 fully interactive visuals (drag, slide, click to explore)"
        description="Replaces the previous 'Improvement designs — 8 code previews' section. Each card opens a lazy popup with a fully interactive visualisation: drag the Bloch sphere, click qubits to inject errors, slide μ across the topological phase boundary, run 8192-shot sampling, etc. The math is computed live in the browser (no Pyodide round-trip) — instant feedback. Modal content only mounts when the card is clicked."
        icon={<Sparkles className="h-5 w-5" />}
        badge="8 interactives"
      >
        <QuantumInteractives />
      </SectionCard>


      <SectionCard title="My deeper thought: quantum computing IS the variational principle made computational" icon={<TrendingUp className="h-5 w-5" />} badge="Insight">
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">VQE literally minimises ⟨ψ(θ)|H|ψ(θ)⟩ — the Rayleigh-Ritz variational principle.</strong> The variational principle is a 100-year-old result from quantum mechanics (Ritz 1908, Rayleigh 1873): for ANY normalised state |ψ⟩, the expectation value ⟨ψ|H|ψ⟩ is an UPPER BOUND on the ground state energy E_0. By parameterising |ψ(θ)⟩ and minimising over θ, you APPROACH E_0. VQE is the direct computational implementation of this principle — replace the analytical ansatz with a parameterised quantum circuit, replace the analytical integral with a quantum measurement, replace analytical differentiation with the parameter-shift rule. The variational principle is not a metaphor for VQE — it IS VQE's mathematical foundation. The ground state energy E_0 = min_θ ⟨ψ(θ)|H|ψ(θ)⟩, period.
          </p>
          <p>
            <strong className="text-foreground/80">This is the SAME variational principle that powers the platform's entire optimisation stack.</strong> ADR-049 MACE (the neural-network potential at the heart of the molecular-modelling pipeline) minimises ⟨E_atom⟩ over the parameterised ansatz h_i = Σ_l CG products — the loss is the SAME Rayleigh quotient ⟨ψ|H|ψ⟩, just with ψ being a MACE message-passing output and H being the Schrödinger Hamiltonian of the molecule. AlphaFold2 (ADR-034) minimises the free energy F = E - TS over the parameterised conformational distribution p_θ(x) — the SAME variational principle, generalised to free energy (Helmholtz variational principle). Boltz-1 (ADR-045) minimises a variational lower bound on the data likelihood — the SAME minimisation structure, just dressed as ELBO maximisation. Even classical neural-network training minimises ⟨L(f_θ(x), y)⟩ over the data distribution — the SAME variational structure, with ψ replaced by the network's parameterised output and H replaced by the loss operator. The principle is universal: parameterise a function, measure an expectation, minimise over parameters. The mathematics is identical across VQE, MACE, AlphaFold, Boltz, and a 3-layer MLP.
          </p>
          <p>
            <strong className="text-foreground/80">This unifies the entire platform under one mathematical skeleton.</strong> ADR-036 (AMBER force fields — hand-crafted) → ADR-049 (MACE — learned via variational) → ADR-052 (VQE — quantum variational) is the natural progression: from explicit physical energy terms, to learned energy terms, to measured energy terms on actual quantum hardware. The molecular-modelling page's AMBER energy E = Σ k_b (r-r_0)² + Σ k_a (θ-θ_0)² + ... is the SAME function as VQE's ⟨ψ|H|ψ⟩ — both are quadratic forms in the state, both are minimised variationally. The neural-network-potentials page's MACE loss is ⟨ψ_MACE|H_Schrödinger|ψ_MACE⟩ — literally the variational principle, just with ψ being the neural-network wavefunction. The diffusion-models page's ELBO is a variational lower bound on log p(x) — the same family of variational methods (mean-field, variational inference). Quantum computing is not a separate domain — it is the most general instance of the variational principle, where the parameterised ansatz lives in a Hilbert space of dimension 2ⁿ (exponential in n) and the measurement is performed by physical hardware rather than numerical integration. The platform's progression — classical MD → learned NNPs → quantum chemistry → fault-tolerant QC — is the natural ladder of variational methods, climbing from analytic to learned to measured to exactly-quantum. Every page on this platform is, mathematically, an instance of min_θ ⟨ψ(θ)|H|ψ(θ)⟩. The variational principle is the connective tissue of computational science.
          </p>
        </div>
      </SectionCard>

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("neural-network-potentials")} className="text-sm text-primary hover:underline">→ Neural Network Potentials (MACE — variational energy on SO(3) irreps)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("molecular-modelling")} className="text-sm text-primary hover:underline">→ Molecular Modelling (AMBER — the hand-crafted precursor)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("diffusion-models")} className="text-sm text-primary hover:underline">→ Diffusion Models (variational lower bound — same family)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">→ Knowledge (ADR-052: VQE adoption on the platform)</Link>
      </div>
    </div>
  );
}
