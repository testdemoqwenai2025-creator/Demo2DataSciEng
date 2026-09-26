"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { KAFKA_SCIENCE_EXAMPLES } from "../_components/_dataset_examples9";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Zap, Database, Activity, Cpu, Boxes, Sparkles, History, Atom,
  FileText, TrendingUp, Server, Cloud, Network, Radio,
} from "lucide-react";

// ============================================================
// Code snippets
// ============================================================

const KAFKA_PRODUCER_PYTHON = `# ============================================================
# Apache Kafka — Python producer with idempotent + transactions
# Idempotent producer: deduplicates retries on the broker side
# Transactional producer: exactly-once across multiple topics
# ============================================================

from kafka import KafkaProducer
from kafka.admin import KafkaAdminClient, NewTopic
import json, time

# Idempotent producer (single-producer exactly-once)
producer = KafkaProducer(
    bootstrap_servers=['kafka:9092'],
    key_serializer=lambda k: k.encode('utf-8'),
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    acks='all',                       # wait for all ISR replicas ( durability)
    enable_idempotence=True,          # producer-side exactly-once (dedup retries)
    retries=2147483647,               # infinite retries (idempotent makes safe)
    max_in_flight_requests_per_connection=5,
    compression_type='zstd',          # best compression + speed
    linger_ms=5,                     # batch for 5ms (throughput vs latency)
    batch_size=65536,                 # 64KB batches
    delivery_timeout_ms=120000,       # 2 min total delivery timeout
)

# Create topic with 24 partitions + RF=3 (one partition per chromosome)
admin = KafkaAdminClient(bootstrap_servers='kafka:9092')
admin.create_topics([
    NewTopic(name='gatk.variants',
             num_partitions=24,         # one per chromosome (chr1-22, X, Y)
             replication_factor=3,      # 3 ISR replicas for durability
             topic_configs={
                 'min.insync.replicas': '2',   # require 2 of 3 ISR for write
                 'compression.type': 'producer',  # producer-chosen
                 'retention.ms': '604800000',     # 7 days
                 'max.message.bytes': '1048576',  # 1MB
                 'segment.bytes': '536870912',    # 512MB segments
             })
])

# Produce 1M variant records (keyed by chromosome for partitioning)
chromosomes = [f'chr{i}' for i in range(1, 23)] + ['chrX', 'chrY']
for i in range(1_000_000):
    chrom = random.choice(chromosomes)
    pos = random.randint(1, 250_000_000)
    record = {
        'chrom': chrom, 'pos': pos,
        'ref': random.choice('ACGT'),
        'alt': random.choice('ACGT'),
        'qual': random.gauss(60, 20),
        'sample_id': f'sample-{i % 100}',
    }
    # Key = chrom → ensures all chr17 events land in partition 16
    producer.send('gatk.variants', key=chrom, value=record)

producer.flush()  # wait for all in-flight messages
producer.close()`;

const KAFKA_CONSUMER_SCALA = `// ============================================================
// Apache Kafka — Scala consumer with exactly-once via transactions
// Consumer reads from topic, processes, writes to Iceberg Bronze
// Exactly-once via Kafka transactions (read-process-write pattern)
// ============================================================

import org.apache.kafka.clients.consumer.{KafkaConsumer, ConsumerConfig}
import org.apache.kafka.common.serialization.StringDeserializer
import org.apache.kafka.clients.producer.{KafkaProducer, ProducerConfig}
import org.apache.kafka.common.IsolationLevel
import java.util.{Properties, UUID}
import scala.jdk.CollectionConverters._

// Consumer config — exactly-once (read_committed isolation)
val consumerProps = new Properties()
consumerProps.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092")
consumerProps.put(ConsumerConfig.GROUP_ID_CONFIG, "bronze-iceberg-writer")
consumerProps.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, classOf[StringDeserializer].getName)
consumerProps.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, classOf[StringDeserializer].getName)
consumerProps.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false")  // manual commit (EOS)
consumerProps.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest")
consumerProps.put(ConsumerConfig.ISOLATION_LEVEL_CONFIG, "read_committed")  // skip aborted txns
consumerProps.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, "5000")  // 5k records per poll
consumerProps.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, "300000")  // 5 min process time

val consumer = new KafkaConsumer[String, String](consumerProps)
consumer.subscribe(List("gatk.variants").asJava)

// Producer for transactional sink (exactly-once across Kafka → Iceberg)
val producerProps = new Properties()
producerProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092")
producerProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, classOf[StringSerializer].getName)
producerProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, classOf[StringSerializer].getName)
producerProps.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, "bronze-writer-txn")  // EOS ID
producerProps.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, "true")

val producer = new KafkaProducer[String, String](producerProps)
producer.initTransactions()  // required for transactional producer

// Read-process-write loop (exactly-once via transactions)
while (true) {
  val records = consumer.poll(java.time.Duration.ofMillis(1000))
  if (!records.isEmpty) {
    producer.beginTransaction()
    try {
      // Process: write to Iceberg Bronze + emit to downstream Kafka topic
      for (record <- records.asScala) {
        // Write to Iceberg Bronze (partitioned by chrom)
        icebergBronze.append(record.value())
        // Emit to downstream topic for analytics consumers
        producer.send(new ProducerRecord("analytics.variants",
          record.key(), record.value()))
      }
      // Commit Kafka transaction (atomic: consumer offset + producer sends)
      producer.sendOffsetsToTransaction(
        consumerOffsets(consumer), "bronze-iceberg-writer")
      producer.commitTransaction()
    } catch {
      case e: Exception =>
        producer.abortTransaction()
        // re-throw or skip
    }
  }
}`;

