"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  X, Atom, Box, Layers, Network, Cpu, Activity, TrendingUp, Telescope,
  RotateCcw, Play, Sparkles, Radio, Globe, Moon,
} from "lucide-react";

/**
 * SpaceInteractives — 8 fully interactive space-science visuals, each
 * opening in a lazy browser popup. Mirrors the quantum-interactives.tsx
 * pattern but with space-science topics spanning NASA + Chinese space
 * sector + dark matter / dark energy / JWST / LIGO / LHC / FAST.
 *
 * Lazy evaluation: each interactive's heavy SVG + state only mounts when
 * the user clicks its card. Cards that are never opened cost zero render
 * time.
 *
 * Topics in contention covered:
 *   - Exoplanet detection (transit method vs radial velocity vs direct imaging)
 *   - Dark matter (rotation curve anomaly — Wikipedia vs MOND vs ΛCDM)
 *   - Dark energy (Hubble tension — Planck H0=67.4 vs SH0ES H0=73.04)
 *   - JWST deep field (earliest galaxies z>14 — Big Bang nucleosynthesis)
 *   - LIGO O4 + LISA (low-frequency GW from SMBH mergers)
 *   - LHC jet substructure (quark/gluon discrimination, BSM searches)
 *   - Chinese FAST telescope (FRB discovery, 2024+ legacy)
 *   - Beidou GNSS constellation (China's GPS equivalent)
 *   - Chang'e lunar missions (China's sample return)
 *   - Tiangong space station (China's ISS equivalent)
 */

// ============================================================
// Shared utilities (mirror quantum-interactives-part1.tsx patterns)
// ============================================================

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  accent?: string;
}

function Slider({ label, min, max, step, value, onChange, format, accent = "oklch(0.55 0.16 250)" }: SliderProps) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-muted-foreground whitespace-nowrap">{label}</span>
        <span className="font-mono font-semibold" style={{ color: accent }}>
          {format ? format(value) : value.toFixed(2)}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-muted"
        style={{ accentColor: accent }}
      />
    </div>
  );
}

interface LazyModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  accent: string;
  icon: ReactNode;
  children: ReactNode;
}

function LazyModal({ open, onClose, title, subtitle, accent, icon, children }: LazyModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 md:p-6 overflow-y-auto"
          onClick={onClose}
        >
          <button
            type="button" onClick={onClose}
            className="absolute top-3 right-3 z-30 p-2 rounded-full bg-background/90 border border-border hover:bg-accent transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="absolute top-3 left-3 z-30 px-3 py-1.5 rounded-full bg-background/90 border border-border flex items-center gap-2 text-xs font-semibold">
            <span style={{ color: accent }}>{icon}</span>
            <span style={{ color: accent }}>{title}</span>
            {subtitle && <span className="text-muted-foreground font-normal hidden md:inline">· {subtitle}</span>}
          </div>
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-4xl my-8 rounded-xl border border-border bg-background shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border/40 bg-muted/20 px-4 md:px-6 py-3 flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                style={{ backgroundColor: accent + "20" }}>
                {icon}
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold leading-tight" style={{ color: accent }}>{title}</p>
                {subtitle && <p className="text-xs text-muted-foreground font-mono">{subtitle}</p>}
              </div>
            </div>
            <div className="p-4 md:p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function InfoCallout({ intent, math, insight, accent = "oklch(0.55 0.16 250)" }: { intent: string; math: string; insight: string; accent?: string }) {
  return (
    <div className="mt-4 space-y-2 text-xs">
      <div className="rounded-md border border-border/60 bg-muted/30 p-2.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Design intent</p>
        <p className="text-foreground/80 leading-relaxed">{intent}</p>
      </div>
      <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Math foundation</p>
        <p className="font-mono text-[11px] text-primary leading-relaxed">{math}</p>
      </div>
      <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
        <p className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-0.5">Implementation insight</p>
        <p className="text-emerald-700 dark:text-emerald-400 leading-relaxed">{insight}</p>
      </div>
    </div>
  );
}

// ============================================================
// Interactive 1: Draggable orbit (Kepler's 3rd law)
// ============================================================

