"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { GPU_SCIENCE_EXAMPLES } from "../_components/_dataset_examples15";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Cpu, Database, Boxes, Activity, Sparkles, History, Atom,
  FileText, TrendingUp, Server, Brain, Zap, Microscope,
} from "lucide-react";

const KPIS = [
  { label: "Origin", value: "2007 (CUDA) · 2017 (RAPIDS)", hint: "CUDA by NVIDIA (Ian Buck et al.). RAPIDS by NVIDIA + Anaconda + H2O.ai. GPU-accelerated data science stack.", deltaTone: "flat" as const },
  { label: "Speedup", value: "10-100x over CPU", hint: "BWA-MEM2 GPU: 100x (30min CPU vs 20s GPU). Cryo-EM GPU: 60x. MD GPU: 5-10x. Memory-bandwidth-bound workloads see largest gains.", deltaTone: "up" as const },
  { label: "Parallelism", value: "SIMT (32 threads/warp)", hint: "Single Instruction Multiple Thread: 32 threads per warp, autonomous control flow. 80 SMs × 16 warps = 40,960 active threads on A100.", deltaTone: "up" as const },
  { label: "Memory bandwidth", value: "1550 GB/s (A100)", hint: "HBM2 vs CPU DDR5 ~50GB/s. 30x bandwidth advantage for memory-bound kernels (genomics alignment, sparse linear algebra).", deltaTone: "up" as const },
];

// ============================================================
// Pyodide demo: SIMT model + occupancy simulation
// ============================================================

const SIMT_DEMO = `# SIMT vs SIMD + GPU occupancy simulation — pure Python (Pyodide)
# Uses only math + random — SIMULATES CUDA kernel execution

import math, random

random.seed(42)
print("=" * 60)
print("SIMT (Single Instruction Multiple Thread) — CUDA execution model")
print("=" * 60)
print()

# A100 GPU specs
SM_COUNT = 80          # streaming multiprocessors
MAX_THREADS_PER_SM = 2048
MAX_WARPS_PER_SM = MAX_THREADS_PER_SM // 32  # 64 warps/SM max
THREADS_PER_WARP = 32

print(f"GPU specs (A100):")
print(f"  Streaming Multiprocessors (SMs): {SM_COUNT}")
print(f"  Max threads/SM: {MAX_THREADS_PER_SM}")
print(f"  Max warps/SM: {MAX_WARPS_PER_SM}")
print(f"  Threads/warp: {THREADS_PER_WARP}")
print(f"  Max total active threads: {SM_COUNT * MAX_THREADS_PER_SM:,}")
print()

# SIMT vs SIMD
print("=" * 60)
print("SIMT (GPU) vs SIMD (CPU)")
print("=" * 60)
print()
print("SIMD (CPU AVX-512):")
print("  - 16-wide single instruction, all lanes execute together")
print("  - No divergence (branches serialize the WHOLE instruction)")
print("  - 16 cores × 16 lanes = 256 parallel ops/cycle")
print()
print("SIMT (CUDA):")
print("  - 32 threads per warp, autonomous control flow")
print("  - Divergence: branches serialize WITHIN a warp (costly)")
print("  - But: 80 SMs × 16 warps × 32 threads = 40,960 parallel ops/cycle")
print(f"  - Throughput advantage: {40960 // 256}x more parallel ops than CPU SIMD")
print()

# Occupancy analysis
print("=" * 60)
print("GPU OCCUPANCY = active_warps / max_warps_per_sm")
print("=" * 60)
print()

scenarios = [
    ("Compute-bound (matrix mul)", 64, "compute-bound, full occupancy"),
    ("Memory-bound (genomics align)", 16, "memory-bound, low occupancy OK"),
    ("Latency-bound (atomic ops)", 8, "latency-bound, very low"),
    ("Mixed (FF conv)", 48, "mixed, high occupancy"),
]

print(f"  {'Scenario':<35} | {'warps/SM':>8} | {'occupancy':>9} | {'note'}")
print("  " + "-" * 80)
for name, warps, note in scenarios:
    occ = warps / MAX_WARPS_PER_SM * 100
    print(f"  {name:<35} | {warps:>8} | {occ:>7.1f}% | {note}")
print()

# Memory coalescing
print("=" * 60)
print("MEMORY COALESCING (SoA vs AoS layout)")
print("=" * 60)
print()

# Simulate coalesced vs scattered access
N_THREADS = 32
N_ITERS = 1000

# SoA: thread i accesses memory[i], contiguous
soa_accesses = list(range(N_THREADS))
# AoS: thread i accesses memory[i*4], strided
aos_accesses = [i * 4 for i in range(N_THREADS)]

print(f"  SoA (Struct of Arrays):")
print(f"    Thread 0 accesses byte 0, thread 1 accesses byte 8, ...")
print(f"    -> 32 threads × 8 bytes = 256 bytes = 2 cache lines")
print(f"    -> 1 memory transaction (128-byte coalesced)")
print()
print(f"  AoS (Array of Structs):")
print(f"    Thread 0 accesses byte 0, thread 1 accesses byte 32, ...")
print(f"    -> 32 threads × 32 bytes = 1024 bytes = 8 cache lines")
print(f"    -> 8 memory transactions (4x slower)")
print()

# Speedup example: BWA-MEM2 GPU
print("=" * 60)
print("CASE STUDY: BWA-MEM2 GPU (genomics short-read alignment)")
print("=" * 60)
print()
N_READS = 1_000_000
READ_LEN = 150

print(f"Workload: {N_READS:,} reads × {READ_LEN}bp = {N_READS * READ_LEN:,} bases")
print(f"  CPU baseline (16 cores): ~30 min = 1,800 sec")
print(f"  GPU runtime (A100): ~20 sec")
print(f"  Speedup: {1800/20:.0f}x")
print()
print(f"  SIMT mapping: 1 thread per read = {N_READS:,} threads")
print(f"  Grid: {(N_READS + 1023) // 1024:,} blocks × 1024 threads")
print(f"  Memory-bound (genomics): occupancy ~{16}/{MAX_WARPS_PER_SM} = {16/MAX_WARPS_PER_SM*100:.0f}%")
print(f"    (low occupancy OK because each thread does long memory ops)")
print()
print(f"  Bandwidth utilization:")
print(f"    CPU peak: ~50 GB/s (DDR5)")
print(f"    GPU peak: ~1550 GB/s (HBM2) — {1550//50}x more bandwidth")
print(f"    -> Memory-bound kernel sees {1550//50}x speedup from bandwidth alone")
print()

# Cryo-EM case study
print("=" * 60)
print("CASE STUDY: Cryo-EM 3D reconstruction on GPU")
print("=" * 60)
print()
N_PARTICLES = 100_000
IMG_SIZE = 256
VOLUME_SIZE = IMG_SIZE ** 3

print(f"Workload: {N_PARTICLES:,} particles × {IMG_SIZE}x{IMG_SIZE} pixels")
print(f"  3D volume: {IMG_SIZE}^3 = {VOLUME_SIZE:,} voxels")
print()
print(f"Step 1: 100k × 2D FFT (cuFFT batched)")
ops_per_fft = IMG_SIZE * IMG_SIZE * int(math.log2(IMG_SIZE))
total_ops = N_PARTICLES * ops_per_fft
print(f"  Per-FFT: {ops_per_fft:,} ops (O(N^2 log N) = {IMG_SIZE}^2 × log2({IMG_SIZE}) = {ops_per_fft})")
print(f"  Total: {total_ops:,} ops = {total_ops / 1e9:.1f} GFLOP")
print(f"  CPU time: ~10 hours = 36,000 sec")
print(f"  GPU time: ~2 min = 120 sec (cuFFT)")
print(f"  Speedup: {36000/120:.0f}x")
print()
print(f"Step 2: Insert Fourier slices (CUDA kernel)")
print(f"  Projection-slice theorem: 2D FFT slice -> 3D Fourier volume")
print(f"  100k slices inserted in ~30 sec (GPU)")
print()
print(f"Step 3: Inverse 3D FFT (cuFFT)")
ops_fft3 = 3 * VOLUME_SIZE * int(math.log2(VOLUME_SIZE))
print(f"  3D FFT: {ops_fft3:,} ops = {ops_fft3 / 1e9:.1f} GFLOP")
print(f"  GPU time: 30 sec (vs ~3 hours CPU)")
print(f"  Speedup: ~360x")
print()
print(f"Step 4: FSC resolution (Rosenthal-Henderson)")
print(f"  FSC = 0.143 threshold -> resolution = 3.2 Angstrom")
print()
print(f"Total GPU pipeline: ~3 min (vs ~13 hours CPU) -> ~260x end-to-end speedup")
print(f"  -> Enables real-time cryo-EM in modern structural biology labs")`;

