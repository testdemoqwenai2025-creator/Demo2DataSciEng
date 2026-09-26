"use client";

import Link from "next/link";
import { LiveResourcesDrawer } from "../_components/live-resources-drawer";
import { NextSteps } from "../_components/next-steps";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { DBT_PROJECT, DBT_LAYERS } from "../_data/synthetic";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitBranch, Layers, TestTube, FileText, Workflow, Database, BarChart3, GitCommit, Sparkles } from "lucide-react";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  BarChart,
  Bar as ReBar,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";

const MODEL_YAML = `version: 2

models:
  - name: fct_orders
    description: |
      One row per order placed by a customer. The canonical
      revenue grain for the whole company. Sourced from
      stg_shopify__orders + stg_pos__orders, conformed in
      silver_orders, exposed as a Gold mart.
    columns:
      - name: order_id
        description: Surrogate business key
        tests:
          - not_null
          - unique
          - relationships:
              to: ref('stg_shopify__orders')
              field: order_id
      - name: customer_sk
        tests:
          - not_null
          - relationships:
              to: ref('dim_customer')
              field: customer_sk
      - name: order_total
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
      - name: region_code
        meta:
          pii: false
          rls_context: current_region
    meta:
      owner: data_platform
      sla_minutes: 9
      gold_tier: true
    config:
      materialized: incremental
      incremental_strategy: merge
      unique_key: order_id
      cluster_by: [order_date_sk, customer_sk]
      tags: [gold, bi_serving]
`;

const SCD2_SQL = `-- ============================================================
-- dim_customer.sql — SCD2 snapshot via dbt snapshots
-- ============================================================
{{ config(
    materialized = 'incremental',
    incremental_strategy = 'merge',
    unique_key = 'customer_sk',
    cluster_by = ['customer_id', 'valid_from'],
    tags = ['gold','dim','scd2']
) }}

WITH src AS (
  SELECT * FROM {{ ref('silver_customer') }}
),

changes AS (
  -- detect attributes that should trigger SCD2 history
  SELECT
    customer_id,
    customer_email_hash,
    full_name,
    segment,
    region_code,
    loyalty_tier,
    is_active,
    loaded_at
  FROM src
  {% if is_incremental() %}
  WHERE loaded_at > (SELECT MAX(valid_from) FROM {{ this }})
  {% endif %}
),

ranked AS (
  SELECT
    changes.*,
    LAG(segment)        OVER (PARTITION BY customer_id ORDER BY loaded_at) AS prev_segment,
    LAG(loyalty_tier)  OVER (PARTITION BY customer_id ORDER BY loaded_at) AS prev_tier
  FROM changes
),

scd2 AS (
  SELECT
    {{ dbt_utils.generate_surrogate_key(['customer_id','loaded_at']) }} AS customer_sk,
    customer_id,
    customer_email_hash,
    full_name,
    segment,
    region_code,
    loyalty_tier,
    is_active,
    loaded_at AS valid_from,
    LEAD(loaded_at) OVER (
      PARTITION BY customer_id ORDER BY loaded_at
    ) AS valid_to
  FROM ranked
  WHERE COALESCE(segment,'')      <> COALESCE(prev_segment,'')
     OR COALESCE(loyalty_tier,'') <> COALESCE(prev_tier,'')
)

SELECT * FROM scd2
`;

const SEMANTIC_YML = `version: 2

semantic_models:
  - name: orders
    model: ref('fct_orders')
    description: Order revenue grain

    entities:
      - name: order
        type: primary
        expr: order_id
      - name: customer
        type: foreign
        expr: customer_sk
      - name: store
        type: foreign
        expr: store_sk

    dimensions:
      - name: order_date
        type: time
        type_params:
          time_granularity: day
      - name: fiscal_quarter
        type: categorical
        expr: fiscal_quarter
      - name: region_code
        type: categorical
        type_params:
          primary: true  # drives Tableau RLS context

    measures:
      - name: revenue_gbp
        agg: sum
        expr: order_net_amount_gbp
        create_metric: true
      - name: order_count
        agg: count_distinct
        expr: order_id
      - name: avg_order_value
        agg: average
        expr: order_net_amount_gbp

metrics:
  - name: revenue_gbp
    label: Revenue (GBP)
    description: Total net revenue in GBP
    type: simple
    type_params:
      measure: revenue_gbp
    default_layer: bicep

  - name: repeat_purchase_rate
    label: Repeat purchase rate
    type: derived
    type_params:
      expr: SAFE_DIVIDE(repeat_customers, total_customers)
      measures:
        repeat_customers:
          aggregate: count_distinct
          filter: "order_rank > 1"
`;

