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

const KPIS = [
  { label: "Kepler's 3rd law", value: "T² = (4π²/GM)·a³", hint: "Period T scales with semi-major axis a³ — Kepler 1619", deltaTone: "flat" as const },
  { label: "Transit depth", value: "ΔF/F = (Rp/Rs)²", hint: "Flux dip = area ratio of planet/star disc", deltaTone: "flat" as const },
  { label: "LHC data rate", value: "~1 PB/year", hint: "ATLAS + CMS after trigger zero-suppression (40 MHz × ~1 MB)", deltaTone: "up" as const },
  { label: "LIGO GW events", value: "90 (O1–O3)", hint: "BBH + BNS + NSBH mergers — Abbott et al. 2015-2020", deltaTone: "up" as const },
];

// ============================================================
// Exoplanet transit detection "short" — 5-phase loop
// star → planet transit → light-curve dip → exoplanet confirmed → JWST follow-up
// ============================================================
function TransitDetectionShort() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setStep((s) => (s + 1) % 5), 1500);
    return () => clearInterval(i);
  }, []);
  const phases = [
    "1. Star (steady flux F₀)",
    "2. Planet transit begins (flux drops)",
    "3. Light-curve dip ≈ (Rp/Rs)²",
    "4. Exoplanet confirmed (≥3 dips)",
    "5. JWST follow-up (atmosphere)",
  ];
  // Star + planet SVG positions per phase
  const planetX = [340, 180, 100, 60, 320]; // x position of planet
  const planetVisible = [false, true, true, true, false];
  const dipDepth = [0, 0.4, 1, 1, 0]; // dip intensity 0-1
  const dipActive = [0, 0.5, 1, 1, 0];
  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <style>{`.ss-3d { perspective: 800px; } .ss-stage { transform: rotateX(8deg); transform-style: preserve-3d; }`}</style>
      <p className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Atom className="h-4 w-4 text-primary" /> Exoplanet transit detection (loop){" "}
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">{phases[step]}</span>
      </p>
      <div className="ss-3d">
        <div className="ss-stage flex justify-center">
          <svg width="380" height="240" viewBox="0 0 380 240">
            {/* Star (big yellow disc) — fixed at top */}
            <defs>
              <radialGradient id="starGrad" cx="40%" cy="40%" r="60%">
                <stop offset="0%" stopColor="oklch(0.92 0.15 70)" />
                <stop offset="60%" stopColor="oklch(0.78 0.18 65)" />
                <stop offset="100%" stopColor="oklch(0.6 0.18 60)" />
              </radialGradient>
            </defs>
            <circle cx="200" cy="80" r="50" fill="url(#starGrad)" stroke="oklch(0.55 0.16 60)" strokeWidth="1" />
            {/* Star flares (subtle sun-spots) */}
            <circle cx="195" cy="75" r="5" fill="oklch(0.65 0.12 60 / 0.6)" />
            <circle cx="210" cy="90" r="3" fill="oklch(0.65 0.12 60 / 0.5)" />

            {/* Planet (small dark disc crossing) — only visible during transit phases */}
            {planetVisible[step] && (
              <motion.circle
                cx={planetX[step]}
                cy="80"
                r="8"
                fill="oklch(0.35 0.08 250)"
                stroke="oklch(0.5 0.1 250)"
                strokeWidth="0.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, cx: planetX[step] }}
                transition={{ duration: 0.8 }}
              />
            )}

            {/* Phase 1: star alone — flat light curve */}
            {step === 0 && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <text x="200" y="20" textAnchor="middle" fontSize="10" fill="oklch(0.55 0.16 60)" fontWeight="bold">Steady star — flux F₀ = 1.0</text>
              </motion.g>
            )}

            {/* Phase 2: planet entering */}
            {step === 1 && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <text x="200" y="20" textAnchor="middle" fontSize="10" fill="oklch(0.55 0.16 250)" fontWeight="bold">Planet entering transit — flux dropping</text>
              </motion.g>
            )}

            {/* Phase 3: full dip */}
            {step === 2 && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <text x="200" y="20" textAnchor="middle" fontSize="10" fill="oklch(0.6 0.18 25)" fontWeight="bold">Full transit — ΔF/F ≈ (Rp/Rs)²</text>
              </motion.g>
            )}

            {/* Phase 4: confirmed exoplanet */}
            {step === 3 && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <text x="200" y="20" textAnchor="middle" fontSize="10" fill="oklch(0.55 0.16 150)" fontWeight="bold">3+ periodic dips → exoplanet confirmed</text>
              </motion.g>
            )}

            {/* Phase 5: JWST follow-up */}
            {step === 4 && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <text x="200" y="20" textAnchor="middle" fontSize="10" fill="oklch(0.55 0.16 200)" fontWeight="bold">JWST NIRSpec — atmospheric spectroscopy</text>
              </motion.g>
            )}

            {/* Light curve at bottom — flux vs time */}
            <text x="20" y="155" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">F</text>
            <text x="360" y="218" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">t</text>
            <line x1="30" y1="160" x2="360" y2="160" stroke="var(--border)" strokeWidth="1" />
            <line x1="30" y1="160" x2="30" y2="220" stroke="var(--border)" strokeWidth="1" />

            {/* Light curve path — flat at F=1, dips to F=1-depth during transit */}
            {(() => {
              // Build light curve path: 30→360 horizontally, 160 = flux=1, 200 = flux=0
              const points: string[] = [];
              const n = 60;
              for (let i = 0; i <= n; i++) {
                const x = 30 + (i / n) * 330;
                const t = i / n;
                // Dip in middle — width depends on phase
                const dipWidth = 0.15;
                let depth = 0;
                if (step >= 2) {
                  // Full dip
                  if (Math.abs(t - 0.5) < dipWidth) {
                    depth = dipDepth[step] * 35;
                  } else if (Math.abs(t - 0.5) < dipWidth + 0.05) {
                    // Slope
                    const f = (dipWidth + 0.05 - Math.abs(t - 0.5)) / 0.05;
                    depth = dipDepth[step] * 35 * f;
                  }
                } else if (step === 1) {
                  // Entering — partial dip
                  if (Math.abs(t - 0.5) < dipWidth) {
                    depth = dipDepth[step] * 20;
                  }
                }
                const y = 160 + depth;
                points.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
              }
              return <path d={points.join(" ")} stroke="oklch(0.55 0.16 25)" strokeWidth="1.5" fill="none" />;
            })()}

            {/* Dip annotation */}
            {step >= 2 && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <line x1="200" y1="160" x2="200" y2="195" stroke="oklch(0.6 0.18 25)" strokeWidth="0.8" strokeDasharray="2,2" />
                <text x="200" y="210" textAnchor="middle" fontSize="9" fill="oklch(0.6 0.18 25)" fontWeight="bold">ΔF/F</text>
              </motion.g>
            )}

            {/* Period markers (phase 4 — periodic dips) */}
            {step === 3 && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {[100, 200, 300].map((x, i) => (
                  <g key={i}>
                    <circle cx={x} cy="195" r="2" fill="oklch(0.55 0.16 150)" />
                    <text x={x} y="215" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">t{i+1}</text>
                  </g>
                ))}
                <line x1="100" y1="230" x2="300" y2="230" stroke="oklch(0.55 0.16 150)" strokeWidth="0.8" markerEnd="url(#arr)" />
                <defs>
                  <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="oklch(0.55 0.16 150)" />
                  </marker>
                </defs>
                <text x="200" y="240" textAnchor="middle" fontSize="8" fill="oklch(0.55 0.16 150)">orbital period T</text>
              </motion.g>
            )}

            {/* JWST spectrum (phase 5) */}
            {step === 4 && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <text x="200" y="195" textAnchor="middle" fontSize="9" fill="oklch(0.55 0.16 200)">H₂O, CO₂, CH₄ absorption bands</text>
                <line x1="60" y1="210" x2="340" y2="210" stroke="oklch(0.55 0.16 200)" strokeWidth="0.8" />
                <path d="M60,210 L100,210 L110,205 L130,205 L140,210 L180,210 L195,200 L220,200 L230,210 L280,210 L295,205 L320,205 L330,210 L340,210"
                      stroke="oklch(0.55 0.16 200)" strokeWidth="1.2" fill="none" />
                <text x="200" y="232" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">wavelength (μm)</text>
              </motion.g>
            )}
          </svg>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-3">
        Phase 1: steady star (flux F₀). Phase 2: planet enters disc — flux drops. Phase 3: full transit — ΔF/F = (Rp/Rs)² (Earth-Sun ≈ 84 ppm, Jupiter-Sun ≈ 1%). Phase 4: ≥3 periodic dips confirm an exoplanet via Kepler's 3rd law (T² ∝ a³). Phase 5: JWST NIRSpec follow-up — atmospheric spectroscopy reveals H₂O, CO₂, CH₄.
      </p>
    </div>
  );
}

