"use client";

import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  X, Zap, Sparkles, Database, ArrowRight, Activity, Atom, Cpu, Layers,
  Play, RotateCcw,
} from "lucide-react";
import { PyodideRunner } from "./pyodide-runner";
import { CodeBlock } from "./code-block";

/**
 * IngestionGallery — compact 3-layer interactive section for the
 * fivetran-hightouch (ELT + rETL) ingestion page. Mirrors the
 * 3-layer architecture from quantum-computing/space-science/fintech:
 *
 * Layer 1: 3D animated concept gallery (4 cards with n-D toggle)
 * Layer 2: Concept shorts (4 cards with Pyodide code + papers)
 * Layer 3: Interactive visuals (4 cards with sliders/buttons)
 *
 * All in browser popups (lazy evaluation).
 */

// ============================================================
// Shared utilities
// ============================================================
function LazyModal({ open, onClose, title, subtitle, accent, icon, children }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; accent: string; icon: ReactNode; children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 md:p-6 overflow-y-auto" onClick={onClose}>
          <button type="button" onClick={onClose} className="absolute top-3 right-3 z-30 p-2 rounded-full bg-background/90 border border-border hover:bg-accent" aria-label="Close"><X className="h-5 w-5" /></button>
          <div className="absolute top-3 left-3 z-30 px-3 py-1.5 rounded-full bg-background/90 border border-border flex items-center gap-2 text-xs font-semibold">
            <span style={{ color: accent }}>{icon}</span><span style={{ color: accent }}>{title}</span>
          </div>
          <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ duration: 0.25 }}
            className="relative w-full max-w-3xl my-8 rounded-xl border border-border bg-background shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-border/40 bg-muted/20 px-4 md:px-6 py-3 flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0" style={{ backgroundColor: accent + "20" }}>{icon}</div>
              <div><p className="text-base font-bold leading-tight" style={{ color: accent }}>{title}</p>{subtitle && <p className="text-xs text-muted-foreground font-mono">{subtitle}</p>}</div>
            </div>
            <div className="p-4 md:p-6 max-h-[80vh] overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const FLOATING_SNIPPETS = [
  "Bronze = append-only raw", "Silver = conformed + deduped", "Gold = business marts",
  "SCD2: valid_from + valid_to", "MERGE ON business_key", "dbt test --select state:modified",
  "Fivetran → S3 → Snowflake", "Hightouch ← Snowflake → SF", "ELT: load raw → transform in WH",
  "ETL: transform → load clean", "CDC: Debezium → Kafka → Bronze", "schema drift → PR → review",
  "Great Expectations: expect_column_to_exist", "Airflow: backfill --from 2024-01-01",
  "Parquet → Arrow → DuckDB", "Delta Lake: time travel", "Iceberg: snapshot isolation",
  "reverse-ETL: Gold → CRM", "CHANGELOG: type 1/2/3", "data contract: avro + schema registry",
  "Watermark: event_time + 30s", "Checkpoint: /opt/airflow/dag_runs", "upsert: merge_type=upsert",
  "partition by date_trunc('day', ts)", "VACUUM table RETAIN 168 HOURS",
];