const SLIM_CI = `# .github/workflows/dbt-ci.yml
name: dbt CI (slim + state-aware)
on:
  pull_request:
    paths: ["transform/dbt/**"]
permissions:
  id-token: write
  contents: read

jobs:
  dbt_ci:
    runs-on: ubuntu-latest
    env:
      DBT_PROFILES_DIR: transform/dbt
      DBT_STATE_BUCKET: s3://moderndatascieng-dbt-state
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Configure AWS OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/gha-dbt
          aws-region: eu-west-1

      - name: Setup Python
        uses: actions/setup-python@v5
        with: { python-version: '3.11' }

      - name: Install dbt + deps
        run: |
          pip install dbt-snowflake==1.7.0 dbt-metricflow
          cd transform/dbt && dbt deps

      - name: Pull previous state artefact (slim CI)
        run: aws s3 cp \${DBT_STATE_BUCKET}/manifest.json ./target/manifest.json

      - name: dbt build (modified + downstream)
        run: |
          cd transform/dbt
          dbt build \\
            --target dev \\
            --state ./target \\
            --select state:modified+ \\
            --defer --state ./target

      - name: dbt test
        if: always()
        run: cd transform/dbt && dbt test --select state:modified+

      - name: Generate docs + upload manifest
        if: always()
        run: |
          cd transform/dbt
          dbt docs generate
          aws s3 cp target/manifest.json \${DBT_STATE_BUCKET}/manifest.json
`;

const MODEL_BREAKDOWN = DBT_LAYERS.map((l) => ({
  layer: l.layer,
  count: l.count,
  fill: l.colour,
}));

const LINEAGE_DAG = `                    ┌─────────────┐
                    │  sources     │  (14 systems)
                    │  shopify · sfdc · netsuite · snowplow · ...
                    └──────┬───────┘
                           │
                  ┌────────▼────────┐
                  │   staging (92)   │   type-cast, renamed, lightly cleaned
                  └────────┬────────┘
                           │
                  ┌────────▼────────┐
                  │ intermediate (78) │   joins, conformance, dedup
                  └────────┬────────┘
                           │
                ┌──────────┴───────────┐
                ▼                      ▼
        ┌──────────────┐       ┌──────────────┐
        │  marts (96)   │       │ snapshots(12)│  ← SCD2 customer / product
        │ fct_orders     │       └──────────────┘
        │ dim_customer   │
        │ fct_returns    │
        │ fct_inventory  │
        └──────┬────────┘
               │
       ┌───────▼─────────┐
       │  serving (46)   │   BI views, semantic entities
       │ fct_orders_serving
       │ dim_customer_serving
       └──────┬──────────┘
              │
       ┌──────▼─────────┐
       │ exposures (38) │   Tableau dashboards + Hightouch syncs
       └────────────────┘
`;

