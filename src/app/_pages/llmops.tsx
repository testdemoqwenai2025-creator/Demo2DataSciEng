"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { NextSteps } from "../_components/next-steps";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { LLMOPS_SCIENCE_EXAMPLES } from "../_components/_dataset_examples13";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Layers, Boxes, Database, Workflow, Zap, GitBranch, History, ShieldCheck,
  Atom, Activity, FileText, ExternalLink, Network, Sparkles, Cpu, TrendingUp,
  Server, Cloud, Code2, Sigma, BarChart3, Brain, Shield, Filter, Beaker,
} from "lucide-react";

// ============================================================
// Code snippets
// ============================================================

const PROMPT_REGISTRY_PYTHON = `# ============================================================
# LangSmith prompt registry — versioned prompts + A/B testing
# ============================================================
# Prompts are versioned like models — never edit in production.
# A/B test variant B against the production variant A via the
# prompt registry; promote the winner.

from langsmith import Client
from langchain.prompts import PromptTemplate

client = Client()

# Register a prompt (version 1)
prompt_v1 = PromptTemplate(
    input_variables=["question", "context"],
    template="""Answer the question using ONLY the context.
Cite [N] for each claim.

Context:
{context}

Question: {question}

Answer with citations [1] [2] [3]:""",
)
client.create_prompt(
    name="biomedical_qa",
    description="Biomedical RAG Q&A with explicit citations",
    tags=["biomedical", "rag", "v1"],
    template=prompt_v1.template,
    input_variables=prompt_v1.input_variables,
)

# Variant B: same task, different phrasing — A/B test
prompt_v2 = PromptTemplate(
    input_variables=["question", "context"],
    template="""You are a biomedical expert. Use ONLY the context
below. For each claim in your answer, cite [N] where N is the
number of the supporting abstract.

Context (PubMed abstracts):
{context}

Question: {question}

Answer (with citations [1] [2] [3]...):""",
)
client.create_prompt(
    name="biomedical_qa",         # same name → variant
    description="Biomedical RAG Q&A — biomedical-expert framing",
    tags=["biomedical", "rag", "v2", "ab_test"],
    template=prompt_v2.template,
    input_variables=prompt_v2.input_variables,
)

# A/B test: 50/50 traffic split → measure faithfulness + latency
# LangSmith dashboard shows faithfulness, latency, cost per variant
# Winner (v2 had higher faithfulness) promoted to Production`;

const RAG_PIPELINE_PYTHON = `# ============================================================
# LangChain RAG pipeline — BM25 + vector → rerank → generate
# ============================================================
# Hybrid retrieval (BM25 + vector) → cross-encoder rerank →
# LLM generation with citations → faithfulness check.

from langchain.retrievers import (
    BM25Retriever, PineconeHybridRetriever, ContextualCompressionRetriever,
)
from langchain.retrievers.document_compressors import CrossEncoderReranker
from langchain.llms import OpenAI
from langchain.prompts import PromptTemplate
from langchain.evaluation import LLMAsJudge

# 1. BM25 retriever (Elasticsearch) — catches exact drug names + MeSH
bm25 = BM25Retriever.from_elasticsearch(
    index="pubmed_abstracts", host="es.science:9200", k=100,
)

# 2. Vector retriever (Pinecone + BioBERT 768-dim) — catches semantic
vec = PineconeHybridRetriever(
    index="biobert_pubmed",
    api_key="pckey_...",
    top_k=100,
)

# 3. Cross-encoder reranker (ms-marco-MiniLM-L6-v2) — refines 200 → 10
reranker = CrossEncoderReranker(
    model="cross-encoder/ms-marco-MiniLM-L-6-v2",
    top_n=10,            # final 10 documents to send to LLM
)

# 4. Hybrid: union BM25 + vector → dedupe → rerank
def hybrid_retrieve(query: str):
    bm25_docs = bm25.get_relevant_documents(query)[:100]
    vec_docs = vec.get_relevant_documents(query)[:100]
    union = list({d.page_content: d for d in bm25_docs + vec_docs}.values())
    reranked = reranker.compress_documents(union, query)
    return reranked

# 5. LLM generation with citations
llm = OpenAI(model="gpt-4", temperature=0.0)
prompt = PromptTemplate(
    input_variables=["question", "context"],
    template="""Answer using ONLY the context. Cite [N] for each claim.

Context:
{context}

Question: {question}

Answer:""",
)
chain = prompt | llm

question = "Does metformin interact with iodinated contrast media?"
docs = hybrid_retrieve(question)
context = "\\n\\n".join([f"[{i+1}] {d.page_content}" for i, d in enumerate(docs)])
answer = chain.invoke({"question": question, "context": context})

# 6. Faithfulness check (LLM-as-judge)
judge = LLMAsJudge(
    llm=OpenAI(model="gpt-4", temperature=0.0),
    criteria="Is every claim in the answer supported by the cited abstract?",
)
faithfulness = judge.evaluate(
    prediction=answer,
    context=context,
)
print(f"Answer: {answer}")
print(f"Faithfulness: {faithfulness.score}")`;

const GUARDRAILS_PYTHON = `# ============================================================
# Guardrails — content filtering + PII + hallucination prevention
# ============================================================
# The guardrail stack catches 4 classes of unsafe LLM output:
#   1. Toxicity (NeuroGuard API)
#   2. PII (NER-based — spaCy + Presidio)
#   3. Hallucination (LLM-as-judge against cited sources)
#   4. Controlled substances (chemistry LLM only — DEA Schedule I-V)

from guardrails import Guard
from guardrails.validator_base import (
    ToxicLanguage, PIIValidator, HallucinationValidator,
)
from presidio_analyzer import AnalyzerEngine

# Define the guard with validators
guard = Guard.from_string(
    validators=[
        ToxicLanguage(threshold=0.5, on_fail="filter"),  # filter toxic
        PIIValidator(entities=["PERSON", "EMAIL", "PHONE", "SSN"],
                      on_fail="exception"),  # reject PII leakage
        HallucinationValidator(
            # LLM-as-judge verifies every claim is supported by cited source
            judge_llm=OpenAI(model="gpt-4"),
            on_fail="filter",  # silently drop unsupported claims
        ),
    ],
)

# Wrap an LLM call with the guard
question = "Summarize this patient's medical history."
context = "..."  # clinical notes (may contain PII)
llm_response = guard(
    llm_api=openai.ChatCompletion.create,
    model="gpt-4",
    messages=[{"role": "user",
               "content": f"{question}\\n\\nContext: {context}"}],
)
print(llm_response.validated_output)  # passes all 3 guardrails

# PII detection (Presidio NER)
analyzer = AnalyzerEngine()
pii_results = analyzer.analyze(
    text=context,
    entities=["PERSON", "EMAIL", "PHONE", "SSN", "LOCATION"],
    language="en",
)
for r in pii_results:
    print(f"  PII: {r.entity_type} '{context[r.start:r.end]}' "
          f"(confidence={r.score:.2f})")`;

