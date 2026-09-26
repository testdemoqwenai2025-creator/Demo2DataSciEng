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
import { Cpu, Zap, TrendingUp, Terminal, Brain, Activity, Atom, FlaskConical } from "lucide-react";

const KPIS = [
  { label: "EDM", value: "DDPM on R^(N×3)", hint: "SE(3)-equivariant 3D molecule diffusion", deltaTone: "flat" as const },
  { label: "DiffDock", value: "20%+ vs AutoDock", hint: "Diffusion over binding poses (Corso 2023)", deltaTone: "flat" as const },
  { label: "GFlowNet", value: "Match reward dist.", hint: "Diverse candidates (not mode-collapsed)", deltaTone: "flat" as const },
  { label: "Sinkhorn", value: "W_ε = min⟨T,C⟩+εH(T)", hint: "Geometry-aware molecular similarity", deltaTone: "flat" as const },
];

function SinkhornShort() {
  const [step, setStep] = useState(0);
  useEffect(() => { const i = setInterval(() => setStep(s => (s+1)%5), 900); return () => clearInterval(i); }, []);
  const phases = ["1. Two molecule distributions (atoms)", "2. Cost matrix C_ij = |x_i - y_j|²", "3. Sinkhorn iterations: T_ij ← K_ij · u_i · v_j", "4. Transport plan converges", "5. Wasserstein distance = ⟨T*, C⟩"];
  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <style>{`.sk-3d { perspective: 800px; } .sk-stage { transform: rotateX(15deg); transform-style: preserve-3d; }`}</style>
      <p className="text-sm font-semibold mb-3 flex items-center gap-2"><FlaskConical className="h-4 w-4 text-primary" /> Sinkhorn optimal transport — molecular similarity (loop) <span className="text-[10px] font-mono text-muted-foreground ml-auto">{phases[step]}</span></p>
      <div className="sk-3d"><div className="sk-stage flex justify-center">
        <svg width="340" height="200" viewBox="0 0 340 200">
          {step === 0 && (<motion.g initial={{opacity:0}} animate={{opacity:1}}>{[[60,50],[80,70],[40,80]].map(([x,y],i)=><circle key={`a${i}`} cx={x} cy={y} r="5" fill="oklch(0.55 0.16 250)"/>)}{[[260,50],[280,80],[240,90]].map(([x,y],i)=><circle key={`b${i}`} cx={x} cy={y} r="5" fill="oklch(0.55 0.16 165)"/>)}<text x="80" y="120" textAnchor="middle" fontSize="9" fill="oklch(0.55 0.16 250)">Molecule A</text><text x="260" y="120" textAnchor="middle" fontSize="9" fill="oklch(0.55 0.16 165)">Molecule B</text></motion.g>)}
          {step === 1 && (
            <motion.g initial={{"opacity":0}} animate={{"opacity":1}}>
              {[[60,50],[80,70],[40,80]].map(function(a, i) {
                return [[260,50],[280,80],[240,90]].map(function(b, j) {
                  return <line key={"c-" + i + "-" + j} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="var(--muted)" strokeWidth={0.5} opacity={0.3} />;
                });
              })}
              <text x="170" y="150" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">Cost matrix C_ij</text>
            </motion.g>
          )}
          {step >= 2 && step <= 3 && (
            <motion.g initial={{"opacity":0}} animate={{"opacity":1}}>
              {[[60,50],[80,70],[40,80]].map(function(a, i) {
                return [[260,50],[280,80],[240,90]].map(function(b, j) {
                  var w = step === 2 ? 0.3 : 0.5;
                  return <motion.line key={"t-" + i + "-" + j} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="oklch(0.6 0.15 75)" strokeWidth={w} initial={{"opacity":0}} animate={{"opacity":w}} />;
                });
              })}
              <text x="170" y="150" textAnchor="middle" fontSize="9" fill="oklch(0.6 0.15 75)">{step === 2 ? "Sinkhorn iterations..." : "Transport plan converged"}</text>
            </motion.g>
          )}
          {step === 4 && (
            <motion.g initial={{"opacity":0}} animate={{"opacity":1}}>
              {[[60,50],[80,70],[40,80]].map(function(a, i) {
                return [[260,50],[280,80],[240,90]].map(function(b, j) {
                  var w = [0.5, 0.1, 0.4][j];
                  return <line key={"w-" + i + "-" + j} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="oklch(0.55 0.16 165)" strokeWidth={w * 3} />;
                });
              })}
              <rect x="100" y="160" width="140" height="25" rx="4" fill="oklch(0.55 0.16 165 / 0.1)" stroke="oklch(0.55 0.16 165)" strokeWidth="1" />
              <text x="170" y="177" textAnchor="middle" fontSize="10" fill="oklch(0.55 0.16 165)" fontWeight="bold">W = 2.3</text>
            </motion.g>
          )}
        </svg>
      </div></div>
      <p className="text-[10px] text-muted-foreground text-center mt-3">Phase 1: two molecule distributions. Phase 2: cost matrix. Phase 3-4: Sinkhorn iterations converge. Phase 5: Wasserstein distance = transport cost.</p>
    </div>
  );
}