function FloatingBackground() {
  const items = FLOATING_SNIPPETS.map((text, i) => ({
    text, x: (i * 53) % 95, y: (i * 37) % 90, delay: (i * 1.7) % 14, duration: 14 + (i % 7), size: 10 + ((i * 3) % 5),
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <style>{`.ig-bg-float { position: absolute; font-family: ui-monospace, monospace; color: oklch(0.65 0.15 250 / 0.12); pointer-events: none; white-space: nowrap; font-size: 11px; animation: ig-bg-drift linear infinite; } @keyframes ig-bg-drift { from { transform: translateY(0); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } to { transform: translateY(-180px); opacity: 0; } }`}</style>
      {items.map((it, i) => (
        <div key={i} className="ig-bg-float" style={{ left: `${it.x}%`, bottom: `${it.y - 50}%`, animationDelay: `${it.delay}s`, animationDuration: `${it.duration}s`, fontSize: `${it.size}px` }}>{it.text}</div>
      ))}
    </div>
  );
}

// ============================================================
// Layer 1: 3D animated concept gallery (4 cards)
// ============================================================
function Medallion3D({ dim }: { dim: number }) {
  const layers = dim === 3 ? 1 : dim === 4 ? 2 : dim === 5 ? 3 : 4;
  const names = ["Bronze (raw)", "Silver (conformed)", "Gold (marts)", "Platinum (ML features)"];
  const colors = ["oklch(0.65 0.16 30)", "oklch(0.65 0.16 165)", "oklch(0.65 0.16 60)", "oklch(0.65 0.16 320)"];
  return (
    <svg viewBox="0 0 360 280" className="w-full h-auto">
      {[0, 1, 2, 3].slice(0, layers).map((i) => {
        const y = 40 + i * 50; const w = 200 + (3 - i) * 30; const x = (360 - w) / 2;
        return (
          <motion.g key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.2 }}>
            <rect x={x} y={y} width={w} height="40" rx="4" fill={colors[i] + "30"} stroke={colors[i]} strokeWidth="1.5" />
            <text x={180} y={y + 25} textAnchor="middle" fontSize="11" fill={colors[i]} fontWeight="bold">{names[i]}</text>
            {i < layers - 1 && <line x1={180} y1={y + 40} x2={180} y2={y + 50} stroke={colors[i]} strokeWidth="1" markerEnd="url(#ig-arrow)" />}
          </motion.g>
        );
      })}
      <defs><marker id="ig-arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="oklch(0.55 0.05 250)" /></marker></defs>
      <text x="180" y="265" textAnchor="middle" fontSize="9" fill="oklch(0.55 0.05 250)">{layers} layers — {dim === 3 ? "Bronze only" : dim === 4 ? "Bronze→Silver" : dim === 5 ? "Bronze→Silver→Gold" : "Full medallion + ML"}</text>
    </svg>
  );
}

function KafkaStream3D({ dim }: { dim: number }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => { const id = setInterval(() => setPhase(p => (p + 0.1) % (2 * Math.PI)), 50); return () => clearInterval(id); }, []);
  const topics = dim === 3 ? 1 : dim === 4 ? 2 : dim === 5 ? 3 : 5;
  return (
    <svg viewBox="0 0 360 280" className="w-full h-auto">
      <rect x="20" y="120" width="60" height="40" rx="4" fill="oklch(0.65 0.16 250 / 0.3)" stroke="oklch(0.65 0.16 250)" strokeWidth="1.5" />
      <text x="50" y="145" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 250)" fontWeight="bold">Producer</text>
      {Array.from({ length: topics }).map((_, i) => {
        const x = 120 + i * 45;
        return (
          <motion.g key={i}>
            <rect x={x} y="100" width="35" height="80" rx="3" fill="oklch(0.65 0.16 165 / 0.2)" stroke="oklch(0.65 0.16 165)" strokeWidth="1" />
            <text x={x + 17.5} y="95" textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 165)">T{i}</text>
            <line x1="80" y1="140" x2={x} y2="140" stroke="oklch(0.55 0.05 250 / 0.4)" strokeWidth="0.8" />
            <motion.circle cx={80 + ((x - 80) * (phase / (2 * Math.PI)))} cy="140" r="2" fill="oklch(0.75 0.16 250)" animate={{ cx: [80, x] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }} />
          </motion.g>
        );
      })}
      <rect x="290" y="120" width="60" height="40" rx="4" fill="oklch(0.65 0.16 60 / 0.3)" stroke="oklch(0.65 0.16 60)" strokeWidth="1.5" />
      <text x="320" y="145" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 60)" fontWeight="bold">Consumer</text>
      <text x="180" y="265" textAnchor="middle" fontSize="9" fill="oklch(0.55 0.05 250)">{topics} Kafka topic{topics > 1 ? "s" : ""} — {dim === 3 ? "single topic" : dim === 4 ? "2 topics" : dim === 5 ? "3 topics" : "5 topics (full)"}</text>
    </svg>
  );
}

