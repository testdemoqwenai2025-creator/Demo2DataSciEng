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
import { DELTA_EXAMPLES } from "../_components/_dataset_examples2";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Boxes, Layers, Database, History, Zap, Activity, Atom,
  FileText, TrendingUp, Sparkles, Cpu, ShieldCheck,
  Server, Cloud,
} from "lucide-react";

// ============================================================
// Code snippets
// ============================================================

const DELTA_SQL = `-- ============================================================
-- Delta Lake — Databricks open table format
--   _delta_log/ — JSON transaction log + Parquet checkpoint
--   ACID, time travel, CDF, Z-Order, Liquid Clustering
-- ============================================================

-- Create a Delta table (default in Databricks 9+)
CREATE TABLE delta.orders_fct (
  order_id        BIGINT,
  customer_id     BIGINT,
  order_ts        TIMESTAMP,
  ship_country    STRING,
  amount_usd      DECIMAL(18, 4),
  currency        STRING,
  is_deleted      BOOLEAN
)
USING DELTA
PARTITIONED BY (date(order_ts))
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',     -- emit change events for downstream
  'delta.deletedFileRetentionDuration' = 'interval 30 days',
  'delta.logRetentionDuration'       = 'interval 90 days',
  'delta.dataSkippingNumIndexedCols'  = '32',  -- stats for data skipping
  'delta.feature.liquidClustering'    = 'supported'  -- Liquid Clustering (2024)
);

-- Time travel — read as-of a specific version or timestamp
SELECT * FROM delta.orders_fct VERSION AS OF 42;
SELECT * FROM delta.orders_fct TIMESTAMP AS OF '2024-09-01 10:00:00';

-- Describe history — see all commits, operations, users
DESCRIBE HISTORY delta.orders_fct
  ORDER BY timestamp DESC LIMIT 10;
-- Output columns: version, timestamp, operation, operationParameters,
--                  operationMetrics (numOutputRows, numTargetRows, ...),
--                  userMetadata, engineInfo

-- Vacuum — physical delete old data files no longer referenced
-- Keeps only files used in the last 168h (default) — reduces S3 cost
VACUUM delta.orders_fct RETAIN 168 HOURS DRY RUN;
VACUUM delta.orders_fct RETAIN 168 HOURS;  -- actual delete

-- OPTIMIZE + Z-Order — compact small files + co-locate data by columns
-- Z-Order lays out data so WHERE clauses on multiple columns hit fewer files
OPTIMIZE delta.orders_fct
  ZORDER BY (ship_country, customer_id);

-- Liquid Clustering (2024+) — replaces Z-Order
-- Background, incremental, multi-column — no full-table rewrite
ALTER TABLE delta.orders_fct
  CLUSTER BY (ship_country, customer_id);
-- Clustering happens automatically on writes — no OPTIMIZE needed

-- MERGE INTO — upsert with full SQL semantics
MERGE INTO delta.orders_fct AS t
USING staging.orders_stream AS s
ON t.order_id = s.order_id
WHEN MATCHED AND s.op = 'DELETE' THEN DELETE
WHEN MATCHED AND s.op = 'UPDATE' THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;

-- Change Data Feed (CDF) — read row-level changes for downstream CDC
SELECT * FROM table_changes('delta.orders_fct', 42, 50);
-- Output: _change_type (insert/update_preimage/update_postimage/delete),
--         _commit_version, _commit_timestamp, ... + all table columns`;

const DELTA_PYTHON = `# ============================================================
# Delta Lake — Python (delta-rs, no JVM needed)
#   pip install deltalake
# ============================================================

from deltalake import DeltaTable, write_deltalake
import pyarrow as pa
import pyarrow.compute as pc
from datetime import datetime, timezone

# --- Write a batch to Delta (creates _delta_log/ on S3) ---
arrow_table = pa.table({
    "order_id":      pa.array([1, 2, 3, 4, 5], pa.int64()),
    "customer_id":   pa.array([101, 102, 103, 104, 105], pa.int64()),
    "order_ts":      pa.array(
        ["2024-09-01 10:00", "2024-09-01 11:00", "2024-09-02 09:30",
         "2024-09-03 14:20", "2024-09-03 18:45"],
        pa.timestamp("us"),
    ),
    "ship_country":  ["UK", "EU", "US", "UK", "EU"],
    "amount_usd":    pa.array([125.50, 89.99, 250.00, 45.00, 310.75],
                              pa.decimal128(18, 4)),
    "currency":      ["GBP", "EUR", "USD", "GBP", "EUR"],
    "is_deleted":    [False] * 5,
})

# Append — Delta writes new Parquet data file + JSON transaction log entry
write_deltalake(
    table_or_uri="s3://moderndatascieng-delta/orders_fct",
    data=arrow_table,
    mode="append",
    partition_by=["order_ts"],  # partition by date (uses day transform)
    storage_options={
        "aws_access_key_id":     os.environ["AWS_ACCESS_KEY_ID"],
        "aws_secret_access_key": os.environ["AWS_SECRET_ACCESS_KEY"],
        "region":                "eu-west-1",
    },
    configuration={
        "delta.enableChangeDataFeed": "true",
        "delta.dataSkippingNumIndexedCols": "32",
    },
)

# --- Load the Delta table (transaction log + checkpoints) ---
dt = DeltaTable(
    "s3://moderndatascieng-delta/orders_fct",
    storage_options={...},
)

# Get the latest version
print(f"Current version: {dt.version()}")
print(f"Schema: {dt.schema().json()}")

# Time-travel read — load as-of version 5
dt_v5 = DeltaTable(
    "s3://moderndatascieng-delta/orders_fct",
    storage_options={...},
    version=5,
)
arrow_v5 = dt_v5.to_pyarrow_table()
print(f"Version 5 had {arrow_v5.num_rows} rows")

# Time-travel as-of timestamp
dt_asof = DeltaTable(
    "s3://moderndatascieng-delta/orders_fct",
    storage_options={...},
    min_timestamp=datetime(2024, 9, 1, 12, 0, 0, tzinfo=timezone.utc),
)

# --- Optimize — compact small files (uses delta-rs optimizer) ---
dt.optimize.compact(
    partition_filters=[("order_ts", "=", "2024-09-01")],
)
# Files in that partition merged into ~1 GB target files

# --- Vacuum — delete old files beyond retention ---
dt.vacuum(retention_hours=168, dry_run=True)
# Lists files that would be deleted; no S3 writes

# --- Read CDF (Change Data Feed) — row-level changes ---
cdf = dt.load_cdf(
    starting_version=5,
    ending_version=10,
)
for chunk in cdf:
    print(f"Chunk: {chunk.num_rows} changes — types: {chunk['_change_type'].to_pylist()}")

# --- Transaction log inspection ---
log = dt.log_queue()  # generator of Delta JSON entries
for entry in log:
    print(f"v{entry['version']}: {entry['metaData']['operation']} "
          f"by {entry['metaData']['userName']}")`;

