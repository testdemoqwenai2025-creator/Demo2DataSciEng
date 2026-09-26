"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Atom, Box, Layers, Network, Cpu, Activity, TrendingUp, Zap, Telescope, Radio, Globe, Moon,
} from "lucide-react";
import {
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
} from "./space-interactives-part1";

/**
 * SpaceInteractives — 8 fully interactive space-science visuals, each
 * opening in a lazy browser popup. Mirrors the quantum-interactives.tsx
 * pattern but with space-science topics spanning NASA + Chinese space
 * sector + dark matter / dark energy / JWST / LIGO / LHC / FAST / Beidou
 * / Chang'e / Tiangong.
 *
 * Lazy evaluation: each interactive's heavy SVG + state only mounts when
 * the user clicks its card. Cards that are never opened cost zero render
 * time.
 */

interface InteractiveCard {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  accent: string;
  icon: ReactNode;
  thumb: ReactNode;
  content: ReactNode;
}

const CARDS: InteractiveCard[] = [
  {
    id: "orbit",
    step: "1",
    title: "Draggable orbit (Kepler's 3rd law)",
    subtitle: "a, e, M sliders → orbital period",
    accent: "oklch(0.55 0.16 30)",
    icon: <Globe className="h-4 w-4" />,
    thumb: <OrbitThumb />,
    content: <DraggableOrbit />,
  },
  {
    id: "transit",
    step: "2",
    title: "Exoplanet transit depth",
    subtitle: "ΔF/F = (Rp/Rs)² — JWST vs Kepler",
    accent: "oklch(0.55 0.16 200)",
    icon: <Atom className="h-4 w-4" />,
    thumb: <TransitThumb />,
    content: <TransitDepthCalculator />,
  },
  {
    id: "gw",
    step: "3",
    title: "Gravitational wave strain",
    subtitle: "LIGO O4 + TianQin — m1, m2, D, f",
    accent: "oklch(0.55 0.16 165)",
    icon: <Radio className="h-4 w-4" />,
    thumb: <GWThumb />,
    content: <GravitationalWaveStrain />,
  },
  {
    id: "jet",
    step: "4",
    title: "LHC jet substructure (n-subjettiness)",
    subtitle: "τ21 tags W, τ32 tags top — 13.6 TeV",
    accent: "oklch(0.55 0.16 250)",
    icon: <Cpu className="h-4 w-4" />,
    thumb: <JetThumb />,
    content: <JetSubstructure />,
  },
  {
    id: "jwst",
    step: "5",
    title: "JWST vs Hubble resolution",
    subtitle: "6.5× collecting area, IR vs optical",
    accent: "oklch(0.55 0.16 60)",
    icon: <Telescope className="h-4 w-4" />,
    thumb: <JWSTThumb />,
    content: <JWSTvsHubble />,
  },
  {
    id: "beidou",
    step: "6",
    title: "Beidou GNSS constellation",
    subtitle: "China's GPS — 3 GEO + 3 IGSO + 24 MEO",
    accent: "oklch(0.55 0.16 165)",
    icon: <Globe className="h-4 w-4" />,
    thumb: <BeidouThumb />,
    content: <BeidouConstellation />,
  },
  {
    id: "change",
    step: "7",
    title: "Chang'e lunar trajectory",
    subtitle: "CE-5 (2020), CE-6 (2024 far-side), Tianwen-1 (Mars)",
    accent: "oklch(0.55 0.16 0)",
    icon: <Moon className="h-4 w-4" />,
    thumb: <ChangEThumb />,
    content: <ChangeLunarTrajectory />,
  },
  {
    id: "darkmatter",
    step: "8",
    title: "Dark matter rotation curve",
    subtitle: "NGC 3198 — flat curve, 85% invisible mass",
    accent: "oklch(0.55 0.16 320)",
    icon: <Activity className="h-4 w-4" />,
    thumb: <DarkMatterThumb />,
    content: <DarkMatterRotationCurve />,
  },
];

// ============================================================
// Animated thumbnails (small previews that render in each card)
// ============================================================

function OrbitThumb() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <ellipse cx="50" cy="65" rx="32" ry="20" fill="none" stroke="oklch(0.65 0.16 30 / 0.5)" strokeWidth="0.5" strokeDasharray="2 1" />
      <circle cx="50" cy="65" r="8" fill="oklch(0.85 0.20 60)" />
      <motion.circle cx="80" cy="65" r="3" fill="oklch(0.85 0.18 200)"
        animate={{ cx: [80, 50, 20, 50, 80], cy: [65, 50, 65, 80, 65] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
      <text x="50" y="115" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.10 250)">T² ∝ a³</text>
      <text x="50" y="125" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.10 250)">Kepler 3rd law</text>
    </svg>
  );
}

