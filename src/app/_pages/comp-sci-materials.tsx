"use client";

import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Cpu, Layers, Zap, TrendingUp, Terminal, Database,
  Activity, Network, Brain,
} from "lucide-react";

const KPIS = [
  { label: "Core operation", value: "matmul", hint: "GEMM — all neural networks are matrix multiplies", deltaTone: "flat" as const },
  { label: "GPU FLOPS (A100)", value: "312 TFLOPS", hint: "FP16 tensor cores, 108 SMs × 64 FP16", deltaTone: "flat" as const },
  { label: "Silicon node", value: "5nm (TSMC)", hint: "N5 → 3nm N3E → 2nm (future)", deltaTone: "flat" as const },
  { label: "Photoresist", value: "EUV chem", hint: "Chemically amplified resist for 13.5nm light", deltaTone: "flat" as const },
];

const MATERIALS_CHAIN = `┌─────────────────────────────────────────────────────────────────────────┐
│  THE MATERIALS → AI PIPELINE                                              │
│                                                                           │
│  Silica (SiO₂)                                                           │
│    ↓ carbothermic reduction (1900°C, C)                                   │
│  Metallurgical silicon (98% Si)                                            │
│    ↓ Siemens process (HCl, 1100°C)                                        │
│  Trichlorosilane (SiHCl₃)                                                 │
│    ↓ CVD (polysilicon deposition, Siemens reactor)                        │
│  Electronic-grade polysilicon (11N purity = 99.999999999%)               │
│    ↓ CZ crystal growth (melt, seed, rotate)                               │
│  Monocrystalline silicon ingot (300mm diameter)                            │
│    ↓ Diamond saw → wafers (775μm thick)                                   │
│  Bare silicon wafer                                                       │
│    ↓ Photoresist coating (CAR — chemically amplified resist)             │
│    ↓ EUV lithography (13.5nm light, ASML)                                 │
│    ↓ Etch (plasma: SF₆, C₄F₈)                                             │
│    ↓ Ion implantation (B, P, As — dopants)                                │
│    ↓ Metallisation (Cu damascene, W plugs)                                │
│    ↓ Repeat 60-90 layers                                                  │
│  Finished chip (A100 GPU: 54B transistors, 826mm², 5nm)                   │
│    ↓ HBM3 packaging (CoWoS, 80GB)                                        │
│    ↓ NVLink interconnect (900GB/s)                                        │
│    ↓ 8× A100 in DGX (640GB HBM3, 4.8TB NVLink)                           │
│    ↓ CUDA → cuBLAS → PyTorch → Transformer → LLM                         │
│    ↓                                                                       │
│  "What was UK revenue last quarter?" → £2.1M                              │
│                                                                           │
│  From sand to answer. Every LLM response is the end of a                  │
│  120-year materials engineering pipeline.                                  │
└─────────────────────────────────────────────────────────────────────────────────┘`;

