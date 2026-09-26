"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { CLICKHOUSE_SCIENCE_EXAMPLES } from "../_components/_dataset_examples10";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Layers, Boxes, Database, Workflow, Zap, GitBranch, History, ShieldCheck,
  Atom, Activity, FileText, ExternalLink, Network, Sparkles, Cpu, TrendingUp,
  Server, Cloud, Code2, Microscope, Radio,
} from "lucide-react";

// ============================================================
// Code snippets
// ============================================================

const CH_CREATE_TABLE_SQL = `-- ============================================================
-- ClickHouse — open-source columnar OLAP database
-- MergeTree engine family, vectorised SIMD, Yandex origin (2016)
-- ============================================================

-- Create a MergeTree table partitioned by hour, ORDER BY for primary index
CREATE TABLE moderndatascieng.events (
  event_id        UInt64,
  device_id       String,
  event_ts        DateTime64(3),
  metric_name     LowCardinality(String),   -- enum-like, 1-2 bits
  metric_value    Float64,
  quality         LowCardinality(String),
  is_anomaly      Boolean
) ENGINE = MergeTree
PARTITION BY toStartOfHour(event_ts)               -- 1 partition per hour
ORDER BY (device_id, event_ts)                     -- primary index
SETTINGS index_granularity = 8192,                  -- 1 index entry per 8192 rows
         use_minimalistic_part_header = 1,
         ttl_only_drop_parts = 1;

-- The primary index is sparse — 1 entry per 8192 rows (index_granularity)
-- ORDER BY (device_id, event_ts): queries on (device_id, event_ts)
-- range prune via the primary index — sub-second on 1B rows.

-- Partition prune: queries with WHERE event_ts >= now() - 1 HOUR
-- scan only the current hour's partition (1 of 8760/year).
SELECT
  toStartOfMinute(event_ts) AS minute,
  avg(metric_value)         AS avg_value,
  count(*)                  AS sample_count
FROM moderndatascieng.events
WHERE device_id = 'device-A0001'
  AND event_ts >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute;

-- MergeTree family: special-purpose engines
--   MergeTree                  — default, immutable parts
--   ReplacingMergeTree         — dedupe on version column (eventual)
--   SummingMergeTree           — pre-sum numeric columns on merge
--   AggregatingMergeTree       — pre-aggregate via avgState/sumState
--   CollapsingMergeTree        — delete via sign column (-1 inserts)
--   VersionedCollapsingMergeT  — versioned + sign for ordered collapse

-- TTL — auto-drop old partitions (data lifecycle)
ALTER TABLE moderndatascieng.events
  MODIFY TTL event_ts + INTERVAL 30 DAY;

-- Mutations (UPDATE/DELETE) — asynchronous, rewrite-merge
ALTER TABLE moderndatascieng.events
  UPDATE metric_value = metric_value * 1.05
  WHERE event_ts >= '2024-09-01' AND event_ts < '2024-09-02';`;

const CH_MATERIALIZED_VIEW_SQL = `-- ============================================================
-- ClickHouse Materialised Views — incremental pre-aggregation
-- Powered by AggregatingMergeTree + State functions (avgState, etc.)
-- ============================================================

-- Materialised view: per-device per-minute mean (pre-aggregated on insert)
CREATE TABLE moderndatascieng.events_per_minute_mv
ENGINE = AggregatingMergeTree
PARTITION BY toStartOfHour(ts)
ORDER BY (device_id, ts)
AS SELECT
  device_id,
  toStartOfMinute(event_ts) AS ts,
  avgState(metric_value)    AS avg_value_state,
  countState()              AS count_state,
  maxState(metric_value)    AS max_value_state
FROM moderndatascieng.events
GROUP BY device_id, ts;

-- Trigger: insert into events triggers insert into the MV table
CREATE MATERIALIZED VIEW moderndatascieng.events_per_minute_mv_trigger
TO moderndatascieng.events_per_minute_mv
AS SELECT
  device_id,
  toStartOfMinute(event_ts) AS ts,
  avgState(metric_value)    AS avg_value_state,
  countState()              AS count_state,
  maxState(metric_value)    AS max_value_state
FROM moderndatascieng.events
GROUP BY device_id, ts;

-- Query the MV — uses pre-aggregated state (avgMerge, countMerge, maxMerge)
SELECT
  ts,
  avgMerge(avg_value_state) AS avg_value,
  countMerge(count_state)  AS sample_count,
  maxMerge(max_value_state) AS max_value
FROM moderndatascieng.events_per_minute_mv
WHERE device_id = 'device-A0001'
  AND ts >= now() - INTERVAL 1 HOUR
GROUP BY ts
ORDER BY ts;

-- The MV is automatically maintained — every insert into events
-- triggers an insert into the MV table (incremental aggregation).
-- Old partitions are merged via background merges (MergeTree family).

-- Refreshable MVs (2024+) — fully recomputed on schedule
CREATE REFRESHABLE MV moderndatascieng.events_hourly_refresh
REFRESH EVERY 1 HOUR
AS SELECT
  toStartOfHour(event_ts) AS hour,
  device_id,
  avg(metric_value)        AS avg_value
FROM moderndatascieng.events
WHERE event_ts >= now() - INTERVAL 24 HOUR
GROUP BY 1, 2;`;