function AirflowDAG3D({ dim }: { dim: number }) {
  const tasks = dim === 3 ? 3 : dim === 4 ? 5 : dim === 5 ? 7 : 10;
  const [activeTask, setActiveTask] = useState(0);
  useEffect(() => { const id = setInterval(() => setActiveTask(t => (t + 1) % tasks), 800); return () => clearInterval(id); }, [tasks]);
  return (
    <svg viewBox="0 0 360 280" className="w-full h-auto">
      {Array.from({ length: tasks }).map((_, i) => {
        const row = Math.floor(i / 4); const col = i % 4;
        const x = 60 + col * 70; const y = 60 + row * 60;
        const isActive = i === activeTask;
        return (
          <motion.g key={i} animate={{ opacity: isActive ? 1 : 0.4 }}>
            <rect x={x} y={y} width="50" height="30" rx="3" fill={isActive ? "oklch(0.65 0.16 165 / 0.4)" : "oklch(0.55 0.05 250 / 0.1)"} stroke={isActive ? "oklch(0.75 0.16 165)" : "oklch(0.55 0.05 250)"} strokeWidth={isActive ? 1.5 : 0.8} />
            <text x={x + 25} y={y + 20} textAnchor="middle" fontSize="8" fill={isActive ? "oklch(0.85 0.16 165)" : "oklch(0.55 0.05 250)"} fontWeight="bold">T{i}</text>
            {col < 3 && i + 1 < tasks && <line x1={x + 50} y1={y + 15} x2={x + 70} y2={y + 15} stroke="oklch(0.55 0.05 250 / 0.3)" strokeWidth="0.8" />}
          </motion.g>
        );
      })}
      <text x="180" y="265" textAnchor="middle" fontSize="9" fill="oklch(0.55 0.05 250)">{tasks} tasks in DAG — {dim === 3 ? "minimal" : dim === 4 ? "Bronze→Silver" : dim === 5 ? "Bronze→Gold" : "full pipeline"}</text>
    </svg>
  );
}

function SnowflakeExternal3D({ dim }: { dim: number }) {
  const layers = dim === 3 ? 1 : dim === 4 ? 2 : dim === 5 ? 3 : 4;
  return (
    <svg viewBox="0 0 360 280" className="w-full h-auto">
      <rect x="30" y="120" width="80" height="40" rx="4" fill="oklch(0.65 0.16 60 / 0.3)" stroke="oklch(0.65 0.16 60)" strokeWidth="1.5" />
      <text x="70" y="145" textAnchor="middle" fontSize="9" fill="oklch(0.65 0.16 60)" fontWeight="bold">S3 Bucket</text>
      {Array.from({ length: layers }).map((_, i) => {
        const x = 160 + i * 55;
        return (
          <motion.g key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.2 }}>
            <rect x={x} y={60 + i * 30} width="80" height="40" rx="4" fill="oklch(0.65 0.16 250 / 0.2)" stroke="oklch(0.65 0.16 250)" strokeWidth="1" />
            <text x={x + 40} y={85 + i * 30} textAnchor="middle" fontSize="7" fill="oklch(0.65 0.16 250)">{"Layer " + (i + 1)}</text>
            <line x1="110" y1="140" x2={x} y2={80 + i * 30} stroke="oklch(0.55 0.05 250 / 0.3)" strokeWidth="0.8" strokeDasharray="2 1" />
          </motion.g>
        );
      })}
      <text x="180" y="265" textAnchor="middle" fontSize="9" fill="oklch(0.55 0.05 250)">{layers} warehouse layer{layers > 1 ? "s" : ""} — external table + {dim === 3 ? "1 view" : dim === 4 ? "2 views" : dim === 5 ? "3 views" : "full analytics stack"}</text>
    </svg>
  );
}

function DimToggle({ value, onChange }: { value: number; onChange: (d: number) => void }) {
  const opts = [{ d: 3, l: "3D", h: "simplest" }, { d: 4, l: "4D", h: "standard" }, { d: 5, l: "5D", h: "full" }, { d: 99, l: "N-D", h: "extreme" }];
  return (
    <div className="flex flex-wrap gap-1.5 items-center justify-center bg-muted/30 rounded-md p-1.5 border border-border/40">
      <span className="text-[10px] text-muted-foreground px-1 flex items-center gap-1"><Layers className="h-3 w-3" /> Scope:</span>
      {opts.map(o => <button key={o.d} type="button" onClick={() => onChange(o.d)} className={`text-[10px] px-2 py-1 rounded transition-colors ${value === o.d ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-accent text-foreground/70"}`} title={o.h}>{o.l}</button>)}
    </div>
  );
}

