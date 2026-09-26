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
  Activity, Boxes, Atom, FlaskConical,
} from "lucide-react";

const KPIS = [
  { label: "Protein structure", value: "4 levels", hint: "1° seq → 2° α/β → 3° fold → 4° complex", deltaTone: "flat" as const },
  { label: "Ramachandran", value: "φ/ψ angles", hint: "Allowed/disallowed backbone dihedrals", deltaTone: "flat" as const },
  { label: "Michaelis-Menten", value: "V = Vmax·[S]/(Km+[S])", hint: "Saturation enzyme kinetics", deltaTone: "flat" as const },
  { label: "AlphaFold DB", value: "200M structures", hint: "Varadi 2022 — covers ~99% of UniProt", deltaTone: "flat" as const },
];

// ============================================================
// Ramachandran Plot — animated "short" showing φ/ψ angles
// ============================================================
function RamachandranShort() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setStep((s) => (s + 1) % 5), 1200);
    return () => clearInterval(interval);
  }, []);

  // Sample phi/psi pairs (real proteins cluster in specific regions)
  const helixPoints = Array.from({length: 30}, (_, i) => ({
    phi: -60 + Math.sin(i * 0.7) * 12,
    psi: -45 + Math.cos(i * 0.5) * 10,
  }));
  const sheetPoints = Array.from({length: 20}, (_, i) => ({
    phi: -120 + Math.sin(i * 0.9) * 15,
    psi: 130 + Math.cos(i * 0.4) * 15,
  }));
  const pp2Points = Array.from({length: 15}, (_, i) => ({
    phi: -75 + Math.sin(i * 0.6) * 8,
    psi: 145 + Math.cos(i * 0.8) * 10,
  }));

  // Disallowed regions (right side of plot — D-amino acid territory)
  const disallowedPoints = [
    {phi: 60, psi: 40}, {phi: 80, psi: 60}, {phi: 100, psi: 30},
    {phi: 120, psi: 50}, {phi: 40, psi: 80}, {phi: 60, psi: 100},
  ];

  const phases = [
    "1. Plot points (φ/ψ angles)",
    "2. Highlight α-helix cluster",
    "3. Highlight β-sheet cluster",
    "4. Highlight polyproline II",
    "5. Disallowed = steric clash",
  ];

  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <style>{`
        .rama-3d { perspective: 800px; }
        .rama-stage { transform: rotateX(12deg); transform-style: preserve-3d; }
      `}</style>
      <p className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Boxes className="h-4 w-4 text-primary" />
        Ramachandran plot — backbone dihedral angles (loop)
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">
          {phases[step]}
        </span>
      </p>
      <div className="rama-3d">
        <div className="rama-stage flex justify-center">
          <svg width="320" height="280" viewBox="-180 -160 360 320">
            {/* Axes */}
            <line x1="-180" y1="0" x2="180" y2="0" stroke="var(--border)" strokeWidth="1" />
            <line x1="0" y1="-160" x2="0" y2="160" stroke="var(--border)" strokeWidth="1" />

            {/* Tick labels */}
            <text x="-180" y="-145" fontSize="8" fill="var(--muted-foreground)">+180°</text>
            <text x="160" y="-145" fontSize="8" fill="var(--muted-foreground)">φ</text>
            <text x="5" y="-150" fontSize="8" fill="var(--muted-foreground)">+180°</text>
            <text x="5" y="155" fontSize="8" fill="var(--muted-foreground)">ψ</text>

            {/* Allowed regions (shaded) */}
            <motion.ellipse
              cx="-60" cy="-45" rx="35" ry="25"
              fill="oklch(0.55 0.16 250 / 0.15)" stroke="var(--chart-2)" strokeWidth="1"
              strokeDasharray="2 2"
              animate={{ opacity: step >= 1 ? 1 : 0.3 }}
            />
            <motion.ellipse
              cx="-120" cy="130" rx="35" ry="30"
              fill="oklch(0.55 0.16 165 / 0.15)" stroke="var(--chart-3)" strokeWidth="1"
              strokeDasharray="2 2"
              animate={{ opacity: step >= 2 ? 1 : 0.3 }}
            />
            <motion.ellipse
              cx="-75" cy="145" rx="25" ry="20"
              fill="oklch(0.55 0.15 75 / 0.15)" stroke="var(--chart-4)" strokeWidth="1"
              strokeDasharray="2 2"
              animate={{ opacity: step >= 3 ? 1 : 0.3 }}
            />

            {/* Disallowed region (right side) */}
            <motion.rect
              x="20" y="-100" width="140" height="100"
              fill="oklch(0.6 0.20 25 / 0.1)" stroke="var(--chart-5)" strokeWidth="1"
              strokeDasharray="3 3"
              animate={{ opacity: step === 4 ? 1 : 0.2 }}
            />
            <text x="90" y="-60" fontSize="9" fill="var(--chart-5)" fontWeight="bold" textAnchor="middle">Disallowed</text>

            {/* Plot points */}
            {/* α-helix cluster (blue, around -60, -45) */}
            {helixPoints.map((p, i) => (
              <motion.circle
                key={`helix-${i}`}
                cx={p.phi} cy={p.psi} r="2.5"
                fill="oklch(0.55 0.16 250 / 0.8)"
                initial={{ scale: 0 }}
                animate={{
                  scale: step === 1 ? 1.3 : 1,
                  opacity: step === 1 ? 1 : 0.5,
                }}
                transition={{ delay: i * 0.02 }}
              />
            ))}

            {/* β-sheet cluster (green, around -120, 130) */}
            {sheetPoints.map((p, i) => (
              <motion.circle
                key={`sheet-${i}`}
                cx={p.phi} cy={p.psi} r="2.5"
                fill="oklch(0.55 0.16 165 / 0.8)"
                initial={{ scale: 0 }}
                animate={{
                  scale: step === 2 ? 1.3 : 1,
                  opacity: step === 2 ? 1 : 0.5,
                }}
                transition={{ delay: i * 0.02 }}
              />
            ))}

            {/* Polyproline II (amber, around -75, 145) */}
            {pp2Points.map((p, i) => (
              <motion.circle
                key={`pp2-${i}`}
                cx={p.phi} cy={p.psi} r="2.5"
                fill="oklch(0.6 0.15 75 / 0.8)"
                initial={{ scale: 0 }}
                animate={{
                  scale: step === 3 ? 1.3 : 1,
                  opacity: step === 3 ? 1 : 0.5,
                }}
                transition={{ delay: i * 0.02 }}
              />
            ))}

            {/* Disallowed points (red) */}
            {disallowedPoints.map((p, i) => (
              <motion.circle
                key={`dis-${i}`}
                cx={p.phi} cy={p.psi} r="3"
                fill="oklch(0.6 0.20 25 / 0.8)"
                initial={{ scale: 0 }}
                animate={{
                  scale: step === 4 ? 1.4 : 1,
                  opacity: step === 4 ? 1 : 0.3,
                }}
                transition={{ delay: i * 0.05 }}
              />
            ))}

            {/* Region labels */}
            {step >= 1 && (
              <text x="-60" y="-15" fontSize="9" fill="var(--chart-2)" fontWeight="bold" textAnchor="middle">α-helix</text>
            )}
            {step >= 2 && (
              <text x="-120" y="110" fontSize="9" fill="var(--chart-3)" fontWeight="bold" textAnchor="middle">β-sheet</text>
            )}
            {step >= 3 && (
              <text x="-75" y="125" fontSize="9" fill="var(--chart-4)" fontWeight="bold" textAnchor="middle">PPII</text>
            )}
          </svg>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3 text-[10px]">
        <div className="rounded-md border border-border/60 p-2">
          <p className="font-semibold mb-0.5">Allowed regions</p>
          <p className="text-muted-foreground">α-helix (-60, -45), β-sheet (-120, 130), PPII (-75, 145)</p>
        </div>
        <div className="rounded-md border border-border/60 p-2">
          <p className="font-semibold mb-0.5">Disallowed regions</p>
          <p className="text-muted-foreground">Steric clash — backbone atoms overlap</p>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-3">
        φ (phi) = C(i-1)–N(i)–Cα(i)–C(i), ψ (psi) = N(i)–Cα(i)–C(i)–N(i+1).
        Ramachandran 1963. Validate AlphaFold predictions: ~99% of residues in allowed regions.
      </p>
    </div>
  );
}

