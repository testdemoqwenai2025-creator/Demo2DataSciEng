/**
 * Synthetic reference data for the ModernDataSciEng Retail Data Platform.
 *
 * All numbers, schemas, pipelines and dashboards below are HYPOTHETICAL and
 * synthetic — designed to illustrate the architecture, not to reflect any
 * real company. ModernDataSciEng Ltd. is a fictional omnichannel retailer.
 *
 * Headline business (synthetic):
 *   - 4.2M customers across 9 markets
 *   - 48k SKUs across 14 product categories
 *   - 11.8M orders / yr (web + POS + marketplace)
 *   - £612M gross revenue FY25
 */

export const COMPANY = {
  name: "ModernDataSciEng Ltd",
  tagline: "Omnichannel retail · 9 markets · 218 stores",
  fiscalYear: "FY25",
  started: "FY19",
} as const;

export const EXEC_KPIS = [
  { label: "Pipeline freshness (P95)", value: "9 min", delta: "-37% vs FY24", tone: "up" as const, hint: "Bronze→Gold SLA" },
  { label: "Data trust score", value: "98.4 / 100", delta: "+4.2pts", tone: "up" as const, hint: "DQ + observability" },
  { label: "Active governed datasets", value: "268", delta: "+54 YoY", tone: "up" as const, hint: "Unity Catalogue" },
  { label: "Self-service analysts", value: "312", delta: "+118 YoY", tone: "up" as const, hint: "Tableau + semantic" },
  { label: "Annual platform cost", value: "£2.8M", delta: "-19% / TB", tone: "up" as const, hint: "FinOps optimisation" },
  { label: "Data incidents (P0/P1)", value: "3", delta: "−71% vs FY24", tone: "up" as const, hint: "12-month rolling" },
];

/** Source systems onboarded via Fivetran */
export const SOURCE_SYSTEMS = [
  { name: "Shopify Plus", type: "E-commerce", records: "8.4M / mo", method: "ELT", freshness: "15 min" },
  { name: "Salesforce CRM", type: "CRM", records: "1.2M / mo", method: "ELT", freshness: "30 min" },
  { name: "Stripe", type: "Payments", records: "3.1M / mo", method: "ELT", freshness: "15 min" },
  { name: "NetSuite ERP", records: "920k / mo", type: "ERP", method: "ELT", freshness: "1 hr" },
  { name: "Klaviyo", type: "Marketing", records: "22M / mo", method: "ELT", freshness: "1 hr" },
  { name: "Zendesk", type: "Support", records: "440k / mo", method: "ELT", freshness: "1 hr" },
  { name: "Adobe Analytics", type: "Web events", records: "1.8B / mo", method: "ELT", freshness: "1 hr" },
  { name: "Meta Ads", type: "Advertising", records: "12M / mo", method: "ELT", freshness: "1 hr" },
  { name: "Google Ads", type: "Advertising", records: "9M / mo", method: "ELT", freshness: "1 hr" },
  { name: "SAP Ariba", type: "Procurement", records: "180k / mo", method: "ELT", freshness: "6 hr" },
  { name: "Workday HR", type: "HRIS", records: "62k / mo", method: "ELT", freshness: "6 hr" },
  { name: "POS (StoreNet)", type: "In-store", records: "6.7M / mo", method: "ELT", freshness: "5 min" },
  { name: "Snowplow Web", type: "Behavioural", records: "2.4B / mo", method: "ELT", freshness: "5 min" },
  { name: "Amazon SP-API", type: "Marketplace", records: "1.1M / mo", method: "ELT", freshness: "30 min" },
];

/** Reverse-ETL activations through Hightouch */
export const REVERSE_ETL_AUDIENCES = [
  { audience: "VIP loyalty tier (top 5%)", destination: "Salesforce", records: "210k", cadence: "Hourly", purpose: "Account team outreach" },
  { audience: "Cart abandoners (24h)", destination: "Klaviyo", records: "1.4M", cadence: "15 min", purpose: "Email retargeting" },
  { audience: "Lapsed customers (90d)", destination: "Meta Ads", records: "880k", cadence: "Hourly", purpose: "Lookalike seeding" },
  { audience: "High-return rate risk", destination: "Gorgias", records: "62k", cadence: "Daily", purpose: "Proactive support" },
  { audience: "B2B trade accounts", destination: "HubSpot", records: "8.4k", cadence: "Daily", purpose: "Account enrichment" },
];

/** Snowflake warehouses + RBAC */
export const SNOWFLAKE_WAREHOUSES = [
  { name: "WH_ANALYTICS_SMALL", size: "X-Small", autoscale: "1→4", suspends: "60s", monthly: "£11k", purpose: "BI ad-hoc queries" },
  { name: "WH_DBT_TRANSFORM", size: "Medium", autoscale: "1→8", suspends: "30s", monthly: "£28k", purpose: "dbt model materialisation" },
  { name: "WH_REPORTING", size: "Large", autoscale: "1→10", suspends: "60s", monthly: "£19k", purpose: "Tableau extract refresh" },
  { name: "WH_ML_FEATURES", size: "Large", autoscale: "2→12", suspends: "120s", monthly: "£23k", purpose: "Feature store + scoring" },
  { name: "WH_GOLD_SERVING", size: "X-Large", autoscale: "1→6", suspends: "30s", monthly: "£31k", purpose: "Reverse-ETL + API serving" },
];

export const SNOWFLAKE_RBAC = [
  { role: "SYSADMIN", grants: "MANAGE WAREHOUSES, DATABASES, SCHEMAS", members: "DATA_PLATFORM", type: "Functional" },
  { role: "TRANSFORMER", grants: "USAGE on RAW + ANALYTICS, CREATE TABLE on ANALYTICS", members: "dbt service user, DATA_ENGINEERS", type: "Application" },
  { role: "REPORTER", grants: "SELECT on ANALYTICS.* (grants)", members: "TABLEAU_SVC, ANALYSTS", type: "Application" },
  { role: "PII_READER", grants: "ROW-LEVEL POLICY + SELECT on DIM_CUSTOMER (masked)", members: "COMPLIANCE_OFFICERS", type: "Sensitive" },
  { role: "MARKETING_READER", grants: "SELECT on ANALYTICS.MARKETING_* + RLS region=UK", members: "MKT_ANALYSTS_UK", type: "Row-level" },
];

/** Medallion Bronze / Silver / Gold datasets */
export const MEDALLION_LAYERS = [
  {
    layer: "Bronze",
    purpose: "Raw ingest, append-only, schema-on-read",
    location: "s3://moderndatascieng-bronze/",
    format: "Delta (raw)",
    tables: 142,
    volume: "8.4 TB / mo",
    pipelines: "Fivetran + Snowplow + Kafka",
  },
  {
    layer: "Silver",
    purpose: "Conformed, deduplicated, validated, joined to dims",
    location: "s3://moderndatascieng-silver/",
    format: "Delta (managed, OPTIMISE every 2h)",
    tables: 86,
    volume: "3.1 TB / mo",
    pipelines: "PySpark + Delta MERGE",
  },
  {
    layer: "Gold",
    purpose: "Business-level aggregates, dimensional marts, ML features",
    location: "s3://moderndatascieng-gold/ + Snowflake SERVING",
    format: "Delta + Snowflake tables",
    tables: 54,
    volume: "0.6 TB / mo",
    pipelines: "dbt + PySpark + DLT",
  },
];

/** dbt project stats */
export const DBT_PROJECT = {
  models: 312,
  tests: 1184,
  macros: 47,
  sources: 14,
  snapshots: 12,
  exposures: 38,
  docsCoverage: "94%",
  ciMinutesPerRun: "4m 18s",
  freshPerRun: "12 min P50",
};

export const DBT_LAYERS = [
  { layer: "staging", count: 92, colour: "var(--chart-2)", desc: "1:1 with source, type-cast, renamed, lightly cleaned" },
  { layer: "intermediate", count: 78, colour: "var(--chart-3)", desc: "Joins, business logic, conformance, dedup" },
  { layer: "marts", count: 96, colour: "var(--chart-1)", desc: "Dimensional star schemas, fact + dim tables" },
  { layer: "serving", count: 46, colour: "var(--chart-4)", desc: "Flattened BI views, semantic entities" },
];

/** DAG schedule (Airflow / Dagster) */
export const PIPELINE_RUNS = [
  { time: "00:15", dag: "bronze_shopify_ingest", duration: "8m 12s", status: "success" },
  { time: "00:30", dag: "silver_customer_conform", duration: "14m 48s", status: "success" },
  { time: "01:00", dag: "silver_orders_conform", duration: "21m 03s", status: "success" },
  { time: "01:30", dag: "gold_sales_mart", duration: "9m 41s", status: "success" },
  { time: "02:00", dag: "dbt_run_analytics", duration: "12m 18s", status: "success" },
  { time: "02:30", dag: "tableau_extract_refresh", duration: "4m 55s", status: "success" },
  { time: "03:00", dag: "hightouch_sync_audiences", duration: "3m 27s", status: "success" },
  { time: "06:00", dag: "ml_features_lifestyle_score", duration: "17m 22s", status: "warn" },
];

/** Data quality rules */
export const DQ_RULES = [
  { table: "fct_orders", rule: "not_null(order_id)", severity: "error", coverage: "100%", result: "Pass" },
  { table: "fct_orders", rule: "relationships(order_id → stg_orders)", severity: "error", coverage: "100%", result: "Pass" },
  { table: "fct_orders", rule: "accepted_range(order_total > 0)", severity: "warn", coverage: "99.98%", result: "Pass" },
  { table: "fct_orders", rule: "freshness < 30m", severity: "error", coverage: "100%", result: "Pass" },
  { table: "dim_customer", rule: "unique(customer_sk)", severity: "error", coverage: "100%", result: "Pass" },
  { table: "dim_customer", rule: "not_null(email) where is_active", severity: "error", coverage: "99.4%", result: "Pass" },
  { table: "dim_customer", rule: "regex(email_pattern)", severity: "warn", coverage: "99.1%", result: "Pass" },
  { table: "fct_returns", rule: "business_rule(return_qty ≤ order_qty)", severity: "error", coverage: "100%", result: "1 violation" },
];

/** Observability signals */
export const OBSERVABILITY = [
  { signal: "Volume anomaly — stg_adobe_events", layer: "Bronze", severity: "warning", detected: "−38% vs 7d MA", action: "Auto-quarantine + on-call alert" },
  { signal: "Schema drift — NetSuite.Customers (column added: `vat_region`)", layer: "Bronze", severity: "info", detected: "New column", action: "Schema registry PR auto-created" },
  { signal: "Freshness breach — Shopify.orders (11 min late)", layer: "Bronze", severity: "warning", detected: "SLA 15m", action: "Backfill triggered via Fivetran API" },
  { signal: "DQ breach — fct_returns violation (1 row)", layer: "Gold", severity: "critical", detected: "qty > order_qty", action: "Row quarantined; ticket to ops" },
];

/** Unity Catalogue grants */
export const UNITY_GRANTS = [
  { principal: "data_engineers", object: "catalog.moderndatascieng_bronze", grants: "READ, WRITE", type: "Group" },
  { principal: "analysts_uk", object: "catalog.moderndatascieng_gold.sales", grants: "SELECT", type: "Group" },
  { principal: "dbt_service", object: "catalog.moderndatascieng_silver", grants: "USE, READ, WRITE", type: "Service Principal" },
  { principal: "compliance", object: "catalog.moderndatascieng_gold.sales.pii", grants: "SELECT (with tag PII=true)", type: "Group" },
  { principal: "ml_platform", object: "catalog.moderndatascieng_ml.features", grants: "READ, WRITE, CREATE MODEL", type: "Group" },
];

/** CI/CD pipelines */
export const PIPELINES = [
  { name: "dbt-ci.yml", trigger: "PR to main", steps: "lint → dbt parse → dbt deps → dbt build --select state:modified+ → dbt test", duration: "4m 18s", env: "dev" },
  { name: "terraform-apply.yml", trigger: "Push to main", steps: "tflint → terraform plan → terraform apply (dev → staging)", duration: "6m 02s", env: "dev→staging" },
  { name: "databricks-release.yml", trigger: "Tag v*", steps: "build wheel → Databricks asset bundle deploy (prod)", duration: "3m 41s", env: "prod" },
  { name: "promote-dbt-prod.yml", trigger: "Manual approval", steps: "dbt build --target prod → dbt docs generate → slack notify", duration: "11m 27s", env: "prod" },
  { name: "snowflake-migrate.yml", trigger: "Push to main", steps: "snowflake migrate apply (with change history)", duration: "1m 48s", env: "prod" },
];

/** Monthly revenue trend (synthetic) */
export const REVENUE_TREND = [
  { month: "Apr", revenue: 41.2, orders: 0.82, returns_pct: 6.4 },
  { month: "May", revenue: 44.8, orders: 0.91, returns_pct: 6.1 },
  { month: "Jun", revenue: 47.1, orders: 0.96, returns_pct: 5.9 },
  { month: "Jul", revenue: 49.6, orders: 1.02, returns_pct: 6.3 },
  { month: "Aug", revenue: 52.4, orders: 1.08, returns_pct: 6.0 },
  { month: "Sep", revenue: 56.1, orders: 1.13, returns_pct: 5.7 },
  { month: "Oct", revenue: 58.9, orders: 1.19, returns_pct: 5.5 },
  { month: "Nov", revenue: 64.2, orders: 1.34, returns_pct: 6.8 },
  { month: "Dec", revenue: 71.5, orders: 1.49, returns_pct: 7.2 },
  { month: "Jan", revenue: 49.3, orders: 0.99, returns_pct: 6.6 },
  { month: "Feb", revenue: 51.8, orders: 1.04, returns_pct: 6.2 },
  { month: "Mar", revenue: 54.7, orders: 1.11, returns_pct: 5.9 },
];

/** Channel mix (synthetic) */
export const CHANNEL_MIX = [
  { channel: "Web", share: 47, revenue: 287.6 },
  { channel: "In-store", share: 31, revenue: 189.7 },
  { channel: "Marketplace", share: 14, revenue: 85.7 },
  { channel: "Mobile app", share: 8, revenue: 49.0 },
];

/** Top customer segments by revenue */
export const CUSTOMER_SEGMENTS = [
  { segment: "VIP (top 5%)", customers: 210, revenue: 122.4, arpu: 582.9 },
  { segment: "Loyal (next 20%)", customers: 840, revenue: 168.3, arpu: 200.4 },
  { segment: "Active (mid 50%)", customers: 2100, revenue: 214.1, arpu: 102.0 },
  { segment: "Occasional", customers: 1050, revenue: 84.6, arpu: 80.6 },
];

/** Cost & utilisation snapshot (FinOps) */
export const FINOPS = [
  { area: "Databricks compute", fy24: 1.42, fy25: 1.18, trend: "-17%" },
  { area: "Snowflake credits", fy24: 0.96, fy25: 0.92, trend: "-4%" },
  { area: "Storage (S3 + Delta)", fy24: 0.31, fy25: 0.34, trend: "+10%" },
  { area: "Fivetran Mar", fy24: 0.18, fy25: 0.21, trend: "+17%" },
  { area: "Tableau + observability", fy24: 0.22, fy25: 0.18, trend: "-18%" },
];

