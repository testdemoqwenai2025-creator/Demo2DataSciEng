"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { NextSteps } from "../_components/next-steps";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { hrefFor } from "../_lib/router";
import { RelatedElegantCode } from "../_components/related-elegant-code";
import { Badge } from "@/components/ui/badge";
import { Cpu, Brain, Atom, Sparkles, History, TrendingUp, Boxes, Server, Network, Zap, Layers } from "lucide-react";
import { DatasetCards } from "../_components/dataset-cards";
import { ELEGANT_CODE_CARDS } from "../_components/_elegant_code_cards";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";

const KPIS = [
  { label: "Origin", value: "Vaswani 2017 (Google)", hint: "Attention Is All You Need — replaced RNN/LSTM with self-attention. The most-cited AI paper of the decade.", deltaTone: "flat" as const },
  { label: "Parameters", value: "125M → 1.8T+", hint: "GPT-3 (175B), PaLM (540B), LLaMA-3 (405B), GPT-4 (est. 1.8T). Scale drives emergent capabilities.", deltaTone: "up" as const },
  { label: "Attention", value: "O(N²) → Flash O(N²/M)", hint: "Standard attention is quadratic in sequence length. Flash Attention (Dao 2022) tiles to O(N²/M) memory.", deltaTone: "up" as const },
  { label: "Adoption", value: "Every modern LLM", hint: "GPT, LLaMA, Claude, Gemini, Mistral — all use transformer architecture with attention.", deltaTone: "up" as const },
];

