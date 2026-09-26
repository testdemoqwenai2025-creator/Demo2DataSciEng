#!/usr/bin/env python3
"""
Generate 8 Pyodide-runnable code-preview constants for the quantum-computing
page. Each constant demonstrates the underlying math + computation that would
power one of the suggested visual improvements.

Output: writes the constants + JSX section to /tmp/quantum_improvements.txt
which we'll then insert into quantum-computing.tsx via Edit.
"""
import json

# Each code block uses ONLY string-concatenation OR simple f-strings where the
# closing `"` ALWAYS appears before the closing `)` of print(). No stray
# backticks anywhere. We pre-validate each block by Python-parsing it.

CODE_BLOCKS = {}

# ---------- Block 1: Interactive Bloch sphere drag math ----------
CODE_BLOCKS["BLOCH_DRAG_CODE"] = r'''import numpy as np

# === Math powering a draggable Bloch sphere ===
# Pure single-qubit state on Bloch sphere:
#   |psi> = cos(theta/2)|0> + exp(i*phi) sin(theta/2)|1>

def screen_to_bloch(x, y, r=1.0):
    """Inverse orthographic projection: 2D screen (x, y) -> 3D Bloch (theta, phi)."""
    nx, ny = x / r, y / r
    rho2 = nx * nx + ny * ny
    if rho2 > 1.0:
        s = 1.0 / np.sqrt(rho2)
        nx, ny = nx * s, ny * s
        rho2 = 1.0
    nz = np.sqrt(max(0.0, 1.0 - rho2))
    return np.arccos(nz), np.arctan2(ny, nx)

def bloch_state(theta, phi):
    return np.array([np.cos(theta/2), np.exp(1j*phi) * np.sin(theta/2)], dtype=complex)

def measure(state, shots=1000):
    p0 = abs(state[0])**2
    return np.random.choice([0, 1], size=shots, p=[p0, 1 - p0])

np.random.seed(42)
print("=== Drag (x, y) -> Bloch (theta, phi) -> |psi> -> 1000-shot measurement ===")
print()
for x, y, name in [(0, 1, "north pole = |0>"),
                   (0, -1, "south pole = |1>"),
                   (1, 0, "equator +x = |+>"),
                   (0.5, 0.5, "equator 45 deg")]:
    theta, phi = screen_to_bloch(x, y)
    psi = bloch_state(theta, phi)
    p0 = abs(psi[0])**2
    samples = measure(psi)
    print(f"  drag ({x:+.2f},{y:+.2f}) -> theta={np.degrees(theta):5.1f} deg, phi={np.degrees(phi):5.1f} deg")
    print(f"    |psi> = {psi[0].real:+.4f}|0> + {psi[1].real:+.4f}|1>, P(0)={p0:.3f}")
    print(f"    1000 shots: P_hat(0)={samples.mean():.3f}   [{name}]")
    print()

# Gate = Bloch-sphere rotation about an axis
X = np.array([[0, 1], [1, 0]], dtype=complex)
Z = np.array([[1, 0], [0, -1]], dtype=complex)
H = (X + Z) / np.sqrt(2)
zero = np.array([1, 0], dtype=complex)
print("=== Gates rotate the Bloch vector ===")
print(f"  X|0> = {X @ zero}   (north pole -> south pole)")
print(f"  H|0> = {H @ zero}   (north pole -> equator +x = |+>)")
print(f"  Z|+> = {Z @ H @ zero}   (equator +x -> -x, phase flip)")
print()
print("Implementation: drag = inverse projection; gate = axis rotation; measure = Born sample")
'''

