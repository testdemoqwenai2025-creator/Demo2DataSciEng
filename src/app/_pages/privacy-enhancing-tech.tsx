"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { NextSteps } from "../_components/next-steps";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { PRIVACY_SCIENCE_EXAMPLES } from "../_components/_dataset_examples14";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Cpu, Database, Boxes, Activity, Sparkles, History, Atom,
  FileText, TrendingUp, Server, Brain, Zap, ShieldCheck, Lock,
} from "lucide-react";

const KPIS = [
  { label: "Origin", value: "Dwork 2006 (ε-DP)", hint: "Cynthia Dwork's 2006 paper formalised ε-differential privacy: Pr[M(D) ∈ S] ≤ e^ε × Pr[M(D') ∈ S] for any two databases differing in 1 record. Laplace + Gaussian mechanisms, composition theorems", deltaTone: "flat" as const },
  { label: "Federated Learning", value: "McMahan 2017 (FedAvg)", hint: "FedAvg: w_{t+1} = Σ_k (n_k/n) × w_k^t — weighted average of client models. Patient data never leaves the hospital (HIPAA). FedProx adds a proximal term for heterogeneous clients", deltaTone: "up" as const },
  { label: "Homomorphic Encryption", value: "Paillier + BFV/BGV + CKKS", hint: "Paillier (additive): Enc(a) ⊕ Enc(b) = Enc(a+b). BFV/BGV (fully homomorphic, bootstrapping). CKKS (approximate arithmetic — best for ML on encrypted data)", deltaTone: "flat" as const },
  { label: "Mechanism", value: "Laplace(Δf/ε) + Gaussian(σ√(2ln(1.25/δ)))", hint: "Laplace mechanism: M(x) = f(x) + Lap(Δf/ε) where Δf = sensitivity. Gaussian: M(x) = f(x) + N(0,σ²) where σ ≥ √(2ln(1.25/δ)) × Δf/ε", deltaTone: "up" as const },
];

// ============================================================
// Math constants — ε-DP, Laplace/Gaussian, composition, HE, FedAvg
// ============================================================

const MATH_SECTION = `# ============================================================
# Privacy-Enhancing Tech Math Foundations — ε-DP, Laplace, Gaussian, Composition, HE, FedAvg
# ============================================================

import math
import random
from collections import defaultdict

# --- 1. ε-Differential Privacy ---
# For all D, D' differing in 1 record, for all S ⊆ Range(M):
#   Pr[M(D) ∈ S] ≤ e^ε × Pr[M(D') ∈ S]
#
# Interpretation: the addition/removal of 1 record changes the output
# distribution by at most a factor of e^ε.
# ε = 0: perfect privacy (no information) -> useless
# ε = ∞: no privacy
# ε in [0.1, 1]: strong privacy (industry standard: ε=1.0)
# ε in [1, 10]: moderate (Apple uses ε=4 for some features)
# ε > 10: weak (Census Bureau historically used ε=19.61)

def check_epsilon_dp(D, D_prime, mechanism, n_trials=100000, epsilon=1.0):
    """Empirically check ε-DP for a given mechanism on D vs D'."""
    S_D = defaultdict(int)
    S_Dp = defaultdict(int)
    for _ in range(n_trials):
        out_D = mechanism(D)
        out_Dp = mechanism(D_prime)
        S_D[round(out_D, 4)] += 1
        S_Dp[round(out_Dp, 4)] += 1

    # For ε-DP: max ratio P(D)/P(D') for any S should be <= e^ε
    max_ratio = 1.0
    for s in set(S_D.keys()) | set(S_Dp.keys()):
        p_D = S_D[s] / n_trials + 1e-10  # smoothing
        p_Dp = S_Dp[s] / n_trials + 1e-10
        ratio = p_D / p_Dp
        if ratio > max_ratio:
            max_ratio = ratio
    return max_ratio, math.exp(epsilon)

# Simple counting query: f(D) = count of 1s in D
def count_query(D): return sum(D)

# Sensitivity: max change from adding/removing 1 record
# For count: Δf = 1 (adding 1 record changes count by 1)
def laplace_mech(D, f, epsilon, sensitivity):
    return f(D) + random.laplace(0, sensitivity / epsilon)

random.seed(42)
D = [1, 1, 0, 1, 0, 1, 1, 0, 1, 0]  # 6 ones, 4 zeros
D_prime = D[:-1]  # remove last record (D' differs in 1 record)
epsilon = 1.0
sensitivity = 1  # Δf for count query

max_ratio, e_eps = check_epsilon_dp(D, D_prime,
    lambda d: laplace_mech(d, count_query, epsilon, sensitivity),
    epsilon=epsilon)
print("=== ε-Differential Privacy ===")
print(f"  Bound: Pr[M(D)∈S] / Pr[M(D')∈S] <= e^eps = {e_eps:.4f}")
print(f"  Empirical max ratio: {max_ratio:.4f} (should be <= e^eps)")
print(f"  Mechanism: Laplace(0, Δf/ε) = Laplace(0, {sensitivity}/{epsilon})")
print()

# --- 2. Laplace Mechanism ---
# M(x) = f(x) + Lap(Δf/ε)
# Where Lap(b) = Laplace distribution with scale b (variance 2b^2)
#   PDF: p(y) = (1/2b) exp(-|y|/b)
#   Mean 0, variance 2b^2
# Δf = sensitivity = max over D, D' differing in 1 record of |f(D) - f(D')|

def laplace_mech_explicit(f_D, sensitivity, epsilon):
    """Compute Laplace mechanism: M(x) = f(x) + Lap(Δf/ε)."""
    # Sample from Laplace(0, b) where b = Δf / ε
    # Inverse CDF: y = -b * sign(u - 0.5) * ln(1 - 2|u - 0.5|) for u in (0, 1)
    u = random.random()
    b = sensitivity / epsilon
    sign = 1 if u >= 0.5 else -1
    noise = -sign * b * math.log(1 - 2 * abs(u - 0.5))
    return f_D + noise

# Histogram release: per-bin count query, sensitivity = 1
print("=== Laplace Mechanism ===")
print("  M(x) = f(x) + Lap(Δf/ε)")
print("  Laplace PDF: p(y) = (1/2b) exp(-|y|/b), mean=0, var=2b^2")
print("  Sensitivity Δf for count query: 1")
print()
print("  Histogram release (per-bin, ε=1.0):")
for bin_name, true_count in [("A", 100), ("B", 200), ("C", 50)]:
    noisy = laplace_mech_explicit(true_count, 1, 1.0)
    rel_err = abs(noisy - true_count) / true_count * 100
    print(f"    bin {bin_name}: true={true_count}, DP={noisy:.1f}, err={rel_err:.1f}%")
print()

# --- 3. Gaussian Mechanism (for (ε, δ)-DP) ---
# M(x) = f(x) + N(0, σ^2)
# where σ >= sqrt(2 ln(1.25/δ)) × Δf / ε
# (ε, δ)-DP: Pr[M(D)∈S] <= e^ε × Pr[M(D')∈S] + δ
# δ = probability of catastrophic failure (typical: 1e-5 to 1e-10)

def gaussian_sigma(sensitivity, epsilon, delta):
    """Compute min sigma for (ε, δ)-DP Gaussian mechanism."""
    return math.sqrt(2 * math.log(1.25 / delta)) * sensitivity / epsilon

print("=== Gaussian Mechanism ===")
print("  M(x) = f(x) + N(0, σ^2) where σ >= sqrt(2 ln(1.25/δ)) × Δf / ε")
for delta in [1e-5, 1e-7, 1e-10]:
    sigma = gaussian_sigma(1, 1.0, delta)
    print(f"    δ={delta:.0e}, ε=1.0, Δf=1 -> σ_min = {sigma:.4f}")
print("  Lower δ = stronger privacy = larger σ = more noise.")
print()

# --- 4. Composition Theorem (Sequential) ---
# If we run k mechanisms each with (ε_1, δ_1), ..., (ε_k, δ_k),
# the overall composition is (sum(ε_i), sum(δ_i)).
# Sequential composition: ε_total = ε_1 + ε_2 + ... + ε_k
# Parallel composition: ε_total = max(ε_i) (only applies to disjoint datasets)

print("=== Composition Theorems ===")
print("  Sequential: k queries with (ε_1, ..., ε_k) -> overall ε = Σ ε_i")
k = 100
eps_each = 0.1
print(f"  Example: k={k} queries, each ε={eps_each} -> ε_total = {k * eps_each:.1f}")
print("  -> To stay under ε_total=1.0 across 100 queries, set each ε=0.01 (much noisier).")
print()
print("  Parallel: k queries on disjoint subsets -> ε_total = max(ε_i)")
print("  -> 100 disjoint histogram bins, each ε=1.0 -> ε_total = 1.0 (not 100).")
print()

# --- 5. Homomorphic Encryption ---
# Additively homomorphic (Paillier): Enc(a) ⊕ Enc(b) = Enc(a+b)
# Fully homomorphic (BFV/BGV, Gentry 2009): Enc(a) ⊕ Enc(b) = Enc(a+b), Enc(a) ⊗ Enc(b) = Enc(a×b)
# CKKS (2017): approximate arithmetic — best for ML on encrypted data

print("=== Homomorphic Encryption ===")
print("  Paillier (additive):  Enc(a) ⊕ Enc(b) = Enc(a + b)")
print("  Paillier (scalar mul): Enc(a) ⊗ b     = Enc(a × b)  (b plaintext)")
print("  BFV/BGV (FHE):        Enc(a) ⊕ Enc(b) = Enc(a + b)")
print("                        Enc(a) ⊗ Enc(b) = Enc(a × b)")
print("  CKKS (approximate):   Enc(a) ⊕ Enc(b) = Enc(a + b)  (with bounded error)")
print("                        Enc(a) ⊗ Enc(b) = Enc(a × b)  (with bounded error)")
print()
print("  Application: aggregate patient statistics across hospitals without")
print("  revealing any individual hospital's data (HE-enabled secure aggregation).")

# --- 6. FedAvg ---
# w_{t+1} = Σ_k (n_k / n) × w_k^t
# Where n_k = number of samples at client k, n = total samples
# Each client trains locally; central server does weighted average

print()
print("=== FedAvg ===")
print("  w_{t+1} = Σ_k (n_k/n) × w_k^t  (weighted average of client models)")
hospitals = [("H1", 3000), ("H2", 2500), ("H3", 2000), ("H4", 1500), ("H5", 1000)]
n_total = sum(h[1] for h in hospitals)
print(f"  5 hospitals, n_total = {n_total}")
for h_id, n_k in hospitals:
    print(f"    {h_id}: n_k={n_k}, weight={n_k/n_total:.4f}")`;

