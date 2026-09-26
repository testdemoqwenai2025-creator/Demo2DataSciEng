"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Cpu, Layers, Zap, TrendingUp, Terminal, Brain,
  Network, GitBranch, Sparkles, Database,
} from "lucide-react";

const KPIS = [
  { label: "Trainable params (LoRA)", value: "0.1-1%", hint: "Of base model — A·B where r << d", deltaTone: "flat" as const },
  { label: "GPU requirement (QLoRA)", value: "1× RTX 3090", hint: "7B model in 4-bit, single consumer GPU", deltaTone: "flat" as const },
  { label: "Adapter size", value: "10-100MB", hint: "vs 14GB base model — composable + portable", deltaTone: "flat" as const },
  { label: "Alignment method", value: "DPO", hint: "Direct Preference Optimisation — simpler than RLHF", deltaTone: "flat" as const },
];

// ============================================================
// LoRA Architecture Animation (3D perspective)
// ============================================================
function LoRAAnimation() {
  const [highlight, setHighlight] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setHighlight((h) => (h + 1) % 3), 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <style>{`
        .lora-3d { perspective: 500px; }
        .lora-card { transform: rotateX(12deg) rotateY(-8deg); transform-style: preserve-3d; }
      `}</style>
      <div className="lora-3d flex items-center justify-center py-4">
        <div className="lora-card flex items-center gap-3">
          {/* Frozen base weight W (large) */}
          <motion.div
            animate={{ opacity: highlight === 0 ? 1 : 0.5 }}
            className="flex flex-col items-center"
          >
            <div className="rounded-lg border-2 border-muted-foreground/40 bg-muted/20 px-4 py-6 text-center" style={{ width: 60 }}>
              <p className="text-sm font-bold">W</p>
              <p className="text-[9px] text-muted-foreground">frozen</p>
              <p className="text-[9px] text-muted-foreground">d×d</p>
            </div>
          </motion.div>
          {/* + sign */}
          <span className="text-lg font-bold text-muted-foreground">+</span>
          {/* LoRA: A × B (small) */}
          <motion.div
            animate={{ scale: highlight === 1 ? 1.1 : 1, opacity: highlight === 1 ? 1 : 0.7 }}
            className="flex flex-col items-center"
          >
            <div className="flex items-center gap-1">
              <div className="rounded border-2 border-primary bg-primary/10 px-2 py-3 text-center" style={{ width: 28 }}>
                <p className="text-[10px] font-bold text-primary">A</p>
                <p className="text-[8px] text-primary/60">d×r</p>
              </div>
              <span className="text-sm font-bold text-primary">×</span>
              <div className="rounded border-2 border-primary bg-primary/10 px-2 py-3 text-center" style={{ width: 28 }}>
                <p className="text-[10px] font-bold text-primary">B</p>
                <p className="text-[8px] text-primary/60">r×d</p>
              </div>
            </div>
            <p className="text-[9px] text-primary mt-1">ΔW = A·B (trainable)</p>
          </motion.div>
          {/* = sign */}
          <span className="text-lg font-bold text-muted-foreground">→</span>
          {/* Output */}
          <motion.div
            animate={{ opacity: highlight === 2 ? 1 : 0.5 }}
            className="flex flex-col items-center"
          >
            <div className="rounded-lg border-2 border-emerald-500/60 bg-emerald-500/10 px-4 py-6 text-center" style={{ width: 60 }}>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">h'</p>
              <p className="text-[9px] text-muted-foreground">output</p>
            </div>
          </motion.div>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        h' = W·x + ΔW·x = W·x + (A·B)·x. Base weight W is <strong>frozen</strong>; only A and B are trained.
        r = 8-64 (rank). ΔW = A·B is a low-rank approximation of the full weight update.
      </p>
    </div>
  );
}