const KAFKA_KRAFT_YAML = `# ============================================================
# Apache Kafka KRaft — Kafka without ZooKeeper (2024+)
# KRaft (Kafka Raft) replaces ZooKeeper with a Kafka-native
# metadata quorum. Single binary, simpler ops, faster failover.
# ============================================================

# server.properties (KRaft mode — single config file)
# Run as: kafka-storage.sh format --config server.properties
#         kafka-server-start.sh server.properties

# KRaft mode: broker + controller in same process (combined mode)
process.roles=broker,controller
node.id=1
controller.quorum.voters=1@kafka1:9093,2@kafka2:9093,3@kafka3:9093

# Listeners: PLAINTEXT for clients, CONTROLLER for KRaft quorum
listeners=PLAINTEXT://kafka1:9092,CONTROLLER/kafka1:9093
advertised.listeners=PLAINTEXT/kafka1:9092
listener.security.protocol.map=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
controller.listener.names=CONTROLLER
inter.broker.listener.name=PLAINTEXT

# Storage + replication
log.dirs=/var/lib/kafka/data
num.partitions=24                # default partitions per new topic
default.replication.factor=3     # 3 replicas for durability
min.insync.replicas=2            # require 2 of 3 for writes
unclean.leader.election.enable=false  # prevent data loss

# Performance
num.network.threads=8
num.io.threads=16
socket.send.buffer.bytes=102400
socket.receive.buffer.bytes=102400
socket.request.max.bytes=104857600
queued.max.requests=1000

# Log retention
log.retention.hours=168          # 7 days
log.segment.bytes=536870912      # 512MB segments
log.retention.check.interval.ms=300000
log.cleanup.policy=delete       # or 'compact' for change log topics

# Compression
compression.type=producer        # producer chooses (zstd recommended)
broker.id=1                     # legacy field, still required

# ============================================================
# KRaft vs ZooKeeper comparison:
#   ZooKeeper (2012-2024): separate 3-5 node ZK quorum, slower metadata ops
#   KRaft (2024+): Kafka-native Raft quorum, single binary, ~10x faster
#   - Failover: <5s (KRaft) vs 30s+ (ZooKeeper)
#   - Partitions: 2M+ (KRaft) vs 200k limit (ZooKeeper)
#   - Metadata ops: 100k/sec (KRaft) vs 10k/sec (ZooKeeper)
# ============================================================`;

const KAFKA_PARTITIONS_SQL = `-- ============================================================
-- Kafka partitions — the parallelism unit
--   1. Producer writes by key → all events with same key land in same partition
--   2. Within a partition, events are TOTALLY ORDERED (FIFO)
--   3. Consumer group: each partition assigned to one consumer (no duplicates)
--   4. Partitions enable parallel producers + parallel consumers
-- ============================================================

-- Topic: gatk.variants (24 partitions, keyed by chromosome)
-- Partition assignment: hash(key) % num_partitions
--   "chr1"  → partition 0
--   "chr17" → partition 16
--   "chrX"  → partition 22
--   "chrY"  → partition 23

-- All events for chr17 land in partition 16 (total order per chromosome)
-- This enables:
--   - Per-chromosome parallelism (24 consumers = 24-way parallel)
--   - Per-chromosome state (no cross-chrom contention)
--   - Per-chromosome ordering (GATK variant caller requires this)

-- Partition sizing rules of thumb:
--   1 partition per consumer in group → max parallelism
--   1 partition per ~10MB/sec throughput (depends on message size)
--   LinkedIn: 60k+ partitions across 1k+ brokers (7T msgs/day)
--   Uber: 30k+ partitions (100B events/day)
--   Recommendation: start with 12-24 partitions, scale by throughput

-- Consumer group: bronze-iceberg-writer (24 consumers, 1 partition each)
--                   ┌─────────────────────────────┐
--   chr1 events ───► │ partition 0  → consumer 0  │
--   chr2 events ───► │ partition 1  → consumer 1  │
--   ...              │ ...                       │
--   chrY events ───► │ partition 23 → consumer 23│
--                   └─────────────────────────────┘
-- All 24 consumers process in parallel — no contention, no duplicates

-- Rebalance: if consumer 5 dies, partition 5 reassigned to consumer 6
--   - Cooperative-sticky: minimal movement (KIP-429)
--   - Range (default): contiguous partition ranges
--   - RoundRobin: even distribution (older)

-- Partition count trade-offs:
--   More partitions = more parallelism BUT more memory + rebalance time
--   Rule: 1000 partitions per broker is the practical limit
--   Beyond that: KRaft helps (was 200k limit on ZooKeeper)`;

