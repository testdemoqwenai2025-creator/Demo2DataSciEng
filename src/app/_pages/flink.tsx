"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { FLINK_SCIENCE_EXAMPLES } from "../_components/_dataset_examples9";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Zap, Database, Activity, Cpu, Boxes, Sparkles, History, Atom,
  FileText, TrendingUp, Server, Cloud, Network, Radio, ShieldCheck,
} from "lucide-react";

// ============================================================
// Code snippets
// ============================================================

const FLINK_WATERMARK_SQL = `-- ============================================================
-- Apache Flink — event-time watermarks + windowed aggregation
-- Flink's watermark strategy is the core innovation for out-of-order
-- event processing. Late events are dropped (or routed to side output).
-- ============================================================

-- Source: Kafka topic with sensor events (event_ts is event-time)
CREATE TABLE kafka.sensor_events (
  sensor_id    STRING,
  metric       STRING,
  value        DOUBLE,
  event_ts     TIMESTAMP(3),
  -- Watermark: tolerate 5 seconds of out-of-order events
  WATERMARK FOR event_ts AS event_ts - INTERVAL '5' SECOND
) WITH (
  'connector' = 'kafka',
  'topic' = 'sensors.airnow',
  'properties.bootstrap.servers' = 'kafka:9092',
  'format' = 'avro',
  'scan.startup.mode' = 'latest-offset'
);

-- Tumbling window: aggregate every 1 minute (event-time)
-- Watermark advances when the max event_ts seen minus 5s tolerance
CREATE TABLE iceberg.bronze.sensor_1min AS
SELECT
  sensor_id,
  metric,
  TUMBLE_START(event_ts, INTERVAL '1' MINUTE) AS window_start,
  TUMBLE_END(event_ts, INTERVAL '1' MINUTE)   AS window_end,
  AVG(value) AS avg_value,
  MAX(value) AS max_value,
  COUNT(*)   AS n_readings
FROM kafka.sensor_events
GROUP BY
  sensor_id, metric,
  TUMBLE(event_ts, INTERVAL '1' MINUTE);

-- Sliding window: 10-minute windows hopping every 5 minutes
SELECT
  sensor_id, metric,
  HOP_START(event_ts, INTERVAL '5' MINUTE, INTERVAL '10' MINUTE) AS win_start,
  HOP_END(event_ts, INTERVAL '5' MINUTE, INTERVAL '10' MINUTE)  AS win_end,
  AVG(value) AS sliding_avg
FROM kafka.sensor_events
GROUP BY
  sensor_id, metric,
  HOP(event_ts, INTERVAL '5' MINUTE, INTERVAL '10' MINUTE);

-- Late events: routed to side output (watermark already passed window)
-- These are the events that arrived more than 5s late vs watermark
-- Use case: reprocessing, anomaly detection, or DLQ to Bronze
INSERT INTO iceberg.bronze.late_events
SELECT * FROM kafka.sensor_events
WHERE event_ts < CURRENT_WATERMARK(event_ts) - INTERVAL '5' SECOND;`;

const FLINK_STATE_BACKENDS = `-- ============================================================
-- State backends — Flink's stateful operations need a storage backend
--   1. HashMapStateBackend  — in-memory, fast, limited by JVM heap
--   2. EmbeddedRocksDBStateBackend — disk-based, scales to TBs of state
-- ============================================================

-- Configure state backend (in flink-conf.yaml or per-job)
-- state.backend: rocksdb
-- state.backend.rocksdb.localdir: /mnt/ephemeral/rocksdb
-- state.backend.rocksdb.memory.managed: true

-- Stateful job: per-sensor running average (state grows with sensor count)
CREATE TABLE kafka.sensor_events (
  sensor_id STRING, value DOUBLE, event_ts TIMESTAMP(3),
  WATERMARK FOR event_ts AS event_ts - INTERVAL '5' SECOND
) WITH ('connector' = 'kafka', 'topic' = 'sensors.airnow', ...);

-- Per-sensor running aggregation (stateful)
-- Each sensor_id has its own state entry (50k sensors = 50k state entries)
SELECT
  sensor_id,
  AVG(value) OVER (
    PARTITION BY sensor_id
    ORDER BY event_ts
    -- Range unbounded: full history per sensor (RocksDB-backed)
    RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running_avg,
  COUNT(*) OVER (
    PARTITION BY sensor_id
    ORDER BY event_ts
    RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running_count
FROM kafka.sensor_events;

-- State TTL: auto-expire state entries after 24h of inactivity
-- Prevents state growth from sensors that go offline
SET 'table.exec.state.ttl' = '24 h';

-- State backend comparison:
-- HashMapStateBackend:
--   - In-memory (JVM heap)
--   - ~10x faster than RocksDB
--   - Limited by heap size (typically 32-64 GB per TaskManager)
--   - Best for: small state (< 1 GB), low-latency jobs
--
-- EmbeddedRocksDBStateBackend:
--   - Disk-based (local SSD)
--   - Scales to TBs of state per TaskManager
--   - Slower (~10x vs HashMap) but unbounded
--   - Best for: large state (1 GB to TBs), long-running jobs
--   - Used by: Uber (1 TB state), Netflix (500 GB), Alibaba (10 TB)`;

