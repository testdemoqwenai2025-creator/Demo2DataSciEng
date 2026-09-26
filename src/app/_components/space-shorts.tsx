"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  X, Atom, Zap, Sparkles, BookOpen, Telescope, Radio, Activity, Globe,
} from "lucide-react";
import { PyodideRunner } from "./pyodide-runner";

/**
 * SpaceShortsCarousel — 4 lazy-popup concept shorts for the Space Science
 * page. Mirrors quantum-shorts.tsx pattern: each short has an animated SVG
 * thumbnail + click-to-open lazy modal containing animated SVG + math +
 * Pyodide code + 2024-2025 NASA/Chinese paper citation.
 *
 * Lazy evaluation: each modal's content only mounts when its card is
 * clicked. Cards that are never opened cost zero render time.
 *
 * Topics covered:
 *   1. JWST deep field — earliest galaxies z>14, JADES survey 2023-2024
 *   2. Gravitational waves — LIGO O4 (2024) + TianQin (China 2030+) +
 *      LISA (ESA/NASA 2035+)
 *   3. Dark matter — LZ/XENONnT/PandaX-4T null results 2024 (ΛCDM vs MOND)
 *   4. FAST radio telescope — 1000+ FRB discoveries (China 2024)
 */

// Code constants imported from generated file
// (inlined here for simplicity)
const JWST_DEEP_FIELD_CODE = `import math

H0 = 67.4
Omega_m = 0.315
Omega_Lambda = 0.685
c_kms = 299792.458
D_H = c_kms / H0

def comoving_distance(z):
    N = 100
    dz = z / N
    d = 0
    for i in range(N):
        zi = i * dz
        zf = (i + 1) * dz
        Ei = 1.0 / math.sqrt(Omega_m * (1 + zi)**3 + Omega_Lambda)
        Ef = 1.0 / math.sqrt(Omega_m * (1 + zf)**3 + Omega_Lambda)
        d += 0.5 * (Ei + Ef) * dz
    return D_H * d

def lookback_time(z):
    t_H = 1.0 / H0 * 9.778
    N = 100
    dz = z / N
    t = 0
    for i in range(N):
        zi = i * dz
        zf = (i + 1) * dz
        Ei = 1.0 / ((1 + zi) * math.sqrt(Omega_m * (1 + zi)**3 + Omega_Lambda))
        Ef = 1.0 / ((1 + zf) * math.sqrt(Omega_m * (1 + zf)**3 + Omega_Lambda))
        t += 0.5 * (Ei + Ef) * dz
    return t_H * t

print("=== JWST deep field - lookback time + redshift ===")
print(f"Cosmology: H0={H0}, Omega_m={Omega_m}, Omega_Lambda={Omega_Lambda}")
print(f"Hubble time t_H = {1/H0 * 9.778:.2f} Gyr")
print()
print(f"{'z':>6} {'D_comoving (Mpc)':>18} {'Lookback (Gyr)':>16} {'Age of Universe (Gyr)':>22}")
print(f"{'-'*6:>6} {'-'*18:>18} {'-'*16:>16} {'-'*22:>22}")
for z in [0.5, 1.0, 2.0, 5.0, 7.0, 10.0, 14.0, 20.0]:
    D = comoving_distance(z)
    t_lb = lookback_time(z)
    t_age = 13.8 - t_lb
    print(f"{z:>6.1f} {D:>18.1f} {t_lb:>16.2f} {t_age:>22.2f}")

print()
print("=== JADES-GS-z14-0 (Naidu et al. 2023, JWST NIRCam) ===")
z = 14.32
print(f"z = {z} -> lookback time {lookback_time(z):.2f} Gyr")
print(f"  -> observed ~300 Myr after Big Bang")
print(f"  -> galaxy mass ~5e8 M_sun (impossibly massive for early Universe)")
print(f"  -> challenges Lambda-CDM structure formation predictions")
print()
print("=== JWST vs Hubble deep field ===")
print(f"Hubble XDF (2012): z ~ 8-10, ~5500 galaxies, lookback ~13.2 Gyr")
print(f"JWST JADES (2023): z ~ 11-15, ~100,000 galaxies, lookback ~13.5 Gyr")
print(f"JWST sees 100x deeper in IR (2 um) than Hubble in optical (0.5 um)")`;

