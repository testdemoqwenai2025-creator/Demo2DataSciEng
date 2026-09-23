"use client";

import Link from "next/link";
import { EXEC_KPIS, COMPANY, REVENUE_TREND, CHANNEL_MIX, DAILY_INGEST } from "../_data/synthetic";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { ArchBox, ArchLayer, ArchArrow } from "../_components/arch-diagram";
import { hrefFor } from "../_lib/router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Boxes,
  Database,
  GitBranch,
  Workflow,
  ShieldCheck,
  BarChart3,
  ArrowLeftRight,
  GitMerge,
  Network,
  Layers,
  Activity,
  CircleCheck,
  Cpu,
  Cloud,
} from "lucide-react";
import {
  AreaChart,
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

const PILLARS = [
  {
    id: "architecture",
    title: "End-to-end reference architecture",
    desc: "14 sources → Bronze/Silver/Gold lakehouse → Snowflake serving → semantic layer → consumption & reverse-ETL.",
    icon: Network,
    tone: "primary" as const,
  },
  {
    id: "databricks",
    title: "Lakehouse on Databricks + Delta",
    desc: "Spark / PySpark / Spark SQL workloads on Azure with Unity Catalogue, Medallion patterns and Photon runtime.",
    icon: Boxes,
    tone: "primary" as const,
  },
  {
    id: "snowflake",
    title: "Snowflake serving layer",
    desc: "Multi-cluster warehouses, dynamic RLS, secure data sharing for analytics, BI and ML feature serving.",
    icon: Database,
    tone: "primary" as const,
  },
  {
    id: "dbt",
    title: "dbt + dimensional modelling",
    desc: "Staging → Intermediate → Marts → Serving. SCD2 history, 1.1k+ tests, semantic layer & dbt docs.",
    icon: GitBranch,
    tone: "primary" as const,
  },
  {
    id: "tableau",
    title: "Tableau analytics enablement",
    desc: "Governed dashboards, certified datasets, row-level security, embedded analytics for 312 analysts.",
    icon: BarChart3,
    tone: "accent" as const,
  },
  {
    id: "fivetran-hightouch",
    title: "ELT ingest + reverse-ETL activation",
    desc: "Fivetran ingests 14 sources (3.1B rows/mo); Hightouch pushes 5 governed audiences back into business tools.",
    icon: ArrowLeftRight,
    tone: "accent" as const,
  },
  {
    id: "orchestration",
    title: "DAG-driven orchestration",
    desc: "Airflow + Dagster, idempotent Bronze→Gold pipelines, SLA monitoring, retries & circuit-breakers.",
    icon: Workflow,
    tone: "muted" as const,
  },
  {
    id: "governance",
    title: "Governance, DQ, lineage, observability",
    desc: "Unity Catalogue + dbt tests + Monte Carlo. PII tagging, column-level lineage, anomaly detection.",
    icon: ShieldCheck,
    tone: "muted" as const,
  },
  {
    id: "cicd",
    title: "Git, CI/CD & DevOps for data",
    desc: "Trunk-based flow, GitHub Actions, dbt state-aware CI, Terraform for Snowflake / Databricks / S3.",
    icon: GitMerge,
    tone: "muted" as const,
  },
];

export function HomePage() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-primary/8 via-background to-amber-500/6 px-6 md:px-10 py-10">
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        <div className="relative max-w-5xl">
          <Badge variant="outline" className="mb-3 gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Synthetic reference implementation · {COMPANY.fiscalYear}
          </Badge>
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-balance">
            A scalable, governed data platform built for trusted, single-source-of-truth datasets across{" "}
            <span className="text-primary">{COMPANY.name}</span>.
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-3xl text-pretty">
            This reference design shows how a modern data engineering team partners with stakeholders, analysts
            and platform teams to onboard new sources, improve quality and ship governed analytics at scale.
            The platform spans Snowflake, Databricks, dbt, Tableau, Fivetran, Hightouch, Airflow and Unity
            Catalogue — every layer is purpose-built, observable and CI/CD-driven.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href={hrefFor("architecture")}>
                Explore architecture <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={hrefFor("governance")}>
                <ShieldCheck className="h-4 w-4 mr-1" /> Governance & DQ
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Executive KPIs */}
      <section>
        <PageHeader
          eyebrow="Executive snapshot"
          title="Outcomes the platform delivers"
          description="Synthetic KPIs reflecting how the platform improved freshness, trust, cost discipline and self-service adoption across the business."
        />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {EXEC_KPIS.map((k) => (
            <KpiCard
              key={k.label}
              label={k.label}
              value={k.value}
              delta={k.delta}
              deltaTone={k.tone}
              hint={k.hint}
            />
          ))}
        </div>
      </section>

      {/* Pillar cards */}
      <section>
        <PageHeader
          eyebrow="The ten pillars"
          title="Every page maps to a specific technology & scope"
          description="The platform is intentionally modular: each page below is a dedicated solution view you can navigate to for design, code snippets, metrics and integration details."
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PILLARS.map((p) => (
            <SectionCard
              key={p.id}
              title={p.title}
              description={p.desc}
              icon={<p.icon className="h-5 w-5" />}
              badge={p.tone}
              badgeVariant={p.tone === "primary" ? "default" : p.tone === "accent" ? "outline" : "secondary"}
            >
              <Button asChild variant="ghost" size="sm" className="-ml-2 text-primary">
                <Link href={hrefFor(p.id as never)}>
                  Open page <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </SectionCard>
          ))}
        </div>
      </section>

      {/* Mini architecture diagram */}
      <section>
        <PageHeader
          eyebrow="Reference architecture (mini)"
          title="How the layers fit together"
          description="Click any box to dive into the relevant technology page. Full reference diagram lives on the Architecture page."
        />
        <SectionCard>
          <div className="space-y-4">
            <ArchLayer label="Sources (14 systems)">
              <ArchBox title="Shopify Plus" subtitle="E-commerce orders" tech="REST" tone="muted" />
              <ArchBox title="Salesforce CRM" subtitle="Accounts, cases" tech="REST" tone="muted" />
              <ArchBox title="Stripe / NetSuite" subtitle="Payments · ERP" tech="API" tone="muted" />
              <ArchBox title="Adobe + Snowplow" subtitle="Behavioural events" tech="Kafka" tone="muted" />
            </ArchLayer>

            <ArchArrow label="Fivetran ELT · schema-on-read" />

            <ArchLayer label="Bronze — raw ingest (Databricks + S3)" colour="var(--chart-2)">
              <ArchBox
                title="Bronze · Delta"
                subtitle="Append-only raw tables, schema registry, 142 tables, 8.4 TB / mo"
                tech="Delta Lake"
                tone="accent"
                href={hrefFor("databricks")}
                icon={<Boxes className="h-4 w-4" />}
              />
              <ArchBox title="DQ & lineage" subtitle="Great Expectations + dbt tests" tech="dq" tone="muted" href={hrefFor("governance")} />
              <ArchBox title="Unity Catalogue" subtitle="PII tags · column-level access" tech="gov" tone="muted" href={hrefFor("governance")} />
              <ArchBox title="Airflow / Dagster" subtitle="Idempotent DAGs, retries" tech="orch" tone="muted" href={hrefFor("orchestration")} />
            </ArchLayer>

            <ArchArrow label="PySpark · Delta MERGE · conformance" />

            <ArchLayer label="Silver — conformed & validated" colour="var(--chart-3)">
              <ArchBox
                title="Silver · Delta"
                subtitle="Deduplicated, validated, 86 tables, 3.1 TB / mo"
                tech="Delta MERGE"
                tone="accent"
                href={hrefFor("databricks")}
                icon={<Boxes className="h-4 w-4" />}
              />
            </ArchLayer>

            <ArchArrow label="dbt + PySpark DLT" />

            <ArchLayer label="Gold — business marts + Snowflake serving" colour="var(--chart-1)">
              <ArchBox
                title="Gold · dbt marts"
                subtitle="Dimensional star schemas, 54 tables, SCD2"
                tech="dbt"
                tone="primary"
                href={hrefFor("dbt")}
                icon={<GitBranch className="h-4 w-4" />}
              />
              <ArchBox
                title="Snowflake SERVING"
                subtitle="Multi-cluster, RLS, secure sharing"
                tech="Snowflake"
                tone="primary"
                href={hrefFor("snowflake")}
                icon={<Database className="h-4 w-4" />}
              />
              <ArchBox title="Semantic layer" subtitle="dbt MetricFlow + Tableau" tech="metrics" tone="primary" />
              <ArchBox title="ML feature store" subtitle="Databricks Feature Store" tech="ML" tone="muted" />
            </ArchLayer>

            <ArchArrow label="Activation · BI + reverse-ETL" />

            <ArchLayer label="Consumption & activation" colour="var(--chart-4)">
              <ArchBox
                title="Tableau dashboards"
                subtitle="312 analysts, governed RLS"
                tech="Tableau"
                tone="primary"
                href={hrefFor("tableau")}
                icon={<BarChart3 className="h-4 w-4" />}
              />
              <ArchBox
                title="Hightouch reverse-ETL"
                subtitle="5 audiences → SF, Klaviyo, Meta"
                tech="rETL"
                tone="accent"
                href={hrefFor("fivetran-hightouch")}
                icon={<ArrowLeftRight className="h-4 w-4" />}
              />
              <ArchBox title="Embedded analytics" subtitle="Customer portal data API" tech="API" tone="muted" />
              <ArchBox title="Notebooks & ML" subtitle="Databricks Notebooks" tech="ML" tone="muted" />
            </ArchLayer>
          </div>
        </SectionCard>
      </section>

      {/* Synthetic dashboards */}
      <section>
        <PageHeader
          eyebrow="Synthetic data showcase"
          title="Realistic business telemetry, hypothetical numbers"
          description="All numbers below are synthetic. They illustrate how the platform surfaces revenue, channel mix and ingestion throughput to the business."
        />
        <div className="grid lg:grid-cols-3 gap-4">
          <SectionCard
            title="Monthly revenue (£M) — FY25"
            icon={<Activity className="h-5 w-5" />}
            badge="Synthetic"
          >
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={REVENUE_TREND} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0 0 / 0.3)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="oklch(0.5 0 0)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.5 0 0)" />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#rev)"
                    name="Revenue (£M)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard
            title="Revenue by channel — £612M FY25"
            icon={<BarChart3 className="h-5 w-5" />}
            badge="Synthetic"
          >
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={CHANNEL_MIX}
                    dataKey="share"
                    nameKey="channel"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {CHANNEL_MIX.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => `${v}%`}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11 }}
                    layout="horizontal"
                    align="center"
                    verticalAlign="bottom"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard
            title="Daily Bronze ingest (TB) — last 30d"
            icon={<Cpu className="h-5 w-5" />}
            badge="Synthetic"
          >
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DAILY_INGEST} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0 0 / 0.3)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="oklch(0.5 0 0)" interval={5} />
                  <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.5 0 0)" />
                  <Tooltip
                    formatter={(v: number) => `${v} TB`}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="tb" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>
      </section>

      {/* Solution principles */}
      <section>
        <PageHeader
          eyebrow="Design principles"
          title="How the platform stays governed, scalable and trusted"
          description="Every architectural decision is anchored to a small set of repeatable principles. They make the platform defensible to auditors, reproducible for engineers and explainable to stakeholders."
        />
        <div className="grid md:grid-cols-2 gap-4">
          <SectionCard
            title="Single source of truth"
            description="Every metric has exactly one canonical definition owned by dbt + the semantic layer — dashboards cannot drift because the SQL cannot drift."
            icon={<CircleCheck className="h-5 w-5" />}
          >
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li>• Metrics computed once, cached in Snowflake serving layer.</li>
              <li>• Certified datasets flagged in Tableau; uncertified hidden from executives.</li>
              <li>• Semantic entities (Customer, Order, Product) shared across BI & ML.</li>
            </ul>
          </SectionCard>

          <SectionCard
            title="Layered, idempotent, observable"
            description="Bronze→Silver→Gold plus staging→intermediate→marts→serving. Every layer is rerun-safe, lineage-tracked, and SLA-monitored."
            icon={<Layers className="h-5 w-5" />}
          >
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li>• Bronze is append-only; Silver is conformed; Gold is business-aligned.</li>
              <li>• Airflow retries with idempotent MERGE / `merge_type: upsert`.</li>
              <li>• Monte Carlo + dbt tests + Unity Catalogue for lineage & DQ.</li>
            </ul>
          </SectionCard>

          <SectionCard
            title="Cost-aware & FinOps-driven"
            description="Cluster parks autoscale, warehouses suspend in seconds, tables are CLUSTERED and OPTIMIZED on schedule — driving 19% cost / TB reduction YoY."
            icon={<Cpu className="h-5 w-5" />}
          >
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li>• Databricks: photon runtime, cluster pools, spot instances for ad-hoc.</li>
              <li>• Snowflake: auto-suspend, warehouse sizing matrix per workload type.</li>
              <li>• Storage: Delta Z-ORDER, VACUUM, lifecycle rules Bronze→Glacier after 90d.</li>
            </ul>
          </SectionCard>

          <SectionCard
            title="Cloud-first, vendor-agnostic"
            description="Azure is primary, AWS as DR — every component is deployable to either cloud using Terraform, so the business avoids lock-in."
            icon={<Cloud className="h-5 w-5" />}
          >
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li>• Azure: ADLS Gen2, Databricks, Unity Catalogue, KeyVault, Purview.</li>
              <li>• AWS (DR): S3 + RDS — replicable via Terraform modules.</li>
              <li>• Cross-cloud replication for Bronze (3 copies, 3 regions).</li>
            </ul>
          </SectionCard>
        </div>
      </section>
    </div>
  );
}
