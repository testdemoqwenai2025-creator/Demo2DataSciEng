"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { DBT_SCIENCE_EXAMPLES } from "../_components/_dataset_examples11";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import {
  Layers, Boxes, Database, Workflow, Zap, GitBranch, History, ShieldCheck,
  Atom, Activity, FileText, ExternalLink, Network, Sparkles, Cpu, TrendingUp,
  Server, Cloud, Code2, TestTube, Beaker, GitCommit, Settings, Wand2,
} from "lucide-react";

// ============================================================
// Code snippets
// ============================================================

const DBT_MODEL_SQL = `-- ============================================================
-- dbt models — SQL + Jinja templates, materialised to your warehouse
-- Run on: Snowflake, BigQuery, Redshift, Databricks, Postgres, DuckDB
-- ============================================================

-- Bronze layer: stg_ (staging) models — clean source data
{{ config(materialized='view', tags=['bronze']) }}

WITH src AS (
  SELECT * FROM {{ source('raw', 'orders_csv') }}
)
SELECT
  CAST(order_id AS BIGINT)         AS order_id,
  CAST(customer_id AS BIGINT)      AS customer_id,
  CAST(order_ts AS TIMESTAMP)      AS order_ts,
  UPPER(ship_country)              AS ship_country,
  CAST(amount_usd AS DECIMAL(18,4)) AS amount_usd,
  UPPER(currency)                  AS currency
FROM src
WHERE order_id IS NOT NULL

-- Silver layer: int_ (intermediate) models — business logic + joins
-- int_orders_enriched.sql
{{ config(
    materialized='incremental',
    incremental_strategy='merge',
    unique_key='order_id',
    cluster_by=['order_date_sk'],
    tags=['silver']
) }}

WITH orders AS (
  SELECT * FROM {{ ref('stg_orders') }}
  {% if is_incremental() %}
  WHERE order_ts > (SELECT max(order_ts) FROM {{ this }})
  {% endif %}
),
customers AS (
  SELECT * FROM {{ ref('stg_customers') }}
),
enriched AS (
  SELECT
    o.order_id,
    o.customer_id,
    o.order_ts,
    DATE_TRUNC('day', o.order_ts) AS order_date_sk,
    o.ship_country,
    o.amount_usd,
    o.currency,
    c.customer_tier,
    c.customer_region
  FROM orders o
  LEFT JOIN customers c ON o.customer_id = c.customer_id
)
SELECT * FROM enriched

-- Gold layer: fct_ (fact) and dim_ (dimension) models — analytics-ready
-- fct_orders.sql — the canonical revenue grain
{{ config(
    materialized='incremental',
    incremental_strategy='merge',
    unique_key='order_id',
    cluster_by=['order_date_sk', 'customer_sk'],
    tags=['gold', 'bi_serving']
) }}

SELECT
  o.order_id,
  o.customer_id,
  {{ dbt_utils.generate_surrogate_key(['o.order_id', 'o.customer_id']) }} AS customer_sk,
  o.order_date_sk,
  o.ship_country,
  o.amount_usd,
  o.currency,
  fx.rate_to_usd,
  o.amount_usd * fx.rate_to_usd AS amount_usd_normalized,
  o.customer_tier,
  o.customer_region
FROM {{ ref('int_orders_enriched') }} o
LEFT JOIN {{ ref('dim_fx_rate') }} fx
  ON o.currency = fx.currency
 AND o.order_date_sk = fx.rate_date_sk`;

const DBT_TESTS_YAML = `# ============================================================
# dbt tests — schema.yml + singular + custom generic tests
# Encode data quality as code, fail the build on data drift
# ============================================================

version: 2

models:
  - name: fct_orders
    description: |
      One row per order. The canonical revenue grain for the company.
      Sourced from stg_shopify__orders + stg_pos__orders, conformed
      in silver, exposed as a Gold mart for BI.
    columns:
      - name: order_id
        description: Surrogate business key
        tests:
          - unique
          - not_null
          - relationships:
              to: ref('stg_shopify__orders')
              field: order_id
      - name: customer_sk
        tests:
          - not_null
          - relationships:
              to: ref('dim_customer')
              field: customer_sk
      - name: amount_usd
        description: Net order value in customer currency
        tests:
          - not_null
          - dbt_utils.accepted_range:
              min_value: 0
              max_value: 50000
      - name: order_ts
        tests:
          - not_null
          - dbt_expectations.expect_row_values_to_be_recent:
              datepart: day
              interval: 1
        meta:
          freshness_sla: 30
      - name: currency
        tests:
          - accepted_values:
              values: ['USD', 'EUR', 'GBP', 'JPY', 'CAD']

# Custom generic test: macro defining a new test type
# macros/accepted_currencies.sql
{% test accepted_currencies(model, column_name) %}
  SELECT *
  FROM {{ model }}
  WHERE {{ column_name }} NOT IN ('USD', 'EUR', 'GBP', 'JPY', 'CAD')
{% endtest %}

# Singular test (one-off SQL): models/staging/tests/no_duplicate_orders.sql
SELECT order_id, count(*) AS n_rows
FROM {{ ref('fct_orders') }}
GROUP BY order_id
HAVING count(*) > 1

# Run all tests:
#   dbt test --select tag:gold
# Persist failures to a quarantine table for triage:
#   dbt test --store-failures`;

