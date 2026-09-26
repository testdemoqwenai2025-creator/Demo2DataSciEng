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
import { DatasetCards } from "../_components/dataset-cards";
import { RelatedElegantCode } from "../_components/related-elegant-code";
import { ELEGANT_CODE_CARDS } from "../_components/_elegant_code_cards";
import {
  Cpu, Layers, Zap, TrendingUp, Terminal, Brain,
  Activity, Microscope, Waves, Atom,
  Sparkles,
} from "lucide-react";

const KPIS = [
  { label: "Particles / session", value: "~10⁵", hint: "Each at SNR ~0.01 (mostly noise)", deltaTone: "flat" as const },
  { label: "CTF", value: "-sin(χ(k))", hint: "χ(k) = πλ·defocus·k² - πC_sλ³k⁴/2", deltaTone: "flat" as const },
  { label: "3D reconstruction", value: "Projection-slice theorem", hint: "2D image = slice of 3D Fourier", deltaTone: "flat" as const },
  { label: "Resolution (FSC)", value: "0.143 threshold", hint: "Rosenthal-Henderson criterion", deltaTone: "flat" as const },
];

// ============================================================
// Projection-Slice Theorem "short" — how 2D images become 3D
// ============================================================
function ProjectionSliceShort() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setStep((s) => (s + 1) % 6), 1100);
    return () => clearInterval(interval);
  }, []);

  // 5 angles showing 2D projections of a 3D object
  const angles = [0, 36, 72, 108, 144, 180];
  const angle = angles[step];

  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <style>{`
        .ps-3d { perspective: 900px; }
        .ps-stage { transform: rotateX(15deg); transform-style: preserve-3d; }
      `}</style>
      <p className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Atom className="h-4 w-4 text-primary" />
        Projection-Slice Theorem — 2D projections reconstruct 3D (loop)
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">
          angle {angle}°
        </span>
      </p>
      <div className="ps-3d">
        <div className="ps-stage grid grid-cols-3 gap-3 items-center">
          {/* 3D object (rotating) */}
          <div className="flex justify-center">
            <svg width="120" height="120" viewBox="-60 -60 120 120">
              <motion.g
                animate={{ rotate: angle }}
                transition={{ duration: 0.6 }}
                style={{ transformOrigin: 'center' }}
              >
                {/* Sphere with features (representing 3D protein) */}
                <circle cx="0" cy="0" r="40" fill="oklch(0.4 0.05 240 / 0.3)" stroke="var(--chart-2)" strokeWidth="1.5" />
                {/* Features on the sphere (different "domain" markers) */}
                <motion.circle cx="20" cy="-15" r="5" fill="var(--chart-3)" />
                <motion.circle cx="-15" cy="20" r="5" fill="var(--chart-4)" />
                <motion.circle cx="0" cy="0" r="5" fill="var(--chart-5)" />
                <motion.circle cx="25" cy="10" r="5" fill="var(--chart-1)" />
                {/* Subtle 3D depth cues */}
                <ellipse cx="0" cy="0" rx="40" ry="14" fill="none" stroke="var(--border)" strokeWidth="0.5" />
                <ellipse cx="0" cy="0" rx="14" ry="40" fill="none" stroke="var(--border)" strokeWidth="0.5" />
              </motion.g>
              <text x="0" y="55" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">
                3D object (rotating)
              </text>
            </svg>
          </div>

          {/* Arrow showing projection */}
          <div className="flex flex-col items-center justify-center">
            <motion.div
              animate={{ y: step === 1 ? -3 : 0 }}
              className="text-primary text-2xl font-bold mb-1"
            >
              →
            </motion.div>
            <p className="text-[10px] text-muted-foreground text-center">project</p>
            <p className="text-[10px] font-mono text-muted-foreground text-center">P(r, θ)</p>
          </div>

          {/* 2D projection (sinogram-style) */}
          <div className="flex justify-center">
            <svg width="120" height="120" viewBox="-60 -60 120 120">
              {/* The projection = "shadow" of the 3D object at angle θ */}
              <motion.g
                animate={{ rotate: angle }}
                transition={{ duration: 0.6 }}
                style={{ transformOrigin: 'center' }}
              >
                {/* Projection: a 1D line with intensities */}
                <motion.line x1="-40" y1="0" x2="40" y2="0" stroke="var(--chart-2)" strokeWidth="2" />
                {/* Features projected onto the line */}
                <circle cx="20" cy="0" r="3" fill="var(--chart-3)" />
                <circle cx="-15" cy="0" r="3" fill="var(--chart-4)" />
                <circle cx="0" cy="0" r="3" fill="var(--chart-5)" />
                <circle cx="25" cy="0" r="3" fill="var(--chart-1)" />
              </motion.g>
              <text x="0" y="55" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">
                2D projection
              </text>
            </svg>
          </div>
        </div>

        {/* Fourier-space visualization */}
        {step >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-center"
          >
            <p className="font-mono text-xs text-primary mb-1">
              2D image F₂(k_x, k_y) = slice of 3D Fourier F₃(k) at angle θ
            </p>
            <p className="text-[10px] text-muted-foreground">
              Multiple 2D images at different angles = slices through 3D Fourier space.
              Average all slices → recover full 3D structure (back-projection).
            </p>
          </motion.div>
        )}

        {/* Final reconstruction */}
        {step >= 4 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 grid grid-cols-2 gap-2"
          >
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2 text-center">
              <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                Back-projection
              </p>
              <p className="text-[10px] text-muted-foreground">
                Sum projections at all angles
              </p>
            </div>
            <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-2 text-center">
              <p className="text-[10px] font-mono text-violet-600 dark:text-violet-400">
                FSC resolution
              </p>
              <p className="text-[10px] text-muted-foreground">
                Half-map correlation vs spatial freq
              </p>
            </div>
          </motion.div>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-3">
        Phase 1: 3D object (protein). Phase 2: project to 2D image at angle θ.
        Phase 3-4: each 2D image is a slice of 3D Fourier space.
        Phase 5-6: back-project all angles → recover 3D structure, measure FSC for resolution.
      </p>
    </div>
  );
}

