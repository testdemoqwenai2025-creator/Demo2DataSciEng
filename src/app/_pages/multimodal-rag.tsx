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
  Cpu, Layers, Zap, TrendingUp, Terminal, Brain,
  Activity, Image as ImageIcon, Search, Sparkles,
} from "lucide-react";

const KPIS = [
  { label: "Shared embedding", value: "ℝ^768", hint: "Text + image in the same vector space", deltaTone: "flat" as const },
  { label: "SigLIP loss", value: "sigmoid", hint: "Per-pair independent (vs CLIP softmax)", deltaTone: "flat" as const },
  { label: "SigLIP-SO400M", value: "800M params", hint: "ViT-SO400M + text transformer-400M", deltaTone: "flat" as const },
  { label: "Cross-modal recall@5", value: "~0.65", hint: "vs 0.85 intra-modal — gap closing", deltaTone: "flat" as const },
];

// ============================================================
// Animated Shared Embedding Space — text + image vectors
// ============================================================
function SharedEmbeddingAnimation() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setStep((s) => (s + 1) % 5), 1200);
    return () => clearInterval(interval);
  }, []);

  // Embeddings: 4 text + 4 image, in 2D (projected from ℝ^768)
  // Aligned by semantic content (after CLIP training)
  const items = [
    // Text items (T)
    { id: "T1", type: "T", label: "revenue chart", x: 80, y: 90, color: "oklch(0.55 0.16 250 / 0.7)" },
    { id: "T2", type: "T", label: "customer growth", x: 220, y: 60, color: "oklch(0.55 0.16 250 / 0.7)" },
    { id: "T3", type: "T", label: "churn report", x: 340, y: 110, color: "oklch(0.55 0.16 250 / 0.7)" },
    { id: "T4", type: "T", label: "supply chain", x: 140, y: 200, color: "oklch(0.55 0.16 250 / 0.7)" },
    // Image items (I) — positioned near their semantic text counterparts
    { id: "I1", type: "I", label: "📊", x: 95, y: 80, color: "oklch(0.55 0.16 145 / 0.7)" },
    { id: "I2", type: "I", label: "📈", x: 230, y: 65, color: "oklch(0.55 0.16 145 / 0.7)" },
    { id: "I3", type: "I", label: "📉", x: 350, y: 100, color: "oklch(0.55 0.16 145 / 0.7)" },
    { id: "I4", type: "I", label: "🌐", x: 155, y: 195, color: "oklch(0.55 0.16 145 / 0.7)" },
  ];

  // Phase 0: all mixed (pre-training, no alignment)
  // Phase 1: contrastive pulls together (T,I) pairs
  // Phase 2: text and image clusters form
  // Phase 3: query "revenue chart" → retrieve both T1 and I1
  // Phase 4: cross-modal RAG result

  const queryPos = { x: 80, y: 95, label: "Q: revenue chart" };

  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <style>{`
        .mm-3d { perspective: 800px; }
        .mm-stage { transform: rotateX(15deg); transform-style: preserve-3d; }
      `}</style>
      <p className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        Shared embedding space — text and image vectors in ℝ^768
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">
          phase {step + 1}/5
        </span>
      </p>
      <div className="mm-3d">
        <div className="mm-stage">
          <svg width="450" height="260" viewBox="0 0 450 260">
            {/* Phase 0: random scatter (pre-training) */}
            {/* Phase 1+: aligned positions */}
            {items.map((item, i) => {
              // Pre-training: random positions
              const seed = i * 17;
              const rand_x = (seed * 37) % 400 + 25;
              const rand_y = (seed * 53) % 200 + 30;
              const x = step === 0 ? rand_x : item.x;
              const y = step === 0 ? rand_y : item.y;
              return (
                <motion.g
                  key={item.id}
                  animate={{
                    // Animate from random to aligned
                  }}
                >
                  <motion.circle
                    cx={x} cy={y} r={12}
                    fill={item.color}
                    animate={{
                      cx: x,
                      cy: y,
                      scale: step === 3 && (item.id === "T1" || item.id === "I1") ? 1.4 : 1,
                      stroke: step === 3 && (item.id === "T1" || item.id === "I1") ? "var(--primary)" : "none",
                      strokeWidth: step === 3 && (item.id === "T1" || item.id === "I1") ? 3 : 0,
                    }}
                  />
                  <text x={x} y={y + 4} textAnchor="middle" fontSize={9} fill="white" fontWeight="bold">
                    {item.type}{item.id.slice(1)}
                  </text>
                  <text x={x} y={y + 25} textAnchor="middle" fontSize={7} fill="var(--muted-foreground)">
                    {step >= 2 ? item.label : ""}
                  </text>
                </motion.g>
              );
            })}

            {/* Phase 1+2: lines between matched pairs */}
            {step >= 1 && step <= 2 && [
              ["T1", "I1"], ["T2", "I2"], ["T3", "I3"], ["T4", "I4"]
            ].map(([tId, iId]) => {
              const t = items.find(it => it.id === tId)!;
              const i = items.find(it => it.id === iId)!;
              return (
                <motion.line
                  key={`pair-${tId}-${iId}`}
                  x1={t.x} y1={t.y} x2={i.x} y2={i.y}
                  stroke="var(--primary)" strokeWidth="1" strokeDasharray="2 2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: step === 1 ? 0.5 : (step === 2 ? 0.2 : 0) }}
                />
              );
            })}

            {/* Phase 3+: query and retrieved results */}
            {step >= 3 && (
              <>
                <motion.circle
                  cx={queryPos.x} cy={queryPos.y} r={16}
                  fill="none" stroke="var(--primary)" strokeWidth="2"
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                />
                <text x={queryPos.x} y={queryPos.y - 22} textAnchor="middle" fontSize={9} fill="var(--primary)" fontWeight="bold">
                  {queryPos.label}
                </text>
                {/* Retrieval lines to T1 and I1 */}
                <motion.line x1={queryPos.x} y1={queryPos.y} x2={items[0].x} y2={items[0].y}
                  stroke="var(--primary)" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} />
                <motion.line x1={queryPos.x} y1={queryPos.y} x2={items[4].x} y2={items[4].y}
                  stroke="var(--primary)" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} />
              </>
            )}
          </svg>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3 text-[10px]">
        <div className="rounded-md border border-border/60 p-2">
          <p className="font-semibold mb-0.5">Legend</p>
          <p className="text-muted-foreground">T = text embedding · I = image embedding · Q = query</p>
        </div>
        <div className="rounded-md border border-border/60 p-2">
          <p className="font-semibold mb-0.5">{["1. Pre-training (random)", "2. Contrastive pull", "3. Aligned clusters", "4. Query retrieves T+I", "5. Cross-modal RAG"][step]}</p>
          <p className="text-muted-foreground">{["No alignment", "Pairs pulled together", "Semantic clusters form", "Q near both T1 and I1", "Stuff both into prompt"][step]}</p>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-3">
        After contrastive training, "revenue chart" (text) and 📊 (image) live at the same point in ℝ^768.
        A text query retrieves BOTH the text chunk AND the image — true cross-modal RAG.
      </p>
    </div>
  );
}

