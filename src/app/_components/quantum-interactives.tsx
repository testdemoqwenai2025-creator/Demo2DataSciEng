"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { X, Atom, Box, Layers, Network, Cpu, Activity, TrendingUp, Zap } from "lucide-react";
import {
  DraggableBlochSphere,
  SurfaceCodePatch,
  QuantumSpeedupChart,
  MajoranaWire,
  LazyModal,
} from "./quantum-interactives-part1";
import {
  DecoherenceTimeline,
  QiskitCircuit,
  HeliosConnectivity,
  ShorResources,
  ShorAlgorithmN15,
} from "./quantum-interactives-part2";

/**
 * QuantumInteractives — 8 fully interactive visuals, each in a lazy browser
 * popup. Replaces the previous "Improvement designs — 8 code previews" section
 * (which had Pyodide-runnable code) with actual interactive components:
 * drag the Bloch vector, click qubits to inject errors, slide μ across the
 * topological phase boundary, run 8192-shot sampling, etc.
 *
 * Lazy evaluation: each interactive's heavy SVG + React state only mounts
 * when the user clicks its card. Cards that are never opened cost zero
 * render time.
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
    id: "bloch",
    step: "1",
    title: "Draggable Bloch sphere",
    subtitle: "drag (θ,φ), apply gates, measure",
    accent: "oklch(0.55 0.16 250)",
    icon: <Atom className="h-4 w-4" />,
    thumb: <BlochThumb />,
    content: <DraggableBlochSphere />,
  },
  {
    id: "surface-code",
    step: "2",
    title: "Surface code patch",
    subtitle: "inject errors, see syndrome, scale d",
    accent: "oklch(0.55 0.16 165)",
    icon: <Box className="h-4 w-4" />,
    thumb: <SurfaceCodeThumb />,
    content: <SurfaceCodePatch />,
  },
  {
    id: "speedup",
    step: "3",
    title: "Quantum speedup chart",
    subtitle: "log-log bars, N slider, hardware feasibility",
    accent: "oklch(0.55 0.16 30)",
    icon: <TrendingUp className="h-4 w-4" />,
    thumb: <SpeedupThumb />,
    content: <QuantumSpeedupChart />,
  },
  {
    id: "majorana",
    step: "4",
    title: "Majorana zero-mode wire",
    subtitle: "slide μ across topological phase boundary",
    accent: "oklch(0.55 0.16 200)",
    icon: <Activity className="h-4 w-4" />,
    thumb: <MajoranaThumb />,
    content: <MajoranaWire />,
  },
  {
    id: "timeline",
    step: "5",
    title: "Decoherence timeline",
    subtitle: "1998 → 2024 + projections, hover markers",
    accent: "oklch(0.55 0.16 320)",
    icon: <Activity className="h-4 w-4" />,
    thumb: <TimelineThumb />,
    content: <DecoherenceTimeline />,
  },
  {
    id: "qiskit",
    step: "6",
    title: "Qiskit Bell circuit",
    subtitle: "transpile to native gates, run 8192 shots",
    accent: "oklch(0.55 0.16 250)",
    icon: <Cpu className="h-4 w-4" />,
    thumb: <QiskitThumb />,
    content: <QiskitCircuit />,
  },
  {
    id: "helios",
    step: "7",
    title: "Helios all-to-all vs heavy-hex",
    subtitle: "N slider, SWAP overhead, fidelity comparison",
    accent: "oklch(0.55 0.16 165)",
    icon: <Network className="h-4 w-4" />,
    thumb: <HeliosThumb />,
    content: <HeliosConnectivity />,
  },
  {
    id: "shor",
    step: "8",
    title: "Shor resource estimation",
    subtitle: "RSA-{256..8192}, years-to-Shor countdown",
    accent: "oklch(0.55 0.16 0)",
    icon: <Atom className="h-4 w-4" />,
    thumb: <ShorThumb />,
    content: <ShorResources />,
  },
  {
    id: "shor-n15",
    step: "9",
    title: "Shor's algorithm (N=15)",
    subtitle: "actual simulator — Hadamard → a^x mod N → QFT → factors",
    accent: "oklch(0.55 0.16 30)",
    icon: <Cpu className="h-4 w-4" />,
    thumb: <ShorN15Thumb />,
    content: <ShorAlgorithmN15 />,
  },
];

// ============================================================
// Animated thumbnails (small previews that render in each card)
// ============================================================

function BlochThumb() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <circle cx="50" cy="65" r="32" fill="none" stroke="oklch(0.65 0.16 250 / 0.7)" strokeWidth="1" />
      <ellipse cx="50" cy="65" rx="32" ry="10" fill="none" stroke="oklch(0.65 0.16 250 / 0.4)" strokeWidth="0.5" strokeDasharray="2 1" />
      <line x1="50" y1="33" x2="50" y2="97" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <motion.line
        x1="50" y1="65" x2="78" y2="50"
        stroke="oklch(0.75 0.20 25)" strokeWidth="1.5"
        animate={{ x2: [78, 70, 50, 30, 22, 50, 78], y2: [50, 35, 33, 50, 80, 97, 50] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
      <motion.circle cx="78" cy="50" r="2.5" fill="oklch(0.85 0.20 25)"
        animate={{ cx: [78, 70, 50, 30, 22, 50, 78], cy: [50, 35, 33, 50, 80, 65, 50] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
      <text x="50" y="15" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.10 250)" fontWeight="bold">|0⟩</text>
      <text x="50" y="115" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.10 250)" fontWeight="bold">|1⟩</text>
      <text x="50" y="132" textAnchor="middle" fontSize="6" fill="oklch(0.75 0.20 25)">|ψ⟩ rotating</text>
    </svg>
  );
}

function SurfaceCodeThumb() {
  const dots = Array.from({ length: 9 }, (_, i) => ({
    x: 25 + (i % 3) * 25,
    y: 35 + Math.floor(i / 3) * 25,
  }));
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      {dots.map((d, i) => (
        <g key={i}>
          {i % 3 < 2 && <line x1={d.x} y1={d.y} x2={d.x + 25} y2={d.y} stroke="oklch(0.55 0.10 250 / 0.4)" strokeWidth="0.5" />}
          {Math.floor(i / 3) < 2 && <line x1={d.x} y1={d.y} x2={d.x} y2={d.y + 25} stroke="oklch(0.55 0.10 250 / 0.4)" strokeWidth="0.5" />}
        </g>
      ))}
      {dots.map((d, i) => (
        <motion.circle key={`d-${i}`} cx={d.x} cy={d.y} r={i === 4 ? 5 : 3.5}
          fill={i === 4 ? "oklch(0.75 0.20 0)" : "oklch(0.65 0.16 250)"}
          animate={i === 4 ? { r: [5, 7, 5] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      ))}
      {/* Syndrome flash on neighbours */}
      {[1, 3, 5, 7].map(i => (
        <motion.circle key={`s-${i}`} cx={dots[i].x} cy={dots[i].y} r="2"
          fill="oklch(0.75 0.20 165)"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
        />
      ))}
      <text x="50" y="125" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.10 250)">d=3 · click to inject error</text>
    </svg>
  );
}

