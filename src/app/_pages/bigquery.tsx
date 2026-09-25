"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { BIGQUERY_SCIENCE_EXAMPLES } from "../_components/_dataset_examples10";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Layers, Boxes, Database, Workflow, Zap, GitBranch, History, ShieldCheck,
  Atom, Activity, FileText, ExternalLink, Network, Sparkles, Cpu, TrendingUp,
  Server, Cloud, Code2, Satellite, Microscope,
} from "lucide-react";

// ============================================================
// Code snippets
// ============================================================

const BQ_CREATE_TABLE_SQL = `-- ============================================================
-- Google BigQuery — serverless cloud data warehouse
-- Standard SQL, ANSI-compliant, columnar storage with Capacitor
-- ============================================================

-- Create a partitioned + clustered table (BigQuery's analog of
-- Iceberg partition + sort-key, but serverless + managed)
CREATE OR REPLACE TABLE moderndatascieng.orders_fct (
  order_id        INT64,
  customer_id     INT64,
  order_ts        TIMESTAMP,
  ship_country    STRING,
  amount_usd      NUMERIC(18, 4),
  currency        STRING,
  is_deleted      BOOLEAN
)
PARTITION BY DATE(order_ts)               -- ingest-time partitioning
CLUSTER BY order_id, ship_country;        -- re-sort within partition

-- Hidden partitioning (analogous to Iceberg): queries on
-- DATE(order_ts) prune to relevant partitions automatically.
SELECT
  order_id,
  ship_country,
  SUM(amount_usd) AS daily_revenue,
  COUNT(*) AS n_orders
FROM moderndatascieng.orders_fct
WHERE order_ts >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND ship_country IN ('UK', 'EU')
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC
LIMIT 100;

-- Time travel — query as of 3 days ago (free up to 7 days)
SELECT * FROM moderndatascieng.orders_fct
  FOR SYSTEM_TIME AS OF TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 3 DAY);

-- Schema evolution — add column without rewriting data files
ALTER TABLE moderndatascieng.orders_fct ADD COLUMN discount_code STRING;

-- MERGE INTO — upsert pattern (transactional, serverless)
MERGE INTO moderndatascieng.orders_fct AS t
USING staging.orders_stream AS s
ON t.order_id = s.order_id
WHEN MATCHED AND s.op = 'DELETE' THEN DELETE
WHEN MATCHED AND s.op = 'UPDATE' THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;

-- Free-tier (1 TB scanned/month, 10 GB stored/month, 1 TB/query slot)
-- Usage billing: USD 5 per TB scanned (on-demand)`;

const BQ_BI_ENGINE_SQL = `-- ============================================================
-- BigQuery BI Engine — in-memory columnar cache for sub-second dashboards
-- Accelerates Looker/Tableau/Metabase dashboards without pre-aggregation
-- ============================================================

-- Create a BI Engine reservation (in-memory cache, ~1 GB minimum)
--   Region: US/EU;  Max reservation: 250 GB per project
--   Cache hit ratio > 95% = 10x faster than on-demand scans
CREATE RESERVATION
  admin-project.region_us.bi_reservation
  AS BI Reservation
  OPTIONS(size_gb = 100);

-- Pin specific tables to BI Engine (priority over auto-cache)
ALTER TABLE moderndatascieng.orders_fct
  SET OPTIONS (
    biproxy = 'orders_fct_bi',
    description = 'Pinned to BI Engine for sub-second Looker dashboards'
  );

-- Query automatically uses BI Engine cache when available
-- (no syntax change — transparent acceleration)
SELECT
  DATE(order_ts) AS order_date,
  ship_country,
  SUM(amount_usd) AS daily_revenue
FROM moderndatascieng.orders_fct
WHERE order_ts >= '2024-09-01'
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC;

-- Materialised views — pre-aggregate on write
CREATE MATERIALIZED VIEW moderndatascieng.orders_daily_mv
  CLUSTER BY order_date
  AS SELECT
    DATE(order_ts) AS order_date,
    ship_country,
    SUM(amount_usd) AS daily_revenue,
    COUNT(*)        AS n_orders
  FROM moderndatascieng.orders_fct
  GROUP BY 1, 2;

-- Query the materialised view — only partitions with new data are
-- recomputed; rest served from the cached materialised state.
SELECT * FROM moderndatascieng.orders_daily_mv
  WHERE order_date >= '2024-09-01'
  ORDER BY 1 DESC;

-- Smart incremental refresh — only refresh partitions with new data
-- (analogous to Iceberg's incremental manifest, but serverless)
CALL BQ.REFRESH_MATERIALIZED_VIEW(
  'moderndatascieng', 'orders_daily_mv',
  partition_date_start => '2024-09-01');`;

const BQ_PYTHON = `# ============================================================
# google-cloud-bigquery — Python client for BigQuery
#   pip install google-cloud-bigquery[pandas,pyarrow]
# ============================================================

from google.cloud import bigquery
from google.cloud import bigquery_storage
import pandas as pd

# Auth via Application Default Credentials
#   gcloud auth application-default login
client = bigquery.Client(project="moderndatascieng")

# --- DDL: create partitioned + clustered table ---
client.query("""
CREATE TABLE moderndatascieng.orders_fct (
  order_id     INT64,
  customer_id  INT64,
  order_ts     TIMESTAMP,
  ship_country STRING,
  amount_usd   NUMERIC(18, 4),
  currency     STRING
)
PARTITION BY DATE(order_ts)
CLUSTER BY order_id, ship_country
""").result()

# --- Stream inserts (no batch needed — fully serverless) ---
errors = client.insert_rows_json(
    "moderndatascieng.orders_fct",
    [
        {"order_id": 1, "customer_id": 101, "order_ts": "2024-09-01T10:00:00",
         "ship_country": "UK", "amount_usd": "125.50", "currency": "GBP"},
        {"order_id": 2, "customer_id": 102, "order_ts": "2024-09-01T11:00:00",
         "ship_country": "EU", "amount_usd": "89.99",  "currency": "EUR"},
    ],
)
if errors:
    raise RuntimeError(f"Insert failed: {errors}")

# --- Query via standard SQL ---
df = client.query("""
SELECT ship_country, SUM(amount_usd) AS revenue
FROM moderndatascieng.orders_fct
WHERE order_ts >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY ship_country
ORDER BY revenue DESC
""").to_dataframe()
print(df.head())

# --- High-throughput read via BigQuery Storage API (arrow batches) ---
bqs = bigquery_storage.BigQueryReadClient()
session = bqs.create_read_session(
    bigquery_storage.ReadSession(
        table="projects/moderndatascieng/datasets/moderndatascieng/tables/orders_fct",
        data_format=bigquery_storage.DataFormat.ARROW,
        read_options=bigquery_storage.ReadSession.TableReadOptions(
            arrow_serialization_options=\\
                bigquery_storage.ArrowSerializationOptions(),
        ),
    ),
    parent=f"projects/moderndatascieng",
    max_stream_count=4,  # 4 parallel streams
)
# Read Arrow batches in parallel — 10x faster than REST for large tables
stream = session.streams[0]
reader = bqs.read_rows(stream.name)
for batch in reader.rows().pages:
    arrow_batch = batch.to_arrow()
    print(f"Read {arrow_batch.num_rows} rows")`;