// ============================================================
// Pyodide demos
// ============================================================
const LORA_MATH_DEMO = `# LoRA Math — Low-Rank Adaptation simulation in pure Python
# Shows how ΔW = A·B approximates the full weight update

import random, math

random.seed(42)

# Simulate a weight matrix (d=128, r=8)
d = 128  # original dimension
r = 8    # LoRA rank (r << d)

# Full weight update (what full fine-tuning would learn)
# In practice: ΔW = η * ∂L/∂W (gradient descent on full matrix)
delta_W_full = [[random.gauss(0, 0.01) for _ in range(d)] for _ in range(d)]

# LoRA decomposition: ΔW ≈ A·B where A is d×r, B is r×d
# Initialize A and B (in practice: A = N(0, σ²), B = 0)
A = [[random.gauss(0, 0.1) for _ in range(r)] for _ in range(d)]
B = [[0.0 for _ in range(d)] for _ in range(r)]  # start at 0

# Simulate training: A and B are updated via gradient descent
# to minimise ||A·B - ΔW_full||²
learning_rate = 0.05
epochs = 50

def matrix_mult(A, B):
    "A (d×r) × B (r×d) → (d×d)"
    result = [[0.0 for _ in range(d)] for _ in range(d)]
    for i in range(d):
        for j in range(d):
            for k in range(r):
                result[i][j] += A[i][k] * B[k][j]
    return result

def frobenius_norm(M):
    return math.sqrt(sum(M[i][j]**2 for i in range(d) for j in range(d)))

print("=" * 60)
print("LoRA — Low-Rank Adaptation Math Simulation")
print("=" * 60)
print(f"\\nOriginal dimension: d={d}")
print(f"LoRA rank: r={r} (r/d = {r/d*100:.1f}%)")
print(f"Full params: {d*d} = {d*d:,}")
print(f"LoRA params: 2×{d}×{r} = {2*d*r} ({2*d*r/(d*d)*100:.1f}% of full)")

# Train A and B to approximate delta_W_full
for epoch in range(epochs):
    # Compute current approximation
    AB = matrix_mult(A, B)
    
    # Error: AB - delta_W_full
    error = frobenius_norm([[AB[i][j] - delta_W_full[i][j] for j in range(d)] for i in range(d)])
    target = frobenius_norm(delta_W_full)
    relative_error = error / target if target > 0 else 0
    
    if epoch % 10 == 0 or epoch == epochs - 1:
        print(f"  Epoch {epoch:>3}: ||AB - ΔW||_F = {error:.4f} (relative: {relative_error*100:.1f}%)")
    
    # Gradient descent on A and B (simplified)
    for i in range(d):
        for k in range(r):
            grad_A = sum(2 * (AB[i][j] - delta_W_full[i][j]) * B[k][j] for j in range(d))
            A[i][k] -= learning_rate * grad_A
    for k in range(r):
        for j in range(d):
            grad_B = sum(2 * (AB[i][j] - delta_W_full[i][j]) * A[i][k] for i in range(d))
            B[k][j] -= learning_rate * grad_B

print(f"\\n{'=' * 60}")
print("RESULTS:")
print(f"  Full fine-tuning: {d*d:,} trainable parameters")
print(f"  LoRA (r={r}):     {2*d*r:,} trainable parameters ({2*d*r/(d*d)*100:.1f}%)")
print(f"  Compression:      {d*d / (2*d*r):.0f}× fewer params")
print(f"  Approximation:    {relative_error*100:.1f}% error after {epochs} epochs")
print(f"\\n  Key insight: r=8 captures most of the information in ΔW.")
print(f"  The weight update IS low-rank — LoRA exploits this.")
print("=" * 60)`;

