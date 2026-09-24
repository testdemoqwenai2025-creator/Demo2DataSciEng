#!/usr/bin/env python3
"""Generate Pyodide code constants for space-shorts.tsx and fintech-shorts.tsx.
Each block validated by Python compile() before writing.
"""
import json

CODE_BLOCKS = {}

# ====================== SPACE SHORTS ======================

CODE_BLOCKS["JWST_DEEP_FIELD_CODE"] = r'''import math

# === JWST deep field — lookback time + redshift ===
# Cosmological parameters (Planck 2018)
H0 = 67.4  # km/s/Mpc
Omega_m = 0.315
Omega_Lambda = 0.685
c_kms = 299792.458  # km/s

# Hubble distance
D_H = c_kms / H0  # Mpc

def comoving_distance(z):
    """Approximate integral of c/H(z') dz' from 0 to z."""
    # Use E(z) = sqrt(Omega_m*(1+z)^3 + Omega_Lambda)
    # Numeric integration (trapezoidal, 100 steps)
    N = 100
    dz = z / N
    d = 0
    for i in range(N):
        zi = i * dz
        zf = (i + 1) * dz
        Ei = 1.0 / math.sqrt(Omega_m * (1 + zi)**3 + Omega_Lambda)
        Ef = 1.0 / math.sqrt(Omega_m * (1 + zf)**3 + Omega_Lambda)
        d += 0.5 * (Ei + Ef) * dz
    return D_H * d  # Mpc

def lookback_time(z):
    """Lookback time in Gyr."""
    t_H = 1.0 / H0 * 9.778  # Hubble time in Gyr (1/H0 * Gyr conversion)
    N = 100
    dz = z / N
    t = 0
    for i in range(N):
        zi = i * dz
        zf = (i + 1) * dz
        Ei = 1.0 / ((1 + zi) * math.sqrt(Omega_m * (1 + zi)**3 + Omega_Lambda))
        Ef = 1.0 / ((1 + zf) * math.sqrt(Omega_m * (1 + zf)**3 + Omega_Lambda))
        t += 0.5 * (Ei + Ef) * dz
    return t_H * t

print("=== JWST deep field — light from the early Universe ===")
print(f"Cosmology: H0={H0}, Omega_m={Omega_m}, Omega_Lambda={Omega_Lambda}")
print(f"Hubble time t_H = {1/H0 * 9.778:.2f} Gyr")
print()
print(f"{'z':>6} {'D_comoving (Mpc)':>18} {'Lookback (Gyr)':>16} {'Age of Universe (Gyr)':>22}")
print(f"{'-'*6:>6} {'-'*18:>18} {'-'*16:>16} {'-'*22:>22}")
for z in [0.5, 1.0, 2.0, 5.0, 7.0, 10.0, 14.0, 20.0]:
    D = comoving_distance(z)
    t_lb = lookback_time(z)
    t_age = 13.8 - t_lb
    print(f"{z:>6.1f} {D:>18.1f} {t_lb:>16.2f} {t_age:>22.2f}")

print()
print("=== JADES-GS-z14-0 (Naidu et al. 2023, JWST NIRCam) ===")
z = 14.32
print(f"z = {z} -> lookback time {lookback_time(z):.2f} Gyr")
print(f"  -> observed ~300 Myr after Big Bang ( Universe was 2% of current age )")
print(f"  -> galaxy mass ~5e8 M_sun ( impossibly massive for early Universe )")
print(f"  -> challenges Lambda-CDM structure formation predictions")
print()
print("=== JWST vs Hubble deep field ===")
print(f"Hubble XDF (2012): z ~ 8-10, ~5500 galaxies, lookback ~13.2 Gyr")
print(f"JWST JADES (2023): z ~ 11-15, ~100,000 galaxies, lookback ~13.5 Gyr")
print(f"JWST sees 100x deeper in IR (2 um) than Hubble in optical (0.5 um)")'''

