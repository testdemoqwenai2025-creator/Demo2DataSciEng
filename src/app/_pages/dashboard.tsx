"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { MEDALLION_LAYERS } from "../_data/synthetic";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Zap,
  AlertTriangle,
  Gauge,
  PlayCircle,
  PauseCircle,
  TrendingUp,
  Cpu,
  Database,
  Boxes,
  GitBranch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  Cell,
} from "recharts";

// Synthetic "live" pipeline run generator
interface PipelineRun {
  ts: string;
  dag: string;
  layer: "Bronze" | "Silver" | "Gold";
  duration_s: number;
  rows: number;
  status: "success" | "warning" | "failed";
}

const DAGS = [
  { name: "bronze_shopify_ingest", layer: "Bronze", baseRows: 1_200_000 },
  { name: "bronze_sfdc_ingest", layer: "Bronze", baseRows: 240_000 },
  { name: "silver_customer_conform", layer: "Silver", baseRows: 4_400_000 },
  { name: "silver_orders_conform", layer: "Silver", baseRows: 9_800_000 },
  { name: "gold_sales_mart", layer: "Gold", baseRows: 11_800_000 },
  { name: "gold_customer_segments", layer: "Gold", baseRows: 3_100_000 },
  { name: "ml_features_lifestyle_score", layer: "Gold", baseRows: 4_200_000 },
  { name: "hightouch_sync_audiences", layer: "Gold", baseRows: 1_100_000 },
  { name: "tableau_extract_refresh", layer: "Gold", baseRows: 14_000_000 },
];

function fmtTime(d: Date): string {
  return d.toTimeString().slice(0, 8);
}

function genRun(): PipelineRun {
  const dag = DAGS[Math.floor(Math.random() * DAGS.length)];
  const dur = Math.round((20 + Math.random() * 60) * 10) / 10;
  const rows = Math.round(dag.baseRows * (0.9 + Math.random() * 0.2));
  const r = Math.random();
  const status: PipelineRun["status"] = r < 0.92 ? "success" : r < 0.98 ? "warning" : "failed";
  return {
    ts: fmtTime(new Date()),
    dag: dag.name,
    layer: dag.layer as PipelineRun["layer"],
    duration_s: dur,
    rows,
    status,
  };
}

const ANOMALY_TEMPLATES = [
  { signal: "Volume anomaly detected — bronze_adobe_events", layer: "Bronze", severity: "warning", detail: "−38% vs 7d MA → auto-quarantine" },
  { signal: "Schema drift — NetSuite.Customers column added", layer: "Bronze", severity: "info", detail: "New column 'vat_region' → schema-registry PR auto-created" },
  { signal: "Freshness breach — Shopify.orders 11min late", layer: "Bronze", severity: "warning", detail: "SLA 15m → backfill triggered" },
  { signal: "DQ breach — fct_orders qty < 0 (1 row)", layer: "Gold", severity: "critical", detail: "Row quarantined → ticket to ops" },
  { signal: "Cost spike — WH_DBT_TRANSFORM burn 2.3×", layer: "Silver", severity: "warning", detail: "Investigating → likely missing cluster key" },
  { signal: "Schema drift — Salesforce.Account new field", layer: "Bronze", severity: "info", detail: "Field 'segment_v2' added → PR opened" },
  { signal: "Lineage gap — orphan Gold table detected", layer: "Gold", severity: "warning", detail: "fct_returns_v2 has no exposure → flag for review" },
];

interface Anomaly {
  ts: string;
  signal: string;
  layer: string;
  severity: "info" | "warning" | "critical";
  detail: string;
  id: string; // unique key for agent state tracking
}

interface AgentHypothesis {
  root_cause: string;
  confidence: "low" | "medium" | "high";
  suggested_action: string;
  known_pattern: boolean;
  steps_taken: string[];
  _meta?: { agent_id: string; tokens: number; timestamp: string; error?: string };
}

type AgentState =
  | { status: "idle" }
  | { status: "investigating" }
  | { status: "done"; hypothesis: AgentHypothesis }
  | { status: "error"; message: string };

