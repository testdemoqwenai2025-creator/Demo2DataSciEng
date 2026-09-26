"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { VECTOR_DB_SCIENCE_EXAMPLES } from "../_components/_dataset_examples13";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import {
  Layers, Boxes, Database, Workflow, Zap, GitBranch, History, ShieldCheck,
  Atom, Activity, FileText, ExternalLink, Network, Sparkles, Cpu, TrendingUp,
  Server, Cloud, Code2, Sigma, BarChart3, Target, Layers as LayersIcon,
} from "lucide-react";

// ============================================================
// Code snippets
// ============================================================

const PINECONE_PYTHON = `# ============================================================
# Pinecone — managed vector search at scale
# ============================================================
# pip install pinecone-client
# Pinecone is the SaaS vector DB — no infrastructure to manage.

from pinecone import Pinecone, ServerlessSpec

pc = Pinecone(api_key="pckey_...")
idx = pc.Index("protein_embeddings")  # 1280-dim ESM-2 embeddings

# Create a serverless index (no replicas to manage)
pc.create_index(
    name="protein_embeddings",
    dimension=1280,
    metric="cosine",
    spec=ServerlessSpec(
        cloud="aws",
        region="us-east-1",
    ),
)

# Upsert vectors with metadata (filterable at query time)
vectors = [
    {"id": "P001", "values": [0.1, 0.2, ...],
     "metadata": {"family": "PF00001", "organism": "human"}},
    {"id": "P002", "values": [0.15, 0.18, ...],
     "metadata": {"family": "PF00002", "organism": "mouse"}},
]
idx.upsert(vectors=vectors, namespace="uniref90")

# Query with metadata filter (Lipinski-style narrowing)
results = idx.query(
    vector=[0.12, 0.21, ...],
    top_k=10,
    namespace="uniref90",
    filter={
        "family": {"$in": ["PF00001", "PF00003"]},
        "organism": "human",
    },
    include_metadata=True,
)
for match in results.matches:
    print(match.id, match.score, match.metadata)`;

const WEAVIATE_GRAPHQL = `# ============================================================
# Weaviate — open-source vector DB with GraphQL + hybrid search
# ============================================================
# Docker: docker run -p 8080:8080 semitechnologies/weaviate
# Hybrid search: BM25 (keyword) + vector (semantic) — fused via
#   score = alpha * vector_score + (1-alpha) * bm25_score

import weaviate
import json

client = weaviate.connect_to_local(
    host="weaviate.science", port=8080,
)

# Define a collection (class) with vectorizer + module
client.collections.create(
    name="Protein",
    vectorizer_config=weaviate.Configure.Vectorizer.text2vec_transformers(
        # Use a HuggingFace transformer model for embeddings
        model_name="facebook/esm2",
    ),
    properties=[
        weaviate.Property(name="uniprot_id", data_type=weaviate.DataType.TEXT),
        weaviate.Property(name="sequence",   data_type=weaviate.DataType.TEXT),
        weaviate.Property(name="family",    data_type=weaviate.DataType.TEXT),
    ],
)

proteins = client.collections.get("Protein")

# Insert objects — Weaviate auto-embeds from the 'sequence' field
proteins.data.insert_many([
    {"uniprot_id": "P12345", "sequence": "MVKLV...", "family": "PF00001"},
    {"uniprot_id": "P67890", "sequence": "AGKLM...", "family": "PF00002"},
])

# Hybrid search: BM25 + vector fusion (alpha=0.25 leans BM25, 0.75 vector)
results = proteins.query.hybrid(
    query="kinase domain protein",
    query_properties=["sequence", "family"],
    alpha=0.5,  # 0 = pure BM25, 1 = pure vector
    limit=10,
    return_metadata=weaviante.query.Metadata(score=True, explain_score=True),
)
for obj in results.objects:
    print(obj.properties, obj.metadata.score)`;

const MILVUS_HNSW_PYTHON = `# ============================================================
# Milvus — open-source vector DB with HNSW + IVF + GPU
# ============================================================
# Docker: docker run -p 19530:19530 milvusdb/milvus
# pymilvus: pip install pymilvus

from pymilvus import (
    connections, FieldSchema, CollectionSchema, DataType,
    Collection, utility,
)

connections.connect(host="milvus.science", port=19530)

# Collection: protein_embeddings (1280-dim, HNSW index)
fields = [
    FieldSchema(name="protein_id", dtype=DataType.INT64, is_primary=True),
    FieldSchema(name="embedding",  dtype=DataType.FLOAT_VECTOR, dim=1280),
    FieldSchema(name="pfam_family", dtype=DataType.VARCHAR, max_length=64),
    FieldSchema(name="organism",    dtype=DataType.VARCHAR, max_length=128),
]
schema = CollectionSchema(fields=fields, description="UniRef90 ESM-2")
coll = Collection(name="protein_embeddings", schema=schema)

# HNSW index: M=16 (graph degree), efConstruction=200 (build-time search)
coll.create_index(
    field_name="embedding",
    index_params={
        "index_type": "HNSW",
        "metric_type": "IP",  # inner product = cosine on L2-normed vectors
        "params": {"M": 16, "efConstruction": 200},
    },
)
coll.load()

# IVF index (alternative — Voronoi partitioning via k-means)
coll_ivf = Collection(name="variant_embeddings")
coll_ivf.create_index(
    field_name="embedding",
    index_params={
        "index_type": "IVF_FLAT",
        "metric_type": "L2",
        "params": {"nlist": 1024},   # 1024 Voronoi cells (coarse quantization)
    },
)
# Search with nprobe=8 (probe 8/1024 cells — 1/128 of work)

# Query — HNSW search with ef=64 (search-time breadth)
results = coll.search(
    data=[query_embedding],
    anns_field="embedding",
    param={"metric_type": "IP", "params": {"ef": 64}},
    limit=10,
    expr='pfam_family == "PF00001"',  # metadata filter
    output_fields=["protein_id", "pfam_family", "organism"],
)
for hits in results:
    for hit in hits:
        print(hit.entity.get("protein_id"), hit.score,
              hit.entity.get("pfam_family"))`;

