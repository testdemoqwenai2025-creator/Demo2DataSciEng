"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { ICEBERG_EXAMPLES } from "../_components/_dataset_examples";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Layers, Boxes, Database, Workflow, Zap, GitBranch, History, ShieldCheck,
  Atom, Activity, FileText, ExternalLink, Network, Sparkles, Cpu, TrendingUp,
  Server, Cloud, Code2,
} from "lucide-react";

// ============================================================
// Code snippets
// ============================================================

const SPARK_ICEBERG_SQL = `-- ============================================================
-- Apache Iceberg — open table format on S3/ADLS/GCS
-- Run on: Spark 3.5+, Trino 425+, DuckDB 0.10+, Flink 1.18+
-- Catalog: Hive | REST | Glue | Nessie | Unity
-- ============================================================

-- Create an Iceberg table (Hive catalog — alternatives: REST, Glue, Nessie)
CREATE TABLE iceberg.orders_fct (
  order_id        BIGINT,
  customer_id     BIGINT,
  order_ts        TIMESTAMP,
  ship_country    STRING,
  amount_usd      DECIMAL(18, 4),
  currency        STRING,
  is_deleted      BOOLEAN
) USING iceberg
PARTITIONED BY (days(order_ts))      -- hidden partitioning
TBLPROPERTIES (
  'format-version'              = '2',  -- v2 enables row-level deletes
  'write.format.default'        = 'parquet',
  'write.parquet.compression'   = 'zstd',
  'history.expire.max-snapshot-age-days' = '90',
  'write.distribution-mode'     = 'hash',  -- hash by order_id for even writes
  'write.target-file-size-bytes' = '536870912'  -- 512 MB data files
);

-- Hidden partitioning: queries on days(order_ts) hit only the right data files
-- without users writing WHERE date BETWEEN ... in the partition spec.
SELECT order_id, sum(amount_usd) AS daily_revenue
FROM iceberg.orders_fct
WHERE order_ts >= current_date - 7  -- Iceberg prunes to relevant days automatically
GROUP BY 1
ORDER BY 2 DESC;

-- Time travel — query the table as of 3 days ago (snapshot isolation)
SELECT * FROM iceberg.orders_fct VERSION AS OF 1234567890;
SELECT * FROM iceberg.orders_fct TIMESTAMP AS OF '2024-09-01 10:00:00';

-- Schema evolution — add column WITHOUT rewriting files
ALTER TABLE iceberg.orders_fct ADD COLUMN discount_code STRING AFTER currency;
ALTER TABLE iceberg.orders_fct ALTER COLUMN currency TYPE STRING;

-- MERGE INTO — upsert pattern (v2 spec row-level deletes)
MERGE INTO iceberg.orders_fct AS t
USING staging.orders_stream AS s
ON t.order_id = s.order_id
WHEN MATCHED AND s.op = 'DELETE' THEN DELETE
WHEN MATCHED AND s.op = 'UPDATE' THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;

-- Branch + tag (Nessie catalog only) — git-for-data semantics
ALTER TABLE iceberg.orders_fct CREATE BRANCH dev_branch RETAIN 7 DAYS;
ALTER TABLE iceberg.orders_fct CREATE TAG q3_2024_freeze RETAIN 90 DAYS;`;

const PYICEBERG_PYTHON = `# ============================================================
# PyIceberg — pure-Python Iceberg client (no JVM)
#   pip install pyiceberg[s3fs,pyarrow]
# ============================================================

from pyiceberg.catalog import load_catalog
from pyiceberg.schema import Schema
from pyiceberg.types import (
    NestedField, LongType, TimestampType, StringType,
    DecimalType, BooleanType,
)
from pyiceberg.partitioning import PartitionSpec, PartitionField
from pyiceberg.transforms import DayTransform
import pyarrow.parquet as pq
import pyarrow as pa

# Connect to catalog (REST is recommended for production)
catalog = load_catalog(
    "moderndatascieng",
    **{
        "type": "rest",
        "uri":  "https://catalog.moderndatascieng.com",
        "warehouse": "s3://moderndatascieng-iceberg",
        "s3.access-key-id":     os.environ["AWS_ACCESS_KEY_ID"],
        "s3.secret-access-key": os.environ["AWS_SECRET_ACCESS_KEY"],
        "s3.region":            "eu-west-1",
    },
)

# Define table schema (Iceberg-native — distinct from Arrow schema)
schema = Schema(
    NestedField(1, "order_id",     LongType(),     required=True),
    NestedField(2, "customer_id",  LongType()),
    NestedField(3, "order_ts",     TimestampType(),required=True),
    NestedField(4, "ship_country",  StringType()),
    NestedField(5, "amount_usd",   DecimalType(18, 4)),
    NestedField(6, "currency",      StringType()),
    NestedField(7, "is_deleted",    BooleanType()),
)

# Day-transform partition spec — hidden partitioning
partition_spec = PartitionSpec(
    PartitionField(
        field_id=1000,
        source_id=3,                    # references order_ts
        transform=DayTransform(),
        name="order_ts_day",
    ),
)

# Create the table
table = catalog.create_table(
    identifier="warehouse.orders_fct",
    schema=schema,
    partition_spec=partition_spec,
    properties={
        "format-version": "2",
        "write.format.default": "parquet",
        "write.parquet.compression": "zstd",
    },
)

# Append an Arrow batch — Iceberg writes a new Parquet data file + manifest
arrow_batch = pa.table({
    "order_id":      [1, 2, 3, 4, 5],
    "customer_id":   [101, 102, 103, 104, 105],
    "order_ts":      pa.array(
        ["2024-09-01 10:00:00", "2024-09-01 11:00:00",
         "2024-09-02 09:30:00", "2024-09-03 14:20:00",
         "2024-09-03 18:45:00"],
        type=pa.timestamp("us"),
    ),
    "ship_country":  ["UK", "EU", "US", "UK", "EU"],
    "amount_usd":    [125.50, 89.99, 250.00, 45.00, 310.75],
    "currency":      ["GBP", "EUR", "USD", "GBP", "EUR"],
    "is_deleted":    [False] * 5,
})

# Append + commit (creates a new snapshot, atomically visible)
table.append(arrow_batch)

# Time-travel read — read as of a previous snapshot
from pyiceberg.table import Table
history = table.history()   # list of SnapshotMetadata
print(f"Snapshots: {len(history)}")
for snap in history[-3:]:
    print(f"  snapshot_id={snap.snapshot_id}  ts={snap.timestamp}  "
          f"op={snap.operation}  files={snap.summary['added-data-files']}")

# Read the latest snapshot as Arrow (zero-copy)
arrow_table = table.scan().to_arrow()
print(f"Total rows: {arrow_table.num_rows}")

# Snapshot expiry — keep the last 90 days, garbage-collect older files
table.expire_snapshots(
    older_than=datetime.now(timezone.utc) - timedelta(days=90)
).execute()`;

