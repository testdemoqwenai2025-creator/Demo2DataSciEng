// ============================================================
// Dataset examples for Phase 4 pages:
//   Tabular · Databricks Lakehouse · Snowflake Polaris · AWS Lake Formation
// 12 examples (3 per page) × 5 languages (Scala/Rust/Go/Elixir/Zig)
// ============================================================

import type { DatasetExample } from "./dataset-cards";
import {
  Database, Atom, Boxes, Zap, TrendingUp, Activity, Cpu, History,
  Workflow, Layers, Network, ShieldCheck, Server, Sparkles, FileText,
  GitBranch, Cloud, ShieldAlert, Lock, Building2, Briefcase,
} from "lucide-react";

// ============================================================
// TABULAR — 3 dataset examples (SaaS Iceberg platform)
// ============================================================

export const TABULAR_EXAMPLES: DatasetExample[] = [
  {
    id: "tabular-saas-iceberg-platform",
    step: "1",
    title: "Tabular SaaS Iceberg platform (10TB managed)",
    subtitle: "Synthetic — managed catalog + Trino compute",
    accent: "oklch(0.62 0.18 250)",
    icon: <Boxes className="h-4 w-4" />,
    badge: "Synthetic 10TB managed",
    brief: {
      dataset: "Synthetic: 10TB of customer events on Tabular's managed Iceberg platform. Tabular provides the catalog (REST, Apache-licensed) + the compute (Trino) as a single SaaS — analysts bring only their cloud bucket.",
      scale: "~10TB across 50 tables · ~1.2K queries/day · sub-second catalog lookups · ~5min average Trino query latency",
      why: "Tabular (founded by Iceberg spec authors Ryan Blue + Daniel Weeks, acquired by Snowflake 2024) was the first end-to-end SaaS Iceberg platform. The bet: remove operational overhead (catalog tuning, Trino cluster management, compaction) so data teams focus only on SQL. Acquisition made Tabular the open-source alternative within Snowflake's commercial offering.",
    },
    stats: [
      { label: "Total size", value: "10TB" },
      { label: "Tables", value: "~50" },
      { label: "Queries/day", value: "~1.2K" },
      { label: "Catalog latency", value: "<1s" },
    ],
    tools: ["Tabular SaaS Catalog (REST)", "Tabular-managed Trino", "Tabular Optimizer (auto-compaction)", "Iceberg v2 row-level", "S3 + Azure + GCP storage", "Snowflake cross-read"],
    codeTabs: [
      {
        lang: "scala",
        filename: "TabularSaasPlatform.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.iceberg.tabular.TabularCatalog

// Connect Spark to Tabular SaaS — REST catalog with OAuth2
// No infrastructure to manage: Tabular hosts the catalog + Trino
val spark = SparkSession.builder()
  .appName("tabular_customer_events")
  .config("spark.sql.catalog.tabular", classOf[org.apache.iceberg.spark.SparkCatalog].getName)
  .config("spark.sql.catalog.tabular.catalog-impl", classOf[TabularCatalog].getName)
  .config("spark.sql.catalog.tabular.uri", "https://api.tabular.io/ws")
  .config("spark.sql.catalog.tabular.credential", sys.env("TABULAR_CREDENTIAL"))
  .config("spark.sql.catalog.tabular.warehouse", "s3://moderndatascieng-tabular")
  .config("spark.sql.catalog.tabular.region", "us-east-1")
  .getOrCreate()

// Create a managed table — Tabular auto-tunes partition spec + file size
spark.sql("""
  |CREATE TABLE tabular.warehouse.customer_events (
  |  event_id        BIGINT,
  |  customer_id     BIGINT,
  |  event_ts        TIMESTAMP,
  |  event_type      STRING,
  |  payload         STRING,
  |  is_deleted      BOOLEAN
  |) USING iceberg
  |PARTITIONED BY (days(event_ts), bucket(16, customer_id))
  |TBLPROPERTIES (
  |  'format-version'='2',
  |  'write.target-file-size-bytes'='536870912'
  |)
""".stripMargin)

// INSERT 10TB batch — Tabular coalesces small files automatically
spark.sql("""
  |INSERT INTO tabular.warehouse.customer_events
  |SELECT * FROM staging.customer_events_raw
  |WHERE event_date = '2024-09-25'
""".stripMargin)

// Auto-optimization — Tabular runs compaction in the background
// No need for manual CALL sys.run_compaction() jobs
spark.sql("ALTER TABLE tabular.warehouse.customer_events EXECUTE OPTIMIZE")

// Read via Tabular-managed Trino (zero Spark cluster needed)
// P50 query latency ~5min, P95 ~12min on 10TB`,
      },
      {
        lang: "rust",
        filename: "tabular_saas_platform.rs",
        code: `use iceberg_rust::{TabularCatalog, SparkSession};
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Connect to Tabular SaaS — managed REST catalog + Trino compute
    let catalog = TabularCatalog::builder()
        .uri("https://api.tabular.io/ws")
        .credential(env::var("TABULAR_CREDENTIAL")?)
        .warehouse("s3://moderndatascieng-tabular")
        .region("us-east-1")
        .build()
        .await?;

    // Create managed table — Tabular auto-tunes partition spec
    catalog.sql(r#"
        CREATE TABLE warehouse.customer_events (
            event_id BIGINT, customer_id BIGINT, event_ts TIMESTAMP,
            event_type STRING, payload STRING, is_deleted BOOLEAN
        ) USING iceberg
        PARTITIONED BY (days(event_ts), bucket(16, customer_id))
        TBLPROPERTIES ('format-version'='2',
                        'write.target-file-size-bytes'='536870912')
    "#).await?;

    // INSERT 10TB batch — Tabular coalesces small files in the background
    let spark = SparkSession::connect_catalog(&catalog).await?;
    spark.sql(r#"
        INSERT INTO warehouse.customer_events
        SELECT * FROM staging.customer_events_raw
        WHERE event_date = '2024-09-25'
    "#).await?;

    // Auto-optimization — no manual compaction jobs required
    spark.sql("ALTER TABLE warehouse.customer_events EXECUTE OPTIMIZE").await?;

    // Read via Tabular-managed Trino — zero Spark cluster needed
    let trino = catalog.trino_endpoint();  // https://api.tabular.io/ws/trino
    println!("Trino endpoint: {}", trino);
    println!("P50 query latency on 10TB: ~5min");

    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "tabular_saas_platform.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"
    "os"

    tabular "github.com/tabular-io/tabular-go"
    spark "github.com/apache/spark-connect-go"
)

func main() {
    ctx := context.Background()

    // Connect to Tabular SaaS — managed REST catalog
    catalog, err := tabular.NewCatalog(ctx, tabular.Config{
        URI:        "https://api.tabular.io/ws",
        Credential: os.Getenv("TABULAR_CREDENTIAL"),
        Warehouse:  "s3://moderndatascieng-tabular",
        Region:     "us-east-1",
    })
    if err != nil { log.Fatalf("catalog: %v", err) }

    // Create managed table — Tabular auto-tunes partition spec + file size
    _, err = catalog.SQL(ctx, \`
        CREATE TABLE warehouse.customer_events (
            event_id BIGINT, customer_id BIGINT, event_ts TIMESTAMP,
            event_type STRING, payload STRING, is_deleted BOOLEAN
        ) USING iceberg
        PARTITIONED BY (days(event_ts), bucket(16, customer_id))
        TBLPROPERTIES ('format-version'='2',
                        'write.target-file-size-bytes'='536870912')
    \`)
    if err != nil { log.Fatalf("create: %v", err) }

    // INSERT 10TB batch — Tabular coalesces small files in the background
    sparkSession, _ := spark.NewSession(ctx, catalog)
    _, err = sparkSession.SQL(ctx, \`
        INSERT INTO warehouse.customer_events
        SELECT * FROM staging.customer_events_raw
        WHERE event_date = '2024-09-25'
    \`)
    if err != nil { log.Fatalf("insert: %v", err) }

    // Auto-optimization — no manual compaction jobs required
    _, _ = sparkSession.SQL(ctx,
        "ALTER TABLE warehouse.customer_events EXECUTE OPTIMIZE")

    // Read via Tabular-managed Trino
    fmt.Printf("Trino endpoint: %s\\n", catalog.TrinoEndpoint())
    fmt.Println("P50 query latency on 10TB: ~5min")
}`,
      },
      {
        lang: "elixir",
        filename: "tabular_saas_platform.ex",
        code: `defmodule Tabular.SaasPlatform do
  @moduledoc "Tabular SaaS Iceberg platform — managed catalog + Trino"
  @tabular_uri "https://api.tabular.io/ws"

  def setup_customer_events do
    credential = System.get_env("TABULAR_CREDENTIAL")

    # Connect to Tabular SaaS — REST catalog with OAuth2
    catalog = Tabular.Catalog.new()
      |> Tabular.Catalog.uri(@tabular_uri)
      |> Tabular.Catalog.credential(credential)
      |> Tabular.Catalog.warehouse("s3://moderndatascieng-tabular")
      |> Tabular.Catalog.region("us-east-1")

    # Create managed table — Tabular auto-tunes partition spec
    Spark.sql(catalog, """
      CREATE TABLE warehouse.customer_events (
        event_id BIGINT, customer_id BIGINT, event_ts TIMESTAMP,
        event_type STRING, payload STRING, is_deleted BOOLEAN
      ) USING iceberg
      PARTITIONED BY (days(event_ts), bucket(16, customer_id))
      TBLPROPERTIES ('format-version'='2',
                      'write.target-file-size-bytes'='536870912')
    """)

    # INSERT 10TB batch — Tabular coalesces small files in the background
    Spark.sql(catalog, """
      INSERT INTO warehouse.customer_events
      SELECT * FROM staging.customer_events_raw
      WHERE event_date = '2024-09-25'
    """)

    # Auto-optimization — no manual compaction jobs required
    Spark.sql(catalog,
      "ALTER TABLE warehouse.customer_events EXECUTE OPTIMIZE")

    # Read via Tabular-managed Trino — zero Spark cluster needed
    IO.puts("Trino endpoint: #{Tabular.Catalog.trino_endpoint(catalog)}")
    IO.puts("P50 query latency on 10TB: ~5min")
    :ok
  end
end`,
      },
      {
        lang: "zig",
        filename: "tabular_saas_platform.zig",
        code: `const std = @import("std");
const tabular = @import("tabular-zig");
const spark = @import("spark-connect-zig");

pub fn setup_customer_events(alloc: std.mem.Allocator) !void {
    const credential = std.posix.getenv("TABULAR_CREDENTIAL") orelse "";

    // Connect to Tabular SaaS — managed REST catalog + Trino compute
    var catalog = try tabular.Catalog.init(alloc, .{
        .uri = "https://api.tabular.io/ws",
        .credential = credential,
        .warehouse = "s3://moderndatascieng-tabular",
        .region = "us-east-1",
    });
    defer catalog.deinit();

    // Create managed table — Tabular auto-tunes partition spec
    try catalog.sql(
        \\CREATE TABLE warehouse.customer_events (
        \\  event_id BIGINT, customer_id BIGINT, event_ts TIMESTAMP,
        \\  event_type STRING, payload STRING, is_deleted BOOLEAN
        \\) USING iceberg
        \\PARTITIONED BY (days(event_ts), bucket(16, customer_id))
        \\TBLPROPERTIES ('format-version'='2',
        \\                'write.target-file-size-bytes'='536870912')
    );

    // INSERT 10TB batch — Tabular coalesces small files in the background
    var session = try spark.Session.connect_catalog(&catalog);
    defer session.deinit();
    try session.sql(
        \\INSERT INTO warehouse.customer_events
        \\SELECT * FROM staging.customer_events_raw
        \\WHERE event_date = '2024-09-25'
    );

    // Auto-optimization — no manual compaction jobs required
    try session.sql("ALTER TABLE warehouse.customer_events EXECUTE OPTIMIZE");

    // Read via Tabular-managed Trino — zero Spark cluster needed
    const trino = catalog.trino_endpoint();
    std.debug.print("Trino endpoint: {s}\\n", .{trino});
    std.debug.print("P50 query latency on 10TB: ~5min\\n", .{});
}`,
      },
    ],
    runnablePython: `# Tabular SaaS Iceberg platform — simulation
import random
from collections import defaultdict

random.seed(42)
print("=== Tabular SaaS — managed catalog + Trino compute ===")
print("Scale: 10TB across 50 tables, ~1.2K queries/day\\n")

# Simulate Tabular catalog operations — REST catalog + managed Trino
n_tables = 50
total_tb = 10
queries_per_day = 1200

# Catalog latency — Tabular hosts the catalog, sub-second lookups
catalog_lookups = [random.uniform(0.4, 0.9) for _ in range(100)]
avg_catalog_ms = sum(catalog_lookups) / len(catalog_lookups) * 1000
print(f"Catalog lookup latency (100 samples):")
print(f"  avg: {avg_catalog_ms:.0f}ms  P50: {sorted(catalog_lookups)[50]*1000:.0f}ms  "
      f"P95: {sorted(catalog_lookups)[95]*1000:.0f}ms")

# Auto-optimization — Tabular runs compaction in the background
print(f"\\nAuto-optimization (no manual CALL sys.run_compaction()):")
for table_idx in range(5):  # show 5 tables
    table_name = f"customer_events_t{table_idx}"
    files_before = random.randint(50, 200)
    files_after = max(20, files_before // 5)
    bytes_before = files_before * 50_000_000  # ~50MB avg small files
    bytes_after = files_after * 500_000_000   # ~500MB target size
    print(f"  {table_name}: {files_before} small files -> "
          f"{files_after} optimized files "
          f"({bytes_before/1e9:.1f}GB -> {bytes_after/1e9:.1f}GB)")

# Query latency — Tabular-managed Trino
print(f"\\nTrino query latency on {total_tb}TB across {n_tables} tables:")
latencies = []
for _ in range(queries_per_day):
    # most queries hit a single table partition
    n_files_scanned = random.randint(5, 50)
    base_latency = 30 + n_files_scanned * 4  # 30s base + 4s per file
    latencies.append(base_latency)
latencies.sort()
p50 = latencies[queries_per_day // 2]
p95 = latencies[int(queries_per_day * 0.95)]
p99 = latencies[int(queries_per_day * 0.99)]
print(f"  P50: {p50}s   P95: {p95}s   P99: {p99}s   "
      f"avg: {sum(latencies)/len(latencies):.0f}s")

# Compute cost — Tabular charges per-second for Trino compute
print(f"\\nCost simulation (per-day, {queries_per_day} queries):")
total_compute_seconds = sum(latencies)
hours = total_compute_seconds / 3600
print(f"  Total compute time: {total_compute_seconds:,}s ({hours:.0f}h)")
print(f"  At Tabular pricing (USD 0.05/sec for medium warehouse): "
      f"~USD {total_compute_seconds * 0.05:,.0f}/day")

# Operational overhead comparison — Tabular vs self-hosted
print(f"\\n=== Operational overhead (Tabular vs self-hosted) ===")
print(f"  Self-hosted:   2 FTE managing Trino cluster + catalog (\\$500K/yr)")
print(f"  Tabular SaaS:  0 FTE — fully managed (pay per query)")
print(f"  ROI break-even: ~10TB scale — above that self-hosted becomes cheaper")
print(f"  Above 50TB:    self-hosted Trino on EKS is more cost-effective")
print(f"\\nKey insight: Tabular is the Iceberg SaaS — the bet is that")
print(f"small-to-mid teams (under 50TB) prefer managed over self-hosted,")
print(f"trading per-query cost for zero ops overhead. Snowflake acquired")
print(f"Tabular (2024) to add this managed Iceberg offering to their stack,")
print(f"keeping the open-source Tabular team intact.")`,
    insight: "Tabular is the only fully-managed SaaS Iceberg platform — it hosts the catalog AND the compute (Trino). The bet (founded by Iceberg spec authors Ryan Blue + Daniel Weeks, acquired by Snowflake 2024) is that small-to-mid teams (under 50TB) prefer paying per-query over hiring 2 FTE to manage Trino + the catalog. Above 50TB, self-hosted Trino on EKS becomes cheaper. Snowflake acquired Tabular specifically to add this managed Iceberg offering, keeping the open-source Tabular team intact as the open bet inside the commercial offering.",
  },
  {
    id: "tabular-multi-cloud-catalog",
    step: "2",
    title: "Multi-cloud catalog (5TB per cloud)",
    subtitle: "Synthetic — one catalog, three clouds",
    accent: "oklch(0.65 0.18 145)",
    icon: <Cloud className="h-4 w-4" />,
    badge: "Synthetic AWS+Azure+GCP",
    brief: {
      dataset: "Synthetic: 5TB per cloud across AWS S3, Azure ADLS, Google Cloud Storage — 15TB total. One Tabular catalog manages all three cloud buckets with a single REST endpoint, single OAuth2 credential, single RBAC policy.",
      scale: "15TB total · 3 cloud providers · 1 catalog endpoint · 1 OAuth2 credential · sub-second cross-cloud JOIN",
      why: "Multi-cloud is the killer feature of open catalogs — closed catalogs (Glue = AWS-only, Unity = Databricks-bound) cannot span providers. Tabular's REST catalog abstracts the storage layer — clients see one catalog, one auth, one RBAC, even though data is on three clouds. Critical for: disaster recovery (replicate S3 → GCS), avoiding cloud lock-in (no rewrite to move workloads), regulatory data residency (PII in EU Azure, non-PII in US AWS).",
    },
    stats: [
      { label: "Total size", value: "15TB" },
      { label: "Cloud providers", value: "3" },
      { label: "Catalog endpoints", value: "1" },
      { label: "Auth credentials", value: "1" },
    ],
    tools: ["Tabular SaaS Catalog", "S3 (AWS)", "ADLS Gen2 (Azure)", "GCS (GCP)", "OAuth2 cross-cloud", "Trino federation"],
    codeTabs: [
      {
        lang: "scala",
        filename: "TabularMultiCloudCatalog.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.iceberg.tabular.TabularCatalog

// One Spark session, three cloud buckets, one catalog endpoint
// Tabular's REST catalog abstracts the storage layer
val spark = SparkSession.builder()
  .appName("tabular_multi_cloud")
  .config("spark.sql.catalog.tabular", classOf[org.apache.iceberg.spark.SparkCatalog].getName)
  .config("spark.sql.catalog.tabular.catalog-impl", classOf[TabularCatalog].getName)
  .config("spark.sql.catalog.tabular.uri", "https://api.tabular.io/ws")
  .config("spark.sql.catalog.tabular.credential", sys.env("TABULAR_CREDENTIAL"))
  // Three warehouses — one per cloud provider
  .config("spark.sql.catalog.tabular.warehouses",
    "s3://moderndatascieng-tabular-aws,abfss://tabular@moderndatasciengprod.dfs.core.windows.net,gs://moderndatascieng-tabular-gcp")
  .getOrCreate()

// Create tables on each cloud — same catalog, same auth
spark.sql("""
  |CREATE TABLE tabular.aws.customer_events    -- stored on S3
  |USING iceberg
  |AS SELECT * FROM staging.events WHERE region = 'us-east-1'
""".stripMargin)

spark.sql("""
  |CREATE TABLE tabular.azure.customer_events -- stored on ADLS Gen2
  |USING iceberg
  |AS SELECT * FROM staging.events WHERE region = 'eu-west-1'
""".stripMargin)

spark.sql("""
  |CREATE TABLE tabular.gcp.customer_events   -- stored on GCS
  |USING iceberg
  |AS SELECT * FROM staging.events WHERE region = 'asia-east1'
""".stripMargin)

// Cross-cloud JOIN — one query, three clouds
spark.sql("""
  |SELECT region, count(*) AS n_events, sum(amount) AS total_revenue
  |FROM (
  |  SELECT 'us-east-1' AS region, * FROM tabular.aws.customer_events
  |  UNION ALL
  |  SELECT 'eu-west-1' AS region, * FROM tabular.azure.customer_events
  |  UNION ALL
  |  SELECT 'asia-east1' AS region, * FROM tabular.gcp.customer_events
  |)
  |GROUP BY region
  |ORDER BY total_revenue DESC
""".stripMargin)

// One RBAC policy across three clouds
// Tabular principal grants apply regardless of underlying storage
spark.sql("SHOW GRANTS ON tabular.azure.customer_events")
// -> principal=analyst@moderndatascieng.com, privilege=SELECT, scope=table`,
      },
      {
        lang: "rust",
        filename: "tabular_multi_cloud_catalog.rs",
        code: `use iceberg_rust::{TabularCatalog, SparkSession};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // One catalog, three cloud warehouses — Tabular abstracts storage
    let catalog = TabularCatalog::builder()
        .uri("https://api.tabular.io/ws")
        .credential(std::env::var("TABULAR_CREDENTIAL")?)
        .warehouses(vec![
            "s3://moderndatascieng-tabular-aws",
            "abfss://tabular@moderndatasciengprod.dfs.core.windows.net",
            "gs://moderndatascieng-tabular-gcp",
        ])
        .build().await?;

    let spark = SparkSession::connect_catalog(&catalog).await?;

    // Create tables on each cloud — same catalog, same auth
    spark.sql(r#"
        CREATE TABLE aws.customer_events   -- stored on S3
        USING iceberg
        AS SELECT * FROM staging.events WHERE region = 'us-east-1'
    "#).await?;
    spark.sql(r#"
        CREATE TABLE azure.customer_events -- stored on ADLS Gen2
        USING iceberg
        AS SELECT * FROM staging.events WHERE region = 'eu-west-1'
    "#).await?;
    spark.sql(r#"
        CREATE TABLE gcp.customer_events   -- stored on GCS
        USING iceberg
        AS SELECT * FROM staging.events WHERE region = 'asia-east1'
    "#).await?;

    // Cross-cloud JOIN — one query, three clouds
    let results = spark.sql(r#"
        SELECT region, count(*) AS n_events, sum(amount) AS total_revenue
        FROM (
            SELECT 'us-east-1' AS region, * FROM aws.customer_events
            UNION ALL
            SELECT 'eu-west-1' AS region, * FROM azure.customer_events
            UNION ALL
            SELECT 'asia-east1' AS region, * FROM gcp.customer_events
        )
        GROUP BY region ORDER BY total_revenue DESC
    "#).collect().await?;

    println!("Cross-cloud query returned {} rows", results.num_rows());
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "tabular_multi_cloud_catalog.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"
    "os"

    tabular "github.com/tabular-io/tabular-go"
    spark "github.com/apache/spark-connect-go"
)

func main() {
    ctx := context.Background()
    catalog, _ := tabular.NewCatalog(ctx, tabular.Config{
        URI:        "https://api.tabular.io/ws",
        Credential: os.Getenv("TABULAR_CREDENTIAL"),
        Warehouses: []string{
            "s3://moderndatascieng-tabular-aws",
            "abfss://tabular@moderndatasciengprod.dfs.core.windows.net",
            "gs://moderndatascieng-tabular-gcp",
        },
    })

    sparkSession, _ := spark.NewSession(ctx, catalog)

    // Create tables on each cloud — same catalog, same auth
    clouds := []struct{ ns, region, where string }{
        {"aws",   "us-east-1",  "region = 'us-east-1'"},
        {"azure", "eu-west-1",  "region = 'eu-west-1'"},
        {"gcp",   "asia-east1", "region = 'asia-east1'"},
    }
    for _, c := range clouds {
        _, err := sparkSession.SQL(ctx, fmt.Sprintf(\`
            CREATE TABLE %s.customer_events USING iceberg
            AS SELECT * FROM staging.events WHERE %s
        \`, c.ns, c.where))
        if err != nil { log.Fatalf("%s: %v", c.ns, err) }
    }

    // Cross-cloud JOIN — one query, three clouds
    rows, _ := sparkSession.SQL(ctx, \`
        SELECT region, count(*) AS n_events, sum(amount) AS total_revenue
        FROM (
            SELECT 'us-east-1' AS region, * FROM aws.customer_events
            UNION ALL SELECT 'eu-west-1' AS region, * FROM azure.customer_events
            UNION ALL SELECT 'asia-east1' AS region, * FROM gcp.customer_events
        )
        GROUP BY region ORDER BY total_revenue DESC
    \`)
    fmt.Printf("Cross-cloud query returned %d rows\\n", rows.RowCount)
}`,
      },
      {
        lang: "elixir",
        filename: "tabular_multi_cloud_catalog.ex",
        code: `defmodule Tabular.MultiCloudCatalog do
  @moduledoc "One catalog, three clouds — Tabular abstracts storage"
  @tabular_uri "https://api.tabular.io/ws"

  def setup_three_clouds do
    credential = System.get_env("TABULAR_CREDENTIAL")

    catalog = Tabular.Catalog.new()
      |> Tabular.Catalog.uri(@tabular_uri)
      |> Tabular.Catalog.credential(credential)
      |> Tabular.Catalog.warehouses([
        "s3://moderndatascieng-tabular-aws",
        "abfss://tabular@moderndatasciengprod.dfs.core.windows.net",
        "gs://moderndatascieng-tabular-gcp"
      ])

    # Create tables on each cloud — same catalog, same auth
    clouds = [
      {"aws",   "us-east-1",  "region = 'us-east-1'"},
      {"azure", "eu-west-1",  "region = 'eu-west-1'"},
      {"gcp",   "asia-east1", "region = 'asia-east1'"}
    ]

    Enum.each(clouds, fn {ns, _region, where} ->
      Spark.sql(catalog, """
        CREATE TABLE #{ns}.customer_events USING iceberg
        AS SELECT * FROM staging.events WHERE #{where}
      """)
    end)

    # Cross-cloud JOIN — one query, three clouds
    Spark.sql(catalog, """
      SELECT region, count(*) AS n_events, sum(amount) AS total_revenue
      FROM (
        SELECT 'us-east-1' AS region, * FROM aws.customer_events
        UNION ALL
        SELECT 'eu-west-1' AS region, * FROM azure.customer_events
        UNION ALL
        SELECT 'asia-east1' AS region, * FROM gcp.customer_events
      )
      GROUP BY region ORDER BY total_revenue DESC
    """)

    :ok
  end
end`,
      },
      {
        lang: "zig",
        filename: "tabular_multi_cloud_catalog.zig",
        code: `const std = @import("std");
const tabular = @import("tabular-zig");
const spark = @import("spark-connect-zig");

pub fn setup_three_clouds(alloc: std.mem.Allocator) !void {
    const credential = std.posix.getenv("TABULAR_CREDENTIAL") orelse "";

    // One catalog, three cloud warehouses — Tabular abstracts storage
    var catalog = try tabular.Catalog.init(alloc, .{
        .uri = "https://api.tabular.io/ws",
        .credential = credential,
        .warehouses = &[_][]const u8{
            "s3://moderndatascieng-tabular-aws",
            "abfss://tabular@moderndatasciengprod.dfs.core.windows.net",
            "gs://moderndatascieng-tabular-gcp",
        },
    });
    defer catalog.deinit();

    var session = try spark.Session.connect_catalog(&catalog);
    defer session.deinit();

    // Create tables on each cloud — same catalog, same auth
    try session.sql(
        \\CREATE TABLE aws.customer_events USING iceberg
        \\AS SELECT * FROM staging.events WHERE region = 'us-east-1'
    );
    try session.sql(
        \\CREATE TABLE azure.customer_events USING iceberg
        \\AS SELECT * FROM staging.events WHERE region = 'eu-west-1'
    );
    try session.sql(
        \\CREATE TABLE gcp.customer_events USING iceberg
        \\AS SELECT * FROM staging.events WHERE region = 'asia-east1'
    );

    // Cross-cloud JOIN — one query, three clouds
    try session.sql(
        \\SELECT region, count(*) AS n_events, sum(amount) AS total_revenue
        \\FROM (
        \\  SELECT 'us-east-1' AS region, * FROM aws.customer_events
        \\  UNION ALL
        \\  SELECT 'eu-west-1' AS region, * FROM azure.customer_events
        \\  UNION ALL
        \\  SELECT 'asia-east1' AS region, * FROM gcp.customer_events
        \\)
        \\GROUP BY region ORDER BY total_revenue DESC
    );
}`,
      },
    ],
    runnablePython: `# Multi-cloud catalog simulation — one catalog, three clouds
import random
from collections import defaultdict

random.seed(42)
print("=== Tabular multi-cloud — one catalog, three clouds ===")
print("Scale: 5TB per cloud × 3 clouds = 15TB total\\n")

# Three cloud providers — same catalog endpoint, single OAuth2 credential
clouds = [
    {"name": "AWS S3",     "region": "us-east-1",  "latency_ms": 8},
    {"name": "Azure ADLS", "region": "eu-west-1",  "latency_ms": 12},
    {"name": "GCP GCS",    "region": "asia-east1", "latency_ms": 15},
]

# Simulate per-cloud storage + cross-cloud catalog operations
for c in clouds:
    n_tables = random.randint(15, 25)
    total_gb = 5000
    avg_table_gb = total_gb / n_tables
    print(f"  {c['name']:14s} ({c['region']}): {n_tables} tables, "
          f"~{total_gb/1000:.1f}TB total, "
          f"avg table {avg_table_gb:.0f}GB, "
          f"storage latency {c['latency_ms']}ms")

# Single OAuth2 credential — one auth across three clouds
print(f"\\n=== Auth: single OAuth2 credential ===")
print(f"  Credential: TABULAR_CREDENTIAL (one env var)")
print(f"  Applies to: AWS S3 + Azure ADLS + GCP GCS")
print(f"  No per-cloud IAM role to manage")
print(f"  No per-cloud service account to rotate")

# Cross-cloud JOIN — one query, three clouds
print(f"\\n=== Cross-cloud JOIN (one query, three clouds) ===")
# Each cloud query hits ~5GB of data, ~200ms to scan
per_cloud_latency = [c['latency_ms'] + 200 for c in clouds]
total_join_ms = max(per_cloud_latency) + 50  # JOIN overhead
print(f"  Per-cloud scan: {per_cloud_latency} ms (parallel)")
print(f"  JOIN overhead:  50ms (Tabular optimizer)")
print(f"  Total:          {total_join_ms}ms  (sub-second cross-cloud federation)")

# Operational overhead comparison — Tabular multi-cloud vs DIY
print(f"\\n=== Operational overhead: Tabular vs DIY multi-cloud ===")
print(f"  DIY multi-cloud:")
print(f"    - 3 separate catalogs (Glue for AWS, custom for Azure, custom for GCP)")
print(f"    - 3 IAM roles + 3 service accounts + 3 OAuth2 credentials")
print(f"    - Per-cloud federation glue code (~500 lines)")
print(f"    - RBAC policy drift across clouds (security risk)")
print(f"  Tabular multi-cloud:")
print(f"    - 1 catalog endpoint (Tabular REST)")
print(f"    - 1 OAuth2 credential")
print(f"    - 0 federation glue code (Tabular handles it)")
print(f"    - Single RBAC policy across clouds")

# Disaster recovery — replicate S3 -> GCS nightly
print(f"\\n=== Disaster recovery: S3 -> GCS replication ===")
n_files = 2500  # 5TB / 200MB avg file size
replication_rate = 500  # files per second (S3 -> GCS direct)
total_seconds = n_files / replication_rate
print(f"  Files: {n_files}, replication rate: {replication_rate}/s")
print(f"  Replication time: {total_seconds:.0f}s ({total_seconds/60:.1f}min)")
print(f"  Storage cost: AWS S3 + GCS dual-region (~$115/month for 5TB)")
print(f"  RPO: 24h (nightly replication), RTO: <5min (instant catalog failover)")

# Regulatory data residency — PII in EU Azure, non-PII in US AWS
print(f"\\n=== Regulatory data residency ===")
print(f"  EU customer PII -> Azure ADLS (eu-west-1) — GDPR-compliant region")
print(f"  US customer data  -> AWS S3 (us-east-1)  — US data residency")
print(f"  APAC customer data -> GCP GCS (asia-east1) — local data laws")
print(f"  One query JOINs all three — Tabular abstracts residency")
print(f"\\nKey insight: Tabular's multi-cloud is structural — closed catalogs")
print(f"(Glue=AWS, Unity=Databricks) cannot span providers. The REST catalog")
print(f"spec decouples catalog from storage, enabling one auth, one RBAC,")
print(f"one federation layer. Snowflake bet on this for the long game: if")
print(f"customers multi-cloud, the open catalog wins.")`,
    insight: "Multi-cloud is the killer feature of open catalogs — closed catalogs (Glue = AWS-only, Unity = Databricks-bound) cannot span providers. Tabular's REST catalog abstracts the storage layer: clients see one catalog endpoint, one OAuth2 credential, one RBAC policy — even though the data lives on S3 + ADLS + GCS. Critical for: disaster recovery (replicate S3 → GCS nightly, sub-5min RTO via instant catalog failover), avoiding cloud lock-in (no rewrite to move workloads), and regulatory data residency (EU PII on Azure, US data on AWS, all joinable in one query).",
  },
  {
    id: "tabular-time-travel-audit",
    step: "3",
    title: "Time-travel at scale (1B rows, 1000 snapshots)",
    subtitle: "Synthetic — audit + reproducibility",
    accent: "oklch(0.62 0.16 30)",
    icon: <History className="h-4 w-4" />,
    badge: "Synthetic 1B rows × 1000 snaps",
    brief: {
      dataset: "Synthetic: 1 billion rows of customer events with 1000 historical snapshots retained. Every commit creates a new snapshot; old snapshots kept for 365 days for audit + ML reproducibility.",
      scale: "~1B rows · 1000 snapshots retained · 365-day audit window · ~50TB total data (live + snapshots) · sub-second snapshot lookup",
      why: "Time travel at scale is the killer feature for audit compliance + ML reproducibility. SELECT * VERSION AS OF N lets auditors reconstruct data as-of any past commit. ML teams re-run training against feature tables as-of the training cutoff. Tabular's manifest-tree pruning keeps snapshot lookups sub-second even with 1000 snapshots — the metadata layer is built for this scale.",
    },
    stats: [
      { label: "Rows", value: "1B" },
      { label: "Snapshots", value: "1000" },
      { label: "Retention", value: "365 days" },
      { label: "Snapshot lookup", value: "<1s" },
    ],
    tools: ["Tabular SaaS Catalog", "Iceberg v2 spec", "Manifest-tree pruning", "Snapshot expiry job", "Time-travel SQL (VERSION AS OF)", "ML reproducibility SDK"],
    codeTabs: [
      {
        lang: "scala",
        filename: "TabularTimeTravelAudit.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.iceberg.tabular.TabularCatalog
import java.sql.Timestamp
import java.time.{LocalDateTime, ZoneOffset}

// Connect to Tabular — 1B rows, 1000 snapshots retained
val spark = SparkSession.builder()
  .appName("tabular_time_travel")
  .config("spark.sql.catalog.tabular", classOf[org.apache.iceberg.spark.SparkCatalog].getName)
  .config("spark.sql.catalog.tabular.catalog-impl", classOf[TabularCatalog].getName)
  .config("spark.sql.catalog.tabular.uri", "https://api.tabular.io/ws")
  .config("spark.sql.catalog.tabular.credential", sys.env("TABULAR_CREDENTIAL"))
  .config("spark.sql.catalog.tabular.warehouse", "s3://moderndatascieng-tabular")
  // Configure snapshot retention — 365 days, max 1000 snapshots
  .config("spark.sql.catalog.tabular.history.expire.max-snapshot-age-days", "365")
  .config("spark.sql.catalog.tabular.history.expire.max-snapshots", "1000")
  .getOrCreate()

// Time travel — read as-of 30 days ago (audit compliance)
val thirty_days_ago = LocalDateTime.now().minusDays(30)
  .toInstant(ZoneOffset.UTC).toEpochMilli
val thirty_days_ago_ts = new Timestamp(thirty_days_ago)

val auditDf = spark.sql(s"""
  |SELECT customer_id, count(*) AS n_events, sum(amount) AS total_spend
  |FROM tabular.warehouse.customer_events
  |VERSION AS OF (SELECT snapshot_id FROM tabular.warehouse.customer_events.snapshots
  |              WHERE committed_at < timestamp '\${thirty_days_ago_ts}' ORDER BY committed_at DESC LIMIT 1)
  |GROUP BY customer_id
""".stripMargin)
auditDf.show(20)

// Time travel — read as-of a specific timestamp (ML reproducibility)
val training_cutoff = "2024-08-01 00:00:00"
val trainDf = spark.sql(s"""
  |SELECT * FROM tabular.warehouse.customer_events
  |TIMESTAMP AS OF '\${training_cutoff}'
  |WHERE event_type = 'purchase'
""".stripMargin)
println(s"Training rows: \${trainDf.count()}  (as-of \${training_cutoff})")

// Snapshot history — list all snapshots in the retention window
spark.sql("""
  |SELECT snapshot_id, parent_id, committed_at, operation,
  |       summary['added-records']  AS added_records,
  |       summary['deleted-records'] AS deleted_records,
  |       summary['total-records']  AS total_records
  |FROM tabular.warehouse.customer_events.snapshots
  |ORDER BY committed_at DESC
  |LIMIT 1000
""".stripMargin).show(20)

// Rollback to a previous snapshot (disaster recovery)
spark.sql("""
  |ALTER TABLE tabular.warehouse.customer_events
  |EXECUTE ROLLBACK TO SNAPSHOT_ID 1234567890
""".stripMargin)`,
      },
      {
        lang: "rust",
        filename: "tabular_time_travel_audit.rs",
        code: `use iceberg_rust::{TabularCatalog, SparkSession};
use chrono::{Utc, Duration};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Connect to Tabular — 1B rows, 1000 snapshots retained
    let catalog = TabularCatalog::builder()
        .uri("https://api.tabular.io/ws")
        .credential(std::env::var("TABULAR_CREDENTIAL")?)
        .warehouse("s3://moderndatascieng-tabular")
        .snapshot_retention_days(365)
        .max_snapshots(1000)
        .build().await?;

    let spark = SparkSession::connect_catalog(&catalog).await?;

    // Time travel — read as-of 30 days ago (audit compliance)
    let thirty_days_ago = Utc::now() - Duration::days(30);
    let audit_df = spark.sql(&format!(r#"
        SELECT customer_id, count(*) AS n_events, sum(amount) AS total_spend
        FROM warehouse.customer_events
        FOR SYSTEM_TIME AS OF TIMESTAMP '{ts}'
        GROUP BY customer_id
    "#, ts = thirty_days_ago)).await?;
    audit_df.show(20).await?;

    // Time travel — read as-of training cutoff (ML reproducibility)
    let training_cutoff = "2024-08-01 00:00:00";
    let train_df = spark.sql(&format!(r#"
        SELECT * FROM warehouse.customer_events
        FOR SYSTEM_TIME AS OF TIMESTAMP '{ts}'
        WHERE event_type = 'purchase'
    "#, ts = training_cutoff)).await?;
    let n_rows = train_df.count().await?;
    println!("Training rows: {} (as-of {})", n_rows, training_cutoff);

    // Snapshot history — list all in retention window
    let history = spark.sql(r#"
        SELECT snapshot_id, parent_id, committed_at, operation,
               summary['added-records']  AS added_records,
               summary['total-records']  AS total_records
        FROM warehouse.customer_events.snapshots
        ORDER BY committed_at DESC LIMIT 1000
    "#).collect().await?;
    println!("Snapshots in retention: {}", history.num_rows());

    // Rollback to a previous snapshot (disaster recovery)
    spark.sql("ALTER TABLE warehouse.customer_events "
              "EXECUTE ROLLBACK TO SNAPSHOT_ID 1234567890").await?;
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "tabular_time_travel_audit.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"
    "os"
    "time"

    tabular "github.com/tabular-io/tabular-go"
    spark "github.com/apache/spark-connect-go"
)

func main() {
    ctx := context.Background()
    catalog, _ := tabular.NewCatalog(ctx, tabular.Config{
        URI:                    "https://api.tabular.io/ws",
        Credential:             os.Getenv("TABULAR_CREDENTIAL"),
        Warehouse:              "s3://moderndatascieng-tabular",
        SnapshotRetentionDays:  365,
        MaxSnapshots:           1000,
    })

    sparkSession, _ := spark.NewSession(ctx, catalog)

    // Time travel — read as-of 30 days ago (audit compliance)
    thirtyDaysAgo := time.Now().AddDate(0, 0, -30).Format("2006-01-02 15:04:05")
    auditSQL := fmt.Sprintf(\`
        SELECT customer_id, count(*) AS n_events, sum(amount) AS total_spend
        FROM warehouse.customer_events
        FOR SYSTEM_TIME AS OF TIMESTAMP '%s'
        GROUP BY customer_id
    \`, thirtyDaysAgo)
    _, err := sparkSession.SQL(ctx, auditSQL)
    if err != nil { log.Fatalf("audit: %v", err) }

    // Time travel — read as-of training cutoff (ML reproducibility)
    trainingCutoff := "2024-08-01 00:00:00"
    trainSQL := fmt.Sprintf(\`
        SELECT * FROM warehouse.customer_events
        FOR SYSTEM_TIME AS OF TIMESTAMP '%s'
        WHERE event_type = 'purchase'
    \`, trainingCutoff)
    trainRows, _ := sparkSession.SQL(ctx, trainSQL)
    fmt.Printf("Training rows (as-of %s): %d\\n", trainingCutoff, trainRows.RowCount)

    // Snapshot history — list all in retention window
    _, err = sparkSession.SQL(ctx, \`
        SELECT snapshot_id, parent_id, committed_at, operation,
               summary['added-records']  AS added_records,
               summary['total-records']  AS total_records
        FROM warehouse.customer_events.snapshots
        ORDER BY committed_at DESC LIMIT 1000
    \`)

    // Rollback to a previous snapshot (disaster recovery)
    _, _ = sparkSession.SQL(ctx,
        "ALTER TABLE warehouse.customer_events EXECUTE ROLLBACK TO SNAPSHOT_ID 1234567890")
}`,
      },
      {
        lang: "elixir",
        filename: "tabular_time_travel_audit.ex",
        code: `defmodule Tabular.TimeTravelAudit do
  @moduledoc "Time-travel at scale — 1B rows, 1000 snapshots, audit + ML reproducibility"
  @tabular_uri "https://api.tabular.io/ws"

  def run do
    credential = System.get_env("TABULAR_CREDENTIAL")

    catalog = Tabular.Catalog.new()
      |> Tabular.Catalog.uri(@tabular_uri)
      |> Tabular.Catalog.credential(credential)
      |> Tabular.Catalog.warehouse("s3://moderndatascieng-tabular")
      |> Tabular.Catalog.snapshot_retention_days(365)
      |> Tabular.Catalog.max_snapshots(1000)

    # Time travel — read as-of 30 days ago (audit compliance)
    Spark.sql(catalog, """
      SELECT customer_id, count(*) AS n_events, sum(amount) AS total_spend
      FROM warehouse.customer_events
      FOR SYSTEM_TIME AS OF TIMESTAMP NOW() - INTERVAL '30 days'
      GROUP BY customer_id
    """)

    # Time travel — read as-of training cutoff (ML reproducibility)
    training_cutoff = "2024-08-01 00:00:00"
    Spark.sql(catalog, """
      SELECT * FROM warehouse.customer_events
      FOR SYSTEM_TIME AS OF TIMESTAMP '#{training_cutoff}'
      WHERE event_type = 'purchase'
    """)

    # Snapshot history — list all in retention window
    Spark.sql(catalog, """
      SELECT snapshot_id, parent_id, committed_at, operation,
             summary['added-records']  AS added_records,
             summary['total-records']  AS total_records
      FROM warehouse.customer_events.snapshots
      ORDER BY committed_at DESC LIMIT 1000
    """)

    # Rollback to a previous snapshot (disaster recovery)
    Spark.sql(catalog,
      "ALTER TABLE warehouse.customer_events EXECUTE ROLLBACK TO SNAPSHOT_ID 1234567890")

    :ok
  end
end`,
      },
      {
        lang: "zig",
        filename: "tabular_time_travel_audit.zig",
        code: `const std = @import("std");
const tabular = @import("tabular-zig");
const spark = @import("spark-connect-zig");

pub fn run(alloc: std.mem.Allocator) !void {
    const credential = std.posix.getenv("TABULAR_CREDENTIAL") orelse "";

    var catalog = try tabular.Catalog.init(alloc, .{
        .uri = "https://api.tabular.io/ws",
        .credential = credential,
        .warehouse = "s3://moderndatascieng-tabular",
        .snapshot_retention_days = 365,
        .max_snapshots = 1000,
    });
    defer catalog.deinit();

    var session = try spark.Session.connect_catalog(&catalog);
    defer session.deinit();

    // Time travel — read as-of 30 days ago (audit compliance)
    try session.sql(
        \\SELECT customer_id, count(*) AS n_events, sum(amount) AS total_spend
        \\FROM warehouse.customer_events
        \\FOR SYSTEM_TIME AS OF TIMESTAMP NOW() - INTERVAL '30 days'
        \\GROUP BY customer_id
    );

    // Time travel — read as-of training cutoff (ML reproducibility)
    try session.sql(
        \\SELECT * FROM warehouse.customer_events
        \\FOR SYSTEM_TIME AS OF TIMESTAMP '2024-08-01 00:00:00'
        \\WHERE event_type = 'purchase'
    );

    // Snapshot history — list all in retention window
    try session.sql(
        \\SELECT snapshot_id, parent_id, committed_at, operation,
        \\       summary['added-records']  AS added_records,
        \\       summary['total-records']  AS total_records
        \\FROM warehouse.customer_events.snapshots
        \\ORDER BY committed_at DESC LIMIT 1000
    );

    // Rollback to a previous snapshot (disaster recovery)
    try session.sql(
        "ALTER TABLE warehouse.customer_events EXECUTE ROLLBACK TO SNAPSHOT_ID 1234567890"
    );
}`,
      },
    ],
    runnablePython: `# Time-travel at scale — 1B rows, 1000 snapshots
import random
from collections import defaultdict, deque

random.seed(42)
print("=== Tabular time travel — 1B rows, 1000 snapshots retained ===")
print("Scale: ~1B rows · 1000 snapshots · 365-day retention · ~50TB total\\n")

# Simulate snapshot chain — each commit creates a new snapshot
n_snapshots = 1000
rows_per_snapshot_avg = 1_000_000  # 1M rows per commit
base_rows = 990_000_000  # initial 990M rows

snapshots = []
total_rows = base_rows
for snap_id in range(1, n_snapshots + 1):
    op = random.choice(["append", "append", "append", "overwrite", "delete"])
    if op == "append":
        delta = random.randint(500_000, 1_500_000)
        total_rows += delta
    elif op == "overwrite":
        delta = random.randint(-100_000, 100_000)
        total_rows += delta
    elif op == "delete":
        delta = -random.randint(100_000, 500_000)
        total_rows += delta
    snapshots.append({
        "snapshot_id": snap_id,
        "parent_id": snap_id - 1 if snap_id > 1 else None,
        "operation": op,
        "total_rows": total_rows,
        "committed_at_day": snap_id,  # day 1, day 2, ...
    })

print(f"Snapshots created: {len(snapshots)}")
print(f"Final row count:   {snapshots[-1]['total_rows']:,}")
print(f"Total data size:   ~{(snapshots[-1]['total_rows'] * 50) / 1e12:.1f}TB (50B/row)")

# Snapshot lookup latency — manifest-tree pruning keeps it sub-second
print(f"\\n=== Snapshot lookup latency (manifest-tree pruning) ===")
lookup_latencies = []
for _ in range(100):
    # Each lookup walks: metadata.json -> snapshot -> manifest list -> manifests
    # Tabular caches the manifest list -> sub-ms lookups for cached snapshots
    cache_hit = random.random() < 0.85  # 85% cache hit rate
    if cache_hit:
        lookup_latencies.append(random.uniform(0.5, 2.0))  # sub-2ms cached
    else:
        lookup_latencies.append(random.uniform(50, 200))  # 50-200ms cold
lookup_latencies.sort()
p50 = lookup_latencies[50]
p95 = lookup_latencies[int(len(lookup_latencies) * 0.95)]
p99 = lookup_latencies[int(len(lookup_latencies) * 0.99)]
print(f"  P50: {p50:.1f}ms  P95: {p95:.1f}ms  P99: {p99:.1f}ms")
print(f"  Cache hit rate: 85% (manifest list cached in catalog server)")

# Time-travel read — VERSION AS OF N
print(f"\\n=== Time-travel read — VERSION AS OF N ===")
target_snap = snapshots[800]  # snapshot 800 (200 days ago)
print(f"  Target snapshot: #{target_snap['snapshot_id']} "
      f"(day {target_snap['committed_at_day']})")
print(f"  Operation:       {target_snap['operation']}")
print(f"  Rows at snapshot: {target_snap['total_rows']:,}")
print(f"  Lookup time:     ~{p95:.0f}ms (sub-second)")

# Audit compliance — reconstruct data as-of 30 days ago
print(f"\\n=== Audit compliance — GDPR Article 15 (right of access) ===")
target_day = 970  # snapshot 970 = 30 days ago
audit_snap = snapshots[target_day - 1]
print(f"  Auditor requests: customer data as-of 30 days ago")
print(f"  Snapshot at that time: #{audit_snap['snapshot_id']}")
print(f"  SQL: SELECT * FROM customer_events FOR SYSTEM_TIME AS OF "
      f"TIMESTAMP '30_days_ago'")
print(f"  Result: {audit_snap['total_rows']:,} rows visible")
print(f"  Time to reconstruct: ~1s (snapshot lookup + parallel scan)")

# ML reproducibility — re-run training against feature table as-of cutoff
print(f"\\n=== ML reproducibility — re-train as-of training cutoff ===")
training_cutoff_day = 700  # 300 days ago
training_snap = snapshots[training_cutoff_day - 1]
print(f"  Training cutoff: snapshot #{training_snap['snapshot_id']} "
      f"(day {training_snap['committed_at_day']})")
print(f"  Features at cutoff: {training_snap['total_rows']:,} rows")
print(f"  Re-run training -> model artifact identical to original")
print(f"  Without time travel: training would read CURRENT data,")
print(f"  producing a DIFFERENT model — silent reproducibility bug")

# Snapshot expiry — garbage-collect old snapshots
print(f"\\n=== Snapshot expiry — keep 365 days, GC older ===")
expired = [s for s in snapshots if s["committed_at_day"] < 365]
retained = [s for s in snapshots if s["committed_at_day"] >= 365]
print(f"  Snapshots before expiry: {len(snapshots)}")
print(f"  Expired (older than 365 days): {len(expired)}")
print(f"  Retained: {len(retained)}")
print(f"  Storage freed: ~{len(expired) * 5_000_000_000 / 1e12:.1f}TB")
print(f"\\nKey insight: time travel at scale requires manifest-tree")
print(f"pruning — Iceberg stores partition values in Avro manifests,")
print(f"so snapshot lookups don't open Parquet files. Tabular caches")
print(f"the manifest list per table, achieving sub-second VERSION AS OF")
print(f"even with 1000 snapshots. Audit compliance + ML reproducibility")
print(f"become first-class SQL queries, not bespoke snapshot jobs.")`,
    insight: "Time travel at scale requires manifest-tree pruning — Iceberg stores partition values in Avro manifests, so snapshot lookups don't open Parquet files. Tabular caches the manifest list per table (85%+ cache hit rate in production), achieving sub-second VERSION AS OF even with 1000 snapshots retained. This makes audit compliance (GDPR Article 15 right of access — reconstruct customer data as-of any past date) and ML reproducibility (re-train models against feature tables as-of the training cutoff, producing identical model artifacts) first-class SQL queries, not bespoke snapshot jobs. Without time travel, ML training silently reads current data instead of training-cutoff data — a subtle reproducibility bug that degrades model quality over time.",
  },
];

// ============================================================
// DATABRICKS LAKEHOUSE — 3 dataset examples (production deep dive)
// ============================================================

export const DATABRICKS_LAKEHOUSE_EXAMPLES: DatasetExample[] = [
  {
    id: "databricks-uber-ml-platform",
    step: "1",
    title: "Uber ML platform (1B events/day)",
    subtitle: "Synthetic — Delta + MLflow + feature stores",
    accent: "oklch(0.62 0.18 25)",
    icon: <Briefcase className="h-4 w-4" />,
    badge: "Synthetic Uber-scale ML",
    brief: {
      dataset: "Synthetic: 1 billion rider/driver events per day on Databricks Lakehouse. Delta Lake stores raw + processed events; MLflow tracks 50,000+ model training runs/year; Unity Catalog governs feature access; Photon vectorised engine accelerates SQL transforms.",
      scale: "~1B events/day · ~50K ML training runs/year · ~5K features per model · ~30 deployed models in production · sub-100ms feature serving",
      why: "Uber's Michelangelo ML platform migrated to Databricks Lakehouse (2020+) for unified batch + streaming + ML on one platform. Delta's ACID + time travel makes features reproducible; MLflow tracks every run with code + data + params + metrics; Unity enforces column-level RBAC on PII features; Photon vectorises the SQL transforms for 5-10× speedup vs Spark classic.",
    },
    stats: [
      { label: "Events/day", value: "1B" },
      { label: "ML runs/year", value: "~50K" },
      { label: "Features/model", value: "~5K" },
      { label: "Serving P99", value: "<100ms" },
    ],
    tools: ["Delta Lake (ACID + CDF + Z-Order)", "MLflow (tracking + registry + serving)", "Unity Catalog (column RBAC + lineage)", "Photon (vectorised SQL)", "Feature Store", "Databricks SQL (BI)"],
    codeTabs: [
      {
        lang: "scala",
        filename: "UberMlPlatform.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.delta.DeltaLog
import io.delta.tables._
import mlflow.spark.MlflowContext
import org.apache.spark.sql.functions._

// Databricks Lakehouse — Delta + MLflow + Unity + Photon end-to-end
val spark = SparkSession.builder()
  .appName("uber_michelangelo_v3")
  // Photon — Databricks' vectorised execution engine (5-10× faster than classic Spark)
  .config("spark.databricks.photon.enabled", "true")
  // Unity Catalog — column-level RBAC + lineage + audit
  .config("spark.databricks.workspace.catalog", "unity")
  .config("spark.sql.warehouse.dir", "s3://moderndatascieng-uber/warehouse")
  // Delta Lake — ACID + time travel + Change Data Feed
  .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
  .config("spark.sql.catalog.spark_catalog", classOf[org.apache.spark.sql.delta.catalog.DeltaCatalog].getName)
  .getOrCreate()

// 1. INGEST 1B events/day into Delta — ACID + time travel
spark.sql("""
  |CREATE TABLE uber.events_raw
  |USING DELTA
  |PARTITIONED BY (event_date)
  |TBLPROPERTIES (
  |  'delta.enableChangeDataFeed' = 'true',   -- CDF for incremental pipelines
  |  'delta.logRetentionDuration' = 'interval 365 days',
  |  'delta.deletedFileRetentionDuration' = 'interval 30 days'
  |)
  |AS SELECT * FROM kafka_streaming_events WHERE event_date = current_date()
""".stripMargin)

// 2. Z-Order by rider_id for sub-second point lookups on 1B rows
spark.sql("OPTIMIZE uber.events_raw ZORDER BY (rider_id, event_ts)")

// 3. FEATURE ENGINEERING — read from Delta, write features to Feature Store
val featuresDf = spark.sql("""
  |SELECT
  |  rider_id,
  |  sum(amount)         OVER (PARTITION BY rider_id ORDER BY event_ts
  |                          RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS spend_30d,
  |  count(*)            OVER (PARTITION BY rider_id ORDER BY event_ts
  |                          RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS trips_30d,
  |  avg(distance_km)    OVER (PARTITION BY rider_id ORDER BY event_ts
  |                          RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS avg_dist_30d,
  |  max(event_ts)       AS last_seen
  |FROM uber.events_raw
  |WHERE event_date >= current_date() - 30
""".stripMargin)

// 4. MLFLOW — track training run with code + params + metrics + model artifact
val mlflow = MlflowContext.getOrCreate()
val run = mlflow.startRun("rider_churn_v42")
  .logParam("n_estimators", 500)
  .logParam("max_depth", 12)
  .logParam("features", "spend_30d,trips_30d,avg_dist_30d")

// Train XGBoost on the feature DataFrame
val xgb = new XGBoostClassifier()
  .setFeaturesCol("features")
  .setLabelCol("churn_label")
  .setNumClass(2)
val model = xgb.fit(featuresDf)

// Log model + metrics to MLflow
val metrics = Map("auc" -> 0.87, "f1" -> 0.81, "precision" -> 0.79)
metrics.foreach { case (k, v) => run.logMetric(k, v) }
mlflow.registerModel("models:/rider_churn/Production", model, "rider_churn_v42")

// 5. DEPLOY — Unity-governed serving endpoint with sub-100ms P99
spark.sql("""
  |CREATE SERVING ENDPOINT rider_churn_v42
  |WITH (model = 'models:/rider_churn/Production',
  |      scale_to_zero = true,
  |      workload_type = 'CPU')
""".stripMargin)`,
      },
      {
        lang: "rust",
        filename: "uber_ml_platform.rs",
        code: `use delta_rust::DeltaTable;
use mlflow_rust::{MlflowClient, Run, Metric};
use spark_connect_rust::SparkSession;
use std::collections::HashMap;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Databricks Lakehouse — Photon + Unity + Delta + MLflow
    let spark = SparkSession::builder()
        .config("spark.databricks.photon.enabled", "true")
        .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
        .build().await?;

    // 1. INGEST 1B events/day into Delta
    spark.sql(r#"
        CREATE TABLE uber.events_raw USING DELTA
        PARTITIONED BY (event_date)
        TBLPROPERTIES ('delta.enableChangeDataFeed'='true')
        AS SELECT * FROM kafka_streaming_events WHERE event_date = current_date()
    "#).await?;

    // 2. Z-Order for sub-second point lookups on 1B rows
    spark.sql("OPTIMIZE uber.events_raw ZORDER BY (rider_id, event_ts)").await?;

    // 3. FEATURE ENGINEERING — Photon vectorised SQL
    let features_df = spark.sql(r#"
        SELECT rider_id,
            sum(amount)    OVER (PARTITION BY rider_id ORDER BY event_ts
                RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS spend_30d,
            count(*)       OVER (PARTITION BY rider_id ORDER BY event_ts
                RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS trips_30d,
            avg(distance_km) OVER (PARTITION BY rider_id ORDER BY event_ts
                RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS avg_dist_30d
        FROM uber.events_raw
        WHERE event_date >= current_date() - 30
    "#).await?;

    // 4. MLFLOW — track training run
    let mlflow = MlflowClient::new("https://mlflow.moderndatascieng.com");
    let mut run = mlflow.start_run("rider_churn_v42").await?;
    run.log_param("n_estimators", "500").await?;
    run.log_param("max_depth", "12").await?;
    run.log_param("features", "spend_30d,trips_30d,avg_dist_30d").await?;

    // Train XGBoost + log model + metrics
    let model = xgboost_rust::train_classifier(&features_df).await?;
    let metrics = HashMap::from([
        ("auc", 0.87), ("f1", 0.81), ("precision", 0.79),
    ]);
    for (k, v) in &metrics {
        run.log_metric(k, *v).await?;
    }
    mlflow.register_model("models:/rider_churn/Production", &model).await?;

    // 5. DEPLOY — Unity-governed serving endpoint
    spark.sql(r#"
        CREATE SERVING ENDPOINT rider_churn_v42
        WITH (model='models:/rider_churn/Production',
              scale_to_zero=true, workload_type='CPU')
    "#).await?;

    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "uber_ml_platform.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"

    delta "github.com/delta-io/delta-go"
    mlflow "github.com/mlflow/mlflow-go"
    spark "github.com/apache/spark-connect-go"
)

func main() {
    ctx := context.Background()

    sparkSession, _ := spark.NewSession(ctx, spark.Config{
        AppName: "uber_michelangelo_v3",
        Extra: map[string]string{
            "spark.databricks.photon.enabled":  "true",
            "spark.sql.extensions":            "io.delta.sql.DeltaSparkSessionExtension",
        },
    })

    // 1. INGEST 1B events/day into Delta
    _, err := sparkSession.SQL(ctx, \`
        CREATE TABLE uber.events_raw USING DELTA
        PARTITIONED BY (event_date)
        TBLPROPERTIES ('delta.enableChangeDataFeed'='true')
        AS SELECT * FROM kafka_streaming_events WHERE event_date = current_date()
    \`)
    if err != nil { log.Fatalf("ingest: %v", err) }

    // 2. Z-Order for sub-second point lookups on 1B rows
    _, _ = sparkSession.SQL(ctx,
        "OPTIMIZE uber.events_raw ZORDER BY (rider_id, event_ts)")

    // 3. FEATURE ENGINEERING — Photon vectorised SQL
    features, _ := sparkSession.SQL(ctx, \`
        SELECT rider_id,
            sum(amount) OVER (PARTITION BY rider_id ORDER BY event_ts
                RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS spend_30d,
            count(*)    OVER (PARTITION BY rider_id ORDER BY event_ts
                RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS trips_30d
        FROM uber.events_raw
        WHERE event_date >= current_date() - 30
    \`)

    // 4. MLFLOW — track training run with code + params + metrics
    mlflowClient, _ := mlflow.New("https://mlflow.moderndatascieng.com")
    run, _ := mlflowClient.StartRun(ctx, "rider_churn_v42")
    mlflowClient.LogParam(ctx, run.ID, "n_estimators", "500")
    mlflowClient.LogParam(ctx, run.ID, "max_depth", "12")

    // Train XGBoost + log model
    model, _ := xgboost_train(ctx, features)
    mlflowClient.LogMetric(ctx, run.ID, "auc", 0.87)
    mlflowClient.LogMetric(ctx, run.ID, "f1", 0.81)
    mlflowClient.RegisterModel(ctx, "models:/rider_churn/Production", model)

    // 5. DEPLOY — Unity-governed serving endpoint
    _, _ = sparkSession.SQL(ctx, \`
        CREATE SERVING ENDPOINT rider_churn_v42
        WITH (model='models:/rider_churn/Production',
              scale_to_zero=true, workload_type='CPU')
    \`)
    fmt.Println("Serving P99 latency: <100ms (auto-scaling)")
}`,
      },
      {
        lang: "elixir",
        filename: "uber_ml_platform.ex",
        code: `defmodule DatabricksLakehouse.UberMlPlatform do
  @moduledoc "Uber Michelangelo v3 — Delta + MLflow + Unity + Photon"
  @mlflow_url "https://mlflow.moderndatascieng.com"

  def run_training do
    # Databricks Lakehouse — Photon vectorised + Unity-governed
    spark = Spark.new()
      |> Spark.config("spark.databricks.photon.enabled", "true")
      |> Spark.config("spark.sql.extensions",
                       "io.delta.sql.DeltaSparkSessionExtension")

    # 1. INGEST 1B events/day into Delta — ACID + CDF
    Spark.sql(spark, """
      CREATE TABLE uber.events_raw USING DELTA
      PARTITIONED BY (event_date)
      TBLPROPERTIES ('delta.enableChangeDataFeed'='true')
      AS SELECT * FROM kafka_streaming_events WHERE event_date = current_date()
    """)

    # 2. Z-Order for sub-second point lookups
    Spark.sql(spark, "OPTIMIZE uber.events_raw ZORDER BY (rider_id, event_ts)")

    # 3. FEATURE ENGINEERING — Photon vectorised window SQL
    Spark.sql(spark, """
      SELECT rider_id,
        sum(amount) OVER (PARTITION BY rider_id ORDER BY event_ts
          RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS spend_30d,
        count(*)    OVER (PARTITION BY rider_id ORDER BY event_ts
          RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS trips_30d
      FROM uber.events_raw
      WHERE event_date >= current_date() - 30
    """)

    # 4. MLFLOW — track training run with code + params + metrics
    run = MLflow.start_run(@mlflow_url, "rider_churn_v42")
    MLflow.log_param(@mlflow_url, run, "n_estimators", "500")
    MLflow.log_param(@mlflow_url, run, "max_depth", "12")
    MLflow.log_metric(@mlflow_url, run, "auc", 0.87)
    MLflow.log_metric(@mlflow_url, run, "f1", 0.81)
    MLflow.register_model(@mlflow_url, "models:/rider_churn/Production",
                          "rider_churn_v42")

    # 5. DEPLOY — Unity-governed serving endpoint
    Spark.sql(spark, """
      CREATE SERVING ENDPOINT rider_churn_v42
      WITH (model='models:/rider_churn/Production',
            scale_to_zero=true, workload_type='CPU')
    """)

    :ok
  end
end`,
      },
      {
        lang: "zig",
        filename: "uber_ml_platform.zig",
        code: `const std = @import("std");
const spark = @import("spark-connect-zig");
const mlflow = @import("mlflow-zig");
const delta = @import("delta-zig");

pub fn run_training(alloc: std.mem.Allocator) !void {
    var session = try spark.Session.builder(alloc)
        .appName("uber_michelangelo_v3")
        .config("spark.databricks.photon.enabled", "true")
        .config("spark.sql.extensions",
                "io.delta.sql.DeltaSparkSessionExtension")
        .build();
    defer session.deinit();

    // 1. INGEST 1B events/day into Delta
    try session.sql(
        \\CREATE TABLE uber.events_raw USING DELTA
        \\PARTITIONED BY (event_date)
        \\TBLPROPERTIES ('delta.enableChangeDataFeed'='true')
        \\AS SELECT * FROM kafka_streaming_events
        \\WHERE event_date = current_date()
    );

    // 2. Z-Order for sub-second point lookups on 1B rows
    try session.sql("OPTIMIZE uber.events_raw ZORDER BY (rider_id, event_ts)");

    // 3. FEATURE ENGINEERING — Photon vectorised window SQL
    try session.sql(
        \\SELECT rider_id,
        \\  sum(amount) OVER (PARTITION BY rider_id ORDER BY event_ts
        \\    RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS spend_30d,
        \\  count(*)    OVER (PARTITION BY rider_id ORDER BY event_ts
        \\    RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS trips_30d
        \\FROM uber.events_raw
        \\WHERE event_date >= current_date() - 30
    );

    // 4. MLFLOW — track training run
    var client = try mlflow.Client.init(alloc,
        "https://mlflow.moderndatascieng.com");
    defer client.deinit();
    var run = try client.start_run("rider_churn_v42");
    defer run.deinit();
    try run.log_param("n_estimators", "500");
    try run.log_param("max_depth", "12");
    try run.log_metric("auc", 0.87);
    try run.log_metric("f1", 0.81);
    try client.register_model("models:/rider_churn/Production", "rider_churn_v42");

    // 5. DEPLOY — Unity-governed serving endpoint
    try session.sql(
        \\CREATE SERVING ENDPOINT rider_churn_v42
        \\WITH (model='models:/rider_churn/Production',
        \\      scale_to_zero=true, workload_type='CPU')
    );
}`,
      },
    ],
    runnablePython: `# Uber ML platform simulation — Delta + MLflow + Unity + Photon
import random
from collections import defaultdict

random.seed(42)
print("=== Databricks Lakehouse — Uber Michelangelo v3 ===")
print("Scale: 1B events/day · 50K ML runs/year · 5K features/model\\n")

# 1. INGEST 1B events/day into Delta — ACID + CDF
n_events = 1_000_000_000
avg_event_bytes = 64
daily_ingest_gb = n_events * avg_event_bytes / 1e9
print(f"1. Delta ingest: {n_events:,} events/day = {daily_ingest_gb:.0f}GB/day")
print(f"   With ZSTD compression (4:1): {daily_ingest_gb/4:.0f}GB on disk")
print(f"   With CDF enabled: incremental reads at +5% storage overhead")

# 2. Z-Order optimization — sub-second point lookups
print(f"\\n2. Z-Order by rider_id, event_ts — point lookup latency:")
lookup_latencies = []
for _ in range(100):
    # Photon vectorised execution + Z-Order co-locates same rider_id files
    n_files_scanned = random.randint(1, 5)  # Z-Order prunes to 1-5 files
    latency_ms = 50 + n_files_scanned * 20
    lookup_latencies.append(latency_ms)
lookup_latencies.sort()
print(f"   P50: {lookup_latencies[50]}ms  "
      f"P95: {lookup_latencies[95]}ms  "
      f"P99: {lookup_latencies[99]}ms")
print(f"   Without Z-Order: would scan ~1000 files, ~20s per lookup")

# 3. FEATURE ENGINEERING — Photon vectorised SQL
print(f"\\n3. Feature engineering — Photon vs classic Spark:")
n_rows = n_events
features = ["spend_30d", "trips_30d", "avg_dist_30d", "last_seen",
            "recency_days", "n_cancelled_30d"]
photon_time_sec = n_rows / 5_000_000  # ~5M rows/sec with Photon
classic_time_sec = n_rows / 800_000   # ~800K rows/sec with classic Spark
print(f"   Rows: {n_rows:,}")
print(f"   Features: {len(features)}")
print(f"   Photon:    {photon_time_sec:.0f}s ({photon_time_sec/60:.1f}min)")
print(f"   Classic:   {classic_time_sec:.0f}s ({classic_time_sec/60:.1f}min)")
print(f"   Speedup:   {classic_time_sec/photon_time_sec:.1f}x")

# 4. MLFLOW — track 50K training runs/year
print(f"\\n4. MLflow tracking — 50,000 runs/year:")
metrics_per_run = ["auc", "f1", "precision", "recall", "val_loss"]
params_per_run = ["n_estimators", "max_depth", "learning_rate", "subsample"]
print(f"   Metrics/run: {len(metrics_per_run)}")
print(f"   Params/run:  {len(params_per_run)}")
print(f"   Artifacts:   model.pkl (~500MB) + feature lineage graph")
print(f"   Storage:     ~{50000 * 0.5:.0f}GB/year model artifacts + ~5GB metadata")

# 5. DEPLOY — Unity-governed serving endpoint
print(f"\\n5. Serving — Unity-governed endpoint:")
serving_latencies = [random.uniform(20, 90) for _ in range(100)]
serving_latencies.sort()
print(f"   P50: {serving_latencies[50]:.0f}ms  "
      f"P95: {serving_latencies[95]:.0f}ms  "
      f"P99: {serving_latencies[99]:.0f}ms")
print(f"   Scale-to-zero: cold start ~5s, warm ~50ms")
print(f"   Unity RBAC: feature access checked at serving time")

# Comparison — Databricks Lakehouse vs alternative stacks
print(f"\\n=== Comparison: Databricks vs bespoke stack ===")
print(f"  Databricks Lakehouse: 1 platform (Delta + MLflow + Unity + Photon)")
print(f"    - 0 integration code (all native)")
print(f"    - 1 vendor (single bill, single support)")
print(f"    - Photon 5-10x speedup over classic Spark")
print(f"  Bespoke stack: EMR + S3 + Iceberg + Kubeflow + MLflow OSS + Ranger")
print(f"    - ~5K LOC integration code")
print(f"    - 5 vendors (separate bills, finger-pointing on incidents)")
print(f"    - 1-2x speedup from tuning, no Photon")
print(f"\\nKey insight: Databricks Lakehouse wins on integration cost.")
print(f"The 5-10x Photon speedup pays for the platform license at Uber's")
print(f"scale (~1B events/day). MLflow is the only piece customers can")
print(f"use OSS — but Databricks' managed MLflow adds Unity RBAC + audit")
print(f"which is structurally hard to replicate on OSS.")`,
    insight: "Databricks Lakehouse wins on integration cost — Delta + MLflow + Unity + Photon + Databricks SQL are all native, zero integration code. Photon vectorises Spark SQL 5-10× faster than classic Spark on the same hardware (Uber's 1B events/day = ~3min Photon vs ~30min classic for a daily feature pipeline). MLflow tracks every run with code + params + metrics + model artifacts (50K runs/year, ~25TB model artifacts). Unity enforces column-level RBAC on PII features at serving time. The only piece customers can use OSS is MLflow itself — but Databricks' managed MLflow adds Unity RBAC + audit which is structurally hard to replicate on OSS.",
  },
  {
    id: "databricks-airbnb-analytics",
    step: "2",
    title: "Airbnb analytics (5TB on Databricks SQL + Looker)",
    subtitle: "Synthetic — Delta + Databricks SQL + Looker",
    accent: "oklch(0.62 0.16 145)",
    icon: <Database className="h-4 w-4" />,
    badge: "Synthetic 5TB Airbnb-scale",
    brief: {
      dataset: "Synthetic: 5TB of Airbnb bookings, listings, and host analytics on Databricks Lakehouse. Delta Lake stores raw + conformed data; Databricks SQL (serverless) runs ad-hoc + scheduled BI queries; Looker connects via JDBC for dashboards.",
      scale: "~5TB · ~10K listings · ~100M bookings · ~500 Looker dashboards · sub-10s P95 BI query latency",
      why: "Airbnb migrated from Redshift + S3 + bespoke ETL to Databricks Lakehouse (2019-2021) to unify data engineering + analytics on one platform. Delta ACID replaces 'S3 + Redshift copy' pattern; Databricks SQL replaces Redshift for ad-hoc + BI workloads; Looker connects directly to Databricks SQL via JDBC, no Redshift middleman. Photon accelerates BI queries 5-10×.",
    },
    stats: [
      { label: "Total size", value: "5TB" },
      { label: "Listings", value: "~10K" },
      { label: "Bookings", value: "~100M" },
      { label: "Looker dashboards", value: "~500" },
    ],
    tools: ["Delta Lake", "Databricks SQL (serverless)", "Photon", "Unity Catalog", "Looker (JDBC)", "dbt on Databricks"],
    codeTabs: [
      {
        lang: "scala",
        filename: "AirbnbAnalytics.scala",
        code: `import org.apache.spark.sql.SparkSession
import io.delta.tables._

// Databricks Lakehouse — Airbnb analytics platform
val spark = SparkSession.builder()
  .appName("airbnb_analytics")
  .config("spark.databricks.photon.enabled", "true")
  .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
  .config("spark.sql.catalog.spark_catalog",
          classOf[org.apache.spark.sql.delta.catalog.DeltaCatalog].getName)
  .getOrCreate()

// 1. INGEST 5TB of bookings into Delta — Liquid Clustering auto-tunes
spark.sql("""
  |CREATE TABLE airbnb.bookings
  |USING DELTA
  |CLUSTER BY (listing_id, booking_date)  -- Liquid Clustering (replaces Z-Order)
  |TBLPROPERTIES (
  |  'delta.enableChangeDataFeed' = 'true',
  |  'delta.dataSkippingNumIndexedCols' = '20'
  |)
  |AS SELECT * FROM raw_bookings
""".stripMargin)

// 2. CONFORMED — dbt models transform raw -> silver -> gold
spark.sql("""
  |CREATE TABLE airbnb.silver_bookings
  |USING DELTA
  |CLUSTER BY (host_id, booking_date)
  |AS SELECT
  |  booking_id, listing_id, host_id, guest_id,
  |  booking_date, check_in_date, check_out_date,
  |  nightly_price, cleaning_fee, total_amount,
  |  guest_count, room_type, city, country,
  |  ingested_at
  |FROM airbnb.bookings WHERE booking_date >= '2020-01-01'
""".stripMargin)

// 3. GOLD MARTS — BI-ready aggregations for Looker
spark.sql("""
  |CREATE TABLE airbnb.gold_host_revenue_daily
  |USING DELTA
  |AS SELECT
  |  host_id, booking_date, city, country,
  |  count(*)                              AS n_bookings,
  |  sum(total_amount)                     AS total_revenue,
  |  avg(nightly_price)                    AS avg_nightly_price,
  |  sum(guest_count)                      AS total_guests,
  |  datediff(check_out_date, check_in_date) AS n_nights
  |FROM airbnb.silver_bookings
  |GROUP BY host_id, booking_date, city, country,
  |         check_out_date, check_in_date
""".stripMargin)

// 4. LIQUID CLUSTERING — auto-rebalances on writes, no OPTIMIZE needed
// Replaces Z-Order + partitioning — self-tuning
spark.sql("ALTER TABLE airbnb.gold_host_revenue_daily CLUSTER BY (host_id)")

// 5. DATABRICKS SQL — serverless BI compute (separate from Spark ETL)
// Looker connects via JDBC to Databricks SQL endpoint
// Sub-10s P95 BI query latency on 5TB
spark.sql("""
  |SELECT host_id, city,
  |       sum(total_revenue) AS revenue_30d,
  |       count(*)           AS n_bookings_30d
  |FROM airbnb.gold_host_revenue_daily
  |WHERE booking_date >= current_date() - 30
  |GROUP BY host_id, city
  |ORDER BY revenue_30d DESC LIMIT 100
""".stripMargin).show(20)

// 6. TIME TRAVEL — Delta VERSION AS OF for audit
spark.sql("""
  |SELECT count(*) FROM airbnb.bookings
  |VERSION AS OF '2024-09-01'
""".stripMargin)  // bookings as-of September (pre-Q4 promotion launch)`,
      },
      {
        lang: "rust",
        filename: "airbnb_analytics.rs",
        code: `use delta_rust::DeltaTable;
use spark_connect_rust::SparkSession;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let spark = SparkSession::builder()
        .config("spark.databricks.photon.enabled", "true")
        .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
        .build().await?;

    // 1. INGEST 5TB of bookings into Delta — Liquid Clustering auto-tunes
    spark.sql(r#"
        CREATE TABLE airbnb.bookings USING DELTA
        CLUSTER BY (listing_id, booking_date)
        TBLPROPERTIES ('delta.enableChangeDataFeed'='true',
                        'delta.dataSkippingNumIndexedCols'='20')
        AS SELECT * FROM raw_bookings
    "#).await?;

    // 2. CONFORMED — dbt-style transforms raw -> silver
    spark.sql(r#"
        CREATE TABLE airbnb.silver_bookings USING DELTA
        CLUSTER BY (host_id, booking_date)
        AS SELECT booking_id, listing_id, host_id, guest_id,
                  booking_date, check_in_date, check_out_date,
                  nightly_price, cleaning_fee, total_amount,
                  guest_count, room_type, city, country, ingested_at
        FROM airbnb.bookings WHERE booking_date >= '2020-01-01'
    "#).await?;

    // 3. GOLD MARTS — BI-ready aggregations for Looker
    spark.sql(r#"
        CREATE TABLE airbnb.gold_host_revenue_daily USING DELTA
        AS SELECT host_id, booking_date, city, country,
                  count(*) AS n_bookings,
                  sum(total_amount) AS total_revenue,
                  avg(nightly_price) AS avg_nightly_price,
                  sum(guest_count) AS total_guests
        FROM airbnb.silver_bookings
        GROUP BY host_id, booking_date, city, country
    "#).await?;

    // 4. LIQUID CLUSTERING — auto-rebalances on writes, no OPTIMIZE needed
    spark.sql("ALTER TABLE airbnb.gold_host_revenue_daily CLUSTER BY (host_id)").await?;

    // 5. DATABRICKS SQL — serverless BI compute via JDBC for Looker
    let bi_query = spark.sql(r#"
        SELECT host_id, city,
               sum(total_revenue) AS revenue_30d,
               count(*)           AS n_bookings_30d
        FROM airbnb.gold_host_revenue_daily
        WHERE booking_date >= current_date() - 30
        GROUP BY host_id, city
        ORDER BY revenue_30d DESC LIMIT 100
    "#).await?;
    bi_query.show(20).await?;

    // 6. TIME TRAVEL — Delta VERSION AS OF for audit
    spark.sql("SELECT count(*) FROM airbnb.bookings VERSION AS OF '2024-09-01'").await?;
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "airbnb_analytics.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"

    spark "github.com/apache/spark-connect-go"
)

func main() {
    ctx := context.Background()
    sparkSession, _ := spark.NewSession(ctx, spark.Config{
        AppName: "airbnb_analytics",
        Extra: map[string]string{
            "spark.databricks.photon.enabled": "true",
            "spark.sql.extensions":          "io.delta.sql.DeltaSparkSessionExtension",
        },
    })

    // 1. INGEST 5TB of bookings — Liquid Clustering auto-tunes
    _, err := sparkSession.SQL(ctx, \`
        CREATE TABLE airbnb.bookings USING DELTA
        CLUSTER BY (listing_id, booking_date)
        TBLPROPERTIES ('delta.enableChangeDataFeed'='true',
                        'delta.dataSkippingNumIndexedCols'='20')
        AS SELECT * FROM raw_bookings
    \`)
    if err != nil { log.Fatalf("ingest: %v", err) }

    // 2. CONFORMED — raw -> silver
    _, err = sparkSession.SQL(ctx, \`
        CREATE TABLE airbnb.silver_bookings USING DELTA
        CLUSTER BY (host_id, booking_date)
        AS SELECT booking_id, listing_id, host_id, guest_id,
                  booking_date, check_in_date, check_out_date,
                  nightly_price, cleaning_fee, total_amount,
                  guest_count, room_type, city, country, ingested_at
        FROM airbnb.bookings WHERE booking_date >= '2020-01-01'
    \`)
    if err != nil { log.Fatalf("silver: %v", err) }

    // 3. GOLD MARTS — BI-ready aggregations for Looker
    _, _ = sparkSession.SQL(ctx, \`
        CREATE TABLE airbnb.gold_host_revenue_daily USING DELTA
        AS SELECT host_id, booking_date, city, country,
                  count(*) AS n_bookings,
                  sum(total_amount) AS total_revenue,
                  avg(nightly_price) AS avg_nightly_price,
                  sum(guest_count) AS total_guests
        FROM airbnb.silver_bookings
        GROUP BY host_id, booking_date, city, country
    \`)

    // 4. LIQUID CLUSTERING — auto-rebalances on writes
    _, _ = sparkSession.SQL(ctx,
        "ALTER TABLE airbnb.gold_host_revenue_daily CLUSTER BY (host_id)")

    // 5. Databricks SQL — serverless BI compute via JDBC for Looker
    rows, _ := sparkSession.SQL(ctx, \`
        SELECT host_id, city, sum(total_revenue) AS revenue_30d, count(*) AS n_bookings_30d
        FROM airbnb.gold_host_revenue_daily
        WHERE booking_date >= current_date() - 30
        GROUP BY host_id, city
        ORDER BY revenue_30d DESC LIMIT 100
    \`)
    fmt.Printf("BI query returned %d rows in <10s (P95)\\n", rows.RowCount)

    // 6. TIME TRAVEL — Delta VERSION AS OF for audit
    _, _ = sparkSession.SQL(ctx,
        "SELECT count(*) FROM airbnb.bookings VERSION AS OF '2024-09-01'")
}`,
      },
      {
        lang: "elixir",
        filename: "airbnb_analytics.ex",
        code: `defmodule DatabricksLakehouse.AirbnbAnalytics do
  @moduledoc "Airbnb analytics — Delta + Databricks SQL + Looker"

  def run do
    spark = Spark.new()
      |> Spark.config("spark.databricks.photon.enabled", "true")
      |> Spark.config("spark.sql.extensions",
                       "io.delta.sql.DeltaSparkSessionExtension")

    # 1. INGEST 5TB of bookings — Liquid Clustering auto-tunes
    Spark.sql(spark, """
      CREATE TABLE airbnb.bookings USING DELTA
      CLUSTER BY (listing_id, booking_date)
      TBLPROPERTIES ('delta.enableChangeDataFeed'='true',
                      'delta.dataSkippingNumIndexedCols'='20')
      AS SELECT * FROM raw_bookings
    """)

    # 2. CONFORMED — raw -> silver
    Spark.sql(spark, """
      CREATE TABLE airbnb.silver_bookings USING DELTA
      CLUSTER BY (host_id, booking_date)
      AS SELECT booking_id, listing_id, host_id, guest_id,
                booking_date, check_in_date, check_out_date,
                nightly_price, cleaning_fee, total_amount,
                guest_count, room_type, city, country, ingested_at
        FROM airbnb.bookings WHERE booking_date >= '2020-01-01'
    """)

    # 3. GOLD MARTS — BI-ready aggregations for Looker
    Spark.sql(spark, """
      CREATE TABLE airbnb.gold_host_revenue_daily USING DELTA
      AS SELECT host_id, booking_date, city, country,
                count(*) AS n_bookings,
                sum(total_amount) AS total_revenue,
                avg(nightly_price) AS avg_nightly_price,
                sum(guest_count) AS total_guests
      FROM airbnb.silver_bookings
      GROUP BY host_id, booking_date, city, country
    """)

    # 4. LIQUID CLUSTERING — auto-rebalances on writes
    Spark.sql(spark,
      "ALTER TABLE airbnb.gold_host_revenue_daily CLUSTER BY (host_id)")

    # 5. Databricks SQL — serverless BI compute via JDBC for Looker
    Spark.sql(spark, """
      SELECT host_id, city, sum(total_revenue) AS revenue_30d,
             count(*) AS n_bookings_30d
      FROM airbnb.gold_host_revenue_daily
      WHERE booking_date >= current_date() - 30
      GROUP BY host_id, city
      ORDER BY revenue_30d DESC LIMIT 100
    """)

    # 6. TIME TRAVEL — Delta VERSION AS OF for audit
    Spark.sql(spark,
      "SELECT count(*) FROM airbnb.bookings VERSION AS OF '2024-09-01'")

    :ok
  end
end`,
      },
      {
        lang: "zig",
        filename: "airbnb_analytics.zig",
        code: `const std = @import("std");
const spark = @import("spark-connect-zig");

pub fn run(alloc: std.mem.Allocator) !void {
    var session = try spark.Session.builder(alloc)
        .appName("airbnb_analytics")
        .config("spark.databricks.photon.enabled", "true")
        .config("spark.sql.extensions",
                "io.delta.sql.DeltaSparkSessionExtension")
        .build();
    defer session.deinit();

    // 1. INGEST 5TB of bookings — Liquid Clustering auto-tunes
    try session.sql(
        \\CREATE TABLE airbnb.bookings USING DELTA
        \\CLUSTER BY (listing_id, booking_date)
        \\TBLPROPERTIES ('delta.enableChangeDataFeed'='true',
        \\                'delta.dataSkippingNumIndexedCols'='20')
        \\AS SELECT * FROM raw_bookings
    );

    // 2. CONFORMED — raw -> silver
    try session.sql(
        \\CREATE TABLE airbnb.silver_bookings USING DELTA
        \\CLUSTER BY (host_id, booking_date)
        \\AS SELECT booking_id, listing_id, host_id, guest_id,
        \\          booking_date, check_in_date, check_out_date,
        \\          nightly_price, cleaning_fee, total_amount,
        \\          guest_count, room_type, city, country, ingested_at
        \\FROM airbnb.bookings WHERE booking_date >= '2020-01-01'
    );

    // 3. GOLD MARTS — BI-ready aggregations for Looker
    try session.sql(
        \\CREATE TABLE airbnb.gold_host_revenue_daily USING DELTA
        \\AS SELECT host_id, booking_date, city, country,
        \\          count(*) AS n_bookings,
        \\          sum(total_amount) AS total_revenue,
        \\          avg(nightly_price) AS avg_nightly_price,
        \\          sum(guest_count) AS total_guests
        \\FROM airbnb.silver_bookings
        \\GROUP BY host_id, booking_date, city, country
    );

    // 4. LIQUID CLUSTERING — auto-rebalances on writes
    try session.sql(
        "ALTER TABLE airbnb.gold_host_revenue_daily CLUSTER BY (host_id)"
    );

    // 5. Databricks SQL — serverless BI compute via JDBC for Looker
    try session.sql(
        \\SELECT host_id, city, sum(total_revenue) AS revenue_30d,
        \\       count(*) AS n_bookings_30d
        \\FROM airbnb.gold_host_revenue_daily
        \\WHERE booking_date >= current_date() - 30
        \\GROUP BY host_id, city
        \\ORDER BY revenue_30d DESC LIMIT 100
    );

    // 6. TIME TRAVEL — Delta VERSION AS OF for audit
    try session.sql(
        "SELECT count(*) FROM airbnb.bookings VERSION AS OF '2024-09-01'"
    );
}`,
      },
    ],
    runnablePython: `# Airbnb analytics on Databricks Lakehouse simulation
import random
from collections import defaultdict

random.seed(42)
print("=== Airbnb analytics — Delta + Databricks SQL + Looker ===")
print("Scale: 5TB · 10K listings · 100M bookings · 500 Looker dashboards\\n")

# 1. INGEST — Delta ACID + Liquid Clustering
n_bookings = 100_000_000
total_tb = 5
print(f"1. Ingest {n_bookings:,} bookings = {total_tb}TB raw, ~1.25TB ZSTD-compressed")
print(f"   Liquid Clustering: auto-tunes on writes (no manual OPTIMIZE)")
print(f"   vs Z-Order: Liquid is self-tuning, Z-Order needs scheduled OPTIMIZE jobs")

# 2. CONFORMED — silver tables with CDF (Change Data Feed)
print(f"\\n2. Silver layer (conformed):")
print(f"   CDF enabled — incremental reads for downstream pipelines")
print(f"   Liquid Cluster by host_id, booking_date — point lookups in <1s")

# 3. GOLD MARTS — BI-ready aggregations
n_dashboards = 500
queries_per_dashboard = 5
total_bi_queries = n_dashboards * queries_per_dashboard * 30  # daily
print(f"\\n3. Gold layer (BI marts):")
print(f"   {n_dashboards} Looker dashboards × {queries_per_dashboard} queries × 30 days")
print(f"   Total BI queries: ~{total_bi_queries:,}/month")

# 4. Databricks SQL — Photon vectorised BI compute
print(f"\\n4. Databricks SQL query latency (Photon, serverless):")
bi_latencies = []
for _ in range(100):
    n_files_scanned = random.randint(3, 20)
    base = 500 + n_files_scanned * 300  # 500ms base + 300ms per file
    bi_latencies.append(base)
bi_latencies.sort()
p50 = bi_latencies[50]
p95 = bi_latencies[95]
p99 = bi_latencies[99]
print(f"   P50: {p50}ms  P95: {p95}ms  P99: {p99}ms")
print(f"   Sub-10s P95 on 5TB with Photon + Liquid Clustering")

# 5. Looker — direct JDBC to Databricks SQL endpoint
print(f"\\n5. Looker via JDBC to Databricks SQL:")
print(f"   No Redshift middleman (Airbnb migrated off Redshift 2019-2021)")
print(f"   Single source of truth: Delta tables read by Looker directly")
print(f"   Caching: Looker PDTs (persistent derived tables) on Delta")

# 6. Time travel — VERSION AS OF for audit
print(f"\\n6. Time travel — VERSION AS OF for audit:")
print(f"   SELECT count(*) FROM airbnb.bookings VERSION AS OF '2024-09-01'")
print(f"   Booking count as-of September (pre-Q4 promotion launch)")
print(f"   Delta log retained 365 days (configurable)")

# Comparison — Airbnb before/after Databricks migration
print(f"\\n=== Airbnb migration: before vs after (2019 -> 2021) ===")
print(f"  BEFORE (2019):                          AFTER (2021):")
print(f"  Redshift + S3 + bespoke ETL             Databricks Lakehouse")
print(f"  ~8h nightly Redshift COPY loads        Delta streaming ingest (minutes)")
print(f"  3 teams: data eng + BI + ML             1 platform team")
print(f"  ~$2M/year Redshift + EMR + S3          ~$1.5M/year Databricks")
print(f"  Redshift MPP limits (max ~128 nodes)   Databricks autoscaling (no limit)")
print(f"  BI on stale Redshift copy              BI on live Delta tables")
print(f"  ML in separate Kubeflow cluster        MLflow integrated")

# Photon speedup — vectorised execution
print(f"\\n=== Photon vectorised execution speedup ===")
workloads = [
    ("Daily bookings aggregation",  1500, 200),  # seconds: classic, photon
    ("Host revenue 30d window",      2200, 280),
    ("Listing search relevance ML", 3500, 500),
    ("Looker BI query P95",          18,   3),   # seconds
]
for workload, classic_s, photon_s in workloads:
    speedup = classic_s / photon_s
    print(f"  {workload:40s}: classic {classic_s:>5}s  photon {photon_s:>4}s  "
          f"speedup {speedup:.1f}x")
print(f"\\nKey insight: Databricks Lakehouse replaces 3 stacks (Redshift +")
print(f"S3 + Kubeflow) with 1 platform. Photon 5-10x speedup + Liquid")
print(f"Clustering self-tuning eliminate the manual OPTIMIZE + Redshift")
print(f"COPY jobs that occupied the data engineering team before migration.")`,
    insight: "Airbnb's migration from Redshift + S3 + bespoke ETL to Databricks Lakehouse (2019-2021) replaced 3 separate stacks (Redshift for BI, S3 for raw, Kubeflow for ML) with 1 platform. Photon vectorised execution gives 5-10× speedup over classic Spark on the same hardware — daily bookings aggregation goes from 25min to 3min, Looker BI queries from 18s to 3s P95. Liquid Clustering (Delta's 2024 feature) auto-tunes on writes, eliminating the manual OPTIMIZE + Z-Order scheduling that previously occupied data engineers. The single-bill + single-support model removed finger-pointing across Redshift/EMR/S3 vendors that previously slowed incident response.",
  },
  {
    id: "databricks-jpmorgan-risk",
    step: "3",
    title: "JPMorgan risk (100M trades, regulatory reporting)",
    subtitle: "Synthetic — Delta + Unity + regulatory reporting",
    accent: "oklch(0.62 0.18 0)",
    icon: <ShieldCheck className="h-4 w-4" />,
    badge: "Synthetic JPMorgan risk",
    brief: {
      dataset: "Synthetic: 100M trades/day on Databricks Lakehouse for JPMorgan's market risk + credit risk + counterparty risk analytics. Delta Lake stores trade events with CDF; Unity Catalog enforces column-level RBAC for PII + material non-public information (MNPI); regulatory reporting (CCAR, Basel III, FRTB) reads from governed Delta tables.",
      scale: "~100M trades/day · ~5K risk factors · ~10 regulatory reports/day · sub-15min end-of-day risk computation · audit trail 7 years",
      why: "Banks need ACID + audit + RBAC on the same platform where they compute risk. Databricks Lakehouse provides Delta (ACID + time travel for audit), Unity (column RBAC for MNPI separation), and Photon (sub-15min risk computation vs 4+ hours on prior Teradata + SAS stacks). Regulatory reports (CCAR, FRTB) read from immutable Delta snapshots — auditors can reconstruct any past day's risk numbers.",
    },
    stats: [
      { label: "Trades/day", value: "100M" },
      { label: "Risk factors", value: "~5K" },
      { label: "Reg reports/day", value: "~10" },
      { label: "Risk compute", value: "<15min" },
    ],
    tools: ["Delta Lake (ACID + CDF)", "Unity Catalog (MNPI RBAC)", "Photon (vectorised risk)", "MLflow (model governance)", "Lakehouse Federation (Teradata)", "OpenLineage (regulatory lineage)"],
    codeTabs: [
      {
        lang: "scala",
        filename: "JpmorganRisk.scala",
        code: `import org.apache.spark.sql.SparkSession
import io.delta.tables._
import org.apache.spark.sql.functions._

// JPMorgan risk analytics on Databricks Lakehouse
val spark = SparkSession.builder()
  .appName("jpmorgan_risk_v2")
  .config("spark.databricks.photon.enabled", "true")
  .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
  .config("spark.sql.catalog.spark_catalog",
          classOf[org.apache.spark.sql.delta.catalog.DeltaCatalog].getName)
  .getOrCreate()

// 1. INGEST 100M trades/day into Delta — ACID + CDF + 7-year retention
spark.sql("""
  |CREATE TABLE jpm.trades_fct
  |USING DELTA
  |PARTITIONED BY (trade_date)
  |CLUSTER BY (trade_id, counterparty_id)
  |TBLPROPERTIES (
  |  'delta.enableChangeDataFeed' = 'true',
  |  'delta.logRetentionDuration' = 'interval 2555 days',  -- 7 years (SEC Rule 17a-4)
  |  'delta.deletedFileRetentionDuration' = 'interval 2555 days'
  |)
  |AS SELECT * FROM kafka_trades WHERE trade_date = current_date()
""".stripMargin)

// 2. UNITY CATALOG — column-level RBAC for MNPI separation
spark.sql("""
  |ALTER TABLE jpm.trades_fct
  |SET TAGS ('sensitivity'='MNPI', 'regulation'='SEC-17a-4',
  |          'owner'='risk-ops', 'retain'='7y')
""".stripMargin)
spark.sql("""
  |GRANT SELECT (trade_id, trade_date, asset_class, notional_ccy)
  |ON TABLE jpm.trades_fct TO risk_team_public   -- non-MNPI columns only
""".stripMargin)
spark.sql("""
  |GRANT SELECT (trade_id, trade_date, asset_class, notional_ccy,
  |              counterparty_id, trader_id, strategy)
  |ON TABLE jpm.trades_fct TO risk_team_mnpi    -- MNPI columns gated
""".stripMargin)

// 3. VAR (Value at Risk) computation — Photon vectorised Monte Carlo
spark.sql("""
  |CREATE TABLE jpm.var_daily
  |USING DELTA
  |CLUSTER BY (trade_date, portfolio_id)
  |AS
  |WITH shocks AS (
  |  SELECT factor_id, scenario_id,
  |         factor_shock_1d, factor_shock_10d
  |  FROM jpm.risk_factors
  |  CROSS JOIN (SELECT explode(sequence(1, 10000)) AS scenario_id)
  |),
  |pnl AS (
  |  SELECT t.portfolio_id, t.trade_id, s.scenario_id,
  |         t.notional * s.factor_shock_1d AS pnl_1d
  |  FROM jpm.trades_fct t
  |  JOIN shocks s ON t.factor_id = s.factor_id
  |)
  |SELECT portfolio_id, trade_date,
  |       percentile(pnl_1d, 0.99) AS var_99_1d,    -- 99% VaR 1-day
  |       percentile(pnl_1d, 0.995) AS var_995_1d,
  |       avg(pnl_1d) AS expected_shortfall
  |FROM pnl
  |GROUP BY portfolio_id, trade_date
""".stripMargin)

// 4. REGULATORY REPORTING — CCAR, Basel III, FRTB
// Read from immutable Delta snapshot — auditors can reconstruct
spark.sql("""
  |SELECT 'CCAR_quarterly' AS report_type,
  |       portfolio_id,
  |       sum(var_99_1d) AS total_var,
  |       sum(expected_shortfall) AS total_es
  |FROM jpm.var_daily VERSION AS OF '2024-09-30'
  |GROUP BY portfolio_id
""".stripMargin)

// 5. AUDIT — Unity lineage tracks every read/write for SEC
spark.sql("""
  |SELECT event_time, principal, action, table_name, columns_accessed
  |FROM system.access.audit
  |WHERE table_name = 'jpm.trades_fct'
  |  AND event_date >= current_date() - 90
  |ORDER BY event_time DESC
  |LIMIT 1000
""".stripMargin)`,
      },
      {
        lang: "rust",
        filename: "jpmorgan_risk.rs",
        code: `use delta_rust::DeltaTable;
use spark_connect_rust::SparkSession;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let spark = SparkSession::builder()
        .config("spark.databricks.photon.enabled", "true")
        .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
        .build().await?;

    // 1. INGEST 100M trades/day into Delta — ACID + 7-year retention
    spark.sql(r#"
        CREATE TABLE jpm.trades_fct USING DELTA
        PARTITIONED BY (trade_date)
        CLUSTER BY (trade_id, counterparty_id)
        TBLPROPERTIES ('delta.enableChangeDataFeed'='true',
                        'delta.logRetentionDuration'='interval 2555 days')
        AS SELECT * FROM kafka_trades WHERE trade_date = current_date()
    "#).await?;

    // 2. UNITY CATALOG — column-level RBAC for MNPI separation
    spark.sql(r#"
        ALTER TABLE jpm.trades_fct
        SET TAGS ('sensitivity'='MNPI', 'regulation'='SEC-17a-4', 'retain'='7y')
    "#).await?;
    spark.sql(r#"
        GRANT SELECT (trade_id, trade_date, asset_class, notional_ccy)
        ON TABLE jpm.trades_fct TO risk_team_public
    "#).await?;
    spark.sql(r#"
        GRANT SELECT (trade_id, trade_date, asset_class, notional_ccy,
                      counterparty_id, trader_id, strategy)
        ON TABLE jpm.trades_fct TO risk_team_mnpi
    "#).await?;

    // 3. VAR computation — Photon vectorised Monte Carlo
    spark.sql(r#"
        CREATE TABLE jpm.var_daily USING DELTA
        CLUSTER BY (trade_date, portfolio_id) AS
        WITH shocks AS (
            SELECT factor_id, scenario_id, factor_shock_1d, factor_shock_10d
            FROM jpm.risk_factors
            CROSS JOIN (SELECT explode(sequence(1, 10000)) AS scenario_id)
        ),
        pnl AS (
            SELECT t.portfolio_id, t.trade_id, s.scenario_id,
                   t.notional * s.factor_shock_1d AS pnl_1d
            FROM jpm.trades_fct t
            JOIN shocks s ON t.factor_id = s.factor_id
        )
        SELECT portfolio_id, trade_date,
               percentile(pnl_1d, 0.99) AS var_99_1d,
               percentile(pnl_1d, 0.995) AS var_995_1d,
               avg(pnl_1d) AS expected_shortfall
        FROM pnl GROUP BY portfolio_id, trade_date
    "#).await?;

    // 4. REGULATORY REPORTING — read from immutable Delta snapshot
    spark.sql(r#"
        SELECT 'CCAR_quarterly' AS report_type, portfolio_id,
               sum(var_99_1d) AS total_var,
               sum(expected_shortfall) AS total_es
        FROM jpm.var_daily VERSION AS OF '2024-09-30'
        GROUP BY portfolio_id
    "#).await?;

    // 5. AUDIT — Unity lineage tracks every read/write for SEC
    spark.sql(r#"
        SELECT event_time, principal, action, table_name, columns_accessed
        FROM system.access.audit
        WHERE table_name = 'jpm.trades_fct'
          AND event_date >= current_date() - 90
        ORDER BY event_time DESC LIMIT 1000
    "#).await?;
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "jpmorgan_risk.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"

    spark "github.com/apache/spark-connect-go"
)

func main() {
    ctx := context.Background()
    sparkSession, _ := spark.NewSession(ctx, spark.Config{
        AppName: "jpmorgan_risk_v2",
        Extra: map[string]string{
            "spark.databricks.photon.enabled": "true",
            "spark.sql.extensions":            "io.delta.sql.DeltaSparkSessionExtension",
        },
    })

    // 1. INGEST 100M trades/day into Delta — ACID + 7-year retention
    _, err := sparkSession.SQL(ctx, \`
        CREATE TABLE jpm.trades_fct USING DELTA
        PARTITIONED BY (trade_date)
        CLUSTER BY (trade_id, counterparty_id)
        TBLPROPERTIES ('delta.enableChangeDataFeed'='true',
                        'delta.logRetentionDuration'='interval 2555 days')
        AS SELECT * FROM kafka_trades WHERE trade_date = current_date()
    \`)
    if err != nil { log.Fatalf("ingest: %v", err) }

    // 2. UNITY CATALOG — column-level RBAC for MNPI separation
    _, _ = sparkSession.SQL(ctx, \`
        ALTER TABLE jpm.trades_fct
        SET TAGS ('sensitivity'='MNPI', 'regulation'='SEC-17a-4', 'retain'='7y')
    \`)
    _, _ = sparkSession.SQL(ctx, \`
        GRANT SELECT (trade_id, trade_date, asset_class, notional_ccy)
        ON TABLE jpm.trades_fct TO risk_team_public
    \`)
    _, _ = sparkSession.SQL(ctx, \`
        GRANT SELECT (trade_id, trade_date, asset_class, notional_ccy,
                      counterparty_id, trader_id, strategy)
        ON TABLE jpm.trades_fct TO risk_team_mnpi
    \`)

    // 3. VAR computation — Photon vectorised Monte Carlo
    _, err = sparkSession.SQL(ctx, \`
        CREATE TABLE jpm.var_daily USING DELTA
        CLUSTER BY (trade_date, portfolio_id) AS
        WITH shocks AS (
            SELECT factor_id, scenario_id, factor_shock_1d
            FROM jpm.risk_factors
            CROSS JOIN (SELECT explode(sequence(1, 10000)) AS scenario_id)
        ),
        pnl AS (
            SELECT t.portfolio_id, t.trade_id, s.scenario_id,
                   t.notional * s.factor_shock_1d AS pnl_1d
            FROM jpm.trades_fct t
            JOIN shocks s ON t.factor_id = s.factor_id
        )
        SELECT portfolio_id, trade_date,
               percentile(pnl_1d, 0.99) AS var_99_1d,
               percentile(pnl_1d, 0.995) AS var_995_1d,
               avg(pnl_1d) AS expected_shortfall
        FROM pnl GROUP BY portfolio_id, trade_date
    \`)
    if err != nil { log.Fatalf("var: %v", err) }

    // 4. REGULATORY REPORTING — read from immutable Delta snapshot
    _, _ = sparkSession.SQL(ctx, \`
        SELECT 'CCAR_quarterly' AS report_type, portfolio_id,
               sum(var_99_1d) AS total_var
        FROM jpm.var_daily VERSION AS OF '2024-09-30'
        GROUP BY portfolio_id
    \`)

    // 5. AUDIT — Unity lineage tracks every read/write for SEC
    rows, _ := sparkSession.SQL(ctx, \`
        SELECT event_time, principal, action, table_name
        FROM system.access.audit
        WHERE table_name = 'jpm.trades_fct'
        ORDER BY event_time DESC LIMIT 1000
    \`)
    fmt.Printf("Audit log: %d events for SEC subpoena\\n", rows.RowCount)
}`,
      },
      {
        lang: "elixir",
        filename: "jpmorgan_risk.ex",
        code: `defmodule DatabricksLakehouse.JpmorganRisk do
  @moduledoc "JPMorgan risk analytics — Delta + Unity MNPI RBAC + regulatory reporting"

  def run do
    spark = Spark.new()
      |> Spark.config("spark.databricks.photon.enabled", "true")
      |> Spark.config("spark.sql.extensions",
                       "io.delta.sql.DeltaSparkSessionExtension")

    # 1. INGEST 100M trades/day — ACID + 7-year retention
    Spark.sql(spark, """
      CREATE TABLE jpm.trades_fct USING DELTA
      PARTITIONED BY (trade_date)
      CLUSTER BY (trade_id, counterparty_id)
      TBLPROPERTIES ('delta.enableChangeDataFeed'='true',
                      'delta.logRetentionDuration'='interval 2555 days')
      AS SELECT * FROM kafka_trades WHERE trade_date = current_date()
    """)

    # 2. UNITY CATALOG — column-level RBAC for MNPI separation
    Spark.sql(spark, """
      ALTER TABLE jpm.trades_fct
      SET TAGS ('sensitivity'='MNPI', 'regulation'='SEC-17a-4', 'retain'='7y')
    """)
    Spark.sql(spark, """
      GRANT SELECT (trade_id, trade_date, asset_class, notional_ccy)
      ON TABLE jpm.trades_fct TO risk_team_public
    """)
    Spark.sql(spark, """
      GRANT SELECT (trade_id, trade_date, asset_class, notional_ccy,
                    counterparty_id, trader_id, strategy)
      ON TABLE jpm.trades_fct TO risk_team_mnpi
    """)

    # 3. VAR computation — Photon vectorised Monte Carlo
    Spark.sql(spark, """
      CREATE TABLE jpm.var_daily USING DELTA
      CLUSTER BY (trade_date, portfolio_id) AS
      WITH shocks AS (
        SELECT factor_id, scenario_id, factor_shock_1d
        FROM jpm.risk_factors
        CROSS JOIN (SELECT explode(sequence(1, 10000)) AS scenario_id)
      ),
      pnl AS (
        SELECT t.portfolio_id, t.trade_id, s.scenario_id,
               t.notional * s.factor_shock_1d AS pnl_1d
        FROM jpm.trades_fct t
        JOIN shocks s ON t.factor_id = s.factor_id
      )
      SELECT portfolio_id, trade_date,
             percentile(pnl_1d, 0.99) AS var_99_1d,
             percentile(pnl_1d, 0.995) AS var_995_1d,
             avg(pnl_1d) AS expected_shortfall
      FROM pnl GROUP BY portfolio_id, trade_date
    """)

    # 4. REGULATORY REPORTING — read from immutable Delta snapshot
    Spark.sql(spark, """
      SELECT 'CCAR_quarterly' AS report_type, portfolio_id,
             sum(var_99_1d) AS total_var
      FROM jpm.var_daily VERSION AS OF '2024-09-30'
      GROUP BY portfolio_id
    """)

    # 5. AUDIT — Unity lineage for SEC
    Spark.sql(spark, """
      SELECT event_time, principal, action, table_name
      FROM system.access.audit
      WHERE table_name = 'jpm.trades_fct'
      ORDER BY event_time DESC LIMIT 1000
    """)

    :ok
  end
end`,
      },
      {
        lang: "zig",
        filename: "jpmorgan_risk.zig",
        code: `const std = @import("std");
const spark = @import("spark-connect-zig");

pub fn run(alloc: std.mem.Allocator) !void {
    var session = try spark.Session.builder(alloc)
        .appName("jpmorgan_risk_v2")
        .config("spark.databricks.photon.enabled", "true")
        .config("spark.sql.extensions",
                "io.delta.sql.DeltaSparkSessionExtension")
        .build();
    defer session.deinit();

    // 1. INGEST 100M trades/day — ACID + 7-year retention (SEC Rule 17a-4)
    try session.sql(
        \\CREATE TABLE jpm.trades_fct USING DELTA
        \\PARTITIONED BY (trade_date)
        \\CLUSTER BY (trade_id, counterparty_id)
        \\TBLPROPERTIES ('delta.enableChangeDataFeed'='true',
        \\                'delta.logRetentionDuration'='interval 2555 days')
        \\AS SELECT * FROM kafka_trades WHERE trade_date = current_date()
    );

    // 2. UNITY CATALOG — column-level RBAC for MNPI separation
    try session.sql(
        \\ALTER TABLE jpm.trades_fct
        \\SET TAGS ('sensitivity'='MNPI', 'regulation'='SEC-17a-4',
        \\          'retain'='7y')
    );
    try session.sql(
        \\GRANT SELECT (trade_id, trade_date, asset_class, notional_ccy)
        \\ON TABLE jpm.trades_fct TO risk_team_public
    );
    try session.sql(
        \\GRANT SELECT (trade_id, trade_date, asset_class, notional_ccy,
        \\              counterparty_id, trader_id, strategy)
        \\ON TABLE jpm.trades_fct TO risk_team_mnpi
    );

    // 3. VAR computation — Photon vectorised Monte Carlo (10K scenarios)
    try session.sql(
        \\CREATE TABLE jpm.var_daily USING DELTA
        \\CLUSTER BY (trade_date, portfolio_id) AS
        \\WITH shocks AS (
        \\  SELECT factor_id, scenario_id, factor_shock_1d
        \\  FROM jpm.risk_factors
        \\  CROSS JOIN (SELECT explode(sequence(1, 10000)) AS scenario_id)
        \\),
        \\pnl AS (
        \\  SELECT t.portfolio_id, t.trade_id, s.scenario_id,
        \\         t.notional * s.factor_shock_1d AS pnl_1d
        \\  FROM jpm.trades_fct t
        \\  JOIN shocks s ON t.factor_id = s.factor_id
        \\)
        \\SELECT portfolio_id, trade_date,
        \\       percentile(pnl_1d, 0.99) AS var_99_1d,
        \\       percentile(pnl_1d, 0.995) AS var_995_1d,
        \\       avg(pnl_1d) AS expected_shortfall
        \\FROM pnl GROUP BY portfolio_id, trade_date
    );

    // 4. REGULATORY REPORTING — read from immutable Delta snapshot
    try session.sql(
        \\SELECT 'CCAR_quarterly' AS report_type, portfolio_id,
        \\       sum(var_99_1d) AS total_var
        \\FROM jpm.var_daily VERSION AS OF '2024-09-30'
        \\GROUP BY portfolio_id
    );

    // 5. AUDIT — Unity lineage for SEC subpoena
    try session.sql(
        \\SELECT event_time, principal, action, table_name
        \\FROM system.access.audit
        \\WHERE table_name = 'jpm.trades_fct'
        \\ORDER BY event_time DESC LIMIT 1000
    );
}`,
      },
    ],
    runnablePython: `# JPMorgan risk analytics on Databricks Lakehouse — simulation
import random
from collections import defaultdict

random.seed(42)
print("=== JPMorgan risk — Delta + Unity MNPI + regulatory reporting ===")
print("Scale: 100M trades/day · 5K risk factors · 10 reg reports/day\\n")

# 1. INGEST — Delta ACID + 7-year retention (SEC Rule 17a-4)
n_trades = 100_000_000
avg_trade_bytes = 256  # rich trade record (book, desk, strategy, MNPI fields)
daily_ingest_gb = n_trades * avg_trade_bytes / 1e9
print(f"1. Ingest {n_trades:,} trades/day = {daily_ingest_gb:.1f}GB raw")
print(f"   ZSTD compressed (4:1): {daily_ingest_gb/4:.1f}GB on disk")
print(f"   CDF enabled: incremental reads at +5% storage")
print(f"   Retention: 7 years (SEC Rule 17a-4) = "
      f"{daily_ingest_gb/4*365*7/1000:.0f}TB total over 7 years")

# 2. UNITY MNPI RBAC — column-level access control
print(f"\\n2. Unity Catalog — MNPI (material non-public info) RBAC:")
columns = [
    ("trade_id",       "public"),
    ("trade_date",     "public"),
    ("asset_class",    "public"),
    ("notional_ccy",   "public"),
    ("counterparty_id", "MNPI"),    # MNPI - restricted
    ("trader_id",       "MNPI"),
    ("strategy",        "MNPI"),    # MNPI - trading strategy
    ("book",            "MNPI"),
]
mnpi_count = sum(1 for _, sens in columns if sens == "MNPI")
public_count = len(columns) - mnpi_count
print(f"   Total columns: {len(columns)} ({public_count} public, {mnpi_count} MNPI)")
print(f"   risk_team_public: SELECT on {public_count} columns only")
print(f"   risk_team_mnpi:   SELECT on all {len(columns)} columns (background-checked)")
print(f"   Tags: sensitivity=MNPI, regulation=SEC-17a-4, retain=7y")

# 3. VAR COMPUTATION — Photon Monte Carlo (10K scenarios)
n_scenarios = 10_000
n_factors = 5_000
print(f"\\n3. VaR computation — Monte Carlo ({n_scenarios:,} scenarios):")
# Total rows = trades × scenarios (cross join)
total_pnl_rows = n_trades * n_scenarios // 1000  # trades hit subset of factors
print(f"   Trades × scenarios: ~{total_pnl_rows:,} PnL rows")

# Photon vs classic Spark vs Teradata+SAS
photon_seconds = 12 * 60      # 12 minutes with Photon
classic_seconds = 90 * 60     # 90 minutes with classic Spark
teradata_sas_seconds = 4 * 3600  # 4 hours with Teradata + SAS
print(f"   Photon:        {photon_seconds/60:.0f}min  (vectorised)")
print(f"   Classic Spark: {classic_seconds/60:.0f}min")
print(f"   Teradata+SAS:  {teradata_sas_seconds/3600:.0f}h (prior stack)")
print(f"   Photon vs Td+SAS: {teradata_sas_seconds/photon_seconds:.1f}x faster")

# 4. REGULATORY REPORTS — read from immutable Delta snapshot
reports = ["CCAR_quarterly", "Basel_III_capital", "FRTB_RB", "FRTB_SA",
           "LCR_daily", "NSFR_quarterly", "Form_FR_Y14", "FFIEC_101",
           "FFIEC_102", "Volcker_rule_monthly"]
print(f"\\n4. Regulatory reports — read from immutable Delta snapshot:")
for report in reports:
    snapshot_ts = "2024-09-30"  # CCAR quarterly cutoff
    n_rows = random.randint(1_000, 50_000)
    print(f"   {report:25s} VERSION AS OF '{snapshot_ts}' -> {n_rows:,} rows")
print(f"   Total reports/day: {len(reports)} (above) · auditors can reconstruct any past day")

# 5. AUDIT — Unity lineage + system.access.audit
print(f"\\n5. Audit trail — Unity access lineage:")
audit_events = []
for _ in range(20):
    principal = random.choice(["risk_team_public", "risk_team_mnpi",
                               "regulatory_reporting", "ccar_team"])
    action = random.choice(["SELECT", "SELECT", "SELECT", "WRITE"])
    table = "jpm.trades_fct"
    n_cols_accessed = random.randint(4, 8)
    audit_events.append((principal, action, table, n_cols_accessed))
print(f"   Audit events (last 90 days, sample 20):")
for principal, action, table, n_cols in audit_events[:8]:
    print(f"   {principal:25s} {action:6s} {table} ({n_cols} cols)")
print(f"   ... ({len(audit_events)-8} more)")

# MNPI violation detection
print(f"\\n=== MNPI violation detection (Unity real-time) ===")
violations = 0
for principal, action, table, n_cols in audit_events:
    if principal == "risk_team_public" and n_cols > 4:
        violations += 1
        print(f"   ALERT: {principal} accessed {n_cols} cols "
              f"(allowed: 4 public only)")
print(f"   Violations detected: {violations} (auto-escalated to compliance)")

# Counterfactual — pre-Databricks (Teradata + SAS)
print(f"\\n=== Counterfactual: pre-Databricks (Teradata + SAS) ===")
print(f"  Compute: 4h+ per day (vs 12min with Photon)")
print(f"  MNPI: row-level only, no column RBAC")
print(f"  Audit: file logs, manual aggregation for SEC subpoenas")
print(f"  Reproducibility: bespoke snapshots, often incomplete")
print(f"\\nKey insight: Databricks Lakehouse lets banks consolidate risk")
print(f"compute + MNPI governance + regulatory reporting on one platform.")
print(f"Photon 20x speedup vs Teradata+SAS makes intraday risk possible")
print(f"(4h end-of-day -> 12min). Unity column RBAC is the killer feature")
print(f"for banks — MNPI separation is structurally hard without it.")`,
    insight: "Banks need ACID + audit + RBAC on the same platform where they compute risk — Databricks Lakehouse is the only lakehouse with all three. Photon vectorised execution gives 20× speedup over the prior Teradata + SAS stack (4h → 12min for end-of-day VaR), enabling intraday risk numbers. Unity Catalog's column-level RBAC is the killer feature for banks: MNPI separation (counterparty_id, trader_id, strategy are MNPI; trade_id, date, asset_class are public) is structurally hard without column RBAC — row-level RBAC can't prevent a public-team analyst from selecting MNPI columns. Delta's 7-year retention + time travel lets auditors reconstruct any past day's risk numbers via VERSION AS OF (SEC Rule 17a-4 compliance).",
  },
];

// ============================================================
// SNOWFLAKE POLARIS — 3 dataset examples (open lakehouse)
// ============================================================

export const SNOWFLAKE_POLARIS_EXAMPLES: DatasetExample[] = [
  {
    id: "snowflake-polaris-external-iceberg",
    step: "1",
    title: "Snowflake external Iceberg tables (10TB cross-engine)",
    subtitle: "Synthetic — cross-engine read",
    accent: "oklch(0.62 0.18 220)",
    icon: <Cloud className="h-4 w-4" />,
    badge: "Synthetic 10TB cross-engine",
    brief: {
      dataset: "Synthetic: 10TB of customer engagement data on S3 in Iceberg format. Snowflake reads via external tables (no copy into Snowflake storage), Spark writes via the same Iceberg catalog (Polaris REST), Trino + DuckDB read the same tables — one copy of data, four compute engines.",
      scale: "~10TB · 4 compute engines (Snowflake + Spark + Trino + DuckDB) · single Polaris catalog · zero data duplication · sub-15s Snowflake cross-engine JOIN",
      why: "Snowflake's external Iceberg tables (2023) let customers keep data on S3 in Iceberg format and query it from Snowflake WITHOUT copying it into Snowflake-managed storage. This is the structural break that ended Snowflake's 'data must be in Snowflake' model. With Polaris catalog (2024), Snowflake + Spark + Trino + DuckDB all read/write the same Iceberg tables through one REST catalog — truly cross-engine.",
    },
    stats: [
      { label: "Total size", value: "10TB" },
      { label: "Compute engines", value: "4" },
      { label: "Data copies", value: "1" },
      { label: "Cross-engine JOIN", value: "<15s" },
    ],
    tools: ["Snowflake External Tables (Iceberg)", "Polaris REST Catalog", "Apache Spark (Iceberg writer)", "Trino (federated read)", "DuckDB (laptop read)"],
    codeTabs: [
      {
        lang: "scala",
        filename: "SnowflakeExternalIceberg.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.iceberg.rest.RESTCatalog
import org.apache.iceberg.aws.S3FileIO

// Spark writes Iceberg tables to S3 — Polaris catalog manages metadata
val spark = SparkSession.builder()
  .appName("snowflake_external_iceberg")
  .config("spark.sql.catalog.polaris", classOf[org.apache.iceberg.spark.SparkCatalog].getName)
  .config("spark.sql.catalog.polaris.catalog-impl", classOf[RESTCatalog].getName)
  .config("spark.sql.catalog.polaris.uri", "https://polaris.moderndatascieng.com/api/catalog")
  .config("spark.sql.catalog.polaris.credential", sys.env("POLARIS_CREDENTIAL"))
  .config("spark.sql.catalog.polaris.warehouse", "s3://moderndatascieng-snowflake-iceberg")
  .config("spark.sql.catalog.polaris.io-impl", classOf[S3FileIO].getName)
  .getOrCreate()

// Create Iceberg table — Spark writes, Polaris catalogs
spark.sql("""
  |CREATE TABLE polaris.warehouse.customer_engagement
  |USING iceberg
  |PARTITIONED BY (days(event_ts))
  |TBLPROPERTIES ('format-version'='2',
  |                'write.target-file-size-bytes'='536870912')
""".stripMargin)

// Write 10TB batch — Spark commits to Iceberg, Polaris catalogs metadata
spark.sql("""
  |INSERT INTO polaris.warehouse.customer_engagement
  |SELECT * FROM staging.engagement_raw WHERE event_date = '2024-09-25'
""".stripMargin)

// Snowflake reads via external table — no copy into Snowflake storage
// Snowflake SQL (run in Snowflake worksheet, not Spark):
//   CREATE EXTERNAL TABLE IF NOT EXISTS customer_engagement_ext
//   USING CATALOG (POLARIS_CATALOG)
//   CATALOG_LOCATION = 'https://polaris.moderndatascieng.com/api/catalog'
//   TABLE = 'warehouse.customer_engagement'
//   STORAGE_LOCATION = 's3://moderndatascieng-snowflake-iceberg'
//
//   SELECT customer_id, count(*) AS n_events
//   FROM customer_engagement_ext
//   WHERE event_date >= '2024-09-01'
//   GROUP BY customer_id;

// Trino reads the same Iceberg table via Polaris REST catalog
// Trino config (config.properties):
//   connector.name=iceberg
//   iceberg.catalog.type=rest
//   iceberg.rest-catalog.uri=https://polaris.moderndatascieng.com/api/catalog
//   iceberg.rest-catalog.credential=POLARIS_CREDENTIAL
//
//   SELECT customer_id, count(*) FROM polaris.warehouse.customer_engagement
//   WHERE event_date >= '2024-09-01' GROUP BY customer_id;

// DuckDB reads via laptop — same REST catalog
//   INSTALL iceberg; LOAD iceberg;
//   ATTACH 'polaris_rest' AS polaris (TYPE iceberg,
//     URI 'https://polaris.moderndatascieng.com/api/catalog',
//     WAREHOUSE 's3://moderndatascieng-snowflake-iceberg');
//   SELECT * FROM polaris.warehouse.customer_engagement LIMIT 100;

println("Engagement table 10TB — readable by Snowflake + Spark + Trino + DuckDB")
println("Single Polaris catalog, single copy of data, four compute engines")`,
      },
      {
        lang: "rust",
        filename: "snowflake_external_iceberg.rs",
        code: `use iceberg_rust::{RestCatalog, SparkSession};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Spark writes Iceberg — Polaris catalogs metadata
    let catalog = RestCatalog::builder()
        .uri("https://polaris.moderndatascieng.com/api/catalog")
        .credential(std::env::var("POLARIS_CREDENTIAL")?)
        .warehouse("s3://moderndatascieng-snowflake-iceberg")
        .build().await?;

    let spark = SparkSession::connect_catalog(&catalog).await?;

    // Create Iceberg table — Polaris catalogs, Spark writes
    spark.sql(r#"
        CREATE TABLE warehouse.customer_engagement USING iceberg
        PARTITIONED BY (days(event_ts))
        TBLPROPERTIES ('format-version'='2',
                        'write.target-file-size-bytes'='536870912')
    "#).await?;

    // Write 10TB batch — Spark commits, Polaris catalogs metadata
    spark.sql(r#"
        INSERT INTO warehouse.customer_engagement
        SELECT * FROM staging.engagement_raw WHERE event_date = '2024-09-25'
    "#).await?;

    // Snowflake reads via external table — no copy into Snowflake storage
    // (run in Snowflake worksheet:)
    //   CREATE EXTERNAL TABLE customer_engagement_ext
    //   USING CATALOG (POLARIS_CATALOG)
    //   CATALOG_LOCATION = 'https://polaris.moderndatascieng.com/api/catalog'
    //   TABLE = 'warehouse.customer_engagement'
    //   STORAGE_LOCATION = 's3://moderndatascieng-snowflake-iceberg'

    // Trino reads same Iceberg table via Polaris REST catalog
    // Trino config: connector.name=iceberg, iceberg.catalog.type=rest
    //   iceberg.rest-catalog.uri=https://polaris.moderndatascieng.com/api/catalog

    // DuckDB reads via laptop — same REST catalog
    //   INSTALL iceberg; LOAD iceberg;
    //   ATTACH 'polaris_rest' AS polaris (TYPE iceberg, URI='...', WAREHOUSE='...')

    println!("Engagement table 10TB — readable by Snowflake + Spark + Trino + DuckDB");
    println!("Single Polaris catalog, single copy of data, four compute engines");
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "snowflake_external_iceberg.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"
    "os"

    iceberg "github.com/apache/iceberg-go"
    spark "github.com/apache/spark-connect-go"
)

func main() {
    ctx := context.Background()

    // Spark writes Iceberg — Polaris catalogs metadata
    catalog, _ := iceberg.NewRestCatalog(ctx, iceberg.RestConfig{
        URI:        "https://polaris.moderndatascieng.com/api/catalog",
        Credential: os.Getenv("POLARIS_CREDENTIAL"),
        Warehouse:  "s3://moderndatascieng-snowflake-iceberg",
    })

    sparkSession, _ := spark.NewSession(ctx, catalog)

    // Create Iceberg table — Polaris catalogs, Spark writes
    _, err := sparkSession.SQL(ctx, \`
        CREATE TABLE warehouse.customer_engagement USING iceberg
        PARTITIONED BY (days(event_ts))
        TBLPROPERTIES ('format-version'='2',
                        'write.target-file-size-bytes'='536870912')
    \`)
    if err != nil { log.Fatalf("create: %v", err) }

    // Write 10TB batch
    _, err = sparkSession.SQL(ctx, \`
        INSERT INTO warehouse.customer_engagement
        SELECT * FROM staging.engagement_raw WHERE event_date = '2024-09-25'
    \`)
    if err != nil { log.Fatalf("insert: %v", err) }

    // Snowflake reads via external table — no copy into Snowflake storage
    // (run in Snowflake worksheet):
    //   CREATE EXTERNAL TABLE customer_engagement_ext
    //   USING CATALOG (POLARIS_CATALOG)
    //   CATALOG_LOCATION = 'https://polaris.moderndatascieng.com/api/catalog'
    //   TABLE = 'warehouse.customer_engagement'

    // Trino reads via Polaris REST catalog (config.properties):
    //   connector.name=iceberg
    //   iceberg.catalog.type=rest
    //   iceberg.rest-catalog.uri=https://polaris.moderndatascieng.com/api/catalog

    // DuckDB laptop read:
    //   INSTALL iceberg; LOAD iceberg;
    //   ATTACH 'polaris_rest' AS polaris (TYPE iceberg, URI='...', WAREHOUSE='...')

    fmt.Println("Engagement 10TB — readable by Snowflake + Spark + Trino + DuckDB")
    fmt.Println("Single Polaris catalog, single copy of data, four compute engines")
}`,
      },
      {
        lang: "elixir",
        filename: "snowflake_external_iceberg.ex",
        code: `defmodule SnowflakePolaris.ExternalIceberg do
  @moduledoc "Snowflake external Iceberg tables — cross-engine read"
  @polaris_uri "https://polaris.moderndatascieng.com/api/catalog"

  def setup do
    credential = System.get_env("POLARIS_CREDENTIAL")

    # Spark writes Iceberg — Polaris catalogs metadata
    spark = Spark.new()
      |> Spark.config("spark.sql.catalog.polaris.catalog-impl",
                       "org.apache.iceberg.rest.RESTCatalog")
      |> Spark.config("spark.sql.catalog.polaris.uri", @polaris_uri)
      |> Spark.config("spark.sql.catalog.polaris.credential", credential)
      |> Spark.config("spark.sql.catalog.polaris.warehouse",
                      "s3://moderndatascieng-snowflake-iceberg")

    # Create Iceberg table — Polaris catalogs, Spark writes
    Spark.sql(spark, """
      CREATE TABLE warehouse.customer_engagement USING iceberg
      PARTITIONED BY (days(event_ts))
      TBLPROPERTIES ('format-version'='2',
                      'write.target-file-size-bytes'='536870912')
    """)

    # Write 10TB batch — Spark commits to Iceberg, Polaris catalogs metadata
    Spark.sql(spark, """
      INSERT INTO warehouse.customer_engagement
      SELECT * FROM staging.engagement_raw WHERE event_date = '2024-09-25'
    """)

    # Snowflake reads via external table (no copy into Snowflake storage):
    #   CREATE EXTERNAL TABLE customer_engagement_ext
    #   USING CATALOG (POLARIS_CATALOG)
    #   CATALOG_LOCATION = 'https://polaris.moderndatascieng.com/api/catalog'
    #   TABLE = 'warehouse.customer_engagement'

    # Trino reads via Polaris REST catalog (config.properties):
    #   connector.name=iceberg
    #   iceberg.catalog.type=rest
    #   iceberg.rest-catalog.uri='https://polaris.moderndatascieng.com/api/catalog'

    # DuckDB laptop read:
    #   INSTALL iceberg; LOAD iceberg;
    #   ATTACH 'polaris_rest' AS polaris (TYPE iceberg, URI='...', WAREHOUSE='...')

    IO.puts("Engagement 10TB — readable by Snowflake + Spark + Trino + DuckDB")
    IO.puts("Single Polaris catalog, single copy of data, four compute engines")
    :ok
  end
end`,
      },
      {
        lang: "zig",
        filename: "snowflake_external_iceberg.zig",
        code: `const std = @import("std");
const spark = @import("spark-connect-zig");
const iceberg = @import("iceberg-zig");

pub fn setup(alloc: std.mem.Allocator) !void {
    const credential = std.posix.getenv("POLARIS_CREDENTIAL") orelse "";

    // Spark writes Iceberg — Polaris catalogs metadata
    var catalog = try iceberg.RestCatalog.init(alloc, .{
        .uri = "https://polaris.moderndatascieng.com/api/catalog",
        .credential = credential,
        .warehouse = "s3://moderndatascieng-snowflake-iceberg",
    });
    defer catalog.deinit();

    var session = try spark.Session.connect_catalog(&catalog);
    defer session.deinit();

    // Create Iceberg table — Polaris catalogs, Spark writes
    try session.sql(
        \\CREATE TABLE warehouse.customer_engagement USING iceberg
        \\PARTITIONED BY (days(event_ts))
        \\TBLPROPERTIES ('format-version'='2',
        \\                'write.target-file-size-bytes'='536870912')
    );

    // Write 10TB batch — Spark commits, Polaris catalogs metadata
    try session.sql(
        \\INSERT INTO warehouse.customer_engagement
        \\SELECT * FROM staging.engagement_raw WHERE event_date = '2024-09-25'
    );

    // Snowflake reads via external table (no copy into Snowflake storage):
    //   CREATE EXTERNAL TABLE customer_engagement_ext
    //   USING CATALOG (POLARIS_CATALOG)
    //   CATALOG_LOCATION = 'https://polaris.moderndatascieng.com/api/catalog'
    //   TABLE = 'warehouse.customer_engagement'

    // Trino reads via Polaris REST catalog (config.properties):
    //   connector.name=iceberg
    //   iceberg.catalog.type=rest
    //   iceberg.rest-catalog.uri='https://polaris.moderndatascieng.com/api/catalog'

    // DuckDB laptop read:
    //   INSTALL iceberg; LOAD iceberg;
    //   ATTACH 'polaris_rest' AS polaris (TYPE iceberg, URI='...', WAREHOUSE='...')

    std.debug.print("Engagement 10TB — readable by Snowflake + Spark + Trino + DuckDB\\n", .{});
    std.debug.print("Single Polaris catalog, single copy of data, four compute engines\\n", .{});
}`,
      },
    ],
    runnablePython: `# Snowflake external Iceberg tables — cross-engine read simulation
import random
from collections import defaultdict

random.seed(42)
print("=== Snowflake Polaris — external Iceberg tables (cross-engine) ===")
print("Scale: 10TB · 4 compute engines · single Polaris catalog\\n")

# 1. Spark writes Iceberg to S3 — Polaris catalogs metadata
n_files = 2500  # 10TB / 400MB avg file size
print(f"1. Spark writes Iceberg to S3:")
print(f"   Files: {n_files:,} (~400MB each)")
print(f"   Total: 10TB on S3, single Polaris catalog pointer")
print(f"   Iceberg manifest tree: metadata.json -> snapshots -> manifests -> files")

# 2. Snowflake reads via external table — no copy
print(f"\\n2. Snowflake external table — no copy into Snowflake storage:")
snowflake_query_latencies = []
for _ in range(100):
    n_files_scanned = random.randint(10, 100)
    # Snowflake's vectorised reader + manifest pruning
    latency_s = 2 + n_files_scanned * 0.1
    snowflake_query_latencies.append(latency_s)
snowflake_query_latencies.sort()
print(f"   P50: {snowflake_query_latencies[50]:.1f}s  "
      f"P95: {snowflake_query_latencies[95]:.1f}s  "
      f"P99: {snowflake_query_latencies[99]:.1f}s")
print(f"   Storage cost: $0 (data stays on S3, Snowflake charges only compute)")

# 3. Trino reads via Polaris REST catalog
trino_latencies = []
for _ in range(100):
    n_files_scanned = random.randint(10, 100)
    latency_s = 3 + n_files_scanned * 0.15  # Trino slightly slower than Snowflake
    trino_latencies.append(latency_s)
trino_latencies.sort()
print(f"\\n3. Trino reads via Polaris REST catalog:")
print(f"   P50: {trino_latencies[50]:.1f}s  "
      f"P95: {trino_latencies[95]:.1f}s  "
      f"P99: {trino_latencies[99]:.1f}s")
print(f"   Federated JOIN: Iceberg + MySQL + Kafka in one query")

# 4. DuckDB reads via laptop — same REST catalog
duckdb_latencies = []
for _ in range(100):
    n_files_scanned = random.randint(5, 30)  # laptop scans fewer files
    latency_s = 5 + n_files_scanned * 0.4  # laptop is slower but no cluster
    duckdb_latencies.append(latency_s)
duckdb_latencies.sort()
print(f"\\n4. DuckDB laptop read via same REST catalog:")
print(f"   P50: {duckdb_latencies[50]:.1f}s  "
      f"P95: {duckdb_latencies[95]:.1f}s  "
      f"P99: {duckdb_latencies[99]:.1f}s")
print(f"   No cluster — runs on analyst's MacBook")

# 5. Cross-engine federation — Snowflake JOINs Spark-written Iceberg + MySQL
print(f"\\n5. Cross-engine JOIN (Snowflake + Spark-written Iceberg + MySQL):")
join_latency = max(snowflake_query_latencies[50], 5) + 3  # federation overhead
print(f"   Snowflake federated query: {join_latency:.1f}s")
print(f"   Joins: customer_engagement_ext (Iceberg on S3) + dim_customer (MySQL)")
print(f"   Single query plan across Snowflake + MySQL + Iceberg on S3")

# Comparison — Polaris cross-engine vs vendor-locked
print(f"\\n=== Comparison: Polaris cross-engine vs vendor-locked ===")
print(f"  Vendor-locked (Snowflake pre-2023):")
print(f"    - Data MUST be in Snowflake storage")
print(f"    - COPY INTO from S3 -> Snowflake-managed")
print(f"    - 2 copies of data (S3 raw + Snowflake)")
print(f"    - Spark cannot read Snowflake-managed tables (no Iceberg)")
print(f"    - Storage cost: ~$23/TB/month (Snowflake) + $0.023/TB/month (S3)")
print(f"  Polaris (2024):")
print(f"    - Data stays on S3 in Iceberg format")
print(f"    - 1 copy of data, 4 compute engines read directly")
print(f"    - Spark writes, Snowflake/Trino/DuckDB read")
print(f"    - Storage cost: $0.023/TB/month (S3 only)")

# Cost simulation — 10TB scale
print(f"\\n=== Cost simulation (10TB, 1 year) ===")
snowflake_locked_cost = 10 * 23 * 12  # Snowflake storage
s3_polaris_cost = 10 * 0.023 * 12 * 4  # S3 + Iceberg metadata overhead
print(f"  Snowflake-locked: \${snowflake_locked_cost:,.0f}/year (storage only)")
print(f"  Polaris + S3:      \${s3_polaris_cost:,.0f}/year (storage)")
print(f"  Compute:           both charge per-query, similar")
print(f"  Savings:           \${snowflake_locked_cost - s3_polaris_cost:,.0f}/year "
      f"on 10TB scale")
print(f"\\nKey insight: Snowflake external Iceberg + Polaris is the explicit")
print(f"counter-bet to the prior 'data must be in Snowflake' model. Snowflake")
print(f"saw customers moving to Iceberg + open catalogs — they pivoted to")
print(f"meet that market by offering external tables + Polaris (2024),")
print(f"betting that they win the catalog battle and earn compute revenue")
print(f"even if customers' data stays on S3.")`,
    insight: "Snowflake's external Iceberg tables (2023) + Polaris catalog (2024) is the explicit counter-bet to the prior 'data must be in Snowflake storage' model. Customers keep data on S3 in Iceberg format; Snowflake reads via external tables (no copy into Snowflake storage); Spark + Trino + DuckDB read the same tables via the Polaris REST catalog. One copy of data, four compute engines, single Polaris catalog. The strategic pivot: Snowflake saw customers moving to Iceberg + open catalogs, so they pivoted to meet that market — betting they win the catalog battle and earn compute revenue even if customers' data stays on S3. Storage cost savings: ~$2,700/year on 10TB scale (Snowflake-managed at $23/TB/mo vs S3+Polaris at $0.023/TB/mo).",
  },
  {
    id: "snowflake-polaris-rest-catalog",
    step: "2",
    title: "Polaris REST catalog (5TB, multi-engine)",
    subtitle: "Synthetic — Spark + Trino + DuckDB + Snowflake",
    accent: "oklch(0.65 0.18 200)",
    icon: <Server className="h-4 w-4" />,
    badge: "Synthetic 5TB REST catalog",
    brief: {
      dataset: "Synthetic: 5TB of product catalog + order events on S3, registered in Snowflake's Polaris REST catalog (Apache-licensed, 2024). Spark writes, Snowflake reads via external tables, Trino + DuckDB read via REST — one catalog endpoint, one OAuth2 credential, one RBAC policy.",
      scale: "~5TB · 4 compute engines · 1 REST endpoint · OAuth2 cross-engine auth · sub-second catalog lookup latency",
      why: "The Polaris REST catalog is Snowflake's 2024 strategic bet — Apache-licensed to counter Databricks' closed Unity Catalog. By making the catalog open, Snowflake aims to become the catalog of record for cross-engine lakehouses — earning compute revenue even on data not stored in Snowflake. The bet: if customers standardise on Polaris as the catalog, Snowflake + Spark + Trino + DuckDB all read/write the same tables — Snowflake's storage lock-in becomes irrelevant.",
    },
    stats: [
      { label: "Total size", value: "5TB" },
      { label: "Compute engines", value: "4" },
      { label: "REST endpoint", value: "1" },
      { label: "Catalog lookup", value: "<1s" },
    ],
    tools: ["Snowflake Polaris (Apache-licensed)", "Iceberg REST Catalog spec", "OAuth2 cross-engine auth", "Spark/Trino/DuckDB/Snowflake REST clients", "S3 storage", "RBAC principal grants"],
    codeTabs: [
      {
        lang: "scala",
        filename: "PolarisRestCatalog.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.iceberg.rest.RESTCatalog

// Spark — Polaris REST catalog client (Apache-licensed, OAuth2)
val spark = SparkSession.builder()
  .appName("polaris_rest_spark")
  .config("spark.sql.catalog.polaris", classOf[org.apache.iceberg.spark.SparkCatalog].getName)
  .config("spark.sql.catalog.polaris.catalog-impl", classOf[RESTCatalog].getName)
  .config("spark.sql.catalog.polaris.uri", "https://polaris.moderndatascieng.com/api/catalog")
  .config("spark.sql.catalog.polaris.credential", sys.env("POLARIS_CREDENTIAL"))
  .config("spark.sql.catalog.polaris.warehouse", "s3://moderndatascieng-polaris")
  .config("spark.sql.catalog.polaris.scope", "PRINCIPAL_ROLE:ALL")
  .getOrCreate()

// Write 5TB batch — Spark commits, Polaris catalogs metadata
spark.sql("""
  |CREATE TABLE polaris.warehouse.orders_fct
  |USING iceberg
  |PARTITIONED BY (days(order_ts), bucket(16, customer_id))
  |TBLPROPERTIES ('format-version'='2')
""".stripMargin)
spark.sql("""
  |INSERT INTO polaris.warehouse.orders_fct
  |SELECT * FROM staging.orders_raw WHERE order_date = '2024-09-25'
""".stripMargin)

// RBAC — Polaris principal grants apply across all engines
spark.sql("""
  |GRANT CATALOG_USAGE ON CATALOG polaris TO ROLE spark_writer
""".stripMargin)
spark.sql("""
  |GRANT SELECT, INSERT ON TABLE polaris.warehouse.orders_fct TO ROLE spark_writer
""".stripMargin)
spark.sql("""
  |GRANT SELECT ON TABLE polaris.warehouse.orders_fct TO ROLE trino_reader
""".stripMargin)
spark.sql("""
  |GRANT SELECT ON TABLE polaris.warehouse.orders_fct TO ROLE snowflake_reader
""".stripMargin)

// --- Trino reads via Polaris REST catalog (separate process) ---
// trino/conf/catalog/polaris.properties:
//   connector.name=iceberg
//   iceberg.catalog.type=rest
//   iceberg.rest-catalog.uri=https://polaris.moderndatascieng.com/api/catalog
//   iceberg.rest-catalog.credential=\${ENVVAR:POLARIS_CREDENTIAL}
//   iceberg.rest-catalog.warehouse=s3://moderndatascieng-polaris
//
// SELECT count(*) FROM polaris.warehouse.orders_fct;

// --- DuckDB reads via Polaris REST catalog (laptop) ---
// INSTALL iceberg; LOAD iceberg;
// ATTACH 'polaris_rest' AS polaris (
//   TYPE iceberg,
//   URI 'https://polaris.moderndatascieng.com/api/catalog',
//   WAREHOUSE 's3://moderndatascieng-polaris'
// );
// SELECT count(*) FROM polaris.warehouse.orders_fct;

// --- Snowflake reads via external table ---
// CREATE EXTERNAL TABLE orders_fct_ext
//   USING CATALOG (POLARIS_CATALOG)
//   CATALOG_LOCATION = 'https://polaris.moderndatascieng.com/api/catalog'
//   TABLE = 'warehouse.orders_fct'
//   STORAGE_LOCATION = 's3://moderndatascieng-polaris';
// SELECT count(*) FROM orders_fct_ext;

println("5TB orders table — readable by Spark + Trino + DuckDB + Snowflake")
println("One Polaris catalog, one OAuth2 credential, one RBAC policy")`,
      },
      {
        lang: "rust",
        filename: "polaris_rest_catalog.rs",
        code: `use iceberg_rust::{RestCatalog, SparkSession};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Spark — Polaris REST catalog client (Apache-licensed, OAuth2)
    let catalog = RestCatalog::builder()
        .uri("https://polaris.moderndatascieng.com/api/catalog")
        .credential(std::env::var("POLARIS_CREDENTIAL")?)
        .warehouse("s3://moderndatascieng-polaris")
        .scope("PRINCIPAL_ROLE:ALL")
        .build().await?;

    let spark = SparkSession::connect_catalog(&catalog).await?;

    // Write 5TB batch — Spark commits, Polaris catalogs metadata
    spark.sql(r#"
        CREATE TABLE warehouse.orders_fct USING iceberg
        PARTITIONED BY (days(order_ts), bucket(16, customer_id))
        TBLPROPERTIES ('format-version'='2')
    "#).await?;
    spark.sql(r#"
        INSERT INTO warehouse.orders_fct
        SELECT * FROM staging.orders_raw WHERE order_date = '2024-09-25'
    "#).await?;

    // RBAC — Polaris principal grants apply across all engines
    spark.sql("GRANT CATALOG_USAGE ON CATALOG polaris TO ROLE spark_writer").await?;
    spark.sql("GRANT SELECT, INSERT ON TABLE warehouse.orders_fct TO ROLE spark_writer").await?;
    spark.sql("GRANT SELECT ON TABLE warehouse.orders_fct TO ROLE trino_reader").await?;
    spark.sql("GRANT SELECT ON TABLE warehouse.orders_fct TO ROLE snowflake_reader").await?;

    // Trino reads via Polaris REST catalog (config.properties):
    //   connector.name=iceberg
    //   iceberg.catalog.type=rest
    //   iceberg.rest-catalog.uri=https://polaris.moderndatascieng.com/api/catalog
    //   iceberg.rest-catalog.credential=POLARIS_CREDENTIAL

    // DuckDB laptop read:
    //   INSTALL iceberg; LOAD iceberg;
    //   ATTACH 'polaris_rest' AS polaris (TYPE iceberg, URI='...', WAREHOUSE='...')

    // Snowflake external table:
    //   CREATE EXTERNAL TABLE orders_fct_ext USING CATALOG (POLARIS_CATALOG)
    //   CATALOG_LOCATION='https://polaris.moderndatascieng.com/api/catalog'

    println!("5TB orders table — readable by Spark + Trino + DuckDB + Snowflake");
    println!("One Polaris catalog, one OAuth2 credential, one RBAC policy");
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "polaris_rest_catalog.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"
    "os"

    iceberg "github.com/apache/iceberg-go"
    spark "github.com/apache/spark-connect-go"
)

func main() {
    ctx := context.Background()

    // Spark — Polaris REST catalog client (Apache-licensed, OAuth2)
    catalog, _ := iceberg.NewRestCatalog(ctx, iceberg.RestConfig{
        URI:        "https://polaris.moderndatascieng.com/api/catalog",
        Credential: os.Getenv("POLARIS_CREDENTIAL"),
        Warehouse:  "s3://moderndatascieng-polaris",
        Scope:      "PRINCIPAL_ROLE:ALL",
    })
    sparkSession, _ := spark.NewSession(ctx, catalog)

    // Write 5TB batch — Spark commits, Polaris catalogs metadata
    _, err := sparkSession.SQL(ctx, \`
        CREATE TABLE warehouse.orders_fct USING iceberg
        PARTITIONED BY (days(order_ts), bucket(16, customer_id))
        TBLPROPERTIES ('format-version'='2')
    \`)
    if err != nil { log.Fatalf("create: %v", err) }

    _, err = sparkSession.SQL(ctx, \`
        INSERT INTO warehouse.orders_fct
        SELECT * FROM staging.orders_raw WHERE order_date = '2024-09-25'
    \`)
    if err != nil { log.Fatalf("insert: %v", err) }

    // RBAC — Polaris principal grants apply across all engines
    grants := []string{
        "GRANT CATALOG_USAGE ON CATALOG polaris TO ROLE spark_writer",
        "GRANT SELECT, INSERT ON TABLE warehouse.orders_fct TO ROLE spark_writer",
        "GRANT SELECT ON TABLE warehouse.orders_fct TO ROLE trino_reader",
        "GRANT SELECT ON TABLE warehouse.orders_fct TO ROLE snowflake_reader",
    }
    for _, g := range grants {
        _, _ = sparkSession.SQL(ctx, g)
    }

    // Trino reads via Polaris REST catalog (config.properties):
    //   connector.name=iceberg
    //   iceberg.catalog.type=rest
    //   iceberg.rest-catalog.uri=https://polaris.moderndatascieng.com/api/catalog
    //   iceberg.rest-catalog.credential=POLARIS_CREDENTIAL

    // DuckDB laptop read:
    //   INSTALL iceberg; LOAD iceberg;
    //   ATTACH 'polaris_rest' AS polaris (TYPE iceberg, URI='...', WAREHOUSE='...')

    // Snowflake external table:
    //   CREATE EXTERNAL TABLE orders_fct_ext USING CATALOG (POLARIS_CATALOG)

    fmt.Println("5TB orders — readable by Spark + Trino + DuckDB + Snowflake")
    fmt.Println("One Polaris catalog, one OAuth2 credential, one RBAC policy")
}`,
      },
      {
        lang: "elixir",
        filename: "polaris_rest_catalog.ex",
        code: `defmodule SnowflakePolaris.RestCatalog do
  @moduledoc "Polaris REST catalog — 4 compute engines, one catalog"
  @polaris_uri "https://polaris.moderndatascieng.com/api/catalog"

  def setup do
    credential = System.get_env("POLARIS_CREDENTIAL")

    # Spark — Polaris REST catalog client (Apache-licensed, OAuth2)
    spark = Spark.new()
      |> Spark.config("spark.sql.catalog.polaris.catalog-impl",
                       "org.apache.iceberg.rest.RESTCatalog")
      |> Spark.config("spark.sql.catalog.polaris.uri", @polaris_uri)
      |> Spark.config("spark.sql.catalog.polaris.credential", credential)
      |> Spark.config("spark.sql.catalog.polaris.warehouse",
                      "s3://moderndatascieng-polaris")
      |> Spark.config("spark.sql.catalog.polaris.scope", "PRINCIPAL_ROLE:ALL")

    # Write 5TB batch — Spark commits, Polaris catalogs metadata
    Spark.sql(spark, """
      CREATE TABLE warehouse.orders_fct USING iceberg
      PARTITIONED BY (days(order_ts), bucket(16, customer_id))
      TBLPROPERTIES ('format-version'='2')
    """)
    Spark.sql(spark, """
      INSERT INTO warehouse.orders_fct
      SELECT * FROM staging.orders_raw WHERE order_date = '2024-09-25'
    """)

    # RBAC — Polaris principal grants apply across all engines
    Spark.sql(spark, "GRANT CATALOG_USAGE ON CATALOG polaris TO ROLE spark_writer")
    Spark.sql(spark,
      "GRANT SELECT, INSERT ON TABLE warehouse.orders_fct TO ROLE spark_writer")
    Spark.sql(spark,
      "GRANT SELECT ON TABLE warehouse.orders_fct TO ROLE trino_reader")
    Spark.sql(spark,
      "GRANT SELECT ON TABLE warehouse.orders_fct TO ROLE snowflake_reader")

    # Trino reads via Polaris REST catalog (config.properties):
    #   connector.name=iceberg
    #   iceberg.catalog.type=rest
    #   iceberg.rest-catalog.uri='https://polaris.moderndatascieng.com/api/catalog'

    # DuckDB laptop read:
    #   INSTALL iceberg; LOAD iceberg;
    #   ATTACH 'polaris_rest' AS polaris (TYPE iceberg, URI='...', WAREHOUSE='...')

    # Snowflake external table:
    #   CREATE EXTERNAL TABLE orders_fct_ext USING CATALOG (POLARIS_CATALOG)

    IO.puts("5TB orders — readable by Spark + Trino + DuckDB + Snowflake")
    IO.puts("One Polaris catalog, one OAuth2 credential, one RBAC policy")
    :ok
  end
end`,
      },
      {
        lang: "zig",
        filename: "polaris_rest_catalog.zig",
        code: `const std = @import("std");
const spark = @import("spark-connect-zig");
const iceberg = @import("iceberg-zig");

pub fn setup(alloc: std.mem.Allocator) !void {
    const credential = std.posix.getenv("POLARIS_CREDENTIAL") orelse "";

    // Spark — Polaris REST catalog client (Apache-licensed, OAuth2)
    var catalog = try iceberg.RestCatalog.init(alloc, .{
        .uri = "https://polaris.moderndatascieng.com/api/catalog",
        .credential = credential,
        .warehouse = "s3://moderndatascieng-polaris",
        .scope = "PRINCIPAL_ROLE:ALL",
    });
    defer catalog.deinit();
    var session = try spark.Session.connect_catalog(&catalog);
    defer session.deinit();

    // Write 5TB batch — Spark commits, Polaris catalogs metadata
    try session.sql(
        \\CREATE TABLE warehouse.orders_fct USING iceberg
        \\PARTITIONED BY (days(order_ts), bucket(16, customer_id))
        \\TBLPROPERTIES ('format-version'='2')
    );
    try session.sql(
        \\INSERT INTO warehouse.orders_fct
        \\SELECT * FROM staging.orders_raw WHERE order_date = '2024-09-25'
    );

    // RBAC — Polaris principal grants apply across all engines
    try session.sql("GRANT CATALOG_USAGE ON CATALOG polaris TO ROLE spark_writer");
    try session.sql("GRANT SELECT, INSERT ON TABLE warehouse.orders_fct TO ROLE spark_writer");
    try session.sql("GRANT SELECT ON TABLE warehouse.orders_fct TO ROLE trino_reader");
    try session.sql("GRANT SELECT ON TABLE warehouse.orders_fct TO ROLE snowflake_reader");

    // Trino reads via Polaris REST catalog (config.properties):
    //   connector.name=iceberg
    //   iceberg.catalog.type=rest
    //   iceberg.rest-catalog.uri='https://polaris.moderndatascieng.com/api/catalog'

    // DuckDB laptop read:
    //   INSTALL iceberg; LOAD iceberg;
    //   ATTACH 'polaris_rest' AS polaris (TYPE iceberg, URI='...', WAREHOUSE='...')

    // Snowflake external table:
    //   CREATE EXTERNAL TABLE orders_fct_ext USING CATALOG (POLARIS_CATALOG)

    std.debug.print("5TB orders — readable by Spark + Trino + DuckDB + Snowflake\\n", .{});
    std.debug.print("One Polaris catalog, one OAuth2 credential, one RBAC policy\\n", .{});
}`,
      },
    ],
    runnablePython: `# Polaris REST catalog — multi-engine simulation
import random
from collections import defaultdict

random.seed(42)
print("=== Snowflake Polaris REST catalog — multi-engine ===")
print("Scale: 5TB · 4 compute engines · 1 REST endpoint\\n")

# Simulate Polaris catalog server — REST API + OAuth2 + RBAC
engines = [
    {"name": "Apache Spark", "role": "spark_writer",
     "operations": ["CREATE", "INSERT", "SELECT"],
     "calls_per_day": random.randint(500, 1500)},
    {"name": "Trino", "role": "trino_reader",
     "operations": ["SELECT"],
     "calls_per_day": random.randint(2000, 5000)},
    {"name": "DuckDB", "role": "duckdb_reader",
     "operations": ["SELECT"],
     "calls_per_day": random.randint(50, 200)},
    {"name": "Snowflake", "role": "snowflake_reader",
     "operations": ["SELECT"],
     "calls_per_day": random.randint(1000, 3000)},
]

print("Catalog call pattern (per day):")
total_calls = 0
for e in engines:
    calls = e["calls_per_day"]
    total_calls += calls
    print(f"  {e['name']:15s} (role: {e['role']:18s}): "
          f"{calls:>5,} calls/day, ops: {e['operations']}")
print(f"  {'Total':15s}                          {total_calls:>5,} calls/day")

# Catalog lookup latency — Polaris REST is ~5-15ms per call
print(f"\\nCatalog lookup latency (REST API):")
lookup_latencies = []
for _ in range(100):
    # Cold cache (first read of a table): 50-200ms
    # Warm cache: 2-10ms
    if random.random() < 0.85:
        lookup_latencies.append(random.uniform(2, 10))
    else:
        lookup_latencies.append(random.uniform(50, 200))
lookup_latencies.sort()
print(f"  P50: {lookup_latencies[50]:.1f}ms  "
      f"P95: {lookup_latencies[95]:.1f}ms  "
      f"P99: {lookup_latencies[99]:.1f}ms")
print(f"  Cache hit rate: 85% (metadata.json + manifest list cached)")

# OAuth2 — single credential across all engines
print(f"\\nOAuth2 — single credential across all engines:")
print(f"  ENV: POLARIS_CREDENTIAL (one OAuth2 token)")
print(f"  Token lifetime: 1 hour (auto-refresh)")
print(f"  Scope: PRINCIPAL_ROLE:ALL (all roles assigned to principal)")
print(f"  Applies to: Spark + Trino + DuckDB + Snowflake")
print(f"  No per-engine IAM role to manage")

# RBAC — principal grants apply across all engines
print(f"\\nRBAC — principal grants (one policy, all engines):")
policies = [
    ("spark_writer",     "warehouse.orders_fct", "SELECT, INSERT"),
    ("trino_reader",     "warehouse.orders_fct", "SELECT"),
    ("duckdb_reader",    "warehouse.orders_fct", "SELECT"),
    ("snowflake_reader", "warehouse.orders_fct", "SELECT"),
]
for role, table, priv in policies:
    print(f"  GRANT {priv} ON TABLE {table} TO ROLE {role}")
print(f"  Enforced at: Polaris catalog server (not per-engine)")
print(f"  Engines see only tables they have privilege on")

# Audit log — every catalog call logged
print(f"\\nAudit log (every catalog call logged):")
audit_events = []
for e in engines:
    for _ in range(5):
        audit_events.append({
            "engine": e["name"],
            "role": e["role"],
            "operation": random.choice(e["operations"]),
            "table": "warehouse.orders_fct",
            "timestamp": f"2024-09-25T10:{random.randint(0,59):02d}:{random.randint(0,59):02d}Z",
        })
for event in audit_events[:6]:
    print(f"  {event['timestamp']} {event['engine']:15s} {event['role']:18s} "
          f"{event['operation']:6s} {event['table']}")
print(f"  ... ({len(audit_events)-6} more)")

# Counterfactual — pre-Polaris (Snowflake + Glue + Hive Metastore split)
print(f"\\n=== Counterfactual: pre-Polaris (Snowflake + Glue + HMS split) ===")
print(f"  Snowflake tables: stored in Snowflake, only Snowflake reads them")
print(f"  S3/Iceberg tables: cataloged in Glue, only Spark/Athena reads")
print(f"  Hadoop tables: cataloged in HMS, only Hive/Impala reads")
print(f"  Result: 3 catalogs, 3 RBAC policies, 3 audit logs, 0 federation")
print(f"  To JOIN across: 3 separate queries + manual reconciliation")
print(f"\\nKey insight: Polaris REST catalog is the open-protocol counter-bet")
print(f"to vendor-locked catalogs. By making it Apache-licensed (2024),")
print(f"Snowflake aims to become the catalog of record for cross-engine")
print(f"lakehouses. Single OAuth2 credential, single RBAC policy, single")
print(f"audit log — enforced at the catalog server, not duplicated across")
print(f"engines. Snowflake earns compute revenue even on data not in")
print(f"Snowflake-managed storage — the strategic pivot to open.")`,
    insight: "Polaris REST catalog is Snowflake's open-protocol counter-bet to vendor-locked catalogs (Glue = AWS-only, Unity = Databricks-bound). By making it Apache-licensed (2024), Snowflake aims to become the catalog of record for cross-engine lakehouses. Single OAuth2 credential, single RBAC policy (principal grants enforced at the catalog server, not per-engine), single audit log — duplicated enforcement replaced by central enforcement. Engines see only tables they have privilege on. Snowflake's strategic pivot: earn compute revenue even on data not in Snowflake-managed storage — the bet that customers prefer open catalogs and that Polaris becomes the universal catalog, with Snowflake as the reference deployment.",
  },
  {
    id: "snowflake-polaris-federation",
    step: "3",
    title: "Cross-engine federation (1TB, same Iceberg)",
    subtitle: "Synthetic — Snowflake + Spark + Trino on one table",
    accent: "oklch(0.62 0.16 60)",
    icon: <Network className="h-4 w-4" />,
    badge: "Synthetic 1TB federation",
    brief: {
      dataset: "Synthetic: 1TB customer behavior table on S3 in Iceberg format. Snowflake + Spark + Trino each read the same table via Polaris — each engine runs a different workload (Snowflake BI, Spark ML feature engineering, Trino ad-hoc SQL). Cross-engine federation: each engine sees a consistent snapshot.",
      scale: "~1TB · 3 engines (Snowflake + Spark + Trino) · 3 workloads · single Polaris catalog · consistent snapshot read",
      why: "Cross-engine federation is the killer feature of the open lakehouse — different teams use different compute engines (Snowflake for BI, Spark for ML, Trino for ad-hoc SQL) but read the same Iceberg tables through one Polaris catalog. Without an open catalog, each engine would have its own copy of the data — storage cost ×3, governance ×3, drift between copies. With Polaris, one copy, one RBAC, one audit.",
    },
    stats: [
      { label: "Total size", value: "1TB" },
      { label: "Engines", value: "3" },
      { label: "Workloads", value: "3" },
      { label: "Data copies", value: "1" },
    ],
    tools: ["Polaris REST Catalog", "Snowflake External Tables", "Apache Spark (ML workload)", "Trino (ad-hoc SQL)", "Iceberg v2 (consistent snapshots)", "OAuth2 cross-engine auth"],
    codeTabs: [
      {
        lang: "scala",
        filename: "PolarisFederation.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.iceberg.rest.RESTCatalog

// Spark — ML feature engineering workload on same Iceberg table
val spark = SparkSession.builder()
  .appName("polaris_federation_spark_ml")
  .config("spark.sql.catalog.polaris", classOf[org.apache.iceberg.spark.SparkCatalog].getName)
  .config("spark.sql.catalog.polaris.catalog-impl", classOf[RESTCatalog].getName)
  .config("spark.sql.catalog.polaris.uri", "https://polaris.moderndatascieng.com/api/catalog")
  .config("spark.sql.catalog.polaris.credential", sys.env("POLARIS_CREDENTIAL"))
  .config("spark.sql.catalog.polaris.warehouse", "s3://moderndatascieng-polaris-federation")
  .getOrCreate()

// ML FEATURE ENGINEERING — Spark reads customer_behavior, writes features
val featuresDf = spark.sql("""
  |SELECT
  |  customer_id,
  |  sum(amount)         OVER (PARTITION BY customer_id ORDER BY event_ts
  |                          RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS spend_30d,
  |  count(*)            OVER (PARTITION BY customer_id ORDER BY event_ts
  |                          RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS events_30d,
  |  avg(session_duration) OVER (PARTITION BY customer_id ORDER BY event_ts
  |                          RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS avg_session_30d
  |FROM polaris.warehouse.customer_behavior
  |WHERE event_date >= current_date() - 30
""".stripMargin)

// Write features back to Polaris-governed Iceberg table
spark.sql("""
  |INSERT INTO polaris.warehouse.customer_features
  |SELECT * FROM featuresDf
""".stripMargin)

// Spark sees the SAME snapshot as Snowflake + Trino — consistent reads
spark.sql("""
  |SELECT count(*) AS n_rows, max(event_ts) AS latest_event
  |FROM polaris.warehouse.customer_behavior
""".stripMargin).show()

// --- Snowflake runs BI workload on same table ---
// (Snowflake worksheet, run by BI team)
//   SELECT customer_id, sum(amount) AS total_spend,
//          count(*) AS n_events
//   FROM customer_behavior_ext  -- external Iceberg table via Polaris
//   WHERE event_date >= '2024-09-01'
//   GROUP BY customer_id
//   ORDER BY total_spend DESC LIMIT 100;
//
//   -- Same snapshot as Spark + Trino — no drift

// --- Trino runs ad-hoc SQL workload on same table ---
// (Trino CLI, run by analyst)
//   SELECT event_type, count(*) AS n_events,
//          avg(session_duration) AS avg_duration
//   FROM polaris.warehouse.customer_behavior
//   WHERE event_date >= date '2024-09-01'
//     AND event_type IN ('purchase', 'signup', 'login')
//   GROUP BY event_type;
//
//   -- Trino reads the SAME Iceberg snapshot — consistent results

println("3 engines (Snowflake + Spark + Trino) — 1 Iceberg table, 1 Polaris catalog")
println("Each engine runs its own workload, all see the same snapshot — no drift")`,
      },
      {
        lang: "rust",
        filename: "polaris_federation.rs",
        code: `use iceberg_rust::{RestCatalog, SparkSession};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Spark — ML feature engineering workload on same Iceberg table
    let catalog = RestCatalog::builder()
        .uri("https://polaris.moderndatascieng.com/api/catalog")
        .credential(std::env::var("POLARIS_CREDENTIAL")?)
        .warehouse("s3://moderndatascieng-polaris-federation")
        .build().await?;
    let spark = SparkSession::connect_catalog(&catalog).await?;

    // ML FEATURE ENGINEERING — Spark reads customer_behavior, writes features
    let features = spark.sql(r#"
        SELECT customer_id,
            sum(amount) OVER (PARTITION BY customer_id ORDER BY event_ts
                RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS spend_30d,
            count(*) OVER (PARTITION BY customer_id ORDER BY event_ts
                RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS events_30d,
            avg(session_duration) OVER (PARTITION BY customer_id ORDER BY event_ts
                RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS avg_session_30d
        FROM warehouse.customer_behavior
        WHERE event_date >= current_date() - 30
    "#).await?;

    // Write features back to Polaris-governed Iceberg table
    spark.sql(r#"
        INSERT INTO warehouse.customer_features
        SELECT * FROM features
    "#).await?;

    // Spark sees the SAME snapshot as Snowflake + Trino — consistent reads
    let snapshot_info = spark.sql(r#"
        SELECT count(*) AS n_rows, max(event_ts) AS latest_event
        FROM warehouse.customer_behavior
    "#).collect().await?;
    println!("Spark snapshot: {}", snapshot_info.num_rows());

    // Snowflake runs BI workload on same table (Snowflake worksheet):
    //   SELECT customer_id, sum(amount) AS total_spend, count(*) AS n_events
    //   FROM customer_behavior_ext  -- external Iceberg table via Polaris
    //   WHERE event_date >= '2024-09-01'
    //   GROUP BY customer_id
    //   ORDER BY total_spend DESC LIMIT 100;

    // Trino runs ad-hoc SQL on same table (Trino CLI):
    //   SELECT event_type, count(*) AS n_events,
    //          avg(session_duration) AS avg_duration
    //   FROM polaris.warehouse.customer_behavior
    //   WHERE event_date >= date '2024-09-01'
    //     AND event_type IN ('purchase', 'signup', 'login')
    //   GROUP BY event_type;

    println!("3 engines — 1 Iceberg table, 1 Polaris catalog");
    println!("All see the same snapshot — no drift");
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "polaris_federation.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"
    "os"

    iceberg "github.com/apache/iceberg-go"
    spark "github.com/apache/spark-connect-go"
)

func main() {
    ctx := context.Background()

    // Spark — ML feature engineering workload on same Iceberg table
    catalog, _ := iceberg.NewRestCatalog(ctx, iceberg.RestConfig{
        URI:        "https://polaris.moderndatascieng.com/api/catalog",
        Credential: os.Getenv("POLARIS_CREDENTIAL"),
        Warehouse:  "s3://moderndatascieng-polaris-federation",
    })
    sparkSession, _ := spark.NewSession(ctx, catalog)

    // ML FEATURE ENGINEERING — Spark reads customer_behavior, writes features
    features, err := sparkSession.SQL(ctx, \`
        SELECT customer_id,
            sum(amount) OVER (PARTITION BY customer_id ORDER BY event_ts
                RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS spend_30d,
            count(*) OVER (PARTITION BY customer_id ORDER BY event_ts
                RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS events_30d,
            avg(session_duration) OVER (PARTITION BY customer_id ORDER BY event_ts
                RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS avg_session_30d
        FROM warehouse.customer_behavior
        WHERE event_date >= current_date() - 30
    \`)
    if err != nil { log.Fatalf("features: %v", err) }

    // Write features back to Polaris-governed Iceberg table
    _, _ = sparkSession.SQL(ctx, \`
        INSERT INTO warehouse.customer_features
        SELECT * FROM features
    \`)

    // Spark sees the SAME snapshot as Snowflake + Trino — consistent reads
    snapshotInfo, _ := sparkSession.SQL(ctx, \`
        SELECT count(*) AS n_rows, max(event_ts) AS latest_event
        FROM warehouse.customer_behavior
    \`)
    fmt.Printf("Spark snapshot: %d rows\\n", snapshotInfo.RowCount)

    // Snowflake runs BI workload on same table (Snowflake worksheet):
    //   SELECT customer_id, sum(amount) AS total_spend, count(*) AS n_events
    //   FROM customer_behavior_ext  -- external Iceberg table via Polaris
    //   WHERE event_date >= '2024-09-01'
    //   GROUP BY customer_id ORDER BY total_spend DESC LIMIT 100;

    // Trino runs ad-hoc SQL on same table (Trino CLI):
    //   SELECT event_type, count(*) AS n_events,
    //          avg(session_duration) AS avg_duration
    //   FROM polaris.warehouse.customer_behavior
    //   WHERE event_date >= date '2024-09-01'
    //     AND event_type IN ('purchase', 'signup', 'login')
    //   GROUP BY event_type;

    fmt.Println("3 engines — 1 Iceberg table, 1 Polaris catalog")
    fmt.Println("All see the same snapshot — no drift")
}`,
      },
      {
        lang: "elixir",
        filename: "polaris_federation.ex",
        code: `defmodule SnowflakePolaris.Federation do
  @moduledoc "Cross-engine federation — 1 Iceberg table, 3 engines, 1 Polaris catalog"
  @polaris_uri "https://polaris.moderndatascieng.com/api/catalog"

  def run do
    credential = System.get_env("POLARIS_CREDENTIAL")

    # Spark — ML feature engineering workload on same Iceberg table
    spark = Spark.new()
      |> Spark.config("spark.sql.catalog.polaris.catalog-impl",
                       "org.apache.iceberg.rest.RESTCatalog")
      |> Spark.config("spark.sql.catalog.polaris.uri", @polaris_uri)
      |> Spark.config("spark.sql.catalog.polaris.credential", credential)
      |> Spark.config("spark.sql.catalog.polaris.warehouse",
                      "s3://moderndatascieng-polaris-federation")

    # ML FEATURE ENGINEERING — Spark reads customer_behavior, writes features
    Spark.sql(spark, """
      SELECT customer_id,
        sum(amount) OVER (PARTITION BY customer_id ORDER BY event_ts
          RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS spend_30d,
        count(*) OVER (PARTITION BY customer_id ORDER BY event_ts
          RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS events_30d,
        avg(session_duration) OVER (PARTITION BY customer_id ORDER BY event_ts
          RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS avg_session_30d
      FROM warehouse.customer_behavior
      WHERE event_date >= current_date() - 30
    """)

    # Write features back to Polaris-governed Iceberg table
    Spark.sql(spark, """
      INSERT INTO warehouse.customer_features
      SELECT * FROM features
    """)

    # Spark sees the SAME snapshot as Snowflake + Trino — consistent reads
    Spark.sql(spark, """
      SELECT count(*) AS n_rows, max(event_ts) AS latest_event
      FROM warehouse.customer_behavior
    """)

    # Snowflake runs BI workload on same table (Snowflake worksheet):
    #   SELECT customer_id, sum(amount) AS total_spend, count(*) AS n_events
    #   FROM customer_behavior_ext  -- external Iceberg table via Polaris
    #   WHERE event_date >= '2024-09-01'
    #   GROUP BY customer_id ORDER BY total_spend DESC LIMIT 100;

    # Trino runs ad-hoc SQL on same table (Trino CLI):
    #   SELECT event_type, count(*) AS n_events,
    #          avg(session_duration) AS avg_duration
    #   FROM polaris.warehouse.customer_behavior
    #   WHERE event_date >= date '2024-09-01'
    #     AND event_type IN ('purchase', 'signup', 'login')
    #   GROUP BY event_type;

    IO.puts("3 engines — 1 Iceberg table, 1 Polaris catalog")
    IO.puts("All see the same snapshot — no drift")
    :ok
  end
end`,
      },
      {
        lang: "zig",
        filename: "polaris_federation.zig",
        code: `const std = @import("std");
const spark = @import("spark-connect-zig");
const iceberg = @import("iceberg-zig");

pub fn run(alloc: std.mem.Allocator) !void {
    const credential = std.posix.getenv("POLARIS_CREDENTIAL") orelse "";

    // Spark — ML feature engineering workload on same Iceberg table
    var catalog = try iceberg.RestCatalog.init(alloc, .{
        .uri = "https://polaris.moderndatascieng.com/api/catalog",
        .credential = credential,
        .warehouse = "s3://moderndatascieng-polaris-federation",
    });
    defer catalog.deinit();
    var session = try spark.Session.connect_catalog(&catalog);
    defer session.deinit();

    // ML FEATURE ENGINEERING — Spark reads customer_behavior, writes features
    try session.sql(
        \\SELECT customer_id,
        \\  sum(amount) OVER (PARTITION BY customer_id ORDER BY event_ts
        \\    RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS spend_30d,
        \\  count(*) OVER (PARTITION BY customer_id ORDER BY event_ts
        \\    RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS events_30d,
        \\  avg(session_duration) OVER (PARTITION BY customer_id ORDER BY event_ts
        \\    RANGE BETWEEN INTERVAL 30 DAYS PRECEDING AND CURRENT ROW) AS avg_session_30d
        \\FROM warehouse.customer_behavior
        \\WHERE event_date >= current_date() - 30
    );

    // Write features back to Polaris-governed Iceberg table
    try session.sql(
        \\INSERT INTO warehouse.customer_features
        \\SELECT * FROM features
    );

    // Spark sees the SAME snapshot as Snowflake + Trino — consistent reads
    try session.sql(
        \\SELECT count(*) AS n_rows, max(event_ts) AS latest_event
        \\FROM warehouse.customer_behavior
    );

    // Snowflake runs BI workload on same table (Snowflake worksheet):
    //   SELECT customer_id, sum(amount) AS total_spend, count(*) AS n_events
    //   FROM customer_behavior_ext  -- external Iceberg table via Polaris
    //   WHERE event_date >= '2024-09-01'
    //   GROUP BY customer_id ORDER BY total_spend DESC LIMIT 100;

    // Trino runs ad-hoc SQL on same table (Trino CLI):
    //   SELECT event_type, count(*) AS n_events,
    //          avg(session_duration) AS avg_duration
    //   FROM polaris.warehouse.customer_behavior
    //   WHERE event_date >= date '2024-09-01'
    //     AND event_type IN ('purchase', 'signup', 'login')
    //   GROUP BY event_type;

    std.debug.print("3 engines — 1 Iceberg table, 1 Polaris catalog\\n", .{});
    std.debug.print("All see the same snapshot — no drift\\n", .{});
}`,
      },
    ],
    runnablePython: `# Cross-engine federation — 1TB, 3 engines, same Iceberg table
import random
from collections import defaultdict

random.seed(42)
print("=== Snowflake Polaris cross-engine federation ===")
print("Scale: 1TB · 3 engines (Snowflake + Spark + Trino) · 3 workloads\\n")

# 3 engines, 3 workloads on same 1TB Iceberg table
workloads = [
    {"engine": "Snowflake", "team": "BI",       "queries_per_day": 800,
     "avg_latency_s": 5,   "workload": "aggregation dashboards"},
    {"engine": "Spark",     "team": "ML",        "jobs_per_day": 12,
     "avg_latency_s": 600, "workload": "feature engineering + ML training"},
    {"engine": "Trino",     "team": "Analytics", "queries_per_day": 2500,
     "avg_latency_s": 8,   "workload": "ad-hoc SQL exploration"},
]

# Single Polaris catalog snapshot — all engines see the same data
snapshot_id = "snap_92847"
print(f"Shared Polaris snapshot: {snapshot_id}")
print(f"Engines reading this snapshot (consistent reads):")
for w in workloads:
    print(f"  {w['engine']:12s} ({w['team']:10s}): {w['queries_per_day']:>5,} "
          f"queries/day, avg {w['avg_latency_s']}s, "
          f"workload: {w['workload']}")

# Consistency check — same count from all 3 engines
print(f"\\n=== Consistency check — same Iceberg snapshot ===")
# Snowflake
sf_count = random.randint(998_000_000, 1_002_000_000)  # ~1B rows
print(f"  Snowflake: SELECT count(*) -> {sf_count:,} rows")
# Spark (running ML job in parallel)
spark_count = sf_count  # SAME snapshot — consistent
print(f"  Spark:     SELECT count(*) -> {spark_count:,} rows (same snapshot)")
# Trino (analyst ad-hoc)
trino_count = sf_count
print(f"  Trino:     SELECT count(*) -> {trino_count:,} rows (same snapshot)")
print(f"  Drift: 0 (all reading snapshot {snapshot_id})")

# Counterfactual — without Polaris (3 copies of data)
print(f"\\n=== Counterfactual: without Polaris (3 copies) ===")
copies = []
for w in workloads:
    # Each engine's copy drifts independently due to different refresh schedules
    drift = random.randint(-5000, 5000)
    copies.append(sf_count + drift)
    print(f"  {w['engine']:12s} copy: {sf_count + drift:,} rows "
          f"(drift: {drift:+,})")
print(f"  Storage: 3TB total (3 copies of 1TB)")
print(f"  Cost: 3x S3 storage, 3x RBAC policies, 3x audit logs")
print(f"  Reconciliation: 3-way diff every night (bespoke job)")

# Per-engine workload detail
print(f"\\n=== Per-engine workload detail ===")
for w in workloads:
    print(f"\\n{w['engine']} ({w['team']} team) — {w['workload']}:")
    n_q = w["queries_per_day"]
    avg_l = w["avg_latency_s"]
    total_compute_s = n_q * avg_l
    print(f"  Queries/day: {n_q:,}")
    print(f"  Avg latency: {avg_l_s}s" if False else f"  Avg latency: {avg_l}s")
    print(f"  Total compute: {total_compute_s:,}s ({total_compute_s/3600:.1f}h)")

# Cross-engine snapshot guarantee — Iceberg's atomic snapshot
print(f"\\n=== Iceberg snapshot atomicity ===")
print(f"  Spark INSERT commits at T=10:30:00 -> new snapshot {snapshot_id}")
print(f"  Snowflake query starts at T=10:30:01 -> reads {snapshot_id} (consistent)")
print(f"  Trino query starts at T=10:30:02   -> reads {snapshot_id} (consistent)")
print(f"  Snapshot isolation: each query sees a consistent snapshot")
print(f"  No torn reads, no partial visibility")

# Storage + governance cost — Polaris vs 3 copies
print(f"\\n=== Storage + governance cost (1TB, 1 year) ===")
s3_cost_1tb = 0.023 * 12  # $0.023/GB/mo * 12 mo
print(f"  Polaris (1 copy): \${s3_cost_1tb*1000:.0f}/year storage")
print(f"                   1 RBAC policy, 1 audit log")
print(f"  3 copies:        \${s3_cost_1tb*1000*3:.0f}/year storage")
print(f"                   3 RBAC policies, 3 audit logs, reconciliation job")
print(f"  Savings:          \${s3_cost_1tb*1000*2:.0f}/year + zero reconciliation overhead")
print(f"\\nKey insight: cross-engine federation is the killer feature of the")
print(f"open lakehouse. Different teams use different compute engines")
print(f"(Snowflake for BI, Spark for ML, Trino for ad-hoc SQL) but read")
print(f"the SAME Iceberg tables through one Polaris catalog. Single")
print(f"snapshot — consistent reads, zero drift, atomic visibility.")
print(f"Storage ×1, governance ×1, audit ×1. This is structurally")
print(f"impossible with vendor-locked catalogs (Glue=AWS, Unity=Databricks).")`,
    insight: "Cross-engine federation is the killer feature of the open lakehouse — different teams use different compute engines (Snowflake for BI dashboards, Spark for ML feature engineering, Trino for ad-hoc SQL) but read the SAME Iceberg tables through one Polaris catalog. Single snapshot — consistent reads, zero drift, atomic visibility (Spark INSERT at T=10:30:00 → Snowflake query at T=10:30:01 reads the new snapshot — no torn reads). Without an open catalog, each engine would have its own copy of the data: storage ×3, RBAC policies ×3, audit logs ×3, plus a nightly 3-way reconciliation job to detect drift. With Polaris: storage ×1, governance ×1, audit ×1. Structurally impossible with vendor-locked catalogs (Glue=AWS, Unity=Databricks).",
  },
];

// ============================================================
// AWS LAKE FORMATION — 3 dataset examples (governance)
// ============================================================

export const AWS_LAKE_FORMATION_EXAMPLES: DatasetExample[] = [
  {
    id: "aws-lf-multi-account-governance",
    step: "1",
    title: "Multi-account governance (3 accounts, 10TB)",
    subtitle: "Synthetic — cross-account LF grants",
    accent: "oklch(0.62 0.18 200)",
    icon: <Building2 className="h-4 w-4" />,
    badge: "Synthetic 3-account 10TB",
    brief: {
      dataset: "Synthetic: 10TB of customer data across 3 AWS accounts (production, analytics, sandbox). Lake Formation governs cross-account access — production account owns data, analytics + sandbox accounts read via LF cross-account grants.",
      scale: "~10TB · 3 AWS accounts · ~200 LF-tagged tables · ~50 IAM principals · cross-account grants with STS AssumeRole",
      why: "Multi-account is the AWS-recommended pattern (one account per environment, blast radius isolation). Lake Formation extends IAM to data — grants SELECT on tables/columns to principals in OTHER accounts via STS AssumeRole. Without LF, cross-account S3 access requires S3 bucket policies (hard to debug, prone to over-grant). LF centralises data access in one governance plane.",
    },
    stats: [
      { label: "Total size", value: "10TB" },
      { label: "AWS accounts", value: "3" },
      { label: "LF-tagged tables", value: "~200" },
      { label: "Principals", value: "~50" },
    ],
    tools: ["AWS Lake Formation", "AWS IAM + STS AssumeRole", "Glue Data Catalog", "S3 cross-account bucket policies", "CloudTrail audit", "Athena (federated query)"],
    codeTabs: [
      {
        lang: "scala",
        filename: "AwsLfMultiAccount.scala",
        code: `import software.amazon.awssdk.services.lakeformation.LakeFormationClient
import software.amazon.awssdk.services.lakeformation.model._
import software.amazon.awssdk.services.sts.StsClient
import scala.jdk.CollectionConverters._

// Lake Formation multi-account governance
// Production account (111111111111) owns data; analytics + sandbox accounts read
val lfClient = LakeFormationClient.builder().region(Region.US_EAST_1).build()
val stsClient = StsClient.builder().region(Region.US_EAST_1).build()

// 1. REGISTER S3 LOCATION in Lake Formation (production account)
lfClient.registerResource(RegisterResourceRequest.builder()
  .resourceArn("arn:aws:s3:::moderndatascieng-prod-warehouse")
  .useServiceLinkedRole(true)
  .build())

// 2. LF-TAG the production tables (governance via tags, not resource paths)
lfClient.addLFTagsToResource(AddLFTagsToResourceRequest.builder()
  .resource(DatabaseResource.builder().name("warehouse").build())
  .lFTags(
    LFTagPair.builder().catalogId("111111111111").tagKey("env").tagValues("prod").build(),
    LFTagPair.builder().catalogId("111111111111").tagKey("tier").tagValues("sensitive").build(),
    LFTagPair.builder().catalogId("111111111111").tagKey("domain").tagValues("customer").build(),
  ).asJava
  .build())

// 3. CROSS-ACCOUNT GRANT — analytics account (222222222222) reads
// Lake Formation uses STS AssumeRole to delegate access
lfClient.grantPermissions(GrantPermissionsRequest.builder()
  .principal(PrincipalResource.builder()
    .principal(Principal.builder()
      .dataLakePrincipalIdentifier("arn:aws:iam::222222222222:role/analytics-lf-reader")
      .build())
    .build())
  .resource(LFTagResource.builder()
    .catalogId("111111111111")
    .tagKey("env").tagValues("prod").build())
  .permissions(Permission.SELECT, Permission.DESCRIPTION)  // grant read on prod-tagged
  .permissionsWithGrantOption(java.util.List.of())
  .build())

// 4. ANALYTICS ACCOUNT assumes role + queries via Athena
// In analytics account (run in Spark or Athena):
//   AssumeRole on arn:aws:iam::111111111111:role/cross-account-lf-reader
//   Then: SELECT * FROM warehouse.customer_events WHERE event_date = '2024-09-25'
//   Athena uses LF grant to read S3 — no direct S3 bucket policy needed

// 5. SANDBOX ACCOUNT (333333333333) gets SELECT on non-sensitive tier only
lfClient.grantPermissions(GrantPermissionsRequest.builder()
  .principal(PrincipalResource.builder()
    .principal(Principal.builder()
      .dataLakePrincipalIdentifier("arn:aws:iam::333333333333:role/sandbox-lf-reader")
      .build())
    .build())
  .resource(LFTagResource.builder()
    .catalogId("111111111111")
    .tagKey("tier").tagValues("non-sensitive").build())  // non-sensitive tier only
  .permissions(Permission.SELECT)
  .build())

// 6. AUDIT — CloudTrail logs every LF grant + access
// Production account CloudTrail:
//   eventSource: lakeformation.amazonaws.com
//   eventName:   GrantPermissions | GetResourceLFTags | GetDataAccess
//   userIdentity.arn: who granted/accessed
//   resourceARN: which table/S3 path`,
      },
      {
        lang: "rust",
        filename: "aws_lf_multi_account.rs",
        code: `use aws_sdk_lakeformation::model::*;
use aws_sdk_sts::Client as StsClient;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let lf = aws_sdk_lakeformation::Client::new(&Default::default());
    let sts = StsClient::new(&Default::default());

    // 1. REGISTER S3 location in Lake Formation (production account)
    lf.register_resource()
        .resource_arn("arn:aws:s3:::moderndatascieng-prod-warehouse")
        .use_service_linked_role(true)
        .send()
        .await?;

    // 2. LF-TAG the production tables (governance via tags, not paths)
    lf.add_lf_tags_to_resource()
        .resource(DatabaseResource::builder().name("warehouse").build())
        .lf_tags(
            LFTagPair::builder()
                .catalog_id("111111111111")
                .tag_key("env").tag_values("prod").build(),
            LFTagPair::builder()
                .catalog_id("111111111111")
                .tag_key("tier").tag_values("sensitive").build(),
            LFTagPair::builder()
                .catalog_id("111111111111")
                .tag_key("domain").tag_values("customer").build(),
        )
        .send()
        .await?;

    // 3. CROSS-ACCOUNT GRANT — analytics account (222222222222) reads
    lf.grant_permissions()
        .principal(Principal::builder()
            .data_lake_principal_identifier(
                "arn:aws:iam::222222222222:role/analytics-lf-reader")
            .build())
        .resource(LFTagResource::builder()
            .catalog_id("111111111111")
            .tag_key("env").tag_values("prod").build())
        .permissions(Permission::Select)
        .send()
        .await?;

    // 4. ANALYTICS ACCOUNT assumes role + queries via Athena
    // AssumeRole on arn:aws:iam::111111111111:role/cross-account-lf-reader
    // Then: SELECT * FROM warehouse.customer_events
    // Athena uses LF grant to read S3 — no direct S3 bucket policy needed

    // 5. SANDBOX ACCOUNT (333333333333) gets SELECT on non-sensitive tier only
    lf.grant_permissions()
        .principal(Principal::builder()
            .data_lake_principal_identifier(
                "arn:aws:iam::333333333333:role/sandbox-lf-reader")
            .build())
        .resource(LFTagResource::builder()
            .catalog_id("111111111111")
            .tag_key("tier").tag_values("non-sensitive").build())  // non-sensitive only
        .permissions(Permission::Select)
        .send()
        .await?;

    // 6. AUDIT — CloudTrail logs every LF grant + access
    // Production account CloudTrail:
    //   eventSource: lakeformation.amazonaws.com
    //   eventName: GrantPermissions | GetResourceLFTags | GetDataAccess
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "aws_lf_multi_account.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"

    "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/config"
    lf "github.com/aws/aws-sdk-go-v2/service/lakeformation"
    lftypes "github.com/aws/aws-sdk-go-v2/service/lakeformation/types"
)

func main() {
    ctx := context.Background()
    cfg, _ := config.LoadDefaultConfig(ctx)
    lfClient := lf.NewFromConfig(cfg)

    // 1. REGISTER S3 location in Lake Formation
    _, err := lfClient.RegisterResource(ctx, &lf.RegisterResourceInput{
        ResourceArn:         aws.String("arn:aws:s3:::moderndatascieng-prod-warehouse"),
        UseServiceLinkedRole: aws.Bool(true),
    })
    if err != nil { log.Fatalf("register: %v", err) }

    // 2. LF-TAG the production tables
    _, err = lfClient.AddLFTagsToResource(ctx, &lf.AddLFTagsToResourceInput{
        Resource: &lftypes.DatabaseResource{Name: aws.String("warehouse")},
        LFTags: []lftypes.LFTagPair{
            {CatalogId: aws.String("111111111111"),
             TagKey: aws.String("env"),  TagValues: []string{"prod"}},
            {CatalogId: aws.String("111111111111"),
             TagKey: aws.String("tier"), TagValues: []string{"sensitive"}},
            {CatalogId: aws.String("111111111111"),
             TagKey: aws.String("domain"), TagValues: []string{"customer"}},
        },
    })
    if err != nil { log.Fatalf("tag: %v", err) }

    // 3. CROSS-ACCOUNT GRANT — analytics account reads
    _, err = lfClient.GrantPermissions(ctx, &lf.GrantPermissionsInput{
        Principal: &lftypes.DataLakePrincipal{
            DataLakePrincipalIdentifier: aws.String(
                "arn:aws:iam::222222222222:role/analytics-lf-reader"),
        },
        Resource: &lftypes.Resource{
            LFTagResource: &lftypes.LFTagResource{
                CatalogId: aws.String("111111111111"),
                TagKey:    aws.String("env"),  TagValues: []string{"prod"},
            },
        },
        Permissions: []lftypes.Permission{lftypes.PermissionSelect},
    })
    if err != nil { log.Fatalf("grant analytics: %v", err) }

    // 4. ANALYTICS ACCOUNT assumes role + queries via Athena
    //   AssumeRole on arn:aws:iam::111111111111:role/cross-account-lf-reader
    //   SELECT * FROM warehouse.customer_events

    // 5. SANDBOX ACCOUNT — non-sensitive tier only
    _, err = lfClient.GrantPermissions(ctx, &lf.GrantPermissionsInput{
        Principal: &lftypes.DataLakePrincipal{
            DataLakePrincipalIdentifier: aws.String(
                "arn:aws:iam::333333333333:role/sandbox-lf-reader"),
        },
        Resource: &lftypes.Resource{
            LFTagResource: &lftypes.LFTagResource{
                CatalogId: aws.String("111111111111"),
                TagKey:    aws.String("tier"),
                TagValues: []string{"non-sensitive"},
            },
        },
        Permissions: []lftypes.Permission{lftypes.PermissionSelect},
    })
    if err != nil { log.Fatalf("grant sandbox: %v", err) }

    // 6. AUDIT — CloudTrail logs every LF grant + access
    fmt.Println("CloudTrail logs: eventSource=lakeformation.amazonaws.com")
}`,
      },
      {
        lang: "elixir",
        filename: "aws_lf_multi_account.ex",
        code: `defmodule AwsLakeFormation.MultiAccount do
  @moduledoc "Multi-account governance — 3 AWS accounts, cross-account LF grants"

  def setup do
    # 1. REGISTER S3 location in Lake Formation
    LakeFormation.register_resource(
      resource_arn: "arn:aws:s3:::moderndatascieng-prod-warehouse",
      use_service_linked_role: true
    )

    # 2. LF-TAG the production tables (governance via tags, not paths)
    LakeFormation.add_lf_tags_to_resource(
      resource: %{name: "warehouse"},
      lf_tags: [
        %{catalog_id: "111111111111", tag_key: "env",    tag_values: ["prod"]},
        %{catalog_id: "111111111111", tag_key: "tier",   tag_values: ["sensitive"]},
        %{catalog_id: "111111111111", tag_key: "domain", tag_values: ["customer"]}
      ]
    )

    # 3. CROSS-ACCOUNT GRANT — analytics account reads
    LakeFormation.grant_permissions(
      principal: "arn:aws:iam::222222222222:role/analytics-lf-reader",
      resource: %{lf_tag: %{catalog_id: "111111111111",
                            tag_key: "env", tag_values: ["prod"]}},
      permissions: [:select]
    )

    # 4. ANALYTICS ACCOUNT assumes role + queries via Athena
    #   AssumeRole on arn:aws:iam::111111111111:role/cross-account-lf-reader
    #   SELECT * FROM warehouse.customer_events WHERE event_date = '2024-09-25'

    # 5. SANDBOX ACCOUNT — non-sensitive tier only
    LakeFormation.grant_permissions(
      principal: "arn:aws:iam::333333333333:role/sandbox-lf-reader",
      resource: %{lf_tag: %{catalog_id: "111111111111",
                            tag_key: "tier", tag_values: ["non-sensitive"]}},
      permissions: [:select]
    )

    # 6. AUDIT — CloudTrail logs every LF grant + access
    IO.puts("CloudTrail logs: eventSource=lakeformation.amazonaws.com")
    :ok
  end
end`,
      },
      {
        lang: "zig",
        filename: "aws_lf_multi_account.zig",
        code: `const std = @import("std");
const lf = @import("aws-lakeformation-zig");
const sts = @import("aws-sts-zig");

pub fn setup(alloc: std.mem.Allocator) !void {
    var client = try lf.Client.init(alloc, .{ .region = "us-east-1" });
    defer client.deinit();

    // 1. REGISTER S3 location in Lake Formation
    try client.register_resource(.{
        .resource_arn = "arn:aws:s3:::moderndatascieng-prod-warehouse",
        .use_service_linked_role = true,
    });

    // 2. LF-TAG the production tables (governance via tags, not paths)
    try client.add_lf_tags_to_resource(.{
        .resource = .{ .database = .{ .name = "warehouse" } },
        .lf_tags = &[_]lf.LFTagPair{
            .{ .catalog_id = "111111111111", .tag_key = "env",
              .tag_values = &[_][]const u8{"prod"} },
            .{ .catalog_id = "111111111111", .tag_key = "tier",
              .tag_values = &[_][]const u8{"sensitive"} },
            .{ .catalog_id = "111111111111", .tag_key = "domain",
              .tag_values = &[_][]const u8{"customer"} },
        },
    });

    // 3. CROSS-ACCOUNT GRANT — analytics account (222222222222) reads
    try client.grant_permissions(.{
        .principal = "arn:aws:iam::222222222222:role/analytics-lf-reader",
        .resource = .{ .lf_tag = .{
            .catalog_id = "111111111111",
            .tag_key = "env", .tag_values = &[_][]const u8{"prod"},
        } },
        .permissions = &[_]lf.Permission{.select},
    });

    // 4. ANALYTICS ACCOUNT assumes role + queries via Athena
    //   AssumeRole on arn:aws:iam::111111111111:role/cross-account-lf-reader
    //   SELECT * FROM warehouse.customer_events

    // 5. SANDBOX ACCOUNT — non-sensitive tier only
    try client.grant_permissions(.{
        .principal = "arn:aws:iam::333333333333:role/sandbox-lf-reader",
        .resource = .{ .lf_tag = .{
            .catalog_id = "111111111111",
            .tag_key = "tier", .tag_values = &[_][]const u8{"non-sensitive"},
        } },
        .permissions = &[_]lf.Permission{.select},
    });

    // 6. AUDIT — CloudTrail logs every LF grant + access
    std.debug.print("CloudTrail logs: eventSource=lakeformation.amazonaws.com\\n", .{});
}`,
      },
    ],
    runnablePython: `# Multi-account governance — 3 AWS accounts, 10TB
import random
from collections import defaultdict

random.seed(42)
print("=== AWS Lake Formation — multi-account governance ===")
print("Scale: 10TB · 3 AWS accounts · ~200 LF-tagged tables\\n")

# 3 AWS accounts — production, analytics, sandbox
accounts = [
    {"id": "111111111111", "name": "production",
     "role": "data-owner", "data_gb": 10000,
     "tables": 200, "tier_access": "all"},
    {"id": "222222222222", "name": "analytics",
     "role": "lf-reader-prod", "data_gb": 0,
     "tables": 0, "tier_access": "prod"},
    {"id": "333333333333", "name": "sandbox",
     "role": "lf-reader-non-sensitive", "data_gb": 0,
     "tables": 0, "tier_access": "non-sensitive"},
]

print("Account topology:")
for a in accounts:
    print(f"  {a['name']:12s} ({a['id']}): role={a['role']:25s} "
          f"access={a['tier_access']}")

# LF-tag schema — env, tier, domain (governance via tags)
print(f"\\nLF-tag schema (3 tags, multiple values each):")
lf_tags = {
    "env":    ["prod", "staging", "dev"],
    "tier":   ["sensitive", "internal", "non-sensitive", "public"],
    "domain": ["customer", "finance", "ml", "ops"],
}
for tag, values in lf_tags.items():
    print(f"  {tag:8s}: {', '.join(values)}")

# Tag application — production tables tagged
print(f"\\nLF-tag application (200 production tables):")
table_tags = []
for t_idx in range(200):
    table_name = f"warehouse.table_{t_idx:03d}"
    env = "prod"
    tier = random.choice(["sensitive", "internal", "non-sensitive", "public"])
    domain = random.choice(["customer", "finance", "ml", "ops"])
    table_tags.append((table_name, env, tier, domain))
    if t_idx < 5:
        print(f"  {table_name}: env={env}, tier={tier}, domain={domain}")
print(f"  ... ({len(table_tags)-5} more)")

# Cross-account grants — LF-tag-based
print(f"\\nCross-account grants (LF-tag-based):")
grants = [
    ("arn:aws:iam::222222222222:role/analytics-lf-reader",
     "env=prod", "SELECT"),
    ("arn:aws:iam::333333333333:role/sandbox-lf-reader",
     "tier=non-sensitive", "SELECT"),
    ("arn:aws:iam::333333333333:role/sandbox-lf-reader",
     "tier=public", "SELECT"),
]
for principal, tag_filter, perm in grants:
    print(f"  GRANT {perm} ON LF_TAG({tag_filter}) TO {principal}")

# Effective access — what each account can read
print(f"\\nEffective access (account -> # tables visible):")
for a in accounts:
    if a["tier_access"] == "all":
        visible = len(table_tags)
    elif a["tier_access"] == "prod":
        visible = len(table_tags)  # all prod-tagged
    elif a["tier_access"] == "non-sensitive":
        visible = sum(1 for _, env, tier, _ in table_tags
                     if tier in ("non-sensitive", "public"))
    print(f"  {a['name']:12s}: {visible}/{len(table_tags)} tables visible "
          f"({visible/len(table_tags)*100:.0f}%)")

# STS AssumeRole — cross-account delegation
print(f"\\nSTS AssumeRole flow (analytics account -> production):")
print(f"  1. Analytics account: sts:AssumeRole on arn:aws:iam::")
print(f"     111111111111:role/cross-account-lf-reader")
print(f"  2. Returns temporary credentials (1h TTL)")
print(f"  3. Athena uses temp creds + LF grant to read S3")
print(f"  4. No direct S3 bucket policy needed (LF authorises)")

# CloudTrail audit — every LF call logged
print(f"\\nCloudTrail audit (eventSource=lakeformation.amazonaws.com):")
audit_events = []
for _ in range(15):
    event_name = random.choice(["GrantPermissions", "GetResourceLFTags",
                                "GetDataAccess", "ListPermissions"])
    principal = random.choice(["analytics-lf-reader", "sandbox-lf-reader",
                               "data-owner"])
    audit_events.append({
        "event_time": f"2024-09-25T10:{random.randint(0,59):02d}:{random.randint(0,59):02d}Z",
        "event_name": event_name,
        "principal": principal,
    })
for e in audit_events[:6]:
    print(f"  {e['event_time']} {e['event_name']:25s} {e['principal']}")
print(f"  ... ({len(audit_events)-6} more)")

# Counterfactual — without Lake Formation (raw S3 bucket policies)
print(f"\\n=== Counterfactual: without Lake Formation ===")
print(f"  S3 bucket policy (per-bucket, ~200 lines of JSON per bucket)")
print(f"  Cross-account via bucket policy (hard to debug)")
print(f"  No centralised governance — drift across buckets")
print(f"  No column-level RBAC (S3 is object-level only)")
print(f"  No LF-tag-based access (per-resource policies only)")
print(f"\\nKey insight: Lake Formation extends IAM to data — it")
print(f"centralises access control for S3-backed data lakes in one")
print(f"governance plane. LF-tags are the killer feature: tag tables")
print(f"by env/tier/domain, grant by tag (not by resource path).")
print(f"Cross-account grants use STS AssumeRole (temporary credentials,")
print(f"audited in CloudTrail). Without LF, cross-account S3 access")
print(f"requires per-bucket policies that drift over time.")`,
    insight: "Lake Formation extends IAM to data — it centralises access control for S3-backed data lakes in one governance plane. LF-tags are the killer feature: tag tables by env/tier/domain, grant by tag (not by resource path) — re-tagging a table instantly re-routes access across all principals. Cross-account grants use STS AssumeRole (temporary credentials, 1h TTL, audited in CloudTrail). Without LF, cross-account S3 access requires per-bucket JSON policies (~200 lines per bucket) that drift over time and are nearly impossible to audit comprehensively. The multi-account pattern (one AWS account per environment, blast radius isolation) is AWS-recommended; LF makes it manageable for data.",
  },
  {
    id: "aws-lf-partner-cell-level-rls",
    step: "2",
    title: "Partner data sharing (5TB, cell-level RLS)",
    subtitle: "Synthetic — cell-level RLS for partner access",
    accent: "oklch(0.62 0.18 0)",
    icon: <ShieldCheck className="h-4 w-4" />,
    badge: "Synthetic 5TB partner RLS",
    brief: {
      dataset: "Synthetic: 5TB of customer orders shared with 3 partner companies. Each partner sees only their co-sold customers' orders — Lake Formation cell-level row filters + column rules enforce 'partner_id = X' predicate on every query, and mask PII columns (email, phone).",
      scale: "~5TB · 3 partners · ~100M orders · cell-level RLS + column masking · per-partner audit trail",
      why: "Partner data sharing requires cell-level row + column RBAC — Partner A sees only rows where partner_id=A, and PII columns (email, phone) are masked. Lake Formation cell-level RLS enforces 'partner_id=X' predicate on every query, no app-layer enforcement needed. Column masking replaces email with 'a***@example.com'. Partners run Athena queries — LF grants limit visibility transparently.",
    },
    stats: [
      { label: "Total size", value: "5TB" },
      { label: "Partners", value: "3" },
      { label: "Orders", value: "~100M" },
      { label: "RLS rules", value: "3 + 2 masks" },
    ],
    tools: ["AWS Lake Formation cell-level RLS", "Lake Formation column masking", "AWS Athena (partner federated query)", "Glue Data Catalog", "S3 storage", "CloudTrail partner audit"],
    codeTabs: [
      {
        lang: "scala",
        filename: "AwsLfCellLevelRls.scala",
        code: `import software.amazon.awssdk.services.lakeformation.LakeFormationClient
import software.amazon.awssdk.services.lakeformation.model._
import scala.jdk.CollectionConverters._

// Lake Formation cell-level RLS — partner data sharing
val lf = LakeFormationClient.builder().region(Region.US_EAST_1).build()

// 1. CREATE LF-TAG for partner-tagged rows
lf.create_lf_tag(CreateLFTagRequest.builder()
  .tagKey("partner").tagValues("partner_a", "partner_b", "partner_c").build())

// 2. TAG COLUMNS for masking (PII)
lf.add_lf_tags_to_resource(AddLFTagsToResourceRequest.builder()
  .resource(ColumnResource.builder()
    .catalogId("111111111111")
    .databaseName("warehouse").tableName("orders").name("email")
    .build())
  .lFTags(LFTagPair.builder()
    .catalogId("111111111111")
    .tagKey("pii").tagValues("mask").build()).asJava
  .build())
lf.add_lf_tags_to_resource(AddLFTagsToResourceRequest.builder()
  .resource(ColumnResource.builder()
    .catalogId("111111111111")
    .databaseName("warehouse").tableName("orders").name("phone")
    .build())
  .lFTags(LFTagPair.builder()
    .catalogId("111111111111")
    .tagKey("pii").tagValues("mask").build()).asJava
  .build())

// 3. CELL-LEVEL RLS — row filter expression per partner principal
// Partner A sees only rows where partner_id = 'partner_a'
lf.create_data_cells_filter(CreateDataCellsFilterRequest.builder()
  .dataCellsFilter(DataCellsFilter.builder()
    .tableCatalogId("111111111111")
    .databaseName("warehouse")
    .tableName("orders")
    .name("partner_a_filter")
    .rowFilter(RowFilter.builder()
      .filterExpression("partner_id = 'partner_a'")  // enforced at query time
      .build())
    .columnWildcards(ColumnWildcard.builder().excludedColumnNames(
      java.util.List.of("email", "phone")).build())  // mask PII for partner
    .build())
  .build())

// Same for partner B + C
lf.create_data_cells_filter(CreateDataCellsFilterRequest.builder()
  .dataCellsFilter(DataCellsFilter.builder()
    .tableCatalogId("111111111111")
    .databaseName("warehouse").tableName("orders").name("partner_b_filter")
    .rowFilter(RowFilter.builder().filterExpression("partner_id = 'partner_b'").build())
    .columnWildcards(ColumnWildcard.builder()
      .excludedColumnNames(java.util.List.of("email", "phone")).build())
    .build())
  .build())

// 4. GRANT partners access to their filtered view
lf.grant_permissions(GrantPermissionsRequest.builder()
  .principal(PrincipalResource.builder()
    .principal(Principal.builder()
      .dataLakePrincipalIdentifier("arn:aws:iam::444444444444:role/partner_a")
      .build()).build())
  .resource(DataCellsFilterResource.builder()
    .tableCatalogId("111111111111")
    .databaseName("warehouse").tableName("orders")
    .name("partner_a_filter").build())
  .permissions(Permission.SELECT)
  .build())

// 5. PARTNER A runs Athena query — LF enforces row + column rules
// (In partner A's Athena):
//   SELECT order_id, customer_id, amount, email, phone
//   FROM warehouse.orders
//   WHERE order_date >= '2024-09-01';
//
//   LF rewrites to:
//   SELECT order_id, customer_id, amount,
//          '***' AS email, '***' AS phone   -- masked
//   FROM warehouse.orders
//   WHERE order_date >= '2024-09-01'
//     AND partner_id = 'partner_a'           -- row filter enforced
//
//   Partner sees only their co-sold orders, PII masked`,
      },
      {
        lang: "rust",
        filename: "aws_lf_cell_level_rls.rs",
        code: `use aws_sdk_lakeformation::model::*;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let lf = aws_sdk_lakeformation::Client::new(&Default::default());

    // 1. CREATE LF-TAG for partner-tagged rows
    lf.create_lf_tag()
        .tag_key("partner")
        .tag_values("partner_a", "partner_b", "partner_c")
        .send()
        .await?;

    // 2. TAG COLUMNS for masking (PII)
    lf.add_lf_tags_to_resource()
        .resource(ColumnResource::builder()
            .catalog_id("111111111111")
            .database_name("warehouse").table_name("orders").name("email")
            .build())
        .lf_tags(LFTagPair::builder()
            .catalog_id("111111111111")
            .tag_key("pii").tag_values("mask").build())
        .send()
        .await?;
    lf.add_lf_tags_to_resource()
        .resource(ColumnResource::builder()
            .catalog_id("111111111111")
            .database_name("warehouse").table_name("orders").name("phone")
            .build())
        .lf_tags(LFTagPair::builder()
            .catalog_id("111111111111")
            .tag_key("pii").tag_values("mask").build())
        .send()
        .await?;

    // 3. CELL-LEVEL RLS — row filter expression per partner principal
    lf.create_data_cells_filter()
        .data_cells_filter(DataCellsFilter::builder()
            .table_catalog_id("111111111111")
            .database_name("warehouse")
            .table_name("orders")
            .name("partner_a_filter")
            .row_filter(RowFilter::builder()
                .filter_expression("partner_id = 'partner_a'")  // enforced at query time
                .build())
            .column_wildcards(ColumnWildcard::builder()
                .excluded_column_names("email", "phone").build())  // mask PII
            .build())
        .send()
        .await?;

    // Same for partner B + C
    lf.create_data_cells_filter()
        .data_cells_filter(DataCellsFilter::builder()
            .table_catalog_id("111111111111")
            .database_name("warehouse").table_name("orders")
            .name("partner_b_filter")
            .row_filter(RowFilter::builder()
                .filter_expression("partner_id = 'partner_b'").build())
            .column_wildcards(ColumnWildcard::builder()
                .excluded_column_names("email", "phone").build())
            .build())
        .send()
        .await?;

    // 4. GRANT partners access to their filtered view
    lf.grant_permissions()
        .principal(Principal::builder()
            .data_lake_principal_identifier(
                "arn:aws:iam::444444444444:role/partner_a")
            .build())
        .resource(DataCellsFilterResource::builder()
            .table_catalog_id("111111111111")
            .database_name("warehouse").table_name("orders")
            .name("partner_a_filter").build())
        .permissions(Permission::Select)
        .send()
        .await?;

    // 5. PARTNER A runs Athena query — LF enforces row + column rules
    // LF rewrites SELECT to add: AND partner_id = 'partner_a' (row filter)
    // And masks email + phone columns
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "aws_lf_cell_level_rls.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"

    "github.com/aws/aws-sdk-go-v2/aws"
    lf "github.com/aws/aws-sdk-go-v2/service/lakeformation"
    lftypes "github.com/aws/aws-sdk-go-v2/service/lakeformation/types"
)

func main() {
    ctx := context.Background()
    lfClient := lf.New(lf.Options{})

    // 1. CREATE LF-TAG for partner-tagged rows
    _, err := lfClient.CreateLFTag(ctx, &lf.CreateLFTagInput{
        CatalogId: aws.String("111111111111"),
        TagKey:    aws.String("partner"),
        TagValues: []string{"partner_a", "partner_b", "partner_c"},
    })
    if err != nil { log.Fatalf("lf-tag: %v", err) }

    // 2. TAG COLUMNS for masking (PII) — email + phone
    for _, col := range []string{"email", "phone"} {
        _, err := lfClient.AddLFTagsToResource(ctx, &lf.AddLFTagsToResourceInput{
            Resource: &lftypes.Resource{
                ColumnResource: &lftypes.ColumnResource{
                    CatalogId:   aws.String("111111111111"),
                    DatabaseName: aws.String("warehouse"),
                    TableName:    aws.String("orders"),
                    Name:         aws.String(col),
                },
            },
            LFTags: []lftypes.LFTagPair{{
                CatalogId: aws.String("111111111111"),
                TagKey:    aws.String("pii"), TagValues: []string{"mask"},
            }},
        })
        if err != nil { log.Fatalf("tag col %s: %v", col, err) }
    }

    // 3. CELL-LEVEL RLS — row filter expression per partner principal
    for partner, filterName := range map[string]string{
        "partner_a": "partner_a_filter",
        "partner_b": "partner_b_filter",
        "partner_c": "partner_c_filter",
    } {
        _, err := lfClient.CreateDataCellsFilter(ctx, &lf.CreateDataCellsFilterInput{
            DataCellsFilter: &lftypes.DataCellsFilter{
                TableCatalogId: aws.String("111111111111"),
                DatabaseName:   aws.String("warehouse"),
                TableName:      aws.String("orders"),
                Name:           aws.String(filterName),
                RowFilter: &lftypes.RowFilter{
                    FilterExpression: aws.String(
                        fmt.Sprintf("partner_id = '%s'", partner)),
                },
                ColumnWildcards: []lftypes.ColumnWildcard{{
                    ExcludedColumnNames: []string{"email", "phone"},  // mask PII
                }},
            },
        })
        if err != nil { log.Fatalf("filter %s: %v", partner, err) }
    }

    // 4. GRANT partners access to their filtered view
    _, err = lfClient.GrantPermissions(ctx, &lf.GrantPermissionsInput{
        Principal: &lftypes.DataLakePrincipal{
            DataLakePrincipalIdentifier: aws.String(
                "arn:aws:iam::444444444444:role/partner_a"),
        },
        Resource: &lftypes.Resource{
            DataCellsFilterResource: &lftypes.DataCellsFilterResource{
                TableCatalogId: aws.String("111111111111"),
                DatabaseName:   aws.String("warehouse"),
                TableName:      aws.String("orders"),
                Name:           aws.String("partner_a_filter"),
            },
        },
        Permissions: []lftypes.Permission{lftypes.PermissionSelect},
    })
    if err != nil { log.Fatalf("grant: %v", err) }

    // 5. PARTNER A runs Athena — LF enforces row + column rules
    // LF rewrites: SELECT * FROM orders -> AND partner_id='partner_a'
    //              email column -> '***', phone column -> '***'
    fmt.Println("Partner A queries via Athena — LF enforces cell-level RLS")
}`,
      },
      {
        lang: "elixir",
        filename: "aws_lf_cell_level_rls.ex",
        code: `defmodule AwsLakeFormation.CellLevelRls do
  @moduledoc "Partner data sharing — cell-level row filters + column masking"

  def setup do
    # 1. CREATE LF-TAG for partner-tagged rows
    LakeFormation.create_lf_tag(
      tag_key: "partner",
      tag_values: ["partner_a", "partner_b", "partner_c"]
    )

    # 2. TAG COLUMNS for masking (PII) — email + phone
    Enum.each(["email", "phone"], fn col ->
      LakeFormation.add_lf_tags_to_resource(
        resource: %{column: %{catalog_id: "111111111111",
                              database: "warehouse", table: "orders",
                              name: col}},
        lf_tags: [%{catalog_id: "111111111111",
                    tag_key: "pii", tag_values: ["mask"]}]
      )
    end)

    # 3. CELL-LEVEL RLS — row filter expression per partner principal
    Enum.each(["partner_a", "partner_b", "partner_c"], fn partner ->
      LakeFormation.create_data_cells_filter(
        filter: %{
          table_catalog_id: "111111111111",
          database: "warehouse", table: "orders",
          name: "#{partner}_filter",
          row_filter: "partner_id = '#{partner}'",  # enforced at query time
          column_wildcard: %{excluded: ["email", "phone"]}  # mask PII
        }
      )
    end)

    # 4. GRANT partners access to their filtered view
    LakeFormation.grant_permissions(
      principal: "arn:aws:iam::444444444444:role/partner_a",
      resource: %{data_cells_filter: %{
        table_catalog_id: "111111111111",
        database: "warehouse", table: "orders",
        name: "partner_a_filter"
      }},
      permissions: [:select]
    )

    # 5. PARTNER A runs Athena — LF enforces row + column rules
    # LF rewrites: SELECT * FROM orders -> AND partner_id='partner_a'
    #              email column -> '***', phone column -> '***'
    IO.puts("Partner A queries via Athena — LF enforces cell-level RLS")
    :ok
  end
end`,
      },
      {
        lang: "zig",
        filename: "aws_lf_cell_level_rls.zig",
        code: `const std = @import("std");
const lf = @import("aws-lakeformation-zig");

pub fn setup(alloc: std.mem.Allocator) !void {
    var client = try lf.Client.init(alloc, .{ .region = "us-east-1" });
    defer client.deinit();

    // 1. CREATE LF-TAG for partner-tagged rows
    try client.create_lf_tag(.{
        .tag_key = "partner",
        .tag_values = &[_][]const u8{ "partner_a", "partner_b", "partner_c" },
    });

    // 2. TAG COLUMNS for masking (PII) — email + phone
    const pii_cols = [_][]const u8{ "email", "phone" };
    for (pii_cols) |col| {
        try client.add_lf_tags_to_resource(.{
            .resource = .{ .column = .{
                .catalog_id = "111111111111",
                .database = "warehouse", .table = "orders",
                .name = col,
            } },
            .lf_tags = &[_]lf.LFTagPair{.{
                .catalog_id = "111111111111",
                .tag_key = "pii", .tag_values = &[_][]const u8{"mask"},
            }},
        });
    }

    // 3. CELL-LEVEL RLS — row filter expression per partner principal
    const partners = [_][]const u8{ "partner_a", "partner_b", "partner_c" };
    for (partners) |partner| {
        const filter_name = try std.fmt.allocPrint(alloc, "{s}_filter", .{partner});
        defer alloc.free(filter_name);
        const expr = try std.fmt.allocPrint(alloc,
            "partner_id = '{s}'", .{partner});
        defer alloc.free(expr);
        try client.create_data_cells_filter(.{
            .filter = .{
                .table_catalog_id = "111111111111",
                .database = "warehouse", .table = "orders",
                .name = filter_name,
                .row_filter = expr,  // enforced at query time
                .column_wildcard = .{ .excluded = &[_][]const u8{ "email", "phone" } },
            },
        });
    }

    // 4. GRANT partners access to their filtered view
    try client.grant_permissions(.{
        .principal = "arn:aws:iam::444444444444:role/partner_a",
        .resource = .{ .data_cells_filter = .{
            .table_catalog_id = "111111111111",
            .database = "warehouse", .table = "orders",
            .name = "partner_a_filter",
        } },
        .permissions = &[_]lf.Permission{.select},
    });

    // 5. PARTNER A runs Athena — LF enforces row + column rules
    // LF rewrites: SELECT * FROM orders -> AND partner_id='partner_a'
    //              email column -> '***', phone column -> '***'
    std.debug.print("Partner A queries via Athena — LF enforces cell-level RLS\\n", .{});
}`,
      },
    ],
    runnablePython: `# AWS Lake Formation cell-level RLS — partner data sharing
import random
from collections import defaultdict

random.seed(42)
print("=== AWS Lake Formation — cell-level RLS for partner sharing ===")
print("Scale: 5TB · 3 partners · ~100M orders · cell-level RLS + masking\\n")

# 3 partners — each co-sold with us on different customer segments
partners = [
    {"id": "partner_a", "name": "Acme Corp",   "customers_shared": 25_000},
    {"id": "partner_b", "name": "Globex Inc",  "customers_shared": 18_000},
    {"id": "partner_c", "name": "Initech LLC", "customers_shared": 32_000},
]
total_orders = 100_000_000

# Order distribution — each order tagged with partner_id
print("Order distribution by partner:")
total_shared = 0
for p in partners:
    n_orders = int(total_orders * p["customers_shared"] /
                   sum(x["customers_shared"] for x in partners))
    p["orders"] = n_orders
    total_shared += n_orders
    print(f"  {p['id']:12s} ({p['name']:14s}): "
          f"{p['customers_shared']:>6,} customers, "
          f"{n_orders:>10,} orders")
print(f"  {'internal':12s} ({'our-only':14s}): "
      f"{total_orders - total_shared:>10,} orders (not shared with any partner)")

# Cell-level RLS — each partner sees only their tagged rows
print(f"\\nCell-level RLS enforcement (LF rewrite at query time):")
print(f"  Partner A query: SELECT * FROM warehouse.orders")
print(f"  LF rewrites to: SELECT order_id, customer_id, amount,")
print(f"                  '***' AS email, '***' AS phone,")
print(f"                  partner_id, order_date")
print(f"                  FROM warehouse.orders")
print(f"                  WHERE partner_id = 'partner_a'  -- row filter")
print(f"                  -- email + phone masked         -- column mask")

# Simulate what each partner sees when they query
print(f"\\nPartner visibility (each runs: SELECT count(*)):")
for p in partners:
    print(f"  {p['id']:12s}: sees {p['orders']:,} orders "
          f"({p['orders']/total_orders*100:.1f}% of total)")

# Column masking — PII columns replaced
print(f"\\nColumn masking (LF ColumnWildcard excluded):")
pii_cols = ["email", "phone", "ssn", "credit_card", "address"]
for col in pii_cols:
    masked = col[0] + "***" + ("@" if "email" in col else "")
    print(f"  {col:15s} -> '{masked}'")

# Audit trail — every partner query logged in CloudTrail
print(f"\\nCloudTrail audit (every partner query logged):")
audit_events = []
for p in partners:
    for _ in range(5):
        audit_events.append({
            "time": f"2024-09-25T{random.randint(0,23):02d}:{random.randint(0,59):02d}:{random.randint(0,59):02d}Z",
            "principal": f"arn:aws:iam::444444444444:role/{p['id']}",
            "query": "SELECT * FROM warehouse.orders",
            "rows_returned": p["orders"],
            "rls_filter": f"partner_id = '{p['id']}'",
            "masked_cols": "email, phone",
        })
for e in audit_events[:5]:
    print(f"  {e['time']} {e['principal']:50s} "
          f"-> {e['rows_returned']:,} rows (filter: {e['rls_filter']})")
print(f"  ... ({len(audit_events)-5} more)")

# Counterfactual — without LF cell-level RLS
print(f"\\n=== Counterfactual: without LF cell-level RLS ===")
print(f"  App-layer enforcement (each partner app filters rows)")
print(f"    - Bug in app code -> partner sees wrong rows (data breach)")
print(f"    - Hard to audit (no central policy)")
print(f"    - Per-partner bespoke code (~500 LOC each)")
print(f"  S3 bucket policy (per-bucket, no row-level)")
print(f"    - Cannot enforce partner_id filter (S3 is object-level)")
print(f"    - Would have to write 3 separate copies of orders")
print(f"    - 15TB total storage (3x duplication)")
print(f"  LF cell-level RLS:")
print(f"    - 1 copy of data (5TB)")
print(f"    - 1 governance plane (LF)")
print(f"    - 3 row filters + 2 column masks (declared, not coded)")
print(f"    - Audited in CloudTrail (every query)")
print(f"\\nKey insight: Lake Formation cell-level RLS is the only")
print(f"AWS-native way to share data with partners at row + column")
print(f"granularity. LF rewrites the partner's SQL at query time:")
print(f"appends AND partner_id='X' (row filter) + masks email/phone")
print(f"(column mask). 1 copy of data, 1 governance plane, 1 audit log.")
print(f"Without LF: app-layer enforcement (bug-prone) or 3x data duplication.")`,
    insight: "Lake Formation cell-level RLS is the only AWS-native way to share data with partners at row + column granularity. LF rewrites the partner's SQL at query time: appends AND partner_id='X' (row filter enforced transparently — partner cannot bypass), masks email/phone columns (ColumnWildcard excluded — partner sees '***' instead of actual PII). 1 copy of data (5TB), 1 governance plane (LF), 1 audit log (CloudTrail logs every partner query with rows_returned + rls_filter applied). Without LF: app-layer enforcement (bug-prone — one bad commit leaks partner data to wrong partner) or 3× data duplication (15TB total, drift between copies, expensive). LF is the only structural answer for B2B partner data sharing on AWS.",
  },
  {
    id: "aws-lf-tags-governance",
    step: "3",
    title: "LF-tags governance (100 tables, tag-based policy)",
    subtitle: "Synthetic — tag-based policy enforcement",
    accent: "oklch(0.62 0.18 145)",
    icon: <Lock className="h-4 w-4" />,
    badge: "Synthetic 100-table LF-tags",
    brief: {
      dataset: "Synthetic: 100 tables governed by LF-tags (env, tier, domain, pii). Re-tagging a table from tier=sensitive to tier=public instantly re-routes access across all 50 principals — no per-resource grants to update. Tag-based policy is the only scalable governance pattern at 100+ tables.",
      scale: "~100 tables · 4 LF-tag dimensions (env/tier/domain/pii) · ~50 principals · instant re-routing on re-tag · 100% policy compliance enforced at query time",
      why: "At 100+ tables, per-resource grants (GRANT SELECT ON table_1, table_2, ... table_100) don't scale — adding a new table means 50 grants. LF-tags invert this: tag tables by dimensions, grant by tag. Re-tagging instantly re-routes access across all principals. New table inherits existing grants by being tagged. This is the only scalable governance pattern for 100+ tables.",
    },
    stats: [
      { label: "Tables", value: "~100" },
      { label: "LF-tag dims", value: "4" },
      { label: "Principals", value: "~50" },
      { label: "Re-route time", value: "<1s" },
    ],
    tools: ["AWS Lake Formation LFTags", "AWS IAM", "Glue Data Catalog", "Athena (query)", "CloudTrail audit", "AWS Lambda (auto-tagger)"],
    codeTabs: [
      {
        lang: "scala",
        filename: "AwsLfTagsGovernance.scala",
        code: `import software.amazon.awssdk.services.lakeformation.LakeFormationClient
import software.amazon.awssdk.services.lakeformation.model._
import scala.jdk.CollectionConverters._

// LF-tags governance — 100 tables, 4 tag dimensions, ~50 principals
val lf = LakeFormationClient.builder().region(Region.US_EAST_1).build()

// 1. CREATE 4 LF-TAG DIMENSIONS
val tagDims = Map(
  "env"    -> List("prod", "staging", "dev"),
  "tier"   -> List("sensitive", "internal", "non-sensitive", "public"),
  "domain" -> List("customer", "finance", "ml", "ops"),
  "pii"    -> List("mask", "anonymize", "allow")
)
tagDims.foreach { case (key, values) =>
  lf.create_lf_tag(CreateLFTagRequest.builder()
    .tagKey(key).tagValues(values: _*).build())
}

// 2. AUTO-TAG 100 tables (via Glue crawler + Lambda on table-create event)
// Lambda triggers on glue:CreateTable event, applies LF-tags based on
// table name + schema patterns
for (i <- 1 to 100) {
  val tableName = s"warehouse.table_\${"%03d".format(i)}"
  val domain = if (tableName.contains("customer")) "customer"
               else if (tableName.contains("finance")) "finance"
               else "ops"
  val tier = if (tableName.contains("pii")) "sensitive" else "internal"
  val pii = if (tableName.contains("pii")) "mask" else "allow"
  lf.add_lf_tags_to_resource(AddLFTagsToResourceRequest.builder()
    .resource(TableResource.builder()
      .catalogId("111111111111")
      .databaseName("warehouse").name(tableName).build())
    .lFTags(
      LFTagPair.builder().catalogId("111111111111")
        .tagKey("env").tagValues("prod").build(),
      LFTagPair.builder().catalogId("111111111111")
        .tagKey("domain").tagValues(domain).build(),
      LFTagPair.builder().catalogId("111111111111")
        .tagKey("tier").tagValues(tier).build(),
      LFTagPair.builder().catalogId("111111111111")
        .tagKey("pii").tagValues(pii).build(),
    ).asJava
    .build())
}

// 3. GRANT PRINCIPALS by LF-tag (not by table)
// Analysts get SELECT on internal + non-sensitive + non-PII tables
lf.grant_permissions(GrantPermissionsRequest.builder()
  .principal(PrincipalResource.builder()
    .principal(Principal.builder()
      .dataLakePrincipalIdentifier("arn:aws:iam::111111111111:group/analysts")
      .build()).build())
  .resource(LFTagResource.builder()
    .catalogId("111111111111")
    .tagKey("tier").tagValues("internal", "non-sensitive", "public").build())
  .permissions(Permission.SELECT)
  .build())

// Data scientists get SELECT on ML domain + non-sensitive
lf.grant_permissions(GrantPermissionsRequest.builder()
  .principal(PrincipalResource.builder()
    .principal(Principal.builder()
      .dataLakePrincipalIdentifier("arn:aws:iam::111111111111:group/data-scientists")
      .build()).build())
  .resource(LFTagResource.builder()
    .catalogId("111111111111")
    .tagKey("domain").tagValues("ml").build())
  .permissions(Permission.SELECT)
  .build())

// 4. RE-TAG = INSTANT POLICY RE-ROUTE (no per-resource grants to update)
// Promote table_042 from staging to prod
lf.update_lf_tags_to_resource(UpdateLFTagsToResourceRequest.builder()
  .resource(TableResource.builder()
    .catalogId("111111111111")
    .databaseName("warehouse").name("table_042").build())
  .lFTagsToAdd(LFTagPair.builder()
    .catalogId("111111111111")
    .tagKey("env").tagValues("prod").build())
  .lFTagsToRemove(LFTagPair.builder()
    .catalogId("111111111111")
    .tagKey("env").tagValues("staging").build())
  .build())
// -> table_042 is now visible to all principals with env=prod grant
// -> No 50 individual GRANT statements to update`,
      },
      {
        lang: "rust",
        filename: "aws_lf_tags_governance.rs",
        code: `use aws_sdk_lakeformation::model::*;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let lf = aws_sdk_lakeformation::Client::new(&Default::default());

    // 1. CREATE 4 LF-TAG DIMENSIONS
    let tag_dims = [
        ("env",    vec!["prod", "staging", "dev"]),
        ("tier",   vec!["sensitive", "internal", "non-sensitive", "public"]),
        ("domain", vec!["customer", "finance", "ml", "ops"]),
        ("pii",    vec!["mask", "anonymize", "allow"]),
    ];
    for (key, values) in &tag_dims {
        lf.create_lf_tag()
            .tag_key(key)
            .tag_values(values.iter().copied())
            .send()
            .await?;
    }

    // 2. AUTO-TAG 100 tables (Lambda on glue:CreateTable event)
    for i in 1..=100 {
        let table_name = format!("warehouse.table_{:03}", i);
        let domain = if table_name.contains("customer") { "customer" }
                     else if table_name.contains("finance") { "finance" }
                     else { "ops" };
        let tier = if table_name.contains("pii") { "sensitive" } else { "internal" };
        let pii = if table_name.contains("pii") { "mask" } else { "allow" };

        lf.add_lf_tags_to_resource()
            .resource(TableResource::builder()
                .catalog_id("111111111111")
                .database_name("warehouse").name(&table_name).build())
            .lf_tags(
                LFTagPair::builder().catalog_id("111111111111")
                    .tag_key("env").tag_values("prod").build(),
                LFTagPair::builder().catalog_id("111111111111")
                    .tag_key("domain").tag_values(domain).build(),
                LFTagPair::builder().catalog_id("111111111111")
                    .tag_key("tier").tag_values(tier).build(),
                LFTagPair::builder().catalog_id("111111111111")
                    .tag_key("pii").tag_values(pii).build(),
            )
            .send()
            .await?;
    }

    // 3. GRANT PRINCIPALS by LF-tag (not by table)
    // Analysts get SELECT on internal + non-sensitive + non-PII tables
    lf.grant_permissions()
        .principal(Principal::builder()
            .data_lake_principal_identifier("arn:aws:iam::111111111111:group/analysts")
            .build())
        .resource(LFTagResource::builder()
            .catalog_id("111111111111")
            .tag_key("tier").tag_values("internal", "non-sensitive", "public").build())
        .permissions(Permission::Select)
        .send()
        .await?;

    // Data scientists get SELECT on ML domain
    lf.grant_permissions()
        .principal(Principal::builder()
            .data_lake_principal_identifier("arn:aws:iam::111111111111:group/data-scientists")
            .build())
        .resource(LFTagResource::builder()
            .catalog_id("111111111111")
            .tag_key("domain").tag_values("ml").build())
        .permissions(Permission::Select)
        .send()
        .await?;

    // 4. RE-TAG = INSTANT POLICY RE-ROUTE
    lf.update_lf_tags_to_resource()
        .resource(TableResource::builder()
            .catalog_id("111111111111")
            .database_name("warehouse").name("table_042").build())
        .lf_tags_to_add(LFTagPair::builder()
            .catalog_id("111111111111")
            .tag_key("env").tag_values("prod").build())
        .lf_tags_to_remove(LFTagPair::builder()
            .catalog_id("111111111111")
            .tag_key("env").tag_values("staging").build())
        .send()
        .await?;
    // -> table_042 instantly visible to all env=prod principals
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "aws_lf_tags_governance.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"

    "github.com/aws/aws-sdk-go-v2/aws"
    lf "github.com/aws/aws-sdk-go-v2/service/lakeformation"
    lftypes "github.com/aws/aws-sdk-go-v2/service/lakeformation/types"
)

func main() {
    ctx := context.Background()
    lfClient := lf.New(lf.Options{})

    // 1. CREATE 4 LF-TAG DIMENSIONS
    tagDims := map[string][]string{
        "env":    {"prod", "staging", "dev"},
        "tier":   {"sensitive", "internal", "non-sensitive", "public"},
        "domain": {"customer", "finance", "ml", "ops"},
        "pii":    {"mask", "anonymize", "allow"},
    }
    for key, values := range tagDims {
        _, err := lfClient.CreateLFTag(ctx, &lf.CreateLFTagInput{
            CatalogId: aws.String("111111111111"),
            TagKey:    aws.String(key),
            TagValues: values,
        })
        if err != nil { log.Fatalf("create tag %s: %v", key, err) }
    }

    // 2. AUTO-TAG 100 tables (Lambda on glue:CreateTable event)
    for i := 1; i <= 100; i++ {
        tableName := fmt.Sprintf("table_%03d", i)
        domain := "ops"
        if contains(tableName, "customer") { domain = "customer" }
        if contains(tableName, "finance")  { domain = "finance" }
        tier := "internal"
        if contains(tableName, "pii") { tier = "sensitive" }
        pii := "allow"
        if contains(tableName, "pii") { pii = "mask" }

        _, err := lfClient.AddLFTagsToResource(ctx, &lf.AddLFTagsToResourceInput{
            Resource: &lftypes.Resource{
                TableResource: &lftypes.TableResource{
                    CatalogId:   aws.String("111111111111"),
                    DatabaseName: aws.String("warehouse"),
                    Name:        aws.String(tableName),
                },
            },
            LFTags: []lftypes.LFTagPair{
                {CatalogId: aws.String("111111111111"),
                 TagKey: aws.String("env"),    TagValues: []string{"prod"}},
                {CatalogId: aws.String("111111111111"),
                 TagKey: aws.String("domain"), TagValues: []string{domain}},
                {CatalogId: aws.String("111111111111"),
                 TagKey: aws.String("tier"),   TagValues: []string{tier}},
                {CatalogId: aws.String("111111111111"),
                 TagKey: aws.String("pii"),    TagValues: []string{pii}},
            },
        })
        if err != nil { log.Fatalf("tag table %s: %v", tableName, err) }
    }

    // 3. GRANT PRINCIPALS by LF-tag (not by table)
    _, err := lfClient.GrantPermissions(ctx, &lf.GrantPermissionsInput{
        Principal: &lftypes.DataLakePrincipal{
            DataLakePrincipalIdentifier: aws.String(
                "arn:aws:iam::111111111111:group/analysts"),
        },
        Resource: &lftypes.Resource{
            LFTagResource: &lftypes.LFTagResource{
                CatalogId: aws.String("111111111111"),
                TagKey: aws.String("tier"),
                TagValues: []string{"internal", "non-sensitive", "public"},
            },
        },
        Permissions: []lftypes.Permission{lftypes.PermissionSelect},
    })
    if err != nil { log.Fatalf("grant analysts: %v", err) }

    // 4. RE-TAG = INSTANT POLICY RE-ROUTE
    _, err = lfClient.UpdateLFTagsToResource(ctx, &lf.UpdateLFTagsToResourceInput{
        Resource: &lftypes.Resource{
            TableResource: &lftypes.TableResource{
                CatalogId: aws.String("111111111111"),
                DatabaseName: aws.String("warehouse"),
                Name: aws.String("table_042"),
            },
        },
        LFTagsToAdd: []lftypes.LFTagPair{{
            CatalogId: aws.String("111111111111"),
            TagKey: aws.String("env"), TagValues: []string{"prod"},
        }},
        LFTagsToRemove: []lftypes.LFTagPair{{
            CatalogId: aws.String("111111111111"),
            TagKey: aws.String("env"), TagValues: []string{"staging"},
        }},
    })
    if err != nil { log.Fatalf("retag: %v", err) }
    fmt.Println("table_042 re-tagged env=staging -> env=prod (instant re-route)")
}

func contains(s, substr string) bool {
    return len(s) >= len(substr) && (s == substr ||
        (len(s) > len(substr) && contains(s[1:], substr)))
}`,
      },
      {
        lang: "elixir",
        filename: "aws_lf_tags_governance.ex",
        code: `defmodule AwsLakeFormation.TagsGovernance do
  @moduledoc "LF-tags governance — 100 tables, 4 tag dims, ~50 principals"

  def setup do
    # 1. CREATE 4 LF-TAG DIMENSIONS
    tag_dims = %{
      "env"    => ["prod", "staging", "dev"],
      "tier"   => ["sensitive", "internal", "non-sensitive", "public"],
      "domain" => ["customer", "finance", "ml", "ops"],
      "pii"    => ["mask", "anonymize", "allow"]
    }
    Enum.each(tag_dims, fn {key, values} ->
      LakeFormation.create_lf_tag(tag_key: key, tag_values: values)
    end)

    # 2. AUTO-TAG 100 tables (Lambda on glue:CreateTable event)
    Enum.each(1..100, fn i ->
      table_name = "table_#{String.pad_leading(Integer.to_string(i), 3, "0")}"
      domain = cond do
        String.contains?(table_name, "customer") -> "customer"
        String.contains?(table_name, "finance")  -> "finance"
        true -> "ops"
      end
      tier = if String.contains?(table_name, "pii"), do: "sensitive", else: "internal"
      pii  = if String.contains?(table_name, "pii"), do: "mask", else: "allow"

      LakeFormation.add_lf_tags_to_resource(
        resource: %{table: %{catalog_id: "111111111111",
                             database: "warehouse", name: table_name}},
        lf_tags: [
          %{catalog_id: "111111111111", tag_key: "env",    tag_values: ["prod"]},
          %{catalog_id: "111111111111", tag_key: "domain", tag_values: [domain]},
          %{catalog_id: "111111111111", tag_key: "tier",   tag_values: [tier]},
          %{catalog_id: "111111111111", tag_key: "pii",    tag_values: [pii]}
        ]
      )
    end)

    # 3. GRANT PRINCIPALS by LF-tag (not by table)
    LakeFormation.grant_permissions(
      principal: "arn:aws:iam::111111111111:group/analysts",
      resource: %{lf_tag: %{catalog_id: "111111111111",
                            tag_key: "tier",
                            tag_values: ["internal", "non-sensitive", "public"]}},
      permissions: [:select]
    )
    LakeFormation.grant_permissions(
      principal: "arn:aws:iam::111111111111:group/data-scientists",
      resource: %{lf_tag: %{catalog_id: "111111111111",
                            tag_key: "domain", tag_values: ["ml"]}},
      permissions: [:select]
    )

    # 4. RE-TAG = INSTANT POLICY RE-ROUTE
    LakeFormation.update_lf_tags_to_resource(
      resource: %{table: %{catalog_id: "111111111111",
                           database: "warehouse", name: "table_042"}},
      lf_tags_to_add:    [%{catalog_id: "111111111111",
                            tag_key: "env", tag_values: ["prod"]}],
      lf_tags_to_remove: [%{catalog_id: "111111111111",
                            tag_key: "env", tag_values: ["staging"]}]
    )
    IO.puts("table_042 re-tagged env=staging -> env=prod (instant re-route)")
    :ok
  end
end`,
      },
      {
        lang: "zig",
        filename: "aws_lf_tags_governance.zig",
        code: `const std = @import("std");
const lf = @import("aws-lakeformation-zig");

pub fn setup(alloc: std.mem.Allocator) !void {
    var client = try lf.Client.init(alloc, .{ .region = "us-east-1" });
    defer client.deinit();

    // 1. CREATE 4 LF-TAG DIMENSIONS
    try client.create_lf_tag(.{
        .tag_key = "env",
        .tag_values = &[_][]const u8{ "prod", "staging", "dev" },
    });
    try client.create_lf_tag(.{
        .tag_key = "tier",
        .tag_values = &[_][]const u8{ "sensitive", "internal", "non-sensitive", "public" },
    });
    try client.create_lf_tag(.{
        .tag_key = "domain",
        .tag_values = &[_][]const u8{ "customer", "finance", "ml", "ops" },
    });
    try client.create_lf_tag(.{
        .tag_key = "pii",
        .tag_values = &[_][]const u8{ "mask", "anonymize", "allow" },
    });

    // 2. AUTO-TAG 100 tables (Lambda on glue:CreateTable event)
    var i: usize = 1;
    while (i <= 100) : (i += 1) {
        const table_name = try std.fmt.allocPrint(alloc, "table_{d:0>3}", .{i});
        defer alloc.free(table_name);
        const domain = if (std.mem.indexOf(u8, table_name, "customer") != null) "customer"
                       else if (std.mem.indexOf(u8, table_name, "finance") != null) "finance"
                       else "ops";
        const tier = if (std.mem.indexOf(u8, table_name, "pii") != null) "sensitive" else "internal";
        const pii = if (std.mem.indexOf(u8, table_name, "pii") != null) "mask" else "allow";
        try client.add_lf_tags_to_resource(.{
            .resource = .{ .table = .{
                .catalog_id = "111111111111",
                .database = "warehouse", .name = table_name,
            } },
            .lf_tags = &[_]lf.LFTagPair{
                .{ .catalog_id = "111111111111", .tag_key = "env",
                   .tag_values = &[_][]const u8{"prod"} },
                .{ .catalog_id = "111111111111", .tag_key = "domain",
                   .tag_values = &[_][]const u8{domain} },
                .{ .catalog_id = "111111111111", .tag_key = "tier",
                   .tag_values = &[_][]const u8{tier} },
                .{ .catalog_id = "111111111111", .tag_key = "pii",
                   .tag_values = &[_][]const u8{pii} },
            },
        });
    }

    // 3. GRANT PRINCIPALS by LF-tag (not by table)
    try client.grant_permissions(.{
        .principal = "arn:aws:iam::111111111111:group/analysts",
        .resource = .{ .lf_tag = .{
            .catalog_id = "111111111111",
            .tag_key = "tier",
            .tag_values = &[_][]const u8{ "internal", "non-sensitive", "public" },
        } },
        .permissions = &[_]lf.Permission{.select},
    });

    // 4. RE-TAG = INSTANT POLICY RE-ROUTE
    try client.update_lf_tags_to_resource(.{
        .resource = .{ .table = .{
            .catalog_id = "111111111111",
            .database = "warehouse", .name = "table_042",
        } },
        .lf_tags_to_add = &[_]lf.LFTagPair{.{ .catalog_id = "111111111111",
            .tag_key = "env", .tag_values = &[_][]const u8{"prod"} }},
        .lf_tags_to_remove = &[_]lf.LFTagPair{.{ .catalog_id = "111111111111",
            .tag_key = "env", .tag_values = &[_][]const u8{"staging"} }},
    });
    std.debug.print("table_042 re-tagged env=staging -> env=prod\\n", .{});
}`,
      },
    ],
    runnablePython: `# AWS Lake Formation LF-tags governance — 100 tables, 4 dims
import random
from collections import defaultdict

random.seed(42)
print("=== AWS Lake Formation — LF-tags governance ===")
print("Scale: 100 tables · 4 tag dims · ~50 principals\\n")

# 4 LF-tag dimensions
tag_dims = {
    "env":    ["prod", "staging", "dev"],
    "tier":   ["sensitive", "internal", "non-sensitive", "public"],
    "domain": ["customer", "finance", "ml", "ops"],
    "pii":    ["mask", "anonymize", "allow"],
}
print("LF-tag dimensions:")
for dim, values in tag_dims.items():
    print(f"  {dim:8s}: {', '.join(values)}")

# Auto-tag 100 tables (simulating Lambda on glue:CreateTable)
print(f"\\nAuto-tagging 100 tables (Lambda on glue:CreateTable):")
tables = []
for t_idx in range(100):
    table_name = f"table_{t_idx:03d}"
    env = "prod"
    domain = random.choice(tag_dims["domain"])
    tier = random.choice(tag_dims["tier"])
    pii = random.choice(tag_dims["pii"])
    tables.append({
        "name": table_name, "env": env, "domain": domain,
        "tier": tier, "pii": pii,
    })
print(f"  Tagged {len(tables)} tables with 4 dims each")

# Sample 5 tagged tables
print(f"  Sample (first 5):")
for t in tables[:5]:
    print(f"    {t['name']}: env={t['env']}, tier={t['tier']}, "
          f"domain={t['domain']}, pii={t['pii']}")

# Principal grants — by LF-tag (not by table)
print(f"\\nPrincipal grants (by LF-tag, not by table):")
principals = [
    ("arn:aws:iam::111111111111:group/analysts",
     "tier", ["internal", "non-sensitive", "public"]),
    ("arn:aws:iam::111111111111:group/data-scientists",
     "domain", ["ml"]),
    ("arn:aws:iam::111111111111:group/finance-team",
     "domain", ["finance"]),
    ("arn:aws:iam::111111111111:group/ops-team",
     "domain", ["ops"]),
    ("arn:aws:iam::111111111111:group/sensitive-readers",
     "tier", ["sensitive"]),
]
for principal, tag_key, tag_values in principals:
    print(f"  GRANT SELECT ON LF_TAG({tag_key}={tag_values})")
    print(f"    TO {principal.split('/')[-1]}")

# Effective access — what each principal sees
print(f"\\nEffective access (principal -> # tables visible):")
for principal, tag_key, tag_values in principals:
    visible = sum(1 for t in tables if t[tag_key] in tag_values)
    pct = visible / len(tables) * 100
    print(f"  {principal.split('/')[-1]:25s}: {visible}/{len(tables)} tables ({pct:.0f}%)")

# Re-tag scenario — promote table_042 from staging to prod
print(f"\\nRe-tag scenario (table_042 env staging -> prod):")
# Simulate: table_042 was env=staging, now env=prod
table_042 = next(t for t in tables if t["name"] == "table_042")
print(f"  Before: {table_042}")
old_env = table_042["env"]
table_042["env"] = "prod"
print(f"  After:  {table_042}")
print(f"  Re-route time: <1s (single LF API call)")
print(f"  No per-resource grants to update (would be 50 GRANT statements)")

# New table scenario — table_101 created, inherits existing grants
print(f"\\nNew table scenario (table_101 created, inherits existing grants):")
new_table = {"name": "table_101", "env": "prod", "domain": "ml",
             "tier": "internal", "pii": "allow"}
tables.append(new_table)
# Auto-tagger (Lambda) applies tags -> new table visible to:
visible_to = []
for principal, tag_key, tag_values in principals:
    if new_table[tag_key] in tag_values:
        visible_to.append(principal.split('/')[-1])
print(f"  Auto-tagger applies LF-tags (env=prod, domain=ml, "
      f"tier=internal, pii=allow)")
print(f"  Visible to: {', '.join(visible_to)} (instant, no GRANT needed)")

# Comparison — LF-tags vs per-resource grants
print(f"\\n=== Comparison: LF-tags vs per-resource grants ===")
print(f"  LF-tags (100 tables, 5 principal groups):")
print(f"    Total GRANT statements: 5 (one per principal group, by tag)")
print(f"    Add new table: 0 GRANTs (just tag it)")
print(f"    Re-tag table: 0 GRANTs (just update tag)")
print(f"    Audit: 4 tag dims per table (declarative)")
print(f"  Per-resource grants (100 tables, 5 principal groups):")
print(f"    Total GRANT statements: 500 (100 tables × 5 groups)")
print(f"    Add new table: 5 GRANTs (one per group)")
print(f"    Re-tag table: 5 GRANT updates + 5 GRANT removals")
print(f"    Audit: 500 grant records to track")
print(f"\\nKey insight: LF-tags invert the governance model —")
print(f"instead of grant-per-resource (O(n×m) grants), it's")
print(f"grant-per-tag-value (O(m) grants where m is principal groups).")
print(f"Re-tagging a table instantly re-routes access across all 50")
print(f"principals — no per-resource grants to update. New tables")
print(f"inherit existing grants by being tagged. This is the only")
print(f"scalable governance pattern for 100+ tables.")`,
    insight: "LF-tags invert the governance model from grant-per-resource (O(n×m) grants where n=tables, m=principals) to grant-per-tag-value (O(m) grants). At 100 tables × 5 principal groups: per-resource = 500 GRANT statements; LF-tags = 5 GRANT statements (one per principal group, by tag). Re-tagging a table instantly re-routes access across all 50 principals — single LF API call, <1s, no per-resource grants to update. New tables inherit existing grants by being tagged (Lambda auto-tagger on glue:CreateTable event applies 4-dim LF-tags based on table name + schema patterns). This is the only scalable governance pattern for 100+ tables; without LF-tags, governance becomes O(n×m) and drifts over time as new tables are added without grants being updated.",
  },
];

// ============================================================
// Exports
// ============================================================

export {
  TABULAR_EXAMPLES,
  DATABRICKS_LAKEHOUSE_EXAMPLES,
  SNOWFLAKE_POLARIS_EXAMPLES,
  AWS_LAKE_FORMATION_EXAMPLES,
};
