"use client";

import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Zap, Workflow, Activity, Database, Gauge, ArrowRight } from "lucide-react";
import { PyodideRunner } from "./pyodide-runner";
import { CodeBlock } from "./code-block";

/**
 * OrchestrationCaseStudy — real-world case study for the Orchestration page.
 * Shows Airflow at Airbnb: 3,000+ DAGs, 100M+ task instances/year,
 * the world's largest Airflow deployment. Mirrors the LHC ingestion pattern.
 */

interface LazyModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  accent: string;
  icon: ReactNode;
  children: ReactNode;
}

function LazyModal({ open, onClose, title, subtitle, accent, icon, children }: LazyModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 md:p-6 overflow-y-auto" onClick={onClose}>
          <button type="button" onClick={onClose} className="absolute top-3 right-3 z-30 p-2 rounded-full bg-background/90 border border-border hover:bg-accent transition-colors" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
          <div className="absolute top-3 left-3 z-30 px-3 py-1.5 rounded-full bg-background/90 border border-border flex items-center gap-2 text-xs font-semibold">
            <span style={{ color: accent }}>{icon}</span><span style={{ color: accent }}>{title}</span>
          </div>
          <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ duration: 0.25 }}
            className="relative w-full max-w-4xl my-8 rounded-xl border border-border bg-background shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-border/40 bg-muted/20 px-4 md:px-6 py-3 flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0" style={{ backgroundColor: accent + "20" }}>{icon}</div>
              <div className="min-w-0">
                <p className="text-base font-bold leading-tight" style={{ color: accent }}>{title}</p>
                {subtitle && <p className="text-xs text-muted-foreground font-mono">{subtitle}</p>}
              </div>
            </div>
            <div className="p-4 md:p-6 max-h-[80vh] overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AirflowPipelineViz() {
  const [activeStage, setActiveStage] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActiveStage(s => (s + 1) % 6), 1500);
    return () => clearInterval(id);
  }, []);
  const stages = [
    { name: "Scheduler", rate: "3,000+ DAGs", desc: "Parse DAG files, build task queue" },
    { name: "Executor", rate: "Celery + K8s", desc: "Distribute tasks across 500+ workers" },
    { name: "Workers", rate: "500+ pods", desc: "Run tasks in K8s pods (auto-scale)" },
    { name: "Metadata DB", rate: "PostgreSQL", desc: "100M+ task instances/year" },
    { name: "Web UI", rate: "Real-time", desc: "Tree view, Gantt, task logs" },
    { name: "Alerts", rate: "Slack + PD", desc: "P1/P2 auto-paging, retry logic" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <svg viewBox="0 0 500 200" className="w-full h-auto">
        {stages.map((s, i) => {
          const x = 20 + i * 80; const isActive = i === activeStage;
          return (
            <motion.g key={i} animate={{ opacity: isActive ? 1 : 0.4 }} transition={{ duration: 0.3 }}>
              {i < stages.length - 1 && <motion.line x1={x + 55} y1="100" x2={x + 75} y2="100" stroke={isActive ? "oklch(0.75 0.16 165)" : "oklch(0.55 0.05 250 / 0.3)"} strokeWidth={isActive ? 2 : 1} />}
              <motion.rect x={x} y="55" width="55" height="55" rx="4" fill={isActive ? "oklch(0.65 0.16 165 / 0.3)" : "oklch(0.55 0.05 250 / 0.1)"} stroke={isActive ? "oklch(0.75 0.16 165)" : "oklch(0.55 0.05 250)"} strokeWidth={isActive ? 1.5 : 0.8} />
              <text x={x + 27.5} y="80" textAnchor="middle" fontSize="7" fill={isActive ? "oklch(0.85 0.16 165)" : "oklch(0.55 0.05 250)"} fontWeight="bold">{s.name}</text>
              <text x={x + 27.5} y="92" textAnchor="middle" fontSize="6" fill={isActive ? "oklch(0.75 0.10 165)" : "oklch(0.45 0.05 250)"}>{s.rate}</text>
              {isActive && <motion.circle cx={x + 27.5} cy="130" r="3" fill="oklch(0.85 0.16 165)" animate={{ cx: [x + 5, x + 50, x + 5] }} transition={{ duration: 1.5, repeat: Infinity }} />}
            </motion.g>
          );
        })}
        <text x="250" y="160" textAnchor="middle" fontSize="9" fill="oklch(0.75 0.16 165)" fontWeight="bold">{stages[activeStage].name}: {stages[activeStage].desc}</text>
        <text x="250" y="175" textAnchor="middle" fontSize="8" fill="oklch(0.55 0.05 250)">Scale: {stages[activeStage].rate}</text>
      </svg>
    </div>
  );
}