function TransitThumb() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <circle cx="50" cy="55" r="22" fill="oklch(0.85 0.20 60)" stroke="oklch(0.65 0.20 30)" strokeWidth="0.5" />
      <motion.circle cx="50" cy="55" r="3" fill="oklch(0.40 0.05 200)"
        animate={{ cx: [30, 50, 70, 50, 30] }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
      />
      {/* Light curve below */}
      <line x1="10" y1="115" x2="90" y2="115" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <motion.path d="M 10 115 L 30 115 L 35 110 L 45 105 L 50 108 L 55 105 L 65 110 L 70 115 L 90 115"
        fill="none" stroke="oklch(0.75 0.20 200)" strokeWidth="1"
      />
      <text x="50" y="135" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.10 250)">ΔF/F = (Rp/Rs)²</text>
    </svg>
  );
}

function GWThumb() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <line x1="10" y1="70" x2="90" y2="70" stroke="oklch(0.55 0.10 250 / 0.3)" strokeWidth="0.5" />
      <motion.path
        d="M 10 70 Q 20 50 30 70 T 50 70 T 70 70 T 90 70"
        fill="none" stroke="oklch(0.75 0.20 165)" strokeWidth="1.5"
        animate={{ d: ["M 10 70 Q 20 50 30 70 T 50 70 T 70 70 T 90 70", "M 10 70 Q 20 90 30 70 T 50 70 T 70 70 T 90 70", "M 10 70 Q 20 50 30 70 T 50 70 T 70 70 T 90 70"] }}
        transition={{ duration: 0.5, repeat: Infinity }}
      />
      <text x="50" y="25" textAnchor="middle" fontSize="6" fill="oklch(0.75 0.20 165)" fontWeight="bold">h ~ 10⁻²¹</text>
      <text x="50" y="105" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.10 250)">LIGO + TianQin</text>
      <text x="50" y="115" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.10 250)">GW detector</text>
    </svg>
  );
}

function JetThumb() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <line x1="10" y1="70" x2="90" y2="70" stroke="oklch(0.55 0.10 250 / 0.3)" strokeWidth="0.5" />
      <line x1="50" y1="20" x2="50" y2="120" stroke="oklch(0.55 0.10 250 / 0.3)" strokeWidth="0.5" />
      <circle cx="55" cy="65" r="6" fill="oklch(0.75 0.20 30 / 0.5)" stroke="oklch(0.75 0.20 30)" strokeWidth="0.5" />
      <circle cx="40" cy="80" r="4" fill="oklch(0.75 0.20 165 / 0.5)" stroke="oklch(0.75 0.20 165)" strokeWidth="0.5" />
      <circle cx="65" cy="85" r="3" fill="oklch(0.75 0.20 250 / 0.5)" stroke="oklch(0.75 0.20 250)" strokeWidth="0.5" />
      <text x="50" y="125" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.10 250)">τ_N n-subjettiness</text>
      <text x="50" y="135" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.10 250)">LHC Run 3</text>
    </svg>
  );
}

function JWSTThumb() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <defs>
        <radialGradient id="jwst-thumb-grad" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="oklch(0.95 0.20 60)" />
          <stop offset="50%" stopColor="oklch(0.65 0.20 30 / 0.7)" />
          <stop offset="100%" stopColor="oklch(0.40 0.20 250 / 0.0)" />
        </radialGradient>
      </defs>
      <motion.circle cx="50" cy="65" r="25" fill="url(#jwst-thumb-grad)"
        animate={{ r: [25, 18, 25] }} transition={{ duration: 3, repeat: Infinity }}
      />
      {/* Hexagonal mirror segments */}
      {[0, 1, 2, 3, 4, 5].map(i => {
        const angle = (i / 6) * 2 * Math.PI;
        return (
          <motion.polygon
            key={i}
            points="50,65 53,60 58,65 53,70 50,65"
            fill="none" stroke="oklch(0.65 0.20 30 / 0.6)" strokeWidth="0.5"
            animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
            transform={`rotate(${(angle * 180 / Math.PI)} 50 65) translate(0 -15)`}
          />
        );
      })}
      <text x="50" y="115" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.10 250)">JWST 6.5m mirror</text>
      <text x="50" y="125" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.10 250)">z &gt; 14 galaxies</text>
    </svg>
  );
}

function BeidouThumb() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <circle cx="50" cy="65" r="12" fill="oklch(0.65 0.16 250)" />
      <ellipse cx="50" cy="65" rx="22" ry="22" fill="none" stroke="oklch(0.55 0.10 250 / 0.3)" strokeWidth="0.5" strokeDasharray="2 1" />
      <ellipse cx="50" cy="65" rx="30" ry="30" fill="none" stroke="oklch(0.55 0.10 250 / 0.3)" strokeWidth="0.5" strokeDasharray="2 1" />
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * 2 * Math.PI;
        return (
          <motion.circle key={i}
            cx={50 + 25 * Math.cos(angle)} cy={65 + 25 * Math.sin(angle)} r="2" fill="oklch(0.75 0.20 30)"
            animate={{ angle: [angle, angle + Math.PI / 4, angle] }}
            transition={{ duration: 8, repeat: Infinity }}
            style={{ transformOrigin: "50px 65px" }}
          />
        );
      })}
      <text x="50" y="115" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.10 250)">30 sats</text>
      <text x="50" y="125" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.10 250)">BDS-3 (2020+)</text>
    </svg>
  );
}