// ============================================================
// Pyodide demo — DP + FedAvg simulation
// ============================================================

const PYODIDE_DEMO = `# ============================================================
# Privacy-Enhancing Tech Simulation — ε-DP + FedAvg + HE (Pyodide)
# All synthetic — only math + random
# ============================================================

import math
import random
from collections import defaultdict

# ============================================================
# Part 1: GWAS Differential Privacy (Laplace mechanism)
# ============================================================

print("=" * 60)
print("Part 1: GWAS Differential Privacy (Laplace Mechanism)")
print("=" * 60)
print()

def laplace_mechanism(true_value, sensitivity, epsilon):
    """M(x) = f(x) + Lap(Δf/ε)."""
    b = sensitivity / epsilon
    # Sample from Laplace(0, b) via inverse CDF
    u = random.random()
    sign = 1 if u >= 0.5 else -1
    noise = -sign * b * math.log(1 - 2 * abs(u - 0.5))
    return true_value + noise

# 10 SNPs with genome-wide-significant p-values (p < 5e-8)
random.seed(42)
snps = [(f"rs{i+1}", 10 ** random.uniform(-9, -5)) for i in range(10)]

# Sensitivity: Δf = 1/sqrt(n) — max p-value change from 1 patient's removal
n_patients = 10000
sensitivity = 1.0 / math.sqrt(n_patients)
print(f"GWAS: {len(snps)} SNPs · n={n_patients} patients · sensitivity Δf = {sensitivity:.6f}")
print()

# Release DP versions at various ε
print(f"{'SNP':<8} | {'true p':>10} | {'ε=1.0':>10} | {'ε=0.1':>10} | {'ε=10.0':>10}")
print("-" * 60)
for snp_id, true_p in snps:
    p_dp_1 = laplace_mechanism(true_p, sensitivity, 1.0)
    p_dp_01 = laplace_mechanism(true_p, sensitivity, 0.1)
    p_dp_10 = laplace_mechanism(true_p, sensitivity, 10.0)
    print(f"{snp_id:<8} | {true_p:>10.2e} | {p_dp_1:>10.2e} | {p_dp_01:>10.2e} | {p_dp_10:>10.2e}")
print()
print("Trade-off: lower ε = more noise (more privacy) but less utility.")
print("           higher ε = less noise (less privacy) but better signal.")
print()
print("Privacy guarantee (ε=1.0): adding any 1 patient to the study")
print("changes the output distribution by at most e^1 = 2.72x.")
print("=> An attacker cannot infer whether any specific patient participated.")
print()

# ============================================================
# Part 2: Federated Learning (FedAvg)
# ============================================================

print("=" * 60)
print("Part 2: Federated Learning (FedAvg) — 5 Hospitals")
print("=" * 60)
print()

hospitals = [
    ("Mayo Clinic", 3000),
    ("Cleveland Clinic", 2500),
    ("Johns Hopkins", 2000),
    ("Stanford Health", 1500),
    ("UCSF Medical", 1000),
]
n_total = sum(h[1] for h in hospitals)
print(f"5 hospitals · {n_total} total patients")
print(f"Patient data NEVER leaves the hospital (HIPAA compliant)")
print()
print(f"{'Hospital':<20} | {'Patients':>9} | {'Weight (n_k/n)':>14}")
print("-" * 50)
for name, n_k in hospitals:
    w = n_k / n_total
    print(f"{name:<20} | {n_k:>9,} | {w:>14.4f}")
print()

# Simulate 10 rounds of FedAvg with 10-dim weights
print("FedAvg rounds: w_{{t+1}} = Σ_k (n_k/n) × w_k^t")
print()
global_w = [0.0] * 10  # initial
for round_num in range(10):
    client_weights = []
    for name, n_k in hospitals:
        # Each hospital trains locally (weights drift slightly)
        local_w = [global_w[i] + random.uniform(-0.05, 0.05) for i in range(10)]
        client_weights.append((n_k, local_w))

    # Weighted average: w_{t+1} = Σ_k (n_k/n) × w_k^t
    new_global = [0.0] * 10
    for n_k, cw in client_weights:
        weight = n_k / n_total
        for i in range(10):
            new_global[i] += weight * cw[i]

    drift = math.sqrt(sum((new_global[i] - global_w[i]) ** 2 for i in range(10)))
    global_w = new_global
    if round_num < 3 or round_num == 9:
        print(f"  Round {round_num+1}: drift={drift:.4f}, w[0:3]={[round(x,4) for x in global_w[:3]]}")
print()
print(f"Final weights: {[round(w, 4) for w in global_w]}")
print()
print("Privacy: data stays local. Gradients could leak info -> add DP to gradients")
print("  (DP-FedAvg: clip gradients + add Gaussian noise on each client).")
print()

# ============================================================
# Part 3: Homomorphic Encryption (simulated)
# ============================================================

print("=" * 60)
print("Part 3: Homomorphic Encryption (Simulated)")
print("=" * 60)
print()

# Simulate additive HE (Paillier-style)
# Enc(a) ⊕ Enc(b) = Enc(a + b)
# Enc(a) ⊗ c = Enc(a * c) for plaintext c

def fake_encrypt(value, key):
    """Pretend encryption — for demo only (NOT real crypto)."""
    return value + key  # toy: real Paillier uses RSA-like modulus

def fake_decrypt(ciphertext, key):
    return ciphertext - key

key = 42  # fake key

# Hospital 1 has 3180 patients with condition X
# Hospital 2 has 2470 patients with condition X
# Both encrypt their counts; central aggregator sums them without decrypting
h1_count = 3180
h2_count = 2470

h1_enc = fake_encrypt(h1_count, key)
h2_enc = fake_encrypt(h2_count, key)

# Secure aggregation: aggregator adds encrypted values without knowing individual counts
aggregated_enc = h1_enc + h2_enc  # = Enc(h1) + Enc(h2) = Enc(h1 + h2)
total = fake_decrypt(aggregated_enc, key)

print(f"Hospital 1: count = {h1_count} (encrypted = {h1_enc})")
print(f"Hospital 2: count = {h2_count} (encrypted = {h2_enc})")
print(f"Aggregator sums ciphertexts: {h1_enc} + {h2_enc} = {aggregated_enc}")
print(f"Decrypt at the end: {total} (= {h1_count} + {h2_count})")
print()
print("Privacy: aggregator learns ONLY the total ({total}), not individual hospital counts.")
print("Real Paillier uses N = p*q (RSA modulus) — much stronger than this demo.")
print()
print("FHE (BFV/BGV, CKKS) extends to multiplication:")
print("  Enc(a) ⊗ Enc(b) = Enc(a × b) -> enables encrypted ML inference/training")`;