const SPACE_DEMO = `# Space Science — Kepler orbits, transit light curves, 3-body, jet 4-vectors
# Pure-Python simulation (no NumPy needed) — runs in Pyodide
import math

# ============================================================
# 1. Kepler's 3rd law:  T² = (4π²/GM) · a³
# ============================================================
# Newtonian gravity:   F = G·M·m/r²
# Circular orbit:      F = m·v²/r   →  v = sqrt(GM/r)
# Orbital period:       T = 2π·r/v = 2π·sqrt(r³/(GM))
#                       ⟹ T² = (4π²/GM)·r³   ← Kepler 1619

G = 6.67430e-11   # gravitational constant (m³ kg⁻¹ s⁻²)
M_sun = 1.989e30   # solar mass (kg)
AU = 1.496e11      # astronomical unit (m)
day = 86400.0

def kepler_period(a_m, M_kg):
    """Orbital period from Kepler's 3rd law: T = 2π·sqrt(a³/GM)."""
    return 2 * math.pi * math.sqrt(a_m**3 / (G * M_kg))

# Earth (a = 1 AU) and Jupiter (a = 5.2 AU) orbits
T_earth = kepler_period(AU, M_sun) / day
T_jup   = kepler_period(5.2 * AU, M_sun) / day
print("=" * 64)
print("1. KEPLER'S 3RD LAW  —  T² = (4π²/GM)·a³")
print("=" * 64)
print(f"  Earth  (a=1.0 AU):  T = {T_earth:.3f} days  (true = 365.25)")
print(f"  Jupiter(a=5.2 AU): T = {T_jup:.1f} days  (true = 4332.6)")
# Kepler ratio: T_jup/T_earth should equal 5.2^(3/2) = 11.86
print(f"  T_jup/T_earth = {T_jup/T_earth:.3f}   (Kepler: (5.2)^1.5 = {5.2**1.5:.3f})")

# ============================================================
# 2. Two-body orbit simulation (velocity-Verlet integrator)
# ============================================================
def kepler_orbit(a, e, M, n_steps=2000):
    """Integrate an elliptical orbit using velocity-Verlet.
    a = semi-major axis (m), e = eccentricity, M = central mass (kg).
    """
    r_peri = a * (1 - e)                    # perihelion distance
    # Vis-viva: v² = GM(2/r - 1/a) → v_peri = sqrt(GM(1+e)/(a(1-e)))
    v_peri = math.sqrt(G * M * (1 + e) / (a * (1 - e)))
    T = kepler_period(a, M)
    dt = T / n_steps
    x, y   = r_peri, 0.0
    vx, vy = 0.0, v_peri
    pts = []
    for i in range(n_steps):
        r = math.sqrt(x*x + y*y)
        ax = -G * M * x / r**3
        ay = -G * M * y / r**3
        x  += vx*dt + 0.5*ax*dt**2
        y  += vy*dt + 0.5*ay*dt**2
        r_new = math.sqrt(x*x + y*y)
        ax_new = -G * M * x / r_new**3
        ay_new = -G * M * y / r_new**3
        vx += 0.5*(ax+ax_new)*dt
        vy += 0.5*(ay+ay_new)*dt
        if i % 200 == 0:
            pts.append((x/AU, y/AU, r_new/AU))
    return pts, T

print(f"\\n{'=' * 64}")
print("2. TWO-BODY ORBIT  —  Earth (e=0.0167, ~circular)")
print("=" * 64)
pts, T = kepler_orbit(AU, 0.0167, M_sun, n_steps=1000)
print(f"  Simulated {len(pts)} sampled positions over T = {T/day:.2f} days")
for i in (0, len(pts)//4, len(pts)//2, len(pts)-1):
    print(f"  t={i*T/(day*len(pts)):.1f}d  →  r = {pts[i][2]:.4f} AU  (x,y)=({pts[i][0]:+.3f}, {pts[i][1]:+.3f})")
print("  (Earth's orbit is nearly circular — eccentricity 0.0167)")

# ============================================================
# 3. Transit light curve: ΔF/F = (Rp/Rs)²
# ============================================================
R_sun     = 6.9634e8
R_earth   = 6.371e6
R_jupiter = 6.9911e7

def transit_depth(Rp, Rs):
    """Fractional flux drop during a full transit."""
    return (Rp / Rs) ** 2

print(f"\\n{'=' * 64}")
print("3. TRANSIT METHOD  —  ΔF/F = (Rp/Rs)²")
print("=" * 64)
print(f"  Earth-Sun:   ΔF/F = {transit_depth(R_earth,   R_sun)*1e6:6.1f} ppm   (84 ppm — Kepler detection limit)")
print(f"  Jupiter-Sun: ΔF/F = {transit_depth(R_jupiter, R_sun)*1e2:6.2f} %     (~1% — trivial detection)")
print(f"  Hot Jupiter (HD 209458b, Rp=1.4 Rj): ΔF/F = {(1.4*R_jupiter/R_sun)**2*1e2:.2f}% (first transit 1999)")

# Simulate a light curve with a transit at t = T_mid
def light_curve(t, T_mid, dur, depth):
    """Box-shaped transit: dip of depth over duration dur around T_mid."""
    if abs(t - T_mid) < dur/2:
        return 1.0 - depth
    return 1.0

print("\\n  Simulated light curve for an Earth-Sun transit (T_mid=5.0 d, dur=13 h):")
T_mid, dur = 5.0, 13/24
depth_earth = transit_depth(R_earth, R_sun)
for t in [4.0, 4.5, 4.9, 5.0, 5.05, 5.5, 6.0]:
    f = light_curve(t, T_mid, dur, depth_earth)
    delta = (1 - f) * 1e6
    print(f"    t={t:.2f} d → F={f:.7f}  ΔF/F={delta:6.1f} ppm  {'← transit' if delta > 0 else ''}")

# ============================================================
# 4. Three-body simulation (leapfrog integrator)
# ============================================================
# Chenciner-Montgomery (2000) figure-8: three equal masses can orbit
# periodically in a figure-8 pattern. Here we demo a simple 3-body system.

def acceleration_3body(state, masses):
    """Compute gravitational acceleration on each body."""
    n = len(masses)
    accs = [[0.0, 0.0] for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            dx = state[2*j]   - state[2*i]
            dy = state[2*j+1] - state[2*i+1]
            r2 = dx*dx + dy*dy + 1e-10
            r  = math.sqrt(r2)
            f  = G * masses[j] / r2
            accs[i][0] += f * dx / r
            accs[i][1] += f * dy / r
    return accs

# Three moon-mass bodies in a triangular configuration
m_body = 7.3e22  # Moon mass (kg)
state = [
    -1.0e8,  0.0,    # body 1 (x, y)
     1.0e8,  0.0,    # body 2
     0.0,    1.7e8,  # body 3
     0.0,   900.0,   # body 1 (vx, vy)
     0.0,  -900.0,   # body 2
    -1800.0, 0.0,    # body 3
]
masses = [m_body, m_body, m_body]

print(f"\\n{'=' * 64}")
print("4. THREE-BODY (LEAPFROG, 300 STEPS)")
print("=" * 64)
dt = 600.0  # 10 min/step
for step in range(300):
    accs = acceleration_3body(state, masses)
    for i in range(3):
        state[2*i]   += state[2*i+2]*dt + 0.5*accs[i][0]*dt**2
        state[2*i+1] += state[2*i+3]*dt + 0.5*accs[i][1]*dt**2
    new_accs = acceleration_3body(state, masses)
    for i in range(3):
        state[2*i+2] += 0.5*(accs[i][0]+new_accs[i][0])*dt
        state[2*i+3] += 0.5*(accs[i][1]+new_accs[i][1])*dt
for i in range(3):
    x, y = state[2*i]/1e8, state[2*i+1]/1e8
    print(f"  Body {i+1} final: (x={x:+.2f}, y={y:+.2f}) × 10⁸ m")
print("  (Leapfrog conserves energy to ~10⁻⁴ over short runs — Verlet is more accurate.)")

# ============================================================
# 5. LHC jet 4-vector reconstruction + n-subjettiness
# ============================================================
# Each final-state particle has 4-momentum  p = (E, px, py, pz)
# Transverse momentum:  pT = sqrt(px² + py²)
# Pseudorapidity:       η = -ln(tan(θ/2))   (θ = polar angle from beam)
# Azimuth:              φ = atan2(py, px)
# Angular distance:     ΔR = sqrt(Δη² + Δφ²)
# Jet = cluster of particles, built by anti-kT algorithm with R0 = 0.4

class Particle4Vector:
    """LHC particle 4-momentum."""
    def __init__(self, E, px, py, pz, pdg_id=0):
        self.E, self.px, self.py, self.pz = E, px, py, pz
        self.pdg_id = pdg_id
    @property
    def pT(self):
        return math.sqrt(self.px**2 + self.py**2)
    @property
    def eta(self):
        p = math.sqrt(self.px**2 + self.py**2 + self.pz**2)
        if p == 0 or abs(self.pz/p) >= 1:
            return 0.0
        theta = math.acos(self.pz / p)
        return -math.log(math.tan(theta/2))
    @property
    def phi(self):
        return math.atan2(self.py, self.px)
    @property
    def mass(self):
        return math.sqrt(max(0.0, self.E**2 - (self.px**2 + self.py**2 + self.pz**2)))
    def __repr__(self):
        return f"Particle(pT={self.pT:6.1f} GeV, η={self.eta:+.2f}, φ={self.phi:+.2f})"

# A simple jet (cluster of 4 particles — e.g., from a W→qq' event)
jet = [
    Particle4Vector(100,  85,  20,  10),
    Particle4Vector( 50,  35,  10,   5),
    Particle4Vector( 30,  25,   8,   3),
    Particle4Vector( 20,  18,   5,   2),
]
print(f"\\n{'=' * 64}")
print("5. LHC JET 4-VECTOR  +  n-SUBJETTINESS")
print("=" * 64)
print(f"  {len(jet)} constituent particles:")
for p in jet:
    print(f"    {p}")
# Reconstruct the jet 4-vector by summing constituents
jet_E  = sum(p.E  for p in jet)
jet_px = sum(p.px for p in jet)
jet_py = sum(p.py for p in jet)
jet_pz = sum(p.pz for p in jet)
jet4v  = Particle4Vector(jet_E, jet_px, jet_py, jet_pz)
print(f"  Reconstructed jet: {jet4v}")
print(f"  → jet pT = {jet4v.pT:.1f} GeV, jet mass = {jet4v.mass:.1f} GeV")

# n-subjettiness:  τ_N = (1/ΣpT) · Σ_k min(pT_k^β, Σ_i pT_i^β · (ΔR_ik/R0)^β)
def n_subjettiness(particles, N=2, R0=0.4, beta=1.0):
    """τ_N discriminator: small τ_N/N means N-prong structure (W, top)."""
    total_pT = sum(p.pT for p in particles)
    axes = particles[:N]  # in production, use kt-cluster axes
    tau = 0.0
    for k, p in enumerate(particles):
        min_term = float('inf')
        for i in range(N):
            deta = p.eta - axes[i].eta
            dphi = p.phi - axes[i].phi
            dR   = math.sqrt(deta**2 + dphi**2)
            term = (axes[i].pT**beta) * (dR/R0)**beta
            if term < min_term:
                min_term = term
        tau += min(p.pT**beta, min_term)
    return tau / total_pT

tau_1 = n_subjettiness(jet, N=1)
tau_2 = n_subjettiness(jet, N=2)
tau_3 = n_subjettiness(jet, N=3)
print(f"\\n  τ_1 = {tau_1:.3f}    τ_2 = {tau_2:.3f}    τ_3 = {tau_3:.3f}")
print(f"  τ_21 = τ_2/τ_1 = {tau_2/tau_1:.3f}  (&lt; 0.45 → likely W/Z 2-prong jet)")
print(f"  τ_32 = τ_3/τ_2 = {tau_3/tau_2:.3f}  (&lt; 0.75 → likely top 3-prong jet)")
print("  These ratios are the standard jet-tagging discriminants at the LHC.")

print(f"\\n{'=' * 64}")
print("RECAP  —  space science IS the ultimate big-data problem")
print("=" * 64)
print("""
  · Kepler's 3rd law is a power law (T ∝ a^1.5) — same log-log scaling
    that pervades empirical science (Zipf, Pareto, allometry).
  · Transit depth is a quadratic area ratio — same form as a
    Bayesian probability ratio in any classifier.
  · LIGO's matched filtering IS a single-layer NN with the chirp
    template as the filter kernel.
  · JetGNN's EdgeConv on ΔR-graphs = the SAME GNN as PPI networks
    (systems-biology) and binder-target alphaproteo graphs.
  · LHC ~1 PB/year, TESS 200M light curves, LIGO 1 TB/day —
    all stored in Parquet/Arrow, queried by Spark (ADR-002).
  The universe is the largest dataset humanity has tried to analyse.
""")`;

