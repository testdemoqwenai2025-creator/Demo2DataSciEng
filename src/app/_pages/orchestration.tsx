"use client";

import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { PIPELINE_RUNS } from "../_data/synthetic";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Workflow, Activity, Clock, RefreshCw, ShieldCheck, AlertTriangle, Gauge } from "lucide-react";
import { OrchestrationCaseStudy } from "../_components/orchestration-case-study";
import { RelatedTopics } from "../_components/related-topics";

const AIRFLOW_DAG = `# ============================================================
# dags/gold_sales_mart_dag.py
# Bronze → Silver → Gold for the sales mart
# ============================================================
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.empty import EmptyOperator
from airflow.providers.snowflake.operators.snowflake import SnowflakeOperator
from airflow.providers.databricks.operators.databricks import (
    DatabricksSubmitRunOperator,
    DatabricksNotebookOperator,
)
from airflow.providers.fivetran.operators.fivetran import FivetranOperator

default_args = {
    "owner": "data_platform",
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "retry_exponential_backoff": True,
    "max_retry_delay": timedelta(minutes=30),
    "depends_on_past": False,
    "email_on_failure": True,
    "sla": timedelta(minutes=15),
}

with DAG(
    dag_id="gold_sales_mart",
    description="Bronze→Silver→Gold pipeline for sales mart + dbt run + Tableau refresh",
    schedule="0 1 * * *",            # daily at 01:00 UTC
    start_date=datetime(2024, 4, 1),
    catchup=False,
    max_active_runs=1,
    max_active_tasks=8,
    default_args=default_args,
    tags=["bronze","silver","gold","sales"],
    sla_miss_callback=lambda dag, task_list: alert_slamiss(dag, task_list),
    on_failure_callback=lambda ctx: page_oncall(ctx),
) as dag:

    bronze_ingest = FivetranOperator(
        task_id="bronze_fivetran_sync",
        connector_id="{{ var.value.fivetran_connectors.shopify }}",
        trigger_sync=True,
        wait_for_completion=True,
    )

    silver_conform = DatabricksSubmitRunOperator(
        task_id="silver_customer_conform",
        json={
            "cluster_spec": {"cluster_id": "{{ var.value.databricks.cluster_pools.transform_gold }}"},
            "notebook_task": {
                "notebook_path": "/production/silver/customer_conform",
                "base_parameters": {"date": "{{ ds }}"},
            },
        },
        idempotency_token="silver-customer-{{ ds }}",   # safe to retry
    )

    gold_dbt = SnowflakeOperator(
        task_id="gold_dbt_build",
        sql="SELECT dbt_build('sales_mart', target='prod')",
        snowflake_conn_id="snowflake_prod",
        warehouse="WH_DBT_TRANSFORM",
    )

    tableau_refresh = EmptyOperator(task_id="tableau_extract_refresh")

    hightouch_sync = EmptyOperator(task_id="hightouch_audiences")

    bronze_ingest >> silver_conform >> gold_dbt >> [tableau_refresh, hightouch_sync]
`;

const DAGSTER_ASSET = `# ============================================================
# dagster/repo.py — asset-based orchestration
# ============================================================
from dagster import (
    asset, Definitions, ScheduleDefinition,
    AssetSelection, define_asset_job, AssetGroup,
)
from dagster_snowflake import snowflake_resource
from dagster_databricks import databricks_step_decorator

@asset(
    key="bronze_shopify_orders",
    group_name="bronze",
    io_manager_key="bronze_io",
    metadata={"sla_minutes": 15, "owner": "data_platform"},
)
def bronze_shopify_orders(context, fivetran):
    """Append-only ingest from Shopify Plus. Idempotent via Fivetran connector_id."""
    return fivetran.sync_and_wait(connector_id="concert_harvey")

@asset(
    key="silver_customer_conformed",
    group_name="silver",
    deps=["bronze_shopify_orders", "bronze_sfdc_accounts"],
    io_manager_key="delta_io",
    metadata={"sla_minutes": 30, "owner": "data_platform"},
)
def silver_customer_conformed(context, bronze_shopify_orders, bronze_sfdc_accounts):
    """Deduplicated + conformed customer grain via Databricks DLT."""
    return databricks_step_decorator.run_notebook(
        notebook_path="/production/silver/customer_conform",
        params={"date": context.partition_time_window.start.strftime("%Y-%m-%d")},
    )

@asset(
    key="gold_fct_orders",
    group_name="gold",
    deps=["silver_customer_conformed", "silver_orders"],
    metadata={"sla_minutes": 9, "owner": "data_platform", "criticality": "gold"},
)
def gold_fct_orders(context, silver_customer_conformed, silver_orders):
    """dbt materialised table — the canonical sales fact."""
    return snowflake_resource.execute(
        sql="SELECT dbt_build('fct_orders', target='prod')",
        warehouse="WH_DBT_TRANSFORM",
    )

# Schedule + job
gold_sales_job = define_asset_job(
    "gold_sales_daily",
    selection=AssetSelection.groups("bronze", "silver", "gold"),
)

schedule = ScheduleDefinition(
    name="gold_sales_schedule",
    cron_schedule="0 1 * * *",
    job=gold_sales_job,
)

defs = Definitions(
    assets=[bronze_shopify_orders, silver_customer_conformed, gold_fct_orders],
    schedules=[schedule],
    resources={"fivetran": fivetran_resource, "snowflake": snowflake_resource},
)
`;

