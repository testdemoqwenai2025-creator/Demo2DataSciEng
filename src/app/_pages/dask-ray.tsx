"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { DASK_RAY_SCIENCE_EXAMPLES } from "../_components/_dataset_examples15";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Cpu, Database, Boxes, Activity, Sparkles, History, Atom,
  FileText, TrendingUp, Server, Brain, Zap, Network,
} from "lucide-react";

const KPIS = [
  { label: "Origin", value: "Dask 2014 · Ray 2017", hint: "Dask by Matthew Rocklin (Continuum Analytics). Ray by Philipp Moritz et al. (UC Berkeley RISELab). Both solve Python scaling beyond a single node.", deltaTone: "flat" as const },
  { label: "Adoption", value: "Dask 30k stars · Ray 35k", hint: "Dask used by NASA, LLNL, Capital One. Ray used by OpenAI, Ant Group, Shopify, Uber. Both are Apache projects.", deltaTone: "up" as const },
  { label: "Speedup limit", value: "Amdahl's law S=1/((1-p)+p/n)", hint: "With 95% parallel work + 100 workers: max 17x speedup. With 99% parallel: 50x. Serial fraction is the bottleneck.", deltaTone: "up" as const },
  { label: "Cluster size", value: "Dask 1000s of nodes · Ray 1000s", hint: "Dask scaled to 1000-worker clusters at Janelia Research Campus (connectomics). Ray scaled to 1000s of GPUs at OpenAI.", deltaTone: "up" as const },
];

// ============================================================
// Pyodide demo: Amdahl's law + Dask task graph simulation
// ============================================================

const AMDAHL_DEMO = `# Amdahl's Law + Dask task-graph simulation — pure Python (Pyodide)
# Uses only math + random — NO numpy. Simulates parallel scaling limits.

import math, random, time

random.seed(42)
print("=" * 60)
print("AMDABL'S LAW: S = 1 / ((1-p) + p/n)")
print("  where p = parallel fraction, n = workers")
print("=" * 60)
print()

def amdahl_speedup(p, n):
    """Theoretical max speedup given parallel fraction p and n workers."""
    if p >= 1.0:
        return n  # embarrassingly parallel
    return 1.0 / ((1.0 - p) + p / n)

print("Worker count vs speedup (for various parallel fractions):")
print(f"  {'n':>6} | {'p=0.90':>8} | {'p=0.95':>8} | {'p=0.99':>8} | {'p=1.00':>8}")
print("  " + "-" * 50)
for n in [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024]:
    s90 = amdahl_speedup(0.90, n)
    s95 = amdahl_speedup(0.95, n)
    s99 = amdahl_speedup(0.99, n)
    s100 = amdahl_speedup(1.00, n)
    print(f"  {n:>6} | {s90:>8.2f} | {s95:>8.2f} | {s99:>8.2f} | {s100:>8.2f}")
print()
print("Key insight: even with infinite workers, max speedup = 1/(1-p)")
print("  p=0.90 -> max 10x  (90% parallel -> 10% serial cap)")
print("  p=0.95 -> max 20x  (95% parallel -> 5% serial cap)")
print("  p=0.99 -> max 100x (99% parallel -> 1% serial cap)")
print()

# === Dask task-graph DAG simulation ===
print("=" * 60)
print("DASK TASK-GRAPH DAG SIMULATION (1000G VCF allele frequency)")
print("=" * 60)
print()

# Build a 3-layer DAG
# Layer 1: 1000 leaf tasks (count alleles per chunk)
# Layer 2: 22 reduce tasks (per-chromosome aggregation)
# Layer 3: 1 final aggregate
n_leaf = 1000
n_reduce = 22
n_agg = 1
total_tasks = n_leaf + n_reduce + n_agg

print(f"DAG structure:")
print(f"  Layer 1 (leaf):    {n_leaf} tasks  (count_alleles per chunk)")
print(f"  Layer 2 (reduce):  {n_reduce} tasks  (per-chromosome aggregation)")
print(f"  Layer 3 (final):   {n_agg} task    (final allele frequency)")
print(f"  Total tasks:       {total_tasks}")
print()

# Each leaf task takes ~50ms in real Dask (we simulate serially)
# Serial time = total_tasks * 50ms = 51.05 sec
serial_sec = total_tasks * 0.05
print(f"Serial execution (1 worker): {serial_sec:.2f}s")
print()

# Parallel execution — apply Amdahl's law
# Layer 1 is embarrassingly parallel (each chunk independent)
# Layer 2 partially serial (22 reduces on 1000 workers = 22/1000 util)
# Layer 3 fully serial (single aggregate)
p = (n_leaf * 0.05) / serial_sec  # fraction in parallel leaves
print(f"Parallel fraction p = leaf_time/total_time = {p:.4f}")
print(f"  (layer 1 = {n_leaf * 0.05 / serial_sec * 100:.1f}% of work, parallel)")
print(f"  (layers 2+3 = {(1-p) * 100:.1f}% of work, partially serial)")
print()

for n_workers in [1, 10, 50, 100, 500, 1000]:
    s = amdahl_speedup(p, n_workers)
    wall_sec = serial_sec / s
    util = (n_leaf * 0.05 / wall_sec) * 100  # how busy leaf workers are
    print(f"  {n_workers:>4} workers -> speedup {s:>5.2f}x, wall {wall_sec:>5.2f}s, leaf-util {util:>5.1f}%")
print()
print("Diminishing returns: 1000 workers gives only 17x speedup")
print("(serial reduce/aggregate is the bottleneck).")
print()

# === Chunk-size optimization ===
print("=" * 60)
print("CHUNK-SIZE OPTIMIZATION")
print("=" * 60)
print()
print(f"  {'chunk_mb':>10} | {'n_chunks':>9} | {'parallel_s':>10} | {'sched_s':>9} | {'total_s':>8}")
print("  " + "-" * 60)

data_gb = 100  # 100GB total
for chunk_mb in [10, 25, 50, 100, 250, 500, 1000]:
    n_chunks = data_gb * 1000 // chunk_mb  # convert GB to MB
    parallel_time = 0.001 * n_chunks  # 1ms per chunk (allele count)
    sched_overhead = 0.0005 * n_chunks  # 0.5ms per task scheduling overhead
    total = parallel_time + sched_overhead
    print(f"  {chunk_mb:>10} | {n_chunks:>9} | {parallel_time:>10.2f} | {sched_overhead:>9.2f} | {total:>8.2f}")
print()
print("Sweet spot: ~100MB chunks (balances parallelism vs scheduler overhead)")
print("  Too small: scheduler overhead dominates")
print("  Too large: not enough parallelism (workers idle)")`;

// ============================================================
// SVG Diagrams — custom designed
// ============================================================

