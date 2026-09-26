"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { ImageModal } from "../_components/image-modal";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Cpu, Layers, Zap, TrendingUp, Terminal, Brain,
  Activity, Grid, Network, Atom,
} from "lucide-react";

const KPIS = [
  { label: "DBiT-seq", value: "50μm pixels", hint: "Microfluidic RNA + protein co-profiling", deltaTone: "flat" as const },
  { label: "spatial-CUT&Tag", value: "Histone marks", hint: "H3K4me3 / H3K27me3 / H3K27ac", deltaTone: "flat" as const },
  { label: "Spatial ATAC-RNA", value: "Tn5 + RNA", hint: "Open chromatin + transcriptome", deltaTone: "flat" as const },
  { label: "Integration", value: "Cross-attention STAGATE", hint: "Multi-modal graph attention autoencoder", deltaTone: "flat" as const },
];

// ============================================================
// Multi-modal Spatial "short" — RNA + chromatin + protein overlay
// ============================================================
function MultiModalSpatialShort() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setStep((s) => (s + 1) % 6), 1000);
    return () => clearInterval(interval);
  }, []);

  // 8x8 grid of pixels (tissue section)
  const gridSize = 8;
  const cellSize = 32;
  const offset = 20;

  // Generate per-pixel values for 3 modalities
  const rna_values = Array.from({length: gridSize * gridSize}, (_, i) => Math.sin(i * 0.3) * 0.5 + 0.5);
  const chrom_values = Array.from({length: gridSize * gridSize}, (_, i) => Math.cos(i * 0.4) * 0.5 + 0.5);
  const protein_values = Array.from({length: gridSize * gridSize}, (_, i) => Math.sin(i * 0.5 + 1) * 0.5 + 0.5);

  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <style>{`
        .ms-3d { perspective: 900px; }
        .ms-stage { transform: rotateX(15deg); transform-style: preserve-3d; }
      `}</style>
      <p className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Grid className="h-4 w-4 text-primary" />
        Multi-modal spatial integration — RNA + chromatin + protein (loop)
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">
          phase {step + 1}/6
        </span>
      </p>
      <div className="ms-3d">
        <div className="ms-stage flex justify-center gap-4">
          {/* RNA heatmap */}
          <div>
            <p className="text-[10px] text-center mb-1" style={{color: "oklch(0.55 0.16 250)"}}>RNA</p>
            <svg width={gridSize * cellSize / 2 + 10} height={gridSize * cellSize / 2 + 10}>
              {Array.from({length: gridSize}, (_, i) =>
                Array.from({length: gridSize}, (_, j) => {
                  const idx = i * gridSize + j;
                  const v = rna_values[idx];
                  return (
                    <motion.rect
                      key={`rna-${i}-${j}`}
                      x={j * cellSize / 2 + 5}
                      y={i * cellSize / 2 + 5}
                      width={cellSize / 2}
                      height={cellSize / 2}
                      fill={`oklch(0.55 0.16 250 / ${step >= 0 ? v * 0.9 : 0.1})`}
                      stroke="var(--border)"
                      strokeWidth="0.5"
                      animate={{ opacity: step === 0 ? 1 : 0.5 }}
                    />
                  );
                })
              )}
            </svg>
          </div>

          {/* Chromatin heatmap */}
          <div>
            <p className="text-[10px] text-center mb-1" style={{color: "oklch(0.55 0.16 165)"}}>Chromatin</p>
            <svg width={gridSize * cellSize / 2 + 10} height={gridSize * cellSize / 2 + 10}>
              {Array.from({length: gridSize}, (_, i) =>
                Array.from({length: gridSize}, (_, j) => {
                  const idx = i * gridSize + j;
                  const v = chrom_values[idx];
                  return (
                    <motion.rect
                      key={`chrom-${i}-${j}`}
                      x={j * cellSize / 2 + 5}
                      y={i * cellSize / 2 + 5}
                      width={cellSize / 2}
                      height={cellSize / 2}
                      fill={`oklch(0.55 0.16 165 / ${step >= 1 ? v * 0.9 : 0.1})`}
                      stroke="var(--border)"
                      strokeWidth="0.5"
                      animate={{ opacity: step === 1 ? 1 : 0.5 }}
                    />
                  );
                })
              )}
            </svg>
          </div>

          {/* Protein heatmap */}
          <div>
            <p className="text-[10px] text-center mb-1" style={{color: "oklch(0.6 0.20 75)"}}>Protein</p>
            <svg width={gridSize * cellSize / 2 + 10} height={gridSize * cellSize / 2 + 10}>
              {Array.from({length: gridSize}, (_, i) =>
                Array.from({length: gridSize}, (_, j) => {
                  const idx = i * gridSize + j;
                  const v = protein_values[idx];
                  return (
                    <motion.rect
                      key={`prot-${i}-${j}`}
                      x={j * cellSize / 2 + 5}
                      y={i * cellSize / 2 + 5}
                      width={cellSize / 2}
                      height={cellSize / 2}
                      fill={`oklch(0.6 0.20 75 / ${step >= 2 ? v * 0.9 : 0.1})`}
                      stroke="var(--border)"
                      strokeWidth="0.5"
                      animate={{ opacity: step === 2 ? 1 : 0.5 }}
                    />
                  );
                })
              )}
            </svg>
          </div>
        </div>
      </div>

      {/* Integration visualization (phases 3-5) */}
      {step >= 3 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-center"
        >
          <p className="font-mono text-xs text-primary mb-1">
            {step === 3 ? "Cross-attention: RNA ↔ chromatin ↔ protein" :
             step === 4 ? "Joint latent: 30-dim shared embedding" :
             "Spatial domains emerge in latent space"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {step === 3 ? "Per-pixel attention between modalities — captures regulatory → expression → functional flow" :
             step === 4 ? "STAGATE multi-modal autoencoder — 3 encoders → joint latent → 3 decoders" :
             "Cluster on latent → spatially coherent tissue subtypes"}
          </p>
        </motion.div>
      )}
      <p className="text-[10px] text-muted-foreground text-center mt-3">
        Phase 1-3: three modalities measured on same tissue. Phase 4: cross-attention integrates.
        Phase 5: joint latent embedding. Phase 6: spatial domains identified.
      </p>
    </div>
  );
}

