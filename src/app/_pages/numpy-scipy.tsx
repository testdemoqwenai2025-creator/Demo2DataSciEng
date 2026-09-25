"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import {
  Cpu, Database, Boxes, Activity, Sparkles, History, Atom,
  FileText, TrendingUp, Server, Brain, Zap, Network, Layers,
} from "lucide-react";

const KPIS = [
  { label: "Origin", value: "NumPy 2005 (Travis Oliphant)", hint: "NumPy merged Numeric + NumArray; SciPy started 2001. The foundation of Python scientific computing — every ML/data framework builds on NumPy arrays.", deltaTone: "flat" as const },
  { label: "BLAS/LAPACK", value: "OpenBLAS / MKL backend", hint: "NumPy delegates matrix ops to BLAS (Level 1-3) + LAPACK (SVD, eigenvalues, QR, LU). Backend swappable: OpenBLAS, Intel MKL, Apple Accelerate.", deltaTone: "up" as const },
  { label: "N-D arrays", value: "Arbitrary dimensions", hint: "ndarray supports 0-D to N-D. Broadcasting (m,1)+(1,n)→(m,n). C-order (row-major) vs Fortran-order (column-major) via strides.", deltaTone: "flat" as const },
  { label: "Ecosystem", value: "100+ dependent packages", hint: "SciPy, scikit-learn, matplotlib, pandas, TensorFlow, PyTorch, JAX — all build on the NumPy ndarray.", deltaTone: "up" as const },
];

// ============================================================
// N-D array visualization SVG (custom-designed)
// ============================================================

function NDArrayDiagram() {
  const [dim, setDim] = useState(3);
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60 flex items-center justify-between">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          N-D array — from 1D to 5D (click dimension)
        </p>
        <div className="flex gap-1">
          {[1,2,3,4,5].map(d => (
            <button key={d} onClick={() => setDim(d)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${dim === d ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground"}`}>
              {d}D
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 flex justify-center">
        <svg viewBox="0 0 400 220" className="w-full h-auto">
          {dim === 1 && (
            <g>
              {Array.from({length:8}).map((_,i) => (
                <rect key={i} x={50+i*38} y={80} width="34" height="34" rx="2"
                  fill={`oklch(0.65 0.16 ${i*30})30`} stroke={`oklch(0.65 0.16 ${i*30})`} strokeWidth="1" />
              ))}
              <text x="200" y="140" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">shape: (8,) · 1D = vector</text>
              <text x="200" y="155" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">stride: (4 bytes,) · C-order contiguous</text>
            </g>
          )}
          {dim === 2 && (
            <g>
              {Array.from({length:4}).map((_,i) =>
                Array.from({length:6}).map((_,j) => (
                  <rect key={`${i}-${j}`} x={80+j*36} y={60+i*30} width="32" height="26" rx="2"
                    fill={`oklch(0.65 0.16 ${(i*60+j*30)%360})20`}
                    stroke={`oklch(0.65 0.16 ${(i*60+j*30)%360})`} strokeWidth="0.8" />
                ))
              )}
              <text x="200" y="190" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">shape: (4, 6) · 2D = matrix</text>
              <text x="200" y="205" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">strides: (144, 24) bytes · row-major (C-order)</text>
            </g>
          )}
          {dim === 3 && (
            <g>
              {Array.from({length:3}).map((_,k) =>
                Array.from({length:3}).map((_,i) =>
                  Array.from({length:3}).map((_,j) => (
                    <rect key={`${k}-${i}-${j}`} x={90+j*28-k*8} y={50+i*24-k*6} width="24" height="20" rx="1"
                      fill={`oklch(0.65 0.16 ${(k*120+i*40)%360})${k===0?'30':'15'}`}
                      stroke={`oklch(0.65 0.16 ${(k*120+i*40)%360})`} strokeWidth="0.6" opacity={k===0?1:0.6} />
                  ))
                )
              )}
              <text x="200" y="190" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">shape: (3, 3, 3) · 3D = tensor</text>
              <text x="200" y="205" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">e.g. genes × samples × conditions</text>
            </g>
          )}
          {dim === 4 && (
            <g>
              {Array.from({length:2}).map((_,l) =>
                Array.from({length:2}).map((_,k) =>
                  Array.from({length:2}).map((_,i) =>
                    Array.from({length:2}).map((_,j) => (
                      <rect key={`${l}-${k}-${i}-${j}`} x={100+j*28-k*8+l*60} y={50+i*24-k*6} width="24" height="20" rx="1"
                        fill={`oklch(0.65 0.16 ${(l*180+k*90+i*45)%360})${l===0?'30':'15'}`}
                        stroke={`oklch(0.65 0.16 ${(l*180+k*90+i*45)%360})`} strokeWidth="0.6" opacity={l===0?1:0.5} />
                    ))
                  )
                )
              )}
              <text x="200" y="170" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">shape: (2, 2, 2, 2) · 4D</text>
              <text x="200" y="185" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">genes × samples × conditions × timepoints</text>
              <text x="200" y="200" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">2 nested 3D cubes → 4th dimension</text>
            </g>
          )}
          {dim === 5 && (
            <g>
              <text x="200" y="80" textAnchor="middle" fontSize="11" fill="var(--primary)" fontWeight="bold">
                shape: (d₁, d₂, d₃, d₄, d₅)
              </text>
              <text x="200" y="100" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">
                5D = nested 4D hypercubes
              </text>
              <text x="200" y="120" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">
                genes × samples × conditions × timepoints × replicates
              </text>
              {Array.from({length:2}).map((_,m) =>
                Array.from({length:2}).map((_,l) =>
                  Array.from({length:2}).map((_,k) => (
                    <rect key={`${m}-${l}-${k}`} x={120+k*28-l*8+m*70} y={135+k*18-l*4} width="20" height="16" rx="1"
                      fill={`oklch(0.65 0.16 ${(m*200+l*100+k*50)%360})${m===0?'30':'15'}`}
                      stroke={`oklch(0.65 0.16 ${(m*200+l*100+k*50)%360})`} strokeWidth="0.5" opacity={m===0?1:0.4} />
                  ))
                )
              )}
              <text x="200" y="200" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">N-D: shape (d₁,...,dₙ) · strides (s₁,...,sₙ) · C-order contiguous</text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

// ============================================================
// BLAS/LAPACK hierarchy SVG (custom-designed)
// ============================================================

function BLASHierarchyDiagram() {
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5 text-primary" />
          BLAS/LAPACK hierarchy — Level 1 → 2 → 3 (custom SVG)
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 400 180" className="w-full h-auto">
          {/* Level 3 */}
          <rect x="140" y="20" width="120" height="30" rx="4" fill="oklch(0.65 0.16 165)20" stroke="oklch(0.65 0.16 165)" strokeWidth="1.5" />
          <text x="200" y="38" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 165)" fontWeight="bold">Level 3: GEMM (matrix × matrix)</text>
          <text x="200" y="46" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 165)">O(n³) · 90% of ML compute · GPU-optimised</text>

          {/* Level 2 */}
          <rect x="80" y="70" width="120" height="30" rx="4" fill="oklch(0.65 0.16 60)20" stroke="oklch(0.65 0.16 60)" strokeWidth="1.5" />
          <text x="140" y="88" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 60)" fontWeight="bold">Level 2: GEMV (matrix × vector)</text>
          <text x="140" y="96" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 60)">O(n²) · used in neural network forward pass</text>

          <rect x="220" y="70" width="120" height="30" rx="4" fill="oklch(0.65 0.16 60)20" stroke="oklch(0.65 0.16 60)" strokeWidth="1.5" />
          <text x="280" y="88" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 60)" fontWeight="bold">LAPACK: SVD, QR, eigenvalues</text>
          <text x="280" y="96" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 60)">builds on Level 3 GEMM</text>

          {/* Level 1 */}
          <rect x="140" y="120" width="120" height="30" rx="4" fill="oklch(0.65 0.16 30)20" stroke="oklch(0.65 0.16 30)" strokeWidth="1.5" />
          <text x="200" y="138" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 30)" fontWeight="bold">Level 1: AXPY (vector × scalar)</text>
          <text x="200" y="146" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 30)">O(n) · y = αx + y · element-wise ops</text>

          {/* Arrows */}
          <line x1="200" y1="50" x2="200" y2="70" stroke="var(--border)" strokeWidth="0.8" markerEnd="url(#blas-arrow)" />
          <line x1="200" y1="100" x2="200" y2="120" stroke="var(--border)" strokeWidth="0.8" markerEnd="url(#blas-arrow)" />
          <line x1="200" y1="50" x2="280" y2="70" stroke="var(--border)" strokeWidth="0.8" markerEnd="url(#blas-arrow)" />
          <text x="240" y="62" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">uses</text>
          <text x="220" y="115" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">uses</text>

          <defs>
            <marker id="blas-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" />
            </marker>
          </defs>
        </svg>
      </div>
    </div>
  );
}