const GRAVITATIONAL_WAVES_CODE = `import math

G = 6.674e-11
c = 2.998e8
M_sun = 1.989e30
Mpc = 3.086e22

def chirp_mass(m1, m2):
    return (m1 * m2)**0.6 / (m1 + m2)**0.2

def gw_strain(m1_msun, m2_msun, freq_hz, distance_mpc):
    Mc = chirp_mass(m1_msun, m2_msun)
    h0 = 1e-21
    h = h0 * (Mc / 30)**(5/3) * (freq_hz / 100)**(2/3) * (500 / distance_mpc)
    return h, Mc

print("=== GW150914 (LIGO first detection, 2015) ===")
m1, m2, f, D = 36, 29, 100, 410
h, Mc = gw_strain(m1, m2, f, D)
print(f"  m1 = {m1} Msun, m2 = {m2} Msun")
print(f"  Chirp mass Mc = {Mc:.1f} Msun")
print(f"  Frequency f = {f} Hz (peak)")
print(f"  Distance D = {D} Mpc")
print(f"  Strain h = {h:.2e}")
print(f"  -> LIGO measured length change ~1e-18 m in 4 km arm")
print(f"  -> about 1/10000 of a proton width!")

print()
print("=== Notable GW events (LIGO O1-O3, 2015-2020) ===")
events = [
    ("GW150914", 36, 29, 410, 100, "First detection (2015)"),
    ("GW170817", 1.46, 1.27, 40, 100, "Neutron star merger (2017)"),
    ("GW190521", 85, 66, 5300, 100, "IMBH formation (2019)"),
    ("GW190412", 30, 8, 2800, 100, "Asymmetric mass"),
    ("GW190814", 23, 2.6, 2400, 100, "2.6 Msun object - NS or BH?"),
]
print(f"  {'Event':<12} {'m1':>5} {'m2':>5} {'D(Mpc)':>8} {'f(Hz)':>6} {'h_strain':>12}  Notes")
for name, m1, m2, D, f, note in events:
    h, Mc = gw_strain(m1, m2, f, D)
    print(f"  {name:<12} {m1:>5} {m2:>5} {D:>8} {f:>6} {h:>12.2e}  {note}")

print()
print("=== LIGO O4 (May 2023 - present) ===")
print(f"  Sensitivity ~3x O3, ~70 new BBH candidates (late 2024)")
print(f"  Range: ~550 Mpc for BNS, ~2.5 Gpc for BBH")

print()
print("=== TianQin (China, 2030+) + LISA (ESA/NASA, 2035+) ===")
print(f"  Space-based, mHz band (not LIGO Hz band)")
print(f"  Detects supermassive BH mergers (10^6-10^9 Msun)")
print(f"  TianQin: 3 sats in geocentric orbit, 170,000 km separation")
print(f"  LISA: 3 sats in heliocentric orbit, 2.5 million km separation")
print(f"  Both will see ~10,000 sources over mission lifetime")`;

