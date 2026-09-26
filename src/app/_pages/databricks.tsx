"use client";

import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { NextSteps } from "../_components/next-steps";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { MultiLangSamples } from "../_components/multi-lang-samples";
import { LiveResourcesDrawer } from "../_components/live-resources-drawer";
import { MEDALLION_LAYERS } from "../_data/synthetic";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PyodideRunner } from "../_components/pyodide-runner";
import { WasmRunner } from "../_components/wasm-runner";
import { Terminal } from "lucide-react";
import { Boxes, Cpu, Layers, Workflow, Database, Sparkles, GitBranch, ShieldCheck, Activity, Languages } from "lucide-react";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";

const PYSPARK_BRONZE = `# ============================================================
# bronze/silver/customer_conform.py
# Idempotent Silver conformance using Delta MERGE
# ============================================================
import dlt
from pyspark.sql.functions import (
    col, lit, current_timestamp, md5, concat_ws, when, coalesce,
)
from pyspark.sql.types import StringType

@dlt.view
def bronze_customer_raw():
    return (
        spark.readStream
        .format("delta")
        .load("/mnt/bronze/salesforce/account")
        .unionByName(spark.read.table("bronze.shopify.customer"))
    )

@dlt.table(
    name="silver.customer",
    comment="Conformed customer across Salesforce + Shopify, deduplicated by email hash",
    table_properties={
        "quality": "silver",
        "delta.enableChangeDataFeed": "true",
        "pipelines.reset.allowed": "false",
    },
    partition_cols=["region_code"],
)
@dlt.expect_or_drop("email_not_null", "customer_email IS NOT NULL")
@dlt.expect_or_quarantine(
    "email_format",
    r"customer_email RLIKE '^([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\\\.[A-Za-z]{2,})$'"
)
def silver_customer():
    src = dlt.read("bronze_customer_raw")
    return (
        src
        .withColumn("customer_email_hash", md5(lower(trim(col("customer_email")))))
        .withColumn("customer_sk", md5(concat_ws("||",
            col("customer_email_hash"), col("loaded_at"))))
        .withColumn("full_name", concat_ws(" ", col("first_name"), col("last_name")))
        .withColumn("is_active", when(col("status") == "ACTIVE", lit(True)).otherwise(lit(False)))
        .withColumn("region_code", coalesce(col("region"), lit("UNKNOWN")))
        .withColumn("loaded_at", current_timestamp())
        .dropDuplicates(["customer_email_hash", "loaded_at"])
        .select(
            "customer_sk", "customer_id", "customer_email_hash", "full_name",
            "segment", "region_code", "loyalty_tier", "is_active", "loaded_at",
        )
    )

# Idempotent MERGE into the curated Delta table — runs after DLT materialisation
@dlt.table(name="silver.customer_curated")
def silver_customer_curated():
    src = dlt.read("silver.customer")
    target = spark.read.table("silver.customer_curated")
    (
        target.alias("t")
        .merge(src.alias("s"), "t.customer_sk = s.customer_sk")
        .whenMatchedUpdateAll()
        .whenNotMatchedInsertAll()
        .execute()
    )
    return target
`;

const DELTA_SQL = `-- ============================================================
-- Bronze → Silver conformance using Delta Lake + Spark SQL
-- Run inside Databricks SQL warehouse for ad-hoc investigations
-- ============================================================
-- Optimise for predicate pushdown on hot columns
CREATE TABLE IF NOT EXISTS silver.order_line
USING DELTA
LOCATION 's3://moderndatascieng-silver/sales/order_line'
PARTITIONED BY (order_date_sk)
CLUSTERED BY (customer_sk, product_sk)
TBLPROPERTIES (
  'delta.enableChangeDataFeed'   = true,
  'delta.logRetentionDuration'   = 'interval 30 days',
  'delta.deletedFileRetentionDuration' = 'interval 7 days',
  'delta.dataSkippingNumIndexedCols' = 32,
  'quality' = 'silver',
  'owner'   = 'data_platform'
);

-- Idempotent MERGE — safe to re-run
MERGE INTO silver.order_line AS t
USING (
  SELECT
    o.order_id,
    o.order_line_id,
    o.customer_sk,
    o.product_sk,
    o.store_sk,
    o.order_date_sk,
    o.qty,
    o.gross_amount,
    o.discount_amount,
    o.net_amount,
    o.loaded_at
  FROM bronze.shopify.order_line_raw
  WHERE o.loaded_at > (SELECT COALESCE(MAX(loaded_at), '1970-01-01') FROM silver.order_line)
) AS s
ON t.order_line_id = s.order_line_id
WHEN MATCHED AND s.loaded_at > t.loaded_at THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;

-- Z-ORDER hot Silver tables nightly — 6x scan reduction on customer_sk
OPTIMIZE silver.order_line ZORDER BY (customer_sk, product_sk);
VACUUM silver.order_line RETAIN 168 HOURS;

-- Time travel — point-in-time audit
SELECT count(*) FROM silver.order_line VERSION AS OF 42
WHERE customer_sk = 'c5a9f1...';
`;

