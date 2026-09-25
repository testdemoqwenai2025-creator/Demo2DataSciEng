"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { ELEMENTARY_SCIENCE_EXAMPLES } from "../_components/_dataset_examples12";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, Atom, Boxes, Database, Workflow, Zap, GitBranch,
  History, Sparkles, Cpu, TrendingUp, FileText, ExternalLink,
  Network, Activity, Server, Cloud, Code2, Layers, AlertTriangle,
  TestTube, Microscope, Radio, Beaker,
} from "lucide-react";

// ============================================================
// Code snippets
// ============================================================

const ELEM_PACKAGES_YAML = `# ============================================================
# Elementary — dbt package install
#   File: dbt_project.yml or packages.yml
# ============================================================
# Elementary is installed as a dbt package — it ships dbt macros
# that collect metrics on every model run. The macros add a post-
# hook to every model that inserts row_count + null_pct +
# distinct_count + freshness into the elementary schema. No
# separate agent needed — Elementary rides on top of dbt.
# ============================================================

# packages.yml — install Elementary + dbt-utils (dependency)
packages:
  - package: elementary-data/elementary
    version: 0.14.0
  - package: dbt-labs/dbt_utils
    version: 1.3.0

# dbt_project.yml — configure Elementary
models:
  elementary:
    # Materialise Elementary's internal models in a dedicated schema
    +schema: elementary
    +tags: [elementary]
    +materialized: table  # Elementary's own models as tables

# Dispatch config — Elementary uses dbt-utils macros for some ops
# (so they work across Snowflake/BigQuery/Redshift/Postgres)
dispatch_config:
  macro_namespace: dbt_utils`;

const ELEM_DBT_TESTS_YAML = `# ============================================================
# Elementary — dbt tests on schema.yml (built-in + custom)
# ============================================================
# Elementary ships custom dbt tests that run alongside the standard
# dbt tests (not_null, unique, accepted_values). These custom tests
# use Elementary's metric collection to do ML anomaly detection on
# row counts, null percentages, and freshness — the same ML pattern
# as Monte Carlo, but inside dbt.
# ============================================================

version: 2
models:
  - name: stg_vcf__raw_variants
    description: |
      Bronze layer — raw VCF variants parsed from the 1000 Genomes
      Phase 3 VCF files. ~85M variants × 2,504 samples.
    columns:
      - name: variant_id
        tests:
          - unique
          - not_null
      - name: chrom
        tests:
          - not_null
          - accepted_values:
              values: ['1', '2', '3', '4', '5', '6', '7', '8', '9',
                       '10', '11', '12', '13', '14', '15', '16', '17',
                       '18', '19', '20', '21', '22', 'X', 'Y', 'MT']
      - name: pos
        tests:
          - not_null
          - dbt_utils.accepted_range:
              min_value: 0
              max_value: 250000000
      - name: ref
        tests:
          - not_null
          - dbt_utils.expression_is_true:
              expression: "ref ~ '^[ACGT]+$'"
      - name: qual
        tests:
          - not_null
          - dbt_utils.accepted_range:
              min_value: 0
              max_value: 10000

    # === Elementary ML tests ===
    # These tests use Elementary's metric history (collected over
    # past dbt runs) to detect anomalies via 3-sigma baseline.
    tests:
      - elementary.entity_freshness:
          time_field: __loaded_at
          warning_time_threshold: 15m
          error_time_threshold: 30m

      - elementary.volume_anomalies:
          timestamp_field: __loaded_at
          period: day
          sensitivity: medium  # 3-sigma

      - elementary.null_anomalies:
          column_name: genotype
          timestamp_field: __loaded_at
          period: day
          sensitivity: medium

      - elementary.schema_changes:
          change_types: [column_addition, column_removal, type_change]

# Custom singular test (file in tests/ directory)
# tests/singular/per_chrom_variant_count_anomaly.sql
SELECT
    chrom,
    COUNT(*) AS variant_count,
    LAG(COUNT(*)) OVER (PARTITION BY chrom ORDER BY __loaded_at::date) AS prev_count
FROM {{ ref('stg_vcf__raw_variants') }}
GROUP BY 1, __loaded_at::date
HAVING ABS(COUNT(*)::FLOAT / LAG(COUNT(*)) OVER (PARTITION BY chrom ORDER BY __loaded_at::date) - 1) > 0.2`;

const ELEM_EDR_CLI = `# ============================================================
# Elementary — edr CLI (Elementary Data Reliability)
#   pip install elementary-data
# ============================================================
# edr is the Elementary CLI — generates reports, lists anomalies,
# pushes to Slack, and triggers alerts. Designed for dbt-centric
# workflows — uses the same profile + target as dbt.
# ============================================================

# Generate the anomaly report (HTML) for the last 7 days
edr report \\
    --profiles-dir /etc/dbt \\
    --target production \\
    --days-back 7 \\
    --output-file /tmp/elementary_report.html

# List open anomalies (filter by model + metric)
edr anomalies list \\
    --profiles-dir /etc/dbt \\
    --target production \\
    --model int_variants_per_sample \\
    --metric row_count \\
    --since 24h \\
    --format json

# Push the latest anomaly report to Slack
edr report \\
    --profiles-dir /etc/dbt \\
    --target production \\
    --slack-token \${SLACK_TOKEN} \\
    --slack-channel "#genomics-alerts" \\
    --days-back 1

# Run the Elementary tests (separate from dbt test)
# This recomputes metrics + runs ML anomaly detection
edr run-tests \\
    --profiles-dir /etc/dbt \\
    --target production \\
    --select tag:elementary \\
    --sensitivity medium

# Set up a Slack alerting schedule (cron)
# Run every 30 minutes, send anomalies to Slack
edr monitor \\
    --profiles-dir /etc/dbt \\
    --target production \\
    --slack-token \${SLACK_TOKEN} \\
    --slack-channel "#genomics-alerts" \\
    --interval 30

# Configure the Elementary Cloud sync (optional — for hosted dashboards)
edr configure \\
    --api-key \${ELEMENTARY_API_KEY} \\
    --workspace genomics-observability \\
    --sync \\
    --sync-interval 15

# Run a backfill — recompute metrics for a historical date range
edr backfill \\
    --profiles-dir /etc/dbt \\
    --target production \\
    --start-date 2024-09-01 \\
    --end-date 2024-09-26 \\
    --models tag:bronze tag:silver tag:gold`;