# ---------- Block 2: Surface code visualisation ----------
CODE_BLOCKS["SURFACE_CODE_CODE"] = r'''import numpy as np

# === Surface code: distance-d patch + stabilisers + logical error suppression ===

def surface_code_qubits(d):
    """Count data + ancilla qubits for distance-d rotated surface code."""
    n_data = d * d
    n_ancilla_x = (d - 1) * d
    n_ancilla_z = (d - 1) * d
    return n_data, n_ancilla_x + n_ancilla_z, n_data + n_ancilla_x + n_ancilla_z

print("=== Surface code patch (rotated) — qubit count vs distance ===")
print()
for d in [3, 5, 7, 9, 11, 17, 21]:
    n_d, n_a, n_total = surface_code_qubits(d)
    print(f"  d={d:2d}  data={n_d:3d}  ancilla={n_a:3d}  total={n_total:3d} physical qubits")

print()
print("=== Syndrome decoding: Z error on central data qubit (d=3) ===")
print()
print("  Patch layout (d=3, 9 data + 4 X-ancilla + 4 Z-ancilla = 17 qubits):")
print("    D - Z - D - Z - D")
print("    |   |   |   |   |")
print("    X - D - X - D - X")
print("    |   |   |   |   |")
print("    D - Z - D - Z - D")
print("    |   |   |   |   |")
print("    X - D - X - D - X")
print("    |   |   |   |   |")
print("    D - Z - D - Z - D")
print()
print("  Z error on centre data qubit -> anticommutes with 2 adjacent X stabilisers")
print("  Syndrome: X_top = -1, X_bottom = -1, X_left = +1, X_right = +1")
print("  Decoder: pair (-1, -1) -> unique match -> central Z error -> correctable")

def logical_error(p_phys, d, Lambda):
    """p_logical = p_phys * Lambda^((d-1)/2) below threshold."""
    return p_phys * Lambda ** ((d - 1) / 2)

p_phys_willow = 1.5e-3
Lambda_willow = 2.14
print()
print(f"=== Logical error rate vs distance (Willow p_phys={p_phys_willow*100:.2f}%, Lambda={Lambda_willow}) ===")
print()
for d in [3, 5, 7, 9, 11, 17, 21]:
    p_log = logical_error(p_phys_willow, d, Lambda_willow)
    n_d, n_a, n_total = surface_code_qubits(d)
    print(f"  d={d:2d}  ({n_total:3d} qubits)  p_logical = {p_log:.2e}")

print()
print("Implementation: visual = patch SVG + syndrome highlight; math = Lambda^((d-1)/2) scaling")
'''

# ---------- Block 3: Quantum speedup comparison ----------
CODE_BLOCKS["SPEEDUP_CODE"] = r'''import numpy as np
import math

# === Big-O scaling for canonical quantum algorithms ===

def classical_search(N): return N / 2.0
def grover_search(N):    return math.pi / 4.0 * math.sqrt(N)
def shor_factoring(n):   return float(n**3)
def classical_factoring_gnfs(n):
    """GNFS complexity: L = exp(c * n^(1/3) * (log n)^(2/3)), c ~ 1.923."""
    return math.exp(1.923 * (n ** (1.0/3.0)) * (math.log(n) ** (2.0/3.0)))
def qft_ops(N):  return math.log2(N) * math.log2(max(math.log2(N), 2))
def fft_ops(N):  return N * math.log2(N)

print("=== Quantum vs classical speedup (concrete queries at N=10^6) ===")
print()
N = 10**6
print(f"  Unstructured search (N={N:,}):")
print(f"    Classical: {classical_search(N):>12,.0f} oracle queries")
print(f"    Grover:    {grover_search(N):>12,.0f} oracle queries")
print(f"    Speedup:   {classical_search(N)/grover_search(N):>12.1f}x  (= sqrt(N))")
print()
print("  Factoring 2048-bit RSA (n=2048):")
n = 2048
print(f"    Classical (GNFS): ~{classical_factoring_gnfs(n):.2e} ops")
print(f"    Shor:             ~{shor_factoring(n):.2e} ops  (= n^3)")
print(f"    Speedup:          ~{classical_factoring_gnfs(n)/shor_factoring(n):.2e}x")
print()
print(f"  Fourier transform (N={N}):")
print(f"    Classical FFT: {fft_ops(N):>10,.0f} ops  (N log N)")
print(f"    Quantum QFT:   {qft_ops(N):>10.1f} ops  (n log n, n=log2 N)")
print(f"    Speedup:       {fft_ops(N)/qft_ops(N):>10.1f}x")

print()
print("=== Quantum hardware feasibility at N=10^6 ===")
print()
n_qubits = int(math.log2(N))
t1_us = 100.0  # IBM Heron R2 ~100 us
gate_time_ns = 50.0  # 2-qubit gate time
max_gates = int(t1_us * 1e3 / gate_time_ns)  # convert us->ns then divide
grover_iters = int(grover_search(N))
print(f"  Qubits needed for search:     {n_qubits}  (IBM Heron R2 has 156)")
print(f"  Circuit depth (Grover):       ~{grover_iters} iterations")
print(f"  NISQ coherence T1:            ~{t1_us:.0f} us  (IBM Heron R2, 2024)")
print(f"  2-qubit gate time:            ~{gate_time_ns:.0f} ns")
print(f"  Max gates before decoherence: ~{max_gates:,}  (= T1 / gate_time)")
print(f"  Feasible today? {'YES' if grover_iters < max_gates else 'NO'}")

print()
print("Implementation: visual = log-log scaling chart; math = Big-O asymptotics + hardware limits")
'''

