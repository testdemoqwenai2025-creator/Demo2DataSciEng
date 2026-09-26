"use client";

import Link from "next/link";
import { SectionCard, PageHeader } from "../_components/section-card";
import { NextSteps } from "../_components/next-steps";
import { ArchBox, ArchLayer, ArchArrow } from "../_components/arch-diagram";
import { CodeBlock } from "../_components/code-block";
import { hrefFor } from "../_lib/router";
import { COMPANY } from "../_data/synthetic";
import {
  Boxes,
  Database,
  GitBranch,
  Workflow,
  ShieldCheck,
  BarChart3,
  ArrowLeftRight,
  GitMerge,
  Cloud,
  Layers,
  Server,
  Activity,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";

const STACK_TABLE = [
  { layer: "Sources", tech: "Shopify, Salesforce, Stripe, NetSuite, Klaviyo, Snowplow, Adobe, Meta, Google Ads, SAP Ariba, Workday, POS, Amazon SP-API", role: "Systems of record across commerce, marketing, finance, HR & operations" },
  { layer: "Ingestion", tech: "Fivetran (ELT) + Snowplow (event pipeline) + Kafka (streaming)", role: "Schema-on-read CDC into Bronze, no transformations here" },
  { layer: "Lakehouse storage", tech: "Azure ADLS Gen2 / S3 + Delta Lake", role: "Single open storage format, ACID + time travel + Z-ORDER" },
  { layer: "Compute", tech: "Databricks (Spark, PySpark, Photon, SQL warehouses)", role: "Bronze→Silver→Gold transforms + ML feature engineering" },
  { layer: "Warehouse serving", tech: "Snowflake (multi-cluster warehouses)", role: "BI-grade SQL serving, RLS, secure sharing, reverse-ETL API" },
  { layer: "Transformation", tech: "dbt Core + dbt Cloud + MetricFlow semantic layer", role: "Staging → Intermediate → Marts → Serving, tests & docs" },
  { layer: "Orchestration", tech: "Airflow (batch) + Dagster (asset-based)", role: "Idempotent DAGs, SLAs, retries, circuit-breakers" },
  { layer: "Analytics", tech: "Tableau Server + Tableau Catalog + embedded APIs", role: "Governed dashboards, RLS, certified datasets, alerting" },
  { layer: "Reverse-ETL", tech: "Hightouch", role: "Push governed audiences back into CRM / CDP / ad platforms" },
  { layer: "Governance", tech: "Unity Catalogue + Monte Carlo + OpenLineage + Immuta", role: "PII tagging, lineage, DQ, RBAC, audit & masking" },
  { layer: "IaC / CI/CD", tech: "Terraform + GitHub Actions + dbt slim CI", role: "Reproducible environments, state-aware model promotion" },
];

const DATA_FLOW = `┌──────────────────────────────────────────────────────────────────────────────────┐
│  SOURCE (14 systems)                                                              │
│  Shopify · Salesforce · Stripe · NetSuite · Klaviyo · Snowplow · Adobe ·         │
│  Meta · Google Ads · SAP Ariba · Workday · POS · Amazon SP-API · Zendesk         │
└──────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │  Fivetran ELT (CDC + log-based) · schema-on-read
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  BRONZE (Databricks + ADLS, Delta)   142 tables · 8.4 TB / mo · append-only      │
│  • raw_shopify_orders · raw_sfdc_accounts · raw_netsuite_gl · raw_snowplow_web    │
│  • schema registry · DQ at the gate · Unity Catalogue tags                       │
└──────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │  PySpark · Delta MERGE · conformance · dedupe · validate
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  SILVER (Databricks + ADLS, Delta)   86 tables · 3.1 TB / mo · conformed         │
│  • silver_customer · silver_order · silver_order_line · silver_product            │
│  • SCD2 dimensions · key reassignment · business keys (customer_id, order_id)    │
└──────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │  dbt (staging→intermediate→marts→serving) + PySpark DLT
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  GOLD (Snowflake SERVING + Delta)   54 tables · 0.6 TB / mo · dimensional        │
│  • fct_orders · fct_returns · dim_customer · dim_product · dim_store             │
│  • fct_sales_daily · bridge_customer_segment · dim_date                           │
│  • semantic entities via MetricFlow                                              │
└──────────────────────────────────────────────────────────────────────────────────┘
                                    │
                ┌───────────────────┼───────────────────┐
                ▼                                       ▼
        Tableau dashboards                       Hightouch audiences
        (312 analysts, RLS)                      (CRM · Klaviyo · Meta)
        Embedded analytics API                  ML feature store
`;

const ENVIRONMENTS = [
  { env: "dev", purpose: "Engineer scratchpad", snowflake: "DEV_DB", databricks: "shared_no_isolation", sla: "best effort", cost: "£8k/mo" },
  { env: "staging", purpose: "Pre-prod mirror of prod data (sampled)", snowflake: "STAGING_DB", databricks: "isolated job clusters", sla: "4 hr", cost: "£14k/mo" },
  { env: "prod", purpose: "Live business analytics + BI serving", snowflake: "PROD_DB", databricks: "production pools + Unity", sla: "9 min P95", cost: "£52k/mo" },
  { env: "DR", purpose: "Cross-region failover (read-only)", snowflake: "PROD_DB_REPLICA", databricks: "AWS Databricks", sla: "15 min RPO", cost: "£18k/mo" },
];

export function ArchitecturePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Reference architecture"
        title="End-to-end modern data platform"
        description={`The ModernDataSciEng platform is built as four logical planes — sources, lakehouse, serving warehouse and consumption — wired together with orchestration, governance and CI/CD. The diagram below is the canonical reference used by every engineering and analyst team at ${COMPANY.name}.`}
        right={
          <Badge variant="outline" className="gap-1.5">
            <Cloud className="h-3 w-3" /> Azure primary · AWS DR
          </Badge>
        }
      />

      {/* Architecture diagram (full) */}
      <SectionCard
        title="Architecture diagram — top to bottom"
        description="Every box links to a dedicated page with code, metrics and integration details."
        icon={<Layers className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <ArchLayer label="1 · Sources (14 systems)">
            <ArchBox title="Shopify Plus" subtitle="E-commerce orders + checkouts" tech="REST · CDC" tone="muted" />
            <ArchBox title="Salesforce CRM" subtitle="Accounts, opportunities, cases" tech="REST · CDC" tone="muted" />
            <ArchBox title="Stripe + NetSuite" subtitle="Payments + ERP GL" tech="API + JDBC" tone="muted" />
            <ArchBox title="Snowplow + Adobe" subtitle="Behavioural web events" tech="Kafka · stream" tone="muted" />
          </ArchLayer>
          <ArchArrow label="Fivetran ELT · log-based CDC · schema-on-read" />
          <ArchLayer label="2 · Bronze — raw lakehouse (Databricks + ADLS)" colour="var(--chart-2)">
            <ArchBox title="Bronze Delta tables" subtitle="142 tables · 8.4 TB / mo · append-only" tech="Delta Lake" tone="accent" href={hrefFor("databricks")} icon={<Boxes className="h-4 w-4" />} />
            <ArchBox title="Schema registry" subtitle="Drift PR auto-created" tech="schema" tone="muted" />
            <ArchBox title="DQ at the gate" subtitle="Volume + freshness + nullness" tech="dq" tone="muted" href={hrefFor("governance")} icon={<ShieldCheck className="h-4 w-4" />} />
            <ArchBox title="Unity Catalogue" subtitle="PII tags · column RBAC" tech="gov" tone="muted" href={hrefFor("governance")} />
          </ArchLayer>
          <ArchArrow label="PySpark · Delta MERGE · conformance · SCD2 · key reassignment" />
          <ArchLayer label="3 · Silver — conformed & validated" colour="var(--chart-3)">
            <ArchBox title="Silver Delta tables" subtitle="86 tables · 3.1 TB / mo · conformed" tech="Delta MERGE" tone="accent" href={hrefFor("databricks")} icon={<Boxes className="h-4 w-4" />} />
            <ArchBox title="SCD2 dims" subtitle="Customer / product history" tech="SCD2" tone="muted" href={hrefFor("dbt")} />
            <ArchBox title="Reference data" subtitle="Markets, currencies, calendars" tech="ref" tone="muted" />
            <ArchBox title="ML feature store" subtitle="Databricks Feature Store" tech="ML" tone="muted" />
          </ArchLayer>
          <ArchArrow label="dbt (staging → intermediate → marts → serving) + PySpark DLT" />
          <ArchLayer label="4 · Gold — business marts + Snowflake serving" colour="var(--chart-1)">
            <ArchBox title="dbt marts" subtitle="54 dimensional tables · SCD2" tech="dbt" tone="primary" href={hrefFor("dbt")} icon={<GitBranch className="h-4 w-4" />} />
            <ArchBox title="Snowflake SERVING" subtitle="Multi-cluster · RLS · sharing" tech="Snowflake" tone="primary" href={hrefFor("snowflake")} icon={<Database className="h-4 w-4" />} />
            <ArchBox title="Semantic layer" subtitle="MetricFlow + Tableau" tech="metrics" tone="primary" href={hrefFor("tableau")} />
            <ArchBox title="Reverse-ETL view" subtitle="Hightouch sync sources" tech="rETL" tone="accent" href={hrefFor("fivetran-hightouch")} icon={<ArrowLeftRight className="h-4 w-4" />} />
          </ArchLayer>
          <ArchArrow label="Activation · governed BI + audience sync" />
          <ArchLayer label="5 · Consumption & activation" colour="var(--chart-4)">
            <ArchBox title="Tableau dashboards" subtitle="312 analysts · certified" tech="Tableau" tone="primary" href={hrefFor("tableau")} icon={<BarChart3 className="h-4 w-4" />} />
            <ArchBox title="Hightouch audiences" subtitle="5 segments → CRM / CDP / Ads" tech="rETL" tone="accent" href={hrefFor("fivetran-hightouch")} />
            <ArchBox title="Embedded analytics API" subtitle="Customer-facing dashboards" tech="API" tone="muted" />
            <ArchBox title="Notebooks & ML scoring" subtitle="Databricks notebooks" tech="ML" tone="muted" />
          </ArchLayer>
          <ArchArrow label="Cross-cutting: orchestration · governance · CI/CD" direction="right" />
          <ArchLayer label="6 · Cross-cutting capabilities">
            <ArchBox title="Airflow + Dagster" subtitle="Idempotent DAGs, SLAs" tech="orch" tone="muted" href={hrefFor("orchestration")} icon={<Workflow className="h-4 w-4" />} />
            <ArchBox title="Unity Catalogue + OpenLineage" subtitle="Lineage + RBAC + PII" tech="gov" tone="muted" href={hrefFor("governance")} icon={<ShieldCheck className="h-4 w-4" />} />
            <ArchBox title="GitHub Actions + Terraform" subtitle="dbt slim CI · IaC" tech="devops" tone="muted" href={hrefFor("cicd")} icon={<GitMerge className="h-4 w-4" />} />
            <ArchBox title="Monte Carlo + Great Expectations" subtitle="Anomaly · DQ · freshness" tech="obs" tone="muted" href={hrefFor("governance")} icon={<Activity className="h-4 w-4" />} />
          </ArchLayer>
        </div>
      </SectionCard>

      {/* ASCII diagram */}
      <SectionCard
        title="Pipeline data flow (ASCII)"
        description="Drop-in reference for engineers — also pinned in the runbook wiki."
        icon={<Server className="h-5 w-5" />}
      >
        <CodeBlock code={DATA_FLOW} language="text" filename="architecture.txt" />
      </SectionCard>

      {/* Stack table */}
      <SectionCard
        title="Layer-by-layer stack responsibilities"
        description="What each layer is responsible for, what it is NOT responsible for, and the technology choice."
        icon={<Layers className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Layer</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Technology</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Role</th>
              </tr>
            </thead>
            <tbody>
              {STACK_TABLE.map((r, i) => (
                <tr key={i} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-2.5 align-top font-semibold whitespace-nowrap">{r.layer}</td>
                  <td className="px-4 py-2.5 align-top font-mono text-xs">{r.tech}</td>
                  <td className="px-4 py-2.5 align-top text-muted-foreground">{r.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Environments */}
      <SectionCard
        title="Environment matrix"
        description="Four environments share the same Terraform modules with environment-specific overrides. Promotion flows dev → staging → prod (manual approval gate)."
        icon={<Cloud className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Env</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Purpose</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Snowflake</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Databricks</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">SLA</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Cost (synthetic)</th>
              </tr>
            </thead>
            <tbody>
              {ENVIRONMENTS.map((e) => (
                <tr key={e.env} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-2.5 font-mono font-semibold uppercase text-primary">{e.env}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{e.purpose}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{e.snowflake}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{e.databricks}</td>
                  <td className="px-4 py-2.5">{e.sla}</td>
                  <td className="px-4 py-2.5 tabular-nums">{e.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Cross-cutting */}
      <div className="grid md:grid-cols-3 gap-4">
        <SectionCard
          title="Security & access"
          icon={<Lock className="h-5 w-5" />}
          badge="SOC2 · GDPR"
        >
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>• Azure AD SSO → Snowflake SCIM provisioning</li>
            <li>• Unity Catalogue RBAC at column level</li>
            <li>• Dynamic RLS via `current_region()` context</li>
            <li>• Immuta for PII policy centralisation</li>
            <li>• All secrets in Azure Key Vault</li>
          </ul>
        </SectionCard>
        <SectionCard
          title="Observability"
          icon={<Activity className="h-5 w-5" />}
          badge="Datadog"
        >
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>• OpenLineage events from dbt / Airflow / Spark</li>
            <li>• Monte Carlo freshness + volume anomaly detection</li>
            <li>• Datadog dashboards for SLA & cost</li>
            <li>• PagerDuty on-call for P0/P1 incidents</li>
            <li>• Status page (internal): data.moderndatascieng.health</li>
          </ul>
        </SectionCard>
        <SectionCard
          title="FinOps & cost"
          icon={<Server className="h-5 w-5" />}
          badge="19% ↓ / TB"
        >
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>• Databricks cluster pools + spot for ad-hoc</li>
            <li>• Snowflake auto-suspend (30s transform, 60s BI)</li>
            <li>• Delta Z-ORDER on hot Silver tables</li>
            <li>• Bronze → Glacier after 90 days</li>
            <li>• Weekly cost review with platform + finance</li>
          </ul>
        </SectionCard>
      </div>

      <DeeperThoughtSection pageTitle="Reference Architecture">
        <DeeperThought title="Reference Architecture IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about Reference Architecture is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. Reference Architecture connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where Reference Architecture sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (Reference Architecture) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "Trace this topic's connections across the platform's math graph" }, { id: "snowflake" as const, reason: "Continue to snowflake — see also from this page" }, { id: "databricks" as const, reason: "Continue to databricks — see also from this page" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("snowflake")} className="text-sm text-primary hover:underline">
          → Continue to Snowflake &amp; SQL
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("databricks")} className="text-sm text-primary hover:underline">
          → or jump to Databricks Lakehouse
        </Link>
      </div>
    </div>
  );
}