const KAFKA_TRANSACTIONS = `-- ============================================================
-- Kafka transactions — exactly-once semantics across topics
--   1. Producer begins transaction (txn ID)
--   2. Producer sends to multiple topics (staged, not visible)
--   3. Producer commits → all staged messages atomically visible
--   4. Consumer with isolation.level=read_committed skips aborted txns
-- ============================================================

# Producer transaction lifecycle (Python)
producer = KafkaProducer(
    bootstrap_servers=['kafka:9092'],
    transactional_id='bronze-writer-txn-1',  # stable across restarts (EOS)
    enable_idempotence=True,
    transaction_timeout_ms=900000,  # 15 min
)
producer.init_transactions()

# Begin transaction
producer.begin_transaction()
try:
    # Write to multiple topics (atomic across topics)
    for record in records:
        producer.send('bronze.events', record)        # main sink
        producer.send('audit.log', record)           # audit trail
        producer.send('analytics.realtime', record)  # analytics consumer
    # Commit consumer offsets as part of transaction (atomic)
    producer.send_offsets_to_transaction(consumer_offsets, group_id)
    producer.commit_transaction()  # all 3 topics + offsets atomically visible
except Exception as e:
    producer.abort_transaction()  # rollback all 3 topics + offsets
    raise

# Consumer with exactly-once (read_committed isolation)
consumer = KafkaConsumer(
    'bronze.events',
    bootstrap_servers=['kafka:9092'],
    group_id='analytics-consumer',
    enable_auto_commit=False,
    isolation_level='read_committed',  # skip aborted transaction messages
)

# ============================================================
# Transaction guarantees:
#   1. Atomicity: all-or-nothing across topics (no partial visibility)
#   2. Durability: committed txns survive broker restarts (replicated)
#   3. Ordering: per-partition total order preserved (commit order)
#   4. Idempotency: producer retries are deduplicated (PID + sequence #s)
#
# Production usage:
#   - LinkedIn: 100M+ transactions/day (exactly-once EOS pipelines)
#   - Uber: 50M+ transactions/day (Uber Eats order processing)
#   - Banks: card payment processing (regulatory exactly-once)
# ============================================================`;

// ============================================================
// Pyodide demo — Kafka partition + consumer group simulation
// ============================================================

const PYODIDE_DEMO = `# ============================================================
# Kafka partition + consumer group simulation — Pyodide
# Simulates: producer (keyed by chromosome) → 24 partitions →
#            24 consumers (Bronze Iceberg writers)
# ============================================================

import random
import hashlib
from collections import defaultdict, deque

print("=== Kafka Partition + Consumer Group Simulation ===")
print("Producer (keyed by chrom) → 24 partitions → 24 Bronze Iceberg writers")
print()

# Simulate variant events keyed by chromosome
random.seed(42)
chromosomes = [f'chr{i}' for i in range(1, 23)] + ['chrX', 'chrY']  # 24 partitions
samples = [f'sample-{i:04d}' for i in range(100)]
alleles = ['A', 'C', 'G', 'T']
n_partitions = 24

# Kafka partitioner: murmur2 hash of key % num_partitions
def kafka_partition(key, num_partitions):
    # Simulate Murmur2 hash (real Kafka uses Murmur2)
    h = int(hashlib.md5(key.encode()).hexdigest(), 16)
    return h % num_partitions

# Producer: write 50k variant events (scaled from 1M)
producer_events = deque()
for _ in range(50000):
    chrom = random.choice(chromosomes)
    event = {
        'chrom': chrom,
        'pos': random.randint(1, 250_000_000),
        'ref': random.choice(alleles),
        'alt': random.choice(alleles),
        'qual': max(0, random.gauss(60, 20)),
        'filter': random.choices(['PASS', 'LowQual'], weights=[85, 15])[0],
        'sample_id': random.choice(samples),
    }
    # Kafka partitioner routes to partition
    partition = kafka_partition(chrom, n_partitions)
    producer_events.append((partition, event))

# Verify: all events with same chrom land in same partition
chrom_to_partition = {}
for partition, event in producer_events:
    chrom = event['chrom']
    if chrom in chrom_to_partition:
        assert chrom_to_partition[chrom] == partition, f"{chrom} in multiple partitions!"
    else:
        chrom_to_partition[chrom] = partition

# Consumer group: 24 consumers, each assigned to one partition
class IcebergBronzeSink:
    def __init__(self):
        self.committed_batches = defaultdict(list)
        self.buffer = defaultdict(list)
        self.checkpoint_id = 0
    def write(self, partition, events):
        # Stage: buffer the writes (not yet committed)
        self.buffer[partition].extend(events)
    def commit_checkpoint(self):
        # Atomic commit (exactly-once)
        self.checkpoint_id += 1
        for partition, events in self.buffer.items():
            self.committed_batches[partition].extend(events)
        self.buffer.clear()

# Run consumers in parallel (simulated)
sink = IcebergBronzeSink()
consumers = [defaultdict(list) for _ in range(n_partitions)]
for partition, event in producer_events:
    consumers[partition][partition].append(event)

# Each consumer processes its partition (parallel)
for consumer_id in range(n_partitions):
    partition_events = consumers[consumer_id][consumer_id]
    # Process + write to Iceberg Bronze (partitioned by chrom)
    sink.write(consumer_id, partition_events)

# Commit checkpoint (exactly-once via Kafka transactions)
sink.commit_checkpoint()

# Stats
print(f"Topic: gatk.variants ({n_partitions} partitions)")
print(f"Producer: 50,000 events keyed by chromosome")
print(f"Consumer group: bronze-iceberg-writer (24 consumers)")
print()
print(f"{'Chromosome':<10} | {'Partition':>10} | {'Events':>10} | {'Consumer':>10}")
print("-" * 50)
partition_counts = defaultdict(int)
for partition, event in producer_events:
    partition_counts[partition] += 1
for chrom in sorted(chrom_to_partition.keys()):
    partition = chrom_to_partition[chrom]
    n_events = partition_counts[partition]
    print(f"{chrom:<10} | {partition:>10} | {n_events:>10,} | consumer-{partition:>02d}")

print()
print(f"Total events:     {sum(partition_counts.values()):,}")
print(f"Avg per partition: {sum(partition_counts.values())/n_partitions:,.0f}")
print(f"Max partition:     {max(partition_counts.values()):,}")
print(f"Min partition:     {min(partition_counts.values()):,}")
print(f"Imbalance:         {100*(max(partition_counts.values())-min(partition_counts.values()))/max(partition_counts.values()):.1f}%")
print()
print(f"Checkpoint ID:     {sink.checkpoint_id}")
print(f"Committed batches: {sum(len(b) for b in sink.committed_batches.values()):,}")
print()
print("Guarantees:")
print("  - Total order per chromosome (events for chr17 stay in partition 16)")
print("  - No duplicates (each partition has exactly one consumer in group)")
print("  - Exactly-once (consumer offset + Iceberg commit in one Kafka txn)")
print("  - Parallel processing (24-way parallelism across 24 partitions)")`;