CODE_BLOCKS["GRAVITATIONAL_WAVES_CODE"] = r'''import math

# === Gravitational wave signal — binary black hole merger ===
G = 6.674e-11  # m^3/kg/s^2
c = 2.998e8    # m/s
M_sun = 1.989e30  # kg
Mpc = 3.086e22    # m
pc = 3.086e16     # m

def chirp_mass(m1, m2):
    """Mc = (m1*m2)^(3/5) / (m1+m2)^(1/5)"""
    return (m1 * m2)**0.6 / (m1 + m2)**0.2

def gw_strain(m1_msun, m2_msun, freq_hz, distance_mpc):
    """Approximate GW strain amplitude h ~ 1e-21 * (Mc/30)^(5/3) * (f/100)^(2/3) * (500/D)"""
    Mc = chirp_mass(m1_msun, m2_msun)
    # Haptic constant
    h0 = 1e-21
    h = h0 * (Mc / 30)**(5/3) * (freq_hz / 100)**(2/3) * (500 / distance_mpc)
    return h, Mc

print("=== GW150914 (LIGO first detection, 2015) ===")
m1, m2, f, D = 36, 29, 100, 410  # Msun, Msun, Hz, Mpc
h, Mc = gw_strain(m1, m2, f, D)
print(f"  m1 = {m1} Msun, m2 = {m2} Msun")
print(f"  Chirp mass Mc = {Mc:.1f} Msun")
print(f"  Frequency f = {f} Hz (peak)")
print(f"  Distance D = {D} Mpc")
print(f"  Strain h = {h:.2e}")
print(f"  -> LIGO measured length change ~1e-18 m in 4 km arm = 1e-21 of arm length")
print(f"  -> about 1/10000 of a proton width!")

print()
print("=== Notable GW events (LIGO O1-O3, 2015-2020) ===")
events = [
    ("GW150914", 36, 29, 410, 100, "First detection (2015)"),
    ("GW170817", 1.46, 1.27, 40, 100, "Neutron star merger (2017) - multimessenger"),
    ("GW190521", 85, 66, 5300, 100, "IMBH formation (2019)"),
    ("GW190412", 30, 8, 2800, 100, "Asymmetric mass + higher harmonics"),
    ("GW190814", 23, 2.6, 2400, 100, "2.6 Msun object - NS or BH?"),
]
print(f"  {'Event':<12} {'m1':>5} {'m2':>5} {'D(Mpc)':>8} {'f(Hz)':>6} {'h_strain':>12}  Notes")
print(f"  {'-'*12} {'-'*5} {'-'*5} {'-'*8} {'-'*6} {'-'*12}  {'-'*40}")
for name, m1, m2, D, f, note in events:
    h, Mc = gw_strain(m1, m2, f, D)
    print(f"  {name:<12} {m1:>5} {m2:>5} {D:>8} {f:>6} {h:>12.2e}  {note}")

print()
print("=== LIGO O4 (May 2023 - present) ===")
print(f"  Sensitivity ~3x O3, ~70 new BBH candidates (as of late 2024)")
print(f"  Range: ~550 Mpc for BNS, ~2.5 Gpc for BBH")

print()
print("=== TianQin (China, 2030+) + LISA (ESA/NASA, 2035+) ===")
print(f"  Space-based, mHz band (not LIGO Hz band)")
print(f"  Detects supermassive BH mergers (10^6-10^9 Msun)")
print(f"  TianQin: 3 sats in geocentric orbit, 170,000 km separation")
print(f"  LISA: 3 sats in heliocentric orbit, 2.5 million km separation")
print(f"  Both will see ~10,000 sources over mission lifetime")'''