const GALLERY_CARDS = [
  { id: "medallion", title: "Medallion architecture", subtitle: "Bronze → Silver → Gold", accent: "oklch(0.55 0.16 30)", icon: <Layers className="h-4 w-4" />, component: Medallion3D, caption: "Bronze = append-only raw, Silver = conformed + deduped, Gold = business marts. The medallion pattern separates concerns: raw data is never modified, transforms are idempotent MERGE operations." },
  { id: "kafka", title: "Kafka streaming", subtitle: "Producer → Topics → Consumer", accent: "oklch(0.55 0.16 250)", icon: <Activity className="h-4 w-4" />, component: KafkaStream3D, caption: "Kafka is the nervous system: producers write events to topics, consumers read at their own pace. Topics are partitioned for parallelism, replicated for durability. 7T msgs/day at LinkedIn scale." },
  { id: "airflow", title: "Airflow DAG", subtitle: "Task dependencies + retries", accent: "oklch(0.55 0.16 165)", icon: <Cpu className="h-4 w-4" />, component: AirflowDAG3D, caption: "DAGs model pipeline dependencies: Task A → Task B → Task C. Airflow handles retries, SLAs, backfilling. 3,000+ DAGs at Airbnb." },
  { id: "snowflake", title: "Snowflake external tables", subtitle: "S3 → external table → views", accent: "oklch(0.55 0.16 60)", icon: <Database className="h-4 w-4" />, component: SnowflakeExternal3D, caption: "ELT pattern: load raw to S3, register as external table in Snowflake (zero-copy), transform via SQL views. No data duplication — warehouse reads S3 directly." },
];

// ============================================================
// Layer 2: Concept shorts (4 cards with Pyodide code)
// ============================================================
const SCD2_CODE = `print("=== SCD2 (Slowly Changing Dimension Type 2) ===")
print()
print("Problem: customer changes their address.")
print("  Type 1: overwrite (lose history)")
print("  Type 2: insert new row, keep old (preserve history)")
print("  Type 3: add new column (limited history)")
print()

# Simulate SCD2 merge
customers = [
    {"business_key": "C001", "name": "Alice", "city": "London", "valid_from": "2024-01-01", "valid_to": None, "is_current": True},
]

new_record = {"business_key": "C001", "name": "Alice", "city": "Paris", "valid_from": "2024-06-01"}

print("Before merge:")
for c in customers:
    print("  " + str(c))

# SCD2 merge logic
for c in customers:
    if c["business_key"] == new_record["business_key"] and c["is_current"]:
        c["valid_to"] = new_record["valid_from"]
        c["is_current"] = False

new_record["valid_to"] = None
new_record["is_current"] = True
customers.append(new_record)

print()
print("After SCD2 merge:")
for c in customers:
    status = "CURRENT" if c["is_current"] else "HISTORICAL"
    print("  " + c["name"] + " | " + c["city"] + " | " + c["valid_from"] + " to " + str(c["valid_to"]) + " | " + status)`;

const SCHEMA_DRIFT_CODE = `import json

print("=== Schema Drift Handling ===")
print()

# Simulate Fivetran detecting a new column
old_schema = {"id": "INT", "email": "VARCHAR", "amount": "DECIMAL"}
new_schema = {"id": "INT", "email": "VARCHAR", "amount": "DECIMAL", "phone": "VARCHAR", "tier": "VARCHAR"}

added = set(new_schema.keys()) - set(old_schema.keys())
removed = set(old_schema.keys()) - set(new_schema.keys())
changed_types = {k for k in (set(old_schema.keys()) & set(new_schema.keys())) if old_schema[k] != new_schema[k]}

print("Old schema: " + str(old_schema))
print("New schema: " + str(new_schema))
print()
print("Added columns: " + str(added) if added else "Added columns: none")
print("Removed columns: " + str(removed) if removed else "Removed columns: none")
print("Type changes: " + str(changed_types) if changed_types else "Type changes: none")
print()
print("Auto-response (Fivetran + dbt):")
print("  1. Fivetran auto-adds new columns to Bronze (append-only)")
print("  2. Schema registry PR auto-created for review")
print("  3. Great Expectations runs on new column")
print("  4. PR approved by data_platform owner (CODEOWNERS)")
print("  5. Silver/Gold schemas updated in next dbt run")
print("  6. Old columns retained with __deprecated suffix for 90 days")`;

