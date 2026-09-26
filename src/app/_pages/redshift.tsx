"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { REDSHIFT_SCIENCE_EXAMPLES } from "../_components/_dataset_examples10";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Layers, Boxes, Database, Workflow, Zap, GitBranch, History, ShieldCheck,
  Atom, Activity, FileText, ExternalLink, Network, Sparkles, Cpu, TrendingUp,
  Server, Cloud, Code2, Microscope,
} from "lucide-react";

// ============================================================
// Code snippets
// ============================================================

const REDSHIFT_CREATE_SQL = `-- ============================================================
-- AWS Redshift — petabyte-scale cloud data warehouse
-- PostgreSQL-derived SQL, columnar storage, sort keys + dist keys
-- ============================================================

-- Create a table with sort key + distribution key
-- SORTKEY: orders by date for time-series prune
-- DISTKEY: order_id co-locates on the same compute slice
CREATE TABLE moderndatascieng.orders_fct (
  order_id        BIGINT       ENCODE az64,
  customer_id     BIGINT       ENCODE az64,
  order_ts        TIMESTAMP    ENCODE az64,
  ship_country    VARCHAR(2)   ENCODE lzo,
  amount_usd      DECIMAL(18,4) ENCODE az64,
  currency        VARCHAR(3)   ENCODE lzo,
  is_deleted      BOOLEAN
)
-- Compound sort key: best for queries with prefix filters
SORTKEY (order_ts, customer_id)
DISTKEY (order_id)
DISTSTYLE KEY;

-- Distribution styles: KEY (co-locate) | ALL (every node) | EVEN (round-robin) | AUTO
-- Sort key types: COMPOUND (prefix) | INTERLEAVED (any combo) | NONE

-- Sort-key range prune — scans only 2024 rows
SELECT
  ship_country,
  SUM(amount_usd) AS daily_revenue,
  COUNT(*)        AS n_orders
FROM moderndatascieng.orders_fct
WHERE order_ts >= '2024-09-01'
  AND ship_country IN ('UK', 'EU')
GROUP BY ship_country
ORDER BY daily_revenue DESC
LIMIT 100;

-- Schema evolution — add column (online, no rewrite)
ALTER TABLE moderndatascieng.orders_fct ADD COLUMN discount_code VARCHAR(10);

-- COPY from S3 — bulk load with manifest
COPY moderndatascieng.orders_fct
FROM 's3://moderndatascieng-ingest/orders/manifest.json'
IAM_ROLE 'arn:aws:iam::123456789012:role/redshift-s3'
MANIFEST FORMAT JSON AVRO
GZIP;

-- UNLOAD to S3 — parallel export
UNLOAD ('SELECT * FROM moderndatascieng.orders_fct WHERE order_ts >= current_date')
TO 's3://moderndatascieng-export/orders/'
IAM_ROLE 'arn:aws:iam::123456789012:role/redshift-s3'
PARQUET PARTITION BY (order_date);

-- VACUUM — sort the table on disk (only after large DELETE/UPDATE)
VACUUM REINDEX moderndatascieng.orders_fct;
VACUUM RECLUSTER moderndatascieng.orders_fct;`;

const REDSHIFT_SPECTRUM_SQL = `-- ============================================================
-- Redshift Spectrum — query external data on S3 directly
-- No need to load into Redshift — query Parquet/Iceberg/CSV in place
-- ============================================================

-- 1. Create external schema (Glue Data Catalog as catalog)
CREATE EXTERNAL SCHEMA noaa_s3
FROM DATA CATALOG DATABASE 'noaa_gso'
IAM_ROLE 'arn:aws:iam::123456789012:role/redshift-spectrum'
CREATE EXTERNAL DATABASE IF NOT EXISTS;

-- 2. Create external table on S3 (Parquet)
CREATE EXTERNAL TABLE noaa_s3.gsod (
  station_id   VARCHAR(12),
  weather_date DATE,
  temp_max_f   DOUBLE PRECISION,
  temp_min_f   DOUBLE PRECISION,
  temp_avg_f   DOUBLE PRECISION,
  prcp_in      DOUBLE PRECISION,
  wind_knots   DOUBLE PRECISION
)
ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'
STORED AS PARQUET
LOCATION 's3://noaa-gsod-bucket/parquet/'
TABLE PROPERTIES ('numRows'='4000000000', 'orc.schema.resolution'='position');

-- 3. Federated query — join Redshift-local + S3-external
SELECT
  DATE_TRUNC('year', g.weather_date) AS year,
  g.station_id,
  AVG(g.temp_avg_f) AS avg_temp,
  s.country
FROM noaa_s3.gsod g
JOIN moderndatascieng.dim_stations s ON g.station_id = s.station_id  -- local table
WHERE g.weather_date BETWEEN '1990-01-01' AND '2024-12-31'
GROUP BY 1, 2, s.country
ORDER BY 1 DESC, 4 DESC;

-- 4. Iceberg external table via Spectrum (2022+)
CREATE EXTERNAL TABLE iceberg.orders_fct
STORED AS ICEBERG
LOCATION 's3://moderndatascieng-iceberg/warehouse/orders_fct/'
TABLE PROPERTIES ('format'='iceberg');

-- Iceberg time travel through Redshift Spectrum
SELECT * FROM iceberg.orders_fct FOR SYSTEM_VERSION_AS_OF 1234567890;`;

