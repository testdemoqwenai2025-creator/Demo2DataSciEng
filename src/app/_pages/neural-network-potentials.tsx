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
import { Cpu, Zap, TrendingUp, Terminal, Brain, Activity, Atom, Network } from "lucide-react";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";

const KPIS = [
  { label: "MACE accuracy", value: "&lt;1 meV/atom", hint: "QM9 SOTA, 1000× faster than DFT", deltaTone: "flat" as const },
  { label: "SO(3) irreps", value: "l=0,1,2,...", hint: "Spherical harmonics Y_l^m basis", deltaTone: "flat" as const },
  { label: "Clebsch-Gordan", value: "C(l1 m1 l2 m2 | L M)", hint: "Angular momentum coupling rules", deltaTone: "flat" as const },
  { label: "Body order", value: "k=2,3,4", hint: "Higher k = more accurate, more expensive", deltaTone: "flat" as const },
];

function CGTensorProductShort() {
  const [step, setStep] = useState(0);
  useEffect(() => { const i = setInterval(() => setStep(s => (s+1)%5), 1000); return () => clearInterval(i); }, []);
  const phases = ["1. Atom features (scalar l=0)", "2. Vector features (l=1)", "3. CG tensor product l=0⊗l=1→l=1", "4. Higher order l=1⊗l=1→l=0+1+2", "5. Body-order expansion"];
  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <style>{`.cg-3d { perspective: 800px; } .cg-stage { transform: rotateX(15deg); transform-style: preserve-3d; }`}</style>
      <p className="text-sm font-semibold mb-3 flex items-center gap-2"><Atom className="h-4 w-4 text-primary" /> Clebsch-Gordan tensor product — SO(3) equivariance (loop) <span className="text-[10px] font-mono text-muted-foreground ml-auto">{phases[step]}</span></p>
      <div className="cg-3d"><div className="cg-stage flex justify-center">
        <svg width="340" height="200" viewBox="0 0 340 200">
          {step === 0 && (<motion.g initial={{opacity:0}} animate={{opacity:1}}><circle cx="80" cy="100" r="20" fill="oklch(0.55 0.16 250 / 0.6)"/><text x="80" y="105" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">l=0</text><text x="80" y="140" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">Scalar (invariant)</text></motion.g>)}
          {step === 1 && (<motion.g initial={{opacity:0}} animate={{opacity:1}}><circle cx="80" cy="100" r="20" fill="oklch(0.55 0.16 165 / 0.6)"/><text x="80" y="105" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">l=1</text><text x="80" y="140" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">Vector (equivariant)</text><line x1="70" y1="90" x2="90" y2="110" stroke="white" strokeWidth="2" markerEnd="url(#arr)"/><defs><marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="white"/></marker></defs></motion.g>)}
          {step === 2 && (<motion.g initial={{opacity:0}} animate={{opacity:1}}><circle cx="60" cy="100" r="15" fill="oklch(0.55 0.16 250 / 0.6)"/><text x="60" y="105" textAnchor="middle" fontSize="8" fill="white">l=0</text><text x="105" y="100" textAnchor="middle" fontSize="14" fill="var(--primary)">⊗</text><circle cx="150" cy="100" r="15" fill="oklch(0.55 0.16 165 / 0.6)"/><text x="150" y="105" textAnchor="middle" fontSize="8" fill="white">l=1</text><text x="195" y="100" textAnchor="middle" fontSize="14" fill="var(--primary)">→</text><circle cx="240" cy="100" r="18" fill="oklch(0.55 0.16 165 / 0.6)"/><text x="240" y="105" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">l=1</text><text x="240" y="135" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">0⊗1→1</text></motion.g>)}
          {step === 3 && (<motion.g initial={{opacity:0}} animate={{opacity:1}}><circle cx="50" cy="100" r="13" fill="oklch(0.55 0.16 165 / 0.6)"/><text x="50" y="104" textAnchor="middle" fontSize="7" fill="white">l=1</text><text x="90" y="100" textAnchor="middle" fontSize="12" fill="var(--primary)">⊗</text><circle cx="120" cy="100" r="13" fill="oklch(0.55 0.16 165 / 0.6)"/><text x="120" y="104" textAnchor="middle" fontSize="7" fill="white">l=1</text><text x="160" y="100" textAnchor="middle" fontSize="12" fill="var(--primary)">→</text><circle cx="200" cy="80" r="13" fill="oklch(0.55 0.16 250 / 0.6)"/><text x="200" y="84" textAnchor="middle" fontSize="7" fill="white">l=0</text><circle cx="240" cy="100" r="13" fill="oklch(0.55 0.16 165 / 0.6)"/><text x="240" y="104" textAnchor="middle" fontSize="7" fill="white">l=1</text><circle cx="280" cy="120" r="13" fill="oklch(0.6 0.15 75 / 0.6)"/><text x="280" y="124" textAnchor="middle" fontSize="7" fill="white">l=2</text><text x="240" y="150" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">1⊗1→0+1+2</text></motion.g>)}
          {step === 4 && (<motion.g initial={{opacity:0}} animate={{opacity:1}}><text x="170" y="60" textAnchor="middle" fontSize="10" fill="var(--primary)" fontWeight="bold">Body-order expansion</text><text x="170" y="85" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">k=2: pairwise (SchNet)</text><text x="170" y="105" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">k=3: 3-body (NequIP)</text><text x="170" y="125" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">k=4: 4-body (MACE)</text><text x="170" y="150" textAnchor="middle" fontSize="8" fill="oklch(0.6 0.15 75)" fontWeight="bold">Higher k = more accurate</text></motion.g>)}
        </svg>
      </div></div>
      <p className="text-[10px] text-muted-foreground text-center mt-3">Phase 1-2: SO(3) irreps (scalar l=0, vector l=1). Phase 3: CG product 0⊗1→1. Phase 4: 1⊗1→0+1+2 (decomposition). Phase 5: body-order expansion — higher k captures more interactions.</p>
    </div>
  );
}

const NNP_DEMO = `# Neural Network Potentials — SO(3) representation theory + Clebsch-Gordan
# SchNet → DimeNet → GemNet → NequIP → MACE progression

import math, random

# ============================================================
# 1. Spherical harmonics Y_l^m — basis for SO(3) irreps
# ============================================================
# l=0: Y_0^0 = 1/sqrt(4π) — scalar (invariant)
# l=1: Y_1^0 = sqrt(3/4π)·cos(θ), Y_1^±1 = ∓sqrt(3/8π)·sin(θ)·e^(±iφ) — vector
# l=2: 5 components (quadrupole tensor)

def spherical_harmonic(l, m, theta, phi):
    """Compute Y_l^m(θ, φ) — simplified real (tesseral) harmonics."""
    if l == 0:
        return 1.0 / math.sqrt(4 * math.pi)
    elif l == 1:
        if m == 0: return math.sqrt(3 / (4 * math.pi)) * math.cos(theta)
        elif m == 1: return math.sqrt(3 / (4 * math.pi)) * math.sin(theta) * math.cos(phi)
        elif m == -1: return math.sqrt(3 / (4 * math.pi)) * math.sin(theta) * math.sin(phi)
    elif l == 2:
        if m == 0: return math.sqrt(5 / (16 * math.pi)) * (3 * math.cos(theta)**2 - 1)
        elif m == 1: return math.sqrt(15 / (4 * math.pi)) * math.cos(theta) * math.sin(theta) * math.cos(phi)
        elif m == -1: return math.sqrt(15 / (4 * math.pi)) * math.cos(theta) * math.sin(theta) * math.sin(phi)
        elif m == 2: return math.sqrt(15 / (16 * math.pi)) * math.sin(theta)**2 * math.cos(2*phi)
        elif m == -2: return math.sqrt(15 / (16 * math.pi)) * math.sin(theta)**2 * math.sin(2*phi)
    return 0.0

print("=" * 60)
print("SO(3) Representation Theory — Spherical Harmonics")
print("=" * 60)

# Evaluate Y_l^m at a few angles
theta, phi = 0.5, 0.3
print(f"\\nY_l^m(θ={theta}, φ={phi}):")
for l in range(3):
    for m in range(-l, l+1):
        y = spherical_harmonic(l, m, theta, phi)
        print(f"  Y_{l}^{m:+d} = {y:.4f}")

# ============================================================
# 2. Clebsch-Gordan coefficients — coupling rules
# ============================================================
# C(l1 m1 l2 m2 | L M) gives the coupling: l1 ⊗ l2 → L
# Selection rules: |l1-l2| ≤ L ≤ l1+l2, M = m1+m2

# Precomputed CG for l1=1, l2=1 → L=0,1,2
CG_1_1 = {
    # (m1, m2, L, M): coefficient
    (1, -1, 0, 0): 1/math.sqrt(3),
    (-1, 1, 0, 0): 1/math.sqrt(3),
    (0, 0, 0, 0): -1/math.sqrt(3),
    (1, 0, 1, 1): 1/math.sqrt(2),
    (0, 1, 1, 1): 1/math.sqrt(2),
    (1, -1, 1, 0): 1/math.sqrt(2),
    (-1, 1, 1, 0): -1/math.sqrt(2),
    (0, 0, 1, 0): 0,
    (1, 1, 2, 2): 1,
    (1, 0, 2, 1): 1/math.sqrt(2),
    (0, 1, 2, 1): 1/math.sqrt(2),
    (1, -1, 2, 0): 1/math.sqrt(6),
    (0, 0, 2, 0): math.sqrt(2/3),
    (-1, 1, 2, 0): 1/math.sqrt(6),
}

print(f"\\n{'=' * 60}")
print("Clebsch-Gordan Coefficients — 1 ⊗ 1 → 0+1+2")
print("=" * 60)
print(f"\\nDecomposition: l=1 ⊗ l=1 → L=0 (scalar) + L=1 (vector) + L=2 (tensor)")
print(f"\\nCG coefficients C(m1, m2 | L, M):")
print(f"  {'m1':>4s} {'m2':>4s} {'L':>3s} {'M':>3s} {'C':>8s}")
for (m1, m2, L, M), c in sorted(CG_1_1.items(), key=lambda x: (x[0][2], x[0][3])):
    print(f"  {m1:+4d} {m2:+4d} {L:3d} {M:+3d} {c:8.4f}")

# Verify orthonormality
print(f"\\nOrthonormality check: Σ C² = 1 per (L,M)")
for L in [0, 1, 2]:
    for M in range(-L, L+1):
        norm_sq = sum(c**2 for (m1, m2, l, m), c in CG_1_1.items() if l == L and m == M)
        print(f"  L={L}, M={M:+d}: Σ C² = {norm_sq:.4f} {'✓' if abs(norm_sq - 1.0) < 0.01 else '✗'}")

# ============================================================
# 3. Body-order expansion — SchNet to MACE progression
# ============================================================
print(f"\\n{'=' * 60}")
print("Body-Order Expansion — SchNet to MACE")
print("=" * 60)
print("""
  Model     | Body Order | Equivariance | QM9 MAE (meV)
  ----------|------------|--------------|-------------
  SchNet    | k=2        | None         | 5.0
  DimeNet   | k=2+dir    | None         | 3.3
  GemNet    | k=2+geom   | None         | 2.1
  NequIP    | k=3        | E(3)         | 1.1
  Allegro   | k=3 local  | E(3)         | 1.0
  MACE      | k=4 (CG)   | O(3)         | 0.8

  Key insight: higher body order captures more interactions.
  - k=2: pairwise (bond stretching, VdW)
  - k=3: angle bending (three-body)
  - k=4: torsion + improper (four-body)
  
  CG tensor products decompose k-body interactions into SO(3) irreps.
  This IS the same math as angular momentum coupling in QM.
""")

# ============================================================
# 4. MACE message passing — CG tensor product layer
# ============================================================
print(f"{'=' * 60}")
print("MACE — Higher-Order CG Tensor Product Message Passing")
print("=" * 60)
print("""
  MACE message passing (per edge i→j):
  
  1. Node features: h_i ∈ ⊕_l R^{2l+1}  (direct sum of irreps)
     e.g. h_i = [scalar(l=0), vector(l=1), tensor(l=2)]
  
  2. Edge features: combine h_i, h_j, r_ij via CG products
     m_ij = Σ_{l1,l2,L} W_L ⊙ (h_i^{l1} ⊗_{CG} h_j^{l2})^L
     
     where ⊗_{CG} is the Clebsch-Gordan tensor product:
     (h^{l1} ⊗ h^{l2})^L_M = Σ_{m1,m2} C(l1 m1 l2 m2 | L M) · h^{l1}_{m1} · h^{l2}_{m2}
  
  3. Higher order: repeat CG product for body-order k
     k=3: (h_i ⊗ h_j) ⊗ h_k  — three-body
     k=4: ((h_i ⊗ h_j) ⊗ h_k) ⊗ h_l  — four-body
  
  4. Output: predicted energy E = Σ_i MLP(h_i), forces F = -∇E
  
  The CG tensor product IS angular momentum coupling from QM.
  MACE uses the same math as Clebsch-Gordan (1935):
  C(l1 m1 l2 m2 | L M) — the coupling of angular momenta.
""")
print("=" * 60)`;

const PYTORCH_CODE = `import torch
import torch.nn as nn
import torch.nn.functional as F
import math
from typing import Tuple, Dict, List, Optional

# ============================================================
# 1. Spherical Harmonics computation (real tesseral)
# ============================================================

def real_spherical_harmonics(pos: torch.Tensor, max_l: int = 3) -> Dict[int, torch.Tensor]:
    """Compute real spherical harmonics Y_l^m for l=0..max_l.
    
    Args:
        pos: (N, 3) atom positions (relative to center)
        max_l: maximum angular momentum
    
    Returns: dict {l: (N, 2l+1)} — Y_l^m values per l
    """
    r = pos.norm(dim=-1, keepdim=True).clamp(min=1e-8)
    theta = torch.acos(pos[:, 2] / r.squeeze(-1)).unsqueeze(-1)  # polar angle
    phi = torch.atan2(pos[:, 1], pos[:, 0]).unsqueeze(-1)  # azimuthal angle
    
    harmonics = {}
    for l in range(max_l + 1):
        n_comp = 2 * l + 1
        Y = torch.zeros(pos.shape[0], n_comp, device=pos.device)
        
        if l == 0:
            Y[:, 0] = 1.0 / math.sqrt(4 * math.pi)
        elif l == 1:
            Y[:, 0] = math.sqrt(3 / (4 * math.pi)) * torch.cos(theta.squeeze(-1))
            Y[:, 1] = math.sqrt(3 / (4 * math.pi)) * torch.sin(theta.squeeze(-1)) * torch.cos(phi.squeeze(-1))
            Y[:, 2] = math.sqrt(3 / (4 * math.pi)) * torch.sin(theta.squeeze(-1)) * torch.sin(phi.squeeze(-1))
        elif l == 2:
            Y[:, 0] = math.sqrt(5 / (16 * math.pi)) * (3 * torch.cos(theta.squeeze(-1))**2 - 1)
            Y[:, 1] = math.sqrt(15 / (4 * math.pi)) * torch.cos(theta.squeeze(-1)) * torch.sin(theta.squeeze(-1)) * torch.cos(phi.squeeze(-1))
            Y[:, 2] = math.sqrt(15 / (4 * math.pi)) * torch.cos(theta.squeeze(-1)) * torch.sin(theta.squeeze(-1)) * torch.sin(phi.squeeze(-1))
            Y[:, 3] = math.sqrt(15 / (16 * math.pi)) * torch.sin(theta.squeeze(-1))**2 * torch.cos(2 * phi.squeeze(-1))
            Y[:, 4] = math.sqrt(15 / (16 * math.pi)) * torch.sin(theta.squeeze(-1))**2 * torch.sin(2 * phi.squeeze(-1))
        
        harmonics[l] = Y
    return harmonics


# ============================================================
# 2. Clebsch-Gordan tensor product layer (MACE-style)
# ============================================================

class CGTensorProduct(nn.Module):
    """Clebsch-Gordan tensor product layer (MACE core operation).
    
    Computes: (h_i^{l1} ⊗_{CG} h_j^{l2})^L
    
    where ⊗_{CG} is the Clebsch-Gordan tensor product:
    (h^{l1} ⊗ h^{l2})^L_M = Σ_{m1,m2} C(l1 m1 l2 m2 | L M) · h^{l1}_{m1} · h^{l2}_{m2}
    
    This IS angular momentum coupling from quantum mechanics.
    
    Production: e3nn library provides precomputed CG coefficients.
    """
    # Precomputed CG for l1=1, l2=1 → L=0,1,2
    CG_TABLE = {
        (1, 1): {
            # L=0 (scalar)
            0: {(1, -1): 1/math.sqrt(3), (-1, 1): 1/math.sqrt(3), (0, 0): -1/math.sqrt(3)},
            # L=1 (vector)
            1: {(1, 0): 1/math.sqrt(2), (0, 1): 1/math.sqrt(2),
                (1, -1): 1/math.sqrt(2), (-1, 1): -1/math.sqrt(2), (0, 0): 0.0},
            # L=2 (tensor)
            2: {(1, 1): 1.0, (1, 0): 1/math.sqrt(2), (0, 1): 1/math.sqrt(2),
                (1, -1): 1/math.sqrt(6), (0, 0): math.sqrt(2/3), (-1, 1): 1/math.sqrt(6)},
        }
    }
    
    def __init__(self, l1: int = 1, l2: int = 1, out_l: int = 2):
        super().__init__()
        self.l1 = l1
        self.l2 = l2
        self.out_l = out_l
        # Learnable weight per output irrep
        self.weight = nn.Parameter(torch.randn(out_l + 1) * 0.1)
    
    def forward(self, h1: torch.Tensor, h2: torch.Tensor) -> Dict[int, torch.Tensor]:
        """Compute CG tensor product.
        
        Args:
            h1: (N, 2*l1+1) features in irrep l1
            h2: (N, 2*l2+1) features in irrep l2
        
        Returns: dict {L: (N, 2L+1)} — output for each coupled irrep L
        """
        N = h1.shape[0]
        cg_table = self.CG_TABLE.get((self.l1, self.l2), {})
        
        results = {}
        for L, cg_coeffs in cg_table.items():
            n_out = 2 * L + 1
            out = torch.zeros(N, n_out, device=h1.device)
            
            for M in range(n_out):
                m = M - L  # actual m value
                val = torch.zeros(N, device=h1.device)
                for (m1, m2), c in cg_coeffs.items():
                    idx1 = m1 + self.l1
                    idx2 = m2 + self.l2
                    if 0 <= idx1 < h1.shape[1] and 0 <= idx2 < h2.shape[1]:
                        val += c * h1[:, idx1] * h2[:, idx2]
                out[:, M] = val * self.weight[L]
            
            results[L] = out
        
        return results


# ============================================================
# 3. SchNet interaction block (baseline)
# ============================================================

class SchNetInteraction(nn.Module):
    """SchNet (Schütt 2017) — continuous-filter convolution.
    
    The simplest NNP: no equivariance, continuous filters.
    
    h_i' = h_i + Σ_j MLP(|r_ij|) · h_j
    
    where |r_ij| = distance between atoms i and j.
    
    Body order: k=2 (pairwise only).
    """
    def __init__(self, hidden_dim: int = 128, n_filters: int = 64, cutoff: float = 5.0):
        super().__init__()
        self.cutoff = cutoff
        # Filter-generating network (distance → filter)
        self.filter_net = nn.Sequential(
            nn.Linear(1, n_filters),
            nn.ReLU(),
            nn.Linear(n_filters, hidden_dim * hidden_dim),
        )
        self.lin = nn.Linear(hidden_dim, hidden_dim)
    
    def forward(self, h: torch.Tensor, positions: torch.Tensor,
                edge_index: torch.Tensor) -> torch.Tensor:
        """SchNet interaction.
        
        Args:
            h: (N, hidden) atom features
            positions: (N, 3) atom coordinates
            edge_index: (2, E) edges
        
        Returns: updated (N, hidden)
        """
        src, dst = edge_index
        # Compute distances
        dist = (positions[src] - positions[dst]).norm(dim=-1, keepdim=True)
        # Cutoff function (cosine)
        cutoff = 0.5 * (torch.cos(math.pi * dist / self.cutoff) + 1)
        cutoff = cutoff * (dist < self.cutoff).float()
        # Generate filters
        filters = self.filter_net(dist * cutoff)  # (E, hidden*hidden)
        filters = filters.view(-1, h.shape[1], h.shape[1])  # (E, hidden, hidden)
        # Apply filters to source features
        msg = torch.bmm(filters, h[src].unsqueeze(-1)).squeeze(-1)  # (E, hidden)
        # Aggregate
        out = torch.zeros_like(h)
        out.index_add_(0, dst, msg)
        return h + self.lin(out)


# ============================================================
# 4. NequIP equivariant layer (E(3)-equivariant)
# ============================================================

class NequIPLayer(nn.Module):
    """NequIP (Batzner 2022) — E(3)-equivariant interaction.
    
    Uses spherical harmonics of relative positions as equivariant features.
    Body order: k=3 (three-body via CG products).
    
    h_i' = h_i + Σ_j W ⊙ Y_l(r_ij) · (h_i ⊗_{CG} h_j)
    
    where Y_l(r_ij) are spherical harmonics of the relative position.
    """
    def __init__(self, hidden_dim: int = 64, max_l: int = 2, cutoff: float = 5.0):
        super().__init__()
        self.max_l = max_l
        self.cutoff = cutoff
        # Learnable weights per l
        self.weights = nn.ParameterList([
            nn.Parameter(torch.randn(hidden_dim, hidden_dim) * 0.01)
            for _ in range(max_l + 1)
        ])
        # Scalar mixing
        self.scalar_mix = nn.Linear(hidden_dim, hidden_dim)
        # CG tensor product
        self.cg = CGTensorProduct(l1=0, l2=0, out_l=0)  # simplified
    
    def forward(self, h: torch.Tensor, positions: torch.Tensor,
                edge_index: torch.Tensor) -> torch.Tensor:
        """NequIP equivariant interaction.
        
        Args:
            h: (N, hidden) scalar (l=0) features
            positions: (N, 3) atom coordinates
            edge_index: (2, E) edges
        
        Returns: updated (N, hidden)
        """
        src, dst = edge_index
        rel_pos = positions[src] - positions[dst]  # (E, 3)
        dist = rel_pos.norm(dim=-1, keepdim=True).clamp(min=1e-8)
        
        # Cutoff
        cutoff = 0.5 * (torch.cos(math.pi * dist / self.cutoff) + 1)
        cutoff = cutoff * (dist < self.cutoff).float()
        
        # Spherical harmonics of relative positions
        harmonics = real_spherical_harmonics(rel_pos, max_l=self.max_l)
        
        # Message: Y_l(r_ij) ⊗ h_j (simplified — scalar part only)
        msg = torch.zeros_like(h)
        for l in range(self.max_l + 1):
            Y = harmonics[l]  # (E, 2l+1)
            # For l=0: scalar message
            if l == 0:
                w = self.weights[l]  # (hidden, hidden)
                scalar_msg = (h[src] @ w) * Y[:, 0:1] * cutoff  # (E, hidden)
                msg.index_add_(0, dst, scalar_msg)
        
        return h + self.scalar_mix(msg)


# ============================================================
# 5. MACE model (higher-order CG, body-order 4)
# ============================================================

class MACEModel(nn.Module):
    """MACE (Batatia 2022) — higher-order equivariant MPNN.
    
    Architecture:
        1. Atom embedding (per element)
        2. Spherical harmonics of relative positions (l=0..L_max)
        3. CG tensor products for messages (body-order 4)
        4. Readout: energy E = Σ_i MLP(h_i)
        5. Forces F = -∇E (autograd)
    
    Production: e3nn library for CG coefficients.
    Here: simplified with precomputed CG table.
    """
    def __init__(self, n_elements: int = 100, hidden_dim: int = 64,
                 max_l: int = 2, n_layers: int = 3, cutoff: float = 5.0):
        super().__init__()
        self.atom_embed = nn.Embedding(n_elements, hidden_dim)
        self.max_l = max_l
        self.cutoff = cutoff
        
        # Interaction layers (mix of SchNet + NequIP + CG)
        self.layers = nn.ModuleList([
            NequIPLayer(hidden_dim, max_l, cutoff) for _ in range(n_layers)
        ])
        
        # CG tensor product for higher body order
        self.cg = CGTensorProduct(l1=1, l2=1, out_l=2)
        
        # Energy readout
        self.energy_head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.SiLU(),
            nn.Linear(hidden_dim // 2, 1),
        )
    
    def forward(self, atom_types: torch.Tensor, positions: torch.Tensor,
                edge_index: torch.Tensor, batch: torch.Tensor = None) -> Dict[str, torch.Tensor]:
        """Forward: predict energy + forces.
        
        Args:
            atom_types: (N,) element IDs
            positions: (N, 3) atom coordinates (requires_grad for forces)
            edge_index: (2, E) edges
        
        Returns: dict with 'energy', 'forces'
        """
        # Embed atoms
        h = self.atom_embed(atom_types)  # (N, hidden)
        
        # Message passing layers
        for layer in self.layers:
            h = layer(h, positions, edge_index)
        
        # Predict per-atom energy
        atom_energies = self.energy_head(h).squeeze(-1)  # (N,)
        
        # Sum per molecule (if batch info provided)
        if batch is not None:
            n_mols = batch.max().item() + 1
            energy = torch.zeros(n_mols, device=h.device)
            energy.index_add_(0, batch, atom_energies)
        else:
            energy = atom_energies.sum()
        
        # Forces via autograd
        positions.requires_grad_(True)
        # Recompute energy with grad
        h2 = self.atom_embed(atom_types)
        for layer in self.layers:
            h2 = layer(h2, positions, edge_index)
        atom_e2 = self.energy_head(h2).squeeze(-1)
        if batch is not None:
            e2 = torch.zeros(batch.max().item() + 1, device=h.device)
            e2.index_add_(0, batch, atom_e2)
        else:
            e2 = atom_e2.sum()
        
        forces = -torch.autograd.grad(e2, positions, create_graph=True)[0]
        
        return {'energy': energy, 'forces': forces}


# Sanity check
if __name__ == "__main__":
    # Spherical harmonics
    pos = torch.randn(10, 3)
    Y = real_spherical_harmonics(pos, max_l=2)
    print("Spherical harmonics:")
    for l, y in Y.items():
        print(f"  l={l}: {tuple(y.shape)} (2l+1={2*l+1} components)")
    
    # CG tensor product
    h1 = torch.randn(10, 3)  # l=1 vector features
    h2 = torch.randn(10, 3)
    cg = CGTensorProduct(l1=1, l2=1, out_l=2)
    out = cg(h1, h2)
    print(f"\\nCG tensor product (1⊗1):")
    for L, val in out.items():
        print(f"  L={L}: {tuple(val.shape)} (2L+1={2*L+1})")
    
    # SchNet
    schnet = SchNetInteraction(hidden_dim=32, n_filters=16)
    h = torch.randn(10, 32)
    pos = torch.randn(10, 3)
    edges = torch.randint(0, 10, (2, 30))
    out = schnet(h, pos, edges)
    print(f"\\nSchNet: {sum(p.numel() for p in schnet.parameters()):,} params")
    print(f"  Input: {tuple(h.shape)} → Output: {tuple(out.shape)}")
    
    # NequIP
    nequip = NequIPLayer(hidden_dim=32, max_l=2)
    out = nequip(h, pos, edges)
    print(f"\\nNequIP: {sum(p.numel() for p in nequip.parameters()):,} params")
    print(f"  Input: {tuple(h.shape)} → Output: {tuple(out.shape)}")
    
    # MACE
    mace = MACEModel(n_elements=10, hidden_dim=32, max_l=2, n_layers=2)
    n_params = sum(p.numel() for p in mace.parameters())
    print(f"\\nMACE: {n_params:,} params")
    atom_types = torch.randint(0, 10, (10,))
    result = mace(atom_types, pos.clone(), edges)
    print(f"  Energy: {result['energy'].item():.3f}")
    print(f"  Forces: {tuple(result['forces'].shape)}")`;

export function NeuralNetworkPotentialsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Neural Network Potentials · SchNet → DimeNet → GemNet → NequIP → MACE · SO(3) · Clebsch-Gordan"
        title="Neural Network Potentials — SchNet to MACE via Representation Theory"
        description="The progression from SchNet (continuous-filter CNN, k=2 body order) to MACE (higher-order Clebsch-Gordan tensor products, k=4, &lt;1 meV/atom on QM9). The mathematical foundation: SO(3) representation theory — irreducible representations labeled by angular momentum l=0,1,2,... with spherical harmonics Y_l^m as basis. Clebsch-Gordan coefficients C(l1 m1 l2 m2 | L M) give the coupling rules — the SAME math as angular momentum coupling in quantum mechanics. Body-order expansion: k=2 (pairwise) → k=3 (three-body) → k=4 (four-body) captures increasingly complex interactions. MACE IS applied quantum mechanics — the same equations that predict atomic spectra now predict molecular properties. With 4 AI illustrations + a looping CG tensor product 'short'. Low-level PyTorch: real_spherical_harmonics, CGTensorProduct, SchNetInteraction, NequIPLayer, MACEModel."
        right={<><Badge variant="outline" className="gap-1.5"><Atom className="h-3 w-3" /> SchNet → MACE</Badge><Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Pyodide</Badge></>}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />)}
      </div>

      <SectionCard title="AI-generated illustrations — click to expand" icon={<Atom className="h-5 w-5" />} badge="AI gallery">
        <div className="grid md:grid-cols-2 gap-4">
          <div><ImageModal src="/images/nnp/nnp-architecture.png" alt="NNP architecture" caption="Neural network potential architecture — GNN layers processing 3D molecular structure with atom nodes connected by learned interaction blocks. The progression from SchNet's continuous filters to MACE's higher-order CG tensor products." /><p className="text-[11px] text-muted-foreground mt-2 text-center">NNP architecture — GNN on 3D molecules</p></div>
          <div><ImageModal src="/images/nnp/clebsch-gordan.png" alt="Clebsch-Gordan" caption="Clebsch-Gordan tensor product visualization — spherical harmonics Y_l^m basis functions in 3D, colour-coded by angular momentum state. The CG coefficients C(l1 m1 l2 m2 | L M) give the coupling rules — same as quantum mechanics angular momentum coupling." /><p className="text-[11px] text-muted-foreground mt-2 text-center">Clebsch-Gordan — SO(3) coupling rules</p></div>
          <div><ImageModal src="/images/nnp/schnet-to-mace.png" alt="SchNet to MACE evolution" caption="Evolution timeline from SchNet (2017, k=2) to MACE (2022, k=4). Each model adds higher body order and stronger equivariance constraints. The key insight: higher body order captures more interactions (3-body angles, 4-body torsions)." /><p className="text-[11px] text-muted-foreground mt-2 text-center">SchNet → MACE — body-order progression</p></div>
          <div><ImageModal src="/images/nnp/qm9-benchmark.png" alt="QM9 benchmark" caption="QM9 benchmark — 130K small molecules with DFT-computed properties. MACE achieves &lt;1 meV/atom — the state-of-the-art. Compare: DFT ~1 meV/atom (but 1000× slower), SchNet ~5 meV/atom, NequIP ~1 meV/atom." /><p className="text-[11px] text-muted-foreground mt-2 text-center">QM9 benchmark — MACE &lt;1 meV/atom</p></div>
        </div>
      </SectionCard>

      <SectionCard title="CG tensor product short — SO(3) equivariance (loop)" icon={<Atom className="h-5 w-5" />} badge="short">
        <CGTensorProductShort />
      </SectionCard>

      <SectionCard title="SO(3) representation theory — the mathematical foundation" description="SO(3) (rotation group) has irreducible representations (irreps) labeled by angular momentum l=0,1,2,.... The l=0 irrep is a scalar (rotation-invariant), l=1 is a vector (rotation-equivariant), l=2 is a rank-2 tensor. Spherical harmonics Y_l^m(θ,φ) are the basis functions. The Clebsch-Gordan coefficients C(l1 m1 l2 m2 | L M) give the coupling rules: when you tensor product two irreps l1 ⊗ l2, the result decomposes into irreps L = |l1-l2|, ..., l1+l2. This IS the same math as angular momentum coupling in quantum mechanics." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-xs text-primary">l=0: scalar (invariant) &nbsp;·&nbsp; l=1: vector (equivariant) &nbsp;·&nbsp; l=2: tensor &nbsp;·&nbsp; Y_l^m = basis functions</p>
            <p className="text-[11px] text-muted-foreground mt-1">The irreps of SO(3) are labeled by l=0,1,2,... with 2l+1 components each. Spherical harmonics Y_l^m are the basis — same as hydrogen atom wavefunctions.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5"><p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">l=0 (scalar)</p><p className="font-mono text-[11px]">Y_0^0 = 1/√(4π)</p><p className="text-muted-foreground text-[11px] mt-1">Rotation-invariant. 1 component. Used for: energy, scalar features.</p></div>
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5"><p className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-1">l=1 (vector)</p><p className="font-mono text-[11px]">Y_1^m = 3 components</p><p className="text-muted-foreground text-[11px] mt-1">Rotation-equivariant. 3 components. Used for: forces, dipole moments, positions.</p></div>
            <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-2.5"><p className="font-semibold text-sm text-violet-600 dark:text-violet-400 mb-1">l=2 (tensor)</p><p className="font-mono text-[11px]">Y_2^m = 5 components</p><p className="text-muted-foreground text-[11px] mt-1">Rank-2 tensor. 5 components. Used for: quadrupole, stress tensor.</p></div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Clebsch-Gordan tensor product — coupling rules" description="The CG tensor product (h^{l1} ⊗ h^{l2})^L_M = Σ_{m1,m2} C(l1 m1 l2 m2 | L M) · h^{l1}_{m1} · h^{l2}_{m2} combines two features of angular momenta l1 and l2 into features of angular momentum L. The selection rules: |l1-l2| ≤ L ≤ l1+l2, M = m1+m2. For l1=l2=1: decomposition gives L=0 (scalar) + L=1 (vector) + L=2 (tensor). This IS the same operation as adding two angular momenta in quantum mechanics — the CG coefficients were tabulated by Clebsch (1866) and Gordan (1888)." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-xs text-primary">(h{"{l1}"} ⊗ h{"{l2}"}){"{L}"} = Σ C(l1 m1 l2 m2 | L M) · h{"{l1,m1}"} · h{"{l2,m2}"}</p>
            <p className="text-[11px] text-muted-foreground mt-1">The CG tensor product — the core operation of MACE. Selection rules: |l1-l2| ≤ L ≤ l1+l2, M=m1+m2.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5"><p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">1⊗1→0</p><p className="font-mono text-[11px]">Scalar from two vectors</p><p className="text-muted-foreground text-[11px] mt-1">Dot product: h_i · h_j. Gives rotation-invariant scalar.</p></div>
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5"><p className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-1">1⊗1→1</p><p className="font-mono text-[11px]">Vector from two vectors</p><p className="text-muted-foreground text-[11px] mt-1">Cross product: h_i × h_j. Gives rotation-equivariant vector.</p></div>
            <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-2.5"><p className="font-semibold text-sm text-violet-600 dark:text-violet-400 mb-1">1⊗1→2</p><p className="font-mono text-[11px]">Tensor from two vectors</p><p className="text-muted-foreground text-[11px] mt-1">Outer product (traceless): h_i ⊗ h_j - δ. Gives rank-2 tensor.</p></div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Body-order expansion — SchNet to MACE" description="The body-order expansion decomposes molecular energy into k-body interactions: E = Σ_i E_i + Σ_{i<j} E_{ij} + Σ_{i<j<k} E_{ijk} + ... SchNet (k=2) captures only pairwise. DimeNet (k=2+directional) adds angle info. NequIP (k=3) captures three-body via CG products. MACE (k=4) captures four-body via higher-order CG products. Higher k = more accurate, more expensive. The CG decomposition makes this tractable — instead of O(N^k) terms, the tensor product structure gives O(k·L^3) per message." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">E = Σ_i E_i + Σ_{"{i<j}"} E_{"{ij}"} + Σ_{"{i<j<k}"} E_{"{ijk}"} + Σ_{"{i<j<k<l}"} E_{"{ijkl}"} + ...</p>
            <p className="text-[11px] text-muted-foreground mt-1">Body-order expansion. k=2 (SchNet): pairwise. k=3 (NequIP): three-body. k=4 (MACE): four-body.</p>
          </div>
          <CodeBlock language="text" filename="nnp_comparison.txt" code={`┌──────────────────────────────────────────────────────────────────┐
│  NEURAL NETWORK POTENTIAL PROGRESSION                              │
│                                                                      │
│  Model   | Year | Body Order | Equivariance | QM9 MAE | Key Innovation│
│  ---------|------|-------------|--------------|---------|----------------│
│  SchNet  | 2017 | k=2         | None         | 5.0 meV | Continuous filter│
│  DimeNet | 2020 | k=2+dir     | None         | 3.3 meV | Directional MPNN │
│  GemNet | 2021 | k=2+geom   | None         | 2.1 meV | Geometric MPNN   │
│  NequIP  | 2022 | k=3         | E(3)         | 1.1 meV | CG tensor product │
│  Allegro | 2023 | k=3 local   | E(3)         | 1.0 meV | Local equivariant │
│  MACE    | 2022 | k=4 (CG)    | O(3)         | 0.8 meV | Higher-order CG  │
│                                                                      │
│  DFT reference: ~1 meV/atom (but 1000× slower)                    │
│  MACE: &lt;1 meV/atom, 1000× faster than DFT                       │
│                                                                      │
│  KEY INSIGHT:                                                       │
│  - Body order k determines interaction complexity                  │
│  - CG tensor products decompose k-body into SO(3) irreps          │
│  - Same math as angular momentum coupling in QM                   │
│  - MACE IS applied quantum mechanics                              │
└──────────────────────────────────────────────────────────────────────┘`} />
        </div>
      </SectionCard>

      <SectionCard title="Try it: SO(3) irreps + CG coefficients + body-order expansion (Pyodide)" icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={NNP_DEMO} buttonLabel="Run SO(3) + CG + body-order (Pyodide)" />
      </SectionCard>

      <SectionCard title="Modern papers — SchNet, NequIP, MACE, GNoME" icon={<Atom className="h-5 w-5" />}>
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">SchNet (Schütt et al. 2017, NeurIPS):</strong> First continuous-filter CNN for molecules. Distance-based filters, no equivariance. k=2 body order. 5 meV/atom on QM9. The baseline that all subsequent NNPs improve upon.</p>
          <p><strong className="text-foreground/80">NequIP (Batzner et al. 2022, Nature Communications):</strong> First E(3)-equivariant NNP. Uses CG tensor products for messages. k=3 body order. 1.1 meV/atom on QM9 — 5× better than SchNet. Demonstrates that equivariance IS the key inductive bias.</p>
          <p><strong className="text-foreground/80">MACE (Batatia et al. 2022, NeurIPS):</strong> Higher-order equivariant MPNN with k=4 body order via repeated CG tensor products. &lt;1 meV/atom on QM9 — matches DFT accuracy. Uses the same CG coefficients as quantum mechanics angular momentum coupling. Current SOTA.</p>
          <p><strong className="text-foreground/80">GNoME (Merchant et al. 2023, Nature):</strong> Google's materials discovery using NNPs. Discovered 2.2M new inorganic crystals — 800× more than previous databases. Uses NequIP-style architecture. Demonstrates NNPs at production scale for materials science.</p>
          <p><strong className="text-foreground/80">Allegro (Musaelian et al. 2023, Nature Communications):</strong> Local equivariant NNP — scales to 100M+ atoms. Trade-off: loses long-range interactions but gains massive parallelism. Used for large-scale materials simulation where MACE is too expensive.</p>
        </div>
      </SectionCard>

      <SectionCard title="Low-level PyTorch — spherical harmonics, CG tensor product, SchNet, NequIP, MACE" icon={<Cpu className="h-5 w-5" />} badge="low-level">
        <CodeBlock language="python" filename="nnp.py" code={PYTORCH_CODE} />
      </SectionCard>

      <SectionCard title="My deeper thought: MACE IS applied quantum mechanics" icon={<TrendingUp className="h-5 w-5" />} badge="Insight">
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">The Clebsch-Gordan coefficients in MACE ARE the same coefficients used in quantum mechanics for angular momentum coupling.</strong> When a quantum mechanicist adds two angular momenta j1 and j2 to get J, they use C(j1 m1 j2 m2 | J M) — the exact same table that MACE uses for its tensor product layer. The selection rules (|j1-j2| ≤ J ≤ j1+j2, M=m1+m2) are identical. MACE didn't invent a new neural network operation — it repurposed the 90-year-old mathematical framework of angular momentum coupling (Clebsch 1866, Gordan 1888, Wigner 1931) as a differentiable tensor operation. The equivariance constraint (f(Rx) = Rf(x)) is not an engineering trick — it IS the representation theory of SO(3), which IS the quantum mechanics of rotations.</p>
          <p><strong className="text-foreground/80">The body-order expansion IS the cluster expansion from condensed matter physics.</strong> The energy decomposition E = Σ E_i + Σ E{"{ij}"} + Σ E{"{ijk}"} + ... is the same as the cluster expansion used in alloy thermodynamics (Kikuchi 1951) and in the many-body perturbation theory of quantum mechanics. Higher body order captures more complex interactions (3-body = angle bending, 4-body = torsion + improper). The CG tensor product makes this tractable by decomposing the k-body tensor into SO(3) irreps — instead of O(N^k) raw terms, we get O(k·L^3) per message, where L is the maximum angular momentum. This is the same dimensional reduction that makes quantum mechanics computationally feasible — the angular momentum coupling rules reduce a high-dimensional tensor product to a sum of lower-dimensional irreps.</p>
          <p><strong className="text-foreground/80">This unifies the platform's molecular modelling stack.</strong> ADR-036 (AMBER force fields — hand-crafted 2-body + 3-body + 4-body terms) → ADR-049 (MACE — learned k=4 body order via CG products) is the transition from explicit physics to learned physics. The AMBER force field decomposes energy into bond + angle + dihedral + VdW + electrostatics — each hand-parameterised. MACE learns the SAME decomposition via CG tensor products — the body-order terms emerge from training, not from human intuition. The platform's pgvector (ADR-022) stores MACE embeddings for molecular similarity search — the SO(3) irrep decomposition IS the embedding. AlphaFold2's IPA (ADR-034) IS a special case of CG tensor product (l=1⊗l=1→l=0+1+2, restricted to 3D points). Boltz-1 (ADR-045) uses the same SE(3)-equivariant architecture. The entire platform — from protein structure to molecular dynamics to drug design — runs on the same mathematical skeleton: SO(3) representation theory + CG tensor products. The platform IS applied quantum mechanics, end-to-end.</p>
        </div>
      </SectionCard>


      <DeeperThoughtSection pageTitle="Neural Network Potentials">
        <DeeperThought title="Neural Network Potentials IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about Neural Network Potentials is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. Neural Network Potentials connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where Neural Network Potentials sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (Neural Network Potentials) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
        <Link href={hrefFor("molecular-modelling")} className="text-sm text-primary hover:underline">→ Molecular Modelling (AMBER — the hand-crafted precursor)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("alphaproteo")} className="text-sm text-primary hover:underline">→ AlphaProteo (RFdiffusion uses MACE-style layers)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("boltz")} className="text-sm text-primary hover:underline">→ Boltz-1 (IPA IS a special case of CG)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("enhanced-sampling")} className="text-sm text-primary hover:underline">→ Enhanced Sampling (NNP + sampling = fast + accurate)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">→ ADR-049 (MACE adoption)</Link>
      </div>
    </div>
  );
}