const DARK_MATTER_CODE = `import math

rho_dm = 0.3
v_earth = 220
m_chi = 50
m_xenon = 131

def expected_events(sigma_SI_cm2, exposure_ton_year):
    N_A = 6.022e23
    n_xenon_per_kg = N_A / (m_xenon * 1.66e-27)
    n_xenon_per_ton = n_xenon_per_kg * 1000
    v_cm = v_earth * 1e5
    rho_cgs = rho_dm * 1e-3 * (1.783e-24)
    flux = rho_cgs / (m_chi * 1.783e-24) * v_cm
    rate_per_kg = flux * sigma_SI_cm2 * n_xenon_per_kg
    events = rate_per_kg * exposure_ton_year * 1000 * 3.15e7
    return events

print("=== Dark matter experiments status (2024-2025) ===")
experiments = [
    ("LZ (US)", 5.5, 5.5e-48, "2024 result, 60 live-days"),
    ("XENONnT (Italy)", 8.6, 6.0e-48, "2024 result"),
    ("PandaX-4T (China)", 4.0, 5.0e-48, "2024 result, Jinping lab"),
    ("DarkSide-50 (Italy)", 0.05, 1.0e-40, "Argon TPC, smaller"),
    ("DEAP-3600 (Canada)", 0.36, 1.0e-46, "Argon"),
]
print(f"  {'Experiment':<22} {'Exposure':>10} {'Best sigma_SI (cm^2)':>22}  Status")
for name, exp, sigma, note in experiments:
    events = expected_events(sigma, exp)
    print(f"  {name:<22} {exp:>6.2f} t*yr {sigma:>22.2e}  {note}  ({events:.4f} expected)")

print()
print("=== WIMP-nucleon cross section upper limits (90% CL) ===")
print(f"  2007: ~1e-7 cm^2 (XENON10)")
print(f"  2018: ~1e-47 cm^2 (XENON1T)")
print(f"  2024: ~5e-48 cm^2 (LZ, XENONnT, PandaX-4T) - 100x improvement in 17 years")
print(f"  -> No WIMPs found yet")
print(f"  -> Next: XLZD (xenon) + DARWIN (multi-target), 50 t*yr exposure")

print()
print("=== Dark matter alternatives (in contention) ===")
print(f"  1. Axion (pseudoscalar, QCD CP problem)")
print(f"  2. Hidden sector / dark photons")
print(f"  3. Primordial black holes (Hawking evaporation search)")
print(f"  4. Modified gravity (MOND - no DM needed for rotation curves)")
print(f"  5. Emergent gravity (Verlinde 2016 - DM is thermodynamic effect)")`;

const FAST_FRB_CODE = `import math

D_fast = 500
D_arecibo = 305
A_fast = math.pi * (D_fast / 2)**2
A_arecibo = math.pi * (D_arecibo / 2)**2

print("=== FAST vs Arecibo (decommissioned Dec 2020) ===")
print(f"  FAST aperture: {D_fast} m diameter, area = {A_fast:.0f} m^2")
print(f"  Arecibo aperture: {D_arecibo} m diameter, area = {A_arecibo:.0f} m^2")
print(f"  FAST collecting area: {A_fast / A_arecibo:.2f}x Arecibo")
print(f"  FAST sky coverage: -14 deg to +66 deg declination")
print(f"  FAST first light: 2016, full operation: 2020+")
print(f"  Located in Guizhou, China (Pingtang County)")

print()
print("=== FRB (Fast Radio Burst) basic properties ===")
print(f"  FRB duration: ~1 ms to ~30 ms")
print(f"  Energy released: ~10^38 - 10^41 erg (in radio band)")
print(f"  Distance: typically z > 0.1, host galaxies confirmed for ~20 FRBs")
print()
print("=== Dispersion measure (DM) and redshift ===")
print(f"  DM ~ 1000 pc/cm^3 -> z ~ 1")
print(f"  DM ~ 1200 pc/cm^3 -> z ~ 1.5")
print(f"  DM ~ 3000 pc/cm^3 -> z ~ 3 (highest known)")

def dm_delay_ms(dm, f1_ghz, f2_ghz):
    return 4.15e3 * dm * (1 / f1_ghz**2 - 1 / f2_ghz**2)

print()
print("=== FRB DM-induced delay (ms) for 1.0 GHz vs 1.5 GHz ===")
for dm in [100, 500, 1000, 1500, 3000]:
    delay = dm_delay_ms(dm, 1.0, 1.5)
    print(f"  DM = {dm:>5} pc/cm^3 -> delay = {delay:.1f} ms")

print()
print("=== FAST FRB discoveries (2024 update) ===")
print(f"  FAST detected 1000+ FRBs (2024), 5x all other telescopes combined")
print(f"  Repeaters: ~20 confirmed out of ~1000 sources (2%)")
print(f"  FRB 20190520B: persistent radio counterpart discovered (FAST 2022)")
print(f"  FRB 20201124A: complicated polarization angle swings (FAST 2022)")
print(f"  FRB 20240106: fastest repeating FRB, 1.5 ms (FAST 2024)")
print()
print("=== FRB origin theories (contention) ===")
print(f"  1. Magnetar flares (SGR 1935+2154 in 2020 confirmed link)")
print(f"  2. Merging neutron stars / black holes")
print(f"  3. Cosmic strings / primordial black holes")
print(f"  4. Exotic: warp drives, alien signals (mostly ruled out)")
print(f"  Best model: magnetar + B-field reconfiguration (Bochenek+2020)")`;