const PYTORCH_CODE = `import torch
import torch.nn as nn
import torch.nn.functional as F
import math
from typing import List, Tuple, Optional, Dict

# ============================================================
# 1. TransitCNN — 1D CNN for exoplanet transit detection
# ============================================================
# Kepler / TESS light curves:
#   ~65,000 cadences over 4 years (30-min integrations, ~1300 ppm/h noise)
# A transit creates a U-shaped dip ~2-13 hours wide.
# 1D CNN detects the dip pattern regardless of position (translation-invariant).
#
# Architecture: 4 conv blocks (7x1, 5x1, 5x1, 3x1) with BatchNorm + ReLU +
# MaxPool, then global avg pool + linear head. Receptive field grows ~8x per
# block — covers ~2048 cadences.

class LightCurveAugmentation(nn.Module):
    """Augment light curves to simulate stellar variability + detector noise.
    
    Real Kepler light curves contain:
        - Stellar variability (sinusoidal on hours-days timescales)
        - Detector drift (systematics, ~1 ppm/quarter)
        - Photon noise (~sqrt(N_photon))
    
    Augment: add Gaussian noise + random sinusoid + cosmic-ray spikes.
    """
    def __init__(self, noise_ppm: int = 200):
        super().__init__()
        self.noise_ppm = noise_ppm
    
    def forward(self, flux: torch.Tensor) -> torch.Tensor:
        # flux shape: (B, L) — in flux units (1.0 = no transit)
        B, L = flux.shape
        noise = torch.randn_like(flux) * (self.noise_ppm * 1e-6)
        # Stellar variability (slow sinusoid)
        t = torch.arange(L, device=flux.device, dtype=flux.dtype) / L
        amp = torch.rand(B, 1, device=flux.device, dtype=flux.dtype) * 200e-6
        freq = torch.rand(B, 1, device=flux.device, dtype=flux.dtype) * 5 + 1
        sinusoid = amp * torch.sin(2 * math.pi * freq * t.unsqueeze(0))
        return flux + noise + sinusoid


class TransitCNN(nn.Module):
    """1D CNN to detect exoplanet transits in light curves.
    
    Input:  (B, L) flux time series, L = 2048 cadences (~28 days @ 30-min)
    Output: (B, 2) logits  [no transit, transit]
    
    Architecture: 4 conv blocks with BatchNorm + ReLU + MaxPool, then global
    avg pool + linear head. Total params ~50k — small enough for inference
    on a single GPU.
    """
    def __init__(self, length: int = 2048, channels: int = 32, num_classes: int = 2):
        super().__init__()
        self.length = length
        self.features = nn.Sequential(
            self._block(1,         channels,    kernel=7, pool=4),  # 2048 → 512
            self._block(channels,  channels*2,  kernel=5, pool=4),  # 512  → 128
            self._block(channels*2,channels*4,  kernel=5, pool=4),  # 128  → 32
            self._block(channels*4,channels*8,  kernel=3, pool=2),  # 32   → 16
        )
        self.global_pool = nn.AdaptiveAvgPool1d(1)
        self.head = nn.Sequential(
            nn.Flatten(),
            nn.Linear(channels * 8, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, num_classes),
        )
    
    @staticmethod
    def _block(in_c: int, out_c: int, kernel: int, pool: int) -> nn.Sequential:
        return nn.Sequential(
            nn.Conv1d(in_c, out_c, kernel_size=kernel, padding=kernel // 2),
            nn.BatchNorm1d(out_c),
            nn.ReLU(),
            nn.MaxPool1d(pool),
        )
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B, L) → (B, 1, L)
        x = x.unsqueeze(1)
        x = self.features(x)               # (B, C*8, L')
        x = self.global_pool(x)            # (B, C*8, 1)
        return self.head(x)                # (B, num_classes)
    
    def synthesize_transit(self, B: int, L: int, depth: float = 1e-4,
                            dur_frac: float = 0.03) -> torch.Tensor:
        """Build a synthetic transit light curve for testing."""
        flux = torch.ones(B, L)
        mid = L // 2
        dur = max(1, int(L * dur_frac))
        # Random transit center per sample
        centers = torch.randint(mid - dur, mid + dur, (B,))
        for b in range(B):
            c = centers[b].item()
            flux[b, max(0, c-dur//2):c+dur//2] -= depth
        return flux


# ============================================================
# 2. GravitationalWaveClassifier — 2D CNN on Q-transform spectrograms
# ============================================================
# LIGO strain data is 1D at 4096 Hz. Convert to 2D time-frequency
# representation via Q-transform (constant-Q — better than STFT for chirps).
# Each event: ~2 sec window → 64x64 spectrogram. 2D CNN detects the chirp.

class QTransform(nn.Module):
    """Differentiable Q-transform (constant-Q time-frequency transform).
    
    LIGO uses Morlet wavelets in production (gwpy / cuQwavelet on GPU).
    Here we approximate as STFT + log-frequency interpolation — same shape
    out, simpler to implement in pure PyTorch.
    """
    def __init__(self, n_freq: int = 64, n_time: int = 64, sample_rate: int = 4096):
        super().__init__()
        self.n_freq = n_freq
        self.n_time = n_time
        self.sr = sample_rate
        # Constant-Q log-spaced frequency bins (20 Hz to 1024 Hz — LIGO band)
        f_min, f_max = 20, 1024
        freqs = torch.logspace(math.log10(f_min), math.log10(f_max), n_freq)
        self.register_buffer('freqs', freqs)
    
    def forward(self, strain: torch.Tensor) -> torch.Tensor:
        # strain: (B, T) at sample_rate Hz
        B, T = strain.shape
        # STFT with 256-pt Hann window
        window = torch.hann_window(256, device=strain.device, dtype=strain.dtype)
        spec = torch.stft(strain, n_fft=256, hop_length=max(1, T // self.n_time),
                          win_length=256, window=window, return_complex=True)
        spec = spec.abs()  # (B, F, T')
        # Interpolate to fixed (F, T) shape
        spec = F.interpolate(spec.unsqueeze(1), size=(self.n_freq, self.n_time),
                            mode='bilinear', align_corners=False)
        return spec  # (B, 1, F, T)


class GravitationalWaveClassifier(nn.Module):
    """2D CNN to classify GW events: BBH / BNS / NSBH / Noise.
    
    Input:  (B, T) strain timeseries (T ~ 8192 samples at 4096 Hz = 2 s)
    Output: (B, 4) logits
    
    Architecture: 5 conv blocks (3x3 kernels) + global avg pool + linear head.
    ~1M params — lightweight enough for online inference at LHO/LLO.
    Inspired by Gravity Spy (Zevin et al. 2017) + DeepCW (George & Huerta 2018).
    """
    def __init__(self, n_freq: int = 64, n_time: int = 64, num_classes: int = 4):
        super().__init__()
        self.q_transform = QTransform(n_freq, n_time)
        c = 16
        self.backbone = nn.Sequential(
            self._conv_block(1,    c,    k=3),
            self._conv_block(c,    c*2,  k=3),
            self._conv_block(c*2,  c*4,  k=3),
            self._conv_block(c*4,  c*8,  k=3),
            self._conv_block(c*8,  c*16, k=3),
        )
        self.global_pool = nn.AdaptiveAvgPool2d(1)
        self.head = nn.Sequential(
            nn.Flatten(),
            nn.Linear(c*16, 128),
            nn.ReLU(),
            nn.Dropout(0.4),
            nn.Linear(128, num_classes),
        )
    
    @staticmethod
    def _conv_block(in_c: int, out_c: int, k: int) -> nn.Sequential:
        return nn.Sequential(
            nn.Conv2d(in_c, out_c, k, padding=k // 2),
            nn.BatchNorm2d(out_c),
            nn.ReLU(),
            nn.MaxPool2d(2),
        )
    
    def forward(self, strain: torch.Tensor) -> torch.Tensor:
        spec = self.q_transform(strain)        # (B, 1, F, T)
        x = self.backbone(spec)                # (B, C*16, F', T')
        x = self.global_pool(x)               # (B, C*16, 1, 1)
        return self.head(x)                    # (B, num_classes)
    
    @staticmethod
    def synthesize_chirp(B: int = 1, T: int = 8192, sr: int = 4096,
                          f_start: float = 30.0, f_end: float = 250.0) -> torch.Tensor:
        """Build a synthetic BBH chirp for testing (f increases with t)."""
        t = torch.linspace(0, T / sr, T).unsqueeze(0)  # (1, T)
        # Linear chirp (real inspiral is power-law, but linear is enough for tests)
        f = f_start + (f_end - f_start) * t
        phase = 2 * math.pi * torch.cumsum(f, dim=-1) / sr
        amp = t / (T / sr)  # amplitude grows linearly (very rough approx)
        return 1e-21 * amp * torch.sin(phase).expand(B, -1).contiguous()


# ============================================================
# 3. JetGNN — graph neural network for jet classification
# ============================================================
# Jet = collimated spray of hadrons from quark/gluon hadronization.
# Each jet is a "point cloud" of particles with 4-momenta.
# Model as a graph: nodes = particles, edges = ΔR proximity.
# Task: classify jet as  quark / gluon / W-boson / top-quark.

class ParticleEmbedding(nn.Module):
    """Embed each particle's 4-momentum into a feature vector.
    
    Features per particle:
        log(pT), log(E), η (pseudorapidity), φ (azimuthal angle)
        + pdg_id (embedded, particle type)
    """
    def __init__(self, d_model: int = 64, n_pdg: int = 50):
        super().__init__()
        self.linear = nn.Linear(4, d_model)
        self.pdg_embed = nn.Embedding(n_pdg, d_model)
        self.combine = nn.Linear(d_model * 2, d_model)
    
    def forward(self, pT: torch.Tensor, eta: torch.Tensor, phi: torch.Tensor,
                E: torch.Tensor, pdg_id: torch.Tensor) -> torch.Tensor:
        # All inputs: (B, N)
        kin = torch.stack([torch.log(pT + 1), torch.log(E + 1), eta, phi], dim=-1)  # (B, N, 4)
        h_kin = self.linear(kin)              # (B, N, d)
        h_pdg = self.pdg_embed(pdg_id)         # (B, N, d)
        h = torch.cat([h_kin, h_pdg], dim=-1)  # (B, N, 2d)
        return F.relu(self.combine(h))         # (B, N, d)


class EdgeConvLayer(nn.Module):
    """EdgeConv layer — graph conv with messages as functions of edge features.
    
    For each node i and neighbor j:
        e_ij = h_i || (h_j - h_i)              (pairwise difference)
        m_ij = MLP(e_ij)                       (edge message)
        h_i' = max_k(m_ik for k in N(i))        (permutation-invariant aggregation)
    
    kNN graph built in ΔR = sqrt(Δη² + Δφ²) space — recomputed at each layer.
    
    Reference: Dynamic Graph CNN (Wang et al. 2019) → ParticleNet (Qu & Gouskos 2020).
    """
    def __init__(self, d_in: int, d_out: int, k: int = 8):
        super().__init__()
        self.k = k
        self.mlp = nn.Sequential(
            nn.Linear(d_in * 2, d_out),
            nn.ReLU(),
            nn.Linear(d_out, d_out),
        )
    
    def forward(self, h: torch.Tensor, coords: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        # h: (B, N, d_in), coords: (B, N, 2)  (η, φ)
        B, N, D = h.shape
        # Pairwise ΔR = sqrt(Δη² + Δφ²)
        diff = coords.unsqueeze(2) - coords.unsqueeze(1)    # (B, N, N, 2)
        dR = torch.sqrt((diff ** 2).sum(-1))                # (B, N, N)
        # kNN: k nearest neighbors (smallest ΔR)
        _, idx = torch.topk(dR, self.k, dim=-1, largest=False)  # (B, N, k)
        # Gather neighbor features
        idx_exp = idx.unsqueeze(-1).expand(-1, -1, -1, D)   # (B, N, k, D)
        h_neighbors = torch.gather(
            h.unsqueeze(1).expand(-1, N, -1, -1), 2, idx_exp
        )                                                   # (B, N, k, D)
        # Edge feature:  h_i || (h_j - h_i)
        h_i = h.unsqueeze(2).expand(-1, -1, self.k, -1)     # (B, N, k, D)
        edge = torch.cat([h_i, h_neighbors - h_i], dim=-1)  # (B, N, k, 2D)
        # MLP on edges
        m = self.mlp(edge)                                  # (B, N, k, d_out)
        # Aggregate via max (permutation-invariant)
        h_new, _ = m.max(dim=2)                             # (B, N, d_out)
        return h_new, dR


class JetGNN(nn.Module):
    """Graph neural network for jet classification (quark/gluon/W/top).
    
    Particles = nodes, ΔR = edges.  Stack of EdgeConv layers (recompute kNN at
    each layer) + global mean pool + linear head.
    
    Input (variable-length particle sets):
        pT:     (B, N)  transverse momenta (GeV)
        eta:    (B, N)  pseudorapidities
        phi:    (B, N)  azimuthal angles
        E:      (B, N)  energies (GeV)
        pdg_id: (B, N)  particle-type IDs (long)
    Output:
        logits: (B, 4)  [quark, gluon, W-boson, top-quark]
    
    Reference: ParticleNet (Qu & Gouskos 2020) — standard jet-GNN at the LHC.
    """
    def __init__(self, d_model: int = 64, n_layers: int = 3, k: int = 8,
                 num_classes: int = 4, n_pdg: int = 50):
        super().__init__()
        self.embed = ParticleEmbedding(d_model, n_pdg)
        self.layers = nn.ModuleList([
            EdgeConvLayer(d_model, d_model, k) for _ in range(n_layers)
        ])
        # Focal loss could be used for class imbalance (gluon vs top) — omitted for clarity
        self.head = nn.Sequential(
            nn.Linear(d_model, d_model),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(d_model, num_classes),
        )
    
    def forward(self, pT: torch.Tensor, eta: torch.Tensor, phi: torch.Tensor,
                E: torch.Tensor, pdg_id: torch.Tensor) -> torch.Tensor:
        h = self.embed(pT, eta, phi, E, pdg_id)             # (B, N, d)
        coords = torch.stack([eta, phi], dim=-1)            # (B, N, 2)
        for layer in self.layers:
            h_new, _ = layer(h, coords)
            h = h + h_new                                    # residual
        h = h.mean(dim=1)                                    # (B, d) — global mean pool
        return self.head(h)                                  # (B, num_classes)


# ============================================================
# 4. End-to-end inference examples
# ============================================================

def demo_transit_cnn() -> TransitCNN:
    """Detect a transit in a synthetic light curve."""
    torch.manual_seed(42)
    model = TransitCNN(length=2048, channels=16)
    # Synthetic transit: U-dip in the middle
    L = 2048
    flux = torch.ones(1, L)
    mid, dur = L // 2, 60
    flux[0, mid-dur:mid+dur] -= 0.0001  # 100 ppm dip
    # Augment + classify
    aug = LightCurveAugmentation(noise_ppm=200)
    flux_aug = aug(flux)
    logits = model(flux_aug)
    probs = F.softmax(logits, dim=-1)
    print(f"TransitCNN: transit prob = {probs[0, 1].item():.3f}")
    return model


def demo_gw_classifier() -> GravitationalWaveClassifier:
    """Classify a synthetic BBH chirp."""
    torch.manual_seed(0)
    model = GravitationalWaveClassifier()
    # Synthetic chirp
    strain = GravitationalWaveClassifier.synthesize_chirp(B=1, T=8192)
    logits = model(strain)
    probs = F.softmax(logits, dim=-1)
    print(f"GWClassifier: BBH prob = {probs[0, 0].item():.3f}  "
          f"BNS = {probs[0, 1].item():.3f}  noise = {probs[0, 3].item():.3f}")
    return model


def demo_jet_gnn() -> JetGNN:
    """Classify a synthetic 10-particle jet."""
    torch.manual_seed(123)
    model = JetGNN(d_model=32, n_layers=2, k=4)
    B, N = 1, 10
    pT   = torch.rand(B, N) * 100 + 10
    eta  = torch.randn(B, N) * 0.4
    phi  = torch.randn(B, N) * 0.4
    E    = pT * (1 + torch.rand(B, N))
    pdg  = torch.zeros(B, N, dtype=torch.long)
    logits = model(pT, eta, phi, E, pdg)
    probs = F.softmax(logits, dim=-1)
    print(f"JetGNN: quark = {probs[0, 0].item():.3f}  gluon = {probs[0, 1].item():.3f}  "
          f"W = {probs[0, 2].item():.3f}  top = {probs[0, 3].item():.3f}")
    return model


if __name__ == "__main__":
    transit_model = demo_transit_cnn()
    gw_model      = demo_gw_classifier()
    jet_model     = demo_jet_gnn()
    n_params = sum(p.numel() for p in transit_model.parameters())
    print(f"\\nTransitCNN  parameters: {n_params:,}")
    n_params = sum(p.numel() for p in gw_model.parameters())
    print(f"GWClassifier parameters: {n_params:,}")
    n_params = sum(p.numel() for p in jet_model.parameters())
    print(f"JetGNN      parameters: {n_params:,}")
    print("\\nAll three space-science deep-learning models instantiated successfully.")`;

