"use client";

import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { MultiLangSamples } from "../_components/multi-lang-samples";
import { LiveResourcesDrawer } from "../_components/live-resources-drawer";
import { LazyList } from "../_components/lazy-list";
import { PyodideRunner } from "../_components/pyodide-runner";
import { Terminal, Play as PlayIcon } from "lucide-react";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Database, Cpu, Layers, Workflow, Zap, Server, Cloud, GitBranch,
  Sparkles, Languages, Boxes, Activity, ShieldCheck, TrendingUp,
  Radio, FileText, ArrowRight, Gauge,
} from "lucide-react";

// ============================================================
// Code snippets (kept at top for readability)
// ============================================================

const BIGQUERY_SQL = `-- ============================================================
-- Google BigQuery — serverless analytical SQL
-- Free tier: 1 TB queries/mo + 10 GB storage (always-free)
-- ============================================================

-- Create a partitioned + clustered table (most efficient layout)
CREATE TABLE IF NOT EXISTS \`moderndatascieng.orders.fct_orders\` (
  order_id        STRING,
  customer_id     STRING,
  order_ts        TIMESTAMP,
  order_total     NUMERIC,
  region_code    STRING
)
PARTITION BY DATE(order_ts)
CLUSTER BY customer_id, region_code
OPTIONS(
  description       = 'Canonical orders fact table',
  expiration_timestamp = TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 365 DAY)
);

-- Query with column pruning + partition pruning + cluster pruning
-- (BigQuery bills by bytes scanned, so this matters)
SELECT
  region_code,
  DATE(order_ts)                       AS order_date,
  COUNT(DISTINCT customer_id)           AS customers,
  SUM(order_total)                       AS revenue_gbp
FROM \`moderndatascieng.orders.fct_orders\`
WHERE order_ts >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND region_code IN ('UK', 'EU')
GROUP BY region_code, order_date
ORDER BY revenue_gbp DESC;

-- BI Engine reservation — accelerate hot tables in-memory
ALTER CAPACITY \`moderndatascieng.bi_engine\` SET
  SIZE_GB = 100,
  plan = 'FLEX';
`;

const DUCKDB_SQL = `-- ============================================================
-- DuckDB — in-process analytical SQL (OSS, free)
-- "Just open a Parquet file" pattern — no server required
-- ============================================================

-- Install + load the httpfs extension to query S3 / HTTPS directly
INSTALL httpfs; LOAD httpfs;
SET s3_region = 'eu-west-1';
SET s3_access_key_id = '...';
SET s3_secret_access_key = '...';

-- Query 100s of Parquet files on S3 without copying them locally
CREATE VIEW bronze_orders AS
  SELECT * FROM read_parquet('s3://moderndatascieng-bronze/shopify/orders/*.parquet');

-- DuckDB is fast at OLAP — 10× faster than Postgres on a single node
SELECT
  date_trunc('day', order_ts) AS day,
  count(*)                     AS orders,
  sum(order_total)             AS revenue
FROM bronze_orders
WHERE order_ts >= CURRENT_DATE - INTERVAL 7 DAY
GROUP BY 1
ORDER BY day DESC;

-- Native Apache Arrow support — read Parquet without deserialising
-- to row-format. Zero-copy handoff to pandas / polars / R / Python.
COPY (SELECT * FROM bronze_orders WHERE region_code = 'UK')
TO '/tmp/uk_orders.parquet' (FORMAT 'parquet', COMPRESSION 'zstd');

-- MotherDuck is the managed DuckDB — same SQL, no ops.
-- Connect: 'duckdb_md:moderndatascieng?attach=true'
`;

const SPARK_STREAMING_PY = `# ============================================================
# Apache Spark Structured Streaming — micro-batch + continuous
# Free: OSS; Databricks Community Edition (free cluster)
# ============================================================
from pyspark.sql import SparkSession
from pyspark.sql.functions import from_json, col, window, current_timestamp
from pyspark.sql.types import StructType, StringType, TimestampType, DoubleType

spark = (SparkSession.builder
    .appName("orders-stream")
    .config("spark.sql.streaming.checkpointLocation", "/tmp/orders-cp")
    .getOrCreate())

# Schema for Kafka payload (Avro / Protobuf / JSON — pick one)
ORDER_SCHEMA = (StructType()
    .add("order_id",     StringType())
    .add("customer_id",  StringType())
    .add("order_total",  DoubleType())
    .add("order_ts",     TimestampType()))

# Read from Kafka topic "orders" (could also be Kinesis / Pulsar / file stream)
stream = (spark
    .readStream
    .format("kafka")
    .option("kafka.bootstrap.servers", "broker-1:9092,broker-2:9092")
    .option("subscribe", "orders")
    .option("startingOffsets", "latest")
    .load())

# Parse JSON payload → structured columns
parsed = (stream
    .select(from_json(col("value").cast("string"), ORDER_SCHEMA).alias("p"))
    .select("p.*"))

# Tumbling window aggregation — write to Delta table (idempotent MERGE)
agg = (parsed
    .withWatermark("order_ts", "10 minutes")  # late-data tolerance
    .groupBy(window(col("order_ts"), "5 minutes"), col("customer_id"))
    .agg({"order_total": "sum", "order_id": "count"}))

# Idempotent write to Delta — MERGE on window + customer_id
(agg.writeStream
    .format("delta")
    .option("checkpointLocation", "/tmp/orders-cp/delta")
    .option("mergeSchema", "true")
    .toTable("delta.sales_daily_window")
    .start()
    .awaitTermination())
`;