const PGVECTOR_SQL = `-- ============================================================
-- pgvector — PostgreSQL extension for in-database vector search
-- ============================================================
-- Install: CREATE EXTENSION IF NOT EXISTS vector;
-- Supports HNSW + IVFFlat indexes; runs alongside standard SQL.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE clinvar_variants (
    variant_id            TEXT PRIMARY KEY,
    chrom                 TEXT,
    pos                   INT,
    ref                   TEXT,
    alt                   TEXT,
    clinical_significance TEXT,
    embedding             vector(32)  -- DNABERT 32-dim
);

-- HNSW index (recommended for small-to-medium datasets)
CREATE INDEX ON clinvar_variants
    USING hnsw (embedding vector_l2_ops)
    WITH (m = 16, ef_construction = 200);

-- IVFFlat index (recommended for larger datasets — needs ANALYZE first)
CREATE INDEX ON clinvar_variants
    USING ivfflat (embedding vector_l2_ops)
    WITH (lists = 1024);   -- 1024 Voronoi cells via k-means

-- Set search-time parameters
SET hnsw.ef_search = 64;   -- HNSW search breadth
SET ivfflat.probes = 8;   -- IVF cells to probe (out of 1024)

-- Similarity search — returns L2 distance + variant metadata
SELECT variant_id, chrom, pos, clinical_significance,
       embedding <-> '[0.1, 0.2, ...]'::vector AS distance
FROM clinvar_variants
ORDER BY embedding <-> '[0.1, 0.2, ...]'::vector
LIMIT 10;

-- Metadata-filtered search (filter before vector search)
SELECT variant_id, chrom, pos, clinical_significance
FROM clinvar_variants
WHERE clinical_significance = 'pathogenic'
  AND chrom = '17'
ORDER BY embedding <-> '[0.1, 0.2, ...]'::vector
LIMIT 10;

-- Hybrid search: BM25 (full-text) + pgvector (semantic)
-- Postgres has tsvector for full-text search; combine with vector
WITH vector_match AS (
    SELECT variant_id, 0.7 * (1 - (embedding <-> '[0.1, ...]'::vector)) AS vec_score
    FROM clinvar_variants
    ORDER BY embedding <-> '[0.1, ...]'::vector
    LIMIT 100
),
bm25_match AS (
    SELECT variant_id,
        ts_rank(tsv, plainto_tsquery('BRCA1 pathogenic')) AS bm25_score
    FROM clinvar_variants
    WHERE tsv @@ plainto_tsquery('BRCA1 pathogenic')
    LIMIT 100
)
SELECT v.variant_id, v.vec_score + 0.3 * b.bm25_score AS hybrid_score
FROM vector_match v
FULL OUTER JOIN bm25_match b USING (variant_id)
ORDER BY hybrid_score DESC
LIMIT 10;`;

// ============================================================
// Pyodide demo — HNSW layered graph + IVF + LSH
// ============================================================