// ============================================================
// Wet lab → marketplace pipeline SVG (custom-designed)
// ============================================================

function WetLabPipelineDiagram() {
  const stages = [
    { x: 30, label: "Wet Lab", desc: "Sequencer/Mass spec/Microscope", color: "oklch(0.65 0.16 30)" },
    { x: 130, label: "NumPy/SciPy", desc: "N-D arrays + FFT + SVD", color: "oklch(0.65 0.16 165)" },
    { x: 230, label: "Publication", desc: "matplotlib + Jupyter + paper", color: "oklch(0.65 0.16 250)" },
    { x: 330, label: "Marketplace", desc: "23andMe / Recursion / Insitro", color: "oklch(0.65 0.16 320)" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          Scientific pipeline: wet lab → NumPy/SciPy → publication → marketplace (custom SVG)
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 420 120" className="w-full h-auto">
          {stages.map((s, i) => (
            <motion.g key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.2 }}
            >
              <rect x={s.x} y="30" width="80" height="40" rx="6"
                fill={s.color + "20"} stroke={s.color} strokeWidth="1.5" />
              <text x={s.x + 40} y="48" textAnchor="middle" fontSize="8" fill={s.color} fontWeight="bold">{s.label}</text>
              <text x={s.x + 40} y="60" textAnchor="middle" fontSize="6" fill="var(--muted-foreground)">{s.desc}</text>
              {i < stages.length - 1 && (
                <line x1={s.x + 82} y1="50" x2={stages[i+1].x - 2} y2="50"
                  stroke="var(--border)" strokeWidth="1.5" markerEnd="url(#pipeline-arrow)" />
              )}
            </motion.g>
          ))}
          <text x="210" y="100" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">
            Data generated in wet lab → processed by NumPy/SciPy → published as paper + IP → commercialised as startup
          </text>
          <defs>
            <marker id="pipeline-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" />
            </marker>
          </defs>
        </svg>
      </div>
    </div>
  );
}

// ============================================================
// Math Pyodide demo — SVD, FFT, N-D broadcasting
// ============================================================