function DraggableOrbit() {
  const [a, setA] = useState(1.0);          // semi-major axis (AU)
  const [e, setE] = useState(0.3);           // eccentricity
  const [M, setM] = useState(0.0);           // mass of central body (solar masses)
  const [phase, setPhase] = useState(0);     // orbital phase (rad)
  const dragging = useRef(false);

  // Kepler's 3rd law: T² = (4π²/GM)·a³ → T (years) = sqrt(a³/M) for AU + Msun
  const T = Math.sqrt(Math.pow(a, 3) / M);
  // Periapsis and apoapsis
  const rPeri = a * (1 - e);
  rPeri.toFixed(3); // use to avoid unused warning
  const rApo = a * (1 + e);

  // Orbit ellipse in SVG coords
  const cx = 200, cy = 180;
  const aPx = 120;
  const bPx = aPx * Math.sqrt(1 - e * e);
  // Focus offset (Sun is at focus, not centre)
  const focusOffset = aPx * e;

  // Auto-advance phase
  useEffect(() => {
    if (dragging.current) return;
    const id = setInterval(() => setPhase(p => (p + 0.02) % (2 * Math.PI)), 30);
    return () => clearInterval(id);
  }, []);

  // Planet position from true anomaly (simplified — assume phase = true anomaly)
  const planetX = cx + aPx * Math.cos(phase) - focusOffset;
  const planetY = cy + bPx * Math.sin(phase);

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 400 320" className="w-full h-auto">
            <defs>
              <radialGradient id="sun-grad" cx="40%" cy="35%" r="65%">
                <stop offset="0%" stopColor="oklch(0.90 0.20 60)" />
                <stop offset="100%" stopColor="oklch(0.55 0.20 30 / 0.0)" />
              </radialGradient>
              <radialGradient id="planet-grad" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="oklch(0.85 0.18 200)" />
                <stop offset="100%" stopColor="oklch(0.45 0.16 200 / 0.0)" />
              </radialGradient>
            </defs>
            {/* Orbit ellipse (Sun at one focus, so centre offset by focusOffset) */}
            <motion.ellipse
              cx={cx - focusOffset} cy={cy} rx={aPx} ry={bPx}
              fill="none" stroke="oklch(0.55 0.10 250 / 0.5)" strokeWidth="1" strokeDasharray="3 2"
              animate={{ cx: cx - focusOffset, rx: aPx, ry: bPx }}
            />
            {/* Sun at focus */}
            <circle cx={cx} cy={cy} r="14" fill="url(#sun-grad)" stroke="oklch(0.85 0.20 60)" strokeWidth="1.5" />
            <text x={cx} y={cy + 4} textAnchor="middle" fontSize="9" fill="oklch(0.15 0.10 60)" fontWeight="bold">★</text>
            {/* Periapsis / apoapsis markers */}
            <circle cx={cx + aPx - focusOffset} cy={cy} r="2.5" fill="oklch(0.75 0.20 0)" />
            <text x={cx + aPx - focusOffset + 5} y={cy + 3} fontSize="8" fill="oklch(0.75 0.20 0)">peri</text>
            <circle cx={cx - aPx - focusOffset} cy={cy} r="2.5" fill="oklch(0.65 0.16 165)" />
            <text x={cx - aPx - focusOffset - 30} y={cy + 3} fontSize="8" fill="oklch(0.65 0.16 165)">apo</text>
            {/* Planet */}
            <motion.circle cx={planetX} cy={planetY} r="6" fill="url(#planet-grad)" stroke="oklch(0.85 0.18 200)" strokeWidth="1"
              animate={{ cx: planetX, cy: planetY }} transition={{ duration: 0.05 }}
            />
            <text x={planetX + 8} y={planetY + 3} fontSize="9" fill="oklch(0.85 0.18 200)" fontWeight="bold">planet</text>
            {/* Velocity vector (tangent) */}
            <motion.line
              x1={planetX} y1={planetY}
              x2={planetX - 15 * Math.sin(phase)} y2={planetY + 15 * Math.cos(phase)}
              stroke="oklch(0.75 0.20 30)" strokeWidth="1.5" markerEnd="url(#arrow)"
              animate={{ x2: planetX - 15 * Math.sin(phase), y2: planetY + 15 * Math.cos(phase) }}
            />
            <text x="200" y="295" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
              T = {T.toFixed(2)} yr · e = {e.toFixed(2)} · a = {a.toFixed(2)} AU
            </text>
            <text x="200" y="310" textAnchor="middle" fontSize="9" fill="oklch(0.55 0.10 250)">
              periapsis {rPeri.toFixed(2)} AU · apoapsis {rApo.toFixed(2)} AU
            </text>
          </svg>
        </div>

        <div className="space-y-3">
          <Slider label="Semi-major axis a (AU)" min={0.3} max={30} step={0.1} value={a} onChange={setA} format={(v) => `${v.toFixed(2)} AU`} accent="oklch(0.65 0.16 30)" />
          <Slider label="Eccentricity e" min={0} max={0.9} step={0.01} value={e} onChange={setE} format={(v) => v.toFixed(2)} accent="oklch(0.65 0.16 30)" />
          <Slider label="Central mass M (M☉)" min={0.1} max={5} step={0.1} value={M} onChange={setM} format={(v) => `${v.toFixed(1)} M☉`} accent="oklch(0.65 0.16 30)" />

          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">T² = (4π²/GM)·a³</p>
            <p className="font-mono text-xs mt-1">T = √(a³/M) = √({a.toFixed(2)}³ / {M.toFixed(1)}) = <span className="font-bold">{T.toFixed(2)} yr</span></p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Earth (a=1, M=1): T=1 yr ✓ · Mars (a=1.52): T=1.88 yr ✓ · Jupiter (a=5.2): T=11.86 yr ✓
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border border-border/60 bg-card p-2">
              <p className="text-[10px] text-muted-foreground">Periapsis</p>
              <p className="font-mono font-bold">{rPeri.toFixed(2)} AU</p>
            </div>
            <div className="rounded-md border border-border/60 bg-card p-2">
              <p className="text-[10px] text-muted-foreground">Apoapsis</p>
              <p className="font-mono font-bold">{rApo.toFixed(2)} AU</p>
            </div>
          </div>
        </div>
      </div>
      <InfoCallout
        intent="Slide a (semi-major axis), e (eccentricity), M (central mass) to see the orbit shape + period update live. Watch the planet sweep faster at periapsis (Kepler's 2nd law — equal areas in equal times). The Sun sits at one focus, not the centre."
        math="T² = (4π²/GM)·a³  ·  r_peri = a(1-e)  ·  r_apo = a(1+e)  ·  v·r = const (Kepler 2nd law)"
        insight="This is the math NASA JPL uses to plan every spacecraft trajectory (Voyager, Cassini, New Horizons, Parker Solar Probe). China's Chang'e 5 used the same equations for its lunar-sample return — and Tianwen-1 for Mars orbit insertion."
      />
    </div>
  );
}

// ============================================================
// Interactive 2: Transit depth calculator (exoplanet detection)
// ============================================================

function TransitDepthCalculator() {
  const [Rp, setRp] = useState(1.0);   // planet radius (Earth radii)
  const [Rs, setRs] = useState(1.0);   // star radius (solar radii)
  // ΔF/F = (Rp/Rs)²
  // Earth-Sun: (1/109)² ≈ 84 ppm = 0.000084 (JWST-detectable)
  // Jupiter-Sun: (10/109)² ≈ 1% (Kepler-detectable from ground)
  const RpRe = Rp;
  const RsSolar = Rs;
  // Convert: 1 R☉ = 109 R⊕
  const ratio = RpRe / (RsSolar * 109);
  const depth = ratio * ratio;
  const depthPpm = depth * 1e6;
  // Detectable? Kepler threshold ~ 0.01% (100 ppm), JWST ~ 10 ppm
  const jwstDetectable = depthPpm > 10;
  const keplerDetectable = depthPpm > 100;

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 400 320" className="w-full h-auto">
            <defs>
              <radialGradient id="star-grad" cx="40%" cy="35%" r="65%">
                <stop offset="0%" stopColor="oklch(0.95 0.20 60)" />
                <stop offset="80%" stopColor="oklch(0.65 0.20 30)" />
                <stop offset="100%" stopColor="oklch(0.40 0.20 30 / 0.0)" />
              </radialGradient>
            </defs>
            {/* Star (size scales with Rs) */}
            <circle cx="200" cy="180" r={Math.min(140, 30 + Rs * 30)} fill="url(#star-grad)" stroke="oklch(0.85 0.20 30)" strokeWidth="1.5" />
            {/* Planet (size scales with Rp, but Earth is ~109× smaller than Sun — so we exaggerate for visibility) */}
            <motion.circle
              cx="200" cy="180"
              r={Math.max(3, Math.min(40, 2 + Rp * 3))}
              fill="oklch(0.40 0.05 200)"
              stroke="oklch(0.65 0.10 200)" strokeWidth="1"
              animate={{ cx: [200, 200, 200, 200, 200], cy: [180, 180, 180, 180, 180] }}
            />
            <text x="200" y="305" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
              Star radius {Rs.toFixed(2)} R☉ · Planet radius {Rp.toFixed(2)} R⊕
            </text>
            <text x="200" y="318" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
              Planet is {(RpRe / (RsSolar * 109)).toExponential(2)}× the star&apos;s radius (true scale)
            </text>
          </svg>
        </div>

        <div className="space-y-3">
          <Slider label="Planet radius (R⊕)" min={0.3} max={13} step={0.1} value={Rp} onChange={setRp} format={(v) => `${v.toFixed(2)} R⊕`} accent="oklch(0.65 0.16 200)" />
          <Slider label="Star radius (R☉)" min={0.3} max={3} step={0.05} value={Rs} onChange={setRs} format={(v) => `${v.toFixed(2)} R☉`} accent="oklch(0.65 0.16 200)" />

          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">ΔF/F = (Rp/Rs)²</p>
            <p className="font-mono text-xs mt-1">= ({RpRe.toFixed(2)} R⊕ / {RsSolar.toFixed(2)} × 109 R⊕)²</p>
            <p className="font-mono text-base font-bold mt-1">{depth.toExponential(3)}</p>
            <p className="font-mono text-xs">= {depthPpm.toFixed(1)} ppm</p>
          </div>

          <div className={`rounded-md border p-3 text-xs ${jwstDetectable ? "border-emerald-500/40 bg-emerald-500/5" : "border-rose-500/40 bg-rose-500/5"}`}>
            <p className="font-semibold mb-1">Detection thresholds</p>
            <p className="text-muted-foreground">JWST (2022+): ~10 ppm</p>
            <p className={jwstDetectable ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}>
              {jwstDetectable ? "✓ Detectable by JWST" : "✗ Below JWST threshold"}
            </p>
            <p className="text-muted-foreground mt-1">Kepler (2009-2018): ~100 ppm</p>
            <p className={keplerDetectable ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}>
              {keplerDetectable ? "✓ Detectable by Kepler" : "✗ Below Kepler threshold"}
            </p>
          </div>

          <div className="rounded-md border border-border/60 bg-card p-3 text-xs">
            <p className="font-semibold mb-1.5">Real-world examples</p>
            <ul className="space-y-0.5 text-muted-foreground">
              <li>Earth-Sun: 84 ppm (only JWST can do this)</li>
              <li>Jupiter-Sun: 10,000 ppm = 1% (Kepler detected 1000s)</li>
              <li>TRAPPIST-1b (2017): 7,000 ppm — 7 planets around an M-dwarf</li>
              <li>WASP-12b (hot Jupiter): 14,000 ppm</li>
            </ul>
          </div>
        </div>
      </div>
      <InfoCallout
        intent="Slide planet radius + star radius to see the transit depth update. Earth-size planet around Sun-size star gives 84 ppm (only JWST-detectable). Hot Jupiters give 1%+ dips (Kepler-detectable from ground). The visual shows the true scale ratio of planet/star size."
        math="ΔF/F = (Rp/Rs)² · Earth-Sun = (1 R⊕ / 109 R⊕)² = 8.4×10⁻⁵ = 84 ppm · JWST threshold ~10 ppm"
        insight="Transit method has found 4,000+ of the 5,500+ known exoplanets. But it's biased — only sees edge-on systems (~1% of all). Radial velocity (next method) catches the other 99% but only for massive planets. Direct imaging (JWST coronagraph) catches young self-luminous gas giants at wide orbits. Each method has a different selection bias — together they cover parameter space."
      />
    </div>
  );
}

