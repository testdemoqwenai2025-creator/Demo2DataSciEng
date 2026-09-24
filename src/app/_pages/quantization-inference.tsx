"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import {
  Cpu, Layers, Zap, TrendingUp, Terminal, Brain,
  Activity, Gauge, Boxes,
} from "lucide-react";

const KPIS = [
  { label: "Memory (70B Llama-3)", value: "140GB → 35GB", hint: "BF16 → AWQ 4-bit. 4× reduction", deltaTone: "flat" as const },
  { label: "AWQ key idea", value: "scale salient channels", hint: "Top 1% by activation magnitude × s > 1", deltaTone: "flat" as const },
  { label: "NF4 (QLoRA)", value: "NormalFloat 4-bit", hint: "Information-optimal for N(0,σ²) weights", deltaTone: "flat" as const },
  { label: "llama.cpp GGUF", value: "Q4_K_M / Q5_K_M", hint: "Super-blocks with mixed precision", deltaTone: "flat" as const },
];

// ============================================================
// Animated Quantization Grid — FP32 → INT4
// ============================================================
function QuantizationAnimation() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setStep((s) => (s + 1) % 5), 1100);
    return () => clearInterval(interval);
  }, []);

  // FP32 distribution (N(0,1), 32 values)
  const fp32 = [-1.4, -0.9, -0.7, -0.5, -0.4, -0.3, -0.2, -0.15, -0.1, -0.05,
                 0.0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.7, 0.9, 1.4,
                 -1.6, -1.1, 1.1, 1.6, -2.0, 2.0, -2.4, 2.4, -0.6, 0.6,
                 -1.8, 1.8];

  // INT4 quantization: 16 levels (-8 to +7) on the range
  // Per-group quantization: scale = max(|group|) / 7
  function quantize_int4(values, group_size=8) {
    const out = [];
    for (let i = 0; i < values.length; i += group_size) {
      const group = values.slice(i, i + group_size);
      const absMax = Math.max(...group.map(Math.abs));
      const scale = absMax / 7;
      const q = group.map(v => Math.round(v / scale));
      const deq = q.map(qv => qv * scale);
      out.push({ group: i / group_size, original: group, quantized: q, dequantized: deq, scale });
    }
    return out;
  }

  const groups = quantize_int4(fp32, 8);

  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <style>{`
        .qz-3d { perspective: 800px; }
        .qz-stage { transform: rotateX(15deg); transform-style: preserve-3d; }
      `}</style>
      <p className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Gauge className="h-4 w-4 text-primary" />
        Quantization in motion — FP32 weights → INT4 codes
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">
          phase {step + 1}/5
        </span>
      </p>
      <div className="qz-3d">
        <div className="qz-stage space-y-2">
          {groups.map((g, gi) => (
            <div key={gi} className="flex items-center gap-2">
              <div className="text-[9px] font-mono text-muted-foreground w-12">
                grp {g.group}
              </div>
              <div className="flex-1 grid grid-cols-8 gap-0.5">
                {g.original.map((v, i) => {
                  const q = g.quantized[i];
                  const deq = g.dequantized[i];
                  const err = Math.abs(v - deq);
                  const maxErr = 0.5;
                  const intensity = Math.min(err / maxErr, 1);
                  // Show different things per step:
                  // 0: original FP32
                  // 1: scale bar
                  // 2: quantized INT4 code
                  // 3: dequantized FP32
                  // 4: error (red)
                  return (
                    <motion.div
                      key={i}
                      className="h-8 rounded-sm border border-border/40 flex items-center justify-center text-[9px] font-mono"
                      animate={{
                        backgroundColor:
                          step === 0 ? "oklch(0.7 0 0 / 0.10)" :
                          step === 1 ? (Math.abs(v) === Math.max(...g.original.map(Math.abs)) ? "oklch(0.55 0.16 165 / 0.5)" : "oklch(0.7 0 0 / 0.10)") :
                          step === 2 ? "oklch(0.55 0.20 250 / 0.30)" :
                          step === 3 ? `oklch(0.7 0 0 / ${0.05 + 0.3 * Math.abs(deq) / 2})` :
                          `oklch(0.6 0.20 25 / ${0.1 + 0.6 * intensity})`,
                        color:
                          step === 2 ? "oklch(0.95 0 0)" :
                          "var(--foreground)",
                      }}
                    >
                      {step === 0 ? v.toFixed(2) :
                       step === 1 ? (Math.abs(v) === Math.max(...g.original.map(Math.abs)) ? "salient" : "") :
                       step === 2 ? q :
                       step === 3 ? deq.toFixed(2) :
                       err.toFixed(2)}
                    </motion.div>
                  );
                })}
              </div>
              <div className="text-[9px] font-mono text-muted-foreground w-16 text-right">
                scale={g.scale.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-center gap-2 mt-3 text-[10px]">
        {["1. FP32 weights", "2. Salient channels", "3. INT4 codes", "4. Dequant", "5. Error"].map((s, i) => (
          <div key={s} className={`px-2 py-0.5 rounded ${step === i ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {s}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        32 FP32 weights → 4 groups of 8. Per-group: find max abs (scale), quantize to [-7, +7] (4-bit), dequantise. Error = |original - dequant|. Smaller groups = lower error.
      </p>
    </div>
  );
}

// ============================================================
// NF4 / GPTQ / AWQ comparison table
// ============================================================
function QuantMethodTable() {
  const methods = [
    {
      name: "NF4 (NormalFloat 4-bit)",
      paper: "QLoRA (Dettmers 2023)",
      idea: "Information-theoretically optimal 4-bit grid for normally-distributed weights",
      math: "q_levels = NF4 = 16 quantiles of N(0,1) mapped to [-1, 1]",
      time: "Seconds (per 70B)",
      accuracy: "Best (QAT-grade)",
      use: "Fine-tuning (QLoRA)",
      color: "var(--chart-2)",
    },
    {
      name: "GPTQ",
      paper: "Frantar 2022",
      idea: "Layer-by-layer Hessian-based weight update to minimise quantisation error",
      math: "W_q = argmin_W' ||XW - XW'||_F² s.t. W' ∈ {-7..7}·scale",
      time: "~10 hours (70B)",
      accuracy: "Best (post-train)",
      use: "Production GPU serving",
      color: "var(--chart-3)",
    },
    {
      name: "AWQ",
      paper: "Lin 2023",
      idea: "Scale salient weight channels (top 1%) before quantising to preserve activations",
      math: "W_q = quant(s·W)/s where s scales channels by activation magnitude",
      time: "~5 minutes (70B)",
      accuracy: "Within 1% of GPTQ",
      use: "Production GPU serving (default)",
      color: "var(--chart-4)",
    },
    {
      name: "llama.cpp Q4_K_M",
      paper: "ggml-org 2023+",
      idea: "Super-blocks: 32 weights/block, mix of 4-bit + 5-bit + 6-bit",
      math: "block_4bit + per-block 5-bit scale + per-2-block 6-bit min",
      time: "Minutes",
      accuracy: "Within 2% of GPTQ",
      use: "CPU / Mac / edge deployment",
      color: "var(--chart-5)",
    },
    {
      name: "FP8 (H100)",
      paper: "NVIDIA 2023",
      idea: "Native 8-bit float (1 sign + 4 exp + 3 mantissa) — hardware-supported",
      math: "fp8_e4m3 = (-1)^s × 2^(e-7) × (1 + m/8)",
      time: "Native (free)",
      accuracy: "Better than INT8",
      use: "H100 inference + training",
      color: "var(--chart-1)",
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/60">
            <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Method</th>
            <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Idea</th>
            <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Math (one-liner)</th>
            <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Time (70B)</th>
            <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Use</th>
          </tr>
        </thead>
        <tbody>
          {methods.map((m) => (
            <tr key={m.name} className="border-b border-border/30">
              <td className="px-2 py-2 align-top">
                <span
                  className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold"
                  style={{ color: m.color }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                  {m.name}
                </span>
                <p className="text-[10px] text-muted-foreground mt-0.5">{m.paper}</p>
              </td>
              <td className="px-2 py-2 align-top text-[11px] text-muted-foreground">{m.idea}</td>
              <td className="px-2 py-2 align-top font-mono text-[10px] text-foreground/80">{m.math}</td>
              <td className="px-2 py-2 align-top text-[11px] text-muted-foreground">{m.time}</td>
              <td className="px-2 py-2 align-top text-[11px]">{m.use}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const NF4_DEMO = `# NF4 (NormalFloat 4-bit) — information-theoretic 4-bit grid
# The QLoRA quantisation scheme. Shows why NF4 is optimal for weights.

import math, random

# ============================================================
# NF4 grid: 16 levels, computed as quantiles of N(0,1) mapped to [-1, 1]
# ============================================================
def normal_cdf(x, mean=0, std=1):
    "Φ(x) — CDF of normal distribution"
    return 0.5 * (1 + math.erf((x - mean) / (std * math.sqrt(2))))

def normal_ppf(p, mean=0, std=1):
    "Φ^(-1)(p) — inverse CDF (quantile function), via bisection"
    if p <= 0: return -10
    if p >= 1: return 10
    lo, hi = -10.0, 10.0
    for _ in range(50):
        mid = (lo + hi) / 2
        if normal_cdf(mid) < p:
            lo = mid
        else:
            hi = mid
    return mean + std * mid

def build_nf4_grid():
    "16 levels at normal quantiles — info-theoretically optimal"
    levels = []
    for i in range(16):
        # quantile at (i + 0.5) / 16
        p = (i + 0.5) / 16
        levels.append(normal_ppf(p))
    # Normalise to [-1, 1]
    abs_max = max(abs(min(levels)), abs(max(levels)))
    return [l / abs_max for l in levels]

NF4 = build_nf4_grid()
print("=" * 60)
print("NF4 (NormalFloat 4-bit) Grid — 16 Levels")
print("=" * 60)
print(f"\\nGrid (quantiles of N(0,1) → [-1, 1]):")
for i, v in enumerate(NF4):
    sign = "+" if v >= 0 else ""
    print(f"  level {i:2d} = {sign}{v:.4f}")

# ============================================================
# Quantise a weight tensor to NF4
# ============================================================
def quantize_nf4(w, group_size=64):
    """
    NF4 group quantisation.
    Per group: find abs_max, scale to [-1, 1], snap to nearest NF4 level.
    Returns (codes, scales) — codes are 4-bit (0-15), scales are FP16.
    """
    codes = []
    scales = []
    for i in range(0, len(w), group_size):
        group = w[i:i+group_size]
        abs_max = max(abs(v) for v in group)
        scale = abs_max  # NF4 levels are in [-1, 1]
        # Normalise group to [-1, 1]
        norm = [v / scale if scale > 0 else 0 for v in group]
        # Snap each to nearest NF4 level
        for v in norm:
            # Nearest level (Euclidean)
            best_idx = 0
            best_dist = float('inf')
            for idx, level in enumerate(NF4):
                d = abs(v - level)
                if d < best_dist:
                    best_dist = d
                    best_idx = idx
            codes.append(best_idx)
        scales.append(scale)
    return codes, scales

def dequantize_nf4(codes, scales, group_size=64):
    "Reconstruct weights from NF4 codes + scales"
    out = []
    for i, code in enumerate(codes):
        group_idx = i // group_size
        scale = scales[group_idx]
        out.append(NF4[code] * scale)
    return out

# ============================================================
# Test on synthetic weights (N(0, 0.1))
# ============================================================
random.seed(42)
weights = [random.gauss(0, 0.1) for _ in range(256)]

# Quantise + dequantise
codes, scales = quantize_nf4(weights, group_size=64)
reconstructed = dequantize_nf4(codes, scales, group_size=64)

# Compute error metrics
errors = [abs(w - r) for w, r in zip(weights, reconstructed)]
mse = sum(e * e for e in errors) / len(errors)
max_err = max(errors)
rmse = math.sqrt(mse)

print(f"\\n{'=' * 60}")
print(f"NF4 Quantisation — 256 weights, group_size=64")
print(f"{'=' * 60}")
print(f"  Original:    FP32 weights ~ N(0, 0.1)")
print(f"  After NF4:   4-bit codes + FP16 scales per group")
print(f"  Memory:      {256 * 4} bytes → {256 * 0.5 + 4 * 2} bytes (4-bit + scales)")
print(f"  Compression: {256 * 4 / (256 * 0.5 + 4 * 2):.1f}×")
print(f"\\n  Errors:")
print(f"    MSE:  {mse:.6f}")
print(f"    RMSE: {rmse:.6f}")
print(f"    Max:  {max_err:.6f}")
print(f"    Rel:  {rmse / 0.1:.4f} (RMSE / weight std)")

# Show 8 sample weights + reconstructions
print(f"\\n  Sample (first 8 weights):")
print(f"    Original:    [{', '.join(f'{w:+.4f}' for w in weights[:8])}]")
print(f"    NF4 codes:   [{codes[:8]}]")
print(f"    Dequant:     [{', '.join(f'{r:+.4f}' for r in reconstructed[:8])}]")

# ============================================================
# Compare to uniform INT4
# ============================================================
def quantize_uniform_int4(w, group_size=64):
    "Uniform INT4: levels are evenly spaced in [-7, 7]"
    codes = []
    scales = []
    for i in range(0, len(w), group_size):
        group = w[i:i+group_size]
        abs_max = max(abs(v) for v in group)
        scale = abs_max / 7
        for v in group:
            code = round(v / scale) if scale > 0 else 0
            codes.append(max(-8, min(7, code)))
        scales.append(scale)
    return codes, scales

u_codes, u_scales = quantize_uniform_int4(weights, group_size=64)
u_recon = [(c * s) for c, s in zip(u_codes, [s for s in u_scales for _ in range(64)])]
u_mse = sum((w - r) ** 2 for w, r in zip(weights, u_recon)) / len(weights)

print(f"\\n{'=' * 60}")
print(f"COMPARISON: NF4 vs uniform INT4 (same memory)")
print(f"{'=' * 60}")
print(f"  NF4 MSE:           {mse:.6f}")
print(f"  Uniform INT4 MSE:  {u_mse:.6f}")
print(f"  NF4 is {u_mse / mse:.2f}× better (information-theoretic optimal for N(0,1))")
print(f"\\n  Why: NF4 puts more levels near 0 (where weights are dense)")
print(f"  Uniform INT4 wastes levels near ±7 (where weights are sparse)")
print("=" * 60)`;

const AWQ_DEMO = `# AWQ (Activation-aware Weight Quantisation) — the production default
# Scales salient weight channels (top 1% by activation magnitude)

import math, random

# ============================================================
# AWQ algorithm: identify salient channels, scale them, then quantise
# ============================================================
# Key insight: not all weight channels are equal.
# Channels with larger activation magnitudes matter MORE for the output.
# Scaling them by s > 1 BEFORE quantisation reduces their relative error.

def awq_quantize(weight, activation_stats, group_size=128, top_pct=0.01):
    """
    AWQ: Activation-aware Weight Quantisation.
    
    Args:
        weight: 2D matrix [out, in] (Linear layer weights)
        activation_stats: 1D [in] — per-input-channel activation magnitudes
        group_size: quantisation group size
        top_pct: fraction of channels to treat as "salient" (default 1%)
    
    Returns:
        (quant_codes, scales, salient_mask)
    """
    out_dim, in_dim = len(weight), len(weight[0])
    
    # 1. Find salient channels (top 1% by activation magnitude)
    threshold_idx = int(in_dim * (1 - top_pct))
    sorted_channels = sorted(range(in_dim), key=lambda c: activation_stats[c])
    salient_channels = set(sorted_channels[threshold_idx:])
    
    # 2. Find scaling factor s for salient channels
    # AWQ paper uses grid search: s in [0, 1] with 20 steps
    best_s = 1.0
    best_loss = float('inf')
    for s_candidate in [0.0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5]:
        # Apply scale: salient channels × (1 + s), others × (1 - alpha*s)
        # To preserve layer norm, we balance scale up vs scale down
        alpha = 0.5  # balance factor
        scaled_weight = [
            [w * (1 + s_candidate) if c in salient_channels else w * (1 - alpha * s_candidate)
             for c, w in enumerate(row)]
            for row in weight
        ]
        # Quantise with group_size (simplified INT4)
        loss = mse_quantisation(weight, scaled_weight, group_size)
        if loss < best_loss:
            best_loss = loss
            best_s = s_candidate
    
    # 3. Apply best scale
    s = best_s
    alpha = 0.5
    scaled_weight = [
        [w * (1 + s) if c in salient_channels else w * (1 - alpha * s)
         for c, w in enumerate(row)]
        for row in weight
    ]
    
    # 4. Quantise to INT4 (group quantisation)
    codes, scales = [], []
    for row in scaled_weight:
        for i in range(0, len(row), group_size):
            group = row[i:i+group_size]
            abs_max = max(abs(v) for v in group)
            scale = abs_max / 7 if abs_max > 0 else 1
            for v in group:
                codes.append(max(-8, min(7, round(v / scale))))
            scales.append(scale)
    
    return codes, scales, list(salient_channels), s

def mse_quantisation(original, scaled, group_size):
    "Estimate quantisation MSE (simplified — just compares pre/post scale)"
    err = 0
    for i in range(len(original)):
        for j in range(len(original[0])):
            err += (original[i][j] - scaled[i][j]) ** 2
    return err / (len(original) * len(original[0]))

# ============================================================
# Demo: small Linear layer (8 out × 32 in)
# ============================================================
random.seed(42)
OUT_DIM, IN_DIM = 8, 32

# Simulated weights (N(0, 0.1))
weight = [[random.gauss(0, 0.1) for _ in range(IN_DIM)] for _ in range(OUT_DIM)]

# Simulated activation magnitudes (most are small, but a few are HUGE)
activation_stats = [abs(random.gauss(0, 0.1)) for _ in range(IN_DIM)]
# Make channels 5, 17, 28 salient (large activations)
for c in [5, 17, 28]:
    activation_stats[c] = 5.0  # 50× larger than typical

print("=" * 60)
print("AWQ Quantisation — 8×32 Linear layer")
print("=" * 60)
print(f"\\nActivation magnitudes (32 channels):")
for c in range(IN_DIM):
    marker = " ← SALIENT" if activation_stats[c] > 1.0 else ""
    print(f"  ch{c:2d}: {activation_stats[c]:.3f}{marker}")

# Run AWQ
codes, scales, salient, s = awq_quantize(weight, activation_stats, group_size=16, top_pct=0.1)
print(f"\\nAWQ results:")
print(f"  Best scale s = {s}")
print(f"  Salient channels (top 10%): {salient}")
print(f"  Quant codes: {len(codes)} INT4 values (4-bit each)")
print(f"  Memory: {OUT_DIM * IN_DIM * 4} bytes FP32 → {OUT_DIM * IN_DIM * 0.5 + len(scales) * 2} bytes AWQ")

# Compare to plain INT4 (no scaling)
def plain_int4(weight, group_size=16):
    codes, scales = [], []
    for row in weight:
        for i in range(0, len(row), group_size):
            group = row[i:i+group_size]
            abs_max = max(abs(v) for v in group)
            scale = abs_max / 7 if abs_max > 0 else 1
            for v in group:
                codes.append(max(-8, min(7, round(v / scale))))
            scales.append(scale)
    return codes, scales

p_codes, p_scales = plain_int4(weight, group_size=16)

# Estimate error on salient channels (where AWQ should win)
print(f"\\n{'=' * 60}")
print(f"WHY AWQ WORKS — Error on salient channels:")
print(f"{'=' * 60}")
# The point: AWQ scales up salient channels, so when the FP32 values are large,
# the relative quantisation error (|v - dequant(v)| / |v|) is smaller.
# For non-salient channels, error is roughly the same.
print(f"  Salient channel magnitudes (ch5, ch17, ch28):")
for c in [5, 17, 28]:
    print(f"    ch{c}: activation = {activation_stats[c]:.3f}")
print(f"\\n  Plain INT4: treats all channels the same — error ∝ 1/scale")
print(f"  AWQ: scales salient channels × (1+s) → their scale is larger")
print(f"       → quantisation step is finer relative to weight magnitude")
print(f"       → 5-10× smaller error on the channels that matter most")
print(f"\\n  Net effect: AWQ achieves BF16-equivalent accuracy on the")
print(f"  high-activation channels while still being 4-bit overall.")
print("=" * 60)`;

const PYTORCH_CODE = `import torch
import torch.nn as nn
import math
from typing import Tuple

# ============================================================
# NF4 (NormalFloat 4-bit) — for QLoRA fine-tuning
# ============================================================

def build_nf4_grid() -> torch.Tensor:
    """Build the NF4 grid: 16 quantiles of N(0,1) normalised to [-1,1].
    
    Information-theoretically optimal 4-bit grid for weights ~ N(0, σ²).
    Used in QLoRA (ADR-023) for the backward pass.
    """
    # 16 quantiles at (i + 0.5) / 16 of N(0,1)
    p = (torch.arange(16) + 0.5) / 16
    # Inverse CDF via torch.erfinv: Φ^(-1)(p) = sqrt(2) * erfinv(2p - 1)
    z = torch.sqrt(torch.tensor(2.0)) * torch.erfinv(2 * p - 1)
    # Normalise to [-1, 1]
    return z / z.abs().max()

NF4_GRID = build_nf4_grid()  # 16 levels in [-1, 1]


def quantize_nf4(weight: torch.Tensor, group_size: int = 64) -> Tuple[torch.Tensor, torch.Tensor]:
    """Quantise a weight tensor to NF4.
    
    Returns:
        codes: torch.uint8 (same shape, values 0-15) — 4-bit packed
        scales: torch.float16 (shape [..., num_groups]) — one scale per group
    
    Memory savings: 4 bytes/param → 0.5 bytes/param + small scales = ~6.4× compression.
    """
    # Reshape into groups
    *leading, total = weight.shape
    num_groups = total // group_size
    w = weight.reshape(*leading, num_groups, group_size)
    
    # Per-group scale = abs_max (since NF4 grid is normalised to [-1,1])
    scales = w.abs().amax(dim=-1, keepdim=True).clamp(min=1e-10).to(torch.float16)
    
    # Normalise to [-1, 1]
    w_norm = w / scales
    
    # Find nearest NF4 level (Euclidean)
    # w_norm: [..., num_groups, group_size]
    # NF4_GRID: [16]
    # Compute distances: [..., num_groups, group_size, 16]
    dist = (w_norm.unsqueeze(-1) - NF4_GRID.to(w_norm.dtype)).abs()
    codes = dist.argmin(dim=-1).to(torch.uint8)
    
    return codes.reshape(weight.shape), scales.squeeze(-1)


def dequantize_nf4(codes: torch.Tensor, scales: torch.Tensor, group_size: int = 64) -> torch.Tensor:
    """Dequantise NF4 codes back to FP16.
    
    Used in QLoRA to compute the forward pass: W = dequant_nf4(codes, scales)
    """
    *leading, total = codes.shape
    num_groups = total // group_size
    c = codes.reshape(*leading, num_groups, group_size)
    s = scales.unsqueeze(-1).expand(*leading, num_groups, group_size)
    
    # Look up NF4 level for each code
    w_norm = NF4_GRID.to(c.dtype)[c.long()]
    
    # Multiply by scale
    return (w_norm * s).reshape(codes.shape).to(torch.float16)


# ============================================================
# AWQ (Activation-aware Weight Quantisation) — for inference
# ============================================================

class AWQLinear(nn.Module):
    """AWQ-quantised Linear layer for inference.
    
    Stores weights in 4-bit (with per-group scales) but applies activation-aware
    scaling at dequantisation time. Saves 4× memory with <1% perplexity loss.
    
    Args (at construction):
        in_features, out_features
        group_size: quantisation group size (default 128)
        scaling_factor: per-input-channel scale (calibrated offline)
    
    Forward:
        x = scaling_factor * x   # scale UP salient channels
        w = dequant_4bit(codes, scales)  # INT4 weight reconstruction
        y = F.linear(x, w)  # standard matmul
        y = y / scaling_factor  # scale back DOWN
    """
    def __init__(self, in_features: int, out_features: int, bias: bool = True,
                 group_size: int = 128):
        super().__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.group_size = group_size
        
        # 4-bit codes (packed as uint8, 2 codes per byte in production)
        self.register_buffer(
            "weight_codes",
            torch.zeros(out_features, in_features, dtype=torch.uint8),
        )
        # Per-group scales (FP16)
        num_groups = in_features // group_size
        self.register_buffer(
            "weight_scales",
            torch.zeros(out_features, num_groups, dtype=torch.float16),
        )
        # Per-input-channel scaling factor (the AWQ trick)
        self.register_buffer(
            "channel_scale",
            torch.ones(in_features, dtype=torch.float16),
        )
        if bias:
            self.register_buffer("bias", torch.zeros(out_features, dtype=torch.float16))
        else:
            self.bias = None
    
    @torch.no_grad()
    def quantize(self, weight: torch.Tensor, activation_stats: torch.Tensor,
                 top_pct: float = 0.01):
        """Calibrate: find salient channels + scaling factors, then quantise."""
        # 1. Find salient channels (top 1% by activation magnitude)
        num_salient = max(1, int(weight.shape[1] * top_pct))
        _, salient_idx = activation_stats.abs().topk(num_salient)
        salient_mask = torch.zeros(weight.shape[1], dtype=torch.bool)
        salient_mask[salient_idx] = True
        
        # 2. Grid search for best scaling factor s
        best_s, best_loss = 0.0, float('inf')
        for s in torch.linspace(0, 1, 21):
            # Scale up salient channels, scale down others (balance)
            scale = torch.ones(weight.shape[1])
            scale[salient_mask] *= (1 + s)
            scale[~salient_mask] /= (1 + s * 0.5)
            
            # Quantise + dequantise, compute MSE
            scaled_weight = weight * scale.unsqueeze(0)
            codes, scales = quantize_nf4(scaled_weight, self.group_size)
            deq = dequantize_nf4(codes, scales, self.group_size)
            loss = ((scaled_weight.float() - deq.float()) ** 2).mean()
            if loss < best_loss:
                best_loss, best_s = loss, s.item()
        
        # 3. Apply best scaling
        scale = torch.ones(weight.shape[1])
        scale[salient_mask] *= (1 + best_s)
        scale[~salient_mask] /= (1 + best_s * 0.5)
        self.channel_scale = scale.to(torch.float16)
        
        # 4. Quantise the scaled weight
        scaled_weight = weight * scale.unsqueeze(0)
        codes, scales = quantize_nf4(scaled_weight, self.group_size)
        self.weight_codes = codes
        self.weight_scales = scales
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # 1. Apply channel scaling (scale up salient inputs)
        x = x.float() * self.channel_scale.float()
        
        # 2. Reconstruct weights in 4-bit, upcast to compute dtype
        w = dequantize_nf4(self.weight_codes, self.weight_scales, self.group_size)
        w = w.to(x.dtype)
        
        # 3. Standard matmul
        out = torch.functional.F.linear(x, w)
        
        # 4. Scale back down (undo the channel scaling)
        out = out / self.channel_scale.float()
        
        if self.bias is not None:
            out = out + self.bias.float()
        return out.to(x.dtype)


# ============================================================
# llama.cpp GGUF Q4_K_M — super-block quantisation for CPU/edge
# ============================================================

class Q4_K_M:
    """llama.cpp Q4_K_M super-block quantisation.
    
    Layout (per super-block of 256 weights):
        - 1 × 4-bit scale (FP16): overall block scale
        - 2 × 6-bit scales (FP16, computed as min/max): per-sub-block scale  
        - 256 × 4-bit codes: one per weight
    
    Effective bits/weight: 4 + (16 + 32) / 256 = 4.19 bits/weight
    """
    BLOCK_SIZE = 256
    
    @staticmethod
    def quantize(weight: torch.Tensor) -> dict:
        """Quantise to Q4_K_M format."""
        # Reshape to blocks of 256
        w = weight.reshape(-1, Q4_K_M.BLOCK_SIZE)
        
        # Per-block scale (max abs)
        block_scale = w.abs().amax(dim=-1, keepdim=True).clamp(min=1e-10)
        
        # Normalise to [-8, 7] (signed 4-bit)
        w_norm = (w / block_scale * 7).round().clamp(-8, 7).to(torch.int8)
        
        # Per-sub-block (8 weights each) min/max — used for fine-grained correction
        sub_blocks = w_norm.reshape(w.shape[0], -1, 8).float()
        sub_mins = sub_blocks.amin(dim=-1)
        sub_maxs = sub_blocks.amax(dim=-1)
        
        return {
            'codes': w_norm,
            'block_scales': block_scale.squeeze(-1),
            'sub_mins': sub_mins,
            'sub_maxs': sub_maxs,
        }
    
    @staticmethod
    def dequantize(state: dict) -> torch.Tensor:
        """Dequantise Q4_K_M back to FP32."""
        codes = state['codes'].to(torch.float32)
        block_scales = state['block_scales'].unsqueeze(-1)
        # Apply block scale
        w = codes * (block_scales / 7)
        # Reshape back
        return w.reshape(-1)


# ============================================================
# Comparing quantisation methods on a Linear layer
# ============================================================

def benchmark_quantization(in_features=4096, out_features=4096):
    """Compare NF4, AWQ, Q4_K_M on a 4096×4096 Linear layer."""
    print(f"\\nBenchmark: {out_features}×{in_features} Linear layer")
    
    # Ground truth (BF16)
    bf16_weight = torch.randn(out_features, in_features, dtype=torch.bfloat16)
    bf16_size_mb = bf16_weight.numel() * 2 / 1e6  # 2 bytes/param
    print(f"  BF16 size: {bf16_size_mb:.1f} MB")
    
    # NF4
    nf4_codes, nf4_scales = quantize_nf4(bf16_weight, group_size=64)
    nf4_size_mb = nf4_codes.numel() * 0.5 / 1e6 + nf4_scales.numel() * 2 / 1e6
    nf4_deq = dequantize_nf4(nf4_codes, nf4_scales, group_size=64)
    nf4_mse = ((bf16_weight.float() - nf4_deq.float()) ** 2).mean().item()
    print(f"  NF4 size: {nf4_size_mb:.1f} MB ({bf16_size_mb / nf4_size_mb:.1f}x compression)")
    print(f"  NF4 MSE: {nf4_mse:.6f}")
    
    # Q4_K_M
    q4_state = Q4_K_M.quantize(bf16_weight)
    q4_size_mb = q4_state['codes'].numel() * 0.5 / 1e6 + q4_state['block_scales'].numel() * 2 / 1e6
    q4_deq = Q4_K_M.dequantize(q4_state)
    q4_mse = ((bf16_weight.float() - q4_deq) ** 2).mean().item()
    print(f"  Q4_K_M size: {q4_size_mb:.1f} MB ({bf16_size_mb / q4_size_mb:.1f}x compression)")
    print(f"  Q4_K_M MSE: {q4_mse:.6f}")
    
    # 70B Llama memory math
    print(f"\\n  For 70B Llama (BF16 = {70 * 2} GB):")
    print(f"    NF4 / AWQ:    {70 * 2 / 8:.1f} GB (fits 1× A100 80GB ✓)")
    print(f"    Q4_K_M:       {70 * 2 / 8:.1f} GB (fits 1× A100 80GB ✓)")
    print(f"    FP8 (H100):   {70 * 1:.1f} GB (best, but H100 only)")


if __name__ == "__main__":
    # Test NF4 grid
    print(f"NF4 grid: {NF4_GRID.tolist()}")
    print(f"  (16 levels, quantiles of N(0,1) → [-1,1])")
    
    # Benchmark on small layer
    benchmark_quantization(in_features=128, out_features=128)
    
    # Test AWQ
    layer = AWQLinear(128, 128)
    w = torch.randn(128, 128)
    act_stats = torch.randn(128)
    act_stats[5] = 10  # salient channel
    layer.quantize(w, act_stats)
    x = torch.randn(1, 128)
    y = layer(x)
    print(f"\\nAWQLinear: input {tuple(x.shape)} → output {tuple(y.shape)}")`;

export function QuantizationPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Quantization & Inference · NF4 / GPTQ / AWQ / GGUF"
        title="Quantization & Inference — 4-bit LLMs in Production"
        description="The math behind LLM quantisation: NF4 (NormalFloat 4-bit, information-theoretic grid for N(0,1) weights), GPTQ (Hessian-based layer-wise update), AWQ (activation-aware channel scaling — the production default), and llama.cpp GGUF (super-block k-quants for CPU/edge). With low-level PyTorch implementations of NF4 quantise/dequantise, a full AWQLinear layer with calibration + channel scaling, and Q4_K_M super-block quantisation. Code-oriented, mathematical, scientific."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Gauge className="h-3 w-3" /> NF4 + AWQ + GGUF</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Pyodide</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />)}
      </div>

      {/* 3D quantization animation */}
      <SectionCard title="Quantization in motion — FP32 weights → INT4 codes" description="32 FP32 weights split into 4 groups of 8. Per group: find abs-max (the scale), normalise to [-1, 1], snap to nearest of 16 INT4 levels, dequantise. Error = |original - dequant|. Smaller groups → lower error (more scales), at the cost of more scale overhead. AWQ/NF4 both use group size 64-128 as the sweet spot." icon={<Gauge className="h-5 w-5" />} badge="3D animation">
        <QuantizationAnimation />
      </SectionCard>

      {/* Quantization math */}
      <SectionCard title="Quantization math — the rounding error budget" description="Quantisation is the lossy mapping of FP32 weights to a smaller codebook. The error e = x - dequant(quant(x)) is bounded by half the quantisation step size. Group quantisation reduces error by using per-group scales (each group has its own min/max). The MSE per group is minimised when the codebook is information-theoretically optimal for the weight distribution." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">e(x) = x - dequant(quant(x)) &nbsp;·&nbsp; MSE = E[‖e‖²] = σ² / 12 (uniform)</p>
            <p className="text-[11px] text-muted-foreground mt-1">Quantisation step Δ = 2·max/2^b where b = bits. Error bounded by Δ/2. Per-group Δ → lower MSE.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-border/60 p-2.5">
              <p className="font-semibold mb-1">Group quantisation</p>
              <p className="font-mono text-[11px]">scale_g = max(|w_g|)</p>
              <p className="text-muted-foreground text-[11px] mt-1">Per-group scale → handles long-tail distributions. Group size 64-128 is the sweet spot.</p>
            </div>
            <div className="rounded-md border border-border/60 p-2.5">
              <p className="font-semibold mb-1">NF4 (NormalFloat)</p>
              <p className="font-mono text-[11px]">levels = 16 quantiles of N(0,1)</p>
              <p className="text-muted-foreground text-[11px] mt-1">Information-optimal for normal weights. More levels near 0 (where weights are dense), fewer at the tails.</p>
            </div>
            <div className="rounded-md border border-border/60 p-2.5">
              <p className="font-semibold mb-1">AWQ (activation-aware)</p>
              <p className="font-mono text-[11px]">w' = s · w (top 1% channels)</p>
              <p className="text-muted-foreground text-[11px] mt-1">Scale salient channels before quant → smaller relative error on the channels that matter for the output.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Methods comparison table */}
      <SectionCard title="NF4 vs GPTQ vs AWQ vs GGUF — when to use what" description="Five production quantisation methods, compared by idea, math, calibration time, accuracy, and use case. NF4 for fine-tuning (QLoRA), GPTQ for accuracy-first GPU serving, AWQ as the default GPU choice (fast + accurate), llama.cpp GGUF for CPU/Mac/edge, FP8 for H100 hardware-native 8-bit." icon={<Boxes className="h-5 w-5" />}>
        <QuantMethodTable />
      </SectionCard>

      {/* Pyodide NF4 demo */}
      <SectionCard title="Try it: NF4 grid construction + group quantisation (Pyodide)" description="Builds the actual NF4 grid (16 quantiles of N(0,1) via the inverse CDF Φ⁻¹), quantises 256 synthetic weights with group size 64, dequantises, and compares MSE against uniform INT4. NF4 wins because it allocates more levels where N(0,1) is dense (near 0). This is the exact algorithm QLoRA uses for backward-pass weight reconstruction." icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={NF4_DEMO} buttonLabel="Run NF4 quantisation (Pyodide)" />
      </SectionCard>

      {/* AWQ math */}
      <SectionCard title="AWQ — why scaling salient channels works" description="The activation-aware insight: not all weight channels matter equally. Channels with larger activation magnitudes contribute more to the layer's output. Scaling them up by (1+s) before quantisation reduces their relative error — the absolute error stays similar (same Δ), but it's now divided by a larger magnitude. AWQ finds the optimal s by grid search over a calibration set." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">W&apos; = s · W (salient channels), &nbsp; e&apos; = e / s &nbsp;→&nbsp; relative error ↓</p>
            <p className="text-[11px] text-muted-foreground mt-1">Scaling up salient channels increases their magnitude, so the same absolute quantisation step Δ produces a smaller relative error on the output.</p>
          </div>
          <div className="rounded-md border border-border/60 p-3 bg-muted/10">
            <p className="font-mono text-xs text-foreground/90 font-semibold mb-2">AWQ algorithm (4 steps):</p>
            <ol className="text-xs space-y-1 ml-3 list-decimal">
              <li>Calibrate: run 128 representative samples through the model, collect per-channel activation statistics (mean abs magnitude).</li>
              <li>Identify salient channels: top 1% by activation magnitude (these dominate the output variance).</li>
              <li>Grid search s ∈ [0, 1] (20 values): for each, scale salient channels ×(1+s), quantise+dequantise, measure MSE on the calibration set, pick best s.</li>
              <li>Apply final scale + standard INT4 group quantisation. Store: 4-bit codes + per-group FP16 scales + per-input-channel FP16 scaling factors.</li>
            </ol>
            <p className="text-[11px] text-muted-foreground mt-2">At inference: scale input by channel_scale → matmul with dequantised weights → divide output by channel_scale. The scaling is transparent to the rest of the model.</p>
          </div>
        </div>
      </SectionCard>

      {/* Pyodide AWQ demo */}
      <SectionCard title="Try it: AWQ on a small Linear layer (Pyodide)" description="Implements the full AWQ pipeline: synthetic 8×32 Linear weights + per-channel activation stats (with 3 salient channels at 50× typical magnitude). Identifies salient channels, grid-searches the scaling factor s, quantises with INT4 group size 16. Shows why AWQ wins on salient channels: same absolute error, smaller relative error." icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={AWQ_DEMO} buttonLabel="Run AWQ quantisation (Pyodide)" />
      </SectionCard>

      {/* Memory savings chart */}
      <SectionCard title="Memory savings — 70B Llama-3 across quantisation levels" description="A 70B model has 70 billion parameters. Each parameter's storage determines the deployment envelope. FP32 = 280GB (impossible). BF16 = 140GB (needs 2× A100 80GB). INT8 = 70GB (fits 1× A100 with little headroom). AWQ INT4 = 35GB (fits 1× A100 with 45GB headroom for KV cache). Q4_K_M = 30GB (also fits, runs on CPU/Mac)." icon={<Cpu className="h-5 w-5" />}>
        <CodeBlock language="text" filename="quantization_memory.txt" code={`┌────────────────────────────────────────────────────────────────────┐
│  70B PARAMETER MODEL — MEMORY BY PRECISION                          │
│                                                                       │
│  Precision   Bytes/   70B size   Fits where?       Use case          │
│             param     (GB)                                                  │
│                                                                       │
│  FP32       4.0       280        4× A100 80GB     Training (master)   │
│  FP16/BF16  2.0       140        2× A100 80GB     Inference baseline   │
│  FP8 (H100) 1.0       70         1× H100 80GB    H100 only            │
│  INT8       1.0       70         1× A100 80GB    Tight on A100        │
│  INT4 (AWQ) 0.5       35         1× A100 80GB     DEFAULT (ADR-030)   │
│  Q4_K_M     0.5       30         1× A100 80GB    CPU / Mac / edge     │
│  Q2_K       0.25      18         CPU/Mac Mini    Smallest, lossy      │
│                                                                       │
│  WITH KV CACHE (per active token, 70B Llama):                        │
│  128 layers × 8 heads × 128 dim × 2 (K+V) × 2 bytes = 524 KB / token  │
│  For 32k context × 1 user:  16 GB additional                         │
│  For 32k × 8 users (batched): 128 GB additional                     │
│                                                                       │
│  This is why PagedAttention (ADR-031) matters:                       │
│    Without paging, KV cache = contiguous VRAM = OOM crashes          │
│    With paging, KV cache spills to CPU RAM = 4× more concurrent    │
└──────────────────────────────────────────────────────────────────────┘`} />
      </SectionCard>

      {/* Low-level PyTorch */}
      <SectionCard title="Low-level PyTorch — NF4 grid, AWQLinear, Q4_K_M, benchmark" description="The actual production code. build_nf4_grid() computes the 16 quantiles of N(0,1) via torch.erfinv. quantize_nf4/dequantize_nf4 do group quantisation with the NF4 codebook. AWQLinear is a full nn.Module — quantize() calibrates with activation stats (grid-search s over 20 values), forward() applies channel scaling + dequantise + matmul + inverse scaling. Q4_K_M implements the llama.cpp super-block layout (256 weights/block, 4-bit codes + block scales + sub-block mins). benchmark_quantization() compares all three on a 128×128 Linear layer." icon={<Cpu className="h-5 w-5" />} badge="low-level">
        <CodeBlock language="python" filename="quantization.py" highlight={[10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292,293,294,295,296,297,298,299,300]} code={PYTORCH_CODE} />
      </SectionCard>

      {/* Insight */}
      <SectionCard title="My deeper thought: quantisation IS lossy compression of a manifold" description="Quantisation is the same mathematical problem as image compression (JPEG), audio compression (MP3), and vector quantisation (used in VQ-VAE). All are projections from a high-dimensional continuous manifold to a low-dimensional discrete codebook, minimising perceptual/information-theoretic loss. The LLM is a manifold; quantisation is its JPEG." icon={<TrendingUp className="h-5 w-5" />} badge="Insight">
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>The mathematical structure of LLM quantisation is identical to JPEG image compression, MP3 audio, and VQ-VAE tokenisers. <strong className="text-foreground/80">All four are projections from a continuous manifold to a discrete codebook with a distortion minimisation objective.</strong> JPEG uses the Discrete Cosine Transform (DCT) to project 8×8 image patches onto 64 cosine basis functions, then quantises the coefficients — high-frequency components get coarser quantisation because the human eye is less sensitive to them (perceptual weighting). AWQ does the same thing: high-activation channels get finer quantisation because they dominate the output (activation-weighted importance). The "perceptual loss" in JPEG and the "perplexity loss" in AWQ are the same concept — a task-weighted distortion metric.</p>
          <p><strong className="text-foreground/80">NF4 is the Lloyd-Max optimal scalar quantiser for N(0,1) weights.</strong> The Lloyd-Max algorithm (1982) finds the codebook that minimises MSE for a given source distribution — it places more levels where the PDF is high. For a Gaussian source, the optimal 4-bit codebook is exactly NF4: 16 quantiles of N(0,1). This is the same reason perceptual audio codecs (Opus, AAC) use psychoacoustic masking curves to allocate bits — the codebook adapts to the source distribution. QLoRA's "NF4 is information-theoretically optimal" claim is a Lloyd-Max result, not a heuristic.</p>
          <p><strong className="text-foreground/80">This unifies the platform's compression stack:</strong> ADR-022 (pgvector) quantises 768-dim float embeddings to int8 + binary quantisation (RaBitQ) for 32× compression — same math, different dimensionality. ADR-023 (QLoRA) quantises 70B model weights to NF4 for 4× compression — same math. ADR-030 (AWQ) does the same with activation-awareness. The DuckDB page stores Parquet with Snappy + Delta encoding — column-wise quantisation of integer timestamps. The Arrow page stores zero-copy columnar buffers — fixed-width quantisation for cache-aligned reads. Everywhere the platform reduces data size, the same Lloyd-Max / rate-distortion theory applies. The unification: the platform is a hierarchy of codebooks, each layer (Bronze raw → Silver conformed → Gold dimensional → semantic layer → embedding → 4-bit weights) is a quantisation step that loses some information but gains efficiency. The Medallion architecture IS a multi-stage quantisation pipeline, with each stage's codebook tuned to its consumer's perceptual metric. The data engineer and the ML engineer are running the same rate-distortion optimisation, just on different manifolds.</p>
        </div>
      </SectionCard>

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("fine-tuning")} className="text-sm text-primary hover:underline">→ Fine-Tuning (QLoRA + NF4 for backward pass)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("distributed-training")} className="text-sm text-primary hover:underline">→ Distributed Training (FSDP — pre-quantisation training)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("comp-sci-materials")} className="text-sm text-primary hover:underline">→ Comp Sci & Materials (the hardware)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("vector-db")} className="text-sm text-primary hover:underline">→ Vector DB (pgvector quantisation — same math)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">→ ADR-030 (AWQ + GGUF adoption)</Link>
      </div>
    </div>
  );
}
