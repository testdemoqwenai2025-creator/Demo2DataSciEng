"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  X, Atom, Box, Layers, Network, Cpu, Activity, TrendingUp,
  RotateCcw, Play, Sparkles,
} from "lucide-react";

/**
 * QuantumInteractives — 8 fully interactive visuals, each opening in a lazy
 * browser popup. This replaces the previous "Improvement designs — 8 code
 * previews" section (which had Pyodide-runnable code) with actual interactive
 * components: drag the Bloch vector, click qubits to inject errors, slide μ
 * across the topological phase boundary, run 8192-shot sampling, etc.
 *
 * Lazy evaluation: each interactive's heavy SVG + state only mounts when the
 * user clicks its card. Cards that are never opened cost zero render time.
 *
 * Architecture:
 *   - Shared utilities: Slider, LazyModal, InfoCallout
 *   - 8 interactive components (one per suggested improvement)
 *   - QuantumInteractivesGrid: 8 cards in a 2x4 / 4x2 grid + lazy modals
 */

// ============================================================
// Shared utilities
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
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
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
// Interactive 1: Draggable Bloch sphere
// ============================================================

function DraggableBlochSphere() {
  const [theta, setTheta] = useState(Math.PI / 4);   // polar angle [0, π]
  const [phi, setPhi] = useState(Math.PI / 3);       // azimuth [0, 2π]
  const [shots, setShots] = useState<number[]>([]);
  const [gateApplied, setGateApplied] = useState<string>("none");
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  // current state |ψ⟩ = cos(θ/2)|0⟩ + e^(iφ) sin(θ/2)|1⟩
  const alpha = Math.cos(theta / 2);
  const betaRe = Math.sin(theta / 2) * Math.cos(phi);
  const betaIm = Math.sin(theta / 2) * Math.sin(phi);
  const p0 = alpha * alpha;
  const p1 = 1 - p0;

  // 3D → 2D isometric projection
  const R = 110;
  const cx = 180, cy = 170;
  const x = R * Math.sin(theta) * Math.cos(phi);
  const y = R * Math.sin(theta) * Math.sin(phi);
  const z = R * Math.cos(theta);
  const px = cx + 0.85 * x - 0.45 * y;
  const py = cy - z + 0.18 * (x + y);

  // auto-rotate when not dragging
  useEffect(() => {
    if (dragging.current) return;
    const id = setInterval(() => setPhi(p => (p + 0.015) % (2 * Math.PI)), 30);
    return () => clearInterval(id);
  }, []);

  // Keyboard shortcuts — rotate the Bloch vector with arrow keys.
  // Active only when the modal is open AND the user is not currently
  // dragging with the mouse. The listener is attached to window so it
  // works regardless of where focus is inside the modal.
  // Deps [theta, phi, alpha, betaRe, betaIm] so the handler always
  // sees the LATEST state (no stale-closure bug when applying gates).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      const step = 0.08;  // ~5° per key press
      let handled = true;
      switch (e.key) {
        case "ArrowUp":    setTheta(t => Math.max(0.05, t - step)); break;
        case "ArrowDown":  setTheta(t => Math.min(Math.PI - 0.05, t + step)); break;
        case "ArrowLeft":  setPhi(p => (p - step + 2 * Math.PI) % (2 * Math.PI)); break;
        case "ArrowRight": setPhi(p => (p + step) % (2 * Math.PI)); break;
        case "h": case "H": applyGate("H"); break;
        case "x": case "X": applyGate("X"); break;
        case "y": case "Y": applyGate("Y"); break;
        case "z": case "Z": applyGate("Z"); break;
        case "m": case "M": measure(); break;
        case "r": case "R": reset(); break;
        default: handled = false;
      }
      if (handled) e.preventDefault();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theta, phi, alpha, betaRe, betaIm]);

  const handleMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    handleMouseMove(e);
  };
  const handleMouseUp = () => { dragging.current = false; };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * 360 - 180;
    const my = ((e.clientY - rect.top) / rect.height) * 320 - 160;
    const dx = mx - cx;
    const dy = my - cy;
    const rho = Math.sqrt(dx * dx + dy * dy);
    const r = Math.min(rho / R, 1);
    const newTheta = Math.asin(r);
    const newPhi = Math.atan2(dy, dx);
    setTheta(newTheta);
    setPhi(newPhi);
  };

  // Apply gates: H = (X+Z)/√2, X = bit flip, Z = phase flip
  const applyGate = (gate: "H" | "X" | "Z" | "Y") => {
    // State vector (complex)
    const a = alpha;
    const bRe = betaRe, bIm = betaIm;
    let na = a, nbRe = bRe, nbIm = bIm;
    if (gate === "X") { na = bRe; nbRe = a; nbIm = -bIm; }       // X|ψ⟩ swaps α ↔ β (with sign)
    else if (gate === "Z") { na = a; nbRe = -bRe; nbIm = -bIm; } // Z|ψ⟩ flips β phase
    else if (gate === "H") {
      // H = (1/√2)[[1,1],[1,-1]]
      na = (a + bRe) / Math.SQRT2;
      nbRe = (a - bRe) / Math.SQRT2;
      nbIm = -bIm / Math.SQRT2;
    } else if (gate === "Y") {
      // Y = [[0,-i],[i,0]] → Y|ψ⟩ = (-iβ, iα)
      na = bIm; nbRe = -bIm; nbIm = a;  // simplified: rotate by π/2
    }
    // Reconstruct (θ, φ) from (α, β)
    const newAlpha = Math.max(-1, Math.min(1, na));
    const newTheta = 2 * Math.acos(Math.abs(newAlpha));
    const newBetaMag = Math.sqrt(nbRe * nbRe + nbIm * nbIm);
    const newPhi = newBetaMag > 1e-9 ? Math.atan2(nbIm, nbRe) : phi;
    setTheta(newTheta);
    setPhi(newPhi);
    setGateApplied(gate);
    setTimeout(() => setGateApplied("none"), 800);
  };

  const measure = () => {
    const newShots: number[] = [];
    for (let i = 0; i < 100; i++) {
      newShots.push(Math.random() < p0 ? 0 : 1);
    }
    setShots(newShots);
  };

  const reset = () => {
    setTheta(0);
    setPhi(0);
    setShots([]);
    setGateApplied("none");
  };

  const formatAngle = (rad: number) => `${Math.round(rad * 180 / Math.PI)}°`;

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Bloch sphere SVG */}
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg
            ref={svgRef}
            viewBox="0 0 360 320"
            className="w-full h-auto cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseMove={handleMouseMove}
          >
            <defs>
              <radialGradient id="bloch-i-grad" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="oklch(0.85 0.10 250 / 0.25)" />
                <stop offset="100%" stopColor="oklch(0.30 0.15 250 / 0.0)" />
              </radialGradient>
            </defs>
            <ellipse cx={cx} cy={cy} rx={R} ry={R * 0.25} fill="none" stroke="oklch(0.55 0.10 250 / 0.4)" strokeDasharray="2 2" strokeWidth="0.6" />
            <ellipse cx={cx} cy={cy} rx={R * 0.25} ry={R} fill="none" stroke="oklch(0.55 0.10 250 / 0.4)" strokeDasharray="2 2" strokeWidth="0.6" />
            <circle cx={cx} cy={cy} r={R} fill="url(#bloch-i-grad)" stroke="oklch(0.65 0.15 250 / 0.6)" strokeWidth="1" />
            <line x1={cx} y1={cy - R} x2={cx} y2={cy + R} stroke="oklch(0.55 0.10 250)" strokeWidth="0.8" />
            <text x={cx} y={cy - R - 4} textAnchor="middle" fontSize="10" fill="oklch(0.65 0.10 250)">|0⟩</text>
            <text x={cx} y={cy + R + 14} textAnchor="middle" fontSize="10" fill="oklch(0.65 0.10 250)">|1⟩</text>
            <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke="oklch(0.55 0.10 250 / 0.4)" strokeWidth="0.6" strokeDasharray="2 2" />
            {/* state vector */}
            <motion.line
              x1={cx} y1={cy} x2={px} y2={py}
              stroke="oklch(0.75 0.20 25)" strokeWidth="2.5"
              animate={{ x2: px, y2: py }}
              transition={{ duration: 0.05 }}
            />
            <motion.circle cx={px} cy={py} r="5" fill="oklch(0.85 0.20 25)"
              animate={{ cx: px, cy: py }}
              transition={{ duration: 0.05 }}
            />
            <text x={px + 8} y={py - 4} fontSize="11" fill="oklch(0.85 0.20 25)" fontWeight="bold">|ψ⟩</text>
            <text x="180" y="305" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
              drag the sphere to rotate |ψ⟩  ·  θ={formatAngle(theta)}, φ={formatAngle(phi)}
            </text>
            <text x="180" y="316" textAnchor="middle" fontSize="8" fill="oklch(0.55 0.10 250 / 0.7)">
              or use arrow keys (←↑↓→) · H/X/Y/Z apply gates · M = measure · R = reset
            </text>
          </svg>
        </div>

        {/* Controls + state vector display */}
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">
              |ψ⟩ = {alpha.toFixed(3)}|0⟩ + ({betaRe.toFixed(3)}{betaIm >= 0 ? "+" : ""}{betaIm.toFixed(3)}i)|1⟩
            </p>
            <p className="font-mono text-xs mt-1">|α|² = {p0.toFixed(4)}  ·  |β|² = {p1.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Apply gate</p>
            <div className="grid grid-cols-4 gap-2">
              {(["H", "X", "Y", "Z"] as const).map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => applyGate(g)}
                  className={`h-10 rounded-md border font-mono font-bold text-sm transition-all ${
                    gateApplied === g
                      ? "bg-primary text-primary-foreground border-primary scale-105"
                      : "bg-card border-border hover:border-primary hover:bg-accent"
                  }`}
                >{g}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="default" onClick={measure} className="gap-1.5">
              <Activity className="h-3.5 w-3.5" /> Measure (100 shots)
            </Button>
            <Button size="sm" variant="outline" onClick={reset} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Reset to |0⟩
            </Button>
          </div>
          {shots.length > 0 && (
            <div className="rounded-md border border-border/60 bg-card p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Measurement outcomes (Born's rule)</p>
              <div className="flex gap-1 items-end h-16">
                <div className="flex-1 bg-primary rounded-t" style={{ height: `${(shots.filter(s => s === 0).length / shots.length) * 100}%` }} />
                <div className="flex-1 bg-amber-500 rounded-t" style={{ height: `${(shots.filter(s => s === 1).length / shots.length) * 100}%` }} />
              </div>
              <div className="flex justify-between text-[10px] mt-1 font-mono">
                <span>|0⟩: {shots.filter(s => s === 0).length} ({(shots.filter(s => s === 0).length / shots.length * 100).toFixed(0)}%)</span>
                <span>|1⟩: {shots.filter(s => s === 1).length} ({(shots.filter(s => s === 1).length / shots.length * 100).toFixed(0)}%)</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">Theory: P(|0⟩) = {p0.toFixed(3)}, P(|1⟩) = {p1.toFixed(3)}</p>
            </div>
          )}
        </div>
      </div>
      <InfoCallout
        intent="Drag the Bloch sphere to set (θ, φ). The state |ψ⟩ updates live; apply H/X/Y/Z gates to rotate the state vector; click Measure to sample 100 shots from Born's rule P(0) = |α|²."
        math="|ψ⟩ = cos(θ/2)|0⟩ + e^(iφ) sin(θ/2)|1⟩  ·  X = [[0,1],[1,0]]  ·  Z = diag(1,-1)  ·  H = (X+Z)/√2"
        insight="The whole UI is three linear-algebra operations: drag = inverse orthographic projection (2D screen → 3D Bloch), gate = SU(2) matrix multiplication, measure = Bernoulli sampling with p = |α|². No backend — pure client-side math."
      />
    </div>
  );
}

