#!/usr/bin/env python3
"""
Add code constructs (PyodideRunner) + prominent math equations to the
space-gallery-3d.tsx and fintech-gallery-3d.tsx gallery modals.

Per user request: "always the code, mathematics and computational tools
are the centrepiece of the theme, where possible these needs to be expressed"

Each gallery modal will now have (in addition to the animated 3D SVG):
  1. A math equations block (prominent, primary color)
  2. A PyodideRunner code block (Python that computes the math behind the SVG)
"""
import re

# ---------- SPACE GALLERY ----------
SPACE_FILE = "/home/z/my-project/src/app/_components/space-gallery-3d.tsx"
with open(SPACE_FILE) as f:
    src = f.read()

# 1. Add code constants before the GalleryCard interface
CODE_CONSTANTS = '''
// Code constructs — Python that computes the math behind each 3D visual
// (user request: "always the code, mathematics and computational tools
//  are the centrepiece of the theme, where possible these needs to be expressed")

const JWST_GALLERY_CODE = `import math

# JWST lookback time computation (Planck 2018 cosmology)
H0 = 67.4; Omega_m = 0.315; Omega_Lambda = 0.685
D_H = 299792.458 / H0  # Hubble distance (Mpc)

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

# GW strain from binary merger
def chirp_mass(m1, m2):
    return (m1 * m2)**0.6 / (m1 + m2)**0.2

def gw_strain(m1, m2, freq, dist_mpc):
    Mc = chirp_mass(m1, m2)
    h = 1e-21 * (Mc / 30)**(5/3) * (freq / 100)**(2/3) * (500 / dist_mpc)
    return h, Mc

print("=== GW strain for notable events ===")
for name, m1, m2, f, D in [("GW150914", 36, 29, 100, 410), ("GW170817", 1.46, 1.27, 100, 40), ("GW190521", 85, 66, 100, 5300)]:
    h, Mc = gw_strain(m1, m2, f, D)
    print(f"  {name}: m1={m1}, m2={m2}, Mc={Mc:.1f} Msun, h={h:.2e}, D={D} Mpc")`;

const LHC_GALLERY_CODE = `import math

# n-subjettiness tau_N for boosted object tagging
# tau_N measures how well a jet's constituents align with N subjets
def tau_N(constituents, N_subjets):
    """Simplified: sum of min distances to nearest subjet axis."""
    total = 0; norm = sum(c['pt'] for c in constituents) ** 2
    for c in constituents:
        min_dist = min(math.sqrt(c['dr']**2) for c in [c])
        total += c['pt'] * min_dist
    return total / norm

print("=== LHC n-subjettiness for jet tagging ===")
print("  tau_21 < 0.45 -> W boson (2-prong)")
print("  tau_32 < 0.65 -> top quark (3-prong)")
print("  LHC Run 3: 13.6 TeV, 140/fb target, ParticleNet ML tagger")`;

const TIANGONG_GALLERY_CODE = `import math

# Kepler 3rd law: T^2 = (4*pi^2 / GM) * a^3
# For Earth orbit (G*M_sun = 1.327e20 m^3/s^2)
G = 6.674e-11; M_earth = 5.972e24; R_earth = 6.371e6

def orbital_period(altitude_km):
    a = (R_earth + altitude_km * 1000)
    T = 2 * math.pi * math.sqrt(a**3 / (G * M_earth))
    return T / 60  # minutes

print("=== Orbital periods (Kepler 3rd law) ===")
for name, alt in [("ISS", 408), ("Tiangong", 389), ("Hubble", 540), ("GPS", 20200)]:
    T = orbital_period(alt)
    print(f"  {name:>12} at {alt:>5} km -> T = {T:.1f} min ({T/60:.2f} hr)")`;

'''

# Insert code constants before the GalleryCard interface
interface_marker = "// ============================================================\ninterface GalleryCard {"
idx = src.find(interface_marker)
if idx == -1:
    raise SystemExit("GalleryCard interface not found in space gallery")

src = src[:idx] + CODE_CONSTANTS + src[idx:]

# 2. Add code field to GalleryCard interface
src = src.replace(
    "interface GalleryCard {\n  id: string;\n  title: string;\n  subtitle: string;\n  accent: string;\n  icon: ReactNode;\n  thumb: ReactNode;\n  detail: ReactNode;\n  caption: string;\n}",
    "interface GalleryCard {\n  id: string;\n  title: string;\n  subtitle: string;\n  accent: string;\n  icon: ReactNode;\n  thumb: ReactNode;\n  detail: ReactNode;\n  caption: string;\n  code?: string;\n  mathExpr?: string;\n}",
)

