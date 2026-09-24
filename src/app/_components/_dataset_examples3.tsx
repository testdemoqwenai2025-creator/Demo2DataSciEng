// ============================================================
// Dataset examples for Data Lakehouse + Catalogs pages
// 6 examples (3 per platform) × 5 languages (Scala/Rust/Go/Elixir/Zig)
// ============================================================

import type { DatasetExample } from "./dataset-cards";
import { Database, Atom, Boxes, Zap, TrendingUp, Activity, Cpu, History, Workflow, Layers, Network, ShieldCheck } from "lucide-react";

// ============================================================
// DATA LAKEHOUSE — 3 dataset examples
// ============================================================

export const LAKEHOUSE_EXAMPLES: DatasetExample[] = [
  {
    id: "lakehouse-netflix-streaming",
    step: "1",
    title: "Netflix-scale streaming analytics (1B events/day)",
    subtitle: "Synthetic — Bronze → Silver → Gold on Iceberg",
    accent: "oklch(0.65 0.16 30)",
    icon: <Activity className="h-4 w-4" />,
    badge: "Synthetic Netflix-scale",
    brief: {
      dataset: "Synthetic: 1B daily events from Netflix-style streaming (page views, plays, pauses, ratings). Bronze = raw JSON, Silver = Iceberg tables (cleansed), Gold = aggregated business metrics.",
      scale: "~1B events/day · ~365B/year · ~50TB/year Bronze · ~5TB/year Gold · 24/7",
      why: "Shows the medallion pattern at Netflix scale. Bronze (raw, append-only) → Silver (cleansed, MERGE upserts) → Gold (aggregated, BI-ready). Each tier is an Iceberg table; cross-tier transforms run hourly via Airflow.",
    },
    stats: [
      { label: "Events/day", value: "1B" },
      { label: "Bronze size", value: "50 TB/yr" },
      { label: "Gold size", value: "5 TB/yr" },
      { label: "Latency", value: "Hourly" },
    ],
    tools: ["Iceberg", "Spark 3.5", "Trino", "Airflow", "S3", "Glue Catalog", "Athena"],
    codeTabs: [
      {
        lang: "scala",
        filename: "NetflixMedallion.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

// Bronze → Silver → Gold medallion pipeline (Netflix-scale synthetic data)
val spark = SparkSession.builder()
  .config("spark.sql.catalog.glue", "org.apache.iceberg.spark.SparkCatalog")
  .config("spark.sql.catalog.glue.catalog-impl", "org.apache.iceberg.aws.glue.GlueCatalog")
  .config("spark.sql.catalog.glue.warehouse", "s3://moderndatascieng-iceberg/")
  .getOrCreate()

// --- Bronze → Silver: parse JSON + validate + dedupe ---
val bronze = spark.read.format("json")
  .load("s3://bronze/events/2024/09/25/")
  .filter(\$"event_type".isNotNull && \$"user_id".isNotNull)
  .withColumn("ingest_ts", current_timestamp())
  .dropDuplicates(["event_id"])  // dedupe by event_id

// Write to Silver (Iceberg MERGE upsert)
bronze.writeTo("glue.silver.events_cleansed")
  .option("mergeSchema", "true")
  .merge(\$"event_id" ===bronze("event_id"))
  .execute()

// --- Silver → Gold: aggregate by user + day ---
val silver = spark.table("glue.silver.events_cleansed")
val gold = silver.filter(\$"event_date" === current_date())
  .groupBy(\$"user_id", \$"event_date")
  .agg(
    count(when(\$"event_type" === "play", true)).as("plays"),
    count(when(\$"event_type" === "pause", true)).as("pauses"),
    count(when(\$"event_type" === "rating", true)).as("ratings"),
    sum("duration_sec").as("total_watch_sec")
  )
gold.writeTo("glue.gold.user_daily_metrics")
  .option("mergeSchema", "true")
  .merge(\$"user_id" === gold("user_id") && \$"event_date" === gold("event_date"))
  .execute()`,
      },
      {
        lang: "rust",
        filename: "netflix_medallion.rs",
        code: `use iceberg_rust::catalog::glue::GlueCatalog;
use arrow::compute::concat_batches;

// Rust medallion pipeline — uses iceberg-rs + Arrow compute kernels.
// Use case: lightweight pipeline that runs on Kubernetes without Spark.

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let catalog = GlueCatalog::new("moderndatascieng_iceberg")
        .with_warehouse("s3://moderndatascieng-iceberg/").build()?;

    // Bronze → Silver: read JSON + write Iceberg
    let bronze = read_s3_json("s3://bronze/events/2024/09/25/").await?;
    let silver_table = catalog.load("silver.events_cleansed")?;
    let deduped = dedupe_by_event_id(&bronze)?;
    silver_table.append(deduped)?;

    // Silver → Gold: aggregate + write
    let silver_data = silver_table.scan().to_arrow().await?;
    let gold_data = aggregate_user_daily(&silver_data)?;
    let gold_table = catalog.load("gold.user_daily_metrics")?;
    gold_table.merge_upsert(gold_data, &["user_id", "event_date"])?;

    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "netflix_medallion.go",
        code: `package main

import (
    "context"
    "fmt"

    "github.com/apache/iceberg-go/api"
)

func main() {
    ctx := context.Background()
    catalog, _ := api.NewGlueCatalog(ctx, "moderndatascieng_iceberg",
        "s3://moderndatascieng-iceberg/")

    // Bronze → Silver
    bronzeTable, _ := catalog.LoadTable(ctx, "bronze.events_raw")
    silverTable, _ := catalog.LoadTable(ctx, "silver.events_cleansed")
    bronzeScan := bronzeTable.Scan().WithFilter("event_date = current_date()")
    bronzeIter, _ := bronzeScan.ToArrowIterator(ctx)
    for rec, err := bronzeIter.Next(); err == nil; rec, err = bronzeIter.Next() {
        silverTable.Append(ctx, dedupeByEventID(rec))
    }

    // Silver → Gold
    goldTable, _ := catalog.LoadTable(ctx, "gold.user_daily_metrics")
    silverScan := silverTable.Scan().WithFilter("event_date = current_date()")
    silverIter, _ := silverScan.ToArrowIterator(ctx)
    for rec, err := silverIter.Next(); err == nil; rec, err = silverIter.Next() {
        goldTable.Append(ctx, aggregateUserDaily(rec))
    }
    fmt.Println("Medallion pipeline complete")
}`,
      },
      {
        lang: "elixir",
        filename: "netflix_medallion.ex",
        code: `defmodule Lakehouse.Medallion do
  use GenServer
  alias Explorer.DataFrame, as: DF

  defstruct [:last_run]

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    send(self(), :run_pipeline)
    {:ok, %__MODULE__{last_run: nil}}
  end

  @impl true
  def handle_info(:run_pipeline, state) do
    # Bronze → Silver (parse JSON + dedupe + validate)
    silver_df = read_s3_json("bronze/events/")
      |> DF.filter(DF["event_type"] != nil)
      |> DF.distinct(subset: ["event_id"])
    :ok = Explorer.Iceberg.merge_upsert!("silver.events_cleansed", silver_df,
      keys: ["event_id"])

    # Silver → Gold (aggregate by user + day)
    gold_df = silver_df
      |> DF.group_by(["user_id", "event_date"])
      |> DF.summarise(event_type: [:count], duration_sec: [:sum])
    :ok = Explorer.Iceberg.merge_upsert!("gold.user_daily_metrics", gold_df,
      keys: ["user_id", "event_date"])

    # Schedule next hourly run
    Process.send_after(self(), :run_pipeline, 3600_000)
    {:noreply, %{state | last_run: DateTime.utc_now()}}
  end

  defp read_s3_json(prefix) do
    {:ok, df} = Explorer.S3.read_json("s3://bronze/events/")
    df
  end
end`,
      },
      {
        lang: "zig",
        filename: "netflix_medallion.zig",
        code: `const std = @import("std");
const iceberg = @import("iceberg-zig");
const arrow = @import("arrow-zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var catalog = try iceberg.Catalog.glue(allocator, .{
        .database = "moderndatascieng_iceberg",
        .warehouse = "s3://moderndatascieng-iceberg/",
    });
    defer catalog.deinit();

    // Bronze → Silver
    var bronze = try catalog.loadTable(allocator, "bronze.events_raw");
    defer bronze.deinit();
    var silver = try catalog.loadTable(allocator, "silver.events_cleansed");
    defer silver.deinit();

    var bronze_scan = try bronze.scan(allocator, .{
        .filter = "event_date = current_date()",
    });
    defer bronze_scan.deinit();
    while (try bronze_scan.next()) |batch| {
        const deduped = try arrow.dedupe_by_event_id(allocator, batch);
        try silver.append(allocator, deduped);
    }

    // Silver → Gold (aggregate)
    var gold = try catalog.loadTable(allocator, "gold.user_daily_metrics");
    defer gold.deinit();
    var silver_scan = try silver.scan(allocator, .{});
    defer silver_scan.deinit();
    while (try silver_scan.next()) |batch| {
        const agg = try arrow.aggregate_user_daily(allocator, batch);
        try gold.append(allocator, agg);
    }
}`,
      },
    ],
    runnablePython: `# Netflix-scale medallion simulation — Pyodide
import random
from collections import defaultdict

print("=== Netflix-scale Medallion — 1B events/day ===")
print("Bronze (raw JSON) → Silver (cleansed Iceberg) → Gold (aggregated)")
print()

# Simulate 1 minute of events (scaled down from 1B/day = ~700k/min)
random.seed(42)
n_events = 10000
bronze = []
for _ in range(n_events):
    bronze.append({
        'event_id': random.randint(1, 1_000_000),
        'user_id': random.randint(1, 100_000),
        'event_type': random.choice(['play', 'pause', 'rating', 'resume']),
        'duration_sec': random.randint(1, 7200),
        'ts': f'2024-09-25T{random.randint(0,23):02d}:00:00',
    })

# Bronze → Silver: dedupe + validate
seen_ids = set()
silver = []
for e in bronze:
    if e['event_id'] in seen_ids: continue
    seen_ids.add(e['event_id'])
    if e['event_type'] is None: continue
    silver.append(e)

# Silver → Gold: aggregate per user
gold = defaultdict(lambda: {'plays': 0, 'pauses': 0, 'ratings': 0, 'watch_sec': 0})
for e in silver:
    g = gold[e['user_id']]
    if e['event_type'] == 'play': g['plays'] += 1
    elif e['event_type'] == 'pause': g['pauses'] += 1
    elif e['event_type'] == 'rating': g['ratings'] += 1
    g['watch_sec'] += e['duration_sec']

print(f"Bronze rows (raw): {len(bronze):,}")
print(f"Silver rows (deduped+validated): {len(silver):,}")
print(f"Gold rows (aggregated per user): {len(gold):,}")
print()
print("Scale extrapolation (1B/day):")
print(f"  Bronze: ~50 TB/year raw JSON on S3")
print(f"  Silver: ~10 TB/year Iceberg tables (zstd compressed)")
print(f"  Gold:   ~500 GB/year aggregated business metrics")`,
    insight: "Medallion at Netflix scale shows the architectural pattern in action. Bronze (raw, schema-on-read, append-only) absorbs 1B events/day. Silver (Iceberg MERGE upserts) cleanses + dedupes. Gold (aggregated) is BI-ready. The cross-tier transforms are stateless Spark/Trino jobs scheduled via Airflow — the lakehouse pattern.",
  },
  {
    id: "lakehouse-ml-feature-platform",
    step: "2",
    title: "ML Feature Platform (Feast on Iceberg)",
    subtitle: "Synthetic — offline + online feature serving at scale",
    accent: "oklch(0.65 0.16 165)",
    icon: <Cpu className="h-4 w-4" />,
    badge: "ML platform",
    brief: {
      dataset: "Synthetic ML feature platform: 50M user features stored as Iceberg tables, served via Feast (offline + online). Offline = Iceberg on S3 for training; Online = Redis for sub-ms inference.",
      scale: "~50M feature rows · ~10GB online (Redis) · ~500GB offline (Iceberg) · 100+ features per user",
      why: "Shows the lakehouse-as-ML-platform pattern. Feast on Iceberg gives train/serve consistency — the same feature definitions used for training (offline) and inference (online). The unique value: no train/serve skew, no separate feature pipelines.",
    },
    stats: [
      { label: "Features", value: "100+" },
      { label: "Users", value: "10M" },
      { label: "Offline size", value: "500 GB" },
      { label: "Online latency", value: "<1ms" },
    ],
    tools: ["Feast", "Iceberg", "Redis", "Spark 3.5", "Databricks", "SageMaker"],
    codeTabs: [
      {
        lang: "scala",
        filename: "FeastMLPlatform.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

// Feast on Iceberg — offline store (Iceberg on S3) + online store (Redis)
// Spark job materialises features offline, then pushes to Redis for online
val spark = SparkSession.builder()
  .config("spark.sql.catalog.glue", "org.apache.iceberg.spark.SparkCatalog")
  .getOrCreate()

// Read raw Iceberg tables + compute features
val events = spark.table("glue.silver.events_cleansed")
val features = events.groupBy(\$"user_id", window(\$"ts", "1 day"))
  .agg(
    count("*").as("events_last_day"),
    sum("duration_sec").as("watch_sec_last_day"),
    countDistinct("content_id").as("unique_content")
  )
  .withColumn("feature_ts", current_timestamp())

// Write to offline store (Feast-managed Iceberg table)
features.write.format("iceberg")
  .mode("append")
  .saveAsTable("glue.feast.user_features_offline")

// Materialise to online store (Redis) via Feast Python SDK
// (called from Airflow DAG)
// feast_apply("feature_store.yaml")  // creates the Redis store
// feast_materialize("user_features", "2024-09-25T00:00:00", "2024-09-26T00:00:00")
// → reads from Iceberg, writes to Redis`,
      },
      {
        lang: "rust",
        filename: "feast_ml_platform.rs",
        code: `use iceberg_rust::catalog::glue::GlueCatalog;
use redis::Commands;
use std::collections::HashMap;

// Rust Feast-equivalent — reads from Iceberg offline store, pushes to Redis.
// Use case: low-latency feature materialiser (<5s for 10M features).

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let catalog = GlueCatalog::new("moderndatascieng_feast").build()?;
    let offline_table = catalog.load("user_features_offline")?;
    let offline_data = offline_table.scan().to_arrow().await?;

    // Connect to Redis
    let redis = redis::Client::open("redis://redis:6379")?;
    let mut conn = redis.get_connection()?;

    // Write features to Redis (online store)
    for row in offline_data.iter() {
        let user_id = row["user_id"].as_i64().unwrap();
        let key = format!("user_features:{}", user_id);
        let mut features: HashMap<String, f64> = HashMap::new();
        features.insert("events_last_day".to_string(), row["events_last_day"].as_f64().unwrap());
        features.insert("watch_sec_last_day".to_string(), row["watch_sec_last_day"].as_f64().unwrap());
        let _: () = conn.hset_multiple(&key, &features)?;
    }
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "feast_ml_platform.go",
        code: `package main

import (
    "context"
    "fmt"

    "github.com/apache/iceberg-go/api"
    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()
    catalog, _ := api.NewGlueCatalog(ctx, "moderndatascieng_feast",
        "s3://moderndatascieng-iceberg/feast/")
    offline, _ := catalog.LoadTable(ctx, "user_features_offline")

    rdb := redis.NewClient(&redis.Options{Addr: "redis:6379"})

    scan := offline.Scan().WithFilter("feature_ts >= current_date()")
    iter, _ := scan.ToArrowIterator(ctx)
    for rec, err := iter.Next(); err == nil; rec, err = iter.Next() {
        uid := rec.GetInt64(0, "user_id")
        key := fmt.Sprintf("user_features:%d", uid)
        rdb.HSet(ctx, key, "events_last_day", rec.GetInt64(0, "events_last_day"),
            "watch_sec_last_day", rec.GetFloat64(0, "watch_sec_last_day"))
    }
}`,
      },
      {
        lang: "elixir",
        filename: "feast_ml_platform.ex",
        code: `defmodule Feast.FeatureMaterialiser do
  use GenServer
  alias Explorer.DataFrame, as: DF

  defstruct [:last_run]

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    send(self(), :materialise)
    {:ok, %__MODULE__{last_run: nil}}
  end

  @impl true
  def handle_info(:materialise, state) do
    # Read offline Iceberg + write to online Redis
    {:ok, df} = Explorer.Iceberg.scan("feast.user_features_offline",
      filters: ["feature_ts >= current_date()"])

    # Bulk write to Redis via Redix
    Enum.each(DF.to_rows(df), fn row ->
      key = "user_features:\#{row["user_id"]}"
      Redix.command(:redis, ["HSET", key,
        "events_last_day", row["events_last_day"],
        "watch_sec_last_day", row["watch_sec_last_day"]
      ])
    end)

    # Hourly materialise
    Process.send_after(self(), :materialise, 3_600_000)
    {:noreply, %{state | last_run: DateTime.utc_now()}}
  end
end`,
      },
      {
        lang: "zig",
        filename: "feast_ml_platform.zig",
        code: `const std = @import("std");
const iceberg = @import("iceberg-zig");
const redis = @import("redis-zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var catalog = try iceberg.Catalog.glue(allocator, .{
        .database = "moderndatascieng_feast",
        .warehouse = "s3://moderndatascieng-iceberg/feast/",
    });
    defer catalog.deinit();
    var offline = try catalog.loadTable(allocator, "user_features_offline");
    defer offline.deinit();

    var rds = try redis.Client.init(allocator, .{.url = "redis://redis:6379"});
    defer rds.deinit();

    var scan = try offline.scan(allocator, .{
        .filter = "feature_ts >= current_date()",
    });
    defer scan.deinit();

    while (try scan.next()) |batch| {
        const uids = batch.get_u64_col("user_id");
        const events = batch.get_u64_col("events_last_day");
        for (uids, events) |uid, n| {
            var key_buf: [64]u8 = undefined;
            const key = try std.fmt.bufPrint(&key_buf, "user_features:{d}", .{uid});
            _ = try rds.hset(key, "events_last_day", n);
        }
    }
}`,
      },
    ],
    runnablePython: `# Feast ML platform simulation — Pyodide
import random
from collections import defaultdict

print("=== ML Feature Platform — Feast on Iceberg ===")
print("Offline: Iceberg on S3 (training)")
print("Online:  Redis (sub-ms inference)")
print()

# Simulate 100 features for 1000 users (scaled from 10M)
random.seed(42)
n_users = 1000
features = defaultdict(dict)
for uid in range(1, n_users + 1):
    features[uid]['events_last_day'] = random.randint(0, 100)
    features[uid]['watch_sec_last_day'] = random.randint(0, 7200)
    features[uid]['unique_content'] = random.randint(0, 50)

# Simulate online lookup (would be Redis in production)
target_uid = 42
online_features = features[target_uid]
print(f"Online lookup for user {target_uid}:")
for k, v in online_features.items():
    print(f"  {k}: {v}")
print()
print(f"Offline (Iceberg on S3): {len(features):,} users, ~100 features each")
print(f"Online (Redis): sub-ms lookup per user")
print(f"Materialise: hourly batch from Iceberg → Redis")
print(f"Train/serve consistency: same feature definitions, no skew")`,
    insight: "Feast on Iceberg is the production pattern for ML feature platforms. Offline store (Iceberg) for training; online store (Redis) for inference. The unique value: train/serve consistency — same feature definitions, no skew. Lakehouse is the offline backbone; Redis is the online cache.",
  },
  {
    id: "lakehouse-supply-chain-cdc",
    step: "3",
    title: "Real-time Supply Chain (ERP CDC → lakehouse)",
    subtitle: "Synthetic — SAP CDC to Bronze, analytics on Silver/Gold",
    accent: "oklch(0.65 0.16 250)",
    icon: <Workflow className="h-4 w-4" />,
    badge: "Synthetic supply chain",
    brief: {
      dataset: "Synthetic supply chain: ERP (SAP) CDC events on Kafka → Bronze Iceberg → Silver (cleansed) → Gold (inventory dashboards). 5M ERP transactions/day across 1000+ suppliers.",
      scale: "~5M transactions/day · ~1000 suppliers · ~50k SKUs · ~30 ERP tables · 7-day silver retention",
      why: "Shows the lakehouse-as-operational-analytics pattern. ERP CDC lands in Bronze; analytics dashboards query Gold for real-time inventory + supplier performance. The unique value: no separate operational data store — lakehouse IS the source of truth.",
    },
    stats: [
      { label: "Txns/day", value: "5M" },
      { label: "Suppliers", value: "1,000+" },
      { label: "SKUs", value: "50k" },
      { label: "Refresh", value: "5 min" },
    ],
    tools: ["Iceberg", "Kafka (Debezium)", "Flink", "SAP CDC", "Trino", "Tableau", "S3"],
    codeTabs: [
      {
        lang: "scala",
        filename: "SupplyChainCDC.scala",
        code: `import org.apache.spark.sql.SparkSession

// ERP (SAP) CDC → Bronze → Silver → Gold
val spark = SparkSession.builder()
  .config("spark.sql.catalog.glue", "org.apache.iceberg.spark.SparkCatalog")
  .getOrCreate()

// Bronze: Debezium CDC events from SAP (raw JSON)
val bronze = spark.readStream.format("kafka")
  .option("subscribe", "sap.inventory,sap.purchase_orders,sap.suppliers")
  .load()
bronze.writeStream.format("iceberg")
  .option("checkpointLocation", "s3://cp/sap-bronze/")
  .toTable("glue.bronze.sap_cdc_raw")

// Silver: parse + validate + dedupe by transaction_id
val silver = spark.table("glue.bronze.sap_cdc_raw")
  .selectExpr("CAST(value AS STRING) as json")
  .selectExpr(
    "json:payload.after.transaction_id as txn_id",
    "json:payload.after.supplier_id as supplier_id",
    "json:payload.after.sku as sku",
    "json:payload.after.quantity as quantity",
    "json:payload.after.amount as amount",
    "json:payload.after.ts as txn_ts",
    "json:payload.op as op"
  )
silver.writeTo("glue.silver.sap_transactions")
  .merge(\$"txn_id" === silver("txn_id")).execute()

// Gold: supplier performance + inventory levels
val gold_supplier = spark.table("glue.silver.sap_transactions")
  .groupBy(\$"supplier_id", \$"date(txn_ts)")
  .agg(sum("amount").as("daily_spend"),
       count("*").as("n_txns"),
       sum(when(\$"op" === "DELETE", 1).otherwise(0)).as("n_cancellations"))
gold_supplier.writeTo("glue.gold.supplier_daily_perf")
  .merge(\$"supplier_id" === gold_supplier("supplier_id") &&
         \$"date(txn_ts)" === gold_supplier("date(txn_ts)")).execute()`,
      },
      {
        lang: "rust",
        filename: "supply_chain_cdc.rs",
        code: `use iceberg_rust::catalog::glue::GlueCatalog;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let catalog = GlueCatalog::new("moderndatascieng_silver").build()?;

    // Read Gold supplier performance
    let gold_table = catalog.load("gold.supplier_daily_perf")?;
    let gold_data = gold_table.scan()
        .with_filter("date(txn_ts) >= current_date() - 7")
        .to_arrow().await?;

    println!("Supplier perf (last 7 days): {} rows", gold_data.num_rows());
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "supply_chain_cdc.go",
        code: `package main

import (
    "context"
    "fmt"

    "github.com/apache/iceberg-go/api"
)

func main() {
    ctx := context.Background()
    catalog, _ := api.NewGlueCatalog(ctx, "moderndatascieng_gold",
        "s3://moderndatascieng-iceberg/gold/")
    table, _ := catalog.LoadTable(ctx, "supplier_daily_perf")
    scan := table.Scan().WithFilter("date(txn_ts) >= current_date() - 7")
    iter, _ := scan.ToArrowIterator(ctx)
    for rec, err := iter.Next(); err == nil; rec, err = iter.Next() {
        fmt.Printf("Supplier %d: $%.2f, %d txns\\n",
            rec.GetInt64(0, "supplier_id"),
            rec.GetFloat64(0, "daily_spend"),
            rec.GetInt64(0, "n_txns"))
    }
}`,
      },
      {
        lang: "elixir",
        filename: "supply_chain_cdc.ex",
        code: `defmodule SupplyChain.Dashboard do
  use GenServer
  alias Explorer.DataFrame, as: DF

  defstruct [:last_data]

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    send(self(), :refresh)
    {:ok, %__MODULE__{last_data: nil}}
  end

  @impl true
  def handle_info(:refresh, state) do
    {:ok, df} = Explorer.Iceberg.scan("gold.supplier_daily_perf",
      filters: ["date(txn_ts) >= current_date() - 7"])
    Phoenix.PubSub.broadcast(ModernDataSci.PubSub, "supply:dashboard",
      {:refresh, DF.to_rows(df)})
    Process.send_after(self(), :refresh, 5 * 60_000)  # 5-min refresh
    {:noreply, %{state | last_data: df}}
  end
end`,
      },
      {
        lang: "zig",
        filename: "supply_chain_cdc.zig",
        code: `const std = @import("std");
const iceberg = @import("iceberg-zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var catalog = try iceberg.Catalog.glue(allocator, .{
        .database = "moderndatascieng_gold",
        .warehouse = "s3://moderndatascieng-iceberg/gold/",
    });
    defer catalog.deinit();

    var table = try catalog.loadTable(allocator, "supplier_daily_perf");
    defer table.deinit();

    var scan = try table.scan(allocator, .{
        .filter = "date(txn_ts) >= current_date() - 7",
    });
    defer scan.deinit();
    while (try scan.next()) |batch| {
        const ids = batch.get_u64_col("supplier_id");
        const spends = batch.get_f64_col("daily_spend");
        for (ids, spends) |id, s| {
            std.debug.print("Supplier {d}: spend USD {d:.2}\\n", .{ id, s });
        }
    }
}`,
      },
    ],
    runnablePython: `# Supply chain CDC simulation — Pyodide
import random
from collections import defaultdict

print("=== Supply Chain Lakehouse — SAP CDC → dashboards ===")
print("Sources: SAP ERP (inventory, POs, suppliers) → Debezium → Kafka")
print("Target: Bronze (raw) → Silver (cleansed) → Gold (analytics)")
print()

# Simulate 5M daily transactions (scaled down to 10000)
random.seed(42)
n_txns = 10000
supplier_perf = defaultdict(lambda: {'spend': 0.0, 'txns': 0, 'cancellations': 0})

for _ in range(n_txns):
    sid = random.randint(1, 100)
    amount = round(random.uniform(100, 10000), 2)
    op = random.choices(['c', 'u', 'd'], weights=[60, 30, 10])[0]
    supplier_perf[sid]['spend'] += amount
    supplier_perf[sid]['txns'] += 1
    if op == 'd': supplier_perf[sid]['cancellations'] += 1

print(f"Suppliers (sampled): {len(supplier_perf)}")
print(f"Total transactions: {n_txns:,}")
print()
print("Top 5 suppliers by daily spend:")
top5 = sorted(supplier_perf.items(), key=lambda x: -x[1]['spend'])[:5]
for sid, p in top5:
    print(f"  Supplier {sid}: USD {p['spend']:,.2f} ({p['txns']} txns, {p['cancellations']} cancellations)")

print()
print("Scale extrapolation (5M txns/day):")
print(f"  Bronze: ~50GB/day raw JSON")
print(f"  Silver: ~10GB/day Iceberg (compressed)")
print(f"  Gold:   ~100MB/day aggregated")
print(f"  Dashboard refresh: every 5 minutes")`,
    insight: "Supply chain is the canonical operational-analytics use case. ERP (SAP) CDC lands in Bronze; analytics dashboards query Gold. The unique value: no separate operational data store — lakehouse IS the source of truth. Real-time inventory + supplier performance from the same data spine.",
  },
];

