"use client";

import Link from "next/link";
import { SectionCard, PageHeader } from "../_components/section-card";
import { PyodideRunner } from "../_components/pyodide-runner";
import { Terminal } from "lucide-react";
import { InlineCode } from "../_components/code-block";
import { EVOLUTION_VERSIONS, TECH_RADAR, ROADMAP } from "../_data/synthetic";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import {
  GitCompare,
  History,
  Radar,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Sparkles,
  Activity,
} from "lucide-react";

const RING_STYLE: Record<string, { color: string; label: string; icon: typeof CheckCircle2 }> = {
  adopt: { color: "var(--chart-1)", label: "Adopt", icon: CheckCircle2 },
  trial: { color: "var(--chart-5)", label: "Trial", icon: AlertTriangle },
  assess: { color: "var(--chart-3)", label: "Assess", icon: Sparkles },
  hold: { color: "var(--chart-2)", label: "Hold", icon: XCircle },
};

const RISK_STYLE: Record<string, "default" | "outline" | "secondary" | "destructive"> = {
  low: "default",
  medium: "outline",
  high: "destructive",
};

export function EvolutionPage() {
  // Group radar items by quadrant
  const quadrants = Array.from(new Set(TECH_RADAR.map((t) => t.quadrant))).sort();
  const rings = ["adopt", "trial", "assess", "hold"];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Knowledge Loop · when"
        title="Evolution Timeline"
        description="The platform today is the sum of every decision made since v1.0. The timeline shows what changed at each major version, what we learned, and where we're going next. The technology radar shows what we're adopting, trialling, assessing or holding. The roadmap shows our hypotheses for the next 3, 6, 12 and 24 months."
        right={
          <Badge variant="outline" className="gap-1.5">
            <History className="h-3 w-3" /> v1.0 → v3.0
          </Badge>
        }
      />

      {/* Timeline */}
      <SectionCard
        title="Version history"
        description="Horizontal scroll on mobile — each card is a snapshot of the platform at that version."
        icon={<GitCompare className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="overflow-x-auto code-scroll">
          <div className="flex gap-4 p-5 min-w-max">
            {EVOLUTION_VERSIONS.map((v, i) => (
              <div key={v.version} className="flex items-stretch gap-4">
                <div className="w-72 shrink-0 rounded-md border border-border/60 p-4 hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: v.color }} />
                    <p className="font-mono text-sm font-semibold">{v.version}</p>
                    <Badge variant="outline" className="ml-auto text-[10px]">{v.date}</Badge>
                  </div>
                  <p className="text-base font-semibold mb-1">{v.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{v.summary}</p>
                  <div className="mb-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Decisions</p>
                    <ul className="space-y-0.5">
                      {v.decisions.map((d) => (
                        <li key={d} className="text-[11px] text-foreground/80 flex items-start gap-1">
                          <span className="text-primary shrink-0">•</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mb-3 pt-2 border-t border-border/40">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Lesson learned</p>
                    <p className="text-[11px] text-muted-foreground italic leading-relaxed">"{v.lessons}"</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Tech stack</p>
                    <div className="flex flex-wrap gap-1">
                      {v.tech.map((t) => (
                        <span key={t} className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {i < EVOLUTION_VERSIONS.length - 1 && (
                  <div className="flex items-center text-muted-foreground/40 text-2xl">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Tech radar */}
      <SectionCard
        title="Technology radar"
        description="Inspired by Thoughtworks radar. Adopt = production-ready. Trial = real investment underway. Assess = actively investigating. Hold = paused or being migrated away."
        icon={<Radar className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="grid lg:grid-cols-4 divide-x divide-border/60">
          {rings.map((ring) => {
            const items = TECH_RADAR.filter((t) => t.ring === ring);
            const S = RING_STYLE[ring];
            return (
              <div key={ring} className="p-4">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/60">
                  <span className="h-3 w-3 rounded-full" style={{ background: S.color }} />
                  <p className="text-sm font-semibold uppercase tracking-wider">{S.label}</p>
                  <Badge variant="outline" className="ml-auto text-[10px]">{items.length}</Badge>
                </div>
                <ul className="space-y-2.5">
                  {items.map((t) => (
                    <li key={t.name} className="text-xs">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-medium leading-tight">{t.name}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0">{t.quadrant}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{t.notes}</p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Future roadmap */}
      <SectionCard
        title="Future roadmap"
        description="Horizon-based. Each item is a hypothesis with an expected impact + risk level — not a commitment."
        icon={<Calendar className="h-5 w-5" />}
      >
        <div className="space-y-5">
          {ROADMAP.map((h) => (
            <div key={h.horizon} className="rounded-md border border-border/60 p-4">
              <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> {h.horizon}
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                {h.items.map((item) => (
                  <div key={item.title} className="rounded-md border border-border/40 p-3 bg-muted/10">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-sm font-medium leading-tight">{item.title}</p>
                      <Badge variant={RISK_STYLE[item.risk]} className="text-[9px] shrink-0">{item.risk} risk</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      <strong className="text-foreground/80">Expected impact:</strong> {item.impact}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Carbon-Aware Computing */}
      <SectionCard
        title="Carbon-Aware Computing — the FY27+ aspiration"
        description="Shift non-urgent workloads to hours when grid carbon intensity is low. Projected: −30% scope-2 emissions."
        icon={<Activity className="h-5 w-5" />}
        badge="FY27+"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Data platforms consume significant electricity — Snowflake warehouses, Databricks clusters, S3 storage all draw power from the grid. The grid&apos;s carbon intensity varies by hour: solar peaks midday, wind is unpredictable, coal/gas baseload is constant. A carbon-aware scheduler defers non-urgent jobs ( Bronze→Silver batch, nightly Gold refresh, dbt docs generation) to hours when grid CO₂ is low.
          </p>
          <p>
            <strong className="text-foreground/80">Projected impact:</strong> −30% scope-2 emissions for the platform&apos;s compute, with zero impact on SLAs (urgent workloads run immediately; only deferred jobs shift). The pattern: each job gets a carbon budget; if the grid is dirty now, wait up to N hours for a cleaner window. The Electricity Maps API provides real-time carbon intensity forecasts.
          </p>
          <p>
            This is a <strong className="text-foreground/80">research aspiration</strong> — the platform doesn&apos;t implement it yet. But the architecture is ready: Airflow supports deferrable sensors; the carbon-aware SDK exists; the job priority matrix (urgent vs deferrable) is a classification problem the agentic DQ triage agent (ADR-019&apos;s bandit) could learn. The intersection of RL + sustainability is the FY28 frontier.
          </p>
        </div>
        <div className="mt-4 grid md:grid-cols-4 gap-2 text-xs">
          <div className="rounded-md border border-border/60 p-2.5 bg-muted/20">
            <p className="font-semibold text-emerald-600 dark:text-emerald-400">Urgent (immediate)</p>
            <p className="text-[10px] text-muted-foreground mt-1">Bronze ingestion, anomaly alerts, agent triage</p>
          </div>
          <div className="rounded-md border border-border/60 p-2.5 bg-muted/20">
            <p className="font-semibold text-amber-600 dark:text-amber-400">Deferrable (≤ 4h)</p>
            <p className="text-[10px] text-muted-foreground mt-1">Silver conformance, Gold marts, dbt build</p>
          </div>
          <div className="rounded-md border border-border/60 p-2.5 bg-muted/20">
            <p className="font-semibold text-violet-600 dark:text-violet-400">Deferrable (≤ 24h)</p>
            <p className="text-[10px] text-muted-foreground mt-1">Z-ORDER optimisation, VACUUM, docs gen</p>
          </div>
          <div className="rounded-md border border-border/60 p-2.5 bg-muted/20">
            <p className="font-semibold text-cyan-600 dark:text-cyan-400">Projected savings</p>
            <p className="text-[10px] text-muted-foreground mt-1">−30% scope-2 CO₂ for compute</p>
          </div>
        </div>
      </SectionCard>

      {/* Honest framing */}
      <SectionCard title="Honest framing" icon={<Sparkles className="h-5 w-5" />}>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The roadmap is not a promise — it's a published set of bets. Some will land, some won't, and the world
          will shift in ways nobody anticipated. The point of writing them down is to make the bets falsifiable:
          if <InlineCode>agentic DQ triage</InlineCode> doesn't cut on-call load by 40% in two quarters, we'll know,
          and we'll either fix the approach or kill it. The platform evolves because the team is honest about
          which assumptions held and which didn't.
        </p>
      </SectionCard>


      {/* Pyodide — version-diff simulator */}
      <SectionCard
        title="Try it: Platform version-diff simulator (Pyodide)"
        description="Compares platform versions (v1.0 → v2.0 → v2.4) and shows what decisions + tech were added/removed. Pure Python — runs in browser."
        icon={<Terminal className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner
          code={`versions = {\n    \"v1.0\": {\n        \"label\": \"Monolith era\",\n        \"decisions\": [\"Postgres-only\", \"Manual ETL\", \"Tableau on a single VM\"],\n        \"tech\": [\"PostgreSQL\", \"Python ETL\", \"Tableau Server\"],\n    },\n    \"v2.0\": {\n        \"label\": \"Lakehouse era\",\n        \"decisions\": [\"Databricks Lakehouse\", \"Delta Lake\", \"Medallion formal\", \"dbt for Gold\"],\n        \"tech\": [\"Databricks\", \"Delta Lake\", \"dbt\", \"Airflow\", \"Fivetran\"],\n    },\n    \"v2.4\": {\n        \"label\": \"Governed analytics\",\n        \"decisions\": [\"Unity Catalogue\", \"MetricFlow\", \"Hightouch\", \"Slim CI\", \"OpenLineage\"],\n        \"tech\": [\"Unity Catalogue\", \"MetricFlow\", \"Hightouch\", \"GitHub Actions\", \"Terraform\", \"Monte Carlo\"],\n    },\n}\n\ndef diff(v1_name, v2_name):\n    v1 = versions[v1_name]\n    v2 = versions[v2_name]\n    added_d = set(v2[\"decisions\"]) - set(v1[\"decisions\"])\n    removed_d = set(v1[\"decisions\"]) - set(v2[\"decisions\"])\n    added_t = set(v2[\"tech\"]) - set(v1[\"tech\"])\n    removed_t = set(v1[\"tech\"]) - set(v2[\"tech\"])\n    \n    print(f\"=== {v1_name} \\u2192 {v2_name} ===\")\n    print(f\"  {v1[\u0027label\u0027]} \\u2192 {v2[\u0027label\u0027]}\")\n    print()\n    if added_d:\n        print(f\"  Decisions ADDED ({len(added_d)}):\")\n        for d in sorted(added_d): print(f\"    + {d}\")\n    if removed_d:\n        print(f\"  Decisions REMOVED ({len(removed_d)}):\")\n        for d in sorted(removed_d): print(f\"    - {d}\")\n    print()\n    if added_t:\n        print(f\"  Tech ADDED ({len(added_t)}):\")\n        for t in sorted(added_t): print(f\"    + {t}\")\n    if removed_t:\n        print(f\"  Tech REMOVED ({len(removed_t)}):\")\n        for t in sorted(removed_t): print(f\"    - {t}\")\n    print(f\"\\\\n  Summary: +{len(added_d)} decisions, -{len(removed_d)} decisions, +{len(added_t)} tech, -{len(removed_t)} tech\")\n\ndiff(\"v1.0\", \"v2.0\")\nprint()\ndiff(\"v2.0\", \"v2.4\")\nprint()\ndiff(\"v1.0\", \"v2.4\")`}
          buttonLabel="Run version-diff simulator (Pyodide)"
        />
      </SectionCard>

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("research")} className="text-sm text-primary hover:underline">
          → Academic foundations (Research)
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("dashboard")} className="text-sm text-primary hover:underline">
          → See the platform live today (Dashboard)
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">
          → Why each decision (Knowledge)
        </Link>
      </div>
    </div>
  );
}
