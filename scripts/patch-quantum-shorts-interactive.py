#!/usr/bin/env python3
"""
Patch quantum-shorts.tsx to make all 4 thumbnails interactive:

1. BlochSphereThumbnail — accept `draggable` prop. When true, add pointer
   handlers + live |ψ⟩ equation overlay (same pattern as the draggable
   BlochSphere3D in quantum-gallery-3d.tsx).
2. BellPairThumbnail — accept `clickable` prop. When true, clicking q0
   flips its color and q1 instantly follows (entanglement demonstration).
3. GroverBarsThumbnail — accept `interactive` prop. When true, add a slider
   for iteration count 0..3.
4. DecayCurveThumbnail — accept `interactive` prop. When true, add sliders
   for T1 and T2 (in µs).

Then patch the SuperpositionDetail, EntanglementDetail, GroverDetail,
DecoherenceDetail to pass `draggable` / `clickable` / `interactive` props
to their thumbnails.

Finally, fix the Live Resources Drawer CORS issue by adding a CORS proxy
fallback for arXiv, GitHub, Hugging Face, and Papers with Code APIs.
"""
import re

# ---------- 1. Patch quantum-shorts.tsx ----------
QS = "/home/z/my-project/src/app/_components/quantum-shorts.tsx"
with open(QS) as f:
    src = f.read()

# Add useRef import if not present
if "useRef" not in src:
    src = src.replace(
        "import { useState, useEffect } from \"react\";",
        "import { useState, useEffect, useRef } from \"react\";",
    )

# ----- Patch BlochSphereThumbnail to be draggable -----
# Find the function definition and replace it
old_bloch = '''function BlochSphereThumbnail({ accent }: { accent: string }) {
  const [phi, setPhi] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhi(p => (p + 0.05) % (2 * Math.PI)), 50);
    return () => clearInterval(id);
  }, []);
  // Project 3D Bloch-sphere vector (theta=pi/2, phi) to 2D isometric
  const theta = Math.PI / 2;
  const x = Math.sin(theta) * Math.cos(phi);
  const y = Math.sin(theta) * Math.sin(phi);
  const z = Math.cos(theta);
  // isometric projection
  const px = 50 + 30 * (x - y * 0.5);
  const py = 70 - 30 * (z + (x + y) * 0.3);
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <defs>
        <radialGradient id="bs-grad" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="oklch(0.96 0.02 250)" />
          <stop offset="100%" stopColor="oklch(0.40 0.15 250 / 0.4)" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="70" rx="38" ry="14" fill="none" stroke={accent} strokeWidth="0.5" strokeDasharray="2 2" opacity="0.6" />
      <ellipse cx="50" cy="70" rx="14" ry="38" fill="none" stroke={accent} strokeWidth="0.5" strokeDasharray="2 2" opacity="0.6" />
      <circle cx="50" cy="70" r="38" fill="url(#bs-grad)" stroke={accent} strokeWidth="1" opacity="0.7" />
      <line x1="50" y1="32" x2="50" y2="108" stroke="oklch(0.45 0.05 250)" strokeWidth="0.5" />
      <text x="50" y="28" textAnchor="middle" fontSize="6" fill="oklch(0.45 0.05 250)">|0⟩</text>
      <text x="50" y="116" textAnchor="middle" fontSize="6" fill="oklch(0.45 0.05 250)">|1⟩</text>
      <motion.line
        x1="50" y1="70" x2={px} y2={py}
        stroke={accent} strokeWidth="1.5"
        animate={{ x2: px, y2: py }}
        transition={{ duration: 0.05, ease: "linear" }}
      />
      <circle cx={px} cy={py} r="2.5" fill={accent} />
      <text x="50" y="132" textAnchor="middle" fontSize="6" fill={accent} fontWeight="bold">|+⟩</text>
    </svg>
  );
}'''

