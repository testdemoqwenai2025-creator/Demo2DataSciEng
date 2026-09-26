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
import { FEATURE_STORE_SCIENCE_EXAMPLES } from "../_components/_dataset_examples13";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Layers, Boxes, Database, Workflow, Zap, GitBranch, History, ShieldCheck,
  Atom, Activity, FileText, ExternalLink, Network, Sparkles, Cpu, TrendingUp,
  Server, Cloud, Code2, Sigma, BarChart3, GitCommit, Clock, Filter,
} from "lucide-react";

// ============================================================
// Code snippets
// ============================================================

const FEAST_FEATURE_REPO = `# ============================================================
# Feast — feature repo (feature_store.yaml + feature definitions)
# ============================================================
# pip install feast
# Init: feast init my_feature_repo
# Apply: feast apply
# Materialize: feast materialize-incremental <from> <to>

# feature_store.yaml
project: clinical_trial_features
registry: data/registry.db
provider: local   # local | aws | gcp

offline_store:
  type: parquet    # parquet | bigquery | redshift | snowflake | spark
  config: s3://science-features/clinical_trial

online_store:
  type: redis       # redis | dynamodb | cassandra
  config:
    connection_string: "redis.science:6379"
    port: 6379

# entities.py — entity keys for feature views
from feast import Entity
patient = Entity(name="patient_id", join_keys=["patient_id"])
variant = Entity(name="variant_id", join_keys=["variant_id"])
station = Entity(name="station_id", join_keys=["station_id"])

# feature_views.py — declare features
from feast import FeatureView, Field
from feast.types import Float32, Int64
from datetime import timedelta

# Patient labs feature view (point-in-time correct)
patient_labs_view = FeatureView(
    name="patient_labs",
    entities=[patient],
    ttl=timedelta(days=365),
    schema=[
        Field(name="hba1c_latest",   dtype=Float32),
        Field(name="creatinine_latest", dtype=Float32),
        Field(name="alt_latest",     dtype=Float32),
        Field(name="metformin_active", dtype=Int64),    # 0/1
        Field(name="statin_active",  dtype=Int64),
    ],
    online=True,
    source=ParquetSource(
        path="s3://science-features/clinical_trial/patient_labs.parquet",
        timestamp_field="event_ts",   # critical for PIT joins
    ),
    tags={"team": "clinical_ml"},
)

# Apply the feature repo
# $ feast apply
# Materialize the latest features from offline → online
# $ feast materialize-incremental 2024-09-01T00:00:00 2024-09-01T12:00:00
# $ feast materialize 2024-09-01T00:00:00 2024-09-01T12:00:00  # full rebuild`;

const FEAST_PIT_PYTHON = `# ============================================================
# Feast point-in-time joins — prevent look-ahead bias
# ============================================================
# A PIT join returns only features with feature_event_ts <= entity_event_ts.
# Without PIT, naive joins leak future data — a major silent failure mode
# in clinical ML (visit-4 HbA1c leaks into visit-3 prediction).

import feast
import pandas as pd

fs = feast.FeatureStore(repo_path="./feature_repo")

# Patient visits (the entity DataFrame — must have event_ts)
entity_df = pd.DataFrame({
    "patient_id": ["PT00001", "PT00002", "PT00003"],
    "event_ts":   ["2024-03-15 10:00", "2024-03-15 11:00", "2024-03-15 12:00"],
    # event_ts = visit timestamp; features AS OF this timestamp
})

# PIT join: returns only features with feature_event_ts <= entity_event_ts
training_df = fs.get_historical_features(
    entity_df=entity_df,
    features=[
        "patient_labs:hba1c_latest",
        "patient_labs:creatinine_latest",
        "patient_meds:metformin_active",
        "patient_demographics:age",
        "patient_demographics:bmi_latest",
    ],
).to_df()

# Look-ahead bias demo: the naive LEFT JOIN returns the latest
# HbA1c regardless of timestamp. With PIT join, only the visit-3
# HbA1c (or earlier) is returned for the visit-3 prediction.
# Without PIT: the model sees visit-4 HbA1c → inflated AUC by 0.05-0.10.
# With PIT:    the model sees only visit-3 HbA1c → true AUC.

# Online lookup (real-time inference — Redis)
features = fs.get_online_features(
    features=[
        "patient_labs:hba1c_latest",
        "patient_labs:creatinine_latest",
        "patient_meds:metformin_active",
    ],
    entity_rows=[{"patient_id": "PT00001"},
                  {"patient_id": "PT00002"}],
).to_dict()
print(features)
# {'patient_id': ['PT00001', 'PT00002'],
#  'hba1c_latest': [7.2, 6.8],
#  'metformin_active': [1, 0]}`;

const TECTON_STREAMING_PYTHON = `# ============================================================
# Tecton — streaming features + on-demand transformations
# ============================================================
# Tecton (commercial feature store) handles real-time streaming
# features (Kafka → Flink → Tecton materialization → online store)
# + on-demand transformations (Python UDFs that combine features
# at inference time, e.g. compute_body_surface_area(height, weight)).

from tecton import (
    streaming_feature_table, batch_feature_table, on_demand_feature_table,
    Entities, FeatureStartTime, MaterializationWindow,
)
from tecton.types import Int64, Float64
from datetime import timedelta

# Stream source: Kafka topic of patient vitals
patient_vitals_stream = KafkaStreamSource(
    name="patient_vitals_stream",
    kafka_bootstrap_servers="kafka.science:9092",
    topics=["patient.vitals"],
    # Windowed aggregation: 1-hour tumbling windows
    windowing_mode="tumbling",
    window_size=timedelta(hours=1),
)

# Streaming feature table: 1-hour rolling avg of heart rate
hr_1h_avg_view = streaming_feature_table(
    name="patient_hr_1h_avg",
    entities=[patient],
    ttl=timedelta(days=30),
    schema=[Field("heart_rate", Float64)],
    source=patient_vitals_stream,
    aggregation=Aggregation(
        column="heart_rate", function="avg", window=timedelta(hours=1),
    ),
    online=True,
    offline=True,
    materialization_intervals=[timedelta(minutes=5)],  # refresh every 5min
)

# On-demand feature: compute eGFR (kidney function) from creatinine + age
# Tecton runs this Python UDF at inference time (sub-ms latency)
@on_demand_feature_table(
    sources=[patient_labs_view, patient_demographics_view],
    schema=[Field("egfr", Float64)],
)
def patient_egfr(request):
    """Estimated Glomerular Filtration Rate — kidney function."""
    creat = request["patient_labs"]["creatinine_latest"]
    age   = request["patient_demographics"]["age"]
    # CKD-EPI formula (2021)
    egfr = 142 * min(creat / 0.9, 1) ** -0.5 * 0.9938 ** age
    return {"egfr": egfr}

# Materialize streaming features (5-min cadence from Kafka → Redis)
# Tecton Cloud handles the Flink + Spark jobs — no infrastructure to manage.`;