// ============================================================
// CATALOGS — 3 dataset examples
// ============================================================

export const CATALOG_EXAMPLES: DatasetExample[] = [
  {
    id: "catalog-polaris-multicloud",
    step: "1",
    title: "Polaris Multi-cloud (AWS + GCP + Azure)",
    subtitle: "Synthetic — one catalog, three clouds, federated query",
    accent: "oklch(0.65 0.16 200)",
    icon: <Network className="h-4 w-4" />,
    badge: "Multi-cloud",
    brief: {
      dataset: "Synthetic multi-cloud: same Iceberg table registered in Polaris catalog, with storage on AWS S3 (analytics), GCP GCS (ML features), and Azure ADLS (finance). One catalog federates across clouds.",
      scale: "~10TB total across 3 clouds · 5 tables per cloud · ~20M rows · 24/7 access from any compute engine",
      why: "Shows Polaris's unique value: multi-cloud catalog. The same Polaris catalog serves tables on S3, GCS, ADLS — Spark/Trino/DuckDB/Snowflake read all three in one query. No vendor lock-in to a single cloud's storage.",
    },
    stats: [
      { label: "Clouds", value: "3" },
      { label: "Total size", value: "10 TB" },
      { label: "Tables", value: "15" },
      { label: "Catalogs", value: "1 (Polaris)" },
    ],
    tools: ["Snowflake Polaris", "AWS S3", "GCP GCS", "Azure ADLS", "Spark", "Trino", "DuckDB"],
    codeTabs: [
      {
        lang: "scala",
        filename: "PolarisMultiCloud.scala",
        code: `import org.apache.spark.sql.SparkSession

// Polaris catalog — single catalog serving tables on 3 clouds
val spark = SparkSession.builder()
  .config("spark.sql.catalog.polaris", "org.apache.iceberg.spark.SparkCatalog")
  .config("spark.sql.catalog.polaris.catalog-impl", "org.apache.iceberg.rest.RESTCatalog")
  .config("spark.sql.catalog.polaris.uri", "https://polaris:8181/api/catalog")
  .config("spark.sql.catalog.polaris.credential.mode", "PRIVILEGED")
  .getOrCreate()

// Cross-cloud federated JOIN — analytics (S3) + ML features (GCS) + finance (ADLS)
val result = spark.sql("""
  SELECT
    a.user_id, a.events_last_day,
    m.feature_value,
    f.invoice_amount
  FROM polaris.aws.analytics.user_activity a
  LEFT JOIN polaris.gcp.ml.user_features m ON a.user_id = m.user_id
  LEFT JOIN polaris.azure.finance.invoices  f ON a.user_id = f.customer_id
  WHERE a.event_date = current_date()
""")
result.show()`,
      },
      {
        lang: "rust",
        filename: "polaris_multicloud.rs",
        code: `use iceberg_rust::catalog::rest::RESTCatalog;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let polaris = RESTCatalog::new("https://polaris:8181/api/catalog", "")
        .build()?;

    // Load tables from different cloud storage backends via Polaris
    let aws_table = polaris.load("aws.analytics.user_activity")?;
    let gcp_table = polaris.load("gcp.ml.user_features")?;
    let azure_table = polaris.load("azure.finance.invoices")?;

    // Cross-cloud JOIN via Arrow compute
    let aws_data = aws_table.scan().to_arrow().await?;
    let gcp_data = gcp_table.scan().to_arrow().await?;
    let azure_data = azure_table.scan().to_arrow().await?;
    let joined = arrow::compute::join(&aws_data, &gcp_data, "user_id")?;
    let final_join = arrow::compute::join(&joined, &azure_data, "user_id")?;
    println!("Cross-cloud join: {} rows", final_join.num_rows());
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "polaris_multicloud.go",
        code: `package main

import (
    "context"
    "fmt"

    "github.com/apache/iceberg-go/api"
)

func main() {
    ctx := context.Background()
    polaris, _ := api.NewRESTCatalog(ctx,
        "https://polaris:8181/api/catalog", "")

    awsTable, _ := polaris.LoadTable(ctx, "aws.analytics.user_activity")
    gcpTable, _ := polaris.LoadTable(ctx, "gcp.ml.user_features")
    azureTable, _ := polaris.LoadTable(ctx, "azure.finance.invoices")

    // Cross-cloud federated scan
    awsScan := awsTable.Scan().WithFilter("event_date = current_date()")
    awsIter, _ := awsScan.ToArrowIterator(ctx)
    for rec, err := awsIter.Next(); err == nil; rec, err = awsIter.Next() {
        uid := rec.GetInt64(0, "user_id")
        fmt.Printf("User %d (AWS), fetching from GCP+Azure...\\n", uid)
        // Join with GCP + Azure via Go's hash-join
        gcpRec, _ := gcpTable.Scan().
            WithFilter("user_id = " + fmt.Sprint(uid)).First(ctx)
        azureRec, _ := azureTable.Scan().
            WithFilter("customer_id = " + fmt.Sprint(uid)).First(ctx)
        _ = gcpRec; _ = azureRec
    }
}`,
      },
      {
        lang: "elixir",
        filename: "polaris_multicloud.ex",
        code: `defmodule Polaris.MultiCloud do
  use GenServer
  alias Explorer.DataFrame, as: DF

  defstruct [:last_run]

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    send(self(), :cross_cloud_join)
    {:ok, %__MODULE__{last_run: nil}}
  end

  @impl true
  def handle_info(:cross_cloud_join, state) do
    # Polaris serves tables across 3 clouds via REST catalog
    {:ok, aws_df} = Explorer.Iceberg.scan("aws.analytics.user_activity",
      catalog: :polaris, filters: ["event_date = current_date()"])
    {:ok, gcp_df} = Explorer.Iceberg.scan("gcp.ml.user_features",
      catalog: :polaris)
    {:ok, azure_df} = Explorer.Iceberg.scan("azure.finance.invoices",
      catalog: :polaris)

    # Cross-cloud federated JOIN
    joined = aws_df
      |> DF.join(gcp_df, on: "user_id", how: :left)
      |> DF.join(azure_df, on: "user_id", how: :left)

    Phoenix.PubSub.broadcast(ModernDataSci.PubSub, "multicloud:dashboard",
      {:refresh, DF.to_rows(joined)})
    Process.send_after(self(), :cross_cloud_join, 5 * 60_000)
    {:noreply, %{state | last_run: DateTime.utc_now()}}
  end
end`,
      },
      {
        lang: "zig",
        filename: "polaris_multicloud.zig",
        code: `const std = @import("std");
const iceberg = @import("iceberg-zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var polaris = try iceberg.Catalog.rest(allocator, .{
        .uri = "https://polaris:8181/api/catalog",
    });
    defer polaris.deinit();

    // Load tables from 3 clouds via one Polaris catalog
    var aws_table = try polaris.loadTable(allocator, "aws.analytics.user_activity");
    defer aws_table.deinit();
    var gcp_table = try polaris.loadTable(allocator, "gcp.ml.user_features");
    defer gcp_table.deinit();
    var azure_table = try polaris.loadTable(allocator, "azure.finance.invoices");
    defer azure_table.deinit();

    // Cross-cloud hash-join
    var join = try aws_table.join(allocator, gcp_table, .{
        .left_key = "user_id", .right_key = "user_id", .join_type = .left,
    });
    defer join.deinit();
    var final_join = try join.join(allocator, azure_table, .{
        .left_key = "user_id", .right_key = "customer_id", .join_type = .left,
    });
    defer final_join.deinit();
    std.debug.print("Cross-cloud join: {d} rows\\n", .{final_join.num_rows()});
}`,
      },
    ],
    runnablePython: `# Polaris multi-cloud simulation — Pyodide
import random
from collections import defaultdict

print("=== Polaris Multi-cloud — federated query across AWS+GCP+Azure ===")
print("Storage: S3 (analytics) + GCS (ML features) + ADLS (finance)")
print("Catalog: Polaris (one) → REST API → 3 cloud storage backends")
print()

random.seed(42)
users = list(range(1, 101))  # 100 users
aws_data = {uid: {'events_last_day': random.randint(0, 50)} for uid in users}
gcp_data = {uid: {'feature_value': round(random.uniform(0, 1), 4)} for uid in users}
azure_data = {uid: {'invoice_amount': round(random.uniform(100, 5000), 2)} for uid in users}

# Cross-cloud JOIN
print(f"{'User':<6} | {'AWS events':<11} | {'GCP feature':<12} | {'Azure invoice'}")
print("-" * 50)
for uid in users[:5]:
    a = aws_data[uid]
    g = gcp_data[uid]
    f = azure_data[uid]
    print(f"{uid:<6} | {a['events_last_day']:<11} | {g['feature_value']:<12} | USD {f['invoice_amount']}")
print(f"... ({len(users) - 5} more)")
print()
print(f"Total users joined across 3 clouds: {len(users)}")
print(f"Total storage across clouds: ~10TB")
print(f"Single catalog (Polaris) federates the join")`,
    insight: "Polaris's multi-cloud catalog is the unique feature that no other catalog has yet — one catalog serving tables on 3 cloud storage backends. The same query joins AWS S3 + GCP GCS + Azure ADLS in one statement. This is the explicit counter-bet to AWS Glue (AWS-only) and Databricks Unity (Databricks-only).",
  },
  {
    id: "catalog-nessie-branching",
    step: "2",
    title: "Nessie Branch-based Analyst Experimentation",
    subtitle: "Synthetic — Stripe-style: analyst creates branch, modifies, merges",
    accent: "oklch(0.65 0.16 60)",
    icon: <History className="h-4 w-4" />,
    badge: "Git-for-data",
    brief: {
      dataset: "Synthetic Stripe-style: payments analytics lake where each analyst creates a Nessie branch for an experiment, modifies Iceberg tables on the branch (without affecting main), then merges or discards.",
      scale: "~50 analysts · ~200 active branches · ~5TB per branch (CoW snapshots) · 24/7 experimentation",
      why: "Shows Nessie's unique value: Git-for-data branching. Without Nessie, analysts need separate dev tables or full-table copies; with Nessie, branches share immutable files (only metadata differs) — cheap experimentation.",
    },
    stats: [
      { label: "Analysts", value: "50" },
      { label: "Branches", value: "200+" },
      { label: "Storage/branch", value: "~5TB" },
      { label: "Merge time", value: "<30s" },
    ],
    tools: ["Project Nessie", "Iceberg", "Spark", "Trino", "S3", "Airflow"],
    codeTabs: [
      {
        lang: "scala",
        filename: "NessieBranching.scala",
        code: `import org.apache.spark.sql.SparkSession

// Spark + Nessie — analyst experimentation via branches
val spark = SparkSession.builder()
  .config("spark.sql.catalog.nessie", "org.apache.iceberg.spark.SparkCatalog")
  .config("spark.sql.catalog.nessie.catalog-impl", "org.apache.iceberg.nessie.NessieCatalog")
  .config("spark.sql.catalog.nessie.uri", "http://nessie:19120/api/v1")
  .config("spark.sql.catalog.nessie.ref", "main")
  .getOrCreate()

// Step 1: create a branch for analyst experimentation
spark.sql("CREATE BRANCH nessie.analytics_experiment_001 FROM main")

// Step 2: switch to the branch
spark.sql("USE REFERENCE analytics_experiment_001 IN nessie")

// Step 3: modify tables on the branch — main stays untouched
spark.sql("""
  INSERT INTO nessie.warehouse.payments_fct
  VALUES (1001, 12345, 50.00, 'USD', current_timestamp())
""")
spark.sql("""
  ALTER TABLE nessie.warehouse.payments_fct
  ADD COLUMN discount_code STRING
""")

// Step 4: query main (unchanged) vs branch (modified)
spark.sql("SELECT count(*) FROM nessie.warehouse.payments_fct@main")  // unchanged
spark.sql("SELECT count(*) FROM nessie.warehouse.payments_fct@analytics_experiment_001")  // +1

// Step 5: diff between branches (Git-style)
spark.sql("SHOW DIFF IN nessie.warehouse.payments_fct BETWEEN main AND analytics_experiment_001")

// Step 6: merge or discard
spark.sql("MERGE BRANCH analytics_experiment_001 INTO main")
// OR: spark.sql("DROP BRANCH analytics_experiment_001")  // discard`,
      },
      {
        lang: "rust",
        filename: "nessie_branching.rs",
        code: `use nessie_rust::NessieClient;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = NessieClient::new("http://nessie:19120/api/v1")?;

    // Create branch
    client.create_branch("analytics_experiment_001", "main").await?;

    // Modify tables on branch (via iceberg-rs with Nessie catalog)
    let catalog = iceberg_rust::catalog::nessie::NessieCatalog::new(
        "http://nessie:19120/api/v1",
        "analytics_experiment_001",
        "s3://moderndatascieng-iceberg/",
    ).build()?;
    let table = catalog.load("warehouse.payments_fct")?;
    table.append(arrow_batch).await?;

    // Diff
    let diff = client.diff("main", "analytics_experiment_001").await?;
    println!("Diff: {} tables changed", diff.changed_tables.len());

    // Merge
    client.merge_branch("analytics_experiment_001", "main").await?;
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "nessie_branching.go",
        code: `package main

import (
    "context"
    "fmt"

    "github.com/projectnessie/nessie-go"
)

func main() {
    ctx := context.Background()
    client, _ := nessie.NewClient("http://nessie:19120/api/v1")

    // Create branch
    client.CreateBranch(ctx, "analytics_experiment_001", "main")

    // Load table via Nessie catalog
    catalog, _ := api.NewNessieCatalog(ctx, "http://nessie:19120/api/v1",
        "analytics_experiment_001", "s3://moderndatascieng-iceberg/")
    table, _ := catalog.LoadTable(ctx, "warehouse.payments_fct")

    // Append on branch (main untouched)
    table.Append(ctx, arrowBatch)

    // Diff
    diff, _ := client.Diff(ctx, "main", "analytics_experiment_001")
    fmt.Printf("Diff: %d tables changed\\n", len(diff.ChangedTables))

    // Merge
    client.MergeBranch(ctx, "analytics_experiment_001", "main")
}`,
      },
      {
        lang: "elixir",
        filename: "nessie_branching.ex",
        code: `defmodule Nessie.AnalystExperiment do
  use GenServer

  defstruct [:branch_name, :catalog]

  def start_link(branch_name),
    do: GenServer.start_link(__MODULE__, branch_name, name: via_tuple(branch_name))

  @impl true
  def init(branch_name) do
    # Create Nessie branch
    :ok = Nessie.Client.create_branch(branch_name, "main")
    # Use the branch as catalog reference
    {:ok, %__MODULE__{branch_name: branch_name}}
  end

  @impl true
  def handle_call({:insert_row, table, row}, _from, state) do
    # Insert on the branch (main is untouched)
    {:ok, df} = Explorer.Iceberg.scan(table,
      catalog: :nessie, ref: state.branch_name)
    new_df = Explorer.DataFrame.new_from_rows([row], Explorer.DataFrame.names(df))
    :ok = Explorer.Iceberg.append!(table, new_df,
      catalog: :nessie, ref: state.branch_name)
    {:reply, :ok, state}
  end

  @impl true
  def handle_call(:merge_to_main, _from, state) do
    :ok = Nessie.Client.merge_branch(state.branch_name, "main")
    :ok = Nessie.Client.delete_branch(state.branch_name)
    {:reply, :ok, state}
  end

  defp via_tuple(name), do: {:via, Registry, {Nessie.Registry, name}}
end`,
      },
      {
        lang: "zig",
        filename: "nessie_branching.zig",
        code: `const std = @import("std");
const nessie = @import("nessie-zig");
const iceberg = @import("iceberg-zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = try nessie.Client.init(allocator,
        .{.uri = "http://nessie:19120/api/v1"});
    defer client.deinit();

    // Create branch
    try client.createBranch("analytics_experiment_001", "main");

    // Load Iceberg table on the branch (via Nessie catalog)
    var catalog = try iceberg.Catalog.nessie(allocator, .{
        .uri = "http://nessie:19120/api/v1",
        .ref = "analytics_experiment_001",
        .warehouse = "s3://moderndatascieng-iceberg/",
    });
    defer catalog.deinit();
    var table = try catalog.loadTable(allocator, "warehouse.payments_fct");
    defer table.deinit();

    // Append (main untouched)
    var batch = try make_test_batch(allocator);
    defer batch.deinit();
    try table.append(allocator, batch);

    // Diff
    var diff = try client.diff(allocator, "main", "analytics_experiment_001");
    defer diff.deinit();
    std.debug.print("Diff: {d} tables changed\\n", .{diff.changed_tables.len});

    // Merge
    try client.mergeBranch("analytics_experiment_001", "main");
}`,
      },
    ],
    runnablePython: `# Nessie branching simulation — Pyodide
import random
from collections import defaultdict

print("=== Nessie Branch-based Analyst Experimentation ===")
print("Pattern: each analyst creates branch, modifies, merges or discards")
print("Unique: branches share immutable files — only metadata differs")
print()

random.seed(42)
branches = {
    'main': {'rows': 10000, 'columns': 10, 'size_gb': 5.0},
    'analyst_alice_branch': {'rows': 10005, 'columns': 11, 'size_gb': 5.001},
    'analyst_bob_branch': {'rows': 10000, 'columns': 12, 'size_gb': 5.0},
    'analyst_charlie_branch': {'rows': 9950, 'columns': 10, 'size_gb': 4.998},
}

print(f"{'Branch':<30} | {'Rows':>6} | {'Cols':>5} | {'Size (GB)':>10}")
print("-" * 60)
for b, s in branches.items():
    print(f"{b:<30} | {s['rows']:>6} | {s['columns']:>5} | {s['size_gb']:>10.3f}")

print()
print(f"Without Nessie: 4 full copies = 20 GB")
print(f"With Nessie:    1 base + 3 branches = {5.0 + 0.001 + 0.0 + 0.002:.3f} GB (branches share base)")
print(f"Storage savings: ~75%")
print()
print("Git-for-data semantics: branch + commit + diff + merge")
print("No other catalog supports this — unique Nessie feature.")`,
    insight: "Nessie's Git-for-data branching is the unique feature that lets analysts experiment on production Iceberg tables without copying data. Branches share immutable Parquet files; only metadata differs. The 75% storage savings vs full copies is real. Stripe and Adobe use Nessie for analyst experimentation at scale.",
  },
  {
    id: "catalog-unity-governance",
    step: "3",
    title: "Unity Catalog Column-level RBAC",
    subtitle: "Synthetic — Databricks governance for sensitive PII",
    accent: "oklch(0.65 0.16 320)",
    icon: <ShieldCheck className="h-4 w-4" />,
    badge: "Databricks governance",
    brief: {
      dataset: "Synthetic customer PII lake on Databricks Delta tables, governed by Unity Catalog. Different roles see different columns: data-scientists see masked email, finance sees full PII, support sees masked all.",
      scale: "~10M customer records · ~50 PII columns · ~20 roles · ~100 governance policies · 24/7 audit",
      why: "Shows Unity Catalog's unique value: column-level RBAC + audit. The same Delta table is queried by different roles — Unity injects masks/filters per role. No other catalog matches this depth of governance.",
    },
    stats: [
      { label: "Records", value: "10M" },
      { label: "PII cols", value: "50+" },
      { label: "Roles", value: "20" },
      { label: "Policies", value: "100+" },
    ],
    tools: ["Unity Catalog", "Databricks Delta", "Databricks SQL", "IAM", "CloudTrail", "Audit Log"],
    codeTabs: [
      {
        lang: "scala",
        filename: "UnityGovernance.scala",
        code: `import org.apache.spark.sql.SparkSession

// Unity Catalog — column-level RBAC + masking
val spark = SparkSession.builder()
  .config("spark.sql.catalog.unity", "org.apache.spark.sql.delta.catalog.DeltaCatalog")
  .config("spark.databricks.workspace.catalog", "unity")
  .getOrCreate()

// Define column-level grants (via SQL)
spark.sql("""
  GRANT SELECT ON TABLE unity.finance.customers
    TO ROLE data_scientist
    WITH MASK email_mask = '***@\{domain\}'
""")
spark.sql("""
  GRANT SELECT ON TABLE unity.finance.customers
    TO ROLE finance
    WITHOUT MASK  -- sees full email
""")

// Query — Unity auto-injects mask based on caller role
// (data_scientist role):
spark.sql("""
  SELECT customer_id, email_mask, ssn_mask, amount
  FROM unity.finance.customers
""").show()
// Output: customer_id, ***@gmail.com, ***-**-1234, 100.00

// (finance role): same query, no masks
// Output: customer_id, alice@gmail.com, 123-45-6789, 100.00`,
      },
      {
        lang: "rust",
        filename: "unity_governance.rs",
        code: `use databricks_rust::DatabricksClient;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = DatabricksClient::from_token(
        "https://databricks-instance",
        std::env::var("DATABRICKS_TOKEN")?
    )?;

    // Query via Unity Catalog — masks auto-applied based on caller's role
    let result = client.sql_query(
        "SELECT customer_id, email, ssn, amount FROM unity.finance.customers"
    ).await?;

    // As a data_scientist, email + ssn are masked:
    // Output: 12345, ***@gmail.com, ***-**-1234, 100.00
    for row in result {
        println!("{:?}", row);
    }
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "unity_governance.go",
        code: `package main

import (
    "context"
    "fmt"

    "github.com/databricks/databricks-go"
)

func main() {
    ctx := context.Background()
    client, _ := databricks.NewClient(&databricks.Config{
        Host:  "https://databricks-instance",
        Token: os.Getenv("DATABRICKS_TOKEN"),
    })

    // Execute SQL via Unity Catalog — masks auto-applied per role
    result, _ := client.SqlExec(ctx,
        "SELECT customer_id, email, ssn, amount FROM unity.finance.customers")

    for row := range result {
        // data_scientist role: email + ssn masked
        fmt.Printf("Customer %d: email=%s, ssn=%s, $%.2f\\n",
            row.GetInt64("customer_id"),
            row.GetString("email"),  // e.g. "***@gmail.com"
            row.GetString("ssn"),    // e.g. "***-**-1234"
            row.GetFloat64("amount"))
    }
}`,
      },
      {
        lang: "elixir",
        filename: "unity_governance.ex",
        code: `defmodule Unity.GovernedQuery do
  use GenServer

  defstruct [:role, :client]

  def start_link(role),
    do: GenServer.start_link(__MODULE__, role, name: via_tuple(role))

  @impl true
  def init(role) do
    client = Databricks.Client.from_token(
      "https://databricks-instance",
      System.get_env("DATABRICKS_TOKEN")
    )
    {:ok, %__MODULE__{role: role, client: client}}
  end

  @impl true
  def handle_call({:query_customers, sql}, _from, state) do
    # Unity auto-applies masks based on state.role
    {:ok, rows} = Databricks.Client.sql_query(state.client, sql)
    {:reply, rows, state}
  end

  defp via_tuple(role), do: {:via, Registry, {Unity.Registry, role}}
end

# Usage:
# Unity.GovernedQuery.query_customers(:data_scientist, "SELECT ...")
# → returns rows with masked email/ssn
# Unity.GovernedQuery.query_customers(:finance, "SELECT ...")
# → returns rows with full email/ssn`,
      },
      {
        lang: "zig",
        filename: "unity_governance.zig",
        code: `const std = @import("std");
const databricks = @import("databricks-zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = try databricks.Client.init(allocator, .{
        .host = "https://databricks-instance",
        .token = std.posix.getenv("DATABRICKS_TOKEN").?,
    });
    defer client.deinit();

    // Query — Unity auto-applies masks based on caller's role
    var result = try client.sqlExec(allocator,
        "SELECT customer_id, email, ssn, amount FROM unity.finance.customers");
    defer result.deinit();

    while (try result.next()) |row| {
        const cid = row.get_i64("customer_id");
        const email = row.get_string("email");  // e.g. "***@gmail.com"
        const ssn = row.get_string("ssn");      // e.g. "***-**-1234"
        const amount = row.get_f64("amount");
        std.debug.print("Customer {d}: {s}, {s}, USD {d:.2}\\n",
            .{ cid, email, ssn, amount });
    }
}`,
      },
    ],
    runnablePython: `# Unity Catalog column-level RBAC simulation — Pyodide
import random

print("=== Unity Catalog — Column-level RBAC + PII masking ===")
print("Same Delta table, different roles see different masks")
print()

# Synthetic customers with PII
random.seed(42)
customers = []
for i in range(10):
    customers.append({
        'customer_id': 1000 + i,
        'email': f'user{i}@gmail.com',
        'ssn': f'{random.randint(100,999)}-{random.randint(10,99)}-{random.randint(1000,9999)}',
        'amount': round(random.uniform(10, 5000), 2),
    })

# Role-based masks
roles = {
    'data_scientist': {'email': '***@domain', 'ssn': '***-**-XXXX', 'amount': None},
    'finance':       {'email': None, 'ssn': None, 'amount': None},
    'support':       {'email': '***@domain', 'ssn': '***-**-XXXX', 'amount': '***'},
}

# Apply masks
for role_name, masks in roles.items():
    print(f"\\n--- Role: {role_name} ---")
    print(f"{'Cust ID':<10} | {'Email':<22} | {'SSN':<14} | {'Amount'}")
    print("-" * 65)
    for c in customers[:3]:
        email = masks['email'] or c['email'] if masks['email'] else c['email']
        # Simpler: apply mask if mask is set
        email_val = masks['email'] if masks['email'] else c['email']
        ssn_val = masks['ssn'] if masks['ssn'] else c['ssn']
        amount_val = '***' if masks['amount'] else f"USD {c['amount']}"
        print(f"{c['customer_id']:<10} | {email_val:<22} | {ssn_val:<14} | {amount_val}")
    print(f"... ({len(customers) - 3} more)")

print()
print("Unity advantage: column-level RBAC + audit log built-in.")
print("Same query, same SQL — Unity injects masks per caller role.")
print("No other catalog matches this depth of governance.")`,
    insight: "Unity Catalog's column-level RBAC is the unique governance feature that no other catalog matches. The same Delta table is queried by different roles — Unity auto-injects masks/filters per role. The audit log captures every access. For sensitive PII lakes (customer, healthcare, finance), this is the killer feature.",
  },
];