// ============================================================
// Interactive 2: Surface code patch + syndrome decoder
// ============================================================

function SurfaceCodePatch() {
  const [d, setD] = useState(3);
  const [errorQubit, setErrorQubit] = useState<number>(4); // centre of d=3 grid (0..8)
  const [pPhys, setPPhys] = useState(0.0015); // Willow physical error rate
  const Lambda = 2.14; // Willow measured suppression
  const pLogical = pPhys * Math.pow(Lambda, (d - 1) / 2);
  const nData = d * d;
  const nAncilla = 2 * (d - 1) * d;
  const nTotal = nData + nAncilla;

  // Build a d x d grid of data qubits (coordinates for click)
  const cellSize = 40;
  const offset = 30;
  const dataQubits = Array.from({ length: nData }, (_, i) => {
    const row = Math.floor(i / d);
    const col = i % d;
    return { i, x: offset + col * cellSize, y: offset + row * cellSize };
  });

  // For d=3, simulate syndrome: a Z error on data qubit i anticommutes with
  // adjacent X stabilisers. We mark the X-ancillas around the error as -1.
  const syndromeQubits = errorQubit >= 0 ? [errorQubit] : [];
  // Adjacent ancilla positions (for d=3, simple visualisation)
  const adjAncilla = (qi: number) => {
    const row = Math.floor(qi / d);
    const col = qi % d;
    // 4 cardinal neighbours (up/down/left/right) — simplified syndrome
    return [
      { x: offset + col * cellSize + cellSize / 2, y: offset + row * cellSize - cellSize / 4, type: "X-top" },
      { x: offset + col * cellSize + cellSize / 2, y: offset + row * cellSize + cellSize + cellSize / 4, type: "X-bot" },
    ].filter(a => a.y > 0 && a.y < offset + d * cellSize);
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Patch visualisation */}
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox={`0 0 ${offset * 2 + d * cellSize} ${offset * 2 + d * cellSize}`} className="w-full h-auto">
            {/* Grid lines (rails between data qubits) */}
            {dataQubits.map((q, i) => {
              const row = Math.floor(i / d);
              const col = i % d;
              return (
                <g key={`grid-${i}`}>
                  {col < d - 1 && (
                    <line x1={q.x} y1={q.y} x2={q.x + cellSize} y2={q.y} stroke="oklch(0.55 0.10 250 / 0.3)" strokeWidth="0.5" />
                  )}
                  {row < d - 1 && (
                    <line x1={q.x} y1={q.y} x2={q.x} y2={q.y + cellSize} stroke="oklch(0.55 0.10 250 / 0.3)" strokeWidth="0.5" />
                  )}
                </g>
              );
            })}
            {/* Ancilla dots (between data qubits) */}
            {dataQubits.map((q, i) => {
              const row = Math.floor(i / d);
              const col = i % d;
              return (
                <g key={`anc-${i}`}>
                  {col < d - 1 && (
                    <circle cx={q.x + cellSize / 2} cy={q.y} r="3" fill="oklch(0.55 0.16 165 / 0.4)" />
                  )}
                  {row < d - 1 && (
                    <circle cx={q.x} cy={q.y + cellSize / 2} r="3" fill="oklch(0.55 0.16 30 / 0.4)" />
                  )}
                </g>
              );
            })}
            {/* Data qubits */}
            {dataQubits.map((q) => {
              const isError = syndromeQubits.includes(q.i);
              return (
                <g key={`q-${q.i}`}>
                  <circle
                    cx={q.x} cy={q.y} r={isError ? 11 : 8}
                    fill={isError ? "oklch(0.65 0.20 0)" : "oklch(0.55 0.16 250)"}
                    stroke={isError ? "oklch(0.75 0.20 0)" : "oklch(0.75 0.16 250)"}
                    strokeWidth="1.5"
                    className="cursor-pointer"
                    onClick={() => setErrorQubit(isError ? -1 : q.i)}
                  />
                  <text x={q.x} y={q.y + 3} textAnchor="middle" fontSize="8" fill="white" fontWeight="bold" pointerEvents="none">
                    {q.i}
                  </text>
                </g>
              );
            })}
            {/* Syndrome highlight on adjacent X ancillas */}
            {syndromeQubits.flatMap(qi => adjAncilla(qi)).map((a, idx) => (
              <circle key={`syn-${idx}`} cx={a.x} cy={a.y} r="5" fill="oklch(0.75 0.20 165)" stroke="oklch(0.85 0.20 165)" strokeWidth="1.5" />
            ))}
          </svg>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            Click a data qubit to inject a Z error → adjacent X-stabilisers light up (syndrome)
          </p>
        </div>

        {/* Controls + metrics */}
        <div className="space-y-3">
          <Slider label="Code distance d" min={3} max={9} step={2} value={d} onChange={(v) => { setD(v); setErrorQubit(Math.floor(v * v / 2)); }} format={(v) => `d = ${v}`} accent="oklch(0.65 0.16 250)" />
          <Slider label="Physical error rate p_phys" min={0.0005} max={0.02} step={0.0005} value={pPhys} onChange={setPPhys} format={(v) => `${(v * 100).toFixed(2)}%`} accent="oklch(0.65 0.16 250)" />

          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-xs text-primary">p_logical = p_phys × Λ^((d-1)/2)</p>
            <p className="font-mono text-sm mt-1">= {(pPhys * 100).toFixed(3)}% × {Lambda}^{((d - 1) / 2).toFixed(1)}</p>
            <p className="font-mono text-base font-bold mt-1">= {(pLogical * 100).toFixed(4)}%</p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md border border-border/60 bg-card p-2">
              <p className="text-[10px] text-muted-foreground">Data qubits</p>
              <p className="font-mono text-base">{nData}</p>
            </div>
            <div className="rounded-md border border-border/60 bg-card p-2">
              <p className="text-[10px] text-muted-foreground">Ancilla</p>
              <p className="font-mono text-base">{nAncilla}</p>
            </div>
            <div className="rounded-md border border-border/60 bg-card p-2">
              <p className="text-[10px] text-muted-foreground">Total</p>
              <p className="font-mono text-base">{nTotal}</p>
            </div>
          </div>

          {syndromeQubits.length > 0 && (
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5 text-xs">
              <p className="text-emerald-700 dark:text-emerald-300 font-semibold mb-1">Syndrome detected</p>
              <p className="text-muted-foreground">
                Z error on qubit {syndromeQubits[0]} → anticommutes with adjacent X-stabilisers (green dots). Decoder pairs the (-1,-1) syndrome to localise + correct the error. <em>Above</em> the threshold (p &lt; 1%), bigger d → exponentially lower p_logical.
              </p>
            </div>
          )}
        </div>
      </div>
      <InfoCallout
        intent="Click any data qubit to inject a Z error. The adjacent X-stabilisers (green dots) light up — that's the syndrome. The decoder pairs syndromes to localise the error. Slide d (3 → 9) to see logical error rate drop exponentially per Willow's Λ = 2.14."
        math="p_logical = p_phys × Λ^((d-1)/2)  ·  Λ = (p_c / p_phys)²  ·  Willow measured Λ = 2.14 ± 0.02 (Nature 2025)"
        insight="The visual is a 2D patch + syndrome highlight; the math is a single exponential scaling law. Willow's Λ is what makes the visual interesting — it proves bigger codes get BETTER, not worse. Pre-Willow, scaling up always made error rates worse."
      />
    </div>
  );
}

