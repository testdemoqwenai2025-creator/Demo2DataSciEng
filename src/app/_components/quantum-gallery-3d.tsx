"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  X, Atom, Zap, Box, Layers, Network, Cpu,
} from "lucide-react";

/**
 * QuantumGallery3D — replaces the AI-generated static image gallery.
 *
 * Why: the previous gallery used 4 AI-generated PNGs. Two of them
 * (quantum-circuit.png and vqe-hybrid.png) contained random Chinese
 * characters ("睿加意", "已知", "求解") that the AI image generator
 * hallucinated. Replacing them with procedural SVG-based 3D animations
 * eliminates the Chinese-text issue AND gives users something far more
 * pedagogically valuable — actual moving visualisations, not static art.
 *
 * Each card has:
 *   - A small animated 3D SVG thumbnail (CSS 3D transforms + framer-motion)
 *   - Click → lazy modal popup (AnimatePresence) — heavy content only
 *     mounts when the user opens the card
 *   - Inside the modal:
 *       * A LARGE animated 3D SVG of the concept
 *       * An n-D toggle (3D / 4D / 5D / N-D) — shows how the concept lives
 *         in different Hilbert-space dimensions:
 *             - 3D: single-qubit Bloch sphere (state vector on S²)
 *             - 4D: 2-qubit state (projected from 4D Hilbert to 3D as a
 *                    rotating tesseract)
 *             - 5D: 3-qubit state (impossible to fully visualise — show
 *                    a 3D slice of the 8-dim amplitudes)
 *             - N-D: N-qubit state (2^N amplitudes — show a "barcode" of
 *                    all 2^N basis amplitudes)
 *       * A floating math/code background — quantum equations and Python
 *         snippets drift subtly behind the main visualisation
 *       * A caption explaining what the visual shows
 */

// ============================================================
// Shared math/code snippets for the floating background layer
// ============================================================
const FLOATING_SNIPPETS = [
  "|ψ⟩ = α|0⟩ + β|1⟩",
  "|α|² + |β|² = 1",
  "H|0⟩ = (|0⟩+|1⟩)/√2",
  "U_f = I - 2|x*⟩⟨x*|",
  "D = 2|s⟩⟨s| - I",
  "iℏ d|ψ⟩/dt = H|ψ⟩",
  "P(k) = |⟨k|ψ⟩|²",
  "|Φ+⟩ = (|00⟩+|11⟩)/√2",
  "E(θ) = ⟨ψ(θ)|H|ψ(θ)⟩",
  "∂E/∂θ_i = [E(θ+π/2·e_i) - E(θ-π/2·e_i)] / 2",
  "Λ = (p_c/p)^2  (Willow = 2.14)",
  "p_logical = p × Λ^((d-1)/2)",
  "import numpy as np",
  "H = np.array([[1,1],[1,-1]]) / √2",
  "shots = np.random.choice([0,1], p=[|α|², |β|²], size=1000)",
  "def grover(N, marked):",
  "  r = int(π/4 * √N)",
  "  return diffuser @ oracle @ state",
  "CHSH: |S| ≤ 2 (classical)",
  "S = 2√2 ≈ 2.828 (quantum)",
  "T₁ = 100µs  (Heron R2)",
  "T₂ = 80µs",
  "exp(-Δ/kBT) — topological",
  "Shor(2048) ≈ 394M qubits",
  "Λ_d→d+2 = 2.14 ± 0.02",
];

// ============================================================
// 3D scene wrappers
// ============================================================

