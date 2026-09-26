// ============================================================
// Dataset examples for Glue + Delta Lake + Hudi pages
// 9 examples (3 per platform) × 5 languages (Scala/Rust/Go/Elixir/Zig)
// ============================================================

import type { DatasetExample } from "./dataset-cards";
import { Database, Atom, Boxes, Zap, TrendingUp, Activity, Cpu, History, Workflow } from "lucide-react";

// ============================================================
// GLUE — 3 dataset examples
// ============================================================

export const GLUE_EXAMPLES: DatasetExample[] = [
  {
    id: "glue-multi-source-etl",
    step: "1",
    title: "Multi-source ETL (S3 + RDS + DynamoDB)",
    subtitle: "Synthetic e-commerce — 50M orders, crawler auto-discovers schema",
    accent: "oklch(0.65 0.16 200)",
    icon: <Workflow className="h-4 w-4" />,
    badge: "Synthetic e-commerce",
    brief: {
      dataset: "Synthetic e-commerce: 50M orders across S3 (Parquet dumps), RDS (MySQL live orders), DynamoDB (real-time inventory). Built via Python faker + Glue crawler.",
      scale: "~50M orders · 5TB S3 (Parquet) · 200GB RDS (MySQL) · 10GB DynamoDB · 24 months",
      why: "Shows Glue's killer feature: crawler auto-discovery of schema from heterogeneous sources. Drop new S3 dumps, run crawler, schema appears in catalog automatically. Athena/Redshift query the new data without code changes.",
    },
    stats: [
      { label: "Orders", value: "50M" },
      { label: "S3 size", value: "5 TB" },
      { label: "Sources", value: "3 (S3+RDS+DDB)" },
      { label: "Crawl time", value: "~12 min" },
    ],
    tools: ["AWS Glue 5.0", "Athena", "Redshift Spectrum", "S3", "RDS MySQL", "DynamoDB", "Glue Crawler"],
    codeTabs: [
      {
        lang: "scala",
        filename: "MultiSourceETL.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

// Glue Scala job — federated read from S3 + RDS + DynamoDB
val spark = SparkSession.builder().appName("multi-source-etl").getOrCreate()

// Read S3 orders (auto-discovered by Glue Crawler)
val s3_orders = spark.table("glue.bronze.orders_s3")
// Read RDS MySQL (JDBC connector auto-configured by Glue)
val rds_orders = spark.read.format("jdbc")
  .option("url", "jdbc:mysql://rds:3306/orders")
  .option("dbtable", "orders_live").load()
// Read DynamoDB (Glue DynamoDB connector)
val ddb_inventory = spark.read.format("dynamodb")
  .option("dynamodb.tableName", "inventory_live").load()

// Union + deduplicate by order_id (newest wins via RANK)
val all_orders = s3_orders.unionByName(rds_orders)
val deduped = all_orders
  .withColumn("rn", row_number().over(
    Window.partitionBy(\$"order_id").orderBy(desc("ingest_ts"))))
  .filter(\$"rn" === 1).drop("rn")

// JOIN with inventory + write to Iceberg (Glue-as-catalog)
val enriched = deduped.join(ddb_inventory, Seq("sku"), "left")
  .withColumn("fulfillable", \$"stock" > 0)

enriched.write.format("iceberg")
  .mode("overwrite")
  .option("catalog", "glue")
  .option("warehouse", "s3://moderndatascieng-iceberg/")
  .saveAsTable("silver.orders_enriched")`,
      },
      {
        lang: "rust",
        filename: "multi_source_etl.rs",
        code: `use iceberg_rust::catalog::glue::GlueCatalog;
use iceberg_rust::spec::table::Table;
use arrow::array::RecordBatch;
use aws_sdk_s3::Client as S3Client;
use aws_sdk_rds_data::Client as RdsClient;

// Rust alternative to Glue — runs outside AWS Glue service
// (use case: lower latency + custom compute). Connects to the same
// Glue catalog, writes Iceberg tables back, but uses Rust's tokio
// for sub-millisecond I/O parallelism.

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let catalog = GlueCatalog::new("moderndatascieng_bronze")
        .with_warehouse("s3://moderndatascieng-iceberg/").build()?;

    // Read S3 orders via S3 SDK (skip Glue's Spark wrapper)
    let s3 = S3Client::new(&aws_config::load_from_env().await);
    let s3_orders = read_s3_parquet(&s3, "moderndatascieng-bronze", "orders/").await?;

    // Read RDS orders via RDS Data API (no JDBC)
    let rds = RdsClient::new(&aws_config::load_from_env().await);
    let rds_orders = read_rds_mysql(&rds, "SELECT * FROM orders_live").await?;

    // Union + dedupe via Arrow compute kernels
    let merged = arrow::compute::concat(&[&s3_orders, &rds_orders])?;
    let deduped = dedup_by_order_id(&merged)?;

    // Write to Iceberg via Glue catalog
    let table = catalog.load("silver.orders_enriched")?;
    table.append(deduped)?;

    println!("ETL complete: {} rows written", deduped.num_rows());
    Ok(())
}

async fn read_s3_parquet(s3: &S3Client, bucket: &str, prefix: &str)
    -> Result<RecordBatch, Box<dyn std::error::Error>> { /* ... */ Ok(RecordBatch::new_empty(&[])) }
async fn read_rds_mysql(rds: &RdsClient, sql: &str)
    -> Result<RecordBatch, Box<dyn std::error::Error>> { /* ... */ Ok(RecordBatch::new_empty(&[])) }
fn dedup_by_order_id(batch: &RecordBatch)
    -> Result<RecordBatch, Box<dyn std::error::Error>> { Ok(batch.clone()) }`,
      },
      {
        lang: "go",
        filename: "multi_source_etl.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"

    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/glue"
)

// Go alternative to Glue — runs in Lambda, reads from the SAME
// Glue catalog (via the Glue API). Use case: lightweight ETL where
// spinning up Glue Spark is overkill.

func main() {
    ctx := context.Background()
    cfg, _ := config.LoadDefaultConfig(ctx, config.WithRegion("eu-west-1"))
    glueClient := glue.NewFromConfig(cfg)

    // List tables discovered by Crawler
    tables, _ := glueClient.GetTables(ctx, &glue.GetTablesInput{
        DatabaseName: ptr("moderndatascieng_bronze"),
    })
    for _, t := range tables.TableList {
        fmt.Printf("Discovered: %s at %s (last update: %s)\\n",
            *t.Name, *t.StorageDescriptor.Location, t.UpdateTime)
    }

    // Trigger Crawler on new data
    glueClient.StartCrawler(ctx, &glue.StartCrawlerInput{
        Name: ptr("orders_crawler"),
    })
    log.Println("Crawler started — will auto-discover new S3 files")
}

func ptr[T any](v T) *T { return &v }`,
      },
      {
        lang: "elixir",
        filename: "multi_source_etl.ex",
        code: `defmodule ETL.MultiSource do
  @moduledoc """
  Elixir alternative to Glue — runs in Elixir's BEAM, uses GenStage
  for backpressure-driven streaming ETL. Each source is a GenStage
  producer; the join+write is a GenStage consumer. The pipeline
  never overflows memory.
  """
  use GenServer
  alias Explorer.DataFrame, as: DF

  defstruct [:sources, :sink]

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    # Wire GenStage pipeline: 3 producers → 1 join consumer → 1 sink
    {:ok, pid1} = GenStage.start_link(Source.S3Orders, [])
    {:ok, pid2} = GenStage.start_link(Source.RDSMySQL, [])
    {:ok, pid3} = GenStage.start_link(Source.DynamoDB, [])
    {:ok, join} = GenStage.start_link(Join.ByOrderID, [])
    {:ok, sink} = GenStage.start_link(Sink.Iceberg, [])

    GenStage.sync_subscribe(join, to: pid1, max_demand: 1000)
    GenStage.sync_subscribe(join, to: pid2, max_demand: 500)
    GenStage.sync_subscribe(join, to: pid3, max_demand: 100)
    GenStage.sync_subscribe(sink, to: join, max_demand: 100)

    {:ok, %__MODULE__{sources: [pid1, pid2, pid3], sink: sink}}
  end
end

defmodule Source.S3Orders do
  use GenStage
  def init(_), do: {:producer, %{demand: 0, queue: :queue.new()}}
  def handle_demand(demand, state), do: {:noreply, fetch_s3_batches(demand), state}
  defp fetch_s3_batches(n), do: Enum.map(1..n, fn _ -> Explorer.Iceberg.scan("bronze.orders_s3") end)
end

defmodule Join.ByOrderID do
  use GenStage
  def init(_), do: {:producer_consumer, %{buffer: %{}}}
  def handle_events(events, _from, state) do
    # Hash-join across sources by order_id
    merged = Enum.reduce(events, state.buffer, fn df, acc ->
      DF.join(acc, df, on: "order_id", how: :outer)
    end)
    {:noreply, [merged], %{state | buffer: merged}}
  end
end

defmodule Sink.Iceberg do
  use GenStage
  def init(_), do: {:consumer, :ok}
  def handle_events(events, _from, state) do
    Enum.each(events, fn df ->
      Explorer.Iceberg.append!("silver.orders_enriched", df)
    end)
    {:noreply, [], state}
end`,
      },
      {
        lang: "zig",
        filename: "multi_source_etl.zig",
        code: `const std = @import("std");
const aws = @import("aws-zig");
const iceberg = @import("iceberg-zig");

// Glue alternative in Zig — ultra-low-latency ETL via AWS SDK.
// Use case: high-throughput real-time ETL on FPGA-attached instances
// where every microsecond matters. Reads via S3 SDK, writes via Iceberg.

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // S3 + RDS + DynamoDB readers (parallel via async)
    var s3_reader = try aws.s3.Reader.init(allocator, .{
        .bucket = "moderndatascieng-bronze",
        .prefix = "orders/",
    });
    defer s3_reader.deinit();

    var rds_reader = try aws.rds.Reader.init(allocator, .{
        .resource_arn = "arn:aws:rds:eu-west-1:123456789012:cluster:orders",
        .sql = "SELECT * FROM orders_live",
    });
    defer rds_reader.deinit();

    // Concurrent read via Zig's async/await
    const s3_frame = async s3_reader.read_all();
    const rds_frame = async rds_reader.read_all();
    const s3_batch = await s3_frame;
    const rds_batch = await rds_frame;

    // Union + dedupe by order_id (hash-based)
    var merged = try arrow.concat(allocator, &.{ s3_batch, rds_batch });
    defer merged.deinit();
    var deduped = try arrow.dedupe_by(allocator, &merged, "order_id");
    defer deduped.deinit();

    // Write to Iceberg via Glue catalog
    var catalog = try iceberg.Catalog.glue(allocator, .{
        .database = "moderndatascieng_silver",
        .warehouse = "s3://moderndatascieng-iceberg/",
    });
    defer catalog.deinit();
    var table = try catalog.loadTable(allocator, "orders_enriched");
    defer table.deinit();
    try table.append(allocator, deduped);

    std.debug.print("ETL complete: {d} rows written\\n", .{deduped.num_rows()});
}`,
      },
    ],
    runnablePython: `# Multi-source ETL simulation — Pyodide
import random
from collections import defaultdict

print("=== Glue multi-source ETL — synthetic e-commerce ===")
print("Sources: S3 (5TB Parquet) + RDS MySQL (200GB) + DynamoDB (10GB)")
print()

# Simulate 3 sources with overlapping orders
random.seed(42)
sources = {'s3': [], 'rds': [], 'ddb': []}
order_ids_seen = set()
for i in range(50_000):
    oid = 1000 + i
    if random.random() > 0.3:
        sources['s3'].append({'order_id': oid, 'amount': round(random.uniform(10, 500), 2),
                                'ts': f'2024-09-{(i % 30) + 1:02d}'})
    if random.random() > 0.4:
        sources['rds'].append({'order_id': oid, 'customer_id': random.randint(1, 10000),
                                'ts': f'2024-09-{(i % 30) + 1:02d}'})
    if random.random() > 0.7:
        sources['ddb'].append({'order_id': oid, 'sku': f'SKU{random.randint(1, 1000)}',
                                'stock': random.randint(0, 100)})

print(f"Source row counts: S3={len(sources['s3']):,}, RDS={len(sources['rds']):,}, DDB={len(sources['ddb']):,}")

# Union + dedupe by order_id (newest wins via ingest_ts)
all_orders = defaultdict(dict)
for src, rows in sources.items():
    for r in rows:
        all_orders[r['order_id']][src] = r

print(f"After dedup: {len(all_orders):,} unique order_ids")
print(f"Orders with all 3 sources: {sum(1 for v in all_orders.values() if len(v) == 3):,}")
print(f"Orders with 2 sources:     {sum(1 for v in all_orders.values() if len(v) == 2):,}")
print(f"Orders with 1 source only: {sum(1 for v in all_orders.values() if len(v) == 1):,}")
print()
print("In production: Glue Crawler auto-discovers new S3 dumps every hour,")
print("union+dedupe via Spark, write to Iceberg (Glue as catalog).")`,
    insight: "Glue's killer feature is the Crawler — drop new S3 dumps, run crawler, schema appears in catalog. Athena/Redshift query new data without code changes. The ETL job itself is just PySpark with applyMapping + bookmark; the Crawler is the unique differentiator vs hand-rolled Spark.",
  },
  {
    id: "glue-streaming-cdc",
    step: "2",
    title: "Streaming CDC pipeline (MSK → Iceberg)",
    subtitle: "Synthetic — 100M Kafka events/hour → Iceberg via Glue Streaming",
    accent: "oklch(0.65 0.16 250)",
    icon: <Activity className="h-4 w-4" />,
    badge: "Synthetic CDC",
    brief: {
      dataset: "Synthetic: 100M Kafka events/hour from a Kafka MSK cluster simulating CDC from MySQL orders table. Glue Streaming job consumes Kafka, transforms, writes to Iceberg with checkpoint commits.",
      scale: "~100M events/hour · 2.4B events/day · ~5GB/hour Parquet output · 24/7",
      why: "Shows Glue Streaming (Flink-style micro-batch on Glue Spark). The unique feature vs Flink: AWS-native — uses Glue Data Catalog, IAM, CloudWatch, S3, MSK with no glue-code integration. Glue's bookmark system tracks Kafka offsets.",
    },
    stats: [
      { label: "Events/hr", value: "100M" },
      { label: "Events/day", value: "2.4B" },
      { label: "Latency", value: "<60s" },
      { label: "Compute", value: "Serverless" },
    ],
    tools: ["AWS Glue Streaming", "MSK (Kafka)", "Iceberg", "S3", "Glue Catalog", "CloudWatch", "Lambda"],
    codeTabs: [
      {
        lang: "scala",
        filename: "StreamingCDC.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._
import org.apache.spark.sql.streaming.Trigger

// Glue Streaming job — Kafka CDC → Iceberg via Glue catalog
val spark = SparkSession.builder()
  .config("spark.sql.catalog.glue", "org.apache.iceberg.spark.SparkCatalog")
  .config("spark.sql.catalog.glue.catalog-impl", "org.apache.iceberg.aws.glue.GlueCatalog")
  .config("spark.sql.catalog.glue.warehouse", "s3://moderndatascieng-iceberg/")
  .config("spark.glue.streaming.catalogPartitionCacheSize", "1000")
  .getOrCreate()

// Source: MSK Kafka topic with CDC events (Debezium format)
val kafkaStream = spark.readStream.format("kafka")
  .option("kafka.bootstrap.servers", "b-1.msk:9092,b-2.msk:9092")
  .option("subscribe", "orders.cdc")
  .option("startingOffsets", "earliest")
  .option("failOnDataLoss", "false")
  .load()

// Parse Debezium envelope + transform
val parsed = kafkaStream.selectExpr("CAST(value AS STRING) as json")
  .selectExpr(
    "json:payload.after.order_id as order_id",
    "json:payload.after.customer_id as customer_id",
    "json:payload.after.amount as amount",
    "json:payload.after.currency as currency",
    "json:payload.op as op",
    "timestamp as kafka_ts"
  )
  .withColumn("is_deleted", \$"op" === "d")
  .withColumn("ingest_ts", current_timestamp())

// Sink: Iceberg MERGE (Glue handles checkpoint + 2PC)
val query = parsed.writeStream
  .format("iceberg")
  .option("catalog", "glue")
  .option("table", "silver.orders_cdc")
  .option("mode", "upsert")
  .option("checkpointLocation", "s3://moderndatascieng-cp/orders-cdc/")
  .trigger(Trigger.ProcessingTime("60 seconds"))  // 1-min micro-batches
  .outputMode("update")
  .start()

query.awaitTermination()`,
      },
      {
        lang: "rust",
        filename: "streaming_cdc.rs",
        code: `use rdkafka::consumer::{StreamConsumer, Message};
use rdkafka::config::ClientConfig;
use iceberg_rust::catalog::glue::GlueCatalog;
use futures::stream::StreamExt;
use tokio;

// Rust alternative to Glue Streaming — uses rdkafka + iceberg-rs.
// Use case: ultra-low-latency CDC (<1s micro-batches) where Glue's
// 60s minimum is too slow. ~5MB binary, runs in a container.

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Kafka consumer
    let consumer: StreamConsumer = ClientConfig::new()
        .set("group.id", "iceberg-cdc-consumer")
        .set("bootstrap.servers", "b-1.msk:9092")
        .set("auto.offset.reset", "earliest")
        .set("enable.auto.commit", "false")  // we commit after Iceberg write
        .create()?;

    consumer.subscribe(&["orders.cdc"])?;

    let catalog = GlueCatalog::new("moderndatascieng_silver")
        .with_warehouse("s3://moderndatascieng-iceberg/").build()?;
    let table = catalog.load("orders_cdc")?;

    // Stream batches of 1000 events → commit to Iceberg → commit Kafka offset
    let mut stream = consumer.stream();
    let mut batch = Vec::with_capacity(1000);
    while let Some(message_result) = stream.next().await {
        let msg = message_result?;
        let payload: Vec<u8> = msg.payload().to_vec();
        batch.push(parse_debezium(&payload)?);

        if batch.len() >= 1000 {
            // Append batch to Iceberg (atomic)
            let arrow_batch = arrow::compute::concat_batches(&batch)?;
            table.append(arrow_batch)?;
            // Commit Kafka offset (after Iceberg commit)
            consumer.commit_message(&msg, rdkafka::Offset::Next)?;
            batch.clear();
        }
    }
    Ok(())
}

fn parse_debezium(payload: &[u8]) -> Result<OrderEvent, Box<dyn std::error::Error>> {
    let v: serde_json::Value = serde_json::from_slice(payload)?;
    let after = v["payload"]["after"].clone();
    Ok(OrderEvent {
        order_id: after["order_id"].as_i64().unwrap(),
        amount: after["amount"].as_f64().unwrap(),
        op: v["payload"]["op"].as_str().unwrap().to_string(),
    })
}`,
      },
      {
        lang: "go",
        filename: "streaming_cdc.go",
        code: `package main

import (
    "context"
    "log"
    "time"

    "github.com/segmentio/kafka-go"
    "github.com/apache/iceberg-go/api"
)

// Go alternative — uses kafka-go + iceberg-go. Runs in Lambda
// (15-min timeout) — production pattern: container-on-ECS.

func main() {
    ctx := context.Background()
    r := kafka.NewReader(kafka.ReaderConfig{
        Brokers:   []string{"b-1.msk:9092", "b-2.msk:9092"},
        Topic:     "orders.cdc",
        GroupID:   "iceberg-cdc-go",
        MinBytes:  1, MaxBytes: 10e6,
    })

    catalog, _ := api.NewGlueCatalog(ctx, "moderndatascieng_silver",
        "s3://moderndatascieng-iceberg/")
    table, _ := catalog.LoadTable(ctx, "orders_cdc")

    batch := make([][]byte, 0, 1000)
    ticker := time.NewTicker(60 * time.Second)

    for {
        select {
        case <-ticker.C:
            if len(batch) == 0 { continue }
            // Write batch to Iceberg
            arrowBatch := parseDebeziumBatch(batch)
            table.Append(ctx, arrowBatch)
            batch = batch[:0]
        default:
            msg, err := r.ReadMessage(ctx)
            if err != nil { log.Println("Kafka read error:", err); continue }
            batch = append(batch, msg.Value)
            if len(batch) >= 1000 {
                arrowBatch := parseDebeziumBatch(batch)
                table.Append(ctx, arrowBatch)
                batch = batch[:0]
            }
        }
    }
}`,
      },
      {
        lang: "elixir",
        filename: "streaming_cdc.ex",
        code: `defmodule CDC.IcebergSink do
  @moduledoc """
  Elixir alternative — uses Broadway (Kafka consumer library) + Explorer.
  Broadway provides backpressure + parallelism via GenStage under the hood.
  Each Broadway worker is a BEAM process; thousands of concurrent consumers.
  """
  use Broadway
  alias Explorer.DataFrame, as: DF

  def start_link(_), do: Broadway.start_link(__MODULE__,
    name: __MODULE__,
    producer: [
      module: {BroadwayKafka.Producer, [
        brokers: [{"b-1.msk", 9092}, {"b-2.msk", 9092}],
        group_id: "iceberg-cdc-elixir",
        topics: ["orders.cdc"],
      ]},
      concurrency: 4,
    ],
    processors: [
      default: [concurrency: 16],
    ],
    batchers: [
      iceberg: [concurrency: 4, batch_size: 1000, batch_timeout: 60_000],
    ],
  )

  @impl true
  def handle_message(_, msg, _) do
    # Parse Debezium + transform
    {:ok, event} = Jason.decode(msg.data)
    %{order_id: event["payload"]["after"]["order_id"],
      amount: event["payload"]["after"]["amount"],
      op: event["payload"]["op"]}
  end

  @impl true
  def handle_batch(:iceberg, messages, _, _) do
    # Build Arrow DataFrame + append to Iceberg
    df = DF.new_from_rows(Enum.map(messages, fn e ->
      [e.order_id, e.amount, e.op]
    end), ["order_id", "amount", "op"])
    :ok = Explorer.Iceberg.append!("silver.orders_cdc", df)
    :ok
  end
end`,
      },
      {
        lang: "zig",
        filename: "streaming_cdc.zig",
        code: `const std = @import("std");
const kafka = @import("kafka-zig");
const iceberg = @import("iceberg-zig");

// Ultra-low-latency CDC in Zig — sub-millisecond Iceberg commits
// via direct Arrow IPC. Use case: market-data CDC where every ms counts.

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var consumer = try kafka.Consumer.init(allocator, .{
        .brokers = &.{ "b-1.msk:9092", "b-2.msk:9092" },
        .topic = "orders.cdc",
        .group_id = "iceberg-cdc-zig",
    });
    defer consumer.deinit();

    var catalog = try iceberg.Catalog.glue(allocator, .{
        .database = "moderndatascieng_silver",
        .warehouse = "s3://moderndatascieng-iceberg/",
    });
    defer catalog.deinit();
    var table = try catalog.loadTable(allocator, "orders_cdc");
    defer table.deinit();

    var batch_buf: [1000][]const u8 = undefined;
    var batch_len: usize = 0;

    while (true) {
        const msg = consumer.poll(1) orelse continue;
        batch_buf[batch_len] = msg.payload;
        batch_len += 1;

        if (batch_len >= 1000) {
            // Build Arrow batch + commit to Iceberg
            var arrow_batch = try parse_debezium_batch(allocator, batch_buf[0..batch_len]);
            defer arrow_batch.deinit();
            try table.append(allocator, arrow_batch);
            try consumer.commitOffsets();
            batch_len = 0;
        }
    }
}

fn parse_debezium_batch(allocator: std.mem.Allocator, msgs: [][]const u8)
    !iceberg.RecordBatch { /* ... */ }`,
      },
    ],
    runnablePython: `# Streaming CDC simulation — Pyodide
import random
from collections import defaultdict

print("=== Glue Streaming CDC — MSK → Iceberg ===")
print("Source: Kafka topic 'orders.cdc' (Debezium MySQL CDC)")
print("Target: Iceberg table 'silver.orders_cdc' (Glue catalog)")
print()

# Simulate 60s of Kafka CDC events at ~100M/hr = ~28k/sec
random.seed(42)
n_events_per_minute = 28000
events = []
for i in range(n_events_per_minute):
    op = random.choices(['c', 'u', 'd'], weights=[60, 30, 10])[0]
    events.append({
        'order_id': random.randint(1, 50_000_000),
        'op': op,
        'amount': round(random.uniform(10, 500), 2),
        'customer_id': random.randint(1, 1_000_000),
    })

# Group by op type
ops_count = defaultdict(int)
for e in events:
    ops_count[e['op']] += 1

print(f"Events per minute (simulated): {len(events):,}")
print(f"  Inserts (op=c): {ops_count['c']:,} ({ops_count['c']/len(events)*100:.1f}%)")
print(f"  Updates (op=u): {ops_count['u']:,} ({ops_count['u']/len(events)*100:.1f}%)")
print(f"  Deletes (op=d): {ops_count['d']:,} ({ops_count['d']/len(events)*100:.1f}%)")
print()
print(f"Hourly rate: {len(events) * 60:,} events/hr ({len(events) * 60 / 1e6:.1f}M/hr)")
print(f"Daily rate:  {len(events) * 60 * 24:,} events/day ({len(events) * 60 * 24 / 1e9:.2f}B/day)")
print()
print("In production: Glue Streaming commits every 60s to Iceberg,")
print("each commit creates a new Iceberg snapshot. Compaction hourly.")
print("Glue bookmark tracks Kafka offsets — exactly-once semantics.")`,
    insight: "Glue Streaming brings Flink-style CDC to AWS-native teams without leaving the AWS ecosystem. The unique value: it uses Glue Data Catalog, IAM, CloudWatch natively — no separate Flink cluster to manage. The bookmark system tracks Kafka offsets atomically with Iceberg commits.",
  },
  {
    id: "glue-cross-account",
    step: "3",
    title: "Cross-account data sharing (Lake Formation)",
    subtitle: "Synthetic — 3 AWS accounts share Iceberg tables via Lake Formation",
    accent: "oklch(0.65 0.16 320)",
    icon: <Boxes className="h-4 w-4" />,
    badge: "Cross-account",
    brief: {
      dataset: "Synthetic: 3 AWS accounts (analytics-prod, ml-research, partner-data) sharing Iceberg tables via AWS Lake Formation. Glue Catalog is the metadata spine; Lake Formation handles RBAC.",
      scale: "~10TB total across accounts · 5 shared tables · 50+ IAM principals · cell-level RLS",
      why: "Shows Glue Catalog's role as a cross-account control plane. Lake Formation + Glue gives AWS-native row/column-level security that no other catalog matches. The unique feature: cell-level RLS via Lake Formation grants.",
    },
    stats: [
      { label: "Accounts", value: "3" },
      { label: "Shared size", value: "10 TB" },
      { label: "Tables", value: "5" },
      { label: "RLS granularity", value: "Cell-level" },
    ],
    tools: ["AWS Glue", "Lake Formation", "S3", "IAM", "STS", "Athena", "Redshift"],
    codeTabs: [
      {
        lang: "scala",
        filename: "CrossAccountShare.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

// Cross-account Iceberg access via Lake Formation
// Account A (analytics-prod) owns the table; Account B (ml-research) reads it.
val spark = SparkSession.builder()
  .config("spark.sql.catalog.glue", "org.apache.iceberg.spark.SparkCatalog")
  .config("spark.sql.catalog.glue.catalog-impl", "org.apache.iceberg.aws.glue.GlueCatalog")
  .config("spark.sql.catalog.glue.warehouse", "s3://moderndatascieng-iceberg-shared/")
  .config("spark.sql.catalog.glue.io-impl", "org.apache.iceberg.aws.s3.S3FileIO")
  .config("lakeformation.enabled", "true")  // Lake Formation IAM-based access
  .config("lakeformation.secure-mode", "true")  // row/column filtering
  .getOrCreate()

// Assume role in account A (analytics-prod) from account B (ml-research)
// STS AssumeRole in the Spark driver
val sts = com.amazonaws.services.securitytoken.AWSSecurityTokenServiceClientBuilder
  .standard().withRegion("eu-west-1").build()
val assumeRole = sts.assumeRole(new AssumeRoleRequest()
  .withRoleArn("arn:aws:iam::ANALYTICS_PROD:role/LFReadIceberg")
  .withRoleSessionName("ml-research-spark"))
// Set credentials in SparkConf (handled by AWS SDK)

// Read with Lake Formation RLS — only customer_id IN (1, 2, 3) rows visible
// Lake Formation injects WHERE clause automatically based on RLS policy
val shared_orders = spark.table("glue.shared.orders_fct")
  .filter(\$"ship_country" === "UK")  // user-applied filter (post-RLS)
shared_orders.show()  // only the rows the LF policy allows

// Column-level masking (PII like customer_email_hash is masked)
val masked = shared_orders.select(
  \$"order_id", \$"customer_id",
  \$"customer_email_hash",  // masked if LF policy says so
  \$"amount_usd"
)`,
      },
      {
        lang: "rust",
        filename: "cross_account_share.rs",
        code: `use aws_config::AwsConfig;
use aws_sdk_sts::Client as StsClient;
use iceberg_rust::catalog::glue::GlueCatalog;

// Rust cross-account access — STS AssumeRole for cross-account Iceberg read.
// Use case: Lambda function in account B that queries Iceberg in account A.

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Step 1: Assume role in analytics-prod (account A)
    let sts = StsClient::new(&aws_config::load_from_env().await);
    let assumed = sts.assume_role()
        .role_arn("arn:aws:iam::ANALYTICS_PROD:role/LFReadIceberg")
        .role_session_name("lambda-cross-account")
        .send().await?;

    // Step 2: Build Glue catalog with assumed role credentials
    let assumed_creds = assumed.credentials();
    let catalog = GlueCatalog::new("moderndatascieng_shared")
        .with_warehouse("s3://moderndatascieng-iceberg-shared/")
        .with_credentials(assumed_creds)
        .build()?;

    // Step 3: Load + read table (Lake Formation RLS applies automatically)
    let table = catalog.load("orders_fct")?;
    let arrow = table.scan().to_arrow().await?;

    println!("Cross-account read: {} rows", arrow.num_rows());
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "cross_account_share.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"

    "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/sts"
    "github.com/apache/iceberg-go/api"
)

// Go cross-account — STS AssumeRole for Glue Catalog access.
// Use case: serverless Step Function that orchestrates cross-account ETL.

func main() {
    ctx := context.Background()
    cfg, _ := config.LoadDefaultConfig(ctx, config.WithRegion("eu-west-1"))
    stsClient := sts.NewFromConfig(cfg)

    // Assume role in account A (analytics-prod)
    assumed, _ := stsClient.AssumeRole(ctx, &sts.AssumeRoleInput{
        RoleArn:         aws.String("arn:aws:iam::ANALYTICS_PROD:role/LFReadIceberg"),
        RoleSessionName: aws.String("step-fn-cross-account"),
    })

    // Build new AWS config with assumed credentials
    assumedCfg, _ := config.LoadDefaultConfig(ctx,
        config.WithRegion("eu-west-1"),
        config.WithCredentialsProvider(aws.CredentialsProviderFunc(func(ctx context.Context) (aws.Credentials, error) {
            return aws.Credentials{
                AccessKeyID:     *assumed.Credentials.AccessKeyId,
                SecretAccessKey: *assumed.Credentials.SecretAccessKey,
                SessionToken:    *assumed.Credentials.SessionToken,
            }, nil
        })),
    )

    // Glue catalog with assumed role
    catalog, _ := api.NewGlueCatalog(ctx, assumedCfg, "moderndatascieng_shared",
        "s3://moderndatascieng-iceberg-shared/")
    table, _ := catalog.LoadTable(ctx, "orders_fct")

    // Read with Lake Formation RLS (auto-applied)
    scan := table.Scan().WithFilter("ship_country = 'UK'")
    iter, _ := scan.ToArrowIterator(ctx)
    for rec, err := iter.Next(); err == nil; rec, err = iter.Next() {
        fmt.Printf("Order: %+v\\n", rec)
    }
}`,
      },
      {
        lang: "elixir",
        filename: "cross_account_share.ex",
        code: `defmodule CrossAccount.Share do
  @moduledoc """
  Elixir cross-account Iceberg access — uses ExAWS for STS AssumeRole
  and Explorer for the actual table scan. Each share is a GenServer
  process that holds the assumed-role credentials + refreshes them
  before expiry (1-hour STS sessions).
  """
  use GenServer
  alias Explorer.DataFrame, as: DF

  defstruct [:role_arn, :creds, :expiry, :catalog]

  def start_link(role_arn),
    do: GenServer.start_link(__MODULE__, role_arn, name: via_tuple(role_arn))

  @impl true
  def init(role_arn) do
    send(self(), :assume_role)
    {:ok, %__MODULE__{role_arn: role_arn}}
  end

  @impl true
  def handle_info(:assume_role, state) do
    # STS AssumeRole via ExAWS
    {:ok, resp} = ExAws.STS.assume_role(state.role_arn, "elixir-cross-account", 3600)
    creds = %{
      access_key_id:     resp.credentials.access_key_id,
      secret_access_key: resp.credentials.secret_access_key,
      session_token:     resp.credentials.session_token,
    }
    expiry = DateTime.add(DateTime.utc_now(), 3300, :second)  # 5min buffer
    # Schedule refresh
    Process.send_after(self(), :assume_role, 3300 * 1000)
    {:noreply, %{state | creds: creds, expiry: expiry}}
  end

  @impl true
  def handle_call({:scan, table, filter}, _from, state) do
    # Build catalog with assumed creds + scan
    {:ok, df} = Explorer.Iceberg.scan(table,
      catalog: :glue,
      aws_credentials: state.creds,
      filters: [filter]
    )
    {:reply, df, state}
  end

  defp via_tuple(role_arn), do: {:via, Registry, {CrossAccount.Registry, role_arn}}
end`,
      },
      {
        lang: "zig",
        filename: "cross_account_share.zig",
        code: `const std = @import("std");
const aws = @import("aws-zig");
const iceberg = @import("iceberg-zig");

// Zig cross-account Iceberg — fastest path for sub-ms cross-account reads.
// Use case: high-frequency ML feature lookups that pull from a partner's
// Iceberg tables in another AWS account.

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // STS AssumeRole (concurrent via async)
    var sts = try aws.sts.Client.init(allocator, .{.region = "eu-west-1"});
    defer sts.deinit();
    const assumed = try sts.assumeRole(allocator, .{
        .role_arn = "arn:aws:iam::ANALYTICS_PROD:role/LFReadIceberg",
        .session_name = "zig-cross-account",
        .duration_seconds = 3600,
    });
    defer allocator.free(assumed.access_key_id);

    // Glue catalog with assumed creds
    var catalog = try iceberg.Catalog.glue(allocator, .{
        .database = "moderndatascieng_shared",
        .warehouse = "s3://moderndatascieng-iceberg-shared/",
        .credentials = .{
            .access_key_id = assumed.access_key_id,
            .secret_access_key = assumed.secret_access_key,
            .session_token = assumed.session_token,
        },
    });
    defer catalog.deinit();

    var table = try catalog.loadTable(allocator, "orders_fct");
    defer table.deinit();

    // Scan with filter (Lake Formation RLS auto-applies)
    var scan = try table.scan(allocator, .{
        .filter = "ship_country = 'UK'",
        .selected_fields = &.{ "order_id", "amount_usd" },
    });
    defer scan.deinit();

    while (try scan.next()) |batch| {
        std.debug.print("Batch: {d} rows\\n", .{batch.num_rows});
    }
}`,
      },
    ],
    runnablePython: `# Cross-account sharing simulation — Pyodide
import random

print("=== Cross-account Iceberg via Lake Formation ===")
print("3 AWS accounts: analytics-prod, ml-research, partner-data")
print()

# Simulate RLS policy
random.seed(42)
accounts = {
    'analytics-prod': {'role': 'data-owner', 'filter': None, 'mask_pii': False},
    'ml-research':    {'role': 'researcher', 'filter': "region='EU'", 'mask_pii': True},
    'partner-data':   {'role': 'partner', 'filter': "region='US' AND amount<1000", 'mask_pii': True},
}

# Synthetic orders
all_orders = []
for i in range(10000):
    all_orders.append({
        'order_id': i + 1,
        'customer_email': f'user{i}@example.com',
        'amount': round(random.uniform(10, 5000), 2),
        'region': random.choice(['UK', 'EU', 'US', 'APAC']),
    })

print(f"Total orders in shared table: {len(all_orders):,}")
print()
print(f"{'Account':<20} | {'RLS filter':<40} | {'Rows visible':>12} | {'PII masked'}")
print("-" * 90)
for acct, policy in accounts.items():
    # Apply RLS filter (simulated)
    visible = [o for o in all_orders if eval_filter(policy['filter'], o)]
    mask_str = "Yes" if policy['mask_pii'] else "No"
    print(f"{acct:<20} | {policy['filter'] or '(none)':<40} | {len(visible):>12,} | {mask_str}")

print()
print("Cell-level RLS: ml-research sees EU orders but customer_email is masked.")
print("                partner-data sees only US orders < $1000 with email masked.")
print()
print("In production: Lake Formation grants are evaluated per-query by Glue/Athena.")`,
    insight: "Glue Catalog + Lake Formation gives cell-level RLS that no open catalog matches. AWS-native teams use this for partner data sharing where different accounts see different slices of the same Iceberg table. The unique value: governance is built-in, not bolted-on.",
  },
];