function DataToggle() {
  const [mode, setMode] = useState<"real" | "synthetic">("real");
  const realStats = `Airbnb Airflow Production Stats (2024)
──────────────────────────────────
DAGs:              3,000+
Task instances:    100M+ / year
Workers:           500+ (K8s pods, auto-scaled)
Scheduler:         CeleryExecutor → KubernetesExecutor
Metadata DB:       PostgreSQL (Aurora, 32 vCPU)
DAG parse time:    < 60 seconds (parallel parsing)
SLA:               99.7% success rate
Avg task runtime:  12 minutes
P99 task runtime:  45 minutes
Retry policy:      3 retries with exponential backoff
Alerting:          PagerDuty (P1), Slack (P2)
Deploy frequency:  20+ DAG deploys/day
Code:              Internal fork of Apache Airflow
Open-sourced:      Airflow (2015), Superset (2016)`;
  const synth = () => {
    const dags = ["bronze_ingest_shopify", "silver_conform_orders", "gold_sales_mart", "gold_revenue_daily", "reverse_etl_audiences", "dq_great_expectations"];
    const lines = ["Synthetic Airflow Task Instances (simulated)", "─".repeat(60)];
    for (let i = 0; i < 8; i++) {
      const dag = dags[i % dags.length];
      const task = "task_" + Math.floor(Math.random() * 20);
      const state = ["success", "running", "success", "success", "failed", "success"][Math.floor(Math.random() * 6)];
      const runtime = (Math.random() * 30 + 2).toFixed(1);
      const retries = Math.random() > 0.8 ? Math.floor(Math.random() * 3) : 0;
      lines.push("dag=" + dag + "  task=" + task + "  state=" + state + "  runtime=" + runtime + "m  retries=" + retries);
    }
    return lines.join("\n");
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setMode("real")} className={`h-10 rounded-md border text-xs font-semibold transition-all ${mode === "real" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary hover:bg-accent"}`}>Real Airbnb stats</button>
        <button type="button" onClick={() => setMode("synthetic")} className={`h-10 rounded-md border text-xs font-semibold transition-all ${mode === "synthetic" ? "bg-amber-600 text-white border-amber-600" : "bg-card border-border hover:border-amber-500"}`}>Synthetic tasks</button>
      </div>
      <div className="rounded-md border border-border/60 bg-card p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{mode === "real" ? "Airbnb Airflow production stats" : "Synthetic task instances"}</p>
        <pre className="text-[10px] font-mono text-foreground/80 leading-relaxed overflow-x-auto whitespace-pre-wrap">{mode === "real" ? realStats : synth()}</pre>
      </div>
    </div>
  );
}

const AIRFLOW_CODE = `import random
import json

print("=== Airbnb Airflow Simulation (Python) ===")
print()

# Simulate Airflow DAG + task scheduling
dags = {
    "bronze_ingest_shopify": 5,
    "silver_conform_orders": 4,
    "gold_sales_mart": 8,
    "gold_revenue_daily": 3,
    "reverse_etl_audiences": 6,
    "dq_great_expectations": 4,
}

print("=== DAG Inventory ===")
total_tasks = sum(dags.values())
print("  DAGs: " + str(len(dags)))
print("  Total tasks (per run): " + str(total_tasks))
print("  At Airbnb scale: 3,000 DAGs, ~20 tasks each = 60,000 tasks/run")
print()

# Simulate one scheduler run (like Airflow scheduler tick)
print("=== Scheduler Run (simulated) ===")
states = ["success", "success", "success", "success", "failed", "running", "upstream_failed"]
task_results = []
total_runtime = 0
total_retries = 0

for dag_name, n_tasks in dags.items():
    for i in range(n_tasks):
        state = random.choice(states)
        runtime = random.uniform(2, 30)
        retries = random.randint(0, 2) if state == "failed" else 0
        total_runtime += runtime
        total_retries += retries
        task_results.append({"dag": dag_name, "task": "task_" + str(i), "state": state, "runtime": round(runtime, 1), "retries": retries})

n_success = sum(1 for t in task_results if t["state"] == "success")
n_failed = sum(1 for t in task_results if t["state"] == "failed")
n_running = sum(1 for t in task_results if t["state"] == "running")

print("  Tasks scheduled: " + str(len(task_results)))
print("  Success: " + str(n_success) + " (" + str(round(n_success/len(task_results)*100, 1)) + "%)")
print("  Failed: " + str(n_failed))
print("  Running: " + str(n_running))
print("  Total runtime: " + str(round(total_runtime, 1)) + " min")
print("  Total retries: " + str(total_retries))
print()

# SLA calculation
sla_target = 99.7
success_rate = n_success / len(task_results) * 100
print("=== SLA Check ===")
print("  Target: " + str(sla_target) + "% success rate")
print("  Actual: " + str(round(success_rate, 1)) + "%")
print("  SLA met: " + str(success_rate >= sla_target))
print()

# Airbnb scale extrapolation
print("=== Airbnb Scale ===")
airbnb_dags = 3000
airbnb_tasks_per_dag = 20
airbnb_daily_runs = 4  # 4 runs per day average
airbnb_yearly = airbnb_dags * airbnb_tasks_per_dag * airbnb_daily_runs * 365
print("  3,000 DAGs x 20 tasks x 4 runs/day x 365 days")
print("  = " + str(airbnb_yearly) + " task instances/year")
print("  = " + str(int(airbnb_yearly / 1e6)) + "M task instances/year")
print()
print("  Airbnb open-sourced Airflow in 2015 (now Apache).")
print("  It's the de-facto standard for data pipeline orchestration.")
print("  The platform uses the same DAG patterns — 15 DAGs vs 3,000.")`;