CODE_BLOCKS["DARK_MATTER_CODE"] = r'''import math

# === Dark matter direct detection — WIMP-nucleon cross section ===
# XENON1T/XENONnT/LZ/PandaX-4T liquid xenon TPCs

rho_dm = 0.3  # GeV/cm^3 local dark matter density
v_earth = 220  # km/s Earth's velocity through galaxy
m_chi = 50  # GeV WIMP mass (parameter being searched)
m_xenon = 131  # GeV atomic mass of xenon

def expected_events(sigma_SI_cm2, exposure_ton_year):
    """Expected events = (rho_dm/m_chi) * sigma * v * N_target * exposure"""
    # Simplified - real calculation uses form factors and velocity distribution
    N_A = 6.022e23
    n_xenon_per_kg = N_A / (m_xenon * 1.66e-27)  # atoms per kg
    n_xenon_per_ton = n_xenon_per_kg * 1000  # per ton
    v_cm = v_earth * 1e5  # cm/s
    sigma_cm2 = sigma_SI_cm2
    rho_cgs = rho_dm * 1e-3 * (1.783e-24)  # convert GeV/cm^3 to g/cm^3
    flux = rho_cgs / (m_chi * 1.783e-24) * v_cm  # particles/cm^2/s
    rate_per_kg = flux * sigma_cm2 * n_xenon_per_kg  # events/kg/s
    events = rate_per_kg * exposure_ton_year * 1000 * 3.15e7  # ton*year -> kg*s
    return events

print("=== Dark matter experiments status (2024-2025) ===")
experiments = [
    ("LZ (US)", 5.5, 5.5e-48, "2024 result, 60 live-days"),
    ("XENONnT (Italy)", 8.6, 6.0e-48, "2024 result"),
    ("PandaX-4T (China)", 4.0, 5.0e-48, "2024 result, Jinping lab"),
    ("DarkSide-50 (Italy)", 0.05, 1.0e-40, "Argon TPC, smaller"),
    ("DEAP-3600 (Canada)", 0.36, 1.0e-46, "Argon"),
]
print(f"  {'Experiment':<22} {'Exposure':>10} {'Best sigma_SI (cm^2)':>22}  Status")
print(f"  {'-'*22} {'-'*10} {'-'*22}  {'-'*40}")
for name, exp, sigma, note in experiments:
    events = expected_events(sigma, exp)
    print(f"  {name:<22} {exp:>6.2f} t·yr {sigma:>22.2e}  {note}  ({events:.4f} expected events)")

print()
print("=== WIMP-nucleon cross section upper limits (90% CL) ===")
print(f"  2007: ~1e-7 cm^2 (XENON10)")
print(f"  2018: ~1e-47 cm^2 (XENON1T)")
print(f"  2024: ~5e-48 cm^2 (LZ, XENONnT, PandaX-4T) - 100x improvement in 17 years")
print(f"  -> No WIMPs found yet - they are rarer than 1 per 5.5 ton-years of xenon")
print(f"  -> Lee-Weinberg lower bound: sigma_SI > 1e-49 cm^2 would be observable")
print(f"  -> Next: XLZD (xenon) + DARWIN (multi-target), 50 t·yr exposure")

print()
print("=== Dark matter alternative: axions (ADMX + CAST) ===")
print(f"  Axion: Pseudoscalar particle, solves strong CP problem")
print(f"  Predicted mass: 1e-6 - 1e-2 eV (QCD axion window)")
print(f"  ADMX-HF (US): 460-890 MHz, 2024 results exclude 2.66-2.81 neV axions")
print(f"  CAST (CERN): solar axion search, 2024 results")
print(f"  CASPEr (China): NMR-based search, 2024 result")

print()
print("=== Dark matter alternative: hidden sector / dark photons ===")
print(f"  Light dark matter (MeV-GeV): SENSEI, DAMIC, SuperCDMS")
print(f"  Dark photon search: A' -> invisible (missing energy)")
print(f"  LHC: Monojet + MET search, 2024 update")'''