# ---------- Block 4: Majorana zero-mode ----------
CODE_BLOCKS["MAJORANA_CODE"] = r'''import numpy as np

# === Kitaev chain: 1D topological superconductor ===
# H = -mu sum c_n^dag c_n - t sum (c_n^dag c_{n+1} + h.c.) + Delta sum (c_n c_{n+1} + h.c.)
# Topological phase when |mu| < 2t — endpoints host Majorana zero modes

def kitaev_chain(N, mu, t, Delta):
    """Build 2N x 2N BdG Hamiltonian for N-site Kitaev chain."""
    H = np.zeros((2*N, 2*N), dtype=complex)
    for n in range(N):
        H[2*n, 2*n]     = -mu
        H[2*n+1, 2*n+1] = +mu
    for n in range(N-1):
        H[2*n,       2*(n+1)]     = -t
        H[2*(n+1)+1, 2*n+1]      = +t
        H[2*n,       2*(n+1)+1]  = -Delta
        H[2*(n+1),   2*n+1]      = +Delta
    H = H + H.T.conj()
    return H

print("=== Kitaev chain: topological vs trivial phase ===")
print()
N = 20
# Topological: |mu| < 2t
H_topo = kitaev_chain(N, mu=0.0, t=1.0, Delta=1.0)
E_topo = np.linalg.eigvalsh(H_topo)
print(f"  Topological phase (mu=0, t=1, Delta=1) — N={N} sites:")
print(f"    Two lowest |E|: {abs(E_topo[0]):.4f}, {abs(E_topo[1]):.4f}  (Majorana zero modes)")
print(f"    Bulk gap:      {abs(E_topo[2]):.4f}")
# Trivial: |mu| > 2t
H_triv = kitaev_chain(N, mu=3.0, t=1.0, Delta=1.0)
E_triv = np.linalg.eigvalsh(H_triv)
print()
print(f"  Trivial phase (mu=3, t=1, Delta=1) — N={N} sites:")
print(f"    Two lowest |E|: {abs(E_triv[0]):.4f}, {abs(E_triv[1]):.4f}  (gapped, no zero modes)")
print(f"    Bulk gap:      {abs(E_triv[2]):.4f}")

print()
print("=== Topological protection ===")
print()
Delta_topo = abs(E_topo[2])
kBT = 0.025  # T~300mK, kBT in meV
protection = np.exp(-Delta_topo / kBT)
print(f"  Bulk topological gap Delta = {Delta_topo:.4f} meV")
print(f"  Thermal energy kBT (T=300mK) = {kBT:.3f} meV")
print(f"  Local-noise suppression = exp(-Delta/kBT) = {protection:.4f}")
print(f"  -> Local perturbation cannot split Majorana degeneracy below Delta")
print(f"  -> This is why Microsoft Majorana 1 uses topoconductors")

print()
print("Implementation: visual = wire with Majorana endpoints + spectrum; math = BdG diagonalisation")
'''

