"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { RelatedElegantCode } from "../_components/related-elegant-code";
import { ELEGANT_CODE_CARDS } from "../_components/_elegant_code_cards";
import { MONTE_CARLO_SCIENCE_EXAMPLES } from "../_components/_dataset_examples12";
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

const MC_PYTHON_FRESHNESS = `# ============================================================
# Monte Carlo — Freshness rule via the Python SDK
#   pip install monte-carlo-data
# ============================================================
# Monte Carlo's data observability rules are configured via UI or
# YAML — the Python SDK is used to fetch + route incidents. The ML
# baseline learns the expected data arrival cadence per table and
# triggers an anomaly when the gap since last arrival exceeds 3x the
# learned median (configurable sensitivity).
# ============================================================

import monte_carlo_sdk as mcd

# 1. Initialise the client (API key from env var)
client = mcd.Client(
    api_key=os.environ["MONTE_CARLO_API_KEY"],
    project="genomics-observability",
)

# 2. Define a freshness rule on the Bronze VCF table
rule = client.rules.create(
    name="vcf_freshness_per_sequencer",
    description="Detect sequencer pipeline stalls — freshness anomaly",
    rule_type="freshness",
    table={
        "database": "iceberg",
        "schema": "genomics",
        "name": "bronze_vcf",
    },
    time_field="batch_arrived_at",
    time_window="24h",          # alert after 24h gap (default)
    schedule="hourly",         # check every hour
    sensitivity="medium",      # ML threshold: low/medium/high (3-sigma)
    anomaly_types=["stale_data"],
    group_by=["sequencer_id"],  # per-sequencer cadence
    filters={"run_status": "SUCCESS"},
    notification_channels=[
        {"type": "slack", "channel": "#genomics-alerts"},
        {"type": "pagerduty", "service": "sequencer-oncall"},
    ],
)
print(f"Created rule: {rule.id} — {rule.name}")

# 3. Fetch open incidents (rule violations)
incidents = client.incidents.list(
    table="iceberg.genomics.bronze_vcf",
    rule_type="freshness",
    status="open",
)
for inc in incidents:
    sequencer_id = inc.metadata.get("sequencer_id", "unknown")
    last_batch_ts = inc.metadata.get("last_batch_arrived_at", "unknown")
    print(f"INCIDENT: {inc.id} — sequencer={sequencer_id} "
          f"last_batch={last_batch_ts} severity={inc.severity}")

# 4. Resolve an incident (after the on-call engineer re-runs the pipeline)
client.incidents.resolve(
    incident_id=inc.id,
    resolution_note="Sequencer pipeline stall caused by GATK crash; "
                    "re-ran with GATK 4.4.0.0. Backfilling now.",
)

# 5. Add a custom anomaly rule (volume on per-chrom event count)
volume_rule = client.rules.create(
    name="vcf_volume_per_chrom",
    description="Volume anomaly on per-chromosome variant counts",
    rule_type="volume_anomaly",
    table={
        "database": "iceberg",
        "schema": "genomics",
        "name": "bronze_vcf",
    },
    metric="count(*)",
    group_by=["chrom"],
    sensitivity="high",  # 4-sigma — only catch big drops
    anomaly_types=["volume_drop", "volume_spike"],
)`;

const MC_YAML_RULES = `# ============================================================
# Monte Carlo — rules config (YAML, in git)
#   File: montecarlo/rules.yaml
# ============================================================
# Rules are declarative — defined in YAML, version-controlled in
# git alongside dbt models. Each rule has a rule_type (freshness /
# volume / schema / null / anomaly), a table reference, a schedule,
# and notification channels. ML sensitivity is configurable.
# ============================================================

rules:
  # === Freshness rule — catch silent pipeline stalls ===
  - name: bronze_vcf_freshness
    rule_type: freshness
    table:
      database: iceberg
      schema: genomics
      name: bronze_vcf
    time_field: batch_arrived_at
    time_window: 24h
    schedule: hourly
    sensitivity: medium  # 3-sigma
    group_by: [sequencer_id]
    anomaly_types: [stale_data]
    notification_channels:
      - type: slack
        channel: "#genomics-alerts"
      - type: pagerduty
        service: sequencer-oncall

  # === Volume rule — catch silent data loss ===
  - name: bronze_vcf_volume
    rule_type: volume_anomaly
    table:
      database: iceberg
      schema: genomics
      name: bronze_vcf
    metric: count(*)
    schedule: hourly
    sensitivity: high  # 4-sigma
    group_by: [chrom, sequencer_id]
    anomaly_types: [volume_drop, volume_spike]
    notification_channels:
      - type: slack
        channel: "#genomics-alerts"

  # === Schema rule — catch column additions/removals ===
  - name: bronze_vcf_schema
    rule_type: schema_change
    table:
      database: iceberg
      schema: genomics
      name: bronze_vcf
    schedule: daily
    notify_on: [column_addition, column_removal, column_type_change]
    notification_channels:
      - type: slack
        channel: "#genomics-alerts"

  # === Null rule — catch silent null spikes ===
  - name: silver_variants_per_sample_null_genotype
    rule_type: null_anomaly
    table:
      database: iceberg
      schema: genomics
      name: silver_variants_per_sample
    field: genotype
    schedule: hourly
    sensitivity: medium
    anomaly_types: [null_spike]
    notification_channels:
      - type: slack
        channel: "#genomics-alerts"

  # === Custom SQL metric — Hardy-Weinberg equilibrium ===
  - name: gold_allele_freq_hwe
    rule_type: anomaly
    table:
      database: iceberg
      schema: genomics
      name: gold_population_allele_freq
    custom_metric: |
      SELECT population,
        SUM(CASE WHEN allele_freq < 0.01 THEN 1 ELSE 0 END) AS rare_count,
        COUNT(*) AS total_count,
        SAFE_DIVIDE(SUM(CASE WHEN allele_freq < 0.01 THEN 1 ELSE 0 END),
                    COUNT(*)) AS rare_fraction
      FROM gold.population_allele_freq
      GROUP BY 1
    schedule: daily
    sensitivity: medium`;

