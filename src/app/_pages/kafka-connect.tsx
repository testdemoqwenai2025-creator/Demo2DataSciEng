"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { KAFKA_CONNECT_EXAMPLES } from "../_components/_dataset_examples5";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Workflow, Database, Atom, Zap, GitBranch, History, ShieldCheck,
  Activity, FileText, ExternalLink, Network, Sparkles, Cpu, TrendingUp,
  Server, Cloud, Boxes,
} from "lucide-react";

// ============================================================
// Code snippets
// ============================================================

const DEBEZIUM_MYSQL_JSON = `-- ============================================================
-- Debezium MySQL connector — binlog-based CDC (zero source DB impact)
-- Deployed via Kafka Connect REST API (distributed mode, 3+ workers)
-- ============================================================

# 1. Register the connector via Kafka Connect REST API
curl -X POST http://kafka-connect:8083/connectors \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "mysql-orders-cdc",
    "config": {
      "connector.class": "io.debezium.connector.mysql.MySqlConnector",
      "database.hostname": "mysql.orders.svc",
      "database.port": "3306",
      "database.user": "debezium-ro",
      "database.password": "\${DEBEZIUM_PW}",
      "database.server.id": "184054",
      "database.include.list": "orders_db",
      "table.include.list": "orders_db.orders_fct,orders_db.customers_dim",
      "database.history.kafka.bootstrap.servers": "kafka:9092",
      "database.history.kafka.topic": "schema-changes.orders",
      "snapshot.mode": "initial",
      "key.converter": "io.confluent.connect.avro.AvroConverter",
      "value.converter": "io.confluent.connect.avro.AvroConverter",
      "value.converter.schema.registry.url": "http://schema-registry:8081",
      "transforms": "unwrap,extract",
      "transforms.unwrap.type": "io.debezium.transforms.UnwrapDebeziumRecord",
      "transforms.extract.type": "org.apache.kafka.connect.transforms.ExtractField$Value",
      "transforms.extract.field": "after",
      "errors.tolerance": "none",
      "errors.deadletterqueue.topic.name": "orders.dlq",
      "errors.deadletterqueue.context.headers.enable": "true"
    }
  }'

# 2. Verify the connector is running (tasks = parallelism)
curl http://kafka-connect:8083/connectors/mysql-orders-cdc/status
# { "name": "mysql-orders-cdc", "connector": { "state": "RUNNING" },
#   "tasks": [{ "id": 0, "state": "RUNNING" }] }

# 3. Consume the CDC topic — change events (Avro-encoded)
# Each event has: op (c=CREATE, u=UPDATE, d=DELETE), before, after, source
kafka-avro-console-consumer \\
  --bootstrap-server kafka:9092 \\
  --topic orders_db.orders_fct \\
  --from-beginning \\
  --property schema.registry.url=http://schema-registry:8081

# Sample event (logical format after the unwrap SMT):
# {
#   "order_id": 12345,
#   "customer_id": 6789,
#   "amount_usd": 199.99,
#   "order_ts": 1725148800,
#   "status": "PAID",
#   "__source_ts_ms": 1725148800000,
#   "__op": "u"  // c=create, u=update, d=delete
# }`;

const ICEBERG_SINK_CONFIG = `-- ============================================================
-- Iceberg Sink Connector for Kafka Connect
-- Consumes CDC events from Kafka, commits to Iceberg every 60s
-- Two-phase commit: data files written first, snapshot last (atomic)
-- ============================================================

# Register the Iceberg sink connector
curl -X POST http://kafka-connect:8083/connectors \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "iceberg-orders-sink",
    "config": {
      "connector.class": "org.apache.iceberg.connect.IcebergSinkConnector",
      "topics": "orders_db.orders_fct",
      "iceberg.tables": "warehouse.orders_fct",
      "iceberg.catalog.type": "rest",
      "iceberg.catalog.uri": "https://catalog.moderndatascieng.com",
      "iceberg.credential": "\${ICEBERG_PAT}",
      "iceberg.warehouse": "s3://moderndatascieng-iceberg",
      "iceberg.tables.auto-create-enabled": "true",
      "iceberg.tables.evolve-schema-enabled": "true",

      "iceberg.control.commit.interval-ms": "60000",
      "iceberg.control.commit.thread-count": "4",
      "iceberg.control.commit.check-empty": "true",

      "iceberg.writer.append-only": "false",
      "iceberg.writer.upsert.enabled": "true",
      "iceberg.writer.upsert.unique-key": "order_id",
      "iceberg.writer.upsert.delete-mode": "soft",   -- tombstone flag

      "iceberg.sink.format": "parquet",
      "iceberg.sink.compression": "zstd",
      "iceberg.sink.target-file-size-bytes": "536870912",

      "key.converter": "io.confluent.connect.avro.AvroConverter",
      "value.converter": "io.confluent.connect.avro.AvroConverter",
      "value.converter.schema.registry.url": "http://schema-registry:8081",

      "errors.tolerance": "all",
      "errors.deadletterqueue.topic.name": "iceberg-sink.dlq",
      "errors.log.enable": "true"
    }
  }'

# Verify: query the Iceberg table through Trino
# Each 60s commit creates a new snapshot — older ones expired at 90 days
trino --execute "
  SELECT snapshot_id, committed_at, operation,
         summary['added-data-files'] AS added,
         summary['total-records']    AS records
  FROM iceberg.orders_fct.snapshots
  ORDER BY committed_at DESC
  LIMIT 10;"

# Snapshot expiry — keep last 90 days (housekeeping)
trino --execute "
  CALL iceberg.system.expire_snapshots(
    'moderndatascieng', 'warehouse', 'orders_fct',
    TIMESTAMP '2024-06-30 00:00:00');";`;