// ============================================================
// Animated SVG thumbnails (small previews that render in cards)
// ============================================================

function JWSTDeepFieldThumbnail({ accent }: { accent: string }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 0.02) % (2 * Math.PI)), 50);
    return () => clearInterval(id);
  }, []);
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <defs>
        <radialGradient id="jwst-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.8" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="140" fill="oklch(0.10 0.05 250)" />
      {/* Random galaxies */}
      {Array.from({ length: 12 }).map((_, i) => {
        const x = (i * 37) % 90 + 5;
        const y = (i * 53) % 130 + 5;
        const r = 1 + (i % 3);
        const opacity = 0.3 + 0.5 * Math.abs(Math.sin(phase + i));
        return (
          <motion.circle key={i} cx={x} cy={y} r={r}
            fill={accent} opacity={opacity}
            animate={{ opacity: [opacity * 0.5, opacity, opacity * 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
          />
        );
      })}
      {/* Central bright galaxy */}
      <circle cx="50" cy="70" r="6" fill="url(#jwst-grad)" />
      <text x="50" y="130" textAnchor="middle" fontSize="6" fill={accent} fontWeight="bold">JWST deep field</text>
    </svg>
  );
}

function GravitationalWavesThumbnail({ accent }: { accent: string }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 0.08) % (2 * Math.PI)), 50);
    return () => clearInterval(id);
  }, []);
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <line x1="10" y1="70" x2="90" y2="70" stroke="oklch(0.55 0.10 250 / 0.3)" strokeWidth="0.5" />
      <motion.path
        d={`M 10 70 Q 20 ${70 - 15 * Math.sin(phase)} 30 70 T 50 70 T 70 70 T 90 70`}
        fill="none" stroke={accent} strokeWidth="1.5"
        animate={{ d: `M 10 70 Q 20 ${70 - 15 * Math.sin(phase)} 30 70 T 50 70 T 70 70 T 90 70` }}
        transition={{ duration: 0.05 }}
      />
      {/* LIGO detector */}
      <text x="50" y="25" textAnchor="middle" fontSize="6" fill={accent} fontWeight="bold">h ~ 10⁻²¹</text>
      <text x="50" y="120" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.10 250)">LIGO + TianQin</text>
    </svg>
  );
}

function DarkMatterThumbnail({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      {/* Galaxy rotation curve */}
      <line x1="10" y1="115" x2="90" y2="115" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <line x1="10" y1="25" x2="10" y2="115" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <motion.path d="M 10 30 Q 25 75 50 90 T 90 100"
        fill="none" stroke={accent} strokeWidth="1.5"
        animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }}
      />
      {[20, 35, 50, 65, 80].map((x, i) => (
        <circle key={i} cx={x} cy={90 - i * 3} r="1.5" fill="oklch(0.85 0.18 25)" />
      ))}
      <text x="50" y="135" textAnchor="middle" fontSize="6" fill={accent} fontWeight="bold">NGC 3198 rotation</text>
    </svg>
  );
}