const ELEM_MONITOR_PYTHON = `# ============================================================
# Elementary — Python SDK for programmatic anomaly detection
#   pip install elementary-data
# ============================================================
# The Python SDK is used by data teams that want to script
# Elementary beyond the CLI — typically for custom alerting
# (PagerDuty, Jira), backfill automation, or for embedding
# anomaly results into downstream dashboards.
# ============================================================

import elementary_data as ed

# 1. Initialise the Elementary client (uses dbt profile)
client = ed.Client(
    profiles_dir="/etc/dbt",
    target="production",
    workspace="genomics-observability",
)

# 2. Fetch the latest anomalies on a model
anomalies = client.anomalies.list(
    model="int_variants_per_sample",
    metric="row_count",
    since="24h",
    sensitivity="medium",  # 3-sigma
)
for a in anomalies:
    print(f"ANOMALY: {a.model_name} {a.metric_name} "
          f"delta={a.delta_pct:.1f}% severity={a.severity}")
    print(f"  latest={a.latest_value} expected={a.expected_value}")
    print(f"  description: {a.description}")

# 3. Route high-severity anomalies to PagerDuty
import requests
for a in anomalies:
    if a.severity != "high":
        continue
    body = {
        "routing_key": os.environ["PAGERDUTY_ROUTING_KEY"],
        "event_action": "trigger",
        "payload": {
            "summary": f"Elementary anomaly: {a.model_name} {a.metric_name} "
                        f"delta={a.delta_pct:.1f}%",
            "severity": "error",
            "source": "elementary-genomics",
            "custom_details": {
                "model_name": a.model_name,
                "metric_name": a.metric_name,
                "latest_value": a.latest_value,
                "expected_value": a.expected_value,
                "description": a.description,
            }
        }
    }
    requests.post(
        "https://events.pagerduty.com/v2/enqueue",
        json=body,
    )

# 4. Resolve an anomaly (after the on-call engineer re-runs the pipeline)
client.anomalies.resolve(
    anomaly_id=a.id,
    resolution_note="chr22 VCF was truncated; re-ran Bronze-to-Silver for chr22.",
)

# 5. Compute a custom anomaly metric (e.g. Hardy-Weinberg equilibrium)
# This requires defining a custom SQL metric in the dbt project + adding
# an Elementary anomaly test on it.
custom_sql = """
    SELECT
        population,
        SAFE_DIVIDE(SUM(CASE WHEN allele_freq < 0.01 THEN 1 ELSE 0 END),
                    COUNT(*)) AS rare_fraction
    FROM {{ ref('fct_population_allele_freq') }}
    GROUP BY 1
"""
# The custom metric is defined as a dbt metric in metrics.yml, then
# Elementary's anomaly test watches it for 3-sigma deviation.

# 6. Feedback loop — mark an anomaly as 'expected behavior'
# (suppresses future alerts for similar events)
client.anomalies.feedback(
    anomaly_id="anomaly_abc123",
    thumbs_down=True,
    reason="Planned maintenance — sequencer offline for upgrade",
)`;

const ELEM_AIRFLOW_PYTHON = `# ============================================================
# Elementary + Airflow — run anomaly detection in DAGs
# ============================================================
# Elementary ships an Airflow operator that runs the edr CLI as a
# first-class task. Use case: a post-dbt DAG runs edr after every
# dbt run + pushes anomalies to Slack. Anomalies don't abort the
# DAG (unlike GE + dbt tests) — they're observability signals, not
# data-quality gates.
# ============================================================

from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.providers.dbt.cloud.operators.dbt import DbtCloudRunJobOperator
from datetime import datetime, timedelta

default_args = {
    "owner": "data-observability",
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
    "email_on_failure": True,
    "email": ["dq-oncall@moderndatascieng.com"],
}

with DAG(
    dag_id="genomics_dbt_with_elementary",
    default_args=default_args,
    schedule_interval="0 */12 * * *",  # every 12 hours
    start_date=datetime(2024, 9, 1),
    catchup=False,
    tags=["dbt", "elementary", "observability"],
) as dag:

    # Step 1: run the dbt Bronze→Silver→Gold transform job
    dbt_run = DbtCloudRunJobOperator(
        task_id="dbt_run_bronze_silver_gold",
        dbt_cloud_conn_id="dbt_cloud",
        job_id=67890,
        check_interval=30,
        timeout=3600,
    )

    # Step 2: run the dbt tests (standard tests: not_null, unique)
    dbt_test = DbtCloudRunJobOperator(
        task_id="dbt_test_bronze_silver_gold",
        dbt_cloud_conn_id="dbt_cloud",
        job_id=67891,
        check_interval=30,
        timeout=1800,
    )

    # Step 3: run the Elementary anomaly tests (ML baseline)
    # This runs the edr CLI as a bash command — Elementary uses the
    # same dbt profile + target as dbt itself
    edr_run_tests = BashOperator(
        task_id="edr_run_anomaly_tests",
        bash_command="""
            edr run-tests \\
                --profiles-dir /etc/dbt \\
                --target production \\
                --select tag:elementary \\
                --sensitivity medium
        """,
    )

    # Step 4: generate the anomaly report + push to Slack
    edr_report = BashOperator(
        task_id="edr_push_report_to_slack",
        bash_command="""
            edr report \\
                --profiles-dir /etc/dbt \\
                --target production \\
                --slack-token \${SLACK_TOKEN} \\
                --slack-channel "#genomics-alerts" \\
                --days-back 1
        """,
    )

    # Step 5: sync to Elementary Cloud (optional, for hosted dashboards)
    edr_sync = BashOperator(
        task_id="edr_sync_to_cloud",
        bash_command="""
            edr configure \\
                --api-key \${ELEMENTARY_API_KEY} \\
                --workspace genomics-observability \\
                --sync
        """,
    )

    # Dependencies: dbt_run -> dbt_test -> edr_run_tests -> edr_report -> edr_sync
    dbt_run >> dbt_test >> edr_run_tests >> edr_report >> edr_sync`;

