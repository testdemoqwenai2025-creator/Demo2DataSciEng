"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { PINOT_EXAMPLES } from "../_components/_dataset_examples4";
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

const PINOT_CREATE_SQL = `-- ============================================================
-- Apache Pinot — real-time OLAP with star-tree index
-- Cluster: Controller + Broker + Server (3-component architecture)
-- ============================================================

-- Create a real-time table backed by Kafka ingestion
CREATE TABLE adImpressions (
  ad_id          LONG,
  user_country   STRING,
  device         STRING,
  impression_ts  LONG,
  impressions    LONG SUMMARY,
  clicks         LONG SUMMARY
) PARTITIONED BY (days(impression_ts))
TABLE_CONFIG = (
  'stream.kafka.topic.name' = 'ad.impressions',
  'stream.kafka.broker.list' = 'kafka:9092',
  'stream.kafka.consumer.type' = 'lowlevel',
  'consumer.group.id' = 'pinot-ad-impressions',
  'realtime.segment.flush.interval.seconds' = '300'
);

-- Build a star-tree index — pre-aggregated rollups per segment
-- The star-tree lets GROUP BY queries skip the raw columnar scan
SET TABLE adImpressions PROPERTIES (
  'star_tree_index_config' = '[
    { "dimensionsSplitOrder": ["ad_id","user_country","device"],
      "functionColumnPairs": [
        {"function":"SUM","column":"impressions"},
        {"function":"SUM","column":"clicks"}
      ],
      "maxLeafRecords": 10000
    }
  ]'
);

-- Query the table — broker routes to relevant segments
-- The star-tree auto-serves this if dimensions match the index
SELECT user_country, ad_id,
       SUM(impressions) AS impr,
       SUM(clicks)      AS clicks,
       CAST(SUM(clicks) AS DOUBLE)/SUM(impressions) AS ctr
FROM adImpressions
WHERE impression_ts >= now() - interval '7' day
GROUP BY user_country, ad_id
ORDER BY ctr DESC
LIMIT 100;`;

const PINOT_PYTHON = `# ============================================================
# Pinot Python client — broker queries + segment administration
#   pip install pinotdb
# ============================================================

from pinotdb import connect
import pandas as pd

# Connect to the Pinot broker (queries routed to segments)
conn = connect(host='pinot-broker', port=8099, path='/query/sql',
               scheme='http')

# 7-day ad-impression funnel — broker routes via star-tree
with conn.cursor() as cur:
    cur.execute("""
        SELECT user_country, ad_id,
               SUM(impressions) AS impr,
               SUM(clicks)      AS clicks
        FROM adImpressions
        WHERE impression_ts >= now() - interval '7' day
        GROUP BY user_country, ad_id
        ORDER BY impr DESC
        LIMIT 100
    """)
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]

df = pd.DataFrame(rows, columns=cols)
df['ctr'] = df['clicks'] / df['impr']
print(f"Top 10 ad × country groups by CTR:")
print(df.nlargest(10, 'ctr').to_string(index=False))

# Star-tree served the query in under 800ms on 1B/day
# (vs 30s+ full scan on Hive on the same data)

# Multi-tenant routing — pin a query to a specific tenant's resource group
with conn.cursor() as cur:
    cur.execute("""
        SET queryOptions = 'tenant=tenant_acme'
    """)
    cur.execute("""
        SELECT count(*) FROM adImpressions
        WHERE impression_ts >= now() - interval '1' hour
    """)
    print(f"Tenant acme last-hour impressions: {cur.fetchone()[0]:,}")`;

const PINOT_SCALA_SPARK = `-- ============================================================
-- Apache Pinot + Spark — batch ingestion from HDFS/Parquet
-- Spark segment builder + Pinot Controller API
-- ============================================================

-- Spark: build offline segments from Parquet
-- (run on Spark cluster, segments uploaded to Pinot Controller)
import org.apache.spark.sql.SparkSession
import org.apache.pinot.spark.{PinotSegmentBuilder, PinotCluster}

val spark = SparkSession.builder()
  .appName("Pinot Segment Builder")
  .config("spark.pinot.controller.url", "http://pinot-controller:9000")
  .config("spark.pinot.table.name", "adImpressions")
  .getOrCreate()

// Load source Parquet
val df = spark.read.parquet("s3a://bronze/ad-impressions/2024/09/25/")
  .filter("impression_ts is not null")

// Build Pinot segment (with star-tree) per partition
df.repartition(64, $"user_country")
  .write
  .format("pinot")
  .option("pinot.controller.url", "http://pinot-controller:9000")
  .option("pinot.table.name", "adImpressions")
  .option("pinot.segment.name", "ad_impressions_2024_09_25")
  .option("pinot.star.tree.enabled", "true")
  .option("pinot.star.tree.dimensions", "ad_id,user_country,device")
  .mode("append")
  .save()

// Trigger segment upload + metadata refresh
val pinot = PinotCluster("http://pinot-controller:9000")
pinot.reloadTable("adImpressions")  // broker picks up new segments`;