function FASTTelescopeThumbnail({ accent }: { accent: string }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 0.04) % (2 * Math.PI)), 50);
    return () => clearInterval(id);
  }, []);
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      {/* FAST dish - large circle */}
      <ellipse cx="50" cy="80" rx="35" ry="20" fill={accent} opacity="0.3" stroke={accent} strokeWidth="1" />
      {/* Radio waves emanating */}
      {[0, 1, 2, 3].map(i => (
        <motion.circle key={i} cx="50" cy="80" r={20 + i * 8}
          fill="none" stroke={accent} strokeWidth="0.5"
          animate={{ r: [20 + i * 8, 28 + i * 8, 20 + i * 8], opacity: [0.5, 0.1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
      <text x="50" y="20" textAnchor="middle" fontSize="7" fill={accent} fontWeight="bold">500m dish</text>
      <text x="50" y="130" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.10 250)">FAST (China)</text>
    </svg>
  );
}

// ============================================================
// Detail content (modal body) for each short
// ============================================================

function JWSTDeepFieldDetail() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border/60 bg-card p-4">
        <div className="flex justify-center">
          <div className="w-48 h-64">
            <JWSTDeepFieldThumbnail accent="oklch(0.55 0.16 60)" />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          JWST&apos;s NIRCam captures infrared light from galaxies that formed 300 million years after the Big Bang —
          the earliest light ever detected. The deep field is the &ldquo;ultra-deep&rdquo; survey (100+ hours of exposure).
        </p>
      </div>
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
        <p className="font-mono text-sm text-primary">z = (λ_obs - λ_emit) / λ_emit</p>
        <p className="font-mono text-xs mt-1">v = H₀ · d  (Hubble&apos;s law for nearby galaxies)</p>
        <p className="text-[11px] text-muted-foreground mt-1">Redshift z encodes both distance and lookback time. JWST sees z&gt;14 — light from when Universe was 2% of current age.</p>
      </div>
      <PyodideRunner
        buttonLabel="Run JWST lookback time + redshift (Pyodide)"
        code={JWST_DEEP_FIELD_CODE}
      />
      <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
        <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5 mb-1.5">
          <BookOpen className="h-3 w-3" /> Recent research (2023-2024)
        </p>
        <p className="text-xs text-foreground/80 leading-relaxed">
          <strong>Naidu et al. (2023), &ldquo;JWST NIRCam detection of JADES-GS-z14-0&rdquo;</strong> (Nature).
          This galaxy at z=14.32 was observed ~300 Myr after the Big Bang with stellar mass ~5×10⁸ M☉ —
          &ldquo;impossibly massive&rdquo; for ΛCDM structure formation predictions. JWST&apos;s JADES survey
          (Joint Array of Deep Extragalactic Surveys) has found ~100 galaxies at z&gt;10 in 2023-2024,
          challenging the standard cosmological model. Hubble tension (Planck H₀=67.4 vs SH0ES H₀=73.04)
          intensifies — is ΛCDM wrong, or are our measurements?
        </p>
      </div>
    </div>
  );
}

function GravitationalWavesDetail() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border/60 bg-card p-4">
        <div className="flex justify-center">
          <div className="w-48 h-64">
            <GravitationalWavesThumbnail accent="oklch(0.55 0.16 165)" />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          LIGO measures spacetime strain h ~ 10⁻²¹ — length changes of 1/10,000 proton width across 4 km arms.
          The waveform encodes the binary&apos;s masses, spins, and merger physics.
        </p>
      </div>
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
        <p className="font-mono text-sm text-primary">h = (4G/c⁴)·(d²I/dt²)/r</p>
        <p className="font-mono text-xs mt-1">M_chirp = (m₁m₂)^(3/5) / (m₁+m₂)^(1/5)</p>
        <p className="text-[11px] text-muted-foreground mt-1">Strain scales as M_chirp^(5/3) × f^(2/3) / D. LIGO O4 range: 2.5 Gpc for BBH.</p>
      </div>
      <PyodideRunner
        buttonLabel="Run GW strain + binary catalogue (Pyodide)"
        code={GRAVITATIONAL_WAVES_CODE}
      />
      <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
        <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5 mb-1.5">
          <BookOpen className="h-3 w-3" /> Recent research (2024)
        </p>
        <p className="text-xs text-foreground/80 leading-relaxed">
          <strong>LIGO O4 (May 2023+):</strong> ~3× sensitivity vs O3, ~70 new BBH candidates by late 2024.
          Range: 550 Mpc for BNS, 2.5 Gpc for BBH. <strong>China&apos;s TianQin (2030+)</strong>: 3 satellites in
          geocentric orbit at 170,000 km separation — detects mHz GWs from supermassive BH mergers.
          <strong>LISA (ESA/NASA, 2035+):</strong> 3 satellites in heliocentric orbit, 2.5M km separation —
          same mHz band, complementary to TianQin. Together LIGO + TianQin + LISA cover 6 decades of GW frequency.
        </p>
      </div>
    </div>
  );
}