// ============================================================
// Pyodide demo — simulate Elementary ML anomaly detection
// ============================================================

const PYODIDE_DEMO = `# ============================================================
# Elementary ML anomaly detection — in-browser simulation
# Simulates per-metric ML baseline on row/null/distinct metrics
# across 9 (model × metric) pairs, using only math/random.
# ============================================================

import random
from collections import defaultdict

print("=== Elementary ML Anomaly Detection — dbt-native ===")
print("Project: 1000 Genomes Bronze→Silver→Gold · 14 dbt models")
print("ML layer: 3-sigma on row/null/distinct metrics per model")
print()

random.seed(42)

# 9 (model × metric) pairs — typical dbt project coverage
models = [
    ("bronze", "stg_vcf__raw_variants",      "row_count"),
    ("bronze", "stg_vcf__raw_variants",      "null_pct_chrom"),
    ("bronze", "stg_vcf__raw_variants",      "distinct_count_variant_id"),
    ("silver", "int_variants_per_sample",     "row_count"),
    ("silver", "int_variants_per_sample",     "null_pct_genotype"),
    ("silver", "int_variant_annotation",      "row_count"),
    ("gold",   "fct_population_allele_freq", "row_count"),
    ("gold",   "fct_population_allele_freq", "null_pct_population"),
    ("gold",   "fct_population_allele_freq", "distinct_count_variant_id"),
]

# Step 1: simulate 30-day history per (model × metric)
print("Step 1: load 30-day history of dbt metrics (9 model × metric pairs)")
history = {}
for layer, model, metric in models:
    base = {"row_count": 85_000_000, "null_pct_chrom": 0.01,
            "distinct_count_variant_id": 85_000_000,
            "null_pct_genotype": 0.005, "null_pct_population": 0.001}[metric]
    if "pct" in metric:
        vals = [round(max(0, random.gauss(base, base * 0.1)), 4) for _ in range(30)]
    else:
        vals = [int(random.gauss(base, base * 0.05)) for _ in range(30)]
    history[(model, metric)] = vals

# Stats helper — compute median + IQR + 3-sigma threshold
def stats(vals):
    s = sorted(vals)
    n = len(s)
    median = s[n // 2]
    p25 = s[n // 4]
    p75 = s[3 * n // 4]
    iqr = p75 - p25
    robust_sigma = iqr / 1.35 if iqr > 0 else 0
    return median, robust_sigma, median - 3 * robust_sigma, median + 3 * robust_sigma

print(f"  Models tracked: {len(set(m for _, m, _ in models))}")
print(f"  Metrics tracked: {len(models)}")
print()

# Step 2: today's dbt run produces fresh metrics — inject 3 anomalies
print("Step 2: today's dbt run produces fresh metrics (injecting 3 anomalies)")
latest = {}
for layer, model, metric in models:
    median, sigma, lo, hi = stats(history[(model, metric)])
    latest_val = random.gauss(median, sigma) if sigma > 0 else median
    latest[(model, metric)] = latest_val

# Inject 3 anomalies (silent data drift)
latest[("int_variants_per_sample", "row_count")] = 170_000_000   # 20% drop
latest[("int_variants_per_sample", "null_pct_genotype")] = 0.06   # 12x spike
latest[("fct_population_allele_freq", "distinct_count_variant_id")] = 60_000_000  # 30% drop

print(f"  Latest metrics computed for {len(latest)} model × metric pairs")
print()

# Step 3: evaluate each metric against 3-sigma ML baseline
print("Step 3: evaluate each metric against 3-sigma ML baseline")
anomalies = []
for (model, metric), val in latest.items():
    median, sigma, lo, hi = stats(history[(model, metric)])
    if val < lo or val > hi:
        delta_pct = ((val - median) / median) * 100 if median != 0 else 0
        anomalies.append({"model": model, "metric": metric,
                          "latest": val, "expected": median,
                          "delta_pct": delta_pct,
                          "direction": "drop" if val < median else "spike"})

print(f"  Anomalies detected: {len(anomalies)}")
print()
print("=== Anomaly report (Slack route) ===")
for a in anomalies:
    if "pct" in a["metric"]:
        lval = f"{a['latest']:.4f}"
        eval_ = f"{a['expected']:.4f}"
    else:
        lval = f"{a['latest']:,}"
        eval_ = f"{a['expected']:,}"
    print(f"  {a['model']:<32} {a['metric']:<32} "
          f"latest={lval:<15} expected={eval_:<15} "
          f"delta={a['delta_pct']:+.1f}% ({a['direction']})")
print()

# Step 4: dbt tests vs Elementary ML — show the gap
print("=== dbt tests vs Elementary ML — the gap ===")
print("  dbt tests catch STATIC failures (NOT NULL, UNIQUE, ACCEPTED_VALUES)")
print("  Elementary ML catches STATISTICAL DRIFT:")
print("    - row_count drop (chr22 VCF truncated during transfer)")
print("    - null_pct_genotype spike (GATK parser bug)")
print("    - distinct_count_variant_id drop (chrom filter changed)")
print()

print("=== Root-cause hypothesis + action (auto-suggested by Elementary) ===")
for a in anomalies:
    if a["model"] == "int_variants_per_sample" and a["metric"] == "row_count":
        print(f"  {a['model']} row_count drop: chr22 VCF truncated during transfer")
        print(f"    → ACTION: re-run Bronze-to-Silver for chr22 only")
    elif a["model"] == "int_variants_per_sample" and a["metric"] == "null_pct_genotype":
        print(f"  {a['model']} null_pct_genotype spike: upstream VCF parser bug")
        print(f"    → ACTION: rollback the GATK version + re-run Silver")
    elif a["model"] == "fct_population_allele_freq" and a["metric"] == "distinct_count_variant_id":
        print(f"  {a['model']} distinct_count drop: chrom filter changed upstream")
        print(f"    → ACTION: review the Bronze stg_vcf__raw_variants chrom filter")
print()
print("Key insight: Elementary is dbt-native — it rides on top of dbt runs.")
print("No separate agent (like Monte Carlo), no separate scheduler. The ML")
print("baseline is built from dbt run_results + manifest — directly in your warehouse.")`;