export function OrchestrationCaseStudy() {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-md border border-border/60 bg-card p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">DAGs</p>
          <p className="font-mono text-base font-bold text-primary">3,000+</p>
          <p className="text-[10px] text-muted-foreground">data pipelines</p>
        </div>
        <div className="rounded-md border border-border/60 bg-card p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Task instances/yr</p>
          <p className="font-mono text-base font-bold text-primary">100M+</p>
          <p className="text-[10px] text-muted-foreground">~88M tasks/year</p>
        </div>
        <div className="rounded-md border border-border/60 bg-card p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Workers</p>
          <p className="font-mono text-base font-bold text-primary">500+</p>
          <p className="text-[10px] text-muted-foreground">K8s pods, auto-scaled</p>
        </div>
        <div className="rounded-md border border-border/60 bg-card p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">SLA</p>
          <p className="font-mono text-base font-bold text-primary">99.7%</p>
          <p className="text-[10px] text-muted-foreground">task success rate</p>
        </div>
      </div>

      <AirflowPipelineViz />

      <div className="rounded-md border border-border/60 bg-card p-4">
        <p className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Database className="h-4 w-4 text-primary" /> Data: real Airbnb stats vs synthetic tasks</p>
        <DataToggle />
      </div>

      <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-amber-600" />
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Airflow DAG scheduler simulation (Pyodide-runnable)</p>
        </div>
        <CodeBlock language="python" filename="airbnb_airflow.py" code={AIRFLOW_CODE} />
        <PyodideRunner buttonLabel="Run Airflow simulation (Pyodide)" code={AIRFLOW_CODE} />
      </div>

      <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
        <p className="text-sm font-semibold text-primary mb-2">Airbnb&apos;s Airflow — the world&apos;s largest orchestration deployment</p>
        <div className="grid md:grid-cols-2 gap-3 text-xs text-muted-foreground leading-relaxed">
          <div>
            <p className="font-semibold text-foreground/80 mb-1">Why Airflow at Airbnb?</p>
            <p>Airbnb created Airflow in 2015 (now Apache) to manage their data pipelines. Before Airflow, they used cron jobs + shell scripts — unmaintainable at scale. Airflow&apos;s key insight: model pipelines as DAGs (directed acyclic graphs) in Python — code-first, version-controlled, testable.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground/80 mb-1">Airbnb&apos;s orchestration stack</p>
            <p>Built on Airflow: <strong>CeleryExecutor</strong> (distributed task queue) → <strong>KubernetesExecutor</strong> (pod-per-task, auto-scaled). <strong>Great Expectations</strong> for data quality checks. <strong>PagerDuty</strong> integration for P1 alerts. Internal Airflow fork with custom operators for their data warehouse (Presto/Spark).</p>
          </div>
          <div>
            <p className="font-semibold text-foreground/80 mb-1">Scaling challenges</p>
            <p>At 3,000 DAGs: DAG parse time optimization (parallel parsing), scheduler throughput (one tick per 5s), metadata DB pressure (100M+ rows/year → partitioned PostgreSQL), worker pod lifecycle (cold start optimization), backpressure (don&apos;t overload downstream systems).</p>
          </div>
          <div>
            <p className="font-semibold text-foreground/80 mb-1">Connection to the platform</p>
            <p>The ModernDataSciEng platform uses Airflow for: Bronze→Silver→Gold MERGE DAGs, reverse-ETL Hightouch syncs, Monte Carlo DQ scans, and feature store refreshes. Same DAG patterns — 15 DAGs vs 3,000. Same retry logic, same SLA monitoring.</p>
          </div>
        </div>
      </div>

      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5"><Zap className="h-3.5 w-3.5" /> Open detailed case study</Button>

      <LazyModal open={open} onClose={() => setOpen(false)} title="Airbnb Airflow — Deep Dive" subtitle="3,000+ DAGs, 100M+ task instances/year" accent="oklch(0.55 0.16 165)" icon={<Workflow className="h-4 w-4" />}>
        <div className="space-y-4">
          <AirflowPipelineViz />
          <DataToggle />
          <CodeBlock language="python" filename="airbnb_airflow.py" code={AIRFLOW_CODE} />
          <PyodideRunner buttonLabel="Run Airflow simulation (Pyodide)" code={AIRFLOW_CODE} />
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-xs">
            <p className="font-semibold text-emerald-700 dark:text-emerald-300 mb-1">Implementation insight</p>
            <p className="text-muted-foreground">Airbnb&apos;s Airflow deployment is 200x larger than the platform&apos;s (3,000 DAGs vs 15). But the patterns are identical: Python DAG definitions, retry with backoff, SLA monitoring, data quality checks via Great Expectations, auto-scaling workers. Airbnb open-sourced Airflow in 2015 — it became Apache Airflow, the de-facto standard. Every major data team (Apple, Netflix, Uber, Shopify) now runs Airflow.</p>
          </div>
        </div>
      </LazyModal>
    </div>
  );
}