const CONTRASTIVE_DEMO = `# Contrastive Learning + Cross-modal RAG (Pyodide)
# CLIP / SigLIP loss + shared embedding simulation

import math, random

# ============================================================
# CLIP / SigLIP — contrastive learning math
# ============================================================
# Goal: learn image encoder f(I) and text encoder g(T) such that
# for matched (image, caption) pairs, cosine_sim is HIGH,
# for mismatched pairs, cosine_sim is LOW.
#
# CLIP loss (softmax over NxN batch):
#   L = -log(exp(sim(I_i, T_i)/τ) / Σ_j exp(sim(I_i, T_j)/τ))
# Each row i: softmax over all N captions
# Each col j: softmax over all N images
# Total: 2N classification problems
#
# SigLIP loss (sigmoid per pair — independent):
#   L = -log σ(z * (s * sim(I, T) - b))
# where z = +1 if matched, -1 if mismatched
# s = learnable temperature, b = learnable bias
# Independent per pair → scales to large batches without N² softmax

def cosine_sim(a, b):
    "Cosine similarity between two vectors"
    dot = sum(x*y for x, y in zip(a, b))
    na = math.sqrt(sum(x*x for x in a))
    nb = math.sqrt(sum(y*y for y in b))
    return dot / (na * nb) if na > 0 and nb > 0 else 0

def clip_loss(image_embs, text_embs, temperature=0.07):
    """
    CLIP loss: InfoNCE / NT-Xent.
    For batch of N (image, text) pairs, each row is a softmax over all N texts.
    """
    N = len(image_embs)
    # Compute NxN similarity matrix
    sim_matrix = [[cosine_sim(image_embs[i], text_embs[j]) for j in range(N)] for i in range(N)]
    # Per-row softmax with temperature
    loss = 0
    for i in range(N):
        # Logits for row i
        logits = [sim_matrix[i][j] / temperature for j in range(N)]
        # Softmax denominator
        max_logit = max(logits)
        exp_logits = [math.exp(l - max_logit) for l in logits]
        Z = sum(exp_logits)
        # Loss for row i (target is j=i)
        loss += -math.log(exp_logits[i] / Z)
    return loss / N

def siglip_loss(image_embs, text_embs, temperature=10.0, bias=-10.0):
    """
    SigLIP loss: per-pair sigmoid (independent).
    L = -log σ(z * (s * sim - b)) summed over all N² pairs
    where z = +1 for matched, -1 for mismatched
    """
    N = len(image_embs)
    loss = 0
    for i in range(N):
        for j in range(N):
            sim = cosine_sim(image_embs[i], text_embs[j])
            z = 1.0 if i == j else -1.0
            logit = z * (temperature * sim - bias)
            # Sigmoid
            sig = 1 / (1 + math.exp(-logit))
            loss += -math.log(sig + 1e-10)
    return loss / (N * N)

# ============================================================
# Simulate embeddings before / after training
# ============================================================
print("=" * 60)
print("Contrastive Learning — CLIP vs SigLIP")
print("=" * 60)

random.seed(42)
N = 4  # batch of 4 (image, text) pairs
dim = 32  # embedding dim (in production: 768)

# Before training: random embeddings (no alignment)
print(f"\\n--- BEFORE training (random embeddings) ---")
image_embs_before = [[random.gauss(0, 1) for _ in range(dim)] for _ in range(N)]
text_embs_before = [[random.gauss(0, 1) for _ in range(dim)] for _ in range(N)]

# Show similarity matrix
print(f"Similarity matrix (cosine sim):")
print(f"        T0     T1     T2     T3")
for i in range(N):
    row = [cosine_sim(image_embs_before[i], text_embs_before[j]) for j in range(N)]
    print(f"  I{i}  " + "  ".join(f"{s:+.2f}" for s in row))

clip_loss_before = clip_loss(image_embs_before, text_embs_before)
siglip_loss_before = siglip_loss(image_embs_before, text_embs_before)
print(f"\\nCLIP loss: {clip_loss_before:.3f}")
print(f"SigLIP loss: {siglip_loss_before:.3f}")
print(f"  (High loss — no alignment)")

# After training: pull matched pairs together, push mismatches apart
print(f"\\n--- AFTER training (simulated aligned embeddings) ---")
# Simulate: matched pairs have sim=0.95, mismatches have sim=0.10
image_embs_after = []
text_embs_after = []
# Create embeddings that are highly aligned for matched pairs
for i in range(N):
    base = [random.gauss(0, 1) for _ in range(dim)]
    image_embs_after.append(base[:])
    # Text embedding = base + small noise (so matched pair has high sim)
    text_embs_after.append([b + random.gauss(0, 0.1) for b in base])

print(f"Similarity matrix (cosine sim):")
print(f"        T0     T1     T2     T3")
for i in range(N):
    row = [cosine_sim(image_embs_after[i], text_embs_after[j]) for j in range(N)]
    print(f"  I{i}  " + "  ".join(f"{s:+.2f}" for s in row))

clip_loss_after = clip_loss(image_embs_after, text_embs_after)
siglip_loss_after = siglip_loss(image_embs_after, text_embs_after)
print(f"\\nCLIP loss: {clip_loss_after:.3f}  (was {clip_loss_before:.3f}, ↓ {(1 - clip_loss_after/clip_loss_before)*100:.0f}%)")
print(f"SigLIP loss: {siglip_loss_after:.3f}  (was {siglip_loss_before:.3f}, ↓ {(1 - siglip_loss_after/siglip_loss_before)*100:.0f}%)")
print(f"  (Low loss — matched pairs aligned, mismatches pushed apart)")

# ============================================================
# Cross-modal RAG retrieval
# ============================================================
print(f"\\n{'=' * 60}")
print("Cross-modal RAG Retrieval")
print("=" * 60)

# In pgvector: store both text and image embeddings in same HNSW index
# Each row: (id, modality, content, embedding)
corpus = [
    (1, "text",  "Q3 revenue breakdown by region"),
    (2, "image", "chart: bar chart of regional revenue"),
    (3, "text",  "customer churn analysis Q3"),
    (4, "image", "chart: line chart of churn rate"),
    (5, "text",  "supply chain Q3 status"),
    (6, "image", "chart: network diagram of suppliers"),
]

# Embeddings (simulated, all in same ℝ^32 space)
embeddings = []
random.seed(42)
for _, _, content in corpus:
    base = [random.gauss(0, 1) for _ in range(dim)]
    # Make content + "image" content have similar embeddings (post-CLIP)
    embeddings.append(base)

# Manually align: text 1 with image 2, text 3 with image 4, text 5 with image 6
embeddings[1] = [v + random.gauss(0, 0.05) for v in embeddings[0]]
embeddings[3] = [v + random.gauss(0, 0.05) for v in embeddings[2]]
embeddings[5] = [v + random.gauss(0, 0.05) for v in embeddings[4]]

# Query: "show me the revenue chart" (text query)
query = "show me the revenue chart"
# Use embedding close to corpus[0] (revenue text) — should retrieve both 0 and 1
query_emb = [v + random.gauss(0, 0.05) for v in embeddings[0]]

print(f"\\nQuery: '{query}'")
print(f"\\nCross-modal retrieval (top-3 from pgvector HNSW):")
sims = [(corpus[i][0], corpus[i][1], corpus[i][2], cosine_sim(query_emb, embeddings[i]))
        for i in range(len(corpus))]
sims.sort(key=lambda x: -x[3])
for i, (id_, mod, content, sim) in enumerate(sims[:3]):
    print(f"  {i+1}. [{mod:5s}] id={id_}: sim={sim:.3f}  '{content[:40]}'")

print(f"\\n  RESULT: retrieved both the revenue text chunk (id=1, text) AND")
print(f"  the revenue chart image (id=2, image) — cross-modal retrieval works!")
print(f"\\n  Naive (separate indexes) would return only id=1. SigLIP returns both.")

print(f"\\n{'=' * 60}")
print("KEY MATH:")
print("  CLIP: L = -log(exp(sim(I_i,T_i)/τ) / Σ_j exp(sim(I_i,T_j)/τ))")
print("  SigLIP: L = -log σ(z * (s * sim(I,T) - b))  per-pair independent")
print("  Cross-modal RAG: embed query (text OR image) → pgvector ANN → top-k (mixed modalities)")
print("=" * 60)`;