const GC2_DEMO = `# Generative Chemistry 2.0 — EDM + DiffDock + GFlowNet + Sinkhorn (Pyodide)
import math, random

# ============================================================
# 1. Sinkhorn optimal transport — geometry-aware molecular similarity
# ============================================================
# W_ε(μ, ν) = min_T ⟨T, C⟩ + ε·H(T)
# where C_ij = |x_i - y_j|², H(T) = -Σ T_ij·log(T_ij)
# Sinkhorn: T_ij = K_ij · u_i · v_j (alternating scaling)

def sinkhorn(x, y, eps=0.1, n_iter=50):
    """Sinkhorn algorithm for entropic OT.
    
    Args:
        x: (n, d) source points (atoms of molecule A)
        y: (m, d) target points (atoms of molecule B)
        eps: regularization parameter
    
    Returns: (transport_plan, wasserstein_distance)
    """
    n, m = len(x), len(y)
    # Cost matrix
    C = [[sum((x[i][k]-y[j][k])**2 for k in range(len(x[0]))) for j in range(m)] for i in range(n)]
    # Kernel K_ij = exp(-C_ij / eps)
    K = [[math.exp(-C[i][j] / eps) for j in range(m)] for i in range(n)]
    # Sinkhorn iterations
    u = [1.0/n]*n
    v = [1.0/m]*m
    for _ in range(n_iter):
        # u ← 1 / (K @ v)
        for i in range(n):
            s = sum(K[i][j] * v[j] for j in range(m))
            u[i] = 1.0 / s if s > 0 else 1e-10
        # v ← 1 / (K^T @ u)
        for j in range(m):
            s = sum(K[i][j] * u[i] for i in range(n))
            v[j] = 1.0 / s if s > 0 else 1e-10
    # Transport plan
    T = [[K[i][j] * u[i] * v[j] for j in range(m)] for i in range(n)]
    # Wasserstein distance
    W = sum(T[i][j] * C[i][j] for i in range(n) for j in range(m))
    return T, W

print("=" * 60)
print("Sinkhorn Optimal Transport — Molecular Similarity")
print("=" * 60)
random.seed(42)
# Molecule A: 3 atoms
mol_A = [[random.gauss(0, 1) for _ in range(3)] for _ in range(3)]
# Molecule B: 3 atoms (similar to A)
mol_B = [[a + random.gauss(0, 0.3) for a in atom] for atom in mol_A]
# Molecule C: 3 atoms (different from A)
mol_C = [[random.gauss(5, 1) for _ in range(3)] for _ in range(3)]

T_AB, W_AB = sinkhorn(mol_A, mol_B, eps=0.1)
T_AC, W_AC = sinkhorn(mol_A, mol_C, eps=0.1)

print(f"\\nMolecule A: {[[f'{v:.2f}' for v in a] for a in mol_A]}")
print(f"Molecule B: {[[f'{v:.2f}' for v in a] for a in mol_B]} (similar to A)")
print(f"Molecule C: {[[f'{v:.2f}' for v in a] for a in mol_C]} (different from A)")
print(f"\\nWasserstein distance:")
print(f"  W(A, B) = {W_AB:.4f} (similar — small distance)")
print(f"  W(A, C) = {W_AC:.4f} (different — large distance)")
print(f"  Ratio: W(A,C)/W(A,B) = {W_AC/W_AB:.1f}×")

# Compare to Tanimoto (ADR-035 — 2D-only, no geometry)
print(f"\\n  → Tanimoto (ADR-035) ignores 3D geometry")
print(f"    Sinkhorn respects spatial shape — more informative")
print(f"    Geometry-aware: W measures 'work' to transform A into B")

# ============================================================
# 2. EDM diffusion — 3D molecule generation
# ============================================================
print(f"\\n{'=' * 60}")
print("EDM — Equivariant Diffusion Model (Hoogeboom 2022)")
print("=" * 60)
print("""
Architecture:
  - Data: x = (positions ∈ R^{N×3}, atom_types ∈ Z^N)
  - Forward: q(x_t | x_0) = N(√ᾱ_t · x_0, (1-ᾱ_t) · I)
    (same DDPM as ADR-027, but on R^{N×3} coordinates)
  - Reverse: p_θ(x_{t-1} | x_t) = N(μ_θ, σ_t · I)
    where θ = SE(3)-equivariant denoising network
  
Key: the noise is E(3)-equivariant — rotating input rotates output.
Same math as RFdiffusion (ADR-044) but on small molecules, not proteins.

Training: predict noise ε_θ(x_t, t, atom_types)
Sampling: reverse diffusion from x_T ~ N(0, I) → x_0 = new molecule

Production: generates novel 3D molecules not in training set.
Explores 10^60 chemical space via learned latent manifold.
""")

# ============================================================
# 3. GFlowNet — reward-matched generation
# ============================================================
print(f"{'=' * 60}")
print("GFlowNet — Generative Flow Network (Bengio 2023)")
print("=" * 60)
print("""
GFlowNet frames molecular design as an MDP:
  - States: partial molecules (atoms + bonds added sequentially)
  - Actions: add atom / add bond / terminate
  - Reward: R(x) = property score (e.g. binding affinity)
  - Objective: match the reward DISTRIBUTION (not maximise)

Key difference from RL (ADR-019):
  - RL: maximize E[R(x)] → mode collapse (all samples near optimum)
  - GFlowNet: match P(x) ∝ R(x) → diverse samples matching reward

Training: trajectory balance loss
  L = (log Z · Π_t P_F(s_{t+1}|s_t) - R(x) · Π_t P_B(s_t|s_{t+1}))²

The flow network learns P_F (forward policy) and P_B (backward).
At inference: sample from P_F → diverse high-reward molecules.

Connection to ADR-019 (bandit): 
  - Bandit: 1-step decision, Thompson sampling
  - GFlowNet: multi-step MDP, flow matching
  - Both: sample from posterior/reward, not maximise
""")

# ============================================================
# 4. DiffDock — diffusion-based docking
# ============================================================
print(f"{'=' * 60}")
print("DiffDock — Diffusion-Based Docking (Corso 2023)")
print("=" * 60)
print("""
DiffDock replaces AutoDock Vina (ADR-036) with learned diffusion:

  Input: protein structure + ligand SMILES
  Output: binding pose (translation + rotation + torsion)

  Method: reverse diffusion over SE(3) manifold
  - Translation: R^3 diffusion (standard DDPM)
  - Rotation: SO(3) diffusion (on the manifold, not Euclidean)
  - Torsion: torus diffusion (periodic angles)

  Performance:
    - Top-1 RMSD &lt; 2Å: 38% (DiffDock) vs 23% (Vina)
    - 20%+ improvement over all baselines
    - 60× faster than Vina at inference

  Key: the SE(3) manifold IS the configuration space of docking.
  Diffusion on manifolds (not Euclidean) preserves geometry.
""")

# ============================================================
# 5. Sinkhorn vs Tanimoto comparison
# ============================================================
print(f"\\n{'=' * 60}")
print("Comparison: Sinkhorn (3D) vs Tanimoto (2D)")
print("=" * 60)
print("""
  Metric         | Modality | Geometry-aware? | Complexity
  ---------------|----------|-----------------|------------
  Tanimoto       | 2D graph | No              | O(n) per pair
  Sinkhorn       | 3D coords| Yes             | O(n²·k) per pair
  Wasserstein-p  | 3D dist  | Yes             | O(n³) exact
  
  Trade-off: Sinkhorn is more informative but more expensive.
  For 100M compound library: Tanimoto (HNSW) is ms per query.
  Sinkhorn: ~100ms per pair (100× slower).
  
  Hybrid: use Tanimoto for fast pre-filter, Sinkhorn for top-100 rerank.
""")
print("=" * 60)`;