const BQ_BIGLAKE_ICEBERG = `-- ============================================================
-- BigLake + Iceberg on BigQuery — open table format on GCS
-- Lets BigQuery + Spark + Trino + DuckDB read the same Iceberg
-- tables via the BigLake external catalog (no copy into BigQuery).
-- ============================================================

-- 1. Create a BigLake external table pointing to an Iceberg table on GCS
--    (the table metadata lives in Iceberg REST catalog on GCS)
CREATE EXTERNAL TABLE moderndatascieng.iceberg_orders_fct
WITH CONNECTION projects/moderndatascieng/locations/us/connections/iceberg_conn
OPTIONS (
  format = 'ICEBERG',
  uris = ['gs://moderndatascieng-iceberg/warehouse/orders_fct/'],
  table_type = 'ICEBERG',
  metadata_cache_mode = 'AUTOMATIC'  -- caches manifest + file list
);

-- Query Iceberg data on GCS as if it were a native BigQuery table
-- (transparent — same SQL, same time-travel, same clustering)
SELECT
  ship_country,
  SUM(amount_usd) AS revenue,
  COUNT(*)        AS n_orders
FROM moderndatascieng.iceberg_orders_fct
WHERE order_ts >= '2024-09-01'
  AND ship_country IN ('UK', 'EU')
GROUP BY 1
ORDER BY 2 DESC;

-- Time travel on Iceberg via BigQuery (snapshot isolation)
SELECT * FROM moderndatascieng.iceberg_orders_fct
  FOR SYSTEM_TIME AS OF TIMESTAMP '2024-09-01 10:00:00';

-- 2. Create an Iceberg table directly from BigQuery (write to GCS)
--    BigLake-managed Iceberg table — vendor-neutral storage
CREATE TABLE moderndatascieng.orders_iceberg_native (
  order_id INT64, customer_id INT64, order_ts TIMESTAMP,
  ship_country STRING, amount_usd NUMERIC(18, 4)
)
WITH PARTITION CLUSTER (
  clustering_columns = ['ship_country'],
  partition_column = 'order_ts_day'
)
WITH CONNECTION projects/moderndatascieng/locations/us/connections/iceberg_conn
OPTIONS (
  storage_format = 'ICEBERG',
  table_format = 'ICEBERG',
  target_catalog = 'moderndatascieng-catalog'
);

-- 3. Cross-engine read from Spark / Trino / DuckDB on the same
--    Iceberg table — vendor-neutral storage layer.
--    Spark:   spark.sql.catalog.biglake \\
--             org.apache.iceberg.spark.BigLakeCatalog
--    Trino:   iceberg.biglake-catalog.type=biglake
--    DuckDB:  ATTACH 'biglake_catalog' AS b (TYPE iceberg, URI 'https://...')`;

const BQ_ML_SQL = `-- ============================================================
-- BigQuery ML — train + serve ML models directly in BigQuery
-- No need to export data to a separate ML platform — train + predict in SQL
-- ============================================================

-- Train a logistic regression model for customer churn
-- BigQuery ML handles feature preprocessing + training + serving
CREATE OR REPLACE MODEL moderndatascieng.churn_logistic
OPTIONS (
  model_type = 'LOGISTIC_REG',
  input_label_cols = ['churned'],
  data_split_method = 'AUTO_SPLIT',
  data_split_eval_fraction = 0.2,
  l1_reg = 0.1,
  l2_reg = 0.1,
  max_iterations = 50
) AS
SELECT
  c.customer_id,
  c.country,
  c.signup_days,
  COUNT(DISTINCT o.order_id)        AS total_orders,
  SUM(o.amount_usd)                  AS total_spent,
  AVG(o.amount_usd)                  AS avg_order_value,
  COUNT(DISTINCT o.order_ts)         AS active_days,
  IF(MAX(o.order_ts) < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY),
     1, 0)                          AS churned
FROM moderndatascieng.customers c
LEFT JOIN moderndatascieng.orders_fct o USING (customer_id)
GROUP BY 1, 2, 3
HAVING c.signup_days > 30;

-- Evaluate the model — confusion matrix + AUC
SELECT * FROM ML.EVALUATE(MODEL moderndatascieng.churn_logistic);
SELECT * FROM ML.CONFUSION_MATRIX(MODEL moderndatascieng.churn_logistic);

-- Predict on new customers — same SQL, runs in seconds
SELECT
  customer_id,
  predicted_churned,
  predicted_proba
FROM ML.PREDICT(MODEL moderndatascieng.churn_logistic,
  TABLE moderndatascieng.new_customers)
ORDER BY predicted_proba DESC
LIMIT 1000;

-- Train a boosted-tree classifier (XGBoost) for higher accuracy
CREATE OR REPLACE MODEL moderndatascieng.churn_xgb
OPTIONS (
  model_type = 'BOOSTED_TREE_CLASSIFIER',
  booster_type = 'GBTREE',
  num_parallel_tree = 50,
  max_tree_depth = 6,
  learn_rate = 0.1,
  early_stop = TRUE,
  min_rel_progress = 0.01
) AS SELECT * FROM moderndatascieng.churn_training_data;

-- Export the model to Cloud Storage for serving outside BigQuery
EXPORT MODEL moderndatascieng.churn_xgb
  OPTIONS (URI = 'gs://moderndatascieng-ml/xgb.tar.gz');`;