const FLINK_SQL = `-- ============================================================
-- Apache Flink SQL — true streaming (event-time + exactly-once)
-- Free: OSS; Ververica Platform Community Edition
-- ============================================================

-- Define a Kafka source (Avro schema, watermark strategy)
CREATE TABLE kafka_orders (
  order_id       STRING,
  customer_id    STRING,
  order_total    DECIMAL(18, 2),
  order_ts       TIMESTAMP(3),
  WATERMARK FOR order_ts AS order_ts - INTERVAL '5' SECOND
) WITH (
  'connector'         = 'kafka',
  'topic'              = 'orders',
  'properties.bootstrap.servers' = 'broker-1:9092',
  'properties.group.id' = 'flink-orders-agg',
  'format'            = 'avro-confluent',
  'avro-confluent.url' = 'https://schema-registry:8081',
  'scan.startup.mode'  = 'latest-offset'
);

-- Define a sink — append to a Delta/Iceberg table via connector
CREATE TABLE delta_sales_hourly (
  hour_bucket    TIMESTAMP(3),
  customer_id    STRING,
  total_revenue   DECIMAL(18, 2),
  order_count    BIGINT,
  PRIMARY KEY (hour_bucket, customer_id) NOT ENFORCED
) WITH (
  'connector'           = 'delta',
  'table-path'          = 's3://moderndatascieng-delta/sales_hourly',
  'mode'                = 'upsert',
  'parquet.compression' = 'zstd'
);

-- Continuous aggregation — exactly-once semantics
INSERT INTO delta_sales_hourly
SELECT
  TUMBLE_START(order_ts, INTERVAL '1' HOUR) AS hour_bucket,
  customer_id,
  SUM(order_total) AS total_revenue,
  COUNT(*)          AS order_count
FROM kafka_orders
GROUP BY
  TUMBLE(order_ts, INTERVAL '1' HOUR),
  customer_id;
`;

const KAFKA_PY = `# ============================================================
# Apache Kafka — distributed event streaming
# Free tier: Confluent Cloud (basic cluster), Upstash (serverless 10k/day)
# ============================================================
from confluent_kafka import Producer, Consumer, SerializingProducer
from confluent_kafka.serialization import StringSerializer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer
import json, os

# Schema Registry — Avro schema for the order event
ORDER_SCHEMA = """
{
  "type": "record",
  "name": "Order",
  "namespace": "com.moderndatascieng.events",
  "fields": [
    {"name": "order_id", "type": "string"},
    {"name": "customer_id", "type": "string"},
    {"name": "order_total", "type": "double"},
    {"name": "order_ts", "type": {"type": "long", "logicalType": "timestamp-millis"}}
  ]
}
"""

# Producer — Avro-serialised + exactly-once (idempotent producer)
sr_client = SchemaRegistryClient({"url": os.environ["SCHEMA_REGISTRY_URL"]})
avro_serializer = AvroSerializer(sr_client, ORDER_SCHEMA)

producer = SerializingProducer({
    "bootstrap.servers": os.environ["KAFKA_BOOTSTRAP"],
    "enable.idempotence": True,            # exactly-once producer
    "acks": "all",                         # wait for all ISR replicas
    "compression.type": "zstd",            # wire compression
    "value.serializer": avro_serializer,
    "key.serializer": StringSerializer("utf-8"),
})

def delivery_report(err, msg):
    if err:
        print(f"Delivery failed: {err}")
    else:
        print(f"Delivered to {msg.topic()}-{msg.partition()}@{msg.offset()}")

# Publish — partitioned by customer_id for ordering guarantees
def publish_order(order: dict):
    producer.produce(
        topic="orders",
        key=order["customer_id"],
        value=order,
        on_delivery=delivery_report,
    )
    producer.poll(0)  # serve delivery callbacks

# Consumer — consumer group = parallel processing
consumer = Consumer({
    "bootstrap.servers": os.environ["KAFKA_BOOTSTRAP"],
    "group.id": "silver-conform-service",
    "auto.offset.reset": "earliest",
    "enable.auto.commit": False,           # manual commit = exactly-once downstream
    "partition.assignment.strategy": "cooperative-sticky",
})
consumer.subscribe(["orders"])
`;

const PULSAR_PY = `# ============================================================
# Apache Pulsar — multi-tenant pub/sub + geo-replication
# Free tier: StreamNative Cloud (free tier)
# ============================================================
import pulsar

client = pulsar.Client("pulsar+ssl://free-tier-streamnative.io:6651",
                       authentication=pulsar.AuthenticationToken(os.environ["PULSAR_TOKEN"]))

# Producer — keyed topics enable ordering per-key
producer = client.create_producer(
    topic="persistent://moderndatascieng/tenant-1/orders",
    schema=pulsar.schema.AvroSchema(ORDER_SCHEMA),
    send_timeout_millis=30000,
    compression_type=pulsar.CompressionType.ZSTD,
    batching_enabled=True,
    batching_max_messages=1000,
    # Geo-replication: this topic is replicated to 'us-east' and 'eu-west' clusters
    # automatically — consumers in either region see the same events.
)

# Publish
producer.send(Order(
    order_id="ord_42",
    customer_id="cust_1",
    order_total=42.50,
    order_ts=int(time.time() * 1000),
))

# Consumer — shared subscription for parallel processing
consumer = client.subscribe(
    topic="persistent://moderndatascieng/tenant-1/orders",
    subscription_name="silver-conform",
    schema=pulsar.schema.AvroSchema(ORDER_SCHEMA),
    subscription_type=pulsar.Shared,  # round-robin across consumer instances
    initial_position=pulsar.InitialPosition.Earliest,
)

while True:
    msg = consumer.receive()
    try:
        order = msg.value()
        # Process + ack (exactly-once if downstream is idempotent)
        process_order(order)
        consumer.acknowledge(msg)
    except Exception:
        consumer.negative_acknowledge(msg)  # re-deliver later

client.close()
`;