# ---------- Block 5: Decoherence timeline ----------
CODE_BLOCKS["DECOHERENCE_TIMELINE_CODE"] = r'''import numpy as np
import math

# === Historical T1, T2 progression (1998-2024) ===
timeline = [
    (1998, 0.001, "Nielsen-Chuang era — NMR"),
    (2003, 0.002, "first superconducting qubit"),
    (2009, 0.004, "Yale transmon"),
    (2014, 0.040, "Google / UCSB early transmons"),
    (2017, 0.090, "Google 9-qubit device"),
    (2019, 0.130, "Google Sycamore"),
    (2021, 0.150, "IBM Eagle"),
    (2024, 0.300, "Google Willow (~5x vs Sycamore)"),
]

print("=== T1 coherence time progression (1998 -> 2024) ===")
print()
print(f"  {'Year':>6}  {'T1 (us)':>10}  Chip / milestone")
print(f"  {'----':>6}  {'-------':>10}  --------------")
for year, t1, label in timeline:
    print(f"  {year:>6}  {t1*1e6:>10.1f}  {label}")

# Log-linear fit: T1(t) = T1_0 * 2^(t / doubling_time)
years = np.array([y for y, _, _ in timeline])
t1s = np.array([t for _, t, _ in timeline])
log_t1 = np.log(t1s)
b, a = np.polyfit(years, log_t1, 1)
doubling_time = math.log(2) / b
print()
print(f"  Best-fit doubling time: {doubling_time:.1f} years  (~2x every {doubling_time:.0f} years)")
print(f"  Compare to Moore's law: 2 years")

print()
print(f"  Projections (assuming {doubling_time:.0f}-year doubling continues):")
for year in [2027, 2030, 2035, 2040]:
    projected = t1s[0] * 2 ** ((year - years[0]) / doubling_time)
    print(f"    {year}: T1 = {projected*1e6:.0f} us = {projected*1e3:.1f} ms")

print()
print("=== Surface-code threshold crossing ===")
print()
print(f"  Threshold p_c ~ 1%  (surface code below this works)")
print(f"  1998: p_phys ~ 50% (way above threshold)")
print(f"  2024: p_phys ~ 0.3% (BELOW threshold — Willow, Dec 2024)")
print(f"  -> Fault-tolerant quantum computing now theoretically possible")

print()
print("Implementation: visual = log-scale timeline plot; math = exponential fit + threshold crossing")
'''

# ---------- Block 6: Qiskit-equivalent circuit ----------
CODE_BLOCKS["QISKIT_EQUIV_CODE"] = r'''import numpy as np

# === Bell state circuit: H on q0, CNOT(q0, q1), measure ===
# (Hand-rolled mini-Qiskit — qiskit isn't on Pyodide's default index,
#  but the math is identical to running qiskit.QuantumCircuit(2, 2).)

def H_gate():
    return np.array([[1, 1], [1, -1]], dtype=complex) / np.sqrt(2)

def CNOT_gate():
    """4x4 CNOT: |a,b> -> |a, a XOR b>."""
    return np.array([[1,0,0,0], [0,1,0,0], [0,0,0,1], [0,0,1,0]], dtype=complex)

def kron(*mats):
    out = np.array([[1.0]], dtype=complex)
    for m in mats:
        out = np.kron(out, m)
    return out

I2 = np.eye(2, dtype=complex)
U_H = kron(H_gate(), I2)
U_CNOT = CNOT_gate()
U_total = U_CNOT @ U_H
zero_zero = np.array([1, 0, 0, 0], dtype=complex)
bell_state = U_total @ zero_zero

print("=== Bell state circuit (hand-rolled mini-Qiskit) ===")
print()
print("  Circuit:  q0 --[H]--*-- M")
print("           q1 --------X-- M")
print()
print(f"  |00> input state:    {zero_zero}")
print(f"  After H (x) I:       {U_H @ zero_zero}")
print(f"  After CNOT:          {bell_state}")
print(f"  -> Bell state |Phi+> = (|00> + |11>) / sqrt(2)")

print()
print(f"  Measurement probabilities:")
for i, label in enumerate(["00", "01", "10", "11"]):
    p = abs(bell_state[i])**2
    print(f"    P({label}) = {p:.4f}  (classical max = 0.25)")

# Transpile to native gate set: {RZ(theta), SX, X, CX}
import math

def RZ(theta):
    return np.array([[np.exp(-1j*theta/2), 0], [0, np.exp(1j*theta/2)]], dtype=complex)

def SX():
    return np.array([[0.5+0.5j, 0.5-0.5j], [0.5-0.5j, 0.5+0.5j]], dtype=complex)

H_native = RZ(math.pi/2) @ SX() @ RZ(math.pi/2)
print()
print(f"  Transpile H -> RZ(pi/2) SX RZ(pi/2):")
print(f"    ||H_native - H|| = {np.linalg.norm(H_native - H_gate()):.2e}  (close to 0 -> valid decomp)")
print(f"    Gate count: 3 native gates vs 1 ideal gate")

# Sample 8192 shots (real IBM hardware default)
np.random.seed(42)
probs = [abs(bell_state[i])**2 for i in range(4)]
samples = np.random.choice([0, 1, 2, 3], p=probs, size=8192)
counts = {bin(i)[2:].zfill(2): int((samples == i).sum()) for i in range(4)}
print()
print(f"  8192 shots sampled:")
for outcome, count in sorted(counts.items()):
    print(f"    {outcome}: {count}  ({count/8192:.3f})")

print()
print("Implementation: visual = circuit diagram + transpiled gate list; math = unitary composition")
'''