/** Daily Bronze ingestion volume (synthetic) — TB / day */
export const DAILY_INGEST = Array.from({ length: 30 }, (_, i) => {
  const base = 0.27 + (Math.sin(i / 3) + 1) * 0.06;
  const noise = (Math.random() - 0.5) * 0.018;
  return {
    day: `D${i + 1}`,
    tb: Math.round((base + noise) * 1000) / 1000,
  };
});

// ============================================================
// Knowledge Hub — Architecture Decision Records (ADRs)
// ============================================================
export interface ADR {
  id: string;
  title: string;
  status: "accepted" | "proposed" | "deprecated" | "superseded";
  date: string;
  deciders: string;
  context: string;
  decision: string;
  consequences: string;
  alternatives: string[];
  tags: string[];
}

export const ADRS: ADR[] = [
  {
    id: "ADR-001",
    title: "Adopt Lakehouse (Delta + Databricks) over Data Warehouse",
    status: "accepted",
    date: "FY23-Q1",
    deciders: "Data Platform, Architecture, Finance",
    context:
      "Needed a single platform for BI + ML, ACID guarantees, schema evolution, and cost control at 8TB/mo growth. Pure warehouse (Snowflake-only) was expensive for ML feature engineering; pure data lake (S3+Presto) lacked ACID + BI performance.",
    decision:
      "Adopt Databricks Lakehouse with Delta Lake as the primary storage for Bronze/Silver; Snowflake as the BI serving layer only.",
    consequences:
      "+ Single open format (Delta) avoids lock-in. + ML + BI on same data. + 19% cost/TB reduction YoY. − Two platforms to operate. − Photon runtime adds complexity.",
    alternatives: ["Snowflake-only", "BigQuery + GCS", "Pure S3 + Trino"],
    tags: ["storage", "lakehouse", "delta", "databricks"],
  },
  {
    id: "ADR-002",
    title: "Medallion (Bronze/Silver/Gold) over single-layer transforms",
    status: "accepted",
    date: "FY23-Q2",
    deciders: "Data Platform, Analytics Engineering",
    context:
      "Single-layer transform pipelines were hard to debug, hard to rerun safely, and impossible to reason about lineage.",
    decision:
      "Adopt the Medallion pattern: Bronze (append-only raw), Silver (conformed, MERGE), Gold (dimensional marts). Each layer has a single responsibility.",
    consequences:
      "+ Idempotent re-runs. + Clear lineage. + Layer-specific cost optimisation. − More tables to maintain. − Strict conventions required.",
    alternatives: ["Single transform layer", "ELT-on-read (no materialisation)"],
    tags: ["architecture", "medallion", "patterns"],
  },
  {
    id: "ADR-003",
    title: "dbt for transformation, not Databricks SQL notebooks",
    status: "accepted",
    date: "FY23-Q2",
    deciders: "Analytics Engineering",
    context:
      "Databricks SQL notebooks gave us compute but no testing, no lineage, no docs, no CI.",
    decision:
      "Standardise on dbt for all Gold-layer transforms + Silver/Gold conformance logic. Databricks remains for PySpark/ML.",
    consequences:
      "+ 1,184 tests + docs + slim CI. + State-aware model promotion. − Two transformation tools (dbt + PySpark DLT). − dbt Cloud adds subscription cost.",
    alternatives: ["Databricks SQL only", "Dataform", "Pure PySpark"],
    tags: ["transformation", "dbt", "patterns"],
  },
  {
    id: "ADR-004",
    title: "Snowflake RLS via session context, not view per role",
    status: "accepted",
    date: "FY23-Q3",
    deciders: "Data Platform, Security",
    context:
      "Original design had one view per role per region — 9 markets × 12 roles = 108 views. Unmanageable.",
    decision:
      "Single SECURE VIEW + SESSION_CONTEXT('ROW_ACCESS_REGION') function. SSO attributes drive the session context.",
    consequences:
      "+ 1 view instead of 108. + Region scope enforced at the warehouse. − Debugging RLS requires impersonation tooling. − Snowflake-specific (not portable to BigQuery without adaptation).",
    alternatives: ["One view per role", "Application-layer filtering", "Cryo-filtering in BI"],
    tags: ["security", "snowflake", "rls", "governance"],
  },
  {
    id: "ADR-005",
    title: "Unity Catalogue over Immuta for PII governance",
    status: "accepted",
    date: "FY23-Q4",
    deciders: "Data Platform, Compliance, DPO",
    context:
      "Needed column-level RBAC, PII tagging, dynamic views, audit. Immuta is feature-rich but adds a separate control plane.",
    decision:
      "Adopt Unity Catalogue as the primary governance plane. Keep Immuta only for policy-as-code where Unity lacks features.",
    consequences:
      "+ Native to Databricks (no separate service). + Single audit log. + Open API. − Immuta had richer policy DSL. − Migration cost from old approach.",
    alternatives: ["Immuta-only", "Apache Ranger", "Pure SQL grants"],
    tags: ["governance", "unity", "pii", "databricks"],
  },
  {
    id: "ADR-006",
    title: "Trunk-based Git over GitFlow for data changes",
    status: "accepted",
    date: "FY24-Q1",
    deciders: "Data Platform, DevOps",
    context:
      "GitFlow long-lived release branches caused merge hell for dbt model changes. CI runtime on full dbt build was 14m.",
    decision:
      "Trunk-based + short-lived feature branches + dbt slim CI (state:modified+) + daily staging run.",
    consequences:
      "+ CI runtime 14m → 4m. + PR-to-prod median 2h 11m. + Cleaner history. − Requires discipline (small PRs). − Feature flags needed for risky changes.",
    alternatives: ["GitFlow", "GitHub Flow (long branches)", "Trunk + release branches"],
    tags: ["devops", "git", "ci", "patterns"],
  },
  {
    id: "ADR-007",
    title: "Fivetran for managed ELT, not custom Airbyte",
    status: "accepted",
    date: "FY24-Q2",
    deciders: "Data Platform, Source System Owners",
    context:
      "14 source systems, only 2 engineers. Custom Airbyte connectors would require maintenance burden.",
    decision:
      "Fivetran for managed ELT ingestion. Schema-on-read into Bronze. Schema drift handled via schema-registry PRs.",
    consequences:
      "+ 14 sources onboarded in 6 months. + Maintenance burden offloaded. + Schema drift PRs. − Vendor lock-in for connector availability. − Cost scales with rows.",
    alternatives: ["Airbyte OSS", "Custom Python + Airflow", "Stitch"],
    tags: ["ingestion", "fivetran", "patterns"],
  },
  {
    id: "ADR-008",
    title: "Hightouch for reverse-ETL, not custom sync scripts",
    status: "accepted",
    date: "FY24-Q3",
    deciders: "Data Platform, Marketing Ops",
    context:
      "Salesforce, Klaviyo, Meta Ads audiences were maintained manually by marketing ops. Errors, staleness, no audit.",
    decision:
      "Hightouch with SQL models in Snowflake. Audiences versioned in Git. PII auto-masked.",
    consequences:
      "+ 5 governed audiences. + Audit trail. + PII masking. + Marketing self-service. − Hightouch adds another subscription. − SQL model ownership needs governance.",
    alternatives: ["Custom Python sync", "Census", "Manual CSV uploads"],
    tags: ["reverse-etl", "hightouch", "patterns"],
  },
  {
    id: "ADR-009",
    title: "MetricFlow semantic layer over hand-rolled metrics views",
    status: "accepted",
    date: "FY24-Q4",
    deciders: "Analytics Engineering",
    context:
      "Every BI tool had its own metric definitions; revenue in Tableau ≠ revenue in Looker ≠ revenue in Hightouch.",
    decision:
      "Adopt dbt MetricFlow as the single metric definition layer. Tableau + Hightouch both read from it.",
    consequences:
      "+ Single source of truth for metrics. + Metric changes reviewable in Git. − Limited MetricFlow maturity at the time. − Some complex metrics still need SQL escape hatches.",
    alternatives: ["Cube.js", "Looker semantic model", "Hand-rolled views"],
    tags: ["semantic", "dbt", "metrics", "patterns"],
  },
  {
    id: "ADR-010",
    title: "Airflow + Dagster hybrid (not either/or)",
    status: "proposed",
    date: "FY25-Q1",
    deciders: "Data Platform",
    context:
      "Airflow has better ecosystem + operators; Dagster has better asset graph + lineage. Neither alone is perfect.",
    decision:
      "Airflow for batch schedules (DAGs). Dagster for asset-backed + partition-aware workloads (Silver/Gold). Both run in parallel during FY25.",
    consequences:
      "+ Best-of-breed. + Dagster lineage is native. − Two orchestration systems to learn. − Migration path is fuzzy.",
    alternatives: ["Airflow only", "Dagster only", "Prefect"],
    tags: ["orchestration", "airflow", "dagster", "patterns"],
  },
  {
    id: "ADR-011",
    title: "Photon runtime for all Silver/Gold PySpark jobs",
    status: "accepted",
    date: "FY24-Q4",
    deciders: "Data Platform, FinOps",
    context:
      "Silver conformance jobs were the largest cost centre. Performance was acceptable but expensive.",
    decision:
      "Enable Photon on the transform_gold cluster policy for all Silver/Gold PySpark jobs. Measure cost-per-task before/after.",
    consequences:
      "+ 2.4× faster Silver conformance. + 31% cost-per-task reduction. − Photon adds DBU cost; right-size carefully.",
    alternatives: ["Standard runtime", "AWS EMR Spark", "Trino on EKS"],
    tags: ["databricks", "performance", "finops", "patterns"],
  },
  {
    id: "ADR-012",
    title: "OpenLineage over proprietary lineage APIs",
    status: "accepted",
    date: "FY25-Q2",
    deciders: "Data Platform, Governance",
    context:
      "Snowflake, Databricks, dbt each have their own lineage APIs. No unified view; impact analysis was manual.",
    decision:
      "Standardise on OpenLineage events emitted by all tools. Marquez as the lineage API + UI.",
    consequences:
      "+ Vendor-neutral lineage. + 'Who broke this?' investigation in seconds. + Future-proof for new tools. − Marquez UI is basic. − Some tools need adapters.",
    alternatives: ["Each vendor's API separately", "Atlan", "Monte Carlo lineage only"],
    tags: ["governance", "lineage", "openlineage", "patterns"],
  },
  {
    id: "ADR-013",
    title: "Commit to Apache Iceberg as the platform's primary open table format",
    status: "accepted",
    date: "FY26-Q3",
    deciders: "Data Platform, Architecture, Storage",
    context:
      "ADR-001 (FY23-Q1) implicitly chose Delta by adopting Databricks + Delta Lake. Three years on, the open table format landscape has consolidated: Delta, Iceberg, Hudi all serve similar needs but differ in vendor-neutrality. With the platform now serving Snowflake, BigQuery, Databricks, DuckDB and Trino as compute engines, the cost of Delta-lock-in (less mature off-Databricks) is growing. The Unity Catalogue spec, OneTable (Hudi/Iceberg/Delta interop), and Snowflake's Polaris Catalog have made Iceberg the de facto vendor-neutral choice.",
    decision:
      "Adopt Apache Iceberg as the platform's primary open table format for all new tables in Bronze + Silver. Delta remains the default on Databricks-only workloads (where it's more native), with UniForm enabled to expose Delta tables as Iceberg for cross-engine reads. Hudi is held — only consider for CDC-heavy upsert pipelines that can't be served by Iceberg merge-on-read.",
    consequences:
      "+ Vendor-neutral; same table readable by Spark, Trino, Flink, Athena, BigQuery, Snowflake, DuckDB. + Mature spec (v2 with row-level deletes). + Avoids Databricks lock-in. + Future-proof — Snowflake Polaris + Glue + Nessie catalogs all support it. − Delta is more native on Databricks (Photon optimisations). − Migration cost from existing Delta tables (use UniForm to expose as Iceberg without rewriting). − Iceberg merge-on-read deletes are less mature than Delta's. − Catalog choice (Nessie vs REST vs Glue) is a follow-on decision.",
    alternatives: [
      "Stay on Delta (Databricks-lock-in risk grows)",
      "Migrate to Hudi (CDC-first, smaller ecosystem)",
      "Polyglot — keep all three (operational complexity too high)",
    ],
    tags: ["storage", "table-format", "iceberg", "delta", "patterns"],
  },
  {
    id: "ADR-014",
    title: "Adopt DuckDB as the platform's CI + local analytical engine",
    status: "accepted",
    date: "FY26-Q4",
    deciders: "Data Platform, Analytics Engineering, DevOps",
    context:
      "ADR-013 committed to Iceberg as the primary table format. CI tests for dbt models + Iceberg tables need a local execution engine — running every CI test against Snowflake/Databricks burns credits for what should be free. DuckDB reads Iceberg natively (via the iceberg extension), runs on any laptop/CI runner without a server, and is 100% OSS. The 'just open a Parquet/Iceberg file' pattern means CI can test transforms on a sample of real data in seconds, not minutes.",
    decision:
      "Adopt DuckDB as the platform's CI + local analytical engine. All dbt model tests in CI run on DuckDB first (fast, free, local). Only promote to Snowflake/Databricks staging after DuckDB CI passes. Local development uses DuckDB for ad-hoc analytics — analysts query Parquet/Iceberg files directly without provisioning a warehouse. MotherDuck is the managed option when shared access is needed.",
    consequences:
      "+ CI costs drop ~90% (no warehouse credits for tests). + Local dev is instant (no server to start). + DuckDB reads Iceberg natively — no format conversion. + Analysts prototype before promoting to warehouse. − DuckDB SQL dialect differs slightly from Snowflake (functions, types). − Single-node limits (~1TB per query). − Not all Snowflake features (dynamic RLS via session context, secure views) are testable in DuckDB.",
    alternatives: [
      "Keep running CI tests on Snowflake (expensive, slow)",
      "Use SQLite for CI (no Parquet/Iceberg support, row-based)",
      "Use Postgres for CI (server overhead, no columnar perf)",
    ],
    tags: ["ci", "duckdb", "testing", "patterns", "local-dev"],
  },
  {
    id: "ADR-015",
    title: "Adopt Pyodide + WebAssembly as the platform's in-browser execution runtime",
    status: "accepted",
    date: "FY26-Q4",
    deciders: "Data Platform, Frontend, Developer Experience",
    context:
      "ADR-014 adopted DuckDB for CI + local analytics. But the public GitHub Pages preview is a static site — no backend, no DuckDB binary, no server-side execution. Users browsing the platform can't run code samples without installing Python + DuckDB locally. The move from 'documentation' to 'platform' requires in-browser execution: code samples that actually run when users click 'Run'.",
    decision:
      "Adopt Pyodide (Python compiled to WebAssembly) as the platform's in-browser execution runtime for Python code samples. Lazy-loaded from CDN (~10MB) on first 'Run' click; cached as a singleton promise across all PyodideRunner instances on the page. Future: wasmtime for Rust/C UDFs, WebContainer for Node/TS samples. All execution is pure client-side — no backend, works on static GitHub Pages.",
    consequences:
      "+ Code samples are executable — users see real output, not just syntax. + Zero backend cost (pure Wasm in browser). + Works on static GitHub Pages (no server needed). + Lazy-loaded — only downloads when user asks. + Singleton cache — subsequent runs are instant. − ~10MB initial download for first click (~3-5s on broadband). − Only stdlib + packages Pyodide ships — no PySpark, no snowflake-connector. − Browser memory limits (~2GB Wasm heap). − No real cloud services — synthetic data only.",
    alternatives: [
      "Backend execution (requires server — breaks static GitHub Pages model)",
      "WebContainer for Node (covers TS/JS but not Python)",
      "Compile DuckDB to Wasm (heavy — ~50MB, less mature than Pyodide)",
    ],
    tags: ["pyodide", "wasm", "execution", "frontend", "patterns"],
  },
  {
    id: "ADR-016",
    title: "Adopt WebAssembly as the platform's universal in-browser execution runtime",
    status: "accepted",
    date: "FY26-Q4",
    deciders: "Data Platform, Frontend, Developer Experience, Architecture",
    context:
      "ADR-015 adopted Pyodide for Python execution. But the platform has 7 languages in multi-lang samples — Python, Scala, Rust, Go, Bash, Elixir, C. Only Python can run in-browser currently. WebAssembly is the universal runtime: Rust compiles to wasm32-wasi, C/C++ via Emscripten, Go has native wasm support, and experimental Wasm backends exist for BEAM/Erlang. One runtime, many languages, zero backends.",
    decision:
      "Formalise WebAssembly as the platform's universal in-browser execution runtime. Pyodide (Python→Wasm) is already in production (ADR-015). Add wasmtime bindings for Rust/C code samples compiled to wasm32-wasi. Go compiles to Wasm natively (GOOS=js GOARCH=wasm). WebContainer for Node/TS is the future path. The WasmRunner component loads any .wasm binary from CDN or inline, calls the exported function, shows the output — same pattern regardless of the source language.",
    consequences:
      "+ One runtime, all 7 languages — universal portability. + Zero backend — pure Wasm in browser. + ABI-stable — same .wasm binary runs in any browser, any OS. + Lazy-loaded — only fetches .wasm when user clicks Run. + Composable — WasmRunner + PyodideRunner share the same output panel pattern. − Wasm ecosystem is still maturing for some languages (Elixir/BEAM is experimental). − No system calls in browser Wasm (no file I/O, no network) — sandboxed. − Compilation step needed (cargo build --target wasm32-wasi, emcc, tinygo) — can't compile in-browser (yet). − Browser memory limits (~2GB Wasm heap per tab).",
    alternatives: [
      "Stick with Pyodide only (Python only — leaves 6 languages without execution)",
      "Backend execution per language (breaks the static GitHub Pages model — needs server)",
      "Wait for WASI to mature further (lose the first-mover advantage on multi-language execution)",
    ],
    tags: ["wasm", "wasmtime", "execution", "runtime", "patterns", "multi-language"],
  },
  {
    id: "ADR-017",
    title: "Adopt Arrow Flight as the platform's cross-engine data transfer protocol",
    status: "accepted",
    date: "FY27-Q1",
    deciders: "Data Platform, Architecture, Integration",
    context:
      "ADR-013 committed to Iceberg as the primary table format (vendor-neutral, multi-engine). ADR-016 adopted WebAssembly for in-browser execution. But cross-engine queries (DuckDB → Snowflake → BigQuery → Trino) still transfer data via JDBC/ODBC (row-based, slow) or REST/JSON (10× overhead vs binary). Arrow Flight is a gRPC-based columnar transfer protocol that ships RecordBatches directly — 10× faster than REST/JSON, zero deserialisation overhead, and natively supported by DuckDB, Dremio, InfluxDB 3.0, and Voltron Data.",
    decision:
      "Adopt Apache Arrow Flight as the platform's cross-engine data transfer protocol. All inter-engine queries (DuckDB ↔ Snowflake ↔ BigQuery ↔ Trino) use Flight for columnar binary transfer. The pattern: source engine exposes a Flight endpoint, consumer engine connects via Flight client, receives Arrow RecordBatch stream — zero-copy into the consumer's memory. Falls back to JDBC/ODBC only for engines without Flight support (legacy Postgres, MySQL).",
    consequences:
      "+ 10× throughput vs REST/JSON for bulk transfer. + Zero-copy — Arrow RecordBatch arrives ready for compute, no deserialisation. + gRPC-based — streaming, bidirectional, multiplexed. + Columnar binary — no JSON parsing, no row-to-column conversion. + DuckDB + Trino + Dremio + InfluxDB support natively. − Needs Flight server on each engine (Snowflake/BigQuery don't have native Flight yet — use Arrow Flight SQL bridge). − gRPC adds operational complexity vs simple REST. − TLS cert management for secure Flight endpoints.",
    alternatives: [
      "JDBC/ODBC for all cross-engine queries (row-based, 10× slower)",
      "REST/JSON APIs (universally compatible but 10× overhead)",
      "Kafka for all transfers (streaming-first but overkill for point queries)",
    ],
    tags: ["arrow", "flight", "grpc", "transfer", "patterns", "cross-engine"],
  },
  {
    id: "ADR-018",
    title: "Adopt Polars as the platform's default single-node DataFrame library",
    status: "accepted",
    date: "FY27-Q1",
    deciders: "Data Platform, Analytics Engineering, Data Science",
    context:
      "ADR-014 adopted DuckDB as the CI + local analytical engine (SQL-first). But many data scientists and analytics engineers prefer a DataFrame API (code-first) over SQL. Pandas is the incumbent but is single-threaded, row-based internally, and 10-30× slower than Polars on the same data. Polars is Rust-native, Arrow-columnar, multi-threaded, and has lazy evaluation (query optimisation before execution). Both DuckDB and Polars speak Arrow natively — they're interchangeable for the same data.",
    decision:
      "Adopt Polars as the platform's default single-node DataFrame library for Python + Rust code that prefers a DataFrame API over SQL. DuckDB remains the default for SQL-first workflows (ADR-014). Both are Arrow-native — a Polars DataFrame converts to a DuckDB table and back with zero-copy. Pandas is held for ecosystem compatibility (libraries that require pandas objects) but new code should use Polars.",
    consequences:
      "+ 10-30× faster than Pandas on single-node. + Arrow-native (zero-copy with DuckDB). + Lazy evaluation (query optimiser before execution). + Multi-threaded (uses all cores). + Rust core (memory-safe, no GIL). + Smaller memory footprint. − Smaller ecosystem than Pandas (some libraries don't support Polars objects). − API differs from Pandas (migration cost for existing code). − No Pandas-style in-place mutation (Polars is immutable).",
    alternatives: [
      "Stay on Pandas (slow, single-threaded, row-based internally)",
      "Use DuckDB for everything (SQL-only, no DataFrame API)",
      "Modin (Pandas on Ray/Dask — distributed but still Pandas API)",
    ],
    tags: ["polars", "dataframe", "arrow", "rust", "patterns", "single-node"],
  },
  {
    id: "ADR-019",
    title: "Adopt the contextual bandit as the platform's official recommendation engine",
    status: "accepted",
    date: "FY27-Q1",
    deciders: "Data Platform, Frontend, Developer Experience",
    context:
      "The platform has 2 Thompson sampling bandits in production: Knowledge Shorts (per-short Beta posterior) and page recommendations (per-page Beta posterior with contextual features). Both persist to localStorage, learn across sessions, and use Marsaglia-Tsang Gamma sampling for Beta distribution draws. The pattern works — the bandit surfaces relevant content based on user interactions (clicks = α+1 wins, skips = β+1 losses). But it's undocumented as a formal platform component.",
    decision:
      "Formalise the contextual bandit as the platform's official recommendation engine. The Thompson sampling pattern (Beta posterior + Marsaglia-Tsang Gamma + contextual multipliers) is the standard for all adaptive content. Future recommendation surfaces (drawer tab defaults, search result ranking, Knowledge Short ordering) use the same bandit pattern. The bandit is a first-class platform component, not a prototype.",
    consequences:
      "+ Personalised recommendations that learn across sessions. + Simple to implement (Beta posterior, no neural network). + Contextual features (same-group boost, time-of-day boost). + Lazy evaluation (0 computation until drawer opens). + Persists in localStorage (no backend needed). − Cold-start problem (uniform Beta(1,1) until interactions accumulate). − No feature vectors (simplified — real contextual bandits use logistic regression). − No cross-user learning (localStorage is per-browser). − No server-side state (can't share bandit across devices).",
    alternatives: [
      "No recommendations (static ordering — no personalisation)",
      "Collaborative filtering (needs server + user database — breaks static model)",
      "Neural recommender (overkill for 21 pages × 10 shorts)",
    ],
    tags: ["bandit", "thompson-sampling", "recommendation", "rl", "patterns", "frontend"],
  },
  {
    id: "ADR-020",
    title: "Adopt MLflow as the platform's experiment tracking + model registry standard",
    status: "accepted",
    date: "FY27-Q1",
    deciders: "Data Platform, ML Engineering, Data Science",
    context:
      "The platform now has 22 pages covering data engineering end-to-end. But ML pipelines are missing — no experiment tracking, no model registry, no feature store governance. Data scientists train models ad-hoc, losing track of which hyperparameters produced which results. Models are deployed without versioning or rollback. The ML lifecycle (train → track → register → serve → monitor) needs infrastructure. MLflow is OSS (Apache 2.0), language-agnostic (Python/R/Java), and integrates with Databricks + Spark natively.",
    decision:
      "Adopt MLflow as the platform's standard for experiment tracking (MLflow Tracking) and model registry (MLflow Model Registry). All training runs log parameters, metrics, and artifacts to MLflow. All production models are registered with version + stage (None/Staging/Production/Archived). Databricks Feature Store (or Feast as OSS alternative) for feature serving. Model serving via MLflow Models (batch) + real-time via containerised endpoints.",
    consequences:
      "+ Reproducible experiments — every run tracked with params + metrics + artifacts. + Model versioning — rollback to any previous version. + Language-agnostic — Python, R, Java, Scala all log to MLflow. + OSS (Apache 2.0) — no vendor lock-in. + Databricks-native integration. + Model registry UI for promotion (Staging → Production). − Needs a tracking server (MLflow Tracking Server) or file-based local mode. − Feature store is separate (Databricks Feature Store or Feast). − Model monitoring (drift detection) needs additional tooling (Evidently, NannyML). − No built-in hyperparameter tuning (use Optuna/Ray Tune alongside).",
    alternatives: [
      "Weights & Biases (commercial — excellent UI but per-seat pricing)",
      "Comet ML (commercial — similar to W&B)",
      "Custom tracking (SQLite + custom UI — reinventing the wheel)",
    ],
    tags: ["mlflow", "ml", "experiment-tracking", "model-registry", "patterns", "mlops"],
  },
  {
    id: "ADR-021",
    title: "Adopt ONNX as the platform's universal model format for cross-language inference",
    status: "accepted",
    date: "FY27-Q1",
    deciders: "ML Engineering, Data Platform, DevOps",
    context:
      "ADR-020 adopted MLflow for experiment tracking + model registry. But models trained in Python (scikit-learn, PyTorch) need to be served in production via Go/Rust/C++ microservices for performance. Python inference is 10-100× slower than native code. ONNX (Open Neural Network Exchange) is a universal model format — train in any framework (PyTorch, TensorFlow, scikit-learn), export to .onnx, serve in any runtime (Python, Go, Rust, Java, C++).",
    decision:
      "Adopt ONNX as the platform's universal model format for cross-language inference. All production models are exported from MLflow to ONNX via skl2onnx (scikit-learn) or torch.onnx.export (PyTorch). The same .onnx file runs in Python (onnxruntime), Go (onnxruntime-go), Rust (tract), Java (ONNX Runtime Java), and C++ (ONNX Runtime C++). One model, many serving runtimes.",
    consequences:
      "+ Train in Python, serve in Go/Rust/C++ — 10-100× faster inference. + Universal format — no framework lock-in. + MLflow → ONNX export is automated in CI/CD. + Same .onnx file runs in browser via ONNX Runtime Web (Wasm). − ONNX doesn't support every operator (some custom ops need manual implementation). − Conversion step adds CI complexity. − ONNX graph optimisation differs across runtimes (perf varies).",
    alternatives: [
      "Python-only inference (slow, GIL-bound, needs Python runtime in prod)",
      "TorchScript (PyTorch-only — no cross-framework support)",
      "TensorFlow SavedModel (TF-only — vendor lock-in)",
    ],
    tags: ["onnx", "inference", "model-format", "cross-language", "patterns", "mlops"],
  },
  {
    id: "ADR-022",
    title: "Adopt pgvector as the platform's default vector database for RAG + semantic search",
    status: "accepted",
    date: "FY27-Q2",
    deciders: "Data Platform, ML Engineering, GenAI",
    context:
      "ADR-021 adopted ONNX for model serving. The RAG page (#28) showed that Gold tables become vector embeddings for LLM retrieval. But where do the vectors live? Standalone vector DBs (Pinecone, Weaviate, Qdrant) add operational complexity — a new service, new backups, new monitoring. pgvector is a Postgres extension — vectors live inside the existing Postgres instance that already powers the platform. No new infrastructure, no new ops burden, SQL-native querying.",
    decision:
      "Adopt pgvector as the platform's default vector database. All RAG embeddings (from Gold table rows) are stored as pgvector columns in Postgres. Cosine similarity search via SQL (ORDER BY embedding <=> query_vector LIMIT k). Pinecone/Weaviate reserved for >100M vector workloads where Postgres isn't enough. Chroma (embedded) for local dev + CI tests.",
    consequences:
      "+ Zero new infrastructure — vectors in existing Postgres. + SQL-native — vector search is just a SELECT. + Transactional — vectors + metadata in same table (ACID). + pgvector is OSS (PostgreSQL License). + HNSW index for sub-10ms search. − Postgres isn't optimised for >100M vectors (use Pinecone/Weaviate). − No built-in sharding (partition manually). − HNSW index build time can be slow for large datasets.",
    alternatives: [
      "Pinecone (managed SaaS — adds cost + external dependency)",
      "Weaviate (OSS but separate service — new ops burden)",
      "Qdrant (OSS Rust-native — fast but separate service)",
    ],
    tags: ["pgvector", "vector-db", "rag", "postgres", "patterns", "genai"],
  },
  {
    id: "ADR-023",
    title: "Adopt LoRA + QLoRA as the platform's default fine-tuning method for domain-specific LLMs",
    status: "accepted",
    date: "FY27-Q2",
    deciders: "ML Engineering, Data Platform, GenAI",
    context:
      "ADR-022 adopted pgvector for RAG retrieval. But RAG has limits — the LLM's base knowledge can't be updated via retrieval alone. Domain-specific tasks (e.g. SQL generation for the platform's schema, anomaly interpretation using the platform's taxonomy, natural-language-to-dbt-model) require the LLM's weights to be adapted. Full fine-tuning of a 7B model costs ~$500+ in GPU time and requires 8× A100 GPUs. LoRA (Low-Rank Adaptation) freezes the base weights and trains only small low-rank matrices (A·B where A is d×r, B is r×d, r << d). QLoRA further quantises the base model to 4-bit, enabling fine-tuning on a single consumer GPU (RTX 3090).",
    decision:
      "Adopt LoRA (Low-Rank Adaptation) + QLoRA (Quantised LoRA) as the platform's default fine-tuning method. All domain-specific LLM adaptation uses LoRA adapters (rank r=8-64) on top of frozen base models. QLoRA for resource-constrained environments (single GPU, 4-bit base). RLHF (Reinforcement Learning from Human Feedback) for alignment; DPO (Direct Preference Optimisation) as the simpler alternative to RLHF. Gold table rows (ADR-013) + ADR-022 embeddings become the training data for domain-specific fine-tuning.",
    consequences:
      "+ 99% fewer trainable parameters (LoRA: 0.1-1% of base model). + Train on single GPU (QLoRA: 1× RTX 3090 for 7B model). + Adapters are composable — stack multiple LoRA adapters. + Adapters are small (10-100MB vs 14GB base). + No catastrophic forgetting of base knowledge. − Slightly lower quality than full fine-tuning (1-3% gap). − LoRA rank selection is empirical (r=8 for style, r=64 for domain knowledge). − RLHF is complex (reward model + PPO + KL divergence); DPO is simpler but newer.",
    alternatives: [
      "Full fine-tuning (expensive, catastrophic forgetting, not composable)",
      "Prompt engineering only (limited — can't teach new domain knowledge)",
      "Prefix tuning (similar to LoRA but less flexible)",
    ],
    tags: ["lora", "qlora", "fine-tuning", "rlhf", "dpo", "llm", "patterns", "genai"],
  },
  {
    id: "ADR-024",
    title: "Adopt the semantic layer (MetricFlow + RAG + LoRA) as the platform's unified NL-to-SQL interface",
    status: "accepted",
    date: "FY27-Q2",
    deciders: "Data Platform, GenAI, Analytics Engineering",
    context:
      "ADR-023 adopted LoRA for domain-specific LLM fine-tuning. ADR-022 adopted pgvector for RAG. ADR-009 adopted MetricFlow as the semantic layer. But these three systems are currently separate: MetricFlow defines metrics, RAG retrieves context, LoRA adapts the model. The next convergence is to unify them: the LLM generates SQL grounded in MetricFlow's semantic entities, with RAG providing the schema context, and LoRA providing the domain-specific phrasing. This is the NL-to-SQL interface — ask 'what was UK revenue last quarter?' and the platform generates, validates, and executes the correct SQL.",
    decision:
      "Adopt the unified semantic layer: MetricFlow (metric definitions) + RAG (pgvector schema context) + LoRA (domain-specific SQL generation) as the platform's NL-to-SQL interface. Users ask natural-language questions; the LLM generates SQL grounded in MetricFlow entities, validated against the semantic schema, and executed on Snowflake/DuckDB. The semantic layer prevents hallucinated SQL — the LLM can only reference entities MetricFlow knows about.",
    consequences:
      "+ Natural-language query interface for non-technical users. + Grounded SQL — LLM can only reference MetricFlow entities (no hallucinated table/column names). + Validated execution — generated SQL is parsed + tested before running. + Self-correcting — if SQL fails, the error is fed back to the LLM. − Complex pipeline (NL → embed → retrieve → prompt → LoRA → generate SQL → validate → execute). − Latency (3-10s per query vs 0.1s for hand-written SQL). − Requires MetricFlow entities to be comprehensive. − LLM can still produce subtly wrong SQL (e.g. wrong join condition).",
    alternatives: [
      "Hand-written SQL only (no NL interface — fails non-technical users)",
      "Text-to-SQL without semantic grounding (hallucinated table names)",
      "Pre-canned dashboards only (inflexible — can't ask ad-hoc questions)",
    ],
    tags: ["semantic-layer", "metricflow", "rag", "lora", "nl-to-sql", "patterns", "genai"],
  },
  {
    id: "ADR-025",
    title: "Adopt the agentic platform architecture — formalising the ISR evolution as the platform's agentic roadmap",
    status: "accepted",
    date: "FY27-Q2",
    deciders: "Data Platform, ML Engineering, GenAI, Architecture",
    context:
      "ADR-019 formalised the contextual bandit as the recommendation engine. The RL & Agentic AI page (#30) documented the 4-stage evolution: single-shot → ReAct → ISR (Iterative Self-Refinement) → self-improving. The platform's /api/agent-triage endpoint is at Stage 2 (ReAct). The next evolution — ISR (Stage 3) and self-improving (Stage 4) — needs to be formalised as the platform's agentic roadmap, not just documentation. The agentic architecture connects: the bandit (ADR-019, Stage 1 RL) → the DQ triage agent (Stage 2 ReAct) → ISR self-evaluation (Stage 3) → RL fine-tuning on agent trajectories (Stage 4).",
    decision:
      "Formalise the 4-stage agentic evolution as the platform's official agentic architecture. Stage 1 (bandit) is in production. Stage 2 (ReAct agent) is in production via /api/agent-triage. Stage 3 (ISR) is the FY27 Q3 milestone — add a self-evaluation step before the agent posts. Stage 4 (self-improving) is the FY28 bet — RL fine-tune the agent's policy on which triage paths led to human-approved fixes. The Q-learning equation (Q(s,a) ← Q(s,a) + α[r + γ·max Q(s',a') − Q(s,a)]) from the RL page IS the Stage 4 update rule.",
    consequences:
      "+ Clear roadmap from today's bandit to self-improving agents. + Each stage has a concrete milestone + success metric. + The RL math is already documented (Q-learning page). + The bandit infrastructure (ADR-019) is the foundation. − Stage 3 (ISR) adds latency (self-evaluation before posting). − Stage 4 (RL fine-tuning) needs trajectory logging infrastructure. − Self-improving agents raise safety questions (what if the policy optimises for the wrong thing?).",
    alternatives: [
      "Stay at Stage 2 (ReAct) — no self-evaluation, no self-improvement",
      "Jump to Stage 4 (skip ISR) — risky without self-evaluation guardrails",
      "External agentic framework (LangGraph/LangChain) — vendor dependency",
    ],
    tags: ["agentic", "isr", "rl", "self-refinement", "roadmap", "patterns", "genai"],
  },
  {
    id: "ADR-026",
    title: "Adopt Vision Transformer (ViT) + CNN hybrid architecture for image understanding tasks",
    status: "accepted",
    date: "FY27-Q3",
    deciders: "Data Platform, ML Engineering, GenAI, Architecture",
    context:
      "ADR-024 unified the semantic layer for NL-to-SQL. ADR-023 adopted LoRA for LLM adaptation. The platform now needs to ingest unstructured image content (invoice scans, dashboard screenshots, document PDFs, satellite imagery for supply-chain) alongside the existing structured Gold tables. The Comp Sci & Materials page (#33) documented that convolutions and attention are both matmul — the same hardware accelerates both. The Transformer page (#32) showed self-attention is content-addressable memory. The question is: do we use a pure CNN (ResNet), a pure ViT (Vision Transformer), or a hybrid? Recent research (ConvNeXt, Swin, ViT-22B) shows the choice depends on data scale, latency budget, and transfer-learning requirements. The platform's data is mid-scale (~10M images), latency budget is 100ms p99, and we need transfer learning from open-world pretraining.",
    decision:
      "Adopt a hybrid architecture: ViT for the body (patches → transformer encoder → pooled embedding), with a CNN stem (first 2-3 conv layers) for the input tokeniser. Use LoRA (ADR-023) for domain adaptation on the ViT body. Use the same pgvector store (ADR-022) for image embeddings — the same ANN index that serves RAG text retrieval will serve image retrieval. The convolution kernel K ∈ ℝ^(k×k×C_in×C_out) operates as: Y[i,j] = Σ_{u,v,c} X[i+u, j+v, c] · K[u,v,c] + b. The attention head operates as: A = softmax(QKᵀ/√d_k)V. Both are matmul + reduction — the GPU runs them on the same tensor cores. The decision: ViT for new vision tasks (image classification, OCR, document understanding), ResNet/EfficientNet for cases where inductive bias matters (small datasets, edge deployment), hybrid (CNN stem + ViT body) for production.",
    consequences:
      "+ ViT scales better with data — already proven on the platform's 10M image corpus. + Same hardware (A100 GPUs) accelerates both conv and attention via tensor cores. + LoRA adapters (ADR-023) work for vision models — same fine-tuning pipeline. + pgvector (ADR-022) indexes image embeddings — same RAG retrieval infrastructure for text and images. + Connects to ADR-024 semantic layer: image embeddings become queryable via NL-to-SQL. − ViT needs more data than CNN to overcome lack of inductive bias. − Convolutions are easier to deploy on edge (mobile, IoT) — keep CNN fallback. − Multi-modal embeddings need careful normalisation before sharing the pgvector index.",
    alternatives: [
      "Pure CNN (ResNet-50 / EfficientNet-B7) — strong inductive bias, less data-hungry, but plateaus on large datasets",
      "Pure ViT (no CNN stem) — simpler code, but loses the cheap inductive bias of early convolution",
      "Swin Transformer (hierarchical) — efficient for dense prediction, but more complex",
      "Multi-modal foundation model (CLIP / SigLIP) — uses text-image pairs, but pretraining cost is high",
    ],
    tags: ["vision", "vit", "cnn", "convolution", "attention", "lora", "pgvector", "patterns", "genai"],
  },
  {
    id: "ADR-027",
    title: "Adopt DDPM (Denoising Diffusion Probabilistic Models) for synthetic image generation and data augmentation",
    status: "accepted",
    date: "FY27-Q4",
    deciders: "Data Platform, ML Engineering, GenAI, Architecture",
    context:
      "ADR-026 adopted ViT+CNN hybrid for image understanding (encoding images → embeddings). The reverse direction — generating synthetic images from embeddings or text — needs its own architecture decision. Three families compete: GANs (adversarial, fast sampling, mode collapse), VAEs (amortised, likelihood-based, blurry), and diffusion models (slow sampling, SOTA quality, probabilistic). Since ADR-026 stores image embeddings in pgvector (ADR-022), we need a generator that can condition on those embeddings to produce synthetic dashboards, synthetic invoices for testing, and synthetic training data for the OCR model. Diffusion is the right choice: it scales with compute (same matmul infrastructure as ADR-026), supports LoRA fine-tuning (ADR-023), and the score-matching objective is robust. The forward diffusion q(x_t|x_0) = N(√ᾱ_t x_0, (1-ᾱ_t) I) has a closed form; the reverse p_θ(x_{t-1}|x_t) is what the U-Net learns; the SDE formulation dx = f(x,t)dt + g(t)dw unifies discrete and continuous-time variants.",
    decision:
      "Adopt DDPM (Denoising Diffusion Probabilistic Models) for all synthetic image generation tasks. The training objective is the simplified DDPM loss: L = E[||ε - ε_θ(√ᾱ_t x_0 + √(1-ᾱ_t) ε, t)||²] where ε_θ is a U-Net (connected to ADR-026's CNN backbone for the encoder/decoder). Sampling uses DDIM (Denoising Diffusion Implicit Models) for 10-50 step sampling instead of 1000-step DDPM. Conditional generation uses classifier-free guidance: ε̃ = ε_θ(x,t,∅) + w·(ε_θ(x,t,c) - ε_θ(x,t,∅)). The score-based formulation s_θ(x,t) = -ε_θ(x,t)/√(1-ᾱ_t) connects to the continuous-time SDE: dx = -½β_t x dt + √β_t dw (forward) and reverse-time SDE for sampling. Noise schedule: cosine (Nichol & Dhariwal 2021) over linear for better sample quality at low resolutions. LoRA (ADR-023) adapts the U-Net for platform-specific imagery (dashboard screenshots, invoice layouts). Generated images embed via ADR-026's ViT into pgvector (ADR-022) — synthetic data IS queryable.",
    consequences:
      "+ SOTA quality — beats GAN on FID for platform image types (dashboards, charts, invoices). + Probabilistic — can estimate likelihood, useful for OOD detection on input images. + Same matmul/GPU infrastructure as ADR-026 — no new hardware. + LoRA (ADR-023) works for diffusion U-Nets. + Connects to ADR-024 semantic layer: text → embedding → diffusion → image → ViT → embedding → pgvector. + Synthetic data avoids GDPR PII (no real customer data in test envs). − Sampling is slow (10-50 steps even with DDIM, vs 1-step GAN). − Training is compute-heavy (needs A100s, ~500 GPU-hours for stable training). − Tuning noise schedule requires iteration — cosine schedule is good but not always optimal.",
    alternatives: [
      "GAN (StyleGAN-3) — fast 1-step sampling, but mode collapse + no likelihood estimate",
      "VAE (VQ-VAE-3) — amortised 1-step sampling, but blurry outputs and lower FID",
      "Normalizing flows — exact likelihood, but expensive in 2D image space",
      "Autoregressive (ImageGPT, DALL-E 1) — pixel-by-pixel, too slow for our 1024×1024 targets",
    ],
    tags: ["diffusion", "ddpm", "ddim", "score-matching", "unet", "sde", "lora", "synthetic-data", "patterns", "genai"],
  },
  {
    id: "ADR-028",
    title: "Adopt FSDP (Fully Sharded Data Parallel) for distributed LLM training beyond single-GPU memory",
    status: "accepted",
    date: "FY28-Q1",
    deciders: "Data Platform, ML Engineering, GenAI, Architecture",
    context:
      "ADR-027 adopted DDPM for image generation — training a 1B-parameter U-Net needs ~16GB just for parameters (FP32) + ~32GB for Adam optimiser states + ~16GB for gradients = 64GB. A single A100 (80GB) is at the limit. ADR-023 adopted LoRA to keep adaptation cheap, but pretraining the U-Net from scratch (and the platform's 70B-parameter LLM eventually) needs full-parameter training across multiple GPUs. Three approaches compete: DataParallel (DP, replicate model on every GPU, split batch), DistributedDataParallel (DDP, optimised DP with ring AllReduce), and Fully Sharded Data Parallel (FSDP / ZeRO-3 — shard parameters, gradients, AND optimiser states across GPUs). The math: for an N-layer model with B billion params and P GPUs, DP needs 16·B GB per GPU (full replica). DDP needs the same. FSDP needs 16·B/P GB per GPU (sharded). The communication cost: DDP allreduces gradients every step (2·B·P·log P bytes via ring AllReduce). FSDP allgathers parameters before each layer's forward (B/P bytes per layer) and reduces-scatters gradients after backward (B·(P-1)/P bytes per layer). The roofline: FSDP trades 2× more communication for P× less memory.",
    decision:
      "Adopt FSDP (PyTorch FSDP, equivalent to DeepSpeed ZeRO-3) as the default distributed training strategy for models > 1B parameters. For models ≤ 1B, use DDP (simpler, no sharding overhead). FSDP configuration: (1) shard_strategy = FULL_SHARD (parameters + gradients + optimiser states all sharded); (2) mixed_precision = BF16 (compute in BF16, master weights in FP32 — same as ADR-023's QLoRA but for full training); (3) activation_checkpointing = True (recompute forward activations in backward — trades 30% compute for 4× memory); (4) cpu_offload = False (keep shards on GPU — CPU offload is too slow for production). The training step: (a) FSDP.all_gather(params) before forward — each GPU has the full layer briefly; (b) compute forward in BF16; (c) FSDP.reduce_scatter(grads) after backward — each GPU owns its gradient shard; (d) Adam updates the local optimiser shard in FP32; (e) repeat. Per-step comm: 2·B bytes allgather + 2·B bytes reduce-scatter (per layer, but pipelined). Cluster: 8× A100 80GB via NVLink (900GB/s) for FY28 training runs.",
    consequences:
      "+ Scales to 200B+ models on 8× A100 80GB (would need 3.2TB single-GPU otherwise). + Same hardware as ADR-026/027 (no new GPUs needed). + Mixed precision (BF16) gives 2× throughput. + Activation checkpointing gives 4× effective memory at 30% compute cost. − Communication-bound: large models spend 30-50% of time on allgather/reduce-scatter. − Debugging is harder (sharded state is hard to inspect). − FSDP is newer than DDP — fewer battle-tested patterns. − CPU offload is too slow (we explicitly disabled it).",
    alternatives: [
      "DDP (DistributedDataParallel) — simpler, but limited to ~1B params on 80GB A100",
      "DeepSpeed ZeRO-2 (shard gradients + optimiser, NOT parameters) — middle ground, but still limited to ~2B params on 80GB",
      "Pipeline Parallelism (GPipe, Megatron-LM) — splits model across GPUs by layer, but introduces pipeline bubbles",
      "Tensor Parallelism (Megatron-LM) — splits individual matmuls across GPUs, but needs custom kernels per layer type",
    ],
    tags: ["distributed", "fsdp", "ddp", "zero", "allreduce", "ring-allgather", "mixed-precision", "patterns", "genai"],
  },
  {
    id: "ADR-029",
    title: "Adopt OpenTelemetry with distributed tracing as the unified observability standard across data + ML pipelines",
    status: "accepted",
    date: "FY28-Q2",
    deciders: "Data Platform, ML Engineering, SRE, Architecture",
    context:
      "ADR-002 (Medallion) and ADR-028 (FSDP) showed that the data pipeline and the ML training loop are structurally isomorphic — both are distributed DAGs with checkpoint + retry. Currently the platform uses two separate observability stacks: OpenLineage for data lineage (Airflow/Dagster → Marquez), and MLflow tracking for ML training runs (parameters + metrics + artifacts). This dual-stack approach has three failure modes: (1) correlation is impossible — when a model degrades (model-monitoring page), the team cannot trace which pipeline run produced the training data; (2) the ADR-028 distributed training page showed that FSDP generates per-rank telemetry that MLflow cannot capture (NCCL timing, AllReduce bandwidth, GPU memory per rank); (3) the floating LiveResourcesButton fetches arXiv papers per topic, but cannot surface platform events in the same UI. OpenTelemetry (OTel) is the CNCF standard that unifies metrics, logs, and traces under one wire format. The math: a span = (trace_id, span_id, parent_span_id, start_time, duration, attributes). A trace = a DAG of spans sharing a trace_id. The critical path of a distributed DAG is the longest-duration path through the span DAG — computable in O(V+E) via topological sort + dynamic programming. The 95th percentile of span duration is the SLI; the SLO is '99% of traces complete within T seconds'.",
    decision:
      "Adopt OpenTelemetry as the unified observability standard for ALL platform components — data pipelines, ML training, model serving, GenAI agents. Three layers: (1) Instrumentation: OTel SDK in every service (Python auto-instrumentation for Airflow/Dagster/MLflow, native OTel exporters for Spark/DuckDB); (2) Collection: OTel Collector as the central ingest point (receives OTLP, exports to Tempo for traces, Loki for logs, Mimir for metrics, Grafana for visualisation); (3) Retention: traces 30 days (sampling 10% in production, 100% in staging), metrics 90 days, logs 14 days. Span attributes follow semantic conventions: data.traces.lineage_dataset, ml.traces.model_id, ml.traces.framework (pytorch/tensorflow), ml.trains.world_size, gpus.rank. The critical-path computation runs as a Grafana plugin — every trace shows the critical path highlighted, with per-span contributions to total latency. Replaces: ADR-007's OpenLineage-only lineage (now OTel + OpenLineage collector bridge), MLflow's bespoke tracking (now MLflow for artifacts + OTel for telemetry).",
    consequences:
      "+ One query language (TraceQL/LogQL) for both data and ML. + Correlation: model degradation → trace the training run → find the pipeline that produced the data. + ADR-028 FSDP telemetry (NCCL timing, AllReduce bytes) flows into the same trace store. + Sampling reduces cost — only 10% of production traces stored. + Standard SDK = no vendor lock-in (Tempo/Loki/Mimir are OSS). − Initial instrumentation cost — every service needs the OTel SDK. − Sampling is hard — head sampling loses the long tail; tail sampling needs smarter logic (e.g. sample traces with errors or > p99 latency). − OTel Collector has learning curve (processors, exporters, connectors).",
    alternatives: [
      "Stay with dual-stack (OpenLineage + MLflow) — simpler today, but no correlation",
      "Use a commercial APM (Datadog, New Relic, Honeycomb) — fast time-to-value, but vendor lock-in + $ per GB ingested",
      "Build a bespoke telemetry layer — full control, but reinvents the wheel and won't keep up with CNCF ecosystem",
      "Use only Jaeger (traces) without metrics/logs — partial, doesn't solve the unification problem",
    ],
    tags: ["observability", "opentelemetry", "tracing", "spans", "critical-path", "slo", "sli", "patterns", "genai"],
  },
  {
    id: "ADR-030",
    title: "Adopt AWQ 4-bit quantisation + llama.cpp GGUF for cost-effective LLM inference",
    status: "accepted",
    date: "FY28-Q3",
    deciders: "Data Platform, ML Engineering, GenAI, Architecture",
    context:
      "ADR-023 adopted QLoRA 4-bit NF4 for fine-tuning. ADR-028 adopted FSDP for training. The remaining gap is inference: a 70B model in BF16 needs 140GB just for weights — 2× A100 80GB per replica, very expensive for serving. Three production-grade quantisation schemes compete: (1) NF4 (NormalFloat 4-bit, used in QLoRA — information-theoretically optimal for normally-distributed weights, but designed for adapters not deployment); (2) GPTQ (Generalised Post-Training Quantisation, layer-by-layer Hessian-based weight update — accurate but slow to quantise, ~hours per 70B); (3) AWQ (Activation-aware Weight Quantisation, scales salient weight channels by ~1% to preserve activations — fast to quantise, ~minutes per 70B, marginal accuracy loss); (4) llama.cpp GGUF k-quants (Q4_K_M, Q5_K_M, Q6_K — super-blocks with mixed precision, runs on CPU/Mac). The math: quantisation error e = x - dequant(quant(x)); group quantisation minimises MSE per group; AWQ's insight is that not all weight channels are equal — those with larger activation magnitudes are more important to preserve.",
    decision:
      "Adopt AWQ 4-bit as the default inference quantisation for GPU-served LLMs (7B-70B), with llama.cpp GGUF Q4_K_M as the default for CPU/edge deployment. Production stack: AWQ-quantised Llama-3-70B (40GB VRAM, fits 1× A100 80GB with 40GB headroom for KV cache) served via vLLM (ADR-031 will cover serving); llama.cpp with GGUF Q4_K_M for edge / Mac / CPU-only deployments (4-bit with mixed-precision super-blocks, ~3.5 bits/weight effective). For fine-tuning, keep ADR-023's QLoRA NF4 (designed for backward pass, not inference). The AWQ math: identify the top 1% of weight channels by activation magnitude (per-layer calibration on 128 samples), scale them by s > 1 before quantisation (so the post-quantisation rounding error is smaller relative to the magnitude), then apply standard 4-bit group quantisation. Quantisation error: e = ||x - dequant(quant(s·x))/s||₂. Group size 128, MSE minimised per group.",
    consequences:
      "+ 4× memory reduction vs BF16 (140GB → 35GB for 70B). + Same accuracy as BF16 within 1% perplexity (AWQ paper). + Fits 70B on 1× A100 80GB (vs 2× without quantisation) — 50% cost saving. + llama.cpp enables edge deployment (Mac, Raspberry Pi for 7B). + Connects to ADR-031 serving stack (vLLM supports AWQ kernels). − Calibration set matters — must be representative of production traffic. − GPTQ slightly more accurate but 100× slower to quantise. − NF4 designed for backward pass (LoRA), not optimal for pure inference. − Quantisation-aware training (QAT) is more accurate but requires retraining — we don't have compute budget for that.",
    alternatives: [
      "GPTQ 4-bit (more accurate, but ~10h quantisation time per 70B model — impractical for iteration)",
      "NF4 (designed for fine-tuning adapters via QLoRA, not for pure inference)",
      "FP8 (NVIDIA H100 native, but only on H100 hardware — our cluster is A100)",
      "Full BF16 inference (highest accuracy but 4× cost — used only for golden-path benchmark)",
    ],
    tags: ["quantization", "awq", "nf4", "gptq", "llama-cpp", "gguf", "4-bit", "inference", "patterns", "genai"],
  },
  {
    id: "ADR-031",
    title: "Adopt vLLM with PagedAttention + continuous batching as the default LLM serving stack",
    status: "accepted",
    date: "FY28-Q4",
    deciders: "Data Platform, ML Engineering, SRE, Architecture",
    context:
      "ADR-030 quantised 70B Llama-3 to 35GB (fits 1× A100 80GB with 45GB headroom for KV cache). The question is now serving: how to maximise throughput (tokens/sec) and minimise tail latency (p99) on this hardware. Three serving stacks compete: (1) Hugging Face Transformers + Accelerate — sequential, no batching, OOM-prone (KV cache contiguous VRAM); (2) NVIDIA Triton + FasterTransformer — fast kernels but no continuous batching, static batch sizes; (3) vLLM (PagedAttention, Kwon 2023) — KV cache in non-contiguous pages (like OS virtual memory), continuous batching (join/leave mid-step), 8-23× higher throughput than HF. The math: KV cache per token = 2·L·d_model·bytes (K+V, all layers). For 70B Llama (80 layers, 8192 d_model, BF16): 2·80·8192·2 = 2.6MB/token. For 32k context × 8 users = 670GB contiguous KV — OOMs even on 80GB A100. PagedAttention: KV in 16MB pages, OS-style page table, free pages reclaimed when a sequence finishes. Continuous batching: each step, the scheduler picks the next token for every active sequence — no waiting for batch to fill or empty. The throughput improvement: HF ~50 tok/s/GPU; vLLM ~3000 tok/s/GPU at high concurrency.",
    decision:
      "Adopt vLLM with PagedAttention + continuous batching as the default LLM serving stack for the platform. Three architectural choices: (1) PagedAttention for KV cache management — paged KV layout (block_size=16 tokens, page_size=16MB), per-sequence page table, copy-on-write for beam search; (2) Continuous batching — iteration-level scheduler, sequences join/leave mid-step, no static batch size; (3) AWQ kernels (from ADR-030) — vLLM's Marlin kernel for INT4 matmul, 2× faster than dequantise-then-matmul. Deployment: vLLM server behind an OpenAI-compatible REST API (/v1/completions, /v1/chat/completions), autoscaled by GPU utilisation (target 80%). For batch offline (e.g. evaluation harness), use vLLM's offline batch mode. For real-time chat (e.g. agent-triage), use streaming completions (SSE). Connects to ADR-029 OpenTelemetry: every request creates a trace_id, every token generated is a span with span_id (one per decode step). The throughput SLI: tokens/sec; the latency SLO: p99(first_token) < 500ms, p99(per_token) < 50ms.",
    consequences:
      "+ 8-23× higher throughput than HF Transformers (PagedAttention paper). + Handles variable-length sequences without padding waste. + KV cache fragmented, no OOM crashes. + Same OpenAI API as GPT-4 — drop-in for client code. + Connects to ADR-029 telemetry — per-token spans flow into Tempo. − vLLM is newer than HF — occasional kernel bugs, less mature for non-Llama models. − PagedAttention requires custom CUDA kernels — won't work on AMD GPUs well. − Continuous batching adds scheduler complexity — at low QPS, no benefit. − Streaming SSE adds complexity for client code (compared to single response).",
    alternatives: [
      "Hugging Face Transformers + Accelerate — simple, but 10× slower and OOM-prone",
      "NVIDIA Triton + FasterTransformer — fast kernels, but no continuous batching",
      "TGI (Text Generation Inference, HuggingFace) — comparable to vLLM but smaller community",
      "Custom serving stack — full control but reinvents PagedAttention",
    ],
    tags: ["inference", "vllm", "pagedattention", "continuous-batching", "kv-cache", "serving", "openai-api", "patterns", "genai"],
  },
  {
    id: "ADR-032",
    title: "Adopt hybrid retrieval (BM25 + vector + cross-encoder re-rank) as the default RAG retrieval pipeline",
    status: "accepted",
    date: "FY29-Q1",
    deciders: "Data Platform, ML Engineering, GenAI, Architecture",
    context:
      "ADR-022 adopted pgvector for vector embeddings. The RAG & LLMs page (#28) introduced naive RAG (embed → ANN search → top-k → stuff into prompt). For production NL-to-SQL grounding (ADR-024 semantic layer), naive RAG underperforms: (1) embedding similarity misses exact-match SQL identifiers (e.g. user asks for 'dim_customer' table by name — vector ANN may return semantically-related but wrong tables); (2) chunking strategy matters more than the embedding model — too-small chunks lose context, too-large chunks dilute signal; (3) single-stage retrieval is recall-bound — top-10 from vector ANN often misses the right chunk that re-ranking would surface. The state-of-the-art RAG pipeline (Cohere, Anthropic, OpenAI) uses THREE stages: (1) chunk documents with semantic boundaries (LangChain RecursiveCharacterTextSplitter, chunk_size=512, overlap=64); (2) PARALLEL hybrid retrieval: BM25 (sparse, exact-match) + pgvector ANN (dense, semantic) — each returns top-50, then RRF (Reciprocal Rank Fusion) merges; (3) cross-encoder re-ranking: bi-encoder embedding is query/doc independent (cheap, approximate), cross-encoder co-encodes query+doc (expensive, accurate) on top-50, returns final top-5. The math: BM25 score = IDF(q) · (f(q,D) · (k1+1)) / (f(q,D) + k1·(1 − b + b·|D|/avgdl)); RRF score = Σ 1/(60 + rank_i); cross-encoder = softmax(W · [query; doc; query*doc] + b).",
    decision:
      "Adopt three-stage hybrid retrieval as the default RAG pipeline. Stage 1 — Chunking: RecursiveCharacterTextSplitter with chunk_size=512 tokens (not characters — tiktoken-aware), overlap=64 tokens (sliding window preserves context across boundaries). For SQL DDL/schema, use statement-aware chunking (one CREATE TABLE per chunk). Stage 2 — Hybrid retrieval (parallel): BM25 via pgvector's ts_vector + GIN index (sparse, exact SQL identifier match) + pgvector HNSW ANN (dense, semantic). Both return top-50, fused via Reciprocal Rank Fusion (k=60). Stage 3 — Cross-encoder re-rank: ms-marco-MiniLM-L-12-v2 (cross-encoder, fine-tuned on MS MARCO) on top-50 → final top-5 to stuff into prompt. Cross-encoder cost: ~5ms per (query, doc) pair × 50 = 250ms per query — acceptable for production. Connects to ADR-031 vLLM: the re-ranked top-5 → augmented prompt → vLLM streaming completion. Connects to ADR-029 OTel: each retrieval stage emits a span (BM25_search, vector_search, RRF_fusion, cross_encoder_rerank) — full RAG trace visible in Grafana.",
    consequences:
      "+ Hybrid BM25+vector eliminates both failure modes (exact-match + semantic) — lifts RAG accuracy by 15-25% vs vector-only. + Cross-encoder re-rank adds another 5-10% (paper: https://arxiv.org/abs/2010.11324). + Chunking with overlap prevents context loss at boundaries. + pgvector stores both sparse (tsvector) and dense (vector) — single DB, single query. + Connects to ADR-029 trace store — every retrieval stage visible. − Cross-encoder adds ~250ms latency (acceptable for chat, marginal for sub-100ms). − Chunking is hard — needs per-document-type strategy (SQL DDL ≠ prose). − RRF k=60 is a magic number from the original paper — needs per-corpus tuning. − Re-rank model adds another model to deploy (cross-encoder on GPU or CPU).",
    alternatives: [
      "Pure vector RAG (semantic only — current naive approach, 15-25% accuracy loss on SQL identifier matches)",
      "Pure BM25 (sparse only — misses semantic matches, no NL-to-SQL grounding)",
      "Multi-vector retrieval (ColBERT-style late interaction — most accurate, but 100× storage cost)",
      "Generative retrieval (T5-style encoder-decoder generating doc IDs — bleeding edge, not production-ready)",
    ],
    tags: ["rag", "hybrid-retrieval", "bm25", "vector", "cross-encoder", "rerank", "rrf", "chunking", "patterns", "genai"],
  },
  {
    id: "ADR-033",
    title: "Adopt CLIP / SigLIP for multi-modal RAG — text and image embeddings in one shared pgvector space",
    status: "accepted",
    date: "FY29-Q2",
    deciders: "Data Platform, ML Engineering, GenAI, Architecture",
    context:
      "ADR-022 adopted pgvector for text embeddings. ADR-032 adopted hybrid retrieval (BM25 + vector + cross-encoder) for text RAG. ADR-026 adopted ViT for image understanding. ADR-027 adopted DDPM for synthetic image generation. The remaining gap is multi-modal: a user uploads a chart screenshot and asks 'which dashboards have similar patterns?' — text-only RAG cannot answer this. CLIP (Radford 2021) and SigLIP (Zhai 2023) solve this by training a shared embedding space for text and images via contrastive learning on (image, caption) pairs. The math: contrastive loss L = -log(exp(sim(I,T)+) / Σ exp(sim(I,T)+) + Σ_neg exp(sim(I,T)-)) over a batch of N pairs — pulls matched pairs together, pushes unmatched pairs apart. After training on 400M pairs, the text encoder and image encoder produce vectors in the same ℝ^768 space — cosine similarity between a text query and an image embedding is meaningful. This enables cross-modal RAG: embed the image → ANN search in pgvector → retrieve both similar images AND similar text chunks. SigLIP improves CLIP by replacing softmax loss with sigmoid loss (per-pair independent, scales to larger batches).",
    decision:
      "Adopt SigLIP (sigmoid loss variant of CLIP) for multi-modal embeddings. Architecture: SigLIP-SO400M (400M params, image encoder = ViT-SO400M, text encoder = transformer-400M). Output: 768-dim shared embedding space. Storage: pgvector HNSW index on (id, modality, embedding) — same index for text and images. Cross-modal RAG pipeline: (1) User submits image OR text query; (2) Embed with SigLIP (text or image branch as appropriate); (3) ANN search returns top-k regardless of modality; (4) Cross-encoder re-rank (use LLM to verify semantic match between query and retrieved chunks, regardless of modality); (5) Augmented prompt to vLLM (ADR-031). Applications: 'find dashboards with similar revenue patterns' (image→image), 'find SQL that produces this chart' (image→text), 'find images matching this description' (text→image). Connects to ADR-027 diffusion: synthetic images generated by DDPM are embedded by SigLIP into the same pgvector index — synthetic data is searchable alongside real data.",
    consequences:
      "+ One index, one embedding space, one query language for text + image. + Cross-modal retrieval works out of the box (no separate image-only search). + Synthetic data (ADR-027) is searchable alongside real data. + Connects to ADR-024 semantic layer: 'show me charts where UK revenue > £2M' returns both image results (chart screenshots) and text results (SQL descriptions). + SigLIP scales better than CLIP (sigmoid loss = independent pairs, no batch-N×N softmax). − SigLIP-SO400M is 800M params — non-trivial to serve (use AWQ from ADR-030, fits on 1× A100). − Cross-modal accuracy < intra-modal — text↔image retrieval p50 recall@5 ≈ 0.65, text↔text ≈ 0.85. − Embedding alignment drift: re-training SigLIP invalidates all stored embeddings — must re-index 10M+ chunks. − Need to handle mixed-modality in cross-encoder re-rank (text-only cross-encoder doesn't work on image).",
    alternatives: [
      "CLIP (original, softmax loss) — proven but softmax loss doesn't scale beyond batch 32k",
      "BLIP-2 (image+text joint, generative) — more flexible but heavier (12B params)",
      "Two separate indexes (image-only + text-only) — simpler but no cross-modal queries",
      "Late-fusion (query text→text RAG + image→image RAG, then merge) — lossy, no joint embedding",
    ],
    tags: ["multimodal", "clip", "siglip", "contrastive-learning", "cross-modal", "rag", "embeddings", "pgvector", "patterns", "genai"],
  },
  {
    id: "ADR-034",
    title: "Adopt ESM-2 + pgvector for bioinformatics — protein sequences as embeddable documents",
    status: "accepted",
    date: "FY29-Q3",
    deciders: "Data Platform, Bioinformatics, ML Engineering, Architecture",
    context:
      "ADR-033 unified text + image in one embedding space. The platform now needs to ingest genomics and proteomics data alongside the existing tabular + image content. Three core bioinformatics problems need infrastructure: (1) Sequence alignment (Smith-Waterman local, Needleman-Wunsch global — both O(n·m) DP); (2) Read mapping against a reference genome (BWA/BLAST use k-mer indexing + Burrows-Wheeler Transform for O(n) search); (3) Functional prediction from sequence (ESM-2 (Lin 2023) — a 650M-param protein language model trained on 250M sequences via masked language modelling; AlphaFold2 (Jumper 2021) — adds a geometric structure head to predict 3D coordinates). The key insight from ADR-033: a protein sequence IS a 'document' — embeddable with a transformer, storable in pgvector, queryable via RAG. The 20-letter amino acid alphabet becomes a 20-token vocabulary; the 3-letter codon → amino acid translation is a learned mapping. ESM-2's representations cluster proteins by function — a 'contrastive learning on evolution' result: 250M sequences aligned by descent → functional similarity in embedding space.",
    decision:
      "Adopt ESM-2 (650M params) as the default protein sequence encoder, with pgvector storing protein embeddings alongside text and image. Three-layer bioinformatics stack: (1) Sequence alignment via Biopython (Needleman-Wunsch global, Smith-Waterman local — both O(n·m) DP); (2) Reference genome mapping via BWA-MEM (BWT-based, O(n) per read, parallelised across chromosomes on Spark); (3) Functional prediction via ESM-2 (encoder transformer, 33 layers, 1280-dim embeddings) → pgvector HNSW index → RAG retrieval of similar proteins. Connects to ADR-027 diffusion: AlphaFold2's structure head IS a conditional diffusion model — predicts 3D coordinates from sequence embeddings, same DDPM math. Connects to ADR-022 pgvector: protein function search is RAG on the universe of UniProt. Application: when a novel protein is sequenced (e.g. new SARS-CoV-2 variant), embed with ESM-2 → ANN search in pgvector → retrieve functionally similar known proteins → RAG-prompt an LLM to summarise likely function + drug targets.",
    consequences:
      "+ Protein sequences become first-class platform data — same RAG infrastructure as text/image. + ESM-2 captures evolutionary information (trained on UniProt's 250M sequences with masked LM). + AlphaFold2 + ESM-2 + pgvector = function-from-sequence pipeline. + Connects to ADR-027 diffusion (AlphaFold2 structure head IS diffusion). + Genomics data via Spark (BWA-MEM distributed, GATK for variants) — same infrastructure as data pipelines. − ESM-2 (650M params) needs AWQ (ADR-030) + vLLM (ADR-031) to serve on 1× A100. − Protein sequences are not natural language — tokeniser must use 20-letter amino acid alphabet, not BPE. − AlphaFold2's structure head is GPU-heavy (relaxed + iterative SE(3)-equivariant attention) — separate inference path from ESM-2 embeddings. − Biological safety: functional prediction of novel pathogens needs governance (don't auto-publish predictions of dangerous functions).",
    alternatives: [
      "BLAST-only (no ML) — exact-match alignment, misses functional similarity for divergent sequences",
      "Profile HMMs (HMMER) — family-specific, but each family needs separate training",
      "Train a bespoke protein encoder — full control but 1000s of GPU-hours for a 650M model",
      "Use AlphaFold2's MSA track directly — most accurate but requires multiple sequence alignment (slow)",
    ],
    tags: ["bioinformatics", "esm-2", "alphafold2", "sequence-alignment", "needleman-wunsch", "smith-waterman", "blast", "bwt", "rag", "patterns", "genai"],
  },
  {
    id: "ADR-035",
    title: "Adopt ECFP4 fingerprints + ChemBERTa embeddings for cheminformatics — molecular RAG",
    status: "accepted",
    date: "FY29-Q4",
    deciders: "Data Platform, Cheminformatics, ML Engineering, Architecture",
    context:
      "ADR-034 adopted ESM-2 for protein sequences. The platform now ingests chemical structures alongside proteins — drug discovery needs to query 'find compounds similar to known inhibitor X' and 'predict properties of compound Y'. Three cheminformatics primitives are required: (1) Molecular fingerprints — ECFP4 (Rogers 2010, 'Extended-Connectivity Fingerprints') is the industry standard; circular substructure enumeration hashed to a 1024-2048 bit vector. (2) Tanimoto similarity (Jaccard on bit vectors) — T(a,b) = |a∩b| / |a∪b|. (3) Modern learned embeddings — ChemBERTa (Chithrananda 2020, SMILES as text, BERT MLM), Uni-Mol (Zhou 2023, 3D-aware), Mol-BERT. The key insight from ADR-034: a molecule IS a 'document' — SMILES strings (Simplified Molecular-Input Line-Entry System, e.g. 'CC(=O)Oc1ccccc1C(=O)O' for aspirin) are tokenisable, ChemBERTa embeds them, embeddings store in pgvector. ECFP4 fingerprints coexist as sparse retrieval (BM25 analog) — Tanimoto is the sparse scorer, ChemBERTa cosine sim is the dense scorer. Hybrid = same pattern as ADR-032.",
    decision:
      "Adopt two-track cheminformatics: ECFP4 (sparse, exact substructure match) for traditional cheminformatics + ChemBERTa-77M (dense, semantic) for ML-based similarity. Storage: pgvector stores both fingerprints (tsvector on SMILES, BERT vector on ChemBERTa) — same hybrid pattern as ADR-032 RAG. Pipeline: SMILES → RDKit canonicalise → ECFP4 (1024-bit) + ChemBERTa (512-dim) → pgvector. Retrieval: Tanimoto (ECFP4) + cosine (ChemBERTa) in parallel → RRF fusion → top-k. Applications: virtual screening (search 100M ZINC library for top-1000 candidates), drug repurposing (find existing drugs similar to a target), toxicity prediction (regression on 90K Tox21 compounds). Connects to ADR-034 ESM-2: drug discovery = protein target (ESM-2) + drug candidate (ChemBERTa) + interaction prediction — same shared embedding space vision. Connects to ADR-022 pgvector: 100M compounds, 1024-dim ChemBERTa vectors, HNSW index.",
    consequences:
      "+ 100M+ compound libraries (ZINC, ChEMBL) searchable in seconds via HNSW. + SMILES is text — ChemBERTa can be served with vLLM (ADR-031) like any LLM. + ECFP4 + ChemBERTa hybrid = same RAG pattern as ADR-032 — proven, no new infrastructure. + Connects to ADR-034 protein embeddings: drug-target interaction via shared embedding (drug ChemBERTa + target ESM-2). + Lipinski's Rule of 5 + ADMET predictions = drug-likeness scoring at indexing time. − ECFP4 is collision-prone for large molecules (use 2048-bit for >50 heavy atoms). − ChemBERTa trained on small molecules only (~77M from PubChem) — protein-bound ligands need fine-tuning. − Stereochemistry lost in ECFP4 — use stereo-specific variants (ECFP4-s) when needed. − SMILES has multiple valid encodings per molecule — must canonicalise before indexing.",
    alternatives: [
      "MACCS keys (166-bit, hand-curated substructures) — older, less expressive, but battle-tested",
      "Topological torsion fingerprints — captures chiral info, but smaller community",
      "Graph neural networks (D-MPNN, Gilmer 2017) — most accurate, but expensive to embed 100M molecules",
      "3D pharmacophore fingerprints — needs 3D coordinates, expensive to compute",
    ],
    tags: ["cheminformatics", "ecfp", "tanimoto", "chemberta", "uni-mol", "smiles", "rdkit", "virtual-screening", "rag", "patterns", "genai"],
  },
];