const KINETICS_DEMO = `# Enzyme kinetics — Michaelis-Menten + Hill equation (Pyodide)
# Saturation kinetics of enzyme-catalysed reactions

import math, random

# ============================================================
# Michaelis-Menten — saturation kinetics
# ============================================================
# V = Vmax · [S] / (Km + [S])
#
# - Vmax = maximum rate (enzyme saturated)
# - Km = [S] at half-max rate (affinity: low Km = high affinity)
# - Lineweaver-Burk (double reciprocal): 1/V = (Km/Vmax)·(1/[S]) + 1/Vmax
#   (linear in 1/[S] — easy to fit pre-computers; now nonlinear fit preferred)

def michaelis_menten(s, vmax, km):
    return vmax * s / (km + s)

def lineweaver_burk(s_list, v_list):
    """Linear fit on 1/[S] vs 1/V to estimate Vmax, Km.
    
    1/V = (Km/Vmax) · (1/[S]) + 1/Vmax
    
    Slope = Km/Vmax, intercept = 1/Vmax.
    """
    n = len(s_list)
    x = [1/s for s in s_list]
    y = [1/v for v in v_list]
    x_mean = sum(x) / n
    y_mean = sum(y) / n
    num = sum((xi - x_mean) * (yi - y_mean) for xi, yi in zip(x, y))
    den = sum((xi - x_mean) ** 2 for xi in x)
    slope = num / den if den != 0 else 0
    intercept = y_mean - slope * x_mean
    vmax_est = 1 / intercept if intercept != 0 else 0
    km_est = slope * vmax_est
    return vmax_est, km_est

# ============================================================
# Hill equation — allosteric cooperativity
# ============================================================
# V = Vmax · [S]^n / (Kd^n + [S]^n)
# 
# - n > 1: positive cooperativity (e.g. hemoglobin O2 binding, n ~ 2.8)
# - n = 1: Michaelis-Menten (no cooperativity)
# - n < 1: negative cooperativity

def hill_equation(s, vmax, kd, n):
    return vmax * (s ** n) / (kd ** n + s ** n)

# ============================================================
# Demo: enzyme kinetics fit
# ============================================================
print("=" * 60)
print("Michaelis-Menten Enzyme Kinetics")
print("=" * 60)

# Synthetic data: hexokinase (true Vmax=100, Km=0.5 mM)
random.seed(42)
substrate_concs = [0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0]
true_vmax = 100
true_km = 0.5
velocities = [michaelis_menten(s, true_vmax, true_km) + random.gauss(0, 1.5) for s in substrate_concs]

print(f"\\nSubstrate [S] (mM)  Velocity (μmol/min)")
print(f"{'-' * 40}")
for s, v in zip(substrate_concs, velocities):
    print(f"  {s:8.3f}            {v:6.2f}")

# Fit via Lineweaver-Burk
vmax_fit, km_fit = lineweaver_burk(substrate_concs, velocities)
print(f"\\nLineweaver-Burk fit:")
print(f"  Vmax = {vmax_fit:.2f} μmol/min (true: {true_vmax})")
print(f"  Km   = {km_fit:.3f} mM       (true: {true_km})")
print(f"  Km/Km_true = {km_fit / true_km:.2f} (1.0 = perfect)")

# Predict V at saturating [S]
print(f"\\nPredicted V at [S]=1000mM (saturating): {michaelis_menten(1000, vmax_fit, km_fit):.2f}")
print(f"  (Should approach Vmax = {vmax_fit:.2f})")

# ============================================================
# Hill equation — hemoglobin cooperativity
# ============================================================
print(f"\\n{'=' * 60}")
print("Hill Equation — Hemoglobin O2 cooperativity")
print("=" * 60)

# Hemoglobin: n ≈ 2.8 (positive cooperativity)
# Myoglobin: n = 1 (no cooperativity)
pO2 = [0.5, 1, 2, 5, 10, 20, 40, 60, 100]
hemoglobin_sat = [hill_equation(p, 1.0, 26.0, 2.8) for p in pO2]  # P50 = 26 mmHg
myoglobin_sat = [hill_equation(p, 1.0, 2.0, 1.0) for p in pO2]   # P50 = 2 mmHg

print(f"\\npO2 (mmHg)   Hemoglobin Sat   Myoglobin Sat")
print(f"{'-' * 50}")
for p, h, m in zip(pO2, hemoglobin_sat, myoglobin_sat):
    print(f"  {p:5.1f}       {h:.4f}          {m:.4f}")

print(f"\\n  Hemoglobin (n=2.8): S-shaped (sigmoidal) curve — cooperativity")
print(f"  Myoglobin (n=1): hyperbolic — no cooperativity")
print(f"\\n  Why cooperativity? Each O2 binding increases affinity for next.")
print(f"  Hemoglobin loads O2 in lungs (high pO2), releases in tissues (low pO2).")

# ============================================================
# Modern: AlphaFold DB (200M structures)
# ============================================================
print(f"\\n{'=' * 60}")
print("AlphaFold Protein Structure Database")
print("=" * 60)
print(f"""
AlphaFold DB (Varadi 2022, DeepMind + EBI):
  - 200M+ predicted protein structures
  - Covers ~99% of UniProt proteins
  - vs PDB: 170K experimental structures (mostly human)
  - Free, downloadable (MMTF format, ~3 TB compressed)
  
  Per-structure: confidence score (pLDDT) per residue
    > 90: very high confidence (accurate side chain)
    70-90: confident (backbone good)
    50-70: low confidence (backbone OK, side chain unreliable)
    < 50: very low (intrinsically disordered region)
  
  Download per-structure: 
    GET https://alphafold.ebi.ac.uk/api/prediction/{uniprot_id}
  
  Bulk: FTP alphafold.ebi.ac.uk/pub/databases/alphafold/
  
  Pipeline: protein seq → AlphaFold DB lookup → 3D coords → DSSP 
    (secondary structure) → Ramachandran validation → 
    ESM-2 embedding (ADR-034) → pgvector (ADR-022)
""")
print("=" * 60)`;