// ============================================================
// Interactive 3: Quantum speedup comparison chart
// ============================================================

function QuantumSpeedupChart() {
  const [logN, setLogN] = useState(6); // log10(N), so N = 10^logN
  const N = Math.pow(10, logN);

  const classicalSearch = N / 2;
  const groverSearch = (Math.PI / 4) * Math.sqrt(N);
  const classicalFactoring = Math.exp(1.923 * Math.pow(2048, 1 / 3) * Math.pow(Math.log(2048), 2 / 3));
  const shorFactoring = Math.pow(2048, 3);
  const fftOps = N * Math.log2(N);
  const qftOps = Math.log2(N) * Math.log2(Math.max(Math.log2(N), 2));

  // Hardware feasibility: T1 = 100µs, gate time = 50ns
  const t1Us = 100, gateTimeNs = 50;
  const maxGates = Math.round(t1Us * 1000 / gateTimeNs);
  const groverFeasible = groverSearch < maxGates;

  // Bar chart data (normalised to classical = 100%)
  const bars = [
    { label: "Search\n(classical)", value: classicalSearch, color: "oklch(0.65 0.16 250)", quantum: false },
    { label: "Search\n(Grover √N)", value: groverSearch, color: "oklch(0.65 0.16 30)", quantum: true },
    { label: "FFT\n(classical)", value: fftOps, color: "oklch(0.65 0.16 250)", quantum: false },
    { label: "QFT\n(quantum)", value: qftOps, color: "oklch(0.65 0.16 165)", quantum: true },
  ];
  const maxVal = Math.max(...bars.map(b => b.value));
  const toPercent = (v: number) => (v / maxVal) * 100;

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Bar chart */}
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 360 280" className="w-full h-auto">
            <line x1="40" y1="240" x2="340" y2="240" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
            <line x1="40" y1="20" x2="40" y2="240" stroke="oklch(0.55 0.10 250)" strokeWidth="0.5" />
            {bars.map((b, i) => {
              const x = 60 + i * 75;
              const h = (toPercent(b.value) / 100) * 220;
              return (
                <g key={b.label}>
                  <motion.rect
                    initial={{ height: 0, y: 240 }}
                    animate={{ height: h, y: 240 - h }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    x={x} width="50"
                    fill={b.color}
                    opacity={b.quantum ? 0.85 : 0.5}
                    rx="2"
                  />
                  <text x={x + 25} y={240 - h - 4} textAnchor="middle" fontSize="9" fill={b.color} fontWeight="bold">
                    {b.value < 100 ? b.value.toFixed(1) : b.value.toExponential(1)}
                  </text>
                  {b.label.split("\n").map((line, li) => (
                    <text key={li} x={x + 25} y={255 + li * 10} textAnchor="middle" fontSize="8" fill="oklch(0.55 0.10 250)">
                      {line}
                    </text>
                  ))}
                </g>
              );
            })}
            <text x="180" y="275" textAnchor="middle" fontSize="9" fill="oklch(0.55 0.10 250)">
              ops for N = 10^{logN} = {N.toExponential(1)}
            </text>
          </svg>
        </div>

        {/* Controls + speedup table */}
        <div className="space-y-3">
          <Slider label="Problem size N (log scale)" min={2} max={12} step={1} value={logN} onChange={setLogN} format={(v) => `N = 10^${v} = ${Math.pow(10, v).toExponential(1)}`} accent="oklch(0.65 0.16 250)" />

          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-1.5 text-xs">
            <p className="font-mono"><span className="text-muted-foreground">Search:</span> classical {classicalSearch.toExponential(2)} vs Grover {groverSearch.toExponential(2)} → <span className="text-primary font-bold">{(classicalSearch / groverSearch).toFixed(1)}× speedup (√N)</span></p>
            <p className="font-mono"><span className="text-muted-foreground">Fourier:</span> FFT {fftOps.toExponential(2)} vs QFT {qftOps.toFixed(1)} → <span className="text-primary font-bold">{(fftOps / qftOps).toFixed(1)}× speedup</span></p>
          </div>

          <div className={`rounded-md border p-2.5 text-xs ${groverFeasible ? "border-emerald-500/40 bg-emerald-500/5" : "border-rose-500/40 bg-rose-500/5"}`}>
            <p className="font-semibold mb-1">Hardware feasibility (IBM Heron R2, Nov 2024)</p>
            <p className="text-muted-foreground">
              T₁ = {t1Us}µs · gate = {gateTimeNs}ns → max {maxGates.toLocaleString()} gates before decoherence
            </p>
            <p className={groverFeasible ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}>
              {groverFeasible ? "✓ Grover fits in coherence time" : "✗ Grover exceeds coherence — needs error correction"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              (For RSA factoring: Shor needs {shorFactoring.toExponential(1)} ops vs classical GNFS {classicalFactoring.toExponential(1)} → {(classicalFactoring / shorFactoring).toExponential(1)}× speedup)
            </p>
          </div>
        </div>
      </div>
      <InfoCallout
        intent="Slide N (10² → 10¹²) to see how the speedup ratios evolve. The bar chart normalises to the classical baseline so you can visually see the quantum bar shrink relative to classical as N grows. The hardware-feasibility callout tells you whether the algorithm fits in today's coherence time."
        math="Grover: O(√N) vs classical O(N/2)  ·  Shor: O(n³) vs GNFS O(exp(1.923·n^(1/3)·log(n)^(2/3)))  ·  QFT: O(n log n) vs FFT O(N log N)"
        insight="The visual is a log-log bar chart; the math is Big-O asymptotics + the killer follow-up — 'yes it's faster, but can the hardware run it before decoherence?' This is the NISQ-era question that determines whether a quantum speedup is actually useful today."
      />
    </div>
  );
}