const REVERSE_ETL_CODE = `print("=== Reverse-ETL (Hightouch pattern) ===")
print()
print("Standard ETL: source -> warehouse")
print("Reverse-ETL:   warehouse -> destination (CRM, ads, email)")
print()

# Simulate reverse-ETL sync
gold_table = [
    {"customer_id": 1, "email": "alice@example.com", "ltv": 1250, "segment": "VIP"},
    {"customer_id": 2, "email": "bob@example.com", "ltv": 350, "segment": "Standard"},
    {"customer_id": 3, "email": "carol@example.com", "ltv": 890, "segment": "Gold"},
]

# Hightouch audience: VIP customers with LTV > 1000
audience = [c for c in gold_table if c["segment"] == "VIP" and c["ltv"] > 1000]

print("Gold table (warehouse):")
for c in gold_table:
    print("  " + c["email"] + " | LTV=" + str(c["ltv"]) + " | " + c["segment"])
print()
print("Hightouch audience (VIP + LTV>1000):")
for c in audience:
    print("  " + c["email"] + " -> synced to Salesforce + Klaviyo")
print()
print("Sync destinations:")
print("  Salesforce: update Account.tier = 'VIP'")
print("  Klaviyo: add to 'VIP Customers' list")
print("  Meta: create Custom Audience for VIP lookalike")
print("  Slack: #vip-alerts notification")`;

const ELT_VS_ETL_CODE = `print("=== ELT vs ETL Comparison ===")
print()
print("ETL (Extract-Transform-Load):")
print("  1. Extract: read from source API")
print("  2. Transform: clean, join, validate on ETL server")
print("  3. Load: write clean data to warehouse")
print("  Data in WH: clean, ready for analytics")
print("  Advantage: warehouse stays clean")
print("  Disadvantage: ETL server is a bottleneck + cost")
print()
print("ELT (Extract-Load-Transform):")
print("  1. Extract: read from source API")
print("  2. Load: write RAW to object storage (S3/GCS)")
print("  3. Transform: SQL/UDFs IN the warehouse")
print("  Data in WH: raw + external tables + views")
print("  Advantage: elastic warehouse compute, raw preserved")
print("  Disadvantage: storage cost (but S3 is $23/TB/month)")
print()
print("Modern pattern: ELT + materialized views")
print("  - Raw data in S3 (cheap, immutable)")
print("  - External tables in Snowflake (zero-copy)")
print("  - Materialized views for hot queries (pre-computed)")
print("  - Best of both: raw + fast")`;

const SHORTS_CODE: Record<string, string> = {
  scd2: SCD2_CODE,
  drift: SCHEMA_DRIFT_CODE,
  retl: REVERSE_ETL_CODE,
  elt: ELT_VS_ETL_CODE,
};

const SHORTS = [
  { id: "scd2", step: "1", title: "SCD2 — preserving history", subtitle: "valid_from + valid_to + is_current", accent: "oklch(0.55 0.16 30)" },
  { id: "drift", step: "2", title: "Schema drift handling", subtitle: "Fivetran auto-detect → PR → review", accent: "oklch(0.55 0.16 250)" },
  { id: "retl", step: "3", title: "Reverse-ETL (Hightouch)", subtitle: "warehouse → CRM/ads/email", accent: "oklch(0.55 0.16 165)" },
  { id: "elt", step: "4", title: "ELT vs ETL comparison", subtitle: "load raw → transform in WH", accent: "oklch(0.55 0.16 60)" },
];