function SpeedupThumb() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <line x1="15" y1="115" x2="90" y2="115" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <motion.rect x="20" y="35" width="14" height="80" fill="oklch(0.65 0.16 250)" opacity="0.5" rx="1" />
      <motion.rect x="40" y="80" width="14" height="35" fill="oklch(0.65 0.16 30)" rx="1"
        animate={{ y: [80, 70, 80], height: [35, 45, 35] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.rect x="60" y="50" width="14" height="65" fill="oklch(0.65 0.16 250)" opacity="0.5" rx="1" />
      <motion.rect x="80" y="100" width="14" height="15" fill="oklch(0.65 0.16 165)" rx="1"
        animate={{ y: [100, 95, 100], height: [15, 20, 15] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <text x="50" y="132" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.10 250)">classical vs quantum</text>
    </svg>
  );
}

function MajoranaThumb() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <line x1="15" y1="60" x2="85" y2="60" stroke="oklch(0.55 0.10 250)" strokeWidth="1.5" />
      {Array.from({ length: 8 }).map((_, i) => (
        <circle key={i} cx={15 + i * 10} cy="60" r="2.5" fill="oklch(0.65 0.16 250)" />
      ))}
      {/* Majorana endpoints */}
      <motion.circle cx="15" cy="60" r="5" fill="oklch(0.75 0.20 165)" stroke="oklch(0.85 0.20 165)" strokeWidth="1"
        animate={{ r: [5, 7, 5] }} transition={{ duration: 1.5, repeat: Infinity }}
      />
      <motion.circle cx="85" cy="60" r="5" fill="oklch(0.75 0.20 165)" stroke="oklch(0.85 0.20 165)" strokeWidth="1"
        animate={{ r: [5, 7, 5] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.7 }}
      />
      <text x="15" y="45" textAnchor="middle" fontSize="6" fill="oklch(0.85 0.20 165)" fontWeight="bold">γL</text>
      <text x="85" y="45" textAnchor="middle" fontSize="6" fill="oklch(0.85 0.20 165)" fontWeight="bold">γR</text>
      {/* Energy spectrum dots */}
      <line x1="15" y1="100" x2="85" y2="100" stroke="oklch(0.55 0.10 250 / 0.4)" strokeWidth="0.5" strokeDasharray="2 1" />
      <circle cx="20" cy="100" r="1.5" fill="oklch(0.75 0.20 165)" />
      <circle cx="22" cy="100" r="1.5" fill="oklch(0.75 0.20 165)" />
      {Array.from({ length: 6 }).map((_, i) => (
        <g key={i}>
          <circle cx={35 + i * 5} cy={100 - 12} r="1.5" fill="oklch(0.65 0.16 250)" />
          <circle cx={35 + i * 5} cy={100 + 12} r="1.5" fill="oklch(0.65 0.16 250)" />
        </g>
      ))}
      <text x="50" y="135" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.10 250)">topological wire</text>
    </svg>
  );
}