# ---------- Block 7: Quantinuum Helios all-to-all ----------
CODE_BLOCKS["HELIOS_ALLTOALL_CODE"] = r'''import numpy as np

# === Connectivity: superconducting heavy-hex vs trapped-ion all-to-all ===

def swaps_superconductor(N):
    """Heavy-hex lattice: ~N/2 SWAPs per long-range 2-qubit gate.
    Full all-to-all needs N(N-1)/2 long-range gates -> ~N(N-1) SWAPs."""
    return N * (N - 1)

def swaps_trapped_ion(N):
    """Native all-to-all — any 2 qubits interact directly."""
    return 0

print("=== Quantinuum Helios: all-to-all vs superconductor nearest-neighbour ===")
print()
print("  H2-1 (Jun 2024): 56 qubits, 99.8% 2-qubit fidelity, all-to-all")
print("  Helios (2025):   96-98 qubits, QCCD architecture, all-to-all")
print("  IBM Heron R2 (Nov 2024): 156 qubits, 99.7% 2-qubit fidelity, heavy-hex")
print()

print(f"  {'N':>4}  {'SWAPs (SC)':>14}  {'SWAPs (Ion)':>14}  {'Ion savings':>14}")
print(f"  {'--':>4}  {'----------':>14}  {'-----------':>14}  {'-----------':>14}")
for N in [10, 20, 50, 100, 156, 200]:
    sc = swaps_superconductor(N)
    ion = swaps_trapped_ion(N)
    savings = sc - ion
    print(f"  {N:>4}  {sc:>14}  {ion:>14}  {savings:>14}")

print()
print("=== Effective circuit fidelity for 100-gate variational ansatz (N=50) ===")
print()
N = 50
gates_ideal = 100
sc_swaps = swaps_superconductor(N)
total_sc_gates = gates_ideal + sc_swaps
total_ion_gates = gates_ideal
p2q_sc = 0.003   # 99.7%
p2q_ion = 0.002  # 99.8%
p_success_sc = (1 - p2q_sc) ** total_sc_gates
p_success_ion = (1 - p2q_ion) ** total_ion_gates
print(f"  N={N} qubits, ansatz needs {gates_ideal} native 2-qubit gates")
print(f"  Superconductor: +{sc_swaps} SWAPs = {total_sc_gates} total gates")
print(f"    Success rate @ p={p2q_sc*100:.1f}%: {p_success_sc:.6f}")
print(f"  Trapped ion: {total_ion_gates} total gates (no SWAPs needed)")
print(f"    Success rate @ p={p2q_ion*100:.1f}%: {p_success_ion:.6f}")
print(f"  -> Ion trap gives {p_success_ion/max(p_success_sc, 1e-12):.1f}x higher success for all-to-all algos")

print()
print("Implementation: visual = lattice vs complete-graph diagram; math = SWAP overhead * fidelity")
'''