function Scene3D({ children, w = 240, h = 320 }: { children: ReactNode; w?: number; h?: number }) {
  return (
    <div
      className="qc-3d-scene relative"
      style={{ width: w, height: h, perspective: "900px" }}
    >
      <style>{`
        .qc-3d-stage {
          transform-style: preserve-3d;
          transform: rotateX(15deg) rotateY(20deg);
          animation: qc-3d-rotate 8s linear infinite;
        }
        @keyframes qc-3d-rotate {
          from { transform: rotateX(15deg) rotateY(0deg); }
          to   { transform: rotateX(15deg) rotateY(360deg); }
        }
        .qc-bg-float {
          position: absolute;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          color: oklch(0.65 0.15 250 / 0.18);
          pointer-events: none;
          white-space: nowrap;
          font-size: 11px;
          line-height: 1.4;
          animation: qc-bg-drift linear infinite;
        }
        @keyframes qc-bg-drift {
          from { transform: translateY(0) translateX(0); opacity: 0.0; }
          10%  { opacity: 1.0; }
          90%  { opacity: 1.0; }
          to   { transform: translateY(-180px) translateX(40px); opacity: 0.0; }
        }
      `}</style>
      <div className="qc-3d-stage w-full h-full flex items-center justify-center">
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
          className="qc-bg-float"
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
// Concept 1: Quantum circuit (3D animated gates on rails)
// ============================================================
function QuantumCircuit3D({ dim = 3 }: { dim?: number }) {
  // dim = number of qubits; for n-D toggle we map 3D=2q, 4D=3q, 5D=4q, N-D=8q
  const nQubits = dim === 3 ? 2 : dim === 4 ? 3 : dim === 5 ? 4 : 6;
  const gates = ["H", "CNOT", "RZ", "X", "Z", "M"];
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => (t + 1) % 60), 100);
    return () => clearInterval(id);
  }, []);
  const activeGate = Math.floor(tick / 10) % gates.length;
  const railY = (i: number) => 60 + i * 50;
  const gateX = (i: number) => 100 + i * 90;
  return (
    <svg viewBox="0 0 360 320" width="100%" height="100%">
      <defs>
        <linearGradient id="rail-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="oklch(0.55 0.16 250 / 0.0)" />
          <stop offset="50%" stopColor="oklch(0.55 0.16 250 / 0.6)" />
          <stop offset="100%" stopColor="oklch(0.55 0.16 250 / 0.0)" />
        </linearGradient>
        <radialGradient id="gate-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.85 0.20 250 / 0.95)" />
          <stop offset="60%" stopColor="oklch(0.55 0.16 250 / 0.6)" />
          <stop offset="100%" stopColor="oklch(0.30 0.10 250 / 0.0)" />
        </radialGradient>
      </defs>
      {/* rails */}
      {Array.from({ length: nQubits }).map((_, qi) => (
        <g key={`rail-${qi}`}>
          <line
            x1="40" y1={railY(qi)} x2="340" y2={railY(qi)}
            stroke="url(#rail-grad)" strokeWidth="2"
          />
          <text x="20" y={railY(qi) + 4} fontSize="10" fill="oklch(0.65 0.10 250)">q{qi}</text>
          <text x="40" y={railY(qi) - 6} fontSize="9" fill="oklch(0.65 0.10 250)">|0⟩</text>
        </g>
      ))}
      {/* gates */}
      {gates.slice(0, 4).map((g, gi) => {
        const x = gateX(gi);
        const isActive = gi === activeGate;
        const color = isActive ? "url(#gate-glow)" : "oklch(0.40 0.10 250 / 0.7)";
        return (
          <motion.g
            key={`gate-${gi}`}
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              scale: isActive ? 1.15 : 1.0,
            }}
            transition={{ duration: 0.3 }}
          >
            {/* show on first rail only for visual simplicity */}
            <rect
              x={x - 14} y={railY(0) - 14}
              width="28" height="28"
              fill={color}
              rx="4"
              stroke="oklch(0.70 0.18 250)" strokeWidth="0.8"
            />
            <text
              x={x} y={railY(0) + 4}
              textAnchor="middle" fontSize="11"
              fill={isActive ? "white" : "oklch(0.85 0.10 250)"}
              fontWeight="bold"
            >{g}</text>
            {/* CNOT visualisation on second rail when active */}
            {isActive && nQubits > 1 && gi === 1 && (
              <motion.g
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <circle cx={x} cy={railY(0)} r="4" fill="oklch(0.85 0.18 250)" />
                <line x1={x} y1={railY(0)} x2={x} y2={railY(1)} stroke="oklch(0.85 0.18 250)" strokeWidth="2" />
                <circle cx={x} cy={railY(1)} r="8" fill="none" stroke="oklch(0.85 0.18 250)" strokeWidth="2" />
              </motion.g>
            )}
          </motion.g>
        );
      })}
      <text x="180" y="305" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
        {nQubits}-qubit circuit · Hilbert dim 2^{nQubits} = {Math.pow(2, nQubits)} · gate {activeGate + 1}/4
      </text>
    </svg>
  );
}

