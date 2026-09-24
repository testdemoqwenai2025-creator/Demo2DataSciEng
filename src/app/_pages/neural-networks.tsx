"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { MultiLangSamples } from "../_components/multi-lang-samples";
import { PyodideRunner } from "../_components/pyodide-runner";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import {
  Brain, Cpu, Layers, Zap, TrendingUp, Boxes,
  Terminal, Play, Activity, Network, GitBranch,
  ArrowRight, Database, Sparkles,
} from "lucide-react";

const KPIS = [
  { label: "Network layers", value: "3+", hint: "Input → Hidden → Output (MLP) or 96+ (Transformer)", deltaTone: "flat" as const },
  { label: "Activation functions", value: "5", hint: "ReLU · Sigmoid · Tanh · GELU · Softmax", deltaTone: "flat" as const },
  { label: "Evolution", value: "17 yrs", hint: "Hadoop (2006) → LLMs (2023)", deltaTone: "flat" as const },
  { label: "In-browser demo", value: "Pyodide", hint: "Forward pass of a 2-layer MLP", deltaTone: "flat" as const },
];

// ============================================================
// Animated Neural Network SVG (Framer Motion)
// ============================================================
function NeuralNetworkAnimation() {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 500);
    return () => clearTimeout(t);
  }, []);

  const layers = [
    { name: "Input", nodes: 4, x: 80, color: "var(--chart-2)" },
    { name: "Hidden 1", nodes: 5, x: 200, color: "var(--chart-3)" },
    { name: "Hidden 2", nodes: 5, x: 320, color: "var(--chart-3)" },
    { name: "Output", nodes: 3, x: 440, color: "var(--chart-1)" },
  ];
  const nodeRadius = 12;
  const ySpacing = 50;
  const yOffset = 60;

  // Generate node positions
  const nodes = layers.map((layer) => {
    return Array.from({ length: layer.nodes }, (_, i) => ({
      x: layer.x,
      y: yOffset + i * ySpacing + (4 - layer.nodes) * ySpacing / 2,
      layer: layer.name,
      color: layer.color,
    }));
  });

  // Generate connections
  const connections: Array<{ x1: number; y1: number; x2: number; y2: number; delay: number }> = [];
  for (let l = 0; l < layers.length - 1; l++) {
    for (const n1 of nodes[l]) {
      for (const n2 of nodes[l + 1]) {
        connections.push({
          x1: n1.x, y1: n1.y, x2: n2.x, y2: n2.y,
          delay: (l * 0.5 + (n2.y / 100)),  // deterministic for SSR safety
        });
      }
    }
  }

  return (
    <div className="rounded-md border border-border/60 bg-card p-4 overflow-x-auto">
      <svg viewBox="0 0 520 320" className="w-full h-auto" style={{ maxWidth: 520 }}>
        {/* Connections */}
        {connections.map((c, i) => (
          <motion.line
            key={i}
            x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
            stroke="oklch(0.5 0 0 / 0.15)"
            strokeWidth={1}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: animate ? 1 : 0, opacity: animate ? 0.15 : 0 }}
            transition={{ duration: 0.5, delay: c.delay }}
          />
        ))}
        {/* Animated signal pulses */}
        {connections.map((c, i) => (
          <motion.circle
            key={`pulse-${i}`}
            r={2}
            fill={i % 2 === 0 ? "var(--chart-1)" : "var(--chart-4)"}
            initial={{ cx: c.x1, cy: c.y1, opacity: 0 }}
            animate={animate ? {
              cx: [c.x1, c.x2],
              cy: [c.y1, c.y2],
              opacity: [0, 1, 0],
            } : {}}
            transition={{
              duration: 1.5,
              delay: c.delay + 1,
              repeat: Infinity,
              repeatDelay: 2,
            }}
          />
        ))}
        {/* Nodes */}
        {nodes.map((layerNodes, li) =>
          layerNodes.map((n, ni) => (
            <motion.circle
              key={`node-${li}-${ni}`}
              cx={n.x} cy={n.y} r={nodeRadius}
              fill={n.color}
              opacity={0.7}
              stroke="var(--background)"
              strokeWidth={2}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: animate ? 1 : 0, opacity: animate ? 0.7 : 0 }}
              transition={{ delay: li * 0.3 + ni * 0.05, type: "spring", stiffness: 200 }}
              style={{ transformOrigin: `${n.x}px ${n.y}px` }}
            />
          ))
        )}
        {/* Layer labels */}
        {layers.map((l, i) => (
          <text
            key={l.name}
            x={l.x}
            y={20}
            textAnchor="middle"
            fill="var(--muted-foreground)"
            fontSize={10}
            fontWeight={600}
          >
            {l.name}
          </text>
        ))}
        {/* Forward pass arrow */}
        <motion.text
          x={260} y={310}
          textAnchor="middle"
          fill="var(--primary)"
          fontSize={9}
          initial={{ opacity: 0 }}
          animate={{ opacity: animate ? 1 : 0 }}
          transition={{ delay: 2.5 }}
        >
          → forward pass (inference) →
        </motion.text>
      </svg>
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        4-layer MLP: Input(4) → Hidden(5) → Hidden(5) → Output(3). Signal pulses animate the forward pass.
      </p>
    </div>
  );
}