const PYTORCH_CODE = `import torch
import torch.nn as nn
import torch.nn.functional as F
import math
from typing import List, Tuple, Optional, Dict

# ============================================================
# 1. Protein secondary structure prediction (3-state)
# ============================================================

class SecondaryStructurePredictor(nn.Module):
    """3-state protein secondary structure predictor (helix/sheet/coil).
    
    Architecture: 1D CNN over amino acid sequence.
    Sliding window of 21 residues → predict middle residue's state.
    
    State-of-the-art (1996-2018): PHD, PSIPRED, JPred, Netsolp
    Modern (2024+): MSA Transformer + ESM-2 — but 3-state head is the same.
    
    Production: replace with ESM-2 frozen embeddings + linear head.
    """
    def __init__(self, vocab_size: int = 25, hidden_dim: int = 64,
                 kernel_size: int = 21, num_classes: int = 3):
        super().__init__()
        # 1D convolution: local context
        self.conv1 = nn.Conv1d(vocab_size, hidden_dim, kernel_size, padding=kernel_size//2)
        self.conv2 = nn.Conv1d(hidden_dim, hidden_dim, 3, padding=1)
        self.conv3 = nn.Conv1d(hidden_dim, hidden_dim, 3, padding=1)
        # Output: per-residue 3-state classification (H=helix, E=sheet, C=coil)
        self.head = nn.Conv1d(hidden_dim, num_classes, 1)
        self.dropout = nn.Dropout(0.3)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass.
        
        Args:
            x: (B, L, vocab_size) one-hot encoded sequence
        Returns:
            logits: (B, L, 3) per-residue 3-state
        """
        # Conv1d expects (B, C, L)
        x = x.transpose(1, 2)
        x = F.relu(self.conv1(x))
        x = self.dropout(x)
        x = F.relu(self.conv2(x))
        x = self.dropout(x)
        x = F.relu(self.conv3(x))
        x = self.head(x)
        return x.transpose(1, 2)  # back to (B, L, 3)


# ============================================================
# 2. Ramachandran plot validation
# ============================================================

class RamachandranValidator:
    """Validate protein structure via Ramachandran plot.
    
    Computes φ/ψ angles from backbone coordinates, checks what %
    of residues fall in allowed/disallowed regions.
    
    Allowed regions (Lovel et al. 2003):
        α-helix:    φ ∈ [-150, -30], ψ ∈ [-90, -10]
        β-sheet:    φ ∈ [-180, -100], ψ ∈ [100, 180]
        PPII:       φ ∈ [-100, -50], ψ ∈ [120, 180]
        C7eq:       φ ∈ [-100, -60], ψ ∈ [-50, -10]
    
    Disallowed: D-amino acid territory (φ > 0, ψ > 0) — steric clash.
    """
    ALLOWED_REGIONS = [
        # (phi_min, phi_max, psi_min, psi_max)
        (-150, -30, -90, -10),    # α-helix
        (-180, -100, 100, 180),   # β-sheet
        (-100, -50, 120, 180),    # PPII
        (-100, -60, -50, -10),    # C7eq
    ]
    
    @staticmethod
    def compute_phi_psi(ca_prev: torch.Tensor, n: torch.Tensor,
                        ca: torch.Tensor, c: torch.Tensor,
                        n_next: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Compute φ and ψ angles from backbone atoms.
        
        φ (phi) = C(i-1)–N(i)–Cα(i)–C(i)
        ψ (psi) = N(i)–Cα(i)–C(i)–N(i+1)
        """
        def dihedral(p0, p1, p2, p3):
            """Compute dihedral angle between 4 points."""
            b0 = p1 - p0
            b1 = p2 - p1
            b2 = p3 - p2
            # Normal vectors
            n1 = torch.cross(b0, b1)
            n2 = torch.cross(b1, b2)
            # Angle
            x = (n1 * n2).sum(-1)
            y = (torch.cross(n1, n2) * b1 / b1.norm(dim=-1, keepdim=True)).sum(-1)
            return torch.atan2(y, x)
        
        phi = dihedral(ca_prev, n, ca, c)
        psi = dihedral(n, ca, c, n_next)
        return phi, psi
    
    @classmethod
    def is_in_allowed(cls, phi: float, psi: float) -> bool:
        """Check if (phi, psi) is in an allowed region."""
        for phi_min, phi_max, psi_min, psi_max in cls.ALLOWED_REGIONS:
            if phi_min <= phi <= phi_max and psi_min <= psi <= psi_max:
                return True
        return False
    
    @classmethod
    def validate(cls, phi_psi_list: List[Tuple[float, float]]) -> Dict:
        """Validate a list of (phi, psi) angles.
        
        Returns: {total, allowed_count, disallowed_count, percentage_allowed}
        """
        allowed_count = sum(1 for phi, psi in phi_psi_list if cls.is_in_allowed(phi, psi))
        total = len(phi_psi_list)
        return {
            'total': total,
            'allowed_count': allowed_count,
            'disallowed_count': total - allowed_count,
            'percentage_allowed': allowed_count / total * 100 if total > 0 else 0,
        }


# ============================================================
# 3. Enzyme kinetics — Michaelis-Menten + Hill
# ============================================================

class EnzymeKinetics:
    """Fit and predict enzyme kinetics.
    
    Michaelis-Menten: V = Vmax · [S] / (Km + [S])
    Hill: V = Vmax · [S]^n / (Kd^n + [S]^n)
    
    Production: SciPy curve_fit (Levenberg-Marquardt nonlinear least squares).
    """
    
    @staticmethod
    def michaelis_menten(s: torch.Tensor, vmax: float, km: float) -> torch.Tensor:
        """V = Vmax · [S] / (Km + [S])"""
        return vmax * s / (km + s)
    
    @staticmethod
    def hill(s: torch.Tensor, vmax: float, kd: float, n: float) -> torch.Tensor:
        """V = Vmax · [S]^n / (Kd^n + [S]^n)"""
        return vmax * (s ** n) / (kd ** n + s ** n)
    
    @staticmethod
    def fit_michaelis_menten(s: torch.Tensor, v: torch.Tensor,
                             max_iter: int = 100) -> Tuple[float, float]:
        """Fit Vmax, Km via gradient descent on MSE loss.
        
        Production: SciPy curve_fit (Levenberg-Marquardt — better convergence).
        """
        vmax = torch.tensor(v.max().item() * 1.1, requires_grad=True)
        km = torch.tensor(s.median().item(), requires_grad=True)
        opt = torch.optim.Adam([vmax, km], lr=0.01)
        
        for _ in range(max_iter):
            opt.zero_grad()
            pred = EnzymeKinetics.michaelis_menten(s, vmax, km)
            loss = F.mse_loss(pred, v)
            loss.backward()
            opt.step()
            # Ensure positivity
            with torch.no_grad():
                vmax.clamp_(min=0.01)
                km.clamp_(min=0.001)
        
        return vmax.item(), km.item()
    
    @staticmethod
    def fit_hill(s: torch.Tensor, v: torch.Tensor,
                 max_iter: int = 200) -> Tuple[float, float, float]:
        """Fit Vmax, Kd, n via gradient descent."""
        vmax = torch.tensor(v.max().item() * 1.1, requires_grad=True)
        kd = torch.tensor(s.median().item(), requires_grad=True)
        n = torch.tensor(1.0, requires_grad=True)
        opt = torch.optim.Adam([vmax, kd, n], lr=0.01)
        
        for _ in range(max_iter):
            opt.zero_grad()
            pred = EnzymeKinetics.hill(s, vmax, kd, torch.abs(n))
            loss = F.mse_loss(pred, v)
            loss.backward()
            opt.step()
        
        return vmax.item(), kd.item(), abs(n).item()


# ============================================================
# 4. Glycomics — glycan graph + WURCS canonicalisation
# ============================================================

class GlycanGraph:
    """Glycan structure as a graph (monosaccharide nodes, glycosidic bonds edges).
    
    Production: glypy library (Tiwari 2018).
    
    WURCS (Web3 Unique Representation of Carbohydrate Sequences):
        Canonical string per glycan, like SMILES for molecules.
        Format: WURCS=2.0/num_monos,num_linkages,unique_monos/list_of_monos/list_of_linkages
    """
    MONOSACCHARIDES = {
        'Glc': 'glucose', 'Gal': 'galactose', 'Man': 'mannose',
        'GlcNAc': 'N-acetylglucosamine', 'GalNAc': 'N-acetylgalactosamine',
        'Fuc': 'fucose', 'Xyl': 'xylose', 'Neu5Ac': 'sialic acid',
    }
    
    def __init__(self):
        self.nodes = []  # list of monosaccharide IDs
        self.edges = []  # list of (parent, child, linkage) — linkage is (anomeric, parent_pos, child_pos)
    
    def add_monosaccharide(self, name: str) -> int:
        """Add a monosaccharide node."""
        idx = len(self.nodes)
        self.nodes.append(name)
        return idx
    
    def add_bond(self, parent: int, child: int, anomeric: str, parent_pos: int, child_pos: int):
        """Add a glycosidic bond.
        
        Args:
            parent, child: node indices
            anomeric: 'α' or 'β'
            parent_pos, child_pos: carbon positions (1-6 typical)
        """
        self.edges.append((parent, child, anomeric, parent_pos, child_pos))
    
    def wurcs(self) -> str:
        """Generate WURCS canonical string (simplified)."""
        unique = list(set(self.nodes))
        monos_part = '/'.join(f'[{i+1}]{n}' for i, n in enumerate(unique))
        link_part = '/'.join(
            f'{unique.index(self.nodes[p])+1}-{a}{pp}{cp}-{unique.index(self.nodes[c])+1}'
            for p, c, a, pp, cp in self.edges
        )
        return f'WURCS=2.0/{len(self.nodes)},{len(self.edges)},{len(unique)}/{monos_part}/{link_part}'
    
    def fingerprint(self, n_bits: int = 256) -> List[int]:
        """Generate a glycan fingerprint (similar to ECFP from ADR-035).
        
        Features: monosaccharide composition + linkage types.
        """
        fp = [0] * n_bits
        # Composition features
        for name in self.nodes:
            bit = hash(name) % n_bits
            fp[bit] = 1
        # Linkage features
        for _, _, a, pp, cp in self.edges:
            bit = hash(f'{a}{pp}{cp}') % n_bits
            fp[bit] = 1
        return fp


# ============================================================
# 5. Lipid class fingerprints
# ============================================================

class LipidFingerprinter:
    """Lipid fingerprints via LIPID MAPS LMSD class hierarchy.
    
    LMSD has 40K+ lipids in 8 main categories:
        FA: fatty acyls
        GL: glycerolipids
        GP: glycerophospholipids
        SP: sphingolipids
        ST: sterols
        PR: prenol lipids
        SL: saccharolipids
        PK: polyketides
    
    Each category has subcategories (e.g. GP: PC, PE, PS, PI, PG, CL).
    """
    LIPID_CATEGORIES = {
        'FA': 'fatty acyls',
        'GL': 'glycerolipids',
        'GP': 'glycerophospholipids',
        'SP': 'sphingolipids',
        'ST': 'sterols',
        'PR': 'prenol lipids',
        'SL': 'saccharolipids',
        'PK': 'polyketides',
    }
    
    GP_HEADGROUPS = {
        'PC': 'phosphatidylcholine',
        'PE': 'phosphatidylethanolamine',
        'PS': 'phosphatidylserine',
        'PI': 'phosphatidylinositol',
        'PG': 'phosphatidylglycerol',
        'CL': 'cardiolipin',
        'PA': 'phosphatidic acid',
    }
    
    @classmethod
    def fingerprint(cls, lipid_class: str, n_bits: int = 128) -> List[int]:
        """Generate a lipid fingerprint based on class + headgroup.
        
        Args:
            lipid_class: e.g. 'GP_PC' (glycerophospholipid + phosphatidylcholine)
        """
        fp = [0] * n_bits
        parts = lipid_class.split('_')
        category = parts[0] if len(parts) >= 1 else 'unknown'
        headgroup = parts[1] if len(parts) >= 2 else 'unknown'
        
        # Category bit
        if category in cls.LIPID_CATEGORIES:
            fp[hash(category) % n_bits] = 1
        # Headgroup bit
        if category == 'GP' and headgroup in cls.GP_HEADGROUPS:
            fp[hash(f'GP_{headgroup}') % n_bits] = 1
        return fp
    
    @classmethod
    def tanimoto(cls, fp_a: List[int], fp_b: List[int]) -> float:
        """Tanimoto similarity between two lipid fingerprints (same as ADR-035)."""
        intersection = sum(1 for a, b in zip(fp_a, fp_b) if a == 1 and b == 1)
        union = sum(1 for a, b in zip(fp_a, fp_b) if a == 1 or b == 1)
        return intersection / union if union > 0 else 0.0


# Sanity check
if __name__ == "__main__":
    # Secondary structure predictor
    model = SecondaryStructurePredictor(vocab_size=25, hidden_dim=32)
    n_params = sum(p.numel() for p in model.parameters())
    print(f"Secondary structure predictor: {n_params:,} params")
    
    x = torch.zeros(2, 100, 25)
    x[:, :, 5] = 1  # mock amino acid 5 at every position
    out = model(x)
    print(f"  Input: {tuple(x.shape)} → Output: {tuple(out.shape)}  (per-residue 3-state)")
    
    # Ramachandran validation
    phi_psi_examples = [(-60, -45), (-120, 130), (-75, 145), (60, 60)]
    result = RamachandranValidator.validate(phi_psi_examples)
    print(f"\\nRamachandran validation:")
    print(f"  {result['allowed_count']}/{result['total']} residues in allowed regions")
    print(f"  ({result['percentage_allowed']:.0f}%)")
    
    # Enzyme kinetics
    s = torch.tensor([0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0])
    v = EnzymeKinetics.michaelis_menten(s, vmax=100, km=0.5)
    print(f"\\nMichaelis-Menten (Vmax=100, Km=0.5):")
    for si, vi in zip(s.tolist(), v.tolist()):
        print(f"  [S]={si:5.2f}  V={vi:6.2f}")
    
    # Fit (with noise)
    torch.manual_seed(42)
    v_noisy = v + torch.randn_like(v) * 0.5
    vmax_fit, km_fit = EnzymeKinetics.fit_michaelis_menten(s, v_noisy, max_iter=50)
    print(f"\\nFit: Vmax={vmax_fit:.2f} (true=100), Km={km_fit:.3f} (true=0.5)")
    
    # Glycan graph
    g = GlycanGraph()
    g.add_monosaccharide('Man')  # 0: core mannose
    g.add_monosaccharide('GlcNAc')  # 1
    g.add_monosaccharide('GlcNAc')  # 2
    g.add_monosaccharide('Man')  # 3
    g.add_bond(0, 1, 'β', 4, 1)  # β1-4
    g.add_bond(1, 2, 'β', 4, 1)
    g.add_bond(2, 3, 'α', 6, 1)
    print(f"\\nGlycan (4 monos, 3 bonds): {g.wurcs()}")
    print(f"  Fingerprint (16 bits): {g.fingerprint(n_bits=16)}")
    
    # Lipid
    fp_pc = LipidFingerprinter.fingerprint('GP_PC', n_bits=16)
    fp_pe = LipidFingerprinter.fingerprint('GP_PE', n_bits=16)
    fp_pc2 = LipidFingerprinter.fingerprint('GP_PC', n_bits=16)
    print(f"\\nLipid GP_PC fingerprint: {fp_pc}")
    print(f"  Tanimoto(GP_PC, GP_PC) = {LipidFingerprinter.tanimoto(fp_pc, fp_pc2):.2f} (self)")
    print(f"  Tanimoto(GP_PC, GP_PE) = {LipidFingerprinter.tanimoto(fp_pc, fp_pe):.2f} (same category, diff headgroup)")`;