function ChangEThumb() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <circle cx="20" cy="65" r="8" fill="oklch(0.65 0.16 250)" />
      <circle cx="80" cy="65" r="6" fill="oklch(0.50 0.05 250)" />
      <motion.path
        d="M 20 65 Q 50 35 80 65"
        fill="none" stroke="oklch(0.65 0.16 30 / 0.5)" strokeWidth="0.8" strokeDasharray="2 1"
        animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.circle cx="50" cy="35" r="2" fill="oklch(0.85 0.20 30)"
        animate={{ cx: [20, 50, 80, 50, 20], cy: [65, 35, 65, 95, 65] }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
      />
      <text x="20" y="90" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.10 250)">🌍</text>
      <text x="80" y="80" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.10 250)">🌑</text>
      <text x="50" y="115" textAnchor="middle" fontSize="6" fill="oklch(0.85 0.20 30)" fontWeight="bold">Chang'e 6</text>
      <text x="50" y="125" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.10 250)">far-side (2024)</text>
    </svg>
  );
}

function DarkMatterThumb() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <line x1="10" y1="115" x2="90" y2="115" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <line x1="10" y1="25" x2="10" y2="115" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <motion.path d="M 10 30 Q 30 80 50 90 T 90 95"
        fill="none" stroke="oklch(0.75 0.20 165)" strokeWidth="1.5"
      />
      <motion.path d="M 10 30 Q 20 80 30 110 T 50 115"
        fill="none" stroke="oklch(0.65 0.16 30 / 0.6)" strokeWidth="0.8" strokeDasharray="2 1"
      />
      {[20, 40, 60, 80].map((x, i) => (
        <circle key={i} cx={x} cy={90 - i * 2} r="1.5" fill="oklch(0.85 0.18 25)" />
      ))}
      <text x="50" y="135" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.10 250)">NGC 3198 rotation</text>
    </svg>
  );
}

// ============================================================
// Main grid component
// ============================================================

export function SpaceInteractives() {
  const [openId, setOpenId] = useState<string | null>(null);
  const openCard = openId ? CARDS.find(c => c.id === openId) : null;

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5 flex-wrap">
        <Zap className="h-3 w-3 text-amber-500" />
        Click any card to open an interactive visual in a lazy popup — drag orbits, slide exoplanet radii, watch GW waveforms, toggle Beidou vs GPS, fly Chang&apos;e 6 to the far-side Moon, find dark matter in galaxy rotation curves…
        <span className="text-[10px]">Modal content only mounts on click.</span>
      </p>

      {/* 8 cards in a grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {CARDS.map(c => (
          <motion.button
            key={c.id}
            type="button"
            onClick={() => setOpenId(c.id)}
            className="relative rounded-xl overflow-hidden border border-border/60 hover:border-primary/60 hover:shadow-lg transition-all bg-gradient-to-br from-card to-muted/30 group"
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            aria-label={`Open interactive: ${c.title}`}
          >
            <div className="relative w-full bg-gradient-to-br from-muted/40 to-card" style={{ aspectRatio: "9 / 14", maxHeight: 280 }}>
              <div className="absolute inset-0 p-2">
                {c.thumb}
              </div>
              <div className="absolute top-2 left-2 z-10">
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-0.5"
                  style={{ backgroundColor: c.accent + "20", color: c.accent }}>
                  {c.icon} SPACE {c.step}
                </Badge>
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ opacity: 1, scale: 1 }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur rounded-full p-2.5 border border-border shadow-md"
                >
                  <Atom className="h-4 w-4 text-primary" />
                </motion.div>
              </div>
            </div>
            <div className="p-2.5 border-t border-border/40 bg-background/80">
              <p className="text-xs font-semibold leading-tight" style={{ color: c.accent }}>
                {c.title}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{c.subtitle}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* LAZY modal — only mounts the heavy interactive when card is clicked */}
      <LazyModal
        open={!!openCard}
        onClose={() => setOpenId(null)}
        title={openCard?.title ?? ""}
        subtitle={openCard?.subtitle}
        accent={openCard?.accent ?? "oklch(0.55 0.16 250)"}
        icon={openCard?.icon ?? <Atom className="h-4 w-4" />}
      >
        {openCard?.content}
      </LazyModal>
    </div>
  );
}
