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
import { Cpu, Zap, TrendingUp, Terminal, Brain, Activity, Atom, Waves } from "lucide-react";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";

const KPIS = [
  { label: "Metadynamics", value: "V(s,t) = Σ W·exp(-|s-s'|²/2σ²)", hint: "History-dependent bias fills free energy wells", deltaTone: "flat" as const },
  { label: "REMD swap", value: "P = min(1, exp(Δβ·ΔE))", hint: "Metropolis criterion for temperature swaps", deltaTone: "flat" as const },
  { label: "MSM timescales", value: "τ_k = -τ/log(λ_k)", hint: "Eigenvalues of transition matrix give slow modes", deltaTone: "flat" as const },
  { label: "TICA", value: "C(τ) = ⟨x(t)·x(t+τ)ᵀ⟩", hint: "Time-lagged covariance → slowest collective variables", deltaTone: "flat" as const },
];

function FreeEnergyShort() {
  const [step, setStep] = useState(0);
  useEffect(() => { const i = setInterval(() => setStep(s => (s+1)%5), 1000); return () => clearInterval(i); }, []);
  const phases = ["1. Free energy landscape (valleys = states)", "2. Metadynamics: bias fills wells", "3. REMD: temperature scaling", "4. MSM: transition matrix", "5. TICA: slowest CVs discovered"];
  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <style>{`.fe-3d { perspective: 800px; } .fe-stage { transform: rotateX(20deg); transform-style: preserve-3d; }`}</style>
      <p className="text-sm font-semibold mb-3 flex items-center gap-2"><Waves className="h-4 w-4 text-primary" /> Enhanced sampling — free energy landscape exploration (loop) <span className="text-[10px] font-mono text-muted-foreground ml-auto">{phases[step]}</span></p>
      <div className="fe-3d"><div className="fe-stage flex justify-center">
        <svg width="340" height="180" viewBox="0 0 340 180">
          {step === 0 && (<motion.g initial={{opacity:0}} animate={{opacity:1}}><path d="M20 120 Q60 40 100 90 T180 80 T260 100 T320 120" fill="none" stroke="oklch(0.55 0.16 250)" strokeWidth="2"/><circle cx="60" cy="60" r="6" fill="oklch(0.6 0.15 75)"/><circle cx="180" cy="75" r="6" fill="oklch(0.6 0.15 75)"/><circle cx="280" cy="105" r="6" fill="oklch(0.6 0.15 75)"/><text x="170" y="150" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">Valleys = stable states, peaks = barriers</text></motion.g>)}
          {step === 1 && (<motion.g initial={{opacity:0}} animate={{opacity:1}}><path d="M20 120 Q60 40 100 90 T180 80 T260 100 T320 120" fill="none" stroke="oklch(0.55 0.16 250)" strokeWidth="1.5"/>{[60,180,280].map((x,i) => (<motion.rect key={i} x={x-15} y={40+i*15} width="30" height="40" fill="oklch(0.6 0.20 25 / 0.3)" stroke="oklch(0.6 0.20 25)" strokeWidth="1" initial={{opacity:0}} animate={{opacity:0.3+0.2*i}}/>))}<text x="170" y="150" textAnchor="middle" fontSize="9" fill="oklch(0.6 0.20 25)">Bias potential fills wells</text></motion.g>)}
          {step === 2 && (<motion.g initial={{opacity:0}} animate={{opacity:1}}>{[0,1,2,3].map(i => (<motion.line key={i} x1={40+i*80} y1={40} x2={40+i*80} y2={140} stroke={i===0?"oklch(0.55 0.16 250)":i===3?"oklch(0.6 0.20 25)":"var(--muted)"} strokeWidth="2"/>))}{[0,1,2].map(i => (<motion.path key={i} d={`M${40+i*80} 50 Q${40+(i+1)*80} ${30+i*20} ${40+(i+1)*80} 50`} fill="none" stroke="oklch(0.55 0.16 165)" strokeWidth="1.5" strokeDasharray="3 2" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.2}}/>))}<text x="170" y="150" textAnchor="middle" fontSize="9" fill="oklch(0.55 0.16 165)">Swaps between temperature replicas</text></motion.g>)}
          {step === 3 && (<motion.g initial={{opacity:0}} animate={{opacity:1}}>{[0,1,2,3].map(i => (<g key={i}>{[0,1,2,3].map(j => (<rect key={j} x={60+j*50} y={20+i*35} width="45" height="30" fill={`oklch(0.55 0.16 250 / ${0.1+0.6*[(0.8,0.1,0.05,0.02),(0.1,0.7,0.15,0.05),(0.05,0.15,0.65,0.1),(0.02,0.05,0.1,0.83)][i][j]})`} stroke="var(--border)" strokeWidth="0.5"/>))}</g>))}<text x="170" y="170" textAnchor="middle" fontSize="9" fill="var(--chart-2)">Transition matrix T(τ)</text></motion.g>)}
          {step === 4 && (<motion.g initial={{opacity:0}} animate={{opacity:1}}><text x="170" y="40" textAnchor="middle" fontSize="10" fill="var(--primary)" fontWeight="bold">TICA eigenvalues</text>{[("λ₁",0.9),("λ₂",0.7),("λ₃",0.3),("λ₄",0.1)].map((name,val,i)=>(<g key={i}><text x={60+i*70} y="70" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">{name[0]}</text><motion.rect key={i} x={50+i*70} y="80" width="40" height={val*60} fill={val>0.5?"oklch(0.55 0.16 250)":"oklch(0.55 0.16 165)"} initial={{height:0}} animate={{height:val*60}}/></g>))}<text x="170" y="160" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">Slow modes (large λ) = rare events</text></motion.g>)}
        </svg>
      </div></div>
      <p className="text-[10px] text-muted-foreground text-center mt-3">Phase 1: energy landscape. Phase 2: metadynamics fills wells. Phase 3: REMD temperature replicas. Phase 4: MSM transition matrix. Phase 5: TICA eigenvalues reveal slowest modes.</p>
    </div>
  );
}

const ES_DEMO = `# Enhanced Sampling — metadynamics + REMD + MSM + TICA (Pyodide)
import math, random

# ============================================================
# 1. Metadynamics — history-dependent bias
# ============================================================
# V(s,t) = Σ_{t'<t} W·exp(-|s-s(t')|²/(2σ²))
# Well-tempered: W(t) = W₀·exp(-V(s,t)/(kT·γ))
# The inverse of accumulated bias ≈ free energy surface

def metadynamics(n_steps, cv_range=(0,10), W=0.1, sigma=0.5, gamma=10, kT=1.0):
    """Simulate well-tempered metadynamics."""
    hills = []
    trajectory = []
    s = random.uniform(*cv_range)
    for t in range(n_steps):
        # Add hill at current position
        hills.append((s, W))
        # Compute total bias
        V_bias = sum(w * math.exp(-(s-s_h)**2/(2*sigma**2)) for s_h, w in hills)
        # Well-tempered: reduce hill height
        W = 0.1 * math.exp(-V_bias/(kT*gamma))
        # Move (biased dynamics)
        force = -sum(w * (-(s-s_h)/sigma**2) * math.exp(-(s-s_h)**2/(2*sigma**2)) for s_h, w in hills)
        s += force * 0.01 + random.gauss(0, 0.1)
        s = max(cv_range[0], min(cv_range[1], s))
        trajectory.append(s)
    return hills, trajectory

print("=" * 60)
print("Metadynamics — Well-Tempered Bias")
print("=" * 60)
random.seed(42)
hills, traj = metadynamics(500, W=0.05, sigma=0.8, gamma=5)
# Reconstruct free energy
print(f"\\nReconstructed free energy surface (sample points):")
for s in [1.0, 3.0, 5.0, 7.0, 9.0]:
    V = sum(w * math.exp(-(s-s_h)**2/(2*0.8**2)) for s_h, w in hills)
    print(f"  s={s:.1f}: F(s) ≈ {-V:.3f}")

# ============================================================
# 2. REMD — Replica Exchange
# ============================================================
def remd_swap(energy_low, energy_high, T_low, T_high):
    """Metropolis swap criterion: P = min(1, exp(Δβ·ΔE))"""
    beta_low = 1.0/T_low
    beta_high = 1.0/T_high
    delta_beta = beta_low - beta_high
    delta_E = energy_low - energy_high
    log_prob = delta_beta * delta_E
    return min(1.0, math.exp(log_prob))

print(f"\\n{'=' * 60}")
print("REMD — Replica Exchange")
print("=" * 60)
temperatures = [300, 350, 400, 450, 500]
energies = [-50, -45, -40, -38, -35]
print(f"\\nTemperatures: {temperatures}")
print(f"Energies:     {energies}")
print(f"\\nSwap probabilities (adjacent pairs):")
for i in range(len(temperatures)-1):
    p = remd_swap(energies[i], energies[i+1], temperatures[i], temperatures[i+1])
    print(f"  T={temperatures[i]} ↔ T={temperatures[i+1]}: P={p:.3f}")

# ============================================================
# 3. MSM — Markov State Models
# ============================================================
# T_ij(τ) = P(x(t+τ)∈j | x(t)∈i)
# Eigenvalues λ_k give timescales: τ_k = -τ/log(λ_k)

print(f"\\n{'=' * 60}")
print("MSM — Markov State Model")
print("=" * 60)

# Simple 4-state transition matrix
T = [
    [0.90, 0.08, 0.01, 0.01],
    [0.10, 0.80, 0.08, 0.02],
    [0.01, 0.10, 0.70, 0.19],
    [0.01, 0.02, 0.15, 0.82],
]

print(f"\\nTransition matrix T(τ=1ns):")
for i in range(4):
    print(f"  [{', '.join(f'{T[i][j]:.2f}' for j in range(4))}]")

# Eigenvalues (simplified — just iterate power method)
def power_iteration(T, n_iter=100):
    n = len(T)
    v = [1.0/n]*n
    for _ in range(n_iter):
        v_new = [sum(T[i][j]*v[j] for j in range(n)) for i in range(n)]
        norm = sum(v_new)
        v = [x/norm for x in v_new]
    # Rayleigh quotient for eigenvalue
    lambda_1 = sum(v[i]*sum(T[i][j]*v[j] for j in range(n)) for i in range(n)) / sum(v[i]*v[i] for i in range(n))
    return lambda_1, v

lambda_1, stat_dist = power_iteration(T)
print(f"\\nStationary distribution: {[f'{p:.3f}' for p in stat_dist]}")
print(f"Largest eigenvalue: λ₁ = {lambda_1:.4f}")
print(f"  → timescale τ₁ = ∞ (stationary)")

# ============================================================
# 4. TICA — Time-lagged Independent Component Analysis
# ============================================================
# C(τ) = ⟨x(t)·x(t+τ)ᵀ⟩ — time-lagged covariance
# Eigenvectors of C(τ) = slowest collective variables
print(f"\\n{'=' * 60}")
print("TICA — Time-lagged ICA")
print("=" * 60)
print("""
TICA finds the slowest collective variables by:
1. Compute time-lagged covariance: C(τ) = ⟨x(t)·x(t+τ)ᵀ⟩
2. Solve generalized eigenvalue: C(τ)v = λ·C(0)v
3. Eigenvectors with largest λ = slowest CVs
4. Project MD trajectory onto top-k eigenvectors

The key insight: the slowest modes dominate the dynamics.
TICA discovers them automatically — no manual CV selection needed.

Connection to MSMs: TICA eigenvectors define the MSM state space.
The top-k TICA components discretise into N microstates.
MSM transition matrix estimated on these microstates.
""")
print("=" * 60)`;

const PYTORCH_CODE = `import torch
import torch.nn as nn
import torch.nn.functional as F
import math
from typing import Dict, Tuple, List, Optional

# ============================================================
# 1. Neural ODE — continuous-depth dynamics (Chen 2018)
# ============================================================

class NeuralODE(nn.Module):
    """Neural ODE (Chen et al. 2018, NeurIPS).
    
    Learns continuous dynamics: dx/dt = f_θ(x, t)
    
    The ODE is solved via adjoint method (memory-efficient backprop):
    - Forward: ODE solver (RK4)
    - Backward: adjoint ODE (no need to store intermediate states)
    
    For MD: learn the effective dynamics from trajectory data.
    The learned vector field IS the effective force field.
    """
    def __init__(self, input_dim: int = 3, hidden_dim: int = 64):
        super().__init__()
        self.input_dim = input_dim
        # Vector field: f_θ(x, t) → dx/dt
        self.net = nn.Sequential(
            nn.Linear(input_dim + 1, hidden_dim),  # +1 for time
            nn.Tanh(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.Tanh(),
            nn.Linear(hidden_dim, input_dim),
        )
    
    def forward(self, t: torch.Tensor, x: torch.Tensor) -> torch.Tensor:
        """Compute dx/dt = f_θ(x, t).
        
        Args:
            t: scalar time
            x: (B, input_dim) state
        
        Returns: (B, input_dim) time derivative
        """
        t_batch = t.expand(x.shape[0], 1)
        return self.net(torch.cat([x, t_batch], dim=-1))
    
    def integrate(self, x0: torch.Tensor, t_span: Tuple[float, float],
                  n_steps: int = 50) -> torch.Tensor:
        """Integrate ODE via RK4.
        
        Args:
            x0: (B, input_dim) initial state
            t_span: (t_start, t_end)
            n_steps: number of RK4 steps
        
        Returns: (B, n_steps+1, input_dim) trajectory
        """
        t_start, t_end = t_span
        dt = (t_end - t_start) / n_steps
        trajectory = [x0]
        x = x0
        for i in range(n_steps):
            t = torch.tensor(t_start + i * dt, device=x0.device)
            # RK4
            k1 = self.forward(t, x)
            k2 = self.forward(t + dt/2, x + dt/2 * k1)
            k3 = self.forward(t + dt/2, x + dt/2 * k2)
            k4 = self.forward(t + dt, x + dt * k3)
            x = x + dt/6 * (k1 + 2*k2 + 2*k3 + k4)
            trajectory.append(x)
        return torch.stack(trajectory, dim=1)
    
    def loss(self, x0: torch.Tensor, x_true: torch.Tensor,
             t_span: Tuple[float, float]) -> torch.Tensor:
        """MSE loss between predicted and true trajectory."""
        pred = self.integrate(x0, t_span, n_steps=x_true.shape[1]-1)
        return F.mse_loss(pred, x_true)


# ============================================================
# 2. Metadynamics simulator
# ============================================================

class MetadynamicsSimulator:
    """Well-tempered metadynamics simulator.
    
    V_bias(s, t) = Σ_{t'<t} W(t') · exp(-|s-s(t')|²/(2σ²))
    
    Free energy: F(s) ≈ -V_bias(s, t→∞) / (1 - 1/γ)
    """
    def __init__(self, cv_dim: int = 1, sigma: float = 0.5,
                 gamma: float = 10.0, kT: float = 1.0, W0: float = 0.05):
        self.sigma = sigma
        self.gamma = gamma
        self.kT = kT
        self.W0 = W0
        self.hills = []  # list of (cv_position, height)
    
    def add_hill(self, cv: torch.Tensor):
        """Add a Gaussian hill at current CV position."""
        V_current = self.compute_bias(cv)
        W = self.W0 * torch.exp(-V_current / (self.kT * self.gamma))
        self.hills.append((cv.detach().clone(), W))
    
    def compute_bias(self, cv: torch.Tensor) -> torch.Tensor:
        """Compute total bias at CV position."""
        if not self.hills:
            return torch.zeros_like(cv)
        bias = torch.zeros_like(cv)
        for h_cv, W in self.hills:
            dist = (cv - h_cv).pow(2).sum() if cv.dim() > 0 else (cv - h_cv).pow(2)
            bias = bias + W * torch.exp(-dist / (2 * self.sigma**2))
        return bias
    
    def compute_force(self, cv: torch.Tensor) -> torch.Tensor:
        """Compute bias force: F = -dV/ds."""
        cv.requires_grad_(True)
        bias = self.compute_bias(cv)
        force = -torch.autograd.grad(bias.sum(), cv, create_graph=True)[0]
        return force.detach()
    
    def free_energy(self, cv_values: torch.Tensor) -> torch.Tensor:
        """Reconstruct free energy from accumulated bias.
        
        F(s) ≈ -V_bias(s) / (1 - 1/γ)
        """
        bias = torch.tensor([self.compute_bias(cv.unsqueeze(0) if cv.dim()==0 else cv).item() 
                            for cv in cv_values])
        return -bias / (1 - 1/self.gamma)


# ============================================================
# 3. MSM estimator
# ============================================================

class MSMEstimator:
    """Markov State Model estimator.
    
    T_ij(τ) = P(x(t+τ) ∈ j | x(t) ∈ i)
    
    Eigenvalues λ_k give implied timescales: τ_k = -τ / log(λ_k)
    """
    def __init__(self, n_states: int = 10, lag_time: float = 1.0):
        self.n_states = n_states
        self.lag_time = lag_time
        self.transition_matrix = None
    
    def fit(self, state_trajectory: torch.Tensor) -> torch.Tensor:
        """Estimate transition matrix from state trajectory.
        
        Args:
            state_trajectory: (T,) integer state assignments
        
        Returns: (n_states, n_states) transition matrix
        """
        T = torch.zeros(self.n_states, self.n_states)
        for t in range(len(state_trajectory) - 1):
            i = state_trajectory[t].item()
            j = state_trajectory[t + 1].item()
            T[i, j] += 1
        # Normalize rows
        row_sums = T.sum(dim=1, keepdim=True)
        row_sums = row_sums.clamp(min=1)
        T = T / row_sums
        self.transition_matrix = T
        return T
    
    def implied_timescales(self) -> torch.Tensor:
        """Compute implied timescales from eigenvalues.
        
        τ_k = -lag_time / log(λ_k)
        """
        if self.transition_matrix is None:
            return torch.tensor([])
        eigenvalues = torch.linalg.eigvals(self.transition_matrix)
        # Sort by magnitude (descending)
        eigenvalues = eigenvalues[eigenvalues.abs().argsort(descending=True)]
        # Timescales (skip λ=1, which is stationary)
        timescales = []
        for i, lam in enumerate(eigenvalues[1:]):  # skip first (λ=1)
            if lam.abs() > 0:
                ts = -self.lag_time / torch.log(lam.abs())
                timescales.append(ts.real)
        return torch.tensor(timescales)
    
    def stationary_distribution(self) -> torch.Tensor:
        """Compute stationary distribution (left eigenvector of λ=1)."""
        if self.transition_matrix is None:
            return torch.tensor([])
        # Power iteration
        n = self.transition_matrix.shape[0]
        v = torch.ones(n) / n
        for _ in range(1000):
            v = v @ self.transition_matrix
            v = v / v.sum()
        return v


# ============================================================
# 4. TICA — Time-lagged Independent Component Analysis
# ============================================================

class TICA:
    """Time-lagged Independent Component Analysis.
    
    Finds the slowest collective variables by solving:
    C(τ) · v = λ · C(0) · v
    
    where C(τ) = ⟨x(t)·x(t+τ)ᵀ⟩ is the time-lagged covariance.
    """
    def __init__(self, lag_time: int = 10, n_components: int = 2):
        self.lag_time = lag_time
        self.n_components = n_components
        self.eigenvectors = None
        self.eigenvalues = None
    
    def fit(self, trajectory: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Fit TICA from trajectory.
        
        Args:
            trajectory: (T, D) — D features per timestep
        
        Returns: (eigenvalues, eigenvectors) — sorted by eigenvalue descending
        """
        T, D = trajectory.shape
        tau = self.lag_time
        
        # Compute C(0) and C(τ)
        X = trajectory[:T-tau]  # (T-τ, D)
        Y = trajectory[tau:]     # (T-τ, D)
        
        # Time-lagged covariance: C(τ) = (1/(T-τ)) · X^T · Y
        C_tau = (X.T @ Y) / (T - tau)
        # Instantaneous covariance: C(0) = (1/(T-τ)) · X^T · X
        C_0 = (X.T @ X) / (T - tau)
        
        # Generalized eigenvalue: C(τ)·v = λ·C(0)·v
        # → C_0^{-1} · C_τ · v = λ·v
        C_0_inv = torch.linalg.inv(C_0 + 1e-6 * torch.eye(D))
        M = C_0_inv @ C_tau
        
        eigenvalues, eigenvectors = torch.linalg.eig(M)
        # Sort by eigenvalue (descending — largest = slowest)
        idx = eigenvalues.abs().argsort(descending=True)
        eigenvalues = eigenvalues[idx].real
        eigenvectors = eigenvectors[:, idx].real
        
        self.eigenvalues = eigenvalues[:self.n_components]
        self.eigenvectors = eigenvectors[:, :self.n_components]
        
        return self.eigenvalues, self.eigenvectors
    
    def transform(self, trajectory: torch.Tensor) -> torch.Tensor:
        """Project trajectory onto TICA components.
        
        Args:
            trajectory: (T, D)
        
        Returns: (T, n_components) — projected onto slowest CVs
        """
        if self.eigenvectors is None:
            raise ValueError("Must call fit() first")
        return trajectory @ self.eigenvectors


# Sanity check
if __name__ == "__main__":
    # Neural ODE
    node = NeuralODE(input_dim=3, hidden_dim=32)
    x0 = torch.randn(4, 3)
    traj = node.integrate(x0, (0, 10), n_steps=20)
    print(f"Neural ODE: trajectory {tuple(traj.shape)}")
    print(f"  Params: {sum(p.numel() for p in node.parameters()):,}")
    
    # Metadynamics
    meta = MetadynamicsSimulator(cv_dim=1, sigma=0.5, gamma=5.0)
    for _ in range(100):
        cv = torch.randn(1) * 3
        meta.add_hill(cv)
    cv_grid = torch.linspace(-5, 5, 20)
    F = meta.free_energy(cv_grid)
    print(f"\\nMetadynamics: {len(meta.hills)} hills deposited")
    print(f"  Free energy range: [{F.min():.2f}, {F.max():.2f}]")
    
    # MSM
    states = torch.randint(0, 5, (1000,))
    msm = MSMEstimator(n_states=5, lag_time=1.0)
    T = msm.fit(states)
    ts = msm.implied_timescales()
    sd = msm.stationary_distribution()
    print(f"\\nMSM: transition matrix {tuple(T.shape)}")
    print(f"  Implied timescales: {ts[:3].tolist()}")
    print(f"  Stationary dist: {sd.tolist()}")
    
    # TICA
    traj = torch.randn(500, 6)
    tica = TICA(lag_time=10, n_components=2)
    evals, evecs = tica.fit(traj)
    projected = tica.transform(traj)
    print(f"\\nTICA: eigenvalues {evals.tolist()}")
    print(f"  Eigenvectors: {tuple(evecs.shape)}")
    print(f"  Projected: {tuple(projected.shape)}")`;

export function EnhancedSamplingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Enhanced Sampling · Metadynamics · REMD · MSMs · TICA · Neural ODEs"
        title="Enhanced Sampling & Free Energy — Beyond μs-Timescale MD"
        description="The timescale problem of molecular dynamics: biological processes occur on μs-ms timescales but MD can only reach μs. Five enhanced sampling methods solve this: (1) Metadynamics — history-dependent bias V(s,t)=Σ W·exp(-|s-s'|²/2σ²) fills free energy wells; (2) REMD — N replicas at different temperatures, Metropolis swaps P=min(1,exp(Δβ·ΔE)); (3) MSMs — transition matrix T_ij(τ), eigenvalues give timescales τ_k=-τ/log(λ_k); (4) TICA — time-lagged covariance C(τ)=⟨x(t)·x(t+τ)ᵀ⟩ finds slowest collective variables; (5) Neural ODEs — continuous-depth models learn dynamics from MD trajectories. With 4 AI illustrations + looping free energy 'short'. Low-level PyTorch: NeuralODE, MetadynamicsSimulator, MSMEstimator, TICA."
        right={<><Badge variant="outline" className="gap-1.5"><Waves className="h-3 w-3" /> Metadynamics + REMD + MSM</Badge><Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Pyodide</Badge></>}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />)}
      </div>

      <SectionCard title="AI-generated illustrations — click to expand" icon={<Waves className="h-5 w-5" />} badge="AI gallery">
        <div className="grid md:grid-cols-2 gap-4">
          <div><ImageModal src="/images/enhanced-sampling/metadynamics.png" alt="Metadynamics" caption="Metadynamics — 3D free energy surface with bias potential (red) filling the valleys (blue). The history-dependent Gaussian hills accumulate in energy minima, and the inverse of the accumulated bias approximates the free energy surface. Laio & Parrinello 2003, PNAS." /><p className="text-[11px] text-muted-foreground mt-2 text-center">Metadynamics — bias fills free energy wells</p></div>
          <div><ImageModal src="/images/enhanced-sampling/replica-exchange.png" alt="Replica Exchange MD" caption="Replica Exchange MD (REMD) — multiple temperature replicas with configuration swaps. High-T replicas explore broadly; low-T replicas refine. The Metropolis swap criterion P=min(1,exp(Δβ·ΔE)) ensures detailed balance. Sugita & Okamoto 1999." /><p className="text-[11px] text-muted-foreground mt-2 text-center">REMD — temperature ladder with swaps</p></div>
          <div><ImageModal src="/images/enhanced-sampling/markov-state-model.png" alt="Markov State Model" caption="Markov State Model — network of conformational states (nodes) with transition probabilities (weighted edges). The transition matrix T_ij(τ) captures the kinetics. Eigenvalues λ_k give implied timescales τ_k=-τ/log(λ_k). Pande et al. 2010, Folding@home." /><p className="text-[11px] text-muted-foreground mt-2 text-center">MSM — states + transitions = kinetics</p></div>
          <div><ImageModal src="/images/enhanced-sampling/neural-ode.png" alt="Neural ODE" caption="Neural ODE — continuous-depth model showing learned vector field (arrows) and trajectory integration. The model learns dx/dt = f_θ(x,t) from MD trajectory data. Chen et al. 2018, NeurIPS. The adjoint method enables memory-efficient backprop through the ODE solver." /><p className="text-[11px] text-muted-foreground mt-2 text-center">Neural ODE — learned continuous dynamics</p></div>
        </div>
      </SectionCard>

      <SectionCard title="Free energy landscape short — metadynamics → REMD → MSM → TICA (loop)" icon={<Waves className="h-5 w-5" />} badge="short">
        <FreeEnergyShort />
      </SectionCard>

      <SectionCard title="Metadynamics math — history-dependent bias" description="Well-tempered metadynamics deposits Gaussian hills at visited positions in collective variable (CV) space. The accumulated bias V(s,t) = Σ W(t')·exp(-|s-s(t')|²/2σ²) fills the free energy wells. The well-tempered variant reduces hill height as bias accumulates: W(t) = W₀·exp(-V(s,t)/(kT·γ)). In the long-time limit, the free energy surface is recovered: F(s) ≈ -V_bias(s)/(1-1/γ)." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">V(s,t) = Σ W·exp(-|s-s(t')|²/(2σ²)) &nbsp;·&nbsp; W(t) = W₀·exp(-V/(kT·γ)) &nbsp;·&nbsp; F(s) ≈ -V/(1-1/γ)</p>
            <p className="text-[11px] text-muted-foreground mt-1">History-dependent bias fills wells. Well-tempered: height decreases as bias grows. Free energy ≈ inverse of accumulated bias (scaled by γ).</p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5"><p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">Hills</p><p className="font-mono text-[11px]">Gaussian bumps at visited positions</p><p className="text-muted-foreground text-[11px] mt-1">Each hill discourages revisiting the same region. Hills accumulate in wells (minima).</p></div>
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5"><p className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-1">Well-tempered</p><p className="font-mono text-[11px]">W(t) = W₀·exp(-V/(kT·γ))</p><p className="text-muted-foreground text-[11px] mt-1">Hill height decreases exponentially with accumulated bias. Prevents over-filling. γ = bias factor (10-50 typical).</p></div>
            <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-2.5"><p className="font-semibold text-sm text-violet-600 dark:text-violet-400 mb-1">Free energy</p><p className="font-mono text-[11px]">F(s) ≈ -V_bias(s)/(1-1/γ)</p><p className="text-muted-foreground text-[11px] mt-1">Inverse of accumulated bias = free energy surface. Convergence: hours (vs years for brute-force MD).</p></div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="REMD math — temperature-accelerated exploration" description="Replica Exchange MD runs N replicas at different temperatures T₁ < T₂ < ... < Tₙ. Periodically, adjacent replicas attempt to swap configurations via the Metropolis criterion P_swap = min(1, exp(Δβ·ΔE)) where Δβ = 1/T_i - 1/T_j and ΔE = E_i - E_j. High-T replicas explore broadly (surmount energy barriers); low-T replicas refine (sample important minima). The swaps transfer high-T exploration to low-T without changing the equilibrium distribution." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">P_swap = min(1, exp((1/T_i - 1/T_j)·(E_i - E_j)))</p>
            <p className="text-[11px] text-muted-foreground mt-1">Metropolis swap criterion. Swaps accepted when the low-T replica has higher energy than the high-T (likely to benefit from swap).</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="MSM math — kinetics from trajectories" description="Markov State Models discretise conformational space into N microstates, compute the transition matrix T_ij(τ) = P(x(t+τ)∈j | x(t)∈i). The eigenvalues λ_k give implied timescales τ_k = -τ/log(λ_k) — the slowest modes correspond to rare events (conformational transitions, ligand binding). The stationary distribution π (left eigenvector of λ=1) gives the equilibrium populations. MSMs extract kinetics from many short trajectories — no need for a single long one." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">T_ij(τ) = P(x(t+τ)∈j | x(t)∈i) &nbsp;·&nbsp; τ_k = -τ/log(λ_k) &nbsp;·&nbsp; π·T = π</p>
            <p className="text-[11px] text-muted-foreground mt-1">Transition matrix → eigenvalues → timescales. Stationary distribution π satisfies π·T = π (left eigenvector of λ=1).</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="TICA + Neural ODE — discovering slow modes" description="TICA (Time-lagged ICA) finds the slowest collective variables by solving the generalized eigenvalue problem C(τ)·v = λ·C(0)·v where C(τ) = ⟨x(t)·x(t+τ)ᵀ⟩. The eigenvectors with largest eigenvalues are the slowest CVs — no manual selection needed. Neural ODEs (Chen 2018) learn continuous dynamics dx/dt = f_θ(x,t) from trajectory data via the adjoint method, providing a smooth, differentiable model of the dynamics." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">C(τ)·v = λ·C(0)·v &nbsp;(TICA) &nbsp;·&nbsp; dx/dt = f_θ(x,t) &nbsp;(Neural ODE)</p>
            <p className="text-[11px] text-muted-foreground mt-1">TICA: time-lagged covariance eigenvectors = slowest CVs. Neural ODE: learned vector field = effective dynamics.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Try it: Metadynamics + REMD + MSM + TICA (Pyodide)" icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={ES_DEMO} buttonLabel="Run enhanced sampling (Pyodide)" />
      </SectionCard>

      <SectionCard title="Modern papers — metadynamics, REMD, MSMs, Neural ODEs" icon={<Atom className="h-5 w-5" />}>
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Metadynamics (Laio & Parrinello 2003, PNAS):</strong> History-dependent bias potential for free energy surface mapping. Well-tempered variant (Barducci 2008) prevents over-filling. Converges in hours (vs years for brute-force MD). Nobel-adjacent: Parrinello won the 2017 Drexel Prize for this work.</p>
          <p><strong className="text-foreground/80">REMD (Sugita & Okamoto 1999, Chemical Physics Letters):</strong> Parallel tempering — N replicas at different temperatures, Metropolis swaps. The standard method for enhanced sampling of protein folding. Folding@home uses REMD at massive scale.</p>
          <p><strong className="text-foreground/80">MSMs (Pande et al. 2010, Annual Review of Biophysics):</strong> Markov State Models for kinetics from short MD trajectories. The Folding@home infrastructure (Pande Lab, Stanford) uses MSMs to simulate ms-timescale folding from μs-scale trajectories. 35,000 CPU cores distributed.</p>
          <p><strong className="text-foreground/80">Neural ODEs (Chen et al. 2018, NeurIPS best paper):</strong> Continuous-depth neural networks via the adjoint method. For MD: learn effective dynamics from trajectory data. The adjoint method enables O(1) memory backprop through the ODE solver.</p>
          <p><strong className="text-foreground/80">TICA (Pérez-Hernández et al. 2013, JCP):</strong> Time-lagged Independent Component Analysis. Finds slowest collective variables automatically — no manual CV selection. Used as preprocessing for MSMs (TICA → discretise → MSM).</p>
        </div>
      </SectionCard>

      <SectionCard title="Low-level PyTorch — NeuralODE, MetadynamicsSimulator, MSMEstimator, TICA" icon={<Cpu className="h-5 w-5" />} badge="low-level">
        <CodeBlock language="python" filename="enhanced_sampling.py" code={PYTORCH_CODE} />
      </SectionCard>

      <SectionCard title="My deeper thought: enhanced sampling IS importance sampling applied to physics" icon={<TrendingUp className="h-5 w-5" />} badge="Insight">
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Metadynamics IS importance sampling with a learned proposal.</strong> The bias potential V(s,t) IS a proposal distribution that concentrates probability mass on under-sampled regions. The Gaussian hills are the 'replay buffer' — the system remembers where it's been and avoids re-visiting. This IS the same algorithmic structure as Thompson sampling (ADR-019 bandit): maintain a posterior over the free energy surface, sample from it to explore, update the posterior with each visit. The well-tempered variant IS annealed importance sampling — the temperature decreases as the bias grows, transitioning from exploration to exploitation. Metadynamics IS the molecular dynamics version of the bandit.</p>
          <p><strong className="text-foreground/80">MSMs IS spectral clustering applied to trajectory data.</strong> The transition matrix T(τ) IS a stochastic matrix whose eigenvalues measure the slowest mixing modes. This IS the same math as PageRank (ADR-039 PPI networks): the eigenvector of λ=1 gives the stationary distribution (PageRank centrality). The implied timescales τ_k = -τ/log(λ_k) are the molecular analog of the "mixing time" in Markov chains — how long until the system reaches equilibrium. The connection to TICA: TICA finds the optimal basis for the MSM — the collective variables that diagonalise the transition matrix. The platform's pgvector (ADR-022) stores MSM state embeddings — the stationary distribution IS the embedding.</p>
          <p><strong className="text-foreground/80">Neural ODEs IS continuous normalising flows applied to dynamics.</strong> The vector field f_θ(x,t) IS a flow model — the same mathematical structure as normalising flows (Rezende 2015) and continuous-depth GNNs. For MD, the learned flow captures the effective dynamics — the coarse-grained force field that reproduces the slow modes. This connects to the platform's molecular modelling stack: ADR-036 (AMBER — hand-crafted force field) → ADR-049 (MACE — learned force field) → ADR-050 (Neural ODE — learned dynamics at the trajectory level). The progression: from explicit physics (AMBER) to learned potentials (MACE) to learned dynamics (Neural ODE). Each level abstracts away more detail — AMBER tracks every atom, MACE learns the potential surface, Neural ODE learns the trajectory distribution. The platform IS a multi-scale dynamics hierarchy, each level compressed relative to the one below.</p>
        </div>
      </SectionCard>


      <DeeperThoughtSection pageTitle="Enhanced Sampling">
        <DeeperThought title="Enhanced sampling IS the explore-exploit trade-off — and it's multi-armed bandit" connectedTo="ADR-006 (RL agentic)">
          <p>{"MD simulations get stuck in local minima (exploit). Enhanced sampling methods (metadynamics, replica exchange, umbrella sampling) push the simulation to explore new minima. This IS the explore-exploit trade-off from RL. Replica exchange (run N simulations at different temperatures, swap) IS the multi-armed bandit: high-T replicas explore, low-T replicas exploit. Thompson sampling IS Bayesian enhanced sampling. The math (explore vs exploit) IS the same."}</p>
        </DeeperThought>
        <DeeperThought title="Metadynamics IS adaptive biasing — and it's the right approach" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"Metadynamics adds history-dependent biasing potentials to the simulation. As the system visits a region, the bias increases (pushing it away to explore new regions). This IS adaptive biasing — the bias LEARNS from the simulation's history. The math (adaptive bias + free energy reconstruction) IS the SAME as adaptive importance sampling in Monte Carlo. Metadynamics IS adaptive MC for molecular simulation."}</p>
        </DeeperThought>
        <DeeperThought title="Replica exchange IS parallel tempering — and it's the right parallelisation" connectedTo="ADR-034 (ESM-2 + AlphaFold2)">
          <p>{"Replica exchange runs N simulations at temperatures T1 < T2 < ... < TN. Periodically, adjacent replicas swap configurations (if the swap is thermodynamically favorable). High-T replicas cross energy barriers (explore); low-T replicas find local minima (exploit). The swap IS a Metropolis-Hastings move in temperature space. This IS the SAME math as MCMC (accept/reject based on energy). Replica exchange IS parallel MCMC in temperature space."}</p>
        </DeeperThought>
        <DeeperThought title="Markov State Models (MSMs) ARE the discretisation of MD — and they're the right coarse-graining" connectedTo="ADR-022 (pgvector for variant embeddings)">
          <p>{"MSMs discretize the continuous MD trajectory into N conformational states. The transition matrix P[i][j] = probability of going from state i to state j. This IS a Markov chain — the SAME equation (π(t+1) = π(t)·P) that models credit ratings and port states. The stationary distribution gives the equilibrium populations. MSMs ARE the Markov chain card applied to molecular dynamics. The math (transition matrix + stationary distribution) IS the same."}</p>
        </DeeperThought>
        <DeeperThought title="Enhanced sampling + MSMs = the full picture — and it's the fold pattern" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"Enhanced sampling generates the trajectories (exploration). MSMs analyse the trajectories (understanding). Together, they form the complete picture: explore the free-energy landscape, then model the kinetics. This IS the fold pattern: enhanced sampling IS the 'brief' (generate data), MSMs ARE the 'deeper thought' (understand the data). The two are complementary — one generates, one analyses. The pattern (generate + analyse) IS the same as ML training (forward pass) + evaluation (metrics)."}</p>
        </DeeperThought>
      </DeeperThoughtSection>
      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("molecular-modelling")} className="text-sm text-primary hover:underline">→ Molecular Modelling (AMBER + Verlet — the base)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("neural-network-potentials")} className="text-sm text-primary hover:underline">→ Neural Network Potentials (MACE — the learned force field)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("systems-biology")} className="text-sm text-primary hover:underline">→ Systems Biology (MSM = spectral clustering, same as PPI)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">→ ADR-050 (enhanced sampling adoption)</Link>
      </div>
    </div>
  );
}