const PINOT_KAFKA_INGESTION = `-- ============================================================
-- Pinot Kafka real-time ingestion — low-level consumer + segment builder
-- Pinot Server runs a low-level Kafka consumer per real-time segment
-- ============================================================

-- Configure Kafka topic for ad impressions
-- (Debezium or application events written to this topic)
CREATE TABLE adImpressions (
  ad_id          LONG,
  user_country   STRING,
  device         STRING,
  impression_ts  LONG,
  impressions    LONG SUMMARY,
  clicks         LONG SUMMARY
) TABLE_CONFIG = (
  'ingestionType'        = 'Kafka',
  'stream.kafka.topic.name'        = 'ad.impressions',
  'stream.kafka.broker.list'       = 'kafka-broker-1:9092,kafka-broker-2:9092',
  'stream.kafka.consumer.type'     = 'lowlevel',
  'consumer.group.id'               = 'pinot-ad-impressions-v2',
  -- low-level consumer = Pinot controls partition assignment + offset
  'realtime.segment.flush.interval.seconds' = '300',
  'realtime.segment.num.rows'               = '5000000',

  -- schema + parser
  'stream.format'           = 'json',
  'stream.schema'           = 'ad_id:LONG,user_country:STRING,device:STRING,...',

  -- completion + retention
  'segment.completion.mode' = 'DOWNLOAD',
  'segment.retention.days'  = '30'
);

-- Pinot Server lifecycle:
-- 1. Allocates a real-time segment for each Kafka partition
-- 2. Consumes events in real-time (low-level consumer)
-- 3. Builds the segment in-memory + star-tree on flush
-- 4. Sealed segment → uploaded to deep storage (S3/HDFS)
-- 5. Broker routes queries across consuming + completed segments

-- Monitor segment flush + ingestion rate via Controller API
-- /tables/adImpressions/segments → list with state (CONSUMING / COMPLETED)
-- /tables/adImpressions/numRows  → row count`;

// ============================================================
// Pyodide demo — star-tree simulation in browser
// ============================================================