const REDSHIFT_SERVERLESS_SQL = `-- ============================================================
-- Redshift Serverless — usage-based pricing, no cluster to manage
-- Pay-per-RPU-hour (Redshift Processing Unit), scales to zero
-- ============================================================

-- Create a Redshift Serverless workgroup (AWS CLI)
--   aws redshift-serverless create-workgroup \\
--     --workgroup-name moderndatascieng-wg \\
--     --base-capacity 32 RPUs \\
--     --config-parameters file://parameters.json

-- Standard SQL — same as provisioned Redshift
-- No cluster endpoint to manage; just connect via JDBC URL
--   jdbc:redshift://moderndatascieng-wg.<acct>.us-east-1.redshift-serverless.amazonaws.com:5439/moderndatascieng

-- Usage-based billing — pay for RPUs consumed per second
--   Base: 32 RPUs (minimum), max: 512 RPUs (auto-scale)
--   Cost: USD 0.36 per RPU-hour (us-east-1, 2024 pricing)

-- Pause + resume — scale to zero during quiet hours
--   aws redshift-serverless pause-workgroup \\
--     --workgroup-name moderndatascieng-wg
--   (restart on next query — first query takes ~30s warm-up)

-- Snapshot schedules — automated backups
--   aws redshift-serverless create-snapshot-schedule \\
--     --snapshot-schedule-name hourly-snap \\
--     --definitions 'Cron(0 * ? * * *)'

-- Cross-namespace queries (data sharing)
--   GRANT USAGE ON NAMESPACE analytics_readonly TO NAMESPACE bi_namespace
--   CREATE DATASHARE sciencedatashare;
--   ALTER DATASHARE sciencedatashare ADD ALL TABLES IN SCHEMA public;
--   GRANT USAGE ON DATASHARE sciencedatashare TO NAMESPACE bi_namespace;

-- Query the datashare from another namespace
--   SELECT * FROM bi_namespace.public.orders_fct LIMIT 10;

-- Workload isolation — separate workgroups for ETL vs BI
--   ETL workgroup: 32-128 RPUs (auto-scale on ingest)
--   BI workgroup: 8-32 RPUs (low-latency dashboards)`;

const REDSHIFT_PYTHON = `# ============================================================
# redshift_connector — Python client for AWS Redshift
#   pip install redshift-connector[pandas]
# ============================================================

import redshift_connector
import pandas as pd

# Connect via IAM role (no password) or password
conn = redshift_connector.connect(
    iam=True,                       # IAM auth
    host="moderndatascieng.cluster-cxabc.us-east-1.redshift.amazonaws.com",
    port=5439,
    database="moderndatascieng",
    db_user="analytics_user",
    user="awsuser",
    password=None,
    cluster_identifier="moderndatascieng",
    profile="dev",                 # AWS profile
    region="us-east-1",
)

# --- Bulk COPY from S3 (via IAM role) ---
with conn.cursor() as cur:
    cur.execute("""
    COPY moderndatascieng.orders_fct
    FROM 's3://moderndatascieng-ingest/orders/2024-09-01/'
    IAM_ROLE 'arn:aws:iam::123456789012:role/redshift-s3'
    FORMAT AS PARQUET
    """)
    conn.commit()

# --- Streaming reads (Arrow batches) — 10x faster than REST ---
with conn.cursor() as cur:
    cur.execute("""
    SELECT ship_country, SUM(amount_usd) AS revenue
    FROM moderndatascieng.orders_fct
    WHERE order_ts >= '2024-09-01'
    GROUP BY ship_country
    ORDER BY revenue DESC
    """)
    # Redshift returns Arrow batches directly (no row-by-row)
    while True:
        batch = cur.fetch_arrow_table()
        if batch is None or batch.num_rows == 0:
            break
        df = batch.to_pandas()
        print(df.head())

# --- Run stored procedure (REDSHIFT ML via SageMaker) ---
with conn.cursor() as cur:
    cur.execute("""
    CREATE MODEL moderndatascieng.churn_xgb
    FROM (SELECT * FROM moderndatascieng.churn_training)
    FUNCTION predict_churn
    IAM_ROLE 'arn:aws:iam::123456789012:role/redshift-ml'
    TARGET churned
    SETTINGS (
      SAGEMAKER_FUNCTION_NAME 'xgboost_classifier',
      MAX_RUNTIME 3600
    );
    """)
    # Wait for training to complete
    cur.execute("SHOW MODEL moderndatascieng.churn_xgb")
    status = cur.fetchone()
    print(f"Model status: {status}")`;

const REDSHIFT_AQUA_RA3 = `-- ============================================================
-- RA3 nodes + AQUA — modern Redshift architecture (2020+)
-- RA3 = managed storage (S3-backed) + local SSD cache + NVMe local
-- AQUA = Advanced Query Accelerator (cache + compute offload)
-- ============================================================

-- RA3 nodes: storage decoupled from compute (like BigQuery/Snowflake)
--   ra3.xlplus = 4 vCPU, 32 GB RAM, 32 GB local SSD cache, USD 3.34/hr
--   ra3.4xl    = 12 vCPU, 96 GB RAM, 128 GB local SSD cache, USD 10.08/hr
--   ra3.16xl   = 48 vCPU, 384 GB RAM, 512 GB local SSD cache, USD 40.32/hr
-- Managed storage: USD 0.024/GB-month (S3-backed, durable)

-- Migrate from DS2 (compute+storage coupled) to RA3 (decoupled)
--   aws redshift modify-cluster \\
--     --cluster-identifier moderndatascieng \\
--     --node-type ra3.4xl \\
--     --number-of-nodes 4

-- AQUA (Advanced Query Accelerator) — cache + compute offload
--   AQUA runs compute on cached column blocks BEFORE shipping to workers
--   10x faster for short-range scans + scalar functions
--   Auto-enabled on RA3 nodes (no SQL changes)
ALTER CLUSTER moderndatascieng SET AQUA = TRUE;

-- Query plan — AQUA acceleration visible in EXPLAIN
EXPLAIN
SELECT
  ship_country,
  SUM(amount_usd) AS revenue
FROM moderndatascieng.orders_fct
WHERE order_ts >= '2024-09-01'
GROUP BY ship_country;

-- Query plan with AQUA shows:
-- XN Seq Scan on orders_fct  (cost=0.00..1234.56 rows=100000)
--   Filter: ((order_ts)::timestamp >= '2024-09-01'::date)
--   AQUA Cache: HIT  -- cached in AQUA, no S3 read
--   AQUA Compute: SUM(amount_usd) computed on cached block
-- XN HashAggregate  (cost=1234.56..1567.89 rows=100 width=64)
--   Group Key: ship_country

-- Concurrency scaling — auto-add clusters during peak
--   Free credits accumulate during quiet periods; consumed during peak
--   Effectively gives unlimited concurrency (within budget)
ALTER CLUSTER moderndatascieng SETConcurrencyScaling = TRUE;

-- Short query acceleration (SQA) — short queries skip the queue
--   Queries under 2 seconds are auto-prioritised
SET query_group TO 'short_queries';
SELECT * FROM moderndatascieng.orders_fct WHERE order_id = 12345;`;

// ============================================================
// Pyodide demo — Redshift sort + distribution simulation
// ============================================================