const MATH_DEMO = `# ============================================================
# Transformer Math — attention, positional encoding, LayerNorm
# Pure Python (Pyodide, no numpy)
# ============================================================

import math
import random

# --- 1. Scaled Dot-Product Attention ---
# Attention(Q,K,V) = softmax(QK^T / sqrt(d_k)) × V
# Q, K, V are (seq_len, d_k) matrices

def softmax(x):
    m = max(x)
    exps = [math.exp(xi - m) for xi in x]
    s = sum(exps)
    return [e/s for e in exps]

def attention(Q, K, V):
    """Compute attention for a single query (1D vectors)."""
    d_k = len(Q)
    # scores = Q · K^T / sqrt(d_k)
    scores = [sum(Q[i]*K_t[i] for i in range(d_k)) / math.sqrt(d_k)
              for K_t in K]
    # softmax
    weights = softmax(scores)
    # output = weights × V
    d_v = len(V[0])
    output = [sum(weights[j]*V[j][i] for j in range(len(V))) for i in range(d_v)]
    return output, weights

random.seed(42)
d_k = 8  # key dimension
seq_len = 5  # sequence length
Q = [random.gauss(0, 1) for _ in range(d_k)]
K = [[random.gauss(0, 1) for _ in range(d_k)] for _ in range(seq_len)]
V = [[random.gauss(0, 1) for _ in range(d_k)] for _ in range(seq_len)]

out, weights = attention(Q, K, V)
print("=== Scaled Dot-Product Attention ===")
print(f"  d_k = {d_k}, seq_len = {seq_len}")
print(f"  Attention weights (softmax(QK^T/√d_k)): {[f'{w:.3f}' for w in weights]}")
print(f"  Output (weights × V): {[f'{v:.3f}' for v in out[:4]]}...")
print()

# --- 2. Positional Encoding (sinusoidal) ---
# PE(pos, 2i) = sin(pos / 10000^(2i/d_model))
# PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))

def positional_encoding(max_len, d_model):
    """Generate sinusoidal positional encodings."""
    pe = []
    for pos in range(max_len):
        row = []
        for i in range(d_model // 2):
            angle = pos / (10000 ** (2 * i / d_model))
            row.append(math.sin(angle))
            row.append(math.cos(angle))
        pe.append(row)
    return pe

pe = positional_encoding(10, 8)
print("=== Sinusoidal Positional Encoding ===")
print(f"  PE shape: (10, 8) — 10 positions, 8-dim encoding")
print(f"  PE[0] = {[f'{x:.3f}' for x in pe[0]]}")
print(f"  PE[1] = {[f'{x:.3f}' for x in pe[1]]}")
print(f"  PE[5] = {[f'{x:.3f}' for x in pe[5]]}")
print()

# --- 3. Layer Normalization ---
# LayerNorm(x) = gamma * (x - mu) / sigma + beta
# mu = mean(x), sigma = sqrt(var(x) + eps)

def layer_norm(x, gamma=1.0, beta=0.0, eps=1e-5):
    """Layer normalization — normalize across features."""
    mu = sum(x) / len(x)
    var = sum((xi - mu)**2 for xi in x) / len(x)
    sigma = math.sqrt(var + eps)
    return [gamma * (xi - mu) / sigma + beta for xi in x]

x = [random.gauss(5, 3) for _ in range(8)]
normed = layer_norm(x)
print("=== Layer Normalization ===")
print(f"  Input:  {[f'{v:.3f}' for v in x]}")
print(f"  Mean:   {sum(x)/len(x):.3f}, Std: {math.sqrt(sum((xi-sum(x)/len(x))**2 for xi in x)/len(x)):.3f}")
print(f"  Output: {[f'{v:.3f}' for v in normed]}")
print(f"  Mean:   {sum(normed)/len(normed):.3f}, Std: {math.sqrt(sum((ni-sum(normed)/len(normed))**2 for ni in normed)/len(normed)):.3f}")
print()

# --- 4. RMSNorm (LLaMA) ---
# RMSNorm(x) = x / RMS(x) * gamma
# RMS(x) = sqrt(mean(x^2) + eps)

def rms_norm(x, gamma=1.0, eps=1e-5):
    """RMS normalization — simpler than LayerNorm (no mean subtraction)."""
    rms = math.sqrt(sum(xi**2 for xi in x) / len(x) + eps)
    return [xi / rms * gamma for xi in x]

rms = rms_norm(x)
print("=== RMSNorm (LLaMA) ===")
print(f"  Input:  {[f'{v:.3f}' for v in x]}")
print(f"  Output: {[f'{v:.3f}' for v in rms]}")
print(f"  RMSNorm is ~10-20% faster than LayerNorm (no mean computation)")
print()

# --- 5. Flash Attention tiling ---
# Standard: O(N^2) memory (full attention matrix)
# Flash: O(N^2/M) memory (M = SRAM size, ~100KB on A100)
N = 4096  # sequence length
M = 100000  # SRAM in bytes (A100)
standard_mem = N * N * 2  # fp16 attention matrix (bytes)
flash_mem = N * N * 2 / (M / (2 * N * 2))  # tiles of size M
print("=== Flash Attention Memory ===")
print(f"  Seq length N = {N}")
print(f"  Standard attention memory: {standard_mem / 1e9:.1f} GB (full N×N matrix)")
print(f"  Flash attention memory: ~{N * 2 * 2 / 1e6:.1f} MB (O(N) per tile)")
print(f"  Speedup: {standard_mem / (N * 4):.0f}x less memory")
print(f"  Flash tiles Q,K,V into SRAM-sized blocks → O(N²/M) I/O")`;