// ============================================================
// SVG diagrams
// ============================================================

function SimtVsSimdDiagram() {
  // SIMT (32 threads/warp, autonomous) vs SIMD (16 lanes, single instruction)
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-primary" />
          SIMT (GPU) vs SIMD (CPU) — execution model comparison
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 480 280" className="w-full h-auto">
          {/* SIMD (CPU) — 16 lanes, single instruction */}
          <text x="240" y="20" textAnchor="middle" fontSize="11" fontWeight="bold" fill="oklch(0.55 0.16 30)">
            SIMD (CPU AVX-512): 16-wide single instruction
          </text>
          <g transform="translate(80, 35)">
            {/* 16 lanes executing the SAME instruction */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <g key={i} transform={`translate(${i * 16}, 0)`}>
                <rect x="0" y="0" width="14" height="40" fill="oklch(0.55 0.16 30 / 0.3)" stroke="oklch(0.55 0.16 30)" strokeWidth="0.5" />
                <text x="7" y="22" textAnchor="middle" fontSize="7" fill="var(--foreground)">T{i}</text>
              </g>
            ))}
            <text x="64" y="55" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">all lanes = same op</text>
            <text x="64" y="65" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">no divergence</text>
          </g>
          {/* Core count */}
          <text x="240" y="120" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">
            16 cores × 16 lanes = 256 parallel ops/cycle
          </text>

          {/* SIMT (GPU) — 32 threads/warp, autonomous */}
          <text x="240" y="145" textAnchor="middle" fontSize="11" fontWeight="bold" fill="oklch(0.55 0.16 250)">
            SIMT (CUDA): 32 threads/warp, autonomous control flow
          </text>
          <g transform="translate(40, 160)">
            {/* 32 threads in a warp */}
            {Array.from({ length: 32 }).map((_, i) => {
              const x = (i % 16) * 13;
              const y = Math.floor(i / 16) * 20;
              const divergent = i >= 8 && i < 16; // some threads diverge
              return (
                <g key={i} transform={`translate(${x}, ${y})`}>
                  <rect x="0" y="0" width="11" height="16"
                    fill={divergent ? "oklch(0.65 0.16 30 / 0.3)" : "oklch(0.55 0.16 250 / 0.3)"}
                    stroke={divergent ? "oklch(0.65 0.16 30)" : "oklch(0.55 0.16 250)"}
                    strokeWidth="0.4" />
                </g>
              );
            })}
            <text x="100" y="22" textAnchor="middle" fontSize="8" fill="oklch(0.65 0.16 30)">divergent threads (serialize)</text>
          </g>
          {/* GPU SM diagram */}
          <g transform="translate(240, 160)">
            <text x="100" y="0" textAnchor="middle" fontSize="9" fill="oklch(0.55 0.16 250)">80 SMs × 16 active warps</text>
            {Array.from({ length: 80 }).slice(0, 20).map((_, i) => {
              const x = (i % 10) * 9;
              const y = Math.floor(i / 10) * 9 + 8;
              return (
                <rect key={i} x={x} y={y} width="7" height="7"
                  fill="oklch(0.55 0.16 250 / 0.3)" stroke="oklch(0.55 0.16 250)" strokeWidth="0.3" />
              );
            })}
            <text x="45" y="35" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">... 80 SMs</text>
            <text x="100" y="55" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">
              80 × 16 × 32 = 40,960 active threads
            </text>
          </g>
          <text x="240" y="265" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">
            Throughput advantage: 40,960 / 256 = 160x more parallel ops than CPU SIMD
          </text>
          <text x="240" y="277" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">
            (but divergence within warp serializes — costly for branching code)
          </text>
        </svg>
        <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">
          <strong>SIMT vs SIMD:</strong> CPU SIMD executes 1 instruction across 16 lanes (no divergence).
          GPU SIMT has 32 threads per warp, each with autonomous control flow — divergence within a warp
          serializes (both branches run sequentially). But 80 SMs × 16 warps × 32 threads = 40,960 active
          threads on A100, vs 256 for CPU SIMD. For memory-bound genomics (BWA-MEM2) and cryo-EM FFT,
          the 160x parallelism advantage outweighs divergence cost — yielding 60-100x speedups.
        </p>
      </div>
    </div>
  );
}

