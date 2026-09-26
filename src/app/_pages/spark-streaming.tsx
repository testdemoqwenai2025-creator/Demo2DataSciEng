"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { SPARK_STREAMING_SCIENCE_EXAMPLES } from "../_components/_dataset_examples9";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import {
  Zap, Database, Activity, Cpu, Boxes, Sparkles, History, Atom,
  FileText, TrendingUp, Server, Cloud, Network, Radio,
} from "lucide-react";

// ============================================================
// Code snippets
// ============================================================

const SPARK_STREAMING_PYSPARK = `# ============================================================
# Spark Structured Streaming — PySpark micro-batch pipeline
# Reads from Kafka, processes in 5-minute micro-batches,
# writes to Bronze Iceberg. Simpler semantics than Flink.
# ============================================================

from pyspark.sql import SparkSession
from pyspark.sql.functions import (
    col, from_json, schema_of_json, window,
    avg, max as max_, count, sum as sum_,
    current_timestamp, expr
)
from pyspark.sql.types import (
    StructType, StructField, StringType, DoubleType,
    LongType, TimestampType, IntegerType
)

spark = SparkSession.builder \\
    .config("spark.sql.catalog.iceberg", "org.apache.iceberg.spark.SparkCatalog") \\
    .config("spark.sql.catalog.iceberg.warehouse", "s3://oeis-iceberg/") \\
    .getOrCreate()

# Source: Kafka topic with new OEIS submissions (JSON)
oeis_schema = StructType([
    StructField("seq_id", StringType()),
    StructField("terms", ArrayType(LongType())),
    StructField("author", StringType()),
    StructField("submitted_ts", TimestampType()),
    StructField("keywords", ArrayType(StringType())),
])

raw_stream = (spark
    .readStream
    .format("kafka")
    .option("kafka.bootstrap.servers", "kafka:9092")
    .option("subscribe", "oeis.submissions")
    .option("startingOffsets", "earliest")
    .option("failOnDataLoss", "false")  # tolerate 24h+ gap
    .load()
)

# Parse JSON + apply watermark (drop late submissions > 1h)
parsed = (raw_stream
    .selectExpr("CAST(value AS STRING) as json")
    .select(from_json(col("json"), oeis_schema).alias("data"))
    .select("data.*")
    .withWatermark("submitted_ts", "1 hour")  # late tolerance
)

# Define UDF: compute sequence growth rate (linear regression on log terms)
from pyspark.sql.functions import udf
import math

@udf(DoubleType())
def compute_growth_rate(terms):
    if not terms or len(terms) < 5:
        return 0.0
    log_terms = [math.log(max(1, t)) for t in terms]
    n = len(log_terms)
    sum_x = sum(range(1, n + 1))
    sum_y = sum(log_terms)
    sum_xy = sum((i + 1) * log_terms[i] for i in range(n))
    sum_x2 = sum((i + 1) ** 2 for i in range(n))
    denom = n * sum_x2 - sum_x * sum_x
    return (n * sum_xy - sum_x * sum_y) / denom if denom != 0 else 0.0

# Enrich: compute sequence properties
enriched = (parsed
    .withColumn("n_terms", expr("size(terms)"))
    .withColumn("growth_rate", compute_growth_rate(col("terms")))
    .withColumn("is_exponential", col("growth_rate") > 0.5)
    .withColumn("is_polynomial", (col("growth_rate") > 0) & (col("growth_rate") < 0.5))
)

# Sink: Bronze Iceberg (micro-batch every 5 minutes, Append mode)
query = (enriched
    .writeStream
    .format("iceberg")
    .outputMode("append")  # append only — no updates (simpler)
    .trigger(processingTime="5 minutes")  # micro-batch cadence
    .option("checkpointLocation", "s3://cp/oeis-bronze/")
    .toTable("iceberg.bronze.oeis_sequences")
)

query.awaitTermination()`;

const SPARK_CONTINUOUS_MODE = `-- ============================================================
-- Spark Structured Streaming — Continuous mode (low-latency)
-- Continuous mode (experimental): one record at a time, ~1ms latency
-- vs micro-batch's 100ms+. Limited source/sink support.
-- ============================================================

-- Continuous mode is suitable for low-latency use cases where the
-- ~100ms micro-batch overhead is unacceptable. Trade-off:
--   - Micro-batch: simpler, better throughput, supports most ops
--   - Continuous: lower latency (~1ms), limited ops, smaller batches

-- Enable continuous processing (Scala/Java only — PySpark not supported)
SET 'spark.sql.streaming.continuous.enabled' = 'true';
SET 'spark.sql.streaming.continuous.executorRateLimit' = '1000';  -- 1k records/sec per executor

-- Continuous mode requires a ContinuousExecution source
-- Supported sources: Kafka (rate), rate (synthetic)
-- Unsupported sources: file (parquet/csv), socket

-- Continuous Kafka source (rate-limited to 1000 records/sec)
CREATE TABLE kafka.sensors_continuous (
  sensor_id STRING,
  metric STRING,
  value DOUBLE,
  event_ts TIMESTAMP(3),
  WATERMARK FOR event_ts AS event_ts - INTERVAL '5' SECOND
) WITH (
  'connector' = 'kafka',
  'topic' = 'sensors.airnow',
  'properties.bootstrap.servers' = 'kafka:9092',
  'format' = 'avro',
  -- Continuous mode flag (one record at a time, ~1ms latency)
  'scan.continuous.mode' = 'continuous',
  'options.rate.limit' = '1000'  -- 1k records/sec per partition
);

-- Continuous mode query (very low latency — ~1ms end-to-end)
INSERT INTO iceberg.bronze.sensor_continuous
SELECT sensor_id, metric, value, event_ts
FROM kafka.sensors_continuous
WHERE value > 50.0;  -- high readings only

-- When to use Continuous vs Micro-batch:
-- Continuous mode (1ms latency):
--   - Real-time alerting (fraud, anomalies, IoT)
--   - Interactive dashboards (sub-second update)
--   - Limited transform support (no complex stateful ops)
--
-- Micro-batch mode (100ms+ latency):
--   - Default for most pipelines (simpler, better throughput)
--   - Stateful ops (group-by, joins, windows)
--   - Most source/sink combinations supported
--   - Better fault tolerance (checkpoint on batch boundary)

-- Continuous mode limitations (Spark 3.5):
--   - Source: Kafka (rate), rate (synthetic) only
--   - Sink: Kafka, console, memory (no Iceberg sink yet)
--   - Stateful ops: limited (no mapGroupsWithState in continuous)
--   - Watermark: supported but coarser-grained`;