// ============================================================
// Activation function equations + mini-charts
// ============================================================
const ACTIVATIONS = [
  {
    name: "ReLU",
    equation: "f(x) = max(0, x)",
    desc: "Most common in deep learning. Cheap to compute. Doesn't saturate for x > 0. Can cause 'dead neurons' for x < 0.",
    color: "var(--chart-1)",
    path: "M 0 50 L 25 50 L 100 0",
  },
  {
    name: "Sigmoid",
    equation: "f(x) = 1 / (1 + e⁻ˣ)",
    desc: "Squashes to [0,1]. Used in output layer for binary classification. Saturates → vanishing gradients in deep nets.",
    color: "var(--chart-2)",
    path: "M 0 50 Q 40 50 50 25 Q 60 0 100 0",
  },
  {
    name: "Tanh",
    equation: "f(x) = (eˣ - e⁻ˣ) / (eˣ + e⁻ˣ)",
    desc: "Squashes to [-1,1]. Zero-centered. Better than sigmoid but still saturates. Used in RNNs.",
    color: "var(--chart-3)",
    path: "M 0 50 Q 30 50 50 0 Q 70 -50 100 -50",
  },
  {
    name: "GELU",
    equation: "f(x) = x · Φ(x)",
    desc: "Used in GPT/BERT Transformers. Smoother than ReLU. Φ(x) = standard normal CDF. State-of-the-art for LLMs.",
    color: "var(--chart-4)",
    path: "M 0 48 Q 40 48 50 25 Q 60 5 100 0",
  },
  {
    name: "Softmax",
    equation: "f(xᵢ) = e^(xᵢ) / Σⱼ e^(xⱼ)",
    desc: "Output layer for multi-class classification. Converts logits to probability distribution. Used in LLM token prediction.",
    color: "var(--chart-5)",
    path: "M 0 50 Q 40 50 50 10 Q 60 0 100 0",
  },
];

function ActivationCard({ act }: { act: typeof ACTIVATIONS[number] }) {
  return (
    <div className="rounded-md border border-border/60 p-3 hover:border-primary/40 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: act.color }} />
        <p className="text-sm font-semibold">{act.name}</p>
      </div>
      {/* Mini chart */}
      <svg viewBox="0 0 100 50" className="w-full h-12 mb-2" preserveAspectRatio="none">
        <line x1="0" y1="50" x2="100" y2="50" stroke="oklch(0.7 0 0 / 0.3)" strokeWidth="0.5" />
        <line x1="50" y1="0" x2="50" y2="50" stroke="oklch(0.7 0 0 / 0.3)" strokeWidth="0.5" />
        <path d={act.path} fill="none" stroke={act.color} strokeWidth="1.5" />
      </svg>
      {/* Equation */}
      <p className="font-mono text-[11px] text-foreground/90 mb-1.5">{act.equation}</p>
      <p className="text-[10px] text-muted-foreground leading-snug">{act.desc}</p>
    </div>
  );
}