const FLINK_EXACTLY_ONCE = `-- ============================================================
-- Exactly-once semantics — Flink's two-phase commit on checkpoint
-- The checkpoint barrier flows through the DAG; when all operators
-- acknowledge, the coordinator commits. Sinks must support 2PC.
-- ============================================================

-- Enable exactly-once checkpointing (in flink-conf.yaml or per-job)
-- execution.checkpointing.interval: 60s
-- execution.checkpointing.mode: EXACTLY_ONCE
-- execution.checkpointing.alignment-timeout: 1 min  (unaligned after 1 min)
-- execution.checkpointing.externalized-checkpoint: RETAIN_ON_CANCELLATION

-- Kafka source with exactly-once (consumer offsets in checkpoint)
CREATE TABLE kafka.orders_cdc (
  order_id BIGINT, customer_id BIGINT, order_ts TIMESTAMP(3),
  op STRING,  -- INSERT | UPDATE | DELETE
  metadata ROW<ts TIMESTAMP(3), source STRING> METADATA FROM VALUE
) WITH (
  'connector' = 'kafka',
  'topic' = 'orders.cdc',
  'properties.bootstrap.servers' = 'kafka:9092',
  'properties.transaction.timeout.ms' = '900000',  -- 15 min for txn
  'format' = 'debezium-json',
  'scan.startup.mode' = 'earliest-offset'
);

-- Iceberg sink with exactly-once (2-phase commit on checkpoint)
CREATE TABLE iceberg.bronze.orders (
  order_id BIGINT, customer_id BIGINT, order_ts TIMESTAMP(3),
  is_deleted BOOLEAN,
  PRIMARY KEY (order_id) NOT ENFORCED
) WITH (
  'connector' = 'iceberg',
  'catalog-name' = 'moderndatascieng',
  'warehouse' = 's3://moderndatascieng-iceberg',
  'format-version' = '2',
  'write.upsert.enabled' = 'true',
  -- Exactly-once: commit on Flink checkpoint boundary
  'sink.commit.policy' = 'checkpoint'
);

-- CDC → Iceberg pipeline (exactly-once via checkpoint)
INSERT INTO iceberg.bronze.orders
SELECT
  order_id, customer_id, order_ts,
  op = 'DELETE' AS is_deleted
FROM kafka.orders_cdc;

-- Why this is exactly-once:
-- 1. Source: Kafka consumer offsets are in Flink's state (not auto-committed)
-- 2. Sink: Iceberg commits micro-batch only when Flink checkpoint succeeds
-- 3. If checkpoint fails → no Iceberg commit, no Kafka offset advance
-- 4. If checkpoint succeeds → Iceberg commit + Kafka offset advance atomically
-- 5. Recovery: replay from last checkpoint (no duplicates, no losses)`;

const FLINK_CEP_SCALA = `// ============================================================
// Flink CEP — Complex Event Processing for pattern detection
// Pattern API: begin / followedBy / or / not / within / times
// Use cases: fraud detection, IoT anomaly detection, LHC triggers
// ============================================================

import org.apache.flink.cep.CEP
import org.apache.flink.cep.pattern.Pattern
import org.apache.flink.cep.pattern.conditions.SimpleCondition
import org.apache.flink.streaming.api.scala._
import org.apache.flink.streaming.api.windowing.time.Time

case class Transaction(
  txn_id: Long, account_id: Long, amount: Double,
  location: String, ts: Long, merchant: String
)

val env = StreamExecutionEnvironment.getExecutionEnvironment
  .setParallelism(100)
  .enableCheckpointing(60000)  // 60s checkpoint, exactly-once

val txns: KeyedStream[Transaction, Long] = env
  .addSource(new TransactionSource)
  .keyBy(_.account_id)  // group by account

// Fraud pattern: 3 transactions > $500 within 5 minutes
val fraudPattern: Pattern[Transaction, _] = Pattern
  .begin[Transaction]("large_txn")
    .where(new SimpleCondition[Transaction]() {
      override def filter(t: Transaction): Boolean = t.amount > 500.0
    })
    .times(3)  // exactly 3 occurrences
    .within(Time.minutes(5))  // within 5-minute window

// Apply pattern — emits matched sequences as fraud alerts
val fraudAlerts: DataStream[FraudAlert] = CEP.pattern(txns, fraudPattern)
  .select(events => FraudAlert(
    account_id = events.head.account_id,
    n_suspicious_txns = events.length,
    total_amount = events.map(_.amount).sum,
    detection_ts = System.currentTimeMillis()
  ))

// Sink: alert to Kafka topic + write to Bronze Iceberg
fraudAlerts.addSink(new KafkaSink("alerts.fraud"))
fraudAlerts.addSink(new IcebergSink("bronze.fraud_alerts"))

env.execute("fraud-detection-cep")`;

const FLINK_DATASET_API = `// ============================================================
// Flink Dataset API — typed Scala/Java DSL for streaming pipelines
// Lower-level than Table API/SQL; full control over operators
// ============================================================

import org.apache.flink.streaming.api.scala._
import org.apache.flink.streaming.api.windowing.time.Time
import org.apache.flink.streaming.api.functions.ProcessFunction
import org.apache.flink.util.Collector

case class SensorReading(
  sensor_id: String, metric: String, value: Double,
  region: String, ts: Long, quality: Int
)

val env = StreamExecutionEnvironment.getExecutionEnvironment
  .setParallelism(200)
  .enableCheckpointing(30000)
  .setBufferTimeout(100)  // 100ms batching for throughput

// Source: Kafka (sensor events as JSON)
val stream: DataStream[SensorReading] = env
  .addSource(new FlinkKafkaConsumer(
    "sensors.airnow",
    new JSONKeyValueDeserializationSchema,
    kafkaProps
  ))
  .map(_.value)  // extract value from JSON
  .filter(_.quality > 50)  // drop low-quality readings

// Process function — per-event processing with state + timers
val enriched: DataStream[SensorReading] = stream
  .keyBy(_.sensor_id)
  .process(new SensorCalibrator)  // stateful: per-sensor calibration factor

// Window: 1-minute tumbling per region
val hourlyAgg: DataStream[RegionAQI] = enriched
  .keyBy(_.region)
  .timeWindow(Time.minutes(1))
  .aggregate(new AQIAggregator)

// Side output: anomaly stream (value > 3 sigma from rolling mean)
val anomalies: DataStream[SensorAnomaly] = enriched
  .getSideOutput[SensorAnomaly](anomalyTag)

// Sink: Iceberg (Bronze tier — partitioned by region + hour)
hourlyAgg.addSink(new IcebergSink("bronze.aqi_by_region"))
anomalies.addSink(new KafkaSink("alerts.sensor_anomalies"))

env.execute("sensor-pipeline")

// ============================================================
// Flink vs Spark Streaming: Flink is true streaming (one event at a
// time, sub-ms latency); Spark Streaming is micro-batch (X-second
// batches, higher latency, simpler semantics).
// ============================================================`;