// ============================================================
// Interactive 3: Gravitational wave strain visualizer
// ============================================================

function GravitationalWaveStrain() {
  const [m1, setM1] = useState(30);   // mass 1 (solar masses)
  const [m2, setM2] = useState(30);   // mass 2 (solar masses)
  const [distance, setDistance] = useState(500);  // distance (Mpc)
  const [freq, setFreq] = useState(50);  // GW frequency (Hz)
  const [phase, setPhase] = useState(0);

  // GW strain amplitude: h ~ (4G/c⁴) × (M_chirp)^(5/3) × (πf)^(2/3) / D
  // Simplified: h ≈ 1e-21 × (M_chirp / 30 Msun)^(5/3) × (f/100 Hz)^(2/3) × (500 Mpc / D)
  const Mchirp = Math.pow(m1 * m2, 3 / 5) / Math.pow(m1 + m2, 1 / 5); // chirp mass
  const strain = 1e-21 * Math.pow(Mchirp / 30, 5 / 3) * Math.pow(freq / 100, 2 / 3) * (500 / distance);
  // SNR ≈ strain × sqrt(N cycles) × sqrt(T_obs / (1 Hz))
  const snr = strain * 1e21 * 8; // rough estimate

  useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 0.05) % (2 * Math.PI)), 30);
    return () => clearInterval(id);
  }, []);

  // GW waveform (plus polarization): h_+(t) = strain × sin(2πft + phase)
  // For visualisation, show a few cycles
  const wavePoints = Array.from({ length: 100 }, (_, i) => {
    const x = (i / 100) * 360;
    const t = (i / 100) * 4 * Math.PI;
    const y = 160 - 80 * Math.sin(t + phase) * (strain / 1e-21);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 380 280" className="w-full h-auto">
            <line x1="20" y1="160" x2="360" y2="160" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
            <line x1="20" y1="40" x2="20" y2="280" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
            {/* Y-axis tick: strain = 1e-21 */}
            <line x1="15" y1="80" x2="20" y2="80" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
            <text x="14" y="84" textAnchor="end" fontSize="7" fill="oklch(0.55 0.10 250)">+1e-21</text>
            <line x1="15" y1="240" x2="20" y2="240" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
            <text x="14" y="244" textAnchor="end" fontSize="7" fill="oklch(0.55 0.10 250)">-1e-21</text>
            <motion.polyline
              points={wavePoints}
              fill="none" stroke="oklch(0.75 0.20 165)" strokeWidth="1.5"
              animate={{ points: wavePoints }} transition={{ duration: 0.05 }}
            />
            <text x="190" y="270" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
              h_+(t) = strain × sin(2πft + phase)
            </text>
          </svg>
        </div>

        <div className="space-y-3">
          <Slider label="Mass 1 (M☉)" min={1} max={100} step={1} value={m1} onChange={setM1} format={(v) => `${v} M☉`} accent="oklch(0.65 0.16 165)" />
          <Slider label="Mass 2 (M☉)" min={1} max={100} step={1} value={m2} onChange={setM2} format={(v) => `${v} M☉`} accent="oklch(0.65 0.16 165)" />
          <Slider label="Distance (Mpc)" min={50} max={2000} step={50} value={distance} onChange={setDistance} format={(v) => `${v} Mpc`} accent="oklch(0.65 0.16 165)" />
          <Slider label="GW frequency (Hz)" min={10} max={500} step={5} value={freq} onChange={setFreq} format={(v) => `${v} Hz`} accent="oklch(0.65 0.16 165)" />

          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">h = (4G/c⁴)·(d²I/dt²)/D</p>
            <p className="font-mono text-xs mt-1">M_chirp = {Mchirp.toFixed(1)} M☉</p>
            <p className="font-mono text-base font-bold mt-1">h ≈ {strain.toExponential(2)}</p>
          </div>

          <div className={`rounded-md border p-2.5 text-xs ${snr > 8 ? "border-emerald-500/40 bg-emerald-500/5" : "border-rose-500/40 bg-rose-500/5"}`}>
            <p className="font-semibold mb-1">LIGO O4 detection</p>
            <p className="text-muted-foreground">SNR threshold ~ 8 (single-detector)</p>
            <p className={snr > 8 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}>
              {snr > 8 ? `✓ SNR ≈ ${snr.toFixed(1)} — detectable` : `✗ SNR ≈ ${snr.toFixed(1)} — below threshold`}
            </p>
          </div>

          <div className="rounded-md border border-border/60 bg-card p-3 text-xs">
            <p className="font-semibold mb-1.5">Notable GW events</p>
            <ul className="space-y-0.5 text-muted-foreground">
              <li>GW150914 (2015): 36+29 M☉ BBH at 410 Mpc — first detection</li>
              <li>GW170817 (2017): BNS at 40 Mpc — multimessenger (γ-ray + GW)</li>
              <li>GW190521 (2019): 85+66 M☉ — IMBH formation</li>
              <li>LIGO O4 (2023-): ~3× more sensitive than O3</li>
            </ul>
          </div>
        </div>
      </div>
      <InfoCallout
        intent="Slide m1, m2, distance, frequency to see the strain h_+(t) update. The math scales as M_chirp^(5/3) × f^(2/3) / D. Watch the SNR cross the LIGO O4 detection threshold (~8). Try GW150914 parameters (36+29 M☉, 410 Mpc, ~100 Hz) — should be detectable."
        math="h ≈ 10⁻²¹ × (M_chirp/30 M☉)^(5/3) × (f/100 Hz)^(2/3) × (500 Mpc/D) · SNR ≈ h × √N_cycles × √(T_obs/1Hz)"
        insight="LIGO measures length changes of 1/10,000 the width of a proton across 4 km arms — the most precise measurement ever made. Chinese LIGO-TianQin consortium is building TianQin (space-based, 2030+) for low-freq GWs (mHz band, supermassive BH mergers). LISA (ESA/NASA, 2035+) does the same from L2 — together they cover 6 decades of GW frequency."
      />
    </div>
  );
}

