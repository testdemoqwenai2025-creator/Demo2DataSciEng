// ============================================================
// Dataset examples for Phase 2 pages: Kafka Connect + Schema Registry
// 6 examples (3 per page) × 5 languages (Scala/Rust/Go/Elixir/Zig)
// ============================================================

import type { DatasetExample } from "./dataset-cards";
import {
  Database, Atom, Boxes, Zap, TrendingUp, Activity, Cpu, History,
  Workflow, Layers, Network, ShieldCheck, Server, Sparkles, FileText,
  GitBranch,
} from "lucide-react";

// ============================================================
// KAFKA CONNECT — 3 dataset examples
// ============================================================

export const KAFKA_CONNECT_EXAMPLES: DatasetExample[] = [
  {
    id: "kafka-connect-mysql-cdc-iceberg",
    step: "1",
    title: "MySQL CDC (Debezium, synthetic 100M txns/day)",
    subtitle: "Synthetic — binlog → Kafka → Iceberg sink",
    accent: "oklch(0.65 0.18 30)",
    icon: <Database className="h-4 w-4" />,
    badge: "Synthetic Uber-scale CDC",
    brief: {
      dataset: "Synthetic: 100M daily OLTP transactions on a MySQL 8.0 orders table (order_id, customer_id, amount_usd, status, updated_at). Debezium reads the binlog (row-based, NOT trigger-based — zero DB impact).",
      scale: "~100M txns/day · ~36B/year · ~5TB/year compressed · sub-10s end-to-end CDC latency",
      why: "Shows Debezium's binlog CDC into Iceberg via the Kafka Connect Iceberg sink. Trigger-based CDC alternatives would degrade the source DB by 30%+ under this load; Debezium reads binlog off-box.",
    },
    stats: [
      { label: "Txns/day", value: "100M" },
      { label: "CDC latency", value: "<10s" },
      { label: "Binlog rate", value: "~1.2K/s" },
      { label: "Iceberg commits", value: "1/min" },
    ],
    tools: ["Debezium MySQL Connector", "Kafka Connect distributed", "Kafka 3.6+", "Iceberg Sink Connector", "Schema Registry (Avro)", "Trino (read)"],
    codeTabs: [
      {
        lang: "scala",
        filename: "MysqlCdcPipeline.scala",
        code: `import io.debezium.connector.mysql.MySqlConnector
import org.apache.kafka.connect.source.SourceConnector
import org.apache.iceberg.connect.IcebergSinkConnector

// Debezium MySQL source — reads binlog, emits change events to Kafka
val debeziumProps = Map(
  "name"              -> "mysql-orders-cdc",
  "connector.class"   -> classOf[MySqlConnector].getName,
  "database.hostname" -> "mysql.orders.svc",
  "database.port"     -> "3306",
  "database.user"     -> "debezium-ro",
  "database.password" -> sys.env("DEBEZIUM_PW"),
  "database.server.id" -> "184054",
  "database.include.list" -> "orders_db",
  "table.include.list"    -> "orders_db.orders_fct",
  "database.history.kafka.bootstrap.servers" -> "kafka:9092",
  "database.history.kafka.topic"              -> "schema-changes.orders",
  "snapshot.mode"    -> "initial",  // full-table snapshot first, then binlog
  "key.converter"    -> "io.confluent.connect.avro.AvroConverter",
  "value.converter"  -> "io.confluent.connect.avro.AvroConverter",
  "value.converter.schema.registry.url" -> "http://schema-registry:8081"
)
ConnectRest.createConnector(debeziumProps)

// Iceberg sink — consumes from Kafka, commits to Iceberg every 60s
val icebergSink = Map(
  "name"            -> "iceberg-orders-sink",
  "connector.class" -> classOf[IcebergSinkConnector].getName,
  "topics"          -> "orders_db.orders_fct",
  "iceberg.tables"  -> "warehouse.orders_fct",
  "iceberg.catalog.type" -> "rest",
  "iceberg.catalog.uri"  -> "https://catalog.moderndatascieng.com",
  "iceberg.warehouse"    -> "s3://moderndatascieng-iceberg",
  "iceberg.control.commit.interval-ms" -> "60000",  // 1-minute commits
  "iceberg.control.commit.thread-count" -> "4",
  "iceberg.tables.auto-create-enabled"  -> "true",
  "iceberg.tables.evolve-schema-enabled" -> "true"  // auto-evolve on schema change
)
ConnectRest.createConnector(icebergSink)

// Validate: query Iceberg through Trino, expect ~100M rows/day increment
val rs = Trino.query(
  """SELECT date(order_ts) AS d, count(*) AS n
     |FROM iceberg.orders_fct
     |WHERE order_ts >= current_date - 7
     |GROUP BY 1 ORDER BY 1 DESC""".stripMargin)
rs.foreach(println)`,
      },
      {
        lang: "rust",
        filename: "mysql_cdc_pipeline.rs",
        code: `use debezium_rs::mysql::MySqlConnector;
use iceberg_connect::IcebergSinkConnector;
use kafka_connect_rest::ConnectClient;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let connect = ConnectClient::new("http://kafka-connect:8083");

    // Debezium MySQL source — binlog-based CDC (zero DB impact)
    let source = MySqlConnector::builder()
        .hostname("mysql.orders.svc")
        .port(3306)
        .user("debezium-ro")
        .password(&std::env::var("DEBEZIUM_PW")?)
        .server_id(184054)
        .database("orders_db")
        .table_whitelist(&["orders_fct"])
        .snapshot_mode(debezium_rs::SnapshotMode::Initial)
        .history_topic("schema-changes.orders")
        .schema_registry("http://schema-registry:8081")
        .build()?;

    connect.create_connector("mysql-orders-cdc", &source.into_config()).await?;
    println!("[source] mysql-orders-cdc created — binlog streaming to Kafka");

    // Iceberg sink — micro-batched commits every 60s
    let sink = IcebergSinkConnector::builder()
        .topics(&["orders_db.orders_fct"])
        .iceberg_tables(&["warehouse.orders_fct"])
        .catalog_uri("https://catalog.moderndatascieng.com")
        .warehouse("s3://moderndatascieng-iceberg")
        .commit_interval_ms(60_000)
        .commit_threads(4)
        .auto_create(true)
        .evolve_schema(true)
        .build()?;

    connect.create_connector("iceberg-orders-sink", &sink.into_config()).await?;
    println!("[sink] iceberg-orders-sink created — committing every 60s");

    // Watch the connect REST for tasks failed
    loop {
        let status = connect.connector_status("iceberg-orders-sink").await?;
        if status.failed_tasks > 0 {
            eprintln!("Sink tasks failed: {}", status.failed_tasks);
            break;
        }
        tokio::time::sleep(std::time::Duration::from_secs(30)).await;
    }
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "mysql_cdc_pipeline.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"
    "time"

    connect "github.com/kafka-connect/kafka-connect-go"
    debezium "github.com/debezium/debezium-connector-go"
    iceberg "github.com/apache/iceberg-connect-go"
)

func main() {
    ctx := context.Background()
    client := connect.NewClient("http://kafka-connect:8083")

    // Debezium MySQL source — binlog → Kafka
    source := debezium.MySqlConfig{
        Hostname:           "mysql.orders.svc",
        Port:               3306,
        User:               "debezium-ro",
        Password:           mustEnv("DEBEZIUM_PW"),
        ServerID:           184054,
        Database:           "orders_db",
        TableIncludeList:   []string{"orders_fct"},
        SnapshotMode:       "initial",
        HistoryTopic:       "schema-changes.orders",
        SchemaRegistryURL:  "http://schema-registry:8081",
    }
    if err := client.CreateConnector(ctx, "mysql-orders-cdc", source.Config()); err != nil {
        log.Fatalf("source: %v", err)
    }
    fmt.Println("[source] mysql-orders-cdc created")

    // Iceberg sink — 60s micro-batch commits
    sink := iceberg.SinkConfig{
        Topics:           []string{"orders_db.orders_fct"},
        IcebergTables:    []string{"warehouse.orders_fct"},
        CatalogType:      "rest",
        CatalogURI:       "https://catalog.moderndatascieng.com",
        Warehouse:        "s3://moderndatascieng-iceberg",
        CommitIntervalMs: 60000,
        CommitThreads:    4,
        AutoCreate:       true,
        EvolveSchema:     true,
    }
    if err := client.CreateConnector(ctx, "iceberg-orders-sink", sink.Config()); err != nil {
        log.Fatalf("sink: %v", err)
    }
    fmt.Println("[sink] iceberg-orders-sink created")

    // Watch task health
    for {
        status, _ := client.ConnectorStatus(ctx, "iceberg-orders-sink")
        if status.FailedTasks > 0 {
            log.Fatalf("sink failed: %d tasks", status.FailedTasks)
        }
        time.Sleep(30 * time.Second)
    }
}

func mustEnv(k string) string {
    v := os.Getenv(k)
    if v == "" { log.Fatalf("missing env %s", k) }
    return v
}`,
      },
      {
        lang: "elixir",
        filename: "mysql_cdc_pipeline.ex",
        code: `defmodule KafkaConnect.MysqlCdc do
  @moduledoc "Debezium MySQL binlog CDC → Kafka → Iceberg sink"
  @connect_url "http://kafka-connect:8083"

  def deploy do
    # Debezium MySQL source — zero-impact binlog tail
    source = %{
      "name" => "mysql-orders-cdc",
      "config" => %{
        "connector.class" => "io.debezium.connector.mysql.MySqlConnector",
        "database.hostname" => "mysql.orders.svc",
        "database.port" => "3306",
        "database.user" => "debezium-ro",
        "database.password" => System.get_env("DEBEZIUM_PW"),
        "database.server.id" => "184054",
        "database.include.list" => "orders_db",
        "table.include.list" => "orders_db.orders_fct",
        "snapshot.mode" => "initial",
        "database.history.kafka.topic" => "schema-changes.orders",
        "value.converter" => "io.confluent.connect.avro.AvroConverter",
        "value.converter.schema.registry.url" => "http://schema-registry:8081"
      }
    }
    {:ok, _} = ConnectRest.create(@connect_url, source)
    IO.puts("[source] mysql-orders-cdc deployed")

    # Iceberg sink — 60s micro-batch commits, auto-evolve schema
    sink = %{
      "name" => "iceberg-orders-sink",
      "config" => %{
        "connector.class" => "org.apache.iceberg.connect.IcebergSinkConnector",
        "topics" => "orders_db.orders_fct",
        "iceberg.tables" => "warehouse.orders_fct",
        "iceberg.catalog.type" => "rest",
        "iceberg.catalog.uri" => "https://catalog.moderndatascieng.com",
        "iceberg.warehouse" => "s3://moderndatascieng-iceberg",
        "iceberg.control.commit.interval-ms" => "60000",
        "iceberg.tables.auto-create-enabled" => "true",
        "iceberg.tables.evolve-schema-enabled" => "true"
      }
    }
    {:ok, _} = ConnectRest.create(@connect_url, sink)
    IO.puts("[sink] iceberg-orders-sink deployed")
  end

  def watch do
    Stream.interval(30_000)
    |> Stream.map(fn _ -> ConnectRest.status(@connect_url, "iceberg-orders-sink") end)
    |> Enum.each(fn %{failed: n} -> if n > 0, do: IO.puts("WARN: #{n} tasks failed") end)
  end
end`,
      },
      {
        lang: "zig",
        filename: "mysql_cdc_pipeline.zig",
        code: `const std = @import("std");
const connect = @import("kafka-connect-zig");
const debezium = @import("debezium-zig");
const iceberg = @import("iceberg-sink-zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const alloc = gpa.allocator();

    var client = try connect.Client.init(alloc, "http://kafka-connect:8083");
    defer client.deinit();

    // Debezium MySQL source — binlog → Kafka
    var source = debezium.MysqlConfig.init(alloc);
    defer source.deinit();
    source.hostname("mysql.orders.svc").port(3306).user("debezium-ro");
    source.password(std.posix.getenv("DEBEZIUM_PW") orelse "");
    source.server_id(184054).database("orders_db").table_list("orders_fct");
    source.snapshot_mode(.initial).history_topic("schema-changes.orders");
    source.schema_registry("http://schema-registry:8081");

    try client.create_connector("mysql-orders-cdc", &source);
    std.debug.print("[source] mysql-orders-cdc created\\n", .{});

    // Iceberg sink — 60s micro-batches
    var sink = iceberg.SinkConfig.init(alloc);
    defer sink.deinit();
    sink.topics(&[_][]const u8{"orders_db.orders_fct"});
    sink.tables(&[_][]const u8{"warehouse.orders_fct"});
    sink.catalog_uri("https://catalog.moderndatascieng.com");
    sink.warehouse("s3://moderndatascieng-iceberg");
    sink.commit_interval_ms(60_000).commit_threads(4);
    sink.auto_create(true).evolve_schema(true);

    try client.create_connector("iceberg-orders-sink", &sink);
    std.debug.print("[sink] iceberg-orders-sink created\\n", .{});

    // Health check loop
    while (true) {
        const status = try client.connector_status("iceberg-orders-sink");
        if (status.failed > 0) {
            std.debug.print("FAIL: {d} tasks failed\\n", .{status.failed});
            break;
        }
        std.time.sleep(30 * std.time.ns_per_s);
    }
}`,
      },
    ],
    runnablePython: `# MySQL CDC pipeline simulation — binlog → Kafka → Iceberg snapshot
import random
from collections import defaultdict

random.seed(42)
print("=== MySQL CDC (Debezium) → Kafka → Iceberg sink simulation ===")
print("Scale: 100M txns/day on orders.orders_fct (synthetic 1:1000 sample)\\n")

# Simulate 100K OLTP txns (1:1000 scale-down)
n_txns = 100_000
ops = ['INSERT', 'UPDATE', 'DELETE']
op_weights = [0.65, 0.30, 0.05]
statuses = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']

# Binlog tail — change events per second
binlog_rate_per_sec = 1200  # ~100M/day
events_committed = 0
iceberg_commit_every_s = 60  # Iceberg commits 1/min

# Walk through 5 minutes of binlog traffic
def simulate_binlog(n_minutes=5):
    global events_committed
    snapshots = []
    pending_events = []
    for minute in range(n_minutes):
        for sec in range(60):
            n_this_sec = int(binlog_rate_per_sec * random.uniform(0.85, 1.15))
            for _ in range(n_this_sec):
                op = random.choices(ops, op_weights)[0]
                txn = {
                    'order_id': random.randint(1, 5_000_000),
                    'op': op,
                    'amount_usd': round(random.uniform(10, 500), 2),
                    'status': random.choice(statuses),
                    'binlog_ts': minute * 60 + sec,
                }
                pending_events.append(txn)
                events_committed += 1
        # Iceberg commit at the end of each minute
        snapshots.append({
            'snapshot_id': len(snapshots) + 1,
            'events': len(pending_events),
            'minute': minute,
        })
        pending_events = []
    return snapshots

snapshots = simulate_binlog(5)
total = sum(s['events'] for s in snapshots)
print(f"5-minute simulation: {total:,} change events into Iceberg")
print(f"Snapshots committed: {len(snapshots)}")
for s in snapshots:
    print(f"  snapshot {s['snapshot_id']}: {s['events']:,} events at minute {s['minute']}")

# Estimate end-to-end latency
binlog_to_kafka_ms = 200  # Debezium binlog → Kafka
kafka_to_iceberg_ms = (iceberg_commit_every_s * 1000) // 2  # avg half commit interval
print(f"\\nEnd-to-end CDC latency: {binlog_to_kafka_ms + kafka_to_iceberg_ms}ms (Debezium + half commit interval)")
print(f"Throughput: {total/5/60:.0f} events/sec (scales to 100M/day on real load)")
print("\\nKey insight: binlog CDC has zero source-DB load — Debezium reads")
print("the binlog off-box via replication. Trigger-based CDC would degrade")
print("source DB by 30%+ under this throughput.")`,
    insight: "Binlog-based CDC is non-invasive — Debezium reads MySQL binlog via replication, NOT triggers. The source DB doesn't even know CDC is happening. The Iceberg sink's 60s micro-batch commit creates one new snapshot per minute (86,400 snapshots/year if never expired), which Iceberg's GC handles via `expire_snapshots` (keep last 90 days).",
  },
  {
    id: "kafka-connect-postgres-wal-delta",
    step: "2",
    title: "PostgreSQL logical replication (synthetic 50M txns/day)",
    subtitle: "Synthetic — WAL → Kafka → Delta Lake",
    accent: "oklch(0.62 0.16 200)",
    icon: <Workflow className="h-4 w-4" />,
    badge: "Synthetic FinTech-scale CDC",
    brief: {
      dataset: "Synthetic: 50M daily financial transactions on a PostgreSQL 16 trades table (trade_id, account_id, notional_usd, qty, side, executed_at). Debezium reads logical replication slot (pgoutput plugin — WAL-based, no triggers).",
      scale: "~50M txns/day · ~18B/year · ~3TB/year compressed · sub-15s CDC latency · MERGE into Delta",
      why: "Shows PostgreSQL WAL-based CDC into Delta Lake (Databricks format). pgoutput plugin gives native logical replication without pglogical extension. The Delta sink MERGEs (upsert) rather than appends — preserves primary key uniqueness.",
    },
    stats: [
      { label: "Txns/day", value: "50M" },
      { label: "CDC latency", value: "<15s" },
      { label: "WAL rate", value: "~580/s" },
      { label: "Delta commits", value: "30s micro-batch" },
    ],
    tools: ["Debezium Postgres Connector", "pgoutput plugin", "Kafka 3.6+", "Delta Lake Sink", "Delta Standalone Reader", "Databricks SQL"],
    codeTabs: [
      {
        lang: "scala",
        filename: "PostgresCdcDeltaPipeline.scala",
        code: `import io.debezium.connector.postgresql.PostgresConnector
import org.apache.delta.connect.DeltaSinkConnector

// Debezium PostgreSQL source — reads logical replication slot (pgoutput)
// No trigger-based polling, no pglogical extension required (Postgres 10+)
val sourceProps = Map(
  "name"              -> "pg-trades-cdc",
  "connector.class"   -> classOf[PostgresConnector].getName,
  "database.hostname" -> "pg.trades.svc",
  "database.port"     -> "5432",
  "database.user"     -> "debezium-ro",
  "database.password" -> sys.env("DEBEZIUM_PW"),
  "database.dbname"   -> "trades_db",
  "plugin.name"       -> "pgoutput",  // native PG10+ logical replication
  "slot.name"         -> "debezium_trades",
  "publication.name"  -> "dbz_trades_pub",
  "table.include.list" -> "public.trades_fct",
  "snapshot.mode"     -> "initial",
  "key.converter"     -> "io.confluent.connect.avro.AvroConverter",
  "value.converter"   -> "io.confluent.connect.avro.AvroConverter",
  "value.converter.schema.registry.url" -> "http://schema-registry:8081"
)
ConnectRest.createConnector(sourceProps)

// Delta sink — MERGEs by trade_id (upsert, NOT append)
val deltaSinkProps = Map(
  "name"              -> "delta-trades-sink",
  "connector.class"   -> classOf[DeltaSinkConnector].getName,
  "topics"            -> "trades_db.public.trades_fct",
  "delta.tables"     -> "warehouse.trades_fct",
  "delta.catalog.type" -> "unity",
  "delta.catalog.uri"  -> "https://catalog.databricks.com",
  "delta.warehouse"   -> "s3://moderndatascieng-delta",
  "delta.merge.mode"  -> "MERGE",  // upsert by trade_id (vs APPEND)
  "delta.merge.keys"  -> "trade_id",
  "delta.commit.interval-ms" -> "30000",  // 30s micro-batches
  "delta.autoCompact" -> "true",
  "delta.optimizeWrite" -> "true"
)
ConnectRest.createConnector(deltaSinkProps)

// Verify: query Delta through Databricks SQL
val rs = DatabricksSql.query(
  """SELECT count(*) AS n, max(executed_at) AS latest
     |FROM delta.trades_db.trades_fct""".stripMargin)
rs.show()`,
      },
      {
        lang: "rust",
        filename: "postgres_cdc_pipeline.rs",
        code: `use debezium_rs::postgres::{PostgresConnector, Plugin};
use delta_connect::DeltaSinkConnector;
use kafka_connect_rest::ConnectClient;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let connect = ConnectClient::new("http://kafka-connect:8083");

    // Debezium Postgres source — pgoutput logical replication (native PG10+)
    let source = PostgresConnector::builder()
        .hostname("pg.trades.svc")
        .port(5432)
        .user("debezium-ro")
        .password(&std::env::var("DEBEZIUM_PW")?)
        .dbname("trades_db")
        .plugin(Plugin::PgOutput)  // native — no pglogical extension needed
        .slot_name("debezium_trades")
        .publication_name("dbz_trades_pub")
        .table_whitelist(&["public.trades_fct"])
        .snapshot_mode(debezium_rs::SnapshotMode::Initial)
        .schema_registry("http://schema-registry:8081")
        .build()?;

    connect.create_connector("pg-trades-cdc", &source.into_config()).await?;
    println!("[source] pg-trades-cdc created — logical slot streaming");

    // Delta sink — MERGE by trade_id (upsert, not append)
    let sink = DeltaSinkConnector::builder()
        .topics(&["trades_db.public.trades_fct"])
        .delta_tables(&["warehouse.trades_fct"])
        .catalog_uri("https://catalog.databricks.com")
        .warehouse("s3://moderndatascieng-delta")
        .merge_mode(delta_connect::MergeMode::Merge)
        .merge_keys(&["trade_id"])
        .commit_interval_ms(30_000)
        .auto_compact(true)
        .optimize_write(true)
        .build()?;

    connect.create_connector("delta-trades-sink", &sink.into_config()).await?;
    println!("[sink] delta-trades-sink created — MERGE by trade_id every 30s");

    // Monitor lag
    loop {
        let metrics = connect.connector_metrics("pg-trades-cdc").await?;
        let lag = metrics.get("source-record-poll-rate").unwrap_or(0.0);
        if lag < 1.0 {
            eprintln!("WARN: source poll rate dropped to {lag}/s");
        }
        tokio::time::sleep(std::time::Duration::from_secs(60)).await;
    }
}`,
      },
      {
        lang: "go",
        filename: "postgres_cdc_pipeline.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"
    "os"
    "time"

    connect "github.com/kafka-connect/kafka-connect-go"
    debezium "github.com/debezium/debezium-connector-go"
    delta "github.com/databricks/delta-connect-go"
)

func main() {
    ctx := context.Background()
    client := connect.NewClient("http://kafka-connect:8083")

    // Debezium Postgres source — pgoutput logical replication
    source := debezium.PostgresConfig{
        Hostname:           "pg.trades.svc",
        Port:               5432,
        User:               "debezium-ro",
        Password:           os.Getenv("DEBEZIUM_PW"),
        Database:           "trades_db",
        Plugin:             "pgoutput",  // native PG10+, no pglogical
        SlotName:           "debezium_trades",
        PublicationName:    "dbz_trades_pub",
        TableIncludeList:   []string{"public.trades_fct"},
        SnapshotMode:       "initial",
        SchemaRegistryURL:  "http://schema-registry:8081",
    }
    if err := client.CreateConnector(ctx, "pg-trades-cdc", source.Config()); err != nil {
        log.Fatalf("source: %v", err)
    }
    fmt.Println("[source] pg-trades-cdc created")

    // Delta sink — MERGE upsert by trade_id every 30s
    sink := delta.SinkConfig{
        Topics:            []string{"trades_db.public.trades_fct"},
        DeltaTables:       []string{"warehouse.trades_fct"},
        CatalogType:       "unity",
        CatalogURI:        "https://catalog.databricks.com",
        Warehouse:         "s3://moderndatascieng-delta",
        MergeMode:         "MERGE",
        MergeKeys:         []string{"trade_id"},
        CommitIntervalMs:   30000,
        AutoCompact:       true,
        OptimizeWrite:     true,
    }
    if err := client.CreateConnector(ctx, "delta-trades-sink", sink.Config()); err != nil {
        log.Fatalf("sink: %v", err)
    }
    fmt.Println("[sink] delta-trades-sink created — MERGE every 30s")

    // Monitor binlog lag
    for {
        m, _ := client.ConnectorMetrics(ctx, "pg-trades-cdc")
        if m.SourceRecordPollRate < 1.0 {
            log.Printf("WARN: poll rate %.1f/s", m.SourceRecordPollRate)
        }
        time.Sleep(60 * time.Second)
    }
}`,
      },
      {
        lang: "elixir",
        filename: "postgres_cdc_pipeline.ex",
        code: `defmodule KafkaConnect.PostgresCdcDelta do
  @moduledoc "PostgreSQL pgoutput → Kafka → Delta MERGE sink"
  @connect_url "http://kafka-connect:8083"

  def deploy do
    source = %{
      "name" => "pg-trades-cdc",
      "config" => %{
        "connector.class" => "io.debezium.connector.postgresql.PostgresConnector",
        "database.hostname" => "pg.trades.svc",
        "database.port" => "5432",
        "database.user" => "debezium-ro",
        "database.password" => System.get_env("DEBEZIUM_PW"),
        "database.dbname" => "trades_db",
        "plugin.name" => "pgoutput",
        "slot.name" => "debezium_trades",
        "publication.name" => "dbz_trades_pub",
        "table.include.list" => "public.trades_fct",
        "snapshot.mode" => "initial",
        "value.converter" => "io.confluent.connect.avro.AvroConverter",
        "value.converter.schema.registry.url" => "http://schema-registry:8081"
      }
    }
    {:ok, _} = ConnectRest.create(@connect_url, source)
    IO.puts("[source] pg-trades-cdc deployed — pgoutput logical slot")

    sink = %{
      "name" => "delta-trades-sink",
      "config" => %{
        "connector.class" => "io.delta.connect.DeltaSinkConnector",
        "topics" => "trades_db.public.trades_fct",
        "delta.tables" => "warehouse.trades_fct",
        "delta.catalog.type" => "unity",
        "delta.catalog.uri" => "https://catalog.databricks.com",
        "delta.warehouse" => "s3://moderndatascieng-delta",
        "delta.merge.mode" => "MERGE",
        "delta.merge.keys" => "trade_id",
        "delta.commit.interval-ms" => "30000",
        "delta.autoCompact" => "true",
        "delta.optimizeWrite" => "true"
      }
    }
    {:ok, _} = ConnectRest.create(@connect_url, sink)
    IO.puts("[sink] delta-trades-sink deployed — MERGE by trade_id every 30s")
  end

  def monitor_lag do
    Stream.interval(60_000)
    |> Stream.map(fn _ -> ConnectRest.metrics(@connect_url, "pg-trades-cdc") end)
    |> Enum.each(fn %{poll_rate: r} ->
      if r < 1.0, do: IO.puts("WARN: poll rate #{r}/s — possible slot lag")
    end)
  end
end`,
      },
      {
        lang: "zig",
        filename: "postgres_cdc_pipeline.zig",
        code: `const std = @import("std");
const connect = @import("kafka-connect-zig");
const debezium = @import("debezium-zig");
const delta = @import("delta-sink-zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const alloc = gpa.allocator();

    var client = try connect.Client.init(alloc, "http://kafka-connect:8083");
    defer client.deinit();

    // Debezium Postgres source — pgoutput logical replication
    var source = debezium.PostgresConfig.init(alloc);
    defer source.deinit();
    source.hostname("pg.trades.svc").port(5432).user("debezium-ro");
    source.password(std.posix.getenv("DEBEZIUM_PW") orelse "");
    source.dbname("trades_db").plugin(.pgoutput);
    source.slot_name("debezium_trades").publication_name("dbz_trades_pub");
    source.table_list("public.trades_fct");
    source.snapshot_mode(.initial);
    source.schema_registry("http://schema-registry:8081");

    try client.create_connector("pg-trades-cdc", &source);
    std.debug.print("[source] pg-trades-cdc created\\n", .{});

    // Delta sink — MERGE by trade_id, 30s commits
    var sink = delta.SinkConfig.init(alloc);
    defer sink.deinit();
    sink.topics(&[_][]const u8{"trades_db.public.trades_fct"});
    sink.tables(&[_][]const u8{"warehouse.trades_fct"});
    sink.catalog_uri("https://catalog.databricks.com");
    sink.warehouse("s3://moderndatascieng-delta");
    sink.merge_mode(.merge).merge_keys(&[_][]const u8{"trade_id"});
    sink.commit_interval_ms(30_000);
    sink.auto_compact(true).optimize_write(true);

    try client.create_connector("delta-trades-sink", &sink);
    std.debug.print("[sink] delta-trades-sink created\\n", .{});

    while (true) {
        const m = try client.connector_metrics("pg-trades-cdc");
        if (m.poll_rate < 1.0)
            std.debug.print("WARN: poll rate {d:.2}/s\\n", .{m.poll_rate});
        std.time.sleep(60 * std.time.ns_per_s);
    }
}`,
      },
    ],
    runnablePython: `# PostgreSQL WAL → Delta MERGE simulation
import random
from collections import defaultdict

random.seed(7)
print("=== PostgreSQL logical replication → Delta MERGE simulation ===")
print("Scale: 50M txns/day on trades_fct (synthetic 1:1000 sample)\\n")

# 50K sample txns (1:1000 scale-down)
n_txns = 50_000
trade_ids_pool = list(range(1, 5_000_001))  # 5M unique trades
random.shuffle(trade_ids_pool)

# Debezium emits logical replication messages
ops_weights = {'INSERT': 0.7, 'UPDATE': 0.25, 'DELETE': 0.05}
sides = ['BUY', 'SELL']
tickers = ['AAPL', 'MSFT', 'GOOG', 'TSLA', 'NVDA', 'AMZN', 'META', 'JPM']

# Delta MERGE: keyed by trade_id — updates overwrite, deletes tombstone
def simulate_delta_merge(events):
    delta_state = {}  # trade_id → latest row
    deletes = 0
    for e in events:
        if e['op'] == 'DELETE':
            delta_state.pop(e['trade_id'], None)
            deletes += 1
        else:
            delta_state[e['trade_id']] = e
    return delta_state, deletes

# Generate 1 minute of WAL events (~580 events/sec on real load, 580 here)
def gen_events(n):
    out = []
    for _ in range(n):
        op = random.choices(list(ops_weights), list(ops_weights.values()))[0]
        out.append({
            'trade_id': random.choice(trade_ids_pool),
            'op': op,
            'ticker': random.choice(tickers),
            'side': random.choice(sides),
            'qty': random.randint(100, 5000),
            'notional_usd': round(random.uniform(1000, 500000), 2),
            'executed_at': random.randint(1700000000, 1700000060),
        })
    return out

# Simulate 5 Delta commits (30s each = 2.5 minutes)
print("Delta MERGE commits (every 30s):")
total_state = {}
total_deletes = 0
for commit_i in range(5):
    events = gen_events(580 * 30)  # 30s worth at 580/s
    state, deletes = simulate_delta_merge(events)
    total_state.update(state)
    total_deletes += deletes
    print(f"  commit {commit_i+1}: {len(events)} events, "
          f"{len(state)} unique trades MERGED, {deletes} tombstones")

print(f"\\nFinal Delta state: {len(total_state):,} unique trades")
print(f"Total tombstones (deletes): {total_deletes:,}")
print(f"Effective MERGE ratio: {len(total_state) / (5 * 580 * 30):.2%}")
print("  (most MERGEs are updates to existing trade_ids — preserves PK uniqueness)")
print("\\nKey insight: pgoutput plugin gives native PG10+ logical replication")
print("WITHOUT requiring pglogical extension. The Delta sink MERGEs (vs append)")
print("so trade_id stays unique across snapshots — no dedup needed downstream.")`,
    insight: "PostgreSQL's pgoutput plugin (PG 10+) gives native logical replication WITHOUT requiring pglogical extension — Debezium just creates a slot + publication. The Delta sink MERGEs by trade_id so primary key uniqueness is preserved across snapshots. Delta's auto-compaction + Z-Order is invoked by the sink connector every 256 commits (≈2 hours at 30s cadence).",
  },
  {
    id: "kafka-connect-mongodb-oplog-hudi",
    step: "3",
    title: "MongoDB change streams (synthetic 10M docs)",
    subtitle: "Synthetic — oplog → Kafka → Hudi MOR",
    accent: "oklch(0.6 0.18 145)",
    icon: <Network className="h-4 w-4" />,
    badge: "Synthetic IoT-scale CDC",
    brief: {
      dataset: "Synthetic: 10M document mutations/day on a MongoDB 7.0 user_profiles collection (user_id, email_hash, region, preferences[], last_login). Debezium tails the oplog (replication log).",
      scale: "~10M mutations/day · ~115/sec sustained · burst to 5K/sec · Hudi MERGE_ON_READ (MOR) for sub-minute read latency",
      why: "Shows MongoDB CDC into Hudi Merge-On-Read (MOR) — the only open table format designed for streaming CDC. MOR writes delta logs (small) and merges on read; COW would rewrite the entire base file on every update — infeasible at 5K/sec bursts.",
    },
    stats: [
      { label: "Docs/day", value: "10M" },
      { label: "Burst rate", value: "5K/sec" },
      { label: "MOR commits", value: "1/min" },
      { label: "Compaction", value: "Hourly" },
    ],
    tools: ["Debezium MongoDB Connector", "MongoDB 7.0 oplog", "Kafka 3.6+", "Hudi MOR Sink", "hoodie-cli", "Spark (compaction)"],
    codeTabs: [
      {
        lang: "scala",
        filename: "MongoCdcHudiPipeline.scala",
        code: `import io.debezium.connector.mongodb.MongoDbConnector
import org.apache.hudi.connect.HudiSinkConnector

// Debezium MongoDB source — tails the oplog (replication log)
val sourceProps = Map(
  "name"              -> "mongo-profiles-cdc",
  "connector.class"   -> classOf[MongoDbConnector].getName,
  "mongodb.hosts"     -> "rs0/mongo.profiles.svc:27017",
  "mongodb.name"      -> "profiles_rs0",
  "mongodb.user"      -> "debezium-ro",
  "mongodb.password"  -> sys.env("MONGO_PW"),
  "database.include.list" -> "profiles_db",
  "collection.include.list" -> "profiles_db.user_profiles",
  "mongodb.poll.interval.ms" -> "1000",  // poll oplog every second
  "mongodb.ssl.enabled" -> "true",
  "key.converter"     -> "io.confluent.connect.avro.AvroConverter",
  "value.converter"   -> "io.confluent.connect.avro.AvroConverter",
  "value.converter.schema.registry.url" -> "http://schema-registry:8081"
)
ConnectRest.createConnector(sourceProps)

// Hudi MOR sink — designed for high-update CDC workloads
// MOR writes to delta-log (small), merges on read (sub-minute read latency)
val hudiSinkProps = Map(
  "name"              -> "hudi-profiles-sink",
  "connector.class"   -> classOf[HudiSinkConnector].getName,
  "topics"            -> "profiles_db.user_profiles",
  "hudi.table.type"   -> "MERGE_ON_READ",  // NOT COPY_ON_WRITE — key for CDC
  "hudi.table.name"   -> "user_profiles_mor",
  "hudi.database.name" -> "profiles",
  "hudi.record.key"   -> "user_id",
  "hudi.partition.path" -> "region",  // partition by region
  "hudi.precombine"   -> "last_login",  // latest last_login wins on MERGE
  "hudi.write.operation" -> "upsert",
  "hudi.commit.interval.ms" -> "60000",  // 1-min commits
  "hudi.compact.inline" -> "false",  // async compaction (hourly)
  "hudi.compact.schedule" -> "0 0 * * * ?"  // cron: hourly
)
ConnectRest.createConnector(hudiSinkProps)

// Verify MOR read-optimised view via Spark
val df = spark.read.format("hudi")
  .option("hoodie.datasource.query.type", "read_optimized")  // fast (delta + base merged)
  .load("s3://moderndatascieng-hudi/profiles/user_profiles_mor")
  .filter("region = 'EU' AND last_login >= current_date() - 1")
df.count()`,
      },
      {
        lang: "rust",
        filename: "mongo_cdc_pipeline.rs",
        code: `use debezium_rs::mongodb::MongoDbConnector;
use hudi_connect::HudiSinkConnector;
use kafka_connect_rest::ConnectClient;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let connect = ConnectClient::new("http://kafka-connect:8083");

    // Debezium MongoDB source — oplog tailing
    let source = MongoDbConnector::builder()
        .hosts(&["rs0/mongo.profiles.svc:27017"])
        .name("profiles_rs0")
        .user("debezium-ro")
        .password(&std::env::var("MONGO_PW")?)
        .database_whitelist(&["profiles_db"])
        .collection_whitelist(&["profiles_db.user_profiles"])
        .poll_interval_ms(1000)
        .ssl_enabled(true)
        .schema_registry("http://schema-registry:8081")
        .build()?;

    connect.create_connector("mongo-profiles-cdc", &source.into_config()).await?;
    println!("[source] mongo-profiles-cdc created — oplog tailing");

    // Hudi MOR sink — designed for high-update CDC
    let sink = HudiSinkConnector::builder()
        .topics(&["profiles_db.user_profiles"])
        .table_type(hudi_connect::TableType::MergeOnRead)  // NOT COW — key for CDC
        .table_name("user_profiles_mor")
        .database_name("profiles")
        .record_key("user_id")
        .partition_path("region")
        .precombine("last_login")
        .write_operation(hudi_connect::WriteOp::Upsert)
        .commit_interval_ms(60_000)
        .compact_inline(false)
        .compact_schedule("0 0 * * * ?")  // hourly async compaction
        .build()?;

    connect.create_connector("hudi-profiles-sink", &sink.into_config()).await?;
    println!("[sink] hudi-profiles-sink created — MOR upsert by user_id");

    // Monitor oplog lag
    loop {
        let m = connect.connector_metrics("mongo-profiles-cdc").await?;
        if let Some(lag) = m.get("source-lag-ms") {
            if lag > 60_000.0 {
                eprintln!("WARN: oplog lag {lag}ms — bottleneck");
            }
        }
        tokio::time::sleep(std::time::Duration::from_secs(15)).await;
    }
}`,
      },
      {
        lang: "go",
        filename: "mongo_cdc_pipeline.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"
    "os"
    "time"

    connect "github.com/kafka-connect/kafka-connect-go"
    debezium "github.com/debezium/debezium-connector-go"
    hudi "github.com/apache/hudi-connect-go"
)

func main() {
    ctx := context.Background()
    client := connect.NewClient("http://kafka-connect:8083")

    // Debezium MongoDB source — oplog tailing
    source := debezium.MongoConfig{
        Hosts:              []string{"rs0/mongo.profiles.svc:27017"},
        Name:               "profiles_rs0",
        User:               "debezium-ro",
        Password:           os.Getenv("MONGO_PW"),
        DatabaseIncludeList: []string{"profiles_db"},
        CollectionIncludeList: []string{"profiles_db.user_profiles"},
        PollIntervalMs:     1000,
        SSLEnabled:         true,
        SchemaRegistryURL:  "http://schema-registry:8081",
    }
    if err := client.CreateConnector(ctx, "mongo-profiles-cdc", source.Config()); err != nil {
        log.Fatalf("source: %v", err)
    }
    fmt.Println("[source] mongo-profiles-cdc created")

    // Hudi MOR sink — designed for high-update CDC
    sink := hudi.SinkConfig{
        Topics:            []string{"profiles_db.user_profiles"},
        TableType:         "MERGE_ON_READ",  // NOT COW — key for CDC
        TableName:         "user_profiles_mor",
        DatabaseName:      "profiles",
        RecordKey:         "user_id",
        PartitionPath:     "region",
        Precombine:        "last_login",
        WriteOperation:    "upsert",
        CommitIntervalMs:  60000,
        CompactInline:     false,
        CompactSchedule:   "0 0 * * * ?",  // hourly async
    }
    if err := client.CreateConnector(ctx, "hudi-profiles-sink", sink.Config()); err != nil {
        log.Fatalf("sink: %v", err)
    }
    fmt.Println("[sink] hudi-profiles-sink created — MOR upsert by user_id")

    // Monitor oplog lag
    for {
        m, _ := client.ConnectorMetrics(ctx, "mongo-profiles-cdc")
        if m.SourceLagMs > 60000 {
            log.Printf("WARN: oplog lag %.0fms", m.SourceLagMs)
        }
        time.Sleep(15 * time.Second)
    }
}`,
      },
      {
        lang: "elixir",
        filename: "mongo_cdc_pipeline.ex",
        code: `defmodule KafkaConnect.MongoCdcHudi do
  @moduledoc "MongoDB oplog → Kafka → Hudi MOR (Merge-on-Read)"
  @connect_url "http://kafka-connect:8083"

  def deploy do
    source = %{
      "name" => "mongo-profiles-cdc",
      "config" => %{
        "connector.class" => "io.debezium.connector.mongodb.MongoDbConnector",
        "mongodb.hosts" => "rs0/mongo.profiles.svc:27017",
        "mongodb.name" => "profiles_rs0",
        "mongodb.user" => "debezium-ro",
        "mongodb.password" => System.get_env("MONGO_PW"),
        "database.include.list" => "profiles_db",
        "collection.include.list" => "profiles_db.user_profiles",
        "mongodb.poll.interval.ms" => "1000",
        "mongodb.ssl.enabled" => "true",
        "value.converter" => "io.confluent.connect.avro.AvroConverter",
        "value.converter.schema.registry.url" => "http://schema-registry:8081"
      }
    }
    {:ok, _} = ConnectRest.create(@connect_url, source)
    IO.puts("[source] mongo-profiles-cdc deployed — oplog tailing")

    sink = %{
      "name" => "hudi-profiles-sink",
      "config" => %{
        "connector.class" => "org.apache.hudi.connect.HudiSinkConnector",
        "topics" => "profiles_db.user_profiles",
        "hudi.table.type" => "MERGE_ON_READ",
        "hudi.table.name" => "user_profiles_mor",
        "hudi.database.name" => "profiles",
        "hudi.record.key" => "user_id",
        "hudi.partition.path" => "region",
        "hudi.precombine" => "last_login",
        "hudi.write.operation" => "upsert",
        "hudi.commit.interval.ms" => "60000",
        "hudi.compact.inline" => "false",
        "hudi.compact.schedule" => "0 0 * * * ?"
      }
    }
    {:ok, _} = ConnectRest.create(@connect_url, sink)
    IO.puts("[sink] hudi-profiles-sink deployed — MOR upsert by user_id")
  end

  def monitor_lag do
    Stream.interval(15_000)
    |> Stream.map(fn _ -> ConnectRest.metrics(@connect_url, "mongo-profiles-cdc") end)
    |> Enum.each(fn %{lag_ms: lag} ->
      if lag > 60_000, do: IO.puts("WARN: oplog lag #{lag}ms")
    end)
  end
end`,
      },
      {
        lang: "zig",
        filename: "mongo_cdc_pipeline.zig",
        code: `const std = @import("std");
const connect = @import("kafka-connect-zig");
const debezium = @import("debezium-zig");
const hudi = @import("hudi-sink-zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const alloc = gpa.allocator();

    var client = try connect.Client.init(alloc, "http://kafka-connect:8083");
    defer client.deinit();

    // Debezium MongoDB source — oplog tailing
    var source = debezium.MongoConfig.init(alloc);
    defer source.deinit();
    source.hosts(&[_][]const u8{"rs0/mongo.profiles.svc:27017"});
    source.name("profiles_rs0").user("debezium-ro");
    source.password(std.posix.getenv("MONGO_PW") orelse "");
    source.databases(&[_][]const u8{"profiles_db"});
    source.collections(&[_][]const u8{"profiles_db.user_profiles"});
    source.poll_interval_ms(1000).ssl_enabled(true);
    source.schema_registry("http://schema-registry:8081");

    try client.create_connector("mongo-profiles-cdc", &source);
    std.debug.print("[source] mongo-profiles-cdc created\\n", .{});

    // Hudi MOR sink — designed for high-update CDC
    var sink = hudi.SinkConfig.init(alloc);
    defer sink.deinit();
    sink.topics(&[_][]const u8{"profiles_db.user_profiles"});
    sink.table_type(.merge_on_read);  // NOT COW — key for CDC
    sink.table_name("user_profiles_mor").database("profiles");
    sink.record_key("user_id").partition_path("region");
    sink.precombine("last_login").write_op(.upsert);
    sink.commit_interval_ms(60_000);
    sink.compact_inline(false);
    sink.compact_schedule("0 0 * * * ?");  // hourly async

    try client.create_connector("hudi-profiles-sink", &sink);
    std.debug.print("[sink] hudi-profiles-sink created\\n", .{});

    while (true) {
        const m = try client.connector_metrics("mongo-profiles-cdc");
        if (m.source_lag_ms > 60_000)
            std.debug.print("WARN: oplog lag {d}ms\\n", .{m.source_lag_ms});
        std.time.sleep(15 * std.time.ns_per_s);
    }
}`,
      },
    ],
    runnablePython: `# MongoDB oplog → Hudi MOR simulation
import random
from collections import defaultdict

random.seed(11)
print("=== MongoDB change streams → Hudi MOR simulation ===")
print("Scale: 10M doc mutations/day (synthetic 1:1000 sample)\\n")

# Hudi MOR: writes go to delta-log (small), merge on read
# vs COW: every update rewrites entire base Parquet file (infeasible at burst)
n_mutations = 10_000  # 1:1000 scale-down
user_ids_pool = list(range(1, 1_000_001))  # 1M unique users
regions = ['NA', 'EU', 'APAC', 'LATAM', 'MEA']
ops_weights = {'INSERT': 0.1, 'UPDATE': 0.85, 'DELETE': 0.05}

# Simulate Hudi MOR vs COW write cost
class HudiMorTable:
    def __init__(self):
        self.base_files = defaultdict(dict)  # region -> {user_id: doc}
        self.delta_logs = defaultdict(list)  # region -> [events]
        self.commit_count = 0

    def upsert(self, event):
        region = event['region']
        self.delta_logs[region].append(event)
        # When delta log exceeds threshold, flush to base
        if len(self.delta_logs[region]) > 1000:
            for e in self.delta_logs[region]:
                if e['op'] == 'DELETE':
                    self.base_files[region].pop(e['user_id'], None)
                else:
                    self.base_files[region][e['user_id']] = e
            self.delta_logs[region] = []

    def read(self, region):
        # Merge base + delta on read
        merged = dict(self.base_files[region])
        for e in self.delta_logs[region]:
            if e['op'] == 'DELETE':
                merged.pop(e['user_id'], None)
            else:
                merged[e['user_id']] = e
        return merged

class HudiCowTable:
    def __init__(self):
        self.base_files = defaultdict(dict)
        self.rewrite_count = 0

    def upsert(self, event):
        region = event['region']
        # COW: rewrite the ENTIRE region file on every update (infeasible at burst)
        self.base_files[region][event['user_id']] = event
        self.rewrite_count += 1  # every upsert = 1 file rewrite

    def read(self, region):
        return self.base_files[region]

# Generate mutations
events = [{
    'user_id': random.choice(user_ids_pool),
    'op': random.choices(list(ops_weights), list(ops_weights.values()))[0],
    'region': random.choice(regions),
    'last_login': random.randint(1700000000, 1700000060),
    'email_hash': f"hash_{random.randint(0, 99999)}",
} for _ in range(n_mutations)]

# Benchmark MOR vs COW
mor = HudiMorTable()
cow = HudiCowTable()
for e in events:
    mor.upsert(e)
    cow.upsert(e)

print(f"Mutations: {n_mutations:,}")
print(f"\\nHudi MOR:")
print(f"  Base file rewrites: 0 (writes go to delta-log)")
print(f"  Delta log entries pending: {sum(len(v) for v in mor.delta_logs.values()):,}")
print(f"  Read latency (region EU): {len(mor.read('EU'))} users merged on read")
print(f"\\nHudi COW (counterfactual):")
print(f"  Base file rewrites: {cow.rewrite_count:,} (every upsert rewrites entire region file!)")
print(f"  At 5K/sec burst, COW would do 5K rewrites/sec = infeasible")

print("\\nKey insight: MOR writes small delta logs + merges on read.")
print("COW would rewrite entire base Parquet on every update — only viable")
print("for append-heavy or low-update workloads. CDC demands MOR.")`,
    insight: "Hudi's MERGE_ON_READ (MOR) is the only open table format designed for streaming CDC at burst rates. MOR writes small delta logs (incremental), and merges them with the base Parquet on read. The alternative COPY_ON_WRITE (COW) would rewrite the entire base Parquet file on every single update — at 5K mutations/sec burst, that's 5K file rewrites/sec, infeasible. Hourly async compaction merges deltas into a new base file when they grow too large.",
  },
];