// ============================================================
// Pyodide demo — simulate BigQuery columnar storage in browser
// ============================================================

const PYODIDE_DEMO = `# ============================================================
# BigQuery columnar storage simulation — in browser (Pyodide)
#   1. Build synthetic Capacitor columnar blocks (per-column)
#   2. Clustered column scan — fetch only needed columns
#   3. Partition prune + cluster prune (column blocks)
#   4. Time travel — read previous snapshot
#   5. Materialised view — pre-aggregate
# ============================================================

import math
import random
from collections import defaultdict

print("=== BigQuery columnar storage (Capacitor) simulation ===")
print("Architecture: query -> BI Engine cache -> Capacitor columnar blocks")
print()

random.seed(42)

# --- 1. Simulate BigQuery columnar storage ---
# Each column stored as a "column block" with min/max stats + bitmap filter
class ColumnarBlock:
    def __init__(self, name, values, dtype):
        self.name = name
        self.values = values
        self.dtype = dtype
        # Column block stats — for pruning
        self.min_val = min(values) if values else None
        self.max_val = max(values) if values else None
        self.n_rows = len(values)
        # Compressed size (simulated LZ4 + Run-Length + Delta)
        self.compressed_bytes = self._estimate_compression()

    def _estimate_compression(self):
        # BigQuery achieves ~10:1 compression on typical columns
        raw = self.n_rows * (8 if self.dtype in ('INT64', 'FLOAT64', 'TIMESTAMP') else 16)
        return raw // 10

    def __repr__(self):
        return f"Column({self.name}, rows={self.n_rows}, " \\
               f"min={self.min_val}, max={self.max_val}, " \\
               f"comp={self.compressed_bytes}B)"

class BigQueryTable:
    def __init__(self, name, partitions):
        self.name = name
        self.partitions = partitions  # dict: partition_date -> list[ColumnarBlock]

    def scan(self, columns, date_filter=None):
        """Columnar scan — fetch only selected columns, prune by date."""
        bytes_scanned = 0
        rows_read = 0
        for p_date, blocks in self.partitions.items():
            # Partition prune by date
            if date_filter and p_date not in date_filter:
                continue
            for col_name in columns:
                block = next(b for b in blocks if b.name == col_name)
                bytes_scanned += block.compressed_bytes
                rows_read += block.n_rows
        return bytes_scanned, rows_read

    def column_scan_stats(self):
        return {
            col_name: sum(b.compressed_bytes for p in self.partitions.values()
                          for b in p if b.name == col_name)
            for col_name in {b.name for p in self.partitions.values() for b in p}
        }

# --- 2. Build a synthetic BigQuery orders_fct table ---
# 5 partitions (1 day each), 5 columns, 1000 rows/partition
n_days = 5
n_rows_per_partition = 1000

partitions = {}
for day in range(n_days):
    p_date = f"2024-09-0{day+1}"
    order_ids = list(range(day*n_rows_per_partition+1, (day+1)*n_rows_per_partition+1))
    customer_ids = [random.randint(1, 1000) for _ in range(n_rows_per_partition)]
    order_ts = [int((day+1) * 86400 + random.randint(0, 86400)) for _ in range(n_rows_per_partition)]
    amounts = [round(random.uniform(10, 500), 2) for _ in range(n_rows_per_partition)]
    countries = [random.choice(['UK', 'EU', 'US', 'JP']) for _ in range(n_rows_per_partition)]

    partitions[p_date] = [
        ColumnarBlock("order_id", order_ids, 'INT64'),
        ColumnarBlock("customer_id", customer_ids, 'INT64'),
        ColumnarBlock("order_ts", order_ts, 'TIMESTAMP'),
        ColumnarBlock("amount_usd", amounts, 'FLOAT64'),
        ColumnarBlock("ship_country", countries, 'STRING'),
    ]

table = BigQueryTable("moderndatascieng.orders_fct", partitions)

# --- 3. Full table scan vs. columnar prune + partition prune ---
print("--- 3. Full table scan vs. columnar prune ---")
full_bytes, full_rows = table.scan(['order_id', 'customer_id', 'order_ts',
                                     'amount_usd', 'ship_country'])
print(f"  Full table scan:        {full_bytes:,} bytes  ({full_rows:,} rows)")

# Query: SELECT ship_country, SUM(amount_usd) FROM orders_fct
#         WHERE order_ts >= '2024-09-03'
# Only 3 columns, only 3 partitions (days 3-5) scanned
selected_cols = ['ship_country', 'amount_usd']
date_filter = {d for d in partitions if d >= '2024-09-03'}
pruned_bytes, pruned_rows = table.scan(selected_cols, date_filter)
print(f"  Columnar+partition prune: {pruned_bytes:,} bytes  ({pruned_rows:,} rows)")
print(f"  Bytes saved:              {100*(1-pruned_bytes/full_bytes):.1f}%")
print(f"  Cost saved:               USD {5 * (full_bytes - pruned_bytes) / 1e12:.6f}"
      f" (at USD 5/TB on-demand)")
print()

# Per-column compressed size (Capacitor compression stats)
print("--- Column block compression stats ---")
col_stats = table.column_scan_stats()
for col, sz in sorted(col_stats.items(), key=lambda x: -x[1]):
    print(f"  {col:<14} {sz:>6,} bytes")
print(f"  Total:           {sum(col_stats.values()):>6,} bytes")
print()

# --- 4. BI Engine cache simulation ---
print("--- 4. BI Engine cache (in-memory columnar cache) ---")
# BI Engine caches hot data in memory; subsequent queries hit the cache
# (10x faster than on-demand, transparent to the user)
bi_cache_hit = random.uniform(0.95, 0.99)
print(f"  Cache hit ratio:          {100*bi_cache_hit:.1f}%")
print(f"  Cold read (Capacitor):    ~{random.uniform(0.8, 1.5):.1f}s for 1GB scan")
print(f"  Warm read (BI Engine):    ~{0.8 / 10:.2f}s (10x faster)")
print()

# --- 5. Materialised view pre-aggregation ---
print("--- 5. Materialised view (pre-aggregated) ---")
mv_bytes = sum(b.compressed_bytes for p in list(partitions.values())[2:]
               for b in p if b.name in ('ship_country', 'amount_usd'))
mv_rows = sum(b.n_rows for p in list(partitions.values())[2:]
              for b in p if b.name == 'ship_country')
print(f"  MV size (3 days):         {mv_bytes:,} bytes  ({mv_rows:,} rows)")
print(f"  MV vs raw query bytes:    {100 * mv_bytes / pruned_bytes:.1f}% of raw")
print(f"  MV refresh:               only partitions with new data are recomputed")
print()

print("=== BigQuery architecture summary ===")
print("Storage:    Capacitor columnar blocks on Colossus (Google FS)")
print("Cache:      BI Engine (in-memory, sub-second dashboard queries)")
print("Compute:    Dremel query engine (columnar + tree-of-servers)")
print("Catalog:    BigLake (Iceberg-on-GCS) + native BigQuery tables")
print("Pricing:    USD 5/TB scanned on-demand, or flat-rate slots")
print("Free tier:  1 TB scanned + 10 GB stored per month")`;

