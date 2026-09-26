"use client";
import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Database, Layers, Terminal, TrendingUp, Brain } from "lucide-react";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";

const KPIS = [
  { label: "RAG pattern", value: "Query→Embed→Search→LLM", hint: "Retrieve Augmented Generation", deltaTone: "flat" as const },
  { label: "Vector DBs", value: "5+", hint: "Pinecone · Weaviate · Qdrant · pgvector · Milvus", deltaTone: "flat" as const },
  { label: "Embedding model", value: "text-embedding-3", hint: "OpenAI / Cohere / open-source (BGE)", deltaTone: "flat" as const },
  { label: "Platform role", value: "Gold tables", hint: "Your Gold layer becomes the LLM knowledge base", deltaTone: "flat" as const },
];

const VECTOR_DBS = [
  { name: "Pinecone", type: "Managed SaaS", free: "Starter: 1 index, 100k vectors", dims: "Up to 20k dims" },
  { name: "Weaviate", type: "OSS + managed", free: "100% OSS; cloud free trial", dims: "Any" },
  { name: "Qdrant", type: "OSS + managed", free: "1GB free on Qdrant Cloud", dims: "Any" },
  { name: "pgvector", type: "Postgres extension", free: "Free (Postgres + extension)", dims: "Up to 2k" },
  { name: "Milvus", type: "OSS", free: "100% OSS, self-hostable", dims: "Any" },
  { name: "Chroma", type: "OSS (embedded)", free: "100% OSS, in-process", dims: "Any" },
];