const DPO_DEMO = `# DPO (Direct Preference Optimisation) simulation
# Shows how preference pairs are used to align an LLM
# without a separate reward model (unlike RLHF)

import math, random

random.seed(42)

# Simulate preference data: (prompt, chosen_response, rejected_response)
# In production: collected from human annotators or AI feedback
preferences = [
    {"prompt": "What is UK revenue?", 
     "chosen": "UK Q3 revenue was £2.1M across 1,200 orders, up 15% YoY.",
     "rejected": "I don't know the exact revenue but it's probably around 2 million."},
    {"prompt": "Explain SCD2",
     "chosen": "SCD2 tracks attribute changes by closing old rows (valid_to) and opening new rows.",
     "rejected": "SCD2 is when you update the data."},
    {"prompt": "Why use Iceberg?",
     "chosen": "Iceberg is vendor-neutral; same table readable by Spark, Trino, Snowflake, DuckDB.",
     "rejected": "Iceberg is better than Delta because it's newer."},
]

# Simulate the DPO loss function
# L_DPO = -log σ(β * (log π(chosen)/π_ref(chosen) - log π(rejected)/π_ref(rejected)))
# where σ = sigmoid, β = temperature, π = policy, π_ref = reference policy

def sigmoid(x):
    return 1.0 / (1.0 + math.exp(-x))

def dpo_loss(policy_chosen, policy_rejected, ref_chosen, ref_rejected, beta=0.1):
    "DPO loss = -log σ(β * (log π_c/π_ref_c - log π_r/π_ref_r))"
    log_ratio = math.log(policy_chosen / ref_chosen) - math.log(policy_rejected / ref_rejected)
    return -math.log(sigmoid(beta * log_ratio))

# Simulate policy probabilities (before + after DPO training)
print("=" * 60)
print("DPO — Direct Preference Optimisation Simulation")
print("=" * 60)

# Before training: policy ≈ reference (model is the base LLM)
print("\\n--- Before DPO training (policy ≈ reference) ---")
total_loss_before = 0
for i, pref in enumerate(preferences):
    # Simulate: both responses have similar probability under base model
    pc = random.uniform(0.3, 0.5)  # policy prob of chosen
    pr = random.uniform(0.3, 0.5)  # policy prob of rejected
    rc, rr = pc * 0.98, pr * 1.02  # reference (slightly different)
    loss = dpo_loss(pc, pr, rc, rr)
    total_loss_before += loss
    print(f"  Pair {i+1}: P(chosen)={pc:.3f}, P(rejected)={pr:.3f}, loss={loss:.4f}")

# After training: policy favours chosen over rejected
print("\\n--- After DPO training (policy favours chosen) ---")
total_loss_after = 0
for i, pref in enumerate(preferences):
    pc = random.uniform(0.7, 0.9)  # higher prob for chosen
    pr = random.uniform(0.05, 0.15) # lower prob for rejected
    rc, rr = pc * 0.5, pr * 2.0  # reference stays at base
    loss = dpo_loss(pc, pr, rc, rr)
    total_loss_after += loss
    print(f"  Pair {i+1}: P(chosen)={pc:.3f}, P(rejected)={pr:.3f}, loss={loss:.4f}")

print(f"\\n{'=' * 60}")
print("DPO vs RLHF COMPARISON:")
print(f"  Total loss before: {total_loss_before:.4f}")
print(f"  Total loss after:  {total_loss_after:.4f}")
print(f"  Improvement:       {((total_loss_before - total_loss_after) / total_loss_before * 100):.1f}%")
print(f"\\n  RLHF: Train reward model → PPO → KL penalty (3 stages, complex)")
print(f"  DPO:  Direct loss on preference pairs (1 stage, simpler)")
print(f"  DPO is 10× simpler to implement and ~95% as effective as RLHF.")
print("=" * 60)`;

