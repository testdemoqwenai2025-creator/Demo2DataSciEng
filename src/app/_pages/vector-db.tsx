"use client";
import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Database, Terminal, Zap, Cloud } from "lucide-react";

const KPIS = [
  { label: "Default (ADR-022)", value: "pgvector", hint: "Inside Postgres — zero new infra", deltaTone: "flat" as const },
  { label: "Search latency", value: "< 10ms", hint: "HNSW index on 1M vectors", deltaTone: "flat" as const },
  { label: "Scale threshold", value: "100M", hint: "Above: switch to Pinecone/Weaviate", deltaTone: "flat" as const },
  { label: "Distance metric", value: "Cosine", hint: "Also: L2 (Euclidean), inner product", deltaTone: "flat" as const },
];

const COMPARE = [
  { name: "pgvector", type: "Postgres ext", free: "100% OSS (PostgreSQL License)", pros: "Zero new infra, SQL-native, ACID", cons: "Not for >100M vectors" },
  { name: "Pinecone", type: "Managed SaaS", free: "Starter: 1 index, 100k vectors", pros: "Fully managed, auto-scaling", cons: "External dependency, cost at scale" },
  { name: "Weaviate", type: "OSS + managed", free: "100% OSS; cloud free trial", pros: "GraphQL + REST, modules ecosystem", cons: "Separate service to operate" },
  { name: "Qdrant", type: "OSS (Rust)", free: "1GB free on Cloud", pros: "Rust-native, fastest filter+search", cons: "Smaller ecosystem" },
  { name: "Chroma", type: "OSS (embedded)", free: "100% OSS, in-process", pros: "Easiest setup, Python-native", cons: "Not for production scale" },
  { name: "Milvus", type: "OSS (Go/C++)", free: "100% OSS, self-hostable", pros: "Scales to billions of vectors", cons: "Complex to operate, heavy" },
];