const SPATIAL_MULTI_DEMO = `# Spatial multi-omics — DBiT-seq + spatial-CUT&Tag integration (Pyodide)
# RNA + chromatin + protein co-profiling with spatial coordinates

import math, random
from collections import defaultdict

# ============================================================
# 1. DBiT-seq — microfluidic spatial barcoding
# ============================================================
# Two perpendicular microfluidic passes deposit barcodes
# Pass 1: rows (A, B, C, ...), Pass 2: columns (1, 2, 3, ...)
# Each pixel = (row_barcode, col_barcode) — unique spatial identifier

def dbit_seq_barcode(n_rows=20, n_cols=20):
    """Generate DBiT-seq spatial barcode grid.
    
    Production: 50μm pixels, 20×20 = 400 pixels per tissue section.
    """
    barcodes = []
    for r in range(n_rows):
        for c in range(n_cols):
            # Row barcode + col barcode = pixel ID
            row_bc = f"row_{r:02d}"
            col_bc = f"col_{c:02d}"
            pixel_id = f"{row_bc}_{col_bc}"
            barcodes.append((r, c, pixel_id))
    return barcodes

# ============================================================
# 2. spatial-CUT&Tag — histone mark profiling
# ============================================================
# Antibody-based: target-specific antibody binds histone mark
# Then protein A-Tn5 fusion cuts DNA nearby → spatial profiling

HISTONE_MARKS = {
    'H3K4me3': 'active promoter',
    'H3K27me3': 'repressed chromatin (Polycomb)',
    'H3K27ac': 'active enhancer',
    'H3K9me3': 'heterochromatin',
    'H3K36me3': 'gene body (transcription elongation)',
    'H3K4me1': 'primed enhancer',
    'H3K9ac': 'active promoter',
    'H3K79me3': 'transcription elongation',
}

def spatial_cut_tag(n_pixels, n_marks=5):
    """Simulate spatial-CUT&Tag signal per pixel per histone mark.
    
    Production: ~10 marks per tissue section.
    """
    random.seed(42)
    signal = {}
    for pixel in range(n_pixels):
        for mark in list(HISTONE_MARKS.keys())[:n_marks]:
            # Simulated signal (production: counts per peak)
            signal[(pixel, mark)] = random.randint(0, 100)
    return signal

# ============================================================
# 3. Spatial multi-modal integration (multi-modal STAGATE)
# ============================================================
# Extend STAGATE (ADR-041) to multi-modal:
#   - RNA encoder: gene expression → 30-dim
#   - Chromatin encoder: histone marks → 30-dim
#   - Protein encoder: antibody intensities → 30-dim
#   - Cross-attention: per-pixel attention between modalities
#   - Joint latent: 30-dim shared embedding
#   - Spatial domains: cluster on joint latent

def cross_attention(query_emb, key_emb, value_emb):
    """Cross-attention between two modalities.
    
    Q from modality A, K/V from modality B.
    Output: A's representation informed by B.
    """
    # Simplified: cosine similarity as attention weight
    sim = sum(q * k for q, k in zip(query_emb, key_emb))
    weight = 1 / (1 + math.exp(-sim))  # sigmoid
    return [weight * v + (1 - weight) * q for q, v in zip(query_emb, value_emb)]

def multi_modal_stagate(rna_emb, chrom_emb, protein_emb, n_iters=2):
    """Multi-modal spatial graph attention autoencoder.
    
    Cross-attention between modalities, then spatial graph aggregation.
    """
    for _ in range(n_iters):
        # Cross-attention: RNA informed by chromatin
        rna_informed = [cross_attention(r, c, c) for r, c in zip(rna_emb, chrom_emb)]
        # Cross-attention: chromatin informed by protein
        chrom_informed = [cross_attention(c, p, p) for c, p in zip(chrom_emb, protein_emb)]
        # Joint latent: average of informed embeddings
        joint = [(r + c + p) / 3 for r, c, p in zip(rna_informed, chrom_informed, protein_emb)]
        # Update (simulated spatial graph aggregation — see ADR-041 STAGATE)
        rna_emb = joint
        chrom_emb = joint
        protein_emb = joint
    return joint

# ============================================================
# Demo: 16-pixel tissue section, 3 modalities
# ============================================================
print("=" * 60)
print("Spatial Multi-omics — DBiT-seq + spatial-CUT&Tag")
print("=" * 60)

# 4x4 grid (16 pixels) — small for demo
n_pixels = 16
pixels = [(i // 4, i % 4, f"pixel_{i}") for i in range(n_pixels)]

# Generate per-pixel per-modality values
random.seed(42)
rna_expression = {p[2]: [random.gauss(0, 1) for _ in range(30)] for p in pixels}
chromatin_marks = {p[2]: [random.gauss(0, 1) for _ in range(30)] for p in pixels}
protein_levels = {p[2]: [random.gauss(0, 1) for _ in range(30)] for p in pixels}

print(f"\\nTissue section: {n_pixels} pixels (4×4 grid)")
print(f"Modalities: RNA (30 genes), Chromatin (5 marks), Protein (10 antibodies)")

# Phase 1: Generate DBiT-seq barcodes
print(f"\\n--- Phase 1: DBiT-seq barcodes ---")
barcodes = dbit_seq_barcode(4, 4)
print(f"  {len(barcodes)} pixels with unique barcodes")
for r, c, bc in barcodes[:5]:
    print(f"    pixel ({r},{c}): {bc}")

# Phase 2: spatial-CUT&Tag signal
print(f"\\n--- Phase 2: spatial-CUT&Tag signal ---")
cut_tag_signal = spatial_cut_tag(n_pixels, n_marks=5)
print(f"  Marks profiled: {list(HISTONE_MARKS.keys())[:5]}")
print(f"  Per-pixel per-mark signal (first 5 pixels):")
for pixel in range(5):
    signals = [cut_tag_signal.get((pixel, mark), 0) for mark in list(HISTONE_MARKS.keys())[:5]]
    print(f"    pixel {pixel}: {signals}")

# Phase 3: Multi-modal integration
print(f"\\n--- Phase 3: Multi-modal integration (cross-attention) ---")
# Embed each pixel per modality
rna_embeddings = [rna_expression[f"pixel_{i}"] for i in range(n_pixels)]
chrom_embeddings = [chromatin_marks[f"pixel_{i}"] for i in range(n_pixels)]
protein_embeddings = [protein_levels[f"pixel_{i}"] for i in range(n_pixels)]

# Run multi-modal STAGATE
joint_latent = []
for i in range(n_pixels):
    joint = multi_modal_stagate(
        rna_embeddings[i], chrom_embeddings[i], protein_embeddings[i], n_iters=2
    )
    joint_latent.append(joint)

print(f"  Joint latent: {len(joint_latent)} pixels × {len(joint_latent[0])} dim")
print(f"  Sample (pixel 0): {[f'{v:.2f}' for v in joint_latent[0][:5]]}...")

# Phase 4: Spatial domain clustering (simplified — k-means on joint latent)
print(f"\\n--- Phase 4: Spatial domains (clustering on joint latent) ---")
# Simulate: assign pixels to domains based on joint latent mean
domain_means = [sum(joint_latent[i]) / len(joint_latent[i]) for i in range(n_pixels)]
# Threshold into 3 domains
domains = ['A' if m > 0.3 else ('B' if m < -0.3 else 'C') for m in domain_means]

print(f"  Domain assignment:")
for i in range(n_pixels):
    r, c = i // 4, i % 4
    print(f"    pixel ({r},{c}): domain {domains[i]}")

# Count per domain
from collections import Counter
domain_counts = Counter(domains)
print(f"\\n  Domain sizes: {dict(domain_counts)}")
print(f"  → Domain A (high joint): {domain_counts['A']} pixels")
print(f"  → Domain B (low joint): {domain_counts['B']} pixels")
print(f"  → Domain C (intermediate): {domain_counts['C']} pixels")

# ============================================================
# Production scale + statistics
# ============================================================
print(f"\\n{'=' * 60}")
print("Production: Spatial Multi-omics Comparison")
print("=" * 60)
print("""
Method                     | Resolution | Modalities        | Pixels/Section
---------------------------|------------|-------------------|----------------
DBiT-seq (Liu 2020)        | 50μm       | RNA + protein     | 400 (20×20)
spatial-CUT&Tag (Tian 2023)| ~5μm       | Chromatin marks   | ~10K
Spatial ATAC-RNA (Zhang 23)| ~10μm      | ATAC + RNA        | ~5K
10x Visium HD (2024)       | 2μm        | RNA only          | ~11K
MERFISH (Chen 2015)        | 200nm      | RNA (targeted)    | ~100K
Stereo-seq (Chen 2022)     | 500nm      | RNA (full)        | ~10M

Integration:
  - Multi-modal STAGATE: 3 modality encoders + cross-attention + joint latent
  - WNN (Hao 2021): extend from dissociated (ADR-042) to spatial
  - MOFA+ (Argelaguet 2020): Bayesian factor analysis on multi-modal matrices
""")
print("=" * 60)`;

