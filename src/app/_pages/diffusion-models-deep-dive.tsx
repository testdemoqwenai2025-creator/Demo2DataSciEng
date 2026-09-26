"use client";

import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Atom, Brain, Sparkles, History, TrendingUp, Boxes, Server, Cpu, Zap, Layers, Network } from "lucide-react";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";

const KPIS = [
  { label: "Origin", value: "Sohl-Dickstein 2015", hint: "Diffusion probabilistic models — formalized in 2015, made practical by Ho et al. (DDPM, 2020). Foundation of Stable Diffusion, DALL-E 3, Sora.", deltaTone: "flat" as const },
  { label: "Sampling", value: "1000 → 1 step", hint: "DDPM needs 1000 sequential denoising steps. DDIM/DPM-Solver reduce to 20. LCM/DMD distill to 1-4 steps.", deltaTone: "down" as const },
  { label: "Latent", value: "512² → 64² (LDM)", hint: "Latent Diffusion (Rombach 2022) compresses pixel space 64× via a pretrained VAE before diffusion — 8× cheaper training/inference.", deltaTone: "up" as const },
  { label: "Adoption", value: "SD, DALL-E, Sora", hint: "Every modern text-to-image / text-to-video model is built on diffusion. Sora (OpenAI, 2024) is a spatio-temporal latent diffusion transformer.", deltaTone: "up" as const },
];

const MATH_DEMO = `# ============================================================
# Diffusion Math — forward process, reverse, guidance
# Pure Python (Pyodide, math + random only)
# ============================================================

import math
import random

random.seed(42)

# --- 1. Forward diffusion: q(x_t|x_{t-1}) = N(sqrt(1-b_t) x_{t-1}, b_t I)
# Beta schedule: linear from b_1 = 1e-4 to b_T = 2e-2

T = 30
betas = [1e-4 + (2e-2 - 1e-4) * t / T for t in range(T)]

def forward_step(x_prev, beta):
    """One forward step: x_t = sqrt(1-b) x_{t-1} + sqrt(b) * noise."""
    noise = random.gauss(0, 1)
    return math.sqrt(1 - beta) * x_prev + math.sqrt(beta) * noise

# Start from a clean "image" (a single scalar intensity for simplicity)
x0 = 0.7  # "clean pixel"
x_t = x0
trajectory = [x_t]
print("=== Forward Diffusion Process ===")
print(f"  x_0 (clean) = {x_t:.3f}")
for t in range(T):
    x_t = forward_step(x_t, betas[t])
    trajectory.append(x_t)
    if t in (0, 4, 9, 14, 19, 24, 29) or t == T - 1:
        print(f"  x_{t+1:>2d} = {x_t:+.3f}  (beta={betas[t]:.4f})")
print(f"  x_T (pure noise) ~ {x_t:.3f}  (should be ~ N(0,1))")
print()

# --- 2. Closed-form: q(x_t | x_0) = N(sqrt(alpha_bar_t) x_0, (1-alpha_bar_t) I)
# alpha_t = 1 - beta_t, alpha_bar_t = prod alpha_s

alphas = [1 - b for b in betas]
log_alpha_bar = 0.0
alpha_bars = []
for a in alphas:
    log_alpha_bar += math.log(a)
    alpha_bars.append(math.exp(log_alpha_bar))

print("=== Closed-Form Forward (skip to any t) ===")
for t in (5, 15, 25, 29):
    ab = alpha_bars[t]
    mean = math.sqrt(ab) * x0
    std = math.sqrt(1 - ab)
    print(f"  q(x_{t+1:>2d}|x_0): mean = sqrt(ab) * x0 = {mean:.3f}, std = {std:.3f}")
print()

# --- 3. Simplified DDPM loss: L = E[ || eps - eps_theta(x_t, t) ||^2 ]
# The model predicts the NOISE eps (not the mean).
# Simulated: assume our model eps_theta = eps + small_error

random.seed(7)
eps_true = [random.gauss(0, 1) for _ in range(64)]  # true noise
model_error_std = 0.1
eps_pred = [eps_true[i] + random.gauss(0, model_error_std) for i in range(64)]
mse = sum((eps_pred[i] - eps_true[i])**2 for i in range(64)) / 64
print("=== DDPM Training Loss ===")
print(f"  Model error std = {model_error_std}")
print(f"  MSE = E[||eps - eps_theta||^2] = {mse:.4f}")
print(f"  (Note: real eps_theta is a U-Net; here we simulate the residual.)")
print()

# --- 4. Score function: s_theta(x,t) ~= grad_x log p_t(x)
# Relationship: eps_theta(x,t) = -sqrt(1 - alpha_bar_t) * s_theta(x,t)
# So predicting noise IS predicting the score (up to a known scaling).

print("=== Score-Matching View ===")
for t in (5, 15, 25, 29):
    ab = alpha_bars[t]
    scale = -1.0 / math.sqrt(1 - ab)
    print(f"  t={t+1:>2d}: eps_theta = {scale:.3f} * s_theta  (scale blows up as t->T)")
print()

# --- 5. Classifier-free guidance: eps_tilde = (1+w) eps_theta(c) - w eps_theta(null)
# w=0  -> pure conditional (sample what the prompt says)
# w=1  -> balanced
# w>1  -> sharpened (push away from unconditional, towards conditional)

def eps_cond(c_val, t, base=0.5):
    return base + 0.3 * c_val  # conditional score

def eps_uncond(t, base=0.5):
    return base  # unconditional score (no prompt info)

print("=== Classifier-Free Guidance ===")
c = 1.0  # prompt embedding strength
for w in (0, 1, 3, 7):
    guided = (1 + w) * eps_cond(c, 0) - w * eps_uncond(0)
    print(f"  w={w}: eps_tilde = {guided:.3f}  (cond={eps_cond(c,0):.3f}, uncond={eps_uncond(0):.3f})")
print(f"  Higher w -> stronger prompt adherence (but less diversity)")
print()

# --- 6. Memory: pixel diffusion vs latent diffusion ---
# Pixel 512x512x3 = 786,432 features
# Latent 64x64x4 = 16,384 features (48x reduction)
pixel_feat = 512 * 512 * 3
latent_feat = 64 * 64 * 4
print("=== Latent Diffusion Compression ===")
print(f"  Pixel space 512x512x3 = {pixel_feat:,} features")
print(f"  Latent space 64x64x4 = {latent_feat:,} features (after VAE)")
print(f"  Compression ratio: {pixel_feat / latent_feat:.1f}x")
print(f"  U-Net compute in latent space: ~{pixel_feat / latent_feat:.0f}x cheaper")`;

export function DiffusionModelsDeepDivePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Diffusion · DDPM · Score matching · Latent Diffusion · Classifier-free guidance · Flow Matching"
        title="Diffusion Models Deep Dive — the math behind Stable Diffusion, DALL-E, and Sora"
        description="Diffusion models generate images by learning to reverse a gradual noising process. The forward process q(x_t|x_(t-1)) = N(√(1-β_t) x_(t-1), β_t I) corrupts data over T steps; the reverse process p_θ(x_(t-1)|x_t) = N(μ_θ, Σ_θ) is a neural network (U-Net) that learns to denoise. Training reduces to predicting noise: L = E[||ε - ε_θ(x_t,t)||²]. Latent Diffusion (Rombach 2022) runs this in a VAE-compressed latent space (64× compression). Classifier-free guidance ε̃ = (1+w) ε_θ(c) - w ε_θ(∅) steers generation toward text prompts. This deep dive covers the math, custom SVG diagrams of forward/reverse + latent architecture, a Pyodide demo simulating the forward process, and the evolution from DDPM to Flow Matching."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Atom className="h-3 w-3" /> DDPM</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> CFG</Badge>
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
        title="Mathematical foundations — forward, reverse, loss, score, guidance"
        description="The 5 core equations of diffusion models: forward noising, reverse denoising, simplified loss, score function view, and classifier-free guidance."
        icon={<Brain className="h-5 w-5" />}
        badge="mathematics"
      >
        <div className="space-y-4">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm font-semibold text-primary mb-2">1. Forward Process — q(x_t | x_(t-1))</p>
            <p className="font-mono text-xs text-primary mb-2">
              q(x_t | x_(t-1)) = N( √(1 - β_t) · x_(t-1),  β_t · I )
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A fixed (non-learned) Markov chain adds Gaussian noise at each step, controlled by a
              variance schedule β_1 ... β_T (typically linear from 1e-4 to 2e-2, or cosine as in
              <strong> improved-DDPM</strong>). The closed-form marginal
              <code className="font-mono"> q(x_t | x_0) = N( √(ᾱ_t) · x_0, (1-ᾱ_t) · I ) </code>
              where <code className="font-mono"> ᾱ_t = ∏_s=1..t (1 - β_s) </code> lets us sample x_t at any
              timestep t directly from x_0 — this is the key training trick: pick random t, sample x_t,
              predict noise. As t → T, ᾱ_t → 0 and x_T ~ N(0, I) (pure noise).
            </p>
          </div>
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">2. Reverse Process — p_θ(x_(t-1) | x_t)</p>
            <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 mb-2">
              p_θ(x_(t-1) | x_t) = N( μ_θ(x_t, t),  Σ_θ(x_t, t) )
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The reverse process is a learned Markov chain that denoises. In practice, the model
              (a U-Net) predicts the noise ε_θ(x_t, t) instead of the mean directly. The mean is then
              computed analytically:
              <code className="font-mono"> μ_θ = (1/√α_t) · (x_t - (β_t / √(1-ᾱ_t)) · ε_θ(x_t, t)) </code>.
              The variance Σ_θ is often fixed to β_t or learned. Sampling runs T sequential steps
              x_T → x_(T-1) → ... → x_0 — this is the slow part that DDIM/DPM-Solver accelerate.
            </p>
          </div>
          <div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-3">
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">3. Simplified Loss — L_simple</p>
            <p className="font-mono text-xs text-violet-600 dark:text-violet-400 mb-2">
              L = E(t~U[1,T], x_0~q, ε~N(0,I)) [ || ε - ε_θ(x_t, t) ||² ]
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ho et al. (DDPM 2020) showed that a simplified MSE loss on noise prediction works much
              better than the full variational lower bound. Training is dead simple: (1) sample a real
              image x_0, (2) sample a random timestep t, (3) sample noise ε ~ N(0, I), (4) compute
              x_t = √(ᾱ_t) · x_0 + √(1-ᾱ_t) · ε (the closed-form forward), (5) predict ε_θ(x_t, t),
              (6) gradient step on ||ε - ε_θ||². No adversarial training, no reinforcement learning —
              just MSE regression.
            </p>
          </div>
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">4. Score-Matching View — s_θ ≈ ∇_x log p_t(x)</p>
            <p className="font-mono text-xs text-amber-600 dark:text-amber-400 mb-2">
              s_θ(x, t) ≈ ∇_x log p_t(x)   ⇔   ε_θ(x, t) = -√(1 - ᾱ_t) · s_θ(x, t)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Song &amp; Ermon (2019) connected diffusion to score-based generative models. The score
              function ∇_x log p(x) tells you which direction increases the data density. Diffusion
              models implicitly learn this via noise prediction — they're equivalent up to a known
              scaling factor. <strong>SDE formulation (Song 2021):</strong> the discrete Markov chain
              becomes a continuous SDE <code className="font-mono"> dx = f(x,t) dt + g(t) dw </code>,
              and the reverse SDE uses the learned score. This unified view gives continuous-time
              diffusion, score-based models, and DDPMs as special cases.
            </p>
          </div>
          <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3">
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-2">5. Classifier-Free Guidance (CFG) — ε̃</p>
            <p className="font-mono text-xs text-rose-600 dark:text-rose-400 mb-2">
              ε̃ = (1 + w) · ε_θ(x_t, t, c)  -  w · ε_θ(x_t, t, ∅)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ho &amp; Salimans (2022) trained a single diffusion model with prompt c dropped (∅) with
              probability ~10% — so the same network can run both conditional and unconditional. At
              inference, the guided noise is a linear combination: push toward the prompt
              <code className="font-mono"> ε_θ(c) </code> and away from the unconditional
              <code className="font-mono"> ε_θ(∅) </code>. Guidance scale w controls prompt
              adherence: w=0 = pure conditional (diverse, prompt-loose), w=3-7 = standard
              (SharpPrompt), w&gt;10 = exaggerated (mode collapse). CFG replaced the older
              <strong> classifier guidance </strong> (which needed a separate image classifier).
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Forward/Reverse SVG */}
      <SectionCard
        title="Forward / reverse process (custom SVG)"
        description="The forward process (top) gradually corrupts a clean image x_0 into pure noise x_T; the reverse process (bottom) learns to denoise x_T back into a generated x_0'. Both are Markov chains."
        icon={<Atom className="h-5 w-5" />}
        badge="architecture"
      >
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 480 240" className="w-full h-auto">
            {/* Forward process label */}
            <text x="20" y="22" fontSize="10" fill="oklch(0.65 0.16 30)" fontWeight="bold">Forward q(x_t|x_(t-1)) — adds noise</text>
            {/* Forward row */}
            {[
              { x: 40, label: "x_0", tone: "30", opacity: 1, dim: 0 },
              { x: 130, label: "x_1", tone: "30", opacity: 0.8, dim: 0.2 },
              { x: 220, label: "x_2", tone: "30", opacity: 0.6, dim: 0.4 },
              { x: 310, label: "...", tone: "30", opacity: 0.5, dim: 0.5 },
              { x: 400, label: "x_T", tone: "30", opacity: 0.3, dim: 0.7 },
            ].map((node, i) => (
              <g key={`f-${i}`}>
                <rect x={node.x} y={40} width="50" height="50" rx="4" fill={`oklch(0.75 0.15 ${node.tone})`} opacity={node.opacity} stroke={`oklch(0.65 0.16 ${node.tone})`} strokeWidth="1" />
                <text x={node.x + 25} y={68} textAnchor="middle" fontSize="9" fontWeight="bold" fill="oklch(0.2 0.04 30)">{node.label}</text>
                {/* "image" content - shaded rectangle inside the box */}
                <rect x={node.x + 8} y={48} width="34" height="34" fill="white" opacity={1 - node.dim} />
                <rect x={node.x + 8} y={48} width="34" height="34" fill="oklch(0.4 0.05 30)" opacity={node.dim} />
              </g>
            ))}
            {/* Forward arrows */}
            {[90, 180, 270, 360].map((x, i) => (
              <g key={`fa-${i}`}>
                <line x1={x} y1={65} x2={x + 30} y2={65} stroke="oklch(0.65 0.16 30)" strokeWidth="1.5" markerEnd="url(#diff-arrow-fwd)" />
                <text x={x + 15} y={58} textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 30)">q_t</text>
              </g>
            ))}

            {/* Reverse process label */}
            <text x="20" y="155" fontSize="10" fill="oklch(0.65 0.16 165)" fontWeight="bold">Reverse p_θ(x_(t-1)|x_t) — U-Net denoises</text>
            {/* Reverse row (mirrored) */}
            {[
              { x: 400, label: "x_T", tone: "165", opacity: 0.3, dim: 0.7 },
              { x: 310, label: "...", tone: "165", opacity: 0.5, dim: 0.5 },
              { x: 220, label: "x_2", tone: "165", opacity: 0.6, dim: 0.4 },
              { x: 130, label: "x_1", tone: "165", opacity: 0.8, dim: 0.2 },
              { x: 40, label: "x_0", tone: "165", opacity: 1, dim: 0 },
            ].map((node, i) => (
              <g key={`r-${i}`}>
                <rect x={node.x} y={170} width="50" height="50" rx="4" fill={`oklch(0.75 0.15 ${node.tone})`} opacity={node.opacity} stroke={`oklch(0.65 0.16 ${node.tone})`} strokeWidth="1" />
                <text x={node.x + 25} y={198} textAnchor="middle" fontSize="9" fontWeight="bold" fill="oklch(0.2 0.04 165)">{node.label}</text>
                <rect x={node.x + 8} y={178} width="34" height="34" fill="white" opacity={1 - node.dim} />
                <rect x={node.x + 8} y={178} width="34" height="34" fill="oklch(0.4 0.05 165)" opacity={node.dim} />
              </g>
            ))}
            {/* Reverse arrows (pointing left) */}
            {[400, 310, 220, 130].map((x, i) => (
              <g key={`ra-${i}`}>
                <line x1={x} y1={195} x2={x - 30} y2={195} stroke="oklch(0.65 0.16 165)" strokeWidth="1.5" markerEnd="url(#diff-arrow-rev)" />
                <text x={x - 15} y={188} textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 165)">p_θ</text>
              </g>
            ))}

            {/* Bridge: training time -> x_0 = data; sampling time -> x_0' = generated */}
            <text x={65} y={105} fontSize="8" fill="oklch(0.55 0.05 30)" textAnchor="middle">data x_0</text>
            <text x={425} y={105} fontSize="8" fill="oklch(0.55 0.05 30)" textAnchor="middle">noise x_T</text>
            <text x={65} y={232} fontSize="8" fill="oklch(0.55 0.05 165)" textAnchor="middle">generated x_0'</text>
            <text x={425} y={232} fontSize="8" fill="oklch(0.55 0.05 165)" textAnchor="middle">start: N(0, I)</text>

            <defs>
              <marker id="diff-arrow-fwd" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6" fill="oklch(0.65 0.16 30)" />
              </marker>
              <marker id="diff-arrow-rev" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6" fill="oklch(0.65 0.16 165)" />
              </marker>
            </defs>
          </svg>
        </div>
      </SectionCard>

      {/* Latent Diffusion SVG */}
      <SectionCard
        title="Latent diffusion pipeline (custom SVG)"
        description="Latent Diffusion (Rombach 2022) runs the U-Net in a VAE-compressed latent space (512×512×3 → 64×64×4 = 48× compression), making training and inference affordable on consumer GPUs. This is the architecture behind Stable Diffusion 1.x/2.x/3."
        icon={<Atom className="h-5 w-5" />}
        badge="architecture"
      >
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 480 180" className="w-full h-auto">
            {/* Pixel input */}
            <rect x="10" y="60" width="50" height="60" rx="4" fill="oklch(0.65 0.16 30)30" stroke="oklch(0.65 0.16 30)" strokeWidth="1" />
            <text x="35" y="95" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 30)" fontWeight="bold">512²×3</text>
            <text x="35" y="135" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 30)">pixel</text>

            {/* VAE Encoder */}
            <rect x="80" y="65" width="60" height="50" rx="4" fill="oklch(0.65 0.16 90)30" stroke="oklch(0.65 0.16 90)" strokeWidth="1" />
            <text x="110" y="95" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 90)" fontWeight="bold">VAE Enc</text>

            {/* Latent */}
            <rect x="160" y="75" width="40" height="30" rx="4" fill="oklch(0.65 0.16 200)30" stroke="oklch(0.65 0.16 200)" strokeWidth="1" />
            <text x="180" y="95" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 200)" fontWeight="bold">64²×4</text>
            <text x="180" y="120" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 200)">latent z</text>

            {/* U-Net */}
            <rect x="220" y="50" width="100" height="80" rx="4" fill="oklch(0.65 0.16 320)30" stroke="oklch(0.65 0.16 320)" strokeWidth="1.5" />
            <text x="270" y="80" textAnchor="middle" fontSize="10" fill="oklch(0.65 0.16 320)" fontWeight="bold">U-Net ε_θ</text>
            <text x="270" y="98" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 320)">forward + reverse</text>
            <text x="270" y="110" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 320)">in latent space</text>

            {/* text conditioning enters U-Net */}
            <rect x="240" y="15" width="60" height="22" rx="4" fill="oklch(0.65 0.16 165)20" stroke="oklch(0.65 0.16 165)" strokeWidth="1" />
            <text x="270" y="29" textAnchor="middle" fontSize="8" fill="oklch(0.65 0.16 165)" fontWeight="bold">CLIP text</text>
            <line x1="270" y1="38" x2="270" y2="50" stroke="oklch(0.65 0.16 165)" strokeWidth="1" strokeDasharray="2,2" markerEnd="url(#ldm-arrow-t)" />

            {/* Denoised latent */}
            <rect x="340" y="75" width="40" height="30" rx="4" fill="oklch(0.65 0.16 200)30" stroke="oklch(0.65 0.16 200)" strokeWidth="1" />
            <text x="360" y="95" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 200)" fontWeight="bold">z'</text>
            <text x="360" y="120" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 200)">clean latent</text>

            {/* VAE Decoder */}
            <rect x="400" y="65" width="60" height="50" rx="4" fill="oklch(0.65 0.16 90)30" stroke="oklch(0.65 0.16 90)" strokeWidth="1" />
            <text x="430" y="95" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 90)" fontWeight="bold">VAE Dec</text>

            {/* Output pixel image */}
            <rect x="470" y="60" width="50" height="60" rx="4" fill="oklch(0.65 0.16 30)30" stroke="oklch(0.65 0.16 30)" strokeWidth="1" />
            <text x="495" y="95" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 30)" fontWeight="bold">512²×3</text>
            <text x="495" y="135" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 30)">image</text>

            {/* Arrows */}
            <line x1="62" y1="90" x2="78" y2="90" stroke="oklch(0.55 0.05 30)" strokeWidth="1" markerEnd="url(#ldm-arrow)" />
            <line x1="142" y1="90" x2="158" y2="90" stroke="oklch(0.55 0.05 90)" strokeWidth="1" markerEnd="url(#ldm-arrow)" />
            <line x1="202" y1="90" x2="218" y2="90" stroke="oklch(0.55 0.05 200)" strokeWidth="1" markerEnd="url(#ldm-arrow)" />
            <line x1="322" y1="90" x2="338" y2="90" stroke="oklch(0.55 0.05 320)" strokeWidth="1" markerEnd="url(#ldm-arrow)" />
            <line x1="382" y1="90" x2="398" y2="90" stroke="oklch(0.55 0.05 200)" strokeWidth="1" markerEnd="url(#ldm-arrow)" />
            <line x1="462" y1="90" x2="478" y2="90" stroke="oklch(0.55 0.05 90)" strokeWidth="1" markerEnd="url(#ldm-arrow)" />

            {/* Bottom annotation: where diffusion actually runs */}
            <rect x="218" y="140" width="104" height="18" rx="3" fill="oklch(0.65 0.16 30)15" stroke="oklch(0.65 0.16 30)" strokeWidth="0.5" strokeDasharray="2,2" />
            <text x="270" y="152" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 30)">diffusion runs HERE (cheap)</text>

            <defs>
              <marker id="ldm-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.6" />
              </marker>
              <marker id="ldm-arrow-t" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6" fill="oklch(0.65 0.16 165)" />
              </marker>
            </defs>
          </svg>
        </div>
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: forward diffusion + closed-form + guidance (Pyodide)"
        description="Pure-Python simulation of the 5 core operations: step-by-step forward noising, closed-form marginal q(x_t|x_0), simplified DDPM loss, score-function relationship, and classifier-free guidance sweep."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={MATH_DEMO} buttonLabel="Run diffusion math (Pyodide)" />
      </SectionCard>

      {/* Comparison */}
      <SectionCard
        title="Evolution: DDPM → Score-based → Latent Diffusion → Flow Matching"
        description="How diffusion models evolved from the original DDPM (1000 steps, pixel space) to modern Flow Matching (1-step, latent, rectified flow)."
        icon={<Boxes className="h-5 w-5" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30">
              <tr className="border-b border-border/60">
                <th className="text-left px-3 py-2 font-semibold">Feature</th>
                <th className="text-left px-3 py-2 font-semibold">DDPM (2020)</th>
                <th className="text-left px-3 py-2 font-semibold">Score-SDE (2021)</th>
                <th className="text-left px-3 py-2 font-semibold text-primary">Latent (2022)</th>
                <th className="text-left px-3 py-2 font-semibold">Flow Matching (2023)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { f: "Year / paper", a: "Ho et al. 2020", b: "Song et al. 2021", c: "Rombach et al. 2022", d: "Lipman et al. 2023" },
                { f: "Domain", a: "Pixel (256²×3)", b: "Pixel (continuous)", c: "VAE latent (32-64²×4)", d: "Latent or pixel" },
                { f: "Process", a: "Discrete Markov T=1000", b: "Continuous SDE", c: "Discrete in latent", d: "Continuous ODE (rectified flow)" },
                { f: "Loss", a: "MSE on ε", b: "Denoising score match", c: "MSE on ε (latent)", d: "Flow-match MSE on velocity" },
                { f: "Sampling", a: "1000 steps (slow)", b: "1000 → 50 (PC sampler)", c: "20-50 (DPM-Solver)", d: "1-4 (after distillation)" },
                { f: "Compute", a: "8 GPU-days (CIFAR)", b: "Similar to DDPM", c: "150 GPU-days (SD-1.5)", d: "Similar + distillation" },
                { f: "Best-known", a: "Original DDPM", b: "NCSN++ / DDIM++", c: "Stable Diffusion 1/2/3", d: "Stable Diffusion 3, Flux" },
                { f: "Key innovation", a: "Simplified loss works", b: "SDE unifies + faster", c: "Latent = 48× cheaper", d: "Linear path = fewer steps" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{row.f}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.a}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.b}</td>
                  <td className="px-3 py-2 text-primary/80">{row.c}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Why evolved */}
      <SectionCard
        title="Why diffusion evolved — shortfalls of GANs / VAEs"
        description="Diffusion replaced GANs (2014-2020) and VAEs because they had 3 fundamental limitations that the diffusion formulation solved."
        icon={<History className="h-5 w-5" />}
        badge="Why Diffusion"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Shortfall 1: GAN mode collapse.</strong> GANs (Goodfellow 2014) trained a generator against a discriminator — adversarial training is unstable, and the generator often collapses to producing a few modes (low diversity). Diffusion has no adversary — just MSE regression on noise. Stable training, high diversity.</p>
          <p><strong className="text-foreground/80">Shortfall 2: No tractable likelihood.</strong> GANs don't give a probability density p(x) — only samples. VAEs give a lower bound (ELBO), but blurry samples due to the Gaussian decoder assumption. Diffusion gives both samples AND a tractable variational lower bound — and the simplified noise-MSE loss produces sharp images.</p>
          <p><strong className="text-foreground/80">Shortfall 3: No controllability.</strong> GANs need conditional architectures (cGAN, BigGAN) per task; steering generation is hacky (truncation trick, interpolation). Diffusion has principled control via <strong>classifier guidance</strong> (Dhariwal &amp; Nichol 2021) and <strong>classifier-free guidance</strong> (Ho &amp; Salimans 2022) — same model, prompt-steerable sampling.</p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique Diffusion features"
        description="Four features that make diffusion models unique among generative models."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. Stable, no adversary</p>
            <p className="text-muted-foreground">Training is plain MSE regression on noise — no minimax, no mode collapse. <strong>GANs: adversarial training, unstable.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Tractable likelihood</p>
            <p className="text-muted-foreground">Variational lower bound is computable. <strong>GANs: no density estimate.</strong> Diffusion gives both samples AND p(x).</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Principled control (CFG)</p>
            <p className="text-muted-foreground">Classifier-free guidance steers generation with a single scale w — same model handles many tasks. <strong>GANs: one model per task.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Invertible process</p>
            <p className="text-muted-foreground">Forward q has a closed form; reverse p_θ approximates it. <strong>VAEs: encoder is amortized, not exact.</strong> Diffusion is a true generative process.</p>
          </div>
        </div>
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — Diffusion implementations"
        description="The frameworks that implement diffusion architectures."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Frameworks</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Diffusers (HuggingFace)</strong> — Stable Diffusion, Flux, Kandinsky pipelines</li>
              <li>• <strong>CompVis latent-diffusion</strong> — original LDM codebase</li>
              <li>• <strong>Stability-AI generative-models</strong> — SDXL, SD3</li>
              <li>• <strong>OpenAI guided-diffusion</strong> — original classifier-guided code</li>
              <li>• <strong>EDM (Karras 2022)</strong> — improved training/sampling recipe</li>
              <li>• <strong>AnimateDiff</strong> — motion modules for video diffusion</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-primary" /> Optimizations</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>DDIM (Song 2020)</strong> — non-Markovian, 20-50 steps</li>
              <li>• <strong>DPM-Solver (Lu 2022)</strong> — 10-20 step high-quality sampling</li>
              <li>• <strong>Latent Consistency Models</strong> — distill to 1-4 steps</li>
              <li>• <strong>Distribution Matching Distillation (DMD)</strong> — 1-step via 2 networks</li>
              <li>• <strong>xFormers / Flash Attention</strong> — U-Net attention speedup</li>
              <li>• <strong>Tiled VAE</strong> — generate 4K images on 8GB VRAM</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers that defined diffusion models and their modern variants."
        icon={<TrendingUp className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Sohl-Dickstein et al. 2015:</strong> "Deep Unsupervised Learning using Nonequilibrium Thermodynamics" — the original diffusion probabilistic model. Framed generation as reversing a non-equilibrium thermodynamic process. Vision only came later (Ho 2020 made it work).</p>
          <p><strong className="text-foreground/80">Ho et al. 2020 (DDPM):</strong> "Denoising Diffusion Probabilistic Models" — the simplified noise-prediction loss L = E[||ε - ε_θ||²]. Matched GAN quality on CIFAR-10 / LSUN with stable training. The paper that started the diffusion era.</p>
          <p><strong className="text-foreground/80">Song et al. 2021 (Score-SDE):</strong> "Score-Based Generative Modeling through SDEs" — unified DDPM and score-matching under a continuous-time SDE. Enabled fast samplers (PC sampler, probability flow ODE).</p>
          <p><strong className="text-foreground/80">Rombach et al. 2022 (LDM / Stable Diffusion):</strong> "High-Resolution Image Synthesis with Latent Diffusion Models" — move the U-Net into a VAE-compressed latent space (48× cheaper). Released Stable Diffusion 1.4 — open weights, runs on consumer GPUs, sparked the open generative-AI community.</p>
          <p><strong className="text-foreground/80">Ho &amp; Salimans 2022 (CFG):</strong> "Classifier-Free Diffusion Guidance" — single model handles conditional + unconditional, linear-combine at inference. Now standard in every text-to-image model.</p>
          <p><strong className="text-foreground/80">Lipman et al. 2023 (Flow Matching):</strong> "Flow Matching for Generative Modeling" — replaces the curved diffusion path with a straight-line ODE (rectified flow). Fewer steps, simpler math. Powering Stable Diffusion 3 and Black Forest Labs' Flux.</p>
        </div>
      </SectionCard>

      {/* Insight */}
      <SectionCard
        title="My deeper thought: diffusion is score-based denoising in disguise"
        description="The unifying view: DDPM, score-based, and flow matching are all the same idea — learn to denoise — expressed in different frames."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Diffusion IS score-based generative modeling.</strong> The noise predictor ε_θ is the score function ∇log p(x) up to a scaling: <code className="font-mono"> s_θ = -ε_θ / √(1-ᾱ_t) </code>. This is why a 2020 paper (DDPM) and a 2019 paper (score matching) produced nearly identical models — they're dual views of the same generative process. The SDE unification (Song 2021) made this rigorous: every discrete diffusion chain has a continuous SDE, and every continuous SDE has a reverse-time counterpart that uses the score.</p>
          <p><strong className="text-foreground/80">Latent diffusion IS a budget trick.</strong> The VAE pre-compresses 512²×3 → 64²×4 (48× fewer features), and the U-Net does its diffusion dance in the cheap latent space. The VAE decoder maps back. Mathematically equivalent to running diffusion in pixel space (the VAE is invertible), but computationally 48× cheaper. This is the trick that made Stable Diffusion run on a 6GB consumer GPU instead of an 80GB A100.</p>
          <p><strong className="text-foreground/80">Classifier-free guidance IS a linear extrapolation in score space.</strong> The guided score <code className="font-mono"> s̃ = (1+w) s_θ(c) - w s_θ(∅) </code> is a linear combination of conditional and unconditional scores. When w=0, you sample the true conditional distribution. When w&gt;0, you push toward the prompt and away from the marginal — this is exactly <strong>the same math as classifier guidance</strong>, but no separate classifier is needed. CFG IS classifier guidance with the classifier folded into the score (via Bayes' rule: ∇log p(c|x) = ∇log p(x|c) - ∇log p(x)).</p>
        </div>
      </SectionCard>


      <DeeperThoughtSection pageTitle="Diffusion Models Deep Dive">
        <DeeperThought title="Diffusion Models Deep Dive IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about Diffusion Models Deep Dive is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. Diffusion Models Deep Dive connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where Diffusion Models Deep Dive sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (Diffusion Models Deep Dive) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
        </DeeperThought>
        <DeeperThought title="The fold pattern respects the reader's attention" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"This page has fold sections (collapsed by default) that reveal deeper content on demand — equation family comparisons, LaTeX derivations, production patterns, expected outputs, and citations. The basic content is visible immediately; the deeper phases are there when the reader is ready. Progressive disclosure isn't just UX — it's epistemological. A reader who wants the summary gets it; a reader who wants the derivation clicks to expand. Both are served by the same page."}</p>
        </DeeperThought>
        <DeeperThought title="The output IS the proof — not just the equation" connectedTo="ADR-034 (ESM-2 + AlphaFold2 adoption)">
          <p>{"Where this page has interactive demos (Pyodide + sliders + charts), the visual output IS the argument. Seeing a chart update as you drag a slider communicates the math in a way no formula can. The brain's pattern-recognition system processes the visual output faster than the verbal/analytical pathway. That's why the platform pairs every equation with a live demo — the output plays to a different level of the brain than the prose."}</p>
        </DeeperThought>
        <DeeperThought title="In a decade, this page will evolve — and that's the point" connectedTo="ADR-022 (pgvector for variant embeddings)">
          <p>{"The datasets, libraries, and tools on this page will be updated as technology evolves. The 1000-Genomes Project will become the 10M-Genomes Project. NumPy may be replaced by a WebGPU-native array library. PyTorch may give way to a successor. But the math — SVD, Attention, Poisson, FFT, Bayes, Kalman, GBM — will be the same. The platform is designed for this evolution: the equations are the anchor, the tools are the amplifier, and the fold sections let us update the tools without rewriting the page."}</p>
        </DeeperThought>
      </DeeperThoughtSection>
      <RelatedTopics topics={[
        { id: "diffusion-models" as const, reason: "Diffusion overview page" },
        { id: "transformer-deep-dive" as const, reason: "Diffusion U-Nets use attention" },
        { id: "fine-tuning-deep-dive" as const, reason: "Fine-tune diffusion models with LoRA" },
        { id: "computer-vision" as const, reason: "Computer vision context" },
        { id: "mlflow-deep-dive" as const, reason: "Track diffusion training runs" },
        { id: "generative-chemistry-2" as const, reason: "Diffusion for molecule design" },
        { id: "gpu-computing" as const, reason: "GPU acceleration for U-Net" },
        { id: "agent-frameworks" as const, reason: "Agents generate via diffusion" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("diffusion-models")} className="text-sm text-primary hover:underline">&rarr; Diffusion overview</Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("transformer-deep-dive")} className="text-sm text-primary hover:underline">&rarr; Transformer Deep Dive</Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("fine-tuning-deep-dive")} className="text-sm text-primary hover:underline">&rarr; Fine-Tuning Deep Dive</Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("agent-frameworks")} className="text-sm text-primary hover:underline">&rarr; Agent Frameworks</Link>
      </div>
    </div>
  );
}