const CH_PYTHON = `# ============================================================
# clickhouse-connect — Python client for ClickHouse
#   pip install clickhouse-connect
# ============================================================

import clickhouse_connect
import pandas as pd

# Connect via HTTP (8123) or native TCP (9000)
client = clickhouse_connect.get_client(
    host="clickhouse.cluster.local",
    port=8123,                          # HTTP port
    username="default",
    password="secret",
    database="moderndatascieng",
    interface="https",                   # TLS
    secure=True,
)

# --- DDL: create table ---
client.command("""
CREATE TABLE moderndatascieng.events (
  event_id     UInt64,
  device_id    String,
  event_ts     DateTime64(3),
  metric_name  LowCardinality(String),
  metric_value Float64
) ENGINE = MergeTree
PARTITION BY toStartOfHour(event_ts)
ORDER BY (device_id, event_ts)
""")

# --- Stream inserts — high throughput via Arrow batches ---
# ClickHouse handles 1M+ rows/sec per insert (batch size 100K-1M)
batch = pd.DataFrame({
    "event_id":     range(1, 100_001),
    "device_id":    ["device-A0001"] * 100_000,
    "event_ts":     pd.date_range("2024-09-01", periods=100_000, freq="100ms"),
    "metric_name":  ["temperature"] * 100_000,
    "metric_value": pd.np.random.normal(50, 5, 100_000),
})
client.insert_df("moderndatascieng.events", batch)

# --- Query — vectorised SIMD scans 1B rows in seconds ---
df = client.query_df("""
SELECT
  toStartOfMinute(event_ts) AS minute,
  avg(metric_value)         AS avg_value,
  count(*)                  AS n_samples
FROM moderndatascieng.events
WHERE device_id = 'device-A0001'
  AND event_ts >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute
""")
print(df.head())

# --- Anomaly detection: z-score per device (hourly vs weekly) ---
df = client.query_df("""
WITH last_hour AS (
  SELECT device_id, avg(metric_value) AS h_avg
  FROM events
  WHERE event_ts >= now() - INTERVAL 1 HOUR
  GROUP BY device_id
),
last_week AS (
  SELECT device_id, avg(metric_value) AS w_avg,
         stddevPop(metric_value) AS w_std
  FROM events
  WHERE event_ts >= now() - INTERVAL 7 DAY
  GROUP BY device_id
)
SELECT l.device_id, l.h_avg, w.w_avg, w.w_std,
       abs(l.h_avg - w.w_avg) / w.w_std AS z_score
FROM last_hour l JOIN last_week w USING device_id
WHERE w.w_std > 0 AND abs(l.h_avg - w.w_avg) / w.w_std > 3
ORDER BY z_score DESC LIMIT 50
""")
print(f"{len(df)} anomalies detected")`;

const CH_KAFKA_INGEST = `-- ============================================================
-- ClickHouse + Kafka — real-time ingestion at 1B events/day
-- Kafka → Kafka table engine → MV → MergeTree (Bronze tier)
-- ============================================================

-- 1. Kafka table engine — streams from Kafka topic
CREATE TABLE moderndatascieng.kafka_events_src (
  event_id      UInt64,
  device_id     String,
  event_ts      DateTime64(3),
  metric_name   LowCardinality(String),
  metric_value  Float64,
  quality       LowCardinality(String)
) ENGINE = Kafka
SETTINGS
  kafka_broker_list = 'kafka-1:9092,kafka-2:9092,kafka-3:9092',
  kafka_topic_list = 'iot.events.raw',
  kafka_group_name = 'clickhouse-ingest-group',
  kafka_format = 'JSONEachRow',
  kafka_num_consumers = 8,                  -- 8 parallel consumers
  kafka_thread_per_consumer = 1,
  kafka_handle_error_mode = 'stream';

-- 2. Materialised view: Kafka → MergeTree (atomic, exactly-once via Kafka offsets)
CREATE MATERIALIZED VIEW moderndatascieng.events_ingest_mv
TO moderndatascieng.events
AS SELECT
  event_id, device_id, event_ts, metric_name, metric_value, quality
FROM moderndatascieng.kafka_events_src
WHERE quality IN ('good', 'unknown');

-- 3. Throughput: 1B events/day = ~12K events/sec avg, peak 50K/sec
--    8 Kafka consumers × 5K/sec/consumer = 40K events/sec capacity
--    Partitioned by hour → 24 partitions/day, ~40M events/hour

-- 4. Errors go to a dead-letter table for re-processing
CREATE TABLE moderndatascieng.events_errors (
  raw_payload String,
  error_reason String,
  error_ts     DateTime64(3) DEFAULT now()
) ENGINE = MergeTree
PARTITION BY toStartOfDay(error_ts)
ORDER BY error_ts;

CREATE MATERIALIZED VIEW moderndatascieng.events_errors_mv
TO moderndatascieng.events_errors
AS SELECT
  _raw_message AS raw_payload,
  _error_reason AS error_reason
FROM moderndatascieng.kafka_events_src
WHERE _error_reason != '';

-- 5. Background merges — ClickHouse merges small parts into larger ones
--    (0-10 → 0-100 → 0-1000 → 0-10000...) every ~10 minutes
--    Final part size: ~150 GB per partition (configurable)`;

const CH_VECTORISED_SIMD = `-- ============================================================
-- ClickHouse vectorised SIMD execution — 10-100x faster than row-based
-- All operations batch across columns using AVX2/AVX-512
-- ============================================================

-- Vectorised aggregation: avg() scans column in chunks of 2000+ rows
-- per CPU instruction (AVX-512 processes 8 doubles per cycle)
EXPLAIN
SELECT
  device_id,
  toStartOfMinute(event_ts) AS minute,
  avg(metric_value),
  max(metric_value),
  quantile(0.99)(metric_value)
FROM moderndatascieng.events
WHERE event_ts >= now() - INTERVAL 1 HOUR
GROUP BY device_id, minute
ORDER BY device_id, minute;

-- Vectorised scalar functions — applied to whole column at once
SELECT
  device_id,
  avg(if(metric_value > 50, metric_value, 0)) AS avg_above_50,
  countIf(quality = 'good') AS good_count,
  sum(abs(metric_value - 50)) AS total_deviation
FROM moderndatascieng.events
WHERE event_ts >= now() - INTERVAL 1 HOUR
GROUP BY device_id;

-- Vectorised JOIN — ClickHouse supports hash + sort-merge join
SET join_algorithm = 'hash';
SELECT
  e.device_id,
  e.metric_value,
  d.location
FROM moderndatascieng.events AS e
JOIN moderndatascieng.dim_devices AS d USING device_id
WHERE e.event_ts >= now() - INTERVAL 1 HOUR;

-- Parallel scan — ClickHouse uses all cores per partition
-- Set max_threads to control parallelism (default: # of CPUs)
SET max_threads = 16, max_memory_usage = 10000000000;  -- 10 GB

-- AggregatingMergeTree + SIMD = extreme throughput
-- Production: 1B-row aggregation completes in <2 seconds on a 32-core box
SELECT
  toStartOfMinute(event_ts) AS minute,
  avgState(metric_value)    AS avg_state,
  countState()              AS count_state
FROM moderndatascieng.events
WHERE event_ts >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute;`;

// ============================================================
// Pyodide demo — ClickHouse MergeTree simulation
// ============================================================