// ============================================================
// Knowledge Hub — Pattern library
// ============================================================
export const PATTERNS = [
  {
    name: "Medallion Architecture",
    category: "Storage",
    summary: "Bronze (raw) → Silver (conformed) → Gold (dimensional). Each layer has one job.",
    when: "Any platform with multiple consumption patterns (BI + ML + ad-hoc).",
    when_not: "Single-consumer platforms (e.g. ML-only feature store).",
    failure_modes: "Skipping layers; Silver doing Gold work; Bronze becoming mutable.",
    implements_page: "databricks",
    related_adrs: ["ADR-002"],
  },
  {
    name: "SCD2 Snapshots",
    category: "Modelling",
    summary: "Track history of slowly-changing dimensions with valid_from / valid_to windows.",
    when: "Customer/product attributes that change over time and affect historical reporting.",
    when_not: "Tiny dimensions (e.g. dim_date) or attributes that never change.",
    failure_modes: "Surrogate key not regenerated; fact-dates fall outside validity windows.",
    implements_page: "dbt",
    related_adrs: ["ADR-003"],
  },
  {
    name: "Session-context RLS",
    category: "Security",
    summary: "Single SECURE VIEW + SESSION_CONTEXT() function driven by SSO attributes.",
    when: "Multi-region / multi-tenant analytics where regions cannot see each other's data.",
    when_not: "Single-tenant platforms; non-Snowflake warehouses (mostly).",
    failure_modes: "SSO attribute drift; service users bypassing session context.",
    implements_page: "snowflake",
    related_adrs: ["ADR-004"],
  },
  {
    name: "Slim CI (state-aware dbt build)",
    category: "DevOps",
    summary: "Run dbt build only on state:modified+ models using the previous manifest as state.",
    when: "Any dbt project > 50 models. Cuts CI runtime by 60-80%.",
    when_not: "Tiny dbt projects (< 20 models) — overhead exceeds savings.",
    failure_modes: "Manifest not uploaded; state drift between dev and prod.",
    implements_page: "cicd",
    related_adrs: ["ADR-006"],
  },
  {
    name: "Schema-on-read Bronze",
    category: "Ingestion",
    summary: "Append-only raw ingest; no schema enforcement. Drift handled via schema-registry PR.",
    when: "Sources with frequent schema changes; BI workload tolerant of evolving schema.",
    when_not: "Regulated sources requiring strict schema; tiny ingest where schema rarely changes.",
    failure_modes: "Drift PRs pile up; Silver transformations break on new columns.",
    implements_page: "fivetran-hightouch",
    related_adrs: ["ADR-007"],
  },
  {
    name: "Reverse-ETL via SQL models",
    category: "Activation",
    summary: "Audiences defined as SQL models in Snowflake; sync tool upserts into business systems.",
    when: "Multiple downstream activation systems (CRM, CDP, ads).",
    when_not: "Single activation target; one-off sync needs.",
    failure_modes: "PII leakage if masking not enforced; stale syncs if cadence not aligned with dbt run.",
    implements_page: "fivetran-hightouch",
    related_adrs: ["ADR-008"],
  },
  {
    name: "MetricFlow semantic layer",
    category: "Analytics",
    summary: "Single source of metric definitions in YAML; BI + reverse-ETL consume the same definitions.",
    when: "Multiple BI tools; metrics appearing in multiple dashboards; metric drift observed.",
    when_not: "Single BI tool with its own semantic model.",
    failure_modes: "Complex metrics need SQL escape hatches; metric ownership disputes.",
    implements_page: "dbt",
    related_adrs: ["ADR-009"],
  },
  {
    name: "Idempotent MERGE pipelines",
    category: "Orchestration",
    summary: "MERGE on business key with idempotency_token; safe to re-run for any date partition.",
    when: "All incremental Silver/Gold tables. Bronze is append-only (no MERGE).",
    when_not: "Streaming inserts where MERGE is too slow; tiny reference data.",
    failure_modes: "Business key collisions; partial MERGE state on failure.",
    implements_page: "databricks",
    related_adrs: ["ADR-002", "ADR-010"],
  },
];

