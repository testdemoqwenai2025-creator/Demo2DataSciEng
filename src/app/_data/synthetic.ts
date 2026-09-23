/**
 * Synthetic reference data for the Northwind Retail Data Platform.
 *
 * All numbers, schemas, pipelines and dashboards below are HYPOTHETICAL and
 * synthetic — designed to illustrate the architecture, not to reflect any
 * real company. Northwind Retail Ltd. is a fictional omnichannel retailer.
 *
 * Headline business (synthetic):
 *   - 4.2M customers across 9 markets
 *   - 48k SKUs across 14 product categories
 *   - 11.8M orders / yr (web + POS + marketplace)
 *   - £612M gross revenue FY25
 */

export const COMPANY = {
  name: "Northwind Retail Ltd",
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
    location: "s3://northwind-bronze/",
    format: "Delta (raw)",
    tables: 142,
    volume: "8.4 TB / mo",
    pipelines: "Fivetran + Snowplow + Kafka",
  },
  {
    layer: "Silver",
    purpose: "Conformed, deduplicated, validated, joined to dims",
    location: "s3://northwind-silver/",
    format: "Delta (managed, OPTIMISE every 2h)",
    tables: 86,
    volume: "3.1 TB / mo",
    pipelines: "PySpark + Delta MERGE",
  },
  {
    layer: "Gold",
    purpose: "Business-level aggregates, dimensional marts, ML features",
    location: "s3://northwind-gold/ + Snowflake SERVING",
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
  { principal: "data_engineers", object: "catalog.northwind_bronze", grants: "READ, WRITE", type: "Group" },
  { principal: "analysts_uk", object: "catalog.northwind_gold.sales", grants: "SELECT", type: "Group" },
  { principal: "dbt_service", object: "catalog.northwind_silver", grants: "USE, READ, WRITE", type: "Service Principal" },
  { principal: "compliance", object: "catalog.northwind_gold.sales.pii", grants: "SELECT (with tag PII=true)", type: "Group" },
  { principal: "ml_platform", object: "catalog.northwind_ml.features", grants: "READ, WRITE, CREATE MODEL", type: "Group" },
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