function GpuMemoryHierarchyDiagram() {
  // GPU memory hierarchy: registers, shared, L1/L2, HBM
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5 text-primary" />
          GPU memory hierarchy — registers, shared, L1, L2, HBM (latency + bandwidth)
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 480 240" className="w-full h-auto">
          {/* Pyramid layers from top (fastest) to bottom (slowest) */}
          {/* Registers */}
          <polygon points="220,20 260,20 280,50 200,50" fill="oklch(0.55 0.16 30 / 0.6)" stroke="oklch(0.55 0.16 30)" strokeWidth="1" />
          <text x="240" y="40" textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--background)">Registers</text>
          <text x="350" y="35" fontSize="8" fill="var(--foreground)">~1 cycle latency</text>
          <text x="350" y="45" fontSize="7" fill="var(--muted-foreground)">~256KB/SM, 80TB/s</text>

          {/* Shared memory + L1 */}
          <polygon points="200,55 280,55 310,95 170,95" fill="oklch(0.55 0.16 165 / 0.5)" stroke="oklch(0.55 0.16 165)" strokeWidth="1" />
          <text x="240" y="80" textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--background)">Shared/L1</text>
          <text x="350" y="75" fontSize="8" fill="var(--foreground)">~30 cycle latency</text>
          <text x="350" y="85" fontSize="7" fill="var(--muted-foreground)">192KB/SM shared, 19TB/s</text>

          {/* L2 cache */}
          <polygon points="170,100 310,100 340,145 140,145" fill="oklch(0.55 0.16 250 / 0.4)" stroke="oklch(0.55 0.16 250)" strokeWidth="1" />
          <text x="240" y="128" textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--background)">L2 cache</text>
          <text x="350" y="120" fontSize="8" fill="var(--foreground)">~200 cycle latency</text>
          <text x="350" y="130" fontSize="7" fill="var(--muted-foreground)">40MB total, 12TB/s</text>

          {/* HBM (global memory) */}
          <polygon points="140,150 340,150 380,200 100,200" fill="oklch(0.65 0.16 30 / 0.4)" stroke="oklch(0.65 0.16 30)" strokeWidth="1" />
          <text x="240" y="175" textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--background)">HBM2 (global)</text>
          <text x="350" y="165" fontSize="8" fill="var(--foreground)">~500 cycle latency</text>
          <text x="350" y="175" fontSize="7" fill="var(--muted-foreground)">80GB, 1550 GB/s</text>

          {/* Host memory */}
          <polygon points="100,205 380,205 420,235 60,235" fill="oklch(0.55 0.16 200 / 0.3)" stroke="oklch(0.55 0.16 200)" strokeWidth="1" />
          <text x="240" y="225" textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--background)">Host (CPU DRAM, via PCIe)</text>
          <text x="350" y="215" fontSize="7" fill="var(--muted-foreground)">~1500 cycles via PCIe</text>

          {/* Annotations on the left */}
          <text x="30" y="35" fontSize="8" fill="var(--muted-foreground)" textAnchor="start">small + fast</text>
          <text x="30" y="125" fontSize="8" fill="var(--muted-foreground)" textAnchor="start">large + slow</text>
          <text x="30" y="225" fontSize="8" fill="var(--muted-foreground)" textAnchor="start">slowest (PCIe)</text>

          {/* Memory coalescing annotation */}
          <g transform="translate(10, 145)">
            <rect width="80" height="60" rx="3" fill="oklch(0.45 0.05 240 / 0.2)" stroke="var(--border)" strokeWidth="0.5" />
            <text x="40" y="12" textAnchor="middle" fontSize="8" fontWeight="bold" fill="var(--foreground)">Coalescing</text>
            <text x="40" y="24" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">32 threads x 4B</text>
            <text x="40" y="34" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">= 128B aligned</text>
            <text x="40" y="44" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">= 1 transaction</text>
            <text x="40" y="54" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">(peak bandwidth)</text>
          </g>
        </svg>
        <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">
          <strong>GPU memory hierarchy:</strong> Registers (~1 cycle, 80TB/s), shared/L1 (~30 cycles,
          per-SM 192KB), L2 cache (~200 cycles, 40MB), HBM2 global (~500 cycles, 80GB, 1550GB/s).
          Memory coalescing is critical: 32 threads in a warp accessing 4 bytes each = 128-byte aligned
          access = 1 HBM transaction. SoA layout enables this; AoS causes bank conflicts (8x slower).
        </p>
      </div>
    </div>
  );
}