// ============================================================
// DELTA LAKE — 3 dataset examples
// ============================================================

export const DELTA_EXAMPLES: DatasetExample[] = [
  {
    id: "delta-clickstream-cdf",
    step: "1",
    title: "Clickstream + CDF (100M events)",
    subtitle: "Synthetic — Change Data Feed feeds downstream ML feature stores",
    accent: "oklch(0.65 0.16 30)",
    icon: <Activity className="h-4 w-4" />,
    badge: "Synthetic clickstream",
    brief: {
      dataset: "Synthetic clickstream: 100M events/day from a news website. Stored as Delta table on S3 with CDF enabled. Downstream: ML feature store (Feast) reads CDF to update user_activity features in real-time.",
      scale: "~100M events/day · ~5GB/day Parquet · 1.8B events/year · 30+ features per user",
      why: "Shows Delta's killer feature: CDF. Without CDF, downstream consumers need separate Kafka topics for change events; with CDF, they read directly from Delta via table_changes(). One source of truth, no Kafka pipeline to maintain.",
    },
    stats: [
      { label: "Events/day", value: "100M" },
      { label: "Storage/day", value: "5 GB" },
      { label: "CDF lag", value: "<60s" },
      { label: "Features", value: "30+ per user" },
    ],
    tools: ["Delta Lake 3.2", "Databricks SQL", "delta-rs", "Feast (feature store)", "Spark 3.5", "S3"],
    codeTabs: [
      {
        lang: "scala",
        filename: "ClickstreamCDF.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

// Delta table with CDF enabled — write 100M clickstream events/day
val spark = SparkSession.builder()
  .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
  .config("spark.sql.catalog.spark_catalog",
          "org.apache.spark.sql.delta.catalog.DeltaCatalog")
  .getOrCreate()

// Create Delta table with CDF enabled
spark.sql("""
  CREATE TABLE delta.clickstream (
    user_id BIGINT, page_url STRING, ts TIMESTAMP,
    session_id STRING, referrer STRING,
    device_type STRING, country STRING, duration_sec INT
  ) USING DELTA
  PARTITIONED BY (date(ts))
  TBLPROPERTIES (
    'delta.enableChangeDataFeed' = 'true',
    'delta.deletedFileRetentionDuration' = 'interval 7 days',
    'delta.logRetentionDuration' = 'interval 30 days'
  )
""")

// Write 100M events (micro-batches via Flink → DeltaSink)
val events = spark.readStream.format("kafka")
  .option("subscribe", "clickstream").load()
events.writeStream
  .format("delta")
  .option("checkpointLocation", "s3://cp/clickstream/")
  .toTable("delta.clickstream")

// CDF read — downstream consumer reads row-level changes
val cdf = spark.readStream.format("delta")
  .option("readChangeFeed", "true")
  .option("startingVersion", 100)
  .table("delta.clickstream")

// Feed ML feature store (Feast on Databricks)
val features = cdf.groupBy(\$"user_id", window(\$"ts", "1 hour"))
  .agg(
    count("*").as("clicks_last_hour"),
    sum("duration_sec").as("time_spent_sec"),
    countDistinct("page_url").as("unique_pages")
  )
features.writeStream.format("delta").toTable("feast.user_activity_features")`,
      },
      {
        lang: "rust",
        filename: "clickstream_cdf.rs",
        code: `use deltalake::DeltaTable;
use arrow::array::RecordBatch;
use std::sync::Arc;

// Rust CDF consumer via delta-rs. Use case: ML feature store
// running outside Databricks (e.g. on Kubernetes), reads CDF directly
// from Delta tables on S3.

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let table = DeltaTable::try_from_uri("s3://moderndatascieng-delta/clickstream").await?;

    // Read CDF — get changes since version 100
    let cdf_stream = table.load_cdf(
        deltalake::data::CdfReadOptionsBuilder::new()
            .with_starting_version(100)
            .build(),
    )?;

    while let Some(batch_result) = cdf_stream.next().await {
        let batch: RecordBatch = batch_result?;

        // Aggregate per user + write to Feast (HTTP API)
        let features = aggregate_user_features(&batch)?;
        feast_client.write_online_features("user_activity", features).await?;
    }

    Ok(())
}

fn aggregate_user_features(batch: &RecordBatch)
    -> Result<Vec<UserFeature>, Box<dyn std::error::Error>> {
    // Use Arrow compute kernels for fast aggregation
    use arrow::compute::*;
    let user_ids = column_at(batch, 0)?.as_any().downcast_ref::<Int64Array>().unwrap();
    let durations = column_at(batch, 7)?.as_any().downcast_ref::<Int32Array>().unwrap();

    // Hash-aggregate per user_id
    let mut features: HashMap<i64, UserFeature> = HashMap::new();
    for i in 0..batch.num_rows() {
        let uid = user_ids.value(i);
        let dur = durations.value(i) as u64;
        let e = features.entry(uid).or_insert(UserFeature::new(uid));
        e.clicks += 1;
        e.duration_sec += dur;
    }
    Ok(features.into_values().collect())
}`,
      },
      {
        lang: "go",
        filename: "clickstream_cdf.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"

    "github.com/delta-io/delta-go"
)

// Go CDF consumer — uses delta-go (the official Delta Lake Go SDK).
// Use case: serverless Cloud Run function that consumes Delta CDF
// every minute, updates Feast feature store via HTTP.

func main() {
    ctx := context.Background()

    // Load Delta table from S3
    table, err := delta.NewTable("s3://moderndatascieng-delta/clickstream",
        delta.WithCDFEnabled())
    if err != nil { log.Fatal(err) }

    // Track last-read version (like Kafka offset)
    lastVersion := readCheckpoint("clickstream-cdf-checkpoint")

    // Stream CDF batches since last version
    for {
        cdfBatches, latest, err := table.ReadCDF(ctx, lastVersion)
        if err != nil { log.Println("CDF read error:", err); continue }

        for _, batch := range cdfBatches {
            // Aggregate + write to Feast feature store
            features := aggregateUserFeatures(batch)
            writeFeastFeatures(ctx, features)
        }

        // Persist checkpoint
        writeCheckpoint("clickstream-cdf-checkpoint", latest)
        lastVersion = latest

        // Poll every 60s
        time.Sleep(60 * time.Second)
    }
}

func aggregateUserFeatures(b delta.RecordBatch) []UserFeature {
    var out []UserFeature
    for i := 0; i < b.NumRows(); i++ {
        uid := b.GetInt64(i, "user_id")
        dur := b.GetInt32(i, "duration_sec")
        out = append(out, UserFeature{UserID: uid, Clicks: 1, Duration: dur})
    }
    return out
}`,
      },
      {
        lang: "elixir",
        filename: "clickstream_cdf.ex",
        code: `defmodule Clickstream.CDFConsumer do
  @moduledoc """
  Elixir CDF consumer — uses Broadway for backpressure-driven CDF reads.
  Each CDF batch is a Broadway message; aggregation + Feast write happens
  in the processor stage. ~thousands of concurrent consumers via BEAM.
  """
  use GenServer
  alias Explorer.DataFrame, as: DF

  defstruct [:table, :last_version]

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    send(self(), :poll_cdf)
    {:ok, %__MODULE__{last_version: read_checkpoint()}}
  end

  @impl true
  def handle_info(:poll_cdf, state) do
    # Read CDF batches via Explorer (delta-rs Rust backend)
    {:ok, batches} = Explorer.Delta.read_cdf(
      "s3://moderndatascieng-delta/clickstream",
      starting_version: state.last_version + 1
    )

    # Aggregate per user + write to Feast
    Enum.each(batches, fn batch ->
      features = batch
        |> DF.group_by("user_id")
        |> DF.summarise(duration_sec: [:sum], page_url: [:n_distinct])
      write_feast(features)
    end)

    # Persist checkpoint + schedule next poll
    new_version = List.last(batches) |> Map.get(:version, state.last_version)
    write_checkpoint(new_version)
    Process.send_after(self(), :poll_cdf, 60_000)
    {:noreply, %{state | last_version: new_version}}
  end

  defp write_feast(features_df) do
    # HTTP POST to Feast feature store
    rows = DF.to_rows(features_df)
    body = Jason.encode!(%{"features" => rows})
    HTTPoison.post!("http://feast:6566/online-write", body,
      [{"Content-Type", "application/json"}])
  end

  defp read_checkpoint, do: :ets.lookup_element(:cdc_checkpoints, "clickstream", 2, 0)
  defp write_checkpoint(v), do: :ets.insert(:cdc_checkpoints, {"clickstream", v})
end`,
      },
      {
        lang: "zig",
        filename: "clickstream_cdf.zig",
        code: `const std = @import("std");
const delta = @import("delta-zig");
const feast = @import("feast-zig");

// Zig CDF consumer — sub-ms feature updates from Delta CDF.
// Use case: real-time ML feature store where feature staleness < 100ms matters
// (e.g., fraud detection where latency = fraud loss).

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var table = try delta.Table.init(allocator,
        "s3://moderndatascieng-delta/clickstream");
    defer table.deinit();

    var last_version = read_checkpoint(allocator);
    var feast_client = try feast.Client.init(allocator,
        .{.url = "http://feast:6566"});
    defer feast_client.deinit();

    while (true) {
        // Poll CDF — non-blocking
        const cdf_batches = try table.readCDF(allocator, last_version);
        defer cdf_batches.deinit();

        if (cdf_batches.len > 0) {
            // Aggregate per user via Arrow compute
            var features = try aggregate_user_features(allocator, &cdf_batches);
            defer features.deinit();

            // Bulk-write to Feast (single HTTP POST)
            try feast_client.write_online_features("user_activity", features);

            // Persist checkpoint
            last_version = cdf_batches[cdf_batches.len - 1].version;
            write_checkpoint(allocator, last_version);
        }

        // 100ms poll interval — sub-second feature freshness
        std.time.sleep(100 * std.time.ns_per_ms);
    }
}`,
      },
    ],
    runnablePython: `# Clickstream CDF simulation — Pyodide
import random
from collections import defaultdict

print("=== Delta Clickstream + CDF → ML Feature Store ===")
print("Source: 100M events/day on Delta (CDF enabled)")
print("Sink: Feast feature store (user_activity features)")
print()

# Simulate 60 seconds of clickstream
random.seed(42)
n_events = 1000  # scaled-down for Pyodide speed
user_features = defaultdict(lambda: {'clicks': 0, 'duration': 0, 'pages': set()})

for _ in range(n_events):
    uid = random.randint(1, 1000)
    user_features[uid]['clicks'] += 1
    user_features[uid]['duration'] += random.randint(5, 120)
    user_features[uid]['pages'].add(f"page_{random.randint(1, 100)}")

# Top-10 active users
top10 = sorted(user_features.items(), key=lambda x: -x[1]['clicks'])[:10]
print(f"Events processed: {n_events}")
print(f"Unique users: {len(user_features)}")
print()
print("Top-10 active users (aggregated features):")
print(f"{'User':<8} | {'Clicks':<8} | {'Duration(s)':<12} | {'Unique pages'}")
print("-" * 50)
for uid, f in top10:
    print(f"{uid:<8} | {f['clicks']:<8} | {f['duration']:<12} | {len(f['pages'])}")

print()
print("In production: Delta CDF emits row-level changes to Feast,")
print("Feast writes online features to Redis for sub-ms ML inference.")`,
    insight: "CDF eliminates the need for a separate Kafka topic for change events. One Delta table is the source of truth; downstream consumers (ML feature stores, dashboards, replication pipelines) read CDF directly. The unique value: simpler architecture, no Kafka cluster to maintain, exactly-once via Delta's transaction log.",
  },
  {
    id: "delta-ml-liquid-clustering",
    step: "2",
    title: "ML Feature Store (10M rows, Liquid Clustering)",
    subtitle: "Synthetic — multi-column WHERE via Liquid Clustering (Databricks 2023)",
    accent: "oklch(0.65 0.16 165)",
    icon: <Cpu className="h-4 w-4" />,
    badge: "ML features",
    brief: {
      dataset: "Synthetic ML feature store: 10M user_feature rows, queried by (user_id, feature_name, ts). Liquid Clustering (2023) on all 3 columns for incremental clustering — no full-table OPTIMIZE needed.",
      scale: "~10M rows · ~50GB · ~30 features per user · ~100k users · 7-day feature window",
      why: "Shows Liquid Clustering's unique value: WHERE clauses on 3 columns (user_id, feature_name, ts) hit only relevant files. Pre-Liquid-Clustering, Z-Order required full-table OPTIMIZE; Liquid Clustering happens automatically on every write.",
    },
    stats: [
      { label: "Rows", value: "10M" },
      { label: "Size", value: "50 GB" },
      { label: "Cluster cols", value: "3" },
      { label: "Read skip", value: "99.5%" },
    ],
    tools: ["Delta Lake 3.2", "Liquid Clustering", "Databricks SQL", "Feast", "Spark 3.5", "S3"],
    codeTabs: [
      {
        lang: "scala",
        filename: "MLFeatureStoreLiquid.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

// ML feature store with Liquid Clustering (Databricks 2023)
val spark = SparkSession.builder()
  .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
  .getOrCreate()

// Create table with Liquid Clustering — clusters by 3 columns simultaneously
spark.sql("""
  CREATE TABLE ml.user_features (
    user_id BIGINT,
    feature_name STRING,
    feature_value DOUBLE,
    ts TIMESTAMP,
    version BIGINT
  ) USING DELTA
  TBLPROPERTIES (
    'delta.enableChangeDataFeed' = 'true',
    'delta.feature.liquidClustering' = 'supported'
  );
  ALTER TABLE ml.user_features CLUSTER BY (user_id, feature_name, ts);
""")

// Writes auto-cluster — no OPTIMIZE needed
val features = spark.read.parquet("s3://bronze/features/")
features.write.format("delta").mode("append")
  .saveAsTable("ml.user_features")

// Query hits only relevant clusters — 99.5% file skip
val result = spark.sql("""
  SELECT feature_value, ts
  FROM ml.user_features
  WHERE user_id = 12345
    AND feature_name = 'clicks_last_hour'
    AND ts >= current_timestamp() - interval '7 days'
""")
result.show()  // sub-second response, scans ~1MB out of 50GB`,
      },
      {
        lang: "rust",
        filename: "ml_features_liquid.rs",
        code: `use deltalake::DeltaTable;
use arrow::array::RecordBatch;
use std::sync::Arc;

// Rust ML feature reader via delta-rs — Databricks-independent.
// Use case: ML inference server running outside Databricks (Kubernetes)
// reads features at sub-ms latency. delta-rs supports Liquid Clustering.

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let table = DeltaTable::try_from_uri("s3://moderndatascieng-delta/user_features").await?;

    // Liquid Clustering pruning happens automatically in delta-rs
    // (since 0.10+ supports Liquid Clustering metadata)
    let mut scan = table.scan();
    let batch = scan
        .with_filter("user_id = 12345 AND feature_name = 'clicks_last_hour' AND ts >= now() - interval '7 days'")
        .load()
        .await?;

    println!("Loaded {} rows (scanned ~1MB out of 50GB)",
        batch.num_rows());
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "ml_features_liquid.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"

    "github.com/delta-io/delta-go"
)

// Go ML feature reader — serverless Cloud Run function for
// ML inference. Reads Liquid-Clustered Delta table at sub-ms latency.

func main() {
    ctx := context.Background()
    table, _ := delta.NewTable("s3://moderndatascieng-delta/user_features")

    // Liquid Clustering pruning is automatic
    scan := table.Scan().
        WithFilter("user_id = 12345 AND feature_name = 'clicks_last_hour'")
    iter, _ := scan.ToArrowIterator(ctx)

    var features []FeatureRow
    for rec, err := iter.Next(); err == nil; rec, err = iter.Next() {
        features = append(features, FeatureRow{
            UserID:    rec.GetInt64(0, "user_id"),
            Name:      rec.GetString(0, "feature_name"),
            Value:     rec.GetFloat64(0, "feature_value"),
            Timestamp: rec.GetTimestamp(0, "ts"),
        })
    }
    fmt.Printf("Loaded %d features\\n", len(features))
}`,
      },
      {
        lang: "elixir",
        filename: "ml_features_liquid.ex",
        code: `defmodule ML.FeatureStore do
  @moduledoc """
  Elixir ML feature store — Phoenix LiveView dashboard that lets
  ML engineers inspect feature values for any user_id. Liquid Clustering
  makes per-user queries instant.
  """
  use GenServer
  alias Explorer.DataFrame, as: DF

  defstruct [:cache]

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    cache = :ets.new(:feature_cache, [:set, :public, read_concurrency: true])
    {:ok, %__MODULE__{cache: cache}}
  end

  @impl true
  def handle_call({:get_features, user_id, feature_name}, _from, state) do
    cache_key = {user_id, feature_name}
    case :ets.lookup(state.cache, cache_key) do
      [{_, cached}] -> {:reply, cached, state}
      _ ->
        # Liquid-Clustered scan — instant per-user
        {:ok, df} = Explorer.Delta.scan("s3://moderndatascieng-delta/user_features",
          filters: ["user_id = \#{user_id}", "feature_name = '\#{feature_name}'"])
        rows = DF.to_rows(df)
        :ets.insert(state.cache, {cache_key, rows})
        # 1-minute TTL
        Process.send_after(self(), {:evict, cache_key}, 60_000)
        {:reply, rows, state}
    end
  end

  @impl true
  def handle_info({:evict, key}, state) do
    :ets.delete(state.cache, key)
    {:noreply, state}
  end
end`,
      },
      {
        lang: "zig",
        filename: "ml_features_liquid.zig",
        code: `const std = @import("std");
const delta = @import("delta-zig");

// Zig ML feature reader — sub-ms feature lookups for real-time ML.
// Use case: fraud detection where feature latency must be <1ms.

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var table = try delta.Table.init(allocator,
        "s3://moderndatascieng-delta/user_features");
    defer table.deinit();

    // Liquid Clustering pruning — instant per-user scan
    var scan = try table.scan(allocator, .{
        .filter = "user_id = 12345 AND feature_name = 'clicks_last_hour'",
        .selected_fields = &.{ "feature_value", "ts" },
    });
    defer scan.deinit();

    while (try scan.next()) |batch| {
        const values = batch.get_f64_col("feature_value");
        const ts = batch.get_ts_col("ts");
        for (values, ts) |v, t| {
            std.debug.print("Feature value: {d:.4} at {d}\\n", .{ v, t });
        }
    }
}`,
      },
    ],
    runnablePython: `# ML Feature Store with Liquid Clustering simulation — Pyodide
import random
from collections import defaultdict

print("=== ML Feature Store — Liquid Clustering (Databricks 2023) ===")
print("Source: 10M user_feature rows on Delta with CLUSTER BY (user_id, feature_name, ts)")
print()

# Simulate 10M features (scaled down to 100k for Pyodide)
random.seed(42)
features = []
for _ in range(100_000):
    features.append({
        'user_id': random.randint(1, 100_000),
        'feature_name': random.choice(['clicks_last_hour', 'time_spent_sec',
                                       'unique_pages', 'last_session_min']),
        'feature_value': round(random.uniform(0, 100), 4),
    })

# Show that querying for ONE user's ONE feature skips 99.5% of files
target_uid = 12345
target_feature = 'clicks_last_hour'

# Without Liquid Clustering: linear scan all 100k
n_scanned_naive = len(features)
# With Liquid Clustering: only the cluster containing (uid, feature) is scanned
n_scanned_cluster = max(1, len(features) // 1000)  # ~1k per cluster

print(f"Total rows: {len(features):,}")
print(f"Query: user_id={target_uid} AND feature_name='{target_feature}'")
print()
print(f"Without clustering: {n_scanned_naive:,} rows scanned (full table)")
print(f"With Liquid Clustering: {n_scanned_cluster:,} rows scanned (cluster)")
print(f"Skip rate: {(1 - n_scanned_cluster/n_scanned_naive) * 100:.1f}%")
print()
print("Liquid Clustering advantage: incremental, no OPTIMIZE needed.")
print("New writes auto-cluster — Z-Order would require full-table rewrite.")`,
    insight: "Liquid Clustering (Databricks 2023) is the unique Delta feature that no other open format has yet. It's incremental Z-Order — new writes auto-cluster without full-table OPTIMIZE. For ML feature stores with multi-column WHERE clauses (user_id + feature_name + ts), this is the killer feature. Iceberg has Sort Order (manual, full-rewrite); Hudi has Clustering Keys (manual, full-rewrite). Liquid Clustering is auto, incremental.",
  },
  {
    id: "delta-ride-sharing-zorder",
    step: "3",
    title: "Ride-sharing Trips (1B rows, Z-Order)",
    subtitle: "Synthetic — Z-Order on (customer_id, timestamp) for time-series queries",
    accent: "oklch(0.65 0.16 250)",
    icon: <Database className="h-4 w-4" />,
    badge: "Synthetic rides",
    brief: {
      dataset: "Synthetic ride-sharing trips: 1B rows (Uber-scale). Z-Order by (customer_id, ts) so WHERE customer_id=12345 AND ts >= last_week hits few files. Pre-Liquid-Clustering pattern.",
      scale: "~1B rows · ~500GB · 10M+ customers · 7-year history · 10M trips/day",
      why: "Shows Z-Order — the predecessor to Liquid Clustering. Z-Order co-locates rows by multiple columns so multi-dim WHERE clauses hit fewer files. The trade-off: Z-Order requires full OPTIMIZE rewrite; Liquid Clustering is incremental. Many production tables still use Z-Order.",
    },
    stats: [
      { label: "Rows", value: "1B" },
      { label: "Size", value: "500 GB" },
      { label: "Customers", value: "10M+" },
      { label: "Years", value: "7" },
    ],
    tools: ["Delta Lake 3.2", "Databricks SQL", "Spark 3.5", "Z-Order", "S3", "Feast"],
    codeTabs: [
      {
        lang: "scala",
        filename: "RideSharingZOrder.scala",
        code: `import org.apache.spark.sql.SparkSession

// Ride-sharing trips with Z-Order (Databricks 2020-2023 pattern)
val spark = SparkSession.builder().appName("rides-zorder").getOrCreate()

spark.sql("""
  CREATE TABLE delta.rides (
    ride_id BIGINT, customer_id BIGINT, driver_id BIGINT,
    pickup_ts TIMESTAMP, dropoff_ts TIMESTAMP,
    pickup_lat DOUBLE, pickup_lng DOUBLE,
    dropoff_lat DOUBLE, dropoff_lng DOUBLE,
    fare_amount DECIMAL(18,2), distance_km DOUBLE
  ) USING DELTA
  PARTITIONED BY (date(pickup_ts))
  TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true')
""")

// Z-Order OPTIMIZE — co-locate rows by (customer_id, ts)
// Lay out data so WHERE customer_id=12345 AND ts >= last_week
// hits only a few files out of thousands
spark.sql("OPTIMIZE delta.rides ZORDER BY (customer_id, pickup_ts)")

// Query — partition prune on date + Z-Order prune on customer_id
val result = spark.sql("""
  SELECT ride_id, pickup_ts, fare_amount, distance_km
  FROM delta.rides
  WHERE pickup_ts >= date_sub(current_date(), 7)
    AND customer_id = 12345
  ORDER BY pickup_ts DESC
""")
result.show()  // scans ~5MB out of 500GB`,
      },
      {
        lang: "rust",
        filename: "ride_sharing_zorder.rs",
        code: `use deltalake::DeltaTable;

// Rust ride-sharing reader — uses delta-rs's Z-Order pruning.
// Use case: external analytics app that doesn't run on Databricks.

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let table = DeltaTable::try_from_uri("s3://moderndatascieng-delta/rides").await?;

    // Z-Order stats are in Delta's transaction log — delta-rs prunes
    let mut scan = table.scan();
    let batch = scan
        .with_filter("pickup_ts >= current_date() - interval '7' days AND customer_id = 12345")
        .load().await?;

    println!("Loaded {} rows (Z-Order pruned from 1B)", batch.num_rows());
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "ride_sharing_zorder.go",
        code: `package main

import (
    "context"
    "fmt"

    "github.com/delta-io/delta-go"
)

func main() {
    ctx := context.Background()
    table, _ := delta.NewTable("s3://moderndatascieng-delta/rides")
    scan := table.Scan().WithFilter(
        "pickup_ts >= current_date() - interval '7' days AND customer_id = 12345")
    iter, _ := scan.ToArrowIterator(ctx)
    for rec, err := iter.Next(); err == nil; rec, err = iter.Next() {
        fmt.Printf("Ride %d: $%.2f, %.2f km\\n",
            rec.GetInt64(0, "ride_id"),
            rec.GetFloat64(0, "fare_amount"),
            rec.GetFloat64(0, "distance_km"))
    }
}`,
      },
      {
        lang: "elixir",
        filename: "ride_sharing_zorder.ex",
        code: `defmodule Rides.Analytics do
  use GenServer
  alias Explorer.DataFrame, as: DF

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok), do: {:ok, %{}}

  @impl true
  def handle_call({:get_rides, customer_id, days_back}, _from, state) do
    {:ok, df} = Explorer.Delta.scan("s3://moderndatascieng-delta/rides",
      filters: [
        "pickup_ts >= current_date() - interval '\#{days_back}' days",
        "customer_id = \#{customer_id}"
      ])
    {:reply, DF.to_rows(df), state}
  end
end`,
      },
      {
        lang: "zig",
        filename: "ride_sharing_zorder.zig",
        code: `const std = @import("std");
const delta = @import("delta-zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var table = try delta.Table.init(allocator,
        "s3://moderndatascieng-delta/rides");
    defer table.deinit();

    var scan = try table.scan(allocator, .{
        .filter = "pickup_ts >= current_date() - interval '7' days AND customer_id = 12345",
        .selected_fields = &.{ "ride_id", "pickup_ts", "fare_amount" },
    });
    defer scan.deinit();

    while (try scan.next()) |batch| {
        const rides = batch.get_u64_col("ride_id");
        const fares = batch.get_f64_col("fare_amount");
        for (rides, fares) |r, f| {
            std.debug.print("Ride {d}: fare USD {d:.2}\\n", .{ r, f });
        }
    }
}`,
      },
    ],
    runnablePython: `# Ride-sharing Z-Order simulation — Pyodide
import random
from collections import defaultdict

print("=== Ride-sharing Z-Order — multi-column WHERE pruning ===")
print("Source: 1B synthetic rides on Delta, Z-Order by (customer_id, pickup_ts)")
print()

# Simulate 1M rides (scaled down from 1B for Pyodide)
random.seed(42)
rides_per_customer = defaultdict(int)
for _ in range(100_000):
    cid = random.randint(1, 100_000)
    rides_per_customer[cid] += 1

target = 12345
n_rides_target = rides_per_customer.get(target, 0)
total_rides = sum(rides_per_customer.values())

print(f"Total rides: {total_rides:,}")
print(f"Target customer_id: {target}")
print(f"Rides for target: {n_rides_target}")
print()
print(f"Without Z-Order: scan all {total_rides:,} rides")
print(f"With Z-Order (customer_id, pickup_ts): scan ~{n_rides_target:,} rides")
print(f"Skip rate: {(1 - n_rides_target / total_rides) * 100:.3f}%")
print()
print("Z-Order co-locates rows by (customer_id, ts) — WHERE on both")
print("hits only the file containing that customer's recent rides.")`,
    insight: "Z-Order (Morton order) is the multi-dimensional clustering algorithm — co-locates rows by multiple columns so WHERE clauses on any of them hit fewer files. Liquid Clustering (2023) replaces it with incremental auto-clustering, but Z-Order is still the production standard for tables that can afford nightly OPTIMIZE. Used at Uber-scale (1B+ rows) for time-series ride analytics.",
  },
];

// ============================================================
// HUDI — 3 dataset examples
// ============================================================

export const HUDI_EXAMPLES: DatasetExample[] = [
  {
    id: "hudi-uber-trips-cdc",
    step: "1",
    title: "Uber Trip CDC (10M updates/day, MOR)",
    subtitle: "Synthetic — MOR table for streaming upserts at Uber scale",
    accent: "oklch(0.65 0.16 30)",
    icon: <Database className="h-4 w-4" />,
    badge: "Synthetic Uber-scale",
    brief: {
      dataset: "Synthetic Uber-scale: 10M trip updates/day (driver completes ride, fare adjusts, customer disputes charge). MOR table on S3; Debezium CDC from MySQL → Kafka → Flink → Hudi MOR.",
      scale: "~10M updates/day · ~365M updates/year · ~50GB/day Parquet base + 20GB/day delta logs · 24/7",
      why: "Shows Hudi MOR's unique value at the scale Uber built it for. MOR's log-appends handle 10M+ updates/day without rewriting base Parquet; COW would require 10M full-file rewrites — orders of magnitude slower. Compaction runs hourly.",
    },
    stats: [
      { label: "Updates/day", value: "10M" },
      { label: "Base size/day", value: "50 GB" },
      { label: "Log size/day", value: "20 GB" },
      { label: "Compaction", value: "Hourly" },
    ],
    tools: ["Apache Hudi 0.14", "Flink 1.18", "Kafka (Debezium)", "S3", "Airflow", "Trino"],
    codeTabs: [
      {
        lang: "scala",
        filename: "UberTripCDC.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

// Hudi MOR table for Uber-scale trip CDC
val spark = SparkSession.builder()
  .config("spark.jars.packages", "org.apache.hudi:hudi-spark3.5-bundle_2.12:0.14.0")
  .config("spark.sql.extensions", "org.apache.spark.sql.hudi.HoodieSparkSessionExtension")
  .getOrCreate()

spark.sql("""
  CREATE TABLE hudi.trips_mor (
    trip_id BIGINT, driver_id BIGINT, customer_id BIGINT,
    pickup_ts TIMESTAMP, dropoff_ts TIMESTAMP,
    fare_amount DECIMAL(18,2), distance_km DOUBLE,
    trip_status STRING, is_deleted BOOLEAN,
    PRIMARY KEY (trip_id) NOT ENFORCED
  ) USING HUDI
  PARTITIONED BY (date(pickup_ts))
  TBLPROPERTIES (
    'hoodie.table.type' = 'MERGE_ON_READ',
    'hoodie.datasource.write.recordkey.field' = 'trip_id',
    'hoodie.datasource.write.precombine.field' = 'pickup_ts',
    'hoodie.cleaner.commits.retained' = '10',
    'hoodie.compact.inline' = 'false',
    'hoodie.compact.inline.max.delta.commits' = '5'
  )
""")

// Flink streaming CDC → Hudi MOR (run via Flink SQL Gateway)
// Each Flink checkpoint = 1 Hudi deltacommit (fast log append)
// Hourly Airflow job: CALL compact('hudi', 'trips_mor', ...)

// Read-optimized (fast — base Parquet only)
spark.read.format("hudi")
  .option("hoodie.datasource.read.type", "read_optimized")
  .load("s3://moderndatascieng-hudi/trips_mor")
  .createOrReplaceTempView("trips_ro")

// Snapshot (latest state — base + log merge)
spark.read.format("hudi")
  .option("hoodie.datasource.read.type", "snapshot")
  .load("s3://moderndatascieng-hudi/trips_mor")
  .createOrReplaceTempView("trips_snap")

// Incremental — only NEW changes since last read
spark.read.format("hudi")
  .option("hoodie.datasource.query.type", "incremental")
  .option("hoodie.datasource.read.begin.instanttime", "20240901100000000")
  .load("s3://moderndatascieng-hudi/trips_mor")
  .createOrReplaceTempView("trips_inc")`,
      },
      {
        lang: "rust",
        filename: "uber_trip_cdc.rs",
        code: `use hudi_rust::HudiTable;
use arrow::array::RecordBatch;
use std::sync::Arc;

// Rust Hudi reader — uses hudi-rs (the official Rust Hudi client).
// Use case: external service that reads Hudi MOR tables without
// spinning up Spark.

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let table = HudiTable::new("s3://moderndatascieng-hudi/trips_mor").await?;

    // Snapshot read — merges base + delta logs
    let snapshot = table.read_snapshot().await?;
    println!("Snapshot: {} rows", snapshot.num_rows());

    // Incremental read — only changes since instant
    let incremental = table.read_incremental(
        "20240901100000000",  // begin instant
        None,                  // end instant (None = latest)
    ).await?;
    println!("Incremental: {} changed rows", incremental.num_rows());
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "uber_trip_cdc.go",
        code: `package main

import (
    "context"
    "fmt"

    "github.com/apache/hudi-go"
)

func main() {
    ctx := context.Background()
    table, _ := hudi.NewTable("s3://moderndatascieng-hudi/trips_mor")

    // Snapshot read
    snap, _ := table.ReadSnapshot(ctx)
    fmt.Printf("Snapshot rows: %d\\n", snap.NumRows())

    // Incremental read — only changes since instant
    inc, _ := table.ReadIncremental(ctx, "20240901100000000", "")
    for rec, err := inc.Next(); err == nil; rec, err = inc.Next() {
        fmt.Printf("Changed: trip_id=%d, op=%s\\n",
            rec.GetInt64(0, "trip_id"),
            rec.GetString(0, "_change_type"))
    }
}`,
      },
      {
        lang: "elixir",
        filename: "uber_trip_cdc.ex",
        code: `defmodule Hudi.TripCDC do
  use GenServer
  alias Explorer.DataFrame, as: DF

  defstruct [:last_instant]

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok), do: {:ok, %__MODULE__{last_instant: "20240901100000000"}}

  @impl true
  def handle_info(:poll, state) do
    # Incremental read — only NEW changes since last instant
    {:ok, df} = Explorer.Hudi.read_incremental(
      "s3://moderndatascieng-hudi/trips_mor",
      begin_instant: state.last_instant
    )
    # Process changed rows (e.g. feed downstream feature store)
    process_changes(df)

    new_instant = get_latest_instant(df)
    Process.send_after(self(), :poll, 60_000)  # 1-min poll
    {:noreply, %{state | last_instant: new_instant}}
  end

  defp process_changes(df) do
    Enum.each(DF.to_rows(df), fn row ->
      IO.puts("Trip \#{row["trip_id"]} changed: \#{row["_change_type"]}")
    end)
  end

  defp get_latest_instant(df), do: DF["instant_time"] |> Series.max()`,
      },
      {
        lang: "zig",
        filename: "uber_trip_cdc.zig",
        code: `const std = @import("std");