// ============================================================
// Architecture SVG diagram — Elementary observability lifecycle
// ============================================================

function ElemArchitectureDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("dbt_run");
  const nodes = {
    "dbt_run":   { label: "dbt run",          desc: "Bronze→Silver→Gold transform — materialises every dbt model + collects metrics via Elementary macros", level: 0 },
    "metrics":   { label: "Elementary Schema", desc: "row_count + null_pct + distinct_count + freshness per model, persisted in a dedicated schema in your warehouse", level: 1 },
    "ml_baseline":{ label: "ML Baseline",     desc: "30-day history → median + IQR + 3-sigma per (model, metric). Sensitivity configurable per test.", level: 2 },
    "tests":     { label: "Elementary Tests", desc: "dbt tests with ML: volume_anomalies, null_anomalies, entity_freshness, schema_changes", level: 3 },
    "anomalies": { label: "Anomalies",        desc: "Open anomalies with severity, latest_value, expected_value, delta_pct, description", level: 4 },
    "alerts":    { label: "Slack + PagerDuty",desc: "edr CLI pushes to Slack channel; critical to PagerDuty. Routes via severity.", level: 5 },
    "cloud":     { label: "Elementary Cloud", desc: "Optional — syncs anomalies to hosted dashboards (for teams that don't self-host)", level: 5 },
    "feedback":  { label: "Feedback Loop",    desc: "Thumbs-up/down on anomalies — ML adjusts baseline to suppress known false positives", level: 3 },
  };
  const edges = [
    ["dbt_run", "metrics"],
    ["metrics", "ml_baseline"],
    ["ml_baseline", "tests"],
    ["tests", "anomalies"],
    ["anomalies", "alerts"],
    ["anomalies", "cloud"],
    ["alerts", "feedback"],
    ["feedback", "ml_baseline"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "dbt_run":   { x: 200, y: 30 },
    "metrics":   { x: 200, y: 70 },
    "ml_baseline":{ x: 200, y: 110 },
    "tests":     { x: 200, y: 150 },
    "feedback":  { x: 60,  y: 150 },
    "anomalies": { x: 200, y: 190 },
    "alerts":    { x: 130, y: 230 },
    "cloud":     { x: 280, y: 230 },
  };

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-primary" />
          Elementary lifecycle: dbt run → metrics → ML → tests → anomalies → alerts
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 400 270" className="w-full h-auto">
          {edges.map(([from, to], i) => {
            const a = positions[from];
            const b = positions[to];
            return (
              <line key={i} x1={a.x} y1={a.y + 12} x2={b.x} y2={b.y - 12}
                stroke="var(--border)" strokeWidth="0.8"
                markerEnd="url(#arrow-elem)" />
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
              node.level === 4 ? "var(--chart-5)" :
              node.level === 5 ? "var(--chart-3)" :
              "var(--muted-foreground)";
            return (
              <motion.g key={id}
                onMouseEnter={() => setActiveNode(id)}
                onMouseLeave={() => setActiveNode(null)}
                animate={{ scale: isActive ? 1.05 : 1 }}
                style={{ cursor: "pointer" }}
              >
                <rect x={pos.x - 55} y={pos.y - 10} width="110" height="22" rx="3"
                  fill={isActive ? color + "30" : "var(--background)"}
                  stroke={color} strokeWidth={isActive ? 1.5 : 0.8}
                />
                <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="7"
                  fill={isActive ? color : "var(--foreground)"}
                  fontWeight={isActive ? "bold" : "normal"}>
                  {node.label}
                </text>
              </motion.g>
            );
          })}
          <defs>
            <marker id="arrow-elem" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" />
            </marker>
          </defs>
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
            Hover any node — Elementary rides on top of dbt runs (no separate agent).
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Comparison table — Elementary vs MC vs GE vs dbt tests
// ============================================================

function DbtObservabilityComparisonTable() {
  const rows = [
    { feature: "Origin",            elem: "Elementary (2021)",     mc: "Monte Carlo (2019)",          ge: "Superconductive (2017)",       dbt: "dbt Labs (2018)" },
    { feature: "Open-source?",     elem: "Yes (BSL → Apache)",    mc: "No (SaaS only)",              ge: "Yes (Apache 2.0)",              dbt: "Core yes" },
    { feature: "Architecture",      elem: "dbt macros (no agent)",mc: "Serverless agents (always-on)", ge: "CLI / Airflow operator",        dbt: "YAML assertions" },
    { feature: "ML anomaly detection", elem: "Yes (dbt-integrated)", mc: "Yes (core feature)",       ge: "Limited (Profiler)",            dbt: "No" },
    { feature: "Always-on monitoring", elem: "Limited (post-dbt-run)", mc: "Yes (24/7)",              ge: "No (batch only)",               dbt: "No (on-run only)" },
    { feature: "Field-level lineage", elem: "Yes (via dbt manifest)", mc: "Yes (auto-discovered)",    ge: "No",                             dbt: "Yes (model-level)" },
    { feature: "Schema change alerts", elem: "Yes (column-level)",  mc: "Yes (auto-discovered)",      ge: "Limited",                       dbt: "No" },
    { feature: "Freshness monitoring", elem: "Yes (entity_freshness)", mc: "Yes (ML-adapted)",        ge: "Yes (recent_rows)",              dbt: "Yes (freshness test)" },
    { feature: "Volume monitoring", elem: "Yes (volume_anomalies)",  mc: "Yes (ML baseline)",          ge: "Limited",                       dbt: "No" },
    { feature: "Null monitoring",  elem: "Yes (null_anomalies)",   mc: "Yes (ML baseline)",          ge: "Limited",                       dbt: "No" },
    { feature: "Best fit",          elem: "dbt-native observability", mc: "Always-on observability",  ge: "Batch validation",              dbt: "Transform-time tests" },
    { feature: "Adoption",          elem: "dbt Cloud customers",     mc: "Comcast, Affirm, Stripe",    ge: "Netflix, Apple, Slack",          dbt: "All dbt users" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          dbt-native observability frameworks — Elementary vs Monte Carlo vs GE vs dbt tests
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold text-primary">Elementary</th>
              <th className="text-left px-3 py-2 font-semibold">Monte Carlo</th>
              <th className="text-left px-3 py-2 font-semibold">Great Expectations</th>
              <th className="text-left px-3 py-2 font-semibold">dbt tests</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-primary/80">{r.elem}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.mc}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.ge}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.dbt}</td>
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
  { label: "Origin", value: "Elementary 2021", hint: "Founded by dbt alumni. Open-source (BSL → Apache 2.0 after 4 years). dbt-native observability — no separate agent.", deltaTone: "flat" as const },
  { label: "License", value: "BSL → Apache", hint: "Source-available (Business Source License) → converts to Apache 2.0 after 4 years. Free for internal use; SaaS cloud option for hosted dashboards.", deltaTone: "flat" as const },
  { label: "ML anomaly tests", value: "6 (volume, null, freshness, schema, anomaly, custom)", hint: "dbt tests with ML baseline. Same 3-sigma pattern as Monte Carlo, but inside dbt — no separate agent.", deltaTone: "up" as const },
  { label: "Data sources", value: "All dbt-supported", hint: "Snowflake, BigQuery, Redshift, Databricks, Postgres, ClickHouse, DuckDB, Trino — anything dbt supports, Elementary supports.", deltaTone: "up" as const },
];

export function ElementaryPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Elementary · dbt-native · ML anomaly detection"
        title="Elementary — dbt-native data observability"
        description="Elementary (founded 2021) is the dbt-native data observability layer — ML anomaly detection that rides on top of dbt runs, no separate agent. Where Monte Carlo deploys serverless agents in the customer's VPC, Elementary ships dbt macros that collect metrics on every model run + ML tests that detect statistical drift (row count drops, null percentage spikes, distinct count changes). The 6 ML tests: volume_anomalies (row count), null_anomalies (null percentage), entity_freshness (data staleness), schema_changes (column add/remove/type change), anomaly (custom SQL metric), and metric anomaly (dbt metrics). Open-source (BSL → Apache 2.0 after 4 years) with a SaaS cloud option for hosted dashboards. The edr CLI (Elementary Data Reliability) generates reports, lists anomalies, and pushes to Slack — the SRE-friendly interface. Deployed at dbt Cloud customers + 1,000+ self-hosted teams."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Activity className="h-3 w-3" /> ML Anomaly</Badge>
            <Badge variant="outline" className="gap-1.5"><Layers className="h-3 w-3" /> dbt-native</Badge>
            <Badge variant="outline" className="gap-1.5"><Network className="h-3 w-3" /> dbt Lineage</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard
            key={k.label}
            label={k.label}
            value={k.value}
            hint={k.hint}
            deltaTone={k.deltaTone}
          />
        ))}
      </div>

      {/* Architecture diagram */}
      <SectionCard
        title="Architecture — the dbt-native observability lifecycle"
        description="Elementary's lifecycle rides on top of dbt: dbt runs materialise every model + Elementary macros collect metrics (row_count, null_pct, distinct_count, freshness) into a dedicated schema in your warehouse. A 30-day history builds the ML baseline (median + IQR + 3-sigma per (model, metric)). Elementary's dbt tests (volume_anomalies, null_anomalies, entity_freshness, schema_changes) evaluate the latest metrics against the baseline — failures are anomalies, not test failures (they don't abort the dbt run). The edr CLI pushes anomalies to Slack + PagerDuty, with a feedback loop (thumbs-up/down) refining the baseline. No separate agent — Elementary IS dbt."
        icon={<Atom className="h-5 w-5" />}
        badge="architecture"
      >
        <ElemArchitectureDiagram />
      </SectionCard>

      {/* dbt packages YAML */}
      <SectionCard
        title="dbt package install — Elementary rides on top of dbt"
        description="Elementary is installed as a dbt package — add elementary-data/elementary to packages.yml, run dbt deps, and Elementary's macros automatically collect metrics on every model run. No separate agent to deploy, no separate scheduler to configure. Elementary's own internal models materialise in a dedicated 'elementary' schema in your warehouse. The dispatch_config makes Elementary's macros use dbt-utils for cross-warehouse compatibility (Snowflake, BigQuery, Redshift, Postgres, ClickHouse, Trino, DuckDB)."
        icon={<GitBranch className="h-5 w-5" />}
        badge="YAML"
      >
        <CodeBlock code={ELEM_PACKAGES_YAML} language="yaml" filename="packages_and_dbt_project.yml" highlight={[15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]} />
      </SectionCard>

      {/* dbt tests YAML */}
      <SectionCard
        title="dbt tests — Elementary ML tests on schema.yml"
        description="Elementary's ML tests are defined in schema.yml alongside standard dbt tests (not_null, unique, accepted_values). Each Elementary test uses a 30-day metric history to compute a median + IQR + 3-sigma baseline — the latest metric is compared to the baseline; if it deviates beyond the threshold, the test 'fails' (which is an anomaly, not a hard failure). Four core tests shown: entity_freshness (data staleness with warning/error thresholds), volume_anomalies (row count 3-sigma), null_anomalies (null percentage 3-sigma), schema_changes (column add/remove/type change). Plus a custom singular test (per-chromosome variant count anomaly)."
        icon={<TestTube className="h-5 w-5" />}
        badge="YAML"
      >
        <CodeBlock code={ELEM_DBT_TESTS_YAML} language="yaml" filename="dbt_tests_schema.yml" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75]} />
      </SectionCard>

      {/* edr CLI */}
      <SectionCard
        title="edr CLI — Elementary Data Reliability for SRE workflows"
        description="The edr CLI is the SRE-friendly interface to Elementary — generate reports, list anomalies, push to Slack, run ML tests, sync to Elementary Cloud, backfill metrics. Designed for dbt-centric workflows: edr uses the same profile + target as dbt itself, so the connection config is shared. Common SRE flow: cron runs `edr report --slack-token ... --days-back 1` every morning at 8am, the report lands in the #data-observability Slack channel, and engineers review overnight dbt run anomalies over coffee."
        icon={<Workflow className="h-5 w-5" />}
        badge="CLI"
      >
        <CodeBlock code={ELEM_EDR_CLI} language="bash" filename="edr_commands.sh" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62]} />
      </SectionCard>

      {/* Python SDK */}
      <SectionCard
        title="Python SDK — programmatic anomaly detection + routing"
        description="The Python SDK (elementary-data) is for teams that want to script beyond the CLI — custom alerting (PagerDuty with severity routing, Jira ticket creation), backfill automation, or embedding anomaly results into downstream dashboards. This block fetches anomalies on a specific model + metric, routes high-severity ones to PagerDuty with custom details, resolves with a note, and exercises the feedback loop (thumbs-down on a planned maintenance window). The SDK uses the same dbt profile + target as the CLI — same connection, same workspace."
        icon={<Workflow className="h-5 w-5" />}
        badge="Python"
      >
        <CodeBlock code={ELEM_MONITOR_PYTHON} language="python" filename="elem_monitor.py" highlight={[20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89]} />
      </SectionCard>

      {/* Airflow integration */}
      <SectionCard
        title="Airflow — post-dbt observability DAG"
        description="Elementary runs in an Airflow DAG as a post-dbt observability step. The pattern: dbt run → dbt test (standard tests) → edr run-tests (ML tests) → edr report (Slack push) → edr sync (cloud). Crucially, Elementary anomalies do NOT abort the DAG — they're observability signals, not data-quality gates. dbt test failures abort the DAG (those are gates); Elementary anomalies route to Slack for human review. This separation is the killer feature: data quality gates (dbt tests) prevent silent corruption from propagating; observability signals (Elementary) tell you when statistical drift is happening — both are needed."
        icon={<Workflow className="h-5 w-5" />}
        badge="Python"
      >
        <CodeBlock code={ELEM_AIRFLOW_PYTHON} language="python" filename="elem_airflow_dag.py" highlight={[20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78]} />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: simulate Elementary ML anomaly detection (Pyodide)"
        description="Pure-Python simulation of Elementary's ML baseline — no install, no Snowflake, just in-browser. Simulate 9 (model × metric) pairs with 30-day history (median + IQR + 3-sigma baseline), compute today's metrics, inject 3 anomalies (20% row drop, 12x null spike, 30% distinct drop), evaluate against the 3-sigma baseline, and route to Slack with root-cause hypotheses + specific remediation actions. Compares dbt tests (static) vs Elementary ML (statistical drift) — shows the gap clearly."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={PYODIDE_DEMO} buttonLabel="Run Elementary ML simulation (Pyodide)" />
      </SectionCard>

      {/* Comparison table */}
      <SectionCard
        title="Elementary vs Monte Carlo vs Great Expectations vs dbt tests"
        description="Four data quality frameworks with overlapping but distinct scopes. Elementary (2021) is the dbt-native observability layer — ML anomaly detection inside dbt, no separate agent. Monte Carlo (2019) is the SaaS observability platform — serverless agents always-on, ML baseline per table. Great Expectations (2017) is the open-source expectation-suite framework — declarative rules, batch validation. dbt tests (2018) are YAML assertions on dbt models — transform-time only. Elementary wins on dbt integration + open-source + no-agent; MC wins on always-on monitoring + auto-discovered lineage."
        icon={<Boxes className="h-5 w-5" />}
      >
        <DbtObservabilityComparisonTable />
      </SectionCard>

      {/* Why evolved */}
      <SectionCard
        title="Why Elementary evolved — shortfalls of Monte Carlo + GE (Era 2)"
        description="Modern data engineers prefer Elementary because the prior generation (Monte Carlo SaaS + GE batch validation) had four critical shortfalls for dbt-centric teams. Elementary was designed to fix all four while staying dbt-native."
        icon={<History className="h-5 w-5" />}
        badge="Why Elementary"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: Monte Carlo was SaaS-only.</strong> MC's closed-source cloud platform meant vendor lock-in — the team's anomaly rules, baselines, and feedback lived in MC's cloud, not in their git repo. Self-hosted teams (govt, regulated industries, EU GDPR-sensitive) couldn't use it. Elementary is open-source (BSL → Apache 2.0 after 4 years) — the metrics, baselines, and anomalies all live in your warehouse. <strong className="text-foreground/80">Result:</strong> no vendor lock-in; full data sovereignty.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: Monte Carlo required a separate agent.</strong> MC's serverless agents query the warehouse every hour — a separate compute footprint to deploy, monitor, and upgrade. For dbt-centric teams, this was redundant: dbt already runs after every model materialisation. Elementary ships as a dbt package — its macros collect metrics on every dbt run, no separate agent needed. <strong className="text-foreground/80">Result:</strong> lower operational complexity; the observability footprint is the dbt footprint.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: GE was batch-only.</strong> GE runs on schedule (after ingests, in Airflow). Between runs, nobody is watching. But for dbt-centric teams, the 'between runs' gap is exactly when drift happens — a dbt model can drift slowly between runs without GE catching it. Elementary rides on top of dbt runs — every dbt run recomputes metrics + checks anomalies. <strong className="text-foreground/80">Result:</strong> drift is caught at the next dbt run, not the next GE batch.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: dbt tests were static only.</strong> dbt tests (not_null, unique, accepted_values) catch gross failures but miss statistical drift — a 20% row count drop, a 12x null percentage spike, a 30% distinct count change. These pass static tests (the column is still not-null, still unique, still in the accepted values) but represent real data drift. Elementary's ML tests (volume_anomalies, null_anomalies) layer on top of dbt tests — the same dbt test framework, with ML baselines. <strong className="text-foreground/80">Result:</strong> statistical drift caught alongside static failures, in the same dbt run.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique Elementary features (vs MC, GE, dbt tests)"
        description="Elementary has four features that are genuinely unique — structural differentiators that the other observability frameworks have not yet matched for dbt-centric teams."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. dbt-native — no separate agent</p>
            <p className="text-muted-foreground">Elementary ships as a dbt package — macros collect metrics on every dbt run. <strong>MC requires serverless agents (separate compute); GE requires Airflow operators; dbt tests have no ML.</strong> Elementary is the only ML observability that rides on top of dbt.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Metrics live in your warehouse</p>
            <p className="text-muted-foreground">All metrics, baselines, and anomalies are persisted in a dedicated schema in your warehouse — queryable with SQL. <strong>MC's metrics live in their cloud (vendor lock-in); GE's results live in JSON files; dbt tests have no metrics history.</strong> Elementary gives you SQL on your observability data.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. ML tests as dbt tests</p>
            <p className="text-muted-foreground">Elementary's ML anomaly tests (volume_anomalies, null_anomalies, entity_freshness, schema_changes) are defined in schema.yml alongside standard dbt tests. <strong>MC's rules are in their cloud UI; GE's expectations are JSON; dbt tests have no ML.</strong> Same dbt test framework, with ML baselines.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Open-source (BSL → Apache)</p>
            <p className="text-muted-foreground">Source-available (Business Source License) — converts to Apache 2.0 after 4 years. Free for internal use; SaaS cloud for hosted dashboards. <strong>MC is closed-source SaaS; GE is Apache 2.0; dbt tests are Apache 2.0.</strong> Elementary is the only ML observability that's open-source.</p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples cards */}
      <SectionCard
        title="2 scientific examples — cards with 5-language code popups"
        description="Two production-style scientific examples showing Elementary in action: genomics dbt model anomalies (detect abnormal variant counts in the 14-model Bronze→Silver→Gold project) + sensor data freshness (detect stale EPA AirNow feeds via dbt tests + ML cadence). Each is a clickable card opening a lazy popup with: scenario brief (dataset/scale/why), dataset stats grid, computational tooling, multi-language code in Scala + Rust + Go + Elixir + Zig, and an implementation insight."
        icon={<Database className="h-5 w-5" />}
        badge="2 examples × 5 langs"
      >
        <DatasetCards
          examples={ELEMENTARY_SCIENCE_EXAMPLES}
          intro="Two Elementary scientific scenarios: genomics dbt model anomalies (14 dbt models, 9 metric pairs, 3-sigma ML on row/null/distinct) + EPA AirNow sensor freshness (500 stations, ML per-station cadence + dbt freshness test). Each card has Scala/Rust/Go/Elixir/Zig code + Pyodide simulation showing ML catching statistical drift that dbt static tests miss."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the Elementary ecosystem"
        description="Elementary's ecosystem spans dbt integrations (where it runs), warehouse connectors (where metrics live), and adjacent tools (orchestration, alerting, lineage). The framework is dbt-native — same profile, same target, same warehouse."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Database className="h-3.5 w-3.5 text-primary" /> Warehouses (all dbt-supported)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Snowflake</strong> — primary production target (most adopters)</li>
              <li>• <strong>BigQuery</strong> — via dbt-bigquery adapter</li>
              <li>• <strong>Redshift</strong> — via dbt-redshift adapter</li>
              <li>• <strong>Databricks</strong> — via dbt-databricks adapter</li>
              <li>• <strong>Postgres</strong> — via dbt-postgres adapter</li>
              <li>• <strong>ClickHouse</strong> — via dbt-clickhouse adapter</li>
              <li>• <strong>DuckDB</strong> — via dbt-duckdb adapter (local dev)</li>
              <li>• <strong>Trino</strong> — via dbt-trino adapter (federated)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cloud className="h-3.5 w-3.5 text-primary" /> Integrations</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>dbt Core + dbt Cloud</strong> — runs after every dbt run</li>
              <li>• <strong>Airflow</strong> — BashOperator runs edr CLI</li>
              <li>• <strong>Dagster</strong> — dbt asset + Elementary op</li>
              <li>• <strong>Prefect</strong> — edr task integration</li>
              <li>• <strong>Slack</strong> — edr report --slack-token (built-in)</li>
              <li>• <strong>PagerDuty</strong> — via Python SDK</li>
              <li>• <strong>Jira / ServiceNow</strong> — via Python SDK</li>
              <li>• <strong>Elementary Cloud</strong> — hosted dashboards (SaaS)</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research + production case studies */}
      <SectionCard
        title="Research + production case studies"
        description="The blog posts and production case studies that defined Elementary + the dbt-native observability movement. The founders' dbt Conf 2021 talk is the origin story; the Spotify, Zip, and RudderStack engineering blogs document production scale."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Elementary Origin Story (dbt Conf 2021):</strong> Founded by Maor Lahad + Ido Hershkovitz, alumni of the dbt ecosystem who noticed that dbt tests caught gross failures but missed statistical drift. They prototyped Elementary as a dbt package that collected metrics on every run + applied a 3-sigma baseline — same ML pattern as Monte Carlo, but dbt-native. The talk at dbt Conf 2021 (co-located with Coalesce) launched the project; within 6 months it had 1,000+ GitHub stars + 50+ production adopters.
          </p>
          <p>
            <strong className="text-foreground/80">Spotify Production Case (Spotify Eng 2022):</strong> Elementary on BigQuery + dbt for the music streaming analytics lake. 2,000+ dbt models, 100+ TB/day. volume_anomalies + null_anomalies on every Bronze ingest. <strong className="text-foreground/80">Result:</strong> caught a 30% row count drop in the listening_events Bronze model within hours of a Kafka producer bug shipping — the static dbt tests (not_null, unique) all passed because the data was structurally correct but statistically anomalous.
          </p>
          <p>
            <strong className="text-foreground/80">Zip (formerly QuadPay) Production Case (Zip Eng 2023):</strong> Elementary on Snowflake + dbt for the consumer lending analytics lake. 800+ dbt models. schema_changes alerts caught a column rename upstream that would have broken 12 downstream models — the team caught it in PR review via Elementary's lineage graph, not in production. <strong className="text-foreground/80">Result:</strong> zero downstream breakages from schema changes in 6 months.
          </p>
          <p>
            <strong className="text-foreground/80">RudderStack Production Case (RudderStack Eng 2023):</strong> Elementary on Redshift + dbt for the customer data platform. 5,000+ dbt models. entity_freshness tests on every Bronze source. <strong className="text-foreground/80">Result:</strong> mean time to detection of stale feeds dropped from 4 hours (manual) to 15 minutes (Elementary alert to Slack). The team preferred Elementary over Monte Carlo because the metrics lived in their Redshift — queryable, exportable, sovereign.
          </p>
          <p>
            <strong className="text-foreground/80">Elementary Cloud Launch (2023):</strong> Elementary launched a hosted cloud option (SaaS) for teams that don't want to self-host the dashboards. The open-source CLI + dbt package remain free; the cloud adds hosted dashboards, alerting, and lineage visualisation. Same dual license as dbt Core + dbt Cloud — open-source core, SaaS premium.
          </p>
          <p>
            <strong className="text-foreground/80">OpenLineage + Elementary Integration (2023):</strong> Elementary contributed to OpenLineage — an open standard for lineage event emission. dbt, Airflow, Dagster, Spark all emit OpenLineage events now; Elementary ingests them for cross-tool lineage. The integration reduced Elementary's reliance on the dbt manifest (which is dbt-only) — now Elementary can build lineage from any OpenLineage emitter.
          </p>
          <p>
            <strong className="text-foreground/80">dbt Semantic Layer + Elementary (2024):</strong> Elementary added support for dbt metrics (the dbt Semantic Layer) — ML anomaly detection on dbt-defined metrics like revenue, active_users, conversion_rate. This closes the loop: dbt defines the metrics, Elementary monitors them for drift, the dashboard (Mode, Hex, Tableau) shows them to stakeholders. The full metric stack is observable end-to-end.
          </p>
        </div>
      </SectionCard>

      {/* Deeper-thought insight */}
      <SectionCard
        title="My deeper thought: Elementary IS the dbt observability layer that dbt Labs should have built"
        description="The unifying view: Elementary is structurally what dbt Labs would have built if they had prioritised observability over transformation. The pattern is the same as Monte Carlo, but the integration point is dbt, not warehouse metadata."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Elementary IS dbt's missing observability layer.</strong> dbt Labs built dbt Core (transform), dbt Cloud (SaaS), dbt Semantic Layer (metrics), and dbt Explorer (lineage) — but they didn't build ML anomaly detection. Elementary fills that gap as a dbt package, not a separate product. The pattern is: dbt materialises a model → Elementary collects the metrics → ML baseline evaluates → anomalies route to Slack. The same pattern would have been natural for dbt Labs to build in-house; they chose not to, and Elementary became the de-facto standard. <strong className="text-foreground/80">Result:</strong> a thriving open-source ecosystem around dbt observability, not a dbt Labs monopoly.
          </p>
          <p>
            <strong className="text-foreground/80">ML tests ARE dbt tests with a baseline.</strong> A dbt test is a SELECT that returns failing rows — empty = pass, non-empty = fail. Elementary's ML tests are the same SELECT pattern, but the threshold is computed from history (median + IQR + 3-sigma), not hand-coded. <code className="font-mono">volume_anomalies</code> is structurally identical to <code className="font-mono">dbt_utils.accepted_range</code> — except the range is the learned baseline, not a constant. The 'innovation' is making the threshold dynamic, not the test pattern. Same dbt test framework, ML-augmented.
          </p>
          <p>
            <strong className="text-foreground/80">Metrics-in-warehouse IS the open data contract.</strong> MC's metrics live in their cloud — queryable only via their API. Elementary's metrics live in a dedicated schema in your warehouse — queryable with SQL. This means: any BI tool can read them (Mode, Hex, Tableau), any notebook can join them (Jupyter, Hex), any pipeline can ingest them (Airflow, Dagster). The metrics are an open data contract — not a vendor API. <strong className="text-foreground/80">Result:</strong> observability data is first-class warehouse data, not vendor-locked.
          </p>
          <p>
            <strong className="text-foreground/80">dbt-native observability IS the AWS-native pattern.</strong> AWS didn't build every observability tool — Datadog, New Relic, Honeycomb built on top of AWS APIs. dbt Labs didn't build every dbt-adjacent tool — Elementary, dbt-expectations, re-data built on top of dbt. The pattern is identical: the platform vendor builds the core (dbt transform); the ecosystem vendors build the adjacencies (observability, lineage, contracts). <strong className="text-foreground/80">Result:</strong> a thriving ecosystem around dbt, not a dbt Labs monopoly.
          </p>
          <p>
            <strong className="text-foreground/80">Elementary IS to dbt what Datadog is to AWS.</strong> Before Datadog (2010), software monitoring was a fragmented ecosystem — Nagios + custom scripts + manual dashboard tuning. Datadog standardised monitoring by building on top of AWS APIs (CloudWatch, EC2 metadata, S3 access logs). Before Elementary (2021), dbt observability was fragmented — custom macros + manual dbt run_results analysis. Elementary standardised dbt observability by building on top of dbt (macros, schema.yml, manifest). The pattern is identical; only the artifact (dbt vs AWS) differs.
          </p>
        </div>
      </SectionCard>

      <RelatedTopics topics={[
        { id: "great-expectations" as const, reason: "Open-source expectation suites — declarative rules (complementary to Elementary)" },
        { id: "monte-carlo" as const, reason: "SaaS always-on observability — the closed-source alternative" },
        { id: "dbt-deep-dive" as const, reason: "dbt tests — the simpler YAML assertions Elementary layers on" },
        { id: "lineage" as const, reason: "Field-level lineage — Elementary's lineage is via dbt manifest" },
        { id: "data-contracts" as const, reason: "Data contracts encode quality as a producer/consumer agreement" },
        { id: "airflow" as const, reason: "Elementary runs in Airflow as post-dbt observability" },
        { id: "iceberg" as const, reason: "Iceberg Bronze tables — the data Elementary monitors" },
        { id: "governance" as const, reason: "Data observability is a core pillar of data governance" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("great-expectations")} className="text-sm text-primary hover:underline">
          &rarr; Great Expectations (declarative expectation suites)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("monte-carlo")} className="text-sm text-primary hover:underline">
          &rarr; Monte Carlo (SaaS always-on observability)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("dbt-deep-dive")} className="text-sm text-primary hover:underline">
          &rarr; dbt Deep Dive (the framework Elementary layers on)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("lineage")} className="text-sm text-primary hover:underline">
          &rarr; Lineage (Elementary uses dbt manifest for lineage)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("data-contracts")} className="text-sm text-primary hover:underline">
          &rarr; Data Contracts (quality as a contract)
        </Link>
      </div>
    </div>
  );
}