function TimelineThumb() {
  const pts = [
    { x: 15, y: 105 }, { x: 28, y: 95 }, { x: 41, y: 80 },
    { x: 54, y: 65 }, { x: 67, y: 55 }, { x: 80, y: 40 },
  ];
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <line x1="10" y1="115" x2="90" y2="115" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <line x1="10" y1="20" x2="10" y2="115" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <motion.polyline
        points={pts.map(p => `${p.x},${p.y}`).join(" ")}
        fill="none" stroke="oklch(0.65 0.16 250 / 0.6)" strokeWidth="1" strokeDasharray="2 1"
      />
      {pts.map((p, i) => (
        <motion.circle key={i} cx={p.x} cy={p.y} r="2.5" fill="oklch(0.65 0.16 250)"
          animate={{ r: [2.5, 4, 2.5] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
      <line x1="10" y1="80" x2="90" y2="80" stroke="oklch(0.75 0.20 0)" strokeWidth="0.5" strokeDasharray="2 1" />
      <text x="50" y="75" textAnchor="middle" fontSize="6" fill="oklch(0.75 0.20 0)" fontWeight="bold">threshold</text>
      <text x="50" y="135" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.10 250)">T₁ doubling</text>
    </svg>
  );
}

function QiskitThumb() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <line x1="15" y1="40" x2="85" y2="40" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <line x1="15" y1="85" x2="85" y2="85" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <motion.rect x="25" y="35" width="10" height="10" fill="oklch(0.65 0.16 250)" rx="1"
        animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
      />
      <text x="30" y="42" textAnchor="middle" fontSize="6" fill="white" fontWeight="bold">H</text>
      <circle cx="55" cy="40" r="2" fill="oklch(0.65 0.16 250)" />
      <line x1="55" y1="42" x2="55" y2="83" stroke="oklch(0.65 0.16 250)" strokeWidth="0.8" />
      <circle cx="55" cy="85" r="4" fill="none" stroke="oklch(0.65 0.16 250)" strokeWidth="0.8" />
      <line x1="51" y1="85" x2="59" y2="85" stroke="oklch(0.65 0.16 250)" strokeWidth="0.8" />
      <text x="15" y="35" fontSize="5" fill="oklch(0.55 0.10 250)">q0</text>
      <text x="15" y="80" fontSize="5" fill="oklch(0.55 0.10 250)">q1</text>
      {/* Histogram */}
      <line x1="15" y1="120" x2="85" y2="120" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <rect x="25" y="105" width="14" height="15" fill="oklch(0.65 0.16 250)" rx="1" />
      <rect x="65" y="105" width="14" height="15" fill="oklch(0.65 0.16 250)" rx="1" />
      <text x="50" y="135" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.10 250)">Bell circuit</text>
    </svg>
  );
}

function HeliosThumb() {
  // Heavy-hex on left, complete graph on right
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      {/* Heavy-hex */}
      <text x="25" y="20" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.16 250)" fontWeight="bold">SC</text>
      <line x1="10" y1="50" x2="40" y2="50" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <line x1="10" y1="80" x2="40" y2="80" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <line x1="10" y1="50" x2="10" y2="80" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <line x1="25" y1="50" x2="25" y2="80" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <line x1="40" y1="50" x2="40" y2="80" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      {[10, 25, 40].map(x => [50, 80].map(y => <circle cx={x} cy={y} r="2" fill="oklch(0.65 0.16 250)" />)[0])}
      {/* Complete graph */}
      <text x="75" y="20" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.16 165)" fontWeight="bold">Ion</text>
      <circle cx="75" cy="65" r="20" fill="none" stroke="oklch(0.55 0.16 165 / 0.4)" strokeWidth="0.5" strokeDasharray="1 1" />
      {[0, 1, 2, 3, 4].map(i => {
        const angle = (i / 5) * 2 * Math.PI - Math.PI / 2;
        return <circle key={i} cx={75 + 20 * Math.cos(angle)} cy={65 + 20 * Math.sin(angle)} r="2" fill="oklch(0.65 0.16 165)" />;
      })}
      {[0, 1, 2, 3, 4].map(i =>
        [0, 1, 2, 3, 4].map(j => {
          if (i >= j) return null;
          const a1 = (i / 5) * 2 * Math.PI - Math.PI / 2;
          const a2 = (j / 5) * 2 * Math.PI - Math.PI / 2;
          return (
            <line key={`${i}-${j}`}
              x1={75 + 20 * Math.cos(a1)} y1={65 + 20 * Math.sin(a1)}
              x2={75 + 20 * Math.cos(a2)} y2={65 + 20 * Math.sin(a2)}
              stroke="oklch(0.55 0.16 165 / 0.3)" strokeWidth="0.3"
            />
          );
        })
      )}
      <text x="50" y="115" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.10 250)">heavy-hex vs all-to-all</text>
      <text x="50" y="125" textAnchor="middle" fontSize="6" fill="oklch(0.75 0.20 0)" fontWeight="bold">SWAP overhead</text>
    </svg>
  );
}