export function DbtPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Transformation layer"
        title="dbt & dimensional modelling"
        description="The dbt project is the heart of the platform's single-source-of-truth promise. 312 models across staging → intermediate → marts → serving, with 1,184 tests, SCD2 snapshots, a MetricFlow semantic layer, slim CI and full docs."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><GitCommit className="h-3 w-3" /> Slim CI</Badge>
            <Badge variant="outline" className="gap-1.5"><Workflow className="h-3 w-3" /> SCD2</Badge>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <KpiCard label="Models" value={String(DBT_PROJECT.models)} hint="staging→serving" />
        <KpiCard label="Tests" value={String(DBT_PROJECT.tests)} hint="8.4 per model avg" />
        <KpiCard label="Sources" value={String(DBT_PROJECT.sources)} hint="14 systems" />
        <KpiCard label="Snapshots" value={String(DBT_PROJECT.snapshots)} hint="SCD2 history" />
        <KpiCard label="Macros" value={String(DBT_PROJECT.macros)} hint="reusable logic" />
        <KpiCard label="Exposures" value={String(DBT_PROJECT.exposures)} hint="BI + rETL" />
        <KpiCard label="Docs coverage" value={DBT_PROJECT.docsCoverage} hint="auto-generated" />
        <KpiCard label="CI runtime" value={DBT_PROJECT.ciMinutesPerRun} hint="slim + state-aware" />
      </div>

      {/* Layer breakdown */}
      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard
          title="Model breakdown by layer"
          description="Each layer has one responsibility. Models are prohibited from skipping layers (enforced by a CI lint rule)."
          icon={<Layers className="h-5 w-5" />}
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MODEL_BREAKDOWN} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0 0 / 0.3)" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="oklch(0.5 0 0)" />
                <YAxis type="category" dataKey="layer" tick={{ fontSize: 11 }} stroke="oklch(0.5 0 0)" width={80} />
                <Tooltip
                  cursor={{ fill: "oklch(0.85 0 0 / 0.1)" }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <ReBar dataKey="count" radius={[0, 4, 4, 0]}>
                  {MODEL_BREAKDOWN.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </ReBar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard
          title="Lineage DAG"
          description="Sources flow up to exposures. dbt docs renders an interactive graph; the structure below is the canonical shape."
          icon={<GitBranch className="h-5 w-5" />}
        >
          <CodeBlock code={LINEAGE_DAG} language="text" filename="lineage.txt" />
        </SectionCard>
      </div>

      {/* Layer responsibilities */}
      <SectionCard
        title="Layer responsibilities"
        description="Hard conventions enforced via CI lint rules + CODEOWNERS per folder."
        icon={<Workflow className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="grid md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border/60">
          {DBT_LAYERS.map((l) => (
            <div key={l.layer} className="p-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: l.colour }} />
                <p className="font-mono text-sm font-semibold">{l.layer}</p>
                <Badge variant="outline" className="ml-auto text-[10px]">{l.count} models</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{l.desc}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* SCD2 + tests */}
      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard
          title="dim_customer — SCD2 snapshot strategy"
          description="Customer segment and loyalty tier changes trigger a new dimension row. Surrogate key generated via `dbt_utils.generate_surrogate_key` so downstream facts stay point-in-time correct."
          icon={<Database className="h-5 w-5" />}
        >
          <CodeBlock code={SCD2_SQL} language="sql" filename="dim_customer.sql" highlight={[12, 13, 14, 15, 16, 17, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39]} />
        </SectionCard>

        <SectionCard
          title="fct_orders — model + tests (YAML)"
          description="Every model has a YAML entry: not_null + unique + relationships + freshness + RLS context. CI fails the PR if a model has zero tests."
          icon={<TestTube className="h-5 w-5" />}
        >
          <CodeBlock code={MODEL_YAML} language="yaml" filename="models/marts/fct_orders.yml" highlight={[9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 26, 27, 28, 29]} />
        </SectionCard>
      </div>

      {/* Semantic layer */}
      <SectionCard
        title="Semantic layer (MetricFlow)"
        description="Measures, dimensions, entities and derived metrics are defined once in YAML. Both Tableau and Hightouch read from this layer — no parallel metric definitions can drift."
        icon={<BarChart3 className="h-5 w-5" />}
      >
        <CodeBlock code={SEMANTIC_YML} language="yaml" filename="semantic_models/orders.yml" highlight={[7, 8, 9, 10, 11, 12, 13, 14, 22, 23, 24, 25, 26, 27, 33, 34, 35, 36, 37, 38]} />
        <div className="mt-4 grid md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-md border border-border/60 p-3 bg-muted/20">
            <p className="font-semibold mb-1">Entities</p>
            <p className="text-xs text-muted-foreground">Primary / foreign key graph enables joins across marts without hand-written SQL.</p>
          </div>
          <div className="rounded-md border border-border/60 p-3 bg-muted/20">
            <p className="font-semibold mb-1">Measures</p>
            <p className="text-xs text-muted-foreground">Aggregations are computed once at the grain of the underlying fact table.</p>
          </div>
          <div className="rounded-md border border-border/60 p-3 bg-muted/20">
            <p className="font-semibold mb-1">Derived metrics</p>
            <p className="text-xs text-muted-foreground">Repeat purchase rate, AOV growth etc. — composed in YAML, not in BI tools.</p>
          </div>
        </div>
      </SectionCard>

      {/* Slim CI */}
      <SectionCard
        title="dbt slim CI workflow (GitHub Actions)"
        description="State-aware `dbt build --select state:modified+` runs only changed models and downstream. Cuts CI runtime from 14m to ~4m on a typical PR."
        icon={<GitCommit className="h-5 w-5" />}
      >
        <CodeBlock code={SLIM_CI} language="yaml" filename=".github/workflows/dbt-ci.yml" highlight={[14, 15, 16, 17, 38, 39, 40, 41, 42, 43, 44]} />
      </SectionCard>

      {/* Docs */}
      <div className="grid md:grid-cols-3 gap-4">
        <SectionCard title="dbt docs" icon={<FileText className="h-5 w-5" />}>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>• Auto-generated site: docs.moderndatascieng.data</li>
            <li>• 94% model description coverage</li>
            <li>• Search by column, metric, source</li>
            <li>• Stakeholder-facing pages per exposure</li>
          </ul>
        </SectionCard>
        <SectionCard title="Testing strategy" icon={<TestTube className="h-5 w-5" />}>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>• 1,184 tests, 8.4 per model average</li>
            <li>• Generic tests: not_null, unique, relationships</li>
            <li>• dbt_utils + dbt_expectations packages</li>
            <li>• Custom SQL-based tests for business rules</li>
          </ul>
        </SectionCard>
        <SectionCard title="Promotion flow" icon={<GitCommit className="h-5 w-5" />}>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>• <InlineCode>dev</InlineCode> → slim CI on PR</li>
            <li>• <InlineCode>staging</InlineCode> → full run nightly</li>
            <li>• <InlineCode>prod</InlineCode> → manual approval + dbt build --target prod</li>
            <li>• Manifest uploaded to S3 for state-aware next run</li>
          </ul>
        </SectionCard>
      </div>

      <DeeperThoughtSection pageTitle="Dbt">
        <DeeperThought title="dbt IS the transformation layer — and it's SQL all the way down" connectedTo="ADR-001 (platform architecture)">
          <p>{"dbt doesn't invent a new language — it uses SQL. The .sql files ARE the transformation logic. The YAML files ARE the tests. The manifest.json IS the lineage. dbt IS the answer to 'how do you version-control your data transformations?' — by making them SQL files in a Git repo. The pattern (SQL + tests + lineage in Git) IS the same as application code (Python + tests + CI in Git). dbt IS Git for data transformations."}</p>
        </DeeperThought>
        <DeeperThought title="dbt tests ARE assertions — and they prevent the 'wrong data' bug" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"dbt tests (not_null, unique, accepted_values, relationships) ARE assertions about data quality. They're the data equivalent of unit tests in software. A not_null test on user_id IS like a type check: if user_id is null, the test fails, the pipeline stops. This prevents the 'wrong data in the dashboard' bug that costs data teams 20% of their time. The pattern (assertions + CI) IS the same as software testing — just for data instead of code."}</p>
        </DeeperThought>
        <DeeperThought title="The Medallion architecture (Bronze→Silver→Gold) IS progressive disclosure for data" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"The Medallion pattern (Bronze = raw, Silver = cleaned, Gold = business-aligned) IS the fold pattern applied to data. Bronze IS the 'brief' — raw data, immediately available. Silver IS the 'production patterns' — cleaned, conformed, tested. Gold IS the 'deeper thought' — business-aligned marts that serve specific use cases. Each layer adds value without rewriting the previous. Progressive disclosure for data = Medallion for code."}</p>
        </DeeperThought>
        <DeeperThought title="dbt's ref() function IS the dependency graph — same as Make" connectedTo="ADR-001 (platform architecture)">
          <p>{"dbt's ref('model_name') resolves at compile time to the actual table/view name — and it tracks dependencies. If model B refs model A, dbt knows to run A before B. This IS the SAME pattern as Make's dependency resolution (Makefile: target depends on source). The DAG (directed acyclic graph) of dbt models IS a Makefile for data. The math (topological sort) IS the same. dbt IS Make for SQL."}</p>
        </DeeperThought>
        <DeeperThought title="dbt + Great Expectations IS typed data — and types win" connectedTo="ADR-022 (pgvector for variant embeddings)">
          <p>{"dbt tests + Great Expectations suites ARE the type system for data. A column with not_null + unique + accepted_values IS a typed column. A column without tests IS an untyped column (any value accepted). The typed vs untyped debate IS the SAME as TypeScript vs JavaScript: types catch errors early, enable better tooling, and prevent the 'wrong format' bug. dbt + GE IS TypeScript for data pipelines."}</p>
        </DeeperThought>
      </DeeperThoughtSection>
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "Trace this topic's connections across the platform's math graph" }, { id: "tableau" as const, reason: "Continue to tableau — see also from this page" }, { id: "orchestration" as const, reason: "Continue to orchestration — see also from this page" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("tableau")} className="text-sm text-primary hover:underline">
          → Continue to Tableau &amp; analytics
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("orchestration")} className="text-sm text-primary hover:underline">
          → or jump to Orchestration
        </Link>
      </div>
    </div>
  );
}