const TRINO_ICEBERG_SQL = `-- ============================================================
-- Trino (forked from Presto) — federated SQL on Iceberg tables
-- Trino treats Iceberg tables as first-class; no Spark needed.
-- ============================================================

-- Configure the Iceberg catalog (in /etc/trino/catalog/iceberg.properties)
-- connector.name=iceberg
-- iceberg.catalog.type=hive|rest|glue|nessie|jdbc
-- hive.metastore.uri=thrift://hive-metastore:9083
-- iceberg.file-format=PARQUET
-- iceberg.compression-codec=ZSTD

-- Read an Iceberg table via Trino (super-fast — vectorised)
SELECT
    order_ts,
    ship_country,
    sum(amount_usd) AS daily_revenue,
    count(*)         AS n_orders
FROM iceberg.orders_fct
WHERE order_ts >= DATE '2024-09-01'
  AND ship_country IN ('UK', 'EU')
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC
LIMIT 100;

-- Time travel in Trino
SELECT * FROM iceberg.orders_fct FOR VERSION AS OF 1234567890;
SELECT * FROM iceberg.orders_fct FOR SYSTEM_TIME AS OF TIMESTAMP '2024-09-01 10:00:00';

-- Snapshot inspection — Iceberg metadata via Trino system tables
SELECT
    snapshot_id,
    parent_id,
    committed_at,
    operation,
    summary['added-data-files']  AS added_files,
    summary['deleted-data-files'] AS deleted_files,
    summary['total-records']    AS records
FROM iceberg.orders_fct.snapshots
ORDER BY committed_at DESC
LIMIT 10;

-- Partition inspection — what files belong to which partition?
SELECT
    record_count,
    file_count,
    file_size_in_bytes,
    partition
FROM iceberg.orders_fct.partitions
ORDER BY partition
LIMIT 100;

-- Federated cross-catalog join: Iceberg + MySQL + Kafka
SELECT
    o.order_id,
    o.amount_usd,
    c.customer_email_hash,    -- from MySQL
    k.last_seen               -- from Kafka topic
FROM iceberg.orders_fct AS o
JOIN mysql.customers.dim_customer AS c ON o.customer_id = c.customer_id
JOIN kafka.live.customer_activity AS k ON o.customer_id = k.customer_id
WHERE o.order_ts >= CURRENT_DATE - 7;`;

const FLINK_ICEBERG_SQL = `-- ============================================================
-- Apache Flink + Iceberg — exactly-once streaming writes
-- Flink writes micro-batches to Iceberg atomically (no partial writes)
-- ============================================================

-- Source: Kafka topic with CDC events (Debezium format)
CREATE TABLE kafka.orders_cdc (
  order_id       BIGINT,
  customer_id    BIGINT,
  order_ts       TIMESTAMP(3),
  ship_country   STRING,
  amount_usd     DECIMAL(18, 4),
  currency       STRING,
  op             STRING,           -- INSERT | UPDATE | DELETE
  metadata       ROW<ts TIMESTAMP(3), source STRING> METADATA FROM VALUE
) WITH (
  'connector'           = 'kafka',
  'topic'                = 'orders.cdc',
  'properties.bootstrap.servers' = 'kafka:9092',
  'format'               = 'debezium-json',
  'scan.startup.mode'    = 'earliest-offset'
);

-- Sink: Iceberg table (exactly-once via 2-phase commit on checkpoint)
CREATE TABLE iceberg.orders_fct (
  order_id       BIGINT,
  customer_id    BIGINT,
  order_ts       TIMESTAMP(3),
  ship_country   STRING,
  amount_usd     DECIMAL(18, 4),
  currency       STRING,
  is_deleted     BOOLEAN,
  PRIMARY KEY (order_id) NOT ENFORCED
) WITH (
  'connector'           = 'iceberg',
  'catalog-name'        = 'moderndatascieng',
  'catalog-type'        = 'rest',
  'uri'                 = 'https://catalog.moderndatascieng.com',
  'warehouse'           = 's3://moderndatascieng-iceberg',
  'format-version'      = '2',  -- v2 enables row-level MERGE
  'write.format.default' = 'parquet',
  'write.upsert.enabled' = 'true'  -- MERGE instead of append
);

-- CDC → Iceberg MERGE pipeline (exactly-once via checkpoint)
INSERT INTO iceberg.orders_fct
SELECT
  order_id, customer_id, order_ts, ship_country, amount_usd, currency,
  op = 'DELETE' AS is_deleted
FROM kafka.orders_cdc;

-- Compaction job (run hourly via Airflow) — small files into 512 MB files
-- Prevents the "small files problem" that degrades read performance
CALL sys.run_compaction(
  'iceberg', 'moderndatascieng', 'orders_fct',
  table_options => MAP(
    ARRAY['min_input_files', 'target_file_size_bytes'],
    ARRAY[5, '536870912']
  )
);`;