function ShorThumb() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <line x1="10" y1="115" x2="90" y2="115" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <line x1="10" y1="20" x2="10" y2="115" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <motion.rect x="18" y="100" width="10" height="15" fill="oklch(0.65 0.16 250)" rx="1" />
      <motion.rect x="30" y="90" width="10" height="25" fill="oklch(0.65 0.16 250)" rx="1" />
      <motion.rect x="42" y="75" width="10" height="40" fill="oklch(0.65 0.16 250)" rx="1" />
      <motion.rect x="54" y="55" width="10" height="60" fill="oklch(0.75 0.20 0)" rx="1"
        animate={{ y: [55, 50, 55], height: [60, 65, 60] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <motion.rect x="66" y="35" width="10" height="80" fill="oklch(0.65 0.16 250)" rx="1" />
      <motion.rect x="78" y="25" width="10" height="90" fill="oklch(0.65 0.16 250)" rx="1" />
      <line x1="10" y1="108" x2="90" y2="108" stroke="oklch(0.75 0.20 0)" strokeWidth="0.5" strokeDasharray="2 1" />
      <text x="50" y="135" textAnchor="middle" fontSize="6" fill="oklch(0.65 0.10 250)">RSA key size (log scale)</text>
    </svg>
  );
}

function ShorN15Thumb() {
  // Two-qubit rails + Hadamard + modular-exp box + QFT + measure
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      {/* Register 1 rail */}
      <line x1="10" y1="40" x2="90" y2="40" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <text x="6" y="42" fontSize="5" fill="oklch(0.55 0.10 250)">reg1</text>
      {/* Register 2 rail */}
      <line x1="10" y1="80" x2="90" y2="80" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
      <text x="6" y="82" fontSize="5" fill="oklch(0.55 0.10 250)">reg2</text>
      {/* H gate */}
      <motion.rect x="18" y="35" width="10" height="10" fill="oklch(0.65 0.16 30)" rx="1"
        animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
      <text x="23" y="42" textAnchor="middle" fontSize="6" fill="white" fontWeight="bold">H</text>
      {/* Modular exp box */}
      <motion.rect x="38" y="35" width="20" height="50" fill="oklch(0.65 0.16 165 / 0.4)" stroke="oklch(0.65 0.16 165)" strokeWidth="0.5" rx="1"
        animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
      <text x="48" y="62" textAnchor="middle" fontSize="6" fill="oklch(0.95 0.10 165)" fontWeight="bold">a^x</text>
      <text x="48" y="68" textAnchor="middle" fontSize="5" fill="oklch(0.95 0.10 165)">mod N</text>
      {/* QFT */}
      <motion.rect x="68" y="35" width="14" height="10" fill="oklch(0.65 0.16 250)" rx="1"
        animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }} />
      <text x="75" y="42" textAnchor="middle" fontSize="6" fill="white" fontWeight="bold">QFT</text>
      {/* Measure */}
      <rect x="84" y="35" width="8" height="10" fill="oklch(0.65 0.16 0)" rx="1" />
      <text x="88" y="42" textAnchor="middle" fontSize="5" fill="white" fontWeight="bold">M</text>
      {/* Output: factors */}
      <text x="50" y="100" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.10 250)" fontWeight="bold">N=15</text>
      <motion.text x="50" y="115" textAnchor="middle" fontSize="9" fill="oklch(0.75 0.20 25)" fontWeight="bold"
        animate={{ opacity: [0, 1, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}>3 × 5</motion.text>
      <text x="50" y="135" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.10 250)">Shor factoring</text>
    </svg>
  );
}

// ============================================================
// Main grid component
// ============================================================

export function QuantumInteractives() {
  const [openId, setOpenId] = useState<string | null>(null);
  const openCard = openId ? CARDS.find(c => c.id === openId) : null;

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5 flex-wrap">
        <Zap className="h-3 w-3 text-amber-500" />
        Click any card to open an interactive visual in a lazy popup — drag the Bloch sphere, inject errors, slide μ, run 8192-shot sampling…
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
                  {c.icon} INTERACT {c.step}
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