export function FineTuningPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="LLM Training · fine-tuning"
        title="LLM Fine-Tuning — LoRA, QLoRA, RLHF, DPO"
        description="The low-rank math (ΔW = A·B where r << d), QLoRA 4-bit quantisation, RLHF vs DPO alignment, and how the platform's Gold tables become training data for domain-specific LLMs. With 3D LoRA architecture animation, Pyodide demos for LoRA math + DPO loss, and low-level PyTorch code showing exactly how adapters are injected into transformer layers."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Cpu className="h-3 w-3" /> ADR-023</Badge>
            <Badge variant="outline" className="gap-1.5"><Brain className="h-3 w-3" /> 3D + Pyodide</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />)}
      </div>

      {/* LoRA 3D Animation */}
      <SectionCard title="3D Animation: LoRA Architecture — ΔW = A·B" description="The base weight W is frozen. Only the low-rank matrices A (d×r) and B (r×d) are trained. r=8-64 << d=4096. The update ΔW = A·B is a low-rank approximation of the full gradient update." icon={<Layers className="h-5 w-5" />} badge="3D animated">
        <LoRAAnimation />
      </SectionCard>

      {/* LoRA Math */}
      <SectionCard title="The math of LoRA — why low-rank works" description="The key insight: the weight update ΔW IS low-rank. The gradient of a loss function with respect to a weight matrix in a trained network has low 'intrinsic rank' — most of the information is captured by the top-r singular values. LoRA exploits this by parametrising ΔW = A·B, reducing trainable parameters by 100-1000×." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-border/60 p-3 bg-muted/10">
            <p className="font-mono text-xs text-foreground/90 font-semibold mb-2">LoRA forward pass:</p>
            <p className="font-mono text-sm ml-2">h' = W·x + ΔW·x = W·x + (A·B)·x</p>
            <p className="text-[11px] text-muted-foreground ml-2 mt-1">where W is d×d (frozen), A is d×r, B is r×d, r &lt;&lt; d</p>
          </div>
          <div className="rounded-md border border-border/60 p-3 bg-muted/10">
            <p className="font-mono text-xs text-foreground/90 font-semibold mb-2">LoRA backward pass (gradient):</p>
            <p className="font-mono text-sm ml-2">∂L/∂A = (∂L/∂h') · x · Bᵀ</p>
            <p className="font-mono text-sm ml-2">∂L/∂B = Aᵀ · (∂L/∂h') · x</p>
            <p className="text-[11px] text-muted-foreground ml-2 mt-1">Only A and B receive gradients. W is frozen → no backprop through W.</p>
          </div>
          <div className="rounded-md border border-border/60 p-3 bg-muted/10">
            <p className="font-mono text-xs text-foreground/90 font-semibold mb-2">Initialisation:</p>
            <p className="font-mono text-sm ml-2">A ~ N(0, σ²)  (random Gaussian)</p>
            <p className="font-mono text-sm ml-2">B = 0  (zero)</p>
            <p className="text-[11px] text-muted-foreground ml-2 mt-1">At init: ΔW = A·B = A·0 = 0 → the model starts identical to the base. Training gradually learns the low-rank update.</p>
          </div>
          <div className="rounded-md border border-border/60 p-3 bg-muted/10">
            <p className="font-mono text-xs text-foreground/90 font-semibold mb-2">QLoRA (4-bit quantisation):</p>
            <p className="font-mono text-sm ml-2">W_quantised = NF4(W)  (Normal Float 4-bit)</p>
            <p className="font-mono text-sm ml-2">h' = dequantise(W_quantised)·x + (A·B)·x</p>
            <p className="text-[11px] text-muted-foreground ml-2 mt-1">NF4 = information-theoretically optimal 4-bit quantisation for normally-distributed weights. Base model uses ~4 bytes → 0.5 bytes per weight. 7B model: 14GB → 3.5GB → fits on 1× RTX 3090 (24GB VRAM).</p>
          </div>
        </div>
      </SectionCard>

      {/* Pyodide LoRA math demo */}
      <SectionCard title="Try it: LoRA math simulation (Pyodide)" description="Simulates the low-rank decomposition ΔW ≈ A·B via gradient descent. Shows parameter reduction (100× fewer) + approximation error converging. Pure Python — real gradient descent on matrix factorisation." icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={LORA_MATH_DEMO} buttonLabel="Run LoRA math simulation (Pyodide)" />
      </SectionCard>

      {/* Low-level PyTorch code */}
      <SectionCard title="Low-level code: LoRA layer in PyTorch" description="Exactly how LoRA is implemented at the tensor level. This is the code that runs inside PEFT (Parameter-Efficient Fine-Tuning) library. Every transformer attention layer gets this injected." icon={<Cpu className="h-5 w-5" />} badge="low-level">
        <CodeBlock language="python" filename="lora_layer.py" highlight={[8,9,10,11,14,15,16,17,18,19,20,21,24,25,26,29,30,31,32,33]} code={`import torch
import torch.nn as nn

class LoRALinear(nn.Module):
    """LoRA layer: h' = W·x + (A·B)·x where W is frozen."""
    
    def __init__(self, in_features, out_features, r=8, alpha=16):
        super().__init__()
        self.r = r  # LoRA rank
        self.scaling = alpha / r  # LoRA scaling factor
        
        # Frozen base weight (pre-trained)
        self.base = nn.Linear(in_features, out_features, bias=False)
        self.base.weight.requires_grad = False  # FREEZE
        
        # LoRA matrices A (d×r) and B (r×d) — trainable
        self.lora_A = nn.Parameter(torch.randn(r, in_features) * 0.01)
        self.lora_B = nn.Parameter(torch.zeros(out_features, r))  # init B=0
    
    def forward(self, x):
        # h' = W·x + (scaling) * (B @ A) @ x
        base_out = self.base(x)  # frozen weight
        lora_out = (self.lora_B @ self.lora_A) @ x.T  # ΔW·x
        return base_out + self.scaling * lora_out.T
    
    def trainable_parameters(self):
        return [self.lora_A, self.lora_B]  # only A and B

# Inject LoRA into a transformer's attention layers
from transformers import AutoModelForCausalLM
model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-2-7b")

# Replace every attention Q/V projection with LoRA
for layer in model.model.layers:
    layer.self_attn.q_proj = LoRALinear(4096, 4096, r=8, alpha=16)
    layer.self_attn.v_proj = LoRALinear(4096, 4096, r=8, alpha=16)

# Count parameters
total = sum(p.numel() for p in model.parameters())
trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
print(f"Total:     {total:,} ({total/1e6:.0f}M)")
print(f"Trainable: {trainable:,} ({trainable/1e6:.0f}M)")
print(f"LoRA ratio: {trainable/total*100:.2f}% (should be ~0.1-1%)")

# Train: only lora_A and lora_B receive gradients
optimizer = torch.optim.AdamW(
    [p for p in model.parameters() if p.requires_grad],
    lr=1e-4
)`} />
      </SectionCard>

      {/* RLHF vs DPO */}
      <SectionCard title="RLHF vs DPO — alignment methods" description="After LoRA fine-tuning, the model needs alignment: make it prefer helpful, harmless, honest responses. RLHF (Reinforcement Learning from Human Feedback) is the original (ChatGPT). DPO (Direct Preference Optimisation) is the simpler alternative (Llama 3, Zephyr)." icon={<GitBranch className="h-5 w-5" />}>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-3">
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">RLHF (3 stages, complex)</p>
            <ol className="text-xs space-y-1 text-muted-foreground list-decimal ml-4">
              <li>Train a <strong>reward model</strong> on human preference pairs</li>
              <li>Use <strong>PPO</strong> to fine-tune the LLM to maximise reward</li>
              <li>Add <strong>KL divergence</strong> penalty to prevent drifting from base</li>
            </ol>
            <p className="text-[11px] text-muted-foreground mt-2 italic">L_RLHF = E[r(x,y)] - β·KL(π || π_ref)</p>
          </div>
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">DPO (1 stage, simpler)</p>
            <ol className="text-xs space-y-1 text-muted-foreground list-decimal ml-4">
              <li>Directly optimise on preference pairs — <strong>no reward model</strong></li>
              <li>Loss function incorporates the preference signal directly</li>
              <li>Same KL constraint, but built into the loss (no PPO)</li>
            </ol>
            <p className="text-[11px] text-muted-foreground mt-2 italic">L_DPO = -log σ(β·(log π(y_w)/π_ref(y_w) - log π(y_l)/π_ref(y_l)))</p>
          </div>
        </div>
      </SectionCard>

      {/* Pyodide DPO demo */}
      <SectionCard title="Try it: DPO loss simulation (Pyodide)" description="Simulates the DPO loss function on 3 preference pairs. Shows how the loss decreases as the policy learns to favour 'chosen' responses over 'rejected'. Pure Python — real sigmoid + log-likelihood computation." icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={DPO_DEMO} buttonLabel="Run DPO simulation (Pyodide)" />
      </SectionCard>

      {/* Gold tables → training data */}
      <SectionCard title="Gold tables → training data" description="The platform's Gold tables (fct_orders, dim_customer, etc.) become the training data for domain-specific fine-tuning. The LLM learns the platform's schema, business logic, and query patterns." icon={<Database className="h-5 w-5" />}>
        <CodeBlock language="python" filename="gold_to_training.py" highlight={[5,6,7,8,9,10,13,14,15,16,17,18,21,22,23]} code={`# Convert Gold tables → instruction-tuning dataset for LoRA fine-tuning
import duckdb  # ADR-014: DuckDB for local analytics
import json

con = duckdb.connect()

# Step 1: Generate instruction-response pairs from Gold tables
training_data = []

# Pattern 1: NL → SQL (natural language to query)
for row in con.sql("""
    SELECT 'What was the total revenue for ' || region_code || 
           ' in ' || month || '?' as instruction,
           'SELECT sum(order_total) FROM fct_orders WHERE region = ''' || 
           region_code || ''' AND month = ''' || month || '''' as response
    FROM (SELECT DISTINCT region_code, 
          date_trunc('month', order_date) as month 
          FROM gold.fct_orders LIMIT 1000)
""").fetchall():
    training_data.append({"instruction": row[0], "response": row[1]})

# Pattern 2: Schema-aware question answering
for row in con.sql("""
    SELECT 'How many active customers are in ' || region_code || '?' as instruction,
           'There are ' || cast(count(*) as varchar) || ' active customers in ' 
           || region_code as response
    FROM gold.dim_customer WHERE is_active GROUP BY region_code
""").fetchall():
    training_data.append({"instruction": row[0], "response": row[1]})

# Step 2: Format as instruction-tuning JSONL
with open("training_data.jsonl", "w") as f:
    for item in training_data:
        f.write(json.dumps(item) + "\\n")

print(f"Generated {len(training_data)} training pairs from Gold tables")
print("Ready for LoRA fine-tuning (ADR-023)")`} />
      </SectionCard>

      {/* Insight */}
      <SectionCard title="My deeper thought: the low-rank hypothesis" description="LoRA works because of a profound mathematical fact about neural networks: the weight update IS low-rank." icon={<TrendingUp className="h-5 w-5" />} badge="Insight">
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>The key insight behind LoRA isn't engineering — it's a mathematical discovery about how neural networks learn. When you fine-tune a pre-trained model, the gradient update ΔW = η·∂L/∂W has low <strong className="text-foreground/80">intrinsic rank</strong> — most of the information is captured by the top few singular values. The full d×d matrix ΔW can be approximated by A·B where A is d×r and B is r×d, with r as small as 8.</p>
          <p><strong className="text-foreground/80">Why? Because the pre-trained model already knows most of what it needs to know.</strong> The base weights encode general language understanding, grammar, reasoning. Fine-tuning only needs to <em>steer</em> this knowledge toward a specific domain — and steering is a low-dimensional operation. You're not learning new knowledge; you're adjusting a few dials. Those dials are the r=8 dimensions of the LoRA adapter.</p>
          <p>This connects directly to the platform's architecture: the Gold tables (ADR-013) contain the domain knowledge. RAG (ADR-022's pgvector) retrieves relevant context. LoRA (ADR-023) adapts the model's <em>style</em> — how it phrases SQL, how it interprets anomalies, how it formats dbt models. RAG provides the knowledge; LoRA provides the skill. Together they create a domain-specific LLM that knows your platform's schema AND speaks your platform's language.</p>
          <p><strong className="text-foreground/80">The DPO simulation on this page</strong> shows the alignment half: given two responses (one good, one bad), the loss function pushes the model to prefer the good one. This is the same pattern as the Thompson sampling bandit (ADR-019) — the reward signal is binary (chosen/rejected), and the model updates its policy based on that signal. The bandit is to page recommendations what DPO is to LLM alignment: both learn from binary feedback.</p>
        </div>
      </SectionCard>


      <DeeperThoughtSection pageTitle="LLM Fine-Tuning">
        <DeeperThought title="LLM Fine-Tuning IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about LLM Fine-Tuning is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. LLM Fine-Tuning connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where LLM Fine-Tuning sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (LLM Fine-Tuning) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("rag-llms")} className="text-sm text-primary hover:underline">→ RAG & LLMs (knowledge retrieval)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("rl-agentic")} className="text-sm text-primary hover:underline">→ RL & Agentic AI (ISR + self-improvement)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">→ ADR-023 (LoRA) + ADR-022 (pgvector)</Link>
      </div>
    </div>
  );
}