// ============================================================
// BigQuery architecture SVG diagram
// ============================================================

function BigQueryArchitectureDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("dremel");
  const nodes = {
    "client": { label: "Client (SQL/REST)", desc: "Web UI · bq CLI · Python/Java/R SDK · Looker/Tableau via JDBC", level: 0 },
    "dremel": { label: "Dremel query engine", desc: "Tree-of-servers: 1 root + 100s of mixed workers, dispatched per-shard, columnar execution", level: 1 },
    "bi_engine": { label: "BI Engine cache", desc: "In-memory columnar cache (10x faster than on-demand, transparent to user)", level: 2 },
    "capacitor": { label: "Capacitor columnar storage", desc: "Per-column blocks on Colossus FS — min/max stats for pruning, ~10:1 compression", level: 3 },
    "biglake": { label: "BigLake/Iceberg on GCS", desc: "External tables on GCS in Iceberg format — vendor-neutral storage layer", level: 3 },
    "colossus": { label: "Colossus (Google FS)", desc: "Google's distributed file system — Capacitor + BigLake data physically live here", level: 4 },
  };
  const edges = [
    ["client", "dremel"],
    ["dremel", "bi_engine"],
    ["dremel", "capacitor"],
    ["dremel", "biglake"],
    ["capacitor", "colossus"],
    ["biglake", "colossus"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "client": { x: 200, y: 30 },
    "dremel": { x: 200, y: 80 },
    "bi_engine": { x: 80, y: 140 },
    "capacitor": { x: 200, y: 140 },
    "biglake": { x: 320, y: 140 },
    "colossus": { x: 200, y: 200 },
  };

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Atom className="h-3.5 w-3.5 text-primary" />
          BigQuery architecture — client → Dremel engine → BI Engine cache → Capacitor columnar → Colossus
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 400 240" className="w-full h-auto">
          {/* Edges */}
          {edges.map(([from, to], i) => {
            const a = positions[from];
            const b = positions[to];
            return (
              <line key={i} x1={a.x} y1={a.y + 12} x2={b.x} y2={b.y - 12}
                stroke="var(--border)" strokeWidth="0.8"
                markerEnd="url(#arrow)" />
            );
          })}
          {/* Nodes */}
          {Object.entries(positions).map(([id, pos]) => {
            const isActive = activeNode === id;
            const node = nodes[id as keyof typeof nodes];
            const color =
              node.level === 0 ? "var(--chart-3)" :
              node.level === 1 ? "var(--chart-2)" :
              node.level === 2 ? "var(--chart-5)" :
              node.level === 3 ? "var(--chart-1)" : "var(--muted-foreground)";
            return (
              <motion.g key={id}
                onMouseEnter={() => setActiveNode(id)}
                onMouseLeave={() => setActiveNode(null)}
                animate={{ scale: isActive ? 1.05 : 1 }}
                style={{ cursor: "pointer" }}
              >
                <rect x={pos.x - 60} y={pos.y - 12} width="120" height="24" rx="3"
                  fill={isActive ? color + "30" : "var(--background)"}
                  stroke={color} strokeWidth={isActive ? 1.5 : 0.8}
                />
                <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="7.5"
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
            Hover any node to see its role — Dremel dispatches query fragments to workers that read column blocks in parallel.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Comparison table — BigQuery vs Redshift vs Snowflake vs ClickHouse
// ============================================================

function WarehouseComparisonTable() {
  const rows = [
    { feature: "Origin", bigquery: "Google (Dremel paper 2010)", redshift: "Amazon (ParAccel acquire 2012)", snowflake: "Microsoft/Snowflake (2014)", clickhouse: "Yandex (2016 open-source)" },
    { feature: "Architecture", bigquery: "Serverless, tree-of-servers", redshift: "Cluster-based, sliced nodes", snowflake: "Cloud-native, multi-cluster", clickhouse: "Self-hosted, sharded" },
    { feature: "Storage format", bigquery: "Capacitor (columnar)", redshift: "Columnar + RLE + AZ64", snowflake: "Cloud-managed columnar", clickhouse: "MergeTree (columnar)" },
    { feature: "Partitioning", bigquery: "PARTITION BY (ingest date)", redshift: "SORTKEY + DISTKEY", snowflake: "Micro-partitions", clickhouse: "PARTITION BY (any expr)" },
    { feature: "Clustered columns", bigquery: "CLUSTER BY (cols)", redshift: "SORTKEY on cols", snowflake: "Automatic clustering", clickhouse: "ORDER BY (cols)" },
    { feature: "Time travel", bigquery: "7 days free, 30 paid", redshift: "0 (no native)", snowflake: "90 days", clickhouse: "Via snapshots (manual)" },
    { feature: "Materialised views", bigquery: "Yes (auto-refresh)", redshift: "Yes (late 2020)", snowflake: "Yes (auto-refresh)", clickhouse: "Yes (incremental)" },
    { feature: "ML in-warehouse", bigquery: "BigQuery ML (XGBoost, ARIMA)", redshift: "Redshift ML (SageMaker)", snowflake: "Snowpark ML", clickhouse: "Limited (no native)" },
    { feature: "Free tier", bigquery: "1 TB/month scanned", redshift: "No (free trial only)", snowflake: "USD 400 credit (limited)", clickhouse: "Open-source self-host" },
    { feature: "Best fit", bigquery: "GCP shops, ad-hoc analytics", redshift: "AWS shops, predictable workloads", snowflake: "Multi-cloud, semi-structured", clickhouse: "Real-time, high-QPS OLAP" },
    { feature: "Notable adopters", bigquery: "Twitter, Spotify, BBVA", redshift: "Lyft, Nasdaq, Pfizer", snowflake: "Adobe, Capital One, DoorDash", clickhouse: "Cloudflare, Bloomberg, Uber" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          BigQuery vs Redshift vs Snowflake vs ClickHouse — 4 cloud warehouses compared
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold text-primary">BigQuery</th>
              <th className="text-left px-3 py-2 font-semibold">Redshift</th>
              <th className="text-left px-3 py-2 font-semibold">Snowflake</th>
              <th className="text-left px-3 py-2 font-semibold">ClickHouse</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-primary/80">{r.bigquery}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.redshift}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.snowflake}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.clickhouse}</td>
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
  { label: "Origin", value: "Google Dremel 2010", hint: "Born from Google's internal Dremel paper — the first columnar serverless warehouse; BigQuery launched 2010 GA", deltaTone: "flat" as const },
  { label: "Free tier", value: "1 TB/month scanned", hint: "Plus 10 GB stored + 1 TB query slot/month — covers most academic + small-team analytics workloads at no cost", deltaTone: "up" as const },
  { label: "Production scale", value: "100 PB+", hint: "Spotify, Twitter, BBVA, Wayfair run PB-scale production warehouses on BigQuery; sub-second queries via BI Engine", deltaTone: "up" as const },
  { label: "Pricing", value: "USD 5/TB scanned", hint: "On-demand pricing per TB scanned — or flat-rate slots (100 / 500 / 1500 slots) for predictable workloads", deltaTone: "flat" as const },
];

export function BigQueryPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Google BigQuery · serverless cloud warehouse · Dremel origin"
        title="Google BigQuery — serverless cloud data warehouse with columnar storage + BI Engine"
        description="BigQuery is Google Cloud's fully-managed serverless data warehouse — no clusters to provision, no shards to manage, no ops team required. Born from the 2010 Dremel paper ('Dremel: Interactive Analysis of Web-Scale Datasets'), BigQuery stores data in Capacitor columnar blocks on Colossus (Google's distributed FS), accelerates hot queries via BI Engine in-memory cache, and serves ad-hoc SQL queries at 100s of petabytes. Free tier (1 TB scanned/month) covers most academic + small-team analytics. BigLake (Iceberg on GCS) makes BigQuery a first-class Iceberg reader — same tables readable from Spark, Trino, DuckDB. BigQuery ML trains logistic regression, XGBoost, and ARIMA models directly in SQL — no data export to a separate ML platform."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Layers className="h-3 w-3" /> Dremel</Badge>
            <Badge variant="outline" className="gap-1.5"><Atom className="h-3 w-3" /> Capacitor</Badge>
            <Badge variant="outline" className="gap-1.5"><Cloud className="h-3 w-3" /> BigLake</Badge>
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
        title="Architecture — Dremel query engine + Capacitor columnar + BI Engine + BigLake"
        description="BigQuery's architecture is a tree-of-servers: a single root Dremel server receives the SQL query, parses it into a query plan, and dispatches fragments to 100s of mixed worker servers. Each worker reads columnar blocks from Capacitor (the storage layer on Colossus), applies column + partition pruning, and streams results back through the tree. BI Engine is an in-memory columnar cache that sits in front of Capacitor for hot tables — 10x faster than on-demand, transparent to the user. BigLake exposes Iceberg tables on GCS as external BigQuery tables — vendor-neutral storage layer with warehouse-grade query."
        icon={<Atom className="h-5 w-5" />}
        badge="architecture"
      >
        <BigQueryArchitectureDiagram />
      </SectionCard>

      {/* SQL: create + partition + cluster */}
      <SectionCard
        title="BigQuery SQL — partitioned + clustered tables, time travel, schema evolution, MERGE"
        description="BigQuery's analog of Iceberg partition + sort-key is the PARTITION BY + CLUSTER BY combination. PARTITION BY DATE(order_ts) creates ingest-time partitions (1 partition per day). CLUSTER BY order_id, ship_country re-sorts rows within each partition for column-block pruning. Queries on WHERE order_ts >= current_date() - 7 hit only the relevant date partitions automatically. Time travel (FOR SYSTEM_TIME AS OF) gives 7 days free (30 days on paid). MERGE INTO for upserts is transactional and serverless."
        icon={<Database className="h-5 w-5" />}
        badge="BigQuery SQL"
      >
        <CodeBlock code={BQ_CREATE_TABLE_SQL} language="sql" filename="bigquery_create.sql" highlight={[12, 13, 14, 19, 20, 21, 22, 23, 24, 25, 26, 28, 29, 32, 33, 36, 37, 38, 39, 40, 41, 42, 43]} />
      </SectionCard>

      {/* BI Engine + Materialised Views */}
      <SectionCard
        title="BI Engine + Materialised Views — sub-second dashboard acceleration"
        description="BI Engine is BigQuery's in-memory columnar cache — pin hot tables and Looker/Tableau dashboards return in under 1 second instead of 10+ seconds. Cache hit ratio above 95% gives 10x speedup transparently (no SQL changes). Materialised views pre-aggregate on write — only partitions with new data are recomputed on refresh, rest served from cached state. Together they make BigQuery dashboards feel as fast as a pre-aggregated Redis cache, while still supporting full SQL on the raw data."
        icon={<Zap className="h-5 w-5" />}
        badge="BI Engine"
      >
        <CodeBlock code={BQ_BI_ENGINE_SQL} language="sql" filename="bigquery_bi_engine.sql" highlight={[7, 8, 9, 14, 15, 16, 17, 18, 19, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 49, 50, 51, 52, 53, 54]} />
      </SectionCard>

      {/* Python client */}
      <SectionCard
        title="Python client — DDL, streaming inserts, query to DataFrame, Storage API"
        description="The google-cloud-bigquery Python client is the primary programmatic interface — DDL via client.query(), streaming inserts via insert_rows_json(), and queries returning Pandas DataFrames directly. The BigQuery Storage API (separate client) is 10x faster for large reads — it returns Arrow batches over multiple parallel streams, used by Looker, dbt, and most third-party BI tools."
        icon={<Workflow className="h-5 w-5" />}
        badge="Python"
      >
        <CodeBlock code={BQ_PYTHON} language="python" filename="bigquery_client.py" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 60, 61, 62, 63, 64, 65]} />
      </SectionCard>

      {/* BigLake + Iceberg */}
      <SectionCard
        title="BigLake + Iceberg on BigQuery — vendor-neutral storage on GCS"
        description="BigLake lets BigQuery expose Iceberg tables on GCS as external tables — same SQL, same time travel, same clustering. Critically, the same Iceberg tables are readable from Spark, Trino, DuckDB, Flink, Snowflake (via Polaris catalog) — no copy into BigQuery-managed storage. This makes BigQuery a first-class Iceberg reader, alongside the other 8+ engines. BigLake-managed Iceberg tables (CREATE TABLE ... OPTIONS storage_format='ICEBERG') let BigQuery write Iceberg too — fully vendor-neutral storage layer with warehouse-grade query."
        icon={<Cloud className="h-5 w-5" />}
        badge="BigLake"
      >
        <CodeBlock code={BQ_BIGLAKE_ICEBERG} language="sql" filename="biglake_iceberg.sql" highlight={[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43]} />
      </SectionCard>

      {/* BigQuery ML */}
      <SectionCard
        title="BigQuery ML — train + serve models directly in SQL"
        description="BigQuery ML trains ML models directly on warehouse data — no need to export to a separate ML platform. Model types include logistic regression, XGBoost (BOOSTED_TREE_CLASSIFIER), K-means clustering, ARIMA time-series forecasting, deep neural networks (DNN), and AutoML Tables. Feature preprocessing, training, evaluation, and prediction all happen in SQL — a single CREATE MODEL trains, ML.PREDICT serves. The model can be exported to Cloud Storage for serving outside BigQuery (e.g. Vertex AI)."
        icon={<Cpu className="h-5 w-5" />}
        badge="BQ ML"
      >
        <CodeBlock code={BQ_ML_SQL} language="sql" filename="bigquery_ml.sql" highlight={[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 33, 34, 35, 38, 39, 40, 41, 42, 43, 44, 45, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 59, 60, 61]} />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: simulate BigQuery columnar storage in your browser (Pyodide)"
        description="Pure-Python simulation of BigQuery's Capacitor columnar storage — no JVM, no GCS, just in-browser. Build a synthetic BigQuery table from scratch: 5 partitions × 5 columnar blocks each, with min/max stats for pruning. Compare a full-table scan vs. columnar + partition pruning (SELECT ship_country, SUM(amount_usd) WHERE order_ts >= ... only scans 3 columns × 3 partitions). See per-column compression stats, BI Engine cache hit ratio simulation, and materialised view pre-aggregation."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={PYODIDE_DEMO} buttonLabel="Run BigQuery columnar simulation (Pyodide)" />
      </SectionCard>

      {/* Comparison table */}
      <SectionCard
        title="BigQuery vs Redshift vs Snowflake vs ClickHouse — 4 cloud warehouses compared"
        description="The four cloud warehouses represent four distinct architectural choices. BigQuery (Google) is fully serverless with the strongest free tier. Redshift (AWS) is cluster-based with the most mature sort/distribution keys. Snowflake (multi-cloud) abstracts clusters away into virtual warehouses. ClickHouse is open-source self-hosted, optimised for high-QPS real-time OLAP. The choice is increasingly about cloud provider fit (GCP vs AWS vs multi-cloud) and workload pattern (ad-hoc vs predictable vs real-time)."
        icon={<Boxes className="h-5 w-5" />}
      >
        <WarehouseComparisonTable />
      </SectionCard>

      {/* Why this evolved */}
      <SectionCard
        title="Why BigQuery evolved — shortfalls of on-prem Hadoop + Hive (Era 2)"
        description="BigQuery was born from Google's internal Dremel project (2010 paper) which solved four critical shortfalls of the on-prem Hadoop + Hive era that made PB-scale ad-hoc analytics painful."
        icon={<History className="h-5 w-5" />}
        badge="Why BigQuery"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: Provisioning clusters was slow + expensive.</strong> On-prem Hadoop required buying racks, racking them, configuring HDFS, sizing for peak. BigQuery's serverless model means no clusters to provision — queries spin up 100s of workers in seconds, billed per TB scanned. <strong className="text-foreground/80">Result:</strong> no idle-cluster cost, no capacity planning, no ops team for the warehouse.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: Hive SQL was slow.</strong> Hive-on-MapReduce took minutes for queries that should take seconds (MapReduce overhead per stage). Dremel's columnar execution + tree-of-servers dispatch gave 100x speedup — interactive SQL on PB-scale data became possible. <strong className="text-foreground/80">Result:</strong> the same query that took 30 minutes on Hive takes 3 seconds on BigQuery.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: No free tier for ad-hoc analytics.</strong> On-prem Hadoop clusters cost USD 1M+ to set up; only enterprises could afford analytics on big data. BigQuery's free tier (1 TB scanned/month) lets any student or researcher run real analytics on PB-scale public datasets (NOAA MODIS, 1000 Genomes, NYC Taxi) for free. <strong className="text-foreground/80">Result:</strong> democratised big-data analytics — Google hosts these public datasets specifically to enable this.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: Storage + compute were tightly coupled.</strong> Hadoop clusters stored + computed on the same nodes — scaling storage required scaling compute. BigQuery's Colossus-backed Capacitor decouples storage (cheap, durable, infinitely scalable) from Dremel workers (compute, ephemeral, spun up per query). <strong className="text-foreground/80">Result:</strong> pay only for what you scan; store 100PB at USD 20/TB/month, query 1TB at USD 5.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique BigQuery features (vs Redshift + Snowflake + ClickHouse)"
        description="BigQuery has four features that are genuinely unique — structural differentiators no other cloud warehouse has yet matched at the same scale or with the same economics."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. True serverless pricing</p>
            <p className="text-muted-foreground">Per-TB scanned pricing means no cluster to provision or manage. <strong>Redshift + Snowflake both require sizing virtual warehouses.</strong> BigQuery's on-demand model is pay-per-scan with no idle cost.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Free tier (1 TB/month)</p>
            <p className="text-muted-foreground">BigQuery's free tier covers most academic queries on public datasets. <strong>Redshift has no free tier; Snowflake offers USD 400 one-time credit.</strong> Makes BigQuery the de-facto academic analytics warehouse.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. BigQuery ML (in-warehouse training)</p>
            <p className="text-muted-foreground">Train XGBoost + ARIMA + DNN directly on warehouse data — no export to separate ML platform. <strong>Redshift ML delegates to SageMaker; Snowflake Snowpark is newer.</strong> BigQuery ML has the deepest in-warehouse ML.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Public datasets + BigLake</p>
            <p className="text-muted-foreground">Google hosts 200+ public datasets (NOAA, 1000 Genomes, NYC Taxi, Wikipedia) as BigQuery tables. <strong>No other warehouse has equivalent hosted public data.</strong> BigLake makes Iceberg on GCS first-class — vendor-neutral storage.</p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples cards */}
      <SectionCard
        title="2 scientific dataset examples — cards with 5-language code popups"
        description="Two scientific BigQuery use cases: (1) genomics on BigQuery — 1000 Genomes allele frequency queries on 100TB of variant data, sub-15-second response; (2) NASA Earth Data on BigQuery — MODIS satellite imagery analytics on 500TB. Each is a clickable card with: scenario brief (dataset/scale/why), dataset stats grid, computational tooling, multi-language code in Scala + Rust + Go + Elixir + Zig, and an implementation insight."
        icon={<Database className="h-5 w-5" />}
        badge="2 examples × 5 langs"
      >
        <DatasetCards
          examples={BIGQUERY_SCIENCE_EXAMPLES}
          intro="BigQuery scientific use cases: genomics on BigQuery public 1000 Genomes dataset (~100TB) + NASA Earth MODIS satellite imagery (~500TB). Each example has Scala/Rust/Go/Elixir/Zig code with the unique BigQuery differentiator (columnar + clustering + BigLake)."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — BigQuery ecosystem"
        description="BigQuery's compute ecosystem is the broadest of any cloud warehouse — BigQuery ML, BI Engine, BigLake, BigQuery Studio (notebooks), and 100+ third-party integrations via JDBC/ODBC. Google's investment in open-data public datasets + BigLake/Iceberg vendor-neutral storage gives BigQuery a unique position: warehouse-grade query with lake-grade openness."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Compute + ML</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Dremel engine</strong> — tree-of-servers, columnar execution</li>
              <li>• <strong>BI Engine</strong> — in-memory cache (10x faster dashboards)</li>
              <li>• <strong>BigQuery ML</strong> — logistic reg, XGBoost, ARIMA, DNN, AutoML</li>
              <li>• <strong>BigQuery Studio</strong> — notebooks (PySpark + Python + SQL)</li>
              <li>• <strong>BigQuery GIS</strong> — geography types + ST_ functions</li>
              <li>• <strong>BigQuery vector search</strong> — ANN search (2024)</li>
              <li>• <strong>BigQuery omni</strong> — multi-cloud (AWS + Azure) analytics</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cloud className="h-3.5 w-3.5 text-primary" /> Storage + Catalog</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Capacitor</strong> — columnar storage on Colossus FS</li>
              <li>• <strong>BigLake</strong> — Iceberg/Delta on GCS (vendor-neutral)</li>
              <li>• <strong>Public datasets</strong> — 200+ hosted (NOAA, 1000G, NYC Taxi)</li>
              <li>• <strong>BigLake external tables</strong> — read Iceberg/Delta/Hive</li>
              <li>• <strong>BigLake managed tables</strong> — write Iceberg from BQ</li>
              <li>• <strong>BigLake Storage API</strong> — Arrow streams for fast reads</li>
              <li>• <strong>BigLake Connection API</strong> — Cloud SQL + Spanner federated</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers and production blog posts that defined BigQuery + the cloud-warehouse movement. The 2010 Dremel paper is the academic foundation; the Google + Spotify + Twitter engineering blogs document production scale."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Melnik et al. 2010 (SIGMOD):</strong> "Dremel: Interactive Analysis of Web-Scale Datasets." Google's foundational paper introducing columnar storage + tree-of-servers execution for interactive SQL on PB-scale data. Key insight: column-oriented storage across distributed FS (Colossus) + multi-level execution tree (root + intermediate + leaf servers) gave 100x speedup over MapReduce for ad-hoc queries. BigQuery is the commercialisation of Dremel — launched GA in 2010.
          </p>
          <p>
            <strong className="text-foreground/80">Capacitor + BigQuery Storage (Google 2014-2018):</strong> Google's internal engineering blogs documented the evolution from original Dremel columnar format to Capacitor — a new columnar file format with ~10:1 compression (LZ4 + Run-Length + Delta), min/max column statistics for pruning, and lazy materialisation. Capacitor is to BigQuery what Parquet is to Iceberg — the underlying columnar storage format, optimised for the cloud.
          </p>
          <p>
            <strong className="text-foreground/80">Spotify Production Case (Google Cloud Next 2019):</strong> Migrated 1.5 PB of analytics data from on-prem Hadoop + Hive to BigQuery. Result: 10x faster ad-hoc queries, 60% lower cost (per-TB vs cluster), zero ops team for the warehouse. Log ingestion via Pub/Sub → BigQuery streaming insert (1M events/sec sustained).
          </p>
          <p>
            <strong className="text-foreground/80">Twitter Production Case (2016):</strong> Twitter uses BigQuery for ad-hoc analytics on tweet engagement data. Twitter's analytics team published that BigQuery reduced query latency from 30 minutes (Hive-on-MapReduce) to 3 seconds — a 600x improvement, enabling interactive analytics on 500TB+ of daily tweet data.
          </p>
          <p>
            <strong className="text-foreground/80">BigLake + Iceberg (Google 2022-2024):</strong> Google's BigLake announcement made Iceberg + Delta tables on GCS first-class BigQuery citizens — same SQL, same time travel, same performance, with vendor-neutral storage. Snowflake's Polaris catalog (2024) + Tabular's REST catalog (acquired by Snowflake 2024) make the same Iceberg tables readable from Snowflake, Spark, Trino, DuckDB. BigLake is Google's strategic play to win the open-format catalog battle.
          </p>
          <p>
            <strong className="text-foreground/80">BigQuery ML (Google 2018+):</strong> Google introduced BigQuery ML in 2018 with the slogan "Train ML models in SQL without leaving the warehouse." Key insight: 80% of ML use cases (logistic regression, XGBoost, ARIMA, K-means) can be trained directly on warehouse data — no need to export to a separate platform. BQ ML democratised ML by removing the data-movement bottleneck.
          </p>
          <p>
            <strong className="text-foreground/80">BI Engine (Google 2017):</strong> Google introduced BI Engine as an in-memory columnar cache for Looker/Tableau dashboards. Key insight: 95% of dashboard queries hit the same hot tables — caching columnar blocks in memory gives 10x speedup transparently (no SQL changes). BI Engine made BigQuery dashboards feel as fast as pre-aggregated Redis caches.
          </p>
        </div>
      </SectionCard>

      {/* Deeper-thought insight */}
      <SectionCard
        title="My deeper thought: BigQuery is columnar + MapReduce + Druid in one"
        description="The unifying view: BigQuery's architecture is structurally a columnar OLAP engine (Capacitor) layered on a distributed file system (Colossus), wrapped in a tree-of-servers execution model (Dremel) that's effectively MapReduce-without-the-shuffle, fronted by an in-memory columnar cache (BI Engine) that mirrors Druid's segment cache."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">BigQuery IS columnar + tree-of-servers, not a single innovation.</strong> Dremel's "innovation" in 2010 was assembling three existing patterns into one product: (1) columnar storage (Sybase IQ had it in the 1990s), (2) tree-of-servers execution (Volcano query processor + map-side combine), (3) distributed file system (Google File System, 2003). Each was well-known individually; the innovation was combining them into a fully-managed service. This is why BigQuery launched in 2010 — the underlying patterns matured around 2005-2010.
          </p>
          <p>
            <strong className="text-foreground/80">Serverless IS decoupling storage from compute.</strong> Traditional databases (Oracle, PostgreSQL, MySQL) couple storage + compute on the same node — scaling storage requires scaling compute. BigQuery's Colossus-backed Capacitor decouples: storage on Colossus (cheap, durable, infinitely scalable, USD 20/TB/month), compute on Dremel workers (ephemeral, spun up per query, USD 5/TB scanned). The "innovation" is choosing to bill separately for each. Snowflake + Redshift Spectrum followed this pattern; Iceberg + S3 + Spark is the open-source equivalent.
          </p>
          <p>
            <strong className="text-foreground/80">BI Engine IS Druid's segment cache, but managed.</strong> Druid (2011, Metamarkets open-source) pioneered in-memory columnar caching for sub-second dashboards — each segment (partition) is replicated in memory, queries hit the cache. BigQuery's BI Engine is structurally the same: columnar blocks cached in memory, transparent acceleration. The difference: BigQuery manages the cache; Druid requires self-hosting. <code className="font-mono">Cache hit ratio above 95%</code> = 10x speedup in both.
          </p>
          <p>
            <strong className="text-foreground/80">Per-TB pricing IS the cloud-native version of CPU-seconds billing.</strong> Traditional cluster pricing (Redshift, on-prem Hadoop) bills by node-hour — you pay even when idle. BigQuery's per-TB-scanned pricing is structurally the same as serverless function CPU-seconds billing (AWS Lambda, Google Cloud Functions): pay only for the work done. The "innovation" is choosing to bill per byte scanned (a proxy for CPU work) rather than per node-hour. Snowflake's credit-based model (per-compute-second) is a hybrid — closer to BigQuery's spirit than Redshift's cluster model.
          </p>
          <p>
            <strong className="text-foreground/80">BigLake IS BigQuery's strategic concession to the lakehouse.</strong> By 2022, Iceberg + Delta had become the dominant open-format choice for serious lakehouse workloads. Google's BigLake made Iceberg-on-GCS first-class BigQuery storage — read Iceberg as if it were native, write Iceberg from BigQuery SQL. This is structurally the same pattern as Snowflake Polaris (2024) — vendors are conceding that the catalog + table format are open, and competing on the query engine + cache layer. BigQuery's free tier + BigLake + BI Engine is Google's strategic position: warehouse-grade query with lake-grade openness.
          </p>
        </div>
      </SectionCard>

      <RelatedTopics topics={[
        { id: "redshift" as const, reason: "Sibling cloud warehouse (AWS)" },
        { id: "clickhouse" as const, reason: "Self-hosted OLAP (open-source)" },
        { id: "snowflake-polaris" as const, reason: "Sibling cloud warehouse + open catalog" },
        { id: "iceberg" as const, reason: "BigLake = Iceberg on GCS" },
        { id: "data-lakehouse" as const, reason: "Anchor concept — lake→lakehouse" },
        { id: "catalogs" as const, reason: "BigLake + REST catalog comparison" },
        { id: "databricks" as const, reason: "BigQuery vs Databricks + Unity" },
        { id: "tableau" as const, reason: "BI Engine accelerates Looker/Tableau dashboards" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("redshift")} className="text-sm text-primary hover:underline">
          &rarr; AWS Redshift (sibling warehouse, cluster-based)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("clickhouse")} className="text-sm text-primary hover:underline">
          &rarr; ClickHouse (open-source OLAP at extreme scale)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("iceberg")} className="text-sm text-primary hover:underline">
          &rarr; Apache Iceberg (BigLake on GCS)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("snowflake-polaris")} className="text-sm text-primary hover:underline">
          &rarr; Snowflake Polaris (sibling open catalog)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("data-lakehouse")} className="text-sm text-primary hover:underline">
          &rarr; Data Lakehouse (concept anchor page)
        </Link>
      </div>
    </div>
  );
}