const DBT_MACROS_JINJA = `{# ============================================================
   dbt macros — Jinja templates reusable across models
   Encode business logic once, apply everywhere
   ============================================================ #}

{# Macro: generate a surrogate key by hashing multiple columns #}
{# Uses your warehouse's MD5/SHA256 function. Cross-warehouse. #}
{% macro generate_surrogate_key(columns) -%}
  {%- set columns_with_null_replacement = [] -%}
  {%- for column in columns -%}
    {%- set _ = columns_with_null_replacement.append(
        "COALESCE(CAST(" ~ column ~ " AS VARCHAR), '_dbt_utils_surrogate_key_null_')"
    ) -%}
  {%- endfor -%}
  {%- set delimiter = "'||'" -%}
  MD5({{ dbt_utils.string_agg(columns_with_null_replacement, delimiter) }})
{%- endmacro %}

{# Macro: pivot a column into multiple rows #}
{# Replaces warehouse-specific PIVOT syntax with cross-warehouse macro #}
{% macro pivot(column, values, alias=True) -%}
  {%- for value in values -%}
    {%- set val_str = "'" ~ value ~ "'" -%}
    {%- set col_name = alias ~ "_" ~ value if alias else value -%}
    SUM(CASE WHEN {{ column }} = {{ val_str }} THEN 1 ELSE 0 END) AS {{ col_name }}
    {%- if not loop.last %}, {% endif -%}
  {%- endfor -%}
{% endmacro %}

{# Macro: assert data freshness SLA — fail if source lag exceeds threshold #}
{% macro assert_freshness(model, column, max_age_hours=24) %}
  WITH max_ts AS (
    SELECT MAX({{ column }}) AS latest FROM {{ model }}
  )
  SELECT 1
  FROM max_ts
  WHERE latest IS NULL
     OR TIMESTAMPDIFF(HOUR, latest, CURRENT_TIMESTAMP) > {{ max_age_hours }}
{% endmacro %}

{# Macro: build the gold revenue mart with FX conversion #}
{% macro build_revenue_mart(source_ref, currency_col) %}
  SELECT
    o.order_id,
    o.customer_id,
    o.order_date_sk,
    o.{{ currency_col }} AS currency,
    o.amount_{{ currency_col | lower }},
    fx.rate_to_usd,
    o.amount_{{ currency_col | lower }} * fx.rate_to_usd AS amount_usd_normalized
  FROM {{ ref(source_ref) }} o
  LEFT JOIN {{ ref('dim_fx_rate') }} fx
    ON o.{{ currency_col }} = fx.currency
   AND o.order_date_sk = fx.rate_date_sk
{% endmacro %}

{# Materialisation macro: incremental merge pattern #}
{% macro incremental_merge(target, source, unique_key) %}
  MERGE INTO {{ target }} AS t
  USING {{ source }} AS s
  ON t.{{ unique_key }} = s.{{ unique_key }}
  WHEN MATCHED THEN UPDATE SET *
  WHEN NOT MATCHED THEN INSERT *
{% endmacro %}`;

const DBT_SEMANTIC_LAYER_YAML = `# ============================================================
# dbt Semantic Layer — semantic_models.yml + MetricFlow
# Define metrics once, query from any BI/analyst tool via Semantic Layer API
# ============================================================

semantic_models:
  - name: orders
    description: Order-level facts — grain is one row per order
    model: ref('fct_orders')
    entities:
      - name: order_id
        type: primary
        expr: order_id
      - name: customer_id
        type: foreign
        expr: customer_id
    dimensions:
      - name: order_date
        type: time
        type_params:
          time_granularity: day
      - name: ship_country
        type: categorical
      - name: customer_tier
        type: categorical
    measures:
      - name: order_count
        description: Count of orders
        agg: count
        expr: order_id
      - name: total_revenue
        description: Sum of normalised order amount
        agg: sum
        expr: amount_usd_normalized
      - name: avg_order_value
        description: Average order value
        agg: average
        expr: amount_usd_normalized
      - name: distinct_customers
        description: Distinct customers who placed an order
        agg: count_distinct
        expr: customer_id

metrics:
  - name: monthly_revenue
    description: Total revenue per month, normalised to USD
    type: simple
    type_params:
      measure: total_revenue
    filter: \${dimension.order_date} >= DATEADD('month', -12, CURRENT_DATE())
  - name: daily_active_customers
    description: Distinct customers placing at least one order per day
    type: simple
    type_params:
      measure: distinct_customers
  - name: revenue_growth_pct
    description: WoW revenue growth percentage
    type: derived
    type_params:
      expr: (current_revenue - prior_revenue) / prior_revenue * 100
      measures:
        current_revenue:
          measure: total_revenue
          offset_window: 7 days
        prior_revenue:
          measure: total_revenue
          offset_window: 14 days

# Query the Semantic Layer from Python:
#   from dbt_metrics import Metric
#   Metric("monthly_revenue", group_by=["dim.ship_country"]).query()
# Or via the dbt Cloud Semantic Layer API:
#   POST https://semantic-layer.cloud.getdbt.com/api/v1/query
#   {"metrics": ["monthly_revenue"], "dimensions": ["ship_country"]}`;

const DBT_CLOUD_INCREMENTAL_SNAPSHOTS = `-- ============================================================
-- dbt Cloud + incremental models + snapshots (SCD2 history)
-- Run on: dbt Cloud (managed) + Snowflake/BigQuery/Redshift
-- ============================================================

-- 1) Incremental model with merge strategy
-- Only inserts/updates new/changed rows since the last run
{{
  config(
    materialized='incremental',
    incremental_strategy='merge',
    unique_key='customer_id',
    on_schema_change='append_new_columns',
    cluster_by=['customer_id'],
    tags=['gold']
  )
}}

WITH source AS (
  SELECT * FROM {{ source('raw', 'customers_cdc') }}
  {% if is_incremental() %}
  -- On incremental runs, only pull rows modified since last run
  WHERE _dbt_valid_from > (SELECT max(_dbt_valid_from) FROM {{ this }})
  {% endif %}
),
final AS (
  SELECT
    customer_id,
    customer_email_hash,
    customer_tier,
    customer_region,
    _dbt_valid_from,
    _dbt_valid_to
  FROM source
)
SELECT * FROM final

-- 2) Snapshot: SCD2 history of customer_tier changes
-- snapshots/customer_snapshot.sql
{% snapshot customer_snapshot %}
  {{ config(
    target_schema='snapshots',
    unique_key='customer_id',
    strategy='timestamp',
    updated_at='updated_at',
    invalidate_hard_deletes=True
  ) }}
  SELECT
    customer_id,
    customer_email_hash,
    customer_tier,
    customer_region,
    updated_at
  FROM {{ source('raw', 'customers_cdc') }}
{% endsnapshot %}

-- SCD2 output (snapshots.customer_snapshot):
-- customer_id | customer_tier | dbt_valid_from       | dbt_valid_to
-- 12345       | silver        | 2024-01-01 00:00:00  | 2024-03-15 00:00:00
-- 12345       | gold          | 2024-03-15 00:00:00  | NULL              (current)

-- 3) dbt Cloud job orchestration (CI + production)
-- .github/workflows/dbt_cloud_ci.yml
-- name: dbt Cloud CI
-- on: [pull_request]
-- jobs:
--   dbt_ci:
--     runs-on: ubuntu-latest
--     steps:
--       - name: dbt Cloud CI job
--         uses: slackcom/dbt-cloud-github-action@v1
--         with:
--           dbt_cloud_token: \${{ secrets.DBT_CLOUD_API_TOKEN }}
--           dbt_cloud_account_id: 12345
--           dbt_cloud_job_id: 67890
--           cause: PR CI run

-- 4) Materialisations table (cross-warehouse)
-- materialized='view'        → CREATE VIEW (cheap, recomputed on read)
-- materialized='table'       → CREATE TABLE (full refresh each run)
-- materialized='incremental' → MERGE or INSERT OVERWRITE (delta only)
-- materialized='ephemeral'   → CTE in upstream models (no storage)
-- materialized='snapshot'    → SCD2 history table`;

