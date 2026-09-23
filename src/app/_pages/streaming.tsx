"use client";

import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { MultiLangSamples } from "../_components/multi-lang-samples";
import { PyodideRunner } from "../_components/pyodide-runner";
import { LazyList } from "../_components/lazy-list";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Radio, Cpu, Layers, Zap, Server, Cloud, Languages,
  Sparkles, TrendingUp, Boxes, GitBranch, ArrowRight,
  Terminal, Activity, Database, ShieldCheck, Gauge,
} from "lucide-react";

const KPIS = [
  { label: "Streaming engines", value: "4", hint: "Spark · Flink · Kafka · Pulsar", deltaTone: "flat" as const },
  { label: "Architecture pattern", value: "Kappa", hint: "Unified streaming (batch = bounded stream)", deltaTone: "flat" as const },
  { label: "Latency target", value: "< 1s", hint: "End-to-end event processing", deltaTone: "flat" as const },
  { label: "Throughput (synthetic)", value: "100k/s", hint: "Per partition, p95", deltaTone: "flat" as const },
];

const STACK = [
  { name: "Apache Kafka", role: "Event backbone", latency: "~5ms", throughput: "100k/s/partition", free: "Confluent Cloud basic; Upstash 10k/day" },
  { name: "Apache Pulsar", role: "Multi-tenant + geo-rep", latency: "~5ms", throughput: "100k/s/partition", free: "StreamNative free tier" },
  { name: "Apache Flink", role: "True streaming compute", latency: "< 100ms", throughput: "Millions/s", free: "OSS; Ververica Community" },
  { name: "Spark Streaming", role: "Micro-batch compute", latency: "~100ms-1s", throughput: "Millions/s", free: "OSS; Databricks Community" },
  { name: "Apache Kinesis", role: "AWS-native event stream", latency: "~200ms", throughput: "1k/s/shard", free: "2M events/mo (free tier)" },
  { name: "Apache BookKeeper", role: "Pulsar's storage layer", latency: "~1ms", throughput: "Varies", free: "OSS (Pulsar includes it)" },
];

const LAMBDA_KAPPA = `┌─────────────────────────────────────────────────────────────────────┐
│  LAMBDA ARCHITECTURE (2011-2018) — two pipelines, two bugs         │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│  │  Speed Layer  │──→│  Serving      │──→│  Dashboard    │         │
│  │  (Storm/Spark │    │  Layer        │    │  (approximate)│         │
│  │   Streaming)  │    │  (stitch)     │    └──────────────┘         │
│  └──────────────┘    └──────────────┘                                │
│                            ↑                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│  │  Batch Layer  │──→│  Batch Views  │──→│  Dashboard    │         │
│  │  (Hadoop/Spark│    │  (correct)    │    │  (accurate)   │         │
│  │   batch)       │    │               │    └──────────────┘         │
│  └──────────────┘    └──────────────┘                                │
│                                                                     │
│  Problem: two codebases, two bugs, "wait for batch to catch up"     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  KAPPA ARCHITECTURE (2014, viable 2022) — one pipeline              │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│  │  Event Log    │──→│  Stream       │──→│  Real-time    │         │
│  │  (Kafka/      │    │  Processor    │    │  Dashboard    │         │
│  │   Pulsar)     │    │  (Flink/Spark │    │  (accurate)   │         │
│  │               │    │   Structured) │    └──────────────┘         │
│  └──────────────┘    └──────────────┘                                │
│         ↑                                                           │
│         │  (replay = bounded stream = batch)                         │
│  ┌──────────────┐                                                   │
│  │  Historical    │                                                   │
│  │  Replay        │                                                   │
│  │  (same code)   │                                                   │
│  └──────────────┘                                                   │
│                                                                     │
│  Breakthrough: Delta CDF + Iceberg snapshots + Kafka log compaction  │
│  → table format itself emits the change stream                       │
│  → one MERGE = batch write + stream event + queryable history       │
│  → stop designing "batch" and "streaming" separately                 │
└─────────────────────────────────────────────────────────────────────┘`;