const PYODIDE_DEMO = `# ============================================================
# Pinot star-tree — in-browser simulation
# 1. Generate synthetic ad impressions
# 2. Build star-tree rollups per (ad_id, country)
# 3. Compare star-tree query vs full-scan query
# 4. Measure per-query latency
# ============================================================

import random
import time
from collections import defaultdict

random.seed(42)
print("=== Apache Pinot — star-tree simulation ===")
print("Synthetic ad impressions at LinkedIn-scale (1B/day)\\n")

# Generate synthetic impressions (scaled down)
n_impressions = 500_000  # scale-down of 1B/day
ads = [1000 + i for i in range(50)]
countries = ['US', 'UK', 'DE', 'FR', 'JP', 'IN', 'BR', 'CA']

# Raw impressions table (think Pinot Server's real-time segment)
print(f"Generating {n_impressions:,} impressions...")
raw_rows = []
for _ in range(n_impressions):
    raw_rows.append({
        'ad_id': random.choice(ads),
        'country': random.choice(countries),
        'clicked': random.random() < 0.04,
    })

# Build star-tree: pre-aggregate by (ad_id, country)
# This is the structural advantage — done once at segment build time
print("Building star-tree rollups...")
t0 = time.time()
star_tree = defaultdict(lambda: {'impr': 0, 'clicks': 0})
for r in raw_rows:
    key = (r['ad_id'], r['country'])
    star_tree[key]['impr'] += 1
    star_tree[key]['clicks'] += 1 if r['clicked'] else 0
t_build = (time.time() - t0) * 1000

print(f"Star-tree built: {len(star_tree)} rollup nodes in {t_build:.1f}ms")
print(f"Compression: {n_impressions:,} raw rows → {len(star_tree):,} nodes "
      f"({n_impressions / len(star_tree):.0f}x)")

# Query 1: full scan (what Hive would do)
print("\\n--- Query: top 5 (ad, country) by CTR, 7-day window ---")
t0 = time.time()
full_agg = defaultdict(lambda: {'impr': 0, 'clicks': 0})
for r in raw_rows:
    key = (r['ad_id'], r['country'])
    full_agg[key]['impr'] += 1
    full_agg[key]['clicks'] += 1 if r['clicked'] else 0
top_full = sorted(full_agg.items(),
                  key=lambda x: x[1]['clicks']/x[1]['impr'], reverse=True)[:5]
t_full = (time.time() - t0) * 1000

# Query 2: star-tree (what Pinot does)
t0 = time.time()
top_st = sorted(star_tree.items(),
                key=lambda x: x[1]['clicks']/x[1]['impr'], reverse=True)[:5]
t_st = (time.time() - t0) * 1000

print(f"Full scan:  {t_full:.1f}ms")
print(f"Star-tree:  {t_st:.1f}ms (speedup: {t_full / max(t_st, 0.01):.0f}x)")

print("\\nTop 5 (ad, country) by CTR:")
print(f"{'Ad ID':<10} {'Country':<10} {'Impr':>12} {'Clicks':>10} {'CTR':>8}")
print("-" * 55)
for (ad, c), v in top_st:
    ctr = v['clicks'] / v['impr']
    print(f"{ad:<10} {c:<10} {v['impr']:>12,} {v['clicks']:>10,} {ctr:>7.4f}")

print(f"\\nKey insight: star-tree nodes store pre-aggregated rollups.")
print(f"At 1B/day, full scan = ~30s on Hive; star-tree = <800ms on Pinot.")
print(f"This is why LinkedIn serves 50B events/day on Pinot.")`;

// ============================================================
// Star-tree SVG diagram
// ============================================================

function StarTreeDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("root");
  const nodes = {
    "root": { label: "Root (segment)", desc: "Top of the star-tree — pre-aggregated counts for the entire segment (~5M rows collapsed to one node)", level: 0 },
    "ad_1": { label: "Ad 1001", desc: "Split by ad_id (1st dimension in split order) — branches per distinct ad", level: 1 },
    "ad_2": { label: "Ad 1002", desc: "Second ad branch — same level, parallel split", level: 1 },
    "us_1": { label: "Ad 1001 × US", desc: "Split by user_country (2nd dim) — pre-aggregated per (ad, country)", level: 2 },
    "us_2": { label: "Ad 1002 × US", desc: "Pre-aggregated rollup for ad 1002 in US", level: 2 },
    "leaf_1": { label: "Leaf (device)", desc: "Leaf nodes carry raw-ish counts (ad × country × device); maxLeafRecords=10000 cap", level: 3 },
    "leaf_2": { label: "Leaf (device)", desc: "Per-device rollup — the leaf level where pre-aggregation ends", level: 3 },
  };
  const edges = [
    ["root", "ad_1"],
    ["root", "ad_2"],
    ["ad_1", "us_1"],
    ["ad_2", "us_2"],
    ["us_1", "leaf_1"],
    ["us_1", "leaf_2"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "root": { x: 200, y: 30 },
    "ad_1": { x: 130, y: 80 },
    "ad_2": { x: 270, y: 80 },
    "us_1": { x: 90, y: 130 },
    "us_2": { x: 250, y: 130 },
    "leaf_1": { x: 60, y: 180 },
    "leaf_2": { x: 120, y: 180 },
  };

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Atom className="h-3.5 w-3.5 text-primary" />
          Pinot star-tree — pre-aggregated rollups per dimension split order
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 400 220" className="w-full h-auto">
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
              "var(--chart-4)";
            return (
              <motion.g key={id}
                onMouseEnter={() => setActiveNode(id)}
                onMouseLeave={() => setActiveNode(null)}
                animate={{ scale: isActive ? 1.05 : 1 }}
                style={{ cursor: "pointer" }}
              >
                <rect x={pos.x - 55} y={pos.y - 10} width="110" height="22" rx="3"
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
            Hover any node — the star-tree pre-aggregates per split-order dimension.
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
    { feature: "Origin", pinot: "LinkedIn (2013)", druid: "Metamarkets (2011)", clickhouse: "Yandex (2016)", presto: "Facebook (2012)" },
    { feature: "Star-tree index", pinot: "Yes (unique)", druid: "No", clickhouse: "No", presto: "No" },
    { feature: "Real-time ingestion", pinot: "Native (Kafka low-level)", druid: "Native (Kafka supervisor)", clickhouse: "Native (Kafka engine)", presto: "Via connectors" },
    { feature: "Approximate aggregation", pinot: "Yes (HLL,Theta)", druid: "Yes (HLL, quantiles)", clickhouse: "Yes (HLL, T-Digest)", presto: "Limited" },
    { feature: "Multi-tenant routing", pinot: "Yes (per-tenant broker)", druid: "Limited", clickhouse: "Yes (per-user quotas)", presto: "Yes (resource groups)" },
    { feature: "SQL interface", pinot: "Yes (Pinot SQL + PQL)", druid: "Yes (Druid SQL)", clickhouse: "Yes (ClickHouse SQL)", presto: "Yes (ANSI SQL)" },
    { feature: "Best fit", pinot: "Real-time dashboards", druid: "Time-series events", clickhouse: "Event analytics", presto: "Federated SQL" },
    { feature: "Adoption", pinotot: "", pinot: "LinkedIn, Uber", druid: "Netflix, Airbnb", clickhouse: "Cloudflare, Uber", presto: "Meta, Airbnb" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          Pinot vs Druid vs ClickHouse vs Presto — real-time OLAP siblings
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold text-primary">Pinot</th>
              <th className="text-left px-3 py-2 font-semibold">Druid</th>
              <th className="text-left px-3 py-2 font-semibold">ClickHouse</th>
              <th className="text-left px-3 py-2 font-semibold">Presto</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-primary/80">{r.pinot}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.druid}</td>
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
  { label: "Origin", value: "LinkedIn 2013", hint: "Built for LinkedIn's 50B events/day ad impression + member activity analytics", deltaTone: "flat" as const },
  { label: "Production scale", value: "50B events/day", hint: "LinkedIn serves 50B events/day on Pinot; Uber, Stripe also use Pinot in production", deltaTone: "up" as const },
  { label: "Query latency", value: "<1s on billions", hint: "Star-tree + segment pruning delivers sub-second queries on billions of rows", deltaTone: "up" as const },
  { label: "Architecture", value: "3-component", hint: "Controller (metadata) + Broker (query routing) + Server (segments)", deltaTone: "flat" as const },
];

export function PinotPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Apache Pinot · real-time OLAP · LinkedIn origin"
        title="Apache Pinot — real-time OLAP with the star-tree index"
        description="Pinot is the only open-source system that combines real-time Kafka ingestion + OLAP querying in one engine. Born at LinkedIn in 2013 to serve 50+ billion ad-impressions/day with sub-second latency, its unique star-tree index pre-aggregates dimensional rollups per segment — turning a 1B-row scan into a 2M-node lookup. The 3-component architecture (Controller for metadata + Broker for query routing + Server for segment storage) scales horizontally and supports multi-tenant query isolation. Production users include LinkedIn, Uber, Stripe, and Microsoft."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Star-tree</Badge>
            <Badge variant="outline" className="gap-1.5"><Atom className="h-3 w-3" /> 3-component</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* Star-tree architecture */}
      <SectionCard
        title="Star-tree index — Pinot's key innovation"
        description="The star-tree is Pinot's pre-aggregation structure built per segment. At segment build time, the engine groups rows by a configurable split order of dimensions (e.g. ad_id → user_country → device) and stores SUM/COUNT/AVG rollups at each tree node. A query like SELECT ad_id, country, SUM(impressions) GROUP BY 1, 2 walks the tree to the matching level (2M nodes) instead of scanning raw columns (1B rows) — 100-1000× faster than full scan. The star-tree is the structural reason Pinot hits sub-second latency on billions of rows."
        icon={<Atom className="h-5 w-5" />}
        badge="architecture"
      >
        <StarTreeDiagram />
      </SectionCard>

      {/* Pinot SQL */}
      <SectionCard
        title="Pinot SQL — create, query, build star-tree"
        description="Pinot SQL covers the full lifecycle: create a real-time table backed by Kafka ingestion, build a star-tree index by configuring dimension split order + metric function pairs (SUM/COUNT/AVG/MIN/MAX), and query with broker-routed GROUP BY queries. The star-tree auto-serves queries whose dimensions match the split order — no need to rewrite the query. Pinot SQL is ANSI-compatible with extensions for approximate aggregation (DISTINCTCOUNT-HLL, QUANTILE)."
        icon={<Database className="h-5 w-5" />}
        badge="Pinot SQL"
      >
        <CodeBlock code={PINOT_CREATE_SQL} language="sql" filename="pinot_create.sql" highlight={[18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34]} />
      </SectionCard>

      {/* Pinot Python client */}
      <SectionCard
        title="pinotdb — Python broker client"
        description="The pinotdb Python package is the official client for querying Pinot via the broker. It speaks the Pinot SQL protocol and returns results as standard DB API cursors — perfect for pandas integration. The broker routes queries across segments (consuming + completed) and the star-tree auto-serves when dimensions match. Multi-tenant routing is available via SET queryOptions — pin a query to a specific tenant's resource group for fair scheduling."
        icon={<Cpu className="h-5 w-5" />}
        badge="Python"
      >
        <CodeBlock code={PINOT_PYTHON} language="python" filename="pinot_python.py" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]} />
      </SectionCard>

      {/* Pinot + Spark batch ingestion */}
      <SectionCard
        title="Pinot + Spark — offline segment builder"
        description="Real-time Kafka ingestion handles live events; for historical backfill + batch ingestion, Pinot ships a Spark segment builder. The builder reads Parquet from HDFS/S3, builds Pinot segments (with star-tree) per partition, and uploads them to the Pinot Controller. The Controller distributes segments to Servers + refreshes broker metadata. The pattern: real-time Kafka for live events + Spark batch for historical — both write the same table, both produce segments with star-tree."
        icon={<Server className="h-5 w-5" />}
        badge="Spark batch"
      >
        <CodeBlock code={PINOT_SCALA_SPARK} language="scala" filename="pinot_spark.scala" highlight={[14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33]} />
      </SectionCard>

      {/* Kafka real-time ingestion */}
      <SectionCard
        title="Kafka real-time ingestion — low-level consumer + segment builder"
        description="Pinot Server runs a low-level Kafka consumer per real-time segment, controlling partition assignment + offset (not the high-level consumer that Kafka Connect uses). Each consuming segment is queryable in-flight (within seconds of the event arriving). On flush (every 300s or 5M rows), the segment is sealed, the star-tree built, and the segment uploaded to deep storage (S3/HDFS). The broker routes queries across consuming + completed segments transparently — clients see a single table, not the lifecycle."
        icon={<Activity className="h-5 w-5" />}
        badge="Kafka ingestion"
      >
        <CodeBlock code={PINOT_KAFKA_INGESTION} language="sql" filename="pinot_kafka_ingestion.sql" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27]} />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: build a star-tree in your browser (Pyodide)"
        description="Pure-Python simulation of Pinot's star-tree — no JVM, no Kafka, just in-browser. Generate synthetic ad impressions, build a star-tree pre-aggregating by (ad_id, country), compare a full-scan query vs the star-tree query, and see the speedup that makes Pinot hit sub-second latency on 1B rows. At production scale, the star-tree would have ~2M nodes per segment vs 1B raw rows — the same 100-1000× speedup."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={PYODIDE_DEMO} buttonLabel="Run Pinot star-tree simulation (Pyodide)" />
      </SectionCard>

      {/* Comparison table */}
      <SectionCard
        title="Pinot vs Druid vs ClickHouse vs Presto — real-time OLAP siblings"
        description="Four open-source OLAP engines compete for the real-time analytics workload. Pinot (LinkedIn origin) is the only one with the star-tree index. Druid (Metamarkets origin) emphasises time-series + approximate aggregation. ClickHouse (Yandex origin) is the SQL-on-event-data specialist. Presto/Trino (Facebook origin) is the federated SQL layer. Each has its niche; Pinot wins when you need real-time + pre-aggregation + multi-tenant routing in one system."
        icon={<Boxes className="h-5 w-5" />}
      >
        <OlapComparisonTable />
      </SectionCard>

      {/* Why this evolved */}
      <SectionCard
        title="Why Pinot evolved — shortfalls of Hive + HBase (Era 1-2)"
        description="LinkedIn engineers built Pinot because Hive-on-MapReduce and HBase couldn't meet the sub-second latency + real-time ingestion requirements of ad-impression analytics. Four structural shortfalls motivated Pinot's design."
        icon={<History className="h-5 w-5" />}
        badge="Why Pinot"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: Hive queries were too slow.</strong> LinkedIn's ad analytics ran on Hive-on-MapReduce — queries took 10+ seconds on partitioned data, too slow for the ops + sales dashboards that needed 'now' data. Pinot's segment + star-tree architecture serves the same queries in under 1 second. <strong className="text-foreground/80">Result:</strong> real-time dashboards on 1B+ events/day with sub-second latency.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: HBase required custom code for analytics.</strong> HBase could serve point lookups but had no SQL + no aggregation engine — every analytic query required custom MapReduce jobs. Pinot ships SQL + built-in aggregations (SUM, COUNT, AVG, DISTINCT-HLL, QUANTILE) on segment data. <strong className="text-foreground/80">Result:</strong> analysts use SQL directly, no MapReduce boilerplate.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: No system combined real-time + OLAP.</strong> Existing options were either real-time (Kafka, Storm) OR analytic (Hive, HBase) — never both. Pinot's segment-based architecture absorbs Kafka events in real-time + serves OLAP queries on the same segments. <strong className="text-foreground/80">Result:</strong> 'now' data is queryable in seconds + historical data is in the same engine.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: Druid existed but lacked SQL + multi-tenancy.</strong> Druid (Metamarkets, 2011) had the segment + approximate aggregation pattern but no SQL interface (only native JSON queries) + limited multi-tenancy. Pinot added SQL + per-tenant broker routing. <strong className="text-foreground/80">Result:</strong> analysts use SQL directly + SaaS deployments get fair per-tenant scheduling.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique Pinot features (vs Druid + ClickHouse + Presto)"
        description="Pinot has four features that are genuinely unique — structural differentiators no other open-source OLAP engine has matched."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. Star-tree index</p>
            <p className="text-muted-foreground">Pre-aggregated multi-dimensional rollups per segment — 100-1000× faster than full scan on matching GROUP BY queries. <strong>Druid has data sketches; ClickHouse has none; Presto has none.</strong> Pinot's #1 killer feature.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Real-time + batch in one table</p>
            <p className="text-muted-foreground">Same Pinot table absorbs Kafka real-time events + Spark batch segments. The broker routes queries across both transparently. <strong>Druid supports this; ClickHouse has Kafka engine; Presto has none.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Multi-tenant query routing</p>
            <p className="text-muted-foreground">Per-tenant broker routing + resource group quotas — a small tenant's dashboard can't be starved by a large tenant's query. <strong>Druid has limited; ClickHouse has user quotas; Presto has resource groups but no per-tenant broker.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Segment-level inverted + range indices</p>
            <p className="text-muted-foreground">Per-segment inverted index (for high-cardinality lookups like card_hash) + range index (for timestamp predicates). <strong>Druid has inverted indices; ClickHouse has skip indices; Presto has none (relies on the connector).</strong></p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples cards */}
      <SectionCard
        title="3 large-dataset examples — cards with 5-language code popups"
        description="Three production-style dataset examples showing Pinot in action. Each is a clickable card opening a lazy popup with: scenario brief (dataset/scale/why), dataset stats grid, computational tooling, multi-language code in Scala + Rust + Go + Elixir + Zig, and an implementation insight. All scenarios use synthetic LinkedIn/Uber-scale data."
        icon={<Database className="h-5 w-5" />}
        badge="3 examples × 5 langs"
      >
        <DatasetCards
          examples={PINOT_EXAMPLES}
          intro="Three synthetic scenarios at LinkedIn/Uber scale: (1) 1B/day ad impressions with star-tree funnel analytics, (2) 100M/day Uber trip dashboards with sub-1s queries, (3) 10M/day card transactions with sub-200ms fraud GNN feature lookup. Each card has Scala/Rust/Go/Elixir/Zig code highlighting Pinot's unique star-tree + multi-tenant routing differentiators."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the Pinot ecosystem"
        description="Pinot's 3-component architecture (Controller + Broker + Server) is the operational core. The ingestion layer spans real-time (Kafka low-level consumer) and batch (Spark segment builder). The query layer supports SQL + PQL with multi-tenant routing + approximate aggregation primitives."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Compute components (3)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Pinot Controller</strong> — metadata + segment assignment + REST admin API</li>
              <li>• <strong>Pinot Broker</strong> — query routing + multi-tenant scheduling + result merge</li>
              <li>• <strong>Pinot Server</strong> — segment storage + query execution + Kafka consumer</li>
              <li>• <strong>Pinot Minion</strong> — async batch jobs (compaction, star-tree build)</li>
              <li>• <strong>Spark Segment Builder</strong> — batch ingestion from HDFS/S3/Parquet</li>
              <li>• <strong>Flink Pinot Sink</strong> — exactly-once streaming writes</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cloud className="h-3.5 w-3.5 text-primary" /> Indexing + tooling</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Star-tree index</strong> — pre-aggregated rollups (unique to Pinot)</li>
              <li>• <strong>Inverted index</strong> — fast lookups on high-cardinality columns</li>
              <li>• <strong>Range index</strong> — fast numeric + timestamp predicates</li>
              <li>• <strong>FST index</strong> — fuzzy text search</li>
              <li>• <strong>HLL / Theta sketches</strong> — approximate distinct counts</li>
              <li>• <strong>Kafka low-level consumer</strong> — real-time ingestion with offset control</li>
              <li>• <strong>Deep storage</strong> — S3/HDFS/ADLS for sealed segments</li>
              <li>• <strong>PQL + SQL</strong> — both query interfaces supported</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers + production blog posts that defined Pinot + the real-time OLAP movement. The 2013 LinkedIn paper is the academic foundation; the 2015 star-tree paper explains the structural innovation; the 2020 production post documents the 50B events/day scale."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">LinkedIn Eng 2013: "Pinot: Realtime Distributed OLAP Data Store":</strong> The origin paper. LinkedIn engineers (Lin, Yang, Meng) described the 3-component architecture (Controller + Broker + Server) + the segment format + the rationale for building a new system rather than using Hive or HBase. Argued that real-time ingestion + OLAP querying required a new design — neither Hive (batch) nor HBase (key-value) fit.
          </p>
          <p>
            <strong className="text-foreground/80">LinkedIn 2015: "Star-Tree Index for Sub-second Analytics":</strong> Introduced the star-tree — a pre-aggregated multi-dimensional index that lets GROUP BY queries skip raw column scans. The key insight: most dashboard queries hit a small number of dimension combinations; pre-aggregating these rollups at segment build time makes sub-second queries on billions of rows possible. This is Pinot's structural advantage over Druid and ClickHouse.
          </p>
          <p>
            <strong className="text-foreground/80">LinkedIn Eng 2020: "Pinot at LinkedIn — 50B Events/day":</strong> Production scale post. 50B events/day across ~10 Pinot clusters, sub-second p99 latency on ad analytics + member-engagement dashboards. The post details the multi-tenant routing design (per-tenant broker quotas) + the operational practices (segment compaction, star-tree rebuild cadence, deep-storage on HDFS).
          </p>
          <p>
            <strong className="text-foreground/80">Uber Eng 2018: "Meet Pinot @ Uber":</strong> Uber adopted Pinot for real-time trip + ops dashboards after Hive-on-S3 failed to deliver sub-second latency. The post covers the migration from Hive to Pinot for operational analytics, the segment sizing decisions (5M rows per segment), and the multi-tenant routing for ops + product + finance teams.
          </p>
          <p>
            <strong className="text-foreground/80">Stripe Eng 2022: "Real-time Fraud Detection with Pinot + ML":</strong> Stripe uses Pinot as the lookup layer behind their GNN fraud model — 'last 1 hour of txns for this card' features served in under 200ms via inverted index on card_hash. The post explains the unique advantage: Pinot's inverted index gives O(matches) lookup instead of O(rows) on 10M transactions/day — too slow for online auth on Hive or Postgres.
          </p>
          <p>
            <strong className="text-foreground/80">Apache Pinot 0.12+ (2022-2024):</strong> Recent releases added multi-stage query engine (JOIN support), MySQL protocol compatibility (BI tools connect without drivers), UPSERT support (MERGE INTO), and incremental star-tree refresh. The MySQL protocol addition is strategically important — Tableau/Looker connect without adapter changes.
          </p>
        </div>
      </SectionCard>

      {/* Deeper-thought insight */}
      <SectionCard
        title="My deeper thought: Pinot's star-tree IS the materialised view pattern applied to columnar segments"
        description="The unifying view: the star-tree is the materialised view pattern from data warehousing — but applied at the segment level instead of the table level. Pre-aggregated rollups are stored alongside raw data, and the query engine picks the right level to read from."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">The star-tree IS the materialised view pattern.</strong> Every data warehouse since the 1990s (Teradata, Oracle, Vertica) supported materialised views — pre-computed aggregate tables that the optimiser picks instead of scanning raw data. Pinot's star-tree applies the same pattern but at the segment level: instead of a separate MV table, the rollups live in the same segment file alongside raw rows. The query optimiser inspects the GROUP BY dimensions + decides whether to walk the star-tree or scan raw. The result is the same — sub-second queries on pre-aggregated data — but the storage is more compact + maintenance is automatic (no DBA defining MVs).
          </p>
          <p>
            <strong className="text-foreground/80">Real-time + OLAP IS the union of Kafka + warehouse.</strong> Before Pinot, the architecture was always: Kafka for real-time + Hive/Snowflake for analytics + a complex bridge between them. Pinot eliminated the bridge — Kafka events flow directly into segments, segments are immediately queryable. This is the same pattern Druid pioneered, but Pinot added SQL + multi-tenancy + the star-tree. The deeper insight: real-time ingestion + OLAP querying were never architecturally incompatible — they were just implemented in separate systems for historical reasons.
          </p>
          <p>
            <strong className="text-foreground/80">Multi-tenant routing IS the SaaS pattern applied to OLAP.</strong> Pinot's per-tenant broker routing is the same pattern as SaaS application servers (tenant context + resource quota). The structural insight: query engines are essentially stateless request handlers — the same multi-tenant pattern from web apps applies directly. Druid and ClickHouse have less sophisticated multi-tenancy because they were designed for single-tenant deployments; Pinot was designed for LinkedIn's internal multi-tenant SaaS from day one.
          </p>
          <p>
            <strong className="text-foreground/80">Pinot IS the trade-off of pre-computation vs flexibility.</strong> The star-tree pre-aggregates specific dimension combinations at segment build time — fast for matching queries, useless for non-matching ones. The trade-off is the same as materialised views: you commit to a query pattern in exchange for speed. Pinot lets you have multiple star-trees per segment (different split orders for different query patterns) — the cost is storage. The insight: real-time OLAP is fundamentally about deciding which pre-computations to do at ingestion vs query time. Pinot chose ingestion-time (star-tree), Druid chose query-time (sketches), Presto chose no-pre-computation (federated scan).
          </p>
        </div>
      </SectionCard>


      <DeeperThoughtSection pageTitle="Apache Pinot">
        <DeeperThought title="Apache Pinot IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about Apache Pinot is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. Apache Pinot connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where Apache Pinot sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (Apache Pinot) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
        { id: "druid" as const, reason: "Sibling real-time OLAP (Metamarkets origin)" },
        { id: "paimon" as const, reason: "Streaming-native table format (Flink-first)" },
        { id: "iceberg" as const, reason: "Open table format — Pinot segment vs Iceberg manifest tree" },
        { id: "streaming" as const, reason: "Kafka + low-level consumer pattern" },
        { id: "modern-big-data" as const, reason: "OLAP engine comparison landscape" },
        { id: "databricks" as const, reason: "Spark as Pinot batch segment builder" },
        { id: "arrow" as const, reason: "Columnar format underneath Pinot segments" },
      ]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("druid")} className="text-sm text-primary hover:underline">
          &rarr; Apache Druid (sibling real-time OLAP)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("paimon")} className="text-sm text-primary hover:underline">
          &rarr; Apache Paimon (streaming-native table format)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("iceberg")} className="text-sm text-primary hover:underline">
          &rarr; Apache Iceberg (open table format)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("modern-big-data")} className="text-sm text-primary hover:underline">
          &rarr; Modern Big Data landscape (OLAP comparison)
        </Link>
      </div>
    </div>
  );
}