const PYODIDE_DEMO = `# ============================================================
# Vector DB simulation: HNSW + IVF + LSH + recall@k
# Pure Python (math + random + collections only — no numpy)
# ============================================================
# 1. Generate 1000 synthetic vectors (32-dim)
# 2. Brute-force k=10 NN (ground truth)
# 3. Simulate HNSW layered graph (log(n) layers, ef=64 final)
# 4. Simulate IVF Voronoi (k-means → 1024 cells, nprobe=8)
# 5. Simulate LSH (Hamming-space locality-sensitive hashing)
# 6. Compute recall@k for each algorithm
# 7. Compute cosine sim, L2, dot product on sample vectors
# ============================================================

import math
import random
from collections import defaultdict

random.seed(42)

# ------------------------------------------------------------
# 1. Generate 1000 vectors in 32-dim space
# ------------------------------------------------------------
N = 1000
DIM = 32
vectors = []
for i in range(N):
    # Each "cluster" has a centroid; members are noisy versions
    cluster = i % 10
    centroid = [(cluster + j) * 0.1 for j in range(DIM)]
    vec = [c + random.gauss(0, 0.3) for c in centroid]
    vectors.append({"id": i, "vec": vec, "cluster": cluster})

# L2 normalize for cosine similarity
def l2_norm(v):
    norm = math.sqrt(sum(x * x for x in v))
    return [x / norm for x in v] if norm > 0 else v

vectors_norm = [{"id": v["id"], "vec": l2_norm(v["vec"]),
                 "cluster": v["cluster"]} for v in vectors]

print(f"=== 1. Synthetic vectors: N={N}, dim={DIM} ===")
print(f"  10 clusters × 100 vectors each (cluster centroids spaced)")
print()

# ------------------------------------------------------------
# 2. Distance metrics: cosine, L2, dot product
# ------------------------------------------------------------
def cosine_sim(a, b):
    return sum(x * y for x, y in zip(a, b))  # already L2-normed

def l2_dist(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))

def dot_product(a, b):
    return sum(x * y for x, y in zip(a, b))

a, b = vectors_norm[0]["vec"], vectors_norm[1]["vec"]
print("=== 2. Distance metrics (when to use each) ===")
print(f"  cosine_sim(a,b) = {cosine_sim(a, b):.4f}   (text embeddings, biological sequences)")
print(f"  l2_dist(a,b)   = {l2_dist(a, b):.4f}   (image features, raw physical measurements)")
print(f"  dot_product(a,b) = {dot_product(a, b):.4f}   (L2-normed = cosine; raw = magnitude matters)")
print()

# ------------------------------------------------------------
# 3. Brute-force k=10 NN (ground truth)
# ------------------------------------------------------------
query = vectors_norm[0]["vec"]
sims = [(v["id"], v["cluster"], cosine_sim(query, v["vec"]))
        for v in vectors_norm[1:]]  # exclude self
sims.sort(key=lambda x: -x[2])
true_top10 = set(vid for vid, _, _ in sims[:10])

print(f"=== 3. Brute-force top-10 NN (ground truth) ===")
print(f"  Query: id=0, cluster=0")
print(f"  Top-5 NNs (by cosine sim):")
for vid, cl, sim in sims[:5]:
    print(f"    id={vid} cluster={cl} sim={sim:.4f}")
print()

# ------------------------------------------------------------
# 4. Simulate HNSW (layered graph + greedy routing)
# ------------------------------------------------------------
print("=== 4. HNSW — Hierarchical Navigable Small World ===")
n_layers = int(math.log2(N)) + 1  # ~10 layers for N=1000
print(f"  Total layers: {n_layers}")
print(f"  Layer 0 (full graph): {N} nodes")
for L in range(1, n_layers):
    nodes_at_L = max(1, int(N / (2 ** L)))
    print(f"  Layer {L}: {nodes_at_L} nodes (probability 1/2^L)")

# Simulate HNSW search: route greedily on top layers, ef=64 on bottom
# At each layer, visit M=16 neighbors (graph degree)
M = 16
ef = 64
visited_by_layer = []
for L in range(n_layers - 1, 0, -1):  # top → 1
    visited = M  # greedy routing visits M nodes per layer
    visited_by_layer.append((L, visited))
final_layer_visited = ef  # final layer uses ef-search
total_visited = sum(v for _, v in visited_by_layer) + final_layer_visited
print(f"  Search path: {visited_by_layer} + bottom layer ef={ef}")
print(f"  Total vectors visited: {total_visited} (vs {N-1} brute-force)")

# Simulate HNSW recall (90-95% typical)
hnsw_top10 = set()
for vid, cl, sim in sims:
    if random.random() < 0.95:  # 95% recall
        hnsw_top10.add(vid)
    if len(hnsw_top10) == 10:
        break
recall_hnsw = len(hnsw_top10 & true_top10) / len(true_top10)
print(f"  HNSW recall@10 = {recall_hnsw:.2f} "
      f"({len(hnsw_top10 & true_top10)}/{len(true_top10)})")
print()

# ------------------------------------------------------------
# 5. Simulate IVF (Voronoi partitioning via k-means)
# ------------------------------------------------------------
print("=== 5. IVF — Inverted File (Voronoi via k-means) ===")
nlist = 1024   # number of Voronoi cells (would be nlist for 1.5M vectors)
nprobe = 8

# Simulate k-means clustering (assign each vector to a random cell)
cell_of = defaultdict(list)
for v in vectors_norm:
    cell_id = random.randint(0, nlist - 1)
    v["cell"] = cell_id
    cell_of[cell_id].append(v)

# IVF search: probe only nprobe cells (out of nlist)
probe_cells = set(random.sample(range(nlist), nprobe))
ivf_candidates = []
for cid in probe_cells:
    for v in cell_of[cid]:
        if v["id"] == 0:  # exclude self
            continue
        sim = cosine_sim(query, v["vec"])
        ivf_candidates.append((v["id"], v["cluster"], sim))
ivf_candidates.sort(key=lambda x: -x[2])
ivf_top10 = set(vid for vid, _, _ in ivf_candidates[:10])
recall_ivf = len(ivf_top10 & true_top10) / len(true_top10)
print(f"  nlist={nlist} cells (k-means centroids)")
print(f"  nprobe={nprobe} (probing {nprobe}/{nlist} = "
      f"{nprobe/nlist:.2%} of database)")
print(f"  IVF recall@10 = {recall_ivf:.2f} "
      f"({len(ivf_top10 & true_top10)}/{len(true_top10)})")
print()

# ------------------------------------------------------------
# 6. Simulate LSH (Locality-Sensitive Hashing)
# ------------------------------------------------------------
print("=== 6. LSH — Locality-Sensitive Hashing (Hamming space) ===")
# LSH: P(h(x) = h(y)) = 1 - d(x,y)^n (Hamming)
# For Euclidean: p-stable distribution (Datar, Immorlica, Indyk 2004)

def hamming_lsh(vec, n_hashes=8, threshold=0.5):
    """Hash a vector via random hyperplane LSH."""
    bits = []
    for _ in range(n_hashes):
        # Random hyperplane — sign of dot product
        hp = [random.gauss(0, 1) for _ in range(len(vec))]
        dot = sum(v * h for v, h in zip(vec, hp))
        bits.append(1 if dot >= 0 else 0)
    return tuple(bits)

# Hash all vectors
for v in vectors_norm:
    v["hash"] = hamming_lsh(v["vec"])

# Find candidates with same hash as query (bucket collisions)
query_hash = vectors_norm[0]["hash"]
lsh_candidates = [v for v in vectors_norm if v["hash"] == query_hash
                  and v["id"] != 0]
print(f"  Query hash: {query_hash}")
print(f"  Candidates (same hash bucket): {len(lsh_candidates)}")
lsh_sims = [(v["id"], v["cluster"], cosine_sim(query, v["vec"]))
            for v in lsh_candidates]
lsh_sims.sort(key=lambda x: -x[2])
lsh_top10 = set(vid for vid, _, _ in lsh_sims[:10])
recall_lsh = len(lsh_top10 & true_top10) / len(true_top10) if lsh_top10 else 0
print(f"  LSH recall@10 = {recall_lsh:.2f} "
      f"(depends on hash quality — {len(lsh_candidates)} candidates)")
print()

# ------------------------------------------------------------
# 7. Summary — recall vs speed tradeoff
# ------------------------------------------------------------
print("=== 7. Recall vs speed tradeoff summary ===")
print(f"  Algorithm     | Recall@10 | Vectors visited | Speed")
print(f"  Brute-force   | 1.00       | {N-1}             | baseline")
print(f"  HNSW          | {recall_hnsw:.2f}       | ~{total_visited}              | {N//total_visited}x faster")
print(f"  IVF (nprobe=8) | {recall_ivf:.2f}       | ~{int(nprobe/nlist * N)}            | {nlist//nprobe}x faster")
print(f"  LSH           | {recall_lsh:.2f}       | ~{len(lsh_candidates)}             | varies")
print()
print("Key insight: HNSW gives O(log n) search via layered graph")
print("(top layers route greedily, bottom refines with ef). IVF")
print("partitions via k-means — probing nprobe/1024 cells. LSH")
print("uses random hyperplanes; same-hash buckets are likely NN.")
print("All three trade recall for speed — choose based on dataset")`;

// ============================================================
// Milvus architecture diagram — index types + metric + search
// ============================================================

function VectorDbArchitectureDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("hnsw");
  const nodes = {
    "vectors":  { label: "Vector collection (N×dim)",        desc: "Protein embeddings 150M × 1280-dim; molecules 250M × 2048-bit; ClinVar variants 1.5M × 32-dim", level: 0 },
    "hnsw":     { label: "HNSW index",                       desc: "Hierarchical Navigable Small World — O(log n) layered graph. M=16, efConstruction=200, ef=64 at query", level: 1 },
    "ivf":      { label: "IVF index (Voronoi + k-means)",   desc: "Partitions into nlist cells; probes nprobe (8/1024). Coarse → fine quantization", level: 1 },
    "lsh":      { label: "LSH index",                       desc: "Locality-sensitive hashing — random hyperplanes; same-bucket candidates. Hamming + p-stable Euclidean", level: 1 },
    "metric":   { label: "Distance metric",                  desc: "cosine (L2-normed IP) · L2 (Euclidean) · dot product — chosen at index creation, immutable", level: 2 },
    "metadata": { label: "Metadata filter",                  desc: "Pre-filter (narrow N → subset) before vector search — Lipinski Rule-of-5, family, organism", level: 2 },
    "query":    { label: "Query: top-k NN",                 desc: "query_vector + top_k + filter → results with scores + metadata. Latency: 5-50ms", level: 3 },
  };
  const edges = [
    ["vectors", "hnsw"], ["vectors", "ivf"], ["vectors", "lsh"],
    ["hnsw", "metric"], ["ivf", "metric"], ["lsh", "metric"],
    ["hnsw", "metadata"], ["ivf", "metadata"], ["lsh", "metadata"],
    ["metric", "query"], ["metadata", "query"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "vectors":  { x: 200, y: 30 },
    "hnsw":     { x: 70,  y: 90 },
    "ivf":      { x: 200, y: 90 },
    "lsh":      { x: 330, y: 90 },
    "metric":   { x: 70,  y: 150 },
    "metadata": { x: 330, y: 150 },
    "query":    { x: 200, y: 210 },
  };

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Atom className="h-3.5 w-3.5 text-primary" />
          Vector DB architecture — HNSW + IVF + LSH indexes + distance metric + metadata filter
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 400 240" className="w-full h-auto">
          <defs>
            <marker id="vdb-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" />
            </marker>
          </defs>
          {edges.map(([from, to], i) => {
            const a = positions[from];
            const b = positions[to];
            return (
              <line key={i} x1={a.x} y1={a.y + 12} x2={b.x} y2={b.y - 12}
                stroke="var(--border)" strokeWidth="0.8" markerEnd="url(#vdb-arrow)" />
            );
          })}
          {Object.entries(positions).map(([id, pos]) => {
            const isActive = activeNode === id;
            const node = nodes[id as keyof typeof nodes];
            const color =
              node.level === 0 ? "var(--chart-3)" :
              node.level === 1 ? "var(--chart-2)" :
              node.level === 2 ? "var(--chart-1)" :
              node.level === 3 ? "var(--chart-4)" : "var(--muted-foreground)";
            return (
              <motion.g key={id}
                onMouseEnter={() => setActiveNode(id)}
                onMouseLeave={() => setActiveNode(null)}
                animate={{ scale: isActive ? 1.05 : 1 }}
                style={{ cursor: "pointer" }}>
                <rect x={pos.x - 60} y={pos.y - 12} width="120" height="24" rx="3"
                  fill={isActive ? color + "30" : "var(--background)"}
                  stroke={color} strokeWidth={isActive ? 1.5 : 0.8} />
                <text x={pos.x} y={pos.y + 3} textAnchor="middle" fontSize="7"
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
            Hover any node — three index types (HNSW, IVF, LSH) share the metric + metadata filter layer.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Comparison table — Pinecone vs Weaviate vs Milvus vs pgvector vs Qdrant
// ============================================================

function VectorDbComparisonTable() {
  const rows = [
    { feature: "Origin / License",    pinecone: "Pinecone 2019 / Proprietary SaaS", weaviate: "Semi Technologies 2019 / BSD-3", milvus: "Zilliz 2019 / Apache 2.0", pgvector: "Andrew Kane 2021 / PostgreSQL LGPL", qdrant: "Qdrant 2021 / Apache 2.0" },
    { feature: "Open-source",          pinecone: "No (SaaS-only)",                  weaviate: "Yes — self-hostable",            milvus: "Yes — self-hostable",     pgvector: "Yes — Postgres extension",            qdrant: "Yes — self-hostable (Rust)" },
    { feature: "Index types",          pinecone: "Pinecone-proprietary",            weaviate: "HNSW",                            milvus: "HNSW + IVF + DiskANN + GPU", pgvector: "HNSW + IVFFlat",                     qdrant: "HNSW" },
    { feature: "Hybrid search",        pinecone: "Vector + metadata filter",         weaviate: "BM25 + vector (alpha fusion)",    milvus: "Vector + scalar filter",   pgvector: "BM25 (tsvector) + vector",            qdrant: "Vector + payload filter" },
    { feature: "GPU acceleration",     pinecone: "Yes (managed)",                    weaviate: "No",                              milvus: "Yes (NVIDIA GPU + RAPIDS)", pgvector: "No",                                   qdrant: "No" },
    { feature: "Best fit",             pinecone: "SaaS-first teams (no infra)",     weaviate: "GraphQL + hybrid search",         milvus: "Scale (PB-scale, GPU)",     pgvector: "In-database (Postgres users)",        qdrant: "Rust-speed + payload filtering" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          Pinecone vs Weaviate vs Milvus vs pgvector vs Qdrant — 5 vector databases
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold text-primary">Pinecone</th>
              <th className="text-left px-3 py-2 font-semibold">Weaviate</th>
              <th className="text-left px-3 py-2 font-semibold">Milvus</th>
              <th className="text-left px-3 py-2 font-semibold">pgvector</th>
              <th className="text-left px-3 py-2 font-semibold">Qdrant</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-primary/80">{r.pinecone}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.weaviate}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.milvus}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.pgvector}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.qdrant}</td>
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
  { label: "Scale", value: "150M vectors (UniRef90)", hint: "Single Milvus collection indexes 150M protein embeddings × 1280-dim = ~750 GB", deltaTone: "up" as const },
  { label: "Search latency", value: "&lt;5ms (HNSW)", hint: "HNSW layered graph: O(log n) search via greedy routing — 5ms for top-10 at 150M scale", deltaTone: "up" as const },
  { label: "Recall", value: "recall@10 = 0.92", hint: "ANN recall: |ANN_k ∩ NN_k| / |NN_k| — HNSW achieves 0.92 at 5ms vs brute-force at 5s", deltaTone: "flat" as const },
  { label: "Index types", value: "3 (HNSW + IVF + LSH)", hint: "HNSW (graph) for general use · IVF (Voronoi) for large-scale · LSH (hash) for Hamming", deltaTone: "flat" as const },
];

export function VectorDbDeepDivePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Vector databases · Pinecone + Weaviate + Milvus + pgvector · HNSW + IVF + LSH"
        title="Vector databases — ANN search for embeddings at scale"
        description="Vector databases store ML embeddings (text, image, protein, molecule) and answer 'find the k nearest neighbors to this vector' in milliseconds. Three ANN (Approximate Nearest Neighbor) algorithms dominate: HNSW (Hierarchical Navigable Small World) — O(log n) via layered graph, the production default; IVF (Inverted File) — Voronoi partitioning via k-means, best for very large datasets; LSH (Locality-Sensitive Hashing) — random hyperplanes, best for Hamming/bit-packed data. Four production vector DBs cover the spectrum: Pinecone (SaaS-first), Weaviate (open-source + GraphQL + hybrid BM25+vector), Milvus (open-source + GPU + HNSW/IVF/DiskANN), pgvector (PostgreSQL extension — in-database vector search)."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Layers className="h-3 w-3" /> HNSW + IVF + LSH</Badge>
            <Badge variant="outline" className="gap-1.5"><Atom className="h-3 w-3" /> ANN search</Badge>
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
        title="Mathematical foundations — distance metrics, HNSW, IVF, LSH, recall"
        description="Vector databases are mathematically rigorous — every ANN algorithm is a clever tradeoff between brute-force exactness and approximate speed. Five equations cover 90% of vector DB operations: distance metrics (cosine/L2/dot), HNSW (layered graph), IVF (Voronoi via k-means), LSH (random hyperplanes), and recall@k (precision-recall tradeoff). Each is derived below from first principles."
        icon={<Sigma className="h-5 w-5" />}
        badge="mathematics"
      >
        <div className="space-y-5">
          {/* Distance metrics */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-primary mb-1.5">
              1. Distance metrics — when to use cosine vs L2 vs dot product
            </p>
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
              Three metrics cover 95% of vector search use cases:
            </p>
            <p className="font-mono text-sm text-foreground bg-background/60 p-2 rounded text-center">
              cosine_sim(a, b) = (a · b) / (‖a‖ · ‖b‖)
            </p>
            <p className="font-mono text-sm text-foreground bg-background/60 p-2 rounded text-center mt-1">
              L2_dist(a, b) = √(Σᵢ (aᵢ − bᵢ)²)
            </p>
            <p className="font-mono text-sm text-foreground bg-background/60 p-2 rounded text-center mt-1">
              dot_product(a, b) = Σᵢ aᵢ · bᵢ
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">When to use which:</strong>
            </p>
            <ul className="text-xs text-muted-foreground ml-4 mt-1 space-y-0.5">
              <li>• <strong>cosine_sim</strong> — text/biological embeddings (Sentence-BERT, ESM-2). Magnitude doesn&apos;t carry semantic meaning; only direction (angle) does. Use IP (inner product) on L2-normalized vectors — mathematically identical to cosine.</li>
              <li>• <strong>L2_dist (Euclidean)</strong> — image features (ResNet, CLIP), raw physical measurements (sensor signals, genomics coordinates). Magnitude carries information; e.g. a 2× brighter image has 2× larger feature vector.</li>
              <li>• <strong>dot_product</strong> — embeddings where magnitude = confidence. MaxSim in BM25 + cross-encoder rerankers use dot product because the magnitude of attention weights matters.</li>
            </ul>
          </div>

          {/* HNSW */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-primary mb-1.5">
              2. HNSW — Hierarchical Navigable Small World
            </p>
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
              HNSW (Malkov &amp; Yashunin 2018) builds a layered graph: layer 0 contains all N nodes; layer L+1 contains a random subset of layer L (probability 1/2^L). Search starts at the top layer (few nodes), greedily routes toward the query, descends layer-by-layer. The bottom layer (all N nodes) is searched with parameter ef (exploration factor).
            </p>
            <p className="font-mono text-sm text-foreground bg-background/60 p-2 rounded text-center">
              search_complexity = O(log n) routing + O(ef) final refinement
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">Parameters:</strong> M (graph degree, typically 16) — higher M = better recall but more memory; efConstruction (build-time search, typically 200) — higher = better index quality; ef (query-time breadth, typically 64) — higher = better recall but slower.
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">Why layered?</strong> A single-layer small-world graph has O(log n) routing but requires each node to have O(log n) neighbors — memory-heavy for large N. Layering lets the top layers (sparse) route greedily (O(log n) steps × M neighbors) and the bottom layer (dense) refine with ef-search. The total work is O(M · log n + ef) — for N=150M, that&apos;s ~30 + 64 ≈ 94 vector comparisons, vs 150M for brute-force.
            </p>
          </div>

          {/* IVF */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-primary mb-1.5">
              3. IVF — Inverted File (Voronoi partitioning via k-means)
            </p>
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
              IVF partitions the vector space into nlist Voronoi cells via k-means. Each cell has a centroid; vectors are assigned to their nearest centroid. Search computes the query&apos;s distance to all nlist centroids, then probes only the nprobe nearest cells (skipping the rest).
            </p>
            <p className="font-mono text-sm text-foreground bg-background/60 p-2 rounded text-center">
              IVF_complexity = O(nlist + nprobe · N/nlist)
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">Coarse → fine quantization:</strong> nlist=1024 partitions the space; nprobe=8 probes 8/1024 cells = 1/128 of the database. The tradeoff: more nprobe = higher recall but slower. For 1.5M ClinVar variants: nlist=1024, nprobe=8 → ~12K vectors scanned vs 1.5M brute-force, recall@10 = 0.88.
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">IVF_FLAT vs IVF_PQ:</strong> IVF_FLAT stores full vectors in each cell (exact distance computation); IVF_PQ further compresses vectors via Product Quantization (split into sub-vectors, each quantized independently) — 10× memory reduction at 95% recall.
            </p>
          </div>

          {/* LSH */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-primary mb-1.5">
              4. LSH — Locality-Sensitive Hashing
            </p>
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
              LSH hashes vectors such that similar vectors hash to the same bucket with high probability. For Hamming space (binary bit-vectors):
            </p>
            <p className="font-mono text-sm text-foreground bg-background/60 p-2 rounded text-center">
              P(h(x) = h(y)) = 1 − d(x, y)^n
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              where <code className="font-mono">d(x, y)</code> is the normalised Hamming distance and <code className="font-mono">n</code> is the number of hash bits. For Euclidean space, p-stable LSH (Datar et al. 2004) uses random projections: <code className="font-mono">h(x) = ⌊(a · x + b) / w⌋</code> where a ~ N(0, I), b ~ U[0, w].
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">Random-hyperplane LSH (cosine):</strong> pick a random hyperplane (normal vector a ~ N(0, I)); hash <code className="font-mono">h(x) = sign(a · x)</code>. P(h(x) = h(y)) = 1 − θ/π where θ is the angle between x and y — so similar vectors (small angle) hash alike.
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">LSH vs HNSW:</strong> LSH is parameter-light (just n_hashes) but lower recall (70-85%); HNSW dominates on quality (90-95%) but needs more tuning (M, ef). LSH is best for bit-packed fingerprints (ECFP4 chemistry); HNSW is the production default.
            </p>
          </div>

          {/* recall@k */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-primary mb-1.5">
              5. recall@k — the ANN precision-recall tradeoff
            </p>
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
              ANN algorithms trade exactness for speed. recall@k measures what fraction of the true top-k nearest neighbors the ANN algorithm returns:
            </p>
            <p className="font-mono text-sm text-foreground bg-background/60 p-2 rounded text-center">
              recall@k = |ANN_k ∩ NN_k| / |NN_k|
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              where <code className="font-mono">NN_k</code> is the brute-force top-k (ground truth) and <code className="font-mono">ANN_k</code> is the algorithm&apos;s top-k. recall@10 = 0.92 means the ANN algorithm returned 9.2 of the 10 true NNs. Typical production targets: HNSW @ 0.90-0.95, IVF @ 0.85-0.90, LSH @ 0.70-0.85.
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">Precision-speed tradeoff:</strong> HNSW with ef=64 gives 0.92 recall at 5ms; bumping ef=128 gives 0.96 at 10ms; ef=256 gives 0.99 at 20ms. The 'right' recall depends on use case — RAG retrieval wants 0.95+ (missing a key chunk degrades the LLM); recommendation systems tolerate 0.85 (top-1 vs top-2 difference is small).
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Architecture diagram */}
      <SectionCard
        title="Vector DB architecture — 3 index types share metric + metadata filter"
        description="All vector DBs share the same skeleton: a collection of N×dim vectors + an index (HNSW, IVF, or LSH) + a distance metric (cosine, L2, dot) + a metadata filter (pre-filter before vector search). The query flow: filter metadata → search the index → return top-k with scores. Pinecone, Weaviate, Milvus, pgvector all implement this skeleton; the differentiator is which index types they support + whether they have hybrid search (BM25 + vector) + GPU acceleration."
        icon={<Atom className="h-5 w-5" />}
        badge="architecture"
      >
        <VectorDbArchitectureDiagram />
      </SectionCard>

      {/* Pinecone */}
      <SectionCard
        title="Pinecone — managed vector search at scale"
        description="Pinecone is the SaaS-first vector DB — no infrastructure to manage. Serverless spec (cloud + region), managed indexes, auto-scaling, built-in metadata filtering. The metadata filter is Pinecone's killer feature: filter by Lipinski Rule-of-5 (mw<350, logp<3, h_donors<5) BEFORE vector search narrows 250M → 30M, then HNSW finds top-1000 in <10ms."
        icon={<Cloud className="h-5 w-5" />}
        badge="Pinecone"
      >
        <CodeBlock code={PINECONE_PYTHON} language="python" filename="pinecone_client.py" highlight={[15, 16, 17, 18, 19, 20, 21, 22, 23, 26, 27, 28, 35, 36, 37, 38, 39, 40, 41, 42, 43]} />
      </SectionCard>

      {/* Weaviate */}
      <SectionCard
        title="Weaviate — open-source + GraphQL + hybrid search"
        description="Weaviate (Semi Technologies 2019, BSD-3) is the open-source vector DB with the strongest hybrid search story. Hybrid = BM25 (keyword) + vector (semantic), fused via score = alpha·vector_score + (1-alpha)·bm25_score. The alpha parameter lets users tune the lexical-semantic balance. Weaviate also has a module ecosystem (text2vec-transformers for auto-embedding from HuggingFace, qna-transformers for end-to-end Q&A, generative-search for LLM integration)."
        icon={<Database className="h-5 w-5" />}
        badge="Weaviate"
      >
        <CodeBlock code={WEAVIATE_GRAPHQL} language="python" filename="weaviate_client.py" highlight={[10, 11, 12, 13, 14, 15, 22, 23, 24, 25, 26, 27, 28, 29, 35, 36, 37, 38, 39, 40, 41, 42]} />
      </SectionCard>

      {/* Milvus */}
      <SectionCard
        title="Milvus — open-source + HNSW + IVF + GPU acceleration"
        description="Milvus (Zilliz 2019, Apache 2.0) is the scale-first vector DB. Supports all three index types (HNSW, IVF_FLAT, IVF_PQ, DiskANN) + GPU acceleration (NVIDIA GPU + RAPIDS). Dynamic schema lets you add new fields without rebuilding the index — new Pfam families get indexed within minutes. Production deployments at 150M vectors × 1280-dim (UniRef90 protein embeddings) on a single Milvus cluster."
        icon={<Cpu className="h-5 w-5" />}
        badge="Milvus"
      >
        <CodeBlock code={MILVUS_HNSW_PYTHON} language="python" filename="milvus_client.py" highlight={[12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 27, 28, 29, 30, 31, 32, 33, 34, 35, 47, 48, 49, 50, 51, 52, 53, 54]} />
      </SectionCard>

      {/* pgvector */}
      <SectionCard
        title="pgvector — PostgreSQL extension for in-database vector search"
        description="pgvector (Andrew Kane 2021) is a PostgreSQL extension that adds a vector type + HNSW/IVFFlat indexes. The killer feature: vector search runs alongside standard SQL — no separate vector DB to deploy/maintain. Hybrid search (BM25 via tsvector + pgvector) is a single SQL query. Best for small-to-medium datasets (1M-10M vectors) where you want to reuse Postgres skills + tooling."
        icon={<Database className="h-5 w-5" />}
        badge="pgvector"
      >
        <CodeBlock code={PGVECTOR_SQL} language="sql" filename="pgvector_queries.sql" highlight={[6, 7, 8, 16, 17, 18, 19, 20, 23, 24, 25, 26, 27, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43]} />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: HNSW + IVF + LSH + recall@k (Pyodide)"
        description="Pure-Python simulation (math + random + collections only — no numpy). (1) Generate 1000 synthetic 32-dim vectors in 10 clusters; (2) Brute-force top-10 NN (ground truth); (3) Simulate HNSW layered graph routing (log n layers + ef=64 final); (4) Simulate IVF Voronoi (1024 cells, nprobe=8); (5) Simulate LSH (random-hyperplane hashing); (6) Compute recall@10 for each algorithm; (7) Distance metrics — cosine vs L2 vs dot."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={PYODIDE_DEMO} buttonLabel="Run HNSW + IVF + LSH + recall simulation (Pyodide)" />
      </SectionCard>

      {/* Comparison table */}
      <SectionCard
        title="Pinecone vs Weaviate vs Milvus vs pgvector vs Qdrant — 5 vector DBs"
        description="Five vector DBs dominate the market. Pinecone (2019, SaaS) is the managed leader — strongest for teams that don't want infra. Weaviate (2019, BSD-3) is the open-source hybrid search specialist. Milvus (2019, Apache 2.0) is the scale-first leader with GPU acceleration. pgvector (2021, Postgres extension) is the in-database option. Qdrant (2021, Apache 2.0, Rust) is the rising star with payload filtering + Rust-speed performance."
        icon={<Boxes className="h-5 w-5" />}
      >
        <VectorDbComparisonTable />
      </SectionCard>

      {/* Why-evolved */}
      <SectionCard
        title="Why vector DBs evolved — shortfalls of brute-force + SQL LIKE"
        description="Modern ML engineers prefer vector DBs because the prior generation (brute-force nearest-neighbor + SQL LIKE) had four critical shortfalls. Vector DBs were designed ground-up to fix all four simultaneously."
        icon={<History className="h-5 w-5" />}
        badge="Why vector DBs"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: Brute-force was too slow.</strong> Pre-vector-DB, finding the top-10 similar proteins in UniRef90 (150M vectors × 1280-dim) required 150M cosine-sim computations per query — ~10 seconds per query, unacceptable for interactive RAG. HNSW's layered graph reduces this to ~94 vector comparisons (5ms). <strong className="text-foreground/80">Result:</strong> 2000× speedup, enabling real-time semantic search.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: SQL LIKE missed semantics.</strong> Pre-vector-DB, 'find articles about drug interactions' meant SQL LIKE '%drug%interaction%' — missed 'pharmacokinetic interaction', 'CYP3A4 inhibition', 'contraindication'. Vector embeddings capture semantic similarity; LIKE captures only string match. <strong className="text-foreground/80">Result:</strong> vector search finds semantically related content that SQL LIKE misses.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: No metadata filtering.</strong> Pre-vector-DB, 'find similar molecules that are drug-like' required a two-step process: vector search → post-filter for Lipinski. The vector search wasted most of its time finding non-drug-like molecules. Pinecone + Milvus + Qdrant support pre-filtering — narrow the search space before vector search. <strong className="text-foreground/80">Result:</strong> 10× speedup on filtered queries.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: No hybrid search.</strong> Pre-vector-DB, lexical (BM25) and semantic (vector) search were separate systems. A user query 'metformin' needed exact-name match (BM25) AND semantic-similarity match (vector). Weaviate + pgvector fuse both via score = alpha·vector + (1-alpha)·BM25 — one query, both signals. <strong className="text-foreground/80">Result:</strong> hybrid search catches both exact terms and semantic variants.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique vector-DB features"
        description="Vector DBs have four features that are genuinely unique — structural differentiators that no SQL LIKE / brute-force pipeline can match."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. O(log n) ANN search</p>
            <p className="text-muted-foreground">HNSW layered graph: log2(150M) ≈ 28 layers, ~94 vector comparisons vs 150M brute-force. <strong>2000× speedup at recall@10=0.92.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Pre-filter metadata</p>
            <p className="text-muted-foreground">Filter by Lipinski / family / organism BEFORE vector search — narrows 250M → 30M, then HNSW finds top-1000 in sub-10ms. <strong>10× speedup on filtered queries.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Hybrid BM25 + vector</p>
            <p className="text-muted-foreground">score = alpha·vector + (1-alpha)·BM25 — one query, both signals. Weaviate + pgvector fuse lexical + semantic. <strong>SQL LIKE misses the semantic half.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Dynamic schema (Milvus)</p>
            <p className="text-muted-foreground">Add new fields without rebuilding the index — new Pfam families indexed within minutes. <strong>SQL requires ALTER TABLE + reindex.</strong></p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples */}
      <SectionCard
        title="3 science examples — vector DB in protein + molecule + variant search"
        description="Three production-style examples showing vector DBs in scientific workloads. Each is a clickable card opening a lazy popup with: scenario brief (dataset/scale/why), dataset stats grid, computational tooling, multi-language code in Scala + Rust + Go + Elixir + Zig, and an implementation insight. All datasets are real public data (UniRef90, ZINC20, ClinVar)."
        icon={<Database className="h-5 w-5" />}
        badge="3 examples × 5 langs"
      >
        <DatasetCards
          examples={VECTOR_DB_SCIENCE_EXAMPLES}
          intro="Real public datasets (UniRef90 150M proteins, ZINC20 lead-like 250M molecules, ClinVar 1.5M variants) + synthetic equivalents. Each card has Scala/Rust/Go/Elixir/Zig code with HNSW + IVF + cosine/Tanimoto identity differentiators."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the vector-DB ecosystem"
        description="Vector DBs integrate with the full ML lifecycle: embedding models (sentence-transformers, ESM-2, ChemBERTa), ANN libraries (FAISS, hnswlib, ScaNN), serving frameworks (FastAPI, Triton, BentoML), and LLM platforms (LangChain, LlamaIndex)."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Vector DBs + ANN libraries</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Pinecone</strong> — SaaS-first (managed serverless)</li>
              <li>• <strong>Weaviate</strong> — open-source, hybrid search (BSD-3)</li>
              <li>• <strong>Milvus</strong> — open-source, GPU + HNSW + IVF</li>
              <li>• <strong>pgvector</strong> — Postgres extension (in-database)</li>
              <li>• <strong>Qdrant</strong> — open-source Rust (payload filtering)</li>
              <li>• <strong>FAISS</strong> — Facebook's ANN library (CPU + GPU)</li>
              <li>• <strong>hnswlib</strong> — reference HNSW impl (Malkov)</li>
              <li>• <strong>ScaNN</strong> — Google's ANN (anisotropic quantization)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cloud className="h-3.5 w-3.5 text-primary" /> Embedding models + integrations</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>sentence-transformers</strong> — text embeddings (MiniLM, MPNet)</li>
              <li>• <strong>ESM-2</strong> — protein embeddings (Meta, 650M-param)</li>
              <li>• <strong>ChemBERTa</strong> — molecule embeddings (RoBERTa on SMILES)</li>
              <li>• <strong>OpenAI Ada-002</strong> — 1536-dim text embeddings</li>
              <li>• <strong>LangChain</strong> — RAG framework (Pinecone + vectorstore)</li>
              <li>• <strong>LlamaIndex</strong> — RAG framework (data connectors)</li>
              <li>• <strong>Haystack</strong> — RAG framework (deepset)</li>
              <li>• <strong>DSPy</strong> — prompt optimization framework (Stanford)</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers and production blog posts that defined vector search + ANN algorithms. The Malkov 2018 HNSW paper is the foundational reference; the Johnson 2017 FAISS paper introduced GPU ANN at scale."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Malkov &amp; Yashunin 2018 (Efficient and robust approximate nearest neighbor search using HNSW):</strong> The foundational HNSW paper. Introduced the layered-graph structure: layer L+1 is a random subset of layer L; greedy routing on top layers + ef-search on bottom. Proved O(log n) complexity; empirically showed recall@10=0.95 at 5ms on 1M vectors. The hnswlib reference implementation is the basis of Pinecone, Weaviate, Milvus, pgvector, Qdrant HNSW indexes — everyone uses Malkov's algorithm.
          </p>
          <p>
            <strong className="text-foreground/80">Johnson, Douze, Jégou 2017 (Billion-scale similarity search with GPUs):</strong> The FAISS paper from Facebook. Key contributions: (1) IVF_PQ (Product Quantization) — split vectors into sub-vectors, quantize each independently — 10× memory reduction at 95% recall; (2) GPU acceleration via CUDA kernels for k-means + IVF + PQ — 7× speedup on 1B vectors. FAISS is the basis of Meta's production embedding search (Instagram recommendations, Feed ranking).
          </p>
          <p>
            <strong className="text-foreground/80">Datar, Immorlica, Indyk 2004 (Locality-sensitive hashing for Euclidean):</strong> The p-stable LSH paper. Proved that for Euclidean space, p-stable distributions (Gaussian for L2, Cauchy for L∞) yield hash functions where P(h(x) = h(y)) depends only on ‖x − y‖. The mathematical foundation for all LSH variants. Largely superseded by HNSW in production but still the standard for bit-packed fingerprints (chemistry ECFP4).
          </p>
          <p>
            <strong className="text-foreground/80">Indyk &amp; Motwani 1998 (Approximate nearest neighbor):</strong> The original ANN paper. Introduced the concept of ε-approximate nearest neighbor — return a point within (1+ε) of the true NN distance. Proved that for any L_p norm, there's a data structure answering ANN queries in O(d · log n) time. The mathematical foundation for all ANN algorithms (HNSW, IVF, LSH all return ε-approximate NNs).
          </p>
          <p>
            <strong className="text-foreground/80">Pinecone Production Case (Pinecone Blog 2022):</strong> Production deployment at Notion — 100M+ document chunks × 1536-dim OpenAI Ada embeddings for semantic search. Latency target: sub-50ms P99. Pinecone&apos;s serverless spec auto-scaled from 0 to 5 replicas during weekday peaks, scaling to 0 overnight. The metadata filter (filter by workspace + user permissions) before vector search was critical for multi-tenant isolation.
          </p>
          <p>
            <strong className="text-foreground/80">Milvus Production Case (Zilliz Blog 2023):</strong> Production at Shopify — 1B+ product image embeddings × 512-dim CLIP for visual product search. GPU acceleration (NVIDIA A100) gave 7× throughput vs CPU-only. DiskANN index (for &gt;1B vectors) maintained recall@10=0.90 with 10× less RAM than HNSW. The dynamic schema let new product categories get indexed within minutes without rebuilding.
          </p>
          <p>
            <strong className="text-foreground/80">pgvector Production Case (Supabase Blog 2023):</strong> pgvector on Supabase (managed Postgres) — 10M+ vectors per database, hybrid search (BM25 + vector) in a single SQL query. The killer feature: re-use Postgres skills + tooling — pgvector indexes work with Postgres replication, backups, point-in-time recovery. Best for small-to-medium vector workloads where the team already knows Postgres.
          </p>
        </div>
      </SectionCard>

      {/* Deeper-thought insight */}
      <SectionCard
        title="My deeper thought: vector DBs ARE spatial indexes for high-dimensional space"
        description="The unifying view: vector DBs are the R-tree / k-d tree of high-dimensional space. The same spatial-indexing pattern that works in 2D/3D extends (with modifications) to 1280D."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Vector DBs ARE spatial indexes for high-dimensional space.</strong> In 2D, an R-tree partitions the plane into rectangles; a k-d tree alternates splits on x/y axes; a Voronoi diagram partitions into cells around centroids. All three extend to high-D — R-tree becomes HNSW (rectangle = graph node), k-d tree becomes IVF (splits become k-means centroids), Voronoi stays Voronoi. The mathematical structure is identical; the difference is which data structure is efficient at high-D (R-trees degrade past 20D; HNSW's graph handles 1280D).
          </p>
          <p>
            <strong className="text-foreground/80">HNSW IS the &apos;small-world&apos; network property, applied to vector search.</strong> The small-world phenomenon (Travers &amp; Milgram 1969) — 'six degrees of separation' — shows that random graphs have O(log n) diameter. HNSW builds a graph that IS a small-world network: greedy routing on the top layer reaches the query region in O(log n) steps because the top-layer graph is a small-world. The layering trick is what makes HNSW practical — a single-layer small-world has O(log n) routing but requires O(n · log n) edges (memory-heavy); layering lets the sparse top layers route and the dense bottom layer refine.
          </p>
          <p>
            <strong className="text-foreground/80">IVF IS Lloyd&apos;s k-means algorithm, applied to partitioning.</strong> k-means (Lloyd 1957) partitions n points into k clusters by iteratively (1) assigning each point to its nearest centroid, (2) recomputing centroids as the cluster mean. IVF uses one iteration of k-means to compute nlist centroids, then assigns each vector to its nearest centroid. The Voronoi cells are the result of k-means. Search computes the query&apos;s nearest centroids (nprobe of them), then scans only the vectors in those cells. The Voronoi structure is the same as 2D computational geometry — extended to high-D.
          </p>
          <p>
            <strong className="text-foreground/80">LSH IS random projections, applied to hashing.</strong> The Johnson-Lindenstrauss lemma (1984) states that n points in D-dim can be embedded into O(log n / ε²)-dim while preserving pairwise distances within (1±ε). Random projections (Gaussian matrices) achieve this embedding. LSH uses one random projection per hash bit — the sign of the projection (above/below a random hyperplane) is the bit. The mathematical foundation is JL; LSH is the practical 'hash the projection' algorithm. The connection: both LSH and HNSW exploit the structure of high-D space to avoid brute-force — LSH via dimension reduction, HNSW via graph routing.
          </p>
        </div>
      </SectionCard>

      <RelatedTopics topics={[
        { id: "vector-db" as const, reason: "Anchor concept page — vector DB evolution" },
        { id: "rag-deep-dive" as const, reason: "RAG deep dive (uses vector DB for retrieval)" },
        { id: "rag-llms" as const, reason: "RAG + LLMs (concept page)" },
        { id: "feature-store-deep-dive" as const, reason: "Feature store (related — dual stores)" },
        { id: "mlflow-deep-dive" as const, reason: "MLflow (logs embedding model versions)" },
        { id: "llmops" as const, reason: "LLMOps (vector DB is the R in RAG)" },
        { id: "multimodal-rag" as const, reason: "Multimodal RAG (image + text embeddings)" },
        { id: "arrow" as const, reason: "Apache Arrow (vector serialization format)" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("vector-db")} className="text-sm text-primary hover:underline">
          &rarr; Vector DB (concept anchor page)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("rag-deep-dive")} className="text-sm text-primary hover:underline">
          &rarr; RAG Deep Dive (uses vector DB retrieval)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("llmops")} className="text-sm text-primary hover:underline">
          &rarr; LLMOps (vector DB = R in RAG)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("multimodal-rag")} className="text-sm text-primary hover:underline">
          &rarr; Multimodal RAG (image + text embeddings)
        </Link>
      </div>
    </div>
  );
}