export function RagLlmsPage() {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="GenAI · RAG & LLMs" title="RAG & LLMs — Gold Tables as Knowledge Base"
        description="The platform's Gold tables become an LLM knowledge base via RAG (Retrieval-Augmented Generation). Query → embed → vector search → retrieve context → LLM generates answer. The data engineering stack (Bronze→Silver→Gold + Arrow + Iceberg) IS the RAG infrastructure. This is the convergence of data engineering + AI."
        right={<Badge variant="outline" className="gap-1.5"><Sparkles className="h-3 w-3" /> GenAI</Badge>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />)}
      </div>

      {/* RAG pipeline */}
      <SectionCard title="The RAG pipeline — 5 steps" icon={<Layers className="h-5 w-5" />}>
        <CodeBlock language="text" filename="rag_pipeline.txt" code={`┌─────────────────────────────────────────────────────────────────┐
│  THE RAG PIPELINE — Gold Tables → LLM Knowledge Base            │
│                                                                 │
│  1. EMBED    ─┐                                                  │
│    Gold tables │ → embed each row as a vector (1536 dims)      │
│    (fct_orders, │ → store in vector DB (pgvector / Pinecone)   │
│     dim_customer│                                                │
│     etc.)      ─┘                                                │
│                                                                 │
│  2. QUERY    ─┐                                                  │
│    User asks: │ → embed the question using same model          │
│    "What was  │ → vector: [0.12, -0.34, 0.56, ...]              │
│     UK revenue└─────────────────────────────────────────────────│
│     last Q?"                                                     │
│                                                                 │
│  3. SEARCH   ─┐                                                  │
│    Vector DB  │ → cosine similarity between query + stored      │
│    (pgvector) │ → top-k = 5 most relevant rows                   │
│    cosine sim │ → retrieved: fct_orders row (UK, Q=£2.1M)     │
│               └─────────────────────────────────────────────────│
│                                                                 │
│  4. CONTEXT  ─┐                                                  │
│    Retrieved  │ → format as context for the LLM                 │
│    rows +     │ → "Context: UK Q revenue = £2.1M, orders=1.2k"│
│    schema     └─────────────────────────────────────────────────│
│                                                                 │
│  5. GENERATE ─┐                                                  │
│    LLM (GPT/  │ → "UK revenue last quarter was £2.1M across    │
│    Claude)    │   1,200 orders. This is up 15% from the         │
│               │   previous quarter (£1.8M)."                    │
│               └─────────────────────────────────────────────────│
│                                                                 │
│  The Gold tables ARE the knowledge base.                       │
│  The LLM is the reasoning engine.                                │
│  The data platform IS the AI platform.                           │
└─────────────────────────────────────────────────────────────────┘`} />
      </SectionCard>

      {/* Vector databases */}
      <SectionCard title="Vector databases — the new query layer" icon={<Database className="h-5 w-5" />} contentClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border/60 bg-muted/40">
              <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Vector DB</th>
              <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Type</th>
              <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Free tier</th>
              <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Dimensions</th>
            </tr></thead>
            <tbody>
              {VECTOR_DBS.map((v) => (
                <tr key={v.name} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 text-xs font-semibold">{v.name}</td>
                  <td className="px-3 py-2 text-[11px] text-muted-foreground">{v.type}</td>
                  <td className="px-3 py-2 text-[11px] text-emerald-600 dark:text-emerald-400">{v.free}</td>
                  <td className="px-3 py-2 text-[11px] font-mono text-muted-foreground">{v.dims}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Insight */}
      <SectionCard title="My deeper thought: Gold tables ARE embeddings" icon={<TrendingUp className="h-5 w-5" />} badge="Insight">
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>The deepest insight in the RAG pattern: your Gold tables don't need to be "connected to" an LLM — they need to be <strong className="text-foreground/80">embedded into a vector space</strong>. Each row in fct_orders becomes a 1536-dimensional vector. The LLM doesn't query your SQL; it queries the vector space. The vector DB is the new query layer — and pgvector means it's <em>inside your existing Postgres</em>.</p>
          <p><strong className="text-foreground/80">The platform's Bronze→Silver→Gold pipeline IS the RAG ingestion pipeline.</strong> Bronze = raw source data. Silver = conformed/cleaned. Gold = embedded + vectorised + indexed. The same Airflow DAGs that refresh your BI dashboards can refresh your vector index. The same Unity Catalogue that governs PII tags governs which rows are embedded. The same CI/CD that deploys dbt models deploys embedding pipelines. One platform, many modalities.</p>
          <p>The agentic layer (ADR-019's bandit + the DQ triage agent) becomes the <strong className="text-foreground/80">intelligent query interface</strong>. Instead of writing SQL, you ask: "What was UK revenue last quarter?" The agent embeds the query, searches the Gold-table vector space, retrieves context, and generates a grounded answer. The data platform becomes a <em>conversation</em>, not a dashboard.</p>
        </div>
      </SectionCard>

      {/* Pyodide cosine similarity demo */}
      <SectionCard title="Try it: Vector similarity search (Pyodide)" icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={`# RAG simulation — cosine similarity search in pure Python
# Shows how vector search retrieves relevant rows from a "knowledge base"

import math

def cosine_similarity(v1, v2):
    "Cosine sim = dot(a,b) / (|a| * |b|). 1.0 = identical, 0.0 = orthogonal."
    dot = sum(a * b for a, b in zip(v1, v2))
    mag1 = math.sqrt(sum(a * a for a in v1))
    mag2 = math.sqrt(sum(b * b for b in v2))
    if mag1 == 0 or mag2 == 0:
        return 0.0
    return dot / (mag1 * mag2)

# Simulated embeddings (in production: 1536-dim from text-embedding model)
# Each row in the "Gold table" is embedded as a 6-dim vector
knowledge_base = [
    {"id": "row_1", "text": "UK revenue Q3 = £2.1M, 1.2k orders",
     "vector": [0.9, 0.8, 0.7, 0.1, 0.3, 0.2]},
    {"id": "row_2", "text": "EU revenue Q3 = £1.8M, 0.9k orders",
     "vector": [0.7, 0.6, 0.8, 0.2, 0.4, 0.3]},
    {"id": "row_3", "text": "NA revenue Q3 = £3.2M, 2.1k orders",
     "vector": [0.8, 0.5, 0.6, 0.9, 0.7, 0.4]},
    {"id": "row_4", "text": "VIP customer churn rate = 3.2%",
     "vector": [0.1, 0.2, 0.1, 0.8, 0.9, 0.7]},
    {"id": "row_5", "text": "Returns rate UK = 6.4%, 78 returns",
     "vector": [0.9, 0.7, 0.8, 0.1, 0.2, 0.5]},
]

# User query: "What was UK revenue?"
# Embed using the same model (simulated as a vector)
query = "What was UK revenue last quarter?"
query_vector = [0.92, 0.75, 0.68, 0.05, 0.25, 0.15]

# Vector search — compute cosine similarity against all rows
results = []
for row in knowledge_base:
    sim = cosine_similarity(query_vector, row["vector"])
    results.append((row, sim))

# Sort by similarity (descending) — top-k retrieval
results.sort(key=lambda x: x[1], reverse=True)
top_k = 3

print("=" * 60)
print("RAG Vector Search — Cosine Similarity Retrieval")
print("=" * 60)
print(f"\\nQuery: '{query}'")
print(f"Query vector: {[round(v, 2) for v in query_vector]}")
print(f"\\nSearching {len(knowledge_base)} rows in knowledge base...")

print(f"\\nTop-{top_k} results (cosine similarity):")
for i, (row, sim) in enumerate(results[:top_k]):
    print(f"  {i+1}. [{row['id']}] sim={sim:.4f}")
    print(f"     → {row['text']}")

# Build context for the LLM
context = "\\n".join(f"- {r[0]['text']}" for r in results[:top_k])
print(f"\\n{'=' * 60}")
print("CONTEXT FOR LLM (top-3 retrieved rows):")
print(f"  {context}")
print(f"\\nLLM prompt: 'Based on this data: {context}\\n  Answer: What was UK revenue last quarter?'")
print(f"\\nExpected LLM output: 'UK revenue last quarter was £2.1M")
print(f"  across 1,200 orders. Returns rate was 6.4%.'")
print("=" * 60)`} buttonLabel="Run RAG vector search (Pyodide)" />
      </SectionCard>

      {/* LangChain code */}
      <SectionCard title="LangChain — the RAG orchestrator" icon={<Brain className="h-5 w-5" />}>
        <CodeBlock language="python" filename="rag_pipeline.py" highlight={[5,6,7,8,9,10,13,14,15,18,19,20,21,22,23]} code={`from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import PGVector
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import RetrievalQA
from langchain.llms import OpenAI

# 1. EMBED — Gold table rows → vectors
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
# Each row in fct_orders/dim_customer → 1536-dim vector

# 2. STORE — vectors in pgvector (inside your existing Postgres)
vectorstore = PGVector(
    connection_string="postgresql://moderndatascieng-db:5432/rag",
    embedding_function=embeddings,
)

# 3. INDEX — ingest Gold table rows as documents
docs = [{"page_content": str(row), "metadata": {"table": "fct_orders"}}
        for row in gold_table_rows]
vectorstore.add_documents(docs)

# 4. RETRIEVE — vector search on user query
retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

# 5. GENERATE — LLM answers grounded in retrieved context
qa_chain = RetrievalQA.from_chain_type(
    llm=OpenAI(temperature=0),
    chain_type="stuff",
    retriever=retriever,
)

answer = qa_chain.run("What was UK revenue last quarter?")
# → "UK revenue last quarter was £2.1M across 1,200 orders."`} />
      </SectionCard>


      <DeeperThoughtSection pageTitle="RAG & LLMs">
        <DeeperThought title="RAG & LLMs IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about RAG & LLMs is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. RAG & LLMs connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where RAG & LLMs sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (RAG & LLMs) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
        <Link href={hrefFor("neural-networks")} className="text-sm text-primary hover:underline">→ Neural Networks (Transformer architecture)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("ml-platform")} className="text-sm text-primary hover:underline">→ ML Platform (MLOps lifecycle)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">→ See ADR-021 (ONNX) + ADR-020 (MLflow)</Link>
      </div>
    </div>
  );
}
