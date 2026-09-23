"use client";

import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { PIPELINES, FINOPS } from "../_data/synthetic";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import {
  GitMerge,
  GitBranch,
  GitCommit,
  ShieldCheck,
  Cloud,
  Layers,
  Server,
  CheckCircle,
  Workflow,
} from "lucide-react";
import {
  BarChart,
  Bar as ReBar,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

const TERRAFORM = `# ============================================================
# terraform/snowflake/main.tf — Snowflake as code
# ============================================================
terraform {
  required_version = ">= 1.6"
  backend "s3" {
    bucket = "northwind-tfstate"
    key    = "snowflake/prod/terraform.tfstate"
    region = "eu-west-1"
  }
}

provider "snowflake" {
  account  = data.aws_secretsmanager_secret_version.snowflake.account
  user     = "TERRAFORM_SVC"
  role     = "SYSADMIN"
  authenticator = "snowflake_jwt"
  private_key  = data.aws_secretsmanager_secret_version.snowflake.private_key
}

# Databases
resource "snowflake_database" "prod" {
  name = "NORTHWIND_PROD"
  comment = "Production analytics database"
}

# Schemas (one per business domain)
resource "snowflake_schema" "gold" {
  database = snowflake_database.prod.name
  name     = "GOLD"
  comment  = "Certified Gold marts"
}

# Warehouses — see Snowflake page for the sizing matrix
resource "snowflake_warehouse" "transform" {
  name           = "WH_DBT_TRANSFORM"
  warehouse_size = "MEDIUM"
  auto_suspend   = 30
  auto_resume    = true
  min_cluster_count = 1
  max_cluster_count = 8
  scaling_policy    = "STANDARD"
}

# Roles + grants — fully version-controlled
resource "snowflake_role" "transformer" {
  name = "TRANSFORMER"
}

resource "snowflake_grant_privileges_to_role" "transformer_dbt" {
  role = snowflake_role.transformer.name
  privileges = ["USAGE", "CREATE TABLE", "CREATE VIEW"]
  on_schema {
    schema = "\${snowflake_schema.gold.fully_qualified_name}"
  }
}

# Resource monitor — cap monthly credit burn
resource "snowflake_resource_monitor" "platform" {
  name           = "RM_PLATFORM"
  credit_quota  = 12000
  frequency     = "MONTHLY"
  start_timestamp = "IMMEDIATELY"
  notify_users   = ["DATA_PLATFORM@NORTHWIND.COM"]
  triggers {
    on_80_percent  = "NOTIFY"
    on_90_percent  = "SUSPEND"
    on_95_percent  = "SUSPEND_IMMEDIATE"
  }
}
`;

const WORKFLOW = `# .github/workflows/promote-dbt-prod.yml
name: Promote dbt → prod
on:
  workflow_dispatch:
    inputs:
      commit_sha:
        description: "Commit SHA to promote"
        required: true
permissions:
  idem-token: write
  contents: read

jobs:
  promote:
    runs-on: ubuntu-latest
    environment:
      name: production          # gated, manual approval
      url: https://github.com/northwind/data-platform
    env:
      DBT_PROFILES_DIR: transform/dbt
    steps:
      - uses: actions/checkout@v4
        with:
          ref: \${{ inputs.commit_sha }}

      - name: OIDC → Snowflake
        uses: snowflake-actions/login@v1
        with:
          role: TRANSFORMER
          authenticator: oidc

      - name: Install dbt
        run: pip install dbt-snowflake==1.7.0

      - name: dbt deps
        run: cd transform/dbt && dbt deps

      - name: dbt build — production target
        run: |
          cd transform/dbt
          dbt build --target prod \\
            --state ./target \\
            --select state:modified+ \\
            --defer --state ./target

      - name: dbt docs generate
        run: cd transform/dbt && dbt docs generate

      - name: Publish docs to internal site
        run: aws s3 sync target/ s3://docs.northwind.data/dbt/ --delete

      - name: Notify Slack
        run: |
          curl -X POST -H 'Content-type: application/json' \\
            --data "{\"text\": \"✅ dbt promoted to prod @ \${{ inputs.commit_sha }}\"}" \\
            \${SLACK_WEBHOOK}
`;

const TRUNK_FLOW = `Git workflow — trunk-based with short-lived branches

  main (always green)
   │
   │ ▲ PR (signed commit + 2 reviews + dbt slim CI)
   │ │
   │ │ ▲ feature/data-platform/new-source-sap-ariba
   │ │ │   - 1 dbt staging model
   │ │ │   - 1 silver conform
   │ │ │   - 2 dbt tests
   │ │ │   - 1 schema-registry PR
   │ │ ▼
   │ ▼ merge → main
   │
   │   ┌────────────────────────────────────────────┐
   │   │  Daily 02:00 UTC — staging full dbt run    │
   │   └────────────────────────────────────────────┘
   │
   │   Manual approval gate (workflow_dispatch)
   ▼   ─────────────────────────────────────►  prod
                                              (dbt build --target prod)
                                              + Snowflake migrate apply
                                              + Databricks asset bundle deploy
`;

const FINOPS_DATA = FINOPS.map((f) => ({
  area: f.area,
  fy24: f.fy24,
  fy25: f.fy25,
  trend: f.trend,
}));

export function CicdPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Delivery — CI/CD & DevOps"
        title="Git, GitHub Actions, Terraform, dbt slim CI"
        description="Every change is shipped via PR with state-aware dbt CI, Terraform plan, schema-registry PR for drift, and OIDC-based workload identity (no long-lived secrets). Production promotion is gated by a manual approval and idempotent — re-runs are safe."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><GitCommit className="h-3 w-3" /> Trunk-based</Badge>
            <Badge variant="outline" className="gap-1.5"><Cloud className="h-3 w-3" /> IaC</Badge>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="PR merge → prod (median)" value="2h 11m" delta="−43%" deltaTone="up" hint="state-aware CI" />
        <KpiCard label="CI runtime (dbt slim)" value="4m 18s" delta="−67%" deltaTone="up" hint="vs full run" />
        <KpiCard label="Production deploys / wk" value="14" delta="+6 YoY" deltaTone="up" hint="with rollback runbook" />
        <KpiCard label="Mean rollback time" value="6 min" delta="P95" deltaTone="flat" hint="git revert + dbt build" />
      </div>

      {/* Git flow */}
      <SectionCard
        title="Git workflow — trunk-based with short-lived branches"
        description="Long-lived branches are forbidden. Every PR is a single feature, slim CI runs only changed models + downstream, and a daily staging run keeps the staging environment warm."
        icon={<GitBranch className="h-5 w-5" />}
      >
        <CodeBlock code={TRUNK_FLOW} language="text" filename="git_flow.txt" />
      </SectionCard>

      {/* Pipelines */}
      <SectionCard
        title="Pipelines — at a glance"
        description="Six pipelines cover the entire delivery surface: dbt CI, Terraform plan/apply, Snowflake migrate, Databricks asset bundle deploy, and prod promotion."
        icon={<Workflow className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Pipeline</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Trigger</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Steps</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Duration</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Env</th>
              </tr>
            </thead>
            <tbody>
              {PIPELINES.map((p) => (
                <tr key={p.name} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold">{p.name}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.trigger}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px]">{p.steps}</td>
                  <td className="px-4 py-2.5 font-mono text-xs tabular-nums">{p.duration}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline" className="text-[10px]">{p.env}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Terraform */}
      <SectionCard
        title="Terraform — Snowflake as code"
        description="Every Snowflake object (databases, schemas, warehouses, roles, grants, resource monitors) is provisioned via Terraform. Manual SQL changes are forbidden."
        icon={<Cloud className="h-5 w-5" />}
      >
        <CodeBlock code={TERRAFORM} language="hcl" filename="terraform/snowflake/main.tf" highlight={[15, 16, 17, 18, 24, 25, 26, 27, 33, 34, 35, 36, 37, 38, 39, 40, 41, 54, 55, 56, 57, 58, 59, 60, 61, 62]} />
      </SectionCard>

      {/* Prod workflow */}
      <SectionCard
        title="Production promotion — gated workflow"
        description="OIDC for auth (no long-lived secrets), state-aware build, docs published to internal site, Slack notification on success."
        icon={<GitMerge className="h-5 w-5" />}
      >
        <CodeBlock code={WORKFLOW} language="yaml" filename=".github/workflows/promote-dbt-prod.yml" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 35, 36, 37, 38, 39, 40]} />
      </SectionCard>

      {/* FinOps */}
      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard
          title="FinOps — FY24 vs FY25 (synthetic)"
          description="Platform cost tracking is fully attributed to workload. Photon, Z-ORDER and cluster pools drove a 19% cost-per-TB reduction YoY."
          icon={<Server className="h-5 w-5" />}
          badge="Synthetic"
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={FINOPS_DATA} margin={{ top: 10, right: 8, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0 0 / 0.3)" />
                <XAxis dataKey="area" tick={{ fontSize: 10 }} stroke="oklch(0.5 0 0)" angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.5 0 0)" />
                <Tooltip
                  formatter={(v: number) => `£${v}M`}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReBar dataKey="fy24" fill="var(--chart-2)" name="FY24" radius={[4, 4, 0, 0]} />
                <ReBar dataKey="fy25" fill="var(--chart-1)" name="FY25" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard
          title="DevOps practices"
          icon={<CheckCircle className="h-5 w-5" />}
        >
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li>• Trunk-based Git with short-lived feature branches</li>
            <li>• Conventional commits + signed commits (GPG / Sigstore)</li>
            <li>• 2-reviewer approval required on every PR</li>
            <li>• CODEOWNERS per folder (dbt models, Terraform, Spark)</li>
            <li>• Renovate for automated dependency bumps</li>
            <li>• Pre-commit hooks: sqlfluff, tflint, ruff, prettier</li>
            <li>• Runbooks in repo + status page (internal)</li>
            <li>• Game days quarterly — chaos engineering on the pipeline</li>
          </ul>
        </SectionCard>
      </div>

      {/* Best practices */}
      <div className="grid md:grid-cols-3 gap-4">
        <SectionCard title="Secrets & identity" icon={<ShieldCheck className="h-5 w-5" />}>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>• OIDC for GitHub Actions → Snowflake / Databricks / AWS</li>
            <li>• Workload identity, no long-lived keys</li>
            <li>• Secrets in Azure Key Vault + AWS Secrets Manager</li>
            <li>• Secret rotation automated via Lambda</li>
            <li>• Audit log to Datadog + Splunk</li>
          </ul>
        </SectionCard>
        <SectionCard title="Reproducibility" icon={<Layers className="h-5 w-5" />}>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>• Every environment is reproducible from Git</li>
            <li>• Terraform state in S3 with DynamoDB lock</li>
            <li>• dbt state artefact shared via S3 (slim CI)</li>
            <li>• Container images tagged with Git SHA</li>
            <li>• Databricks asset bundles versioned</li>
          </ul>
        </SectionCard>
        <SectionCard title="Reliability" icon={<Server className="h-5 w-5" />}>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>• Blue/green for dbt model changes (view swap)</li>
            <li>• Snowflake time-travel 90d for instant rollback</li>
            <li>• Delta time-travel 30d for Bronze/Silver</li>
            <li>• Cross-region DR (Azure primary, AWS DR)</li>
            <li>• Monthly DR drill — automated failover test</li>
          </ul>
        </SectionCard>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("home")} className="text-sm text-primary hover:underline">
          → Back to overview
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("architecture")} className="text-sm text-primary hover:underline">
          → Revisit the architecture
        </Link>
      </div>
    </div>
  );
}