const DUCKDB_ICEBERG_SQL = `-- ============================================================
-- DuckDB 0.10+ — open-source SQL directly on Iceberg tables
-- Laptop-scale analytics on the same Iceberg tables that
-- Spark/Trino/Flink query in production.
-- ============================================================

INSTALL iceberg;
LOAD iceberg;

-- Attach to a catalog (REST, Glue, or local files)
ATTACH 'iceberg_rest' AS catalog (
  TYPE iceberg,
  URI 'https://catalog.moderndatascieng.com',
  WAREHOUSE 's3://moderndatascieng-iceberg'
);

-- Query the Iceberg table — DuckDB uses Arrow's Iceberg reader
SELECT
    order_ts::DATE AS day,
    ship_country,
    sum(amount_usd) AS daily_revenue,
    count(*)        AS n_orders
FROM catalog.warehouse.orders_fct
WHERE order_ts >= '2024-09-01'
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC
LIMIT 100;

-- Time-travel via DuckDB
SELECT * FROM catalog.warehouse.orders_fct
  FOR VERSION AS OF 1234567890;

SELECT * FROM catalog.warehouse.orders_fct
  FOR SYSTEM_TIME AS OF TIMESTAMP '2024-09-01 10:00:00';

-- Export an Iceberg snapshot to Parquet (e.g. for sharing)
COPY (SELECT * FROM catalog.warehouse.orders_fct)
TO 'orders_export.parquet' (FORMAT PARQUET, COMPRESSION ZSTD);

-- Joins with local CSVs — DuckDB's superpower
SELECT
    o.order_id,
    o.amount_usd,
    fx.rate_gbp
FROM catalog.warehouse.orders_fct o
JOIN read_csv_auto('fx_rates.csv') fx ON o.currency = fx.currency
WHERE o.order_ts >= '2024-09-01';`;

// ============================================================
// Pyodide demo — simulate Iceberg manifest tree in browser
// ============================================================

const PYODIDE_DEMO = `# ============================================================
# Iceberg Manifest Tree — in-browser simulation
# Build a synthetic Iceberg table from scratch:
#   1. Create snapshots + manifests + data files
#   2. Walk the manifest tree to read
#   3. Time-travel read (as-of-snapshot)
#   4. Snapshot expiry (garbage-collect old files)
# ============================================================

import json
import random
from collections import defaultdict

class DataFile:
    """A Parquet data file on object storage."""
    def __init__(self, path, n_rows, partition_values, size_bytes):
        self.path = path
        self.n_rows = n_rows
        self.partition_values = partition_values  # {field: value}
        self.size_bytes = size_bytes
    def __repr__(self):
        return f"DataFile({self.path}, rows={self.n_rows}, part={self.partition_values})"

class ManifestEntry:
    """One entry in a manifest — references a data file + its partition."""
    def __init__(self, data_file, status='ADDED'):
        self.data_file = data_file
        self.status = status  # ADDED | EXISTING | DELETED
    def __repr__(self):
        return f"ManifestEntry({self.status}, {self.data_file.path})"

class Manifest:
    """Avro file listing data files + their partition values for one snapshot."""
    def __init__(self, partition_spec, entries):
        self.partition_spec = partition_spec
        self.entries = entries
    def __repr__(self):
        return f"Manifest(spec={self.partition_spec}, entries={len(self.entries)})"

class ManifestList:
    """Avro file listing manifests for one snapshot (one per partition spec)."""
    def __init__(self, manifests):
        self.manifests = manifests

class Snapshot:
    """A snapshot = a manifest list + commit metadata."""
    next_id = [0]
    @classmethod
    def new_id(cls):
        cls.next_id[0] += 1
        return cls.next_id[0]
    def __init__(self, parent_id, manifest_list, operation, summary):
        self.snapshot_id = Snapshot.new_id()
        self.parent_id = parent_id
        self.manifest_list = manifest_list
        self.operation = operation  # append | overwrite | delete
        self.summary = summary

class IcebergTable:
    """An Iceberg table — metadata.json + snapshots + manifest tree."""
    def __init__(self, schema, partition_spec):
        self.schema = schema
        self.partition_spec = partition_spec
        self.snapshots = []
        self.current_snapshot = None

    def append(self, data_files):
        """Append data files — creates a new manifest + snapshot atomically."""
        entries = [ManifestEntry(f, 'ADDED') for f in data_files]
        manifest = Manifest(self.partition_spec, entries)
        manifest_list = ManifestList([manifest])
        parent = self.current_snapshot.snapshot_id if self.current_snapshot else None
        snapshot = Snapshot(parent, manifest_list, 'append',
            {'added-data-files': len(data_files),
             'added-records': sum(f.n_rows for f in data_files)})
        self.snapshots.append(snapshot)
        self.current_snapshot = snapshot
        return snapshot

    def read(self, snapshot_id=None):
        """Read all data files reachable from a snapshot (or current)."""
        snap = self.current_snapshot if snapshot_id is None else \\
            next(s for s in self.snapshots if s.snapshot_id == snapshot_id)
        # Walk: snapshot → manifest_list → manifests → entries → data_files
        files = []
        for manifest in snap.manifest_list.manifests:
            for entry in manifest.entries:
                if entry.status != 'DELETED':
                    files.append(entry.data_file)
        return files

    def history(self):
        return [(s.snapshot_id, s.parent_id, s.operation, s.summary)
                for s in self.snapshots]

    def expire_snapshots(self, keep_last_n=3):
        """Garbage-collect old snapshots — keep only the most recent N."""
        if len(self.snapshots) <= keep_last_n:
            return []
        to_expire = self.snapshots[:-keep_last_n]
        self.snapshots = self.snapshots[-keep_last_n:]
        return to_expire

# --- Simulate an Iceberg table ---
random.seed(42)
table = IcebergTable(
    schema={'order_id': 'BIGINT', 'order_ts': 'TIMESTAMP', 'amount_usd': 'DECIMAL'},
    partition_spec='days(order_ts)'
)

# Append in 5 micro-batches (mimics Flink checkpoint commits)
for batch_idx in range(5):
    day = f"2024-09-0{batch_idx + 1}"
    files = []
    for file_idx in range(random.randint(2, 4)):
        n_rows = random.randint(1000, 5000)
        partition_values = {'order_ts_day': day}
        path = f"s3://bucket/warehouse/orders_fct/data/{day}/file-{batch_idx}-{file_idx}.parquet"
        files.append(DataFile(path, n_rows, partition_values,
                              n_rows * 64))  # 64 bytes/row
    snapshot = table.append(files)
    print(f"Commit {batch_idx + 1}: snapshot_id={snapshot.snapshot_id}, "
          f"parent={snapshot.parent_id}, op={snapshot.operation}, "
          f"added_files={snapshot.summary['added-data-files']}, "
          f"added_rows={snapshot.summary['added-records']}")

print()
print("=== Manifest tree (current snapshot) ===")
print(f"  Current snapshot: {table.current_snapshot.snapshot_id}")
print(f"  Total snapshots:  {len(table.snapshots)}")
files = table.read()
print(f"  Files reachable: {len(files)}")
total_rows = sum(f.n_rows for f in files)
total_bytes = sum(f.size_bytes for f in files)
print(f"  Total rows:       {total_rows:,}")
print(f"  Total bytes:      {total_bytes:,} ({total_bytes/1024/1024:.1f} MB)")

print()
print("=== Time travel — read as-of 3rd snapshot ===")
snap_id_3 = table.snapshots[2].snapshot_id
files_3 = table.read(snapshot_id=snap_id_3)
print(f"  Snapshot {snap_id_3} has {len(files_3)} files, "
      f"{sum(f.n_rows for f in files_3):,} rows")

print()
print("=== Snapshot expiry — keep last 3 snapshots ===")
expired = table.expire_snapshots(keep_last_n=3)
print(f"  Expired {len(expired)} old snapshots (their data files are now GC'd)")
print(f"  Remaining snapshots: {[s.snapshot_id for s in table.snapshots]}")

print()
print("=== Partition pruning (read only UK-day partition) ===")
target_part = {'order_ts_day': '2024-09-03'}
pruned = [f for f in files if f.partition_values == target_part]
print(f"  Partition {target_part}: {len(pruned)} files, "
      f"{sum(f.n_rows for f in pruned):,} rows (avoided scanning {len(files) - len(pruned)} other files)")
print()
print("Key insight: Iceberg's manifest tree stores partition values in")
print("Avro manifests — readers prune files without opening the Parquet data.")
print("This is what makes Iceberg queries fast on petabyte-scale tables.")`;