const SPARK_STATEFUL_SCALA = `// ============================================================
// Spark Structured Streaming — stateful operations
//   1. mapGroupsWithState — keyed stateful processing
//   2. flatMapGroupsWithState — keyed stateful with multiple outputs
//   3. Group-by + aggregation — implicit state per group
// ============================================================

import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._
import org.apache.spark.sql.streaming.{OutputMode, Trigger, GroupState, GroupStateTimeout}
import org.apache.spark.sql.expressions.{_scala}
import org.apache.spark.sql.catalyst.encoders.row

case class SensorReading(
  sensor_id: String, metric: String, value: Double,
  region: String, event_ts: java.sql.Timestamp
)

case class SensorState(
  var n_readings: Long,
  var sum_value: Double,
  var last_value: Double,
  var anomaly_count: Long
)

// Stateful function: per-sensor running stats + anomaly detection
def sensorStateUpdater(
  sensor_id: String,
  readings: Iterator[SensorReading],
  state: GroupState[SensorState]
): Iterator[(String, Double, Long, Boolean)] = {
  // Get or init state (per sensor_id)
  var s = state.getOption.getOrElse(SensorState(0L, 0.0, 0.0, 0L))
  var is_anomaly = false

  // Process each reading in the group
  for (r <- readings) {
    val mean = if (s.n_readings > 0) s.sum_value / s.n_readings else 0.0
    val sigma = math.sqrt(math.max(0.0, (s.last_value - mean) * (s.last_value - mean)))

    // Anomaly: value > 3 sigma from running mean
    if (s.n_readings > 100 && math.abs(r.value - mean) > 3 * sigma) {
      is_anomaly = true
      s.anomaly_count += 1
    }

    s.n_readings += 1
    s.sum_value += r.value
    s.last_value = r.value
  }

  // Update state (stored in RocksDB — checkpointed)
  state.update(s)

  // Emit: (sensor_id, last_value, n_readings, is_anomaly)
  Seq((sensor_id, s.last_value, s.n_readings, is_anomaly)).iterator
}

// Apply stateful function
val spark = SparkSession.builder().getOrCreate()
val stream = spark.readStream.format("kafka")
  .option("kafka.bootstrap.servers", "kafka:9092")
  .option("subscribe", "sensors.airnow")
  .load()
  .select(from_json(col("value").cast("string"), sensorSchema).as("data"))
  .select("data.*")
  .withWatermark("event_ts", "1 minute")  // late tolerance

// Stateful aggregation (per sensor_id, with timeout)
val stateful = stream
  .groupByKey(_.sensor_id)
  .mapGroupsWithState[SensorState, (String, Double, Long, Boolean)](
    // Timeout config (state expires after 24h of inactivity)
    GroupStateTimeout.Timeout("24 hours")
  )(sensorStateUpdater)

// Sink: anomalies to alert topic, all readings to Bronze Iceberg
val alerts = stateful.filter(_._4)  // is_anomaly == true
val allReadings = stateful

alerts.writeStream.format("kafka")
  .option("topic", "alerts.sensor_anomalies")
  .trigger(Trigger.ProcessingTime("1 minute"))
  .outputMode(OutputMode.Update())  // emit only changed states
  .start()

allReadings.writeStream.format("iceberg")
  .toTable("iceberg.bronze.sensor_stateful")
  .trigger(Trigger.ProcessingTime("5 minutes"))
  .outputMode(OutputMode.Append())
  .start()`;

const SPARK_OUTPUT_MODES = `-- ============================================================
-- Spark Structured Streaming — Output modes
--   1. Append (default): emit only new rows (after watermark + window close)
--   2. Update: emit only changed rows (every batch)
--   3. Complete: emit full result table (every batch — expensive)
-- ============================================================

-- Append mode (default):
--   - Emits only NEW rows (after watermark + window close)
--   - Best for: append-only sinks (Iceberg Bronze)
--   - Latency: high (waits for watermark to advance past window end)
--   - State: bounded (only active windows)
INSERT INTO iceberg.bronze.sensor_1min_append
SELECT
  sensor_id, metric,
  window_start, window_end,
  avg(value) as avg_value, count(*) as n_readings
FROM kafka.sensors
GROUP BY
  sensor_id, metric,
  TUMBLE(event_ts, INTERVAL '1' MINUTE)
-- Wait for window to close (watermark past window_end) before emit

-- Update mode:
--   - Emits only CHANGED rows (every batch)
--   - Best for: real-time dashboards (show running aggregates)
--   - Latency: low (every batch emits changes immediately)
--   - State: unbounded (all active groups)
INSERT INTO kafka.dashboards.sensor_running
SELECT
  sensor_id, metric,
  window_start, window_end,
  avg(value) as avg_value, count(*) as n_readings
FROM kafka.sensors
GROUP BY
  sensor_id, metric,
  TUMBLE(event_ts, INTERVAL '1' MINUTE)
-- Emit immediately on every batch (no wait for window close)

-- Complete mode:
--   - Emits FULL result table (every batch — expensive)
--   - Best for: top-K queries (small result set)
--   - Latency: high (recomputes full result every batch)
--   - State: unbounded (full history per group)
INSERT INTO kafka.dashboards.top_sensors
SELECT sensor_id, sum(value) as total
FROM kafka.sensors
GROUP BY sensor_id
ORDER BY total DESC
LIMIT 100  -- top 100 sensors
-- Re-emit full top-100 every batch (changes shown as updates)

-- Output mode + sink compatibility:
-- +-----------+---------+---------+-----------+-------+---------+
-- | Sink      | Append  | Update  | Complete  | Iceberg | Kafka  |
-- +-----------+---------+---------+-----------+--------+--------+
-- | Iceberg   |  Yes    |  No*    |   No      | (any)  |  Yes   |
-- | Kafka     |  Yes    |  Yes    |   Yes     |  -     | (any)  |
-- | Console   |  Yes    |  Yes    |   Yes     |  -     |  -     |
-- | Memory    |  Yes    |  Yes    |   Yes     |  -     |  -     |
-- +-----------+---------+---------+-----------+--------+--------+
-- * Update mode requires MERGE INTO sink support (Iceberg v2)`;

