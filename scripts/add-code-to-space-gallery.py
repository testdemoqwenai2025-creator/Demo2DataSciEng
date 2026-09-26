#!/usr/bin/env python3
"""
Add code constructs (PyodideRunner) + prominent math equations to the
space-gallery-3d.tsx gallery modal.
"""
import re

FILE = "/home/z/my-project/src/app/_components/space-gallery-3d.tsx"
with open(FILE) as f:
    src = f.read()

# 1. Add code constants before the GalleryCard interface
CODE_CONSTANTS = b'''// Code constructs - Python that computes the math behind each 3D visual
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

'''.decode('utf-8')

# Insert before interface
interface_idx = src.find("// ============================================================\ninterface GalleryCard {")
if interface_idx == -1:
    raise SystemExit("GalleryCard interface not found")
src = src[:interface_idx] + CODE_CONSTANTS + src[interface_idx:]

# 2. Add code + mathExpr fields to interface
src = src.replace(
    "  caption: string;\n}",
    "  caption: string;\n  code?: string;\n  mathExpr?: string;\n}",
)

# 3. Add code + mathExpr to each card (insert after the detail: line)
# Pattern: find "detail: <...>,\n" for each card and add code + mathExpr after
card_codes = {
    "jwst": ("JWST_GALLERY_CODE", "z = (lambda_obs - lambda_emit) / lambda_emit  ·  v = H0·d  ·  D_C = c/H0 * integral(dz/E(z))"),
    "ligo": ("LIGO_GALLERY_CODE", "h = (4G/c^4) * (d2I/dt2) / r  ·  M_chirp = (m1*m2)^(3/5) / (m1+m2)^(1/5)"),
    "lhc": ("LHC_GALLERY_CODE", "tau_N = (1/pT2) * sum_k min(pT_i * dR_ik)  ·  tau_21 = tau_2/tau_1  ·  tau_32 = tau_3/tau_2"),
    "tiangong": ("TIANGONG_GALLERY_CODE", "T^2 = (4*pi^2/GM) * a^3  ·  v^2 = GM*(2/r - 1/a)  ·  F = GMm/r^2"),
}

for card_id, (code_const, math_str) in card_codes.items():
    # Find the line with detail: <...> for this card
    # Pattern: detail: <JWSTDeepField3D dim={3} />,
    pattern = f'detail: <'
    # Find the specific card by looking for the id line first
    id_pattern = f'id: "{card_id}"'
    id_idx = src.find(id_pattern)
    if id_idx == -1:
        print(f"WARNING: card {card_id} not found")
        continue
    # Find the next "caption:" after the card's id
    caption_idx = src.find("caption:", id_idx)
    if caption_idx == -1:
        print(f"WARNING: caption not found for {card_id}")
        continue
    # Find the end of the caption line (the closing ",")
    caption_end = src.find('",', caption_idx)
    if caption_end == -1:
        print(f"WARNING: caption end not found for {card_id}")
        continue
    caption_end += 2  # skip past ",
    # Insert code + mathExpr after the caption
    insertion = f'\n    code: {code_const},\n    mathExpr: "{math_str}",'
    src = src[:caption_end] + insertion + src[caption_end:]
    print(f"  {card_id}: code+math added")

# 4. Insert code + math rendering in the modal
old_footer_start = "              {/* Footer with caption */}"
new_sections = """              {/* Math foundation — the centrepiece */}
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

              {/* Footer with caption */}"""

if old_footer_start in src:
    src = src.replace(old_footer_start, new_sections, 1)
    print("\nModal: code+math section inserted")
else:
    print("\nWARNING: Footer pattern not found — trying alternate")
    # Try finding just "Footer with caption"
    alt = "Footer with caption"
    if alt in src:
        src = src.replace(alt, "Math foundation + Code construct + Footer with caption", 1)
        print("  Alternate pattern found")

with open(FILE, "w") as f:
    f.write(src)

print(f"\nFile: {len(src.splitlines())} lines")
print(f"PyodideRunner imported: {'PyodideRunner' in src}")
print(f"JWST_GALLERY_CODE: {'JWST_GALLERY_CODE' in src}")
print(f"Math foundation section: {'Math foundation' in src}")
print(f"Code construct section: {'Code construct' in src}")
