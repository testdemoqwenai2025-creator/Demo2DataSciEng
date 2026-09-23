"use client";

import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { SNOWFLAKE_WAREHOUSES, SNOWFLAKE_RBAC } from "../_data/synthetic";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Database, Cpu, ShieldCheck, Server, Layers, Zap, Key } from "lucide-react";

const WAREHOUSE_DDL = `-- ============================================================
-- Snowflake warehouse sizing matrix (managed by Terraform)
-- File: terraform/snowflake/warehouses.tf
-- ============================================================
CREATE WAREHOUSE IF NOT EXISTS WH_DBT_TRANSFORM
  WAREHOUSE_SIZE       = 'MEDIUM'
  AUTO_SUSPEND         = 30          -- seconds idle → auto-suspend
  AUTO_RESUME          = TRUE
  INITIALLY_SUSPENDED  = TRUE
  MIN_CLUSTER_COUNT    = 1
  MAX_CLUSTER_COUNT    = 8           -- multi-cluster autoscale
  SCALING_POLICY       = 'STANDARD'
  COMMENT             = 'dbt model materialisation — Bronze→Gold transforms';

CREATE WAREHOUSE IF NOT EXISTS WH_REPORTING
  WAREHOUSE_SIZE       = 'LARGE'
  AUTO_SUSPEND         = 60
  AUTO_RESUME          = TRUE
  MIN_CLUSTER_COUNT    = 1
  MAX_CLUSTER_COUNT    = 10
  SCALING_POLICY       = 'ECONOMY'   -- cost-aware BI
  COMMENT             = 'Tableau extract refresh + scheduled BI';

-- Resource monitor — cap monthly credit burn
CREATE RESOURCE MONITOR IF NOT EXISTS RM_PLATFORM
  WITH CREDIT QUOTA 12000
  FREQUENCY = MONTHLY
  START_TIMESTAMP = IMMEDIATELY
  NOTIFY USERS = (DATA_PLATFORM@MODERNDATASCIENG.COM)
  TRIGGERS
    ON 80 PERCENT DO NOTIFY
    ON 90 PERCENT DO SUSPEND
    ON 95 PERCENT DO SUSPEND_IMMEDIATE;
`;

const RBAC_DDL = `-- ============================================================
-- Role hierarchy (principle of least privilege)
-- ============================================================
CREATE ROLE IF NOT EXISTS TRANSFORMER;
CREATE ROLE IF NOT EXISTS REPORTER;
CREATE ROLE IF NOT EXISTS PII_READER;
CREATE ROLE IF NOT EXISTS MARKETING_READER_UK;

GRANT ROLE TRANSFORMER       TO ROLE SYSADMIN;
GRANT ROLE REPORTER          TO ROLE SYSADMIN;
GRANT ROLE PII_READER        TO ROLE SECURITYADMIN;
GRANT ROLE MARKETING_READER_UK TO ROLE REPORTER;

-- Application service users (SCIM-provisioned from Azure AD)
CREATE USER IF NOT EXISTS DBT_SVC
  TYPE = SERVICE
  DEFAULT_WAREHOUSE = WH_DBT_TRANSFORM
  DEFAULT_ROLE      = TRANSFORMER
  MUST_CHANGE_PASSWORD = FALSE;

-- Granular grants (managed via Terraform / schemachange)
GRANT USAGE ON WAREHOUSE WH_DBT_TRANSFORM        TO ROLE TRANSFORMER;
GRANT USAGE ON DATABASE NORTHWind_PROD          TO ROLE TRANSFORMER;
GRANT USAGE ON SCHEMA  ANALYTICS.GOLD            TO ROLE REPORTER;
GRANT SELECT  ON ALL TABLES IN SCHEMA ANALYTICS.GOLD TO ROLE REPORTER;

-- Row-level security via context function
CREATE OR REPLACE ROW ACCESS POLICY region_rls
  AS (region_code VARCHAR) RETURNS BOOLEAN
  CURRENT_ROLE() IN ('SYSADMIN','PII_READER')
  OR region_code = CURRENT_REGION();

APPLY ROW ACCESS POLICY region_rls
  ON ANALYTICS.GOLD.DIM_CUSTOMER (region_code);
`;