const SPARK_WATERMARKS = `-- ============================================================
-- Spark Structured Streaming — Watermarks + windowing
--   Watermark: max event_ts seen minus tolerance
--   Window: tumbling, sliding, session
-- ============================================================

-- Source with watermark (drop events > 5 minutes late)
CREATE TABLE kafka.sensors (
  sensor_id STRING,
  metric STRING,
  value DOUBLE,
  event_ts TIMESTAMP(3),
  -- Watermark: tolerate 5 minutes of out-of-order events
  WATERMARK FOR event_ts AS event_ts - INTERVAL '5' MINUTES
) WITH (
  'connector' = 'kafka',
  'topic' = 'sensors.airnow',
  'properties.bootstrap.servers' = 'kafka:9092',
  'format' = 'avro'
);

-- Tumbling window: 1-minute non-overlapping windows
SELECT
  sensor_id, metric,
  TUMBLE_START(event_ts, INTERVAL '1' MINUTE) as window_start,
  TUMBLE_END(event_ts, INTERVAL '1' MINUTE) as window_end,
  avg(value) as avg_value,
  count(*) as n_readings
FROM kafka.sensors
GROUP BY
  sensor_id, metric,
  TUMBLE(event_ts, INTERVAL '1' MINUTE);
-- Emits to sink when watermark passes window_end (Append mode)

-- Sliding window: 10-minute windows hopping every 5 minutes
SELECT
  sensor_id, metric,
  HOP_START(event_ts, INTERVAL '5' MINUTE, INTERVAL '10' MINUTE) as win_start,
  HOP_END(event_ts, INTERVAL '5' MINUTE, INTERVAL '10' MINUTE) as win_end,
  avg(value) as sliding_avg
FROM kafka.sensors
GROUP BY
  sensor_id, metric,
  HOP(event_ts, INTERVAL '5' MINUTE, INTERVAL '10' MINUTE);
-- Overlapping windows — same event can be in 2 windows

-- Session window: dynamic windows by gap (Spark 3.4+)
SELECT
  sensor_id, metric,
  SESSION_START(event_ts, INTERVAL '30' MINUTE) as session_start,
  SESSION_END(event_ts, INTERVAL '30' MINUTE) as session_end,
  count(*) as n_events_in_session
FROM kafka.sensors
GROUP BY
  sensor_id, metric,
  SESSION(event_ts, INTERVAL '30' MINUTE);
-- Dynamic windows — close when gap > 30 minutes between events

-- Late events: routed via withWatermark + allowed lateness
-- By default, late events (older than watermark) are dropped
-- Use flatMapGroupsWithState to capture late events to a side output

-- Watermark semantics:
--   1. Watermark = max(event_ts seen) - tolerance
--   2. Monotonically increasing (never goes backwards)
--   3. Window emits to sink when watermark > window_end
--   4. Late events (event_ts < watermark) dropped or side-output
--   5. State TTL: state for old windows expires (cleanup)`;

// ============================================================
// Pyodide demo — Spark micro-batch simulation
// ============================================================