export function MacroStructuresPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Macro Structures · proteins · enzymes · glycans · lipids"
        title="Macro Structures — Protein, Enzyme, Carbohydrate, Lipid Hierarchy"
        description="Deeper iteration on the macro-molecular world: protein 4 levels of structure (primary → secondary → tertiary → quaternary) validated via the Ramachandran plot (φ/ψ backbone dihedrals), enzyme saturation kinetics (Michaelis-Menten V = Vmax·[S]/(Km+[S]), Hill equation for allosteric cooperativity), glycomics (WURCS canonical strings + GlyTouCan), lipidomics (LIPID MAPS LMSD class hierarchy). Modern: AlphaFold DB (200M predicted structures covering ~99% of UniProt). With 4 AI-generated scientific illustrations (protein 4 levels, enzyme active site, glycan tree, lipid bilayer) and a looping Ramachandran plot 'short'. Code-oriented, mathematical, scientific."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Boxes className="h-3 w-3" /> Protein + Enzyme + Glycan + Lipid</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Pyodide</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />)}
      </div>

      {/* AI gallery */}
      <SectionCard title="AI-generated macro-structure illustrations — click to expand" description="Four original 3D-rendered scientific illustrations via AI image generation. Click any thumbnail for the inline modal; the 'Open in new tab' button opens the high-resolution PNG in a new browser tab." icon={<Boxes className="h-5 w-5" />} badge="AI gallery">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <ImageModal
              src="/images/macro/protein-levels.png"
              alt="Four levels of protein structure"
              caption="Four levels of protein structure: 1° (primary amino acid sequence) → 2° (secondary α-helix and β-sheet) → 3° (tertiary folded globular domain) → 4° (quaternary multi-subunit complex). Anfinsen's dogma (1973): the primary sequence determines the 3D structure. Rendered via AI image generation."
            />
            <p className="text-[11px] text-muted-foreground mt-2 text-center">Protein 4 levels — primary → quaternary</p>
          </div>
          <div>
            <ImageModal
              src="/images/macro/enzyme-active-site.png"
              alt="Enzyme active site with substrate"
              caption="Enzyme active site (lock-and-key + induced fit). The enzyme surface (teal) has a cleft that binds the substrate (orange). The enzyme-lower-transition-state theory (Haldane 1930): enzymes stabilise the transition state, lowering the activation energy. Michaelis-Menten V = Vmax·[S]/(Km+[S]) describes the rate. Rendered via AI image generation."
            />
            <p className="text-[11px] text-muted-foreground mt-2 text-center">Enzyme active site — substrate binding</p>
          </div>
          <div>
            <ImageModal
              src="/images/macro/glycan-tree.png"
              alt="N-linked glycan branched tree"
              caption="N-linked glycan tree — sugar monomers (different colours) connected by glycosidic bonds (α1-2, α1-3, α1-4, α1-6, β1-4). N-linked glycans attach to asparagine residues via N-acetylglucosamine. The GlyTouCan database has 100K+ canonical structures (WURCS strings). Rendered via AI image generation."
            />
            <p className="text-[11px] text-muted-foreground mt-2 text-center">N-linked glycan — branched carbohydrate</p>
          </div>
          <div>
            <ImageModal
              src="/images/macro/lipid-bilayer.png"
              alt="Lipid bilayer membrane cross-section"
              caption="Lipid bilayer cross-section — phospholipid heads (teal, hydrophilic) face the water on both sides; hydrophobic tails (orange) point inward, away from water. Channel proteins (centre) span the membrane. LIPID MAPS LMSD classifies 40K+ lipids in 8 categories (FA, GL, GP, SP, ST, PR, SL, PK). Rendered via AI image generation."
            />
            <p className="text-[11px] text-muted-foreground mt-2 text-center">Lipid bilayer — membrane cross-section</p>
          </div>
        </div>
      </SectionCard>

      {/* Ramachandran short */}
      <SectionCard title="Ramachandran plot short — backbone dihedral angles (loop)" description="Continuous-loop animation showing φ/ψ angles clustering in allowed regions: α-helix (blue, around -60,-45), β-sheet (green, around -120,130), polyproline II (amber, around -75,145). Disallowed regions (right side) are steric clashes — backbone atoms overlap. AlphaFold structures should have ~99% of residues in allowed regions; low % = low-quality prediction." icon={<Boxes className="h-5 w-5" />} badge="short">
        <RamachandranShort />
      </SectionCard>

      {/* Protein hierarchy math */}
      <SectionCard title="Protein 4 levels — Anfinsen's dogma" description="The 4-level hierarchy of protein structure: primary (sequence, peptide bond chemistry) → secondary (α-helix, β-sheet, hydrogen bonds) → tertiary (fold, hydrophobic core) → quaternary (multi-subunit assembly). Anfinsen's 1973 dogma: the primary sequence uniquely determines the native 3D structure. This is the thermodynamic principle that AlphaFold2 exploited (see ADR-034 deeper-thought insight)." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="grid md:grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
              <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">Primary (1°)</p>
              <p className="font-mono text-[11px]">Amino acid sequence</p>
              <p className="text-muted-foreground text-[11px] mt-1">Peptide bonds (-CO-NH-). ~20 standard amino acids. Read 5'→3' from mRNA. Determines all higher levels (Anfinsen).</p>
            </div>
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5">
              <p className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-1">Secondary (2°)</p>
              <p className="font-mono text-[11px]">α-helix, β-sheet</p>
              <p className="text-muted-foreground text-[11px] mt-1">Backbone H-bonds: α-helix (i→i+4), β-sheet (parallel/anti-parallel). Predictable from sequence (PSIPRED, JPred).</p>
            </div>
            <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-2.5">
              <p className="font-semibold text-sm text-violet-600 dark:text-violet-400 mb-1">Tertiary (3°)</p>
              <p className="font-mono text-[11px]">3D fold</p>
              <p className="text-muted-foreground text-[11px] mt-1">Hydrophobic core + disulfide bonds + salt bridges. AlphaFold2 predicts this from sequence (CASP14: 92.4 GDT_TS).</p>
            </div>
            <div className="rounded-md border border-cyan-500/40 bg-cyan-500/5 p-2.5">
              <p className="font-semibold text-sm text-cyan-600 dark:text-cyan-400 mb-1">Quaternary (4°)</p>
              <p className="font-mono text-[11px]">Multi-subunit complex</p>
              <p className="text-muted-foreground text-[11px] mt-1">Protein-protein assembly. AlphaFold3 (ADR-036) predicts via diffusion. Examples: hemoglobin (α2β2), antibodies (2H+2L).</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Michaelis-Menten math */}
      <SectionCard title="Enzyme kinetics — Michaelis-Menten + Hill cooperativity" description="V = Vmax·[S]/(Km+[S]) describes saturation: at low [S], rate is linear in [S]; at high [S], rate saturates at Vmax. Km = [S] at half-maximal rate (inverse of affinity). Hill equation V = Vmax·[S]^n/(Kd^n+[S]^n) generalises: n=1 Michaelis-Menten, n>1 positive cooperativity (sigmoid, hemoglobin n≈2.8), n<1 negative." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">V = V<sub>max</sub> · [S] / (K<sub>m</sub> + [S]) &nbsp;·&nbsp; Hill: V = V<sub>max</sub> · [S]<sup>n</sup> / (K<sub>d</sub><sup>n</sup> + [S]<sup>n</sup>)</p>
            <p className="text-[11px] text-muted-foreground mt-1">Saturation kinetics. Lineweaver-Burk: 1/V = (Km/Vmax)·(1/[S]) + 1/Vmax — linear in 1/[S], easy to fit pre-computers.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
              <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">n = 1</p>
              <p className="font-mono text-[11px]">Michaelis-Menten (hyperbolic)</p>
              <p className="text-muted-foreground text-[11px] mt-1">No cooperativity. Single active site. Most enzymes.</p>
            </div>
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5">
              <p className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-1">n &gt; 1</p>
              <p className="font-mono text-[11px]">Positive cooperativity (sigmoid)</p>
              <p className="text-muted-foreground text-[11px] mt-1">Each ligand binding increases affinity for next. Hemoglobin (n≈2.8). Sharp on/off switch.</p>
            </div>
            <div className="rounded-md border border-rose-500/40 bg-rose-500/5 p-2.5">
              <p className="font-semibold text-sm text-rose-600 dark:text-rose-400 mb-1">n &lt; 1</p>
              <p className="font-mono text-[11px]">Negative cooperativity</p>
              <p className="text-muted-foreground text-[11px] mt-1">Each ligand decreases affinity. Less common — regulatory enzymes.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard title="Try it: Enzyme kinetics fit + Hill cooperativity (Pyodide)" description="Implements Michaelis-Menten V = Vmax·[S]/(Km+[S]) from scratch, generates synthetic data for hexokinase (Vmax=100, Km=0.5 mM), fits via Lineweaver-Burk (1/V vs 1/[S] linear regression) and reports fitted parameters. Plus Hill equation for hemoglobin (n=2.8) vs myoglobin (n=1) — shows the sigmoid vs hyperbolic difference. Plus AlphaFold DB API example." icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={KINETICS_DEMO} buttonLabel="Run enzyme kinetics (Pyodide)" />
      </SectionCard>

      {/* Modern papers */}
      <SectionCard title="Modern papers — AlphaFold DB, GlyTouCan, LIPID MAPS" description="Three reference databases that defined modern macro-structure biology: (1) AlphaFold DB (Varadi 2022, Nature — 200M+ predicted structures, ~99% of UniProt). (2) GlyTouCan (Tiemeyer 2017 — 100K+ glycan structures, WURCS canonical strings). (3) LIPID MAPS LMSD (Sud 2007 — 40K+ lipids in 8 categories). Together: structure data for every biological macro-molecule class." icon={<FlaskConical className="h-5 w-5" />}>
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">AlphaFold DB paper (Varadi et al. 2022, Nature):</strong> Released 200M+ predicted protein 3D structures via AlphaFold2 — covers ~99% of UniProt proteins. The largest biological structure dataset ever. Per-residue confidence (pLDDT) flags low-quality regions (typically intrinsically disordered). API: <span className="font-mono">https://alphafold.ebi.ac.uk/api/predition/&lt;uniprot_id&gt;</span>. Bulk download: 3TB compressed. This is the reference for any protein structure query — PDB (170K experimental structures) is now the small subset.</p>
          <p><strong className="text-foreground/80">GlyTouCan (Tiemeyer et al. 2017):</strong> The international glycan structure database — 100K+ unique glycan structures with WURCS (Web3 Unique Representation of Carbohydrate Sequences) canonical strings. Each glycan has a unique identifier (G12345AB). Connects to ADR-035 cheminformatics: WURCS for glycans = SMILES for small molecules — both are linear canonical encodings of branched molecular graphs. Production: glycans → WURCS → glypy library → graph → fingerprint → pgvector.</p>
          <p><strong className="text-foreground/80">LIPID MAPS LMSD (Sud et al. 2007):</strong> Lipidomics database with 40K+ lipid structures organised in 8 categories: fatty acyls (FA), glycerolipids (GL), glycerophospholipids (GP), sphingolipids (SP), sterols (ST), prenol lipids (PR), saccharolipids (SL), polyketides (PK). Each GP lipid has a headgroup (PC, PE, PS, PI, PG, CL, PA) — class-aware fingerprint design (LipidFingerprinter in low-level PyTorch). Connects to ADR-022 pgvector: lipid class fingerprints store as bit vectors, Tanimoto similarity finds lipids in same class.</p>
        </div>
      </SectionCard>

      {/* Pipeline */}
      <SectionCard title="Macro-structure pipeline — sequence → structure → function" description="End-to-end: protein sequence (from ESM-2 ADR-034) → AlphaFold DB lookup → 3D coords → DSSP secondary structure + Ramachandran validation → ESM-2 functional embedding → pgvector. For enzymes: Michaelis-Menten fit on BRENDA kinetics data. For glycans: WURCS → glypy graph → fingerprint → pgvector. For lipids: LIPID MAPS class → fingerprint → pgvector." icon={<Activity className="h-5 w-5" />}>
        <CodeBlock language="text" filename="macro_pipeline.txt" code={`┌──────────────────────────────────────────────────────────────────────┐
│  MACRO-STRUCTURE ANALYSIS PIPELINE                                    │
│                                                                            │
│  Input: protein sequence (from mRNA → ADR-037 genetic materials)       │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ AlphaFold DB lookup (200M structures, ~99% UniProt)  │              │
│  │   - PDB file or MMcif (CIF format)                    │              │
│  │   - Per-residue pLDDT confidence score                 │              │
│  │   - API: alphafold.ebi.ac.uk/api/prediction/{uniprot}│              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ DSSP — assign secondary structure from 3D coords     │              │
│  │   - 3-state (H/E/C) or 8-state (H/B/T/E/G/I/S/-)      │              │
│  │   - H-bond pattern detection                           │              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ Ramachandran validation                                │              │
│  │   - Compute φ/ψ angles from backbone (N-Cα-C)        │              │
│  │   - Check % in allowed regions (α/β/PPII/C7eq)        │              │
│  │   - Target: > 98% allowed (good structure)            │              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ ESM-2 embedding (ADR-034) → pgvector (ADR-022)        │              │
│  │   - 1280-dim per-residue + pooled embedding           │              │
│  │   - HNSW index for fast functional RAG                 │              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ For enzymes: kinetics + BRENDA lookup                 │              │
│  │   - EC number from sequence (DeepEC CNN classifier)  │              │
│  │   - Look up Km, Vmax in BRENDA (200K entries)         │              │
│  │   - Or fit from your own kinetic data (Pyodide demo)  │              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ For glycoproteins: glycan tree analysis                │              │
│  │   - Extract glycan from PDB (or from mass spec data) │              │
│  │   - WURCS canonical string (GlyTouCan lookup)         │              │
│  │   - Glycan fingerprint (graph → bit vector)           │              │
│  │   - pgvector Tanimoto search (ADR-035 pattern)        │              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ For membrane proteins: lipid environment              │              │
│  │   - Identify lipid class (LIPID MAPS LMSD)            │              │
│  │   - Class-aware fingerprint (8 categories)            │              │
│  │   - MD simulation in lipid bilayer (ADR-036 AMBER)   │              │
│  └──────────────────────────────────────────────────────┘              │
└──────────────────────────────────────────────────────────────────────────┘`} />
      </SectionCard>

      {/* Low-level PyTorch */}
      <SectionCard title="Low-level PyTorch — SecondaryStructurePredictor, RamachandranValidator, EnzymeKinetics, GlycanGraph, LipidFingerprinter" description="The actual production code. SecondaryStructurePredictor is a 3-conv 1D CNN (kernel 21 = local context window) with 3-state output (helix/sheet/coil) — production would use ESM-2 frozen embeddings + linear head. RamachandranValidator computes φ/ψ from backbone atoms (dihedral via cross products) and checks against 4 allowed regions. EnzymeKinetics has michaelis_menten() and hill() static methods + fit_michaelis_menten via Adam gradient descent. GlycanGraph stores nodes + edges with WURCS canonical string generation + fingerprint. LipidFingerprinter has 8-category class hierarchy + Tanimoto." icon={<Cpu className="h-5 w-5" />} badge="low-level">
        <CodeBlock language="python" filename="macro_structures.py" highlight={[10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292,293,294,295]} code={PYTORCH_CODE} />
      </SectionCard>

      {/* Insight */}
      <SectionCard title="My deeper thought: macro structures ARE constraint-satisfaction problems" description="Protein folding, enzyme catalysis, glycan branching, lipid self-assembly are all instances of constraint satisfaction. The constraints are physical (Ramachandran allowed regions = steric constraints), chemical (Michaelis-Menten = lock-and-key), and thermodynamic (Anfinsen = free-energy minimum). AlphaFold2/3 IS a constraint solver, E(n)-equivariance IS the constraint language." icon={<TrendingUp className="h-5 w-5" />} badge="Insight">
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Protein folding IS a constraint satisfaction problem (CSP).</strong> The constraints: (a) Ramachandran allowed regions (steric — backbone atoms cannot overlap), (b) hydrophobic core packing (non-polar residues away from water), (c) hydrogen bond satisfaction (donors find acceptors), (d) disulfide bond formation (cysteines pair). The solution is the 3D structure that satisfies all constraints simultaneously — a high-dimensional CSP. Anfinsen's 1973 dogma (sequence → unique native structure) is the assertion that the CSP has a unique solution at the global free-energy minimum. AlphaFold2/3 IS a learned CSP solver — given the constraints (sequence + MSA co-evolution), it predicts the solution (3D coords). The SE(3)-equivariant architecture encodes the rotational symmetry constraint.</p>
          <p><strong className="text-foreground/80">Enzyme kinetics IS a queueing problem.</strong> Michaelis-Menten V = Vmax·[S]/(Km+[S]) is structurally identical to the M/M/1 queue throughput formula: throughput = arrival_rate / (1 + service_rate/arrival_rate). The enzyme IS the server, [S] is the arrival rate, Km is the inverse service rate (low Km = fast service). Vmax is the maximum throughput (1/τ where τ is the catalytic time). The Hill equation generalises to M/M/k queues (multiple servers, cooperativity = how many servers activate together). This is why the same equation describes enzyme kinetics, queueing theory, and neural activation functions — all are saturation problems.</p>
          <p><strong className="text-foreground/80">Glycans and lipids ARE graph theory applied to biology.</strong> N-linked glycans are rooted trees (one root → branches via glycosidic bonds). The WURCS string is a canonical traversal order — same algorithm as SMILES canonicalisation (ADR-035). Lipids are simpler graphs (headgroup + tails) but live in a class hierarchy (8 categories, GP sub-classes). The GlycanGraph and LipidFingerprinter in the low-level code use the same hash-fingerprint trick as ECFP4 (ADR-035) — subgraph enumeration → hash → bit position. Glycan similarity Tanimoto = small-molecule Tanimoto, just on a different graph. The platform's cheminformatics infrastructure (ADR-035) generalises to any molecular-graph modality. Macro-structures connect to the platform's GenAI stack: protein structure → ESM-2 + AlphaFold DB → pgvector (function RAG), enzyme kinetics → BRENDA + SciPy curve_fit → pgvector (parameter RAG), glycan → WURCS → fingerprint → pgvector (structure RAG), lipid → LIPID MAPS class → fingerprint → pgvector (class RAG). All four macro-molecule types store in the same pgvector index, queryable via the same RAG pipeline. The macro-structure stack IS the multi-modal RAG pipeline (ADR-033), applied to biology's macro-molecules.</p>
        </div>
      </SectionCard>


      <DeeperThoughtSection pageTitle="Macro Structures">
        <DeeperThought title="Macro Structures IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about Macro Structures is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. Macro Structures connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where Macro Structures sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (Macro Structures) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
        <Link href={hrefFor("bioinformatics")} className="text-sm text-primary hover:underline">→ Bioinformatics (ESM-2 protein encoder)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("cheminformatics")} className="text-sm text-primary hover:underline">→ Cheminformatics (ECFP fingerprint pattern)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("molecular-modelling")} className="text-sm text-primary hover:underline">→ Molecular Modelling (AMBER force fields)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("genetic-materials")} className="text-sm text-primary hover:underline">→ Genetic Materials (sequence source)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("vector-db")} className="text-sm text-primary hover:underline">→ Vector DB (pgvector for structures)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">→ ADR-038 (AlphaFold DB + Michaelis-Menten)</Link>
      </div>
    </div>
  );
}