const SERVING_SQL = `-- ============================================================
-- Gold serving view — fct_orders enriched for BI consumption
-- Materialised as a SECURE VIEW in ANALYTICS.GOLD
-- ============================================================
CREATE OR REPLACE SECURE VIEW ANALYTICS.GOLD.FCT_ORDERS_SERVING
AS
SELECT
  o.order_id,
  o.order_ts,
  d.calendar_date                           AS order_date,
  d.fiscal_year,
  d.fiscal_quarter,
  c.customer_sk,
  c.customer_segment,
  c.region_code,
  p.product_sk,
  p.product_category,
  p.product_subcategory,
  s.store_sk,
  s.channel,
  o.order_qty,
  o.order_gross_amount,
  o.order_discount_amount,
  o.order_net_amount,
  o.order_currency,
  fx.gbp_rate,
  o.order_net_amount * fx.gbp_rate          AS order_net_amount_gbp
FROM ANALYTICS.GOLD.FCT_ORDERS        o
JOIN ANALYTICS.GOLD.DIM_CUSTOMER       c  ON c.customer_sk  = o.customer_sk
JOIN ANALYTICS.GOLD.DIM_PRODUCT        p  ON p.product_sk   = o.product_sk
JOIN ANALYTICS.GOLD.DIM_STORE          s  ON s.store_sk     = o.store_sk
JOIN ANALYTICS.GOLD.DIM_DATE            d  ON d.date_sk      = o.order_date_sk
LEFT JOIN ANALYTICS.GOLD.DIM_FX_RATE   fx ON fx.currency    = o.order_currency
                                        AND fx.effective_date = d.calendar_date
WHERE o.is_deleted = FALSE;

-- Cluster keys on the underlying table for BI performance
ALTER TABLE ANALYTICS.GOLD.FCT_ORDERS
  CLUSTER BY (order_date_sk, customer_sk);

-- Search optimisation for point lookups (customer service)
ALTER TABLE ANALYTICS.GOLD.FCT_ORDERS
  ADD SEARCH OPTIMIZATION ON (order_id, customer_sk);

-- Tag for governance — consumed by Unity Catalogue + Tableau
ALTER TABLE ANALYTICS.GOLD.FCT_ORDERS
  SET TAG governance.criticality = 'gold',
           governance.owner     = 'data_platform',
           governance.sla_minutes = 9;
`;

const PERFORMANCE = [
  { metric: "P95 query latency (BI)", value: "1.4s", baseline: "4.2s", note: "Cluster keys + search opt" },
  { metric: "Concurrent BI users (peak)", value: "212", baseline: "60", note: "Multi-cluster 1→10" },
  { metric: "Credit burn / TB scanned", value: "0.42", baseline: "0.71", note: "−19% YoY (FinOps)" },
  { metric: "Auto-suspend hit rate", value: "94%", baseline: "n/a", note: "30s suspend on transform WH" },
];