// ============================================================
// SCHEMA REGISTRY — 3 dataset examples
// ============================================================

export const SCHEMA_REGISTRY_EXAMPLES: DatasetExample[] = [
  {
    id: "schema-registry-avro-evolution",
    step: "1",
    title: "Avro schema evolution (synthetic 100M events)",
    subtitle: "Synthetic — backward + forward compatible field changes",
    accent: "oklch(0.6 0.18 30)",
    icon: <Layers className="h-4 w-4" />,
    badge: "Synthetic event-scale evolution",
    brief: {
      dataset: "Synthetic: 100M events/day on a Kafka topic 'orders.v3'. Avro schema evolves from v1 (6 fields) → v2 (added optional field) → v3 (added default-valued field + aliased rename). All changes are backward + forward compatible.",
      scale: "~100M events/day · 3 schema versions in production · 0 consumer breakages across 23 downstream services",
      why: "Demonstrates Schema Registry's compatibility checker. Without it, adding a field with no default would break 23 consumer services reading 100M events/day. The registry rejects the schema change BEFORE deployment, catching the bug at deploy time.",
    },
    stats: [
      { label: "Events/day", value: "100M" },
      { label: "Schema versions", value: "3 in prod" },
      { label: "Consumers", value: "23 services" },
      { label: "Breakages", value: "0" },
    ],
    tools: ["Confluent Schema Registry", "Avro 1.11+", "Kafka 3.6+ (Avro converter)", "Maven avro-maven-plugin", "Compatibility checker CI"],
    codeTabs: [
      {
        lang: "scala",
        filename: "AvroSchemaEvolution.scala",
        code: `import io.confluent.kafka.schemaregistry.client.{CachedSchemaRegistryClient, SchemaRegistryClient}
import io.confluent.kafka.schemaregistry.CompatibilityLevel
import org.apache.avro.{Schema, SchemaBuilder}

val client: SchemaRegistryClient = new CachedSchemaRegistryClient(
  "http://schema-registry:8081", 1000)

// Subject: topic-key / topic-value strategy
val subject = "orders-value"

// v1 — original schema (6 fields)
val v1: Schema = SchemaBuilder.record("com.moderndatascieng.Order")
  .namespace("com.moderndatascieng")
  .fields()
  .name("order_id").type().longType().noDefault()
  .name("customer_id").type().longType().noDefault()
  .name("amount_usd").type().doubleType().noDefault()
  .name("currency").type().stringType().noDefault()
  .name("order_ts").type().longType().noDefault()
  .name("status").type().stringType().noDefault()
  .endRecord()
client.register(subject, v1)  // id=1

// v2 — add optional field with default (BACKWARD compatible)
// Old consumers reading v2 events tolerate the new field (default fills it)
val v2: Schema = SchemaBuilder.record("com.moderndatascieng.Order")
  .fields()
  .name("order_id").type().longType().noDefault()
  .name("customer_id").type().longType().noDefault()
  .name("amount_usd").type().doubleType().noDefault()
  .name("currency").type().stringType().noDefault()
  .name("order_ts").type().longType().noDefault()
  .name("status").type().stringType().noDefault()
  // NEW: optional field with default — backward compatible
  .name("discount_code").type().unionOf().nullType().and().stringType().endUnion().withDefault(null)
  .endRecord()
client.register(subject, v2)  // id=2 — accepted (backward compatible)

// v3 — rename via aliases (FORWARD compatible: old consumers read new events
// by aliasing the renamed field back to its old name)
val v3: Schema = SchemaBuilder.record("com.moderndatascieng.Order")
  .fields()
  .name("order_id").type().longType().noDefault()
  .name("customer_id").type().longType().noDefault()
  .name("amount_usd").type().doubleType().noDefault()
  .name("currency").type().stringType().noDefault()
  .name("order_ts").type().longType().noDefault()
  .name("status").type().stringType().noDefault()
  .name("discount_code").type().unionOf().nullType().and().stringType().endUnion().withDefault(null)
  // RENAME: ship_country was previously called ship_ctry (alias bridges the rename)
  .name("ship_country").type().stringType().withDefault("UNKNOWN")
  .aliases("ship_ctry")
  .endRecord()
client.register(subject, v3)  // id=3 — accepted (forward compatible via alias)

// Verify compatibility explicitly
val isCompatible = client.testCompatibility(subject, v3)
println(s"v3 compatible with v2? \${isCompatible}")  // true

// Subject config: BACKWARD_TRANSITIVE (default) — each version compatible with ALL prior
client.updateCompatibility(subject, CompatibilityLevel.BACKWARD_TRANSITIVE)`,
      },
      {
        lang: "rust",
        filename: "avro_schema_evolution.rs",
        code: `use schema_registry_client::CachedSchemaRegistryClient;
use schema_registry_client::CompatibilityLevel;
use apache_avro::Schema;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut client = CachedSchemaRegistryClient::new(
        "http://schema-registry:8081", 1000).await?;

    let subject = "orders-value";

    // v1 — original schema
    let v1_json = r#"{
        "type":"record","name":"Order","namespace":"com.moderndatascieng",
        "fields":[
            {"name":"order_id","type":"long"},
            {"name":"customer_id","type":"long"},
            {"name":"amount_usd","type":"double"},
            {"name":"currency","type":"string"},
            {"name":"order_ts","type":"long"},
            {"name":"status","type":"string"}
        ]
    }"#;
    let v1 = Schema::parse_str(v1_json)?;
    let id1 = client.register(subject, &v1).await?;
    println!("v1 registered id={id1}");

    // v2 — add optional field with default (BACKWARD compatible)
    let v2_json = r#"{
        "type":"record","name":"Order","namespace":"com.moderndatascieng",
        "fields":[
            {"name":"order_id","type":"long"},
            {"name":"customer_id","type":"long"},
            {"name":"amount_usd","type":"double"},
            {"name":"currency","type":"string"},
            {"name":"order_ts","type":"long"},
            {"name":"status","type":"string"},
            {"name":"discount_code","type":["null","string"],"default":null}
        ]
    }"#;
    let v2 = Schema::parse_str(v2_json)?;
    let id2 = client.register(subject, &v2).await?;
    println!("v2 registered id={id2} (backward compatible — optional field with default)");

    // v3 — rename via aliases (FORWARD compatible)
    let v3_json = r#"{
        "type":"record","name":"Order","namespace":"com.moderndatascieng",
        "fields":[
            {"name":"order_id","type":"long"},
            {"name":"customer_id","type":"long"},
            {"name":"amount_usd","type":"double"},
            {"name":"currency","type":"string"},
            {"name":"order_ts","type":"long"},
            {"name":"status","type":"string"},
            {"name":"discount_code","type":["null","string"],"default":null},
            {"name":"ship_country","type":"string","default":"UNKNOWN","aliases":["ship_ctry"]}
        ]
    }"#;
    let v3 = Schema::parse_str(v3_json)?;
    let compatible = client.test_compatibility(subject, &v3).await?;
    if !compatible {
        return Err("v3 NOT compatible — would break consumers".into());
    }
    let id3 = client.register(subject, &v3).await?;
    println!("v3 registered id={id3} (forward compatible — alias bridges rename)");

    // Set BACKWARD_TRANSITIVE (each version compatible with ALL prior)
    client.update_compatibility(subject, CompatibilityLevel::BackwardTransitive).await?;
    println!("Subject config: BACKWARD_TRANSITIVE");

    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "avro_schema_evolution.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"

    sr "github.com/confluentinc/schema-registry-client-go"
    "github.com/hamba/avro"
)

func main() {
    ctx := context.Background()
    client := sr.NewClient("http://schema-registry:8081")
    subject := "orders-value"

    // v1 — original schema
    v1, err := avro.Parse(\`{
        "type":"record","name":"Order","namespace":"com.moderndatascieng",
        "fields":[
            {"name":"order_id","type":"long"},
            {"name":"customer_id","type":"long"},
            {"name":"amount_usd","type":"double"},
            {"name":"currency","type":"string"},
            {"name":"order_ts","type":"long"},
            {"name":"status","type":"string"}
        ]
    }\`)
    if err != nil { log.Fatalf("v1 parse: %v", err) }
    id1, _ := client.Register(ctx, subject, v1, false)
    fmt.Printf("v1 registered id=%d\\n", id1)

    // v2 — add optional field with default (BACKWARD compatible)
    v2, err := avro.Parse(\`{
        "type":"record","name":"Order","namespace":"com.moderndatascieng",
        "fields":[
            {"name":"order_id","type":"long"},
            {"name":"customer_id","type":"long"},
            {"name":"amount_usd","type":"double"},
            {"name":"currency","type":"string"},
            {"name":"order_ts","type":"long"},
            {"name":"status","type":"string"},
            {"name":"discount_code","type":["null","string"],"default":null}
        ]
    }\`)
    if err != nil { log.Fatalf("v2 parse: %v", err) }
    id2, _ := client.Register(ctx, subject, v2, false)
    fmt.Printf("v2 registered id=%d (backward compatible — optional field)\\n", id2)

    // v3 — rename via aliases (FORWARD compatible)
    v3, err := avro.Parse(\`{
        "type":"record","name":"Order","namespace":"com.moderndatascieng",
        "fields":[
            {"name":"order_id","type":"long"},
            {"name":"customer_id","type":"long"},
            {"name":"amount_usd","type":"double"},
            {"name":"currency","type":"string"},
            {"name":"order_ts","type":"long"},
            {"name":"status","type":"string"},
            {"name":"discount_code","type":["null","string"],"default":null},
            {"name":"ship_country","type":"string","default":"UNKNOWN","aliases":["ship_ctry"]}
        ]
    }\`)
    if err != nil { log.Fatalf("v3 parse: %v", err) }
    compatible, _ := client.IsCompatible(ctx, subject, v3, "latest")
    if !compatible {
        log.Fatal("v3 NOT compatible — refusing to register")
    }
    id3, _ := client.Register(ctx, subject, v3, false)
    fmt.Printf("v3 registered id=%d (forward compatible — alias bridges rename)\\n", id3)

    // Set BACKWARD_TRANSITIVE
    _ = client.SetCompatibilityLevel(ctx, subject, sr.CompatBackwardTransitive)
    fmt.Println("Subject config: BACKWARD_TRANSITIVE")
}`,
      },
      {
        lang: "elixir",
        filename: "avro_schema_evolution.ex",
        code: `defmodule SchemaRegistry.AvroEvolution do
  @moduledoc "Avro schema evolution with backward + forward compatibility"
  @sr_url "http://schema-registry:8081"
  @subject "orders-value"

  def evolve_v1_to_v3 do
    # v1 — original schema (6 fields)
    v1 = ~S({
      "type":"record","name":"Order","namespace":"com.moderndatascieng",
      "fields":[
        {"name":"order_id","type":"long"},
        {"name":"customer_id","type":"long"},
        {"name":"amount_usd","type":"double"},
        {"name":"currency","type":"string"},
        {"name":"order_ts","type":"long"},
        {"name":"status","type":"string"}
      ]
    })
    {:ok, id1} = SchemaRegistry.register(@sr_url, @subject, v1)
    IO.puts("v1 registered id=#{id1}")

    # v2 — add optional field with default (BACKWARD compatible)
    v2 = ~S({
      "type":"record","name":"Order","namespace":"com.moderndatascieng",
      "fields":[
        {"name":"order_id","type":"long"},
        {"name":"customer_id","type":"long"},
        {"name":"amount_usd","type":"double"},
        {"name":"currency","type":"string"},
        {"name":"order_ts","type":"long"},
        {"name":"status","type":"string"},
        {"name":"discount_code","type":["null","string"],"default":null}
      ]
    })
    {:ok, id2} = SchemaRegistry.register(@sr_url, @subject, v2)
    IO.puts("v2 registered id=#{id2} (backward compatible)")

    # v3 — rename via aliases (FORWARD compatible)
    v3 = ~S({
      "type":"record","name":"Order","namespace":"com.moderndatascieng",
      "fields":[
        {"name":"order_id","type":"long"},
        {"name":"customer_id","type":"long"},
        {"name":"amount_usd","type":"double"},
        {"name":"currency","type":"string"},
        {"name":"order_ts","type":"long"},
        {"name":"status","type":"string"},
        {"name":"discount_code","type":["null","string"],"default":null},
        {"name":"ship_country","type":"string","default":"UNKNOWN","aliases":["ship_ctry"]}
      ]
    })
    :ok = SchemaRegistry.test_compatibility(@sr_url, @subject, v3)
    {:ok, id3} = SchemaRegistry.register(@sr_url, @subject, v3)
    IO.puts("v3 registered id=#{id3} (forward compatible — alias bridges rename)")

    # Subject-level config: BACKWARD_TRANSITIVE
    :ok = SchemaRegistry.set_compatibility(
      @sr_url, @subject, :backward_transitive)
    IO.puts("Subject config: BACKWARD_TRANSITIVE (each version compat with ALL prior)")
  end
end`,
      },
      {
        lang: "zig",
        filename: "avro_schema_evolution.zig",
        code: `const std = @import("std");
const sr = @import("schema-registry-zig");
const avro = @import("avro-zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const alloc = gpa.allocator();

    var client = try sr.Client.init(alloc, "http://schema-registry:8081");
    defer client.deinit();
    const subject = "orders-value";

    // v1 — original schema
    const v1_json =
        \\\\{"type":"record","name":"Order","namespace":"com.moderndatascieng",
        \\\\ "fields":[
        \\\\   {"name":"order_id","type":"long"},
        \\\\   {"name":"customer_id","type":"long"},
        \\\\   {"name":"amount_usd","type":"double"},
        \\\\   {"name":"currency","type":"string"},
        \\\\   {"name":"order_ts","type":"long"},
        \\\\   {"name":"status","type":"string"}
        \\\\ ]
        \\\\}
    ;
    const v1 = try avro.Schema.parse(alloc, v1_json);
    const id1 = try client.register(subject, &v1);
    std.debug.print("v1 registered id={d}\\n", .{id1});

    // v2 — add optional field with default (BACKWARD compatible)
    const v2_json =
        \\\\{"type":"record","name":"Order","namespace":"com.moderndatascieng",
        \\\\ "fields":[
        \\\\   {"name":"order_id","type":"long"},
        \\\\   {"name":"customer_id","type":"long"},
        \\\\   {"name":"amount_usd","type":"double"},
        \\\\   {"name":"currency","type":"string"},
        \\\\   {"name":"order_ts","type":"long"},
        \\\\   {"name":"status","type":"string"},
        \\\\   {"name":"discount_code","type":["null","string"],"default":null}
        \\\\ ]
        \\\\}
    ;
    const v2 = try avro.Schema.parse(alloc, v2_json);
    const id2 = try client.register(subject, &v2);
    std.debug.print("v2 registered id={d} (backward compatible)\\n", .{id2});

    // v3 — rename via aliases (FORWARD compatible)
    const v3_json =
        \\\\{"type":"record","name":"Order","namespace":"com.moderndatascieng",
        \\\\ "fields":[
        \\\\   {"name":"order_id","type":"long"},
        \\\\   {"name":"customer_id","type":"long"},
        \\\\   {"name":"amount_usd","type":"double"},
        \\\\   {"name":"currency","type":"string"},
        \\\\   {"name":"order_ts","type":"long"},
        \\\\   {"name":"status","type":"string"},
        \\\\   {"name":"discount_code","type":["null","string"],"default":null},
        \\\\   {"name":"ship_country","type":"string","default":"UNKNOWN","aliases":["ship_ctry"]}
        \\\\ ]
        \\\\}
    ;
    const v3 = try avro.Schema.parse(alloc, v3_json);
    if (!try client.test_compatibility(subject, &v3)) {
        std.debug.print("FAIL: v3 not compatible — refusing\\n", .{});
        return error.Incompatible;
    }
    const id3 = try client.register(subject, &v3);
    std.debug.print("v3 registered id={d} (forward compatible via alias)\\n", .{id3});

    // Set BACKWARD_TRANSITIVE
    try client.set_compatibility(subject, .backward_transitive);
    std.debug.print("Subject config: BACKWARD_TRANSITIVE\\n", .{});
}`,
      },
    ],
    runnablePython: `# Avro schema compatibility checker simulation
import random
from collections import defaultdict

print("=== Avro schema evolution — 100M events/day, 3 versions ===")
print("Subject: 'orders-value' | Compatibility: BACKWARD_TRANSITIVE\\n")

# Avro compatibility rules (simplified)
def is_backward_compatible(old_fields, new_fields):
    """New schema can read old data: every old field must exist in new OR be removed via alias.
       New fields must have defaults (so old data without them still parses)."""
    old_set = {f['name'] for f in old_fields}
    new_set = {f['name'] for f in new_fields}
    # Old fields preserved in new (or aliased) — backward compatible
    preserved = old_set & new_set
    missing = old_set - new_set
    # New fields added — must have defaults
    added = new_set - old_set
    for nf in new_fields:
        if nf['name'] in added and 'default' not in nf:
            return False, f"new field {nf['name']} has NO default — old data breaks"
    return True, f"backward compatible: {len(preserved)} preserved, {len(added)} added (all with defaults)"

def is_forward_compatible(old_fields, new_fields):
    """Old schema can read new data: every new field must be optional OR
       the old schema tolerates missing fields via reader defaults."""
    new_set = {f['name'] for f in new_fields}
    old_set = {f['name'] for f in old_fields}
    # Forward compatible if old reader doesn't require new fields (it just ignores them)
    # Renames need aliases to bridge
    new_with_aliases = {f.get('aliases', [f['name']])[0] if f.get('aliases') else f['name']: f for f in new_fields}
    bridged = sum(1 for f in old_fields if f['name'] in new_with_aliases)
    return True, f"forward compatible: {bridged}/{len(old_fields)} old fields reachable via name or alias"

# v1: 6 fields, all required
v1 = [
    {'name': 'order_id', 'type': 'long'},
    {'name': 'customer_id', 'type': 'long'},
    {'name': 'amount_usd', 'type': 'double'},
    {'name': 'currency', 'type': 'string'},
    {'name': 'order_ts', 'type': 'long'},
    {'name': 'status', 'type': 'string'},
]

# v2: add optional field with default (backward compat)
v2 = v1 + [{'name': 'discount_code', 'type': ['null', 'string'], 'default': None}]

# v3: add field with default + rename via alias
v3 = v2 + [{'name': 'ship_country', 'type': 'string', 'default': 'UNKNOWN', 'aliases': ['ship_ctry']}]

# Test compatibility chain
print("Compatibility chain (v1 -> v2 -> v3):\\n")
for old_n, old, new_n, new in [('v1', v1, 'v2', v2), ('v2', v2, 'v3', v3), ('v1', v1, 'v3', v3)]:
    bw, bw_msg = is_backward_compatible(old, new)
    fw, fw_msg = is_forward_compatible(old, new)
    print(f"{old_n} -> {new_n}:")
    print(f"  backward? {bw} — {bw_msg}")
    print(f"  forward?  {fw} — {fw_msg}")
    if bw and fw:
        print(f"  => FULL_COMPATIBLE — safe to deploy\\n")
    else:
        print(f"  => INCOMPATIBLE — Schema Registry refuses to register\\n")

# Simulate consumer impact: 23 services reading 100M events/day
print("\\nConsumer impact simulation:")
print("  23 downstream services, 100M events/day, 0 breakages")
print("  Without Schema Registry: any breaking change deployed -> silent")
print("    deserialisation failure on N% of events (potentially 100M/day)")
print("  With Schema Registry: breaking change REJECTED at register time")
print("    -> forced to fix at deploy time, before any consumer sees it")`,
    insight: "Avro's evolution rules are enforced by the Schema Registry BEFORE deployment. BACKWARD compatibility (new schema reads old data) requires new fields to have defaults. FORWARD compatibility (old schema reads new data) is automatic for new fields (old reader ignores unknown fields). Renames require aliases to bridge the name change. The registry rejects incompatible schemas at register time — preventing 23 consumers from silently breaking on 100M events/day.",
  },
  {
    id: "schema-registry-protobuf-fields",
    step: "2",
    title: "Protobuf field compatibility (synthetic 50M events)",
    subtitle: "Synthetic — field addition + removal with tag stability",
    accent: "oklch(0.62 0.16 200)",
    icon: <ShieldCheck className="h-4 w-4" />,
    badge: "Synthetic FinTech Protobuf",
    brief: {
      dataset: "Synthetic: 50M FinTech events/day on a Kafka topic 'trades.proto.v3'. Protobuf schema evolves via field addition (with new tag number) and field removal (tag reserved, never reused). Backward + forward compatible by design.",
      scale: "~50M events/day · 3 schema versions · 12 consumer services · zero breakages",
      why: "Protobuf's field-tag-based wire format means compatibility is governed by tag numbers, not field names. Adding a field with a NEW tag is always safe. Removing a field requires reserving its tag — never reuse a deleted tag (would silently corrupt old events).",
    },
    stats: [
      { label: "Events/day", value: "50M" },
      { label: "Schema versions", value: "3" },
      { label: "Consumers", value: "12 services" },
      { label: "Tag reuse violations", value: "0" },
    ],
    tools: ["Confluent Schema Registry (Protobuf)", "Protobuf 3+", "protoc compiler", "Buf CLI", "pbkit (compatibility checker)"],
    codeTabs: [
      {
        lang: "scala",
        filename: "ProtobufFieldCompat.scala",
        code: `import io.confluent.kafka.schemaregistry.client.CachedSchemaRegistryClient
import com.google.protobuf.Descriptors
import com.google.protobuf.descriptor.DescriptorProto

val client = new CachedSchemaRegistryClient("http://schema-registry:8081", 1000)
val subject = "trades-value"

// v1 — original .proto (3 fields, tags 1-3)
val v1Proto = """
syntax = "proto3";
package com.moderndatascieng.trades;
message Trade {
  int64 trade_id    = 1;
  int64 account_id  = 2;
  double notional_usd = 3;
}
"""
client.register(subject, v1Proto, schemaType = "PROTOBUF")  // id=1

// v2 — add field with NEW tag (4) — always backward compatible
// (Protobuf: adding a field with a new tag is safe; old readers ignore unknown tags)
val v2Proto = """
syntax = "proto3";
package com.moderndatascieng.trades;
message Trade {
  int64 trade_id    = 1;
  int64 account_id  = 2;
  double notional_usd = 3;
  string ticker     = 4;  // NEW field, tag 4 — backward compatible
}
"""
client.register(subject, v2Proto, schemaType = "PROTOBUF")  // id=2 — accepted

// v3 — remove field, RESERVE its tag (never reuse)
// (Protobuf: must reserve deleted tags — otherwise a future field reuses
//  tag 3 and old events would silently deserialize as the new field)
val v3Proto = """
syntax = "proto3";
package com.moderndatascieng.trades;
message Trade {
  int64 trade_id    = 1;
  int64 account_id  = 2;
  // notional_usd (tag 3) removed — reserve tag to prevent reuse
  reserved 3;
  reserved "notional_usd";
  string ticker     = 4;
  int64 qty         = 5;  // NEW field, tag 5 — backward compatible
}
"""
// Compatibility check: BACKWARD (new reads old) — tag 3 reserved, fields 4,5 added
val compatible = client.testCompatibility(subject, v3Proto)
println(s"v3 compatible? \${compatible}")
client.register(subject, v3Proto, schemaType = "PROTOBUF")  // id=3

// Verify: protobuf subjects support BACKWARD_TRANSITIVE
client.updateCompatibility(subject, io.confluent.kafka.schemaregistry.CompatibilityLevel.BACKWARD_TRANSITIVE)`,
      },
      {
        lang: "rust",
        filename: "protobuf_compat.rs",
        code: `use schema_registry_client::CachedSchemaRegistryClient;
use schema_registry_client::SchemaType;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut client = CachedSchemaRegistryClient::new(
        "http://schema-registry:8081", 1000).await?;
    let subject = "trades-value";

    // v1 — original (tags 1-3)
    let v1 = r#"
syntax = "proto3";
package com.moderndatascieng.trades;
message Trade {
  int64 trade_id    = 1;
  int64 account_id  = 2;
  double notional_usd = 3;
}
"#;
    let id1 = client.register(subject, v1, SchemaType::Protobuf).await?;
    println!("v1 registered id={id1}");

    // v2 — add field with NEW tag 4 (always backward compatible)
    let v2 = r#"
syntax = "proto3";
package com.moderndatascieng.trades;
message Trade {
  int64 trade_id    = 1;
  int64 account_id  = 2;
  double notional_usd = 3;
  string ticker     = 4;  // NEW tag — old readers ignore unknown tags
}
"#;
    let id2 = client.register(subject, v2, SchemaType::Protobuf).await?;
    println!("v2 registered id={id2} (added field tag 4)");

    // v3 — remove field, RESERVE tag 3 (prevent reuse)
    let v3 = r#"
syntax = "proto3";
package com.moderndatascieng.trades;
message Trade {
  int64 trade_id    = 1;
  int64 account_id  = 2;
  reserved 3;             // tag 3 removed — must reserve to prevent reuse
  reserved "notional_usd";
  string ticker     = 4;
  int64 qty         = 5;  // NEW tag — backward compatible
}
"#;
    let compatible = client.test_compatibility(subject, v3).await?;
    if !compatible {
        return Err("v3 NOT compatible — refusing to register".into());
    }
    let id3 = client.register(subject, v3, SchemaType::Protobuf).await?;
    println!("v3 registered id={id3} (removed tag 3 reserved, added tag 5)");

    // Set BACKWARD_TRANSITIVE
    client.update_compatibility(subject, schema_registry_client::CompatibilityLevel::BackwardTransitive).await?;
    println!("Subject config: BACKWARD_TRANSITIVE");

    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "protobuf_compat.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"

    sr "github.com/confluentinc/schema-registry-client-go"
)

func main() {
    ctx := context.Background()
    client := sr.NewClient("http://schema-registry:8081")
    subject := "trades-value"

    v1 := \`
syntax = "proto3";
package com.moderndatascieng.trades;
message Trade {
  int64 trade_id    = 1;
  int64 account_id  = 2;
  double notional_usd = 3;
}
\`
    id1, _ := client.RegisterProtobuf(ctx, subject, v1)
    fmt.Printf("v1 registered id=%d\\n", id1)

    v2 := \`
syntax = "proto3";
package com.moderndatascieng.trades;
message Trade {
  int64 trade_id    = 1;
  int64 account_id  = 2;
  double notional_usd = 3;
  string ticker     = 4;  // NEW tag — backward compatible
}
\`
    id2, _ := client.RegisterProtobuf(ctx, subject, v2)
    fmt.Printf("v2 registered id=%d (added tag 4)\\n", id2)

    v3 := \`
syntax = "proto3";
package com.moderndatascieng.trades;
message Trade {
  int64 trade_id    = 1;
  int64 account_id  = 2;
  reserved 3;
  reserved "notional_usd";
  string ticker     = 4;
  int64 qty         = 5;
}
\`
    compatible, _ := client.IsCompatibleProtobuf(ctx, subject, v3, "latest")
    if !compatible {
        log.Fatal("v3 NOT compatible — refusing to register")
    }
    id3, _ := client.RegisterProtobuf(ctx, subject, v3)
    fmt.Printf("v3 registered id=%d (removed tag 3 reserved, added tag 5)\\n", id3)

    _ = client.SetCompatibilityLevel(ctx, subject, sr.CompatBackwardTransitive)
    fmt.Println("Subject config: BACKWARD_TRANSITIVE")
}`,
      },
      {
        lang: "elixir",
        filename: "protobuf_compat.ex",
        code: `defmodule SchemaRegistry.ProtobufCompat do
  @moduledoc "Protobuf field compatibility — tag-based wire format"
  @sr_url "http://schema-registry:8081"
  @subject "trades-value"

  def evolve do
    # v1 — original (tags 1-3)
    v1 = """
    syntax = "proto3";
    package com.moderndatascieng.trades;
    message Trade {
      int64 trade_id    = 1;
      int64 account_id  = 2;
      double notional_usd = 3;
    }
    """
    {:ok, id1} = SchemaRegistry.register_protobuf(@sr_url, @subject, v1)
    IO.puts("v1 registered id=#{id1}")

    # v2 — add field tag 4 (always backward compatible — old readers ignore unknown tags)
    v2 = """
    syntax = "proto3";
    package com.moderndatascieng.trades;
    message Trade {
      int64 trade_id    = 1;
      int64 account_id  = 2;
      double notional_usd = 3;
      string ticker     = 4;
    }
    """
    {:ok, id2} = SchemaRegistry.register_protobuf(@sr_url, @subject, v2)
    IO.puts("v2 registered id=#{id2} (added tag 4)")

    # v3 — remove field, RESERVE tag 3 to prevent reuse
    v3 = """
    syntax = "proto3";
    package com.moderndatascieng.trades;
    message Trade {
      int64 trade_id    = 1;
      int64 account_id  = 2;
      reserved 3;
      reserved "notional_usd";
      string ticker     = 4;
      int64 qty         = 5;
    }
    """
    :ok = SchemaRegistry.test_compatibility(@sr_url, @subject, v3, :protobuf)
    {:ok, id3} = SchemaRegistry.register_protobuf(@sr_url, @subject, v3)
    IO.puts("v3 registered id=#{id3} (removed tag 3 reserved, added tag 5)")

    :ok = SchemaRegistry.set_compatibility(@sr_url, @subject, :backward_transitive)
    IO.puts("Subject config: BACKWARD_TRANSITIVE")
  end
end`,
      },
      {
        lang: "zig",
        filename: "protobuf_compat.zig",
        code: `const std = @import("std");
const sr = @import("schema-registry-zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const alloc = gpa.allocator();

    var client = try sr.Client.init(alloc, "http://schema-registry:8081");
    defer client.deinit();
    const subject = "trades-value";

    // v1 — original (tags 1-3)
    const v1 =
        \\\\syntax = "proto3";
        \\\\package com.moderndatascieng.trades;
        \\\\message Trade {
        \\\\  int64 trade_id    = 1;
        \\\\  int64 account_id  = 2;
        \\\\  double notional_usd = 3;
        \\\\}
    ;
    const id1 = try client.register_protobuf(subject, v1);
    std.debug.print("v1 registered id={d}\\n", .{id1});

    // v2 — add field tag 4 (backward compatible)
    const v2 =
        \\\\syntax = "proto3";
        \\\\package com.moderndatascieng.trades;
        \\\\message Trade {
        \\\\  int64 trade_id    = 1;
        \\\\  int64 account_id  = 2;
        \\\\  double notional_usd = 3;
        \\\\  string ticker     = 4;
        \\\\}
    ;
    const id2 = try client.register_protobuf(subject, v2);
    std.debug.print("v2 registered id={d} (added tag 4)\\n", .{id2});

    // v3 — remove field, RESERVE tag 3 (prevent reuse)
    const v3 =
        \\\\syntax = "proto3";
        \\\\package com.moderndatascieng.trades;
        \\\\message Trade {
        \\\\  int64 trade_id    = 1;
        \\\\  int64 account_id  = 2;
        \\\\  reserved 3;
        \\\\  reserved "notional_usd";
        \\\\  string ticker     = 4;
        \\\\  int64 qty         = 5;
        \\\\}
    ;
    if (!try client.test_compatibility(subject, v3, .protobuf)) {
        std.debug.print("FAIL: v3 not compatible\\n", .{});
        return error.Incompatible;
    }
    const id3 = try client.register_protobuf(subject, v3);
    std.debug.print("v3 registered id={d} (removed tag 3 reserved)\\n", .{id3});

    try client.set_compatibility(subject, .backward_transitive);
    std.debug.print("Subject config: BACKWARD_TRANSITIVE\\n", .{});
}`,
      },
    ],
    runnablePython: `# Protobuf field-tag compatibility simulation
import random
from collections import defaultdict

print("=== Protobuf field-tag compatibility — 50M events/day, 3 versions ===")
print("Subject: 'trades-value' | Format: Protobuf | Compatibility: BACKWARD_TRANSITIVE\\n")

# Protobuf wire format = (field_tag, wire_type, value)
# Compatibility is governed by TAG NUMBERS, not field names

# v1: tags 1-3
v1_fields = {1: 'trade_id', 2: 'account_id', 3: 'notional_usd'}

# v2: add tag 4 (backward compatible — old readers ignore unknown tags)
v2_fields = {1: 'trade_id', 2: 'account_id', 3: 'notional_usd', 4: 'ticker'}

# v3: remove tag 3 (reserve), add tag 5
v3_fields = {1: 'trade_id', 2: 'account_id', 4: 'ticker', 5: 'qty'}
v3_reserved = {3, 'notional_usd'}

def protobuf_backward_compat(old_tags, new_tags, new_reserved):
    """New reader reads old data: every tag in old must be readable in new OR
       the field was removed (reserved)."""
    for tag in old_tags:
        if tag in new_tags:
            continue  # tag still exists, fine
        if tag in new_reserved:
            continue  # tag removed, reserved — old data ignored safely
        return False, f"old tag {tag} neither present nor reserved — danger"
    return True, "all old tags handled (present or reserved)"

def protobuf_forward_compat(old_tags, new_tags):
    """Old reader reads new data: old reader ignores unknown tags."""
    new_tags_unknown_to_old = set(new_tags) - set(old_tags)
    return True, f"{len(new_tags_unknown_to_old)} new tags ignored by old reader (safe)"

# Test chain
chains = [('v1', v1_fields, set(), 'v2', v2_fields, set()),
         ('v2', v2_fields, set(), 'v3', v3_fields, v3_reserved),
         ('v1', v1_fields, set(), 'v3', v3_fields, v3_reserved)]
for old_n, old_f, old_r, new_n, new_f, new_r in chains:
    bw, bw_msg = protobuf_backward_compat(set(old_f), set(new_f), new_r)
    fw, fw_msg = protobuf_forward_compat(set(old_f), set(new_f))
    print(f"{old_n} -> {new_n}:")
    print(f"  backward? {bw} — {bw_msg}")
    print(f"  forward?  {fw} — {fw_msg}")
    if bw and fw:
        print(f"  => FULL_COMPATIBLE — tag-stable evolution\\n")

# Simulate tag-reuse danger
print("\\n=== Counterfactual: tag REUSE danger ===")
print("Bad v3 (NOT REGISTERED): reuses tag 3 for a NEW field 'settlement_ccy'")
bad_v3_fields = {1: 'trade_id', 2: 'account_id', 3: 'settlement_ccy', 4: 'ticker'}
print(f"  v1 notional_usd @ tag 3 -> v3 settlement_ccy @ tag 3")
print(f"  Old v1 events deserialized by v3 reader would have")
print(f"  notional_usd (e.g. 10000.0) read as settlement_ccy='10000'")
print(f"  => silent data corruption — Schema Registry rejects this at register time")

# Synthetic event simulation
print("\\n=== 50M events/day consumer impact ===")
n_events = 50_000_000
n_consumers = 12
print(f"Events: {n_events:,} | Consumers: {n_consumers} services")
print(f"  Without registry: breaking change deployed -> {n_consumers} services break")
print(f"  With registry: rejected at register time -> 0 breakages")
print(f"  Protobuf's tag-based wire format means FIELD NAMES don't matter for compat,")
print(f"  only TAG NUMBERS do. Reserve deleted tags forever.")`,
    insight: "Protobuf's wire format encodes fields by TAG NUMBER, not name. Compatibility is therefore governed by tag stability, not field names. Adding a field with a NEW tag is always safe (old readers ignore unknown tags). Removing a field REQUIRES reserving its tag — never reuse a deleted tag (would silently corrupt old events: a v1 event with `notional_usd=10000.0` at tag 3 would deserialize as `settlement_ccy=10000` if a v3 schema reuses tag 3).",
  },
  {
    id: "schema-registry-json-validation",
    step: "3",
    title: "JSON Schema validation (synthetic 10M events)",
    subtitle: "Synthetic — strict + lenient validation modes",
    accent: "oklch(0.6 0.18 145)",
    icon: <FileText className="h-4 w-4" />,
    badge: "Synthetic governance-scale validation",
    brief: {
      dataset: "Synthetic: 10M JSON events/day on a Kafka topic 'events.json.v2'. JSON Schema Draft 7 enforces required fields + type checks. Strict mode rejects on any schema violation; lenient mode logs + accepts.",
      scale: "~10M events/day · 2 validation modes · 5 consumer services · 0.3% events rejected in strict mode",
      why: "Shows JSON Schema validation — the most permissive format (no wire-format guarantees, so schema enforcement is critical). Strict mode is the production default for governance-critical data (financial events, PII); lenient mode is for observability events where lossy data is preferable to no data.",
    },
    stats: [
      { label: "Events/day", value: "10M" },
      { label: "Strict rejects", value: "0.3%" },
      { label: "Lenient logs", value: "100%" },
      { label: "Schema versions", value: "2" },
    ],
    tools: ["Confluent Schema Registry (JSON)", "JSON Schema Draft 7+", "ajv (validator)", "Kafka JSON Schema Converter", "fastjsonschema (Python)"],
    codeTabs: [
      {
        lang: "scala",
        filename: "JsonSchemaValidation.scala",
        code: `import io.confluent.kafka.schemaregistry.client.CachedSchemaRegistryClient
import io.confluent.kafka.serializers.json.KafkaJsonSchemaDeserializer
import com.networknt.schema.{JsonSchemaFactory, SchemaValidatorsConfig}
import com.fasterxml.jackson.databind.ObjectMapper

val client = new CachedSchemaRegistryClient("http://schema-registry:8081", 1000)
val subject = "events-value"

// v1 — strict JSON Schema (Draft 7) — required fields + type checks
val v1Schema = """
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "FinTechEvent",
  "type": "object",
  "required": ["event_id", "account_id", "amount_usd", "event_ts"],
  "properties": {
    "event_id":     {"type": "string", "format": "uuid"},
    "account_id":   {"type": "string", "pattern": "^ACC-[0-9]{8}$"},
    "amount_usd":   {"type": "number", "minimum": 0, "maximum": 100000000},
    "event_ts":     {"type": "string", "format": "date-time"},
    "currency":     {"type": "string", "enum": ["USD", "EUR", "GBP", "JPY"]},
    "metadata":     {"type": "object", "additionalProperties": true}
  },
  "additionalProperties": false
}
"""
client.register(subject, v1Schema, schemaType = "JSON")  // id=1

// v2 — add optional field 'region' (backward compatible: not required)
val v2Schema = """
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "FinTechEvent",
  "type": "object",
  "required": ["event_id", "account_id", "amount_usd", "event_ts"],
  "properties": {
    "event_id":     {"type": "string", "format": "uuid"},
    "account_id":   {"type": "string", "pattern": "^ACC-[0-9]{8}$"},
    "amount_usd":   {"type": "number", "minimum": 0, "maximum": 100000000},
    "event_ts":     {"type": "string", "format": "date-time"},
    "currency":     {"type": "string", "enum": ["USD", "EUR", "GBP", "JPY"]},
    "metadata":     {"type": "object", "additionalProperties": true},
    "region":       {"type": "string", "enum": ["NA", "EU", "APAC"]}  // NEW optional
  },
  "additionalProperties": false
}
"""
client.register(subject, v2Schema, schemaType = "JSON")  // id=2

// Two validation modes
val strictConfig = SchemaValidatorsConfig.builder()
  .failOnError(true)         // raise exception on first violation
  .cache(true)
  .build()

val lenientConfig = SchemaValidatorsConfig.builder()
  .failOnError(false)        // log + accept
  .build()

val factory = JsonSchemaFactory.getInstance()
val mapper = new ObjectMapper()

// Strict mode: producer-side validation
def validateStrict(eventJson: String): Boolean = {
  val schema = factory.getSchema(client.getLatestSchema(subject).rawSchema(), strictConfig)
  val errors = schema.validate(mapper.readTree(eventJson))
  if (errors.isEmpty) true
  else throw new RuntimeException(s"Strict validation failed: \${errors}")
}

// Lenient mode: consumer-side logging
def validateLenient(eventJson: String): Boolean = {
  val schema = factory.getSchema(client.getLatestSchema(subject).rawSchema(), lenientConfig)
  val errors = schema.validate(mapper.readTree(eventJson))
  if (errors.nonEmpty) {
    println(s"WARN: \${errors.size} validation errors — accepted leniently")
    errors.forEach(e => println(s"  \${e.path}: \${e.message}"))
  }
  true  // always accept in lenient mode
}`,
      },
      {
        lang: "rust",
        filename: "json_schema_validation.rs",
        code: `use schema_registry_client::{CachedSchemaRegistryClient, SchemaType};
use jsonschema::JSONSchema;
use serde_json::Value;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut client = CachedSchemaRegistryClient::new(
        "http://schema-registry:8081", 1000).await?;
    let subject = "events-value";

    // v1 — strict JSON Schema (Draft 7)
    let v1 = r#"{
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "FinTechEvent",
        "type": "object",
        "required": ["event_id", "account_id", "amount_usd", "event_ts"],
        "properties": {
            "event_id":   {"type": "string", "format": "uuid"},
            "account_id": {"type": "string", "pattern": "^ACC-[0-9]{8}$"},
            "amount_usd": {"type": "number", "minimum": 0, "maximum": 100000000},
            "event_ts":   {"type": "string", "format": "date-time"},
            "currency":   {"type": "string", "enum": ["USD", "EUR", "GBP", "JPY"]},
            "metadata":   {"type": "object"}
        },
        "additionalProperties": false
    }"#;
    let id1 = client.register(subject, v1, SchemaType::Json).await?;
    println!("v1 registered id={id1}");

    // v2 — add optional region (backward compatible)
    let v2 = r#"{
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "FinTechEvent",
        "type": "object",
        "required": ["event_id", "account_id", "amount_usd", "event_ts"],
        "properties": {
            "event_id":   {"type": "string", "format": "uuid"},
            "account_id": {"type": "string", "pattern": "^ACC-[0-9]{8}$"},
            "amount_usd": {"type": "number", "minimum": 0, "maximum": 100000000},
            "event_ts":   {"type": "string", "format": "date-time"},
            "currency":   {"type": "string", "enum": ["USD", "EUR", "GBP", "JPY"]},
            "metadata":   {"type": "object"},
            "region":     {"type": "string", "enum": ["NA", "EU", "APAC"]}
        },
        "additionalProperties": false
    }"#;
    let id2 = client.register(subject, v2, SchemaType::Json).await?;
    println!("v2 registered id={id2}");

    // Compile schema for validation
    let latest = client.get_latest_schema(subject).await?;
    let schema = JSONSchema::compile(&latest)?;

    // Strict mode — fail on first violation
    let strict_event = r#"{"event_id": "abc", "account_id": "ACC-12345678",
                          "amount_usd": 100.0, "event_ts": "2024-09-01T10:00:00Z"}"#;
    let value: Value = serde_json::from_str(strict_event)?;
    if schema.validate(&value).is_ok() {
        println!("Strict mode: event accepted");
    } else {
        eprintln!("Strict mode: rejected");
    }

    // Lenient mode — log + accept
    let bad_event = r#"{"event_id": "abc", "amount_usd": 100.0}"#;
    let bad_value: Value = serde_json::from_str(bad_event)?;
    if let Err(errors) = schema.validate(&bad_value) {
        for e in errors {
            println!("WARN: validation error (lenient): {e}");
        }
    }
    println!("Lenient mode: bad event accepted with warnings");

    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "json_schema_validation.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"

    sr "github.com/confluentinc/schema-registry-client-go"
    "github.com/xeipuuv/gojsonschema"
)

func main() {
    ctx := context.Background()
    client := sr.NewClient("http://schema-registry:8081")
    subject := "events-value"

    v1 := \`{
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "FinTechEvent",
        "type": "object",
        "required": ["event_id", "account_id", "amount_usd", "event_ts"],
        "properties": {
            "event_id":   {"type": "string", "format": "uuid"},
            "account_id": {"type": "string", "pattern": "^ACC-[0-9]{8}$"},
            "amount_usd": {"type": "number", "minimum": 0, "maximum": 100000000},
            "event_ts":   {"type": "string", "format": "date-time"},
            "currency":   {"type": "string", "enum": ["USD", "EUR", "GBP", "JPY"]},
            "metadata":   {"type": "object"}
        },
        "additionalProperties": false
    }\`
    id1, _ := client.RegisterJSON(ctx, subject, v1)
    fmt.Printf("v1 registered id=%d\\n", id1)

    v2 := \`{
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "FinTechEvent",
        "type": "object",
        "required": ["event_id", "account_id", "amount_usd", "event_ts"],
        "properties": {
            "event_id":   {"type": "string", "format": "uuid"},
            "account_id": {"type": "string", "pattern": "^ACC-[0-9]{8}$"},
            "amount_usd": {"type": "number", "minimum": 0, "maximum": 100000000},
            "event_ts":   {"type": "string", "format": "date-time"},
            "currency":   {"type": "string", "enum": ["USD", "EUR", "GBP", "JPY"]},
            "metadata":   {"type": "object"},
            "region":     {"type": "string", "enum": ["NA", "EU", "APAC"]}
        },
        "additionalProperties": false
    }\`
    id2, _ := client.RegisterJSON(ctx, subject, v2)
    fmt.Printf("v2 registered id=%d\\n", id2)

    // Strict mode — fail on first violation
    schemaLoader := gojsonschema.NewStringLoader(v2)
    strictEvent := \`{"event_id":"abc","account_id":"ACC-12345678","amount_usd":100.0,"event_ts":"2024-09-01T10:00:00Z"}\`
    docLoader := gojsonschema.NewStringLoader(strictEvent)
    result, _ := gojsonschema.Validate(schemaLoader, docLoader)
    if result.Valid() {
        fmt.Println("Strict mode: event accepted")
    } else {
        log.Fatalf("Strict mode: rejected — %d errors", len(result.Errors()))
    }

    // Lenient mode — log + accept
    badEvent := \`{"event_id":"abc","amount_usd":100.0}\`
    badLoader := gojsonschema.NewStringLoader(badEvent)
    badResult, _ := gojsonschema.Validate(schemaLoader, badLoader)
    for _, e := range badResult.Errors() {
        fmt.Printf("WARN (lenient): %s\\n", e)
    }
    fmt.Println("Lenient mode: bad event accepted with warnings")
}`,
      },
      {
        lang: "elixir",
        filename: "json_schema_validation.ex",
        code: `defmodule SchemaRegistry.JsonValidation do
  @moduledoc "JSON Schema Draft 7 — strict + lenient validation"
  @sr_url "http://schema-registry:8081"
  @subject "events-value"

  def deploy do
    v1 = ~S({
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": "FinTechEvent",
      "type": "object",
      "required": ["event_id", "account_id", "amount_usd", "event_ts"],
      "properties": {
        "event_id":   {"type": "string", "format": "uuid"},
        "account_id": {"type": "string", "pattern": "^ACC-[0-9]{8}$"},
        "amount_usd": {"type": "number", "minimum": 0, "maximum": 100000000},
        "event_ts":   {"type": "string", "format": "date-time"},
        "currency":   {"type": "string", "enum": ["USD", "EUR", "GBP", "JPY"]},
        "metadata":   {"type": "object"}
      },
      "additionalProperties": false
    })
    {:ok, id1} = SchemaRegistry.register_json(@sr_url, @subject, v1)
    IO.puts("v1 registered id=#{id1}")

    v2 = ~S({
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": "FinTechEvent",
      "type": "object",
      "required": ["event_id", "account_id", "amount_usd", "event_ts"],
      "properties": {
        "event_id":   {"type": "string", "format": "uuid"},
        "account_id": {"type": "string", "pattern": "^ACC-[0-9]{8}$"},
        "amount_usd": {"type": "number", "minimum": 0, "maximum": 100000000},
        "event_ts":   {"type": "string", "format": "date-time"},
        "currency":   {"type": "string", "enum": ["USD", "EUR", "GBP", "JPY"]},
        "metadata":   {"type": "object"},
        "region":     {"type": "string", "enum": ["NA", "EU", "APAC"]}
      },
      "additionalProperties": false
    })
    {:ok, id2} = SchemaRegistry.register_json(@sr_url, @subject, v2)
    IO.puts("v2 registered id=#{id2}")
  end

  def validate_strict(event_json) do
    {:ok, schema} = SchemaRegistry.get_latest_json(@sr_url, @subject)
    case JsonSchema.validate(schema, event_json) do
      :ok -> :ok
      {:error, errors} -> {:error, errors}
    end
  end

  def validate_lenient(event_json) do
    {:ok, schema} = SchemaRegistry.get_latest_json(@sr_url, @subject)
    case JsonSchema.validate(schema, event_json) do
      :ok -> :ok
      {:error, errors} ->
        Enum.each(errors, &IO.puts("WARN (lenient): #{&1}"))
        :ok  # always accept
    end
  end
end`,
      },
      {
        lang: "zig",
        filename: "json_schema_validation.zig",
        code: `const std = @import("std");
const sr = @import("schema-registry-zig");
const json_schema = @import("json-schema-zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const alloc = gpa.allocator();

    var client = try sr.Client.init(alloc, "http://schema-registry:8081");
    defer client.deinit();
    const subject = "events-value";

    // v1 — strict JSON Schema (Draft 7)
    const v1 =
        \\\\{
        \\\\  "$schema": "http://json-schema.org/draft-07/schema#",
        \\\\  "title": "FinTechEvent",
        \\\\  "type": "object",
        \\\\  "required": ["event_id", "account_id", "amount_usd", "event_ts"],
        \\\\  "properties": {
        \\\\    "event_id":   {"type": "string", "format": "uuid"},
        \\\\    "account_id": {"type": "string", "pattern": "^ACC-[0-9]{8}$"},
        \\\\    "amount_usd": {"type": "number", "minimum": 0, "maximum": 100000000},
        \\\\    "event_ts":   {"type": "string", "format": "date-time"},
        \\\\    "currency":   {"type": "string", "enum": ["USD", "EUR", "GBP", "JPY"]},
        \\\\    "metadata":   {"type": "object"}
        \\\\  },
        \\\\  "additionalProperties": false
        \\\\}
    ;
    const id1 = try client.register_json(subject, v1);
    std.debug.print("v1 registered id={d}\\n", .{id1});

    // v2 — add optional region (backward compatible)
    const v2 =
        \\\\{
        \\\\  "$schema": "http://json-schema.org/draft-07/schema#",
        \\\\  "title": "FinTechEvent",
        \\\\  "type": "object",
        \\\\  "required": ["event_id", "account_id", "amount_usd", "event_ts"],
        \\\\  "properties": {
        \\\\    "event_id":   {"type": "string", "format": "uuid"},
        \\\\    "account_id": {"type": "string", "pattern": "^ACC-[0-9]{8}$"},
        \\\\    "amount_usd": {"type": "number", "minimum": 0, "maximum": 100000000},
        \\\\    "event_ts":   {"type": "string", "format": "date-time"},
        \\\\    "currency":   {"type": "string", "enum": ["USD", "EUR", "GBP", "JPY"]},
        \\\\    "metadata":   {"type": "object"},
        \\\\    "region":     {"type": "string", "enum": ["NA", "EU", "APAC"]}
        \\\\  },
        \\\\  "additionalProperties": false
        \\\\}
    ;
    const id2 = try client.register_json(subject, v2);
    std.debug.print("v2 registered id={d}\\n", .{id2});

    // Compile + validate
    var schema = try json_schema.Schema.compile(alloc, v2);
    defer schema.deinit();

    // Strict mode — fail on first violation
    const strict_event =
        \\\\{"event_id":"abc","account_id":"ACC-12345678","amount_usd":100.0,"event_ts":"2024-09-01T10:00:00Z"}
    ;
    if (schema.validate(strict_event)) {
        std.debug.print("Strict: event accepted\\n", .{});
    } else {
        std.debug.print("Strict: rejected\\n", .{});
    }

    // Lenient mode — log + accept
    const bad_event =
        \\\\{"event_id":"abc","amount_usd":100.0}
    ;
    if (!schema.validate(bad_event)) {
        std.debug.print("WARN (lenient): bad event accepted with warnings\\n", .{});
    }
}`,
      },
    ],
    runnablePython: `# JSON Schema validation — strict vs lenient modes
import random
import json
from collections import defaultdict

print("=== JSON Schema validation — 10M events/day, strict vs lenient ===\\n")

# JSON Schema (Draft 7) for FinTech events
# Required: event_id, account_id, amount_usd, event_ts
# Optional: currency, metadata, region

def validate_event(event):
    """Returns (is_valid, list_of_errors)."""
    errors = []
    if 'event_id' not in event:
        errors.append("missing required: event_id")
    if 'account_id' not in event:
        errors.append("missing required: account_id")
    elif not (isinstance(event['account_id'], str)
              and event['account_id'].startswith('ACC-')
              and len(event['account_id']) == 12):
        errors.append(f"account_id invalid format: {event.get('account_id')}")
    if 'amount_usd' not in event:
        errors.append("missing required: amount_usd")
    elif not (isinstance(event['amount_usd'], (int, float))
              and 0 <= event['amount_usd'] <= 100_000_000):
        errors.append(f"amount_usd out of bounds: {event.get('amount_usd')}")
    if 'event_ts' not in event:
        errors.append("missing required: event_ts")
    currency = event.get('currency')
    if currency is not None and currency not in ('USD', 'EUR', 'GBP', 'JPY'):
        errors.append(f"currency not in enum: {currency}")
    return (len(errors) == 0), errors

# Generate 10K events (1:1000 scale-down from 10M)
random.seed(99)
n_events = 10_000
accounts = [f"ACC-{random.randint(10_000_000, 99_999_999)}" for _ in range(1000)]

events = []
for i in range(n_events):
    roll = random.random()
    if roll < 0.7:  # 70% well-formed
        events.append({
            'event_id': f"uuid-{i}",
            'account_id': random.choice(accounts),
            'amount_usd': round(random.uniform(10, 5000), 2),
            'event_ts': '2024-09-01T10:00:00Z',
            'currency': random.choice(['USD', 'EUR', 'GBP', 'JPY']),
        })
    elif roll < 0.9:  # 20% missing optional field
        events.append({
            'event_id': f"uuid-{i}",
            'account_id': random.choice(accounts),
            'amount_usd': round(random.uniform(10, 5000), 2),
            'event_ts': '2024-09-01T10:00:00Z',
        })
    elif roll < 0.97:  # 7% invalid currency
        events.append({
            'event_id': f"uuid-{i}",
            'account_id': random.choice(accounts),
            'amount_usd': round(random.uniform(10, 5000), 2),
            'event_ts': '2024-09-01T10:00:00Z',
            'currency': 'XYZ',  # not in enum
        })
    else:  # 3% missing required field
        events.append({
            'event_id': f"uuid-{i}",
            # missing account_id, amount_usd
            'event_ts': '2024-09-01T10:00:00Z',
        })

# Strict mode — reject any invalid event
strict_accepted = 0
strict_rejected = 0
strict_reject_reasons = defaultdict(int)
for e in events:
    valid, errs = validate_event(e)
    if valid:
        strict_accepted += 1
    else:
        strict_rejected += 1
        strict_reject_reasons[errs[0]] += 1

# Lenient mode — log + accept all
lenient_accepted = 0
lenient_logged = 0
for e in events:
    valid, errs = validate_event(e)
    lenient_accepted += 1
    if not valid:
        lenient_logged += 1

print(f"Events generated: {n_events:,} (scaled down from 10M)")
print(f"\\nSTRICT mode (production default for FinTech):")
print(f"  Accepted: {strict_accepted:,} ({strict_accepted/n_events:.1%})")
print(f"  Rejected: {strict_rejected:,} ({strict_rejected/n_events:.1%})")
print(f"  Reject reasons:")
for reason, count in sorted(strict_reject_reasons.items(), key=lambda x: -x[1]):
    print(f"    {count}x {reason[:60]}")

print(f"\\nLENIENT mode (observability events):")
print(f"  Accepted: {lenient_accepted:,} (100% — always accept)")
print(f"  Logged with warnings: {lenient_logged:,} ({lenient_logged/n_events:.1%})")

print("\\nKey insight: JSON has NO wire format guarantees (vs Avro/Protobuf).")
print("Any bytes can claim to be JSON. Strict schema enforcement is therefore")
print("more critical for JSON than for binary formats — without it, downstream")
print("consumers see random shape mismatches at the worst possible time.")`,
    insight: "JSON Schema validation is more critical than Avro/Protobuf because JSON has no wire-format guarantees — any bytes can be claimed as JSON. Strict mode (reject on violation) is the production default for governance-critical data (financial events, PII). Lenient mode (log + accept) suits observability events where lossy data beats no data. The Schema Registry enforces the schema on the producer side — preventing bad events from ever entering the topic.",
  },
];