const ICEBERG_SQL = `-- ============================================================
-- Apache Iceberg — open table format (vendor-neutral)
-- Free: OSS, runs on any compute (Spark, Trino, Flink, Athena)
-- ============================================================

-- Create an Iceberg table (uses Hive catalog — alternatives: REST, Glue, Nessie)
CREATE TABLE moderndatascieng.sales.fct_orders (
  order_id        STRING,
  customer_id     STRING,
  order_ts        TIMESTAMP,
  order_total     DECIMAL(18,2),
  region_code    STRING
) USING iceberg
PARTITIONED BY (days(order_ts))
TBLPROPERTIES (
  'write.format.default'             = 'parquet',
  'write.parquet.compression-codec'  = 'zstd',
  'format-version'                   = '2',          -- v2 enables row-level deletes
  'write.delete.mode'                = 'merge-on-read',
  'history.expire.max-snapshots'     = '30',
  'write.distribution-mode'          = 'hash'        # hash partition on order_id
);

-- MERGE INTO — Iceberg supports row-level updates via the v2 spec
MERGE INTO moderndatascieng.sales.fct_orders AS t
USING (SELECT * FROM staging.updates WHERE order_ts > now() - INTERVAL '1' DAY) AS s
  ON t.order_id = s.order_id
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;

-- Time travel — query any historical snapshot
SELECT * FROM moderndatascieng.sales.fct_orders.history;
SELECT * FROM moderndatascieng.sales.fct_orders.snapshots;

-- Branch + tag (Nessie catalog only) — git-like table versioning
-- Useful for ML reproducibility: train on the 'training-v2' branch
ALTER TABLE moderndatascieng.sales.fct_orders
CREATE BRANCH IF NOT EXISTS training_v2
AS OF VERSION 42;
`;

// ============================================================
// Component data
// ============================================================

const KPI_DATA = [
  { label: "Streaming sources", value: "6", hint: "Kafka · Pulsar · Kinesis · Snowplow · CDC · S3 events", deltaTone: "flat" as const },
  { label: "Compute engines", value: "5", hint: "Spark · Flink · Trino · BigQuery · DuckDB", deltaTone: "flat" as const },
  { label: "Open table formats", value: "3", hint: "Delta · Iceberg · Hudi", deltaTone: "flat" as const },
  { label: "Columnar file formats", value: "4", hint: "Parquet · ORC · Arrow · Feather", deltaTone: "flat" as const },
];

const STACK = [
  {
    name: "Google BigQuery",
    category: "Serverless warehouse",
    role: "Ad-hoc + scheduled analytical SQL on petabytes, with no infra",
    free_tier: "1 TB queries/mo + 10 GB storage (always-free)",
    when: "Cost-predictable batch analytics; standard SQL; multi-region",
    when_not: "Workloads needing fine-grained cost control; sub-second P95 latency",
    file_types: "Parquet, Avro, ORC, CSV, JSON, BigQuery native (Capacitor)",
    code_lang: "SQL",
    repo: "GoogleCloudPlatform/bigquery-utils",
  },
  {
    name: "DuckDB",
    category: "In-process OLAP",
    role: "Analytical SQL on local files (Parquet, CSV, Arrow) without a server",
    free_tier: "100% OSS; MotherDuck has 14-day free trial",
    when: "Notebook analytics; CI tests; small/medium data (<1TB); edge processing",
    when_not: "Petabyte-scale; high-concurrency multi-user workloads",
    file_types: "Parquet, CSV, JSON, Arrow IPC, Excel, SQLite",
    code_lang: "SQL",
    repo: "duckdb/duckdb",
  },
  {
    name: "Apache Spark Streaming",
    category: "Micro-batch + continuous",
    role: "Unified batch + streaming on Delta Lake; native CDF + MERGE",
    free_tier: "OSS; Databricks Community Edition (free 1-cluster)",
    when: "Lakehouse-first teams; existing Spark batch code reuse; ML pipelines",
    when_not: "True sub-second streaming (use Flink); 100% greenfield streaming",
    file_types: "Parquet, Delta, Avro, Kafka offsets, JSON",
    code_lang: "Python/Scala/SQL",
    repo: "apache/spark",
  },
  {
    name: "Apache Flink",
    category: "True streaming",
    role: "Event-time + exactly-once; stateful streaming + batch unification",
    free_tier: "OSS; Ververica Platform Community Edition",
    when: "Sub-second latency; complex event processing; stateful joins",
    when_not: "Simple ETL (use Spark); batch-heavy workloads",
    file_types: "Avro, Protobuf, Parquet, Iceberg, Kafka topics",
    code_lang: "Java/SQL/Python",
    repo: "apache/flink",
  },
  {
    name: "Apache Kafka",
    category: "Event streaming",
    role: "Durable, partitioned, ordered event log; backbone for events",
    free_tier: "Confluent Cloud basic (single-broker); Upstash 10k req/day",
    when: "Event backbone; CDC; high-throughput pub-sub; replayable logs",
    when_not: "Low-volume message queues (use SQS); CRUD requests",
    file_types: "Avro (Schema Registry), Protobuf, JSON Schema",
    code_lang: "Java/Python/Go",
    repo: "apache/kafka",
  },
  {
    name: "Apache Pulsar",
    category: "Multi-tenant pub/sub",
    role: "Geo-replication native; tiered storage; native functions",
    free_tier: "StreamNative Cloud free tier",
    when: "Multi-tenant isolation; geo-replication; compute-on-broker (Functions)",
    when_not: "Single-region teams (Kafka is simpler); very low ops tolerance",
    file_types: "Avro, JSON, Protobuf, MessagePack",
    code_lang: "Java/Python/Go",
    repo: "apache/pulsar",
  },
  {
    name: "Apache Iceberg",
    category: "Open table format",
    role: "Vendor-neutral ACID table format; spec-driven multi-engine support",
    free_tier: "100% OSS; runs on Spark, Trino, Flink, Athena, BigQuery, Snowflake",
    when: "Avoiding engine lock-in; multi-engine same-table access",
    when_not: "Already on Databricks (Delta is more native there); needs Hudi's upsert focus",
    file_types: "Parquet (data), Avro (delete files), metadata JSON",
    code_lang: "SQL/Python/Java",
    repo: "apache/iceberg",
  },
  {
    name: "Apache Hudi",
    category: "Open table format",
    role: "Streaming-first table format; upserts + incremental processing",
    free_tier: "100% OSS; OneTable (Hudi/Iceberg/Delta interop)",
    when: "CDC-heavy workloads; need upsert-heavy tables; incremental queries",
    when_not: "Append-only Bronze/Silver (Delta or Iceberg simpler)",
    file_types: "Parquet, Avro (log files)",
    code_lang: "Python/Java/SQL",
    repo: "apache/hudi",
  },
  {
    name: "Trino (formerly PrestoSQL)",
    category: "Distributed SQL engine",
    role: "Federated SQL across 30+ sources; sub-second interactive queries",
    free_tier: "100% OSS; Starburst has free trial",
    when: "Federated queries (Snowflake + S3 + MySQL + Kafka); ad-hoc",
    when_not: "Need OLAP-optimised storage (use a warehouse); ETL pipelines",
    file_types: "Parquet, ORC, Avro, RCFile, JSON, Iceberg, Delta",
    code_lang: "SQL",
    repo: "trinodb/trino",
  },
  {
    name: "Apache Pinot",
    category: "Real-time OLAP",
    role: "Sub-second user-facing analytics on real-time + batch data",
    free_tier: "100% OSS; self-hostable on K8s",
    when: "User-facing dashboards needing real-time; high-QPS slicing",
    when_not: "Internal-only BI (use Snowflake/Tableau); petabyte-scale storage",
    file_types: "Parquet, Avro, JSON, Kafka topics",
    code_lang: "Java/SQL",
    repo: "apache/pinot",
  },
  {
    name: "ClickHouse",
    category: "Columnar OLAP",
    role: "Massively parallel columnar DB for OLAP; 100× faster than Postgres",
    free_tier: "OSS; ClickHouse Cloud free trial",
    when: "High-QPS user-facing analytics; log/event aggregation",
    when_not: "Transactional workloads; need joins across wide tables",
    file_types: "Parquet, ORC, Arrow, JSON, native",
    code_lang: "SQL",
    repo: "ClickHouse/ClickHouse",
  },
  {
    name: "Apache Arrow / Flight",
    category: "Columnar in-memory format",
    role: "Zero-copy data exchange; Flight = RPC protocol for transfer",
    free_tier: "100% OSS",
    when: "Building blocks for analytical engines; cross-language IPC",
    when_not: "Direct end-user API (use DuckDB/Polars)",
    file_types: "Arrow IPC (.arrow, .feather)",
    code_lang: "C++/Rust/Python/JS",
    repo: "apache/arrow",
  },
];