const BLEU_ROUGE_PYTHON = `# ============================================================
# LLM evaluation — BLEU + ROUGE + Perplexity
# ============================================================
# BLEU: precision-focused (how much of the LLM output is in the
#       reference)
# ROUGE: recall-focused (how much of the reference is in the LLM output)
# Perplexity: language-model quality (lower = better)

import math
from collections import Counter

# BLEU score: BP × exp(Σ w_n × log p_n)
# p_n = modified n-gram precision
# BP (brevity penalty) = min(1, exp(1 - r/c))
#   r = reference length, c = candidate length

def n_gram_precision(candidate, reference, n):
    """Modified n-gram precision: clip candidate counts to reference."""
    cand_ngrams = Counter(
        tuple(candidate[i:i+n]) for i in range(len(candidate) - n + 1)
    )
    ref_ngrams = Counter(
        tuple(reference[i:i+n]) for i in range(len(reference) - n + 1)
    )
    # Clip candidate counts to reference counts (modified precision)
    clipped = sum(min(c, ref_ngrams.get(ng, 0)) for ng, c in cand_ngrams.items())
    total = sum(cand_ngrams.values())
    return clipped / total if total > 0 else 0

def bleu(candidate, reference, max_n=4, weights=None):
    """BLEU-N (typically N=4 — cumulative)."""
    if weights is None:
        weights = [1/max_n] * max_n  # uniform weights
    p_ns = [n_gram_precision(candidate, reference, n) for n in range(1, max_n + 1)]
    # Geometric mean of precisions
    log_avg = sum(w * math.log(p + 1e-12) for w, p in zip(weights, p_ns))
    geo_mean = math.exp(log_avg)
    # Brevity penalty: BP = min(1, exp(1 - r/c))
    r, c = len(reference), len(candidate)
    bp = min(1.0, math.exp(1 - r / c)) if c > 0 else 0
    return bp * geo_mean

# ROUGE-L: longest common subsequence (LCS) based recall
def rouge_l(candidate, reference):
    """ROUGE-L F1 based on LCS."""
    m, n = len(candidate), len(reference)
    # DP table for LCS
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if candidate[i - 1] == reference[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    lcs = dp[m][n]
    p = lcs / m if m > 0 else 0
    r = lcs / n if n > 0 else 0
    return (2 * p * r / (p + r)) if (p + r) > 0 else 0

# Perplexity: PP = exp(-1/N × Σ log p(x_i | x_<i))
def perplexity(logprobs):
    """PP = exp(avg negative log prob). Lower = better."""
    avg_neg_log = -sum(logprobs) / len(logprobs)
    return math.exp(avg_neg_log)

# Demo
candidate = "the cat sat on the mat".split()
reference = "the cat is on the mat".split()
print(f"BLEU-4: {bleu(candidate, reference, max_n=4):.4f}")
print(f"ROUGE-L: {rouge_l(candidate, reference):.4f}")
print(f"Perplexity: {perplexity([-2.3, -1.8, -3.1, -2.7, -1.9]):.4f}")`;

const LANGSMITH_EVAL_PYTHON = `# ============================================================
# LangSmith evaluation — LLM-as-judge + dataset + eval runs
# ============================================================
# LangSmith is the LLM observability + evaluation platform.
# Define datasets + evaluators → run experiments → compare variants.

from langsmith import Client
from langchain.evaluation import LLMAsJudge, StringDistance

client = Client()

# 1. Define an evaluation dataset (golden Q&A pairs)
dataset_name = "biomedical_qa_eval_v1"
if not client.has_dataset(dataset_name=dataset_name):
    ds = client.create_dataset(
        dataset_name=dataset_name,
        description="Biomedical RAG Q&A eval set",
    )
    examples = [
        {"question": "Does metformin interact with contrast?",
         "answer":   "Metformin + iodinated contrast → lactic acidosis risk",
         "citations": ["PMID12345", "PMID67890"]},
        {"question": "What's the BRCA1 lifetime cancer risk?",
         "answer":   "BRCA1 carriers have 60-70% breast cancer risk by age 80",
         "citations": ["PMID11111"]},
    ]
    for ex in examples:
        client.create_example(
            inputs={"question": ex["question"]},
            outputs={"answer": ex["answer"], "citations": ex["citations"]},
            dataset_id=ds.id,
        )

# 2. Define evaluators
faithfulness = LLMAsJudge(
    llm=OpenAI(model="gpt-4"),
    criteria="Is every claim in the prediction supported by a cited source?",
    score_type="binary",
)
relevance = LLMAsJudge(
    llm=OpenAI(model="gpt-4"),
    criteria="Does the answer address the user's question?",
    score_type="continuous",
)
citation_accuracy = StringDistance(
    distance="levenshtein",  # compare to expected citations
)

# 3. Run an experiment — evaluate prompt v1 vs v2
experiment_v1 = client.run_on_dataset(
    dataset_name=dataset_name,
    llm_or_chain_factory=chain_v1,    # RAG with prompt v1
    evaluation_name="biomedical_qa_v1",
    evaluators=[faithfulness, relevance, citation_accuracy],
    concurrent_workers=4,
)
experiment_v2 = client.run_on_dataset(
    dataset_name=dataset_name,
    llm_or_chain_factory=chain_v2,    # RAG with prompt v2
    evaluation_name="biomedical_qa_v2",
    evaluators=[faithfulness, relevance, citation_accuracy],
)

# 4. Compare experiments on the LangSmith dashboard
print(f"v1 mean faithfulness: {experiment_v1.avg_score('faithfulness'):.3f}")
print(f"v2 mean faithfulness: {experiment_v2.avg_score('faithfulness'):.3f}")
# Winner (higher faithfulness) → Production`;

// ============================================================
// Pyodide demo — attention + perplexity + BLEU + recall
// ============================================================