const HPC_PIPELINE = `┌──────────────────────────────────────────────────────────────────────┐
│  SPACE-SCIENCE HPC PIPELINE  (multi-messenger astronomy)            │
│                                                                      │
│  Telescope / detector raw data                                       │
│    · Kepler/TESS  : 50 k stars × 30 min cadence × 4 yr  ≈ 10 TB     │
│    · LIGO strain   : 2 channels × 4096 Hz × 24/7      ≈ 1 TB/day    │
│    · LHC collisions: 40 MHz × ~1 MB/event             ≈ 1 PB/year   │
│    · JWST NIRCam   : ~10 GB/exposure × 1000s/day      ≈ 10 TB/day   │
│         ↓                                                            │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │ 1. Calibration + raw data reduction                     │        │
│  │    - Bias/dark/flat-field correction (optical)           │        │
│  │    - LIGO: Wiener filter, glitch veto                    │        │
│  │    - LHC: zero-suppression, pile-up mitigation          │        │
│  │    - Output: Apache Parquet + Arrow (ADR-003 columnar)   │        │
│  └──────────────────────────────────────────────────────────┘        │
│         ↓                                                            │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │ 2. ML detection  (GPU cluster, distributed inference)   │        │
│  │    - TransitCNN on TESS light curves (Bonsai CNN)        │        │
│  │    - GW matched-filter + DL classifier (Gravity Spy)      │        │
│  │    - LHC jet tagging with JetGNN (ParticleNet)            │        │
│  │    - Apache Spark distributed inference (ADR-002)         │        │
│  └──────────────────────────────────────────────────────────┘        │
│         ↓                                                            │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │ 3. Candidate selection + multi-messenger coincidence     │        │
│  │    - Group detections, deduplicate                        │        │
│  │    - GW + EM + neutrino cross-correlation (±5 s window)   │        │
│  │    - Statistical significance (FAP, p-values, σ)          │        │
│  └──────────────────────────────────────────────────────────┘        │
│         ↓                                                            │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │ 4. Human validation  (eye-balling + interactive tools)    │        │
│  │    - Inspect light curves, spectrograms, event displays   │        │
│  │    - Confirm or reject ML candidates                       │        │
│  │    - TESS Objects of Interest (TOI), LIGO alerts circulated │        │
│  └──────────────────────────────────────────────────────────┘        │
│         ↓                                                            │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │ 5. Publication + open-data archive                      │        │
│  │    - Submit to MAST (Mikulski Archive for Space Telesc.)  │        │
│  │    - DOI assignment, open data release                    │        │
│  │    - Paper to ApJ / PRD / Nature Astronomy                │        │
│  └──────────────────────────────────────────────────────────┘        │
│                                                                      │
│  Wall-clock: seconds (LIGO alerts) → years (final mission catalogues) │
│  Stack: Apache Spark, Parquet, Arrow  (same as ADR-002 Databricks)   │
│  The universe is the largest dataset humanity has tried to analyse.  │
└──────────────────────────────────────────────────────────────────────┘`;