function DaskTaskGraphDiagram() {
  // Dask task graph DAG — 3 layers (leaf, reduce, aggregate)
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Network className="h-3.5 w-3.5 text-primary" />
          Dask task graph DAG — 1000 leaves → 22 reduces → 1 aggregate
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 480 280" className="w-full h-auto">
          <defs>
            <marker id="dask-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" />
            </marker>
          </defs>
          {/* Layer 1: 1000 leaf tasks (showing 16) */}
          <text x="60" y="20" textAnchor="middle" fontSize="10" fontWeight="bold" fill="oklch(0.55 0.16 30)">Layer 1: 1000 leaf tasks</text>
          <text x="60" y="32" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">count_alleles(chunk_i)</text>
          {Array.from({ length: 16 }).map((_, i) => {
            const x = (i % 8) * 14 + 10;
            const y = Math.floor(i / 8) * 14 + 45;
            return (
              <g key={i}>
                <rect x={x} y={y} width="12" height="10" fill="oklch(0.55 0.16 30 / 0.3)" stroke="oklch(0.55 0.16 30)" strokeWidth="0.5" />
              </g>
            );
          })}
          <text x="60" y="120" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">... (1000 total)</text>

          {/* Arrows from layer 1 to layer 2 */}
          {[20, 35, 50, 65, 80, 95].map((x, i) => (
            <line key={i} x1={x} y1="125" x2={140 + i * 8} y2="170" stroke="var(--muted-foreground)" strokeWidth="0.5" markerEnd="url(#dask-arrow)" />
          ))}

          {/* Layer 2: 22 reduce tasks */}
          <text x="240" y="160" textAnchor="middle" fontSize="10" fontWeight="bold" fill="oklch(0.55 0.16 165)">Layer 2: 22 reduce tasks</text>
          <text x="240" y="172" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">per-chromosome aggregation</text>
          {Array.from({ length: 11 }).map((_, i) => {
            const x = 170 + i * 14;
            return (
              <g key={i}>
                <rect x={x} y="180" width="12" height="14" fill="oklch(0.55 0.16 165 / 0.3)" stroke="oklch(0.55 0.16 165)" strokeWidth="0.5" />
              </g>
            );
          })}
          <text x="240" y="210" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">... (22 total, 1 per chromosome)</text>

          {/* Arrows from layer 2 to layer 3 */}
          {Array.from({ length: 11 }).map((_, i) => (
            <line key={i} x1={170 + i * 14 + 6} y1="218" x2="380" y2="245" stroke="var(--muted-foreground)" strokeWidth="0.5" markerEnd="url(#dask-arrow)" />
          ))}

          {/* Layer 3: 1 aggregate */}
          <text x="420" y="225" textAnchor="middle" fontSize="10" fontWeight="bold" fill="oklch(0.55 0.16 250)">Layer 3</text>
          <text x="420" y="237" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">final allele freq</text>
          <rect x="395" y="245" width="50" height="20" rx="3" fill="oklch(0.55 0.16 250 / 0.3)" stroke="oklch(0.55 0.16 250)" strokeWidth="1" />
          <text x="420" y="258" textAnchor="middle" fontSize="9" fill="var(--foreground)" fontFamily="monospace">aggregate</text>

          {/* Scheduler annotation */}
          <text x="240" y="278" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">
            Distributed scheduler builds DAG, assigns leaves to workers, triggers reduces on completion, then final aggregate
          </text>
        </svg>
        <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">
          <strong>Dask task graph:</strong> 3-layer DAG for 1000G VCF allele frequency. Layer 1 (1000 leaf tasks,
          embarrassingly parallel) count alleles per chunk. Layer 2 (22 reduce tasks, one per chromosome)
          aggregate per-chromosome counts. Layer 3 (1 task) computes final allele frequency. The distributed
          scheduler builds this DAG, assigns leaves to workers in parallel, triggers reduces as leaves complete,
          and runs the final aggregate. Amdahl's law caps speedup at the serial fraction (layers 2+3).
        </p>
      </div>
    </div>
  );
}

function RayActorModelDiagram() {
  // Ray actor model — persistent state across method calls
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5 text-primary" />
          Ray actor model — persistent state across method calls (vs task-graph)
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 480 240" className="w-full h-auto">
          <defs>
            <marker id="ray-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" />
            </marker>
          </defs>

          {/* Driver */}
          <g>
            <rect x="20" y="100" width="80" height="40" rx="6"
              fill="oklch(0.55 0.16 30 / 0.2)" stroke="oklch(0.55 0.16 30)" strokeWidth="1.5" />
            <text x="60" y="115" textAnchor="middle" fontSize="10" fontWeight="bold" fill="oklch(0.55 0.16 30)">Driver</text>
            <text x="60" y="130" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">submits methods</text>
          </g>

          {/* Object store (shared memory) */}
          <g>
            <rect x="180" y="20" width="120" height="30" rx="3"
              fill="oklch(0.45 0.12 165 / 0.1)" stroke="oklch(0.55 0.16 165)" strokeWidth="1" />
            <text x="240" y="38" textAnchor="middle" fontSize="9" fontWeight="bold" fill="oklch(0.55 0.16 165)">Ray Object Store (shared mem)</text>
            <text x="240" y="48" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">zero-copy between actors</text>
          </g>

          {/* Arrows from driver to object store */}
          <line x1="100" y1="105" x2="180" y2="40" stroke="var(--muted-foreground)" strokeWidth="0.6" markerEnd="url(#ray-arrow)" strokeDasharray="2 2" />

          {/* Actor 1 */}
          <g>
            <rect x="160" y="110" width="90" height="100" rx="6"
              fill="oklch(0.55 0.16 250 / 0.15)" stroke="oklch(0.55 0.16 250)" strokeWidth="1.5" />
            <text x="205" y="125" textAnchor="middle" fontSize="10" fontWeight="bold" fill="oklch(0.55 0.16 250)">Actor 1</text>
            <text x="205" y="138" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">@ray.remote class</text>
            {/* State box */}
            <rect x="170" y="145" width="70" height="40" rx="3" fill="oklch(0.55 0.16 250 / 0.1)" stroke="oklch(0.55 0.16 250)" strokeWidth="0.6" />
            <text x="205" y="158" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">state</text>
            <text x="205" y="170" textAnchor="middle" fontSize="7" fill="var(--foreground)" fontFamily="monospace">positions</text>
            <text x="205" y="180" textAnchor="middle" fontSize="7" fill="var(--foreground)" fontFamily="monospace">velocities</text>
            <text x="205" y="200" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">step 1, 2, 3, ...</text>
            <text x="205" y="208" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.16 250)">persistent</text>
          </g>

          {/* Actor 2 */}
          <g>
            <rect x="270" y="110" width="90" height="100" rx="6"
              fill="oklch(0.55 0.16 250 / 0.15)" stroke="oklch(0.55 0.16 250)" strokeWidth="1.5" />
            <text x="315" y="125" textAnchor="middle" fontSize="10" fontWeight="bold" fill="oklch(0.55 0.16 250)">Actor 2</text>
            <text x="315" y="138" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">@ray.remote class</text>
            <rect x="280" y="145" width="70" height="40" rx="3" fill="oklch(0.55 0.16 250 / 0.1)" stroke="oklch(0.55 0.16 250)" strokeWidth="0.6" />
            <text x="315" y="158" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">state</text>
            <text x="315" y="170" textAnchor="middle" fontSize="7" fill="var(--foreground)" fontFamily="monospace">positions</text>
            <text x="315" y="180" textAnchor="middle" fontSize="7" fill="var(--foreground)" fontFamily="monospace">velocities</text>
            <text x="315" y="200" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">step 1, 2, 3, ...</text>
            <text x="315" y="208" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.16 250)">persistent</text>
          </g>

          {/* Actor 3 */}
          <g>
            <rect x="380" y="110" width="90" height="100" rx="6"
              fill="oklch(0.55 0.16 250 / 0.15)" stroke="oklch(0.55 0.16 250)" strokeWidth="1.5" />
            <text x="425" y="125" textAnchor="middle" fontSize="10" fontWeight="bold" fill="oklch(0.55 0.16 250)">Actor N</text>
            <text x="425" y="138" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">@ray.remote class</text>
            <rect x="390" y="145" width="70" height="40" rx="3" fill="oklch(0.55 0.16 250 / 0.1)" stroke="oklch(0.55 0.16 250)" strokeWidth="0.6" />
            <text x="425" y="158" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">state</text>
            <text x="425" y="170" textAnchor="middle" fontSize="7" fill="var(--foreground)" fontFamily="monospace">positions</text>
            <text x="425" y="180" textAnchor="middle" fontSize="7" fill="var(--foreground)" fontFamily="monospace">velocities</text>
            <text x="425" y="200" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">step 1, 2, 3, ...</text>
            <text x="425" y="208" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.16 250)">persistent</text>
          </g>

          {/* Arrows from driver to actors */}
          <line x1="100" y1="115" x2="160" y2="130" stroke="var(--muted-foreground)" strokeWidth="0.6" markerEnd="url(#ray-arrow)" />
          <line x1="100" y1="120" x2="270" y2="130" stroke="var(--muted-foreground)" strokeWidth="0.6" markerEnd="url(#ray-arrow)" />
          <line x1="100" y1="125" x2="380" y2="130" stroke="var(--muted-foreground)" strokeWidth="0.6" markerEnd="url(#ray-arrow)" />

          {/* Method call labels */}
          <text x="135" y="118" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">step_once()</text>
          <text x="245" y="118" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">step_once()</text>
          <text x="355" y="118" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">step_once()</text>

          {/* Actors share state via object store */}
          <line x1="205" y1="110" x2="240" y2="50" stroke="oklch(0.55 0.16 165)" strokeWidth="0.6" strokeDasharray="2 2" markerEnd="url(#ray-arrow)" />
          <line x1="315" y1="110" x2="240" y2="50" stroke="oklch(0.55 0.16 165)" strokeWidth="0.6" strokeDasharray="2 2" markerEnd="url(#ray-arrow)" />
          <line x1="425" y1="110" x2="240" y2="50" stroke="oklch(0.55 0.16 165)" strokeWidth="0.6" strokeDasharray="2 2" markerEnd="url(#ray-arrow)" />

          <text x="240" y="230" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">
            Each actor persists state across calls — no re-serialization per step (saves 240MB transfer/replica)
          </text>
        </svg>
        <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">
          <strong>Ray actor model:</strong> Each <code className="font-mono">@ray.remote</code> class instance is
          a long-lived actor holding persistent state. Methods execute on the actor's worker, returning futures
          (ObjectRefs). The shared object store enables zero-copy transfer between actors. This beats Dask's
          task-graph model when each step depends on previous state (molecular dynamics, RL agents,
          stateful inference servers) — no re-serialization per step.
        </p>
      </div>
    </div>
  );
}