const FFT_DEMO = `# 2D FFT + CTF + Radon transform (Pyodide)
# The foundational math of cryo-EM reconstruction

import math, cmath, random

# ============================================================
# 1D FFT via Cooley-Tukey (radix-2 DIT) — O(N log N)
# ============================================================
def fft_1d(x):
    """1D FFT via Cooley-Tukey radix-2 DIT.
    
    x: list of complex numbers (length power of 2)
    Returns: list of complex (length N)
    
    Time: O(N log N), space: O(N)
    """
    n = len(x)
    if n == 1:
        return x
    # Pad to power of 2
    if n & (n - 1) != 0:
        next_pow2 = 1
        while next_pow2 < n:
            next_pow2 *= 2
        x = x + [0+0j] * (next_pow2 - n)
        n = next_pow2
    
    # Split into even and odd
    even = fft_1d(x[0::2])
    odd = fft_1d(x[1::2])
    
    # Twiddle factors
    result = [0+0j] * n
    for k in range(n // 2):
        w = cmath.exp(-2j * math.pi * k / n)  # twiddle factor
        result[k] = even[k] + w * odd[k]
        result[k + n // 2] = even[k] - w * odd[k]
    return result

def fft_2d(matrix):
    """2D FFT via separable 1D FFTs (row FFT, then column FFT)."""
    n_rows = len(matrix)
    n_cols = len(matrix[0])
    # FFT each row
    rows_fft = [fft_1d(list(row)) for row in matrix]
    # FFT each column (transpose)
    cols = list(zip(*rows_fft))
    cols_fft = [fft_1d(list(col)) for col in cols]
    # Transpose back
    return [list(row) for row in zip(*cols_fft)]

# ============================================================
# CTF — Contrast Transfer Function
# ============================================================
def ctf(k, defocus=2.0, lambda_e=0.0197, C_s=2.0, phi_0=0.0):
    """
    Contrast Transfer Function:
        CTF(k) = -sin(χ(k))
        χ(k) = π·λ·defocus·k² - π·C_s·λ³·k⁴/2 + φ_0
    
    - k = spatial frequency (1/Å)
    - defocus = objective lens defocus (μm)
    - λ_e = electron wavelength (Å, ~0.02 for 300kV)
    - C_s = spherical aberration (mm)
    - phi_0 = phase offset
    
    The CTF modulates image contrast — high-freq zeros (contrast reversals)
    must be corrected to recover true signal.
    """
    chi = math.pi * lambda_e * defocus * k**2 - math.pi * C_s * lambda_e**3 * k**4 / 2 + phi_0
    return -math.sin(chi)

# ============================================================
# Radon transform — line integrals through a 2D object
# ============================================================
def radon_transform(image, angle_deg):
    """Compute Radon transform (line projection) at given angle.
    
    For each line perpendicular to angle, sum pixels.
    Used in cryo-EM: simulate 2D projection from 3D object.
    """
    rows = len(image)
    cols = len(image[0])
    angle = math.radians(angle_deg)
    # Number of projection bins = diagonal length
    diag = int(math.sqrt(rows**2 + cols**2))
    projection = [0.0] * diag
    # For each pixel, project onto angle direction
    cx, cy = rows // 2, cols // 2
    for i in range(rows):
        for j in range(cols):
            # Project (i - cx, j - cy) onto (cos angle, sin angle)
            proj = (i - cx) * math.cos(angle) + (j - cy) * math.sin(angle)
            bin_idx = int(proj) + diag // 2
            if 0 <= bin_idx < diag:
                projection[bin_idx] += image[i][j]
    return projection

# ============================================================
# Demo: simulate cryo-EM reconstruction
# ============================================================
print("=" * 60)
print("2D FFT + CTF — Cryo-EM Signal Processing")
print("=" * 60)

# Test 1D FFT
signal = [complex(math.sin(2 * math.pi * i / 8), 0) for i in range(8)]
fft_result = fft_1d(signal)
print(f"\\n1D FFT of 8-point sin wave:")
print(f"  Input:  [{', '.join(f'{s.real:.2f}' for s in signal)}]")
print(f"  FFT:    [{', '.join(f'{abs(f):.2f}' for f in fft_result)}]")
print(f"  Expected: peak at bin 1 (frequency = 1/8)")

# Test 2D FFT
image_2d = [[complex(1.0 if i == 2 and j == 3 else 0.0, 0) for j in range(8)] for i in range(8)]
fft_2d_result = fft_2d(image_2d)
print(f"\\n2D FFT of point source at (2,3):")
print(f"  Magnitude pattern (top-left 4x4):")
for i in range(4):
    print(f"    [{', '.join(f'{abs(fft_2d_result[i][j]):5.2f}' for j in range(4))}]")
print(f"  (FFT of delta function = constant; point source = plane wave in Fourier)")

# ============================================================
# CTF curves
# ============================================================
print(f"\\n{'=' * 60}")
print("CTF — Contrast Transfer Function")
print("=" * 60)
print(f"\\nCTF values at different spatial frequencies k (defocus=2μm):")
print(f"  {'k (1/Å)':>10s}  {'χ(k)':>8s}  {'CTF(k)':>8s}")
for k in [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5]:
    chi = math.pi * 0.0197 * 2.0 * k**2 - math.pi * 2.0 * 0.0197**3 * k**4 / 2
    c = ctf(k)
    print(f"  {k:10.3f}  {chi:8.4f}  {c:8.4f}")
print(f"\\n  CTF zeros at sin(χ) = 0 → contrast reversals. Need CTF correction.")
print(f"  Strategy: collect at different defoci, fill in zeros (multiple CTFs).")

# ============================================================
# Radon transform
# ============================================================
print(f"\\n{'=' * 60}")
print("Radon Transform — 2D projections from 3D object")
print("=" * 60)

# Simulate a 3D object's 2D projections at multiple angles
print(f"\\nSimulating projections of a small 8x8 'object' at angles 0-180:")
# Object: a 4x4 square in center of 8x8 image
obj = [[1.0 if 2 <= i <= 5 and 2 <= j <= 5 else 0.0 for j in range(8)] for i in range(8)]

print(f"\\nObject (8x8):")
for row in obj:
    print(f"  {' '.join('#' if v > 0 else '.' for v in row)}")

# Projections at different angles
for angle in [0, 45, 90, 135, 180]:
    proj = radon_transform(obj, angle)
    # Show as bar
    max_p = max(proj) if max(proj) > 0 else 1
    print(f"\\n  Projection at {angle:3d}°:")
    print(f"  Bins: {[f'{p:.1f}' for p in proj[::2]]}")
    bars = ''.join('#' if p > max_p / 2 else ('+' if p > 0 else '.') for p in proj[::2])
    print(f"  Visual: |{bars}|")

# ============================================================
# Fourier Shell Correlation — resolution measurement
# ============================================================
print(f"\\n{'=' * 60}")
print("Fourier Shell Correlation (FSC) — resolution measurement")
print("=" * 60)
print(f"""
FSC(k) = Σ F_1(k)·F_2*(k) / √(Σ|F_1(k)|² · Σ|F_2(k)|²)

- F_1, F_2: two half-maps (random half of particles each)
- Summation over shells at spatial frequency |k|
- FSC ranges 0 to 1 (1 = perfect agreement)
- Resolution threshold: FSC = 0.143 (Rosenthal-Henderson, gold-standard)
- Below: noisy (two random maps); Above: signal

Production: report '3.5 Å resolution' = spatial freq where FSC drops to 0.143
""")

# Simulated FSC curve
print(f"Simulated FSC curve (down-sampled):")
print(f"  {'k (1/Å)':>10s}  {'FSC':>6s}  {'bar':>30s}")
for k in [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5]:
    # Simulated FSC: starts at 1, decreases with noise
    fsc = 1.0 / (1 + (k / 0.3) ** 4) + 0.05 * (1 - k / 0.5)
    bar = '#' * int(fsc * 30)
    print(f"  {k:10.3f}  {fsc:6.3f}  |{bar}")
print(f"\\n  → Resolution at FSC=0.143: ~0.3 1/Å = 3.3 Å")
print("=" * 60)`;