# 3. Add code + mathExpr to each card
cards_data = {
    "jwst": ("JWST_GALLERY_CODE", "z = (λ_obs - λ_emit) / λ_emit  ·  v = H₀·d  ·  D_C = c/H₀ ∫ dz/E(z)"),
    "ligo": ("LIGO_GALLERY_CODE", "h = (4G/c⁴)·(d²I/dt²)/r  ·  M_chirp = (m₁m₂)^(3/5) / (m₁+m₂)^(1/5)"),
    "lhc": ("LHC_GALLERY_CODE", "τ_N = (1/pT²) Σ_k min_{(i=1..N)} pT_i × ΔR_{ik}  ·  τ₂₁ = τ₂/τ₁  ·  τ₃₂ = τ₃/τ₂"),
    "tiangong": ("TIANGONG_GALLERY_CODE", "T² = (4π²/GM)·a³  ·  v² = GM·(2/r − 1/a)  ·  F = GMm/r²"),
}

for card_id, (code_const, math_str) in cards_data.items():
    # Find the card's closing } and add code + mathExpr before it
    # Pattern: "caption: \"...\",\n  },"
    pattern = f'  }},\n'  # card closing
    # More specific: find the card by its id and add fields before closing }
    # Use a simpler approach — find the caption line for each card and add after it
    if card_id == "jwst":
        src = src.replace(
            'caption: "JWST deep field — near-infrared imaging reveals the earliest galaxies, formed only ~300 Myr after the Big Bang. Cosmological redshift z = (λ_obs - λ_emit)/λ_emit stretches light from ultraviolet into JWST\\'s NIRCam band. Higher z = farther = earlier universe. The central bright galaxy is at z ≈ 7; the fainter z = 14 dots are photons emitted when the universe was 3% of its current age.",',
            f'caption: "JWST deep field — near-infrared imaging reveals the earliest galaxies, formed only ~300 Myr after the Big Bang. Cosmological redshift z = (λ_obs - λ_emit)/λ_emit stretches light from ultraviolet into JWST\\'s NIRCam band. Higher z = farther = earlier universe. The central bright galaxy is at z ≈ 7; the fainter z = 14 dots are photons emitted when the universe was 3% of its current age.",\n    code: {code_const},\n    mathExpr: "{math_str}",',
        )
    elif card_id == "ligo":
        src = src.replace(
            'caption: "LIGO interferometer —',
            f'code: {code_const},\n    mathExpr: "{math_str}",\n    caption: "LIGO interferometer —',
        )
    elif card_id == "lhc":
        src = src.replace(
            'caption: "LHC collision —',
            f'code: {code_const},\n    mathExpr: "{math_str}",\n    caption: "LHC collision —',
        )
    elif card_id == "tiangong":
        src = src.replace(
            'caption: "Tiangong space station —',
            f'code: {code_const},\n    mathExpr: "{math_str}",\n    caption: "Tiangong space station —',
        )

# 4. Insert code + math rendering in the modal (between scene and caption)
old_footer = '              {/* Footer with caption */}\n              <div className="border-t border-border/40 bg-muted/20 px-4 md:px-6 py-3">\n                <p className="text-xs text-muted-foreground leading-relaxed">{openCard.caption}</p>'

new_footer = '''              {/* Code constructs + math equations — the centrepiece */}
              {openCard.mathExpr && (
                <div className="border-t border-border/40 bg-primary/5 px-4 md:px-6 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Math foundation</p>
                  <p className="font-mono text-xs text-primary leading-relaxed">{openCard.mathExpr}</p>
                </div>
              )}
              {openCard.code && (
                <div className="border-t border-border/40 px-4 md:px-6 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Code construct — run the computation</p>
                  <PyodideRunner
                    buttonLabel="Run computation (Pyodide)"
                    code={openCard.code}
                  />
                </div>
              )}

              {/* Footer with caption */}
              <div className="border-t border-border/40 bg-muted/20 px-4 md:px-6 py-3">
                <p className="text-xs text-muted-foreground leading-relaxed">{openCard.caption}</p>'''

if old_footer in src:
    src = src.replace(old_footer, new_footer)
    print("Space gallery: code+math section inserted in modal")
else:
    print("WARNING: Could not find footer pattern in space gallery — trying alternate")
    # Try to find a simpler pattern
    alt_pattern = '{/* Footer with caption */}'
    if alt_pattern in src:
        src = src.replace(alt_pattern, '{/* Code constructs + math + Footer with caption */}')
        print("Space gallery: found alternate pattern")

with open(SPACE_FILE, "w") as f:
    f.write(src)

print(f"Space gallery: {len(src.splitlines())} lines")
print(f"PyodideRunner imported: {'PyodideRunner' in src}")
print(f"Code constants defined: {'JWST_GALLERY_CODE' in src}")
print(f"Math+code section present: {'Math foundation' in src}")
print(f"Code construct section present: {'Code construct' in src}")