CODE_BLOCKS["FAST_FRB_CODE"] = r'''import math

# === FAST radio telescope — FRB (fast radio burst) detection ===
# FAST: Five-hundred-meter Aperture Spherical radio Telescope (China)

D_fast = 500  # m aperture diameter
D_arecibo = 305  # m Arecibo (Puerto Rico, decommissioned 2020)

# Sensitivity proportional to D^2 (collecting area)
A_fast = math.pi * (D_fast / 2)**2
A_arecibo = math.pi * (D_arecibo / 2)**2

print("=== FAST vs Arecibo (decommissioned Dec 2020) ===")
print(f"  FAST aperture: {D_fast} m diameter, area = {A_fast:.0f} m^2")
print(f"  Arecibo aperture: {D_arecibo} m diameter, area = {A_arecibo:.0f} m^2")
print(f"  FAST collecting area: {A_fast / A_arecibo:.2f}x Arecibo")
print(f"  FAST sky coverage: -14 deg to +66 deg declination (Arecibo: -1 to +38)")
print(f"  FAST first light: 2016, full operation: 2020+")
print(f"  Located in Guizhou, China (Pingtang County)")

print()
print("=== FRB (Fast Radio Burst) basic properties ===")
# Dispersion measure: DM = integral n_e dl, in pc/cm^3
# Delay: t_delay = 4.15e3 ms * DM * (f_ref^-2 - f_obs^-2)
print(f"  FRB duration: ~1 ms to ~30 ms")
print(f"  Energy released: ~10^38 - 10^41 erg (in radio band)")
print(f"  Distance: typically z > 0.1, host galaxies confirmed for ~20 FRBs")
print()
print("=== Dispersion measure (DM) and redshift ===")
print(f"  DM ~ 1000 pc/cm^3 -> z ~ 1")
print(f"  DM ~ 1200 pc/cm^3 -> z ~ 1.5")
print(f"  DM ~ 3000 pc/cm^3 -> z ~ 3 (highest known)")
print()

# Delay between 2 frequencies (ms)
def dm_delay_ms(dm, f1_ghz, f2_ghz):
    """DM = pc/cm^3, f in GHz. Returns delay in ms."""
    return 4.15e3 * dm * (1 / f1_ghz**2 - 1 / f2_ghz**2)

print("=== FRB DM-induced delay (ms) for 1.0 GHz vs 1.5 GHz ===")
for dm in [100, 500, 1000, 1500, 3000]:
    delay = dm_delay_ms(dm, 1.0, 1.5)
    print(f"  DM = {dm:>5} pc/cm^3 -> delay = {delay:.1f} ms")

print()
print("=== FAST FRB discoveries (2024 update) ===")
print(f"  FAST detected 1000+ FRBs (2024), 5x all other telescopes combined")
print(f"  Repeaters: ~20 confirmed out of ~1000 sources (2%)")
print(f"  FRB 20190520B: persistent radio counterpart discovered (FAST 2022)")
print(f"  FRB 20201124A: complicated polarization angle swings (FAST 2022)")
print(f"  FRB 20240106: fastest repeating FRB, 1.5 ms (FAST 2024)")
print()
print("=== FRB origin theories (contention) ===")
print(f"  1. Magnetar flares (SGR 1935+2154 in 2020 confirmed link)")
print(f"  2. Merging neutron stars / black holes")
print(f"  3. Cosmic strings / primordial black holes")
print(f"  4. Exotic: warp drives, alien signals (mostly ruled out)")
print(f"  Best model: magnetar + B-field reconfiguration (Bochenek+2020)")'''

# ====================== FINTECH SHORTS ======================