const SLAS = [
  { dag: "bronze_shopify_ingest", sla: "15 min", actual_p95: "9 min", status: "ok" },
  { dag: "silver_customer_conform", sla: "30 min", actual_p95: "21 min", status: "ok" },
  { dag: "silver_orders_conform", sla: "30 min", actual_p95: "26 min", status: "ok" },
  { dag: "gold_sales_mart", sla: "45 min", actual_p95: "38 min", status: "ok" },
  { dag: "gold_customer_segments", sla: "45 min", actual_p95: "47 min", status: "warn" },
  { dag: "ml_features_lifestyle_score", sla: "20 min", actual_p95: "18 min", status: "ok" },
];

export function OrchestrationPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Delivery — orchestration"
        title="Airflow (batch) + Dagster (asset-based)"
        description="Airflow drives the daily Bronze→Gold batch; Dagster treats every table as a typed asset with upstream dependencies and freshness sensors. Idempotent retries, SLA monitoring, exponential backoff and circuit-breakers keep the pipeline boring."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Clock className="h-3 w-3" /> SLA-aware</Badge>
            <Badge variant="outline" className="gap-1.5"><RefreshCw className="h-3 w-3" /> Idempotent</Badge>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Active DAGs" value="38" hint="across 6 DAG groups" />
        <KpiCard label="Daily runs" value="412" delta="+18% YoY" deltaTone="up" hint="batch + sensor" />
        <KpiCard label="Success rate (30d)" value="99.7%" delta="+1.2pp" deltaTone="up" hint="retries included" />
        <KpiCard label="Mean runtime (Gold)" value="38 min" delta="−27% vs FY24" deltaTone="up" hint="P95" />
      </div>

      {/* Recent runs */}
      <SectionCard
        title="Recent pipeline runs"
        description="Synthetic 24h snapshot — every run is observable in Airflow UI + Datadog."
        icon={<Activity className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Time</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">DAG</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Duration</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {PIPELINE_RUNS.map((r, i) => (
                <tr key={i} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs">{r.time}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{r.dag}</td>
                  <td className="px-4 py-2.5 font-mono text-xs tabular-nums">{r.duration}</td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant={r.status === "success" ? "default" : r.status === "warn" ? "outline" : "destructive"}
                      className={
                        r.status === "success"
                          ? "gap-1 bg-emerald-600 text-white hover:bg-emerald-600"
                          : r.status === "warn"
                          ? "gap-1 text-amber-600 border-amber-500/40"
                          : ""
                      }
                    >
                      {r.status === "success" ? "✓" : r.status === "warn" ? "⚠" : "✕"} {r.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* SLA */}
      <SectionCard
        title="SLA monitoring matrix"
        description="Every DAG has a freshness SLA owned by the business. Breaches page on-call via PagerDuty and trigger an automated backfill when possible."
        icon={<Gauge className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">DAG</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">SLA</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">P95 actual</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {SLAS.map((s) => (
                <tr key={s.dag} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs">{s.dag}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{s.sla}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{s.actual_p95}</td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant={s.status === "ok" ? "default" : "outline"}
                      className={
                        s.status === "ok"
                          ? "gap-1 bg-emerald-600 text-white hover:bg-emerald-600"
                          : "gap-1 text-amber-600 border-amber-500/40"
                      }
                    >
                      {s.status === "ok" ? "✓ within SLA" : "⚠ breach risk"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Airflow code */}
      <SectionCard
        title="Airflow DAG — gold_sales_mart"
        description="Bronze→Silver→Gold with idempotent retries, exponential backoff, SLA callbacks and circuit-breaker on_failure."
        icon={<Workflow className="h-5 w-5" />}
      >
        <CodeBlock code={AIRFLOW_DAG} language="python" filename="dags/gold_sales_mart_dag.py" highlight={[15, 16, 17, 18, 19, 20, 21, 22, 36, 37, 38, 53, 54, 55, 56, 57, 58, 60, 61, 62]} />
      </SectionCard>

      {/* Dagster */}
      <SectionCard
        title="Dagster asset graph — typed assets"
        description="Dagster treats every Bronze / Silver / Gold table as a typed asset with explicit upstream deps. The UI shows lineage natively; sensors trigger backfill on upstream delay."
        icon={<Workflow className="h-5 w-5" />}
      >
        <CodeBlock code={DAGSTER_ASSET} language="python" filename="dagster/repo.py" highlight={[14, 15, 16, 23, 24, 25, 33, 34, 35, 36, 37, 44, 45, 46, 47, 48, 49]} />
      </SectionCard>

      {/* Oper excellence */}
      <div className="grid md:grid-cols-3 gap-4">
        <SectionCard title="Idempotency & retries" icon={<RefreshCw className="h-5 w-5" />}>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>• <InlineCode>idempotency_token</InlineCode> per Databricks job — safe to retry</li>
            <li>• Snowflake MERGE on business keys — no duplicate inserts</li>
            <li>• Airflow retries 3× with exponential backoff</li>
            <li>• Dagster partitions by day — backfill is partition-scoped</li>
            <li>• Circuit-breaker: pause DAG after 5 consecutive failures</li>
          </ul>
        </SectionCard>
        <SectionCard title="Sensors & backfills" icon={<Activity className="h-5 w-5" />}>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>• Snowflake sensor on <InlineCode>bronze.shopify_orders</InlineCode> arrival</li>
            <li>• Fivetran webhook triggers Silver conform task</li>
            <li>• Partition-aware backfill UI in Airflow</li>
            <li>• Dagster declarative backfill: target asset + date range</li>
            <li>• Backfill cost preview before scheduling</li>
          </ul>
        </SectionCard>
        <SectionCard title="Alerts & on-call" icon={<AlertTriangle className="h-5 w-5" />}>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>• SLA miss → PagerDuty (P1) + Slack #data-platform</li>
            <li>• Run failure with retry exhaustion → P1</li>
            <li>• Anomalous runtime ({">3σ"}) → P2 ticket</li>
            <li>• Weekly SLO review: 99.7% success rate target</li>
            <li>• Monthly postmortem on every P1 with action items</li>
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title="Real-world case study — Airflow at Airbnb (3,000+ DAGs)"
        description="The world's largest Airflow deployment: 3,000+ DAGs, 100M+ task instances/year, 500+ K8s worker pods, 99.7% SLA. Airbnb created Airflow in 2015 (now Apache) — the de-facto standard for data orchestration. Animated pipeline viz (scheduler → executor → workers → metadata DB → UI → alerts), data toggle (real Airbnb stats vs synthetic task instances), Pyodide-runnable DAG scheduler simulation."
        icon={<Workflow className="h-5 w-5" />}
        badge="Case study"
      >
        <OrchestrationCaseStudy />
      </SectionCard>

      <RelatedTopics topics={[
        { id: "fivetran-hightouch" as const, reason: "Pipeline for ELT ingestion" },
        { id: "cicd" as const, reason: "CI/CD for DAG deployment" },
        { id: "governance" as const, reason: "DQ checks + lineage" },
        { id: "databricks" as const, reason: "Spark job orchestration" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("governance")} className="text-sm text-primary hover:underline">
          → Continue to Governance &amp; Observability
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("cicd")} className="text-sm text-primary hover:underline">
          → or jump to CI/CD &amp; DevOps
        </Link>
      </div>
    </div>
  );
}