function DarkMatterDetail() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border/60 bg-card p-4">
        <div className="flex justify-center">
          <div className="w-48 h-64">
            <DarkMatterThumbnail accent="oklch(0.55 0.16 320)" />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          The flat rotation curve of NGC 3198 (and thousands of other galaxies) is the strongest empirical
          evidence for dark matter. Visible matter alone predicts Keplerian fall-off (1/√r); observations stay flat.
        </p>
      </div>
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
        <p className="font-mono text-sm text-primary">v_visible(r) = √(GM_visible/r)</p>
        <p className="font-mono text-xs mt-1">v_halo(r) → const at large r</p>
        <p className="text-[11px] text-muted-foreground mt-1">Total: v_rot² = v_visible² + v_halo². Flat observed → ~85% of galaxy mass is dark.</p>
      </div>
      <PyodideRunner
        buttonLabel="Run DM direct detection + alternatives (Pyodide)"
        code={DARK_MATTER_CODE}
      />
      <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
        <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5 mb-1.5">
          <BookOpen className="h-3 w-3" /> Recent research (2024)
        </p>
        <p className="text-xs text-foreground/80 leading-relaxed">
          <strong>LZ (US, 2024):</strong> 5.5t xenon TPC, 60 live-days, no WIMPs found. Best upper limit: σ_SI ~5×10⁻⁴⁸ cm².
          <strong>XENONnT (Italy, 2024):</strong> 8.6t xenon, similar null result.
          <strong>PandaX-4T (China, 2024):</strong> 4t xenon at Jinping Underground Laboratory, competitive null.
          100× improvement in 17 years, but no WIMPs yet. Alternatives in contention: <strong>axions</strong> (ADMX-HF 2024),
          <strong>MOND</strong> (Milgrom — modifies gravity at low acceleration), <strong>emergent gravity</strong> (Verlinde 2016).
        </p>
      </div>
    </div>
  );
}

function FASTTelescopeDetail() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border/60 bg-card p-4">
        <div className="flex justify-center">
          <div className="w-48 h-64">
            <FASTTelescopeThumbnail accent="oklch(0.55 0.16 250)" />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          FAST (Five-hundred-meter Aperture Spherical radio Telescope) in Guizhou, China — 2.7× Arecibo&apos;s
          collecting area. Discovered 1000+ FRBs since 2020, more than all other telescopes combined.
        </p>
      </div>
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
        <p className="font-mono text-sm text-primary">t_delay = 4.15×10³ ms · DM · (f₁⁻² - f₂⁻²)</p>
        <p className="font-mono text-xs mt-1">DM = ∫ n_e dl (pc/cm³) — electron column density</p>
        <p className="text-[11px] text-muted-foreground mt-1">FRB at z=1 has DM~1000 pc/cm³, delay ~6200 ms between 1.0 and 1.5 GHz.</p>
      </div>
      <PyodideRunner
        buttonLabel="Run FAST FRB analysis (Pyodide)"
        code={FAST_FRB_CODE}
      />
      <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
        <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5 mb-1.5">
          <BookOpen className="h-3 w-3" /> Recent research (2024)
        </p>
        <p className="text-xs text-foreground/80 leading-relaxed">
          <strong>FAST (China, 2024 update):</strong> 1000+ FRBs detected, 5× all other telescopes combined.
          FRB 20240106 (FAST, 2024): fastest repeating FRB, 1.5 ms duration. FRB 20190520B (FAST, 2022): first
          persistent radio counterpart discovered. FRB origin: <strong>magnetar flares</strong> (SGR 1935+2154 confirmed link in 2020)
          is the leading model, but cosmic strings, primordial black holes, and exotic explanations remain in contention.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Shorts metadata + main carousel
// ============================================================

interface ShortMeta {
  id: string;
  step: string;
  hookTitle: string;
  subtitle: string;
  accent: string;
  thumbnail: ReactNode;
  detail: ReactNode;
}