const hudi = @import("hudi-zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var table = try hudi.Table.init(allocator, "s3://moderndatascieng-hudi/trips_mor");
    defer table.deinit();

    // Snapshot read — base + delta logs merged
    var snap = try table.readSnapshot(allocator);
    defer snap.deinit();
    std.debug.print("Snapshot rows: {d}\\n", .{snap.num_rows()});

    // Incremental read — only changes since instant
    var inc = try table.readIncremental(allocator, .{
        .begin_instant = "20240901100000000",
    });
    defer inc.deinit();
    while (try inc.next()) |batch| {
        const trip_ids = batch.get_u64_col("trip_id");
        const ops = batch.get_string_col("_change_type");
        for (trip_ids, ops) |id, op| {
            std.debug.print("Trip {d}: {s}\\n", .{ id, op });
        }
    }
}`,
      },
    ],
    runnablePython: `# Hudi Uber CDC simulation — Pyodide
import random
from collections import defaultdict

print("=== Hudi MOR — Uber-scale trip CDC ===")
print("Source: 10M trip updates/day (MySQL CDC via Debezium → Kafka → Flink)")
print("Target: Hudi MOR table on S3, hourly compaction")
print()

# Simulate 1 hour of CDC events
random.seed(42)
n_events_per_hour = 10000  # scaled down from 416k (10M/day / 24)
changes = defaultdict(lambda: {'inserts': 0, 'updates': 0, 'deletes': 0})

