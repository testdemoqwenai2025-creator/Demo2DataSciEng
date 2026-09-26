"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { NextSteps } from "../_components/next-steps";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { DRUID_EXAMPLES } from "../_components/_dataset_examples4";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Zap, Database, Activity, Cpu, Boxes, Sparkles, History, Atom,
  FileText, TrendingUp, Server, Cloud, Network,
} from "lucide-react";

// ============================================================
// Code snippets
// ============================================================

const DRUID_DDL_SQL = `-- ============================================================
-- Apache Druid — time-series OLAP (2011)
-- Components: Coordinator + Overlord + Historical + MiddleManager
-- ============================================================

-- Create a Kafka supervisor for real-time ingestion
-- The supervisor manages MiddleManager tasks that consume Kafka events
-- + build segments in real-time.
SUBMIT SUPervisor
{
  "type": "kafka",
  "dataSchema": {
    "dataSource": "netflix_events",
    "timestampSpec": { "column": "ts", "format": "auto" },
    "dimensionsSpec": {
      "dimensions": ["user_id", "title_id", "event_type", "country", "device"]
    },
    "metricsSpec": [
      { "type": "count", "name": "events" },
      { "type": "sum", "name": "duration_sec", "fieldName": "duration_sec" },
      { "type": "hyperUnique", "name": "unique_users", "fieldName": "user_id" },
      { "type": "quantilesDoublesSketch", "name": "duration_dist",
        "fieldName": "duration_sec" }
    ],
    "granularitySpec": {
      "type": "uniform",
      "segmentGranularity": "HOUR",
      "queryGranularity": "MINUTE",
      "rollup": true
    }
  },
  "tuningConfig": {
    "type": "kafka",
    "maxRowsPerSegment": 5000000,
    "intermediatePersistPeriod": "PT10M"
  },
  "ioConfig": {
    "topic": "netflix.events",
    "consumerProperties": { "bootstrap.servers": "kafka:9092" },
    "taskDuration": "PT1H"
  }
}

-- SQL query (Druid SQL layer translates to native queries)
-- APPROX_COUNT_DISTINCT uses HLL — sub-1s on billions of events
SELECT
  title_id,
  APPROX_COUNT_DISTINCT(user_id) AS unique_users,
  SUM(events) AS total_events,
  SUM(duration_sec) AS total_watch_sec
FROM netflix_events
WHERE __time >= CURRENT_TIMESTAMP - INTERVAL '1' HOUR
GROUP BY title_id
ORDER BY unique_users DESC
LIMIT 10;`;

const DRUID_PYTHON = `# ============================================================
# Druid Python client — broker SQL queries + ingestion
#   pip install pydruid
# ============================================================

from pydruid.db import connect
import pandas as pd

# Connect to Druid broker via SQL (Avatica JDBC)
conn = connect(host='druid-router', port=8888, path='/druid/v2/sql',
               scheme='http')

# Sub-1s query: top titles by unique viewers last hour
with conn.cursor() as cur:
    cur.execute("""
        SELECT title_id,
               APPROX_COUNT_DISTINCT(user_id) AS unique_users,
               SUM(events) AS total_events
        FROM netflix_events
        WHERE __time >= current_timestamp - interval '1' hour
        GROUP BY title_id
        ORDER BY unique_users DESC
        LIMIT 10
    """)
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]

df = pd.DataFrame(rows, columns=cols)
print(f"Top 10 titles (last hour):")
print(df.to_string(index=False))
print(f"\\nApproximate distinct counts via HLL — sub-1s on 1B events/day")

# Native JSON query (older API, but exposes more Druid features)
from pydruid.client import *
druid = DruidClient('http://druid-router:8888')

# Timeseries query: events per minute for last hour
ts = druid.timeseries(
    datasource='netflix_events',
    granularity='minute',
    intervals='2024-09-25T10:00:00/2024-09-25T11:00:00',
    aggregations={
        'events': longsum('events'),
        'unique_users': hyperunique('user_id'),
    }
)
df_ts = pd.DataFrame(ts[0]['result'])
print(f"\\nTimeseries (per minute):")
print(df_ts.head(10).to_string(index=False))`;