export function SpaceSciencePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Space Science · Kepler/TESS · LIGO · LHC · JWST · multi-messenger astronomy"
        title="Space Science — The Universe Is the Largest Dataset"
        description="Space science IS the ultimate big-data problem. Kepler's 3rd law T² = (4π²/GM)a³ governs every orbit; the transit method ΔF/F = (Rp/Rs)² finds exoplanets from a 100-ppm flux dip; LIGO measures gravitational-wave strain h = (4G/c⁴)(d²I/dt²)/r from mergers 10⁹ light-years away; the LHC's n-subjettiness τ_N classifies quark/gluon/W/top jets. Four observatories generate petabytes per year — LHC ~1 PB/year, LIGO 1 TB/day, TESS 200M light curves, JWST 10 TB/day — all stored in Parquet/Arrow and queried by Spark (ADR-002). With 4 AI illustrations + a looping transit-detection 'short' + Pyodide orbit simulator + low-level PyTorch TransitCNN / GravitationalWaveClassifier / JetGNN."
        right={
          <>
            <Badge variant="outline" className="gap-1.5"><Atom className="h-3 w-3" /> Kepler + LIGO + LHC</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Pyodide</Badge>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      <SectionCard title="AI-generated illustrations — click to expand" icon={<Atom className="h-5 w-5" />} badge="AI gallery">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <ImageModal
              src="/images/space/exoplanet-transit.png"
              alt="Exoplanet transit"
              caption="Exoplanet transit — a planet crossing its host star creates a small (84 ppm for Earth-Sun) flux dip, repeated every orbital period T. Kepler's 3rd law T² = (4π²/GM)a³ gives the orbital semi-major axis a from the period alone. Three periodic dips = exoplanet confirmation."
            />
            <p className="text-[11px] text-muted-foreground mt-2 text-center">Exoplanet transit — flux dip ΔF/F = (Rp/Rs)²</p>
          </div>
          <div>
            <ImageModal
              src="/images/space/gravitational-waves.png"
              alt="Gravitational waves"
              caption="Gravitational waves — ripples in spacetime from accelerating massive bodies. LIGO detects merging black-hole binaries via the strain h = (4G/c⁴)(d²I/dt²)/r, where I is the mass quadrupole. GW150914 (Abbott et al. 2016) was the first direct detection — 36 + 29 solar-mass black holes merging 1.3 billion light-years away."
            />
            <p className="text-[11px] text-muted-foreground mt-2 text-center">Gravitational waves — LIGO strain interferometer</p>
          </div>
          <div>
            <ImageModal
              src="/images/space/lhc-collision.png"
              alt="LHC collision"
              caption="LHC collision — 40 MHz proton-proton collisions at 13 TeV centre-of-mass. ATLAS + CMS together produce ~1 PB/year of raw data after trigger zero-suppression. Jets (collimated sprays of hadrons) are clustered via the anti-kT algorithm; classified by n-subjettiness τ_N and modern GNNs (ParticleNet)."
            />
            <p className="text-[11px] text-muted-foreground mt-2 text-center">LHC collision — jet substructure</p>
          </div>
          <div>
            <ImageModal
              src="/images/space/jwst-deep-field.png"
              alt="JWST deep field"
              caption="JWST deep field — the James Webb Space Telescope's NIRCam images reveal galaxies within 300 million years of the Big Bang (Naidu et al. 2022, CEERS survey). Photometric redshifts from dropout techniques; follow-up NIRSpec spectroscopy confirms Lyman-α emission. JWST generates ~10 TB/day of raw imaging data."
            />
            <p className="text-[11px] text-muted-foreground mt-2 text-center">JWST deep field — early galaxies</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Transit detection short — star → planet transit → light-curve dip → exoplanet confirmed → JWST follow-up (loop)" icon={<Atom className="h-5 w-5" />} badge="short">
        <TransitDetectionShort />
      </SectionCard>

      <SectionCard
        title="Kepler's laws + orbital mechanics"
        description="Johannes Kepler (1619) derived three empirical laws from Tycho Brahe's naked-eye observations. Newton (1687) showed they all follow from F = G·M·m/r². Kepler's 3rd law T² = (4π²/GM)·a³ is the foundation of celestial mechanics — it lets you weigh any star from its planet's orbital period alone, and is the same power-law scaling (T ∝ a^1.5) that pervades empirical science (Zipf, Pareto, allometry)."
        icon={<Brain className="h-5 w-5" />}
        badge="mathematics"
      >
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">T² = (4π²/GM)·a³ &nbsp;·&nbsp; v² = GM·(2/r − 1/a) &nbsp;·&nbsp; F = GMm/r²</p>
            <p className="text-[11px] text-muted-foreground mt-1">Kepler 3rd law (period vs semi-major axis) + vis-viva equation (orbital speed at radius r) + Newton's law of gravitation.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
              <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">1st law — orbits are ellipses</p>
              <p className="font-mono text-[11px]">r(φ) = a(1−e²) / (1 + e·cos φ)</p>
              <p className="text-muted-foreground text-[11px] mt-1">Star at one focus, not the centre. Eccentricity e ∈ [0, 1). Earth's e = 0.0167 (nearly circular).</p>
            </div>
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5">
              <p className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-1">2nd law — equal areas in equal times</p>
              <p className="font-mono text-[11px]">dA/dt = ½ r²(dφ/dt) = const</p>
              <p className="text-muted-foreground text-[11px] mt-1">Planets move faster at perihelion (close approach), slower at aphelion. Conservation of angular momentum.</p>
            </div>
            <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-2.5">
              <p className="font-semibold text-sm text-violet-600 dark:text-violet-400 mb-1">3rd law — harmonic relation</p>
              <p className="font-mono text-[11px]">T² / a³ = 4π² / (GM)</p>
              <p className="text-muted-foreground text-[11px] mt-1">The orbital period squared is proportional to the semi-major axis cubed. Lets you measure M_star from T_planet + a.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Transit method — ΔF/F = (Rp/Rs)²"
        description="When a planet crosses its host star's disc (transit), it blocks a fraction (Rp/Rs)² of the starlight. Earth-Sun: (R_earth/R_sun)² ≈ 84 ppm — at the Kepler mission's detection limit. Jupiter-Sun: (R_jupiter/R_sun)² ≈ 1% — trivial. Three periodic dips → exoplanet confirmed; the period gives the semi-major axis via Kepler's 3rd law. JWST follow-up spectroscopy during transit reveals atmospheric composition (H₂O, CO₂, CH₄) — transmission spectroscopy."
        icon={<Brain className="h-5 w-5" />}
        badge="mathematics"
      >
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">ΔF/F = (Rp/Rs)² &nbsp;·&nbsp; transit_dur ≈ P·(Rs/a)·(1/π) &nbsp;·&nbsp; a³ = GM·T²/(4π²)</p>
            <p className="text-[11px] text-muted-foreground mt-1">Flux dip = area ratio. Transit duration gives orbital inclination; period gives semi-major axis (Kepler 3rd law).</p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
              <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">Detection limit</p>
              <p className="font-mono text-[11px]">Earth-Sun: ΔF/F ≈ 84 ppm</p>
              <p className="text-muted-foreground text-[11px] mt-1">Kepler's photometric precision (20 ppm/hr) made Earth-size planet detection around Sun-like stars possible — first in 2009.</p>
            </div>
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5">
              <p className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-1">Hot Jupiter</p>
              <p className="font-mono text-[11px]">HD 209458b: ΔF/F ≈ 1.5%</p>
              <p className="text-muted-foreground text-[11px] mt-1">First transit detection (1999, Charbonneau). Large planet + short period = deep + frequent dips — easiest to find.</p>
            </div>
            <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-2.5">
              <p className="font-semibold text-sm text-violet-600 dark:text-violet-400 mb-1">Atmospheric follow-up</p>
              <p className="font-mono text-[11px]">F(λ) = F₀(λ)·(1 − δ_atm(λ))</p>
              <p className="text-muted-foreground text-[11px] mt-1">JWST transmission spectroscopy: wavelength-dependent transit depth reveals atmospheric absorption bands (H₂O, CO₂, CH₄).</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Gravitational wave strain — h = (4G/c⁴)(d²I/dt²)/r"
        description="General relativity predicts that accelerating mass quadrupoles radiate gravitational waves at the speed of light. The strain h ≈ (4G/c⁴)·(d²I/dt²)/r — for two black holes merging 1.3 billion light-years away (GW150914), the dimensionless strain at Earth was h ≈ 10⁻²¹, meaning a 4-km LIGO arm changed length by ~10⁻¹⁸ m (1/1000 of a proton diameter). LIGO measures this via laser interferometry — the most precise length measurement humanity has ever made."
        icon={<Brain className="h-5 w-5" />}
        badge="mathematics"
      >
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">h ≈ (4G/c⁴)·(d²I/dt²)/r &nbsp;·&nbsp; h_+ = ΔL/L</p>
            <p className="text-[11px] text-muted-foreground mt-1">Quadrupole formula — strain scales as the second time-derivative of the mass quadrupole I_ij, divided by distance r.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
              <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">Strain amplitude</p>
              <p className="font-mono text-[11px]">h ~ 10⁻²¹</p>
              <p className="text-muted-foreground text-[11px] mt-1">For GW150914 at 410 Mpc. A 4-km arm stretches by 4×10⁻¹⁸ m — 1/1000 of a proton's diameter.</p>
            </div>
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5">
              <p className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-1">Chirp signal</p>
              <p className="font-mono text-[11px]">f(ḟ) = (1/π)·(5/256)^(3/8)·(GM_c/c³)^(-5/8)·f^(-11/8)</p>
              <p className="text-muted-foreground text-[11px] mt-1">Frequency rises as BHs inspiral. The chirp mass M_c = (m1·m2)^(3/5)/(m1+m2)^(1/5) is the dominant measurable.</p>
            </div>
            <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-2.5">
              <p className="font-semibold text-sm text-violet-600 dark:text-violet-400 mb-1">Matched filtering</p>
              <p className="font-mono text-[11px]">SNR² = 4·∫|h̃(f)|²/S_n(f) df</p>
              <p className="text-muted-foreground text-[11px] mt-1">Template bank of ~300k chirps. Mathematically equivalent to a single-layer NN with the template as the filter kernel.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="LHC jet substructure — n-subjettiness τ_N"
        description="At the LHC, quarks and gluons produced in 13 TeV proton-proton collisions hadronise into collimated sprays called jets. Jet substructure observables like n-subjettiness discriminate N-prong jets: τ_N = (1/Σp_T)·Σ_k min(p_Tk^β, Σ_i p_Ti^β·(ΔR_ik/R0)^β). For a quark/gluon jet (1-prong), τ_1 ≈ 0; for W→qq' (2-prong), τ_21 = τ_2/τ_1 &lt; 0.45; for top→qqq (3-prong), τ_32 = τ_3/τ_2 &lt; 0.75. Modern taggers replace hand-crafted τ ratios with JetGNNs (ParticleNet) — the same graph-analytics paradigm as systems-biology PPI networks."
        icon={<Network className="h-5 w-5" />}
        badge="mathematics"
      >
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">τ_N = (1/Σp_{"{T}"})·Σ_k min(p_{"{Tk}"}^β, Σ_i p_{"{Ti}"}^β·(ΔR_{"{ik}"}/R0)^β)</p>
            <p className="text-[11px] text-muted-foreground mt-1">N-subjettiness — measures how well the jet's constituents align with N subjets. Smaller τ_N relative to τ_1 means N-prong structure.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
              <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">Quark/gluon jet (1-prong)</p>
              <p className="font-mono text-[11px]">τ_1 ≈ 0, τ_2 ≈ τ_1</p>
              <p className="text-muted-foreground text-[11px] mt-1">Single hard particle carries most p_T. τ_21 ≈ 1 — no substructure. Hardest to tag — relies on radiation patterns.</p>
            </div>
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5">
              <p className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-1">W/Z jet (2-prong)</p>
              <p className="font-mono text-[11px]">τ_21 = τ_2/τ_1 &lt; 0.45</p>
              <p className="text-muted-foreground text-[11px] mt-1">W→qq' produces two prongs. τ_2 small relative to τ_1 — constituents align with 2 subjets.</p>
            </div>
            <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-2.5">
              <p className="font-semibold text-sm text-violet-600 dark:text-violet-400 mb-1">Top jet (3-prong)</p>
              <p className="font-mono text-[11px]">τ_32 = τ_3/τ_2 &lt; 0.75</p>
              <p className="text-muted-foreground text-[11px] mt-1">t→bW→bqq' produces three prongs. τ_3 small relative to τ_2 — constituents align with 3 subjets.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Try it: Kepler orbit, transit light curve, 3-body, jet 4-vector (Pyodide)" icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={SPACE_DEMO} buttonLabel="Run space-science simulator (Pyodide)" />
      </SectionCard>

      <SectionCard title="Low-level PyTorch — TransitCNN, GravitationalWaveClassifier, JetGNN" icon={<Cpu className="h-5 w-5" />} badge="low-level">
        <CodeBlock language="python" filename="space_science_pytorch.py" code={PYTORCH_CODE} />
      </SectionCard>

      <SectionCard
        title="Modern papers — Kepler, TESS, LIGO, LHC, JWST"
        icon={<Atom className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Kepler Mission (Borucki et al. 2010, ApJL 713:L126):</strong> The Kepler space telescope (2009–2018) monitored 150,000 stars for transits, discovering 2,778 confirmed exoplanets and ~4,000 candidates. Demonstrated that Earth-size planets around Sun-like stars are common (~10% occurrence rate). The mission's photometric precision (20 ppm/hr on a 12th-magnitude star) enabled the first rocky-planet detections. The Kepler Input Catalogue and TESS Input Catalogue together index 1.7 billion stars — the most extensive stellar database ever compiled.
          </p>
          <p>
            <strong className="text-foreground/80">TESS Mission (Ricker et al. 2015, JATIS 1:014003):</strong> The Transiting Exoplanet Survey Satellite (2018–) surveys the entire sky in 26-sectored 27-day pointings, focusing on bright (V &lt; 12) stars for follow-up characterisation. TESS has discovered 400+ confirmed exoplanets and 6,000+ candidates (TOIs). The mission produces ~200M light curves in its prime survey — each ~30,000 cadences of 2-min or 20-sec integrations — all stored in the MAST archive as Parquet + FITS files.
          </p>
          <p>
            <strong className="text-foreground/80">LIGO GW150914 (Abbott et al. 2016, PRL 116:061102):</strong> First direct detection of gravitational waves — the inspiral and merger of two black holes (36 + 29 solar masses) 410 Mpc away. The signal, observed on 14 September 2015, swept through LIGO's two 4-km interferometers (Hanford + Livingston) with a 6.9 ms delay matching light-speed travel between sites. Strain amplitude h ≈ 10⁻²¹ — the most precise length measurement ever made. By the end of O3 (2020), LIGO/Virgo had catalogued 90 GW events (50 BBH, 2 BNS, 1 NSBH, 37 marginal).
          </p>
          <p>
            <strong className="text-foreground/80">LHC Higgs Boson (ATLAS + CMS, 2012, PLB 716:1–29):</strong> Discovery of the Higgs boson at m_H ≈ 125 GeV, confirming the Standard Model's last unverified prediction (Higgs 1964). The LHC produces 40 million collisions per second at 13 TeV — only ~1000 events/s survive the trigger. After zero-suppression, ATLAS + CMS together record ~1 PB/year. Jet substructure algorithms (anti-kT, n-subjettiness, JetGNNs) identify boosted H→bb̄, W→qq', top→bqq' — the LHC's biggest machine-learning pipeline.
          </p>
          <p>
            <strong className="text-foreground/80">JWST Early Galaxies (Naidu et al. 2022, ApJL):</strong> JWST's CEERS survey revealed galaxy candidates at z ≈ 10–17 (within 300 million years of the Big Bang) — far earlier than Hubble could see. The photometric redshift technique (Lyman-break dropout) plus NIRSpec follow-up spectroscopy confirmed Lyman-α emission. JWST produces ~10 TB/day of raw imaging — Cal pipeline outputs are stored at MAST as Parquet/Arrow tables for community querying. Early-galaxy observations challenge Λ-CDM cosmology — some galaxies appear too massive too soon.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title="HPC pipeline — telescope data → calibration → ML detection → human validation → publication"
        description="End-to-end space-science HPC pipeline. Raw detector data (LHC 1 PB/year, LIGO 1 TB/day, TESS 200M light curves, JWST 10 TB/day) is calibrated and stored in Apache Parquet/Arrow (ADR-003). ML models (TransitCNN, GravitationalWaveClassifier, JetGNN) run distributed inference on Spark clusters (ADR-002). Multi-messenger coincidence (GW + EM + neutrino) filters candidates; human validation confirms; results are archived at MAST / Zenodo with DOIs and published in ApJ / PRD / Nature Astronomy. Wall-clock ranges from seconds (LIGO alerts) to years (final mission catalogues)."
        icon={<Activity className="h-5 w-5" />}
      >
        <CodeBlock language="text" filename="space_science_pipeline.txt" code={HPC_PIPELINE} />
      </SectionCard>

      <SectionCard title="My deeper thought: space science IS the ultimate big-data problem" icon={<TrendingUp className="h-5 w-5" />} badge="Insight">
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">The numbers are unambiguous: LHC ~1 PB/year, LIGO ~1 TB/day, TESS 200M light curves, JWST 10 TB/day.</strong> The LHC's ATLAS + CMS experiments together produce roughly one petabyte of physics data per year after trigger zero-suppression — comparable to the entire compressed Wikipedia corpus, every year, from a single machine. LIGO's twin interferometers stream ~1 TB/day of strain data at 4096 Hz; the cross-correlation matched-filter bank against ~300,000 chirp templates multiplies this. TESS's prime mission generated ~200M light curves — each ~30,000 cadences of 30-min integrations. JWST's NIRCam alone produces ~10 TB/day of raw imaging. The universe is, in the literal sense, the largest dataset humanity has ever tried to analyse — and the same Apache Spark / Parquet / Arrow stack that powers ADR-002 (the Databricks Lakehouse) is the software stack the space-science community adopted decades ago. The platform's modern-big-data page (BigQuery / DuckDB / Spark Streaming / Flink / Kafka / Iceberg) is the same software, applied to terrestrial financial data instead of astrophysical data. The data engineering is identical; only the schema differs.
          </p>
          <p>
            <strong className="text-foreground/80">The mathematics unifies too.</strong> Kepler's 3rd law T² = (4π²/GM)·a³ is a power law — the same log-log scaling (T ∝ a^1.5) that pervades empirical science: Zipf's law of word frequencies, Pareto's law of wealth distribution, allometric scaling in biology (Kleiber's law: metabolic rate ∝ body_mass^0.75). The transit depth ΔF/F = (Rp/Rs)² is a quadratic area ratio — the same form as a Bayesian probability ratio in any classifier. LIGO's matched filtering is mathematically equivalent to a single-layer neural network with the chirp template as the filter kernel — the matched filter's SNR² = 4∫|h̃(f)|²/S_n(f) df is the same quadratic form as the χ² statistic and as the discriminant function of a Gaussian classifier. JetGNN's EdgeConv on ΔR-distance graphs is identical to the systems-biology PPI network's GNN (proteins as nodes, interaction edges — ADR-053) and the alphaproteo binder-target GNN (residues as nodes, distance edges). The n-subjettiness τ_N formula is a weighted-sum normalisation — the same form as a softmax attention score. Every page on this platform is, mathematically, an instance of the same few primitives: weighted sums over graphs, log-log power laws, quadratic discriminants.
          </p>
          <p>
            <strong className="text-foreground/80">This unifies the entire platform under one analytical stack.</strong> ADR-049 (neural-network potentials — SO(3) irreps for equivariance) is the same mathematics that solves the orbital-mechanics angular-momentum conservation: SO(3) is the rotation group, and equivarient networks respect it for exactly the reason Kepler's 2nd law (equal areas in equal times) holds — angular momentum conservation is an SO(3) symmetry. ADR-053 (systems-biology — PPI networks + multi-omics graphs) uses the same graph analytics as JetGNN: nodes are entities (proteins or particles), edges are relationships (interactions or ΔR proximity), and the message-passing paradigm is identical. ADR-002 (Databricks Lakehouse — Spark + Parquet + Delta) is the same software stack that LIGO's Data Grid uses for matched-filter searches and that MAST uses for TESS archive queries. The progression — classical orbital mechanics (Kepler 1619) → relativistic gravity (Einstein 1916) → computational big-data astronomy (Borucki 2010, Abbott 2016) — is the same ladder of mathematical tools, scaling from analytic power laws to learned graph neural networks, applied to the same universe. The universe IS the largest dataset, and the platform's entire computational-science arc converges on its analysis: from SO(3) orbital symmetries (neural-network-potentials) to graph analytics (systems-biology) to petabyte-scale storage (databricks). Every data scientist working on this platform is, indirectly, doing space science.
          </p>
        </div>
      </SectionCard>

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("neural-network-potentials")} className="text-sm text-primary hover:underline">→ Neural Network Potentials (SO(3) irreps — same symmetry as orbital mechanics)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("systems-biology")} className="text-sm text-primary hover:underline">→ Systems Biology (same graph analytics as JetGNN)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("databricks")} className="text-sm text-primary hover:underline">→ Databricks (Spark + Parquet for PB-scale space data)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">→ Knowledge (ADR-053: graph analytics across domains)</Link>
      </div>
    </div>
  );
}