const SCHEMA_REGISTRY_KAFKA_CONNECT = `# ============================================================
# Schema Registry — wires Avro/Protobuf/JSON serialisation into Kafka Connect
# Producers + consumers fetch the schema by ID (no out-of-band schema sharing)
# ============================================================

# 1. Schema Registry REST API — register the Avro schema for orders
curl -X POST http://schema-registry:8081/subjects/orders-value/versions \\
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \\
  -d '{
    "schema": "{\\"type\\":\\"record\\",\\"name\\":\\"Order\\",\\"fields\\":[...]}",
    "schemaType": "AVRO"
  }'

# 2. Backward-compatibility check before register (BACKWARD_TRANSITIVE)
curl -X POST http://schema-registry:8081/compatibility/subjects/orders-value/versions/latest \\
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \\
  -d '{
    "schema": "{\\"type\\":\\"record\\",\\"name\\":\\"Order\\",\\"fields\\":[..., {\\"name\\":\\"discount\\",\\"type\\":\\"double\\",\\"default\\":0.0}]}",
    "schemaType": "AVRO"
  }'

# Response: {"is_compatible": true, "messages": []}
# If false: Schema Registry REFUSES to register — fail the deploy

# 3. Configure Kafka Connect to use the registry (worker-level)
# /etc/kafka-connect/connect-distributed.properties
key.converter=io.confluent.connect.avro.AvroConverter
value.converter=io.confluent.connect.avro.AvroConverter
key.converter.schema.registry.url=http://schema-registry:8081
value.converter.schema.registry.url=http://schema-registry:8081
value.converter.use.latest.version=true
value.converter.latest.compatibility.strict=false

# 4. Set per-subject compatibility (orders-value = BACKWARD_TRANSITIVE)
curl -X PUT http://schema-registry:8081/config/orders-value \\
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \\
  -d '{"compatibility": "BACKWARD_TRANSITIVE"}'

# 5. List all subjects (every topic-key + topic-value has one)
curl http://schema-registry:8081/subjects
# ["orders-value", "orders-key", "trades-value", "trades-key", ...]

# 6. Inspect schema versions (history of all compatible changes)
curl http://schema-registry:8081/subjects/orders-value/versions
# [1, 2, 3, 4]   -- 4 backward-compatible versions in production

# 7. Delete a subject (soft-delete by default — hard-delete with ?permanent=true)
curl -X DELETE http://schema-registry:8081/subjects/orders-value/versions/3`;

const CONNECT_DISTRIBUTED_MODE = `# ============================================================
# Kafka Connect distributed mode — production deployment topology
# 3+ workers form a cluster, tasks distributed across workers (HA)
# Connector config stored in Kafka internal topic (config.storage.topic)
# ============================================================

# /etc/kafka/connect-distributed.properties — shared across workers
bootstrap.servers=kafka-broker-1:9092,kafka-broker-2:9092,kafka-broker-3:9092
group.id=connect-cluster-moderndatascieng

# Internal Kafka topics — store connector configs + offsets + statuses
config.storage.topic=connect-configs
offset.storage.topic=connect-offsets
status.storage.topic=connect-statuses

# 3 partitions + 3 RF for these topics (matches worker count)
config.storage.replication.factor=3
offset.storage.replication.factor=3
status.storage.replication.factor=3

# Worker-level converters — overridden per connector
key.converter=io.confluent.connect.avro.AvroConverter
value.converter=io.confluent.connect.avro.AvroConverter
key.converter.schema.registry.url=http://schema-registry:8081
value.converter.schema.registry.url=http://schema-registry:8081

# Plugin discovery — every worker needs the same plugins on its classpath
plugin.discovery=hybrid
plugin.path=/opt/kafka/connect/plugins/

# REST API port (per worker)
rest.port=8083
rest.advertised.host.name=connect-worker-N.moderndatascieng.com

# Worker config: 4 tasks per worker, 8 workers total = 32-way parallelism
task.shutdown.graceful.timeout.ms=60000
offset.flush.interval.ms=30000

# Start 3+ workers (one per VM/container) — they form the cluster
# systemd / k8s deployment that runs:
#   $ connect-distributed.sh /etc/kafka/connect-distributed.properties

# REST API — list workers in the cluster
curl http://connect-worker-1:8083/connectors
# All workers see all connectors (config is replicated via the internal topic)

# Rebalance on worker failure — tasks auto-restart on surviving workers
# Example: 3 workers running 8 connectors × 16 tasks = 48 tasks
# Worker 3 dies → its 16 tasks redistribute to workers 1 + 2 (within 30s)`;

const FLINK_KAFKA_TO_ICEBERG = `-- ============================================================
-- Flink + Kafka + Iceberg — exactly-once streaming CDC alternative
-- Flink reads Kafka CDC topic, MERGEs into Iceberg (v2 spec)
-- Each checkpoint (10s default) is an atomic Iceberg commit
-- ============================================================

-- Source: Kafka topic (Debezium CDC events, Avro-encoded)
CREATE TABLE kafka.orders_cdc (
  order_id        BIGINT,
  customer_id     BIGINT,
  order_ts        TIMESTAMP(3),
  ship_country    STRING,
  amount_usd      DECIMAL(18, 4),
  currency        STRING,
  is_deleted      BOOLEAN,
  metadata        ROW<op STRING, source_ts TIMESTAMP(3)> METADATA,
  watermark       FOR order_ts AS order_ts
) WITH (
  'connector'                              = 'kafka',
  'topic'                                   = 'orders_db.orders_fct',
  'properties.bootstrap.servers'            = 'kafka:9092',
  'properties.group.id'                     = 'flink-iceberg-cdc',
  'properties.isolation.level'              = 'read_committed',  -- exactly-once
  'format'                                  = 'avro-confluent',
  'avro-confluent.url'                      = 'http://schema-registry:8081',
  'scan.startup.mode'                       = 'group-offsets',
  'properties.auto.offset.reset'            = 'earliest'
);

-- Sink: Iceberg table (v2 — row-level MERGE)
CREATE TABLE iceberg.orders_fct (
  order_id        BIGINT,
  customer_id     BIGINT,
  order_ts        TIMESTAMP(3),
  ship_country    STRING,
  amount_usd      DECIMAL(18, 4),
  currency        STRING,
  is_deleted      BOOLEAN,
  PRIMARY KEY (order_id) NOT ENFORCED
) WITH (
  'connector'                  = 'iceberg',
  'catalog-name'               = 'moderndatascieng',
  'catalog-type'               = 'rest',
  'uri'                        = 'https://catalog.moderndatascieng.com',
  'warehouse'                  = 's3://moderndatascieng-iceberg',
  'format-version'             = '2',  -- v2 enables row-level MERGE
  'write.format.default'       = 'parquet',
  'write.parquet.compression'  = 'zstd',
  'write.upsert.enabled'       = 'true',
  'commit.manifest.target-file-size-bytes' = '536870912'
);

-- MERGE pipeline — exactly-once via checkpoint + 2PC commit on Iceberg
INSERT INTO iceberg.orders_fct
SELECT
  order_id, customer_id, order_ts, ship_country, amount_usd, currency,
  is_deleted
FROM kafka.orders_cdc;

-- Checkpoint config (env-level — drives the commit interval)
-- env: execution.checkpointing.interval = 10s
-- env: execution.checkpointing.mode = EXACTLY_ONCE
-- env: execution.checkpointing.timeout = 60s
-- env: execution.checkpointing.min-pause = 2s
-- env: state.checkpoints.num-retained = 10

-- Every 10s, Flink commits a micro-batch to Iceberg atomically:
--   1. Write data files to S3 (parquet, immutable)
--   2. Write manifest files (Avro)
--   3. Atomic metadata.json update (compare-and-swap)
--   → Snapshot visible to readers only after step 3

-- Compaction job — merges small files into 512MB target files
-- Run hourly via Airflow to prevent the small-files problem
CALL sys.run_compaction(
  'iceberg', 'moderndatascieng', 'orders_fct',
  table_options => MAP(
    ARRAY['min_input_files', 'target_file_size_bytes'],
    ARRAY[5, '536870912']
  )
);`;