// ============================================================
// Knowledge Hub — Trade-off matrices
// ============================================================
export const TRADEOFFS = [
  {
    decision: "Warehouse: Snowflake vs BigQuery vs Databricks SQL",
    options: [
      { option: "Snowflake", strengths: "Mature BI, RLS, multi-cluster, secure sharing", weaknesses: "Cost at scale, less ML-native", verdict: "Chosen for serving" },
      { option: "BigQuery", strengths: "Serverless, low ops, great pricing model", weaknesses: "Less RLS flexibility, GCP-only", verdict: "Considered, rejected" },
      { option: "Databricks SQL", strengths: "Unified with Lakehouse, Photon", weaknesses: "Less mature BI tooling, fewer connectors", verdict: "Held — used for ad-hoc only" },
    ],
  },
  {
    decision: "Transformation: dbt vs Dataform vs PySpark DLT",
    options: [
      { option: "dbt", strengths: "Tests, docs, slim CI, semantic layer, ecosystem", weaknesses: "Two tools (dbt + PySpark)", verdict: "Chosen for Gold" },
      { option: "Dataform", strengths: "Native to BigQuery, lower cost", weaknesses: "Smaller ecosystem, less mature", verdict: "Rejected" },
      { option: "PySpark DLT", strengths: "Native to Databricks, streaming, ML-ready", weaknesses: "No tests/docs ecosystem, less analyst-friendly", verdict: "Chosen for Silver" },
    ],
  },
  {
    decision: "Orchestration: Airflow vs Dagster vs Prefect",
    options: [
      { option: "Airflow", strengths: "Operators, ecosystem, maturity", weaknesses: "Asset graph weak, DAGs as code only", verdict: "Chosen for batch" },
      { option: "Dagster", strengths: "Asset graph, partitions, lineage", weaknesses: "Smaller operator ecosystem", verdict: "Chosen for assets" },
      { option: "Prefect", strengths: "Pythonic, dynamic DAGs", weaknesses: "Younger ecosystem", verdict: "Rejected" },
    ],
  },
  {
    decision: "Reverse-ETL: Hightouch vs Census vs Custom",
    options: [
      { option: "Hightouch", strengths: "SQL models, sync UI, audit", weaknesses: "Cost scales with syncs", verdict: "Chosen" },
      { option: "Census", strengths: "Comparable to Hightouch", weaknesses: "Less SQL-native", verdict: "Considered" },
      { option: "Custom Python", strengths: "Free, full control", weaknesses: "Maintenance burden, no UI for marketers", verdict: "Rejected" },
    ],
  },
];