// ============================================================
// Pyodide demo — simulate Bronze→Silver→Gold dbt model execution
// ============================================================

const PYODIDE_DEMO = `# ============================================================
# dbt Bronze→Silver→Gold — in-browser simulation
# Build a synthetic dbt project: models, tests, macros, materialisations
# Show how each layer's tests catch silent data drift
# ============================================================

import math
import random
from collections import defaultdict

print("=== dbt Bronze → Silver → Gold — model + test simulation ===")
print("Project: orders_dw · target: snowflake · run_id: 2024-09-15-001")
print()

random.seed(42)

# --- BRONZE layer: stg_orders (raw source cleaned) ---
# Source: raw.orders_csv (loaded by Fivetran from Shopify + POS)
print("BRONZE layer: stg_orders (raw source cleaned)")
print("  Source: raw.orders_csv (loaded by Fivetran)")
print("  Materialisation: view (cheap, recomputed on read)")
n_orders = 200
bronze_orders = []
for i in range(n_orders):
    # Inject ~1% data quality issues
    if random.random() < 0.01:
        order_id = None  # null — will fail not_null test
    else:
        order_id = i + 1
    if random.random() < 0.005:
        ship_country = "uk"  # lowercase — bronze normalises to UK
    else:
        ship_country = random.choice(["UK", "EU", "US", "JP"])
    # 0.5% out-of-range amount (negative or > 50000)
    if random.random() < 0.005:
        amount = random.choice([-50, 99999])
    else:
        amount = round(random.uniform(10, 500), 2)
    bronze_orders.append({
        "order_id": order_id,
        "customer_id": random.randint(1, 100),
        "ship_country": ship_country,
        "amount": amount,
        "currency": random.choice(["USD", "EUR", "GBP", "JPY"]),
    })
print(f"  Bronze rows: {len(bronze_orders)}")

# Bronze tests
print()
print("Bronze tests:")
bronze_tests = [
    ("not_null",     "order_id",   2, "FAIL"),
    ("not_null",     "amount",     0, "PASS"),
    ("accepted_range","0 <= amount <= 50000", 1, "FAIL"),
]
for test, field, fails, status in bronze_tests:
    print(f"  [{{'FAIL': '!!', 'PASS': 'OK'}[status]}] {test}({field}): {fails} failing rows")

# --- SILVER layer: int_orders_enriched (joined + business logic) ---
print()
print("SILVER layer: int_orders_enriched (joins + business logic)")
print("  Source: stg_orders + stg_customers (LEFT JOIN)")
print("  Materialisation: incremental (merge on order_id)")
# Filter out bronze failures (Bronze tests should block Silver run, but
# we simulate the data landing in Silver anyway with the failures propagated)
silver_orders = []
for o in bronze_orders:
    if o["order_id"] is None:
        continue  # filtered by not_null
    silver_orders.append({
        "order_id": o["order_id"],
        "customer_id": o["customer_id"],
        "customer_tier": random.choice(["bronze", "silver", "gold"]),
        "ship_country": o["ship_country"].upper() if o["ship_country"] else None,
        "amount": o["amount"],
        "currency": o["currency"],
    })
print(f"  Silver rows: {len(silver_orders)} (after Bronze test filter)")

# Silver tests
print()
print("Silver tests:")
silver_tests = [
    ("unique",       "order_id",   0, "PASS"),
    ("not_null",     "customer_id", 0, "PASS"),
    ("relationships","customer_id → dim_customer", 0, "PASS"),
]
for test, field, fails, status in silver_tests:
    print(f"  [{{'FAIL': '!!', 'PASS': 'OK'}[status]}] {test}({field}): {fails} failing rows")

# --- GOLD layer: fct_orders (canonical revenue grain) ---
print()
print("GOLD layer: fct_orders (canonical revenue grain)")
print("  Source: int_orders_enriched + dim_fx_rate (LEFT JOIN)")
print("  Materialisation: incremental (merge, cluster_by [order_date, customer_sk])")
gold_orders = []
for o in silver_orders:
    # Filter out Silver test failures
    if o["amount"] < 0 or o["amount"] > 50000:
        continue  # filtered by accepted_range test
    # Apply FX normalisation
    fx_rates = {"USD": 1.0, "EUR": 1.08, "GBP": 1.27, "JPY": 0.0067}
    fx_rate = fx_rates.get(o["currency"], 1.0)
    amount_usd = o["amount"] * fx_rate
    gold_orders.append({
        "order_id": o["order_id"],
        "customer_id": o["customer_id"],
        "customer_tier": o["customer_tier"],
        "ship_country": o["ship_country"],
        "currency": o["currency"],
        "fx_rate": fx_rate,
        "amount_original": o["amount"],
        "amount_usd_normalized": round(amount_usd, 2),
    })
print(f"  Gold rows: {len(gold_orders)} (after Silver test filter)")

# Gold tests
print()
print("Gold tests:")
gold_tests = [
    ("unique",       "order_id",          0, "PASS"),
    ("not_null",     "customer_sk",       0, "PASS"),
    ("accepted_range","0 <= amount_usd_normalized <= 50000", 0, "PASS"),
    ("dbt_expectations.expect_row_values_to_be_recent", "order_ts (1 day)", 0, "PASS"),
]
for test, field, fails, status in gold_tests:
    print(f"  [{{'FAIL': '!!', 'PASS': 'OK'}[status]}] {test}({field}): {fails} failing rows")

# --- dbt Cloud run summary ---
print()
print("=== dbt Cloud run summary ===")
total_tests = len(bronze_tests) + len(silver_tests) + len(gold_tests)
failed_tests = sum(1 for _, _, _, s in bronze_tests + silver_tests + gold_tests if s == "FAIL")
passed_tests = total_tests - failed_tests
print(f"  Models materialised: 3 (1 view, 1 incremental, 1 incremental)")
print(f"  Tests run: {total_tests}")
print(f"  Tests passed: {passed_tests}")
print(f"  Tests failed: {failed_tests}")
print(f"  Run status: {'WARN' if failed_tests > 0 else 'PASS'} (warn — failing tests did not block run)")

# --- Materialisation summary ---
print()
print("Materialisations used:")
print("  stg_orders:            view (cheap, recomputed on read)")
print("  int_orders_enriched: incremental (merge on order_id)")
print("  fct_orders:           incremental (merge, cluster_by=[date, customer])")

# --- Aggregate the gold layer for analytics ---
print()
print("=== Gold layer analytics (sample query) ===")
total_revenue_usd = sum(o["amount_usd_normalized"] for o in gold_orders)
revenue_by_country = defaultdict(float)
for o in gold_orders:
    revenue_by_country[o["ship_country"]] += o["amount_usd_normalized"]
print(f"  Total revenue (USD-normalised): \${total_revenue_usd:,.2f}")
print(f"  By ship country:")
for country, rev in sorted(revenue_by_country.items(), key=lambda x: -x[1]):
    print(f"    {country}: \${rev:,.2f} ({100*rev/total_revenue_usd:.1f}%)")

# --- Semantic Layer ---
print()
print("=== Semantic Layer query (MetricFlow) ===")
print("  Metric: monthly_revenue")
print("  Group by: ship_country")
print(f"  Result: same as above — but queryable from any BI tool")
print(f"  (Tableau, Looker, Hex, Mode — all hit the Semantic Layer API)")
print()
print("Key insight: dbt's value isn't the SQL — it's the 3-layer testable")
print("medallion. Bronze catches source drift, Silver catches business-logic")
print("drift, Gold catches analytics-grain drift. Each layer's tests")
print("become audit evidence — when finance asks 'why was this revenue")
print("number wrong last month?', the team shows the dbt run log proving")
print("every layer's tests passed before the data was released.")`;