// ============================================================
// Pyodide demo — Flink pipeline simulation in browser
// ============================================================

const PYODIDE_DEMO = `# ============================================================
# Flink pipeline simulation — watermarks + exactly-once + state
# Simulates a Kafka source, Flink processing, Iceberg Bronze sink
# ============================================================

import random
from collections import defaultdict, deque

print("=== Flink Pipeline Simulation ===")
print("Kafka source → Flink (watermark + state) → Iceberg Bronze sink")
print()

# Simulate Kafka topic with sensor events (some out-of-order)
random.seed(42)
n_sensors = 1000
n_events = 5000

# Generate events with random out-of-order arrival
events = []
for i in range(n_events):
    event = {
        'sensor_id': f'sensor-{random.randint(1, n_sensors):04d}',
        'metric': random.choice(['pm25', 'o3', 'temp']),
        'value': max(0, random.gauss(15, 10)),
        'event_ts': i + random.randint(-3, 0),  # some late
        'kafka_offset': i,
    }
    events.append(event)

# Shuffle arrival order (simulates out-of-order from Kafka)
random.shuffle(events)

# Flink watermark tracker (per-partition max event_ts - 5s tolerance)
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
    def is_late(self, event_ts, window_end):
        return event_ts < self.watermark() or event_ts < window_end - self.tolerance

# Flink stateful operator (per-sensor calibration)
class StateBackend:
    def __init__(self):
        self.state = {}  # sensor_id -> rolling stats
    def get_or_init(self, sensor_id):
        if sensor_id not in self.state:
            self.state[sensor_id] = {'count': 0, 'sum': 0.0, 'mean': 0.0}
        return self.state[sensor_id]
    def update(self, sensor_id, value):
        s = self.get_or_init(sensor_id)
        s['count'] += 1
        s['sum'] += value
        s['mean'] = s['sum'] / s['count']
        return s['mean']

# Iceberg Bronze sink (exactly-once via checkpoint)
class IcebergSink:
    def __init__(self, name):
        self.name = name
        self.buffer = []  # buffered writes pending checkpoint
        self.committed = []
        self.checkpoint_id = 0
    def write(self, batch):
        # Stage: buffer the writes (not yet committed)
        self.buffer.extend(batch)
    def checkpoint(self):
        # 2-phase commit: stage -> commit atomically
        self.checkpoint_id += 1
        self.committed.extend(self.buffer)
        committed = self.buffer
        self.buffer = []
        return len(committed)

# Run pipeline
watermark = WatermarkTracker(tolerance=5)
state = StateBackend()
bronze = IcebergSink('bronze.sensor_1min')
late_events = []

# Tumbling window aggregation (1-minute = 60 events in sim time)
window_size = 60
window_buffer = defaultdict(list)  # (sensor, metric) -> list of values
checkpoint_interval = 100  # checkpoint every 100 events

for i, event in enumerate(events):
    ts = event['event_ts']
    watermark.update(ts)

    # Stateful operator: per-sensor rolling mean
    rolling_mean = state.update(event['sensor_id'], event['value'])

    # Window aggregation
    window_id = ts // window_size
    key = (event['sensor_id'], event['metric'], window_id)
    window_buffer[key].append(event['value'])

    # Check for late events (watermark already past window end)
    window_end = (window_id + 1) * window_size
    if watermark.is_late(ts, window_end):
        late_events.append(event)

    # Periodic checkpoint (exactly-once)
    if (i + 1) % checkpoint_interval == 0:
        # Flush closed windows to Iceberg buffer
        closed_windows = [(k, v) for k, v in window_buffer.items()
                          if (k[2] + 1) * window_size <= watermark.watermark()]
        for k, v in closed_windows:
            bronze.write([{
                'sensor_id': k[0], 'metric': k[1],
                'window_id': k[2],
                'avg_value': sum(v) / len(v),
                'n_readings': len(v)
            }])
            del window_buffer[k]
        # Commit checkpoint
        n_committed = bronze.checkpoint()

print(f"Source (Kafka events):        {n_events:,}")
print(f"Out-of-order events:          {sum(1 for e in events if e['event_ts'] < e['kafka_offset']):,}")
print(f"Watermark tolerance:          5 seconds")
print(f"Watermark final position:     {watermark.watermark()}")
print(f"Late events (dropped):        {len(late_events):,} ({100*len(late_events)/n_events:.1f}%)")
print(f"State entries (per-sensor):   {len(state.state)}")
print(f"Bronze committed:             {len(bronze.committed):,}")
print(f"Checkpoints completed:        {bronze.checkpoint_id}")
print()
print(f"State backend: HashMap (in-memory, fast)")
print(f"  Memory: ~{len(state.state) * 64 / 1024:.1f} KB (64 bytes/state entry)")
print(f"  For 50k sensors: ~3.1 MB (fits in JVM heap)")
print(f"  For 1M sensors: ~62 MB (still fits — use RocksDB for >100M)")
print()
print(f"Exactly-once guarantee:")
print(f"  - Source: Kafka offsets in Flink state (not auto-committed)")
print(f"  - Sink: Iceberg commits on checkpoint boundary (2-phase commit)")
print(f"  - Recovery: replay from last checkpoint (no dupes, no losses)")`;

// ============================================================
// Flink architecture SVG diagram
// ============================================================

function FlinkArchitectureDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("jobmanager");
  const nodes = {
    "client": { label: "Client (submit JobGraph)", desc: "Submit Flink JAR + JobGraph to JobManager via REST API or CLI", level: 0 },
    "jobmanager": { label: "JobManager (coordinator)", desc: "Schedules tasks, coordinates checkpoints, manages state metadata. Single leader + standbys (ZooKeeper/KRaft quorum).", level: 1 },
    "taskmanager": { label: "TaskManager × N (workers)", desc: "Runs Task Slots (parallelism units). Holds state (RocksDB on local disk). Sends heartbeats + ACKs to JM.", level: 2 },
    "source": { label: "Source (Kafka/CDC)", desc: "Kafka consumer with offsets in Flink state. Exactly-once via checkpoint-aligned commits.", level: 3 },
    "operators": { label: "Operators (map/filter/keyBy/window)", desc: "Stateful operators — per-key state in RocksDB. Watermark propagates through DAG.", level: 3 },
    "sink": { label: "Sink (Iceberg/Kafka)", desc: "Two-phase commit on checkpoint boundary — atomic, exactly-once writes to Bronze tier.", level: 3 },
    "state": { label: "State Backend (RocksDB)", desc: "Local-disk RocksDB on TaskManager. Checkpointed to S3/HDFS for recovery. Scales to TBs per TM.", level: 4 },
    "checkpoint": { label: "Checkpoint Coordinator", desc: "JM injects checkpoint barriers; flows through DAG. When all TMs ACK, JM commits state + offsets.", level: 4 },
  };
  const edges = [
    ["client", "jobmanager"],
    ["jobmanager", "taskmanager"],
    ["taskmanager", "source"],
    ["taskmanager", "operators"],
    ["taskmanager", "sink"],
    ["operators", "state"],
    ["jobmanager", "checkpoint"],
    ["checkpoint", "state"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "client": { x: 60, y: 30 },
    "jobmanager": { x: 200, y: 30 },
    "checkpoint": { x: 340, y: 30 },
    "taskmanager": { x: 200, y: 90 },
    "source": { x: 60, y: 150 },
    "operators": { x: 200, y: 150 },
    "sink": { x: 340, y: 150 },
    "state": { x: 200, y: 210 },
  };

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-primary" />
          Flink architecture — JobManager + TaskManagers + stateful operators + checkpoint barriers
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
                markerEnd="url(#arrow-flink)" />
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
            <marker id="arrow-flink" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
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
            Hover any node to see its role — the JobManager coordinates, TaskManagers execute, checkpoint barriers flow through.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Flink vs Spark Streaming vs Kafka Streams comparison table
// ============================================================

function FlinkComparisonTable() {
  const rows = [
    { feature: "Origin", flink: "Berlin Univ (2009), donated to Apache 2014", spark: "UC Berkeley AMPLab (2013)", kstreams: "LinkedIn (2016)" },
    { feature: "Processing model", flink: "True streaming (one event at a time)", spark: "Micro-batch (X-sec batches)", kstreams: "True streaming (per-record)" },
    { feature: "Latency", flink: "Sub-millisecond", spark: "100ms-seconds (batch-bound)", kstreams: "Sub-millisecond" },
    { feature: "State backends", flink: "HashMap + RocksDB (TBs)", spark: "RocksDB only (Structured Streaming)", kstreams: "RocksDB (per-store)" },
    { feature: "Exactly-once", flink: "Yes (2-phase commit on checkpoint)", spark: "Yes (write-ahead logs per batch)", kstreams: "Yes (transactions + EOS)" },
    { feature: "Event-time watermarks", flink: "Native, configurable per-source", spark: "Via withWatermark() in Structured Streaming", kstreams: "Via punctuations (limited)" },
    { feature: "Complex event processing", flink: "Native CEP library (Pattern API)", spark: "Via custom code (no CEP library)", kstreams: "Via custom code + KSQL" },
    { feature: "Stateful ops", flink: "ProcessFunction (full control)", spark: "mapGroupsWithState", kstreams: "Transformer + state stores" },
    { feature: "Deployment", flink: "Standalone / K8s / YARN / Mesos", spark: "Standalone / K8s / YARN / Mesos", kstreams: "Embedded in app (no cluster)" },
    { feature: "Best fit", flink: "Low-latency + complex state + CEP", spark: "Batch + streaming unified (simpler)", kstreams: "Microservices needing streaming" },
    { feature: "Production users", flink: "Alibaba, Uber, Netflix, AWS", spark: "All Databricks customers, Netflix", kstreams: "LinkedIn (7T msgs/day), New York Times" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          Flink vs Spark Streaming vs Kafka Streams — streaming engine comparison
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold text-primary">Apache Flink</th>
              <th className="text-left px-3 py-2 font-semibold">Spark Streaming</th>
              <th className="text-left px-3 py-2 font-semibold">Kafka Streams</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-primary/80">{r.flink}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.spark}</td>
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
  { label: "Origin", value: "Berlin Univ 2009", hint: "Stratosphere research project at Berlin University of Technology; donated to Apache Foundation in 2014. Born as a true streaming alternative to Spark's micro-batch model.", deltaTone: "flat" as const },
  { label: "Throughput", value: "Millions/sec", hint: "Alibaba Double 11: 1.7 billion events/sec processed by Flink on Singles' Day 2024. Uber, Netflix, AWS run production Flink clusters.", deltaTone: "up" as const },
  { label: "State size", value: "TB-scale", hint: "RocksDB state backend enables TB-scale state per TaskManager. Alibaba uses 10TB+ state for real-time recommendation; Netflix 500GB for playback analytics.", deltaTone: "up" as const },
  { label: "Latency", value: "Sub-ms", hint: "True streaming (one event at a time) vs Spark's micro-batch (X-sec batches). Flink achieves sub-millisecond end-to-end latency with proper tuning.", deltaTone: "up" as const },
];

export function FlinkPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Apache Flink · stream processing · exactly-once · CEP"
        title="Apache Flink — true stream processing at scale"
        description="Flink is the gold-standard for true (per-event) stream processing — sub-millisecond latency, exactly-once semantics via two-phase commit on checkpoint, petabyte-scale state via RocksDB, and a native Complex Event Processing (CEP) library. Born at Berlin University of Technology (2009) as a research alternative to Spark's micro-batch model, Flink now powers Alibaba's Singles' Day (1.7B events/sec), Uber's real-time ETL, Netflix's playback analytics, and AWS's managed Kinesis Data Analytics. Flink is the streaming engine of choice for Iceberg/Delta/Hudi Bronze-tier writes — its exactly-once guarantees are non-negotiable for clinical genomics, fraud detection, and LHC trigger pipelines."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Exactly-once</Badge>
            <Badge variant="outline" className="gap-1.5"><Activity className="h-3 w-3" /> True streaming</Badge>
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
        title="Flink architecture — JobManager + TaskManagers + checkpoint barriers"
        description="Flink's runtime is a master-worker architecture. The JobManager (single leader + standbys via ZooKeeper/KRaft) coordinates scheduling, checkpoints, and recovery. TaskManagers (workers) run Task Slots (parallelism units), hold operator state in RocksDB, and ACK checkpoints. Checkpoint barriers flow through the DAG; when all operators ACK, the JobManager commits state + offsets atomically — exactly-once semantics."
        icon={<Activity className="h-5 w-5" />}
        badge="architecture"
      >
        <FlinkArchitectureDiagram />
      </SectionCard>

      {/* Watermarks + windowing */}
      <SectionCard
        title="Event-time watermarks + windowed aggregation"
        description="Watermarks are Flink's mechanism for handling out-of-order events. The watermark is defined as (max event_ts seen - tolerance); events older than the watermark are 'late' and either dropped or routed to side output. This enables event-time processing (windows align to event timestamps, not arrival time) which is essential for accurate analytics when Kafka topics deliver events out-of-order due to producer retries, network jitter, or parallel consumers."
        icon={<Atom className="h-5 w-5" />}
        badge="Flink SQL"
      >
        <CodeBlock code={FLINK_WATERMARK_SQL} language="sql" filename="flink_watermarks.sql" highlight={[12, 13, 14, 15, 16, 17, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42]} />
      </SectionCard>

      {/* State backends */}
      <SectionCard
        title="State backends — HashMap (in-memory) vs RocksDB (disk)"
        description="Flink's stateful operators (per-key aggregations, joins, CEP) need a storage backend. HashMapStateBackend keeps state in JVM heap (~10× faster than RocksDB) but is bounded by heap size (32-64 GB typical). EmbeddedRocksDBStateBackend stores state on local SSD (scales to TBs per TaskManager) but is ~10× slower. Alibaba uses RocksDB for 10TB+ state on Singles' Day; Netflix uses 500GB for real-time playback analytics."
        icon={<Database className="h-5 w-5" />}
        badge="State"
      >
        <CodeBlock code={FLINK_STATE_BACKENDS} language="sql" filename="flink_state_backends.sql" highlight={[20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53]} />
      </SectionCard>

      {/* Exactly-once */}
      <SectionCard
        title="Exactly-once semantics — two-phase commit on checkpoint"
        description="Flink's exactly-once guarantee is the gold standard for streaming. The mechanism: (1) Kafka source stores consumer offsets in Flink state (not auto-committed); (2) Iceberg/Kafka sink buffers writes pending checkpoint; (3) checkpoint barrier flows through the DAG; (4) when all operators ACK, the JobManager commits state + offsets + sink writes atomically. If a TaskManager crashes, Flink recovers from the last checkpoint with no duplicates and no losses. This is non-negotiable for clinical genomics (a lost variant = missed BRCA1 mutation) and LHC triggers (a duplicated event = false physics signal)."
        icon={<ShieldCheck className="h-5 w-5" />}
        badge="Exactly-once"
      >
        <CodeBlock code={FLINK_EXACTLY_ONCE} language="sql" filename="flink_exactly_once.sql" highlight={[20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57]} />
      </SectionCard>

      {/* CEP */}
      <SectionCard
        title="Flink CEP — Complex Event Processing for pattern detection"
        description="Flink CEP provides a Pattern API for specifying temporal patterns over event streams: begin (start of pattern), followedBy (sequence), or (alternatives), not (absence), times (cardinality), within (time window). Use cases: fraud detection (3 transactions over USD 500 within 5 minutes from one account), IoT anomaly detection (sensor reading outside 3 sigma of rolling mean), and LHC triggers (high-pT muon followed by missing ET within 100 nanoseconds). CEP is what makes Flink the gold standard for streaming pattern matching."
        icon={<Zap className="h-5 w-5" />}
        badge="Flink CEP"
      >
        <CodeBlock code={FLINK_CEP_SCALA} language="scala" filename="flink_cep.scala" highlight={[15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43]} />
      </SectionCard>

      {/* Dataset API */}
      <SectionCard
        title="Dataset API — typed Scala/Java DSL for full control"
        description="The Dataset API is the lower-level typed API (vs Table API/SQL). It gives full control over operators: ProcessFunction for per-event processing with state + timers, keyBy for partitioning, timeWindow for tumbling/sliding windows, and side output for routing late events or anomalies. Use the Dataset API when SQL is too restrictive (e.g. custom stateful logic, async I/O, side outputs)."
        icon={<Cpu className="h-5 w-5" />}
        badge="Dataset API"
      >
        <CodeBlock code={FLINK_DATASET_API} language="scala" filename="flink_dataset_api.scala" highlight={[20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45]} />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: simulate a Flink pipeline in your browser (Pyodide)"
        description="Pure-Python simulation of a Flink pipeline — no JVM, no Kafka, no S3. Build a synthetic pipeline: generate 5,000 sensor events (some out-of-order), track watermarks with 5-second tolerance, run per-sensor stateful aggregation (HashMap state backend), detect late events (watermark already past window end), and commit to an Iceberg Bronze sink via two-phase commit on checkpoint. See exactly-once in action — recovery would replay from the last checkpoint with no duplicates."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={PYODIDE_DEMO} buttonLabel="Run Flink pipeline simulation (Pyodide)" />
      </SectionCard>

      {/* Comparison table */}
      <SectionCard
        title="Flink vs Spark Streaming vs Kafka Streams — streaming engine comparison"
        description="Three streaming engines compete. Flink is true-streaming (sub-ms latency, full CEP, TB-scale state) — best for low-latency + complex state + pattern matching. Spark Structured Streaming is micro-batch (simpler semantics, unified with batch Spark) — best for teams already on Spark. Kafka Streams is embedded in your app (no cluster to manage) — best for microservices needing streaming."
        icon={<Boxes className="h-5 w-5" />}
      >
        <FlinkComparisonTable />
      </SectionCard>

      {/* Why this evolved */}
      <SectionCard
        title="Why Flink evolved — shortfalls of Spark Streaming (Era 2)"
        description="Modern data engineers chose Flink over Spark Streaming because Spark's micro-batch model had four critical shortfalls that made true low-latency streaming painful. Flink was designed ground-up as true streaming to fix all four."
        icon={<History className="h-5 w-5" />}
        badge="Why Flink"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: Micro-batch latency was too high.</strong> Spark Streaming (DStream API) processes events in X-second batches — even at 1-second batch interval, end-to-end latency is 1-2 seconds. For real-time fraud detection (sub-100ms required) or LHC triggers (sub-microsecond required), Spark is unusable. Flink's true streaming processes one event at a time, achieving sub-millisecond latency. <strong className="text-foreground/80">Result:</strong> 100-1000× lower latency for latency-sensitive workloads.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: No true event-time semantics.</strong> Spark Streaming's processing-time windows aligned to wall-clock, not event timestamps. Out-of-order events (common in Kafka) landed in wrong windows. Flink's watermark mechanism (max event_ts seen minus tolerance) is the academic state-of-the-art for out-of-order processing — published in the Google Dataflow paper (Akidau et al. 2015). <strong className="text-foreground/80">Result:</strong> accurate analytics on real-world Kafka topics where events arrive out-of-order.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: State was an afterthought.</strong> Spark Streaming's stateful ops (updateStateByKey, mapGroupsWithState) were bolted-on; state grew unbounded, no RocksDB backend, no incremental checkpoints. Flink designed state as a first-class citizen: pluggable backends (HashMap for speed, RocksDB for scale), incremental checkpoints (only delta state uploaded), state TTL for auto-expiry. <strong className="text-foreground/80">Result:</strong> Alibaba runs 10TB+ state on Singles' Day; Netflix runs 500GB for playback analytics — neither is possible on Spark.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: Exactly-once was bolted-on.</strong> Spark Streaming's exactly-once (Structured Streaming) uses write-ahead logs per batch — works but adds 100ms+ per batch. Flink's two-phase commit on checkpoint barrier is a unified mechanism: barrier flows through DAG, all operators ACK, then commit. No per-batch WAL overhead. <strong className="text-foreground/80">Result:</strong> exactly-once at 1.7B events/sec (Alibaba Singles' Day 2024) — Spark cannot match this throughput with exactly-once enabled.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique Flink features (vs Spark Streaming + Kafka Streams)"
        description="Flink has four features that are genuinely unique — not marketing fluff, but structural differentiators that no other streaming engine has yet matched."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. True streaming (sub-ms latency)</p>
            <p className="text-muted-foreground">One event at a time, no batch overhead. <strong>Spark Streaming cannot go below 100ms batch interval; Kafka Streams is comparable but lacks Flink's state management.</strong> Flink wins on latency-sensitive workloads.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Native CEP library</p>
            <p className="text-muted-foreground">Pattern API (begin/followedBy/or/not/times/within) for complex event detection. <strong>Spark + Kafka Streams have no equivalent — you write custom code.</strong> Used by LHC for trigger pattern matching.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Pluggable state backends</p>
            <p className="text-muted-foreground">HashMap (in-memory, fast) vs RocksDB (disk, TB-scale) — choose per job. <strong>Spark only has RocksDB; Kafka Streams is RocksDB-only.</strong> Flink scales from 1KB to 10TB+ state per TaskManager.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Two-phase commit on checkpoint</p>
            <p className="text-muted-foreground">Unified exactly-once: barrier flows through DAG, all operators ACK, commit atomically. <strong>Spark uses per-batch WALs (slower); Kafka Streams uses transactions (limited to Kafka).</strong> Flink's 2PC works across Kafka + Iceberg + Sinks.</p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples cards */}
      <SectionCard
        title="2 scientific streaming examples — Bronze via Flink"
        description="Two production-style scientific streaming examples showing Flink in action. Each is a clickable card opening a lazy popup with: scenario brief (dataset/scale/why), dataset stats grid, computational tooling, multi-language code in Scala + Rust + Go + Elixir + Zig, and an implementation insight. All examples show how Flink enables the Bronze→Silver→Gold medallion for science."
        icon={<Database className="h-5 w-5" />}
        badge="2 examples × 5 langs"
      >
        <DatasetCards
          examples={FLINK_SCIENCE_EXAMPLES}
          intro="Real-time genomics variant calling (10k variants/sec from Illumina NovaSeq → Bronze Iceberg) + LHC trigger pipeline (40MHz collisions → Flink CEP → Bronze). Each card has Scala/Rust/Go/Elixir/Zig code with Flink's exactly-once + watermark + CEP differentiators."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the Flink ecosystem"
        description="Flink's ecosystem includes connectors to most streaming sources/sinks, libraries for CEP + ML + Gelly (graph), and integrations with all major lakehouse formats (Iceberg/Delta/Hudi). Deployment options range from standalone clusters to Kubernetes to managed cloud services."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Connectors (sources + sinks)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Apache Kafka</strong> — primary source/sink (exactly-once via transactions)</li>
              <li>• <strong>Apache Iceberg</strong> — Bronze/Silver/Gold sink (2PC on checkpoint)</li>
              <li>• <strong>Delta Lake</strong> — Delta sink (Databricks ecosystem)</li>
              <li>• <strong>Apache Hudi</strong> — Hudi MOR sink (CDC upserts)</li>
              <li>• <strong>Kinesis</strong> — AWS Kinesis source/sink</li>
              <li>• <strong>Pulsar</strong> — Pulsar source/sink (streaming-native)</li>
              <li>• <strong>JDBC</strong> — Postgres/MySQL/Oracle sinks (exactly-once via XA)</li>
              <li>• <strong>Cassandra + Elasticsearch</strong> — denormalized sinks</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cloud className="h-3.5 w-3.5 text-primary" /> Libraries + deployments</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Flink CEP</strong> — Complex Event Processing (Pattern API)</li>
              <li>• <strong>Flink ML</strong> — online learning + model serving</li>
              <li>• <strong>Gelly</strong> — graph processing (PageRank, triangle counting)</li>
              <li>• <strong>Stateful Functions</strong> — serverless stateful (event-driven)</li>
              <li>• <strong>Standalone</strong> — cluster on bare metal / VMs</li>
              <li>• <strong>Kubernetes</strong> — Native K8s operator (active-passive JM)</li>
              <li>• <strong>Amazon Kinesis Analytics</strong> — managed Flink on AWS</li>
              <li>• <strong>Google Cloud Dataflow</strong> — managed Flink (Dataflow runner)</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers and production deployments that defined Flink + true streaming. The Google Dataflow paper (Akidau 2015) is the academic foundation; Alibaba + Uber + Netflix engineering blogs document production scale."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Akidau et al. 2015 (VLDB):</strong> "The Dataflow Model: A Practical Approach to Balancing Correctness, Latency, and Cost in Massive-Scale, Unbounded, Out-of-Order Data Processing." Google's paper on event-time processing, watermarks, and windowing. Flink's watermark implementation directly follows this paper. Argued that batching is a special case of streaming (the "Kappa architecture" thesis) — directly inspired Jay Kreps' Kappa architecture essay.
          </p>
          <p>
            <strong className="text-foreground/80">Carbone et al. 2015 (Apache Flink white paper):</strong> "Apache Flink: Stream and Batch Processing in a Single Engine." Described Flink's unified DataStream API (streaming + batch as special cases), incremental checkpoints (only delta state uploaded), and asynchronous checkpoint barriers (no alignment for slow operators). The academic foundation for Flink's runtime design.
          </p>
          <p>
            <strong className="text-foreground/80">Alibaba Singles' Day Production Case (2018-2024):</strong> Alibaba migrated its real-time recommendation + fraud detection from Spark Streaming to Flink in 2017. Singles' Day 2024 processed 1.7 billion events/sec at peak via Flink on 10TB+ state (RocksDB-backed). Their blog post "Apache Flink at Alibaba: 5 Years of Evolution" is the canonical reference for production-scale Flink.
          </p>
          <p>
            <strong className="text-foreground/80">Uber Production Case (2017):</strong> "Introducing Apache Flink at Uber." Replaced their internal streaming framework (formerly Samza-based) with Flink to handle 100B+ events/day. Use cases include real-time ETL (Kafka → Iceberg Bronze), fraud detection (CEP for transaction patterns), and dynamic pricing (per-region aggregations). Their migration blog is a must-read for any team moving from Spark Streaming to Flink.
          </p>
          <p>
            <strong className="text-foreground/80">Netflix Production Case (2020):</strong> "Apache Flink at Netflix: Real-time Playback Analytics." Netflix uses Flink for real-time viewing analytics — 500GB of RocksDB state per TaskManager tracks per-user playback position, buffering events for replay. Sub-second latency from click to dashboard update. Bronze Iceberg sink via exactly-once for downstream batch analytics.
          </p>
          <p>
            <strong className="text-foreground/80">Flink CEP for LHC Triggers (CERN 2023):</strong> CERN prototyped Flink CEP for L1 trigger pattern matching — high-pT muon followed by missing ET within 100 nanoseconds. While L1 triggers are still custom hardware (FPGAs), Flink CEP simulates the trigger logic for offline validation and trigger-efficiency studies. Bronze Iceberg stores trigger decisions for physics analysis.
          </p>
          <p>
            <strong className="text-foreground/80">Apache Flink 2.0 (2025):</strong> Major release with adaptive batch execution (batches converted from streaming when latency allows), native Kubernetes operator, and the new FLIP-261 Async I/O redesign. Closes the gap with Spark Structured Streaming for hybrid batch+streaming use cases.
          </p>
        </div>
      </SectionCard>

      {/* Deeper-thought insight */}
      <SectionCard
        title="My deeper thought: Flink IS the streaming WAL for the lakehouse"
        description="The unifying view: Flink's checkpoint barriers are structurally a write-ahead log for the entire streaming DAG. Each checkpoint is a log entry; the state backend is the materialised view; the sink commits are the WAL apply step. Flink's 'innovation' is recognising that database WAL semantics apply to distributed streaming."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Flink's checkpoint IS a distributed write-ahead log.</strong> Every database engine since the 1970s uses a WAL: writes go to an append-only log first, then get checkpointed to immutable storage. Flink's checkpoint barriers do exactly this — the barrier flows through the DAG, each operator stages its state, when all ACK, the JobManager commits. The state backend is the materialised view; the checkpoint is the WAL entry; the sink commit is the apply step. <strong>PostgreSQL does this with WAL + MVCC; Kafka does it with log offsets; Flink does it with checkpoint barriers across the DAG.</strong> The "innovation" is recognising that WAL semantics generalise to distributed streaming — every operator gets durable, replayable state.
          </p>
          <p>
            <strong className="text-foreground/80">Watermarks ARE monotonic timestamps with bounded slack.</strong> The Google Dataflow paper formalised watermarks as: <code className="font-mono">watermark = max(event_ts seen) - tolerance</code>. This is structurally identical to multi-version concurrency control (MVCC) in databases — the watermark is the "low-water mark" of events that may still arrive. Events older than the watermark are "late" (analogous to "aborted transactions" in MVCC). The watermark advances monotonically because event_ts advances monotonically (modulo out-of-order tolerance). <strong>This is the same pattern as Bitcoin's median-time-past (MTP) for block timestamps.</strong>
          </p>
          <p>
            <strong className="text-foreground/80">State backends ARE materialised views of the event stream.</strong> In database terms, Flink's stateful operators maintain materialised views of the event stream — per-key running aggregates, joins, CEP matches. The RocksDB state backend IS the materialised view storage; the checkpoint IS the materialised view refresh. This is structurally identical to PostgreSQL's materialised views + refresh, or dbt's incremental models — but applied to unbounded streams. <strong>The "innovation" is incremental checkpointing (only delta state uploaded) — same as PostgreSQL's logical replication (only WAL entries sent).</strong>
          </p>
          <p>
            <strong className="text-foreground/80">Exactly-once IS two-phase commit (2PC).</strong> Flink's exactly-once is structurally the classic 2PC protocol from distributed databases (Gray 1978): (1) coordinator sends PREPARE; (2) participants vote YES/NO; (3) if all YES, coordinator sends COMMIT; (4) participants apply + ACK. Flink's barrier is the PREPARE message; operator ACK is the YES vote; checkpoint commit is the COMMIT message. <strong>The "innovation" is the barrier flowing through the DAG as a control message embedded in the data stream</strong> — same as TCP's urgent pointer or RDMA's completion queue entries. Classic 2PC + flow-based control plane.
          </p>
          <p>
            <strong className="text-foreground/80">Flink IS to streaming what PostgreSQL was to OLTP.</strong> Before PostgreSQL, every database had its own WAL + MVCC + query engine tightly coupled. PostgreSQL's WAL + MVCC + ACID on shared storage became the reference implementation that everyone forked (Redshift, Greenplum, CockroachDB, YugabyteDB). Flink is doing the same for streaming — its DataStream API + checkpoint + state backend pattern is being reimplemented by Kafka Streams (transactions + EOS), Spark Structured Streaming (write-ahead logs), and Pulsar Functions. <strong>The pattern is the standard; the implementations are interchangeable.</strong> This is what "true streaming" actually means.
          </p>
        </div>
      </SectionCard>


      <DeeperThoughtSection pageTitle="Flink">
        <DeeperThought title="Flink IS event-time processing — and it's the right abstraction" connectedTo="ADR-001 (platform architecture)">
          <p>{"Flink's event-time processing (using the event's timestamp, not the processing time) IS the correct abstraction for streaming. If a Kafka message was produced at 10:00 but processed at 10:05, the 5-minute delay should NOT affect the computation. Event-time + watermarks handle this correctly: process the event AS IF it arrived at 10:00. Processing-time would produce wrong results when backpressure delays messages. Event-time IS to streaming what ACID is to databases — a correctness guarantee."}</p>
        </DeeperThought>
        <DeeperThought title="Flink's checkpoint IS Chandy-Lamport distributed snapshots — and it's the right algorithm" connectedTo="ADR-013 (Delta Lake)">
          <p>{"Flink's checkpointing mechanism (barrier injection + async snapshot) IS the Chandy-Lamport distributed snapshot algorithm (1985). The barrier IS the marker that separates pre-snapshot from post-snapshot state. Each operator snapshots its state when it sees the barrier. This gives exactly-once semantics WITHOUT pausing the pipeline. The math (distributed snapshots) IS 40 years old; the implementation (Flink) IS modern. The algorithm stays; the framework evolves."}</p>
        </DeeperThought>
        <DeeperThought title="Flink's watermark IS the truth about time — and it's a trade-off" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"Watermarks tell Flink: 'I believe all events with timestamp < T have arrived.' This IS a trade-off: high watermark = low latency but risk of late events (wrong results); low watermark = correct results but high latency (old data). The watermark IS the same trade-off as CAP theorem's consistency vs availability — just for time instead of distributed state. Understanding watermarks IS understanding the fundamental tension in stream processing: you can't have both perfect correctness and zero latency."}</p>
        </DeeperThought>
        <DeeperThought title="Flink state IS a key-value store — and it's the right model" connectedTo="ADR-022 (pgvector for variant embeddings)">
          <p>{"Flink's managed state (ValueState, ListState, MapState) IS a key-value store embedded in the operator. The state IS local (no network calls), versioned (checkpointed), and queryable (QueryableState). This IS the SAME pattern as a database's buffer pool: local state for fast access, persisted for durability. The difference: Flink state is per-key (sharded by partition), while a database buffer pool is per-node. The pattern (local state + checkpoint) IS the same."}</p>
        </DeeperThought>
        <DeeperThought title="Flink vs Spark streaming IS micro-batch vs continuous — and continuous wins for low latency" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"Spark Structured Streaming processes data in micro-batches (collect 100ms of data → process → commit). Flink processes continuously (event-by-event). For latency-sensitive workloads (fraud detection, real-time alerting), continuous processing IS necessary — a 100ms batch delay can miss a fraud event. For throughput-sensitive workloads (ETL, aggregation), micro-batch IS fine. The trade-off (latency vs throughput) IS the same as TCP's Nagle algorithm (small packets = low latency, large packets = high throughput). Flink IS TCP_NODELAY; Spark IS Nagle."}</p>
        </DeeperThought>
      </DeeperThoughtSection>
      <RelatedTopics topics={[
        { id: "streaming" as const, reason: "Streaming overview — Flink vs Spark Streaming vs Kafka Streams" },
        { id: "kafka" as const, reason: "Apache Kafka — primary source/sink for Flink pipelines" },
        { id: "iceberg" as const, reason: "Apache Iceberg — Bronze tier sink (exactly-once via checkpoint)" },
        { id: "spark-streaming" as const, reason: "Spark Structured Streaming — sibling streaming engine (micro-batch)" },
        { id: "pulsar" as const, reason: "Apache Pulsar — alternative streaming source for Flink" },
        { id: "kafka-connect" as const, reason: "Kafka Connect — CDC ingestion feeding Flink" },
        { id: "schema-registry" as const, reason: "Schema Registry — Avro schema evolution for Flink sources" },
        { id: "modern-big-data" as const, reason: "Modern Big Data page — Flink in the broader lakehouse stack" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("streaming")} className="text-sm text-primary hover:underline">
          &rarr; Streaming overview (Kappa architecture)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("kafka")} className="text-sm text-primary hover:underline">
          &rarr; Apache Kafka (primary source/sink)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("iceberg")} className="text-sm text-primary hover:underline">
          &rarr; Apache Iceberg (Bronze tier sink)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("spark-streaming")} className="text-sm text-primary hover:underline">
          &rarr; Spark Structured Streaming (sibling)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("pulsar")} className="text-sm text-primary hover:underline">
          &rarr; Apache Pulsar (segmented alternative)
        </Link>
      </div>
    </div>
  );
}