// ============================================================
// Evolution Timeline
// ============================================================
export const EVOLUTION_VERSIONS = [
  {
    version: "v1.0",
    label: "Monolith era",
    date: "FY19",
    summary: "Single Postgres + Tableau Server. Hand-built ETL in Python. 3 analysts.",
    decisions: ["Postgres-only", "Manual ETL", "Tableau on a single VM"],
    lessons: "Schema drift killed us weekly; no lineage; one bad migration took down BI for 2 days.",
    tech: ["PostgreSQL", "Python ETL", "Tableau Server", "Jenkins"],
    color: "var(--chart-5)",
  },
  {
    version: "v1.5",
    label: "Cloud migration",
    date: "FY20",
    summary: "Moved to Snowflake for compute, S3 for raw storage. Airflow for orchestration.",
    decisions: ["Snowflake primary", "S3 raw", "Airflow 1.10"],
    lessons: "Snowflake solved compute. But Bronze was unstructured — querying it was painful.",
    tech: ["Snowflake", "S3", "Airflow 1.10", "dbt 0.x (experimental)"],
    color: "var(--chart-4)",
  },
  {
    version: "v2.0",
    label: "Lakehouse era",
    date: "FY22",
    summary: "Adopted Databricks + Delta Lake. Medallion pattern formalised. dbt goes GA in our stack.",
    decisions: ["Databricks Lakehouse", "Delta Lake", "Medallion formal", "dbt for Gold"],
    lessons: "Bronze→Silver→Gold unlocked idempotency. But Unity Catalogue didn't exist yet — PII was a mess.",
    tech: ["Databricks", "Delta Lake", "dbt", "Airflow 2.x", "Fivetran"],
    color: "var(--chart-3)",
  },
  {
    version: "v2.4",
    label: "Governed analytics",
    date: "FY24",
    summary: "Unity Catalogue GA. MetricFlow semantic layer. Hightouch reverse-ETL. Slim CI. OpenLineage.",
    decisions: ["Unity Catalogue", "MetricFlow", "Hightouch", "Slim CI", "OpenLineage", "Photon"],
    lessons: "Single-source-of-truth finally real. Cost-per-TB down 19% YoY. CI runtime 14m → 4m.",
    tech: ["Unity Catalogue", "MetricFlow", "Hightouch", "GitHub Actions", "Terraform", "Monte Carlo"],
    color: "var(--chart-1)",
  },
  {
    version: "v3.0 (planned)",
    label: "Agentic era",
    date: "FY26 (planned)",
    summary: "AI agents for DQ triage, schema drift PRs, cost optimisation, semantic layer queries. Streaming-first Bronze.",
    decisions: ["Agentic DQ", "LLM-based schema registry", "Streaming Bronze (Kafka + Delta CDF)", "Vector search on docs"],
    lessons: "Hypothesis: agents will reduce on-call load by 60%. Risk: agents making schema changes autonomously.",
    tech: ["LLM agents", "Kafka", "Delta CDF", "Vector DB", "Dagster assets"],
    color: "var(--chart-2)",
  },
];