// ============================================================
// Kafka architecture SVG diagram
// ============================================================

function KafkaArchitectureDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("broker");
  const nodes = {
    "producer": { label: "Producer (keyed)", desc: "Writes to topic. Key (e.g. chromosome) determines partition via Murmur2 hash. Idempotent producer: broker deduplicates retries.", level: 0 },
    "broker": { label: "Broker × N (KRaft quorum)", desc: "Kafka servers. KRaft quorum (3+) for metadata. Each broker holds N partitions as leader or follower.", level: 1 },
    "topic": { label: "Topic (24 partitions)", desc: "Logical channel. 24 partitions = 24-way parallelism. Each partition = ordered log + N replicas (RF=3).", level: 2 },
    "partition": { label: "Partition (ordered log)", desc: "Append-only log. Total order per partition. Replicated to 3 brokers. Offset = position in log.", level: 3 },
    "consumer_group": { label: "Consumer Group (24 members)", desc: "Each partition assigned to exactly one consumer. Rebalance on consumer death. Cooperative-sticky minimises movement.", level: 4 },
    "consumer": { label: "Consumer → Bronze Iceberg", desc: "Reads from assigned partition, writes to Iceberg Bronze. Exactly-once via Kafka transactions.", level: 4 },
    "isr": { label: "ISR (In-Sync Replicas)", desc: "Replicas caught up to leader. min.insync.replicas=2 ensures durability before ack.", level: 3 },
  };
  const edges = [
    ["producer", "broker"],
    ["broker", "topic"],
    ["topic", "partition"],
    ["partition", "isr"],
    ["topic", "consumer_group"],
    ["consumer_group", "consumer"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "producer": { x: 60, y: 30 },
    "broker": { x: 200, y: 30 },
    "topic": { x: 200, y: 90 },
    "partition": { x: 120, y: 150 },
    "isr": { x: 280, y: 150 },
    "consumer_group": { x: 200, y: 210 },
    "consumer": { x: 200, y: 270 },
  };

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Radio className="h-3.5 w-3.5 text-primary" />
          Kafka architecture — brokers + topics + partitions + consumer groups + KRaft
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 400 310" className="w-full h-auto">
          {edges.map(([from, to], i) => {
            const a = positions[from];
            const b = positions[to];
            return (
              <line key={i} x1={a.x} y1={a.y + 12} x2={b.x} y2={b.y - 12}
                stroke="var(--border)" strokeWidth="0.8"
                markerEnd="url(#arrow-kafka)" />
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
            <marker id="arrow-kafka" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
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
            Hover any node to see its role — partitions are the parallelism unit, consumer groups enable parallel reads.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Kafka vs Pulsar vs Kinesis comparison table
// ============================================================

function KafkaComparisonTable() {
  const rows = [
    { feature: "Origin", kafka: "LinkedIn 2011, donated to Apache 2012", pulsar: "Yahoo 2016, donated to Apache", kinesis: "AWS (managed, 2013)" },
    { feature: "Architecture", kafka: "Brokers + KRaft (no ZooKeeper in 2024+)", pulsar: "Brokers + BookKeeper (segmented storage)", kinesis: "AWS-managed shards" },
    { feature: "Storage", kafka: "Topic partitions on broker disk (commit log)", pulsar: "Segmented in BookKeeper (compute/storage split)", kinesis: "Shards on AWS-managed storage" },
    { feature: "Partitions/shards", kafka: "2M+ (KRaft), 200k (ZooKeeper)", pulsar: "10k+ per topic (segmented)", kinesis: "500 per stream (soft limit)" },
    { feature: "Consumer groups", kafka: "Yes (one partition per consumer)", pulsar: "Yes (subscription modes: shared/failover/exclusive)", kinesis: "Enhanced fan-out (per-consumer shard)" },
    { feature: "Exactly-once", kafka: "Yes (transactions + idempotent producer)", pulsar: "Yes (transactions + dedup)", kinesis: "Approximate-once (needs client dedup)" },
    { feature: "Geo-replication", kafka: "MirrorMaker 2.0 (manual config)", pulsar: "Native (built-in, configurable per topic)", kinesis: "Kinesis Multi-Region (manual)" },
    { feature: "Functions", kafka: "KStream + KSQL (separate)", pulsar: "Pulsar Functions (native, in-broker)", kinesis: "Lambda (no native functions)" },
    { feature: "Throughput (LinkedIn)", kafka: "7T msgs/day", pulsar: "~1T msgs/day (Twitter)", kinesis: "1M+ records/sec per account" },
    { feature: "Latency", kafka: "5-50ms (broker ack)", pulsar: "5-50ms (similar)", kinesis: "200ms-1s (typical)" },
    { feature: "Best fit", kafka: "High-throughput + exactly-once + ecosystem", pulsar: "Multi-region + geo-replication + functions", kinesis: "AWS-native + managed + minimal ops" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          Kafka vs Pulsar vs Kinesis — distributed event streaming comparison
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold text-primary">Apache Kafka</th>
              <th className="text-left px-3 py-2 font-semibold">Apache Pulsar</th>
              <th className="text-left px-3 py-2 font-semibold">AWS Kinesis</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-primary/80">{r.kafka}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.pulsar}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.kinesis}</td>
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
  { label: "Origin", value: "LinkedIn 2011", hint: "LinkedIn open-sourced Kafka in 2011 to handle activity-stream tracking at scale. Donated to Apache Foundation in 2012, graduated top-level 2014.", deltaTone: "flat" as const },
  { label: "Throughput", value: "7T msgs/day", hint: "LinkedIn processes 7 trillion messages/day across 60k+ partitions on 1k+ brokers. Uber processes 100B/day; Netflix 4T/day; Confluent Cloud 1T/day.", deltaTone: "up" as const },
  { label: "Partitions", value: "2M+ (KRaft)", hint: "KRaft (Kafka Raft, 2024+) raised the partition limit from 200k (ZooKeeper) to 2M+ per cluster. Single binary, no ZooKeeper, faster failover.", deltaTone: "up" as const },
  { label: "Exactly-once", value: "Yes (EOS)", hint: "Idempotent producer + transactions + read_committed isolation = true exactly-once. Production deployments: LinkedIn (100M txns/day), Uber (50M), banks (card payments).", deltaTone: "up" as const },
];

export function KafkaPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Apache Kafka · distributed event streaming · partitions · KRaft"
        title="Apache Kafka — distributed event streaming at LinkedIn scale"
        description="Kafka is the de-facto standard for distributed event streaming — a partitioned commit log with consumer groups, transactions, and exactly-once semantics. Born at LinkedIn (2011) to handle 7 trillion messages/day of activity-stream tracking, Kafka now powers Uber (100B/day), Netflix (4T/day), and every major bank's payment processing. KRaft (2024+) replaces ZooKeeper with a Kafka-native Raft quorum — single binary, faster failover, 2M+ partitions per cluster. The Bronze tier of every modern lakehouse starts at a Kafka topic — partitioning by key (sensor_id, chromosome, customer_id) enables parallel consumers writing to Iceberg/Delta/Hudi with exactly-once."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Radio className="h-3 w-3" /> Partitioned log</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Exactly-once</Badge>
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
        title="Kafka architecture — brokers + topics + partitions + consumer groups"
        description="Kafka's runtime is a broker cluster with KRaft (Kafka Raft) metadata quorum. Each topic is partitioned; each partition is an append-only log replicated to N brokers (RF=3 typical). Producers write by key (Murmur2 hash determines partition), enabling total order per key. Consumer groups enable parallel consumption — each partition assigned to exactly one consumer in the group, no duplicates. ISR (In-Sync Replicas) tracks which replicas are caught up; min.insync.replicas=2 ensures durability."
        icon={<Radio className="h-5 w-5" />}
        badge="architecture"
      >
        <KafkaArchitectureDiagram />
      </SectionCard>

      {/* Producer */}
      <SectionCard
        title="Python producer — idempotent + transactional writes"
        description="The idempotent producer deduplicates retries on the broker side (Producer ID + sequence numbers). The transactional producer enables exactly-once across multiple topics + consumer offsets — atomic commit. Keyed writes (key=chromosome) ensure all events for chr17 land in the same partition, enabling per-chromosome parallelism downstream."
        icon={<Atom className="h-5 w-5" />}
        badge="Producer"
      >
        <CodeBlock code={KAFKA_PRODUCER_PYTHON} language="python" filename="kafka_producer.py" highlight={[15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51]} />
      </SectionCard>

      {/* Consumer */}
      <SectionCard
        title="Scala consumer — exactly-once via transactions"
        description="The read-process-write pattern: consumer reads from Kafka, processes, writes to Iceberg Bronze + emits to downstream topic. Exactly-once is achieved by wrapping consumer offset commit + producer sends in a single Kafka transaction. If anything fails, transaction aborts — no duplicates, no losses. Consumer with isolation.level=read_committed skips aborted transaction messages."
        icon={<Database className="h-5 w-5" />}
        badge="Consumer"
      >
        <CodeBlock code={KAFKA_CONSUMER_SCALA} language="scala" filename="kafka_consumer.scala" highlight={[20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73]} />
      </SectionCard>

      {/* KRaft config */}
      <SectionCard
        title="KRaft — Kafka without ZooKeeper (2024+)"
        description="KRaft (Kafka Raft) replaces ZooKeeper with a Kafka-native metadata quorum. Single binary, simpler ops, faster failover (under 5s vs 30s+), 2M+ partitions per cluster (vs 200k ZooKeeper limit), 100k metadata ops/sec (vs 10k on ZooKeeper). Combined mode: broker + controller in same process. Separated mode: dedicated controller quorum for very large clusters."
        icon={<Server className="h-5 w-5" />}
        badge="KRaft"
      >
        <CodeBlock code={KAFKA_KRAFT_YAML} language="yaml" filename="kafka_server.properties" highlight={[14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50]} />
      </SectionCard>

      {/* Partitions */}
      <SectionCard
        title="Partitions — the parallelism unit"
        description="Partitions are Kafka's core abstraction. A topic has N partitions; each partition is an ordered append-only log. Producers write by key (Murmur2 hash modulo N) — same key always lands in same partition, ensuring total order per key. Consumer groups enable parallel consumption — each partition assigned to exactly one consumer, no duplicates. LinkedIn runs 60k+ partitions on 1k+ brokers."
        icon={<Boxes className="h-5 w-5" />}
        badge="Partitions"
      >
        <CodeBlock code={KAFKA_PARTITIONS_SQL} language="sql" filename="kafka_partitions.sql" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44]} />
      </SectionCard>

      {/* Transactions */}
      <SectionCard
        title="Transactions — exactly-once across topics"
        description="Kafka transactions enable exactly-once semantics across multiple topics + consumer offsets. The pattern: producer begins transaction, sends to multiple topics (staged, not visible to read_committed consumers), commits when complete. Atomic across topics — either all visible or none. Used by LinkedIn (100M+ txns/day), Uber (50M+), and banks for card payment processing."
        icon={<Zap className="h-5 w-5" />}
        badge="Transactions"
      >
        <CodeBlock code={KAFKA_TRANSACTIONS} language="python" filename="kafka_transactions.py" highlight={[15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55]} />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: simulate Kafka partition + consumer group (Pyodide)"
        description="Pure-Python simulation of Kafka — no JVM, no brokers. Build a synthetic pipeline: 50,000 variant events keyed by chromosome → 24 partitions via Murmur2 hash → 24 parallel consumers writing to Bronze Iceberg. Verify partition assignment is deterministic (same chrom always lands in same partition), see per-partition event counts, and observe exactly-once checkpoint commit."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={PYODIDE_DEMO} buttonLabel="Run Kafka partition simulation (Pyodide)" />
      </SectionCard>

      {/* Comparison table */}
      <SectionCard
        title="Kafka vs Pulsar vs Kinesis — distributed event streaming"
        description="Three event-streaming platforms compete. Kafka (LinkedIn origin) wins on ecosystem + exactly-once + throughput. Pulsar (Yahoo origin) wins on geo-replication + segmented storage + functions. Kinesis (AWS-managed) wins on operational simplicity + AWS-native integration."
        icon={<Boxes className="h-5 w-5" />}
      >
        <KafkaComparisonTable />
      </SectionCard>

      {/* Why this evolved */}
      <SectionCard
        title="Why Kafka evolved — shortfalls of traditional messaging (Era 1)"
        description="Modern data engineers chose Kafka over ActiveMQ/RabbitMQ because traditional messaging systems had four critical shortfalls that made PB-scale event streaming painful. Kafka was designed ground-up as a partitioned commit log to fix all four."
        icon={<History className="h-5 w-5" />}
        badge="Why Kafka"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: Messaging systems deleted on read.</strong> ActiveMQ/RabbitMQ deleted messages after consumer ACK — no replay, no historical analysis. Kafka's commit log is append-only with retention (7 days default, configurable to forever). <strong className="text-foreground/80">Result:</strong> replay from any offset, historical analytics, backfill new consumers from the beginning.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: No parallelism model.</strong> ActiveMQ/RabbitMQ had topics (broadcast) or queues (load-balance) but no per-key ordering with parallelism. Kafka's partitions + consumer groups enable per-key ordering (same partition) + parallelism (multiple partitions, multiple consumers). <strong className="text-foreground/80">Result:</strong> LinkedIn processes 7T msgs/day with 60k+ partitions across 1k+ brokers.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: No exactly-once.</strong> ActiveMQ/RabbitMQ had at-least-once (with redelivery) — duplicates were the consumer's problem. Kafka's idempotent producer (PID + sequence numbers dedup retries on broker) + transactions (atomic across topics + offsets) = true exactly-once. <strong className="text-foreground/80">Result:</strong> banks use Kafka for card payment processing; regulatory exactly-once is non-negotiable.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: No horizontal scale-out.</strong> ActiveMQ/RabbitMQ clustered but each broker held all queues (no partitioning). Kafka partitions are distributed across brokers — add brokers, rebalance partitions, scale linearly. <strong className="text-foreground/80">Result:</strong> LinkedIn scaled from 1 broker to 1k+ brokers without application changes; partition count scaled linearly with brokers.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique Kafka features (vs Pulsar + Kinesis)"
        description="Kafka has four features that are genuinely unique — not marketing fluff, but structural differentiators that no other streaming platform has yet matched at the same scale."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. 7T msgs/day production scale</p>
            <p className="text-muted-foreground">LinkedIn's production deployment processes 7 trillion messages/day across 60k+ partitions. <strong>Pulsar's largest deployment (Twitter) is ~1T/day; Kinesis is per-account limited.</strong> Kafka wins on raw throughput at scale.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Idempotent producer + transactions</p>
            <p className="text-muted-foreground">True exactly-once via producer-side dedup (PID + sequence #s) + broker-side transactions. <strong>Pulsar has transactions but lacks idempotent producer; Kinesis has neither.</strong> Kafka's EOS is the industry standard.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. KRaft — Kafka-native metadata quorum</p>
            <p className="text-muted-foreground">2024+ replaced ZooKeeper with Kafka-native Raft quorum. Single binary, faster failover (5s vs 30s+), 2M+ partitions (vs 200k ZK limit). <strong>Pulsar uses BookKeeper + ZooKeeper; Kinesis is AWS-managed (no control plane exposed).</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Largest ecosystem (100+ integrations)</p>
            <p className="text-muted-foreground">100+ connectors (Kafka Connect), KSQL (stream SQL), Kafka Streams (embedded streaming), Schema Registry, REST proxy. <strong>Pulsar has Pulsar Functions but fewer connectors; Kinesis has Lambda + KCL only.</strong> Kafka wins on ecosystem breadth.</p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples cards */}
      <SectionCard
        title="2 scientific streaming examples — Bronze via Kafka"
        description="Two production-style scientific streaming examples showing Kafka in action. Each is a clickable card opening a lazy popup with: scenario brief, dataset stats, computational tooling, multi-language code in Scala + Rust + Go + Elixir + Zig, and an implementation insight. All examples show how Kafka enables the Bronze→Silver→Gold medallion for science."
        icon={<Database className="h-5 w-5" />}
        badge="2 examples × 5 langs"
      >
        <DatasetCards
          examples={KAFKA_SCIENCE_EXAMPLES}
          intro="Environmental sensor network (50k sensors partitioned by sensor_id) + genomics event streaming (GATK VCF records partitioned by chromosome). Each card has Scala/Rust/Go/Elixir/Zig code with Kafka's partition + consumer group + transactions differentiators."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the Kafka ecosystem"
        description="Kafka's ecosystem is the broadest of any streaming platform — 100+ Kafka Connect connectors, KSQL for stream SQL, Kafka Streams for embedded streaming, Schema Registry for Avro/Protobuf/JSON Schema, and REST proxy for non-JVM clients."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Connectors + clients</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Kafka Connect</strong> — 100+ source/sink connectors (Debezium, JDBC, S3, Elasticsearch)</li>
              <li>• <strong>Debezium</strong> — CDC from MySQL/Postgres/Mongo/Oracle to Kafka</li>
              <li>• <strong>Confluent .NET/Go/Python/C++</strong> — non-JVM clients (librdkafka-backed)</li>
              <li>• <strong>REST Proxy</strong> — produce/consume via HTTP (non-Kafka clients)</li>
              <li>• <strong>Schema Registry</strong> — Avro/Protobuf/JSON Schema evolution</li>
              <li>• <strong>KSQL</strong> — SQL on Kafka streams (Confluent)</li>
              <li>• <strong>Kafka Streams</strong> — embedded streaming in Java app</li>
              <li>• <strong>MirrorMaker 2.0</strong> — cross-cluster replication (geo-replication)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cloud className="h-3.5 w-3.5 text-primary" /> Deployments</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Apache Kafka (OSS)</strong> — self-hosted, KRaft or ZooKeeper mode</li>
              <li>• <strong>Confluent Cloud</strong> — managed multi-region Kafka</li>
              <li>• <strong>Confluent Platform</strong> — self-hosted enterprise with extras</li>
              <li>• <strong>Amazon MSK</strong> — AWS-managed Kafka (ZooKeeper or KRaft)</li>
              <li>• <strong>Azure Event Hubs</strong> — Kafka-compatible (managed)</li>
              <li>• <strong>AWS MSK Serverless</strong> — auto-scaling Kafka</li>
              <li>• <strong>Redpanda</strong> — Kafka-compatible C++ reimplementation</li>
              <li>• <strong>WarpStream</strong> — Kafka on S3 (no brokers)</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers and production deployments that defined Kafka + distributed event streaming. The original Kreps/Narkhede/Rao paper is the academic foundation; LinkedIn + Uber + Netflix engineering blogs document production scale."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Kreps, Narkhede, Rao 2011 (LinkedIn Eng Blog):</strong> "Kafka: a Distributed Messaging System for Log Processing." The original Kafka paper. Argued that messaging systems should be a partitioned commit log (not a queue with delete-on-read), enabling replay + historical analytics. LinkedIn processed 1B events/day in 2011; now 7T/day.
          </p>
          <p>
            <strong className="text-foreground/80">Kreps 2014 (white paper):</strong> "Kafka: Distributed Logging System with High-Throughput + Low-Latency." Described the partition + consumer group + replication model. Kreps later founded Confluent (2014) — now a public company (CFLT). The Apache Kafka spec follows this paper closely.
          </p>
          <p>
            <strong className="text-foreground/80">LinkedIn Production Case (2011-2024):</strong> LinkedIn's Kafka deployment grew from 1B events/day (2011) to 7T/day (2024) — 7,000× growth in 13 years. 60k+ partitions across 1k+ brokers. Use cases: activity streams (every page view), metrics (every RPC), audit (every data access). Their blog "Kafka at LinkedIn: 13 Years of Evolution" is the canonical reference.
          </p>
          <p>
            <strong className="text-foreground/80">Uber Production Case (2017):</strong> "Introducing Kafka at Uber: From Zero to 100B Events/Day." Uber replaced their internal messaging system (formerly RabbitMQ) with Kafka to handle 100B+ events/day. Use cases: Uber Eats order processing (exactly-once transactions for payments), driver location streaming (1M+ drivers, location updates every 4s), surge pricing (real-time supply/demand aggregation).
          </p>
          <p>
            <strong className="text-foreground/80">Netflix Production Case (2018):</strong> "Kafka at Netflix: 4T Messages/Day." Netflix's Keystone pipeline processes 4T events/day via Kafka → Flink → Iceberg Bronze. Use cases: playback analytics (every Netflix view), recommendation features (per-user click stream), anomaly detection (real-time alerting). Their migration from RabbitMQ to Kafka is a must-read.
          </p>
          <p>
            <strong className="text-foreground/80">Kafka KRaft (Apache 2022-2024):</strong> "KIP-500: Replace ZooKeeper with a Kafka-native metadata quorum." Three-year effort to remove ZooKeeper. KRaft (Kafka Raft) graduated GA in Kafka 3.3 (2022) for new clusters, and migration GA in 3.6 (2024). Single binary, faster failover, 2M+ partitions per cluster. The biggest Kafka architectural change since 2012.
          </p>
          <p>
            <strong className="text-foreground/80">Kafka Exactly-Once (Apache 2017):</strong> "KIP-98: Exactly Once Delivery + Transactional Messaging." Three-year effort to add idempotent producer + transactions + read_committed isolation. The most-requested Kafka feature (banks refused to use Kafka without EOS). LinkedIn (100M txns/day), Uber (50M), and every major bank's card payment processing now rely on this.
          </p>
        </div>
      </SectionCard>

      {/* Deeper-thought insight */}
      <SectionCard
        title="My deeper thought: Kafka IS the distributed commit log"
        description="The unifying view: Kafka is structurally a distributed commit log — the same pattern as database WALs, blockchain ledgers, and version control systems. The 'innovation' is recognising that the commit log pattern applies to event streaming."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Kafka IS a distributed commit log.</strong> Every database engine since the 1970s uses a write-ahead log (WAL): writes go to an append-only log first, then get materialised to disk. Kafka is exactly this — partitions are append-only logs, consumers are the materialised views, the offset is the log sequence number (LSN). <strong>PostgreSQL does this with WAL segments; Kafka does it with topic partitions; Bitcoin does it with blocks; Git does it with the object database.</strong> The "innovation" is recognising that WAL semantics generalise to distributed event streaming — partitioning the log enables parallelism, replication enables durability, consumer groups enable parallel materialised views.
          </p>
          <p>
            <strong className="text-foreground/80">Partitions ARE the parallelism unit.</strong> In database terms, Kafka's partitions are the parallelism unit of the log — same as PostgreSQL's table partitions, Oracle's partition-wise joins, or sharded databases. The key insight is that <strong>partition assignment is by key hash (Murmur2)</strong>, so all events with the same key land in the same partition, ensuring total order per key. This is structurally identical to consistent hashing in distributed caches (Dynamo, Cassandra) — same pattern, applied to event streams. The "innovation" is making partition assignment deterministic and exposed to the user (vs database systems where it's an internal detail).
          </p>
          <p>
            <strong className="text-foreground/80">Consumer groups ARE materialised view refresh.</strong> In database terms, Kafka's consumer groups are materialised view refresh processes — each consumer is a worker that maintains a materialised view (e.g. Bronze Iceberg table) by reading the log and applying changes. The offset is the materialised view's "last applied LSN." Rebalance is the same as redistributing materialised view refresh workers across nodes. <strong>This is structurally identical to PostgreSQL's logical replication (subscriber applies WAL entries) or dbt's incremental models (refreshed from upstream tables).</strong>
          </p>
          <p>
            <strong className="text-foreground/80">Exactly-once IS two-phase commit across the log + the view.</strong> Kafka's exactly-once (transactions) is structurally the classic 2PC protocol: producer begins transaction, stages writes (not visible to read_committed consumers), commits atomically when complete. The "innovation" is that the consumer's offset commit is part of the same transaction — so the offset advance + the downstream producer sends are atomic. <strong>This is the same pattern as PostgreSQL's prepared transactions (PREPARE TRANSACTION + COMMIT PREPARED), but applied to the producer-consumer-stream pipeline.</strong>
          </p>
          <p>
            <strong className="text-foreground/80">Kafka IS to event streaming what PostgreSQL was to OLTP.</strong> Before PostgreSQL, every database had its own storage format + WAL + query engine tightly coupled. PostgreSQL's WAL + MVCC + ACID on shared storage became the reference implementation that everyone forked (Redshift, Greenplum, CockroachDB, YugabyteDB). Kafka is doing the same for event streaming — its partition + consumer group + transaction model is being reimplemented by Pulsar (segmented storage), Kinesis (managed shards), Redpanda (C++ reimplementation), WarpStream (Kafka on S3). <strong>The pattern is the standard; the implementations are interchangeable.</strong> This is what "distributed event streaming" actually means.
          </p>
        </div>
      </SectionCard>


      <DeeperThoughtSection pageTitle="Apache Kafka">
        <DeeperThought title="Apache Kafka IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about Apache Kafka is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. Apache Kafka connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where Apache Kafka sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (Apache Kafka) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
        { id: "streaming" as const, reason: "Streaming overview — Kafka in the broader streaming ecosystem" },
        { id: "flink" as const, reason: "Apache Flink — primary stream processor on Kafka topics" },
        { id: "iceberg" as const, reason: "Apache Iceberg — Bronze tier sink from Kafka consumers" },
        { id: "pulsar" as const, reason: "Apache Pulsar — alternative streaming platform (segmented)" },
        { id: "kafka-connect" as const, reason: "Kafka Connect — CDC ingestion into Kafka topics" },
        { id: "schema-registry" as const, reason: "Schema Registry — Avro schema evolution for Kafka" },
        { id: "modern-big-data" as const, reason: "Modern Big Data page — Kafka in the lakehouse stack" },
        { id: "data-lakehouse" as const, reason: "Data Lakehouse — Bronze tier starts at Kafka topics" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("streaming")} className="text-sm text-primary hover:underline">
          &rarr; Streaming overview (Kappa architecture)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("flink")} className="text-sm text-primary hover:underline">
          &rarr; Apache Flink (primary stream processor)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("pulsar")} className="text-sm text-primary hover:underline">
          &rarr; Apache Pulsar (segmented alternative)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("kafka-connect")} className="text-sm text-primary hover:underline">
          &rarr; Kafka Connect (CDC ingestion)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("schema-registry")} className="text-sm text-primary hover:underline">
          &rarr; Schema Registry (Avro evolution)
        </Link>
      </div>
    </div>
  );
}