export function SnowflakePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Serving warehouse"
        title="Snowflake & SQL — governed serving layer"
        description="Snowflake sits between Databricks Lakehouse and the BI / reverse-ETL consumers. It is sized for concurrency, secured with row-level + column-level policies, and instrumented end-to-end with resource monitors and tags."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Multi-cluster</Badge>
            <Badge variant="outline" className="gap-1.5"><Key className="h-3 w-3" /> RLS + column masking</Badge>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Warehouses" value="5" hint="WH_ANALYTICS → WH_GOLD_SERVING" />
        <KpiCard label="P95 BI latency" value="1.4s" delta="-67%" deltaTone="up" hint="vs FY24 baseline" />
        <KpiCard label="Concurrent users peak" value="212" delta="+253%" deltaTone="up" hint="Black Friday peak" />
        <KpiCard label="Credits / TB" value="0.42" delta="-19%" deltaTone="up" hint="FinOps optimisation" />
      </div>

      {/* Warehouse sizing */}
      <SectionCard
        title="Warehouse sizing matrix"
        description="Every warehouse is provisioned via Terraform and right-sized for its workload pattern. Multi-cluster autoscale handles concurrency spikes; auto-suspend caps idle cost."
        icon={<Cpu className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Warehouse</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Size</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Autoscale</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Suspend</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Cost / mo</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {SNOWFLAKE_WAREHOUSES.map((w) => (
                <tr key={w.name} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold">{w.name}</td>
                  <td className="px-4 py-2.5">{w.size}</td>
                  <td className="px-4 py-2.5 font-mono">{w.autoscale}</td>
                  <td className="px-4 py-2.5">{w.suspends}</td>
                  <td className="px-4 py-2.5 tabular-nums">{w.monthly}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{w.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard
          title="Warehouse DDL (Terraform-managed)"
          description="Provisioned via terraform/snowflake/warehouses.tf — never edited by hand."
          icon={<Server className="h-5 w-5" />}
          badge="HCL"
        >
          <CodeBlock code={WAREHOUSE_DDL} language="sql" filename="warehouses.sql" highlight={[5, 6, 7, 8, 9, 10, 23, 24, 25, 26, 27, 28]} />
        </SectionCard>

        <SectionCard
          title="Performance lift (synthetic)"
          description="Before/after on key BI workloads after cluster keys + search optimisation."
          icon={<Zap className="h-5 w-5" />}
          badge="Synthetic"
          contentClassName="p-0"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Metric</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">After</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Before</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Note</th>
              </tr>
            </thead>
            <tbody>
              {PERFORMANCE.map((p) => (
                <tr key={p.metric} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-2.5">{p.metric}</td>
                  <td className="px-4 py-2.5 font-mono font-semibold text-emerald-600 dark:text-emerald-400">{p.value}</td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">{p.baseline}</td>
                  <td className="px-4 py-2.5 text-[11px] text-muted-foreground">{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>

      {/* RBAC */}
      <SectionCard
        title="RBAC hierarchy & grants"
        description="Snowflake roles are SCIM-provisioned from Azure AD. Principle of least privilege + dynamic RLS via `current_region()` keeps market-scoped data scoped."
        icon={<ShieldCheck className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="grid lg:grid-cols-2 gap-0">
          <div className="border-r border-border/60">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40">
                    <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Role</th>
                    <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Grants</th>
                    <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {SNOWFLAKE_RBAC.map((r) => (
                    <tr key={r.role} className="border-b border-border/40 last:border-0">
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold align-top">{r.role}</td>
                      <td className="px-4 py-2.5 text-xs align-top text-muted-foreground">{r.grants}</td>
                      <td className="px-4 py-2.5 align-top">
                        <Badge variant="outline" className="text-[10px]">{r.type}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <CodeBlock code={RBAC_DDL} language="sql" filename="rbac.sql" highlight={[6, 7, 8, 9, 22, 23, 24, 25, 32, 33, 34, 35, 36]} />
          </div>
        </div>
      </SectionCard>

      {/* Gold serving */}
      <SectionCard
        title="Gold serving view — fct_orders_serving"
        description="The single, governed, BI-facing definition of an order. Every Tableau dashboard and Hightouch sync reads from this view — there is no second copy."
        icon={<Database className="h-5 w-5" />}
      >
        <CodeBlock code={SERVING_SQL} language="sql" filename="fct_orders_serving.sql" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 30, 31, 35, 36, 37, 38, 39, 40, 41]} />
        <div className="mt-4 grid md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-md border border-border/60 p-3 bg-muted/20">
            <p className="font-semibold mb-1">Cluster keys</p>
            <p className="text-xs text-muted-foreground">CLUSTER BY (order_date_sk, customer_sk) — 92% of queries hit the leading cluster key.</p>
          </div>
          <div className="rounded-md border border-border/60 p-3 bg-muted/20">
            <p className="font-semibold mb-1">Search optimisation</p>
            <p className="text-xs text-muted-foreground">Point lookups on order_id / customer_sk for customer service: 4.2s → 0.4s.</p>
          </div>
          <div className="rounded-md border border-border/60 p-3 bg-muted/20">
            <p className="font-semibold mb-1">Governance tags</p>
            <p className="text-xs text-muted-foreground">SECURE VIEW + criticality=gold + owner=data_platform — consumed by Unity Catalogue.</p>
          </div>
        </div>
      </SectionCard>

      {/* Integration */}
      <div className="grid md:grid-cols-2 gap-4">
        <SectionCard
          title="Integration with the wider platform"
          icon={<Layers className="h-5 w-5" />}
        >
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li>• <InlineCode>Databricks → Snowflake</InlineCode>: Delta-to-Snowflake auto-ingest via Snowpipe streaming + manifest files.</li>
            <li>• <InlineCode>dbt</InlineCode>: runs materialisation on WH_DBT_TRANSFORM with slim CI selection.</li>
            <li>• <InlineCode>Tableau</InlineCode>: live queries on SECURE VIEWS with embedded Snowflake service user.</li>
            <li>• <InlineCode>Hightouch</InlineCode>: SQL models executed on WH_GOLD_SERVING; sync schedules aligned with dbt run.</li>
            <li>• <InlineCode>Reverse ETL API</InlineCode>: Snowflake External Functions for low-latency lookups.</li>
          </ul>
        </SectionCard>
        <SectionCard
          title="Operational excellence"
          icon={<ShieldCheck className="h-5 w-5" />}
        >
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li>• Resource monitor caps monthly credit burn at 12k credits (platform-wide).</li>
            <li>• Query history piped to Datadog → slowest queries auto-flagged for review.</li>
            <li>• Account usage views audited weekly; orphaned roles reclaimed.</li>
            <li>• Time-travel 90 days, failover to reader account in DR region.</li>
            <li>• Snowflake secure data sharing for partner analytics (no copy, no egress).</li>
          </ul>
        </SectionCard>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("dbt")} className="text-sm text-primary hover:underline">
          → Continue to dbt &amp; dimensional modelling
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("tableau")} className="text-sm text-primary hover:underline">
          → or jump to Tableau &amp; analytics
        </Link>
      </div>
    </div>
  );
}