// ============================================================
// Manifest tree SVG diagram
// ============================================================

function ManifestTreeDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("snapshot");
  const nodes = {
    "metadata.json": { label: "metadata.json", desc: "Table-level config: schema, partition spec, properties, current-snapshot pointer", level: 0 },
    "snapshot": { label: "Snapshot (current)", desc: "Atomic commit: parent_id + manifest_list pointer + commit summary", level: 1 },
    "manifest_list": { label: "Manifest List", desc: "Avro file: list of manifests (one per partition spec)", level: 2 },
    "manifest_1": { label: "Manifest 1 (days(order_ts))", desc: "Avro file: list of data files + their partition values", level: 3 },
    "manifest_2": { label: "Manifest 2 (legacy spec)", desc: "Old partition spec, retained for backward compat", level: 3 },
    "data_1": { label: "Data File 1 (Parquet)", desc: "s3://bucket/.../2024-09-01/file-001.parquet", level: 4 },
    "data_2": { label: "Data File 2 (Parquet)", desc: "s3://bucket/.../2024-09-01/file-002.parquet", level: 4 },
    "data_3": { label: "Data File 3 (Parquet)", desc: "s3://bucket/.../2024-09-02/file-003.parquet", level: 4 },
  };
  const edges = [
    ["metadata.json", "snapshot"],
    ["snapshot", "manifest_list"],
    ["manifest_list", "manifest_1"],
    ["manifest_list", "manifest_2"],
    ["manifest_1", "data_1"],
    ["manifest_1", "data_2"],
    ["manifest_1", "data_3"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "metadata.json": { x: 200, y: 30 },
    "snapshot": { x: 200, y: 70 },
    "manifest_list": { x: 200, y: 110 },
    "manifest_1": { x: 120, y: 150 },
    "manifest_2": { x: 280, y: 150 },
    "data_1": { x: 60, y: 190 },
    "data_2": { x: 120, y: 190 },
    "data_3": { x: 180, y: 190 },
  };

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Atom className="h-3.5 w-3.5 text-primary" />
          Iceberg manifest tree — metadata → snapshot → manifest list → manifests → data files
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 400 230" className="w-full h-auto">
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
              node.level === 3 ? "var(--chart-4)" : "var(--muted-foreground)";
            return (
              <motion.g key={id}
                onMouseEnter={() => setActiveNode(id)}
                onMouseLeave={() => setActiveNode(null)}
                animate={{ scale: isActive ? 1.05 : 1 }}
                style={{ cursor: "pointer" }}
              >
                <rect x={pos.x - 50} y={pos.y - 10} width="100" height="22" rx="3"
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
            Hover any node to see its role — the tree is walked top-down on every read.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Three-format comparison table
// ============================================================

function FormatComparisonTable() {
  const rows = [
    { feature: "Origin", iceberg: "Netflix (2017)", delta: "Databricks (2017)", hudi: "Uber (2016)" },
    { feature: "File format", iceberg: "Parquet, ORC, Avro", delta: "Parquet only", hudi: "Parquet, ORC" },
    { feature: "Hidden partitioning", iceberg: "Yes — strongest feature", delta: "No (need partition by)", hudi: "Yes (bucket & partition)" },
    { feature: "Schema evolution", iceberg: "Full (add/drop/rename)", delta: "Full", hudi: "Full" },
    { feature: "Time travel", iceberg: "Yes (snapshot ID / timestamp)", delta: "Yes (version N)", hudi: "Yes (instant time)" },
    { feature: "Upsert performance", iceberg: "Good (v2 row deletes)", delta: "Good (MERGE)", hudi: "Best (COPY_ON_WRITE / MERGE_ON_READ)" },
    { feature: "CDC ingestion", iceberg: "Via Flink/Spark", delta: "Via CDF", hudi: "Native (designed for it)" },
    { feature: "Compaction", iceberg: "Manual (rewrite_data_files)", delta: "Automatic (OPTIMIZE)", hudi: "Native (hoodie compact)" },
    { feature: "Catalog options", iceberg: "REST, Glue, Hive, Nessie, Unity", delta: "Unity, Hive, S3", hudi: "Hive, Glue, REST" },
    { feature: "Best fit", iceberg: "General-purpose lakehouse", delta: "Databricks ecosystem", hudi: "Streaming-heavy CDC" },
    { feature: "Adoption", iceberg: "Netflix, Apple, Stripe", delta: "All Databricks customers", hudi: "Uber, Walmart, ByteDance" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          Iceberg vs Delta vs Hudi — sibling open table formats
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold text-primary">Iceberg</th>
              <th className="text-left px-3 py-2 font-semibold">Delta Lake</th>
              <th className="text-left px-3 py-2 font-semibold">Hudi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-primary/80">{r.iceberg}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.delta}</td>
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
  { label: "Origin", value: "Netflix 2017", hint: "Netflix engineering open-sourced Iceberg to handle petabytes of page-view + engagement data", deltaTone: "flat" as const },
  { label: "Production scale", value: "PB-scale", hint: "Single tables at Netflix/Apple exceed 100s of PB; queries prune to relevant partitions in seconds", deltaTone: "up" as const },
  { label: "Catalogs", value: "5 (REST, Glue, Hive, Nessie, Unity)", hint: "Vendor-neutral — same table readable from Spark, Trino, Flink, DuckDB, Athena, Snowflake", deltaTone: "flat" as const },
  { label: "Compute engines", value: "8+", hint: "Spark · Trino · Flink · DuckDB · Athena · Snowflake · Impala · BeeHyve", deltaTone: "up" as const },
];

export function IcebergPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Apache Iceberg · open table format · lakehouse"
        title="Apache Iceberg — the open table format for the modern lakehouse"
        description="Iceberg gives the ACID + SQL + time-travel semantics of a data warehouse to cheap S3/ADLS/GCS object storage. Born at Netflix (2017) to handle petabytes of page-view data, it is now the production table format at Netflix, Apple, Stripe, and many others. The Iceberg manifest tree (metadata.json → snapshot → manifest list → manifests → Parquet data files) is the key innovation — it enables hidden partitioning (users don't write WHERE-clauses to hit partitions), O(1) time travel, schema evolution without file rewrites, and atomic commits across compute engines. Vendor-neutral: same table readable from Spark, Trino, Flink, DuckDB, Athena, Snowflake, Impala — no lock-in."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Layers className="h-3 w-3" /> Iceberg v2</Badge>
            <Badge variant="outline" className="gap-1.5"><Atom className="h-3 w-3" /> Manifest tree</Badge>
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

      {/* Manifest tree architecture */}
      <SectionCard
        title="Manifest tree — Iceberg's key innovation"
        description="Iceberg's metadata is layered: a top-level metadata.json holds the table schema, partition spec, properties, and a pointer to the current snapshot. Each snapshot references a manifest list (Avro file). Each manifest list references manifests (Avro files). Each manifest references data files (Parquet). This 5-level tree is walked top-down on every read — readers prune files based on partition values stored IN THE MANIFEST (not in the file path), so partition pruning happens without opening Parquet files."
        icon={<Atom className="h-5 w-5" />}
        badge="architecture"
      >
        <ManifestTreeDiagram />
      </SectionCard>

      {/* Spark SQL */}
      <SectionCard
        title="Spark SQL — create, query, time-travel, schema-evolve an Iceberg table"
        description="Spark 3.5+ is the primary write engine for Iceberg. This block covers the full lifecycle: create a partitioned Iceberg table with v2 spec (enables row-level deletes), hidden partitioning (days(order_ts) — users query WHERE order_ts >= ..., Iceberg prunes files automatically), time travel (VERSION AS OF / TIMESTAMP AS OF), schema evolution (ALTER TABLE ADD COLUMN — no file rewrite), MERGE INTO for upserts, and Nessie branching."
        icon={<Database className="h-5 w-5" />}
        badge="Spark SQL"
      >
        <CodeBlock code={SPARK_ICEBERG_SQL} language="sql" filename="iceberg_spark.sql" highlight={[18, 19, 20, 29, 30, 33, 34, 47, 48, 49, 50, 51, 52, 53, 54, 55]} />
      </SectionCard>

      {/* PyIceberg */}
      <SectionCard
        title="PyIceberg — pure-Python client (no JVM)"
        description="PyIceberg lets you create tables, append Arrow batches, scan with time-travel, and expire snapshots — all from Python without spinning up a JVM Spark cluster. Use cases: small ETL jobs, notebook analytics, CI/CD pipelines that need to read/write Iceberg tables directly. The Arrow integration is zero-copy — Iceberg's manifest reader returns Arrow record batches without serialisation."
        icon={<Workflow className="h-5 w-5" />}
        badge="Python"
      >
        <CodeBlock code={PYICEBERG_PYTHON} language="python" filename="iceberg_pyiceberg.py" highlight={[15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 70, 71, 72, 73]} />
      </SectionCard>

      {/* Trino */}
      <SectionCard
        title="Trino — federated SQL on Iceberg (no Spark needed)"
        description="Trino (the Presto fork, ~2020) is the gold-standard federated SQL engine for the data lake. It treats Iceberg tables as first-class — no Spark needed. Trino's vectorised execution makes Iceberg queries 5-10× faster than equivalent Spark SQL on the same hardware. Crucially, Trino can JOIN across catalogs: an Iceberg table on S3 + a MySQL customer table + a Kafka topic — all in one federated query."
        icon={<Cpu className="h-5 w-5" />}
        badge="Trino SQL"
      >
        <CodeBlock code={TRINO_ICEBERG_SQL} language="sql" filename="iceberg_trino.sql" highlight={[10, 11, 12, 13, 14, 23, 24, 25, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 48, 49, 50, 51, 52, 53, 54, 55]} />
      </SectionCard>

      {/* Flink */}
      <SectionCard
        title="Flink + Iceberg — exactly-once streaming writes"
        description="Flink is the streaming-first engine for Iceberg writes. Each Flink checkpoint commits a micro-batch atomically (two-phase commit on checkpoint) — no partial writes ever visible. The v2 Iceberg spec enables upsert mode (MERGE instead of append) — perfect for CDC ingestion from Debezium. An hourly compaction job merges small files into 512 MB target files to prevent the 'small files problem' that degrades read performance over time."
        icon={<Activity className="h-5 w-5" />}
        badge="Flink SQL"
      >
        <CodeBlock code={FLINK_ICEBERG_SQL} language="sql" filename="iceberg_flink.sql" highlight={[20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45]} />
      </SectionCard>

      {/* DuckDB */}
      <SectionCard
        title="DuckDB — laptop-scale analytics on the same Iceberg tables"
        description="DuckDB 0.10+ ships an Iceberg reader that queries production Iceberg tables directly — no Spark/Trino cluster needed. Perfect for: ad-hoc analytics on a laptop, CI/CD pipelines that need to inspect lake data, or local development against production-style tables. The same manifest-tree pruning applies — DuckDB reads only the relevant Parquet data files."
        icon={<Database className="h-5 w-5" />}
        badge="DuckDB SQL"
      >
        <CodeBlock code={DUCKDB_ICEBERG_SQL} language="sql" filename="iceberg_duckdb.sql" highlight={[10, 11, 12, 13, 14, 15, 24, 25, 26, 28, 29, 30, 33, 34, 35, 36, 37, 38, 39, 40]} />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: build an Iceberg table in your browser (Pyodide)"
        description="Pure-Python simulation of the Iceberg manifest tree — no JVM, no S3, just in-browser. Build a synthetic Iceberg table from scratch: create snapshots + manifests + data files via 5 micro-batch commits (mimics Flink checkpoints), walk the manifest tree to read, time-travel read as-of an earlier snapshot, expire old snapshots (garbage collection), and see partition pruning avoid scanning irrelevant files."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={PYODIDE_DEMO} buttonLabel="Run Iceberg manifest simulation (Pyodide)" />
      </SectionCard>

      {/* Comparison table */}
      <SectionCard
        title="Iceberg vs Delta vs Hudi — sibling open table formats"
        description="Three open table formats compete for the lakehouse metadata layer. Iceberg (Netflix origin) emphasises hidden partitioning + vendor-neutral catalogs. Delta Lake (Databricks origin) is the most widely-deployed due to the Databricks ecosystem. Hudi (Uber origin) is the upsert-first specialist — best for streaming CDC ingestion. They are converging on feature parity; the choice is increasingly driven by ecosystem fit (Spark/Trino vs Databricks vs Flink)."
        icon={<Boxes className="h-5 w-5" />}
      >
        <FormatComparisonTable />
      </SectionCard>

      {/* Why this evolved */}
      <SectionCard
        title="Why Iceberg evolved — shortfalls of Hive-on-S3 (Era 2)"
        description="Modern data engineers prefer Iceberg because Hive-on-S3 (the prior generation) had four critical shortfalls that made PB-scale analytics painful. Iceberg was designed ground-up to fix all four simultaneously."
        icon={<History className="h-5 w-5" />}
        badge="Why Iceberg"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: Path-based partitions were fragile.</strong> Hive partition pruning required <code className="font-mono">WHERE date='2024-09-01'</code> to match exactly the partition spec — analysts who wrote <code className="font-mono">WHERE order_ts &gt;= current_date() - 7</code> hit ALL files (no pruning). Iceberg's hidden partitioning stores the transform (days(order_ts)) in metadata — users write natural WHERE clauses, Iceberg computes the partition predicate automatically. <strong className="text-foreground/80">Result:</strong> 10-100× faster queries on partitioned tables because pruning actually happens.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: Schema evolution broke downstream.</strong> Hive bound column names to file positions — adding a column required rewriting every Parquet file. Renaming a column broke every downstream query. Iceberg assigns each column a stable ID (1, 2, 3...) at create time; renames just update metadata.json (column 3 is now called ship_country instead of ship_ctry). Old Parquet files still have column 3 with its old name — Iceberg remaps on read. <strong className="text-foreground/80">Result:</strong> schema evolution without file rewrites, zero downtime for downstream consumers.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: No time travel.</strong> Hive had no concept of "read the table as-of yesterday" — analysts wanting reproducibility had to manually snapshot tables. Iceberg's snapshot chain (every commit creates a new snapshot, old ones retained 90 days) makes VERSION AS OF N / TIMESTAMP AS OF a first-class query feature. <strong className="text-foreground/80">Result:</strong> reproducible ML training (read features as-of the training cutoff), audit-compliant queries (read as-of a past date), and bug-reproducibility (run today's query against yesterday's data).
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: No atomic commits.</strong> Hive writes weren't atomic — concurrent writes could interleave, producing torn reads. Iceberg's manifest tree uses compare-and-swap on the metadata.json pointer — only one write commits at a time. <strong className="text-foreground/80">Result:</strong> multi-writer concurrency on the same table without coordination; perfect for streaming CDC + batch analytics writing simultaneously.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique Iceberg features (vs Delta + Hudi)"
        description="Iceberg has four features that are genuinely unique — not marketing fluff, but structural differentiators that no other open table format has yet matched."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. Hidden partitioning</p>
            <p className="text-muted-foreground">Partition transforms (days, hours, bucket, truncate) stored in metadata — users never write WHERE on partition keys. <strong>Delta + Hudi still require path-based partitions.</strong> This is Iceberg's #1 killer feature.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Vendor-neutral catalogs</p>
            <p className="text-muted-foreground">5 catalog backends: REST, Glue, Hive, Nessie, Unity — all conform to the same Iceberg REST API. <strong>Delta is Unity-locked; Hudi is Hive-first.</strong> Iceberg wins on portability.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Multi-engine read/write</p>
            <p className="text-muted-foreground">8+ compute engines: Spark, Trino, Flink, DuckDB, Athena, Snowflake, Impala, BeeHyve — all read/write natively. <strong>No other format has 8+ engines.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Manifest-tree partition pruning</p>
            <p className="text-muted-foreground">Manifests store partition values in Avro — readers prune files without opening Parquet. <strong>Delta + Hudi prune via Parquet stats (slower — requires opening file footers).</strong></p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples cards */}
      <SectionCard
        title="3 large-dataset examples — cards with 5-language code popups"
        description="Three production-style dataset examples showing Iceberg in action. Each is a clickable card opening a lazy popup with: scenario brief (dataset/scale/why), dataset stats grid, computational tooling, multi-language code in Scala + Rust + Go + Elixir + Zig, and an implementation insight. All datasets are real public data or synthetic Uber-scale equivalents."
        icon={<Database className="h-5 w-5" />}
        badge="3 examples × 5 langs"
      >
        <DatasetCards
          examples={ICEBERG_EXAMPLES}
          intro="Real public datasets (Wikipedia Pageviews 1.5TB/mo, NYC TLC 50GB/yr, NOAA Climate 500GB) + synthetic Uber-scale equivalents. Each card has Scala/Rust/Go/Elixir/Zig code with the unique Iceberg differentiator."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the Iceberg ecosystem"
        description="Iceberg's compute-engine ecosystem is the broadest of any open table format — 8+ engines read/write Iceberg natively. The catalog layer (5 implementations) provides vendor-neutral metadata management."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Compute engines (8+)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Apache Spark 3.5+</strong> — primary write engine (PySpark/Scala/SQL/R)</li>
              <li>• <strong>Trino 425+</strong> — federated SQL (fastest Iceberg reads)</li>
              <li>• <strong>Apache Flink 1.18+</strong> — streaming CDC ingestion (exactly-once)</li>
              <li>• <strong>DuckDB 0.10+</strong> — laptop-scale analytics (no cluster)</li>
              <li>• <strong>AWS Athena</strong> — serverless Trino on S3</li>
              <li>• <strong>Snowflake Polar Federation</strong> — Snowflake reads external Iceberg</li>
              <li>• <strong>Apache Impala 4.0+</strong> — Cloudera Hadoop clusters</li>
              <li>• <strong>PyIceberg</strong> — pure-Python client (no JVM)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cloud className="h-3.5 w-3.5 text-primary" /> Catalogs (5)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>REST Catalog</strong> — Apache spec, any impl (Tabular, custom)</li>
              <li>• <strong>AWS Glue Data Catalog</strong> — AWS-managed, multi-tenant</li>
              <li>• <strong>Apache Hive Metastore</strong> — legacy, self-hosted</li>
              <li>• <strong>Project Nessie</strong> — Git-for-data branching (Dremio)</li>
              <li>• <strong>Databricks Unity Catalog</strong> — Databricks governance-first</li>
              <li>• <strong>Snowflake Polaris</strong> — Apache-licensed REST catalog (2024)</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers and production blog posts that defined Iceberg + the lakehouse movement. The Armbrust 2020 lakehouse paper is the academic foundation; the Netflix + Apple + Stripe engineering blogs document production scale."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Armbrust et al. 2020 (CIDR):</strong> "Lakehouse: A New Generation of Open Platforms that Make Data-Pluralism the Norm." Argued that the data lake + warehouse split was a historical accident — open table formats (Iceberg, Delta, Hudi) could give lakes the ACID + SQL + schema semantics of warehouses, while keeping cheap S3 storage and compute-spark-on-demand economics. Introduced the term "lakehouse" and is the foundational academic reference for the entire movement.
          </p>
          <p>
            <strong className="text-foreground/80">Netflix Iceberg Origin (Ryan Blue et al., 2017-2018):</strong> "Engineering Netflix's Distributed Time-Travel Infrastructure." Netflix faced petabytes of page-view + engagement data on Hive — Hive's partition pruning was path-based (WHERE date='2024-09-01' had to match exactly the partition spec), schema evolution broke downstream queries, and time travel required snapshot IDs in user code. Iceberg's hidden partitioning (partition transform stored in metadata), schema evolution (column IDs stable across renames), and snapshot ID lookup in metadata.json were designed to fix all three.
          </p>
          <p>
            <strong className="text-foreground/80">Apple Production Case Study (Apple Eng Blog 2021):</strong> Migrated ~50 PB of Hive tables to Iceberg on S3 + REST catalog + Trino + Spark. Result: 4× faster ad-hoc queries (partition pruning in manifests), 60% reduction in small-files count (auto-compaction), zero downtime schema evolution (added 200+ columns to production tables without rewriting a single Parquet file).
          </p>
          <p>
            <strong className="text-foreground/80">Stripe Production Case (Stripe Eng 2022):</strong> Iceberg on S3 + Nessie catalog (git-for-data semantics) for the payments analytics lake. Branch-based development: analysts create a Nessie branch for an experiment, query and modify tables on the branch, then merge or discard — production tables untouched. Each analyst's experiment is a fully isolated Iceberg snapshot tree.
          </p>
          <p>
            <strong className="text-foreground/80">Apache Iceberg Spec v2 (2022):</strong> Added row-level deletes via delete files — supports MERGE INTO without rewriting the underlying Parquet. Major perf win for CDC upserts and GDPR right-to-be-forgotten — old rows marked deleted in a small delta file rather than rewriting the data file.
          </p>
          <p>
            <strong className="text-foreground/80">Nessie Catalog (Dremio 2020):</strong> "Git-for-data" — branch + tag + commit semantics on Iceberg tables. Lets analysts experiment on isolated branches without touching production. Now an Apache project (incubating). Stripe and a few others use Nessie as their primary catalog.
          </p>
          <p>
            <strong className="text-foreground/80">Snowflake Polaris Catalog (2024):</strong> Snowflake's open-source REST catalog for Iceberg tables. Lets Snowflake + Spark + Trino + DuckDB all read the same Iceberg tables through one catalog service. Snowflake made Polaris open-source specifically to win the catalog battle — they see catalog-as-control-plane as the future.
          </p>
        </div>
      </SectionCard>

      {/* Deeper-thought insight */}
      <SectionCard
        title="My deeper thought: Iceberg's manifest tree IS a write-ahead log"
        description="The unifying view: Iceberg's manifest tree is structurally a write-ahead log layered on top of immutable Parquet files. Each snapshot is a log entry; the manifest list is the log's tombstone tracker; the data files are the immutable WAL segments."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Iceberg's manifest tree IS a write-ahead log.</strong> Every database engine since the 1970s uses a WAL: writes go to an append-only log first, then get checkpointed to immutable storage. Iceberg does exactly this — the metadata.json → snapshot chain is the log; Parquet data files are the immutable checkpoint. When you read, you walk the log to the current snapshot, then materialise. When you write, you append a new log entry (snapshot) referencing new data files. Time travel is just "read the log as-of position N" — same as PostgreSQL's MVCC snapshot, same as Kafka's offset, same as Bitcoin's block height. There is nothing exotic here — Iceberg's "innovation" is recognising that the WAL pattern applies to data lake files.
          </p>
          <p>
            <strong className="text-foreground/80">Hidden partitioning IS deferred partition naming.</strong> Traditional Hive partitions are path-based — the partition value lives in the directory name (s3://bucket/date=2024-09-01/file.parquet). Users MUST write WHERE date='2024-09-01' to hit the partition. Iceberg instead stores the partition transform (days(order_ts)) IN THE METADATA — the path is just an opaque hash, the manifest carries the partition value. Users write <code className="font-mono">WHERE order_ts &gt;= current_date - 7</code> and Iceberg computes the partition predicate itself. This is exactly the deferred-naming pattern of late-binding columnar formats (Parquet's row groups have min/max stats, DuckDB prunes on them) — applied at the partition level. The user doesn't need to know how data is partitioned; Iceberg figures it out.
          </p>
          <p>
            <strong className="text-foreground/80">Schema evolution IS late binding + column IDs.</strong> Traditional SQL tables bind column names to file positions — adding/dropping columns requires rewriting every file. Iceberg assigns each column a stable ID (1, 2, 3...) at create time; renames just update the metadata.json (column 3 is now called "ship_country" instead of "ship_ctry"); adds just append ID N+1 to the schema; drops just mark the column as removed. Old Parquet files still have column 3 with its old name — Iceberg remaps on read. This is exactly the symbol-table pattern of every compiled language — the runtime resolves "ship_country" to column ID 3, and the file is read by ID, not name. Same as protobuf field numbers.
          </p>
          <p>
            <strong className="text-foreground/80">Time travel IS the snapshot log being readable at any past point.</strong> SELECT * FROM t VERSION AS OF N is exactly SELECT * FROM t AT WAL_POSITION N. PostgreSQL does this with xmin/xmax in tuple headers; Kafka does it with log offsets; Iceberg does it with snapshot_id. The economics differ — Iceberg keeps old snapshots for 90 days by default, PostgreSQL rolls back its MVCC after vacuum, Kafka can keep offsets for weeks — but the pattern is identical. The "innovation" is choosing to expose this to the user as a first-class query feature.
          </p>
          <p>
            <strong className="text-foreground/80">Iceberg IS to data lakes what PostgreSQL was to shared-nothing.</strong> Before PostgreSQL, every database had its own storage format + query engine tightly coupled. PostgreSQL's WAL + MVCC + ACID on shared storage became the reference implementation that everyone forked (Redshift, Greenplum, CockroachDB, YugabyteDB). Iceberg is doing the same for the data lake — its spec is being reimplemented by 8+ compute engines, with 5+ catalog backends. The format is the standard; the implementations are interchangeable. This is what "vendor-neutral" actually means.
          </p>
        </div>
      </SectionCard>

      <RelatedTopics topics={[
        { id: "data-lakehouse" as const, reason: "Anchor concept page — lake→lakehouse evolution" },
        { id: "delta-lake" as const, reason: "Sibling open table format (Databricks)" },
        { id: "hudi" as const, reason: "Sibling open table format (Uber, upsert-first)" },
        { id: "glue" as const, reason: "AWS-native catalog + ETL for Iceberg tables" },
        { id: "catalogs" as const, reason: "REST, Glue, Nessie, Unity, Polaris catalogs compared" },
        { id: "databricks" as const, reason: "Spark as the primary Iceberg write engine" },
        { id: "arrow" as const, reason: "Parquet = columnar file format underneath Iceberg" },
        { id: "streaming" as const, reason: "Flink + Kafka CDC → Iceberg streaming writes" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("data-lakehouse")} className="text-sm text-primary hover:underline">
          &rarr; Data Lakehouse (concept anchor page)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("delta-lake")} className="text-sm text-primary hover:underline">
          &rarr; Delta Lake (sibling format, Databricks)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("hudi")} className="text-sm text-primary hover:underline">
          &rarr; Apache Hudi (sibling format, Uber)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("glue")} className="text-sm text-primary hover:underline">
          &rarr; AWS Glue (catalog + serverless ETL)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("catalogs")} className="text-sm text-primary hover:underline">
          &rarr; Catalogs comparison (Glue vs Nessie vs Unity vs Polaris)
        </Link>
      </div>
    </div>
  );
}