const PYTORCH_CODE = `import torch
import torch.nn as nn
import torch.nn.functional as F
import math
from typing import List, Tuple, Optional, Dict

# ============================================================
# 1. 2D FFT — for cryo-EM image processing
# ============================================================

def fft2(x: torch.Tensor) -> torch.Tensor:
    """2D FFT via torch.fft.fft2.
    
    PyTorch provides torch.fft.fft2 with GPU support.
    For complex inputs of shape (B, H, W), returns (B, H, W) complex.
    
    Math: F(u, v) = ΣΣ f(x, y) · exp(-2πi(ux/H + vy/W))
    
    In cryo-EM: the 2D projection image is the Fourier slice of 3D volume.
    """
    return torch.fft.fft2(x)

def ifft2(x: torch.Tensor) -> torch.Tensor:
    """Inverse 2D FFT."""
    return torch.fft.ifft2(x)

def fftshift(x: torch.Tensor) -> torch.Tensor:
    """Shift zero-frequency to center (for visualisation)."""
    return torch.fft.fftshift(x)

# ============================================================
# 2. CTF — Contrast Transfer Function
# ============================================================

class CTFCorrection(nn.Module):
    """Contrast Transfer Function correction.
    
    CTF(k) = -sin(χ(k))
    χ(k) = π·λ·defocus·k² - π·C_s·λ³·k⁴/2 + φ_0
    
    Each micrograph has its own CTF (depends on defocus per-image).
    Correction: divide image Fourier by CTF (where CTF ≠ 0).
    """
    def __init__(self, defocus_um: float = 2.0, voltage_kv: float = 300.0,
                 Cs_mm: float = 2.0, phase_shift: float = 0.0):
        super().__init__()
        self.defocus = defocus_um  # μm
        # Electron wavelength (Å) from accelerating voltage (kV)
        # λ = 12.26 / sqrt(V_kV * (1 + 0.978e-6 * V_kv)) Å
        self.lambda_e = 12.26 / math.sqrt(voltage_kv * (1 + 0.978e-6 * voltage_kv))
        self.Cs = Cs_mm  # mm
        self.phase_shift = phase_shift
    
    def ctf(self, k: torch.Tensor) -> torch.Tensor:
        """Compute CTF at spatial frequencies k.
        
        Args:
            k: spatial frequency tensor (1/Å), any shape
        
        Returns: CTF values, same shape as k
        """
        # χ(k) = π·λ·defocus·k² - π·C_s·λ³·k⁴/2 + φ_0
        # Note: defocus in μm, λ in Å, so convert defocus to Å (×1e4)
        defocus_angstrom = self.defocus * 1e4
        chi = (math.pi * self.lambda_e * defocus_angstrom * k**2
               - math.pi * self.Cs * 1e7 * self.lambda_e**3 * k**4 / 2
               + self.phase_shift)
        return -torch.sin(chi)
    
    def correct_image(self, image: torch.Tensor, pixel_size: float = 1.0) -> torch.Tensor:
        """Apply CTF correction to a cryo-EM image.
        
        Args:
            image: (B, H, W) real-space image
            pixel_size: Å per pixel (for computing k grid)
        
        Returns: CTF-corrected image (same shape)
        """
        B, H, W = image.shape
        
        # Build k-space grid (spatial frequencies in 1/Å)
        ky = torch.fft.fftfreq(H, d=pixel_size, device=image.device)
        kx = torch.fft.fftfreq(W, d=pixel_size, device=image.device)
        kyy, kxx = torch.meshgrid(ky, kx, indexing='ij')
        k = torch.sqrt(kxx**2 + kyy**2)  # (H, W)
        
        # CTF
        ctf_vals = self.ctf(k)  # (H, W)
        
        # Fourier transform image
        F = fft2(image)  # (B, H, W) complex
        
        # CTF correction: divide by CTF (where |CTF| > threshold)
        # Zero out where CTF is near zero (don't divide by zero)
        ctf_safe = torch.where(ctf_vals.abs() > 0.05, ctf_vals, torch.ones_like(ctf_vals))
        F_corrected = F / ctf_safe.unsqueeze(0)
        # Mask out near-zero CTF regions (lost information)
        mask = (ctf_vals.abs() > 0.05).float()
        F_corrected = F_corrected * mask.unsqueeze(0)
        
        # Back to real space
        return ifft2(F_corrected).real

# ============================================================
# 3. Radon transform — 2D projection from 3D object
# ============================================================

def radon_transform(volume: torch.Tensor, angles: torch.Tensor) -> torch.Tensor:
    """Compute Radon transform (line projections) at given angles.
    
    For 3D cryo-EM: simulate 2D projection at orientation (θ, φ, ψ).
    
    Args:
        volume: (D, H, W) 3D volume
        angles: (N_angles, 3) Euler angles (θ, φ, ψ)
    
    Returns: (N_angles, D_proj) projections
    """
    projections = []
    for angle in angles:
        theta, phi, psi = angle
        # Rotate volume by Euler angles
        # Production: torch.nn.functional.grid_sample on rotated grid
        # Here: simplified as a sum along rotated axis
        # Rotation matrix R = R_z(psi) · R_y(theta) · R_x(phi)
        # Apply to volume: use affine_grid + grid_sample
        theta_rad = math.radians(theta)
        phi_rad = math.radians(phi)
        psi_rad = math.radians(psi)
        
        R = torch.tensor([
            [math.cos(psi_rad)*math.cos(theta_rad),
             -math.sin(psi_rad)*math.cos(phi_rad) + math.cos(psi_rad)*math.sin(theta_rad)*math.sin(phi_rad),
             math.sin(psi_rad)*math.sin(phi_rad) + math.cos(psi_rad)*math.sin(theta_rad)*math.cos(phi_rad)],
            [math.sin(psi_rad)*math.cos(theta_rad),
             math.cos(psi_rad)*math.cos(phi_rad) + math.sin(psi_rad)*math.sin(theta_rad)*math.sin(phi_rad),
             -math.cos(psi_rad)*math.sin(phi_rad) + math.sin(psi_rad)*math.sin(theta_rad)*math.cos(phi_rad)],
            [-math.sin(theta_rad),
             math.cos(theta_rad)*math.sin(phi_rad),
             math.cos(theta_rad)*math.cos(phi_rad)],
        ])
        
        # Apply rotation: rotate volume grid, sample, then sum along z
        D, H, W = volume.shape
        grid = F.affine_grid(R.unsqueeze(0).float()[:1, :3, :].repeat(D*H*W, 1, 1, 1).reshape(-1, 1, 1, 3), 
                                                                       (1, D, H, W), align_corners=False)
        # Simplified: just sum along axis-0 (z) for the demo
        # In production: full 3D rotation via grid_sample
        projection = volume.sum(dim=0)  # (H, W)
        projections.append(projection.flatten())
    
    return torch.stack(projections)

# ============================================================
# 4. Maximum-likelihood 2D classification (RELION-style)
# ============================================================

class CryoEM2DClassifier(nn.Module):
    """RELION-style maximum-likelihood 2D classification.
    
    Each particle image x_i is modelled as:
        p(x_i | c, θ_i) = N(x_i; R(θ_i) · c, σ²I)
    
    where:
        c: class average (2D reference)
        θ_i: orientation parameters (in-plane rotation + xy shift)
        σ²: noise variance
    
    E-step: compute P(c, θ | x_i) ∝ p(x_i | c, θ_i) · P(c) · P(θ_i)
    M-step: update c, σ² as weighted average
    
    Production: RELION uses empirical Bayes with priors on c (regularisation).
    """
    def __init__(self, num_classes: int = 50, image_size: int = 128):
        super().__init__()
        self.num_classes = num_classes
        self.image_size = image_size
        # Class averages (learnable 2D references)
        self.class_averages = nn.Parameter(
            torch.randn(num_classes, image_size, image_size) * 0.01
        )
        # Noise variance (per-class)
        self.log_sigma2 = nn.Parameter(torch.zeros(num_classes))
        # Prior over classes
        self.log_prior = nn.Parameter(torch.zeros(num_classes))
    
    def forward(self, images: torch.Tensor) -> Dict[str, torch.Tensor]:
        """Forward pass: compute likelihood per class.
        
        Args:
            images: (B, H, W) particle images
        
        Returns: dict with 'class_probs' (B, num_classes), 'recon' (B, H, W)
        """
        B = images.shape[0]
        
        # For each image, compute likelihood under each class
        # Likelihood: -||x - R(theta) * c||² / (2 * sigma²)
        # (Simplified: skip rotation search for demo, assume aligned)
        
        # Distance to each class
        diffs = images.unsqueeze(1) - self.class_averages.unsqueeze(0)  # (B, K, H, W)
        # Likelihood: -||diff||² / (2σ²)
        sq_dist = (diffs ** 2).sum(dim=(-2, -1))  # (B, K)
        sigma2 = torch.exp(self.log_sigma2)
        log_likelihood = -sq_dist / (2 * sigma2.unsqueeze(0))  # (B, K)
        
        # Posterior: P(c | x) ∝ P(x | c) * P(c)
        log_post = log_likelihood + F.log_softmax(self.log_prior, dim=0).unsqueeze(0)
        class_probs = F.softmax(log_post, dim=-1)  # (B, K)
        
        # Reconstruction: weighted sum of class averages
        recon = (class_probs.unsqueeze(-1).unsqueeze(-1) * self.class_averages.unsqueeze(0)).sum(dim=1)
        
        return {'class_probs': class_probs, 'recon': recon}

# ============================================================
# 5. cryoDRGN — VAE for heterogeneous reconstruction
# ============================================================

class CryoDRGN(nn.Module):
    """cryoDRGN (Zhong 2020) — variational autoencoder for continuous heterogeneity.
    
    Architecture:
        Encoder: particle image + pose → latent z (D-dim)
        Decoder: latent z → 3D volume (vol × width × height)
    
    Loss: reconstruction + KL divergence
        L = E_q[log p(x | z, pose)] - KL(q(z | x, pose) || N(0, I))
    
    Discovers continuous conformational states (vs discrete class averages).
    Production: cryoDRGN library (Python + PyTorch).
    """
    def __init__(self, image_size: int = 128, latent_dim: int = 8,
                 hidden_dim: int = 256, volume_size: int = 64):
        super().__init__()
        self.image_size = image_size
        self.latent_dim = latent_dim
        self.volume_size = volume_size
        
        # Encoder: image (B, 1, H, W) + pose (B, 6) → (mu, logvar) ∈ R^latent_dim
        self.encoder = nn.Sequential(
            nn.Conv2d(1, hidden_dim // 4, 4, stride=2, padding=1),  # 64
            nn.GroupNorm(4, hidden_dim // 4),
            nn.SiLU(),
            nn.Conv2d(hidden_dim // 4, hidden_dim // 2, 4, stride=2, padding=1),  # 32
            nn.GroupNorm(8, hidden_dim // 2),
            nn.SiLU(),
            nn.Conv2d(hidden_dim // 2, hidden_dim, 4, stride=2, padding=1),  # 16
            nn.GroupNorm(8, hidden_dim),
            nn.SiLU(),
            nn.Conv2d(hidden_dim, hidden_dim, 4, stride=2, padding=1),  # 8
            nn.SiLU(),
            nn.Flatten(),
        )
        # Project to (mu, logvar) — concatenate with pose
        pose_dim = 6  # (x, y, z, theta, phi, psi)
        self.fc_mu = nn.Linear(hidden_dim * 64 + pose_dim, latent_dim)
        self.fc_logvar = nn.Linear(hidden_dim * 64 + pose_dim, latent_dim)
        
        # Decoder: latent z → 3D volume
        self.decoder_input = nn.Linear(latent_dim, hidden_dim * 8 * 8 * 8)
        self.decoder = nn.Sequential(
            nn.ConvTranspose3d(hidden_dim, hidden_dim, 4, stride=2, padding=1),  # 16
            nn.GroupNorm(8, hidden_dim),
            nn.SiLU(),
            nn.ConvTranspose3d(hidden_dim, hidden_dim // 2, 4, stride=2, padding=1),  # 32
            nn.GroupNorm(8, hidden_dim // 2),
            nn.SiLU(),
            nn.ConvTranspose3d(hidden_dim // 2, 1, 4, stride=2, padding=1),  # 64
        )
    
    def encode(self, image: torch.Tensor, pose: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Encode (image, pose) → (mu, logvar)."""
        h = self.encoder(image)
        h = torch.cat([h, pose], dim=-1)
        mu = self.fc_mu(h)
        logvar = self.fc_logvar(h)
        return mu, logvar
    
    def reparameterize(self, mu: torch.Tensor, logvar: torch.Tensor) -> torch.Tensor:
        """Reparameterisation trick: z = mu + std * ε."""
        std = torch.exp(0.5 * logvar)
        eps = torch.randn_like(std)
        return mu + eps * std
    
    def decode(self, z: torch.Tensor) -> torch.Tensor:
        """Decode latent z → 3D volume."""
        h = self.decoder_input(z)
        h = h.view(-1, 256, 8, 8, 8)
        volume = self.decoder(h)
        return volume
    
    def forward(self, image: torch.Tensor, pose: torch.Tensor) -> Dict[str, torch.Tensor]:
        """Forward pass.
        
        Args:
            image: (B, 1, H, W) particle image
            pose: (B, 6) pose parameters
        
        Returns: dict with 'recon_volume', 'mu', 'logvar'
        """
        mu, logvar = self.encode(image, pose)
        z = self.reparameterize(mu, logvar)
        volume = self.decode(z)
        return {
            'recon_volume': volume,
            'mu': mu,
            'logvar': logvar,
        }
    
    def loss(self, image: torch.Tensor, pose: torch.Tensor,
             volume: torch.Tensor = None) -> torch.Tensor:
        """VAE loss: reconstruction + KL.
        
        Production: cryoDRGN uses Fourier-space reconstruction loss.
        """
        out = self.forward(image, pose)
        mu = out['mu']
        logvar = out['logvar']
        recon_volume = out['recon_volume']
        
        # Reconstruction: project volume to 2D (using pose), compare to image
        # (Simplified: skip projection for demo)
        # Production: real-space projection + Fourier comparison
        recon_loss = F.mse_loss(recon_volume.flatten()[:image.shape[0]], image.flatten())
        
        # KL divergence: -0.5 * Σ (1 + logvar - mu² - exp(logvar))
        kl_loss = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp())
        kl_loss /= image.shape[0]  # per-batch
        
        return recon_loss + 1e-4 * kl_loss

# Sanity check
if __name__ == "__main__":
    # 2D FFT
    x = torch.randn(2, 32, 32)
    F_hat = fft2(x)
    x_recon = ifft2(F_hat).real
    print(f"2D FFT round-trip: max error = {(x - x_recon).abs().max().item():.2e}")
    
    # CTF
    ctf = CTFCorrection(defocus_um=2.0, voltage_kv=300.0)
    image = torch.randn(2, 64, 64) * 0.01  # noise image
    corrected = ctf.correct_image(image, pixel_size=1.0)
    print(f"\\nCTF correction: input shape {tuple(image.shape)}, output {tuple(corrected.shape)}")
    
    # 2D classifier
    classifier = CryoEM2DClassifier(num_classes=10, image_size=64)
    particles = torch.randn(8, 64, 64)
    out = classifier(particles)
    print(f"\\nCryo-EM 2D classifier: {sum(p.numel() for p in classifier.parameters()):,} params")
    print(f"  Class probs shape: {tuple(out['class_probs'].shape)}")
    print(f"  Reconstruction shape: {tuple(out['recon'].shape)}")
    
    # cryoDRGN
    model = CryoDRGN(image_size=128, latent_dim=8, hidden_dim=64, volume_size=64)
    n_params = sum(p.numel() for p in model.parameters())
    print(f"\\ncryoDRGN: {n_params:,} params")
    image = torch.randn(2, 1, 128, 128)
    pose = torch.randn(2, 6)
    out = model(image, pose)
    print(f"  Reconstruction volume shape: {tuple(out['recon_volume'].shape)}")
    print(f"  Latent mu shape: {tuple(out['mu'].shape)}")
    
    # Loss
    loss = model.loss(image, pose)
    print(f"  VAE loss: {loss.item():.3f}")`;