const PYTORCH_CODE = `import torch
import torch.nn as nn
import torch.nn.functional as F
import math
from typing import Dict, Tuple, List, Optional

# ============================================================
# 1. Sinkhorn optimal transport (entropic regularisation)
# ============================================================

class SinkhornDistance(nn.Module):
    """Sinkhorn distance with entropic regularisation.
    
    W_ε(μ, ν) = min_T ⟨T, C⟩ + ε·H(T)
    
    where C_ij = |x_i - y_j|², H(T) = -Σ T_ij·log(T_ij)
    
    Production: used for 3D molecular similarity (replaces Tanimoto for 3D).
    """
    def __init__(self, eps: float = 0.1, n_iter: int = 50, 
                 reduction: str = 'mean'):
        super().__init__()
        self.eps = eps
        self.n_iter = n_iter
        self.reduction = reduction
    
    def forward(self, x: torch.Tensor, y: torch.Tensor) -> torch.Tensor:
        """Compute Sinkhorn distance.
        
        Args:
            x: (B, N, D) source atoms (molecule A)
            y: (B, M, D) target atoms (molecule B)
        
        Returns: (B,) Sinkhorn distance per batch
        """
        B, N, D = x.shape
        M = y.shape[1]
        
        # Cost matrix: C_ij = |x_i - y_j|²
        # (B, N, M) — pairwise squared distances
        C = torch.cdist(x, y, p=2) ** 2  # (B, N, M)
        
        # Kernel: K_ij = exp(-C_ij / eps)
        K = torch.exp(-C / self.eps)
        
        # Sinkhorn iterations (log-domain for stability)
        log_K = torch.log(K + 1e-30)
        log_u = torch.zeros(B, N, device=x.device)
        log_v = torch.zeros(B, M, device=x.device)
        
        for _ in range(self.n_iter):
            # log_u ← log(1) - logsumexp(log_K + log_v)
            log_u = -torch.logsumexp(log_K + log_v.unsqueeze(1), dim=-1)
            # log_v ← log(1) - logsumexp(log_K + log_u.unsqueeze(2)
            log_v = -torch.logsumexp(log_K + log_u.unsqueeze(2), dim=-2)
        
        # Transport plan: T_ij = K_ij · u_i · v_j
        log_T = log_K + log_u.unsqueeze(2) + log_v.unsqueeze(1)
        T = torch.exp(log_T)
        
        # Wasserstein distance: W = ⟨T, C⟩
        W = (T * C).sum(dim=(-2, -1))  # (B,)
        
        if self.reduction == 'mean':
            return W.mean()
        return W


# ============================================================
# 2. Equivariant Diffusion Model (EDM) for 3D molecule generation
# ============================================================

class EDMDenoiser(nn.Module):
    """Equivariant Diffusion Model denoising network (Hoogeboom 2022).
    
    Predicts noise ε_θ(x_t, t, atom_types) where x_t ∈ R^{N×3}.
    
    Architecture:
        - Atom embedding (per element)
        - Time embedding (sinusoidal)
        - SE(3)-equivariant message passing (E(n)-equivariant, like ADR-036)
        - Noise prediction head (per-atom 3D vector)
    
    Production: trained on QM9 (130K molecules) or GEOM (5M conformers).
    """
    def __init__(self, n_atom_types: int = 20, hidden_dim: int = 128,
                 n_layers: int = 4, n_heads: int = 4,
                 n_diffusion_steps: int = 1000):
        super().__init__()
        self.n_diffusion_steps = n_diffusion_steps
        
        # Atom embedding
        self.atom_embed = nn.Embedding(n_atom_types, hidden_dim)
        
        # Time embedding (sinusoidal, like ADR-034 ESM-2)
        self.time_embed = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, hidden_dim),
        )
        
        # SE(3)-equivariant message passing layers
        # (simplified — production uses e3nn or similar)
        self.layers = nn.ModuleList([
            nn.TransformerEncoderLayer(
                d_model=hidden_dim, nhead=n_heads, batch_first=True,
                dim_feedforward=4*hidden_dim, activation='gelu',
                norm_first=True,
            ) for _ in range(n_layers)
        ])
        
        # Noise prediction head (per-atom 3D vector)
        self.noise_head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.SiLU(),
            nn.Linear(hidden_dim // 2, 3),
        )
        
        # Noise schedule (cosine)
        betas = torch.linspace(1e-4, 0.02, n_diffusion_steps)
        alphas = 1 - betas
        alpha_bars = torch.cumprod(alphas, dim=0)
        self.register_buffer('betas', betas)
        self.register_buffer('alphas', alphas)
        self.register_buffer('alpha_bars', alpha_bars)
    
    def forward(self, x_t: torch.Tensor, atom_types: torch.Tensor,
               t: int) -> torch.Tensor:
        """Predict noise ε_θ(x_t, t, atom_types).
        
        Args:
            x_t: (B, N, 3) noisy atom coordinates at step t
            atom_types: (B, N) atom type IDs
            t: int diffusion timestep
        
        Returns: (B, N, 3) predicted noise
        """
        B, N, _ = x_t.shape
        
        # Atom embedding
        h = self.atom_embed(atom_types)  # (B, N, hidden)
        
        # Time embedding
        t_emb = self._time_embedding(t, h.shape[-1], x_t.device)
        h = h + t_emb.unsqueeze(1)  # broadcast over atoms
        
        # Message passing (simplified — production uses E(n)-equivariant)
        for layer in self.layers:
            h = layer(h)
        
        # Predict noise (per-atom 3D vector)
        noise = self.noise_head(h)  # (B, N, 3)
        return noise
    
    def _time_embedding(self, t: int, dim: int, device: torch.device) -> torch.Tensor:
        """Sinusoidal time embedding."""
        half = dim // 2
        freqs = torch.exp(-math.log(10000) * torch.arange(half) / half).to(device)
        args = torch.tensor([t], dtype=torch.float, device=device) * freqs
        emb = torch.cat([torch.sin(args), torch.cos(args)], dim=-1)
        return emb
    
    @torch.no_grad()
    def sample(self, atom_types: torch.Tensor, n_steps: int = 50) -> torch.Tensor:
        """Reverse diffusion: generate 3D molecule from noise.
        
        Args:
            atom_types: (B, N) atom type IDs (conditioning)
            n_steps: number of denoising steps (DDIM-style)
        
        Returns: (B, N, 3) generated atom coordinates
        """
        B, N = atom_types.shape
        device = atom_types.device
        
        # Start from noise
        x = torch.randn(B, N, 3, device=device)
        
        # DDIM-style reverse diffusion
        timesteps = list(range(0, self.n_diffusion_steps, 
                               self.n_diffusion_steps // n_steps))
        timesteps = list(reversed(timesteps))
        
        for t in timesteps:
            # Predict noise
            eps = self.forward(x, atom_types, t)
            # DDIM update
            alpha_bar_t = self.alpha_bars[t]
            x0_pred = (x - torch.sqrt(1 - alpha_bar_t) * eps) / torch.sqrt(alpha_bar_t)
            if t > 0:
                alpha_bar_prev = self.alpha_bars[timesteps[-1] if t == timesteps[0] else timesteps[timesteps.index(t)+1]]
            else:
                alpha_bar_prev = torch.tensor(1.0, device=device)
            x = torch.sqrt(alpha_bar_prev) * x0_pred + torch.sqrt(1 - alpha_bar_prev) * eps
        
        return x


# ============================================================
# 3. GFlowNet — reward-matched molecular design
# ============================================================

class GFlowNet(nn.Module):
    """GFlowNet (Bengio 2023) for molecular design.
    
    Learns to sample from P(x) ∝ R(x) (reward distribution).
    
    Architecture:
        - Forward policy P_F(s_{t+1}|s_t): add atom/bond
        - Backward policy P_B(s_t|s_{t+1}): remove atom/bond
        - Trajectory balance: Z·Π P_F = R·Π P_B
    """
    def __init__(self, n_atom_types: int = 20, hidden_dim: int = 128):
        super().__init__()
        # Forward policy: (state, action) → probability
        self.forward_policy = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, n_atom_types + 1),  # +1 for terminate
        )
        # Backward policy
        self.backward_policy = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, n_atom_types),
        )
        # State encoder
        self.state_encoder = nn.Embedding(n_atom_types, hidden_dim)
        # Log partition function (learnable)
        self.log_Z = nn.Parameter(torch.zeros(1))
    
    def forward(self, states: torch.Tensor, 
                rewards: torch.Tensor = None) -> Dict[str, torch.Tensor]:
        """Compute forward/backward policies.
        
        Args:
            states: (B, L) state sequences (atom type IDs)
            rewards: (B,) reward values for terminal states
        
        Returns: dict with forward_logits, backward_logits, loss
        """
        B, L = states.shape
        h = self.state_encoder(states)  # (B, L, hidden)
        h_pooled = h.mean(dim=1)  # (B, hidden) — graph-level
        
        forward_logits = self.forward_policy(h_pooled)  # (B, n_actions)
        backward_logits = self.backward_policy(h_pooled)
        
        # Trajectory balance loss (if rewards provided)
        if rewards is not None:
            # log Z + Σ log P_F = log R + Σ log P_B
            # (simplified — production computes full trajectory)
            log_Z = self.log_Z
            log_R = torch.log(rewards + 1e-8)
            # Simple loss: match log_Z to log_R
            loss = F.mse_loss(log_Z, log_R.mean())
        else:
            loss = torch.tensor(0.0)
        
        return {
            'forward_logits': forward_logits,
            'backward_logits': backward_logits,
            'loss': loss,
        }
    
    @torch.no_grad()
    def sample(self, n_samples: int = 1, max_len: int = 20) -> torch.Tensor:
        """Sample molecules from forward policy.
        
        Returns: (n_samples, max_len) generated atom type sequences.
        """
        samples = []
        for _ in range(n_samples):
            state = torch.zeros(1, 1, dtype=torch.long)
            for step in range(max_len):
                h = self.state_encoder(state).mean(dim=1)
                logits = self.forward_policy(h)
                probs = F.softmax(logits, dim=-1)
                # Sample action
                action = torch.multinomial(probs, 1)
                if action.item() == self.forward_policy[-1].out_features - 1:
                    break  # terminate
                state = torch.cat([state, action.unsqueeze(0)], dim=1)
            samples.append(state)
        return torch.nn.utils.rnn.pad_sequence(samples, batch_first=True)


# Sanity check
if __name__ == "__main__":
    # Sinkhorn
    sinkhorn = SinkhornDistance(eps=0.1, n_iter=30)
    x = torch.randn(2, 5, 3)  # 2 batches, 5 atoms, 3D
    y = torch.randn(2, 5, 3)
    dist = sinkhorn(x, y)
    print(f"Sinkhorn distance: {dist.item():.4f}")
    
    # Same molecule (should be ~0)
    dist_self = sinkhorn(x, x)
    print(f"Self-distance: {dist_self.item():.4f}")
    
    # EDM
    edm = EDMDenoiser(n_atom_types=10, hidden_dim=32, n_layers=2, n_heads=4, n_diffusion_steps=100)
    n_params = sum(p.numel() for p in edm.parameters())
    print(f"\\nEDM denoiser: {n_params:,} params")
    x_t = torch.randn(2, 8, 3)  # 2 batches, 8 atoms, 3D
    atom_types = torch.randint(0, 10, (2, 8))
    noise = edm(x_t, atom_types, t=50)
    print(f"  Predicted noise: {tuple(noise.shape)}")
    
    # Sample
    samples = edm.sample(atom_types, n_steps=20)
    print(f"  Generated molecules: {tuple(samples.shape)}")
    
    # GFlowNet
    gfn = GFlowNet(n_atom_types=10, hidden_dim=32)
    n_params = sum(p.numel() for p in gfn.parameters())
    print(f"\\nGFlowNet: {n_params:,} params")
    states = torch.randint(0, 10, (4, 5))
    rewards = torch.rand(4) * 10  # random rewards
    out = gfn(states, rewards)
    print(f"  Forward logits: {tuple(out['forward_logits'].shape)}")
    print(f"  Loss: {out['loss'].item():.4f}")
    
    # Sample
    samples = gfn.sample(n_samples=3, max_len=10)
    print(f"  Sampled molecules: {samples.shape}")`;