// ============================================================
// Evolution timeline (Hadoop → LLMs)
// ============================================================
const EVOLUTION = [
  { year: "2006", tech: "Hadoop / MapReduce", impact: "Distributed batch processing on commodity hardware. First time 'big data' was accessible.", enabled: "Spark (2010) — in-memory, 100× faster" },
  { year: "2010", tech: "Apache Spark", impact: "Unified batch + streaming + ML on one engine. RDDs → DataFrames → Delta Lake.", enabled: "Delta Lake (2017) — ACID on cloud storage" },
  { year: "2014", tech: "TensorFlow / PyTorch", impact: "Deep learning frameworks go mainstream. GPU training becomes accessible.", enabled: "Transformers (2017) — attention is all you need" },
  { year: "2017", tech: "Transformer architecture", impact: "Self-attention enables sequence modeling at scale. 'Attention Is All You Need' paper.", enabled: "BERT (2018) → GPT-2 (2019) → GPT-3 (2020)" },
  { year: "2020", tech: "Lakehouse (Delta/Iceberg)", impact: "Data warehouse + data lake converge. ACID + ML + BI on one platform.", enabled: "Feature stores (2021) — train/serve consistency" },
  { year: "2022", tech: "Stable Diffusion / ChatGPT", impact: "Generative AI goes mainstream. LLMs become the new application layer.", enabled: "RAG (2023) — LLMs + enterprise data" },
  { year: "2024", tech: "Arrow Flight + Wasm + Pyodide", impact: "Zero-copy data transfer + in-browser execution. The convergence of data engineering + ML + frontend.", enabled: "Agentic platforms (FY26) — AI agents managing data pipelines" },
];

// ============================================================
// Pyodide neural network demo
// ============================================================
const NN_DEMO = `# Neural Network Forward Pass — in your browser via Pyodide
# 2-layer MLP: Input(3) → Hidden(4) → Output(2)
# Sigmoid activation. Pure Python (stdlib only, no NumPy).

import math

def sigmoid(x):
    return 1.0 / (1.0 + math.exp(-x))

def forward_pass(inputs, weights_input, weights_hidden, biases_input, biases_hidden):
    """Forward pass through a 2-layer MLP."""
    # Layer 1: Input → Hidden (4 neurons)
    hidden = []
    for j in range(4):
        z = sum(inputs[i] * weights_input[j][i] for i in range(3)) + biases_input[j]
        hidden.append(sigmoid(z))

    # Layer 2: Hidden → Output (2 neurons)
    output = []
    for j in range(2):
        z = sum(hidden[h] * weights_hidden[j][h] for h in range(4)) + biases_hidden[j]
        output.append(sigmoid(z))

    return hidden, output

# Synthetic weights (in production: trained via backpropagation)
import random
random.seed(42)
weights_input  = [[random.gauss(0, 0.5) for _ in range(3)] for _ in range(4)]
weights_hidden = [[random.gauss(0, 0.5) for _ in range(4)] for _ in range(2)]
biases_input   = [random.gauss(0, 0.3) for _ in range(4)]
biases_hidden  = [random.gauss(0, 0.3) for _ in range(2)]

# Input: [customer_ltv=1.2, region=0.8, segment=0.5]
inputs = [1.2, 0.8, 0.5]

# Forward pass
hidden, output = forward_pass(inputs, weights_input, weights_hidden, biases_input, biases_hidden)

print("=" * 60)
print("NEURAL NETWORK FORWARD PASS — 2-LAYER MLP")
print("=" * 60)
print(f"\\nArchitecture: Input(3) → Hidden(4, sigmoid) → Output(2, sigmoid)")
print(f"\\nInput:  {inputs}")
print(f"  [customer_ltv=1.2, region=0.8, segment=0.5]")

print(f"\\nHidden layer activations (after sigmoid):")
for i, h in enumerate(hidden):
    print(f"  h{i+1} = sigmoid(z) = {h:.6f}")

print(f"\\nOutput layer (probabilities):")
labels = ["will_churn", "will_renew"]
for i, o in enumerate(output):
    print(f"  {labels[i]} = {o:.6f}")

# Softmax for final prediction
total = sum(output)
probs = [o / total for o in output]
pred = labels[probs.index(max(probs))]

print(f"\\n{'=' * 60}")
print(f"PREDICTION: {pred} (confidence: {max(probs)*100:.1f}%)")
print(f"{'=' * 60}")
print(f"\\nThis neural network ran in your browser via Pyodide (Python in Wasm).")
print(f"In production: train via backpropagation, log to MLflow (ADR-020),")
print(f"export to ONNX (ADR-021), serve via Go/Rust microservice.")`;