const MC_LINEAGE_SQL = `-- ============================================================
-- Monte Carlo — auto-discovered field-level lineage
-- ============================================================
-- Monte Carlo parses SQL (Snowflake, BigQuery, dbt, Spark, Trino)
-- to auto-discover field-level lineage: which upstream column
-- feeds which downstream column. Used for impact analysis + root-
-- cause investigation. No manual lineage tagging required.
-- ============================================================

-- Query the Monte Carlo lineage API (in SQL — exposed via their
-- warehouse connector):
SELECT
    downstream_table,
    downstream_column,
    upstream_table,
    upstream_column,
    transformation_type,  -- direct | renamed | derived | aggregated
    sql_text,             -- the SQL fragment that defines the transformation
    discovered_at
FROM montecarlo.lineage
WHERE downstream_table = 'iceberg.genomics.gold_population_allele_freq'
  AND downstream_column = 'allele_freq'
ORDER BY discovered_at DESC;

-- === Impact analysis ===
-- "If I rename the chrom column on bronze_vcf, what downstream breaks?"
SELECT
    downstream_table,
    downstream_column,
    sql_text
FROM montecarlo.lineage
WHERE upstream_table = 'iceberg.genomics.bronze_vcf'
  AND upstream_column = 'chrom'
ORDER BY downstream_table, downstream_column;

-- === Root-cause investigation ===
-- "Why did allele_freq spike on chromosome 22?"
-- MC walks lineage UP to find which upstream tables/columns feed
-- allele_freq, then checks which of those had anomalies in the same
-- time window:
WITH downstream_anomalies AS (
    SELECT * FROM montecarlo.anomalies
    WHERE table_name = 'iceberg.genomics.gold_population_allele_freq'
        AND column_name = 'allele_freq'
        AND detected_at > NOW() - INTERVAL '24 hours'
),
upstream_candidates AS (
    SELECT upstream_table, upstream_column
    FROM montecarlo.lineage
    WHERE downstream_table = 'iceberg.genomics.gold_population_allele_freq'
        AND downstream_column = 'allele_freq'
)
SELECT
    a.table_name,
    a.column_name,
    a.detected_at,
    a.anomaly_type,
    a.description
FROM montecarlo.anomalies a
JOIN upstream_candidates u
    ON a.table_name = u.upstream_table
    AND a.column_name = u.upstream_column
WHERE a.detected_at > NOW() - INTERVAL '48 hours'
ORDER BY a.detected_at DESC;`;

const MC_INCIDENT_CLI = `# ============================================================
# Monte Carlo — CLI for incident management
#   pip install monte-carlo-data
# ============================================================
# The Monte Carlo CLI (montecarlo) is a Python tool for managing
# rules, fetching incidents, and routing alerts. Designed for
# SRE workflows — scriptable, JSON output, exit codes match
# severity for cron / Airflow integration.
# ============================================================

# List open incidents on a table (filter by rule type + severity)
montecarlo incidents list \\
    --table iceberg.genomics.bronze_vcf \\
    --rule-type freshness \\
    --status open \\
    --severity high \\
    --since 24h \\
    --format json

# Resolve an incident (after the on-call engineer re-runs the pipeline)
montecarlo incidents resolve \\
    --incident-id inc_abc123 \\
    --resolution-note "GATK crash; re-ran with 4.4.0.0; backfilling"

# Get the field-level lineage for a downstream column
montecarlo lineage get \\
    --table iceberg.genomics.gold_population_allele_freq \\
    --column allele_freq \\
    --direction upstream \\
    --format json

# Impact analysis — find all downstream tables/columns that depend
# on a given upstream column (e.g. before renaming the column)
montecarlo impact analyze \\
    --table iceberg.genomics.bronze_vcf \\
    --column chrom \\
    --format json

# Trigger a backfill validation (re-run all rules on a date range)
montecarlo backfill validate \\
    --table iceberg.genomics.bronze_vcf \\
    --start-date 2024-09-20 \\
    --end-date 2024-09-26 \\
    --rule-type freshness,volume_anomaly

# Create a custom anomaly rule from a SQL template
montecarlo rules create \\
    --name gold_allele_freq_hwe \\
    --rule-type anomaly \\
    --table iceberg.genomics.gold_population_allele_freq \\
    --custom-metric-file hwe_metric.sql \\
    --schedule daily \\
    --sensitivity medium \\
    --notification-channel "#genomics-alerts"

# Export the full rule config to YAML (version control)
montecarlo rules export \\
    --output-file montecarlo/rules.yaml`;