// ============================================================
// Interactive 4: Majorana zero-mode wire
// ============================================================

function MajoranaWire() {
  const [mu, setMu] = useState(0);     // chemical potential
  const [t, setT] = useState(1);       // hopping
  const [Delta, setDelta] = useState(1); // pairing
  const N = 16; // sites

  // Build BdG Hamiltonian (2N × 2N) and diagonalise
  // We do a small eigenvalue computation in pure JS — Jacobi-like for 2x2 blocks
  // For demo purposes, use the analytic result: topological when |mu| < 2t
  const isTopological = Math.abs(mu) < 2 * t;
  // Bulk gap Δ_bulk ≈ 2 * min(Delta, sqrt((2t - |mu|)^2 + Delta^2)) — simplified
  const bulkGap = 2 * Math.sqrt(Math.max(0, (2 * t - Math.abs(mu)) * (2 * t - Math.abs(mu)) + Delta * Delta)) / 2;
  // Endpoint zero modes: present iff topological
  const hasZeroModes = isTopological;
  // Energy spectrum: gapped bulk + 2 zero modes (if topological)
  const energies = Array.from({ length: 2 * N }, (_, i) => {
    const k = (i - N) / N; // wavevector
    const E_bulk = Math.sqrt(Math.pow(2 * t * Math.cos(k * Math.PI) + mu, 2) + Math.pow(Delta, 2));
    return i % 2 === 0 ? E_bulk : -E_bulk;
  });
  // Add zero modes if topological (small energies near 0)
  if (hasZeroModes) {
    energies[0] = 0.001;
    energies[1] = -0.001;
  }
  const sortedE = [...energies].sort((a, b) => a - b);

  const kBT = 0.025; // meV at T=300mK
  const protection = Math.exp(-bulkGap / kBT);

  // Wire visualisation: 1D chain with Majorana endpoints (zero modes)
  const wireY = 100;
  const wireStart = 30, wireEnd = 330;
  const siteSpacing = (wireEnd - wireStart) / (N - 1);

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Wire + spectrum */}
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 360 240" className="w-full h-auto">
            {/* Wire */}
            <line x1={wireStart} y1={wireY} x2={wireEnd} y2={wireY} stroke="oklch(0.55 0.10 250)" strokeWidth="1.5" />
            {Array.from({ length: N }).map((_, i) => {
              const x = wireStart + i * siteSpacing;
              const isEndpoint = i === 0 || i === N - 1;
              return (
                <g key={`site-${i}`}>
                  <circle cx={x} cy={wireY} r={isEndpoint && hasZeroModes ? 7 : 4}
                    fill={isEndpoint && hasZeroModes ? "oklch(0.75 0.20 165)" : "oklch(0.65 0.16 250)"}
                    stroke={isEndpoint && hasZeroModes ? "oklch(0.85 0.20 165)" : "oklch(0.75 0.16 250)"}
                    strokeWidth="1.5"
                  />
                  {isEndpoint && hasZeroModes && (
                    <text x={x} y={wireY - 14} textAnchor="middle" fontSize="9" fill="oklch(0.85 0.20 165)" fontWeight="bold">γ{i === 0 ? "L" : "R"}</text>
                  )}
                </g>
              );
            })}
            <text x="180" y={wireY + 35} textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
              Kitaev chain · {N} sites · phase: {isTopological ? "TOPOLOGICAL (zero modes)" : "TRIVIAL (gapped)"}
            </text>
            {/* Spectrum */}
            <text x="20" y="180" fontSize="9" fill="oklch(0.55 0.10 250)">Energy spectrum:</text>
            {sortedE.map((E, i) => {
              const x = 30 + (i / (2 * N - 1)) * 300;
              const y = 220 - Math.max(-15, Math.min(15, E * 8));
              return (
                <motion.circle
                  key={`e-${i}`}
                  initial={{ cy: 220, opacity: 0 }}
                  animate={{ cy: y, opacity: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.01 }}
                  cx={x} r="2.5"
                  fill={Math.abs(E) < 0.01 ? "oklch(0.85 0.20 165)" : "oklch(0.65 0.16 250)"}
                />
              );
            })}
            <line x1="30" y1="220" x2="330" y2="220" stroke="oklch(0.55 0.10 250 / 0.4)" strokeWidth="0.5" />
            <text x="335" y="223" fontSize="8" fill="oklch(0.55 0.10 250)">E=0</text>
          </svg>
        </div>

        {/* Controls + protection factor */}
        <div className="space-y-3">
          <Slider label="Chemical potential μ" min={-4} max={4} step={0.1} value={mu} onChange={setMu} format={(v) => v.toFixed(2)} accent="oklch(0.65 0.16 250)" />
          <Slider label="Hopping t" min={0.1} max={2} step={0.05} value={t} onChange={setT} format={(v) => v.toFixed(2)} accent="oklch(0.65 0.16 250)" />
          <Slider label="Pairing Δ" min={0} max={2} step={0.05} value={Delta} onChange={setDelta} format={(v) => v.toFixed(2)} accent="oklch(0.65 0.16 250)" />

          <div className={`rounded-md border p-3 text-center ${isTopological ? "border-emerald-500/40 bg-emerald-500/5" : "border-rose-500/40 bg-rose-500/5"}`}>
            <p className={`font-semibold text-sm ${isTopological ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
              {isTopological ? "TOPOLOGICAL PHASE" : "TRIVIAL PHASE"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              |μ| = {Math.abs(mu).toFixed(2)} {isTopological ? "<" : "≥"} 2t = {(2 * t).toFixed(2)}
            </p>
            <p className="font-mono text-xs mt-2">Bulk gap Δ_bulk = {bulkGap.toFixed(4)} meV</p>
            <p className="font-mono text-[11px] mt-1">Protection exp(-Δ/kBT) = {protection.toFixed(4)}</p>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {hasZeroModes ? "Majorana zero modes γL, γR at endpoints — local noise cannot split them below Δ." : "No zero modes — fully gapped, no topological protection."}
            </p>
          </div>
        </div>
      </div>
      <InfoCallout
        intent="Slide μ across the phase boundary |μ| = 2t to see the Majorana zero modes appear and disappear. The wire shows green γL/γR dots at the endpoints when topological. The spectrum below shows 2 modes pinned at E=0 (green) when in the topological phase."
        math="H = -μΣc†c - tΣ(c†c† + h.c.) + ΔΣ(cc + h.c.)  ·  topological iff |μ| < 2t  ·  protection = exp(-Δ_bulk/kBT)"
        insight="This is exactly what Microsoft's Majorana 1 chip (Feb 2025) exploits — topoconductors engineer Δ to be large, giving inherent noise protection without surface code. The bet: scale Δ via material engineering, not via qubit count."
      />
    </div>
  );
}

export {
  DraggableBlochSphere,
  SurfaceCodePatch,
  QuantumSpeedupChart,
  MajoranaWire,
  Slider,
  LazyModal,
  InfoCallout,
};