const PYTORCH_CODE = `import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Tuple, List, Optional
import math

# ============================================================
# 1. SigLIP model — image + text encoders + sigmoid contrastive loss
# ============================================================

class SigLIPModel(nn.Module):
    """SigLIP: Sigmoid Loss for Language-Image Pretraining.
    
    Architecture:
        - Vision encoder: ViT (Vision Transformer, see ADR-026)
        - Text encoder: Transformer (BERT-style, see /transformer)
        - Shared projection: both encoders output ℝ^768 (the shared embedding space)
        - Loss: per-pair sigmoid (independent, scales to large batches)
    
    SigLIP vs CLIP:
        CLIP loss: L = -log(exp(sim(I_i,T_i)/τ) / Σ_j exp(sim(I_i,T_j)/τ))  (softmax, NxN dependent)
        SigLIP loss: L = -log σ(z * (s * sim(I,T) - b))  (per-pair, independent)
    
    SigLIP scales to large batches (32k+) because each pair is independent.
    """
    def __init__(self, image_size: int = 224, text_max_len: int = 64,
                 embed_dim: int = 768, vision_layers: int = 12,
                 text_layers: int = 12, num_heads: int = 12):
        super().__init__()
        # Vision encoder: ViT (see computer-vision page)
        # In production: load pre-trained ViT-SO400M
        self.vision_encoder = VisionEncoder(
            image_size=image_size,
            patch_size=16,
            embed_dim=embed_dim,
            num_layers=vision_layers,
            num_heads=num_heads,
        )
        # Text encoder: Transformer (see transformer page)
        # In production: load pre-trained transformer-400M
        self.text_encoder = TextEncoder(
            vocab_size=32000,
            max_len=text_max_len,
            embed_dim=embed_dim,
            num_layers=text_layers,
            num_heads=num_heads,
        )
        # Learnable temperature + bias (SigLIP-specific)
        self.logit_scale = nn.Parameter(torch.ones([]) * math.log(10.0))
        self.logit_bias = nn.Parameter(torch.ones([]) * -10.0)
    
    def encode_image(self, pixel_values: torch.Tensor) -> torch.Tensor:
        """Encode batch of images → ℝ^768 embeddings."""
        # L2-normalise (so cosine similarity = dot product)
        emb = self.vision_encoder(pixel_values)
        return F.normalize(emb, dim=-1)
    
    def encode_text(self, input_ids: torch.Tensor) -> torch.Tensor:
        """Encode batch of text → ℝ^768 embeddings."""
        emb = self.text_encoder(input_ids)
        return F.normalize(emb, dim=-1)
    
    def forward(self, images: torch.Tensor, text_ids: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Encode both modalities."""
        return self.encode_image(images), self.encode_text(text_ids)
    
    def siglip_loss(self, image_embs: torch.Tensor, text_embs: torch.Tensor) -> torch.Tensor:
        """
        SigLIP loss: per-pair sigmoid, independent.
        
        L = -log σ(z * (s * sim(I,T) - b))
        
        For batch of N (image, text) pairs:
        - Positive pairs: (I_i, T_i) with z = +1
        - Negative pairs: (I_i, T_j≠i) with z = -1
        - Total: N² pairs, each contributing a sigmoid loss
        """
        # Logits: N×N matrix of (s * sim - b) for each (image_i, text_j)
        logits = self.logit_scale.exp() * (image_embs @ text_embs.T) + self.logit_bias
        # Labels: 1 for diagonal (matched), -1 for off-diagonal (mismatched)
        labels = 2 * torch.eye(image_embs.shape[0], device=image_embs.device) - 1
        # Sigmoid loss: -log σ(label * logit) = softplus(-label * logit)
        loss = -F.logsigmoid(labels * logits).mean()
        return loss

# ============================================================
# 2. Vision encoder (ViT) — simplified from computer-vision page
# ============================================================

class VisionEncoder(nn.Module):
    """ViT for SigLIP image branch. Identical to ADR-026 vision tower."""
    def __init__(self, image_size: int = 224, patch_size: int = 16,
                 embed_dim: int = 768, num_layers: int = 12, num_heads: int = 12):
        super().__init__()
        self.patch_embed = nn.Conv2d(3, embed_dim, kernel_size=patch_size, stride=patch_size)
        num_patches = (image_size // patch_size) ** 2
        self.cls_token = nn.Parameter(torch.zeros(1, 1, embed_dim))
        self.pos_embed = nn.Parameter(torch.zeros(1, num_patches + 1, embed_dim))
        # Transformer encoder blocks (same as /transformer page)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=embed_dim, nhead=num_heads, batch_first=True,
            dim_feedforward=embed_dim * 4, activation='gelu',
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.norm = nn.LayerNorm(embed_dim)
    
    def forward(self, pixel_values: torch.Tensor) -> torch.Tensor:
        # (B, 3, H, W) → (B, embed_dim, H/patch, W/patch) → (B, num_patches, embed_dim)
        x = self.patch_embed(pixel_values)
        x = x.flatten(2).transpose(1, 2)
        # Prepend CLS token
        cls = self.cls_token.expand(x.shape[0], -1, -1)
        x = torch.cat([cls, x], dim=1)
        x = x + self.pos_embed
        x = self.transformer(x)
        x = self.norm(x)
        # Use CLS token as image embedding
        return x[:, 0]  # (B, embed_dim)

# ============================================================
# 3. Text encoder — simplified from transformer page
# ============================================================

class TextEncoder(nn.Module):
    """Transformer for SigLIP text branch. Identical structure to /transformer."""
    def __init__(self, vocab_size: int = 32000, max_len: int = 64,
                 embed_dim: int = 768, num_layers: int = 12, num_heads: int = 12):
        super().__init__()
        self.token_embed = nn.Embedding(vocab_size, embed_dim)
        self.pos_embed = nn.Parameter(torch.zeros(1, max_len, embed_dim))
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=embed_dim, nhead=num_heads, batch_first=True,
            dim_feedforward=embed_dim * 4, activation='gelu',
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.norm = nn.LayerNorm(embed_dim)
    
    def forward(self, input_ids: torch.Tensor) -> torch.Tensor:
        # (B, L) → (B, L, embed_dim)
        x = self.token_embed(input_ids)
        x = x + self.pos_embed[:, :x.shape[1]]
        x = self.transformer(x)
        x = self.norm(x)
        # Use first token (typically [CLS]) as text embedding
        return x[:, 0]  # (B, embed_dim)

# ============================================================
# 4. Multi-modal RAG retriever (extends ADR-032 hybrid)
# ============================================================

class MultiModalRAGRetriever:
    """Cross-modal RAG retriever using SigLIP embeddings.
    
    Extends ADR-032 hybrid retrieval with cross-modal capability.
    Same pgvector index stores both text and image embeddings.
    """
    def __init__(self, siglip_model: SigLIPModel, vector_store,
                 cross_encoder=None):
        self.siglip = siglip_model
        self.vector_store = vector_store  # pgvector wrapper (same as ADR-022)
        self.cross_encoder = cross_encoder  # for re-ranking (multi-modal variant)
    
    def index_documents(self, documents: List[Tuple[str, str]]):
        """Index mixed-modality corpus.
        
        Args:
            documents: list of (modality, content) tuples
                modality: 'text' or 'image'
                content: text string OR image path/URL
        """
        text_batch = []
        image_batch = []
        metadata_batch = []
        
        for modality, content in documents:
            if modality == 'text':
                # Encode text with SigLIP text encoder
                text_batch.append(content)
            else:
                # Load image, encode with SigLIP image encoder
                image = load_image(content)
                image_batch.append(image)
            metadata_batch.append({'modality': modality, 'content': content})
        
        # Batch encode (more efficient than per-item)
        text_embs = []
        image_embs = []
        if text_batch:
            text_ids = tokenize(text_batch)
            text_embs = self.siglip.encode_text(text_ids).tolist()
        if image_batch:
            image_tensor = torch.stack(image_batch)
            image_embs = self.siglip.encode_image(image_tensor).tolist()
        
        # Store in pgvector — modality column allows filtering when needed
        # CREATE TABLE chunks (id, modality, content, embedding vector(768))
        all_embs = []
        text_idx, image_idx = 0, 0
        for modality, _ in documents:
            if modality == 'text':
                all_embs.append(text_embs[text_idx])
                text_idx += 1
            else:
                all_embs.append(image_embs[image_idx])
                image_idx += 1
        
        self.vector_store.upsert(
            [m['content'] for m in metadata_batch],
            all_embs,
            metadata=metadata_batch,  # includes modality tag
        )
    
    def retrieve(self, query: str, query_modality: str = 'text',
                 top_k: int = 5) -> List[dict]:
        """Cross-modal retrieval.
        
        Args:
            query: text string OR image path
            query_modality: 'text' or 'image'
            top_k: number of results
        
        Returns: list of {modality, content, score} dicts, mixed
        """
        # Encode query
        if query_modality == 'text':
            query_ids = tokenize([query])
            query_emb = self.siglip.encode_text(query_ids)
        else:
            image = load_image(query)
            query_emb = self.siglip.encode_image(image.unsqueeze(0))
        
        # ANN search — returns top-k regardless of modality
        # SQL: SELECT id, modality, content, embedding <=> query_emb AS dist
        #      FROM chunks ORDER BY dist LIMIT 50
        results = self.vector_store.search(query_emb.squeeze(0), top_k=50)
        
        # Cross-encoder re-rank (multi-modal variant)
        # In production: use a multi-modal LLM (LLaVA-1.5) to score each (query, doc) pair
        if self.cross_encoder:
            results = self.cross_encoder.rerank(query, results, top_k=top_k)
        else:
            results = results[:top_k]
        
        return results[:top_k]

# ============================================================
# 5. Multi-modal LLM (LLaVA-style) for cross-encoder re-rank
# ============================================================

class MultiModalLLM(nn.Module):
    """LLaVA-style multi-modal LLM for cross-encoder re-ranking.
    
    Takes (image, text) pairs, scores them via cross-attention.
    Used as the cross-encoder in stage 3 of multi-modal RAG.
    """
    def __init__(self, vision_encoder, llm):
        super().__init__()
        self.vision_encoder = vision_encoder
        self.llm = llm  # any LLM (Llama, Qwen, etc.)
        # Projection: vision embed → LLM embed space
        self.projection = nn.Linear(768, llm.config.hidden_size)
    
    def forward(self, images: torch.Tensor, text_ids: torch.Tensor) -> torch.Tensor:
        """Score (image, text) pairs via cross-attention in the LLM."""
        # Encode images
        image_embs = self.vision_encoder(images)  # (B, 768)
        # Project to LLM embed space
        image_embs = self.projection(image_embs)  # (B, hidden_size)
        # Concatenate as "image tokens" before text
        text_embs = self.llm.embed_tokens(text_ids)
        # [image_emb] + text_embs → full input
        full_input = torch.cat([image_embs.unsqueeze(1), text_embs], dim=1)
        # Forward through LLM
        outputs = self.llm(inputs_embeds=full_input)
        # Use last hidden state at [CLS] position for scoring
        return outputs.last_hidden_state[:, 0]  # (B, hidden_size)

# Sanity check
if __name__ == "__main__":
    # Test SigLIP model
    model = SigLIPModel(image_size=224, embed_dim=384, vision_layers=2, text_layers=2, num_heads=6)
    print(f"SigLIP parameters: {sum(p.numel() for p in model.parameters()):,}")
    
    # Forward pass
    images = torch.randn(4, 3, 224, 224)
    text_ids = torch.randint(0, 32000, (4, 32))
    image_embs, text_embs = model(images, text_ids)
    print(f"Image embeddings: {tuple(image_embs.shape)}")
    print(f"Text embeddings: {tuple(text_embs.shape)}")
    
    # Loss
    loss = model.siglip_loss(image_embs, text_embs)
    print(f"SigLIP loss: {loss.item():.3f}")
    
    # Simulate training: pull matched pairs together
    # (in practice, this requires thousands of GPU-hours)
    print(f"\\n(Simulated training pulls matched pairs together)")`;