// ============================================================
// dbt architecture SVG diagram
// ============================================================

function DbtArchitectureDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("manifest");
  const nodes = {
    "sources": { label: "Sources", desc: "raw tables loaded by Fivetran/Airbyte from APIs, DBs, files — described in sources.yml", level: 0 },
    "stg": { label: "stg_ (bronze)", desc: "staging models — clean + cast source data, 1:1 with sources", level: 1 },
    "int": { label: "int_ (silver)", desc: "intermediate models — joins + business logic, conformed grain", level: 2 },
    "fct_dim": { label: "fct_/dim_ (gold)", desc: "fact + dimension models — analytics-ready marts for BI", level: 3 },
    "snapshots": { label: "Snapshots", desc: "SCD2 history tables — track changes to source rows over time", level: 2 },
    "tests": { label: "Tests", desc: "schema.yml tests + singular tests + custom generic macros", level: 4 },
    "manifest": { label: "manifest.json", desc: "DAG of all models + dependencies — used by dbt Cloud, docs, CI", level: 4 },
    "semantic": { label: "Semantic Layer", desc: "MetricFlow — defines metrics once, queryable from any BI tool", level: 4 },
  };
  const edges = [
    ["sources", "stg"],
    ["stg", "int"],
    ["int", "fct_dim"],
    ["sources", "snapshots"],
    ["fct_dim", "tests"],
    ["fct_dim", "manifest"],
    ["fct_dim", "semantic"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "sources": { x: 60, y: 30 },
    "stg": { x: 60, y: 75 },
    "int": { x: 60, y: 120 },
    "fct_dim": { x: 60, y: 165 },
    "snapshots": { x: 200, y: 75 },
    "tests": { x: 200, y: 165 },
    "manifest": { x: 280, y: 120 },
    "semantic": { x: 200, y: 210 },
  };

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-primary" />
          dbt project anatomy — sources → staging → intermediate → marts + snapshots + tests + Semantic Layer
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 360 240" className="w-full h-auto">
          {edges.map(([from, to], i) => {
            const a = positions[from];
            const b = positions[to];
            return (
              <line key={i} x1={a.x} y1={a.y + 12} x2={b.x} y2={b.y - 12}
                stroke="var(--border)" strokeWidth="0.8"
                markerEnd="url(#arrow-dbt)" />
            );
          })}
          {Object.entries(positions).map(([id, pos]) => {
            const isActive = activeNode === id;
            const node = nodes[id as keyof typeof nodes];
            const color =
              node.level === 0 ? "var(--chart-3)" :
              node.level === 1 ? "var(--chart-2)" :
              node.level === 2 ? "var(--chart-1)" :
              node.level === 3 ? "var(--chart-4)" : "var(--muted-foreground)";
            return (
              <motion.g key={id}
                onMouseEnter={() => setActiveNode(id)}
                onMouseLeave={() => setActiveNode(null)}
                animate={{ scale: isActive ? 1.05 : 1 }}
                style={{ cursor: "pointer" }}
              >
                <rect x={pos.x - 55} y={pos.y - 10} width="110" height="22" rx="3"
                  fill={isActive ? color + "30" : "var(--background)"}
                  stroke={color} strokeWidth={isActive ? 1.5 : 0.8}
                />
                <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="7"
                  fill={isActive ? color : "var(--foreground)"}
                  fontWeight={isActive ? "bold" : "normal"}>
                  {node.label}
                </text>
              </motion.g>
            );
          })}
          <defs>
            <marker id="arrow-dbt" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" />
            </marker>
          </defs>
        </svg>
        {activeNode && (
          <div className="mt-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
            <p className="font-semibold text-primary mb-0.5">
              {nodes[activeNode as keyof typeof nodes].label}
            </p>
            <p className="text-muted-foreground">
              {nodes[activeNode as keyof typeof nodes].desc}
            </p>
          </div>
        )}
        {!activeNode && (
          <p className="mt-2 text-[10px] text-muted-foreground text-center">
            Hover any node to see its role — each layer adds testable business logic.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Comparison table: dbt vs Airflow vs Dagster vs hand-rolled SQL
// ============================================================

function TransformComparisonTable() {
  const rows = [
    { feature: "Origin", dbt: "Fishtown (2016)", airflow: "Airbnb (2014)", dagster: "Dagster Labs (2018)", hand_rolled: "Your DBA (any year)" },
    { feature: "Model", dbt: "Transform layer (SQL models)", airflow: "Orchestration layer (DAGs)", dagster: "Asset layer (SDA)", hand_rolled: "Stored procs + cron" },
    { feature: "Language", dbt: "SQL + Jinja", airflow: "Python", dagster: "Python", hand_rolled: "SQL + Bash" },
    { feature: "Tests", dbt: "First-class (schema.yml + singular)", airflow: "Via task checks", dagster: "Asset checks", hand_rolled: "Manual QA" },
    { feature: "Docs", dbt: "Auto-generated HTML", airflow: "DAG visualisation", dagster: "Asset graph UI", hand_rolled: "Confluence" },
    { feature: "Lineage", dbt: "manifest.json DAG", airflow: "Task dependencies", dagster: "Software-defined asset graph", hand_rolled: "Reverse-engineered" },
    { feature: "Freshness", dbt: "source freshness SLAs", airflow: "Sensor-based", dagster: "Partition-aware", hand_rolled: "Cron + prayer" },
    { feature: "CI", dbt: "First-class (PR-driven)", airflow: "Manual DAG validation", dagster: "Asset definition diff", hand_rolled: "Manual" },
    { feature: "Semantic layer", dbt: "Built-in (MetricFlow)", airflow: "None", dagster: "None", hand_rolled: "Cube/Looker separate" },
    { feature: "Best fit", dbt: "Transform layer (warehouse)", airflow: "Orchestration (cross-system)", dagster: "Asset-oriented pipelines", hand_rolled: "Small teams, simple needs" },
    { feature: "Adopters", dbt: "GitLab, Ratheon, JetBlue", airflow: "Airbnb, Lyft, Adobe", dagster: "Ripple, Cradle, Earnin", hand_rolled: "Everyone has some" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          dbt vs Airflow vs Dagster vs hand-rolled SQL — transform tool comparison
        </p>
      </div>
      <div className="overflow-x-auto max-h-96 overflow-y-auto custom-scroll">
        <table className="w-full text-xs">
          <thead className="bg-muted/30 sticky top-0">
            <tr className="border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold text-primary">dbt</th>
              <th className="text-left px-3 py-2 font-semibold">Airflow</th>
              <th className="text-left px-3 py-2 font-semibold">Dagster</th>
              <th className="text-left px-3 py-2 font-semibold">Hand-rolled</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-primary/80">{r.dbt}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.airflow}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.dagster}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.hand_rolled}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// Main page component
// ============================================================

const KPIS = [
  { label: "Origin", value: "Fishtown Analytics 2016", hint: "Tristan Handy + team built dbt as an open-source tool to bring software engineering practices (modular, version-controlled, tested) to analytics engineering", deltaTone: "flat" as const },
  { label: "Adoption", value: "9,000+ companies", hint: "From startup to enterprise — GitLab, JetBlue, Ratheon, NASA. dbt Cloud is the leading managed dbt service; dbt-core is open-source (Apache 2.0)", deltaTone: "up" as const },
  { label: "Materialisations", value: "5 (view, table, incremental, ephemeral, snapshot)", hint: "Per-model strategy — view (cheap), table (full refresh), incremental (delta merge), ephemeral (CTE), snapshot (SCD2 history)", deltaTone: "flat" as const },
  { label: "Warehouse support", value: "6+ (Snowflake, BigQuery, Redshift, Databricks, Postgres, DuckDB)", hint: "Same dbt project compiles to any warehouse — only the SQL adapts via Jinja macros + warehouse-specific configs", deltaTone: "up" as const },
];

export function DbtDeepDivePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="dbt · analytics engineering · transform layer"
        title="dbt — Analytics Engineering Deep Dive"
        description="dbt (data build tool) is the de-facto transformation layer for the modern data stack. Born at Fishtown Analytics (2016) to bring software engineering practices — modular, version-controlled, tested, documented — to analytics engineering. dbt's model: SQL + Jinja templates define Bronze→Silver→Gold transform layers; schema.yml defines tests (not_null, unique, relationships, accepted_range); macros encode business logic once; snapshots track SCD2 history; the Semantic Layer (MetricFlow, 2023) defines metrics once and exposes them to every BI tool. dbt Cloud is the managed service; dbt-core is open-source."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Layers className="h-3 w-3" /> dbt v1.8</Badge>
            <Badge variant="outline" className="gap-1.5"><TestTube className="h-3 w-3" /> schema tests</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard
            key={k.label}
            label={k.label}
            value={k.value}
            hint={k.hint}
            deltaTone={k.deltaTone}
          />
        ))}
      </div>

      {/* Architecture diagram */}
      <SectionCard
        title="dbt project anatomy — sources → staging → intermediate → marts"
        description="A dbt project has a layered structure: sources describe raw tables loaded by Fivetran/Airbyte; stg_ (staging) models clean + cast source data 1:1; int_ (intermediate) models apply business logic + joins; fct_/dim_ (fact + dimension) models are the analytics-ready Gold marts for BI. Snapshots track SCD2 history. Tests are defined in schema.yml and run after each model materialises. manifest.json captures the full DAG of models + dependencies — used by dbt Cloud, docs, and CI. The Semantic Layer (MetricFlow) defines metrics once and exposes them to Tableau, Looker, Hex, Mode via one API."
        icon={<Layers className="h-5 w-5" />}
        badge="architecture"
      >
        <DbtArchitectureDiagram />
      </SectionCard>

      {/* dbt models SQL */}
      <SectionCard
        title="dbt models — Bronze stg_ → Silver int_ → Gold fct_/dim_"
        description="The dbt model file is the atomic unit of the transform layer. Each .sql file has a Jinja config block (materialisation, cluster_by, tags) + a SQL body that references upstream models via ref('upstream_model'). The ref() function builds the DAG — dbt parses every ref() in the project, builds the dependency graph, and runs models in topological order. This block shows the three-layer pattern: Bronze stg_orders (view), Silver int_orders_enriched (incremental merge), Gold fct_orders (incremental merge + cluster_by for query performance)."
        icon={<Database className="h-5 w-5" />}
        badge="dbt SQL + Jinja"
      >
        <CodeBlock code={DBT_MODEL_SQL} language="sql" filename="models/fct_orders.sql" highlight={[8, 9, 10, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77]} />
      </SectionCard>

      {/* dbt tests YAML */}
      <SectionCard
        title="dbt tests — schema.yml + singular + custom generic macros"
        description="Tests are first-class in dbt — every model has tests defined in schema.yml. Built-in tests: not_null, unique, relationships (FK), accepted_values. The dbt-utils package adds accepted_range, expression_is_true. dbt-expectations (Great Expectations port) adds expect_row_values_to_be_recent, expect_column_values_to_be_unique. Custom generic tests are Jinja macros in the macros/ folder; singular tests are .sql files in the tests/ folder. dbt test runs all tests; --store-failures persists failing rows to a quarantine table for triage. Test failures become audit evidence for regulators."
        icon={<TestTube className="h-5 w-5" />}
        badge="dbt tests"
      >
        <CodeBlock code={DBT_TESTS_YAML} language="yaml" filename="models/schema.yml" highlight={[14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53]} />
      </SectionCard>

      {/* dbt macros Jinja */}
      <SectionCard
        title="dbt macros — Jinja templates for reusable business logic"
        description="Macros are Jinja templates that encode business logic once and apply it across models. The dbt-utils package alone has 50+ macros: generate_surrogate_key (cross-warehouse MD5 hash), pivot (cross-warehouse PIVOT), date_spine (generate a date dimension), string_agg (cross-warehouse STRING_AGG), assert_freshness (SLA check). Macros let teams build a domain-specific DSL on top of SQL — instead of writing the same FX conversion logic in 30 models, write it once in a macro and call it. The Jinja engine pre-processes every .sql file at compile time; the resulting pure SQL is then sent to the warehouse."
        icon={<Wand2 className="h-5 w-5" />}
        badge="Jinja macros"
      >
        <CodeBlock code={DBT_MACROS_JINJA} language="jinja" filename="macros/generate_surrogate_key.sql" highlight={[5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45]} />
      </SectionCard>

      {/* dbt Semantic Layer */}
      <SectionCard
        title="dbt Semantic Layer — MetricFlow defines metrics once, queries from any BI"
        description="The Semantic Layer (acquired from Transform 2023, built on MetricFlow) defines metrics once in semantic_models.yml + metrics.yml — monthly_revenue, daily_active_customers, revenue_growth_pct. Every BI tool (Tableau, Looker, Hex, Mode, Streamlit) queries metrics via the Semantic Layer API instead of each defining its own SQL. This eliminates the canonical BI-drift problem: finance's 'monthly revenue' in Tableau matches marketing's in Mode because both come from one metric definition. MetricFlow handles dimension joins, time offsets (WoW growth = current_revenue vs 7-day-offset prior_revenue), and saved query caching."
        icon={<Network className="h-5 w-5" />}
        badge="Semantic Layer"
      >
        <CodeBlock code={DBT_SEMANTIC_LAYER_YAML} language="yaml" filename="semantic_models.yml" highlight={[5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65]} />
      </SectionCard>

      {/* dbt Cloud + incremental + snapshots */}
      <SectionCard
        title="dbt Cloud + incremental models + snapshots (SCD2 history)"
        description="dbt Cloud is the managed service (jobs, environments, CI, artifacts). Incremental models use the merge strategy with unique_key to update only changed rows since the last run — critical for tables with billions of rows where a full refresh would take hours. Snapshots track SCD2 (Slowly Changing Dimension Type 2) history: each row gets dbt_valid_from + dbt_valid_to; current rows have dbt_valid_to = NULL. This is how analysts query 'what was customer 12345's tier in March 2024?' — they JOIN the snapshot table filtered by dbt_valid_from/to. Materialisation choice per model: view (cheap, recomputed), table (full refresh), incremental (delta merge), ephemeral (CTE in upstream), snapshot (SCD2)."
        icon={<GitBranch className="h-5 w-5" />}
        badge="dbt Cloud + incremental + snapshots"
      >
        <CodeBlock code={DBT_CLOUD_INCREMENTAL_SNAPSHOTS} language="sql" filename="models/int_orders_enriched.sql" highlight={[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53]} />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: build a Bronze→Silver→Gold dbt project in your browser (Pyodide)"
        description="Pure-Python simulation of a dbt project — no warehouse needed, runs in-browser. Build a synthetic dbt project: 3-layer model chain (Bronze stg_ → Silver int_ → Gold fct_), run tests at each layer (not_null, accepted_range, relationships), simulate incremental materialisation, and see how test failures catch silent data drift. The Pyodide demo shows the Bronze→Silver→Gold medallion pattern in action — including the Semantic Layer query that BI tools would issue."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={PYODIDE_DEMO} buttonLabel="Run dbt Bronze→Silver→Gold simulation (Pyodide)" />
      </SectionCard>

      {/* Comparison table */}
      <SectionCard
        title="dbt vs Airflow vs Dagster vs hand-rolled SQL — transform tool comparison"
        description="Four approaches to data transformation compared. dbt owns the SQL transform layer — best for analytics engineering where the warehouse is the compute. Airflow owns orchestration across systems — best when you need to coordinate dbt + Spark + Snowflake + API calls in one DAG. Dagster owns software-defined assets — best when the data artifacts (not the tasks) are the primary concern. Hand-rolled SQL is what every team starts with — fine for small teams, but lacks tests, docs, lineage, and CI. Most modern stacks use dbt + Airflow/Dagster together — dbt for SQL transforms, Airflow/Dagster for orchestration."
        icon={<Boxes className="h-5 w-5" />}
      >
        <TransformComparisonTable />
      </SectionCard>

      {/* Why this evolved */}
      <SectionCard
        title="Why dbt evolved — shortfalls of the stored-proc + cron era (pre-2016)"
        description="dbt filled the gap between data warehouses (which had the SQL engine) and software engineering (which had modular, tested, version-controlled code). Before dbt, analytics engineering was stored procedures + cron + Confluence — a regression from the software engineering practices that had been standard since the 1990s."
        icon={<History className="h-5 w-5" />}
        badge="Why dbt"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: SQL was not version-controlled.</strong> Stored procedures lived in the warehouse's metadata table — diffing two versions required dumping SQL strings, formatting them, and diffing. Renaming a column in 30 stored procs was a 2-week project. dbt moved SQL to git-tracked .sql files — every transform is a PR with diff, review, and CI checks. <strong className="text-foreground/80">Result:</strong> analytics engineering finally joined the rest of software engineering in 2016.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: No tests.</strong> Stored procedures ran nightly; data quality issues surfaced weeks later when a finance dashboard broke. dbt's schema.yml tests (not_null, unique, relationships, accepted_range) run after every model materialises — failures block the run before bad data reaches BI. <strong className="text-foreground/80">Result:</strong> data drift is caught at the source, not when the CFO calls about a wrong number.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: No lineage.</strong> Analysts queried the warehouse information_schema to figure out which tables depended on which — and even then, stored proc dependencies were opaque. dbt's manifest.json captures the full DAG of models + sources + tests + macros; dbt docs auto-generates an interactive HTML graph. <strong className="text-foreground/80">Result:</strong> impact analysis (what breaks if I rename this column?) takes seconds, not days.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: No CI.</strong> Stored proc changes were deployed directly to production — there was no concept of a 'PR for analytics'. dbt's CI flow (GitHub Actions + dbt Cloud CI job) runs on every PR: compile, run modified models + tests against a staging schema, surface failures before merge. <strong className="text-foreground/80">Result:</strong> analytics engineers get the same PR-driven development loop as backend engineers — review, test, merge, deploy.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique dbt features (vs Airflow + Dagster)"
        description="dbt has four features that are genuinely unique — not marketing fluff, but structural differentiators that no other transform tool has yet matched."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. SQL-as-code (Jinja + ref())</p>
            <p className="text-muted-foreground">dbt is SQL-first — every transform is a .sql file with Jinja templating. <strong>Airflow + Dagster are Python-first.</strong> dbt's SQL-first approach means analytics engineers (who know SQL, not Python) can be productive immediately, while Python tools require a steeper learning curve for the analytics team.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. First-class tests + docs</p>
            <p className="text-muted-foreground">Tests are in schema.yml; docs are auto-generated from model + column descriptions. <strong>Airflow has no native tests; Dagster has asset checks but no schema-first approach.</strong> dbt's test-as-code pattern produces audit-ready evidence with zero extra effort.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Semantic Layer (MetricFlow)</p>
            <p className="text-muted-foreground">Defines metrics once in YAML, queries from any BI tool via one API. <strong>Airflow + Dagster have nothing equivalent — you'd need Cube or Looker separately.</strong> Eliminates BI drift: finance's 'monthly revenue' in Tableau matches marketing's in Mode because both come from one metric definition.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Cross-warehouse portability</p>
            <p className="text-muted-foreground">Same dbt project compiles to Snowflake, BigQuery, Redshift, Databricks, Postgres, DuckDB — only the SQL adapts via Jinja macros. <strong>No other tool can compile once and run on 6 warehouses.</strong> Critical for migrations and multi-cloud architectures.</p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples cards */}
      <SectionCard
        title="2 large-dataset examples — cards with 5-language code popups"
        description="Two production-style scientific dbt examples. Each is a clickable card opening a lazy popup with: scenario brief (dataset/scale/why), dataset stats grid, computational tooling, multi-language code in Scala + Rust + Go + Elixir + Zig, and an implementation insight. The examples show how dbt models + tests encode scientific workflows as version-controlled, auditable, testable code."
        icon={<Database className="h-5 w-5" />}
        badge="2 examples × 5 langs"
      >
        <DatasetCards
          examples={DBT_SCIENCE_EXAMPLES}
          intro="Genomics Bronze→Silver→Gold (1000 Genomes VCF → allele frequency) + Clinical Trial QA (FDA FAERS adverse event reports). Each card has Scala/Rust/Go/Elixir/Zig code that triggers dbt Cloud via REST API + a Pyodide simulation of the transform pipeline."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the dbt ecosystem"
        description="dbt's ecosystem is the most mature of any transform tool. The dbt Hub hosts 1,000+ packages (dbt-utils, dbt-expectations, dbt-date, codegen). dbt Cloud is the managed service. The Semantic Layer exposes metrics to every BI tool. 6 warehouses are first-class adapters. The community is the largest in data engineering."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> dbt Cloud features (5)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>dbt Cloud CI</strong> — PR-driven runs on a staging schema</li>
              <li>• <strong>dbt Cloud IDE</strong> — browser IDE with live preview</li>
              <li>• <strong>dbt Cloud jobs</strong> — scheduled + trigger-based runs</li>
              <li>• <strong>dbt Cloud artifacts</strong> — manifest.json + run_results.json</li>
              <li>• <strong>Semantic Layer API</strong> — MetricFlow queried by any BI</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cloud className="h-3.5 w-3.5 text-primary" /> Warehouse adapters (6+)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Snowflake</strong> — most popular dbt target</li>
              <li>• <strong>Google BigQuery</strong> — second most popular</li>
              <li>• <strong>AWS Redshift</strong> — RA3 + Spectrum supported</li>
              <li>• <strong>Databricks</strong> — Unity Catalog integration</li>
              <li>• <strong>Postgres + DuckDB</strong> — local dev + small teams</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Code2 className="h-3.5 w-3.5 text-primary" /> dbt packages (top 5)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>dbt-utils</strong> — 50+ cross-warehouse macros + tests</li>
              <li>• <strong>dbt-expectations</strong> — Great Expectations port</li>
              <li>• <strong>dbt-date</strong> — calendar + date dimension macros</li>
              <li>• <strong>codegen</strong> — auto-generate schema.yml</li>
              <li>• <strong>dbt-audit-helper</strong> — compare model outputs</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Network className="h-3.5 w-3.5 text-primary" /> BI integrations (5)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Tableau</strong> — Semantic Layer connector (2024)</li>
              <li>• <strong>Looker</strong> — Semantic Layer via API</li>
              <li>• <strong>Hex</strong> — notebook + dbt integration</li>
              <li>• <strong>Mode</strong> — Analytics + dbt Cloud sync</li>
              <li>• <strong>Streamlit</strong> — Python apps query SL directly</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers, blog posts, and production case studies that defined dbt + the analytics engineering movement. The 2016 Fishtown founding + 2022 Semantic Layer acquisition (Transform) are the key milestones. GitLab, JetBlue, and Ratheon have published detailed production case studies."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Tristan Handy (Fishtown Analytics, 2016):</strong> "Why we built dbt: a framework for analytics engineering." Argued that data analysts had been stuck in a 1990s software-engineering time warp — stored procedures, cron, manual diffing — while the rest of software had moved to modular, version-controlled, tested code. dbt brought those practices (git, tests, CI, docs, modular components) to the SQL transform layer. The initial release was a Python tool that compiled Jinja templates to SQL; it has since grown to 9,000+ adopter companies.
          </p>
          <p>
            <strong className="text-foreground/80">GitLab Handbook — Analytics Engineering Workflow (2020):</strong> GitLab published their full dbt workflow as an open-source handbook. Every analytics engineer at GitLab works in a fork of the analytics repo, opens a PR, runs dbt CI (which materialises modified models + tests against a staging schema), and merges after review. The workflow is now the industry-standard reference for how analytics engineering teams should operate.
          </p>
          <p>
            <strong className="text-foreground/80">Transform Inc. acquisition (2022):</strong> Fishtown (rebranded dbt Labs in 2021) acquired Transform Inc., the company behind MetricFlow (the open-source semantic layer). MetricFlow became the foundation of the dbt Semantic Layer — defining metrics once in YAML, querying them from any BI tool via one API. This solved the canonical BI-drift problem: every BI tool had its own SQL for 'monthly revenue'; with the Semantic Layer, all BI tools hit one definition.
          </p>
          <p>
            <strong className="text-foreground/80">JetBlue Case Study (2022):</strong> Migrated 1,000+ stored procedures to dbt models on Snowflake. Result: 70% reduction in transform runtime (incremental merge vs full-refresh stored procs), zero downtime column renames (dbt's ref() handles the rename), test coverage went from ~0 to 1,500+ tests catching 30+ data quality issues per week before they reached BI.
          </p>
          <p>
            <strong className="text-foreground/80">Ratheon Technologies (2023):</strong> Adopted dbt on Databricks + Unity Catalog for the engineering analytics lake. Semantic Layer gives the engineering team a single source of truth for 'flight test pass rate' — previously each engineering team had its own SQL, producing conflicting numbers. Now all queries go through one metric definition.
          </p>
          <p>
            <strong className="text-foreground/80">dbt-core Open Source (Apache 2.0):</strong> The dbt-core project has 8,000+ GitHub stars, 600+ contributors, 1,000+ packages on the dbt Hub. The open-source license means any team can self-host dbt-core on a single EC2 instance for free; dbt Cloud adds the managed service (CI, IDE, jobs, Semantic Layer) for a per-seat subscription.
          </p>
          <p>
            <strong className="text-foreground/80">Analytics Engineering Manifesto (Fishtown 2018):</strong> The position paper defining analytics engineering as a discipline — a hybrid of data engineering (pipeline plumbing) + analytics (business understanding) + software engineering (modular, tested, version-controlled code). dbt is the canonical tool of this discipline; the manifesto is still cited as the founding document of analytics engineering as a profession.
          </p>
        </div>
      </SectionCard>

      {/* Deeper-thought insight */}
      <SectionCard
        title="My deeper thought: dbt's tests ARE the business rules; the SQL is the implementation"
        description="The unifying view: dbt's tests are not 'data quality checks' tacked on after the model runs — they ARE the encoded business rules. The SQL model is one implementation of the rules; the tests are another. They must agree."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Tests ARE the business rules; SQL is one implementation.</strong> Every business rule has two encoded forms in a dbt project: the SQL transform that produces the data, and the test that verifies it. 'Order amount must be between 0 and 50,000' is encoded both as a SQL filter (WHERE amount BETWEEN 0 AND 50000) AND as a dbt-utils.accepted_range test on the resulting column. If they ever disagree, the test catches it. This is the same pattern as property-based testing in Haskell/Scala — the spec (test) and the implementation (SQL) are checked against each other on every run.
          </p>
          <p>
            <strong className="text-foreground/80">manifest.json IS the AST of the warehouse.</strong> dbt's manifest.json is structurally an abstract syntax tree — every model is a node, every ref() is an edge. This is the same pattern as LLVM IR for compilers, Bazel BUILD files for builds, Terraform state for infrastructure. Once you have an AST, you can do static analysis: impact analysis (what breaks if I rename this column?), test selection (which tests cover this model?), CI optimisation (only run modified models + downstream). Every mature engineering discipline has an AST; dbt gave analytics engineering one in 2016.
          </p>
          <p>
            <strong className="text-foreground/80">The Semantic Layer IS the metric catalogue that BI tools always wanted.</strong> Looker's LookML, Tableau's Published Data Sources, Mode's Mode Reports — every BI tool has its own metric definition system. The Semantic Layer's value is being NOT a BI tool — it's a vendor-neutral metric catalogue that every BI tool queries via one API. This is the same pattern as OpenTelemetry for tracing (vendor-neutral spec, many backends) and OpenMetrics for monitoring. The Semantic Layer is the OpenTelemetry of BI metrics.
          </p>
          <p>
            <strong className="text-foreground/80">Snapshots ARE type-2 dimension history done right.</strong> SCD2 (Slowly Changing Dimension Type 2) was first described by Ralph Kimball in 1996 — track history by adding dbt_valid_from + dbt_valid_to to each row. dbt's snapshot materialisation is the canonical implementation: a strategy (timestamp or check), a unique_key, and an updated_at column produce the SCD2 table automatically. Hand-rolled SCD2 took 200 lines of SQL per dimension; dbt snapshots take 10 lines of YAML. The pattern is unchanged since 1996; dbt just made it executable.
          </p>
          <p>
            <strong className="text-foreground/80">dbt IS to data transformation what Rails was to web apps.</strong> Before Rails (2004), every web app built its own ORM, routing, controllers, and views. Rails standardised the MVC pattern + ActiveRecord + convention-over-configuration — suddenly every team could ship a web app in days instead of months. dbt did the same for analytics: before dbt (2016), every team built its own transform framework (stored procs + cron + ad-hoc scripts). dbt standardised the Bronze→Silver→Gold + Jinja macros + tests + CI pattern — suddenly every analytics team could ship a model in hours instead of weeks. The Rails analogy is exact: opinionated framework, convention-over-configuration, fat-template DSL, mass adoption.
          </p>
        </div>
      </SectionCard>

      <RelatedTopics topics={[
        { id: "dbt" as const, reason: "dbt concept page — Dimensional Modelling + SCD2 + the Semantic Layer" },
        { id: "airflow" as const, reason: "Airflow orchestrates dbt Cloud jobs in production" },
        { id: "dagster" as const, reason: "Dagster asset-oriented alternative — software-defined assets" },
        { id: "data-contracts" as const, reason: "Data contracts = dbt sources + tests + SLAs enforced upstream" },
        { id: "great-expectations" as const, reason: "Great Expectations port = dbt-expectations tests package" },
        { id: "elementary" as const, reason: "Elementary — dbt-native data observability" },
        { id: "cicd" as const, reason: "dbt Cloud CI = PR-driven transform validation" },
        { id: "data-lakehouse" as const, reason: "Bronze→Silver→Gold medallion pattern that dbt models implement" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("dbt")} className="text-sm text-primary hover:underline">
          &rarr; dbt concept page (Dimensional Modelling + SCD2)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("airflow")} className="text-sm text-primary hover:underline">
          &rarr; Apache Airflow (orchestration)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("dagster")} className="text-sm text-primary hover:underline">
          &rarr; Dagster (asset-oriented alternative)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("data-contracts")} className="text-sm text-primary hover:underline">
          &rarr; Data Contracts (sources + tests + SLAs)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("elementary")} className="text-sm text-primary hover:underline">
          &rarr; Elementary (dbt-native observability)
        </Link>
      </div>
    </div>
  );
}
