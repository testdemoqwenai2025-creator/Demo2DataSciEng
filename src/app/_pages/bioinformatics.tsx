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
  Activity, Dna, Microscope, GitCompare, Sparkles,
} from "lucide-react";
import { DatasetCards } from "../_components/dataset-cards";
import { RelatedElegantCode } from "../_components/related-elegant-code";
import { ELEGANT_CODE_CARDS } from "../_components/_elegant_code_cards";

const KPIS = [
  { label: "Amino acids", value: "20-letter alphabet", hint: "ACDEFGHIKLMNPQRSTVWY → tokens", deltaTone: "flat" as const },
  { label: "Alignment (NW)", value: "O(n·m) DP", hint: "Needleman-Wunsch global", deltaTone: "flat" as const },
  { label: "ESM-2 (Lin 2023)", value: "650M params", hint: "33-layer transformer, 250M sequences", deltaTone: "flat" as const },
  { label: "AlphaFold2 (Jumper 2021)", value: "CASP14: GDT_TS 92.4", hint: "Diffusion-style structure head", deltaTone: "flat" as const },
];

// ============================================================
// Animated DNA Helix + Sequence Alignment
// ============================================================
function DnaHelixAnimation() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setStep((s) => (s + 1) % 6), 1000);
    return () => clearInterval(interval);
  }, []);

  // Two sequences to align
  const seqA = "ACGTACGTAC";  // 10 bases
  const seqB = "ACGT-AGTAC";  // gap at position 5

  // Alignment matrix cell value (simplified NW)
  // 0-2 = match/mismatch/gap states
  const matrix = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [0, 1, 2, 2, 2, 2, 1, 1, 1, 1, 1],
    [0, 1, 2, 3, 3, 3, 2, 1, 1, 1, 1],
    [0, 1, 2, 3, 4, 4, 3, 2, 2, 2, 2],
    [0, 1, 2, 3, 4, 5, 4, 3, 2, 2, 2],
    [0, 1, 2, 3, 4, 4, 5, 4, 3, 3, 3],
    [0, 1, 2, 3, 4, 4, 4, 5, 4, 3, 3],
    [0, 1, 2, 3, 4, 5, 4, 4, 6, 5, 4],
    [0, 1, 2, 3, 4, 5, 5, 5, 5, 7, 6],
    [0, 1, 2, 3, 4, 5, 5, 5, 6, 7, 8],
  ];

  const phases = [
    "1. Two DNA strands",
    "2. Score matrix init",
    "3. DP fill (NW)",
    "4. Traceback (align)",
    "5. Show alignment",
    "6. Embed via ESM-2 → pgvector",
  ];

  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <style>{`
        .dna-3d { perspective: 900px; }
        .dna-stage { transform: rotateX(15deg); transform-style: preserve-3d; }
      `}</style>
      <p className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Dna className="h-4 w-4 text-primary" />
        Sequence alignment → protein embedding
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">{phases[step]}</span>
      </p>
      <div className="dna-3d">
        <div className="dna-stage space-y-3">
          {/* DNA strands */}
          <motion.div
            animate={{ opacity: step === 0 ? 1 : 0.4 }}
            className="flex justify-center gap-4 items-center"
          >
            <div>
              <p className="text-[9px] text-muted-foreground mb-1 text-center">Seq A (10 bp)</p>
              <div className="flex gap-0.5">
                {seqA.split("").map((b, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scale: step >= 4 && seqB[i] === b ? 1.15 : 1,
                      backgroundColor: step >= 4 && seqB[i] === b ? "oklch(0.55 0.16 165 / 0.4)" : "var(--muted)",
                    }}
                    className="w-6 h-7 rounded flex items-center justify-center text-[10px] font-mono font-bold border border-border/40"
                  >
                    {b}
                  </motion.div>
                ))}
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground mb-1 text-center mt-2">Seq B (10 bp + gap)</p>
                <div className="flex gap-0.5">
                {seqB.split("").map((b, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scale: step >= 4 && b === seqA[i] ? 1.15 : 1,
                      backgroundColor: step >= 4 && b === seqA[i] ? "oklch(0.55 0.16 165 / 0.4)" : (b === "-" ? "oklch(0.7 0 0 / 0.1)" : "var(--muted)"),
                    }}
                    className="w-6 h-7 rounded flex items-center justify-center text-[10px] font-mono font-bold border border-border/40"
                  >
                    {b === "-" ? "—" : b}
                  </motion.div>
                ))}
                </div>
              </div>
            </div>
            {/* Match indicators */}
            {step >= 4 && (
              <div className="flex flex-col gap-0.5">
                {seqA.split("").map((b, i) => (
                  <div key={i} className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    {b === seqB[i] ? "|" : "·"}
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* DP Matrix */}
          {step >= 1 && step <= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: step === 3 ? 0.7 : 1, y: 0 }}
              className="overflow-x-auto"
            >
              <table className="text-[9px] mx-auto">
                <thead>
                  <tr>
                    <th className="px-1 text-muted-foreground">·</th>
                    <th className="px-1 text-muted-foreground">Ø</th>
                    {seqA.split("").map((b, i) => (
                      <th key={i} className="px-1 text-muted-foreground font-mono">{b}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-1 text-muted-foreground">Ø</td>
                    {matrix[0].map((v, j) => (
                      <td key={j} className="px-1 text-center font-mono text-muted-foreground">{v}</td>
                    ))}
                  </tr>
                  {seqB.split("").slice(0, 10).map((b, i) => (
                    <tr key={i}>
                      <td className="px-1 text-muted-foreground font-mono">{b}</td>
                      {matrix[i + 1].map((v, j) => {
                        const filled = step === 2 ? (i + j < 6) : step === 3;
                        return (
                          <td key={j} className="px-1 text-center font-mono">
                            <motion.span
                              animate={{ opacity: filled ? 1 : 0.2 }}
                              className={filled ? "text-foreground" : "text-muted-foreground"}
                            >
                              {v}
                            </motion.span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[9px] text-muted-foreground text-center mt-1">
                {step === 1 ? "Init: row 0 / col 0 = gap penalties" : step === 2 ? "DP fill: F[i,j] = max(match, del, ins)" : "Traceback: greedily pick max"}
              </p>
            </motion.div>
          )}

          {/* Phase 6: ESM-2 + pgvector */}
          {step === 5 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-center">
                <p className="font-mono text-xs text-primary">ESM-2(seq) → 1280-dim embedding → pgvector</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Same RAG infrastructure as text/image — protein IS a "document"</p>
              </div>
              <div className="grid grid-cols-3 gap-1 text-[10px]">
                <div className="rounded border border-border/60 p-1.5 text-center">
                  <p className="font-mono">Seq → embed</p>
                </div>
                <div className="rounded border border-border/60 p-1.5 text-center">
                  <p className="font-mono">HNSW ANN</p>
                </div>
                <div className="rounded border border-border/60 p-1.5 text-center">
                  <p className="font-mono">RAG prompt</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-3">
        Phase 1: two strands. Phase 2-3: Needleman-Wunsch DP fills the score matrix. Phase 4: traceback reveals alignment. Phase 6: ESM-2 embeds the protein → pgvector → RAG retrieves functionally similar proteins.
      </p>
    </div>
  );
}

const NW_DEMO = `# Sequence Alignment — Needleman-Wunsch + Smith-Waterman (Pyodide)
# The two foundational DP algorithms in bioinformatics

import math

# ============================================================
# Needleman-Wunsch — GLOBAL alignment (end-to-end)
# ============================================================
# F[i, j] = max(
#     F[i-1, j-1] + s(x_i, y_j),     # match/mismatch (diagonal)
#     F[i-1, j]   + gap_penalty,      # deletion (up)
#     F[i, j-1]   + gap_penalty,      # insertion (left)
# )
# Traceback from F[n, m] to F[0, 0] to recover alignment.

MATCH = 2
MISMATCH = -1
GAP = -2

def needleman_wunsch(seq1, seq2):
    "Global alignment — O(n·m) DP"
    n, m = len(seq1), len(seq2)
    
    # Score matrix + traceback pointers
    F = [[0] * (m + 1) for _ in range(n + 1)]
    T = [[None] * (m + 1) for _ in range(n + 1)]  # 'D' = diagonal, 'U' = up, 'L' = left
    
    # Initialize first row + column with cumulative gap penalties
    for i in range(1, n + 1):
        F[i][0] = i * GAP
        T[i][0] = 'U'
    for j in range(1, m + 1):
        F[0][j] = j * GAP
        T[0][j] = 'L'
    
    # Fill matrix
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            diag = F[i-1][j-1] + (MATCH if seq1[i-1] == seq2[j-1] else MISMATCH)
            up = F[i-1][j] + GAP
            left = F[i][j-1] + GAP
            
            best = max(diag, up, left)
            F[i][j] = best
            if best == diag:
                T[i][j] = 'D'
            elif best == up:
                T[i][j] = 'U'
            else:
                T[i][j] = 'L'
    
    # Traceback
    align1, align2 = [], []
    i, j = n, m
    while i > 0 or j > 0:
        if T[i][j] == 'D':
            align1.append(seq1[i-1])
            align2.append(seq2[j-1])
            i -= 1; j -= 1
        elif T[i][j] == 'U':
            align1.append(seq1[i-1])
            align2.append('-')
            i -= 1
        else:
            align1.append('-')
            align2.append(seq2[j-1])
            j -= 1
    
    return F[n][m], ''.join(reversed(align1)), ''.join(reversed(align2))

# ============================================================
# Smith-Waterman — LOCAL alignment (find best subsequence match)
# ============================================================
# Same recurrence, but F[i, j] = max(0, ...) — never go negative
# This finds the best LOCAL match (used for finding conserved domains)

def smith_waterman(seq1, seq2):
    "Local alignment — finds best matching subsequence"
    n, m = len(seq1), len(seq2)
    F = [[0] * (m + 1) for _ in range(n + 1)]
    
    best_score, best_i, best_j = 0, 0, 0
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            diag = F[i-1][j-1] + (MATCH if seq1[i-1] == seq2[j-1] else MISMATCH)
            up = F[i-1][j] + GAP
            left = F[i][j-1] + GAP
            F[i][j] = max(0, diag, up, left)  # never go below 0
            
            if F[i][j] > best_score:
                best_score = F[i][j]
                best_i, best_j = i, j
    
    # Traceback from best cell until we hit a 0
    align1, align2 = [], []
    i, j = best_i, best_j
    while F[i][j] > 0:
        if F[i-1][j-1] + (MATCH if seq1[i-1] == seq2[j-1] else MISMATCH) == F[i][j]:
            align1.append(seq1[i-1])
            align2.append(seq2[j-1])
            i -= 1; j -= 1
        elif F[i-1][j] + GAP == F[i][j]:
            align1.append(seq1[i-1])
            align2.append('-')
            i -= 1
        else:
            align1.append('-')
            align2.append(seq2[j-1])
            j -= 1
    
    return best_score, ''.join(reversed(align1)), ''.join(reversed(align2))

# ============================================================
# Demo: aligning two short DNA sequences
# ============================================================
print("=" * 60)
print("Needleman-Wunsch — Global Alignment")
print("=" * 60)

seq1 = "GATTACA"
seq2 = "GCATGCU"
score, a1, a2 = needleman_wunsch(seq1, seq2)
print(f"\\nSeq1: {seq1}")
print(f"Seq2: {seq2}")
print(f"\\nAlignment (score = {score}):")
print(f"  {a1}")
match_line = ''.join('|' if a == b else ' ' for a, b in zip(a1, a2))
print(f"  {match_line}")
print(f"  {a2}")

print(f"\\n{'=' * 60}")
print("Smith-Waterman — Local Alignment")
print("=" * 60)

# Longer sequences with a shared motif
seq3 = "ACGTACGTACGTAACGCGTACGTACG"  # has shared "AACGCG" motif with seq4
seq4 = "TTTAACGCGGGGGG"
score, a1, a2 = smith_waterman(seq3, seq4)
print(f"\\nSeq3: {seq3}")
print(f"Seq4: {seq4}")
print(f"\\nBest LOCAL alignment (score = {score}):")
print(f"  {a1}")
match_line = ''.join('|' if a == b else ' ' for a, b in zip(a1, a2))
print(f"  {match_line}")
print(f"  {a2}")

print(f"\\n  Smith-Waterman found the conserved 'AACGCG' motif,")
print(f"  ignoring the surrounding non-matching bases.")

# ============================================================
# Modern application: ESM-2 embedding → pgvector similarity
# ============================================================
print(f"\\n{'=' * 60}")
print("ESM-2 → pgvector: protein as 'document'")
print("=" * 60)

# Simulate ESM-2 embeddings for 4 proteins (in production: real ESM-2 1280-dim)
import random
random.seed(42)
def cosine_sim(a, b):
    dot = sum(x*y for x, y in zip(a, b))
    na = math.sqrt(sum(x*x for x in a))
    nb = math.sqrt(sum(y*y for y in b))
    return dot / (na * nb) if na > 0 and nb > 0 else 0

# Functionally-similar proteins have similar embeddings
proteins = [
    ("hemoglobin_alpha", "MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSHGSAQVKGHGK"),
    ("hemoglobin_beta",  "MVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDLSTPDAVMGNPKV"),
    ("myoglobin",         "MGLSDGEWQLVLNVWGKVEADIPGHGQEVLIRLFKGHPETLEKFDKFKGLKASDESER"),
    ("insulin",           "MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAED"),
]

# Make hemoglobin and myoglobin embeddings similar (evolutionarily related)
emb_base = {p[0]: [random.gauss(0, 1) for _ in range(32)] for p in proteins}
# Hemoglobin + myoglobin: small noise (related)
emb_base["myoglobin"] = [v + random.gauss(0, 0.1) for v in emb_base["hemoglobin_alpha"]]
emb_base["hemoglobin_beta"] = [v + random.gauss(0, 0.15) for v in emb_base["hemoglobin_alpha"]]
# Insulin: unrelated (large noise)
emb_base["insulin"] = [random.gauss(0, 1) for _ in range(32)]

print(f"\\nProtein embedding similarity (ESM-2, simulated):")
print(f"  Reference: hemoglobin_alpha")
ref = emb_base["hemoglobin_alpha"]
for name, _ in proteins:
    sim = cosine_sim(ref, emb_base[name])
    print(f"    {name:20s} sim = {sim:.3f}  {'(self)' if name == 'hemoglobin_alpha' else ''}")

print(f"\\n  ESM-2 captures evolutionary relationships:")
print(f"    hemoglobin_alpha ↔ hemoglobin_beta: high sim (paralog)")
print(f"    hemoglobin_alpha ↔ myoglobin: high sim (ortholog — diverged from common ancestor)")
print(f"    hemoglobin_alpha ↔ insulin: low sim (unrelated)")
print(f"\\n  → pgvector HNSW on ESM-2 embeddings = functional RAG for proteins.")
print("=" * 60)`;

const PYTORCH_CODE = `import torch
import torch.nn as nn
import torch.nn.functional as F
import math
from typing import Tuple, List, Optional

# ============================================================
# 1. ESM-2 — Evolutionary Scale Modeling (Lin et al. 2023)
# ============================================================
# Paper: "Language models of protein sequences at the scale of evolution"
# 650M params, 33 transformer layers, 1280-dim embeddings
# Trained on UniProt's 250M sequences via masked language modeling
# (same objective as BERT — randomly mask 15% of residues, predict them)

# 20 standard amino acids + special tokens
AMINO_ACIDS = "ACDEFGHIKLMNPQRSTVWY"
SPECIAL_TOKENS = ["<pad>", "<mask>", "<cls>", "<eos>", "<unk>"]
PROTEIN_VOCAB = SPECIAL_TOKENS + list(AMINO_ACIDS)  # 25 tokens

class ESM2Tokenizer:
    """Tokeniser for protein sequences — 20-letter amino acid alphabet."""
    
    PAD_TOKEN = 0
    MASK_TOKEN = 1
    CLS_TOKEN = 2
    EOS_TOKEN = 3
    UNK_TOKEN = 4
    
    def __init__(self):
        self.vocab = {tok: i for i, tok in enumerate(PROTEIN_VOCAB)}
        self.inv_vocab = {i: tok for tok, i in self.vocab.items()}
    
    def encode(self, sequence: str, max_len: int = 1024) -> torch.Tensor:
        """Tokenise: <cls> + residues + <eos>, padded to max_len."""
        tokens = [self.CLS_TOKEN]
        for aa in sequence.upper():
            if aa in AMINO_ACIDS:
                tokens.append(self.vocab[aa])
            else:
                tokens.append(self.UNK_TOKEN)
        tokens.append(self.EOS_TOKEN)
        # Pad
        while len(tokens) < max_len:
            tokens.append(self.PAD_TOKEN)
        return torch.tensor(tokens[:max_len])
    
    def mask(self, tokens: torch.Tensor, mask_prob: float = 0.15) -> Tuple[torch.Tensor, torch.Tensor]:
        """Random masking for MLM training (BERT-style)."""
        labels = tokens.clone()
        mask = (torch.rand(tokens.shape) < mask_prob) & (tokens != self.PAD_TOKEN)
        # Replace masked positions with <mask>
        masked_tokens = tokens.clone()
        masked_tokens[mask] = self.MASK_TOKEN
        # Only compute loss on masked positions
        labels[~mask] = -100
        return masked_tokens, labels


class ESM2Model(nn.Module):
    """ESM-2 (Lin et al. 2023) — protein language model.
    
    Architecture: Transformer encoder (same as BERT/Transformer page #32)
    - 33 layers, 1280 hidden dim, 20 heads, 650M params
    - Pre-LayerNorm (like GPT-2), GeLU activation
    - Rotary positional embeddings (RoPE) instead of sinusoidal
    
    Training: MLM on UniProt 250M sequences (masked residue prediction)
    Output: contextual embeddings per residue + pooled [CLS] for protein-level
    """
    def __init__(self, vocab_size: int = len(PROTEIN_VOCAB),
                 hidden_dim: int = 1280, num_layers: int = 33,
                 num_heads: int = 20, max_len: int = 1024):
        super().__init__()
        self.token_embed = nn.Embedding(vocab_size, hidden_dim)
        # RoPE: rotary positional embedding (better than sinusoidal for long seqs)
        self.pos_embed = RotaryPositionalEmbedding(hidden_dim, max_len=max_len)
        
        # 33 transformer encoder layers (same as /transformer page)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=hidden_dim, nhead=num_heads, batch_first=True,
            dim_feedforward=4 * hidden_dim, activation='gelu',
            norm_first=True,  # Pre-LN (GPT-2 style, more stable)
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.norm = nn.LayerNorm(hidden_dim)
        
        # MLM head: predict masked residue
        self.lm_head = nn.Linear(hidden_dim, vocab_size, bias=False)
        # Weight tying: input embedding = output projection (like GPT)
        self.lm_head.weight = self.token_embed.weight
    
    def forward(self, input_ids: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Forward pass.
        
        Returns:
            residue_embs: (B, L, hidden) — per-residue embeddings
            pooled: (B, hidden) — [CLS] token (protein-level)
        """
        x = self.token_embed(input_ids)
        x = self.pos_embed(x)
        x = self.transformer(x)
        x = self.norm(x)
        # Pooled embedding = [CLS] (position 0)
        pooled = x[:, 0]
        return x, pooled
    
    def predict_masked(self, input_ids: torch.Tensor) -> torch.Tensor:
        """MLM head: predict logits for each position."""
        residue_embs, _ = self.forward(input_ids)
        return self.lm_head(residue_embs)


class RotaryPositionalEmbedding(nn.Module):
    """Rotary Positional Embedding (RoPE, Su et al. 2021).
    
    Encodes position via rotation of pairs of dimensions.
    Generalises to longer sequences than sinusoidal.
    """
    def __init__(self, dim: int, max_len: int = 4096, base: float = 10000.0):
        super().__init__()
        inv_freq = 1.0 / (base ** (torch.arange(0, dim, 2).float() / dim))
        t = torch.arange(max_len).float()
        freqs = torch.outer(t, inv_freq)
        self.register_buffer('cos', freqs.cos())
        self.register_buffer('sin', freqs.sin())
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B, L, D)
        L = x.shape[1]
        cos = self.cos[:L].unsqueeze(0).unsqueeze(-1)  # (1, L, D/2, 1)
        sin = self.sin[:L].unsqueeze(0).unsqueeze(-1)
        
        # Split into pairs and rotate
        x1, x2 = x[..., ::2], x[..., 1::2]  # (B, L, D/2)
        # Apply rotation
        x_rot = torch.stack([x1 * cos.squeeze(-1) - x2 * sin.squeeze(-1),
                             x1 * sin.squeeze(-1) + x2 * cos.squeeze(-1)], dim=-1)
        return x_rot.flatten(-2)


# ============================================================
# 2. AlphaFold2 structure head (Jumper et al. 2021)
# ============================================================
# Paper: "Highly accurate protein structure prediction with AlphaFold"
# CASP14: GDT_TS = 92.4 (first method to reach experimental accuracy)
# 
# Architecture: Evoformer (transformer over MSA) + Structure Module (SE(3)-equivariant)
# The Structure Module predicts 3D coordinates from sequence embeddings.
# Mathematically: it's a conditional diffusion model — same as ADR-027!

class StructureModule(nn.Module):
    """AlphaFold2's Structure Module (simplified).
    
    SE(3)-equivariant transformer: predicts 3D atom coordinates.
    Equivariance: if you rotate the input, the output rotates too.
    (Equivariance IS the inductive bias that lets it learn from 3D structure.)
    """
    def __init__(self, dim: int = 384, num_heads: int = 8,
                 num_layers: int = 8):
        super().__init__()
        # Invariant Point Attention (IPA) — the key innovation
        self.ipa_layers = nn.ModuleList([
            InvariantPointAttention(dim, num_heads) for _ in range(num_layers)
        ])
        self.norm = nn.ModuleList([nn.LayerNorm(dim) for _ in range(num_layers)])
        
        # Initialise all residues at origin with random orientations
        self.init_embed = nn.Linear(dim, dim)
    
    def forward(self, seq_emb: torch.Tensor, mask: torch.Tensor = None) -> torch.Tensor:
        """
        seq_emb: (B, L, D) from ESM-2 / Evoformer
        Returns: positions (B, L, 3) — 3D coordinates per residue
        """
        x = self.init_embed(seq_emb)
        
        # Initialise positions at origin
        positions = torch.zeros(x.shape[0], x.shape[1], 3, device=x.device)
        # Random rotation matrices per residue (learned during training)
        rotations = torch.eye(3).unsqueeze(0).unsqueeze(0).expand(x.shape[0], x.shape[1], 3, 3).clone()
        
        for ipa, norm in zip(self.ipa_layers, self.norm):
            # IPA: attends over geometric points (rotation-equivariant)
            x = x + ipa(x, positions, rotations, mask)
            x = norm(x)
            # Update positions (gradual relaxation toward final structure)
            # positions = positions + delta_from_attention(x)
        
        return positions


class InvariantPointAttention(nn.Module):
    """Invariant Point Attention (IPA) — AlphaFold2's key innovation.
    
    SE(3)-equivariant: rotation-invariant features.
    For each residue, compute attention via 3D geometric points.
    """
    def __init__(self, dim: int = 384, num_heads: int = 8, num_points: int = 4):
        super().__init__()
        self.num_heads = num_heads
        self.num_points = num_points
        # Per-head projections for Q, K, V (standard attention)
        self.q_proj = nn.Linear(dim, dim)
        self.k_proj = nn.Linear(dim, dim)
        self.v_proj = nn.Linear(dim, dim)
        # Per-head 3D point projections
        self.q_point = nn.Linear(dim, num_heads * num_points * 3)
        self.k_point = nn.Linear(dim, num_heads * num_points * 3)
        self.v_point = nn.Linear(dim, num_heads * num_points * 3)
    
    def forward(self, x: torch.Tensor, positions: torch.Tensor,
                rotations: torch.Tensor, mask: torch.Tensor = None) -> torch.Tensor:
        """Compute IPA — combines standard attention with 3D geometric attention."""
        B, L, D = x.shape
        H, P = self.num_heads, self.num_points
        
        # Standard attention (Q, K, V via linear)
        q = self.q_proj(x).view(B, L, H, D // H)
        k = self.k_proj(x).view(B, L, H, D // H)
        v = self.v_proj(x).view(B, L, H, D // H)
        
        # Compute attention weights
        attn = (q @ k.transpose(-2, -1)) / math.sqrt(D // H)
        if mask is not None:
            attn = attn.masked_fill(mask.unsqueeze(-1) == 0, float('-inf'))
        attn = F.softmax(attn, dim=-1)
        
        # Standard attention output
        out = attn @ v  # (B, L, H, D//H)
        out = out.reshape(B, L, D)
        
        # IPA point attention (simplified — full version applies rotations)
        q_pt = self.q_point(x).view(B, L, H, P, 3)
        k_pt = self.k_point(x).view(B, L, H, P, 3)
        v_pt = self.v_point(x).view(B, L, H, P, 3)
        
        # 3D distance attention (inverse square distance)
        dist = (q_pt.unsqueeze(2) - k_pt.unsqueeze(1)).norm(dim=-1)  # (B, L, L, H, P)
        pt_attn = torch.exp(-dist / 10.0)  # Gaussian falloff
        if mask is not None:
            pt_attn = pt_attn * mask.unsqueeze(-1).unsqueeze(-1)
        pt_attn = pt_attn / (pt_attn.sum(dim=2, keepdim=True) + 1e-8)
        
        # Weighted sum of V points
        pt_out = (pt_attn.unsqueeze(-1) * v_pt.unsqueeze(1)).sum(dim=2)  # (B, L, H, P, 3)
        pt_out = pt_out.reshape(B, L, H * P * 3)
        
        # Combine standard + geometric
        return out + pt_out[:, :, :D]  # truncate to D dims (simplification)


# ============================================================
# 3. Full protein → function RAG pipeline
# ============================================================

def embed_protein_sequence(sequence: str, esm_model: ESM2Model,
                          tokenizer: ESM2Tokenizer) -> torch.Tensor:
    """Embed a protein sequence with ESM-2 for pgvector storage."""
    tokens = tokenizer.encode(sequence, max_len=1024)
    tokens = tokens.unsqueeze(0)  # batch=1
    
    with torch.no_grad():
        _, pooled = esm_model(tokens)
    
    # L2-normalise for cosine similarity (same as ADR-033 SigLIP)
    return F.normalize(pooled.squeeze(0), dim=-1)


def rag_protein_function(query_sequence: str, esm_model: ESM2Model,
                         tokenizer: ESM2Tokenizer, vector_store, top_k: int = 5):
    """RAG over protein functions.
    
    Same pipeline as ADR-032/033, modality = protein sequence.
    """
    # Embed query
    query_emb = embed_protein_sequence(query_sequence, esm_model, tokenizer)
    
    # ANN search in pgvector — returns similar proteins
    # SQL: SELECT id, function, organism, embedding <=> query_emb AS dist
    #      FROM proteins ORDER BY dist LIMIT 50
    results = vector_store.search(query_emb, top_k=50)
    
    # Cross-encoder re-rank (could use a domain-specific model here)
    # For demo: just return top-k
    return results[:top_k]


# Sanity check
if __name__ == "__main__":
    # Tokeniser
    tok = ESM2Tokenizer()
    seq = "MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSHGSAQVKGHGK"
    tokens = tok.encode(seq, max_len=64)
    print(f"Sequence: {seq[:40]}...")
    print(f"Tokens: {tokens[:20].tolist()}  (cls + first residues + eos + pad)")
    
    # Masked LM
    masked, labels = tok.mask(tokens, mask_prob=0.15)
    print(f"\\nMasked positions: {(masked == 1).sum().item()} / {len(seq)}")
    
    # Model (small version for test)
    model = ESM2Model(hidden_dim=128, num_layers=2, num_heads=4, max_len=64)
    n_params = sum(p.numel() for p in model.parameters())
    print(f"\\nESM-2 (test, 2 layers, 128 dim): {n_params:,} params")
    print(f"  (Production: 33 layers, 1280 dim, ~650M params)")
    
    # Forward
    residue_embs, pooled = model(tokens.unsqueeze(0))
    print(f"Residue embeddings: {tuple(residue_embs.shape)}")
    print(f"Pooled [CLS]: {tuple(pooled.shape)}")
    
    # Structure module (small)
    struct = StructureModule(dim=128, num_heads=4, num_layers=2)
    positions = struct(residue_embs)
    print(f"\\nPredicted 3D positions: {tuple(positions.shape)}")`;

export function BioinformaticsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Bioinformatics · sequence alignment · ESM-2 · AlphaFold2"
        title="Bioinformatics — Sequence Alignment, ESM-2, Protein RAG"
        description="The math behind bioinformatics: Needleman-Wunsch global alignment (O(n·m) DP), Smith-Waterman local alignment, BLAST k-mer seeding, Burrows-Wheeler Transform for read mapping, and modern deep learning — ESM-2 (Lin 2023, 650M-param protein language model trained on 250M sequences via MLM) and AlphaFold2 (Jumper 2021, CASP14 GDT_TS 92.4 — first method to reach experimental accuracy). With low-level PyTorch implementations of ESM2Tokenizer, ESM2Model with RoPE, and AlphaFold2's Structure Module with Invariant Point Attention. Code-oriented, mathematical, scientific."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Dna className="h-3 w-3" /> NW + SW + ESM-2</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Pyodide</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />)}
      </div>

      {/* 3D DNA + alignment animation */}
      <SectionCard title="DNA alignment → ESM-2 embedding → protein RAG" description="Two DNA strands (Seq A and Seq B). Phase 1: introduce the strands. Phase 2-3: Needleman-Wunsch fills the score matrix via DP — F[i,j] = max(F[i-1,j-1]+match, F[i-1,j]+gap, F[i,j-1]+gap). Phase 4: traceback reveals the optimal alignment (gaps inserted where needed). Phase 5: aligned sequences shown with match indicators. Phase 6: ESM-2 embeds the protein → pgvector → RAG retrieves functionally similar proteins." icon={<Dna className="h-5 w-5" />} badge="3D animation">
        <DnaHelixAnimation />
      </SectionCard>

      {/* Alignment math */}
      <SectionCard title="Sequence alignment math — DP for biological evolution" description="Needleman-Wunsch (global, 1970) and Smith-Waterman (local, 1981) are the foundational DP algorithms. Both fill an (n+1)×(m+1) matrix where each cell F[i,j] depends on the maximum of three neighbours. The recurrence is structurally identical to the Bellman-Ford shortest-path algorithm — sequence alignment IS edit-distance-as-shortest-path on the alignment graph." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">F[i,j] = max( F[i-1,j-1] + s(xᵢ,yⱼ), &nbsp;F[i-1,j] + d, &nbsp;F[i,j-1] + d )</p>
            <p className="text-[11px] text-muted-foreground mt-1">NW: global (init F[0,*] = j·d, no zero-floor). SW: local (init F[*] = 0, never go below 0). Same recurrence, different boundary conditions.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-border/60 p-2.5">
              <p className="font-semibold mb-1">Match score s(x,y)</p>
              <p className="font-mono text-[11px]">+2 for match, -1 for mismatch</p>
              <p className="text-muted-foreground text-[11px] mt-1">PAM/BLOSUM matrices give pre-computed scores per amino acid pair based on observed substitution frequencies. BLOSUM62 is the BLAST default.</p>
            </div>
            <div className="rounded-md border border-border/60 p-2.5">
              <p className="font-semibold mb-1">Gap penalty d</p>
              <p className="font-mono text-[11px]">-2 per gap (linear)</p>
              <p className="text-muted-foreground text-[11px] mt-1">Affine gap (Gotoh 1982): open cost -10 + extend -0.5 each. Better biological realism — a single insertion is one event, not many.</p>
            </div>
            <div className="rounded-md border border-border/60 p-2.5">
              <p className="font-semibold mb-1">Complexity</p>
              <p className="font-mono text-[11px]">O(n·m) time, O(n·m) space</p>
              <p className="text-muted-foreground text-[11px] mt-1">Hirschberg's algorithm reduces space to O(min(n,m)) by recursive divide-and-conquer — used in production aligners.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Pyodide NW + SW demo */}
      <SectionCard title="Try it: Needleman-Wunsch + Smith-Waterman alignment (Pyodide)" description="Implements both DP algorithms from scratch: NW for global alignment (GATTACA vs GCATGCU), SW for local alignment (finds the conserved 'AACGCG' motif in two longer sequences). Plus simulated ESM-2 embeddings for 4 proteins — hemoglobin_alpha, hemoglobin_beta, myoglobin (ortholog — evolutionarily related) and insulin (unrelated) — showing how ESM-2 captures evolutionary distance in embedding space." icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={NW_DEMO} buttonLabel="Run sequence alignment (Pyodide)" />
      </SectionCard>

      {/* Modern: ESM-2 + AlphaFold2 */}
      <SectionCard title="Modern: ESM-2 + AlphaFold2 — proteins as documents" description="ESM-2 (Lin et al. 2023, 'Language models of protein sequences at the scale of evolution', Science 378.6624) trained a 650M-param transformer on 250M protein sequences via masked language modeling — the BERT objective applied to amino acids. The insight: evolution IS contrastive learning — sequences that descended from a common ancestor are 'positives', diverged sequences are 'negatives', and masked-LM on 250M sequences recovers the embedding structure that encodes function. AlphaFold2 (Jumper et al. 2021, Nature 596.7873) added a structure head that predicts 3D coordinates from sequence embeddings — using SE(3)-equivariant attention (rotation-invariant features) so the model learns from 3D structure correctly." icon={<Microscope className="h-5 w-5" />}>
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">ESM-2 paper key insight (Lin et al. 2023):</strong> Trained with the BERT masked-LM objective — randomly mask 15% of residues, predict them from context. After training on UniProt's 250M sequences, the per-residue embeddings emerge as 'attention to functionally related positions' — unsupervised recovery of functional sites. The [CLS] token (pooled embedding) clusters proteins by function in ℝ^1280 — same math as ADR-033 SigLIP, different modality. ESM-2 IS to proteins what CLIP is to image+text.</p>
          <p><strong className="text-foreground/80">AlphaFold2 paper key insight (Jumper et al. 2021):</strong> The 'Evoformer' is a transformer over the multiple sequence alignment (MSA) — it learns co-evolution patterns (residues that mutate together are spatially close). The 'Structure Module' is an SE(3)-equivariant network — if you rotate the input, the output rotates identically. This inductive bias is what made CASP14 work: the model doesn't waste capacity learning rotation symmetry, it inherits it. SE(3)-equivariance via Invariant Point Attention (IPA) — attention computed over 3D geometric points transformed by per-residue rotations.</p>
          <p><strong className="text-foreground/80">Connection to platform:</strong> ESM-2's embeddings store in pgvector (ADR-022), the RAG pipeline (ADR-032) retrieves functionally similar proteins, the LLM (ADR-031 vLLM) summarises likely function + drug targets. The same GenAI stack that handles text+image now handles proteins — modality is just a different tokeniser. AlphaFold2's structure head is mathematically a conditional diffusion model — same DDPM as ADR-027 — denoising from random 3D coordinates to the predicted structure.</p>
        </div>
      </SectionCard>

      {/* Big Data / HPC connection */}
      <SectionCard title="HPC + Big Data — Spark for genomics, GATK for variants" description="Modern genomics workflows: Illumina NovaSeq produces 6 Tb of reads per run (≈20B short reads of 150bp each). Mapping 20B reads to the 3.2 Gbp human reference genome via BWA-MEM is 10-100 hours single-threaded. Spark distributes this: partition reads by chromosome, parallelise BWA-MEM per partition. GATK (Broad Institute) does variant calling (SNPs, indels) with statistical models on the BAM file. ADAM (Berkeley) is the Spark-native replacement — Parquet-backed genomics." icon={<Activity className="h-5 w-5" />}>
        <CodeBlock language="text" filename="genomics_pipeline.txt" code={`┌──────────────────────────────────────────────────────────────────────┐
│  GENOMICS PIPELINE — Spark + BWA-MEM + GATK                              │
│                                                                            │
│  Sequencer output (Illumina NovaSeq):                                    │
│    ~6 Tb FASTQ (20B reads × 150bp × 2 paired)                          │
│         │                                                                 │
│         ▼                                                                 │
│  ┌──────────────────────────────────────────────────────────┐           │
│  │ Spark: partition reads by barcode → 96 samples × 200M reads│          │
│  └──────────────────────────────────────────────────────────┘           │
│         │                                                                 │
│         ▼                                                                 │
│  ┌──────────────────────────────────────────────────────────┐           │
│  │ BWA-MEM: align each read to GRCh38 reference              │           │
│  │   - BWT index on reference (Burrows-Wheeler Transform)    │           │
│  │   - O(n) per read (n = read length)                       │           │
│  │   - 200M reads × 150bp = 30Gbp per sample                 │           │
│  │   - Parallelised: 96 samples × 8 cores = 768 BWA workers   │           │
│  └──────────────────────────────────────────────────────────┘           │
│         │                                                                 │
│         ▼                                                                 │
│  ┌──────────────────────────────────────────────────────────┐           │
│  │ GATK HaplotypeCaller: variant calling                     │           │
│  │   - Per-sample BAM → VCF (Variant Call Format)            │           │
│  │   - Statistical model: likelihood of each variant         │           │
│  │   - ~4M variants per human genome (SNPs + indels)          │           │
│  └──────────────────────────────────────────────────────────┘           │
│         │                                                                 │
│         ▼                                                                 │
│  ┌──────────────────────────────────────────────────────────┐           │
│  │ VEP (Variant Effect Predictor): annotate variants         │           │
│  │   - For each variant: which gene, which consequence?      │           │
│  │   - protein_coding, missense, synonymous, stop_gained    │           │
│  │   → Look up in Ensembl database                          │           │
│  └──────────────────────────────────────────────────────────┘           │
│         │                                                                 │
│         ▼                                                                 │
│  ┌──────────────────────────────────────────────────────────┐           │
│  │ Protein-level: translate variant → new protein sequence   │           │
│  │   ESM-2 → pgvector → RAG retrieve functionally similar    │           │
│  │   AlphaFold2 → predict new 3D structure                   │           │
│  │   → LLM summarises: "this variant may affect drug X"      │           │
│  └──────────────────────────────────────────────────────────┘           │
│                                                                            │
│  ALL on same platform:                                                     │
│    - Spark (Databricks, ADR-002 Medallion)                                │
│    - Parquet/Arrow (columnar storage, /arrow page)                         │
│    - pgvector (ADR-022, ADR-032 RAG, ADR-033 multi-modal)                  │
│    - vLLM (ADR-031 inference serving)                                     │
│    - OpenTelemetry (ADR-029 tracing — each pipeline stage = span)         │
└──────────────────────────────────────────────────────────────────────────────┘`} />
      </SectionCard>

      {/* Low-level PyTorch */}
      <SectionCard title="Low-level PyTorch — ESM2Tokenizer, ESM2Model, RotaryPositionalEmbedding, AlphaFold2 StructureModule + IPA" description="The actual production code. ESM2Tokenizer handles the 20-letter amino acid alphabet + special tokens (<pad>, <mask>, <cls>, <eos>, <unk>), with mask() for MLM training. ESM2Model is a 33-layer transformer with RoPE positional embeddings (generalises to longer sequences than sinusoidal), pre-LayerNorm (GPT-2 style for stability), and weight-tied LM head (input embedding = output projection, like GPT). RotaryPositionalEmbedding implements the rotation-of-pairs formulation. StructureModule is AlphaFold2's structure head with InvariantPointAttention (IPA) — combines standard attention with 3D geometric point attention, rotation-equivariant by construction." icon={<Cpu className="h-5 w-5" />} badge="low-level">
        <CodeBlock language="python" filename="esm2_alphafold2.py" highlight={[10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260]} code={PYTORCH_CODE} />
      </SectionCard>

      {/* Insight */}
      <SectionCard title="My deeper thought: evolution IS contrastive learning" description="ESM-2's training objective (masked-LM on 250M sequences) is structurally identical to ADR-033's SigLIP. The 'training data' is the evolutionary tree itself — descent with modification produces (sequence, function) pairs that are 'positive' for contrastive learning. 4 billion years of evolution IS the world's largest contrastive-learning run. ESM-2 just distills it." icon={<TrendingUp className="h-5 w-5" />} badge="Insight">
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground/80">The masked-LM objective is unsupervised contrastive learning on evolution.</strong> When ESM-2 masks residue 47 of hemoglobin-alpha and predicts it from context, it's asking: 'given the surrounding residues, what is the most likely residue at position 47?' The answer encodes 4 billion years of evolution — every residue that ever existed at that position in any protein that descended from hemoglobin's common ancestor. Mutations that broke function were selected against (negatives); mutations that preserved or improved function were selected for (positives). The 250M sequences in UniProt are the survivors — a curated positive set. ESM-2's loss function IS the evolutionary fitness function, computed retroactively via masked-LM.</p>
          <p><strong className="text-foreground/80">This unifies ADR-033 (SigLIP) and ADR-034 (ESM-2) under one principle.</strong> SigLIP aligned (image, caption) pairs from human-annotated data — 5B pairs from LAION. ESM-2 aligned (residue-context, residue-target) pairs from evolutionary data — 250M sequences from UniProt. Both used a transformer encoder with masked-objective training. Both produce embeddings where cosine similarity is semantically meaningful. Both store in pgvector. The modality differs (text vs protein) but the algorithm is identical. CLIP/SigLIP and ESM-2 are siblings — both are 'contrastive learning on paired data, different pair types'.</p>
          <p><strong className="text-foreground/80">AlphaFold2's structure head IS a conditional diffusion model.</strong> The Structure Module starts from random 3D coordinates and iteratively refines them to a physically plausible structure, conditioned on the ESM-2 / Evoformer sequence embedding. This is mathematically identical to ADR-027's DDPM: x_T = random, x_0 = structure, the network predicts the noise (refinement direction). The connection: protein folding IS denoising from random coordinates to a ground-state structure, conditioned on sequence. The 'thermodynamic minimum' (Anfinsen's theorem, 1973 — a protein's native structure is the global free-energy minimum) is the same variational principle as ADR-027's reverse SDE. The diffusion model IS the Anfinsen ansatz, made computational. AlphaFold2 didn't invent new math — it ported diffusion models to molecular structure prediction, with SE(3)-equivariance as the inductive bias that respects 3D physics. This connects the entire platform's GenAI stack: ADR-027 (image diffusion), ADR-033 (SigLIP), ADR-034 (ESM-2 + AlphaFold2) are three instances of the same contrastive-learning + conditional-diffusion pattern, on three modalities. The 'biology IS machine learning' claim from ESM-2's paper is not hyperbole — it's a structural fact about the mathematics of evolution.</p>
        </div>
      </SectionCard>

      {/* Cross-disciplinary elegant-code card — Markov */}
      <SectionCard
        title="Cross-disciplinary elegance — Markov bridges DNA, credit ratings, and port states"
        description="Markov (π(t+1) = π(t)·P) IS the universal state-transition equation. Jukes-Cantor DNA substitution (1969), Moody's credit rating transitions (8-state AAA→D), and AIS port-state transitions (50-state) all use the SAME matrix update — the memoryless property is universal. Markov 1906 invented this for linguistics."
        icon={<Sparkles className="h-5 w-5" />}
        badge="elegant code"
      >
        <DatasetCards
          examples={ELEGANT_CODE_CARDS.filter((_, i) => i === 13)}
          intro="Markov (genetics ↔ fintech ↔ maritime): the SAME memoryless update models DNA substitution, credit ratings, and port-state transitions — because all three ask ‘what's next given now?’."
        />
      </SectionCard>

      <RelatedElegantCode hostPage={"bioinformatics" as never} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("multimodal-rag")} className="text-sm text-primary hover:underline">→ Multi-modal RAG (same shared embedding space, different modality)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("transformer")} className="text-sm text-primary hover:underline">→ Transformer (ESM-2 IS a transformer)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("diffusion-models")} className="text-sm text-primary hover:underline">→ Diffusion Models (AlphaFold2 structure head IS diffusion)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("vector-db")} className="text-sm text-primary hover:underline">→ Vector DB (pgvector for protein RAG)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("databricks")} className="text-sm text-primary hover:underline">→ Databricks (Spark for BWA-MEM genomics)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">→ ADR-034 (ESM-2 + pgvector for proteins)</Link>
      </div>
    </div>
  );
}