const MATH_DEMO = `# ============================================================
# NumPy/SciPy foundations — pure Python (Pyodide, no numpy)
# Implementations: SVD via power iteration, FFT via DFT, N-D broadcasting
# ============================================================

import math
import random

# --- 1. SVD via power iteration (simplified) ---
# A = U Σ V^T
# Power iteration: find largest singular value
# v_{k+1} = A^T A v_k / ||A^T A v_k||

def power_iteration_svd(A, n_rows, n_cols, n_iters=50):
    """Find the largest singular value + vectors via power iteration."""
    # A^T A
    def matmul_ATA(A, n_rows, n_cols):
        result = [[0.0]*n_cols for _ in range(n_cols)]
        for i in range(n_cols):
            for j in range(n_cols):
                for k in range(n_rows):
                    result[i][j] += A[k][i] * A[k][j]
        return result

    def matvec(M, v, n):
        return [sum(M[i][j] * v[j] for j in range(n)) for i in range(n)]

    def norm(v):
        return math.sqrt(sum(x*x for x in v))

    ATA = matmul_ATA(A, n_rows, n_cols)
    v = [random.gauss(0, 1) for _ in range(n_cols)]
    v_norm = norm(v)
    v = [x / v_norm for x in v]

    for _ in range(n_iters):
        Av = matvec(ATA, v, n_cols)
        n = norm(Av)
        if n < 1e-10: break
        v = [x / n for x in Av]

    # Singular value = ||A v||
    Av = [sum(A[k][i] * v[i] for i in range(n_cols)) for k in range(n_rows)]
    sigma = norm(Av)
    u = [x / sigma for x in Av] if sigma > 0 else [0]*n_rows

    return sigma, u, v

random.seed(42)
A = [[random.gauss(0, 1) for _ in range(4)] for _ in range(6)]
sigma, u, v = power_iteration_svd(A, 6, 4)

print("=== SVD via Power Iteration ===")
print(f"  Matrix A: 6x4 (synthetic genomics: 6 genes x 4 samples)")
print(f"  Largest singular value: sigma_1 = {sigma:.4f}")
print(f"  Left singular vector u (6-dim): [{', '.join(f'{x:.3f}' for x in u)}]")
print(f"  Right singular vector v (4-dim): [{', '.join(f'{x:.3f}' for x in v)}]")
print(f"  A = u * sigma * v^T (rank-1 approximation)")
print()

# --- 2. FFT via direct DFT (O(N^2) — shows the principle) ---
# X[k] = sum_{n=0}^{N-1} x[n] * exp(-2*pi*i*k*n/N)
# Cooley-Tukey FFT: O(N log N) via even/odd split

def dft(x):
    """Direct DFT — O(N^2). Shows the principle."""
    N = len(x)
    X_real = [0.0]*N
    X_imag = [0.0]*N
    for k in range(N):
        for n in range(N):
            angle = -2 * math.pi * k * n / N
            X_real[k] += x[n] * math.cos(angle)
            X_imag[k] += x[n] * math.sin(angle)
    return X_real, X_imag

# Synthetic signal: 3 Hz sine + 7 Hz sine + noise
N = 64
signal = [math.sin(2*math.pi*3*n/N) + 0.5*math.sin(2*math.pi*7*n/N) + random.gauss(0, 0.2) for n in range(N)]
X_real, X_imag = dft(signal)
magnitudes = [math.sqrt(X_real[k]**2 + X_imag[k]**2) for k in range(N)]

print("=== FFT (Direct DFT — shows the principle) ===")
print(f"  Signal: {N} samples, 3Hz + 7Hz + noise")
print(f"  DFT: O(N^2) = {N*N} operations")
print(f"  FFT: O(N log N) = {N * int(math.log2(N))} operations (Cooley-Tukey)")
print()
print("  Frequency spectrum (top 5 peaks):")
peaks = sorted(range(N), key=lambda k: -magnitudes[k])[:5]
for k in peaks:
    freq = k if k <= N//2 else k - N
    print(f"    f={freq:>3} Hz: |X[{k}]| = {magnitudes[k]:.2f} {'<-- signal' if abs(freq) in [3,7] else ''}")
print()

# --- 3. N-D broadcasting (pure Python) ---
# (m, 1) + (1, n) → (m, n) via replication
# This is how NumPy avoids explicit loops

def broadcast_add(a_2d, b_2d):
    """Broadcast add: (m,1) + (1,n) → (m,n)."""
    m = len(a_2d)
    n = len(b_2d[0])
    result = [[0.0]*n for _ in range(m)]
    for i in range(m):
        for j in range(n):
            result[i][j] = a_2d[i][0] + b_2d[0][j]
    return result

# 3D gene expression: (4 genes, 1) + (1, 3 conditions) → (4, 3)
genes = [[10.0], [20.0], [15.0], [8.0]]  # expression per gene
conditions = [[1.0, 2.0, 3.0]]  # condition multiplier
result = broadcast_add(genes, conditions)

print("=== N-D Broadcasting ===")
print("  Shape (4, 1) + (1, 3) → (4, 3) via replication:")
print(f"  Genes ×  Conditions = Result:")
for i in range(4):
    row_str = "  ".join(f"{result[i][j]:6.1f}" for j in range(3))
    print(f"    Gene {i+1}:  {row_str}")
print()
print("  In NumPy: a[:, np.newaxis] + b[np.newaxis, :] → (m, n)")
print("  No loops — broadcasting handles replication in C (BLAS-level speed)")
print()
print("  N-D generalization: shape (d1,...,dn) + (1,...,1,dn) → (d1,...,dn)")
print("  NumPy broadcasts from right-to-left, matching dimensions or 1.")`;

// ============================================================
// Code constants
// ============================================================

const NUMPY_ND_CODE = `# ============================================================
# NumPy N-D arrays — 3D to 5D (genes × samples × conditions × time × replicates)
# ============================================================

import numpy as np

# --- 3D: gene expression tensor ---
# shape: (genes, samples, conditions) = (100, 50, 3)
expr_3d = np.random.randn(100, 50, 3)  # 100 genes, 50 samples, 3 conditions
print(f"3D shape: {expr_3d.shape}")  # (100, 50, 3)
print(f"3D strides: {expr_3d.strides}")  # (1200, 24, 8) bytes
print(f"3D memory: {expr_3d.nbytes / 1024:.1f} KB")  # 117.2 KB

# --- 4D: add timepoints ---
# shape: (genes, samples, conditions, timepoints) = (100, 50, 3, 10)
expr_4d = np.random.randn(100, 50, 3, 10)
print(f"4D shape: {expr_4d.shape}")  # (100, 50, 3, 10)
print(f"4D strides: {expr_4d.strides}")  # (12000, 240, 80, 8)

# --- 5D: add replicates ---
# shape: (genes, samples, conditions, timepoints, replicates) = (100, 50, 3, 10, 3)
expr_5d = np.random.randn(100, 50, 3, 10, 3)
print(f"5D shape: {expr_5d.shape}")  # (100, 50, 3, 10, 3)
print(f"5D memory: {expr_5d.nbytes / 1e6:.1f} MB")  # 3.5 MB

# --- N-D: broadcasting across dimensions ---
# (genes, 1, conditions, 1, 1) + (1, samples, 1, timepoints, replicates)
baseline = np.random.randn(100, 1, 3, 1, 1)  # gene × condition baseline
variation = np.random.randn(1, 50, 1, 10, 3)  # sample × time × replicate variation
result = baseline + variation  # broadcasts to (100, 50, 3, 10, 3)
print(f"N-D broadcast result: {result.shape}")  # (100, 50, 3, 10, 3)

# --- SVD on 2D slice (PCA for genomics) ---
expr_2d = expr_3d[:, :, 0]  # slice to 2D: (100 genes, 50 samples)
U, S, Vt = np.linalg.svd(expr_2d, full_matrices=False)
print(f"\\nSVD: U={U.shape}, S={S.shape}, Vt={Vt.shape}")
print(f"Top 5 singular values: {S[:5]}")
print(f"Variance explained: {np.cumsum(S**2) / np.sum(S**2) * 100}")

# --- FFT on 1D spectral data ---
spectrum = np.random.randn(1024) + 2 * np.sin(np.linspace(0, 20*np.pi, 1024))
X = np.fft.fft(spectrum)
freqs = np.fft.fftfreq(1024)
peak_freq = freqs[np.argmax(np.abs(X))]
print(f"\\nFFT peak frequency: {peak_freq:.4f} Hz")`;