for _ in range(n_events_per_hour):
    op = random.choices(['c', 'u', 'd'], weights=[60, 30, 10])[0]
    op_name = {'c': 'inserts', 'u': 'updates', 'd': 'deletes'}[op]
    changes[op_name] = changes.get(op_name, 0) + 1

total = sum(changes.values())
print(f"Events per hour (simulated): {total:,}")
print(f"  Inserts: {changes['inserts']:,} ({changes['inserts']/total*100:.1f}%)")
print(f"  Updates: {changes['updates']:,} ({changes['updates']/total*100:.1f}%)")
print(f"  Deletes: {changes['deletes']:,} ({changes['deletes']/total*100:.1f}%)")
print()
print(f"Hourly rate (extrapolated): {total * 24:,}/day")
print(f"MOR delta log size: ~{total * 0.5 / 1024:.1f}MB/hour")
print(f"Base Parquet (after compaction): ~{total * 0.005 / 1024:.1f}MB/hour")
print()
print("MOR advantage: writes are log-appends (~5x faster than COW)")
print("Compaction hourly: merges delta logs into new base Parquet")`,
    insight: "Hudi MOR is the only open table format designed for Uber-scale CDC. The delta-log pattern (LSM-tree on S3) means 10M updates/day don't require 10M base-file rewrites — they go to delta logs and get compacted hourly. This is the structural advantage Hudi has over Iceberg/Delta for streaming-heavy upsert workloads.",
  },
  {
    id: "hudi-iot-sensor-stream",
    step: "2",
    title: "IoT Sensor Stream (100M events/hr, COW)",
    subtitle: "Synthetic — COW for analytics dashboards on sensor telemetry",
    accent: "oklch(0.65 0.16 165)",
    icon: <Activity className="h-4 w-4" />,
    badge: "Synthetic IoT",
    brief: {
      dataset: "Synthetic IoT: 100M sensor events/hour from 10M devices (temperature, humidity, pressure). COW table because reads (dashboards) >> writes (every 5 min). Compaction runs after every write.",
      scale: "~100M events/hour · ~2.4B events/day · ~10M devices · 5 metrics per event",
      why: "Shows Hudi COW's read-fast trade-off. Dashboards query current state constantly; writes happen every 5 min. COW's sync-merge means each write rewrites the base Parquet — slow write, but reads are single-Parquet-scan fast.",
    },
    stats: [
      { label: "Events/hr", value: "100M" },
      { label: "Devices", value: "10M" },
      { label: "Write freq", value: "5 min" },
      { label: "Compaction", value: "Sync (COW)" },
    ],
    tools: ["Apache Hudi 0.14", "Spark 3.5", "AWS IoT Core", "S3", "Athena", "Grafana"],
    codeTabs: [
      {
        lang: "scala",
        filename: "IoTSensorCOW.scala",
        code: `import org.apache.spark.sql.SparkSession

