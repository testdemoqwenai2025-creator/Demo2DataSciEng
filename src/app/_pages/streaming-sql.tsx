"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { STREAMING_SQL_SCIENCE_EXAMPLES } from "../_components/_dataset_examples14";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import {
  Cpu, Database, Boxes, Activity, Sparkles, History, Atom,
  FileText, TrendingUp, Server, Brain, Zap, ShieldCheck, Radio,
} from "lucide-react";

const KPIS = [
  { label: "Origin", value: "Flink SQL + Materialize 2018+", hint: "Flink SQL brought SQL to streaming (table is a stream, a stream is a table); Materialize brought differential dataflow to SQL materialized views; RisingWave (2022) added streaming mat views on Hummock storage", deltaTone: "flat" as const },
  { label: "Engines", value: "4 (Flink SQL + Spark SS SQL + Materialize + RisingWave)", hint: "Flink SQL (stream-table duality, temporal joins), Spark Structured Streaming SQL (event-time + watermarks), Materialize (differential dataflow), RisingWave (streaming mat views on Hummock)", deltaTone: "flat" as const },
  { label: "Windows", value: "3 (TUMBLE + HOP + SESSION)", hint: "TUMBLE: fixed-size non-overlapping [t, t+size). HOP: sliding overlapping [t, t+size) advancing by step. SESSION: gap-based — merge sessions where gap ≤ inactivity_gap", deltaTone: "up" as const },
  { label: "Latency", value: "t_event ≠ t_process", hint: "Event-time = when the event occurred. Processing-time = when the engine sees it. Watermark = max_seen(t_event) - allowed_lateness handles the gap (reordering, late arrivals)", deltaTone: "flat" as const },
];

// ============================================================
// Math constants — event time, watermark, windows
// ============================================================

const MATH_SECTION = `# ============================================================
# Streaming SQL Mathematical Foundations — Event Time, Watermark, Windows
# ============================================================

import math
import random
from collections import defaultdict

# --- 1. Event Time vs Processing Time ---
# t_event  = when the event occurred (recorded in the event payload)
# t_process = when the streaming engine received it
# latency  = t_process - t_event  (always >= 0 — events cannot arrive before they happen)
#
# Sources of latency:
#   - Network delay (e.g. lane multiplexing in sequencer reorders ~30s)
#   - Batching (e.g. Parquet writers flush every 64MB)
#   - Source clock skew (e.g. IoT sensors with drifting clocks)
#   - Backpressure (e.g. engine falling behind on a burst)

def simulate_event_time_vs_processing(n=200, mean_latency=5.0, jitter=15.0):
    """Generate events with realistic latency."""
    events = []
    for i in range(n):
        t_event = i * 1.0  # 1 event per second
        # Latency: log-normal (heavy tail — some events arrive very late)
        lat = random.lognormvariate(math.log(mean_latency), 0.5)
        # Add jitter (network reordering)
        lat += random.uniform(-jitter, jitter)
        lat = max(0.1, lat)
        t_process = t_event + lat
        events.append((t_event, t_process, lat))
    return events

random.seed(42)
events = simulate_event_time_vs_processing()
mean_lat = sum(e[2] for e in events) / len(events)
p99_lat = sorted(e[2] for e in events)[int(0.99 * len(events))]
max_lat = max(e[2] for e in events)
print("=== Event Time vs Processing Time ===")
print(f"  t_event  = when event occurred (recorded in payload)")
print(f"  t_process = when engine saw it (wall clock)")
print(f"  latency = t_process - t_event (always >= 0)")
print(f"  Simulated: mean latency = {mean_lat:.2f}s, p99 = {p99_lat:.2f}s, max = {max_lat:.2f}s")
print(f"  Latency distribution: heavy-tailed (log-normal + uniform jitter)")
print()

# --- 2. Watermark ---
# W(t) = max_seen(t_event) - allowed_lateness
# The watermark is a monotonically increasing estimate of "we will not see
# events older than W(t)". When the engine's clock reaches W(t), it
# finalises all windows with end <= W(t).
#
# Allowed lateness: the engine tolerates events arriving up to allowed_lateness
# after the watermark. Events arriving later are dropped (or routed to a side output / DLQ).

def compute_watermark(events, allowed_lateness=10.0):
    """Track the watermark as events arrive."""
    max_seen = -float('inf')
    watermark_history = []
    for t_event, t_process, _ in events:
        if t_event > max_seen:
            max_seen = t_event
        watermark = max_seen - allowed_lateness
        watermark_history.append((t_process, watermark, max_seen))
    return watermark_history

# Test different allowed_lateness values
print("=== Watermark: W(t) = max_seen(t_event) - allowed_lateness ===")
for lateness in [5.0, 10.0, 30.0, 60.0]:
    wm_hist = compute_watermark(events, allowed_lateness=lateness)
    # Count: how many events arrive after the watermark has passed (late)?
    final_wm = wm_hist[-1][1]
    n_late = sum(1 for t_event, t_process, _ in events if t_process > final_wm + lateness)
    print(f"  allowed_lateness={lateness:>4.0f}s: final watermark = {final_wm:>6.1f}, late events = {n_late}/{len(events)}")
print("  Higher allowed_lateness = fewer late events but more latency for windows.")
print()

# --- 3. TUMBLE Window: fixed-size non-overlapping [t, t+size) ---
def tumble_assign(t_event, size=60.0):
    """Return the [start, end) window for an event."""
    start = (t_event // size) * size
    return (start, start + size)

print("=== TUMBLE Window: [t, t+size), non-overlapping ===")
print("  Formula: window_start = floor(t_event / size) * size")
print("  window_end = window_start + size")
size = 60.0
for t in [5.0, 30.0, 59.9, 60.0, 90.0, 119.9, 120.0]:
    start, end = tumble_assign(t, size)
    print(f"  t_event={t:>6.1f} -> window [{start:>6.1f}, {end:>6.1f})")
print("  Non-overlapping: each event falls in exactly one window.")
print("  Use case: per-minute aggregates (per-LB collision rate, per-min variant quality).")
print()

# --- 4. HOP Window: sliding overlapping, advancing by step ---
def hop_assign(t_event, size=60.0, step=10.0):
    """Return all [start, end) windows an event belongs to."""
    windows = []
    # Earliest window start that contains t_event: floor((t - size) / step) * step
    earliest_start = ((t_event - size) // step) * step
    s = earliest_start
    while s <= t_event:
        if s <= t_event < s + size:
            windows.append((s, s + size))
        s += step
    return windows

print("=== HOP Window: [t, t+size) advancing by step (overlapping) ===")
print("  An event falls in ceil(size/step) windows")
hop_size = 60.0
hop_step = 10.0
t = 65.0
windows = hop_assign(t, hop_size, hop_step)
print(f"  t_event={t}, size={hop_size}, step={hop_step}: {len(windows)} windows")
for s, e in windows[:5]:
    print(f"    [{s}, {e})")
print(f"  Use case: rolling 60s stats updated every 10s (real-time dashboards).")
print()

# --- 5. SESSION Window: gap-based, merge where gap <= inactivity_gap ---
def session_assign(events_sorted, gap=30.0):
    """Group events into sessions where consecutive gaps <= inactivity_gap."""
    sessions = []
    if not events_sorted:
        return sessions
    current_session = [events_sorted[0]]
    for prev, curr in zip(events_sorted, events_sorted[1:]):
        if curr - prev <= gap:
            current_session.append(curr)
        else:
            sessions.append((current_session[0], current_session[-1], len(current_session)))
            current_session = [curr]
    sessions.append((current_session[0], current_session[-1], len(current_session)))
    return sessions

sorted_events = sorted([e[0] for e in events[:50]])
sessions = session_assign(sorted_events, gap=5.0)
print("=== SESSION Window: gap <= inactivity_gap (merge) ===")
print(f"  Formula: merge events where gap(prev, curr) <= inactivity_gap")
print(f"  50 events with inactivity_gap=5s -> {len(sessions)} sessions")
for s, e, n in sessions[:5]:
    print(f"    session [{s:.1f}, {e:.1f}] duration={e-s:.1f}s with {n} events")
print("  Use case: user sessions, sequencer activity bursts (idle gaps close sessions).")`;

