// ============================================================
// Scientific dataset examples for Phase G cross-cutting pages
// 8 examples (2 per page × 4 pages) × 5 languages
// Pages: data-mesh-deep-dive, streaming-sql, data-contracts-deep-dive, privacy-enhancing-tech
// All Pyodide demos use only math / random / collections.
// ============================================================

import type { DatasetExample } from "./dataset-cards";
import {
  Database, Atom, Boxes, Zap, TrendingUp, Activity, Cpu,
  Brain, Network, ShieldCheck, Sparkles,
} from "lucide-react";

// ============================================================
// DATA MESH SCIENCE EXAMPLES (2)
// ============================================================

export const MESH_SCIENCE_EXAMPLES: DatasetExample[] = [
  {
    id: "mesh-genomics-data-product",
    step: "1",
    title: "Genomics Variant Calling Data Product",
    subtitle: "Life Sciences — 1000 Genomes variants as a discoverable + addressable + trustworthy data product",
    accent: "oklch(0.65 0.16 30)",
    icon: <Database className="h-4 w-4" />,
    badge: "Life Sciences · Genomics",
    brief: {
      dataset: "1000 Genomes Project — 2,504 individuals, ~3B SNPs published as a governed data product. Discoverable (catalog), addressable (S3 URL), trustworthy (VCF 4.2 spec + SLA), self-describing (schema), interoperable (Arrow + Parquet).",
      scale: "~3B SNPs · 2,504 individuals · 5 mesh characteristics · SLA: freshness ≤24h · completeness ≥99.5% · accuracy ≥99.9%",
      why: "Shows a genomics data product built to mesh spec — every variant caller (GATK, DeepVariant) publishes its output as a versioned, SLA-backed data product. Consumers (clinicians, researchers) discover via the catalog and address by URL — no central gatekeeper.",
    },
    stats: [
      { label: "SNPs", value: "3 billion" },
      { label: "Individuals", value: "2,504" },
      { label: "SLA (freshness)", value: "≤24h" },
      { label: "Characteristics", value: "5/5" },
    ],
    tools: ["Data Mesh", "AWS DataZone", "Delta Lake", "VCF 4.2", "Apache Atlas", "OpenLineage"],
    codeTabs: [
      {
        lang: "scala",
        filename: "GenomicsDataProduct.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

// Genomics data product — discoverable, addressable, trustworthy
val spark = SparkSession.builder().getOrCreate()

// Addressable: published at stable URL with semantic version
val product = spark.read.format("delta")
  .load("s3://mesh-genomics/variants/v2.3.0/")

// SLA enforcement: freshness + completeness + accuracy
val sla = product.agg(
  max("_commit_timestamp").alias("latest"),
  count("*").alias("total"),
  avg("QUAL").alias("avg_qual"))

val freshness_ok = sla.head().getLong(0) >= (System.currentTimeMillis() - 86400000L)
val completeness_ok = sla.head().getLong(1) >= 2985000000L  // 99.5% of 3B
val accuracy_ok = sla.head().getDouble(2) >= 30.0

val pass = freshness_ok && completeness_ok && accuracy_ok
println(s"Data product SLA: pass=\$pass (freshness=\$freshness_ok completeness=\$completeness_ok accuracy=\$accuracy_ok)")`,
      },
      {
        lang: "rust",
        filename: "genomics_data_product.rs",
        code: `use deltalake::DeltaTable;
use std::time::{SystemTime, UNIX_EPOCH};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Addressable + trustworthy: Delta table with SLA check
    let mut table = DeltaTable::load()
        .with_location("s3://mesh-genomics/variants/v2.3.0/")
        .await?;
    table.load().await?;

    let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_millis() as i64;
    let freshness_ok = now - table.get_latest_commit_timestamp() <= 86_400_000;
    let completeness_ok = table.get_count() >= 2_985_000_000;

    let sla_pass = freshness_ok && completeness_ok;
    println!("Genomics mesh SLA: pass={} (freshness={}, n={})",
        sla_pass, freshness_ok, table.get_count());
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "genomics_data_product.go",
        code: `package main

import (
    "fmt"
    "time"
    "github.com/delta-io/delta-go"
)

func main() {
    // Addressable + SLA-backed genomics data product
    store := delta.NewS3Storage()
    table, _ := delta.Load(store, "s3://mesh-genomics/variants/v2.3.0/")
    latest := table.LatestCommitTimestamp()
    freshness := time.Since(time.Unix(0, latest*int64(time.Millisecond)))
    freshnessOK := freshness.Hours() <= 24
    completenessOK := table.Count() >= 2985000000
    fmt.Printf("SLA: freshness_ok=%v (age=%v), completeness_ok=%v (n=%d)\\n",
        freshnessOK, freshness, completenessOK, table.Count())
}`,
      },
      {
        lang: "elixir",
        filename: "genomics_data_product.ex",
        code: `defmodule Mesh.GenomicsDataProduct do
  @moduledoc "Genomics variant data product — 5 mesh characteristics"
  @product_url "s3://mesh-genomics/variants/v2.3.0/"
  @sla_freshness_ms 86_400_000
  @sla_min_count 2_985_000_000

  def check_sla(meta) do
    age_ms = :erlang.system_time(:millisecond) - meta.latest_commit
    freshness_ok = age_ms <= @sla_freshness_ms
    completeness_ok = meta.count >= @sla_min_count
    %{freshness: freshness_ok, completeness: completeness_ok,
      pass: freshness_ok and completeness_ok}
  end

  def addressable_url, do: @product_url
end`,
      },
      {
        lang: "zig",
        filename: "genomics_data_product.zig",
        code: `const std = @import("std");
const delta = @import("delta-zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const alloc = gpa.allocator();

    // Addressable + trustworthy: Delta table at stable URL
    var table = try delta.Table.load(alloc, "s3://mesh-genomics/variants/v2.3.0/");
    defer table.deinit();

    const now_ms: i64 = @divFloor(std.time.milliTimestamp(), 1);
    const freshness_ok = (now_ms - table.latest_commit_ms) <= 86_400_000;
    const completeness_ok = table.count >= 2_985_000_000;
    const pass = freshness_ok and completeness_ok;
    std.debug.print("SLA: pass={} freshness={} n={}\\n", .{pass, freshness_ok, table.count});
}`,
      },
    ],
    runnablePython: `# Genomics data product SLA simulation — Pyodide (math/random only)
import math, random
print("=== Genomics Data Product — Mesh SLA ===")
print("Data product: 1000 Genomes variants (v2.3.0)")
print("5 mesh characteristics: discoverable + addressable + trustworthy + self-describing + interoperable")
print()
random.seed(42)
# Simulate SLA check across 5 sequencer domains
print(f"{'Domain':<20} | {'Freshness(h)':>12} | {'Completeness%':>14} | {'Accuracy%':>11} | {'SLA':>5}")
print("-" * 75)
domains = ["Illumina-NovaSeq", "PacBio-Revio", "ONT-Promethion", "BGI-MGI", "Singular-Genomics"]
all_pass = True
for d in domains:
    age_h = random.uniform(1, 30)
    completeness = random.uniform(98.5, 100.0)
    accuracy = random.uniform(98.5, 100.0)
    pass_all = age_h <= 24 and completeness >= 99.5 and accuracy >= 99.9
    all_pass = all_pass and pass_all
    mark = "PASS" if pass_all else "FAIL"
    print(f"{d:<20} | {age_h:>12.1f} | {completeness:>13.2f}% | {accuracy:>10.2f}% | {mark:>5}")
print()
print(f"Overall mesh SLA: {'PASS — product is addressable' if all_pass else 'FAIL'}")
print()
print("SLA formula: P(freshness<=24h AND completeness>=99.5% AND accuracy>=99.9%) >= 0.999")
print(f"Probability bound: {0.999} (target 5-nines data product)")`,
    insight: "A genomics data product treats 1000 Genomes variants as a first-class product with discoverability (catalog), addressability (URL), trustworthiness (VCF 4.2 spec + SLA), self-description (schema), and interoperability (Arrow + Parquet). The mesh topology lets clinical teams consume variants directly — no central DWH bottleneck.",
  },
  {
    id: "mesh-clinical-trial-faers",
    step: "2",
    title: "Clinical Trial Data Mesh (FDA FAERS)",
    subtitle: "Life Sciences — FDA FAERS adverse events as a federated computational governance case",
    accent: "oklch(0.65 0.16 165)",
    icon: <ShieldCheck className="h-4 w-4" />,
    badge: "Life Sciences · Clinical",
    brief: {
      dataset: "FDA FAERS (FDA Adverse Event Reporting System) — ~24M adverse event reports. Published as a governed data product with federated computational governance (privacy + drug safety rules encoded as code, not humans).",
      scale: "~24M adverse events · quarterly FDA releases · federated governance: HIPAA + 21 CFR Part 11 + EMA EudraVigilance cross-checks",
      why: "Shows federated computational governance for clinical data mesh — governance rules (HIPAA de-identification, 21 CFR Part 11 audit trail, EMA EudraVigilance cross-check) are encoded as code running on every domain's data product, not enforced by a central team.",
    },
    stats: [
      { label: "Adverse events", value: "24M" },
      { label: "Reports/quarter", value: "~600k" },
      { label: "Governance", value: "Federated (HIPAA + 21 CFR)" },
      { label: "Cross-check", value: "EMA EudraVigilance" },
    ],
    tools: ["Data Mesh", "AWS Lake Formation", "OpenPolicyAgent", "OPA", "Immuta", "Collibra"],
    codeTabs: [
      {
        lang: "scala",
        filename: "FaersDataProduct.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

val spark = SparkSession.builder().getOrCreate()

// Federated computational governance: HIPAA + 21 CFR Part 11 rules
// encoded as code, not humans
val faers = spark.table("clinical.faers_adverse_events")
  .filter(col("primary_suspect_drug").isNotNull)

// OPA policy: de-identify PHI per HIPAA Safe Harbor
val policy = s\"""
package clinical.governance
default allow = false
allow {
  not contains_pii(input.record)
  input.audit_log != null
  input.signal_strength >= 3
}
contains_phi(rec) { rec.patient_age_bucket == null }
contains_pii(rec) { rec.patient_name != null }
\"""

val deidentified = faers
  .withColumn("age_bucket", when('age < 18, "<18").otherwise(">=18"))
  .drop("patient_name", "address", "date_of_birth")

// 21 CFR Part 11 audit trail
spark.sql(s"CALL audit_log_record('faers_deidentify', current_user(), current_timestamp())")`,
      },
      {
        lang: "rust",
        filename: "faers_data_product.rs",
        code: `use opa_rust::Policy;
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Federated computational governance via OpenPolicyAgent
    let policy = Policy::from_file("clinical_governance.rego")?;
    let record = json!({
        "primary_suspect_drug": "aspirin",
        "age_bucket": ">=18",
        "patient_name": null,
        "audit_log": "user:sandberg 2024-01-15T10:00Z",
        "signal_strength": 4
    });
    let allow = policy.evaluate(&record)?;
    println!("FAERS publish allowed: {} (HIPAA + 21 CFR Part 11)", allow);
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "faers_data_product.go",
        code: `package main

import (
    "github.com/open-policy-agent/opa-go"
    "fmt"
)

func main() {
    // Federated governance: OPA evaluates HIPAA + 21 CFR rules
    ctx := opa.NewContext()
    policy := \`package clinical.governance
default allow = false
allow { not has_phi(input); input.signal >= 3 }
has_phi(r) { r.patient_name != null }\`
    ctx.AddPolicy("clinical.rego", policy)
    input := map[string]interface{}{
        "patient_name": nil, "signal": 4, "audit_log": "user:md 2024",
    }
    allowed, _ := ctx.Eval("data.clinical.governance.allow", input)
    fmt.Printf("FAERS allow=%v\\n", allowed)
}`,
      },
      {
        lang: "elixir",
        filename: "faers_data_product.ex",
        code: `defmodule Mesh.FaersDataProduct do
  @moduledoc "FAERS governed data product — federated computational governance"

  def publish(record) do
    with :ok <- check_hipaa(record),
         :ok <- check_21cfr_audit(record),
         :ok <- check_eudravigilance_cross(record) do
      {:ok, "Published as data product v1.0.0"}
    end
  end

  defp check_hipaa(r) do
    if r.patient_name == nil and r.address == nil, do: :ok, else: {:error, :phi}
  end

  defp check_21cfr_audit(r) do
    if r.audit_log != nil, do: :ok, else: {:error, :no_audit}
  end

  defp check_eudravigilance_cross(_r), do: :ok
end`,
      },
      {
        lang: "zig",
        filename: "faers_data_product.zig",
        code: `const std = @import("std");
const opa = @import("opa-zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const alloc = gpa.allocator();

    // Federated governance: OPA policy on every domain
    var policy = try opa.Policy.load(alloc, "clinical_governance.rego");
    defer policy.deinit();

    const allow = try policy.evaluate(.{
        .patient_name = null,
        .signal = 4,
        .audit_log = "user:md 2024",
    });
    std.debug.print("FAERS publish allowed: {} (HIPAA + 21 CFR Part 11)\\n", .{allow});
}`,
      },
    ],
    runnablePython: `# FAERS federated governance simulation — Pyodide (random only)
import random
print("=== Clinical Trial Data Mesh (FDA FAERS) ===")
print("Federated computational governance: HIPAA + 21 CFR Part 11 + EMA EudraVigilance")
print()
random.seed(42)
print(f"{'Domain':<28} | {'Records':>9} | {'HIPAA':>6} | {'21CFR':>6} | {'EMA':>6} | {'Pass':>5}")
print("-" * 80)
domains = [("Pfizer-FAERS", 4_200_000), ("Novartis-FAERS", 3_100_000),
           ("Roche-FAERS", 2_800_000), ("Merck-FAERS", 2_400_000),
           ("GSK-FAERS", 1_900_000), ("Sanofi-FAERS", 1_700_000)]
total_pass = 0
total_records = 0
for name, n in domains:
    hipaa_pass = random.random() > 0.02
    cfr_pass = random.random() > 0.01
    ema_pass = random.random() > 0.03
    pass_all = hipaa_pass and cfr_pass and ema_pass
    if pass_all:
        total_pass += n
    total_records += n
    print(f"{name:<28} | {n:>9,} | {'OK' if hipaa_pass else 'FAIL':>6} | {'OK' if cfr_pass else 'FAIL':>6} | {'OK' if ema_pass else 'FAIL':>6} | {'PASS' if pass_all else 'FAIL':>5}")
print()
pct = 100.0 * total_pass / total_records
print(f"Total compliant: {total_pass:,} / {total_records:,} = {pct:.2f}%")
print("Federated governance: every domain runs the same OPA policy — no central gatekeeper")`,
    insight: "FAERS as a federated computational governance case shows the mesh principle: HIPAA de-identification, 21 CFR Part 11 audit trails, and EMA EudraVigilance cross-checks are encoded as OpenPolicyAgent Rego policies running on every pharma domain's data product — not enforced by a central DWH team. The mesh scales compliance with code, not headcount.",
  },
];

// ============================================================
// STREAMING SQL SCIENCE EXAMPLES (2)
// ============================================================

export const STREAMING_SQL_SCIENCE_EXAMPLES: DatasetExample[] = [
  {
    id: "streaming-genomics-variant-stream",
    step: "1",
    title: "Real-time Genomics Variant Streaming",
    subtitle: "Life Sciences — Flink SQL TUMBLE windows on streaming variant calls",
    accent: "oklch(0.65 0.16 30)",
    icon: <Database className="h-4 w-4" />,
    badge: "Life Sciences · Genomics",
    brief: {
      dataset: "Streaming variant calls from NovaSeq sequencers — ~5k variants/sec across 200 sequencers. Flink SQL TUMBLE windows aggregate per-1-min quality stats; watermarks tolerate 60s out-of-order arrival.",
      scale: "~5k variants/sec · 200 NovaSeq · TUMBLE 1-min windows · watermark 60s · late-data dropped",
      why: "Shows Flink SQL for genomics streaming — TUMBLE windows give per-minute QUAL/HWE stats per sequencer, watermarks handle the ~30s reordering from lane multiplexing, the stream-table duality lets clinicians JOIN against the VCF reference table.",
    },
    stats: [
      { label: "Throughput", value: "5k variants/s" },
      { label: "Sequencers", value: "200 NovaSeq" },
      { label: "Window", value: "TUMBLE 1 min" },
      { label: "Watermark", value: "60s lateness" },
    ],
    tools: ["Flink SQL", "TUMBLE windows", "Watermarks", "Kafka", "VCF reference table", "Temporal joins"],
    codeTabs: [
      {
        lang: "scala",
        filename: "VariantStreamFlinkSQL.scala",
        code: `import org.apache.flink.table.api.TableEnvironment

val tenv = TableEnvironment.create(env)

// Stream-table duality: variant stream + VCF reference table
tenv.executeSql(\"\"\"
  CREATE TABLE variant_stream (
    chrom STRING, pos BIGINT, ref STRING, alt STRING,
    qual DOUBLE, sequencer_id STRING,
    event_time AS TO_TIMESTAMP(event_ts),
    WATERMARK FOR event_time AS event_time - INTERVAL '60' SECOND
  ) WITH ('connector'='kafka', 'topic'='variants', ...)
\"\"\")

tenv.executeSql(\"\"\"
  CREATE TABLE vcf_reference (chrom STRING, pos BIGINT, ...)
  WITH ('connector'='jdbc', 'url'='jdbc:postgres://vcf-ref')
\"\"\")

// TUMBLE window: 1-min aggregate per sequencer
tenv.sqlQuery(\"\"\"
  SELECT sequencer_id,
         TUMBLE_START(event_time, INTERVAL '1' MINUTE) AS w_start,
         COUNT(*) AS n_variants, AVG(qual) AS avg_qual,
         COUNT(*) FILTER (WHERE qual < 30) AS low_qual_n
  FROM variant_stream
  GROUP BY sequencer_id,
           TUMBLE(event_time, INTERVAL '1' MINUTE)
\"\"\").executeInsert("variant_metrics")`,
      },
      {
        lang: "rust",
        filename: "variant_stream_flink.rs",
        code: `use flink_rust::StreamTableEnvironment;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let tenv = StreamTableEnvironment::create().await?;

    // Watermark + TUMBLE — Rust Flink SQL client
    tenv.execute_sql(r#"
        CREATE TABLE variant_stream (
          chrom STRING, pos BIGINT, qual DOUBLE,
          event_time AS TO_TIMESTAMP(event_ts),
          WATERMARK FOR event_time AS event_time - INTERVAL '60' SECOND
        ) WITH ('connector'='kafka', 'topic'='variants')
    "#).await?;

    // Per-1-min TUMBLE aggregate
    tenv.execute_sql(r#"
        INSERT INTO variant_metrics
        SELECT sequencer_id,
               TUMBLE_START(event_time, INTERVAL '1' MINUTE),
               COUNT(*), AVG(qual)
        FROM variant_stream
        GROUP BY sequencer_id, TUMBLE(event_time, INTERVAL '1' MINUTE)
    "#).await?;
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "variant_stream_flink.go",
        code: `package main

import "github.com/flink/flink-go"

func main() {
    tenv := flink.NewStreamTableEnv()
    // Watermark for 60s out-of-order tolerance
    tenv.ExecSql(\`
        CREATE TABLE variant_stream (
          chrom STRING, pos BIGINT, qual DOUBLE,
          event_time AS TO_TIMESTAMP(event_ts),
          WATERMARK FOR event_time AS event_time - INTERVAL '60' SECOND
        ) WITH ('connector'='kafka', 'topic'='variants')
    \`)
    // TUMBLE 1-min aggregate
    tenv.ExecSql(\`
        INSERT INTO variant_metrics
        SELECT sequencer_id,
               TUMBLE_START(event_time, INTERVAL '1' MINUTE),
               COUNT(*), AVG(qual)
        FROM variant_stream
        GROUP BY sequencer_id, TUMBLE(event_time, INTERVAL '1' MINUTE)
    \`)
}`,
      },
      {
        lang: "elixir",
        filename: "variant_stream_flink.ex",
        code: `defmodule Streaming.VariantFlink do
  @moduledoc "Flink SQL TUMBLE windows on variant stream"
  use GenServer

  def start_link(_), do: GenServer.start_link(__MODULE__, :ok, name: __MODULE__)

  @impl true
  def init(:ok) do
    sql = \"""
      CREATE TABLE variant_stream (
        chrom STRING, pos BIGINT, qual DOUBLE,
        event_time AS TO_TIMESTAMP(event_ts),
        WATERMARK FOR event_time AS event_time - INTERVAL '60' SECOND
      ) WITH ('connector'='kafka', 'topic'='variants')
    \"""
    :ok = Flink.SQL.execute(sql)
    {:ok, %{}}
  end
end`,
      },
      {
        lang: "zig",
        filename: "variant_stream_flink.zig",
        code: `const std = @import("std");
const flink = @import("flink-zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const alloc = gpa.allocator();
    var tenv = try flink.StreamTableEnv.init(alloc);
    defer tenv.deinit();

    // Watermark + TUMBLE 1-min — Zig Flink client (synthetic stub)
    try tenv.exec_sql(
        "CREATE TABLE variant_stream (chrom STRING, pos BIGINT, qual DOUBLE, " ++
        "event_time AS TO_TIMESTAMP(event_ts), " ++
        "WATERMARK FOR event_time AS event_time - INTERVAL '60' SECOND)");
    try tenv.exec_sql(
        "INSERT INTO variant_metrics SELECT sequencer_id, " ++
        "TUMBLE_START(event_time, INTERVAL '1' MINUTE), COUNT(*), AVG(qual) " ++
        "FROM variant_stream GROUP BY sequencer_id, TUMBLE(event_time, INTERVAL '1' MINUTE)");
}`,
      },
    ],
    runnablePython: `# Streaming genomics variant TUMBLE window simulation — Pyodide (random only)
import random
print("=== Real-time Genomics Variant Streaming (Flink SQL TUMBLE) ===")
print("200 NovaSeq sequencers · ~5k variants/sec · 1-min TUMBLE windows · 60s watermark")
print()
random.seed(42)
print("Window semantics: TUMBLE 1-min = [t, t+60s), non-overlapping, watermark tolerates 60s out-of-order")
print()
print(f"{'Sequencer':<18} | {'Win start':>9} | {'Win end':>9} | {'Variants':>9} | {'Avg QUAL':>9} | {'Low-Q':>6}")
print("-" * 78)
sequencers = ["NovaSeq-001", "NovaSeq-042", "NovaSeq-117", "NovaSeq-199"]
total_low_q = 0
for seq in sequencers:
    for minute in range(3):
        n = random.randint(280, 320)
        avg_q = random.uniform(35, 50)
        low_q = random.randint(0, 12)
        total_low_q += low_q
        start_mm = minute
        print(f"{seq:<18} | {start_mm:>8}m | {start_mm+1:>8}m | {n:>9} | {avg_q:>9.2f} | {low_q:>6}")
print()
print(f"Watermark: W(t) = max_seen(event_time) - 60s — tolerates 60s late arrivals")
print(f"Late data (arrived after watermark): dropped (or side-output to DLQ)")
print(f"Low-QUAL count: {total_low_q} (action: alert sequencer PM if > threshold)")`,
    insight: "Flink SQL TUMBLE windows on streaming variants give per-1-min quality aggregates per sequencer — watermarks handle the ~30s reordering from lane multiplexing. The stream-table duality lets the same SQL JOIN against a VCF reference table (streaming enrichment).",
  },
  {
    id: "streaming-lhc-materialize",
    step: "2",
    title: "LHC Online Monitoring (Materialize)",
    subtitle: "Physics — CMS collision rates via Materialize streaming materialized views",
    accent: "oklch(0.65 0.16 165)",
    icon: <Atom className="h-4 w-4" />,
    badge: "Physics · High-Energy",
    brief: {
      dataset: "CMS LHC detector at CERN — ~40M collision events/sec during a fill. Materialize (differential dataflow + incremental view maintenance) maintains streaming materialized views for online anomaly detection.",
      scale: "~40M events/sec · ~600 luminosity blocks per fill · Materialize maintains 5 materialized views · differential dataflow = O(changes), not O(full-scan)",
      why: "Shows Materialize for high-rate physics monitoring — differential dataflow recomputes only the changed rows of materialized views (not the full table) on every input. Per-LB collision rate, per-sector threshold crossing, and trigger-rate anomalies are live SQL views.",
    },
    stats: [
      { label: "Events/sec", value: "40M" },
      { label: "LBs/fill", value: "~600" },
      { label: "Mat. views", value: "5" },
      { label: "Update", value: "Differential (O(changes))" },
    ],
    tools: ["Materialize", "Differential Dataflow", "SQL Materialized Views", "Kafka", "TIMESTAMPTZ"],
    codeTabs: [
      {
        lang: "scala",
        filename: "LhcMaterializeViews.scala",
        code: `// Materialize SQL materialized views — Scala JDBC client
import java.sql.{DriverManager, Connection}

val conn = DriverManager.getConnection("jdbc:postgresql://materialize:6875")
val stmt = conn.createStatement()

// Streaming materialized view: per-LB collision rate
stmt.execute(\"\"\"
  CREATE MATERIALIZED VIEW lb_collision_rate AS
  SELECT lb_id, sector,
         COUNT(*) AS n_collisions,
         AVG(hits_per_event) AS avg_hits,
         event_ts
  FROM cms_collision_stream
  GROUP BY lb_id, sector, event_ts
\"\"\")

// Anomaly view: rate > 3-sigma
stmt.execute(\"\"\"
  CREATE MATERIALIZED VIEW lb_anomalies AS
  SELECT lb_id, sector, n_collisions
  FROM lb_collision_rate
  WHERE n_collisions > 50000
\"\"\")`,
      },
      {
        lang: "rust",
        filename: "lhc_materialize.rs",
        code: `use postgres::Client;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut client = Client::connect("postgresql://materialize:6875/mz", None)?;

    // Streaming materialized view via differential dataflow
    client.batch_execute("
        CREATE MATERIALIZED VIEW lb_collision_rate AS
        SELECT lb_id, sector, COUNT(*) AS n, AVG(hits_per_event) AS avg
        FROM cms_collision_stream
        GROUP BY lb_id, sector
    ")?;

    client.batch_execute("
        CREATE MATERIALIZED VIEW lb_anomalies AS
        SELECT lb_id, sector, n
        FROM lb_collision_rate WHERE n > 50000
    ")?;
    println!("Materialize views created — incremental maintenance via differential dataflow");
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "lhc_materialize.go",
        code: `package main

import (
    "database/sql"
    _ "github.com/lib/pq"
    "fmt"
)

func main() {
    db, _ := sql.Open("postgres", "postgres://materialize:6875/mz?sslmode=disable")
    // Streaming materialized view
    db.Exec(\`
        CREATE MATERIALIZED VIEW lb_collision_rate AS
        SELECT lb_id, sector, COUNT(*) AS n, AVG(hits_per_event) AS avg
        FROM cms_collision_stream
        GROUP BY lb_id, sector
    \`)
    // Anomaly view
    db.Exec(\`
        CREATE MATERIALIZED VIEW lb_anomalies AS
        SELECT lb_id, sector FROM lb_collision_rate WHERE n > 50000
    \`)
    fmt.Println("Materialize views live (differential dataflow)")
}`,
      },
      {
        lang: "elixir",
        filename: "lhc_materialize.ex",
        code: `defmodule Streaming.LhcMaterialize do
  @moduledoc "Materialize streaming mat views for LHC online monitoring"

  def create_views do
    sql1 = \"""
      CREATE MATERIALIZED VIEW lb_collision_rate AS
      SELECT lb_id, sector, COUNT(*) AS n, AVG(hits_per_event) AS avg
      FROM cms_collision_stream GROUP BY lb_id, sector
    \"""
    sql2 = \"""
      CREATE MATERIALIZED VIEW lb_anomalies AS
      SELECT lb_id, sector FROM lb_collision_rate WHERE n > 50000
    \"""
    Postgrex.query!(conn(), sql1, [])
    Postgrex.query!(conn(), sql2, [])
  end

  defp conn, do: "postgres://materialize:6875/mz"
end`,
      },
      {
        lang: "zig",
        filename: "lhc_materialize.zig",
        code: `const std = @import("std");
const pq = @import("pg-zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const alloc = gpa.allocator();

    var client = try pq.Client.connect(alloc, "postgres://materialize:6875/mz");
    defer client.deinit();

    // Materialize streaming mat view — incremental via differential dataflow
    try client.exec(
        "CREATE MATERIALIZED VIEW lb_collision_rate AS " ++
        "SELECT lb_id, sector, COUNT(*) AS n FROM cms_collision_stream " ++
        "GROUP BY lb_id, sector");
    try client.exec(
        "CREATE MATERIALIZED VIEW lb_anomalies AS " ++
        "SELECT lb_id, sector FROM lb_collision_rate WHERE n > 50000");
    std.debug.print("Materialize views live (differential dataflow)\\n", .{});
}`,
      },
    ],
    runnablePython: `# LHC Materialize differential dataflow simulation — Pyodide (random only)
import random
print("=== LHC Online Monitoring (Materialize streaming mat views) ===")
print("Differential dataflow = O(changes), not O(full-scan) per update")
print()
random.seed(42)
n_lbs = 8
print(f"{'LB':<6} | {'Sector':<8} | {'Events':>10} | {'avg hits':>10} | {'View: anomalies':>20}")
print("-" * 65)
total_changes = 0
for lb in range(n_lbs):
    for sector in ["ECAL+", "ECAL-", "HCAL+", "HCAL-"]:
        n = random.randint(35_000, 55_000)
        avg = random.uniform(8, 14)
        anomaly = "ALERT (n>50k)" if n > 50000 else "OK"
        total_changes += 1
        print(f"LB{lb:<4} | {sector:<8} | {n:>10,} | {avg:>10.2f} | {anomaly:>20}")
print()
print(f"Rows recomputed per input event: ~{total_changes} (NOT 4M)")
print("Differential dataflow: only the changed rows are recomputed.")
print("If 1 LB update changes 4 of 32 (LB × sector) rows, only 4 rows are recomputed.")`,
    insight: "Materialize's differential dataflow recomputes only the changed rows of a streaming materialized view on every input — not the full table. For LHC monitoring at 40M events/sec, this is the difference between sub-second and multi-minute view updates.",
  },
];

// ============================================================
// DATA CONTRACTS SCIENCE EXAMPLES (2)
// ============================================================

export const CONTRACTS_SCIENCE_EXAMPLES: DatasetExample[] = [
  {
    id: "contracts-genomics-vcf",
    step: "1",
    title: "Genomics VCF Data Contract",
    subtitle: "Life Sciences — VCF 4.2 schema + freshness SLA + ownership + quality",
    accent: "oklch(0.65 0.16 30)",
    icon: <Database className="h-4 w-4" />,
    badge: "Life Sciences · Genomics",
    brief: {
      dataset: "1000 Genomes VCF — formal contract C = (Schema, SLA, Quality, Ownership). VCF 4.2 schema, freshness SLA ≤24h, quality metrics (HWE p-value, call rate), ownership (Genomics Lab). Backward compatibility: adding INFO fields is OK.",
      scale: "~3B variants · VCF 4.2 contract · backward-compatible INFO field additions · SLA: freshness ≤24h · completeness ≥99.5% · accuracy ≥99.9%",
      why: "Shows a genomics data contract with all 4 components — Schema (VCF 4.2), SLA (freshness/completeness/accuracy), Quality (HWE p-value, call rate), Ownership (Genomics Lab). Schema Registry enforces backward compatibility on every INFO field addition.",
    },
    stats: [
      { label: "Variants", value: "3B" },
      { label: "Schema", value: "VCF 4.2" },
      { label: "SLA", value: "freshness ≤24h" },
      { label: "Compat", value: "Backward (INFO additions)" },
    ],
    tools: ["Data Contracts", "Schema Registry", "Great Expectations", "dbt tests", "OpenLineage"],
    codeTabs: [
      {
        lang: "scala",
        filename: "VcfDataContract.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

val spark = SparkSession.builder().getOrCreate()

// Formal contract C = (Schema, SLA, Quality, Ownership)
case class VcfContract(
  schema: String,           // VCF 4.2
  freshness_sla_hours: Int, // 24
  quality_metrics: Map[String, Double], // HWE p-value, call rate
  owner: String              // genomics-lab
)

val contract = VcfContract("VCF-4.2", 24,
  Map("hwe_pvalue_min" -> 1e-6, "call_rate_min" -> 0.995),
  "genomics-lab@org")

// Backward compatibility: adding INFO/AC (allele count) is fine — old consumers ignore it
val v1_schema = "CHROM,POS,REF,ALT,QUAL,FILTER,INFO"
val v2_schema = "CHROM,POS,REF,ALT,QUAL,FILTER,INFO/AC,INFO/AF"  // superset

// SLA enforcement
val vcf = spark.read.parquet("s3://contracts/vcf/v2.1.0/")
val age_h = (System.currentTimeMillis() - vcf.agg(max("_ts")).head().getLong(0)) / 3_600_000
assert(age_h <= contract.freshness_sla_hours, s"Freshness SLA violated: \${age_h}h > 24h")`,
      },
      {
        lang: "rust",
        filename: "vcf_data_contract.rs",
        code: `use serde::{Serialize, Deserialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Serialize, Deserialize)]
struct VcfContract {
    schema: String,           // "VCF-4.2"
    freshness_sla_hours: u32, // 24
    quality_metrics: QualityMetrics,
    owner: String,            // "genomics-lab"
}

#[derive(Serialize, Deserialize)]
struct QualityMetrics {
    hwe_pvalue_min: f64,    // 1e-6
    call_rate_min: f64,     // 0.995
    accuracy_min: f64,     // 0.999
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let contract = VcfContract {
        schema: "VCF-4.2".into(),
        freshness_sla_hours: 24,
        quality_metrics: QualityMetrics {
            hwe_pvalue_min: 1e-6, call_rate_min: 0.995, accuracy_min: 0.999,
        },
        owner: "genomics-lab".into(),
    };
    let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs() as i64;
    let age_h = (now - 0) / 3600;  // placeholder
    assert!(age_h as u32 <= contract.freshness_sla_hours);
    println!("VCF contract enforced — backward-compat INFO additions OK");
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "vcf_data_contract.go",
        code: `package main

import (
    "fmt"
    "time"
)

type VcfContract struct {
    Schema            string  // "VCF-4.2"
    FreshnessSLAHours int     // 24
    HwePvalueMin      float64 // 1e-6
    CallRateMin       float64 // 0.995
    Owner             string  // "genomics-lab"
}

func main() {
    c := VcfContract{"VCF-4.2", 24, 1e-6, 0.995, "genomics-lab"}
    age := time.Since(time.Unix(0, 0)).Hours()
    if age > float64(c.FreshnessSLAHours) {
        fmt.Printf("Freshness SLA violated: %.1fh > %dh\\n", age, c.FreshnessSLAHours)
    }
    fmt.Printf("VCF contract: %s, owner=%s\\n", c.Schema, c.Owner)
    // Backward compat: v2 INFO/AC, INFO/AF superset of v1
}`,
      },
      {
        lang: "elixir",
        filename: "vcf_data_contract.ex",
        code: `defmodule Contracts.Vcf do
  @moduledoc "VCF data contract C=(Schema, SLA, Quality, Owner)"
  defstruct schema: "VCF-4.2",
            freshness_sla_hours: 24,
            hwe_pvalue_min: 1.0e-6,
            call_rate_min: 0.995,
            owner: "genomics-lab"

  def check_freshness(contract, age_h) do
    if age_h <= contract.freshness_sla_hours do
      :ok
    else
      {:error, {:sla_violated, age_h}}
    end
  end

  # Backward-compat predicate: schema v2 is superset of v1
  def backward_compatible?(v1_fields, v2_fields), do: v1_fields -- v2_fields == []
end`,
      },
      {
        lang: "zig",
        filename: "vcf_data_contract.zig",
        code: `const std = @import("std");

const VcfContract = struct {
    schema: []const u8,
    freshness_sla_hours: u32,
    hwe_pvalue_min: f64,
    call_rate_min: f64,
    owner: []const u8,
};

pub fn main() !void {
    const c = VcfContract{
        .schema = "VCF-4.2",
        .freshness_sla_hours = 24,
        .hwe_pvalue_min = 1.0e-6,
        .call_rate_min = 0.995,
        .owner = "genomics-lab",
    };
    // Backward compat: v2 (with INFO/AC, INFO/AF) is a superset of v1
    const v1_fields = [_][]const u8{ "CHROM", "POS", "REF", "ALT", "QUAL" };
    const v2_fields = [_][]const u8{ "CHROM", "POS", "REF", "ALT", "QUAL", "INFO/AC", "INFO/AF" };
    var compat: bool = true;
    for (v1_fields) |f| {
        var found: bool = false;
        for (v2_fields) |g| if (std.mem.eql(u8, f, g)) { found = true; break; };
        if (!found) { compat = false; break; }
    }
    std.debug.print("VCF {} backward-compat: {}\\n", .{c.schema, compat});
}`,
      },
    ],
    runnablePython: `# VCF data contract enforcement — Pyodide (random + math)
import math, random
print("=== Genomics VCF Data Contract ===")
print("Formal: C = (Schema=VCF-4.2, SLA=freshness<=24h, Q=(HWE p>=1e-6, call>=0.995), Owner=genomics-lab)")
print()
random.seed(42)
print("Backward compatibility test: v2 schema is superset of v1?")
v1 = {"CHROM","POS","ID","REF","ALT","QUAL","FILTER","INFO"}
v2 = {"CHROM","POS","ID","REF","ALT","QUAL","FILTER","INFO","INFO/AC","INFO/AF"}
backward_ok = v1.issubset(v2)
print(f"  v1 = {len(v1)} fields, v2 = {len(v2)} fields (added INFO/AC + INFO/AF)")
print(f"  Backward (v1 reader reads v2 data): {backward_ok}")
print()
# SLA formula: P(completion<=T AND error<=eps) >= 1-alpha
print("SLA: P(freshness<=24h AND completeness>=99.5% AND accuracy>=99.9%) >= 0.999")
n_runs = 1000
pass_count = 0
for _ in range(n_runs):
    age_h = random.uniform(0, 30)
    completeness = random.uniform(0.97, 1.0)
    accuracy = random.uniform(0.97, 1.0)
    if age_h <= 24 and completeness >= 0.995 and accuracy >= 0.999:
        pass_count += 1
p_pass = pass_count / n_runs
print(f"  Empirical P(pass) = {pass_count}/{n_runs} = {p_pass:.4f}")
print(f"  {'SLA MET' if p_pass >= 0.999 else 'SLA NOT MET'} (target >= 0.999)")
print("  Inference: contract enforcement raises P(pass) toward 1.0")`,
    insight: "A VCF data contract formalises schema (VCF 4.2), SLA (freshness/completeness/accuracy), quality (HWE p-value, call rate), and ownership (Genomics Lab). Backward-compatible INFO field additions are the canonical example — old consumers ignore new fields, the contract guarantees they won't break.",
  },
  {
    id: "contracts-clinical-gdpr",
    step: "2",
    title: "Clinical Trial GDPR Contract",
    subtitle: "Life Sciences — GDPR enforcement via contract + audit trail",
    accent: "oklch(0.65 0.16 165)",
    icon: <ShieldCheck className="h-4 w-4" />,
    badge: "Life Sciences · Clinical",
    brief: {
      dataset: "Clinical trial patient data — 10,000 patients across 50 sites. Contract enforces GDPR Art. 5(1)(c) data minimisation, Art. 17 right to erasure (right-to-be-forgotten), Art. 20 right to portability — all encoded as contract clauses with audit trail.",
      scale: "~10k patients · 50 sites · 3 GDPR articles enforced via contract · audit trail for Art. 30 records of processing · 21 CFR Part 11 cross-compliance",
      why: "Shows a clinical data contract enforcing GDPR — every patient record has a contract clause: 'right-to-be-forgotten deletion within 30 days of request', 'data minimisation — only fields specified in protocol', 'portability — FHIR export on request'. Audit trail supports regulatory inspection.",
    },
    stats: [
      { label: "Patients", value: "10,000" },
      { label: "Sites", value: "50" },
      { label: "GDPR Articles", value: "3 (5/17/20)" },
      { label: "Audit trail", value: "Art. 30 records" },
    ],
    tools: ["Data Contracts", "GDPR Art. 5/17/20", "FHIR R4", "Great Expectations", "OpenLineage", "21 CFR Part 11"],
    codeTabs: [
      {
        lang: "scala",
        filename: "ClinicalGdprContract.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._

val spark = SparkSession.builder().getOrCreate()

// GDPR contract clauses
case class GdprContract(
  data_minimisation_fields: List[String],  // Art. 5(1)(c)
  right_to_erasure_sla_days: Int,          // Art. 17 — 30 days
  right_to_portability_format: String,     // Art. 20 — FHIR R4
  audit_trail: Boolean                     // Art. 30
)

val contract = GdprContract(
  List("patient_id", "age_bucket", "biomarker", "response"),
  30, "FHIR-R4", true)

// Right to erasure (Art. 17) — propagates across all derived tables
def handle_erasure(patient_id: String): Unit = {
  spark.sql(s"DELETE FROM clinical.patient WHERE patient_id='\$patient_id'")
  spark.sql(s"DELETE FROM clinical.lab_results WHERE patient_id='\$patient_id'")
  spark.sql(s"DELETE FROM clinical.adverse_events WHERE patient_id='\$patient_id'")
  spark.sql(s"CALL audit_log_record('GDPR_17_erasure', '\$patient_id', current_timestamp())")
}

// Data minimisation (Art. 5(1)(c)) — contract enforces field list
val minimal = spark.table("clinical.patient")
  .select(contract.data_minimisation_fields.head, contract.data_minimisation_fields.tail: _*)`,
      },
      {
        lang: "rust",
        filename: "clinical_gdpr_contract.rs",
        code: `use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
struct GdprContract {
    data_minimisation_fields: Vec<String>,    // Art. 5(1)(c)
    right_to_erasure_sla_days: u32,           // Art. 17 — 30 days
    right_to_portability_format: String,      // Art. 20 — FHIR R4
    audit_trail: bool,                        // Art. 30
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let contract = GdprContract {
        data_minimisation_fields: vec![
            "patient_id".into(), "age_bucket".into(),
            "biomarker".into(), "response".into(),
        ],
        right_to_erasure_sla_days: 30,
        right_to_portability_format: "FHIR-R4".into(),
        audit_trail: true,
    };
    // Right to erasure: cascade delete across derived tables
    println!("Art. 17 erasure SLA: {} days", contract.right_to_erasure_sla_days);
    println!("Art. 5(1)(c) fields: {:?}", contract.data_minimisation_fields);
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "clinical_gdpr_contract.go",
        code: `package main

import "fmt"

type GdprContract struct {
    DataMinimisationFields    []string // Art. 5(1)(c)
    RightToErasureSLADays     int      // Art. 17 — 30 days
    RightToPortabilityFormat  string   // Art. 20 — FHIR R4
    AuditTrail                bool     // Art. 30
}

func main() {
    c := GdprContract{
        DataMinimisationFields:   []string{"patient_id", "age_bucket", "biomarker", "response"},
        RightToErasureSLADays:    30,
        RightToPortabilityFormat: "FHIR-R4",
        AuditTrail:               true,
    }
    // Art. 17: cascade erasure SLA
    fmt.Printf("Art. 17 SLA: %d days\\n", c.RightToErasureSLADays)
    fmt.Printf("Art. 5(1)(c) fields: %v\\n", c.DataMinimisationFields)
}`,
      },
      {
        lang: "elixir",
        filename: "clinical_gdpr_contract.ex",
        code: `defmodule Contracts.ClinicalGdpr do
  @moduledoc "GDPR contract: Art. 5(1)(c), 17, 20, 30"
  defstruct minimisation_fields: ["patient_id", "age_bucket", "biomarker", "response"],
            erasure_sla_days: 30,
            portability_format: "FHIR-R4",
            audit_trail: true

  def handle_erasure(contract, patient_id) do
    # Art. 17 — cascade delete across derived tables, audit log
    Clinical.Repo.delete_all(from p in Patient, where: p.id == ^patient_id)
    Clinical.Repo.delete_all(from l in LabResult, where: l.patient_id == ^patient_id)
    Audit.log("GDPR_17_erasure", patient_id)
    :ok
  end

  def export_fhir(contract, patient_id) do
    # Art. 20 — FHIR R4 export
    FHIR.Export.patient(patient_id, format: contract.portability_format)
  end
end`,
      },
      {
        lang: "zig",
        filename: "clinical_gdpr_contract.zig",
        code: `const std = @import("std");

const GdprContract = struct {
    minimisation_fields: []const []const u8,
    erasure_sla_days: u32,
    portability_format: []const u8,
    audit_trail: bool,
};

pub fn main() !void {
    const c = GdprContract{
        .minimisation_fields = &[_][]const u8{ "patient_id", "age_bucket", "biomarker", "response" },
        .erasure_sla_days = 30,  // Art. 17 SLA
        .portability_format = "FHIR-R4",  // Art. 20
        .audit_trail = true,  // Art. 30
    };
    std.debug.print("GDPR contract: Art. 17 SLA = {} days, Art. 20 format = {s}\\n",
        .{c.erasure_sla_days, c.portability_format});
}`,
      },
    ],
    runnablePython: `# Clinical GDPR contract enforcement — Pyodide (random only)
import random
print("=== Clinical Trial GDPR Data Contract ===")
print("Enforced articles: Art. 5(1)(c) data minimisation, Art. 17 erasure, Art. 20 portability, Art. 30 records")
print()
random.seed(42)
# Simulate 100 patient records, check contract clauses
records = [{"patient_id": f"P{i:04d}",
            "fields_kept": ["patient_id","age_bucket","biomarker","response"],
            "fields_dropped": ["name","address","dob","ssn"]} for i in range(100)]

# Art. 5(1)(c) data minimisation: PII dropped
all_min = all(len(r["fields_dropped"]) >= 4 for r in records)
print(f"Art. 5(1)(c) data minimisation: {sum(1 for r in records if len(r['fields_dropped']) >= 4)}/100 records compliant")

# Art. 17 erasure SLA: 30 days
erasure_requests = [f"P{random.randint(0,99):04d}" for _ in range(5)]
erasure_days = [random.randint(1, 35) for _ in erasure_requests]
art17_pass = all(d <= 30 for d in erasure_days)
print(f"Art. 17 erasure SLA (<=30d): {sum(1 for d in erasure_days if d <= 30)}/{len(erasure_days)} requests met")
print(f"  Days: {erasure_days}")
print(f"  All Art. 17 met: {art17_pass}")

# Art. 20 portability: FHIR export
print(f"Art. 20 portability: 100% FHIR-R4 export available")

# SLA formula: P(completion <= T_max AND error_rate <= eps_max) >= 1-alpha
n = 1000
pass = sum(1 for _ in range(n) if random.random() > 0.001)
print(f"\\nSLA formula: P(art17<=30d AND art5c_min) >= 1-alpha")
print(f"  Empirical P(pass) = {pass}/{n} = {pass/n:.4f}")
print(f"  alpha = 0.001 -> 1-alpha = 0.999")`,
    insight: "A clinical GDPR contract encodes Art. 5(1)(c) data minimisation (fields specified in protocol only), Art. 17 right-to-erasure (30-day SLA across derived tables), Art. 20 portability (FHIR R4 export), Art. 30 audit trail — all as contract clauses with code enforcement (not manual review).",
  },
];

// ============================================================
// PRIVACY ENHANCING TECH SCIENCE EXAMPLES (2)
// ============================================================

export const PRIVACY_SCIENCE_EXAMPLES: DatasetExample[] = [
  {
    id: "privacy-genomics-gwas-dp",
    step: "1",
    title: "Genomics Differential Privacy (GWAS)",
    subtitle: "Life Sciences — Laplace mechanism on GWAS summary statistics",
    accent: "oklch(0.65 0.16 30)",
    icon: <Database className="h-4 w-4" />,
    badge: "Life Sciences · Genomics",
    brief: {
      dataset: "GWAS (Genome-Wide Association Study) summary statistics — ~10M SNP-trait associations. ε-DP applied via Laplace mechanism on per-SNP p-values (sensitivity = max change in p-value from 1 patient's removal).",
      scale: "~10M SNP-trait stats · ε = 1.0 (strong privacy) · Laplace mechanism sensitivity = 1/sqrt(n) · composition: 10M queries → 10M×ε budget",
      why: "Shows ε-DP on genomics — releasing raw GWAS p-values would leak whether a specific patient is in the study (membership inference attack). Laplace noise calibrated to ε=1.0 hides individual contributions while preserving aggregate signals (SNPs with p<5e-8 still discoverable).",
    },
    stats: [
      { label: "SNP-trait stats", value: "10M" },
      { label: "ε (epsilon)", value: "1.0" },
      { label: "Mechanism", value: "Laplace" },
      { label: "Sensitivity Δf", value: "1/√n" },
    ],
    tools: ["Differential Privacy", "Laplace mechanism", "Opacus", "TensorFlow Privacy", "IBM DP"],
    codeTabs: [
      {
        lang: "scala",
        filename: "GwasDifferentialPrivacy.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._
import scala.util.Random

val spark = SparkSession.builder().getOrCreate()

// ε-DP via Laplace mechanism on GWAS p-values
val epsilon = 1.0
val n = 10000  // study size
val sensitivity = 1.0 / math.sqrt(n)  // max p-value change from 1 patient removal

val gwas = spark.table("genomics.gwas_summary")
  .withColumn("p_orig", 'p_value)

// Laplace(0, sensitivity/epsilon)
val noisy = gwas.withColumn("p_dp",
  'p_orig + (rand() - 0.5) * 2 * (sensitivity / epsilon))

// Publish DP p-values (signal preserved for p<5e-8, noise hides individuals)
noisy.select("snp_id", "p_dp").write.format("delta")
  .save("s3://privacy/gwas-dp/v1.0.0/")`,
      },
      {
        lang: "rust",
        filename: "gwas_differential_privacy.rs",
        code: `use rand::Rng;
use rand_distr::Laplace;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let epsilon: f64 = 1.0;
    let n: f64 = 10_000.0;
    let sensitivity: f64 = 1.0 / n.sqrt();  // max p-value change from 1 removal

    // Laplace(0, sensitivity/epsilon) noise added per SNP
    let scale = sensitivity / epsilon;
    let dist = Laplace::new(0.0, scale)?;
    let mut rng = rand::thread_rng();

    for snp in 0..10 {
        let p_orig: f64 = 1e-8;  // genome-wide significance
        let noise: f64 = rng.sample(dist);
        let p_dp: f64 = p_orig + noise;
        println!("SNP{}: p_orig={:.2e} p_dp={:.2e}", snp, p_orig, p_dp);
    }
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "gwas_differential_privacy.go",
        code: `package main

import (
    "fmt"
    "math"
    "math/rand"
)

func main() {
    // ε-DP Laplace mechanism on GWAS p-values
    epsilon := 1.0
    n := 10000.0
    sensitivity := 1.0 / math.Sqrt(n)
    scale := sensitivity / epsilon

    for snp := 0; snp < 5; snp++ {
        pOrig := 1e-8
        noise := rand.ExpFloat64() * scale * sign()
        pDp := pOrig + noise
        fmt.Printf("SNP%d: p_orig=%.2e p_dp=%.2e\\n", snp, pOrig, pDp)
    }
}

func sign() float64 {
    if rand.Float64() < 0.5 { return -1 }
    return 1
}`,
      },
      {
        lang: "elixir",
        filename: "gwas_differential_privacy.ex",
        code: `defmodule Privacy.GwasDP do
  @moduledoc "Laplace mechanism for ε-DP on GWAS summary stats"
  @epsilon 1.0
  @n 10_000

  def sensitivity, do: 1.0 / :math.sqrt(@n)
  def laplace_scale, do: sensitivity() / @epsilon

  def add_noise(p_value) do
    # Laplace(0, scale) noise — privacy-preserving release
    noise = (:rand.uniform() - 0.5) * 2 * laplace_scale()
    p_value + noise
  end

  def publish_dp_pvalues(snps) do
    Enum.map(snps, fn {snp_id, p} -> {snp_id, add_noise(p)} end)
  end
end`,
      },
      {
        lang: "zig",
        filename: "gwas_differential_privacy.zig",
        code: `const std = @import("std");

pub fn main() !void {
    const epsilon: f64 = 1.0;
    const n: f64 = 10_000.0;
    const sensitivity: f64 = 1.0 / @sqrt(n);  // max p-value change
    const scale: f64 = sensitivity / epsilon;  // Laplace scale

    var prng = std.Random.DefaultPrng.init(42);
    var random = prng.random();

    var i: usize = 0;
    while (i < 5) : (i += 1) {
        const p_orig: f64 = 1.0e-8;  // genome-wide significance
        // Laplace noise: sign * exponential(scale)
        const sign: f64 = if (random.float(f64) < 0.5) -1.0 else 1.0;
        const noise: f64 = sign * scale * @log(1.0 / random.float(f64));
        const p_dp: f64 = p_orig + noise;
        std.debug.print("SNP{}: p_orig={:.2e} p_dp={:.2e}\\n", .{i, p_orig, p_dp});
    }
}`,
      },
    ],
    runnablePython: `# GWAS differential privacy (Laplace mechanism) — Pyodide (math + random)
import math, random
print("=== Genomics Differential Privacy (GWAS) ===")
print("Laplace mechanism: M(x) = f(x) + Lap(Δf/ε)")
print("where Δf = sensitivity (max p-value change from 1 patient removal)")
print()
random.seed(42)
n = 10000
epsilon = 1.0
delta_f = 1.0 / math.sqrt(n)  # sensitivity
scale = delta_f / epsilon
print(f"Study size n = {n}, epsilon = {epsilon}, sensitivity = {delta_f:.6f}")
print(f"Laplace scale (Δf/ε) = {scale:.6f}")
print()
print(f"{'SNP':<10} | {'p_orig':>12} | {'noise':>12} | {'p_dp':>12} | {'sig? (p<5e-8)':>14}")
print("-" * 70)
signal_preserved = 0
for i in range(8):
    p_orig = 1e-8 * (10 ** random.uniform(0, 3))  # 1e-8 to 1e-5
    noise = random.laplace(0, scale)
    p_dp = p_orig + noise
    sig = p_dp < 5e-8
    if p_orig < 5e-8 and sig:
        signal_preserved += 1
    print(f"SNP{i:<6} | {p_orig:>12.2e} | {noise:>+12.2e} | {p_dp:>12.2e} | {'YES' if sig else 'no':>14}")
print()
# Composition: k queries → ε_total = k * ε
print("Sequential composition: k SNP releases consume k*ε budget")
k = 10_000_000
print(f"  k = {k:,} SNPs, each with ε = {epsilon} → ε_total = {k*epsilon:,.0f}")
print("  To stay under ε_total=10, set per-SNP ε = 10/10M = 1e-6 (much more noise)")
print()
print("Privacy: noise hides individual contribution → no membership inference")
print("Utility: SNPs at p<5e-8 are still discoverable (signal preserved)")`,
    insight: "ε-DP via Laplace mechanism on GWAS p-values prevents membership inference attacks (a published p-value could reveal whether a specific patient is in the study). With ε=1.0 and sensitivity Δf=1/√n, the noise is calibrated to hide individual contributions while preserving aggregate genetic signals (SNPs at genome-wide significance p<5e-8 remain discoverable).",
  },
  {
    id: "privacy-clinical-fedavg",
    step: "2",
    title: "Clinical Trial Federated Learning (FedAvg)",
    subtitle: "Life Sciences — FedAvg weighted average across hospital data silos",
    accent: "oklch(0.65 0.16 165)",
    icon: <ShieldCheck className="h-4 w-4" />,
    badge: "Life Sciences · Clinical",
    brief: {
      dataset: "Multi-hospital clinical trial — 5 hospital data silos (10k patients total). FedAvg trains a drug-response model without sharing patient data across hospitals. Each hospital trains locally; central server averages the model weights (weighted by sample count).",
      scale: "~5 hospital silos · 10k patients total · n_k per hospital (1000-3000) · FedAvg: w_{t+1} = Σ_k (n_k/n) × w_k^t",
      why: "Shows FedAvg for clinical trials — patient data never leaves the hospital (HIPAA compliance); only model weight gradients are shared. Weighted average by sample count (n_k/n) gives larger hospitals proportionally more influence. Differential privacy added per-hospital prevents gradient inversion attacks.",
    },
    stats: [
      { label: "Hospitals", value: "5 silos" },
      { label: "Patients", value: "10,000" },
      { label: "Algorithm", value: "FedAvg" },
      { label: "Privacy", value: "Data stays local" },
    ],
    tools: ["Federated Learning", "FedAvg", "FedProx", "PySyft", "Flower", "TensorFlow Federated"],
    codeTabs: [
      {
        lang: "scala",
        filename: "ClinicalFedAvg.scala",
        code: `import org.apache.spark.sql.SparkSession
import org.apache.spark.ml.classification.LogisticRegression

val spark = SparkSession.builder().getOrCreate()

// FedAvg: w_{t+1} = Σ_k (n_k/n) × w_k^t (weighted avg of client models)
case class Hospital(id: String, n_patients: Int)
val hospitals = Seq(Hospital("H1", 3000), Hospital("H2", 2500),
                    Hospital("H3", 2000), Hospital("H4", 1500), Hospital("H5", 1000))
val n_total = hospitals.map(_.n_patients).sum

// Round t: each hospital trains locally, sends weights to central server
var global_weights = Array.fill(10)(0.0)
for (round <- 0 until 10) {
  val client_weights = hospitals.map { h =>
    // Local training (no patient data leaves the hospital)
    val lr = new LogisticRegression().setMaxIter(10)
    val model = lr.fit(spark.table(s"clinical.\${h.id}_patients"))
    model.coefficients.toArray
  }
  // Weighted average: w_{t+1} = Σ_k (n_k/n) × w_k^t
  global_weights = client_weights.indices.map { k =>
    val weight = hospitals(k).n_patients.toDouble / n_total
    client_weights(k).zipWithIndex.map { case (w, i) => w * weight }
  }.reduce((a, b) => a.zip(b).map { case (x, y) => x + y }).toArray
}`,
      },
      {
        lang: "rust",
        filename: "clinical_fedavg.rs",
        code: `#[derive(Debug)]
struct Hospital { id: String, n_patients: u32 }

fn main() {
    let hospitals = vec![
        Hospital { id: "H1".into(), n_patients: 3000 },
        Hospital { id: "H2".into(), n_patients: 2500 },
        Hospital { id: "H3".into(), n_patients: 2000 },
        Hospital { id: "H4".into(), n_patients: 1500 },
        Hospital { id: "H5".into(), n_patients: 1000 },
    ];
    let n_total: u32 = hospitals.iter().map(|h| h.n_patients).sum();

    // FedAvg: w_{t+1} = Σ_k (n_k/n) × w_k^t
    let mut global = vec![0.0f64; 10];
    for _round in 0..10 {
        let client_weights: Vec<Vec<f64>> = hospitals.iter()
            .map(|h| local_train(&h.id)).collect();
        let mut new_global = vec![0.0f64; 10];
        for (k, weights) in client_weights.iter().enumerate() {
            let w = hospitals[k].n_patients as f64 / n_total as f64;
            for i in 0..10 { new_global[i] += w * weights[i]; }
        }
        global = new_global;
    }
    println!("FedAvg global weights (round 10): {:?}", &global[..3]);
}

fn local_train(_hospital_id: &str) -> Vec<f64> {
    // Each hospital trains locally — no patient data shared
    vec![0.5; 10]
}`,
      },
      {
        lang: "go",
        filename: "clinical_fedavg.go",
        code: `package main

import "fmt"

type Hospital struct { ID string; NPatients int }

func main() {
    hospitals := []Hospital{
        {"H1", 3000}, {"H2", 2500}, {"H3", 2000}, {"H4", 1500}, {"H5", 1000},
    }
    nTotal := 0
    for _, h := range hospitals { nTotal += h.NPatients }

    // FedAvg: w_{t+1} = Σ_k (n_k/n) × w_k^t
    global := make([]float64, 10)
    for round := 0; round < 10; round++ {
        newGlobal := make([]float64, 10)
        for k, h := range hospitals {
            w := float64(h.NPatients) / float64(nTotal)
            clientW := localTrain(h.ID)  // local training, no data shared
            for i := 0; i < 10; i++ { newGlobal[i] += w * clientW[i] }
        }
        copy(global, newGlobal)
    }
    fmt.Printf("FedAvg global (round 10): %.4f...\\n", global[0])
}

func localTrain(_ string) []float64 { return []float64{0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5} }`,
      },
      {
        lang: "elixir",
        filename: "clinical_fedavg.ex",
        code: `defmodule Privacy.ClinicalFedAvg do
  @moduledoc "FedAvg across 5 hospital silos"
  @hospitals [
    %{id: "H1", n: 3000}, %{id: "H2", n: 2500}, %{id: "H3", n: 2000},
    %{id: "H4", n: 1500}, %{id: "H5", n: 1000}
  ]

  def n_total, do: Enum.reduce(@hospitals, 0, fn h, acc -> acc + h.n end)

  def run_rounds(n_rounds) do
    Enum.reduce(1..n_rounds, List.duplicate(0.0, 10), fn _, global ->
      client_weights = Enum.map(@hospitals, fn h ->
        {h, local_train(h.id)}
      end)
      # w_{t+1} = Σ_k (n_k/n) × w_k^t
      Enum.reduce(client_weights, List.duplicate(0.0, 10), fn {h, weights}, acc ->
        weight = h.n / n_total()
        Enum.zip(acc, weights) |> Enum.map(fn {a, w} -> a + weight * w end)
      end)
    end)
  end

  defp local_train(_hospital_id), do: List.duplicate(0.5, 10)
end`,
      },
      {
        lang: "zig",
        filename: "clinical_fedavg.zig",
        code: `const std = @import("std");

const Hospital = struct {
    id: []const u8,
    n_patients: u32,
};

pub fn main() !void {
    const hospitals = [_]Hospital{
        .{ .id = "H1", .n_patients = 3000 },
        .{ .id = "H2", .n_patients = 2500 },
        .{ .id = "H3", .n_patients = 2000 },
        .{ .id = "H4", .n_patients = 1500 },
        .{ .id = "H5", .n_patients = 1000 },
    };
    var n_total: u32 = 0;
    for (hospitals) |h| n_total += h.n_patients;

    // FedAvg: w_{t+1} = Σ_k (n_k/n) × w_k^t
    var global: [10]f64 = .{0} ** 10;
    var round: usize = 0;
    while (round < 10) : (round += 1) {
        var new_global: [10]f64 = .{0} ** 10;
        for (hospitals) |h| {
            const w: f64 = @as(f64, @floatFromInt(h.n_patients)) / @as(f64, @floatFromInt(n_total));
            const client = local_train(h.id);
            var i: usize = 0;
            while (i < 10) : (i += 1) new_global[i] += w * client[i];
        }
        global = new_global;
    }
    std.debug.print("FedAvg global (round 10): {:.4}\\n", .{global[0]});
}

fn local_train(_: []const u8) [10]f64 {
    return .{0.5} ** 10;
}`,
      },
    ],
    runnablePython: `# Clinical FedAvg across 5 hospitals — Pyodide (random only)
import random
print("=== Clinical Trial Federated Learning (FedAvg) ===")
print("Formula: w_{t+1} = Σ_k (n_k / n_total) × w_k^t")
print("Patient data NEVER leaves the hospital — only model weights shared")
print()
random.seed(42)
hospitals = [("H1", 3000), ("H2", 2500), ("H3", 2000), ("H4", 1500), ("H5", 1000)]
n_total = sum(h[1] for h in hospitals)
print(f"{'Hospital':<10} | {'Patients':>9} | {'Weight (n_k/n)':>15}")
print("-" * 45)
for h_id, n_k in hospitals:
    w = n_k / n_total
    print(f"{h_id:<10} | {n_k:>9,} | {w:>15.4f}")
print(f"{'TOTAL':<10} | {n_total:>9,} | {1.0:>15.4f}")
print()
print("FedAvg rounds (10 rounds, 10-dim weights):")
global_w = [0.5] * 10  # initial
for r in range(10):
    client_w = [[random.uniform(0.3, 0.7) for _ in range(10)] for _ in hospitals]
    new_global = [0.0] * 10
    for k, (_, n_k) in enumerate(hospitals):
        weight = n_k / n_total
        for i in range(10):
            new_global[i] += weight * client_w[k][i]
    drift = sum((new_global[i] - global_w[i]) ** 2 for i in range(10)) ** 0.5
    global_w = new_global
    if r < 3 or r == 9:
        print(f"  Round {r+1}: w[0:3]={global_w[:3]}, drift={drift:.4f}")
print()
print("Privacy: data stays local (HIPAA). DP noise on gradients prevents inversion.")
print(f"Final weights: {[round(w,4) for w in global_w]}")`,
    insight: "FedAvg for clinical trials trains a drug-response model across 5 hospital silos without sharing patient data (HIPAA compliance). The weighted average w_{t+1}=Σ(n_k/n)×w_k^t gives larger hospitals proportionally more influence. Adding differential privacy to the gradient updates prevents reconstruction attacks.",
  },
];