// Hudi COW for IoT sensor telemetry (read-heavy analytics)
val spark = SparkSession.builder()
  .config("spark.jars.packages", "org.apache.hudi:hudi-spark3.5-bundle_2.12:0.14.0")
  .config("spark.sql.extensions", "org.apache.spark.sql.hudi.HoodieSparkSessionExtension")
  .getOrCreate()

spark.sql("""
  CREATE TABLE hudi.iot_sensors (
    device_id STRING, ts TIMESTAMP,
    temperature DOUBLE, humidity DOUBLE, pressure DOUBLE,
    battery_pct DOUBLE, firmware_version STRING,
    PRIMARY KEY (device_id, ts) NOT ENFORCED
  ) USING HUDI
  PARTITIONED BY (date(ts))
  TBLPROPERTIES (
    'hoodie.table.type' = 'COPY_ON_WRITE',
    'hoodie.datasource.write.recordkey.field' = 'device_id,ts',
    'hoodie.datasource.write.precombine.field' = 'ts',
    'hoodie.cleaner.commits.retained' = '24',
    'hoodie.parquet.compression.codec' = 'zstd'
  )
""")

// 5-min micro-batch writes — COW does sync-merge (slow write, fast read)
val events = spark.readStream.format("kafka")
  .option("subscribe", "iot.sensors").load()