// ============================================================
// Privacy-Enhancing Tech architecture diagram
// ============================================================

function PrivacyArchitectureDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("dp");
  const nodes = {
    "dp": { label: "Differential Privacy", desc: "Laplace(Δf/ε) + Gaussian(σ√(2ln(1.25/δ))) mechanisms. ε-DP: Pr[M(D)∈S] ≤ e^ε × Pr[M(D')∈S]. Composition: k queries → ε_total = Σεᵢ.", level: 0 },
    "fl": { label: "Federated Learning", desc: "FedAvg: w_{t+1} = Σ_k (n_k/n) × w_k^t. Data stays local (HIPAA); only model weights shared. FedProx adds proximal term for heterogeneous clients.", level: 1 },
    "he": { label: "Homomorphic Encryption", desc: "Paillier (additive): Enc(a) ⊕ Enc(b) = Enc(a+b). BFV/BGV (fully homomorphic, bootstrapping). CKKS (approximate arithmetic, best for ML).", level: 2 },
    "mpc": { label: "Secure Multi-party (SMPC)", desc: "n parties compute f(x_1, ..., x_n) without revealing individual x_i. Yao's garbled circuits, GMW protocol, secret sharing (Shamir, BGW).", level: 3 },
    "tee": { label: "Trusted Execution Env", desc: "Intel SGX, AMD SEV, ARM TrustZone. Hardware-encrypted enclaves — code + data isolated from host. Lower perf overhead, less formal privacy.", level: 4 },
  };
  const edges = [
    ["dp", "fl"],
    ["fl", "he"],
    ["he", "mpc"],
    ["mpc", "tee"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "dp": { x: 80, y: 50 },
    "fl": { x: 200, y: 50 },
    "he": { x: 320, y: 50 },
    "mpc": { x: 260, y: 130 },
    "tee": { x: 140, y: 130 },
  };
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-primary" />
          Privacy-Enhancing Tech — DP → Federated Learning → HE → SMPC → TEE
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 400 200" className="w-full h-auto">
          {edges.map(([from, to], i) => {
            const a = positions[from]; const b = positions[to];
            return (
              <line key={i} x1={a.x} y1={a.y + 15} x2={b.x} y2={b.y - 15}
                stroke="var(--border)" strokeWidth="0.8" markerEnd="url(#priv-arrow)" />
            );
          })}
          {Object.entries(positions).map(([id, pos]) => {
            const isActive = activeNode === id;
            const node = nodes[id as keyof typeof nodes];
            const color = ["var(--chart-3)", "var(--chart-2)", "var(--chart-1)", "var(--chart-4)", "var(--muted-foreground)"][node.level];
            return (
              <motion.g key={id}
                onMouseEnter={() => setActiveNode(id)}
                onMouseLeave={() => setActiveNode(null)}
                animate={{ scale: isActive ? 1.05 : 1 }}
                style={{ cursor: "pointer" }}
              >
                <rect x={pos.x - 60} y={pos.y - 15} width="120" height="26" rx="4"
                  fill={isActive ? color + "30" : "var(--background)"}
                  stroke={color} strokeWidth={isActive ? 1.5 : 0.8} />
                <text x={pos.x} y={pos.y + 2} textAnchor="middle" fontSize="7"
                  fill={isActive ? color : "var(--foreground)"}
                  fontWeight={isActive ? "bold" : "normal"}>{node.label}</text>
              </motion.g>
            );
          })}
          <defs>
            <marker id="priv-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" />
            </marker>
          </defs>
        </svg>
        {activeNode && (
          <div className="mt-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
            <p className="font-semibold text-primary mb-0.5">{nodes[activeNode as keyof typeof nodes].label}</p>
            <p className="text-muted-foreground">{nodes[activeNode as keyof typeof nodes].desc}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Comparison table
// ============================================================

function PrivacyComparisonTable() {
  const rows = [
    { feature: "Origin", dp: "Dwork 2006", fl: "McMahan 2017 (Google)", he: "Gentry 2009 (FHE)", smpc: "Yao 1986 (garbled circuits)" },
    { feature: "Threat model", dp: "Information-theoretic (worst-case)", fl: "Curious server + honest-but-curious clients", he: "Honest-but-curious server", smpc: "n-of-n or t-of-n honest-but-curious" },
    { feature: "Data movement", dp: "Data centralised; output noise added", fl: "Data stays local; only model weights shared", he: "Encrypted data sent to server", smpc: "Encrypted shares exchanged" },
    { feature: "Math basis", dp: "Probability bound Pr[M(D)∈S] ≤ e^ε × Pr[M(D')∈S]", fl: "Weighted avg w_{t+1} = Σ(n_k/n) w_k^t", he: "Ring theory; Enc(a)⊕Enc(b)=Enc(a+b)", smpc: "Secret sharing + arithmetic circuits" },
    { feature: "Computation overhead", dp: "Low (just noise)", fl: "Medium (1-10x slower than centralised)", he: "1000-100000x slower (bootstrapping)", smpc: "10-100x slower (rounds of comm)" },
    { feature: "ML use case", dp: "GWAS p-value release, training data DP", fl: "Multi-hospital drug response prediction", he: "Encrypted ML inference, secure aggregation", smpc: "Joint statistics across competitors" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          Differential Privacy vs Federated Learning vs Homomorphic Encryption vs Secure Multi-party — 6 features
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold text-primary">Differential Privacy</th>
              <th className="text-left px-3 py-2 font-semibold">Federated Learning</th>
              <th className="text-left px-3 py-2 font-semibold">Homomorphic Encryption</th>
              <th className="text-left px-3 py-2 font-semibold">Secure Multi-party</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-primary/80">{r.dp}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.fl}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.he}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.smpc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// Main page component
// ============================================================

export function PrivacyEnhancingTechPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Privacy-Enhancing Tech · ε-DP (Dwork 2006) · Laplace + Gaussian mechanisms · FedAvg (McMahan 2017) · Paillier + BFV/BGV + CKKS · composition theorems"
        title="Privacy-Enhancing Tech — Differential Privacy + Federated Learning + Homomorphic Encryption"
        description="Privacy-enhancing technologies (PETs) let organisations compute on sensitive data without revealing the underlying records. Three foundational primitives dominate: (1) Differential Privacy — Dwork's 2006 formalism: <code className=&quot;font-mono&quot;>Pr[M(D) ∈ S] ≤ e^ε × Pr[M(D') ∈ S]</code> for any two databases D, D' differing in 1 record. The Laplace mechanism <code className=&quot;font-mono&quot;>M(x) = f(x) + Lap(Δf/ε)</code> calibrates noise to the sensitivity Δf and the privacy budget ε. The Gaussian mechanism <code className=&quot;font-mono&quot;>M(x) = f(x) + N(0, σ²)</code> with <code className=&quot;font-mono&quot;>σ ≥ √(2ln(1.25/δ)) × Δf/ε</code> gives the relaxed (ε, δ)-DP. Composition: k queries with budgets (ε₁, ..., εₖ) compose to <code className=&quot;font-mono&quot;>ε_total = Σεᵢ</code>. (2) Federated Learning — McMahan's 2017 FedAvg: <code className=&quot;font-mono&quot;>w_{t+1} = Σ_k (n_k/n) × w_k^t</code> (weighted average of client models). Data stays local (HIPAA compliant); only model weights are shared. (3) Homomorphic Encryption — Paillier (additive: <code className=&quot;font-mono&quot;>Enc(a) ⊕ Enc(b) = Enc(a+b)</code>), BFV/BGV (fully homomorphic, with bootstrapping), CKKS (approximate arithmetic, best for ML). This deep dive covers the mathematical foundations, production code in Python/Rust, and scientific dataset examples from genomics ε-DP on GWAS and clinical FedAvg across hospital silos."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Lock className="h-3 w-3" /> ε-DP</Badge>
            <Badge variant="outline" className="gap-1.5"><ShieldCheck className="h-3 w-3" /> Federated</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* Mathematical foundations — CRITICAL section */}
      <SectionCard
        title="Mathematical foundations — ε-DP, Laplace, Gaussian, composition, HE, FedAvg"
        description="The mathematical foundations of privacy-enhancing tech. ε-DP is a probability bound; the Laplace/Gaussian mechanisms achieve it via calibrated noise; composition theorems bound the cumulative privacy loss; HE algebra enables computation on ciphertexts; FedAvg is a weighted average."
        icon={<Brain className="h-5 w-5" />}
        badge="mathematics"
      >
        <div className="space-y-4">
          {/* ε-DP */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm font-semibold text-primary mb-2">1. ε-Differential Privacy</p>
            <p className="font-mono text-xs text-primary mb-2">
              Pr[M(D) ∈ S] ≤ e^ε × Pr[M(D') ∈ S] for all D, D' differing in 1 record, all S ⊆ Range(M)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The fundamental definition: for any two databases <code className="font-mono">D</code> and <code className="font-mono">D'</code> differing
              in exactly one record (one person added or removed), the output distribution of the mechanism <code className="font-mono">M</code> differs
              by at most a factor of <code className="font-mono">e^ε</code> on any subset <code className="font-mono">S</code> of outputs.
              Interpretation: the addition or removal of any single person's record changes the output probability by at most <code className="font-mono">e^ε</code>.
              <code className="font-mono"> ε = 0</code> = perfect privacy (zero information leakage, but useless); <code className="font-mono"> ε = ∞</code> = no privacy.
              Industry standard: <code className="font-mono">ε = 1.0</code> (strong). Apple uses <code className="font-mono">ε = 4</code> for some iOS features; the US Census
              Bureau uses <code className="font-mono">ε = 19.61</code> (weaker, but for the 2020 Census disclosure avoidance). The smaller the ε, the more noise; the
              larger the ε, the more utility but less privacy. The bound is worst-case — it must hold for ALL pairs (D, D') and ALL subsets S, making ε-DP
              robust to <strong>post-processing</strong> (any function of an ε-DP output is itself ε-DP) and to <strong>composition</strong>.
            </p>
          </div>
          {/* Laplace mechanism */}
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">2. Laplace Mechanism</p>
            <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 mb-2">
              M(x) = f(x) + Lap(Δf/ε) where Δf = sensitivity (max change in f from 1 record)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The Laplace mechanism achieves ε-DP for real-valued functions. <code className="font-mono">f(x)</code> is the query (e.g. count, sum, mean).
              <code className="font-mono"> Δf</code> is the <strong>L1 sensitivity</strong> — the maximum change in <code className="font-mono">f</code> from adding
              or removing one record: <code className="font-mono">Δf = max over (D, D') of |f(D) - f(D')|</code>. For a count query, <code className="font-mono">Δf = 1</code>;
              for a sum query bounded by [0, B], <code className="font-mono">Δf = B</code>; for a histogram (each bin independent), <code className="font-mono">Δf = 1</code> per bin.
              The Laplace distribution <code className="font-mono">Lap(b)</code> has PDF <code className="font-mono">p(y) = (1/2b) exp(-|y|/b)</code>, mean 0, variance
              <code className="font-mono"> 2b²</code>. The scale <code className="font-mono">b = Δf/ε</code> — the more sensitive the query or the smaller the privacy budget,
              the more noise. The proof that Laplace achieves ε-DP follows from the Laplace PDF's exponential tail bound — the ratio
              <code className="font-mono"> p(noise | D) / p(noise | D') </code> telescopes to <code className="font-mono">e^(|f(D) - f(D')|/b) ≤ e^(Δf/b) = e^ε</code>.
            </p>
          </div>
          {/* Gaussian mechanism */}
          <div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-3">
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">3. Gaussian Mechanism (for (ε, δ)-DP)</p>
            <p className="font-mono text-xs text-violet-600 dark:text-violet-400 mb-2">
              M(x) = f(x) + N(0, σ²) where σ ≥ √(2ln(1.25/δ)) × Δf / ε
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The Gaussian mechanism achieves the relaxed <code className="font-mono">(ε, δ)</code>-DP, where the bound has a small additive failure
              probability <code className="font-mono">δ</code>: <code className="font-mono"> Pr[M(D) ∈ S] ≤ e^ε × Pr[M(D') ∈ S] + δ</code>.
              <code className="font-mono"> δ</code> is the probability of catastrophic failure — typical values are <code className="font-mono">1e-5</code> to
              <code className="font-mono"> 1e-10</code> (much smaller than the data size, so an individual privacy failure is overwhelmingly unlikely). The
              standard deviation must satisfy <code className="font-mono">σ ≥ √(2ln(1.25/δ)) × Δf / ε</code> (Dwork-Roth 2014, Theorem A.1). For
              <code className="font-mono"> ε = 1, δ = 1e-5, Δf = 1</code>: <code className="font-mono">σ_min ≈ 4.89</code> — more noise than Laplace, but
              Gaussian is preferred when the noise must be additive over many queries (it composes better via the moments accountant, Abadi et al. 2016).
              DP-SGD (differentially private stochastic gradient descent, used to train private neural networks) uses the Gaussian mechanism on clipped gradients.
            </p>
          </div>
          {/* Composition */}
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">4. Composition Theorems</p>
            <p className="font-mono text-xs text-amber-600 dark:text-amber-400 mb-2">
              Sequential: k queries (ε₁, ..., εₖ) → overall ε = Σεᵢ · Parallel: disjoint subsets → ε = max(εᵢ)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Sequential composition</strong>: if you run <code className="font-mono">k</code> mechanisms with privacy budgets
              <code className="font-mono"> (ε₁, ..., εₖ)</code> on the same data, the overall privacy is <code className="font-mono">ε_total = Σεᵢ</code>. So 100
              queries each at <code className="font-mono">ε = 0.1</code> give <code className="font-mono">ε_total = 10</code> (much weaker than 0.1).
              To stay under <code className="font-mono">ε_total = 1.0</code> across 100 queries, each query must use <code className="font-mono">ε = 0.01</code> (much noisier).
              <strong> Parallel composition</strong>: if the <code className="font-mono">k</code> queries operate on <em>disjoint</em> subsets of the data
              (e.g. each histogram bin is computed on a disjoint set of records), the overall privacy is <code className="font-mono">max(εᵢ)</code>, not
              <code className="font-mono">Σεᵢ</code>. So 100 disjoint histogram bins each at <code className="font-mono">ε = 1.0</code> give
              <code className="font-mono">ε_total = 1.0</code>. <strong>Advanced composition</strong> (Dwork-Roth-Vadhan): for <code className="font-mono">k</code> queries at
              <code className="font-mono">ε</code> each, the overall is <code className="font-mono">O(√(k) × ε)</code> instead of <code className="font-mono">k × ε</code> — better for many queries.
              The moments accountant (Abadi et al. 2016) tightens this further for the Gaussian mechanism.
            </p>
          </div>
          {/* HE */}
          <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3">
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-2">5. Homomorphic Encryption</p>
            <p className="font-mono text-xs text-rose-600 dark:text-rose-400 mb-2">
              Enc(a) ⊕ Enc(b) = Enc(a+b) · Enc(a) ⊗ Enc(b) = Enc(a×b) (for FHE)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Homomorphic encryption allows computation on ciphertexts without decrypting. <strong>Paillier (1999)</strong> is <em>additively</em> homomorphic:
              <code className="font-mono"> Enc(a) ⊕ Enc(b) = Enc(a+b)</code> (the ⊕ is addition of ciphertexts, not XOR). Also supports scalar multiplication:
              <code className="font-mono"> Enc(a) ⊗ c = Enc(a × c)</code> for plaintext <code className="font-mono">c</code>. Used for secure aggregation across
              hospitals (sum patient counts without revealing individual hospital counts). <strong>Gentry's FHE (2009)</strong> added multiplication:
              <code className="font-mono"> Enc(a) ⊗ Enc(b) = Enc(a × b)</code>, enabling arbitrary circuits — but ciphertexts grow with each multiplication
              (&quot;noise&quot;), requiring expensive <em>bootstrapping</em> to refresh. <strong>BFV/BGV (Bralver-Fan/Brakerski-Vaikuntanathan-Gentry)</strong> are
              efficient FHE schemes. <strong>CKKS (Cheon-Kim-Kim-Song, 2017)</strong> is the best for ML — it does <em>approximate</em> arithmetic on real
              numbers (like floating-point), accepting a small precision loss for huge speedups. CKKS is what you'd use to encrypt a patient record and
              run an encrypted ML inference on it.
            </p>
          </div>
          {/* FedAvg */}
          <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-3">
            <p className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 mb-2">6. FedAvg</p>
            <p className="font-mono text-xs text-cyan-600 dark:text-cyan-400 mb-2">
              w(t+1) = Σ k (nk/n) × wk(t)  (weighted average of client models)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              FedAvg (McMahan et al. 2017, Google) trains a global model across <code className="font-mono">K</code> clients (hospitals) without sharing
              patient data. Each round: (1) the central server broadcasts the current global weights <code className="font-mono">w_t</code> to all clients;
              (2) each client <code className="font-mono">k</code> trains locally on its private dataset of size <code className="font-mono">n_k</code>,
              producing local weights <code className="font-mono">w_k^t</code>; (3) the server averages the local weights, weighted by sample count:
              <code className="font-mono"> w(t+1) = Σ k (nk/n) × wk(t)</code> where <code className="font-mono">n = Σ nk</code> is the total. Larger
              hospitals get proportionally more influence. <strong>FedProx</strong> (Li et al. 2020) adds a proximal regulariser <code className="font-mono">(μ/2)||w - w_t||²</code>
              to the local loss to handle heterogeneous clients (non-IID data). <strong>DP-FedAvg</strong> (Google's &quot;Federated Learning with Differential
              Privacy&quot;) adds Gaussian noise to the gradients — protecting against reconstruction attacks that infer individual training examples from
              the shared weight updates. <strong>FedSGD</strong> is the simpler variant: each client sends a gradient, the server averages and steps.
              FedAvg is the most common — it batches multiple local SGD steps before averaging, reducing communication.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Architecture */}
      <SectionCard
        title="Privacy-Enhancing Tech architecture — DP → FL → HE → SMPC → TEE"
        description="Five privacy primitives, ordered by data movement and trust model. DP adds noise at the output (data still centralised). FL keeps data local (only weights shared). HE encrypts the data on the wire. SMPC distributes computation across multiple parties. TEE isolates computation in a hardware enclave."
        icon={<Atom className="h-5 w-5" />}
        badge="architecture"
      >
        <PrivacyArchitectureDiagram />
      </SectionCard>

      {/* Math Pyodide demo */}
      <SectionCard
        title="Try it: ε-DP + Laplace + Gaussian + composition + HE + FedAvg (Pyodide)"
        description="Pure-Python implementation of the 6 mathematical foundations. Empirically verify ε-DP on a counting query, sample Laplace noise calibrated to Δf/ε, compute the Gaussian σ_min, apply sequential vs parallel composition, simulate FedAvg across 5 hospitals, and run a toy additive HE aggregation."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={MATH_SECTION} buttonLabel="Run privacy math foundations (Pyodide)" />
      </SectionCard>

      {/* PET simulation demo */}
      <SectionCard
        title="Try it: GWAS ε-DP + clinical FedAvg + HE aggregation (Pyodide)"
        description="Three end-to-end simulations: (1) Laplace mechanism on GWAS p-values at various ε — observe the privacy-utility trade-off; (2) FedAvg across 5 hospitals — observe the weighted average across 10 rounds; (3) toy additive homomorphic encryption — secure aggregation across 2 hospitals."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={PYODIDE_DEMO} buttonLabel="Run PET simulation (Pyodide)" />
      </SectionCard>

      {/* Code blocks */}
      <SectionCard
        title="Production code — DP + FedAvg + HE"
        description="Three code blocks: (1) Python ε-DP via the Google DP library, (2) Python FedAvg via Flower, (3) Python homomorphic encryption via the Microsoft SEAL library (Python bindings)."
        icon={<Cpu className="h-5 w-5" />}
        badge="3 code blocks"
      >
        <div className="space-y-3">
          <CodeBlock
            language="python"
            filename="epsilon_dp_google_dp.py"
            code={`# Epsilon-DP via Google's differential privacy Python library
# pip install python-differential-privacy

import pydp as pdp
from pydp.algorithms.laplacian import BoundedSum, BoundedMean, Count, Max

# GWAS p-value release with ε-DP (Laplace mechanism)
# Sensitivity Δf = 1/sqrt(n) where n = study size
n_patients = 10_000
epsilon = 1.0  # strong privacy budget

# Bounded sum: counts / totals with explicit lower/upper bounds
# (BoundedSum clamps inputs to [lower, upper] to bound sensitivity)
total_variants = BoundedSum(
    epsilon=epsilon,
    lower=0, upper=n_patients,  # bounds for sensitivity
    dtype="int64"
)

# Private count of significant SNPs (p < 5e-8) released with ε-DP
sig_snp_count = Count(epsilon=epsilon)
private_count = sig_snp_count.result(
    [1 if p < 5e-8 else 0 for p in true_p_values]
)
print(f"True significant SNPs: {sum(1 for p in true_p_values if p < 5e-8)}")
print(f"Private (ε={epsilon}) count: {private_count}")

# Composition: release 1000 SNP p-values -> ε_total = 1000 * ε_each
# To stay under ε_total=1.0, set ε_each = 1/1000 = 0.001 (much more noise)
eps_each = 1.0 / 1000
print(f"1000 SNPs at ε_each={eps_each:.4f} -> ε_total = {1000*eps_each:.1f}")`}
          />
          <CodeBlock
            language="python"
            filename="fedavg_flower.py"
            code={`# Federated Learning (FedAvg) via the Flower framework
# pip install flwr torch

import flwr as fl
import torch
import torch.nn as nn

# (1) Define the model architecture (drug-response classifier)
class DrugResponseModel(nn.Module):
    def __init__(self, n_features=200):
        super().__init__()
        self.fc1 = nn.Linear(n_features, 64)
        self.fc2 = nn.Linear(64, 1)
    def forward(self, x):
        return torch.sigmoid(self.fc2(torch.relu(self.fc1(x))))

# (2) Flower client: each hospital is one client
class HospitalClient(fl.client.NumPyClient):
    def __init__(self, model, train_loader, n_samples):
        self.model = model
        self.train_loader = train_loader
        self.n_samples = n_samples  # for FedAvg weighting

    def get_parameters(self):
        return [val.cpu().numpy() for val in self.model.state_dict().values()]

    def fit(self, parameters, config):
        # Receive global weights from server, train locally
        self.set_parameters(parameters)
        # Local SGD: 5 local epochs before averaging (FedAvg batching)
        for epoch in range(5):
            for x, y in self.train_loader:
                # ... train step ...
                pass
        # Return updated weights + sample count (for FedAvg weighting)
        return self.get_parameters(), self.n_samples, {}

    def set_parameters(self, parameters):
        for name, val in zip(self.model.state_dict().keys(), parameters):
            self.model.state_dict()[name].copy_(torch.tensor(val))

# (3) Start the 5 hospital clients (one per hospital)
for hospital_id in ["mayo", "cleveland", "hopkins", "stanford", "ucsf"]:
    model = DrugResponseModel()
    train_loader = load_hospital_data(hospital_id)
    n_samples = len(train_loader.dataset)
    client = HospitalClient(model, train_loader, n_samples)
    fl.client.start_numpy_client(
        server_address="fedavg-server:8080",
        client=client,
    )
    # Server computes: w_{t+1} = Σ_k (n_k/n) × w_k^t`}
          />
          <CodeBlock
            language="python"
            filename="homomorphic_seal.py"
            code={`# Homomorphic Encryption via Microsoft SEAL (Python bindings)
# pip install seal

import seal
import numpy as np

# (1) Set up the CKKS scheme (best for ML — approximate arithmetic)
parms = seal.EncryptionParameters(seal.scheme_type.ckks)
poly_modulus_degree = 8192
parms.set_poly_modulus_degree(poly_modulus_degree)
parms.set_coeff_modulus(seal.CoeffModulus.BFVDefault(poly_modulus_degree))
context = seal.SEALContext(parms)

# Keys
keygen = seal.KeyGenerator(context)
public_key = keygen.public_key()
secret_key = keygen.secret_key()
encryptor = seal.Encryptor(context, public_key)
decryptor = seal.Decryptor(context, secret_key)
evaluator = seal.Evaluator(context)
encoder = seal.CKKSEncoder(context)

# (2) Hospital 1 encrypts patient count; Hospital 2 encrypts patient count
h1_count = 3180  # patients with condition X at hospital 1
h2_count = 2470  # patients with condition X at hospital 2

plain1 = encoder.encode([float(h1_count)], scale=2**40)
plain2 = encoder.encode([float(h2_count)], scale=2**40)
enc1 = encryptor.encrypt(plain1)
enc2 = encryptor.encrypt(plain2)

# (3) Aggregator sums the ciphertexts — WITHOUT decrypting
# (CKKS supports additive homomorphism: Enc(a) + Enc(b) = Enc(a + b))
enc_sum = evaluator.add(enc1, enc2)

# (4) Decrypt only the final result
plain_sum = decryptor.decrypt(enc_sum)
total = encoder.decode(plain_sum)[0]
print(f"Hospital 1: {h1_count} (encrypted)")
print(f"Hospital 2: {h2_count} (encrypted)")
print(f"Secure sum (decrypted): {total:.0f}")
print(f"Aggregator learned ONLY the total, not individual counts.")
print(f"CKKS supports multiplication too: Enc(a) * Enc(b) = Enc(a*b) -> encrypted ML inference")`}
          />
        </div>
      </SectionCard>

      {/* Comparison */}
      <SectionCard
        title="Differential Privacy vs Federated Learning vs Homomorphic Encryption vs Secure Multi-party"
        description="Four privacy primitives compared across 6 features. DP adds noise (output-level); FL keeps data local; HE encrypts the data; SMPC distributes computation. They are often combined — DP-FedAvg (DP + FL), FHE + DP for ML inference."
        icon={<Boxes className="h-5 w-5" />}
      >
        <PrivacyComparisonTable />
      </SectionCard>

      {/* Why evolved */}
      <SectionCard
        title="Why PETs evolved — shortfalls of de-identification"
        description="Before PETs, data was 'anonymised' by stripping names and addresses. Four critical shortfalls of this approach triggered the PET movement."
        icon={<History className="h-5 w-5" />}
        badge="Why PETs"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: De-identification does not prevent re-identification.</strong> Latanya Sweeney's 2000 paper showed that 87% of the US population is uniquely identifiable by (zip code, gender, date of birth) — three fields considered &quot;safe&quot; to release. AOL, Netflix, and the Massachusetts Hospital all had &quot;anonymised&quot; datasets re-identified. PETs respond with formal privacy guarantees — ε-DP is provable, not vibes.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: Aggregate statistics leak individual records.</strong> Even releasing a count or a sum can leak — if you know the count was 1000 before someone joined and 1001 after, you know they're in. Membership inference attacks reconstruct whether a specific record was in the training data. PETs respond with calibrated noise — Laplace(Δf/ε) — that hides individual contributions.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: Data movement creates compliance risk.</strong> Moving patient data across hospital boundaries triggers HIPAA + GDPR compliance overhead — every copy is a regulatory liability. PETs respond with federated learning — data stays local, only model weights move. This is why hospitals can now collaborate on clinical trial prediction models without sharing patient data.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: Centralised computation creates a single breach point.</strong> A centralised server with patient data is a high-value breach target — one intrusion compromises everyone. PETs respond with homomorphic encryption — the server only sees encrypted data; even if breached, the data is useless without the secret key. SMPC distributes trust across multiple non-colluding servers.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique PET features"
        description="Four features that are genuinely unique to privacy-enhancing tech — formal guarantees that de-identification cannot match."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. Provable privacy (ε-DP)</p>
            <p className="text-muted-foreground">ε-DP is a mathematical theorem — Pr[M(D)∈S] ≤ e^ε × Pr[M(D')∈S] holds for ALL pairs (D, D'). <strong>De-identification is vibes — it depends on what fields you forgot to strip.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Composition theorems</p>
            <p className="text-muted-foreground">Sequential composition: ε_total = Σεᵢ. <strong>De-identification has no composition — releasing 1000 &quot;anonymised&quot; statistics can leak more than each one alone.</strong> ε-DP gives a bound on cumulative privacy loss.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Post-processing immunity</p>
            <p className="text-muted-foreground">Any function of an ε-DP output is itself ε-DP. <strong>De-identification fails post-processing — joining &quot;anonymised&quot; data with auxiliary data re-identifies individuals.</strong> ε-DP survives arbitrary post-hoc analysis.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Compute on encrypted data (HE)</p>
            <p className="text-muted-foreground">Homomorphic encryption: Enc(a) ⊕ Enc(b) = Enc(a+b), Enc(a) ⊗ Enc(b) = Enc(a×b). <strong>De-identification requires plaintext — the server sees the data.</strong> HE lets the server compute without ever decrypting.</p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples */}
      <SectionCard
        title="2 scientific dataset examples — cards with 5-language code"
        description="Two PET deployment scenarios from life sciences. Each is a clickable card opening a popup with: scenario brief, dataset stats, computational tooling, multi-language code (Scala/Rust/Go/Elixir/Zig), Pyodide demo, and implementation insight."
        icon={<Database className="h-5 w-5" />}
        badge="2 examples × 5 langs"
      >
        <DatasetCards
          examples={PRIVACY_SCIENCE_EXAMPLES}
          intro="Genomics differential privacy (Laplace mechanism on GWAS p-values, ε=1.0, sensitivity=1/√n) + Clinical trial federated learning (FedAvg weighted average across 5 hospital data silos, data stays local for HIPAA compliance)."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the PET ecosystem"
        description="PET tooling spans DP libraries, FL frameworks, HE libraries, and TEE platforms."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-primary" /> Differential Privacy</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Google DP library (C++/Python)</strong> — BoundedSum, BoundedMean, Count</li>
              <li>• <strong>IBM differential-privacy-library</strong> — Laplace, Gaussian, exponential</li>
              <li>• <strong>Opacus (PyTorch)</strong> — DP-SGD for private neural networks</li>
              <li>• <strong>TensorFlow Privacy</strong> — DP-SGD, DP-query</li>
              <li>• <strong>OpenDP (Harvard/CMU)</strong> — open-source DP platform</li>
              <li>• <strong>Tumult Analytics</strong> — Spark-native DP SQL</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Federated Learning + HE</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Flower</strong> — open-source FL framework (any ML library)</li>
              <li>• <strong>TensorFlow Federated</strong> — Google's FL framework</li>
              <li>• <strong>PySyft</strong> — OpenMined's FL + SMPC framework</li>
              <li>• <strong>NVIDIA FLARE</strong> — federated learning at scale</li>
              <li>• <strong>Microsoft SEAL</strong> — BFV + CKKS homomorphic library</li>
              <li>• <strong>OpenFHE</strong> — open-source FHE library (all schemes)</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers and production deployments that defined PETs."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Dwork 2006 (origin of ε-DP):</strong> Cynthia Dwork, Frank McSherry, Kobbi Nissim, Adam Smith's &quot;Calibrating Noise to Sensitivity in Private Data Analysis&quot; (TCC 2006) introduced the formal definition of ε-differential privacy and the Laplace mechanism. The Gaussian mechanism + (ε, δ)-DP came in their 2014 book &quot;The Algorithmic Foundations of Differential Privacy&quot;. This is the foundational theorem of privacy research.
          </p>
          <p>
            <strong className="text-foreground/80">McMahan 2017 (FedAvg):</strong> Brendan McMahan et al.'s &quot;Communication-Efficient Learning of Deep Networks from Decentralized Data&quot; (AISTATS 2017) introduced FedAvg — the federated averaging algorithm. Each client trains locally, the server averages the weights. Communication-efficient (only weights, not data, transferred). Google deployed FedAvg for Gboard next-word prediction across millions of Android phones — the first production FL at scale.
          </p>
          <p>
            <strong className="text-foreground/80">Gentry 2009 (FHE):</strong> Craig Gentry's PhD thesis &quot;Fully Homomorphic Encryption Using Ideal Lattices&quot; introduced the first fully homomorphic encryption scheme — supporting both addition AND multiplication of ciphertexts, enabling arbitrary computation on encrypted data. The original scheme was impractically slow; BFV/BGV (Brakerski et al. 2012) and CKKS (Cheon et al. 2017) brought it to usable performance. Bootstrapping (refreshing ciphertext noise) is the key technical challenge.
          </p>
          <p>
            <strong className="text-foreground/80">Production at US Census (2020):</strong> The 2020 US Census used formal differential privacy for disclosure avoidance — the first-ever DP deployment at national scale. ε = 19.61 (weaker than academic standards but unprecedented for a census). The debate over the right ε revealed the privacy-utility trade-off in stark terms — census data must support state-level apportionment (Constitutionally mandated precision).
          </p>
          <p>
            <strong className="text-foreground/80">Production at Apple (2017+):</strong> Apple uses DP for iOS telemetry (emoji usage, Safari browsing patterns, HealthKit data). ε = 4 for most features, with daily aggregation + shuffling for amplification. The DP pipeline processes ~150M devices daily — the largest DP deployment by user count. Criticised for not publishing exact parameters; later improved transparency.
          </p>
          <p>
            <strong className="text-foreground/80">Production at Penn Medicine (2022+):</strong> Penn Medicine deployed FedAvg across 8 hospitals for sepsis prediction — patient data stayed local (HIPAA compliant), only model weights shared. Added DP noise to gradients (DP-FedAvg) to prevent reconstruction attacks. Outperformed centralised training on out-of-hospital validation (better generalisation across hospital-specific populations). Now extended to oncology trial prediction.
          </p>
        </div>
      </SectionCard>

      {/* Insight */}
      <SectionCard
        title="My deeper thought: PETs ARE the data analogue of cryptographic protocols"
        description="The unifying view: PETs bring to data the same formal guarantees that cryptography brought to communications — provable security against worst-case adversaries, composable across operations, immune to post-processing."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">ε-DP IS the data analogue of semantic security.</strong> In cryptography, semantic security (Goldwasser-Micali 1982) says: a computationally-bounded adversary cannot learn anything about the plaintext from the ciphertext (except its length). The formal definition: for any two messages m₀, m₁, the encryptions are computationally indistinguishable. ε-DP is the data analogue: for any two databases D, D' differing in 1 record, the outputs are e^ε-indistinguishable. Both are worst-case guarantees — they must hold for ALL adversaries, ALL auxiliary information, ALL pairs of inputs. Both compose (semantic security composes under hybrid argument; ε-DP composes sequentially). This is why ε-DP &quot;feels&quot; like cryptography — it has the same structural form.
          </p>
          <p>
            <strong className="text-foreground/80">Composition theorems ARE the data analogue of security amplification.</strong> In cryptography, running a weakly-secure protocol twice amplifies security (the adversary must win both rounds). In DP, the composition theorem says sequential queries add budgets: ε_total = Σεᵢ. The advanced composition (Dwork-Roth-Vadhan) gives ε_total = O(√k × ε) instead of k × ε — analogous to amplification theorems. The moments accountant (Abadi et al. 2016) tightens this further for Gaussian — same as the &quot;concrete security&quot; program in cryptography (exact bounds for specific constructions, not asymptotic).
          </p>
          <p>
            <strong className="text-foreground/80">Homomorphic encryption IS the data analogue of secure multi-party computation.</strong> Both let you compute on data you cannot see. SMPC (Yao 1986, GMW) distributes the computation across multiple non-colluding servers — they exchange encrypted shares but no single server sees the plaintext. HE (Gentry 2009) lets a single server compute on encrypted data without ever seeing the plaintext. They solve the same problem (compute-on-unseen-data) with different trust models: SMPC distributes trust across servers; HE concentrates trust in the encryption (one key, held by the data owner). The two are mathematically related — both use arithmetic circuits over a ring, both support addition and multiplication.
          </p>
          <p>
            <strong className="text-foreground/80">FedAvg IS the data analogue of gossip protocols.</strong> In distributed systems, gossip protocols (epidemic broadcast) let nodes reach consensus without a central coordinator — each node exchanges state with a random peer, the state converges. FedAvg is the data analogue: each client trains locally (like a gossip update), the central server averages (like a gossip round). The convergence theorem of FedAvg mirrors the gossip convergence theorem — both are stochastic approximation on a communication graph. Adding DP to gradients (DP-FedAvg) is the data analogue of adding noise to gossip updates (differential privacy in gossip, strengthened by Manitara et al.).
          </p>
        </div>
      </SectionCard>

      <DeeperThoughtSection pageTitle="Privacy Enhancing Tech">
        <DeeperThought title="Differential privacy IS the mathematical guarantee — and it's the right abstraction" connectedTo="ADR-001 (platform architecture)">
          <p>{"Differential privacy (DP) guarantees: the output of a query changes by at most ε when any single record is added/removed. This IS a mathematical theorem, not a heuristic. The ε (epsilon) parameter controls the privacy-utility trade-off: small ε = strong privacy but noisy results; large ε = weak privacy but accurate results. DP IS the only privacy definition with a PROVABLE guarantee. Everything else (anonymization, pseudonymization) is a heuristic that can be defeated."}</p>
        </DeeperThought>
        <DeeperThought title="DP's Laplace mechanism IS noise injection — and it's calibrated to ε" connectedTo="ADR-022 (pgvector for variant embeddings)">
          <p>{"The Laplace mechanism adds noise drawn from Laplace(0, 1/ε) to each query result. The noise scale IS inversely proportional to ε: more privacy (smaller ε) = more noise. This IS the SAME math as Kalman filtering (add noise proportional to the uncertainty). The difference: Kalman minimizes estimation error; DP maximizes privacy. Both add Gaussian/Laplace noise calibrated to a parameter (R for Kalman, ε for DP). The math (noise injection + parameter calibration) IS the same."}</p>
        </DeeperThought>
        <DeeperThought title="Homomorphic encryption IS computation on ciphertext — and it's the holy grail" connectedTo="ADR-034 (ESM-2 + AlphaFold2)">
          <p>{"Fully homomorphic encryption (FHE) allows computation on encrypted data without decryption. You send encrypted data to a cloud server; it computes f(encrypted) and returns the encrypted result; you decrypt locally. The server NEVER sees the plaintext. FHE IS the holy grail of privacy: the cloud computes but doesn't know what it's computing on. The math (ring homomorphisms + bootstrapping) is 15 years old (Gentry 2009). The implementation (10,000x overhead) is not yet practical — but it will be."}</p>
        </DeeperThought>
        <DeeperThought title="Secure multiparty computation IS the split-key pattern — and it's practical" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"SMPC allows multiple parties to jointly compute a function on their private inputs without revealing the inputs to each other. Each party holds a share of the data; the computation proceeds without anyone seeing the full input. This IS the SAME pattern as Shamir's secret sharing: split the secret into N shares, distribute to N parties, reconstruct only when M < N shares are combined. SMPC IS Shamir's secret sharing for computation."}</p>
        </DeeperThought>
        <DeeperThought title="Federated learning IS distributed training — and it's the right model for privacy" connectedTo="ADR-034 (ESM-2 + AlphaFold2)">
          <p>{"Federated learning trains ML models on each user's device (local data), then aggregates the model updates (not the data) on a central server. The server NEVER sees the raw data — only the gradient updates. This IS the SAME pattern as distributed SGD (each worker computes gradients, server averages). The difference: in distributed SGD, the data is on the same cluster; in federated learning, the data is on different devices (phones, hospitals). Federated learning IS distributed SGD across trust boundaries."}</p>
        </DeeperThought>
      </DeeperThoughtSection>
      <RelatedTopics topics={[
        { id: "governance" as const, reason: "Governance: PETs are part of the federated computational governance stack" },
        { id: "data-mesh-deep-dive" as const, reason: "Mesh enables federated PETs — each domain can apply its own PET" },
        { id: "data-contracts-deep-dive" as const, reason: "Privacy contracts (GDPR Art. 17) require PETs for enforcement" },
        { id: "feature-store-deep-dive" as const, reason: "Private feature stores use DP-FedAvg for cross-org features" },
        { id: "mlflow-deep-dive" as const, reason: "Private ML training tracked in MLflow (DP-SGD, FedAvg runs)" },
        { id: "lineage" as const, reason: "Lineage + audit trail for PET deployments (regulatory)" },
        { id: "aws-lake-formation" as const, reason: "Lake Formation tags + PETs for column-level privacy" },
        { id: "fintech" as const, reason: "Fintech uses PETs for cross-bank fraud detection" },
      ]} />
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "Trace this topic's connections across the platform's math graph" }, { id: "governance" as const, reason: "Governance: PETs are part of the federated computational governance stack" }, { id: "data-mesh-deep-dive" as const, reason: "Mesh enables federated PETs — each domain can apply its own PET" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("governance")} className="text-sm text-primary hover:underline">
          &rarr; Data Governance + Observability
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("data-mesh-deep-dive")} className="text-sm text-primary hover:underline">
          &rarr; Data Mesh Deep Dive (federated computational governance)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("data-contracts-deep-dive")} className="text-sm text-primary hover:underline">
          &rarr; Data Contracts Deep Dive (GDPR Art. 17 enforcement)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("mlflow-deep-dive")} className="text-sm text-primary hover:underline">
          &rarr; MLflow Deep Dive (track private ML training)
        </Link>
      </div>
    </div>
  );
}
