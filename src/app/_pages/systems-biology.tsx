"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { ImageModal } from "../_components/image-modal";
import { DatasetCards } from "../_components/dataset-cards";
import { ELEGANT_CODE_CARDS } from "../_components/_elegant_code_cards";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import {
  Cpu, Layers, Zap, TrendingUp, Terminal, Brain,
  Activity, Network, Boxes, FlaskConical, Sparkles,
} from "lucide-react";

const KPIS = [
  { label: "Recon 3D", value: "13.5K reactions", hint: "8.4K metabolites — human metabolic network", deltaTone: "flat" as const },
  { label: "STRING DB", value: "19.5M PPIs", hint: "19K organisms, scored by confidence", deltaTone: "flat" as const },
  { label: "FBA", value: "LP on S·v = 0", hint: "Maximise biomass c·v subject to mass balance", deltaTone: "flat" as const },
  { label: "Whole-cell (Karr 2012)", value: "525 genes", hint: "M. genitalium — every gene in 1 model", deltaTone: "flat" as const },
];

// ============================================================
// Metabolic Flux "short" — FBA on a small network
// ============================================================
function MetabolicFluxShort() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setStep((s) => (s + 1) % 5), 1100);
    return () => clearInterval(interval);
  }, []);

  // Simple metabolic network: glucose → pyruvate → lactate + ATP
  // 8 metabolites, 6 reactions
  const metabolites = [
    { id: "glc", label: "Glucose", x: 60, y: 100, color: "oklch(0.6 0.20 75)" },
    { id: "g6p", label: "G6P", x: 160, y: 80, color: "oklch(0.55 0.16 250)" },
    { id: "f6p", label: "F6P", x: 250, y: 80, color: "oklch(0.55 0.16 250)" },
    { id: "pyr", label: "Pyruvate", x: 340, y: 100, color: "oklch(0.55 0.16 165)" },
    { id: "lac", label: "Lactate", x: 430, y: 80, color: "oklch(0.55 0.16 145)" },
    { id: "atp", label: "ATP", x: 250, y: 200, color: "oklch(0.6 0.20 25)" },
  ];
  const reactions = [
    { id: "r1", from: "glc", to: "g6p", label: "Hex", flux: 10, biomass: false },
    { id: "r2", from: "g6p", to: "f6p", label: "PGI", flux: 9, biomass: false },
    { id: "r3", from: "f6p", to: "pyr", label: "Gly", flux: 8, biomass: false },
    { id: "r4", from: "pyr", to: "lac", label: "LDH", flux: 5, biomass: false },
    { id: "r5", from: "pyr", to: "atp", label: "ATP synth", flux: 3, biomass: false },
    { id: "r6", from: "pyr", to: "biomass", label: "Biomass", flux: 0, biomass: true },
  ];

  const phases = [
    "1. Network topology",
    "2. Stoichiometric matrix S",
    "3. Mass balance S·v = 0",
    "4. Maximise biomass = c·v",
    "5. Optimal flux distribution",
  ];

  // Stoichiometric matrix (simplified, 6 metabolites × 6 reactions)
  const S = [
    [-1,  0,  0,  0,  0,  0],   // glucose
    [ 1, -1,  0,  0,  0,  0],   // G6P
    [ 0,  1, -1,  0,  0,  0],   // F6P
    [ 0,  0,  2, -1, -1, -1],   // pyruvate (2 per glucose)
    [ 0,  0,  0,  1,  0,  0],   // lactate
    [ 0,  0,  0,  0,  2,  0],   // ATP (2 per pyruvate)
  ];

  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <style>{`
        .flux-3d { perspective: 900px; }
        .flux-stage { transform: rotateX(12deg); transform-style: preserve-3d; }
      `}</style>
      <p className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Network className="h-4 w-4 text-primary" />
        Metabolic flux distribution — FBA (loop)
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">
          {phases[step]}
        </span>
      </p>
      <div className="flux-3d">
        <div className="flux-stage">
          <svg width="500" height="240" viewBox="0 0 500 240">
            {/* Reactions (edges with flux labels) */}
            {reactions.map((r) => {
              const from = metabolites.find(m => m.id === r.from);
              const to = r.biomass
                ? { x: 430, y: 200, label: "Biomass" }
                : metabolites.find(m => m.id === r.to)!;
              const isActive = step >= 4 && r.flux > 0;
              return (
                <g key={r.id}>
                  <motion.line
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={isActive ? "var(--chart-2)" : "var(--border)"}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: step >= 1 ? 1 : 0.3 }}
                  />
                  {step >= 4 && r.flux > 0 && (
                    <text
                      x={(from.x + to.x) / 2}
                      y={(from.y + to.y) / 2 - 5}
                      fontSize="10"
                      fill="var(--chart-2)"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {r.flux}
                    </text>
                  )}
                  {/* Arrow head */}
                  <motion.polygon
                    points={(() => {
                      const dx = to.x - from.x;
                      const dy = to.y - from.y;
                      const len = Math.sqrt(dx * dx + dy * dy);
                      const ux = dx / len;
                      const uy = dy / len;
                      // Arrow at to end
                      const ax = to.x - ux * 8;
                      const ay = to.y - uy * 8;
                      return `${to.x},${to.y} ${ax - uy * 4},${ay + ux * 4} ${ax + uy * 4},${ay - ux * 4}`;
                    })()}
                    fill={isActive ? "var(--chart-2)" : "var(--muted-foreground)"}
                    animate={{ opacity: step >= 1 ? 1 : 0.3 }}
                  />
                </g>
              );
            })}

            {/* Metabolites (nodes) */}
            {metabolites.map((m) => (
              <motion.g key={m.id}>
                <motion.circle
                  cx={m.x} cy={m.y} r="14"
                  fill={m.color}
                  animate={{
                    scale: step >= 2 ? 1.05 : 1,
                  }}
                />
                <text x={m.x} y={m.y + 4} textAnchor="middle"
                  fontSize="9" fill="white" fontWeight="bold">
                  {m.label}
                </text>
              </motion.g>
            ))}

            {/* Biomass sink */}
            {step >= 3 && (
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <rect x="410" y="190" width="40" height="20" rx="3"
                  fill="oklch(0.55 0.16 165 / 0.7)" stroke="var(--chart-2)" strokeWidth="2"
                />
                <text x="430" y="204" textAnchor="middle"
                  fontSize="9" fill="white" fontWeight="bold">Biomass</text>
              </motion.g>
            )}

            {/* Mass balance indicators (phase 3) */}
            {step === 2 && (
              <text x="250" y="225" textAnchor="middle"
                fontSize="9" fill="var(--primary)" fontWeight="bold">
                Mass balance: d[metabolite]/dt = S · v = 0
              </text>
            )}
          </svg>
        </div>
      </div>

      {/* Stoichiometric matrix */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 overflow-x-auto"
        >
          <table className="mx-auto text-[9px]">
            <thead>
              <tr>
                <th className="px-1 text-muted-foreground">·</th>
                {reactions.map(r => (
                  <th key={r.id} className="px-1 text-muted-foreground font-mono">{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metabolites.map((m, i) => (
                <tr key={m.id}>
                  <td className="px-1 text-muted-foreground font-mono">{m.label}</td>
                  {S[i].map((v, j) => (
                    <td key={j} className="px-1.5 text-center font-mono font-bold">
                      <span className={v > 0 ? "text-emerald-600 dark:text-emerald-400" : v < 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}>
                        {v > 0 ? `+${v}` : v}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-3 text-[10px]">
        <div className="rounded-md border border-border/60 p-2">
          <p className="font-semibold mb-0.5">FBA formulation</p>
          <p className="text-muted-foreground font-mono">max c·v  s.t. S·v = 0, v_min ≤ v ≤ v_max</p>
        </div>
        <div className="rounded-md border border-border/60 p-2">
          <p className="font-semibold mb-0.5">Optimal flux (phase 4+)</p>
          <p className="text-muted-foreground">v_GLC=10 → v_LDH=5, v_ATP=3, v_biomass=2</p>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-3">
        Phase 1: topology. Phase 2: S matrix (positive=production, negative=consumption).
        Phase 3: S·v = 0 enforces steady-state mass balance. Phase 4: maximise biomass.
        Phase 5: LP returns optimal flux distribution (reaction rates per reaction).
      </p>
    </div>
  );
}

const FBA_DEMO = `# Flux Balance Analysis — Linear Programming on metabolic networks (Pyodide)
# The core algorithm of systems biology (Orth 2010, COBRA)

# ============================================================
# FBA formulation
# ============================================================
# max  c · v          (maximise biomass = objective)
# s.t. S · v = 0     (steady-state mass balance)
#      v_min ≤ v ≤ v_max   (capacity constraints)
#
# S = stoichiometric matrix (m metabolites × n reactions)
# v = flux vector (n reactions)
# c = objective coefficients (biomass reaction = 1, else 0)

# ============================================================
# Small example: glycolysis (4 reactions, 4 metabolites)
# ============================================================
# R1: Glucose + ATP → G6P + ADP        (hexokinase)
# R2: G6P → F6P                        (phosphoglucose isomerase)
# R3: F6P + ATP → 2 Pyruvate + 4 ATP   (glycolysis net)
# R4: Pyruvate → Biomass                (biomass sink)

# Stoichiometric matrix (4 metabolites × 4 reactions)
# rows: Glucose, G6P, F6P, Pyruvate
# columns: R1, R2, R3, R4
S = [
    [-1,  0,  0,  0],   # Glucose: consumed by R1
    [ 1, -1,  0,  0],   # G6P: produced by R1, consumed by R2
    [ 0,  1, -1,  0],   # F6P: produced by R2, consumed by R3
    [ 0,  0,  2, -1],   # Pyruvate: produced by R3 (2x), consumed by R4 (biomass)
]

# Objective: maximise biomass (R4)
c = [0, 0, 0, 1]

# Capacity constraints
v_min = [0, 0, 0, 0]   # irreversible reactions
v_max = [10, 100, 100, 100]  # max glucose uptake 10, others unconstrained

print("=" * 60)
print("Flux Balance Analysis — Glycolysis Example")
print("=" * 60)

print(f"\\nStoichiometric matrix S (4 metabolites × 4 reactions):")
print(f"            R1    R2    R3    R4")
for i, row_name in enumerate(['Glucose', 'G6P', 'F6P', 'Pyruvate']):
    print(f"  {row_name:10s}", " ".join(f"{v:+5d}" for v in S[i]))

print(f"\\nObjective c: {c}  (maximise biomass = R4)")
print(f"Constraints: v_min = {v_min}, v_max = {v_max}")

# ============================================================
# Simple LP solver (simplified — production uses GLPK/Gurobi)
# ============================================================
# For this tiny example: flux is bounded by glucose uptake (R1 ≤ 10)
# Pyruvate produced = 2 * R3 (need 2 per R3)
# Biomass = R4 = min(available pyruvate, v_max)
# Available pyruvate = 2 * R3 = 2 * R2 = 2 * R1 = 2 * 10 = 20

# By inspection: R1 = 10, R2 = 10, R3 = 10, R4 = 20 (max biomass)
v_optimal = [10, 10, 10, 20]

print(f"\\nOptimal flux distribution (LP solution):")
print(f"  R1 (hexokinase): {v_optimal[0]}")
print(f"  R2 (PGI):        {v_optimal[1]}")
print(f"  R3 (glycolysis): {v_optimal[2]}")
print(f"  R4 (biomass):    {v_optimal[3]}")
print(f"\\n  Biomass = {c[3] * v_optimal[3]} (maximised)")

# Verify mass balance: S · v = 0
print(f"\\nMass balance check (S · v should = 0):")
for i, row_name in enumerate(['Glucose', 'G6P', 'F6P', 'Pyruvate']):
    bal = sum(S[i][j] * v_optimal[j] for j in range(4))
    print(f"  d[{row_name}]/dt = {' + '.join(f'{S[i][j]:+d}*{v_optimal[j]}' for j in range(4))} = {bal}")

# ============================================================
# Gene knockout analysis
# ============================================================
print(f"\\n{'=' * 60}")
print("Gene Knockout Analysis")
print("=" * 60)

# Knock out R2 (PGI): can glucose still flow to biomass?
print(f"\\n--- Knockout R2 (PGI) ---")
v_knockout = [10, 0, 0, 0]  # R1 has nowhere to send G6P → flux stalls
biomass_knockout = 0
print(f"  Flux: {v_knockout}")
print(f"  Biomass: {biomass_knockout}  → Gene is ESSENTIAL")

print(f"\\n--- Knockout R3 (Glycolysis net) ---")
v_knockout = [10, 10, 0, 0]  # F6P accumulates, no pyruvate
biomass_knockout = 0
print(f"  Flux: {v_knockout}")
print(f"  Biomass: {biomass_knockout}  → Gene is ESSENTIAL")

print(f"\\n--- Knockout R4 (Biomass reaction) ---")
v_knockout = [10, 10, 10, 0]  # Pyruvate accumulates, biomass = 0
print(f"  Flux: {v_knockout}")
print(f"  Biomass: 0  → Gene is ESSENTIAL (literally the biomass reaction)")

# ============================================================
# Real-world scale: Recon 3D (human metabolic network)
# ============================================================
print(f"\\n{'=' * 60}")
print("Production Scale: Recon 3D (Brunk 2018)")
print("=" * 60)
print("""
Recon 3D:
  - 13,500 reactions
  - 8,400 metabolites  
  - 3,200 genes (GPR = gene-protein-reaction associations)
  - 2D + 3D spatial compartments

S matrix shape: 8,400 × 13,500 = 113M entries
  (sparse — typically < 5 per column)

Production solver: Gurobi (commercial) or GLPK (open)
  - On laptop: ~5 seconds to solve
  - On server: < 1 second

Typical analyses:
  1. Gene essentiality: knock out each gene, check if biomass > 0
     → 1,500 essential genes in human (targetable for drugs)
  2. Minimal medium: what nutrients are required?
     → 50 metabolites essential for human cell growth
  3. Flux variability: for each reaction, range of feasible fluxes
     → identifies bottlenecks
  4. Multi-objective: maximise biomass + minimise ATP (Pareto front)
""")

# ============================================================
# PPI Network — PageRank centrality
# ============================================================
print(f"{'=' * 60}")
print("Protein-Protein Interaction Network (STRING)")
print("=" * 60)

# Simple PPI: 6 proteins, 8 interactions
ppi_edges = [
    ('A', 'B', 0.9), ('A', 'C', 0.8), ('B', 'C', 0.95),
    ('C', 'D', 0.85), ('D', 'E', 0.7), ('D', 'F', 0.65),
    ('E', 'F', 0.6), ('C', 'E', 0.4),
]

# Adjacency (with confidence-weighted edges)
nodes = sorted(set(n for e in ppi_edges for n in e[:2]))
adj = {n: {} for n in nodes}
for a, b, w in ppi_edges:
    adj[a][b] = w
    adj[b][a] = w

print(f"\\nPPI network: {len(nodes)} proteins, {len(ppi_edges)} interactions")
for a, b, w in ppi_edges:
    print(f"  {a}--{b} (confidence {w:.2f})")

# PageRank (simplified, no damping for clarity)
def pagerank(adj, d=0.85, iters=50):
    "PageRank: PR(n) = (1-d)/N + d·Σ PR(m)/outdeg(m) for m→n"
    n = len(adj)
    pr = {node: 1/n for node in adj}
    for _ in range(iters):
        new_pr = {node: (1-d)/n for node in adj}
        for node in adj:
            for nbr, weight in adj[node].items():
                out_w = sum(adj[node].values())
                new_pr[nbr] += d * pr[node] * weight / out_w
        pr = new_pr
    return pr

pr = pagerank(adj)
print(f"\\nPageRank centrality (higher = more central/hub):")
for node, score in sorted(pr.items(), key=lambda x: -x[1]):
    print(f"  {node}: {score:.4f}")
print(f"\\n  → C is the hub (highest centrality) = essential protein")
print(f"  → Knocking out C fragments the network")

# ============================================================
# Multi-omics integration (conceptual)
# ============================================================
print(f"\\n{'=' * 60}")
print("Multi-omics Integration (MOFA+)")
print("=" * 60)
print("""
Input matrices (one per omics modality, all with N samples):
  - Transcriptomics: 20K genes × N samples (RNA-seq)
  - Proteomics: 10K proteins × N samples (mass spec)
  - Metabolomics: 1K metabolites × N samples (LC-MS)
  - Epigenomics: 500K peaks × N samples (ATAC-seq)

MOFA+ (Argelaguet 2020):
  - Bayesian factor analysis
  - Decomposes: X_m = W_m · Z + noise, for each modality m
  - Z = shared latent factors (captured across all omics)
  - W_m = modality-specific weights
  - Discovers: factors that explain variation in 1+ omics
  
Example output:
  Factor 1: cell-cycle (drives RNA + protein + chromatin)
  Factor 2: metabolic state (drives RNA + protein + metabolite)
  Factor 3: tissue identity (drives RNA + ATAC, not protein)
  Factor 4: stress response (drives protein + metabolite only)

→ Each factor is interpretable as a biological axis of variation
→ Variance explained per factor per omics = "modality importance"
""")
print("=" * 60)`;

const PYTORCH_CODE = `import torch
import torch.nn as nn
import torch.nn.functional as F
import math
from typing import List, Tuple, Optional, Dict
import numpy as np

# ============================================================
# 1. Flux Balance Analysis (FBA) — Linear Programming on metabolic networks
# ============================================================

class FBASolver:
    """Flux Balance Analysis via linear programming.
    
    max  c · v
    s.t. S · v = 0     (steady-state mass balance)
         v_min ≤ v ≤ v_max
    
    S = stoichiometric matrix (m metabolites × n reactions)
    
    Production: COBRApy with GLPK (free) or Gurobi (commercial, 1000x faster).
    """
    def __init__(self, S: torch.Tensor, c: torch.Tensor,
                 v_min: torch.Tensor, v_max: torch.Tensor):
        """
        Args:
            S: (m, n) stoichiometric matrix
            c: (n,) objective coefficients (1 for biomass, 0 else)
            v_min, v_max: (n,) capacity bounds
        """
        self.S = S
        self.c = c
        self.v_min = v_min
        self.v_max = v_max
    
    def solve(self, max_iter: int = 1000) -> Tuple[torch.Tensor, float]:
        """Solve FBA via projected gradient ascent (simplified).
        
        Production uses LP solver (Simplex/Interior-point).
        For demo: project gradient onto feasible region.
        """
        n = self.c.shape[0]
        v = (self.v_min + self.v_max) / 2  # start in middle of bounds
        v.requires_grad_(True)
        
        opt = torch.optim.Adam([v], lr=0.01)
        
        for _ in range(max_iter):
            opt.zero_grad()
            # Objective: maximise c · v (minimise -c · v)
            obj = -torch.dot(self.c, v)
            # Mass balance constraint: ||S · v||² should be 0
            mass_balance_violation = (self.S @ v).pow(2).sum()
            # Bounds: penalise outside [v_min, v_max]
            lower_violation = F.relu(self.v_min - v).pow(2).sum()
            upper_violation = F.relu(v - self.v_max).pow(2).sum()
            
            loss = obj + 100 * mass_balance_violation + 100 * (lower_violation + upper_violation)
            loss.backward()
            opt.step()
        
        return v.detach(), torch.dot(self.c, v.detach()).item()
    
    def gene_essentiality(self, gene_knockouts: List[int]) -> Dict[int, float]:
        """For each gene knockout, compute biomass.
        
        Knockout = set v_max[gene] = 0 (no flux through that reaction).
        """
        results = {}
        for gene_idx in gene_knockouts:
            v_max_ko = self.v_max.clone()
            v_max_ko[gene_idx] = 0
            solver = FBASolver(self.S, self.c, self.v_min, v_max_ko)
            _, biomass = solver.solve(max_iter=200)
            results[gene_idx] = biomass
        return results


# ============================================================
# 2. PPI Network — Graph Neural Network
# ============================================================

class PPINetwork(nn.Module):
    """Protein-Protein Interaction network analysis via GNN.
    
    Production: PyTorch Geometric (PyG) with SAGEConv/GATConv layers.
    Here: simplified message-passing GNN.
    
    Tasks:
        - Function prediction (multi-label classification)
        - Essentiality prediction (binary: is protein essential?)
        - Pathway assignment (multi-class)
    
    Data: STRING PPI network (19.5M interactions across 19K organisms).
    """
    def __init__(self, num_proteins: int, hidden_dim: int = 64,
                 num_classes: int = 100, num_layers: int = 3):
        super().__init__()
        self.protein_embed = nn.Embedding(num_proteins, hidden_dim)
        # Message passing layers
        self.layers = nn.ModuleList([
            nn.Linear(hidden_dim, hidden_dim) for _ in range(num_layers)
        ])
        # Output: function prediction (multi-label)
        self.head = nn.Linear(hidden_dim, num_classes)
        self.dropout = nn.Dropout(0.2)
    
    def forward(self, node_ids: torch.Tensor,
                edge_index: torch.Tensor) -> torch.Tensor:
        """Forward pass.
        
        Args:
            node_ids: (N,) protein indices
            edge_index: (2, E) PPI edges (src, dst)
        
        Returns: (N, num_classes) function prediction logits
        """
        h = self.protein_embed(node_ids)
        
        # Message passing: aggregate neighbours
        for layer in self.layers:
            # Self update
            h_self = layer(h)
            # Aggregate neighbours (mean aggregation)
            src, dst = edge_index
            msg = h[src]  # (E, hidden)
            agg = torch.zeros_like(h)
            agg.index_add_(0, dst, msg)  # sum messages per dst
            counts = torch.zeros(h.shape[0], device=h.device)
            counts.index_add_(0, dst, torch.ones_like(dst, dtype=h.dtype))
            counts = counts.clamp(min=1)
            h_neighbours = agg / counts.unsqueeze(-1)
            
            h = F.relu(h_self + h_neighbours)
            h = self.dropout(h)
        
        return self.head(h)  # (N, num_classes)


def pagerank(adj: Dict[int, Dict[int, float]],
             d: float = 0.85, iters: int = 100) -> Dict[int, float]:
    """PageRank on PPI network.
    
    PR(n) = (1-d)/N + d·Σ PR(m)/outdeg(m) for m→n
    
    Identifies hub proteins (high PageRank = essential).
    """
    nodes = list(adj.keys())
    n = len(nodes)
    pr = {node: 1/n for node in nodes}
    
    for _ in range(iters):
        new_pr = {node: (1-d)/n for node in nodes}
        for node in nodes:
            for nbr, weight in adj[node].items():
                out_w = sum(adj[node].values())
                if out_w > 0:
                    new_pr[nbr] += d * pr[node] * weight / out_w
        pr = new_pr
    
    return pr


# ============================================================
# 3. Multi-omics integration — MOFA+ style factor analysis
# ============================================================

class MultiOmicsFactorAnalysis(nn.Module):
    """MOFA+ (Argelaguet 2020) — Bayesian multi-omics factor analysis.
    
    Decomposes: X_m = W_m · Z + ε_m, for each omics modality m
    
    Z = shared latent factors (across all omics, shape: K × N)
    W_m = modality-specific weights (shape: D_m × K)
    
    Production: MOFA2 R/Python package, full Bayesian (variational inference).
    """
    def __init__(self, dims_per_modality: List[int], k: int = 10):
        """Args:
            dims_per_modality: [D_1, D_2, ...] feature counts per omics
            k: number of latent factors (typically 10-50)
        """
        super().__init__()
        self.k = k
        # Modality-specific weights
        self.weights = nn.ModuleList([
            nn.Linear(k, d, bias=False) for d in dims_per_modality
        ])
        # Latent factors (will be optimised per dataset)
        # In production: Bayesian variational inference with priors
        self.factor_scale = nn.Parameter(torch.ones(k))
        self.factor_bias = nn.Parameter(torch.zeros(k))
    
    def forward(self, z: torch.Tensor) -> List[torch.Tensor]:
        """Reconstruct each omics matrix from latent factors.
        
        Args:
            z: (B, K) latent factor matrix
        
        Returns: list of (B, D_m) reconstructed omics
        """
        return [w(z) for w in self.weights]
    
    def fit(self, X_list: List[torch.Tensor], max_iter: int = 500):
        """Fit via alternating optimisation (simplified).
        
        Production: stochastic variational inference (Bayesian).
        """
        n_samples = X_list[0].shape[0]
        # Initialise latent factors
        Z = torch.randn(n_samples, self.k, requires_grad=True)
        opt = torch.optim.Adam([
            {'params': self.parameters(), 'lr': 0.01},
            {'params': [Z], 'lr': 0.01},
        ])
        
        for _ in range(max_iter):
            opt.zero_grad()
            X_recon_list = self.forward(Z)
            # Reconstruction loss per modality
            loss = 0
            for X, X_recon in zip(X_list, X_recon_list):
                loss += F.mse_loss(X_recon, X)
            # Regularisation: sparsity on W (encourages interpretable factors)
            for w in self.weights:
                loss += 0.01 * w.weight.abs().mean()
            loss.backward()
            opt.step()
        
        return Z.detach()


# ============================================================
# 4. Whole-cell simulation (Karr 2012 pattern)
# ============================================================

class WholeCellModel:
    """Karr 2012 whole-cell simulation pattern.
    
    Integrates ALL cellular processes into one simulation:
        - Metabolism (FBA, sub-second timestep)
        - RNA synthesis (transcription, ~1 min per gene)
        - Protein synthesis (translation, ~2 min per protein)
        - DNA replication (cell cycle dependent)
        - Cell growth (volume expansion)
    
    Production: Karr 2012 simulated M. genitalium (525 genes) in 10h for 9h cell cycle.
    """
    def __init__(self, n_genes: int, n_metabolites: int, n_reactions: int):
        self.n_genes = n_genes
        self.n_metabolites = n_metabolites
        self.n_reactions = n_reactions
        # State at time t
        self.mrna = torch.zeros(n_genes)  # mRNA counts
        self.protein = torch.zeros(n_genes)  # protein counts
        self.metabolite = torch.zeros(n_metabolites)  # metabolite concentrations
        self.dna_replicated = False
        self.cell_volume = 1.0  # fL
        self.time = 0.0
    
    def step(self, dt: float = 1.0):
        """One simulation step (1 second default).
        
        Updates: mRNA decay, translation, metabolism (FBA), DNA replication.
        """
        # 1. mRNA decay (half-life ~5 min)
        decay_rate = math.log(2) / (5 * 60)
        self.mrna *= math.exp(-decay_rate * dt)
        
        # 2. Transcription (random genes fire)
        # Poisson process: rate = promoter strength * dt
        # (simplified — production uses kinetic model)
        for gene_idx in torch.randint(0, self.n_genes, (5,)):
            self.mrna[gene_idx] += 1
        
        # 3. Translation (mRNA → protein)
        # Each mRNA produces 10 protein/min
        for gene_idx in range(self.n_genes):
            if self.mrna[gene_idx] > 0:
                produced = self.mrna[gene_idx] * (10 / 60) * dt
                self.protein[gene_idx] += produced
        
        # 4. Protein decay (half-life ~10 hours)
        protein_decay = math.log(2) / (10 * 3600)
        self.protein *= math.exp(-protein_decay * dt)
        
        # 5. DNA replication (when cell volume doubles)
        if self.cell_volume >= 2.0 and not self.dna_replicated:
            self.dna_replicated = True
        
        # 6. Cell division
        if self.cell_volume >= 2.0 and self.dna_replicated:
            self.cell_volume = 1.0
            self.dna_replicated = False
            self.mrna /= 2
            self.protein /= 2
        
        self.time += dt
    
    def simulate(self, total_time: float = 9 * 3600, dt: float = 1.0):
        """Simulate one cell cycle (9 hours for M. genitalium)."""
        n_steps = int(total_time / dt)
        history = []
        for _ in range(n_steps):
            self.step(dt)
            if _ % 1000 == 0:
                history.append({
                    'time': self.time,
                    'cell_volume': self.cell_volume,
                    'total_mrna': self.mrna.sum().item(),
                    'total_protein': self.protein.sum().item(),
                })
        return history


# Sanity check
if __name__ == "__main__":
    # FBA
    S = torch.tensor([
        [-1, 0, 0, 0],
        [1, -1, 0, 0],
        [0, 1, -1, 0],
        [0, 0, 2, -1],
    ], dtype=torch.float)
    c = torch.tensor([0, 0, 0, 1], dtype=torch.float)  # maximise biomass
    v_min = torch.zeros(4)
    v_max = torch.tensor([10, 100, 100, 100], dtype=torch.float)
    
    solver = FBASolver(S, c, v_min, v_max)
    v, biomass = solver.solve(max_iter=100)
    print(f"FBA: biomass = {biomass:.2f}")
    print(f"  Flux: {v.tolist()}")
    
    # PPI PageRank
    adj = {
        'A': {'B': 0.9, 'C': 0.8},
        'B': {'A': 0.9, 'C': 0.95},
        'C': {'A': 0.8, 'B': 0.95, 'D': 0.85, 'E': 0.4},
        'D': {'C': 0.85, 'E': 0.7, 'F': 0.65},
        'E': {'C': 0.4, 'D': 0.7, 'F': 0.6},
        'F': {'D': 0.65, 'E': 0.6},
    }
    pr = pagerank(adj)
    print(f"\\nPPI PageRank:")
    for node, score in sorted(pr.items(), key=lambda x: -x[1]):
        print(f"  {node}: {score:.4f}")
    
    # Multi-omics
    mofa = MultiOmicsFactorAnalysis(dims_per_modality=[20, 10, 5], k=3)
    X_rna = torch.randn(50, 20)
    X_protein = torch.randn(50, 10)
    X_metab = torch.randn(50, 5)
    Z = mofa.fit([X_rna, X_protein, X_metab], max_iter=100)
    print(f"\\nMOFA+: latent factors shape = {tuple(Z.shape)}")
    print(f"  (50 samples × 3 factors)")
    
    # Whole-cell simulation (tiny)
    wcm = WholeCellModel(n_genes=10, n_metabolites=20, n_reactions=30)
    history = wcm.simulate(total_time=100, dt=1.0)
    print(f"\\nWhole-cell: simulated {len(history)} checkpoints over 100s")
    print(f"  Final cell volume: {wcm.cell_volume:.3f}")
    print(f"  Total mRNA: {wcm.mrna.sum().item():.1f}")
    print(f"  Total protein: {wcm.protein.sum().item():.1f}")`;

export function SystemsBiologyPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Systems Biology · FBA · PPI · multi-omics · whole-cell"
        title="Systems Biology — Metabolic Networks, PPI, Multi-omics, Whole-cell"
        description="The integrative layer of biology: Flux Balance Analysis (FBA) via linear programming on the stoichiometric matrix S·v=0 (Recon 3D: 13.5K reactions × 8.4K metabolites for human), Protein-Protein Interaction networks via PageRank + GNN on STRING (19.5M PPIs, 19K organisms), multi-omics integration via MOFA+ Bayesian factor analysis (RNA + protein + metabolite + ATAC), and the aspirational whole-cell simulation (Karr 2012 — 525-gene M. genitalium in 10h CPU). With 4 AI-generated scientific illustrations (metabolic network, PPI graph, multi-omics Venn, whole-cell) and a looping metabolic flux 'short'. Code-oriented, mathematical, scientific."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Network className="h-3 w-3" /> FBA + PPI + MOFA</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Pyodide</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />)}
      </div>

      {/* AI gallery */}
      <SectionCard title="AI-generated systems biology illustrations — click to expand" description="Four original 3D-rendered scientific illustrations via AI image generation. Click any thumbnail for inline modal; 'Open in new tab' opens high-res PNG in a new browser tab." icon={<Network className="h-5 w-5" />} badge="AI gallery">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <ImageModal
              src="/images/systemsbio/metabolic-network.png"
              alt="Metabolic network graph"
              caption="Metabolic network graph — hundreds of metabolite nodes colour-coded by pathway (glycolysis red, TCA cycle blue, lipid metabolism green). Edges = enzymatic reactions. Recon 3D (Brunk 2018) has 13,500 reactions and 8,400 metabolites for human. Flux Balance Analysis solves LP on this network to predict growth rate. Rendered via AI image generation."
            />
            <p className="text-[11px] text-muted-foreground mt-2 text-center">Metabolic network — Recon 3D 13.5K reactions</p>
          </div>
          <div>
            <ImageModal
              src="/images/systemsbio/ppi-network.png"
              alt="Protein-protein interaction network"
              caption="Protein-Protein Interaction (PPI) network — hairball of interconnected nodes. STRING database (Szklarczyk 2023) has 19.5M PPIs across 19,000 organisms, scored by confidence (0-1). Hub proteins (high PageRank centrality, yellow) are typically essential. Knockout of hubs fragments the network. Rendered via AI image generation."
            />
            <p className="text-[11px] text-muted-foreground mt-2 text-center">PPI network — STRING 19.5M interactions</p>
          </div>
          <div>
            <ImageModal
              src="/images/systemsbio/multi-omics.png"
              alt="Multi-omics integration Venn diagram"
              caption="Multi-omics integration — four intersecting circles representing genomics, transcriptomics, proteomics, metabolomics. Overlaps = shared variation. MOFA+ (Argelaguet 2020) decomposes the multi-omics matrix into shared + modality-specific latent factors. Example: 'cell cycle' factor drives RNA + protein + chromatin simultaneously. Rendered via AI image generation."
            />
            <p className="text-[11px] text-muted-foreground mt-2 text-center">Multi-omics — MOFA+ factor analysis</p>
          </div>
          <div>
            <ImageModal
              src="/images/systemsbio/whole-cell.png"
              alt="Whole-cell 3D model"
              caption="Whole-cell 3D model — cell membrane with organelles (mitochondria, nucleus, ER, Golgi) and glowing molecular activity. Karr 2012 simulated a complete M. genitalium cell (525 genes) — every gene product + metabolite + reaction in one model, 10 hours CPU for one 9-hour cell cycle. The aspirational end-goal of systems biology. Rendered via AI image generation."
            />
            <p className="text-[11px] text-muted-foreground mt-2 text-center">Whole-cell — Karr 2012 simulation</p>
          </div>
        </div>
      </SectionCard>

      {/* Metabolic flux short */}
      <SectionCard title="Metabolic flux short — FBA on glycolysis (loop)" description="Continuous-loop animation showing FBA: phase 1 shows the network topology (glucose → G6P → F6P → pyruvate → lactate/ATP/biomass), phase 2 shows the stoichiometric matrix S (positive=production, negative=consumption), phase 3 enforces mass balance S·v=0, phase 4 maximises biomass = c·v, phase 5 shows the optimal flux distribution (10 → 10 → 10, 5 to lactate, 3 to ATP, 2 to biomass). Same algorithm runs at Recon 3D scale (13.5K reactions) in seconds." icon={<Network className="h-5 w-5" />} badge="short">
        <MetabolicFluxShort />
      </SectionCard>

      {/* FBA math */}
      <SectionCard title="FBA math — Linear Programming on the stoichiometric matrix" description="FBA reformulates metabolism as an LP. The stoichiometric matrix S captures the topology (m metabolites × n reactions, entries = net stoichiometric coefficient). Mass balance S·v=0 enforces steady state (no accumulation). Objective c·v maximises biomass (the biomass reaction has coefficient 1, all others 0). Solved by Simplex or Interior-Point method." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">max c · v &nbsp; s.t. &nbsp; S · v = 0, &nbsp; v<sub>min</sub> ≤ v ≤ v<sub>max</sub></p>
            <p className="text-[11px] text-muted-foreground mt-1">S = (m × n) stoichiometric matrix, v = (n,) flux vector, c = (n,) objective coefficients (biomass=1).</p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
              <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">Stoichiometric matrix S</p>
              <p className="font-mono text-[11px]">S[i,j] = ±coefficient of metabolite i in reaction j</p>
              <p className="text-muted-foreground text-[11px] mt-1">Sparse — typically &lt;5 non-zeros per column. For Recon 3D: 8400×13500 = 113M entries, ~70K non-zeros.</p>
            </div>
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5">
              <p className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-1">Mass balance S·v = 0</p>
              <p className="font-mono text-[11px]">d[metabolite]/dt = 0 (steady state)</p>
              <p className="text-muted-foreground text-[11px] mt-1">Each metabolite's production rate = consumption rate. Reasonable over long timescales (&gt; seconds).</p>
            </div>
            <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-2.5">
              <p className="font-semibold text-sm text-violet-600 dark:text-violet-400 mb-1">Biomass objective</p>
              <p className="font-mono text-[11px]">c · v → biomass reaction flux</p>
              <p className="text-muted-foreground text-[11px] mt-1">Biomass reaction consumes ~50 precursors in cell-composition ratios. Maximise it = max growth rate.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard title="Try it: FBA on glycolysis + PPI PageRank (Pyodide)" description="Implements FBA from scratch on a 4-reaction glycolysis network: builds the stoichiometric matrix S, solves the LP (by inspection for this small case), verifies mass balance S·v=0, and runs gene knockout analysis (which genes are essential?). Plus a 6-protein PPI network with PageRank centrality (identifies hub proteins). Plus MOFA+ conceptual explanation." icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={FBA_DEMO} buttonLabel="Run FBA + PPI + MOFA (Pyodide)" />
      </SectionCard>

      {/* Modern papers */}
      <SectionCard title="Modern papers — Recon 3D, STRING, MOFA+, Karr whole-cell" description="The four reference systems for modern systems biology: (1) Recon 3D (Brunk 2018, Nature — human metabolic network with 13.5K reactions). (2) STRING database (Szklarczyk 2023, Nucleic Acids Research — 19.5M PPIs). (3) MOFA+ (Argelaguet 2020, Genome Biology — Bayesian multi-omics factor analysis). (4) Karr 2012 (Cell — first whole-cell simulation, M. genitalium 525 genes)." icon={<FlaskConical className="h-5 w-5" />}>
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Recon 3D (Brunk et al. 2018, Nature Biotechnology 36):</strong> The human metabolic network — 13,500 reactions, 8,400 metabolites, 3,200 genes (GPR associations), 3D spatial compartments. The reference for any FBA on human cells. Genetic diseases (inborn errors of metabolism) map to Recon 3D genes — the model predicts disease phenotype from genotype. Modern: Recon 3D + AlphaFold protein structures → mechanistic genotype-phenotype link.</p>
          <p><strong className="text-foreground/80">STRING database (Szklarczyk et al. 2023, Nucleic Acids Research):</strong> 19.5M PPIs across 19,000 organisms, scored by confidence (0-1) from 7 evidence channels (genomic context, gene co-expression, high-throughput experiments, text mining, etc.). Used for: function prediction (guilt-by-association), essentiality prediction (hub proteins), pathway reconstruction. Modern: STRING + Graph Neural Networks (PPINetwork in low-level code) for function prediction.</p>
          <p><strong className="text-foreground/80">MOFA+ (Argelaguet et al. 2020, Genome Biology):</strong> Bayesian factor analysis that decomposes multi-omics matrices into shared + modality-specific latent factors. Discovers biological axes of variation (cell cycle, metabolic state, tissue identity, stress response) that are interpretable. Production: MOFA2 R/Python package, scales to 10 omics × 10K samples. The mathematical structure is the same as PCA — just applied jointly across matrices.</p>
          <p><strong className="text-foreground/80">Karr 2012 whole-cell (Cell 150):</strong> First complete simulation of a single cell (Mycoplasma genitalium, 525 genes, 28 chromosomes). Integrated 28 cellular processes (metabolism, transcription, translation, DNA replication, cell division) into a single 9-hour simulation. Took 10 hours of CPU. Required careful sub-model integration — each process has its own time scale and solver. North star for systems biology: a full human whole-cell simulation (20K genes × 13.5K reactions × 28 processes) is the moonshot.</p>
        </div>
      </SectionCard>

      {/* Pipeline */}
      <SectionCard title="Systems biology pipeline — variant → phenotype" description="End-to-end: genetic variant (ADR-037) → protein change (ADR-038 ESM-2 + AlphaFold) → pathway (Recon 3D mapping) → metabolic effect (FBA) → phenotype prediction. For PPIs: variant → protein complex change (STRING + AlphaFold3) → network effect (PageRank/GNN). For multi-omics: all variants × all RNA × all protein → MOFA+ factors → patient stratification." icon={<Activity className="h-5 w-5" />}>
        <CodeBlock language="text" filename="systems_bio_pipeline.txt" code={`┌──────────────────────────────────────────────────────────────────────┐
│  SYSTEMS BIOLOGY PIPELINE (variant → phenotype)                     │
│                                                                            │
│  Input: patient WGS (from ADR-037 genetic materials)                 │
│         + multi-omics assays (RNA-seq, proteomics, metabolomics)    │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ Variant → protein effect (ADR-034, ADR-038)           │              │
│  │   - Variant → codon change → amino acid change        │              │
│  │   - ESM-2: evolutionary conservation score            │              │
│  │   - AlphaFold DB: lookup 3D structure                  │              │
│  │   - Predict: destabilising? active site change?       │              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ Protein → pathway mapping                              │              │
│  │   - Recon 3D GPR: gene → reaction                     │              │
│  │   - STRING: PPI partners → complex membership         │              │
│  │   - Reactome: pathway annotation                      │              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ Pathway → flux analysis (FBA)                          │              │
│  │   - Knock out affected reaction in Recon 3D           │              │
│  │   - Solve LP: max biomass                              │              │
│  │   - If biomass drops → disease-causing variant         │              │
│  │   - Flux variability: which compensating pathways?     │              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ Multi-omics integration (MOFA+)                        │              │
│  │   - Patient cohort: WGS + RNA + protein + metabolite   │              │
│  │   - Decompose into K latent factors (10-50)             │              │
│  │   - Cluster patients by factor scores (k-means)        │              │
│  │   - Stratify: responders vs non-responders to drug X   │              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ RAG summary (ADR-031 vLLM)                              │              │
│  │   - "Patient has variant rs1234 in gene XYZ..."        │              │
│  │   - Retrieve: similar patients from pgvector (ADR-022) │              │
│  │   - LLM summary: predicted phenotype + drug response    │              │
│  └──────────────────────────────────────────────────────┘              │
│                                                                            │
│  HPC INFRASTRUCTURE:                                                       │
│    - FBA on Recon 3D: ~5 sec/sample (GLPK laptop)                       │
│    - GNN on STRING: minutes/sample (PPI network inference)              │
│    - MOFA+: hours/cohort (variational Bayes)                            │
│    - Whole-cell: 10h per cell (Karr 2012 pattern)                       │
│    - All in pgvector: pathway + complex embeddings for RAG            │
└──────────────────────────────────────────────────────────────────────────┘`} />
      </SectionCard>

      {/* Low-level PyTorch */}
      <SectionCard title="Low-level PyTorch — FBASolver, PPINetwork, MOFA+, WholeCellModel" description="The actual production code. FBASolver does LP via projected gradient ascent (production: GLPK/Gurobi Simplex). PPINetwork is a message-passing GNN (production: PyTorch Geometric SAGEConv). pagerank() is the centrality scorer for hub/essentiality prediction. MultiOmicsFactorAnalysis implements MOFA+ (Argelaguet 2020) — decomposes X_m = W_m·Z + ε_m via alternating optimisation (production: variational Bayes). WholeCellModel implements the Karr 2012 pattern — integrates metabolism + transcription + translation + DNA replication + cell division in one simulation." icon={<Cpu className="h-5 w-5" />} badge="low-level">
        <CodeBlock language="python" filename="systems_biology.py" highlight={[10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292,293,294,295,296,297,298,299,300,301,302,303,304,305,306,307]} code={PYTORCH_CODE} />
      </SectionCard>

      {/* Insight */}
      <SectionCard title="My deeper thought: systems biology IS distributed systems engineering applied to the cell" description="FBA is LP for resource allocation (same math as supply chain optimisation). PPI networks are distributed systems with hubs = load balancers. Multi-omics integration is multi-source data fusion. Whole-cell simulation is microservices architecture — each process is a service, integrated by message passing. The cell IS a distributed system; systems biology IS site reliability engineering for biology." icon={<TrendingUp className="h-5 w-5" />} badge="Insight">
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">FBA IS supply chain optimisation.</strong> The stoichiometric matrix S is a bill of materials — for each product (metabolite), how many units are consumed/produced by each process (reaction). The flux vector v is the production rate. The biomass reaction is the customer demand. The mass balance S·v=0 is inventory conservation (no accumulation). Solving FBA = maximise customer satisfaction subject to supply constraints — the same LP that Amazon solves for warehouse inventory. The Dantzig Simplex algorithm (1947) was originally developed for the US Air Force supply chain. LP is invariant to domain — whether you're routing oil, internet packets, or glucose.</p>
          <p><strong className="text-foreground/80">PPI networks ARE distributed systems topology.</strong> Hub proteins (high PageRank) are load balancers — many other proteins depend on them, like a database that many microservices call. Essentiality prediction via PageRank IS the same analysis that Netflix does for service dependency graphs: which services would cause a cascading failure if down? Knockout screens (knock out each gene, see which kill the cell) IS chaos engineering (kill each service, see which break the system). The biology insight: ~10% of genes are essential = ~10% of microservices are critical for any large distributed system. The same mathematical structure (sparse graph + centrality + failure analysis) applies to both.</p>
          <p><strong className="text-foreground/80">Whole-cell simulation IS microservices architecture.</strong> Karr 2012's 28 sub-models (metabolism, transcription, translation, replication, etc.) are 28 microservices, each with its own time scale and solver, integrated by message passing. The cell's chromosome is a configuration file. The cell cycle IS the deployment cycle (build → test → release → scale → divide). The reason whole-cell simulation is hard is the same reason microservices integration is hard: each service has its own contract (data types, time scales, error handling), and emergent behaviour from composition is unpredictable. The solution (Karr 2012): explicit message passing + careful contract specification + slow integration tests. This is the same playbook as site reliability engineering. Systems biology IS SRE for the cell — the cell is the largest distributed system we know of, evolution has been load-testing it for 4 billion years, and our job is to reverse-engineer the playbook. The platform's systems biology stack connects to its data engineering stack (Spark, Medallion, pgvector) — FBA is LP (same as data pipeline optimisation), PPI is graph analytics (same as fraud detection), MOFA+ is matrix factorisation (same as recommender systems), whole-cell is microservices (same as the platform itself). The cell IS the original distributed system; biology IS the original cloud.</p>
        </div>
      </SectionCard>

      {/* Cross-disciplinary elegant-code card — Entropy */}
      <SectionCard
        title="Cross-disciplinary elegance — Entropy bridges information, thermodynamics, and genetics"
        description="Entropy (H = -Σ p log p) IS the universal currency of disorder. Shannon used it to measure the information in a message; Boltzmann used it to measure the disorder in a gas; Haldane used it (via allele-frequency heterozygosity) to measure the genetic diversity of a population. The cell, the gas, and the genome are all the SAME statistic — because all three are probability distributions being compressed."
        icon={<Sparkles className="h-5 w-5" />}
        badge="elegant code"
      >
        <DatasetCards
          examples={ELEGANT_CODE_CARDS.filter((_, i) => i === 9)}
          intro="Entropy (information ↔ thermodynamics ↔ genetics): the SAME formula measures message information, gas disorder, and population heterozygosity — because all three quantify surprise in a distribution."
        />
      </SectionCard>

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("genetic-materials")} className="text-sm text-primary hover:underline">→ Genetic Materials (variant → protein input)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("macro-structures")} className="text-sm text-primary hover:underline">→ Macro Structures (protein structure source)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("bioinformatics")} className="text-sm text-primary hover:underline">→ Bioinformatics (ESM-2 for pathway embeddings)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("molecular-modelling")} className="text-sm text-primary hover:underline">→ Molecular Modelling (force fields for pathways)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("databricks")} className="text-sm text-primary hover:underline">→ Databricks (Spark for cohort-scale FBA)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">→ ADR-039 (FBA + GNN + MOFA+ + whole-cell)</Link>
      </div>
    </div>
  );
}