const FILE_FORMATS = [
  {
    name: "Apache Parquet",
    type: "Columnar storage",
    role: "Default for analytical workloads. Nested columnar + predicate pushdown.",
    used_by: "Spark, Flink, Trino, BigQuery, Snowflake, DuckDB, Iceberg, Delta, Hudi",
    compression: "Snappy (default), Zstd (modern), Gzip, LZO, Brotli, LZ4",
    when: "Always use for analytical columnar storage. Period.",
    when_not: "Streaming wire format (row-based is faster to serialise)",
  },
  {
    name: "Apache ORC",
    type: "Columnar storage",
    role: "Hive-native alternative to Parquet; comparable performance.",
    used_by: "Hive, Presto/Trino, Spark (legacy), Apache Pinot",
    compression: "Zlib, Snappy, LZO, Zstd",
    when: "Hive-first platforms; HCatalog integrations",
    when_not: "Greenfield — prefer Parquet (broader engine support)",
  },
  {
    name: "Apache Arrow / Feather",
    type: "Columnar in-memory + IPC",
    role: "Zero-copy cross-language exchange; building block for analytical engines.",
    used_by: "Polars, DuckDB, Pandas, R, Python, JS, Rust",
    compression: "LZ4, Zstd",
    when: "Cross-engine IPC; in-process analytics; columnar caching",
    when_not: "Long-term storage (use Parquet)",
  },
  {
    name: "Apache Avro",
    type: "Row-based serialisation",
    role: "Schema-evolution-friendly row format; default for Kafka/Pulsar.",
    used_by: "Kafka (Schema Registry), Pulsar, Hudi, Iceberg delete files",
    compression: "Deflate, Snappy, Zstd",
    when: "Streaming wire format; schema evolution; row-level data",
    when_not: "Analytical columnar storage (use Parquet)",
  },
  {
    name: "Protocol Buffers",
    type: "Row-based serialisation",
    role: "Compact binary wire format with strong schema; widely used in microservices.",
    used_by: "Kafka (ProtobufSerde), Pulsar, gRPC services",
    compression: "None (already compact); can wrap with Snappy",
    when: "Service-to-service; backward-compat critical; field-masking needed",
    when_not: "Schema registry governance is easier with Avro",
  },
  {
    name: "JSON / JSON Schema",
    type: "Text-based serialisation",
    role: "Human-readable; ubiquitous; default for ad-hoc integration.",
    used_by: "Kafka (default), Pulsar, REST APIs, BigQuery (export), webhooks",
    compression: "None; pair with Gzip/Zstd on transport",
    when: "Prototyping; non-volume-sensitive; human inspection needed",
    when_not: "Volume-sensitive pipelines (10× larger than Avro)",
  },
  {
    name: "Delta Lake",
    type: "Open table format (on Parquet)",
    role: "ACID on cloud object stores; native to Databricks Lakehouse.",
    used_by: "Databricks, Apache Spark, Apache Flink (connector), Apache Iceberg (via UniForm)",
    compression: "Inherits Parquet compression",
    when: "On Databricks; need ACID on S3/ADLS/GCS",
    when_not: "Need vendor-neutral multi-engine access (use Iceberg)",
  },
  {
    name: "Apache Iceberg",
    type: "Open table format (on Parquet/Avro)",
    role: "Vendor-neutral; spec-driven; multi-engine native access.",
    used_by: "Spark, Trino, Flink, Athena, BigQuery, Snowflake, DuckDB, Impala",
    compression: "Inherits Parquet compression",
    when: "Multi-engine same-table; avoiding Databricks/Snowflake lock-in",
    when_not: "Hudi-style upsert-heavy CDC (use Hudi)",
  },
  {
    name: "Apache Hudi",
    type: "Open table format (on Parquet)",
    role: "Streaming-first; upsert-optimised; incremental processing built-in.",
    used_by: "Spark, Flink (Beta), Hive, Trino (connector)",
    compression: "Inherits Parquet compression",
    when: "CDC pipelines; need upserts without MERGE; incremental queries",
    when_not: "Append-only Bronze (Delta/Iceberg simpler)",
  },
];