// ============================================================
// Layer 3: Interactive visuals (4 cards)
// ============================================================
function ThroughputCalculator() {
  const [sources, setSources] = useState(14);
  const [rowsPerSec, setRowsPerSec] = useState(10000);
  const totalRowsPerSec = sources * rowsPerSec;
  const rowsPerMonth = totalRowsPerSec * 86400 * 30;
  const tbPerMonth = (rowsPerMonth * 500) / 1e12; // ~500 bytes/row
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Source systems</span><span className="font-mono text-primary">{sources}</span></div>
        <input type="range" min={1} max={50} step={1} value={sources} onChange={(e) => setSources(+e.target.value)} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-muted" style={{ accentColor: "oklch(0.55 0.16 250)" }} />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Rows/sec per source</span><span className="font-mono text-primary">{rowsPerSec.toLocaleString()}</span></div>
        <input type="range" min={100} max={100000} step={100} value={rowsPerSec} onChange={(e) => setRowsPerSec(+e.target.value)} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-muted" style={{ accentColor: "oklch(0.55 0.16 250)" }} />
      </div>
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
        <p className="font-mono text-sm text-primary">{totalRowsPerSec.toLocaleString()} rows/sec total</p>
        <p className="font-mono text-xs text-muted-foreground mt-1">{rowsPerMonth.toLocaleString()} rows/month</p>
        <p className="font-mono text-xs text-muted-foreground">{tbPerMonth.toFixed(1)} TB/month (at ~500 B/row)</p>
      </div>
    </div>
  );
}

function LatencyCalculator() {
  const [batchSize, setBatchSize] = useState(1000);
  const [processingMs, setProcessingMs] = useState(500);
  const totalLatency = batchSize + processingMs;
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Batch size (rows)</span><span className="font-mono text-primary">{batchSize}</span></div>
        <input type="range" min={100} max={10000} step={100} value={batchSize} onChange={(e) => setBatchSize(+e.target.value)} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-muted" style={{ accentColor: "oklch(0.55 0.16 165)" }} />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Processing time (ms)</span><span className="font-mono text-primary">{processingMs} ms</span></div>
        <input type="range" min={10} max={5000} step={10} value={processingMs} onChange={(e) => setProcessingMs(+e.target.value)} className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-muted" style={{ accentColor: "oklch(0.55 0.16 165)" }} />
      </div>
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
        <p className="font-mono text-sm text-primary">End-to-end latency: {totalLatency} ms ({(totalLatency / 1000).toFixed(2)}s)</p>
        <p className="text-[11px] text-muted-foreground mt-1">Batch: {batchSize} rows in {processingMs}ms = {(batchSize / (processingMs / 1000)).toFixed(0)} rows/sec</p>
        <p className="text-[11px] text-muted-foreground">Streaming: ~{Math.round(processingMs / 2)}ms (if micro-batch=1)</p>
      </div>
    </div>
  );
}

const INTERACTIVES = [
  { id: "throughput", title: "Throughput calculator", subtitle: "sources × rows/sec → TB/month", accent: "oklch(0.55 0.16 250)", icon: <Activity className="h-4 w-4" />, component: ThroughputCalculator },
  { id: "latency", title: "Latency calculator", subtitle: "batch size vs streaming", accent: "oklch(0.55 0.16 165)", icon: <Zap className="h-4 w-4" />, component: LatencyCalculator },
];