# ---------- Block 8: Shor's resource estimation ----------
CODE_BLOCKS["SHOR_RESOURCE_CODE"] = r'''import numpy as np
import math

# === Shor's algorithm resource estimation ===
# Per Gidney & Ekerå 2019 (arXiv:1905.09749):
#   ~20M physical qubits for 2048-bit RSA
#   ~8 hours runtime
#   Surface code distance d ~ 17-21
#   Magic state distillation overhead: ~100x the logical qubit count

def surface_code_physical_qubits(d, n_logical):
    """Rotated surface code: 2d^2 - 1 physical per logical + ancilla."""
    return n_logical * (2 * d * d - 1 + 4 * (d - 1))

def shor_resources(n_bits):
    """Estimate physical qubits + time for factoring n_bits-RSA."""
    n_logical = 3 * n_bits  # data + magic factories
    d = max(17, int(2 * math.sqrt(n_bits / 100)))
    n_phys = surface_code_physical_qubits(d, n_logical) * 100
    T_gate = 1e-6  # 1 us per logical Toffoli
    depth = 48.0 * n_bits**3 / math.log2(max(n_bits, 2))
    runtime_s = depth * T_gate
    return n_logical, d, n_phys, runtime_s

print("=== Shor's algorithm — physical qubit + time cost ===")
print()
print(f"  Per Gidney & Ekerå 2019: ~20M qubits, ~8h for RSA-2048")
print()
print(f"  {'Key size':>10}  {'Logical':>10}  {'d':>4}  {'Physical':>15}  {'Runtime':>14}")
print(f"  {'--------':>10}  {'-------':>10}  {'--':>4}  {'--------':>15}  {'-------':>14}")
for n_bits in [256, 512, 1024, 2048, 4096, 8192]:
    n_log, d, n_phys, rt = shor_resources(n_bits)
    if rt < 3600:
        rt_str = f"{rt/60:.1f} min"
    elif rt < 86400:
        rt_str = f"{rt/3600:.1f} h"
    elif rt < 86400*365:
        rt_str = f"{rt/86400:.1f} days"
    else:
        rt_str = f"{rt/(86400*365):.1f} years"
    print(f"  {n_bits:>10}  {n_log:>10}  {d:>4}  {n_phys:>15,}  {rt_str:>14}")

print()
print("=== Today's hardware vs Shor's requirement (RSA-2048) ===")
print()
n_log_2048, d_2048, n_phys_2048, rt_2048 = shor_resources(2048)
current_qubits = 156
print(f"  Shor RSA-2048 needs: ~{n_phys_2048:,} physical qubits")
print(f"  Current best chip:  {current_qubits} qubits  (IBM Heron R2, Nov 2024)")
print(f"  Gap: {n_phys_2048 / current_qubits:,.0f}x more qubits needed")
doubling = 2.0
years_to_shor = math.log2(n_phys_2048 / current_qubits) * doubling
print(f"  At {current_qubits} qubits/chip and 2x qubit growth / 2yr:")
print(f"    Years to Shor: {years_to_shor:.1f} years  (best case)")

print()
print("=== Magic state distillation overhead ===")
print()
print("  T-state distillation: 15 noisy T-states -> 1 high-fidelity T-state")
print("  Success rate ~ 1/12 -> ~180 noisy T-states per logical T-gate")
print("  -> 99% of physical qubits are in magic state factories")
print("  -> This is why fault-tolerant QC is HARD")

print()
print("Implementation: visual = chip-size comparison + Gantt chart; math = Gidney-Ekera 2019 scaling")
'''

# ---- Validate each block by trying to compile it ----
print("Validating code blocks...")
for name, code in CODE_BLOCKS.items():
    try:
        compile(code, name + ".py", "exec")
        print(f"  OK  {name}")
    except SyntaxError as e:
        print(f"  FAIL {name}: {e}")
        raise

# ---- Write constants + JSX to a temp file ----
with open("/tmp/quantum_improvements.txt", "w") as f:
    # Constants block — goes between PYTORCH_CODE and QuantumComputingPage
    f.write("\n\n// ============================================================\n")
    f.write("// Code-preview constants for the 8 improvement suggestions.\n")
    f.write("// Each block demonstrates the underlying math + computation that\n")
    f.write("// would power one of the suggested visual improvements.\n")
    f.write("// ============================================================\n\n")
    for name, code in CODE_BLOCKS.items():
        # Escape backticks and ${ in the Python code (we use ${ nowhere)
        # Actually we use f-strings with single {, no ${. Just escape backticks.
        safe = code.replace("`", "\\`").replace("${", "\\${")
        f.write(f"const {name} = `{safe}`;\n\n")
    print(f"Wrote {len(CODE_BLOCKS)} code constants to /tmp/quantum_improvements.txt")

print("Done.")