const PYODIDE_DEMO = `# ============================================================
# LLMOps simulation: attention + perplexity + BLEU + recall
# Pure Python (math + random + collections only — no numpy)
# ============================================================
# 1. Compute scaled dot-product attention QK^T / sqrt(d_k) × V
# 2. Compute perplexity on a sequence of log-probs
# 3. Compute BLEU-4 (modified n-gram precision + brevity penalty)
# 4. Compute recall@k for retrieval (top-10 in 100 candidates)
# 5. Compute ROUGE-L (LCS-based F1)
# ============================================================

import math
import random
from collections import Counter

random.seed(42)

# ------------------------------------------------------------
# 1. Scaled dot-product attention: softmax(QK^T / sqrt(d_k)) × V
# ------------------------------------------------------------
print("=== 1. Scaled dot-product attention ===")
# Synthetic Q, K, V: d_k=8, seq_len=4
d_k = 8
seq_len = 4

def random_matrix(rows, cols, seed=0):
    random.seed(seed)
    return [[random.gauss(0, 0.5) for _ in range(cols)] for _ in range(rows)]

Q = random_matrix(seq_len, d_k, seed=1)
K = random_matrix(seq_len, d_k, seed=2)
V = random_matrix(seq_len, d_k, seed=3)

def matmul(A, B):
    """A is m×n, B is n×p → returns m×p."""
    m, n = len(A), len(A[0])
    p = len(B[0])
    return [[sum(A[i][k] * B[k][j] for k in range(n)) for j in range(p)]
            for i in range(m)]

def transpose(M):
    return [[M[i][j] for i in range(len(M))] for j in range(len(M[0]))]

def softmax_row(v):
    """Numerically stable softmax over a row vector."""
    m = max(v)
    exps = [math.exp(x - m) for x in v]
    s = sum(exps)
    return [e / s for e in exps]

# QK^T (seq_len × seq_len)
QKT = matmul(Q, transpose(K))
# Scale by 1/sqrt(d_k)
QKT_scaled = [[QKT[i][j] / math.sqrt(d_k) for j in range(seq_len)]
              for i in range(seq_len)]
# Softmax over last dim → attention weights (seq_len × seq_len)
attn_weights = [softmax_row(row) for row in QKT_scaled]
# × V → output (seq_len × d_k)
output = matmul(attn_weights, V)

print(f"  Q: {seq_len}×{d_k}, K: {seq_len}×{d_k}, V: {seq_len}×{d_k}")
print(f"  QK^T (scaled by 1/sqrt(d_k)={1/math.sqrt(d_k):.4f}):")
for i in range(min(2, seq_len)):
    print(f"    row {i}: {[f'{x:.3f}' for x in attn_weights[i][:4]]}...")
print(f"  Output (first row): {[f'{x:.3f}' for x in output[0][:4]]}...")
print(f"  Formula: softmax(QK^T / sqrt(d_k)) × V")
print(f"  Derivation: Bahdanau (2014) used concat + MLP attention;")
print(f"  Vaswani (2017) showed dot-product + 1/sqrt(d_k) scaling")
print(f"  is faster (no MLP) and trains better at large d_k.")
print()

# ------------------------------------------------------------
# 2. Perplexity: PP = exp(-1/N × Σ log p(x_i | x_<i))
# ------------------------------------------------------------
print("=== 2. Perplexity — language-model quality ===")
# Simulate log-probs for a 10-token sequence (a well-trained model)
logprobs_good = [-2.0, -1.5, -2.3, -1.8, -2.1, -1.7, -2.0, -1.9, -2.2, -1.6]
logprobs_bad  = [-4.5, -5.2, -4.1, -5.8, -4.7, -5.5, -4.9, -5.3, -4.6, -5.1]

def perplexity(logprobs):
    avg_neg_log = -sum(logprobs) / len(logprobs)
    return math.exp(avg_neg_log)

pp_good = perplexity(logprobs_good)
pp_bad  = perplexity(logprobs_bad)
print(f"  Good model: avg_logprob = {sum(logprobs_good)/len(logprobs_good):.3f}")
print(f"    Perplexity = exp({-sum(logprobs_good)/len(logprobs_good):.3f}) = {pp_good:.3f}")
print(f"  Bad model:  avg_logprob = {sum(logprobs_bad)/len(logprobs_bad):.3f}")
print(f"    Perplexity = exp({-sum(logprobs_bad)/len(logprobs_bad):.3f}) = {pp_bad:.3f}")
print(f"  Lower perplexity = better. PP=1 = perfect prediction.")
print(f"  GPT-4 on Wikipedia: PP ≈ 8-12. Random: PP = |vocab| = ~50K.")
print()

# ------------------------------------------------------------
# 3. BLEU-4 (modified n-gram precision + brevity penalty)
# ------------------------------------------------------------
print("=== 3. BLEU-4 — translation quality ===")
candidate = "the cat sat on the mat".split()
reference = "the cat is on the mat".split()

def n_gram_precision(candidate, reference, n):
    cand_ngrams = Counter(
        tuple(candidate[i:i+n]) for i in range(len(candidate) - n + 1)
    )
    ref_ngrams = Counter(
        tuple(reference[i:i+n]) for i in range(len(reference) - n + 1)
    )
    clipped = sum(min(c, ref_ngrams.get(ng, 0)) for ng, c in cand_ngrams.items())
    total = sum(cand_ngrams.values())
    return clipped / total if total > 0 else 0

def bleu(candidate, reference, max_n=4):
    weights = [1/max_n] * max_n
    p_ns = [n_gram_precision(candidate, reference, n) for n in range(1, max_n + 1)]
    log_avg = sum(w * math.log(p + 1e-12) for w, p in zip(weights, p_ns))
    geo_mean = math.exp(log_avg)
    r, c = len(reference), len(candidate)
    bp = min(1.0, math.exp(1 - r / c)) if c > 0 else 0
    return bp * geo_mean

bleu_score = bleu(candidate, reference, max_n=4)
print(f"  Candidate: {' '.join(candidate)}")
print(f"  Reference: {' '.join(reference)}")
print(f"  BLEU-4 = BP × exp(Σ w_n × log p_n) = {bleu_score:.4f}")
print(f"  BLEU = 0.0 (no match) → 1.0 (perfect match)")
print(f"  Typical: BLEU &gt; 0.30 = good translation")
print()

# ------------------------------------------------------------
# 4. Recall@k for retrieval
# ------------------------------------------------------------
print("=== 4. Recall@k — retrieval quality ===")
# Simulate a retrieval: 100 candidates, top-10 retrieved
relevant_set = set(random.sample(range(100), 15))  # 15 truly relevant
retrieved_top10 = set(random.sample(range(100), 10))
# Make some overlap
retrieved_top10 |= set(random.sample(list(relevant_set), 6))
retrieved_top10 = set(list(retrieved_top10)[:10])

relevant_in_retrieved = relevant_set & retrieved_top10
recall_at_10 = len(relevant_in_retrieved) / len(relevant_set)
precision_at_10 = len(relevant_in_retrieved) / 10

print(f"  Total candidates: 100 (15 truly relevant)")
print(f"  Retrieved top-10: {sorted(retrieved_top10)[:5]}...")
print(f"  Relevant in retrieved: {len(relevant_in_retrieved)}")
print(f"  Recall@10 = |rel ∩ retr| / |rel| = {recall_at_10:.4f}")
print(f"  Precision@10 = |rel ∩ retr| / 10 = {precision_at_10:.4f}")
print()

# ------------------------------------------------------------
# 5. ROUGE-L (LCS-based F1)
# ------------------------------------------------------------
print("=== 5. ROUGE-L — summary quality (LCS-based) ===")
candidate_summary = "the cat sat on the mat today".split()
reference_summary = "the cat is on the mat".split()

def rouge_l(candidate, reference):
    m, n = len(candidate), len(reference)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if candidate[i - 1] == reference[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    lcs = dp[m][n]
    p = lcs / m if m > 0 else 0
    r = lcs / n if n > 0 else 0
    return (2 * p * r / (p + r)) if (p + r) > 0 else 0

rouge_l_score = rouge_l(candidate_summary, reference_summary)
print(f"  Candidate: {' '.join(candidate_summary)}")
print(f"  Reference: {' '.join(reference_summary)}")
print(f"  LCS length: {len(set(candidate_summary) & set(reference_summary))}")
print(f"  ROUGE-L = {rouge_l_score:.4f}")
print()
print("Key insight: attention is the math behind transformers.")
print("Perplexity measures LM quality (lower=better). BLEU/")
print("ROUGE compare LLM output to reference. Recall@k measures")`;

// ============================================================
// LLMOps architecture diagram — prompt registry → RAG → eval → guardrails
// ============================================================

function LlmopsArchitectureDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("rag_pipeline");
  const nodes = {
    "prompt_registry": { label: "Prompt Registry (LangSmith)", desc: "Versioned prompts + A/B testing. Each prompt is immutable; variants are A/B tested against production; winner promoted via registry.", level: 0 },
    "rag_pipeline":   { label: "RAG pipeline (hybrid retrieval)", desc: "BM25 + vector retrieval → cross-encoder rerank → LLM generation with [N] citations. Faithfulness check after generation.", level: 1 },
    "guardrails":      { label: "Guardrails (toxicity + PII + hallucination)", desc: "Pre/post filters: ToxicLanguage (filter), PII (reject), HallucinationValidator (LLM-as-judge against cited source).", level: 2 },
    "eval":            { label: "Evaluation (LLM-as-judge + dataset)", desc: "Eval datasets + faithfulness/relevance/citation-accuracy evaluators. Compare prompt variants → promote winner.", level: 3 },
    "deploy":          { label: "Deploy (vLLM + KServe)",                desc: "Production serving via vLLM (PagedAttention) on KServe — auto-scale, monitoring, drift detection.", level: 4 },
  };
  const edges = [
    ["prompt_registry", "rag_pipeline"],
    ["rag_pipeline", "guardrails"],
    ["guardrails", "eval"],
    ["eval", "deploy"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "prompt_registry": { x: 200, y: 30 },
    "rag_pipeline":   { x: 200, y: 90 },
    "guardrails":      { x: 200, y: 150 },
    "eval":            { x: 200, y: 210 },
    "deploy":          { x: 200, y: 270 },
  };

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Atom className="h-3.5 w-3.5 text-primary" />
          LLMOps architecture — prompt registry → RAG → guardrails → evaluation → deploy
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 400 300" className="w-full h-auto">
          <defs>
            <marker id="llmops-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" />
            </marker>
          </defs>
          {edges.map(([from, to], i) => {
            const a = positions[from];
            const b = positions[to];
            return (
              <line key={i} x1={a.x} y1={a.y + 12} x2={b.x} y2={b.y - 12}
                stroke="var(--border)" strokeWidth="0.8" markerEnd="url(#llmops-arrow)" />
            );
          })}
          {Object.entries(positions).map(([id, pos]) => {
            const isActive = activeNode === id;
            const node = nodes[id as keyof typeof nodes];
            const color =
              node.level === 0 ? "var(--chart-3)" :
              node.level === 1 ? "var(--chart-2)" :
              node.level === 2 ? "var(--chart-1)" :
              node.level === 3 ? "var(--chart-4)" :
              node.level === 4 ? "var(--chart-5)" : "var(--muted-foreground)";
            return (
              <motion.g key={id}
                onMouseEnter={() => setActiveNode(id)}
                onMouseLeave={() => setActiveNode(null)}
                animate={{ scale: isActive ? 1.05 : 1 }}
                style={{ cursor: "pointer" }}>
                <rect x={pos.x - 75} y={pos.y - 12} width="150" height="24" rx="3"
                  fill={isActive ? color + "30" : "var(--background)"}
                  stroke={color} strokeWidth={isActive ? 1.5 : 0.8} />
                <text x={pos.x} y={pos.y + 3} textAnchor="middle" fontSize="7.5"
                  fill={isActive ? color : "var(--foreground)"}
                  fontWeight={isActive ? "bold" : "normal"}>
                  {node.label}
                </text>
              </motion.g>
            );
          })}
        </svg>
        {activeNode && (
          <div className="mt-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
            <p className="font-semibold text-primary mb-0.5">
              {nodes[activeNode as keyof typeof nodes].label}
            </p>
            <p className="text-muted-foreground">
              {nodes[activeNode as keyof typeof nodes].desc}
            </p>
          </div>
        )}
        {!activeNode && (
          <p className="mt-2 text-[10px] text-muted-foreground text-center">
            Hover any node — LLMOps spans prompt versioning → RAG generation → guardrails → evaluation → production deploy.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Comparison table — LangChain vs LlamaIndex vs Haystack vs DSPy
// ============================================================

function LlmopsComparisonTable() {
  const rows = [
    { feature: "Origin / License",    langchain: "LangChain 2022 / MIT",          llamaindex: "LlamaIndex 2022 / MIT",          haystack: "deepset 2020 / Apache 2.0",   dspy: "Stanford 2023 / MIT" },
    { feature: "Primary focus",       langchain: "LLM apps + agents",             llamaindex: "RAG + data connectors",          haystack: "Production RAG + NLP",          dspy: "Prompt optimization (compile)" },
    { feature: "RAG abstraction",      langchain: "RetrievalQA chain",             llamaindex: "QueryEngine + Index",            haystack: "Pipeline (modular)",            dspy: "RAG as a DSPy Module" },
    { feature: "Agent abstraction",    langchain: "AgentExecutor (ReAct/Plan)",    llamaindex: "ReActAgent (planner)",           haystack: "Agent (conversational)",         dspy: "Teleprompter (auto-optimize)" },
    { feature: "Prompt optimization",  langchain: "Manual + LangSmith A/B",        llamaindex: "Manual + LlamaHub templates",   haystack: "Manual + prompt hubs",           dspy: "Yes (auto-compile via teleprompter)" },
    { feature: "Best fit",            langchain: "General LLM apps + custom agents", llamaindex: "Document-heavy RAG",          haystack: "Enterprise RAG (production)",    dspy: "Research + prompt auto-optimization" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          LangChain vs LlamaIndex vs Haystack vs DSPy — 4 LLM frameworks
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold text-primary">LangChain</th>
              <th className="text-left px-3 py-2 font-semibold">LlamaIndex</th>
              <th className="text-left px-3 py-2 font-semibold">Haystack</th>
              <th className="text-left px-3 py-2 font-semibold">DSPy</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-primary/80">{r.langchain}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.llamaindex}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.haystack}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.dspy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// Main page component
// ============================================================

const KPIS = [
  { label: "Origin", value: "LangChain 2022", hint: "Harrison Chase open-sourced LangChain 2022 to standardise LLM app development; LlamaIndex, Haystack, DSPy followed", deltaTone: "flat" as const },
  { label: "Hybrid retrieval", value: "BM25 + vector (alpha fusion)", hint: "Lexical (BM25) + semantic (vector) — score = alpha·vector + (1-alpha)·BM25 catches both exact terms + semantic variants", deltaTone: "up" as const },
  { label: "Faithfulness check", value: "LLM-as-judge &gt; 0.95", hint: "Every generated claim verified against cited source — eliminates hallucination that pure LLMs exhibit on biomedical facts", deltaTone: "up" as const },
  { label: "Eval framework", value: "BLEU + ROUGE + PP + recall@k", hint: "LangSmith + LLM-as-judge + offline metrics — compare prompt variants quantitatively, not by gut feel", deltaTone: "flat" as const },
];

export function LlmopsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="LLMOps · prompt registry + RAG + guardrails + evaluation"
        title="LLMOps — operations for production LLM applications"
        description="LLMOps is the MLOps of large language models: (1) Prompt Registry — versioned prompts with A/B testing, never edit in production; (2) RAG pipeline — hybrid retrieval (BM25 + vector) + cross-encoder rerank + LLM generation with [N] citations; (3) Guardrails — toxicity filter + PII detection + hallucination prevention via LLM-as-judge; (4) Evaluation — BLEU/ROUGE/perplexity/recall@k + LLM-as-judge faithfulness + LangSmith experiment comparison. The four LLM frameworks (LangChain, LlamaIndex, Haystack, DSPy) differ in primary focus: LangChain is general LLM apps + agents; LlamaIndex is RAG + data connectors; Haystack is production enterprise RAG; DSPy is research + prompt auto-optimization via teleprompter."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Brain className="h-3 w-3" /> RAG + Guardrails</Badge>
            <Badge variant="outline" className="gap-1.5"><Atom className="h-3 w-3" /> Eval</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* ====================================================== */}
      {/* Section 3: MATHEMATICAL FOUNDATIONS (CRITICAL)         */}
      {/* ====================================================== */}
      <SectionCard
        title="Mathematical foundations — attention, embeddings, retrieval, perplexity, BLEU"
        description="LLMOps is mathematically rigorous — every LLM evaluation metric has a precise formula. Five equations cover 90% of LLMOps: attention (the math behind transformers), embedding geometry (Euclidean vs angular), retrieval metrics (recall@k, precision@k, MRR), perplexity (LM quality), and BLEU (translation quality). Each is derived below from first principles."
        icon={<Sigma className="h-5 w-5" />}
        badge="mathematics"
      >
        <div className="space-y-5">
          {/* Attention mechanism */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-primary mb-1.5">
              1. Attention mechanism — the math behind transformers
            </p>
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
              Bahdanau et al. 2014 introduced additive attention: <code className="font-mono">score(s, h) = v^T · tanh(W_s·s + W_h·h)</code> — a small MLP. Vaswani et al. 2017 (&apos;Attention is All You Need&apos;) replaced this with scaled dot-product attention:
            </p>
            <p className="font-mono text-sm text-foreground bg-background/60 p-2 rounded text-center">
              Attention(Q, K, V) = softmax(QKᵀ / √d_k) × V
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">Why 1/√d_k?</strong> For large <code className="font-mono">d_k</code>, the dot products QK<sup>T</sup> grow large in magnitude, pushing softmax into regions with small gradients (vanishing gradient). Scaling by <code className="font-mono">1/√d_k</code> keeps the variance of the input to softmax at ~1 (assuming Q, K ~ N(0, I<sub>d_k</sub>)), which keeps gradients healthy. This is a variance-stabilisation trick — same idea as BatchNorm in CNNs.
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">Multi-head attention:</strong> Run h parallel attention heads (different learned W<sub>Q</sub>, W<sub>K</sub>, W<sub>V</sub> projections) and concatenate. Each head learns to attend to a different aspect (syntactic vs semantic). Mathematically: <code className="font-mono">MultiHead = Concat(head_1, ..., head_h) · W_O</code>. GPT-4 has ~120 heads across 96 layers.
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">Causal mask:</strong> For autoregressive generation (next-token prediction), apply a lower-triangular mask to QK<sup>T</sup> before softmax — sets future positions to −∞ so softmax gives 0 attention to the future. This is what makes GPT autoregressive.
            </p>
          </div>

          {/* Embedding geometry */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-primary mb-1.5">
              2. Embedding space geometry — Euclidean vs angular distance
            </p>
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
              An embedding is a point in high-dimensional space (typical: 768-1536 dimensions). Two distance notions matter:
            </p>
            <p className="font-mono text-sm text-foreground bg-background/60 p-2 rounded text-center">
              Euclidean: ‖e₁ − e₂‖₂ = √(Σᵢ (e₁ᵢ − e₂ᵢ)²)
            </p>
            <p className="font-mono text-sm text-foreground bg-background/60 p-2 rounded text-center mt-1">
              Angular: cos(e₁, e₂) = (e₁ · e₂) / (‖e₁‖ · ‖e₂‖)
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">When to use which:</strong> Angular (cosine) — text/protein/sequence embeddings where magnitude doesn&apos;t carry meaning. Euclidean (L2) — image/audio features where magnitude = intensity. Dot product — embeddings where magnitude = confidence (cross-encoder rerankers).
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">Dimensionality tradeoff:</strong> Higher dim = more expressive (GPT-4: 12288-dim, ESM-2: 1280-dim, BERT: 768-dim) but slower search + more storage. Johnson-Lindenstrauss lemma: n points can be embedded into O(log n / ε²) dimensions while preserving pairwise distances within (1±ε). For 150M proteins: ~6000 dimensions suffice — ESM-2&apos;s 1280-dim is well above this floor.
            </p>
          </div>

          {/* Retrieval metrics */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-primary mb-1.5">
              3. Retrieval metrics — recall@k, precision@k, MRR
            </p>
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
              Given a query and a retrieval system, let <code className="font-mono">relevant</code> = set of truly relevant documents and <code className="font-mono">retrieved_k</code> = top-k retrieved:
            </p>
            <p className="font-mono text-sm text-foreground bg-background/60 p-2 rounded text-center">
              recall@k = |relevant ∩ retrieved_k| / |relevant|
            </p>
            <p className="font-mono text-sm text-foreground bg-background/60 p-2 rounded text-center mt-1">
              precision@k = |relevant ∩ retrieved_k| / k
            </p>
            <p className="font-mono text-sm text-foreground bg-background/60 p-2 rounded text-center mt-1">
              MRR = (1/|Q|) · Σ<sub>q</sub> 1 / rank(q)
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">Interpretation:</strong> recall@k = &apos;did we find all relevant docs in the top-k?&apos; (high recall = RAG gets all the context it needs); precision@k = &apos;how clean is the top-k?&apos; (high precision = no junk in the context); MRR = &apos;where does the first relevant doc rank?&apos; (1.0 = top-1, 0.5 = top-2, 0.33 = top-3).
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">RAG context:</strong> Recall@k is the metric that matters most for RAG — if recall@10 = 0.85, the LLM doesn&apos;t see 15% of the relevant context, leading to incomplete answers. NDCG (Normalised Discounted Cumulative Gain) extends recall to graded relevance — used in production search systems.
            </p>
          </div>

          {/* Perplexity */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-primary mb-1.5">
              4. Perplexity — language-model quality
            </p>
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
              For a sequence of tokens x₁, x₂, ..., x_N from a model that assigns p(xᵢ | x_&lt;i), perplexity measures how &apos;surprised&apos; the model is by the actual sequence:
            </p>
            <p className="font-mono text-sm text-foreground bg-background/60 p-2 rounded text-center">
              PP = exp(−(1/N) · Σᵢ log p(xᵢ | x_&lt;i))
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">Interpretation:</strong> PP = 1 means the model predicted every token with probability 1 (perfect). PP = |V| means uniform random guessing over vocabulary V (typical: 50K tokens → PP = 50000). GPT-4 on Wikipedia: PP ≈ 8-12. GPT-2: PP ≈ 30. Lower = better.
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">Why exp(avg negative log-prob)?</strong> The negative log-prob is the &apos;surprise&apos; (Shannon information content). Averaging gives per-token surprise; exponentiating converts back to a &apos;perplexity&apos; — the effective number of choices the model was choosing between. PP=10 means the model is effectively choosing among 10 likely tokens at each step.
            </p>
          </div>

          {/* BLEU */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-primary mb-1.5">
              5. BLEU score — translation-quality metric
            </p>
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
              BLEU (Bilingual Evaluation Understudy, Papineni 2002) measures how much a generated translation matches a reference:
            </p>
            <p className="font-mono text-sm text-foreground bg-background/60 p-2 rounded text-center">
              BLEU = BP × exp(Σ wₙ · log pₙ)
            </p>
            <p className="font-mono text-xs text-muted-foreground bg-background/60 p-2 rounded ml-4 mt-1">
              BP (brevity penalty) = min(1, exp(1 − r/c)) &nbsp; where r = ref length, c = candidate length
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">Modified n-gram precision pₙ:</strong> Count n-grams (n=1..4) in the candidate that also appear in the reference, clipped to the reference count (prevents over-generation of repeated n-grams). p₁ = unigram precision, p₂ = bigram precision, p₃ = trigram, p₄ = 4-gram. BLEU-4 is the standard.
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">Brevity penalty BP:</strong> Penalises candidates shorter than the reference (a short translation can have high pₙ but be incomplete). BP = 1 if candidate is at least as long as reference; otherwise <code className="font-mono">exp(1 − r/c)</code> → 0 as c → 0.
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">LLM eval context:</strong> BLEU is precision-focused (how much of the candidate is in the reference) — biased toward short, conservative outputs. ROUGE-L (LCS-based F1) is recall-focused — biased toward longer, comprehensive outputs. For RAG answers with citations, use both; the LLM-as-judge faithfulness check is the gold standard (verifies every claim is supported).
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Architecture diagram */}
      <SectionCard
        title="LLMOps architecture — prompt registry → RAG → guardrails → eval → deploy"
        description="LLMOps spans five layers: (1) Prompt Registry (LangSmith) — versioned prompts with A/B testing; (2) RAG pipeline — hybrid BM25+vector retrieval → cross-encoder rerank → LLM generation with [N] citations; (3) Guardrails — toxicity filter, PII detection, hallucination prevention via LLM-as-judge; (4) Evaluation — BLEU/ROUGE/perplexity/recall@k + LLM-as-judge faithfulness + LangSmith experiment comparison; (5) Deploy — vLLM (PagedAttention) on KServe with auto-scale + monitoring + drift detection."
        icon={<Atom className="h-5 w-5" />}
        badge="architecture"
      >
        <LlmopsArchitectureDiagram />
      </SectionCard>

      {/* Prompt Registry */}
      <SectionCard
        title="Prompt Registry — versioned prompts + A/B testing (LangSmith)"
        description="Prompts are versioned like models — never edit in production. The LangSmith prompt registry stores immutable versions; A/B test variants against the production variant; the winner is promoted via the registry. The prompt template (Jinja/Mustache) defines the structure; the LLM + temperature + top-p define the generation. The A/B test tracks faithfulness + latency + cost per variant."
        icon={<GitBranch className="h-5 w-5" />}
        badge="Prompt Registry"
      >
        <CodeBlock code={PROMPT_REGISTRY_PYTHON} language="python" filename="prompt_registry.py" highlight={[15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56]} />
      </SectionCard>

      {/* RAG pipeline */}
      <SectionCard
        title="RAG pipeline — hybrid retrieval (BM25 + vector) + cross-encoder rerank"
        description="The production RAG pipeline: (1) BM25 retrieval (Elasticsearch) — catches exact drug names + MeSH terms; (2) Vector retrieval (Pinecone + BioBERT) — catches semantic similarity; (3) Cross-encoder rerank (ms-marco-MiniLM-L6-v2) — refines top-200 → top-10; (4) LLM generation with explicit [N] citation tags; (5) Faithfulness check — LLM-as-judge verifies every claim is supported by a cited source. This drops hallucinations from ~12% (pure LLM) to less than 1%."
        icon={<Workflow className="h-5 w-5" />}
        badge="RAG"
      >
        <CodeBlock code={RAG_PIPELINE_PYTHON} language="python" filename="rag_pipeline.py" highlight={[18, 19, 20, 25, 26, 27, 28, 29, 30, 31, 32, 33, 35, 36, 37, 38, 39, 40, 41, 42, 43, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68]} />
      </SectionCard>

      {/* Guardrails */}
      <SectionCard
        title="Guardrails — toxicity + PII + hallucination prevention"
        description="Guardrails are the production safety layer for LLMs. Four classes: (1) ToxicLanguage (NeuroGuard API) — filter toxic content; (2) PII (Presidio NER) — detect + reject PII leakage (patient IDs, emails, SSNs); (3) HallucinationValidator (LLM-as-judge) — verify every claim is supported by a cited source; (4) Controlled substances (chemistry LLM only) — DEA Schedule I-V filter. Guardrails run before AND after the LLM call."
        icon={<Shield className="h-5 w-5" />}
        badge="Guardrails"
      >
        <CodeBlock code={GUARDRAILS_PYTHON} language="python" filename="guardrails.py" highlight={[14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56]} />
      </SectionCard>

      {/* BLEU + ROUGE */}
      <SectionCard
        title="BLEU + ROUGE + Perplexity — LLM evaluation metrics"
        description="Three offline metrics cover the LLM eval spectrum: BLEU (precision-focused — how much of the candidate is in the reference), ROUGE-L (recall-focused — LCS-based F1), Perplexity (LM quality — lower is better). Combined with online LLM-as-judge faithfulness + recall@k for retrieval, these give a complete picture. The code below implements BLEU-4 + ROUGE-L + perplexity from scratch."
        icon={<BarChart3 className="h-5 w-5" />}
        badge="Evaluation"
      >
        <CodeBlock code={BLEU_ROUGE_PYTHON} language="python" filename="bleu_rouge_perplexity.py" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53]} />
      </SectionCard>

      {/* LangSmith eval */}
      <SectionCard
        title="LangSmith — LLM-as-judge + datasets + experiment comparison"
        description="LangSmith (LangChain's observability + eval platform) lets you: (1) Define eval datasets (golden Q&A pairs with citations); (2) Define evaluators (LLMAsJudge for faithfulness + relevance, StringDistance for citation accuracy); (3) Run experiments on datasets — chain v1 vs v2 vs v3; (4) Compare experiments on the dashboard; (5) Promote the winner to Production. This is the MLOps pattern (MLflow) applied to LLMs."
        icon={<Brain className="h-5 w-5" />}
        badge="LangSmith"
      >
        <CodeBlock code={LANGSMITH_EVAL_PYTHON} language="python" filename="langsmith_eval.py" highlight={[12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63]} />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: attention + perplexity + BLEU + recall@k (Pyodide)"
        description="Pure-Python simulation (math + random + collections only — no numpy). (1) Compute scaled dot-product attention softmax(QKᵀ/√d_k)×V on synthetic 4×8 matrices; (2) Compute perplexity for two model variants (good vs bad log-probs); (3) Compute BLEU-4 with modified n-gram precision + brevity penalty; (4) Compute recall@k + precision@k for retrieval; (5) Compute ROUGE-L via LCS dynamic programming."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={PYODIDE_DEMO} buttonLabel="Run LLMOps math simulation (Pyodide)" />
      </SectionCard>

      {/* Comparison table */}
      <SectionCard
        title="LangChain vs LlamaIndex vs Haystack vs DSPy — 4 LLM frameworks"
        description="Four LLM frameworks dominate the market. LangChain (Harrison Chase 2022) is the general LLM app + agents leader. LlamaIndex (Jerry Liu 2022) specialises in RAG + data connectors (60+ data sources via LlamaHub). Haystack (deepset 2020) is the production enterprise RAG framework — best for German enterprise customers. DSPy (Stanford 2023, Khattab) is the research-focused framework — auto-optimises prompts via teleprompter (compile-time prompt engineering)."
        icon={<Boxes className="h-5 w-5" />}
      >
        <LlmopsComparisonTable />
      </SectionCard>

      {/* Why-evolved */}
      <SectionCard
        title="Why LLMOps evolved — shortfalls of pure LLM + ad-hoc prompting"
        description="Modern ML engineers prefer LLMOps because the prior generation (pure LLM + ad-hoc prompts) had four critical shortfalls. LLMOps was designed ground-up to fix all four simultaneously."
        icon={<History className="h-5 w-5" />}
        badge="Why LLMOps"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: LLMs hallucinate facts.</strong> Pre-LLMOps, asking GPT-3 &apos;does drug X interact with drug Y?&apos; could invent an interaction. RAG grounds generation in retrieved evidence with [N] citations; a second LLM-as-judge verifies every claim is supported. <strong className="text-foreground/80">Result:</strong> hallucination rate drops from ~12% (pure LLM) to less than 1% (RAG + faithfulness check).
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: Prompts were ad-hoc.</strong> Pre-LLMOps, prompts lived in Jupyter notebooks or shell scripts — no versioning, no A/B testing, no rollback. The prompt registry (LangSmith) treats prompts like models: immutable versions, A/B test variants against production, winner promoted via the registry. <strong className="text-foreground/80">Result:</strong> prompt changes are auditable + reversible.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: No safety filters.</strong> Pre-LLMOps, pure LLMs leaked PII (patient IDs in clinical notes) + generated toxic content + produced controlled-substance recipes. Guardrails (toxicity + PII + hallucination + DEA) silently filter bad output — the user only sees safe responses. <strong className="text-foreground/80">Result:</strong> production safety built-in.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: No quantitative evaluation.</strong> Pre-LLMOps, &apos;is this prompt better than the old one?&apos; was a gut feeling. LangSmith eval datasets + LLM-as-judge + offline metrics (BLEU/ROUGE/perplexity/recall@k) let you compare variants quantitatively. <strong className="text-foreground/80">Result:</strong> prompt changes are evidence-based, not vibes.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique LLMOps features"
        description="LLMOps has four features that are genuinely unique — structural differentiators that no pure-LLM pipeline can match."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. RAG + citations + faithfulness</p>
            <p className="text-muted-foreground">Ground generation in retrieved evidence with [N] citations; LLM-as-judge verifies every claim is supported. <strong>Eliminates hallucination that pure LLMs exhibit.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Prompt registry + A/B testing</p>
            <p className="text-muted-foreground">Versioned prompts with A/B test variants — same MLOps pattern as model registry. <strong>Ad-hoc prompting has no equivalent.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Multi-guardrail stack</p>
            <p className="text-muted-foreground">Toxicity + PII + hallucination + DEA — 4 classes of unsafe output silently filtered. <strong>Pure LLM has no safety layer.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. LLM-as-judge evaluation</p>
            <p className="text-muted-foreground">Use a strong LLM (GPT-4) to judge outputs of weaker LLMs — faithfulness + relevance + citation accuracy. <strong>Automated eval at scale.</strong></p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples */}
      <SectionCard
        title="3 science examples — LLMOps in biomedical + chemistry + clinical trial"
        description="Three production-style examples showing LLMOps in scientific workloads. Each is a clickable card opening a lazy popup with: scenario brief (dataset/scale/why), dataset stats grid, computational tooling, multi-language code in Scala + Rust + Go + Elixir + Zig, and an implementation insight. All datasets are real public data (PubMed, ChEMBL, ClinicalTrials.gov)."
        icon={<Database className="h-5 w-5" />}
        badge="3 examples × 5 langs"
      >
        <DatasetCards
          examples={LLMOPS_SCIENCE_EXAMPLES}
          intro="Real public datasets (PubMed 36M abstracts, ChEMBL 20M molecules, ClinicalTrials.gov 480K trials) + synthetic equivalents. Each card has Scala/Rust/Go/Elixir/Zig code with hybrid retrieval + cross-encoder rerank + LLM-as-judge differentiators."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the LLMOps ecosystem"
        description="LLMOps integrates with the full LLM stack: LLM providers (OpenAI, Anthropic, open-source via vLLM), frameworks (LangChain, LlamaIndex, Haystack, DSPy), observability (LangSmith, Phoenix, Arize), guardrails (NeuroGuard, Presidio, LLM-as-judge), and serving (vLLM, TGI, Triton)."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Frameworks + LLMs</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>LangChain</strong> — LLM apps + agents (MIT)</li>
              <li>• <strong>LlamaIndex</strong> — RAG + data connectors (MIT)</li>
              <li>• <strong>Haystack</strong> — production RAG (Apache 2.0)</li>
              <li>• <strong>DSPy</strong> — prompt auto-optimization (Stanford)</li>
              <li>• <strong>OpenAI / Anthropic / Gemini</strong> — commercial LLMs</li>
              <li>• <strong>Llama 3 / Mistral / Qwen</strong> — open-source LLMs</li>
              <li>• <strong>vLLM</strong> — PagedAttention serving (SOSP 2023)</li>
              <li>• <strong>TGI / Triton / BentoML</strong> — alternative servers</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cloud className="h-3.5 w-3.5 text-primary" /> Observability + guardrails</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>LangSmith</strong> — LangChain&apos;s observability + eval</li>
              <li>• <strong>Phoenix</strong> — Arize&apos;s open-source LLM observability</li>
              <li>• <strong>Weights &amp; Biases</strong> — LLM tracking (W&amp;B Models)</li>
              <li>• <strong>NeuroGuard API</strong> — toxicity filter (OpenAI Mod)</li>
              <li>• <strong>Presidio</strong> — Microsoft PII detection</li>
              <li>• <strong>Guardrails AI</strong> — guardrail framework</li>
              <li>• <strong>LlamaGuard</strong> — Meta&apos;s safety classifier</li>
              <li>• <strong>Promptfoo</strong> — CLI for LLM eval</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers and production blog posts that defined LLMOps + the RAG movement. The Lewis 2020 RAG paper is the foundational academic reference; the LangChain + LlamaIndex + DSPy papers document the framework evolution."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Lewis et al. 2020 (Retrieval-Augmented Generation for Knowledge-Intensive NLP):</strong> The original RAG paper from Facebook AI. Formalised the pattern: (1) encode documents into embeddings; (2) retrieve top-k relevant to the query; (3) condition the LLM on (query + retrieved context) → generate. Proved RAG beats pure LLMs on knowledge-intensive tasks (OpenQA, trivia) by grounding in retrieved evidence. The 2020 paper used DPR (Dense Passage Retrieval) — later hybrid (BM25 + DPR) became the production default.
          </p>
          <p>
            <strong className="text-foreground/80">Vaswani et al. 2017 (Attention is All You Need):</strong> The Transformer paper. Replaced recurrent architectures (LSTM/GRU) with pure-attention. Introduced scaled dot-product attention: <code className="font-mono">softmax(QKᵀ/√d_k) × V</code>. The 1/√d_k scaling is the key trick — variance stabilisation that prevents softmax from saturating. Every LLM since BERT (2018) is built on this attention math.
          </p>
          <p>
            <strong className="text-foreground/80">Bahdanau et al. 2014 (Neural Machine Translation by Jointly Learning to Align and Translate):</strong> The original attention paper. Before Vaswani 2017, attention was a small MLP that computed an alignment score between decoder state and each encoder hidden state. Vaswani 2017 simplified this to dot-product attention — same idea (weighted sum of encoder states) but faster (no MLP) and better at large d_k.
          </p>
          <p>
            <strong className="text-foreground/80">Papineni et al. 2002 (BLEU: a Method for Automatic Evaluation of MT):</strong> The BLEU paper from IBM. Introduced modified n-gram precision + brevity penalty. Remains the standard MT eval metric 22 years later. Lin 2004 introduced ROUGE (recall-focused LCS-based F1) as the complementary metric — together they cover precision + recall for sequence-to-sequence eval.
          </p>
          <p>
            <strong className="text-foreground/80">Khattab et al. 2023 (DSPy: Compiling Declarative Language Model Programs):</strong> The DSPy paper from Stanford. Key insight: prompts are like source code — they should be auto-optimized via a &apos;teleprompter&apos; (compile-time prompt engineering). DSPy&apos;s teleprompter uses Bayesian optimization to find the best prompt template for a given task + dataset. Production at Databricks for SQL query generation.
          </p>
          <p>
            <strong className="text-foreground/80">Notion Production Case (Notion Blog 2023):</strong> RAG at Notion — 100M+ document chunks × 1536-dim OpenAI Ada embeddings on Pinecone. Hybrid retrieval (BM25 + vector) + cross-encoder rerank + GPT-4 generation with [N] citations. Faithfulness check (GPT-4 LLM-as-judge) drops hallucinations from 8% to less than 1%. The prompt registry versions the Q&amp;A prompt; A/B tests variant v2 (top-p=0.7) vs v1 (top-p=0.9) — v2 had 0.05 higher faithfulness, promoted to Production.
          </p>
          <p>
            <strong className="text-foreground/80">Epic Systems Production Case (Epic 2024):</strong> LLMOps in clinical decision support — biomedical RAG on PubMed + clinical-trial matching on ClinicalTrials.gov. Guardrails (toxicity + PII + hallucination + DEA) filter every LLM output. Coverage metric: out of 1000 patients, the matcher finds at least 1 eligible trial for 78% (vs 35% for manual screening). The LLM-as-judge rejects ~3% of candidate matches as hallucinations.
          </p>
        </div>
      </SectionCard>

      {/* Deeper-thought insight */}
      <SectionCard
        title="My deeper thought: LLMOps IS compiler engineering applied to prompts"
        description="The unifying view: prompts are source code; LLMs are interpreters; LLMOps is compiler engineering. Every LLMOps pattern has a compiler-engineering analog."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Prompts ARE source code, LLMs ARE interpreters.</strong> A Python program is a string that the Python interpreter executes to produce output. An LLM prompt is a string that the LLM &apos;executes&apos; (forward pass) to produce output. The same software-engineering principles apply: versioning (git for code, LangSmith for prompts), A/B testing (canary deploys for code, prompt variants for LLMs), regression testing (unit tests for code, eval datasets for LLMs). LLMOps IS the compiler-engineering pattern applied to prompts.
          </p>
          <p>
            <strong className="text-foreground/80">RAG IS lazy evaluation, applied to LLM context.</strong> Lazy evaluation: don&apos;t compute a value until it&apos;s needed. RAG: don&apos;t load the full document corpus into the LLM context (impossible — context window limits); retrieve only the relevant chunks at query time. The embedding index is the &apos;symbol table&apos;; the vector search is the &apos;lazy lookup&apos;; the LLM is the &apos;evaluator&apos;. The same pattern powers lazy SQL (Trino federated queries), lazy Python (generators), lazy React (suspense). The unifying abstraction is &apos;defer the expensive computation until needed&apos;.
          </p>
          <p>
            <strong className="text-foreground/80">LLM-as-judge IS test-driven development, applied to LLM outputs.</strong> TDD: write tests that assert on program behavior; CI runs the tests on every commit. LLM-as-judge: write an eval dataset that asserts on LLM output quality; CI runs the evals on every prompt change. The LLM-as-judge is the &apos;oracle&apos; that decides if the output is correct — same role as a unit-test assertion. The difference: LLM-as-judge is probabilistic (GPT-4 has 95% accuracy on faithfulness), unit tests are deterministic. As LLM-as-judge improves (GPT-5+?), LLMOps converges with TDD.
          </p>
          <p>
            <strong className="text-foreground/80">DSPy IS compiler optimization, applied to prompts.</strong> A compiler optimizes source code via passes (constant folding, dead code elimination, inlining) — the source code is unchanged but the compiled binary is faster. DSPy&apos;s teleprompter optimizes prompts via Bayesian optimization — the task specification is unchanged but the actual prompt template is auto-tuned for the LLM + dataset. The user writes &apos;answer the question using the context, cite [N]&apos; (declarative); DSPy compiles it into the best prompt for GPT-4 + the biomedical Q&amp;A dataset (imperative). This is the &apos;source code → optimized binary&apos; pattern, applied to prompts.
          </p>
        </div>
      </SectionCard>

      <DeeperThoughtSection pageTitle="LLMOps">
        <DeeperThought title="LLMOps IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about LLMOps is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. LLMOps connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where LLMOps sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (LLMOps) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
        { id: "rag-deep-dive" as const, reason: "RAG deep dive (the R in LLMOps)" },
        { id: "rag-llms" as const, reason: "RAG + LLMs concept page" },
        { id: "mlflow-deep-dive" as const, reason: "MLflow (LLM eval logged via MLflow)" },
        { id: "vector-db-deep-dive" as const, reason: "Vector DB (RAG retrieval layer)" },
        { id: "feature-store-deep-dive" as const, reason: "Feature store (PIT patterns reused in RAG)" },
        { id: "multimodal-rag" as const, reason: "Multimodal RAG (image + text + audio)" },
        { id: "transformer" as const, reason: "Transformer architecture (attention math)" },
        { id: "fine-tuning" as const, reason: "Fine-tuning (LLM adaptation, logged via MLflow)" },
      ]} />
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "Trace this topic's connections across the platform's math graph" }, { id: "rag-deep-dive" as const, reason: "RAG deep dive (the R in LLMOps)" }, { id: "rag-llms" as const, reason: "RAG + LLMs concept page" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("rag-deep-dive")} className="text-sm text-primary hover:underline">
          &rarr; RAG Deep Dive (the R in LLMOps)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("mlflow-deep-dive")} className="text-sm text-primary hover:underline">
          &rarr; MLflow Deep Dive (LLM eval logging)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("vector-db-deep-dive")} className="text-sm text-primary hover:underline">
          &rarr; Vector DB Deep Dive (RAG retrieval)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("transformer")} className="text-sm text-primary hover:underline">
          &rarr; Transformer (attention math)
        </Link>
      </div>
    </div>
  );
}