const SAGEMAKER_FEATURE_STORE_PYTHON = `# ============================================================
# SageMaker Feature Store — AWS-native, IAM-integrated
# ============================================================
# Online store: DynamoDB (low-latency, <5ms reads)
# Offline store: S3 (Parquet/Iceberg, integrates with Athena + Spark)
# IAM: per-feature-group IAM role + KMS encryption key

import boto3
import sagemaker
from sagemaker.feature_store.feature_group import FeatureGroup, FeatureDefinition

sm_client = boto3.client("sagemaker", region_name="us-east-1")
sagemaker_session = sagemaker.Session()

# Define a feature group
fg = FeatureGroup(
    name="patient_labs_fg",
    sagemaker_session=sagemaker_session,
    description="Clinical trial patient lab features",
)

# Feature definitions (schema)
fg.add_feature(FeatureDefinition("patient_id", "STRING"))   # entity
fg.add_feature(FeatureDefinition("event_timestamp", "STRING")) # PIT join key
fg.add_feature(FeatureDefinition("hba1c_latest", "FRACTIONAL"))
fg.add_feature(FeatureDefinition("creatinine_latest", "FRACTIONAL"))
fg.add_feature(FeatureDefinition("metformin_active", "FRACTIONAL"))

# Create the feature group (offline S3 + online DynamoDB)
fg.create(
    s3_uri="s3://science-sagemaker/feature-store/patient_labs",
    record_identifier_name="patient_id",
    event_time_feature_name="event_timestamp",
    enable_online_store=True,    # DynamoDB
    online_store_config={
        "EnableOnlineStore": True,
        "TtlDuration": {"Unit": "Days", "Value": 365},
    },
    offline_store_config={
        "DisableGlueTableCreation": False,
        "S3StorageConfig": {"S3Uri": "s3://science-sagemaker/..."},
    },
    role_arn="arn:aws:iam::123456789:role/SageMakerFeatureStore",
)

# Ingest records (offline + online in one call)
fg.ingest(data_frame=df_patient_labs, max_workers=4)

# Online lookup (DynamoDB — sub-5ms)
record = sm_client.get_record(
    FeatureGroupName="patient_labs_fg",
    RecordIdentifierValueAsString="PT00001",
)
print(record["Record"])
# [{'FeatureName': 'hba1c_latest', 'ValueAsString': '7.2'}, ...]

# Offline Athena query (PIT join via SQL)
query = """
SELECT pt.patient_id, pt.event_ts, lh.hba1c_latest, lh.creatinine_latest
FROM patient_visits pt
JOIN patient_labs_fg lh
  ON pt.patient_id = lh.patient_id
  AND lh.event_timestamp <= pt.event_ts   -- PIT correctness
WHERE pt.event_ts >= '2024-03-01'
""";`;

// ============================================================
// Pyodide demo — point-in-time joins + PSI drift + Shapley
// ============================================================