const SCIPY_SPARSE_CODE = `# ============================================================
# SciPy sparse matrices — CSR, CSC, COO formats
# Genomics example: gene × sample matrix is 95% zeros
# ============================================================

import numpy as np
from scipy import sparse

# Dense gene expression matrix: 10000 genes × 5000 samples
dense = np.random.randn(10000, 5000)
# Sparsify: 95% of values are 0 (common in single-cell genomics)
mask = np.random.random((10000, 5000)) > 0.95
dense[~mask] = 0.0

# Convert to sparse (CSR format)
csr = sparse.csr_matrix(dense)
print(f"Dense size: {dense.nbytes / 1e6:.1f} MB")  # 400.0 MB
print(f"CSR size: {csr.data.nbytes / 1e6:.1f} MB")  # ~20 MB (5% of dense)
print(f"Sparsity: {1 - csr.nnz / (10000 * 5000):.1%}")  # 95.0%
print(f"NNZ (non-zeros): {csr.nnz}")  # ~2.5M

# Sparse matrix operations (O(nnz) not O(n^2))
# Sparse matrix-vector multiply
v = np.random.randn(5000)
result_csr = csr @ v  # O(nnz) — 100x faster than dense @ v
print(f"\\nCSR × vector: {result_csr.shape}, O(nnz) = {csr.nnz} ops")

# Sparse eigenvalue decomposition (ARPACK)
eigenvalues, eigenvectors = sparse.linalg.eigsh(csr, k=10)
print(f"Top 10 eigenvalues: {eigenvalues[:5]}...")

# Sparse SVD (for PCA on sparse data)
U, S, Vt = sparse.linalg.svds(csr, k=5)
print(f"\\nSparse SVD: U={U.shape}, S={S.shape}, Vt={Vt.shape}")
print(f"Top 5 singular values: {S}")

# COO format (coordinate list — good for construction)
rows = np.array([0, 1, 2, 3, 4])
cols = np.array([0, 1, 2, 3, 4])
vals = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
coo = sparse.coo_matrix((vals, (rows, cols)), shape=(5, 5))
print(f"\\nCOO: {coo.nnz} non-zeros, {coo.data}")`;

const BLAS_LAPACK_CODE = `# ============================================================
# BLAS/LAPACK — what NumPy delegates to under the hood
# ============================================================

import numpy as np

# --- BLAS Level 1: AXPY (y = alpha * x + y), O(n) ---
x = np.random.randn(1000)
y = np.random.randn(1000)
np.add(2.0 * x, y, out=y)  # BLAS AXPY

# --- BLAS Level 2: GEMV (matrix × vector), O(n^2) ---
A = np.random.randn(100, 1000)
v = np.random.randn(1000)
result = A @ v  # BLAS GEMV

# --- BLAS Level 3: GEMM (matrix × matrix), O(n^3) ---
B = np.random.randn(1000, 500)
C = A @ B  # BLAS GEMM — 90% of ML compute

# --- LAPACK: SVD (A = U Σ V^T) ---
U, S, Vt = np.linalg.svd(A, full_matrices=False)
print(f"SVD: singular values = {S[:5]}")

# --- LAPACK: Eigenvalues (Av = λv) ---
eigenvalues = np.linalg.eigvals(A @ A.T)
print(f"Eigenvalues: {eigenvalues[:5]}")

# --- LAPACK: QR decomposition (A = QR) ---
Q, R = np.linalg.qr(A)
print(f"QR: Q={Q.shape}, R={R.shape}")

# --- LAPACK: LU decomposition (A = LU) ---
import scipy.linalg
P, L, U_lu = scipy.linalg.lu(A)
print(f"LU: L={L.shape}, U={U_lu.shape}")

# --- LAPACK: Cholesky (A = LL^T, for PSD matrices) ---
A_psd = A @ A.T + np.eye(100) * 0.01  # positive semi-definite
L_chol = np.linalg.cholesky(A_psd)
print(f"Cholesky: L={L_chol.shape}")`;

// ============================================================
// Main page
// ============================================================

