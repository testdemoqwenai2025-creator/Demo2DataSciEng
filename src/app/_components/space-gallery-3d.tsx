"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  X, Atom, Zap, Box, Layers, Network, Cpu, Telescope, Radio, Globe,
} from "lucide-react";
import { PyodideRunner } from "./pyodide-runner";

/**
 * SpaceGallery3D — a 4-card animated 3D gallery of space-science
 * instruments and astrophysical phenomena, mirroring QuantumGallery3D.
 *
 * Each card has:
 *   - A small animated 3D SVG thumbnail (CSS 3D transforms + framer-motion)
 *   - Click → lazy modal popup (AnimatePresence) — heavy content only
 *     mounts when the user opens the card
 *   - Inside the modal:
 *       * A LARGE animated 3D SVG of the concept
 *       * An n-D toggle (3D / 4D / 5D / N-D) — shows how the concept lives
 *         at different astrophysical scales:
 *             - 3D: single object (one galaxy / one IFO / one collision /
 *                    one space station)
 *             - 4D: cluster or pair (galaxy cluster / detector network /
 *                    docked modules)
 *             - 5D: cosmic-scale web (cosmic web / sky localisation /
 *                    detector cross-section / orbital network)
 *             - N-D: multi-wavelength (optical/IR/X-ray/radio view)
 *       * A floating math/code background — space-science equations
 *         drift subtly behind the main visualisation
 *       * A caption explaining what the visual shows
 */

// ============================================================
// Shared math/code snippets for the floating background layer
// ============================================================
const FLOATING_SNIPPETS = [
  "z = (λ_obs - λ_emit)/λ_emit",
  "T² = (4π²/GM)·a³",
  "h ~ 10⁻²¹",
  "ΔF/F = (Rp/Rs)²",
  "LIGO: 4 km arms",
  "LHC: 13.6 TeV",
  "FAST: 500 m dish",
  "Beidou: 30 sats",
  "λ_peak ∝ 1/T (Wien)",
  "F = GMm/r²",
  "v = H₀·d (Hubble)",
  "Ω_m ≈ 0.31",
  "Ω_Λ ≈ 0.69",
  "t_age ≈ 13.8 Gyr",
  "r_s = 2GM/c² (Schwarz.)",
  "T_CMB = 2.725 K",
  "z(CMB) ≈ 1100",
  "M = (4π²/G)·(a³/T²)",
  "v_orbit = √(GM/r)",
  "ρ_c = 3H²/(8πG)",
  "Δm/m = E/c²",
  "H₀ ≈ 70 km/s/Mpc",
  "v_esc = √(2GM/r)",
  "L_Edd = 1.26×10³⁸ (M/M☉) erg/s",
];

// ============================================================
// 3D scene wrapper
// ============================================================