function AmdahlLawChart() {
  // Amdahl's law curve: speedup vs workers, for p=0.90/0.95/0.99/1.00
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-primary" />
          Amdahl's law — speedup vs workers for parallel fractions p=0.90, 0.95, 0.99, 1.00
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 480 240" className="w-full h-auto">
          {/* Axes */}
          <line x1="40" y1="200" x2="460" y2="200" stroke="var(--muted-foreground)" strokeWidth="0.8" />
          <line x1="40" y1="20" x2="40" y2="200" stroke="var(--muted-foreground)" strokeWidth="0.8" />
          {/* X axis labels (workers) */}
          {[1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024].map((n, i) => {
            const x = 40 + (i * 42);
            return (
              <g key={n}>
                <line x1={x} y1="200" x2={x} y2="204" stroke="var(--muted-foreground)" strokeWidth="0.5" />
                <text x={x} y="214" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)">{n}</text>
              </g>
            );
          })}
          <text x="250" y="230" textAnchor="middle" fontSize="9" fill="var(--foreground)">workers (n)</text>

          {/* Y axis labels (speedup) */}
          {[0, 5, 10, 20, 30, 50].map((s) => {
            const y = 200 - s * 3.5;
            return (
              <g key={s}>
                <line x1="36" y1={y} x2="40" y2={y} stroke="var(--muted-foreground)" strokeWidth="0.5" />
                <text x="34" y={y + 3} textAnchor="end" fontSize="7" fill="var(--muted-foreground)">{s}x</text>
              </g>
            );
          })}
          <text x="15" y="110" textAnchor="middle" fontSize="9" fill="var(--foreground)" transform="rotate(-90 15 110)">speedup (S)</text>

          {/* Plot p=0.90 — max 10x */}
          <path d="M 40 200 L 82 182.5 L 124 168 L 166 154 L 208 142 L 250 132 L 292 124 L 334 118 L 376 114 L 418 111 L 460 109"
            fill="none" stroke="oklch(0.55 0.16 30)" strokeWidth="1.5" />
          {/* p=0.95 — max 20x */}
          <path d="M 40 200 L 82 175 L 124 154 L 166 136.5 L 208 122 L 250 110.5 L 292 102 L 334 95 L 376 90 L 418 86 L 460 84"
            fill="none" stroke="oklch(0.55 0.16 165)" strokeWidth="1.5" />
          {/* p=0.99 — max 100x */}
          <path d="M 40 200 L 82 162 L 124 124 L 166 92 L 208 66 L 250 46 L 292 32 L 334 22 L 376 18 L 418 17 L 460 16"
            fill="none" stroke="oklch(0.55 0.16 250)" strokeWidth="1.5" />
          {/* p=1.00 — linear */}
          <path d="M 40 200 L 82 182 L 124 165 L 166 147 L 208 130 L 250 112 L 292 95 L 334 77 L 376 60 L 418 42 L 460 25"
            fill="none" stroke="oklch(0.65 0.16 30)" strokeWidth="1.5" strokeDasharray="4 2" />

          {/* Legend */}
          <g transform="translate(280, 30)">
            <line x1="0" y1="0" x2="20" y2="0" stroke="oklch(0.55 0.16 30)" strokeWidth="1.5" />
            <text x="24" y="3" fontSize="8" fill="var(--foreground)">p=0.90 (max 10x)</text>
            <line x1="0" y1="12" x2="20" y2="12" stroke="oklch(0.55 0.16 165)" strokeWidth="1.5" />
            <text x="24" y="15" fontSize="8" fill="var(--foreground)">p=0.95 (max 20x)</text>
            <line x1="0" y1="24" x2="20" y2="24" stroke="oklch(0.55 0.16 250)" strokeWidth="1.5" />
            <text x="24" y="27" fontSize="8" fill="var(--foreground)">p=0.99 (max 100x)</text>
            <line x1="0" y1="36" x2="20" y2="36" stroke="oklch(0.65 0.16 30)" strokeWidth="1.5" strokeDasharray="4 2" />
            <text x="24" y="39" fontSize="8" fill="var(--foreground)">p=1.00 (perfect, linear)</text>
          </g>

          {/* Asymptote lines */}
          <line x1="40" y1="165" x2="460" y2="165" stroke="oklch(0.55 0.16 30)" strokeWidth="0.4" strokeDasharray="2 2" />
          <line x1="40" y1="130" x2="460" y2="130" stroke="oklch(0.55 0.16 165)" strokeWidth="0.4" strokeDasharray="2 2" />
          <line x1="40" y1="50" x2="460" y2="50" stroke="oklch(0.55 0.16 250)" strokeWidth="0.4" strokeDasharray="2 2" />

          <text x="240" y="135" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">
            Even with infinite workers, max speedup = 1/(1-p)
          </text>
        </svg>
        <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">
          <strong>Amdahl's law:</strong> S = 1/((1-p) + p/n). With p=0.95 (95% parallel work) and n=100 workers,
          max speedup is 17x — not 100x. The serial 5% (reduce, aggregate, scheduler overhead) is the bottleneck.
          Adding workers past a certain point gives diminishing returns. To get 50x speedup, you need 99% parallel work.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Main page component
