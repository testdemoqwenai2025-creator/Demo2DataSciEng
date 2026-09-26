"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { NextSteps } from "../_components/next-steps";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Network, Layers, Zap, TrendingUp, Terminal, Brain,
  Cpu, Activity, Sparkles,
} from "lucide-react";

const KPIS = [
  { label: "Attention heads", value: "12-96", hint: "BERT-base: 12, GPT-3 175B: 96", deltaTone: "flat" as const },
  { label: "Context window", value: "4k-128k", hint: "GPT-4: 128k tokens, Claude: 200k", deltaTone: "flat" as const },
  { label: "Key equation", value: "softmax(QK^T/√d)V", hint: "The attention formula", deltaTone: "flat" as const },
  { label: "Params (GPT-3)", value: "175B", hint: "96 layers × 96 heads × 12288 dim", deltaTone: "flat" as const },
];

// ============================================================
// Animated Self-Attention (3D)
// ============================================================
function SelfAttentionAnimation() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setStep((s) => (s + 1) % 4), 1000);
    return () => clearInterval(interval);
  }, []);

  const tokens = ["The", "cat", "sat", "on", "the", "mat"];
  const colors = ["var(--chart-2)", "var(--chart-1)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-1)"];

  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <style>{`
        .attn-3d { perspective: 600px; }
        .attn-card { transform: rotateX(10deg); transform-style: preserve-3d; }
      `}</style>
      <div className="attn-3d">
        <div className="attn-card">
          {/* Token row */}
          <div className="flex justify-center gap-1 mb-3">
            {tokens.map((t, i) => (
              <motion.div
                key={i}
                animate={{
                  scale: step === 0 && i === 2 ? 1.3 : 1,
                  backgroundColor: step === 0 && i === 2 ? "var(--primary)" : "var(--muted)",
                  color: step === 0 && i === 2 ? "var(--primary-foreground)" : "var(--muted-foreground)",
                }}
                className="rounded px-2 py-1 text-xs font-mono"
              >
                {t}
              </motion.div>
            ))}
          </div>
          {/* Attention lines — from "sat" to all others */}
          <svg viewBox="0 0 300 80" className="w-full h-20">
            {tokens.map((_, i) => (
              <motion.line
                key={i}
                x1={150} y1={5}
                x2={25 + i * 50} y2={70}
                stroke={step >= 1 ? colors[i] : "transparent"}
                strokeWidth={step >= 2 ? (i === 2 ? 3 : 1.5) : 0.5}
                opacity={step >= 1 ? (i === 2 ? 0.9 : 0.4) : 0}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: step >= 1 ? 1 : 0 }}
                transition={{ delay: i * 0.05 }}
              />
            ))}
            {/* Weights as numbers */}
            {tokens.map((_, i) => (
              <motion.text
                key={`w-${i}`}
                x={25 + i * 50}
                y={78}
                textAnchor="middle"
                fontSize={7}
                fill="var(--muted-foreground)"
                initial={{ opacity: 0 }}
                animate={{ opacity: step >= 3 ? 1 : 0 }}
              >
                {[0.05, 0.15, 0.05, 0.50, 0.05, 0.20][i]}
              </motion.text>
            ))}
          </svg>
        </div>
      </div>
      <div className="flex justify-center gap-2 mt-2">
        {["1. Query", "2. Score (Q·K)", "3. Softmax", "4. Weight V"].map((s, i) => (
          <div key={s} className={`text-[10px] px-2 py-0.5 rounded ${step === i ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {s}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        Self-attention: "sat" attends to all tokens. Q="sat", K=all tokens. Scores = Q·K<sup>T</sup>/√d. Softmax → weights. Output = Σ(weight × V).
      </p>
    </div>
  );
}

// ============================================================
// Positional Encoding Animation
// ============================================================
function PositionalEncodingAnimation() {
  const [dim, setDim] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setDim((d) => (d + 1) % 8), 400);
    return () => clearInterval(interval);
  }, []);

  // Sinusoidal positional encoding: PE(pos, 2i) = sin(pos/10000^(2i/d)), PE(pos, 2i+1) = cos(pos/10000^(2i/d))
  const positions = 6;
  const dims = 8;

  function pe(pos: number, d: number) {
    const freq = 1 / Math.pow(10000, 2 * Math.floor(d / 2) / dims);
    return d % 2 === 0 ? Math.sin(pos * freq) : Math.cos(pos * freq);
  }

  function colorFor(v: number) {
    const intensity = (v + 1) / 2; // 0 to 1
    if (intensity > 0.7) return "oklch(0.55 0.16 165 / 0.8)"; // emerald
    if (intensity > 0.4) return "oklch(0.70 0.15 75 / 0.5)";  // amber
    return "oklch(0.7 0 0 / 0.15)"; // gray
  }

  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <p className="text-sm font-semibold mb-2">Positional Encoding — sinusoidal</p>
      <div className="overflow-x-auto">
        <table className="mx-auto">
          <thead>
            <tr>
              <th className="text-[10px] text-muted-foreground px-2 py-1">pos\d</th>
              {Array.from({ length: dims }, (_, i) => (
                <th key={i} className="text-[10px] text-muted-foreground px-1">{i}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: positions }, (_, pos) => (
              <tr key={pos}>
                <td className="text-[10px] font-mono text-muted-foreground px-2 py-1">{pos}</td>
                {Array.from({ length: dims }, (_, d) => {
                  const v = pe(pos, d);
                  const isActive = d === dim;
                  return (
                    <td key={d} className="p-0.5">
                      <motion.div
                        animate={{
                          backgroundColor: colorFor(v),
                          scale: isActive ? 1.2 : 1,
                          boxShadow: isActive ? "0 0 8px oklch(0.55 0.16 165 / 0.5)" : "none",
                        }}
                        className="h-8 w-10 rounded flex items-center justify-center text-[9px] font-mono text-white"
                      >
                        {v.toFixed(2)}
                      </motion.div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        PE(pos, 2i) = sin(pos / 10000<sup>2i/d</sup>), PE(pos, 2i+1) = cos(pos / 10000<sup>2i/d</sup>).
        Each position gets a unique encoding — the model learns relative positions from these.
      </p>
    </div>
  );
}

// ============================================================
// Multi-Head Attention Diagram
// ============================================================
function MultiHeadDiagram() {
  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <svg viewBox="0 0 400 200" className="w-full h-auto">
        {/* Input */}
        <text x="20" y="100" fill="var(--foreground)" fontSize={10} fontWeight={600}>Input</text>
        <text x="20" y="112" fill="var(--muted-foreground)" fontSize={8}>(seq, d_model)</text>

        {/* Q, K, V projections */}
        <line x1="55" y1="100" x2="90" y2="50" stroke="var(--chart-2)" strokeWidth={1} />
        <line x1="55" y1="100" x2="90" y2="100" stroke="var(--chart-3)" strokeWidth={1} />
        <line x1="55" y1="100" x2="90" y2="150" stroke="var(--chart-4)" strokeWidth={1} />
        <text x="75" y="42" fill="var(--chart-2)" fontSize={9}>Q</text>
        <text x="75" y="95" fill="var(--chart-3)" fontSize={9}>K</text>
        <text x="75" y="165" fill="var(--chart-4)" fontSize={9}>V</text>

        {/* Heads */}
        {[0, 1, 2, 3].map((h) => {
          const y = 30 + h * 40;
          return (
            <g key={h}>
              <rect x="110" y={y} width="60" height="25" rx="3"
                fill={`oklch(0.55 0.16 ${165 + h * 30} / 0.15)`}
                stroke={`oklch(0.55 0.16 ${165 + h * 30} / 0.4)`}
                strokeWidth={1} />
              <text x="140" y={y + 16} fill="var(--foreground)" fontSize={8} textAnchor="middle" fontWeight={600}>
                Head {h + 1}
              </text>
              <text x="140" y={y + 24} fill="var(--muted-foreground)" fontSize={6} textAnchor="middle">
                d_k={"\u00b7"}
              </text>
              <line x1="55" y1="50" x2="110" y2={y + 12} stroke="var(--chart-2)" strokeWidth={0.5} opacity={0.3} />
              <line x1="55" y1="100" x2="110" y2={y + 12} stroke="var(--chart-3)" strokeWidth={0.5} opacity={0.3} />
              <line x1="55" y1="150" x2="110" y2={y + 12} stroke="var(--chart-4)" strokeWidth={0.5} opacity={0.3} />
            </g>
          );
        })}

        {/* Concat + Linear */}
        <line x1="170" y1="100" x2="210" y2="100" stroke="var(--muted-foreground)" strokeWidth={1} />
        <text x="190" y="92" fill="var(--muted-foreground)" fontSize={7} textAnchor="middle">concat</text>
        <rect x="210" y="85" width="50" height="30" rx="3" fill="var(--primary)" opacity={0.15} stroke="var(--primary)" strokeWidth={1} />
        <text x="235" y="100" fill="var(--primary)" fontSize={9} textAnchor="middle" fontWeight={600}>W_O</text>
        <text x="235" y="110" fill="var(--primary)" fontSize={6} textAnchor="middle">Linear</text>

        {/* Output */}
        <line x1="260" y1="100" x2="310" y2="100" stroke="var(--muted-foreground)" strokeWidth={1} />
        <text x="330" y="100" fill="var(--foreground)" fontSize={10} fontWeight={600}>Output</text>
        <text x="330" y="112" fill="var(--muted-foreground)" fontSize={8}>(seq, d_model)</text>
      </svg>
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        Multi-head attention: h parallel attention heads, each with learned Q/K/V projections. Concatenate + linear (W_O) → output. h=12 (BERT), h=96 (GPT-3).
      </p>
    </div>
  );
}

// ============================================================
// Pyodide demos
// ============================================================
const ATTENTION_DEMO = `# Self-Attention computation in pure Python
# Shows the 4 steps: Q, K, V → scores → softmax → weighted sum

import math

def softmax(vec):
    exps = [math.exp(v) for v in vec]
    total = sum(exps)
    return [e / total for e in exps]

# Synthetic Q, K, V for 3 tokens (4-dim each)
# In a real Transformer: Q = x @ W_Q, K = x @ W_K, V = x @ W_V
Q = [[1.0, 0.5, -0.3, 0.8],   # token "The"
     [0.2, 0.9, 0.4, -0.1],   # token "cat"
     [-0.5, 0.3, 1.2, 0.6]]    # token "sat"

K = [[1.0, 0.5, -0.3, 0.8],
     [0.2, 0.9, 0.4, -0.1],
     [-0.5, 0.3, 1.2, 0.6]]

V = [[0.1, 0.9, 0.3, 0.7],
     [0.8, 0.2, 0.5, 0.1],
     [0.3, 0.6, 0.9, 0.4]]

d_k = len(Q[0])  # dimension of keys = 4

print("=" * 60)
print("Self-Attention Computation")
print("=" * 60)
print(f"\\nTokens: 3, Dimension: {d_k}")

# Step 1: Compute scores = Q @ K^T / sqrt(d_k)
print("\\n--- Step 1: Attention Scores (Q . K^T / sqrt(d_k)) ---")
scores = []
for i in range(3):
    row = []
    for j in range(3):
        dot = sum(Q[i][d] * K[j][d] for d in range(d_k))
        row.append(dot / math.sqrt(d_k))
    scores.append(row)
    
for i in range(3):
    print(f"  Token {i}: scores = {[f'{s:.3f}' for s in scores[i]]}")

# Step 2: Softmax normalisation
print("\\n--- Step 2: Softmax (normalise to probabilities) ---")
attn_weights = [softmax(scores[i]) for i in range(3)]
for i in range(3):
    print(f"  Token {i}: weights = {[f'{w:.3f}' for w in attn_weights[i]]}")

# Step 3: Weighted sum of values
print("\\n--- Step 3: Weighted sum (attention @ V) ---")
output = []
for i in range(3):
    out = [0.0] * d_k
    for j in range(3):
        for d in range(d_k):
            out[d] += attn_weights[i][j] * V[j][d]
    output.append(out)

for i in range(3):
    print(f"  Token {i}: output = {[f'{v:.3f}' for v in output[i]]}")

print(f"\\n{'=' * 60}")
print("RESULT: Self-Attention(Q, K, V) = softmax(Q·K^T/√d_k) · V")
print(f"\\nKey insight: each token's output is a weighted average of ALL")
print(f"tokens' values, weighted by how much it 'attends' to each.")
print(f"\\nThis is the core of the Transformer — no recurrence, no")
print(f"convolution, just attention. The model LEARNS Q/K/V weights.")
print("=" * 60)`;

const PE_DEMO = `# Positional Encoding — sinusoidal (from "Attention Is All You Need")
import math

def positional_encoding(seq_len, d_model):
    "PE(pos, 2i) = sin(pos/10000^(2i/d)), PE(pos, 2i+1) = cos(pos/10000^(2i/d))"
    pe = []
    for pos in range(seq_len):
        row = []
        for i in range(d_model):
            freq = 1 / math.pow(10000, 2 * (i // 2) / d_model)
            if i % 2 == 0:
                row.append(math.sin(pos * freq))
            else:
                row.append(math.cos(pos * freq))
        pe.append(row)
    return pe

# Generate PE for 6 positions × 8 dimensions
pe = positional_encoding(6, 8)

print("=" * 60)
print("Positional Encoding — Sinusoidal")
print("=" * 60)
print(f"\\nPositions: 6, Dimensions: 8")
print(f"\\n{'Pos':>4}", end="")
for d in range(8):
    print(f"  d{d:02d}", end="")
print()

for pos in range(6):
    print(f"{pos:>4}", end="")
    for d in range(8):
        print(f" {pe[pos][d]:>5.2f}", end="")
    print()

# Show that relative positions are learnable
print(f"\\n{'=' * 60}")
print("KEY PROPERTY: dot product of PEs encodes RELATIVE position")
print()

# Dot product of PE(pos=0) and PE(pos=k) for k=0..5
for k in range(6):
    dot = sum(pe[0][d] * pe[k][d] for d in range(8))
    print(f"  PE(0) . PE({k}) = {dot:+.4f}  (closer positions → higher dot product)")

print(f"\\nThe sinusoidal encoding lets the model learn relative positions")
print(f"via linear projections of PE — no recurrence needed.")
print("=" * 60)`;

export function TransformerPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Transformer · deep architecture"
        title="Transformer Architecture Deep Dive"
        description="The architecture behind GPT, BERT, Claude, and every modern LLM. Animated self-attention mechanism, sinusoidal positional encoding heatmap, multi-head attention diagram, and Pyodide demos computing real attention scores + positional encodings. With low-level PyTorch code showing exactly how MultiheadAttention is implemented."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Network className="h-3 w-3" /> 3D animated</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Pyodide</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />)}
      </div>

      {/* Animated Self-Attention */}
      <SectionCard title="3D Animation: Self-Attention Mechanism" description="Watch 'sat' attend to all other tokens. 4-step cycle: Query → Score (Q·K) → Softmax → Weight V. The attention weights determine how much each token contributes to the output." icon={<Network className="h-5 w-5" />} badge="3D animated">
        <SelfAttentionAnimation />
      </SectionCard>

      {/* The Attention Equation */}
      <SectionCard title="The equation that changed AI" description="'Attention Is All You Need' (2017). One equation that replaced recurrence + convolution with pure attention." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-center">
          <p className="font-mono text-lg text-primary">
            Attention(Q, K, V) = softmax(Q · K<sup>T</sup> / √d<sub>k</sub>) · V
          </p>
        </div>
        <div className="mt-3 grid md:grid-cols-4 gap-2 text-xs">
          <div className="rounded-md border border-border/60 p-2">
            <p className="font-semibold">Q (Query)</p>
            <p className="text-muted-foreground text-[11px]">"What am I looking for?" — x @ W_Q</p>
          </div>
          <div className="rounded-md border border-border/60 p-2">
            <p className="font-semibold">K (Key)</p>
            <p className="text-muted-foreground text-[11px]">"What do I contain?" — x @ W_K</p>
          </div>
          <div className="rounded-md border border-border/60 p-2">
            <p className="font-semibold">V (Value)</p>
            <p className="text-muted-foreground text-[11px]">"What do I contribute?" — x @ W_V</p>
          </div>
          <div className="rounded-md border border-border/60 p-2">
            <p className="font-semibold">√d<sub>k</sub></p>
            <p className="text-muted-foreground text-[11px]">Scaling factor — prevents softmax saturation in high dimensions</p>
          </div>
        </div>
      </SectionCard>

      {/* Pyodide attention demo */}
      <SectionCard title="Try it: Self-attention computation (Pyodide)" description="Computes real attention scores, softmax weights, and weighted value sums on 3 synthetic tokens. The 4-step computation that powers every Transformer. Pure Python — no PyTorch, no NumPy." icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={ATTENTION_DEMO} buttonLabel="Run attention computation (Pyodide)" />
      </SectionCard>

      {/* Positional Encoding */}
      <SectionCard title="Animation: Positional Encoding Heatmap" description="Sinusoidal positional encoding gives each position a unique signature. The model learns relative positions from these encodings. Watch the dimension highlight cycle through." icon={<Layers className="h-5 w-5" />} badge="animated">
        <PositionalEncodingAnimation />
      </SectionCard>

      {/* Pyodide PE demo */}
      <SectionCard title="Try it: Positional encoding computation (Pyodide)" description="Generates the full sinusoidal PE matrix (6 positions × 8 dimensions) and shows that dot products encode relative position." icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={PE_DEMO} buttonLabel="Run positional encoding (Pyodide)" />
      </SectionCard>

      {/* Multi-head attention diagram */}
      <SectionCard title="Multi-Head Attention Diagram" description="h parallel attention heads, each with learned Q/K/V projections. Concatenate + linear (W_O) → output. h=12 (BERT-base), h=96 (GPT-3 175B)." icon={<Network className="h-5 w-5" />}>
        <MultiHeadDiagram />
      </SectionCard>

      {/* Low-level PyTorch code */}
      <SectionCard title="Low-level code: MultiheadAttention in PyTorch" description="The actual implementation. Every nn.MultiheadAttention in PyTorch is built on this pattern. Q/K/V projections, scaled dot-product, softmax, weighted sum." icon={<Cpu className="h-5 w-5" />} badge="low-level">
        <CodeBlock language="python" filename="multihead_attention.py" highlight={[8,9,10,13,14,15,16,19,20,21,22,23,24,25,26,29,30,31,32,33]} code={`import torch
import torch.nn as nn
import torch.nn.functional as F
import math

class MultiHeadAttention(nn.Module):
    def __init__(self, d_model=512, n_heads=8):
        super().__init__()
        self.d_model = d_model
        self.n_heads = n_heads
        self.d_k = d_model // n_heads  # dimension per head
        
        # Learnable projections
        self.W_q = nn.Linear(d_model, d_model)  # query projection
        self.W_k = nn.Linear(d_model, d_model)  # key projection
        self.W_v = nn.Linear(d_model, d_model)  # value projection
        self.W_o = nn.Linear(d_model, d_model)  # output projection
    
    def forward(self, x, mask=None):
        batch, seq_len, _ = x.shape
        
        # Project to Q, K, V
        Q = self.W_q(x)  # (batch, seq, d_model)
        K = self.W_k(x)
        V = self.W_v(x)
        
        # Reshape to (batch, n_heads, seq, d_k)
        Q = Q.view(batch, seq_len, self.n_heads, self.d_k).transpose(1, 2)
        K = K.view(batch, seq_len, self.n_heads, self.d_k).transpose(1, 2)
        V = V.view(batch, seq_len, self.n_heads, self.d_k).transpose(1, 2)
        
        # Scaled dot-product attention
        scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(self.d_k)
        if mask is not None:
            scores = scores.masked_fill(mask == 0, float('-inf'))
        attn = F.softmax(scores, dim=-1)  # (batch, heads, seq, seq)
        
        # Weighted sum of values
        output = torch.matmul(attn, V)  # (batch, heads, seq, d_k)
        
        # Concatenate heads + output projection
        output = output.transpose(1, 2).contiguous().view(batch, seq_len, self.d_model)
        return self.W_o(output)  # (batch, seq, d_model)

# Usage
attn = MultiHeadAttention(d_model=512, n_heads=8)
x = torch.randn(1, 10, 512)  # batch=1, seq=10, dim=512
out = attn(x)  # → (1, 10, 512)
print(f"Input:  {x.shape}")
print(f"Output: {out.shape}")
print(f"Params: {sum(p.numel() for p in attn.parameters()):,}")`} />
      </SectionCard>

      {/* Transformer block */}
      <SectionCard title="The full Transformer block" description="One layer of a Transformer: multi-head attention + add&norm + feed-forward + add&norm. Stacked N times (N=6 for base, N=96 for GPT-3)." icon={<Layers className="h-5 w-5" />}>
        <CodeBlock language="text" filename="transformer_block.txt" code={`┌──────────────────────────────────────────────────────────┐
│  TRANSFORMER BLOCK (repeated N times)                     │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Multi-Head Self-Attention                         │ │
│  │  Q = x @ W_Q, K = x @ W_K, V = x @ W_V             │ │
│  │  Attention = softmax(Q·K^T/√d_k)·V                 │ │
│  │  Output = concat(heads) @ W_O                       │ │
│  └────────────────────────────────────────────────────┘ │
│  ↓ + residual (x)                                        │
│  ↓ LayerNorm                                            │
│  ↓                                                      │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Feed-Forward Network (2-layer MLP)               │ │
│  │  FFN(x) = max(0, x·W_1 + b_1) · W_2 + b_2          │ │
│  │  d_model → d_ff (4×) → d_model                      │ │
│  │  Activation: ReLU (original) or GELU (GPT/BERT)    │ │
│  └────────────────────────────────────────────────────┘ │
│  ↓ + residual                                           │
│  ↓ LayerNorm                                            │
│  ↓                                                      │
│  → output to next block (same shape: seq × d_model)      │
└──────────────────────────────────────────────────────────┘

GPT-3 175B: 96 blocks × 96 heads × d_model=12288 × d_ff=49152
= 175,000,000,000 parameters`} />
      </SectionCard>

      {/* Insight */}
      <SectionCard title="My deeper thought: attention IS content-addressable memory" description="The deepest way to understand attention: it's content-addressable memory. Each token asks 'who has information relevant to me?' and retrieves it." icon={<TrendingUp className="h-5 w-5" />} badge="Insight">
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>The standard explanation of attention is "tokens look at each other." But the deeper truth is: <strong className="text-foreground/80">attention is a content-addressable memory system</strong>. Q is the query ("what do I need?"), K is the index ("what do I have?"), V is the content ("what do I contribute?"). The dot product Q·K measures similarity — how relevant is each memory to the query. Softmax normalises to a probability distribution over memories. The weighted sum of V is the retrieved content.</p>
          <p>This connects directly to the platform's RAG architecture (ADR-022): <strong className="text-foreground/80">RAG IS attention over an external knowledge base</strong>. The user's question is Q. The Gold table embeddings are K+V. Cosine similarity is the dot product Q·K. The top-k retrieved rows are the attention weights. The LLM's context window is the weighted sum of V. RAG is attention, just with the K+V stored in pgvector instead of in the model's parameters.</p>
          <p><strong className="text-foreground/80">The unified semantic layer (ADR-024)</strong> is the final convergence: MetricFlow entities define what the K+V vectors contain (the schema). RAG (pgvector) provides the retrieval mechanism. LoRA (ADR-023) adapts the Q/K/V projections to the platform's domain. The user asks "what was UK revenue?" → the LoRA-adapted Q projection embeds the question → pgvector retrieves the matching Gold table rows (K·V) → the LLM generates a grounded answer. Attention IS retrieval. RAG IS attention. The platform IS the Transformer's external memory.</p>
          <p>The multi-head mechanism is the model's way of attending to <em>different aspects</em> simultaneously — one head might attend to "revenue" (the number), another to "UK" (the region), another to "Q3" (the time). Each head is a different "perspective" on the same data. The multi-head attention diagram on this page shows how h parallel heads each compute their own attention, then concatenate into the final output. In the RAG analogy: each head is a different search query against the vector DB — "revenue AND UK AND Q3" vs "customers AND VIP AND churn" — each retrieving different rows, all combined into the final answer.</p>
        </div>
      </SectionCard>

      <DeeperThoughtSection pageTitle="Transformer Architecture Deep Dive">
        <DeeperThought title="Transformer Architecture Deep Dive IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about Transformer Architecture Deep Dive is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. Transformer Architecture Deep Dive connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where Transformer Architecture Deep Dive sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (Transformer Architecture Deep Dive) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "Trace this topic's connections across the platform's math graph" }, { id: "neural-networks" as const, reason: "Continue to neural networks — see also from this page" }, { id: "fine-tuning" as const, reason: "Continue to fine tuning — see also from this page" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("neural-networks")} className="text-sm text-primary hover:underline">→ Neural Networks (activation functions + backprop)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("fine-tuning")} className="text-sm text-primary hover:underline">→ LLM Fine-Tuning (LoRA + DPO)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("rag-llms")} className="text-sm text-primary hover:underline">→ RAG & LLMs (attention IS retrieval)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">→ ADR-024 (semantic layer)</Link>
      </div>
    </div>
  );
}