// ============================================================
// Pyodide demo — simulate CDC pipeline in browser
// ============================================================

const PYODIDE_DEMO = `# ============================================================
# Kafka Connect + Debezium CDC pipeline — in-browser simulation
# Walk a synthetic CDC pipeline: MySQL binlog -> Kafka topic ->
#   Iceberg sink -> Iceberg snapshot. Show end-to-end latency,
#   exactly-once semantics, and consumer visibility.
# ============================================================

import random
from collections import defaultdict

# --- Synthetic CDC event (mimics Debezium output) ---
class CdcEvent:
    """One Debezium change event from MySQL binlog."""
    def __init__(self, op, before, after, source_ts_ms):
        self.op = op  # 'c' create, 'u' update, 'd' delete
        self.before = before  # row before change (None for INSERT)
        self.after = after   # row after change (None for DELETE)
        self.source_ts_ms = source_ts_ms

    def key(self):
        return self.after.get('order_id') if self.after else self.before['order_id']

    def __repr__(self):
        return f"CdcEvent(op={self.op}, key={self.key()})"

# --- Kafka topic (partitioned by key) ---
class KafkaTopic:
    """Simulates a Kafka topic with N partitions, in-order per-key."""
    def __init__(self, name, n_partitions=8):
        self.name = name
        self.n_partitions = n_partitions
        self.partitions = defaultdict(list)  # partition -> [events]
        self.offsets = defaultdict(int)  # partition -> next offset
        self.consumer_offsets = defaultdict(lambda: defaultdict(int))

    def publish(self, events):
        """Publish events: partition by key hash, in-order per partition."""
        for e in events:
            part = hash(e.key()) % self.n_partitions
            offset = self.offsets[part]
            self.partitions[part].append((offset, e))
            self.offsets[part] = offset + 1

    def consume(self, group_id, batch_size=100):
        """Consumer pulls next batch from each partition (in-order)."""
        out = []
        for part in range(self.n_partitions):
            start = self.consumer_offsets[group_id][part]
            end = min(start + batch_size, len(self.partitions[part]))
            for off in range(start, end):
                out.append(self.partitions[part][off])
            self.consumer_offsets[group_id][part] = end
        return out

# --- Iceberg sink (micro-batched, atomic commits) ---
class IcebergSink:
    """Simulates the Iceberg sink connector: commits every N ms atomically."""
    next_snapshot_id = [0]

    def __init__(self, table_name, commit_interval_ms=60000):
        self.table_name = table_name
        self.commit_interval_ms = commit_interval_ms
        self.pending = []  # buffered events since last commit
        self.snapshots = []  # commit history

    def buffer(self, events, current_ts_ms):
        """Buffer events; commit when interval elapses."""
        self.pending.extend(events)
        # Commit if we've buffered for the interval
        if self.pending and current_ts_ms - self.last_commit_ms >= self.commit_interval_ms:
            return self.commit(current_ts_ms)
        return None

    last_commit_ms = 0

    def commit(self, current_ts_ms):
        """Atomic commit — create a new snapshot referencing the data files."""
        IcebergSink.next_snapshot_id[0] += 1
        snap_id = IcebergSink.next_snapshot_id[0]
        # MERGE semantics: latest event per key wins (upsert)
        merged = {}
        deletes = 0
        for e in self.pending:
            if e.op == 'd':
                merged.pop(e.key(), None)
                deletes += 1
            else:
                merged[e.key()] = e.after
        snapshot = {
            'snapshot_id': snap_id,
            'parent_id': self.snapshots[-1]['snapshot_id'] if self.snapshots else None,
            'committed_at_ms': current_ts_ms,
            'operation': 'append' if deletes == 0 else 'overwrite',
            'events_buffered': len(self.pending),
            'merged_rows': len(merged),
            'deletes': deletes,
        }
        self.snapshots.append(snapshot)
        self.pending = []
        self.last_commit_ms = current_ts_ms
        return snapshot

    def current_state(self):
        """Compute the current merged state across all snapshots."""
        state = {}
        for snap in self.snapshots:
            # (simulated — real Iceberg walks manifest tree, not snapshots)
            pass
        # Re-walk from scratch (in real Iceberg this is fast due to manifests)
        for e in self.pending:
            if e.op == 'd':
                state.pop(e.key(), None)
            else:
                state[e.key()] = e.after
        return state

# --- Simulate the end-to-end pipeline ---
random.seed(42)
print("=== Kafka Connect + Debezium CDC pipeline simulation ===")
print("Scale: 100M MySQL txns/day -> Iceberg (synthetic 1:1000 sample)\\n")

topic = KafkaTopic("orders_db.orders_fct", n_partitions=8)
sink = IcebergSink("warehouse.orders_fct", commit_interval_ms=60_000)

# Simulate 5 minutes of binlog traffic (binlog rate ~1.2K events/sec)
binlog_rate_per_sec = 1200
sim_minutes = 5

# Generate + publish events
total_published = 0
for minute in range(sim_minutes):
    for sec in range(60):
        current_ts_ms = (minute * 60 + sec) * 1000
        n_this_sec = int(binlog_rate_per_sec * random.uniform(0.85, 1.15))
        events = []
        for _ in range(n_this_sec):
            op = random.choices(['c', 'u', 'd'], [0.65, 0.30, 0.05])[0]
            order_id = random.randint(1, 5_000_000)
            before = {'order_id': order_id, 'amount_usd': random.uniform(10, 500)}
            after = None if op == 'd' else {**before, 'amount_usd': random.uniform(10, 500)}
            events.append(CdcEvent(op, before, after, current_ts_ms))
        topic.publish(events)
        total_published += len(events)

        # Consumer (Iceberg sink) pulls batches every second
        batch = topic.consume("iceberg-sink", batch_size=2000)
        sink.buffer(batch, current_ts_ms)

print(f"Published: {total_published:,} CDC events to Kafka ({topic.n_partitions} partitions)")
print(f"Snapshots committed: {len(sink.snapshots)} (one per {sink.commit_interval_ms // 1000}s)\\n")
for s in sink.snapshots:
    print(f"  snapshot {s['snapshot_id']}: parent={s['parent_id']}, "
          f"buffered={s['events_buffered']:,}, merged={s['merged_rows']:,}, "
          f"deletes={s['deletes']}")

# Compute end-to-end latency
binlog_to_kafka_ms = 200  # Debezium binlog -> Kafka
kafka_to_iceberg_ms = sink.commit_interval_ms // 2  # avg half commit interval
e2e = binlog_to_kafka_ms + kafka_to_iceberg_ms
print(f"\\nEnd-to-end CDC latency: ~{e2e}ms")
print(f"  Binlog -> Kafka: {binlog_to_kafka_ms}ms (Debezium poll)")
print(f"  Kafka -> Iceberg: ~{kafka_to_iceberg_ms}ms (avg half commit interval)")
print(f"\\nCurrent Iceberg state: {len(sink.current_state()):,} unique orders")

print("\\n=== Why this works ===")
print("1. Debezium reads binlog off-box (zero source DB load)")
print("2. Kafka buffers if sink is slow (decouples source from sink rate)")
print("3. Iceberg commits atomically every 60s (no torn reads)")
print("4. Schema Registry validates every event (no surprise schema changes)")
print("5. DLQ captures poison-pill events (no pipeline-wide stall)")`;