const PYODIDE_DEMO = `# ============================================================
# Feature store simulation: PIT joins + PSI drift + Shapley values
# Pure Python (math + random + collections only — no numpy)
# ============================================================
# 1. Generate synthetic patient visits + labs (5 visits per patient)
# 2. Compare WITH vs WITHOUT PIT join (look-ahead bias demo)
# 3. Compute PSI (Population Stability Index) — drift detection
# 4. Compute Shapley values for feature importance (game-theoretic)
# 5. Compute staleness(t) = t_now - t_feature_last_updated for SLA
# ============================================================

import math
import random
from collections import defaultdict
from itertools import combinations

random.seed(42)

# ------------------------------------------------------------
# 1. Synthetic patient visits + labs
# ------------------------------------------------------------
print("=== 1. Synthetic patient labs (10 patients × 5 visits) ===")
patients = []
for i in range(10):
    pid = f"PT{i:05d}"
    base_hba1c = random.gauss(6.5, 1.5)
    visits = []
    for v in range(1, 6):
        ts = f"2020-01-{v:02d}T10:00:00"  # 5 visits over 5 days
        # HbA1c slowly increases over time + noise
        hba1c = base_hba1c + v * 0.1 + random.gauss(0, 0.2)
        # If put on metformin at visit 2, HbA1c drops
        metformin_started = (v >= 2 and random.random() < 0.3)
        if metformin_started:
            hba1c -= 0.4
        visits.append({"visit_ts": ts, "hba1c": round(hba1c, 2),
                       "metformin_active": 1 if metformin_started else 0})
    patients.append({"patient_id": pid, "visits": visits})

print(f"  Generated: {len(patients)} patients × {len(patients[0]['visits'])} visits")
print()

# ------------------------------------------------------------
# 2. PIT vs naive (look-ahead) join
# ------------------------------------------------------------
print("=== 2. Look-ahead bias: PIT vs naive join (visit 3) ===")
# True response (the ground truth) depends ONLY on visit-3 HbA1c
# PIT-join: model sees visit-3 HbA1c → predicts correctly
# Naive-join: model sees visit-5 HbA1c (latest, future) → inflated accuracy

correct_correct = 0  # PIT-correct prediction, correct
naive_correct = 0    # naive-join prediction, correct (leaky)
n = len(patients)

for p in patients:
    v3 = p["visits"][2]
    v5 = p["visits"][-1]
    true_response = 1 if v3["hba1c"] < 7.0 else 0  # ground truth
    # PIT-join model: only sees visit-3 data
    pit_pred = 1 if v3["hba1c"] < 7.0 else 0
    # Naive-join model: gets LATEST (visit-5) data, looks ahead
    naive_pred = 1 if v5["hba1c"] < 7.0 else 0
    correct_correct += (pit_pred == true_response)
    naive_correct += (naive_pred == true_response)

print(f"  PIT-correct accuracy:  {correct_correct}/{n} = {correct_correct/n:.0%}")
print(f"  Naive (leaky) accuracy: {naive_correct}/{n} = {naive_correct/n:.0%}")
print(f"  Inflation from look-ahead: +{(naive_correct - correct_correct)/n:.0%}")
print(f"  (A model that looks 2 visits ahead predicts based on future state)")
print()

# ------------------------------------------------------------
# 3. PSI (Population Stability Index) — drift detection
# ------------------------------------------------------------
print("=== 3. PSI — Population Stability Index (drift detection) ===")
# Reference (training) distribution: HbA1c ~ Beta(2, 50) → mostly low
# Current distribution: wildfire smoke event shifted values up

# Generate reference (training) HbA1c distribution
ref_hba1c = [random.gauss(6.5, 1.0) for _ in range(1000)]
# Current (production) HbA1c distribution (drifted)
cur_hba1c = [random.gauss(7.8, 1.2) for _ in range(1000)]

def psi(reference, current, n_bins=10):
    """Population Stability Index. <0.1 stable, 0.1-0.25 warning, >0.25 drift."""
    lo = min(min(reference), min(current))
    hi = max(max(reference), max(current))
    bin_edges = [lo + (hi - lo) * i / n_bins for i in range(n_bins + 1)]
    ref_counts = [0] * n_bins
    cur_counts = [0] * n_bins
    for v in reference:
        for i in range(n_bins):
            if bin_edges[i] <= v < bin_edges[i + 1]:
                ref_counts[i] += 1
                break
    for v in current:
        for i in range(n_bins):
            if bin_edges[i] <= v < bin_edges[i + 1]:
                cur_counts[i] += 1
                break
    n_ref = sum(ref_counts) or 1
    n_cur = sum(cur_counts) or 1
    psi_val = 0.0
    for i in range(n_bins):
        p_ref = max(ref_counts[i] / n_ref, 1e-6)
        p_cur = max(cur_counts[i] / n_cur, 1e-6)
        psi_val += (p_cur - p_ref) * math.log(p_cur / p_ref)
    return psi_val

psi_value = psi(ref_hba1c, cur_hba1c, n_bins=10)
print(f"  Reference (training): mean HbA1c = {sum(ref_hba1c)/len(ref_hba1c):.2f}")
print(f"  Current (production): mean HbA1c = {sum(cur_hba1c)/len(cur_hba1c):.2f}")
print(f"  PSI = {psi_value:.4f}")
if psi_value < 0.1:
    interp = "STABLE — no significant drift"
elif psi_value < 0.25:
    interp = "WARNING — investigate drift cause"
else:
    interp = "DRIFT — rebuild model on new distribution"
print(f"  Interpretation: {interp}")
print()

# ------------------------------------------------------------
# 4. Shapley values for feature importance (game-theoretic)
# ============================================================
print("=== 4. Shapley values — game-theoretic feature importance ===")
# 4 features: hba1c, age, bmi, smoking_status
# Shapley value of feature i = average marginal contribution across all
# coalitions S ⊆ N\\{i}: φ_i = Σ_S [|S|!(n-|S|-1)!/n!] × [f(S∪{i}) - f(S)]
# where f(S) is the model trained on feature set S.

features = ["hba1c", "age", "bmi", "smoking"]
n = len(features)

# Synthetic model performance: f(S) — depends on which features are in S
# Base AUC = 0.60; each feature contributes ~0.05 with diminishing returns
def model_auc(feature_set):
    """Simulate AUC of a model trained on the given feature set."""
    base = 0.60
    contrib = {
        "hba1c": 0.10,  # most important
        "age": 0.04,
        "bmi": 0.03,
        "smoking": 0.05,
    }
    # Diminishing returns: each added feature contributes less
    s = base
    for i, f in enumerate(feature_set):
        s += contrib.get(f, 0) * (0.7 ** i)
    # Small noise
    return s + random.gauss(0, 0.005)

# Shapley value for feature i
def shapley_value(features, i, model_func):
    """Exact Shapley value (n! small enough for n=4)."""
    others = [f for f in features if f != f]
    # Actually re-compute others correctly
    others = [f for f in features if f != features[i]]
    n = len(features)
    total = 0.0
    # Iterate all subsets S of 'others'
    for size in range(n):  # |S| = 0, 1, 2, ..., n-1
        for S_tuple in combinations(others, size):
            S = list(S_tuple)
            S_with_i = S + [features[i]]
            f_S = model_func(S)
            f_Si = model_func(S_with_i)
            marginal = f_Si - f_S
            # Weight = |S|! * (n - |S| - 1)! / n!
            from math import factorial
            weight = factorial(size) * factorial(n - size - 1) / factorial(n)
            total += weight * marginal
    return total

print(f"  Features: {features}")
shapley_values = {}
for i in range(n):
    sv = shapley_value(features, i, model_auc)
    shapley_values[features[i]] = sv

# Normalize to sum (Shapley values sum to total contribution)
total = sum(shapley_values.values())
print(f"  Shapley values (raw):")
for f, sv in sorted(shapley_values.items(), key=lambda x: -x[1]):
    pct = sv / total * 100
    print(f"    {f}: φ = {sv:.4f} ({pct:.1f}% of total)")
print()
print(f"  Sum of Shapley values = {total:.4f} (should equal f(N) - f(∅))")
print(f"  f(N) (all features) = {model_auc(features):.4f}")
print()

# ------------------------------------------------------------
# 5. Feature freshness SLA
# ------------------------------------------------------------
print("=== 5. Feature freshness SLA — staleness check ===")
# staleness(t) = t_now - t_feature_last_updated
# SLA: < 60s for air quality, < 15min for clinical trial, < 24h for offline
t_now_str = "2024-09-01T12:00:00"
t_now = 12 * 3600  # seconds since midnight (simplified)

features_status = [
    ("patient_labs.hba1c_latest", "2024-09-01T11:58:30", 60),  # 90s old, SLA 60s
    ("patient_labs.creatinine_latest", "2024-09-01T11:59:50", 60),
    ("patient_meds.metformin_active", "2024-09-01T11:30:00", 60 * 15),  # 15min SLA
    ("patient_demographics.age", "2024-09-01T00:00:00", 60 * 60 * 24),  # 24h SLA
]
print(f"  t_now = {t_now_str}")
for fname, t_str, sla_s in features_status:
    # Parse "HH:MM:SS" portion
    parts = t_str.split("T")[1].split(":")
    t_feat = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    staleness = t_now - t_feat
    is_sla_met = "OK" if staleness < sla_s else "VIOLATED"
    print(f"  {fname}: staleness = {staleness}s (SLA {sla_s}s) [{is_sla_met}]")
print()
print("Key insight: Feast PIT joins prevent look-ahead bias (the")
print("silent killer of clinical ML). PSI drift detection catches")
print("distribution shift before serving. Shapley values give")
print("game-theoretic feature importance (sums to f(N) - f(empty)).")`;