export function TransformerDeepDivePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Transformer · attention · RoPE · Flash Attention · LayerNorm · SwiGLU · MoE"
        title="Transformer Deep Dive — the architecture behind every modern LLM"
        description="The Transformer (Vaswani 2017) replaced RNN/LSTM with self-attention — Attention(Q,K,V) = softmax(QK^T/√d_k) × V. Every modern LLM (GPT, LLaMA, Claude, Gemini, Mistral) uses this architecture. This deep dive covers the mathematical foundations (multi-head attention, sinusoidal/RoPE/ALiBi positional encoding, LayerNorm/RMSNorm, FFN/SwiGLU, Flash Attention tiling), custom-designed SVG diagrams, Pyodide demos implementing attention + PE + normalization from scratch, and the evolution from the original Post-LN transformer to modern Pre-LN + RMSNorm + SwiGLU + RoPE designs."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Brain className="h-3 w-3" /> Multi-head attention</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Flash Attention</Badge>
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
        title="Mathematical foundations — attention, PE, norm, Flash"
        description="The 5 core mathematical operations in a Transformer: scaled dot-product attention, positional encoding, layer normalization, feed-forward network, and Flash Attention tiling."
        icon={<Brain className="h-5 w-5" />}
        badge="mathematics"
      >
        <div className="space-y-4">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm font-semibold text-primary mb-2">1. Scaled Dot-Product Attention</p>
            <p className="font-mono text-xs text-primary mb-2">
              Attention(Q,K,V) = softmax(QK^T / √d_k) × V
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Q = XW_Q, K = XW_K, V = XW_V (learned projections of input X).
              The scaling factor √d_k prevents large dot products from pushing softmax into
              saturation (gradient → 0). Multi-head: run h parallel heads with different W projections,
              concatenate, then linearly project: MultiHead = Concat(head_1,...,head_h) W^O.
              Each head learns to attend to different patterns (syntax, coreference, long-range).
            </p>
          </div>
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">2. Positional Encoding</p>
            <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 mb-2">
              PE(pos, 2i) = sin(pos / 10000^(2i/d_model)) · PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sinusoidal PE (original): fixed, not learned. Each dimension is a sinusoid of different frequency.
              <strong> RoPE (Rotary, LLaMA):</strong> rotates Q,K in 2D subspaces —
              <code className="font-mono"> [q_2i, q_2i+1] </code>
              becomes
              <code className="font-mono"> [q_2i cos(mθ) - q_2i+1 sin(mθ), q_2i sin(mθ) + q_2i+1 cos(mθ)] </code>
              where m = relative position, θ = 10000^(-2i/d). RoPE encodes RELATIVE position (not absolute).
              <strong> ALiBi:</strong> adds linear bias -m·i to attention scores (no PE needed).
            </p>
          </div>
          <div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-3">
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">3. Layer Normalization &amp; RMSNorm</p>
            <p className="font-mono text-xs text-violet-600 dark:text-violet-400 mb-2">
              LayerNorm(x) = γ(x - μ)/σ + β · where μ = mean(x), σ = √(var(x) + ε)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              LayerNorm normalizes across features (per token), not across batch.
              <strong> Pre-LN</strong> (modern): norm BEFORE attention/FFN — more stable training.
              <strong> Post-LN</strong> (original): norm AFTER — required warmup, less stable.
              <strong> RMSNorm</strong> (LLaMA): <code className="font-mono"> x/RMS(x) × γ </code>
              where <code className="font-mono"> RMS(x) = √(mean(x²) + ε) </code> — skips mean subtraction,
              10-20% faster than LayerNorm, same quality.
            </p>
          </div>
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">4. Flash Attention (Dao 2022)</p>
            <p className="font-mono text-xs text-amber-600 dark:text-amber-400 mb-2">
              Standard: O(N²) memory · Flash: O(N²/M) I/O (M = SRAM ~100KB)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Standard attention materializes the full N×N attention matrix in HBM (global memory).
              For N=8192: 128MB per head — bandwidth bottleneck. Flash Attention tiles Q,K,V into
              SRAM-sized blocks, computes attention per-tile, and fuses softmax + matmul in SRAM.
              Result: same mathematical result, 2-4× faster, 5-20× less memory.
              The key insight: the attention matrix never needs to be fully materialized —
              the softmax can be computed in blocks via online normalization (running max + sum).
            </p>
          </div>
          <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3">
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-2">5. Feed-Forward: ReLU → SwiGLU → MoE</p>
            <p className="font-mono text-xs text-rose-600 dark:text-rose-400 mb-2">
              FFN(x) = max(0, xW_1 + b_1)W_2 + b_2 · SwiGLU(x) = (Swish(xW_1) ⊗ xW_3)W_2
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Original FFN: 2 linear layers with ReLU. SwiGLU (LLaMA): gating —
              <code className="font-mono"> Swish(xW_1) </code> gates
              <code className="font-mono"> xW_3 </code>, then project via W_2. 3 matrices instead of 2,
              but better quality. MoE (Mixtral/Mistral 8x7B): replace FFN with 8 experts,
              top-2 routing — only 2 experts active per token (13B active params, 47B total).
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Architecture SVG */}
      <SectionCard
        title="Transformer block architecture (custom SVG)"
        description="The Transformer block: input → multi-head attention → residual + norm → feed-forward (SwiGLU) → residual + norm → output. Modern (Pre-LN): norm before attention + norm before FFN."
        icon={<Atom className="h-5 w-5" />}
        badge="architecture"
      >
        <div className="rounded-md border border-border/60 bg-card p-3">
          <svg viewBox="0 0 400 250" className="w-full h-auto">
            {/* Input */}
            <rect x="150" y="10" width="100" height="24" rx="4" fill="oklch(0.65 0.16 30)20" stroke="oklch(0.65 0.16 30)" strokeWidth="1" />
            <text x="200" y="26" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 30)" fontWeight="bold">Input x</text>
            {/* Norm 1 */}
            <rect x="150" y="45" width="100" height="24" rx="4" fill="oklch(0.65 0.16 250)20" stroke="oklch(0.65 0.16 250)" strokeWidth="1" />
            <text x="200" y="61" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 250)" fontWeight="bold">RMSNorm</text>
            {/* Multi-head attention */}
            <rect x="120" y="80" width="160" height="30" rx="4" fill="oklch(0.65 0.16 165)30" stroke="oklch(0.65 0.16 165)" strokeWidth="1.5" />
            <text x="200" y="96" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 165)" fontWeight="bold">Multi-Head Attention</text>
            <text x="200" y="106" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 165)">softmax(QK^T/√d_k) × V</text>
            {/* Residual 1 */}
            <line x1="100" y1="22" x2="100" y2="130" stroke="oklch(0.65 0.16 30)" strokeWidth="1.5" strokeDasharray="3,2" />
            <line x1="100" y1="130" x2="150" y2="130" stroke="oklch(0.65 0.16 30)" strokeWidth="1.5" markerEnd="url(#tf-arrow)" />
            <text x="80" y="80" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 30)">residual</text>
            <circle cx="150" cy="130" r="8" fill="oklch(0.65 0.16 30)30" stroke="oklch(0.65 0.16 30)" strokeWidth="1" />
            <text x="150" y="133" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 30)" fontWeight="bold">+</text>
            {/* Norm 2 */}
            <rect x="150" y="145" width="100" height="24" rx="4" fill="oklch(0.65 0.16 250)20" stroke="oklch(0.65 0.16 250)" strokeWidth="1" />
            <text x="200" y="161" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 250)" fontWeight="bold">RMSNorm</text>
            {/* FFN */}
            <rect x="120" y="180" width="160" height="30" rx="4" fill="oklch(0.65 0.16 320)30" stroke="oklch(0.65 0.16 320)" strokeWidth="1.5" />
            <text x="200" y="196" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 320)" fontWeight="bold">SwiGLU FFN</text>
            <text x="200" y="206" textAnchor="middle" fontSize="6" fill="oklch(0.55 0.05 320)">Swish(xW1) ⊗ xW3 → W2</text>
            {/* Residual 2 */}
            <line x1="300" y1="22" x2="300" y2="230" stroke="oklch(0.65 0.16 30)" strokeWidth="1.5" strokeDasharray="3,2" />
            <line x1="300" y1="230" x2="250" y2="230" stroke="oklch(0.65 0.16 30)" strokeWidth="1.5" markerEnd="url(#tf-arrow)" />
            <text x="320" y="130" textAnchor="middle" fontSize="7" fill="oklch(0.55 0.05 30)">residual</text>
            <circle cx="250" cy="230" r="8" fill="oklch(0.65 0.16 30)30" stroke="oklch(0.65 0.16 30)" strokeWidth="1" />
            <text x="250" y="233" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 30)" fontWeight="bold">+</text>
            <defs>
              <marker id="tf-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" />
              </marker>
            </defs>
          </svg>
        </div>
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: attention + PE + LayerNorm + Flash (Pyodide)"
        description="Pure-Python implementations of the 5 core transformer operations: scaled dot-product attention (softmax + scaling), sinusoidal positional encoding, LayerNorm vs RMSNorm, and Flash Attention memory analysis."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={MATH_DEMO} buttonLabel="Run transformer math (Pyodide)" />
      </SectionCard>

      {/* Comparison */}
      <SectionCard
        title="Evolution: original transformer → modern LLM"
        description="How the transformer architecture evolved from Vaswani 2017 to modern LLaMA/GPT-4 — 7 key changes."
        icon={<Boxes className="h-5 w-5" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30">
              <tr className="border-b border-border/60">
                <th className="text-left px-3 py-2 font-semibold">Feature</th>
                <th className="text-left px-3 py-2 font-semibold">Original (2017)</th>
                <th className="text-left px-3 py-2 font-semibold text-primary">Modern (LLaMA/GPT-4)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { f: "Normalization", orig: "Post-LN (after attn)", mod: "Pre-LN / RMSNorm (before attn)" },
                { f: "Positional", orig: "Sinusoidal (absolute)", mod: "RoPE (relative) / ALiBi" },
                { f: "FFN", orig: "ReLU (2 matrices)", mod: "SwiGLU (3 matrices) / MoE" },
                { f: "Attention", orig: "Standard O(N²)", mod: "Flash Attention (tiled)" },
                { f: "Activation", orig: "ReLU", mod: "SwiGLU / GELU" },
                { f: "Scale", orig: "65M params (biggest)", mod: "1.8T+ params (GPT-4 est.)" },
                { f: "Context", orig: "512 tokens", mod: "128K+ tokens (GPT-4 Turbo)" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{row.f}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.orig}</td>
                  <td className="px-3 py-2 text-primary/80">{row.mod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Why evolved */}
      <SectionCard
        title="Why the Transformer evolved — shortfalls of RNN/LSTM"
        description="The Transformer replaced RNN/LSTM because RNNs had 3 fundamental limitations that attention solved."
        icon={<History className="h-5 w-5" />}
        badge="Why Transformer"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Shortfall 1: Sequential processing.</strong> RNNs process tokens one at a time — O(N) sequential steps. Transformers process all tokens in parallel — O(1) sequential steps (per layer). This enables GPU parallelism — 100× training speedup.</p>
          <p><strong className="text-foreground/80">Shortfall 2: Long-range forgetting.</strong> RNN hidden states decay — tokens 1000 steps apart are forgotten. Attention gives every token direct access to every other token — no decay, O(1) path length between any two tokens.</p>
          <p><strong className="text-foreground/80">Shortfall 3: No positional bias.</strong> RNNs bake in position via recurrence order. Transformers need explicit positional encoding (sinusoidal/RoPE/ALiBi) — but this is a feature: the model can learn to attend to RELATIVE positions (RoPE) rather than being biased by absolute order.</p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique Transformer features"
        description="Four features that make the Transformer architecture unique."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. Self-attention = O(1) path</p>
            <p className="text-muted-foreground">Every token attends to every other — no long-range forgetting. <strong>RNN/LSTM: O(N) path, decays.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Multi-head = parallel patterns</p>
            <p className="text-muted-foreground">h heads learn different patterns (syntax, coreference, long-range). <strong>RNN: single hidden state.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Flash Attention = I/O optimal</p>
            <p className="text-muted-foreground">Tiled attention fuses softmax + matmul in SRAM — 2-4× faster, same result. <strong>Standard: HBM-bound.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Scalable to 1T+ params</p>
            <p className="text-muted-foreground">Fully parallel training — GPUs process all tokens simultaneously. <strong>RNN: inherently sequential, can't scale.</strong></p>
          </div>
        </div>
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — Transformer implementations"
        description="The frameworks that implement Transformer architectures."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Frameworks</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>PyTorch</strong> — nn.TransformerEncoder, FlashAttention-2</li>
              <li>• <strong>JAX/Flax</strong> — XLA-compiled, TPU-optimised</li>
              <li>• <strong>Triton (OpenAI)</strong> — Flash Attention kernels</li>
              <li>• <strong>vLLM</strong> — PagedAttention for serving</li>
              <li>• <strong>DeepSpeed</strong> — ZeRO-3 for 1T+ training</li>
              <li>• <strong>Megatron-LM</strong> — tensor + pipeline parallel</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-primary" /> Optimizations</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Flash Attention 2</strong> — 2× faster than v1</li>
              <li>• <strong>FlashInfer</strong> — KV cache optimised</li>
              <li>• <strong>Ring Attention</strong> — 1M+ context across GPUs</li>
              <li>• <strong>GQA (Grouped Query Attention)</strong> — fewer KV heads</li>
              <li>• <strong>MoE (Mixtral)</strong> — 8 experts, top-2 routing</li>
              <li>• <strong>Sliding Window Attention</strong> — O(N) local + global</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers that defined the Transformer architecture and its modern variants."
        icon={<TrendingUp className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Vaswani et al. 2017:</strong> "Attention Is All You Need" — introduced the Transformer, replacing RNN/LSTM with self-attention. The most-cited AI paper of the decade. Key insight: attention gives O(1) path between any two tokens — no long-range forgetting.</p>
          <p><strong className="text-foreground/80">Dao et al. 2022:</strong> "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness" — tiled attention computation in SRAM, 2-4× faster, 5-20× less memory. Now standard in PyTorch 2.0+.</p>
          <p><strong className="text-foreground/80">Su et al. 2021 (RoPE):</strong> "RoFormer: Enhanced Transformer with Rotary Position Embedding" — relative positional encoding via 2D rotation. Now used in LLaMA, Mistral, Qwen, and most modern LLMs.</p>
          <p><strong className="text-foreground/80">Touvron et al. 2023 (LLaMA):</strong> "LLaMA: Open and Efficient Foundation Language Models" — RMSNorm + SwiGLU + RoPE + Pre-LN. The open-source standard that Meta released, spawning LLaMA-2, LLaMA-3, Mistral, Vicuna, Alpaca, etc.</p>
          <p><strong className="text-foreground/80">Jiang et al. 2023 (Mixtral MoE):</strong> "Mixtral of Experts" — 8 experts, top-2 routing, 47B total / 13B active params. Matches LLaMA-2 70B quality at 2× inference speed.</p>
        </div>
      </SectionCard>

      {/* Insight */}
      <SectionCard
        title="My deeper thought: attention IS dynamic routing"
        description="The unifying view: self-attention IS a differentiable, learned routing mechanism — each token dynamically routes information to every other token based on content similarity."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">Attention IS dynamic routing.</strong> In a neural network, routing means deciding which information flows where. RNNs use fixed routing (sequential, token i → hidden state → token i+1). Attention uses DYNAMIC routing — each token learns WHERE to get information from, based on content (Q·K^T measures content similarity). This is why attention is so powerful: the routing pattern adapts to the input, not the architecture.</p>
          <p><strong className="text-foreground/80">Flash Attention IS the I/O-optimal algorithm.</strong> The standard attention algorithm materializes the full N×N matrix in HBM — a bandwidth bottleneck. Flash Attention recognises that the matrix never needs to be fully materialized — the softmax can be computed in blocks (online normalization). This is the same insight as MapReduce: don't materialize intermediate results, compute in blocks. Flash Attention IS MapReduce for attention matrices.</p>
          <p><strong className="text-foreground/80">RoPE IS complex multiplication.</strong> RoPE rotates Q and K in 2D subspaces. Mathematically, this is complex multiplication: e^(imθ) × (q_r + i q_i) = rotation by angle mθ. The relative position m appears naturally in the dot product: <code className="font-mono">q^T R_m^T R_n k = q^T R_(n-m) k</code> — the rotation by m cancels, leaving relative position (n-m). RoPE IS complex exponentiation, repackaged as real matrix multiplication.</p>
        </div>
      </SectionCard>

      {/* Cross-disciplinary elegant-code card — Attention */}
      <SectionCard
        title="Cross-disciplinary elegance — Attention bridges protein folding and NLP"
        description="Attention (softmax(QK^T/√d_k)×V) IS natural selection. The same architecture that parses language (GPT-4) folds proteins (AlphaFold2). DNA IS a language — and attention is how you parse any language, natural or biological."
        icon={<Sparkles className="h-5 w-5" />}
        badge="elegant code"
      >
        <DatasetCards
          examples={ELEGANT_CODE_CARDS.filter((_, i) => i === 1)}
          intro="Attention (protein folding ↔ NLP): the SAME equation parses language AND predicts protein structure — because DNA IS a language."
        />
      </SectionCard>

      {/* Related elegant-code — card → card adjacency footer */}
      <RelatedElegantCode hostPage={"transformer-deep-dive" as never} />

      <DeeperThoughtSection pageTitle="Transformer Deep Dive">
        <DeeperThought title="The transformer IS the universal correlation detector" connectedTo="ADR-024 (transformer deep dive)">
          <p>{"Before 2017, NLP used RNNs/LSTMs — sequential models that couldn't see long-range dependencies. Vaswani's insight: replace recurrence with ATTENTION — a single matrix operation (QK^T) that computes ALL pairwise correlations in parallel. The transformer IS the equation 'compute every correlation at once' — and that's why it scales: GPU matrix multiply is O(N^2) but embarrassingly parallel. The transformer didn't invent new math; it identified that correlation detection IS the bottleneck, and matrix multiply IS the solution."}</p>
        </DeeperThought>
        <DeeperThought title="The √d_k scaling IS what separates 'works' from 'doesn't train'" connectedTo="ADR-034 (ESM-2 + AlphaFold2)">
          <p>{"Without dividing by √d_k, the dot product QK^T has variance d_k. For d_k=64 (typical), the softmax input has std~8, which saturates softmax to one-hot — gradients vanish, training fails. Dividing by √d_k keeps the variance at 1. This is a numerical analysis detail that determines whether a $10M training run converges or wastes GPU hours. It's the kind of insight that separates 'I read the paper' from 'I've trained the model.'"}</p>
        </DeeperThought>
        <DeeperThought title="Multi-head attention IS ensemble learning inside a single layer" connectedTo="ADR-001 (platform architecture)">
          <p>{"Multi-head attention (8 heads × d_k=64) is not '8 different attention matrices.' It's 8 different SUBSPACES of the same d_model=512 space. Each head projects into a different d_k-dimensional subspace, computes attention there, and the results are concatenated and projected back. This IS ensemble learning — 8 independent 'views' of the same data, combined by a learned projection. The insight: diversity in representation IS diversity in attention pattern."}</p>
        </DeeperThought>
        <DeeperThought title="AlphaFold2's evoformer IS attention generalised to 4D tensors" connectedTo="ADR-036 (molecular modelling)">
          <p>{"Standard attention is 2D: (sequence_length, d_model). AlphaFold2's evoformer operates on 4D: (n_seq, n_res, n_res, c) — the MSA × pair representation. It has row-wise attention (which positions matter), column-wise attention (which sequences matter), and triangle attention (which pairs of positions are co-dependent). This is attention GENERALISED from 2D matrices to 4D tensors — and the CASP14 result (GDT_TS 92.4) proves the generalisation works."}</p>
        </DeeperThought>
        <DeeperThought title="The transformer killed RNNs — but RNNs will come back" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"The transformer's O(N^2) attention is its strength (parallelism) and its weakness (memory). For sequences >100K tokens, the attention matrix is >10GB — infeasible. Linear attention, sparse attention, and state-space models (Mamba, RWKV) are bringing recurrence back — but with the transformer's insight (correlation detection IS the bottleneck). The RNN will return, not as a sequential model, but as a constant-memory approximation of attention. The math (correlation) stays; the implementation (matrix vs recurrence) evolves."}</p>
        </DeeperThought>
      </DeeperThoughtSection>
      <RelatedTopics topics={[
        { id: "transformer" as const, reason: "Transformer overview page" },
        { id: "diffusion-models-deep-dive" as const, reason: "Diffusion uses transformer U-Net" },
        { id: "fine-tuning-deep-dive" as const, reason: "Fine-tune transformer models" },
        { id: "mlflow-deep-dive" as const, reason: "Track transformer experiments" },
        { id: "neural-networks" as const, reason: "Neural network foundations" },
        { id: "llmops" as const, reason: "LLM operations on transformers" },
        { id: "inference-serving" as const, reason: "Serve transformer models via vLLM" },
        { id: "numpy-scipy" as const, reason: "NumPy arrays power attention matmuls" },
      ]} />
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "See Attention's cousin cards in the cross-disciplinary graph" }, { id: "numpy-scipy" as const, reason: "SVD (SVD IS the Fourier transform for data) — same math, genomics domain" }, { id: "tabular" as const, reason: "Gradient Descent (Gradient Descent IS the learning rule) — same math, ML domain" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("transformer")} className="text-sm text-primary hover:underline">&rarr; Transformer overview</Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("diffusion-models-deep-dive")} className="text-sm text-primary hover:underline">&rarr; Diffusion Models Deep Dive</Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("fine-tuning-deep-dive")} className="text-sm text-primary hover:underline">&rarr; Fine-Tuning Deep Dive</Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("agent-frameworks")} className="text-sm text-primary hover:underline">&rarr; Agent Frameworks</Link>
      </div>
    </div>
  );
}