const SHORTS: ShortMeta[] = [
  {
    id: "jwst",
    step: "1",
    hookTitle: "Earliest light — 300 Myr after the Big Bang",
    subtitle: "z > 14 — JWST NIRCam deep field 2023",
    accent: "oklch(0.55 0.16 60)",
    thumbnail: <JWSTDeepFieldThumbnail accent="oklch(0.55 0.16 60)" />,
    detail: <JWSTDeepFieldDetail />,
  },
  {
    id: "gw",
    step: "2",
    hookTitle: "Spacetime ripples — 1/10,000 of a proton",
    subtitle: "h ~ 10⁻²¹ — LIGO O4 + TianQin + LISA",
    accent: "oklch(0.55 0.16 165)",
    thumbnail: <GravitationalWavesThumbnail accent="oklch(0.55 0.16 165)" />,
    detail: <GravitationalWavesDetail />,
  },
  {
    id: "dm",
    step: "3",
    hookTitle: "85% invisible — where is the dark matter?",
    subtitle: "LZ/XENONnT/PandaX null 2024 — ΛCDM vs MOND",
    accent: "oklch(0.55 0.16 320)",
    thumbnail: <DarkMatterThumbnail accent="oklch(0.55 0.16 320)" />,
    detail: <DarkMatterDetail />,
  },
  {
    id: "fast",
    step: "4",
    hookTitle: "1000+ cosmic flashes — China&apos;s FAST dish",
    subtitle: "FRB discoveries 2020-2024 — magnetar origin",
    accent: "oklch(0.55 0.16 250)",
    thumbnail: <FASTTelescopeThumbnail accent="oklch(0.55 0.16 250)" />,
    detail: <FASTTelescopeDetail />,
  },
];

export function SpaceShortsCarousel() {
  const [openId, setOpenId] = useState<string | null>(null);
  const openShort = openId ? SHORTS.find(s => s.id === openId) : null;

  useEffect(() => {
    if (!openId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [openId]);

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5 flex-wrap">
        <Zap className="h-3 w-3 text-amber-500" />
        Click any short to open a lazy popup — animated SVG + math equation + Pyodide-runnable Python code + 2024-2025 NASA/Chinese paper citation.
        <span className="text-[10px]">Modal content only mounts on click.</span>
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SHORTS.map(s => (
          <motion.button
            key={s.id}
            type="button"
            onClick={() => setOpenId(s.id)}
            className="relative rounded-xl overflow-hidden border border-border/60 hover:border-primary/60 hover:shadow-lg transition-all bg-gradient-to-br from-card to-muted/30 group"
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            aria-label={`Open short: ${s.hookTitle}`}
          >
            <div className="relative w-full bg-gradient-to-br from-muted/40 to-card" style={{ aspectRatio: "9 / 16", maxHeight: 320 }}>
              <div className="absolute inset-0 p-2">
                {s.thumbnail}
              </div>
              <div className="absolute top-2 left-2 z-10">
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-0.5"
                  style={{ backgroundColor: s.accent + "20", color: s.accent }}>
                  <Sparkles className="h-2.5 w-2.5" /> SPACE {s.step}
                </Badge>
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ opacity: 1, scale: 1 }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur rounded-full p-2.5 border border-border shadow-md"
                >
                  <Telescope className="h-4 w-4 text-primary" />
                </motion.div>
              </div>
            </div>
            <div className="p-2.5 border-t border-border/40 bg-background/80">
              <p className="text-xs font-semibold leading-tight" style={{ color: s.accent }}>
                {s.hookTitle}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{s.subtitle}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* LAZY modal */}
      <AnimatePresence>
        {openShort && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 md:p-6 overflow-y-auto"
            onClick={() => setOpenId(null)}
          >
            <button
              type="button" onClick={() => setOpenId(null)}
              className="absolute top-3 right-3 z-30 p-2 rounded-full bg-background/90 border border-border hover:bg-accent transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="absolute top-3 left-3 z-30 px-3 py-1.5 rounded-full bg-background/90 border border-border flex items-center gap-2 text-xs font-semibold">
              <Telescope className="h-3.5 w-3.5" style={{ color: openShort.accent }} />
              <span style={{ color: openShort.accent }}>SPACE {openShort.step} · {openShort.hookTitle}</span>
            </div>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-3xl my-8 rounded-xl border border-border bg-background shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 md:p-6 max-h-[85vh] overflow-y-auto">
                {openShort.detail}
              </div>
              <div className="border-t border-border/40 bg-muted/20 px-4 md:px-6 py-2.5 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>← click outside or press Esc to close</span>
                <span className="font-mono">{SHORTS.findIndex(s => s.id === openShort.id) + 1} / {SHORTS.length}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
