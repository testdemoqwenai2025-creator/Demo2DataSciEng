"use client";

import Link from "next/link";
import { LiveResourcesDrawer } from "../_components/live-resources-drawer";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { DQ_RULES, OBSERVABILITY, UNITY_GRANTS } from "../_data/synthetic";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PyodideRunner } from "../_components/pyodide-runner";
import { Terminal } from "lucide-react";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  ShieldCheck,
  Activity,
  Layers,
  Key,
  AlertTriangle,
  Gauge,
  Lock,
  Network,
  Database,
  GitBranch,
  Sparkles,
} from "lucide-react";

const UNITY_TAGS = `-- ============================================================
-- Unity Catalogue — apply PII tags + RBAC
-- Managed via Terraform / schemachange
-- ============================================================
CREATE CATALOG IF NOT EXISTS moderndatascieng_govern;

-- Tag-based PII classification (consumed by BI + Hightouch + ML)
CREATE TAG IF NOT EXISTS pii;
CREATE TAG IF NOT EXISTS pii.email;
CREATE TAG IF NOT EXISTS pii.phone;
CREATE TAG IF NOT EXISTS pii.finance;

-- Apply tags to columns
ALTER TABLE catalog.moderndatascieng_gold.sales.dim_customer
  ALTER COLUMN customer_email_hash SET TAG ('pii' = 'true', 'pii.email' = 'true');

ALTER TABLE catalog.moderndatascieng_gold.sales.fct_orders
  ALTER COLUMN order_net_amount_gbp SET TAG ('pii.finance' = 'true');

-- Dynamic view redaction for sensitive columns
CREATE OR REPLACE VIEW catalog.moderndatascieng_gold.sales.dim_customer_masked AS
SELECT
  customer_sk,
  customer_id,
  CASE
    WHEN is_member('PII_READER') THEN customer_email_hash
    ELSE CONCAT(LEFT(customer_email_hash, 6), '****')          -- masked for non-PII roles
  END AS customer_email_hash,
  full_name,
  segment,
  region_code,
  loyalty_tier,
  is_active
FROM catalog.moderndatascieng_gold.sales.dim_customer;

-- Grant access — group-scoped, role-inherited
GRANT USE CATALOG  ON CATALOG moderndatascieng_gold              TO GROUP analysts_uk;
GRANT USE SCHEMA   ON SCHEMA moderndatascieng_gold.sales          TO GROUP analysts_uk;
GRANT SELECT       ON VIEW  dim_customer_masked           TO GROUP analysts_uk;

-- Audit log to Datadog via S3 event log
CREATE EXTERNAL LOCATION IF NOT EXISTS bronze_raw
  URL 's3://moderndatascieng-bronze/'
  WITH (CREDENTIAL \`azure_service_principal\`);
`;

const LINEAGE_YAML = `# OpenLineage event — emitted by dbt on every run
# Picked up by Marquez + Monte Carlo for end-to-end lineage
apiVersion: openlineage.io/v1
event:
  eventType: COMPLETE
  runId: "run-7c2f1a9c-..."
  job:
    namespace: moderndatascieng
    name: dbt.fct_orders
    facets:
      sql:
        query: "SELECT * FROM silver_orders JOIN dim_customer ..."
      dataSource:
        name: snowflake
        uri: moderndatascieng_prod
  inputs:
    - namespace: moderndatascieng
      name: catalog.moderndatascieng_silver.sales.silver_orders
      facets:
        schema:
          fields: [{name: order_id, type: varchar}, {name: customer_sk, type: varchar}]
  outputs:
    - namespace: moderndatascieng
      name: catalog.moderndatascieng_gold.sales.fct_orders
      facets:
        schema:
          fields: [{name: order_id, type: varchar}, {name: order_total, type: number}]
        dataQuality:
          rowCount: 11823049
          metrics:
            - name: not_null_order_id
              passed: true
            - name: unique_order_id
              passed: true
`;