export function NeuralNetworksPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Deep Learning · neural networks"
        title="Neural Networks — From Big Data to LLMs"
        description="The evolution from Hadoop (2006) to today's LLMs, with animated neural network diagrams, activation function equations, backpropagation math, and a Pyodide demo that runs a forward pass of a 2-layer MLP in your browser. The story of how the big data ecosystem enabled the AI revolution."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Brain className="h-3 w-3" /> Animated</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Pyodide</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* Animated Neural Network */}
      <SectionCard
        title="Animated Neural Network — 4-layer MLP forward pass"
        description="Signal pulses animate the forward pass (inference) through a multi-layer perceptron. Each circle is a neuron; each line is a weighted connection. In a real network, the weights are learned via backpropagation."
        icon={<Network className="h-5 w-5" />}
        badge="animated"
      >
        <NeuralNetworkAnimation />
      </SectionCard>

      {/* Activation Functions */}
      <SectionCard
        title="Activation Functions — the mathematical heart of neural networks"
        description="Each activation function introduces non-linearity. Without them, a neural network is just linear regression stacked. The choice of activation function determines gradient flow, training stability, and final accuracy."
        icon={<Layers className="h-5 w-5" />}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {ACTIVATIONS.map((act) => (
            <ActivationCard key={act.name} act={act} />
          ))}
        </div>
      </SectionCard>

      {/* Backpropagation Math */}
      <SectionCard
        title="Backpropagation — the learning algorithm"
        description="How neural networks learn: compute the loss, propagate the gradient backward, update weights. The chain rule of calculus applied to a computation graph."
        icon={<Cpu className="h-5 w-5" />}
        badge="mathematics"
      >
        <div className="space-y-4">
          <div className="rounded-md border border-border/60 p-4 bg-muted/10">
            <p className="text-sm font-semibold mb-3 text-primary">The 4 equations of backpropagation:</p>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-mono text-xs text-foreground/90">1. Loss function (MSE):</p>
                <p className="font-mono text-sm ml-4 mt-1">L = (1/n) · Σᵢ (ŷᵢ − yᵢ)²</p>
                <p className="text-[11px] text-muted-foreground ml-4 mt-0.5">where ŷ = prediction, y = actual, n = samples</p>
              </div>
              <div>
                <p className="font-mono text-xs text-foreground/90">2. Gradient (chain rule):</p>
                <p className="font-mono text-sm ml-4 mt-1">∂L/∂w = ∂L/∂ŷ · ∂ŷ/∂z · ∂z/∂w</p>
                <p className="text-[11px] text-muted-foreground ml-4 mt-0.5">where z = weighted sum, ŷ = σ(z), w = weight</p>
              </div>
              <div>
                <p className="font-mono text-xs text-foreground/90">3. Weight update (gradient descent):</p>
                <p className="font-mono text-sm ml-4 mt-1">w_new = w_old − η · ∂L/∂w</p>
                <p className="text-[11px] text-muted-foreground ml-4 mt-0.5">where η = learning rate (e.g. 0.01)</p>
              </div>
              <div>
                <p className="font-mono text-xs text-foreground/90">4. Backpropagation (output → hidden):</p>
                <p className="font-mono text-sm ml-4 mt-1">δˡ = (Wˡ⁺¹)ᵀ · δˡ⁺¹ ⊙ σ′(zˡ)</p>
                <p className="text-[11px] text-muted-foreground ml-4 mt-0.5">where δ = error signal, ˡ = layer, ⊙ = Hadamard product</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The chain rule lets us decompose the gradient of the loss with respect to <em>any</em> weight in the network
            into a product of local gradients. This is why deep networks are trainable — each layer only needs to know
            the gradient from the layer above it. The math is elegant; the engineering (GPU kernels, automatic differentiation,
            mixed precision) is what makes it fast.
          </p>
        </div>
      </SectionCard>

      {/* Pyodide NN demo */}
      <SectionCard
        title="Try it: Neural network forward pass (Pyodide)"
        description="A 2-layer MLP (Input(3) → Hidden(4) → Output(2)) with sigmoid activation. Pure Python (stdlib only — no NumPy, no PyTorch). Runs the forward pass in your browser. In production: train via backpropagation, log to MLflow (ADR-020), export to ONNX (ADR-021)."
        icon={<Terminal className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner
          code={NN_DEMO}
          buttonLabel="Run neural network forward pass (Pyodide)"
        />
      </SectionCard>

      {/* Evolution timeline */}
      <SectionCard
        title="The Evolution: Hadoop (2006) → LLMs (2024)"
        description="How the big data ecosystem enabled the AI revolution. Each step built on the previous — Hadoop enabled Spark, Spark enabled Delta, Delta enabled feature stores, feature stores enabled LLM training."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="history"
      >
        <div className="space-y-0">
          {EVOLUTION.map((e, i) => (
            <div key={e.year} className="flex gap-4 pb-4 last:pb-0">
              {/* Timeline dot + line */}
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">
                  {e.year.slice(2)}
                </div>
                {i < EVOLUTION.length - 1 && (
                  <div className="w-0.5 flex-1 bg-border/60 mt-1" />
                )}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0 pb-2">
                <p className="text-xs font-mono text-muted-foreground">{e.year}</p>
                <p className="text-sm font-semibold mt-0.5">{e.tech}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{e.impact}</p>
                <p className="text-[11px] text-primary mt-1.5">→ {e.enabled}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Transformer architecture */}
      <SectionCard
        title="The Transformer — how attention works"
        description="The architecture behind GPT, BERT, Claude, and every modern LLM. Self-attention lets the model 'look at' all positions simultaneously — no recurrence, no convolution, just attention."
        icon={<Brain className="h-5 w-5" />}
        badge="LLM architecture"
      >
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-primary mb-2">Self-Attention Equation:</p>
            <p className="font-mono text-sm text-center py-2">
              Attention(Q, K, V) = softmax(Q · Kᵀ / √dₖ) · V
            </p>
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
              where Q = queries, K = keys, V = values, dₖ = dimension of keys. The softmax normalises attention weights
              to a probability distribution. The √dₖ scaling prevents the dot products from growing too large in high
              dimensions (which would push softmax into regions with very small gradients).
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-3 text-xs">
            <div className="rounded-md border border-border/60 p-3">
              <p className="font-semibold mb-1">Multi-Head Attention</p>
              <p className="text-muted-foreground">Run attention h times in parallel with different learned projections. Concatenate + linear. h=12 (BERT-base), h=96 (GPT-3 175B).</p>
            </div>
            <div className="rounded-md border border-border/60 p-3">
              <p className="font-semibold mb-1">Positional Encoding</p>
              <p className="text-muted-foreground">Since attention is permutation-invariant, add positional information. Sinusoidal (original) or learned embeddings (BERT/GPT).</p>
            </div>
            <div className="rounded-md border border-border/60 p-3">
              <p className="font-semibold mb-1">Feed-Forward + LayerNorm</p>
              <p className="text-muted-foreground">After attention: 2-layer MLP (GELU activation) + residual connection + LayerNorm. Repeated N times (N=6 for base, N=96 for large).</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Insight */}
      <SectionCard
        title="My deeper thought: the data pipeline IS the AI pipeline"
        description="The infrastructure that powers Hadoop, Spark, Delta, and Iceberg is the same infrastructure that powers LLM training. The convergence is complete."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            People think of LLMs as a breakthrough in <em>algorithms</em> (Transformers, attention, RLHF). But the
            real breakthrough was in <strong className="text-foreground/80">data infrastructure</strong>. Training GPT-3
            (175B parameters) required processing ~500 billion tokens of text — that&apos;s petabytes of data, processed
            on thousands of GPUs for months. The data pipeline (ingest → clean → tokenise → batch → feed to GPUs)
            IS a big data pipeline. It&apos;s Hadoop/Spark/Delta/Iceberg with GPUs instead of CPUs.
          </p>
          <p>
            <strong className="text-foreground/80">The platform&apos;s 23 pages document the infrastructure that makes AI possible.</strong> Bronze→Silver→Gold is how training data is prepared. Arrow + Flight is how features move between engines. DuckDB + Polars is how data scientists prototype. MLflow is how experiments are tracked. ONNX is how models are served. The data engineering stack IS the AI stack.
          </p>
          <p>
            The next convergence — already happening — is <strong className="text-foreground/80">RAG (Retrieval-Augmented Generation)</strong>.
            An LLM generates answers grounded in your data platform&apos;s Gold tables. The LLM is the reasoning engine;
            your Bronze→Silver→Gold pipeline is the knowledge base. The data platform doesn&apos;t need a separate AI
            team — it needs to expose Gold tables via vector search + embeddings + semantic retrieval. The platform
            you&apos;re reading is that infrastructure.
          </p>
        </div>
      </SectionCard>

      {/* Multi-language code */}
      <SectionCard
        title="Multi-language: neural network in 4 languages"
        description="Same forward pass in Python (numpy), Rust (candle), Scala (Spark MLlib), Go (ONNX runtime). Click to open the drawer."
        icon={<Layers className="h-5 w-5" />}
        badge="4 languages · drawer"
      >
        <MultiLangSamples
          drawerMode
          drawerButtonLabel="View 4-language neural network implementations"
          title="Neural network forward pass — 4 idiomatic implementations"
          description="Python (numpy from scratch) · Rust (candle — Rust ML) · Scala (Spark MLlib) · Go (ONNX runtime inference). Same computation, different ergonomics."
          samples={[
            {
              language: "python",
              filename: "nn_numpy.py",
              note: "Python + NumPy — neural network from scratch. No PyTorch, no TensorFlow — just numpy dot products + sigmoid. The clearest way to understand what a neural network actually does.",
              code: `import numpy as np

def sigmoid(x):
    return 1 / (1 + np.exp(-x))

# 2-layer MLP: Input(3) → Hidden(4) → Output(2)
np.random.seed(42)
W1 = np.random.randn(4, 3) * 0.5  # input→hidden weights
b1 = np.random.randn(4) * 0.3     # hidden biases
W2 = np.random.randn(2, 4) * 0.5  # hidden→output weights
b2 = np.random.randn(2) * 0.3     # output biases

# Forward pass
X = np.array([[1.2, 0.8, 0.5]])  # 1 sample, 3 features
Z1 = X @ W1.T + b1               # weighted sum (hidden)
A1 = sigmoid(Z1)                  # activation (hidden)
Z2 = A1 @ W2.T + b2              # weighted sum (output)
A2 = sigmoid(Z2)                  # activation (output) = prediction

print(f"Input:  {X}")
print(f"Hidden: {A1}")
print(f"Output: {A2} (probabilities)")
print(f"Prediction: {'churn' if A2[0][0] > A2[0][1] else 'renew'}")`,
              highlight: [4, 5, 8, 9, 10, 11, 14, 15, 16, 17, 18, 19, 21, 22, 23],
            },
            {
              language: "rust",
              filename: "nn_candle.rs",
              note: "Rust + candle — Rust-native ML framework. Same forward pass, memory-safe, no GIL. For production inference at scale.",
              code: `use candle_core::{Tensor, Device, DType};
use candle_nn::{Linear, Module, VarBuilder};
use anyhow::Result;

fn forward_pass(device: &Device) -> Result<Tensor> {
    let vb = VarBuilder::randn(0.5, 0.3, &device);
    
    // 2-layer MLP: Input(3) → Hidden(4) → Output(2)
    let layer1 = Linear::new(3, 4, vb.pp("l1"))?;
    let layer2 = Linear::new(4, 2, vb.pp("l2"))?;
    
    // Input
    let x = Tensor::zeros((1, 3), DType::F32, &device)?;
    
    // Forward pass with sigmoid activation
    let z1 = layer1.forward(&x)?;
    let a1 = candle_nn::ops::sigmoid(&z1)?;  // hidden activations
    let z2 = layer2.forward(&a1)?;
    let output = candle_nn::ops::sigmoid(&z2)?;  // predictions
    
    Ok(output)
}

fn main() -> Result<()> {
    let device = Device::Cpu;
    let output = forward_pass(&device)?;
    println!("Output: {:?}", output);
    Ok(())
}`,
              highlight: [6, 7, 10, 11, 14, 16, 17, 18],
            },
            {
              language: "scala",
              filename: "nn_spark_mllib.scala",
              note: "Scala + Spark MLlib — distributed neural network training across a cluster. For datasets that don't fit on one machine.",
              code: `import org.apache.spark.ml.classification.MultilayerPerceptronClassifier
import org.apache.spark.sql.SparkSession

val spark = SparkSession.builder.appName("nn-training").getOrCreate()

// Load training data from Delta Lake (ADR-013)
val data = spark.read.format("delta")
  .load("s3://moderndatascieng-gold/ml/features/customer_churn")
  .withColumnRenamed("features", "features")
  .withColumnRenamed("label", "label")

// 3-layer MLP: Input(10) → Hidden(8) → Hidden(5) → Output(2)
val layers = Array[Int](10, 8, 5, 2)
val trainer = new MultilayerPerceptronClassifier()
  .setLayers(layers)
  .setMaxIter(200)
  .setBlockSize(128)
  .setSeed(42)

val model = trainer.fit(data)
println(s"Trained MLP: \\\${model}")
// Log to MLflow (Scala API)`,
              highlight: [5, 6, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
            },
            {
              language: "go",
              filename: "nn_onnx_inference.go",
              note: "Go + ONNX Runtime — load a trained model, run inference in production. Same .onnx file runs in any language. ADR-021.",
              code: `package main

import (
    "fmt"
    "github.com/yalue/onnxruntime"
)

func main() {
    onnxruntime.InitializeONNXRuntime()
    defer onnxruntime.CleanupONNXRuntime()
    
    // Load trained neural network (exported from PyTorch via torch.onnx.export)
    model, _ := onnxruntime.NewSession(
        "churn_predictor.onnx",
        "input", []int64{1, 3},   // 1 sample, 3 features
        "output", []int64{1, 2},  // 1 prediction, 2 classes
    )
    defer model.Destroy()
    
    // Inference — production serving
    input := []float32{1.2, 0.8, 0.5}  // [ltv, region, segment]
    output, _ := model.Predict(input)
    
    fmt.Printf("Prediction: churn=%0.4f, renew=%0.4f\\n", output[0], output[1])
}`,
              highlight: [8, 9, 12, 13, 14, 15, 18, 19, 22],
            },
          ]}
        />
      </SectionCard>

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("ml-platform")} className="text-sm text-primary hover:underline">
          → ML Platform (MLOps lifecycle)
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">
          → See ADR-020 (MLflow) + ADR-021 (ONNX)
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("evolution")} className="text-sm text-primary hover:underline">
          → Platform evolution timeline
        </Link>
      </div>
    </div>
  );
}