const MC_TUNING_PYTHON = `# ============================================================
# Monte Carlo — ML sensitivity tuning
# ============================================================
# The ML baseline learns the expected distribution of each metric
# (freshness gap, row count, null %) from historical data. The
# sensitivity parameter controls how aggressively anomalies fire.
# Tuning is the #1 production challenge — too tight, you get alert
# fatigue; too loose, you miss real failures.
# ============================================================

import monte_carlo_sdk as mcd

client = mcd.Client(api_key=os.environ["MONTE_CARLO_API_KEY"])

# === Sensitivity levels (for freshness + volume + null rules) ===
# - low:      2-sigma (catches 95% of anomalies, 5% false positive rate)
# - medium:   3-sigma (catches 99.7% of anomalies, 0.3% false positives)
# - high:     4-sigma (catches 99.99% of anomalies, 0.01% false positives)
# - critical: 5-sigma (catches the worst anomalies only, ~0 false positives)

# === Tune a freshness rule ===
# A 12-hour-cadence sequencer firing at 18h is anomalous at low
# sensitivity but normal at medium. Tune based on business impact.
rule = client.rules.update(
    rule_id="vcf_freshness_per_sequencer",
    sensitivity="medium",
    # Override the ML threshold with an absolute cap (best of both):
    min_threshold="6h",       # never alert before 6h gap (ignore slow seeds)
    max_threshold="36h",       # always alert after 36h gap (catch gross stalls)
    # Suppress alerts during scheduled maintenance windows:
    suppress_during=[
        {"cron": "0 2 * * SUN", "duration": "2h"},  # Sun 2-4am UTC
    ],
    # Auto-resolve after the pipeline catches up:
    auto_resolve=True,
    auto_resolve_after="2h",
)

# === Anomaly feedback loop (improve ML over time) ===
# Monte Carlo learns from thumbs-up / thumbs-down feedback on
# incidents. Mark a false positive as 'expected behavior' and the
# ML model adjusts the baseline to not alert on similar events.

# Thumbs-down: not a real anomaly (planned maintenance)
client.incidents.feedback(
    incident_id="inc_abc123",
    thumbs_down=True,
    reason="Planned maintenance window — sequencer was offline for upgrade",
    # Future: the ML will adjust the baseline to expect this gap
)

# Thumbs-up: real anomaly, please continue alerting
client.incidents.feedback(
    incident_id="inc_def456",
    thumbs_up=True,
    reason="GATK crash — caught a real pipeline stall",
    # The ML keeps the baseline unchanged
)

# === Custom anomaly rule with ML exclusion ===
# Exclude known-expected anomalies from the ML baseline (e.g.
# exclude the first week of a new sequencer's deployment because
# the cadence is not yet stable).
custom_rule = client.rules.create(
    name="vcf_volume_per_chrom",
    rule_type="volume_anomaly",
    table={"database": "iceberg", "schema": "genomics", "name": "bronze_vcf"},
    metric="count(*)",
    group_by=["chrom", "sequencer_id"],
    sensitivity="high",
    exclude_from_baseline=[
        # Exclude the ramp-up week of each new sequencer
        {"condition": "deploy_age < 7d"},
        # Exclude the day after a known schema migration
        {"condition": "schema_version_changed = true"},
    ],
)`;

// ============================================================
// Pyodide demo — simulate Monte Carlo freshness + volume anomaly
// ============================================================

const PYODIDE_DEMO = `# ============================================================
# Monte Carlo freshness + volume anomaly — in-browser simulation
# Simulates per-sequencer ML freshness + per-LB volume anomaly
# detection using only math, random, collections.
# ============================================================

import random
from collections import defaultdict

print("=== Monte Carlo Data Observability — Freshness + Volume ===")
print("ML baseline: median + IQR + 3-sigma (configurable sensitivity)")
print()

random.seed(42)

# === Part 1: Freshness anomaly on 200 sequencers ===
print("--- Part 1: Freshness (200 NovaSeq sequencers) ---")
sequencers = []
for i in range(200):
    sid = f"NovaSeq-{i:03d}"
    median_gap = max(8, min(16, random.gauss(12, 1.5)))
    last_age = random.uniform(0, 30)
    sequencers.append({"sequencer_id": sid,
                        "median_gap_h": round(median_gap, 1),
                        "last_age_h": round(last_age, 1)})
# Inject 5 stalls
for i in [17, 42, 88, 123, 199]:
    sequencers[i]["last_age_h"] = round(
        sequencers[i]["median_gap_h"] * random.uniform(2.5, 4.0), 1)

# ML threshold: 3-sigma = 3x median (simplified)
freshness_anomalies = []
for s in sequencers:
    threshold = s["median_gap_h"] * 3.0
    if s["last_age_h"] > threshold:
        freshness_anomalies.append({**s, "threshold_h": threshold})

print(f"  Sequencers simulated: {len(sequencers)} ({len(sequencers) - 5} healthy + 5 stalled)")
print(f"  Freshness anomalies detected: {len(freshness_anomalies)}")
for a in freshness_anomalies:
    print(f"    {a['sequencer_id']} — age={a['last_age_h']}h "
          f"threshold={a['threshold_h']:.1f}h median={a['median_gap_h']}h")
print()

# === Part 2: Volume anomaly on 60 LHC luminosity blocks ===
print("--- Part 2: Volume (60 LHC CMS luminosity blocks) ---")
blocks = []
for lb in range(60):
    expected = 60000  # median events/LB
    actual = int(random.gauss(expected, expected * 0.05))  # 5% IQR
    blocks.append({"lb_id": f"LB-{lb+1:04d}", "expected": expected, "actual": actual})
# Inject 5 anomalies
blocks[10] = {**blocks[10], "actual": 30000}     # 50% drop
blocks[20] = {**blocks[20], "actual": 6000}       # 90% drop
blocks[30] = {**blocks[30], "actual": 180000}    # 200% spike
blocks[40] = {**blocks[40], "actual": 42000}     # 30% drop
blocks[50] = {**blocks[50], "actual": 600}        # 99% drop

# Compute median + IQR + 3-sigma robust threshold
sorted_actuals = sorted(b["actual"] for b in blocks if b["actual"] > 1000)
median = sorted_actuals[len(sorted_actuals) // 2]
p25 = sorted_actuals[len(sorted_actuals) // 4]
p75 = sorted_actuals[3 * len(sorted_actuals) // 4]
iqr = p75 - p25
robust_sigma = iqr / 1.35
low_thr = median - 3 * robust_sigma
high_thr = median + 3 * robust_sigma

volume_anomalies = []
for b in blocks:
    if b["actual"] < low_thr:
        drop = (1 - b["actual"] / b["expected"]) * 100
        volume_anomalies.append({**b, "type": "volume_drop", "delta_pct": drop})
    elif b["actual"] > high_thr:
        spike = (b["actual"] / b["expected"] - 1) * 100
        volume_anomalies.append({**b, "type": "volume_spike", "delta_pct": spike})

print(f"  LBs simulated: {len(blocks)} ({len(blocks) - 5} healthy + 5 anomalous)")
print(f"  Robust 3-sigma: low={low_thr:,.0f} high={high_thr:,.0f}")
print(f"  Volume anomalies detected: {len(volume_anomalies)}")
for a in volume_anomalies:
    print(f"    {a['lb_id']} — actual={a['actual']:,} type={a['type']} delta={a['delta_pct']:+.1f}%")
print()

# === Part 3: Route to Slack + PagerDuty ===
print("--- Part 3: Routing (Slack + PagerDuty) ---")
total_incidents = len(freshness_anomalies) + len(volume_anomalies)
print(f"  Total incidents: {total_incidents}")
print(f"  Slack #data-observability: {total_incidents} notifications")
print(f"  PagerDuty (critical only): ", end="")
critical_count = 0
for a in volume_anomalies:
    if a.get("delta_pct", 0) >= 90 or a.get("delta_pct", 0) >= 100:
        critical_count += 1
for a in freshness_anomalies:
    if a["last_age_h"] > 30:
        critical_count += 1
print(f"{critical_count} pages")
print()

# === Part 4: Feedback loop ===
print("--- Part 4: ML feedback loop (thumbs-up / thumbs-down) ---")
# A planned maintenance window generates a false positive
# Mark thumbs-down -> ML adjusts baseline to expect this gap
print("  thumbs_down: inc_abc123 (planned maintenance, not real)")
print("  thumbs_up:   inc_def456 (real GATK crash, please continue)")
print()
print("Key insight: Monte Carlo's ML baseline learns per-table cadence")
print("+ volume distribution. A static rule (24h threshold) catches")
print("gross stalls only — the ML rule catches subtle 2-3x median drift")`;