const OBSERVABILITY_DQ = `# Monte Carlo monitor — freshness + volume + schema drift
monitors:
  - name: fct_orders_freshness
    type: freshness
    table: catalog.moderndatascieng_gold.sales.fct_orders
    rule: less_than
    threshold_minutes: 30
    severity: critical
    notification: pagerduty:data-platform

  - name: silver_customer_volume_anomaly
    type: volume
    table: catalog.moderndatascieng_silver.sales.silver_customer
    rule: relative_change
    baseline: 7day_rolling_avg
    threshold_pct: -25          # > 25% drop → alert
    severity: warning
    notification: slack:#data-platform

  - name: dim_product_schema_drift
    type: schema
    table: catalog.moderndatascieng_gold.sales.dim_product
    rule: any_change
    severity: info
    notification: github:schema-registry-pr

  - name: fct_orders_dq_breach
    type: custom_sql
    sql: "SELECT count(*) FROM fct_orders WHERE order_total < 0"
    rule: greater_than
    threshold: 0
    severity: critical
    notification: pagerduty:data-platform
`;

export function GovernancePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Governance · DQ · Lineage · Observability"
        title="Unity Catalogue + Monte Carlo + OpenLineage"
        description="The platform treats governance as a first-class engineering concern, not a compliance afterthought. Unity Catalogue provides column-level RBAC + PII tagging; Monte Carlo detects freshness / volume / schema anomalies; OpenLineage ties it all together end-to-end."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><ShieldCheck className="h-3 w-3" /> SOC2 · GDPR</Badge>
            <Badge variant="outline" className="gap-1.5"><Lock className="h-3 w-3" /> PII tagged</Badge>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Trust score" value="98.4 / 100" delta="+4.2pts" deltaTone="up" hint="DQ + observability" />
        <KpiCard label="DQ rules" value="1,184" delta="8.4 / model" deltaTone="up" hint="dbt + GE" />
        <KpiCard label="PII columns tagged" value="2,140" delta="100% coverage" deltaTone="up" hint="Unity Catalogue" />
        <KpiCard label="Anomalies caught (30d)" value="11" hint="auto-quarantined" />
      </div>

      {/* Unity grants */}
      <SectionCard
        title="Unity Catalogue — RBAC grants"
        description="Every catalog grant is Terraform-managed. Group membership syncs from Azure AD via SCIM."
        icon={<Key className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Principal</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Object</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Grants</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Type</th>
              </tr>
            </thead>
            <tbody>
              {UNITY_GRANTS.map((g) => (
                <tr key={g.principal + g.object} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs">{g.principal}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{g.object}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{g.grants}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline" className="text-[10px]">{g.type}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Unity SQL */}
      <SectionCard
        title="Unity Catalogue — PII tags + dynamic view redaction"
        description="PII is tagged, then surfaced via a `_masked` view that conditionally reveals columns based on the current role. The same tags drive Hightouch masking and Tableau access."
        icon={<ShieldCheck className="h-5 w-5" />}
      >
        <CodeBlock code={UNITY_TAGS} language="sql" filename="unity_catalog.sql" highlight={[8, 9, 10, 11, 14, 15, 20, 21, 22, 23, 24, 25, 26, 27, 28, 38, 39]} />
      </SectionCard>

      {/* DQ rules */}
      <SectionCard
        title="Data quality rules — fct_orders + dim_customer"
        description="Rules span not_null, unique, relationships, accepted_range, freshness, regex and business-rule checks. CI fails the PR if any new model has zero tests."
        icon={<Gauge className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Table</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Rule</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Severity</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Coverage</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Result</th>
              </tr>
            </thead>
            <tbody>
              {DQ_RULES.map((r) => (
                <tr key={r.rule} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs">{r.table}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{r.rule}</td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant={r.severity === "error" ? "default" : "outline"}
                      className={r.severity === "error" ? "gap-1 text-[10px]" : "gap-1 text-[10px]"}
                    >
                      {r.severity}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{r.coverage}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={r.result === "Pass" ? "default" : "destructive"} className="text-[10px] gap-1">
                      {r.result}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Observability */}
      <SectionCard
        title="Observability signals (last 24h — synthetic)"
        description="Freshness breaches, schema drift, volume anomalies and DQ breaches flow into Datadog. Critical signals auto-quarantine the affected table and page on-call."
        icon={<Activity className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="divide-y divide-border/60">
          {OBSERVABILITY.map((o) => (
            <div key={o.signal} className="px-4 py-3">
              <div className="flex items-start gap-3">
                <div
                  className={[
                    "mt-1 h-2 w-2 rounded-full shrink-0",
                    o.severity === "critical"
                      ? "bg-rose-500"
                      : o.severity === "warning"
                      ? "bg-amber-500"
                      : "bg-emerald-500",
                  ].join(" ")}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{o.signal}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="font-mono">{o.layer}</span> · {o.detected} → <span className="font-medium">{o.action}</span>
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">{o.severity}</Badge>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* OpenLineage */}
      <SectionCard
        title="OpenLineage event (emitted by dbt on every run)"
        description="Lineage is captured at the column level. Every dbt run, Airflow task, and Spark job emits a lineage event consumed by Marquez + Monte Carlo."
        icon={<Network className="h-5 w-5" />}
      >
        <CodeBlock code={LINEAGE_YAML} language="yaml" filename="openlineage_event.yml" highlight={[10, 11, 12, 13, 14, 17, 18, 19, 23, 24, 25, 26, 27]} />
      </SectionCard>

      {/* Monte Carlo */}
      <SectionCard
        title="Monte Carlo monitors (YAML-defined)"
        description="Monitors are versioned in Git, applied via Terraform. Severity → notification routing is declared, not coded."
        icon={<AlertTriangle className="h-5 w-5" />}
      >
        <CodeBlock code={OBSERVABILITY_DQ} language="yaml" filename="monitors.yml" highlight={[5, 6, 7, 8, 9, 10, 14, 15, 16, 17, 18, 23, 24, 25, 26, 27, 28]} />
      </SectionCard>

      {/* Governance pillars */}
      <div className="grid md:grid-cols-3 gap-4">
        <SectionCard title="Access & security" icon={<Lock className="h-5 w-5" />}>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>• SSO via Azure AD → SCIM into Snowflake + Databricks</li>
            <li>• MFA enforced for all human users</li>
            <li>• Service users via OIDC + workload identity (no shared secrets)</li>
            <li>• Immuta for policy-as-code masking rules</li>
            <li>• All access audited, logs to Datadog 90d</li>
          </ul>
        </SectionCard>
        <SectionCard title="Lineage" icon={<GitBranch className="h-5 w-5" />}>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>• OpenLineage events from dbt, Airflow, Spark, Fivetran</li>
            <li>• Column-level lineage graph in Marquez UI</li>
            <li>• "Who broke this dashboard?" investigation in seconds</li>
            <li>• Impact analysis: which Gold tables depend on this Bronze?</li>
            <li>• Reverse-ETL lineage: which Tableau sheet drove which Hightouch sync?</li>
          </ul>
        </SectionCard>
        <SectionCard title="Audit & compliance" icon={<ShieldCheck className="h-5 w-5" />}>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>• SOC2 Type II attested; quarterly access review</li>
            <li>• GDPR: right-to-erasure handled via Delta DELETE + VACUUM</li>
            <li>• PII data retention: 24 months for customers, 7 years for finance</li>
            <li>• DPIA template per new dataset</li>
            <li>• Annual external pen-test of the platform</li>
          </ul>
        </SectionCard>
      </div>

      {/* Pyodide — DQ rules validator */}
      <SectionCard
        title="Try it: DQ rules validator (Pyodide)"
        description="Validates data quality rules against expected patterns + severity + coverage. Pure Python stdlib — runs in browser."
        icon={<Terminal className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner
          code={`dq_rules = [\n    {\"table\": \"fct_orders\", \"rule\": \"not_null(order_id)\", \"severity\": \"error\", \"coverage\": \"100%\"},\n    {\"table\": \"fct_orders\", \"rule\": \"unique(order_id)\", \"severity\": \"error\", \"coverage\": \"100%\"},\n    {\"table\": \"fct_orders\", \"rule\": \"accepted_range(order_total > 0)\", \"severity\": \"warn\", \"coverage\": \"99.98%\"},\n    {\"table\": \"fct_orders\", \"rule\": \"freshness < 30m\", \"severity\": \"error\", \"coverage\": \"100%\"},\n    {\"table\": \"dim_customer\", \"rule\": \"unique(customer_sk)\", \"severity\": \"error\", \"coverage\": \"100%\"},\n    {\"table\": \"dim_customer\", \"rule\": \"not_null(email) where is_active\", \"severity\": \"error\", \"coverage\": \"99.4%\"},\n]\n\nexpected_patterns = {\n    \"fct_orders\": [\"not_null\", \"unique\", \"accepted_range\", \"freshness\"],\n    \"dim_customer\": [\"unique\", \"not_null\"],\n}\n\nvalid_severities = [\"error\", \"warn\", \"info\"]\nknown_patterns = [\"not_null\", \"unique\", \"accepted_range\", \"freshness\", \"relationships\", \"regex\"]\n\nissues = []\nfor rule in dq_rules:\n    if rule[\"severity\"] not in valid_severities:\n        issues.append(f\"\\u26a0 {rule[\u0027table\u0027]}: invalid severity '{rule[\u0027severity\u0027]}'\")\n    if not rule[\"coverage\"].endswith(\"%\"):\n        issues.append(f\"\\u26a0 {rule[\u0027table\u0027]}: coverage must end with %\")\n    pattern_found = any(p in rule[\"rule\"] for p in known_patterns)\n    if not pattern_found:\n        issues.append(f\"\\u26a0 {rule[\u0027table\u0027]}: unknown rule pattern in '{rule[\u0027rule\u0027]}'\")\n\nfor table, patterns in expected_patterns.items():\n    table_rules = [r for r in dq_rules if r[\"table\"] == table]\n    found = []\n    for r in table_rules:\n        for p in patterns:\n            if p in r[\"rule\"]: found.append(p)\n    missing = set(patterns) - set(found)\n    if missing:\n        issues.append(f\"\\u26a0 {table}: missing expected patterns: {missing}\")\n    else:\n        print(f\"\\u2713 {table}: all {len(patterns)} expected patterns present ({len(table_rules)} rules)\")\n\nprint()\nprint(\"=\" * 60)\nif issues:\n    print(\"DQ RULES VALIDATION ISSUES:\")\n    for i in issues: print(f\"  {i}\")\n    print(f\"\\\\n{len(issues)} issue(s) found.\")\nelse:\n    print(f\"\\u2713 All {len(dq_rules)} DQ rules validated.\")\nprint(\"=\" * 60)`}
          buttonLabel="Run DQ validator (Pyodide)"
        />
      </SectionCard>


      <DeeperThoughtSection pageTitle="Data Governance & Observability">
        <DeeperThought title="Data Governance & Observability IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about Data Governance & Observability is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. Data Governance & Observability connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where Data Governance & Observability sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (Data Governance & Observability) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
        </DeeperThought>
        <DeeperThought title="The fold pattern respects the reader's attention" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"This page has fold sections (collapsed by default) that reveal deeper content on demand — equation family comparisons, LaTeX derivations, production patterns, expected outputs, and citations. The basic content is visible immediately; the deeper phases are there when the reader is ready. Progressive disclosure isn't just UX — it's epistemological. A reader who wants the summary gets it; a reader who wants the derivation clicks to expand. Both are served by the same page."}</p>
        </DeeperThought>
        <DeeperThought title="The output IS the proof — not just the equation" connectedTo="ADR-034 (ESM-2 + AlphaFold2 adoption)">
          <p>{"Where this page has interactive demos (Pyodide + sliders + charts), the visual output IS the argument. Seeing a chart update as you drag a slider communicates the math in a way no formula can. The brain's pattern-recognition system processes the visual output faster than the verbal/analytical pathway. That's why the platform pairs every equation with a live demo — the output plays to a different level of the brain than the prose."}</p>
        </DeeperThought>
        <DeeperThought title="In a decade, this page will evolve — and that's the point" connectedTo="ADR-022 (pgvector for variant embeddings)">
          <p>{"The datasets, libraries, and tools on this page will be updated as technology evolves. The 1000-Genomes Project will become the 10M-Genomes Project. NumPy may be replaced by a WebGPU-native array library. PyTorch may give way to a successor. But the math — SVD, Attention, Poisson, FFT, Bayes, Kalman, GBM — will be the same. The platform is designed for this evolution: the equations are the anchor, the tools are the amplifier, and the fold sections let us update the tools without rewriting the page."}</p>
        </DeeperThought>
      </DeeperThoughtSection>
      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("cicd")} className="text-sm text-primary hover:underline">
          → Continue to CI/CD &amp; DevOps
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("home")} className="text-sm text-primary hover:underline">
          → Back to overview
        </Link>
      </div>
    </div>
  );
}