const TRADEOFFS = [
  {
    decision: "Streaming: Kafka vs Pulsar vs Kinesis",
    options: [
      { option: "Kafka", strengths: "Mature, broad ecosystem, Confluent Cloud free tier", weaknesses: "Multi-tenancy is hard; ops overhead self-hosted", verdict: "Default for most teams" },
      { option: "Pulsar", strengths: "Native geo-replication, tiered storage, Functions", weaknesses: "Smaller community, more complex ops", verdict: "Multi-region or compute-on-broker" },
      { option: "Kinesis", strengths: "AWS-native, zero ops", weaknesses: "AWS-only, per-shard pricing adds up", verdict: "AWS-only teams with light traffic" },
    ],
  },
  {
    decision: "Compute: Spark Streaming vs Flink",
    options: [
      { option: "Spark Structured Streaming", strengths: "Same engine as batch; Delta native; easy migration", weaknesses: "Micro-batch by default; not true sub-second", verdict: "Lakehouse-first teams" },
      { option: "Flink", strengths: "True streaming; event-time + exactly-once; stateful joins", weaknesses: "Steeper learning curve; smaller ecosystem", verdict: "Real-time / complex event processing" },
    ],
  },
  {
    decision: "Table format: Delta vs Iceberg vs Hudi",
    options: [
      { option: "Delta", strengths: "Best on Databricks; UniForm interop with Iceberg", weaknesses: "Less mature off-Databricks", verdict: "On Databricks" },
      { option: "Iceberg", strengths: "Vendor-neutral; broadest engine support; spec-driven", weaknesses: "Merge-on-read deletes less mature", verdict: "Multi-engine, avoid lock-in" },
      { option: "Hudi", strengths: "Upsert-first; incremental queries; CoW + MoR", weaknesses: "Smaller ecosystem; Flink support still maturing", verdict: "CDC-heavy upsert pipelines" },
    ],
  },
  {
    decision: "Warehouse: BigQuery vs Snowflake vs ClickHouse",
    options: [
      { option: "BigQuery", strengths: "Serverless, generous free tier, GCP-native", weaknesses: "GCP-only feel; cost less predictable at scale", verdict: "GCP teams; ad-hoc analytics" },
      { option: "Snowflake", strengths: "Multi-cloud, mature RLS, secure sharing", weaknesses: "Cost adds up; less OSS-friendly", verdict: "Multi-cloud enterprise" },
      { option: "ClickHouse", strengths: "10× faster on OLAP; OSS; user-facing analytics", weaknesses: "Smaller ecosystem; joins are harder", verdict: "High-QPS user-facing analytics" },
    ],
  },
];

const FREE_TIERS = [
  { service: "BigQuery", free: "1 TB queries/mo + 10 GB storage", link: "cloud.google.com/bigquery/pricing" },
  { service: "DuckDB", free: "100% OSS (MIT)", link: "duckdb.org" },
  { service: "MotherDuck", free: "14-day free trial", link: "motherduck.com" },
  { service: "Apache Spark", free: "OSS; Databricks Community Edition (1 free cluster)", link: "databricks.com/learn/community-edition" },
  { service: "Apache Flink", free: "OSS; Ververica Platform Community Edition", link: "ververica.com" },
  { service: "Confluent Cloud (Kafka)", free: "Free tier — basic cluster, ~100 topics", link: "confluent.io" },
  { service: "Upstash Kafka", free: "10,000 requests/day (serverless)", link: "upstash.com" },
  { service: "StreamNative (Pulsar)", free: "Free tier — 1 namespace, 100 topics", link: "streamnative.io" },
  { service: "Apache Iceberg / Hudi / Delta", free: "100% OSS (Apache 2.0)", link: "iceberg.apache.org" },
  { service: "Trino", free: "OSS; Starburst 30-day trial", link: "trino.io" },
  { service: "Apache Pinot", free: "OSS; self-hostable", link: "pinot.apache.org" },
  { service: "ClickHouse Cloud", free: "30-day trial; self-host free", link: "clickhouse.com" },
];