// ============================================================

export function DaskRayPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dask + Ray · task graphs · actor model · distributed NumPy · Amdahl's law · multi-GPU training"
        title="Dask + Ray — Distributed Computing for Science"
        description="Dask (2014) and Ray (2017) are Python's two answers to scaling beyond a single machine. Dask uses a task-graph DAG model with a distributed scheduler — ideal for chunked NumPy arrays and embarrassingly parallel workloads. Ray uses an actor model with persistent state — ideal for stateful workloads like RL training and molecular dynamics. Both solve different scaling problems; many teams use both. This page covers Amdahl's law (the hard speedup limit), the DAG vs actor model tradeoff, distributed genomics on Dask, and parallel molecular dynamics on Ray."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Network className="h-3 w-3" /> Dask</Badge>
            <Badge variant="outline" className="gap-1.5"><Cpu className="h-3 w-3" /> Ray</Badge>
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
        title="Mathematical foundations — Amdahl's law, chunk-size optimization, DAG complexity"
        description="The mathematics that bound distributed computing: Amdahl's law caps speedup, chunk-size optimization trades parallelism for scheduler overhead, and DAG complexity determines task-graph execution time."
        icon={<Brain className="h-5 w-5" />}
        badge="mathematics"
      >
        <div className="space-y-4">
          {/* Amdahl's law */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm font-semibold text-primary mb-2">1. Amdahl's Law — Parallel Speedup Limit</p>
            <p className="font-mono text-xs text-primary mb-2">
              S(n) = 1 / ((1-p) + p/n) · max S = 1/(1-p) as n → ∞
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Where <code className="font-mono">p</code> = fraction of work that is parallelizable,
              <code className="font-mono"> n</code> = number of workers. Speedup <code className="font-mono">S(n)</code> is bounded
              by <code className="font-mono">1/(1-p)</code> as n grows. With p=0.95 (95% parallel) and n=100 workers,
              max speedup is 17x — not 100x. The serial 5% (reduce, aggregate, scheduler overhead) is the bottleneck.
              To get 50x speedup, you need 99% parallel work. This is why distributed genomics on 100-worker Dask
              clusters maxes out around 17x — the per-chromosome reduce is serial.
            </p>
          </div>
          {/* Chunk-size optimization */}
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">2. Chunk-size Optimization — the sqrt Rule</p>
            <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 mb-2">
              optimal_chunk = sqrt(total_size / n_workers) · overhead ∝ N_chunks · parallelism ∝ N_chunks/n
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The optimal chunk size balances scheduler overhead (proportional to <code className="font-mono">N_chunks = total_size / chunk_size</code>)
              against parallelism (number of workers that can be kept busy = <code className="font-mono">min(N_chunks, n_workers)</code>).
              The sweet-spot heuristic is <code className="font-mono">chunk = sqrt(total_size / n_workers)</code>:
              for 100 GB / 100 workers → chunk = sqrt(1 GB) ≈ 31 MB → ~3200 chunks (32 per worker, full utilisation
              with low overhead). For 100 GB / 10 workers → chunk ≈ 100 MB → 1000 chunks (100 per worker).
              <strong> Too small (1 MB)</strong>: 100k chunks, 50 s scheduler overhead. <strong> Too large (1 GB)</strong>:
              100 chunks, only 100 workers max parallelism. Smaller is generally safer — Dask default is 128 MB.
            </p>
          </div>
          {/* DAG complexity */}
          <div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-3">
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">3. Task Graph DAG Complexity</p>
            <p className="font-mono text-xs text-violet-600 dark:text-violet-400 mb-2">
              T_DAG = max_path_length(critical_path) · n_tasks = O(V + E) for scheduler
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A Dask DAG has <code className="font-mono">V</code> tasks (vertices) and <code className="font-mono">E</code> dependencies (edges).
              Scheduler complexity is <code className="font-mono">O(V + E)</code> to build and traverse. Execution time
              is bounded by the critical path — the longest chain of dependent tasks. For a 3-layer DAG
              (1000 leaves → 22 reduces → 1 aggregate), critical path is 3 tasks deep. Width = 1000 leaves
              (parallelism). <code className="font-mono">T_exec = max_leaf_time + max_reduce_time + agg_time</code> ≈ 50ms + 50ms + 5ms
              = 105ms wall-clock (with infinite workers). With 100 workers: 105ms × ceil(1000/100) = 1.05s.
            </p>
          </div>
          {/* Gustafson's law */}
          <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3">
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-2">4. Gustafson&apos;s Law — Scaled Speedup (Strong Scaling Counterpoint)</p>
            <p className="font-mono text-xs text-rose-600 dark:text-rose-400 mb-2">
              S(n) = n − α × (n − 1) · where α = serial fraction · for scaled problem size, S grows linearly
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Gustafson&apos;s 1988 rebuttal to Amdahl: real-world problems <strong>scale with parallelism</strong>
              — you don&apos;t fix the problem size; you make it bigger. If serial fraction <code className="font-mono">α</code>
              is fixed, then <code className="font-mono">S(n) = n − α(n−1)</code> grows linearly with n (not bounded
              by <code className="font-mono">1/α</code>). E.g. for α = 0.01 (1% serial), n = 1000 workers gives
              <code className="font-mono"> S = 1000 − 0.01 × 999 ≈ 990×</code> speedup — vs Amdahl&apos;s cap of 100×
              for the same serial fraction. <strong>Genomics uses Gustafson:</strong> 1000 Genomes scaled from
              2500 samples → 80,000 samples → 32× more data on 32× more workers = ~30× throughput.
              Connectomics at Janelia scaled from 1 mm³ to 1 cm³ (1000× volume) on 1000-worker Dask clusters.
              Amdahl governs <em>fixed-size</em> problems; Gustafson governs <em>fixed-time</em> (scaled) problems.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ============================================================ */}
      {/* Custom SVG diagrams */}
      {/* ============================================================ */}
      <SectionCard
        title="Custom SVG diagrams — Dask DAG, Ray actor model, Amdahl's law chart"
        description="Three original diagrams: (1) Dask task-graph DAG showing 1000 leaves → 22 reduces → 1 aggregate, (2) Ray actor model with persistent state and shared object store, (3) Amdahl's law curve showing speedup vs workers for various parallel fractions."
        icon={<Atom className="h-5 w-5" />}
        badge="custom SVG"
      >
        <div className="space-y-4">
          <DaskTaskGraphDiagram />
          <RayActorModelDiagram />
          <AmdahlLawChart />
        </div>
      </SectionCard>

      {/* ============================================================ */}
      {/* Code blocks */}
      {/* ============================================================ */}
      <SectionCard
        title="Production code — Dask distributed + Ray actors"
        description="Four code blocks: Dask distributed scheduler setup, dask.array chunked NumPy, Ray actor model for stateful compute, and Ray Tune for hyperparameter optimization."
        icon={<FileText className="h-5 w-5" />}
        badge="code"
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold mb-2 text-primary">1. Dask distributed cluster + chunked NumPy array</p>
            <CodeBlock
              language="python"
              filename="dask_distributed_array.py"
              code={`from dask.distributed import Client
import dask.array as da
import numpy as np

# Connect to 100-worker Dask cluster
client = Client('dask-scheduler:8786')
print(f"Cluster: {client.nworkers()} workers, {client.nthreads()} threads/worker")

# dask.array = NumPy API but chunked + distributed
# 100GB array: 1000 x 1000 x 1000 float64 = 8GB... scale up
arr = da.random.random((10000, 10000, 1000), chunks=(100, 100, 100))
print(f"dask.array shape: {arr.shape}, chunks: {arr.chunks}")
print(f"Total size: {arr.nbytes / 1e9:.1f} GB across {arr.npartitions} chunks")

# Operations are LAZY — only build task graph, no execution
mean = arr.mean(axis=0)  # shape (10000, 1000), still lazy
std = arr.std(axis=0)
z = (arr - mean) / std   # broadcasted, still lazy

# Trigger computation — distributed scheduler builds DAG, assigns to workers
result = z.compute()  # this triggers the full task graph
print(f"Result shape: {result.shape}, took {result.sum():.2f}")

# SVD on distributed array (LAPACK dgesdd per chunk)
u, s, vt = da.linalg.svd(arr.reshape(10000, 10_000_000))
print(f"Top 5 singular values: {s[:5].compute()}")`}
            />
          </div>
          <div>
            <p className="text-xs font-semibold mb-2 text-primary">2. Dask @delayed for custom task graphs</p>
            <CodeBlock
              language="python"
              filename="dask_delayed.py"
              code={`import dask
from dask import delayed
import numpy as np

@delayed  # decorator makes function return a Future, not value
def count_alleles(chunk_path):
    """Leaf task: count REF/ALT alleles in a VCF chunk."""
    # Simulate VCF loading + counting
    data = np.random.randint(0, 4, size=1_000_000)
    ref_count = (data == 0).sum()
    alt_count = (data != 0).sum()
    return (ref_count, alt_count)

@delayed
def reduce_per_chrom(chrom_id, chunk_results):
    """Reduce task: sum per-chromosome counts."""
    total_ref = sum(r[0] for r in chunk_results)
    total_alt = sum(r[1] for r in chunk_results)
    return (chrom_id, total_ref, total_alt)

@delayed
def final_aggregate(chrom_results):
    """Final task: compute allele frequency across all chromosomes."""
    total_ref = sum(r[1] for r in chrom_results)
    total_alt = sum(r[2] for r in chrom_results)
    return total_alt / (total_ref + total_alt)

# Build task-graph DAG (no execution yet)
chunks = [f"s3://1000g/chr{c}/chunk_{i}.vcf.gz"
          for c in range(1, 23) for i in range(46)]  # 22 chroms × 46 chunks

# Layer 1: 1012 leaf tasks (parallel)
leaf_tasks = [count_alleles(c) for c in chunks]

# Layer 2: 22 reduce tasks (per-chromosome aggregation)
chrom_chunks = {c: [] for c in range(1, 23)}
for i, c in enumerate(chunks):
    chrom = int(c.split('chr')[1].split('/')[0])
    chrom_chunks[chrom].append(leaf_tasks[i])
reduce_tasks = [reduce_per_chrom(c, chrom_chunks[c]) for c in range(1, 23)]

# Layer 3: 1 aggregate
final_freq = final_aggregate(reduce_tasks)

# Now trigger the DAG — distributed scheduler executes it
print(f"DAG: {len(leaf_tasks)} leaves + {len(reduce_tasks)} reduces + 1 aggregate")
result = final_freq.compute()
print(f"Final allele frequency: {result:.4f}")
print(f"Tasks executed: {len(dask.report())}")  # 1035 tasks total`}
            />
          </div>
          <div>
            <p className="text-xs font-semibold mb-2 text-primary">3. Ray actor model for molecular dynamics</p>
            <CodeBlock
              language="python"
              filename="ray_md_actors.py"
              code={`import ray
import numpy as np

ray.init(address='ray://cluster:10001')  # connect to Ray cluster

@ray.remote(num_cpus=1)
class MDReplicaActor:
    """Persistent state: positions, velocities across many timesteps."""
    def __init__(self, replica_id, n_atoms=1000):
        self.replica_id = replica_id
        self.n_atoms = n_atoms
        self.step = 0
        self.positions = np.random.randn(n_atoms, 3).astype(np.float32)
        self.velocities = np.random.randn(n_atoms, 3).astype(np.float32) * 0.1

    def step_once(self, dt=0.001):
        """Velocity Verlet: x[t+1] = x[t] + v[t]*dt + 0.5*a[t]*dt^2"""
        forces = self._compute_forces()  # Lennard-Jones, O(N^2)
        self.positions += self.velocities * dt + 0.5 * forces * dt * dt
        self.velocities += 0.5 * forces * dt
        self.step += 1
        ke = (self.velocities ** 2).sum() * 0.5
        return ke

    def _compute_forces(self):
        """Lennard-Jones: F = 24e[(r^-7) - 2(r^-13)] per pair."""
        # Vectorized: distance matrix + broadcasting
        diff = self.positions[:, np.newaxis, :] - self.positions[np.newaxis, :, :]
        r2 = (diff ** 2).sum(-1)
        np.fill_diagonal(r2, 1.0)  # avoid div-by-zero
        r6 = r2 ** 3
        r12 = r6 ** 2
        f_mag = 24.0 * (1.0 / r6 - 2.0 / r12)
        np.fill_diagonal(f_mag, 0.0)
        forces = (f_mag[:, :, np.newaxis] * diff / np.sqrt(r2)[:, :, np.newaxis]).sum(axis=1)
        return forces

# Create 10 persistent actors (one per MD replica)
actors = [MDReplicaActor.remote(i, n_atoms=1000) for i in range(10)]
print(f"Created {len(actors)} Ray actors (persistent state)")

# Run 10000 timesteps — each actor holds state across calls
# Returns futures (ObjectRefs) — non-blocking
for ts in range(10000):
    futures = [actor.step_once.remote(0.001) for actor in actors]
    if ts % 1000 == 0:
        # Synchronize to get kinetic energy report
        kes = ray.get(futures)
        print(f"Step {ts}: KE per replica = {[f'{ke:.2f}' for ke in kes[:3]]}...")

print("Done: 10 replicas × 10000 steps = 100k MD steps")
print(f"Actor model advantage: 1000-atom state persisted across 10000 calls = 24MB/replica saved vs task-graph")`}
            />
          </div>
          <div>
            <p className="text-xs font-semibold mb-2 text-primary">4. Ray Tune for hyperparameter optimization (HPO)</p>
            <CodeBlock
              language="python"
              filename="ray_tune_hpo.py"
              code={`import ray
from ray import tune
from ray.tune.search.hyperopt import HyperOptSearch
from ray.tune.schedulers import ASHAScheduler
import torch
import torch.nn as nn

# Ray Tune: distributed hyperparameter search
# Sample from config space, train in parallel, prune bad trials early

def train_genomics_cnn(config):
    """Training function for a genomics variant caller CNN."""
    # config: {lr, batch_size, n_layers, dropout}
    model = nn.Sequential(
        nn.Conv1d(4, config['n_filters'], 11),  # 4 DNA bases (ACGT)
        nn.ReLU(),
        nn.Flatten(),
        nn.Linear(config['n_filters'] * 140, 2),  # REF vs ALT
    ).cuda()

    optimizer = torch.optim.Adam(model.parameters(), lr=config['lr'])

    for epoch in range(10):
        # Train one epoch (synthetic data)
        for batch in range(100):
            x = torch.randn(config['batch_size'], 4, 150).cuda()
            y = torch.randint(0, 2, (config['batch_size'],)).cuda()
            loss = nn.functional.cross_entropy(model(x), y)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

        # Report to Ray Tune for pruning decision
        val_acc = 0.5 + 0.3 * epoch / 10  # placeholder
        tune.report({'val_acc': val_acc, 'epoch': epoch})

# Hyperparameter search space
search_space = {
    'lr': tune.loguniform(1e-5, 1e-2),
    'batch_size': tune.choice([32, 64, 128, 256]),
    'n_filters': tune.choice([32, 64, 128, 256]),
}

# ASHA scheduler: prune underperforming trials early (early stopping)
asha = ASHAScheduler(time_attr='epoch', max_t=10, grace_period=2,
                     reduction_factor=2)

# HyperOpt search: Bayesian HPO via TPE (Tree-structured Parzen Estimator)
hyperopt = HyperOptSearch(metric='val_acc', mode='max')

# Run 100 trials in parallel on Ray cluster
tuner = tune.Tuner(
    tune.with_resources(train_genomics_cnn, {'gpu': 1}),  # 1 GPU per trial
    param_space=search_space,
    tune_config=tune.TuneConfig(
        num_samples=100,
        scheduler=asha,
        search_alg=hyperopt,
    ),
)
results = tuner.fit()
print(f"Best trial: {results.best_config}")
print(f"Best val_acc: {results.best_metrics['val_acc']:.4f}")`}
            />
          </div>
        </div>
      </SectionCard>

      {/* ============================================================ */}
      {/* Pyodide demo */}
      {/* ============================================================ */}
      <SectionCard
        title="Try it: Amdahl's law + Dask task-graph simulation (Pyodide)"
        description="Pure-Python simulation of Amdahl's law (S = 1/((1-p)+p/n)) for various parallel fractions, then a Dask task-graph DAG simulation for distributed genomics on 1000G VCF. Includes chunk-size optimization tradeoff (too small = scheduler overhead, too large = no parallelism)."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={AMDAHL_DEMO} buttonLabel="Run Amdahl + Dask DAG simulation (Pyodide)" />
      </SectionCard>

      {/* ============================================================ */}
      {/* Comparison table */}
      {/* ============================================================ */}
      <SectionCard
        title="Dask vs Ray vs Spark vs MPI — distributed compute comparison"
        description="Four distributed computing frameworks compared. Dask is Python-native with NumPy/Pandas API. Ray is actor-model focused for ML/RL. Spark is JVM-native with broader ecosystem. MPI is the low-level HPC standard. Each wins in different niches."
        icon={<Boxes className="h-5 w-5" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="text-left p-2 font-semibold">Feature</th>
                <th className="text-left p-2 font-semibold text-primary">Dask</th>
                <th className="text-left p-2 font-semibold">Ray</th>
                <th className="text-left p-2 font-semibold">Spark</th>
                <th className="text-left p-2 font-semibold">MPI</th>
              </tr>
            </thead>
            <tbody>
              {[
                { f: "Native language", d: "Python (NumPy/Pandas API)", r: "Python (actor API)", s: "Scala/Java (PySpark)", m: "C/C++/Fortran" },
                { f: "Programming model", d: "Task-graph DAG (lazy)", r: "Actor model (stateful)", s: "RDD/DataFrame (lazy)", m: "SPMD (message passing)" },
                { f: "Best for", d: "Chunked NumPy, genomics", r: "RL, MD, stateful ML", s: "ETL, SQL, batch ML", m: "HPC simulations (CFD, MD)" },
                { f: "Cluster size", d: "1000s of workers", r: "1000s of GPUs", s: "1000s of nodes", m: "100k+ cores (TOP500)" },
                { f: "Latency", d: "~ms (task overhead)", r: "~ms (actor dispatch)", s: "~100ms (JVM)", m: "μs (zero-copy)" },
                { f: "Ecosystem", d: "dask-ml, dask-xarray", r: "Ray Tune/Serve/RLlib", s: "MLlib, Structured Streaming", m: "PETSc, Trilinos" },
              ].map((row, i) => (
                <tr key={row.f} className={i % 2 === 0 ? "bg-card" : "bg-muted/10"}>
                  <td className="p-2 font-semibold">{row.f}</td>
                  <td className="p-2 text-primary">{row.d}</td>
                  <td className="p-2 text-muted-foreground">{row.r}</td>
                  <td className="p-2 text-muted-foreground">{row.s}</td>
                  <td className="p-2 text-muted-foreground">{row.m}</td>
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
        title="Why Dask + Ray evolved — shortfalls of single-node Python"
        description="Before Dask (2014) and Ray (2017), Python couldn't scale beyond a single machine. PySpark existed but was JVM-based and awkward for NumPy users. Dask and Ray both came from academia to solve different scaling problems."
        icon={<History className="h-5 w-5" />}
        badge="Why Dask/Ray"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: NumPy arrays limited to single-node RAM.</strong> A 100GB
            genomics VCF doesn't fit on one machine's RAM. Pre-Dask, you had to split files manually and write custom multiprocessing code. Dask's <code className="font-mono">dask.array</code> provides the NumPy API on chunked, distributed arrays — same code, but runs on 1000-worker clusters. Now <code className="font-mono">da.random.random((10000, 10000, 1000))</code> works on 100GB of distributed memory.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: PySpark was JVM-first, awkward for NumPy.</strong> PySpark
            exists but serializes Python objects via JVM, causing 5-10x overhead for NumPy workloads. The Java ecosystem doesn't understand NumPy arrays natively. Dask was built Python-first — its scheduler, object store, and workers all run Python natively. <code className="font-mono">dask.array</code> never leaves Python's GIL-aware memory model.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: No persistent-state distributed actors.</strong> Dask's
            task-graph model is great for embarrassingly parallel work, but stateful workloads (RL agents, MD simulations, model serving) need persistent state across many calls. Ray introduced the <code className="font-mono">@ray.remote</code> actor model — each actor is a long-lived Python process holding state. <code className="font-mono">actor.step_once.remote()</code> calls execute on the actor's worker, returning futures. This is impossible in Dask without re-serializing state per step.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: No native multi-GPU training.</strong> PyTorch's
            <code className="font-mono">DataParallel</code> only handles single-node multi-GPU. Ray's <code className="font-mono">RayTrain</code>
            and <code className="font-mono">RayTrain + Ray Tune</code> handle distributed multi-GPU across nodes — used at OpenAI for GPT-3 training, at Anthropic for Claude. Dask doesn't have native GPU training (you'd use dask-cudf but it's data-focused, not training-focused).
          </p>
        </div>
      </SectionCard>

      {/* ============================================================ */}
      {/* Unique features */}
      {/* ============================================================ */}
      <SectionCard
        title="Truly unique Dask + Ray features"
        description="Four features that are genuinely unique to Dask and Ray — structural differentiators that other distributed frameworks lack."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. Dask: NumPy/Pandas API drop-in</p>
            <p className="text-muted-foreground"><code className="font-mono">import dask.array as da; x = da.random.random((10000,10000))</code> — the same NumPy code runs on a single laptop or a 1000-worker cluster. <strong>PySpark requires a different API (DataFrame).</strong> Dask's lazy task graph builds the DAG, then computes on demand.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Ray: Actor model with shared object store</p>
            <p className="text-muted-foreground">Ray's actors persist state across method calls — essential for RL agents, MD simulations, model serving. <strong>Shared plasma store enables zero-copy object transfer</strong> between actors. Dask has no equivalent — its task-graph model re-serializes state per task.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Ray: Tune (HPO) + Serve (deployment) + RLlib</p>
            <p className="text-muted-foreground">Ray bundles Tune (distributed HPO with ASHA pruning + Bayesian search), Serve (model deployment with autoscaling), and RLlib (distributed RL training). <strong>One framework for the full ML lifecycle.</strong> Dask has dask-ml but it's basic compared to Ray's MLlib equivalent.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Both: Python-native scheduler</p>
            <p className="text-muted-foreground">Both Dask and Ray schedulers are Python-native — no JVM overhead like Spark, no compilation like MPI. <strong>Tasks dispatch in &lt;1ms (vs Spark's ~100ms).</strong> This makes them ideal for interactive workloads (Jupyter notebooks) that can't tolerate JVM latency.</p>
          </div>
        </div>
      </SectionCard>

      {/* ============================================================ */}
      {/* Dataset examples */}
      {/* ============================================================ */}
      <SectionCard
        title="2 scientific dataset examples — distributed genomics + parallel MD"
        description="Two distributed scientific computing scenarios. Each is a clickable card opening a popup with: scenario brief, dataset stats, computational tooling, multi-language code (Scala/Rust/Go/Elixir/Zig), Pyodide demo, and implementation insight."
        icon={<Database className="h-5 w-5" />}
        badge="2 examples × 5 langs"
      >
        <DatasetCards
          examples={DASK_RAY_SCIENCE_EXAMPLES}
          intro="Distributed 1000 Genomes on Dask array (100GB chunked VCF, Amdahl's law), parallel molecular dynamics via Ray actors (Velocity Verlet + Lennard-Jones). Each card has Scala/Rust/Go/Elixir/Zig code."
        />
      </SectionCard>

      {/* ============================================================ */}
      {/* Computational tooling */}
      {/* ============================================================ */}
      <SectionCard
        title="Computational tooling — Dask + Ray ecosystem"
        description="The libraries that plug into Dask and Ray for distributed scientific computing."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Network className="h-3.5 w-3.5 text-primary" /> Dask ecosystem</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>dask.distributed</strong> — distributed scheduler + worker pool</li>
              <li>• <strong>dask.array</strong> — chunked NumPy (parallel GEMM, SVD)</li>
              <li>• <strong>dask.dataframe</strong> — chunked Pandas (100GB+ CSV)</li>
              <li>• <strong>dask-cudf</strong> — GPU DataFrames via RAPIDS</li>
              <li>• <strong>dask-ml</strong> — distributed scikit-learn (IncrementalPCA, KMeans)</li>
              <li>• <strong>dask-xarray</strong> — climate/geo N-D arrays</li>
              <li>• <strong>dask-labextension</strong> — JupyterLab integration</li>
              <li>• <strong>dask-kubernetes</strong> — Kubernetes-native Dask clusters</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Ray ecosystem</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>ray.remote</strong> — actor + task parallelism primitives</li>
              <li>• <strong>Ray Tune</strong> — distributed HPO (ASHA, HyperOpt, Optuna)</li>
              <li>• <strong>Ray Serve</strong> — model deployment with autoscaling</li>
              <li>• <strong>Ray Train</strong> — distributed multi-GPU training</li>
              <li>• <strong>RLlib</strong> — distributed RL (PPO, IMPALA, A3C, APPO)</li>
              <li>• <strong>Ray Datasets</strong> — distributed DataFrames (Arrow-backed)</li>
              <li>• <strong>Ray Lightning</strong> — PyTorch Lightning on Ray</li>
              <li>• <strong>modin</strong> — Pandas API on Ray (drop-in replacement)</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* ============================================================ */}
      {/* Research + case studies */}
      {/* ============================================================ */}
      <SectionCard
        title="Research + case studies — distributed scientific computing"
        description="The papers and production deployments that defined Dask and Ray as the standard for distributed Python computing."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Dask (Rocklin, 2014):</strong> "Dask: Parallel Computation with
            Task Scheduling" — Matthew Rocklin's PhD work. Key insight: NumPy's stride model extends naturally to
            chunked distributed arrays. The task-graph DAG model lets arbitrary Python functions run in parallel
            without changing the API. Adopted by Continuum Analytics (now Anaconda), became Apache-adjacent project.
          </p>
          <p>
            <strong className="text-foreground/80">Ray (Moritz, 2018):</strong> "Ray: A Distributed Framework for
            Emerging AI Applications" — UC Berkeley RISELab paper. Key insight: actor model with shared object
            store solves the stateful workload problem (RL, MD, serving). Adopted by Anyscale (founded 2019 by
            Ray creators). Now powers OpenAI, Ant Group, Shopify.
          </p>
          <p>
            <strong className="text-foreground/80">Production at Janelia Research Campus (connectomics):</strong> The
            Janelia FlyLight team uses Dask to process ~500TB of microscopy data for connectome reconstruction.
            A 1000-worker Dask cluster chunks the volumetric data, runs distributed 3D FFTs for image alignment,
            and reduces per-region neuron counts. The complete fly connectome (Janelia 2024) was computed on Dask.
          </p>
          <p>
            <strong className="text-foreground/80">Production at OpenAI (GPT-3, 2020):</strong> OpenAI trained GPT-3
            (175B parameters) on Ray — 10,000 GPUs across multiple clusters. Ray Train handles the distributed
            training (data-parallel + model-parallel), Ray Tune handles hyperparameter search. Ray's actor model
            keeps the trainer state persistent across checkpoint saves. Without Ray's actor model, training a
            175B model across 10k GPUs would be intractable.
          </p>
          <p>
            <strong className="text-foreground/80">Production at Ant Group (RL, 2021):</strong> Ant Group uses RLlib
            (on Ray) for fraud detection and recommendation — 100k+ RL agents trained in parallel. The actor model
            lets each agent hold its state across millions of decision steps. RLlib's distributed PPO scales to
            1000s of CPUs and 100s of GPUs. This powers Ant's Alipay fraud detection (real-time).
          </p>
          <p>
            <strong className="text-foreground/80">Production at LLNL (Atmospheric modeling):</strong> Lawrence
            Livermore National Lab uses Dask for atmospheric climate model post-processing — 100TB simulation
            outputs chunked into dask.array, processed via dask.distributed on 500-worker clusters. The chunked
            NumPy API means climate scientists use the same code they used on their laptops, just scaled to
            petabyte-scale datasets.
          </p>
        </div>
      </SectionCard>

      {/* ============================================================ */}
      {/* Deeper-thought insight */}
      {/* ============================================================ */}
      <SectionCard
        title="My deeper thought: Dask vs Ray IS task-graph vs actor model"
        description="The unifying view: Dask and Ray represent two complementary distributed programming models — task-graph (stateless) vs actor (stateful). Most teams need both."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Dask vs Ray IS task-graph vs actor model.</strong> Dask's task-graph
            DAG (stateless: each task takes inputs, returns outputs, no memory between) is ideal for embarrassingly
            parallel work — chunked arrays, per-file transformations, batch reductions. Ray's actor model (stateful:
            each actor holds state across many method calls) is ideal for sequential work — RL training, MD simulation,
            model serving. <strong>The choice depends on whether your workload is stateless or stateful.</strong> 1000G
            allele frequency: stateless → Dask wins. 10000-step MD simulation: stateful → Ray wins. Most modern data
            teams use both: Dask for ETL/batch, Ray for ML training/serving.
          </p>
          <p>
            <strong className="text-foreground/80">Amdahl's law IS the universal scaling limit.</strong> No matter how
            many workers you add, the serial fraction caps speedup at 1/(1-p). With 95% parallel work, max speedup
            is 20x — even on infinite workers. This is why distributed genomics on 100-worker Dask clusters maxes
            out at ~17x: the per-chromosome reduce is serial. The only way to break Amdahl's law is to make MORE of
            the work parallel — better algorithms, smaller reduces, finer-grained tasks. This is why Dask invests
            heavily in chunk-size optimization (smaller chunks = more parallel leaves = higher p).
          </p>
          <p>
            <strong className="text-foreground/80">Ray's actor model IS the right abstraction for ML.</strong> ML
            workloads are inherently stateful: model weights change across batches, RL agents persist across
            episodes, MD simulations persist across timesteps. The actor model captures this perfectly — each
            <code className="font-mono"> @ray.remote</code> actor is a long-lived process holding state. The shared
            object store enables zero-copy transfer between actors. <strong>This is why Ray won the ML training
            market — Dask's task-graph model would re-serialize weights every batch.</strong> OpenAI uses Ray for
            GPT training because of this exact property.
          </p>
          <p>
            <strong className="text-foreground/80">Distributed genomics on Dask IS the canonical wet-lab-to-publication story.</strong>
            The 1000 Genomes Project (3B SNPs across 2504 individuals) cannot fit on one machine. Dask's chunked
            array model lets a single researcher analyze it from a Jupyter notebook — the same NumPy code they used
            on smaller data, just running on 100 workers. The result: PCA plots for population structure, allele
            frequency tables for GWAS, variant calls for clinical reports. <strong>From wet-lab sequencer → Dask
            distributed processing → matplotlib publication figure</strong> — all from a laptop. This is what
            "democratized distributed computing" actually means.
          </p>
        </div>
      </SectionCard>


      <DeeperThoughtSection pageTitle="Dask Ray">
        <DeeperThought title="Dask IS pandas at scale — and it's the right abstraction" connectedTo="ADR-001 (platform architecture)">
          <p>{"Dask's DataFrame API mirrors Pandas — groupby, merge, join, filter. The difference: Dask partitions the DataFrame into chunks and processes them in parallel across a cluster. A 100GB DataFrame that doesn't fit in memory becomes 100 1GB partitions that fit. The user writes the SAME Pandas code; Dask handles the parallelism. Dask IS Pandas with a distributed backend — the same pattern as NumPy with a GPU backend."}</p>
        </DeeperThought>
        <DeeperThought title="Ray IS the universal distributed computing framework — and it's the right design" connectedTo="ADR-034 (ESM-2 + AlphaFold2)">
          <p>{"Ray provides: task parallelism (remote functions), actor model (stateful workers), and object store (distributed shared memory). The SAME framework runs: RL training (RLlib), hyperparameter tuning (Tune), model serving (Serve), and data processing (Datasets). Ray IS the universal backend for Python distributed computing — the same pattern as Spark for the JVM. The math (task scheduling + actor model + shared memory) IS the same; the language (Python) differs."}</p>
        </DeeperThought>
        <DeeperThought title="Dask vs Ray IS task-graph vs actor-model — and both are valid" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"Dask uses a task graph (build DAG → schedule → execute). Ray uses an actor model (create remote actors → send messages → receive results). Dask's approach is better for data-parallel workloads (groupby, join) where the DAG is known upfront. Ray's approach is better for stateful workloads (RL training, model serving) where the computation is dynamic. The trade-off (static DAG vs dynamic actors) IS the same as Spark vs Flink. Both are valid; the workload determines the winner."}</p>
        </DeeperThought>
        <DeeperThought title="Dask's task graph IS lazy evaluation — and it's the right pattern" connectedTo="ADR-022 (pgvector for variant embeddings)">
          <p>{"Dask builds a task graph (DAG) when you call df.groupby().mean() — but doesn't execute it. Execution only happens when you call .compute(). This IS the SAME pattern as Spark's lazy evaluation (transformations build the DAG, actions trigger execution). The benefit: the scheduler can optimize the entire DAG before executing — reorder, fuse, prune. Lazy evaluation IS the right pattern for data processing because it enables whole-query optimization."}</p>
        </DeeperThought>
        <DeeperThought title="Ray Serve IS the model serving layer — and it's the production pattern" connectedTo="ADR-001 (platform architecture)">
          <p>{"Ray Serve deploys ML models as HTTP endpoints. Each model runs as a Ray actor (stateful, auto-scaled). The SAME Ray cluster that trained the model (RLlib/Tune) also serves it (Serve). This IS the SAME pattern as a Kubernetes deployment: the cluster runs both training (jobs) and serving (deployments). Ray IS Kubernetes for Python ML — the pattern (cluster + jobs + deployments) IS the same; the implementation (Ray vs K8s) differs."}</p>
        </DeeperThought>
      </DeeperThoughtSection>
      <RelatedTopics topics={[
        { id: "numpy-scipy" as const, reason: "Dask.array = distributed NumPy" },
        { id: "gpu-computing" as const, reason: "Ray Train scales to multi-GPU clusters" },
        { id: "jupyter" as const, reason: "JupyterHub + Dask = interactive distributed compute" },
        { id: "distributed-training" as const, reason: "Multi-GPU/multi-node training (Ray Train + DeepSpeed)" },
        { id: "bioinformatics" as const, reason: "Distributed genomics on Dask arrays" },
        { id: "molecular-modelling" as const, reason: "Parallel MD via Ray actors" },
        { id: "mlflow-deep-dive" as const, reason: "Ray Tune integrates with MLflow for HPO tracking" },
        { id: "spark-streaming" as const, reason: "Spark vs Dask for streaming workloads" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("numpy-scipy")} className="text-sm text-primary hover:underline">
          &rarr; NumPy/SciPy (the foundation Dask extends)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("gpu-computing")} className="text-sm text-primary hover:underline">
          &rarr; GPU Computing (CUDA + cuDF + Ray Train)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("jupyter")} className="text-sm text-primary hover:underline">
          &rarr; Jupyter (interactive distributed compute)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("distributed-training")} className="text-sm text-primary hover:underline">
          &rarr; Distributed Training
        </Link>
      </div>
    </div>
  );
}