const MATMUL_DEMO = `# Matrix Multiplication — the core operation of ALL neural networks
# Shows ijk vs ikj loop order (cache effects)
# This is what GPUs do billions of times per second

import time, random

def matmul_ijk(A, B, n):
    "ijk order: cache-unfriendly (misses on B)"
    C = [[0.0]*n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            s = 0.0
            for k in range(n):
                s += A[i][k] * B[k][j]  # B[k][j] strides by n each inner step
            C[i][j] = s
    return C

def matmul_ikj(A, B, n):
    "ikj order: cache-friendly (B accessed row-major)"
    C = [[0.0]*n for _ in range(n)]
    for i in range(n):
        for k in range(n):
            a_ik = A[i][k]
            for j in range(n):
                C[i][j] += a_ik * B[k][j]  # B[k][j] sequential → cache hit
    return C

def matmul_blocked(A, B, n, block=8):
    "Blocked (tiled): maximises L1/L2 cache reuse"
    C = [[0.0]*n for _ in range(n)]
    for ii in range(0, n, block):
        for kk in range(0, n, block):
            for jj in range(0, n, block):
                for i in range(ii, min(ii+block, n)):
                    for k in range(kk, min(kk+block, n)):
                        a_ik = A[i][k]
                        for j in range(jj, min(jj+block, n)):
                            C[i][j] += a_ik * B[k][j]
    return C

# Benchmark on 64×64 matrices
N = 64
random.seed(42)
A = [[random.gauss(0, 1) for _ in range(N)] for _ in range(N)]
B = [[random.gauss(0, 1) for _ in range(N)] for _ in range(N)]

print("=" * 60)
print("Matrix Multiply Benchmark — Cache Effects")
print("=" * 60)
print(f"\\nMatrix size: {N}×{N} = {N*N} multiply-adds")
print(f"FLOPS: {2*N*N*N:,} (2× for multiply+add)")

# ijk
t0 = time.perf_counter()
_ = matmul_ijk(A, B, N)
t_ijk = time.perf_counter() - t0
print(f"\\nikj (cache-unfriendly):  {t_ijk*1000:.2f} ms")
print(f"  B[k][j] strides by {N} each inner step → cache miss")

# ikj
t0 = time.perf_counter()
C_ikj = matmul_ikj(A, B, N)
t_ikj = time.perf_counter() - t0
print(f"\\nikj (cache-friendly):    {t_ikj*1000:.2f} ms")
print(f"  B[k][j] sequential → L1 cache hit")
print(f"  Speedup: {t_ijk/t_ikj:.1f}×")

# Blocked
t0 = time.perf_counter()
C_blocked = matmul_blocked(A, B, N, block=8)
t_blocked = time.perf_counter() - t0
print(f"\\nBlocked (8×8 tiles):     {t_blocked*1000:.2f} ms")
print(f"  Maximises L1/L2 reuse → best for large matrices")

print(f"\\n{'=' * 60}")
print("RESULTS:")
print(f"  ijk:     {t_ijk*1000:.2f} ms (baseline)")
print(f"  ikj:     {t_ikj*1000:.2f} ms ({t_ijk/t_ikj:.1f}× faster)")
print(f"  Blocked: {t_blocked*1000:.2f} ms ({t_ijk/t_blocked:.1f}× faster)")
print(f"\\n  GPU does this {312e12 / (2*N*N*N / (t_blocked)):.0f}× faster")
print(f"  (A100: 312 TFLOPS vs Python: ~{2*N*N*N / (t_blocked*1e6):.0f} MFLOPS)")
print("=" * 60)`;

const DFT_ANALOGY = `# DFT (Density Functional Theory) → Loss Landscape Analogy
# Shows how the mathematical structure of materials science
# connects to deep learning optimisation

import math, random

# In DFT, the energy E[n] is a functional of the electron density n(r).
# The ground state = the density that MINIMISES E[n].
# This is the variational principle: E₀ ≤ E[n] for all n.

# In deep learning, the loss L(θ) is a function of the parameters θ.
# The optimal model = the parameters that MINIMISE L(θ).
# This is gradient descent: θ ← θ - η·∂L/∂θ

# The analogy:
#   DFT:   E[n(r)]        → minimise → ground state energy
#   DL:    L[θ]           → minimise → optimal model
#
#   DFT:   Kohn-Sham equations (self-consistent iteration)
#   DL:    Backpropagation (gradient descent iteration)
#
#   DFT:   Exchange-correlation functional (unknown exact form)
#   DL:    Loss function (cross-entropy, MSE — known but complex)
#
#   DFT:   Local density approximation (LDA)
#   DL:    Stochastic gradient descent (SGD — local approximation)
#
#   DFT:   The energy landscape has many local minima
#   DL:    The loss landscape has many local minima (saddle points)

print("=" * 60)
print("DFT → Deep Learning: The Variational Connection")
print("=" * 60)

print("\\nDFT (Materials Science):")
print("  E[n(r)] = T[n] + V_ext[n] + J[n] + E_xc[n]")
print("  Minimise → ground state density n₀(r)")
print("  Method: Kohn-Sham self-consistent iteration")

print("\\nDeep Learning:")
print("  L(θ) = -Σ y_i·log(ŷ_i)  (cross-entropy)")
print("  Minimise → optimal parameters θ*")
print("  Method: Gradient descent θ ← θ - η·∂L/∂θ")

print("\\nBoth are variational problems:")
print("  - Find the configuration (density/parameters) that minimises energy/loss")
print("  - Both use iterative methods (SCF / SGD)")
print("  - Both face local minima (saddle points)")
print("  - Both benefit from momentum (SCF damping / Adam optimizer)")

print(f"\\n{'=' * 60}")
print("THE DEEP CONNECTION:")
print("  The same mathematical structure underpins both:")
print("  - Finding ground-state electron configurations (DFT)")
print("  - Training neural networks (gradient descent)")
print("  Both are high-dimensional optimisation on complex landscapes.")
print("  The 'loss landscape' of a neural network IS an energy landscape.")
print("  Saddle points in DL = transition states in chemistry.")
print("  Adam optimiser = damped SCF with momentum.")
print("=" * 60)`;