export function StreamingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Streaming · real-time"
        title="Real-Time Streaming — Lambda → Kappa"
        description="The evolution from dual-pipeline (Lambda) to unified streaming (Kappa). Kafka + Pulsar as the event backbone; Flink for true streaming; Spark Structured Streaming for micro-batch. The breakthrough that made Kappa viable: change data feeds (Delta CDF + Iceberg snapshots) — the table format itself emits the change stream."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Radio className="h-3 w-3" /> Real-time</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> &lt; 1s latency</Badge>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* Lambda → Kappa ASCII diagram */}
      <SectionCard
        title="The Lambda → Kappa evolution"
        description="Why the industry moved from dual-pipeline to unified streaming — and what made it possible."
        icon={<GitBranch className="h-5 w-5" />}
      >
        <CodeBlock language="text" filename="lambda_kappa_evolution.txt" code={LAMBDA_KAPPA} />
      </SectionCard>

      {/* Insight */}
      <SectionCard
        title="My deeper thought: the change-data-feed breakthrough"
        description="Kappa architecture was proposed in 2014 but wasn't viable until 2022. What changed?"
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            The Kappa architecture says: <strong className="text-foreground/80">treat everything as a stream; batch is just a bounded stream</strong>. Same pipeline, same code, same bugs. The same SQL that runs on the live stream runs on a historical replay. Elegant — but for 8 years, it was theory. The reason: you needed a separate "real-time path" because the table format didn&apos;t emit changes; you had to build a CDC pipeline alongside your batch pipeline.
          </p>
          <p>
            The breakthrough: <strong className="text-foreground/80">change data feeds (CDF)</strong>. Delta CDF (2022), Iceberg snapshots (2021 v2 spec), and Kafka log compaction all mean the <em>table format itself</em> emits the change stream. A single MERGE into a Delta table is simultaneously: (a) a batch write, (b) a stream event, (c) a queryable history. Three modalities, one operation. The table IS the stream.
          </p>
          <p>
            The implication: <strong className="text-foreground/80">stop designing &ldquo;batch&rdquo; and &ldquo;streaming&rdquo; separately</strong>. Design one logical pipeline; pick the runtime characteristic (latency vs throughput) per workload. The era of separate batch + streaming teams is ending. The era of unified data engineering is here.
          </p>
        </div>
      </SectionCard>

      {/* Stack table */}
      <SectionCard
        title="Streaming stack inventory"
        description="The engines that power the event backbone + compute layer."
        icon={<Boxes className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Engine</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Role</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Latency</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Throughput</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Free tier</th>
              </tr>
            </thead>
            <tbody>
              <LazyList items={STACK} initialCount={4} increment={3} getKey={(s) => s.name} disableWrapper showMoreLabel={(c) => `Show ${c} more engines`} showLessLabel="Collapse">
                {(s) => (
                  <tr key={s.name} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-2 font-semibold text-xs">{s.name}</td>
                    <td className="px-3 py-2 text-[11px] text-muted-foreground">{s.role}</td>
                    <td className="px-3 py-2 text-[11px] font-mono text-amber-600 dark:text-amber-400">{s.latency}</td>
                    <td className="px-3 py-2 text-[11px] font-mono text-muted-foreground">{s.throughput}</td>
                    <td className="px-3 py-2 text-[11px] text-emerald-600 dark:text-emerald-400">{s.free}</td>
                  </tr>
                )}
              </LazyList>
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Multi-language code samples (drawer) */}
      <SectionCard
        title="Multi-language: streaming producer/consumer in 4 stacks"
        description="Same order-event pipeline in Kafka (Python), Flink (SQL), Spark (Python), Pulsar (Python). Click to open the drawer."
        icon={<Languages className="h-5 w-5" />}
        badge="4 stacks · drawer"
      >
        <MultiLangSamples
          drawerMode
          drawerButtonLabel="View 4-stack streaming implementations"
          title="Order event streaming — 4 idiomatic implementations"
          description="Kafka (Python Avro producer) · Flink (SQL with event-time + watermark) · Spark (PySpark Structured Streaming) · Pulsar (Python with geo-replication)."
          samples={[
            {
              language: "python",
              filename: "kafka_producer.py",
              note: "Kafka Python producer — Avro-serialised, idempotent (exactly-once), Schema Registry for governance. Confluent Cloud free tier. File types: .py (source), interpreted.",
              code: `from confluent_kafka import SerializingProducer
from confluent_kafka.schema_registry.avro import AvroSerializer
from confluent_kafka.schema_registry import SchemaRegistryClient
import json, os

ORDER_SCHEMA = """{"type":"record","name":"Order","fields":[
  {"name":"order_id","type":"string"},
  {"name":"customer_id","type":"string"},
  {"name":"order_total","type":"double"},
  {"name":"order_ts","type":{"type":"long","logicalType":"timestamp-millis"}}
]}"""

sr = SchemaRegistryClient({"url": os.environ["SCHEMA_REGISTRY_URL"]})
serializer = AvroSerializer(sr, ORDER_SCHEMA)

producer = SerializingProducer({
    "bootstrap.servers": os.environ["KAFKA_BOOTSTRAP"],
    "enable.idempotence": True,  # exactly-once
    "acks": "all",
    "compression.type": "zstd",
    "value.serializer": serializer,
})

def publish_order(order):
    producer.produce(
        topic="orders",
        key=order["customer_id"],  # partition by customer for ordering
        value=order,
        on_delivery=lambda err, msg: print(f"→ {msg.topic()}-{msg.partition()}@{msg.offset()}" if not err else f"ERR: {err}"),
    )
    producer.poll(0)`,
              highlight: [8, 9, 10, 11, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25],
            },
            {
              language: "sql",
              filename: "flink_orders.sql",
              note: "Flink SQL — true streaming with event-time + watermark + exactly-once. The most powerful streaming SQL. Ververica Community Edition free. File types: .sql (source), interpreted by Flink engine.",
              code: `CREATE TABLE kafka_orders (
  order_id       STRING,
  customer_id    STRING,
  order_total    DECIMAL(18, 2),
  order_ts       TIMESTAMP(3),
  WATERMARK FOR order_ts AS order_ts - INTERVAL '5' SECOND
) WITH (
  'connector' = 'kafka',
  'topic' = 'orders',
  'properties.bootstrap.servers' = 'broker-1:9092',
  'format' = 'avro-confluent',
  'avro-confluent.url' = 'https://schema-registry:8081',
  'scan.startup.mode' = 'latest-offset'
);

CREATE TABLE delta_sales_hourly (
  hour_bucket    TIMESTAMP(3),
  customer_id    STRING,
  total_revenue   DECIMAL(18, 2),
  order_count    BIGINT,
  PRIMARY KEY (hour_bucket, customer_id) NOT ENFORCED
) WITH (
  'connector' = 'delta',
  'table-path' = 's3://delta/sales_hourly',
  'mode' = 'upsert'
);

INSERT INTO delta_sales_hourly
SELECT
  TUMBLE_START(order_ts, INTERVAL '1' HOUR) AS hour_bucket,
  customer_id,
  SUM(order_total) AS total_revenue,
  COUNT(*)          AS order_count
FROM kafka_orders
GROUP BY TUMBLE(order_ts, INTERVAL '1' HOUR), customer_id;`,
              highlight: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 23, 24, 25, 26, 27, 28, 29, 30, 31],
            },
            {
              language: "python",
              filename: "spark_streaming.py",
              note: "Spark Structured Streaming — micro-batch by default, continuous as opt-in. Idempotent Delta writes via MERGE. Databricks Community Edition free. File types: .py (source), interpreted.",
              code: `from pyspark.sql.functions import from_json, col, window
from pyspark.sql.types import StructType, StringType, DoubleType, TimestampType

spark = SparkSession.builder.appName("orders-stream").getOrCreate()

schema = (StructType()
    .add("order_id", StringType())
    .add("customer_id", StringType())
    .add("order_total", DoubleType())
    .add("order_ts", TimestampType()))

# Read from Kafka
stream = (spark.readStream
    .format("kafka")
    .option("kafka.bootstrap.servers", "broker-1:9092")
    .option("subscribe", "orders")
    .load())

# Parse + window aggregation
parsed = stream.select(from_json(col("value").cast("string"), schema).alias("p")).select("p.*")

agg = (parsed
    .withWatermark("order_ts", "10 minutes")
    .groupBy(window(col("order_ts"), "5 minutes"), col("customer_id"))
    .agg({"order_total": "sum", "order_id": "count"}))

# Idempotent write to Delta
(agg.writeStream
    .format("delta")
    .option("checkpointLocation", "/tmp/orders-cp")
    .toTable("delta.sales_daily_window")
    .start()
    .awaitTermination())`,
              highlight: [8, 9, 10, 11, 12, 14, 15, 16, 17, 19, 20, 21, 22, 25, 26, 27, 28, 29],
            },
            {
              language: "python",
              filename: "pulsar_consumer.py",
              note: "Pulsar Python consumer — geo-replication native, Avro schema, Functions on broker. StreamNative free tier. File types: .py (source), interpreted.",
              code: `import pulsar

client = pulsar.Client("pulsar+ssl://free.streamnative.io:6651",
    authentication=pulsar.AuthenticationToken(os.environ["PULSAR_TOKEN"]))

# Consumer — shared subscription for parallel processing
consumer = client.subscribe(
    topic="persistent://moderndatascieng/tenant-1/orders",
    subscription_name="silver-conform",
    schema=pulsar.schema.AvroSchema(OrderSchema),
    subscription_type=pulsar.Shared,  # round-robin
    initial_position=pulsar.InitialPosition.Earliest,
)

while True:
    msg = consumer.receive()
    try:
        order = msg.value()
        process_order(order)  # conform + write to Delta
        consumer.acknowledge(msg)
    except Exception:
        consumer.negative_acknowledge(msg)  # re-deliver later

client.close()`,
              highlight: [4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
            },
          ]}
        />
      </SectionCard>

      {/* Pyodide — streaming simulation */}
      <SectionCard
        title="Try it: Kafka streaming simulation (Pyodide)"
        description="Simulates a Kafka producer + consumer group with Python queues. Shows message flow, lag, throughput. Pure Python stdlib — runs in browser."
        icon={<Terminal className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner
          code={`import queue, random\\nfrom collections import defaultdict\\n\\ntopic = queue.Queue(maxsize=1000)\\nconsumer_offsets = defaultdict(int)\\nmessages_produced = 0\\nmessages_consumed = 0\\n\\nprint(\\\"=== Kafka Producer Simulation ===\\\")\\nfor i in range(100):\\n    msg = {\\n        \\\"offset\\\": i,\\n        \\\"key\\\": f\\\"customer_{random.randint(1, 10)}\\\",\\n        \\\"value\\\": f\\\"order_{i}\\\",\\n        \\\"timestamp\\\": i * 100,\\n    }\\n    topic.put(msg)\\n    messages_produced += 1\\nprint(f\\\"Produced {messages_produced} messages to topic 'orders'\\\")\\n\\nprint(\\\"\\\\\\\\n=== Consumer Group 'silver-conform' (3 consumers) ===\\\")\\nconsumers = [\\\"consumer-0\\\", \\\"consumer-1\\\", \\\"consumer-2\\\"]\\nlag_by_consumer = {c: 0 for c in consumers}\\n\\nwhile not topic.empty():\\n    for consumer in consumers:\\n        try:\\n            msg = topic.get_nowait()\\n            consumer_offsets[consumer] += 1\\n            messages_consumed += 1\\n            lag = random.randint(10, 100)\\n            lag_by_consumer[consumer] += lag\\n        except queue.Empty:\\n            break\\n\\nprint(f\\\"\\\\\\\\n{'Consumer':<15} {'Messages':<12} {'Avg Lag (ms)':<12}\\\")\\nprint(\\\"-\\\" * 39)\\nfor c in consumers:\\n    avg_lag = lag_by_consumer[c] / max(consumer_offsets[c], 1)\\n    print(f\\\"{c:<15} {consumer_offsets[c]:<12} {avg_lag:<12.1f}\\\")\\n\\nprint(f\\\"\\\\\\\\n{'Total produced:':<20} {messages_produced}\\\")\\nprint(f\\\"{'Total consumed:':<20} {messages_consumed}\\\")\\nprint(f\\\"{'Throughput:':<20} {messages_consumed/3:.1f} msgs/consumer\\\")\\nprint(f\\\"{'Avg lag:':<20} {sum(lag_by_consumer.values())/max(messages_consumed,1):.1f} ms\\\")\\nprint(f\\\"\\\\\\\\n\\\\u2713 All messages consumed. Consumer group rebalanced successfully.\\\")`}
          buttonLabel="Run streaming simulation (Pyodide)"
        />
      </SectionCard>

      {/* When to pick which */}
      <SectionCard
        title="When to pick which streaming engine"
        description="The four architectural forks in real-time streaming."
        icon={<Gauge className="h-5 w-5" />}
      >
        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">Pick Kafka when</p>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• You need the most mature event backbone (10+ years, largest ecosystem)</li>
              <li>• Confluent Cloud free tier is enough for your volume</li>
              <li>• Schema Registry governance is important</li>
              <li>• You don&apos;t need geo-replication natively</li>
            </ul>
          </div>
          <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-4">
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">Pick Pulsar when</p>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• Multi-tenant isolation is a hard requirement</li>
              <li>• Geo-replication across regions is native (not bolted on)</li>
              <li>• You want compute-on-broker (Pulsar Functions)</li>
              <li>• Tiered storage to S3/GCS without re-architecture</li>
            </ul>
          </div>
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-4">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">Pick Flink when</p>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• Sub-second latency is non-negotiable</li>
              <li>• Complex event processing with stateful joins</li>
              <li>• Exactly-once semantics across the full pipeline</li>
              <li>• Event-time + watermark handling is critical</li>
            </ul>
          </div>
          <div className="rounded-md border border-cyan-500/40 bg-cyan-500/5 p-4">
            <p className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 mb-2">Pick Spark Streaming when</p>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• You already have Spark batch code to reuse</li>
              <li>• Micro-batch latency (~100ms-1s) is acceptable</li>
              <li>• Lakehouse-first (Delta CDF native integration)</li>
              <li>• Same team owns batch + streaming (no Flink expertise)</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("modern-big-data")} className="text-sm text-primary hover:underline">
          → Continue to Modern Big Data Stack
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("databricks")} className="text-sm text-primary hover:underline">
          → Databricks Lakehouse
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">
          → See ADR-015 (Pyodide + Wasm execution)
        </Link>
      </div>
    </div>
  );
}