const PYODIDE_DEMO = `# ============================================================
# Redshift SORTKEY + DISTKEY simulation — in browser (Pyodide)
#   1. Simulate compute slices (each holds a partition of rows)
#   2. DISTKEY co-locate by key (e.g. by station_id)
#   3. SORTKEY range prune (e.g. by weather_date)
#   4. Compare: full table scan vs. dist+sort prune
#   5. Compound vs. interleaved sort key behavior
# ============================================================

import math
import random
from collections import defaultdict

print("=== Redshift SORTKEY + DISTKEY simulation ===")
print("Architecture: cluster of N slices, each holds a partition of rows")
print()

random.seed(42)

# --- 1. Simulate Redshift cluster of 4 slices ---
N_SLICES = 4
print(f"Cluster: 4 compute slices (RA3.4xl, 12 vCPU each)")
print()

# --- 2. Simulate a table with DISTKEY + SORTKEY ---
# DISTKEY = station_id (co-locate per-station records)
# SORTKEY = weather_date (range prune for time filters)

class RedshiftTable:
    def __init__(self, name, distkey, sortkey, n_rows=10000):
        self.name = name
        self.distkey = distkey
        self.sortkey = sortkey
        self.n_rows = n_rows
        # Each slice holds a dict of distkey_value -> list of rows
        # rows within a distkey are sorted by sortkey
        self.slices = [defaultdict(list) for _ in range(N_SLICES)]
        self.col_sizes = {'INT64': 8, 'FLOAT64': 8, 'VARCHAR': 16,
                          'TIMESTAMP': 8, 'DATE': 4}
        self.az64_compression = 4  # ~4x compression

    def _slice_idx(self, key_value):
        return hash(key_value) % N_SLICES

    def insert(self, row):
        slice_idx = self._slice_idx(row[self.distkey])
        self.slices[slice_idx][row[self.distkey]].append(row)

    def finalize(self):
        # Within each distkey, sort by sortkey (compound sort key)
        for slice in self.slices:
            for key in slice:
                slice[key].sort(key=lambda r: r[self.sortkey])

    def scan(self, columns, distkey_filter=None, sortkey_range=None):
        """Scan with optional dist + sort prune.
        distkey_filter: only scan slices that contain the key (if provided)
        sortkey_range: only scan rows where sortkey is in range
        """
        bytes_scanned = 0
        rows_read = 0
        for slice_idx, slice in enumerate(self.slices):
            # DISTKEY prune — if filter is set, only scan slices that hold it
            if distkey_filter:
                target_slice = self._slice_idx(distkey_filter)
                if slice_idx != target_slice:
                    continue
            for distkey_val, rows in slice.items():
                if distkey_filter and distkey_val != distkey_filter:
                    continue
                # SORTKEY range prune within each distkey
                if sortkey_range:
                    low, high = sortkey_range
                    # Binary search for range bounds (sorted by sortkey)
                    rows = [r for r in rows if low <= r[self.sortkey] <= high]
                for r in rows:
                    # Columnar read — only fetch requested columns
                    for col in columns:
                        bytes_scanned += self.col_sizes.get(
                            'INT64' if isinstance(r.get(col), int) else 'FLOAT64', 8)
                    rows_read += 1
        # Apply AZ64 compression
        bytes_scanned //= self.az64_compression
        return bytes_scanned, rows_read

# --- 3. Populate with synthetic weather data ---
table = RedshiftTable("weather_gsod", "station_id", "weather_date", 10000)
n_stations = 50
stations = [f"USW{i:06d}" for i in range(n_stations)]
# Generate 1 year of daily records per station (scaled to 5 days)
for day_idx in range(5):
    day = 1693526400 + day_idx * 86400  # Sept 1, 2024
    for station in stations:
        for hour in range(24):
            row = {
                "station_id": station,
                "weather_date": day,
                "temp_max_f": round(random.gauss(60, 15), 1),
                "temp_avg_f": round(random.gauss(50, 12), 1),
                "prcp_in": round(random.uniform(0, 1), 2),
                "wind_knots": round(random.uniform(0, 30), 1),
            }
            table.insert(row)
table.finalize()

print(f"Table: {table.name}")
print(f"  Total rows:        {sum(len(rows) for s in table.slices for rows in s.values()):,}")
print(f"  Columns:           6 (compressed via AZ64, ~4x)")
print(f"  DISTKEY:           station_id (co-locate per station)")
print(f"  SORTKEY:           weather_date (range prune)")
print(f"  Compression:       AZ64 (~4x reduction)")
print()

# --- 4. Distribution of stations across slices ---
print("--- Distribution: stations per slice ---")
for i, slice in enumerate(table.slices):
    n_stations_on_slice = len(slice)
    n_rows_on_slice = sum(len(rows) for rows in slice.values())
    print(f"  Slice {i}: {n_stations_on_slice} stations, {n_rows_on_slice:,} rows")
print()

# --- 5. Query scenarios ---
print("--- Query scenarios (columnar + compression applied) ---")

# Query A: Full table scan — all columns
ba, ra = table.scan(['station_id', 'weather_date', 'temp_max_f',
                     'temp_avg_f', 'prcp_in', 'wind_knots'])
print(f"A. Full scan:                       {ba:>8,} bytes ({ra:,} rows)")

# Query B: Columnar prune — only fetch 2 columns
bb, rb = table.scan(['temp_max_f', 'temp_avg_f'])
print(f"B. Columnar prune (2 cols):         {bb:>8,} bytes ({rb:,} rows)  "
      f"- {100*(1-bb/ba):.0f}% saved")

# Query C: DISTKEY prune — single station
target_station = stations[0]
bc, rc = table.scan(['station_id', 'weather_date', 'temp_max_f',
                     'temp_avg_f'], distkey_filter=target_station)
print(f"C. DISTKEY prune (1 station):       {bc:>8,} bytes ({rc:,} rows)  "
      f"- {100*(1-bc/ba):.0f}% saved")

# Query D: SORTKEY prune — only 2-day range
bd, rd = table.scan(['station_id', 'weather_date', 'temp_max_f', 'temp_avg_f'],
                     sortkey_range=(1693612800, 1693785600))
print(f"D. SORTKEY prune (2-day range):      {bd:>8,} bytes ({rd:,} rows)  "
      f"- {100*(1-bd/ba):.0f}% saved")

# Query E: Both DISTKEY + SORTKEY prune
be, re = table.scan(['temp_max_f', 'temp_avg_f'],
                     distkey_filter=target_station,
                     sortkey_range=(1693612800, 1693785600))
print(f"E. DISTKEY+SORTKEY+col prune:       {be:>8,} bytes ({re:,} rows)  "
      f"- {100*(1-be/ba):.0f}% saved")
print()

# --- 6. Compound vs. interleaved sort key behavior ---
print("--- Compound vs. interleaved SORTKEY ---")
print("Compound: optimal for prefix queries (e.g. WHERE order_ts = X AND customer_id = Y)")
print("  - Rows sorted lexicographically: first by order_ts, then by customer_id")
print("  - Best when queries always filter on the leading column")
print()
print("Interleaved: optimal for queries on any combination of columns")
print("  - Rows sorted in a way that all sort columns have similar selectivity")
print("  - Slower to maintain (rebuild on bulk load)")
print("  - Best for ad-hoc queries with varying WHERE combinations")
print()

print("=== Redshift architecture summary ===")
print("Architecture:  cluster of N slices (RA3 = managed storage + SSD cache)")
print("Distribution:  DISTKEY co-locates per-key rows on one slice")
print("Sort key:       SORTKEY enables range prune within slice")
print("Compression:   AZ64 (~4x) + LZO for low-cardinality")
print("AQUA:           Advanced Query Accelerator (cache + compute offload)")
print("Spectrum:       query external S3 data (Parquet/Iceberg) directly")
print("Serverless:     pay-per-RPU-hour, scales to zero")`;