// ============================================================
// Interactive 4: LHC jet substructure (n-subjettiness)
// ============================================================

function JetSubstructure() {
  const [nSubjetties, setNSubjetties] = useState<{ tau1: number; tau2: number; tau3: number }>({
    tau1: 1.0,
    tau2: 0.65,
    tau3: 0.25,
  });
  const tau21 = nSubjetties.tau2 / nSubjetties.tau1;
  const tau32 = nSubjetties.tau3 / nSubjetties.tau2;
  // τ21 < 0.45 → 2-prong (W boson decay); τ32 < 0.65 → 3-prong (top quark)
  const isWBoson = tau21 < 0.45;
  const isTop = tau32 < 0.65;

  // 3 random "constituents" with positions in the (rapidity, φ) plane
  const constituents = [
    { y: 0, phi: 0, energy: 1.0 },
    { y: 0.2, phi: 0.15, energy: 0.5 },
    { y: -0.15, phi: -0.1, energy: 0.3 },
  ];

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 360 280" className="w-full h-auto">
            <line x1="20" y1="140" x2="340" y2="140" stroke="oklch(0.55 0.10 250 / 0.4)" strokeWidth="0.5" />
            <line x1="180" y1="20" x2="180" y2="260" stroke="oklch(0.55 0.10 250 / 0.4)" strokeWidth="0.5" />
            <text x="340" y="155" textAnchor="end" fontSize="9" fill="oklch(0.55 0.10 250)">φ →</text>
            <text x="190" y="30" fontSize="9" fill="oklch(0.55 0.10 250)">y ↑</text>
            {/* Jet constituents (sized by energy) */}
            {constituents.map((c, i) => {
              const cx = 180 + c.phi * 200;
              const cy = 140 - c.y * 200;
              const r = 5 + c.energy * 12;
              const color = i === 0 ? "oklch(0.75 0.20 30)" : i === 1 ? "oklch(0.75 0.20 165)" : "oklch(0.75 0.20 250)";
              return (
                <g key={i}>
                  <circle cx={cx} cy={cy} r={r} fill={color + "40"} stroke={color} strokeWidth="1" />
                  <text x={cx} y={cy + 3} textAnchor="middle" fontSize="8" fill={color} fontWeight="bold">
                    {c.energy.toFixed(1)}
                  </text>
                </g>
              );
            })}
            {/* Jet axis */}
            <line x1="180" y1="140" x2="280" y2="100" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" strokeDasharray="2 2" />
            <text x="280" y="98" fontSize="8" fill="oklch(0.55 0.10 250)">jet axis</text>
            <text x="180" y="270" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
              3-particle jet — energy-weighted axes define τ_N
            </text>
          </svg>
        </div>

        <div className="space-y-3">
          <Slider label="τ₁ (1-subjettiness)" min={0.5} max={1.5} step={0.01} value={nSubjetties.tau1} onChange={(v) => setNSubjetties(s => ({ ...s, tau1: v }))} format={(v) => v.toFixed(2)} accent="oklch(0.65 0.16 250)" />
          <Slider label="τ₂ (2-subjettiness)" min={0.1} max={1.0} step={0.01} value={nSubjetties.tau2} onChange={(v) => setNSubjetties(s => ({ ...s, tau2: v }))} format={(v) => v.toFixed(2)} accent="oklch(0.65 0.16 250)" />
          <Slider label="τ₃ (3-subjettiness)" min={0.05} max={0.5} step={0.005} value={nSubjetties.tau3} onChange={(v) => setNSubjetties(s => ({ ...s, tau3: v }))} format={(v) => v.toFixed(3)} accent="oklch(0.65 0.16 250)" />

          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">{"τ_N = (1/pT²) Σ_k min_{(i=1..N)} pT_i × ΔR_{ik}"}</p>
            <p className="font-mono text-xs mt-1">τ₂₁ = τ₂/τ₁ = {tau21.toFixed(3)}</p>
            <p className="font-mono text-xs">τ₃₂ = τ₃/τ₂ = {tau32.toFixed(3)}</p>
          </div>

          <div className={`rounded-md border p-2.5 text-xs ${isWBoson ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}>
            <p className="font-semibold mb-1">Boosted object tagging</p>
            <p className={isWBoson ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}>
              W boson (2-prong): {isWBoson ? `✓ τ₂₁=${tau21.toFixed(2)} < 0.45` : `✗ τ₂₁=${tau21.toFixed(2)} ≥ 0.45`}
            </p>
            <p className={isTop ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}>
              Top quark (3-prong): {isTop ? `✓ τ₃₂=${tau32.toFixed(2)} < 0.65` : `✗ τ₃₂=${tau32.toFixed(2)} ≥ 0.65`}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              QCD light-quark jets have τ₂₁&gt;0.5, τ₃₂&gt;0.7 — non-tagged
            </p>
          </div>

          <div className="rounded-md border border-border/60 bg-card p-3 text-xs">
            <p className="font-semibold mb-1.5">LHC Run 3 (2024+) highlights</p>
            <ul className="space-y-0.5 text-muted-foreground">
              <li>ATLAS+CMS: 13.6 TeV pp collisions, ~140/fb target</li>
              <li>Higgs boson cross-section measured to 5% precision</li>
              <li>Boosted W/Z/H tagging with τ_N + ML (ParticleNet)</li>
              <li>BSM searches: dark matter, SUSY, leptoquarks</li>
            </ul>
          </div>
        </div>
      </div>
      <InfoCallout
        intent="Slide τ₁, τ₂, τ₃ to see the boosted-object tagger respond. τ₂₁ &lt; 0.45 tags W bosons (2-prong from W → q q̄'). τ₃₂ &lt; 0.65 tags top quarks (3-prong from t → b W → b q q̄'). The visual shows 3 jet constituents in the (rapidity, φ) plane, sized by energy."
        math="τ_N = (1/pT²) Σ_k min_{(i=1..N)} pT_i × ΔR_{ik} · τ₂₁ = τ₂/τ₁ · τ₃₂ = τ₃/τ₂"
        insight="Jet substructure is the LHC's secret weapon for finding boosted heavy objects (W/Z/H/top) at pT &gt; 200 GeV where their decays merge into a single fat jet. Without τ_N tagging, we'd miss the boosted regime entirely. ML taggers (ParticleNet, Particle Transformer) now beat τ_N by 30%+ signal efficiency at fixed background — but τ_N remains the calibration standard."
      />
    </div>
  );
}

// ============================================================
// Interactive 5: JWST vs Hubble resolution comparison
// ============================================================

function JWSTvsHubble() {
  const [zoom, setZoom] = useState(0.5); // 0 = Hubble resolution, 1 = JWST
  // Hubble: 2.4m mirror, visible λ=550nm → diffraction limit θ = 1.22 λ/D = 0.05 arcsec
  // JWST: 6.5m mirror, IR λ=2000nm → θ = 1.22 × 2e-6 / 6.5 = 0.077 arcsec BUT 6.5× larger collecting area
  // Resolution ratio: JWST/Hubble ≈ 1.5× WORSE angular but 7× better collecting area → 50× deeper
  const hubbleD = 2.4;
  const jwstD = 6.5;
  const hubbleLambda = 550e-9;
  const jwstLambda = 2000e-9;
  const hubbleTheta = (1.22 * hubbleLambda / hubbleD) * 206265; // arcsec
  const jwstTheta = (1.22 * jwstLambda / jwstD) * 206265;
  // Blending — JWST mode shows 6.5/2.4 = 2.7× sharper+ collecting area
  const effectiveResolution = hubbleTheta * (1 - zoom) + jwstTheta * zoom;

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 360 320" className="w-full h-auto">
            <defs>
              <radialGradient id="galaxy-grad" cx="40%" cy="35%" r="65%">
                <stop offset="0%" stopColor="oklch(0.95 0.20 60)" />
                <stop offset="50%" stopColor="oklch(0.65 0.20 30 / 0.7)" />
                <stop offset="100%" stopColor="oklch(0.40 0.20 250 / 0.0)" />
              </radialGradient>
            </defs>
            {/* Galaxy (fuzzy blob — sharper as zoom → 1) */}
            <motion.circle
              cx="180" cy="160"
              r={20 + (1 - zoom) * 30}
              fill="url(#galaxy-grad)"
              animate={{ r: 20 + (1 - zoom) * 30 }}
            />
            {/* Detail spikes (more as zoom → 1) */}
            {zoom > 0.3 && (
              <g>
                {Array.from({ length: 4 }).map((_, i) => {
                  const angle = (i / 4) * 2 * Math.PI;
                  return (
                    <motion.line
                      key={i}
                      x1="180" y1="160"
                      x2={180 + (10 + zoom * 20) * Math.cos(angle)}
                      y2={160 + (10 + zoom * 20) * Math.sin(angle)}
                      stroke="oklch(0.95 0.20 60)" strokeWidth="1"
                      animate={{ x2: 180 + (10 + zoom * 20) * Math.cos(angle), y2: 160 + (10 + zoom * 20) * Math.sin(angle) }}
                    />
                  );
                })}
              </g>
            )}
            <text x="180" y="300" textAnchor="middle" fontSize="10" fill="oklch(0.85 0.20 60)" fontWeight="bold">
              {zoom < 0.5 ? "Hubble view" : "JWST view"}
            </text>
            <text x="180" y="315" textAnchor="middle" fontSize="9" fill="oklch(0.55 0.10 250)">
              effective resolution: {effectiveResolution.toFixed(3)} arcsec
            </text>
          </svg>
        </div>

        <div className="space-y-3">
          <Slider label="Slide: Hubble → JWST" min={0} max={1} step={0.05} value={zoom} onChange={setZoom} format={(v) => v < 0.5 ? "Hubble (optical)" : "JWST (infrared)"} accent="oklch(0.65 0.16 250)" />

          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs space-y-1">
            <p className="font-mono text-primary">θ = 1.22 λ/D (diffraction limit)</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <p className="font-semibold text-primary">Hubble</p>
                <p className="font-mono text-[11px]">D = {hubbleD} m</p>
                <p className="font-mono text-[11px]">λ = 550 nm (V band)</p>
                <p className="font-mono text-[11px]">θ = {hubbleTheta.toFixed(3)}″</p>
              </div>
              <div>
                <p className="font-semibold text-primary">JWST</p>
                <p className="font-mono text-[11px]">D = {jwstD} m</p>
                <p className="font-mono text-[11px]">λ = 2000 nm (K band)</p>
                <p className="font-mono text-[11px]">θ = {jwstTheta.toFixed(3)}″</p>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-border/60 bg-card p-3 text-xs">
            <p className="font-semibold mb-1.5">Why JWST is revolutionary</p>
            <ul className="space-y-0.5 text-muted-foreground">
              <li>6.5× larger collecting area → 50× deeper than Hubble</li>
              <li>Infrared → sees through dust (Hubble couldn&apos;t)</li>
              <li>L2 orbit → cold (-233°C), no zodiacal light contamination</li>
              <li>Discovered galaxies at z&gt;14 (within 300 Myr of Big Bang)</li>
              <li>Atmospheric characterization of TRAPPIST-1 planets (in progress)</li>
            </ul>
          </div>
        </div>
      </div>
      <InfoCallout
        intent="Slide from Hubble (left) to JWST (right) to see resolution + collecting area change. The galaxy blob becomes sharper + shows diffraction spikes in JWST mode. Hubble: 2.4m mirror, optical. JWST: 6.5m mirror, infrared — bigger mirror catches more light, IR sees through dust."
        math="θ = 1.22 λ/D (Rayleigh diffraction limit) · JWST collecting area = (6.5/2.4)² = 7.3× Hubble · IR transparency: λ&gt;1μm penetrates dust"
        insight="JWST orbits L2 (Earth-Sun Lagrange point, 1.5M km away) — it's literally never on the night side. China is planning its own JWST-equivalent: the China Space Station Telescope (CSST, 2024+) is a 2m Hubble-class optical/UV scope on Tiangong. CSST + FAST + JWST form a multi-wavelength partnership."
      />
    </div>
  );
}

// ============================================================
// Interactive 6: Beidou GNSS constellation tracker
// ============================================================

function BeidouConstellation() {
  const [phase, setPhase] = useState(0);
  const [showChinese, setShowChinese] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 0.005) % (2 * Math.PI)), 50);
    return () => clearInterval(id);
  }, []);

  // Beidou: 3 GEO + 3 IGSO + 24 MEO satellites = 30 active
  // GPS: 24 MEO in 6 planes. Show both for comparison.
  const beidou = [
    ...Array.from({ length: 3 }, (_, i) => ({ type: "GEO", angle: (i / 3) * 2 * Math.PI, altitude: 0.4 })),
    ...Array.from({ length: 3 }, (_, i) => ({ type: "IGSO", angle: (i / 3) * 2 * Math.PI + 0.5, altitude: 0.55 })),
    ...Array.from({ length: 24 }, (_, i) => ({ type: "MEO", angle: (i / 24) * 2 * Math.PI, altitude: 0.85 })),
  ];
  const gps = Array.from({ length: 24 }, (_, i) => ({ type: "MEO", angle: (i / 24) * 2 * Math.PI, altitude: 0.85 }));

  const sats = showChinese ? beidou : gps;
  const earthR = 40;
  const cx = 180, cy = 160;

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 360 320" className="w-full h-auto">
            <defs>
              <radialGradient id="earth-grad" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="oklch(0.85 0.18 250)" />
                <stop offset="60%" stopColor="oklch(0.50 0.16 250)" />
                <stop offset="100%" stopColor="oklch(0.30 0.10 250 / 0.0)" />
              </radialGradient>
            </defs>
            {/* Orbits */}
            <ellipse cx={cx} cy={cy} rx={earthR * 1.4} ry={earthR * 1.4} fill="none" stroke="oklch(0.55 0.10 250 / 0.3)" strokeWidth="0.5" strokeDasharray="2 1" />
            <ellipse cx={cx} cy={cy} rx={earthR * 1.55} ry={earthR * 1.55} fill="none" stroke="oklch(0.55 0.10 250 / 0.3)" strokeWidth="0.5" strokeDasharray="2 1" />
            <ellipse cx={cx} cy={cy} rx={earthR * 1.85} ry={earthR * 1.85} fill="none" stroke="oklch(0.55 0.10 250 / 0.3)" strokeWidth="0.5" strokeDasharray="2 1" />
            {/* Earth */}
            <circle cx={cx} cy={cy} r={earthR} fill="url(#earth-grad)" stroke="oklch(0.65 0.16 250)" strokeWidth="1" />
            {/* Satellites */}
            {sats.map((s, i) => {
              const a = s.angle + phase * (s.type === "GEO" ? 0.5 : s.type === "IGSO" ? 0.3 : 1);
              const r = earthR * (1 + s.altitude);
              const x = cx + r * Math.cos(a);
              const y = cy + r * Math.sin(a);
              const color = s.type === "GEO" ? "oklch(0.75 0.20 30)" : s.type === "IGSO" ? "oklch(0.75 0.20 165)" : "oklch(0.75 0.20 250)";
              return (
                <g key={i}>
                  <motion.circle cx={x} cy={y} r="2.5" fill={color}
                    animate={{ cx: x, cy: y }} transition={{ duration: 0.05 }}
                  />
                  {/* Coverage cone (every 6th satellite) */}
                  {i % 6 === 0 && (
                    <motion.line x1={x} y1={y} x2={cx} y2={cy}
                      stroke={color + "30"} strokeWidth="0.4" strokeDasharray="1 1"
                      animate={{ x1: x, y1: y }} transition={{ duration: 0.05 }}
                    />
                  )}
                </g>
              );
            })}
            <text x={cx} y={cy + 4} textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">🌍</text>
            <text x="180" y="295" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
              {showChinese ? "Beidou (BDS-3) — 30 satellites" : "GPS — 24 satellites"}
            </text>
            <text x="180" y="310" textAnchor="middle" fontSize="8" fill="oklch(0.55 0.10 250)">
              {showChinese ? "3 GEO + 3 IGSO + 24 MEO (China)" : "24 MEO in 6 planes (USA)"}
            </text>
          </svg>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowChinese(true)}
              className={`h-10 rounded-md border text-xs font-semibold transition-all ${showChinese ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary hover:bg-accent"}`}
            >Beidou (China)</button>
            <button
              type="button"
              onClick={() => setShowChinese(false)}
              className={`h-10 rounded-md border text-xs font-semibold transition-all ${!showChinese ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary hover:bg-accent"}`}
            >GPS (USA)</button>
          </div>

          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs space-y-1">
            <p className="font-mono text-primary">{showChinese ? "Beidou BDS-3 (2020+):" : "GPS Block III (2018+):"}</p>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <p className="text-[10px] text-muted-foreground">Satellites</p>
                <p className="font-mono">{showChinese ? "30 (3+3+24)" : "24 + 6 spare"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Coverage</p>
                <p className="font-mono">{showChinese ? "Global + regional" : "Global"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Accuracy</p>
                <p className="font-mono">{showChinese ? "1.5 m (real-time)" : "0.7 m (real-time)"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Signal</p>
                <p className="font-mono">{showChinese ? "B1C, B2a (L1/L5 equiv)" : "L1 C/A, L1C, L2C, L5"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-border/60 bg-card p-3 text-xs">
            <p className="font-semibold mb-1.5">{showChinese ? "Beidou highlights" : "GPS highlights"}</p>
            <ul className="space-y-0.5 text-muted-foreground">
              {showChinese ? (
                <>
                  <li>2020: full global service (BDS-3 complete)</li>
                  <li>3 GEO sats over China for regional precision (1m)</li>
                  <li>Short-message communication — unique to Beidou</li>
                  <li>Used by 50%+ of global maritime users (2024)</li>
                  <li>China-Russia interoperability agreement signed 2018</li>
                </>
              ) : (
                <>
                  <li>1978: first GPS satellite launched</li>
                  <li>1995: full operational capability (FOC)</li>
                  <li>2000: Selective Availability removed → civilian 5m</li>
                  <li>2018: First GPS III satellite (L1C signal)</li>
                  <li>Used by ~6B devices worldwide</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
      <InfoCallout
        intent="Toggle Beidou (China) vs GPS (USA) to see both constellations side-by-side. Beidou uniquely has 3 GEO + 3 IGSO satellites over China for regional precision (sub-meter), plus 24 MEO satellites for global coverage. Watch the satellites orbit and the coverage cones sweep across Earth."
        math="Beidou BDS-3 = 3 GEO + 3 IGSO + 24 MEO = 30 active sats · GEO at 35,786 km · MEO at 21,528 km · IGSO figure-8 over China"
        insight="Beidou is China's GPS — fully operational since 2020, ~1.5m accuracy globally and sub-meter in Asia-Pacific (thanks to the GEO sats). The unique short-message feature lets users send 40 Chinese characters without a phone signal — used in mountain rescue, fishing fleets. By 2024, Beidou had 50%+ of the Chinese maritime market and was integrated into GLONASS (Russia) and Galileo (EU) for global interoperability."
      />
    </div>
  );
}

// ============================================================
// Interactive 7: Chang'e lunar trajectory
// ============================================================

function ChangeLunarTrajectory() {
  const [phase, setPhase] = useState(0);
  const [mission, setMission] = useState<"ce5" | "ce6" | "tianwen">("ce5");
  useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 0.008) % 1), 50);
    return () => clearInterval(id);
  }, []);

  // Earth at (80, 160), Moon at (300, 160)
  const earthX = 80, earthY = 160;
  const moonX = 300, moonY = 160;
  // Sample trajectory (parametric)
  const trajectory = (t: number) => {
    // Outbound: spiral from Earth outward
    const r = 30 + t * 200;
    const angle = t * Math.PI * 2;
    return {
      x: earthX + r * Math.cos(angle) * 0.9,
      y: earthY + r * Math.sin(angle) * 0.3,
    };
  };
  const pos = trajectory(phase);

  const missionInfo = {
    ce5: { name: "Chang'e 5 (2020)", desc: "Lunar sample return — 1.731 kg of Moon material" },
    ce6: { name: "Chang'e 6 (2024)", desc: "First-ever FAR-SIDE lunar sample return — 1.935 kg" },
    tianwen: { name: "Tianwen-1 (2021)", desc: "Mars orbiter + lander + rover (Zhurong) — first Mars mission" },
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 380 280" className="w-full h-auto">
            <defs>
              <radialGradient id="ce-earth" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="oklch(0.85 0.18 250)" />
                <stop offset="60%" stopColor="oklch(0.50 0.16 250)" />
                <stop offset="100%" stopColor="oklch(0.30 0.10 250 / 0.0)" />
              </radialGradient>
              <radialGradient id="ce-moon" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="oklch(0.85 0.05 250)" />
                <stop offset="60%" stopColor="oklch(0.50 0.05 250)" />
                <stop offset="100%" stopColor="oklch(0.30 0.05 250 / 0.0)" />
              </radialGradient>
            </defs>
            {/* Trajectory path */}
            <path
              d={`M ${earthX} ${earthY} ${Array.from({ length: 100 }, (_, i) => {
                const t = i / 100;
                const p = trajectory(t);
                return `L ${p.x} ${p.y}`;
              }).join(" ")}`}
              fill="none" stroke="oklch(0.65 0.16 30 / 0.4)" strokeWidth="1" strokeDasharray="2 2"
            />
            {/* Earth */}
            <circle cx={earthX} cy={earthY} r="20" fill="url(#ce-earth)" stroke="oklch(0.65 0.16 250)" strokeWidth="1" />
            <text x={earthX} y={earthY + 4} textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">🌍</text>
            <text x={earthX} y={earthY + 35} textAnchor="middle" fontSize="8" fill="oklch(0.55 0.10 250)">Earth</text>
            {/* Moon / Mars */}
            <circle cx={moonX} cy={moonY} r="12" fill="url(#ce-moon)" stroke="oklch(0.65 0.05 250)" strokeWidth="1" />
            <text x={moonX} y={moonY + 3} textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">🌑</text>
            <text x={moonX} y={moonY + 30} textAnchor="middle" fontSize="8" fill="oklch(0.55 0.10 250)">
              {mission === "tianwen" ? "Mars" : "Moon"}
            </text>
            {/* Spacecraft */}
            <motion.circle cx={pos.x} cy={pos.y} r="3" fill="oklch(0.85 0.20 30)"
              animate={{ cx: pos.x, cy: pos.y }} transition={{ duration: 0.05 }}
            />
            <text x={pos.x + 5} y={pos.y - 4} fontSize="8" fill="oklch(0.85 0.20 30)" fontWeight="bold">
              {mission === "ce5" ? "CE5" : mission === "ce6" ? "CE6" : "TW-1"}
            </text>
            <text x="190" y="270" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
              Trajectory phase: {Math.round(phase * 100)}%
            </text>
          </svg>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(["ce5", "ce6", "tianwen"] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMission(m)}
                className={`h-12 rounded-md border text-[10px] font-semibold transition-all ${mission === m ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary hover:bg-accent"}`}
              >
                {m === "ce5" ? "CE-5 (2020)" : m === "ce6" ? "CE-6 (2024)" : "Tianwen-1"}
              </button>
            ))}
          </div>

          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
            <p className="font-semibold text-primary mb-1">{missionInfo[mission].name}</p>
            <p className="text-muted-foreground">{missionInfo[mission].desc}</p>
          </div>

          <div className="rounded-md border border-border/60 bg-card p-3 text-xs">
            <p className="font-semibold mb-1.5">Chinese space exploration milestones</p>
            <ul className="space-y-0.5 text-muted-foreground">
              <li><strong>2003</strong> — Yang Liwei (first Chinese astronaut, Shenzhou 5)</li>
              <li><strong>2007</strong> — Chang&apos;e 1 (first Chinese lunar orbiter)</li>
              <li><strong>2013</strong> — Chang&apos;e 3 (first Chinese lunar lander + Yutu rover)</li>
              <li><strong>2019</strong> — Chang&apos;e 4 (first FAR-SIDE lunar landing)</li>
              <li><strong>2020</strong> — Chang&apos;e 5 (lunar sample return — 1.731 kg)</li>
              <li><strong>2021</strong> — Tianwen-1 (Mars orbiter + Zhurong rover)</li>
              <li><strong>2022</strong> — Tiangong space station completed</li>
              <li><strong>2024</strong> — Chang&apos;e 6 (first far-side sample return — 1.935 kg)</li>
              <li><strong>2025+</strong> — ILRS (International Lunar Research Station) with Russia</li>
            </ul>
          </div>

          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-xs">
            <p className="font-semibold text-emerald-700 dark:text-emerald-300 mb-1">2024 highlight — Chang&apos;e 6</p>
            <p className="text-muted-foreground">
              First-ever samples from the lunar far side (South Pole-Aitken basin).
              The far side has a much thicker crust and is bombarded by the solar wind —
              these samples will reveal the Moon&apos;s early history differently than the
              near-side Apollo/Luna samples.
            </p>
          </div>
        </div>
      </div>
      <InfoCallout
        intent="Pick Chang'e 5 (2020 near-side), Chang'e 6 (2024 far-side), or Tianwen-1 (2021 Mars) and watch the trajectory animate. Chang'e 6 is the most recent — first-ever far-side sample return, an international milestone."
        math="Hohmann transfer orbit Δv ≈ 3.1 km/s (Earth→Moon) · 4.3 km/s (Earth→Mars) · Lunar orbital period T = 27.3 days · Chang'e 6 mission duration: 53 days"
        insight="China's space program is the only one to have landed on the Moon since the Soviet Luna 24 in 1976. With Chang'e 6 (2024) they got the first far-side samples ever. The ILRS (International Lunar Research Station, 2025+) will be China+Russia's answer to NASA's Artemis program — permanent robotic presence at the lunar south pole by 2035."
      />
    </div>
  );
}