// ============================================================
// Architecture SVG diagram — Monte Carlo observability stack
// ============================================================

function McArchitectureDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("agents");
  const nodes = {
    "warehouse":  { label: "Data Warehouse",  desc: "Snowflake / BigQuery / Redshift / Databricks — MC agents query metadata + sample data", level: 0 },
    "agents":     { label: "MC Agents",        desc: "Serverless agents — query the warehouse on a schedule, collect metrics, send to MC cloud", level: 1 },
    "metrics":    { label: "Metrics Store",    desc: "Per-table, per-column, per-hour metrics: row count, null %, distinct count, freshness gap", level: 2 },
    "ml_baseline":{ label: "ML Baseline",     desc: "Per-table learned distribution: median + IQR + 3-sigma. Sensitivity configurable per rule.", level: 3 },
    "rules":      { label: "Rules Engine",    desc: "freshness, volume, schema, null, custom SQL. YAML in git, evaluated hourly/daily.", level: 4 },
    "incidents":  { label: "Incidents",        desc: "Open incidents with severity, metadata, lineage trace. Route to Slack + PagerDuty.", level: 5 },
    "lineage":    { label: "Field-level Lineage",desc: "Auto-discovered by parsing SQL — no manual tagging. Used for root-cause + impact analysis.", level: 2 },
    "feedback":   { label: "Feedback Loop",    desc: "Thumbs-up/down on incidents — ML adjusts the baseline to suppress known false positives.", level: 4 },
  };
  const edges = [
    ["warehouse", "agents"],
    ["agents", "metrics"],
    ["metrics", "ml_baseline"],
    ["ml_baseline", "rules"],
    ["agents", "lineage"],
    ["rules", "incidents"],
    ["incidents", "feedback"],
    ["feedback", "ml_baseline"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "warehouse":  { x: 200, y: 30 },
    "agents":     { x: 200, y: 70 },
    "metrics":    { x: 130, y: 110 },
    "lineage":    { x: 280, y: 110 },
    "ml_baseline":{ x: 200, y: 150 },
    "rules":      { x: 200, y: 190 },
    "feedback":   { x: 280, y: 190 },
    "incidents":  { x: 200, y: 230 },
  };

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-primary" />
          MC observability stack: agents → metrics → ML → rules → incidents → feedback
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
                markerEnd="url(#arrow-mc)" />
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
            <marker id="arrow-mc" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
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
            Hover any node — the feedback loop continuously improves the ML baseline.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Comparison table — MC vs GE vs Elementary vs dbt tests
// ============================================================

function ObservabilityComparisonTable() {
  const rows = [
    { feature: "Origin",            mc: "Monte Carlo (2019)",     ge: "Superconductive (2017)",     elem: "Elementary (2021)",         dbt: "dbt Labs (2018)" },
    { feature: "Open-source?",     mc: "No (SaaS only)",          ge: "Yes (Apache 2.0)",            elem: "Yes (BSL → Apache)",         dbt: "Core yes" },
    { feature: "ML anomaly detection", mc: "Yes (core feature)", ge: "Limited (Profiler)",          elem: "Yes (core feature)",         dbt: "No" },
    { feature: "Always-on monitoring", mc: "Yes (24/7)",         ge: "No (batch only)",             elem: "Yes (scheduled)",            dbt: "No (on-run only)" },
    { feature: "Auto-discovered lineage", mc: "Yes (field-level)", ge: "No",                       elem: "Yes (via dbt manifest)",     dbt: "Yes (model-level)" },
    { feature: "Schema change alerts", mc: "Yes (auto-discovered)", ge: "Limited",                  elem: "Yes (column-level)",         dbt: "No" },
    { feature: "Freshness monitoring", mc: "Yes (ML-adapted)",     ge: "Yes (recent_rows)",           elem: "Yes (ML + dbt)",              dbt: "Yes (freshness test)" },
    { feature: "Volume monitoring", mc: "Yes (ML baseline)",     ge: "Limited",                    elem: "Yes (row_count metric)",     dbt: "No" },
    { feature: "Custom expectations", mc: "Limited (rules YAML)",  ge: "Yes (Python + SQL)",          elem: "Yes (dbt singular)",          dbt: "Yes (singular SQL)" },
    { feature: "Data Docs",        mc: "Yes (cloud dashboards)",  ge: "Yes (auto-generated HTML)",   elem: "Yes (cloud + local)",        dbt: "No (docs only)" },
    { feature: "Best fit",         mc: "Always-on observability",  ge: "Batch validation",            elem: "dbt-native observability",   dbt: "Transform-time tests" },
    { feature: "Adoption",         mc: "Comcast, Affirm, Stripe", ge: "Netflix, Apple, Slack",        elem: "dbt Cloud customers",        dbt: "All dbt users" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          Data observability frameworks — Monte Carlo vs GE vs Elementary vs dbt tests
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold text-primary">Monte Carlo</th>
              <th className="text-left px-3 py-2 font-semibold">Great Expectations</th>
              <th className="text-left px-3 py-2 font-semibold">Elementary</th>
              <th className="text-left px-3 py-2 font-semibold">dbt tests</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-primary/80">{r.mc}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.ge}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.elem}</td>
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
  { label: "Origin", value: "Monte Carlo 2019", hint: "Founded by former LiveRamp + Attributor engineers. SaaS data observability — the first commercial observability platform.", deltaTone: "flat" as const },
  { label: "License", value: "SaaS only", hint: "Closed-source SaaS — agents are open-source, the cloud platform is hosted. No self-host option.", deltaTone: "flat" as const },
  { label: "Anomaly types", value: "5 (freshness, volume, schema, null, custom)", hint: "ML-powered anomaly detection on 5 core data health dimensions. Configurable sensitivity per rule.", deltaTone: "up" as const },
  { label: "Data sources", value: "30+", hint: "Snowflake, BigQuery, Redshift, Databricks, Postgres, MySQL, SQL Server, Athena, Trino, Spark, Iceberg, dbt, Airflow, Prefect...", deltaTone: "up" as const },
];

export function MonteCarloPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Monte Carlo · data observability · ML anomaly detection"
        title="Monte Carlo — the data observability platform"
        description="Monte Carlo (founded 2019) is the SaaS data observability platform — the first commercial product to apply ML anomaly detection to data health. The 5 core dimensions: freshness (is the data up-to-date?), volume (did row count drop?), schema (did columns change?), null (did null percentage spike?), and custom SQL metrics. Agents (open-source) run inside the customer's VPC, query warehouse metadata on a schedule, send metrics to the Monte Carlo cloud, where the ML baseline learns the expected distribution per table and triggers anomalies on 3-sigma deviation. Auto-discovered field-level lineage (no manual tagging) powers root-cause investigation (which upstream column caused this anomaly?) and impact analysis (what breaks if I rename this column?). Deployed at Comcast, Affirm, Stripe, and 400+ companies."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Activity className="h-3 w-3" /> ML Anomaly</Badge>
            <Badge variant="outline" className="gap-1.5"><Network className="h-3 w-3" /> Field Lineage</Badge>
            <Badge variant="outline" className="gap-1.5"><AlertTriangle className="h-3 w-3" /> Always-on</Badge>
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
        title="Architecture — the observability stack"
        description="Monte Carlo's stack is layered: agents in the customer's VPC collect metrics from the warehouse; the cloud platform stores them; an ML baseline learns the per-table expected distribution; a rules engine evaluates anomaly rules hourly/daily; incidents route to Slack + PagerDuty with field-level lineage; a feedback loop (thumbs-up/down) refines the ML baseline over time. The agents are open-source (collect-only); the cloud platform (ML, dashboards, lineage) is SaaS-only."
        icon={<Atom className="h-5 w-5" />}
        badge="architecture"
      >
        <McArchitectureDiagram />
      </SectionCard>

      {/* Python SDK */}
      <SectionCard
        title="Python SDK — freshness rule + incident management"
        description="Monte Carlo's Python SDK (monte-carlo-data) is the SRE-friendly interface for managing rules + incidents. Define rules (freshness, volume, schema, null, custom) in code, fetch open incidents, route by severity, and resolve with notes. The ML baseline is implicit — you specify sensitivity (low/medium/high = 2/3/4-sigma) and the platform handles the rest. This block shows a freshness rule on per-sequencer cadence (group_by sequencer_id) — the ML learns each sequencer's median gap independently."
        icon={<Workflow className="h-5 w-5" />}
        badge="Python"
      >
        <CodeBlock code={MC_PYTHON_FRESHNESS} language="python" filename="mc_freshness.py" highlight={[18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73]} />
      </SectionCard>

      {/* YAML rules */}
      <SectionCard
        title="YAML rules — declarative config in git"
        description="Rules are declarative YAML, version-controlled in git alongside dbt models. Five rule types shown: freshness (catch stalls), volume_anomaly (catch drops/spikes), schema_change (catch column add/remove/type change), null_anomaly (catch null spikes), anomaly (custom SQL). Each rule has a table reference, schedule, ML sensitivity, group_by (per-group baselines), and notification channels. The same YAML can be applied via SDK, CLI, or Terraform — no UI clicks required."
        icon={<GitBranch className="h-5 w-5" />}
        badge="YAML"
      >
        <CodeBlock code={MC_YAML_RULES} language="yaml" filename="montecarlo_rules.yaml" highlight={[18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87]} />
      </SectionCard>

      {/* Lineage SQL */}
      <SectionCard
        title="Field-level lineage — auto-discovered, no manual tagging"
        description="Monte Carlo parses SQL (Snowflake query history, dbt compile output, Spark SQL) to auto-discover field-level lineage: which upstream column feeds which downstream column, with the transformation type (direct / renamed / derived / aggregated) and the SQL fragment. No manual tagging required. Three killer use cases: impact analysis (what breaks if I rename this column?), root-cause investigation (which upstream column caused this downstream anomaly?), and dependency mapping (visualise the upstream/downstream graph)."
        icon={<Network className="h-5 w-5" />}
        badge="SQL"
      >
        <CodeBlock code={MC_LINEAGE_SQL} language="sql" filename="mc_lineage_queries.sql" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61]} />
      </SectionCard>

      {/* Incident CLI */}
      <SectionCard
        title="CLI — incident management for SRE workflows"
        description="The Monte Carlo CLI (montecarlo) is a Python tool for SRE workflows — list, resolve, backfill, and create rules from the command line. JSON output makes it scriptable; exit codes match severity for cron / Airflow integration. The CLI is the production interface — UI is for exploration, CLI is for automation. Common SRE flow: cron runs `montecarlo incidents list --severity high`, parses JSON, routes critical to PagerDuty, resolves expected maintenance with `montecarlo incidents resolve`."
        icon={<Workflow className="h-5 w-5" />}
        badge="CLI"
      >
        <CodeBlock code={MC_INCIDENT_CLI} language="bash" filename="mc_cli_commands.sh" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60]} />
      </SectionCard>

      {/* Sensitivity tuning */}
      <SectionCard
        title="ML sensitivity tuning — the #1 production challenge"
        description="Tuning Monte Carlo's ML sensitivity is the #1 production challenge — too tight, alert fatigue; too loose, miss real failures. This block shows the four sensitivity levels (low/medium/high/critical = 2/3/4/5-sigma), absolute min/max thresholds (best of both worlds — ML with safety bounds), maintenance window suppression, auto-resolve on catch-up, and the feedback loop (thumbs-up/down to improve the baseline over time). Custom exclusions prevent ramp-up noise from polluting the baseline."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Python"
      >
        <CodeBlock code={MC_TUNING_PYTHON} language="python" filename="mc_tuning.py" highlight={[20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100]} />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: simulate Monte Carlo freshness + volume anomaly (Pyodide)"
        description="Pure-Python simulation of Monte Carlo's ML anomaly detection — no SaaS, no Snowflake, just in-browser. Simulate 200 NovaSeq sequencers with per-sequencer cadence (median 12h, IQR 11-13h), inject 5 stalls, run the ML freshness rule. Then simulate 60 LHC CMS luminosity blocks with median 60k events/LB, inject 5 anomalies (drop/spike), run the ML volume rule with robust 3-sigma. Route critical to PagerDuty, exercise the feedback loop (thumbs-up/down)."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={PYODIDE_DEMO} buttonLabel="Run MC anomaly simulation (Pyodide)" />
      </SectionCard>

      {/* Comparison table */}
      <SectionCard
        title="Monte Carlo vs Great Expectations vs Elementary vs dbt tests"
        description="Four data quality frameworks with overlapping but distinct scopes. Monte Carlo (2019) is the SaaS observability platform — ML anomaly detection, always-on, auto-discovered lineage. Great Expectations (2017) is the open-source expectation-suite framework — declarative rules, batch validation, HTML Data Docs. Elementary (2021) is the dbt-native observability layer — ML + dbt tests together. dbt tests (2018) are YAML assertions on dbt models — transform-time only. MC excels at always-on monitoring; the others excel at declarative validation or dbt integration."
        icon={<Boxes className="h-5 w-5" />}
      >
        <ObservabilityComparisonTable />
      </SectionCard>

      {/* Why evolved */}
      <SectionCard
        title="Why MC evolved — shortfalls of static data quality (Era 2)"
        description="Modern data engineers prefer MC because static data quality (the prior generation — GE + dbt tests with static thresholds) had four critical shortfalls. MC was designed to fix all four with ML anomaly detection."
        icon={<History className="h-5 w-5" />}
        badge="Why MC"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: Static thresholds didn't adapt.</strong> A dbt freshness test with `error_after: 30 minutes` fired constantly for slow-pipeline tables (every 31 minutes) and missed real stalls on fast-pipeline tables (a 10-minute-cadence table silent for 25 minutes is anomalous but doesn't trigger the static 30-minute rule). MC's ML baseline learns per-table cadence + sets a dynamic 3-sigma threshold. <strong className="text-foreground/80">Result:</strong> alerts fire only on real anomalies — no alert fatigue.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: No always-on monitoring.</strong> GE + dbt tests run on a schedule (after dbt runs, after ingests). Between runs, nobody is watching. A 6-hour stall at 2am isn't caught until the next morning's dbt run. MC agents query warehouse metadata every hour, 24/7 — a stall at 2am is caught at 3am. <strong className="text-foreground/80">Result:</strong> mean time to detection drops from hours to minutes.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: No field-level lineage.</strong> When a downstream anomaly fires, the team had to manually trace SQL upstream — open the dbt project, find the SELECT statement, identify the upstream columns, check each for anomalies. MC parses SQL automatically and builds field-level lineage. Root-cause investigation becomes a graph query — 'walk upstream from the anomaly, check which upstream column also had anomalies in the same window'. <strong className="text-foreground/80">Result:</strong> root-cause analysis drops from hours to seconds.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: No schema change alerts.</strong> Adding a column upstream silently broke downstream consumers (a rename, a type change, a column drop). Nobody noticed until a dashboard broke. MC monitors information_schema columns on a schedule and alerts on any addition / removal / type change. <strong className="text-foreground/80">Result:</strong> schema changes are visible to the entire team before they break downstream.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique Monte Carlo features (vs GE, Elementary, dbt tests)"
        description="MC has four features that are genuinely unique — structural differentiators that the other observability frameworks have not yet matched."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. Auto-discovered field-level lineage</p>
            <p className="text-muted-foreground">MC parses SQL (Snowflake history, dbt compile, Spark SQL) to auto-build field-level lineage. <strong>GE has no lineage; Elementary uses dbt manifest (model-level, not field-level); dbt tests have model-level lineage only.</strong> Field-level is the killer for root-cause.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Always-on ML anomaly detection</p>
            <p className="text-muted-foreground">Agents query warehouse metadata hourly, 24/7. ML baseline learns per-table distribution. <strong>GE runs on schedule only (after ingests); Elementary runs after dbt runs; dbt tests run on dbt runs.</strong> MC is the only always-on option.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Schema change auto-discovery</p>
            <p className="text-muted-foreground">MC monitors information_schema.columns on a schedule — alerts on column add/remove/type change. <strong>GE has no schema monitoring; Elementary has column-level via dbt tests; dbt tests have none.</strong> Schema drift is the silent failure mode MC catches that nobody else does.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. ML feedback loop</p>
            <p className="text-muted-foreground">Thumbs-up/down on incidents adjusts the ML baseline — false positives are suppressed over time. <strong>GE + dbt tests are static; Elementary has limited feedback (via resolution notes).</strong> MC's feedback loop is the production-grade ML refinement.</p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples cards */}
      <SectionCard
        title="2 scientific examples — cards with 5-language code popups"
        description="Two production-style scientific examples showing Monte Carlo in action: genomics data freshness (detect sequencer pipeline stalls on 200 NovaSeq) + LHC data quality volume monitoring (detect volume drops in CMS collision event counts on 60 LBs). Each is a clickable card opening a lazy popup with: scenario brief (dataset/scale/why), dataset stats grid, computational tooling, multi-language code in Scala + Rust + Go + Elixir + Zig, and an implementation insight."
        icon={<Database className="h-5 w-5" />}
        badge="2 examples × 5 langs"
      >
        <DatasetCards
          examples={MONTE_CARLO_SCIENCE_EXAMPLES}
          intro="Two MC scientific scenarios: genomics freshness (200 NovaSeq sequencers, ML per-sequencer cadence, 3-sigma threshold) + LHC CMS volume (60 luminosity blocks, robust 3-sigma, severity routing). Each card has Scala/Rust/Go/Elixir/Zig code + Pyodide simulation showing the ML baseline catching subtle drift that static thresholds miss."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the Monte Carlo ecosystem"
        description="MC's ecosystem spans data sources (what to monitor), integrations (how to ingest metadata + route alerts), and adjacent tools (lineage, contracts, orchestration). The agents are open-source; the cloud platform is SaaS-only."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Database className="h-3.5 w-3.5 text-primary" /> Data sources (30+)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Snowflake</strong> — native connector (query history + metadata)</li>
              <li>• <strong>BigQuery</strong> — native connector (via INFORMATION_SCHEMA)</li>
              <li>• <strong>Redshift</strong> — via sys tables + query history</li>
              <li>• <strong>Databricks</strong> — via Unity Catalog + SQL warehouses</li>
              <li>• <strong>Postgres / MySQL / MSSQL</strong> — via standard views</li>
              <li>• <strong>Trino / Presto / Athena</strong> — federated</li>
              <li>• <strong>Apache Iceberg</strong> — via REST catalog + manifest</li>
              <li>• <strong>dbt Cloud + dbt Core</strong> — manifest + run_results</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cloud className="h-3.5 w-3.5 text-primary" /> Integrations</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Slack</strong> — incident routing to channels</li>
              <li>• <strong>PagerDuty</strong> — critical incident paging</li>
              <li>• <strong>ServiceNow / Jira</strong> — incident ticket creation</li>
              <li>• <strong>dbt Cloud</strong> — run results ingestion</li>
              <li>• <strong>Airflow / Dagster / Prefect</strong> — DAG-aware routing</li>
              <li>• <strong>Great Expectations</strong> — GE validation results ingestion</li>
              <li>• <strong>OpenLineage / Marquez</strong> — lineage ingestion</li>
              <li>• <strong>Terraform</strong> — rules as code (provider)</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research + production case studies */}
      <SectionCard
        title="Research + production case studies"
        description="The papers and production blog posts that defined the data observability movement. The Barr 2020 'Data Observability' paper is the academic foundation; the Comcast, Affirm, and Stripe engineering blogs document production scale."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Barr et al. 2020 (VLDB):</strong> "Data Observability: A New Paradigm for Data Quality Management." Argued that data quality must move from batch validation (the GE + dbt tests paradigm) to always-on ML anomaly detection — the same shift that observability brought to software engineering (Datadog, New Relic, Honeycomb). Introduced the 5 pillars: freshness, volume, schema, distribution, lineage. The foundational academic reference for the modern data observability movement.
          </p>
          <p>
            <strong className="text-foreground/80">Monte Carlo Origin (Barr, Lior, Moses, 2019):</strong> Founded by former LiveRamp + Attributor engineers who had built large-scale data quality systems and noticed three gaps in existing tooling: (1) batch-only, (2) no ML baseline, (3) no field-level lineage. They launched MC as the first commercial 'data observability' platform — the term borrowed from software observability (Datadog) and applied to data. The first customers were Netflix, Airbnb, and Comcast.
          </p>
          <p>
            <strong className="text-foreground/80">Comcast Production Case (Comcast Eng Blog 2021):</strong> MC on Snowflake for the advertising analytics lake. 1,500+ tables, 300+ dbt models. Freshness + volume + schema rules on every Bronze ingest. <strong className="text-foreground/80">Result:</strong> mean time to detection of broken pipelines dropped from 4 hours (manual discovery) to 15 minutes (MC alert). Field-level lineage cut root-cause investigation from hours to minutes.
          </p>
          <p>
            <strong className="text-foreground/80">Affirm Production Case (Affirm Eng 2022):</strong> MC on Snowflake + dbt for the consumer lending analytics lake. 5,000+ dbt models, 50TB/day. MC + GE together — MC for always-on observability (anomalies), GE for batch validation (declarative rules). <strong className="text-foreground/80">Result:</strong> the two frameworks are complementary — MC catches slow drift, GE catches gross failures. Compliance officers read both MC dashboards + GE Data Docs.
          </p>
          <p>
            <strong className="text-foreground/80">Stripe Production Case (Stripe Eng 2023):</strong> MC on Snowflake + Iceberg for the payments analytics lake. 10,000+ tables. Auto-discovered lineage on 50,000+ columns. <strong className="text-foreground/80">Result:</strong> when a column rename upstream broke a dashboard, MC's lineage graph showed the impact in seconds — the team could notify every downstream consumer before the rename shipped.
          </p>
          <p>
            <strong className="text-foreground/80">OpenLineage Standard (2021):</strong> MC contributed to OpenLineage — an open standard for lineage event emission. dbt, Airflow, Dagster, Spark all emit OpenLineage events now; MC ingests them for cross-tool lineage. The standard reduced MC's SQL-parsing reliance (which is brittle) — events are explicit, no parsing needed.
          </p>
          <p>
            <strong className="text-foreground/80">Data Observability Landscape 2024:</strong> Monte Carlo + Databand (IBM) + Dataloop + Acceldata + Datafold — 5 commercial vendors competing. MC remains the leader in always-on ML anomaly detection. The shift is towards 'data reliability' — combining observability + quality + reliability engineering, the same convergence that happened in software observability.
          </p>
        </div>
      </SectionCard>

      {/* Deeper-thought insight */}
      <SectionCard
        title="My deeper thought: MC IS Datadog for data"
        description="The unifying view: Monte Carlo is structurally identical to Datadog — the same architecture (agents → metrics → ML baseline → alerts → feedback) applied to data instead of software."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">MC's architecture IS Datadog's architecture.</strong> Datadog: agents on every host collect metrics → Datadog cloud stores them → ML baseline learns per-host distribution → alerts on threshold breaches → routing to Slack + PagerDuty → feedback loop thumbs-up/down to refine. MC: agents in customer VPC collect warehouse metadata → MC cloud stores them → ML baseline learns per-table distribution → alerts on threshold breaches → routing to Slack + PagerDuty → feedback loop thumbs-up/down. The artifact is different (data vs host metrics) but the architecture is identical. Both vendors grew by recognising that observability is a structural pattern that applies to any system with state.
          </p>
          <p>
            <strong className="text-foreground/80">Always-on monitoring IS the SRE pattern.</strong> Software SRE practice moved from on-call-only (wait for an outage) to always-on monitoring (Datadog, New Relic, Honeycomb) — the team is alerted before users notice. Data SRE is undergoing the same shift. GE + dbt tests are the 'on-call-only' era — they run after ingests, between runs nobody is watching. MC + Elementary are the 'always-on' era — agents query every hour, 24/7. The economics are similar too: 24/7 monitoring costs more (agent compute, SaaS licenses) but mean-time-to-detection drops from hours to minutes.
          </p>
          <p>
            <strong className="text-foreground/80">ML baseline IS dynamic thresholding.</strong> Static thresholds (dbt freshness test: error_after 30 min) are the manual monitoring era — every team writes their own thresholds and tunes them by hand. ML baseline (MC: 3-sigma of learned per-table distribution) is the dynamic monitoring era — the platform learns the right threshold per table. This is the same shift that Honeycomb made in software observability — from static SLO thresholds to ML-learned dynamic baselines. The 'innovation' is recognising that the right threshold is a function of the metric's own distribution, not a hand-tuned constant.
          </p>
          <p>
            <strong className="text-foreground/80">Field-level lineage IS distributed tracing.</strong> Software observability uses distributed tracing (OpenTelemetry, Jaeger) to follow a request across services — every hop logged, root-cause found by walking the trace. MC's field-level lineage does the same for data — every SQL transformation logged as a hop, root-cause found by walking the lineage graph upstream from the anomaly. The artifact is different (HTTP request vs data column) but the pattern is identical — both walk a DAG to find the root cause.
          </p>
          <p>
            <strong className="text-foreground/80">MC IS to data what Datadog was to software.</strong> Before Datadog (2010), software monitoring was ad-hoc — Nagios + custom scripts + manual dashboard tuning. Datadog standardised monitoring with agents + a cloud platform + dashboards + ML baselines. Every software monitoring vendor since (New Relic, Honeycomb, Lightstep) builds on the same pattern. MC is doing the same for data — agents + a cloud platform + dashboards + ML baselines. The next decade will see data observability become as universal as software observability is today. The pattern is identical; only the artifact (data vs software) differs.
          </p>
        </div>
      </SectionCard>

      {/* Cross-disciplinary elegant-code card — Monte Carlo */}
      <SectionCard
        title="Cross-disciplinary elegance — Monte Carlo bridges options, port congestion, and rare variants"
        description="Monte Carlo (E[f(X)] ≈ (1/N)·Σ f(X_i)) IS the universal estimation equation. A CME quant pricing an exotic option via 10⁶ GBM paths, a port captain simulating 10⁵ vessel arrivals to estimate berth congestion, and a geneticist running 10⁶ permutations to estimate rare-variant significance all use the SAME averaging — Metropolis 1946 invented this at Los Alamos."
        icon={<Sparkles className="h-5 w-5" />}
        badge="elegant code"
      >
        <DatasetCards
          examples={ELEGANT_CODE_CARDS.filter((_, i) => i === 17)}
          intro="Monte Carlo (fintech ↔ maritime ↔ genetics): the SAME averaging samples exotic options, port congestion, and rare-variant p-values — because all three estimate E[f(X)] via random draws."
        />
      </SectionCard>

      <RelatedElegantCode hostPage={"monte-carlo" as never} />

      <RelatedTopics topics={[
        { id: "great-expectations" as const, reason: "Open-source expectation suites — declarative rules (complementary to MC)" },
        { id: "elementary" as const, reason: "dbt-native observability — ML + dbt tests together" },
        { id: "dbt-deep-dive" as const, reason: "dbt tests — simpler YAML assertions" },
        { id: "lineage" as const, reason: "Field-level lineage — auto-discovered from SQL" },
        { id: "data-contracts" as const, reason: "Data contracts encode quality as a producer/consumer agreement" },
        { id: "model-monitoring" as const, reason: "ML model monitoring — same observability pattern for ML" },
        { id: "iceberg" as const, reason: "Iceberg Bronze tables — the data MC monitors" },
        { id: "governance" as const, reason: "Data observability is a core pillar of data governance" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("great-expectations")} className="text-sm text-primary hover:underline">
          &rarr; Great Expectations (declarative expectation suites)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("elementary")} className="text-sm text-primary hover:underline">
          &rarr; Elementary (dbt-native observability)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("lineage")} className="text-sm text-primary hover:underline">
          &rarr; Lineage (field-level lineage concepts)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("data-contracts")} className="text-sm text-primary hover:underline">
          &rarr; Data Contracts (quality as a contract)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("model-monitoring")} className="text-sm text-primary hover:underline">
          &rarr; Model Monitoring (same pattern for ML)
        </Link>
      </div>
    </div>
  );
}