// ============================================================
// Redshift architecture SVG diagram
// ============================================================

function RedshiftArchitectureDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("leader");
  const nodes = {
    "client": { label: "Client (JDBC/ODBC)", desc: "psql · Python (redshift-connector) · Java · .NET · Looker · Tableau · dbt", level: 0 },
    "leader": { label: "Leader node", desc: "Receives SQL, parses + plans, dispatches to compute slices, gathers results", level: 1 },
    "slice_1": { label: "Compute slice 1", desc: "Holds DISTKEY-A partition + SORTKEY-sorted rows + local SSD cache (RA3)", level: 2 },
    "slice_2": { label: "Compute slice 2", desc: "Holds DISTKEY-B partition + SORTKEY-sorted rows + local SSD cache (RA3)", level: 2 },
    "slice_3": { label: "Compute slice 3", desc: "Holds DISTKEY-C partition + SORTKEY-sorted rows + local SSD cache (RA3)", level: 2 },
    "aqua": { label: "AQUA cache", desc: "Advanced Query Accelerator — in-line cache + compute offload on hot blocks (RA3)", level: 3 },
    "s3": { label: "S3 (managed storage)", desc: "RA3 decoupled storage — durable, infinitely scalable, USD 0.024/GB-month", level: 4 },
    "spectrum": { label: "Spectrum (external S3)", desc: "Query Iceberg/Parquet on S3 directly — no need to load into Redshift", level: 4 },
  };
  const edges = [
    ["client", "leader"],
    ["leader", "slice_1"],
    ["leader", "slice_2"],
    ["leader", "slice_3"],
    ["slice_1", "aqua"],
    ["slice_2", "aqua"],
    ["slice_3", "aqua"],
    ["slice_1", "s3"],
    ["slice_2", "s3"],
    ["slice_3", "s3"],
    ["leader", "spectrum"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "client": { x: 200, y: 30 },
    "leader": { x: 200, y: 75 },
    "slice_1": { x: 80, y: 125 },
    "slice_2": { x: 200, y: 125 },
    "slice_3": { x: 320, y: 125 },
    "aqua": { x: 200, y: 175 },
    "s3": { x: 120, y: 225 },
    "spectrum": { x: 280, y: 225 },
  };

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Atom className="h-3.5 w-3.5 text-primary" />
          Redshift architecture — leader → 3 compute slices (RA3) → AQUA cache + S3 managed storage + Spectrum
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 400 260" className="w-full h-auto">
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
              node.level === 2 ? "var(--chart-1)" :
              node.level === 3 ? "var(--chart-5)" : "var(--muted-foreground)";
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
            Hover any node to see its role — the leader dispatches to N slices, each holding a DISTKEY partition SORTKEY-sorted.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Comparison table — Redshift vs BigQuery vs Snowflake vs ClickHouse
// ============================================================

function WarehouseComparisonTable() {
  const rows = [
    { feature: "Origin", redshift: "Amazon (ParAccel 2012)", bigquery: "Google (Dremel 2010)", snowflake: "Microsoft/Snowflake (2014)", clickhouse: "Yandex (2016 open-source)" },
    { feature: "Architecture", redshift: "Cluster-based, sliced nodes", bigquery: "Serverless, tree-of-servers", snowflake: "Cloud-native, multi-cluster", clickhouse: "Self-hosted, sharded" },
    { feature: "Storage format", redshift: "Columnar + RLE + AZ64", bigquery: "Capacitor (columnar)", snowflake: "Cloud-managed columnar", clickhouse: "MergeTree (columnar)" },
    { feature: "Partitioning", redshift: "SORTKEY + DISTKEY", bigquery: "PARTITION BY (ingest date)", snowflake: "Micro-partitions", clickhouse: "PARTITION BY (any expr)" },
    { feature: "Clustered columns", redshift: "SORTKEY on cols", bigquery: "CLUSTER BY (cols)", snowflake: "Automatic clustering", clickhouse: "ORDER BY (cols)" },
    { feature: "Time travel", redshift: "0 (no native)", bigquery: "7 days free, 30 paid", snowflake: "90 days", clickhouse: "Via snapshots (manual)" },
    { feature: "Materialised views", redshift: "Yes (late 2020)", bigquery: "Yes (auto-refresh)", snowflake: "Yes (auto-refresh)", clickhouse: "Yes (incremental)" },
    { feature: "ML in-warehouse", redshift: "Redshift ML (SageMaker)", bigquery: "BigQuery ML (XGBoost, ARIMA)", snowflake: "Snowpark ML", clickhouse: "Limited (no native)" },
    { feature: "Free tier", redshift: "No (free trial only)", bigquery: "1 TB/month scanned", snowflake: "USD 400 credit (limited)", clickhouse: "Open-source self-host" },
    { feature: "Best fit", redshift: "AWS shops, predictable workloads", bigquery: "GCP shops, ad-hoc analytics", snowflake: "Multi-cloud, semi-structured", clickhouse: "Real-time, high-QPS OLAP" },
    { feature: "Notable adopters", redshift: "Lyft, Nasdaq, Pfizer", bigquery: "Twitter, Spotify, BBVA", snowflake: "Adobe, Capital One, DoorDash", clickhouse: "Cloudflare, Bloomberg, Uber" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          Redshift vs BigQuery vs Snowflake vs ClickHouse — 4 cloud warehouses compared
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold text-primary">Redshift</th>
              <th className="text-left px-3 py-2 font-semibold">BigQuery</th>
              <th className="text-left px-3 py-2 font-semibold">Snowflake</th>
              <th className="text-left px-3 py-2 font-semibold">ClickHouse</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-primary/80">{r.redshift}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.bigquery}</td>
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
  { label: "Origin", value: "Amazon ParAccel 2012", hint: "Acquired ParAccel (analytics database vendor) in 2012, rebranded as AWS Redshift — the first cloud-native data warehouse", deltaTone: "flat" as const },
  { label: "Production scale", value: "PB-scale", hint: "Lyft, Nasdaq, Pfizer run PB-scale production warehouses on Redshift; RA3 + AQUA + Spectrum give sub-second queries", deltaTone: "up" as const },
  { label: "Node types", value: "RA3 (managed storage)", hint: "ra3.xlplus / ra3.4xl / ra3.16xl — managed storage on S3 + local SSD cache, decoupled like BigQuery/Snowflake", deltaTone: "flat" as const },
  { label: "Distribution styles", value: "4 (KEY/ALL/EVEN/AUTO)", hint: "DISTKEY co-locates per-key rows on one slice — the textbook pattern for per-entity analytics (e.g. per-customer)", deltaTone: "flat" as const },
];

export function RedshiftPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="AWS Redshift · cluster-based cloud warehouse · ParAccel origin"
        title="AWS Redshift — petabyte-scale cloud warehouse with sort keys + distribution styles"
        description="Redshift is AWS's cloud data warehouse — born from Amazon's 2012 acquisition of ParAccel, it became the first widely-adopted cloud warehouse. Unlike BigQuery's serverless model, Redshift runs on provisioned clusters of compute slices — each slice holds a partition of rows based on the DISTKEY (distribution key), sorted by the SORTKEY (sort key) for range pruning. Modern Redshift (RA3 nodes, 2020+) decouples storage from compute via S3-backed managed storage + local SSD cache, mirroring BigQuery and Snowflake architecture. AQUA (Advanced Query Accelerator) caches hot column blocks and runs compute offload in-line. Redshift Spectrum queries external S3 data (Iceberg/Parquet) without loading. Redshift Serverless (2022) adds pay-per-RPU-hour billing for unpredictable workloads."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Layers className="h-3 w-3" /> RA3</Badge>
            <Badge variant="outline" className="gap-1.5"><Atom className="h-3 w-3" /> AQUA</Badge>
            <Badge variant="outline" className="gap-1.5"><Cloud className="h-3 w-3" /> Spectrum</Badge>
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
        title="Architecture — leader node + N compute slices + AQUA cache + S3 storage"
        description="Redshift's architecture is a leader-worker pattern: a single leader node receives the SQL, parses + plans, and dispatches query fragments to N compute slices (typical cluster 4-128 slices). Each slice holds a partition of rows based on the DISTKEY — rows with the same DISTKEY value co-locate on the same slice (no network shuffle for per-key analytics). SORTKEY sorts rows within each slice for range pruning. AQUA (Advanced Query Accelerator) caches hot column blocks in-line — queries hit AQUA before reaching S3. RA3 nodes use S3-backed managed storage decoupled from compute; local SSD cache absorbs hot reads. Redshift Spectrum exposes external S3 data (Iceberg/Parquet) as tables — query without loading."
        icon={<Atom className="h-5 w-5" />}
        badge="architecture"
      >
        <RedshiftArchitectureDiagram />
      </SectionCard>

      {/* SQL: create + sortkey + distkey */}
      <SectionCard
        title="Redshift SQL — sort keys, distribution styles, COPY, UNLOAD, VACUUM"
        description="Redshift's analog of Iceberg partition + sort-key is the SORTKEY + DISTKEY combination. SORTKEY (order_ts, customer_id) is a compound sort key — rows sorted lexicographically by order_ts first, then customer_id. Queries filtering on order_ts (the leading column) get optimal range pruning. DISTKEY (order_id) co-locates rows with the same order_id on the same compute slice — per-order analytics hit only one slice, no network shuffle. DISTSTYLE KEY is explicit; ALL copies the table to every slice (small dim tables); EVEN round-robins (default). AZ64 encoding (~4x compression) is the modern default; LZO remains for low-cardinality columns."
        icon={<Database className="h-5 w-5" />}
        badge="Redshift SQL"
      >
        <CodeBlock code={REDSHIFT_CREATE_SQL} language="sql" filename="redshift_create.sql" highlight={[7, 8, 9, 10, 15, 16, 17, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 36, 37, 38, 49, 50, 51, 52, 53, 54]} />
      </SectionCard>

      {/* Spectrum */}
      <SectionCard
        title="Redshift Spectrum — query external data on S3 directly (no load)"
        description="Redshift Spectrum lets Redshift query external S3 data directly — Iceberg, Parquet, ORC, CSV, JSON — without loading it into the warehouse. The external schema is registered via AWS Glue Data Catalog. Spectrum uses the same compute layer as Redshift queries, so a federated query joining local + S3-external tables runs in a single SQL. This is the canonical pattern for the modern lakehouse-on-Redshift: keep cold data on S3 (cheap, durable), query it via Spectrum, load hot data into Redshift native storage for sub-second latency."
        icon={<Cloud className="h-5 w-5" />}
        badge="Spectrum"
      >
        <CodeBlock code={REDSHIFT_SPECTRUM_SQL} language="sql" filename="redshift_spectrum.sql" highlight={[6, 7, 8, 9, 10, 11, 12, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 33, 34, 35, 36, 37, 38, 39, 41, 42]} />
      </SectionCard>

      {/* Serverless */}
      <SectionCard
        title="Redshift Serverless — pay-per-RPU-hour, no cluster to manage"
        description="Redshift Serverless (2022) is the serverless version of Redshift — no cluster to provision, pay-per-RPU-hour (Redshift Processing Unit), auto-scale based on workload. The minimum is 32 RPUs, maximum 512 RPUs (auto-scale). Scales to zero during quiet hours (first query takes ~30s warm-up on resume). Best for unpredictable workloads — dev/test, intermittent BI, ad-hoc analytics — where provisioning a 24/7 cluster is wasteful. Same SQL as provisioned Redshift; same Spectrum; same data sharing. Cross-namespace queries enable data sharing across Redshift Serverless namespaces without copying."
        icon={<Workflow className="h-5 w-5" />}
        badge="Serverless"
      >
        <CodeBlock code={REDSHIFT_SERVERLESS_SQL} language="sql" filename="redshift_serverless.sql" highlight={[4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 23, 24, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37]} />
      </SectionCard>

      {/* Python client */}
      <SectionCard
        title="Python client — redshift_connector + COPY + Arrow streaming"
        description="The redshift_connector Python package is the primary programmatic interface — supports IAM auth (no password), bulk COPY from S3 via IAM role, and Arrow-batch streaming reads (10x faster than REST). Redshift ML is invoked via CREATE MODEL which delegates training to SageMaker — same SQL surface as BigQuery ML but with SageMaker as the backend. The connection is via the standard PostgreSQL wire protocol, so most BI tools (Looker, Tableau, dbt) work out of the box."
        icon={<Workflow className="h-5 w-5" />}
        badge="Python"
      >
        <CodeBlock code={REDSHIFT_PYTHON} language="python" filename="redshift_client.py" highlight={[5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50]} />
      </SectionCard>

      {/* RA3 + AQUA */}
      <SectionCard
        title="RA3 nodes + AQUA — modern Redshift architecture (2020+)"
        description="RA3 nodes (2020) are the modern Redshift architecture — managed storage decoupled from compute, mirroring BigQuery and Snowflake. ra3.xlplus (4 vCPU), ra3.4xl (12 vCPU), ra3.16xl (48 vCPU) — local SSD cache absorbs hot reads, S3-backed managed storage holds the full dataset. AQUA (Advanced Query Accelerator, 2020) is a cache + compute offload layer that sits in-line between S3 and slices — caches hot column blocks and runs scalar functions on cached data before shipping to workers. Concurrency Scaling auto-adds clusters during peak (free credits accumulate during quiet periods). Short Query Acceleration (SQA) auto-prioritises sub-2-second queries — they skip the queue."
        icon={<Cpu className="h-5 w-5" />}
        badge="RA3 + AQUA"
      >
        <CodeBlock code={REDSHIFT_AQUA_RA3} language="sql" filename="redshift_aqua.sql" highlight={[4, 5, 6, 7, 8, 9, 10, 13, 14, 15, 16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 35, 36, 37, 38, 39, 40, 41]} />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: simulate Redshift sort + distribution in your browser (Pyodide)"
        description="Pure-Python simulation of Redshift's compute-slice architecture — no JVM, no S3, just in-browser. Build a synthetic Redshift table from scratch: 4 compute slices, DISTKEY (station_id) co-locates per-station records on one slice, SORTKEY (weather_date) sorts rows within each slice. Compare 5 query scenarios: full scan vs. columnar prune vs. DISTKEY prune vs. SORTKEY range prune vs. both prune + columnar. See compound vs. interleaved sort key behavior trade-off."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={PYODIDE_DEMO} buttonLabel="Run Redshift sort+dist simulation (Pyodide)" />
      </SectionCard>

      {/* Comparison table */}
      <SectionCard
        title="Redshift vs BigQuery vs Snowflake vs ClickHouse — 4 cloud warehouses compared"
        description="The four cloud warehouses represent four distinct architectural choices. Redshift (AWS) is cluster-based with the most mature sort/distribution keys. BigQuery (Google) is fully serverless with the strongest free tier. Snowflake (multi-cloud) abstracts clusters away into virtual warehouses. ClickHouse is open-source self-hosted, optimised for high-QPS real-time OLAP. The choice is increasingly about cloud provider fit (GCP vs AWS vs multi-cloud) and workload pattern (predictable vs ad-hoc vs real-time)."
        icon={<Boxes className="h-5 w-5" />}
      >
        <WarehouseComparisonTable />
      </SectionCard>

      {/* Why this evolved */}
      <SectionCard
        title="Why Redshift evolved — shortfalls of on-prem Vertica + Oracle (Era 2)"
        description="Redshift was born from Amazon's 2012 acquisition of ParAccel — ParAccel had built a columnar MPP database, and AWS saw the opportunity to deliver it as a managed cloud service. Redshift solved four critical shortfalls of the on-prem Vertica + Oracle era."
        icon={<History className="h-5 w-5" />}
        badge="Why Redshift"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: On-prem MPP databases were expensive + slow to scale.</strong> Vertica and Oracle Exadata cost USD 100K+ per node; scaling required buying + racking + re-balancing. Redshift launched at USD 1,000/TB/year — 10x cheaper than on-prem. <strong className="text-foreground/80">Result:</strong> democratised MPP columnar — any company could afford a PB-scale warehouse.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: Provisioning MPP clusters was ops-heavy.</strong> Vertica/Exadata required DBAs to size nodes, design projections (Vertica's storage structures), tune compression. Redshift made MPP feel like PostgreSQL — JDBC client, ANSI SQL, just provision a cluster and start querying. <strong className="text-foreground/80">Result:</strong> MPP without the DBA — Redshift became the default cloud warehouse from 2012-2018 (until Snowflake + BigQuery matured).
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: Storage + compute were tightly coupled.</strong> Vertica/Exadata (and original Redshift DS2 nodes) couple storage + compute on the same nodes — scaling storage requires scaling compute. RA3 nodes (2020) decoupled: S3-backed managed storage + local SSD cache, mirroring BigQuery/Snowflake. <strong className="text-foreground/80">Result:</strong> pay only for the compute you need, store PB at S3 prices.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: No native external S3 query.</strong> Vertica/Oracle required loading all data into the database — PB-scale cold data was expensive to keep hot. Redshift Spectrum (2017) let Redshift query S3 data (Parquet, ORC, Iceberg) directly without loading. <strong className="text-foreground/80">Result:</strong> the lakehouse pattern emerged — keep cold data on S3, query via Spectrum, load hot data into Redshift native storage for sub-second latency. The same pattern Iceberg + Athena + Snowflake later adopted.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique Redshift features (vs BigQuery + Snowflake + ClickHouse)"
        description="Redshift has four features that are genuinely unique — structural differentiators no other cloud warehouse has yet matched at the same maturity or with the same flexibility."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. SORTKEY + DISTKEY combo</p>
            <p className="text-muted-foreground">Most mature sort + distribution model — KEY/ALL/EVEN/AUTO distribution + compound/interleaved sort. <strong>BigQuery has CLUSTER BY only; Snowflake has automatic clustering.</strong> Redshift gives explicit control for predictable workloads.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. AQUA in-line cache + compute</p>
            <p className="text-muted-foreground">AQUA (Advanced Query Accelerator, 2020) caches hot column blocks AND runs scalar functions on cached data — 10x faster for scan-heavy queries. <strong>BigQuery BI Engine caches only; no in-line compute.</strong> AQUA is unique to Redshift.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Spectrum external S3 query (Iceberg)</p>
            <p className="text-muted-foreground">Redshift Spectrum is the most mature external-S3 query layer — Parquet, ORC, Iceberg (2022+), Hive, JSON. <strong>BigQuery BigLake is newer; Snowflake external tables are read-only.</strong> Spectrum federates across S3 + Redshift native.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Data sharing (cross-cluster)</p>
            <p className="text-muted-foreground">Redshift data sharing lets clusters read each other's tables without copying — same data, separate compute. <strong>BigQuery has dataset sharing; Snowflake has Secure Data Sharing.</strong> Redshift's cross-namespace sharing is most flexible.</p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples cards */}
      <SectionCard
        title="2 scientific dataset examples — cards with 5-language code popups"
        description="Two scientific Redshift use cases: (1) NOAA GSOD climate analytics on Redshift — 120 years of daily weather data with SORTKEY on date for time-series climate analytics; (2) genomics variant annotation on Redshift — 3B SNP annotations with DISTKEY on chromosome for per-chromosome variant queries. Each is a clickable card with: scenario brief (dataset/scale/why), dataset stats grid, computational tooling, multi-language code in Scala + Rust + Go + Elixir + Zig, and an implementation insight."
        icon={<Database className="h-5 w-5" />}
        badge="2 examples × 5 langs"
      >
        <DatasetCards
          examples={REDSHIFT_SCIENCE_EXAMPLES}
          intro="Redshift scientific use cases: NOAA GSOD climate analytics (sort key on weather_date) + genomics variant annotation (dist key on chromosome). Each example has Scala/Rust/Go/Elixir/Zig code with the unique Redshift differentiator (SORTKEY + DISTKEY + Spectrum)."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — Redshift ecosystem"
        description="Redshift's compute ecosystem is AWS-native — Redshift ML (SageMaker), Redshift Spectrum (S3 external), AWS Glue ETL, QuickSight BI, Lake Formation governance. The deep AWS integration makes Redshift the default choice for AWS-centric organisations."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Compute + ML</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Leader + slices</strong> — MPP columnar execution</li>
              <li>• <strong>AQUA</strong> — in-line cache + compute offload (RA3)</li>
              <li>• <strong>RA3 nodes</strong> — managed storage + local SSD cache</li>
              <li>• <strong>Concurrency Scaling</strong> — auto-add clusters at peak</li>
              <li>• <strong>Short Query Acceleration (SQA)</strong> — sub-2s queries skip queue</li>
              <li>• <strong>Redshift ML</strong> — train via SageMaker (CREATE MODEL)</li>
              <li>• <strong>Redshift Serverless</strong> — pay-per-RPU-hour</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cloud className="h-3.5 w-3.5 text-primary" /> Storage + Federation</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Columnar storage</strong> — AZ64 + LZO + RLE compression</li>
              <li>• <strong>S3 managed storage</strong> — RA3 decoupled, USD 0.024/GB-mo</li>
              <li>• <strong>Redshift Spectrum</strong> — query Iceberg/Parquet on S3</li>
              <li>• <strong>AWS Glue</strong> — catalog + ETL for Spectrum</li>
              <li>• <strong>Federated queries</strong> — JOIN RDS PostgreSQL + Aurora</li>
              <li>• <strong>Data sharing</strong> — cross-namespace without copy</li>
              <li>• <strong>Lake Formation</strong> — cell-level RLS + LF-tags governance</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers and production blog posts that defined Redshift + the cloud-warehouse movement. The 2012 ParAccel acquisition + 2014 AWS re:Invent announcements defined the era; Lyft + Nasdaq engineering blogs document production scale."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">ParAccel (2007-2012):</strong> ParAccel was an analytics database vendor founded 2007, building a columnar MPP database for on-prem. AWS acquired ParAccel in January 2012 specifically to enter the cloud warehouse market. The original ParAccel codebase became the foundation of Redshift — same columnar storage, MPP architecture, PostgreSQL wire protocol. The "innovation" was running ParAccel as a managed cloud service.
          </p>
          <p>
            <strong className="text-foreground/80">AWS Redshift Launch (re:Invent 2012):</strong> AWS announced Redshift at re:Invent November 2012, with GA in February 2013. Pricing at launch: USD 1,000/TB/year — 10x cheaper than on-prem Vertica/Exadata. The pitch was simple: "Same SQL as PostgreSQL, 10x cheaper, runs in the cloud." Redshift became the default cloud warehouse from 2013-2018.
          </p>
          <p>
            <strong className="text-foreground/80">Redshift Spectrum (re:Invent 2017):</strong> AWS introduced Redshift Spectrum — query external S3 data (Parquet, ORC) directly without loading into Redshift. Key insight: PB-scale cold data shouldn't be in expensive Redshift native storage; keep it on S3 (cheap, durable), query via Spectrum. This was the AWS version of the lakehouse pattern — same year Databricks introduced Delta Lake.
          </p>
          <p>
            <strong className="text-foreground/80">RA3 + AQUA (re:Invent 2020):</strong> AWS introduced RA3 nodes (managed storage decoupled from compute via S3-backed managed storage + local SSD cache) and AQUA (Advanced Query Accelerator — in-line cache + compute offload). The combination brought Redshift to architecture parity with BigQuery + Snowflake — same decoupled storage + in-memory cache, but with the AWS ecosystem integration (Glue, Lake Formation, S3).
          </p>
          <p>
            <strong className="text-foreground/80">Lyft Production Case (Lyft Eng Blog 2018):</strong> Lyft runs all analytics on Redshift — 2 PB+ of trip, driver, and rider data. SORTKEY on event_ts for time-series analytics; DISTKEY on driver_id for per-driver analytics. Concurrency Scaling handles peak (Friday nights). Result: sub-second queries on 2PB of trip data via sort + distribution prune.
          </p>
          <p>
            <strong className="text-foreground/80">Nasdaq Production Case (AWS re:Invent 2019):</strong> Nasdaq migrated historical market data analytics to Redshift — 10+ years of tick data, ~30 TB/year. SORTKEY on trade_date for time-series; DISTKEY on ticker_symbol for per-stock queries. Redshift Spectrum queries older data on S3 directly. Result: 50x faster historical market data queries than the previous Oracle Exadata system.
          </p>
          <p>
            <strong className="text-foreground/80">Redshift Serverless (re:Invent 2021 GA 2022):</strong> AWS introduced Redshift Serverless in preview at re:Invent 2021, GA in 2022. The pitch: "No cluster to manage, pay-per-RPU-hour, scales to zero." Key insight: not every Redshift workload needs a 24/7 cluster — dev/test + ad-hoc analytics benefit from pay-per-use. Same SQL as provisioned Redshift, same Spectrum, same data sharing.
          </p>
        </div>
      </SectionCard>

      {/* Deeper-thought insight */}
      <SectionCard
        title="My deeper thought: Redshift IS ParAccel + AWS managed service"
        description="The unifying view: Redshift's architecture is structurally a columnar MPP database (ParAccel) layered on a managed cloud service (AWS), wrapped in a cluster-of-slices execution model (Vertica/Exadata pattern), fronted by an in-line cache + compute layer (AQUA) that mirrors BigQuery BI Engine + Druid segment cache."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Redshift IS ParAccel + managed service, not a single innovation.</strong> The 2012 ParAccel acquisition gave AWS a mature columnar MPP database overnight. Redshift's "innovation" was running ParAccel as a managed cloud service — same columnar storage, same MPP architecture, same PostgreSQL protocol. The hard engineering was the managed-service layer (auto-backups, scaling, monitoring) — the database itself was already proven. This is why Redshift launched GA in 9 months (Feb 2013) — most of the database existed in ParAccel.
          </p>
          <p>
            <strong className="text-foreground/80">SORTKEY + DISTKEY IS explicit ParAccel projection.</strong> Vertica called them "projections" — the storage structure for sort + partition. ParAccel + Redshift call them SORTKEY + DISTKEY. They're the same concept: SORTKEY is the sort order within a partition (range prune), DISTKEY is the partition key (co-location). BigQuery's CLUSTER BY conflates both into one statement; Redshift keeps them separate for explicit control. The "innovation" is choosing to expose them to users — Vertica/ParAccel did, BigQuery/Snowflake automate them.
          </p>
          <p>
            <strong className="text-foreground/80">AQUA IS BigQuery BI Engine + Druid segment cache + extra compute.</strong> AQUA caches hot column blocks in memory (like BI Engine + Druid segment cache) AND runs scalar functions on cached data before shipping to workers — the "extra compute" is the unique part. BigQuery BI Engine caches only; Druid caches only; AQUA does both. The pattern is the same as a content delivery network (CDN) with edge compute — Cloudflare Workers + Lambda@Edge do the same for HTTP. AQUA is "CDN with edge compute" for SQL.
          </p>
          <p>
            <strong className="text-foreground/80">Redshift Spectrum IS Athena with a Redshift front.</strong> Athena is serverless Trino/Presto on S3 — same code path as Spectrum. The difference: Spectrum uses the Redshift compute layer (slices) for federated joins, while Athena spins up its own Trino workers. Structurally, both are "query Iceberg/Parquet on S3 without loading" — the same pattern as Trino + Iceberg + S3. The "innovation" is integration with the warehouse compute layer for federated joins across local + external data.
          </p>
          <p>
            <strong className="text-foreground/80">Redshift IS to Vertica/Exadata what BigQuery is to Dremel.</strong> Both took a proven on-prem MPP columnar database (Vertica/Exadata for Redshift, Dremel for BigQuery) and ran it as a managed cloud service. Redshift's "innovation" was the managed service wrapper; BigQuery's "innovation" was the serverless billing model. Snowflake took the same approach but built a new database from scratch (2012-2014) — cleaner architecture but lost the maturity of a proven codebase. The pattern is identical: take a columnar MPP, run it managed, add cloud-native features (AQUA, BI Engine, automatic clustering).
          </p>
        </div>
      </SectionCard>


      <DeeperThoughtSection pageTitle="AWS Redshift">
        <DeeperThought title="AWS Redshift IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about AWS Redshift is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. AWS Redshift connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where AWS Redshift sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (AWS Redshift) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
        { id: "bigquery" as const, reason: "Sibling cloud warehouse (Google)" },
        { id: "clickhouse" as const, reason: "Self-hosted OLAP (open-source)" },
        { id: "snowflake-polaris" as const, reason: "Sibling cloud warehouse + open catalog" },
        { id: "iceberg" as const, reason: "Redshift Spectrum reads Iceberg on S3" },
        { id: "glue" as const, reason: "AWS Glue is the Spectrum catalog" },
        { id: "data-lakehouse" as const, reason: "Anchor concept — lake→lakehouse" },
        { id: "aws-lake-formation" as const, reason: "Cell-level RLS governance for Redshift" },
        { id: "tableau" as const, reason: "QuickSight + Looker/Tableau on Redshift" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("bigquery")} className="text-sm text-primary hover:underline">
          &rarr; Google BigQuery (sibling warehouse, serverless)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("clickhouse")} className="text-sm text-primary hover:underline">
          &rarr; ClickHouse (open-source OLAP at extreme scale)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("iceberg")} className="text-sm text-primary hover:underline">
          &rarr; Apache Iceberg (Spectrum external tables)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("glue")} className="text-sm text-primary hover:underline">
          &rarr; AWS Glue (Spectrum catalog + ETL)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("data-lakehouse")} className="text-sm text-primary hover:underline">
          &rarr; Data Lakehouse (concept anchor page)
        </Link>
      </div>
    </div>
  );
}