const PHOTON_CFG = `# cluster policy: "transform_gold" — used by dbt + PySpark DLT
# Managed via Databricks asset bundles (databricks.yml)
cluster_type: "all-purpose"
spark_version: "14.3.x-scala2.12"
node_type_id: "Standard_E16ds_v4"
autoscale:
  min_workers: 4
  max_workers: 24
  mode: "ENHANCED"            # photon + enhanced autoscaler
driver_node_type_id: "Standard_E16ds_v4"
autotermination_minutes: 30
spark_conf:
  "spark.databricks.delta.optimizeWrite.enabled": "true"
  "spark.databricks.delta.autoCompact.enabled": "true"
  "spark.sql.adaptive.coalescePartitions.enabled": "true"
  "spark.sql.parquet.compression.codec": "snappy"
  "spark.databricks.cluster.profile": "singleNode"
init_scripts:
  - workspace: /Shared/init/install_unity_driver.sh
aws_attributes:
  instance_profile_arn: "arn:aws:iam::123456789012:instance-profile/databricks-s3"
  zone_id: "auto"
`;

const MEDALLION_STATS = [
  { label: "Bronze tables", value: String(MEDALLION_LAYERS[0].tables) },
  { label: "Bronze volume / mo", value: MEDALLION_LAYERS[0].volume },
  { label: "Silver tables", value: String(MEDALLION_LAYERS[1].tables) },
  { label: "Silver volume / mo", value: MEDALLION_LAYERS[1].volume },
  { label: "Gold tables", value: String(MEDALLION_LAYERS[2].tables) },
  { label: "Gold volume / mo", value: MEDALLION_LAYERS[2].volume },
];

const PERFORMANCE = [
  { metric: "Photon vs legacy runtime", value: "2.4x", note: "Silver conformance job" },
  { metric: "Z-ORDER scan reduction", value: "6.1x", note: "On customer_sk predicate" },
  { metric: "Cluster pool warm-start", value: "92%", note: "No cold-start on dbt run" },
  { metric: "Photon cost / task", value: "-31%", note: "vs non-Photon FY24" },
];

