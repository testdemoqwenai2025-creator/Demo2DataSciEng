"use client";

import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Cpu, Brain, Atom, Sparkles, History, TrendingUp, Boxes, Server, Zap, Layers, Network } from "lucide-react";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";

const KPIS = [
  { label: "Origin", value: "Full FT pre-2019 / LoRA 2021", hint: "LoRA (Hu et al. 2021) showed weight updates are low-rank — 100× param reduction. QLoRA (2023) added 4-bit NF4. DPO (2023) replaced RLHF's PPO with a closed-form loss.", deltaTone: "flat" as const },
  { label: "Trainable", value: "100% → 0.1% (LoRA)", hint: "LoRA trains only rank-r adapters B and A (r≪d). 7B base → ~20M trainable params. Full FT needs 7B params × 6 bytes optimizer state = 168GB VRAM.", deltaTone: "down" as const },
  { label: "Memory", value: "80GB → 6GB (QLoRA)", hint: "QLoRA: NF4 4-bit base weights + paged optimizer + LoRA adapters in fp16. Lets you fine-tune a 70B model on a single 24GB GPU (vs 8× A100 for full FT).", deltaTone: "down" as const },
  { label: "Adoption", value: "GPT-4 / Claude / LLaMA FT", hint: "LoRA is the standard for community fine-tunes (civitai, llama.cpp). RLHF/DPO used by OpenAI (InstructGPT), Anthropic (Claude), Meta (Llama-3). PEFT library is HuggingFace's #1 download.", deltaTone: "up" as const },
];

const MATH_DEMO = `# ============================================================
# Fine-Tuning Math — LoRA decomposition, NF4 quantization, DPO loss
# Pure Python (Pyodide, math + random only)
# ============================================================

import math
import random

random.seed(42)

# --- 1. LoRA: W = W_0 + B @ A, where B is (d, r), A is (r, d), r << d
# Full FT: d x d params
# LoRA: 2 * d * r params (B and A)
# Ratio: 2r / d (when r << d, massive savings)

d = 4096  # hidden dim (LLaMA-7B has 4096)
for r in (1, 2, 4, 8, 16, 64):
    full_params = d * d
    lora_params = 2 * d * r
    ratio = lora_params / full_params
    reduction = full_params / lora_params
    print(f"  r={r:>3d}: LoRA params = {lora_params:>8,}, full = {full_params:,}, ratio = {ratio*100:.3f}%, reduction = {reduction:.0f}x")
print()

# --- 2. Power iteration for rank-r approximation (simulates SVD)
# Take a random "weight matrix" W (8 x 8), find B (8 x r) and A (r x 8) that minimize ||W - B @ A||

def matmul(A, B):
    """A is (m x k), B is (k x n). Returns (m x n)."""
    m = len(A)
    k = len(B)
    n = len(B[0])
    return [[sum(A[i][p] * B[p][j] for p in range(k)) for j in range(n)] for i in range(m)]

def transpose(A):
    return [[A[i][j] for i in range(len(A))] for j in range(len(A[0]))]

def mat_sub(A, B):
    return [[A[i][j] - B[i][j] for j in range(len(A[0]))] for i in range(len(A))]

def frobenius_sq(M):
    return sum(M[i][j]**2 for i in range(len(M)) for j in range(len(M[0])))

d_small = 8
W = [[random.gauss(0, 1) for _ in range(d_small)] for _ in range(d_small)]
W_norm = math.sqrt(frobenius_sq(W))
print("=== LoRA rank-r approximation (SVD-like) ===")
print(f"  W shape: ({d_small}, {d_small}), ||W||_F = {W_norm:.3f}")
print(f"  Target: minimize ||W - B @ A||_F  for given rank r")
print()

def train_lora(W, r, iters=100, lr=0.05):
    m = len(W)
    n = len(W[0])
    B = [[random.gauss(0, 0.1) for _ in range(r)] for _ in range(m)]
    A = [[random.gauss(0, 0.1) for _ in range(n)] for _ in range(r)]
    for step in range(iters):
        BA = matmul(B, A)
        diff = mat_sub(W, BA)
        A_T = transpose(A)
        for i in range(m):
            for k in range(r):
                g = sum(2 * diff[i][j] * A_T[k][j] for j in range(n)) / n
                B[i][k] += lr * g
        BA = matmul(B, A)
        diff = mat_sub(W, BA)
        B_T = transpose(B)
        for k in range(r):
            for j in range(n):
                g = sum(2 * B_T[k][i] * diff[i][j] for i in range(m)) / m
                A[k][j] += lr * g
    BA = matmul(B, A)
    err = math.sqrt(frobenius_sq(mat_sub(W, BA)))
    return B, A, err

for r in (1, 2, 4, 8):
    B, A, err = train_lora(W, r, iters=80, lr=0.05)
    rel_err = err / W_norm
    saved = (d_small * d_small - 2 * d_small * r) / (d_small * d_small) * 100
    print(f"  r={r}: rel_err = {rel_err:.3f}, params saved = {saved:.0f}%  (perfect when r={d_small})")
print()

# --- 3. NF4 (Normal Float 4-bit) quantization simulation
# NF4 bins are the 16 quantiles of a standard normal distribution.

def normal_cdf(x):
    """CDF of N(0,1) via erf."""
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))

def inverse_normal_cdf(p, tol=1e-6):
    """Find x such that normal_cdf(x) = p using bisection."""
    lo, hi = -5.0, 5.0
    for _ in range(50):
        mid = (lo + hi) / 2
        if normal_cdf(mid) < p:
            lo = mid
        else:
            hi = mid
        if hi - lo < tol:
            break
    return (lo + hi) / 2

print("=== NF4 Quantization Levels ===")
nf4_levels = []
for i in range(16):
    p = (i + 0.5) / 16
    level = inverse_normal_cdf(p)
    nf4_levels.append(level)
print(f"  16 quantile levels (first 4): {[f'{l:+.3f}' for l in nf4_levels[:4]]}")
print(f"                      (last 4):  {[f'{l:+.3f}' for l in nf4_levels[-4:]]}")

weights = [random.gauss(0, 1) for _ in range(1000)]
quantized = [min(nf4_levels, key=lambda q: abs(q - w)) for w in weights]
mse = sum((w - q)**2 for w, q in zip(weights, quantized)) / len(weights)
print(f"  Weights: 1000 random N(0,1) values")
print(f"  Quantization MSE: {mse:.4f}  (NF4 matches the normal distribution)")
print(f"  Memory: 32-bit fp -> 4-bit NF4 = 8x compression (vs ~12x for uniform int4)")
print()

# --- 4. DPO loss: L = -log sigma( beta * (log(pi(y_w|x)/pi_ref(y_w|x))
#                                       - log(pi(y_l|x)/pi_ref(y_l|x))) )

def sigmoid(x):
    if x >= 0:
        ex = math.exp(-x)
        return 1 / (1 + ex)
    ex = math.exp(x)
    return ex / (1 + ex)

def dpo_loss(log_ratio_w, log_ratio_l, beta=0.1):
    """Direct Preference Optimization loss."""
    margin = beta * (log_ratio_w - log_ratio_l)
    return -math.log(sigmoid(margin))

print("=== DPO Loss ===")
print("  L = -log sigma( beta * [log(pi(y_w|x)/pi_ref(y_w|x)) - log(pi(y_l|x)/pi_ref(y_l|x))] )")
print(f"  beta = 0.1 (KL regularization strength)")
for (rw, rl) in [(0.1, 0.0), (0.5, 0.0), (1.0, 0.0), (1.0, -1.0), (0.5, 0.4)]:
    loss = dpo_loss(rw, rl, beta=0.1)
    print(f"  log_ratio_w={rw:+.1f}, log_ratio_l={rl:+.1f} -> loss = {loss:.4f}")
print(f"  Loss is LOW when pi prefers y_w over y_l relative to pi_ref.")
print(f"  Loss is HIGH (~log 2 = 0.69) when pi matches pi_ref (no learning).")`;

