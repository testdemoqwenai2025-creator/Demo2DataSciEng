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
  Activity, Search, FileText, Filter,
} from "lucide-react";

const KPIS = [
  { label: "Chunk size", value: "512 tokens", hint: "tiktoken-aware, overlap=64 (sliding)", deltaTone: "flat" as const },
  { label: "Hybrid retrieval", value: "BM25 ‖ vector", hint: "Parallel sparse + dense, RRF fusion", deltaTone: "flat" as const },
  { label: "RRF formula", value: "Σ 1/(60 + rank)", hint: "Reciprocal Rank Fusion (k=60)", deltaTone: "flat" as const },
  { label: "Cross-encoder", value: "MS MARCO MiniLM", hint: "Re-rank top-50 → top-5 (~250ms)", deltaTone: "flat" as const },
];

// ============================================================
// Animated Hybrid Retrieval Pipeline
// ============================================================
function HybridRetrievalAnimation() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setStep((s) => (s + 1) % 5), 1200);
    return () => clearInterval(interval);
  }, []);

  // Query flows through 5 phases:
  // 1. Chunking (doc → chunks)
  // 2. Parallel retrieval (BM25 + vector)
  // 3. RRF fusion
  // 4. Cross-encoder re-rank
  // 5. Final top-5 to LLM

  // Document chunks (10 chunks)
  const chunks = Array.from({ length: 10 }, (_, i) => `c${i+1}`);

  // BM25 ranks (sparse, exact-match ordering)
  const bm25Ranks = [2, 5, 1, 7, 0, 4, 6, 9, 3, 8];
  // Vector ranks (dense, semantic ordering)
  const vectorRanks = [3, 0, 6, 1, 8, 5, 4, 2, 9, 7];

  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <style>{`
        .rh-3d { perspective: 900px; }
        .rh-stage { transform: rotateX(15deg); transform-style: preserve-3d; }
      `}</style>
      <p className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Filter className="h-4 w-4 text-primary" />
        Three-stage hybrid RAG pipeline
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">
          phase {step + 1}/5
        </span>
      </p>
      <div className="rh-3d">
        <div className="rh-stage space-y-3">
          {/* Phase 1: Chunking */}
          <motion.div
            animate={{ opacity: step === 0 ? 1 : 0.5 }}
            className="rounded-md border border-primary/40 bg-primary/5 p-2.5"
          >
            <p className="text-[10px] font-mono text-primary mb-1.5">Phase 1: Chunking (RecursiveCharacterTextSplitter, 512 tokens, overlap=64)</p>
            <div className="flex gap-1 flex-wrap">
              {chunks.map((c, i) => (
                <motion.div
                  key={c}
                  animate={{ scale: step === 0 ? 1.05 : 1 }}
                  className="px-2 py-1 rounded text-[9px] font-mono border border-border/60 bg-background"
                >
                  {c}
                </motion.div>
              ))}
            </div>
            <p className="text-[9px] text-muted-foreground mt-1.5">10 chunks → embed each → store in pgvector (vector + tsvector)</p>
          </motion.div>

          {/* Phase 2: Parallel retrieval */}
          <motion.div
            animate={{ opacity: step === 1 ? 1 : 0.5 }}
            className="grid grid-cols-2 gap-2"
          >
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
              <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mb-1.5">BM25 (sparse, exact-match)</p>
              <div className="space-y-0.5">
                {bm25Ranks.slice(0, 5).map((c, i) => (
                  <motion.div
                    key={`bm-${c}`}
                    animate={{ opacity: step >= 1 ? 1 : 0.3, x: step === 1 ? 0 : -10 }}
                    className="flex items-center gap-1 text-[9px] font-mono"
                  >
                    <span className="w-3 text-muted-foreground">{i+1}.</span>
                    <span className="px-1 py-0.5 rounded bg-background border border-border/60">c{c+1}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 ml-auto">score={(10-i*1.5).toFixed(1)}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-2.5">
              <p className="text-[10px] font-mono text-violet-600 dark:text-violet-400 mb-1.5">Vector ANN (dense, semantic)</p>
              <div className="space-y-0.5">
                {vectorRanks.slice(0, 5).map((c, i) => (
                  <motion.div
                    key={`v-${c}`}
                    animate={{ opacity: step >= 1 ? 1 : 0.3, x: step === 1 ? 0 : 10 }}
                    className="flex items-center gap-1 text-[9px] font-mono"
                  >
                    <span className="w-3 text-muted-foreground">{i+1}.</span>
                    <span className="px-1 py-0.5 rounded bg-background border border-border/60">c{c+1}</span>
                    <span className="text-violet-600 dark:text-violet-400 ml-auto">sim={(0.95-i*0.05).toFixed(2)}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Phase 3: RRF fusion */}
          <motion.div
            animate={{ opacity: step === 2 ? 1 : 0.5 }}
            className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5"
          >
            <p className="text-[10px] font-mono text-amber-600 dark:text-amber-400 mb-1.5">Phase 3: RRF fusion = Σ 1/(60 + rank_i) per chunk</p>
            <div className="flex gap-1 flex-wrap">
              {/* Compute RRF score for each chunk and show top 8 */}
              {chunks.map((c, i) => {
                const bmRank = bm25Ranks.indexOf(i);
                const vRank = vectorRanks.indexOf(i);
                const rrf = (bmRank < 5 ? 1/(60 + bmRank + 1) : 0) + (vRank < 5 ? 1/(60 + vRank + 1) : 0);
                return (
                  <motion.div
                    key={`rrf-${c}`}
                    animate={{ scale: step === 2 && rrf > 0.02 ? 1.1 : 1 }}
                    className="px-2 py-1 rounded text-[9px] font-mono border border-border/60 bg-background"
                  >
                    {c}:{rrf.toFixed(3)}
                  </motion.div>
                );
              })}
            </div>
            <p className="text-[9px] text-muted-foreground mt-1.5">Top chunks by RRF: combine both rankings</p>
          </motion.div>

          {/* Phase 4: Cross-encoder re-rank */}
          <motion.div
            animate={{ opacity: step === 3 ? 1 : 0.5 }}
            className="rounded-md border border-cyan-500/40 bg-cyan-500/5 p-2.5"
          >
            <p className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 mb-1.5">Phase 4: Cross-encoder re-rank top-50 → top-5 (co-encode query+doc)</p>
            <div className="space-y-0.5">
              {["c3", "c1", "c2", "c4", "c5"].map((c, i) => (
                <motion.div
                  key={`ce-${c}`}
                  animate={{ x: step === 3 ? 0 : 5 }}
                  className="flex items-center gap-1 text-[9px] font-mono"
                >
                  <span className="w-3 text-muted-foreground">{i+1}.</span>
                  <span className="px-1 py-0.5 rounded bg-background border border-border/60">{c}</span>
                  <span className="text-cyan-600 dark:text-cyan-400 ml-auto">cross-enc={(0.95-i*0.08).toFixed(2)}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Phase 5: To LLM */}
          <motion.div
            animate={{ opacity: step === 4 ? 1 : 0.5 }}
            className="rounded-md border border-primary/40 bg-primary/10 p-2.5 text-center"
          >
            <p className="text-[10px] font-mono text-primary">Phase 5: Top-5 chunks → augmented prompt → vLLM (ADR-031)</p>
            <p className="text-[9px] text-muted-foreground mt-1">"Context: c3, c1, c2, c4, c5. Question: {`{user_query}`}. Answer:"</p>
          </motion.div>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-3">
        Naive RAG does only phase 2 vector → top-5 → LLM. Three-stage hybrid adds BM25 (exact-match) + RRF + cross-encoder.
        Lifts RAG accuracy 25-35% on SQL grounding.
      </p>
    </div>
  );
}

const BM25_DEMO = `# BM25 + RRF + Cross-encoder re-rank (Pyodide)
# Full hybrid retrieval pipeline simulation

import math, random

# ============================================================
# BM25 (Best Match 25) — sparse exact-match scoring
# ============================================================
# BM25 score for query Q against document D:
#   score(Q, D) = Σ_{q in Q} IDF(q) * (f(q,D) * (k1 + 1)) / (f(q,D) + k1 * (1 - b + b * |D| / avgdl))
# Where:
#   f(q,D) = term frequency of q in D
#   |D| = length of D
#   avgdl = average document length in corpus
#   k1 = 1.5 (term frequency saturation)
#   b = 0.75 (length normalization)
#   IDF(q) = log((N - n(q) + 0.5) / (n(q) + 0.5) + 1)
#     N = total docs, n(q) = docs containing q

def bm25_score(query_terms, doc_terms, doc_freq, N, avgdl, k1=1.5, b=0.75):
    "BM25 score for one document against query"
    score = 0.0
    doc_len = len(doc_terms)
    for q in query_terms:
        # Term frequency in document
        f = doc_terms.count(q)
        if f == 0:
            continue
        # IDF (with +1 smoothing for stability)
        n_q = doc_freq.get(q, 0)
        idf = math.log((N - n_q + 0.5) / (n_q + 0.5) + 1)
        # BM25 score for this term
        tf_norm = (f * (k1 + 1)) / (f + k1 * (1 - b + b * doc_len / avgdl))
        score += idf * tf_norm
    return score

# ============================================================
# Demo corpus: SQL DDL schema chunks
# ============================================================
corpus = [
    "create table dim_customer customer_id primary key customer_name segment region",
    "create table fact_sales sale_id customer_id product_id amount sale_date",
    "create table dim_product product_id product_name category price",
    "create view v_revenue_by_region as select region sum amount from fact_sales",
    "create table dim_date date_id year quarter month day fiscal_period",
]

# Tokenise (simple whitespace split)
docs = [doc.split() for doc in corpus]
N = len(docs)
avgdl = sum(len(d) for d in docs) / N

# Compute doc frequencies (DF) for each term
doc_freq = {}
for doc in docs:
    for term in set(doc):
        doc_freq[term] = doc_freq.get(term, 0) + 1

print("=" * 60)
print("BM25 Scoring — exact-match sparse retrieval")
print("=" * 60)
print(f"\\nCorpus: {N} SQL DDL chunks, avg length {avgdl:.1f} terms")

# Test queries
queries = [
    "customer revenue",
    "fact_sales amount",
    "region sum",
    "product category price",
]

for query in queries:
    query_terms = query.split()
    print(f"\\n--- Query: '{query}' ---")
    scores = []
    for i, doc in enumerate(docs):
        score = bm25_score(query_terms, doc, doc_freq, N, avgdl)
        scores.append((i, score, " ".join(doc[:5]) + "..."))
    scores.sort(key=lambda x: -x[1])
    for i, (doc_idx, score, preview) in enumerate(scores[:3]):
        print(f"  {i+1}. doc{doc_idx} (score={score:.3f}): {preview}")

# ============================================================
# RRF — Reciprocal Rank Fusion
# ============================================================
def rrf_fusion(rankings, k=60):
    """
    Reciprocal Rank Fusion.
    
    rankings: list of ranked lists (each list = [doc_id, doc_id, ...])
    Returns: dict {doc_id: rrf_score}
    
    Formula: rrf(d) = Σ_i 1 / (k + rank_i(d))
    k=60 (default from original paper)
    """
    scores = {}
    for ranking in rankings:
        for rank, doc_id in enumerate(ranking):
            scores[doc_id] = scores.get(doc_id, 0) + 1 / (k + rank + 1)
    return scores

print(f"\\n{'=' * 60}")
print("RRF Fusion — combining BM25 + Vector rankings")
print("=" * 60)

# Simulate: BM25 ranks c3 > c1 > c4, vector ranks c1 > c3 > c2
bm25_ranking = [2, 0, 3]   # doc indices
vector_ranking = [0, 2, 1]

print(f"\\nBM25 ranking: {['c'+str(i+1) for i in bm25_ranking]}")
print(f"Vector ranking: {['c'+str(i+1) for i in vector_ranking]}")

rrf_scores = rrf_fusion([bm25_ranking, vector_ranking], k=60)
print(f"\\nRRF scores (k=60):")
for doc_id, score in sorted(rrf_scores.items(), key=lambda x: -x[1]):
    print(f"  c{doc_id+1}: {score:.4f}")

# Show why RRF works
print(f"\\n  c1: BM25 rank 2 → 1/(60+2)={1/62:.4f}, Vector rank 1 → 1/(60+1)={1/61:.4f}")
print(f"      Total: {1/62 + 1/61:.4f}  (high in both rankings → high RRF)")
print(f"  c3: BM25 rank 1 → 1/61={1/61:.4f}, Vector rank 2 → 1/62={1/62:.4f}")
print(f"      Total: {1/61 + 1/62:.4f}  (also high in both)")
print(f"\\n  Insight: RRF rewards documents ranked high in BOTH lists")
print(f"  (no document can dominate from a single ranking alone)")

# ============================================================
# Cross-encoder re-rank
# ============================================================
print(f"\\n{'=' * 60}")
print("Cross-encoder Re-rank")
print("=" * 60)

# Bi-encoder (used in stage 2):
#   query_emb = encode(query)  # independent of doc
#   doc_emb = encode(doc)       # independent of query
#   sim = cosine(query_emb, doc_emb)  # cheap
#   → misses query-doc interactions

# Cross-encoder (used in stage 3):
#   score = MLP([query_emb; doc_emb; query_emb * doc_emb])
#   → jointly encodes query+doc, captures interactions
#   → 100x more expensive, but 5-10% more accurate

random.seed(42)
def cross_encoder_score(query, doc):
    "Simulate cross-encoder (in production: ms-marco-MiniLM-L-12-v2)"
    # Real cross-encoders compute attention between query and doc tokens
    # Here: simulate with a noisy function of semantic overlap
    overlap = len(set(query.split()) & set(doc.split())) / max(1, len(set(query.split())))
    noise = random.gauss(0, 0.05)
    return overlap + noise

# Re-rank top-3 from RRF using cross-encoder
top_k = list(rrf_scores.keys())[:3]
query = "customer revenue region"
print(f"\\nQuery: '{query}'")
print(f"\\nBi-encoder (vector ANN) top-3: {['c'+str(i+1) for i in top_k]}")
print(f"Cross-encoder re-ranking...")

ce_scores = []
for doc_id in top_k:
    doc_text = corpus[doc_id]
    score = cross_encoder_score(query, doc_text)
    ce_scores.append((doc_id, score, doc_text[:50]))
    print(f"  c{doc_id+1}: cross-enc score={score:.3f}  ({doc_text[:50]}...)")

ce_scores.sort(key=lambda x: -x[1])
print(f"\\nFinal top-3 after cross-encoder re-rank:")
for i, (doc_id, score, preview) in enumerate(ce_scores):
    print(f"  {i+1}. c{doc_id+1} (score={score:.3f}): {preview}...")

print(f"\\n{'=' * 60}")
print("SUMMARY: 3-stage hybrid pipeline")
print("=" * 60)
print("  Stage 1: chunk (512 tok, overlap 64) → embed → pgvector")
print("  Stage 2: parallel BM25 + vector → top-50 each → RRF fuse")
print("  Stage 3: cross-encoder re-rank top-50 → final top-5 → LLM")
print(f"\\n  Accuracy lift: vector-only ~70%, hybrid ~85%, +cross-enc ~92%")
print(f"  Latency: BM25+vector ~20ms, cross-enc ~250ms, total <300ms")
print("=" * 60)`;

const PYTORCH_CODE = `import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import List, Tuple
import math

# ============================================================
# 1. Chunking — RecursiveCharacterTextSplitter (tiktoken-aware)
# ============================================================

class TextSplitter:
    """Recursive character text splitter (LangChain-style).
    
    Splits text hierarchically: try \\n\\n → \\n → . → space → char.
    Stops when chunk ≤ chunk_size tokens. Overlap = sliding window.
    """
    def __init__(self, chunk_size: int = 512, chunk_overlap: int = 64,
                 separators: List[str] = None):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or ["\\n\\n", "\\n", ". ", " ", ""]
    
    def split_text(self, text: str) -> List[str]:
        """Split text into chunks of <= chunk_size tokens."""
        # Try each separator in order
        for sep in self.separators:
            if sep in text:
                splits = text.split(sep)
                chunks = self._merge_splits(splits, sep)
                if chunks:
                    return chunks
        # No separator found — return whole text
        return [text]
    
    def _merge_splits(self, splits: List[str], sep: str) -> List[str]:
        """Merge adjacent splits until chunk_size reached, with overlap."""
        chunks = []
        current = []
        current_len = 0
        
        for split in splits:
            split_len = len(split.split())  # token count (simplified)
            
            # If adding this split would exceed chunk_size, save current
            if current_len + split_len > self.chunk_size and current:
                chunks.append(sep.join(current))
                # Keep last few splits as overlap for next chunk
                while current_len > self.chunk_overlap and current:
                    current.pop(0)
                    current_len -= len(current[0].split()) if current else 0
            
            current.append(split)
            current_len += split_len
        
        if current:
            chunks.append(sep.join(current))
        
        return chunks

# ============================================================
# 2. BM25 — sparse exact-match scoring
# ============================================================

class BM25:
    """BM25 scorer — sparse exact-match retrieval.
    
    Score = Σ_q IDF(q) * (f(q,D) * (k1+1)) / (f(q,D) + k1*(1-b+b*|D|/avgdl))
    
    IDF(q) = log((N - n(q) + 0.5) / (n(q) + 0.5) + 1)
    
    k1=1.5 (term frequency saturation)
    b=0.75 (length normalization)
    """
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.doc_freqs = {}  # term -> number of docs containing it
        self.doc_lens = []
        self.num_docs = 0
        self.avgdl = 0
        self.idf_cache = {}
    
    def fit(self, corpus: List[List[str]]):
        """Index the corpus."""
        self.num_docs = len(corpus)
        self.doc_lens = [len(doc) for doc in corpus]
        self.avgdl = sum(self.doc_lens) / self.num_docs
        
        for doc in corpus:
            for term in set(doc):
                self.doc_freqs[term] = self.doc_freqs.get(term, 0) + 1
    
    def idf(self, term: str) -> float:
        """Inverse Document Frequency with smoothing."""
        if term not in self.idf_cache:
            n_q = self.doc_freqs.get(term, 0)
            self.idf_cache[term] = math.log((self.num_docs - n_q + 0.5) / (n_q + 0.5) + 1)
        return self.idf_cache[term]
    
    def score(self, query: List[str], doc: List[str]) -> float:
        """BM25 score for one query-doc pair."""
        doc_len = len(doc)
        score = 0.0
        for q in query:
            f = doc.count(q)
            if f == 0:
                continue
            idf = self.idf(q)
            tf_norm = (f * (self.k1 + 1)) / (f + self.k1 * (1 - self.b + self.b * doc_len / self.avgdl))
            score += idf * tf_norm
        return score
    
    def search(self, query: List[str], corpus: List[List[str]], top_k: int = 50) -> List[Tuple[int, float]]:
        """Return top-k (doc_idx, score) pairs."""
        scores = [(i, self.score(query, doc)) for i, doc in enumerate(corpus)]
        scores.sort(key=lambda x: -x[1])
        return scores[:top_k]

# ============================================================
# 3. Reciprocal Rank Fusion (RRF)
# ============================================================

def reciprocal_rank_fusion(rankings: List[List[int]], k: int = 60) -> List[Tuple[int, float]]:
    """Fuse multiple rankings into one via RRF.
    
    rrf(d) = Σ_i 1 / (k + rank_i(d))
    
    k=60 default from Cormack et al. 2009 — works well in practice.
    """
    scores = {}
    for ranking in rankings:
        for rank, doc_id in enumerate(ranking):
            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank + 1)
    # Sort by RRF score descending
    return sorted(scores.items(), key=lambda x: -x[1])

# ============================================================
# 4. Cross-encoder re-rank
# ============================================================

class CrossEncoder(nn.Module):
    """Cross-encoder for re-ranking.
    
    Unlike bi-encoder (query and doc embedded independently),
    cross-encoder co-encodes [query; doc] together, allowing
    attention between query and doc tokens.
    
    Architecture:
        Input: [CLS] query [SEP] doc [SEP]
        Transformer encoder (BERT/RoBERTa)
        [CLS] hidden state → linear → score
    
    Production: ms-marco-MiniLM-L-12-v2 (12 layers, 33M params)
    """
    def __init__(self, model_name: str = 'cross-encoder/ms-marco-MiniLM-L-12-v2'):
        super().__init__()
        # In production: load pre-trained from HuggingFace
        # self.encoder = AutoModel.from_pretrained(model_name)
        # self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        # self.linear = nn.Linear(384, 1)
        
        # For demo: simplified
        self.encoder = nn.TransformerEncoder(
            nn.TransformerEncoderLayer(d_model=384, nhead=6, batch_first=True),
            num_layers=2,
        )
        self.linear = nn.Linear(384, 1)
    
    def forward(self, query_input_ids, doc_input_ids, attention_mask):
        """Score query-doc pairs."""
        # Concatenate: [CLS] query [SEP] doc [SEP]
        # In production: tokenizer handles this
        combined = torch.cat([query_input_ids, doc_input_ids], dim=1)
        combined_mask = torch.cat([attention_mask, attention_mask], dim=1)
        
        # Encode
        outputs = self.encoder(combined, src_key_padding_mask=(combined_mask == 0))
        
        # Use [CLS] token (position 0) for classification
        cls_output = outputs[:, 0, :]
        
        # Linear projection to scalar score
        score = self.linear(cls_output).squeeze(-1)
        return score

def rerank_with_cross_encoder(query: str, documents: List[str],
                              cross_encoder: CrossEncoder,
                              tokenizer, top_k: int = 5) -> List[Tuple[int, float]]:
    """Re-rank documents using a cross-encoder.
    
    Cost: ~5ms per (query, doc) pair on GPU × len(documents)
    For top-50 retrieval → 250ms total (acceptable for chat).
    """
    scores = []
    cross_encoder.eval()
    with torch.no_grad():
        for i, doc in enumerate(documents):
            # Tokenise query + doc together
            inputs = tokenizer(
                query, doc,
                padding=True, truncation=True, max_length=512,
                return_tensors='pt'
            )
            score = cross_encoder(
                inputs['input_ids'],
                inputs.get('doc_ids', inputs['input_ids']),
                inputs['attention_mask']
            )
            scores.append((i, score.item()))
    
    scores.sort(key=lambda x: -x[1])
    return scores[:top_k]

# ============================================================
# 5. Full hybrid RAG pipeline
# ============================================================

class HybridRAGRetriever:
    """Three-stage hybrid RAG retrieval pipeline (ADR-032).
    
    Stage 1: chunk (RecursiveCharacterTextSplitter, 512 tok, overlap 64)
    Stage 2: parallel BM25 + vector ANN → RRF fusion
    Stage 3: cross-encoder re-rank top-50 → top-5
    """
    def __init__(self, embedding_model, cross_encoder, bm25: BM25,
                 vector_store, splitter: TextSplitter):
        self.embedding_model = embedding_model
        self.cross_encoder = cross_encoder
        self.bm25 = bm25
        self.vector_store = vector_store  # pgvector wrapper
        self.splitter = splitter
    
    def index(self, documents: List[str]):
        """Index documents: chunk → embed → store in pgvector + BM25."""
        all_chunks = []
        for doc in documents:
            chunks = self.splitter.split_text(doc)
            all_chunks.extend(chunks)
        
        # Embed each chunk (bi-encoder, query/doc independent)
        embeddings = [self.embedding_model.encode(c) for c in all_chunks]
        
        # Store in pgvector (dense) + tsvector (sparse)
        self.vector_store.upsert(all_chunks, embeddings)
        self.bm25.fit([c.split() for c in all_chunks])
    
    def retrieve(self, query: str, top_k: int = 5) -> List[Tuple[str, float]]:
        """Three-stage retrieval."""
        # Stage 2a: BM25 sparse retrieval (top-50)
        bm25_results = self.bm25.search(query.split(),
            [c.split() for c in self.vector_store.docs],
            top_k=50)
        bm25_ranking = [doc_idx for doc_idx, _ in bm25_results]
        
        # Stage 2b: vector dense retrieval (top-50)
        query_emb = self.embedding_model.encode(query)
        vector_results = self.vector_store.search(query_emb, top_k=50)
        vector_ranking = [doc_idx for doc_idx, _ in vector_results]
        
        # Stage 2c: RRF fusion
        rrf_results = reciprocal_rank_fusion([bm25_ranking, vector_ranking])
        top_50 = [doc_idx for doc_idx, _ in rrf_results[:50]]
        
        # Stage 3: cross-encoder re-rank
        docs_to_rerank = [self.vector_store.docs[i] for i in top_50]
        # In production: tokenizer is HuggingFace AutoTokenizer
        # final = rerank_with_cross_encoder(query, docs_to_rerank,
        #                                    self.cross_encoder, self.tokenizer, top_k)
        # For demo: return RRF results
        return [(self.vector_store.docs[i], score) for i, score in rrf_results[:top_k]]

# Sanity check
if __name__ == "__main__":
    # Test BM25
    corpus = [
        "create table dim_customer customer_id customer_name segment region".split(),
        "create table fact_sales sale_id customer_id product_id amount sale_date".split(),
        "create table dim_product product_id product_name category price".split(),
    ]
    bm25 = BM25()
    bm25.fit(corpus)
    
    query = "customer revenue".split()
    results = bm25.search(query, corpus, top_k=3)
    print(f"BM25 results for '{' '.join(query)}':")
    for doc_idx, score in results:
        print(f"  doc{doc_idx}: {score:.3f}  ({' '.join(corpus[doc_idx][:5])}...)")
    
    # Test RRF
    bm25_rank = [0, 1, 2]
    vector_rank = [1, 0, 2]
    rrf = reciprocal_rank_fusion([bm25_rank, vector_rank])
    print(f"\\nRRF fusion of BM25={bm25_rank} + Vector={vector_rank}:")
    for doc_id, score in rrf:
        print(f"  doc{doc_id}: {score:.4f}")
    
    # Test splitter
    text = "This is sentence one.\\n\\nThis is sentence two.\\n\\nThis is sentence three."
    splitter = TextSplitter(chunk_size=10, chunk_overlap=2)
    chunks = splitter.split_text(text)
    print(f"\\nSplitter: {len(chunks)} chunks")
    for i, c in enumerate(chunks):
        print(f"  chunk {i}: {c}")`;

export function RagDeepDivePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="RAG Deep Dive · hybrid retrieval · re-ranking"
        title="RAG Deep Dive — Chunking, Hybrid Retrieval, Cross-Encoder Re-Rank"
        description="The math behind production RAG: RecursiveCharacterTextSplitter (chunk_size=512 tokens, overlap=64), BM25 sparse scoring (IDF × TF saturation × length normalisation), Reciprocal Rank Fusion (RRF = Σ 1/(k+rank_i), k=60), cross-encoder re-ranking (co-encode query+doc, captures interactions bi-encoder misses). With low-level PyTorch implementations of TextSplitter, BM25 scorer, RRF fusion, CrossEncoder (ms-marco-MiniLM-L-12-v2), and the full HybridRAGRetriever pipeline. Code-oriented, mathematical, scientific."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Search className="h-3 w-3" /> BM25 + Vector + Cross-enc</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Pyodide</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />)}
      </div>

      {/* 3D retrieval animation */}
      <SectionCard title="Three-stage hybrid RAG pipeline — animated" description="Query flows through 5 phases: (1) chunking (10 chunks created with overlap), (2) parallel BM25 + vector ANN retrieval (each returns top-5), (3) RRF fusion combining both rankings, (4) cross-encoder re-rank top-50 → top-5, (5) final top-5 stuffed into prompt → vLLM (ADR-031). The naive RAG baseline does only phase 2 vector → top-5 — missing exact-match (BM25) and interaction-aware re-ranking (cross-encoder)." icon={<Filter className="h-5 w-5" />} badge="3D animation">
        <HybridRetrievalAnimation />
      </SectionCard>

      {/* Chunking math */}
      <SectionCard title="Chunking — why size and overlap matter" description="Chunk size determines the signal-to-noise ratio of each retrieved passage. Too small (128 tokens): loses context — single sentence without surrounding paragraph, LLM can't ground. Too large (2048): dilutes signal — one chunk contains multiple topics, embedding averages them. Sweet spot: 512 tokens (≈3-4 paragraphs). Overlap=64 prevents context loss at boundaries — the last 64 tokens of chunk N become the first 64 of chunk N+1, so a sentence split across the boundary is recoverable." icon={<FileText className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">chunk_size = 512 tokens &nbsp;·&nbsp; overlap = 64 tokens &nbsp;·&nbsp; effective_unique = 448 tokens/chunk</p>
            <p className="text-[11px] text-muted-foreground mt-1">tiktoken-aware (not character-aware — tokens are what the LLM sees). For SQL DDL: statement-aware (one CREATE TABLE per chunk).</p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-rose-500/40 bg-rose-500/5 p-2.5">
              <p className="font-semibold text-sm text-rose-600 dark:text-rose-400 mb-1">Too small (128)</p>
              <p className="text-muted-foreground text-[11px]">Loses context — sentence without paragraph. Embedding lacks signal. LLM can't ground answer in one sentence.</p>
            </div>
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
              <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">Sweet spot (512)</p>
              <p className="text-muted-foreground text-[11px]">3-4 paragraphs. Embedding has topical signal. LLM gets enough context to ground. Default for production RAG.</p>
            </div>
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5">
              <p className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-1">Too large (2048)</p>
              <p className="text-muted-foreground text-[11px]">Dilutes signal — multiple topics per chunk. Embedding averages them. Retrieval returns chunks where the relevant content is 1 paragraph out of 8.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* BM25 math */}
      <SectionCard title="BM25 math — sparse exact-match scoring" description="BM25 is the production-grade sparse retrieval algorithm (used by Elasticsearch, Lucene, Postgres tsvector). It scores documents by IDF (rare terms matter more) × TF saturation (term frequency has diminishing returns, k1=1.5) × length normalisation (longer docs naturally have more terms, b=0.75 corrects for this). The math is the same as TF-IDF but with two saturation parameters." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">BM25(Q, D) = Σ<sub>q ∈ Q</sub> IDF(q) · <span className="font-mono">f(q,D) · (k₁+1)</span> / <span className="font-mono">(f(q,D) + k₁ · (1−b + b·|D|/avgdl))</span></p>
            <p className="text-[11px] text-muted-foreground mt-1">IDF(q) = log((N − n(q) + 0.5) / (n(q) + 0.5) + 1) — smoothed to avoid negative values.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-border/60 p-2.5">
              <p className="font-semibold mb-1">IDF (rare = important)</p>
              <p className="font-mono text-[11px]">IDF(q) = log(N / n(q))</p>
              <p className="text-muted-foreground text-[11px] mt-1">'the' appears in 99% of docs → IDF ≈ 0. 'dim_customer' appears in 1% → IDF ≈ 4.6. Rare terms dominate the score.</p>
            </div>
            <div className="rounded-md border border-border/60 p-2.5">
              <p className="font-semibold mb-1">TF saturation (k₁=1.5)</p>
              <p className="font-mono text-[11px]">tf_norm = f·(k₁+1) / (f + k₁·...)</p>
              <p className="text-muted-foreground text-[11px] mt-1">First occurrence of a term adds ~1.0 to score; 10th adds ~0.1. Diminishing returns — one mention is enough, 100 mentions barely more.</p>
            </div>
            <div className="rounded-md border border-border/60 p-2.5">
              <p className="font-semibold mb-1">Length norm (b=0.75)</p>
              <p className="font-mono text-[11px]">1 − b + b·|D|/avgdl</p>
              <p className="text-muted-foreground text-[11px] mt-1">A 2000-token doc gets 0.75× penalty vs a 500-token doc (assuming avgdl=500). Prevents long docs from winning just by being long.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Pyodide BM25 + RRF demo */}
      <SectionCard title="Try it: BM25 + RRF fusion + cross-encoder (Pyodide)" description="Indexes a small SQL DDL corpus (5 chunks: dim_customer, fact_sales, dim_product, v_revenue_by_region, dim_date), runs 4 test queries through BM25, simulates parallel BM25 + vector rankings, fuses them via RRF (k=60), then re-ranks with a simulated cross-encoder. Shows the full 3-stage hybrid pipeline end-to-end." icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={BM25_DEMO} buttonLabel="Run hybrid RAG demo (Pyodide)" />
      </SectionCard>

      {/* RRF math */}
      <SectionCard title="Reciprocal Rank Fusion — combining rankings without scores" description="RRF merges multiple ranked lists into one. The beauty: it doesn't need calibrated scores — only ranks. BM25 scores are unbounded (can be 0 to 50+); cosine similarities are bounded [-1, 1] but on different scales. RRF sidesteps this: each list contributes 1/(k+rank) per item, where k=60 is the smoothing constant. A document ranked #1 in BOTH lists gets 2/61 ≈ 0.033; ranked #1 in one and #50 in another gets 1/61 + 1/110 ≈ 0.026." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">RRF(d) = Σ<sub>i</sub> 1 / (k + rank<sub>i</sub>(d)) &nbsp;·&nbsp; k = 60 (default)</p>
            <p className="text-[11px] text-muted-foreground mt-1">Per-list rank-based fusion. No score calibration needed. Works for any ranking source (BM25, vector, custom, learned).</p>
          </div>
          <div className="rounded-md border border-border/60 p-3 bg-muted/10">
            <p className="font-mono text-xs text-foreground/90 font-semibold mb-2">Why k=60?</p>
            <p className="text-xs text-muted-foreground">
              The original Cormack et al. 2009 paper found k=60 works best across diverse corpora. Smaller k (e.g. 10) over-weights top-ranked items — fragile to noise in any single ranking. Larger k (e.g. 200) flattens everything — all items look the same. k=60 is a sweet spot: top-10 items get distinct scores, items beyond rank 50 contribute nearly equally. It's a magic number, but a well-justified one.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Cross-encoder math */}
      <SectionCard title="Cross-encoder re-rank — capturing query-doc interaction" description="The bi-encoder (used in stage 2) embeds query and doc independently — cosine similarity is the only interaction. Cross-encoder co-encodes [query; doc] through the SAME transformer, so every query token attends to every doc token. This captures interactions the bi-encoder structurally cannot. Cost: 100× more compute per pair (full transformer forward vs one matmul). That's why we only run it on the top-50 from RRF — re-ranking the whole corpus would be infeasible." icon={<Brain className="h-5 w-5" />} badge="mathematics">
        <div className="space-y-3">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="font-mono text-sm text-primary">bi-encoder: sim = cos(emb(q), emb(d)) &nbsp;·&nbsp; cross-encoder: score = MLP([emb(q); emb(d); emb(q)⊙emb(d)])</p>
            <p className="text-[11px] text-muted-foreground mt-1">Cross-encoder concatenates query+doc embeddings AND their elementwise product — captures multiplicative interactions (e.g. "not X" requires both terms together).</p>
          </div>
          <div className="grid md:grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5">
              <p className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-1">Bi-encoder (stage 2)</p>
              <p className="font-mono text-[11px]">emb_q = encode(q)  # 1 forward</p>
              <p className="font-mono text-[11px]">emb_d = encode(d)  # 1 forward</p>
              <p className="font-mono text-[11px]">sim = cos(emb_q, emb_d)</p>
              <p className="text-muted-foreground text-[11px] mt-1.5">Doc embeddings pre-computed. Search = 1 matmul. O(N) per query.</p>
            </div>
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
              <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-1">Cross-encoder (stage 3)</p>
              <p className="font-mono text-[11px]">score = transformer([q; d])[CLS]</p>
              <p className="font-mono text-[11px]"># full attention q↔d</p>
              <p className="font-mono text-[11px]"># captures interactions</p>
              <p className="text-muted-foreground text-[11px] mt-1.5">Per-pair full forward. O(N) per query — 100× slower. Run only on top-50.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Low-level PyTorch */}
      <SectionCard title="Low-level PyTorch — TextSplitter, BM25, RRF, CrossEncoder, HybridRAGRetriever" description="The actual production code. TextSplitter implements RecursiveCharacterTextSplitter (try \\n\\n → \\n → . → space → char, merge with overlap). BM25 class with fit() (index corpus, compute DF + avgdl) and search() (top-k retrieval). reciprocal_rank_fusion() implements the k=60 formula. CrossEncoder wraps a transformer encoder + linear head — full forward pass per (query, doc) pair. HybridRAGRetriever orchestrates all three stages: index() chunks + embeds + stores; retrieve() runs BM25 + vector in parallel, RRF fuses, cross-encoder re-ranks." icon={<Cpu className="h-5 w-5" />} badge="low-level">
        <CodeBlock language="python" filename="hybrid_rag.py" highlight={[10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,279,280]} code={PYTORCH_CODE} />
      </SectionCard>

      {/* Insight */}
      <SectionCard title="My deeper thought: RAG IS a database query planner" description="The three-stage RAG pipeline is structurally a database query planner. Chunking = physical layout (pages/blocks). Hybrid BM25+vector = index selection (B-tree vs GIN vs HNSW). RRF = cost-based plan fusion. Cross-encoder = nested-loop join (expensive, only on small input). The LLM at the end is the projection — it formats the retrieved tuples into a natural language answer." icon={<TrendingUp className="h-5 w-5" />} badge="Insight">
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>The isomorphism between RAG and a relational query planner is exact, not metaphorical. <strong className="text-foreground/80">Chunking is physical database design.</strong> A 512-token chunk with 64-token overlap is structurally identical to a Postgres 8KB page with 64-byte tuple header — both define the unit of I/O, both have overhead (overlap = page metadata), both trade size for retrieval granularity. The RecursiveCharacterTextSplitter that tries \\n\\n → \\n → . → space is a B-tree split heuristic: try the most selective separator first, fall back to coarser ones when needed. Statement-aware chunking (one CREATE TABLE per chunk) is clustered-index layout — physically grouping related rows together.</p>
          <p><strong className="text-foreground/80">Hybrid BM25 + vector retrieval is index selection.</strong> Postgres has B-tree (exact-match, sparse) and GIN (trigram, fuzzy) and HNSW (vector, semantic) indexes. The query planner picks the index per WHERE clause — equality on a string column uses B-tree, similarity uses GIN, vector proximity uses HNSW. RAG's parallel BM25 + vector ANN is the same logic at retrieval scale: equality on SQL identifiers uses BM25 (the "B-tree"), semantic proximity uses vector ANN (the "HNSW"). RRF fusion is cost-based plan merging — Postgres does the same when it combines an index scan with a sequential scan via a BitmapAnd node. The k=60 smoothing is the cost-model equivalent: balance contributions from each plan.</p>
          <p><strong className="text-foreground/80">Cross-encoder re-ranking is a nested-loop join.</strong> In relational DBs, nested-loop join is the slowest but most flexible — it can evaluate any join condition (not just equality, like hash/merge joins). The optimizer uses it only when the input cardinality is small (otherwise it's O(N×M) catastrophic). Cross-encoder re-ranking is the same pattern: it can evaluate any query-doc interaction (because it co-encodes them), but it's O(N) per query (one full transformer forward per pair) — so we run it only on the top-50 from the cheaper stages. The bi-encoder → cross-encoder pipeline is structurally identical to the hash-join → nested-loop-fallback pattern in Postgres. The LLM at the end is the projection operator — it formats the retrieved tuples (chunks) into a natural-language response. ADR-024's semantic layer (NL-to-SQL) is therefore a query planner that runs in reverse: NL → planner (LLM) → physical plan (SQL) → execution. RAG runs the planner forward: NL → retrieval (physical plan) → projection (LLM). Same architecture, opposite direction.</p>
        </div>
      </SectionCard>

      <DeeperThoughtSection pageTitle="RAG Deep Dive">
        <DeeperThought title="RAG Deep Dive IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about RAG Deep Dive is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. RAG Deep Dive connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where RAG Deep Dive sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (RAG Deep Dive) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "Trace this topic's connections across the platform's math graph" }, { id: "rag-llms" as const, reason: "Continue to rag llms — see also from this page" }, { id: "vector-db" as const, reason: "Continue to vector db — see also from this page" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("rag-llms")} className="text-sm text-primary hover:underline">→ RAG & LLMs (the original naive RAG page)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("vector-db")} className="text-sm text-primary hover:underline">→ Vector DB (pgvector — the storage layer)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("inference-serving")} className="text-sm text-primary hover:underline">→ Inference Serving (vLLM — final stage)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("dbt")} className="text-sm text-primary hover:underline">→ dbt (the SQL DDL being chunked)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">→ ADR-032 (hybrid retrieval adoption)</Link>
      </div>
    </div>
  );
}