export function DatabricksPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Lakehouse — storage & compute"
        title="Databricks · Spark · Delta Lake · Medallion"
        description="Databricks is the engine room of the platform: PySpark + Spark SQL workloads, Delta Lake for ACID + time travel, and the Bronze→Silver→Gold medallion pattern as the canonical data flow. Photon runtime, cluster pools and Unity Catalogue keep it fast, cheap and governed."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Sparkles className="h-3 w-3" /> Photon</Badge>
            <Badge variant="outline" className="gap-1.5"><Boxes className="h-3 w-3" /> Medallion</Badge>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {MEDALLION_STATS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} />
        ))}
      </div>

      {/* Medallion */}
      <SectionCard
        title="Medallion architecture — Bronze · Silver · Gold"
        description="Each layer has a single responsibility. The flow is unidirectional and idempotent — re-running a Silver job for a date partition never rewrites history unless explicitly versioned."
        icon={<Layers className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/60">
          {MEDALLION_LAYERS.map((l) => {
            const tone =
              l.layer === "Bronze"
                ? "border-amber-500/40 bg-amber-500/6"
                : l.layer === "Silver"
                ? "border-violet-500/40 bg-violet-500/6"
                : "border-emerald-500/40 bg-emerald-500/6";
            return (
              <div key={l.layer} className={`p-5 ${tone}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{
                      background:
                        l.layer === "Bronze" ? "var(--chart-2)" : l.layer === "Silver" ? "var(--chart-3)" : "var(--chart-1)",
                    }}
                  />
                  <p className="text-lg font-semibold">{l.layer}</p>
                  <Badge variant="outline" className="ml-auto text-[10px]">{l.tables} tables</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{l.purpose}</p>
                <dl className="text-xs space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Location</dt>
                    <dd className="font-mono break-all text-right">{l.location}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Format</dt>
                    <dd className="font-mono">{l.format}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Volume</dt>
                    <dd className="font-mono">{l.volume}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Pipeline</dt>
                    <dd className="font-mono text-right">{l.pipelines}</dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* PySpark DLT */}
      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard
          title="PySpark DLT — Silver customer conformance"
          description="Delta Live Tables with expectations. PII rows go to a quarantine table; non-PII conformance is reproducible and idempotent."
          icon={<Workflow className="h-5 w-5" />}
          badge="PySpark + DLT"
        >
          <CodeBlock code={PYSPARK_BRONZE} language="python" filename="silver/customer_conform.py" highlight={[15, 16, 17, 18, 19, 20, 21, 22, 23, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43]} />
        </SectionCard>

        <SectionCard
          title="Delta Lake + Spark SQL — Bronze→Silver"
          description="Plain SQL for ad-hoc investigations and to materialise hot Silver tables with Z-ORDER + CDF + retention."
          icon={<Database className="h-5 w-5" />}
          badge="Spark SQL"
        >
          <CodeBlock code={DELTA_SQL} language="sql" filename="silver_order_line.sql" highlight={[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 37, 40, 41]} />
        </SectionCard>
      </div>

      {/* Cluster config + performance */}
      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard
          title="Cluster policy — transform_gold"
          description="Provisioned via Databricks asset bundles from Git. Photon + enhanced autoscaler + cluster pools keep startup latency under 30s and cost predictable."
          icon={<Cpu className="h-5 w-5" />}
          badge="Asset bundle"
        >
          <CodeBlock code={PHOTON_CFG} language="yaml" filename="databricks.yml" highlight={[7, 8, 9, 10, 13, 14, 15, 16, 17, 18, 19, 20]} />
        </SectionCard>

        <SectionCard
          title="Performance lift (synthetic)"
          description="Photon + Z-ORDER + cluster pools combined drove a 2.4× runtime reduction and 31% cost-per-task reduction YoY."
          icon={<Activity className="h-5 w-5" />}
          badge="Synthetic"
          contentClassName="p-0"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Metric</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Lift</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Note</th>
              </tr>
            </thead>
            <tbody>
              {PERFORMANCE.map((p) => (
                <tr key={p.metric} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-2.5">{p.metric}</td>
                  <td className="px-4 py-2.5 font-mono font-semibold text-emerald-600 dark:text-emerald-400">{p.value}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>

      {/* Integrations */}
      <div className="grid md:grid-cols-3 gap-4">
        <SectionCard title="Integrations" icon={<GitBranch className="h-5 w-5" />}>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>• Snowflake: Delta → Snowflake auto-ingest via manifest</li>
            <li>• dbt: runs on Databricks SQL warehouse for Gold transforms</li>
            <li>• Airflow: <InlineCode>DatabricksSubmitRunOperator</InlineCode></li>
            <li>• Power BI: Direct Lake connector to Silver/Gold Delta</li>
            <li>• MLflow + Feature Store for offline + online features</li>
          </ul>
        </SectionCard>
        <SectionCard title="Governance" icon={<ShieldCheck className="h-5 w-5" />}>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>• Unity Catalogue: column-level RBAC</li>
            <li>• PII tags auto-applied from dbt YAML</li>
            <li>• Dynamic view redaction for sensitive columns</li>
            <li>• Audit log streamed to Datadog</li>
            <li>• Immuta policy enforcement layer</li>
          </ul>
        </SectionCard>
        <SectionCard title="Operational excellence" icon={<Cpu className="h-5 w-5" />}>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>• DLT pipelines: declared quality (bronze/silver/gold)</li>
            <li>• Cluster pools reuse executor nodes (warm-start)</li>
            <li>• Z-ORDER nightly on top-10 hot Silver tables</li>
            <li>• VACUUM + retention scheduled via Airflow</li>
            <li>• Cost-per-task tagged in cluster policy</li>
          </ul>
        </SectionCard>
      </div>
      {/* Multi-language samples: 5 idioms for the same Silver conformance */}
      <SectionCard
        title="Multi-language: 5 idioms for Silver customer conformance"
        description="PySpark (default) · Scala (type-safe performant) · Rust (vectorised UDF) · Elixir (real-time streaming) · C (Arrow native). Click to open the drawer — keeps the page lightweight."
        icon={<Languages className="h-5 w-5" />}
        badge="5 languages · drawer"
      >
        <MultiLangSamples
          drawerMode
          drawerButtonLabel="View 5-language Silver conformance implementations"
          title="Silver customer conformance — 5 idiomatic implementations"
          description="The same MERGE logic in 5 languages. PySpark = analytics default. Scala = type-safe performant. Rust = vectorised UDF. Elixir = real-time streaming via Broadway + BEAM. C = Arrow native UDF."
          samples={[
            {
              language: "python",
              filename: "silver_customer.py",
              note: "PySpark DLT — the default for analytics engineers. Reads from streams, MERGEs on customer_sk. Compiles to JVM bytecode via Py4J bridge.",
              code: `import dlt
from pyspark.sql.functions import col, md5, concat_ws, when, lit, current_timestamp

@dlt.table(name="silver.customer", partition_cols=["region_code"])
@dlt.expect_or_drop("email_not_null", "customer_email IS NOT NULL")
def silver_customer():
    return (
        spark.readStream.format("delta")
        .load("/mnt/bronze/salesforce/account")
        .withColumn("customer_email_hash", md5(col("customer_email")))
        .withColumn("customer_sk", md5(concat_ws("||", col("customer_email_hash"), col("loaded_at"))))
        .withColumn("is_active", when(col("status") == "ACTIVE", lit(True)).otherwise(lit(False)))
    )`,
              highlight: [4, 5, 6, 7, 8, 9, 10, 11],
            },
            {
              language: "scala",
              filename: "SilverCustomerConformance.scala",
              note: "Scala Spark — type-safe, ~15% faster than PySpark on the same cluster. JVM-native; compiles to bytecode. Used for performance-critical batch jobs.",
              code: `package com.moderndatascieng.silver

import org.apache.spark.sql.functions._
import org.apache.spark.sql.expressions.Window
import org.apache.spark.sql.{DataFrame, SaveMode, SparkSession}

object SilverCustomerConformance {
  def transform(src: DataFrame)(implicit spark: SparkSession): DataFrame = {
    import spark.implicits._
    src
      .withColumn("customer_email_hash", md5(lower($"customer_email")))
      .withColumn("customer_sk", md5(concat_ws("||", $"customer_email_hash", $"loaded_at")))
      .withColumn("is_active", when($"status" === "ACTIVE", lit(true)).otherwise(lit(false)))
      .withColumn("loaded_at", current_timestamp())
      .dropDuplicates("customer_email_hash", $"loaded_at")
  }

  def merge(target: String, src: DataFrame)(implicit spark: SparkSession): Unit = {
    spark.sql(s"""
      MERGE INTO $target AS t
      USING src AS s
        ON t.customer_sk = s.customer_sk
      WHEN MATCHED AND s.loaded_at > t.loaded_at THEN UPDATE SET *
      WHEN NOT MATCHED THEN INSERT *
    """)
  }
}`,
              highlight: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
            },
            {
              language: "rust",
              filename: "pii_redact_udf.rs",
              note: "Rust UDF — vectorised regex PII redaction. ~10× faster than SQL UDFs, ~3× faster than Python UDFs. Compiles to Wasm for portability + native for max perf.",
              code: `// Snowflake external function — Rust implementation
// Reads a column of strings, redacts PII patterns (SSN, card, email)

use regex::Regex;

#[no_mangle]
pub extern "C" fn redact_pii(input: &str) -> String {
    let ssn = Regex::new(r"\b\d{3}-\d{2}-\d{4}\b").unwrap();
    let card = Regex::new(r"\b\d{16,19}\b").unwrap();
    let email = Regex::new(r"\b[A-Z][a-z]+@[a-z]+\.(com|org|net)\b").unwrap();

    let mut out = input.to_string();
    out = ssn.replace_all(&out, "[REDACTED-SSN]").to_string();
    out = card.replace_all(&out, "[REDACTED-CARD]").to_string();
    out = email.replace_all(&out, "[REDACTED-EMAIL]").to_string();
    out
}

// Compile: cargo build --release --target wasm32-wasi
// Deploy: Snowflake External Function via API Gateway + Lambda
`,
              highlight: [7, 8, 9, 12, 13, 14, 15, 16, 17],
            },
            {
              language: "elixir",
              filename: "silver_customer_conform.ex",
              note: "Elixir + BroadwayKafka — real-time streaming with back-pressure via the BEAM VM. Discord + WhatsApp use this for high-concurrency pipelines. Compiles to .beam bytecode.",
              code: `defmodule ModernDataSciEng.SilverCustomerConform do
  @moduledoc """
  Broadway pipeline: Kafka Bronze events -> Silver conformed table.
  Uses BroadwayKafka for back-pressure + concurrent processing.
  The BEAM VM gives us ~1M concurrent lightweight processes per node.
  """
  use Broadway

  alias BroadwayKafka.Producer
  alias ModernDataSciEng.{Customer, Repo}

  @impl true
  def start_link(opts \\\\ []) do
    Broadway.start_link(__MODULE__,
      name: __MODULE__,
      producer: [
        module: {Producer, [
          hosts: [{"broker-1", 9092}],
          group_id: "silver-conform-service",
          topics: ["bronze.customer"],
        ]},
        concurrency: 4,
      ],
      processors: [
        default: [concurrency: 100, max_demand: 50],
      ],
      batchers: [
        default: [concurrency: 10, batch_size: 1000, batch_timeout: 5000],
      ],
    )
  end

  @impl true
  def handle_message(_, message, _) do
    # Decode Avro payload
    {:ok, customer_event} = :avro.decode(message.data, schema_name: "Customer")

    # Conform: generate surrogate key, normalise, dedupe
    customer_sk =
      :crypto.hash(:md5, "\#{customer_event.email_hash}|\#{customer_event.loaded_at}")
      |> Base.encode16(case: :lower)

    conformed = %{
      customer_sk: customer_sk,
      customer_id: customer_event.customer_id,
      email_hash: customer_event.email_hash,
      is_active: customer_event.status == "ACTIVE",
      region_code: customer_event.region || "UNKNOWN",
      loaded_at: DateTime.utc_now(),
    }

    # Idempotent upsert via Ecto (Postgres wire)
    Repo.insert_all(Customer, [conformed],
      on_conflict: {:replace, [:is_active, :region_code, :loaded_at]},
      conflict_target: :customer_sk,
    )

    message
  end

  @impl true
  def handle_batch(_, messages, _, _) do
    # Batch write to Delta via JDBC
    rows = Enum.map(messages, & &1.data)
    :delta_writer.write("s3://silver/customer", rows)
    :ok
  end
end

# File types: .ex (source), .beam (compiled bytecode), .ez (release archive)
# Run: mix run -e ModernDataSciEng.SilverCustomerConform.start_link()`,
              highlight: [11, 12, 13, 14, 15, 16, 17, 18, 19, 28, 29, 30, 31, 32, 33, 47, 48, 49, 50, 51],
            },
            {
              language: "c",
              filename: "vectorised_email_hash.c",
              note: "C + Apache Arrow C++ — vectorised column processing at the native layer. Most high-level APIs (DuckDB, Polars, Pandas) eventually call into C/C++ here. Compiles to .so shared library.",
              code: `// ============================================================
// Apache Arrow C UDF — vectorised email hashing for PII redaction
// Process a whole column at once (vectorised) — 10x faster than row-by-row
// Compiles to a shared lib loadable by DuckDB / Postgres / Polars
// ============================================================
#include <arrow/c/abi.h>
#include <openssl/md5.h>
#include <string.h>
#include <stdint.h>

// Arrow C Data Interface (ABI-stable across languages)
// The same function is callable from Python, Rust, Go, Java via Arrow C-ABI
int vectorised_email_hash(
    struct ArrowArray* input_column,   // input: strings
    struct ArrowArray* output_column,  // output: fixed-size binary (16 bytes MD5)
    int64_t length
) {
    if (input_column->n_buffers < 3) return -1;

    const int32_t* offsets = (const int32_t*) input_column->buffers[1];
    const char* data = (const char*) input_column->buffers[2];

    // Allocate output buffer (16 bytes per row for MD5)
    uint8_t* out = (uint8_t*) output_column->buffers[1];

    for (int64_t i = 0; i < length; i++) {
        int32_t start = offsets[i];
        int32_t end = offsets[i + 1];
        size_t len = (size_t)(end - start);

        // Compute MD5 of the email string (OpenSSL)
        MD5((const unsigned char*)(data + start), len, out + (i * 16));
    }

    return 0;  // success
}

// Compile: gcc -O3 -shared -fPIC -o email_hash_udf.so email_hash_udf.c \\
//          -I/usr/include/arrow -lcrypto
// Load in DuckDB:  INSTALL 'email_hash_udf.so';
//                  CREATE MACRO email_hash(col) AS udf_vectorised_email_hash(col);
// Load in Postgres: CREATE FUNCTION email_hash(text) RETURNS bytea \\
//                   AS 'email_hash_udf.so', 'vectorised_email_hash' LANGUAGE C;`,
              highlight: [9, 10, 11, 12, 13, 15, 16, 17, 20, 21, 22, 23, 28, 29, 30, 31, 32],
            },
          ]}
        />
      </SectionCard>

      {/* Pyodide — Delta MERGE syntax validator */}
      <SectionCard
        title="Try it: Delta MERGE syntax validator (Pyodide)"
        description="Validates that a MERGE statement has all required clauses (MERGE INTO, USING, ON, WHEN MATCHED, WHEN NOT MATCHED). Pure Python regex — runs in browser."
        icon={<Terminal className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner
          code={`import re\n\nmerge_sql = \"\"\"\nMERGE INTO silver.order_line AS t\nUSING (\n  SELECT order_id, customer_sk, product_sk, order_date_sk, qty, net_amount\n  FROM bronze.shopify.order_line_raw\n  WHERE loaded_at > (SELECT COALESCE(MAX(loaded_at), '1970-01-01') FROM silver.order_line)\n) AS s\nON t.order_line_id = s.order_line_id\nWHEN MATCHED AND s.loaded_at > t.loaded_at THEN UPDATE SET *\nWHEN NOT MATCHED THEN INSERT *\n\"\"\"\n\nrequired_clauses = {\n    \"MERGE INTO\": \"target table\",\n    \"USING\": \"source data\",\n    \"ON\": \"join condition\",\n    \"WHEN MATCHED\": \"update clause\",\n    \"WHEN NOT MATCHED\": \"insert clause\",\n}\n\nissues = []\nfor clause, desc in required_clauses.items():\n    if clause in merge_sql:\n        print(f\"\\u2713 Found '{clause}' \u2014 {desc}\")\n    else:\n        issues.append(f\"\\u26a0 Missing '{clause}' \u2014 {desc}\")\n\nif re.search(r'\\bAS \\w+', merge_sql):\n    print(\"\\u2713 Table aliases found (AS t / AS s)\")\nif \"UPDATE SET\" in merge_sql:\n    print(\"\\u2713 UPDATE SET found\")\nif \"INSERT\" in merge_sql:\n    print(\"\\u2713 INSERT found\")\n\nprint()\nprint(\"=\" * 60)\nif issues:\n    print(\"MERGE SYNTAX ISSUES:\")\n    for i in issues: print(f\"  {i}\")\n    print(f\"\\\\n{len(issues)} issue(s) found.\")\nelse:\n    print(\"\\u2713 MERGE statement is valid \u2014 all required clauses present.\")\n    print(\"  Safe to deploy as idempotent Silver conformance.\")\nprint(\"=\" * 60)`}
          buttonLabel="Run MERGE validator (Pyodide)"
        />
      </SectionCard>

      {/* WasmRunner — Rust/C compiled to Wasm (executable) */}
      <SectionCard
        title="Try it: Rust/C code compiled to WebAssembly"
        description="The Rust UDF + C Arrow UDF above, compiled to Wasm, would run in your browser. This demo uses a hand-assembled 41-byte Wasm binary that exports an `add` function — the pattern is the same for real Rust/C code compiled via `cargo build --target wasm32-wasi` or `emcc`."
        icon={<Terminal className="h-5 w-5" />}
        badge="Wasm · ADR-016"
      >
        <WasmRunner
          sourceLanguage="Rust/C → wasm32-wasi"
          buttonLabel="Run Wasm module (41 bytes)"
          description="In production: compile the Rust UDF above with `cargo build --target wasm32-wasi` and host the .wasm binary. The WasmRunner loads it via WebAssembly.instantiate() and calls the exported function — same pattern regardless of source language (Rust, C, Go, Elixir all compile to Wasm)."
        />
      </SectionCard>

      <DeeperThoughtSection pageTitle="Databricks">
        <DeeperThought title="Databricks IS Spark-as-a-service — and Spark IS functional programming at scale" connectedTo="ADR-001 (platform architecture)">
          <p>{"Spark's RDD/DataFrame model is functional: map, filter, reduce, groupBy — the SAME operations as Haskell/Scala collections. The difference: Spark distributes them across a cluster. A DataFrame IS a distributed collection. A groupBy IS a distributed hash-partition. The functional paradigm (immutability, lazy evaluation) IS the reason Spark is fault-tolerant: if a partition fails, recompute from the lineage DAG. Databricks wraps this in a managed service — but the math IS functional programming, distributed."}</p>
        </DeeperThought>
        <DeeperThought title="Photon IS Databricks' C++ rewrite of the Spark SQL engine — 10× faster" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"Spark's original SQL engine was written in Scala (JVM). Photon (2021) rewrites it in C++ for vectorised execution — 10× faster on the same hardware. The SQL IS the same; the execution engine is different. This IS the 'production patterns' fold in action: the tool (Spark SQL → Photon) changes, the math (relational algebra, Codd 1970) stays. When Photon is replaced by a GPU-native SQL engine in 2030, the SQL stays. The fold absorbs the change."}</p>
        </DeeperThought>
        <DeeperThought title="Delta Lake IS ACID transactions on Parquet — and it's open" connectedTo="ADR-013 (Delta Lake)">
          <p>{"Delta Lake adds a transaction log (_delta_log/) on top of Parquet files. The log IS an append-only sequence of JSON actions (Add, Remove, Commit). This IS the same event-sourcing pattern as Kafka's log — just for files instead of messages. The ACID guarantee comes from the log: read the log → determine which Parquet files are 'current' → read those files. The log IS the source of truth; the files are materialised views. Delta IS event-sourcing for data lakes."}</p>
        </DeeperThought>
        <DeeperThought title="The cluster park IS Databricks' cost-aware autoscaling — and it saves 19% YoY" connectedTo="ADR-001 (platform architecture)">
          <p>{"Databricks' cluster parks maintain a pool of pre-warmed clusters that autoscale based on workload. When a job starts, it grabs a pre-warmed cluster (no startup latency). When the job ends, the cluster returns to the pool (no teardown). This IS the same pattern as connection pooling in databases — but for Spark clusters. The 19% YoY cost reduction comes from avoiding cluster startup/teardown overhead. The pool IS the amortisation of cold-start cost."}</p>
        </DeeperThought>
        <DeeperThought title="Unity Catalog IS Databricks' answer to Snowflake's governance — and it's open" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"Unity Catalog centralises governance (ACLs, column-level masking, row-level filters) across all Databricks workspaces. This IS the same pattern as Snowflake's GRANT/REVOKE — but for Delta tables instead of Snowflake tables. The governance model IS RBAC (role-based access control) — the same model that every database since Oracle 7 (1992) has used. Unity Catalog IS the 'Production patterns' fold for governance — the pattern (RBAC) stays, the implementation (Unity vs Snowflake vs Lake Formation) changes."}</p>
        </DeeperThought>
      </DeeperThoughtSection>
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "Trace this topic's connections across the platform's math graph" }, { id: "snowflake" as const, reason: "Continue to snowflake — see also from this page" }, { id: "orchestration" as const, reason: "Continue to orchestration — see also from this page" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("snowflake")} className="text-sm text-primary hover:underline">
          → Continue to Snowflake serving
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("orchestration")} className="text-sm text-primary hover:underline">
          → or jump to Orchestration
        </Link>
      </div>
    </div>
  );
}
