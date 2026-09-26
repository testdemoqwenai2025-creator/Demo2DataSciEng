"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { LINEAGE_EXAMPLES } from "../_components/_dataset_examples6";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Network, History, GitBranch, Activity, FileText, ExternalLink,
  Sparkles, Cpu, TrendingUp, Server, Cloud, Boxes, Atom, Layers,
  ShieldCheck, Search, Target, AlertTriangle, Workflow, Database,
} from "lucide-react";

// ============================================================
// Code snippets
// ============================================================

const OPENLINEAGE_AIRFLOW = `# ============================================================
# OpenLineage + Airflow — emit Start/Run/Complete events per task
# Captures: parent runId (Airflow DAG run), inputs, outputs, SQL
# ============================================================

from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator
from openlineage.airflow import OpenLineageListener
from datetime import datetime, timedelta

# Register the OpenLineage listener with Airflow — auto-emits events
# on every task instance transition (queued -> running -> success/failed)
# Listener config in airflow.cfg:
#   [scheduler]
#   default_listener = openlineage.airflow.OpenLineageListener
#   [openlineage]
#   transport = https://lineage.moderndatascieng.com
#   namespace = airflow-prod
#   parent_run_id_from_airflow = true

dag = DAG(
    dag_id="silver_dag",
    schedule="@hourly",
    start_date=datetime(2024, 9, 1),
    catchup=False,
    default_args={
        "retries": 2,
        "retry_delay": timedelta(minutes=5),
        "owner": "data-eng",
    },
)

# Task 1: bronze -> silver conformance (Spark job)
def silver_conformance(**ctx):
    from pyspark.sql import SparkSession
    spark = SparkSession.builder \\
        .appName("silver_conformance") \\
        .config("spark.extraListeners",
            "org.openlineage.spark.OpenLineageSparkListener") \\
        .config("spark.openlineage.transport.url",
            "https://lineage.moderndatascieng.com") \\
        .config("spark.openlineage.parentRunId",
            ctx["run_id"])  # ties this Spark job to the Airflow task run
        .getOrCreate()

    # OpenLineage auto-captures: inputs (bronze.customers_raw),
    # outputs (silver.customers), SQL plan (the SELECT statement)
    spark.sql("""
        CREATE TABLE silver.customers AS
        SELECT
            customer_id,
            sha256(email) AS email_hash,
            sha256(phone) AS phone_hash,
            region,
            first_seen_ts
        FROM bronze.customers_raw
        WHERE ingestion_ts >= current_date() - 1
    """)

silver_task = PythonOperator(
    task_id="silver_conformance",
    python=silver_conformance,
    dag=dag,
)

# Task 2: silver -> gold mart (downstream consumer)
def gold_mart(**ctx):
    from pyspark.sql import SparkSession
    spark = SparkSession.builder \\
        .appName("gold_mart") \\
        .config("spark.extraListeners",
            "org.openlineage.spark.OpenLineageSparkListener") \\
        .config("spark.openlineage.transport.url",
            "https://lineage.moderndatascieng.com") \\
        .config("spark.openlineage.parentRunId", ctx["run_id"])
        .getOrCreate()
    spark.sql("""
        CREATE TABLE gold.cust_region_summary AS
        SELECT region, count(*) AS n_customers,
               count(distinct email_hash) AS n_unique_emails
        FROM silver.customers
        GROUP BY region
    """)

gold_task = PythonOperator(
    task_id="gold_mart",
    python=gold_mart,
    dag=dag,
)

silver_task >> gold_task  # OpenLineage captures this dependency edge`;

const OPENLINEAGE_SPARK_LISTENER = `-- ============================================================
-- OpenLineage Spark listener — auto-captures SQL execution plan
-- Captures: inputs (read datasets), outputs (written datasets),
-- SQL plan (the Catalyst query), column-level lineage (v1.0+)
-- ============================================================

-- spark-submit config:
--   --conf spark.extraListeners=org.openlineage.spark.OpenLineageSparkListener
--   --conf spark.openlineage.transport.url=https://lineage.moderndatascieng.com
--   --conf spark.openlineage.namespace=spark-prod
--   --conf spark.openlineage.parentJobName=airflow.silver_dag.silver_conformance
--   --conf spark.openlineage.parentRunId=\${AIRFLOW_RUN_ID}

-- The listener emits 3 OpenLineage events per Spark job:
--   START   — job started, parent runId from Airflow ties to DAG run
--   RUNNING — each SQL query inside the Spark job emits its own event
--   COMPLETE — job done, final inputs + outputs + SQL plan facets

-- Column-level lineage (v1.0+, Spark 3.5+) — captures the
-- COLUMN-level mapping: e.g., gold.cust_region_summary.n_unique_emails
-- is derived from silver.customers.email_hash (which is itself
-- derived from bronze.customers_raw.email)

-- Bronze -> Silver hop (Spark SQL)
CREATE TABLE silver.customers AS
SELECT
    customer_id,
    sha256(email)   AS email_hash,    -- column-level: email -> email_hash
    sha256(phone)   AS phone_hash,
    region,
    first_seen_ts
FROM bronze.customers_raw
WHERE ingestion_ts >= current_date() - 1;

-- Silver -> Gold hop (next Spark job)
CREATE TABLE gold.cust_region_summary AS
SELECT
    region,
    count(*)                          AS n_customers,
    count(distinct email_hash)        AS n_unique_emails   -- email_hash -> n_unique_emails
FROM silver.customers
GROUP BY region;

-- The lineage graph is built automatically:
-- bronze.customers_raw.email
--   -> silver.customers.email_hash
--     -> gold.cust_region_summary.n_unique_emails
--       -> bi.dashboard.revenue.unique_emails_tile
-- (BFS reveals all downstream consumers of bronze.customers_raw.email)`;