CODE_BLOCKS["BLACK_SCHOLES_CODE"] = r'''import math

# === Black-Scholes-Merton option pricing (Black 1973, Nobel 1997) ===
# 50th anniversary in 2023

def norm_cdf(x):
    """Abramowitz & Stegun approximation of standard normal CDF."""
    if x < 0:
        return 1 - norm_cdf(-x)
    a1, a2, a3, a4, a5 = 0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429
    p = 0.3275911
    t = 1.0 / (1.0 + p * x)
    y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t
    return y

def norm_pdf(x):
    return math.exp(-x * x / 2) / math.sqrt(2 * math.pi)

def black_scholes(S, K, r, sigma, T, type='call'):
    """Black-Scholes option price + 5 Greeks."""
    d1 = (math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)

    if type == 'call':
        price = S * norm_cdf(d1) - K * math.exp(-r * T) * norm_cdf(d2)
        delta = norm_cdf(d1)
    else:
        price = K * math.exp(-r * T) * norm_cdf(-d2) - S * norm_cdf(-d1)
        delta = norm_cdf(d1) - 1

    gamma = norm_pdf(d1) / (S * sigma * math.sqrt(T))
    vega = S * norm_pdf(d1) * math.sqrt(T) / 100  # per 1% vol change
    if type == 'call':
        theta = (-(S * norm_pdf(d1) * sigma) / (2 * math.sqrt(T)) - r * K * math.exp(-r * T) * norm_cdf(d2)) / 365
    else:
        theta = (-(S * norm_pdf(d1) * sigma) / (2 * math.sqrt(T)) + r * K * math.exp(-r * T) * norm_cdf(-d2)) / 365
    rho = (K * T * math.exp(-r * T) * (norm_cdf(d2) if type == 'call' else -norm_cdf(-d2))) / 100

    return {'price': price, 'delta': delta, 'gamma': gamma, 'vega': vega, 'theta': theta, 'rho': rho}

print("=== Black-Scholes-Merton (50th anniversary 2023) ===")
print(f"  S=100, K=100, r=5%, sigma=20%, T=1 year")
print()

call = black_scholes(100, 100, 0.05, 0.20, 1, 'call')
put = black_scholes(100, 100, 0.05, 0.20, 1, 'put')

print(f"  European Call: C = S*N(d1) - K*exp(-rT)*N(d2) = ${call['price']:.4f}")
print(f"  European Put:  P = K*exp(-rT)*N(-d2) - S*N(-d1) = ${put['price']:.4f}")
print(f"  Put-Call Parity: C - P = S - K*exp(-rT) = ${call['price'] - put['price']:.4f}")
print(f"    Verifies: ${100 - 100 * math.exp(-0.05):.4f}  (matches)")

print()
print(f"  Greeks (call):")
print(f"    Delta = {call['delta']:.4f} (hedge ratio, 1 share per {1/call['delta']:.2f} options)")
print(f"    Gamma = {call['gamma']:.4f} (rate of delta change)")
print(f"    Vega  = {call['vega']:.4f} (per 1% vol change)")
print(f"    Theta = {call['theta']:.4f} (per day time decay)")
print(f"    Rho   = {call['rho']:.4f} (per 1% rate change)")

print()
print("=== BS assumptions (1973) — all empirically FALSE ===")
print(f"  - Constant volatility (volatility smiles show IV varies by strike)")
print(f"  - Lognormal returns (real returns have fat tails, kurtosis 5-10)")
print(f"  - No jumps (1987 crash -7% in one day; 2020 COVID -34% in 30 days)")
print(f"  - Continuous trading (market closes, limit moves)")
print(f"  - Risk-free rate known (it's stochastic)")
print()
print("=== Modern extensions ===")
print(f"  - Dupire local vol (1994): sigma(S, t) - calibrates to surface")
print(f"  - Heston stochastic vol (1993): sigma follows CIR process")
print(f"  - Merton jump-diffusion (1976): compound Poisson jumps")
print(f"  - SABR (2002): stochastic alpha beta rho - LIBOR market")
print(f"  - Bayer rough vol (2016): Hurst H ~ 0.1, fractional Brownian")
print(f"  - Deep hedging (Buehler 2019+): NN learns pricing+hedging")'''