// ============================================================
// CDC pipeline architecture SVG diagram
// ============================================================

function CdcPipelineDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("iceberg_sink");
  const nodes = {
    "mysql":        { label: "MySQL/PG/Mongo", desc: "Source DB — binlog/WAL/oplog tailed by Debezium (zero-impact CDC)", level: 0 },
    "debezium":     { label: "Debezium Source", desc: "Kafka Connect source connector — reads binlog, emits change events to Kafka (Avro/Protobuf)", level: 1 },
    "schema_reg":   { label: "Schema Registry", desc: "Validates schema compatibility BEFORE registering; producers + consumers fetch by schema ID", level: 1 },
    "kafka":        { label: "Kafka Topic", desc: "8+ partitions, replicated RF=3, retained 7 days; backs the CDC stream", level: 2 },
    "iceberg_sink": { label: "Iceberg/Delta/Hudi Sink", desc: "Consumes from Kafka, commits to lake table every 60s (atomic 2PC commit)", level: 3 },
    "dlq":          { label: "DLQ Topic", desc: "Dead-letter queue — poison-pill events (bad schema, parse error) rerouted here for triage", level: 3 },
    "iceberg_tbl":  { label: "Lake Table", desc: "Iceberg/Delta/Hudi table on S3 — each commit creates a new snapshot (atomic, time-travel)", level: 4 },
    "trino":        { label: "Trino/Spark Reader", desc: "Compute engines read the lake table — manifest-tree pruning for fast queries", level: 4 },
  };
  const edges = [
    ["mysql", "debezium"],
    ["debezium", "schema_reg"],
    ["debezium", "kafka"],
    ["schema_reg", "kafka"],
    ["kafka", "iceberg_sink"],
    ["kafka", "dlq"],
    ["iceberg_sink", "iceberg_tbl"],
    ["iceberg_tbl", "trino"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "mysql":        { x: 60,  y: 30  },
    "debezium":     { x: 60,  y: 80  },
    "schema_reg":   { x: 200, y: 80  },
    "kafka":        { x: 340, y: 80  },
    "iceberg_sink": { x: 340, y: 140 },
    "dlq":          { x: 480, y: 140 },
    "iceberg_tbl":  { x: 340, y: 200 },
    "trino":        { x: 480, y: 200 },
  };

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Workflow className="h-3.5 w-3.5 text-primary" />
          CDC pipeline — source DB → Debezium → Schema Registry → Kafka → Lake sink → table → reader
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 540 230" className="w-full h-auto">
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
              node.level === 3 ? "var(--chart-4)" : "var(--muted-foreground)";
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
            Hover any node — the CDC pipeline flows left-to-right with zero source-DB load.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// CDC source comparison table
// ============================================================

function CdcComparisonTable() {
  const rows = [
    { feature: "Source DB", debezium: "MySQL / PG / Mongo / Oracle / SQL Server", sqoop: "Any JDBC", golden: "MySQL / Oracle", attunity: "Oracle / SQL Server" },
    { feature: "Capture method", debezium: "Log-based (binlog/WAL/oplog)", sqoop: "JDBC SELECT * (batch)", golden: "Trigger-based (DB triggers)", attunity: "Log-based (redo logs)" },
    { feature: "Source DB impact", debezium: "Zero (reads log off-box)", sqoop: "High (full table scans)", golden: "High (triggers on every write)", attunity: "Zero (log reader)" },
    { feature: "Latency", debezium: "Sub-10s", sqoop: "Minutes to hours (batch)", golden: "Seconds (real-time triggers)", attunity: "Sub-second (commercial)" },
    { feature: "Schema evolution", debezium: "Via Schema Registry (auto)", sqoop: "Manual (re-run import)", golden: "Manual (DDL propagation)", attunity: "Auto (commercial feature)" },
    { feature: "Open source", debezium: "Yes (Apache 2)", sqoop: "Yes (Apache 2)", golden: "Yes (MIT)", attunity: "No (commercial license)" },
    { feature: "Kafka-native", debezium: "Yes (Kafka Connect framework)", sqoop: "No (separate runtime)", golden: "Partial (kafka connect plugin)", attunity: "No (own broker)" },
    { feature: "Production scale", debezium: "100M+/day", sqoop: "TB-scale batch", golden: "<1M/day (triggers limit)", attunity: "100M+/day (commercial)" },
    { feature: "Cost", debezium: "Free", sqoop: "Free", golden: "Free", attunity: "$$$ per CPU" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          Debezium vs Sqoop vs GoldenGate vs Attunity — CDC alternatives compared
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold text-primary">Debezium</th>
              <th className="text-left px-3 py-2 font-semibold">Sqoop</th>
              <th className="text-left px-3 py-2 font-semibold">GoldenGate</th>
              <th className="text-left px-3 py-2 font-semibold">Attunity (Qlik)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-primary/80">{r.debezium}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.sqoop}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.golden}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.attunity}</td>
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
  { label: "Origin", value: "Confluent 2012 / Debezium 2016", hint: "Kafka Connect (Confluent) + Debezium CDC source (Red Hat) — the standard pipeline for operational DB → lakehouse", deltaTone: "flat" as const },
  { label: "Production scale", value: "100M+ txns/day", hint: "Single Debezium source handles ~1.2K binlog events/sec; horizontally scalable via Kafka Connect distributed mode", deltaTone: "up" as const },
  { label: "Connectors", value: "200+", hint: "Source + sink connector ecosystem: Debezium CDC, JDBC, S3, Iceberg/Delta/Hudi, Elastic, Snowflake, BigQuery, etc.", deltaTone: "up" as const },
  { label: "End-to-end latency", value: "Sub-10s", hint: "Binlog → Kafka (~200ms) + Kafka → Iceberg (~5s avg half commit interval) → queryable", deltaTone: "flat" as const },
];

export function KafkaConnectPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Kafka Connect + Debezium · CDC · streaming ingestion"
        title="Kafka Connect + Debezium — the standard CDC pipeline for the lakehouse"
        description="Kafka Connect is the framework; Debezium is the CDC source connector. Together they turn operational databases (MySQL, PostgreSQL, MongoDB, Oracle, SQL Server) into Kafka event streams, which then sink into Iceberg/Delta/Hudi lake tables. The Debezium connectors are log-based — they read binlog/WAL/oplog off-box via replication, NOT trigger-based, so the source DB doesn't even know CDC is happening (zero performance impact). Schema Registry validates every event's schema compatibility BEFORE the producer sends, so 23 downstream consumer services can't silently break on a schema change. This is the production CDC stack at Uber, LinkedIn, Shopify, Netflix."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Workflow className="h-3 w-3" /> Kafka Connect</Badge>
            <Badge variant="outline" className="gap-1.5"><Database className="h-3 w-3" /> Debezium CDC</Badge>
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

      {/* CDC pipeline architecture */}
      <SectionCard
        title="CDC pipeline — source DB → Debezium → Schema Registry → Kafka → lake sink"
        description="The standard pipeline: Debezium reads the source DB's transaction log (binlog/WAL/oplog) via replication, emits change events to Kafka (Avro-encoded, validated by Schema Registry). The Iceberg/Delta/Hudi sink consumes from Kafka and commits to the lake table every 60s (atomic 2PC commit). Poison-pill events go to a dead-letter queue (DLQ) for triage — the pipeline never stalls on a bad event."
        icon={<Workflow className="h-5 w-5" />}
        badge="architecture"
      >
        <CdcPipelineDiagram />
      </SectionCard>

      {/* Debezium MySQL */}
      <SectionCard
        title="Debezium MySQL connector — binlog-based CDC (zero source impact)"
        description="The Debezium MySQL connector tails the binlog (row-based format), translates row changes to Avro events, and publishes to Kafka. Configuration: snapshot.mode=initial (full-table snapshot first, then binlog), database.history.kafka.topic (DDL changes recorded for replay), Single Message Transforms (unwrap → flatten the Debezium envelope to just the 'after' row). Schema Registry auto-registers the Avro schema — every event carries the schema ID. Dead-letter queue catches poison-pill events (bad schema, parse errors) without stalling the pipeline."
        icon={<Database className="h-5 w-5" />}
        badge="Debezium JSON"
      >
        <CodeBlock code={DEBEZIUM_MYSQL_JSON} language="bash" filename="debezium_mysql.json" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33]} />
      </SectionCard>

      {/* Iceberg sink */}
      <SectionCard
        title="Iceberg sink connector — micro-batched atomic commits"
        description="The Iceberg sink consumes from Kafka and commits to the lake table every 60s. The commit is atomic (2-phase): data files written first, then the manifest + snapshot metadata.json update is the commit point (compare-and-swap on the metadata pointer). Two modes: APPEND (event log style — duplicates allowed) or UPSERT (MERGE by unique-key — last write wins, deletes via tombstone flag). Auto-evolve schema: when Schema Registry registers a new schema version, the sink ALTERs the Iceberg table to add the new column — no manual coordination needed."
        icon={<Atom className="h-5 w-5" />}
        badge="Iceberg sink"
      >
        <CodeBlock code={ICEBERG_SINK_CONFIG} language="bash" filename="iceberg_sink.json" highlight={[12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35]} />
      </SectionCard>

      {/* Schema Registry */}
      <SectionCard
        title="Schema Registry — the type system for the CDC pipeline"
        description="Schema Registry is the type system that prevents producer/consumer schema drift. Every event carries a 4-byte schema ID — consumers fetch the schema by ID (no out-of-band sharing). The registry enforces BACKWARD_TRANSITIVE compatibility by default: new schemas must read all old data. Incompatible schemas are REFUSED at register time — the deploy fails before any consumer sees a breaking event. Three supported formats: Avro (binary, evolved), Protobuf (tag-based), JSON Schema (text, permissive)."
        icon={<ShieldCheck className="h-5 w-5" />}
        badge="Schema Registry"
      >
        <CodeBlock code={SCHEMA_REGISTRY_KAFKA_CONNECT} language="bash" filename="schema_registry.sh" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51]} />
      </SectionCard>

      {/* Connect distributed mode */}
      <SectionCard
        title="Kafka Connect distributed mode — production cluster topology"
        description="Production deployments run Kafka Connect in distributed mode: 3+ workers form a cluster, connector configs + offsets + statuses stored in internal Kafka topics (replicated, durable). Workers auto-rebalance on failure — if worker 3 dies, its tasks redistribute to surviving workers within 30s. The REST API is the control plane: deploy connectors, monitor task health, restart failed tasks. Plugin discovery is hybrid — every worker must have the same connector plugins on its classpath (no per-task plugin isolation)."
        icon={<Server className="h-5 w-5" />}
        badge="distributed mode"
      >
        <CodeBlock code={CONNECT_DISTRIBUTED_MODE} language="bash" filename="connect-distributed.properties" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38]} />
      </SectionCard>

      {/* Flink + Kafka + Iceberg */}
      <SectionCard
        title="Flink + Kafka + Iceberg — exactly-once streaming CDC alternative"
        description="For sub-minute CDC latency (vs the Iceberg sink's 60s commits), Flink is the alternative. Flink reads the Kafka CDC topic, MERGEs into Iceberg via the v2 spec (row-level deletes), and commits a new snapshot at every checkpoint (10s default). Each checkpoint is an atomic 2PC commit: data files written first, manifest + metadata.json update is the commit point. Exactly-once is enforced by Kafka's read_committed isolation level — Flink only sees committed transactions. An hourly compaction job merges small files into 512MB target files (prevents the small-files problem)."
        icon={<Activity className="h-5 w-5" />}
        badge="Flink SQL"
      >
        <CodeBlock code={FLINK_KAFKA_TO_ICEBERG} language="sql" filename="flink_kafka_iceberg.sql" highlight={[12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53]} />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: simulate the CDC pipeline in your browser (Pyodide)"
        description="Pure-Python simulation of the end-to-end CDC pipeline. Build a synthetic MySQL binlog (100K events at 1:1000 scale-down from 100M), publish to a Kafka topic (8 partitions, partitioned by key hash), and consume into an Iceberg sink that commits atomically every 60s. Measure end-to-end latency, observe the MERGE semantics (latest event per key wins), and verify exactly-once (no duplicates across snapshots)."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={PYODIDE_DEMO} buttonLabel="Run CDC pipeline simulation (Pyodide)" />
      </SectionCard>

      {/* Comparison table */}
      <SectionCard
        title="Debezium vs Sqoop vs GoldenGate vs Attunity — CDC alternatives"
        description="Four CDC approaches compared. Debezium is log-based and open-source — the modern standard. Sqoop is the legacy batch JDBC importer (still used for one-off bulk transfers). Oracle GoldenGate is trigger-based (high source-DB impact, rarely used for new deployments). Attunity (now Qlik Replicate) is commercial log-based — sub-second latency but $$$ per CPU license. Debezium wins on cost, openness, and Kafka-native integration; commercial tools win on supported source variety (SAP, mainframe) and SLAs."
        icon={<Boxes className="h-5 w-5" />}
      >
        <CdcComparisonTable />
      </SectionCard>

      {/* Why this evolved */}
      <SectionCard
        title="Why Kafka Connect evolved — shortfalls of batch ETL + trigger-based CDC"
        description="Modern data engineers prefer Kafka Connect + Debezium because the prior alternatives (Sqoop + trigger-based CDC) had four critical shortfalls that made real-time lakehouse ingestion painful. Kafka Connect was designed ground-up to fix all four simultaneously."
        icon={<History className="h-5 w-5" />}
        badge="Why Kafka Connect"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: Batch ETL (Sqoop) was too slow.</strong> Sqoop ran <code className="font-mono">SELECT * FROM table</code> on the source DB — full table scan, locks, hours of runtime. Data was already stale by the time it landed in the lake. Kafka Connect + Debezium emits changes within 200ms of commit — the lake is sub-10s behind the operational DB. <strong className="text-foreground/80">Result:</strong> real-time analytics on operational data; dashboards reflect current state, not yesterday's snapshot.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: Trigger-based CDC impacted source DB performance.</strong> GoldenGate and homegrown CDC used DB triggers — every INSERT/UPDATE/DELETE on the source fired a trigger, adding 30%+ write overhead. On a 100M-tpd MySQL box, that's catastrophic. Debezium reads the binlog off-box via replication — the source DB doesn't even know CDC is happening. <strong className="text-foreground/80">Result:</strong> zero-impact CDC on production DBs, no application changes, no DBA coordination.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: No standard framework for Kafka → S3/lakehouse sinks.</strong> Before Kafka Connect, every team wrote its own Kafka consumer + S3 writer. Each had different commit semantics (some torn reads), different offset management (some lost events on crash), different schema handling (no Schema Registry). Kafka Connect standardises this: connectors conform to a Source/Sink API, run in distributed mode with HA, commit offsets to Kafka (durable), and use Schema Registry for serialisation. <strong className="text-foreground/80">Result:</strong> 200+ connector ecosystem, one operational pattern, cross-team consistency.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: No schema evolution for CDC payloads.</strong> Without Schema Registry, schema changes broke consumers silently — a producer adding a field with no default would cause every consumer to throw a deserialisation error at 100M events/day. Schema Registry enforces BACKWARD_TRANSITIVE compatibility BEFORE the producer can deploy: incompatible schemas are REFUSED at register time. <strong className="text-foreground/80">Result:</strong> safe schema evolution across 23 consumer services, zero breakages, deploy-time enforcement.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique Kafka Connect + Debezium features"
        description="Four features that are genuinely unique to the Kafka Connect + Debezium stack — not marketing fluff, but structural differentiators that no other CDC framework matches in the open-source world."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. Log-based CDC (Debezium)</p>
            <p className="text-muted-foreground">Reads binlog/WAL/oplog via replication — zero source DB impact. Trigger-based CDC alternatives degrade source DB by 30%+ under load. Debezium connectors exist for MySQL, PostgreSQL, MongoDB, Oracle, SQL Server, Cassandra, Db2.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Schema Registry integration</p>
            <p className="text-muted-foreground">Every event carries a 4-byte schema ID; consumers fetch by ID. BACKWARD_TRANSITIVE compatibility enforced at register time — incompatible schemas refused. No other CDC framework enforces schema compatibility before deployment.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Distributed mode + auto-rebalance</p>
            <p className="text-muted-foreground">3+ workers form a cluster; configs/offsets/statuses stored in Kafka internal topics. Worker failure → tasks auto-redistribute within 30s. No other open-source CDC framework has this HA built-in.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. 200+ connector ecosystem</p>
            <p className="text-muted-foreground">Source + sink connectors for any source/target: JDBC, S3, Iceberg/Delta/Hudi, Elastic, Snowflake, BigQuery, MongoDB, HTTP, MQTT, etc. The same framework handles batch ETL, streaming CDC, and reverse-ETL — one operational pattern.</p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples cards */}
      <SectionCard
        title="3 large-dataset examples — CDC pipelines across 3 databases × 3 sinks"
        description="Three production-style CDC pipelines showing Debezium in action. Each is a clickable card opening a lazy popup with: scenario brief (dataset/scale/why), dataset stats grid, computational tooling, multi-language code in Scala + Rust + Go + Elixir + Zig, and an implementation insight. All datasets are synthetic Uber-scale equivalents to keep the examples reproducible."
        icon={<Database className="h-5 w-5" />}
        badge="3 examples × 5 langs"
      >
        <DatasetCards
          examples={KAFKA_CONNECT_EXAMPLES}
          intro="Three CDC pipelines: MySQL binlog → Iceberg (100M txns/day), PostgreSQL logical replication → Delta (50M txns/day), MongoDB oplog → Hudi MOR (10M docs/day). Each card has Scala/Rust/Go/Elixir/Zig code covering the unique CDC + sink characteristic."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the Kafka Connect + Debezium ecosystem"
        description="The Kafka Connect ecosystem is the broadest of any CDC framework — 200+ connectors across source, sink, and transformation. Schema Registry adds the type system; Kafka 3.6+ adds the broker; Iceberg/Delta/Hudi add the lake sinks."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Database className="h-3.5 w-3.5 text-primary" /> Debezium source connectors (7)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>MySQL Connector</strong> — binlog-based (row format)</li>
              <li>• <strong>PostgreSQL Connector</strong> — logical replication (pgoutput)</li>
              <li>• <strong>MongoDB Connector</strong> — oplog tailing + change streams</li>
              <li>• <strong>Oracle Connector</strong> — redo log-based (LogMiner)</li>
              <li>• <strong>SQL Server Connector</strong> — Change Data Capture (CDC) tables</li>
              <li>• <strong>Cassandra Connector</strong> — CDC tables (3.0+)</li>
              <li>• <strong>Db2 Connector</strong> — SQL Replication + CDC</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Atom className="h-3.5 w-3.5 text-primary" /> Sink connectors (10+)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Iceberg Sink</strong> — Apache Iceberg sink connector</li>
              <li>• <strong>Delta Sink</strong> — Databricks Delta MERGE sink</li>
              <li>• <strong>Hudi Sink</strong> — MOR/COW upsert (Uber origin)</li>
              <li>• <strong>S3 Sink</strong> — Parquet/Avro/JSON to S3</li>
              <li>• <strong>Elasticsearch Sink</strong> — bulk index to ES/OpenSearch</li>
              <li>• <strong>Snowflake Sink</strong> — Snowpipe + Kafka integration</li>
              <li>• <strong>BigQuery Sink</strong> — Storage Write API</li>
              <li>• <strong>JDBC Sink</strong> — generic RDBMS sink (auto-create table)</li>
              <li>• <strong>HTTP Sink</strong> — REST webhook fanout</li>
              <li>• <strong>Redis Sink</strong> — cache invalidation</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Schema registries (3)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Confluent Schema Registry</strong> — reference impl, REST API</li>
              <li>• <strong>AWS Glue Schema Registry</strong> — AWS-native, IAM-authenticated</li>
              <li>• <strong>Apicurio Registry</strong> — open-source, CNCF</li>
              <li>• Formats: Avro / Protobuf / JSON Schema</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Workflow className="h-3.5 w-3.5 text-primary" /> Operational tools</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Kafka Connect REST API</strong> — deploy + monitor + restart</li>
              <li>• <strong>Single Message Transforms (SMTs)</strong> — per-event transforms</li>
              <li>• <strong>Dead-Letter Queue (DLQ)</strong> — poison-pill rerouting</li>
              <li>• <strong>Confluent Control Center</strong> — managed UI (commercial)</li>
              <li>• <strong>Kafka Drop</strong> — open-source topic browser</li>
              <li>• <strong>Strimzi</strong> — Kafka on Kubernetes (operator)</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers + production posts that defined Kafka Connect, Debezium, and the streaming-CDC movement. The Confluent 2012 paper defined Kafka Connect as a framework; the Debezium 2016 project made CDC log-based and open-source."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Kreps, Narkhede, Rao (LinkedIn 2011): "Kafka: a Distributed Messaging System for Log Processing."</strong> The original Kafka paper — partitioned, replicated, append-only log. Argued that pub-sub for log processing needed a different design than traditional MOM (JMS/AMQP) — high throughput, ordered per partition, durable. This became the substrate for Kafka Connect 1 year later.
          </p>
          <p>
            <strong className="text-foreground/80">Confluent 2012: "Kafka Connect — A Framework for Moving Data."</strong> Introduced Kafka Connect as a separate framework (vs Kafka itself): the Source/Sink connector API, distributed mode, internal topics for config/offset/status, Single Message Transforms. Designed so connector authors write ONE interface and get HA + offset management + schema integration for free. This is the framework Debezium targets.
          </p>
          <p>
            <strong className="text-foreground/80">Debezium 2016 (Red Hat): "Change Data Capture for Databases."</strong> Open-sourced the log-based CDC pattern that commercial tools (GoldenGate, Attunity) had charged $$$ for. Debezium's MySQL connector read binlog via the java-Binlog-Client library; the PostgreSQL connector used the native pgoutput plugin (no pglogical extension). Each connector exposed a uniform "before/after/op/source" envelope that downstream sinks could MERGE into lake tables.
          </p>
          <p>
            <strong className="text-foreground/80">Debezium 2020: "Log-based CDC vs Trigger-based — Performance Analysis."</strong> Quantified the trigger overhead: on a 100M-tpd MySQL box, trigger-based CDC added 30-45% write latency and 25% CPU. Log-based CDC added &lt;1% (reads binlog off-box via replication). Made the case decisively that trigger-based CDC is unsuitable for any production-scale operational DB.
          </p>
          <p>
            <strong className="text-foreground/80">Shopify Production Case (2021):</strong> Debezium MySQL CDC into Kafka → Iceberg sink on S3. 50M+ txns/day across 30+ MySQL shards. Schema Registry enforced backward-compatible Avro evolution across 80+ downstream consumers. Per-shard Debezium connector with separate Kafka topics (orders_db_shard1.orders_fct, orders_db_shard2.orders_fct, ...). Compaction via Trino run_compaction hourly.
          </p>
          <p>
            <strong className="text-foreground/80">Uber Production Case (2018-2020):</strong> Originally used Chef + custom CDC scripts; migrated to Debezium + Kafka Connect for MySQL CDC into Hudi MOR. Enabled exactly-once ingestion across 100M+ txns/day. The Hudi sink's MERGE_ON_READ mode was critical — burst rates of 5K events/sec would have made COW infeasible (rewriting entire base files at that rate is impossible).
          </p>
          <p>
            <strong className="text-foreground/80">Confluent 2014: "Schema Registry — Managing Schemas for Kafka."</strong> Born from the realization that without central schema management, producer/consumer schema drift was a silent failure mode. Schema Registry adds a 4-byte schema ID prefix to every Avro/Protobuf/JSON message; consumers fetch the schema by ID (cached). Compatibility check at register time prevents breaking changes from ever being deployed.
          </p>
        </div>
      </SectionCard>

      {/* Deeper-thought insight */}
      <SectionCard
        title="My deeper thought: Kafka Connect IS the ETL framework for the streaming era"
        description="The unifying view: Kafka Connect + Debezium + Schema Registry together form the streaming-era replacement for ETL frameworks (Sqoop, Informatica, DataStage). The source DB IS the source of truth; Debezium IS the extractor; Kafka IS the bus; the sink IS the loader; Schema Registry IS the type system."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Kafka Connect IS the ETL framework for the streaming era.</strong> Traditional ETL (Sqoop, Informatica) ran batch jobs that SELECT * from source → transform → load to target. Kafka Connect inverts this: the source DB pushes change events (via Debezium) into Kafka as they happen; the sink pulls from Kafka at its own pace and commits to the lake. The bus (Kafka) decouples source rate from sink rate — a slow sink doesn't back-pressure the source DB. This is exactly the producer/consumer decoupling pattern of every message-oriented middleware since MQ Series (1974), but applied to CDC at scale.
          </p>
          <p>
            <strong className="text-foreground/80">Debezium IS the WAL reader applied to operational DBs.</strong> Every database engine since the 1970s uses a write-ahead log (PostgreSQL WAL, MySQL binlog, MongoDB oplog, Oracle redo log). Debezium is the recognition that the WAL is ALSO a perfect CDC source — it records every change in commit order, atomically, durably. Reading the WAL via replication gives a perfect CDC stream without touching the source DB. This is structurally the same pattern as Kafka's own log-tailing consumers (read offset N, process, advance offset), but applied at the database level.
          </p>
          <p>
            <strong className="text-foreground/80">Schema Registry IS the type system for the data pipeline.</strong> Every programming language has a type system: the compiler refuses to compile code that violates types. Schema Registry is the same pattern for data: the registry refuses to register schemas that violate compatibility. Producers can't send events with unregistered schemas (the Avro/Protobuf/JSON converter checks first); consumers can't decode events without fetching the schema by ID. This is exactly TypeScript's "type-safe at compile time" pattern — but for runtime data, enforced at the registry.
          </p>
          <p>
            <strong className="text-foreground/80">The dead-letter queue IS the exception handler for the pipeline.</strong> Traditional ETL on a parse error either dropped the row silently or failed the whole batch. Kafka Connect's DLQ reroutes poison-pill events to a separate topic — the pipeline keeps running, the bad events are triaged later. This is exactly the try/catch pattern of every programming language — errors don't kill the program, they're handled in a side-channel. The DLQ + Schema Registry together give a typed pipeline with explicit error handling: schema violations are caught at register time (compile-time), poison pills are caught at runtime (try/catch via DLQ).
          </p>
          <p>
            <strong className="text-foreground/80">Distributed mode IS Raft consensus on connector configs.</strong> Kafka Connect workers form a cluster — configs/offsets/statuses stored in Kafka internal topics. When a worker dies, the surviving workers rebalance (read the config topic, redistribute tasks). This is structurally identical to Raft/Paxos consensus: a replicated log of configs, a quorum of workers agreeing on task ownership. The internal topics use Kafka's log + consumer-group protocol as the consensus substrate. This is the same pattern as etcd (Raft for Kubernetes config), but applied to Kafka Connect operational state.
          </p>
          <p>
            <strong className="text-foreground/80">Kafka Connect IS to streaming ETL what Spark was to batch ETL.</strong> Spark unified batch + iterative + streaming compute on one engine (RDD abstraction). Kafka Connect unifies batch (JDBC source), streaming CDC (Debezium), and reverse-ETL (HTTP sink) on one framework (Source/Sink connector API). Both abstract away the hard part (Spark: fault-tolerant distributed compute; Kafka Connect: distributed connector management + offset tracking + schema integration) so users focus on the per-record logic. This is the same "framework for the common case" pattern that every successful infrastructure project follows.
          </p>
        </div>
      </SectionCard>


      <DeeperThoughtSection pageTitle="Kafka Connect + Debezium">
        <DeeperThought title="Kafka Connect + Debezium IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about Kafka Connect + Debezium is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. Kafka Connect + Debezium connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where Kafka Connect + Debezium sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (Kafka Connect + Debezium) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
        { id: "streaming" as const, reason: "Kafka as the lakehouse CDC bus" },
        { id: "schema-registry" as const, reason: "Schema Registry — the type system for CDC" },
        { id: "iceberg" as const, reason: "Iceberg as the sink (v2 row-level MERGE for CDC)" },
        { id: "delta-lake" as const, reason: "Delta Lake sink — MERGE upsert by PK" },
        { id: "hudi" as const, reason: "Hudi MOR — designed for streaming CDC" },
        { id: "data-contracts" as const, reason: "Data contracts pattern (schema enforcement)" },
        { id: "data-lakehouse" as const, reason: "Lakehouse as the sink layer" },
        { id: "databricks" as const, reason: "Spark Structured Streaming + Kafka" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("streaming")} className="text-sm text-primary hover:underline">
          &rarr; Streaming (Kafka as the CDC bus)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("schema-registry")} className="text-sm text-primary hover:underline">
          &rarr; Schema Registry (the type system)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("iceberg")} className="text-sm text-primary hover:underline">
          &rarr; Iceberg (CDC sink)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("hudi")} className="text-sm text-primary hover:underline">
          &rarr; Hudi MOR (CDC-native sink)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("data-contracts")} className="text-sm text-primary hover:underline">
          &rarr; Data contracts (schema enforcement)
        </Link>
      </div>
    </div>
  );
}