const DRUID_SCALA_INGESTION = `-- ============================================================
-- Druid + Spark — batch segment ingestion (historical backfill)
-- Spark builds segments from Parquet + submits to Druid Overlord
-- ============================================================

import org.apache.druid.spark.{DruidSegmentBuilder, DruidCluster}

val spark = SparkSession.builder()
  .appName("Druid Historical Segment Builder")
  .config("druid.overlord.url", "http://druid-overlord:8090")
  .config("druid.datasource", "netflix_events")
  .getOrCreate()

// Load Parquet from S3
val df = spark.read.parquet("s3a://bronze/netflix-events/2024/09/24/")
  .filter("ts is not null")

// Build Druid segments (columnar, time-chunked)
df.write
  .format("druid")
  .option("druid.datasource", "netflix_events")
  .option("druid.segmentGranularity", "HOUR")
  .option("druid.queryGranularity", "MINUTE")
  .option("druid.rollup", "true")
  .option("druid.metrics", "events:count,duration_sec:sum,unique_users:hyperUnique")
  .option("druid.dimensions", "user_id,title_id,event_type,country,device")
  .mode("append")
  .save()

// Overlord distributes segments to Historical nodes
// Coordinator rebalances segments across the cluster
val druid = DruidCluster("http://druid-overlord:8090")
druid.waitForSegmentsLoad("netflix_events")  // block until queryable`;

const DRUID_KAFKA_SUPERVISOR = `-- ============================================================
-- Druid Kafka supervisor — real-time ingestion from Kafka
-- The supervisor manages MiddleManager indexing tasks per Kafka partition
-- ============================================================

-- Submit a Kafka supervisor spec via the Overlord REST API
-- (POST to /druid/indexer/v1/supervisor)
{
  "type": "kafka",
  "dataSchema": {
    "dataSource": "airbnb_events",
    "timestampSpec": { "column": "event_ts", "format": "auto" },
    "dimensionsSpec": {
      "dimensions": ["guest_id", "listing_id", "event_type", "country"],
      "dimensionExclusions": []
    },
    "metricsSpec": [
      { "type": "count", "name": "events" },
      { "type": "sum", "name": "total_usd", "fieldName": "total_usd" },
      { "type": "hyperUnique", "name": "unique_guests", "fieldName": "guest_id" },
      { "type": "quantilesDoublesSketch", "name": "usd_dist",
        "fieldName": "total_usd", "k": 128 }
    ],
    "granularitySpec": {
      "type": "uniform",
      "segmentGranularity": "HOUR",
      "queryGranularity": "MINUTE",
      "rollup": true
    }
  },
  "ioConfig": {
    "topic": "airbnb.guest.events",
    "consumerProperties": { "bootstrap.servers": "kafka:9092" },
    "taskDuration": "PT1H",
    "replicas": 2,
    "startDelay": "PT1M"
  },
  "tuningConfig": {
    "type": "kafka",
    "maxRowsPerSegment": 5000000,
    "intermediatePersistPeriod": "PT10M",
    "maxPendingPersists": 3
  }
}

-- MiddleManager lifecycle:
-- 1. Supervisor creates indexing tasks (one per Kafka partition)
-- 2. Each task consumes Kafka events + builds an in-memory segment
-- 3. Every 10 minutes, intermediate persist to disk
-- 4. After 1 hour, segment is sealed + pushed to deep storage (S3/HDFS)
-- 5. Historical node loads the segment; broker routes queries

-- Query the data via Druid SQL or native JSON queries
SELECT
  country,
  SUM(total_usd) AS gmv,
  APPROX_COUNT_DISTINCT(guest_id) AS unique_guests,
  APPROX_QUANTILE(total_usd, 0.99) AS p99_booking
FROM airbnb_events
WHERE __time >= CURRENT_TIMESTAMP - INTERVAL '1' HOUR
  AND event_type = 'booking'
GROUP BY country
ORDER BY gmv DESC;`;

// ============================================================
// Pyodide demo — HyperLogLog approximate aggregation
// ============================================================

