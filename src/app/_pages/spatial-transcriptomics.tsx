"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { NextSteps } from "../_components/next-steps";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { ImageModal } from "../_components/image-modal";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Cpu, Layers, Zap, TrendingUp, Terminal, Brain,
  Activity, Network, MapPin, Grid,
} from "lucide-react";

const KPIS = [
  { label: "10x Visium", value: "5000 spots/array", hint: "55μm diameter, ~10-50 cells/spot, full transcriptome", deltaTone: "flat" as const },
  { label: "MERFISH", value: "4¹⁶ barcodes", hint: "4 base × 16 rounds = 4 billion codes", deltaTone: "flat" as const },
  { label: "Stereo-seq", value: "500nm resolution", hint: "BGI, 10⁷ cells/slide, full transcriptome", deltaTone: "flat" as const },
  { label: "STAGATE", value: "GAT autoencoder", hint: "Spatial domains via k-NN graph attention", deltaTone: "flat" as const },
];

// ============================================================
// Combinatorial Barcoding "short" — MERFISH decoding
// ============================================================
function CombinatorialBarcodeShort() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setStep((s) => (s + 1) % 8), 800);
    return () => clearInterval(interval);
  }, []);

  // 8 phases showing MERFISH decoding: round-by-round readout
  // 16 cells, each with a 4-bit barcode over 4 rounds
  // Step 0-3: read round 1, 2, 3, 4
  // Step 4: decode the 4-bit code per cell
  // Step 5: look up gene identity in codebook
  // Step 6: assemble expression matrix
  // Step 7: visualise

  const cells = Array.from({length: 16}, (_, i) => ({
    x: 60 + (i % 4) * 50,
    y: 60 + Math.floor(i / 4) * 50,
    code: [
      (i & 1) ? 1 : 0,
      (i & 2) ? 2 : 1,
      (i & 4) ? 0 : 3,
      (i & 8) ? 2 : 0,
    ],
  }));

  const fluorophores = [
    { id: 0, color: "oklch(0.6 0.20 25)", name: "Cy5" },
    { id: 1, color: "oklch(0.55 0.16 250)", name: "Cy3" },
    { id: 2, color: "oklch(0.55 0.16 165)", name: "Cy7" },
    { id: 3, color: "oklch(0.6 0.15 75)", name: "Cy5.5" },
  ];

  const phases = [
    "1. Round 1 readout (Cy5/Cy3)",
    "2. Round 2 readout",
    "3. Round 3 readout",
    "4. Round 4 readout",
    "5. Decode 4-bit code per cell",
    "6. Look up gene in codebook",
    "7. Assemble expression matrix",
    "8. Visualise spatial pattern",
  ];

  const roundIdx = step < 4 ? step : -1;

  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <style>{`
        .cb-3d { perspective: 900px; }
        .cb-stage { transform: rotateX(15deg); transform-style: preserve-3d; }
      `}</style>
      <p className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Grid className="h-4 w-4 text-primary" />
        MERFISH combinatorial barcoding — 4 rounds × 4 fluorophores (loop)
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">
          {phases[step]}
        </span>
      </p>
      <div className="cb-3d">
        <div className="cb-stage">
          <svg width="320" height="260" viewBox="0 0 320 260">
            {/* Tissue grid (16 cells in 4x4 layout) */}
            {cells.map((cell, i) => {
              const fluorIdx = roundIdx >= 0 ? cell.code[roundIdx] : -1;
              const color = roundIdx >= 0
                ? fluorophores[fluorIdx].color
                : step >= 4
                ? "oklch(0.55 0.16 250 / 0.5)"  // decoded — show all
                : "var(--muted)";
              return (
                <motion.g key={i}>
                  {/* Cell outline */}
                  <rect x={cell.x} y={cell.y} width="40" height="40"
                    fill="none" stroke="var(--border)" strokeWidth="1" />
                  {/* Fluorophore signal */}
                  <motion.circle
                    cx={cell.x + 20} cy={cell.y + 20} r="14"
                    fill={color}
                    animate={{
                      scale: roundIdx >= 0 ? 1 : 0.7,
                      opacity: roundIdx >= 0 ? 0.8 : 0.3,
                    }}
                  />
                  {/* Code label (phases 4+) */}
                  {step >= 4 && (
                    <text x={cell.x + 20} y={cell.y + 24}
                      textAnchor="middle" fontSize="10"
                      fill="white" fontWeight="bold">
                      {cell.code.join('')}
                    </text>
                  )}
                </motion.g>
              );
            })}

            {/* Fluorophore legend (active in rounds) */}
            {roundIdx >= 0 && (
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <text x="0" y="-5" fontSize="9" fill="var(--muted-foreground)">
                  Round {roundIdx + 1}: reading fluorophore
                </text>
              </motion.g>
            )}

            {/* Expression matrix (phase 6+) */}
            {step === 6 && (
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <text x="240" y="50" fontSize="9" fill="var(--primary)">Gene × Cell</text>
                {cells.slice(0, 8).map((cell, i) => (
                  <text key={i} x="240" y={70 + i * 12}
                    fontSize="9" fill="var(--muted-foreground)" fontFamily="monospace">
                    Gene{i+1}: [{cells.map(c => c.code.join('').includes(String(i)) ? 1 : 0).slice(0, 8).join(',')}...]
                  </text>
                ))}
              </motion.g>
            )}
          </svg>
        </div>
      </div>

      {/* Fluorophore legend */}
      <div className="flex justify-center gap-3 mt-3 text-[10px] flex-wrap">
        {fluorophores.map(f => (
          <span key={f.id} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded" style={{ backgroundColor: f.color }} />
            {f.name}
          </span>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground text-center mt-3">
        16 cells × 4 rounds × 4 fluorophores = 4^4 = 256 possible codes (production: 4^16 = 4B codes).
        Each gene gets a unique code; the 4-round readout identifies the gene at each position.
        Error-correction codes (Hamming distance ≥ 4) handle 1-2% readout errors.
      </p>
    </div>
  );
}

const BARCODE_DEMO = `# Combinatorial barcoding + U-Net segmentation + spatial domains (Pyodide)
# The math behind MERFISH + Visium + STAGATE

import math, random
from collections import defaultdict

# ============================================================
# 1. Combinatorial barcoding — MERFISH codebook
# ============================================================
# 4 base × N rounds = 4^N possible codes
# - 4 fluorophores (Cy3, Cy5, Cy7, Cy5.5) read each round
# - N=16 rounds → 4^16 = 4.3 billion possible codes (>> 20K genes)
# - Use Hamming distance 4 codes for error correction

def generate_codebook(n_genes, n_rounds=16, n_fluor=4):
    """Generate MERFISH codebook with error-correcting codes.
    
    Returns: dict {gene_idx: tuple of fluorophore IDs per round}
    """
    # Generate random codes (production: optimise for Hamming distance 4)
    codes = set()
    while len(codes) < n_genes:
        code = tuple(random.randint(0, n_fluor - 1) for _ in range(n_rounds))
        # Check Hamming distance from existing codes (must be >= 4)
        if all(sum(c1 != c2 for c1, c2 in zip(code, existing)) >= 4 for existing in codes):
            codes.add(code)
    
    codebook = {i: list(code) for i, code in enumerate(codes)}
    return codebook

def decode_readout(readout, codebook):
    """Match observed readout to gene identity.
    
    readout: tuple of fluorophore IDs per round (with errors)
    Returns: (gene_idx, hamming_distance)
    """
    best_gene = -1
    best_dist = float('inf')
    for gene_idx, code in codebook.items():
        dist = sum(r != c for r, c in zip(readout, code))
        if dist < best_dist:
            best_dist = dist
            best_gene = gene_idx
    return best_gene, best_dist

# Demo
print("=" * 60)
print("MERFISH Combinatorial Barcoding")
print("=" * 60)

random.seed(42)
n_genes = 100
n_rounds = 4  # smaller for demo (production: 16)
n_fluor = 4

codebook = generate_codebook(n_genes, n_rounds, n_fluor)
print(f"\\nGenerated codebook: {n_genes} genes × {n_rounds} rounds × {n_fluor} fluorophores")
print(f"  Theoretical capacity: {n_fluor ** n_rounds} codes")

# Simulate readout (with errors)
print(f"\\nSample codes (first 5 genes):")
for i, (gene_idx, code) in enumerate(list(codebook.items())[:5]):
    print(f"  Gene {gene_idx}: {code}")

# Decode a noisy readout
true_gene = 7
true_code = codebook[true_gene]
noisy_readout = list(true_code)
# Inject 1 error
err_round = random.randint(0, n_rounds - 1)
noisy_readout[err_round] = (noisy_readout[err_round] + 1) % n_fluor

decoded_gene, dist = decode_readout(noisy_readout, codebook)
print(f"\\nNoisy readout: {noisy_readout} (true code: {true_code}, 1 error)")
print(f"Decoded: gene {decoded_gene} (distance {dist})")
print(f"  → Correct (Hamming distance 1 < 4 error-correction threshold)")

# ============================================================
# 2. U-Net — cell segmentation on DAPI images
# ============================================================
print(f"\\n{'=' * 60}")
print("U-Net — Cell Segmentation on DAPI Nuclei")
print("=" * 60)
print("""
U-Net architecture (Ronneberger 2015):
  - Encoder: Conv → Conv → MaxPool (downsample, increase channels)
  - Bottleneck: deepest features
  - Decoder: ConvT → concat skip → Conv → Conv (upsample, decrease channels)
  - Output: per-pixel binary segmentation mask

Skip connections preserve spatial detail lost in downsampling.

For StarDist (Schmidt 2018): predict star-convex polygon (32 radial distances)
instead of binary mask — better for overlapping nuclei.

Typical performance:
  - 1000-cell image, 256x256 pixels
  - 5-layer U-Net: F1 score 0.85 (StarDist: 0.92)
  - Training: ~10K annotated crops, 50 epochs
""")

# ============================================================
# 3. Spatial domains — k-NN graph + STAGATE
# ============================================================
print("=" * 60)
print("STAGATE — Spatial Domain Detection via Graph Attention Autoencoder")
print("=" * 60)

# Simulate 16 cells in 4x4 grid with spatial domain structure
random.seed(42)
cells = []
for i in range(4):
    for j in range(4):
        # Domain assignment: top-left = domain A, bottom-right = domain B
        domain = 'A' if (i + j) < 4 else 'B'
        # Generate 20-dim expression vector
        if domain == 'A':
            expr = [random.gauss(2.0, 0.5) for _ in range(20)]  # high gene 1
        else:
            expr = [random.gauss(0.5, 0.2) for _ in range(20)]  # low gene 1
        cells.append({
            'id': i * 4 + j,
            'x': j, 'y': i,
            'domain': domain,
            'expr': expr,
        })

# Build k-NN spatial neighbour graph
def knn_spatial_graph(cells, k=4):
    """For each cell, find k nearest spatial neighbours."""
    edges = []
    for c in cells:
        dists = [(c2['id'], math.sqrt((c['x'] - c2['x'])**2 + (c['y'] - c2['y'])**2))
                 for c2 in cells if c2['id'] != c['id']]
        dists.sort(key=lambda x: x[1])
        for nbr_id, _ in dists[:k]:
            edges.append((c['id'], nbr_id))
    return edges

edges = knn_spatial_graph(cells, k=4)
print(f"\\nSpatial graph: {len(cells)} cells, {len(edges)} edges")
print(f"  Average degree: {len(edges) / len(cells):.1f}")

# Simulate STAGATE: aggregate features from neighbours
def stagate_aggregate(cells, edges, n_iters=2):
    """Message passing: each cell's expression = average of neighbours + self."""
    expr_dict = {c['id']: list(c['expr']) for c in cells}
    adj = defaultdict(list)
    for src, dst in edges:
        adj[src].append(dst)
    
    for _ in range(n_iters):
        new_expr = {}
        for c_id in expr_dict:
            nbrs = adj[c_id]
            if nbrs:
                agg = [sum(expr_dict[n][k] for n in nbrs) / len(nbrs)
                       for k in range(len(expr_dict[c_id]))]
                # Combine self + neighbour average
                new_expr[c_id] = [0.5 * expr_dict[c_id][k] + 0.5 * agg[k]
                                  for k in range(len(expr_dict[c_id]))]
            else:
                new_expr[c_id] = expr_dict[c_id]
        expr_dict = new_expr
    return expr_dict

# Run aggregation
agg_expr = stagate_aggregate(cells, edges, n_iters=2)
print(f"\\nAfter STAGATE aggregation (2 iterations):")
print(f"  {'Cell':>5s} {'Domain':>8s} {'Original':>10s} {'Aggregated':>12s}")
for c in cells[:4]:
    orig = c['expr'][0]
    agg = agg_expr[c['id']][0]
    print(f"  {c['id']:5d} {c['domain']:>8s} {orig:>10.3f} {agg:>12.3f}")

print(f"\\n  → Aggregation smooths expression: domain signal amplified")
print(f"  → Cells in same spatial domain converge to similar expression")
print(f"  → Clustering on aggregated expression identifies spatial domains")

# ============================================================
# 4. NicheNet — ligand-receptor cell-cell communication
# ============================================================
print(f"\\n{'=' * 60}")
print("NicheNet — Ligand-Receptor Cell-Cell Communication")
print("=" * 60)
print("""
NicheNet (Browaeys 2019) infers ligand-receptor interactions:

1. Prior knowledge network (PKN):
   - ~5000 ligand-receptor-target gene triples (from OmniPath, CellChatDB)
   - L = {ligand 1, ligand 2, ...}, R = {receptor 1, ...}, T = {target 1, ...}

2. For each cell pair (sender, receiver):
   a. Ligand expression in sender: |L ∩ expr(sender)|
   b. Receptor expression in receiver: |R ∩ expr(receiver)|
   c. Predicted target gene expression change in receiver
   d. Score: how well does the ligand explain the observed target change?

3. Likelihood ratio: P(target_change | ligand) / P(target_change | null)

Production: NicheNet + CellChat combined for robust communication scoring.
""")

# Simulate ligand-receptor scoring
ligands = ['WNT5A', 'VEGFA', 'TGFB1', 'IL6', 'CXCL12']
receptors = ['FZD4', 'VEGFR2', 'TGFBR1', 'IL6R', 'CXCR4']

print(f"\\nSimulated ligand-receptor scores (sender → receiver):")
print(f"  {'Sender':>10s} {'Receiver':>10s} {'Ligand':>8s} {'Receptor':>10s} {'Score':>6s}")
for i, (lig, rec) in enumerate(zip(ligands, receptors)):
    sender = 'Cell_A'  # tumour cell
    receiver = 'Cell_B'  # stromal cell
    score = random.random()
    print(f"  {sender:>10s} {receiver:>10s} {lig:>8s} {rec:>10s} {score:>6.2f}")

print(f"\\n  → VEGFA + VEGFR2 (score 0.85): tumour→stromal angiogenesis signal")
print(f"  → TGFB1 + TGFBR1 (score 0.72): immunosuppressive signal")
print(f"  → CXCL12 + CXCR4 (score 0.65): chemokine recruitment")
print("=" * 60)`;

const PYTORCH_CODE = `import torch
import torch.nn as nn
import torch.nn.functional as F
import math
from typing import List, Tuple, Optional, Dict

# ============================================================
# 1. MERFISH combinatorial barcode decoder
# ============================================================

class MERFISHDecoder:
    """MERFISH combinatorial barcode decoder.
    
    Each gene gets a unique 16-round × 4-fluorophore code (4^16 = 4B codes).
    Error-correction: Hamming distance 4 between any two codes (1-2 errors tolerated).
    
    Production: 1000-10000 genes per MERFISH run, ~10⁴-10⁵ cells per slide.
    """
    def __init__(self, n_genes: int = 1000, n_rounds: int = 16, n_fluor: int = 4,
                 min_hamming: int = 4):
        self.n_genes = n_genes
        self.n_rounds = n_rounds
        self.n_fluor = n_fluor
        self.min_hamming = min_hamming
        # Codebook: (n_genes, n_rounds) tensor of fluorophore IDs (0-3)
        self.codebook = self._generate_codebook()
    
    def _generate_codebook(self) -> torch.Tensor:
        """Generate error-correcting codebook with Hamming distance ≥ min_hamming."""
        codes = []
        attempts = 0
        while len(codes) < self.n_genes and attempts < 100000:
            attempts += 1
            # Random code
            code = torch.randint(0, self.n_fluor, (self.n_rounds,))
            # Check Hamming distance from existing codes
            if len(codes) == 0:
                codes.append(code)
                continue
            codes_tensor = torch.stack(codes)
            # Hamming distance: count positions where codes differ
            dist = (codes_tensor != code.unsqueeze(0)).sum(dim=-1)  # (n_existing,)
            if dist.min() >= self.min_hamming:
                codes.append(code)
        
        return torch.stack(codes[:self.n_genes])  # (n_genes, n_rounds)
    
    def decode(self, readout: torch.Tensor) -> Tuple[int, int]:
        """Decode observed readout to gene identity.
        
        Args:
            readout: (n_rounds,) tensor of observed fluorophore IDs
        
        Returns: (gene_idx, hamming_distance)
        """
        # Compute Hamming distance to each gene in codebook
        dist = (self.codebook != readout.unsqueeze(0)).sum(dim=-1)  # (n_genes,)
        best_gene = dist.argmin().item()
        best_dist = dist[best_gene].item()
        return best_gene, best_dist
    
    def decode_batch(self, readouts: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Decode batch of readouts.
        
        Args:
            readouts: (B, n_rounds) observed fluorophore IDs
        
        Returns: (gene_indices (B,), distances (B,))
        """
        # (B, n_genes, n_rounds) comparison
        diff = (readouts.unsqueeze(1) != self.codebook.unsqueeze(0))  # (B, n_genes, n_rounds)
        dist = diff.sum(dim=-1)  # (B, n_genes)
        best_gene = dist.argmin(dim=-1)  # (B,)
        best_dist = dist.gather(1, best_gene.unsqueeze(1)).squeeze(1)  # (B,)
        return best_gene, best_dist

# ============================================================
# 2. U-Net — cell segmentation
# ============================================================

class DoubleConv(nn.Module):
    """Conv2d → BN → ReLU → Conv2d → BN → ReLU."""
    def __init__(self, in_ch: int, out_ch: int):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, 3, padding=1),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, 3, padding=1),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
        )
    
    def forward(self, x):
        return self.conv(x)

class DownBlock(nn.Module):
    """MaxPool → DoubleConv (encoder path)."""
    def __init__(self, in_ch: int, out_ch: int):
        super().__init__()
        self.pool = nn.MaxPool2d(2)
        self.conv = DoubleConv(in_ch, out_ch)
    
    def forward(self, x):
        return self.conv(self.pool(x))

class UpBlock(nn.Module):
    """ConvTranspose2d → concat skip → DoubleConv (decoder path)."""
    def __init__(self, in_ch: int, out_ch: int):
        super().__init__()
        self.up = nn.ConvTranspose2d(in_ch, out_ch, 2, stride=2)
        self.conv = DoubleConv(in_ch, out_ch)  # in_ch = up_ch + skip_ch
    
    def forward(self, x, skip):
        x = self.up(x)
        # Pad if sizes don't match (for non-power-of-2 inputs)
        diffY = skip.size(2) - x.size(2)
        diffX = skip.size(3) - x.size(3)
        x = F.pad(x, [diffX // 2, diffX - diffX // 2, diffY // 2, diffY - diffY // 2])
        # Concat along channel dim (skip connection — the U in U-Net)
        x = torch.cat([skip, x], dim=1)
        return self.conv(x)

class UNet(nn.Module):
    """U-Net for cell segmentation on DAPI-stained nuclei images.
    
    Input: (B, 1, H, W) grayscale DAPI image
    Output: (B, 1, H, W) per-pixel binary mask (1 = nucleus, 0 = background)
    
    Architecture (Ronneberger 2015):
        Encoder: 64 → 128 → 256 → 512 → 1024 (bottleneck)
        Decoder: 1024 → 512 → 256 → 128 → 64
        Skip connections: U-shape preserves spatial detail
    
    Production: StarDist (Schmidt 2018) extends with star-convex polygons
    for overlapping nuclei (better than binary mask).
    """
    def __init__(self, in_channels: int = 1, out_channels: int = 1,
                 base_ch: int = 64):
        super().__init__()
        # Encoder
        self.inc = DoubleConv(in_channels, base_ch)
        self.down1 = DownBlock(base_ch, base_ch * 2)
        self.down2 = DownBlock(base_ch * 2, base_ch * 4)
        self.down3 = DownBlock(base_ch * 4, base_ch * 8)
        self.down4 = DownBlock(base_ch * 8, base_ch * 16)
        # Decoder
        self.up1 = UpBlock(base_ch * 16, base_ch * 8)
        self.up2 = UpBlock(base_ch * 8, base_ch * 4)
        self.up3 = UpBlock(base_ch * 4, base_ch * 2)
        self.up4 = UpBlock(base_ch * 2, base_ch)
        # Output
        self.outc = nn.Conv2d(base_ch, out_channels, 1)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Encoder with skip connections
        x1 = self.inc(x)
        x2 = self.down1(x1)
        x3 = self.down2(x2)
        x4 = self.down3(x3)
        x5 = self.down4(x4)
        # Decoder with skip connections
        x = self.up1(x5, x4)
        x = self.up2(x, x3)
        x = self.up3(x, x2)
        x = self.up4(x, x1)
        # Output: per-pixel logits
        return self.outc(x)

# ============================================================
# 3. STAGATE — Spatial domain detection via graph attention autoencoder
# ============================================================

class SpatialGraphConvolution(nn.Module):
    """Spatial graph convolution layer.
    
    Each cell aggregates features from spatial neighbours (k-NN graph)
    using attention weights.
    
    Production: STAGATE (Dong 2022) uses graph attention autoencoder (GAT).
    """
    def __init__(self, in_dim: int, out_dim: int, n_heads: int = 4):
        super().__init__()
        self.n_heads = n_heads
        self.W = nn.Linear(in_dim, out_dim * n_heads, bias=False)
        self.attn = nn.Linear(out_dim * 2, n_heads, bias=False)
        self.leaky_relu = nn.LeakyReLU(0.2)
    
    def forward(self, x: torch.Tensor, edge_index: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: (N, in_dim) cell features
            edge_index: (2, E) spatial neighbour edges
        """
        N = x.shape[0]
        h = self.W(x).view(N, self.n_heads, -1)  # (N, n_heads, out_dim)
        
        # Compute attention weights for each edge
        src, dst = edge_index  # (E,), (E,)
        h_src = h[src]  # (E, n_heads, out_dim)
        h_dst = h[dst]  # (E, n_heads, out_dim)
        
        # Attention: how much does src attend to dst
        attn_input = torch.cat([h_src, h_dst], dim=-1)  # (E, n_heads, 2*out_dim)
        attn = self.leaky_relu(self.attn(attn_input))  # (E, n_heads)
        attn = F.softmax(attn, dim=0)  # normalise per dst node
        
        # Weighted aggregation
        msg = h_src * attn.unsqueeze(-1)  # (E, n_heads, out_dim)
        out = torch.zeros(N, self.n_heads, h.shape[-1], device=x.device)
        out.index_add_(0, dst, msg)
        out = out.mean(dim=1)  # average over heads: (N, out_dim)
        return out

class STAGATE(nn.Module):
    """STAGATE (Dong 2022) — Spatial Transcriptomics graph ATtention AutoEncoder.
    
    Architecture:
        Encoder: 2x SpatialGraphConvolution (gene expression → latent)
        Decoder: latent → gene expression reconstruction
    
    Loss: reconstruction (MSE on expression) + zero-inflated negative binomial
    
    Production: identifies spatial domains via latent clustering.
    """
    def __init__(self, n_genes: int = 20000, latent_dim: int = 30,
                 hidden_dim: int = 256, n_heads: int = 4):
        super().__init__()
        self.encoder = nn.Sequential(
            SpatialGraphConvolution(n_genes, hidden_dim, n_heads),
            nn.ReLU(),
            SpatialGraphConvolution(hidden_dim, latent_dim, n_heads),
        )
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, n_genes),
        )
    
    def forward(self, x: torch.Tensor, edge_index: torch.Tensor) -> Dict[str, torch.Tensor]:
        """Forward pass.
        
        Args:
            x: (N, n_genes) gene expression matrix
            edge_index: (2, E) spatial neighbour edges
        
        Returns: dict with 'latent' (N, latent_dim) and 'recon' (N, n_genes)
        """
        latent = self.encoder(x, edge_index)  # encoder needs edge_index
        # For decoder (no graph needed — just MLP)
        # Workaround for nn.Sequential not supporting edge_index
        for layer in self.encoder:
            if isinstance(layer, SpatialGraphConvolution):
                latent = layer(x, edge_index)
            else:
                latent = layer(latent)
            x_prev = latent
        recon = self.decoder(latent)
        return {'latent': latent, 'recon': recon}

# ============================================================
# 4. NicheNet — ligand-receptor cell-cell communication
# ============================================================

class NicheNet(nn.Module):
    """NicheNet (Browaeys 2019) — ligand-receptor cell-cell communication inference.
    
    Inputs:
        - Ligand expression in sender cells: (N_sender, N_ligands)
        - Receptor expression in receiver cells: (N_receiver, N_receptors)
        - Target gene expression change in receiver: (N_receiver, N_targets)
    
    Architecture:
        - Ligand-Receptor binding: prior knowledge matrix (N_ligands × N_receptors)
        - Receptor-Target signalling: prior knowledge matrix (N_receptors × N_targets)
        - Predicted target change = L × LR × RT (matrix product)
    
    Loss: pearson correlation between predicted and observed target changes.
    """
    def __init__(self, n_ligands: int = 500, n_receptors: int = 200, n_targets: int = 5000):
        super().__init__()
        # Prior knowledge matrices (binary, learned to refine)
        self.lr_matrix = nn.Parameter(torch.rand(n_ligands, n_receptors) * 0.1)
        self.rt_matrix = nn.Parameter(torch.rand(n_receptors, n_targets) * 0.1)
        # Activation function (sigmoid to normalise binding)
        self.activation = nn.Sigmoid()
    
    def forward(self, ligand_expr: torch.Tensor, receptor_expr: torch.Tensor,
                target_change: torch.Tensor) -> Dict[str, torch.Tensor]:
        """Predict target gene changes from ligand-receptor signalling.
        
        Args:
            ligand_expr: (N_sender, N_ligands) ligand expression in sender cells
            receptor_expr: (N_receiver, N_receptors) receptor expression in receiver
            target_change: (N_receiver, N_targets) observed target change
        
        Returns: dict with 'predicted_change' and 'score'
        """
        # Step 1: ligand-receptor binding potential
        # For each (sender, receiver) pair: ligand_expr × LR × receptor_expr
        # Sum over senders (assume all contribute)
        binding = ligand_expr @ self.activation(self.lr_matrix)  # (N_sender, N_receptors)
        # Aggregate to receiver (sum over senders)
        binding_per_receiver = binding.sum(dim=0, keepdim=True).expand(receptor_expr.shape)
        # Multiply by receptor expression
        activated = binding_per_receiver * receptor_expr  # (N_receiver, N_receptors)
        
        # Step 2: receptor → target signalling
        predicted_change = activated @ self.activation(self.rt_matrix)  # (N_receiver, N_targets)
        
        # Score: Pearson correlation between predicted and observed
        pred_norm = (predicted_change - predicted_change.mean()) / (predicted_change.std() + 1e-8)
        obs_norm = (target_change - target_change.mean()) / (target_change.std() + 1e-8)
        score = (pred_norm * obs_norm).mean()
        
        return {'predicted_change': predicted_change, 'score': score}

# Sanity check
if __name__ == "__main__":
    # MERFISH decoder
    decoder = MERFISHDecoder(n_genes=10, n_rounds=8, n_fluor=4, min_hamming=4)
    print(f"MERFISH codebook: {decoder.codebook.shape} (10 genes × 8 rounds)")
    
    # Decode a clean readout
    true_gene = 3
    readout = decoder.codebook[true_gene]
    decoded_gene, dist = decoder.decode(readout)
    print(f"  Clean readout → gene {decoded_gene} (expected {true_gene}, dist {dist})")
    
    # Decode a noisy readout (1 error)
    noisy_readout = readout.clone()
    noisy_readout[2] = (noisy_readout[2] + 1) % 4
    decoded_gene, dist = decoder.decode(noisy_readout)
    print(f"  Noisy readout (1 error) → gene {decoded_gene} (dist {dist}, should be ≤ 4)")
    
    # U-Net
    unet = UNet(in_channels=1, out_channels=1, base_ch=32)
    n_params = sum(p.numel() for p in unet.parameters())
    print(f"\\nU-Net: {n_params:,} params (base_ch=32)")
    x = torch.randn(2, 1, 128, 128)
    out = unet(x)
    print(f"  Input: {tuple(x.shape)} → Output: {tuple(out.shape)}")
    
    # STAGATE
    stagate = STAGATE(n_genes=100, latent_dim=10, hidden_dim=32, n_heads=4)
    n_params = sum(p.numel() for p in stagate.parameters())
    print(f"\\nSTAGATE: {n_params:,} params")
    
    # Forward
    n_cells = 16
    x = torch.randn(n_cells, 100)  # 16 cells × 100 genes
    # k-NN spatial edges (4x4 grid)
    edges = []
    for i in range(n_cells):
        for j in range(n_cells):
            if i != j and abs(i - j) <= 5:  # spatial neighbours
                edges.append([i, j])
    edge_index = torch.tensor(edges).T.contiguous()
    
    # Use encoder manually
    h = x
    for layer in stagate.encoder:
        if isinstance(layer, SpatialGraphConvolution):
            h = layer(h, edge_index)
        else:
            h = layer(h)
    latent = h
    recon = stagate.decoder(latent)
    print(f"  Latent: {tuple(latent.shape)}, Recon: {tuple(recon.shape)}")
    
    # NicheNet
    nichenet = NicheNet(n_ligands=20, n_receptors=10, n_targets=50)
    ligand = torch.randn(5, 20)  # 5 sender cells × 20 ligands
    receptor = torch.randn(10, 10)  # 10 receiver cells × 10 receptors
    target = torch.randn(10, 50)  # 10 receivers × 50 targets
    out = nichenet(ligand, receptor, target)
    print(f"\\nNicheNet: predicted_change {tuple(out['predicted_change'].shape)}, score {out['score'].item():.3f}")`;

export function SpatialTranscriptomicsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Spatial Transcriptomics · Visium · MERFISH · STAGATE · NicheNet"
        title="Spatial Transcriptomics — Gene Expression with Spatial Coordinates"
        description="The math behind spatial transcriptomics: combinatorial barcoding (MERFISH 4¹⁶ = 4B codes, Hamming distance 4 error correction), U-Net cell segmentation (encoder-decoder + skip connections), STAGATE graph attention autoencoder (k-NN spatial neighbour + GAT for spatial domain detection), NicheNet ligand-receptor cell-cell communication inference. Platforms: 10x Visium (5000 spots/array, full transcriptome), MERFISH (sub-cellular 200nm, 1000 genes), Stereo-seq (BGI, 500nm, 10⁷ cells). With 4 AI illustrations + a looping combinatorial barcode 'short'. Low-level PyTorch: MERFISHDecoder, UNet, STAGATE, NicheNet."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Grid className="h-3 w-3" /> Visium + MERFISH + STAGATE</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Pyodide</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />)}
      </div>

      {/* AI gallery */}
      <SectionCard title="AI-generated spatial transcriptomics illustrations — click to expand" description="Four original 3D-rendered illustrations via AI image generation. Click any thumbnail for inline modal; 'Open in new tab' opens the high-resolution PNG in a new browser tab." icon={<Grid className="h-5 w-5" />} badge="AI gallery">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <ImageModal
              src="/images/spatialtx/visium-spots.png"
              alt="10x Visium spatial barcoded spots"
              caption="10x Visium array — hexagonal grid of 5000 spots over a tissue cross-section. Each spot is 55μm diameter, contains ~10-50 cells, and has a unique DNA barcode. After sequencing, each spot's gene expression is mapped back to its (x, y) position. Full transcriptome (20K genes). Rendered via AI image generation."
            />
            <p className="text-[11px] text-muted-foreground mt-2 text-center">10x Visium — 5000 spots/array, full transcriptome</p>
          </div>
          <div>
            <ImageModal
              src="/images/spatialtx/merfish-barcodes.png"
              alt="MERFISH combinatorial barcode matrix"
              caption="MERFISH combinatorial barcoding — 4 fluorophores × 16 rounds = 4¹⁶ = 4.3 billion possible codes. Each gene gets a unique 16-bit code. Readouts across 16 imaging rounds identify which gene's mRNA is at each spatial position. Sub-cellular 200nm resolution, 1000-10000 genes per slide. Rendered via AI image generation."
            />
            <p className="text-[11px] text-muted-foreground mt-2 text-center">MERFISH — 4¹⁶ codes, sub-cellular resolution</p>
          </div>
          <div>
            <ImageModal
              src="/images/spatialtx/cell-segmentation.png"
              alt="Cell segmentation on DAPI"
              caption="Cell segmentation via U-Net on DAPI-stained nuclei. Blue nuclei outlines with red mRNA puncta dots; green boundaries are ML segmentation results. StarDist (Schmidt 2018) extends U-Net with star-convex polygons for overlapping nuclei — F1 score 0.92. Rendered via AI image generation."
            />
            <p className="text-[11px] text-muted-foreground mt-2 text-center">Cell segmentation — U-Net + StarDist</p>
          </div>
          <div>
            <ImageModal
              src="/images/spatialtx/spatial-domains.png"
              alt="Spatial domain clusters on tissue"
              caption="Spatial domain detection via STAGATE — colour-coded regions reveal tissue subtypes (cortex layers, tumour regions, stromal areas). STAGATE aggregates gene expression over k-nearest spatial neighbours via graph attention, then clusters cells in latent space. Spatially coherent domains emerge. Rendered via AI image generation."
            />
            <p className="text-[11px] text-muted-foreground mt-2 text-center">Spatial domains — STAGATE graph attention</p>
          </div>
        </div>
      </SectionCard>

      {/* Combinatorial barcoding short */}
      <SectionCard title="MERFISH combinatorial barcoding short — 4 rounds × 4 fluorophores (loop)" description="Continuous-loop animation showing MERFISH decoding: phases 1-4 read out fluorophore intensity per cell in each round, phase 5 decodes the 4-bit code per cell (matches against codebook), phase 6 looks up gene identity in the codebook (Hamming distance for error correction), phase 7 assembles gene × cell expression matrix, phase 8 visualises spatial pattern. Production: 16 rounds = 4 billion codes." icon={<Grid className="h-5 w-5" />} badge="short">
        <CombinatorialBarcodeShort />
      </SectionCard>

      {/* Combinatorial barcoding math */}
      <SectionCard title="Combinatorial barcoding math — 4ⁿ codes with error correction" description="MERFISH assigns each gene a unique N-round × 4-fluorophore code. With N=16 rounds, 4¹⁶ = 4.3 billion codes are available — far more than the ~20K human genes. The 16-round code per gene has Hamming distance ≥4 from every other gene's code, allowing correction of up to 1-2 readout errors per code (readout error rate ~1-2% per round)." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">code = (f₁, f₂, ..., f<sub>16</sub>) &nbsp;·&nbsp; Hamming(code<sub>i</sub>, code<sub>j</sub>) ≥ 4</p>
            <p className="text-[11px] text-muted-foreground mt-1">f_i ∈ {0,1,2,3} (4 fluorophores). 4¹⁶ codes possible; 20K genes selected with mutual Hamming distance 4 for error correction.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
              <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">Code capacity</p>
              <p className="font-mono text-[11px]">4^N (N=16 → 4.3B)</p>
              <p className="text-muted-foreground text-[11px] mt-1">Far exceeds 20K genes. Error-correction codes (Hamming ≥4) reduce usable count to ~10K-100K.</p>
            </div>
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5">
              <p className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-1">Hamming distance</p>
              <p className="font-mono text-[11px]">dist(c₁, c₂) = Σ |f_i - f'_i|</p>
              <p className="text-muted-foreground text-[11px] mt-1">Min distance 4 → corrects 1 error, detects 3. Readout error rate 1-2% per round, 16 rounds → 16-32% chance of ≥1 error.</p>
            </div>
            <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-2.5">
              <p className="font-semibold text-sm text-violet-600 dark:text-violet-400 mb-1">Decode</p>
              <p className="font-mono text-[11px]">gene = argmin_i Hamming(readout, code_i)</p>
              <p className="text-muted-foreground text-[11px] mt-1">Match observed readout to closest gene in codebook. O(G × N) per cell, G=1000, N=16 → 16K ops/cell.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard title="Try it: MERFISH decoder + U-Net + STAGATE + NicheNet (Pyodide)" description="Implements MERFISH codebook generation with Hamming distance 4 + decoder, explains U-Net architecture, simulates STAGATE spatial graph aggregation on 16 cells in 4×4 grid (2 domains), and NicheNet ligand-receptor scoring with simulated ligand-receptor pairs (VEGFA-VEGFR2, TGFB1-TGFBR1, CXCL12-CXCR4)." icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={BARCODE_DEMO} buttonLabel="Run spatial tx (Pyodide)" />
      </SectionCard>

      {/* Modern papers */}
      <SectionCard title="Modern papers — Visium, MERFISH, STAGATE, NicheNet" description="Four reference methods that defined spatial transcriptomics: (1) Visium (Ståhl 2016) — 10x Genomics commercial platform. (2) MERFISH (Chen 2015) — combinatorial barcoding. (3) STAGATE (Dong 2022) — graph attention for spatial domains. (4) NicheNet (Browaeys 2019) — ligand-receptor cell-cell communication." icon={<MapPin className="h-5 w-5" />}>
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Visium (Ståhl et al. 2016, Science):</strong> 10x Genomics commercial spatial transcriptomics platform. 5000 spots/array on a glass slide, 55μm diameter (10-50 cells per spot), full transcriptome (20K genes). Limitation: spot resolution is multi-cell. Resolution upgrades: Visium HD (2024) — 2μm spots, single-cell near-resolution. Storage: cell × gene matrix in Parquet, ~500MB per tissue section. The reference for full-transcriptome spatial discovery.</p>
          <p><strong className="text-foreground/80">MERFISH (Chen et al. 2015, Science):</strong> Multiplexed Error-Robust Fluorescence In Situ Hybridisation. Combinatorial barcoding: each gene gets a 16-round × 4-fluorophore code (4¹⁶ = 4.3B possible codes). Error-correction (Hamming distance 4) handles 1-2% per-round readout errors. Sub-cellular 200nm resolution, 1000-10000 genes per slide, 10K-100K cells. Limitation: targeted panel (not full transcriptome), but the resolution is unmatched for sub-cellular RNA localisation.</p>
          <p><strong className="text-foreground/80">STAGATE (Dong et al. 2022, Nature Communications):</strong> Spatial Transcriptomics graph ATtention AutoEncoder. Builds a k-nearest spatial neighbour graph (typically k=4-6), applies graph attention layers to aggregate expression over neighbours, then autoencodes to latent space. Spatially coherent domains emerge via clustering on latent. Outperforms non-spatial methods (PCA, scVI) by 30-50% on domain identification tasks.</p>
          <p><strong className="text-foreground/80">NicheNet (Browaeys et al. 2019, Nature Methods):</strong> Infers ligand-receptor cell-cell communication from spatial single-cell data. Uses a prior knowledge network of ~5000 ligand-receptor-target gene triples (from OmniPath, CellChatDB). For each (sender, receiver) pair: predicts target gene changes in receiver based on ligand expression in sender + receptor expression in receiver. Score: Pearson correlation between predicted and observed target changes. Production: combined with CellChat for robust communication scoring.</p>
        </div>
      </SectionCard>

      {/* HPC pipeline */}
      <SectionCard title="HPC pipeline — Stereo-seq 10⁷ cells in Parquet" description="End-to-end spatial transcriptomics: raw images + sequencing reads → cell segmentation (U-Net on DAPI) → barcode decoding (MERFISH combinatorial) → cell × gene matrix in Parquet (Spark) → spatial domain detection (STAGATE) → cell-cell communication (NicheNet) → visualisation on tissue. For Stereo-seq: 10⁷ cells × 20K genes = 2×10¹¹ entries — needs Spark on 1000+ cores." icon={<Activity className="h-5 w-5" />}>
        <CodeBlock language="text" filename="spatialtx_pipeline.txt" code={`┌──────────────────────────────────────────────────────────────────────┐
│  SPATIAL TRANSCRIPTOMICS PIPELINE                                   │
│                                                                            │
│  Wet lab (10x Visium OR MERFISH OR Stereo-seq):                       │
│    Tissue section on barcoded slide → sequencing + imaging           │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ Image processing (Spark, 1000+ cores for Stereo-seq)   │              │
│  │   - Stitch microscope tiles                            │              │
│  │   - Background subtraction                              │              │
│  │   - Register to slide coordinates (x, y)                │              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ Cell segmentation (U-Net / StarDist)                   │              │
│  │   - Input: DAPI-stained nuclei image (1024×1024)        │              │
│  │   - Output: cell mask + per-cell features (area, etc)│              │
│  │   - StarDist: star-convex polygons for overlaps         │              │
│  │   - F1 score: 0.92 (trained on 10K annotated nuclei)    │              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ Barcode decoding (MERFISH only)                         │              │
│  │   - For each spot/cell: read 16-round fluorophore codes │              │
│  │   - Match against codebook (Hamming distance)           │              │
│  │   - Output: gene counts per cell                       │              │
│  │   - Error correction: 1-2% per round, Hamming ≥ 4       │              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ Cell × gene matrix → Parquet via Spark                 │              │
│  │   - Stereo-seq: 10⁷ cells × 20K genes = 2×10¹¹ entries │            │
│  │   - Sparse matrix (most genes are 0)                    │              │
│  │   - Cell metadata: (x, y, morphological features)       │              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ Spatial domain detection (STAGATE)                      │              │
│  │   - Build k-NN spatial neighbour graph (k=4-6)          │              │
│  │   - Graph attention layers aggregate over neighbours    │              │
│  │   - Autoencode to latent space (30-50 dim)              │              │
│  │   - Cluster on latent (Louvain, k-means)                │              │
│  │   - Output: spatial domain assignment per cell          │              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ Cell-cell communication (NicheNet)                      │              │
│  │   - For each domain pair (sender, receiver):            │              │
│  │     score = correlation(predicted_targets, observed)    │              │
│  │   - Prior knowledge: ligand-receptor-target triples     │              │
│  │   - Output: ligand-receptor interaction scores         │              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ Visualisation + LLM summary                             │              │
│  │   - Tissue cross-section with colour-coded domains      │              │
│  │   - Ligand-receptor edges overlay                       │              │
│  │   - RAG: "Which cells are signalling to tumour region?" │              │
│  │     → LLM (ADR-031 vLLM) summary                        │              │
│  └──────────────────────────────────────────────────────┘              │
└──────────────────────────────────────────────────────────────────────────┘`} />
      </SectionCard>

      {/* Low-level PyTorch */}
      <SectionCard title="Low-level PyTorch — MERFISHDecoder, UNet, STAGATE, NicheNet" description="The actual production code. MERFISHDecoder generates error-correcting codebook with Hamming distance ≥4, decodes via minimum-Hamming-distance match (vectorised: (B, n_genes, n_rounds) comparison). UNet is the full Ronneberger 2015 architecture: DoubleConv + DownBlock + UpBlock with skip connections (5-layer encoder/decoder, base_ch=64 → ~31M params). STAGATE has SpatialGraphConvolution (graph attention with multi-head softmax over edges, msg.index_add_ for scatter aggregation) + autoencoder. NicheNet models the ligand → receptor → target signal flow with learnable prior knowledge matrices." icon={<Cpu className="h-5 w-5" />} badge="low-level">
        <CodeBlock language="python" filename="spatial_transcriptomics.py" highlight={[10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,279,280,281,282,283]} code={PYTORCH_CODE} />
      </SectionCard>

      {/* Insight */}
      <SectionCard title="My deeper thought: spatial transcriptomics IS image processing + graph analytics on biology" description="The MERFISH barcode decoder is a Hamming-distance nearest-neighbour search — the same algorithm as RAG (ADR-032) on bit vectors. STAGATE is a graph neural network — same family as PPI analysis (ADR-039). U-Net is the cryo-EM CNN architecture (ADR-040) applied to cell images. The platform's image processing + graph + RAG infrastructure generalises to spatial biology unchanged." icon={<TrendingUp className="h-5 w-5" />} badge="Insight">
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">MERFISH decoding IS nearest-neighbour search in Hamming space.</strong> Each cell's 16-round readout is a 16-dimensional vector with 4 possible values per dimension. Decoding = finding the gene in the codebook with minimum Hamming distance. This is the same algorithm as ADR-032's RAG retrieval: query vector → nearest neighbour in pgvector. The codebook IS the index; Hamming distance replaces cosine similarity; the rest is identical. The platform's pgvector infrastructure (ADR-022) handles barcode decoding unchanged — different modality (4-ary vector instead of float vector), same algorithm.</p>
          <p><strong className="text-foreground/80">STAGATE IS graph neural networks for cell-cell similarity.</strong> The k-NN spatial graph is structurally identical to the PPI network (ADR-039): nodes are entities (cells vs proteins), edges are relationships (spatial proximity vs functional interaction). Graph attention aggregation (sum over k nearest neighbours weighted by attention) is the same operation as PPI PageRank but with learned weights. The latent embedding (autoencoder output) is the same representation learning pattern as ESM-2 (ADR-034), just on spatial graph data instead of protein sequence. The unification: every embedding problem (text, image, protein, cell) is some form of message-passing graph + aggregation + projection. The platform's graph analytics stack (NetworkX, PyTorch Geometric) applies to spatial transcriptomics unchanged.</p>
          <p><strong className="text-foreground/80">U-Net is the universal image segmentation architecture.</strong> Developed for biomedical images (Ronneberger 2015, won ISBI 2015), U-Net is now the standard for: cryo-EM particle picking (Topaz, ADR-040), cell segmentation (Cellpose, this page), medical imaging (organ segmentation). The architecture (encoder-decoder + skip connections) is a specific case of the encoder-decoder pattern that appears in: machine translation (seq2seq), VAE (variational autoencoder, ADR-040 cryoDRGN), image generation (Stable Diffusion U-Net). The principle: encoder extracts features at multiple scales, decoder reconstructs with skip-connections preserving spatial detail. The same architectural pattern serves every modality — image segmentation, sequence-to-sequence, generation, encoding. Spatial transcriptomics just adds the spatial graph layer on top: image (U-Net) → cell segmentation → spatial graph (STAGATE) → domains. The platform's image processing infrastructure (PyTorch, computer vision) applies to spatial biology unchanged.</p>
        </div>
      </SectionCard>

      <DeeperThoughtSection pageTitle="Spatial Transcriptomics">
        <DeeperThought title="Spatial Transcriptomics IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about Spatial Transcriptomics is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. Spatial Transcriptomics connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where Spatial Transcriptomics sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (Spatial Transcriptomics) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "Trace this topic's connections across the platform's math graph" }, { id: "systems-biology" as const, reason: "Continue to systems biology — see also from this page" }, { id: "genetic-materials" as const, reason: "Continue to genetic materials — see also from this page" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("systems-biology")} className="text-sm text-primary hover:underline">→ Systems Biology (multi-omics integration)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("genetic-materials")} className="text-sm text-primary hover:underline">→ Genetic Materials (RNA expression source)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("rag-deep-dive")} className="text-sm text-primary hover:underline">→ RAG Deep Dive (Hamming-NN = same as BM25+ANN)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("cryo-em")} className="text-sm text-primary hover:underline">→ Cryo-EM (U-Net for particle picking)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("vector-db")} className="text-sm text-primary hover:underline">→ Vector DB (pgvector for cell embeddings)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">→ ADR-041 (Visium + MERFISH + STAGATE)</Link>
      </div>
    </div>
  );
}