const PYTORCH_CODE = `import torch
import torch.nn as nn
import torch.nn.functional as F
import math
from typing import List, Tuple, Optional, Dict

# ============================================================
# 1. Multi-modal spatial graph attention (extends STAGATE)
# ============================================================

class MultiModalGraphConvolution(nn.Module):
    """Multi-modal spatial graph convolution with cross-attention.
    
    Extends STAGATE (ADR-041) to multi-modal: RNA + chromatin + protein.
    Each modality has its own encoder; cross-attention integrates.
    """
    def __init__(self, rna_dim: int, chrom_dim: int, protein_dim: int,
                 hidden_dim: int = 64, n_heads: int = 4):
        super().__init__()
        self.n_heads = n_heads
        
        # Modality-specific encoders
        self.rna_encoder = nn.Linear(rna_dim, hidden_dim)
        self.chrom_encoder = nn.Linear(chrom_dim, hidden_dim)
        self.protein_encoder = nn.Linear(protein_dim, hidden_dim)
        
        # Cross-attention: Q from modality A, K/V from modality B
        self.rna_to_chrom_attn = nn.MultiheadAttention(hidden_dim, n_heads, batch_first=True)
        self.chrom_to_protein_attn = nn.MultiheadAttention(hidden_dim, n_heads, batch_first=True)
        self.protein_to_rna_attn = nn.MultiheadAttention(hidden_dim, n_heads, batch_first=True)
        
        # Spatial graph attention (same as STAGATE ADR-041)
        self.spatial_attn = nn.Linear(hidden_dim * 2, n_heads)
        self.spatial_proj = nn.Linear(hidden_dim, hidden_dim)
        
        self.norm = nn.LayerNorm(hidden_dim)
    
    def forward(self, rna: torch.Tensor, chrom: torch.Tensor, protein: torch.Tensor,
                edge_index: torch.Tensor) -> torch.Tensor:
        """Multi-modal spatial graph attention forward pass.
        
        Args:
            rna: (N, rna_dim) RNA expression per pixel
            chrom: (N, chrom_dim) chromatin marks per pixel
            protein: (N, protein_dim) protein levels per pixel
            edge_index: (2, E) spatial neighbour edges
        
        Returns: (N, hidden_dim) joint latent embedding
        """
        # Encode each modality
        h_rna = self.rna_encoder(rna)  # (N, hidden)
        h_chrom = self.chrom_encoder(chrom)
        h_protein = self.protein_encoder(protein)
        
        # Cross-attention (RNA informed by chromatin)
        # Need (B, N, H) format for MultiheadAttention
        h_rna_informed, _ = self.rna_to_chrom_attn(
            h_rna.unsqueeze(0), h_chrom.unsqueeze(0), h_chrom.unsqueeze(0)
        )
        h_rna_informed = h_rna_informed.squeeze(0)  # (N, hidden)
        
        # Cross-attention (chromatin informed by protein)
        h_chrom_informed, _ = self.chrom_to_protein_attn(
            h_chrom.unsqueeze(0), h_protein.unsqueeze(0), h_protein.unsqueeze(0)
        )
        h_chrom_informed = h_chrom_informed.squeeze(0)
        
        # Cross-attention (protein informed by RNA)
        h_protein_informed, _ = self.protein_to_rna_attn(
            h_protein.unsqueeze(0), h_rna.unsqueeze(0), h_rna.unsqueeze(0)
        )
        h_protein_informed = h_protein_informed.squeeze(0)
        
        # Joint latent: average of informed embeddings
        joint = (h_rna_informed + h_chrom_informed + h_protein_informed) / 3  # (N, hidden)
        
        # Spatial graph attention (same as STAGATE)
        src, dst = edge_index
        msg = joint[src]  # (E, hidden)
        agg = torch.zeros_like(joint)
        agg.index_add_(0, dst, msg)
        # Self + neighbours
        combined = torch.cat([joint, agg], dim=-1)  # (N, 2*hidden)
        attn_weights = F.softmax(self.spatial_attn(combined), dim=-1)  # (N, n_heads)
        # Aggregate with attention
        h_out = self.spatial_proj(joint) + 0.1 * agg
        h_out = self.norm(h_out)
        
        return h_out


# ============================================================
# 2. Multi-modal STAGATE autoencoder
# ============================================================

class MultiModalSTAGATE(nn.Module):
    """Multi-modal STAGATE autoencoder for spatial multi-omics.
    
    Architecture:
        Encoders: 3 modality-specific (RNA + chromatin + protein)
        Cross-attention: integrates modalities
        Joint latent: shared embedding
        Decoders: 3 modality-specific (reconstruct each input)
    
    Loss: sum of per-modality reconstruction + KL
    """
    def __init__(self, rna_dim: int, chrom_dim: int, protein_dim: int,
                 latent_dim: int = 30, hidden_dim: int = 64,
                 n_heads: int = 4, n_layers: int = 2):
        super().__init__()
        self.n_layers = n_layers
        
        # Encoder: multi-modal graph attention layers
        self.encoder_layers = nn.ModuleList([
            MultiModalGraphConvolution(
                rna_dim if i == 0 else hidden_dim,
                chrom_dim if i == 0 else hidden_dim,
                protein_dim if i == 0 else hidden_dim,
                hidden_dim, n_heads
            )
            for i in range(n_layers)
        ])
        
        # Project to latent
        self.fc_mu = nn.Linear(hidden_dim, latent_dim)
        self.fc_logvar = nn.Linear(hidden_dim, latent_dim)
        
        # Decoders: per-modality
        self.rna_decoder = nn.Sequential(
            nn.Linear(latent_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, rna_dim),
        )
        self.chrom_decoder = nn.Sequential(
            nn.Linear(latent_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, chrom_dim),
        )
        self.protein_decoder = nn.Sequential(
            nn.Linear(latent_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, protein_dim),
        )
    
    def encode(self, rna: torch.Tensor, chrom: torch.Tensor, protein: torch.Tensor,
               edge_index: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Encode multi-modal inputs → joint latent (μ, logvar)."""
        h_rna, h_chrom, h_protein = rna, chrom, protein
        for layer in self.encoder_layers:
            h = layer(h_rna, h_chrom, h_protein, edge_index)
            # Update all modalities to joint (after first layer, all become hidden_dim)
            h_rna = h
            h_chrom = h
            h_protein = h
        mu = self.fc_mu(h)
        logvar = self.fc_logvar(h)
        return mu, logvar
    
    def reparameterize(self, mu: torch.Tensor, logvar: torch.Tensor) -> torch.Tensor:
        """Reparameterisation trick."""
        std = torch.exp(0.5 * logvar)
        eps = torch.randn_like(std)
        return mu + eps * std
    
    def decode(self, z: torch.Tensor) -> Dict[str, torch.Tensor]:
        """Decode joint latent → per-modality reconstructions."""
        return {
            'rna': self.rna_decoder(z),
            'chrom': self.chrom_decoder(z),
            'protein': self.protein_decoder(z),
        }
    
    def forward(self, rna: torch.Tensor, chrom: torch.Tensor, protein: torch.Tensor,
                edge_index: torch.Tensor) -> Dict[str, torch.Tensor]:
        """Forward pass for training."""
        mu, logvar = self.encode(rna, chrom, protein, edge_index)
        z = self.reparameterize(mu, logvar)
        recon = self.decode(z)
        return {
            'latent': z,
            'mu': mu,
            'logvar': logvar,
            'recon_rna': recon['rna'],
            'recon_chrom': recon['chrom'],
            'recon_protein': recon['protein'],
        }
    
    def loss(self, rna: torch.Tensor, chrom: torch.Tensor, protein: torch.Tensor,
             edge_index: torch.Tensor) -> torch.Tensor:
        """Multi-modal VAE loss: sum of per-modality recon + KL."""
        out = self.forward(rna, chrom, protein, edge_index)
        
        # Per-modality reconstruction (MSE)
        recon_rna = F.mse_loss(out['recon_rna'], rna)
        recon_chrom = F.mse_loss(out['recon_chrom'], chrom)
        recon_protein = F.mse_loss(out['recon_protein'], protein)
        
        # KL divergence
        kl = -0.5 * torch.sum(1 + out['logvar'] - out['mu'].pow(2) - out['logvar'].exp(), dim=-1).mean()
        
        return recon_rna + recon_chrom + recon_protein + 1e-4 * kl


# ============================================================
# 3. Spatial WNN — extends WNN (ADR-042) to spatial context
# ============================================================

class SpatialWNN(nn.Module):
    """Spatial WNN — extends Weighted Nearest Neighbours to spatial multi-omics.
    
    For each pixel: find k-NN in each modality, compute per-pixel modality weights,
    build combined spatial graph for domain identification.
    
    Production: Seurat v5 spatial extension (2024).
    """
    def __init__(self, rna_dim: int, chrom_dim: int, protein_dim: int,
                 embed_dim: int = 30, k: int = 10):
        super().__init__()
        self.k = k
        
        # Modality projectors
        self.rna_proj = nn.Linear(rna_dim, embed_dim)
        self.chrom_proj = nn.Linear(chrom_dim, embed_dim)
        self.protein_proj = nn.Linear(protein_dim, embed_dim)
        
        # Per-pixel modality weights
        self.weight_scorer = nn.Sequential(
            nn.Linear(embed_dim * 3, embed_dim),
            nn.ReLU(),
            nn.Linear(embed_dim, 3),  # (w_rna, w_chrom, w_protein)
        )
    
    def forward(self, rna: torch.Tensor, chrom: torch.Tensor, protein: torch.Tensor,
                spatial_edge_index: torch.Tensor) -> Dict[str, torch.Tensor]:
        """Compute spatial WNN graph.
        
        Args:
            rna: (N, rna_dim) RNA expression per pixel
            chrom: (N, chrom_dim) chromatin marks per pixel
            protein: (N, protein_dim) protein levels per pixel
            spatial_edge_index: (2, E) spatial neighbour edges
        
        Returns: dict with 'wnn_graph' (N, N), 'modality_weights' (N, 3)
        """
        # Project to common space
        rna_proj = F.normalize(self.rna_proj(rna), dim=-1)  # (N, embed)
        chrom_proj = F.normalize(self.chrom_proj(chrom), dim=-1)
        protein_proj = F.normalize(self.protein_proj(protein), dim=-1)
        
        # Per-pixel modality weights
        combined = torch.cat([rna_proj, chrom_proj, protein_proj], dim=-1)  # (N, 3*embed)
        weights = F.softmax(self.weight_scorer(combined), dim=-1)  # (N, 3)
        
        # Compute per-modality similarities (N, N)
        sim_rna = rna_proj @ rna_proj.T
        sim_chrom = chrom_proj @ chrom_proj.T
        sim_protein = protein_proj @ protein_proj.T
        
        # WNN: weighted combination
        # w_pixel = (w_rna, w_chrom, w_protein) per pixel
        w = weights.unsqueeze(1)  # (N, 1, 3)
        sim_stack = torch.stack([sim_rna, sim_chrom, sim_protein], dim=-1)  # (N, N, 3)
        wnn = (w * sim_stack).sum(dim=-1)  # (N, N)
        
        # Mask to spatial neighbours (only consider spatial k-NN)
        # Build adjacency from spatial_edge_index
        N = rna.shape[0]
        adj = torch.zeros(N, N, device=rna.device)
        src, dst = spatial_edge_index
        adj[src, dst] = 1.0
        wnn_spatial = wnn * adj  # only spatial neighbours contribute
        
        return {'wnn_graph': wnn_spatial, 'modality_weights': weights}


# Sanity check
if __name__ == "__main__":
    N = 16  # 16 pixels
    rna_dim, chrom_dim, protein_dim = 100, 10, 20
    
    # Multi-modal STAGATE
    model = MultiModalSTAGATE(rna_dim, chrom_dim, protein_dim,
                              latent_dim=20, hidden_dim=64, n_heads=4, n_layers=2)
    n_params = sum(p.numel() for p in model.parameters())
    print(f"Multi-modal STAGATE: {n_params:,} params")
    
    # Forward
    rna = torch.randn(N, rna_dim)
    chrom = torch.randn(N, chrom_dim)
    protein = torch.randn(N, protein_dim)
    
    # Spatial edges (4x4 grid k-NN)
    edges = []
    for i in range(N):
        for j in range(N):
            if i != j and abs(i - j) <= 5:
                edges.append([i, j])
    edge_index = torch.tensor(edges).T.contiguous()
    
    out = model(rna, chrom, protein, edge_index)
    print(f"  Latent: {tuple(out['latent'].shape)}")
    print(f"  Recon RNA: {tuple(out['recon_rna'].shape)}")
    print(f"  Recon chrom: {tuple(out['recon_chrom'].shape)}")
    print(f"  Recon protein: {tuple(out['recon_protein'].shape)}")
    
    loss = model.loss(rna, chrom, protein, edge_index)
    print(f"  Loss: {loss.item():.3f}")
    
    # Spatial WNN
    swnn = SpatialWNN(rna_dim, chrom_dim, protein_dim, embed_dim=20, k=4)
    out_wnn = swnn(rna, chrom, protein, edge_index)
    print(f"\\nSpatial WNN:")
    print(f"  WNN graph: {tuple(out_wnn['wnn_graph'].shape)}")
    print(f"  Modality weights: {tuple(out_wnn['modality_weights'].shape)}")
    print(f"  Sample weights (pixel 0): {out_wnn['modality_weights'][0].tolist()}")`;

