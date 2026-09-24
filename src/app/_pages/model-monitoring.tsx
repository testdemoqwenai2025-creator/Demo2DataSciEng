"use client";
import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Activity, Layers, ShieldCheck, Terminal, TrendingUp } from "lucide-react";

const KPIS = [
  { label: "Drift types", value: "3", hint: "Data drift · Concept drift · Prediction drift", deltaTone: "flat" as const },
  { label: "Detection tool", value: "Evidently", hint: "OSS, statistical tests, drift reports", deltaTone: "flat" as const },
  { label: "Retraining trigger", value: "Auto", hint: "PSI > 0.2 → trigger CI/CD retraining pipeline", deltaTone: "flat" as const },
  { label: "Monitoring latency", value: "Real-time", hint: "Live dashboards via Datadog + Evidently", deltaTone: "flat" as const },
];

export function ModelMonitoringPage() {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="MLOps · monitoring" title="Model Monitoring — Drift Detection"
        description="Models degrade in production. Data drift (input distribution changes), concept drift (the relationship between input and output changes), and prediction drift (output distribution changes) all signal that a model needs retraining. Evidently (OSS) + NannyML detect drift automatically; retraining triggers fire via CI/CD."
        right={<Badge variant="outline" className="gap-1.5"><Activity className="h-3 w-3" /> Evidently</Badge>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />)}
      </div>
      <SectionCard title="The 3 types of drift" icon={<Layers className="h-5 w-5" />}>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-1">Data Drift</p>
            <p className="text-xs text-muted-foreground">Input feature distribution changes. E.g. average customer LTV shifts from £1,200 to £1,800 after a marketing campaign targets higher-value segments. The model was trained on £1,200 — it's now out of calibration.</p>
          </div>
          <div className="rounded-md border border-rose-500/40 bg-rose-500/5 p-3">
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-1">Concept Drift</p>
            <p className="text-xs text-muted-foreground">The relationship between input and output changes. E.g. COVID shifted buying patterns — models trained on pre-COVID data predicted poorly. The world changed; the model didn't.</p>
          </div>
          <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-3">
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-1">Prediction Drift</p>
            <p className="text-xs text-muted-foreground">Output distribution changes. E.g. a churn model that used to predict 10% churn rate now predicts 25%. Either the model degraded or the population shifted. Either way: investigate.</p>
          </div>
        </div>
      </SectionCard>
      <SectionCard title="Evidently — drift detection (OSS)" icon={<ShieldCheck className="h-5 w-5" />}>
        <CodeBlock language="python" filename="drift_monitor.py" highlight={[5,6,7,8,9,10,13,14,15,18,19,20]} code={`import pandas as pd
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset, TargetDriftPreset

# Reference (training data) + Current (production data)
reference = pd.read_parquet("s3://gold/ml/features_train_v3.parquet")
current   = pd.read_parquet("s3://gold/ml/features_current.parquet")

# Generate drift report — statistical tests (KS, PSI, Wasserstein)
report = Report(metrics=[
    DataDriftPreset(),     # input feature drift
    TargetDriftPreset(),   # output/prediction drift
])
report.run(reference_data=reference, current_data=current)
report.save_html("drift_report.html")

# PSI (Population Stability Index) — the key metric
# PSI < 0.1: no drift. 0.1-0.2: minor. > 0.2: significant drift
# PSI > 0.2 → trigger retraining via CI/CD (GitHub Actions)

# Automated retraining trigger
if psi_score > 0.2:
    # Trigger Airflow DAG → retrain on latest data
    airflow.trigger_dag("retrain_revenue_predictor",
        conf={"reason": f"PSI={psi_score:.3f} > 0.2"})`} />
      </SectionCard>
      <SectionCard title="Try it: Drift detection simulation (Pyodide)" icon={<Terminal className="h-5 w-5" />} badge="executable">
        <PyodideRunner code={`# Drift detection — PSI (Population Stability Index) simulation
# Shows how to detect when production data has drifted from training data

import math

def compute_psi(reference, current, buckets=10):
    "PSI < 0.1 = stable, 0.1-0.2 = minor drift, > 0.2 = significant"
    # Bin reference into buckets
    edges = [min(reference)] + [
        reference[int(len(reference) * i / buckets)] for i in range(1, buckets)
    ] + [max(reference) + 1]
    
    ref_counts = [0] * buckets
    cur_counts = [0] * buckets
    for v in reference:
        for i in range(buckets):
            if edges[i] <= v < edges[i+1]:
                ref_counts[i] += 1; break
    for v in current:
        for i in range(buckets):
            if edges[i] <= v < edges[i+1]:
                cur_counts[i] += 1; break
    
    # Normalise to proportions
    ref_prop = [max(c / len(reference), 0.001) for c in ref_counts]
    cur_prop = [max(c / len(current), 0.001) for c in cur_counts]
    
    # PSI = sum((cur - ref) * ln(cur/ref))
    psi = sum((c - r) * math.log(c / r) for r, c in zip(ref_prop, cur_prop))
    return psi

# Training data (reference) — customer LTV ~ £1,200 mean
import random
random.seed(42)
reference = [random.gauss(1200, 300) for _ in range(1000)]

# Scenario 1: no drift (similar distribution)
current_stable = [random.gauss(1210, 305) for _ in range(500)]

# Scenario 2: significant drift (mean shifted to £1,800)
current_drifted = [random.gauss(1800, 400) for _ in range(500)]

psi_stable = compute_psi(reference, current_stable)
psi_drifted = compute_psi(reference, current_drifted)

print("=" * 60)
print("Model Monitoring — Drift Detection (PSI)")
print("=" * 60)
print(f"\\nReference (training): mean=£{sum(reference)/len(reference):.0f}, n={len(reference)}")
print(f"Current (stable):    mean=£{sum(current_stable)/len(current_stable):.0f}, n={len(current_stable)}")
print(f"Current (drifted):   mean=£{sum(current_drifted)/len(current_drifted):.0f}, n={len(current_drifted)}")

print(f"\\n{'=' * 60}")
print("PSI SCORES:")
print(f"  Stable scenario:  PSI = {psi_stable:.4f}  → {'✓ No drift' if psi_stable < 0.1 else '⚠ Minor drift' if psi_stable < 0.2 else '✗ SIGNIFICANT DRIFT'}")
print(f"  Drifted scenario: PSI = {psi_drifted:.4f} → {'✓ No drift' if psi_drifted < 0.1 else '⚠ Minor drift' if psi_drifted < 0.2 else '✗ SIGNIFICANT DRIFT — RETRAIN!'}")

print(f"\\n{'=' * 60}")
print("RETRAINING TRIGGER:")
if psi_drifted > 0.2:
    print("  ✗ PSI > 0.2 → triggering Airflow DAG 'retrain_revenue_predictor'")
    print("  → dbt build --select state:modified+ (re-compute features)")
    print("  → MLflow: start_run → train → log_metric → register")
    print("  → MLflow: transition to Staging → A/B test → Production")
else:
    print("  ✓ PSI < 0.2 → no retraining needed. Model is stable.")
print("=" * 60)`} buttonLabel="Run drift detection (Pyodide)" />
      </SectionCard>
      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("model-registry")} className="text-sm text-primary hover:underline">→ Model Registry</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("ml-platform")} className="text-sm text-primary hover:underline">→ ML Platform</Link>
      </div>
    </div>
  );
}