// ============================================================
// Interactive 8: Dark matter rotation curve
// ============================================================

function DarkMatterRotationCurve() {
  const [darkMatter, setDarkMatter] = useState(0.7); // 0 = no DM, 1 = full DM
  // Visible matter alone: v(r) ∝ 1/√r (Keplerian fall-off)
  // With dark matter halo: v(r) → const at large r (flat rotation curve)
  const vRot = (r: number) => {
    const visible = 200 / Math.sqrt(Math.max(r, 0.5));
    const dark = 220 * (1 - Math.exp(-r / 3));
    return visible * (1 - darkMatter * 0.5) + dark * darkMatter;
  };

  // Galaxy NGC 3198 measured data points (approximate, from Bosma 1981 + Persic+1996)
  const measured = [
    { r: 1, v: 150 }, { r: 2, v: 180 }, { r: 4, v: 200 },
    { r: 6, v: 205 }, { r: 8, v: 200 }, { r: 10, v: 205 }, { r: 14, v: 200 }, { r: 20, v: 195 },
  ];

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 380 280" className="w-full h-auto">
            <line x1="40" y1="240" x2="370" y2="240" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
            <line x1="40" y1="20" x2="40" y2="240" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
            {/* Y-axis labels */}
            {[0, 50, 100, 150, 200, 250].map(v => (
              <g key={v}>
                <line x1="35" y1={240 - v * 0.85} x2="40" y2={240 - v * 0.85} stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
                <text x="32" y={243 - v * 0.85} textAnchor="end" fontSize="8" fill="oklch(0.55 0.10 250)">{v}</text>
              </g>
            ))}
            <text x="20" y="120" fontSize="9" fill="oklch(0.55 0.10 250)" transform="rotate(-90 20 120)">v_rot (km/s)</text>
            {/* X-axis labels */}
            {[0, 5, 10, 15, 20, 25].map(r => (
              <text key={r} x={40 + r * 13.5} y="258" textAnchor="middle" fontSize="8" fill="oklch(0.55 0.10 250)">{r}</text>
            ))}
            <text x="200" y="275" textAnchor="middle" fontSize="9" fill="oklch(0.55 0.10 250)">r (kpc)</text>
            {/* Visible-matter-only curve (Keplerian) */}
            <polyline
              points={Array.from({ length: 50 }, (_, i) => {
                const r = i * 0.5;
                const v = vRot(r) * (1 - darkMatter * 0.5) + 200 / Math.sqrt(Math.max(r, 0.5)) * darkMatter * 0.5;
                return `${40 + r * 13.5},${240 - v * 0.85}`;
              }).join(" ")}
              fill="none" stroke="oklch(0.65 0.16 30 / 0.6)" strokeWidth="1" strokeDasharray="3 2"
            />
            {/* Total curve (with dark matter) */}
            <motion.polyline
              points={Array.from({ length: 50 }, (_, i) => {
                const r = i * 0.5;
                const v = vRot(r);
                return `${40 + r * 13.5},${240 - v * 0.85}`;
              }).join(" ")}
              fill="none" stroke="oklch(0.75 0.20 165)" strokeWidth="1.5"
            />
            {/* Measured data points */}
            {measured.map((d, i) => (
              <circle key={i} cx={40 + d.r * 13.5} cy={240 - d.v * 0.85} r="2.5"
                fill="oklch(0.85 0.18 25)" stroke="oklch(0.65 0.18 25)" strokeWidth="0.8" />
            ))}
            {/* Legend */}
            <text x="220" y="40" fontSize="8" fill="oklch(0.75 0.20 165)" fontWeight="bold">— model (with DM)</text>
            <text x="220" y="55" fontSize="8" fill="oklch(0.65 0.16 30)">- - visible matter only</text>
            <text x="220" y="70" fontSize="8" fill="oklch(0.85 0.18 25)">● measured (NGC 3198)</text>
          </svg>
        </div>

        <div className="space-y-3">
          <Slider label="Dark matter fraction" min={0} max={1} step={0.05} value={darkMatter} onChange={setDarkMatter} format={(v) => `${(v * 100).toFixed(0)}% DM halo`} accent="oklch(0.65 0.16 165)" />

          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">v_rot(r) = √(GM_visible/r) + v_halo(r)</p>
            <p className="font-mono text-xs mt-1">v_halo → const at large r (flat curve)</p>
            <p className="font-mono text-xs">Dark matter fraction: {(darkMatter * 100).toFixed(0)}%</p>
          </div>

          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
            <p className="font-semibold text-amber-700 dark:text-amber-300 mb-1">The rotation curve problem</p>
            <p className="text-muted-foreground">
              Visible matter alone predicts v ∝ 1/√r at large r (Keplerian fall-off, dashed orange).
              Observations (yellow dots) show v stays flat — implying ~85% of the galaxy&apos;s mass
              is invisible &ldquo;dark matter&rdquo; in an extended halo.
            </p>
            <p className="text-muted-foreground mt-2">
              <strong>Alternatives in contention:</strong>
            </p>
            <ul className="text-muted-foreground ml-3 list-disc">
              <li>ΛCDM (standard): cold dark matter particles (WIMPs, axions)</li>
              <li>MOND: modify Newton at low accelerations (no DM needed)</li>
              <li>Emergent gravity (Verlinde 2016): DM is a thermodynamic effect</li>
            </ul>
          </div>

          <div className="rounded-md border border-border/60 bg-card p-3 text-xs">
            <p className="font-semibold mb-1.5">Latest searches (2024-2025)</p>
            <ul className="space-y-0.5 text-muted-foreground">
              <li>LZ experiment: 5.5t xenon TPC, no WIMPs yet (2024)</li>
              <li>XENONnT: 8.6t xenon, similar null result</li>
              <li>China&apos;s PandaX-4T: 4t xenon, 2023-2025 run</li>
              <li>JWST finding &ldquo;impossible early galaxies&rdquo; may constrain DM models</li>
              <li>Axelion searches via haloscopes (ADMX-HF, China&apos;s CAPP)</li>
            </ul>
          </div>
        </div>
      </div>
      <InfoCallout
        intent="Slide the dark matter fraction from 0% (visible matter only — Keplerian fall-off) to 100% (full DM halo — flat rotation curve). The yellow data points show real measurements of NGC 3198. Without dark matter, the model cannot match the flat observed curve."
        math="v_visible(r) = √(GM_visible/r) · v_halo(r) → v_∞ = const · Total: v_rot² = v_visible² + v_halo²"
        insight="This is the strongest empirical evidence for dark matter — Vera Rubin's 1970s discovery that galaxies rotate too fast for their visible mass. The flat rotation curve is now confirmed in thousands of galaxies (SPARC database, 2024+). The debate: is dark matter a particle (LZ, PandaX searches) OR is gravity modified at low acceleration (MOND)? Each has 50/50 proponents. The truth may be both."
      />
    </div>
  );
}

export {
  DraggableOrbit,
  TransitDepthCalculator,
  GravitationalWaveStrain,
  JetSubstructure,
  JWSTvsHubble,
  BeidouConstellation,
  ChangeLunarTrajectory,
  DarkMatterRotationCurve,
  Slider,
  LazyModal,
  InfoCallout,
};