export function GenerativeChemistry2Page() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Generative Chemistry 2.0 · EDM · DiffDock · GFlowNet · Sinkhorn · optimal transport"
        title="Generative Chemistry 2.0 — 3D Diffusion, Flow Networks, Optimal Transport"
        description="The next frontier of molecular design: 3D molecule generation via Equivariant Diffusion Models (EDM, Hoogeboom 2022 — DDPM on R^(N×3) with SE(3)-equivariance), diffusion-based protein-ligand docking (DiffDock, Corso 2023 — replaces AutoDock Vina, 20%+ improvement), generative flow networks (GFlowNet, Bengio 2023 — matches reward distribution for diverse candidates), and geometry-aware molecular similarity via Sinkhorn optimal transport (Cuturi 2013 — Wasserstein distance replaces Tanimoto for 3D). With 4 AI illustrations + looping Sinkhorn 'short'. Low-level PyTorch: SinkhornDistance, EDMDenoiser, GFlowNet."
        right={<><Badge variant="outline" className="gap-1.5"><FlaskConical className="h-3 w-3" /> EDM + DiffDock + GFlowNet</Badge><Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Pyodide</Badge></>}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />)}
      </div>

      <SectionCard title="AI-generated illustrations — click to expand" icon={<FlaskConical className="h-5 w-5" />} badge="AI gallery">
        <div className="grid md:grid-cols-2 gap-4">
          <div><ImageModal src="/images/genchem2/edm-diffusion.png" alt="EDM diffusion" caption="Equivariant Diffusion Model (EDM) — noise-to-structure denoising on 3D molecular graphs. Same DDPM math as ADR-027 (image diffusion) but on R^(N×3) atom coordinates with SE(3)-equivariance. Generates novel 3D molecules not in training set." /><p className="text-[11px] text-muted-foreground mt-2 text-center">EDM diffusion — 3D molecule generation</p></div>
          <div><ImageModal src="/images/genchem2/diffdock.png" alt="DiffDock" caption="DiffDock — diffusion-based protein-ligand docking. Replaces AutoDock Vina (ADR-036) with learned diffusion over SE(3) binding poses. Translation (R³) + rotation (SO(3)) + torsion (torus) diffusion. 20%+ improvement over Vina, 60× faster. Corso et al. 2023, ICLR." /><p className="text-[11px] text-muted-foreground mt-2 text-center">DiffDock — diffusion-based docking</p></div>
          <div><ImageModal src="/images/genchem2/gflownet.png" alt="GFlowNet" caption="GFlowNet — generative flow network for molecular design. Directed acyclic graph of molecule construction steps (add atom → add bond → terminate). Matches reward distribution (not maximise) for diverse candidates. Bengio et al. 2023. The RL alternative to VAE (ADR-046)." /><p className="text-[11px] text-muted-foreground mt-2 text-center">GFlowNet — reward-matched generation</p></div>
          <div><ImageModal src="/images/genchem2/optimal-transport.png" alt="Optimal transport" caption="Optimal transport — Wasserstein distance between two molecular electron density distributions. The transport plan (arrows) shows how to transform molecule A into molecule B with minimum 'work'. Geometry-aware: respects 3D shape, unlike Tanimoto (ADR-035) which is 2D-only." /><p className="text-[11px] text-muted-foreground mt-2 text-center">Optimal transport — geometry-aware similarity</p></div>
        </div>
      </SectionCard>

      <SectionCard title="Sinkhorn short — optimal transport molecular similarity (loop)" icon={<FlaskConical className="h-5 w-5" />} badge="short">
        <SinkhornShort />
      </SectionCard>

      <SectionCard title="EDM math — SE(3)-equivariant diffusion on 3D coordinates" description="EDM applies the DDPM framework (ADR-027) to molecular coordinates x ∈ R^(N×3). Forward: q(x_t|x_0) = N(√ᾱ_t·x_0, (1-ᾱ_t)·I) — same Gaussian noise injection. Reverse: p_θ(x_{t-1}|x_t) = N(μ_θ, σ_t·I) where θ is SE(3)-equivariant. The noise prediction ε_θ must be equivariant — rotating input rotates output. This IS the same inductive bias as ADR-036 (AlphaFold2 IPA) and ADR-044 (RFdiffusion)." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">q(x_t|x_0) = N(√ᾱ_t·x_0, (1-ᾱ_t)·I) &nbsp;·&nbsp; p_θ(x_{"{t-1}"}|x_t) = N(μ_θ, σ_t·I)</p>
            <p className="text-[11px] text-muted-foreground mt-1">Same DDPM as ADR-027 but on R^(N×3) atom coordinates. SE(3)-equivariance ensures rotation-correct sampling.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5"><p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">Same as image diffusion</p><p className="font-mono text-[11px]">ADR-027 but on coordinates</p><p className="text-muted-foreground text-[11px] mt-1">The DDPM math is invariant to modality — pixels, protein backbones, or molecular coordinates.</p></div>
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5"><p className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-1">SE(3)-equivariance</p><p className="font-mono text-[11px]">f(Rx) = Rf(x)</p><p className="text-muted-foreground text-[11px] mt-1">Same constraint as ADR-036 AlphaFold2 and ADR-044 RFdiffusion. Rotational symmetry is inductive bias.</p></div>
            <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-2.5"><p className="font-semibold text-sm text-violet-600 dark:text-violet-400 mb-1">Atom types</p><p className="font-mono text-[11px]">conditioning on Z^N</p><p className="text-muted-foreground text-[11px] mt-1">Atom type IDs (C, N, O, S) are conditioning — the model generates positions given the molecular graph.</p></div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Sinkhorn optimal transport — geometry-aware molecular similarity" description="The Wasserstein distance W_p(μ,ν) between two molecular distributions IS the minimum 'work' to transform one into the other. Entropic regularisation (Cuturi 2013) makes it tractable: W_ε = min_T ⟨T,C⟩ + ε·H(T). Sinkhorn iteration: T_ij = K_ij·u_i·v_j (alternating scaling), converges in O(n²) per iteration. This gives a geometry-aware metric that respects 3D shape — fundamentally more informative than Tanimoto on 2D fingerprints." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">W_ε(μ,ν) = min_T ⟨T, C⟩ + ε·H(T) &nbsp;·&nbsp; T_ij = K_ij·u_i·v_j</p>
            <p className="text-[11px] text-muted-foreground mt-1">C_ij = |x_i - y_j|² (cost), K_ij = exp(-C/ε) (kernel), H(T) = entropy. Sinkhorn: alternate u, v scaling until convergence.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5"><p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">Geometry-aware</p><p className="text-muted-foreground text-[11px] mt-1">Respects 3D molecular shape. Tanimoto (ADR-035) ignores geometry — two molecules with same graph but different 3D shape have Tanimoto=1 but W&gt;0.</p></div>
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5"><p className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-1">Sinkhorn iteration</p><p className="font-mono text-[11px]">T_ij = K_ij · u_i · v_j</p><p className="text-muted-foreground text-[11px] mt-1">Alternating matrix balancing. Same algorithm as attention normalisation in transformers — Sinkhorn IS softmax without normalisation.</p></div>
            <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-2.5"><p className="font-semibold text-sm text-violet-600 dark:text-violet-400 mb-1">Hybrid pipeline</p><p className="text-muted-foreground text-[11px] mt-1">Tanimoto for fast pre-filter (HNSW, ms), Sinkhorn for top-100 re-rank (100ms). Best of both worlds for 100M compound libraries.</p></div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="GFlowNet — reward-matched generation (not maximisation)" description="GFlowNet (Bengio 2023) frames molecular design as a sequential MDP where each step adds an atom/bond. The objective is to match the reward distribution P(x) ∝ R(x) — not to maximise R(x). This produces diverse candidates matching the reward, unlike RL's mode collapse. The trajectory balance loss: L = (log Z · Π P_F - R · Π P_B)². The flow network learns forward policy P_F (generation) and backward policy P_B (inference)." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">L = (log Z · Π_t P_F(s_{"{t+1}"}|s_t) - R(x) · Π_t P_B(s_t|s_{"{t+1}"}))²</p>
            <p className="text-[11px] text-muted-foreground mt-1">Trajectory balance loss. Z = partition function. P_F = forward (generation), P_B = backward (inference). At equilibrium: Z · Π P_F = R · Π P_B.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5"><p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">RL (ADR-019 bandit)</p><p className="font-mono text-[11px]">maximise E[R(x)]</p><p className="text-muted-foreground text-[11px] mt-1">Mode collapse — all samples cluster near optimum. Good for exploitation, bad for diversity.</p></div>
            <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-2.5"><p className="font-semibold text-sm text-violet-600 dark:text-violet-400 mb-1">GFlowNet</p><p className="font-mono text-[11px]">match P(x) ∝ R(x)</p><p className="text-muted-foreground text-[11px] mt-1">Diverse samples matching reward distribution. Good for drug discovery — need diverse candidates, not just the best one.</p></div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Try it: Sinkhorn + EDM + DiffDock + GFlowNet (Pyodide)" icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={GC2_DEMO} buttonLabel="Run generative chemistry 2.0 (Pyodide)" />
      </SectionCard>

      <SectionCard title="Modern papers — EDM, DiffDock, GFlowNet, Sinkhorn" icon={<FlaskConical className="h-5 w-5" />}>
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">EDM (Hoogeboom et al. 2022, ICML W):</strong> Equivariant Diffusion Model for 3D molecule generation. DDPM on R^(N×3) with SE(3)-equivariance. Same math as ADR-027 (image) and ADR-044 (RFdiffusion). Generates novel 3D molecules exploring 10^60 chemical space. Trained on QM9 (130K) or GEOM (5M conformers).</p>
          <p><strong className="text-foreground/80">DiffDock (Corso et al. 2023, ICLR):</strong> Diffusion-based protein-ligand docking. Replaces AutoDock Vina (ADR-036). Diffusion on SE(3) manifold: translation (R³) + rotation (SO(3)) + torsion (torus). 20%+ improvement over Vina, 60× faster. The standard for AI-based docking.</p>
          <p><strong className="text-foreground/80">GFlowNet (Bengio et al. 2023, JMLR):</strong> Generative flow networks that match the reward distribution. Frames molecular design as sequential MDP. Trajectory balance loss. Produces diverse candidates (vs RL's mode collapse). The RL alternative to VAE (ADR-046 Insilico).</p>
          <p><strong className="text-foreground/80">Sinkhorn (Cuturi 2013, NeurIPS):</strong> Sinkhorn distances — entropic optimal transport for fast Wasserstein computation. O(n²) per iteration. The same algorithm as attention normalisation in transformers. Applied to molecular similarity: 3D-aware metric replacing Tanimoto (ADR-035) for shape-sensitive applications.</p>
        </div>
      </SectionCard>

      <SectionCard title="Low-level PyTorch — SinkhornDistance, EDMDenoiser, GFlowNet" icon={<Cpu className="h-5 w-5" />} badge="low-level">
        <CodeBlock language="python" filename="genchem2.py" code={PYTORCH_CODE} />
      </SectionCard>

      <SectionCard title="My deeper thought: diffusion IS the universal generative primitive" icon={<TrendingUp className="h-5 w-5" />} badge="Insight">
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">The same DDPM equation powers image generation, protein design, and molecule generation.</strong> ADR-027 (image diffusion): q(x_t|x_0) = N(√ᾱ_t·x_0, (1-ᾱ_t)·I) on R^(H×W×C). ADR-044 (RFdiffusion): same equation on R^(N_protein×3). ADR-051 (EDM): same equation on R^(N_atoms×3). The modality changes (pixels vs protein backbone vs molecular coordinates) but the mathematical skeleton is identical. The diffusion process IS the universal generative primitive — it works on any differentiable manifold where you can define a Gaussian noise process. The SE(3)-equivariance constraint (same for RFdiffusion, EDM, AlphaFold2, Boltz-1) is the specific inductive bias for 3D spatial data. The platform now has 5 instances of the same diffusion equation: images (ADR-027), proteins (ADR-044 RFdiffusion), molecules (ADR-051 EDM), protein complexes (ADR-045 Boltz-1), and molecular dynamics (ADR-050 Neural ODEs — continuous diffusion). Five modalities, one equation. The unification is mathematical, not metaphorical.</p>
          <p><strong className="text-foreground/80">Sinkhorn IS attention normalisation.</strong> The Sinkhorn iteration T_ij = K_ij · u_i · v_j (alternating matrix balancing) IS the same operation as softmax normalisation in attention. In attention, we compute softmax(QK^T/√d) — which IS one step of Sinkhorn with uniform marginals. The Sinkhorn algorithm IS iterated softmax with marginal constraints. This means: molecular similarity via Sinkhorn IS the same mathematical operation as the attention mechanism in transformers. The connection: attention computes a "soft matching" between query and key positions — Sinkhorn computes a "soft matching" between source and target atoms. Both are optimal transport problems, regularised differently (entropy for Sinkhorn, softmax for attention). The platform's pgvector (ADR-022) uses HNSW for fast retrieval — Sinkhorn adds a geometry-aware re-ranking layer on top.</p>
          <p><strong className="text-foreground/80">GFlowNet IS the Bayesian alternative to maximum likelihood.</strong> VAE (ADR-046 Insilico) maximises likelihood: learn P(x|z) to reconstruct data. GFlowNet matches the reward distribution: learn P_F to sample from P(x) ∝ R(x). The difference: VAE is likelihood-based (needs data), GFlowNet is reward-based (needs a scoring function). For drug discovery, the scoring function (binding affinity, ADMET) is more informative than the data distribution (what molecules exist). GFlowNet explores the reward landscape, VAE explores the data landscape. The connection to ADR-019 (bandit): the bandit samples from a Beta posterior (1-step), GFlowNet samples from a trajectory posterior (multi-step). Both match a distribution, not maximise. The platform's drug discovery stack now has three generative paradigms: VAE (ADR-046, 1D SMILES), EDM (ADR-051, 3D coordinates), GFlowNet (ADR-051, graph-structured). Three modalities, three generative approaches, all feeding into the same pgvector (ADR-022) for downstream RAG (ADR-032) and LLM summary (ADR-031). The platform IS a multi-paradigm generative engine for molecular design.</p>
        </div>
      </SectionCard>

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("cheminformatics")} className="text-sm text-primary hover:underline">→ Cheminformatics (ECFP + Tanimoto — the 2D baseline)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("ai-drug-discovery")} className="text-sm text-primary hover:underline">→ AI Drug Discovery (Insilico VAE — the 1D predecessor)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("diffusion-models")} className="text-sm text-primary hover:underline">→ Diffusion Models (same DDPM math)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("alphaproteo")} className="text-sm text-primary hover:underline">→ AlphaProteo (RFdiffusion — same DDPM on proteins)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">→ ADR-051 (EDM + DiffDock + GFlowNet)</Link>
      </div>
    </div>
  );
}