CODE_BLOCKS["MONTE_CARLO_VAR_CODE"] = r'''import math
import random

# === Monte Carlo VaR / CVaR (Expected Shortfall) ===
# Basel III -> IV transition (2025+): 99% VaR -> 97.5% CVaR

random.seed(42)

def gaussian():
    """Box-Muller standard normal."""
    u1 = random.random()
    u2 = random.random()
    return math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)

def gbm_paths(S0, mu, sigma, T, N_paths):
    """Generate Geometric Brownian Motion paths: S_T = S0 * exp((mu - sigma^2/2)T + sigma*sqrt(T)*Z)"""
    paths = []
    sqrt_T_sigma = sigma * math.sqrt(T)
    drift = (mu - sigma * sigma / 2) * T
    for _ in range(N_paths):
        Z = gaussian()
        S_T = S0 * math.exp(drift + sqrt_T_sigma * Z)
        paths.append(S_T - S0)  # P&L
    return paths

print("=== Monte Carlo VaR + CVaR simulation ===")
S0 = 100
mu = 0.0005  # daily drift (10% annual)
sigma = 0.015  # daily vol (24% annual)
T = 1  # 1-day horizon
N = 10000

paths = gbm_paths(S0, mu, sigma, T, N)
paths.sort()  # ascending P&L

# VaR = -quantile_{1-alpha}(P&L)  -> loss not exceeded with prob alpha
# CVaR (ES) = -E[P&L | P&L < -VaR]  -> average of tail beyond VaR

for alpha in [0.90, 0.95, 0.99, 0.997]:
    var_idx = int((1 - alpha) * N)
    var_value = -paths[var_idx]
    # CVaR: mean of losses worse than VaR
    tail = paths[:var_idx]
    cvar_value = -sum(tail) / len(tail) if tail else 0
    print(f"  alpha={alpha:.3f}: VaR = ${var_value:.3f}, CVaR = ${cvar_value:.3f}, ratio = {cvar_value / var_value:.2f}")

print()
print("=== Basel III vs IV (contention) ===")
print(f"  Basel III (current): 99% VaR over 10-day horizon, 1-year stress period")
print(f"  Basel IV (2025+): 97.5% CVaR over 10-day, calibrated to stressed period")
print(f"  Implication: banks must hold MORE capital (~30-40% increase)")
print(f"  Rationale: VaR is just a threshold - doesn't tell you how bad the tail is")
print(f"  CVaR = average of tail - captures severity (2008 lesson)")
print()
print("=== Fat tail example (2008 GFC) ===")
print(f"  Gaussian assumption: S&P 500 daily loss > 5% occurs ~1 in 14000 days")
print(f"  Reality: 7 such events in 2008 alone (would be 1 in 10000000+ under Gaussian)")
print(f"  -> kurtosis 5-10x normal distribution -> VaR severely underestimates tail risk")
print()
print("=== Modern risk models (post-2008) ===")
print(f"  - Filtered historical simulation (GARCH + bootstrap)")
print(f"  - Extreme Value Theory (EVT) - peaks-over-threshold (Pickands 1975)")
print(f"  - Copula-based (correlated defaults in structured credit)")
print(f"  - Stressed VaR (Basel III) - calibrate to worst 1-year window")
print(f"  - Machine learning (Berg 2022+) - LSTM for tail dependence")'''