export function CompSciMaterialsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Computational Science · materials → AI"
        title="Computational Science & Materials for AI"
        description="From silica sand to LLM answers: the 120-year materials engineering pipeline that enables every neural network. Silicon chemistry → semiconductor physics → GPU architecture → matrix multiplication → attention → LLM. With the DFT-to-loss-landscape mathematical analogy, Pyodide matrix multiply benchmarks (ijk vs ikj vs blocked — showing cache effects), and the roofline model connecting hardware to algorithms."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Cpu className="h-3 w-3" /> silicon→GPU→LLM</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Pyodide</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />)}
      </div>

      {/* Materials → AI pipeline */}
      <SectionCard title="From sand to answer — the materials pipeline" description="Every LLM response is the end of a 120-year materials engineering chain: silica → silicon → wafer → chip → GPU → CUDA → PyTorch → Transformer → LLM." icon={<Layers className="h-5 w-5" />}>
        <CodeBlock language="text" filename="materials_pipeline.txt" code={MATERIALS_CHAIN} />
      </SectionCard>

      {/* Matrix multiply — the core operation */}
      <SectionCard title="Matrix multiplication — the ONE operation that powers all AI" description="Every neural network — from a 2-layer MLP to GPT-4 — reduces to matrix multiplication (GEMM). Attention is matmul. Feed-forward is matmul. Convolutions are im2col + matmul. The entire GPU industry exists to accelerate this one operation." icon={<Cpu className="h-5 w-5" />}>
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">C = A · B where A ∈ ℝ^(m×k), B ∈ ℝ^(k×n), C ∈ ℝ^(m×n)</p>
            <p className="text-[11px] text-muted-foreground mt-1">Cost: 2mkn FLOPs. For attention: m=n=seq_len, k=d_model → O(seq_len² × d_model)</p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-border/60 p-2.5">
              <p className="font-semibold mb-1">CPU matmul</p>
              <p className="text-muted-foreground text-[11px]">~50 GFLOPS. BLAS library. Cache-bound. Python loop: ~100 MFLOPS.</p>
            </div>
            <div className="rounded-md border border-border/60 p-2.5">
              <p className="font-semibold mb-1">GPU matmul (A100)</p>
              <p className="text-muted-foreground text-[11px]">312 TFLOPS (FP16). Tensor cores: 4×4×4 matrix per clock per core. 108 SMs.</p>
            </div>
            <div className="rounded-md border border-border/60 p-2.5">
              <p className="font-semibold mb-1">TPU matmul (v5)</p>
              <p className="text-muted-foreground text-[11px]">Systolic array. 256×256 MAC per cycle. Optimised for batched GEMM.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Pyodide matmul benchmark */}
      <SectionCard title="Try it: Matrix multiply benchmark — ijk vs ikj vs blocked (Pyodide)" description="Shows how loop order affects cache performance. ijk: B accessed column-major → cache miss. ikj: B accessed row-major → cache hit. Blocked (tiled): maximises L1/L2 reuse. This is why BLAS libraries use blocked algorithms — and why GPUs use tiled architectures." icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={MATMUL_DEMO} buttonLabel="Run matmul benchmark (Pyodide)" />
      </SectionCard>

      {/* DFT → DL analogy */}
      <SectionCard title="DFT → Deep Learning: the variational connection" description="Density Functional Theory (materials science) and gradient descent (deep learning) share the same mathematical structure: find the configuration that minimises an energy/loss functional." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <CodeBlock language="python" filename="dft_dl_analogy.py" code={DFT_ANALOGY} />
      </SectionCard>

      {/* Roofline model */}
      <SectionCard title="The roofline model — when are you compute-bound vs memory-bound?" description="The roofline model tells you whether your kernel is limited by compute (FLOPS) or memory bandwidth (bytes/s). Below the ridge point: memory-bound. Above: compute-bound. GPU kernels for attention try to stay in the compute-bound regime." icon={<Activity className="h-5 w-5" />}>
        <CodeBlock language="text" filename="roofline.txt" code={`┌──────────────────────────────────────────────────────────────────┐
│  ROOFLINE MODEL (A100 GPU, FP16)                                │
│                                                                  │
│  Performance (TFLOPS)                                            │
│  312 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐                   │
│      │                                       │  COMPUTE-BOUND   │
│      │                                       │  (matmul, attn)  │
│  200 │                                  ╱────┘                   │
│      │                              ╱                             │
│      │                          ╱                                 │
│  100 │                     ╱  MEMORY-BANDWIDTH RIDGE             │
│      │                 ╱        (ridge point ≈ 50 FLOP/byte)      │
│   50 │            ╱                                              │
│      │       ╱                                                    │
│       ╱                                                           │
│  0 ──└──────────────────────────────────────────────────────────  │
│      0    10    20    50    100   200   500  1000                 │
│                  Arithmetic Intensity (FLOP/byte)                 │
│                                                                  │
│  MEMORY-BOUND: low FLOP/byte (elementwise ops, reductions)       │
│  COMPUTE-BOUND: high FLOP/byte (matmul, attention, conv)        │
│                                                                  │
│  Attention: ~2×seq_len×d_model FLOPs / seq_len×d_model bytes      │
│           = 2×d_model FLOP/byte → compute-bound for d_model>25   │
└──────────────────────────────────────────────────────────────────┘`} />
      </SectionCard>

      {/* Materials science research → AI */}
      <SectionCard title="Materials science research → AI hardware" description="arXiv cond-mat (condensed matter) papers drive the next generation of AI hardware. Neuromorphic materials, 2D semiconductors, and quantum materials are the FY30+ frontier." icon={<TrendingUp className="h-5 w-5" />} badge="research">
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>The connection between materials science and AI is not metaphorical — it is causal. Every improvement in LLM capability traces back to a materials breakthrough:</p>
          <ul className="ml-4 space-y-1.5 text-xs">
            <li><strong className="text-foreground/80">EUV photoresist chemistry</strong> (2010s) → 7nm/5nm nodes → 2× transistor density → 2× FLOPS per GPU → 2× larger models trainable</li>
            <li><strong className="text-foreground/80">HBM3 memory materials</strong> (2020s) → 80GB on-package memory → larger batch sizes → more stable training → better convergence</li>
            <li><strong className="text-foreground/80">Neuromorphic materials</strong> (FY30+) → memristor crossbars → in-memory compute → 1000× lower power → edge LLMs</li>
            <li><strong className="text-foreground/80">2D semiconductors</strong> (MoS₂, WSe₂) → sub-1nm transistors → post-silicon scaling → continuation of Moore's law</li>
            <li><strong className="text-foreground/80">Quantum materials</strong> (topological insulators) → quantum error correction → fault-tolerant quantum computing → quantum ML</li>
          </ul>
          <p><strong className="text-foreground/80">The platform's floating button (FloatingLiveButton)</strong> fetches arXiv papers on each page. On this page, it surfaces cond-mat papers — the materials science research that will power the next generation of AI hardware. The data pipeline IS the materials research pipeline.</p>
        </div>
      </SectionCard>


      <DeeperThoughtSection pageTitle="Comp Sci Materials">
        <DeeperThought title="Materials science IS the multi-scale problem — and it's the right framing" connectedTo="ADR-034 (ESM-2 + AlphaFold2)">
          <p>{"Materials science spans 12 orders of magnitude: quantum (10^-11 m, DFT) → atomistic (10^-9 m, MD) → mesoscale (10^-6 m, phase field) → continuum (10^-3 m, FEM) → structural (1 m, engineering). Each scale needs a different equation: Schrödinger (quantum), Newton (MD), Cahn-Hilliard (phase field), Navier-Stokes (FEM). The platform's thesis applies: the SAME math (PDEs) appears at every scale — just with different parameters and dimensions."}</p>
        </DeeperThought>
        <DeeperThought title="DFT IS the quantum ground state — and it's the foundation of materials" connectedTo="ADR-034 (ESM-2 + AlphaFold2)">
          <p>{"Density Functional Theory (DFT) solves the Kohn-Sham equations: [-½∇² + V_eff]ψ = εψ. This IS a variant of the Schrödinger equation — the SAME equation that appears on the computational-chemistry page. DFT approximates the many-body electron problem with a single-particle effective potential. The math (eigenvalue problem for a PDE) IS the same as SVD (eigenvalue problem for a matrix). DFT IS SVD for quantum states."}</p>
        </DeeperThought>
        <DeeperThought title="Molecular dynamics at the materials scale IS Verlet — same as protein folding" connectedTo="ADR-051 (living-equation pages)">
          <p>{"Materials MD uses the SAME Verlet integrator as protein MD (AMBER/GROMACS). The difference: materials MD simulates 10^6-10^9 atoms (crystal lattice) vs protein MD's 10^4-10^5 atoms. The equation (F = ma, Verlet step) IS identical. The force field (EAM for metals vs AMBER for proteins) differs. The math (Verlet integration) IS the same — just different F(x). This IS the multi-disciplinary elegance: one integrator, two sciences."}</p>
        </DeeperThought>
        <DeeperThought title="Phase-field models ARE Cahn-Hilliard — and they're PDEs" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"Phase-field models use the Cahn-Hilliard equation: ∂c/∂t = ∇·(M∇(δF/δc)). This IS a fourth-order PDE — the SAME class as Navier-Stokes (second-order). The phase field c represents the concentration; the free energy F drives the evolution. The pattern (free energy minimization via PDE) IS the same as gradient descent (loss minimization via gradient). Phase-field IS gradient descent for materials science."}</p>
        </DeeperThought>
        <DeeperThought title="The Materials Project IS the open database — and it's the right model" connectedTo="ADR-022 (pgvector for variant embeddings)">
          <p>{"The Materials Project (Berkeley 2011) computed 150,000+ materials via DFT and made the results open. Researchers query the database (not run DFT) to find materials with desired properties. This IS the SAME pattern as UniProt (computed protein structures, open database) and gnomAD (genetic variants, open database). The pattern (compute once → store → query → discover) IS the pattern of modern computational science. The Materials Project IS UniProt for materials."}</p>
        </DeeperThought>
      </DeeperThoughtSection>
      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("transformer")} className="text-sm text-primary hover:underline">→ Transformer (attention = matmul + softmax)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("neural-networks")} className="text-sm text-primary hover:underline">→ Neural Networks (the algorithms on top of the hardware)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">→ ADR-025 (agentic roadmap)</Link>
      </div>
    </div>
  );
}
