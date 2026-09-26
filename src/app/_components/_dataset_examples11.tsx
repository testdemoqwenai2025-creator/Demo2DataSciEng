// ============================================================
// Scientific dataset examples for /dbt-deep-dive, /airflow, /dagster pages
// 6 examples (2 per page × 5 languages: Scala/Rust/Go/Elixir/Zig)
// Shows how dbt (transform), Airflow (orchestrate), and Dagster
// (asset-oriented) power scientific workloads.
// ============================================================

import type { DatasetExample } from "./dataset-cards";
import {
  Database, Atom, Boxes, Zap, TrendingUp, Activity, Cpu,
  History, Sparkles, Network, ShieldCheck, Layers, Radio,
  Satellite, Microscope, Cloud, Server, Workflow, GitBranch,
  TestTube, Beaker, Cpu as CpuIcon, Boxes as BoxesIcon,
} from "lucide-react";

// ============================================================
// DBT_SCIENCE_EXAMPLES (2 examples)
// ============================================================

export const DBT_SCIENCE_EXAMPLES: DatasetExample[] = [
  // ============================================================
  // 1. GENOMICS TRANSFORM MODELS (Life Sciences)
  //    Bronze VCF → Silver normalised → Gold allele frequency
  // ============================================================
  {
    id: "dbt-genomics-bronze-silver-gold",
    step: "1",
    title: "Genomics Transform Models — Bronze VCF → Silver → Gold allele freq",
    subtitle: "Life sciences — dbt models transform 85M VCF records into population allele frequencies",
    accent: "oklch(0.65 0.16 30)",
    icon: <Microscope className="h-4 w-4" />,
    badge: "Life Sciences · dbt Models",
    brief: {
      dataset: "1000 Genomes Project Phase 3 VCF: ~85 million variants × 2,504 samples from 26 populations. Bronze model = raw VCF parse; Silver model = normalised variant-per-sample records; Gold model = allele frequency by population. dbt models transform Bronze-to-Silver-to-Gold with tests at each layer.",
      scale: "~85M variants × 2,504 samples × 26 populations = ~213M variant-per-sample records in Silver; Gold aggregates to 85M population allele frequencies",
      why: "dbt's modular SQL models map directly to the Bronze→Silver→Gold medallion pattern. Each layer is testable, documented, and traceable. The Gold allele-frequency model is the canonical lookup table for clinical genomics apps — it powers pathogenicity classification (rare alleles are more likely pathogenic). Tests at each layer catch silent data drift: a column name change in the VCF, an unexpected null in clinvar_consequence, a duplicate variant_id.",
    },
    stats: [
      { label: "Bronze rows", value: "85M variants" },
      { label: "Silver rows", value: "213M" },
      { label: "Gold rows", value: "85M AF records" },
      { label: "Models", value: "14 (3 bronze, 6 silver, 5 gold)" },
    ],
    tools: ["dbt-core", "dbt Cloud", "BigQuery", "Snowflake", "1000 Genomes", "GATK", "Hail", "VEP", "gnomAD"],
    codeTabs: [
      {
        lang: "scala",
        filename: "GenomicsDbtRunner.scala",
        code: `import scala.sys.process._
import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

// Scala wrapper around dbt-core CLI for the genomics transform project.
// Bronze model: parses VCF into a wide table (one row per variant).
// Silver model: explodes to one row per variant-per-sample.
// Gold model: aggregates per-population allele frequencies.

object GenomicsDbtRunner {
  // dbt project layout:
  //   models/
  //     bronze/
  //       stg_vcf__raw_variants.sql          -- bronze: raw VCF parse
  //     silver/
  //       int_variants_per_sample.sql        -- silver: explode to variant-sample
  //       int_variant_annotation.sql         -- silver: VEP join
  //     gold/
  //       fct_population_allele_freq.sql     -- gold: AF by population
  //       dim_variants.sql                   -- gold: variant dimension
  //     schema.yml                            -- tests + docs

  def runBronzeSilverGold(target: String): Future[Int] = Future {
    val cmd = Seq(
      "dbt", "run",
      "--profiles-dir", "/etc/dbt",
      "--target", target,
      "--select", "tag:bronze tag:silver tag:gold",
      "--state", "target/state",   // for incremental freshness
      "--no-color"
    )
    val exitCode = cmd.!
    if (exitCode != 0)
      throw new RuntimeException(s"dbt run failed for target \${target}")
    exitCode
  }

  // Run tests after each layer completes (fail-fast on data drift)
  def testLayer(layer: String): Future[Int] = Future {
    val cmd = Seq(
      "dbt", "test",
      "--select", s"tag:\${layer}",
      "--target", "production"
    )
    cmd.!
  }

  // Materialise the gold allele-frequency model as a BigQuery partitioned table
  // CREATE TABLE fct_population_allele_freq PARTITION BY chrom
  //                            CLUSTER BY chrom, pos
  // (
  //   chrom STRING, pos INT64, ref STRING, alt STRING,
  //   population STRING, alt_count INT64, total_count INT64,
  //   allele_freq FLOAT64
  // );
  def goldAlleleFreqSql: String =
    """
      |{{ config(materialized='incremental', incremental_strategy='merge',
      |         unique_key='chrom_pos_pop', cluster_by=['chrom','pos']) }}
      |
      |WITH variant_per_sample AS (
      |  SELECT * FROM {{ ref('int_variants_per_sample') }}
      |  WHERE __loaded_at > (SELECT max(__loaded_at) FROM {{ this }})
      |),
      |pop_counts AS (
      |  SELECT
      |    chrom, pos, ref, alt, sample_population AS population,
      |    COUNTIF(genotype IN ('0/1','1/1')) AS alt_count,
      |    COUNT(1)                    AS total_count
      |  FROM variant_per_sample
      |  GROUP BY 1, 2, 3, 4, 5
      |)
      |SELECT
      |  CONCAT(chrom, '_', pos, '_', population) AS chrom_pos_pop,
      |  chrom, pos, ref, alt, population,
      |  alt_count, total_count,
      |  SAFE_DIVIDE(alt_count, total_count) AS allele_freq
      |FROM pop_counts
    """.stripMargin
}
// Bronze tests: not_null on chrom/pos/ref/alt; accepted_range pos > 0
// Silver tests: unique on (variant_id, sample_id); not_null on genotype
// Gold tests:   accepted_range allele_freq in [0, 1]; dbt_utils.accepted_range
//               relationships: dim_variant matches dim_chrom.chrom`,
      },
      {
        lang: "rust",
        filename: "dbt_genomics_runner.rs",
        code: `use std::process::Command;
use serde::{Deserialize, Serialize};

// Rust wrapper around dbt Cloud REST API for the genomics transform project.
// Use case: a Rust orchestrator that triggers dbt Cloud jobs from a
// Kubernetes CronJob, then ingests the Gold allele-frequency table into
// a clinical genomics microservice.

#[derive(Debug, Serialize, Deserialize)]
struct DbtCloudJob {
    job_id: u64,
    account_id: u64,
    name: String,
    status: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct DbtCloudRunResponse {
    data: DbtCloudJob,
}

/// Trigger a dbt Cloud job to run the genomics Bronze→Silver→Gold models.
async fn trigger_genomics_run(
    api_token: &str,
    account_id: u64,
    job_id: u64,
) -> Result<u64, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let url = format!(
        "https://cloud.getdbt.com/api/v2/accounts/{}/jobs/{}/run/",
        account_id, job_id
    );
    let body = serde_json::json!({
        "cause": "Genomics Bronze→Silver→Gold run triggered by Rust orchestrator"
    });
    let resp = client.post(&url)
        .header("Authorization", format!("Token {}", api_token))
        .header("Content-Type", "application/json")
        .json(&body)
        .send().await?
        .json::<DbtCloudRunResponse>().await?;
    Ok(resp.data.job_id)
}

/// Poll the dbt Cloud run status every 30s until terminal state.
async fn poll_run_status(
    api_token: &str, account_id: u64, run_id: u64,
) -> Result<String, Box<dyn std::error::Error>> {
    loop {
        let url = format!(
            "https://cloud.getdbt.com/api/v2/accounts/{}/runs/{}/",
            account_id, run_id
        );
        let resp: serde_json::Value = reqwest::Client::new()
            .get(&url)
            .header("Authorization", format!("Token {}", api_token))
            .send().await?.json().await?;
        let status = resp["data"]["status"].as_str().unwrap_or("unknown");
        match status {
            "success" | "error" | "cancelled" => return Ok(status.to_string()),
            _ => tokio::time::sleep(std::time::Duration::from_secs(30)).await,
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let api_token = std::env::var("DBT_CLOUD_API_TOKEN")?;
    let account_id: u64 = 12345;
    let job_id: u64 = 67890;  // genomics Bronze→Silver→Gold job

    let run_id = trigger_genomics_run(&api_token, account_id, job_id).await?;
    println!("Triggered dbt Cloud run: id={}", run_id);

    let status = poll_run_status(&api_token, account_id, run_id).await?;
    println!("Final status: {}", status);

    // If success, the Gold allele_freq table is materialised in BigQuery.
    // The downstream clinical genomics service can now query it for
    // pathogenicity classification (rare alleles = more likely pathogenic).
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "dbt_genomics_runner.go",
        code: `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"
)

// Go client for the dbt Cloud REST API — triggers and polls the
// genomics Bronze→Silver→Gold transform job. Use case: a Go-based
// Kubernetes operator that runs on a CronJob schedule and triggers
// dbt Cloud whenever the upstream VCF ingest completes.

type DbtCloudRunResponse struct {
    Data struct {
        ID     int64  \`json:"id"\`
        Status string \`json:"status"\`
    } \`json:"data"\`
}

func triggerGenomicsRun(apiToken string, accountID, jobID int64) (int64, error) {
    url := fmt.Sprintf(
        "https://cloud.getdbt.com/api/v2/accounts/%d/jobs/%d/run/",
        accountID, jobID,
    )
    body, _ := json.Marshal(map[string]string{
        "cause": "Genomics Bronze→Silver→Gold run via Go operator",
    })
    req, _ := http.NewRequest("POST", url, bytes.NewBuffer(body))
    req.Header.Set("Authorization", "Token "+apiToken)
    req.Header.Set("Content-Type", "application/json")

    resp, err := http.DefaultClient.Do(req)
    if err != nil { return 0, err }
    defer resp.Body.Close()

    var result DbtCloudRunResponse
    json.NewDecoder(resp.Body).Decode(&result)
    return result.Data.ID, nil
}

func pollRunStatus(apiToken string, accountID, runID int64) (string, error) {
    for {
        url := fmt.Sprintf(
            "https://cloud.getdbt.com/api/v2/accounts/%d/runs/%d/",
            accountID, runID,
        )
        req, _ := http.NewRequest("GET", url, nil)
        req.Header.Set("Authorization", "Token "+apiToken)
        resp, _ := http.DefaultClient.Do(req)
        body, _ := io.ReadAll(resp.Body)
        resp.Body.Close()

        var result DbtCloudRunResponse
        json.Unmarshal(body, &result)
        switch result.Data.Status {
        case "success", "error", "cancelled":
            return result.Data.Status, nil
        }
        time.Sleep(30 * time.Second)
    }
}

func main() {
    apiToken := getenvOrFatal("DBT_CLOUD_API_TOKEN")
    const accountID = 12345
    const jobID = 67890  // genomics Bronze→Silver→Gold

    runID, err := triggerGenomicsRun(apiToken, accountID, jobID)
    if err != nil { fmt.Println("error:", err); return }
    fmt.Printf("Triggered dbt Cloud run: id=%d\\n", runID)

    status, _ := pollRunStatus(apiToken, accountID, runID)
    fmt.Printf("Final status: %s\\n", status)
}

func getenvOrFatal(k string) string {
    v := os.Getenv(k)
    if v == "" { log.Fatalf("%s not set", k) }
    return v
}`,
      },
      {
        lang: "elixir",
        filename: "dbt_genomics_runner.ex",
        code: `defmodule Genomics.DbtRunner do
  @moduledoc """
  Elixir/Phoenix orchestrator that triggers the dbt genomics
  Bronze→Silver→Gold transform job via the dbt Cloud REST API.
  Listens to a Kafka topic of newly-arrived VCF files and triggers
  a dbt Cloud run when new data lands.
  """
  use GenServer
  require Logger

  @dbt_base "https://cloud.getdbt.com/api/v2"

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def trigger_run do
    GenServer.cast(__MODULE__, :trigger_genomics_run)
  end

  @impl true
  def init(_opts) do
    # Subscribe to the "new-vcf-arrived" Kafka topic.
    KafkaEx.subscribe(__MODULE__, "new-vcf-arrived")
    {:ok, %{}}
  end

  @impl true
  def handle_info({:kafka_message, _topic, _msg}, state) do
    # New VCF arrived — trigger the dbt Bronze→Silver→Gold run.
    Logger.info("New VCF arrived — triggering dbt genomics run")
    case trigger_dbt_run() do
      {:ok, run_id} ->
        Task.start(fn -> poll_run(run_id) end)
        {:noreply, Map.put(state, :current_run, run_id)}
      {:error, reason} ->
        Logger.error("Failed to trigger dbt run: #{inspect(reason)}")
        {:noreply, state}
    end
  end

  @impl true
  def handle_cast(:trigger_genomics_run, state) do
    case trigger_dbt_run() do
      {:ok, run_id} ->
        Task.start(fn -> poll_run(run_id) end)
        {:noreply, Map.put(state, :current_run, run_id)}
      {:error, reason} ->
        Logger.error("Trigger failed: #{inspect(reason)}")
        {:noreply, state}
    end
  end

  defp trigger_dbt_run do
    body = %{cause: "Genomics Bronze→Silver→Gold via Elixir orchestrator"}
    headers = [
      {"Authorization", "Token " <> System.get_env("DBT_CLOUD_API_TOKEN")},
      {"Content-Type", "application/json"}
    ]
    url = "#{@dbt_base}/accounts/12345/jobs/67890/run/"
    case HTTPoison.post(url, Jason.encode!(body), headers) do
      {:ok, %{status_code: 200, body: body}} ->
        {:ok, Jason.decode!(body)["data"]["id"]}
      {:ok, resp} ->
        {:error, {:http_error, resp.status_code}}
      {:error, _} = err -> err
    end
  end

  defp poll_run(run_id) do
    url = "#{@dbt_base}/accounts/12345/runs/#{run_id}/"
    headers = [{"Authorization", "Token " <> System.get_env("DBT_CLOUD_API_TOKEN")}]

    case HTTPoison.get(url, headers) do
      {:ok, %{body: body}} ->
        status = Jason.decode!(body)["data"]["status"]
        case status do
          s when s in ["success", "error", "cancelled"] ->
            Logger.info("dbt genomics run #{run_id} final status: #{status}")
            :ok
          _ ->
            Process.sleep(30_000)
            poll_run(run_id)
        end
    end
  end
end`,
      },
      {
        lang: "zig",
        filename: "dbt_genomics_runner.zig",
        code: `const std = @import("std");
const http = @import("http-zig");

// Zig client for the dbt Cloud REST API — triggers and polls the
// genomics Bronze→Silver→Gold transform job. Use case: a Zig
// static binary deployed to a Cloud Run service that triggers dbt
// Cloud on a Cron schedule with minimal cold-start latency.

const DbtRunResponse = struct {
    data: struct {
        id: i64,
        status: []const u8,
    },
};

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const api_token = std.posix.getenv("DBT_CLOUD_API_TOKEN") orelse {
        std.debug.print("DBT_CLOUD_API_TOKEN not set\\n", .{});
        return;
    };

    // Trigger the genomics Bronze→Silver→Gold run.
    const url = "https://cloud.getdbt.com/api/v2/accounts/12345/jobs/67890/run/";

    var client = http.Client.init(allocator);
    defer client.deinit();

    var resp = try client.post(allocator, .{
        .url = url,
        .headers = &.{
            .{ .key = "Authorization", .value = try std.fmt.allocPrint(allocator, "Token {s}", .{api_token}) },
            .{ .key = "Content-Type", .value = "application/json" },
        },
        .body =
            \\\\{"cause":"Genomics Bronze→Silver→Gold via Zig orchestrator"}
        ,
    });
    defer resp.deinit();

    var parsed = try std.json.parseFromSlice(DbtRunResponse, allocator, resp.body, .{});
    defer parsed.deinit();
    const run_id = parsed.value.data.id;
    std.debug.print("Triggered dbt Cloud run: id={d}\\n", .{run_id});

    // Poll the run status every 30s until terminal state.
    while (true) {
        std.time.sleep(30 * std.time.ns_per_s);
        const poll_url = try std.fmt.allocPrint(
            allocator,
            "https://cloud.getdbt.com/api/v2/accounts/12345/runs/{d}/",
            .{run_id}
        );
        defer allocator.free(poll_url);

        var poll_resp = try client.get(allocator, .{
            .url = poll_url,
            .headers = &.{
                .{ .key = "Authorization", .value = try std.fmt.allocPrint(allocator, "Token {s}", .{api_token}) },
            },
        });
        defer poll_resp.deinit();

        var poll_parsed = try std.json.parseFromSlice(DbtRunResponse, allocator, poll_resp.body, .{});
        defer poll_parsed.deinit();
        const status = poll_parsed.value.data.status;

        if (std.mem.eql(u8, status, "success") or
            std.mem.eql(u8, status, "error") or
            std.mem.eql(u8, status, "cancelled")) {
            std.debug.print("Final status: {s}\\n", .{status});
            break;
        }
    }
}`,
      },
    ],
    runnablePython: `# Genomics Bronze→Silver→Gold via dbt models — Pyodide simulation
import random
from collections import defaultdict

print("=== Genomics Transform Models — Bronze→Silver→Gold ===")
print("Project: 1000 Genomes Phase 3 · 85M variants × 2,504 samples × 26 populations")
print("Models: 14 (3 bronze + 6 silver + 5 gold)")
print()

random.seed(42)

# BRONZE: raw VCF records — one row per variant per sample (wide)
# Each VCF record has CHROM, POS, REF, ALT, FORMAT/sample-fields
print("BRONZE layer: stg_vcf__raw_variants")
bronze_variants = []
for v in range(200):  # scaled from 85M
    chrom = random.choice(["chr" + str(i) for i in range(1, 23)] + ["chrX", "chrY"])
    pos = random.randint(1, 250_000_000)
    ref = random.choice("ACGT")
    alt = random.choice("ACGT")
    bronze_variants.append({
        "variant_id": f"{chrom}:{pos}:{ref}>{alt}",
        "chrom": chrom, "pos": pos, "ref": ref, "alt": alt,
    })
print(f"  Bronze rows: {len(bronze_variants):,} (one row per variant)")

# SILVER: explode to variant-per-sample — one row per (variant, sample)
print()
print("SILVER layer: int_variants_per_sample")
samples = [f"sample-{i:04d}" for i in range(100)]  # scaled from 2,504
populations = ["AFR", "AMR", "EUR", "EAS", "SAS"]
silver_records = []
for v in bronze_variants:
    for s in samples:
        # Genotype distribution: ~70% ref/ref, ~25% ref/alt, ~5% alt/alt
        genotype = random.choices(["0/0", "0/1", "1/1"], weights=[70, 25, 5])[0]
        population = random.choice(populations)
        silver_records.append({
            "variant_id": v["variant_id"],
            "chrom": v["chrom"], "pos": v["pos"],
            "ref": v["ref"], "alt": v["alt"],
            "sample_id": s, "population": population,
            "genotype": genotype,
        })
print(f"  Silver rows: {len(silver_records):,} (one row per variant-per-sample)")
print(f"  = {len(bronze_variants):,} variants × {len(samples):,} samples")

# GOLD: aggregate allele frequency by population
print()
print("GOLD layer: fct_population_allele_freq")
gold_records = defaultdict(lambda: {"alt": 0, "total": 0})
for r in silver_records:
    key = (r["variant_id"], r["population"])
    has_alt = r["genotype"] in ("0/1", "1/1")
    gold_records[key]["alt"] += int(has_alt)
    gold_records[key]["total"] += 1

# Materialise the gold table
gold_rows = []
for (variant_id, pop), counts in gold_records.items():
    allele_freq = counts["alt"] / counts["total"] if counts["total"] > 0 else 0
    gold_rows.append({
        "variant_id": variant_id,
        "population": pop,
        "alt_count": counts["alt"],
        "total_count": counts["total"],
        "allele_freq": allele_freq,
    })
print(f"  Gold rows: {len(gold_rows):,} (one row per variant × population)")

# dbt tests at each layer
print()
print("=== dbt tests (run after each layer materialises) ===")
tests = [
    ("bronze", "not_null",            "chrom",            "PASS"),
    ("bronze", "not_null",            "pos",              "PASS"),
    ("bronze", "accepted_range",     "pos > 0",          "PASS"),
    ("bronze", "unique",              "variant_id",       "PASS"),
    ("silver", "not_null",            "genotype",         "PASS"),
    ("silver", "accepted_values",    "genotype in (0/0,0/1,1/1)", "PASS"),
    ("silver", "relationships",       "variant_id → bronze", "PASS"),
    ("gold",   "accepted_range",     "allele_freq in [0,1]", "PASS"),
    ("gold",   "not_null",            "population",       "PASS"),
    ("gold",   "unique",              "variant_id+population", "PASS"),
]
print(f"{'Layer':<8} | {'Test':<22} | {'Field':<32} | {'Status'}")
print("-" * 80)
for layer, test, field, status in tests:
    print(f"{layer:<8} | {test:<22} | {field:<32} | {status}")

# Show top 5 rare alleles (most pathogenic candidates)
print()
print("=== Top 5 rarest alleles (most likely pathogenic candidates) ===")
rare = sorted(gold_rows, key=lambda r: r["allele_freq"])[:5]
for r in rare:
    print(f"  {r['variant_id']:<32} | pop={r['population']} | "
          f"AF={r['allele_freq']:.4f} | "
          f"alt/total={r['alt_count']}/{r['total_count']}")

print()
print("Key insight: dbt's modular SQL models map directly to the")
print("Bronze→Silver→Gold medallion pattern. Each layer is testable,")
print("documented, and traceable. The Gold allele-frequency model is the")
print("canonical lookup table for clinical genomics apps — rare alleles")
print("are more likely pathogenic, so they're triaged first by geneticists.")`,
    insight: "dbt's modular SQL models map cleanly to the Bronze→Silver→Gold medallion pattern. Bronze parses raw VCF into wide rows; Silver explodes to one row per variant-per-sample (the natural grain for downstream joins); Gold aggregates to population allele frequencies. dbt tests at each layer catch silent data drift: a column rename in the VCF, an unexpected null in clinvar_consequence, or a duplicate variant_id all fail the run fast. The Gold allele-frequency model becomes the canonical lookup table for clinical genomics apps — rare alleles (AF < 0.001) are triaged first as pathogenic candidates by geneticists.",
  },

  // ============================================================
  // 2. CLINICAL TRIAL QA — FDA FAERS DATA QUALITY TESTS (Life Sciences)
  // ============================================================
  {
    id: "dbt-clinical-trial-faers-qa",
    step: "2",
    title: "Clinical Trial QA — FDA FAERS Adverse Event Data Quality Tests",
    subtitle: "Life sciences — dbt tests validate 14M+ adverse event reports from FDA FAERS",
    accent: "oklch(0.65 0.16 0)",
    icon: <TestTube className="h-4 w-4" />,
    badge: "Life Sciences · QA",
    brief: {
      dataset: "FDA Adverse Event Reporting System (FAERS): ~14 million adverse event reports submitted by healthcare professionals, manufacturers, and consumers since 1969. Quarterly releases; each report has patient demographics, drug exposures, reactions (MedDRA PT terms), and outcomes (death, life-threatening, hospitalisation, disability). dbt tests validate schema, referential integrity, business rules, and statistical distributions on every quarterly load.",
      scale: "~14M adverse event reports · 4,000+ unique drugs · ~1,000 MedDRA preferred terms · 6 outcome severities · 200+ columns across 7 source tables (DEMO, DRUG, REAC, OUTC, INDI, THER, PROC)",
      why: "Pharmacovigilance requires auditable, testable, traceable data. dbt tests encode regulatory expectations: a primaryid must be unique (one report = one row in DEMO), every drug record must reference a valid primaryid (referential integrity), outcome codes must be in the allowed enum, and the case age must be > 0 and < 130 years. dbt's test failures become FDA audit evidence — when regulators ask 'why was this signal ignored?', the team can show the dbt run log proving the data passed every test before being released to analysts.",
    },
    stats: [
      { label: "Reports", value: "~14M" },
      { label: "Source tables", value: "7 (DEMO, DRUG, REAC, ...)" },
      { label: "Columns", value: "200+" },
      { label: "dbt tests", value: "47 (schema + business rules)" },
    ],
    tools: ["dbt-core", "dbt-utils", "dbt-expectations", "dbt Cloud", "Snowflake", "FDA FAERS", "MedDRA", "RxNorm", "Elementary"],
    codeTabs: [
      {
        lang: "scala",
        filename: "FaersDbtTests.scala",
        code: `import scala.sys.process._
import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

// Scala wrapper that runs dbt tests on the FDA FAERS transform project.
// Each test failure is captured and routed to a Slack alert + Jira ticket.

object FaersDbtTests {
  // schema.yml defines the FAERS source + 7 staging models + tests:
  //
  // version: 2
  // sources:
  //   - name: faers_raw
  //     database: pharmacovigilance
  //     tables:
  //       - name: demo  # patient demographics
  //       - name: drug  # drug exposures
  //       - name: reac  # adverse reactions (MedDRA PT)
  //       - name: outc  # outcomes (death, hospitalisation, etc.)
  // models:
  //   - name: stg_faers__demo
  //     description: One row per adverse event report (primaryid grain).
  //     columns:
  //       - name: primaryid
  //         tests:
  //           - unique
  //           - not_null
  //       - name: age
  //         tests:
  //           - not_null
  //           - dbt_utils.accepted_range:
  //               min_value: 0
  //               max_value: 130
  //       - name: sex
  //         tests:
  //           - accepted_values:
  //               values: ['M', 'F', 'UNK', 'NS']
  //   - name: stg_faers__drug
  //     description: One row per drug exposure per report.
  //     columns:
  //       - name: primaryid
  //         tests:
  //           - not_null
  //           - relationships:
  //               to: ref('stg_faers__demo')
  //               field: primaryid
  //       - name: role_cod
  //         tests:
  //           - accepted_values:
  //               values: ['PS', 'SS', 'C', 'I']  # primary, secondary, concomitant, interacting

  def runAllTests(): Future[Int] = Future {
    val cmd = Seq(
      "dbt", "test",
      "--profiles-dir", "/etc/dbt",
      "--target", "production",
      "--select", "tag:faers",
      "--store-failures",   // persist failing rows to a quarantine table
      "--no-color"
    )
    cmd.!
  }

  // Custom singular test: every primaryid in drug must appear in demo
  // (referential integrity — dbt_utils.relationships is the macro version)
  def referentialIntegritySql: String =
    """
      |-- singular_test_drug_demo_relationship.sql
      |SELECT count(*) AS missing_primaryid_count
      |FROM {{ ref('stg_faers__drug') }} AS d
      |LEFT JOIN {{ ref('stg_faers__demo') }} AS p
      |  ON d.primaryid = p.primaryid
      |WHERE p.primaryid IS NULL
      |HAVING count(*) > 0
    """.stripMargin

  // Custom singular test: outcome codes in allowed enum
  def outcomeCodeEnumSql: String =
    """
      |-- singular_test_outcome_codes.sql
      |SELECT DISTINCT outc_cod
      |FROM {{ ref('stg_faers__outc') }}
      |WHERE outc_cod NOT IN (
      |  'DE',  -- death
      |  'LT',  -- life-threatening
      |  'HO',  -- hospitalisation
      |  'DS',  -- disability
      |  'CA',  -- congenital anomaly
      |  'RI',  -- required intervention
      |  'OT'   -- other
      |)
    """.stripMargin
}
// On test failure: dbt Cloud routes the failure via webhook to
// Slack + creates a Jira ticket in the PV-QA board. The failing
// rows are persisted to schema.dbt_test__audit_failures for triage.`,
      },
      {
        lang: "rust",
        filename: "faers_dbt_tests.rs",
        code: `use serde::{Deserialize, Serialize};

// Rust service that polls dbt Cloud for FAERS test results and routes
// failures to Slack + Jira. Runs as a Kubernetes Deployment, triggered
// by the FAERS quarterly load completion webhook.

#[derive(Debug, Serialize, Deserialize)]
struct DbtTestResult {
    name: String,
    status: String,           // pass | fail | warn | error
    failures: Option<u32>,
    execution_time: f64,
}

#[derive(Debug, Serialize, Deserialize)]
struct DbtRunResults {
    data: Vec<DbtTestResult>,
}

async fn fetch_test_results(
    api_token: &str, account_id: u64, run_id: u64,
) -> Result<Vec<DbtTestResult>, Box<dyn std::error::Error>> {
    let url = format!(
        "https://cloud.getdbt.com/api/v2/accounts/{}/runs/{}/artifacts/run_results.json",
        account_id, run_id
    );
    let resp: DbtRunResults = reqwest::Client::new()
        .get(&url)
        .header("Authorization", format!("Token {}", api_token))
        .send().await?.json().await?;
    Ok(resp.data)
}

async fn alert_slack(failures: &[&DbtTestResult]) -> Result<(), Box<dyn std::error::Error>> {
    let webhook = std::env::var("SLACK_WEBHOOK")?;
    let mut lines = vec![String::from(":rotating_light: FAERS dbt test failures:")];
    for f in failures {
        lines.push(format!(
            "  *{}* — {} failures ({:.1}s)",
            f.name, f.failures.unwrap_or(0), f.execution_time
        ));
    }
    let body = serde_json::json!({ "text": lines.join("\\n") });
    reqwest::Client::new()
        .post(&webhook)
        .json(&body)
        .send().await?;
    Ok(())
}

async fn create_jira_ticket(f: &DbtTestResult) -> Result<(), Box<dyn std::error::Error>> {
    let jira = std::env::var("JIRA_BASE_URL")?;
    let token = std::env::var("JIRA_API_TOKEN")?;
    let body = serde_json::json!({
        "fields": {
            "project": {"key": "PVQA"},
            "summary": format!("FAERS test failure: {}", f.name),
            "description": format!(
                "dbt test {} failed with {} failures.\\nExecution time: {:.1}s\\nStatus: {}",
                f.name, f.failures.unwrap_or(0), f.execution_time, f.status
            ),
            "issuetype": {"name": "Bug"},
            "labels": ["faers", "data-quality", "dbt-test-failure"]
        }
    });
    reqwest::Client::new()
        .post(format!("{}/rest/api/3/issue", jira))
        .basic_auth("data-platform@pharmacovigilance.com", Some(token))
        .header("Content-Type", "application/json")
        .json(&body)
        .send().await?;
    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let api_token = std::env::var("DBT_CLOUD_API_TOKEN")?;
    let results = fetch_test_results(&api_token, 12345, 98765).await?;

    let failures: Vec<&DbtTestResult> = results.iter()
        .filter(|r| r.status == "fail" || r.status == "error")
        .collect();

    if !failures.is_empty() {
        alert_slack(&failures).await?;
        for f in &failures {
            create_jira_ticket(f).await?;
        }
        println!("Alerted {} failures to Slack + Jira", failures.len());
    } else {
        println!("All FAERS dbt tests passed");
    }
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "faers_dbt_tests.go",
        code: `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
    "strings"
)

// Go service that downloads the dbt artifacts (run_results.json + manifest.json)
// after a FAERS test run, then routes any failing tests to a PagerDuty alert
// and creates a GitHub issue in the pharmacovigilance repo.

type TestResult struct {
    Name      string  \`json:"name"\`
    Status    string  \`json:"status"\`
    Failures  int     \`json:"failures"\`
    ExecTime  float64 \`json:"execution_time"\`
}

type RunResults struct {
    Data []TestResult \`json:"data"\`
}

func fetchTestResults(apiToken string, accountID, runID int64) ([]TestResult, error) {
    url := fmt.Sprintf(
        "https://cloud.getdbt.com/api/v2/accounts/%d/runs/%d/artifacts/run_results.json",
        accountID, runID,
    )
    req, _ := http.NewRequest("GET", url, nil)
    req.Header.Set("Authorization", "Token "+apiToken)
    resp, err := http.DefaultClient.Do(req)
    if err != nil { return nil, err }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    var results RunResults
    json.Unmarshal(body, &results)
    return results.Data, nil
}

func alertPagerDuty(failures []TestResult) error {
    webhook := os.Getenv("PAGERDUTY_WEBHOOK")
    var sb strings.Builder
    sb.WriteString("FAERS dbt test failures:\\n")
    for _, f := range failures {
        sb.WriteString(fmt.Sprintf(
            "  %s — %d failures (%.1fs)\\n",
            f.Name, f.Failures, f.ExecTime,
        ))
    }
    body, _ := json.Marshal(map[string]string{
        "description": sb.String(),
        "severity":    "critical",
    })
    _, err := http.Post(webhook, "application/json", bytes.NewBuffer(body))
    return err
}

func createGitHubIssue(f TestResult) error {
    repo := os.Getenv("GITHUB_REPO")
    token := os.Getenv("GITHUB_TOKEN")
    body, _ := json.Marshal(map[string]interface{}{
        "title":  fmt.Sprintf("FAERS test failure: %s", f.Name),
        "body":   fmt.Sprintf("dbt test %s failed with %d failures.", f.Name, f.Failures),
        "labels": []string{"faers", "data-quality", "dbt"},
    })
    req, _ := http.NewRequest("POST",
        "https://api.github.com/repos/"+repo+"/issues",
        bytes.NewBuffer(body),
    )
    req.Header.Set("Authorization", "token "+token)
    req.Header.Set("Accept", "application/vnd.github+json")
    _, err := http.DefaultClient.Do(req)
    return err
}

func main() {
    apiToken := os.Getenv("DBT_CLOUD_API_TOKEN")
    results, _ := fetchTestResults(apiToken, 12345, 98765)

    var failures []TestResult
    for _, r := range results {
        if r.Status == "fail" || r.Status == "error" {
            failures = append(failures, r)
        }
    }

    if len(failures) > 0 {
        alertPagerDuty(failures)
        for _, f := range failures {
            createGitHubIssue(f)
        }
        fmt.Printf("Alerted %d failures to PagerDuty + GitHub\\n", len(failures))
    } else {
        fmt.Println("All FAERS dbt tests passed")
    }
}`,
      },
      {
        lang: "elixir",
        filename: "faers_dbt_tests.ex",
        code: `defmodule Faers.DbtTestRouter do
  @moduledoc """
  Phoenix LiveView dashboard that surfaces FAERS dbt test results
  in real-time. Routes failures to Slack + Jira, displays pass/fail
  counts per model, and lets pharmacovigilance analysts drill into
  failing rows (persisted to dbt_test__audit_failures by dbt Cloud).
  """
  use Phoenix.LiveView
  require Logger

  @dbt_base "https://cloud.getdbt.com/api/v2"

  def render(assigns) do
    ~H"""
    <div>
      <h3>FAERS dbt test results — {{@run_id}}</h3>
      <p>Passed: {{@passed}} | Failed: {{@failed}} | Warned: {{@warned}}</p>
      <table>
        <tr><th>Test</th><th>Status</th><th>Failures</th><th>Time</th></tr>
        <%= for t <- @tests do %>
          <tr style="color: {{test_color(t.status)}}">
            <td><%= t.name %></td>
            <td><%= t.status %></td>
            <td><%= t.failures %></td>
            <td><%= :fwi.format(t.exec_time, 2) %>s</td>
          </tr>
        <% end %>
      </table>
    </div>
    """
  end

  def mount(_params, _session, socket) do
    # Subscribe to dbt Cloud run-completion webhook
    Phoenix.PubSub.subscribe(Faers.PubSub, "dbt_run_completed")
    {:ok, assign(socket, tests: [], passed: 0, failed: 0, warned: 0, run_id: nil)}
  end

  def handle_info({:dbt_run_completed, run_id}, socket) do
    tests = fetch_test_results(run_id)
    passed = Enum.count(tests, & &1.status == "pass")
    failed = Enum.count(tests, & &1.status == "fail")
    warned = Enum.count(tests, & &1.status == "warn")

    # Route failures to Slack + Jira
    failures = Enum.filter(tests, & &1.status in ["fail", "error"])
    if length(failures) > 0 do
      Task.start(fn -> alert_slack(failures) end)
      Task.start(fn -> create_jira_tickets(failures) end)
    end

    {:noreply, assign(socket,
      tests: tests, passed: passed, failed: failed, warned: warned, run_id: run_id
    )}
  end

  defp fetch_test_results(run_id) do
    url = "#{@dbt_base}/accounts/12345/runs/#{run_id}/artifacts/run_results.json"
    headers = [{"Authorization", "Token " <> System.get_env("DBT_CLOUD_API_TOKEN")}]
    {:ok, %{body: body}} = HTTPoison.get(url, headers)
    Jason.decode!(body)["data"]
    |> Enum.map(fn t ->
      %{name: t["name"], status: t["status"], failures: t["failures"] || 0,
        exec_time: t["execution_time"]}
    end)
  end

  defp alert_slack(failures) do
    webhook = System.get_env("SLACK_WEBHOOK")
    msg = Enum.join([
      ":rotating_light: FAERS dbt test failures:" |
      for f <- failures, do: "  #{f.name} — #{f.failures} failures"
    ], "\\n")
    HTTPoison.post(webhook, Jason.encode!(%{text: msg}), [
      {"Content-Type", "application/json"}
    ])
  end

  defp create_jira_tickets(failures) do
    for f <- failures do
      body = Jason.encode!(%{
        fields: %{
          project: %{key: "PVQA"},
          summary: "FAERS test failure: #{f.name}",
          description: "dbt test #{f.name} failed with #{f.failures} failures.",
          issuetype: %{name: "Bug"},
          labels: ["faers", "data-quality", "dbt-test-failure"]
        }
      })
      HTTPoison.post(
        "https://pharmacovigilance.atlassian.net/rest/api/3/issue",
        body,
        [
          {"Authorization", "Basic " <> System.get_env("JIRA_BASIC_AUTH")},
          {"Content-Type", "application/json"}
        ]
      )
    end
  end

  defp test_color("pass"), do: "green"
  defp test_color("fail"), do: "red"
  defp test_color("warn"), do: "orange"
  defp test_color(_), do: "gray"
end`,
      },
      {
        lang: "zig",
        filename: "faers_dbt_tests.zig",
        code: `const std = @import("std");
const http = @import("http-zig");

// Zig service that polls dbt Cloud for FAERS test results and
// alerts on failures. Use case: a Zig static binary deployed as
// a Lambda function — triggered by the FAERS quarterly load
// webhook, fetches test results, routes failures to a SQS queue
// for downstream ticketing.

const TestResult = struct {
    name: []const u8,
    status: []const u8,
    failures: i64,
    execution_time: f64,
};

const RunResults = struct {
    data: []TestResult,
};

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const api_token = std.posix.getenv("DBT_CLOUD_API_TOKEN") orelse return;

    var client = http.Client.init(allocator);
    defer client.deinit();

    // Fetch the FAERS test run results artifact
    const url = "https://cloud.getdbt.com/api/v2/accounts/12345/runs/98765/artifacts/run_results.json";

    var auth_header = try std.fmt.allocPrint(allocator, "Token {s}", .{api_token});
    defer allocator.free(auth_header);

    var resp = try client.get(allocator, .{
        .url = url,
        .headers = &.{
            .{ .key = "Authorization", .value = auth_header },
        },
    });
    defer resp.deinit();

    var parsed = try std.json.parseFromSlice(RunResults, allocator, resp.body, .{});
    defer parsed.deinit();

    var passed: usize = 0;
    var failed: usize = 0;
    var warned: usize = 0;

    for (parsed.value.data) |t| {
        if (std.mem.eql(u8, t.status, "pass")) {
            passed += 1;
        } else if (std.mem.eql(u8, t.status, "fail")) {
            failed += 1;
            std.debug.print("FAILURE: {s} — {d} failures ({d:.1}s)\\n",
                .{ t.name, t.failures, t.execution_time });
        } else if (std.mem.eql(u8, t.status, "warn")) {
            warned += 1;
        }
    }

    std.debug.print("Total: {d} passed, {d} failed, {d} warned\\n",
        .{ passed, failed, warned });

    if (failed > 0) {
        // Route to SQS for downstream ticketing
        std.debug.print("Routing {d} failures to SQS for triage\\n", .{failed});
    }
}`,
      },
    ],
    runnablePython: `# Clinical Trial QA — FDA FAERS dbt tests simulation (Pyodide)
import random
from collections import defaultdict

print("=== Clinical Trial QA — FDA FAERS dbt tests ===")
print("Dataset: FDA Adverse Event Reporting System (FAERS)")
print("Scale: ~14M reports · 7 source tables · 200+ columns · 47 dbt tests")
print()

random.seed(42)

# Simulate FAERS quarterly load (scaled)
n_reports = 1000  # scaled from 14M
outcomes_enum = ["DE", "LT", "HO", "DS", "CA", "RI", "OT"]  # death, life-threat, hosp, ...
sex_enum = ["M", "F", "UNK", "NS"]
role_enum = ["PS", "SS", "C", "I"]

# DEMO table: one row per report
print("Source: faers_raw.demo (patient demographics)")
demo_rows = []
for i in range(n_reports):
    # Inject occasional data quality issues (1% null age, 0.5% invalid sex)
    if random.random() < 0.01:
        age = None
    else:
        age = random.randint(0, 95)
    if random.random() < 0.005:
        sex = "X"  # invalid — should fail accepted_values test
    else:
        sex = random.choice(sex_enum)
    demo_rows.append({
        "primaryid": i + 1,
        "age": age,
        "sex": sex,
        "report_date": f"2024-Q3-{(i % 90) + 1:02d}",
    })
print(f"  Reports loaded: {len(demo_rows):,}")

# DRUG table: multiple rows per report
print()
print("Source: faers_raw.drug (drug exposures)")
drug_rows = []
for r in demo_rows:
    n_drugs = random.randint(1, 5)
    for _ in range(n_drugs):
        # 0.3% of drug records have an invalid primaryid (FK violation)
        if random.random() < 0.003:
            primaryid = 999_999_999  # nonexistent
        else:
            primaryid = r["primaryid"]
        drug_rows.append({
            "drug_id": len(drug_rows) + 1,
            "primaryid": primaryid,
            "drug_name": random.choice(["Aspirin", "Ibuprofen", "Metformin", "Lisinopril", "Atorvastatin"]),
            "role_cod": random.choice(role_enum),
        })
print(f"  Drug exposures: {len(drug_rows):,}")

# OUTC table: outcomes per report
print()
print("Source: faers_raw.outc (outcomes)")
outc_rows = []
for r in demo_rows:
    # 0.2% have an invalid outcome code
    if random.random() < 0.002:
        outc_cod = "ZZ"  # invalid
    else:
        outc_cod = random.choice(outcomes_enum)
    outc_rows.append({
        "primaryid": r["primaryid"],
        "outc_cod": outc_cod,
    })
print(f"  Outcomes: {len(outc_rows):,}")

# Run dbt tests against the loaded source data
print()
print("=== dbt test execution ===")
tests = [
    # (model, test_type, field, expected, actual, status)
    ("stg_faers__demo", "unique",            "primaryid",        "no duplicates",      "0 duplicates",                            "PASS"),
    ("stg_faers__demo", "not_null",          "primaryid",         "0 nulls",            f"{sum(1 for r in demo_rows if r['primaryid'] is None)} nulls",                       "PASS"),
    ("stg_faers__demo", "not_null",          "age",               "0 nulls",            f"{sum(1 for r in demo_rows if r['age'] is None)} nulls",                                  "WARN"),
    ("stg_faers__demo", "accepted_range",    "age (0-130)",       "0 out-of-range",     f"{sum(1 for r in demo_rows if r['age'] is not None and (r['age'] < 0 or r['age'] > 130))} out-of-range", "PASS"),
    ("stg_faers__demo", "accepted_values",    "sex (M/F/UNK/NS)",  "0 invalid",          f"{sum(1 for r in demo_rows if r['sex'] not in sex_enum)} invalid",                        "FAIL"),
    ("stg_faers__drug", "not_null",          "primaryid",         "0 nulls",            "0 nulls",                            "PASS"),
    ("stg_faers__drug", "relationships",     "drug.primaryid→demo", "0 orphan drugs",   f"{sum(1 for d in drug_rows if d['primaryid'] not in [r['primaryid'] for r in demo_rows])} orphan drugs", "FAIL"),
    ("stg_faers__drug", "accepted_values",   "role_cod",          "0 invalid",          "0 invalid",                          "PASS"),
    ("stg_faers__outc", "accepted_values",   "outc_cod",          "0 invalid",          f"{sum(1 for o in outc_rows if o['outc_cod'] not in outcomes_enum)} invalid",               "FAIL"),
]

print(f"{'Model':<22} | {'Test':<18} | {'Field':<26} | {'Expected':<18} | {'Actual':<22} | Status")
print("-" * 120)
for m, t, f, exp, act, status in tests:
    marker = "[OK] " if status == "PASS" else "[!!] " if status == "FAIL" else "[~]  "
    print(f"{marker}{m:<22} | {t:<18} | {f:<26} | {exp:<18} | {act:<22} | {status}")

# Summary
passed = sum(1 for _, _, _, _, _, s in tests if s == "PASS")
failed = sum(1 for _, _, _, _, _, s in tests if s == "FAIL")
warned = sum(1 for _, _, _, _, _, s in tests if s == "WARN")
print()
print(f"Summary: {passed} passed, {failed} failed, {warned} warned (of {len(tests)} tests)")
print()
print("Routing:")
print("  - PASS → green ✓ in dashboard")
print("  - WARN → amber warning, run continues")
print("  - FAIL → red alert + Slack notification + Jira ticket created")
print("  - Failing rows persisted to dbt_test__audit_failures for triage")
print()
print("Key insight: dbt tests encode regulatory expectations — primaryid")
print("must be unique (one report = one row), age must be in [0, 130],")
print("outcome codes must be in the MedDRA enum. Test failures become FDA")
print("audit evidence — when regulators ask 'why was this signal ignored?',")
print("the team shows the dbt run log proving data passed every test.")`,
    insight: "Pharmacovigilance requires auditable, testable, traceable data — dbt tests encode regulatory expectations as code. The 47 tests on FDA FAERS cover schema (not_null, unique), referential integrity (relationships from drug.primaryid to demo.primaryid), business rules (accepted_range on age in [0, 130], accepted_values on sex in [M/F/UNK/NS]), and singular custom tests (outcome codes in the MedDRA enum). dbt's --store-failures flag persists failing rows to a quarantine table for triage. When FDA asks 'why was this signal ignored?', the team shows the dbt Cloud run log proving the data passed every test before being released to analysts.",
  },
];

// ============================================================
// AIRFLOW_SCIENCE_EXAMPLES (2 examples)
// ============================================================

export const AIRFLOW_SCIENCE_EXAMPLES: DatasetExample[] = [
  // ============================================================
  // 1. GENOMICS PIPELINE DAGS — GATK BEST PRACTICES (Life Sciences)
  // ============================================================
  {
    id: "airflow-genomics-gatk-best-practices",
    step: "1",
    title: "Genomics Pipeline DAGs — GATK Best Practices as Airflow DAG",
    subtitle: "Life sciences — BWA → Sort → MarkDups → HaplotypeCaller → GenotypeGVCFs",
    accent: "oklch(0.65 0.16 30)",
    icon: <Microscope className="h-4 w-4" />,
    badge: "Life Sciences · Genomics",
    brief: {
      dataset: "GATK Best Practices for Germline Variant Calling: BWA-MEM2 alignment → SortSam → MarkDuplicates → BaseRecalibrator → HaplotypeCaller (per-interval GVCF) → GenotypeGVCFs → VQSR. Airflow orchestrates 5 sequenced tasks per sample × ~10,000 samples per cohort. Each task is a KubernetesPodOperator running the GATK docker image on a GKE cluster.",
      scale: "~10,000 samples per cohort · 30x WGS depth · ~100 GB BAM per sample · 5 sequential tasks per sample · ~6 hours total runtime per sample · 50,000+ task instances per cohort",
      why: "GATK Best Practices is the de-facto workflow for germline variant calling — Broad Institute, Wellcome Sanger, and most national genomics programs run it. Airflow's value: DAG-level visibility (which samples failed?), retries (transient GKE pod failures), XCom handoff (BAM file paths passed between tasks), and Sensors (wait for upstream FASTQ arrival). The TaskFlow API makes the Python orchestration code terse and testable. For cohorts of 10,000+ samples, Airflow's parallelism controls (pool, queue, priority_weight) prevent overwhelming the GKE cluster.",
    },
    stats: [
      { label: "Cohort size", value: "~10,000 samples" },
      { label: "Tasks per sample", value: "5 (BWA → GenotypeGVCFs)" },
      { label: "Total runtime", value: "~6 hours per sample" },
      { label: "Task instances", value: "50,000+ per cohort" },
    ],
    tools: ["Apache Airflow", "GATK", "BWA-MEM2", "samtools", "picard", "Cromwell", "KubernetesPodOperator", "GKE", "Google Cloud Life Sciences"],
    codeTabs: [
      {
        lang: "scala",
        filename: "GenomicsAirflowDag.scala",
        code: `import org.apache.airflow.sdk.{DAG, Task, BashOperator, KubernetesPodOperator}
import org.apache.airflow.sdk.Sensor.{ExternalTaskSensor, FileSensor}
import scala.concurrent.duration._

// Scala Airflow DAG for the GATK Best Practices germline variant calling
// workflow. Defines 5 tasks per sample + an external-task sensor to wait
// for the FASTQ files to arrive from the sequencer LIMS.
// Each task runs the GATK docker image on a KubernetesPodOperator.

object GatkBestPracticesDag {
  // DAG configuration
  val dag = DAG(
    dagId = "gatk_germline_best_practices",
    scheduleInterval = "0 2 * * *",       // daily at 02:00
    startDate = "2024-01-01",
    catchup = false,
    defaultArgs = Map(
      "owner" -> "genomics-platform",
      "retries" -> 3,
      "retry_delay" -> 5.minutes,
      "email_on_failure" -> true,
      "email" -> List("genomics-oncall@platform.org"),
      "pool" -> "gatk_germline_pool",      // limit parallelism per cohort
    ),
  )

  // FileSensor: wait for FASTQ files from the sequencer LIMS
  val waitForFastq = FileSensor(
    taskId = "wait_for_fastq",
    filepath = "/data/fastq/{{ ds }}/{{ dag_run.conf.sample_id }}_R1.fq.gz",
    fsConnId = "lims_nfs",
    pokeInterval = 5.minutes,
    timeout = 24.hours,
    mode = "reschedule",   // worker slot released between pokes
  )

  // Task 1: BWA-MEM2 alignment
  val bwaAlign = KubernetesPodOperator(
    taskId = "bwa_align",
    name = "bwa-align-{{ dag_run.conf.sample_id }}",
    namespace = "genomics",
    image = "broadinstitute/gatk:4.5.0.0",
    cmds = List("bwa", "mem", "-t", "32",
                "/ref/GRCh38.fa",
                "/data/fastq/{{ ds }}/{{ dag_run.conf.sample_id }}_R1.fq.gz",
                "/data/fastq/{{ ds }}/{{ dag_run.conf.sample_id }}_R2.fq.gz"),
    resources = Map("request_cpu" -> "32", "request_memory" -> "64Gi"),
    config_file = "~/.kube/config",
    xcom_push = true,    // push the output BAM path to XCom
  )

  // Task 2: SortSam (coordinate-sorted BAM)
  val sortSam = KubernetesPodOperator(
    taskId = "sort_sam",
    name = "sort-sam-{{ dag_run.conf.sample_id }}",
    namespace = "genomics",
    image = "broadinstitute/gatk:4.5.0.0",
    cmds = List("gatk", "SortSam",
                "I=" + "\\{\\{ ti.xcom_values('bwa_align') \\}\\}",
                "O=/data/bam/{{ ds }}/{{ dag_run.conf.sample_id }}.sorted.bam",
                "SO=coordinate"),
    resources = Map("request_cpu" -> "16", "request_memory" -> "32Gi"),
  )

  // Task 3: MarkDuplicates
  val markDups = KubernetesPodOperator(
    taskId = "mark_duplicates",
    name = "mark-dups-{{ dag_run.conf.sample_id }}",
    namespace = "genomics",
    image = "broadinstitute/gatk:4.5.0.0",
    cmds = List("gatk", "MarkDuplicates",
                "I=/data/bam/{{ ds }}/{{ dag_run.conf.sample_id }}.sorted.bam",
                "O=/data/bam/{{ ds }}/{{ dag_run.conf.sample_id }}.dedup.bam",
                "M=/data/bam/{{ ds }}/{{ dag_run.conf.sample_id }}.metrics.txt"),
    resources = Map("request_cpu" -> "16", "request_memory" -> "32Gi"),
  )

  // Task 4: HaplotypeCaller (per-interval GVCF)
  val haplotypeCaller = KubernetesPodOperator(
    taskId = "haplotype_caller",
    name = "haplotype-{{ dag_run.conf.sample_id }}",
    namespace = "genomics",
    image = "broadinstitute/gatk:4.5.0.0",
    cmds = List("gatk", "HaplotypeCaller",
                "-I", "/data/bam/{{ ds }}/{{ dag_run.conf.sample_id }}.dedup.bam",
                "-R", "/ref/GRCh38.fa",
                "-O", "/data/gvcf/{{ ds }}/{{ dag_run.conf.sample_id }}.g.vcf.gz",
                "-ERC", "GVCF"),
    resources = Map("request_cpu" -> "32", "request_memory" -> "64Gi"),
  )

  // Task 5: GenotypeGVCFs (joint-genotyping cohort)
  // Triggered by an ExternalTaskSensor waiting for all sample GVCFs
  val genotypeGvcfs = KubernetesPodOperator(
    taskId = "genotype_gvcfs",
    name = "genotype-{{ ds }}",
    namespace = "genomics",
    image = "broadinstitute/gatk:4.5.0.0",
    cmds = List("gatk", "GenomicsDBImport",
                "--genomicsdb-workspace-path", "/data/workspace/{{ ds }}",
                "--sample-name-map", "/data/cohort_map.txt"),
    resources = Map("request_cpu" -> "64", "request_memory" -> "256Gi"),
  )

  // DAG dependencies
  waitForFastq >> bwaAlign >> sortSam >> markDups >> haplotypeCaller >> genotypeGvcfs
}
// Each task pushes its output path to XCom for the next task to consume.
// On failure: Airflow retries 3x (5-min backoff) before alerting oncall.
// The 'gatk_germline_pool' limits concurrency to 64 parallel samples
// to avoid overwhelming the GKE cluster.`,
      },
      {
        lang: "rust",
        filename: "airflow_genomics_dag.rs",
        code: `use serde::{Deserialize, Serialize};
use chrono::Utc;

// Rust service that submits DAG runs to Apache Airflow's REST API
// (Stable API v2). Use case: a Rust-based LIMS integration service
// that watches for new FASTQ files from the sequencer and submits
// a GATK Best Practices DAG run per sample.

#[derive(Debug, Serialize, Deserialize)]
struct DagRunRequest {
    dag_id: String,
    run_id: String,
    conf: serde_json::Value,
    logical_date: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct DagRunResponse {
    dag_run_id: String,
    state: String,
}

/// Submit a GATK Best Practices DAG run for a sample.
async fn submit_gatk_dag_run(
    base_url: &str,
    auth_token: &str,
    sample_id: &str,
    fastq_r1: &str,
    fastq_r2: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let url = format!("{}/api/v1/dags/gatk_germline_best_practices/dagRuns",
                      base_url);

    let req = DagRunRequest {
        dag_id: "gatk_germline_best_practices".to_string(),
        run_id: format!("gatk_{}_{}", sample_id, Utc::now().timestamp()),
        conf: serde_json::json!({
            "sample_id": sample_id,
            "fastq_r1": fastq_r1,
            "fastq_r2": fastq_r2,
        }),
        logical_date: Utc::now().to_rfc3339(),
    };

    let resp: DagRunResponse = client.post(&url)
        .header("Authorization", format!("Bearer {}", auth_token))
        .header("Content-Type", "application/json")
        .json(&req)
        .send().await?
        .json().await?;

    Ok(resp.dag_run_id)
}

/// Poll the DAG run state every 5 minutes until terminal state.
async fn poll_dag_run(
    base_url: &str, auth_token: &str, dag_run_id: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    loop {
        let url = format!(
            "{}/api/v1/dags/gatk_germline_best_practices/dagRuns/{}",
            base_url, dag_run_id
        );
        let resp: DagRunResponse = client.get(&url)
            .header("Authorization", format!("Bearer {}", auth_token))
            .send().await?
            .json().await?;

        match resp.state.as_str() {
            "success" | "failed" => return Ok(resp.state),
            _ => tokio::time::sleep(std::time::Duration::from_secs(300)).await,
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let base_url = "http://airflow.genomics-platform.org";
    let auth_token = std::env::var("AIRFLOW_API_TOKEN")?;

    // Submit a GATK run for a new sample
    let dag_run_id = submit_gatk_dag_run(
        base_url, &auth_token,
        "HG001-NA12878",
        "/data/fastq/2024-09-15/HG001-NA12878_R1.fq.gz",
        "/data/fastq/2024-09-15/HG001-NA12878_R2.fq.gz",
    ).await?;
    println!("Submitted GATK DAG run: {}", dag_run_id);

    let final_state = poll_dag_run(base_url, &auth_token, &dag_run_id).await?;
    println!("Final state: {}", final_state);
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "airflow_genomics_dag.go",
        code: `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
    "time"
)

// Go service that submits GATK Best Practices DAG runs to Apache Airflow
// via the Stable REST API. Use case: a Go-based Kubernetes operator that
// listens to a PubSub topic of newly-arrived FASTQ files and submits a
// GATK DAG run per sample, then tracks the cohort completion percentage.

type DagRunRequest struct {
    DagID       string                 \`json:"dag_id"\`
    RunID       string                 \`json:"run_id"\`
    Conf        map[string]interface{} \`json:"conf"\`
    LogicalDate string                 \`json:"logical_date"\`
}

type DagRunResponse struct {
    DagRunID string \`json:"dag_run_id"\`
    State    string \`json:"state"\`
}

func submitGatkDagRun(
    baseURL, authToken, sampleID, fastqR1, fastqR2 string,
) (string, error) {
    url := baseURL + "/api/v1/dags/gatk_germline_best_practices/dagRuns"
    req := DagRunRequest{
        DagID: "gatk_germline_best_practices",
        RunID: fmt.Sprintf("gatk_%s_%d", sampleID, time.Now().Unix()),
        Conf: map[string]interface{}{
            "sample_id": sampleID,
            "fastq_r1":  fastqR1,
            "fastq_r2":  fastqR2,
        },
        LogicalDate: time.Now().UTC().Format(time.RFC3339),
    }
    body, _ := json.Marshal(req)
    req_http, _ := http.NewRequest("POST", url, bytes.NewBuffer(body))
    req_http.Header.Set("Authorization", "Bearer "+authToken)
    req_http.Header.Set("Content-Type", "application/json")

    resp, err := http.DefaultClient.Do(req_http)
    if err != nil { return "", err }
    defer resp.Body.Close()

    bodyBytes, _ := io.ReadAll(resp.Body)
    var result DagRunResponse
    json.Unmarshal(bodyBytes, &result)
    return result.DagRunID, nil
}

func pollDagRun(baseURL, authToken, dagRunID string) (string, error) {
    url := fmt.Sprintf("%s/api/v1/dags/gatk_germline_best_practices/dagRuns/%s",
        baseURL, dagRunID)
    for {
        req, _ := http.NewRequest("GET", url, nil)
        req.Header.Set("Authorization", "Bearer "+authToken)
        resp, _ := http.DefaultClient.Do(req)
        body, _ := io.ReadAll(resp.Body)
        resp.Body.Close()

        var result DagRunResponse
        json.Unmarshal(body, &result)
        switch result.State {
        case "success", "failed":
            return result.State, nil
        }
        time.Sleep(5 * time.Minute)
    }
}

func main() {
    baseURL := "http://airflow.genomics-platform.org"
    authToken := os.Getenv("AIRFLOW_API_TOKEN")

    dagRunID, err := submitGatkDagRun(
        baseURL, authToken,
        "HG001-NA12878",
        "/data/fastq/2024-09-15/HG001-NA12878_R1.fq.gz",
        "/data/fastq/2024-09-15/HG001-NA12878_R2.fq.gz",
    )
    if err != nil { fmt.Println("error:", err); return }

    fmt.Printf("Submitted GATK DAG run: %s\\n", dagRunID)
    state, _ := pollDagRun(baseURL, authToken, dagRunID)
    fmt.Printf("Final state: %s\\n", state)
}`,
      },
      {
        lang: "elixir",
        filename: "airflow_genomics_dag.ex",
        code: `defmodule Genomics.AirflowDagRunner do
  @moduledoc """
  Phoenix LiveView dashboard that monitors the GATK Best Practices
  DAG runs. Submits DAG runs when new FASTQ files arrive, displays
  per-task progress, alerts on failures, and exposes the cohort
  completion percentage to the LIMS.
  """
  use Phoenix.LiveView
  require Logger

  @airflow_base "http://airflow.genomics-platform.org/api/v1"

  def render(assigns) do
    ~H"""
    <div>
      <h3>GATK Best Practices — Cohort {{@cohort_id}}</h3>
      <p>
        Samples: {{length(@samples)}} |
        Completed: {{@completed}} ({{:fwi.format(@completed * 100 / max(length(@samples), 1), 1)}}%) |
        Failed: {{@failed}}
      </p>
      <table>
        <tr><th>Sample</th><th>State</th><th>Current Task</th><th>Progress</th></tr>
        <%= for s <- @samples do %>
          <tr style="color: {{state_color(s.state)}}">
            <td><%= s.sample_id %></td>
            <td><%= s.state %></td>
            <td><%= s.current_task %></td>
            <td><%= s.progress %>/5</td>
          </tr>
        <% end %>
      </table>
    </div>
    """
  end

  def mount(%{"cohort_id" => cohort_id}, _session, socket) do
    Phoenix.PubSub.subscribe(Genomics.PubSub, "cohort:#{cohort_id}")
    samples = fetch_cohort_samples(cohort_id)
    {
      :ok,
      assign(socket,
        cohort_id: cohort_id,
        samples: samples,
        completed: Enum.count(samples, & &1.state == "success"),
        failed: Enum.count(samples, & &1.state == "failed")
      )
    }
  end

  def handle_info({:sample_state_updated, sample_id, state, current_task, progress}, socket) do
    samples = Enum.map(socket.assigns.samples, fn s ->
      if s.sample_id == sample_id do
        %{s | state: state, current_task: current_task, progress: progress}
      else
        s
      end
    end)

    completed = Enum.count(samples, & &1.state == "success")
    failed = Enum.count(samples, & &1.state == "failed")

    if failed > 0, do: Task.start(fn -> alert_oncall(sample_id, current_task) end)

    {:noreply, assign(socket, samples: samples, completed: completed, failed: failed)}
  end

  def submit_dag_run(sample_id, fastq_r1, fastq_r2) do
    body = Jason.encode!(%{
      dag_id: "gatk_germline_best_practices",
      run_id: "gatk_#{sample_id}_#{System.system_time(:second)}",
      conf: %{sample_id: sample_id, fastq_r1: fastq_r1, fastq_r2: fastq_r2},
      logical_date: DateTime.utc_now() |> DateTime.to_iso8601()
    })

    headers = [
      {"Authorization", "Bearer " <> System.get_env("AIRFLOW_API_TOKEN")},
      {"Content-Type", "application/json"}
    ]

    case HTTPoison.post("#{@airflow_base}/dags/gatk_germline_best_practices/dagRuns",
                        body, headers) do
      {:ok, %{status_code: 200, body: resp_body}} ->
        {:ok, Jason.decode!(resp_body)["dag_run_id"]}
      {:ok, %{status_code: code}} ->
        {:error, {:http_error, code}}
      {:error, _} = err -> err
    end
  end

  defp alert_oncall(sample_id, failed_task) do
    webhook = System.get_env("SLACK_WEBHOOK")
    msg = ":rotating_light: GATK DAG failed: sample #{sample_id} at #{failed_task}"
    HTTPoison.post(webhook, Jason.encode!(%{text: msg}),
      [{"Content-Type", "application/json"}])
  end

  defp fetch_cohort_samples(cohort_id) do
    url = "#{@airflow_base}/dags/gatk_germline_best_practices/dagRuns?" <>
          "limit=10000&order_by=-logical_date"
    headers = [{"Authorization", "Bearer " <> System.get_env("AIRFLOW_API_TOKEN")}]

    {:ok, %{body: body}} = HTTPoison.get(url, headers)
    Jason.decode!(body)["dag_runs"]
    |> Enum.filter(fn r -> String.contains?(r["dag_run_id"], cohort_id) end)
    |> Enum.map(fn r -> %{
      sample_id: r["conf"]["sample_id"],
      state: r["state"],
      current_task: r["conf"]["current_task"] || "init",
      progress: r["conf"]["progress"] || 0
    } end)
  end

  defp state_color("success"), do: "green"
  defp state_color("failed"),  do: "red"
  defp state_color("running"), do: "blue"
  defp state_color(_),         do: "gray"
end`,
      },
      {
        lang: "zig",
        filename: "airflow_genomics_dag.zig",
        code: `const std = @import("std");
const http = @import("http-zig");

// Zig service that submits GATK Best Practices DAG runs to Apache
// Airflow via the Stable REST API. Use case: a Zig static binary
// deployed as a Cloud Run service — triggered by GCS object
// notifications when a new FASTQ file lands from the sequencer.

const DagRunResponse = struct {
    dag_run_id: []const u8,
    state: []const u8,
};

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const auth_token = std.posix.getenv("AIRFLOW_API_TOKEN") orelse return;
    const base_url = "http://airflow.genomics-platform.org";

    var client = http.Client.init(allocator);
    defer client.deinit();

    // Submit a GATK Best Practices DAG run for a new sample
    const url = base_url ++ "/api/v1/dags/gatk_germline_best_practices/dagRuns";

    var auth_header = try std.fmt.allocPrint(allocator, "Bearer {s}", .{auth_token});
    defer allocator.free(auth_header);

    const body =
        \\\\{
        \\\\  "dag_id": "gatk_germline_best_practices",
        \\\\  "run_id": "gatk_HG001-NA12878_1726406400",
        \\\\  "conf": {
        \\\\    "sample_id": "HG001-NA12878",
        \\\\    "fastq_r1": "/data/fastq/HG001-NA12878_R1.fq.gz",
        \\\\    "fastq_r2": "/data/fastq/HG001-NA12878_R2.fq.gz"
        \\\\  },
        \\\\  "logical_date": "2024-09-15T14:00:00Z"
        \\\\}
    ;

    var resp = try client.post(allocator, .{
        .url = url,
        .headers = &.{
            .{ .key = "Authorization", .value = auth_header },
            .{ .key = "Content-Type", .value = "application/json" },
        },
        .body = body,
    });
    defer resp.deinit();

    var parsed = try std.json.parseFromSlice(DagRunResponse, allocator, resp.body, .{});
    defer parsed.deinit();

    const dag_run_id = parsed.value.dag_run_id;
    std.debug.print("Submitted GATK DAG run: {s}\\n", .{dag_run_id});

    // Poll the DAG run state every 5 minutes until terminal state
    while (true) {
        std.time.sleep(5 * 60 * std.time.ns_per_s);
        const poll_url = try std.fmt.allocPrint(allocator,
            "{s}/api/v1/dags/gatk_germline_best_practices/dagRuns/{s}",
            .{ base_url, dag_run_id });
        defer allocator.free(poll_url);

        var poll_resp = try client.get(allocator, .{
            .url = poll_url,
            .headers = &.{
                .{ .key = "Authorization", .value = auth_header },
            },
        });
        defer poll_resp.deinit();

        var poll_parsed = try std.json.parseFromSlice(DagRunResponse, allocator, poll_resp.body, .{});
        defer poll_parsed.deinit();

        const state = poll_parsed.value.state;
        if (std.mem.eql(u8, state, "success") or std.mem.eql(u8, state, "failed")) {
            std.debug.print("Final state: {s}\\n", .{state});
            break;
        }
        std.debug.print("State: {s} — polling again in 5 min\\n", .{state});
    }
}`,
      },
    ],
    runnablePython: `# Genomics Pipeline DAG — GATK Best Practices simulation (Pyodide)
import random
from collections import defaultdict

print("=== Genomics Pipeline DAGs — GATK Best Practices ===")
print("DAG: gatk_germline_best_practices")
print("Tasks: BWA → SortSam → MarkDups → HaplotypeCaller → GenotypeGVCFs")
print("Schedule: 0 2 * * * (daily at 02:00)")
print("Pool: gatk_germline_pool (max 64 parallel samples)")
print()

random.seed(42)

# Define the 5-task DAG
tasks = [
    ("bwa_align",        "BWA-MEM2 alignment to GRCh38",       64, "32Gi", "64Gi"),
    ("sort_sam",        "SortSam coordinate sort",            16, "16Gi", "32Gi"),
    ("mark_duplicates", "MarkDuplicates dedup",               16, "16Gi", "32Gi"),
    ("haplotype_caller","HaplotypeCaller per-interval GVCF",  32, "32Gi", "64Gi"),
    ("genotype_gvcfs",  "GenotypeGVCFs joint-genotyping",     64, "128Gi","256Gi"),
]

print("DAG task definitions:")
print(f"{'Task ID':<22} | {'Description':<35} | {'CPU':<5} | {'Req mem':<8} | {'Lim mem':<8}")
print("-" * 90)
for tid, desc, cpu, req, lim in tasks:
    print(f"{tid:<22} | {desc:<35} | {cpu:<5} | {req:<8} | {lim:<8}")

# Simulate a cohort of N samples running through the DAG
n_samples = 50  # scaled from 10,000
samples = [f"HG{i:04d}-NA{i:05d}" for i in range(n_samples)]
print()
print(f"Cohort: {n_samples} samples · pool concurrency: 64 · estimated runtime: ~6h per sample")

# Each task has a random duration (in minutes) and may fail/retry
task_durations = {
    "bwa_align":        (45, 75),   # 45-75 min
    "sort_sam":        (10, 20),
    "mark_duplicates": (15, 30),
    "haplotype_caller": (90, 150),  # bottleneck — 1.5-2.5h
    "genotype_gvcfs":  (30, 60),   # cohort-level, not per-sample
}
task_failure_rate = {
    "bwa_align": 0.02,   # 2% failure (GKE pod eviction)
    "sort_sam": 0.005,
    "mark_duplicates": 0.005,
    "haplotype_caller": 0.03,  # 3% — most resource-intensive
    "genotype_gvcfs": 0.01,
}

# Simulate the DAG run for each sample
total_task_instances = 0
total_failures = 0
total_retries = 0
total_runtime_min = 0
cohort_progress = defaultdict(int)  # task_id → number of samples that completed it

for sample_id in samples:
    sample_state = "running"
    sample_runtime = 0
    for tid, desc, *_ in tasks:
        # Skip cohort-level task for per-sample loop (it runs once at the end)
        if tid == "genotype_gvcfs":
            continue
        duration = random.randint(*task_durations[tid])
        sample_runtime += duration
        total_task_instances += 1

        # Retry logic — up to 3 retries before declaring failure
        for attempt in range(4):
            if random.random() < task_failure_rate[tid]:
                total_retries += 1
                if attempt == 3:
                    total_failures += 1
                    sample_state = "failed"
                    break
            else:
                cohort_progress[tid] += 1
                break
        if sample_state == "failed":
            break
    if sample_state != "failed":
        sample_state = "success"
        total_runtime_min = max(total_runtime_min, sample_runtime)

# Add the cohort-level genotype_gvcfs task
total_task_instances += 1
total_runtime_min += random.randint(*task_durations["genotype_gvcfs"])

print()
print("=== Cohort execution summary ===")
print(f"  Samples in cohort:      {n_samples}")
print(f"  Total task instances:   {total_task_instances:,}")
print(f"  Total retries:          {total_retries}")
print(f"  Total failures:         {total_failures}")
print(f"  Success rate:          {100 * (n_samples - total_failures) / n_samples:.1f}%")
print(f"  Estimated runtime:     ~{total_runtime_min / 60:.1f} hours")
print()

# Per-task completion
print("Per-task completion (out of {} samples):".format(n_samples))
print(f"{'Task ID':<22} | {'Completed':<10} | {'Failed':<8} | {'Failure rate'}")
print("-" * 60)
for tid, desc, *_ in tasks:
    if tid == "genotype_gvcfs":
        completed = 1 if total_failures == 0 else 0
        print(f"{tid:<22} | {completed:<10} | {0 if completed else 1:<8} | cohort-level")
    else:
        completed = cohort_progress.get(tid, 0)
        failed = n_samples - completed
        rate = 100 * failed / n_samples
        print(f"{tid:<22} | {completed:<10} | {failed:<8} | {rate:.1f}%")

print()
print("XCom handoff between tasks:")
print("  bwa_align → sort_sam:        BAM file path")
print("  sort_sam → mark_duplicates:  sorted BAM path")
print("  mark_duplicates → haplotype: dedup BAM path")
print("  haplotype_caller → genotype: GVCF path (per-interval)")
print()
print("Sensors in this DAG:")
print("  - FileSensor:     waits for FASTQ arrival from sequencer LIMS")
print("  - ExternalTaskSensor: genotype_gvcfs waits for all per-sample HaplotypeCaller tasks")
print()
print("Key insight: Airflow's DAG-level visibility makes 10,000-sample cohorts")
print("tractable — oncall sees immediately which samples failed, at which task,")
print("and why (GKE pod eviction, OOM, transient storage error). Retries +")
print("smart-sensor mode (separate process for FileSensor) prevent worker pool")
print("exhaustion. The TaskFlow API makes the orchestration code terse.")`,
    insight: "GATK Best Practices is the de-facto workflow for germline variant calling — Broad Institute, Wellcome Sanger, and most national genomics programs run it. Airflow's DAG-level visibility makes 10,000-sample cohorts tractable: oncall sees immediately which samples failed, at which task, and why (GKE pod eviction, OOM, transient storage error). KubernetesPodOperator runs each GATK task in its own pod with right-sized resources. XCom passes BAM file paths between tasks. FileSensor waits for FASTQ arrival from the sequencer LIMS. Pools limit concurrency to prevent GKE cluster overwhelm. For a 10k-sample cohort, Airflow handles 50,000+ task instances with retries, backoff, and per-task SLA alerting.",
  },

  // ============================================================
  // 2. LHC ANALYSIS WORKFLOWS — CERN ANALYSIS CHAIN (Physics)
  // ============================================================
  {
    id: "airflow-lhc-cern-analysis-chain",
    step: "2",
    title: "LHC Analysis Workflows — CERN Analysis Chain as Airflow DAG",
    subtitle: "Physics — trigger → reconstruct → skim → analyze the world's largest physics dataset",
    accent: "oklch(0.65 0.16 250)",
    icon: <Atom className="h-4 w-4" />,
    badge: "Physics · CERN LHC",
    brief: {
      dataset: "CERN Large Hadron Collider (LHC): 40 million collisions per second, ~1 PB/sec raw data rate, ~50 PB/year stored. ATLAS + CMS + LHCb + ALICE experiments each have their own analysis chains. Airflow orchestrates the analysis pipeline: trigger selection → event reconstruction → skim → physics analysis. Uses HTCondorOperator (submit batch jobs to HTCondor pool) and SparkSubmitOperator (run ROOT-based analysis on Spark).",
      scale: "~1 PB/sec raw · ~50 PB/year stored · 40MHz collisions · ~10,000 physicists worldwide · ~1B events per analysis · 6-hour analysis runtime typical",
      why: "CERN's analysis chain is the canonical physics pipeline — each physicist's analysis is a different skim of the same reconstructed collision data. Airflow gives physicists a DAG view (which skim produced which plot?), retries (HTCondor pool failures are common), XCom handoff (event counts between skimming and analysis), and SLAs (publish plots before the next conference). The TaskFlow API lets physicists express their analysis in pure Python rather than HTCondor submit scripts.",
    },
    stats: [
      { label: "Raw rate", value: "~1 PB/sec" },
      { label: "Annual stored", value: "~50 PB/year" },
      { label: "Collision rate", value: "40 MHz" },
      { label: "Physicists", value: "~10,000 worldwide" },
    ],
    tools: ["Apache Airflow", "HTCondor", "ROOT", "CMSSW", "CRAB", "Apache Spark", "XRootD", "CVMFS", "Rucio"],
    codeTabs: [
      {
        lang: "scala",
        filename: "LhcAnalysisDag.scala",
        code: `import org.apache.airflow.sdk.{DAG, Task}
import org.apache.airflow.sdk.Operator.{HTCondorOperator, SparkSubmitOperator, BashOperator}
import org.apache.airflow.sdk.Sensor.{ExternalTaskSensor, HdfsSensor}
import scala.concurrent.duration._

// Scala Airflow DAG for the CERN LHC analysis chain.
// Pipeline: trigger → reconstruct → skim → analyze
// Each task submits batch jobs to the HTCondor pool at CERN.

object LhcAnalysisDag {
  val dag = DAG(
    dagId = "lhc_atlas_analysis_chain",
    scheduleInterval = "0 4 * * *",     // daily at 04:00
    startDate = "2024-01-01",
    catchup = false,
    defaultArgs = Map(
      "owner" -> "atlas-physicists",
      "retries" -> 5,
      "retry_delay" -> 10.minutes,
      "email_on_failure" -> true,
      "pool" -> "lhc_atlas_pool",
    ),
  )

  // HdfsSensor: wait for the trigger output to land on EOS / XRootD
  val waitForTriggerOutput = HdfsSensor(
    taskId = "wait_for_trigger_output",
    filepath = "/eos/atlas/daq/{{ ds }}/triggered_events.root",
    hdfsConnId = "atlas_eos",
    pokeInterval = 10.minutes,
    timeout = 48.hours,
    mode = "reschedule",
  )

  // Task 1: trigger selection (reduce 40MHz → 1kHz)
  val triggerSelection = HTCondorOperator(
    taskId = "trigger_selection",
    condorSubmitFile = "/home/atlas/submit/trigger_selection.sub",
    arguments = List(
      "--input",  "/eos/atlas/daq/{{ ds }}/triggered_events.root",
      "--output", "/eos/atlas/trigger/{{ ds }}/selected.root",
      "--lumi",   "1.0e34",      // luminosity in cm^-2 s^-1
      "--energy", "13TeV"
    ),
    condorConnId = "cern_htcondor",
    pool = "atlas_pool",         // HTCondor pool name
    queue = "long",              // HTCondor queue (long = 8h+ jobs)
    xcom_push = true,
  )

  // Task 2: event reconstruction (AOD — Analysis Object Data)
  val eventReconstruction = HTCondorOperator(
    taskId = "event_reconstruction",
    condorSubmitFile = "/home/atlas/submit/reconstruction.sub",
    arguments = List(
      "--input",  "/eos/atlas/trigger/{{ ds }}/selected.root",
      "--output", "/eos/atlas/aod/{{ ds }}/reconstructed.aod.root",
      "--cmssw_version", "CMSSW_14_0_0",
      "--geometry",     "ATLAS-R3S-2021-01"
    ),
    condorConnId = "cern_htcondor",
    pool = "atlas_pool",
    queue = "long",
    xcom_push = true,
  )

  // Task 3: skim (select events matching the analysis trigger)
  val skimEvents = HTCondorOperator(
    taskId = "skim_events",
    condorSubmitFile = "/home/atlas/submit/skim.sub",
    arguments = List(
      "--input",  "/eos/atlas/aod/{{ ds }}/reconstructed.aod.root",
      "--output", "/eos/atlas/skim/{{ ds }}/{{ dag_run.conf.analysis_id }}.root",
      "--analysis_id", "{{ dag_run.conf.analysis_id }}",
      "--trigger_path", "HLT_mu26_ivarmedium"
    ),
    condorConnId = "cern_htcondor",
    pool = "atlas_pool",
    queue = "short",
    xcom_push = true,
  )

  // Task 4: physics analysis (ROOT macros on Spark cluster)
  val physicsAnalysis = SparkSubmitOperator(
    taskId = "physics_analysis",
    application = "/home/atlas/spark/higgs_analysis.py",
    connId = "spark_atlas",
    conf = Map(
      "spark.driver.memory" -> "16g",
      "spark.executor.memory" -> "32g",
      "spark.executor.instances" -> "32",
      "spark.app.name" -> "atlas_higgs_analysis_{{ ds }}"
    ),
    applicationArgs = List(
      "--input",  "/eos/atlas/skim/{{ ds }}/{{ dag_run.conf.analysis_id }}.root",
      "--output", "/eos/atlas/results/{{ ds }}/{{ dag_run.conf.analysis_id }}/",
      "--luminosity", "150.0",  // inverse femtobarns
      "--plot_dir",  "/eos/atlas/plots/{{ ds }}/"
    ),
    xcom_push = true,
  )

  // Task 5: publish plots to the conference website (CDS)
  val publishPlots = BashOperator(
    taskId = "publish_plots",
    bashCommand =
      "rsync -avz /eos/atlas/plots/{{ ds }}/ " +
      "cds-submit@cds.cern.ch:/var/www/atlas-plots/{{ ds }}/ && " +
      "curl -X POST https://cds.cern.ch/api/notify -d run_id={{ run_id }}"
  )

  // DAG dependencies
  waitForTriggerOutput >> triggerSelection >> eventReconstruction >>
    skimEvents >> physicsAnalysis >> publishPlots
}
// HTCondorOperator: submits a batch job to the CERN HTCondor pool.
// SparkSubmitOperator: runs ROOT macros on the ATLAS Spark cluster.
// BashOperator: publishes the resulting plots to CDS (CERN Document Server).
// On failure: Airflow retries 5x (10-min backoff) — HTCondor pool failures
// are common due to compute-node evictions during LHC fills.`,
      },
      {
        lang: "rust",
        filename: "airflow_lhc_dag.rs",
        code: `use serde::{Deserialize, Serialize};
use chrono::Utc;

// Rust service that submits LHC analysis chain DAG runs to Apache Airflow.
// Use case: a Rust-based CERN physicist-facing service that lets
// researchers define an analysis ID, select a skim trigger, and submit
// the full trigger→reconstruct→skim→analyze pipeline to Airflow.

#[derive(Debug, Serialize, Deserialize)]
struct DagRunRequest {
    dag_id: String,
    run_id: String,
    conf: serde_json::Value,
    logical_date: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct DagRunResponse {
    dag_run_id: String,
    state: String,
}

async fn submit_lhc_analysis(
    base_url: &str,
    auth_token: &str,
    analysis_id: &str,
    trigger_path: &str,
    luminosity: f64,
) -> Result<String, Box<dyn std::error::Error>> {
    let url = format!("{}/api/v1/dags/lhc_atlas_analysis_chain/dagRuns",
                      base_url);

    let req = DagRunRequest {
        dag_id: "lhc_atlas_analysis_chain".to_string(),
        run_id: format!("lhc_{}_{}", analysis_id, Utc::now().timestamp()),
        conf: serde_json::json!({
            "analysis_id":  analysis_id,
            "trigger_path": trigger_path,
            "luminosity":   luminosity,
        }),
        logical_date: Utc::now().to_rfc3339(),
    };

    let client = reqwest::Client::new();
    let resp: DagRunResponse = client.post(&url)
        .header("Authorization", format!("Bearer {}", auth_token))
        .header("Content-Type", "application/json")
        .json(&req)
        .send().await?
        .json().await?;

    Ok(resp.dag_run_id)
}

async fn poll_dag_run(
    base_url: &str, auth_token: &str, dag_run_id: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    loop {
        let url = format!(
            "{}/api/v1/dags/lhc_atlas_analysis_chain/dagRuns/{}",
            base_url, dag_run_id
        );
        let resp: DagRunResponse = client.get(&url)
            .header("Authorization", format!("Bearer {}", auth_token))
            .send().await?
            .json().await?;

        match resp.state.as_str() {
            "success" | "failed" => return Ok(resp.state),
            _ => tokio::time::sleep(std::time::Duration::from_secs(300)).await,
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let base_url = "http://airflow.atlas.cern.ch";
    let auth_token = std::env::var("AIRFLOW_API_TOKEN")?;

    // Submit a Higgs analysis run
    let dag_run_id = submit_lhc_analysis(
        base_url, &auth_token,
        "higgs_to_gg_2024",
        "HLT_mu26_ivarmedium",
        150.0,  // 150 inverse femtobarns
    ).await?;
    println!("Submitted LHC analysis DAG run: {}", dag_run_id);

    let final_state = poll_dag_run(base_url, &auth_token, &dag_run_id).await?;
    println!("Final state: {}", final_state);
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "airflow_lhc_dag.go",
        code: `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
    "time"
)

// Go service that submits LHC analysis chain DAG runs to Apache Airflow.
// Use case: a Go-based CERN physicist CLI tool that lets a researcher
// submit an analysis pipeline, track its progress, and download the
// resulting plots when complete.

type DagRunRequest struct {
    DagID       string                 \`json:"dag_id"\`
    RunID       string                 \`json:"run_id"\`
    Conf        map[string]interface{} \`json:"conf"\`
    LogicalDate string                 \`json:"logical_date"\`
}

type DagRunResponse struct {
    DagRunID string \`json:"dag_run_id"\`
    State    string \`json:"state"\`
}

func submitLhcAnalysis(
    baseURL, authToken, analysisID, triggerPath string, luminosity float64,
) (string, error) {
    url := baseURL + "/api/v1/dags/lhc_atlas_analysis_chain/dagRuns"
    req := DagRunRequest{
        DagID: "lhc_atlas_analysis_chain",
        RunID: fmt.Sprintf("lhc_%s_%d", analysisID, time.Now().Unix()),
        Conf: map[string]interface{}{
            "analysis_id":  analysisID,
            "trigger_path": triggerPath,
            "luminosity":    luminosity,
        },
        LogicalDate: time.Now().UTC().Format(time.RFC3339),
    }
    body, _ := json.Marshal(req)
    req_http, _ := http.NewRequest("POST", url, bytes.NewBuffer(body))
    req_http.Header.Set("Authorization", "Bearer "+authToken)
    req_http.Header.Set("Content-Type", "application/json")

    resp, err := http.DefaultClient.Do(req_http)
    if err != nil { return "", err }
    defer resp.Body.Close()
    bodyBytes, _ := io.ReadAll(resp.Body)
    var result DagRunResponse
    json.Unmarshal(bodyBytes, &result)
    return result.DagRunID, nil
}

func main() {
    baseURL := "http://airflow.atlas.cern.ch"
    authToken := os.Getenv("AIRFLOW_API_TOKEN")

    dagRunID, err := submitLhcAnalysis(
        baseURL, authToken,
        "higgs_to_gg_2024",
        "HLT_mu26_ivarmedium",
        150.0,
    )
    if err != nil { fmt.Println("error:", err); return }
    fmt.Printf("Submitted LHC analysis DAG run: %s\\n", dagRunID)
}`,
      },
      {
        lang: "elixir",
        filename: "airflow_lhc_dag.ex",
        code: `defmodule Atlas.AirflowLhcRunner do
  @moduledoc """
  Phoenix LiveView dashboard for CERN ATLAS physicists to submit
  and monitor LHC analysis chain DAG runs. Provides a form to select
  analysis ID, trigger path, and luminosity; displays real-time
  task progress (trigger → reconstruct → skim → analyze → publish).
  """
  use Phoenix.LiveView
  require Logger

  @airflow_base "http://airflow.atlas.cern.ch/api/v1"

  def render(assigns) do
    ~H"""
    <div>
      <h3>LHC ATLAS Analysis — {{@analysis_id}}</h3>
      <form phx-submit="submit_analysis">
        <label>Analysis ID: <input name="analysis_id" value="higgs_to_gg_2024"/></label>
        <label>Trigger path: <input name="trigger_path" value="HLT_mu26_ivarmedium"/></label>
        <label>Luminosity (fb⁻¹): <input name="luminosity" value="150.0"/></label>
        <button>Submit DAG run</button>
      </form>

      <h4>Task progress: {{@dag_run_id}}</h4>
      <ul>
        <%= for {tid, status} <- @task_states do %>
          <li style="color: {{state_color(status)}}">{{tid}}: {{status}}</li>
        <% end %>
      </ul>
    </div>
    """
  end

  def mount(_params, _session, socket) do
    Phoenix.PubSub.subscribe(Atlas.PubSub, "lhc_task_states")
    {
      :ok,
      assign(socket,
        analysis_id: nil,
        dag_run_id: nil,
        task_states: [
          {"trigger_selection",      "pending"},
          {"event_reconstruction",   "pending"},
          {"skim_events",            "pending"},
          {"physics_analysis",       "pending"},
          {"publish_plots",          "pending"}
        ]
      )
    }
  end

  def handle_event("submit_analysis", %{
    "analysis_id" => analysis_id,
    "trigger_path" => trigger_path,
    "luminosity" => lumi_str
  }, socket) do
    {luminosity, _} = Float.parse(lumi_str)
    {:ok, dag_run_id} = submit_dag_run(analysis_id, trigger_path, luminosity)

    {
      :noreply,
      assign(socket,
        analysis_id: analysis_id,
        dag_run_id: dag_run_id
      )
    }
  end

  def handle_info({:task_state_update, task_id, new_state}, socket) do
    task_states = Enum.map(socket.assigns.task_states, fn {tid, status} ->
      if tid == task_id, do: {tid, new_state}, else: {tid, status}
    end)
    {:noreply, assign(socket, task_states: task_states)}
  end

  defp submit_dag_run(analysis_id, trigger_path, luminosity) do
    body = Jason.encode!(%{
      dag_id: "lhc_atlas_analysis_chain",
      run_id: "lhc_#{analysis_id}_#{System.system_time(:second)}",
      conf: %{analysis_id: analysis_id, trigger_path: trigger_path,
              luminosity: luminosity},
      logical_date: DateTime.utc_now() |> DateTime.to_iso8601()
    })

    headers = [
      {"Authorization", "Bearer " <> System.get_env("AIRFLOW_API_TOKEN")},
      {"Content-Type", "application/json"}
    ]

    case HTTPoison.post(
      "#{@airflow_base}/dags/lhc_atlas_analysis_chain/dagRuns",
      body, headers
    ) do
      {:ok, %{status_code: 200, body: resp_body}} ->
        {:ok, Jason.decode!(resp_body)["dag_run_id"]}
      {:ok, %{status_code: code}} ->
        {:error, {:http_error, code}}
      {:error, _} = err -> err
    end
  end

  defp state_color("success"), do: "green"
  defp state_color("failed"),  do: "red"
  defp state_color("running"), do: "blue"
  defp state_color("pending"), do: "gray"
  defp state_color(_),         do: "gray"
end`,
      },
      {
        lang: "zig",
        filename: "airflow_lhc_dag.zig",
        code: `const std = @import("std");
const http = @import("http-zig");

// Zig CLI tool for CERN ATLAS physicists — submits an LHC analysis
// chain DAG run to Apache Airflow, polls progress, and downloads
// the resulting plots when the pipeline completes. Static binary
// deployed via CVMFS to all ATLAS physicist workstations.

const DagRunResponse = struct {
    dag_run_id: []const u8,
    state: []const u8,
};

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const auth_token = std.posix.getenv("AIRFLOW_API_TOKEN") orelse return;
    const base_url = "http://airflow.atlas.cern.ch";

    var client = http.Client.init(allocator);
    defer client.deinit();

    const url = base_url ++ "/api/v1/dags/lhc_atlas_analysis_chain/dagRuns";
    var auth_header = try std.fmt.allocPrint(allocator, "Bearer {s}", .{auth_token});
    defer allocator.free(auth_header);

    const body =
        \\\\{
        \\\\  "dag_id": "lhc_atlas_analysis_chain",
        \\\\  "run_id": "lhc_higgs_to_gg_2024_1726406400",
        \\\\  "conf": {
        \\\\    "analysis_id": "higgs_to_gg_2024",
        \\\\    "trigger_path": "HLT_mu26_ivarmedium",
        \\\\    "luminosity": 150.0
        \\\\  },
        \\\\  "logical_date": "2024-09-15T14:00:00Z"
        \\\\}
    ;

    var resp = try client.post(allocator, .{
        .url = url,
        .headers = &.{
            .{ .key = "Authorization", .value = auth_header },
            .{ .key = "Content-Type", .value = "application/json" },
        },
        .body = body,
    });
    defer resp.deinit();

    var parsed = try std.json.parseFromSlice(DagRunResponse, allocator, resp.body, .{});
    defer parsed.deinit();

    const dag_run_id = parsed.value.dag_run_id;
    std.debug.print("Submitted LHC analysis DAG run: {s}\\n", .{dag_run_id});

    // Poll every 5 minutes until terminal state
    while (true) {
        std.time.sleep(5 * 60 * std.time.ns_per_s);
        const poll_url = try std.fmt.allocPrint(allocator,
            "{s}/api/v1/dags/lhc_atlas_analysis_chain/dagRuns/{s}",
            .{ base_url, dag_run_id });
        defer allocator.free(poll_url);

        var poll_resp = try client.get(allocator, .{
            .url = poll_url,
            .headers = &.{.{ .key = "Authorization", .value = auth_header }},
        });
        defer poll_resp.deinit();

        var poll_parsed = try std.json.parseFromSlice(DagRunResponse, allocator, poll_resp.body, .{});
        defer poll_parsed.deinit();

        const state = poll_parsed.value.state;
        if (std.mem.eql(u8, state, "success") or std.mem.eql(u8, state, "failed")) {
            std.debug.print("Final state: {s}\\n", .{state});
            break;
        }
        std.debug.print("State: {s} — polling again in 5 min\\n", .{state});
    }
}`,
      },
    ],
    runnablePython: `# LHC Analysis Workflows — CERN analysis chain simulation (Pyodide)
import random
from collections import defaultdict

print("=== LHC Analysis Workflows — CERN ATLAS Analysis Chain ===")
print("DAG: lhc_atlas_analysis_chain")
print("Tasks: trigger → reconstruct → skim → analyze → publish")
print("Schedule: 0 4 * * * (daily at 04:00)")
print()

random.seed(42)

# LHC raw data statistics
print("LHC raw data statistics:")
print(f"  Collision rate:    40 MHz (40 million collisions/sec)")
print(f"  Raw data rate:     ~1 PB/sec")
print(f"  Annual stored:      ~50 PB/year (ATLAS + CMS + LHCb + ALICE)")
print(f"  Trigger reduction:  40 MHz → 1 kHz (HLT)")
print()

# Simulate the DAG tasks
tasks = [
    ("trigger_selection",     "Trigger selection (HLT)",          30,  "HTCondor",   "long"),
    ("event_reconstruction",  "Event reconstruction (AOD)",      180,  "HTCondor",   "long"),
    ("skim_events",           "Skim by analysis trigger",         45,  "HTCondor",   "short"),
    ("physics_analysis",      "Physics analysis (ROOT on Spark)", 120, "SparkSubmit", "n/a"),
    ("publish_plots",         "Publish plots to CDS",              5,  "Bash",       "n/a"),
]

print("DAG task definitions:")
print(f"{'Task ID':<26} | {'Description':<35} | {'Runtime':<10} | {'Operator':<14} | {'Queue'}")
print("-" * 100)
for tid, desc, rt, op, queue in tasks:
    print(f"{tid:<26} | {desc:<35} | {rt} min    | {op:<14} | {queue}")

# Simulate the analysis chain execution
n_events_raw = 1_000_000  # 1M events after trigger
n_events_aod = n_events_raw  # all pass reconstruction
# Skim rate: typically 5-10% of AOD events match the analysis trigger
skim_rate = random.uniform(0.05, 0.10)
n_events_skim = int(n_events_aod * skim_rate)
n_events_analysis = n_events_skim  # all skimmed events get analyzed

# Data volume at each stage (simulated, scaled)
stage_volumes = {
    "raw_triggered": n_events_raw * 1.5,   # 1.5MB per raw event (after HLT)
    "aod":           n_events_aod * 0.5,   # 0.5MB per AOD event
    "skim":          n_events_skim * 0.5,  # 0.5MB per skim event
    "analysis":      n_events_analysis * 0.05,  # 50KB per analysis result
}

print()
print("=== Analysis chain data flow ===")
print(f"  Raw triggered events:  {n_events_raw:,} events · {stage_volumes['raw_triggered']/1e6:.1f} MB")
print(f"  Reconstructed (AOD):   {n_events_aod:,} events · {stage_volumes['aod']/1e6:.1f} MB")
print(f"  Skimmed (analysis):    {n_events_skim:,} events · {stage_volumes['skim']/1e6:.1f} MB")
print(f"  Analysis results:      {n_events_analysis:,} events · {stage_volumes['analysis']/1e6:.1f} MB")
print()
print(f"Skim rate: {skim_rate*100:.1f}% of AOD events match the analysis trigger")
print(f"Total runtime (simulated): {sum(t[2] for t in tasks):,} minutes = {sum(t[2] for t in tasks)/60:.1f} hours")

# HTCondor pool simulation — task instances per DAG run
print()
print("=== HTCondor pool dispatch ===")
n_physicists = 50  # 50 concurrent physicists submitting analyses
tasks_per_physicist = len(tasks)
total_task_instances = n_physicists * tasks_per_physicist
print(f"  Concurrent physicists: {n_physicists}")
print(f"  Tasks per analysis:    {tasks_per_physicist}")
print(f"  Total task instances:   {total_task_instances}")
print(f"  HTCondor pool size:    ~8,000 cores (CERN batch)")
print(f"  Avg wait time:         ~{random.randint(5, 30)} min (queue-dependent)")

# Failure modes
print()
print("=== Failure modes + retries ===")
failures = [
    ("trigger_selection",     0.02, "HTCondor compute node eviction"),
    ("event_reconstruction",  0.05, "OOM — AOD events larger than expected"),
    ("skim_events",           0.01, "XRootD cache miss"),
    ("physics_analysis",      0.03, "Spark executor OOM"),
    ("publish_plots",         0.005, "CDS API timeout"),
]
print(f"{'Task ID':<26} | {'Failure rate':<14} | {'Reason'}")
print("-" * 70)
for tid, rate, reason in failures:
    print(f"{tid:<26} | {rate*100:.1f}%           | {reason}")

# Simulate a single DAG run with retries
print()
print("=== Simulated DAG run for higgs_to_gg_2024 ===")
total_runtime_min = 0
total_retries = 0
final_state = "success"
for tid, desc, base_rt, op, queue in tasks:
    rt = base_rt + random.randint(-10, 20)
    total_runtime_min += rt
    for attempt in range(5):  # 5 retries max
        # Find this task's failure rate
        fr = next((f[1] for f in failures if f[0] == tid), 0.0)
        if random.random() < fr:
            total_retries += 1
            if attempt == 4:
                final_state = "failed"
                print(f"  {tid}: FAILED after 5 retries ({rt} min)")
                break
            print(f"  {tid}: retry {attempt+1} (transient failure, {rt} min)")
            total_runtime_min += rt  # retry adds runtime
        else:
            print(f"  {tid}: success ({rt} min)")
            break
    if final_state == "failed":
        break

print()
print(f"DAG run summary:")
print(f"  Final state: {final_state}")
print(f"  Total runtime: {total_runtime_min} min = {total_runtime_min/60:.1f} hours")
print(f"  Total retries:  {total_retries}")
print()
print("XCom handoff between tasks:")
print("  trigger_selection     → event_reconstruction: selected event count")
print("  event_reconstruction  → skim_events:           AOD file path")
print("  skim_events           → physics_analysis:      skim file path")
print("  physics_analysis      → publish_plots:         plot file list")
print()
print("Key insight: Airflow gives physicists a DAG view of the LHC analysis")
print("chain — each physicist's analysis is a different skim of the same")
print("reconstructed collision data. Retries handle HTCondor pool failures")
print("(compute node evictions are common during LHC fills). XCom passes")
print("event counts between skimming and analysis. SLAs publish plots to")
print("CDS before the next conference (typically weekly).")`,
    insight: "CERN's analysis chain is the canonical physics pipeline — each physicist's analysis is a different skim of the same reconstructed collision data. The LHC produces ~1 PB/sec raw at 40 MHz collision rate, reduced to 1 kHz by the trigger, then reconstructed into AOD (Analysis Object Data) at ~0.5 MB per event. Skimming selects the 5-10% of AOD events matching the analysis trigger. Airflow gives physicists a DAG view: which skim produced which plot, with retries (HTCondor pool failures are common during LHC fills), XCom handoff (event counts between skimming and analysis), and SLAs (publish plots to CDS before the next conference). The TaskFlow API lets physicists express their analysis in pure Python rather than HTCondor submit scripts.",
  },
];

// ============================================================
// DAGSTER_SCIENCE_EXAMPLES (2 examples)
// ============================================================

export const DAGSTER_SCIENCE_EXAMPLES: DatasetExample[] = [
  // ============================================================
  // 1. GENOMICS ASSET GRAPH — SOFTWARE-DEFINED ASSETS (Life Sciences)
  //    Software-defined assets for the variant calling pipeline
  // ============================================================
  {
    id: "dagster-genomics-asset-graph",
    step: "1",
    title: "Genomics Asset Graph — Software-Defined Assets for Variant Calling",
    subtitle: "Life sciences — Dagster SDA + IO Manager for BAM/VCF artifact handoff",
    accent: "oklch(0.65 0.16 30)",
    icon: <Microscope className="h-4 w-4" />,
    badge: "Life Sciences · Dagster SDA",
    brief: {
      dataset: "Variant calling pipeline expressed as Dagster software-defined assets (SDA): fastq_reads → aligned_bam → dedup_bam → recalibrated_bam → raw_vcf → filtered_vcf → annotated_vcf → allele_freq_table. Each asset is a typed artifact stored in a per-asset IO Manager (BAM → S3, VCF → S3, allele_freq → Snowflake). The asset graph declaratively encodes data dependencies; Dagster only recomputes assets when upstream inputs change.",
      scale: "~10,000 samples per cohort · 100 GB BAM per sample · 5GB VCF per sample · 8 software-defined assets · 50,000+ materializations across the cohort",
      why: "Software-defined assets are Dagster's key innovation vs Airflow's DAG-oriented model. Instead of 'run this task on this schedule', Dagster asks 'is this asset up-to-date?' — only recomputing assets whose upstream inputs have changed. For a 10,000-sample genomics cohort, this means: when a single sample's FASTQ is regenerated, only that sample's downstream BAM/VCF/allele_freq are recomputed. The IO Manager handles BAM/VCF storage on S3 with versioned paths — no manual file passing. Asset lineage is auditable for FDA/CLIA regulatory review.",
    },
    stats: [
      { label: "SDAs", value: "8 assets" },
      { label: "Cohort size", value: "~10,000 samples" },
      { label: "BAM size", value: "~100 GB per sample" },
      { label: "Materializations", value: "50,000+ per cohort" },
    ],
    tools: ["Dagster", "Software-Defined Assets", "IO Manager", "GATK", "BWA-MEM2", "samtools", "VEP", "S3", "Snowflake"],
    codeTabs: [
      {
        lang: "scala",
        filename: "GenomicsAssetGraph.scala",
        code: `import dagster._
import dagster_sdks.scala._
import dagster_sdks.scala.IOManager._

// Scala definitions for the Dagster genomics software-defined asset graph.
// Each @asset-decorated function declares an artifact + its upstream deps.
// Dagster's IOManager handles storage — BAMs on S3, VCFs on S3, tables on Snowflake.

@Repository
object GenomicsAssetGraph {
  // Resources — Dagster injects these via the resource system
  val gatkResource = GatkResource(version = "4.5.0.0", reference = "/ref/GRCh38.fa")
  val s3IOManager  = S3IOManager(bucket = "genomics-artifacts", prefix = "dagster")
  val snowflakeIO  = SnowflakeIOManager(database = "genomics_prod", schema = "dagster")

  // Asset 1: raw FASTQ reads (source asset — produced by the sequencer)
  @Asset(io_manager_key = "s3_io", group = "bronze")
  def fastq_reads(sample_id: String): FASTQArtifact = {
    // External asset — Dagster materialises via sensor / sensor + IO manager
    // Path: s3://genomics-artifacts/dagster/fastq_reads/{sample_id}/
    FASTQArtifact(
      r1 = s"s3://genomics-artifacts/dagster/fastq_reads/\${sample_id}/R1.fq.gz",
      r2 = s"s3://genomics-artifacts/dagster/fastq_reads/\${sample_id}/R2.fq.gz"
    )
  }

  // Asset 2: aligned BAM (depends on fastq_reads)
  @Asset(io_manager_key = "s3_io", group = "silver", deps = Array("fastq_reads"))
  def aligned_bam(
    context: AssetExecutionContext,
    fastq_reads: FASTQArtifact,
    sample_id: String,
    @Resource gatk: GatkResource
  ): BAMArtifact = {
    // BWA-MEM2 alignment
    val outputBam = s"s3://genomics-artifacts/dagster/aligned_bam/\${sample_id}.bam"
    gatk.runBwaMem2(
      fastqR1 = fastq_reads.r1,
      fastqR2 = fastq_reads.r2,
      outputBam = outputBam,
      threads = 32
    )
    BAMArtifact(path = outputBam, sampleId = sample_id)
  }

  // Asset 3: deduplicated BAM (depends on aligned_bam)
  @Asset(io_manager_key = "s3_io", group = "silver", deps = Array("aligned_bam"))
  def dedup_bam(
    aligned_bam: BAMArtifact,
    sample_id: String,
    @Resource gatk: GatkResource
  ): BAMArtifact = {
    val outputBam = s"s3://genomics-artifacts/dagster/dedup_bam/\${sample_id}.dedup.bam"
    gatk.runMarkDuplicates(
      inputBam = aligned_bam.path,
      outputBam = outputBam
    )
    BAMArtifact(path = outputBam, sampleId = sample_id)
  }

  // Asset 4: recalibrated BAM (depends on dedup_bam)
  @Asset(io_manager_key = "s3_io", group = "silver", deps = Array("dedup_bam"))
  def recalibrated_bam(
    dedup_bam: BAMArtifact,
    sample_id: String,
    @Resource gatk: GatkResource
  ): BAMArtifact = {
    val outputBam = s"s3://genomics-artifacts/dagster/recalibrated_bam/\${sample_id}.recal.bam"
    gatk.runBaseRecalibrator(
      inputBam = dedup_bam.path,
      outputBam = outputBam
    )
    BAMArtifact(path = outputBam, sampleId = sample_id)
  }

  // Asset 5: raw VCF (depends on recalibrated_bam)
  @Asset(io_manager_key = "s3_io", group = "silver", deps = Array("recalibrated_bam"))
  def raw_vcf(
    recalibrated_bam: BAMArtifact,
    sample_id: String,
    @Resource gatk: GatkResource
  ): VCFArtifact = {
    val outputVcf = s"s3://genomics-artifacts/dagster/raw_vcf/\${sample_id}.g.vcf.gz"
    gatk.runHaplotypeCaller(
      inputBam = recalibrated_bam.path,
      outputVcf = outputVcf
    )
    VCFArtifact(path = outputVcf, sampleId = sample_id)
  }

  // Asset 6: filtered VCF (depends on raw_vcf)
  @Asset(io_manager_key = "s3_io", group = "silver", deps = Array("raw_vcf"))
  def filtered_vcf(
    raw_vcf: VCFArtifact,
    sample_id: String,
    @Resource gatk: GatkResource
  ): VCFArtifact = {
    val outputVcf = s"s3://genomics-artifacts/dagster/filtered_vcf/\${sample_id}.filtered.vcf.gz"
    gatk.runVariantFiltration(
      inputVcf = raw_vcf.path,
      outputVcf = outputVcf
    )
    VCFArtifact(path = outputVcf, sampleId = sample_id)
  }

  // Asset 7: annotated VCF (depends on filtered_vcf)
  @Asset(io_manager_key = "s3_io", group = "gold", deps = Array("filtered_vcf"))
  def annotated_vcf(
    filtered_vcf: VCFArtifact,
    sample_id: String,
    @Resource gatk: GatkResource
  ): VCFArtifact = {
    val outputVcf = s"s3://genomics-artifacts/dagster/annotated_vcf/\${sample_id}.annotated.vcf.gz"
    gatk.runVEP(
      inputVcf = filtered_vcf.path,
      outputVcf = outputVcf
    )
    VCFArtifact(path = outputVcf, sampleId = sample_id)
  }

  // Asset 8: allele frequency table (depends on annotated_vcf, lands on Snowflake)
  @Asset(io_manager_key = "snowflake_io", group = "gold", deps = Array("annotated_vcf"))
  def allele_freq_table(
    annotated_vcf: VCFArtifact,
    sample_id: String
  ): TableArtifact = {
    // Aggregate allele frequency per population
    TableArtifact(
      database = "genomics_prod",
      schema = "dagster",
      table = "fct_allele_freq",
      sampleFilter = sample_id
    )
  }
}
// The IOManager decouples asset computation from asset storage.
// BamIOManager knows how to serialise/deserialise BAM to S3.
// VcfIOManager knows how to serialise/deserialise VCF to S3.
// SnowflakeIOManager knows how to load allele_freq into Snowflake.`,
      },
      {
        lang: "rust",
        filename: "dagster_genomics_assets.rs",
        code: `use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Rust service that materialises a single Dagster asset via the Dagster
// GraphQL API. Use case: a Rust Kubernetes operator that scales the
// Dagster user code deployment based on asset materialisation backlog,
// and triggers re-materialisation when an upstream input changes.

#[derive(Debug, Serialize, Deserialize)]
struct GraphQLRequest {
    query: String,
    variables: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GraphQLResponse {
    data: serde_json::Value,
    errors: Option<Vec<serde_json::Value>>,
}

/// Launch a materialisation for a specific asset + partition key.
async fn launch_asset_materialisation(
    graphql_url: &str,
    asset_key: &[&str],
    partition_key: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    let query = r#"
        mutation LaunchAsset($assetKey: [String!], $partitionKey: String) {
            launchPartitionRun(assetKey: $assetKey, partitionKey: $partitionKey) {
                runId
            }
        }
    "#;
    let mut vars = HashMap::new();
    vars.insert("assetKey".to_string(),
        serde_json::json!(asset_key));
    vars.insert("partitionKey".to_string(),
        serde_json::json!(partition_key));

    let req = GraphQLRequest {
        query: query.to_string(),
        variables: vars,
    };

    let client = reqwest::Client::new();
    let resp: GraphQLResponse = client.post(graphql_url)
        .json(&req)
        .send().await?
        .json().await?;

    let run_id = resp.data["launchPartitionRun"]["runId"]
        .as_str()
        .ok_or("runId not found")?
        .to_string();
    Ok(run_id)
}

/// Fetch the latest materialisation of an asset (to check if up-to-date).
async fn get_latest_materialisation(
    graphql_url: &str,
    asset_key: &[&str],
    partition_key: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    let query = r#"
        query LatestMaterialisation($assetKey: [String!], $partitionKey: String) {
            assetOrError(assetKey: $assetKey) {
                ... on Asset {
                    definition {
                        opName
                    }
                    assetMaterializations(limit: 1, partitions: [$partitionKey]) {
                        timestamp
                        runId
                    }
                }
            }
        }
    "#;
    let mut vars = HashMap::new();
    vars.insert("assetKey".to_string(),
        serde_json::json!(asset_key));
    vars.insert("partitionKey".to_string(),
        serde_json::json!(partition_key));

    let req = GraphQLRequest {
        query: query.to_string(),
        variables: vars,
    };

    let client = reqwest::Client::new();
    let resp: GraphQLResponse = client.post(graphql_url)
        .json(&req)
        .send().await?
        .json().await?;

    Ok(resp.data.to_string())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let graphql_url = "http://dagster.genomics-platform.org/graphql";

    // Materialise the annotated_vcf asset for sample HG001-NA12878
    let run_id = launch_asset_materialisation(
        graphql_url,
        &["genomics", "annotated_vcf"],
        "HG001-NA12878",
    ).await?;
    println!("Launched materialisation run: {}", run_id);

    // Check the latest materialisation timestamp
    let latest = get_latest_materialisation(
        graphql_url,
        &["genomics", "allele_freq_table"],
        "HG001-NA12878",
    ).await?;
    println!("Latest materialisation: {}", latest);

    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "dagster_genomics_assets.go",
        code: `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

// Go service that interacts with the Dagster GraphQL API to launch
// and track genomics asset materialisations. Use case: a Go-based
// cron-driven service that polls for stale assets (last materialised
// > 7 days ago) and triggers re-materialisation.

type GraphQLRequest struct {
    Query     string                 \`json:"query"\`
    Variables map[string]interface{} \`json:"variables"\`
}

type GraphQLResponse struct {
    Data   map[string]interface{} \`json:"data"\`
    Errors []map[string]interface{} \`json:"errors"\`
}

func launchAssetMaterialisation(
    graphqlURL string, assetKey []string, partitionKey string,
) (string, error) {
    query := \`
        mutation LaunchAsset($assetKey: [String!], $partitionKey: String) {
            launchPartitionRun(assetKey: $assetKey, partitionKey: $partitionKey) {
                runId
            }
        }
    \`
    req := GraphQLRequest{
        Query: query,
        Variables: map[string]interface{}{
            "assetKey":     assetKey,
            "partitionKey": partitionKey,
        },
    }
    body, _ := json.Marshal(req)
    resp, err := http.Post(graphqlURL, "application/json", bytes.NewBuffer(body))
    if err != nil { return "", err }
    defer resp.Body.Close()

    bodyBytes, _ := io.ReadAll(resp.Body)
    var result GraphQLResponse
    json.Unmarshal(bodyBytes, &result)
    data := result.Data["launchPartitionRun"].(map[string]interface{})
    return data["runId"].(string), nil
}

func main() {
    graphqlURL := "http://dagster.genomics-platform.org/graphql"

    // Materialise the allele_freq_table asset for a sample
    runID, err := launchAssetMaterialisation(
        graphqlURL,
        []string{"genomics", "allele_freq_table"},
        "HG001-NA12878",
    )
    if err != nil { fmt.Println("error:", err); return }
    fmt.Printf("Launched materialisation run: %s\\n", runID)
}`,
      },
      {
        lang: "elixir",
        filename: "dagster_genomics_assets.ex",
        code: `defmodule Genomics.DagsterAssetMonitor do
  @moduledoc """
  Phoenix LiveView dashboard that surfaces the genomics asset graph
  status. Shows each asset (fastq_reads → allele_freq_table), its
  latest materialisation timestamp, and upstream dependencies. Lets
  users trigger re-materialisation of stale assets.
  """
  use Phoenix.LiveView
  require Logger

  @dagster_graphql "http://dagster.genomics-platform.org/graphql"

  def render(assigns) do
    ~H"""
    <div>
      <h3>Genomics Asset Graph — Sample {{@sample_id}}</h3>
      <table>
        <tr>
          <th>Asset</th>
          <th>Layer</th>
          <th>Last materialised</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
        <%= for a <- @assets do %>
          <tr style="color: {{status_color(a.status)}}">
            <td><%= a.key %></td>
            <td><%= a.group %></td>
            <td><%= a.last_materialised %></td>
            <td><%= a.status %></td>
            <td>
              <button phx-click="rematerialise" phx-value-asset="<%= a.key %>">
                Re-materialise
              </button>
            </td>
          </tr>
        <% end %>
      </table>
    </div>
    """
  end

  def mount(%{"sample_id" => sample_id}, _session, socket) do
    Phoenix.PubSub.subscribe(Genomics.PubSub, "asset_state:#{sample_id}")
    assets = fetch_asset_states(sample_id)
    {:ok, assign(socket, sample_id: sample_id, assets: assets)}
  end

  def handle_event("rematerialise", %{"asset" => asset_key}, socket) do
    {:ok, run_id} = launch_asset_materialisation(asset_key, socket.assigns.sample_id)
    Logger.info("Re-materialised asset #{asset_key} for #{socket.assigns.sample_id}: run #{run_id}")
    {:noreply, socket}
  end

  def handle_info({:asset_state_updated, asset_key, status, ts}, socket) do
    assets = Enum.map(socket.assigns.assets, fn a ->
      if a.key == asset_key do
        %{a | status: status, last_materialised: ts}
      else
        a
      end
    end)
    {:noreply, assign(socket, assets: assets)}
  end

  defp fetch_asset_states(sample_id) do
    # Query Dagster GraphQL for the genomics asset graph state
    query = \"\"\"
      query AssetStates($partitionKey: String) {
        assetsOrError {
          ... on AssetConnection {
            nodes {
              key { path }
              group
              assetMaterializations(limit: 1, partitions: [$partitionKey]) {
                timestamp
              }
            }
          }
        }
      }
    \"\"\"

    body = Jason.encode!(%{
      query: query,
      variables: %{partitionKey: sample_id}
    })

    {:ok, %{body: resp_body}} = HTTPoison.post(
      @dagster_graphql, body,
      [{"Content-Type", "application/json"}]
    )

    Jason.decode!(resp_body)["data"]["assetsOrError"]["nodes"]
    |> Enum.map(fn node ->
      mats = node["assetMaterializations"]
      ts = if length(mats) > 0, do: List.first(mats)["timestamp"], else: "never"
      %{
        key: Enum.join(node["key"]["path"], "/"),
        group: node["group"],
        last_materialised: ts,
        status: if(length(mats) > 0, do: "up-to-date", else: "missing")
      }
    end)
  end

  defp launch_asset_materialisation(asset_key, sample_id) do
    mutation = \"\"\"
      mutation Launch($assetKey: [String!], $partitionKey: String) {
        launchPartitionRun(assetKey: $assetKey, partitionKey: $partitionKey) {
          runId
        }
      }
    \"\"\"

    body = Jason.encode!(%{
      query: mutation,
      variables: %{assetKey: String.split(asset_key, "/"), partitionKey: sample_id}
    })

    {:ok, %{body: resp_body}} = HTTPoison.post(
      @dagster_graphql, body,
      [{"Content-Type", "application/json"}]
    )

    {:ok, Jason.decode!(resp_body)["data"]["launchPartitionRun"]["runId"]}
  end

  defp status_color("up-to-date"), do: "green"
  defp status_color("stale"),       do: "orange"
  defp status_color("missing"),      do: "red"
  defp status_color(_),              do: "gray"
end`,
      },
      {
        lang: "zig",
        filename: "dagster_genomics_assets.zig",
        code: `const std = @import("std");
const http = @import("http-zig");

// Zig service that interacts with the Dagster GraphQL API to launch
// and track genomics asset materialisations. Use case: a Zig static
// binary deployed to a Cloud Run service that monitors the asset
// graph state, triggers re-materialisation of stale assets, and
// sends alerts to Slack when materialisation fails.

const GraphQLResponse = struct {
    data: std.json.Value,
};

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = http.Client.init(allocator);
    defer client.deinit();

    // Launch materialisation of the annotated_vcf asset for sample HG001-NA12878
    const url = "http://dagster.genomics-platform.org/graphql";

    const body =
        \\\\{
        \\\\  "query": "mutation Launch($assetKey: [String!], $partitionKey: String) { launchPartitionRun(assetKey: $assetKey, partitionKey: $partitionKey) { runId } }",
        \\\\  "variables": {
        \\\\    "assetKey": ["genomics", "annotated_vcf"],
        \\\\    "partitionKey": "HG001-NA12878"
        \\\\  }
        \\\\}
    ;

    var resp = try client.post(allocator, .{
        .url = url,
        .headers = &.{
            .{ .key = "Content-Type", .value = "application/json" },
        },
        .body = body,
    });
    defer resp.deinit();

    var parsed = try std.json.parseFromSlice(GraphQLResponse, allocator, resp.body, .{});
    defer parsed.deinit();

    // Extract runId from the response
    if (parsed.value.data == .object) {
        const data_obj = parsed.value.data.object;
        if (data_obj.get("launchPartitionRun")) |launch| {
            if (launch == .object) {
                if (launch.object.get("runId")) |run_id_val| {
                    if (run_id_val == .string) {
                        std.debug.print("Launched materialisation run: {s}\\n",
                            .{run_id_val.string});
                    }
                }
            }
        }
    }

    std.debug.print("Asset materialisation launched\\n", .{});
}`,
      },
    ],
    runnablePython: `# Genomics Asset Graph — Dagster software-defined assets (Pyodide)
import random
from collections import defaultdict

print("=== Genomics Asset Graph — Dagster Software-Defined Assets ===")
print("Pipeline: fastq_reads → aligned_bam → dedup_bam → recalibrated_bam")
print("          → raw_vcf → filtered_vcf → annotated_vcf → allele_freq_table")
print()

random.seed(42)

# Define the 8 software-defined assets
assets = [
    ("fastq_reads",       "bronze",  [],                        "S3",         "FASTQArtifact"),
    ("aligned_bam",       "silver",  ["fastq_reads"],           "S3",         "BAMArtifact"),
    ("dedup_bam",         "silver",  ["aligned_bam"],           "S3",         "BAMArtifact"),
    ("recalibrated_bam",  "silver",  ["dedup_bam"],             "S3",         "BAMArtifact"),
    ("raw_vcf",           "silver",  ["recalibrated_bam"],      "S3",         "VCFArtifact"),
    ("filtered_vcf",      "silver",  ["raw_vcf"],               "S3",         "VCFArtifact"),
    ("annotated_vcf",     "gold",    ["filtered_vcf"],          "S3",         "VCFArtifact"),
    ("allele_freq_table", "gold",    ["annotated_vcf"],         "Snowflake",  "TableArtifact"),
]

print("Software-defined asset graph:")
print(f"{'Asset':<22} | {'Layer':<8} | {'IO Manager':<12} | {'Type':<16} | {'Depends on'}")
print("-" * 100)
for name, layer, deps, io, type_name in assets:
    deps_str = ", ".join(deps) if deps else "(source)"
    print(f"{name:<22} | {layer:<8} | {io:<12} | {type_name:<16} | {deps_str}")

# Simulate a cohort of N samples materialising through the asset graph
n_samples = 100  # scaled from 10,000
samples = [f"HG{i:04d}-NA{i:05d}" for i in range(n_samples)]
print()
print(f"Cohort: {n_samples} samples · 8 assets per sample = {n_samples * 8:,} potential materialisations")

# Each asset has a per-sample materialisation status: missing / stale / up-to-date
# Stale = upstream changed since this asset was last materialised
asset_states = defaultdict(lambda: defaultdict(str))
for sample_id in samples:
    for name, layer, deps, io, type_name in assets:
        # 85% up-to-date, 10% stale (upstream changed), 5% missing
        r = random.random()
        if r < 0.85:
            asset_states[sample_id][name] = "up-to-date"
        elif r < 0.95:
            asset_states[sample_id][name] = "stale"
        else:
            asset_states[sample_id][name] = "missing"

# Aggregate status counts per asset
print()
print("Asset materialisation status (across {} samples):".format(n_samples))
print(f"{'Asset':<22} | {'Up-to-date':<11} | {'Stale':<8} | {'Missing':<8} | {'Coverage'}")
print("-" * 75)
for name, layer, deps, io, type_name in assets:
    counts = defaultdict(int)
    for sample_id in samples:
        counts[asset_states[sample_id][name]] += 1
    coverage = 100 * counts["up-to-date"] / n_samples
    print(f"{name:<22} | {counts['up-to-date']:<11} | {counts['stale']:<8} | {counts['missing']:<8} | {coverage:.1f}%")

# IO Manager — what storage each asset type uses
print()
print("IO Manager — storage mapping:")
print("  BamIOManager      → s3://genomics-artifacts/dagster/{asset}/{sample_id}.bam")
print("  VcfIOManager      → s3://genomics-artifacts/dagster/{asset}/{sample_id}.vcf.gz")
print("  SnowflakeIOManager → Snowflake table genomics_prod.dagster.{asset}")
print()

# Asset recomputation logic — only recompute stale/missing assets whose upstream changed
print("=== Dagster's incremental recomputation logic ===")
recompute_count = 0
for sample_id in samples:
    # Check each asset — if it's stale or missing, Dagster will recompute it
    for name, layer, deps, io, type_name in assets:
        if asset_states[sample_id][name] in ("stale", "missing"):
            # Dagster only recomputes if upstream inputs have changed
            upstream_changed = any(
                asset_states[sample_id][d] in ("stale", "missing") for d in deps
            ) or not deps  # source assets always recompute if stale
            if upstream_changed or not deps:
                recompute_count += 1

print(f"  Total assets:           {n_samples * 8:,}")
print(f"  Recompute needed:      {recompute_count:,}")
print(f"  Skipped (up-to-date):  {n_samples * 8 - recompute_count:,}")
print(f"  Recompute ratio:       {100 * recompute_count / (n_samples * 8):.1f}%")

# Asset lineage — query the asset graph (for FDA/CLIA audit)
print()
print("=== Asset lineage (FDA/CLIA audit) ===")
print("  Query: 'Which samples contributed to allele_freq_table on 2024-09-15?'")
print("  Answer: DAGSTER traces the asset graph backwards:")
print("    allele_freq_table depends on annotated_vcf")
print("    annotated_vcf depends on filtered_vcf")
print("    filtered_vcf depends on raw_vcf")
print("    raw_vcf depends on recalibrated_bam")
print("    recalibrated_bam depends on dedup_bam")
print("    dedup_bam depends on aligned_bam")
print("    aligned_bam depends on fastq_reads")
print("  → For each sample, returns the full lineage: who materialised it,")
print("    when, with what upstream version, on what compute resource.")
print()
print("Key insight: software-defined assets shift the orchestration model")
print("from 'run this task on this schedule' to 'is this asset up-to-date?'.")
print("For a 10k-sample cohort, when one sample's FASTQ is regenerated,")
print("only that sample's downstream BAM/VCF/allele_freq are recomputed")
print("— not the entire cohort. IO Manager handles S3 storage paths")
print("automatically; lineage is queryable for FDA/CLIA audit.")`,
    insight: "Software-defined assets (SDA) are Dagster's key innovation vs Airflow's DAG-oriented model. Instead of 'run this task on this schedule', Dagster asks 'is this asset up-to-date?' — only recomputing assets whose upstream inputs have changed. For a 10,000-sample genomics cohort, when one sample's FASTQ is regenerated, only that sample's downstream BAM/VCF/allele_freq are recomputed — not the entire cohort. The IO Manager handles BAM/VCF storage on S3 with versioned paths — no manual file passing. Asset lineage is queryable for FDA/CLIA regulatory review: 'which samples contributed to allele_freq_table on 2024-09-15?' returns the full lineage in one GraphQL query.",
  },

  // ============================================================
  // 2. SENSOR DATA PARTITIONS — DAGSTER IO MANAGER (Sensors)
  //    Hourly partitions for 50k IoT sensors
  // ============================================================
  {
    id: "dagster-sensor-data-partitions",
    step: "2",
    title: "Sensor Data Partitions — Hourly Partitions for 50k IoT Sensors",
    subtitle: "Sensors — Dagster hourly partitions + partition-aware IO Manager for 50k devices",
    accent: "oklch(0.65 0.16 200)",
    icon: <Radio className="h-4 w-4" />,
    badge: "Sensors · Partitions",
    brief: {
      dataset: "50,000 IoT environmental sensors (temperature, humidity, CO2, particulate matter) streaming at 1 reading/sec = 50k events/sec = 4.3 billion events/day. Dagster hourly partitions: each asset has 24 partitions per day, partition key format '2024-09-15-14:00'. IO Manager writes per-partition Parquet files to S3 — partition '2024-09-15-14:00' lands at s3://sensor-data/raw/year=2024/month=09/day=15/hour=14/.",
      scale: "50,000 sensors × 1 reading/sec = 4.3B events/day · 24 hourly partitions/day · ~180MB Parquet per partition · 50k devices × 4 fields (temp, humidity, co2, pm25) = 200k time series",
      why: "Dagster's partition-aware IO Manager is the killer feature for time-series sensor data. Each partition is a self-contained S3 object — backfilling a single hour is trivial (re-run that partition), no need to re-process the entire day. Partition keys ('2024-09-15-14:00') double as Hive-style partition paths — the resulting Parquet files are queryable from Trino/Athena without a separate ETL step. Asset lineage is partition-aware: 'which partition of raw_readings contributed to the 14:00 daily_summary partition?' is one GraphQL query.",
    },
    stats: [
      { label: "Sensors", value: "50,000 devices" },
      { label: "Events/day", value: "4.3 billion" },
      { label: "Partitions", value: "24 hourly/day" },
      { label: "Per partition", value: "~180 MB Parquet" },
    ],
    tools: ["Dagster", "HourlyPartitionsDefinition", "IO Manager", "S3", "Apache Parquet", "Trino", "Athena", "InfluxDB", "MQTT"],
    codeTabs: [
      {
        lang: "scala",
        filename: "SensorPartitionedAssets.scala",
        code: `import dagster._
import dagster_sdks.scala._
import dagster_sdks.scala.Partitions._

// Scala definitions for the Dagster sensor-data asset graph with
// hourly partitions. Each asset has 24 partitions per day, and the
// IO Manager writes per-partition Parquet files to S3 in Hive-style
// partition paths.

@Repository
object SensorPartitionedAssets {
  // Hourly partition definition — covers the last 30 days
  val hourlyPartitions = HourlyPartitionsDefinition(
    startDate = "2024-08-16-00:00",
    endOffset = 0,         // include current hour
    fmt = "yyyy-MM-dd-HH:mm",
    timezone = "UTC"
  )

  // Partition-aware IO Manager — writes to S3 in Hive-style paths
  // s3://sensor-data/{asset}/year=2024/month=09/day=15/hour=14/data.parquet
  val s3PartitionedIO = S3PartitionedIOManager(
    bucket = "sensor-data",
    keyFn = (asset_key, partition_key) => {
      val parts = partition_key.split("-")
      s"\${asset_key}/year=\${parts(0)}/month=\${parts(1)}/day=\${parts(2)}/hour=\${parts(3).substring(0, 2)}/data.parquet"
    }
  )

  // Asset 1: raw_readings (source asset — MQTT subscriber)
  // Partition key: '2024-09-15-14:00' (hour granularity)
  @Asset(
    partitionsDef = hourlyPartitions,
    io_manager_key = "s3_partitioned_io",
    group = "bronze"
  )
  def raw_readings(
    context: AssetExecutionContext,
    partition_key: String
  ): ParquetArtifact = {
    // MQTT subscriber reads 50k sensors for 1 hour (~180MB of data)
    val mqtt = MqttBrokerClient(broker = "ssl://mqtt.sensor-net.org:8883")
    val readings = mqtt.readHour(partition_key)
    ParquetArtifact(rows = readings, schema = SensorReadingsSchema)
  }

  // Asset 2: cleaned_readings (depends on raw_readings — same partition)
  @Asset(
    partitionsDef = hourlyPartitions,
    io_manager_key = "s3_partitioned_io",
    group = "silver",
    deps = Array("raw_readings")
  )
  def cleaned_readings(
    context: AssetExecutionContext,
    raw_readings: ParquetArtifact,
    partition_key: String
  ): ParquetArtifact = {
    // Drop readings with null sensor_id, out-of-range values, duplicate timestamps
    val cleaned = raw_readings.rows
      .filter(r => r.sensor_id != null
                && r.temperature > -50 && r.temperature < 80
                && r.humidity >= 0    && r.humidity <= 100)
    ParquetArtifact(rows = cleaned, schema = raw_readings.schema)
  }

  // Asset 3: hourly_aggregates (per-sensor per-hour means)
  @Asset(
    partitionsDef = hourlyPartitions,
    io_manager_key = "s3_partitioned_io",
    group = "gold",
    deps = Array("cleaned_readings")
  )
  def hourly_aggregates(
    context: AssetExecutionContext,
    cleaned_readings: ParquetArtifact,
    partition_key: String
  ): ParquetArtifact = {
    val aggregated = cleaned_readings.rows
      .groupBy(r => (r.sensor_id, r.timestamp.truncatedTo(java.time.temporal.ChronoUnit.HOURS)))
      .map { case ((sid, hour), rs) =>
        SensorAggregate(
          sensor_id = sid,
          hour = hour,
          avg_temp = rs.map(_.temperature).mean,
          min_temp = rs.map(_.temperature).min,
          max_temp = rs.map(_.temperature).max,
          avg_humidity = rs.map(_.humidity).mean,
          reading_count = rs.size
        )
      }
    ParquetArtifact(rows = aggregated, schema = SensorAggregateSchema)
  }

  // Asset 4: daily_summary (multi-partition — daily, depends on 24 hourly partitions)
  val dailyPartitions = DailyPartitionsDefinition(startDate = "2024-08-16")
  @Asset(
    partitionsDef = dailyPartitions,
    io_manager_key = "s3_partitioned_io",
    group = "gold",
    deps = Array("hourly_aggregates")
  )
  def daily_summary(
    context: AssetExecutionContext,
    hourly_aggregates: MultiPartitionMapping,
    partition_key: String
  ): ParquetArtifact = {
    // Multi-partition: daily_summary[2024-09-15] depends on all 24
    // hourly_aggregates[2024-09-15-XX:00] for that day.
    val hourly_data = hourly_aggregates.allPartitions()  // 24 partitions
    val daily = hourly_data
      .groupBy(_.sensor_id)
      .map { case (sid, hrs) =>
        SensorDaily(
          sensor_id = sid,
          date = partition_key,
          daily_avg_temp = hrs.map(_.avg_temp).mean,
          daily_max_temp = hrs.map(_.max_temp).max,
          daily_min_temp = hrs.map(_.min_temp).min,
          hourly_count = hrs.size
        )
      }
    ParquetArtifact(rows = daily, schema = SensorDailySchema)
  }

  // Asset 5: anomaly_alerts (depends on hourly_aggregates — same partition)
  // Triggers when a sensor's hourly reading deviates > 3σ from its 7-day rolling mean
  @Asset(
    partitionsDef = hourlyPartitions,
    io_manager_key = "s3_partitioned_io",
    group = "gold",
    deps = Array("hourly_aggregates")
  )
  def anomaly_alerts(
    context: AssetExecutionContext,
    hourly_aggregates: ParquetArtifact,
    partition_key: String
  ): ParquetArtifact = {
    val baseline = BaselineStats.lookback(partition_key, days = 7)
    val anomalies = hourly_aggregates.rows.filter { r =>
      math.abs(r.avg_temp - baseline.mean(r.sensor_id)) > 3 * baseline.stddev(r.sensor_id)
    }
    if (anomalies.nonEmpty) {
      context.log.info(s"Detected \${anomalies.size} anomalies for \${partition_key}")
      AlertsPublisher.publish(anomalies)  // SNS → PagerDuty
    }
    ParquetArtifact(rows = anomalies, schema = AnomalySchema)
  }
}
// The IO Manager writes per-partition Parquet files to S3 in Hive-style
// partition paths. Trino/Athena can query these without a separate ETL
// step — the partition paths ARE the Hive partition spec.`,
      },
      {
        lang: "rust",
        filename: "dagster_sensor_partitions.rs",
        code: `use serde::{Deserialize, Serialize};
use chrono::{DateTime, NaiveDateTime, Utc};

// Rust service that backfills Dagster sensor-data partitions via the
// GraphQL API. Use case: when a sensor firmware update changes the
// reading schema, this service backfills the last 30 days of hourly
// partitions to recompute cleaned_readings + hourly_aggregates +
// daily_summary + anomaly_alerts.

#[derive(Debug, Serialize, Deserialize)]
struct GraphQLRequest {
    query: String,
    variables: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
struct GraphQLResponse {
    data: serde_json::Value,
    errors: Option<Vec<serde_json::Value>>,
}

/// Backfill a range of hourly partitions for an asset.
async fn backfill_partitions(
    graphql_url: &str,
    asset_key: &[&str],
    start_partition: &str,    // e.g. "2024-09-15-00:00"
    end_partition: &str,      // e.g. "2024-09-15-23:00"
) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let query = r#"
        mutation Backfill($assetKey: [String!], $start: String, $end: String) {
            launchPartitionBackfill(
                assetKey: $assetKey,
                partitionSetName: "default",
                partitions: { range: { start: $start, end: $end } }
            ) {
                runIds
            }
        }
    "#;
    let req = GraphQLRequest {
        query: query.to_string(),
        variables: serde_json::json!({
            "assetKey": asset_key,
            "start": start_partition,
            "end": end_partition
        }),
    };

    let client = reqwest::Client::new();
    let resp: GraphQLResponse = client.post(graphql_url)
        .json(&req)
        .send().await?
        .json().await?;

    let run_ids: Vec<String> = resp.data["launchPartitionBackfill"]["runIds"]
        .as_array()
        .ok_or("runIds not found")?
        .iter()
        .map(|v| v.as_str().unwrap().to_string())
        .collect();
    Ok(run_ids)
}

/// Generate hourly partition keys for a date range (used for backfill planning).
fn hourly_partitions(start: &str, end: &str) -> Vec<String> {
    let start_dt = NaiveDateTime::parse_from_str(start, "%Y-%m-%d-%H:%M").unwrap();
    let end_dt   = NaiveDateTime::parse_from_str(end,   "%Y-%m-%d-%H:%M").unwrap();
    let mut partitions = vec![];
    let mut current = start_dt;
    while current <= end_dt {
        partitions.push(current.format("%Y-%m-%d-%H:%M").to_string());
        current += chrono::Duration::hours(1);
    }
    partitions
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let graphql_url = "http://dagster.sensor-platform.org/graphql";

    // Backfill yesterday's 24 hourly partitions for the cleaned_readings asset
    // (after a sensor firmware update changed the reading schema)
    let partitions = hourly_partitions("2024-09-15-00:00", "2024-09-15-23:00");
    println!("Backfilling {} partitions for cleaned_readings", partitions.len());

    let run_ids = backfill_partitions(
        graphql_url,
        &["sensor", "cleaned_readings"],
        "2024-09-15-00:00",
        "2024-09-15-23:00",
    ).await?;

    println!("Launched {} backfill runs", run_ids.len());
    for run_id in &run_ids {
        println!("  run: {}", run_id);
    }
    Ok(())
}`,
      },
      {
        lang: "go",
        filename: "dagster_sensor_partitions.go",
        code: `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"
)

// Go service that interacts with the Dagster GraphQL API to launch
// partition-aware materialisations for the sensor data asset graph.
// Use case: a Go cron-driven Kubernetes operator that triggers the
// previous hour's partitions every hour at HH:05, ensuring the
// raw_readings → cleaned_readings → hourly_aggregates chain completes
// before the daily_summary backfill at midnight.

type GraphQLRequest struct {
    Query     string                 \`json:"query"\`
    Variables map[string]interface{} \`json:"variables"\`
}

type GraphQLResponse struct {
    Data map[string]interface{} \`json:"data"\`
}

func launchPartitionMaterialisation(
    graphqlURL string, assetKey []string, partitionKey string,
) (string, error) {
    query := \`
        mutation Launch($assetKey: [String!], $partitionKey: String) {
            launchPartitionRun(assetKey: $assetKey, partitionKey: $partitionKey) {
                runId
            }
        }
    \`
    req := GraphQLRequest{
        Query: query,
        Variables: map[string]interface{}{
            "assetKey":     assetKey,
            "partitionKey": partitionKey,
        },
    }
    body, _ := json.Marshal(req)
    resp, err := http.Post(graphqlURL, "application/json", bytes.NewBuffer(body))
    if err != nil { return "", err }
    defer resp.Body.Close()
    bodyBytes, _ := io.ReadAll(resp.Body)
    var result GraphQLResponse
    json.Unmarshal(bodyBytes, &result)
    data := result.Data["launchPartitionRun"].(map[string]interface{})
    return data["runId"].(string), nil
}

func main() {
    graphqlURL := "http://dagster.sensor-platform.org/graphql"

    // Launch the previous hour's partition for raw_readings
    prevHour := time.Now().UTC().Add(-1 * time.Hour).Format("2006-01-02-15:00")
    fmt.Printf("Launching materialisation for raw_readings partition %s\\n", prevHour)

    runID, err := launchPartitionMaterialisation(
        graphqlURL,
        []string{"sensor", "raw_readings"},
        prevHour,
    )
    if err != nil { fmt.Println("error:", err); return }
    fmt.Printf("Launched run: %s\\n", runID)
}`,
      },
      {
        lang: "elixir",
        filename: "dagster_sensor_partitions.ex",
        code: `defmodule Sensors.DagsterPartitionMonitor do
  @moduledoc """
  Phoenix LiveView dashboard that surfaces the sensor-data asset
  graph partition status. Shows each hourly partition's materialisation
  state (missing / in-progress / up-to-date / failed), and lets users
  trigger backfills for any partition range.
  """
  use Phoenix.LiveView
  require Logger

  @dagster_graphql "http://dagster.sensor-platform.org/graphql"

  def render(assigns) do
    ~H"""
    <div>
      <h3>Sensor Data Partitions — {{@date}}</h3>
      <p>
        Sensors: 50,000 · Events/hour: ~180M · Partitions: 24/day
      </p>

      <table>
        <tr>
          <th>Hour</th>
          <th>raw_readings</th>
          <th>cleaned_readings</th>
          <th>hourly_aggregates</th>
          <th>anomaly_alerts</th>
        </tr>
        <%= for p <- @partitions do %>
          <tr>
            <td><%= p.hour %></td>
            <td style="color: {{status_color(p.raw_readings)}}">{{p.raw_readings}}</td>
            <td style="color: {{status_color(p.cleaned_readings)}}">{{p.cleaned_readings}}</td>
            <td style="color: {{status_color(p.hourly_aggregates)}}">{{p.hourly_aggregates}}</td>
            <td style="color: {{status_color(p.anomaly_alerts)}}">{{p.anomaly_alerts}}</td>
          </tr>
        <% end %>
      </table>

      <h4>Backfill a partition range</h4>
      <form phx-submit="backfill">
        <label>From hour: <input name="from" type="datetime-local"/></label>
        <label>To hour: <input name="to" type="datetime-local"/></label>
        <button>Backfill</button>
      </form>
    </div>
    """
  end

  def mount(%{"date" => date}, _session, socket) do
    Phoenix.PubSub.subscribe(Sensors.PubSub, "partition_status:#{date}")
    partitions = fetch_partition_status(date)
    {:ok, assign(socket, date: date, partitions: partitions)}
  end

  def handle_event("backfill", %{"from" => from, "to" => to}, socket) do
    # Backfill raw_readings + cleaned_readings for the range
    {:ok, _run_ids} = backfill_range(["sensor", "raw_readings"], from, to)
    {:ok, _run_ids} = backfill_range(["sensor", "cleaned_readings"], from, to)
    Logger.info("Backfilled sensor partitions #{from} to #{to}")
    {:noreply, socket}
  end

  def handle_info({:partition_status, hour, asset, status}, socket) do
    partitions = Enum.map(socket.assigns.partitions, fn p ->
      if p.hour == hour do
        Map.put(p, asset, status)
      else
        p
      end
    end)
    {:noreply, assign(socket, partitions: partitions)}
  end

  defp fetch_partition_status(date) do
    # 24 hourly partitions for the date
    Enum.map(0..23, fn hour ->
      partition_key = "#{date}-#{String.pad_leading(Integer.to_string(hour), 2, "0")}:00"
      %{
        hour: partition_key,
        raw_readings:      "missing",
        cleaned_readings:  "missing",
        hourly_aggregates: "missing",
        anomaly_alerts:    "missing",
      }
    end)
  end

  defp backfill_range(asset_key, from, to) do
    mutation = \"\"\"
      mutation Backfill($assetKey: [String!], $start: String, $end: String) {
        launchPartitionBackfill(assetKey: $assetKey,
          partitionSetName: "default",
          partitions: { range: { start: $start, end: $end } }) {
          runIds
        }
      }
    \"\"\"

    body = Jason.encode!(%{
      query: mutation,
      variables: %{assetKey: asset_key, start: from, end: to}
    })

    {:ok, %{body: resp_body}} = HTTPoison.post(
      @dagster_graphql, body,
      [{"Content-Type", "application/json"}]
    )

    run_ids = Jason.decode!(resp_body)["data"]["launchPartitionBackfill"]["runIds"]
    {:ok, run_ids}
  end

  defp status_color("up-to-date"),  do: "green"
  defp status_color("in-progress"), do: "blue"
  defp status_color("failed"),      do: "red"
  defp status_color("missing"),     do: "orange"
  defp status_color(_),             do: "gray"
end`,
      },
      {
        lang: "zig",
        filename: "dagster_sensor_partitions.zig",
        code: `const std = @import("std");
const http = @import("http-zig");

// Zig CLI tool that backfills Dagster sensor-data partitions via the
// GraphQL API. Use case: a Zig static binary deployed via CVMFS —
// triggered by an ops oncall when they detect a partition gap in
// the sensor data (e.g. raw_readings[2024-09-15-14:00] missing due
// to MQTT broker downtime).

const GraphQLResponse = struct {
    data: std.json.Value,
};

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = http.Client.init(allocator);
    defer client.deinit();

    // Backfill the missing hour partition for raw_readings
    const url = "http://dagster.sensor-platform.org/graphql";

    const body =
        \\\\{
        \\\\  "query": "mutation Launch($assetKey: [String!], $partitionKey: String) { launchPartitionRun(assetKey: $assetKey, partitionKey: $partitionKey) { runId } }",
        \\\\  "variables": {
        \\\\    "assetKey": ["sensor", "raw_readings"],
        \\\\    "partitionKey": "2024-09-15-14:00"
        \\\\  }
        \\\\}
    ;

    var resp = try client.post(allocator, .{
        .url = url,
        .headers = &.{
            .{ .key = "Content-Type", .value = "application/json" },
        },
        .body = body,
    });
    defer resp.deinit();

    var parsed = try std.json.parseFromSlice(GraphQLResponse, allocator, resp.body, .{});
    defer parsed.deinit();

    if (parsed.value.data == .object) {
        const data_obj = parsed.value.data.object;
        if (data_obj.get("launchPartitionRun")) |launch| {
            if (launch == .object) {
                if (launch.object.get("runId")) |run_id_val| {
                    if (run_id_val == .string) {
                        std.debug.print("Backfilled raw_readings[2024-09-15-14:00]: run {s}\\n",
                            .{run_id_val.string});
                    }
                }
            }
        }
    }

    // After raw_readings is materialised, launch cleaned_readings + downstream
    std.time.sleep(2 * std.time.ns_per_s);  // wait for raw_readings to complete
    std.debug.print("Now launch cleaned_readings + hourly_aggregates for the same partition\\n", .{});
}`,
      },
    ],
    runnablePython: `# Sensor Data Partitions — Dagster IO Manager simulation (Pyodide)
import random
from collections import defaultdict

print("=== Sensor Data Partitions — Dagster Hourly Partitions + IO Manager ===")
print("50,000 IoT sensors · 1 reading/sec/sensor · 4.3B events/day")
print("Partition granularity: hourly (24 partitions/day)")
print()

random.seed(42)

# Define the partitioned assets
assets = [
    ("raw_readings",      "bronze", [],                       "S3 (Hive-partitioned Parquet)"),
    ("cleaned_readings",  "silver", ["raw_readings"],         "S3 (Hive-partitioned Parquet)"),
    ("hourly_aggregates", "gold",   ["cleaned_readings"],     "S3 (Hive-partitioned Parquet)"),
    ("daily_summary",     "gold",   ["hourly_aggregates×24"],  "S3 (Hive-partitioned Parquet)"),
    ("anomaly_alerts",   "gold",   ["hourly_aggregates"],     "S3 (Hive-partitioned Parquet)"),
]

print("Partitioned asset graph:")
print(f"{'Asset':<22} | {'Layer':<8} | {'Depends on':<28} | {'IO Manager'}")
print("-" * 95)
for name, layer, deps, io in assets:
    deps_str = ", ".join(deps) if deps else "(source)"
    print(f"{name:<22} | {layer:<8} | {deps_str:<28} | {io}")

# Simulate one day of hourly partitions
print()
print("=== Daily partition run (24 hours) ===")
n_sensors = 50_000
events_per_sec_per_sensor = 1
events_per_hour = n_sensors * events_per_sec_per_sensor * 3600  # 180M

print(f"Sensors: {n_sensors:,} · Events/hour: {events_per_hour:,} ({events_per_hour/1e6:.0f}M)")

# For each hour, simulate the asset materialisation chain
hours = list(range(24))
partition_keys = [f"2024-09-15-{h:02d}:00" for h in hours]

# Each partition has a status: missing / in-progress / up-to-date / failed
partition_status = defaultdict(dict)
total_events = 0
total_anomalies = 0

for hour, pkey in zip(hours, partition_keys):
    # Raw readings: simulate ~180M events
    n_events = events_per_hour + random.randint(-1000, 1000)
    total_events += n_events

    # 1% chance of partition failure (MQTT broker downtime, etc.)
    if random.random() < 0.01:
        partition_status[pkey]["raw_readings"] = "failed"
        partition_status[pkey]["cleaned_readings"] = "missing"
        partition_status[pkey]["hourly_aggregates"] = "missing"
        partition_status[pkey]["daily_summary"] = "missing"
        partition_status[pkey]["anomaly_alerts"] = "missing"
        continue

    partition_status[pkey]["raw_readings"] = "up-to-date"

    # Cleaned readings: drop ~5% bad readings
    n_cleaned = int(n_events * 0.95)
    partition_status[pkey]["cleaned_readings"] = "up-to-date"

    # Hourly aggregates: per-sensor per-hour means
    n_aggregated = n_sensors  # one row per sensor
    partition_status[pkey]["hourly_aggregates"] = "up-to-date"

    # Anomaly alerts: ~0.01% of sensors have anomalies (>3σ from baseline)
    n_anomalies = int(n_sensors * 0.0001) + random.randint(0, 5)
    total_anomalies += n_anomalies
    partition_status[pkey]["anomaly_alerts"] = "up-to-date" if n_anomalies > 0 else "empty"

# Daily summary: aggregate over 24 hourly partitions
partition_status["2024-09-15"]["daily_summary"] = "up-to-date"

print(f"Total events processed: {total_events:,}")
print(f"Total anomalies detected: {total_anomalies:,}")
print()

# Show partition table
print("Per-partition status (24 hours of 2024-09-15):")
print(f"{'Partition':<22} | {'raw_readings':<14} | {'cleaned_readings':<18} | {'hourly_aggregates':<18} | {'anomaly_alerts'}")
print("-" * 100)
for hour in hours:
    pkey = partition_keys[hour]
    status = partition_status[pkey]
    print(f"{pkey:<22} | {status.get('raw_readings', 'n/a'):<14} | "
          f"{status.get('cleaned_readings', 'n/a'):<18} | "
          f"{status.get('hourly_aggregates', 'n/a'):<18} | "
          f"{status.get('anomaly_alerts', 'n/a')}")

# IO Manager — show S3 partition paths
print()
print("=== IO Manager — S3 partition paths ===")
print("Partition key format: '2024-09-15-14:00' → S3 path:")
print("  s3://sensor-data/raw_readings/year=2024/month=09/day=15/hour=14/data.parquet")
print("  s3://sensor-data/cleaned_readings/year=2024/month=09/day=15/hour=14/data.parquet")
print("  s3://sensor-data/hourly_aggregates/year=2024/month=09/day=15/hour=14/data.parquet")
print("  s3://sensor-data/anomaly_alerts/year=2024/month=09/day=15/hour=14/data.parquet")
print()

# Backfill scenario — partition 14:00 failed, re-run it
print("=== Backfill scenario: partition 2024-09-15-14:00 failed ===")
print("  Issue: MQTT broker downtime 14:00-14:15 → raw_readings[2024-09-15-14:00] missing")
print("  Backfill: launch re-materialisation of raw_readings[2024-09-15-14:00]")
print("  Dagster recomputes (in order):")
print("    1. raw_readings[2024-09-15-14:00]      — re-subscribe to MQTT, replay buffered events")
print("    2. cleaned_readings[2024-09-15-14:00]   — depends on (1)")
print("    3. hourly_aggregates[2024-09-15-14:00]  — depends on (2)")
print("    4. anomaly_alerts[2024-09-15-14:00]     — depends on (3)")
print("    5. daily_summary[2024-09-15]             — depends on (3) for all 24 partitions")
print("  Other partitions are NOT re-processed — only 14:00 + daily_summary.")
print()

# Query the partition from Trino/Athena
print("=== Trino/Athena query (Hive-style partition paths) ===")
print("  SELECT sensor_id, hour, avg_temp, max_temp")
print("  FROM sensor_data.hourly_aggregates")
print("  WHERE year = '2024' AND month = '09' AND day = '15' AND hour = '14'")
print("  → Returns in <1s (partition prune hits only 1 of 24 partitions)")
print()

# Asset lineage query (partition-aware)
print("=== Dagster partition-aware lineage query ===")
print("  Query: 'Which upstream partitions contributed to daily_summary[2024-09-15]?'")
print("  Answer: Dagster returns the partition lineage graph:")
print("    daily_summary[2024-09-15]")
print("      ← hourly_aggregates[2024-09-15-00:00 ... 23:00]")
print("        ← cleaned_readings[2024-09-15-00:00 ... 23:00]")
print("          ← raw_readings[2024-09-15-00:00 ... 23:00]")
print("  → 24 × 3 = 72 upstream partitions traced in 1 GraphQL query.")
print()
print("Key insight: Dagster's partition-aware IO Manager is the killer feature")
print("for time-series sensor data. Each partition is a self-contained S3")
print("object — backfilling a single hour is trivial (re-run that partition),")
print("no need to re-process the entire day. Partition keys double as")
print("Hive-style partition paths — the Parquet files are queryable from")
print("Trino/Athena without a separate ETL step.")`,
    insight: "Dagster's partition-aware IO Manager is the killer feature for time-series sensor data. Each partition is a self-contained S3 object — backfilling a single hour is trivial (re-run that partition), no need to re-process the entire day. Partition keys ('2024-09-15-14:00') double as Hive-style partition paths (year=2024/month=09/day=15/hour=14/) — the resulting Parquet files are queryable from Trino/Athena without a separate ETL step. Asset lineage is partition-aware: 'which upstream partitions contributed to daily_summary[2024-09-15]?' is one GraphQL query that returns 24×3 = 72 upstream partitions. For 50k IoT sensors at 4.3B events/day, this is the only sane model — each hour is independent, backfillable, and queryable.",
  },
];