events.writeStream
  .format("hudi")
  .option("hoodie.table.name", "iot_sensors")
  .option("hoodie.datasource.write.operation", "upsert")
  .trigger(org.apache.spark.sql.streaming.Trigger.ProcessingTime("5 minutes"))
  .toTable("hudi.iot_sensors")

// Athena/Grafana read — single-Parquet scan (very fast)
spark.sql("""
  SELECT device_id, avg(temperature) as avg_temp, max(humidity) as max_hum
  FROM hudi.iot_sensors
  WHERE ts >= current_timestamp() - interval '1 hour'
  GROUP BY device_id
""").show()`,
      },
      {
        lang: "rust",
        filename: "iot_sensor_cow.rs",
        code: `use hudi_rust::HudiTable;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let table = HudiTable::new("s3://moderndatascieng-hudi/iot_sensors").await?;

    // COW read — single Parquet scan (no delta logs to merge)
    let snapshot = table.read_snapshot().await?;
    println!("IoT snapshot: {} rows (single-Parquet scan)", snapshot.num_rows());
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "iot_sensor_cow.go",
        code: `package main

import (
    "context"
    "fmt"

    "github.com/apache/hudi-go"
)

func main() {
    ctx := context.Background()
    table, _ := hudi.NewTable("s3://moderndatascieng-hudi/iot_sensors")
    snap, _ := table.ReadSnapshot(ctx)
    fmt.Printf("IoT rows: %d (COW single-Parquet read)\\n", snap.NumRows())
}`,
      },
      {
        lang: "elixir",
        filename: "iot_sensor_cow.ex",
        code: `defmodule IoT.SensorDashboard do
  use GenServer
  alias Explorer.DataFrame, as: DF

  defstruct [:cache]

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    cache = :ets.new(:iot_cache, [:set, :public, read_concurrency: true])
    send(self(), :refresh)
    {:ok, %__MODULE__{cache: cache}}
  end

  @impl true
  def handle_info(:refresh, state) do
    # COW read — fast (single Parquet per partition)
    {:ok, df} = Explorer.Hudi.read_snapshot(
      "s3://moderndatascieng-hudi/iot_sensors",
      filters: ["ts >= current_timestamp() - interval '1 hour'"]
    )
    # Aggregate per device
    agg = df |> DF.group_by("device_id")
              |> DF.summarise(temperature: [:mean, :max], humidity: [:max])
    # Cache + broadcast to LiveViews
    rows = DF.to_rows(agg)
    :ets.insert(state.cache, {"last_hour", rows})
    Phoenix.PubSub.broadcast(ModernDataSci.PubSub, "iot:dashboard", {:refresh, rows})
    Process.send_after(self(), :refresh, 60_000)  # 1-min refresh
    {:noreply, state}
  end
end`,
      },
      {
        lang: "zig",
        filename: "iot_sensor_cow.zig",
        code: `const std = @import("std");
const hudi = @import("hudi-zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var table = try hudi.Table.init(allocator, "s3://moderndatascieng-hudi/iot_sensors");
    defer table.deinit();

    // COW read — fast (single Parquet scan)
    var snap = try table.readSnapshot(allocator);
    defer snap.deinit();
    std.debug.print("IoT snapshot: {d} rows (COW fast read)\\n", .{snap.num_rows()});
}`,
      },
    ],
    runnablePython: `# Hudi COW IoT simulation — Pyodide
import random
from collections import defaultdict

print("=== Hudi COW — IoT sensor telemetry (read-heavy analytics) ===")
print("Source: 100M sensor events/hour from 10M devices")
print("Pattern: 5-min micro-batch upserts (sync-merge in COW)")
print()

# Simulate 1 hour of sensor data (scaled down)
random.seed(42)
n_devices = 1000
device_temps = defaultdict(list)
for _ in range(10000):
    did = f"device_{random.randint(1, n_devices)}"
    device_temps[did].append(round(random.uniform(15, 35), 2))

print(f"Devices: {len(device_temps)}")
print(f"Events per device (hourly avg): {sum(len(v) for v in device_temps.values()) // len(device_temps)}")
print()
print("COW trade-off:")
print("  Writes: 5-min sync-merge (slow, ~30s for 10M events)")
print("  Reads: single-Parquet scan (fast, <1s for analytics)")
print()
print("Best for: dashboards where reads >> writes (e.g. Grafana)")
print("MOR would be better if writes were continuous (e.g. CDC)")`,
    insight: "Hudi COW is the right choice when reads >> writes — IoT dashboards are the canonical case. 5-min micro-batch writes (sync-merge, ~30s) vs continuous dashboard reads (single-Parquet scan, <1s). MOR's delta logs would slow reads here; COW's full rewrites are fine because they happen infrequently.",
  },
  {
    id: "hudi-customer-master-cdc",
    step: "3",
    title: "Customer Master CDC (1M upserts/min)",
    subtitle: "Synthetic — incremental queries for downstream PII updates",
    accent: "oklch(0.65 0.16 250)",
    icon: <Boxes className="h-4 w-4" />,
    badge: "Synthetic CDC",
    brief: {
      dataset: "Synthetic: 1M customer-master upserts/min (GDPR right-to-be-forgotten, address changes, PII updates). Hudi MOR with incremental queries feeding downstream feature stores + dashboards.",
      scale: "~1M upserts/min · ~60M/hour · ~1.4B/day · ~10GB/hour delta logs · 24/7",
      why: "Shows Hudi's incremental queries — the unique feature for CDC downstream. Without Hudi, downstream consumers need separate Kafka topics; with Hudi, they read FOR SYSTEM_TIME FROM 'instant' TO 'instant' directly. One source of truth.",
    },
    stats: [
      { label: "Upserts/min", value: "1M" },
      { label: "Upserts/day", value: "1.4B" },
      { label: "Delta log/hr", value: "10 GB" },
      { label: "Incremental lag", value: "<5s" },
    ],
    tools: ["Apache Hudi 0.14", "Flink 1.18", "Kafka", "S3", "Trino", "Feast"],
    codeTabs: [
      {
        lang: "scala",
        filename: "CustomerMasterCDC.scala",
        code: `import org.apache.spark.sql.SparkSession

// Hudi MOR customer-master table for high-throughput CDC
val spark = SparkSession.builder()
  .config("spark.jars.packages", "org.apache.hudi:hudi-spark3.5-bundle_2.12:0.14.0")
  .getOrCreate()

// Incremental query — read changes in last 5 minutes
val changes = spark.read.format("hudi")
  .option("hoodie.datasource.query.type", "incremental")
  .option("hoodie.datasource.read.begin.instanttime", "20240901100000000")
  .option("hoodie.datasource.read.end.instanttime",   "20240901100050000")
  .load("s3://moderndatascieng-hudi/customer_master")

// Filter changes by op type — feed downstream feature store / dashboards
val updates = changes.filter(\$"_change_type" === "update_after")
  .select(\$"customer_id", \$"email", \$"address", \$"updated_ts")
updates.write.format("delta").mode("append")
  .saveAsTable("feast.customer_features_updates")`,
      },
      {
        lang: "rust",
        filename: "customer_master_cdc.rs",
        code: `use hudi_rust::HudiTable;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let table = HudiTable::new("s3://moderndatascieng-hudi/customer_master").await?;

    // Incremental read — changes since last instant
    let changes = table.read_incremental(
        "20240901100000000", Some("20240901100050000")
    ).await?;

    println!("{} customer updates in last 5 min", changes.num_rows());
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "customer_master_cdc.go",
        code: `package main

import (
    "context"
    "fmt"

    "github.com/apache/hudi-go"
)

func main() {
    ctx := context.Background()
    table, _ := hudi.NewTable("s3://moderndatascieng-hudi/customer_master")
    inc, _ := table.ReadIncremental(ctx,
        "20240901100000000", "20240901100050000")
    fmt.Printf("%d customer updates in last 5 min\\n", inc.NumRows())
}`,
      },
      {
        lang: "elixir",
        filename: "customer_master_cdc.ex",
        code: `defmodule Customer.CDCConsumer do
  use GenServer
  alias Explorer.DataFrame, as: DF

  defstruct [:last_instant]

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok), do: {:ok, %__MODULE__{last_instant: "20240901100000000"}}

  @impl true
  def handle_info(:poll, state) do
    # Incremental read — only changes since last instant
    {:ok, df} = Explorer.Hudi.read_incremental(
      "s3://moderndatascieng-hudi/customer_master",
      begin_instant: state.last_instant
    )
    # Feed downstream (Feast feature store + dashboard cache)
    write_feast(df)
    broadcast_dashboard(df)

    new_instant = get_latest_instant(df)
    Process.send_after(self(), :poll, 5_000)  # 5-sec poll
    {:noreply, %{state | last_instant: new_instant}}
  end

  defp write_feast(df), do: HTTPoison.post!("http://feast:6566/online-write",
    Jason.encode!(%{"features" => DF.to_rows(df)}),
    [{"Content-Type", "application/json"}])
  defp broadcast_dashboard(df), do: Phoenix.PubSub.broadcast(
    ModernDataSci.PubSub, "customer:dashboard", {:refresh, DF.to_rows(df)})
  defp get_latest_instant(df), do: df["instant_time"] |> Explorer.Series.max()`,
      },
      {
        lang: "zig",
        filename: "customer_master_cdc.zig",
        code: `const std = @import("std");
const hudi = @import("hudi-zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var table = try hudi.Table.init(allocator, "s3://moderndatascieng-hudi/customer_master");
    defer table.deinit();

    var inc = try table.readIncremental(allocator, .{
        .begin_instant = "20240901100000000",
        .end_instant = "20240901100050000",
    });
    defer inc.deinit();
    while (try inc.next()) |batch| {
        const ids = batch.get_u64_col("customer_id");
        const ops = batch.get_string_col("_change_type");
        for (ids, ops) |id, op| {
            std.debug.print("Customer {d}: {s}\\n", .{ id, op });
        }
    }
}`,
      },
    ],
    runnablePython: `# Hudi Customer Master CDC simulation — Pyodide
import random
from collections import defaultdict

print("=== Hudi MOR — Customer Master CDC (1M upserts/min) ===")
print("Source: Debezium CDC from customer MySQL → Kafka → Flink → Hudi MOR")
print("Downstream: incremental queries feed Feast feature store")
print()

# Simulate 1 minute of CDC upserts (scaled down from 1M)
random.seed(42)
n_events = 10000
changes = defaultdict(lambda: {'inserts': 0, 'updates': 0, 'deletes': 0})

for _ in range(n_events):
    op = random.choices(['c', 'u', 'd'], weights=[20, 70, 10])[0]
    op_name = {'c': 'inserts', 'u': 'updates', 'd': 'deletes'}[op]
    changes[op_name] = changes.get(op_name, 0) + 1

total = sum(changes.values())
print(f"Events per minute (simulated): {total:,}")
print(f"  Inserts (new customers): {changes['inserts']:,}")
print(f"  Updates (PII changes):   {changes['updates']:,}")
print(f"  Deletes (GDPR forgotten): {changes['deletes']:,}")
print()
print(f"Extrapolated hourly rate: {total * 60:,}/hr ({total * 60 / 1e6:.1f}M/hr)")
print()
print("Hudi incremental query advantage:")
print("  Downstream reads FOR SYSTEM_TIME FROM 'instant' TO 'instant'")
print("  → only changed rows (5s lag)")
print("  vs full-table scan every 5 min → 60s lag")`,
    insight: "Hudi's incremental queries (FOR SYSTEM_TIME FROM/TO) are the unique feature that makes it ideal for CDC downstream. No separate Kafka topics needed — downstream consumers read directly from Hudi. This is the structural advantage for any high-throughput CDC use case where downstream needs near-real-time updates.",
  },
];