export function VectorDbPage() {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="GenAI · vector databases" title="Vector Databases — pgvector vs Pinecone vs Weaviate vs Qdrant"
        description="Where do RAG embeddings live? ADR-022 chose pgvector — vectors inside your existing Postgres, SQL-native, zero new infrastructure. Pinecone/Weaviate/Qdrant reserved for >100M vector scale. Here's the full comparison + a Pyodide demo showing how vector operations work."
        right={<Badge variant="outline" className="gap-1.5"><Database className="h-3 w-3" /> ADR-022</Badge>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />)}
      </div>
      <SectionCard title="pgvector — SQL-native vector search" icon={<Database className="h-5 w-5" />} contentClassName="p-0">
        <CodeBlock language="sql" filename="pgvector_demo.sql" highlight={[4,5,6,7,8,11,12,13,14,15,18,19,20]} code={`-- pgvector: vectors inside Postgres (ADR-022)

-- 1. Enable extension + create table with vector column
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE gold_embeddings (
    id          TEXT PRIMARY KEY,
    table_name  TEXT NOT NULL,
    row_data    JSONB NOT NULL,
    embedding   vector(1536)  -- 1536-dim from text-embedding model
);

-- 2. Create HNSW index for sub-10ms cosine similarity search
CREATE INDEX ON gold_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- 3. Vector search — cosine similarity, top-5
--    The <=> operator = cosine distance (1 - similarity)
SELECT id, table_name, row_data,
       1 - (embedding <=> '[0.12, -0.34, ...]'::vector) AS similarity
FROM gold_embeddings
ORDER BY embedding <=> '[0.12, -0.34, ...]'::vector
LIMIT 5;

-- 4. Filtered vector search — combine SQL filters + vector search
SELECT id, row_data
FROM gold_embeddings
WHERE table_name = 'fct_orders'
  AND row_data->>'region_code' = 'UK'
ORDER BY embedding <=> $query_vector
LIMIT 5;

-- 5. Hybrid search — full-text + vector (BM25 + cosine)
SELECT id, ts_rank(to_tsvector(row_data::text), plainto_tsquery($query)) AS text_rank,
       1 - (embedding <=> $query_vector) AS vec_sim
FROM gold_embeddings
ORDER BY (text_rank * 0.3 + vec_sim * 0.7) DESC
LIMIT 5;`} />
      </SectionCard>
      <SectionCard title="Vector DB comparison" icon={<Cloud className="h-5 w-5" />} contentClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border/60 bg-muted/40">
              <th className="text-left px-3 py-2 text-[10px] uppercase text-muted-foreground">DB</th>
              <th className="text-left px-3 py-2 text-[10px] uppercase text-muted-foreground">Type</th>
              <th className="text-left px-3 py-2 text-[10px] uppercase text-muted-foreground">Free tier</th>
              <th className="text-left px-3 py-2 text-[10px] uppercase text-muted-foreground">Pros</th>
              <th className="text-left px-3 py-2 text-[10px] uppercase text-muted-foreground">Cons</th>
            </tr></thead>
            <tbody>
              {COMPARE.map((c) => (
                <tr key={c.name} className={`border-b border-border/40 last:border-0 ${c.name === "pgvector" ? "bg-primary/5" : ""}`}>
                  <td className="px-3 py-2 text-xs font-semibold">{c.name}</td>
                  <td className="px-3 py-2 text-[11px] text-muted-foreground">{c.type}</td>
                  <td className="px-3 py-2 text-[11px] text-emerald-600 dark:text-emerald-400">{c.free}</td>
                  <td className="px-3 py-2 text-[11px] text-foreground/80">{c.pros}</td>
                  <td className="px-3 py-2 text-[11px] text-muted-foreground">{c.cons}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <SectionCard title="Try it: Vector operations (Pyodide)" icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={`# Vector operations — the math behind vector search
# Shows cosine similarity, L2 distance, dot product, HNSW concept

import math

def cosine_sim(v1, v2):
    dot = sum(a*b for a,b in zip(v1,v2))
    mag1 = math.sqrt(sum(a*a for a in v1))
    mag2 = math.sqrt(sum(b*b for b in v2))
    return dot / (mag1 * mag2) if mag1 and mag2 else 0

def l2_distance(v1, v2):
    return math.sqrt(sum((a-b)**2 for a,b in zip(v1,v2)))

def dot_product(v1, v2):
    return sum(a*b for a,b in zip(v1,v2))

# Simulate a vector index with 5 documents
docs = [
    {"id": "doc_1", "text": "UK revenue Q3 = £2.1M",  "vec": [0.9, 0.8, 0.7, 0.1, 0.3]},
    {"id": "doc_2", "text": "EU revenue Q3 = £1.8M",  "vec": [0.7, 0.6, 0.8, 0.2, 0.4]},
    {"id": "doc_3", "text": "NA returns rate = 6.4%", "vec": [0.1, 0.2, 0.1, 0.9, 0.8]},
    {"id": "doc_4", "text": "VIP churn = 3.2%",      "vec": [0.2, 0.1, 0.3, 0.8, 0.9]},
    {"id": "doc_5", "text": "UK orders = 1.2k",       "vec": [0.85, 0.75, 0.65, 0.15, 0.25]},
]

query = [0.92, 0.78, 0.72, 0.05, 0.28]

print("=" * 60)
print("Vector DB Operations — Distance Metrics Comparison")
print("=" * 60)
print(f"\\nQuery vector: {[round(v,2) for v in query]}")
print(f"\\n{'Doc':<8} {'Cosine':<10} {'L2 dist':<10} {'Dot':<10} {'Text'}")
print("-" * 60)

results = []
for doc in docs:
    cs = cosine_sim(query, doc["vec"])
    l2 = l2_distance(query, doc["vec"])
    dp = dot_product(query, doc["vec"])
    results.append((doc, cs, l2, dp))
    print(f"  {doc['id']:<6} {cs:<10.4f} {l2:<10.4f} {dp:<10.4f} {doc['text']}")

# Top-3 by cosine similarity (what pgvector does)
results.sort(key=lambda x: x[1], reverse=True)
print(f"\\n{'=' * 60}")
print("Top-3 by cosine similarity (pgvector <=> operator):")
for i, (doc, cs, l2, dp) in enumerate(results[:3]):
    print(f"  {i+1}. {doc['id']} sim={cs:.4f} → {doc['text']}")

# HNSW concept
print(f"\\n{'=' * 60}")
print("HNSW Index concept:")
print("  - Hierarchical Navigable Small World graph")
print("  - Builds multi-layer graph for fast approximate search")
print("  - O(log N) search vs O(N) brute force")
print("  - Trade-off: approximate (recall ~98%) vs exact (100%)")
print(f"  - For 1M vectors: brute force ~1000ms, HNSW ~8ms")
print("=" * 60)`} buttonLabel="Run vector operations (Pyodide)" />
      </SectionCard>
      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("rag-llms")} className="text-sm text-primary hover:underline">→ RAG & LLMs</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">→ ADR-022 (pgvector)</Link>
      </div>
    </div>
  );
}