const MARQUEZ_API = `# ============================================================
# Marquez — the reference OpenLineage implementation (REST API)
# Web UI on port 5000, REST API on port 5000/api/v1
# Backed by Postgres (lineage graph) + S3 (event history)
# ============================================================

# 1. List all namespaces (one per environment: prod, staging, dev)
curl https://marquez.moderndatascieng.com/api/v1/namespaces
# ["airflow-prod", "spark-prod", "dbt-prod", "snowflake-prod"]

# 2. List all jobs in a namespace (each Airflow DAG task = 1 job)
curl https://marquez.moderndatascieng.com/api/v1/namespaces/airflow-prod/jobs
# [{"name": "silver_dag.silver_conformance", ...},
#  {"name": "silver_dag.gold_mart", ...}]

# 3. List job runs (each Airflow DAG run = 1 job run)
curl "https://marquez.moderndatascieng.com/api/v1/namespaces/airflow-prod/jobs/silver_dag.silver_conformance/runs?limit=10"
# [{"runId": "abc123", "startedAt": ..., "endedAt": ...,
#   "state": "COMPLETED", "facets": {...}}]

# 4. Get lineage graph for a dataset (upstream + downstream, depth N)
curl "https://marquez.moderndatascieng.com/api/v1/lineage?datasetName=silver.customers&datasetNamespace=iceberg&depth=10"
# {
#   "graph": {
#     "nodes": [
#       {"name": "bronze.customers_raw", "type": "DATASET"},
#       {"name": "silver.customers",     "type": "DATASET"},
#       {"name": "gold.cust_region_summary", "type": "DATASET"}
#     ],
#     "edges": [
#       {"source": "bronze.customers_raw", "target": "silver.customers"},
#       {"source": "silver.customers",      "target": "gold.cust_region_summary"}
#     ]
#   }
# }

# 5. Get column-level lineage (OpenLineage v1.0+)
curl "https://marquez.moderndatascieng.com/api/v1/lineage/columns?datasetName=silver.customers&columnName=email_hash&depth=10"
# {
#   "upstream": [
#     {"dataset": "bronze.customers_raw", "column": "email", "depth": 1}
#   ],
#   "downstream": [
#     {"dataset": "gold.cust_region_summary", "column": "n_unique_emails", "depth": 1},
#     {"dataset": "bi.dashboard.revenue", "column": "unique_emails_tile", "depth": 3}
#   ]
# }

# 6. Query runs that touched a dataset in a time window (RCA use case)
curl "https://marquez.moderndatascieng.com/api/v1/namespaces/iceberg/datasets/silver.customers/runs?startedAfter=2024-09-01T00:00:00Z&startedBefore=2024-09-02T00:00:00Z"
# [{"runId": "abc123", "jobName": "silver_dag.silver_conformance", "state": "COMPLETED", ...}]`;

const APACHE_ATLAS_HADOOP = `-- ============================================================
-- Apache Atlas — Hadoop-native lineage (HBase-backed)
-- Hive hook auto-captures CREATE TABLE AS SELECT lineage edges
-- ============================================================

-- Atlas ships with Hive hooks (org.apache.atlas.hive.hook.HiveHook)
-- Add to hive-site.xml:
--   <property>
--     <name>hive.exec.post.hooks</name>
--     <value>org.apache.atlas.hook.hive.HiveHook</value>
--   </property>
--   <property>
--     <name>atlas.hook.hive.synchronous</name>
--     <value>true</value>
--   </property>

-- Each Hive query emits an Atlas entity + lineage edge automatically
-- CREATE TABLE AS SELECT -> lineage edge from src table to dst table

-- Bronze -> Silver hop (Hive CTAS — Atlas auto-captures lineage)
CREATE TABLE silver.customers AS
SELECT
    customer_id,
    sha256(email) AS email_hash,
    sha256(phone) AS phone_hash,
    region,
    first_seen_ts
FROM bronze.customers_raw
WHERE ingestion_ts >= current_date() - 1;

-- Atlas REST API — fetch the lineage graph for a table
-- curl -X GET "http://atlas:21000/api/atlas/v2/lineage/silver.customers?depth=10" \\
--   -H "Authorization: Basic \${ATLAS_AUTH}"
-- Response:
-- {
--   "guid": "abc-123",
--   "relations": [
--     {"fromEntityId": "bronze-id", "toEntityId": "silver-id", "relationshipType": "INPUT_TO"},
--     {"fromEntityId": "silver-id", "toEntityId": "gold-id", "relationshipType": "INPUT_TO"}
--   ]
-- }

-- Atlas taxonomy — classify PII columns with tags (governance)
-- e.g., tag silver.customers.email_hash as PII_HASH (synthetic PII)
-- curl -X POST http://atlas:21000/api/atlas/v2/entity/bulk/classification \\
--   -d '{"classification": {"typeName": "PII_HASH"}, "entityGuids": [...]}'

-- Atlas's killer feature: Hadoop-native lineage + classification tags in one tool
-- Shortfall: doesn't cover Spark/Trino/Flink (Hive-only, narrow scope)
-- Why OpenLineage won: cross-tool standard (Airflow + Spark + dbt + Snowflake)`;

const UNITY_CATALOG_LINEAGE = `-- ============================================================
-- Databricks Unity Catalog — Delta-native lineage (built-in)
-- Captures: notebook SQL, job runs, dashboard queries
-- No listener needed — Unity Catalog is the catalog itself
-- ============================================================

-- Unity Catalog Lineage is automatically captured for:
--   * Databricks SQL queries (DML + DDL)
--   * Databricks notebook cells (dbutils + spark.sql)
--   * Databricks job runs (workflow + MLflow training)
--   * Databricks SQL dashboards (BI queries)

-- Bronze -> Silver (Databricks notebook cell)
CREATE TABLE unity.silver.customers AS
SELECT
    customer_id,
    sha256(email) AS email_hash,
    sha256(phone) AS phone_hash,
    region,
    first_seen_ts
FROM unity.bronze.customers_raw
WHERE ingestion_ts >= current_date() - 1;

-- Silver -> Gold
CREATE TABLE unity.gold.cust_region_summary AS
SELECT
    region,
    count(*) AS n_customers,
    count(distinct email_hash) AS n_unique_emails
FROM unity.silver.customers
GROUP BY region;

-- Unity Catalog Lineage API — fetch downstream consumers of a column
-- curl -X GET "https://<workspace>.cloud.databricks.com/api/2.0/unity-catalog/lineage/table/unity.silver.customers/columns/email_hash/downstream?depth=10" \\
--   -H "Authorization: Bearer \${DATABRICKS_TOKEN}"
-- Response:
-- {
--   "downstream": [
--     {"name": "unity.gold.cust_region_summary.n_unique_emails", "depth": 1},
--     {"name": "bi.dashboard.revenue.unique_emails_tile", "depth": 3}
--   ]
-- }

-- Unity Catalog Lineage's killer feature: Delta-native column lineage
-- Delta Lake's transaction log captures every CTAS + INSERT INTO + MERGE
-- Unity Catalog wraps that with lineage graph queries (column-level)

-- Shortfall: Databricks-only (no Spark-on-K8s, no Trino, no Flink coverage)
-- Why complementary: OpenLineage captures the cross-tool layer (Airflow),
-- Unity captures the Databricks-internal layer (notebooks + jobs)`;