const PYODIDE_DEMO = `# ============================================================
# ClickHouse MergeTree simulation — in browser (Pyodide)
#   1. Build synthetic MergeTree parts (immutable chunks)
#   2. PARTITION prune (by hour)
#   3. Primary index prune (sparse, 1/8192)
#   4. Background merges (small parts → large)
#   5. Vectorised aggregation simulation
# ============================================================

import math
import random
from collections import defaultdict

print("=== ClickHouse MergeTree engine simulation ===")
print("Architecture: parts (immutable) + sparse primary index + background merges")
print()

random.seed(42)

# --- 1. Simulate MergeTree storage — parts are immutable columnar chunks
class MergeTreePart:
    def __init__(self, part_id, partition, n_rows,
                 min_event_ts, max_event_ts, device_ids):
        self.part_id = part_id
        self.partition = partition  # hour timestamp
        self.n_rows = n_rows
        self.min_event_ts = min_event_ts
        self.max_event_ts = max_event_ts
        self.device_ids = device_ids
        # Compressed size: ~10-15x via LZ4 + delta + RLE + LowCardinality
        self.compressed_bytes = (n_rows * 40) // 12
        # Sparse primary index: 1 entry per 8192 rows
        self.index_entries = max(1, n_rows // 8192)

    def __repr__(self):
        return f"Part(id={self.part_id}, part={self.partition}, rows={self.n_rows}, " \\
               f"comp={self.compressed_bytes}B, idx_entries={self.index_entries})"

class MergeTree:
    def __init__(self, name, partition_fn, order_cols):
        self.name = name
        self.partition_fn = partition_fn
        self.order_cols = order_cols
        self.parts = []  # list of MergeTreePart
        self.next_part_id = 0

    def insert(self, rows):
        """Insert rows — creates a new immutable part per partition."""
        # Group rows by partition
        by_partition = defaultdict(list)
        for r in rows:
            by_partition[self.partition_fn(r)].append(r)
        new_parts = []
        for partition, part_rows in by_partition.items():
            # Sort by ORDER BY columns
            sort_key = lambda r: tuple(r[c] for c in self.order_cols)
            part_rows.sort(key=sort_key)
            # Sparse primary index: 1 entry per 8192 rows
            device_ids = list({r["device_id"] for r in part_rows})
            ts_values = [r["event_ts"] for r in part_rows]
            part = MergeTreePart(
                part_id=self.next_part_id,
                partition=partition,
                n_rows=len(part_rows),
                min_event_ts=min(ts_values),
                max_event_ts=max(ts_values),
                device_ids=device_ids,
            )
            self.parts.append(part)
            self.next_part_id += 1
            new_parts.append(part)
        return new_parts

    def scan(self, partition_filter=None, device_filter=None):
        """Scan parts with partition + primary index prune."""
        bytes_scanned = 0
        rows_read = 0
        for part in self.parts:
            # PARTITION prune
            if partition_filter and part.partition not in partition_filter:
                continue
            # Primary index prune: if device_filter set, check device_ids
            if device_filter and device_filter not in part.device_ids:
                continue
            bytes_scanned += part.compressed_bytes
            rows_read += part.n_rows
        return bytes_scanned, rows_read

    def background_merge(self):
        """Merge small parts into larger ones (every ~10 min)."""
        # Group parts by partition
        by_partition = defaultdict(list)
        for p in self.parts:
            by_partition[p.partition].append(p)
        merged_count = 0
        for partition, parts in by_partition.items():
            # Merge if more than 1 part in same partition and small enough
            if len(parts) > 1:
                # Merge into a single part
                merged_n_rows = sum(p.n_rows for p in parts)
                merged = MergeTreePart(
                    part_id=self.next_part_id,
                    partition=partition,
                    n_rows=merged_n_rows,
                    min_event_ts=min(p.min_event_ts for p in parts),
                    max_event_ts=max(p.max_event_ts for p in parts),
                    device_ids=[d for p in parts for d in p.device_ids],
                )
                # Remove old parts, add merged
                self.parts = [p for p in self.parts if p not in parts]
                self.parts.append(merged)
                self.next_part_id += 1
                merged_count += 1
        return merged_count

# --- 2. Build a synthetic ClickHouse events table ---
def hour_partition(row):
    return (row["event_ts"] // 3600) * 3600  # round to hour

tree = MergeTree("events", hour_partition, ["device_id", "event_ts"])

# Simulate 24 hours of telemetry (scaled)
n_devices = 100
n_rows_per_hour = 5_000  # scaled from 1B/day = ~42M/hour
total_rows = 0
for hour_offset in range(24):
    hour_ts = 1693526400 + hour_offset * 3600  # Sept 1, 2024
    rows = []
    for i in range(n_rows_per_hour):
        rows.append({
            "event_id": total_rows + i,
            "device_id": f"device-{random.randint(0, n_devices-1):04d}",
            "event_ts": hour_ts + random.randint(0, 3599),
            "metric_name": random.choice(["temperature", "humidity"]),
            "metric_value": random.gauss(50, 5),
        })
    new_parts = tree.insert(rows)
    total_rows += n_rows_per_hour

print(f"Table: {tree.name}")
print(f"  Total rows:          {total_rows:,}")
print(f"  Parts:               {len(tree.parts):,} (1 per partition per insert)")
print(f"  Partition:           by toStartOfHour(event_ts) — 1 per hour")
print(f"  ORDER BY:            (device_id, event_ts) — primary index")
print(f"  Index granularity:   8192 (sparse, 1 entry per 8192 rows)")
print()

# --- 3. Query scenarios ---
print("--- Query scenarios ---")

# Full table scan
ba, ra = tree.scan()
print(f"A. Full scan:                          {ba:>10,} bytes ({ra:,} rows)")

# PARTITION prune — only 1 hour (last)
last_hour_ts = hour_partition({"event_ts": 1693526400 + 23 * 3600})
bb, rb = tree.scan(partition_filter={last_hour_ts})
print(f"B. PARTITION prune (1 hour of 24):     {bb:>10,} bytes ({rb:,} rows)  "
      f"- {100*(1-bb/ba):.0f}% saved")

# Primary index prune — single device (sparse index)
target_device = "device-0001"
bc, rc = tree.scan(device_filter=target_device)
print(f"C. Primary index prune (1 device):    {bc:>10,} bytes ({rc:,} rows)  "
      f"- {100*(1-bc/ba):.0f}% saved")

# Both prune — partition + device
bd, rd = tree.scan(partition_filter={last_hour_ts}, device_filter=target_device)
print(f"D. PARTITION + index prune:            {bd:>10,} bytes ({rd:,} rows)  "
      f"- {100*(1-bd/ba):.0f}% saved")
print()

# --- 4. Background merges ---
print("--- Background merges (every ~10 min) ---")
before_parts = len(tree.parts)
merged = tree.background_merge()
after_parts = len(tree.parts)
print(f"  Before:               {before_parts} parts")
print(f"  Merged:               {merged} partitions (small parts → larger)")
print(f"  After:                {after_parts} parts (reduced fragmentation)")
print()

# --- 5. Vectorised aggregation simulation ---
print("--- Vectorised aggregation (SIMD AVX-512) ---")
# Simulate avg(metric_value) over 1 hour partition
target_hour = last_hour_ts
target_parts = [p for p in tree.parts if p.partition == target_hour]
if target_parts:
    n_rows = sum(p.n_rows for p in target_parts)
    # AVX-512 processes 8 doubles per cycle
    cpu_cycles = n_rows / 8
    cpu_freq = 3_000_000_000  # 3 GHz
    sim_time = cpu_cycles / cpu_freq
    print(f"  Rows aggregated:      {n_rows:,}")
    print(f"  CPU cycles (AVX-512): {cpu_cycles:,.0f}")
    print(f"  Time (3 GHz):         {sim_time*1000:.2f} ms")
    print(f"  vs row-based:         ~{sim_time*8*1000:.2f} ms (8x slower without SIMD)")
print()

print("=== ClickHouse architecture summary ===")
print("Engine:        MergeTree (immutable parts + sparse primary index)")
print("Partitioning: toStartOfHour(event_ts) — 1 part/hour, prune for range")
print("ORDER BY:      (device_id, event_ts) — sparse index, 1 entry/8192 rows")
print("Merges:        Background merges small parts → larger ones (~10 min)")
print("Vectorisation: AVX2/AVX-512 SIMD — 8-16 doubles per CPU cycle")
print("Materialised:  AggregatingMergeTree + State functions (avgState, etc.)")`;