// ============================================================
// Main component
// ============================================================
export function IngestionGallery() {
  const [dim, setDim] = useState(3);
  const [openGallery, setOpenGallery] = useState<string | null>(null);
  const [openShort, setOpenShort] = useState<string | null>(null);
  const [openInteractive, setOpenInteractive] = useState<string | null>(null);
  const galleryCard = openGallery ? GALLERY_CARDS.find(c => c.id === openGallery) : null;
  const shortCard = openShort ? SHORTS.find(s => s.id === openShort) : null;
  const interactiveCard = openInteractive ? INTERACTIVES.find(c => c.id === openInteractive) : null;

  return (
    <div className="space-y-6">
      {/* Layer 1: 3D animated concept gallery */}
      <div>
        <p className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" /> Layer 1: 3D concept gallery — click to expand (lazy popup)</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {GALLERY_CARDS.map(c => {
            const Comp = c.component;
            return (
              <motion.button key={c.id} type="button" onClick={() => setOpenGallery(c.id)}
                className="relative rounded-xl overflow-hidden border border-border/60 hover:border-primary/60 hover:shadow-lg transition-all bg-gradient-to-br from-card to-muted/30 group"
                whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} aria-label={`Open: ${c.title}`}>
                <div className="relative w-full bg-gradient-to-br from-muted/40 to-card" style={{ aspectRatio: "9 / 12", maxHeight: 200 }}>
                  <div className="absolute inset-0 p-2"><Comp dim={dim} /></div>
                  <div className="absolute top-2 left-2 z-10"><Badge variant="secondary" className="text-[10px] h-5 px-1.5" style={{ backgroundColor: c.accent + "20", color: c.accent }}>{c.icon} 3D</Badge></div>
                </div>
                <div className="p-2 border-t border-border/40"><p className="text-xs font-semibold" style={{ color: c.accent }}>{c.title}</p><p className="text-[10px] text-muted-foreground font-mono">{c.subtitle}</p></div>
              </motion.button>
            );
          })}
        </div>
        <div className="mt-2"><DimToggle value={dim} onChange={setDim} /></div>
      </div>

      {/* Layer 2: Concept shorts */}
      <div>
        <p className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" /> Layer 2: Concept shorts — Pyodide-runnable code + recent patterns</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SHORTS.map(s => (
            <motion.button key={s.id} type="button" onClick={() => setOpenShort(s.id)}
              className="relative rounded-xl overflow-hidden border border-border/60 hover:border-primary/60 hover:shadow-lg transition-all bg-gradient-to-br from-card to-muted/30 group"
              whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} aria-label={`Open: ${s.title}`}>
              <div className="p-3">
                <Badge variant="secondary" className="text-[10px] mb-1" style={{ backgroundColor: s.accent + "20", color: s.accent }}>SHORT {s.step}</Badge>
                <p className="text-xs font-semibold" style={{ color: s.accent }}>{s.title}</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{s.subtitle}</p>
                <Badge className="text-[9px] mt-1 gap-0.5"><Play className="h-2 w-2" /> Pyodide</Badge>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Layer 3: Interactive visuals */}
      <div>
        <p className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" /> Layer 3: Interactive visuals — sliders + live calculation</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {INTERACTIVES.map(c => {
            const Comp = c.component;
            return (
              <div key={c.id} className="rounded-md border border-border/60 bg-card p-4">
                <p className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: c.accent }}>{c.icon} {c.title}</p>
                <p className="text-[10px] text-muted-foreground font-mono mb-3">{c.subtitle}</p>
                <Comp />
              </div>
            );
          })}
        </div>
      </div>

      {/* Lazy modals */}
      <LazyModal open={!!galleryCard} onClose={() => setOpenGallery(null)} title={galleryCard?.title ?? ""} subtitle={galleryCard?.subtitle} accent={galleryCard?.accent ?? "oklch(0.55 0.16 250)"} icon={galleryCard?.icon ?? <Layers className="h-4 w-4" />}>
        {galleryCard && (
          <div className="space-y-3">
            <div className="relative bg-gradient-to-br from-background to-muted/30 p-4 rounded-lg overflow-hidden"><FloatingBackground /><div className="relative z-10"><galleryCard.component dim={dim} /></div></div>
            <DimToggle value={dim} onChange={setDim} />
            <p className="text-xs text-muted-foreground leading-relaxed">{galleryCard.caption}</p>
          </div>
        )}
      </LazyModal>

      <LazyModal open={!!shortCard} onClose={() => setOpenShort(null)} title={shortCard?.title ?? ""} subtitle={shortCard?.subtitle} accent={shortCard?.accent ?? "oklch(0.55 0.16 250)"} icon={<Sparkles className="h-4 w-4" />}>
        {shortCard && (
          <div className="space-y-3">
            <CodeBlock language="python" filename={`${shortCard.id}.py`} code={SHORTS_CODE[shortCard.id]} />
            <PyodideRunner buttonLabel="Run code (Pyodide)" code={SHORTS_CODE[shortCard.id]} />
          </div>
        )}
      </LazyModal>

      <LazyModal open={!!interactiveCard} onClose={() => setOpenInteractive(null)} title={interactiveCard?.title ?? ""} subtitle={interactiveCard?.subtitle} accent={interactiveCard?.accent ?? "oklch(0.55 0.16 250)"} icon={interactiveCard?.icon ?? <Zap className="h-4 w-4" />}>
        {interactiveCard && (() => { const Comp = interactiveCard.component; return <Comp />; })()}
      </LazyModal>
    </div>
  );
}