const SPLINE_SPARK_LINEAGE = `// ============================================================
// Spline — Spark lineage capture (ABSA, open-source)
// Captures Spark DataFrame operations (not SQL-only, like Atlas/Hive)
// ============================================================

// Spline ships as a Spark listener (similar to OpenLineage but Spark-only)
// spark-submit config:
//   --packages za.co.absa.spline:spark-3.5-bundle:1.4.0
//   --conf spark.lineage.log.level=INFO
//   --conf spark.spline.lineageDispatcher=http
//   --conf spark.spline.lineageDispatcher.http.url=http://spline:8080/spline/ingest

import org.apache.spark.sql.{SparkSession, SaveMode}
import za.co.absa.spline.harvester.SparkLineageInitializer

val spark = SparkSession.builder()
    .appName("silver_conformance_spline")
    .getOrCreate()

// Initialize Spline listener (one-time per Spark session)
SparkLineageInitializer.enableLineageTracking(spark)

// Spline captures EVERY DataFrame operation — not just SQL CTAS
val bronze = spark.read.table("bronze.customers_raw")
val silver = bronze
    .filter($"ingestion_ts" >= date_sub(current_date(), 1))
    .select(
        $"customer_id",
        sha256($"email").as("email_hash"),
        sha256($"phone").as("phone_hash"),
        $"region",
        $"first_seen_ts"
    )

silver.write
    .mode(SaveMode.Overwrite)
    .saveAsTable("silver.customers")

// Spline captures the EXECUTION PLAN (the DataFrame ops, not just SQL)
// -> bronze.customers_raw [filter] [select customer_id, sha256(email), ...]
//    -> silver.customers

// Spline REST API — fetch the lineage graph for a dataset
// curl http://spline:8080/spline/dataset/silver.customers/lineage
// Response: execution plan + inputs + outputs + column-level mapping

// Spline's killer feature: captures non-SQL Spark (DataFrame API)
// Atlas only captures Hive SQL; OpenLineage captures Spark SQL but only
// recently (1.0+) the DataFrame API. Spline was first to Spark-DataFrame.

// Shortfall: Spark-only (no Airflow, no dbt, no Snowflake coverage)
// Why complementary: Spline for Spark-specific lineage details,
// OpenLineage for the cross-tool layer`;

const PYODIDE_DEMO = `# ============================================================
# Lineage graph simulation — in-browser BFS over lineage edges
# Build synthetic lineage edges, traverse downstream + upstream,
# answer GDPR Article 15 (access) audit queries.
# ============================================================

import random
from collections import defaultdict, deque

random.seed(42)

print("=== Multi-hop lineage graph simulation ===")
print("Synthetic: Kafka -> Bronze -> Silver -> Gold -> BI pipeline\\n")

# Lineage edge: (source_dataset, dest_dataset, job, level)
# Each edge represents one OpenLineage event (job consumed src, produced dst)
edges = [
    # Bronze ingestion (Kafka topic -> Bronze table)
    ("kafka.customers_raw", "bronze.customers_raw",
     "kafka_ingest.customers", 1),
    ("kafka.orders_raw",    "bronze.orders_raw",
     "kafka_ingest.orders", 1),
    # Silver conformance (Bronze -> Silver)
    ("bronze.customers_raw", "silver.customers",
     "silver_dag.conformance_customers", 2),
    ("bronze.orders_raw",    "silver.orders",
     "silver_dag.conformance_orders", 2),
    ("bronze.fx_rates",      "silver.orders",
     "silver_dag.fx_enrich", 2),  # multi-source inputs!
    # Gold marts (Silver -> Gold)
    ("silver.customers", "gold.cust_region_summary",
     "gold_dag.region_summary", 3),
    ("silver.orders",    "gold.revenue_summary",
     "gold_dag.revenue_summary", 3),
    ("silver.customers", "gold.marketing.emails",
     "gold_dag.marketing_emails", 3),
    # BI dashboards (Gold -> BI)
    ("gold.cust_region_summary", "bi.dashboard.revenue",
     "bi_refresh.revenue", 4),
    ("gold.revenue_summary",     "bi.dashboard.revenue",
     "bi_refresh.revenue", 4),
    ("gold.marketing.emails",    "bi.dashboard.marketing",
     "bi_refresh.marketing", 4),
    # ML features (Silver -> ML)
    ("silver.customers", "ml.features.user_features",
     "ml_dag.user_features", 3),
    ("ml.features.user_features", "ml.serving.scoring",
     "ml_serving.scoring", 4),
]

# Build adjacency lists for downstream + upstream traversal
downstream_adj = defaultdict(list)
upstream_adj = defaultdict(list)
all_datasets = set()

for src, dst, job, level in edges:
    downstream_adj[src].append((dst, job, level))
    upstream_adj[dst].append((src, job, level))
    all_datasets.add(src)
    all_datasets.add(dst)

print(f"Lineage graph:")
print(f"  Datasets: {len(all_datasets)}")
print(f"  Edges: {len(edges)}")
print(f"  Jobs: {len(set(j for _, _, j, _ in edges))}")
print()

# ---- Downstream BFS — find all artifacts derived from a source ----
def downstream_bfs(start, max_depth=10):
    """BFS from a source dataset — find all downstream consumers."""
    visited = set()
    queue = deque([(start, 0, "<root>")])
    impacted = []
    while queue:
        node, depth, via_job = queue.popleft()
        if depth > max_depth:
            continue
        for child, job, edge_level in downstream_adj.get(node, []):
            if child not in visited:
                visited.add(child)
                impacted.append((child, edge_level, job))
                queue.append((child, edge_level + 1, job))
    return impacted

# ---- Upstream BFS — find all sources feeding into a broken artifact ----
def upstream_bfs(start, max_depth=10):
    """BFS from a destination dataset — find all upstream sources."""
    visited = set()
    queue = deque([(start, 0, "<root>")])
    sources = []
    while queue:
        node, depth, via_job = queue.popleft()
        if depth > max_depth:
            continue
        for parent, job, edge_level in upstream_adj.get(node, []):
            if parent not in visited:
                visited.add(parent)
                sources.append((parent, edge_level, job))
                queue.append((parent, edge_level + 1, job))
    return sources

# ---- Use case 1: GDPR Article 15 audit — what's downstream of silver.customers ----
print("=== Use case 1: GDPR Article 15 audit — downstream of silver.customers ===")
blast_radius = downstream_bfs("silver.customers", max_depth=10)
print(f"Blast radius: {len(blast_radius)} downstream artifacts")
for ds, depth, job in blast_radius:
    print(f"  depth {depth}  {ds}  (via {job})")

# ---- Use case 2: Impact analysis — what breaks if we change silver.customers ----
print()
print("=== Use case 2: Pre-deploy impact analysis ===")
print("Question: change to silver.customers.email_hash — what breaks?")
n_consumers = len(blast_radius)
print(f"  Downstream datasets: {n_consumers}")
bi_impact = [d for d, _, _ in blast_radius if d.startswith("bi.")]
ml_impact = [d for d, _, _ in blast_radius if d.startswith("ml.")]
print(f"  BI dashboards affected: {len(bi_impact)}")
for d in bi_impact:
    print(f"    - {d}")
print(f"  ML pipelines affected: {len(ml_impact)}")
for d in ml_impact:
    print(f"    - {d}")
print(f"  Action: CI blocks deploy if BI impact detected without owner sign-off")

# ---- Use case 3: RCA — broken BI dashboard, walk upstream ----
print()
print("=== Use case 3: RCA — bi.dashboard.revenue dropped 30% overnight ===")
upstream = upstream_bfs("bi.dashboard.revenue", max_depth=10)
print(f"Upstream sources: {len(upstream)} (walked from broken dashboard)")
for ds, depth, job in upstream:
    print(f"  depth {depth}  {ds}  (via {job})")

# ---- Simulate job runs in last 24h with random failures ----
print()
print("=== Suspect jobs (FAILED or low-DQ in last 24h) ===")
jobs_in_path = {job for _, _, job in upstream}
suspects = []
for job in jobs_in_path:
    # Simulate 24 hourly runs
    n_fail = random.randint(0, 4)
    if n_fail > 0:
        suspects.append((job, n_fail))
        print(f"  {job}: {n_fail} failed runs in last 24h")
if not suspects:
    print("  (none — all upstream jobs succeeded)")
else:
    # Prime suspect — most failures
    prime = max(suspects, key=lambda x: x[1])
    print(f"\\n  PRIME SUSPECT: {prime[0]} ({prime[1]} failed runs)")
    print(f"  Action: re-run {prime[0]}, then re-run downstream consumers")

print()
print("Key insight: lineage is the dependency graph for data — like a")
print("package-lock.json but for tables. Three use cases (GDPR audit,")
print("impact analysis, RCA) all reduce to graph traversal queries.")
print("Without lineage, each use case requires hours of manual tracing.")`;