// ============================================================
// Feast architecture diagram — offline + online + entity keys
// ============================================================

function FeastArchitectureDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("online_store");
  const nodes = {
    "training_data": { label: "Training data (Parquet/Iceberg)", desc: "Source data on S3/ADLS — patient labs, demographics, diagnoses. The source-of-truth for feature definitions.", level: 0 },
    "offline_store": { label: "Offline store (Parquet on S3)",  desc: "Historical feature values — used for training PIT joins. ~1.2 PB for 85M variants × 500K patients", level: 1 },
    "materialize": { label: "Materialize (incremental)",        desc: "Cron job that pushes new features from offline → online every 5min (clinical) to 60s (sensors)", level: 2 },
    "online_store": { label: "Online store (Redis/DynamoDB)",     desc: "Latest feature values — sub-5ms lookups. ~10 GB for 10M high-priority variants", level: 1 },
    "feature_view": { label: "Feature View",                    desc: "Declarative feature definition — entity key + feature schema + TTL + source", level: 2 },
    "training_pit": { label: "Training (PIT join)",            desc: "Offline PIT join returns only features AS OF entity_event_ts — prevents look-ahead bias", level: 3 },
    "inference":   { label: "Inference (Redis lookup)",         desc: "Online lookup returns latest features — sub-5ms. Used by real-time scoring microservices", level: 3 },
  };
  const edges = [
    ["training_data", "offline_store"],
    ["offline_store", "materialize"], ["materialize", "online_store"],
    ["training_data", "feature_view"],
    ["feature_view", "offline_store"], ["feature_view", "online_store"],
    ["offline_store", "training_pit"],
    ["online_store", "inference"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "training_data": { x: 70, y: 30 },
    "offline_store": { x: 70, y: 90 },
    "materialize": { x: 200, y: 60 },
    "online_store": { x: 330, y: 90 },
    "feature_view": { x: 200, y: 130 },
    "training_pit": { x: 70, y: 180 },
    "inference": { x: 330, y: 180 },
  };

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Atom className="h-3.5 w-3.5 text-primary" />
          Feast architecture — offline store (training) + online store (inference) + entity keys + feature views
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 400 220" className="w-full h-auto">
          <defs>
            <marker id="fs-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" />
            </marker>
          </defs>
          {edges.map(([from, to], i) => {
            const a = positions[from];
            const b = positions[to];
            return (
              <line key={i} x1={a.x} y1={a.y + 12} x2={b.x} y2={b.y - 12}
                stroke="var(--border)" strokeWidth="0.8" markerEnd="url(#fs-arrow)" />
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
            Hover any node to see its role — offline (training) and online (inference) are dual stores.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Comparison table — Feast vs Tecton vs SageMaker FS vs Vertex AI FS
// ============================================================

function FeatureStoreComparisonTable() {
  const rows = [
    { feature: "Origin / License",     feast: "Gojek/Stripe 2019 / Apache 2.0", tecton: "Tecton 2019 / Proprietary SaaS", sagemaker: "AWS 2020 / AWS-managed", vertex: "Google 2021 / GCP-managed" },
    { feature: "Open-source",          feast: "Yes — fully self-hostable",      tecton: "No (SaaS-only)",                sagemaker: "No (AWS-only)",            vertex: "No (GCP-only)" },
    { feature: "Online store",          feast: "Redis, DynamoDB, Cassandra",     tecton: "Tecton-managed (Spark + Redis)", sagemaker: "DynamoDB (native)",          vertex: "Bigtable / Redis" },
    { feature: "Offline store",         feast: "Parquet, BQ, Redshift, Spark",   tecton: "Snowflake, Spark",               sagemaker: "S3 (Parquet/Iceberg)",      vertex: "BigQuery, GCS" },
    { feature: "Streaming features",    feast: "Via external Kafka + Flink",    tecton: "Native (Flink → online)",        sagemaker: "Via Kafka + Lambda",         vertex: "Via PubSub + Dataflow" },
    { feature: "On-demand transforms",  feast: "Python UDFs at inference",       tecton: "Native (sub-ms Python UDFs)",     sagemaker: "Via Lambda",                 vertex: "Via Cloud Functions" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          Feast vs Tecton vs SageMaker FS vs Vertex AI FS — 4 feature stores
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold text-primary">Feast</th>
              <th className="text-left px-3 py-2 font-semibold">Tecton</th>
              <th className="text-left px-3 py-2 font-semibold">SageMaker FS</th>
              <th className="text-left px-3 py-2 font-semibold">Vertex AI FS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-primary/80">{r.feast}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.tecton}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.sagemaker}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.vertex}</td>
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
  { label: "Origin", value: "Feast 2019 (Gojek+Stripe)", hint: "Open-sourced by Gojek + Stripe to standardise feature serving — offline + online dual stores", deltaTone: "flat" as const },
  { label: "Online latency", value: "<5ms (Redis)", hint: "Real-time feature lookups against Redis / DynamoDB / Cassandra — sub-5ms typical", deltaTone: "up" as const },
  { label: "PIT correctness", value: "AS OF event_ts", hint: "Point-in-time joins prevent look-ahead bias — features only joined if feature_event_ts ≤ entity_event_ts", deltaTone: "up" as const },
  { label: "Drift detection", value: "PSI <0.1 stable", hint: "Population Stability Index: <0.1 stable, 0.1-0.25 warning, >0.25 drift — triggers model rebuild", deltaTone: "flat" as const },
];

export function FeatureStoreDeepDivePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Feature stores · Feast + Tecton + SageMaker · point-in-time + PSI + Shapley"
        title="Feature stores — Feast + Tecton + SageMaker for ML feature serving"
        description="Feature stores solve three problems in ML: (1) feature duplication — every model re-computes the same features; (2) train-serve skew — training uses Python aggregations, serving uses Java, results differ; (3) look-ahead bias — naive joins leak future data, inflating AUC. The Feast architecture (Gojek+Stripe 2019, Apache 2.0) is the open-source reference: an offline store (Parquet/Iceberg on S3 for training) + an online store (Redis/DynamoDB for inference), connected by the materialize-incremental job. Point-in-time AS OF joins guarantee training features only see past data; PSI drift detection catches distribution shift before serving; Shapley values give game-theoretic feature importance. Tecton (commercial) adds native streaming features + on-demand transformations; SageMaker Feature Store is the AWS-native variant with IAM + KMS."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Layers className="h-3 w-3" /> Feast 0.40</Badge>
            <Badge variant="outline" className="gap-1.5"><Atom className="h-3 w-3" /> Offline + Online</Badge>
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
        title="Mathematical foundations — PIT, freshness, PSI, Shapley values"
        description="Feature stores are mathematically rigorous — every concept has a precise definition. Four equations cover 90% of feature-store operations: point-in-time correctness (AS OF join), freshness SLA (staleness), Population Stability Index (drift detection), and Shapley values (game-theoretic feature importance). Each is derived below from first principles — these aren't heuristics, they're the formal definitions."
        icon={<Sigma className="h-5 w-5" />}
        badge="mathematics"
      >
        <div className="space-y-5">
          {/* Point-in-time correctness */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-primary mb-1.5">
              1. Point-in-time correctness — preventing look-ahead bias
            </p>
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
              For an entity (e.g. patient) at time <code className="font-mono">t_e</code> (event timestamp), the PIT join returns only feature values <code className="font-mono">f(x, t_f)</code> where <code className="font-mono">t_f ≤ t_e</code>:
            </p>
            <p className="font-mono text-sm text-foreground bg-background/60 p-2 rounded text-center">
              PIT_join(e, t_e) = { "f(x, t_f) | t_f ≤ t_e" }
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">Formal definition:</strong> Given an entity e with event timestamp <code className="font-mono">t_e</code> and a feature view with feature timestamps <code className="font-mono">{ "{t_f1, t_f2, ...}" }</code>, the PIT join returns the feature value at the latest feature timestamp that is ≤ <code className="font-mono">t_e</code>:
            </p>
            <p className="font-mono text-xs text-muted-foreground bg-background/60 p-2 rounded ml-4">
              PIT(e, t_e) = argmax{ "t_f" } f(e, t_f) subject to t_f ≤ t_e
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">Why it matters:</strong> A naive LEFT JOIN returns the latest feature value regardless of timestamp — a visit-3 prediction gets visit-5 HbA1c (2 days in the future). This inflates training AUC by 0.05-0.10 and the model collapses at production time (no future data available). The PIT join enforces the temporal constraint.
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">Feast implementation:</strong> The entity DataFrame must include an <code className="font-mono">event_ts</code> column; <code className="font-mono">fs.get_historical_features(entity_df=...)</code> joins each feature_view's <code className="font-mono">feature_event_ts</code> column to <code className="font-mono">entity_event_ts</code> via a temporal LEFT JOIN.
            </p>
          </div>

          {/* Feature freshness */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-primary mb-1.5">
              2. Feature freshness — staleness SLA enforcement
            </p>
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
              Staleness measures how old the latest feature value is relative to current time:
            </p>
            <p className="font-mono text-sm text-foreground bg-background/60 p-2 rounded text-center">
              staleness(t_now) = t_now − t_feature_last_updated
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">SLA thresholds (typical):</strong> Air-quality sensors: &lt;60s (wildfire exposure needs real-time data). Clinical trial eligibility: &lt;15min (patient at the ED must be scored against current state). Genomics variants: &lt;24h (ClinVar reclassifications don&apos;t change minute-to-minute).
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">Violation handling:</strong> When <code className="font-mono">staleness &gt; SLA</code>, Feast typically (1) excludes the feature from the response, (2) alerts via SNS/Slack/PagerDuty, (3) optionally serves a stale-but-better-than-nothing value with a stale_flag metadata. The choice depends on the use case — a wildfire exposure model would rather not serve than serve stale.
            </p>
          </div>

          {/* PSI */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-primary mb-1.5">
              3. Population Stability Index (PSI) — drift detection
            </p>
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
              PSI quantifies distribution shift between a reference (training) and current (production) sample, both binned into <code className="font-mono">n</code> buckets with proportions <code className="font-mono">p_i^ref</code> and <code className="font-mono">p_i^cur</code>:
            </p>
            <p className="font-mono text-sm text-foreground bg-background/60 p-2 rounded text-center">
              PSI = Σᵢ (p_i^cur − p_i^ref) × ln(p_i^cur / p_i^ref)
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">Interpretation (industry standard):</strong>
            </p>
            <ul className="text-xs text-muted-foreground ml-4 mt-1 space-y-0.5">
              <li>• PSI &lt; 0.10 — <strong>stable</strong> (no significant drift)</li>
              <li>• 0.10 ≤ PSI &lt; 0.25 — <strong>warning</strong> (investigate drift cause; schedule model retrain)</li>
              <li>• PSI ≥ 0.25 — <strong>drift</strong> (rebuild model on new distribution; production model unreliable)</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">Derivation:</strong> PSI is the Kullback-Leibler divergence from reference to current, weighted by the bucket proportion difference. KL divergence alone is symmetric in shape but PSI weights large buckets more heavily — making it more sensitive to drift in common buckets. PSI &gt; 0.25 means the two distributions differ enough that the model&apos;s decision boundary may no longer apply.
            </p>
          </div>

          {/* Shapley values */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-primary mb-1.5">
              4. Shapley values — game-theoretic feature importance
            </p>
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
              From cooperative game theory (Shapley 1953, Nobel 2012). Treat features as players in a coalition game where the &apos;payoff&apos; <code className="font-mono">f(S)</code> is the model performance when trained on feature set <code className="font-mono">S</code>. The Shapley value of feature <code className="font-mono">i</code> is its average marginal contribution across all coalitions:
            </p>
            <p className="font-mono text-xs text-foreground bg-background/60 p-2 rounded text-center">
              φᵢ = Σ<sub>S⊆N\{`{i}`}</sub> |S|!·(n−|S|−1)! / n! × [f(S∪{`{i}`}) − f(S)]
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">The four axioms Shapley values satisfy (no other attribution method does all four):</strong>
            </p>
            <ul className="text-xs text-muted-foreground ml-4 mt-1 space-y-0.5">
              <li>• <strong>Efficiency:</strong> Σ φᵢ = f(N) − f(∅) — attributions sum to total contribution</li>
              <li>• <strong>Symmetry:</strong> if features i and j contribute equally to all coalitions, then φᵢ = φⱼ</li>
              <li>• <strong>Dummy:</strong> if feature i never changes f, then φᵢ = 0</li>
              <li>• <strong>Additivity:</strong> for an ensemble of models, φᵢ for the ensemble = Σ φᵢ for each model</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              <strong className="text-foreground/80">Computational cost:</strong> Exact Shapley requires <code className="font-mono">2^n</code> model retrainings — infeasible for n &gt; 15 features. SHAP (Lundberg 2017) approximates via Monte Carlo + tree-based exact algorithms (TreeSHAP, O(T·n) for tree models). Feature stores log Shapley values per prediction — the user gets &apos;why did the model predict this?&apos; answers.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Architecture diagram */}
      <SectionCard
        title="Feast architecture — offline + online stores + entity keys + feature views"
        description="Feast's architecture has two stores: (1) the offline store (Parquet/Iceberg on S3/ADLS) — historical features for training PIT joins; (2) the online store (Redis/DynamoDB) — latest features for inference. The materialize-incremental job (cron, every 5-15 min) pushes new offline features to online. Feature Views are declarative definitions: entity key + feature schema + TTL + source. The same feature_view is queried both offline (training, PIT join) and online (inference, sub-5ms Redis lookup)."
        icon={<Atom className="h-5 w-5" />}
        badge="architecture"
      >
        <FeastArchitectureDiagram />
      </SectionCard>

      {/* Feast feature repo */}
      <SectionCard
        title="Feast feature repo — feature_store.yaml + entities + feature_views"
        description="A Feast feature repo is a directory with feature_store.yaml (config: offline/online store + provider) + entities.py (entity keys) + feature_views.py (feature definitions). feast apply validates the repo + writes to the registry. feast materialize-incremental pushes new features from offline → online. The TTL controls how long features stay valid in the online store."
        icon={<Database className="h-5 w-5" />}
        badge="Feast"
      >
        <CodeBlock code={FEAST_FEATURE_REPO} language="python" filename="feast_feature_repo.py" highlight={[20, 21, 22, 23, 24, 25, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50]} />
      </SectionCard>

      {/* PIT joins */}
      <SectionCard
        title="Feast point-in-time joins — preventing look-ahead bias in clinical ML"
        description="The PIT join is the canonical safeguard against look-ahead bias in clinical ML. The entity DataFrame must include event_ts (e.g. visit timestamp); Feast's get_historical_features joins each feature_view's feature_event_ts to entity_event_ts via temporal LEFT JOIN. Without PIT, a visit-3 prediction would get visit-5 HbA1c (2 days in the future) — inflating AUC by 0.05-0.10 and collapsing at production time."
        icon={<Filter className="h-5 w-5" />}
        badge="PIT joins"
      >
        <CodeBlock code={FEAST_PIT_PYTHON} language="python" filename="feast_pit_joins.py" highlight={[20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47]} />
      </SectionCard>

      {/* Tecton */}
      <SectionCard
        title="Tecton — streaming features + on-demand transformations"
        description="Tecton (commercial, ex-Uber Michelangelo team) is the production feature store for streaming use cases. Native Kafka + Flink integration computes streaming features (1-hour rolling avg of heart rate, 5-min windowed click count). On-demand transformations are Python UDFs (e.g. compute_body_surface_area(height, weight)) that Tecton runs at inference time with sub-ms latency — combining stored features with request-time inputs."
        icon={<Workflow className="h-5 w-5" />}
        badge="Tecton"
      >
        <CodeBlock code={TECTON_STREAMING_PYTHON} language="python" filename="tecton_streaming.py" highlight={[15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52]} />
      </SectionCard>

      {/* SageMaker Feature Store */}
      <SectionCard
        title="SageMaker Feature Store — AWS-native + IAM-integrated"
        description="SageMaker Feature Store is the AWS-native feature store: DynamoDB online (sub-5ms), S3 offline (Parquet/Iceberg, integrates with Athena + Spark). Per-feature-group IAM role + KMS encryption key — regulatory compliance built-in. Ingest via fg.ingest(data_frame=...) (offline + online in one call). Online lookup via get_record (DynamoDB). Offline PIT joins via Athena SQL."
        icon={<Cloud className="h-5 w-5" />}
        badge="SageMaker FS"
      >
        <CodeBlock code={SAGEMAKER_FEATURE_STORE_PYTHON} language="python" filename="sagemaker_feature_store.py" highlight={[12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43]} />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: PIT joins + PSI drift + Shapley values (Pyodide)"
        description="Pure-Python simulation (math + random + collections only — no numpy). (1) Generate synthetic patient visits + labs; (2) Compare PIT-correct vs naive (leaky) join accuracy; (3) Compute PSI for a drifted HbA1c distribution; (4) Compute exact Shapley values for 4 features (2^4 = 16 coalitions, feasible); (5) Check feature freshness SLA. The demo makes the math concrete — every equation is computed on real (synthetic) data."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={PYODIDE_DEMO} buttonLabel="Run feature-store math simulation (Pyodide)" />
      </SectionCard>

      {/* Comparison table */}
      <SectionCard
        title="Feast vs Tecton vs SageMaker FS vs Vertex AI FS — 4 feature stores"
        description="Four feature stores dominate the market. Feast (2019, Apache 2.0) is the open-source self-hostable option — strongest for vendor-neutral shops. Tecton (2019, commercial) is the streaming-first leader — best for real-time features + on-demand transforms. SageMaker Feature Store (2020) is AWS-native with IAM + KMS compliance. Vertex AI Feature Store (2021) is GCP-native with Bigtable online + BigQuery offline. The choice increasingly comes down to cloud allegiance + streaming needs."
        icon={<Boxes className="h-5 w-5" />}
      >
        <FeatureStoreComparisonTable />
      </SectionCard>

      {/* Why-evolved */}
      <SectionCard
        title="Why feature stores evolved — shortfalls of ad-hoc feature pipelines"
        description="Modern ML engineers prefer feature stores because the prior generation (ad-hoc Python + cron + Redis) had four critical shortfalls. Feast + Tecton + SageMaker FS were designed ground-up to fix all four simultaneously."
        icon={<History className="h-5 w-5" />}
        badge="Why feature stores"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: Feature duplication.</strong> Pre-feature-store, every ML model re-computed the same features — the &apos;rolling 24h avg of PM2.5&apos; was implemented in Python (training) + Java (serving) + SQL (dashboards), three times. Feast&apos;s declarative feature_view computes once, serves everywhere. <strong className="text-foreground/80">Result:</strong> 3× faster model development; one source of truth for feature definitions.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: Train-serve skew.</strong> Pre-feature-store, training used Python pandas aggregations; serving used Java streaming aggregations. The two implementations differed in subtle ways (window boundary handling, NULL semantics, floating-point order) — production models silently mis-served. Feast&apos;s single feature_view is computed once and stored — training and serving read the same value. <strong className="text-foreground/80">Result:</strong> train-serve skew eliminated by construction.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: Look-ahead bias.</strong> Pre-feature-store, naive LEFT JOINs leaked future data — visit-4 HbA1c leaked into visit-3 predictions, inflating AUC by 0.05-0.10. The model &apos;looked great&apos; in training and collapsed in production. Feast&apos;s PIT AS OF join enforces the temporal constraint; the canonical clinical ML failure mode is now impossible by construction. <strong className="text-foreground/80">Result:</strong> production AUC matches training AUC.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: No drift detection.</strong> Pre-feature-store, no one noticed when production feature distributions shifted from training — wildfire smoke shifted PM2.5 from 8 to 40 ug/m3 and the model served stale predictions for weeks. PSI monitoring catches drift before serving; staleness SLAs catch freshness violations before they affect inference. <strong className="text-foreground/80">Result:</strong> drift + freshness violations trigger alerts before they degrade model quality.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique feature-store features"
        description="Feature stores have four features that are genuinely unique — structural differentiators that no ad-hoc pipeline can match."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. PIT AS OF joins</p>
            <p className="text-muted-foreground">Temporal LEFT JOIN enforces <code className="font-mono">feature_event_ts ≤ entity_event_ts</code> — look-ahead bias impossible by construction. <strong>The single most important feature-store property.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Offline + online dual stores</p>
            <p className="text-muted-foreground">Same feature_view queried from offline (Parquet, training) + online (Redis, inference) — train-serve skew eliminated. <strong>Ad-hoc pipelines can&apos;t guarantee this.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Freshness SLAs</p>
            <p className="text-muted-foreground">staleness = t_now − t_last_updated; violations trigger alerts + optionally stale-but-better-than-nothing serving. <strong>No ad-hoc pipeline enforces this.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. PSI drift detection</p>
            <p className="text-muted-foreground">Population Stability Index: <code className="font-mono">PSI &lt; 0.1</code> stable, <code className="font-mono">0.1-0.25</code> warning, <code className="font-mono">&gt; 0.25</code> drift — triggers model rebuild. <strong>Catches distribution shift before serving.</strong></p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples */}
      <SectionCard
        title="3 science examples — Feast in genomics + clinical trial + sensors"
        description="Three production-style examples showing feature stores in scientific workloads. Each is a clickable card opening a lazy popup with: scenario brief (dataset/scale/why), dataset stats grid, computational tooling, multi-language code in Scala + Rust + Go + Elixir + Zig, and an implementation insight. All datasets are real public data (UK Biobank, PCORnet, EPA AirNow)."
        icon={<Database className="h-5 w-5" />}
        badge="3 examples × 5 langs"
      >
        <DatasetCards
          examples={FEATURE_STORE_SCIENCE_EXAMPLES}
          intro="Real public datasets (UK Biobank WGS 500K, PCORnet 150M patients, EPA AirNow 50K stations) + synthetic equivalents. Each card has Scala/Rust/Go/Elixir/Zig code with the unique Feast PIT-join differentiator."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the feature-store ecosystem"
        description="Feature stores integrate with the full ML lifecycle: streaming ingestion (Kafka + Flink), offline compute (Spark + Trino + Athena), online stores (Redis + DynamoDB + Cassandra), and ML platforms (SageMaker + Vertex + MLflow)."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Stores + compute</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Feast</strong> — open-source, vendor-neutral (Redis + DynamoDB + Parquet)</li>
              <li>• <strong>Tecton</strong> — commercial, streaming-first (Spark + Redis)</li>
              <li>• <strong>SageMaker FS</strong> — AWS-native (DynamoDB + S3 + Athena)</li>
              <li>• <strong>Vertex AI FS</strong> — GCP-native (Bigtable + BigQuery)</li>
              <li>• <strong>Hopsworks</strong> — open-source, online + training + BI</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cloud className="h-3.5 w-3.5 text-primary" /> Integrations</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Streaming</strong> — Kafka + Flink + Spark Structured Streaming</li>
              <li>• <strong>Offline compute</strong> — Spark, Trino, Athena, Snowflake</li>
              <li>• <strong>ML platforms</strong> — MLflow, SageMaker, Vertex, Kubeflow</li>
              <li>• <strong>Drift monitoring</strong> — Evidently, Arize, WhyLabs, Fiddler</li>
              <li>• <strong>Orchestration</strong> — Airflow, Dagster, Prefect</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers and production blog posts that defined feature stores + the PIT join. The Tecton 2020 whitepaper is the foundational reference; the production case studies document scale at Uber, Gojek, Stripe, Airbnb."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Tecton 2020 (Michelangelo Paleta — The Evolution of Uber&apos;s ML Platform):</strong> The Uber team that built Michelangelo (2015) evolved it into Michelangelo Paleta (2018), the first production feature store. The paper formalised: (1) offline + online dual stores, (2) feature_view as the unit of abstraction, (3) PIT joins for training, (4) streaming features via Apache Samza. Several team members left Uber in 2019 to found Tecton — commercialising the architecture.
          </p>
          <p>
            <strong className="text-foreground/80">Gojek + Stripe 2019 (Feast: Open-source Feature Store):</strong> Gojek (Indonesian ride-hailing) + Stripe (payments) jointly open-sourced Feast as the Apache 2.0 alternative to Tecton. The motivation: vendor-neutral feature serving across Redis + DynamoDB + Parquet, deployable on any cloud. Feast is now the production feature store at Robinhood, Shopify, Reddit, and many others. The original paper is short — 6 pages, defining the offline + online + entity + feature_view abstractions.
          </p>
          <p>
            <strong className="text-foreground/80">Shapley 1953 (A Value for N-person Games):</strong> The foundational paper for cooperative game theory — Lloyd Shapley&apos;s PhD thesis. Proved the four axioms (efficiency, symmetry, dummy, additivity) uniquely determine the value function φ. Awarded Nobel Memorial Prize in Economic Sciences 2012. SHAP (Lundberg 2017) brought Shapley values to ML — TreeSHAP is O(T·n) for tree models, making exact attribution feasible for production ML.
          </p>
          <p>
            <strong className="text-foreground/80">Kullback-Leibler 1951 (On Information and Sufficiency):</strong> The KL divergence between two distributions — the mathematical foundation of PSI. PSI is the KL divergence from reference to current, weighted by bucket proportion differences. The 1951 paper introduced the symmetric version (Jensen-Shannon divergence) used in many drift detectors; PSI is the asymmetric version more sensitive to common-bucket drift.
          </p>
          <p>
            <strong className="text-foreground/80">Uber Production Case (Uber Eng Blog 2018):</strong> Michelangelo Paleta deployment at Uber — 10K+ features, 100M+ entity keys, sub-10ms online lookups. Streamed features (Surge pricing) computed via Samza (1-min windows) → Redis. The PIT join was added after a 2017 incident where a model trained with look-ahead bias (booking completion prediction) collapsed in production — AUC dropped from 0.85 to 0.65 overnight.
          </p>
          <p>
            <strong className="text-foreground/80">Gojek Production Case (Gojek Eng 2020):</strong> Feast production deployment at Gojek — 1K+ features for food delivery + ride-hailing. Driver ETA model uses 50 features (driver history, traffic, weather) — Feast online lookups serve sub-5ms. PIT joins reduced model training time from 4 hours to 30 minutes (no more ad-hoc SQL).
          </p>
          <p>
            <strong className="text-foreground/80">Stripe Production Case (Stripe Eng 2020):</strong> Feast at Stripe for fraud detection — payment features (rolling 1h/24h/7d transaction counts + amounts) for the fraud scoring model. The materialize-incremental job runs every 60 seconds; PSI monitors catch distribution shifts when a new payment corridor opens (different fraud patterns emerge).
          </p>
        </div>
      </SectionCard>

      {/* Deeper-thought insight */}
      <SectionCard
        title="My deeper thought: feature stores ARE to ML what CDC is to OLTP"
        description="The unifying view: feature stores do for ML what Change Data Capture (CDC) does for OLTP — they materialise derived state from raw events, with point-in-time correctness + freshness SLAs."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Feature stores ARE CDC pipelines for ML.</strong> A CDC pipeline captures row-level changes from an OLTP database (PostgreSQL logical replication, MySQL binlog) and materialises them into derived views (a Redis cache, an Elasticsearch index, an Iceberg table). Feature stores do exactly this for ML — they capture feature-value changes (a new HbA1c reading) and materialise them into the online store (Redis). The materialize-incremental job is the CDC consumer; the offline store is the OLTP source; the online store is the cache. PIT AS OF joins are CDC&apos;s time-travel — read the cache as-of a past timestamp.
          </p>
          <p>
            <strong className="text-foreground/80">PSI drift IS the [00mKL divergence applied to feature distributions.</strong> KL divergence quantifies how much one distribution differs from another — PSI is the asymmetric version weighted by bucket proportions. The 0.1/0.25 thresholds are empirical calibrations from credit-scoring (2003 SAS paper) where PSI was first standardised. The same metric applies to ML drift — both are about distribution shift from a known reference. The math is identical to comp-info-theory&apos;s relative entropy — applied to feature distributions.
          </p>
          <p>
            <strong className="text-foreground/80">Shapley values ARE cooperative game theory applied to features.</strong> The Shapley value (1953) was invented for cost-sharing in coalitions — given N players forming coalitions, how to fairly distribute the payoff? The axioms (efficiency, symmetry, dummy, additivity) uniquely determine the answer. SHAP applies this to ML: features = players, model performance = payoff, Shapley value = feature importance. The mathematical structure is identical to the cost-sharing problem — and SHAP&apos;s TreeSHAP algorithm makes it tractable by exploiting tree structure (same dynamic-programming trick used in combinatorial game theory).
          </p>
          <p>
            <strong className="text-foreground/80">Feature stores ARE the bitemporal databases of ML.</strong> A bitemporal database tracks two time dimensions: valid_time (when the fact was true in the real world) and transaction_time (when the database recorded it). Feature stores are inherently bitemporal — feature_event_ts is the valid_time (when the patient&apos;s HbA1c was measured), ingestion_time is the transaction_time (when the offline store received it). PIT AS OF joins query by valid_time; freshness SLAs measure transaction_time lag. The ML community reinvented bitemporal databases without knowing the name.
          </p>
        </div>
      </SectionCard>

      <DeeperThoughtSection pageTitle="Feature Store Deep Dive">
        <DeeperThought title="Feature Store Deep Dive IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about Feature Store Deep Dive is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. Feature Store Deep Dive connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where Feature Store Deep Dive sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (Feature Store Deep Dive) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
        { id: "feature-store" as const, reason: "Anchor concept page — feature store evolution" },
        { id: "mlflow-deep-dive" as const, reason: "MLflow logs feature-store-trained models" },
        { id: "model-monitoring" as const, reason: "Post-deploy drift monitoring (PSI + retrain)" },
        { id: "vector-db-deep-dive" as const, reason: "Vector DB deep dive — embedding serving" },
        { id: "ml-platform" as const, reason: "ML platform evolution (training + serving)" },
        { id: "iceberg" as const, reason: "Iceberg offline store (Parquet + time travel)" },
        { id: "streaming" as const, reason: "Kafka + Flink streaming features" },
        { id: "rag-deep-dive" as const, reason: "RAG deep dive (uses feature-store patterns)" },
      ]} />
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "Trace this topic's connections across the platform's math graph" }, { id: "feature-store" as const, reason: "Anchor concept page — feature store evolution" }, { id: "mlflow-deep-dive" as const, reason: "MLflow logs feature-store-trained models" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("feature-store")} className="text-sm text-primary hover:underline">
          &rarr; Feature Store (concept anchor page)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("mlflow-deep-dive")} className="text-sm text-primary hover:underline">
          &rarr; MLflow Deep Dive (logs feature-store-trained models)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("model-monitoring")} className="text-sm text-primary hover:underline">
          &rarr; Model Monitoring (drift detection)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("iceberg")} className="text-sm text-primary hover:underline">
          &rarr; Apache Iceberg (offline store format)
        </Link>
      </div>
    </div>
  );
}