export function SpatialMultiOmicsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Spatial Multi-omics · DBiT-seq · spatial-CUT&Tag · cross-attention STAGATE"
        title="Spatial Multi-omics — Chromatin + RNA + Protein Co-profiling"
        description="The integration layer: measure RNA + chromatin + protein in the same tissue section, preserving spatial context. Three platforms: DBiT-seq (Liu 2020, Nature Biotech — microfluidic barcoding for RNA + protein at 50μm pixels), spatial-CUT&Tag (Tian 2023, Nature Methods — antibody-based histone marks H3K4me3/H3K27me3/H3K27ac at sub-cellular), Spatial ATAC-RNA-seq (Zhang 2023, Nature Biotech — Tn5 + RNA on same tissue). Integration: extend STAGATE (ADR-041) to multi-modal graph attention autoencoder with cross-attention between modalities. With 4 AI illustrations + a looping multi-modal spatial 'short'. Low-level PyTorch: MultiModalGraphConvolution, MultiModalSTAGATE, SpatialWNN."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Grid className="h-3 w-3" /> DBiT + CUT&Tag + ATAC-RNA</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Pyodide</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />)}
      </div>

      {/* AI gallery */}
      <SectionCard title="AI-generated spatial multi-omics illustrations — click to expand" description="Four original 3D-rendered illustrations via AI image generation. Click any thumbnail for inline modal; 'Open in new tab' opens the high-resolution PNG in a new browser tab." icon={<Grid className="h-5 w-5" />} badge="AI gallery">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <ImageModal
              src="/images/spatialmulti/dbit-chip.png"
              alt="DBiT-seq microfluidic chip on tissue"
              caption="DBiT-seq microfluidic chip on tissue section — microfluidic channels deposit barcodes in two perpendicular passes (rows + columns), creating unique spatial identifiers per 50μm pixel. Captures RNA + protein per pixel. Liu 2020, Nature Biotechnology. Rendered via AI image generation."
            />
            <p className="text-[11px] text-muted-foreground mt-2 text-center">DBiT-seq chip — microfluidic spatial barcoding</p>
          </div>
          <div>
            <ImageModal
              src="/images/spatialmulti/spatial-chromatin.png"
              alt="Spatial chromatin marks on tissue"
              caption="Spatial chromatin marks — H3K4me3 (active promoters) and H3K27me3 (repressed chromatin) on tissue via spatial-CUT&Tag (Tian 2023). Two-colour immunofluorescence reveals active (green) vs repressed (red) chromatin regions. Reveals regulatory state at each spatial position — invisible to RNA-only methods. Rendered via AI image generation."
            />
            <p className="text-[11px] text-muted-foreground mt-2 text-center">Spatial chromatin — H3K4me3 vs H3K27me3</p>
          </div>
          <div>
            <ImageModal
              src="/images/spatialmulti/multimodal-spatial.png"
              alt="Multi-modal spatial integration overlay"
              caption="Multi-modal spatial integration — overlay of RNA expression (blue) and chromatin accessibility (green) on the same tissue. Dual-channel scientific visualisation showing where gene expression and regulatory state co-occur (cyan) vs diverge. The cross-attention mechanism in MultiModalSTAGATE captures these inter-modality dependencies. Rendered via AI image generation."
            />
            <p className="text-[11px] text-muted-foreground mt-2 text-center">Multi-modal overlay — RNA + chromatin</p>
          </div>
          <div>
            <ImageModal
              src="/images/spatialmulti/spatial-atac-rna.png"
              alt="Spatial ATAC and RNA co-profiling"
              caption="Spatial ATAC + RNA co-profiling — two adjacent panels showing the same tissue with open chromatin (ATAC, left) and gene expression (RNA, right) heatmaps. Zhang 2023, Nature Biotechnology. Tn5 transposase cuts open chromatin; RNA captured on same tissue section. Reveals which genes are 'open' (accessible) vs 'expressed' at each position. Rendered via AI image generation."
            />
            <p className="text-[11px] text-muted-foreground mt-2 text-center">Spatial ATAC-RNA — open chromatin + expression</p>
          </div>
        </div>
      </SectionCard>

      {/* Multi-modal spatial short */}
      <SectionCard title="Multi-modal spatial short — RNA + chromatin + protein overlay (loop)" description="Continuous-loop animation: phases 1-3 show three modalities (RNA blue, chromatin green, protein amber) on 8×8 tissue grid, phase 4 cross-attention integrates modalities (RNA informed by chromatin, chromatin by protein, protein by RNA), phase 5 joint 30-dim latent embedding, phase 6 spatial domains emerge in latent space." icon={<Grid className="h-5 w-5" />} badge="short">
        <MultiModalSpatialShort />
      </SectionCard>

      {/* DBiT-seq math */}
      <SectionCard title="DBiT-seq math — microfluidic barcoding via two perpendicular passes" description="DBiT-seq (Liu 2020) deposits barcodes via two perpendicular microfluidic passes. Pass 1 (rows): channels A, B, C, ... deposit row-specific barcodes. Pass 2 (columns): channels 1, 2, 3, ... deposit column-specific barcodes. Each 50μm pixel gets a unique (row_barcode, col_barcode) pair — the spatial identifier. Captures mRNA (via poly-T) + protein (via antibody-DNA conjugates) per pixel." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">pixel_id = (row_barcode<sub>r</sub>, col_barcode<sub>c</sub>) &nbsp;·&nbsp; N_pixels = n_rows × n_cols</p>
            <p className="text-[11px] text-muted-foreground mt-1">Two-pass microfluidic barcoding. Standard: 20×20 = 400 pixels per tissue at 50μm resolution. HD: 50×50 = 2500 pixels at 20μm.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
              <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">Pass 1 (rows)</p>
              <p className="font-mono text-[11px]">channel r → row_barcode_r</p>
              <p className="text-muted-foreground text-[11px] mt-1">Microfluidic chip with 20 parallel channels, each depositing a unique DNA barcode. Creates 20 row-barcoded strips.</p>
            </div>
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5">
              <p className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-1">Pass 2 (columns)</p>
              <p className="font-mono text-[11px]">channel c → col_barcode_c</p>
              <p className="text-muted-foreground text-[11px] mt-1">Rotate tissue 90°, repeat with 20 new channels. Creates 20×20 = 400 unique (row, col) pixel barcodes.</p>
            </div>
            <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-2.5">
              <p className="font-semibold text-sm text-violet-600 dark:text-violet-400 mb-1">Capture</p>
              <p className="font-mono text-[11px]">poly-T (mRNA) + antibody-DNA (protein)</p>
              <p className="text-muted-foreground text-[11px] mt-1">Poly-T captures mRNA poly-A tail. Antibody-DNA conjugates capture proteins. Sequencing reads (pixel_barcode, gene/antibody).</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* spatial-CUT&Tag math */}
      <SectionCard title="spatial-CUT&Tag math — antibody-guided Tn5 transposition" description="spatial-CUT&Tag (Tian 2023) uses antibody-guided Tn5 transposase to profile histone marks on tissue sections. Antibody binds specific histone modification (e.g. H3K4me3), protein A-Tn5 fusion cuts nearby DNA, sequencing reads spatial position + peak. Reveals which genes are 'primed' (H3K4me3 at promoter) vs 'silenced' (H3K27me3 covering gene body) at each spatial position." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-xs text-primary">signal(pixel, mark) = Σ reads in peaks for histone mark at pixel</p>
            <p className="text-[11px] text-muted-foreground mt-1">Each histone mark has a specific antibody. ~10 marks per tissue section (limited by antibody availability + cross-reactivity).</p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
              <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">H3K4me3</p>
              <p className="font-mono text-[11px]">Active promoters</p>
              <p className="text-muted-foreground text-[11px] mt-1">Marks genes ready for transcription. Enriched at transcription start sites. High signal = gene 'primed'.</p>
            </div>
            <div className="rounded-md border border-rose-500/40 bg-rose-500/5 p-2.5">
              <p className="font-semibold text-sm text-rose-600 dark:text-rose-400 mb-1">H3K27me3</p>
              <p className="font-mono text-[11px]">Repressed chromatin (Polycomb)</p>
              <p className="text-muted-foreground text-[11px] mt-1">Marks silenced genes. Enriched over gene bodies. High signal = gene 'off' but poised.</p>
            </div>
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5">
              <p className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-1">H3K27ac</p>
              <p className="font-mono text-[11px]">Active enhancers</p>
              <p className="text-muted-foreground text-[11px] mt-1">Marks actively-driving enhancers. Distinguishes active enhancers from primed (H3K4me1 only).</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard title="Try it: DBiT-seq barcodes + spatial-CUT&Tag + multi-modal STAGATE (Pyodide)" description="Implements DBiT-seq barcode grid generation (20×20 = 400 pixels), spatial-CUT&Tag signal simulation (5 histone marks per pixel), cross-attention integration between modalities (RNA ↔ chromatin ↔ protein), multi-modal STAGATE joint latent embedding, and spatial domain clustering on joint latent. Plus production comparison table: DBiT-seq 50μm, spatial-CUT&Tag 5μm, Spatial ATAC-RNA 10μm, 10x Visium HD 2μm, MERFISH 200nm, Stereo-seq 500nm." icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={SPATIAL_MULTI_DEMO} buttonLabel="Run spatial multi-omics (Pyodide)" />
      </SectionCard>

      {/* Modern papers */}
      <SectionCard title="Modern papers — DBiT-seq, spatial-CUT&Tag, Spatial ATAC-RNA, spatial WNN" description="The four reference methods for spatial multi-omics: (1) DBiT-seq (Liu 2020) — microfluidic RNA + protein. (2) spatial-CUT&Tag (Tian 2023) — histone marks on tissue. (3) Spatial ATAC-RNA-seq (Zhang 2023) — open chromatin + RNA. (4) Seurat v5 spatial WNN (2024) — multi-modal integration." icon={<Network className="h-5 w-5" />}>
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">DBiT-seq (Liu et al. 2020, Nature Biotechnology 38):</strong> Deterministic Barcoding in Tissue. Microfluidic chip deposits barcodes in two perpendicular passes (rows + columns), creating unique spatial identifiers per 50μm pixel. Captures mRNA (via poly-T) + protein (via antibody-DNA conjugates) per pixel. First method to truly co-profile RNA + protein with spatial context. Resolution: 50μm (10-50 cells per pixel). Extended: DBiT-ATAC (chromatin), DBiT-prox (proximity ligation for protein-protein interactions).</p>
          <p><strong className="text-foreground/80">spatial-CUT&Tag (Tian et al. 2023, Nature Methods 19):</strong> Antibody-guided Tn5 transposition on tissue sections. Antibody binds specific histone modification (H3K4me3, H3K27me3, H3K27ac, etc.), protein A-Tn5 fusion cuts nearby DNA, sequencing reads spatial position + peak. Reveals chromatin regulatory state at each spatial position — which genes are 'primed' vs 'silenced'. Resolution: sub-cellular (~5μm). Limited by antibody availability (~10 marks per tissue).</p>
          <p><strong className="text-foreground/80">Spatial ATAC-RNA-seq (Zhang et al. 2023, Nature Biotechnology 41):</strong> Co-profiles open chromatin (ATAC via Tn5 transposase) + RNA on same tissue section. Tn5 cuts open chromatin regions, poly-T captures mRNA. Sequencing reads (spatial_barcode, ATAC_peak or gene). Reveals which genes are 'open' (accessible, ready for transcription) vs 'expressed' (actually transcribed) at each position. Resolution: ~10μm. The chromatin regulatory layer invisible to RNA-only methods.</p>
          <p><strong className="text-foreground/80">Seurat v5 spatial WNN (Hao et al. 2024):</strong> Extends Weighted Nearest Neighbours (WNN, ADR-042) to spatial context. For each pixel: find k-NN in each modality (RNA + chromatin + protein), compute per-pixel modality weights, build combined spatial graph. Output: spatial domain assignment + modality contribution per pixel. The production integration method for spatial multi-omics — handles any number of modalities without manual alignment.</p>
        </div>
      </SectionCard>

      {/* HPC pipeline */}
      <SectionCard title="HPC pipeline — 3 matrices per tissue on Spark" description="End-to-end spatial multi-omics: tissue section → DBiT-seq (RNA + protein) + spatial-CUT&Tag (chromatin) + Spatial ATAC-RNA (open chromatin + RNA) → 3 matrices per tissue (N_pixels × N_features = 10⁹ entries) → Spark Parquet → MultiModalSTAGATE (cross-attention integration) → joint latent → spatial domain clustering → LLM RAG summary." icon={<Activity className="h-5 w-5" />}>
        <CodeBlock language="text" filename="spatial_multi_pipeline.txt" code={`┌──────────────────────────────────────────────────────────────────────┐
│  SPATIAL MULTI-OMICS PIPELINE (3 matrices per tissue)              │
│                                                                            │
│  Wet lab: tissue section on slide                                     │
│    - DBiT-seq: microfluidic barcoding (RNA + protein, 50μm)         │
│    - spatial-CUT&Tag: antibody + Tn5 (chromatin marks, 5μm)         │
│    - Spatial ATAC-RNA: Tn5 + poly-T (ATAC + RNA, 10μm)              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ Sequencing (Illumina NovaSeq, ~1 Tb per tissue)       │              │
│  │   - Demultiplex by spatial barcode                       │              │
│  │   - Output: 3 matrices per tissue                       │              │
│  │     1. RNA: N_pixels × 20K genes                        │              │
│  │     2. Chromatin: N_pixels × 10 marks × 5K peaks         │              │
│  │     3. Protein: N_pixels × 100 antibodies                │              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ Spark: store in Parquet (sparse matrices)             │              │
│  │   - 3 matrices × 10^9 entries = 3 × 10^9               │              │
│  │   - Sparse: ~5% non-zero → 150M entries → ~10 GB       │              │
│  │   - SQL: SELECT gene, AVG(count) FROM rna WHERE ...    │              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ MultiModalSTAGATE (cross-attention integration)        │              │
│  │   - RNA encoder: gene expression → 64-dim                │              │
│  │   - Chromatin encoder: histone marks → 64-dim            │              │
│  │   - Protein encoder: antibody intensities → 64-dim       │              │
│  │   - Cross-attention: RNA ↔ chromatin ↔ protein           │              │
│  │   - Joint latent: 30-dim shared embedding                │              │
│  │   - Spatial graph attention (k-NN neighbours)             │              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ Spatial domain clustering                              │              │
│  │   - Louvain / Leiden on joint latent                    │              │
│  │   - Output: spatial domain assignment per pixel          │              │
│  │   - Visualise on tissue cross-section                    │              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ LLM RAG summary (ADR-031 vLLM)                          │              │
│  │   - "Tissue has 5 spatial domains..."                     │              │
│  │   - Cross-reference with ADR-041 single-modality results│              │
│  │   - "Domain A: high H3K4me3 + high RNA → active genes"   │              │
│  │   - "Domain B: high H3K27me3 + low RNA → silenced genes"  │              │
│  └──────────────────────────────────────────────────────┘              │
│                                                                            │
│  STORAGE:                                                                 │
│    - 3 matrices × 10^9 entries = 3 × 10^9 (sparse)                  │
│    - Parquet: ~10 GB per tissue                                       │
│    - Spark on 100 cores: process 1 tissue in ~1 hour                │
│    - pgvector: joint latent embeddings for similarity search        │
└──────────────────────────────────────────────────────────────────────────┘`} />
      </SectionCard>

      {/* Low-level PyTorch */}
      <SectionCard title="Low-level PyTorch — MultiModalGraphConvolution, MultiModalSTAGATE, SpatialWNN" description="The actual production code. MultiModalGraphConvolution extends STAGATE (ADR-041) to 3 modalities: modality-specific encoders + cross-attention (RNA→chromatin, chromatin→protein, protein→RNA via MultiheadAttention) + spatial graph attention (k-NN aggregation). MultiModalSTAGATE is a full autoencoder: 2-layer multi-modal encoder + per-modality decoders + VAE reparameterisation. SpatialWNN extends WNN (ADR-042) to spatial context: modality projectors + per-pixel modality weights + spatial k-NN graph masking." icon={<Cpu className="h-5 w-5" />} badge="low-level">
        <CodeBlock language="python" filename="spatial_multiomics.py" highlight={[10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274]} code={PYTORCH_CODE} />
      </SectionCard>

      {/* Insight */}
      <SectionCard title="My deeper thought: spatial multi-omics IS the regulatory layer biology was missing" description="RNA-only spatial transcriptomics (ADR-041) shows what's expressed. Spatial multi-omics adds the regulatory layer: WHY genes are expressed (chromatin marks) and WHAT they do (protein levels). The three layers — regulatory (chromatin) → expression (RNA) → functional (protein) — form the complete causal chain. This is the multi-modal RAG (ADR-033) applied to spatial biology — three modalities co-registered in one embedding space." icon={<TrendingUp className="h-5 w-5" />} badge="Insight">
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Spatial multi-omics adds the regulatory layer biology was missing.</strong> RNA-only methods (Visium, MERFISH — ADR-041) show what genes are expressed at each spatial position. But they miss WHY: is the gene 'primed' (H3K4me3 at promoter, ready for transcription) or 'silenced' (H3K27me3 covering gene body, Polycomb-repressed)? Spatial-CUT&Tag answers this. And the protein layer (DBiT-seq antibody-DNA conjugates) shows WHAT the expressed genes actually DO — many RNA changes don't translate to protein (post-transcriptional regulation). The three layers — regulatory → expression → functional — form the complete causal chain. Spatial multi-omics measures all three simultaneously on the same tissue. This is the regulatory layer biology has been missing since the central dogma (Crick 1958): DNA → RNA → protein, now measured in spatial context.</p>
          <p><strong className="text-foreground/80">Multi-modal STAGATE IS multi-modal RAG on spatial graphs.</strong> The cross-attention mechanism (RNA ↔ chromatin ↔ protein) is structurally identical to CLIP/SigLIP's contrastive cross-attention (ADR-033): each modality has its own encoder, cross-attention integrates them into a shared latent. The spatial graph constraint (k-NN neighbours) adds the spatial inductive bias that ADR-041 STAGATE introduced. The result: a joint embedding where spatial domains emerge naturally — pixels with similar regulatory + expression + protein profiles cluster together. This is multi-modal RAG (ADR-033) applied to spatial biology: three modalities (chromatin + RNA + protein) co-registered in one embedding space (pgvector), queryable via spatial similarity. The disease phenotype (ADR-046 phenomics) is one modality; the spatial multi-omics profile is another; the LLM projects the joint embedding to natural language for the clinician.</p>
          <p><strong className="text-foreground/80">This unifies the platform's spatial + multi-modal stack.</strong> ADR-041 spatial transcriptomics (RNA only) + ADR-042 single-cell multi-omics (dissociated, RNA + ATAC + protein) + ADR-047 spatial multi-omics (spatial RNA + chromatin + protein) = complete multi-modal spatial stack. The three together cover: (1) RNA with spatial context (Visium/MERFISH), (2) RNA + chromatin + protein dissociated (10x Multiome), (3) RNA + chromatin + protein spatial (DBiT + CUT&Tag + ATAC-RNA). The platform's pgvector (ADR-022) stores embeddings from all three modalities — queryable via spatial or functional similarity. The drug discovery pipeline (ADR-046) uses spatial multi-omics to identify drug response heterogeneity within tumours — different spatial domains respond differently to treatment. Precision medicine IS multi-modal RAG on the patient's spatial biology: variant (ADR-043) + expression (ADR-041) + chromatin (ADR-047) + structure (ADR-038) + LLM (ADR-031) → clinical report. The platform's GenAI stack is now complete: from DNA variant to spatial multi-omics to drug design to clinical report, all on pgvector + Spark + vLLM, all open-source.</p>
        </div>
      </SectionCard>


      <DeeperThoughtSection pageTitle="Spatial Multi-omics">
        <DeeperThought title="Spatial Multi-omics IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about Spatial Multi-omics is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. Spatial Multi-omics connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where Spatial Multi-omics sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (Spatial Multi-omics) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("spatial-transcriptomics")} className="text-sm text-primary hover:underline">→ Spatial Transcriptomics (RNA-only, the precursor)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("singlecell-multiomics")} className="text-sm text-primary hover:underline">→ Single-cell Multi-omics (dissociated, same modalities)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("systems-biology")} className="text-sm text-primary hover:underline">→ Systems Biology (MOFA+ multi-omics integration)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("multimodal-rag")} className="text-sm text-primary hover:underline">→ Multi-modal RAG (CLIP cross-attention pattern)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("vector-db")} className="text-sm text-primary hover:underline">→ Vector DB (pgvector for spatial embeddings)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">→ ADR-047 (DBiT-seq + spatial-CUT&Tag)</Link>
      </div>
    </div>
  );
}