// ============================================================
// Pyodide demo — Flink SQL windowing simulation
// ============================================================

const PYODIDE_DEMO = `# ============================================================
# Streaming SQL Windowing Simulation — Flink-style (Pyodide)
# Simulate TUMBLE + HOP + SESSION windows on variant stream
# ============================================================

import math
import random
from collections import defaultdict

# Simulate streaming variant calls with event-time + processing-time
random.seed(42)
n_events = 200
events = []
for i in range(n_events):
    t_event = i * 0.5  # event every 0.5s
    lat = random.lognormvariate(math.log(2.0), 0.6)  # 2s mean latency, heavy tail
    lat = max(0.1, lat)
    t_process = t_event + lat
    sequencer = random.choice(["NovaSeq-001", "NovaSeq-042", "NovaSeq-117"])
    qual = random.uniform(20, 60)
    events.append((t_event, t_process, sequencer, qual))

# Sort by processing time (realistic arrival order)
events_proc = sorted(events, key=lambda e: e[1])

print("=== Streaming Variant Events (200 events, 3 sequencers) ===")
print(f"  Event rate: ~2 events/s · mean latency: 2s · heavy-tail (log-normal)")
print(f"  Watermark: W(t) = max_seen(t_event) - 60s")
print()

# --- TUMBLE 30s windows: per-window variant quality per sequencer ---
print("=== TUMBLE Window (30s, non-overlapping) ===")
tumble_windows = defaultdict(lambda: defaultdict(list))
for t_event, t_process, seq, qual in events:
    start = (t_event // 30) * 30
    tumble_windows[(int(start), int(start+30))][seq].append(qual)

print(f"{'Window':>14} | {'Sequencer':<14} | {'N':>5} | {'Avg QUAL':>9}")
print("-" * 55)
for (s, e), seqs in sorted(tumble_windows.items())[:6]:
    for seq, quals in seqs.items():
        print(f"[{s:>3}, {e:>3})s | {seq:<14} | {len(quals):>5} | {sum(quals)/len(quals):>9.2f}")
print()

# --- HOP 60s windows, step 15s: overlapping ---
print("=== HOP Window (60s, step 15s, overlapping) ===")
hop_windows = defaultdict(lambda: defaultdict(int))
for t_event, t_process, seq, qual in events:
    earliest_start = ((t_event - 60) // 15) * 15
    s = earliest_start
    while s <= t_event:
        if s <= t_event < s + 60:
            hop_windows[(int(s), int(s+60))][seq] += 1
        s += 15

n_windows_per_event = 60 / 15  # 4 windows
print(f"  Each event falls in ceil(60/15)={int(n_windows_per_event)} windows")
print(f"  Total HOP windows: {len(hop_windows)}")
for (s, e), seqs in sorted(hop_windows.items())[:3]:
    total = sum(seqs.values())
    print(f"  Window [{s}, {e})s: {total} events")
print()

# --- SESSION 5s gap: merge by inactivity ---
print("=== SESSION Window (inactivity_gap=5s) ===")
all_event_times = sorted([e[0] for e in events])
sessions = []
current_session = [all_event_times[0]]
for prev, curr in zip(all_event_times, all_event_times[1:]):
    if curr - prev <= 5.0:
        current_session.append(curr)
    else:
        sessions.append(current_session)
        current_session = [curr]
sessions.append(current_session)

print(f"  200 events with inactivity_gap=5s -> {len(sessions)} sessions")
print(f"  Session durations: {[round(s[-1]-s[0], 1) for s in sessions[:5]]}...")
print()

# --- Watermark: how many events are "late" (dropped)? ---
print("=== Watermark: late event count at various allowed_lateness ===")
for lateness in [1.0, 5.0, 30.0, 60.0]:
    max_seen = -float('inf')
    n_late = 0
    for t_event, t_process, _, _ in events_proc:
        if t_event > max_seen:
            max_seen = t_event
        wm = max_seen - lateness
        # Event is "late" if its t_event < current watermark
        if t_event < wm:
            n_late += 1
    print(f"  allowed_lateness={lateness:>5.1f}s: {n_late}/{n_events} events dropped ({100*n_late/n_events:.1f}%)")`;