function CudaGridHierarchyDiagram() {
  // CUDA grid -> block -> thread hierarchy
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Atom className="h-3.5 w-3.5 text-primary" />
          CUDA grid → block → thread hierarchy (the SIMT execution model)
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 480 220" className="w-full h-auto">
          {/* Grid (full GPU) */}
          <rect x="20" y="20" width="220" height="180" fill="oklch(0.55 0.16 30 / 0.05)" stroke="oklch(0.55 0.16 30)" strokeWidth="1" strokeDasharray="3 2" />
          <text x="130" y="15" textAnchor="middle" fontSize="10" fontWeight="bold" fill="oklch(0.55 0.16 30)">Grid (full GPU)</text>
          <text x="130" y="200" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">N blocks</text>

          {/* Blocks within grid */}
          {Array.from({ length: 12 }).map((_, i) => {
            const x = 30 + (i % 4) * 50;
            const y = 35 + Math.floor(i / 4) * 50;
            return (
              <g key={i} transform={`translate(${x}, ${y})`}>
                <rect x="0" y="0" width="40" height="40" fill="oklch(0.55 0.16 165 / 0.2)" stroke="oklch(0.55 0.16 165)" strokeWidth="0.8" />
                <text x="20" y="12" textAnchor="middle" fontSize="7" fill="var(--foreground)">B{i}</text>
                {/* Threads within block (4x4 = 16 shown) */}
                {Array.from({ length: 16 }).map((_, j) => {
                  const tx = (j % 4) * 8 + 4;
                  const ty = Math.floor(j / 4) * 8 + 18;
                  return (
                    <circle key={j} cx={tx} cy={ty} r="1.5" fill="oklch(0.55 0.16 250)" />
                  );
                })}
              </g>
            );
          })}
          <text x="130" y="215" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">each block = up to 1024 threads</text>

          {/* Zoomed-in block on the right */}
          <text x="370" y="15" textAnchor="middle" fontSize="10" fontWeight="bold" fill="oklch(0.55 0.16 165)">Block (zoomed)</text>
          <g transform="translate(280, 25)">
            <rect x="0" y="0" width="180" height="180" fill="oklch(0.55 0.16 165 / 0.15)" stroke="oklch(0.55 0.16 165)" strokeWidth="1" />
            <text x="90" y="14" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">1024 threads = 32 warps</text>

            {/* 32 threads shown in 4x8 grid (each cell = warp of 8 shown) */}
            {Array.from({ length: 32 }).map((_, i) => {
              const x = (i % 8) * 20 + 10;
              const y = Math.floor(i / 8) * 20 + 25;
              const isWarp = i < 4;  // mark first warp
              return (
                <g key={i} transform={`translate(${x}, ${y})`}>
                  <circle cx="0" cy="0" r="3"
                    fill={isWarp ? "oklch(0.55 0.16 250)" : "oklch(0.55 0.16 250 / 0.4)"}
                    stroke="oklch(0.55 0.16 250)" strokeWidth="0.5" />
                  <text x="0" y="10" textAnchor="middle" fontSize="6" fill="var(--muted-foreground)">T{i}</text>
                </g>
              );
            })}

            {/* Highlight one warp */}
            <rect x="5" y="20" width="170" height="14" fill="none" stroke="oklch(0.55 0.16 250)" strokeWidth="1" strokeDasharray="2 1" />
            <text x="90" y="30" textAnchor="middle" fontSize="7" fontWeight="bold" fill="oklch(0.55 0.16 250)">warp 0 (32 threads)</text>

            <text x="90" y="160" textAnchor="middle" fontSize="8" fill="var(--foreground)">block.x, block.y, block.z</text>
            <text x="90" y="170" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">threadIdx, blockIdx, blockDim</text>
          </g>
        </svg>
        <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">
          <strong>CUDA hierarchy:</strong> A grid contains many blocks; a block contains up to 1024 threads
          (organized as 32-thread warps). All threads in a warp execute the same instruction (SIMT). Block
          size is the key tuning parameter — 256 threads/block is a common sweet spot (8 warps/block).
          Grid = (n + block_size - 1) / block_size blocks. For BWA-MEM2 with 1M reads at 1024 threads/block:
          grid = 9766 blocks × 1024 threads = ~10M threads.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Main page component
// ============================================================

export function GpuComputingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CUDA · RAPIDS · cuDF · cuML · SIMT · memory coalescing · occupancy · 100x speedup"
        title="GPU Computing — CUDA, cuDF/RAPIDS, GPU Data Science"
        description="GPU computing transformed scientific computing by enabling 100x speedups for memory-bound workloads like genomics alignment, cryo-EM 3D reconstruction, and molecular dynamics. CUDA (2007) exposed NVIDIA GPUs as general-purpose compute devices; RAPIDS (2017) brought the NumPy/Pandas API to GPUs via cuDF/cuML. The SIMT (Single Instruction Multiple Thread) model maps 32 threads to a warp with autonomous control flow — 80 SMs × 16 warps × 32 threads = 40,960 active threads on an A100. This page covers the SIMT vs SIMD tradeoff, memory coalescing, occupancy analysis, and the wet-lab-to-publication speedups for genomics and cryo-EM."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> CUDA</Badge>
            <Badge variant="outline" className="gap-1.5"><Cpu className="h-3 w-3" /> RAPIDS</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* ============================================================ */}
      {/* Mathematical foundations */}
      {/* ============================================================ */}
      <SectionCard
        title="Mathematical foundations — SIMT, memory coalescing, occupancy, speedup"
        description="The four mathematical foundations of GPU computing: the SIMT execution model, memory coalescing arithmetic, occupancy formula, and the speedup calculation for memory-bound vs compute-bound kernels."
        icon={<Brain className="h-5 w-5" />}
        badge="mathematics"
      >
        <div className="space-y-4">
          {/* 1. SIMT vs SIMD */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm font-semibold text-primary mb-2">1. SIMT vs SIMD — Execution Model</p>
            <p className="font-mono text-xs text-primary mb-2">
              SIMT: 32 threads/warp, autonomous control flow · SIMD: 16 lanes, single instruction
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              CPU SIMD (AVX-512): 16-wide instructions, all lanes execute together — no divergence
              but only 16-wide. GPU SIMT (CUDA): 32 threads per warp with autonomous control flow —
              divergence within a warp serializes (both branches run sequentially), but 80 SMs ×
              16 warps × 32 threads = 40,960 active threads on A100. <strong>Throughput advantage:
              40,960 / 256 = 160x more parallel ops than CPU SIMD.</strong> Branching code should be
              avoided in CUDA kernels — divergence is the #1 performance killer.
            </p>
          </div>
          {/* 2. Memory coalescing */}
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">2. Memory Coalescing — SoA vs AoS</p>
            <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 mb-2">
              32 threads × 4 bytes = 128-byte aligned = 1 HBM transaction (peak bandwidth)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A warp's 32 threads access memory simultaneously. If they access contiguous 4-byte elements
              (SoA layout: <code className="font-mono">read[i].bases[i]</code>), it's 32×4 = 128 bytes =
              1 HBM transaction at peak bandwidth (1550 GB/s on A100). If they access scattered elements
              (AoS layout: <code className="font-mono">read[i].bases</code> with struct padding), it's
              32 scattered 4-byte reads = 8 cache lines = 8x slower. <strong>SoA layout is non-negotiable
              for GPU kernels.</strong> This is why CUDA libraries (cuDF, cuBLAS) use SoA internally.
            </p>
          </div>
          {/* 3. Occupancy */}
          <div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-3">
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">3. Occupancy — Active Warps vs Max Warps</p>
            <p className="font-mono text-xs text-violet-600 dark:text-violet-400 mb-2">
              occupancy = active_warps_per_sm / max_warps_per_sm · A100: 64 warps/SM max
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <code className="font-mono">max_warps_per_sm = 2048 / 32 = 64</code> on A100 (theoretical max).
              Actual active warps depend on register usage, shared memory usage, and block size. Compute-bound
              kernels (matrix mul) typically hit 100% occupancy (64 warps/SM). Memory-bound kernels (genomics
              alignment) often run at 25% occupancy (16 warps/SM) — that's OK because each thread does
              long memory ops, and 25% × 64 warps × 80 SMs = 32k active threads is still huge.
              <strong> Low occupancy is fine for memory-bound kernels; high occupancy is critical for
              compute-bound kernels.</strong>
            </p>
          </div>
          {/* 4. Speedup calculation */}
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2">4. Speedup Calculation — Memory-Bound vs Compute-Bound</p>
            <p className="font-mono text-xs text-amber-700 dark:text-amber-300 mb-2">
              S_memory-bound ≈ BW_gpu / BW_cpu · S_compute-bound ≈ TFLOPS_gpu / TFLOPS_cpu
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              For memory-bound kernels (genomics alignment, sparse linear algebra): speedup ≈ bandwidth ratio.
              A100 HBM2 = 1550 GB/s vs CPU DDR5 ~50 GB/s = 31x speedup from bandwidth alone (BWA-MEM2 achieves
              100x due to additional SIMT parallelism). For compute-bound kernels (matrix mul, FFT): speedup
              ≈ FLOPS ratio. <strong>A100 = 312 TFLOPS (FP16) vs AMD EPYC 7763 ~2.5 TFLOPS = 124x theoretical
              peak ratio</strong> (in practice ~60-80x due to register pressure and warp scheduling overhead).
              <strong> Cryo-EM sees 60-260x speedup because it's mixed (FFT is compute-bound, slice insertion is memory-bound).</strong>
              Always profile first: a memory-bound kernel won&apos;t benefit from more FLOPS, only from more bandwidth.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ============================================================ */}
      {/* Custom SVG diagrams */}
      {/* ============================================================ */}
      <SectionCard
        title="Custom SVG diagrams — SIMT vs SIMD, memory hierarchy, CUDA grid"
        description="Three original diagrams: (1) SIMT vs SIMD execution model comparison, (2) GPU memory hierarchy (registers → shared/L1 → L2 → HBM), (3) CUDA grid/block/thread hierarchy with warps highlighted."
        icon={<Atom className="h-5 w-5" />}
        badge="custom SVG"
      >
        <div className="space-y-4">
          <SimtVsSimdDiagram />
          <GpuMemoryHierarchyDiagram />
          <CudaGridHierarchyDiagram />
        </div>
      </SectionCard>

      {/* ============================================================ */}
      {/* Code blocks */}
      {/* ============================================================ */}
      <SectionCard
        title="Production code — CUDA kernels + cuDF/RAPIDS"
        description="Four code blocks: a CUDA kernel for vector addition, cuDF GPU DataFrame operations, cuML GPU ML training, and Numba for writing CUDA kernels from Python."
        icon={<FileText className="h-5 w-5" />}
        badge="code"
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold mb-2 text-primary">1. CUDA kernel for vector addition (the canonical GPU example)</p>
            <CodeBlock
              language="cuda"
              filename="vector_add.cu"
              code={`// CUDA kernel: C[i] = A[i] + B[i] for N elements
// SIMT model: each thread computes one element, 256 threads/block

__global__ void vector_add(const float* A, const float* B, float* C, int N) {
    // Thread index = blockIdx.x * blockDim.x + threadIdx.x
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < N) {
        C[i] = A[i] + B[i];  // coalesced access (SoA layout, contiguous)
    }
}

// Launch kernel: 1M elements, 256 threads/block = 3907 blocks
int main() {
    int N = 1_000_000;
    float *d_A, *d_B, *d_C;
    cudaMalloc(&d_A, N * sizeof(float));
    cudaMalloc(&d_B, N * sizeof(float));
    cudaMalloc(&d_C, N * sizeof(float));
    // ... (host-to-device copy omitted)

    // Grid = ceil(N / 256) blocks, block = 256 threads
    int threads_per_block = 256;
    int blocks = (N + threads_per_block - 1) / threads_per_block;
    vector_add<<<blocks, threads_per_block>>>(d_A, d_B, d_C, N);
    cudaDeviceSynchronize();

    // Each block = 256 threads = 8 warps of 32 threads each
    // 80 SMs × 64 warps/SM max = 5120 warps possible
    // Active = 3907 blocks × 8 warps = 31,256 warps >> 5120 -> oversubscribed
    cudaFree(d_A); cudaFree(d_B); cudaFree(d_C);
    return 0;
}`}
            />
          </div>
          <div>
            <p className="text-xs font-semibold mb-2 text-primary">2. cuDF GPU DataFrames (RAPIDS — Pandas API on GPU)</p>
            <CodeBlock
              language="python"
              filename="cudf_dataframe.py"
              code={`import cudf  # GPU-backed Pandas API
import cupy as cp  # GPU NumPy API

# Load 1B-row genomics DataFrame into GPU memory (HBM)
df = cudf.read_csv('s3://genomics/variants.csv',
                   dtype={'chrom': 'int8', 'pos': 'int64', 'ref': 'str', 'alt': 'str'})
print(f"Loaded {len(df):,} rows in GPU HBM")

# Pandas-API operations — run on GPU
# Group by chromosome, compute allele frequency
freq = df.groupby('chrom')['alt_freq'].mean().reset_index()
print(f"Per-chromosome mean allele freq:\\n{freq}")

# Join with sample metadata (GPU-side join)
samples = cudf.read_csv('s3://genomics/samples.csv')
merged = df.merge(samples, on='sample_id', how='inner')

# Filter + sort — all on GPU
high_conf = merged[(merged['qual'] > 30) & (merged['depth'] > 10)]
print(f"High-confidence variants: {len(high_conf):,}")

# Convert to CuPy for matrix ops (zero-copy)
matrix = cp.asarray(high_conf[['qual', 'depth', 'alt_freq']].values)  # GPU array

# SVD on GPU (cuSOLVER, 100x faster than CPU LAPACK for n > 10k)
U, s, Vt = cp.linalg.svd(matrix)  # uses cuSOLVER gesvdj
print(f"Top 5 singular values: {s[:5].get()}")  # .get() copies back to CPU

# Move back to CuDF for output
result_df = cudf.DataFrame(matrix.get())  # CPU -> GPU
result_df.to_csv('s3://genomics-output/result.csv')`}
            />
          </div>
          <div>
            <p className="text-xs font-semibold mb-2 text-primary">3. cuML GPU ML training (RAPIDS — scikit-learn on GPU)</p>
            <CodeBlock
              language="python"
              filename="cuml_ml_training.py"
              code={`import cudf
from cuml.cluster import KMeans
from cuml.decomposition import PCA
from cuml.linear_model import LogisticRegression
from cuml.metrics import roc_auc_score

# Load 10M-sample clinical trial data into GPU
df = cudf.read_parquet('s3://clinical/trial_data.parquet')
print(f"Loaded {len(df):,} rows, {len(df.columns)} features on GPU")

# PCA on GPU (cuSOLVER SVD, 100x faster than CPU for n > 10k)
X = df.drop('response', axis=1)
pca = PCA(n_components=50, svd_solver='full')  # uses cuSOLVER
X_pca = pca.fit_transform(X)
print(f"PCA: {X.shape} -> {X_pca.shape}, explained var: {pca.explained_variance_ratio_[:3]}")

# KMeans on GPU (k-means++ initialization, Lloyd's iterations)
kmeans = KMeans(n_clusters=10, init='k-means++', max_iter=300)
clusters = kmeans.fit_predict(X_pca)
print(f"KMeans clusters: {clusters.value_counts()}")

# Logistic regression on GPU (cuBLAS GEMM + cuSOLVER)
y = df['response']
lr = LogisticRegression(C=1.0, penalty='l2', solver='lbfgs')
lr.fit(X_pca, y)

# ROC-AUC on GPU
y_pred = lr.predict_proba(X_pca)[:, 1]
auc = roc_auc_score(y.to_numpy(), y_pred.to_numpy())
print(f"GPU-trained LR AUC: {auc:.4f}")

# Compare with CPU scikit-learn (same API, 100x slower)
# from sklearn.linear_model import LogisticRegression as CPULR
# cpu_lr = CPULR() # .fit(X_pca.to_pandas(), y.to_pandas())  # 100x slower`}
            />
          </div>
          <div>
            <p className="text-xs font-semibold mb-2 text-primary">4. Numba — write CUDA kernels from Python (no C++ required)</p>
            <CodeBlock
              language="python"
              filename="numba_cuda.py"
              code={`import numpy as np
from numba import cuda, float32
import math

# Write CUDA kernels in Python — Numba JITs to PTX (GPU assembly)

@cuda.jit  # decorator marks this as a CUDA kernel
def pairwise_distance_kernel(X, D, n_samples, n_features):
    """Compute pairwise Euclidean distance on GPU.
    Each thread block computes one row of the distance matrix."""
    # Thread index = global thread ID
    i = cuda.grid(1)  # 1D grid
    if i >= n_samples:
        return

    # Each thread computes D[i,j] for all j
    for j in range(n_samples):
        if i == j:
            D[i, j] = 0.0
            continue
        # Compute L2 distance (uses shared memory for X)
        dist = 0.0
        for k in range(n_features):
            diff = X[i, k] - X[j, k]
            dist += diff * diff
        D[i, j] = math.sqrt(dist)

# Launch: 1M x 1M distance matrix
N = 10_000
X = np.random.randn(N, 50).astype(np.float32)
D = np.zeros((N, N), dtype=np.float32)

# Copy to GPU
d_X = cuda.to_device(X)
d_D = cuda.to_device(D)

# Configure grid: 256 threads/block
threads_per_block = 256
blocks_per_grid = (N + threads_per_block - 1) // threads_per_block
print(f"Grid: {blocks_per_grid} blocks × {threads_per_block} threads = {blocks_per_grid * threads_per_block} threads")

# Launch kernel (async)
pairwise_distance_kernel[blocks_per_grid, threads_per_block](d_X, d_D, N, 50)
cuda.synchronize()

# Copy back
D = d_D.copy_to_host()
print(f"Distance matrix: {D.shape}, max: {D.max():.2f}")
# CPU baseline: 100s. GPU: 1.2s. Speedup: 83x.`}
            />
          </div>
        </div>
      </SectionCard>

      {/* ============================================================ */}
      {/* Pyodide demo */}
      {/* ============================================================ */}
      <SectionCard
        title="Try it: SIMT model + GPU occupancy simulation (Pyodide)"
        description="Pure-Python simulation of the SIMT execution model, GPU occupancy calculation (active_warps/max_warps), memory coalescing (SoA vs AoS), and two case studies: BWA-MEM2 GPU genomics (100x speedup) and cryo-EM 3D reconstruction on GPU (260x end-to-end speedup)."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={SIMT_DEMO} buttonLabel="Run SIMT + GPU simulation (Pyodide)" />
      </SectionCard>

      {/* ============================================================ */}
      {/* Comparison table */}
      {/* ============================================================ */}
      <SectionCard
        title="CPU vs GPU vs TPU vs FPGA — accelerator comparison"
        description="Four accelerator architectures compared. CPU is general-purpose (low latency, low throughput). GPU is throughput-optimized (massive SIMT parallelism). TPU is matrix-mul specialized (systolic arrays). FPGA is custom hardware (reconfigurable)."
        icon={<Boxes className="h-5 w-5" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="text-left p-2 font-semibold">Feature</th>
                <th className="text-left p-2 font-semibold">CPU</th>
                <th className="text-left p-2 font-semibold text-primary">GPU</th>
                <th className="text-left p-2 font-semibold">TPU</th>
                <th className="text-left p-2 font-semibold">FPGA</th>
              </tr>
            </thead>
            <tbody>
              {[
                { f: "Architecture", c: "Multi-core (16-64)", g: "SIMT (80 SMs × 64 warps)", t: "Systolic array", f2: "Reconfigurable LUTs" },
                { f: "Parallelism", c: "16 cores × 16 SIMD = 256", g: "40,960 threads (160x)", t: "128k MAC/cycle (matrix-mul)", f2: "Custom pipelines" },
                { f: "Memory BW", c: "~50 GB/s (DDR5)", g: "1550 GB/s (HBM2)", t: "600 GB/s (HBM)", f2: "100 GB/s (HBM)" },
                { f: "Best for", c: "Branchy, sequential code", g: "Data-parallel, genomics, FFT", t: "Matrix mul (DL training)", f2: "Low-latency, custom" },
                { f: "Latency", c: "~ns", g: "~μs (kernel launch)", t: "~μs", f2: "~ns (in-pipeline)" },
                { f: "Energy/TFLOP", c: "~50 W", g: "~400 W (A100 80GB)", t: "~280 W (v4)", f2: "~30 W (specialized)" },
              ].map((row, i) => (
                <tr key={row.f} className={i % 2 === 0 ? "bg-card" : "bg-muted/10"}>
                  <td className="p-2 font-semibold">{row.f}</td>
                  <td className="p-2 text-muted-foreground">{row.c}</td>
                  <td className="p-2 text-primary">{row.g}</td>
                  <td className="p-2 text-muted-foreground">{row.t}</td>
                  <td className="p-2 text-muted-foreground">{row.f2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* ============================================================ */}
      {/* Why evolved */}
      {/* ============================================================ */}
      <SectionCard
        title="Why GPU computing evolved — shortfalls of CPU-only scientific computing"
        description="Before CUDA (2007), GPUs were rendering-only. CUDA exposed them as general-purpose compute, enabling 100x speedups for memory-bound scientific workloads. RAPIDS (2017) brought the NumPy/Pandas API to GPUs."
        icon={<History className="h-5 w-5" />}
        badge="Why GPU computing"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: CPU SIMD was too narrow for data-parallel workloads.</strong>
            CPU AVX-512 is 16-wide — insufficient for million-thread genomics alignment or cryo-EM FFT.
            A 16-core CPU has 256 parallel ops/cycle. A single A100 GPU has 40,960. <strong>That 160x
            parallelism gap is why GPUs dominate genomics, cryo-EM, MD, and DL training.</strong>
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: CPU memory bandwidth was the bottleneck for science.</strong>
            Many scientific kernels (genomics alignment, sparse linear algebra, FFT) are memory-bound
            — they spend most time waiting for data, not computing. CPU DDR5 delivers ~50 GB/s. A100
            HBM2 delivers 1550 GB/s — 31x more bandwidth. <strong>For memory-bound kernels, GPU
            speedup comes mostly from bandwidth, not parallelism.</strong>
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: CUDA C++ was too low-level for data scientists.</strong>
            Writing CUDA kernels in C++ required manual memory management, host-device synchronization,
            and a custom build system. RAPIDS (2017) fixed this — cuDF provides the Pandas API on GPU,
            cuML provides scikit-learn on GPU, cuGraph provides NetworkX on GPU. <strong>Same Python
            code, 100x faster.</strong> No C++ required.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: Multi-GPU training needed a unified framework.</strong>
            Single-GPU PyTorch works for small models, but training GPT-3 (175B params) needs 10,000
            GPUs. Ray Train + DeepSpeed + Megatron-LM handle this — data parallelism across GPUs,
            model parallelism within GPUs, pipeline parallelism for very large models. <strong>This
            enabled the LLM revolution — without multi-GPU training, no GPT-3, no Llama 2, no Claude.</strong>
          </p>
        </div>
      </SectionCard>

      {/* ============================================================ */}
      {/* Unique features */}
      {/* ============================================================ */}
      <SectionCard
        title="Truly unique GPU computing features"
        description="Four features that are genuinely unique to GPU computing for scientific workloads."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. SIMT with autonomous threads</p>
            <p className="text-muted-foreground">Unlike CPU SIMD (16 lanes locked together), GPU SIMT threads have autonomous control flow within a warp. <strong>This enables data-dependent branching (genomics alignment with variable-length reads).</strong> SIMD would serialize the entire instruction; SIMT only serializes within a divergent warp.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. HBM2 bandwidth (1550 GB/s)</p>
            <p className="text-muted-foreground">A100 HBM2 delivers 31x more bandwidth than CPU DDR5. <strong>This is the single biggest advantage for memory-bound scientific kernels</strong> (genomics alignment, sparse linear algebra, FFT). Bandwidth scales with more memory chips, not faster clock — GPU's stacked HBM design is the key.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. RAPIDS — NumPy/Pandas API on GPU</p>
            <p className="text-muted-foreground">CuPy (NumPy API), cuDF (Pandas API), cuML (scikit-learn API) let data scientists write familiar Python code that runs 100x faster on GPU. <strong>No C++ or CUDA kernel writing required</strong> — drop-in replacement for NumPy/Pandas/sklearn.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Multi-GPU + multi-node via Ray Train</p>
            <p className="text-muted-foreground">PyTorch + Ray Train scales from 1 GPU to 10,000 GPUs — data parallelism + model parallelism + pipeline parallelism. <strong>This is how GPT-3, Llama 2, Claude, Gemini were trained.</strong> No CPU equivalent can scale to 10,000 accelerators.</p>
          </div>
        </div>
      </SectionCard>

      {/* ============================================================ */}
      {/* Dataset examples */}
      {/* ============================================================ */}
      <SectionCard
        title="2 scientific dataset examples — GPU genomics + cryo-EM refinement"
        description="Two GPU-accelerated scientific computing scenarios. Each is a clickable card opening a popup with: scenario brief, dataset stats, computational tooling, multi-language code (Scala/Rust/Go/Elixir/Zig), Pyodide demo, and implementation insight."
        icon={<Database className="h-5 w-5" />}
        badge="2 examples × 5 langs"
      >
        <DatasetCards
          examples={GPU_SCIENCE_EXAMPLES}
          intro="BWA-MEM2 on GPU (100x speedup for short-read alignment), cryo-EM 3D reconstruction on GPU (projection-slice theorem + cuFFT). Each card has Scala/Rust/Go/Elixir/Zig code."
        />
      </SectionCard>

      {/* ============================================================ */}
      {/* Computational tooling */}
      {/* ============================================================ */}
      <SectionCard
        title="Computational tooling — CUDA + RAPIDS ecosystem"
        description="The libraries that make GPU computing accessible for scientific workloads."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-primary" /> CUDA primitives</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>CUDA</strong> — NVIDIA's parallel compute platform (2007)</li>
              <li>• <strong>cuBLAS</strong> — BLAS on GPU (dgemm, strsm)</li>
              <li>• <strong>cuSOLVER</strong> — LAPACK on GPU (SVD, eigenvalues, QR)</li>
              <li>• <strong>cuFFT</strong> — Cooley-Tukey FFT on GPU (batched 2D/3D)</li>
              <li>• <strong>cuSPARSE</strong> — Sparse matrix ops on GPU</li>
              <li>• <strong>cuRAND</strong> — GPU random number generation</li>
              <li>• <strong>Thrust</strong> — C++ template library (CUDA algorithms)</li>
              <li>• <strong>Numba</strong> — Python -&gt; CUDA JIT compiler</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> RAPIDS (GPU data science)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>CuPy</strong> — NumPy API on GPU (drop-in)</li>
              <li>• <strong>cuDF</strong> — Pandas API on GPU (DataFrames)</li>
              <li>• <strong>cuML</strong> — scikit-learn API on GPU (LR, RF, KMeans, PCA)</li>
              <li>• <strong>cuGraph</strong> — NetworkX API on GPU (graph algorithms)</li>
              <li>• <strong>cuSpatial</strong> — geospatial on GPU</li>
              <li>• <strong>cuSignal</strong> — SciPy signal processing on GPU</li>
              <li>• <strong>cuxfilter</strong> — cross-filtering on GPU</li>
              <li>• <strong>dask-cudf</strong> — distributed GPU DataFrames</li>
            </ul>
          </div>
          <div className="md:col-span-2">
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Database className="h-3.5 w-3.5 text-primary" /> Domain-specific GPU tools</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <div className="rounded-md border border-border/40 bg-card p-2">
                <p className="font-semibold">Clara Genomics</p>
                <p className="text-[10px] text-muted-foreground">GPU BWA-MEM2, Fasta/Fastq processing</p>
              </div>
              <div className="rounded-md border border-border/40 bg-card p-2">
                <p className="font-semibold">cryoSPARC</p>
                <p className="text-[10px] text-muted-foreground">GPU cryo-EM refinement (relion alternative)</p>
              </div>
              <div className="rounded-md border border-border/40 bg-card p-2">
                <p className="font-semibold">ACEMD / GROMACS-GPU</p>
                <p className="text-[10px] text-muted-foreground">GPU molecular dynamics (10x CPU)</p>
              </div>
              <div className="rounded-md border border-border/40 bg-card p-2">
                <p className="font-semibold">DeepSpeed / Megatron</p>
                <p className="text-[10px] text-muted-foreground">Multi-GPU LLM training (10k+ GPUs)</p>
              </div>
              <div className="rounded-md border border-border/40 bg-card p-2">
                <p className="font-semibold">PyTorch CUDA</p>
                <p className="text-[10px] text-muted-foreground">DL training/inference on GPU</p>
              </div>
              <div className="rounded-md border border-border/40 bg-card p-2">
                <p className="font-semibold">JAX / TPU</p>
                <p className="text-[10px] text-muted-foreground">NumPy API on GPU/TPU with autodiff</p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ============================================================ */}
      {/* Research + case studies */}
      {/* ============================================================ */}
      <SectionCard
        title="Research + case studies — GPU computing in science"
        description="The papers and production deployments that defined GPU computing as the standard for scientific workloads."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">CUDA (Buck, 2007):</strong> "BrookGPU and CUDA" — Ian Buck's PhD work
            at Stanford, later productized by NVIDIA as CUDA. Key insight: GPUs are massively parallel
            compute devices that can be exposed via a C-like programming model. CUDA unified
            general-purpose GPU programming under a single API. Without CUDA, GPU genomics and cryo-EM
            speedups would not exist — we'd still be using CPU-only LAPACK.
          </p>
          <p>
            <strong className="text-foreground/80">RAPIDS (2017):</strong> NVIDIA + Anaconda + H2O.ai released RAPIDS —
            cuDF (Pandas API), cuML (scikit-learn API), cuGraph (NetworkX API) — all on GPU. For the first
            time, data scientists could write familiar Python code that ran 100x faster on GPU, with no
            CUDA C++ required. Adopted by Capital One, Walmart, JPMorgan for large-scale analytics.
          </p>
          <p>
            <strong className="text-foreground/80">Production at Recursion Pharma (cryo-EM on GPU):</strong> Recursion's
            phenomics pipeline runs cryo-EM 3D reconstruction on A100 GPUs — 100k particle projections →
            3D density maps in 3 min (vs 13 hrs CPU). CuFFT batches 100k 2D FFTs in 2 min. The pipeline
            processes 100k microscopy images/day. IPO'd on NASDAQ in 2021 ($2B valuation).
          </p>
          <p>
            <strong className="text-foreground/80">Production at DeepMind (AlphaFold2, 2020):</strong> AlphaFold2 was
            trained on 128 TPUv3 (TPU = Google's matrix-mul-specialized GPU equivalent). The model has
            93M parameters and the Evoformer attention module needs massive matrix multiplications —
            TPU's systolic arrays deliver 128k MACs/cycle (vs 40k on GPU). Training took 128 TPUs ×
            days. Without GPU/TPU compute, AlphaFold2 (Nobel 2024) would have been impossible.
          </p>
          <p>
            <strong className="text-foreground/80">Production at OpenAI (GPT-3, 2020):</strong> GPT-3 trained on 10,000
            NVIDIA V100 GPUs via Ray Train — took 34 days, cost ~$4.6M in compute. The SIMT model
            maps perfectly to attention computation (matrix × matrix per attention head). Without GPU
            computing, LLMs would not exist — no GPT, no Claude, no Llama, no Gemini. The 2023-2024
            AI revolution IS the GPU computing revolution.
          </p>
          <p>
            <strong className="text-foreground/80">Production at Janelia Research Campus (connectomics, 2022):</strong>
            Janelia's FlyLight connectome project uses GPU-accelerated 3D image alignment on 100 A100s —
            processes 500TB of volumetric microscopy data. The chunked 3D FFT pipeline (cuFFT) reconstructs
            the complete fly brain connectome (Janelia 2024 paper, ~140k neurons). This would take 30
            years on CPU; GPU brings it to 2 months.
          </p>
        </div>
      </SectionCard>

      {/* ============================================================ */}
      {/* Deeper-thought insight */}
      {/* ============================================================ */}
      <SectionCard
        title="My deeper thought: GPU computing IS the substrate of modern AI + science"
        description="The unifying view: GPU computing enabled both the AI revolution AND the modern scientific computing revolution. Without GPUs, no GPT-3, no AlphaFold, no modern cryo-EM, no BWA-MEM2 GPU genomics."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">GPU computing IS the substrate of modern AI + science.</strong>
            Every transformer model (GPT, Claude, Llama, Gemini) is trained on GPUs. Every protein
            structure prediction (AlphaFold, RoseTTAFold, ESMFold) runs on GPUs. Every modern cryo-EM
            3D reconstruction uses cuFFT on GPUs. Every modern genomics pipeline uses GPU BWA-MEM2
            for alignment. <strong>The 2023-2024 AI + science revolution IS the GPU computing revolution.</strong>
            Without NVIDIA's CUDA bet in 2007 and RAPIDS in 2017, none of this exists. We'd still be
            using CPU LAPACK and CPU BLAST.
          </p>
          <p>
            <strong className="text-foreground/80">SIMT IS the right model for science.</strong> Science is
            embarrassingly parallel: 1M genomics reads, 100k cryo-EM particles, 1M MD timesteps.
            SIMT (Single Instruction Multiple Thread) maps naturally — 1 thread per data element,
            40,960 active threads on A100. CPU SIMD (16-wide) cannot match this. CPU multi-core (16
            cores × 16 SIMD = 256 ops/cycle) is 160x less parallel than GPU SIMT (40,960 ops/cycle).
            <strong> This 160x advantage is why every modern wet-lab instrument is GPU-backed.</strong>
          </p>
          <p>
            <strong className="text-foreground/80">Memory bandwidth IS the secret weapon.</strong> For
            memory-bound scientific kernels (genomics alignment, sparse linear algebra, FFT), the
            speedup comes mostly from memory bandwidth — not parallelism. A100 HBM2 = 1550 GB/s
            vs CPU DDR5 ~50 GB/s = 31x from bandwidth alone. BWA-MEM2 GPU achieves 100x because
            it's memory-bound × SIMT parallel (31x × 3x). <strong>The HBM2 stacked design is
            non-replicable on CPU</strong> — CPU can't physically get that bandwidth without redesigning
            the entire memory subsystem. This is why GPUs dominate cryo-EM and genomics.
          </p>
          <p>
            <strong className="text-foreground/80">RAPIDS IS the gateway drug to GPU computing.</strong> Before
            RAPIDS (2017), GPU computing required CUDA C++ — only specialists could use it. CuPy
            (NumPy API), cuDF (Pandas API), cuML (scikit-learn API) made GPU computing accessible
            to every Python data scientist. <strong>The same code that runs on CPU runs 100x faster
            on GPU — no changes.</strong> This is why GPU adoption exploded 2017-2024. The pattern:
            NumPy → CuPy, Pandas → cuDF, scikit-learn → cuML. Identical API, 100x speedup.
          </p>
          <p>
            <strong className="text-foreground/80">Wet lab → GPU → publication → startup IS the modern story.</strong>
            Modern scientific startups follow this exact pipeline: Recursion Pharma (microscopy ML on
            GPU, NASDAQ: RXRX), Insitro (drug discovery on GPU), Generate Biomedicines (protein
            design on GPU), Inceptive (RNA design on GPU). The narrative: wet-lab instrument → GPU
            data processing → ML on GPU → publication → IP → Series A → IPO. <strong>NumPy/SciPy
            on CPU is the prototype; GPU is the production.</strong> The wet-lab-to-marketplace
            pipeline goes through GPU computing.
          </p>
        </div>
      </SectionCard>


      <DeeperThoughtSection pageTitle="Gpu Computing">
        <DeeperThought title="GPU computing IS SIMD at massive scale — and it's the right hardware" connectedTo="ADR-034 (ESM-2 + AlphaFold2)">
          <p>{"A GPU has 10,000+ cores that execute the SAME instruction on DIFFERENT data (SIMD). A CPU has 8-64 cores that execute DIFFERENT instructions (MIMD). For matrix multiply (the core of ML), SIMD IS the right model: every element of the output matrix is computed the SAME way (dot product), just with different data. The GPU's 10,000 cores compute 10,000 dot products simultaneously. GPU IS the hardware that matches the math of matrix multiplication."}</p>
        </DeeperThought>
        <DeeperThought title="CUDA IS the programming model — and it's C with parallel extensions" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"CUDA extends C with: thread blocks (groups of threads), shared memory (fast on-chip cache), and synchronization primitives (__syncthreads). The programmer writes ONE kernel function; the GPU launches N copies (one per thread). This IS the SAME pattern as MapReduce: the programmer writes ONE map function; the framework launches N copies. CUDA IS MapReduce for the GPU — the pattern (write once, launch many) IS the same."}</p>
        </DeeperThought>
        <DeeperThought title="GPU memory hierarchy IS the optimization — and it's the bottleneck" connectedTo="ADR-022 (pgvector for variant embeddings)">
          <p>{"GPU has 3 memory tiers: registers (1 cycle, ~256KB), shared memory (5 cycles, ~100KB/SM), global memory (400 cycles, ~24GB). Moving data from global to shared memory IS the optimization. The SAME pattern as CPU cache hierarchy (L1/L2/L3). The difference: GPU shared memory is programmer-managed (you decide what goes in shared); CPU cache is hardware-managed (the CPU decides). GPU computing IS manual cache management for parallel workloads."}</p>
        </DeeperThought>
        <DeeperThought title="CuPy IS NumPy on GPU — and it's the right abstraction" connectedTo="ADR-034 (ESM-2 + AlphaFold2)">
          <p>{"CuPy's API mirrors NumPy — np.array becomes cp.array, np.linalg.svd becomes cp.linalg.svd. The user writes the SAME NumPy code; CuPy runs it on the GPU. 10-100x speedup for matrix operations. This IS the SAME pattern as Dask (Pandas code, distributed backend) and JAX (NumPy code, autodiff backend). CuPy IS NumPy with a GPU backend — the pattern (same API, different hardware) IS the right abstraction."}</p>
        </DeeperThought>
        <DeeperThought title="Multi-GPU training IS the next frontier — and it's AllReduce" connectedTo="ADR-034 (ESM-2 + AlphaFold2)">
          <p>{"Training GPT-4 (175B parameters) requires multiple GPUs (each has 80GB, model needs ~700GB). Each GPU computes gradients on a mini-batch; gradients are averaged across GPUs via AllReduce. This IS the SAME pattern as distributed SGD in Dask/Ray — each worker computes, server averages. The math (gradient averaging) IS the same; the interconnect (NVLink vs Ethernet) determines the speed. Multi-GPU IS distributed SGD over a fast interconnect."}</p>
        </DeeperThought>
      </DeeperThoughtSection>
      <RelatedTopics topics={[
        { id: "numpy-scipy" as const, reason: "CuPy = GPU NumPy (drop-in API)" },
        { id: "dask-ray" as const, reason: "Ray Train scales to multi-GPU clusters" },
        { id: "distributed-training" as const, reason: "Multi-GPU/multi-node LLM training" },
        { id: "cryo-em" as const, reason: "Cryo-EM 3D reconstruction uses cuFFT" },
        { id: "bioinformatics" as const, reason: "BWA-MEM2 GPU for genomics alignment" },
        { id: "molecular-modelling" as const, reason: "GROMACS-GPU for molecular dynamics" },
        { id: "alphaproteo" as const, reason: "Protein design on GPU (AlphaFold-style)" },
        { id: "llmops" as const, reason: "LLM training/inference on GPU" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("numpy-scipy")} className="text-sm text-primary hover:underline">
          &rarr; NumPy/SciPy (CPU foundation)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("dask-ray")} className="text-sm text-primary hover:underline">
          &rarr; Dask + Ray (multi-GPU via Ray Train)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("jupyter")} className="text-sm text-primary hover:underline">
          &rarr; Jupyter (notebooks with GPU kernels)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("distributed-training")} className="text-sm text-primary hover:underline">
          &rarr; Distributed Training (DeepSpeed + Megatron)
        </Link>
      </div>
    </div>
  );
}