// ============================================================
// ClickHouse architecture SVG diagram
// ============================================================

function ClickHouseArchitectureDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("coordinator");
  const nodes = {
    "client": { label: "Client (HTTP/TCP)", desc: "HTTP 8123 · native TCP 9000 · Python/Java/Rust/Go SDK · Grafana", level: 0 },
    "coordinator": { label: "Coordinator node", desc: "Receives SQL, parses, dispatches to local + remote shards, gathers", level: 1 },
    "shard_1": { label: "Shard 1 (MergeTree)", desc: "Holds partition-A parts, sparse primary index, vectorised SIMD execution", level: 2 },
    "shard_2": { label: "Shard 2 (MergeTree)", desc: "Holds partition-B parts, sparse primary index, vectorised SIMD execution", level: 2 },
    "replica_1": { label: "Replica (ZooKeeper)", desc: "ReplicatedMergeTree — async replication via ZooKeeper / Keeper", level: 3 },
    "kafka": { label: "Kafka source", desc: "Kafka table engine — 8 parallel consumers, 1B events/day ingest", level: 3 },
    "mv": { label: "Materialised views", desc: "AggregatingMergeTree + State functions — incremental pre-aggregation", level: 4 },
    "disk": { label: "Disk (local + S3)", desc: "Tiered storage: hot NVMe/SSD + cold S3 (TTL move), LZ4 compressed parts", level: 4 },
  };
  const edges = [
    ["client", "coordinator"],
    ["coordinator", "shard_1"],
    ["coordinator", "shard_2"],
    ["shard_1", "replica_1"],
    ["kafka", "shard_1"],
    ["kafka", "shard_2"],
    ["shard_1", "mv"],
    ["mv", "disk"],
    ["shard_1", "disk"],
    ["shard_2", "disk"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "client": { x: 200, y: 30 },
    "coordinator": { x: 200, y: 75 },
    "shard_1": { x: 80, y: 125 },
    "shard_2": { x: 320, y: 125 },
    "replica_1": { x: 80, y: 175 },
    "kafka": { x: 200, y: 175 },
    "mv": { x: 80, y: 225 },
    "disk": { x: 320, y: 225 },
  };

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Atom className="h-3.5 w-3.5 text-primary" />
          ClickHouse architecture — coordinator → 2 shards (MergeTree) → replicas + Kafka + materialised views + tiered disk
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
            Hover any node to see its role — coordinator dispatches to shards, each shard holds MergeTree parts with sparse primary index + SIMD execution.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Comparison table — ClickHouse vs BigQuery vs Redshift vs Snowflake
// ============================================================

function WarehouseComparisonTable() {
  const rows = [
    { feature: "Origin", clickhouse: "Yandex (2016 open-source)", bigquery: "Google (Dremel 2010)", redshift: "Amazon (ParAccel 2012)", snowflake: "Microsoft/Snowflake (2014)" },
    { feature: "Architecture", clickhouse: "Self-hosted, sharded", bigquery: "Serverless, tree-of-servers", redshift: "Cluster-based, sliced nodes", snowflake: "Cloud-native, multi-cluster" },
    { feature: "Storage format", clickhouse: "MergeTree (columnar)", bigquery: "Capacitor (columnar)", redshift: "Columnar + RLE + AZ64", snowflake: "Cloud-managed columnar" },
    { feature: "Partitioning", clickhouse: "PARTITION BY (any expr)", bigquery: "PARTITION BY (ingest date)", redshift: "SORTKEY + DISTKEY", snowflake: "Micro-partitions" },
    { feature: "Clustered columns", clickhouse: "ORDER BY (cols)", bigquery: "CLUSTER BY (cols)", redshift: "SORTKEY on cols", snowflake: "Automatic clustering" },
    { feature: "Time travel", clickhouse: "Via snapshots (manual)", bigquery: "7 days free, 30 paid", redshift: "0 (no native)", snowflake: "90 days" },
    { feature: "Materialised views", clickhouse: "Yes (incremental)", bigquery: "Yes (auto-refresh)", redshift: "Yes (late 2020)", snowflake: "Yes (auto-refresh)" },
    { feature: "ML in-warehouse", clickhouse: "Limited (no native)", bigquery: "BigQuery ML (XGBoost, ARIMA)", redshift: "Redshift ML (SageMaker)", snowflake: "Snowpark ML" },
    { feature: "Free tier", clickhouse: "Open-source self-host", bigquery: "1 TB/month scanned", redshift: "No (free trial only)", snowflake: "USD 400 credit (limited)" },
    { feature: "Best fit", clickhouse: "Real-time, high-QPS OLAP", bigquery: "GCP shops, ad-hoc analytics", redshift: "AWS shops, predictable workloads", snowflake: "Multi-cloud, semi-structured" },
    { feature: "Notable adopters", clickhouse: "Cloudflare, Bloomberg, Uber", bigquery: "Twitter, Spotify, BBVA", redshift: "Lyft, Nasdaq, Pfizer", snowflake: "Adobe, Capital One, DoorDash" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          ClickHouse vs BigQuery vs Redshift vs Snowflake — 4 OLAP engines compared
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold text-primary">ClickHouse</th>
              <th className="text-left px-3 py-2 font-semibold">BigQuery</th>
              <th className="text-left px-3 py-2 font-semibold">Redshift</th>
              <th className="text-left px-3 py-2 font-semibold">Snowflake</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-primary/80">{r.clickhouse}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.bigquery}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.redshift}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.snowflake}</td>
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
  { label: "Origin", value: "Yandex 2009-2016", hint: "Built for Yandex.Metrica (web analytics) — scaled to trillions of rows; open-sourced 2016 under Apache 2.0", deltaTone: "flat" as const },
  { label: "Production scale", value: "4T rows/table", hint: "Yandex.Metrica is the 2nd-largest web analytics platform globally; individual tables reach 4 trillion rows on a single cluster", deltaTone: "up" as const },
  { label: "Compression", value: "~10-15x", hint: "LZ4 + delta + RLE + LowCardinality(String) = best-in-class compression; 7TB raw fits in 500GB", deltaTone: "up" as const },
  { label: "Query latency", value: "Sub-second", hint: "Sub-second on 1B-row tables via sparse primary index + vectorised SIMD (AVX-512) + partition prune", deltaTone: "up" as const },
];

export function ClickhousePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="ClickHouse · open-source OLAP · Yandex origin · MergeTree engine"
        title="ClickHouse — open-source columnar OLAP at extreme scale (Yandex origin)"
        description="ClickHouse is an open-source columnar OLAP database built at Yandex (2009-2016) for Yandex.Metrica — the second-largest web analytics platform globally. Production tables at Yandex reach 4 trillion rows on a single cluster; total stored data is multiple petabytes per node. The MergeTree engine family (MergeTree, ReplacingMergeTree, AggregatingMergeTree, CollapsingMergeTree) is purpose-built for time-series + event analytics. Sparse primary index (1 entry per 8192 rows) + vectorised SIMD execution (AVX-512, 8-16 doubles per cycle) = sub-second queries on 1B-row tables. Materialised views pre-aggregate on insert via AggregatingMergeTree + State functions (avgState, sumState, maxState) — incremental, no full refresh. Kafka table engine + 8 parallel consumers = 1B events/day real-time ingest at sub-second latency. Open-source Apache 2.0 — self-host or use ClickHouse Cloud."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Layers className="h-3 w-3" /> MergeTree</Badge>
            <Badge variant="outline" className="gap-1.5"><Atom className="h-3 w-3" /> Sparse index</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> SIMD</Badge>
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
        title="Architecture — coordinator + shards + replicas + Kafka + MVs + tiered disk"
        description="ClickHouse's architecture is a distributed cluster of shards + replicas: a coordinator node receives the SQL, parses + plans, and dispatches to local + remote shards (typically 2-100 shards per cluster). Each shard holds MergeTree parts (immutable columnar chunks) partitioned by an expression (e.g. toStartOfHour(ts)) and sorted by ORDER BY columns (sparse primary index, 1 entry per 8192 rows). ReplicatedMergeTree replicates parts across replicas via ZooKeeper / ClickHouse Keeper (async, eventually consistent). Kafka table engine streams from Kafka topics with 8 parallel consumers — 1B events/day ingest at sub-second latency. Materialised views (AggregatingMergeTree + State functions) pre-aggregate on insert — incremental, no full refresh. Tiered storage: hot data on local NVMe/SSD, cold data on S3 (TTL move), all LZ4 compressed."
        icon={<Atom className="h-5 w-5" />}
        badge="architecture"
      >
        <ClickHouseArchitectureDiagram />
      </SectionCard>

      {/* SQL: create + MergeTree */}
      <SectionCard
        title="ClickHouse SQL — MergeTree engine, partitioning, ORDER BY, TTL, mutations"
        description="ClickHouse's analog of Iceberg partition + sort-key is the PARTITION BY + ORDER BY combination. PARTITION BY toStartOfHour(event_ts) creates 1 partition per hour — queries on a recent range scan only the relevant partitions. ORDER BY (device_id, event_ts) defines the sparse primary index (1 entry per 8192 rows by default) — queries on (device_id, event_ts) prune via the index without scanning rows. The MergeTree family has 6 special-purpose engines (MergeTree, ReplacingMergeTree, SummingMergeTree, AggregatingMergeTree, CollapsingMergeTree, VersionedCollapsingMergeTree) for different aggregation + dedup semantics. TTL auto-drops old partitions (data lifecycle)."
        icon={<Database className="h-5 w-5" />}
        badge="ClickHouse SQL"
      >
        <CodeBlock code={CH_CREATE_TABLE_SQL} language="sql" filename="clickhouse_create.sql" highlight={[7, 8, 9, 10, 13, 14, 15, 16, 17, 18, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 49, 50, 51, 52, 53, 54]} />
      </SectionCard>

      {/* Materialised Views */}
      <SectionCard
        title="Materialised Views — AggregatingMergeTree + State functions"
        description="ClickHouse materialised views are the canonical pattern for incremental pre-aggregation. An MV is a table backed by AggregatingMergeTree + State functions (avgState, sumState, countState, maxState). Every insert into the source table triggers an insert into the MV — the MV computes the partial aggregation state (avgState, etc.) on the new rows and merges it into the existing state. Queries on the MV use Merge functions (avgMerge, countMerge, etc.) to combine the saved state. No full refresh — fully incremental. Refreshable MVs (2024+) add the option to recompute on schedule for non-incremental use cases."
        icon={<Zap className="h-5 w-5" />}
        badge="MVs"
      >
        <CodeBlock code={CH_MATERIALIZED_VIEW_SQL} language="sql" filename="clickhouse_mv.sql" highlight={[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50]} />
      </SectionCard>

      {/* Python client */}
      <SectionCard
        title="Python client — clickhouse-connect + Arrow streaming + bulk insert"
        description="The clickhouse-connect Python package is the primary programmatic interface — supports HTTP (port 8123) and native TCP (port 9000) protocols, TLS, and Arrow-batch streaming reads (10x faster than REST). Bulk inserts handle 1M+ rows/sec via Arrow batches (batch size 100K-1M rows per insert). The same client works for ClickHouse self-hosted + ClickHouse Cloud. Query results come back as Pandas DataFrames directly — no row-by-row iteration."
        icon={<Workflow className="h-5 w-5" />}
        badge="Python"
      >
        <CodeBlock code={CH_PYTHON} language="python" filename="clickhouse_client.py" highlight={[5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50]} />
      </SectionCard>

      {/* Kafka ingest */}
      <SectionCard
        title="Kafka table engine — real-time ingest at 1B events/day"
        description="ClickHouse's Kafka table engine streams from Kafka topics with 8 parallel consumers (configurable) — sustained throughput of 1B events/day (12K events/sec avg, peak 50K/sec). The pattern: Kafka table engine (source) → materialised view (transform + filter) → MergeTree (sink). Errors go to a dead-letter table for re-processing. ClickHouse handles Kafka consumer offsets internally — exactly-once semantics with Kafka transactions. Background merges (every ~10 min) combine small parts into larger ones (0-10 → 0-100 → 0-1000 rows) to prevent the small-files problem."
        icon={<Activity className="h-5 w-5" />}
        badge="Kafka ingest"
      >
        <CodeBlock code={CH_KAFKA_INGEST} language="sql" filename="clickhouse_kafka.sql" highlight={[5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 21, 22, 23, 24, 25, 26, 27, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 44, 45, 46, 47]} />
      </SectionCard>

      {/* Vectorised SIMD */}
      <SectionCard
        title="Vectorised SIMD execution — 10-100x faster than row-based"
        description="ClickHouse's vectorised SIMD execution is its core performance advantage — every columnar operation (avg, sum, max, if, countIf, abs) is executed against chunks of 2000+ rows per CPU instruction using AVX2 (4 doubles per cycle) or AVX-512 (8 doubles per cycle). A 1B-row aggregation completes in under 2 seconds on a 32-core box. All operations are batch-across-column, not row-by-row. This is structurally the same pattern as Apache Arrow's compute kernels + DuckDB's vectorised execution — ClickHouse pioneered it for OLAP."
        icon={<Cpu className="h-5 w-5" />}
        badge="SIMD"
      >
        <CodeBlock code={CH_VECTORISED_SIMD} language="sql" filename="clickhouse_simd.sql" highlight={[6, 7, 8, 9, 10, 11, 12, 13, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48]} />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: simulate ClickHouse MergeTree in your browser (Pyodide)"
        description="Pure-Python simulation of ClickHouse's MergeTree engine — no JVM, no S3, just in-browser. Build a synthetic ClickHouse events table from scratch: 24 partitions (1 per hour) × 5000 rows each, sparse primary index (1 entry per 8192 rows). Compare 4 query scenarios: full scan vs. PARTITION prune vs. primary index prune vs. both prune. See background merges reduce part fragmentation, and vectorised aggregation timing simulation (AVX-512 vs row-based)."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={PYODIDE_DEMO} buttonLabel="Run ClickHouse MergeTree simulation (Pyodide)" />
      </SectionCard>

      {/* Comparison table */}
      <SectionCard
        title="ClickHouse vs BigQuery vs Redshift vs Snowflake — 4 OLAP engines compared"
        description="The four OLAP engines represent four distinct architectural choices. ClickHouse is open-source self-hosted, optimised for high-QPS real-time OLAP — fastest for time-series + event analytics. BigQuery (Google) is fully serverless with the strongest free tier. Redshift (AWS) is cluster-based with the most mature sort/distribution keys. Snowflake (multi-cloud) abstracts clusters away into virtual warehouses. ClickHouse wins on raw scan speed + open-source + self-host economics."
        icon={<Boxes className="h-5 w-5" />}
      >
        <WarehouseComparisonTable />
      </SectionCard>

      {/* Why this evolved */}
      <SectionCard
        title="Why ClickHouse evolved — shortfalls of MySQL + PostgreSQL + Vertica (Era 2)"
        description="ClickHouse was born from Yandex's internal need to scale web analytics (Yandex.Metrica) beyond what MySQL/PostgreSQL/Vertica could handle. It solved four critical shortfalls of the era that made real-time analytics on billions of events painful."
        icon={<History className="h-5 w-5" />}
        badge="Why ClickHouse"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: MySQL/PostgreSQL couldn't scale to billions of rows.</strong> Web analytics at Yandex.Metrica scale (200M+ websites tracked) generates billions of events/day. MySQL/PostgreSQL max out at 100M rows per table before queries take minutes. ClickHouse was designed from scratch for 1B+ row tables — sub-second aggregations on 1B rows are routine. <strong className="text-foreground/80">Result:</strong> real-time analytics on web-scale event streams became possible without sampling.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: Vertica was expensive + closed-source.</strong> Vertica (HP Enterprise, 2005+) was the leading columnar MPP but cost USD 100K+ per TB/year, was closed-source, and required DBAs to design projections. ClickHouse is open-source (Apache 2.0), self-hostable, and uses ORDER BY + PARTITION BY (simpler than Vertica's projections). <strong className="text-foreground/80">Result:</strong> columnar MPP analytics became accessible to any organisation without licensing fees.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: No native materialised-view incremental aggregation.</strong> Vertica + Oracle had materialised views but required full refresh on update — useless for streaming. ClickHouse's AggregatingMergeTree + State functions (avgState, sumState, etc.) enable truly incremental pre-aggregation: every insert triggers a partial state computation that merges into the existing state. <strong className="text-foreground/80">Result:</strong> pre-aggregated dashboards stay fresh in real-time without periodic full-refresh jobs.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: Cloud warehouses were too slow for high-QPS real-time.</strong> BigQuery + Redshift were optimised for ad-hoc SQL, not for sub-second high-QPS queries on hot data (dashboards, alerting). ClickHouse's sparse primary index + vectorised SIMD + LZ4 in-memory compression give sub-second queries on 1B-row tables — sustained 1000s of QPS. <strong className="text-foreground/80">Result:</strong> ClickHouse became the canonical engine for real-time analytics dashboards at Cloudflare, Bloomberg, Uber, Cisco.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique ClickHouse features (vs BigQuery + Redshift + Snowflake)"
        description="ClickHouse has four features that are genuinely unique — structural differentiators no other OLAP engine has yet matched at the same scale or with the same economics."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. MergeTree + sparse primary index</p>
            <p className="text-muted-foreground">Sparse index (1 entry per 8192 rows) + vectorised SIMD = sub-second queries on 1B rows. <strong>BigQuery BI Engine caches only; Redshift AQUA caches + computes; ClickHouse scans faster cold.</strong> No cache needed.
          </p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. AggregatingMergeTree + State functions</p>
            <p className="text-muted-foreground">avgState/sumState + Merge = truly incremental MV aggregation. <strong>BigQuery + Redshift MVs require periodic refresh; Snowflake MVs are batch.</strong> ClickHouse MVs update on every insert, no full refresh.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Best-in-class compression (10-15x)</p>
            <p className="text-muted-foreground">LZ4 + delta + RLE + LowCardinality(String) gives 10-15x compression — 7TB raw fits in 500GB. <strong>BigQuery + Redshift achieve ~5-8x; Snowflake ~4-6x.</strong> Best storage economics.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Open-source Apache 2.0 + self-host</p>
            <p className="text-muted-foreground">No vendor lock-in — self-host on any cloud or use ClickHouse Cloud (managed). <strong>BigQuery + Redshift + Snowflake are proprietary.</strong> ClickHouse is the only open-source OLAP at this scale.</p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples cards */}
      <SectionCard
        title="2 scientific dataset examples — cards with 5-language code popups"
        description="Two scientific ClickHouse use cases: (1) IoT telemetry on ClickHouse — 1B events/day, MergeTree partitioned by hour, sub-second per-device rolling means; (2) genomics variant queries on ClickHouse — 3B SNPs with sub-second allele frequency lookup via PARTITION BY chrom + ORDER BY (chrom, pos). Each is a clickable card with: scenario brief (dataset/scale/why), dataset stats grid, computational tooling, multi-language code in Scala + Rust + Go + Elixir + Zig, and an implementation insight."
        icon={<Database className="h-5 w-5" />}
        badge="2 examples × 5 langs"
      >
        <DatasetCards
          examples={CLICKHOUSE_SCIENCE_EXAMPLES}
          intro="ClickHouse scientific use cases: IoT telemetry (1B events/day, MergeTree partitioned by hour) + genomics variant queries (3B SNPs, sub-second allele freq lookup). Each example has Scala/Rust/Go/Elixir/Zig code with the unique ClickHouse differentiator (MergeTree + sparse index + SIMD + materialised views)."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — ClickHouse ecosystem"
        description="ClickHouse's compute ecosystem is the most performance-focused of any OLAP engine — MergeTree engine family, vectorised SIMD execution, Kafka real-time ingest, ZooKeeper / Keeper replication. ClickHouse Cloud (managed) + Altinity + ClickHouse Inc offer commercial support."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Compute + Engines</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>MergeTree</strong> — default, immutable parts, sparse index</li>
              <li>• <strong>ReplacingMergeTree</strong> — dedupe on version column</li>
              <li>• <strong>AggregatingMergeTree</strong> — pre-aggregate via State functions</li>
              <li>• <strong>CollapsingMergeTree</strong> — delete via sign column</li>
              <li>• <strong>Vectorised SIMD</strong> — AVX2/AVX-512, 8-16 doubles/cycle</li>
              <li>• <strong>Kafka table engine</strong> — 8 parallel consumers, 1B/day</li>
              <li>• <strong>ClickHouse Cloud</strong> — managed, serverless scaling</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cloud className="h-3.5 w-3.5 text-primary" /> Storage + Replication</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>LZ4 + delta + RLE</strong> — 10-15x compression</li>
              <li>• <strong>LowCardinality(String)</strong> — 1-2 bits for enum-like</li>
              <li>• <strong>Tiered storage</strong> — hot NVMe + cold S3 (TTL move)</li>
              <li>• <strong>ReplicatedMergeTree</strong> — async replication</li>
              <li>• <strong>ZooKeeper / Keeper</strong> — coordination + replication</li>
              <li>• <strong>Distributed table</strong> — shard across N nodes</li>
              <li>• <strong>Materialised views</strong> — incremental, no full refresh</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers and production blog posts that defined ClickHouse + the open-source OLAP movement. The Yandex engineering blogs document production scale; Cloudflare + Bloomberg + Uber engineering document second-wave adopters."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Yandex.Metrica origin (2009-2016):</strong> Yandex built ClickHouse internally from 2009-2016 to power Yandex.Metrica — the second-largest web analytics platform globally (after Google Analytics). Production scale: 17 trillion rows across all tables, 2 PB+ per node, 200M+ websites tracked. ClickHouse was the only system that could handle Yandex.Metrica's scale of real-time web analytics — Vertica was too expensive, BigQuery didn't exist yet, Hadoop was too slow.
          </p>
          <p>
            <strong className="text-foreground/80">ClickHouse Open-Source (Apache 2.0, 2016):</strong> Yandex open-sourced ClickHouse in June 2016 under Apache 2.0. The decision was strategic — Yandex wanted to build a community around ClickHouse rather than lock it in. The release included documentation, benchmarks (10x faster than Vertica on some workloads), and case studies. By 2018, Cloudflare + Bloomberg + Uber had adopted ClickHouse for production real-time analytics.
          </p>
          <p>
            <strong className="text-foreground/80">Cloudflare Production Case (Cloudflare Blog 2017-2020):</strong> Cloudflare migrated its analytics pipeline from PostgreSQL + Hadoop to ClickHouse in 2017-2018. Production scale: 4-5 million HTTP requests/sec (peak) → ClickHouse via Kafka. Result: sub-second queries on 100s of billions of HTTP log events, replacing a 100+ node Hadoop cluster with a 30-node ClickHouse cluster. Cloudflare engineering published detailed blog series on the migration.
          </p>
          <p>
            <strong className="text-foreground/80">Bloomberg Production Case (2018):</strong> Bloomberg uses ClickHouse for financial market data analytics — tick data, order book snapshots, real-time market metrics. Production scale: 200+ billion tick records, sub-second queries for trader dashboards. Bloomberg engineering chose ClickHouse over BigQuery/Redshift because of sub-second high-QPS performance + open-source + self-host (Bloomberg runs its own infrastructure).
          </p>
          <p>
            <strong className="text-foreground/80">Uber Production Case (2020):</strong> Uber migrated its real-time analytics from Vertica to ClickHouse in 2020. The "Uber Marketplace Analytics" platform handles 100s of billions of events/day — driver locations, trip events, pricing analytics. ClickHouse replaced 30+ Vertica nodes with 20+ ClickHouse nodes — 50% cost reduction, 10x faster real-time queries. Uber engineering published a detailed blog on the migration patterns.
          </p>
          <p>
            <strong className="text-foreground/80">Vectorised Execution Academic Foundation (Boncz et al. 2005):</strong> "MonetDB/X100: Web-Scale Data Processing" (CIDR 2005) introduced vectorised query execution — processing batches of 1000+ values per CPU instruction instead of one row at a time. ClickHouse + DuckDB + Apache Arrow all implement this pattern. ClickHouse's SIMD optimisation (AVX2/AVX-512) is the production-scale realisation of Boncz's academic work — 10-100x faster than row-based execution on analytical workloads.
          </p>
          <p>
            <strong className="text-foreground/80">ClickHouse Cloud (2022) + ClickHouse Inc (2019):</strong> The original ClickHouse developers left Yandex in 2019 to found ClickHouse Inc (US-based) — raised USD 300M Series B in 2021, the largest Series B in open-source history. ClickHouse Cloud (2022) is the managed service — serverless scaling, multi-AZ replication, S3-backed storage. The same team maintains open-source ClickHouse (Apache 2.0) — community edition is feature-identical to commercial Cloud.
          </p>
        </div>
      </SectionCard>

      {/* Deeper-thought insight */}
      <SectionCard
        title="My deeper thought: ClickHouse IS vectorised execution + LSM-tree + Druid in one"
        description="The unifying view: ClickHouse's architecture is structurally a vectorised columnar OLAP engine (Boncz MonetDB/X100) layered on a log-structured merge-tree storage (LSTM from LevelDB/RocksDB), wrapped in a sparse primary index pattern (similar to Druid's segment index), fronted by Kafka-triggered materialised views that mirror the Bronze→Silver medallion pattern."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">ClickHouse IS vectorised execution + LSM-tree, not a single innovation.</strong> ClickHouse's "innovation" in 2016 was assembling three existing patterns: (1) vectorised columnar execution (Boncz MonetDB/X100, 2005), (2) log-structured merge-tree storage (LevelDB/RocksDB, 2011), (3) sparse primary index (Druid, 2011). Each was well-known individually; the innovation was combining them into a production-scale open-source OLAP engine. This is why ClickHouse launched in 2016 — the underlying patterns matured around 2011-2014.
          </p>
          <p>
            <strong className="text-foreground/80">MergeTree IS an LSM-tree with columnar leaves.</strong> LevelDB/RocksDB's LSM-tree writes to an immutable memtable → flushes to disk → merges small SSTables into larger ones in the background. ClickHouse's MergeTree does the same — insert creates a new immutable part, background merges combine small parts into larger ones (0-10 → 0-100 → 0-1000). The difference: ClickHouse parts are columnar (Parquet-like), LevelDB SSTables are row-based key-value. The "innovation" is making the LSM-tree columnar.
          </p>
          <p>
            <strong className="text-foreground/80">Sparse primary index IS Druid's segment index, generalised.</strong> Druid (2011, Metamarkets) pioneered sparse primary index for time-series — segment (partition) + 1 index entry per N rows (configurable). ClickHouse generalised this: sparse index on ORDER BY columns (not just timestamp), 1 entry per 8192 rows. The pattern is identical to B-tree lookup with one B-tree node per N rows — only the B-tree is in-memory, the data is on disk. <code className="font-mono">ORDER BY (device_id, event_ts)</code> = sparse B-tree on those columns.
          </p>
          <p>
            <strong className="text-foreground/80">Materialised views IS the Bronze→Silver medallion, automated.</strong> The lakehouse medallion pattern is Bronze (raw) → Silver (cleansed) → Gold (aggregated) — usually implemented with Spark + Iceberg batch jobs. ClickHouse automates this: source table (Bronze) → MV with AggregatingMergeTree (Silver) → MV on MV (Gold). Every insert into Bronze triggers automatic incremental aggregation in Silver + Gold — no batch jobs needed. The "innovation" is making the medallion real-time + incremental via State functions (avgState + avgMerge).
          </p>
          <p>
            <strong className="text-foreground/80">ClickHouse IS to BigQuery/Redshift what Iceberg is to Snowflake.</strong> BigQuery + Redshift + Snowflake are proprietary cloud warehouses — managed services with their own storage + compute + cache. ClickHouse is the open-source alternative — self-hostable, Apache 2.0, vendor-neutral. The same pattern as Iceberg being the open-source alternative to Snowflake's table format. ClickHouse Inc (commercial) + ClickHouse Cloud (managed) mirror Databricks' commercial relationship to Apache Spark — open-source core + commercial managed service. The "innovation" is choosing open-source for OLAP.
          </p>
        </div>
      </SectionCard>

      <RelatedTopics topics={[
        { id: "bigquery" as const, reason: "Sibling cloud warehouse (Google)" },
        { id: "redshift" as const, reason: "Sibling cloud warehouse (AWS)" },
        { id: "snowflake-polaris" as const, reason: "Sibling cloud warehouse + open catalog" },
        { id: "iceberg" as const, reason: "Open table format on S3 (storage layer)" },
        { id: "druid" as const, reason: "Sibling open-source OLAP (segment index origin)" },
        { id: "data-lakehouse" as const, reason: "Anchor concept — lake→lakehouse" },
        { id: "kafka" as const, reason: "Kafka table engine for real-time ingest" },
        { id: "pinot" as const, reason: "Sibling real-time OLAP (LinkedIn origin)" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("bigquery")} className="text-sm text-primary hover:underline">
          &rarr; Google BigQuery (sibling warehouse, serverless)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("redshift")} className="text-sm text-primary hover:underline">
          &rarr; AWS Redshift (sibling warehouse, cluster-based)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("druid")} className="text-sm text-primary hover:underline">
          &rarr; Apache Druid (sibling OLAP, segment index origin)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("kafka")} className="text-sm text-primary hover:underline">
          &rarr; Apache Kafka (real-time ingest source)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("data-lakehouse")} className="text-sm text-primary hover:underline">
          &rarr; Data Lakehouse (concept anchor page)
        </Link>
      </div>
    </div>
  );
}