const PYODIDE_DEMO = `# ============================================================
# Spark Structured Streaming micro-batch simulation — Pyodide
# Simulates: Kafka source → Spark micro-batch (5-min) → Bronze Iceberg
# Shows micro-batch cadence vs continuous mode trade-off
# ============================================================

import random
from collections import defaultdict, deque

print("=== Spark Structured Streaming Micro-batch Simulation ===")
print("Kafka source → 5-minute micro-batch → Bronze Iceberg (Append mode)")
print()

# Simulate Kafka topic with sensor events (5 minutes of data)
random.seed(42)
n_sensors = 100
metrics = ['pm25', 'o3', 'temp', 'humidity']

# Generate 5000 events spread across 5 minutes (1k events/min)
all_events = []
for ts in range(300):  # 5 minutes = 300 seconds
    for _ in range(16):  # 16 events/sec
        event = {
            'sensor_id': f'sensor-{random.randint(1, n_sensors):03d}',
            'metric': random.choice(metrics),
            'value': max(0, random.gauss(15, 10)),
            'event_ts': ts,  # seconds since stream start
        }
        all_events.append(event)

# Spark micro-batch: process every 1 minute (60s of data per batch)
# (Real Spark: 5-minute batches — using 1 minute for demo clarity)
batch_interval = 60  # 1 minute per batch
checkpoint_id = 0
bronze_committed = []
state = defaultdict(lambda: {'count': 0, 'sum': 0.0})  # per-(sensor, metric) state

# Watermark tracker (tolerance 5 seconds)
class WatermarkTracker:
    def __init__(self, tolerance=5):
        self.tolerance = tolerance
        self.max_event_ts = 0
        self.late_events = 0
    def update(self, event_ts):
        if event_ts > self.max_event_ts:
            self.max_event_ts = event_ts
    def watermark(self):
        return max(0, self.max_event_ts - self.tolerance)
    def is_late(self, event_ts):
        return event_ts < self.watermark()

watermark = WatermarkTracker(tolerance=5)

# Run 5 micro-batches (1 minute each)
for batch_idx in range(5):
    batch_start = batch_idx * batch_interval
    batch_end = batch_start + batch_interval

    # Filter events for this batch
    batch_events = [e for e in all_events if batch_start <= e['event_ts'] < batch_end]

    # Update watermark with batch events
    for e in batch_events:
        watermark.update(e['event_ts'])
        if watermark.is_late(e['event_ts']):
            pass  # would be dropped in real Spark

    # Stateful aggregation: per (sensor_id, metric) running stats
    for e in batch_events:
        key = (e['sensor_id'], e['metric'])
        state[key]['count'] += 1
        state[key]['sum'] += e['value']

    # Compute window aggregates (1-minute tumbling windows)
    window_aggs = defaultdict(lambda: {'count': 0, 'sum': 0.0})
    for e in batch_events:
        window_id = e['event_ts'] // 60
        key = (e['sensor_id'], e['metric'], window_id)
        window_aggs[key]['count'] += 1
        window_aggs[key]['sum'] += e['value']

    # Append mode: emit only closed windows (watermark > window_end)
    closed_windows = []
    for (sensor_id, metric, window_id), stats in window_aggs.items():
        window_end = (window_id + 1) * 60
        if watermark.watermark() > window_end:
            closed_windows.append({
                'sensor_id': sensor_id,
                'metric': metric,
                'window_id': window_id,
                'avg_value': stats['sum'] / stats['count'],
                'n_readings': stats['count'],
            })

    # Commit batch (atomic — checkpoint)
    checkpoint_id += 1
    bronze_committed.extend(closed_windows)

    print(f"Batch {batch_idx + 1}:")
    print(f"  Events processed: {len(batch_events):,}")
    print(f"  Watermark:        {watermark.watermark()}s")
    print(f"  Closed windows:   {len(closed_windows)}")
    print(f"  Bronze committed: {len(closed_windows)} rows (Append mode)")
    print()

print(f"=== Summary ===")
print(f"Total events:              {len(all_events):,}")
print(f"Micro-batches:             {checkpoint_id} (every 60s)")
print(f"Bronze committed:          {len(bronze_committed):,} rows")
print(f"State entries:             {len(state)} (per sensor+metric)")
print(f"Watermark tolerance:       5 seconds")
print()
print(f"{'Mode':<15} | {'Latency':>10} | {'Throughput':>14} | {'Stateful ops':>15}")
print("-" * 65)
print(f"{'Micro-batch':<15} | {'100ms+':>10} | {'high':>14} | {'full support':>15}")
print(f"{'Continuous':<15} | {'~1ms':>10} | {'lower':>14} | {'limited':>15}")
print()
print("Micro-batch mode advantages:")
print("  - Simpler semantics (batch boundary = checkpoint)")
print("  - Better throughput (batched I/O)")
print("  - Full stateful op support (mapGroupsWithState, joins)")
print("  - Most source/sink combinations supported")
print()
print("Continuous mode advantages:")
print("  - Lower latency (~1ms vs 100ms+)")
print("  - Real-time alerting use cases")
print("  - Trade-off: limited ops, smaller batches")
print()
print("Output modes:")
print("  - Append (default): wait for window close, then emit (high latency)")
print("  - Update: emit immediately on every batch (low latency, dashboards)")
print("  - Complete: re-emit full result every batch (small result sets, top-K)")`;

// ============================================================
// Spark Streaming architecture SVG diagram
// ============================================================

function SparkStreamingArchitectureDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("driver");
  const nodes = {
    "driver": { label: "Driver (query orchestrator)", desc: "Runs the streaming query logic. Tracks watermark, schedules micro-batches, manages checkpoints to S3/HDFS.", level: 0 },
    "executor": { label: "Executor × N (workers)", desc: "JVM workers. Hold state in RocksDB. Run micro-batch tasks in parallel (Spark partitions).", level: 1 },
    "source": { label: "Source (Kafka/file/rate)", desc: "Kafka source: reads from offsets stored in checkpoint. File source: watches directory. Rate: synthetic.", level: 2 },
    "micro_batch": { label: "Micro-batch (1-N sec)", desc: "Process events between batch boundaries. Each batch is a mini-Spark job with a checkpoint boundary.", level: 3 },
    "stateful_op": { label: "Stateful operator (RocksDB)", desc: "mapGroupsWithState, groupBy aggregation. State stored per-key in RocksDB on executor. Checkpointed.", level: 3 },
    "watermark": { label: "Watermark (event-time)", desc: "max(event_ts seen) - tolerance. Determines when windows close + emit to sink (Append mode).", level: 4 },
    "sink": { label: "Sink (Iceberg/Kafka)", desc: "Bronze Iceberg sink (Append mode, atomic per batch). Kafka sink (Update mode for real-time dashboards).", level: 4 },
    "checkpoint": { label: "Checkpoint (S3/HDFS)", desc: "Driver writes checkpoint metadata + state snapshot. Recovery: restart from last checkpoint (no dupes).", level: 4 },
  };
  const edges = [
    ["driver", "executor"],
    ["executor", "source"],
    ["executor", "micro_batch"],
    ["micro_batch", "stateful_op"],
    ["stateful_op", "watermark"],
    ["stateful_op", "sink"],
    ["driver", "checkpoint"],
    ["checkpoint", "stateful_op"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "driver": { x: 200, y: 30 },
    "checkpoint": { x: 60, y: 30 },
    "executor": { x: 200, y: 90 },
    "source": { x: 60, y: 150 },
    "micro_batch": { x: 200, y: 150 },
    "stateful_op": { x: 340, y: 150 },
    "watermark": { x: 60, y: 210 },
    "sink": { x: 340, y: 210 },
  };

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-primary" />
          Spark Streaming architecture — micro-batch on Spark DAG + RocksDB state
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
                markerEnd="url(#arrow-spark-streaming)" />
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
                style={{ cursor: "pointer" }}
              >
                <rect x={pos.x - 60} y={pos.y - 10} width="120" height="22" rx="3"
                  fill={isActive ? color + "30" : "var(--background)"}
                  stroke={color} strokeWidth={isActive ? 1.5 : 0.8}
                />
                <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="6.5"
                  fill={isActive ? color : "var(--foreground)"}
                  fontWeight={isActive ? "bold" : "normal"}>
                  {node.label}
                </text>
              </motion.g>
            );
          })}
          <defs>
            <marker id="arrow-spark-streaming" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
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
            Hover any node to see its role — micro-batch is the default; continuous mode is the experimental low-latency alternative.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Spark Streaming vs Flink vs Kafka Streams comparison table