// ============================================================
// Streaming SQL architecture diagram
// ============================================================

function StreamingSqlArchitectureDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("sources");
  const nodes = {
    "sources": { label: "Stream Sources", desc: "Kafka topics, Pulsar, Kinesis, IoT sensors. Events carry event-time (when they happened).", level: 0 },
    "engine": { label: "Streaming SQL Engine", desc: "Flink SQL / Spark SS / Materialize / RisingWave. Parses SQL, builds DAG, executes with event-time semantics.", level: 1 },
    "watermark": { label: "Watermark Generator", desc: "W(t) = max_seen(t_event) - allowed_lateness. Monotonically increasing estimate of progress. Triggers window finalisation.", level: 2 },
    "windows": { label: "Windows (TUMBLE/HOP/SESSION)", desc: "TUMBLE: non-overlapping fixed-size. HOP: sliding overlapping. SESSION: gap-based merge. Each emits results when watermark passes window end.", level: 3 },
    "sinks": { label: "Sinks (mat views / Kafka / DB)", desc: "Materialized views, Kafka topics, JDBC sinks. Updates are incremental (differential dataflow) for sub-second latency.", level: 4 },
  };
  const edges = [
    ["sources", "engine"],
    ["engine", "watermark"],
    ["watermark", "windows"],
    ["windows", "sinks"],
    ["engine", "sinks"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "sources": { x: 70, y: 50 },
    "engine": { x: 200, y: 50 },
    "watermark": { x: 330, y: 50 },
    "windows": { x: 330, y: 130 },
    "sinks": { x: 200, y: 130 },
  };
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Radio className="h-3.5 w-3.5 text-primary" />
          Streaming SQL architecture — Sources → Engine → Watermark → Windows → Sinks
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 400 200" className="w-full h-auto">
          {edges.map(([from, to], i) => {
            const a = positions[from]; const b = positions[to];
            return (
              <line key={i} x1={a.x} y1={a.y + 15} x2={b.x} y2={b.y - 15}
                stroke="var(--border)" strokeWidth="0.8" markerEnd="url(#ssql-arrow)" />
            );
          })}
          {Object.entries(positions).map(([id, pos]) => {
            const isActive = activeNode === id;
            const node = nodes[id as keyof typeof nodes];
            const color = ["var(--chart-3)", "var(--chart-2)", "var(--chart-1)", "var(--chart-4)", "var(--muted-foreground)"][node.level];
            return (
              <motion.g key={id}
                onMouseEnter={() => setActiveNode(id)}
                onMouseLeave={() => setActiveNode(null)}
                animate={{ scale: isActive ? 1.05 : 1 }}
                style={{ cursor: "pointer" }}
              >
                <rect x={pos.x - 60} y={pos.y - 15} width="120" height="26" rx="4"
                  fill={isActive ? color + "30" : "var(--background)"}
                  stroke={color} strokeWidth={isActive ? 1.5 : 0.8} />
                <text x={pos.x} y={pos.y + 2} textAnchor="middle" fontSize="7.5"
                  fill={isActive ? color : "var(--foreground)"}
                  fontWeight={isActive ? "bold" : "normal"}>{node.label}</text>
              </motion.g>
            );
          })}
          <defs>
            <marker id="ssql-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" />
            </marker>
          </defs>
        </svg>
        {activeNode && (
          <div className="mt-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
            <p className="font-semibold text-primary mb-0.5">{nodes[activeNode as keyof typeof nodes].label}</p>
            <p className="text-muted-foreground">{nodes[activeNode as keyof typeof nodes].desc}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Comparison table
// ============================================================

function StreamingSqlComparisonTable() {
  const rows = [
    { feature: "Origin", flink: "Apache Flink (2014+ SQL 2018)", spark: "Spark Structured Streaming (Spark 2.0 2016)", materialize: "Materialize Inc (2018)", risingwave: "RisingWave Labs (2022)" },
    { feature: "Architecture", flink: "Distributed dataflow (JobManager/TaskManager)", spark: "Micro-batch (Spark engine)", materialize: "Differential dataflow (single-binary)", risingwave: "Streaming mat views on Hummock storage" },
    { feature: "Latency", flink: "~100ms (true streaming)", spark: "~100ms-100s (micro-batch)", materialize: "Sub-second (incremental)", risingwave: "Sub-second (streaming mat views)" },
    { feature: "SQL dialect", flink: "ANSI SQL + Table API + match_recognize (CEP)", spark: "ANSI SQL + MERGE INTO", materialize: "PostgreSQL-wire + mat views", risingwave: "PostgreSQL-wire + streaming mat views" },
    { feature: "Window types", flink: "TUMBLE + HOP + SESSION + CEP", spark: "TUMBLE + HOP + SESSION (window functions)", materialize: "Implicit via SELECT+GROUP BY", risingwave: "TUMBLE + HOP + SESSION" },
    { feature: "State backend", flink: "RocksDB / heap (incremental checkpoints)", spark: "RocksDB (state store v2)", materialize: "Differential dataflow timelines", risingwave: "Hummock (S3-backed LSM-tree)" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          Flink SQL vs Spark SS SQL vs Materialize vs RisingWave — 6 features
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold text-primary">Flink SQL</th>
              <th className="text-left px-3 py-2 font-semibold">Spark SS SQL</th>
              <th className="text-left px-3 py-2 font-semibold">Materialize</th>
              <th className="text-left px-3 py-2 font-semibold">RisingWave</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-primary/80">{r.flink}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.spark}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.materialize}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.risingwave}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// Main page component
// ============================================================

export function StreamingSqlPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Streaming SQL · Flink SQL · Spark Structured Streaming · Materialize · RisingWave · event time · watermarks · TUMBLE/HOP/SESSION"
        title="Streaming SQL Deep Dive — Flink SQL + Spark SS + Materialize + RisingWave"
        description="Streaming SQL brings declarative SQL to unbounded data streams. Four engines dominate: (1) Flink SQL — the stream-table duality ('a table is a stream, a stream is a table'), temporal joins (FOR SYSTEM_TIME AS OF), windowing (TUMBLE/HOP/SESSION), and MATCH_RECOGNIZE for complex event processing; (2) Spark Structured Streaming SQL — event-time + watermarks + MERGE INTO for change-data-capture; (3) Materialize — differential dataflow for incremental view maintenance, where a streaming materialized view recomputes only the changed rows on every input; (4) RisingWave — streaming materialized views on Hummock storage, PostgreSQL-wire compatible. This deep dive covers the mathematical foundations (event time vs processing time, watermark formula W(t) = max_seen(t_event) - allowed_lateness, the three window types), production SQL code, and scientific dataset examples from real-time genomics and LHC online monitoring."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Activity className="h-3 w-3" /> Event-time</Badge>
            <Badge variant="outline" className="gap-1.5"><Database className="h-3 w-3" /> Materialized views</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* Mathematical foundations — CRITICAL section */}
      <SectionCard
        title="Mathematical foundations — event time, watermark, windows"
        description="The mathematical foundations of streaming SQL. Event time separates 'when' from 'when seen', watermarks estimate progress despite reordering, the three window types aggregate bounded views of unbounded streams."
        icon={<Brain className="h-5 w-5" />}
        badge="mathematics"
      >
        <div className="space-y-4">
          {/* Event time vs processing time */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm font-semibold text-primary mb-2">1. Event Time vs Processing Time</p>
            <p className="font-mono text-xs text-primary mb-2">
              latency = t_process - t_event (always ≥ 0)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <code className="font-mono">t_event</code> is when the event occurred (recorded in the event payload, immutable).
              <code className="font-mono"> t_process</code> is when the streaming engine received it (wall clock, mutable).
              The gap is the <strong>latency</strong>: always non-negative (events cannot arrive before they happen), heavy-tailed
              (most events are fast, a few are very late). Sources: network delay (lane multiplexing reorders ~30s),
              batching (Parquet flushes every 64MB), source clock skew (IoT sensors drift), backpressure (engine falls behind on burst).
              Processing-time semantics give low latency but non-deterministic results (replays differ); event-time semantics give
              deterministic results but require watermarks to bound waiting. Flink, Spark, Materialize, RisingWave all default to
              event-time.
            </p>
          </div>
          {/* Watermark */}
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">2. Watermark</p>
            <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 mb-2">
              W(t) = max_seen(t_event) - allowed_lateness
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The watermark is a monotonically increasing estimate of <em>progress</em>: <em>&quot;we will not see events older than W(t)&quot;</em>.
              It is computed as the maximum event-time seen so far, minus an <code className="font-mono">allowed_lateness</code> tolerance.
              When the watermark passes a window's end, the window finalises and emits its result. Events arriving after the watermark
              has passed their window are <strong>late</strong> — either dropped or routed to a side output / dead-letter queue.
              Setting <code className="font-mono">allowed_lateness</code> is a trade-off: higher = fewer late events but more window latency
              (windows wait longer to finalise); lower = more late events but faster window emission. Typical values: 60s for genomics
              (lane multiplexing), 5min for IoT (network jitter), 1 day for batch-upstream systems. Flink supports punctuated watermarks
              (event carries the watermark) and periodic watermarks (engine computes from a sample of events).
            </p>
          </div>
          {/* TUMBLE */}
          <div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-3">
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">3. TUMBLE Window</p>
            <p className="font-mono text-xs text-violet-600 dark:text-violet-400 mb-2">
              window = [floor(t_event / size) × size, floor(t_event / size) × size + size)
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Fixed-size non-overlapping windows: each event falls in exactly one window. The window start is computed as
              <code className="font-mono"> floor(t_event / size) × size</code>, the end is <code className="font-mono">start + size</code>.
              <code className="font-mono">TUMBLE(event_time, INTERVAL '1' MINUTE)</code> gives 1-minute windows aligned to minute boundaries.
              Use case: per-minute aggregates (per-LB collision rate, per-min variant quality stats). Windows are deterministic for a
              given size, independent of arrival order. Emission: when the watermark passes the window end.
            </p>
          </div>
          {/* HOP */}
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">4. HOP Window (Sliding)</p>
            <p className="font-mono text-xs text-amber-600 dark:text-amber-400 mb-2">
              [t, t + size) advancing by step — each event falls in ceil(size / step) windows
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sliding overlapping windows: an event belongs to multiple windows. The hop step determines how often a new window starts;
              the hop size determines window length. Each event falls in <code className="font-mono">ceil(size / step)</code> windows.
              <code className="font-mono">HOP(event_time, INTERVAL '10' SECOND, INTERVAL '1' MINUTE)</code> = 1-minute windows starting every 10s.
              Use case: rolling 60s dashboards updated every 10s. Cost: <code className="font-mono">O(events × ceil(size/step))</code> — more
              state than TUMBLE. Often combined with <code className="font-mono">HAVING COUNT(*) &gt; threshold</code> for alerting.
            </p>
          </div>
          {/* SESSION */}
          <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3">
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-2">5. SESSION Window (Gap-based)</p>
            <p className="font-mono text-xs text-rose-600 dark:text-rose-400 mb-2">
              merge events where gap(prev, curr) ≤ inactivity_gap
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Session windows are dynamically-sized: a new session starts when the gap between two consecutive events exceeds
              <code className="font-mono"> inactivity_gap</code>. Events within the gap merge into one session.
              <code className="font-mono">SESSION(event_time, INTERVAL '5' MINUTE)</code> groups user clicks into sessions separated
              by 5+ minute idle gaps. Use case: user sessions (web analytics), sequencer activity bursts (idle gaps close sessions),
              IoT sensor activity cycles. Sessions are non-deterministic in size (depend on data) — different from TUMBLE/HOP which
              have fixed boundaries. State cost: O(sessions × avg session size) — can grow unbounded; requires eviction policy.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Architecture */}
      <SectionCard
        title="Streaming SQL architecture — Sources → Engine → Watermark → Windows → Sinks"
        description="The 4 engines share a common architecture: stream sources (Kafka/Pulsar) → SQL engine (Flink/Spark/Materialize/RisingWave) → watermark generator → window operators → sinks (materialized views, Kafka topics, JDBC). The differences are in state backend, latency model, and SQL dialect."
        icon={<Atom className="h-5 w-5" />}
        badge="architecture"
      >
        <StreamingSqlArchitectureDiagram />
      </SectionCard>

      {/* Math Pyodide demo */}
      <SectionCard
        title="Try it: event-time + watermark + 3 window types (Pyodide)"
        description="Pure-Python implementation of the 5 mathematical foundations. Simulate 200 events with heavy-tail latency, compute watermarks at different allowed_lateness, assign TUMBLE/HOP/SESSION windows, and count late events."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={MATH_SECTION} buttonLabel="Run streaming SQL math foundations (Pyodide)" />
      </SectionCard>

      {/* Windowing simulation demo */}
      <SectionCard
        title="Try it: simulate Flink SQL windowing on a variant stream (Pyodide)"
        description="Simulate 200 streaming variant calls across 3 sequencers. Apply TUMBLE 30s windows for per-window aggregates, HOP 60s/step 15s overlapping windows for rolling stats, SESSION 5s-gap windows for burst detection, and measure watermark late-drop rates at various allowed_lateness."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={PYODIDE_DEMO} buttonLabel="Run Flink windowing simulation (Pyodide)" />
      </SectionCard>

      {/* Code blocks */}
      <SectionCard
        title="Production SQL — Flink + Spark + Materialize + RisingWave"
        description="Four SQL code blocks: (1) Flink SQL TUMBLE + temporal join, (2) Spark Structured Streaming watermark + MERGE INTO, (3) Materialize streaming mat view + anomaly view, (4) RisingWave TUMBLE + SESSION + Hummock storage."
        icon={<Cpu className="h-5 w-5" />}
        badge="4 code blocks"
      >
        <div className="space-y-3">
          <CodeBlock
            language="sql"
            filename="flink_tumble_temporal_join.sql"
            code={`-- Flink SQL: stream-table duality + temporal join + TUMBLE window
-- Stream-table duality: a Table is a Stream (changelog), a Stream is a Table (snapshot)

-- (1) Source table: variant stream from Kafka, with event-time + watermark
CREATE TABLE variant_stream (
  chrom        STRING,
  pos          BIGINT,
  ref_allele   STRING,
  alt_allele   STRING,
  qual         DOUBLE,
  sequencer_id STRING,
  event_time   TIMESTAMP(3),
  -- Watermark: tolerate 60s out-of-order (lane multiplexing)
  WATERMARK FOR event_time AS event_time - INTERVAL '60' SECOND
) WITH (
  'connector' = 'kafka',
  'topic'     = 'variants',
  'properties.bootstrap.servers' = 'kafka:9092',
  'format'     = 'json'
);

-- (2) Reference table: VCF truth set (changelog = type 'versioned')
CREATE TABLE vcf_reference (
  chrom STRING, pos BIGINT, ref_allele STRING, alt_allele STRING,
  clinical_significance STRING,
  PRIMARY KEY (chrom, pos) NOT ENFORCED
) WITH ('connector' = 'jdbc', 'url' = 'jdbc:postgresql://vcf-ref/db');

-- (3) Temporal join: enrich variants with clinical sig as-of event time
CREATE VIEW variant_enriched AS
SELECT v.chrom, v.pos, v.qual, v.sequencer_id, v.event_time,
       r.clinical_significance
FROM variant_stream v
LEFT JOIN vcf_reference FOR SYSTEM_TIME AS OF v.event_time AS r
  ON v.chrom = r.chrom AND v.pos = r.pos;

-- (4) TUMBLE 1-min window: per-sequencer aggregates (with watermark trigger)
INSERT INTO variant_metrics
SELECT
  sequencer_id,
  TUMBLE_START(event_time, INTERVAL '1' MINUTE) AS w_start,
  TUMBLE_END(event_time, INTERVAL '1' MINUTE)   AS w_end,
  COUNT(*)                                       AS n_variants,
  AVG(qual)                                      AS avg_qual,
  COUNT(*) FILTER (WHERE qual < 30)              AS low_qual_n
FROM variant_stream
GROUP BY sequencer_id, TUMBLE(event_time, INTERVAL '1' MINUTE);`}
          />
          <CodeBlock
            language="sql"
            filename="spark_structured_streaming.sql"
            code={`-- Spark Structured Streaming SQL: watermark + MERGE INTO (CDC)

-- (1) Source: Kafka variant stream with watermark (event-time)
CREATE TABLE variant_stream
USING kafka
OPTIONS (
  kafka.bootstrap.servers 'kafka:9092',
  subscribe 'variants',
  failOnDataLoss false
) PARTITIONED BY (chrom STRING);

-- Add event_time + watermark (60s lateness tolerance)
CREATE OR REPLACE TEMP VIEW variant_v
AS SELECT
  chrom, pos, ref_allele, alt_allele, qual,
  sequencer_id,
  CAST(timestamp AS TIMESTAMP) AS event_time,
  current_watermark() AS wm
FROM variant_stream
-- Watermark defined in Structured Streaming Python:
--   .withWatermark('event_time', '60 seconds')

-- (2) Aggregation: TUMBLE-style per-minute stats via window()
CREATE OR REPLACE TEMP VIEW per_min_stats AS
SELECT
  window(event_time, '1 minute') AS w,
  sequencer_id,
  count(*) AS n, avg(qual) AS avg_q
FROM variant_v
GROUP BY window(event_time, '1 minute'), sequencer_id;

-- (3) MERGE INTO: change-data-capture into Delta target (idempotent upsert)
MERGE INTO delta.variants AS target
USING variant_stream AS src
ON target.chrom = src.chrom AND target.pos = src.pos
  AND target.alt_allele = src.alt_allele
WHEN MATCHED AND src.qual > target.qual THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;

-- (4) Late data: Spark supports drop (default), or 'update' (re-emit) modes`}
          />
          <CodeBlock
            language="sql"
            filename="materialize_streaming_views.sql"
            code={`-- Materialize: differential dataflow + incremental view maintenance
-- Every CREATE MATERIALIZED VIEW maintains only the changed rows on each input.

-- (1) Source: Kafka topic via Materialize source
CREATE SOURCE variant_source
FROM KAFKA BROKER 'kafka:9092' TOPIC 'variants'
KEY FORMAT TEXT VALUE FORMAT JSON;

-- (2) Materialized view: per-sequencer per-minute aggregates
-- This view is INCREMENTALLY maintained — when 1 row changes in the source,
-- only the affected output rows are recomputed (differential dataflow).
CREATE MATERIALIZED VIEW per_min_variant_stats AS
SELECT
  sequencer_id,
  date_trunc('minute', event_time) AS w_start,
  count(*)                          AS n_variants,
  avg(qual::float)                  AS avg_qual,
  count(*) FILTER (WHERE qual::float < 30) AS low_qual_n
FROM variant_source
GROUP BY sequencer_id, date_trunc('minute', event_time);

-- (3) Anomaly view: rate exceeds 3-sigma (triggered on every input update)
CREATE MATERIALIZED VIEW variant_anomalies AS
SELECT sequencer_id, w_start, n_variants
FROM per_min_variant_stats
WHERE n_variants > 50000 OR low_qual_n > 1000;

-- (4) Subscribe: push incremental updates to downstream consumers
-- SUBSCRIBE TO (SELECT * FROM variant_anomalies) AS json;`}
          />
          <CodeBlock
            language="sql"
            filename="risingwave_tumble_session.sql"
            code={`-- RisingWave: streaming mat views on Hummock storage (S3-backed LSM-tree)
-- PostgreSQL-wire compatible — works with psql, JDBC, etc.

-- (1) Source: Kafka variant stream
CREATE SOURCE variant_stream (
  chrom TEXT, pos BIGINT, ref_allele TEXT, alt_allele TEXT,
  qual DOUBLE PRECISION, sequencer_id TEXT,
  event_time TIMESTAMPTZ
) WITH (
  connector = 'kafka',
  topic = 'variants',
  properties.bootstrap.server = 'kafka:9092',
  format = 'json'
) WATERMARK FOR event_time AS event_time - INTERVAL '60 seconds';

-- (2) TUMBLE 1-min: per-sequencer per-minute aggregates
CREATE MATERIALIZED VIEW tumble_per_min AS
SELECT
  sequencer_id,
  window_start, window_end,
  count(*) AS n, avg(qual) AS avg_qual
FROM TUMBLE(variant_stream, event_time, INTERVAL '1 minute')
GROUP BY sequencer_id, window_start, window_end;

-- (3) SESSION 5-min gap: per-sequencer activity bursts
CREATE MATERIALIZED VIEW session_bursts AS
SELECT
  sequencer_id,
  window_start, window_end,
  count(*) AS n_events
FROM SESSION(variant_stream, event_time, INTERVAL '5 minutes')
GROUP BY sequencer_id, window_start, window_end;

-- (4) HOP 1-hour sliding by 5-min: rolling hourly stats
CREATE MATERIALIZED VIEW hop_hourly AS
SELECT
  sequencer_id,
  window_start, window_end,
  count(*) AS n
FROM HOP(variant_stream, event_time, INTERVAL '5 minutes', INTERVAL '1 hour')
GROUP BY sequencer_id, window_start, window_end;

-- Hummock storage: state is checkpointed to S3, recovery is fast.`}
          />
        </div>
      </SectionCard>

      {/* Comparison */}
      <SectionCard
        title="Flink SQL vs Spark SS SQL vs Materialize vs RisingWave"
        description="Four streaming SQL engines compared across 6 features. Flink is true streaming with the lowest latency; Spark is micro-batch (better with existing Spark stacks); Materialize pioneered differential dataflow; RisingWave adds streaming mat views on Hummock storage."
        icon={<Boxes className="h-5 w-5" />}
      >
        <StreamingSqlComparisonTable />
      </SectionCard>

      {/* Why evolved */}
      <SectionCard
        title="Why Streaming SQL evolved — shortfalls of imperative streaming"
        description="Before SQL came to streaming, you wrote Kafka consumer code in Java/Scala/Python — manual partition assignment, manual offset commit, manual state, manual window logic. SQL removed 4 categories of boilerplate."
        icon={<History className="h-5 w-5" />}
        badge="Why SQL"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: Manual windowing logic.</strong> Every streaming app had bespoke window code — TUMBLE/HOP/SESSION implemented in imperative Java/Scala. SQL removes this: <code className="font-mono">TUMBLE(event_time, INTERVAL &apos;1&apos; MINUTE)</code> is a declarative one-liner. The engine handles the watermarks, late data, eviction. This drops ~500 lines of windowing code per job.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: Manual state management.</strong> Stateful streaming requires checkpointing to disk (RocksDB), recovery on failure, incremental checkpoints. SQL engines handle this via the engine — Flink's checkpoint barrier, Materialize's differential dataflow timelines, RisingWave's Hummock LSM-tree. Application code is stateless SQL.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: No standard SQL dialect for streams.</strong> Before Flink SQL, every streaming tool had its own DSL (Spark DStream, Kafka Streams DSL, Akka Streams). SQL brings composability — the same query runs in any ANSI SQL engine. Materialize and RisingWave both expose PostgreSQL-wire, so psql and BI tools work out of the box.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: No incremental view maintenance.</strong> Traditional materialized views recompute the full table on refresh — useless for streaming. Materialize's differential dataflow (Frank McSherry, 2013) introduced the formalism: only the changed rows are recomputed. <code className="font-mono">O(changes)</code> per input, not <code className="font-mono">O(full scan)</code>. This is the algorithmic breakthrough that makes SQL-on-streams tractable.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique Streaming SQL features"
        description="Four features that are genuinely unique to streaming SQL — structural differentiators that batch SQL cannot match."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. Stream-table duality (Flink)</p>
            <p className="text-muted-foreground">A Table is a Stream (changelog of INSERT/UPDATE/DELETE), a Stream is a Table (snapshot). <strong>The same SQL query runs as a batch job (bounded) or a streaming job (unbounded).</strong> No code change between dev and prod.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Temporal joins (FOR SYSTEM_TIME AS OF)</p>
            <p className="text-muted-foreground">JOIN a stream against a slowly-changing dimension <em>as of the event's event-time</em>. <strong>Batch SQL cannot do this — it only sees the latest dimension snapshot.</strong> Critical for point-in-time correctness in ML feature engineering.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Differential dataflow (Materialize)</p>
            <p className="text-muted-foreground">Materialized views maintained incrementally — only changed rows recomputed per input. <strong>Batch SQL recomputes the full table on refresh.</strong> Differential dataflow gives O(changes) per input, not O(full scan) — sub-second updates on multi-billion-row views.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. MATCH_RECOGNIZE (Flink CEP)</p>
            <p className="text-muted-foreground">Pattern matching over streams — <code className="font-mono">PATTERN (A+ B)</code> finds &quot;A happens one or more times then B&quot;. <strong>Batch SQL has no temporal pattern primitive — you'd need a separate CEP library.</strong> Critical for fraud (A: login, B: transfer within 5min) and IoT (A: temp rising, B: alarm).</p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples */}
      <SectionCard
        title="2 scientific dataset examples — cards with 5-language code"
        description="Two streaming SQL deployment scenarios from life sciences and physics. Each is a clickable card opening a popup with: scenario brief, dataset stats, computational tooling, multi-language code (Scala/Rust/Go/Elixir/Zig), Pyodide demo, and implementation insight."
        icon={<Database className="h-5 w-5" />}
        badge="2 examples × 5 langs"
      >
        <DatasetCards
          examples={STREAMING_SQL_SCIENCE_EXAMPLES}
          intro="Real-time genomics variant streaming via Flink SQL TUMBLE windows (5k variants/sec, 200 NovaSeq, 60s watermark) + LHC online monitoring via Materialize differential dataflow (40M events/sec, per-LB collision rate, sub-second mat view updates)."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the streaming SQL ecosystem"
        description="Streaming SQL integrates with Kafka (sources), JDBC (sinks), and BI tools (via PostgreSQL-wire)."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-primary" /> Stream sources</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Apache Kafka</strong> — the de-facto stream source (5M msgs/sec/partition)</li>
              <li>• <strong>Apache Pulsar</strong> — geo-replicated streaming (Yahoo)</li>
              <li>• <strong>AWS Kinesis</strong> — managed Kafka-compatible</li>
              <li>• <strong>Azure Event Hubs</strong> — managed Kafka-compatible</li>
              <li>• <strong>Redpanda</strong> — Kafka-compatible on Rust/WAL</li>
              <li>• <strong>NATS JetStream</strong> — lightweight streaming</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Database className="h-3.5 w-3.5 text-primary" /> Sinks + integrations</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Materialized views</strong> — incremental maintenance (sub-sec)</li>
              <li>• <strong>Kafka topics</strong> — pipeline to next consumer</li>
              <li>• <strong>JDBC sinks</strong> — Postgres, MySQL, ClickHouse</li>
              <li>• <strong>Iceberg / Delta</strong> — lakehouse sinks</li>
              <li>• <strong>PostgreSQL-wire</strong> — BI tools (Metabase, Superset, Tableau)</li>
              <li>• <strong>OpenLineage</strong> — streaming lineage tracking</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers and production deployments that defined streaming SQL."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Akidau et al. 2015 (The Dataflow Model):</strong> Google's paper &quot;The Dataflow Model: A Stream Processing Approach to Correctness and Clarity&quot; formalised event-time + watermarks + windows + triggers + accumulators. The math here (watermark = max_seen(t_event) - allowed_lateness) is directly from this paper. Flink's SQL implements this model faithfully.
          </p>
          <p>
            <strong className="text-foreground/80">McSherry et al. 2013 (Differential Dataflow):</strong> Frank McSherry's paper &quot;Differential Dataflow&quot; introduced the formalism that powers Materialize. The key insight: maintain a representation of changes (a &quot;difference&quot;) rather than the full state, then recompose incrementally. This is O(changes) per input update, not O(full scan) — sub-second view updates on billion-row datasets.
          </p>
          <p>
            <strong className="text-foreground/80">Flink SQL 1.7+ (2018):</strong> Apache Flink added SQL support in 1.1 (2016), matured in 1.7 (2018). The stream-table duality — &quot;a Table is a Stream, a Stream is a Table&quot; — is Flink's signature. Temporal joins (FOR SYSTEM_TIME AS OF) and MATCH_RECOGNIZE (CEP) came in 1.7+ and 1.8+. Now used by Netflix, Uber, Alibaba, ByteDance for real-time analytics.
          </p>
          <p>
            <strong className="text-foreground/80">Materialize production (2020+):</strong> Materialize Inc's commercial offering of differential dataflow as a PostgreSQL-wire streaming SQL engine. Used by Stripe (fraud detection), Cloudflare (real-time observability), and Capital One (real-time risk). Differential dataflow gives sub-second materialised view updates on multi-billion-row Kafka topics.
          </p>
          <p>
            <strong className="text-foreground/80">RisingWave production (2023+):</strong> RisingWave Labs (founded 2022) shipped a streaming SQL engine with Hummock storage (S3-backed LSM-tree). Used by Ant Group (real-time fintech analytics) and Mercedes-Benz (connected car telemetry). State is checkpointed to S3, recovery is fast — a key differentiator vs Flink's RocksDB.
          </p>
          <p>
            <strong className="text-foreground/80">Spark Structured Streaming production (2016+):</strong> Spark 2.0 (2016) introduced Structured Streaming with event-time + watermarks + the same SQL API as Spark SQL. MERGE INTO (CDC) came in Spark 3.0 (2020). Used by Netflix (recommendations), Uber (fraud), and Pinterest (real-time analytics). Lower engineering cost than Flink if you already have Spark.
          </p>
        </div>
      </SectionCard>

      {/* Insight */}
      <SectionCard
        title="My deeper thought: Streaming SQL IS the unification of streams and tables"
        description="The unifying view: stream-table duality is the most important idea in modern data engineering. The same SQL runs on bounded and unbounded data — the engine picks the execution model."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Stream-table duality IS the end of the Lambda architecture.</strong> The Lambda architecture (Marz 2011) ran two pipelines: batch (Hadoop, daily) for correctness and speed (Storm, sub-second) for freshness. They had to be reconciled. Flink's stream-table duality — &quot;a Table is a Stream (changelog), a Stream is a Table (snapshot)&quot; — means the SAME SQL runs as a batch job or a streaming job. The Lambda reconciliation problem disappears: one engine, one SQL, one set of semantics. Kappa architecture (Kreps 2014) is the operational expression of duality.
          </p>
          <p>
            <strong className="text-foreground/80">Watermarks ARE the streaming analogue of transaction boundaries.</strong> In a batch database, a transaction commits all rows atomically — you see all-or-nothing. In a streaming system, you can't wait for the &quot;end of the stream&quot; (it's infinite). The watermark is the streaming analogue: it declares &quot;the data up to time W(t) is now complete — finalise windows with end ≤ W(t)&quot;. Just like a transaction's COMMIT, a watermark passing a window end is the trigger for emitting a result. This is why watermarks must be monotonic — non-monotonic watermarks would violate the streaming equivalent of ACID.
          </p>
          <p>
            <strong className="text-foreground/80">Differential dataflow IS the algorithmic foundation of streaming mat views.</strong> Traditional materialised views recompute the full table on refresh — useless for streaming (you'd refresh forever). Differential dataflow (McSherry) maintains a representation of <em>changes</em> rather than state, and propagates those changes through the query DAG. The math: a view V = SELECT ... FROM source is a function V(source); differential dataflow computes V(source + δ) - V(source) incrementally, where δ is the change. This is the streaming analogue of Newton's method (compute the next approximation from the previous + derivative). It's why Materialize and RisingWave give sub-second updates on billion-row views.
          </p>
          <p>
            <strong className="text-foreground/80">Window types ARE projections of an unbounded stream onto bounded views.</strong> The three windows are three ways to slice an unbounded stream into bounded windows. TUMBLE: disjoint partition (like an SQL GROUP BY on the time bucket). HOP: overlapping partition (like a sliding-window pandas .rolling). SESSION: dynamic partition (data-driven, like clustering on the gap). The choice depends on the question — TUMBLE for &quot;per-minute&quot;, HOP for &quot;rolling 60s as of now&quot;, SESSION for &quot;activity bursts&quot;. All three finalise on the watermark — they're bounded views projected from an unbounded stream. SQL makes this projection declarative.
          </p>
        </div>
      </SectionCard>

      <RelatedTopics topics={[
        { id: "flink" as const, reason: "Apache Flink — the underlying runtime for Flink SQL" },
        { id: "spark-streaming" as const, reason: "Spark Structured Streaming — the underlying runtime" },
        { id: "streaming" as const, reason: "Real-time streaming overview — Kafka, Flink, Pulsar" },
        { id: "kafka" as const, reason: "Kafka — the de-facto stream source for streaming SQL" },
        { id: "data-mesh-deep-dive" as const, reason: "Streaming data products use SQL materialised views" },
        { id: "data-contracts-deep-dive" as const, reason: "Contracts enforce schemas on stream sources" },
        { id: "clickhouse" as const, reason: "ClickHouse for sub-second OLAP on streaming sinks" },
        { id: "iceberg" as const, reason: "Iceberg as the lakehouse sink for streaming pipelines" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("flink")} className="text-sm text-primary hover:underline">
          &rarr; Apache Flink (the engine behind Flink SQL)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("spark-streaming")} className="text-sm text-primary hover:underline">
          &rarr; Spark Structured Streaming
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("data-mesh-deep-dive")} className="text-sm text-primary hover:underline">
          &rarr; Data Mesh Deep Dive (data products + federated governance)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("streaming")} className="text-sm text-primary hover:underline">
          &rarr; Real-time Streaming Overview
        </Link>
      </div>
    </div>
  );
}