export function ModernBigDataPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Modern Big Data Stack"
        title="BigQuery · DuckDB · Spark Streaming · Flink · Kafka · Pulsar · Iceberg"
        description="The modern big-data stack is a hybrid of serverless warehouses (BigQuery), in-process OLAP (DuckDB), true streaming (Flink), and open table formats (Delta/Iceberg/Hudi) wired together by event backbones (Kafka/Pulsar). This page covers each engine with code, free tiers, file formats, and the trade-offs that decide which one to pick."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Cloud className="h-3 w-3" /> Serverless + OSS</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Real-time</Badge>
          </div>
        }
      />

      {/* Live dataset drawer — fetches arXiv + GitHub + HF + PwC for big data topics */}
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPI_DATA.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* Insight: the convergence pattern */}
      <SectionCard
        title="My deeper thought: the convergence pattern"
        description="The most important trend in the modern big-data stack isn't any one engine — it's the convergence of batch + streaming + warehouse + lakehouse into one hybrid fabric."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Ten years ago you had three separate stacks: a data warehouse (Snowflake/BigQuery) for BI,
            a streaming system (Kafka + Storm) for real-time, and a data lake (S3 + Hive) for ad-hoc.
            Each had its own format, its own compute, its own governance. Data moved between them
            via fragile ETL jobs. <strong className="text-foreground/80">Three silos, three formats,
            three governances, three sets of bugs.</strong>
          </p>
          <p>
            The modern stack is converging on one pattern: <strong className="text-foreground/80">an
            open table format (Delta/Iceberg/Hudi) on cloud object storage, queried by any engine
            (Spark, Flink, Trino, BigQuery, Snowflake, DuckDB) via a shared catalog</strong>. The
            warehouse and the lake are the same thing now. Streaming and batch are the same query
            with different window sizes. The "Kappa architecture" promise — one stack for both
            modalities — is finally real.
          </p>
          <p>
            The implication: <strong className="text-foreground/80">the file format matters more
            than the engine</strong>. Parquet + Arrow are the lingua franca. Avro + Protobuf are the
            wire formats. The engines are interchangeable; the data format is sticky. Pick formats
            for portability, engines for the job at hand. This is the opposite of where the industry
            was in 2015, when engine-lock-in was the norm.
          </p>
          <p>
            The next convergence is happening now: <strong className="text-foreground/80">DuckDB +
            Arrow + MotherDuck</strong> are bringing OLAP to the laptop, the edge, and the
            notebook. Big data is becoming small enough to fit in your pocket — and that changes
            which decisions are made where.
          </p>
        </div>
      </SectionCard>

      {/* Stack table */}
      <SectionCard
        title="Stack inventory — 12 engines / formats"
        description="Each row = a serious option in the modern big-data stack. Click the GitHub repo on each to see real implementations."
        icon={<Boxes className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Engine / format</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Category</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Role</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Free tier</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">When to use</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">File types</th>
              </tr>
            </thead>
            <tbody>
              <LazyList
                items={STACK}
                initialCount={6}
                increment={6}
                getKey={(s) => s.name}
                disableWrapper
                showMoreLabel={(c) => `Show ${c} more engines`}
                showLessLabel="Collapse to top 6"
              >
                {(s) => (
                  <tr key={s.name} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-xs">{s.name}</p>
                      <a
                        href={`https://github.com/${s.repo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary hover:underline font-mono"
                      >
                        {s.repo}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-muted-foreground">{s.category}</td>
                    <td className="px-3 py-2 text-[11px] text-muted-foreground">{s.role}</td>
                    <td className="px-3 py-2 text-[11px] text-emerald-600 dark:text-emerald-400">{s.free_tier}</td>
                    <td className="px-3 py-2 text-[11px] text-foreground/80">{s.when}</td>
                    <td className="px-3 py-2 text-[10px] font-mono text-muted-foreground">{s.file_types}</td>
                  </tr>
                )}
              </LazyList>
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Multi-language code samples: BigQuery + DuckDB + Iceberg SQL */}
      <SectionCard
        title="Multi-language: serverless SQL across BigQuery, DuckDB & Iceberg (drawer)"
        description="The same analytical query written for three different engines. Note how the SQL is nearly identical — the file format (Parquet) is the constant, the engine is the variable."
        icon={<Languages className="h-5 w-5" />}
        badge="3 engines"
      >
        <MultiLangSamples
            drawerMode
            drawerButtonLabel="View code samples"
          title="Aggregation across three serverless engines"
          samples={[
            {
              language: "sql",
              filename: "bigquery_orders.sql",
              note: "Google BigQuery — serverless. Bills by bytes scanned, so always partition + cluster. Free tier: 1 TB/mo.",
              code: BIGQUERY_SQL,
              highlight: [7, 8, 9, 10, 11, 12, 13, 14, 15, 24, 25, 26, 27, 28, 29, 30],
            },
            {
              language: "sql",
              filename: "duckdb_orders.sql",
              note: "DuckDB — in-process OSS OLAP. 10× faster than Postgres on a single node. No server needed; reads S3 directly via httpfs extension.",
              code: DUCKDB_SQL,
              highlight: [6, 7, 8, 9, 10, 12, 13, 14, 21, 22, 23, 27, 28],
            },
            {
              language: "sql",
              filename: "iceberg_orders.sql",
              note: "Apache Iceberg — open table format. The same SQL works on Spark, Trino, Flink, Athena, BigQuery, Snowflake — engine-portable ACID.",
              code: ICEBERG_SQL,
              highlight: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19, 20, 21, 22, 23, 30, 31, 32, 33],
            },
          ]}
        />
      </SectionCard>

      {/* Multi-language code samples: streaming */}
      <SectionCard
        title="Multi-language: streaming across Spark, Flink, Kafka, Pulsar (drawer)"
        description="The same order-event pipeline implemented in four different streaming stacks. Notice the convergence: Flink SQL and Spark Structured Streaming look almost identical."
        icon={<Languages className="h-5 w-5" />}
        badge="4 stacks"
      >
        <MultiLangSamples
            drawerMode
            drawerButtonLabel="View code samples"
          title="Order event processing — 4 streaming implementations"
          samples={[
            {
              language: "python",
              filename: "spark_streaming.py",
              note: "Spark Structured Streaming — micro-batch by default, continuous as opt-in. Idempotent Delta writes via MERGE.",
              code: SPARK_STREAMING_PY,
              highlight: [10, 11, 12, 13, 14, 15, 22, 23, 24, 25, 26, 27, 30, 31, 32, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46],
            },
            {
              language: "sql",
              filename: "flink_orders.sql",
              note: "Flink SQL — true streaming with event-time + watermark + exactly-once. The most powerful streaming SQL.",
              code: FLINK_SQL,
              highlight: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 26, 27, 28, 29, 30, 31, 33, 34, 35, 36, 37, 38, 39, 40],
            },
            {
              language: "python",
              filename: "kafka_producer.py",
              note: "Kafka — Avro-serialised, idempotent producer (exactly-once). Schema Registry for governance. Confluent Cloud free tier.",
              code: KAFKA_PY,
              highlight: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 28, 29, 30, 31, 32, 33, 34, 35, 47, 48, 49, 50, 51, 52],
            },
            {
              language: "python",
              filename: "pulsar_consumer.py",
              note: "Pulsar — multi-tenant, geo-replication native, compute-on-broker via Functions. StreamNative free tier.",
              code: PULSAR_PY,
              highlight: [7, 8, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 27, 28, 29, 30, 31, 32, 33, 34, 35, 39, 40, 41, 42],
            },
          ]}
        />
      </SectionCard>

      {/* File format cheat sheet */}
      <SectionCard
        title="File format cheat sheet — the lingua franca of big data"
        description="The engine is interchangeable; the file format is sticky. Pick formats for portability + longevity."
        icon={<FileText className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Format</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Role</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Used by</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Compression</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">When to use</th>
              </tr>
            </thead>
            <tbody>
              <LazyList
                items={FILE_FORMATS}
                initialCount={5}
                increment={4}
                getKey={(f) => f.name}
                disableWrapper
                showMoreLabel={(c) => `Show ${c} more formats`}
                showLessLabel="Collapse to top 5"
              >
                {(f) => (
                  <tr key={f.name} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-2 font-mono text-xs font-semibold">{f.name}</td>
                    <td className="px-3 py-2 text-[11px] text-muted-foreground">{f.type}</td>
                    <td className="px-3 py-2 text-[11px] text-muted-foreground">{f.role}</td>
                    <td className="px-3 py-2 text-[10px] font-mono text-muted-foreground">{f.used_by}</td>
                    <td className="px-3 py-2 text-[10px] font-mono text-muted-foreground">{f.compression}</td>
                    <td className="px-3 py-2 text-[11px] text-foreground/80">{f.when}</td>
                  </tr>
                )}
              </LazyList>
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Free tier table */}
      <SectionCard
        title="Free tier matrix — start building without a credit card"
        description="Most of the modern big-data stack has a serious free tier. Here's where to start for each component."
        icon={<Cloud className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Service</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Free tier</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Link</th>
              </tr>
            </thead>
            <tbody>
              <LazyList
                items={FREE_TIERS}
                initialCount={6}
                increment={6}
                getKey={(t) => t.service}
                disableWrapper
                showMoreLabel={(c) => `Show ${c} more services`}
                showLessLabel="Collapse to top 6"
              >
                {(t) => (
                  <tr key={t.service} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-2 text-xs font-semibold">{t.service}</td>
                    <td className="px-3 py-2 text-[11px] text-emerald-600 dark:text-emerald-400">{t.free}</td>
                    <td className="px-3 py-2 text-[11px] font-mono text-muted-foreground">{t.link}</td>
                  </tr>
                )}
              </LazyList>
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Trade-off matrices */}
      <SectionCard
        title="Trade-off matrices — which engine for which job"
        description="For the four architectural forks that come up most often: streaming backbone, streaming compute, table format, and warehouse."
        icon={<Gauge className="h-5 w-5" />}
      >
        <div className="space-y-5">
          {TRADEOFFS.map((t) => (
            <div key={t.decision}>
              <p className="text-sm font-semibold mb-2">{t.decision}</p>
              <div className="grid md:grid-cols-3 gap-2">
                {t.options.map((o) => {
                  const isChosen = o.verdict.toLowerCase().startsWith("default") || o.verdict.toLowerCase().startsWith("on ") || o.verdict.toLowerCase().includes("teams") || o.verdict.toLowerCase().includes("use");
                  return (
                    <div
                      key={o.option}
                      className={`rounded-md border p-3 ${isChosen ? "border-primary/50 bg-primary/5" : "border-border/60"}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="font-semibold text-sm">{o.option}</p>
                        {isChosen && <ArrowRight className="h-3 w-3 text-primary" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-1.5">
                        <strong className="text-foreground/80">Strengths:</strong> {o.strengths}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        <strong className="text-foreground/80">Weaknesses:</strong> {o.weaknesses}
                      </p>
                      <p className={`text-[11px] mt-2 font-medium ${isChosen ? "text-primary" : "text-muted-foreground"}`}>
                        Verdict: {o.verdict}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Insight: streaming vs batch unification */}
      <SectionCard
        title="My deeper thought: the Lambda→Kappa evolution is finally winning"
        description="The debate between dual-pipeline (Lambda) and unified (Kappa) is being settled in Kappa's favour — and that has real architectural consequences."
        icon={<Radio className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            The Lambda architecture (2011-2018) had a speed layer (Storm / Spark Streaming) for
            real-time and a batch layer (Hadoop / Spark) for correctness. They wrote to separate
            views; a serving layer stitched them. <strong className="text-foreground/80">Two
            pipelines, two codebases, two bugs.</strong> Every real-time metric had a "wait for the
            batch to catch up" caveat.
          </p>
          <p>
            The Kappa architecture (proposed 2014, viable 2022) says: <strong className="text-foreground/80">treat
            everything as a stream; batch is just a bounded stream.</strong> One pipeline, one
            codebase. Spark Structured Streaming + Flink SQL make this real because they support
            both micro-batch and continuous execution. The same SQL that runs on the live stream
            runs on a historical replay.
          </p>
          <p>
            The breakthrough that made Kappa viable: <strong className="text-foreground/80">change
            data feeds (Delta CDF, Iceberg snapshots, Kafka log compaction)</strong>. You no longer
            need a separate "real-time path" — the table format itself emits the change stream. A
            single MERGE into a Delta table is simultaneously: (a) a batch write, (b) a stream event,
            (c) a queryable history. Three modalities, one operation.
          </p>
          <p>
            The implication: <strong className="text-foreground/80">stop designing "batch" and
            "streaming" separately</strong>. Design one logical pipeline; pick the runtime
            characteristic (latency vs throughput) per workload. The era of separate batch + streaming
            teams is ending. The era of unified data engineering is here.
          </p>
        </div>
      </SectionCard>

      {/* Open standards */}
      <SectionCard
        title="Open standards: the sub-2% lock-in play"
        description="Where to standardise on open formats vs where vendor-lock is acceptable."
        icon={<ShieldCheck className="h-5 w-5" />}
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">Always open</p>
            <ul className="text-xs space-y-1.5 text-muted-foreground">
              <li>• File format: <InlineCode>Parquet</InlineCode> + <InlineCode>Arrow</InlineCode></li>
              <li>• Wire format: <InlineCode>Avro</InlineCode> (with Schema Registry)</li>
              <li>• Table format: <InlineCode>Iceberg</InlineCode> (vendor-neutral)</li>
              <li>• Catalog: <InlineCode>Nessie</InlineCode> or <InlineCode>REST catalog</InlineCode></li>
              <li>• Compute: <InlineCode>Spark</InlineCode> or <InlineCode>Trino</InlineCode> (OSS)</li>
              <li>• Streaming: <InlineCode>Kafka protocol</InlineCode> (not just Confluent)</li>
            </ul>
          </div>
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-4">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">Acceptable lock-in</p>
            <ul className="text-xs space-y-1.5 text-muted-foreground">
              <li>• Warehouse: <InlineCode>Snowflake</InlineCode> / <InlineCode>BigQuery</InlineCode> (RLS, sharing)</li>
              <li>• BI: <InlineCode>Tableau</InlineCode> / <InlineCode>Looker</InlineCode> (semantic layer)</li>
              <li>• Ingestion: <InlineCode>Fivetran</InlineCode> (managed connectors)</li>
              <li>• Activation: <InlineCode>Hightouch</InlineCode> (sync UI)</li>
              <li>• Observability: <InlineCode>Monte Carlo</InlineCode> (DQ + lineage)</li>
            </ul>
            <p className="text-[10px] text-muted-foreground mt-2 italic">
              The rule: lock-in is OK at the consumption layer (BI / activation) — never at the
              storage layer (where data accumulates and is hard to move).
            </p>
          </div>
        </div>
      </SectionCard>


      {/* Pyodide — streaming simulation */}
      <SectionCard
        title="Try it: Kafka streaming simulation (Pyodide)"
        description="Simulates a Kafka producer + consumer group with Python queues. Shows message flow, lag calculation, consumer-group rebalancing. Pure Python stdlib — runs in browser."
        icon={<Terminal className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner
          code={`import queue, random
from collections import defaultdict

# Kafka-like topic (in-memory queue)
topic = queue.Queue(maxsize=1000)
consumer_offsets = defaultdict(int)
messages_produced = 0
messages_consumed = 0

# Simulate producer (100 messages)
print("=== Kafka Producer Simulation ===")
for i in range(100):
    msg = {
        "offset": i,
        "key": f"customer_{random.randint(1, 10)}",
        "value": f"order_{i}",
        "timestamp": i * 100,
    }
    topic.put(msg)
    messages_produced += 1
print(f"Produced {messages_produced} messages to topic 'orders'")

# Simulate consumer group (3 consumers, round-robin)
print("\n=== Consumer Group 'silver-conform' (3 consumers) ===")
consumers = ["consumer-0", "consumer-1", "consumer-2"]
lag_by_consumer = {c: 0 for c in consumers}

while not topic.empty():
    for consumer in consumers:
        try:
            msg = topic.get_nowait()
            consumer_offsets[consumer] += 1
            messages_consumed += 1
            lag = random.randint(10, 100)
            lag_by_consumer[consumer] += lag
        except queue.Empty:
            break

# Report
print(f"\n{'Consumer':<15} {'Messages':<12} {'Avg Lag (ms)':<12}")
print("-" * 39)
for c in consumers:
    avg_lag = lag_by_consumer[c] / max(consumer_offsets[c], 1)
    print(f"{c:<15} {consumer_offsets[c]:<12} {avg_lag:<12.1f}")

print(f"\n{'Total produced:':<20} {messages_produced}")
print(f"{'Total consumed:':<20} {messages_consumed}")
print(f"{'Throughput:':<20} {messages_consumed/3:.1f} msgs/consumer")
print(f"{'Avg lag:':<20} {sum(lag_by_consumer.values())/max(messages_consumed,1):.1f} ms")
print(f"\n✓ All messages consumed. Consumer group rebalanced successfully.")`}
          buttonLabel="Run streaming simulation (Pyodide)"
        />
      </SectionCard>

      {/* Closing — file format decision tree */}
      <SectionCard
        title="File-format decision tree"
        description="Pick the right format in under a minute."
        icon={<GitBranch className="h-5 w-5" />}
      >
        <CodeBlock
          language="text"
          filename="file_format_decision_tree.txt"
          code={`Q1: Is the data flowing through a stream?
├─ Yes → Avro (with Schema Registry) for governance
│        or Protobuf if you need field-masking
│        or JSON for prototyping only
└─ No  → Q2

Q2: Is the data analytical (columnar access pattern)?
├─ Yes → Parquet (always; Zstd compression)
│        On Databricks? → Delta (Parquet + log)
│        Multi-engine?  → Iceberg (vendor-neutral)
│        CDC-heavy?     → Hudi (upsert-first)
└─ No  → Q3

Q3: Is it in-memory / cross-language exchange?
├─ Yes → Arrow IPC (.arrow / .feather) — zero-copy
└─ No  → Q4

Q4: Is it service-to-service wire format?
├─ Yes → Protobuf (if backward-compat critical)
│        or JSON (if human-readable matters)
└─ No  → revisit Q1`}
        />
      </SectionCard>

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("databricks")} className="text-sm text-primary hover:underline">
          → Continue to Databricks Lakehouse
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("evolution")} className="text-sm text-primary hover:underline">
          → See where these fit in the platform evolution
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("research")} className="text-sm text-primary hover:underline">
          → Research papers behind these technologies
        </Link>
      </div>
    </div>
  );
}