// ============================================================
// Evolution — Technology radar
// ============================================================
export const TECH_RADAR = [
  // ADOPT
  { name: "Snowflake multi-cluster", ring: "adopt", quadrant: "Platforms", notes: "Standard serving warehouse" },
  { name: "Databricks Photon", ring: "adopt", quadrant: "Platforms", notes: "All Silver/Gold PySpark" },
  { name: "Delta Lake", ring: "adopt", quadrant: "Formats", notes: "Single storage format" },
  { name: "dbt + MetricFlow", ring: "adopt", quadrant: "Tools", notes: "Single transform layer" },
  { name: "Unity Catalogue", ring: "adopt", quadrant: "Governance", notes: "RBAC + PII tags" },
  { name: "Fivetran", ring: "adopt", quadrant: "Ingestion", notes: "14 managed sources" },
  { name: "Hightouch", ring: "adopt", quadrant: "Activation", notes: "Reverse-ETL" },
  { name: "OpenLineage", ring: "adopt", quadrant: "Observability", notes: "Cross-tool lineage" },
  { name: "Terraform", ring: "adopt", quadrant: "DevOps", notes: "IaC for Snowflake/Databricks" },
  { name: "GitHub Actions", ring: "adopt", quadrant: "DevOps", notes: "Slim CI + promotion" },
  // TRIAL
  { name: "Dagster", ring: "trial", quadrant: "Orchestration", notes: "Asset-graph parallel to Airflow" },
  { name: "Monte Carlo", ring: "trial", quadrant: "Observability", notes: "Anomaly detection — value seen but cost rising" },
  { name: "Databricks Feature Store", ring: "trial", quadrant: "ML", notes: "Offline features only so far" },
  { name: "Snowflake Cortex", ring: "trial", quadrant: "AI", notes: "LLM in warehouse — experimenting" },
  { name: "Delta UniForm", ring: "trial", quadrant: "Formats", notes: "Iceberg interop — early days" },
  // ASSESS
  { name: "Apache Iceberg", ring: "assess", quadrant: "Formats", notes: "Evaluating as Delta alternative" },
  { name: "Dagster + Airbyte embedded", ring: "assess", quadrant: "Ingestion", notes: "Could replace Fivetran?" },
  { name: "Rust-based UDFs in Snowflake", ring: "assess", quadrant: "Platforms", notes: "Performance for hot paths" },
  { name: "DuckDB in CI", ring: "assess", quadrant: "Tools", notes: "Fast local dbt runs" },
  { name: "LangGraph for agentic DQ", ring: "assess", quadrant: "AI", notes: "Multi-step DQ triage agents" },
  { name: "Polars as PySpark replacement (small data)", ring: "assess", quadrant: "Tools", notes: "10× faster on small frames" },
  // HOLD
  { name: "Airflow 1.10", ring: "hold", quadrant: "Orchestration", notes: "Migrated to 2.x" },
  { name: "Immuta as primary RBAC", ring: "hold", quadrant: "Governance", notes: "Replaced by Unity Catalogue" },
  { name: "Looker (legacy dashboards)", ring: "hold", quadrant: "Analytics", notes: "Tableau won" },
  { name: "Manual ETL in Python", ring: "hold", quadrant: "Ingestion", notes: "Banned — use Fivetran" },
  { name: "EMR Spark", ring: "hold", quadrant: "Platforms", notes: "Databricks won" },
];