export function FineTuningDeepDivePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Fine-Tuning · LoRA · QLoRA · PEFT · RLHF · DPO · Prefix Tuning"
        title="Fine-Tuning Deep Dive — the math behind LoRA, QLoRA, RLHF, and DPO"
        description="Fine-tuning adapts a pre-trained LLM to a specific task. Full fine-tuning updates every weight W ← W - η∇L(W) — too expensive for 7B+ models. LoRA (Hu et al. 2021) decomposes the weight update as W = W_0 + B·A where B (d×r) and A (r×d) with r ≪ d, cutting trainable params 100×. QLoRA (Dettmers 2023) adds NF4 4-bit quantization of the frozen base, dropping VRAM to 6GB for a 7B model. RLHF uses PPO to optimize L = E[r(x,y)] - β·KL(π||π_ref) with a separate reward model. DPO (Rafailov 2023) collapses RLHF to a closed-form loss: -log σ(β·log(π_θ(y_w|x)/π_ref(y_w|x)) - β·log(π_θ(y_l|x)/π_ref(y_l|x))), trained directly on preference pairs. This deep dive covers the math, custom SVGs (LoRA decomposition, memory bars, RLHF vs DPO pipelines), a Pyodide demo simulating rank-r factorization + NF4 quantization + DPO loss, and the evolution from full FT to DPO."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Cpu className="h-3 w-3" /> LoRA</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> DPO</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* Mathematical foundations */}
      <SectionCard
        title="Mathematical foundations — full FT, LoRA, QLoRA, RLHF, DPO"
        description="The 5 core equations of LLM fine-tuning: full gradient update, low-rank decomposition, NF4 quantization, PPO with KL penalty, and Direct Preference Optimization."
        icon={<Brain className="h-5 w-5" />}
        badge="mathematics"
      >
        <div className="space-y-4">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm font-semibold text-primary mb-2">1. Full Fine-Tuning — gradient descent on every weight</p>
            <p className="font-mono text-xs text-primary mb-2">
              W ← W - η · ∇_W L(W)   ·   params: d × d
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every weight in every layer gets a gradient. For a 7B model: 7B params × 4 bytes (fp32
              weight) + 4 bytes (grad) + 8 bytes (Adam m,v) = 112GB just for optimizer state on a
              7B model. Plus the activations (grows with batch × seq_len × layers). A 70B model
              needs 8× A100 80GB GPUs in tensor parallel. This is why full FT is reserved for
              frontier labs with megawatts of compute — LoRA democratized it.
            </p>
          </div>
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">2. LoRA — W = W_0 + B·A, r ≪ d</p>
            <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 mb-2">
              W = W_0 + B · A   ·   B ∈ R^(d×r), A ∈ R^(r×d), r ≪ d
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hu et al. (2021) observed that the fine-tuning delta W - W_0 has a low "intrinsic rank"
              — the learned update lives in a low-dim subspace. So instead of learning d×d
              parameters, learn two small factors B (d×r) and A (r×d). Trainable count: 2·d·r vs d².
              For LLaMA-7B (d=4096, r=8): full=16.8M params/layer, LoRA=65K params/layer — <strong>260×
              reduction</strong>. The frozen W_0 is kept in 16-bit (no optimizer state for it). B is
              initialized to zero, A is random — so BA=0 at start (model starts identical to base).
              Scaling factor <code className="font-mono"> α/r </code> controls step size.
            </p>
          </div>
          <div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-3">
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">3. QLoRA — NF4 Quantization (4-bit Normal Float)</p>
            <p className="font-mono text-xs text-violet-600 dark:text-violet-400 mb-2">
              NF4 = 16 quantiles of N(0,1)   ·   base W_0 in NF4, adapters B,A in fp16, paged optimizer
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Dettmers et al. (2023) observed that pretrained LLM weights are approximately
              N(0, σ) — so the optimal 4-bit quantile binning is the 16 equal-mass intervals of the
              standard normal: <code className="font-mono"> nf4_levels = Φ⁻¹((i+0.5)/16) </code>
              for i=0..15. NF4 matches the actual weight distribution, giving lower quantization
              error than uniform int4. Plus <strong>double quantization</strong> (quantize the
              quantization scales themselves) and <strong>paged optimizer</strong> (offload to CPU
              on OOM). Net result: fine-tune LLaMA-65B on a single 48GB GPU (vs 16× A100 80GB for
              full FT — <strong>21× cheaper</strong>). Quality matches full FT on MMLU.
            </p>
          </div>
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">4. RLHF with PPO — reward minus KL penalty</p>
            <p className="font-mono text-xs text-amber-600 dark:text-amber-400 mb-2">
              L_PPO = E_(x,y)~π [ r_φ(x, y) ]  -  β · KL( π_θ(·|x) || π_ref(·|x) )
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              InstructGPT (Ouyang 2022): (1) SFT on demonstrations, (2) train a reward model
              r_φ(x,y) on preference pairs (the Bradley-Terry loss), (3) PPO against the reward
              model with KL penalty β keeping π near π_ref (the SFT model). The KL term prevents
              <strong> reward hacking </strong> (model finds adversarial y to exploit r_φ). PPO is
              on-policy, needs 4 models in memory simultaneously: policy π_θ, ref π_ref, reward r_φ,
              and the critic V_ψ — extremely memory-hungry. This is why DPO was invented.
            </p>
          </div>
          <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3">
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-2">5. DPO — closed-form preference optimization</p>
            <p className="font-mono text-xs text-rose-600 dark:text-rose-400 mb-2">
              L_DPO = -log σ( β · log( π_θ(y_w|x) / π_ref(y_w|x) )  -  β · log( π_θ(y_l|x) / π_ref(y_l|x) ) )
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Rafailov et al. (2023) showed that the RLHF objective has a closed-form solution in
              terms of π_ref. So instead of running PPO, you can train π_θ DIRECTLY on preference
              pairs (y_w, y_l) using the loss above. β is the same KL strength as in PPO. y_w is the
              preferred completion, y_l is the dispreferred. The loss pushes π_θ to assign higher
              relative probability to y_w vs π_ref. <strong>No reward model, no PPO, no critic, no
              on-policy sampling</strong> — just supervised training on preferences. Matches RLHF
              quality at a fraction of the cost.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* LoRA decomposition SVG */}
      <SectionCard
        title="LoRA decomposition (custom SVG)"
        description="LoRA factorizes the weight update into two small low-rank matrices B (d×r) and A (r×d), where r ≪ d. The frozen base W_0 is untouched; only B and A get gradients. For LLaMA-7B (d=4096, r=8): 16.8M → 65K params/layer (260× reduction)."
        icon={<Cpu className="h-5 w-5" />}
        badge="architecture"
      >
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 480 180" className="w-full h-auto">
            {/* W_0 (frozen, large) */}
            <rect x="20" y="50" width="100" height="100" rx="3" fill="oklch(0.7 0.12 250)20" stroke="oklch(0.65 0.16 250)" strokeWidth="1.5" />
            <text x="70" y="105" textAnchor="middle" fontSize="14" fontWeight="bold" fill="oklch(0.65 0.16 250)">W_0</text>
            <text x="70" y="165" textAnchor="middle" fontSize="9" fill="oklch(0.55 0.05 250)">d × d  (frozen)</text>
            <text x="70" y="40" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 250)" fontWeight="bold">FROZEN base</text>

            {/* + sign */}
            <text x="135" y="105" textAnchor="middle" fontSize="20" fill="var(--foreground)">+</text>

            {/* B (d × r) - tall thin */}
            <rect x="155" y="50" width="20" height="100" rx="2" fill="oklch(0.7 0.16 165)30" stroke="oklch(0.65 0.16 165)" strokeWidth="1.5" />
            <text x="165" y="40" textAnchor="middle" fontSize="11" fontWeight="bold" fill="oklch(0.65 0.16 165)">B</text>
            <text x="165" y="165" textAnchor="middle" fontSize="9" fill="oklch(0.55 0.05 165)">d × r</text>

            {/* × sign */}
            <text x="195" y="105" textAnchor="middle" fontSize="20" fill="var(--foreground)">×</text>

            {/* A (r × d) - short wide */}
            <rect x="215" y="90" width="100" height="20" rx="2" fill="oklch(0.7 0.16 30)30" stroke="oklch(0.65 0.16 30)" strokeWidth="1.5" />
            <text x="265" y="105" textAnchor="middle" fontSize="11" fontWeight="bold" fill="oklch(0.65 0.16 30)">A</text>
            <text x="265" y="80" textAnchor="middle" fontSize="9" fontWeight="bold" fill="oklch(0.65 0.16 30)">trainable</text>
            <text x="265" y="130" textAnchor="middle" fontSize="9" fill="oklch(0.55 0.05 30)">r × d</text>

            {/* = sign */}
            <text x="340" y="105" textAnchor="middle" fontSize="20" fill="var(--foreground)">=</text>

            {/* Result: delta = B @ A (low rank, d × d but rank r) */}
            <rect x="360" y="50" width="100" height="100" rx="3" fill="oklch(0.7 0.16 320)20" stroke="oklch(0.65 0.16 320)" strokeWidth="1.5" strokeDasharray="3,2" />
            <text x="410" y="100" textAnchor="middle" fontSize="11" fontWeight="bold" fill="oklch(0.65 0.16 320)">ΔW</text>
            <text x="410" y="115" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 320)">= B · A</text>
            <text x="410" y="165" textAnchor="middle" fontSize="9" fill="oklch(0.55 0.05 320)">rank ≤ r  (d × d)</text>
            <text x="410" y="40" textAnchor="middle" fontSize="9" fontWeight="bold" fill="oklch(0.65 0.16 320)">update</text>

            {/* Annotation: param counts */}
            <line x1="165" y1="155" x2="165" y2="148" stroke="oklch(0.55 0.05 165)" strokeWidth="0.5" />
            <line x1="265" y1="155" x2="265" y2="138" stroke="oklch(0.55 0.05 30)" strokeWidth="0.5" />
            <text x="215" y="178" textAnchor="middle" fontSize="8" fill="oklch(0.55 0.05 0)">trainable = 2·d·r params (e.g. d=4096, r=8 → 65K vs 16.8M full)</text>
          </svg>
        </div>
      </SectionCard>

      {/* Memory comparison SVG */}
      <SectionCard
        title="Memory comparison: Full FT vs LoRA vs QLoRA (custom SVG)"
        description="Peak VRAM to fine-tune LLaMA-7B. Full FT: 80GB+ (needs 8× A100). LoRA: 24GB (single A10). QLoRA: 6GB (single consumer GPU). The savings come from (a) not storing optimizer state for the frozen base, and (b) quantizing the frozen base to 4 bits."
        icon={<Cpu className="h-5 w-5" />}
        badge="architecture"
      >
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 480 200" className="w-full h-auto">
            {/* Axis */}
            <line x1="120" y1="20" x2="120" y2="180" stroke="var(--muted-foreground)" strokeWidth="1" />
            <line x1="120" y1="180" x2="470" y2="180" stroke="var(--muted-foreground)" strokeWidth="1" />
            <text x="115" y="20" textAnchor="end" fontSize="8" fill="var(--muted-foreground)">100GB</text>
            <text x="115" y="60" textAnchor="end" fontSize="8" fill="var(--muted-foreground)">75GB</text>
            <text x="115" y="100" textAnchor="end" fontSize="8" fill="var(--muted-foreground)">50GB</text>
            <text x="115" y="140" textAnchor="end" fontSize="8" fill="var(--muted-foreground)">25GB</text>
            <text x="115" y="180" textAnchor="end" fontSize="8" fill="var(--muted-foreground)">0</text>

            {/* Full FT bar - 80GB */}
            <rect x="140" y="40" width="60" height="140" fill="oklch(0.65 0.16 30)30" stroke="oklch(0.65 0.16 30)" strokeWidth="1" />
            <text x="170" y="35" textAnchor="middle" fontSize="9" fontWeight="bold" fill="oklch(0.65 0.16 30)">Full FT</text>
            <text x="170" y="190" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 30)" fontWeight="bold">80GB</text>
            <text x="170" y="200" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 30)">7B × (4+4+8) = 112GB</text>

            {/* LoRA bar - 24GB */}
            <rect x="220" y="125" width="60" height="55" fill="oklch(0.65 0.16 165)30" stroke="oklch(0.65 0.16 165)" strokeWidth="1" />
            <text x="250" y="120" textAnchor="middle" fontSize="9" fontWeight="bold" fill="oklch(0.65 0.16 165)">LoRA</text>
            <text x="250" y="190" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 165)" fontWeight="bold">24GB</text>
            <text x="250" y="200" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 165)">base fp16 + LoRA opt</text>

            {/* QLoRA bar - 6GB */}
            <rect x="300" y="160" width="60" height="20" fill="oklch(0.65 0.16 90)30" stroke="oklch(0.65 0.16 90)" strokeWidth="1" />
            <text x="330" y="155" textAnchor="middle" fontSize="9" fontWeight="bold" fill="oklch(0.65 0.16 90)">QLoRA</text>
            <text x="330" y="190" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 90)" fontWeight="bold">6GB</text>
            <text x="330" y="200" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 90)">base NF4 + LoRA opt</text>

            {/* DPO bar (similar to LoRA, training-side) */}
            <rect x="380" y="125" width="60" height="55" fill="oklch(0.65 0.16 320)30" stroke="oklch(0.65 0.16 320)" strokeWidth="1" />
            <text x="410" y="120" textAnchor="middle" fontSize="9" fontWeight="bold" fill="oklch(0.65 0.16 320)">DPO</text>
            <text x="410" y="190" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 320)" fontWeight="bold">~24GB</text>
            <text x="410" y="200" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 320)">+ ref model (LoRA ref)</text>

            {/* Title + scale note */}
            <text x="240" y="14" textAnchor="middle" fontSize="10" fontWeight="bold" fill="var(--foreground)">Peak VRAM (LLaMA-7B fine-tune)</text>
          </svg>
        </div>
      </SectionCard>

      {/* RLHF vs DPO pipeline SVG */}
      <SectionCard
        title="RLHF vs DPO pipeline (custom SVG)"
        description="RLHF needs 3 stages: SFT → Train Reward Model → PPO (4 models in memory: policy, ref, reward, critic). DPO needs 2 stages: SFT → DPO (2 models in memory: policy, ref). DPO trains directly on preferences — no reward model, no RL."
        icon={<Network className="h-5 w-5" />}
        badge="architecture"
      >
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 480 220" className="w-full h-auto">
            {/* === RLHF (top) === */}
            <text x="20" y="20" fontSize="10" fontWeight="bold" fill="oklch(0.65 0.16 30)">RLHF — 3 stages, 4 models in memory</text>

            {/* SFT */}
            <rect x="20" y="30" width="55" height="22" rx="3" fill="oklch(0.65 0.16 30)20" stroke="oklch(0.65 0.16 30)" strokeWidth="1" />
            <text x="47" y="44" textAnchor="middle" fontSize="8" fill="oklch(0.65 0.16 30)" fontWeight="bold">SFT</text>

            <line x1="77" y1="41" x2="92" y2="41" stroke="oklch(0.55 0.05 30)" strokeWidth="1" markerEnd="url(#rlhf-arrow)" />

            {/* Reward Model */}
            <rect x="95" y="30" width="65" height="22" rx="3" fill="oklch(0.65 0.16 30)20" stroke="oklch(0.65 0.16 30)" strokeWidth="1" />
            <text x="127" y="44" textAnchor="middle" fontSize="8" fill="oklch(0.65 0.16 30)" fontWeight="bold">Reward M.</text>

            <line x1="162" y1="41" x2="177" y2="41" stroke="oklch(0.55 0.05 30)" strokeWidth="1" markerEnd="url(#rlhf-arrow)" />

            {/* PPO */}
            <rect x="180" y="25" width="60" height="32" rx="3" fill="oklch(0.65 0.16 30)30" stroke="oklch(0.65 0.16 30)" strokeWidth="1.5" />
            <text x="210" y="38" textAnchor="middle" fontSize="8" fill="oklch(0.65 0.16 30)" fontWeight="bold">PPO</text>
            <text x="210" y="50" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 30)">4 models live</text>

            <line x1="242" y1="41" x2="257" y2="41" stroke="oklch(0.55 0.05 30)" strokeWidth="1" markerEnd="url(#rlhf-arrow)" />

            {/* Aligned model */}
            <rect x="260" y="30" width="65" height="22" rx="3" fill="oklch(0.65 0.16 30)20" stroke="oklch(0.65 0.16 30)" strokeWidth="1" />
            <text x="292" y="44" textAnchor="middle" fontSize="8" fill="oklch(0.65 0.16 30)" fontWeight="bold">aligned π_θ</text>

            {/* RLHF memory annotation */}
            <text x="210" y="70" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 30)">PPO step: π_θ + π_ref + r_φ + V_ψ  (~4× base memory)</text>

            {/* === DPO (bottom) === */}
            <text x="20" y="120" fontSize="10" fontWeight="bold" fill="oklch(0.65 0.16 165)">DPO — 2 stages, 2 models in memory</text>

            {/* SFT */}
            <rect x="20" y="130" width="55" height="22" rx="3" fill="oklch(0.65 0.16 165)20" stroke="oklch(0.65 0.16 165)" strokeWidth="1" />
            <text x="47" y="144" textAnchor="middle" fontSize="8" fill="oklch(0.65 0.16 165)" fontWeight="bold">SFT</text>

            <line x1="77" y1="141" x2="172" y2="141" stroke="oklch(0.55 0.05 165)" strokeWidth="1" markerEnd="url(#dpo-arrow)" />
            <text x="125" y="135" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 165)">preference pairs (y_w, y_l)</text>

            {/* DPO */}
            <rect x="175" y="125" width="65" height="32" rx="3" fill="oklch(0.65 0.16 165)30" stroke="oklch(0.65 0.16 165)" strokeWidth="1.5" />
            <text x="207" y="138" textAnchor="middle" fontSize="8" fill="oklch(0.65 0.16 165)" fontWeight="bold">DPO loss</text>
            <text x="207" y="150" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 165)">-log σ(β·Δ log)</text>

            <line x1="242" y1="141" x2="257" y2="141" stroke="oklch(0.55 0.05 165)" strokeWidth="1" markerEnd="url(#dpo-arrow)" />

            {/* Aligned model */}
            <rect x="260" y="130" width="65" height="22" rx="3" fill="oklch(0.65 0.16 165)20" stroke="oklch(0.65 0.16 165)" strokeWidth="1" />
            <text x="292" y="144" textAnchor="middle" fontSize="8" fill="oklch(0.65 0.16 165)" fontWeight="bold">aligned π_θ</text>

            {/* DPO memory annotation */}
            <text x="207" y="170" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 165)">DPO step: π_θ + π_ref  (~2× base memory, NO reward model)</text>

            {/* Savings annotation */}
            <text x="20" y="205" fontSize="9" fill="oklch(0.55 0.05 0)">DPO = same quality as RLHF (Rafailov 2023, <strong>~3-6× cheaper</strong>, simpler code, no reward hacking)</text>

            <defs>
              <marker id="rlhf-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6" fill="oklch(0.65 0.16 30)" />
              </marker>
              <marker id="dpo-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6" fill="oklch(0.65 0.16 165)" />
              </marker>
            </defs>
          </svg>
        </div>
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: LoRA rank-r factorization + NF4 quantization + DPO loss (Pyodide)"
        description="Pure-Python simulation of the 4 core operations: (1) param count for various LoRA ranks, (2) rank-r factorization via alternating gradient descent (Eckart-Young in spirit), (3) NF4 quantile binning via bisection on the normal CDF, (4) DPO loss on simulated preference log-ratios."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={MATH_DEMO} buttonLabel="Run fine-tuning math (Pyodide)" />
      </SectionCard>

      {/* Comparison */}
      <SectionCard
        title="Evolution: Full FT → LoRA → QLoRA → Prefix Tuning → DPO"
        description="How LLM fine-tuning evolved from full gradient descent (2018) to modern PEFT (2021-2023) and preference-based alignment (2022-2023)."
        icon={<Boxes className="h-5 w-5" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30">
              <tr className="border-b border-border/60">
                <th className="text-left px-3 py-2 font-semibold">Feature</th>
                <th className="text-left px-3 py-2 font-semibold">Full FT</th>
                <th className="text-left px-3 py-2 font-semibold">LoRA</th>
                <th className="text-left px-3 py-2 font-semibold text-primary">QLoRA</th>
                <th className="text-left px-3 py-2 font-semibold">Prefix Tuning</th>
                <th className="text-left px-3 py-2 font-semibold">DPO</th>
              </tr>
            </thead>
            <tbody>
              {[
                { f: "Year / paper", a: "Pre-2019", b: "Hu 2021", c: "Dettmers 2023", d: "Li and Liang 2021", e: "Rafailov 2023" },
                { f: "Trainable %", a: "100%", b: "0.1-1%", c: "0.1-1% (in fp16)", d: "0.01% (prefix only)", e: "100% (or LoRA)" },
                { f: "Memory (7B)", a: "~80GB+", b: "24GB", c: "6GB", d: "20GB", e: "24GB (with ref)" },
                { f: "Quality", a: "Best (full)", b: "Matches full", c: "Matches LoRA", d: "Slight drop", e: "Matches RLHF" },
                { f: "Task type", a: "Any", b: "Any", c: "Any (consumer GPU)", d: "Generation-heavy", e: "Alignment / chat" },
                { f: "Trainable target", a: "All weights", b: "B, A matrices", c: "B, A (NF4 base)", d: "Prefix vectors", e: "All or LoRA weights" },
                { f: "Best for", a: "Frontier pretraining", b: "Standard fine-tunes", c: "Consumer GPU fine-tunes", d: "Lightweight multi-task", e: "Chat / preference alignment" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{row.f}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.a}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.b}</td>
                  <td className="px-3 py-2 text-primary/80">{row.c}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.d}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.e}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Why evolved */}
      <SectionCard
        title="Why fine-tuning evolved — shortfalls of full FT and RLHF"
        description="Fine-tuning evolved because full gradient descent was too expensive and RLHF was too complex. LoRA, QLoRA, and DPO each solved a specific shortfall."
        icon={<History className="h-5 w-5" />}
        badge="Why PEFT"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Shortfall 1: Full FT is too expensive.</strong> Training every weight in a 7B model needs ~80GB VRAM (model + grads + Adam state + activations). Only frontier labs can afford this. LoRA observed that the UPDATE ΔW = W_tuned - W_pretrained is empirically low rank — so instead of learning d² params, learn 2·d·r. Same quality, 100× fewer trainable params, runs on a single GPU.</p>
          <p><strong className="text-foreground/80">Shortfall 2: Even LoRA needs the frozen base in memory.</strong> A 7B fp16 model still needs 14GB just to hold the weights. QLoRA addressed this with NF4 quantization (4-bit weights + 4-bit scales + LoRA in fp16). Cuts memory to 6GB. Lets a 70B model fine-tune on a single 48GB GPU — that's the difference between renting 8 A100s ($24/hr) vs 1 GPU ($2/hr).</p>
          <p><strong className="text-foreground/80">Shortfall 3: RLHF is complex and unstable.</strong> RLHF needs 3 stages (SFT → RM → PPO) and 4 models in memory simultaneously (policy, ref, reward, critic). PPO is on-policy — you sample from π_θ every step, which is slow. Reward hacking is a constant problem. DPO (Rafailov 2023) showed that the KL-regularized RL objective has a <strong>closed-form solution</strong> in terms of π_ref — so you can train directly on preference pairs with a single cross-entropy-style loss. No reward model, no PPO, no critic, no on-policy sampling. Same quality, ~3-6× cheaper.</p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique fine-tuning features"
        description="Four features that make modern fine-tuning unique."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. LoRA = low-rank prior</p>
            <p className="text-muted-foreground">Weight updates have intrinsic low rank. <strong>Full FT: ignores this, wastes params.</strong> LoRA exploits it.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. QLoRA = data-type-aware quant</p>
            <p className="text-muted-foreground">NF4 matches the actual weight distribution (Gaussian). <strong>Uniform int4: ignores distribution.</strong> NF4 = 8× compression, fp16 quality.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. DPO = no RL needed</p>
            <p className="text-muted-foreground">Closed-form solution to KL-regularized RL objective. <strong>PPO: complex, unstable.</strong> DPO = supervised training on preferences.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. PEFT = modular adapters</p>
            <p className="text-muted-foreground">Swap LoRA adapters per task — base model stays frozen. <strong>Full FT: one model per task = huge storage.</strong> LoRA = 50MB adapters, swappable at runtime.</p>
          </div>
        </div>
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — fine-tuning implementations"
        description="The frameworks that implement fine-tuning."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Frameworks</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>PEFT (HuggingFace)</strong> — LoRA, QLoRA, Prefix, Prompt, P-Tuning</li>
              <li>• <strong>TRL (HuggingFace)</strong> — SFT, DPO, PPO, ORPO, KTO</li>
              <li>• <strong>Axolotl</strong> — config-driven multi-method fine-tuning</li>
              <li>• <strong>Unsloth</strong> — 2× faster LoRA, hand-tuned Triton kernels</li>
              <li>• <strong>LLaMA-Factory</strong> — UI-driven, supports 50+ methods</li>
              <li>• <strong>OpenRLHF</strong> — distributed PPO + DPO at scale</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-primary" /> Optimizations</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>bitsandbytes</strong> — NF4 / int8 CUDA kernels</li>
              <li>• <strong>paged optimizer (Adam 8bit)</strong> — offload on OOM</li>
              <li>• <strong>Liger Kernel</strong> — fused RMSNorm + SwiGLU + CE</li>
              <li>• <strong>Flash Attention 2</strong> — 2-3× faster attention</li>
              <li>• <strong>FSDP / ZeRO-3</strong> — shard params across GPUs</li>
              <li>• <strong>DeepSpeed-Robust</strong> — train on unreliable nodes</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers that defined modern LLM fine-tuning."
        icon={<TrendingUp className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Hu et al. 2021 (LoRA):</strong> "LoRA: Low-Rank Adaptation of Large Language Models" — showed that the fine-tuning weight update ΔW has low intrinsic rank. Factorize as W = W_0 + B·A with r ≪ d. Trains in 1/3 the time, 1/10 the memory, matches full FT quality. Now the standard for community fine-tunes (civitai, llama.cpp adapters).</p>
          <p><strong className="text-foreground/80">Dettmers et al. 2023 (QLoRA):</strong> "QLoRA: Efficient Finetuning of Quantized LLMs" — NF4 4-bit quantization (16 quantiles of N(0,1)) + double quantization + paged optimizer. Made it possible to fine-tune 65B LLaMA on a single 48GB GPU. Quality matches full fp16 on MMLU / GSM8K.</p>
          <p><strong className="text-foreground/80">Ouyang et al. 2022 (InstructGPT):</strong> "Training language models to follow instructions with human feedback" — the OpenAI RLHF recipe: SFT → reward model → PPO with KL. Defined the modern alignment stack. All of InstructGPT / GPT-3.5 / GPT-4 use this pipeline.</p>
          <p><strong className="text-foreground/80">Rafailov et al. 2023 (DPO):</strong> "Direct Preference Optimization" — derived a closed-form solution to the KL-regularized RL objective, letting you train directly on preference pairs. No reward model, no PPO, no critic. Matches RLHF quality at ~3-6× lower cost. Now standard for chat alignment (Llama-3, Mistral, Zephyr).</p>
          <p><strong className="text-foreground/80">Li &amp; Liang 2021 (Prefix Tuning):</strong> "Prefix-Tuning: Optimizing Continuous Prompts for Generation" — only train 0.1% of params (prefix vectors). Started the PEFT movement that LoRA dominated.</p>
        </div>
      </SectionCard>

      {/* Insight */}
      <SectionCard
        title="My deeper thought: fine-tuning is all about low-dim structure"
        description="The unifying view: every modern fine-tuning method exploits a different low-dim structure in the LLM's parameter space."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">LoRA exploits the low rank of weight updates.</strong> Aghajanyan et al. (2020) showed that fine-tuning BERT works fine even when you project gradients into a ~200-dim subspace — the intrinsic dimension is low. LoRA takes this literally: parameterize ΔW as B·A (rank r). The pretraining already learned the high-rank structure; fine-tuning just needs to nudge along a few directions.</p>
          <p><strong className="text-foreground/80">QLoRA exploits the Gaussian distribution of pretrained weights.</strong> A 7B model has ~7B weights, and they're approximately N(0, σ). So instead of uniform 4-bit bins (which waste resolution on the tails), NF4 puts 16 bins at the actual quantiles of the normal distribution. This is the <strong> information-theoretically optimal 4-bit code</strong> for normally-distributed data. You pay no quality loss for the 8× memory savings.</p>
          <p><strong className="text-foreground/80">DPO exploits the closed form of KL-regularized RL.</strong> The RLHF objective max E[r(x,y)] - β·KL(π||π_ref) has a known optimal solution: π*(y|x) ∝ π_ref(y|x) · exp(r(x,y)/β). Plugging this back and rearranging gives a loss in terms of <strong>log ratios of π vs π_ref</strong> — directly trainable on preference pairs via the Bradley-Terry model. DPO is RLHF with the variational gap closed. There's no approximation, no instability, no sampling. The math was always there — Rafailov just found the right change of variables.</p>
        </div>
      </SectionCard>


      <DeeperThoughtSection pageTitle="Fine Tuning Deep Dive">
        <DeeperThought title="Fine-tuning IS transfer learning — and it's the right pattern" connectedTo="ADR-034 (ESM-2 + AlphaFold2)">
          <p>{"Fine-tuning takes a pre-trained model (trained on general data) and adapts it to a specific task (trained on task-specific data). This IS transfer learning: the general features (learned during pre-training) transfer to the specific task. The math (gradient descent on the task-specific loss, starting from pre-trained weights) IS the SAME as gradient descent from random initialization — just with a better starting point. Fine-tuning IS gradient descent with a head start."}</p>
        </DeeperThought>
        <DeeperThought title="LoRA IS the low-rank adaptation — and it's the right decomposition" connectedTo="ADR-022 (pgvector for variant embeddings)">
          <p>{"LoRA (Low-Rank Adaptation) approximates the weight update ΔW = A·B where A is (d, r) and B is (r, d) with r << d. This IS a low-rank approximation — the SAME math as truncated SVD (keep only the top-r singular values). The insight: weight updates during fine-tuning ARE low-rank (most of the information is in the pre-trained weights; the fine-tuning only adjusts a few directions). LoRA IS truncated SVD for weight updates — the math (low-rank approximation) IS the same."}</p>
        </DeeperThought>
        <DeeperThought title="PEFT (Parameter-Efficient Fine-Tuning) IS the fold pattern for models" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"Full fine-tuning updates ALL parameters (175B for GPT-3). PEFT (LoRA, adapters, prefix tuning) updates only 0.1-1% of parameters. This IS the fold pattern: full fine-tuning IS the 'brief' (all parameters visible); PEFT IS the 'deeper thought' (only the essential parameters updated). The pattern (summary + details) IS the same. PEFT IS the fold pattern for neural networks — the math (low-rank + sparsity) IS the right decomposition."}</p>
        </DeeperThought>
        <DeeperThought title="Fine-tuning vs RAG IS the update-the-model vs update-the-context debate" connectedTo="ADR-033 (multimodal RAG)">
          <p>{"RAG retrieves relevant documents and includes them in the prompt (no weight changes). Fine-tuning changes the model's weights (no retrieval). The trade-off: RAG is fast to update (add documents) but limited by context window. Fine-tuning is slow to update (retrain) but unlimited by context. The pattern (context vs weights) IS the same as cache vs compute: RAG IS cache (fast retrieval), fine-tuning IS compute (slow but unlimited). Both are needed."}</p>
        </DeeperThought>
        <DeeperThought title="Instruction tuning IS the alignment step — and it's the RLHF pattern" connectedTo="ADR-006 (RL agentic)">
          <p>{"Instruction tuning (SFT + RLHF) aligns the model to follow instructions. SFT (Supervised Fine-Tuning) teaches the model what to say. RLHF (Reinforcement Learning from Human Feedback) teaches the model what humans prefer. The RL in RLHF IS the SAME math as the RL-agentic page: policy gradient (PPO) on the reward model. The reward IS human preference. RLHF IS the RL card applied to language model alignment. The math (policy gradient + reward) IS the same."}</p>
        </DeeperThought>
      </DeeperThoughtSection>
      <RelatedTopics topics={[
        { id: "fine-tuning" as const, reason: "Fine-tuning overview page" },
        { id: "transformer-deep-dive" as const, reason: "The model being fine-tuned" },
        { id: "diffusion-models-deep-dive" as const, reason: "Fine-tune diffusion U-Nets" },
        { id: "quantization-inference" as const, reason: "Inference-time quantization (GPTQ, AWQ)" },
        { id: "distributed-training" as const, reason: "FSDP / DeepSpeed for full FT" },
        { id: "inference-serving" as const, reason: "Serve fine-tuned adapters (vLLM)" },
        { id: "mlflow-deep-dive" as const, reason: "Track fine-tuning experiments" },
        { id: "agent-frameworks" as const, reason: "Agents built on fine-tuned LLMs" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("fine-tuning")} className="text-sm text-primary hover:underline">&rarr; Fine-tuning overview</Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("transformer-deep-dive")} className="text-sm text-primary hover:underline">&rarr; Transformer Deep Dive</Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("diffusion-models-deep-dive")} className="text-sm text-primary hover:underline">&rarr; Diffusion Models Deep Dive</Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("agent-frameworks")} className="text-sm text-primary hover:underline">&rarr; Agent Frameworks</Link>
      </div>
    </div>
  );
}