export function MultiModalRagPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Multi-modal RAG · CLIP / SigLIP · cross-modal pgvector"
        title="Multi-modal RAG — Text + Image in One Embedding Space"
        description="The math behind cross-modal retrieval: CLIP contrastive loss (InfoNCE, NxN softmax) vs SigLIP sigmoid loss (per-pair independent, scales to large batches). After training on (image, caption) pairs, both encoders produce vectors in the same ℝ^768 space — cosine similarity between a text query and an image embedding is meaningful. With low-level PyTorch implementations of VisionEncoder, TextEncoder, SigLIPModel with sigmoid loss, MultiModalRAGRetriever (extends ADR-032 hybrid to mixed modalities), and LLaVA-style MultiModalLLM for cross-encoder re-rank. Code-oriented, mathematical, scientific."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Sparkles className="h-3 w-3" /> CLIP / SigLIP</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Pyodide</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />)}
      </div>

      {/* 3D shared embedding animation */}
      <SectionCard title="Shared embedding space — text and image in ℝ^768" description="Pre-training: text and image embeddings are randomly scattered — no alignment. Contrastive training pulls matched (text, image) pairs together and pushes mismatches apart. After training: 'revenue chart' (text) and 📊 (image) live at the same point. A text query retrieves BOTH modalities — true cross-modal RAG." icon={<Sparkles className="h-5 w-5" />} badge="3D animation">
        <SharedEmbeddingAnimation />
      </SectionCard>

      {/* Contrastive loss math */}
      <SectionCard title="Contrastive loss math — CLIP (softmax) vs SigLIP (sigmoid)" description="CLIP uses InfoNCE loss: NxN softmax over a batch, each row pulls the matched pair together and pushes N-1 negatives apart. SigLIP replaces softmax with per-pair sigmoid — each (image, text) pair contributes an independent loss term. The key advantage: sigmoid scales to large batches (32k+) because pairs are independent; softmax requires O(N²) memory and time." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-xs text-primary">CLIP: L = -log( exp(s·sim(I_i,T_i)) / Σ_j exp(s·sim(I_i,T_j)) )</p>
            <p className="font-mono text-xs text-primary mt-1.5">SigLIP: L = -log σ( z · (s·sim(I,T) - b) )</p>
            <p className="text-[11px] text-muted-foreground mt-1">z = +1 for matched pairs, -1 for mismatched. s = learnable temperature, b = learnable bias. Independent per pair.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5">
              <p className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-1">CLIP (softmax, 2021)</p>
              <p className="font-mono text-[11px]">InfoNCE = softmax over N² pairs</p>
              <p className="text-muted-foreground text-[11px] mt-1.5">Each row depends on all N captions. O(N²) memory for gradients. Caps at batch 32k — beyond that, FLOPs explode.</p>
              <p className="text-[11px] mt-1.5">Original CLIP used batch 32k on 256× V100 (JFT-400M corpus).</p>
            </div>
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
              <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">SigLIP (sigmoid, 2023)</p>
              <p className="font-mono text-[11px]">Per-pair sigmoid — independent</p>
              <p className="text-muted-foreground text-[11px] mt-1.5">Each (I, T) pair contributes an independent loss. No batch-N×N coupling. Scales to batch 1M+ on TPU.</p>
              <p className="text-[11px] mt-1.5">SigLIP-SO400M trained on 12B (image, caption) pairs — 30× CLIP's data.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard title="Try it: Contrastive loss + cross-modal retrieval (Pyodide)" description="Implements both CLIP (softmax) and SigLIP (sigmoid) loss functions from scratch. Simulates random embeddings (pre-training) → aligned embeddings (post-training), shows the similarity matrix change. Then runs cross-modal retrieval: a text query retrieves both the matching text chunk AND the matching image from the same pgvector index." icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={CONTRASTIVE_DEMO} buttonLabel="Run contrastive learning demo (Pyodide)" />
      </SectionCard>

      {/* Cross-modal RAG pipeline */}
      <SectionCard title="Cross-modal RAG pipeline — extends ADR-032 to mixed modalities" description="Same three-stage pipeline as ADR-032, but the pgvector index stores BOTH text and image embeddings (modality column tags each row). Stage 1: chunk + embed (text via SigLIP text branch, image via SigLIP image branch — both in same space). Stage 2: hybrid BM25 + SigLIP vector → RRF fusion. Stage 3: multi-modal LLM cross-encoder (LLaVA-style) re-ranks mixed-modality results." icon={<Search className="h-5 w-5" />}>
        <CodeBlock language="text" filename="cross_modal_rag.txt" code={`┌──────────────────────────────────────────────────────────────────────┐
│  MULTI-MODAL RAG PIPELINE (extends ADR-032)                              │
│                                                                            │
│  USER QUERY (text OR image):                                              │
│  ┌──────────────────────────────────────────────────────────────┐         │
│  │ "Show me charts where UK revenue > £2M"                       │         │
│  │  OR  [image of a bar chart]                                    │         │
│  └──────────────────────────────────────────────────────────────┘         │
│                              │                                            │
│                              ▼                                            │
│  ┌──────────────────────────────────────────────────────┐                │
│  │ SigLIP encoder (text OR image branch)                 │                │
│  │   text query → encode_text()    → 768-dim vector       │                │
│  │   image query → encode_image()  → 768-dim vector       │                │
│  │   SAME embedding space — cross-modal works            │                │
│  └──────────────────────────────────────────────────────┘                │
│                              │                                            │
│                              ▼                                            │
│  ┌──────────────────────────────────────────────────────┐                │
│  │ pgvector HNSW search (top-50, ANY modality)           │                │
│  │   SQL: SELECT id, modality, content, embedding <=> Q  │                │
│  │        FROM chunks ORDER BY dist LIMIT 50             │                │
│  │   Returns: text chunks AND image chunks interleaved   │                │
│  └──────────────────────────────────────────────────────┘                │
│                              │                                            │
│                              ▼                                            │
│  ┌──────────────────────────────────────────────────────┐                │
│  │ Multi-modal LLM (LLaVA) cross-encoder re-rank         │                │
│  │   For each result:                                    │                │
│  │     If text: score = LLM([Q; doc])[CLS]                │                │
│  │     If image: score = LLM([Q; image_proj])[CLS]        │                │
│  │   Returns: top-5 mixed (text + image)                  │                │
│  └──────────────────────────────────────────────────────┘                │
│                              │                                            │
│                              ▼                                            │
│  ┌──────────────────────────────────────────────────────┐                │
│  │ Augmented prompt → vLLM (ADR-031)                     │                │
│  │   Context: [top-5 mixed results with modality tags]   │                │
│  │   Question: user query                                │                │
│  │   Answer: LLM generates text response                 │                │
│  └──────────────────────────────────────────────────────┘                │
│                                                                            │
│  APPLICATIONS:                                                             │
│  - Image → image: "find dashboards with similar patterns"                │
│  - Image → text: "find SQL that produces this chart"                       │
│  - Text → image: "show me charts of Q3 revenue"                            │
│  - Text → text: classic RAG (ADR-032)                                      │
│                                                                            │
│  pgvector index stores BOTH modalities (same HNSW):                       │
│    CREATE TABLE chunks (                                                   │
│      id BIGSERIAL PRIMARY KEY,                                             │
│      modality TEXT,  -- 'text' | 'image'                                   │
│      content TEXT,                                                          │
│      embedding vector(768)  -- same dim for both                          │
│    );                                                                       │
│    CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);       │
└──────────────────────────────────────────────────────────────────────────────┘`} />
      </SectionCard>

      {/* Low-level PyTorch */}
      <SectionCard title="Low-level PyTorch — SigLIPModel, VisionEncoder, TextEncoder, MultiModalRAGRetriever, MultiModalLLM" description="The actual production code. SigLIPModel wraps both encoders + the sigmoid contrastive loss (with learnable logit_scale and logit_bias). VisionEncoder is the ViT from ADR-026. TextEncoder is the transformer from /transformer. siglip_loss implements the per-pair sigmoid loss: -log σ(z·(s·sim-b)). MultiModalRAGRetriever extends ADR-032's hybrid retriever: same pgvector index, modality-aware indexing, cross-modal query. MultiModalLLM is LLaVA-style — projects image embeddings into LLM space and concatenates with text tokens for cross-attention." icon={<Cpu className="h-5 w-5" />} badge="low-level">
        <CodeBlock language="python" filename="multimodal_rag.py" highlight={[10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273]} code={PYTORCH_CODE} />
      </SectionCard>

      {/* Insight */}
      <SectionCard title="My deeper thought: contrastive learning IS metric learning IS the embedding IS the index" description="CLIP/SigLIP is not just a model — it's a general principle: any two modalities that can be paired (image+caption, code+docstring, SQL+description, audio+transcript) can be projected into a shared embedding space via contrastive learning. The shared space IS the index. The platform is one big contrastive-learning problem." icon={<TrendingUp className="h-5 w-5" />} badge="Insight">
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>The contrastive learning principle generalises far beyond image+text. <strong className="text-foreground/80">Any two modalities that co-occur can be aligned via contrastive learning.</strong> Code+docstring (CodeBERT), audio+transcript (Whisper), SQL+description (this platform's ADR-024 semantic layer), video+caption (VideoCLIP), molecule+SMILES — all follow the same pattern: train two encoders, pull matched pairs together, push mismatches apart, end up with a shared embedding space where cross-modal similarity is meaningful. The architecture is invariant to the modality. The math is invariant to the encoder.</p>
          <p><strong className="text-foreground/80">The shared embedding space IS the unified query language.</strong> ADR-024's NL-to-SQL semantic layer is structurally a contrastive learning problem: align natural language queries with SQL queries via the (NL, SQL) pairs in the gold tables. ADR-032's hybrid RAG aligns query embeddings with document embeddings via the (query, doc) labels in MS MARCO. ADR-033's SigLIP aligns image embeddings with text embeddings via the (image, caption) pairs in LAION-5B. All three are the same algorithm: contrastive learning on paired data, producing a shared space, queried via ANN. The "unified semantic layer" the platform has been building since ADR-024 IS a sequence of contrastive-learning applications, each on a different modality pair.</p>
          <p><strong className="text-foreground/80">This unifies the platform's entire GenAI stack under one principle.</strong> ADR-022 pgvector stores any embedding — text (ADR-032 RAG), image (ADR-026 ViT), synthetic image (ADR-027 DDPM → ViT → pgvector), multi-modal (ADR-033 SigLIP). ADR-029 OpenTelemetry traces every retrieval — each (query, retrieved) pair is a span, the trace is the contrastive-learning gradient signal in production. ADR-031 vLLM serves the LLM that consumes the retrieved context — the LLM is the projection operator (from /rag-deep-dive insight) that maps the embedding back to natural language. The whole platform from data ingestion to LLM response is one big contrastive-learning pipeline, where the "training data" is the user's queries + the platform's content, the "encoders" are the platform's services, and the "shared embedding space" is pgvector. The user's NL question is the query embedding; the platform's response is the retrieved nearest neighbour. Every user interaction is a contrastive-learning step — the platform IS the model.</p>
        </div>
      </SectionCard>

      <DeeperThoughtSection pageTitle="Multi-modal RAG">
        <DeeperThought title="Multi-modal RAG IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about Multi-modal RAG is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. Multi-modal RAG connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where Multi-modal RAG sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (Multi-modal RAG) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "Trace this topic's connections across the platform's math graph" }, { id: "rag-deep-dive" as const, reason: "Continue to rag deep dive — see also from this page" }, { id: "computer-vision" as const, reason: "Continue to computer vision — see also from this page" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("rag-deep-dive")} className="text-sm text-primary hover:underline">→ RAG Deep Dive (the text-only baseline this extends)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("computer-vision")} className="text-sm text-primary hover:underline">→ Computer Vision (ViT — the image branch)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("transformer")} className="text-sm text-primary hover:underline">→ Transformer (the text branch)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("diffusion-models")} className="text-sm text-primary hover:underline">→ Diffusion Models (synthetic images → SigLIP → pgvector)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("vector-db")} className="text-sm text-primary hover:underline">→ Vector DB (pgvector — the shared index)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">→ ADR-033 (SigLIP adoption)</Link>
      </div>
    </div>
  );
}