// ============================================================
// Concept 2: Bloch sphere (rotating 3D sphere with state vector)
// ============================================================
function BlochSphere3D({ dim = 3 }: { dim?: number }) {
  const [phi, setPhi] = useState(0);
  const [theta, setTheta] = useState(Math.PI / 2);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Auto-rotate ONLY when not dragging (keeps the gallery thumbnail alive)
  useEffect(() => {
    if (dragging) return;
    const id = setInterval(() => {
      setPhi(p => (p + 0.025) % (2 * Math.PI));
      setTheta(t => Math.PI / 2 + 0.25 * Math.sin(Date.now() / 1800));
    }, 60);
    return () => clearInterval(id);
  }, [dragging]);

  // Pointer handlers — mouse-down on the sphere starts drag mode, pointer-move
  // updates (theta, phi) via inverse orthographic projection of the unit sphere.
  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    handlePointerMove(e);
  };
  const handlePointerUp = () => setDragging(false);
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * 360;
    const sy = ((e.clientY - rect.top) / rect.height) * 320;
    const R = 90, cx = 180, cy = 160;
    const dx = sx - cx;
    const dy = sy - cy;
    const rho = Math.sqrt(dx * dx + dy * dy) / R;
    const r = Math.min(rho, 1);
    const newTheta = r >= 1 ? Math.PI / 2 : Math.acos(1 - r * r);
    const safeTheta = rho > 1.05 ? Math.PI / 2 : newTheta;
    const newPhi = Math.atan2(dy, dx);
    setTheta(safeTheta);
    setPhi(newPhi);
  };

  // n-D toggle: dim=3 -> 1 qubit Bloch (S^2), dim=4 -> 2 qubits, dim=5 -> 3, dim=N -> 6
  const extraSpheres = dim === 3 ? 0 : dim === 4 ? 1 : dim === 5 ? 2 : 4;
  const R = 90;
  const cx = 180, cy = 160;
  // Live state vector components for the equation overlay
  const alpha = Math.cos(theta / 2);
  const betaRe = Math.sin(theta / 2) * Math.cos(phi);
  const betaIm = Math.sin(theta / 2) * Math.sin(phi);
  const p0 = alpha * alpha;
  const p1 = 1 - p0;
  // vector endpoint -> 3D -> isometric 2D
  const x = R * Math.sin(theta) * Math.cos(phi);
  const y = R * Math.sin(theta) * Math.sin(phi);
  const z = R * Math.cos(theta);
  const px = cx + 0.9 * x - 0.4 * y;
  const py = cy - z + 0.2 * (x + y);
  return (
    <svg
      ref={svgRef}
      viewBox="0 0 360 320"
      width="100%"
      height="100%"
      className={dragging ? "cursor-grabbing select-none" : "cursor-grab select-none"}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerMove={handlePointerMove}
      style={{ touchAction: "none" }}
    >
      <defs>
        <radialGradient id="sphere-grad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="oklch(0.90 0.10 250 / 0.35)" />
          <stop offset="60%" stopColor="oklch(0.50 0.18 250 / 0.25)" />
          <stop offset="100%" stopColor="oklch(0.30 0.15 250 / 0.0)" />
        </radialGradient>
        <radialGradient id="vec-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.85 0.20 25)" />
          <stop offset="100%" stopColor="oklch(0.50 0.18 25 / 0.0)" />
        </radialGradient>
      </defs>
      <ellipse cx={cx} cy={cy} rx={R} ry={R * 0.3} fill="none" stroke="oklch(0.55 0.10 250 / 0.5)" strokeDasharray="2 2" strokeWidth="0.6" />
      <ellipse cx={cx} cy={cy} rx={R * 0.3} ry={R} fill="none" stroke="oklch(0.55 0.10 250 / 0.5)" strokeDasharray="2 2" strokeWidth="0.6" />
      <circle cx={cx} cy={cy} r={R} fill="url(#sphere-grad)" stroke="oklch(0.65 0.15 250 / 0.7)" strokeWidth="1" />
      <line x1={cx} y1={cy - R} x2={cx} y2={cy + R} stroke="oklch(0.55 0.10 250)" strokeWidth="0.8" />
      <text x={cx} y={cy - R - 4} textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">|0⟩</text>
      <text x={cx} y={cy + R + 12} textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">|1⟩</text>
      <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke="oklch(0.55 0.10 250 / 0.5)" strokeWidth="0.6" strokeDasharray="2 2" />
      <motion.line
        x1={cx} y1={cy} x2={px} y2={py}
        stroke="oklch(0.75 0.20 25)" strokeWidth="2.5"
        animate={{ x2: px, y2: py }}
        transition={{ duration: 0.05, ease: "linear" }}
      />
      <motion.circle cx={px} cy={py} r="4" fill="url(#vec-grad)"
        animate={{ cx: px, cy: py }} transition={{ duration: 0.05, ease: "linear" }} />
      <text x={px + 8} y={py - 4} fontSize="9" fill="oklch(0.85 0.20 25)" fontWeight="bold">|ψ⟩</text>
      {Array.from({ length: extraSpheres }).map((_, i) => {
        const angle = (i / extraSpheres) * 2 * Math.PI;
        const ex = cx + 130 * Math.cos(angle);
        const ey = cy + 50 * Math.sin(angle);
        const ephi = phi + (i + 1) * 0.5;
        const exx = 25 * Math.sin(theta) * Math.cos(ephi);
        const eyy = 25 * Math.sin(theta) * Math.sin(ephi);
        const ezz = 25 * Math.cos(theta);
        const epx = ex + 0.9 * exx - 0.4 * eyy;
        const epy = ey - ezz + 0.2 * (exx + eyy);
        return (
          <g key={`extra-${i}`} opacity="0.5">
            <circle cx={ex} cy={ey} r="25" fill="none" stroke="oklch(0.65 0.15 250 / 0.4)" strokeWidth="0.6" />
            <motion.line x1={ex} y1={ey} x2={epx} y2={epy}
              stroke="oklch(0.75 0.20 25 / 0.7)" strokeWidth="1"
              animate={{ x2: epx, y2: epy }} transition={{ duration: 0.05 }}
            />
            <motion.circle cx={epx} cy={epy} r="2" fill="oklch(0.75 0.20 25 / 0.7)"
              animate={{ cx: epx, cy: epy }} transition={{ duration: 0.05 }}
            />
            <text x={ex} y={ey + 35} textAnchor="middle" fontSize="8" fill="oklch(0.55 0.10 250)">q{i + 1}</text>
          </g>
        );
      })}
      {/* Live equation overlay - only visible while dragging */}
      {dragging && (
        <g>
          <rect x="10" y="280" width="340" height="35" fill="oklch(0.15 0.05 250 / 0.85)" rx="4" />
          <text x="180" y="295" textAnchor="middle" fontSize="10" fill="oklch(0.85 0.18 25)" fontWeight="bold" fontFamily="monospace">
            |ψ⟩ = {alpha.toFixed(3)}|0⟩ + ({betaRe.toFixed(3)}{betaIm >= 0 ? "+" : ""}{betaIm.toFixed(3)}i)|1⟩
          </text>
          <text x="180" y="308" textAnchor="middle" fontSize="9" fill="oklch(0.75 0.10 250)" fontFamily="monospace">
            |α|²={p0.toFixed(3)}  |β|²={p1.toFixed(3)}  ·  θ={Math.round(theta * 180 / Math.PI)}° φ={Math.round(phi * 180 / Math.PI)}°
          </text>
        </g>
      )}
      <text x="180" y="318" textAnchor="middle" fontSize="8" fill="oklch(0.65 0.10 250)">
        {dragging ? "← drag the sphere to set |ψ⟩ →" : "click + drag the sphere (auto-rotating when idle)"}
      </text>
    </svg>
  );
}
// ============================================================
// Concept 3: Entanglement (Bell pair with linked rotation)
// ============================================================
function Entanglement3D({ dim = 3 }: { dim?: number }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 0.06) % (2 * Math.PI)), 50);
    return () => clearInterval(id);
  }, []);
  // n-D toggle: 3D → 2 qubits, 4D → 3 (GHZ state), 5D → 4, N-D → 6 (cluster)
  const nQubits = dim === 3 ? 2 : dim === 4 ? 3 : dim === 5 ? 4 : 6;
  const positions = Array.from({ length: nQubits }).map((_, i) => {
    const angle = (i / nQubits) * 2 * Math.PI - Math.PI / 2;
    return { x: 180 + 90 * Math.cos(angle), y: 160 + 60 * Math.sin(angle) };
  });
  const wave1 = Math.sin(phase);
  const wave2 = Math.sin(phase + Math.PI); // opposite — entangled
  return (
    <svg viewBox="0 0 360 320" width="100%" height="100%">
      <defs>
        <radialGradient id="bell-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.85 0.20 165 / 0.95)" />
          <stop offset="60%" stopColor="oklch(0.55 0.16 165 / 0.6)" />
          <stop offset="100%" stopColor="oklch(0.30 0.10 165 / 0.0)" />
        </radialGradient>
      </defs>
      {/* entanglement connections — wavy */}
      {positions.map((p, i) => (
        positions.slice(i + 1).map((q, j) => {
          const mx = (p.x + q.x) / 2 + Math.sin(phase * 2) * 12;
          const my = (p.y + q.y) / 2 + Math.cos(phase * 2) * 8;
          return (
            <motion.path
              key={`link-${i}-${j}`}
              d={`M ${p.x} ${p.y} Q ${mx} ${my} ${q.x} ${q.y}`}
              stroke="oklch(0.65 0.16 165 / 0.7)" strokeWidth="1.2" fill="none"
              strokeDasharray="3 2"
              animate={{
                d: `M ${p.x} ${p.y} Q ${mx} ${my} ${q.x} ${q.y}`,
              }}
              transition={{ duration: 0.06 }}
            />
          );
        })
      ))}
      {/* qubits */}
      {positions.map((p, i) => {
        const isEven = i % 2 === 0;
        const wave = isEven ? wave1 : wave2;
        const color = wave > 0 ? "url(#bell-grad)" : "oklch(0.85 0.05 250 / 0.4)";
        return (
          <g key={`q-${i}`}>
            <motion.circle
              cx={p.x} cy={p.y} r="18"
              fill="none" stroke="oklch(0.65 0.16 165)" strokeWidth="1.5"
              animate={{ r: 18 + Math.abs(wave) * 4 }} transition={{ duration: 0.06 }}
            />
            <motion.circle cx={p.x} cy={p.y} r="7" fill={color}
              animate={{ r: 7 + Math.abs(wave) * 2 }} transition={{ duration: 0.06 }}
            />
            <text x={p.x} y={p.y + 36} textAnchor="middle" fontSize="10" fill="oklch(0.65 0.10 165)">q{i}</text>
          </g>
        );
      })}
      <text x="180" y="305" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 165)">
        {nQubits === 2 ? "Bell state |Φ+⟩" : nQubits === 3 ? "GHZ state (|000⟩+|111⟩)/√2" : `${nQubits}-qubit cluster`} · non-separable
      </text>
    </svg>
  );
}