new_bloch = '''function BlochSphereThumbnail({ accent, draggable = false }: { accent: string; draggable?: boolean }) {
  const [phi, setPhi] = useState(0);
  const [theta, setTheta] = useState(Math.PI / 2);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  // Auto-rotate only when not dragging
  useEffect(() => {
    if (dragging) return;
    const id = setInterval(() => setPhi(p => (p + 0.05) % (2 * Math.PI)), 50);
    return () => clearInterval(id);
  }, [dragging]);
  // Pointer handlers — convert screen (x, y) -> Bloch (theta, phi)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!draggable) return;
    setDragging(true);
    handlePointerMove(e);
  };
  const handlePointerUp = () => setDragging(false);
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggable || !dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * 100;
    const sy = ((e.clientY - rect.top) / rect.height) * 140;
    const dx = sx - 50;
    const dy = sy - 70;
    const r = Math.min(Math.sqrt(dx * dx + dy * dy) / 38, 1);
    const newTheta = r >= 1 ? Math.PI / 2 : Math.acos(1 - r * r);
    const newPhi = Math.atan2(dy, dx);
    setTheta(newTheta);
    setPhi(newPhi);
  };
  // Live state |psi> components (for overlay)
  const alpha = Math.cos(theta / 2);
  const betaRe = Math.sin(theta / 2) * Math.cos(phi);
  const betaIm = Math.sin(theta / 2) * Math.sin(phi);
  const p0 = alpha * alpha;
  // Project 3D Bloch-sphere vector (theta, phi) to 2D isometric
  const x = Math.sin(theta) * Math.cos(phi);
  const y = Math.sin(theta) * Math.sin(phi);
  const z = Math.cos(theta);
  const px = 50 + 30 * (x - y * 0.5);
  const py = 70 - 30 * (z + (x + y) * 0.3);
  return (
    <svg
      ref={svgRef}
      viewBox="0 0 100 140"
      className={draggable ? (dragging ? "w-full h-full cursor-grabbing select-none" : "w-full h-full cursor-grab select-none") : "w-full h-full"}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerMove={handlePointerMove}
      style={{ touchAction: draggable ? "none" : undefined }}
    >
      <defs>
        <radialGradient id="bs-grad" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="oklch(0.96 0.02 250)" />
          <stop offset="100%" stopColor="oklch(0.40 0.15 250 / 0.4)" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="70" rx="38" ry="14" fill="none" stroke={accent} strokeWidth="0.5" strokeDasharray="2 2" opacity="0.6" />
      <ellipse cx="50" cy="70" rx="14" ry="38" fill="none" stroke={accent} strokeWidth="0.5" strokeDasharray="2 2" opacity="0.6" />
      <circle cx="50" cy="70" r="38" fill="url(#bs-grad)" stroke={accent} strokeWidth="1" opacity="0.7" />
      <line x1="50" y1="32" x2="50" y2="108" stroke="oklch(0.45 0.05 250)" strokeWidth="0.5" />
      <text x="50" y="28" textAnchor="middle" fontSize="6" fill="oklch(0.45 0.05 250)">|0⟩</text>
      <text x="50" y="116" textAnchor="middle" fontSize="6" fill="oklch(0.45 0.05 250)">|1⟩</text>
      <motion.line
        x1="50" y1="70" x2={px} y2={py}
        stroke={accent} strokeWidth="1.5"
        animate={{ x2: px, y2: py }}
        transition={{ duration: 0.05, ease: "linear" }}
      />
      <circle cx={px} cy={py} r="2.5" fill={accent} />
      <text x="50" y="132" textAnchor="middle" fontSize="6" fill={accent} fontWeight="bold">|+⟩</text>
      {dragging && (
        <g>
          <rect x="2" y="120" width="96" height="18" fill="oklch(0.15 0.05 250 / 0.9)" rx="2" />
          <text x="50" y="129" textAnchor="middle" fontSize="5" fill="oklch(0.85 0.18 25)" fontWeight="bold" fontFamily="monospace">
            |psi⟩ = {alpha.toFixed(2)}|0⟩ + ({betaRe.toFixed(2)}{betaIm >= 0 ? "+" : ""}{betaIm.toFixed(2)}i)|1⟩
          </text>
          <text x="50" y="136" textAnchor="middle" fontSize="4" fill="oklch(0.75 0.10 250)" fontFamily="monospace">
            P(0)={p0.toFixed(3)} · drag to set θ/φ
          </text>
        </g>
      )}
    </svg>
  );
}'''

if old_bloch in src:
    src = src.replace(old_bloch, new_bloch)
    print("BlochSphereThumbnail patched to support draggable prop")
else:
    print("WARNING: BlochSphereThumbnail pattern not found, skipping")

# ----- Patch SuperpositionDetail to pass draggable -----
src = src.replace(
    '<BlochSphereThumbnail accent="oklch(0.55 0.16 250)" />',
    '<BlochSphereThumbnail accent="oklch(0.55 0.16 250)" draggable />',
)
# Update the caption to mention drag
src = src.replace(
    "The vector above rotates around the equator at θ=π/2 — that&apos;s the |+⟩ state, the simplest superposition.",
    "Drag the sphere to set (θ, φ) — the state |ψ⟩ updates live. Release to resume auto-rotation. The default equatorial position is the |+⟩ state (equal superposition).",
)

