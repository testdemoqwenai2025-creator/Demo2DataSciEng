#!/usr/bin/env python3
"""
Patch BlochSphere3D in quantum-gallery-3d.tsx to be actually draggable.

Replaces:
1. The imports line to add useRef
2. The whole BlochSphere3D function body with a draggable version
"""
import re

FILE = "/home/z/my-project/src/app/_components/quantum-gallery-3d.tsx"

with open(FILE) as f:
    src = f.read()

# 1. Add useRef to imports
src = src.replace(
    "import { useState, useEffect, useCallback, type ReactNode } from \"react\";",
    "import { useState, useEffect, useCallback, useRef, type ReactNode } from \"react\";",
)
assert "useRef" in src, "useRef import not added"

# 2. Find and replace the entire BlochSphere3D function
# Match from "function BlochSphere3D(" to its closing "}"
# Use a brace-counting regex
pattern = re.compile(
    r'(// Concept 2: Bloch sphere.*?)(function BlochSphere3D\(\{ dim = 3 \}: \{ dim\?: number \}\) \{)(.*?)(\n\}\n)',
    re.DOTALL,
)
m = pattern.search(src)
assert m, "Couldn't find BlochSphere3D function"

new_bloch = '''function BlochSphere3D({ dim = 3 }: { dim?: number }) {
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
}'''

# Replace the function body
new_src = src[:m.start(2)] + new_bloch + src[m.end(4):]

with open(FILE, "w") as f:
    f.write(new_src)

print(f"File patched: {len(src.splitlines())} -> {len(new_src.splitlines())} lines")
print(f"useRef import present: {'useRef' in new_src}")
print(f"Draggable handlers present: {'onPointerDown' in new_src}")
print(f"Live equation overlay present: {'dragging &&' in new_src}")
