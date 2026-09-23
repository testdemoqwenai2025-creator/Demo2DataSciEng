"use client";

import Link from "next/link";
import { LiveResourcesDrawer } from "../_components/live-resources-drawer";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { MultiLangSamples } from "../_components/multi-lang-samples";
import { PIPELINES, FINOPS } from "../_data/synthetic";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Languages,
  Sparkles,
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
    bucket = "moderndatascieng-tfstate"
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
  name = "MODERNDATASCIENG_PROD"
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
  notify_users   = ["DATA_PLATFORM@MODERNDATASCIENG.COM"]
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
      url: https://github.com/moderndatascieng/data-platform
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
        run: aws s3 sync target/ s3://docs.moderndatascieng.data/dbt/ --delete

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

      {/* Multi-language: 5 idioms for the same grant audit */}
      <SectionCard
        title="Multi-language: 5 idioms for Snowflake grant audit"
        description="Bash (ops) · Go (single binary, ~30× faster) · Python (ecosystem) · Elixir (BEAM supervision tree, self-healing) · C (librdkafka, max perf). Click to open the drawer — keeps the page lightweight."
        icon={<Languages className="h-5 w-5" />}
        badge="5 languages · drawer"
      >
        <MultiLangSamples
          drawerMode
          drawerButtonLabel="View 5-language grant audit implementations"
          title="Snowflake grant audit — 5 idiomatic implementations"
          description="Same audit step in 5 languages. Bash = ops default. Go = single binary, type-safe. Python = ecosystem access. Elixir = BEAM-supervised, self-healing. C = librdkafka-backed, max perf."
          samples={[
            {
              language: "bash",
              filename: "audit_grants.sh",
              note: "Bash + jq — the ops-friendly default. Runs everywhere, easy to read, but no type safety. File types: .sh (source), no compilation.",
              code: `#!/usr/bin/env bash
# Audit all Snowflake grants — flag any new grants since last run
set -euo pipefail

LAST_HASH=\${1:-$(cat .last_audit_hash 2>/dev/null || echo "")}
NEW_HASH=$(snowsql -q "SHOW GRANTS" -o csv | sort | sha256sum | cut -d' ' -f1)
echo "Current grant hash: $NEW_HASH"

if [[ "$LAST_HASH" != "$NEW_HASH" && -n "$LAST_HASH" ]]; then
  echo "⚠ Grant drift detected — diffing"
  diff <(echo "$LAST_HASH") <(echo "$NEW_HASH") || true
  # Page on-call
  curl -X POST "$PAGERDUTY_URL" -d "{\\"alert\\": \\"snowflake grant drift\\"}"
fi
echo "$NEW_HASH" > .last_audit_hash`,
              highlight: [4, 5, 6, 8, 9, 10, 11, 12, 13],
            },
            {
              language: "go",
              filename: "audit_grants.go",
              note: "Go — single binary, type-safe, fast. Compiled and shipped to CI as a static binary. ~30× faster than the bash version on large accounts. File types: .go (source), single static binary output.",
              code: `package main

import (
        "context"
        "crypto/sha256"
        "encoding/hex"
        "fmt"
        "os"
        "sort"
        "strings"

        "github.com/snowflakedb/gosnowflake"
)

type Grant struct {
        Role      string
        Privilege string
        Object    string
        Grantee   string
}

func auditGrants(ctx context.Context, dsn string) (string, error) {
        db, err := sql.Open("snowflake", dsn)
        if err != nil { return "", err }
        defer db.Close()

        rows, err := db.QueryContext(ctx, "SHOW GRANTS")
        if err != nil { return "", err }
        defer rows.Close()

        var grants []Grant
        for rows.Next() {
                var g Grant
                if err := rows.Scan(&g.Role, &g.Privilege, &g.Object, &g.Grantee); err != nil {
                        return "", err
                }
                grants = append(grants, g)
        }
        // Sort for deterministic hash
        sort.Slice(grants, func(i, j int) bool {
                return grants[i].Role < grants[j].Role
        })
        h := sha256.New()
        for _, g := range grants {
                h.Write([]byte(fmt.Sprintf("%s|%s|%s|%s", g.Role, g.Privilege, g.Object, g.Grantee)))
        }
        return hex.EncodeToString(h.Sum(nil)), nil
}

func main() {
        hash, err := auditGrants(context.Background(), os.Getenv("SNOWFLAKE_DSN"))
        if err != nil { fmt.Fprintln(os.Stderr, err); os.Exit(1) }
        fmt.Println(hash)
}`,
              highlight: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 33, 34, 35, 36, 37],
            },
            {
              language: "python",
              filename: "audit_grants.py",
              note: "Python — when you need snowflake-connector + pandas + great_expectations in one script. The team's default for ad-hoc audits. File types: .py (source), interpreted.",
              code: `#!/usr/bin/env python3
"""Audit Snowflake grants; flag drift since last run."""
import hashlib, json, sys
from snowflake.connector import connect
from datetime import datetime, timezone

def audit_grants() -> str:
    with connect(
        user=os.environ["SNOWFLAKE_USER"],
        account=os.environ["SNOWFLAKE_ACCOUNT"],
        private_key_file=os.environ["SNOWFLAKE_KEY_PATH"],
    ) as conn:
        cur = conn.cursor()
        cur.execute("SHOW GRANTS")
        rows = sorted([tuple(r) for r in cur.fetchall()])
        h = hashlib.sha256()
        for r in rows:
            h.update("|".join(str(x) for x in r).encode())
        return h.hexdigest()

if __name__ == "__main__":
    current = audit_grants()
    last_path = ".last_audit_hash"
    try:
        last = open(last_path).read().strip()
    except FileNotFoundError:
        last = ""
    if last and last != current:
        print(f"⚠ Drift detected at {datetime.now(timezone.utc).isoformat()}", file=sys.stderr)
        # Page on-call via PagerDuty
        # requests.post(...)
    with open(last_path, "w") as f:
        f.write(current)
    print(f"Hash: {current}")`,
              highlight: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
            },
            {
              language: "elixir",
              filename: "audit_grants.ex",
              note: "Elixir + GenServer — self-healing via BEAM supervision tree. If the audit process crashes, the supervisor restarts it. ~1M concurrent lightweight processes per node. File types: .ex (source), .beam (compiled bytecode), .ez (release).",
              code: `defmodule ModernDataSciEng.Audit.Grants do
  @moduledoc """
  Audits Snowflake grants by querying via Postgres-wire-compatible endpoint.
  Idempotent — produces a stable SHA256 hash for drift detection.
  Self-healing: supervised by BEAM, auto-restarts on crash.
  """
  use GenServer

  require Logger

  @table :grant_audit_state

  def start_link(_opts), do: GenServer.start_link(__MODULE__, [], name: __MODULE__)

  @impl true
  def init(_) do
    :ets.new(@table, [:named_table, :public, :set])
    schedule_tick()
    {:ok, %{last_hash: load_last_hash()}}
  end

  @impl true
  def handle_info(:tick, state) do
    {:noreply, run_audit(state), 10_000}
  end

  @impl true
  def handle_call(:current_hash, _from, state) do
    {:reply, state.last_hash, state}
  end

  defp run_audit(state) do
    # Query via Postgres-wire protocol (Snowflake supports this)
    {:ok, rows} = Postgrex.query!(conn(), "SHOW GRANTS", [])

    hash =
      rows.rows
      |> Enum.map(&Tuple.to_list/1)
      |> Enum.sort()
      |> :erlang.term_to_binary()
      |> then(&:crypto.hash(:sha256, &1))
      |> Base.encode16(case: :lower)

    if state.last_hash && state.last_hash != hash do
      Logger.warn("Snowflake grant drift detected at \#{DateTime.utc_now()}")
      # Page on-call via HTTP — async, doesn't block the audit loop
      Task.start(fn ->
        Finch.build(:post, System.get_env("PAGERDUTY_URL"),
          [{"content-type", "application/json"}],
          ~s({"alert": "snowflake grant drift"})
        ) |> Finch.request()
      end)
    end

    :ets.insert(@table, {:last_hash, hash})
    %{state | last_hash: hash}
  end

  defp load_last_hash, do: :ets.lookup(@table, :last_hash)[:last_hash] || ""
  defp conn, do: System.get_env("SNOWFLAKE_PG_CONN")
  defp schedule_tick, do: Process.send_after(self(), :tick, 10_000)
end

# File types: .ex (source), .beam (compiled bytecode), .ez (release archive)
# Run as a release: MIX_ENV=prod mix release; _build/prod/rel/audit/bin/audit start`,
              highlight: [11, 12, 13, 14, 15, 16, 24, 25, 26, 27, 32, 33, 34, 35, 36, 37, 38, 49, 50, 51, 52],
            },
            {
              language: "c",
              filename: "lag_audit.c",
              note: "C + librdkafka — high-perf Kafka topic-lag monitor. Compiles to single static binary; ~30× faster than Python equivalent. The lingua-franca of native systems programming. File types: .c/.h (source), .so (shared lib), single static binary output.",
              code: `// ============================================================
// librdkafka audit — high-perf Kafka topic-lag monitor
// Compiles to single binary; ~30x faster than Python equivalent
// Foundation for many high-level Kafka clients (confluent-kafka-python
// wraps librdkafka)
// ============================================================
#include <librdkafka/rdkafka.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

int audit_lag(const char* brokers, const char* group_id) {
    rd_kafka_conf_t* conf = rd_kafka_conf_new();
    rd_kafka_conf_set(conf, "bootstrap.servers", brokers);
    rd_kafka_conf_set(conf, "group.id", group_id);
    rd_kafka_conf_set(conf, "enable.auto.commit", "false");

    rd_kafka_t* rk = rd_kafka_new(RD_KAFKA_CONSUMER, conf, NULL, 0);
    if (!rk) {
        fprintf(stderr, "Failed to create consumer: %s\\n",
                rd_kafka_err2str(rd_kafka_last_error()));
        return 1;
    }

    rd_kafka_topic_partition_list_t* topics = rd_kafka_topic_partition_list_new(1);
    rd_kafka_topic_partition_list_add(topics, "moderndatascieng.orders", -1);
    rd_kafka_assign(rk, topics);

    // Sample 1000 messages; measure latency
    int n = 0;
    int64_t total_lag = 0;
    time_t start = time(NULL);

    while (n < 1000 && difftime(time(NULL), start) < 60.0) {
        rd_kafka_message_t* msg = rd_kafka_consumer_poll(rk, 1000);
        if (msg) {
            int64_t ts = rd_kafka_message_timestamp(msg, NULL, NULL);
            int64_t lag = (int64_t)time(NULL) * 1000 - ts;
            total_lag += lag;
            n++;
            rd_kafka_message_destroy(msg);
        }
    }

    int64_t avg_lag = n > 0 ? total_lag / n : 0;
    printf("{\\"samples\\": %d, \\"avg_lag_ms\\": %lld}\\n", n, avg_lag);

    rd_kafka_destroy(rk);
    return avg_lag > 60000 ? 2 : 0;  // exit 2 = lag > 60s
}

int main(int argc, char** argv) {
    if (argc < 3) {
        fprintf(stderr, "Usage: %s <brokers> <group_id>\\n", argv[0]);
        return 1;
    }
    return audit_lag(argv[1], argv[2]);
}

// Compile: gcc -O2 -o lag_audit lag_audit.c -lrdkafka
// Run:     ./lag_audit broker-1:9092 moderndatascieng-silver-service`,
              highlight: [13, 14, 15, 16, 18, 19, 20, 21, 22, 24, 25, 26, 32, 33, 34, 35, 36, 37, 45, 47, 48, 49],
            },
          ]}
        />
      </SectionCard>

      <LiveResourcesDrawer
        topic="GitHub Actions Terraform CI/CD data engineering"
        codeRepo="hashicorp/terraform/main/README.md"
        trigger={
          <Button variant="outline" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> View live resources for CI/CD + Terraform
          </Button>
        }
      />

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
