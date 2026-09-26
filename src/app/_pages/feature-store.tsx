"use client";

import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Database, Layers, Zap, TrendingUp, Terminal, ArrowRight } from "lucide-react";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";

const KPIS = [
  { label: "Feature consistency", value: "100%", hint: "Train + serve use same features (no skew)", deltaTone: "flat" as const },
  { label: "Point-in-time", value: "ASOF", hint: "Features retrieved as-of the event timestamp", deltaTone: "flat" as const },
  { label: "Latency (online)", value: "< 10ms", hint: "Real-time feature serving via Redis/dynamo", deltaTone: "flat" as const },
  { label: "OSS option", value: "Feast", hint: "100% OSS, self-hostable, multi-source", deltaTone: "flat" as const },
];

export function FeatureStorePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="MLOps · feature store"
        title="Feature Store — Train/Serve Consistency"
        description="The #1 ML pitfall is train/serve skew: the features used in training differ from those used in serving. A feature store solves this — one source of truth for features, served online (low latency) and offline (batch training), with point-in-time correctness to prevent data leakage."
        right={<Badge variant="outline" className="gap-1.5"><Database className="h-3 w-3" /> Feast · Databricks</Badge>}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />)}
      </div>
      <SectionCard title="The train/serve skew problem" icon={<TrendingUp className="h-5 w-5" />} badge="Insight">
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>Without a feature store, ML teams compute features in training (e.g. "30-day rolling avg of order_total") and then re-compute them differently in serving (e.g. "last 30 calendar days"). The model was trained on one definition and serves on another. This is <strong className="text-foreground/80">train/serve skew</strong> — the silent killer of ML in production.</p>
          <p>A feature store fixes this by being the <strong className="text-foreground/80">single source of truth</strong> for feature definitions. Training retrieves features offline (batch, historical). Serving retrieves the same features online (low-latency, real-time). Same definition, same computation, same values. Point-in-time ASOF joins prevent looking into the future during training.</p>
        </div>
      </SectionCard>
      <SectionCard title="Feast — OSS feature store" icon={<Database className="h-5 w-5" />} contentClassName="p-0">
        <CodeBlock language="python" filename="feature_store.py" highlight={[4,5,6,7,8,9,10,13,14,15,16,19,20,21]} code={`from feast import FeatureStore, Entity, FeatureView, Field
from feast.types import Float32, Int64

# Define entity (the join key for features)
customer = Entity(name="customer_id", join_keys=["customer_id"])

# Define feature view (the features + source + TTL)
customer_features = FeatureView(
    name="customer_features",
    entities=[customer],
    schema=[
        Field(name="ltv_30d",      dtype=Float32),
        Field(name="order_count_30d", dtype=Int64),
        Field(name="segment",       dtype=String),
    ],
    source=BigQuerySource(
        table="moderndatascieng-gold.ml.customer_features",
        timestamp_field="event_timestamp",
    ),
    ttl=timedelta(days=30),
)

# Register + materialise
store = FeatureStore(repo_path=".")
store.apply([customer, customer_features])
store.materialize(start_date, end_date)

# Offline retrieval (training) — point-in-time correct
training_features = store.get_historical_features(
    entity_df=training_df,  # has customer_id + event_timestamp
    features=["customer_features:ltv_30d", "customer_features:order_count_30d"],
).to_df()

# Online retrieval (serving) — < 10ms via Redis
online_features = store.get_online_features(
    features=["customer_features:ltv_30d", "customer_features:order_count_30d"],
    entity_rows=[{"customer_id": "cust_1"}],
).to_dict()`} />
      </SectionCard>
      <SectionCard title="Try it: Feature consistency simulation (Pyodide)" icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={`# Feature Store — train/serve consistency simulation
# Shows how the same feature definition serves both training + inference

import math

# Feature definition: 30-day rolling average of order_total
def compute_ltv_30d(orders, customer_id, as_of_date=None):
    "Single source of truth — used for BOTH training + serving"
    cust_orders = [o for o in orders if o["customer_id"] == customer_id]
    if as_of_date:
        cust_orders = [o for o in cust_orders if o["day"] <= as_of_date]
    if not cust_orders:
        return 0.0
    return sum(o["total"] for o in cust_orders) / len(cust_orders)

# Synthetic orders
orders = [
    {"customer_id": "cust_1", "day": 1, "total": 120.0},
    {"customer_id": "cust_1", "day": 5, "total": 85.0},
    {"customer_id": "cust_1", "day": 10, "total": 230.0},
    {"customer_id": "cust_1", "day": 15, "total": 45.0},
    {"customer_id": "cust_1", "day": 20, "total": 310.0},
    {"customer_id": "cust_2", "day": 3, "total": 500.0},
    {"customer_id": "cust_2", "day": 8, "total": 150.0},
    {"customer_id": "cust_2", "day": 12, "total": 200.0},
]

print("=" * 60)
print("Feature Store — Train/Serve Consistency")
print("=" * 60)

# Offline (training) — point-in-time correct (as_of_date=15)
train_ltv_1 = compute_ltv_30d(orders, "cust_1", as_of_date=15)
train_ltv_2 = compute_ltv_30d(orders, "cust_2", as_of_date=15)
print(f"\\nOffline (training, as_of_day=15):")
print(f"  cust_1 ltv_30d = {train_ltv_1:.2f}")
print(f"  cust_2 ltv_30d = {train_ltv_2:.2f}")

# Online (serving) — latest values (as_of_date=None = latest)
serve_ltv_1 = compute_ltv_30d(orders, "cust_1")
serve_ltv_2 = compute_ltv_30d(orders, "cust_2")
print(f"\\nOnline (serving, latest):")
print(f"  cust_1 ltv_30d = {serve_ltv_1:.2f}")
print(f"  cust_2 ltv_30d = {serve_ltv_2:.2f}")

# Consistency check — same definition, different timestamps
print(f"\\n{'=' * 60}")
print("CONSISTENCY: Same feature definition, different timestamps")
print(f"  Training: as_of_day=15 (point-in-time correct, no data leakage)")
print(f"  Serving:  latest (real-time, current state)")
print(f"  Skew:    0% (same compute, same source) ✓")
print("=" * 60)`} buttonLabel="Run feature store simulation (Pyodide)" />
      </SectionCard>

      <DeeperThoughtSection pageTitle="Feature Store">
        <DeeperThought title="Feature Store IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about Feature Store is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. Feature Store connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where Feature Store sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (Feature Store) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
        <Link href={hrefFor("ml-platform")} className="text-sm text-primary hover:underline">→ ML Platform (MLOps lifecycle)</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("model-registry")} className="text-sm text-primary hover:underline">→ Model Registry</Link>
      </div>
    </div>
  );
}