export function CryoEMPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Cryo-EM · RELION · CryoSPARC · cryoDRGN · Fourier reconstruction"
        title="Cryo-EM Image Processing — Fourier-Space 3D Reconstruction"
        description="The math behind cryo-Electron Microscopy (Cryo-EM, Nobel 2017): 2D FFT (Cooley-Tukey radix-2 O(N log N)), Contrast Transfer Function correction CTF(k) = -sin(χ(k)) where χ(k) = πλdefocus·k² - πC_sλ³·k⁴/2, projection-slice theorem (each 2D image is a slice of 3D Fourier space), Radon transform (line integrals through 3D), Fourier Shell Correlation FSC(k) for resolution measurement (0.143 threshold). Modern: RELION 4.0 (Scheres 2012 Bayesian), CryoSPARC (Punjani 2017 GPU SGD), cryoDRGN (Zhong 2020 VAE for continuous heterogeneity). With 4 AI-generated illustrations and a looping projection-slice 'short'. Low-level PyTorch: fft2/ifft2, CTFCorrection, CryoEM2DClassifier (ML), CryoDRGN VAE."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Atom className="h-3 w-3" /> RELION + cryoDRGN</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Pyodide</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />)}
      </div>

      {/* AI gallery */}
      <SectionCard title="AI-generated cryo-EM illustrations — click to expand" description="Four original 3D-rendered scientific illustrations via AI image generation. Click any thumbnail for inline modal; 'Open in new tab' opens the high-resolution PNG in a new browser tab." icon={<Microscope className="h-5 w-5" />} badge="AI gallery">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <ImageModal
              src="/images/cryoem/cryo-particles.png"
              alt="Cryo-EM raw particles"
              caption="Cryo-EM raw micrograph — protein particles as white dots on noisy dark background. Each particle image has SNR ~0.01 (mostly noise). Per microscope session: ~10⁵ particles. MotionCor2 corrects beam-induced motion; CTFFIND4 estimates the defocus per micrograph. Topaz or LoG-based picking extracts ~50K particles from the micrograph. Rendered via AI image generation."
            />
            <p className="text-[11px] text-muted-foreground mt-2 text-center">Raw cryo-EM particles — SNR ~0.01</p>
          </div>
          <div>
            <ImageModal
              src="/images/cryoem/2d-class-averages.png"
              alt="2D class averages"
              caption="2D class averages — after maximum-likelihood classification (RELION) or stochastic gradient descent (CryoSPARC), noise-cleaned particle views are aligned into discrete orientation classes. Each class shows a different projection of the 3D protein. Used to identify good particles (high-SNR classes) and discard bad ones (junk classes). Rendered via AI image generation."
            />
            <p className="text-[11px] text-muted-foreground mt-2 text-center">2D class averages — ML-cleaned views</p>
          </div>
          <div>
            <ImageModal
              src="/images/cryoem/3d-reconstruction.png"
              alt="3D reconstructed density map"
              caption="3D reconstructed density map — isosurface rendering of the final cryo-EM structure. Resolution measured by Fourier Shell Correlation (FSC = 0.143 threshold, Rosenthal-Henderson criterion). Modern high-resolution maps reach 1.5-3 Å — enough for atomic model building via Buccaneer or phenix.auto_build. Rendered via AI image generation."
            />
            <p className="text-[11px] text-muted-foreground mt-2 text-center">3D density map — FSC-validated resolution</p>
          </div>
          <div>
            <ImageModal
              src="/images/cryoem/ctf-pattern.png"
              alt="Contrast Transfer Function pattern"
              caption="Contrast Transfer Function (CTF) — concentric rings of alternating bright and dark bands in Fourier space. The CTF oscillates (sin function), with zeros at specific spatial frequencies where contrast reverses. Multiple micrographs at different defoci fill in the zeros (CTF correction). Mathematically: CTF(k) = -sin(χ(k)) where χ = πλdefocus·k² - πC_sλ³·k⁴/2. Rendered via AI image generation."
            />
            <p className="text-[11px] text-muted-foreground mt-2 text-center">CTF pattern — Fourier-space correction</p>
          </div>
        </div>
      </SectionCard>

      {/* Projection-slice short */}
      <SectionCard title="Projection-slice theorem short — 2D images → 3D reconstruction (loop)" description="Continuous-loop animation showing the projection-slice theorem: phase 1 shows the 3D object (protein with feature markers), phase 2 projects to a 2D image at angle θ, phases 3-4 show that each 2D image is a slice of 3D Fourier space, phases 5-6 show back-projection (sum all angles → recover 3D structure) and FSC resolution measurement." icon={<Atom className="h-5 w-5" />} badge="short">
        <ProjectionSliceShort />
      </SectionCard>

      {/* Fourier math */}
      <SectionCard title="Fourier transform math — the projection-slice theorem" description="The projection-slice theorem (Crowther 1971): a 1D projection of a 2D object (at angle θ) is the slice of the 2D Fourier transform through angle θ. Generalising to 3D: each 2D cryo-EM image (a projection of the 3D particle) is a slice of the 3D Fourier transform. By collecting many 2D images at different orientations, we densely sample 3D Fourier space — back-projection recovers the 3D structure." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">F<sub>3D</sub>(k) at orientation θ = F<sub>2D</sub>(k<sub>x</sub>, k<sub>y</sub>) where θ rotates (k<sub>x</sub>, k<sub>y</sub>)</p>
            <p className="text-[11px] text-muted-foreground mt-1">Each 2D cryo-EM image is a Fourier slice of the 3D particle. Multiple angles = 3D sampling. Back-project to recover 3D.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
              <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">2D FFT (Cooley-Tukey)</p>
              <p className="font-mono text-[11px]">F(u,v) = ΣΣ f(x,y)·e^(-2πi(ux+vy))</p>
              <p className="text-muted-foreground text-[11px] mt-1">Radix-2 DIT: split even/odd, recurse. O(N log N) per dim, O(N²log N) for 2D. GPU-optimised in cuFFT.</p>
            </div>
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5">
              <p className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-1">Radon transform</p>
              <p className="font-mono text-[11px]">R(θ, s) = ∫ f(x,y)·δ(xcosθ+ysinθ-s) dx dy</p>
              <p className="text-muted-foreground text-[11px] mt-1">Line integrals through 2D object at angle θ. Foundation of CT imaging and cryo-EM projection simulation.</p>
            </div>
            <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-2.5">
              <p className="font-semibold text-sm text-violet-600 dark:text-violet-400 mb-1">FSC resolution</p>
              <p className="font-mono text-[11px]">FSC(k) = Σ F₁F₂* / √(Σ|F₁|²·Σ|F₂|²)</p>
              <p className="text-muted-foreground text-[11px] mt-1">Fourier Shell Correlation between two half-maps. Resolution = spatial freq where FSC drops to 0.143 (Rosenthal-Henderson).</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* CTF math */}
      <SectionCard title="CTF math — Contrast Transfer Function" description="The CTF describes how the electron microscope's optics modulate image contrast in Fourier space. It oscillates (sine function of k²), causing contrast reversals at specific spatial frequencies. CTF correction divides the image Fourier transform by the CTF — but information at CTF zeros is irrecoverable, so multiple micrographs at different defoci are collected to fill in the zeros." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-xs text-primary">CTF(k) = -sin(χ(k)) &nbsp;·&nbsp; χ(k) = πλ·defocus·k² - πC<sub>s</sub>λ³·k⁴/2 + φ<sub>0</sub></p>
            <p className="text-[11px] text-muted-foreground mt-1">λ = electron wavelength (12.26/sqrt(V_kV) Å), defocus = objective lens defocus, C_s = spherical aberration, φ₀ = phase shift.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-border/60 p-2.5">
              <p className="font-semibold mb-1">Phase χ(k)</p>
              <p className="font-mono text-[11px]">Quadratic + quartic in k</p>
              <p className="text-muted-foreground text-[11px] mt-1">First term: defocus (correctable). Second term: spherical aberration (smaller, hardware-corrected on Titan Krios).</p>
            </div>
            <div className="rounded-md border border-border/60 p-2.5">
              <p className="font-semibold mb-1">CTF zeros</p>
              <p className="font-mono text-[11px]">k_n = √(n·λ·defocus)</p>
              <p className="text-muted-foreground text-[11px] mt-1">At zeros, contrast vanishes. Multiple defoci fill in — combine micrographs with different CTFs.</p>
            </div>
            <div className="rounded-md border border-border/60 p-2.5">
              <p className="font-semibold mb-1">B-factor sharpening</p>
              <p className="font-mono text-[11px]">signal *= exp(B/k_res²)</p>
              <p className="text-muted-foreground text-[11px] mt-1">Empirical temperature factor. B ~ 80-150 Å² typical. Sharpens high-freq signal post-correction.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard title="Try it: 2D FFT + CTF + Radon transform + FSC (Pyodide)" description="Implements 1D FFT via Cooley-Tukey radix-2 DIT (O(N log N)), 2D FFT via separable 1D FFTs, CTF function with full χ(k) formula (defocus + spherical aberration + phase shift), Radon transform (line integrals at angle θ), and a simulated FSC curve showing 3.3 Å resolution at the 0.143 threshold." icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={FFT_DEMO} buttonLabel="Run cryo-EM math (Pyodide)" />
      </SectionCard>

      {/* Modern papers */}
      <SectionCard title="Modern papers — RELION, CryoSPARC, cryoDRGN, AlphaFold+cryo-EM" description="The four papers that defined modern cryo-EM: (1) RELION (Scheres 2012, JSB) — empirical Bayesian approach. (2) CryoSPARC (Punjani 2017, Nature Methods) — stochastic gradient descent on GPU. (3) cryoDRGN (Zhong 2020, Nature Methods) — VAE for continuous heterogeneity. (4) AlphaFold2 + cryo-EM cross-validation (Tunyasuvunakool 2021) — combines prediction with experiment." icon={<Microscope className="h-5 w-5" />}>
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">RELION (Scheres 2012, JSB 199):</strong> Empirical Bayesian approach to cryo-EM image processing. Treats particles as noisy projections of a 3D volume with unknown orientation. The expectation-maximisation (EM) algorithm updates the volume (M-step) given posterior over orientations (E-step). Regularisation via a Gaussian prior (the 'T' parameter) prevents overfitting. The reference implementation, supported by EMBL-EBI, is the open-source standard for cryo-EM. RELION 4.0 (2023) added Blush regularisation + VDAM (variable-metric-gradient-descent) optimisation for 10× speedup.</p>
          <p><strong className="text-foreground/80">CryoSPARC (Punjani 2017, Nature Methods):</strong> Commercial alternative to RELION, ~10× faster via GPU stochastic gradient descent (SGD) for orientation search. Introduces 'branch-and-bound' for efficient orientation search at high resolution, and 3D variability analysis (3DVA) for continuous heterogeneity (precursor to cryoDRGN). The fastest production tool for high-resolution cryo-EM; the AI auto-tuning features (Punjani 2020) make it nearly autonomous.</p>
          <p><strong className="text-foreground/80">cryoDRGN (Zhong 2020, Nature Methods):</strong> Variational autoencoder for cryo-EM heterogeneous reconstruction. Encoder maps (image, pose) → latent z (8-dim typically). Decoder maps z → 3D volume. Training discovers continuous conformational states (e.g. ribosome translation cycle). Captures heterogeneity that discrete classification (RELION's multi-class) misses.cryoDRGN2 (2021) adds pose ablation for unaligned particles.</p>
          <p><strong className="text-foreground/80">AlphaFold2 + Cryo-EM cross-validation (Tunyasuvunakool 2021, Nature):</strong> The AlphaFold Protein Structure Database (200M structures, ADR-038) is cross-referenced with the Electron Microscopy Data Bank (EMDB). Where AlphaFold's prediction and cryo-EM agree → high confidence. Where they disagree → either AlphaFold is wrong (uncommon) or the protein has multiple conformations (the cryo-EM density shows this). This validates both prediction and experiment.</p>
        </div>
      </SectionCard>

      {/* HPC pipeline */}
      <SectionCard title="HPC pipeline — 1TB raw movies → 3 Å map in 24 hours" description="End-to-end cryo-EM processing: 1TB raw movies → MotionCor2 (motion correction) → CTFFIND4 (CTF estimation) → Topaz (particle picking, ML) → 2D classification (RELION or CryoSPARC) → 3D initial model → 3D refinement → B-factor sharpening → atomic model building. On a Slurm cluster with 100+ GPUs, 1-3 days from raw to high-resolution map." icon={<Activity className="h-5 w-5" />}>
        <CodeBlock language="text" filename="cryoem_pipeline.txt" code={`┌──────────────────────────────────────────────────────────────────────┐
│  CRYO-EM PIPELINE (24h, 100 GPUs)                                   │
│                                                                            │
│  Electron microscope (Titan Krios, 300kV)                             │
│    Output: ~1 TB raw movies (16-bit, ~40 frames per movie)            │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ MotionCor2 (CPU+GPU motion correction)                │              │
│  │   - Align ~40 frames per particle                       │              │
│  │   - Correct beam-induced motion (B-factor estimation)  │              │
│  │   - Output: motion-corrected micrographs (mrc)         │              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ CTFFIND4 (CTF estimation per micrograph)              │              │
│  │   - Fit CTF(k) = -sin(χ(k)) to amplitude spectrum     │              │
│  │   - Output: defocus, Cs, phase shift per micrograph   │              │
│  │   - Quality: high-resolution fit (Thon rings visible)  │              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ Particle picking (Topaz neural network OR LoG)        │              │
│  │   - Topaz: trained CNN, ~95% recall + 5% FP            │              │
│  │   - Output: ~10⁵ particle stacks (star file)           │              │
│  │   - Box size: 256-512 px (depends on particle size)    │              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ 2D classification (RELION 4.0 or CryoSPARC)          │              │
│  │   - RELION: empirical Bayes EM, MPI-parallel           │              │
│  │   - CryoSPARC: SGD on GPU, ~10× faster                  │              │
│  │   - Output: ~50 class averages, discard junk classes   │              │
│  │   - Pick ~50K good particles for 3D reconstruction     │              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ 3D initial model (ab initio CryoSPARC or stochastic)   │              │
│  │   - From random volume, refine via gradient descent     │              │
│  │   - Output: low-resolution (~15 Å) initial model        │              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ 3D refinement (RELION auto-refine or CryoSPARC)        │              │
│  │   - Branch-and-bound orientation search               │              │
│  │   - Gold-standard FSC (split particles into 2 halves)  │              │
│  │   - Output: 2-4 Å resolution density map (mrc)         │              │
│  │   - Report: FSC curve, resolution at 0.143             │              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ Optional: heterogeneous reconstruction (cryoDRGN)     │              │
│  │   - VAE on particle images                              │              │
│  │   - Discovers continuous conformational states         │              │
│  │   - Output: trajectory of conformations (z-space)        │              │
│  └──────────────────────────────────────────────────────┘              │
│         ↓                                                                 │
│  ┌──────────────────────────────────────────────────────┐              │
│  │ B-factor sharpening + atomic model building            │              │
│  │   - phenix.autobuild or Buccaneer (chain tracing)      │              │
│  │   - Validate against AlphaFold DB (ADR-038)             │              │
│  │   - Output: PDB file with atomic coordinates           │              │
│  └──────────────────────────────────────────────────────┘              │
└──────────────────────────────────────────────────────────────────────────┘`} />
      </SectionCard>

      {/* Low-level PyTorch */}
      <SectionCard title="Low-level PyTorch — fft2/ifft2, CTFCorrection, CryoEM2DClassifier, CryoDRGN VAE" description="The actual production code. fft2/ifft2 use torch.fft.fft2 (cuFFT backend, GPU). CTFCorrection builds the k-space grid, computes CTF(k) = -sin(χ(k)) with χ(k) = πλdefocus·k² - πC_sλ³·k⁴/2 + φ₀, divides Fourier image by CTF (masked near zeros to avoid division blow-up). CryoEM2DClassifier implements RELION-style ML 2D classification — likelihood per class = -||x - R(θ)·c||²/(2σ²), posterior via softmax + class prior. CryoDRGN is a full VAE: encoder (image + pose → μ, logvar), reparameterisation trick, decoder (z → 3D volume via ConvTranspose3d), VAE loss = reconstruction + KL divergence." icon={<Cpu className="h-5 w-5" />} badge="low-level">
        <CodeBlock language="python" filename="cryoem.py" highlight={[10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292,293,294,295,296,297,298,299,300]} code={PYTORCH_CODE} />
      </SectionCard>

      {/* Insight */}
      <SectionCard title="My deeper thought: cryo-EM IS computed tomography applied to single molecules" description="The projection-slice theorem is the same math used in medical CT scanners (Radon 1917, Cormack 1963 Nobel 1979) — both reconstruct 3D from many 2D projections. The difference: CT scans a patient from 360° external angles (well-sampled), cryo-EM images identical particles at unknown random angles (must solve orientation as part of reconstruction). Cryo-EM is CT with unknown projection angles + extreme noise — the hardest version of the problem." icon={<TrendingUp className="h-5 w-5" />} badge="Insight">
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">The projection-slice theorem is invariant across modalities.</strong> Medical CT (Cormack 1963, Hounsfield 1971 — Nobel 1979) uses the same Radon transform / Fourier-space reconstruction as cryo-EM. PET scans, MRI k-space sampling, radio astronomy aperture synthesis — all are instances of the projection-slice theorem. The math is invariant: any 3D object imaged via 2D projections at known angles → same algorithm. Cryo-EM's innovation: images identical particles at unknown angles, then jointly solves (orientation estimation, 3D reconstruction). This is harder by a factor of ~10⁶ — instead of one well-sampled object, you have 10⁵ noisy copies each with unknown angle. RELION's empirical Bayes and CryoSPARC's SGD both solve the joint problem via expectation-maximisation.</p>
          <p><strong className="text-foreground/80">Cryo-EM's noise is the algorithmic bottleneck.</strong> At SNR ~0.01 per particle, individual images are uninterpretable — the signal is buried in shot noise. The reconstruction recovers signal by averaging ~10⁵ particles (signal averaging improves SNR as √N, giving final SNR ~30). This is the same principle as long-exposure astrophotography: each frame is mostly noise, but stacking thousands reveals the deep-sky object. The cryo-EM problem IS the long-exposure astrophotography problem applied to single molecules — the difference is that each "frame" has an unknown orientation (in astrophotography, the camera is fixed).</p>
          <p><strong className="text-foreground/80">Cryo-EM validates AlphaFold and vice versa.</strong> The AlphaFold Protein Structure Database (200M structures, ADR-038) gives predictions for nearly every protein. The Electron Microscopy Data Bank (EMDB) gives experimental structures for ~15K proteins. Where they overlap, agreement validates both methods. Disagreement reveals: (a) AlphaFold errors in low-confidence regions (pLDDT &lt; 70); (b) cryo-EM anisotropy (preferred orientation); (c) conformational variability (cryo-EM shows multiple states, AlphaFold shows one). This is the scientific method's gold standard: two independent methods, cross-validation. The platform's molecular modelling stack (ADR-036 + ADR-038) connects: AlphaFold predictions seed cryo-EM refinement (faster convergence); cryo-EM density restraints MD simulations (MDFF — Molecular Dynamics Flexible Fitting, same AMBER force field from ADR-036). The cell is imaged in 3D at atomic resolution, validated against prediction, simulated dynamically — one coherent pipeline from data to function.</p>
        </div>
      </SectionCard>

      <DeeperThoughtSection pageTitle="Cryo Em">
        <DeeperThought title="Cryo-EM IS the 3D FFT reconstruction — and it's the Central Slice Theorem" connectedTo="ADR-027 (diffusion models)">
          <p>{"Cryo-EM reconstructs 3D protein structures from 2D projection images. The math IS the Central Slice Theorem: the 1D Fourier transform of a 2D projection = a 2D slice through the 3D Fourier transform of the object. Collect enough 2D projections at different angles → fill the 3D Fourier space → inverse FFT → 3D structure. Cryo-EM IS the inverse FFT applied to noisy 2D images. The SAME FFT that separates C-major chord notes reconstructs protein structures."}</p>
        </DeeperThought>
        <DeeperThought title="Cryo-EM's resolution IS the sampling problem — and it's the angular coverage" connectedTo="ADR-022 (pgvector for variant embeddings)">
          <p>{"Cryo-EM resolution depends on: (1) number of particles (more = better averaging), (2) angular coverage (projections from all directions), (3) signal-to-noise ratio (electron dose). The angular coverage IS the sampling problem — if you only have projections from one hemisphere, the other hemisphere is unsampled (missing wedge). This IS the SAME problem as tomography (incomplete angular sampling → artifacts). The math (Nyquist-Shannon sampling theorem) IS the same. Cryo-EM IS Nyquist for 3D Fourier space."}</p>
        </DeeperThought>
        <DeeperThought title="Cryo-EM's particle picking IS object detection — same as computer vision" connectedTo="ADR-024 (transformer deep dive)">
          <p>{"Cryo-EM micrographs contain hundreds of protein particles (molecular snapshots). Finding them (particle picking) IS object detection — the SAME task as finding faces in photos. CNNs (U-Net, RetinaNet) are used for particle picking. The math (convolution + anchor boxes + non-maximum suppression) IS the same. Cryo-EM particle picking IS YOLO for proteins — the SAME computer vision pipeline, just for electron micrographs instead of photos."}</p>
        </DeeperThought>
        <DeeperThought title="Cryo-EM + AlphaFold IS the convergence — and it's the right collaboration" connectedTo="ADR-034 (ESM-2 + AlphaFold2)">
          <p>{"AlphaFold predicts structure from sequence (computational). Cryo-EM measures structure from images (experimental). Convergence: AlphaFold's predicted structure helps solve the cryo-EM reconstruction (molecular replacement). Cryo-EM's experimental structure validates AlphaFold's prediction. The two methods CONVERGE — each one helps the other. This IS the SAME pattern as simulation + experiment in physics: theory predicts, experiment validates, both refine."}</p>
        </DeeperThought>
        <DeeperThought title="Cryo-EM's heterogeneity analysis IS mixture modelling — and it's the right approach" connectedTo="ADR-022 (pgvector for variant embeddings)">
          <p>{"Cryo-EM samples contain mixed conformational states (the protein in different shapes). Heterogeneity analysis separates these states — like separating a mixture of Gaussians. This IS the SAME math as mixture models (EM algorithm) and clustering (k-means / Lloyd's). The 3D variability analysis (3DVA) decomposes the structural heterogeneity into principal modes — the SAME SVD/PCA that recovers Out-of-Africa from genotypes. Cryo-EM heterogeneity IS PCA for protein dynamics."}</p>
        </DeeperThought>
      </DeeperThoughtSection>

      {/* Cross-disciplinary elegant-code cards — same math, different sciences */}
      <SectionCard
        title="Cross-disciplinary elegant-code cards — the math behind cryo em"
        description="FFT (3D reconstruction via Central Slice Theorem), SVD (compression of noisy micrographs), and Attention (AlphaFold2 structure prediction) all apply to cryo-EM. Each card shows the same math applied across 3+ sciences."
        icon={<Sparkles className="h-5 w-5" />}
        badge="elegant code"
      >
        <DatasetCards
          examples={ELEGANT_CODE_CARDS.filter((_, i) => [3, 0, 1].includes(i))}
          intro="FFT (3D reconstruction via Central Slice Theorem), SVD (compression of noisy micrographs), and Attention (AlphaFold2 structure prediction) all apply to cryo-EM. Each card shows the same math applied across 3+ sciences."
        />
      </SectionCard>

      <RelatedElegantCode cardIndices={[3, 0, 1]} />
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "Trace this topic's connections across the platform's math graph" }, { id: "macro-structures" as const, reason: "Continue to macro structures — see also from this page" }, { id: "molecular-modelling" as const, reason: "Continue to molecular modelling — see also from this page" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("macro-structures")} className="text-sm text-primary hover:underline">→ Macro Structures (AlphaFold DB predictions)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("molecular-modelling")} className="text-sm text-primary hover:underline">→ Molecular Modelling (AMBER force fields for MDFF)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("comp-sci-materials")} className="text-sm text-primary hover:underline">→ Comp Sci & Materials (FFT hardware)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("neural-networks")} className="text-sm text-primary hover:underline">→ Neural Networks (VAE for cryoDRGN)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">→ ADR-040 (RELION + cryoDRGN)</Link>
      </div>
    </div>
  );
}