function genAnomaly(): Anomaly {
  const a = ANOMALY_TEMPLATES[Math.floor(Math.random() * ANOMALY_TEMPLATES.length)];
  // Unique-ish id so we can track per-anomaly agent state
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return { ts: fmtTime(new Date()), id, ...a };
}

const LAYER_COLORS: Record<string, string> = {
  Bronze: "var(--chart-2)",
  Silver: "var(--chart-3)",
  Gold: "var(--chart-1)",
};

export function DashboardPage() {
  const [live, setLive] = useState(true);
  // FIX: Initialize with EMPTY arrays to avoid hydration mismatch
  // (Math.random() and new Date() produce different values on server vs client)
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [creditsBurned, setCreditsBurned] = useState(2847.32);
  const [p95Latency, setP95Latency] = useState(1.4);
  const [throughput, setThroughput] = useState(8.42);
  const [history, setHistory] = useState<{ t: number; tb: number; cost: number }[]>([]);

  const [agentStates, setAgentStates] = useState<Record<string, AgentState>>({});

  // FIX: Generate random data AFTER mount (client-only, no hydration mismatch)
  useEffect(() => {
    setRuns(Array.from({ length: 8 }, genRun));
    setAnomalies(Array.from({ length: 5 }, () => {
      const a = ANOMALY_TEMPLATES[Math.floor(Math.random() * ANOMALY_TEMPLATES.length)];
      return { ts: fmtTime(new Date(Date.now() - Math.random() * 60000)), id: `init-${Math.random().toString(36).slice(2, 10)}`, ...a };
    }));
    setHistory(Array.from({ length: 24 }, (_, i) => ({
      t: i,
      tb: Math.round((0.27 + Math.random() * 0.08) * 1000) / 1000,
      cost: Math.round((20 + Math.random() * 8) * 10) / 10,
    })));
  }, []);
  const [autoTriage, setAutoTriage] = useState(true);

  // Call the agent API for an anomaly
  const callAgent = useCallback(async (anomaly: Anomaly) => {
    setAgentStates((prev) => ({ ...prev, [anomaly.id]: { status: "investigating" } }));
    try {
      const res = await fetch("/api/agent-triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signal: anomaly.signal,
          layer: anomaly.layer,
          severity: anomaly.severity,
          detail: anomaly.detail,
          ts: anomaly.ts,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        setAgentStates((prev) => ({
          ...prev,
          [anomaly.id]: { status: "error", message: `Agent HTTP ${res.status}: ${text.slice(0, 100)}` },
        }));
        return;
      }
      const data = (await res.json()) as AgentHypothesis;
      setAgentStates((prev) => ({ ...prev, [anomaly.id]: { status: "done", hypothesis: data } }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setAgentStates((prev) => ({ ...prev, [anomaly.id]: { status: "error", message: msg } }));
    }
  }, []);

  // Live ticker — every 3s
  useEffect(() => {
    if (!live) return;
    const interval = setInterval(() => {
      setRuns((prev) => [genRun(), ...prev].slice(0, 12));
      setAnomalies((prev) => {
        if (Math.random() >= 0.45) return prev;
        const newAnomaly = genAnomaly();
        // Auto-trigger the agent if enabled
        if (autoTriage) {
          // Fire and forget — state updates via callback
          callAgent(newAnomaly);
        }
        return [newAnomaly, ...prev].slice(0, 8);
      });
      setCreditsBurned((c) => Math.round((c + 1.2 + Math.random() * 0.8) * 100) / 100);
      setP95Latency((l) => Math.round((l + (Math.random() - 0.5) * 0.2) * 100) / 100);
      setThroughput((t) => Math.round((t + (Math.random() - 0.5) * 0.3) * 100) / 100);
      setHistory((h) => [
        ...h.slice(-23),
        {
          t: (h[h.length - 1]?.t ?? 0) + 1,
          tb: Math.round((0.27 + Math.random() * 0.08) * 1000) / 1000,
          cost: Math.round((20 + Math.random() * 8) * 10) / 10,
        },
      ]);
    }, 3000);
    return () => clearInterval(interval);
  }, [live, autoTriage, callAgent]);

  // What-if simulator
  const [loadMultiplier, setLoadMultiplier] = useState(1);
  const [goldCompute, setGoldCompute] = useState(60);
  const projectedCost = (loadMultiplier * 2.8 * (1 + (goldCompute - 60) / 200)).toFixed(2);
  const projectedP95 = (loadMultiplier * 1.4 * (1 - (goldCompute - 60) / 400)).toFixed(2);

  const successRate = runs.filter((r) => r.status === "success").length / runs.length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Knowledge Loop · now"
        title="Live Dashboard — synthetic observatory"
        description="A real-time (simulated) view of the platform as it operates. Pipeline runs tick in every few seconds, credits burn on Snowflake + Databricks, anomalies flow in. Everything below is synthetic — but the patterns are what real production telemetry looks like."
        right={
          <div className="flex gap-2 items-center">
            <Button
              variant={autoTriage ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setAutoTriage((v) => !v)}
              title="When enabled, the dq-triage-v1 agent auto-investigates every new anomaly"
            >
              <Sparkles className={`h-3.5 w-3.5 ${autoTriage ? "animate-pulse" : ""}`} />
              {autoTriage ? "Agent: ON" : "Agent: OFF"}
            </Button>
            <Button
              variant={live ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setLive((v) => !v)}
            >
              {live ? <PauseCircle className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
              {live ? "Pause live feed" : "Resume live feed"}
            </Button>
          </div>
        }
      />

      {/* Live KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Credits burned (today)" value={creditsBurned.toLocaleString(undefined, { maximumFractionDigits: 2 })} hint="Snowflake + Databricks" delta={live ? "live" : "paused"} deltaTone="flat" />
        <KpiCard label="P95 query latency" value={`${p95Latency}s`} hint="BI serving" delta={live ? "live" : "paused"} deltaTone="flat" />
        <KpiCard label="Throughput" value={`${throughput} TB/hr`} hint="Bronze ingest" delta={live ? "live" : "paused"} deltaTone="flat" />
        <KpiCard label="Success rate (12 recent)" value={`${(successRate * 100).toFixed(1)}%`} hint="rolling" deltaTone="flat" />
        <KpiCard label="Active anomalies" value={String(anomalies.length)} hint="last 24h" deltaTone="flat" />
        <KpiCard label="Active DAGs" value="38" hint="across 6 groups" deltaTone="flat" />
      </div>

      {/* Live charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <SectionCard
          title="Throughput — last 24 ticks"
          icon={<TrendingUp className="h-5 w-5" />}
          badge={live ? "LIVE" : "PAUSED"}
        >
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="thr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0 0 / 0.3)" />
                <XAxis dataKey="t" tick={{ fontSize: 10 }} stroke="oklch(0.5 0 0)" />
                <YAxis tick={{ fontSize: 10 }} stroke="oklch(0.5 0 0)" />
                <Tooltip
                  formatter={(v: number, n: string) => [n === "tb" ? `${v} TB/hr` : `£${v}`, n]}
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="tb" stroke="var(--chart-1)" strokeWidth={2} fill="url(#thr)" name="TB/hr" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="Cost burn — £/min"
          icon={<Zap className="h-5 w-5" />}
          badge={live ? "LIVE" : "PAUSED"}
        >
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cst" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0 0 / 0.3)" />
                <XAxis dataKey="t" tick={{ fontSize: 10 }} stroke="oklch(0.5 0 0)" />
                <YAxis tick={{ fontSize: 10 }} stroke="oklch(0.5 0 0)" />
                <Tooltip
                  formatter={(v: number) => `£${v}`}
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="cost" stroke="var(--chart-2)" strokeWidth={2} fill="url(#cst)" name="£/min" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="SLA gauge — P95 vs target"
          icon={<Gauge className="h-5 w-5" />}
          badge={live ? "LIVE" : "PAUSED"}
        >
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="60%"
                outerRadius="100%"
                data={[{ name: "P95", value: Math.min(p95Latency / 3, 1) * 100, fill: p95Latency < 2 ? "var(--chart-1)" : p95Latency < 2.5 ? "var(--chart-5)" : "var(--chart-2)" }]}
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background dataKey="value" cornerRadius={20} isAnimationActive={false} />
                <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" fill="var(--foreground)" fontSize="20" fontWeight="600">
                  {p95Latency.toFixed(2)}s
                </text>
                <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle" fill="var(--muted-foreground)" fontSize="10">
                  Target: 2.50s
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Pipeline runs + anomalies */}
      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard
          title="Recent pipeline runs"
          description="New runs appear at the top every few seconds while live."
          icon={<Activity className="h-5 w-5" />}
          badge={live ? "LIVE" : "PAUSED"}
          contentClassName="p-0"
        >
          <div className="max-h-96 overflow-y-auto code-scroll">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                <tr className="border-b border-border/60">
                  <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Time</th>
                  <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">DAG</th>
                  <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Layer</th>
                  <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Rows</th>
                  <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Dur</th>
                  <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r, i) => (
                  <tr key={`${r.ts}-${i}`} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-1.5 font-mono text-[11px]">{r.ts}</td>
                    <td className="px-3 py-1.5 font-mono text-[11px]">{r.dag}</td>
                    <td className="px-3 py-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px]">
                        <span className="h-2 w-2 rounded-sm" style={{ background: LAYER_COLORS[r.layer] }} />
                        {r.layer}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-[11px] tabular-nums">{(r.rows / 1_000_000).toFixed(2)}M</td>
                    <td className="px-3 py-1.5 text-right font-mono text-[11px] tabular-nums">{r.duration_s}s</td>
                    <td className="px-3 py-1.5">
                      <Badge
                        variant={r.status === "success" ? "default" : r.status === "warning" ? "outline" : "destructive"}
                        className={
                          r.status === "success"
                            ? "text-[9px] gap-1 bg-emerald-600 text-white hover:bg-emerald-600"
                            : r.status === "warning"
                            ? "text-[9px] gap-1 text-amber-600 border-amber-500/40"
                            : "text-[9px] gap-1"
                        }
                      >
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          title="Anomaly feed"
          description="Live (synthetic) signals from Monte Carlo + Great Expectations + Unity Catalogue."
          icon={<AlertTriangle className="h-5 w-5" />}
          badge={live ? "LIVE" : "PAUSED"}
          contentClassName="p-0"
        >
          <div className="divide-y divide-border/60 max-h-96 overflow-y-auto code-scroll">
            {anomalies.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground text-center">No anomalies — all quiet.</div>
            )}
            {anomalies.map((a, i) => {
              const dot =
                a.severity === "critical"
                  ? "bg-rose-500"
                  : a.severity === "warning"
                  ? "bg-amber-500"
                  : "bg-emerald-500";
              const agentState = agentStates[a.id] ?? { status: "idle" as const };
              return (
                <div key={a.id} className="px-3 py-2 hover:bg-muted/20">
                  <div className="flex items-start gap-2">
                    <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${dot} ${live ? "animate-pulse" : ""}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-tight">{a.signal}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{a.detail}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-muted-foreground">{a.ts}</span>
                        <Badge variant="outline" className="text-[9px]">{a.layer}</Badge>
                        <Badge variant={a.severity === "critical" ? "destructive" : "outline"} className="text-[9px]">{a.severity}</Badge>
                      </div>
                      {/* Agent hypothesis block — renders inline once agent finishes */}
                      {agentState.status === "investigating" && (
                        <div className="mt-2 rounded border border-primary/30 bg-primary/5 px-2 py-1.5">
                          <p className="text-[10px] flex items-center gap-1.5 text-primary">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                            <span className="font-mono">dq-triage-v1</span> investigating…
                          </p>
                        </div>
                      )}
                      {agentState.status === "done" && agentState.hypothesis && (
                        <div className="mt-2 rounded border border-primary/40 bg-primary/8 px-2 py-1.5">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-[10px] font-mono flex items-center gap-1.5 text-primary">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                              dq-triage-v1 · root cause
                            </p>
                            <Badge
                              variant="outline"
                              className={
                                "text-[8px] " + (
                                  agentState.hypothesis.confidence === "high"
                                    ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                                    : agentState.hypothesis.confidence === "medium"
                                    ? "border-amber-500/40 text-amber-600 dark:text-amber-400"
                                    : "border-muted-foreground/40 text-muted-foreground"
                                )
                              }
                            >
                              {agentState.hypothesis.confidence} confidence
                            </Badge>
                          </div>
                          <p className="text-[10px] leading-snug text-foreground/90">{agentState.hypothesis.root_cause}</p>
                          <p className="text-[10px] leading-snug text-muted-foreground mt-1">
                            <span className="font-semibold text-foreground/80">Action:</span> {agentState.hypothesis.suggested_action}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {agentState.hypothesis.known_pattern && (
                              <Badge variant="outline" className="text-[8px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                                known pattern
                              </Badge>
                            )}
                            {agentState.hypothesis._meta?.tokens && (
                              <span className="text-[9px] font-mono text-muted-foreground">
                                {agentState.hypothesis._meta.tokens} tokens
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {agentState.status === "error" && (
                        <div className="mt-2 rounded border border-rose-500/40 bg-rose-500/8 px-2 py-1.5">
                          <p className="text-[10px] text-rose-600 dark:text-rose-400">
                            Agent error: {agentState.message}
                          </p>
                        </div>
                      )}
                      {agentState.status === "idle" && (
                        <button
                          onClick={() => callAgent(a)}
                          className="mt-1.5 text-[10px] text-primary hover:underline"
                        >
                          → Triage with agent
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* What-if simulator */}
      <SectionCard
        title="What-if simulator"
        description="Drag the sliders to project what happens to cost + P95 latency if load or compute allocation changes. Synthetic model — for illustration, not production planning."
        icon={<Cpu className="h-5 w-5" />}
        badge="Synthetic model"
      >
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="load" className="text-sm font-medium">Load multiplier</label>
                <span className="font-mono text-sm tabular-nums">{loadMultiplier.toFixed(1)}×</span>
              </div>
              <input
                id="load"
                type="range"
                min={0.5}
                max={3}
                step={0.1}
                value={loadMultiplier}
                onChange={(e) => setLoadMultiplier(parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="text-[11px] text-muted-foreground mt-1">How much the upstream volume scales. 1.0 = current load.</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="compute" className="text-sm font-medium">Gold compute allocation (%)</label>
                <span className="font-mono text-sm tabular-nums">{goldCompute}%</span>
              </div>
              <input
                id="compute"
                type="range"
                min={20}
                max={100}
                step={5}
                value={goldCompute}
                onChange={(e) => setGoldCompute(parseInt(e.target.value, 10))}
                className="w-full accent-primary"
              />
              <p className="text-[11px] text-muted-foreground mt-1">More compute = faster P95, but higher cost. Find the sweet spot.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-border/60 p-4 bg-muted/20">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Projected cost / day</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">£{projectedCost}M</p>
              <p className="text-[11px] text-muted-foreground mt-1">Baseline: £2.80M</p>
            </div>
            <div className="rounded-md border border-border/60 p-4 bg-muted/20">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Projected P95</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{projectedP95}s</p>
              <p className="text-[11px] text-muted-foreground mt-1">Target: 2.50s</p>
            </div>
            <div className="col-span-2 rounded-md border border-dashed border-border/60 p-3 bg-muted/10 text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground/80">Model logic:</strong> cost = load × £2.8M × (1 + (compute − 60)/200). P95 = load × 1.4s × (1 − (compute − 60)/400). Both linear; real platforms would use non-linear queueing models. Swap in your own model under <code className="font-mono">src/app/_pages/dashboard.tsx</code>.
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Layer table inspector */}
      <SectionCard
        title="Layer inspector"
        description="Click through to the corresponding architecture page for each Medallion layer."
        icon={<Boxes className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/60">
          {MEDALLION_LAYERS.map((l) => (
            <Link
              key={l.layer}
              href={hrefFor("databricks")}
              className="p-5 hover:bg-muted/20 transition-colors block"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="h-3 w-3 rounded-full" style={{ background: LAYER_COLORS[l.layer] }} />
                <p className="text-lg font-semibold">{l.layer}</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{l.purpose}</p>
              <dl className="text-xs space-y-1">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tables</dt>
                  <dd className="font-mono">{l.tables}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Volume</dt>
                  <dd className="font-mono">{l.volume}</dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      </SectionCard>

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">
          → Why these patterns? (Knowledge Hub)
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("governance")} className="text-sm text-primary hover:underline">
          → How anomalies get detected (Governance)
        </Link>
      </div>
    </div>
  );
}
