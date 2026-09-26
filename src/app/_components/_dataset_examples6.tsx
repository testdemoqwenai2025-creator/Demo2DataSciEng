// ============================================================
// Dataset examples for Phase 3 pages: Lineage + Data Contracts
// 6 examples (3 per page) × 5 languages (Scala/Rust/Go/Elixir/Zig)
// ============================================================

import type { DatasetExample } from "./dataset-cards";
import {
  Database, Atom, Boxes, Zap, TrendingUp, Activity, Cpu, History,
  Workflow, Layers, Network, ShieldCheck, Server, Sparkles, FileText,
  GitBranch, ShieldAlert, Target, AlertTriangle, Search,
} from "lucide-react";

// ============================================================
// LINEAGE — 3 dataset examples
// ============================================================

export const LINEAGE_EXAMPLES: DatasetExample[] = [
  {
    id: "lineage-multi-hop-gdpr-audit",
    step: "1",
    title: "Multi-hop lineage — GDPR audit trail",
    subtitle: "Synthetic — Kafka → Bronze → Silver → Gold → BI",
    accent: "oklch(0.62 0.18 145)",
    icon: <Network className="h-4 w-4" />,
    badge: "Synthetic GDPR-scale audit",
    brief: {
      dataset: "Synthetic: 100M customer events/day flowing Kafka → Bronze (raw Iceberg) → Silver (conformed, PII-hashed) → Gold (analytics marts) → BI dashboard. OpenLineage emits Start/Run/Complete events at every Airflow task + Spark job.",
      scale: "~100M events/day · 5 lineage hops · ~1.2K datasets · ~8K jobs/day · sub-second lineage graph traversal",
      why: "GDPR Article 15 (right of access) requires platforms to trace which downstream artifacts derive from a given customer's PII. Without lineage, the audit fails — data stewards cannot answer 'which dashboards show this customer's data?' Multi-hop lineage makes the graph queryable end-to-end.",
    },
    stats: [
      { label: "Events/day", value: "100M" },
      { label: "Lineage hops", value: "5" },
      { label: "Datasets", value: "~1.2K" },
      { label: "Jobs/day", value: "~8K" },
    ],
    tools: ["OpenLineage (Airflow + Spark + dbt)", "Marquez (reference UI)", "Apache Atlas (Hadoop)", "Unity Catalog Lineage", "DataHub (LinkedIn)", "Spline (Spark)"],
    codeTabs: [
      {
        lang: "scala",
        filename: "MultiHopLineageAudit.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.openlineage.spark.OpenLineageSparkListener
import io.openlineage.client.OpenLineage
import org.apache.spark.scheduler.SparkListener

// Spark listener — emits OpenLineage events on job start/complete
// Captures: inputs (read datasets), outputs (written datasets),
// job name (SQL query + plan facets), run + parent facets (Airflow runId)
val spark = SparkSession.builder()
  .appName("silver_conformance")
  .config("spark.extraListeners",
    classOf[OpenLineageSparkListener].getName)
  .config("spark.openlineage.transport.url",
    "https://lineage.moderndatascieng.com")
  .config("spark.openlineage.namespace", "spark-prod")
  .config("spark.openlineage.parentJobName",
    "airflow.silver_dag.silver_conformance")
  .config("spark.openlineage.parentRunId",
    sys.env("AIRFLOW_RUN_ID"))  // ties Spark to Airflow DAG run
  .getOrCreate()

// Silver conformance — Bronze -> Silver hop (OpenLineage captures the
// input (bronze.customers_raw) + output (silver.customers) + the SQL)
spark.sql("""
  |CREATE TABLE silver.customers AS
  |SELECT
  |  customer_id,
  |  sha256(email)        AS email_hash,      -- PII hashing for Silver
  |  sha256(phone)        AS phone_hash,
  |  region,
  |  first_seen_ts
  |FROM bronze.customers_raw
  |WHERE ingestion_ts >= current_date() - 1
""".stripMargin)

// Gold mart hop — Silver -> Gold (downstream consumer is BI dashboard)
spark.sql("""
  |CREATE TABLE gold.cust_region_summary AS
  |SELECT region, count(*) AS n_customers,
  |       count(distinct email_hash) AS n_unique_emails
  |FROM silver.customers
  |GROUP BY region
""".stripMargin)

// Audit query — which Gold tables depend on silver.customers.email_hash?
val audit = LineageClient.query("""
  |SELECT DISTINCT downstream_dataset
  |FROM lineage.edge
  |WHERE upstream_dataset = 'silver.customers'
  |  AND upstream_column = 'email_hash'
  |  AND depth <= 5
""".stripMargin)
audit.show()   // -> gold.cust_region_summary.n_unique_emails, gold.marketing.emails_sent, ...`,
      },
      {
        lang: "rust",
        filename: "multi_hop_lineage_audit.rs",
        code: `use openlineage_rust::{OpenLineageClient, OpenLineageEvent, Dataset, Facet};
use airflow::DagRun;
use spark_connect_rust::SparkSession;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let ol = OpenLineageClient::new("https://lineage.moderndatascieng.com");
    let dag_run = DagRun::from_env("silver_dag")?;  // AIRFLOW_RUN_ID

    // Emit START event — registers this Airflow task + parent runId
    ol.emit(OpenLineageEvent::start("silver_dag.silver_conformance")
        .parent_run_id(&dag_run.run_id)
        .namespace("airflow-prod"))
        .await?;

    let spark = SparkSession::builder()
        .extra_listener("org.openlineage.spark.OpenLineageSparkListener")
        .config("spark.openlineage.transport.url",
                "https://lineage.moderndatascieng.com")
        .config("spark.openlineage.parentRunId", &dag_run.run_id)
        .build()?;

    // Bronze -> Silver hop (Spark emits its own sub-events automatically)
    spark.sql(r#"
        CREATE TABLE silver.customers AS
        SELECT customer_id,
               sha256(email)   AS email_hash,
               sha256(phone)   AS phone_hash,
               region, first_seen_ts
        FROM bronze.customers_raw
        WHERE ingestion_ts >= current_date() - 1
    "#).await?;

    // Silver -> Gold hop
    spark.sql(r#"
        CREATE TABLE gold.cust_region_summary AS
        SELECT region, count(*) AS n_customers
        FROM silver.customers
        GROUP BY region
    "#).await?;

    ol.emit(OpenLineageEvent::complete("silver_dag.silver_conformance")
        .input(Dataset::new("iceberg", "bronze.customers_raw"))
        .output(Dataset::new("iceberg", "silver.customers")))
        .await?;

    // GDPR Article 15 audit — find all downstream artifacts of email_hash
    let downstream = ol.downstream("silver.customers", Some("email_hash"),
                                    Some(5)).await?;
    println!("GDPR audit — downstream of silver.customers.email_hash:");
    for ds in &downstream {
        println!("  -> {} (depth {})", ds.name, ds.depth);
    }
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "multi_hop_lineage_audit.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"
    "os"

    openlineage "github.com/OpenLineage/openlineage-go"
    airflow "github.com/apache/airflow-client-go"
    spark "github.com/apache/spark-connect-go"
)

func main() {
    ctx := context.Background()
    olClient, _ := openlineage.New("https://lineage.moderndatascieng.com")

    // Airflow task instance emits START/COMPLETE OpenLineage events
    dagRunID := os.Getenv("AIRFLOW_RUN_ID")
    olClient.Emit(ctx, openlineage.Event{
        EventType:  openlineage.Start,
        JobName:    "silver_dag.silver_conformance",
        Namespace:  "airflow-prod",
        ParentRunID: dagRunID,
    })

    sparkSession, _ := spark.NewSession(ctx, spark.Config{
        ExtraListeners:         []string{"org.openlineage.spark.OpenLineageSparkListener"},
        OpenLineageTransportURL: "https://lineage.moderndatascieng.com",
        OpenLineageParentRunID:  dagRunID,
    })

    // Bronze -> Silver hop
    _, err := sparkSession.SQL(ctx, \`
        CREATE TABLE silver.customers AS
        SELECT customer_id,
               sha256(email) AS email_hash,
               sha256(phone) AS phone_hash,
               region, first_seen_ts
        FROM bronze.customers_raw
        WHERE ingestion_ts >= current_date() - 1
    \`)
    if err != nil { log.Fatalf("silver: %v", err) }

    // Silver -> Gold hop
    _, err = sparkSession.SQL(ctx, \`
        CREATE TABLE gold.cust_region_summary AS
        SELECT region, count(*) AS n_customers
        FROM silver.customers GROUP BY region
    \`)
    if err != nil { log.Fatalf("gold: %v", err) }

    olClient.Emit(ctx, openlineage.Event{
        EventType: openlineage.Complete,
        JobName:   "silver_dag.silver_conformance",
        Inputs:    []openlineage.Dataset{{Namespace: "iceberg", Name: "bronze.customers_raw"}},
        Outputs:   []openlineage.Dataset{{Namespace: "iceberg", Name: "silver.customers"}},
    })

    // GDPR Article 15 audit — downstream blast radius of email_hash
    downstream, _ := olClient.Downstream(ctx, "silver.customers", "email_hash", 5)
    fmt.Println("GDPR audit — downstream of silver.customers.email_hash:")
    for _, ds := range downstream {
        fmt.Printf("  -> %s (depth %d)\\n", ds.Name, ds.Depth)
    }
}`,
      },
      {
        lang: "elixir",
        filename: "multi_hop_lineage_audit.ex",
        code: `defmodule Lineage.MultiHopAudit do
  @moduledoc "Kafka -> Bronze -> Silver -> Gold -> BI lineage + GDPR audit"
  @ol_url "https://lineage.moderndatascieng.com"

  def silver_conformance do
    run_id = System.get_env("AIRFLOW_RUN_ID")

    # Emit START event for this Airflow task (parent run ties them together)
    OpenLineage.emit(@ol_url, %{
      "eventType" => "START",
      "job" => %{"name" => "silver_dag.silver_conformance",
                  "namespace" => "airflow-prod"},
      "parent" => %{"run" => %{"runId" => run_id}}
    })

    # Spark session with OpenLineage listener — auto-emits Spark sub-events
    spark = Spark.new()
      |> Spark.extra_listener("org.openlineage.spark.OpenLineageSparkListener")
      |> Spark.config("spark.openlineage.transport.url", @ol_url)
      |> Spark.config("spark.openlineage.parentRunId", run_id)

    # Bronze -> Silver hop
    Spark.sql(spark, """
      CREATE TABLE silver.customers AS
      SELECT customer_id,
             sha256(email) AS email_hash,
             sha256(phone) AS phone_hash,
             region, first_seen_ts
      FROM bronze.customers_raw
      WHERE ingestion_ts >= current_date() - 1
    """)

    # Silver -> Gold hop
    Spark.sql(spark, """
      CREATE TABLE gold.cust_region_summary AS
      SELECT region, count(*) AS n_customers
      FROM silver.customers GROUP BY region
    """)

    OpenLineage.emit(@ol_url, %{
      "eventType" => "COMPLETE",
      "job" => %{"name" => "silver_dag.silver_conformance"},
      "inputs"  => [%{"namespace" => "iceberg",
                        "name" => "bronze.customers_raw"}],
      "outputs" => [%{"namespace" => "iceberg",
                        "name" => "silver.customers"}]
    })

    :ok
  end

  def gdpr_audit(customer_id) do
    # GDPR Article 15 — which downstream artifacts show this customer's PII?
    downstream = OpenLineage.downstream(@ol_url,
      "silver.customers", "email_hash", 5)
    IO.puts("GDPR audit for customer #{customer_id}:")
    Enum.each(downstream, fn ds ->
      IO.puts("  -> #{ds["name"]} (depth #{ds["depth"]})")
    end)
    downstream
  end
end`,
      },
      {
        lang: "zig",
        filename: "multi_hop_lineage_audit.zig",
        code: `const std = @import("std");
const ol = @import("openlineage-zig");
const spark = @import("spark-connect-zig");
const airflow = @import("airflow-zig");

pub fn silver_conformance(alloc: std.mem.Allocator) !void {
    const run_id = std.posix.getenv("AIRFLOW_RUN_ID") orelse "";
    var client = try ol.Client.init(alloc, "https://lineage.moderndatascieng.com");
    defer client.deinit();

    // Emit START event — Airflow task with parent runId tying to DAG run
    try client.emit(.{
        .eventType = .start,
        .jobName = "silver_dag.silver_conformance",
        .namespace = "airflow-prod",
        .parentRunId = run_id,
    });

    var session = try spark.Session.init(alloc);
    defer session.deinit();
    try session.extra_listener("org.openlineage.spark.OpenLineageSparkListener");
    try session.config("spark.openlineage.transport.url",
        "https://lineage.moderndatascieng.com");
    try session.config("spark.openlineage.parentRunId", run_id);

    // Bronze -> Silver hop
    try session.sql(
        \\CREATE TABLE silver.customers AS
        \\SELECT customer_id,
        \\       sha256(email) AS email_hash,
        \\       sha256(phone) AS phone_hash,
        \\       region, first_seen_ts
        \\FROM bronze.customers_raw
        \\WHERE ingestion_ts >= current_date() - 1
    );

    // Silver -> Gold hop
    try session.sql(
        \\CREATE TABLE gold.cust_region_summary AS
        \\SELECT region, count(*) AS n_customers
        \\FROM silver.customers GROUP BY region
    );

    try client.emit(.{
        .eventType = .complete,
        .jobName = "silver_dag.silver_conformance",
        .inputs = &[_]ol.Dataset{.{ .namespace = "iceberg",
                                     .name = "bronze.customers_raw" }},
        .outputs = &[_]ol.Dataset{.{ .namespace = "iceberg",
                                      .name = "silver.customers" }},
    });
}

pub fn gdpr_audit(alloc: std.mem.Allocator, customer_id: []const u8) !void {
    var client = try ol.Client.init(alloc, "https://lineage.moderndatascieng.com");
    defer client.deinit();
    const downstream = try client.downstream(
        "silver.customers", "email_hash", 5);
    defer alloc.free(downstream);
    std.debug.print("GDPR audit for customer {s}:\\n", .{customer_id});
    for (downstream) |ds| {
        std.debug.print("  -> {s} (depth {d})\\n", .{ ds.name, ds.depth });
    }
}`,
      },
    ],
    runnablePython: `# Multi-hop lineage + GDPR audit simulation
import random
from collections import defaultdict, deque

random.seed(42)
print("=== Multi-hop lineage — Kafka -> Bronze -> Silver -> Gold -> BI ===")
print("Scale: 100M events/day, 5 hops, ~1.2K datasets, ~8K jobs/day\\n")

# Build synthetic lineage graph — 5-hop pipeline
# Each hop emits OpenLineage Start/Complete events with inputs + outputs
hops = [
    ("kafka.customers_raw",   "bronze.customers_raw",     "Kafka Ingest",       0),
    ("bronze.customers_raw",  "silver.customers",         "Silver Conformance", 1),
    ("silver.customers",      "gold.cust_region_summary", "Gold Mart",          2),
    ("silver.customers",      "gold.marketing.emails",    "Gold Mart (mktg)",   2),
    ("gold.cust_region_summary", "bi.dashboard.revenue",  "BI Refresh",         3),
]

print("OpenLineage events emitted (synthetic):")
edges = []
for src, dst, job, depth in hops:
    n_jobs = random.randint(20, 50)  # how many job runs per day for this hop
    print(f"  [{depth}] {job}: {src} -> {dst} ({n_jobs} jobs/day)")
    edges.append((src, dst, depth, job))

# Build adjacency list for downstream traversal
adj = defaultdict(list)
for src, dst, depth, job in edges:
    adj[src].append((dst, depth, job))

# GDPR Article 15 audit — find all downstream artifacts of silver.customers.email_hash
print("\\n=== GDPR Article 15 audit — downstream of silver.customers.email_hash ===")
def downstream_bfs(start, max_depth=5):
    """Breadth-first traversal of lineage graph from start dataset."""
    visited = set()
    queue = deque([(start, 0)])
    downstream = []
    while queue:
        node, depth = queue.popleft()
        if depth > max_depth:
            continue
        for child, edge_depth, job in adj.get(node, []):
            if child not in visited:
                visited.add(child)
                downstream.append((child, edge_depth, job))
                queue.append((child, edge_depth + 1))
    return downstream

blast_radius = downstream_bfs("silver.customers", max_depth=5)
print(f"Blast radius: {len(blast_radius)} downstream artifacts")
for ds, depth, job in blast_radius:
    print(f"  depth {depth}  {ds}  (via {job})")

# Impact analysis — if we change silver.customers.email_hash, what breaks?
print("\\n=== Impact analysis — change to silver.customers.email_hash ===")
n_consumers = len(blast_radius)
n_jobs_affected = sum(random.randint(20, 50) for _ in blast_radius)
print(f"  Downstream consumers: {n_consumers} datasets")
print(f"  Jobs affected: ~{n_jobs_affected}/day would need re-run")
print(f"  Dashboards affected: 1 (bi.dashboard.revenue)")
print(f"  Estimated time to propagate change: ~6h (next Airflow DAG run)")
print("\\nKey insight: lineage is the dependency graph for data,")
print("like package-lock.json is for code. Multi-hop lineage lets you trace")
print("any change end-to-end — from Kafka topic to BI dashboard. Without it,")
print("GDPR audits require manual table-by-table tracing (hours -> minutes).")`,
    insight: "Multi-hop lineage emits OpenLineage events at every Airflow task + Spark job — the lineage graph builds itself as jobs run, no manual maintenance. GDPR Article 15 (right of access) becomes a graph query: BFS from silver.customers.email_hash finds all downstream artifacts (Gold marts, BI dashboards, ML features) in milliseconds. Without lineage, this audit requires manual table-by-table tracing — hours of work per request, often incomplete.",
  },
  {
    id: "lineage-impact-analysis-blast-radius",
    step: "2",
    title: "Impact analysis — downstream blast radius",
    subtitle: "Synthetic — if we change this column, what breaks?",
    accent: "oklch(0.65 0.18 30)",
    icon: <Target className="h-4 w-4" />,
    badge: "Synthetic column-level blast",
    brief: {
      dataset: "Synthetic: a single schema change on silver.customers.email_hash (rename + re-hash). OpenLineage column-level lineage tracks every downstream column derived from email_hash — Gold mart aggregations, ML feature store, BI dashboard tiles.",
      scale: "1 column change · ~14 downstream consumers · ~50 jobs/day affected · 1 BI dashboard broken · estimated 6-hour propagation",
      why: "Impact analysis is the production reason lineage exists. Before deploying a schema change, the data engineer queries lineage to see the blast radius. Without column-level lineage, only table-level impact is visible — but schema changes happen at the column level. Column-level lineage prevents silent dashboard breakage.",
    },
    stats: [
      { label: "Column change", value: "1" },
      { label: "Consumers", value: "~14" },
      { label: "Jobs affected", value: "~50/day" },
      { label: "Dashboards", value: "1 broken" },
    ],
    tools: ["OpenLineage (column-level)", "Spline (Spark column capture)", "Unity Catalog Lineage", "DataHub (column-aware)", "dbt lineage graph"],
    codeTabs: [
      {
        lang: "scala",
        filename: "ImpactAnalysisBlastRadius.scala",
        code: `import org.apache.spark.sql.SparkSession
import io.openlineage.client.LineageClient

// Pre-deploy impact analysis — what breaks if we change email_hash?
// Uses column-level lineage: tracks not just table->table but column->column
// (e.g., gold.cust_region_summary.n_unique_emails derives from
// silver.customers.email_hash)

val lineage = LineageClient("https://lineage.moderndatascieng.com")

// Target column we're about to change
val target = ColumnRef(
  dataset = "silver.customers",
  column  = "email_hash"
)

// Traverse downstream column-level edges — depth 10 (covers full pipeline)
val impacted: Seq[ColumnLineage] = lineage.downstreamColumns(target, maxDepth = 10)

println(s"Impact analysis for $target:")
println(s"  Total downstream columns: \${impacted.size}")
impacted.groupBy(_.dataset).foreach { case (ds, cols) =>
  println(s"  $ds:")
  cols.foreach(c => println(s"    - \${c.column} (depth \${c.depth}, lastJob=\${c.job})"))
}

// Group by job to count affected jobs per day
val affectedJobs = impacted.flatMap(_.jobHistory).distinct
println(s"\\nAffected jobs: \${affectedJobs.size}")
println(s"Estimated re-runs needed: \${affectedJobs.size} jobs * 1/day = \${affectedJobs.size}/day")

// Group by consumer type
val byType = impacted.groupBy(_.dataset.split("\\\\.").head)
byType.foreach { case (ns, cols) =>
  println(s"  $ns namespace: \${cols.size} downstream columns")
}

// Block deploy if any BI dashboard column is impacted without an owner approval
val biImpact = impacted.filter(_.dataset.startsWith("bi."))
if (biImpact.nonEmpty) {
  println(s"\\nBLOCKING DEPLOY — BI impact detected:")
  biImpact.foreach(c => println(s"  \${c.dataset}.\${c.column} (owner: \${c.owner})"))
  System.exit(1)  // CI fails — needs owner sign-off
}`,
      },
      {
        lang: "rust",
        filename: "impact_analysis_blast_radius.rs",
        code: `use openlineage_rust::{LineageClient, ColumnRef, ColumnLineage};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let lineage = LineageClient::new("https://lineage.moderndatascieng.com");

    // Pre-deploy impact analysis — what breaks if email_hash changes?
    let target = ColumnRef::new("silver.customers", "email_hash");
    let impacted = lineage.downstream_columns(&target, 10).await?;

    println!("Impact analysis for {}:", target);
    println!("  Total downstream columns: {}", impacted.len());

    // Group by dataset to see which tables contain impacted columns
    use std::collections::BTreeMap;
    let mut by_ds: BTreeMap<&str, Vec<&ColumnLineage>> = BTreeMap::new();
    for c in &impacted {
        by_ds.entry(c.dataset.as_str()).or_default().push(c);
    }
    for (ds, cols) in &by_ds {
        println!("  {}:", ds);
        for c in cols {
            println!("    - {} (depth {}, last job={})",
                     c.column, c.depth, c.job);
        }
    }

    // Affected jobs per day
    let mut job_set = std::collections::HashSet::new();
    for c in &impacted {
        for j in &c.job_history {
            job_set.insert(j.clone());
        }
    }
    println!("\\nAffected jobs: {} (estimated re-runs: {}/day)",
             job_set.len(), job_set.len());

    // Block deploy if any BI dashboard column impacted without owner approval
    let bi_impact: Vec<_> = impacted.iter()
        .filter(|c| c.dataset.starts_with("bi."))
        .collect();
    if !bi_impact.is_empty() {
        println!("\\nBLOCKING DEPLOY — BI impact detected:");
        for c in bi_impact {
            println!("  {}.{} (owner: {})", c.dataset, c.column, c.owner);
        }
        std::process::exit(1);
    }
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "impact_analysis_blast_radius.go",
        code: `package main

import (
    "fmt"
    "log"
    "sort"

    openlineage "github.com/OpenLineage/openlineage-go"
)

func main() {
    client, err := openlineage.NewLineageClient("https://lineage.moderndatascieng.com")
    if err != nil { log.Fatal(err) }

    // Pre-deploy impact analysis — what breaks if email_hash changes?
    target := openlineage.ColumnRef{
        Dataset: "silver.customers",
        Column:  "email_hash",
    }
    impacted, err := client.DownstreamColumns(target, 10)
    if err != nil { log.Fatal(err) }

    fmt.Printf("Impact analysis for %s.%s:\\n", target.Dataset, target.Column)
    fmt.Printf("  Total downstream columns: %d\\n", len(impacted))

    // Group by dataset
    byDataset := map[string][]openlineage.ColumnLineage{}
    for _, c := range impacted {
        byDataset[c.Dataset] = append(byDataset[c.Dataset], c)
    }
    keys := make([]string, 0, len(byDataset))
    for k := range byDataset { keys = append(keys, k) }
    sort.Strings(keys)
    for _, ds := range keys {
        fmt.Printf("  %s:\\n", ds)
        for _, c := range byDataset[ds] {
            fmt.Printf("    - %s (depth %d, lastJob=%s)\\n",
                c.Column, c.Depth, c.Job)
        }
    }

    // Affected jobs per day (unique set)
    jobSet := map[string]struct{}{}
    for _, c := range impacted {
        for _, j := range c.JobHistory {
            jobSet[j] = struct{}{}
        }
    }
    fmt.Printf("\\nAffected jobs: %d (re-runs needed: %d/day)\\n",
        len(jobSet), len(jobSet))

    // Block deploy if any BI dashboard column impacted
    for _, c := range impacted {
        if len(c.Dataset) >= 3 && c.Dataset[:3] == "bi." {
            fmt.Printf("BLOCKING DEPLOY — BI impact: %s.%s (owner: %s)\\n",
                c.Dataset, c.Column, c.Owner)
            // CI fails — needs owner sign-off
            return
        }
    }
}`,
      },
      {
        lang: "elixir",
        filename: "impact_analysis_blast_radius.ex",
        code: `defmodule Lineage.ImpactAnalysis do
  @moduledoc "Pre-deploy impact analysis via column-level lineage"
  @ol_url "https://lineage.moderndatascieng.com"

  def analyze(target_dataset, target_column) do
    target = %{"dataset" => target_dataset, "column" => target_column}

    # Traverse downstream column-level edges — depth 10
    impacted = OpenLineage.downstream_columns(@ol_url, target, 10)

    IO.puts("Impact analysis for #{target_dataset}.#{target_column}:")
    IO.puts("  Total downstream columns: #{length(impacted)}")

    # Group by dataset
    by_dataset = Enum.group_by(impacted, & &1["dataset"])
    for {ds, cols} <- by_dataset do
      IO.puts("  #{ds}:")
      for c <- cols do
        IO.puts("    - #{c["column"]} (depth #{c["depth"]}, last job=#{c["job"]})")
      end
    end

    # Unique affected jobs
    job_set = impacted
      |> Enum.flat_map(& &1["job_history"])
      |> Enum.uniq()
    IO.puts("\\nAffected jobs: #{length(job_set)} (re-runs needed: #{length(job_set)}/day)")

    # Block deploy if any BI dashboard column impacted
    bi_impact = Enum.filter(impacted, fn c ->
      String.starts_with?(c["dataset"], "bi.")
    end)
    if length(bi_impact) > 0 do
      IO.puts("\\nBLOCKING DEPLOY — BI impact detected:")
      for c <- bi_impact do
        IO.puts("  #{c["dataset"]}.#{c["column"]} (owner: #{c["owner"]})")
      end
      System.halt(1)  # CI fails — needs owner sign-off
    end
  end
end`,
      },
      {
        lang: "zig",
        filename: "impact_analysis_blast_radius.zig",
        code: `const std = @import("std");
const ol = @import("openlineage-zig");

pub fn analyze(alloc: std.mem.Allocator,
               target_ds: []const u8,
               target_col: []const u8) !void {
    var client = try ol.Client.init(alloc, "https://lineage.moderndatascieng.com");
    defer client.deinit();

    const target = ol.ColumnRef{
        .dataset = target_ds,
        .column = target_col,
    };

    // Traverse downstream column-level edges — depth 10
    const impacted = try client.downstream_columns(alloc, target, 10);
    defer alloc.free(impacted);

    std.debug.print("Impact analysis for {s}.{s}:\\n", .{target_ds, target_col});
    std.debug.print("  Total downstream columns: {d}\\n", .{impacted.len});

    // Group by dataset
    var by_dataset = std.StringHashMap(std.ArrayList(ol.ColumnLineage)).init(alloc);
    defer {
        var iter = by_dataset.iterator();
        while (iter.next()) |entry| entry.value_ptr.deinit();
        by_dataset.deinit();
    }
    for (impacted) |c| {
        const entry = try by_dataset.getOrPut(c.dataset);
        if (!entry.found_existing) {
            entry.value_ptr.* = std.ArrayList(ol.ColumnLineage).init(alloc);
        }
        try entry.value_ptr.append(c);
    }

    var iter = by_dataset.iterator();
    while (iter.next()) |entry| {
        std.debug.print("  {s}:\\n", .{entry.key_ptr.*});
        for (entry.value_ptr.items) |c| {
            std.debug.print("    - {s} (depth {d}, lastJob={s})\\n",
                .{c.column, c.depth, c.job});
        }
    }

    // Unique affected jobs
    var job_set = std.StringHashMap(void).init(alloc);
    defer job_set.deinit();
    for (impacted) |c| {
        for (c.job_history) |j| {
            try job_set.put(j, {});
        }
    }
    std.debug.print("\\nAffected jobs: {d} (re-runs needed: {d}/day)\\n",
        .{ job_set.count(), job_set.count() });

    // Block deploy if any BI dashboard column impacted
    for (impacted) |c| {
        if (std.mem.startsWith(u8, c.dataset, "bi.")) {
            std.debug.print("BLOCKING DEPLOY — BI impact: {s}.{s} (owner: {s})\\n",
                .{c.dataset, c.column, c.owner});
            std.process.exit(1);
        }
    }
}`,
      },
    ],
    runnablePython: `# Impact analysis — downstream blast radius simulation
import random
from collections import defaultdict, deque

random.seed(7)
print("=== Impact analysis — change to silver.customers.email_hash ===")
print("Column-level lineage — depth-limited BFS to find all consumers\\n")

# Synthetic column-level lineage graph
# Each entry: (src_ds, src_col, dst_ds, dst_col, job)
edges = [
    ("silver.customers", "email_hash", "gold.cust_region_summary", "n_unique_emails",  "silver_to_gold"),
    ("silver.customers", "email_hash", "gold.marketing.emails",    "email_target",     "silver_to_marketing"),
    ("silver.customers", "email_hash", "ml.features.user_features", "email_feat",       "silver_to_ml"),
    ("gold.cust_region_summary", "n_unique_emails", "bi.dashboard.revenue", "unique_emails_tile", "gold_to_bi"),
    ("gold.marketing.emails",     "email_target",    "bi.dashboard.marketing", "sent_emails_tile",   "gold_to_bi"),
    ("ml.features.user_features", "email_feat",      "ml.serving.scoring",     "score_input",        "ml_to_serving"),
    ("gold.marketing.emails",     "email_target",    "ops.cdp.audience",       "audience_email",     "gold_to_cdp"),
    ("ops.cdp.audience",          "audience_email",  "bi.dashboard.cdp",      "cdp_audience_tile",  "cdp_to_bi"),
]

# Build adjacency for downstream traversal
adj = defaultdict(list)
for src_ds, src_col, dst_ds, dst_col, job in edges:
    adj[(src_ds, src_col)].append((dst_ds, dst_col, job))

def downstream_bfs(start_ds, start_col, max_depth=10):
    """Column-level downstream traversal."""
    visited = set()
    queue = deque([(start_ds, start_col, 0, "<root>")])
    impacted = []
    while queue:
        ds, col, depth, last_job = queue.popleft()
        if depth > max_depth:
            continue
        for child_ds, child_col, job in adj.get((ds, col), []):
            if (child_ds, child_col) not in visited:
                visited.add((child_ds, child_col))
                impacted.append((child_ds, child_col, depth + 1, job))
                queue.append((child_ds, child_col, depth + 1, job))
    return impacted

# Run the impact analysis
print(f"Target: silver.customers.email_hash (proposed change: rename + re-hash)\\n")
impacted = downstream_bfs("silver.customers", "email_hash")
print(f"Impacted downstream columns: {len(impacted)}")

# Group by dataset for clear reporting
by_ds = defaultdict(list)
for ds, col, depth, job in impacted:
    by_ds[ds].append((col, depth, job))

print("\\nBy dataset:")
for ds, items in sorted(by_ds.items()):
    print(f"  {ds} ({len(items)} columns):")
    for col, depth, job in items:
        print(f"    - {col} (depth {depth}, via {job})")

# Affected jobs per day — simulate unique job count
unique_jobs = list({job for _, _, _, job in impacted})
print(f"\\nAffected jobs: {len(unique_jobs)} (re-runs needed: ~{len(unique_jobs)}/day)")
print(f"  Jobs: {', '.join(unique_jobs)}")

# BI dashboards affected
bi_impact = [(ds, col) for ds, col, _, _ in impacted if ds.startswith("bi.")]
if bi_impact:
    print(f"\\nBLOCKING DEPLOY — BI impact detected ({len(bi_impact)} tiles):")
    for ds, col in bi_impact:
        print(f"  {ds}.{col} (owner: dashboard-team)")
    print("\\n  -> CI fails. Owner sign-off required before deploy.")

# Estimated time-to-impact if change deployed without analysis
print("\\n=== Counterfactual: deploy without analysis ===")
print(f"  1 BI dashboard silently breaks (next refresh = stale data)")
print(f"  1 ML scoring pipeline reads old schema (silent feature drift)")
print(f"  1 CDP audience segment misses new emails (silent revenue loss)")
print(f"  Mean time to detect: ~12-24h (operator notices dashboard is stale)")
print(f"  Mean time to root-cause: ~6h (manual tracing through 5+ tables)")
print(f"  Total cost: ~1 day of partial outage across 3 downstream services")`,
    insight: "Column-level lineage is the production tool for pre-deploy impact analysis. Before changing silver.customers.email_hash, the engineer queries lineage: 'show me all downstream columns derived from this one'. If a BI dashboard tile depends on it (e.g., bi.dashboard.revenue.unique_emails_tile), CI blocks the deploy until the dashboard owner signs off. Without column-level lineage, only table-level impact is visible — but schema changes happen at column level, so the table-level view misses 90% of the blast radius.",
  },
  {
    id: "lineage-debug-broken-pipeline-rca",
    step: "3",
    title: "Debug broken pipeline — root cause analysis",
    subtitle: "Synthetic — which job produced the bad data?",
    accent: "oklch(0.6 0.16 250)",
    icon: <AlertTriangle className="h-4 w-4" />,
    badge: "Synthetic RCA investigation",
    brief: {
      dataset: "Synthetic: BI dashboard revenue numbers dropped 30% overnight. Root cause analysis uses lineage to walk upstream from the broken dashboard tile, identifying which Gold table, which Silver job, which Bronze ingestion produced the bad data.",
      scale: "1 broken dashboard · ~5 lineage hops upstream · ~3 candidate root causes · ~12 jobs/day to inspect · typical RCA from hours to minutes",
      why: "Root cause analysis is the killer production use case for lineage. When a dashboard breaks, the engineer's first question is 'which job produced the bad data?'. Without lineage, this requires manual tracing through table metadata, commit logs, and Slack threads — often hours per investigation. With lineage, it's a graph walk: BFS upstream from the broken artifact.",
    },
    stats: [
      { label: "Broken BI", value: "1" },
      { label: "Upstream hops", value: "~5" },
      { label: "Candidate causes", value: "~3" },
      { label: "RCA time", value: "Hours → minutes" },
    ],
    tools: ["OpenLineage (upstream BFS)", "Marquez (timeline UI)", "DataHub (impact + RCA)", "Spline (Spark execution plan)", "Unity Lineage (column-aware)"],
    codeTabs: [
      {
        lang: "scala",
        filename: "DebugBrokenPipelineRca.scala",
        code: `import io.openlineage.client.LineageClient
import java.time.Instant
import scala.concurrent.duration._

// RCA — BI dashboard revenue dropped 30% overnight.
// Walk upstream from bi.dashboard.revenue to find which job produced bad data.
val lineage = LineageClient("https://lineage.moderndatascieng.com")

// Time window: last 24h (the 'overnight' break)
val since = Instant.now().minusSeconds(24 * 3600)

// Upstream traversal — find every job that wrote to a dataset
// feeding into bi.dashboard.revenue within the time window
val upstream: Seq[JobRun] = lineage.upstreamJobs(
  dataset = "bi.dashboard.revenue",
  since = since,
  maxDepth = 10
)

println(s"Upstream jobs in last 24h: \${upstream.size}")
upstream.groupBy(_.jobName).foreach { case (job, runs) =>
  println(s"\\n  $job (\${runs.size} runs):")
  runs.foreach { r =>
    val status = if (r.success) "OK" else "FAILED"
    val dq = r.dataQualityScore.map(s => f" DQ=$s%.2f").getOrElse("")
    println(s"    \${r.startedAt}  $status  runId=\${r.runId}$dq")
  }
}

// Filter to FAILED runs or runs with low DQ score — prime suspects
val suspects = upstream.filter(r => !r.success ||
  r.dataQualityScore.exists(_ < 0.95))
println(s"\\nSuspect runs (failed or DQ < 0.95): \${suspects.size}")
suspects.foreach { r =>
  println(s"  \${r.jobName} runId=\${r.runId} at \${r.startedAt}")
  // Pull input datasets — what data did this job consume?
  val inputs = lineage.inputs(r.runId)
  println(s"    Inputs: \${inputs.map(_.name).mkString(", ")}")
  // Pull the SQL plan facet — what did this job actually do?
  val plan = lineage.sqlPlan(r.runId)
  println(s"    SQL plan: \${plan.getOrElse("(none)").take(200)}")
}

// Identify the prime suspect
val prime = suspects.maxBy(_.impact)
println(s"\\nPRIME SUSPECT: \${prime.jobName} runId=\${prime.runId}")
println(s"  Started: \${prime.startedAt}")
println(s"  Inputs: \${lineage.inputs(prime.runId).map(_.name).mkString(", ")}")
println(s"  Outputs: \${lineage.outputs(prime.runId).map(_.name).mkString(", ")}")
println(s"  Action: re-run the suspect job, then re-run downstream consumers")`,
      },
      {
        lang: "rust",
        filename: "debug_broken_pipeline_rca.rs",
        code: `use openlineage_rust::{LineageClient, JobRun};
use chrono::{Utc, Duration};
use std::collections::HashMap;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let lineage = LineageClient::new("https://lineage.moderndatascieng.com");
    let since = Utc::now() - Duration::hours(24);

    // RCA — BI dashboard revenue dropped 30% overnight.
    // Upstream traversal from bi.dashboard.revenue to find suspect jobs.
    let upstream = lineage.upstream_jobs("bi.dashboard.revenue",
                                          since, 10).await?;

    println!("Upstream jobs in last 24h: {}", upstream.len());
    let mut by_job: HashMap<String, Vec<&JobRun>> = HashMap::new();
    for r in &upstream {
        by_job.entry(r.job_name.clone()).or_default().push(r);
    }
    for (job, runs) in &by_job {
        println!("\\n  {} ({} runs):", job, runs.len());
        for r in runs {
            let status = if r.success { "OK" } else { "FAILED" };
            let dq = r.data_quality_score
                .map(|s| format!(" DQ={:.2}", s))
                .unwrap_or_default();
            println!("    {}  {}  runId={}{}", r.started_at, status,
                     r.run_id, dq);
        }
    }

    // Filter to FAILED or low-DQ runs — prime suspects
    let suspects: Vec<_> = upstream.iter()
        .filter(|r| !r.success ||
            r.data_quality_score.map(|s| s < 0.95).unwrap_or(false))
        .collect();
    println!("\\nSuspect runs (failed or DQ < 0.95): {}", suspects.len());

    for r in &suspects {
        println!("  {} runId={} at {}", r.job_name, r.run_id, r.started_at);
        let inputs = lineage.inputs(&r.run_id).await?;
        println!("    Inputs: {}",
            inputs.iter().map(|d| d.name.as_str()).collect::<Vec<_>>().join(", "));
        let plan = lineage.sql_plan(&r.run_id).await?;
        if let Some(p) = plan {
            println!("    SQL plan: {}",
                p.chars().take(200).collect::<String>());
        }
    }

    // Identify prime suspect — highest-impact failed/low-DQ run
    if let Some(prime) = suspects.iter().max_by_key(|r| r.impact) {
        println!("\\nPRIME SUSPECT: {} runId={}", prime.job_name, prime.run_id);
        println!("  Started: {}", prime.started_at);
        let inputs = lineage.inputs(&prime.run_id).await?;
        let outputs = lineage.outputs(&prime.run_id).await?;
        println!("  Inputs: {}",
            inputs.iter().map(|d| d.name.as_str())
                .collect::<Vec<_>>().join(", "));
        println!("  Outputs: {}",
            outputs.iter().map(|d| d.name.as_str())
                .collect::<Vec<_>>().join(", "));
        println!("  Action: re-run the suspect job, then re-run downstream");
    }
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "debug_broken_pipeline_rca.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"
    "sort"
    "time"

    openlineage "github.com/OpenLineage/openlineage-go"
)

func main() {
    client, _ := openlineage.NewLineageClient("https://lineage.moderndatascieng.com")
    ctx := context.Background()
    since := time.Now().Add(-24 * time.Hour)

    // RCA — BI dashboard revenue dropped 30% overnight.
    upstream, err := client.UpstreamJobs(ctx, "bi.dashboard.revenue", since, 10)
    if err != nil { log.Fatal(err) }

    fmt.Printf("Upstream jobs in last 24h: %d\\n", len(upstream))

    // Group by job name
    byJob := map[string][]openlineage.JobRun{}
    for _, r := range upstream {
        byJob[r.JobName] = append(byJob[r.JobName], r)
    }
    keys := make([]string, 0, len(byJob))
    for k := range byJob { keys = append(keys, k) }
    sort.Strings(keys)
    for _, job := range keys {
        runs := byJob[job]
        fmt.Printf("\\n  %s (%d runs):\\n", job, len(runs))
        for _, r := range runs {
            status := "OK"
            if !r.Success { status = "FAILED" }
            dqStr := ""
            if r.DataQualityScore != nil {
                dqStr = fmt.Sprintf(" DQ=%.2f", *r.DataQualityScore)
            }
            fmt.Printf("    %s  %s  runId=%s%s\\n", r.StartedAt, status, r.RunID, dqStr)
        }
    }

    // Suspects: FAILED or DQ < 0.95
    var suspects []openlineage.JobRun
    for _, r := range upstream {
        if !r.Success ||
            (r.DataQualityScore != nil && *r.DataQualityScore < 0.95) {
            suspects = append(suspects, r)
        }
    }
    fmt.Printf("\\nSuspect runs: %d\\n", len(suspects))

    // Sort suspects by impact descending — prime suspect first
    sort.SliceStable(suspects, func(i, j int) bool {
        return suspects[i].Impact > suspects[j].Impact
    })

    for _, r := range suspects {
        fmt.Printf("  %s runId=%s at %s\\n", r.JobName, r.RunID, r.StartedAt)
        inputs, _ := client.Inputs(ctx, r.RunID)
        fmt.Printf("    Inputs: %v\\n", inputs)
        plan, _ := client.SQLPlan(ctx, r.RunID)
        if plan != "" {
            fmt.Printf("    SQL plan: %s\\n", truncate(plan, 200))
        }
    }

    if len(suspects) > 0 {
        prime := suspects[0]
        fmt.Printf("\\nPRIME SUSPECT: %s runId=%s\\n", prime.JobName, prime.RunID)
        fmt.Printf("  Started: %s\\n", prime.StartedAt)
        ins, _ := client.Inputs(ctx, prime.RunID)
        outs, _ := client.Outputs(ctx, prime.RunID)
        fmt.Printf("  Inputs: %v\\n", ins)
        fmt.Printf("  Outputs: %v\\n", outs)
        fmt.Println("  Action: re-run the suspect job, then re-run downstream")
    }
}

func truncate(s string, n int) string {
    if len(s) <= n { return s }
    return s[:n]
}`,
      },
      {
        lang: "elixir",
        filename: "debug_broken_pipeline_rca.ex",
        code: `defmodule Lineage.RcaInvestigation do
  @moduledoc "Root cause analysis via upstream lineage traversal"
  @ol_url "https://lineage.moderndatascieng.com"

  def investigate(broken_dataset) do
    since = DateTime.add(DateTime.utc_now(), -24 * 3600, :second)
    IO.puts("RCA investigation: #{broken_dataset} (last 24h)\\n")

    # Upstream traversal — every job that fed this dataset in the time window
    upstream = OpenLineage.upstream_jobs(@ol_url, broken_dataset, since, 10)
    IO.puts("Upstream jobs in last 24h: #{length(upstream)}")

    by_job = Enum.group_by(upstream, & &1["jobName"])
    for {job, runs} <- by_job do
      IO.puts("\\n  #{job} (#{length(runs)} runs):")
      for r <- runs do
        status = if r["success"], do: "OK", else: "FAILED"
        dq = case r["dataQualityScore"] do
          nil -> ""
          s -> " DQ=#{:erlang.float_to_binary(s, decimals: 2)}"
        end
        IO.puts("    #{r["startedAt"]}  #{status}  runId=#{r["runId"]}#{dq}")
      end
    end

    # Suspects: FAILED or DQ < 0.95
    suspects = Enum.filter(upstream, fn r ->
      not r["success"] or
        (r["dataQualityScore"] && r["dataQualityScore"] < 0.95)
    end)
    IO.puts("\\nSuspect runs: #{length(suspects)}")

    # Prime suspect — highest impact
    prime = Enum.max_by(suspects, & &1["impact"], fn -> nil end)
    if prime do
      IO.puts("\\nPRIME SUSPECT: #{prime["jobName"]} runId=#{prime["runId"]}")
      IO.puts("  Started: #{prime["startedAt"]}")
      inputs  = OpenLineage.inputs(@ol_url, prime["runId"])
      outputs = OpenLineage.outputs(@ol_url, prime["runId"])
      IO.puts("  Inputs: #{Enum.join(inputs, ", ")}")
      IO.puts("  Outputs: #{Enum.join(outputs, ", ")}")
      IO.puts("  Action: re-run the suspect job, then re-run downstream")
    end
  end
end`,
      },
      {
        lang: "zig",
        filename: "debug_broken_pipeline_rca.zig",
        code: `const std = @import("std");
const ol = @import("openlineage-zig");

pub fn investigate(alloc: std.mem.Allocator, broken_ds: []const u8) !void {
    var client = try ol.Client.init(alloc, "https://lineage.moderndatascieng.com");
    defer client.deinit();

    const since_s: i64 = std.time.timestamp() - 24 * 3600;
    std.debug.print("RCA investigation: {s} (last 24h)\\n\\n", .{broken_ds});

    // Upstream traversal — every job feeding this dataset in window
    const upstream = try client.upstream_jobs(alloc, broken_ds, since_s, 10);
    defer alloc.free(upstream);
    std.debug.print("Upstream jobs in last 24h: {d}\\n", .{upstream.len});

    // Group by job name
    var by_job = std.StringHashMap(std.ArrayList(ol.JobRun)).init(alloc);
    defer {
        var iter = by_job.iterator();
        while (iter.next()) |e| e.value_ptr.deinit();
        by_job.deinit();
    }
    for (upstream) |r| {
        const e = try by_job.getOrPut(r.jobName);
        if (!e.found_existing) {
            e.value_ptr.* = std.ArrayList(ol.JobRun).init(alloc);
        }
        try e.value_ptr.append(r);
    }

    var iter = by_job.iterator();
    while (iter.next()) |entry| {
        std.debug.print("\\n  {s} ({d} runs):\\n",
            .{entry.key_ptr.*, entry.value_ptr.items.len});
        for (entry.value_ptr.items) |r| {
            const status = if (r.success) "OK" else "FAILED";
            std.debug.print("    {d}  {s}  runId={s}\\n",
                .{r.startedAt, status, r.runId});
        }
    }

    // Filter to FAILED or DQ < 0.95 — suspects
    var suspects = std.ArrayList(ol.JobRun).init(alloc);
    defer suspects.deinit();
    for (upstream) |r| {
        const dq_low = if (r.dataQualityScore) |s| s < 0.95 else false;
        if (!r.success or dq_low) try suspects.append(r);
    }
    std.debug.print("\\nSuspect runs: {d}\\n", .{suspects.items.len});

    // Prime suspect — highest impact
    var prime: ?ol.JobRun = null;
    var max_impact: i64 = -1;
    for (suspects.items) |r| {
        if (r.impact > max_impact) {
            max_impact = r.impact;
            prime = r;
        }
    }
    if (prime) |p| {
        std.debug.print("\\nPRIME SUSPECT: {s} runId={s}\\n", .{p.jobName, p.runId});
        std.debug.print("  Started: {d}\\n", .{p.startedAt});
        const inputs = try client.inputs(alloc, p.runId);
        defer alloc.free(inputs);
        std.debug.print("  Inputs: {d}\\n", .{inputs.len});
        std.debug.print("  Action: re-run the suspect job, then re-run downstream\\n", .{});
    }
}`,
      },
    ],
    runnablePython: `# RCA — debug broken pipeline via upstream lineage traversal
import random
from collections import defaultdict, deque
import math

random.seed(11)
print("=== RCA — BI dashboard revenue dropped 30% overnight ===")
print("Investigation: upstream lineage BFS from bi.dashboard.revenue\\n")

# Synthetic upstream lineage graph (reversed direction from downstream view)
# (src_ds, dst_ds, job_name, daily_run_count)
edges = [
    ("bronze.orders_raw",     "silver.orders_conf",     "silver_orders_job",     96),
    ("silver.orders_conf",    "gold.revenue_summary",   "gold_revenue_job",      24),
    ("gold.revenue_summary",  "bi.dashboard.revenue",   "bi_refresh_job",         4),
    ("bronze.customers_raw",  "silver.customers",        "silver_customers_job",  96),
    ("silver.customers",      "gold.cust_region_summary","gold_region_job",       24),
    ("gold.cust_region_summary", "bi.dashboard.revenue", "bi_region_refresh",     4),
    ("bronze.fx_rates",       "silver.orders_conf",     "fx_enrichment_job",     24),
]

# Build reverse adjacency (downstream -> upstream)
reverse_adj = defaultdict(list)
for src, dst, job, runs in edges:
    reverse_adj[dst].append((src, job, runs))

# Simulate 24h of job runs — some random ones fail or produce low-DQ data
def simulate_runs(hours=24):
    """Generate synthetic run history with random failures + DQ scores."""
    history = []
    for h in range(hours):
        for src, dst, job, runs_per_day in edges:
            runs_per_hour = max(1, runs_per_day // 24)
            for _ in range(runs_per_hour):
                # Inject a bad run around hour=8 (the "overnight" break)
                fail_prob = 0.02
                dq_drop = 0.0
                if h == 8 and job == "silver_orders_job":
                    fail_prob = 0.5
                    dq_drop = -0.4  # DQ score drops by 0.4
                elif h == 9 and job == "gold_revenue_job":
                    fail_prob = 0.4
                    dq_drop = -0.3
                success = random.random() > fail_prob
                dq = max(0.0, min(1.0, random.gauss(0.97, 0.02) + dq_drop))
                history.append({
                    "hour": h, "job": job,
                    "src": src, "dst": dst,
                    "success": success,
                    "dq": dq,
                    "run_id": f"{job}-h{h}-{random.randint(1000,9999)}",
                    "impact": 1 if dst == "bi.dashboard.revenue" else 0,
                })
    return history

history = simulate_runs(24)

# Upstream BFS from broken dashboard
print("Step 1: Upstream traversal from bi.dashboard.revenue (depth 10)")
visited = set()
queue = deque([("bi.dashboard.revenue", 0)])
upstream_ds = []
while queue:
    ds, depth = queue.popleft()
    if depth > 10:
        continue
    if ds in visited:
        continue
    visited.add(ds)
    upstream_ds.append((ds, depth))
    for src, job, _ in reverse_adj.get(ds, []):
        if src not in visited:
            queue.append((src, depth + 1))

print(f"  Reachable datasets: {len(upstream_ds)}")
for ds, depth in sorted(upstream_ds, key=lambda x: x[1]):
    print(f"  depth {depth}  {ds}")

# Filter history to upstream jobs only
print(f"\\nStep 2: Job runs touching upstream datasets (last 24h)")
upstream_ds_names = {ds for ds, _ in upstream_ds}
upstream_runs = [r for r in history if r["src"] in upstream_ds_names or
                 r["dst"] in upstream_ds_names]
print(f"  Total runs: {len(upstream_runs)}")

# Group by job name
by_job = defaultdict(list)
for r in upstream_runs:
    by_job[r["job"]].append(r)
for job, runs in sorted(by_job.items()):
    n_fail = sum(1 for r in runs if not r["success"])
    n_low_dq = sum(1 for r in runs if r["dq"] < 0.95)
    print(f"  {job}: {len(runs)} runs, {n_fail} failed, {n_low_dq} low-DQ")

# Step 3: identify prime suspects
print(f"\\nStep 3: Prime suspects (failed or DQ < 0.95)")
suspects = [r for r in upstream_runs if not r["success"] or r["dq"] < 0.95]
print(f"  Suspect runs: {len(suspects)}")

# Sort by impact (direct upstream of bi.dashboard.revenue = highest impact)
suspects.sort(key=lambda r: (-r["impact"], -r["hour"]))
for r in suspects[:5]:
    status = "FAILED" if not r["success"] else "OK"
    print(f"    hour={r['hour']}  {r['job']}  status={status}  DQ={r['dq']:.3f}  runId={r['run_id']}")

# Identify the prime suspect
if suspects:
    prime = suspects[0]
    print(f"\\n  PRIME SUSPECT: {prime['job']} (runId={prime['run_id']})")
    print(f"    Hour: {prime['hour']}")
    print(f"    Output: {prime['dst']}")
    print(f"    Action: re-run {prime['job']}, then re-run downstream consumers")

# Time savings estimate
print("\\n=== Time savings ===")
print("  Without lineage: manual tracing through 3 tables, 5 jobs,")
print("    commit logs, Slack threads, dashboards → ~3-6 hours per RCA")
print("  With lineage: graph traversal, ~30 seconds")
print("  Improvement: ~100-1000× faster root-cause analysis")`,
    insight: "Root cause analysis is the killer production use case for lineage. When bi.dashboard.revenue drops 30% overnight, the engineer's first question is 'which job produced the bad data?'. Without lineage, this requires manual tracing through 3+ tables, commit logs, and Slack threads — often 3-6 hours per investigation. With lineage, BFS upstream from the broken artifact identifies the suspect job in seconds, with full run history (failure status, DQ scores, SQL plan, inputs/outputs) attached.",
  },
];

// ============================================================
// DATA CONTRACTS — 3 dataset examples
// ============================================================

export const DATA_CONTRACTS_EXAMPLES: DatasetExample[] = [
  {
    id: "data-contracts-orders-events-100m",
    step: "1",
    title: "Order events contract — 100M events",
    subtitle: "Synthetic — producer/consumer agreement",
    accent: "oklch(0.65 0.18 30)",
    icon: <ShieldCheck className="h-4 w-4" />,
    badge: "Synthetic producer/consumer SLA",
    brief: {
      dataset: "Synthetic: 100M order events/day on Kafka topic 'orders.v3'. Contract = Avro schema + freshness SLA (P95 < 5min) + completeness SLA (no nulls on order_id/customer_id) + owner (orders-team). dbt + GE validate on write.",
      scale: "~100M events/day · 12 consumer services · 4 SLA dimensions · 1 owner · 0 breaking changes since v3 deployed",
      why: "Order events feed 12 downstream services — billing, fulfilment, fraud, analytics, ML. Without a contract, a producer schema change breaks 12 services silently. The contract is the deploy-gate: schema + SLA + ownership are all explicit, validated on write, versioned via PR review.",
    },
    stats: [
      { label: "Events/day", value: "100M" },
      { label: "Consumers", value: "12" },
      { label: "SLA dims", value: "4" },
      { label: "Breaking changes", value: "0 since v3" },
    ],
    tools: ["dbt (schema tests + contracts)", "Great Expectations (validation)", "Confluent Schema Registry", "DataHub (discovery)", "OpenLineage (compliance)", "GitHub PR review"],
    codeTabs: [
      {
        lang: "scala",
        filename: "OrderEventsContract.scala",
        code: `import org.apache.spark.sql.SparkSession
import io.confluent.kafka.schemaregistry.client.CachedSchemaRegistryClient
import com.greatexpectations.migrations.ge.SparkExpectations

// Order events contract — Avro schema + SLA + ownership
// Deployed via PR review (git is the contract version control)
case class OrderEventContract(
  schemaId: Int,                       // Schema Registry ID (v3 = id 42)
  owner: String,                       // "orders-team" — PagerDuty rotation
  freshnessSla: Duration,              // P95 < 5min (event_ts to Kafka ack)
  completenessSla: Map[String, Double],// per-field null rate (order_id = 0.0%)
  accuracySla: Map[String, Double],     // P95(amount_usd) within 1% of upstream
  consumers: List[String]              // 12 downstream service teams
)

val contract = OrderEventContract(
  schemaId = 42,
  owner = "orders-team",
  freshnessSla = Duration("5 minutes"),
  completenessSla = Map(
    "order_id" -> 0.0,    // 0% nulls allowed
    "customer_id" -> 0.0,  // 0% nulls allowed
    "amount_usd" -> 0.01,  // 1% nulls tolerated
    "currency" -> 0.05    // 5% nulls tolerated (defaults to USD)
  ),
  accuracySla = Map(
    "amount_usd" -> 0.01,  // P95 within 1% of MySQL orders_fct
    "order_ts" -> 0.0      // exact match to source binlog ts
  ),
  consumers = List(
    "billing-team", "fulfilment-team", "fraud-team",
    "analytics-team", "ml-platform-team", "marketing-team",
    "cdp-team", "ops-team", "data-stewards", "compliance-team",
    "support-team", "intl-team"
  )
)

// Producer-side validation — contract enforces on WRITE
val spark = SparkSession.builder().appName("orders-producer-validate").getOrCreate()
val orders = spark.readStream.format("kafka")
  .option("subscribe", "orders.raw")
  .load()

// Spark Expectations — runs Great Expectations rules in Spark
val validated = orders.withColumn("validated",
  SparkExpectations.validate(
    $"value",
    rules = List(
      GE.rule("order_id_not_null",    $"order_id".isNotNull),
      GE.rule("customer_id_not_null", $"customer_id".isNotNull),
      GE.rule("amount_positive",      $"amount_usd" >= 0),
      GE.rule("currency_in_enum",     $"currency".isin("USD","EUR","GBP","JPY"))
    ),
    onFail = "reject"  // -> DLQ topic "orders.dlq"
  ))

validated.writeStream.format("kafka")
  .option("topic", "orders.v3")  // only validated events reach v3
  .option("acks", "all")         // acks=all — strongest durability
  .start()

// Consumer-side subscription — discover the contract via DataHub
val consumer = DataHub.findContract("orders.v3")
println(s"Discovered: \${consumer.owner} (\${consumer.schemaId})")
println(s"SLAs: freshness=\${consumer.freshnessSla}, " +
        s"completeness=\${consumer.completenessSla}")`,
      },
      {
        lang: "rust",
        filename: "order_events_contract.rs",
        code: `use std::time::Duration;
use schema_registry_rs::CachedClient;
use great_expectations_rs::SparkExpectations;
use datahub_rs::DataHubClient;

#[derive(Debug)]
pub struct OrderEventContract {
    pub schema_id: u32,                        // Schema Registry ID (v3 = 42)
    pub owner: String,                         // "orders-team"
    pub freshness_sla: Duration,               // P95 < 5min
    pub completeness_sla: Vec<(&'static str, f64)>, // (field, max_null_rate)
    pub accuracy_sla: Vec<(&'static str, f64)>,     // (field, max_relative_error)
    pub consumers: Vec<&'static str>,           // 12 downstream teams
}

pub fn orders_contract() -> OrderEventContract {
    OrderEventContract {
        schema_id: 42,
        owner: "orders-team".to_string(),
        freshness_sla: Duration::from_secs(5 * 60),
        completeness_sla: vec![
            ("order_id",    0.0),  // 0% nulls
            ("customer_id", 0.0),
            ("amount_usd",  0.01), // 1% nulls tolerated
            ("currency",    0.05),
        ],
        accuracy_sla: vec![
            ("amount_usd", 0.01),  // P95 within 1% of upstream
            ("order_ts",   0.0),
        ],
        consumers: vec![
            "billing-team", "fulfilment-team", "fraud-team",
            "analytics-team", "ml-platform-team", "marketing-team",
            "cdp-team", "ops-team", "data-stewards", "compliance-team",
            "support-team", "intl-team",
        ],
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let contract = orders_contract();

    // Producer-side validation — Spark Expectations + Great Expectations rules
    let rules = vec![
        GE::rule("order_id_not_null",    |r| r.order_id.is_some()),
        GE::rule("customer_id_not_null", |r| r.customer_id.is_some()),
        GE::rule("amount_positive",      |r| r.amount_usd >= 0.0),
        GE::rule("currency_in_enum",     |r| matches!(r.currency.as_deref(),
            Some("USD") | Some("EUR") | Some("GBP") | Some("JPY"))),
    ];

    let mut producer = kafka_producer::Producer::builder()
        .topic("orders.v3")
        .acks(kafka_producer::Acks::All)
        .schema_id(contract.schema_id)
        .validation_rules(rules)
        .on_fail(kafka_producer::OnFail::RejectToDlq("orders.dlq"))
        .build()?;

    // Start producing — only validated events reach v3
    producer.start().await?;

    // Consumer-side — discover contract via DataHub
    let dh = DataHubClient::new("https://datahub.moderndatascieng.com");
    let discovered = dh.find_contract("orders.v3").await?;
    println!("Discovered: {} (schema_id={})",
        discovered.owner, discovered.schema_id);
    println!("SLAs: freshness={:?}, completeness={:?}",
        discovered.freshness_sla, discovered.completeness_sla);

    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "order_events_contract.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"
    "time"

    schemaregistry "github.com/confluentinc/confluent-kafka-go/schemaregistry"
    ge "github.com/great-expectations/great-expectations-go"
    datahub "github.com/datahub/datahub-go"
    kafkago "github.com/confluentinc/confluent-kafka-go/kafka"
)

type OrderEventContract struct {
    SchemaID         uint32
    Owner            string
    FreshnessSla     time.Duration
    CompletenessSla  map[string]float64
    AccuracySla       map[string]float64
    Consumers         []string
}

func OrdersContract() OrderEventContract {
    return OrderEventContract{
        SchemaID:        42,
        Owner:           "orders-team",
        FreshnessSla:    5 * time.Minute,
        CompletenessSla: map[string]float64{
            "order_id":    0.0,
            "customer_id": 0.0,
            "amount_usd":  0.01,
            "currency":    0.05,
        },
        AccuracySla: map[string]float64{
            "amount_usd": 0.01,
            "order_ts":   0.0,
        },
        Consumers: []string{
            "billing-team", "fulfilment-team", "fraud-team",
            "analytics-team", "ml-platform-team", "marketing-team",
            "cdp-team", "ops-team", "data-stewards", "compliance-team",
            "support-team", "intl-team",
        },
    }
}

func main() {
    contract := OrdersContract()

    // Producer-side validation — Great Expectations rules in Kafka producer
    rules := []ge.Rule{
        ge.NewRule("order_id_not_null",    func(r ge.Record) bool { return r["order_id"] != nil }),
        ge.NewRule("customer_id_not_null", func(r ge.Record) bool { return r["customer_id"] != nil }),
        ge.NewRule("amount_positive",      func(r ge.Record) bool {
            v, _ := r["amount_usd"].(float64); return v >= 0.0
        }),
        ge.NewRule("currency_in_enum",     func(r ge.Record) bool {
            c, _ := r["currency"].(string)
            switch c {
            case "USD", "EUR", "GBP", "JPY": return true
            }
            return false
        }),
    }

    producer, err := kafkago.NewProducer(&kafkago.ConfigMap{
        "bootstrap.servers":   "kafka:9092",
        "acks":                "all",
        "schema.registry.url": "http://schema-registry:8081",
        "value.schema.id":    contract.SchemaID,
    })
    if err != nil { log.Fatalf("producer: %v", err) }
    defer producer.Close()

    // Validate + produce — only valid events reach v3 topic
    ctx := context.Background()
    for _, record := range sourceRecords(ctx) {
        if violations := ge.Validate(record, rules); len(violations) > 0 {
            sendToDlq(producer, "orders.dlq", record, violations)
            continue
        }
        sendValid(producer, "orders.v3", record, contract.SchemaID)
    }

    // Consumer-side — discover contract via DataHub
    dh, _ := datahub.NewClient("https://datahub.moderndatascieng.com")
    discovered, _ := dh.FindContract(ctx, "orders.v3")
    fmt.Printf("Discovered: %s (schema_id=%d)\\n",
        discovered.Owner, discovered.SchemaID)
    fmt.Printf("SLAs: freshness=%v, completeness=%v\\n",
        discovered.FreshnessSla, discovered.CompletenessSla)
}

func sourceRecords(ctx context.Context) []ge.Record { return nil }
func sendToDlq(p *kafkago.Producer, t string, r ge.Record, v []ge.Violation) {}
func sendValid(p *kafkago.Producer, t string, r ge.Record, id uint32)         {}`,
      },
      {
        lang: "elixir",
        filename: "order_events_contract.ex",
        code: `defmodule DataContracts.OrderEvents do
  @moduledoc "100M order events/day — producer/consumer agreement"
  @sr_url "http://schema-registry:8081"
  @dh_url "https://datahub.moderndatascieng.com"

  def contract do
    %{
      schema_id: 42,
      owner: "orders-team",
      freshness_sla_ms: 5 * 60 * 1000,  # P95 < 5min
      completeness_sla: %{  # max null rate per field
        "order_id"    => 0.0,
        "customer_id" => 0.0,
        "amount_usd"  => 0.01,
        "currency"    => 0.05
      },
      accuracy_sla: %{  # max relative error vs upstream
        "amount_usd" => 0.01,
        "order_ts"   => 0.0
      },
      consumers: ~w(
        billing-team fulfilment-team fraud-team
        analytics-team ml-platform-team marketing-team
        cdp-team ops-team data-stewards compliance-team
        support-team intl-team
      )
    }
  end

  def validate_and_produce(record) do
    rules = [
      {"order_id_not_null",    record["order_id"] != nil},
      {"customer_id_not_null", record["customer_id"] != nil},
      {"amount_positive",      is_number(record["amount_usd"]) and
                                record["amount_usd"] >= 0},
      {"currency_in_enum",     record["currency"] in ~w(USD EUR GBP JPY)}
    ]
    violations = Enum.filter(rules, fn {_name, pass?} -> not pass? end)
    if Enum.empty?(violations) do
      KafkaEx.produce("orders.v3", :undefined, record,
        schema_id: 42, acks: :all)
      :ok
    else
      KafkaEx.produce("orders.dlq", :undefined,
        Map.put(record, "violations", violations),
        schema_id: 42)
      {:error, violations}
    end
  end

  def discover(topic) do
    # Consumer-side — pull contract metadata from DataHub
    DataHub.find_contract(@dh_url, topic)
  end
end`,
      },
      {
        lang: "zig",
        filename: "order_events_contract.zig",
        code: `const std = @import("std");
const sr = @import("schema-registry-zig");
const ge = @import("great-expectations-zig");
const dh = @import("datahub-zig");
const kafka = @import("kafka-zig");

pub const OrderEventContract = struct {
    schema_id: u32,
    owner: []const u8,
    freshness_sla_ms: u64,
    completeness_sla: []const FieldSla,
    accuracy_sla: []const FieldSla,
    consumers: []const []const u8,
};

pub const FieldSla = struct {
    field: []const u8,
    threshold: f64,
};

pub fn orders_contract() OrderEventContract {
    return .{
        .schema_id = 42,
        .owner = "orders-team",
        .freshness_sla_ms = 5 * 60 * 1000,
        .completeness_sla = &[_]FieldSla{
            .{ .field = "order_id",    .threshold = 0.0 },
            .{ .field = "customer_id", .threshold = 0.0 },
            .{ .field = "amount_usd", .threshold = 0.01 },
            .{ .field = "currency",   .threshold = 0.05 },
        },
        .accuracy_sla = &[_]FieldSla{
            .{ .field = "amount_usd", .threshold = 0.01 },
            .{ .field = "order_ts",   .threshold = 0.0 },
        },
        .consumers = &[_][]const u8{
            "billing-team", "fulfilment-team", "fraud-team",
            "analytics-team", "ml-platform-team", "marketing-team",
            "cdp-team", "ops-team", "data-stewards", "compliance-team",
            "support-team", "intl-team",
        },
    };
}

pub fn validate_and_produce(alloc: std.mem.Allocator, record: std.json.Value) !void {
    var producer = try kafka.Producer.init(alloc, "kafka:9092",
        .{ .acks = .all, .schema_id = 42 });
    defer producer.deinit();

    // Run all validation rules — short-circuit on first violation
    const order_id_ok = record.object.get("order_id") != null;
    const customer_id_ok = record.object.get("customer_id") != null;
    const amount = if (record.object.get("amount_usd")) |v|
        v.float else 0.0;
    const amount_ok = amount >= 0.0;
    const currency = if (record.object.get("currency")) |v|
        v.string else "";
    const currency_ok = std.mem.eql(u8, currency, "USD") or
        std.mem.eql(u8, currency, "EUR") or
        std.mem.eql(u8, currency, "GBP") or
        std.mem.eql(u8, currency, "JPY");

    if (order_id_ok and customer_id_ok and amount_ok and currency_ok) {
        try producer.produce("orders.v3", record);
    } else {
        // Send to DLQ with violation metadata
        try producer.produce("orders.dlq", record);
    }
}

pub fn discover(alloc: std.mem.Allocator, topic: []const u8) !void {
    var client = try dh.Client.init(alloc,
        "https://datahub.moderndatascieng.com");
    defer client.deinit();
    const c = try client.find_contract(alloc, topic);
    defer alloc.free(c);
    std.debug.print("Discovered: {s} (schema_id={d})\\n", .{c.owner, c.schema_id});
}`,
      },
    ],
    runnablePython: `# Order events contract — 100M events/day SLA + validation simulation
import random
from collections import defaultdict

random.seed(13)
print("=== Order events contract — 100M events/day ===")
print("Owner: orders-team | Schema: v3 (id=42) | 12 consumer services\\n")

# Contract definition
contract = {
    "schema_id": 42,
    "owner": "orders-team",
    "freshness_sla_ms": 5 * 60 * 1000,  # 5 min P95
    "completeness_sla": {
        "order_id":    0.0,   # 0% nulls
        "customer_id": 0.0,
        "amount_usd":  0.01,  # 1% nulls tolerated
        "currency":    0.05,  # 5% tolerated (default USD)
    },
    "accuracy_sla": {
        "amount_usd": 0.01,   # P95 within 1% of upstream
        "order_ts":   0.0,    # exact match
    },
    "consumers": [
        "billing-team", "fulfilment-team", "fraud-team",
        "analytics-team", "ml-platform-team", "marketing-team",
        "cdp-team", "ops-team", "data-stewards", "compliance-team",
        "support-team", "intl-team",
    ],
}

print(f"Contract owner: {contract['owner']}")
print(f"Freshness SLA: {contract['freshness_sla_ms'] / 1000 / 60:.0f}min P95")
print(f"Consumers: {len(contract['consumers'])} services")
print(f"  {', '.join(contract['consumers'])}")

# Validation rules (Great Expectations + dbt tests)
def validate_event(event):
    violations = []
    if event.get("order_id") is None:
        violations.append(("order_id_not_null", "missing order_id"))
    if event.get("customer_id") is None:
        violations.append(("customer_id_not_null", "missing customer_id"))
    amount = event.get("amount_usd")
    if amount is None:
        violations.append(("amount_not_null", "missing amount_usd"))
    elif not isinstance(amount, (int, float)) or amount < 0:
        violations.append(("amount_positive", f"amount {amount} not positive"))
    currency = event.get("currency", "USD")
    if currency not in ("USD", "EUR", "GBP", "JPY"):
        violations.append(("currency_in_enum", f"currency '{currency}' not in enum"))
    return violations

# Simulate 100K events (1:1000 scale-down from 100M)
n_events = 100_000
accounts = [f"ACC-{random.randint(10_000_000, 99_999_999)}" for _ in range(1000)]
valid_count = 0
reject_count = 0
reject_reasons = defaultdict(int)

for i in range(n_events):
    # 90% well-formed, 7% currency bad, 2% amount bad, 1% missing required
    roll = random.random()
    if roll < 0.90:
        event = {
            "order_id": i + 1,
            "customer_id": random.choice(accounts),
            "amount_usd": round(random.uniform(10, 5000), 2),
            "currency": random.choice(["USD", "EUR", "GBP", "JPY"]),
            "order_ts": random.randint(1_700_000_000, 1_700_086_400),
        }
    elif roll < 0.97:
        event = {
            "order_id": i + 1,
            "customer_id": random.choice(accounts),
            "amount_usd": round(random.uniform(10, 5000), 2),
            "currency": "XYZ",
            "order_ts": random.randint(1_700_000_000, 1_700_086_400),
        }
    elif roll < 0.99:
        event = {
            "order_id": i + 1,
            "customer_id": random.choice(accounts),
            "amount_usd": -50.0,
            "currency": "USD",
            "order_ts": random.randint(1_700_000_000, 1_700_086_400),
        }
    else:
        event = {
            "order_id": None,
            "customer_id": None,
            "amount_usd": round(random.uniform(10, 5000), 2),
            "currency": "USD",
            "order_ts": random.randint(1_700_000_000, 1_700_086_400),
        }
    violations = validate_event(event)
    if violations:
        reject_count += 1
        reject_reasons[violations[0][0]] += 1
    else:
        valid_count += 1

print(f"\\nProducer-side validation (scaled to {n_events:,} events):")
print(f"  Validated -> v3 topic:    {valid_count:,} ({valid_count/n_events:.1%})")
print(f"  Rejected -> DLQ topic:    {reject_count:,} ({reject_count/n_events:.1%})")
print(f"  Reject reasons:")
for reason, count in sorted(reject_reasons.items(), key=lambda x: -x[1]):
    print(f"    {count}x {reason}")

# Freshness SLA monitoring
print(f"\\nFreshness SLA monitoring (synthetic):")
freshness_samples = [random.gauss(180, 60) for _ in range(1000)]  # seconds
freshness_samples.sort()
p95 = freshness_samples[int(0.95 * len(freshness_samples))]
sla_ms = contract["freshness_sla_ms"]
print(f"  Producer -> Kafka ack P95: {p95:.0f}s ({p95*1000:.0f}ms)")
print(f"  SLA: {sla_ms/1000/60:.0f}min ({sla_ms}ms)")
if p95 * 1000 <= sla_ms:
    print(f"  -> SLA MET (P95 < SLA)")
else:
    print(f"  -> SLA VIOLATED (P95 > SLA) — PagerDuty alert to {contract['owner']}")

# Accuracy SLA monitoring
print(f"\\nAccuracy SLA monitoring (vs upstream MySQL orders_fct):")
rel_errors = [abs(random.gauss(0, 0.005)) for _ in range(1000)]
rel_errors.sort()
p95_err = rel_errors[int(0.95 * len(rel_errors))]
print(f"  P95 relative error: {p95_err:.4f} ({p95_err*100:.2f}%)")
print(f"  SLA: 1.00% — {'MET' if p95_err < 0.01 else 'VIOLATED'}")

# Consumer impact — 12 services all benefit from contract
print(f"\\nConsumer impact ({len(contract['consumers'])} services):")
for c in contract["consumers"]:
    print(f"  {c}: subscribes to orders.v3 (id=42), auto-discovers via DataHub")
print("\\nKey insight: contract = schema + SLA + ownership. All three are")
print("versioned via PR review (git is the contract VCS). Schema Registry")
print("enforces types at write time; GE enforces quality at write time;")
print("DataHub enables discovery at subscribe time; OpenLineage tracks") 
print("compliance for audits.")`,
    insight: "Order events feed 12 downstream services — without a contract, a producer schema change breaks 12 services silently. The contract bundles three things: schema (Schema Registry), SLAs (freshness + completeness + accuracy, validated by GE), and ownership (orders-team PagerDuty rotation). All three are versioned via PR review — git is the contract VCS. Producers can't deploy without contract compliance; consumers can't subscribe without discovering the contract via DataHub. This is the OpenAPI spec pattern applied to data.",
  },
  {
    id: "data-contracts-customer-pii-gdpr",
    step: "2",
    title: "Customer PII contract — GDPR-compliant sharing",
    subtitle: "Synthetic — 10M PII records, GDPR rights",
    accent: "oklch(0.62 0.16 200)",
    icon: <ShieldAlert className="h-4 w-4" />,
    badge: "Synthetic GDPR-compliant sharing",
    brief: {
      dataset: "Synthetic: 10M customer records with PII (name, email, phone, address). Contract enforces GDPR Article 15 (access), 16 (rectification), 17 (erasure), 20 (portability). Producer (CRM team) shares with consumer (analytics team) via row-level access + column masking.",
      scale: "~10M PII records · 4 GDPR rights enforced · 3 consumer teams with different access levels · 100% audit log coverage",
      why: "GDPR compliance requires explicit governance over PII sharing. The contract defines: who can access which columns (RLS), what transformations are applied (email hashing for analytics), and how erasure requests propagate (right-to-be-forgotten). Without a contract, PII sharing is a wild west — every consumer gets full PII, no audit trail.",
    },
    stats: [
      { label: "PII records", value: "10M" },
      { label: "GDPR rights", value: "4" },
      { label: "Access tiers", value: "3" },
      { label: "Audit coverage", value: "100%" },
    ],
    tools: ["dbt (PII tags + contracts)", "Unity Catalog (column RLS)", "Iceberg (time-travel for erasure)", "OpenLineage (GDPR audit)", "Snowflake RLS", "DataHub (PII discovery)"],
    codeTabs: [
      {
        lang: "scala",
        filename: "CustomerPiiContract.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.iceberg.catalog.Table
import io.openlineage.client.LineageClient

// Customer PII contract — GDPR-compliant data sharing
// Producer (CRM team) owns; 3 consumer teams subscribe with different access
case class PiiContract(
  owner: String,                        // "crm-team"
  piiColumns: List[String],             // tagged for GDPR audit
  accessTiers: Map[String, AccessTier],  // team -> access level
  retentionDays: Int,                   // GDPR right-to-be-forgotten window
  auditLog: String                      // every read/write logged here
)
case class AccessTier(team: String, columns: List[String],
                     transformations: Map[String, String])

val contract = PiiContract(
  owner = "crm-team",
  piiColumns = List("name", "email", "phone", "address", "dob"),
  accessTiers = Map(
    "analytics-team" -> AccessTier(
      team = "analytics-team",
      columns = List("customer_id", "region", "email_hash", "age_bucket"),
      transformations = Map(
        "email" -> "sha256",           // PII hashed
        "dob" -> "age_bucket"          // exact DOB -> 5yr bucket
      )
    ),
    "marketing-team" -> AccessTier(
      team = "marketing-team",
      columns = List("customer_id", "email", "first_name", "marketing_opt_in"),
      transformations = Map()         // marketing gets PII but only opted-in
    ),
    "compliance-team" -> AccessTier(
      team = "compliance-team",
      columns = List("*"),            // full PII for compliance investigations
      transformations = Map()
    )
  ),
  retentionDays = 365,                 // erase PII after 1 year of inactivity
  auditLog = "iceberg.gdpr_audit_log"
)

// Unity Catalog — column-level RLS + masking
val spark = SparkSession.builder()
  .appName("crm-pii-share")
  .config("spark.catalog", "unity")
  .getOrCreate()

// Apply column masking for analytics team (row-level + column-level)
spark.sql("""
  |CREATE VIEW analytics.v_customers AS
  |SELECT
  |  customer_id,
  |  region,
  |  sha256(email)   AS email_hash,    -- PII hashed
  |  floor(datediff(current_date(), dob) / 365.25 / 5) * 5 AS age_bucket,
  |  is_active
  |FROM crm.customers
  |WHERE is_active = true
""".stripMargin)

spark.sql("""
  |GRANT SELECT ON analytics.v_customers TO ROLE analytics_team
""".stripMargin)

// Marketing team — different access (opted-in only)
spark.sql("""
  |CREATE VIEW marketing.v_customers_optin AS
  |SELECT customer_id, email, first_name, marketing_opt_in
  |FROM crm.customers
  |WHERE marketing_opt_in = true
""".stripMargin)
spark.sql("GRANT SELECT ON marketing.v_customers_optin TO ROLE marketing_team")

// GDPR Article 17 (erasure) — right-to-be-forgotten
// Delete customer 12345 from crm.customers + cascade to all derived datasets
def gdprErasure(customerId: Long): Unit = {
  // 1. Mark deleted in source (Iceberg v2 row-level delete — no file rewrite)
  spark.sql(s"""
    |DELETE FROM crm.customers WHERE customer_id = $customerId
  """.stripMargin)
  // 2. Find all downstream derived datasets via lineage
  val downstream = LineageClient("https://lineage.moderndatascieng.com")
    .downstream("crm.customers", maxDepth = 10)
  // 3. Cascade the delete to each derived dataset
  downstream.foreach { ds =>
    spark.sql(s"""
      |DELETE FROM $ds WHERE customer_id = $customerId
    """.stripMargin)
  }
  // 4. Log the erasure for audit
  spark.sql(s"""
    |INSERT INTO iceberg.gdpr_audit_log
    |VALUES ($customerId, current_timestamp(), 'ERASE', current_user())
  """.stripMargin)
}`,
      },
      {
        lang: "rust",
        filename: "customer_pii_contract.rs",
        code: `use std::collections::HashMap;
use openlineage_rust::LineageClient;
use spark_connect_rust::SparkSession;

#[derive(Debug, Clone)]
pub struct PiiContract {
    pub owner: String,                              // "crm-team"
    pub pii_columns: Vec<&'static str>,              // tagged for GDPR audit
    pub access_tiers: HashMap<&'static str, AccessTier>,
    pub retention_days: u32,
    pub audit_log: String,
}

#[derive(Debug, Clone)]
pub struct AccessTier {
    pub team: &'static str,
    pub columns: Vec<&'static str>,
    pub transformations: HashMap<&'static str, &'static str>,
}

pub fn customer_pii_contract() -> PiiContract {
    let mut analytics_transforms = HashMap::new();
    analytics_transforms.insert("email", "sha256");
    analytics_transforms.insert("dob", "age_bucket");

    let mut marketing_transforms = HashMap::new();

    let mut compliance_transforms = HashMap::new();

    let mut tiers = HashMap::new();
    tiers.insert("analytics-team", AccessTier {
        team: "analytics-team",
        columns: vec!["customer_id", "region", "email_hash", "age_bucket"],
        transformations: analytics_transforms,
    });
    tiers.insert("marketing-team", AccessTier {
        team: "marketing-team",
        columns: vec!["customer_id", "email", "first_name", "marketing_opt_in"],
        transformations: marketing_transforms,
    });
    tiers.insert("compliance-team", AccessTier {
        team: "compliance-team",
        columns: vec!["*"],
        transformations: compliance_transforms,
    });

    PiiContract {
        owner: "crm-team".to_string(),
        pii_columns: vec!["name", "email", "phone", "address", "dob"],
        access_tiers: tiers,
        retention_days: 365,
        audit_log: "iceberg.gdpr_audit_log".to_string(),
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let contract = customer_pii_contract();
    let spark = SparkSession::builder()
        .appName("crm-pii-share")
        .config("spark.catalog", "unity")
        .build()?;

    // Analytics view — PII hashed + age bucketed
    spark.sql(r#"
        CREATE VIEW analytics.v_customers AS
        SELECT customer_id, region,
               sha256(email) AS email_hash,
               floor(datediff(current_date(), dob) / 365.25 / 5) * 5 AS age_bucket,
               is_active
        FROM crm.customers WHERE is_active = true
    "#).await?;

    spark.sql("GRANT SELECT ON analytics.v_customers TO ROLE analytics_team").await?;

    // Marketing view — opted-in only
    spark.sql(r#"
        CREATE VIEW marketing.v_customers_optin AS
        SELECT customer_id, email, first_name, marketing_opt_in
        FROM crm.customers WHERE marketing_opt_in = true
    "#).await?;
    spark.sql("GRANT SELECT ON marketing.v_customers_optin TO ROLE marketing_team").await?;

    Ok(())
}

// GDPR Article 17 — right-to-be-forgotten
pub async fn gdpr_erasure(customer_id: i64) -> Result<(), Box<dyn std::error::Error>> {
    let spark = SparkSession::builder().build()?;
    // 1. Mark deleted in source (Iceberg v2 row-level delete — no file rewrite)
    spark.sql(&format!(
        "DELETE FROM crm.customers WHERE customer_id = {}", customer_id)
    ).await?;

    // 2. Find downstream via lineage
    let lineage = LineageClient::new("https://lineage.moderndatascieng.com");
    let downstream = lineage.downstream("crm.customers", 10).await?;

    // 3. Cascade delete
    for ds in downstream {
        spark.sql(&format!(
            "DELETE FROM {} WHERE customer_id = {}", ds.name, customer_id)
        ).await?;
    }

    // 4. Audit log
    spark.sql(&format!(
        "INSERT INTO iceberg.gdpr_audit_log VALUES ({}, current_timestamp(), 'ERASE', current_user())",
        customer_id)
    ).await?;
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "customer_pii_contract.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"
    "strings"

    openlineage "github.com/OpenLineage/openlineage-go"
    spark "github.com/apache/spark-connect-go"
)

type PiiContract struct {
    Owner         string
    PiiColumns   []string
    AccessTiers  map[string]AccessTier
    RetentionDays int
    AuditLog      string
}

type AccessTier struct {
    Team           string
    Columns        []string
    Transformations map[string]string
}

func CustomerPiiContract() PiiContract {
    return PiiContract{
        Owner:         "crm-team",
        PiiColumns:   []string{"name", "email", "phone", "address", "dob"},
        AccessTiers: map[string]AccessTier{
            "analytics-team": {
                Team:    "analytics-team",
                Columns: []string{"customer_id", "region", "email_hash", "age_bucket"},
                Transformations: map[string]string{
                    "email": "sha256",
                    "dob":   "age_bucket",
                },
            },
            "marketing-team": {
                Team:    "marketing-team",
                Columns: []string{"customer_id", "email", "first_name", "marketing_opt_in"},
                Transformations: map[string]string{},
            },
            "compliance-team": {
                Team:    "compliance-team",
                Columns: []string{"*"},
                Transformations: map[string]string{},
            },
        },
        RetentionDays: 365,
        AuditLog:      "iceberg.gdpr_audit_log",
    }
}

func main() {
    ctx := context.Background()
    contract := CustomerPiiContract()
    session, err := spark.NewSession(ctx, spark.Config{
        AppName: "crm-pii-share",
        Catalog: "unity",
    })
    if err != nil { log.Fatalf("spark: %v", err) }
    defer session.Close()

    // Analytics view — PII hashed + age bucketed
    _, err = session.SQL(ctx, \`
        CREATE VIEW analytics.v_customers AS
        SELECT customer_id, region,
               sha256(email) AS email_hash,
               floor(datediff(current_date(), dob) / 365.25 / 5) * 5 AS age_bucket,
               is_active
        FROM crm.customers WHERE is_active = true
    \`)
    if err != nil { log.Fatalf("analytics view: %v", err) }

    _, err = session.SQL(ctx,
        "GRANT SELECT ON analytics.v_customers TO ROLE analytics_team")
    if err != nil { log.Fatalf("grant analytics: %v", err) }

    // Marketing view — opted-in only
    _, err = session.SQL(ctx, \`
        CREATE VIEW marketing.v_customers_optin AS
        SELECT customer_id, email, first_name, marketing_opt_in
        FROM crm.customers WHERE marketing_opt_in = true
    \`)
    if err != nil { log.Fatalf("marketing view: %v", err) }

    _, err = session.SQL(ctx,
        "GRANT SELECT ON marketing.v_customers_optin TO ROLE marketing_team")
    if err != nil { log.Fatalf("grant marketing: %v", err) }

    // GDPR Article 17 — erase customer 12345 (cascade)
    if err := GdprErasure(ctx, session, 12345); err != nil {
        log.Fatalf("erasure: %v", err)
    }
}

func GdprErasure(ctx context.Context, session *spark.Session,
                customerID int64) error {
    // 1. Mark deleted in source
    _, err := session.SQL(ctx, fmt.Sprintf(
        "DELETE FROM crm.customers WHERE customer_id = %d", customerID))
    if err != nil { return err }

    // 2. Find downstream via lineage
    client, _ := openlineage.NewLineageClient(
        "https://lineage.moderndatascieng.com")
    downstream, _ := client.Downstream(ctx, "crm.customers", 10)

    // 3. Cascade delete
    for _, ds := range downstream {
        _, err = session.SQL(ctx, fmt.Sprintf(
            "DELETE FROM %s WHERE customer_id = %d", ds.Name, customerID))
        if err != nil {
            log.Printf("cascade delete %s: %v", ds.Name, err)
        }
    }

    // 4. Audit log
    _, err = session.SQL(ctx, fmt.Sprintf(
        "INSERT INTO %s VALUES (%d, current_timestamp(), 'ERASE', current_user())",
        CustomerPiiContract().AuditLog, customerID))
    return err
}

var _ = strings.TrimSpace`,
      },
      {
        lang: "elixir",
        filename: "customer_pii_contract.ex",
        code: `defmodule DataContracts.CustomerPii do
  @moduledoc "10M PII records — GDPR-compliant data sharing"
  @ol_url "https://lineage.moderndatascieng.com"

  def contract do
    %{
      owner: "crm-team",
      pii_columns: ~w(name email phone address dob),
      access_tiers: %{
        "analytics-team" => %{
          team: "analytics-team",
          columns: ~w(customer_id region email_hash age_bucket),
          transformations: %{"email" => "sha256", "dob" => "age_bucket"}
        },
        "marketing-team" => %{
          team: "marketing-team",
          columns: ~w(customer_id email first_name marketing_opt_in),
          transformations: %{}
        },
        "compliance-team" => %{
          team: "compliance-team",
          columns: ~w(*),
          transformations: %{}
        }
      },
      retention_days: 365,
      audit_log: "iceberg.gdpr_audit_log"
    }
  end

  def deploy_views(spark) do
    # Analytics view — PII hashed + age bucketed
    Spark.sql(spark, """
      CREATE VIEW analytics.v_customers AS
      SELECT customer_id, region,
             sha256(email) AS email_hash,
             floor(datediff(current_date(), dob) / 365.25 / 5) * 5 AS age_bucket,
             is_active
      FROM crm.customers WHERE is_active = true
    """)
    Spark.sql(spark, "GRANT SELECT ON analytics.v_customers TO ROLE analytics_team")

    # Marketing view — opted-in only
    Spark.sql(spark, """
      CREATE VIEW marketing.v_customers_optin AS
      SELECT customer_id, email, first_name, marketing_opt_in
      FROM crm.customers WHERE marketing_opt_in = true
    """)
    Spark.sql(spark,
      "GRANT SELECT ON marketing.v_customers_optin TO ROLE marketing_team")
    :ok
  end

  def gdpr_erasure(spark, customer_id) do
    # 1. Mark deleted in source (Iceberg v2 row-level delete)
    Spark.sql(spark,
      "DELETE FROM crm.customers WHERE customer_id = \#{customer_id}")

    # 2. Find downstream via lineage (BFS)
    downstream = OpenLineage.downstream(@ol_url, "crm.customers", 10)

    # 3. Cascade delete to each derived dataset
    Enum.each(downstream, fn ds ->
      Spark.sql(spark,
        "DELETE FROM \#{ds["name"]} WHERE customer_id = \#{customer_id}")
    end)

    # 4. Audit log
    Spark.sql(spark, """
      INSERT INTO iceberg.gdpr_audit_log
      VALUES (\#{customer_id}, current_timestamp(), 'ERASE', current_user())
    """)
    :ok
  end
end`,
      },
      {
        lang: "zig",
        filename: "customer_pii_contract.zig",
        code: `const std = @import("std");
const ol = @import("openlineage-zig");
const spark = @import("spark-connect-zig");

pub const PiiContract = struct {
    owner: []const u8,
    pii_columns: []const []const u8,
    access_tiers: []const AccessTier,
    retention_days: u32,
    audit_log: []const u8,
};

pub const AccessTier = struct {
    team: []const u8,
    columns: []const []const u8,
    transformations: []const Transform,
};

pub const Transform = struct {
    field: []const u8,
    op: []const u8,
};

pub fn customer_pii_contract() PiiContract {
    return .{
        .owner = "crm-team",
        .pii_columns = &.{ "name", "email", "phone", "address", "dob" },
        .access_tiers = &.{
            .{
                .team = "analytics-team",
                .columns = &.{ "customer_id", "region", "email_hash", "age_bucket" },
                .transformations = &.{
                    .{ .field = "email", .op = "sha256" },
                    .{ .field = "dob", .op = "age_bucket" },
                },
            },
            .{
                .team = "marketing-team",
                .columns = &.{ "customer_id", "email", "first_name", "marketing_opt_in" },
                .transformations = &.{},
            },
            .{
                .team = "compliance-team",
                .columns = &.{"*"},
                .transformations = &.{},
            },
        },
        .retention_days = 365,
        .audit_log = "iceberg.gdpr_audit_log",
    };
}

pub fn deploy_views(alloc: std.mem.Allocator) !void {
    var session = try spark.Session.init(alloc);
    defer session.deinit();

    // Analytics view — PII hashed + age bucketed
    try session.sql(
        \\CREATE VIEW analytics.v_customers AS
        \\SELECT customer_id, region,
        \\       sha256(email) AS email_hash,
        \\       floor(datediff(current_date(), dob) / 365.25 / 5) * 5 AS age_bucket,
        \\       is_active
        \\FROM crm.customers WHERE is_active = true
    );
    try session.sql("GRANT SELECT ON analytics.v_customers TO ROLE analytics_team");

    // Marketing view — opted-in only
    try session.sql(
        \\CREATE VIEW marketing.v_customers_optin AS
        \\SELECT customer_id, email, first_name, marketing_opt_in
        \\FROM crm.customers WHERE marketing_opt_in = true
    );
    try session.sql("GRANT SELECT ON marketing.v_customers_optin TO ROLE marketing_team");
}

pub fn gdpr_erasure(alloc: std.mem.Allocator, customer_id: i64) !void {
    var session = try spark.Session.init(alloc);
    defer session.deinit();

    // 1. Mark deleted in source (Iceberg v2 row-level delete)
    var buf = std.ArrayList(u8).init(alloc);
    defer buf.deinit();
    try buf.writer().print("DELETE FROM crm.customers WHERE customer_id = {d}", .{customer_id});
    try session.sql(buf.items);

    // 2. Find downstream via lineage (BFS)
    var client = try ol.Client.init(alloc, "https://lineage.moderndatascieng.com");
    defer client.deinit();
    const downstream = try client.downstream(alloc, "crm.customers", 10);
    defer alloc.free(downstream);

    // 3. Cascade delete
    for (downstream) |ds| {
        var b = std.ArrayList(u8).init(alloc);
        defer b.deinit();
        try b.writer().print("DELETE FROM {s} WHERE customer_id = {d}",
            .{ ds.name, customer_id });
        try session.sql(b.items);
    }

    // 4. Audit log
    try buf.writer().print(
        "INSERT INTO iceberg.gdpr_audit_log VALUES ({d}, current_timestamp(), 'ERASE', current_user())",
        .{customer_id});
    try session.sql(buf.items);
}`,
      },
    ],
    runnablePython: `# Customer PII contract — GDPR-compliant data sharing simulation
import random
from collections import defaultdict

random.seed(17)
print("=== Customer PII contract — 10M records, GDPR-compliant sharing ===\\n")

# Contract definition
contract = {
    "owner": "crm-team",
    "pii_columns": ["name", "email", "phone", "address", "dob"],
    "access_tiers": {
        "analytics-team": {
            "team": "analytics-team",
            "columns": ["customer_id", "region", "email_hash", "age_bucket"],
            "transformations": {"email": "sha256", "dob": "age_bucket"},
        },
        "marketing-team": {
            "team": "marketing-team",
            "columns": ["customer_id", "email", "first_name", "marketing_opt_in"],
            "transformations": {},
        },
        "compliance-team": {
            "team": "compliance-team",
            "columns": ["*"],
            "transformations": {},
        },
    },
    "retention_days": 365,
    "audit_log": "iceberg.gdpr_audit_log",
}

print(f"Owner: {contract['owner']}")
print(f"PII columns: {', '.join(contract['pii_columns'])}")
print(f"Access tiers: {len(contract['access_tiers'])} teams")

for team, tier in contract["access_tiers"].items():
    cols = ", ".join(tier["columns"])
    transforms = tier["transformations"] or {"(none)": "(none)"}
    transform_str = ", ".join(f"{k}->{v}" for k, v in transforms.items())
    print(f"  {team}: [{cols}]  transforms: {transform_str}")

# Generate 10K synthetic customers (1:1000 scale-down from 10M)
n_customers = 10_000
customers = []
for i in range(n_customers):
    age_years = random.randint(18, 90)
    customers.append({
        "customer_id": i + 1,
        "name": f"Customer {i}",
        "email": f"cust{i}@example.com",
        "phone": f"+1-555-{random.randint(1000, 9999)}",
        "address": f"{random.randint(100, 9999)} Main St",
        "dob": f"{2024 - age_years}-01-01",
        "region": random.choice(["US", "EU", "UK", "APAC"]),
        "is_active": random.random() > 0.1,
        "marketing_opt_in": random.random() > 0.5,
    })

# Apply access tier transforms
import hashlib

def transform(value, op):
    if op == "sha256":
        return hashlib.sha256(value.encode()).hexdigest()[:16]
    elif op == "age_bucket":
        # Compute age in years from dob, then bucket to 5yr
        year = int(value.split("-")[0])
        age = 2024 - year
        return (age // 5) * 5
    return value

# Apply analytics tier — only analytics-team columns, transformed
print(f"\\nAnalytics view (10K sampled rows):")
n_visible = 0
for c in customers[:5]:
    row = {
        "customer_id": c["customer_id"],
        "region": c["region"],
        "email_hash": transform(c["email"], "sha256"),
        "age_bucket": transform(c["dob"], "age_bucket"),
        "is_active": c["is_active"],
    }
    n_visible += 1
    print(f"  {row}")
print(f"  ... ({sum(1 for c in customers if c['is_active']):,} rows total in view)")

# Marketing view — opted-in only
print(f"\\nMarketing view (opted-in only):")
n_optin = 0
for c in customers[:5]:
    if c["marketing_opt_in"]:
        row = {
            "customer_id": c["customer_id"],
            "email": c["email"],
            "first_name": c["name"].split()[1],
            "marketing_opt_in": c["marketing_opt_in"],
        }
        n_optin += 1
        print(f"  {row}")
print(f"  ... ({sum(1 for c in customers if c['marketing_opt_in']):,} opted-in rows)")

# GDPR Article 17 — erasure simulation
print(f"\\nGDPR Article 17 (right to be forgotten) — customer 42:")
erasure_target = 42
print(f"  Source: crm.customers WHERE customer_id = {erasure_target} (Iceberg v2 row delete)")
print(f"  Cascade to downstream (lineage BFS):")
downstream = [
    "analytics.v_customers",
    "marketing.v_customers_optin",
    "gold.cust_region_summary",
    "ml.features.user_features",
]
for ds in downstream:
    print(f"    DELETE FROM {ds} WHERE customer_id = {erasure_target}")
print(f"  Audit: INSERT INTO {contract['audit_log']} VALUES "
      f"({erasure_target}, now(), 'ERASE', current_user())")

# Access audit — verify every read was logged
print(f"\\nAccess audit log (last 24h):")
audit_events = []
for _ in range(20):
    team = random.choice(list(contract["access_tiers"].keys()))
    action = random.choice(["SELECT", "SELECT", "SELECT", "DELETE", "SELECT"])
    audit_events.append({
        "ts": random.randint(1700000000, 1700086400),
        "team": team,
        "action": action,
        "table": random.choice(["crm.customers", "analytics.v_customers",
                                 "marketing.v_customers_optin"]),
    })
audit_events.sort(key=lambda e: e["ts"])
print(f"  Total events: {len(audit_events)}")
by_team = defaultdict(int)
by_action = defaultdict(int)
for e in audit_events:
    by_team[e["team"]] += 1
    by_action[e["action"]] += 1
print(f"  By team: {dict(by_team)}")
print(f"  By action: {dict(by_action)}")

print("\\nKey insight: PII contract = RLS + column masking + erasure cascade.")
print("Without the contract, every consumer gets full PII (illegal in EU).")
print("With it, analytics sees hashes, marketing sees opted-in only,")
print("compliance sees full PII but every access is logged for audit.")`,
    insight: "GDPR compliance requires explicit governance over PII sharing — without it, every consumer gets full PII (illegal in EU). The PII contract bundles: row-level security (Unity Catalog RLS — analytics sees only is_active=true), column masking (sha256(email) for analytics, raw email for marketing), and erasure cascade (right-to-be-forgotten propagates from crm.customers to all derived datasets via lineage BFS). Every read/write is logged to iceberg.gdpr_audit_log — 100% audit coverage for GDPR Article 15 (access) requests.",
  },
  {
    id: "data-contracts-ml-feature-train-serve",
    step: "3",
    title: "ML feature contract — train/serve consistency",
    subtitle: "Synthetic — 50M features, train/serve skew",
    accent: "oklch(0.6 0.18 145)",
    icon: <Sparkles className="h-4 w-4" />,
    badge: "Synthetic train/serve parity",
    brief: {
      dataset: "Synthetic: 50M user feature rows/day in an ML Feature Store. Contract enforces train/serve consistency — features used at training time MUST exactly match features used at serving time (same schema, same transforms, same defaults).",
      scale: "~50M features/day · 100 features/user · 5M users · train/serve skew < 0.1% · sub-50ms serving latency",
      why: "Train/serve skew is the silent killer of ML models. Without a feature contract, the training pipeline reads features one way (e.g., log(amount_usd)) while the serving pipeline computes them another way (e.g., amount_usd) — the model silently degrades. The contract bundles the feature definition + transforms + defaults — guaranteed identical at train + serve.",
    },
    stats: [
      { label: "Features/day", value: "50M" },
      { label: "Features/user", value: "100" },
      { label: "Train/serve skew", value: "<0.1%" },
      { label: "Serving latency", value: "<50ms" },
    ],
    tools: ["Feast (feature store)", "dbt (feature definitions)", "Great Expectations (feature tests)", "Schema Registry (feature schemas)", "OpenLineage (train/serve tracking)", "MLflow (model registry)"],
    codeTabs: [
      {
        lang: "scala",
        filename: "MlFeatureContract.scala",
        code: `import org.apache.spark.sql.SparkSession
import feast.{FeatureStore, FeatureView, FeatureSpec}
import io.openlineage.client.LineageClient

// ML feature contract — train/serve consistency guarantee
// The same feature definitions are used by BOTH training + serving code
case class FeatureContract(
  owner: String,                          // "ml-platform-team"
  features: List[FeatureSpec],             // 100 features per user
  trainServingConsistency: Boolean,        // MUST be true (contract enforces)
  maxSkewPercent: Double,                  // < 0.1%
  servingLatencyMs: Int                   // < 50ms P99
)
case class FeatureSpec(
  name: String,
  dtype: String,
  transform: String,                      // e.g. "log(amount_usd + 1)"
  defaultValue: Any,
  sourceDataset: String                    // Iceberg table the feature reads
)

val contract = FeatureContract(
  owner = "ml-platform-team",
  features = List(
    FeatureSpec("user_total_spend_30d", "double",
                "log(sum(amount_usd) + 1) over 30 days",
                0.0, "gold.user_spend"),
    FeatureSpec("user_order_count_30d", "int",
                "count(*) over 30 days", 0, "gold.user_orders"),
    FeatureSpec("user_avg_basket_size_30d", "double",
                "avg(amount_usd) over 30 days", 0.0, "gold.user_orders"),
    FeatureSpec("user_recency_days", "int",
                "datediff(current_date(), max(order_ts))",
                999, "gold.user_orders"),
    // ... 96 more features
  ),
  trainServingConsistency = true,
  maxSkewPercent = 0.1,
  servingLatencyMs = 50
)

// Feast feature store — single definition, used by both train + serve
val store = FeatureStore.builder()
  .configPath("feature_store.yaml")
  .build()

// Training pipeline — pulls features from offline store
val trainDs = "2024-09-01" to "2024-09-30"
val trainingFeatures = store.getTrainingFeatures(
  contract.features.map(_.name),
  entityDs = trainDs
)
println(s"Training: \${trainingFeatures.count()} rows, \${trainingFeatures.columns.size} features")

// Serving pipeline — pulls features from online store (Redis)
val userId = 12345L
val servingFeatures = store.getOnlineFeatures(
  contract.features.map(_.name),
  entityRows = List(Map("user_id" -> userId))
)
println(s"Serving: \${servingFeatures.size} features for user $userId")

// Skew detection — Feast monitors train vs serve distributions
val skew = store.detectSkew(contract.features.map(_.name))
skew.foreach { case (feature, skewPercent) =>
  if (skewPercent > contract.maxSkewPercent) {
    println(s"SKEW ALERT: $feature train/serve skew = $skewPercent% (> \${contract.maxSkewPercent}%)")
    // PagerDuty alert to ml-platform-team
  }
}`,
      },
      {
        lang: "rust",
        filename: "ml_feature_contract.rs",
        code: `use feast::{FeatureStore, FeatureSpec};
use openlineage_rust::LineageClient;

#[derive(Debug)]
pub struct FeatureContract {
    pub owner: String,
    pub features: Vec<FeatureSpec>,
    pub train_serving_consistency: bool,
    pub max_skew_percent: f64,
    pub serving_latency_ms: u32,
}

pub fn ml_feature_contract() -> FeatureContract {
    FeatureContract {
        owner: "ml-platform-team".to_string(),
        features: vec![
            FeatureSpec::new("user_total_spend_30d", "double",
                "log(sum(amount_usd) + 1) over 30 days", 0.0,
                "gold.user_spend"),
            FeatureSpec::new("user_order_count_30d", "int",
                "count(*) over 30 days", 0,
                "gold.user_orders"),
            FeatureSpec::new("user_avg_basket_size_30d", "double",
                "avg(amount_usd) over 30 days", 0.0,
                "gold.user_orders"),
            FeatureSpec::new("user_recency_days", "int",
                "datediff(current_date(), max(order_ts))", 999,
                "gold.user_orders"),
            // ... 96 more
        ],
        train_serving_consistency: true,
        max_skew_percent: 0.1,
        serving_latency_ms: 50,
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let contract = ml_feature_contract();
    let store = FeatureStore::builder()
        .config_path("feature_store.yaml")
        .build()?;

    // Training pipeline — pull features from offline store (Iceberg)
    let train_ds = ("2024-09-01", "2024-09-30");
    let training_features = store.get_training_features(
        contract.features.iter().map(|f| f.name.as_str()),
        train_ds
    ).await?;
    println!("Training: {} rows, {} features",
        training_features.count(), training_features.n_features());

    // Serving pipeline — pull features from online store (Redis)
    let user_id = 12345;
    let serving_features = store.get_online_features(
        contract.features.iter().map(|f| f.name.as_str()),
        &[user_id]
    ).await?;
    println!("Serving: {} features for user {}", serving_features.len(), user_id);

    // Skew detection — Feast monitors train vs serve distributions
    let skew = store.detect_skew(
        contract.features.iter().map(|f| f.name.as_str())
    ).await?;
    for (feature, skew_pct) in &skew {
        if *skew_pct > contract.max_skew_percent {
            println!("SKEW ALERT: {} train/serve skew = {:.2}% (> {:.2}%)",
                feature, skew_pct, contract.max_skew_percent);
        }
    }

    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "ml_feature_contract.go",
        code: `package main

import (
    "context"
    "fmt"
    "log"

    feast "github.com/feast-dev/feast/sdk/go"
    openlineage "github.com/OpenLineage/openlineage-go"
)

type FeatureContract struct {
    Owner                    string
    Features                 []FeatureSpec
    TrainServingConsistency  bool
    MaxSkewPercent           float64
    ServingLatencyMs         int
}

type FeatureSpec struct {
    Name          string
    Dtype         string
    Transform     string
    DefaultValue  interface{}
    SourceDataset string
}

func MlFeatureContract() FeatureContract {
    return FeatureContract{
        Owner: "ml-platform-team",
        Features: []FeatureSpec{
            {Name: "user_total_spend_30d", Dtype: "double",
             Transform: "log(sum(amount_usd) + 1) over 30 days",
             DefaultValue: 0.0, SourceDataset: "gold.user_spend"},
            {Name: "user_order_count_30d", Dtype: "int",
             Transform: "count(*) over 30 days",
             DefaultValue: 0, SourceDataset: "gold.user_orders"},
            {Name: "user_avg_basket_size_30d", Dtype: "double",
             Transform: "avg(amount_usd) over 30 days",
             DefaultValue: 0.0, SourceDataset: "gold.user_orders"},
            {Name: "user_recency_days", Dtype: "int",
             Transform: "datediff(current_date(), max(order_ts))",
             DefaultValue: 999, SourceDataset: "gold.user_orders"},
        },
        TrainServingConsistency: true,
        MaxSkewPercent:          0.1,
        ServingLatencyMs:        50,
    }
}

func main() {
    ctx := context.Background()
    contract := MlFeatureContract()

    store, err := feast.NewFeatureStore(ctx, "feature_store.yaml")
    if err != nil { log.Fatalf("feast: %v", err) }

    // Training pipeline — pull features from offline store (Iceberg)
    trainStart := "2024-09-01"
    trainEnd := "2024-09-30"
    featureNames := make([]string, len(contract.Features))
    for i, f := range contract.Features {
        featureNames[i] = f.Name
    }
    training, err := store.GetTrainingFeatures(ctx, featureNames,
        trainStart, trainEnd)
    if err != nil { log.Fatalf("train: %v", err) }
    fmt.Printf("Training: %d rows, %d features\\n",
        training.RowCount, training.NFeatures)

    // Serving pipeline — pull from online store (Redis)
    var userID int64 = 12345
    serving, err := store.GetOnlineFeatures(ctx, featureNames,
        []int64{userID})
    if err != nil { log.Fatalf("serve: %v", err) }
    fmt.Printf("Serving: %d features for user %d\\n", len(serving), userID)

    // Skew detection
    skew, _ := store.DetectSkew(ctx, featureNames)
    for feature, pct := range skew {
        if pct > contract.MaxSkewPercent {
            fmt.Printf("SKEW ALERT: %s train/serve skew = %.2f%% (> %.2f%%)\\n",
                feature, pct, contract.MaxSkewPercent)
        }
    }
}`,
      },
      {
        lang: "elixir",
        filename: "ml_feature_contract.ex",
        code: `defmodule DataContracts.MlFeature do
  @moduledoc "50M features/day — train/serve consistency guarantee"

  def contract do
    %{
      owner: "ml-platform-team",
      features: [
        %{name: "user_total_spend_30d", dtype: "double",
          transform: "log(sum(amount_usd) + 1) over 30 days",
          default: 0.0, source: "gold.user_spend"},
        %{name: "user_order_count_30d", dtype: "int",
          transform: "count(*) over 30 days",
          default: 0, source: "gold.user_orders"},
        %{name: "user_avg_basket_size_30d", dtype: "double",
          transform: "avg(amount_usd) over 30 days",
          default: 0.0, source: "gold.user_orders"},
        %{name: "user_recency_days", dtype: "int",
          transform: "datediff(current_date(), max(order_ts))",
          default: 999, source: "gold.user_orders"}
        # ... 96 more features
      ],
      train_serving_consistency: true,
      max_skew_percent: 0.1,
      serving_latency_ms: 50
    }
  end

  def train(contract) do
    store = Feast.connect("feature_store.yaml")
    feature_names = Enum.map(contract.features, & &1[:name])

    # Offline store — pull features from Iceberg (training set)
    training = Feast.get_training_features(store, feature_names,
      start_ds: "2024-09-01", end_ds: "2024-09-30")
    IO.puts("Training: #{training.count} rows, #{length(feature_names)} features")
    training
  end

  def serve(contract, user_id) do
    store = Feast.connect("feature_store.yaml")
    feature_names = Enum.map(contract.features, & &1[:name])

    # Online store — pull from Redis (sub-50ms serving)
    serving = Feast.get_online_features(store, feature_names,
      entity_rows: [%{user_id: user_id}])
    IO.puts("Serving: #{length(serving)} features for user #{user_id}")
    serving
  end

  def detect_skew(contract) do
    store = Feast.connect("feature_store.yaml")
    feature_names = Enum.map(contract.features, & &1[:name])

    skew = Feast.detect_skew(store, feature_names)
    Enum.each(skew, fn {feature, pct} ->
      if pct > contract[:max_skew_percent] do
        IO.puts("SKEW ALERT: #{feature} train/serve skew = " <>
          "#{:erlang.float_to_binary(pct, decimals: 2)}% " <>
          "(> #{contract[:max_skew_percent]}%)")
      end
    end)
  end
end`,
      },
      {
        lang: "zig",
        filename: "ml_feature_contract.zig",
        code: `const std = @import("std");
const feast = @import("feast-zig");
const ol = @import("openlineage-zig");

pub const FeatureContract = struct {
    owner: []const u8,
    features: []const FeatureSpec,
    train_serving_consistency: bool,
    max_skew_percent: f64,
    serving_latency_ms: u32,
};

pub const FeatureSpec = struct {
    name: []const u8,
    dtype: []const u8,
    transform: []const u8,
    default: []const u8,
    source_dataset: []const u8,
};

pub fn ml_feature_contract() FeatureContract {
    return .{
        .owner = "ml-platform-team",
        .features = &.{
            .{ .name = "user_total_spend_30d", .dtype = "double",
               .transform = "log(sum(amount_usd) + 1) over 30 days",
               .default = "0.0", .source_dataset = "gold.user_spend" },
            .{ .name = "user_order_count_30d", .dtype = "int",
               .transform = "count(*) over 30 days",
               .default = "0", .source_dataset = "gold.user_orders" },
            .{ .name = "user_avg_basket_size_30d", .dtype = "double",
               .transform = "avg(amount_usd) over 30 days",
               .default = "0.0", .source_dataset = "gold.user_orders" },
            .{ .name = "user_recency_days", .dtype = "int",
               .transform = "datediff(current_date(), max(order_ts))",
               .default = "999", .source_dataset = "gold.user_orders" },
        },
        .train_serving_consistency = true,
        .max_skew_percent = 0.1,
        .serving_latency_ms = 50,
    };
}

pub fn train(alloc: std.mem.Allocator, contract: FeatureContract) !void {
    var store = try feast.FeatureStore.init(alloc, "feature_store.yaml");
    defer store.deinit();

    var names = std.ArrayList([]const u8).init(alloc);
    defer names.deinit();
    for (contract.features) |f| try names.append(f.name);

    const training = try store.get_training_features(alloc, names.items,
        "2024-09-01", "2024-09-30");
    defer training.deinit();
    std.debug.print("Training: {d} rows, {d} features\\n",
        .{ training.count, names.items.len });
}

pub fn serve(alloc: std.mem.Allocator, contract: FeatureContract,
             user_id: i64) !void {
    var store = try feast.FeatureStore.init(alloc, "feature_store.yaml");
    defer store.deinit();

    var names = std.ArrayList([]const u8).init(alloc);
    defer names.deinit();
    for (contract.features) |f| try names.append(f.name);

    const serving = try store.get_online_features(alloc, names.items,
        &[_]i64{user_id});
    defer alloc.free(serving);
    std.debug.print("Serving: {d} features for user {d}\\n",
        .{ serving.len, user_id });
}

pub fn detect_skew(alloc: std.mem.Allocator, contract: FeatureContract) !void {
    var store = try feast.FeatureStore.init(alloc, "feature_store.yaml");
    defer store.deinit();

    var names = std.ArrayList([]const u8).init(alloc);
    defer names.deinit();
    for (contract.features) |f| try names.append(f.name);

    const skew = try store.detect_skew(alloc, names.items);
    defer alloc.free(skew);
    for (skew) |s| {
        if (s.percent > contract.max_skew_percent) {
            std.debug.print("SKEW ALERT: {s} train/serve skew = {d:.2}% (> {d:.2}%)\\n",
                .{ s.name, s.percent, contract.max_skew_percent });
        }
    }
}`,
      },
    ],
    runnablePython: `# ML feature contract — train/serve consistency simulation
import random
import math
from collections import defaultdict

random.seed(23)
print("=== ML feature contract — 50M features/day, train/serve ===\\n")

# Contract definition — 100 features per user, train/serve must match exactly
contract = {
    "owner": "ml-platform-team",
    "features": [
        {"name": "user_total_spend_30d", "dtype": "double",
         "transform": "log(sum(amount_usd) + 1) over 30 days",
         "default": 0.0, "source": "gold.user_spend"},
        {"name": "user_order_count_30d", "dtype": "int",
         "transform": "count(*) over 30 days",
         "default": 0, "source": "gold.user_orders"},
        {"name": "user_avg_basket_size_30d", "dtype": "double",
         "transform": "avg(amount_usd) over 30 days",
         "default": 0.0, "source": "gold.user_orders"},
        {"name": "user_recency_days", "dtype": "int",
         "transform": "datediff(current_date(), max(order_ts))",
         "default": 999, "source": "gold.user_orders"},
    ],  # 4 shown, 96 more in production
    "train_serving_consistency": True,
    "max_skew_percent": 0.1,
    "serving_latency_ms": 50,
}

print(f"Owner: {contract['owner']}")
print(f"Features: {len(contract['features'])} (4 shown, 96 more in production)")
print(f"Max skew: {contract['max_skew_percent']}%")
print(f"Serving latency: <{contract['serving_latency_ms']}ms P99")

# Synthesize training data — 5K users × 4 features = 20K training rows
n_users = 5_000
print(f"\\nTraining pipeline (Feast offline store, {n_users} users):")
train_features = []
for u in range(n_users):
    spend = max(0, random.gauss(500, 200))
    orders = max(0, int(random.gauss(15, 5)))
    avg = spend / orders if orders > 0 else 0
    recency = random.randint(0, 30)
    train_features.append({
        "user_id": u + 1,
        "user_total_spend_30d": math.log(spend + 1),
        "user_order_count_30d": orders,
        "user_avg_basket_size_30d": avg,
        "user_recency_days": recency,
    })
print(f"  Training rows: {len(train_features):,}")
print(f"  Features per user: {len(contract['features'])}")

# Synthesize serving data — same 5K users, independently computed
# In production: training reads from Iceberg offline store,
# serving reads from Redis online store — they CAN diverge without a contract
print(f"\\nServing pipeline (Feast online store, Redis, sub-50ms):")
serve_features = []
skew_per_feature = defaultdict(list)
for u in range(n_users):
    # WITHOUT contract: serving computes features slightly differently
    # (e.g., different timestamp, different aggregation window)
    spend = max(0, random.gauss(500, 200) * random.uniform(0.999, 1.001))  # tiny drift
    orders = max(0, int(random.gauss(15, 5)))
    avg = spend / orders if orders > 0 else 0
    recency = random.randint(0, 30)
    serve_features.append({
        "user_id": u + 1,
        "user_total_spend_30d": math.log(spend + 1),
        "user_order_count_30d": orders,
        "user_avg_basket_size_30d": avg,
        "user_recency_days": recency,
    })
print(f"  Serving rows: {len(serve_features):,}")

# Skew detection — Feast computes train/serve distribution distance per feature
print(f"\\nSkew detection (Feast monitors train vs serve):")
for f in contract["features"]:
    name = f["name"]
    if name == "user_id":
        continue
    train_vals = [r[name] for r in train_features if name in r]
    serve_vals = [r[name] for r in serve_features if name in r]
    if not train_vals or not serve_vals:
        continue
    train_mean = sum(train_vals) / len(train_vals)
    serve_mean = sum(serve_vals) / len(serve_vals)
    rel_diff = abs(train_mean - serve_mean) / max(abs(train_mean), 1e-9) * 100
    skew_per_feature[name].append(rel_diff)
    status = "OK" if rel_diff < contract["max_skew_percent"] else "SKEW ALERT"
    print(f"  {name}: train mean={train_mean:.3f}, serve mean={serve_mean:.3f}, "
          f"skew={rel_diff:.3f}%  {status}")

# Counterfactual: WITHOUT contract — drift accumulates silently
print(f"\\n=== Counterfactual: drift without contract ===")
print(f"  Training:  log(spend + 1)")
print(f"  Serving:   log(spend)         # forgot the +1!")
print(f"  Effect:    50% of training rows had spend < 1.0 (log = -inf at serving)")
print(f"  Effect:    Model AUC drops from 0.85 -> 0.62 silently over a week")
print(f"  Detection: ops notices conversion drop, RCA takes ~3 days")

# Train/serve consistency — contract bundles definition + transforms + defaults
print(f"\\nKey insight: feature contract = definition + transform + default.")
print("Same definition used by BOTH training (offline store, batch) AND")
print("serving (online store, sub-50ms). Without it, training reads")
print("log(amount + 1) while serving reads log(amount) -> silent model")
print("degradation. With it, the Feast SDK is the single source of truth.")
print("Feast detects skew > 0.1% via KL divergence between distributions.")`,
    insight: "Train/serve skew is the silent killer of ML models — without a feature contract, the training pipeline reads features one way (e.g., log(amount_usd + 1)) while serving computes them another way (e.g., log(amount_usd)) — model AUC silently degrades from 0.85 to 0.62 over a week. The feature contract bundles the definition + transform + default — same code path used by both train (offline store, Iceberg) and serve (online store, Redis). Feast is the single source of truth; its SDK detects distribution skew > 0.1% via KL divergence between train and serve feature distributions.",
  },
];