CODE_BLOCKS["GNN_FRAUD_CODE"] = r'''import math
import random

random.seed(42)

# === GNN fraud detection — GraphSAGE message passing ===

class GraphSAGE:
    """Simplified GraphSAGE: h_v^(l+1) = sigma(W * AGG({h_u : u in N(v)} || h_v))"""
    def __init__(self, in_dim, hidden_dim, out_dim):
        # Random weight matrices (in production: trained via backprop)
        self.W1 = [[random.gauss(0, 0.1) for _ in range(2 * in_dim)] for _ in range(hidden_dim)]
        self.W2 = [[random.gauss(0, 0.1) for _ in range(hidden_dim)] for _ in range(out_dim)]

    def aggregate(self, neighbors):
        """Mean aggregation."""
        if not neighbors:
            return [0.0] * len(self.W1[0])
        return [sum(n[i] for n in neighbors) / len(neighbors) for i in range(len(neighbors[0]))]

    def forward(self, node_features, adj_list):
        """One layer of message passing."""
        h1 = []
        for v in range(len(node_features)):
            agg = self.aggregate([node_features[u] for u in adj_list[v]])
            concat = node_features[v] + agg  # || concatenation
            h_v = [math.tanh(sum(self.W1[i][j] * concat[j] for j in range(len(concat)))) for i in range(len(self.W1))]
            h1.append(h_v)
        h2 = []
        for v in range(len(node_features)):
            h_v = [math.tanh(sum(self.W2[i][j] * h1[v][j] for j in range(len(h1[v])))) for i in range(len(self.W2))]
            h2.append(h_v)
        return h2

# Synthetic transaction graph: 8 accounts, edges = transactions
# Features per node: [amount_24h, txn_count_24h, distinct_counterparties]
node_features = [
    [50, 5, 3],   # 0: normal account
    [200, 10, 5], # 1: normal
    [4500, 50, 1], # 2: suspicious (high amount, single counterparty)
    [80, 3, 2],   # 3: normal
    [4800, 45, 2], # 4: suspicious (rapid cash-out)
    [50, 2, 1],   # 5: normal
    [4700, 40, 2], # 6: suspicious (smurfing)
    [120, 6, 4],  # 7: normal
]
adj_list = [
    [1, 3],      # 0 -> 1, 3
    [0, 2],      # 1 -> 0, 2
    [1, 4],      # 2 -> 1, 4
    [0, 4],      # 3 -> 0, 4
    [2, 3, 5],   # 4 -> 2, 3, 5
    [4, 6],      # 5 -> 4, 6
    [5, 7],      # 6 -> 5, 7
    [6],         # 7 -> 6
]
truth_labels = [0, 0, 1, 0, 1, 0, 1, 0]  # 1 = suspicious

gnn = GraphSAGE(in_dim=3, hidden_dim=8, out_dim=1)
embeddings = gnn.forward(node_features, adj_list)

print("=== GraphSAGE fraud detection (Hamilton et al. 2017) ===")
print()
print(f"  Graph: 8 accounts, {sum(len(adj) for adj in adj_list)} directed edges")
print(f"  Features per node: [amount_24h, txn_count_24h, distinct_parties]")
print(f"  Truth labels: {truth_labels} (1=suspicious)")
print()
print(f"  {'Node':>4} {'Amount':>8} {'Txns':>5} {'Counterparties':>15} {'Truth':>6} {'GNN_score':>10}")
print(f"  {'-'*4} {'-'*8} {'-'*5} {'-'*15} {'-'*6} {'-'*10}")
for i in range(8):
    f = node_features[i]
    emb = embeddings[i][0]
    pred = 1 if emb > 0.5 else 0  # arbitrary threshold
    print(f"  {i:>4} {f[0]:>8} {f[1]:>5} {f[2]:>15} {truth_labels[i]:>6} {emb:>10.4f}")

print()
print("=== Why GNN beats rule-based + random forest ===")
print(f"  Rule-based: 'amount > $10k -> flag'")
print(f"    -> easy to evade (split into 10 x $1k transactions)")
print(f"  Random forest:")
print(f"    -> per-transaction features (amount, time, merchant)")
print(f"    -> misses the NETWORK pattern: deposit -> rapid transfer -> cash-out")
print(f"  GNN (GraphSAGE / GAT):")
print(f"    -> aggregates neighbor information via message passing")
print(f"    -> catches 'smurfing' (split deposits across many accounts)")
print(f"    -> production: Visa (100M+ txns/day), JPMorgan (~60% fraud alerts)")
print()
print("=== Modern GNN architectures for fraud (2024) ===")
print(f"  - GraphSAGE (2017): mean aggregation")
print(f"  - GAT (2018): attention weights on neighbors")
print(f"  - TGN (Temporal Graph Network, Rossi 2020): txn history over time")
print(f"  - Heterophilic GNN (2022+): fraud nodes look SIMILAR to neighbors")
print(f"  - Federated GNN (2023+): banks collaborate without sharing data")'''