// ============================================================
// Evolution — Future roadmap
// ============================================================
export const ROADMAP = [
  {
    horizon: "Next quarter (Q1)",
    items: [
      { title: "Streaming-first Bronze (Kafka + Delta CDF)", impact: "Freshness 9min → 90s", risk: "medium" },
      { title: "Agentic DQ triage (LangGraph + LLM)", impact: "On-call load -40%", risk: "medium" },
      { title: "Migrate Airflow DAGs to Dagster assets (50%)", impact: "Native lineage", risk: "low" },
    ],
  },
  {
    horizon: "Next 2 quarters (H1)",
    items: [
      { title: "Snowflake Cortex for in-warehouse LLM", impact: "Semantic Q&A on dashboards", risk: "medium" },
      { title: "Delta UniForm (Iceberg interop)", impact: "Open format choice for consumers", risk: "low" },
      { title: "DuckDB in dbt CI (small models only)", impact: "CI runtime 4m → 1m", risk: "low" },
      { title: "Vector search on platform docs (RAG)", impact: "Onboarding time -50%", risk: "low" },
    ],
  },
  {
    horizon: "Next year (FY26)",
    items: [
      { title: "Agentic pipeline generation (NL → dbt model)", impact: "Pipeline delivery 2wk → 2d", risk: "high" },
      { title: "Cost-aware autonomous right-sizing", impact: "Cost -10% autonomously", risk: "medium" },
      { title: "Federated semantic layer (Cube + MetricFlow)", impact: "Cross-org metric consistency", risk: "medium" },
      { title: "Confidential compute on Bronze (SGX)", impact: "PII never decrypted in compute", risk: "high" },
    ],
  },
  {
    horizon: "Longer horizon (FY27+)",
    items: [
      { title: "Wasm-compiled PySpark (Rust + wasmtime)", impact: "10× faster ad-hoc", risk: "high" },
      { title: "Quantum-safe columnar encryption", impact: "Future-proofing for Q-Day", risk: "low (research)" },
      { title: "Self-healing pipelines (LLM + RL)", impact: "Failure recovery without human", risk: "high" },
      { title: "Carbon-aware scheduling (workload shift by grid CO₂)", impact: "−30% scope-2 emissions", risk: "medium" },
    ],
  },
];

// ============================================================
// Research Papers
// ============================================================
export interface Paper {
  id: string;
  title: string;
  authors: string;
  year: number;
  venue: string;
  topic: "storage" | "compute" | "modelling" | "governance" | "ml" | "architecture" | "streaming" | "devops";
  abstract: string;
  key_insight: string;
  implemented_in: string; // platform component / page id
  url: string;
  cites?: string[]; // ids of papers this cites
}