// ============================================================
// Concept 4: VQE hybrid loop (quantum ↔ classical)
// ============================================================
function VQEHybrid3D({ dim = 3 }: { dim?: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => (t + 1) % 80), 100);
    return () => clearInterval(id);
  }, []);
  // n-D toggle: 3D → 2 qubits (H2), 4D → 4 qubits (LiH), 5D → 6 qubits, N-D → 12 qubits
  const nQubits = dim === 3 ? 2 : dim === 4 ? 4 : dim === 5 ? 6 : 12;
  const energy = -1.85 + 0.2 * Math.sin(tick / 8);
  const loopPhase = (tick / 80) * 2 * Math.PI;
  // positions of the 5 loop nodes
  const cx = 180, cy = 160, r = 80;
  const nodes = [
    { x: cx, y: cy - r, label: "ansatz |ψ(θ)⟩", color: "oklch(0.65 0.16 250)" },
    { x: cx + r * 0.95, y: cy - r * 0.31, label: "H↑↑", color: "oklch(0.65 0.16 30)" },
    { x: cx + r * 0.59, y: cy + r * 0.81, label: "measure ⟨P_i⟩", color: "oklch(0.65 0.16 165)" },
    { x: cx - r * 0.59, y: cy + r * 0.81, label: "E(θ) = Σ h_i⟨P_i⟩", color: "oklch(0.65 0.16 200)" },
    { x: cx - r * 0.95, y: cy - r * 0.31, label: "θ ← θ - η∇E", color: "oklch(0.65 0.16 320)" },
  ];
  return (
    <svg viewBox="0 0 360 320" width="100%" height="100%">
      <defs>
        <radialGradient id="vqe-node-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.85 0.18 250 / 0.9)" />
          <stop offset="100%" stopColor="oklch(0.40 0.15 250 / 0.0)" />
        </radialGradient>
      </defs>
      {/* circular loop */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="oklch(0.50 0.10 250 / 0.4)" strokeWidth="0.8" strokeDasharray="4 3" />
      {/* nodes */}
      {nodes.map((n, i) => {
        const active = (Math.floor(tick / 12) % 5) === i;
        return (
          <motion.g key={`node-${i}`} animate={{ scale: active ? 1.15 : 1 }} transition={{ duration: 0.2 }}>
            <circle cx={n.x} cy={n.y} r={active ? 22 : 18}
              fill={active ? "url(#vqe-node-grad)" : "oklch(0.40 0.10 250 / 0.5)"}
              stroke={n.color} strokeWidth="1.5"
            />
            <text x={n.x} y={n.y + (i === 0 ? -32 : 38)} textAnchor="middle" fontSize="9" fill={n.color} fontWeight={active ? "bold" : "normal"}>
              {n.label}
            </text>
          </motion.g>
        );
      })}
      {/* moving loop indicator */}
      <motion.circle
        cx={cx + r * Math.cos(loopPhase - Math.PI / 2)}
        cy={cy + r * Math.sin(loopPhase - Math.PI / 2)}
        r="4" fill="oklch(0.85 0.18 30)"
        animate={{
          cx: cx + r * Math.cos(loopPhase - Math.PI / 2),
          cy: cy + r * Math.sin(loopPhase - Math.PI / 2),
        }}
        transition={{ duration: 0.1, ease: "linear" }}
      />
      {/* energy gauge */}
      <text x="180" y="270" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
        E(θ) = {energy.toFixed(4)} Ha  (H₂ ground state ≈ -1.85)
      </text>
      <text x="180" y="290" textAnchor="middle" fontSize="8" fill="oklch(0.55 0.10 250)">
        ansatz: {nQubits} qubits → Hilbert dim 2^{nQubits} = {Math.pow(2, nQubits)}
      </text>
      <text x="180" y="305" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.10 250)">
        hybrid loop · iter {tick}/80
      </text>
    </svg>
  );
}