function Scene3D({ children, w = 240, h = 320 }: { children: ReactNode; w?: number; h?: number }) {
  return (
    <div
      className="sp-3d-scene relative"
      style={{ width: w, height: h, perspective: "900px" }}
    >
      <style>{`
        .sp-3d-stage {
          transform-style: preserve-3d;
          transform: rotateX(15deg) rotateY(20deg);
          animation: sp-3d-rotate 8s linear infinite;
        }
        @keyframes sp-3d-rotate {
          from { transform: rotateX(15deg) rotateY(0deg); }
          to   { transform: rotateX(15deg) rotateY(360deg); }
        }
        .sp-bg-float {
          position: absolute;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          color: oklch(0.65 0.15 250 / 0.18);
          pointer-events: none;
          white-space: nowrap;
          font-size: 11px;
          line-height: 1.4;
          animation: sp-bg-drift linear infinite;
        }
        @keyframes sp-bg-drift {
          from { transform: translateY(0) translateX(0); opacity: 0.0; }
          10%  { opacity: 1.0; }
          90%  { opacity: 1.0; }
          to   { transform: translateY(-180px) translateX(40px); opacity: 0.0; }
        }
      `}</style>
      <div className="sp-3d-stage w-full h-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// ============================================================
// Floating math/code background layer
// ============================================================
function FloatingBackground() {
  // Pick a deterministic subset of snippets per render
  const items = FLOATING_SNIPPETS.map((text, i) => ({
    text,
    x: (i * 53) % 95,
    y: (i * 37) % 90,
    delay: (i * 1.7) % 14,
    duration: 14 + (i % 7),
    size: 10 + ((i * 3) % 5),
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {items.map((it, i) => (
        <div
          key={i}
          className="sp-bg-float"
          style={{
            left: `${it.x}%`,
            bottom: `${it.y - 50}%`,
            animationDelay: `${it.delay}s`,
            animationDuration: `${it.duration}s`,
            fontSize: `${it.size}px`,
          }}
        >
          {it.text}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Concept 1: JWST deep field (galaxies with pulsing brightness)
// ============================================================
function JWSTDeepField3D({ dim = 3 }: { dim?: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => (t + 1) % 60), 100);
    return () => clearInterval(id);
  }, []);
  // n-D toggle:
  //   3D = single galaxy, 4D = galaxy cluster (6),
  //   5D = cosmic web (14 + filaments), N-D = multi-wavelength overlay
  const nGalaxies = dim === 3 ? 1 : dim === 4 ? 6 : 14;
  // Redshift labels (always shown — they're the JWST signature)
  const redshifts = [
    { label: "z=14", x: 60, y: 60, color: "oklch(0.85 0.18 25)" },
    { label: "z=10", x: 290, y: 90, color: "oklch(0.80 0.16 60)" },
    { label: "z=7",  x: 80,  y: 260, color: "oklch(0.75 0.14 165)" },
  ];
  // Deterministic galaxy positions in a 360×320 viewBox
  const galaxyPositions = [
    { x: 180, y: 160, size: 22, phase: 0.0 }, // central bright galaxy
    { x: 80,  y: 70,  size: 9,  phase: 1.2 },
    { x: 290, y: 100, size: 11, phase: 2.4 },
    { x: 90,  y: 250, size: 10, phase: 3.1 },
    { x: 270, y: 240, size: 8,  phase: 4.0 },
    { x: 50,  y: 160, size: 6,  phase: 5.1 },
    { x: 320, y: 180, size: 7,  phase: 0.7 },
    { x: 150, y: 60,  size: 5,  phase: 2.0 },
    { x: 220, y: 50,  size: 6,  phase: 3.4 },
    { x: 200, y: 270, size: 7,  phase: 4.6 },
    { x: 120, y: 130, size: 5,  phase: 1.5 },
    { x: 240, y: 140, size: 6,  phase: 2.8 },
    { x: 160, y: 220, size: 5,  phase: 5.5 },
    { x: 240, y: 210, size: 6,  phase: 0.3 },
  ];
  const pulse = (phase: number) => 0.6 + 0.4 * Math.sin(tick / 10 + phase);
  const visible = galaxyPositions.slice(0, nGalaxies);
  return (
    <svg viewBox="0 0 360 320" width="100%" height="100%">
      <defs>
        <radialGradient id="jwst-bg-grad" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="oklch(0.10 0.05 250 / 0.95)" />
          <stop offset="100%" stopColor="oklch(0.05 0.02 250 / 1.0)" />
        </radialGradient>
        <radialGradient id="jwst-galaxy-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.95 0.18 60 / 0.95)" />
          <stop offset="40%" stopColor="oklch(0.75 0.20 30 / 0.6)" />
          <stop offset="100%" stopColor="oklch(0.40 0.15 25 / 0.0)" />
        </radialGradient>
        <radialGradient id="jwst-galaxy-dim" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.80 0.15 250 / 0.7)" />
          <stop offset="100%" stopColor="oklch(0.40 0.10 250 / 0.0)" />
        </radialGradient>
      </defs>
      {/* deep-space background */}
      <rect x="0" y="0" width="360" height="320" fill="url(#jwst-bg-grad)" />
      {/* faint background stars (twinkle) */}
      {Array.from({ length: 40 }).map((_, i) => {
        const sx = (i * 47) % 360;
        const sy = (i * 31) % 320;
        const tw = 0.3 + 0.7 * Math.abs(Math.sin(tick / 8 + i));
        return (
          <circle key={`star-${i}`} cx={sx} cy={sy} r="0.6"
            fill="oklch(0.95 0.05 250 / 0.7)" opacity={tw} />
        );
      })}
      {/* cosmic-web filaments (5D only) */}
      {dim === 5 && (
        <g stroke="oklch(0.55 0.12 250 / 0.35)" strokeWidth="0.6" strokeDasharray="2 3" fill="none">
          <path d="M 80 70 L 180 160" />
          <path d="M 180 160 L 290 100" />
          <path d="M 180 160 L 90 250" />
          <path d="M 180 160 L 270 240" />
          <path d="M 50 160 L 180 160" />
          <path d="M 180 160 L 320 180" />
        </g>
      )}
      {/* multi-wavelength band overlay (N-D only) */}
      {dim === 99 && (
        <g>
          <rect x="0" y="0" width="120" height="320" fill="oklch(0.65 0.18 60 / 0.15)" />
          <rect x="120" y="0" width="120" height="320" fill="oklch(0.65 0.18 30 / 0.15)" />
          <rect x="240" y="0" width="120" height="320" fill="oklch(0.65 0.18 165 / 0.15)" />
          <text x="60" y="20" textAnchor="middle" fontSize="8" fill="oklch(0.85 0.18 60)">optical</text>
          <text x="180" y="20" textAnchor="middle" fontSize="8" fill="oklch(0.85 0.18 30)">IR (JWST)</text>
          <text x="300" y="20" textAnchor="middle" fontSize="8" fill="oklch(0.85 0.18 165)">radio</text>
        </g>
      )}
      {/* galaxies */}
      {visible.map((g, i) => {
        const isCentral = i === 0;
        const p = pulse(g.phase);
        const r = isCentral ? g.size * (1 + 0.15 * p) : g.size * (0.7 + 0.5 * p);
        const fill = isCentral ? "url(#jwst-galaxy-core)" : "url(#jwst-galaxy-dim)";
        const opacity = 0.4 + 0.6 * p;
        return (
          <motion.g key={`gal-${i}`}
            initial={{ opacity: 0 }}
            animate={{ opacity }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <g transform={`rotate(${(i * 23) % 180} ${g.x} ${g.y})`}>
              <motion.ellipse
                cx={g.x} cy={g.y} rx={r} ry={r * 0.5}
                fill={fill}
                animate={{ rx: r, ry: r * 0.5 }}
                transition={{ duration: 0.1, ease: "linear" }}
              />
              <circle cx={g.x} cy={g.y} r={r * 0.25}
                fill={isCentral ? "oklch(0.95 0.20 60)" : "oklch(0.85 0.18 250 / 0.7)"} />
            </g>
          </motion.g>
        );
      })}
      {/* redshift labels — always visible (they ARE the science) */}
      {redshifts.map((r, i) => (
        <g key={`z-${i}`}>
          <text x={r.x} y={r.y} fontSize="9" fill={r.color} fontWeight="bold" fontFamily="monospace">
            {r.label}
          </text>
          <line x1={r.x + 24} y1={r.y - 3} x2={r.x + 38} y2={r.y - 3}
            stroke={r.color} strokeWidth="0.6" opacity="0.7" />
        </g>
      ))}
      <text x="180" y="305" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
        {dim === 3 ? "single galaxy (JWST NIRCam)"
          : dim === 4 ? "galaxy cluster"
          : dim === 5 ? "cosmic web — galaxies + filaments"
          : "multi-wavelength: optical · IR · radio"}
      </text>
    </svg>
  );
}

// ============================================================
// Concept 2: LIGO interferometer (L-shape + GW ripple)
// ============================================================
function LIGOInterferometer3D({ dim = 3 }: { dim?: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => (t + 1) % 100), 60);
    return () => clearInterval(id);
  }, []);
  // n-D toggle:
  //   3D = single IFO, 4D = LIGO+Virgo+KAGRA network,
  //   5D = sky localisation, N-D = GW + EM counterpart
  const corner = { x: 60, y: 250 }; // beam-splitter corner
  const armLen = 240;
  const hEnd = { x: corner.x + armLen, y: corner.y }; // end of horizontal arm
  const vEnd = { x: corner.x, y: corner.y - armLen * 0.6 }; // end of vertical arm
  // GW strain passing through — stretches/compresses arms
  const phase = tick / 8;
  const strain = (offset: number) => Math.sin(phase + offset * 0.4) * 4;
  const armH = armLen + strain(0);
  const armV = armLen * 0.6 + strain(1);
  // Laser pulse flicker
  const laserOn = (Math.floor(tick / 5) % 4) !== 3;
  return (
    <svg viewBox="0 0 360 320" width="100%" height="100%">
      <defs>
        <linearGradient id="ligo-arm-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="oklch(0.85 0.18 165 / 0.95)" />
          <stop offset="50%" stopColor="oklch(0.65 0.16 165 / 0.6)" />
          <stop offset="100%" stopColor="oklch(0.40 0.10 165 / 0.0)" />
        </linearGradient>
        <radialGradient id="ligo-bs-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.95 0.20 165)" />
          <stop offset="100%" stopColor="oklch(0.50 0.16 165 / 0.0)" />
        </radialGradient>
      </defs>
      {/* GW waveform background — concentric ripples passing through */}
      <g opacity="0.45">
        {Array.from({ length: 6 }).map((_, i) => {
          const rx = 20 + i * 8 + 4 * Math.cos(phase + i * 0.5);
          const ry = 30 + 8 * Math.sin(phase + i * 0.5);
          return (
            <motion.ellipse
              key={`gw-${i}`}
              cx={180} cy={150}
              rx={rx + i * 14} ry={ry + i * 5}
              fill="none" stroke="oklch(0.65 0.16 200 / 0.5)" strokeWidth="0.6"
              animate={{ rx: rx + i * 14, ry: ry + i * 5 }}
              transition={{ duration: 0.06, ease: "linear" }}
            />
          );
        })}
        <text x="180" y="40" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.12 200)" fontFamily="monospace">
          h ~ 10⁻²¹  (GW strain)
        </text>
      </g>
      {/* horizontal arm (X) — static guide + animated laser line */}
      <line x1={corner.x} y1={corner.y} x2={hEnd.x} y2={corner.y}
        stroke="oklch(0.50 0.10 250 / 0.4)" strokeWidth="3" />
      <motion.line
        x1={corner.x} y1={corner.y} x2={corner.x + armH} y2={corner.y}
        stroke="url(#ligo-arm-grad)" strokeWidth="2.5"
        animate={{ x2: corner.x + armH }}
        transition={{ duration: 0.06, ease: "linear" }}
      />
      {/* vertical arm (Y) */}
      <line x1={corner.x} y1={corner.y} x2={corner.x} y2={vEnd.y}
        stroke="oklch(0.50 0.10 250 / 0.4)" strokeWidth="3" />
      <motion.line
        x1={corner.x} y1={corner.y} x2={corner.x} y2={corner.y - armV}
        stroke="url(#ligo-arm-grad)" strokeWidth="2.5"
        animate={{ y2: corner.y - armV }}
        transition={{ duration: 0.06, ease: "linear" }}
      />
      {/* end mirrors */}
      <rect x={hEnd.x - 4} y={corner.y - 6} width="8" height="12"
        fill="oklch(0.75 0.18 165)" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <rect x={corner.x - 6} y={vEnd.y - 4} width="12" height="8"
        fill="oklch(0.75 0.18 165)" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      {/* beam splitter at corner */}
      <circle cx={corner.x} cy={corner.y} r="6"
        fill="url(#ligo-bs-grad)" stroke="oklch(0.55 0.10 250)" strokeWidth="0.8" />
      {/* laser input (from below) */}
      <line x1={corner.x} y1={corner.y + 30} x2={corner.x} y2={corner.y + 6}
        stroke="oklch(0.85 0.18 30)" strokeWidth="2"
        opacity={laserOn ? 0.9 : 0.25} />
      <rect x={corner.x - 8} y={corner.y + 26} width="16" height="8" rx="2"
        fill="oklch(0.40 0.10 30)" stroke="oklch(0.65 0.16 30)" strokeWidth="0.6" />
      <text x={corner.x} y={corner.y + 50} textAnchor="middle" fontSize="8" fill="oklch(0.75 0.16 30)">laser</text>
      {/* photodetector (left) */}
      <line x1={corner.x - 30} y1={corner.y} x2={corner.x - 6} y2={corner.y}
        stroke="oklch(0.85 0.18 165)" strokeWidth="2"
        opacity={laserOn ? 0.9 : 0.25} />
      <rect x={corner.x - 38} y={corner.y - 5} width="8" height="10" rx="1"
        fill="oklch(0.40 0.10 165)" stroke="oklch(0.65 0.16 165)" strokeWidth="0.6" />
      <text x={corner.x - 34} y={corner.y + 18} textAnchor="middle" fontSize="8" fill="oklch(0.75 0.16 165)">PD</text>
      {/* arm labels */}
      <text x={(corner.x + hEnd.x) / 2} y={corner.y + 14} textAnchor="middle" fontSize="8" fill="oklch(0.65 0.10 250)">4 km arm (X)</text>
      <text x={corner.x - 14} y={(corner.y + vEnd.y) / 2} textAnchor="end" fontSize="8" fill="oklch(0.65 0.10 250)">4 km arm (Y)</text>
      {/* 4D: multi-IFO network */}
      {dim === 4 && (
        <g opacity="0.85">
          <circle cx={300} cy={70} r="14" fill="none" stroke="oklch(0.65 0.16 165)" strokeWidth="1" />
          <text x={300} y={73} textAnchor="middle" fontSize="8" fill="oklch(0.75 0.16 165)">Virgo</text>
          <circle cx={330} cy={140} r="12" fill="none" stroke="oklch(0.65 0.16 165)" strokeWidth="1" />
          <text x={330} y={143} textAnchor="middle" fontSize="7" fill="oklch(0.75 0.16 165)">KAGRA</text>
        </g>
      )}
      {/* 5D: sky localisation annulus */}
      {dim === 5 && (
        <g opacity="0.75">
          <ellipse cx={310} cy={100} rx="35" ry="18" fill="none" stroke="oklch(0.65 0.16 165)" strokeWidth="0.8" />
          <ellipse cx={310} cy={100} rx="18" ry="9" fill="oklch(0.65 0.16 165 / 0.4)" stroke="none" />
          <text x={310} y={135} textAnchor="middle" fontSize="8" fill="oklch(0.75 0.16 165)">sky map</text>
        </g>
      )}
      {/* N-D: GW + EM counterpart (kilonova) */}
      {dim === 99 && (
        <g opacity="0.9">
          <motion.circle cx={310} cy={90} r="8" fill="oklch(0.85 0.20 60 / 0.8)"
            animate={{ r: [6, 10, 6] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} />
          <text x={310} y={120} textAnchor="middle" fontSize="8" fill="oklch(0.75 0.16 60)">EM (kilonova)</text>
        </g>
      )}
      <text x="180" y="305" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
        {dim === 3 ? "LIGO Hanford — single interferometer"
          : dim === 4 ? "LIGO + Virgo + KAGRA network"
          : dim === 5 ? "GW sky localisation"
          : "GW170817: GW + EM counterpart"}
      </text>
    </svg>
  );
}

// ============================================================
// Concept 3: LHC collision (pp → 4 jets)
// ============================================================
function LHCCollision3D({ dim = 3 }: { dim?: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => (t + 1) % 100), 80);
    return () => clearInterval(id);
  }, []);
  // n-D toggle:
  //   3D = 4 jets (single collision), 4D = 8 jets (multi-event pileup),
  //   5D = 12 jets + detector rings, N-D = 16 jets coloured by particle type
  const nJets = dim === 3 ? 4 : dim === 4 ? 8 : dim === 5 ? 12 : 16;
  const cx = 180, cy = 160;
  const collisionPulse = 0.5 + 0.5 * Math.sin(tick / 5);
  // Procedural jet vectors
  const jets = Array.from({ length: nJets }).map((_, i) => {
    const angle = (i / nJets) * 2 * Math.PI + tick * 0.005;
    const len = 70 + 30 * Math.sin(tick / 7 + i);
    return {
      x: cx + len * Math.cos(angle),
      y: cy + len * Math.sin(angle),
      angle,
      len,
      energy: 50 + ((i * 17) % 80), // GeV
    };
  });
  const beamPhase = (tick / 100) * 2 * Math.PI;
  return (
    <svg viewBox="0 0 360 320" width="100%" height="100%">
      <defs>
        <radialGradient id="lhc-collision-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.95 0.22 25)" />
          <stop offset="40%" stopColor="oklch(0.75 0.20 30 / 0.7)" />
          <stop offset="100%" stopColor="oklch(0.40 0.15 25 / 0.0)" />
        </radialGradient>
        <linearGradient id="lhc-beam-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="oklch(0.40 0.18 30 / 0.0)" />
          <stop offset="50%" stopColor="oklch(0.85 0.20 30 / 0.95)" />
          <stop offset="100%" stopColor="oklch(0.40 0.18 30 / 0.0)" />
        </linearGradient>
        <radialGradient id="lhc-det-ring" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.30 0.10 250 / 0.0)" />
          <stop offset="85%" stopColor="oklch(0.55 0.12 250 / 0.25)" />
          <stop offset="100%" stopColor="oklch(0.65 0.16 250 / 0.6)" />
        </radialGradient>
      </defs>
      {/* 5D: detector cross-section concentric rings */}
      {dim === 5 && (
        <g opacity="0.6">
          <circle cx={cx} cy={cy} r="130" fill="none" stroke="oklch(0.55 0.12 250)" strokeWidth="0.5" />
          <circle cx={cx} cy={cy} r="110" fill="none" stroke="oklch(0.55 0.12 250)" strokeWidth="0.5" strokeDasharray="2 2" />
          <circle cx={cx} cy={cy} r="90" fill="none" stroke="oklch(0.55 0.12 250)" strokeWidth="0.5" />
          <circle cx={cx} cy={cy} r="70" fill="none" stroke="oklch(0.55 0.12 250)" strokeWidth="0.5" strokeDasharray="1 2" />
          <circle cx={cx} cy={cy} r="135" fill="url(#lhc-det-ring)" />
        </g>
      )}
      {/* incoming proton beams (one from each side) */}
      <motion.line
        x1={20} y1={cy} x2={cx - 14} y2={cy}
        stroke="url(#lhc-beam-grad)" strokeWidth="3"
        animate={{ x1: 20 + 4 * Math.sin(beamPhase), x2: cx - 14 + 4 * Math.sin(beamPhase) }}
        transition={{ duration: 0.06, ease: "linear" }}
      />
      <motion.line
        x1={340} y1={cy} x2={cx + 14} y2={cy}
        stroke="url(#lhc-beam-grad)" strokeWidth="3"
        animate={{ x1: 340 - 4 * Math.cos(beamPhase), x2: cx + 14 - 4 * Math.cos(beamPhase) }}
        transition={{ duration: 0.06, ease: "linear" }}
      />
      {/* proton labels */}
      <text x="14" y={cy - 6} textAnchor="start" fontSize="9" fill="oklch(0.85 0.18 30)" fontWeight="bold">p⁺</text>
      <text x="346" y={cy - 6} textAnchor="end" fontSize="9" fill="oklch(0.85 0.18 30)" fontWeight="bold">p⁺</text>
      {/* particle jets */}
      {jets.map((j, i) => {
        // N-D view: jets coloured by particle type
        const jetColor = dim === 99
          ? (i % 3 === 0 ? "oklch(0.85 0.18 60)" : i % 3 === 1 ? "oklch(0.85 0.18 165)" : "oklch(0.85 0.18 320)")
          : "oklch(0.85 0.18 25)";
        return (
          <motion.g key={`jet-${i}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: i * 0.04 }}
          >
            <motion.line
              x1={cx} y1={cy} x2={j.x} y2={j.y}
              stroke={jetColor} strokeWidth="2"
              strokeDasharray="3 2"
              animate={{ x2: j.x, y2: j.y }}
              transition={{ duration: 0.08, ease: "linear" }}
            />
            <circle cx={j.x} cy={j.y} r="3" fill={jetColor} opacity="0.85" />
            {/* energy label every other jet */}
            {i % 2 === 0 && (
              <text x={j.x + 6} y={j.y + 3} fontSize="8" fill={jetColor} fontFamily="monospace">
                {j.energy} GeV
              </text>
            )}
          </motion.g>
        );
      })}
      {/* collision point (pulsing) */}
      <motion.circle cx={cx} cy={cy} r={8 + 6 * collisionPulse}
        fill="url(#lhc-collision-grad)"
        animate={{ r: 8 + 6 * collisionPulse }}
        transition={{ duration: 0.06 }}
      />
      <circle cx={cx} cy={cy} r="4" fill="oklch(0.95 0.22 25)" />
      {/* N-D: particle-ID legend */}
      {dim === 99 && (
        <g>
          <rect x="8" y="270" width="344" height="22" fill="oklch(0.15 0.05 250 / 0.7)" rx="3" />
          <circle cx="22" cy="281" r="3" fill="oklch(0.85 0.18 60)" />
          <text x="30" y="284" fontSize="8" fill="oklch(0.85 0.10 250)">hadrons</text>
          <circle cx="100" cy="281" r="3" fill="oklch(0.85 0.18 165)" />
          <text x="108" y="284" fontSize="8" fill="oklch(0.85 0.10 250)">leptons</text>
          <circle cx="180" cy="281" r="3" fill="oklch(0.85 0.18 320)" />
          <text x="188" y="284" fontSize="8" fill="oklch(0.85 0.10 250)">photons</text>
        </g>
      )}
      {/* energy header */}
      <text x="180" y="24" textAnchor="middle" fontSize="9" fill="oklch(0.85 0.18 25)" fontWeight="bold" fontFamily="monospace">
        √s = 13.6 TeV
      </text>
      <text x="180" y="305" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
        {dim === 3 ? "single pp collision · 4 jets"
          : dim === 4 ? "multi-event pileup"
          : dim === 5 ? "ATLAS detector cross-section"
          : "particle ID: hadrons · leptons · photons"}
      </text>
    </svg>
  );
}

// ============================================================
// Concept 4: Tiangong space station (Earth + orbiting station)
// ============================================================
function TiangongStation3D({ dim = 3 }: { dim?: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => (t + 1) % 120), 60);
    return () => clearInterval(id);
  }, []);
  // n-D toggle:
  //   3D = station only, 4D = + Shenzhou docked,
  //   5D = + Tianzhou + Beidou network, N-D = multi-sensor overlays
  const angle = (tick / 120) * 2 * Math.PI;
  const cx = 180, cy = 170;
  const earthR = 80;
  const orbitR = 130;
  const sx = cx + orbitR * Math.cos(angle);
  const sy = cy + orbitR * 0.4 * Math.sin(angle); // squashed orbit (isometric)
  const modules = dim === 3 ? 1 : dim === 4 ? 3 : 5; // core, +Shenzhou, +Tianzhou
  return (
    <svg viewBox="0 0 360 320" width="100%" height="100%">
      <defs>
        <radialGradient id="tg-earth-grad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="oklch(0.65 0.15 220 / 0.95)" />
          <stop offset="55%" stopColor="oklch(0.45 0.18 250 / 0.85)" />
          <stop offset="100%" stopColor="oklch(0.20 0.10 250 / 0.7)" />
        </radialGradient>
        <radialGradient id="tg-station-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.90 0.15 60)" />
          <stop offset="100%" stopColor="oklch(0.55 0.10 30 / 0.0)" />
        </radialGradient>
        <linearGradient id="tg-solar-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="oklch(0.40 0.16 250)" />
          <stop offset="100%" stopColor="oklch(0.20 0.10 250)" />
        </linearGradient>
      </defs>
      {/* starfield */}
      {Array.from({ length: 30 }).map((_, i) => {
        const sx2 = (i * 53) % 360;
        const sy2 = (i * 29) % 200;
        const tw = 0.3 + 0.7 * Math.abs(Math.sin(tick / 10 + i));
        return <circle key={`tg-star-${i}`} cx={sx2} cy={sy2} r="0.6" fill="oklch(0.95 0.05 60 / 0.6)" opacity={tw} />;
      })}
      {/* Earth */}
      <circle cx={cx} cy={cy} r={earthR} fill="url(#tg-earth-grad)" stroke="oklch(0.55 0.16 250 / 0.7)" strokeWidth="1" />
      {/* stylised continents */}
      <g fill="oklch(0.50 0.18 145 / 0.7)">
        <ellipse cx={cx - 20} cy={cy - 15} rx="22" ry="12" transform={`rotate(-15 ${cx - 20} ${cy - 15})`} />
        <ellipse cx={cx + 25} cy={cy + 5} rx="18" ry="10" transform={`rotate(20 ${cx + 25} ${cy + 5})`} />
        <ellipse cx={cx - 8} cy={cy + 25} rx="14" ry="8" transform={`rotate(10 ${cx - 8} ${cy + 25})`} />
      </g>
      {/* atmosphere halo */}
      <circle cx={cx} cy={cy} r={earthR + 4} fill="none" stroke="oklch(0.65 0.18 220 / 0.25)" strokeWidth="2" />
      {/* orbit path */}
      <ellipse cx={cx} cy={cy} rx={orbitR} ry={orbitR * 0.4} fill="none"
        stroke="oklch(0.65 0.12 250 / 0.4)" strokeWidth="0.8" strokeDasharray="3 3" />
      {/* trailing orbit segment */}
      <motion.line x1={cx} y1={cy} x2={sx} y2={sy}
        stroke="oklch(0.65 0.16 250 / 0.3)" strokeWidth="0.6" strokeDasharray="1 3"
        animate={{ x2: sx, y2: sy }}
        transition={{ duration: 0.06, ease: "linear" }}
      />
      {/* orbiting station — all modules move together via group translate */}
      <motion.g
        animate={{ x: sx - cx, y: sy - cy }}
        transition={{ duration: 0.06, ease: "linear" }}
      >
        {/* solar panels (left + right) */}
        <rect x={cx - 24} y={cy - 3} width="14" height="6"
          fill="url(#tg-solar-grad)" stroke="oklch(0.55 0.10 250)" strokeWidth="0.4" />
        <rect x={cx + 10} y={cy - 3} width="14" height="6"
          fill="url(#tg-solar-grad)" stroke="oklch(0.55 0.10 250)" strokeWidth="0.4" />
        {/* core module (Tianhe) */}
        <circle cx={cx} cy={cy} r="5"
          fill="url(#tg-station-grad)" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
        {/* Shenzhou docked (4D+) */}
        {modules >= 3 && (
          <rect x={cx - 2} y={cy + 5} width="4" height="8"
            fill="oklch(0.65 0.18 30)" stroke="oklch(0.45 0.10 30)" strokeWidth="0.4" />
        )}
        {/* Tianzhou cargo (5D+) */}
        {modules >= 5 && (
          <rect x={cx - 2} y={cy - 13} width="4" height="8"
            fill="oklch(0.65 0.18 165)" stroke="oklch(0.45 0.10 165)" strokeWidth="0.4" />
        )}
        {/* station labels */}
        <text x={cx} y={cy - 16} textAnchor="middle" fontSize="8"
          fill="oklch(0.85 0.18 30)" fontWeight="bold">Tiangong</text>
        {modules >= 3 && (
          <text x={cx + 10} y={cy + 16} textAnchor="start" fontSize="7"
            fill="oklch(0.75 0.18 30)">Shenzhou</text>
        )}
      </motion.g>
      {/* 5D: extra Beidou navigation satellites */}
      {dim === 5 && (
        <g opacity="0.75">
          {Array.from({ length: 3 }).map((_, i) => {
            const a2 = angle + (i + 1) * 2.1;
            const x2 = cx + (orbitR - 30) * Math.cos(a2);
            const y2 = cy + (orbitR - 30) * 0.4 * Math.sin(a2);
            return (
              <g key={`sat-${i}`}>
                <circle cx={x2} cy={y2} r="2" fill="oklch(0.85 0.18 165)" />
                <text x={x2 + 4} y={y2 - 4} fontSize="7" fill="oklch(0.65 0.12 165)">sat{i + 1}</text>
              </g>
            );
          })}
          <text x="180" y="20" textAnchor="middle" fontSize="8" fill="oklch(0.65 0.10 250)">Beidou + Tiangong network</text>
        </g>
      )}
      {/* N-D: multi-sensor band overlays */}
      {dim === 99 && (
        <g>
          <rect x="0" y="0" width="120" height="320" fill="oklch(0.65 0.18 60 / 0.10)" />
          <rect x="120" y="0" width="120" height="320" fill="oklch(0.65 0.18 165 / 0.10)" />
          <rect x="240" y="0" width="120" height="320" fill="oklch(0.65 0.18 320 / 0.10)" />
          <text x="60" y="20" textAnchor="middle" fontSize="8" fill="oklch(0.85 0.18 60)">optical</text>
          <text x="180" y="20" textAnchor="middle" fontSize="8" fill="oklch(0.85 0.18 165)">radar</text>
          <text x="300" y="20" textAnchor="middle" fontSize="8" fill="oklch(0.85 0.18 320)">IR</text>
        </g>
      )}
      <text x="180" y="305" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
        {dim === 3 ? "Tiangong (T-morph) · 340–450 km orbit"
          : dim === 4 ? "Tiangong + Shenzhou docked"
          : dim === 5 ? "Tiangong + Beidou navigation network"
          : "multi-sensor: optical · radar · IR"}
      </text>
    </svg>
  );
}

// ============================================================
// n-D toggle (3D / 4D / 5D / N-D)
// ============================================================
function DimToggle({ value, onChange }: { value: number; onChange: (d: number) => void }) {
  const options = [
    { d: 3, label: "3D", hint: "single object" },
    { d: 4, label: "4D", hint: "cluster / network" },
    { d: 5, label: "5D", hint: "cosmic web / full system" },
    { d: 99, label: "N-D", hint: "multi-wavelength" },
  ];
  return (
    <div className="flex flex-wrap gap-1.5 items-center justify-center bg-muted/30 rounded-md p-1.5 border border-border/40">
      <span className="text-[10px] text-muted-foreground px-1 flex items-center gap-1">
        <Layers className="h-3 w-3" /> scale:
      </span>
      {options.map(o => (
        <button
          key={o.d}
          type="button"
          onClick={() => onChange(o.d)}
          className={`text-[10px] px-2 py-1 rounded transition-colors ${
            value === o.d
              ? "bg-primary text-primary-foreground font-semibold"
              : "hover:bg-accent text-foreground/70"
          }`}
          title={o.hint}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================
// The 4 cards
// Code constructs - Python that computes the math behind each 3D visual
const JWST_GALLERY_CODE = `import math
H0 = 67.4; Omega_m = 0.315; Omega_Lambda = 0.685
D_H = 299792.458 / H0
def comoving_distance(z):
    N = 100; dz = z / N; d = 0
    for i in range(N):
        zi = i * dz; zf = (i+1) * dz
        Ei = 1.0 / math.sqrt(Omega_m * (1+zi)**3 + Omega_Lambda)
        Ef = 1.0 / math.sqrt(Omega_m * (1+zf)**3 + Omega_Lambda)
        d += 0.5 * (Ei + Ef) * dz
    return D_H * d
def lookback_time(z):
    t_H = 1.0 / H0 * 9.778; N = 100; dz = z / N; t = 0
    for i in range(N):
        zi = i * dz; zf = (i+1) * dz
        Ei = 1.0 / ((1+zi) * math.sqrt(Omega_m * (1+zi)**3 + Omega_Lambda))
        Ef = 1.0 / ((1+zf) * math.sqrt(Omega_m * (1+zf)**3 + Omega_Lambda))
        t += 0.5 * (Ei + Ef) * dz
    return t_H * t
print("=== JWST lookback time ===")
for z in [0.5, 1.0, 2.0, 5.0, 7.0, 10.0, 14.0]:
    D = comoving_distance(z); t = lookback_time(z)
    print(f"  z={z:>5.1f} -> D={D:>8.1f} Mpc, lookback={t:.2f} Gyr, age={13.8-t:.2f} Gyr")`;

const LIGO_GALLERY_CODE = `import math
def chirp_mass(m1, m2):
    return (m1 * m2)**0.6 / (m1 + m2)**0.2
def gw_strain(m1, m2, freq, dist_mpc):
    Mc = chirp_mass(m1, m2)
    h = 1e-21 * (Mc / 30)**(5/3) * (freq / 100)**(2/3) * (500 / dist_mpc)
    return h, Mc
print("=== GW strain for notable events ===")
for name, m1, m2, f, D in [("GW150914", 36, 29, 100, 410), ("GW170817", 1.46, 1.27, 100, 40), ("GW190521", 85, 66, 100, 5300)]:
    h, Mc = gw_strain(m1, m2, f, D)
    print(f"  {name}: Mc={Mc:.1f} Msun, h={h:.2e}, D={D} Mpc")`;

const LHC_GALLERY_CODE = `print("=== LHC n-subjettiness for jet tagging ===")
print("  tau_21 = tau_2 / tau_1 < 0.45 -> W boson (2-prong)")
print("  tau_32 = tau_3 / tau_2 < 0.65 -> top quark (3-prong)")
print("  LHC Run 3: 13.6 TeV, 140/fb target, ParticleNet ML tagger")`;

const TIANGONG_GALLERY_CODE = `import math
G = 6.674e-11; M_earth = 5.972e24; R_earth = 6.371e6
def orbital_period(altitude_km):
    a = (R_earth + altitude_km * 1000)
    T = 2 * math.pi * math.sqrt(a**3 / (G * M_earth))
    return T / 60
print("=== Orbital periods (Kepler 3rd law) ===")
for name, alt in [("ISS", 408), ("Tiangong", 389), ("Hubble", 540), ("GPS", 20200)]:
    T = orbital_period(alt)
    print(f"  {name:>12} at {alt:>5} km -> T = {T:.1f} min ({T/60:.2f} hr)")`;

// ============================================================
interface GalleryCard {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  icon: ReactNode;
  thumb: ReactNode;
  detail: ReactNode;
  caption: string;
  code?: string;
  mathExpr?: string;
}

const CARDS: GalleryCard[] = [
  {
    id: "jwst",
    title: "JWST deep field",
    subtitle: "galaxies at z = 7…14",
    accent: "oklch(0.65 0.16 60)",
    icon: <Telescope className="h-4 w-4" />,
    thumb: <JWSTDeepField3D dim={3} />,
    detail: <JWSTDeepField3D dim={3} />,
    caption: "JWST deep field — near-infrared imaging reveals the earliest galaxies, formed only ~300 Myr after the Big Bang. Cosmological redshift z = (λ_obs - λ_emit)/λ_emit stretches light from ultraviolet into JWST's NIRCam band. Higher z = farther = earlier universe. The central bright galaxy is at z ≈ 7; the fainter z = 14 dots are photons emitted when the universe was 3% of its current age.",
    code: JWST_GALLERY_CODE,
    mathExpr: "z = (lambda_obs - lambda_emit) / lambda_emit  ·  v = H0·d  ·  D_C = c/H0 * integral(dz/E(z))",
  },
  {
    id: "ligo",
    title: "LIGO interferometer",
    subtitle: "4 km arms · h ~ 10⁻²¹",
    accent: "oklch(0.65 0.16 165)",
    icon: <Radio className="h-4 w-4" />,
    thumb: <LIGOInterferometer3D dim={3} />,
    detail: <LIGOInterferometer3D dim={3} />,
    caption: "LIGO interferometer — two 4-km arms at right angles, laser light reflected back and forth ~280 times for an effective 1120 km path. A passing gravitational wave stretches one arm and compresses the other by ~10⁻²¹ m (1/10000 the width of a proton), detected as a phase shift at the photodetector. The 2015 detection GW150914 of two merging black holes confirmed Einstein's general relativity in the strong-field regime.",
    code: LIGO_GALLERY_CODE,
    mathExpr: "h = (4G/c^4) * (d2I/dt2) / r  ·  M_chirp = (m1*m2)^(3/5) / (m1+m2)^(1/5)",
  },
  {
    id: "lhc",
    title: "LHC collision",
    subtitle: "pp at √s = 13.6 TeV",
    accent: "oklch(0.65 0.16 25)",
    icon: <Atom className="h-4 w-4" />,
    thumb: <LHCCollision3D dim={3} />,
    detail: <LHCCollision3D dim={3} />,
    caption: "LHC collision — counter-rotating proton beams collide at centre-of-mass energy √s = 13.6 TeV inside ATLAS / CMS. Quarks and gluons scatter into narrow jets of hadrons; energetic leptons (electrons, muons) and photons escape cleanly without strong-interaction noise. E = mc² governs the mass of new particles that can be created — the Higgs boson (125 GeV) was discovered here in 2012 by detecting its decay into 4 leptons / 2 photons.",
    code: LHC_GALLERY_CODE,
    mathExpr: "tau_N = (1/pT2) * sum_k min(pT_i * dR_ik)  ·  tau_21 = tau_2/tau_1  ·  tau_32 = tau_3/tau_2",
  },
  {
    id: "tiangong",
    title: "Tiangong space station",
    subtitle: "340–450 km LEO",
    accent: "oklch(0.65 0.16 250)",
    icon: <Globe className="h-4 w-4" />,
    thumb: <TiangongStation3D dim={3} />,
    detail: <TiangongStation3D dim={3} />,
    caption: "Tiangong ('heavenly palace') — China's modular space station in low Earth orbit (340–450 km altitude, ~92 min orbital period). Composed of the Tianhe core module + Wentian + Mengtian experiment modules, with Shenzhou crewed craft and Tianzhou cargo craft docking periodically at the axial and radial ports. The two large solar panel wings track the Sun to supply ~100 kW. T² = (4π²/GM)·a³ sets the orbital period from the semi-major axis a.",
    code: TIANGONG_GALLERY_CODE,
    mathExpr: "T^2 = (4*pi^2/GM) * a^3  ·  v^2 = GM*(2/r - 1/a)  ·  F = GMm/r^2",
  },
];

// ============================================================
// Main carousel + lazy modal
// ============================================================
export function SpaceGallery3D() {
  const [dim, setDim] = useState(3);
  const [openId, setOpenId] = useState<string | null>(null);

  const openCard = openId ? CARDS.find(c => c.id === openId) : null;

  // Esc to close
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
        <Telescope className="h-3 w-3 text-sky-500/70" />
        <Radio className="h-3 w-3 text-emerald-500/70" />
        <Atom className="h-3 w-3 text-orange-500/70" />
        <Globe className="h-3 w-3 text-blue-500/70" />
        <Network className="h-3 w-3 text-purple-500/70" />
        <Cpu className="h-3 w-3 text-rose-500/70" />
        Click any card to pop up an animated 3D scene with a scale toggle + floating math/code background.
        <span className="text-[10px]">Modal content is lazy-rendered — no SVG animations mount until the card is opened.</span>
      </p>

      {/* 4 cards — grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {CARDS.map(c => (
          <motion.button
            key={c.id}
            type="button"
            onClick={() => setOpenId(c.id)}
            className="relative rounded-xl overflow-hidden border border-border/60 hover:border-primary/60 hover:shadow-lg transition-all bg-gradient-to-br from-card to-muted/30 group"
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            aria-label={`Open 3D gallery: ${c.title}`}
          >
            {/* 9:16 thumbnail with 3D animated scene */}
            <div className="relative w-full bg-gradient-to-br from-muted/40 to-card" style={{ aspectRatio: "9 / 14", maxHeight: 280 }}>
              <div className="absolute inset-0 p-2">
                {c.thumb}
              </div>
              <div className="absolute top-2 left-2 z-10">
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-0.5"
                  style={{ backgroundColor: c.accent + "20", color: c.accent }}>
                  {c.icon} 3D
                </Badge>
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ opacity: 1, scale: 1 }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur rounded-full p-2.5 border border-border shadow-md"
                >
                  <Box className="h-4 w-4 text-primary" />
                </motion.div>
              </div>
            </div>
            {/* caption */}
            <div className="p-2.5 border-t border-border/40 bg-background/80">
              <p className="text-xs font-semibold leading-tight" style={{ color: c.accent }}>
                {c.title}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{c.subtitle}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* LAZY modal — only mounts the heavy SVG + background when open */}
      <AnimatePresence>
        {openCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 md:p-6 overflow-y-auto"
            onClick={() => setOpenId(null)}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setOpenId(null)}
              className="absolute top-3 right-3 z-30 p-2 rounded-full bg-background/90 border border-border hover:bg-accent transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            {/* Title pill */}
            <div className="absolute top-3 left-3 z-30 px-3 py-1.5 rounded-full bg-background/90 border border-border flex items-center gap-2 text-xs font-semibold">
              <span style={{ color: openCard.accent }}>{openCard.icon}</span>
              <span style={{ color: openCard.accent }}>{openCard.title}</span>
              <span className="text-muted-foreground font-normal">· 3D animated · lazy-loaded</span>
            </div>
            {/* Modal body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-4xl my-8 rounded-xl border border-border bg-background shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with dim toggle */}
              <div className="border-b border-border/40 bg-muted/20 px-4 md:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                    style={{ backgroundColor: openCard.accent + "20" }}
                  >
                    {openCard.icon}
                  </div>
                  <div>
                    <p className="text-base font-bold leading-tight" style={{ color: openCard.accent }}>
                      {openCard.title}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">{openCard.subtitle}</p>
                  </div>
                </div>
                <DimToggle value={dim} onChange={setDim} />
              </div>

              {/* Main animated scene with floating math/code background */}
              <div className="relative bg-gradient-to-br from-background to-muted/30 p-4 md:p-6">
                {/* Floating background — math/code snippets drifting subtly */}
                <FloatingBackground />
                {/* Foreground — the actual 3D scene */}
                <div className="relative z-10 max-h-[70vh] overflow-hidden rounded-lg bg-card/40 backdrop-blur-sm">
                  <Scene3D w={360} h={320}>
                    {openCard.id === "jwst" && <JWSTDeepField3D dim={dim} />}
                    {openCard.id === "ligo" && <LIGOInterferometer3D dim={dim} />}
                    {openCard.id === "lhc" && <LHCCollision3D dim={dim} />}
                    {openCard.id === "tiangong" && <TiangongStation3D dim={dim} />}
                  </Scene3D>
                </div>
              </div>

              {/* Math foundation — the centrepiece */}
              {openCard.mathExpr && (
                <div className="border-t border-border/40 bg-primary/5 px-4 md:px-6 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Math foundation</p>
                  <p className="font-mono text-xs text-primary leading-relaxed">{openCard.mathExpr}</p>
                </div>
              )}
              {/* Code construct — run the computation */}
              {openCard.code && (
                <div className="border-t border-border/40 px-4 md:px-6 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Code construct - run the computation</p>
                  <PyodideRunner
                    buttonLabel="Run computation (Pyodide)"
                    code={openCard.code}
                  />
                </div>
              )}

              {/* Footer with caption */}
              <div className="border-t border-border/40 bg-muted/20 px-4 md:px-6 py-3">
                <p className="text-xs text-muted-foreground leading-relaxed">{openCard.caption}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-2">
                  Toggle scale above — 3D shows the simplest case (single object).
                  Higher scales reveal how the same concept grows into clusters,
                  cosmic webs, and multi-wavelength views. The drifting background
                  shows the math + code that powers the visual.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