export const PAPERS: Paper[] = [
  {
    id: "p-dean2004",
    title: "MapReduce: Simplified Data Processing on Large Clusters",
    authors: "Dean, Ghemawat",
    year: 2004,
    venue: "OSDI",
    topic: "compute",
    abstract:
      "Programming model + implementation for processing large datasets on commodity clusters. Programmer specifies map + reduce; runtime parallelises, handles failures, sorts intermediate data.",
    key_insight:
      "Restrict the programming model → enable automatic parallelism + fault tolerance. Spark inherits this; Databricks runs it.",
    implemented_in: "Databricks (Spark runtime)",
    url: "https://research.google/pubs/pub62/",
  },
  {
    id: "p-zaharia2012",
    title: "Resilient Distributed Datasets (RDDs)",
    authors: "Zaharia et al.",
    year: 2012,
    venue: "NSDI",
    topic: "compute",
    abstract:
      "Distributed memory abstraction for cluster compute. RDDs are immutable, partitioned, fault-tolerant via lineage.",
    key_insight:
      "In-memory + lineage-based recovery → 10× faster than MapReduce for iterative workloads. Foundation of Spark.",
    implemented_in: "Databricks (Spark core)",
    url: "https://people.csail.mit.edu/matei/papers/2012/nsdi_spark.pdf",
  },
  {
    id: "p-armbrust2021",
    title: "Lakehouse: A New Generation of Open Platforms",
    authors: "Armbrust, Ghodsi, Xin",
    year: 2021,
    venue: "CIDR",
    topic: "architecture",
    abstract:
      "Combines ACID transactions, schema enforcement, governance from data warehouses with low-cost open formats from data lakes. Single platform for BI + ML.",
    key_insight:
      "Open table format (Delta) + metadata layer → warehouse semantics on lake storage. Eliminates the BI/ML split.",
    implemented_in: "Databricks Lakehouse (Bronze/Silver/Gold)",
    url: "https://www.cidrdb.org/cidr2021/papers/cidr2021_p04.pdf",
    cites: ["p-dean2004", "p-zaharia2012"],
  },
  {
    id: "p-armbrust2020",
    title: "Delta Lake: High-Performance ACID Table Storage Over Cloud Object Stores",
    authors: "Armbrust et al.",
    year: 2020,
    venue: "VLDB",
    topic: "storage",
    abstract:
      "Protocol for ACID transactions, time travel, schema enforcement, Z-ORDER, on top of cloud object stores.",
    key_insight:
      "Transaction log over Parquet files → ACID on S3/ADLS. Foundation of the Lakehouse pattern.",
    implemented_in: "Delta Lake (Bronze/Silver storage)",
    url: "https://arxiv.org/abs/1909.06391",
  },
  {
    id: "p-kimball1996",
    title: "The Data Warehouse Toolkit (Dimensional Modelling)",
    authors: "Kimball",
    year: 1996,
    venue: "Book",
    topic: "modelling",
    abstract:
      "Dimensional modelling: star schemas with conformed dimensions, fact tables at the right grain, slowly-changing dimensions (SCD Types 1, 2, 3, 4, 6).",
    key_insight:
      "Business users think in dimensions, not normalised 3NF. Star schemas are intuitive + fast. Still the Gold layer pattern.",
    implemented_in: "dbt marts (fct_orders, dim_customer, dim_product)",
    url: "https://www.wiley.com/en-us/The+Data+Warehouse+Toolkit%3A+The+Definitive+Guide+to+Dimensional+Modeling%2C+3rd+Edition-p-9781118530808",
  },
  {
    id: "p-inmon1992",
    title: "Building the Data Warehouse (3NF / CIF)",
    authors: "Inmon",
    year: 1992,
    venue: "Book",
    topic: "modelling",
    abstract:
      "Corporate Information Factory: normalised 3NF enterprise data warehouse with downstream data marts. Different from Kimball's bottom-up approach.",
    key_insight:
      "Top-down normalised EDW → consistent enterprise view. Heavy to build; complemented by Kimball for speed.",
    implemented_in: "Silver layer (conformed, 3NF-ish)",
    url: "https://www.wiley.com/en-us/Building+the+Data+Warehouse%2C+4th+Edition-p-9781118214380",
  },
  {
    id: "p-lattner2020",
    title: "MLIR: Scaling Compiler Infrastructure for Heterogeneous Compute",
    authors: "Lattner et al.",
    year: 2020,
    venue: "CIDL",
    topic: "compute",
    abstract:
      "Multi-level intermediate representation for compilers. Unifies dialects (TensorFlow, PyTorch, sparse, GPU) into a single IR.",
    key_insight:
      "Single IR for all compute → portable, optimisable. Databricks Photon uses similar layered-IR ideas for vectorised SQL.",
    implemented_in: "Databricks Photon (vectorised runtime)",
    url: "https://arxiv.org/abs/2002.11054",
  },
  {
    id: "p-agrawal2009",
    title: "The Gamma Database Architecture (data skipping)",
    authors: "Ailamaki, DeWitt, Hill",
    year: 2009,
    venue: "VLDB Journal",
    topic: "storage",
    abstract:
      "Data skipping via min/max statistics per file. Predicate pushdown at file level avoids reading irrelevant data.",
    key_insight:
      "Compute statistics at write time → skip files at read time. Implemented in Delta as data skipping + Z-ORDER.",
    implemented_in: "Delta Lake Z-ORDER + data skipping",
    url: "https://www.cs.cmu.edu/~natol/papers/vldbj.pdf",
  },
  {
    id: "p-stonebraker2007",
    title: "MapReduce and Parallel DBMS: Friends or Foes?",
    authors: "Stonebraker et al.",
    year: 2007,
    venue: "CIDR",
    topic: "architecture",
    abstract:
      "Argues parallel DBMS (e.g. Vertica) are 2-50× faster than MapReduce for structured queries, but MapReduce is more flexible for unstructured.",
    key_insight:
      "Don't use MapReduce when SQL will do. Spark SQL + Photon inherit this lesson — push SQL everywhere, fall back to code only when needed.",
    implemented_in: "Spark SQL over raw RDDs (preference for SQL)",
    url: "https://www.cs.cmu.edu/~pavlo/courses/pavlo-fall2009/files/mapreduce-vs-dbms-cidr09.pdf",
  },
  {
    id: "p-akidau2015",
    title: "The Dataflow Model",
    authors: "Akidau et al.",
    year: 2015,
    venue: "VLDB",
    topic: "streaming",
    abstract:
      "Unified model for batch + streaming with event-time, watermark, triggers, accumulation modes.",
    key_insight:
      "Streams and batches are the same model, just different trigger windows. Foundation of structured streaming (Spark/Delta).",
    implemented_in: "Spark Structured Streaming + Delta CDF",
    url: "https://research.google/pubs/pub43864/",
  },
  {
    id: "p-kleppmann2017",
    title: "Designing Data-Intensive Applications",
    authors: "Kleppmann",
    year: 2017,
    venue: "Book",
    topic: "architecture",
    abstract:
      "Covers distributed systems for data: replication, partitioning, transactions, consensus, consistency models.",
    key_insight:
      "Every architectural decision is a trade-off. Pick the right tool by understanding the underlying system trade-offs.",
    implemented_in: "All architectural decisions (see ADRs)",
    url: "https://dataintensive.net/",
  },
  {
    id: "p-bernstein2006",
    title: "Adostm: A Self-Managing Transaction Monitor",
    authors: "Bernstein, Newcomer",
    year: 2006,
    venue: "Book",
    topic: "storage",
    abstract:
      "Principles of ACID transactions, isolation levels, two-phase commit, optimisation for OLTP vs OLAP.",
    key_insight:
      "ACID guarantees are about isolation + durability — Delta's transaction log implements the same primitives on cloud object stores.",
    implemented_in: "Delta Lake transaction log (OCC)",
    url: "https://www.oreilly.com/library/view/principles-of-transaction/9780321442365/",
  },
  {
    id: "p-codd1970",
    title: "A Relational Model of Data for Large Shared Data Banks",
    authors: "Codd",
    year: 1970,
    venue: "CACM",
    topic: "modelling",
    abstract:
      "Original relational model paper. Tables, primary keys, foreign keys, normalisation. Foundation of SQL.",
    key_insight:
      "Data independence + declarative query language. Still the bedrock of every analytics platform 55 years later.",
    implemented_in: "Snowflake + Databricks SQL (every SQL surface)",
    url: "https://www.seas.upenn.edu/~zives/03f/cis550/codd.pdf",
  },
  {
    id: "p-beghm2011",
    title: "Apache Hive: Data Warehousing on Hadoop",
    authors: "Thusoo et al.",
    year: 2011,
    venue: "ICDE",
    topic: "modelling",
    abstract:
      "SQL-on-Hadoop using MapReduce underneath. Schema-on-read, partitioned tables, metastore.",
    key_insight:
      "Schema-on-read + metastore → cloud-native Lakehouse inheritance. Delta + Unity Catalogue are direct descendants.",
    implemented_in: "Bronze schema-on-read pattern",
    url: "https://research.cs.cornell.edu/zeno/Reading/Hive-ICDE.pdf",
  },
  {
    id: "p-schelter2018",
    title: "Automating Large-Scale Data Quality Verification (Great Expectations)",
    authors: "Schelter, Larsen",
    year: 2018,
    venue: "VLDB",
    topic: "governance",
    abstract:
      "Declarative, declarative DQ expectations with auto-profiling and validation. Inspired the Great Expectations library.",
    key_insight:
      "DQ rules should be versioned with data, run automatically, and produce machine-actionable verdicts — not be checklists run by humans.",
    implemented_in: "dbt tests + Great Expectations (Bronze gate)",
    url: "https://www.vldb.org/pvldb/vol11/p1781-schelter.pdf",
  },
  {
    id: "p-agrawal2004",
    title: "On Provenance in Data Warehousing (Lineage)",
    authors: "Buneman, Khanna, Tan",
    year: 2004,
    venue: "ICDE",
    topic: "governance",
    abstract:
      "Why-provenance + where-provenance + how-provenance: knowing not just what was produced, but what contributed to it.",
    key_insight:
      "Lineage at column level enables impact analysis + root-cause investigation. OpenLineage implements this as event protocol.",
    implemented_in: "OpenLineage (column-level lineage)",
    url: "https://www.cis.upenn.edu/~ktan/pubs/icde01.pdf",
  },
];

// ============================================================
// Knowledge Shorts — short-form technical explainers
// Styled like YouTube Shorts (vertical, swipeable, 60-sec reads).
// Inspired by https://www.youtube.com/@datamlistic/short
// ============================================================
export interface KnowledgeShort {
  id: string;
  title: string;        // ≤ 60 chars, hook-style
  topic: string;        // category label
  duration: string;     // e.g. "0:42"
  views: string;        // e.g. "12.4k"
  likes: string;
  body: string;         // the actual short explanation (3-5 sentences)
  key_takeaway: string; // one-liner the viewer remembers
  related_page: string; // platform page id where this knowledge is implemented
  accent: "emerald" | "amber" | "violet" | "cyan" | "yellow";
}

export const KNOWLEDGE_SHORTS: KnowledgeShort[] = [
  {
    id: "ks-1",
    title: "Why Bronze is append-only (and why you should care)",
    topic: "Architecture",
    duration: "0:48",
    views: "18.2k",
    likes: "1.4k",
    body:
      "Bronze is the raw layer — append-only, schema-on-read, no MERGE. Why? Because the moment you mutate Bronze, you lose the ability to re-run Silver idempotently. Bronze is your evidence locker — every row that ever arrived is still there. If you need to fix something, you don't overwrite — you add a Silver correction row that supersedes the Bronze fact.",
    key_takeaway: "Bronze = evidence. Silver = truth. Gold = business.",
    related_page: "databricks",
    accent: "emerald",
  },
  {
    id: "ks-2",
    title: "SCD2 in 60 seconds — slowly changing dimensions",
    topic: "Modelling",
    duration: "0:58",
    views: "24.7k",
    likes: "2.1k",
    body:
      "When a customer's segment changes from 'Standard' to 'VIP', you don't overwrite the old row — you close it (set valid_to) and open a new row with the new segment. Why? Because historical reporting needs to know what the segment was at the time of the order, not what it is now. SCD2 = surrogate key per attribute-window, valid_from + valid_to, point-in-time correct.",
    key_takeaway: "Don't overwrite history. Close it + open a new row.",
    related_page: "dbt",
    accent: "amber",
  },
  {
    id: "ks-3",
    title: "What is Delta Lake's transaction log actually doing?",
    topic: "Storage",
    duration: "0:52",
    views: "31.5k",
    likes: "3.2k",
    body:
      "Delta Lake is just Parquet files + a JSON transaction log. Every write appends a new version to the log; readers pick the latest committed version. ACID comes from optimistic concurrency: writers propose a commit, the log rejects if another writer got there first. Time travel is just 'read the log at version N'. Z-ORDER pre-sorts files so reads can skip 90%+ of files.",
    key_takeaway: "Delta = Parquet + JSON log. Everything else is optimisation.",
    related_page: "databricks",
    accent: "violet",
  },
  {
    id: "ks-4",
    title: "Snowflake RLS without 100 views — session context",
    topic: "Security",
    duration: "0:46",
    views: "14.8k",
    likes: "1.8k",
    body:
      "The naive approach: one SECURE VIEW per role per region (108 views for 9 markets × 12 roles). The right approach: ONE view + SESSION_CONTEXT('ROW_ACCESS_REGION'). When the user logs in via SSO, their SAML attributes drive SET ROW_ACCESS_REGION — the view filters rows by that session var. One view, infinite regions.",
    key_takeaway: "One view + session context beats 100 hand-coded views.",
    related_page: "snowflake",
    accent: "cyan",
  },
  {
    id: "ks-5",
    title: "dbt slim CI — run only what changed",
    topic: "DevOps",
    duration: "0:54",
    views: "22.3k",
    likes: "2.6k",
    body:
      "Full dbt build on every PR = 14 minutes. Slim CI = compare the new manifest against the previous one, run only state:modified+ (changed models + downstream). Run drops to ~4 minutes. State is stored as a manifest.json uploaded to S3 on every merge to main. CI pulls it, defers, runs only what's needed.",
    key_takeaway: "State-aware CI: run only what changed + downstream.",
    related_page: "cicd",
    accent: "emerald",
  },
  {
    id: "ks-6",
    title: "Medallion isn't a religious choice — it's a layering rule",
    topic: "Architecture",
    duration: "0:38",
    views: "9.1k",
    likes: "870",
    body:
      "Bronze (raw), Silver (conformed), Gold (dimensional). The rule: each layer has exactly one job, and you can't skip layers. If Silver starts doing Gold's work (e.g. joining facts to dims), you lose rerun-safety. The rule isn't religious — it's the only way to keep the platform debuggable at scale.",
    key_takeaway: "Bronze→Silver→Gold isn't optional. Skipping = debugging hell.",
    related_page: "databricks",
    accent: "amber",
  },
  {
    id: "ks-7",
    title: "What is Unity Catalogue actually tagging?",
    topic: "Governance",
    duration: "0:50",
    views: "11.6k",
    likes: "1.2k",
    body:
      "Unity Catalogue tags are labels you apply to columns: 'pii=true', 'pii.email=true', 'criticality=gold'. They're consumed by everything downstream — Hightouch masks tagged columns in reverse-ETL, Tableau enforces RLS via tagged dimensions, Monte Carlo's anomaly detectors skip tagged stable columns. One tag, five consumers.",
    key_takeaway: "Tag once, enforce everywhere. PII never leaks.",
    related_page: "governance",
    accent: "violet",
  },
  {
    id: "ks-8",
    title: "Reverse-ETL — push governed audiences back to business tools",
    topic: "Activation",
    duration: "0:42",
    views: "16.9k",
    likes: "1.7k",
    body:
      "ETL brings data in. Reverse-ETL pushes governed data out — your CRM, your CDP, your ad platforms. The trick: define the audience as a SQL model in Snowflake (versioned in Git), let Hightouch upsert into Salesforce. The same definition feeds Tableau (BI) and Klaviyo (activation) — no drift.",
    key_takeaway: "Define once in SQL. Sync to many. No drift.",
    related_page: "fivetran-hightouch",
    accent: "cyan",
  },
  {
    id: "ks-9",
    title: "Why we still use Airflow AND Dagster (hybrid)",
    topic: "Orchestration",
    duration: "0:55",
    views: "8.7k",
    likes: "940",
    body:
      "Airflow has the best operators (FivetranOperator, SnowflakeOperator). Dagster has the best asset graph (native lineage + partitions). Neither alone is perfect. The hybrid: Airflow for batch schedules (time-driven), Dagster for asset-backed workloads (asset-driven). Both emit OpenLineage events. The mental model isn't 'pick one' — it's 'use the right tool per workload'.",
    key_takeaway: "Airflow for time. Dagster for assets. Both emit lineage.",
    related_page: "orchestration",
    accent: "yellow",
  },
  {
    id: "ks-10",
    title: "The semantic layer — why metrics drift without it",
    topic: "Analytics",
    duration: "0:51",
    views: "19.4k",
    likes: "2.3k",
    body:
      "Without a semantic layer, every BI tool defines revenue slightly differently. Tableau's revenue ≠ Looker's revenue ≠ Hightouch's revenue. The semantic layer (MetricFlow) defines each metric once in YAML — measures, dimensions, derived metrics. All consumers read from it. Metric drift becomes structurally impossible.",
    key_takeaway: "Define the metric once. Read it everywhere. No drift.",
    related_page: "dbt",
    accent: "emerald",
  },
];
