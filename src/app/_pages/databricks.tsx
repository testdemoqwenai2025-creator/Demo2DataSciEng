"use client";

import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { MEDALLION_LAYERS } from "../_data/synthetic";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Boxes, Cpu, Layers, Workflow, Database, Sparkles, GitBranch, ShieldCheck, Activity } from "lucide-react";

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
LOCATION 's3://northwind-silver/sales/order_line'
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