export function NumpyScipyPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="NumPy/SciPy · BLAS · LAPACK · FFT · sparse · N-D arrays · 3D-to-N-D · wet lab → marketplace"
        title="NumPy/SciPy — the computational foundation of modern science"
        description="NumPy (2005, Travis Oliphant) merged Numeric + NumArray into the ndarray — the N-dimensional array that underpins every Python scientific package: SciPy, scikit-learn, matplotlib, pandas, TensorFlow, PyTorch, JAX. This page covers the mathematical foundations (BLAS Level 1-3, LAPACK SVD/eigenvalues/QR/LU, FFT Cooley-Tukey, sparse matrices CSR/CSC/COO, N-D broadcasting), custom-designed SVG diagrams (N-D array 1D→5D, BLAS hierarchy, wet-lab-to-marketplace pipeline), 3D-to-N-D examples (gene expression tensors: genes×samples×conditions×time×replicates), Pyodide demos (SVD via power iteration, FFT via DFT, broadcasting), and the full scientific narrative from wet lab data generation through NumPy processing to publication and marketplace commercialisation (23andMe, Recursion Pharma, Insitro)."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Cpu className="h-3 w-3" /> BLAS/LAPACK</Badge>
            <Badge variant="outline" className="gap-1.5"><Boxes className="h-3 w-3" /> N-D arrays</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* Mathematical foundations */}
      <SectionCard
        title="Mathematical foundations — BLAS, LAPACK, FFT, sparse, N-D broadcasting"
        description="The mathematical foundations that NumPy/SciPy implement. Understanding these equations is essential for interpreting why NumPy operations are fast (BLAS) and how N-D arrays work (strides + broadcasting)."
        icon={<Brain className="h-5 w-5" />}
        badge="mathematics"
      >
        <div className="space-y-4">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm font-semibold text-primary mb-2">1. Matrix Multiply (BLAS Level 3 GEMM)</p>
            <p className="font-mono text-xs text-primary mb-2">
              C[i,j] = Σ_k A[i,k] × B[k,j] · complexity O(n³) · Strassen O(n^2.807)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              GEMM (GEneral Matrix Multiply) is the workhorse of all linear algebra — 90% of ML compute is GEMM.
              NumPy delegates <code className="font-mono">A @ B</code> to BLAS Level 3, which is implemented in
              OpenBLAS/Intel MKL as hand-tuned assembly with SIMD (SSE/AVX) + cache blocking.
              Strassen&apos;s algorithm reduces O(n³) to O(n^2.807) via recursive block decomposition, but
              has higher constants — only faster for n &gt; 1000. GPU implementations (cuBLAS) reach
              100+ TFLOPS via thousands of parallel SMs.
            </p>
          </div>
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">2. SVD (LAPACK dgesvd): A = UΣV^T</p>
            <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 mb-2">
              A = U Σ V^T · where σ₁ ≥ σ₂ ≥ ... ≥ σ_r ≥ 0 · rank(A) = r
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              SVD decomposes any matrix into rotation × scaling × rotation. The singular values σᵢ measure
              the &quot;energy&quot; along each principal axis. In genomics, SVD on gene×sample matrices
              gives PCA — the top singular vectors capture population structure, batch effects, cell types.
              LAPACK implements SVD via divide-and-conquer (<code className="font-mono">dgesdd</code>) or
              QR iteration (<code className="font-mono">dgesvd</code>), both O(n²·min(m,n)).
              <code className="font-mono"> np.linalg.svd</code> delegates to LAPACK automatically.
            </p>
          </div>
          <div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-3">
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">3. FFT (Cooley-Tukey): O(N log N) vs DFT O(N²)</p>
            <p className="font-mono text-xs text-violet-600 dark:text-violet-400 mb-2">
              X[k] = Σ x[n] × e^(-2πi×k×n/N) · Cooley-Tukey: split even/odd → O(N log N)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The Discrete Fourier Transform (DFT) is O(N²) — too slow for N=10⁶.
              The Cooley-Tukey FFT (1965) splits the signal into even and odd samples, recursively computes
              half-size DFTs, and combines them — reducing to O(N log N).
              For N=1024: DFT = 1,048,576 ops; FFT = 10,240 ops — 100× speedup.
              NumPy uses <code className="font-mono">pocketfft</code> (C library) for <code className="font-mono">np.fft.fft</code>.
              Applications: mass spectrometry peak detection, NMR spectroscopy, cryo-EM 3D reconstruction
              (FFT-based projection-slice theorem), MRI reconstruction (FFT of k-space).
            </p>
          </div>
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">4. Sparse Matrices (CSR format): O(nnz) vs O(n²)</p>
            <p className="font-mono text-xs text-amber-600 dark:text-amber-400 mb-2">
              CSR: 3 arrays (data, indices, indptr) · storage O(nnz) · matvec O(nnz) not O(n²)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              In single-cell genomics, the gene×cell matrix is 95% zeros (most genes are not expressed in most cells).
              Dense storage: 10,000 genes × 50,000 cells × 8 bytes = 4 GB. CSR storage: 5% × 4 GB = 200 MB — 20× reduction.
              Sparse matrix-vector multiply is O(nnz) — 20× faster than dense.
              <code className="font-mono"> scipy.sparse.csr_matrix</code> implements CSR;
              <code className="font-mono"> scipy.sparse.linalg</code> provides sparse eigenvalues (ARPACK) and sparse SVD.
            </p>
          </div>
          <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3">
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-2">5. N-D Broadcasting: (m,1) + (1,n) → (m,n)</p>
            <p className="font-mono text-xs text-rose-600 dark:text-rose-400 mb-2">
              Broadcasting: right-to-left dimension matching · dim must match OR be 1 · result = max(a_dim, b_dim)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              NumPy broadcasting avoids explicit loops by replicating dimensions of size 1.
              <code className="font-mono"> a.shape=(100,1,3,1,1) + b.shape=(1,50,1,10,3) → result.shape=(100,50,3,10,3)</code>.
              This is how NumPy adds a gene baseline (shape (genes,1,1)) to a sample-specific variation
              (shape (1,samples,timepoints)) — one line of code, no loops, runs at BLAS speed.
              Generalization: N-D broadcasting works for any N — shapes (d₁,...,dₙ) and (e₁,...,eₙ) broadcast if
              dᵢ == eᵢ or dᵢ == 1 or eᵢ == 1 for all i (right-to-left).
            </p>
          </div>
        </div>
      </SectionCard>

      {/* N-D array visualization */}
      <SectionCard
        title="N-D arrays — from 1D to 5D (custom SVG, click to interact)"
        description="NumPy's ndarray supports arbitrary dimensions. Click 1D through 5D to see the visualisation change. 1D = vector (signal), 2D = matrix (image/table), 3D = tensor (gene×sample×condition), 4D = video/time-series, 5D = multi-replicate time-series. All stored as contiguous memory with strides."
        icon={<Boxes className="h-5 w-5" />}
        badge="interactive"
      >
        <NDArrayDiagram />
      </SectionCard>

      {/* BLAS/LAPACK hierarchy */}
      <SectionCard
        title="BLAS/LAPACK hierarchy — what NumPy delegates to (custom SVG)"
        description="NumPy doesn't implement linear algebra from scratch — it delegates to BLAS (Basic Linear Algebra Subprograms) and LAPACK (Linear Algebra PACKage). BLAS has 3 levels: Level 1 (vector ops, O(n)), Level 2 (matrix×vector, O(n²)), Level 3 (matrix×matrix, O(n³)). LAPACK (SVD, eigenvalues, QR, LU, Cholesky) is built on top of BLAS Level 3."
        icon={<Cpu className="h-5 w-5" />}
        badge="architecture"
      >
        <BLASHierarchyDiagram />
      </SectionCard>

      {/* N-D code */}
      <SectionCard
        title="N-D arrays — 3D to 5D gene expression tensors"
        description="Real genomics data is N-dimensional: 3D (genes×samples×conditions), 4D (+timepoints), 5D (+replicates). NumPy handles all of these natively with strides (memory layout) and broadcasting (no loops)."
        icon={<Boxes className="h-5 w-5" />}
        badge="Python"
      >
        <CodeBlock code={NUMPY_ND_CODE} language="python" filename="numpy_nd_arrays.py" highlight={[10,11,12,16,17,18,22,23,24,28,29,30,33,34,35]} />
      </SectionCard>

      {/* Sparse code */}
      <SectionCard
        title="SciPy sparse matrices — CSR/CSC/COO for 95% sparse genomics data"
        description="Single-cell genomics produces matrices that are 95%+ zeros. Dense storage wastes 95% of memory. SciPy sparse (CSR/CSC/COO) stores only non-zeros — 20× memory reduction and 20× faster matrix-vector multiply."
        icon={<Database className="h-5 w-5" />}
        badge="SciPy"
      >
        <CodeBlock code={SCIPY_SPARSE_CODE} language="python" filename="scipy_sparse.py" highlight={[12,13,14,15,16,17,22,23,26,27,28,33,34,35]} />
      </SectionCard>

      {/* BLAS/LAPACK code */}
      <SectionCard
        title="BLAS/LAPACK — what NumPy delegates to under the hood"
        description="NumPy operations map directly to BLAS/LAPACK routines. Understanding this mapping explains why NumPy is fast: it calls hand-tuned assembly (OpenBLAS/Intel MKL) with SIMD (SSE/AVX) + cache blocking, not naive Python loops."
        icon={<Cpu className="h-5 w-5" />}
        badge="BLAS/LAPACK"
      >
        <CodeBlock code={BLAS_LAPACK_CODE} language="python" filename="blas_lapack.py" highlight={[7,8,12,13,17,18,22,23,27,28,32,33,37,38,42,43]} />
      </SectionCard>

      {/* Math Pyodide demo */}
      <SectionCard
        title="Try it: SVD + FFT + N-D broadcasting (Pyodide, pure Python)"
        description="Pure-Python implementations (no numpy import) of the 3 core NumPy/SciPy operations: SVD via power iteration (finds largest singular value), DFT (shows the O(N²) principle that FFT optimizes to O(N log N)), and N-D broadcasting ((m,1)+(1,n)→(m,n) via replication)."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={MATH_DEMO} buttonLabel="Run SVD + FFT + broadcasting (Pyodide)" />
      </SectionCard>

      {/* Comparison table */}
      <SectionCard
        title="NumPy vs MATLAB vs R vs Julia — scientific computing languages"
        description="Four scientific computing ecosystems compared. NumPy won the adoption battle because Python is free, general-purpose, and has the best ML ecosystem. MATLAB is expensive but has the best linear algebra toolbox. R dominates statistics. Julia is fastest but has the smallest ecosystem."
        icon={<Boxes className="h-5 w-5" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30">
              <tr className="border-b border-border/60">
                <th className="text-left px-3 py-2 font-semibold">Feature</th>
                <th className="text-left px-3 py-2 font-semibold text-primary">NumPy/SciPy</th>
                <th className="text-left px-3 py-2 font-semibold">MATLAB</th>
                <th className="text-left px-3 py-2 font-semibold">R</th>
                <th className="text-left px-3 py-2 font-semibold">Julia</th>
              </tr>
            </thead>
            <tbody>
              {[
                { f: "Origin", np: "NumPy 2005 (Python)", ml: "MathWorks 1984", r: "Ross Ihaka 1993", j: "MIT 2012" },
                { f: "Cost", np: "Free (open-source)", ml: "USD 2,700+ per seat", r: "Free (open-source)", j: "Free (open-source)" },
                { f: "N-D arrays", np: "Arbitrary (0-D to N-D)", ml: "Arbitrary", r: "Limited (array package)", j: "Arbitrary" },
                { f: "Speed", np: "BLAS-backed (C)", ml: "BLAS-backed (JIT)", r: "Vectorised C", j: "JIT-compiled (LLVM)" },
                { f: "Ecosystem", np: "100+ packages (ML, DL, viz)", ml: "Toolboxes (expensive)", r: "15k+ CRAN packages", j: "4k+ packages" },
                { f: "ML adoption", np: "Dominant (TF, PyTorch, JAX)", ml: "Minimal", r: "Strong (caret, mlr)", j: "Growing (Flux.jl)" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{row.f}</td>
                  <td className="px-3 py-2 text-primary/80">{row.np}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.ml}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.r}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.j}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Wet lab to marketplace pipeline */}
      <SectionCard
        title="Scientific pipeline — wet lab → NumPy/SciPy → publication → marketplace"
        description="NumPy/SciPy are the computational bridge between wet-lab data generation and commercial marketplace outcomes. The Illumina sequencer generates FASTQ files → NumPy processes quality scores → SciPy FFT for mass spec → matplotlib figures for publication → IP → startup. 23andMe (genomics), Recursion Pharma (microscopy ML), Insitro (drug discovery), DeepMind (AlphaFold) all built on NumPy."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="pipeline"
      >
        <WetLabPipelineDiagram />
        <div className="mt-4 space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Wet Lab:</strong> The Illumina NovaSeq sequencer generates ~6 TB of FASTQ data per run. Each base call has a quality score (Phred Q) stored as integers. NumPy arrays process these quality scores (per-channel statistics, quality distribution, adapter trimming) at BLAS speed — millions of reads per second.
          </p>
          <p>
            <strong className="text-foreground/80">Mass Spectrometry:</strong> Orbitrap mass spec generates spectral data as (m/z, intensity) pairs. SciPy FFT converts time-domain signals to frequency domain, enabling peak detection (compound identification). N-D arrays handle (m/z × intensity × time × replicate) data for quantitative proteomics.
          </p>
          <p>
            <strong className="text-foreground/80">Microscopy:</strong> Cryo-EM generates 3D density maps as N-D arrays (x × y × z × angle). NumPy handles the N-D FFT for 3D reconstruction (projection-slice theorem). 4D data (x × y × z × time) for live-cell imaging. 5D (x × y × z × time × channel) for multi-colour fluorescence.
          </p>
          <p>
            <strong className="text-foreground/80">Publication:</strong> matplotlib generates publication-quality figures from NumPy arrays. Jupyter notebooks provide reproducible analysis (pip freeze + random seeds). The paper includes the notebook URL — reviewers can rerun every figure.
          </p>
          <p>
            <strong className="text-foreground/80">Marketplace:</strong> <strong>23andMe</strong> processes millions of genotyping arrays with NumPy (PCA for ancestry, GWAS for trait associations). <strong>Recursion Pharma</strong> uses NumPy for high-content microscopy ML (cell phenotype classification). <strong>Insitro</strong> uses SciPy for drug discovery (molecular dynamics + ML). <strong>DeepMind</strong> built AlphaFold on NumPy arrays (MSA embeddings, attention matrices, structure tensors). Every biotech startup starts with <code className="font-mono">import numpy as np</code>.
          </p>
        </div>
      </SectionCard>

      {/* Why evolved */}
      <SectionCard
        title="Why NumPy evolved — shortfalls of Python lists for science"
        description="Before NumPy, scientific computing in Python used native lists — which were 100x slower than compiled C/Fortran for numerical operations. NumPy fixed this by wrapping BLAS/LAPACK in a Python-friendly ndarray."
        icon={<History className="h-5 w-5" />}
        badge="Why NumPy"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: Python lists are 100x slower than C.</strong> A Python list of 1M floats takes ~8ms per element-wise multiply (each element is a boxed Python object). NumPy ndarray does the same in ~0.1ms (contiguous C array + SIMD + BLAS). This 100x speedup is why NumPy exists.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: No N-D arrays.</strong> Python lists are 1D — multi-dimensional data required nested lists (slow, non-contiguous). NumPy ndarray supports 0-D to N-D with strides (memory layout) and broadcasting (no loops).
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: No BLAS/LAPACK integration.</strong> Python had no standard way to call BLAS (matrix multiply) or LAPACK (SVD, eigenvalues). NumPy wraps these via C extensions — <code className="font-mono">np.dot</code> calls BLAS GEMM, <code className="font-mono">np.linalg.svd</code> calls LAPACK dgesvd.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: No scientific ecosystem.</strong> Before NumPy, Python had no SciPy, scikit-learn, matplotlib, or pandas. NumPy&apos;s ndarray became the shared data structure that all scientific Python packages build on — the &quot;lingua franca&quot; of Python science.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique NumPy/SciPy features"
        description="Four features that make NumPy the foundation of scientific Python."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. N-D broadcasting</p>
            <p className="text-muted-foreground"><code className="font-mono">(m,1)+(1,n)→(m,n)</code> via replication — no loops. <strong>No other language has this level of broadcasting.</strong> MATLAB requires <code className="font-mono">repmat</code>; R requires <code className="font-mono">sweep</code>.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. BLAS/LAPACK delegation</p>
            <p className="text-muted-foreground">NumPy delegates matrix ops to BLAS/LAPACK (OpenBLAS/MKL). <strong>Same performance as compiled C/Fortran</strong> — hand-tuned SIMD assembly + cache blocking.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Zero-copy views</p>
            <p className="text-muted-foreground">Slicing <code className="font-mono">a[::2, :3]</code> returns a VIEW (no copy) — different strides into the same memory. <strong>No other array library does this as efficiently</strong> — saves memory + time.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Universal ecosystem</p>
            <p className="text-muted-foreground">100+ packages build on ndarray: SciPy, scikit-learn, pandas, matplotlib, TensorFlow, PyTorch, JAX, CuPy, Dask. <strong>The lingua franca of Python science.</strong></p>
          </div>
        </div>
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the NumPy/SciPy ecosystem"
        description="NumPy/SciPy sit at the base of the Python scientific computing stack — everything else builds on the ndarray."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> BLAS/LAPACK backends</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>OpenBLAS</strong> — open-source, hand-tuned assembly (SSE/AVX/NEON)</li>
              <li>• <strong>Intel MKL</strong> — proprietary, fastest on Intel CPUs</li>
              <li>• <strong>Apple Accelerate</strong> — macOS-optimised (Metal framework)</li>
              <li>• <strong>BLIS</strong> — alternative open-source BLAS</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Boxes className="h-3.5 w-3.5 text-primary" /> SciPy submodules</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>scipy.linalg</strong> — LU, QR, Cholesky, Schur</li>
              <li>• <strong>scipy.sparse</strong> — CSR, CSC, COO + sparse solvers</li>
              <li>• <strong>scipy.fft</strong> — pocketfft, N-D FFT, real/complex</li>
              <li>• <strong>scipy.optimize</strong> — minimisation, root-finding, curve fitting</li>
              <li>• <strong>scipy.stats</strong> — distributions, hypothesis tests</li>
              <li>• <strong>scipy.signal</strong> — filtering, convolution, spectroscopy</li>
              <li>• <strong>scipy.ndimage</strong> — image processing, morphology</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + the wet lab to marketplace narrative"
        description="The papers and companies that built on NumPy/SciPy to create the modern scientific computing ecosystem."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">NumPy origin (Travis Oliphant 2005):</strong> NumPy merged two competing array libraries — Numeric (Jim Hugunin, 1995) and NumArray (Space Telescope Science Institute, 2001) — into a single ndarray. The key design decision: contiguous C array with strides (memory layout), broadcasting (no loops), and BLAS/LAPACK delegation (C-speed linear algebra). This made Python competitive with MATLAB for scientific computing — and free.
          </p>
          <p>
            <strong className="text-foreground/80">SciPy origin (Travis Oliphant, Eric Jones, Pearu Peterson 2001):</strong> SciPy built on NumPy to provide the full scientific stack: linear algebra, optimization, FFT, signal processing, image processing, statistics. The design philosophy: wrap proven C/Fortran libraries (LAPACK, FFTW, QUADPACK, ODEPACK) in Python-friendly APIs.
          </p>
          <p>
            <strong className="text-foreground/80">23andMe (genomics marketplace):</strong> Founded 2006 by Anne Wojcicki. 23andMe processes millions of genotyping arrays — each array has ~650,000 SNP probes. NumPy SVD on the genotype matrix gives PCA for ancestry composition. The &quot;Ancestry Composition&quot; feature is literally <code className="font-mono">np.linalg.svd(genotype_matrix)</code> + clustering.
          </p>
          <p>
            <strong className="text-foreground/80">Recursion Pharma (microscopy marketplace):</strong> Founded 2013 by Chris Gibson. Recursion uses high-content microscopy — thousands of cell images per experiment. NumPy N-D arrays handle (x × y × channel × well × time) image stacks. scikit-learn (built on NumPy) classifies cell phenotypes. The company IPO&apos;d at USD 3B valuation — built on <code className="font-mono">import numpy as np</code>.
          </p>
          <p>
            <strong className="text-foreground/80">DeepMind AlphaFold (protein structure):</strong> AlphaFold2 (2020) uses NumPy arrays for MSA (multiple sequence alignment) embeddings, attention matrices (Q×K^T), and structure tensors (3D coordinates). The evoformer block operates on N-D arrays — <code className="font-mono">np.einsum(&quot;...&quot;)</code> for tensor contractions. AlphaFold predicted 200M+ protein structures — all computed on NumPy arrays.
          </p>
          <p>
            <strong className="text-foreground/80">Insitro (drug discovery marketplace):</strong> Founded 2018 by Daphne Koller. Insitro uses NumPy for molecular dynamics simulations (N-D arrays for force fields), ML for target identification (scikit-learn on NumPy features), and high-content screening (image processing via scipy.ndimage). USD 643M raised — all built on the NumPy ndarray.
          </p>
        </div>
      </SectionCard>

      {/* Insight */}
      <SectionCard
        title="My deeper thought: NumPy IS the lingua franca of science"
        description="The unifying view: every scientific computing stack — from genomics to particle physics to drug discovery — converges on the same data structure (N-D array) and the same operations (BLAS/LAPACK/FFT/sparse). NumPy is the universal interface."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">NumPy IS the lingua franca of science.</strong> Before NumPy, every field had its own data format: bioinformatics had FASTQ, physics had ROOT, chemistry had SDF, astronomy had FITS. NumPy&apos;s ndarray became the shared data structure — every field converts its data to NumPy arrays for computation. The FASTQ → NumPy conversion (via BioPython), the ROOT → NumPy conversion (via uproot), the FITS → NumPy conversion (via astropy) — all fields converge on the same N-D array. This is why 100+ packages build on NumPy: it&apos;s the universal interface.
          </p>
          <p>
            <strong className="text-foreground/80">BLAS/LAPACK IS the universal numerical kernel.</strong> Every programming language for science — Python (NumPy), R, MATLAB, Julia — delegates to the same BLAS/LAPACK. The matrix multiply <code className="font-mono">C[i,j] = Σ A[i,k]×B[k,j]</code> is computed by the same hand-tuned assembly (OpenBLAS/MKL) regardless of language. The language doesn&apos;t matter for linear algebra — BLAS does. This is why Python (NumPy) and Julia can match MATLAB performance — they all call the same BLAS.
          </p>
          <p>
            <strong className="text-foreground/80">The N-D array IS the scientific data model.</strong> Every scientific dataset is naturally N-dimensional: genomics (genes × samples × conditions), microscopy (x × y × z × channel × time), mass spec (m/z × intensity × time × replicate), particle physics (event × channel × variable × cut). NumPy&apos;s ndarray handles all of these with the same API — shape (d₁,...,dₙ), strides (s₁,...,sₙ), broadcasting. No special data structures per field — just N-D arrays. This is why NumPy is the foundation: it models scientific data at the right level of abstraction.
          </p>
          <p>
            <strong className="text-foreground/80">The wet lab → marketplace pipeline IS the scientific method commercialised.</strong> The pipeline (data generation → NumPy processing → publication → IP → startup → market) is the modern scientific method applied to commercial outcomes. 23andMe commercialised PCA on genotypes. Recursion commercialised microscopy ML. Insitro commercialised drug discovery ML. All start with <code className="font-mono">import numpy as np</code>. The NumPy ndarray is the atom of the modern bioeconomy — every biotech startup is built on N-D arrays.
          </p>
        </div>
      </SectionCard>

      <RelatedTopics topics={[
        { id: "bioinformatics" as const, reason: "Bioinformatics page — NumPy for genomics (ESM-2, BWA, BLAST)" },
        { id: "dask-ray" as const, reason: "Dask/Ray — distributed NumPy arrays across clusters" },
        { id: "gpu-computing" as const, reason: "GPU computing — CuPy (NumPy on GPU), cuDF, RAPIDS" },
        { id: "jupyter" as const, reason: "Jupyter — notebooks for reproducible NumPy analysis" },
        { id: "ml-platform" as const, reason: "ML platform — scikit-learn/torch build on NumPy" },
        { id: "data-lakehouse" as const, reason: "Lakehouse — N-D arrays for scientific Bronze→Gold" },
        { id: "mlflow-deep-dive" as const, reason: "MLflow — track NumPy-based model experiments" },
        { id: "neural-networks" as const, reason: "Neural networks — weight matrices are NumPy arrays" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("dask-ray")} className="text-sm text-primary hover:underline">
          &rarr; Dask/Ray (distributed NumPy across clusters)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("gpu-computing")} className="text-sm text-primary hover:underline">
          &rarr; GPU Computing (CuPy, cuDF, RAPIDS)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("jupyter")} className="text-sm text-primary hover:underline">
          &rarr; Jupyter (notebooks for reproducible science)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("bioinformatics")} className="text-sm text-primary hover:underline">
          &rarr; Bioinformatics (NumPy for genomics)
        </Link>
      </div>
    </div>
  );
}