const DELTA_FLINK_SQL = `-- ============================================================
-- Flink + Delta Lake — exactly-once streaming writes
-- Uses Flink's DeltaSink with 2-phase commit on checkpoint
-- ============================================================

-- Source: Kafka topic with CDC events (Debezium)
CREATE TABLE kafka.orders_cdc (
  order_id        BIGINT,
  customer_id     BIGINT,
  order_ts        TIMESTAMP(3),
  ship_country    STRING,
  amount_usd      DECIMAL(18, 4),
  currency        STRING,
  op              STRING,
  PRIMARY KEY (order_id) NOT ENFORCED
) WITH (
  'connector'           = 'kafka',
  'topic'                = 'orders.cdc',
  'properties.bootstrap.servers' = 'kafka:9092',
  'format'               = 'debezium-json',
  'scan.startup.mode'    = 'earliest-offset'
);

-- Sink: Delta table (exactly-once via 2PC on checkpoint)
CREATE TABLE delta.orders_fct (
  order_id        BIGINT,
  customer_id     BIGINT,
  order_ts        TIMESTAMP(3),
  ship_country    STRING,
  amount_usd      DECIMAL(18, 4),
  currency        STRING,
  is_deleted      BOOLEAN,
  PRIMARY KEY (order_id) NOT ENFORCED
) WITH (
  'connector'                      = 'delta',
  'table-path'                     = 's3://moderndatascieng-delta/orders_fct',
  'mode'                           = 'upsert',  -- MERGE instead of append
  'write.parquet.compression'      = 'zstd',
  'delta.enableChangeDataFeed'     = 'true',
  'delta.appendOnly'               = 'false'
);

-- CDC → Delta MERGE pipeline (exactly-once via checkpoint commits)
INSERT INTO delta.orders_fct
SELECT
  order_id, customer_id, order_ts, ship_country, amount_usd, currency,
  op = 'DELETE' AS is_deleted
FROM kafka.orders_cdc;

-- Hourly OPTIMIZE — compaction (run via Airflow)
-- CALL sys.run_optimize('s3://moderndatascieng-delta/orders_fct')`;

// ============================================================
// Transaction log diagram
// ============================================================

function DeltaLogDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("commit_3");
  const nodes = {
    "commit_1": { label: "v1: CREATE TABLE", desc: "First commit — initial metadata, no data files", level: 0 },
    "commit_2": { label: "v2: INSERT 5 rows", desc: "Append — added 1 Parquet file (file-001.parquet)", level: 1 },
    "commit_3": { label: "v3: MERGE (CDC)", desc: "Upsert — added file-002.parquet + delete-delta-001.parquet", level: 2 },
    "commit_4": { label: "v4: OPTIMIZE", desc: "Compaction — added file-003.parquet (merged), removed file-001, file-002", level: 3 },
    "checkpoint": { label: "Checkpoint (Parquet)", desc: "_delta_log/00000000000000000003.checkpoint.parquet — full snapshot at v3", level: 4 },
    "data_1": { label: "file-001.parquet", desc: "Initial 5 rows (committed at v2, removed at v4)", level: 5 },
    "data_2": { label: "file-002.parquet", desc: "CDC upsert rows (committed at v3, removed at v4)", level: 5 },
    "data_3": { label: "file-003.parquet", desc: "Compacted 5k rows (committed at v4 — current)", level: 5 },
  };
  const edges = [
    ["commit_1", "commit_2"],
    ["commit_2", "commit_3"],
    ["commit_3", "commit_4"],
    ["commit_3", "checkpoint"],
    ["commit_2", "data_1"],
    ["commit_3", "data_2"],
    ["commit_4", "data_3"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "commit_1": { x: 80,  y: 30 },
    "commit_2": { x: 160, y: 70 },
    "commit_3": { x: 240, y: 110 },
    "commit_4": { x: 320, y: 150 },
    "checkpoint": { x: 80,  y: 150 },
    "data_1":    { x: 100, y: 200 },
    "data_2":    { x: 220, y: 200 },
    "data_3":    { x: 340, y: 200 },
  };
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <History className="h-3.5 w-3.5 text-primary" />
          Delta _delta_log/ — JSON commit log + Parquet checkpoint + data files
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 420 240" className="w-full h-auto">
          {edges.map(([from, to], i) => {
            const a = positions[from];
            const b = positions[to];
            return (
              <line key={i} x1={a.x} y1={a.y + 12} x2={b.x} y2={b.y - 12}
                stroke="var(--border)" strokeWidth="0.8"
                markerEnd="url(#delta-arrow)" />
            );
          })}
          {Object.entries(positions).map(([id, pos]) => {
            const isActive = activeNode === id;
            const node = nodes[id as keyof typeof nodes];
            const color =
              node.level === 4 ? "var(--chart-3)" :
              node.level === 5 ? "var(--chart-4)" :
              node.level === 0 ? "var(--chart-2)" : "var(--chart-1)";
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
            <marker id="delta-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
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
            Hover any node — Delta's _delta_log/ is structurally a write-ahead log
            with periodic Parquet checkpoints (same pattern as PostgreSQL's WAL).
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Pyodide demo
// ============================================================

const DELTA_PYODIDE = `# ============================================================
# Delta Transaction Log replay — in-browser simulation
# Build a synthetic Delta table from scratch:
#   1. Create _delta_log/ JSON entries
#   2. Replay the log to materialise the current table state
#   3. Time-travel read as-of any version
#   4. Vacuum old files beyond retention
# ============================================================

import json
import random
from collections import defaultdict

class ParquetDataFile:
    def __init__(self, path, n_rows, stats):
        self.path = path
        self.n_rows = n_rows
        self.stats = stats  # {col: {min, max, null_count}}
        self.added_at_version = None
        self.removed_at_version = None
    def __repr__(self):
        return f"Parquet({self.path}, rows={self.n_rows})"

class DeltaLog:
    """The _delta_log/ folder — JSON entries per commit + Parquet checkpoints."""
    def __init__(self, table_path):
        self.table_path = table_path
        self.commits = []  # list of {version, timestamp, operation, add: [], remove: []}
        self.next_version = 0

    def commit(self, operation, add_files=None, remove_files=None, metadata=None):
        version = self.next_version
        self.next_version += 1
        commit = {
            'version': version,
            'timestamp': 1234567890 + version * 60,
            'operation': operation,
            'add': add_files or [],
            'remove': remove_files or [],
            'metadata': metadata or {},
        }
        self.commits.append(commit)
        # Track which files were added/removed at this version
        for f in commit['add']:
            f.added_at_version = version
        for f in commit['remove']:
            f.removed_at_version = version
        print(f"[Delta] v{version}: {operation} "
              f"(+{len(commit['add'])} files, -{len(commit['remove'])} files)")
        return version

    def replay_to(self, version):
        """Walk the log from v0 to 'version' to materialise current files."""
        active_files = set()
        for v in range(version + 1):
            commit = self.commits[v]
            for f in commit['remove']:
                active_files.discard(f)
            for f in commit['add']:
                active_files.add(f)
        return active_files

    def current_files(self):
        return self.replay_to(self.next_version - 1)

    def checkpoint(self, at_version):
        """Write a Parquet checkpoint — full snapshot of metadata at version."""
        # In real Delta: writes _delta_log/<version>.checkpoint.parquet
        # Reader can skip JSON entries up to <version> by reading checkpoint
        active = self.replay_to(at_version)
        print(f"[Delta] Checkpoint at v{at_version}: {len(active)} active files")
        return {'version': at_version, 'active_files': active}

class DeltaTable:
    """A Delta table — combines _delta_log/ + Parquet data files."""
    def __init__(self, path):
        self.path = path
        self.log = DeltaLog(path)

    def create(self, schema, partition_cols):
        return self.log.commit('CREATE TABLE', metadata={
            'schema': schema, 'partition_cols': partition_cols
        })

    def insert(self, files):
        return self.log.commit('INSERT', add_files=files)

    def merge_upsert(self, new_files, deleted_files):
        return self.log.commit('MERGE', add_files=new_files,
                                remove_files=deleted_files)

    def optimize(self, files_to_merge, new_file):
        return self.log.commit('OPTIMIZE',
            add_files=[new_file], remove_files=files_to_merge)

    def vacuum(self, retain_versions=5):
        """Physical delete files no longer referenced in last N versions."""
        # A file is safe to delete if it was removed BEFORE current_version - retain_versions
        # AND no reader could be using it.
        cutoff_version = self.log.next_version - retain_versions
        deleted = []
        for v in range(cutoff_version):
            for f in self.log.commits[v]['add']:
                if f.removed_at_version is not None and \\
                   f.removed_at_version < cutoff_version:
                    deleted.append(f)
        print(f"[Delta] VACUUM (retain {retain_versions} versions): "
              f"{len(deleted)} files eligible for S3 delete")
        return deleted

    def time_travel(self, version):
        """Read the table as-of a specific version."""
        return self.log.replay_to(version)

# --- Build a synthetic Delta table ---
random.seed(42)
table = DeltaTable("s3://moderndatascieng-delta/orders_fct")

# v0: CREATE TABLE
table.create(
    schema={'order_id': 'BIGINT', 'order_ts': 'TIMESTAMP', 'amount': 'DECIMAL'},
    partition_cols=['date(order_ts)']
)

# v1: INSERT 3 files
files_v1 = []
for i in range(3):
    files_v1.append(ParquetDataFile(
        path=f"s3://bucket/data/file-{i}.parquet",
        n_rows=random.randint(1000, 5000),
        stats={'order_ts': {'min': f'2024-09-0{i+1}', 'max': f'2024-09-0{i+1}'}}
    ))
table.insert(files_v1)

# v2: MERGE (CDC upsert — 1 new file added, 1 old file removed)
new_file = ParquetDataFile(
    path="s3://bucket/data/file-cdc-001.parquet",
    n_rows=2000,
    stats={'order_ts': {'min': '2024-09-01', 'max': '2024-09-04'}}
)
table.merge_upsert(new_files=[new_file], deleted_files=[files_v1[0]])

# v3: OPTIMIZE — compact 2 small files into 1
merged_file = ParquetDataFile(
    path="s3://bucket/data/file-opt-001.parquet",
    n_rows=sum([f.n_rows for f in [files_v1[1], files_v1[2], new_file]]),
    stats={'order_ts': {'min': '2024-09-02', 'max': '2024-09-04'}}
)
table.optimize(files_to_merge=[files_v1[1], files_v1[2], new_file],
                new_file=merged_file)

print()
print("=== Transaction log replay ===")
print(f"  Total commits: {len(table.log.commits)}")
print(f"  Current version: {table.log.next_version - 1}")
current_files = table.current_files()
print(f"  Current active files: {len(current_files)}")
print(f"  Total rows: {sum(f.n_rows for f in current_files):,}")

print()
print("=== Time travel — read as-of version 1 (before MERGE) ===")
v1_files = table.time_travel(1)
print(f"  v1 active files: {len(v1_files)}")
print(f"  v1 total rows: {sum(f.n_rows for f in v1_files):,}")
for f in sorted(v1_files, key=lambda x: x.path):
    print(f"    {f.path}  rows={f.n_rows}")

print()
print("=== Vacuum — physical delete files beyond 5 versions ===")
table.vacuum(retain_versions=5)

print()
print("=== Checkpoint — periodic snapshot ===")
table.log.checkpoint(at_version=table.log.next_version - 1)

print()
print("Key insight: Delta's _delta_log/ is structurally a write-ahead log.")
print("Each commit is a JSON entry: add/remove file ops + metadata.")
print("Parquet checkpoints compact the log periodically (like PostgreSQL WAL segments).")`;

// ============================================================
// Format comparison
// ============================================================

function DeltaComparisonTable() {
  const rows = [
    { feature: "Origin",                delta: "Databricks (2017)",      iceberg: "Netflix (2017)",           hudi: "Uber (2016)" },
    { feature: "File format",           delta: "Parquet only",          iceberg: "Parquet, ORC, Avro",       hudi: "Parquet, ORC" },
    { feature: "Transaction log",       delta: "JSON + Parquet checkpoint", iceberg: "metadata.json + Avro manifests", hudi: ".hoodie/ timeline (instants)" },
    { feature: "Time travel",            delta: "VERSION AS OF N",       iceberg: "VERSION AS OF N",           hudi: "Instant time" },
    { feature: "Schema evolution",      delta: "Full (column IDs since v3)", iceberg: "Full (column IDs)",     hudi: "Full" },
    { feature: "Compaction",             delta: "OPTIMIZE (manual) + Liquid Clustering (auto)", iceberg: "rewrite_data_files (manual)", hudi: "Native hoodie compact" },
    { feature: "Z-Order / clustering",   delta: "Z-Order + Liquid Clustering (2024)", iceberg: "Sort Order + Z-Order (2023)", hudi: "Clustering keys (2023)" },
    { feature: "Change Data Feed",      delta: "CDF (first-class)",     iceberg: "Incremental scan (v2)",     hudi: "Native change-logs" },
    { feature: "Catalog",                delta: "Unity, Hive, S3",      iceberg: "REST, Glue, Hive, Nessie, Unity", hudi: "Hive, Glue, REST" },
    { feature: "Compute engines",       delta: "Spark, Flink, delta-rs, Trino, Presto, DuckDB", iceberg: "Spark, Trino, Flink, DuckDB, Athena, Snowflake, Impala", hudi: "Spark, Flink, Trino, Hive" },
    { feature: "Best fit",               delta: "Databricks ecosystem", iceberg: "General-purpose lakehouse", hudi: "Streaming CDC" },
    { feature: "Adoption",               delta: "All Databricks customers", iceberg: "Netflix, Apple, Stripe", hudi: "Uber, Walmart, ByteDance" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          Delta Lake vs Iceberg vs Hudi — three sibling open table formats
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold text-primary">Delta Lake</th>
              <th className="text-left px-3 py-2 font-semibold">Iceberg</th>
              <th className="text-left px-3 py-2 font-semibold">Hudi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-primary/80">{r.delta}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.iceberg}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.hudi}</td>
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
  { label: "Origin", value: "Databricks 2017", hint: "Born at Databricks (formerly TACHYON project) to bring ACID to S3-based Spark data lakes", deltaTone: "flat" as const },
  { label: "Production scale", value: "EB-scale", hint: "Every Databricks customer — Uber, Netflix, Airbnb, JPMorgan, Shopify, countless enterprises", deltaTone: "up" as const },
  { label: "Transaction log", value: "JSON + Parquet checkpoint", hint: "_delta_log/ holds JSON commit entries + periodic Parquet checkpoints — structurally a WAL", deltaTone: "flat" as const },
  { label: "Compute engines", value: "6+", hint: "Spark (Databricks) · Flink · Trino · Presto · DuckDB · delta-rs (pure Python)", deltaTone: "up" as const },
];

export function DeltaLakePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Delta Lake · Databricks open format · ACID on S3 · transaction log · time travel · CDF · Liquid Clustering"
        title="Delta Lake — the open table format that started the lakehouse movement"
        description="Delta Lake is Databricks' open-source table format that gives ACID transactions to S3/ADLS/GCS object storage. Born 2017 at Databricks (then called TACHYON), it pioneered the lakehouse pattern — the same Parquet files you'd put on S3 for a Hadoop-style data lake, now wrapped with a transaction log (_delta_log/) that adds atomic commits, time travel, schema evolution, MERGE INTO upserts, Change Data Feed (CDF), Z-Order data skipping, and Liquid Clustering (2024). Delta is the most widely-deployed open table format because every Databricks customer uses it by default. Outside Databricks, delta-rs (pure Rust/Python implementation) and Trino/Presto/DuckDB connectors extend Delta to non-Databricks stacks. Apache Iceberg is the sibling format (Netflix origin, vendor-neutral) — converging on feature parity."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Layers className="h-3 w-3" /> Delta v3</Badge>
            <Badge variant="outline" className="gap-1.5"><History className="h-3 w-3" /> Time travel</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* Architecture */}
      <SectionCard
        title="Transaction log — _delta_log/ is a write-ahead log"
        description="Delta's transaction log is structurally identical to a database's WAL. Each commit is a JSON entry in _delta_log/0000000000000000000N.json, recording add/remove file operations + commit metadata. Periodic Parquet checkpoints (every ~10 commits by default) compact the log so readers don't have to replay every JSON entry. VACUUM physically deletes old data files beyond retention (default 7 days); OPTIMIZE compacts small files into ~1 GB targets; Z-Order co-locates data for multi-column WHERE clauses; Liquid Clustering (2024) replaces Z-Order with incremental, automatic clustering."
        icon={<Atom className="h-5 w-5" />}
        badge="architecture"
      >
        <DeltaLogDiagram />
      </SectionCard>

      {/* SQL */}
      <SectionCard
        title="Delta SQL — create, time-travel, MERGE, OPTIMIZE, VACUUM, CDF"
        description="Databricks SQL/Delta covers the full lifecycle: create a Delta table (USING DELTA) with CDF + Liquid Clustering enabled, time travel (VERSION AS OF N / TIMESTAMP AS OF), DESCRIBE HISTORY to see commit metadata, VACUUM to physically delete old files, OPTIMIZE ZORDER BY for multi-column data skipping, ALTER TABLE CLUSTER BY for Liquid Clustering (2024, replaces Z-Order), MERGE INTO for upserts, table_changes() to read Change Data Feed."
        icon={<Database className="h-5 w-5" />}
        badge="Delta SQL"
      >
        <CodeBlock code={DELTA_SQL} language="sql" filename="delta_lake.sql" highlight={[12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 25, 26, 29, 30, 33, 34, 39, 40, 43, 44, 47, 48, 53, 54, 62, 63, 64, 65]} />
      </SectionCard>

      {/* delta-rs Python */}
      <SectionCard
        title="delta-rs — pure-Python/Rust client (no JVM, no Databricks)"
        description="delta-rs is the open-source Rust implementation of the Delta Lake protocol, exposed via Python bindings (pip install deltalake). Lets you read/write Delta tables from Python without spinning up a Databricks or Spark cluster. Perfect for: lightweight ETL jobs, notebook analytics on production Delta tables, CI/CD pipelines that inspect lake data, ad-hoc analytics on laptops. Same protocol as Databricks — fully interchangeable."
        icon={<Cpu className="h-5 w-5" />}
        badge="delta-rs"
      >
        <CodeBlock code={DELTA_PYTHON} language="python" filename="delta_rs.py" highlight={[20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 51, 52, 53, 54, 55, 56, 57, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79]} />
      </SectionCard>

      {/* Flink */}
      <SectionCard
        title="Flink + Delta — exactly-once streaming CDC writes"
        description="Flink's DeltaSink implements two-phase commit on Flink checkpoint, making Delta writes exactly-once. Combined with Debezium CDC source on Kafka, this is the standard CDC-to-lake pipeline in the Databricks ecosystem. mode='upsert' triggers Delta MERGE instead of append — perfect for incremental upserts of operational data."
        icon={<Activity className="h-5 w-5" />}
        badge="Flink SQL"
      >
        <CodeBlock code={DELTA_FLINK_SQL} language="sql" filename="delta_flink.sql" highlight={[18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45]} />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: replay a Delta transaction log in your browser (Pyodide)"
        description="Pure-Python simulation of Delta's _delta_log/ — build a synthetic Delta table from scratch: CREATE TABLE → INSERT → MERGE upsert → OPTIMIZE compaction → checkpoint → time-travel read → VACUUM old files. See exactly how the WAL pattern works for object-storage Parquet files."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={DELTA_PYODIDE} buttonLabel="Run Delta log replay (Pyodide)" />
      </SectionCard>

      {/* Comparison */}
      <SectionCard
        title="Delta vs Iceberg vs Hudi — three sibling open table formats"
        description="Three formats, all born 2016-2017 to fix Hive's lack of ACID on object storage. Delta (Databricks origin) emphasises Spark-first integration and Databricks ecosystem. Iceberg (Netflix origin) emphasises vendor-neutral catalogs and hidden partitioning. Hudi (Uber origin) is the upsert-first specialist for CDC-heavy workloads. The three are converging on feature parity (Liquid Clustering vs Iceberg Sort Order vs Hudi Clustering Keys); the choice is increasingly driven by ecosystem fit."
        icon={<Boxes className="h-5 w-5" />}
      >
        <DeltaComparisonTable />
      </SectionCard>

      {/* Why this evolved */}
      <SectionCard
        title="Why Delta evolved — shortfalls of Hive-on-S3 (Era 2)"
        description="Databricks launched Delta Lake in 2017 (open-sourced 2019) to fix three critical shortfalls of Hive-on-S3 that broke analytical workloads on cloud object storage. Delta layered an ACID transaction log over Parquet files, the same primitive Iceberg and Hudi chose independently."
        icon={<History className="h-5 w-5" />}
        badge="Why Delta"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: No ACID on S3.</strong> Hive-on-S3 had no atomic commit — concurrent writers clobbered each other, appends were visible mid-write, and an interrupted job left torn Parquet files visible to readers. <strong className="text-foreground/80">Result:</strong> Delta's <code className="font-mono">_delta_log/</code> JSON commit log uses compare-and-swap on the latest version file; only one writer wins, others retry. Atomic multi-file commits make S3 look transactional.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: Slow MERGE for upserts.</strong> Hive required rewriting the entire partition for a single-row CDC update — updating one customer record on a 1 TB partition meant rewriting 1 TB. <strong className="text-foreground/80">Result:</strong> Delta MERGE does row-level predicate pushdown — only affected Parquet files are rewritten, the rest are untouched. MERGE on a 10-row update to a 10 TB table rewrites only a few files.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: Schema drift broke downstream.</strong> Hive bound schema to Parquet file footers — adding a column with a different type silently broke readers. <strong className="text-foreground/80">Result:</strong> Delta stores schema in the transaction log with explicit IDs; <code className="font-mono">ALTER TABLE</code> is metadata-only, old readers see the old schema, new readers see the new one. Add/drop/rename columns without rewriting data.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique Delta features (vs Iceberg + Hudi)"
        description="Four Delta capabilities that no other open table format has matched — they reflect Databricks' Spark-native + research-heavy DNA. Delta is the only format with a pure-Rust client, a multidim clustering primitive, and a streaming CDF."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. Liquid Clustering (2023)</p>
            <p className="text-muted-foreground">Multi-dimensional adaptive clustering — re-cluster only the affected stripes on write, no <code>OPTIMIZE</code> job needed. <strong>Iceberg Sort Order is single-dim; Hudi Clustering Keys are static.</strong> Liquid replaced Z-Order as the default Databricks layout.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. CDF (Change Data Feed)</p>
            <p className="text-muted-foreground">Built-in CDC stream — <code>table_changes()</code> returns inserted/updated/deleted rows as a streaming source. <strong>Iceberg + Hudi both rely on extra config or incremental queries.</strong> CDF is the only native CDC-from-table feature among the three.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Z-Order multidim</p>
            <p className="text-muted-foreground">Z-Order interleaves multiple high-cardinality columns (e.g. user_id, event_ts) into a single sort key — range queries on any Z-ordered column skip most files. <strong>Iceberg Sort Order is one column; Hudi has no multidim primitive.</strong> Superseded by Liquid Clustering but still widely deployed.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. delta-rs (pure Rust)</p>
            <p className="text-muted-foreground">Pure-Rust implementation — write Delta tables from Python, Rust, JS without a JVM or Spark. <strong>Iceberg has pyiceberg + Rust bindings; Hudi has hudi-rs.</strong> delta-rs is the most mature, used by Polars, Daft, LanceDB natively.</p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples cards */}
      <SectionCard
        title="3 large-dataset examples — cards with 5-language code popups"
        description="Three production-style Delta scenarios (MERGE upsert, Liquid Clustering, CDF streaming). Each is a clickable card opening a lazy popup with: scenario brief, dataset stats grid, computational tooling, multi-language code in Scala + Rust + Go + Elixir + Zig, and an implementation insight."
        icon={<Database className="h-5 w-5" />}
        badge="3 examples × 5 langs"
      >
        <DatasetCards
          examples={DELTA_EXAMPLES}
          intro="Production-style ACID upsert + Liquid Clustering + CDF streaming scenarios on Delta Lake. Each card has Scala/Rust/Go/Elixir/Zig code with Delta-specific primitives (MERGE, CDF, Z-Order, delta-rs)."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the Delta ecosystem"
        description="Delta's ecosystem is Spark-centric but delta-rs has opened it to non-JVM engines. Compute (8+ engines) and catalog (1 native + 3 federated) — Databricks Unity is the canonical catalog, but Delta tables on S3/ADLS/GCS can be queried by any engine that reads the _delta_log."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Compute engines (8+)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Apache Spark 3.5+ (delta-spark)</strong> — primary write engine, PySpark/Scala/SQL/R</li>
              <li>• <strong>delta-rs (Python/Rust)</strong> — pure-Rust writer, no JVM (used by Polars/Daft/LanceDB)</li>
              <li>• <strong>Apache Flink (delta-connector)</strong> — streaming CDC ingestion + exactly-once sinks</li>
              <li>• <strong>Trino 425+ (Delta connector)</strong> — federated SQL reads</li>
              <li>• <strong>Presto / Starrocks / Apache Doris</strong> — lakehouse reads via Delta connector</li>
              <li>• <strong>Athena / Glue</strong> — AWS-managed reads on Delta tables on S3</li>
              <li>• <strong>Apache Beam</strong> — batch + streaming pipelines writing Delta</li>
              <li>• <strong>DuckDB (delta extension)</strong> — laptop-scale analytics (community)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cloud className="h-3.5 w-3.5 text-primary" /> Catalogs + integrations (5)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Databricks Unity Catalog</strong> — native Delta catalog, column-level RBAC, lineage</li>
              <li>• <strong>Apache Hive Metastore</strong> — legacy path (self-hosted, DDL-driven)</li>
              <li>• <strong>AWS Glue Data Catalog</strong> — Delta tables on S3 registered into Glue</li>
              <li>• <strong>Snowflake (external Delta)</strong> — Snowflake reads external Delta on S3/ADLS</li>
              <li>• <strong>Polars / Daft / LanceDB</strong> — pure-Rust readers via delta-rs, no cluster</li>
              <li>• <strong>Kafka + Delta (Delta Sink connector)</strong> — exactly-once CDC ingest from Kafka</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The Armbrust 2020 lakehouse paper is the academic foundation; the Databricks + Uber + Airbnb engineering blogs document production scale."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Armbrust et al. 2020 (CIDR):</strong> "Lakehouse: A New Generation of Open Platforms that Make Data-Pluralism the Norm." The foundational academic paper, written by Databricks founders. Argued that the data lake + warehouse split was a historical accident — open table formats (Delta, Iceberg, Hudi) could give lakes the ACID + SQL + schema semantics of warehouses, while keeping cheap S3 storage. Delta is the format that this paper is built around — and the paper is what makes 'lakehouse' a category.
          </p>
          <p>
            <strong className="text-foreground/80">Apache Delta Lake origin (Databricks 2017, Apache 2019):</strong> Databricks created Delta internally (codename TACHYON) to fix their customers' pain with Hive on S3 — no ACID, slow MERGE, schema evolution broke queries. Open-sourced 2019, joined Apache Foundation 2023 (still in incubation). Delta's killer feature was CDF (Change Data Feed) — emits row-level changes for downstream CDC consumers, avoiding the need for separate Kafka topics.
          </p>
          <p>
            <strong className="text-foreground/80">Liquid Clustering (Databricks 2023):</strong> Replaces Z-Order with incremental, automatic, multi-column clustering. Z-Order requires a full-table OPTIMIZE rewrite; Liquid Clustering happens automatically on every write — new files are clustered incrementally. Major perf win for tables with multi-dimensional WHERE clauses (e.g. <code className="font-mono">WHERE ship_country='UK' AND order_ts &gt;= current_date - 7</code>).
          </p>
          <p>
            <strong className="text-foreground/80">delta-rs (2022):</strong> Pure Rust implementation of Delta protocol — no JVM, no Databricks. Used by Polars, DuckDB, Flink, Trino to read/write Delta tables natively. Made Delta accessible outside Databricks; before delta-rs, Delta was effectively Databricks-only.
          </p>
          <p>
            <strong className="text-foreground/80">Uber Production Case (Uber Eng 2022):</strong> Uber uses Delta on top of their internal Petabyte-scale S3-compatible lake. Their production pattern: Debezium CDC from MySQL → Kafka → Flink → Delta (with CDF). CDF replaces their previous Kafka-only CDC pattern; downstream consumers (ML feature stores, real-time analytics) read CDF directly without Kafka.
          </p>
          <p>
            <strong className="text-foreground/80">Airbnb Production Case (Airbnb Eng 2021):</strong> Migrated ~5PB of Hive tables to Delta on Databricks. Result: 4× faster MERGE operations, zero-downtime schema evolution (added 100+ columns to production tables without rewriting any Parquet file), 60% S3 cost reduction via VACUUM (default 7-day retention deleted ~40% of historical files).
          </p>
          <p>
            <strong className="text-foreground/80">Databricks Unity Catalog (2021):</strong> Centralised governance layer for Delta tables — column-level access control, lineage tracking, audit logs. Replaces the per-table IAM + per-workspace ACL model that Databricks used before. Unity is the catalog that competes with Glue/Nessie/Polaris; the table-format battle (Delta vs Iceberg) is largely won in Databricks' favour inside Databricks accounts.
          </p>
        </div>
      </SectionCard>

      {/* Insight */}
      <SectionCard
        title="My deeper thought: Delta's transaction log IS a PostgreSQL WAL"
        description="The unifying view: Delta's _delta_log/ is structurally identical to PostgreSQL's pg_wal/ — a write-ahead log with periodic checkpoints. Every Delta commit IS a database transaction; every VACUUM IS a PostgreSQL VACUUM; every OPTIMIZE IS a PostgreSQL ANALYZE."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Delta's _delta_log/ IS a PostgreSQL WAL.</strong> PostgreSQL writes WAL segments to pg_wal/ — JSON-like commit records. Delta writes JSON entries to _delta_log/ — same pattern. PostgreSQL checkpoints (write WAL to data files) on a configurable interval; Delta writes Parquet checkpoints every ~10 commits. PostgreSQL VACUUM deletes dead tuples beyond MVCC horizon; Delta VACUUM deletes unreferenced Parquet files beyond retention window. There is nothing exotic here — Delta applied 40-year-old database patterns to object storage. The innovation is choosing to expose them as user-visible features (DESCRIBE HISTORY, VERSION AS OF) instead of internal optimisations.
          </p>
          <p>
            <strong className="text-foreground/80">Z-Order IS multidimensional B-tree on Parquet.</strong> Z-Order (Morton order) maps multidimensional coordinates to a 1-D sequence while preserving locality — used in PostgreSQL BRIN indexes, MongoDB 2D indexes, and Delta's OPTIMIZE ZORDER BY. The fundamental insight: if WHERE clauses filter on multiple columns, laying out data so that rows with similar (col_a, col_b) values are physically adjacent means a single file scan returns most matches. Z-Order is the multidimensional extension of B-tree sorting — applied to Parquet row groups. Liquid Clustering (2024) replaces it with an online clustering algorithm that doesn't require a full OPTIMIZE rewrite.
          </p>
          <p>
            <strong className="text-foreground/80">Change Data Feed IS logical replication.</strong> PostgreSQL's logical replication (since v10) emits row-level change events to a WAL slot; downstream consumers (Kafka Connect, Debezium) read the slot. Delta's CDF does the same — emits row-level changes (insert/update_preimage/update_postimage/delete) to a system-readable view. Downstream consumers (Flink jobs, ML feature stores, dashboards) read CDF instead of polling the table. The pattern is identical to logical replication; Delta's innovation is making it a first-class table property ('delta.enableChangeDataFeed' = 'true').
          </p>
          <p>
            <strong className="text-foreground/80">Liquid Clustering IS online B-tree rebuild.</strong> Z-Order requires a full-table OPTIMIZE — O(n) cost per compaction. Liquid Clustering (2024) is incremental — new writes go to clustered files automatically, no full rewrite. This is the same pattern as PostgreSQL's online B-tree rebuild (autovacuum processes small portions of the index continuously) vs the old VACUUM FULL (rewrites the entire table in one go). The evolution from Z-Order to Liquid Clustering mirrors the database world's evolution from VACUUM FULL to autovacuum. Same idea, 40 years later, applied to object storage.
          </p>
          <p>
            <strong className="text-foreground/80">Delta IS to Databricks what Unity Catalog IS to Databricks — both lock-in.</strong> Delta is technically open (Apache), but the best compute engine for Delta is Spark-on-Databricks (Databricks wrote both). Unity Catalog is technically open (Apache), but the best catalog for Delta is Unity-on-Databricks. The two together create a vertical stack that locks customers in. Snowflake's counter-bet (Polaris catalog + Iceberg tables + Snowflake compute) is the explicit open alternative — same stack, different vendor. Iceberg is winning the open-format battle outside Databricks because it's vendor-neutral from day one, while Delta is vendor-neutral only on paper (Databricks owns the reference implementation).
          </p>
        </div>
      </SectionCard>

      <DeeperThoughtSection pageTitle="Delta Lake">
        <DeeperThought title="Delta Lake IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about Delta Lake is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. Delta Lake connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where Delta Lake sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (Delta Lake) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
        { id: "iceberg" as const, reason: "Sibling open table format (Netflix origin, vendor-neutral)" },
        { id: "hudi" as const, reason: "Sibling open table format (Uber origin, upsert-first)" },
        { id: "data-lakehouse" as const, reason: "Anchor concept page — lake→lakehouse evolution" },
        { id: "glue" as const, reason: "AWS-native alternative (Hive catalog + Parquet on S3)" },
        { id: "catalogs" as const, reason: "Unity vs Glue vs Nessie vs Polaris comparison" },
        { id: "databricks" as const, reason: "Spark + Delta is the Databricks stack" },
        { id: "streaming" as const, reason: "Flink CDC → Delta with CDF" },
        { id: "arrow" as const, reason: "Parquet = columnar file format underneath Delta" },
      ]} />
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "Trace this topic's connections across the platform's math graph" }, { id: "iceberg" as const, reason: "Sibling open table format (Netflix origin, vendor-neutral)" }, { id: "hudi" as const, reason: "Sibling open table format (Uber origin, upsert-first)" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("iceberg")} className="text-sm text-primary hover:underline">
          &rarr; Apache Iceberg (sibling format, Netflix origin)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("hudi")} className="text-sm text-primary hover:underline">
          &rarr; Apache Hudi (sibling format, Uber origin)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("data-lakehouse")} className="text-sm text-primary hover:underline">
          &rarr; Data Lakehouse (concept anchor)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("catalogs")} className="text-sm text-primary hover:underline">
          &rarr; Catalogs comparison (Unity vs Glue vs Nessie vs Polaris)
        </Link>
      </div>
    </div>
  );
}