// ============================================================
// Lineage topology SVG diagram
// ============================================================

function LineageTopologyDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("lineage-api");
  const nodes = {
    "airflow":      { label: "Airflow (DAG runs)", desc: "Airflow listener emits OpenLineage START/COMPLETE per task instance. Parent runId ties Spark job to Airflow DAG run.", level: 0 },
    "spark":        { label: "Spark (jobs)",      desc: "Spark listener (OpenLineage + Spline) auto-captures inputs, outputs, SQL plan, column-level lineage.", level: 0 },
    "dbt":          { label: "dbt (models)",     desc: "dbt adapter emits lineage on each model run — captures the upstream CTE inputs + downstream materialised view outputs.", level: 0 },
    "lineage-api":  { label: "OpenLineage API",  desc: "Standardised REST protocol — Send event (Run, Job, Dataset, Facets). Transport: HTTP/Kafka. Listener emits events as jobs run.", level: 1 },
    "backend":      { label: "Lineage backend",   desc: "Marquez (reference impl, Postgres) | DataHub (LinkedIn, elastic + kafka) | Atlas (HBase) | Unity (Databricks internal) | Spline (Spark-only)", level: 2 },
    "ui":           { label: "Visual graph UI",   desc: "Marquez UI, DataHub UI, Atlas UI — graph view + search + column-level lineage + impact analysis + RCA walk", level: 3 },
    "consumer":     { label: "Consumers",         desc: "GDPR audit (Article 15 access), impact analysis (pre-deploy), RCA (broken dashboard), compliance reporting", level: 4 },
  };
  const edges = [
    ["airflow", "lineage-api"],
    ["spark", "lineage-api"],
    ["dbt", "lineage-api"],
    ["lineage-api", "backend"],
    ["backend", "ui"],
    ["ui", "consumer"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "airflow":     { x: 80,  y: 30 },
    "spark":       { x: 200, y: 30 },
    "dbt":         { x: 320, y: 30 },
    "lineage-api": { x: 200, y: 80 },
    "backend":     { x: 200, y: 130 },
    "ui":          { x: 200, y: 180 },
    "consumer":    { x: 200, y: 220 },
  };

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Network className="h-3.5 w-3.5 text-primary" />
          Lineage topology — Airflow/Spark/dbt emit OpenLineage events to a backend that exposes a visual graph UI
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 400 250" className="w-full h-auto">
          {edges.map(([from, to], i) => {
            const a = positions[from];
            const b = positions[to];
            return (
              <line key={i} x1={a.x} y1={a.y + 12} x2={b.x} y2={b.y - 12}
                stroke="var(--border)" strokeWidth="0.8"
                markerEnd="url(#arrow)" />
            );
          })}
          {Object.entries(positions).map(([id, pos]) => {
            const isActive = activeNode === id;
            const node = nodes[id as keyof typeof nodes];
            const color =
              node.level === 0 ? "var(--chart-3)" :
              node.level === 1 ? "var(--chart-2)" :
              node.level === 2 ? "var(--chart-1)" :
              node.level === 3 ? "var(--chart-4)" : "var(--chart-5)";
            return (
              <motion.g key={id}
                onMouseEnter={() => setActiveNode(id)}
                onMouseLeave={() => setActiveNode(null)}
                animate={{ scale: isActive ? 1.05 : 1 }}
                style={{ cursor: "pointer" }}
              >
                <rect x={pos.x - 60} y={pos.y - 10} width="120" height="22" rx="3"
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
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
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
            Hover any node — the OpenLineage API is the cross-tool standard
            (Airflow + Spark + dbt all speak the same protocol).
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Lineage backend comparison table
// ============================================================

function LineageComparisonTable() {
  const rows = [
    { feature: "Origin", openlineage: "WeWork 2020 (standard protocol)", atlas: "Hortonworks 2015 (Hadoop-native)", spline: "ABSA 2019 (Spark-only)", unity: "Databricks 2021 (Delta-native)", datahub: "LinkedIn 2020 (general metadata)" },
    { feature: "Scope", openlineage: "Cross-tool (Airflow + Spark + dbt + Snowflake)", atlas: "Hadoop/Hive only", spline: "Spark only", unity: "Databricks internal only", datahub: "Cross-tool (broader than OpenLineage)" },
    { feature: "Column-level lineage", openlineage: "Yes (v1.0+ via Spark 3.5+)", atlas: "Limited (Hive-only)", spline: "Yes (Spark DataFrame ops)", unity: "Yes (Delta log)", datahub: "Yes (dbt + Snowflake + BigQuery)" },
    { feature: "Real-time events", openlineage: "Yes (Airflow/Spark emit as jobs run)", atlas: "No (post-hook only)", spline: "Yes (Spark listener)", unity: "Yes (Delta commits)", datahub: "Yes (Kafka ingestion)" },
    { feature: "Storage backend", openlineage: "Pluggable (Marquez=Postgres, DataHub=ES)", atlas: "HBase (Hadoop-coupled)", spline: "MongoDB / Postgres", unity: "Databricks internal", datahub: "Elasticsearch + Kafka + Neo4j" },
    { feature: "Visual UI", openlineage: "Marquez UI (basic)", atlas: "Atlas UI (legacy)", spline: "Spline UI (Spark plan view)", unity: "Databricks Unity UI (best-in-class)", datahub: "DataHub UI (broadest)" },
    { feature: "Standard protocol", openlineage: "Yes (OpenLineage spec — JSON events)", atlas: "No (Atlas-specific REST)", spline: "No (Spline-specific REST)", unity: "No (Databricks-only API)", datahub: "Partial (supports OpenLineage + own format)" },
    { feature: "License", openlineage: "Apache 2.0 (pure open source)", atlas: "Apache 2.0", spline: "Apache 2.0", unity: "Databricks proprietary", datahub: "Apache 2.0 (pure open source)" },
    { feature: "Best fit", openlineage: "Cross-tool lineage standard", atlas: "On-prem Hadoop/Hive only", spline: "Spark DataFrame lineage", unity: "Databricks ecosystem", datahub: "General metadata platform (lineage + more)" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          OpenLineage vs Atlas vs Spline vs Unity vs DataHub — lineage backend alternatives
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold text-primary">OpenLineage</th>
              <th className="text-left px-3 py-2 font-semibold">Apache Atlas</th>
              <th className="text-left px-3 py-2 font-semibold">Spline</th>
              <th className="text-left px-3 py-2 font-semibold">Unity Catalog</th>
              <th className="text-left px-3 py-2 font-semibold">DataHub</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-primary/80">{r.openlineage}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.atlas}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.spline}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.unity}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.datahub}</td>
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
  { label: "Origin", value: "Atlas 2015 / OpenLineage 2020 / Spline 2019 / Unity 2021", hint: "OpenLineage born from WeWork/Marquez to standardise cross-tool lineage (Atlas was Hadoop-only, no standard protocol existed)", deltaTone: "flat" as const },
  { label: "Production scale", value: "1K+ datasets · 8K+ jobs/day", hint: "Single lineage backend tracks thousands of datasets + thousands of job runs/day at Uber/LinkedIn/Stripe scale; sub-second graph queries", deltaTone: "up" as const },
  { label: "Standard protocol", value: "OpenLineage (cross-tool)", hint: "JSON event format with Run + Job + Dataset + Facets. Airflow + Spark + dbt + Snowflake + Flink + Trino all speak it", deltaTone: "flat" as const },
  { label: "Backends", value: "5 (Marquez, Atlas, Spline, Unity, DataHub)", hint: "Vendor-neutral — OpenLineage emits to any backend; DataHub is the most production-deployed (LinkedIn origin)", deltaTone: "up" as const },
];

export function LineagePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="OpenLineage · Apache Atlas · Spline · Unity Lineage · DataHub"
        title="Data Lineage — the dependency graph for data"
        description="Lineage is to data what package-lock.json is to code: a dependency graph showing which datasets feed which downstream consumers. Born from WeWork/Marquez (2020) to standardise cross-tool lineage (Apache Atlas from 2015 was Hadoop-only), OpenLineage is now the de facto standard — Airflow, Spark, dbt, Snowflake, Flink, Trino all emit OpenLineage events as jobs run. The lineage graph enables three production use cases: (1) GDPR Article 15 audit (which downstream artifacts derive from this customer's PII?), (2) pre-deploy impact analysis (if we change this column, what breaks?), (3) root cause analysis (BI dashboard broke overnight — which job produced the bad data?). Without lineage, each use case requires hours of manual table-by-table tracing. With lineage, all three reduce to graph traversal queries — milliseconds, not hours."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Network className="h-3 w-3" /> OpenLineage v1.0+</Badge>
            <Badge variant="outline" className="gap-1.5"><GitBranch className="h-3 w-3" /> Column-level</Badge>
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

      {/* Lineage topology */}
      <SectionCard
        title="Lineage topology — Airflow/Spark/dbt emit OpenLineage events to a backend"
        description="The standard topology: tools emit OpenLineage events (Run + Job + Dataset + Facets) to a lineage backend as jobs run. The backend (Marquez, DataHub, Atlas, Unity, Spline) stores the lineage graph. The visual UI exposes graph queries: downstream BFS (impact analysis), upstream BFS (root cause analysis), column-level lineage (column dependency). OpenLineage is the cross-tool standard protocol — any tool can emit, any backend can consume."
        icon={<Network className="h-5 w-5" />}
        badge="architecture"
      >
        <LineageTopologyDiagram />
      </SectionCard>

      {/* OpenLineage + Airflow */}
      <SectionCard
        title="OpenLineage + Airflow — emit events per task instance"
        description="Airflow is the most common lineage producer — its listener auto-emits START/RUNNING/COMPLETE events on every task instance transition. Each event carries parent runId (the Airflow DAG run), inputs (read datasets), outputs (written datasets), and facets (SQL plan, column-level mapping). Spark jobs launched by Airflow inherit the parent runId via spark.openlineage.parentRunId — ties Spark sub-events back to the Airflow DAG run that launched them."
        icon={<Workflow className="h-5 w-5" />}
        badge="Airflow"
      >
        <CodeBlock code={OPENLINEAGE_AIRFLOW} language="python" filename="openlineage_airflow.py" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97]} />
      </SectionCard>

      {/* Spark listener */}
      <SectionCard
        title="OpenLineage Spark listener — auto-captures SQL execution plan"
        description="The Spark listener (org.openlineage.spark.OpenLineageSparkListener) auto-captures every Spark job's inputs, outputs, and SQL plan. Spark 3.5+ adds column-level lineage (v1.0+) — captures which source column feeds which destination column (e.g., bronze.customers_raw.email → silver.customers.email_hash → gold.cust_region_summary.n_unique_emails). This is the killer feature: column-level lineage enables the BI-impact analysis that table-level lineage can't do."
        icon={<Cpu className="h-5 w-5" />}
        badge="Spark"
      >
        <CodeBlock code={OPENLINEAGE_SPARK_LISTENER} language="sql" filename="openlineage_spark.sql" highlight={[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49]} />
      </SectionCard>

      {/* Marquez REST API */}
      <SectionCard
        title="Marquez REST API — reference implementation + visual UI"
        description="Marquez is the reference OpenLineage implementation — Postgres backend, REST API on port 5000, web UI on the same port. Supports graph queries (lineage by dataset name, depth-limited BFS), column-level lineage (v1.0+), run history (per-job run list with facets). Use cases: GDPR audit (downstream of silver.customers.email_hash), impact analysis (what breaks if we change X), RCA (which job touched a dataset in a time window). Marquez is open-source Apache 2.0."
        icon={<Server className="h-5 w-5" />}
        badge="Marquez REST"
      >
        <CodeBlock code={MARQUEZ_API} language="bash" filename="marquez_api.sh" highlight={[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62]} />
      </SectionCard>

      {/* Apache Atlas */}
      <SectionCard
        title="Apache Atlas — Hadoop-native lineage (HBase-backed)"
        description="Apache Atlas (Hortonworks 2015) was the first widely-deployed lineage platform — Hadoop-native, HBase-backed. Hive hooks auto-capture CREATE TABLE AS SELECT lineage edges. Atlas also has a classification system (tags for PII columns) — lineage + classification in one tool. The shortfall: Atlas is Hive-only (doesn't cover Spark/Trino/Flink/Airflow), so the lineage graph is incomplete for modern stacks. Atlas is still deployed on-prem Hadoop clusters."
        icon={<History className="h-5 w-5" />}
        badge="Apache Atlas"
      >
        <CodeBlock code={APACHE_ATLAS_HADOOP} language="sql" filename="atlas_hive.sql" highlight={[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43]} />
      </SectionCard>

      {/* Unity Catalog Lineage */}
      <SectionCard
        title="Unity Catalog Lineage — Databricks-native (Delta log)"
        description="Databricks Unity Catalog has lineage built-in — no listener needed, the catalog itself captures every CTAS + INSERT INTO + MERGE on Delta tables. Column-level lineage is the strongest of any backend — Delta's transaction log captures every operation on the table, Unity wraps that with lineage graph queries. Shortfall: Databricks-only (no coverage for Spark-on-K8s, Trino, Flink, dbt outside Databricks). Often paired with OpenLineage for the cross-tool layer."
        icon={<Cloud className="h-5 w-5" />}
        badge="Unity Catalog"
      >
        <CodeBlock code={UNITY_CATALOG_LINEAGE} language="sql" filename="unity_lineage.sql" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47]} />
      </SectionCard>

      {/* Spline */}
      <SectionCard
        title="Spline — Spark DataFrame lineage (ABSA, open-source)"
        description="Spline (ABSA 2019) was the first tool to capture Spark DataFrame operations as lineage (Atlas only captured Hive SQL). Spline's killer feature: captures non-SQL Spark code (the DataFrame API) — filter, select, join, groupBy all become lineage edges. OpenLineage captured only SQL until v1.0 (Spark 3.5+). Spline is still used by teams with heavy DataFrame-API Spark code. Shortfall: Spark-only (no Airflow/dbt/Snowflake coverage) — usually paired with OpenLineage for the cross-tool layer."
        icon={<GitBranch className="h-5 w-5" />}
        badge="Spline"
      >
        <CodeBlock code={SPLINE_SPARK_LINEAGE} language="scala" filename="spline_spark.scala" highlight={[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50]} />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: lineage graph BFS in your browser (Pyodide)"
        description="Pure-Python simulation of the lineage graph + three production use cases. Build synthetic edges (Kafka → Bronze → Silver → Gold → BI). Run downstream BFS for GDPR Article 15 audit (which downstream artifacts derive from silver.customers?). Run pre-deploy impact analysis (if we change email_hash, what breaks?). Run root cause analysis (BI dashboard broke — walk upstream to find suspect jobs). All in-browser, no install."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={PYODIDE_DEMO} buttonLabel="Run lineage graph BFS (Pyodide)" />
      </SectionCard>

      {/* Comparison table */}
      <SectionCard
        title="OpenLineage vs Atlas vs Spline vs Unity vs DataHub — lineage backends"
        description="Five lineage backend alternatives. OpenLineage is the cross-tool standard protocol (JSON events) — any tool can emit, any backend can consume. Apache Atlas (Hortonworks 2015) is the Hadoop-native pioneer, now legacy. Spline (ABSA 2019) is the Spark-only specialist — captures non-SQL Spark DataFrame code that OpenLineage didn't until v1.0. Unity Catalog (Databricks 2021) is Delta-native — best column-level lineage but Databricks-only. DataHub (LinkedIn 2020) is the broadest — lineage + schemas + ownership + run context in one metadata platform."
        icon={<Boxes className="h-5 w-5" />}
      >
        <LineageComparisonTable />
      </SectionCard>

      {/* Why this evolved */}
      <SectionCard
        title="Why lineage evolved — shortfalls of manual table-by-table tracing"
        description="Modern data engineers prefer lineage platforms because the prior alternative (manual table-by-table tracing) had four critical shortfalls that made GDPR audits, impact analysis, and RCA all multi-hour efforts. OpenLineage was designed ground-up to fix all four simultaneously."
        icon={<History className="h-5 w-5" />}
        badge="Why lineage"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: No standard lineage protocol.</strong> Every tool had its own lineage format — Atlas for Hive, Spline for Spark, dbt for SQL models, Unity for Databricks. The lineage graph was fragmented — to trace from Airflow → Spark → Iceberg you needed to query 3 different backends. OpenLineage standardises the protocol — one REST API, one JSON event format with Run + Job + Dataset + Facets. Any tool can emit, any backend can consume. <strong className="text-foreground/80">Result:</strong> cross-tool lineage graph in one place.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: Apache Atlas was Hadoop-only.</strong> Atlas captured Hive queries via hooks — but modern stacks use Spark, Trino, Flink, dbt, Snowflake. Atlas's lineage graph was missing 90% of the actual pipeline. OpenLineage ships listeners for Airflow, Spark, dbt, Flink, Trino, Snowflake — the lineage graph covers the full modern stack. <strong className="text-foreground/80">Result:</strong> complete lineage graph, not just Hive queries.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: No column-level lineage.</strong> Atlas + early OpenLineage captured only table-level lineage — but schema changes happen at column level. A query like 'which dashboards depend on silver.customers.email_hash?' was impossible — you could only ask 'which dashboards depend on silver.customers?' (often hundreds, unhelpfully broad). Column-level lineage (Spark 3.5+, OpenLineage 1.0+, Unity from day one) tracks column→column edges. <strong className="text-foreground/80">Result:</strong> precise impact analysis at column granularity.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: No real-time lineage.</strong> Atlas captured lineage via post-hook (after the query finished) — stale by hours. RCA investigations needed fresh lineage: 'which job is writing to silver.customers right now?'. OpenLineage listeners emit events as jobs run (START → RUNNING → COMPLETE), so the lineage graph is fresh within seconds. <strong className="text-foreground/80">Result:</strong> real-time lineage for live RCA.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique lineage features (vs alternatives)"
        description="Four features that are genuinely unique to the OpenLineage ecosystem — not marketing fluff, but structural differentiators that no other lineage approach matches."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. Cross-tool standard protocol</p>
            <p className="text-muted-foreground">One REST API + one JSON event format (Run + Job + Dataset + Facets). Airflow + Spark + dbt + Snowflake + Flink + Trino all speak it. <strong>Atlas is Hive-only, Spline is Spark-only, Unity is Databricks-only.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Column-level lineage</p>
            <p className="text-muted-foreground">Tracks column→column edges (bronze.email → silver.email_hash → gold.n_unique_emails). Spark 3.5+, OpenLineage 1.0+, Unity from day one. <strong>Enables BI-impact analysis at column granularity.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Real-time event emission</p>
            <p className="text-muted-foreground">Listeners emit START/RUNNING/COMPLETE as jobs run — lineage graph is fresh within seconds. <strong>Atlas captured post-hook (hours stale).</strong> Enables live RCA + real-time impact analysis.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Parent runId chaining</p>
            <p className="text-muted-foreground">Airflow DAG run = parent runId; Spark job launched by Airflow inherits the parent runId — ties the full job hierarchy together. <strong>No other lineage system does this end-to-end.</strong></p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples cards */}
      <SectionCard
        title="3 large-dataset examples — multi-hop lineage in action"
        description="Three production-style lineage scenarios showing OpenLineage in action. Each is a clickable card opening a lazy popup with: scenario brief (dataset/scale/why), dataset stats grid, computational tooling, multi-language code in Scala + Rust + Go + Elixir + Zig, and an implementation insight. All datasets are synthetic Uber-scale equivalents."
        icon={<Database className="h-5 w-5" />}
        badge="3 examples × 5 langs"
      >
        <DatasetCards
          examples={LINEAGE_EXAMPLES}
          intro="Three lineage scenarios: multi-hop GDPR audit trail (100M events/day, 5 hops), impact analysis with column-level blast radius (1 column change, ~14 consumers), root cause analysis for a broken BI dashboard (upstream BFS to find the suspect job). Each card has Scala/Rust/Go/Elixir/Zig code covering the unique lineage use case."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the lineage ecosystem"
        description="The lineage ecosystem spans 5 backends (OpenLineage-compatible + Atlas + Spline + Unity + DataHub), 6 listeners (Airflow, Spark, dbt, Snowflake, Flink, Trino), and 3 graph query types (downstream BFS, upstream BFS, column-level). Production deployments typically run 1-2 backends (e.g., Marquez for OpenLineage events + DataHub for broader metadata)."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Network className="h-3.5 w-3.5 text-primary" /> Backends (5)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Marquez</strong> — reference OpenLineage impl (Postgres)</li>
              <li>• <strong>Apache Atlas</strong> — Hadoop-native (HBase)</li>
              <li>• <strong>Spline</strong> — Spark DataFrame lineage (ABSA)</li>
              <li>• <strong>Unity Catalog Lineage</strong> — Databricks Delta-native</li>
              <li>• <strong>DataHub</strong> — broadest (LinkedIn, Elasticsearch)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-primary" /> Listeners (6)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Airflow</strong> — task instance transitions</li>
              <li>• <strong>Spark 3.5+</strong> — SQL + DataFrame ops, column-level</li>
              <li>• <strong>dbt</strong> — model run events, CTE inputs</li>
              <li>• <strong>Snowflake</strong> — Access History + SHOW LINEAGE</li>
              <li>• <strong>Flink</strong> — streaming job events (job vertex)</li>
              <li>• <strong>Trino</strong> — query event listener</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Search className="h-3.5 w-3.5 text-primary" /> Graph queries (3)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Downstream BFS</strong> — impact analysis + GDPR audit</li>
              <li>• <strong>Upstream BFS</strong> — root cause analysis</li>
              <li>• <strong>Column-level</strong> — column→column dependency edges</li>
              <li>• Depth-limited traversal (default 10)</li>
              <li>• Time-windowed runs (runs touching a dataset in window)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Target className="h-3.5 w-3.5 text-primary" /> Production use cases</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>GDPR Article 15</strong> — access audit (downstream of PII)</li>
              <li>• <strong>GDPR Article 17</strong> — erasure cascade</li>
              <li>• <strong>Pre-deploy impact</strong> — CI blocks on BI impact</li>
              <li>• <strong>Root cause analysis</strong> — broken dashboard</li>
              <li>• <strong>Compliance reporting</strong> — automated audit trails</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers + production posts that defined the lineage movement. The WeWork 2020 OpenLineage paper is the foundational standard; the LinkedIn DataHub 2020 post is the broadest production deployment; the ABSA Spline 2019 paper introduced Spark DataFrame lineage."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">WeWork 2020: "OpenLineage — A Standard for Data Lineage."</strong> Born from WeWork's internal lineage needs (Marquez, open-sourced 2018) — recognised that every tool had its own lineage format and that cross-tool lineage graphs were impossible. OpenLineage defined a JSON event format (Run + Job + Dataset + Facets) + a REST transport protocol. Airflow + Spark + dbt + Snowflake + Flink + Trino adopted the listeners. The standard won because no single vendor (Atlas/Hortonworks, Spline/ABSA, Unity/Databricks) had cross-tool reach.
          </p>
          <p>
            <strong className="text-foreground/80">Hortonworks 2015: "Apache Atlas — Metadata + Governance for Hadoop."</strong> Born as the Hortonworks-led governance platform for Hadoop — Hive hooks auto-capture CREATE TABLE AS SELECT lineage. Atlas also shipped classification tags (PII tagging, governance labels) — lineage + classification in one tool. Still deployed on-prem Hadoop clusters today. The shortfall: Atlas is Hive-only — modern stacks use Spark/Trino/Flink, so Atlas's lineage graph is missing most of the pipeline.
          </p>
          <p>
            <strong className="text-foreground/80">ABSA 2019: "Spline — Spark Lineage Capture."</strong> Born from ABSA's (a South African bank) need to capture Spark DataFrame operations as lineage — Atlas captured Hive SQL, but ABSA's ETL was DataFrame-API Spark (filter/select/join), which Atlas couldn't see. Spline captured the Spark execution plan (the Catalyst-optimised logical plan) as lineage edges. OpenLineage captured only SQL until v1.0 (Spark 3.5+, 2024) — Spline was 5 years earlier for DataFrame API. Still used by teams with heavy DataFrame-API Spark code.
          </p>
          <p>
            <strong className="text-foreground/80">Databricks 2021: "Unity Catalog Lineage — Delta-native column-level."</strong> Unity Catalog (Databricks's governance platform) has lineage built-in — Delta's transaction log captures every CTAS + INSERT INTO + MERGE, Unity wraps that with lineage graph queries. Column-level lineage is the strongest of any backend — Delta knows exactly which columns each query touched. Shortfall: Databricks-only (no Spark-on-K8s, no Trino, no Flink coverage outside Databricks). Often paired with OpenLineage for the cross-tool layer.
          </p>
          <p>
            <strong className="text-foreground/80">LinkedIn 2020: "DataHub — LinkedIn's Metadata Platform."</strong> DataHub is the broadest metadata platform — lineage + schemas + ownership + run context + dashboards + ML models. LinkedIn open-sourced it in 2020 (Apache 2.0). DataHub supports OpenLineage events as an ingestion source (the two are complementary, not competing) — you can use OpenLineage listeners and store in DataHub. DataHub is the most production-deployed metadata platform (LinkedIn, Stripe, Reddit, Lyft).
          </p>
          <p>
            <strong className="text-foreground/80">Stripe Production Case (2022):</strong> Stripe deployed OpenLineage + Marquez for end-to-end lineage on 1,200+ Iceberg tables + 8,000+ daily Airflow jobs. The killer use case: pre-deploy impact analysis — CI runs a lineage query before any schema change; if any BI dashboard tile depends on the changed column, CI blocks the deploy until the dashboard owner signs off. Zero silent dashboard breakages in 12 months.
          </p>
          <p>
            <strong className="text-foreground/80">Uber Production Case (2021):</strong> Uber deployed Apache Atlas (then migrated to OpenLineage) for GDPR Article 15 (right of access) compliance — when a customer asks 'which downstream artifacts show my PII?', the audit needs to complete in seconds, not hours. With lineage, the BFS from customer PII column to BI dashboard tiles takes ~200ms. Without lineage, manual tracing through 10+ tables took 3-6 hours per request.
          </p>
        </div>
      </SectionCard>

      {/* Deeper-thought insight */}
      <SectionCard
        title="My deeper thought: lineage IS the dependency graph for data"
        description="The unifying view: lineage is structurally the same pattern as a programming language's dependency graph (npm packages, Maven artifacts, Go modules) — applied to datasets. The lineage graph is the package-lock.json of the data world."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Lineage IS the dependency graph for data.</strong> Every programming language has a dependency manager — npm (JS), Maven (Java), pip (Python), cargo (Rust), go mod (Go), mix (Elixir). The package-lock.json equivalent for data is the lineage graph: each dataset is a package, each lineage edge is a dependency, each job run is a build. Impact analysis is `npm ls --downstream` (who depends on me?). Root cause analysis is `npm ls --upstream` (what does this depend on?). GDPR audit is a security audit over the dependency graph. The pattern is identical — only the artifacts differ (datasets vs packages).
          </p>
          <p>
            <strong className="text-foreground/80">OpenLineage IS to data lineage what OpenTelemetry is to distributed tracing.</strong> Before OpenTelemetry (2019), every APM vendor had its own trace format (Datadog, New Relic, Honeycomb, Lightstep) — cross-vendor tracing required multiple SDKs. OpenTelemetry standardised the format; vendors now consume OTLP. OpenLineage did the same for lineage — before it (2020), every tool (Atlas, Spline, Unity, dbt) had its own lineage format. OpenLineage standardised it; backends now consume OpenLineage events. Same pattern, different domain.
          </p>
          <p>
            <strong className="text-foreground/80">Column-level lineage IS the symbol table for data.</strong> Every compiled language has a symbol table — the runtime resolves 'ship_country' to column ID 4 (Iceberg) or tag 102 (Protobuf). Column-level lineage is the same idea applied to data: bronze.customers_raw.email is the symbol, silver.customers.email_hash is its alias, gold.cust_region_summary.n_unique_emails is the consumer of that alias. The lineage graph IS the symbol table for cross-table references. Same pattern, different granularity.
          </p>
          <p>
            <strong className="text-foreground/80">Impact analysis IS the build-with-dry-run pattern.</strong> Modern build systems support `npm install --dry-run` (show what would change without doing it). Impact analysis is the same pattern for data — 'show what would break if we changed column X'. The lineage graph + column-level edges make this a single BFS query. CI integrates this as a deploy-gate: if any BI dashboard tile depends on the changed column, CI fails until the owner signs off. Same pattern as a failing unit test.
          </p>
          <p>
            <strong className="text-foreground/80">Lineage IS the substrate for every governance pattern.</strong> GDPR Article 15 (access), Article 17 (erasure), Article 20 (portability) all require the same primitive: 'which downstream artifacts derive from this customer's data?'. SOC 2 audit (change tracking) requires the same primitive: 'which jobs touched this dataset in the audit window?'. Data contracts (next page) require the same primitive: 'which consumers subscribe to this dataset, and will my change break them?'. Lineage is the substrate — every governance pattern builds on the dependency graph.
          </p>
        </div>
      </SectionCard>


      <DeeperThoughtSection pageTitle="Lineage">
        <DeeperThought title="Lineage IS the dependency graph — and it's git blame for data" connectedTo="ADR-001 (platform architecture)">
          <p>{"Data lineage tracks: table A depends on table B depends on table C. When table C breaks, lineage tells you all downstream tables affected. This IS the SAME pattern as git blame (which file caused this bug?) and Make's dependency graph (which targets depend on this source?). The lineage graph IS a DAG (directed acyclic graph) — the SAME structure as dbt's DAG, Airflow's DAG, and Make's dependency tree. Lineage IS git blame for data."}</p>
        </DeeperThought>
        <DeeperThought title="OpenLineage IS the open standard — and it's the right design" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"OpenLineage (open standard for lineage) defines events: job started, job completed, dataset created, dataset read. Each event has metadata (run ID, inputs, outputs, facets). This IS the SAME pattern as OpenTelemetry for distributed tracing (span started, span completed, attributes). OpenLineage IS OpenTelemetry for data — the same event-driven, vendor-neutral, standards-based approach. The pattern (events + metadata + open API) IS the same."}</p>
        </DeeperThought>
        <DeeperThought title="Column-level lineage IS field-level dependency — and it's more useful than table-level" connectedTo="ADR-022 (pgvector for variant embeddings)">
          <p>{"Table-level lineage says 'dashboard depends on table A.' Column-level lineage says 'dashboard's revenue column depends on table A's price column and table B's quantity column.' When price changes, you know exactly which dashboard cells are affected. This IS the SAME upgrade as git diff (file-level → line-level). Column-level lineage IS git diff for data."}</p>
        </DeeperThought>
        <DeeperThought title="Lineage + impact analysis IS the blast radius — and it's the right question" connectedTo="ADR-013 (Delta Lake)">
          <p>{"When a source table changes schema, the blast radius IS the set of all downstream tables/dashboards/ML models that depend on it. Lineage + impact analysis computes this set. This IS the SAME question as 'what services depend on this microservice?' in service mesh. The blast radius IS the dependency fanout. The math (graph reachability from a node) IS the same. Impact analysis IS reachability for data graphs."}</p>
        </DeeperThought>
        <DeeperThought title="Lineage IS the audit trail — and it's the compliance requirement" connectedTo="ADR-001 (platform architecture)">
          <p>{"GDPR Article 30 requires data processing records. Lineage IS the processing record: this PII column came from source X, was transformed by job Y, and feeds dashboard Z. When a user requests data deletion (Article 17), lineage tells you exactly which tables to purge. Lineage IS the compliance API for data — the audit trail that proves you know where every column came from and where it goes."}</p>
        </DeeperThought>
      </DeeperThoughtSection>
      <RelatedTopics topics={[
        { id: "data-contracts" as const, reason: "Data contracts — schema + SLA + ownership (lineage as compliance substrate)" },
        { id: "governance" as const, reason: "Governance — Unity Catalog integrates lineage + RLS + tagging" },
        { id: "iceberg" as const, reason: "Iceberg — manifest tree is the substrate lineage tracks" },
        { id: "orchestration" as const, reason: "Airflow — emits OpenLineage events per task instance" },
        { id: "dbt" as const, reason: "dbt — emits lineage on each model run" },
        { id: "databricks" as const, reason: "Databricks Unity Catalog — Delta-native column-level lineage" },
        { id: "kafka-connect" as const, reason: "Kafka Connect — CDC producer feeding lineage edges" },
        { id: "data-lakehouse" as const, reason: "Lakehouse — lineage tracks Bronze→Silver→Gold hops" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("data-contracts")} className="text-sm text-primary hover:underline">
          &rarr; Data Contracts (lineage as compliance substrate)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("governance")} className="text-sm text-primary hover:underline">
          &rarr; Governance (Unity Catalog lineage + RLS + tags)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("iceberg")} className="text-sm text-primary hover:underline">
          &rarr; Iceberg (manifest tree — lineage substrate)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("orchestration")} className="text-sm text-primary hover:underline">
          &rarr; Airflow (OpenLineage event emission)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("databricks")} className="text-sm text-primary hover:underline">
          &rarr; Databricks Unity Catalog (Delta-native lineage)
        </Link>
      </div>
    </div>
  );
}