const PYODIDE_DEMO = `# ============================================================
# Druid approximate aggregation — in-browser simulation
# 1. Generate synthetic Netflix events (1B/day scaled)
# 2. Build HLL sketches for unique user counts
# 3. Compare HLL vs exact count distinct
# 4. Measure latency + memory tradeoff
# ============================================================

import random
import time
import math
from collections import defaultdict

random.seed(42)
print("=== Apache Druid — HLL sketch vs exact distinct ===")
print("Synthetic Netflix events (1B/day scaled to 1M)\\n")

# Generate synthetic events
n_events = 1_000_000  # scale-down of 1B/day
titles = [f"title_{i:04d}" for i in range(5000)]
countries = ['US', 'UK', 'DE', 'FR', 'JP', 'BR', 'IN', 'CA']

# Each event has a user_id (50M distinct possible)
events = []
for _ in range(n_events):
    events.append({
        'title': random.choice(titles),
        'country': random.choice(countries),
        'user_id': random.randint(1, 50_000_000),
    })

# Exact count distinct per (title, country)
print("--- Exact count distinct (slow at scale) ---")
t0 = time.time()
exact = defaultdict(set)
for e in events:
    exact[(e['title'], e['country'])].add(e['user_id'])
t_exact = (time.time() - t0) * 1000
print(f"Time: {t_exact:.1f}ms")
print(f"Groups: {len(exact)}")
total_distinct = sum(len(s) for s in exact.values())
print(f"Sum of unique users across groups: {total_distinct:,}")

# HLL sketch per (title, country)
# Real HLL uses ~2KB per sketch regardless of input size
print("\\n--- HLL sketch (sub-1s at scale) ---")
def hll_sketch(elements, p=14):
    """Simplified HLL — real HLL uses bias-corrected harmonic mean."""
    m = 1 << p  # 2^p buckets
    registers = [0] * m
    for e in elements:
        h = hash(e) & 0xFFFFFFFF
        bucket = h >> (32 - p)
        rest = (h << p) & 0xFFFFFFFF
        leading = bin(rest | (1 << 31)).zfill(33).index('1', 1)
        registers[bucket] = max(registers[bucket], leading)
    # Alpha correction + harmonic mean
    alpha = 0.7213 / (1 + 1.079 / m)
    sum_inv = sum(2 ** -r for r in registers)
    return int(alpha * m * m / sum_inv)

t0 = time.time()
sketches = defaultdict(list)
for e in events:
    sketches[(e['title'], e['country'])].append(e['user_id'])
hll_results = {k: hll_sketch(v) for k, v in sketches.items()}
t_hll = (time.time() - t0) * 1000

print(f"Time: {t_hll:.1f}ms")
print(f"Memory: ~2KB per sketch × {len(hll_results)} sketches = "
      f"~{2 * len(hll_results) / 1024:.1f}KB total")

# Compare error
print("\\n--- Accuracy comparison (top 3 groups) ---")
print(f"{'Title':<10} {'Country':<8} {'Exact':>12} {'HLL':>12} {'Error%':>8}")
print("-" * 55)
top = sorted(exact.items(), key=lambda x: len(x[1]), reverse=True)[:3]
for (title, country), users in top:
    exact_count = len(users)
    hll_count = hll_results[(title, country)]
    error = abs(hll_count - exact_count) / exact_count * 100
    print(f"{title:<10} {country:<8} {exact_count:>12,} {hll_count:>12,} {error:>7.2f}%")

print(f"\\nKey insight: HLL uses ~2KB memory regardless of distinct count.")
print(f"At 1B events/day × 50M distinct users, exact = O(N) memory;")
print(f"HLL = O(1) memory per sketch. Sub-1s query latency preserved.")
print(f"\\nThis is why Netflix serves real-time dashboards on Druid.")`;

// ============================================================
// Druid segment architecture SVG diagram
// ============================================================

function SegmentArchitectureDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("historical");
  const nodes = {
    "kafka": { label: "Kafka topic", desc: "Source events (e.g. netflix.events) — Druid consumes via Kafka supervisor", level: 0 },
    "mm": { label: "MiddleManager", desc: "Manages indexing tasks — each consumes Kafka partition + builds in-memory segment", level: 1 },
    "deep_storage": { label: "Deep storage (S3)", desc: "Sealed segments pushed to S3/HDFS — shared across cluster, durable", level: 2 },
    "historical": { label: "Historical (x N)", desc: "Loads sealed segments + serves queries — scales horizontally, in-memory + mmap", level: 3 },
    "broker": { label: "Broker", desc: "Receives SQL/native query, routes to relevant Historicals + MiddleManagers, merges", level: 4 },
    "coordinator": { label: "Coordinator", desc: "Manages segment assignment + load balancing across Historicals", level: 4 },
    "client": { label: "Client (BI)", desc: "Looks like single Druid cluster — broker abstracts the topology", level: 5 },
  };
  const edges = [
    ["kafka", "mm"],
    ["mm", "deep_storage"],
    ["deep_storage", "historical"],
    ["mm", "broker"],
    ["historical", "broker"],
    ["coordinator", "historical"],
    ["broker", "client"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "kafka": { x: 60, y: 40 },
    "mm": { x: 180, y: 40 },
    "deep_storage": { x: 320, y: 40 },
    "historical": { x: 320, y: 100 },
    "broker": { x: 180, y: 160 },
    "coordinator": { x: 60, y: 100 },
    "client": { x: 180, y: 210 },
  };

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Atom className="h-3.5 w-3.5 text-primary" />
          Druid segment architecture — Kafka → MiddleManager → Deep Storage → Historical → Broker
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 400 250" className="w-full h-auto">
          {edges.map(([from, to], i) => {
            const a = positions[from];
            const b = positions[to];
            return (
              <line key={i} x1={a.x} y1={a.y + 12} x2={b.x} y2={b.y - 12}
                stroke="var(--border)" strokeWidth="0.8"
                markerEnd="url(#arrow)" />
            );
          })}
          {Object.entries(positions).map(([id, pos]) => {
            const isActive = activeNode === id;
            const node = nodes[id as keyof typeof nodes];
            const color =
              node.level === 0 ? "var(--chart-3)" :
              node.level === 1 ? "var(--chart-2)" :
              node.level === 2 ? "var(--chart-1)" :
              node.level === 3 ? "var(--chart-4)" :
              node.level === 4 ? "var(--chart-5)" : "var(--muted-foreground)";
            return (
              <motion.g key={id}
                onMouseEnter={() => setActiveNode(id)}
                onMouseLeave={() => setActiveNode(null)}
                animate={{ scale: isActive ? 1.05 : 1 }}
                style={{ cursor: "pointer" }}
              >
                <rect x={pos.x - 65} y={pos.y - 10} width="130" height="22" rx="3"
                  fill={isActive ? color + "30" : "var(--background)"}
                  stroke={color} strokeWidth={isActive ? 1.5 : 0.8}
                />
                <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="7"
                  fill={isActive ? color : "var(--foreground)"}
                  fontWeight={isActive ? "bold" : "normal"}>
                  {node.label}
                </text>
              </motion.g>
            );
          })}
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" />
            </marker>
          </defs>
        </svg>
        {activeNode && (
          <div className="mt-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
            <p className="font-semibold text-primary mb-0.5">
              {nodes[activeNode as keyof typeof nodes].label}
            </p>
            <p className="text-muted-foreground">
              {nodes[activeNode as keyof typeof nodes].desc}
            </p>
          </div>
        )}
        {!activeNode && (
          <p className="mt-2 text-[10px] text-muted-foreground text-center">
            Hover any node — Druid's 4-component architecture separates ingestion from serving.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// OLAP comparison table
// ============================================================

function OlapComparisonTable() {
  const rows = [
    { feature: "Origin", druid: "Metamarkets (2011)", pinot: "LinkedIn (2013)", clickhouse: "Yandex (2016)", presto: "Facebook (2012)" },
    { feature: "Time-chunked segments", druid: "Yes (primary)", pinot: "Yes", clickhouse: "Yes (MergeTree parts)", presto: "No (relies on connector)" },
    { feature: "In-memory + mmap hybrid", druid: "Yes (unique)", pinot: "Limited", clickhouse: "Yes", presto: "No" },
    { feature: "Approximate aggregation", druid: "HLL + quantiles", pinot: "HLL + Theta", clickhouse: "HLL + T-Digest", presto: "Limited" },
    { feature: "Kafka real-time ingestion", druid: "Yes (supervisor)", pinot: "Yes (low-level)", clickhouse: "Yes (Kafka engine)", presto: "Via connectors" },
    { feature: "Star-tree pre-aggregation", druid: "No", pinot: "Yes (unique)", clickhouse: "No", presto: "No" },
    { feature: "SQL interface", druid: "Yes (Druid SQL)", pinot: "Yes (Pinot SQL)", clickhouse: "Yes (rich SQL)", presto: "Yes (ANSI SQL)" },
    { feature: "Best fit", druid: "Time-series events", pinot: "Real-time dashboards", clickhouse: "Event analytics", presto: "Federated SQL" },
    { feature: "Adoption", druid: "Netflix, Airbnb, Alibaba", pinot: "LinkedIn, Uber", clickhouse: "Cloudflare, Uber", presto: "Meta, Airbnb" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          Druid vs Pinot vs ClickHouse vs Presto — real-time OLAP siblings
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold text-primary">Druid</th>
              <th className="text-left px-3 py-2 font-semibold">Pinot</th>
              <th className="text-left px-3 py-2 font-semibold">ClickHouse</th>
              <th className="text-left px-3 py-2 font-semibold">Presto</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-primary/80">{r.druid}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.pinot}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.clickhouse}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.presto}</td>
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

const KPIS = [
  { label: "Origin", value: "Metamarkets 2011", hint: "Built for ad-tech real-time analytics; open-sourced 2012; Apache top-level 2015", deltaTone: "flat" as const },
  { label: "Production scale", value: "1B+ events/day", hint: "Netflix serves 1B+ events/day; Airbnb 100M events/day; Alibaba 10B+ events/day", deltaTone: "up" as const },
  { label: "Query latency", value: "Sub-second p99", hint: "In-memory + mmap hybrid + HLL sketches = sub-second on billions of events", deltaTone: "up" as const },
  { label: "Architecture", value: "4-component", hint: "Coordinator + Overlord + Historical + MiddleManager (ingestion + serving separated)", deltaTone: "flat" as const },
];

export function DruidPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Apache Druid · time-series OLAP · Metamarkets origin"
        title="Apache Druid — sub-second analytics on event/time-series data"
        description="Druid is the time-series OLAP engine (born at Metamarkets in 2011) that powers real-time analytics at Netflix, Airbnb, Alibaba, and Salesforce. Its segment format is time-chunked (each segment covers a time range, e.g. 1 hour) and immutable — perfect for time-range queries ('last hour', 'last day') that prune to relevant segments immediately. The in-memory + mmap hybrid storage keeps recent time chunks hot in RAM and older chunks mmap'd from disk. Approximate aggregation primitives (HyperLogLog for distinct counts, quantile sketches) trade ~1% error for sub-second latency on billions of events. Druid's 4-component architecture (Coordinator + Overlord + Historical + MiddleManager) separates ingestion from serving — MiddleManagers consume Kafka + build segments; Historicals serve queries."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Activity className="h-3 w-3" /> Time-chunked</Badge>
            <Badge variant="outline" className="gap-1.5"><Atom className="h-3 w-3" /> HLL sketches</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* Segment architecture */}
      <SectionCard
        title="Segment architecture — Druid's 4-component design"
        description="Druid separates ingestion from serving. The MiddleManager runs indexing tasks that consume Kafka events and build segments in-memory. Sealed segments are pushed to deep storage (S3/HDFS) — durable and shared across the cluster. Historical nodes load segments for serving queries, scaling horizontally. The Coordinator manages segment assignment + load balancing. The Broker receives queries, routes to relevant Historicals + MiddleManagers (for consuming segments), and merges results. The client sees a single cluster — the topology is abstracted."
        icon={<Atom className="h-5 w-5" />}
        badge="architecture"
      >
        <SegmentArchitectureDiagram />
      </SectionCard>

      {/* Druid SQL */}
      <SectionCard
        title="Druid SQL — Kafka supervisor + sub-second queries"
        description="Druid SQL is an ANSI SQL layer on top of native JSON queries. The Kafka supervisor (submitted via Overlord REST API) manages MiddleManager indexing tasks per Kafka partition — each consumes events + builds a segment. Metrics spec includes count, sum, hyperUnique (HLL), and quantilesDoublesSketch. The granularitySpec sets segment (1 hour) and query (1 minute) granularity + rollup (boolean — should the segment pre-aggregate during ingestion). The result: sub-1s queries on 1B+ events/day via HLL + segment pruning + in-memory caching."
        icon={<Database className="h-5 w-5" />}
        badge="Druid SQL"
      >
        <CodeBlock code={DRUID_DDL_SQL} language="sql" filename="druid_supervisor.sql" highlight={[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37]} />
      </SectionCard>

      {/* pydruid Python */}
      <SectionCard
        title="pydruid — Python broker client"
        description="The pydruid Python package speaks both Druid SQL (via Avatica JDBC) and the native JSON query API. The SQL layer is the most convenient for pandas integration; the native JSON API exposes more Druid-specific features (timeseries, topN, groupBy, search). HLL-based approximate distinct counts are transparent in SQL — APPROX_COUNT_DISTINCT(user_id) returns the HLL estimate in sub-second on billions of events."
        icon={<Cpu className="h-5 w-5" />}
        badge="Python"
      >
        <CodeBlock code={DRUID_PYTHON} language="python" filename="druid_python.py" highlight={[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]} />
      </SectionCard>

      {/* Spark ingestion */}
      <SectionCard
        title="Druid + Spark — batch segment ingestion (historical backfill)"
        description="For historical backfill + batch ingestion, Druid ships a Spark segment builder. The builder reads Parquet from S3, builds time-chunked Druid segments, and submits them to the Overlord. The Coordinator distributes segments across Historicals; the broker picks up new segments automatically. The pattern: real-time Kafka for live events + Spark batch for historical — both write the same datasource."
        icon={<Server className="h-5 w-5" />}
        badge="Spark batch"
      >
        <CodeBlock code={DRUID_SCALA_INGESTION} language="scala" filename="druid_spark_ingestion.scala" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]} />
      </SectionCard>

      {/* Kafka supervisor */}
      <SectionCard
        title="Kafka supervisor — real-time ingestion from Kafka"
        description="The Kafka supervisor is Druid's real-time ingestion pattern. Submitted via the Overlord REST API, the supervisor manages MiddleManager indexing tasks per Kafka partition. Each task consumes events + builds an in-memory segment. Intermediate persists (every 10 minutes) flush to disk for durability. After taskDuration (1 hour), the segment is sealed + pushed to deep storage. The Coordinator picks up sealed segments and assigns to Historicals; the Broker routes queries across both consuming + sealed segments transparently."
        icon={<Activity className="h-5 w-5" />}
        badge="Kafka supervisor"
      >
        <CodeBlock code={DRUID_KAFKA_SUPERVISOR} language="sql" filename="druid_kafka_supervisor.sql" highlight={[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38]} />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: build an HLL sketch in your browser (Pyodide)"
        description="Pure-Python simulation of Druid's HLL-based approximate aggregation. Generate synthetic Netflix events, build HLL sketches per (title, country), and compare approximate distinct counts vs exact counts. See the memory trade-off: HLL uses ~2KB per sketch regardless of distinct count, while exact count distinct uses O(N) memory. At 1B events/day, HLL = sub-second; exact = OOM or minutes."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={PYODIDE_DEMO} buttonLabel="Run Druid HLL simulation (Pyodide)" />
      </SectionCard>

      {/* Comparison table */}
      <SectionCard
        title="Druid vs Pinot vs ClickHouse vs Presto — real-time OLAP siblings"
        description="Four open-source OLAP engines compete for the real-time analytics workload. Druid (Metamarkets origin) emphasises time-series + approximate aggregation + in-memory/mmap hybrid. Pinot (LinkedIn origin) has the star-tree pre-aggregation. ClickHouse (Yandex origin) is the SQL-on-event-data specialist with the richest SQL dialect. Presto (Facebook origin) is the federated SQL layer. Druid wins when you need time-series + approximate aggregation + sub-second p99 on streaming event data."
        icon={<Boxes className="h-5 w-5" />}
      >
        <OlapComparisonTable />
      </SectionCard>

      {/* Why this evolved */}
      <SectionCard
        title="Why Druid evolved — shortfalls of Hadoop/Hive (Era 1)"
        description="Druid was built at Metamarkets in 2011 because Hadoop/Hive couldn't do sub-second queries on event/time-series data at the scale of ad-tech (10B+ events/day). Four structural shortfalls motivated Druid's design."
        icon={<History className="h-5 w-5" />}
        badge="Why Druid"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: Hadoop/Hive couldn't do sub-second queries.</strong> Ad-tech needed real-time dashboards on 10B+ events/day — Hive-on-Mapreduce took minutes. Druid's segment + in-memory pattern gave sub-second p99 on the same data. <strong className="text-foreground/80">Result:</strong> ops teams got 'now' data on live dashboards; ad-tech real-time bidding + analytics became possible.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: No system handled time-series event data at scale.</strong> Hadoop was for batch + Parquet; HBase was for key-value; no system was built for time-bucketed event analytics. Druid's segment format is time-chunked by design — each segment covers a time range (hour, day), making time-range queries the fastest path. <strong className="text-foreground/80">Result:</strong> 'last hour' or 'last day' queries hit only relevant segments; sub-second on billions of events.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: SQL warehouses were too expensive for event analytics.</strong> Teradata, Exadata, Vertica cost tens of thousands per TB per month — ad-tech margins couldn't afford it. Druid on commodity hardware = ~10× cheaper. <strong className="text-foreground/80">Result:</strong> ad-tech + media + telecom real-time analytics became economically viable at scale.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: No approximate aggregation.</strong> Exact count distinct on 10B events required O(N) memory + seconds. Druid's HyperLogLog + quantile sketches gave ~1% error in sub-second + O(2KB) memory per sketch. <strong className="text-foreground/80">Result:</strong> 'unique users last hour' on 1B events = sub-second; the right trade-off for dashboards (which tolerate ~1% error).
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique Druid features (vs Pinot + ClickHouse + Presto)"
        description="Druid has four features that are genuinely unique — structural differentiators no other open-source OLAP engine has matched."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. In-memory + mmap hybrid storage</p>
            <p className="text-muted-foreground">Recent time chunks in RAM, older chunks mmap'd from disk — automatic tiering by recency. <strong>Pinot is segment-level only; ClickHouse is in-memory only; Presto has no caching layer.</strong> Druid's hybrid is unique.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Time-chunked segment format</p>
            <p className="text-muted-foreground">Each segment covers a time range (hour, day); time is always the primary axis. Time-range queries prune to relevant segments immediately. <strong>Pinot + ClickHouse have time-bucketed parts but not as primary structure.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Approximate aggregation primitives</p>
            <p className="text-muted-foreground">HLL (distinct), quantile sketches (median, p99), theta sketches (set operations) built-in. ~1% error for sub-second latency. <strong>ClickHouse has HLL + T-Digest; Pinot has HLL + Theta; Presto has limited.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Auto-compaction tiering</p>
            <p className="text-muted-foreground">Coordinator auto-tiers segments by age — recent in-memory, mid-age mmap, oldest on cold storage. Auto-compaction merges small segments. <strong>No other OLAP engine has automatic tiering + compaction.</strong></p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples cards */}
      <SectionCard
        title="3 large-dataset examples — cards with 5-language code popups"
        description="Three production-style dataset examples showing Druid in action. Each is a clickable card opening a lazy popup with: scenario brief (dataset/scale/why), dataset stats grid, computational tooling, multi-language code in Scala + Rust + Go + Elixir + Zig, and an implementation insight. All scenarios use synthetic Netflix/Airbnb/IoT-scale data."
        icon={<Database className="h-5 w-5" />}
        badge="3 examples × 5 langs"
      >
        <DatasetCards
          examples={DRUID_EXAMPLES}
          intro="Three synthetic scenarios at Netflix/Airbnb/IoT scale: (1) 1B/day Netflix events with HLL approximate distinct, (2) 100M/day Airbnb guest dashboards with sub-800ms p99, (3) 500M IoT sensors with time-series aggregation. Each card has Scala/Rust/Go/Elixir/Zig code highlighting Druid's unique time-chunked segment + in-memory/mmap hybrid differentiators."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the Druid ecosystem"
        description="Druid's 4-component architecture (Coordinator + Overlord + Historical + MiddleManager) is the operational core. The ingestion layer spans real-time (Kafka supervisor) and batch (Spark segment builder). The query layer supports SQL + native JSON + multi-tenant routing + approximate aggregation primitives."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Compute components (4)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Druid Coordinator</strong> — segment assignment + load balancing + auto-compaction</li>
              <li>• <strong>Druid Overlord</strong> — task management + supervisor API for real-time</li>
              <li>• <strong>Druid Historical (x N)</strong> — segment storage + query serving (in-memory + mmap)</li>
              <li>• <strong>Druid MiddleManager</strong> — indexing tasks (Kafka consumer + segment builder)</li>
              <li>• <strong>Druid Broker</strong> — query routing + result merge + multi-tenant</li>
              <li>• <strong>Druid Router</strong> — unified API endpoint (SQL + native JSON)</li>
              <li>• <strong>Spark Segment Builder</strong> — batch ingestion from HDFS/S3/Parquet</li>
              <li>• <strong>Flink Druid Sink</strong> — exactly-once streaming writes</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cloud className="h-3.5 w-3.5 text-primary" /> Storage + tooling</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Deep storage</strong> — S3 / HDFS / ADLS for sealed segments</li>
              <li>• <strong>Metadata storage</strong> — PostgreSQL / MySQL for cluster state</li>
              <li>• <strong>Zookeeper</strong> — coordination between Coordinator + Historicals</li>
              <li>• <strong>HLL sketch</strong> — approximate distinct counts (~2KB per sketch)</li>
              <li>• <strong>Quantile sketches</strong> — approximate median, p95, p99 (Kll + Quantiles)</li>
              <li>• <strong>Theta sketches</strong> — set operations (union, intersection)</li>
              <li>• <strong>Segment format</strong> — columnar + time-chunked + immutable</li>
              <li>• <strong>Druid SQL</strong> — ANSI SQL layer on native JSON queries</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers + production blog posts that defined Druid + real-time time-series analytics. The 2011 Metamarkets paper is the academic foundation; Netflix + Airbnb + Alibaba production posts document scale deployments."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Metamarkets 2011: "Druid: A Real-time Analytical Data Store":</strong> The origin paper by Yang Fang et al. Described the segment format (columnar + time-chunked + immutable), the 4-component architecture (Coordinator + Overlord + Historical + MiddleManager), and the rationale for building a new system: Hadoop/Hive couldn't do sub-second queries on event data at ad-tech scale (10B+ events/day). The paper is the academic foundation for the time-series OLAP category.
          </p>
          <p>
            <strong className="text-foreground/80">Netflix Eng 2017: "Druid at Netflix — Real-time Analytics at Scale":</strong> Netflix adopted Druid for real-time playback + engagement analytics. The post covers the architecture (Kafka → MiddleManager → Historical), the metric spec design (HLL for unique users, quantiles for watch duration), and the operational practices (segment compaction cadence, multi-tenant routing for product + ops + finance teams). Netflix serves 1B+ events/day on Druid.
          </p>
          <p>
            <strong className="text-foreground/80">Airbnb Eng 2018: "Druid at Airbnb — Sub-second Analytics":</strong> Airbnb uses Druid for guest-experience dashboards — bookings, searches, reviews. The post covers the time-chunked segment pattern (1-hour segments, 1-minute query granularity), the in-memory + mmap hybrid (recent segments in RAM for sub-second, older in mmap), and the multi-tenant resource quotas. 100M events/day at sub-second p99.
          </p>
          <p>
            <strong className="text-foreground/80">Alibaba Tech 2019: "Druid at Alibaba — 10B Events/day":</strong> Alibaba runs Druid at 10B+ events/day for cross-BU real-time analytics. The post covers the cluster topology (50+ Historicals, 20+ MiddleManagers), the auto-tiering (recent segments in-memory, oldest on cold storage), and the multi-tenant routing (per-BU broker quotas). The scale stresses the limits of Druid's design.
          </p>
          <p>
            <strong className="text-foreground/80">Apache Druid 0.20+ (2020-2024):</strong> Recent releases added Druid SQL (ANSI SQL layer), multi-stage query engine (JOIN support), inline data ingestion, and the Kafka supervisor (replacing the older Kafka firehose). The Druid SQL layer made Druid accessible to BI tools without learning the native JSON query API — strategically important for adoption.
          </p>
          <p>
            <strong className="text-foreground/80">Imply (2015):</strong> The commercial Druid company founded by the original Metarmarkets team. Imply provides managed Druid + adds query acceleration (Pull-up Mode for hybrid batch + real-time) + multi-tenant UI. The Imply fork is the basis for many commercial Druid deployments; the open-source Apache Druid is the reference implementation.
          </p>
        </div>
      </SectionCard>

      {/* Deeper-thought insight */}
      <SectionCard
        title="My deeper thought: Druid's segment format IS the time-chunked columnar store — time is always the primary axis"
        description="The unifying view: Druid's segment format is structurally a time-chunked columnar store — the design choice that makes time-range queries the fastest path. This is fundamentally different from Pinot/ClickHouse which partition by dimensions + use time as one of many."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Time is always the primary axis.</strong> Every Druid segment covers a time range (typically 1 hour or 1 day). This is the structural choice — segments are time-chunked first, dimension-partitioned second. A query like <code className="font-mono">WHERE __time &gt;= now() - interval '1' hour</code> hits only the segments covering that hour — pruning to a tiny fraction of the total data. Pinot + ClickHouse partition by dimensions and use time as one of many — time-range queries scan more data. The insight: for event/time-series workloads (where 90% of queries are time-range), making time the primary axis is the optimal storage layout.
          </p>
          <p>
            <strong className="text-foreground/80">The in-memory + mmap hybrid IS the working-set theory applied to OLAP.</strong> The OS virtual memory subsystem has understood the working-set theory since the 1960s — recently-accessed data stays in RAM, less-recent gets paged out. Druid applies this to OLAP: recent time chunks (last hour, last day) are pre-loaded in RAM; older chunks are mmap'd from disk (the OS handles page cache + eviction). The result is automatic tiering by recency — no DBA deciding what to cache. This is the same pattern as Linux's page cache for file access, applied to analytical segments. No other OLAP engine has this hybrid; Pinot has in-memory only, ClickHouse has in-memory only, Presto relies on the connector.
          </p>
          <p>
            <strong className="text-foreground/80">Approximate aggregation IS the streaming algorithm pattern.</strong> HLL, quantile sketches, theta sketches are streaming algorithms — they process each event once + maintain O(1) memory state regardless of input size. Druid's structural insight is that these algorithms are perfect for OLAP — you can pre-compute them during ingestion (per segment) + combine across segments (HLL union is merge). The result: 'unique users last hour' on 1B events = sub-second because the query only merges HLL sketches (one per segment), not the raw events. This is the same pattern as streaming aggregators (Flink, Kafka Streams) — Druid applies it to OLAP segments.
          </p>
          <p>
            <strong className="text-foreground/80">Druid IS the trade-off of time-series-first vs dimensional generality.</strong> Druid chose time as the primary axis — optimal for time-series workloads (Netflix, Airbnb, IoT), suboptimal for dimensional generality (where time isn't the dominant filter). Pinot chose dimensions-first with the star-tree — optimal for ad-tech dashboards, suboptimal for time-series. The deeper insight: there is no universally best OLAP layout; the choice depends on the workload. Druid is the right tool when 90%+ of queries have a time-range filter; Pinot is the right tool when dimensional GROUP BY dominates. Both are correct — they serve different workloads.
          </p>
        </div>
      </SectionCard>

      <DeeperThoughtSection pageTitle="Apache Druid">
        <DeeperThought title="Apache Druid IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about Apache Druid is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. Apache Druid connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where Apache Druid sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (Apache Druid) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
      <RelatedTopics topics={[
        { id: "pinot" as const, reason: "Sibling real-time OLAP (LinkedIn origin)" },
        { id: "iceberg" as const, reason: "Open table format — Druid segment vs Iceberg manifest" },
        { id: "streaming" as const, reason: "Kafka + Druid supervisor pattern" },
        { id: "modern-big-data" as const, reason: "OLAP engine comparison landscape" },
        { id: "arrow" as const, reason: "Columnar format underneath Druid segments" },
        { id: "databricks" as const, reason: "Spark as Druid batch segment builder" },
      ]} />
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "Trace this topic's connections across the platform's math graph" }, { id: "pinot" as const, reason: "Sibling real-time OLAP (LinkedIn origin)" }, { id: "iceberg" as const, reason: "Open table format — Druid segment vs Iceberg manifest" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("pinot")} className="text-sm text-primary hover:underline">
          &rarr; Apache Pinot (sibling real-time OLAP)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("iceberg")} className="text-sm text-primary hover:underline">
          &rarr; Apache Iceberg (open table format)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("streaming")} className="text-sm text-primary hover:underline">
          &rarr; Streaming (Kafka + Druid supervisor)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("modern-big-data")} className="text-sm text-primary hover:underline">
          &rarr; Modern Big Data landscape (OLAP comparison)
        </Link>
      </div>
    </div>
  );
}