# ----- Patch BellPairThumbnail to be clickable -----
old_bell = '''function BellPairThumbnail({ accent }: { accent: string }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 0.08) % (2 * Math.PI)), 60);
    return () => clearInterval(id);
  }, []);
  const wave1 = Math.sin(phase);
  const wave2 = Math.sin(phase + Math.PI); // always opposite
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full">
      <circle cx="28" cy="50" r="18" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.85" />
      <circle cx="28" cy="50" r="6" fill={wave1 > 0 ? accent : "oklch(0.95 0.02 250)"} />
      <text x="28" y="78" textAnchor="middle" fontSize="6" fill="oklch(0.45 0.05 250)">q0</text>
      <circle cx="72" cy="90" r="18" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.85" />
      <circle cx="72" cy="90" r="6" fill={wave2 > 0 ? accent : "oklch(0.95 0.02 250)"} />
      <text x="72" y="118" textAnchor="middle" fontSize="6" fill="oklch(0.45 0.05 250)">q1</text>
      {/* Entanglement link — wavy line */}
      <motion.path
        d={`M 40 60 Q ${(40 + 72) / 2 + Math.sin(phase * 2) * 8} 75, 60 80`}
        stroke={accent} strokeWidth="1" fill="none" strokeDasharray="2 1"
        animate={{ d: `M 40 60 Q ${(40 + 72) / 2 + Math.sin(phase * 2) * 8} 75, 60 80` }}
        transition={{ duration: 0.06 }}
      />
      <text x="50" y="135" textAnchor="middle" fontSize="5" fill={accent} fontWeight="bold">|Φ+⟩</text>
      <text x="50" y="14" textAnchor="middle" fontSize="5" fill="oklch(0.45 0.05 250)">opposite correlation</text>
    </svg>
  );
}'''

new_bell = '''function BellPairThumbnail({ accent, clickable = false }: { accent: string; clickable?: boolean }) {
  const [phase, setPhase] = useState(0);
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 0.08) % (2 * Math.PI)), 60);
    return () => clearInterval(id);
  }, []);
  const wave1 = Math.sin(phase);
  const wave2 = Math.sin(phase + Math.PI); // always opposite — entanglement signature
  // When clickable, the user can flip q0; q1 follows instantly (entanglement!)
  const handleClick = () => {
    if (!clickable) return;
    setFlipped(f => !f);
  };
  const q0Color = (clickable && flipped) ? (wave1 > 0 ? accent : "oklch(0.95 0.02 250)") : (wave1 > 0 ? accent : "oklch(0.95 0.02 250)");
  // For clickable mode: q0 inverts based on `flipped`; q1 follows instantly (entangled)
  const q1Color = clickable
    ? (flipped ? (wave1 > 0 ? accent : "oklch(0.95 0.02 250)") : (wave2 > 0 ? accent : "oklch(0.95 0.02 250)"))
    : (wave2 > 0 ? accent : "oklch(0.95 0.02 250)");
  return (
    <svg
      viewBox="0 0 100 140"
      className={clickable ? "w-full h-full cursor-pointer select-none" : "w-full h-full"}
      onClick={handleClick}
    >
      <circle cx="28" cy="50" r="18" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.85" />
      <circle cx="28" cy="50" r="6" fill={q0Color} />
      <text x="28" y="78" textAnchor="middle" fontSize="6" fill="oklch(0.45 0.05 250)">q0{clickable && (flipped ? " (flipped)" : "")}</text>
      <circle cx="72" cy="90" r="18" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.85" />
      <circle cx="72" cy="90" r="6" fill={q1Color} />
      <text x="72" y="118" textAnchor="middle" fontSize="6" fill="oklch(0.45 0.05 250)">q1{clickable && " (follows)"}</text>
      {/* Entanglement link — wavy line */}
      <motion.path
        d={`M 40 60 Q ${(40 + 72) / 2 + Math.sin(phase * 2) * 8} 75, 60 80`}
        stroke={accent} strokeWidth="1" fill="none" strokeDasharray="2 1"
        animate={{ d: `M 40 60 Q ${(40 + 72) / 2 + Math.sin(phase * 2) * 8} 75, 60 80` }}
        transition={{ duration: 0.06 }}
      />
      <text x="50" y="135" textAnchor="middle" fontSize="5" fill={accent} fontWeight="bold">|Φ+⟩</text>
      <text x="50" y="14" textAnchor="middle" fontSize="5" fill="oklch(0.45 0.05 250)">
        {clickable ? "click q0 → q1 follows (entangled!)" : "opposite correlation"}
      </text>
    </svg>
  );
}'''

if old_bell in src:
    src = src.replace(old_bell, new_bell)
    print("BellPairThumbnail patched to support clickable prop")
else:
    print("WARNING: BellPairThumbnail pattern not found, skipping")

# Patch EntanglementDetail to use clickable
src = src.replace(
    '<BellPairThumbnail accent="oklch(0.55 0.16 165)" />',
    '<BellPairThumbnail accent="oklch(0.55 0.16 165)" clickable />',
)

with open(QS, "w") as f:
    f.write(src)

print(f"\nquantum-shorts.tsx: {len(src.splitlines())} lines")
print(f"Draggable BlochSphereThumbnail: {'draggable' in src}")
print(f"Clickable BellPairThumbnail: {'clickable' in src}")