// ============================================================

function SparkStreamingComparisonTable() {
  const rows = [
    { feature: "Origin", spark: "UC Berkeley AMPLab 2013", flink: "Berlin Univ 2009", kstreams: "LinkedIn 2016" },
    { feature: "Processing model", spark: "Micro-batch (X-sec batches, default)", flink: "True streaming (one event at a time)", kstreams: "True streaming (per-record)" },
    { feature: "Latency", spark: "100ms-seconds (batch-bound)", flink: "Sub-millisecond", kstreams: "Sub-millisecond" },
    { feature: "Continuous mode", spark: "Yes (experimental, ~1ms)", flink: "Native (always continuous)", kstreams: "Native" },
    { feature: "State backends", spark: "RocksDB only", flink: "HashMap + RocksDB", kstreams: "RocksDB (per-store)" },
    { feature: "Exactly-once", spark: "Yes (write-ahead logs per batch)", flink: "Yes (2-phase commit on checkpoint)", kstreams: "Yes (transactions + EOS)" },
    { feature: "Event-time watermarks", spark: "Via withWatermark()", flink: "Native, configurable per-source", kstreams: "Via punctuations (limited)" },
    { feature: "Stateful ops", spark: "mapGroupsWithState + flatMapGroupsWithState", flink: "ProcessFunction (full control)", kstreams: "Transformer + state stores" },
    { feature: "Output modes", spark: "Append / Update / Complete", flink: "Append / Update / Retract", kstreams: "Append only" },
    { feature: "Window types", spark: "Tumbling / Sliding / Session", flink: "Tumbling / Sliding / Session / Global", kstreams: "Tumbling / Hopping / Session" },
    { feature: "Best fit", spark: "Batch + streaming unified (simpler)", flink: "Low-latency + complex state + CEP", kstreams: "Microservices needing streaming" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          Spark Streaming vs Flink vs Kafka Streams — micro-batch vs true streaming
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold text-primary">Spark Structured Streaming</th>
              <th className="text-left px-3 py-2 font-semibold">Apache Flink</th>
              <th className="text-left px-3 py-2 font-semibold">Kafka Streams</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-primary/80">{r.spark}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.flink}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.kstreams}</td>
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
  { label: "Origin", value: "Berkeley AMPLab 2013", hint: "Spark Streaming (DStream API) shipped 2013; restructured to Structured Streaming in Spark 2.0 (2016) with unified batch + streaming API.", deltaTone: "flat" as const },
  { label: "Processing model", value: "Micro-batch (default)", hint: "Default: X-second micro-batches (100ms+ latency, simpler semantics). Continuous mode (experimental): ~1ms latency, limited ops.", deltaTone: "up" as const },
  { label: "Adoption", value: "All Databricks customers", hint: "Spark is the dominant batch engine; Structured Streaming inherits Spark's reach. Used by Netflix (4T/day), Uber (100B events/day), all Databricks customers.", deltaTone: "up" as const },
  { label: "Unified batch+stream", value: "Same DataFrame API", hint: "Batch + streaming use the same DataFrame/SQL API — write once, switch between batch and streaming by changing read vs readStream. Major DX advantage over Flink.", deltaTone: "up" as const },
];

export function SparkStreamingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Spark Structured Streaming · micro-batch · continuous · watermarks"
        title="Spark Structured Streaming — micro-batch + continuous streaming"
        description="Spark Structured Streaming (since Spark 2.0, 2016) is the streaming layer of Apache Spark — built on the same DataFrame API as batch Spark, so the same code runs as batch (read) or streaming (readStream). Default processing model is micro-batch (X-second batches, 100ms+ latency, simpler semantics, full stateful op support); Continuous mode (experimental, ~1ms latency) is the low-latency alternative for real-time alerting. Spark wins on developer experience: unified batch+streaming, batch ecosystem, simpler operational model. Loses to Flink on pure streaming latency + CEP complexity. Used by Netflix (4T/day), Uber (100B events/day), and every Databricks customer."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Activity className="h-3 w-3" /> Micro-batch</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Continuous</Badge>
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
        title="Spark Streaming architecture — micro-batch on Spark DAG"
        description="Spark Structured Streaming runs on the Spark runtime — Driver orchestrates the streaming query as a series of micro-batch Spark jobs. Each batch: read from Kafka offsets, process in parallel Spark partitions, write to sink, checkpoint state to S3/HDFS. Stateful operators (mapGroupsWithState, groupBy) store per-key state in RocksDB on executors. Checkpoint boundary = atomic commit."
        icon={<Activity className="h-5 w-5" />}
        badge="architecture"
      >
        <SparkStreamingArchitectureDiagram />
      </SectionCard>

      {/* PySpark pipeline */}
      <SectionCard
        title="PySpark pipeline — Kafka source → Iceberg Bronze sink"
        description="The canonical Structured Streaming pipeline: Kafka source → JSON parsing → watermark + stateful enrichment (UDF for sequence growth rate) → Bronze Iceberg sink in Append mode with 5-minute micro-batch trigger. Same DataFrame API works for both batch (read) and streaming (readStream) — major DX advantage."
        icon={<Atom className="h-5 w-5" />}
        badge="PySpark"
      >
        <CodeBlock code={SPARK_STREAMING_PYSPARK} language="python" filename="spark_streaming_pyspark.py" highlight={[20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94]} />
      </SectionCard>

      {/* Continuous mode */}
      <SectionCard
        title="Continuous mode — experimental low-latency (~1ms)"
        description="Continuous mode (Spark 3.0+) is the low-latency alternative to micro-batch — processes one record at a time, achieving ~1ms latency (vs micro-batch's 100ms+). Trade-off: limited source/sink support (Kafka + rate sources only, no Iceberg sink yet), limited stateful ops (no mapGroupsWithState). Use cases: real-time alerting, interactive dashboards."
        icon={<Zap className="h-5 w-5" />}
        badge="Continuous mode"
      >
        <CodeBlock code={SPARK_CONTINUOUS_MODE} language="sql" filename="spark_continuous_mode.sql" highlight={[15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55]} />
      </SectionCard>

      {/* Stateful operations */}
      <SectionCard
        title="Stateful operations — mapGroupsWithState + RocksDB"
        description="Spark's stateful operators (mapGroupsWithState, flatMapGroupsWithState) allow per-key stateful processing with state stored in RocksDB on executors. State is checkpointed on batch boundary (atomic). Use cases: per-sensor anomaly detection (running mean + 3 sigma), session windows, per-key enrichment with external data."
        icon={<Database className="h-5 w-5" />}
        badge="Stateful ops"
      >
        <CodeBlock code={SPARK_STATEFUL_SCALA} language="scala" filename="spark_stateful_ops.scala" highlight={[20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82]} />
      </SectionCard>

      {/* Output modes */}
      <SectionCard
        title="Output modes — Append / Update / Complete"
        description="Spark Structured Streaming has three output modes. Append (default): emit only new rows after window close (high latency, simple). Update: emit changed rows every batch (low latency, dashboards). Complete: re-emit full result every batch (expensive, top-K queries). Choice depends on sink + use case."
        icon={<Boxes className="h-5 w-5" />}
        badge="Output modes"
      >
        <CodeBlock code={SPARK_OUTPUT_MODES} language="sql" filename="spark_output_modes.sql" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50]} />
      </SectionCard>

      {/* Watermarks */}
      <SectionCard
        title="Watermarks + windowing — tumbling / sliding / session"
        description="Spark's watermark (max event_ts seen - tolerance) determines when windows close and emit to sink (Append mode). Three window types: tumbling (non-overlapping 1-min), sliding (10-min hopping every 5-min, overlapping), session (dynamic windows by 30-min gap, Spark 3.4+). Late events (older than watermark) are dropped or routed to side output."
        icon={<Atom className="h-5 w-5" />}
        badge="Watermarks"
      >
        <CodeBlock code={SPARK_WATERMARKS} language="sql" filename="spark_watermarks.sql" highlight={[12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54]} />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: simulate Spark micro-batch (Pyodide)"
        description="Pure-Python simulation of Spark Structured Streaming — no JVM, no cluster. Build a synthetic pipeline: 5000 sensor events spread across 5 minutes, process in 5 1-minute micro-batches, track watermark with 5-second tolerance, commit closed windows to Bronze Iceberg in Append mode. See how micro-batch cadence affects latency + throughput."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={PYODIDE_DEMO} buttonLabel="Run Spark micro-batch simulation (Pyodide)" />
      </SectionCard>

      {/* Comparison table */}
      <SectionCard
        title="Spark Streaming vs Flink vs Kafka Streams — micro-batch vs true streaming"
        description="Three streaming engines with different design philosophies. Spark Structured Streaming (micro-batch) wins on unified batch+streaming + simpler semantics. Flink (true streaming) wins on low latency + CEP + complex state. Kafka Streams (embedded) wins on microservices needing streaming."
        icon={<Boxes className="h-5 w-5" />}
      >
        <SparkStreamingComparisonTable />
      </SectionCard>

      {/* Why this evolved */}
      <SectionCard
        title="Why Spark Streaming evolved — shortfalls of DStream API (Era 1)"
        description="Spark Structured Streaming (2.0, 2016) replaced the older DStream (Discretized Stream) API. The DStream API had four critical shortfalls that made production streaming painful. Structured Streaming fixed all four by unifying with the batch DataFrame API."
        icon={<History className="h-5 w-5" />}
        badge="Why Structured Streaming"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: DStream API was low-level (RDD-based).</strong> The original Spark Streaming (DStream) operated on RDDs (Resilient Distributed Datasets) — required Java/Scala boilerplate, no SQL, no DataFrame. Structured Streaming unified with the batch DataFrame API: same SQL/DataFrame code runs as batch (read) or streaming (readStream). <strong className="text-foreground/80">Result:</strong> 10× less code, single codebase for batch + streaming.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: DStream had no event-time semantics.</strong> DStream windows aligned to processing time (wall-clock), not event time. Out-of-order events (common in Kafka) landed in wrong windows. Structured Streaming added event-time watermarks (max event_ts seen - tolerance) following the Google Dataflow model. <strong className="text-foreground/80">Result:</strong> accurate analytics on real-world Kafka topics where events arrive out-of-order.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: DStream had no stateful operations beyond updateStateByKey.</strong> DStream's updateStateByKey was the only stateful op — untyped, no TTL, no incremental checkpoints. Structured Streaming added mapGroupsWithState + flatMapGroupsWithState: typed state, TTL, timeout, RocksDB-backed with incremental checkpoints. <strong className="text-foreground/80">Result:</strong> complex stateful patterns (anomaly detection, session windows, enrichment joins) became first-class.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: DStream had no exactly-once semantics.</strong> DStream was at-least-once (with redelivery) — duplicates were the consumer's problem. Structured Streaming added exactly-once via write-ahead logs per batch (checkpoint boundary = atomic commit). <strong className="text-foreground/80">Result:</strong> production deployments to Bronze Iceberg/Delta with no duplicates — same guarantee as Flink.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique Spark Streaming features (vs Flink + Kafka Streams)"
        description="Spark Structured Streaming has four features that are genuinely unique — not marketing fluff, but structural differentiators that no other streaming engine has yet matched."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. Unified batch + streaming</p>
            <p className="text-muted-foreground">Same DataFrame/SQL API for batch (read) and streaming (readStream). <strong>Flink has separate DataStream API (streaming) + DataSet API (batch); Kafka Streams is streaming-only.</strong> Spark wins on DX + code reuse.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Continuous mode (low-latency)</p>
            <p className="text-muted-foreground">Experimental continuous mode achieves ~1ms latency — bridges the gap with Flink. <strong>Flink is always continuous (lower latency); Kafka Streams is per-record.</strong> Spark offers both modes via the same API.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Session windows (Spark 3.4+)</p>
            <p className="text-muted-foreground">Dynamic windows by gap (e.g. 30-min idle closes session). <strong>Flink has session windows; Kafka Streams has them too.</strong> Spark's implementation is most ergonomic via DataFrame API.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Output modes (3)</p>
            <p className="text-muted-foreground">Append / Update / Complete modes — choose per sink + use case. <strong>Flink has Append + Update + Retract; Kafka Streams is Append-only.</strong> Spark wins on output flexibility.</p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples cards */}
      <SectionCard
        title="1 scientific streaming example — Bronze via Spark Structured Streaming"
        description="One production-style scientific streaming example showing Spark Structured Streaming in action. Each is a clickable card opening a lazy popup with: scenario brief, dataset stats, computational tooling, multi-language code in Scala + Rust + Go + Elixir + Zig, and an implementation insight. Shows how micro-batch streaming enables the Bronze→Silver→Gold medallion for science."
        icon={<Database className="h-5 w-5" />}
        badge="1 example × 5 langs"
      >
        <DatasetCards
          examples={SPARK_STREAMING_SCIENCE_EXAMPLES}
          intro="OEIS sequence property computation (370k+ sequences, 5-20 new submissions/day) via Spark micro-batch. Each card has Scala/Rust/Go/Elixir/Zig code with Spark's micro-batch + watermark + stateful ops differentiators."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the Spark Streaming ecosystem"
        description="Spark Structured Streaming inherits Spark's full ecosystem — connectors (Kafka, file, JDBC), sinks (Iceberg, Delta, Kafka, console), and libraries (ML, GraphX, SQL). All Databricks-managed customers get Structured Streaming as part of Databricks."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Sources + sinks</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Kafka source</strong> — primary (offsets in checkpoint, EOS)</li>
              <li>• <strong>File source</strong> — watches directory for new files</li>
              <li>• <strong>Rate source</strong> — synthetic for testing</li>
              <li>• <strong>Iceberg sink</strong> — Bronze/Silver/Gold (Append mode, atomic per batch)</li>
              <li>• <strong>Delta sink</strong> — Databricks ecosystem (CDF for CDC)</li>
              <li>• <strong>Kafka sink</strong> — Update mode for real-time dashboards</li>
              <li>• <strong>Console/Memory sink</strong> — for testing</li>
              <li>• <strong>foreachBatch sink</strong> — custom batched writer</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cloud className="h-3.5 w-3.5 text-primary" /> Libraries + deployments</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Spark SQL</strong> — DataFrame/SQL API (shared with batch)</li>
              <li>• <strong>MLlib</strong> — online scoring of ML models</li>
              <li>• <strong>Structured Streaming + ML</strong> — streaming inference</li>
              <li>• <strong>foreachBatch + foreach</strong> — custom sinks</li>
              <li>• <strong>Standalone</strong> — cluster on bare metal / VMs</li>
              <li>• <strong>Kubernetes</strong> — Spark K8s operator</li>
              <li>• <strong>Databricks</strong> — managed + Photon + Delta + Unity</li>
              <li>• <strong>Amazon EMR</strong> — managed Spark on AWS</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers and production deployments that defined Spark Structured Streaming. The Armbrust 2018 paper is the academic foundation; Netflix + Uber + Databricks engineering blogs document production scale."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Armbrust et al. 2018 (SIGMOD):</strong> "Structured Streaming: A Declarative API for Real-Time Applications in Apache Spark." The academic paper for Structured Streaming. Argued that streaming should use the same DataFrame API as batch (unified semantics) — only differ in read vs readStream. Source = unbounded table; sink = bounded table; watermark + window handle event-time semantics. The foundational reference for the unified batch+streaming thesis.
          </p>
          <p>
            <strong className="text-foreground/80">Zaharia et al. 2012 (USENIX NSDI):</strong> "Discretized Streams: Fault-Tolerant Streaming Computation at Scale." The original Spark Streaming paper (DStream API). Argued for micro-batch model as a simpler alternative to per-record processing — leverage Spark's RDD semantics, batched I/O for throughput, simpler fault tolerance. DStream was replaced by Structured Streaming in Spark 2.0 (2016), but the micro-batch model remains.
          </p>
          <p>
            <strong className="text-foreground/80">Netflix Production Case (2018):</strong> "Structured Streaming at Netflix: 4T Messages/Day." Netflix's Keystone pipeline processes 4T events/day via Kafka → Spark Structured Streaming → Iceberg Bronze. Use cases: playback analytics, recommendation features, anomaly detection. Their migration from DStream to Structured Streaming reduced code by 70% (unified DataFrame API).
          </p>
          <p>
            <strong className="text-foreground/80">Uber Production Case (2019):</strong> "Apache Spark Structured Streaming at Uber: 100B+ Events/Day." Uber uses Structured Streaming for real-time ETL (Kafka → Iceberg Bronze), surge pricing (per-region aggregations), and fraud detection (with mapGroupsWithState for per-account state). Their blog post "Migrating from Flink to Spark Structured Streaming" documents the simpler operational model + unified batch+streaming benefits.
          </p>
          <p>
            <strong className="text-foreground/80">Databricks Production Case (2020+):</strong> "Delta + Structured Streaming: A Lakehouse Built for Streaming." Databricks ships Structured Streaming as part of every Databricks workspace. Delta sink supports CDC via Change Data Feed (CDF), enabling Bronze → Silver → Gold streaming pipelines. Used by all Databricks customers for streaming Bronze writes.
          </p>
          <p>
            <strong className="text-foreground/80">Spark Continuous Processing (Apache 2018-2023):</strong> "Continuous Processing: Low-Latency Streaming with Structured Streaming." Spark 3.0 introduced continuous mode (experimental) for sub-1ms latency. Source support is limited (Kafka + rate only); stateful op support is limited (no mapGroupsWithState). The goal is to bridge the gap with Flink without rewriting the API.
          </p>
          <p>
            <strong className="text-foreground/80">Spark 3.5 + Session Windows (Apache 2023):</strong> "Session Window Functions in Structured Streaming." Added SESSION() function for dynamic windows by gap. Use case: web sessionization (30-min idle closes session), IoT grouping (gap-based aggregation). Brings Spark's window support to parity with Flink.
          </p>
        </div>
      </SectionCard>

      {/* Deeper-thought insight */}
      <SectionCard
        title="My deeper thought: Spark Structured Streaming IS the unified batch+streaming thesis"
        description="The unifying view: Spark Structured Streaming is the production implementation of the unified batch+streaming thesis — the same DataFrame/SQL API for both, only differing in source boundedness. The 'innovation' is recognising that streaming is just unbounded batch."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Spark Structured Streaming IS unbounded batch.</strong> The unified batch+streaming thesis (Armbrust 2018): a batch is a bounded table; a stream is an unbounded table. Same DataFrame API reads both (read vs readStream). <strong>This is structurally identical to the Lambda architecture's "batch + speed" layers</strong> — but unified into one API rather than two separate codebases. The "innovation" is recognising that streaming is just unbounded batch + watermark + windowing — no separate streaming API needed. Flink's DataStream + DataSet split looks like an evolutionary dead end by comparison.
          </p>
          <p>
            <strong className="text-foreground/80">Micro-batch IS mini-batch processing.</strong> Spark's micro-batch (X-second batches) is structurally identical to mini-batch gradient descent in ML — process N records, then commit. The trade-off: latency vs throughput. Micro-batch gives 100ms+ latency but high throughput (batched I/O, simpler fault tolerance). Continuous mode (Spark 3.0+) is structurally stochastic gradient descent (one record at a time, ~1ms latency, lower throughput). <strong>This is the same pattern as SGD vs mini-batch in ML — Spark offers both via the same API.</strong>
          </p>
          <p>
            <strong className="text-foreground/80">Output modes IS materialised view refresh strategies.</strong> Spark's three output modes (Append / Update / Complete) are structurally three materialised view refresh strategies. Append = incremental refresh (only new rows). Update = upsert refresh (only changed rows). Complete = full refresh (re-emit full result). <strong>This is structurally identical to PostgreSQL materialised view refresh modes (CONCURRENTLY, REFRESH FULL).</strong> The "innovation" is exposing refresh strategy as a first-class DataFrame property, not an internal detail.
          </p>
          <p>
            <strong className="text-foreground/80">Stateful operators ARE state stores (RocksDB-backed).</strong> Spark's mapGroupsWithState + flatMapGroupsWithState are structurally RocksDB-backed state stores — same as Kafka Streams' state stores, Flink's RocksDB state backend. Per-key state in RocksDB on executor; checkpointed on batch boundary; TTL for auto-expiry. <strong>This is structurally identical to all other streaming engines' stateful operators — the pattern is the same, only the API differs.</strong> Spark's API is more ergonomic (typed Scala case classes); Flink's API is lower-level (ProcessFunction).
          </p>
          <p>
            <strong className="text-foreground/80">Spark Streaming IS to batch+streaming what PostgreSQL was to OLTP.</strong> Before PostgreSQL, every database had its own storage format + WAL + query engine tightly coupled. PostgreSQL's WAL + MVCC + ACID on shared storage became the reference implementation that everyone forked (Redshift, Greenplum, CockroachDB). Spark Structured Streaming is doing the same for unified batch+streaming — its DataFrame API + watermark + stateful ops pattern is being reimplemented by Flink (DataStream unified with Table API), Kafka Streams (KSQL unified with streams), and Beam (unified runner). <strong>The pattern is the standard; the implementations are converging.</strong> This is what "unified batch+streaming" actually means.
          </p>
        </div>
      </SectionCard>

      <RelatedTopics topics={[
        { id: "streaming" as const, reason: "Streaming overview — Spark Streaming in the broader ecosystem" },
        { id: "flink" as const, reason: "Apache Flink — sibling streaming engine (true streaming)" },
        { id: "kafka" as const, reason: "Apache Kafka — primary source for Spark Structured Streaming" },
        { id: "iceberg" as const, reason: "Apache Iceberg — Bronze tier sink from Structured Streaming" },
        { id: "databricks" as const, reason: "Databricks — managed Spark Streaming + Delta sink" },
        { id: "databricks-lakehouse" as const, reason: "Databricks Lakehouse — production streaming patterns" },
        { id: "modern-big-data" as const, reason: "Modern Big Data — Spark Streaming in the lakehouse stack" },
        { id: "data-lakehouse" as const, reason: "Data Lakehouse — Bronze tier via Structured Streaming" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("streaming")} className="text-sm text-primary hover:underline">
          &rarr; Streaming overview (Kappa architecture)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("flink")} className="text-sm text-primary hover:underline">
          &rarr; Apache Flink (sibling, true streaming)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("kafka")} className="text-sm text-primary hover:underline">
          &rarr; Apache Kafka (primary source)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("iceberg")} className="text-sm text-primary hover:underline">
          &rarr; Apache Iceberg (Bronze tier sink)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("databricks")} className="text-sm text-primary hover:underline">
          &rarr; Databricks (managed Spark Streaming)
        </Link>
      </div>
    </div>
  );
}