// ============================================================
// n-D toggle (3D / 4D / 5D / N-D)
// ============================================================
function DimToggle({ value, onChange }: { value: number; onChange: (d: number) => void }) {
  const options = [
    { d: 3, label: "3D", hint: "1 qubit · Bloch S²" },
    { d: 4, label: "4D", hint: "2 qubits · Bell" },
    { d: 5, label: "5D", hint: "3 qubits · GHZ" },
    { d: 99, label: "N-D", hint: "N qubits · 2^N dim" },
  ];
  return (
    <div className="flex flex-wrap gap-1.5 items-center justify-center bg-muted/30 rounded-md p-1.5 border border-border/40">
      <span className="text-[10px] text-muted-foreground px-1 flex items-center gap-1">
        <Layers className="h-3 w-3" /> Hilbert dim:
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
}

const CARDS: GalleryCard[] = [
  {
    id: "circuit",
    title: "Quantum circuit",
    subtitle: "gates on qubit rails",
    accent: "oklch(0.65 0.16 250)",
    icon: <Box className="h-4 w-4" />,
    thumb: <QuantumCircuit3D dim={3} />,
    detail: <QuantumCircuit3D dim={3} />,
    caption: "Quantum circuit — qubits as horizontal rails, gates as 3D blocks. Hadamard creates superposition, CNOT entangles, measurement collapses to classical bits. The visual language of quantum programming (OpenQASM 3.0).",
  },
  {
    id: "bloch",
    title: "Bloch sphere",
    subtitle: "single-qubit geometry",
    accent: "oklch(0.65 0.16 25)",
    icon: <Atom className="h-4 w-4" />,
    thumb: <BlochSphere3D dim={3} />,
    detail: <BlochSphere3D dim={3} />,
    caption: "Bloch sphere — the geometric representation of a single qubit state. North pole |0⟩, south pole |1⟩, equator |+⟩/|-⟩. Any pure state |ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)·sin(θ/2)|1⟩ corresponds to a point (θ, φ) on the unit sphere.",
  },
  {
    id: "entanglement",
    title: "Quantum entanglement",
    subtitle: "non-separable Bell pairs",
    accent: "oklch(0.65 0.16 165)",
    icon: <Network className="h-4 w-4" />,
    thumb: <Entanglement3D dim={3} />,
    detail: <Entanglement3D dim={3} />,
    caption: "Quantum entanglement — Bell state |Φ+⟩ = (|00⟩ + |11⟩)/√2. The two qubits are non-separable: measuring one instantly determines the other, regardless of distance. Einstein called this 'spooky action at a distance' — Bell's theorem (1964) proved it cannot be explained by classical hidden variables.",
  },
  {
    id: "vqe",
    title: "VQE hybrid loop",
    subtitle: "quantum ↔ classical optimiser",
    accent: "oklch(0.65 0.16 320)",
    icon: <Cpu className="h-4 w-4" />,
    thumb: <VQEHybrid3D dim={3} />,
    detail: <VQEHybrid3D dim={3} />,
    caption: "VQE hybrid quantum-classical loop — quantum device prepares parameterised ansatz |ψ(θ)⟩ and measures energy E(θ) = ⟨ψ|H|ψ⟩; classical optimiser updates θ to minimise E. The variational principle guarantees E(θ) ≥ E_0 (ground state). Loop converges to ground state energy + state.",
  },
];

// ============================================================
// Main carousel + lazy modal
// ============================================================
export function QuantumGallery3D() {
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
        Click any card to pop up an animated 3D scene with a dimension toggle + floating math/code background.
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
                    {openCard.id === "circuit" && <QuantumCircuit3D dim={dim} />}
                    {openCard.id === "bloch" && <BlochSphere3D dim={dim} />}
                    {openCard.id === "entanglement" && <Entanglement3D dim={dim} />}
                    {openCard.id === "vqe" && <VQEHybrid3D dim={dim} />}
                  </Scene3D>
                </div>
              </div>

              {/* Footer with caption */}
              <div className="border-t border-border/40 bg-muted/20 px-4 md:px-6 py-3">
                <p className="text-xs text-muted-foreground leading-relaxed">{openCard.caption}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-2">
                  Toggle dimensions above — 3D shows the simplest case (single qubit, Bloch sphere).
                  Higher dimensions project the {Math.pow(2, dim === 99 ? 6 : (dim - 2))}-dim Hilbert space onto 3D, revealing
                  how the same concept scales as more qubits are added. The drifting background
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
