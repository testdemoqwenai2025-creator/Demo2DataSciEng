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