CODE_BLOCKS["HFT_ORDERBOOK_CODE"] = r'''import math
import random

random.seed(42)

# === HFT order book microstructure simulation ===

class OrderBook:
    def __init__(self, mid_price=100.0, spread=0.01, levels=10):
        self.mid = mid_price
        self.spread = spread
        self.levels = levels
        self.bids = []  # [(price, size)]
        self.asks = []
        self.tick_count = 0
        self.history = [mid_price]
        self._init_book()

    def _init_book(self):
        for i in range(self.levels):
            self.bids.append((self.mid - self.spread / 2 - i * 0.01, max(10, 100 - i * 8 + random.gauss(0, 5))))
            self.asks.append((self.mid + self.spread / 2 + i * 0.01, max(10, 100 - i * 8 + random.gauss(0, 5))))

    def step(self):
        """Advance one timestep: simulate order flow + price update."""
        # Brownian motion on mid price (HFT speeds: ms timescale)
        dt = 0.001  # 1 ms
        sigma = 0.0005
        self.mid += sigma * math.sqrt(dt) * random.gauss(0, 1) * 100
        self.history.append(self.mid)
        # Update sizes (some orders fill, some new ones arrive)
        for i in range(self.levels):
            self.bids[i] = (self.mid - self.spread / 2 - i * 0.01, max(10, 100 - i * 8 + random.gauss(0, 5)))
            self.asks[i] = (self.mid + self.spread / 2 + i * 0.01, max(10, 100 - i * 8 + random.gauss(0, 5)))
        self.tick_count += 1

    def spread_pct(self):
        return self.spread / self.mid * 100

    def market_depth(self):
        return sum(p * s for p, s in self.bids[:5]) + sum(p * s for p, s in self.asks[:5])

book = OrderBook(mid_price=100.0, spread=0.01, levels=10)

print("=== HFT order book microstructure (1 ms timestep) ===")
print()
print(f"  Initial state: mid = ${book.mid:.4f}, spread = {book.spread:.4f} ({book.spread_pct():.4f}%)")
print()

print(f"  Top 5 bid levels (price, size):")
for i in range(5):
    print(f"    Bid {i+1}: ${book.bids[i][0]:.4f} x {book.bids[i][1]:.0f}")
print(f"  Top 5 ask levels (price, size):")
for i in range(5):
    print(f"    Ask {i+1}: ${book.asks[i][0]:.4f} x {book.asks[i][1]:.0f}")

print()
print(f"  Market depth (top 5 levels each side): ${book.market_depth():.0f}")

# Run 1000 ms (1 second of trading)
for _ in range(1000):
    book.step()

print()
print(f"  After 1000 ms ({book.tick_count} ticks):")
print(f"    mid price = ${book.mid:.4f} (changed ${(book.mid - 100):.4f})")
print(f"    spread = {book.spread:.4f} ({book.spread_pct():.4f}%)")
print(f"    mid price range over 1 second: ${min(book.history):.4f} - ${max(book.history):.4f} (range {(max(book.history) - min(book.history)) / 100 * 100:.4f}%)")
print(f"    market depth = ${book.market_depth():.0f}")

print()
print("=== HFT economics (contention) ===")
print(f"  Maker rebate: $0.0029/share (US equities, SEC Reg NMS)")
print(f"  Taker fee: $0.0030/share")
print(f"  -> Exchange PAYS makers, charges takers - 'maker-taker' model")
print(f"  Spread capture: ${book.spread:.4f} x {book.bids[0][1]:.0f} = ${book.spread * book.bids[0][1]:.4f} profit per filled order")
print(f"  HFT revenue: ~$2B/year in US equities (TABB Group estimate)")
print()
print("=== PFOF (Payment for Order Flow) debate ===")
print(f"  Robinhood model: 0 commission but sells retail orders to wholesalers")
print(f"  Wholesalers (Citadel, Virtu): pay 0.001-0.002/share for order flow")
print(f"  SEC 2024 rule: tick size 1c -> 0.5c for stocks > $1, open auction for retail")
print(f"  Citadel + Virtu suing SEC: 'rule will harm retail liquidity'")
print(f"  Michael Lewis 'Flash Boys' (2014): accused HFT of front-running retail")
print(f"  Truth: HFT is BOTH liquidity-providing AND rent-seeking (depends on practice)")'''

# ====================== VALIDATE + WRITE ======================

print("Validating code blocks...")
for name, code in CODE_BLOCKS.items():
    try:
        compile(code, name + ".py", "exec")
        print(f"  OK  {name}")
    except SyntaxError as e:
        print(f"  FAIL {name}: {e}")
        raise

# Write to /tmp for inspection
with open("/tmp/space_fintech_shorts_code.txt", "w") as f:
    for name, code in CODE_BLOCKS.items():
        safe = code.replace("`", "\\`").replace("${", "\\${")
        f.write(f"const {name} = `{safe}`;\n\n")

print(f"\nWrote {len(CODE_BLOCKS)} code constants to /tmp/space_fintech_shorts_code.txt")
