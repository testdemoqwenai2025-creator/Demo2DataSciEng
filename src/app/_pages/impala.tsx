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
import { IMPALA_EXAMPLES } from "../_components/_dataset_examples4";
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

const IMPALA_DDL_SQL = `-- ============================================================
-- Apache Impala — Cloudera Hadoop-era MPP SQL engine (2012)
-- Runs on: Cloudera CDW, CDH 6+, CDP Private Cloud
-- Storage: HDFS Parquet, Kudu, HBase, ORC
-- ============================================================

-- Create a Parquet table on HDFS (Impala + Hive Metastore)
CREATE TABLE transactions (
  txn_id         BIGINT,
  customer_id    BIGINT,
  amount_usd     DECIMAL(18, 4),
  txn_ts         TIMESTAMP,
  currency       STRING,
  merchant       STRING
) PARTITIONED BY (year INT, month INT)
STORED AS PARQUET
TBLPROPERTIES (
  'parquet.compression' = 'SNAPPY',
  'transactional'       = 'false'
);

-- Compute statistics for the CBO (cost-based optimiser)
COMPUTE STATS transactions;
COMPUTE INCREMENTAL STATS transactions PARTITION (year=2024, month=9);

-- MPP query — Impala's LLVM JIT compiles the plan to native code
-- All Impala daemons scan their local DataNode partitions in parallel
SELECT
  currency, merchant,
  count(*)          AS n_txns,
  sum(amount_usd)  AS total_usd,
  avg(amount_usd)  AS avg_ticket
FROM transactions
WHERE year = 2024 AND month = 9
  AND txn_ts &gt;= '2024-09-25 00:00:00'
GROUP BY currency, merchant
ORDER BY total_usd DESC
LIMIT 100;

-- INSERT + MERGE on Kudu tables (fast point upserts)
MERGE INTO customers AS t
USING staging_customer_updates AS s
ON t.customer_id = s.customer_id
WHEN MATCHED THEN UPDATE SET tier = s.tier,
  lifetime_value_usd = s.lifetime_value_usd
WHEN NOT MATCHED THEN INSERT VALUES (s.customer_id, s.email,
  s.country, s.tier, s.lifetime_value_usd);`;

const IMPALA_PYTHON = `# ============================================================
# Impala Python client — JDBC via impyla or Cloudera driver
#   pip install impyla  (pure Python, Thrift-based)
# ============================================================

from impala.dbapi import connect
import pandas as pd

# Connect to Impala via HiveServer2 Thrift
conn = connect(host='impala-coordinator', port=21050,
               user='analyst',
               auth_mechanism='PLAIN',
               use_http_transport=True,
               http_path='cliservice')

# MPP query — runs across all Impala daemons in parallel
with conn.cursor() as cur:
    cur.execute("""
        SELECT currency, merchant,
               count(*)          AS n_txns,
               sum(amount_usd)  AS total_usd,
               avg(amount_usd)  AS avg_ticket
        FROM transactions
        WHERE year = 2024 AND month = 9
        GROUP BY currency, merchant
        ORDER BY total_usd DESC
        LIMIT 100
    """)
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]

df = pd.DataFrame(rows, columns=cols)
print(f"Top 100 merchant × currency groups:")
print(df.head(10).to_string(index=False))

# Get query profile (LLVM JIT codegen + scan details)
with conn.cursor() as cur:
    cur.execute("EXPLAIN " + """
        SELECT count(*) FROM transactions WHERE year = 2024
    """)
    plan = cur.fetchall()
    print("\\nQuery plan:")
    for line in plan: print(line[0])

# Set query options (LLVM codegen, memory limits, admission control)
with conn.cursor() as cur:
    cur.execute("SET_codegen=true")
    cur.execute("SET mem_limit=10GB")
    cur.execute("SET request_pool=root.analysts")
    cur.execute("SELECT count(*) FROM transactions WHERE year = 2024")
    print(f"\\nTotal 2024 transactions: {cur.fetchone()[0]:,}")`;

const IMPALA_KUDU_SCALA = `-- ============================================================
-- Impala + Kudu — fast scans + upserts on HDFS
-- Kudu = Cloudera's columnar storage with tablet-based replication
-- ============================================================

import org.apache.impala.scala.{ImpalaClient, KuduTableConfig}

val impala = ImpalaClient.connect("jdbc:impala://cdw-host:21050/default",
  "analyst", "\${IMPALA_PASSWORD}")

// Create a Kudu table — columnar + upsertable (unique on HDFS)
val kuduTable = KuduTableConfig("customers")
  .schema(Schema("customers")
    .addPrimaryKey("customer_id", ColumnType.BIGINT)
    .addColumn("email", ColumnType.STRING, nullable=false)
    .addColumn("country", ColumnType.STRING)
    .addColumn("tier", ColumnType.STRING)
    .addColumn("lifetime_value_usd", ColumnType.DECIMAL)
    .addColumn("updated_ts", ColumnType.TIMESTAMP)
    .build())
  .partitionStrategy("HASH", "customer_id", 16)  // 16 hash partitions
  .numReplicas(3)  // tablet replicas (Raft replication)
  .build()

impala.createTable(kuduTable)

// Sub-second scan via Impala's vectorised execution on Kudu columnar storage
val rs = impala.query(
  """SELECT country, tier, count(*) AS n, avg(lifetime_value_usd) AS avg_ltv
    |FROM customers GROUP BY country, tier
    |ORDER BY avg_ltv DESC""".stripMargin)

// Fast upsert via MERGE — Kudu supports point updates (HDFS Parquet cannot)
impala.execute(
  """MERGE INTO customers AS t USING staging_updates AS s
    |ON t.customer_id = s.customer_id
    |WHEN MATCHED THEN UPDATE SET tier = s.tier
    |WHEN NOT MATCHED THEN INSERT VALUES (s.customer_id, s.email,
    |  s.country, s.tier, s.ltv, s.ts)""".stripMargin)`;

const IMPALA_LLVM_CODEGEN = `-- ============================================================
-- Impala LLVM codegen — compile query plan to native code
-- Each daemon JIT-compiles its fragment of the plan at query time
-- ============================================================

-- Enable LLVM codegen (default in Impala 4.0+)
SET_codegen = true;
SET disable_codegen = false;
SET codegen_cache_mode = 1;  -- cache compiled plans across queries

-- Query: the plan is compiled to native code (not interpreted)
SELECT
  date_trunc('day', txn_ts) AS day,
  currency,
  count(*)         AS n_txns,
  sum(amount_usd) AS total_usd,
  avg(amount_usd) AS avg_ticket
FROM transactions
WHERE year = 2024
GROUP BY 1, 2
ORDER BY 1 DESC, 4 DESC
LIMIT 1000;

-- Query profile (after running) shows:
--   - LLVM codegen took ~50ms (one-time cost per plan fragment)
--   - Native code execution ~2-3× faster than interpreter
--   - Per-fragment: scan fragment + agg fragment + sort fragment
--   - All fragments run in parallel across daemons

-- Profile inspection (run after a query):
PROFILE;
-- Shows: per-fragment timing, memory usage, scan rows,
--        codegen stats, network shuffle volume

-- Compare to Hive-on-MapReduce (which Impala replaced):
--   - Hive-on-MapReduce: 5-10 minutes per query (JVM startup + MapReduce overhead)
--   - Impala with LLVM: 5-10 seconds per query (MPP + native code)
--   - 50-100x speedup is the structural reason Impala was built`;

// ============================================================
// Pyodide demo — MPP + LLVM JIT codegen simulation
// ============================================================

const PYODIDE_DEMO = `# ============================================================
# Impala MPP + LLVM JIT codegen simulation (in-browser)
# 1. Generate synthetic 100TB-equivalent transactions
# 2. Simulate MPP parallel scan across N nodes
# 3. Simulate LLVM JIT codegen speedup vs interpreter
# 4. Measure per-query latency
# ============================================================

import random
import time
from collections import defaultdict

random.seed(42)
print("=== Apache Impala — MPP + LLVM JIT codegen ===")
print("Synthetic Cloudera CDW 100TB on HDFS\\n")

# Generate synthetic transactions (scaled down from ~1B rows)
n_rows = 1_000_000  # scale-down
n_nodes = 20        # 20-node Hadoop cluster
currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CAD']
merchants = ['Amazon', 'Starbucks', 'Shell', 'Walmart', 'Target',
             'McDonalds', 'Uber', 'Airbnb']

# Generate rows distributed across nodes (like HDFS block distribution)
print(f"Generating {n_rows:,} transactions across {n_nodes} nodes...")
rows = []
rows_per_node = n_rows // n_nodes
for node_id in range(n_nodes):
    for _ in range(rows_per_node):
        rows.append({
            'node': node_id,
            'currency': random.choice(currencies),
            'merchant': random.choice(merchants),
            'amount': round(random.uniform(5, 500), 2),
            'year': 2024, 'month': 9, 'day': 25,
        })

# MPP scan: all nodes scan in parallel + aggregate locally
# Each node scans its local rows + returns partial aggregates
print("\\n--- MPP scan: each node scans locally + aggregates ---")
t0 = time.time()
node_partials = defaultdict(lambda: defaultdict(lambda: {'n': 0, 'sum': 0.0}))
for r in rows:
    n = r['node']
    key = (r['currency'], r['merchant'])
    p = node_partials[n][key]
    p['n'] += 1
    p['sum'] += r['amount']
t_partial = (time.time() - t0) * 1000

# Coordinator merges partial aggregates
t0 = time.time()
final = defaultdict(lambda: {'n': 0, 'sum': 0.0})
for n, partials in node_partials.items():
    for key, p in partials.items():
        f = final[key]
        f['n'] += p['n']
        f['sum'] += p['sum']
t_merge = (time.time() - t0) * 1000

print(f"Local partials: {t_partial:.1f}ms (parallel across {n_nodes} nodes)")
print(f"Coordinator merge: {t_merge:.1f}ms (serial at coordinator)")
print(f"Effective per-node scan: {t_partial/n_nodes:.1f}ms")

# LLVM JIT codegen speedup
# Real Impala: each fragment is JIT-compiled to native code
# Generic interpreter would be ~2-3x slower per fragment
t_interpreter = t_partial * 2.5  # interpreter ~2.5x slower
t_native = t_partial              # native execution

print(f"\\n--- LLVM JIT codegen speedup ---")
print(f"Interpreter (generic):  {t_interpreter:.1f}ms")
print(f"Native (LLVM JIT):       {t_native:.1f}ms")
print(f"Speedup: {t_interpreter/t_native:.1f}x (typical 2-3x for Impala)")

# Top results
print(f"\\n--- Top 5 (currency, merchant) by total ---")
print(f"{'Currency':<10} {'Merchant':<12} {'Count':>12} {'Total':>15}")
print("-" * 50)
for (cur, merch), v in sorted(final.items(), key=lambda x: x[1]['sum'], reverse=True)[:5]:
    print(f"{cur:<10} {merch:<12} {v['n']:>12,} USD {v['sum']:>12,.2f}")

print(f"\\nKey insight: MPP + LLVM JIT = 50-100x faster than Hive-on-MapReduce.")
print(f"At 100TB on HDFS: Impala = sub-10s queries; Hive = 5-10 minutes.")
print(f"This is the structural reason LinkedIn, Cloudera pushed Impala.")`;

// ============================================================
// Impala MPP architecture SVG diagram
// ============================================================

function MppArchitectureDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("coordinator");
  const nodes = {
    "client": { label: "Client (BI/SQL)", desc: "Submits SQL via JDBC/ODBC — looks like a single database", level: 0 },
    "coordinator": { label: "Coordinator (impalad)", desc: "Receives SQL, generates distributed plan, dispatches fragments to daemons", level: 1 },
    "daemon_1": { label: "Impala Daemon 1", desc: "MPP fragment + local DataNode scan + LLVM JIT codegen for fragment", level: 2 },
    "daemon_2": { label: "Impala Daemon 2", desc: "Parallel fragment execution on local data — no network scan, only local shuffle", level: 2 },
    "daemon_n": { label: "Impala Daemon N", desc: "All daemons run in parallel — each scans its local HDFS blocks", level: 2 },
    "hdfs_1": { label: "HDFS Datanode 1", desc: "Local HDFS blocks — Impala co-located with DataNode for data locality", level: 3 },
    "hdfs_2": { label: "HDFS Datanode 2", desc: "Local HDFS blocks — same node as Impala daemon 2", level: 3 },
    "hdfs_n": { label: "HDFS Datanode N", desc: "Local HDFS blocks — parallel I/O, no remote reads for hot data", level: 3 },
    "kudu": { label: "Kudu tablets", desc: "Optional: Kudu for columnar storage with upserts (HDFS Parquet cannot)", level: 3 },
  };
  const edges = [
    ["client", "coordinator"],
    ["coordinator", "daemon_1"],
    ["coordinator", "daemon_2"],
    ["coordinator", "daemon_n"],
    ["daemon_1", "hdfs_1"],
    ["daemon_2", "hdfs_2"],
    ["daemon_n", "hdfs_n"],
    ["daemon_n", "kudu"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "client": { x: 200, y: 30 },
    "coordinator": { x: 200, y: 70 },
    "daemon_1": { x: 80, y: 130 },
    "daemon_2": { x: 200, y: 130 },
    "daemon_n": { x: 320, y: 130 },
    "hdfs_1": { x: 80, y: 190 },
    "hdfs_2": { x: 200, y: 190 },
    "hdfs_n": { x: 320, y: 190 },
    "kudu": { x: 320, y: 220 },
  };

  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Atom className="h-3.5 w-3.5 text-primary" />
          Impala MPP architecture — Coordinator + N Daemons + N HDFS Datanodes (data-locality)
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
            Hover any node — Impala daemons are co-located with HDFS DataNodes for data locality.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Hadoop SQL engines comparison table
// ============================================================

function HadoopSqlComparisonTable() {
  const rows = [
    { feature: "Origin", impala: "Cloudera (2012)", hive: "Facebook (2010)", presto: "Facebook (2012)", spark_sql: "Databricks (2014)" },
    { feature: "Execution model", impala: "MPP (no MapReduce)", hive: "MapReduce (or Tez)", presto: "MPP (in-memory)", spark_sql: "RDD/DataFrame" },
    { feature: "LLVM JIT codegen", impala: "Yes (unique)", hive: "No", presto: "No", spark_sql: "No (Tungsten C++ but no JIT)" },
    { feature: "Kudu integration", impala: "Yes (native)", hive: "No", presto: "Limited", spark_sql: "Yes (via Kudu connector)" },
    { feature: "Query latency", impala: "Sub-10s", hive: "Minutes", presto: "Sub-30s", spark_sql: "Sub-minute" },
    { feature: "HDFS data locality", impala: "Yes (co-located)", hive: "No (MapReduce reads)", presto: "Yes", spark_sql: "Yes" },
    { feature: "Best fit", impala: "On-prem Hadoop BI", hive: "Batch ETL", presto: "Federated SQL", spark_sql: "Spark-ecosystem analytics" },
    { feature: "Adoption", impala: "Cloudera CDW customers", hive: "Most Hadoop clusters", presto: "Meta, Airbnb", spark_sql: "All Spark users" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          Impala vs Hive vs Presto vs Spark SQL — Hadoop SQL engines
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-3 py-2 font-semibold">Feature</th>
              <th className="text-left px-3 py-2 font-semibold text-primary">Impala</th>
              <th className="text-left px-3 py-2 font-semibold">Hive</th>
              <th className="text-left px-3 py-2 font-semibold">Presto</th>
              <th className="text-left px-3 py-2 font-semibold">Spark SQL</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-primary/80">{r.impala}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.hive}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.presto}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.spark_sql}</td>
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
  { label: "Origin", value: "Cloudera 2012", hint: "Cloudera engineers built Impala to bring sub-10s queries to Hadoop; open-sourced 2013, Apache top-level 2017", deltaTone: "flat" as const },
  { label: "Query speedup vs Hive", value: "50-100×", hint: "MPP + LLVM JIT codegen = 5-10s vs Hive-on-MapReduce's 5-10 minutes on the same data", deltaTone: "up" as const },
  { label: "Production deployments", value: "Cloudera CDW", hint: "Ships as the default SQL engine in Cloudera CDW; widely deployed in on-prem Hadoop + Kudu stacks", deltaTone: "flat" as const },
  { label: "Architecture", value: "MPP + LLVM JIT", hint: "Shared-nothing MPP across HDFS Datanodes + LLVM JIT-compiled query plans + Kudu integration", deltaTone: "flat" as const },
];

export function ImpalaPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Apache Impala · Cloudera · Hadoop-era MPP SQL"
        title="Apache Impala — MPP SQL on Hadoop with LLVM JIT codegen"
        description="Impala is Cloudera's Hadoop-era MPP SQL engine (2012) — the original answer to 'why is Hive-on-MapReduce so slow?'. Built when Hadoop clusters had petabytes of data and Hive queries took 5-10 minutes, Impala brought sub-10-second queries to the same HDFS data via two structural innovations: MPP (massively parallel processing across HDFS DataNodes, no MapReduce overhead) and LLVM JIT codegen (each query plan is compiled to native code at runtime, 2-3× faster than an interpreter). The Kudu integration (Cloudera's columnar storage with tablet-based replication) added fast upserts — HDFS Parquet cannot do upserts without rewriting files. Today, Impala ships as the default SQL engine in Cloudera CDW; still relevant for on-prem Hadoop + Kudu stacks where data is already on HDFS and commercial cloud warehouses aren't an option."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> LLVM JIT</Badge>
            <Badge variant="outline" className="gap-1.5"><Atom className="h-3 w-3" /> MPP</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* MPP architecture */}
      <SectionCard
        title="MPP architecture — Impala's 2-component design"
        description="Impala's architecture is simpler than Pinot/Druid (which need 3-4 components for ingestion + serving). Impala daemons run co-located with HDFS DataNodes — each daemon scans its local HDFS blocks, no remote reads for hot data. The coordinator daemon receives SQL, generates a distributed query plan, dispatches fragments to all daemons, and merges the results. Each daemon runs LLVM JIT codegen for its fragment + executes in parallel. The result: shared-nothing MPP across the Hadoop cluster, with the same data locality that HDFS provides for MapReduce — but without the MapReduce JVM startup + shuffle overhead."
        icon={<Atom className="h-5 w-5" />}
        badge="architecture"
      >
        <MppArchitectureDiagram />
      </SectionCard>

      {/* Impala SQL */}
      <SectionCard
        title="Impala SQL — Parquet tables + Kudu upserts + CBO"
        description="Impala SQL is Hive-compatible with extensions for Kudu (MERGE INTO for fast point upserts), partition pruning (Hive-style partitioned tables), and COMPUTE STATS for the cost-based optimiser. The CREATE TABLE syntax supports STORED AS PARQUET, STORED AS KUDU, and external HBase tables. COMPUTE STATS collects per-column statistics that the CBO uses to pick join order + broadcast vs shuffle — critical for query performance on multi-table joins."
        icon={<Database className="h-5 w-5" />}
        badge="Impala SQL"
      >
        <CodeBlock code={IMPALA_DDL_SQL} language="sql" filename="impala_ddl.sql" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33]} />
      </SectionCard>

      {/* impyla Python */}
      <SectionCard
        title="impyla — Python Impala client (Thrift)"
        description="The impyla package is the pure-Python Impala client (Thrift protocol). It speaks HiveServer2 Thrift, so the same client works with Hive + Spark Thrift server. The EXPLAIN command shows the query plan (per-fragment: scan + agg + sort + exchange). The PROFILE command (run after a query) shows per-fragment timing, memory usage, codegen stats, and network shuffle volume — essential for query tuning. Query options like _codegen=true, mem_limit, and request_pool control admission control."
        icon={<Cpu className="h-5 w-5" />}
        badge="Python"
      >
        <CodeBlock code={IMPALA_PYTHON} language="python" filename="impala_python.py" highlight={[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37]} />
      </SectionCard>

      {/* Kudu integration */}
      <SectionCard
        title="Impala + Kudu — fast scans + upserts on HDFS"
        description="Apache Kudu (Cloudera, 2015) is the columnar storage with tablet-based Raft replication that solves HDFS Parquet's biggest limitation — no upserts. Kudu supports both fast columnar scans (like Parquet) AND fast point upserts (like HBase). Impala is the SQL layer that exposes both. The MERGE INTO pattern on Kudu tables gives sub-10ms per-upsert latency; HDFS Parquet would require a full file rewrite. For customer-profile + dimension tables that need both scan + upsert, Kudu+Impala is the production pattern."
        icon={<Server className="h-5 w-5" />}
        badge="Kudu"
      >
        <CodeBlock code={IMPALA_KUDU_SCALA} language="scala" filename="impala_kudu.scala" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]} />
      </SectionCard>

      {/* LLVM codegen */}
      <SectionCard
        title="LLVM JIT codegen — query plan to native code"
        description="Impala's LLVM JIT codegen is the structural advantage over Hive-on-MapReduce and Presto. At query time, each daemon compiles its fragment of the distributed plan to native code (LLVM IR → machine code). The one-time codegen cost (~50ms) is amortised over a query that runs in seconds. The native code runs 2-3× faster than an interpreter — critical for sub-10-second BI dashboards on 100TB+. The codegen cache ( Impala 4.0+) caches compiled plans across queries with similar shapes, further reducing overhead."
        icon={<Zap className="h-5 w-5" />}
        badge="LLVM JIT"
      >
        <CodeBlock code={IMPALA_LLVM_CODEGEN} language="sql" filename="impala_llvm_codegen.sql" highlight={[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]} />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: simulate MPP + LLVM JIT codegen (Pyodide)"
        description="Pure-Python simulation of Impala's MPP + LLVM JIT codegen. Generate synthetic transactions distributed across N nodes, simulate parallel scan + local aggregation + coordinator merge, and compare the codegen speedup (native vs interpreter). At production scale (100TB across 20 nodes), Impala's MPP + LLVM = sub-10s queries vs Hive-on-MapReduce's 5-10 minutes — the 50-100× speedup is the structural reason Impala was built."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={PYODIDE_DEMO} buttonLabel="Run Impala MPP + LLVM simulation (Pyodide)" />
      </SectionCard>

      {/* Comparison table */}
      <SectionCard
        title="Impala vs Hive vs Presto vs Spark SQL — Hadoop SQL engines"
        description="Four SQL engines compete for Hadoop workloads. Impala (Cloudera origin) is the MPP + LLVM JIT specialist. Hive (Facebook origin) is the original Hadoop SQL — slow but ubiquitous. Presto (Facebook origin) is the in-memory MPP layer. Spark SQL (Databricks origin) is the Spark-ecosystem SQL engine. Impala wins for on-prem Hadoop BI workloads where sub-10s latency matters and Cloudera CDW is the platform."
        icon={<Boxes className="h-5 w-5" />}
      >
        <HadoopSqlComparisonTable />
      </SectionCard>

      {/* Why this evolved */}
      <SectionCard
        title="Why Impala evolved — shortfalls of Hive-on-MapReduce"
        description="Cloudera engineers built Impala in 2012 because Hive-on-MapReduce was structurally too slow for BI workloads. Four shortfalls motivated Impala's design."
        icon={<History className="h-5 w-5" />}
        badge="Why Impala"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: Hive-on-MapReduce was too slow.</strong> Queries took 5-10 minutes — JVM startup per MapReduce task + shuffle overhead + interpreter execution. Impala's MPP (no MapReduce) + LLVM JIT codegen (native execution) gave 50-100× speedup. <strong className="text-foreground/80">Result:</strong> sub-10-second queries on the same HDFS data, BI dashboards became viable on Hadoop.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: Hive-on-Tez was better but still not sub-second.</strong> Tez replaced MapReduce's stage-by-stage execution with a DAG — faster but still interpreted, still JVM, still had shuffle overhead. Impala's MPP across long-running daemons + native code execution removed all three. <strong className="text-foreground/80">Result:</strong> Impala's 5-10s vs Tez's 30-60s for the same workload.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: No Hadoop-native MPP SQL engine existed.</strong> Teradata, Exadata, Vertica were commercial MPP warehouses — expensive and not designed for HDFS. Impala brought the MPP pattern (shared-nothing, parallel scan, native code) to commodity Hadoop. <strong className="text-foreground/80">Result:</strong> enterprises with Hadoop clusters got BI-tier performance without commercial warehouse licensing.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: Commercial warehouses were too expensive for Hadoop data.</strong> Moving Hadoop data to Teradata/Exadata for analytics was economically non-viable at petabyte scale. Impala runs directly on HDFS — no data movement, no commercial licensing. <strong className="text-foreground/80">Result:</strong> the on-prem Hadoop + Impala pattern remains economically attractive for cost-conscious enterprises with existing Hadoop clusters.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique Impala features (vs Hive + Presto + Spark SQL)"
        description="Impala has four features that are genuinely unique among Hadoop SQL engines."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. LLVM JIT codegen</p>
            <p className="text-muted-foreground">Each query plan fragment is JIT-compiled to native code at runtime — 2-3× faster than interpreter. <strong>Hive, Presto, and Spark SQL all use interpreters.</strong> Impala is the only Hadoop SQL engine with LLVM JIT.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Kudu integration</p>
            <p className="text-muted-foreground">Native Kudu support — fast scans + upserts on the same HDFS cluster. <strong>HDFS Parquet cannot do upserts; Hive/Presto/Spark SQL have no Kudu equivalent.</strong> Critical for customer-profile + dimension tables.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Long-running daemons</p>
            <p className="text-muted-foreground">Impala daemons are long-running (not per-query JVM like MapReduce) — no JVM startup overhead per query. <strong>Hive-on-MapReduce starts a JVM per task; Tez has container startup; Spark has executor startup.</strong> Impala is instant.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. HDFS data locality</p>
            <p className="text-muted-foreground">Impala daemons are co-located with HDFS DataNodes — local-block scan, no remote reads for hot data. <strong>Presto and Spark SQL have similar data locality, but Impala was designed ground-up for HDFS.</strong></p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples cards */}
      <SectionCard
        title="3 large-dataset examples — cards with 5-language code popups"
        description="Three production-style dataset examples showing Impala in action. Each is a clickable card opening a lazy popup with: scenario brief (dataset/scale/why), dataset stats grid, computational tooling, multi-language code in Scala + Rust + Go + Elixir + Zig, and an implementation insight. All scenarios use synthetic on-prem Hadoop-scale data."
        icon={<Database className="h-5 w-5" />}
        badge="3 examples × 5 langs"
      >
        <DatasetCards
          examples={IMPALA_EXAMPLES}
          intro="Three synthetic on-prem Hadoop scenarios: (1) 100TB Cloudera CDW with MPP+LLVM codegen, (2) Kudu+Impala for fast scans + upserts on 1B customer rows, (3) 10TB log analytics as an alternative to Splunk. Each card has Scala/Rust/Go/Elixir/Zig code highlighting Impala's unique LLVM JIT + Kudu integration differentiators."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the Impala ecosystem"
        description="Impala's ecosystem is Cloudera-CDW-centric — the on-prem Hadoop stack with HDFS + Kudu storage + Hive Metastore for table metadata. Cloudera Manager is the operational layer."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Compute components</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Impala daemons (impalad)</strong> — co-located with DataNodes, MPP execution + LLVM JIT</li>
              <li>• <strong>Impala Coordinator</strong> — receives SQL, generates distributed plan, merges results</li>
              <li>• <strong>Statestore</strong> — cluster metadata + health monitoring</li>
              <li>• <strong>Catalog Service</strong> — propagates metadata changes to all daemons</li>
              <li>• <strong>Cloudera CDW</strong> — commercial distribution + management</li>
              <li>• <strong>Cloudera Manager</strong> — operational UI + monitoring + admission control</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cloud className="h-3.5 w-3.5 text-primary" /> Storage + tooling</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>HDFS</strong> — primary storage (Parquet, ORC, Avro, text)</li>
              <li>• <strong>Apache Kudu</strong> — columnar + upsertable (unique to Cloudera)</li>
              <li>• <strong>HBase</strong> — key-value storage (limited Impala support)</li>
              <li>• <strong>Hive Metastore</strong> — table metadata + schema</li>
              <li>• <strong>Object storage</strong> — S3 / ADLS / GCS (Impala 4.0+)</li>
              <li>• <strong>LLVM JIT codegen</strong> — per-fragment native code compilation</li>
              <li>• <strong>CBO</strong> — cost-based optimiser with COMPUTE STATS</li>
              <li>• <strong>Admission control</strong> — per-pool memory + concurrency limits</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="The papers + production blog posts that defined Impala + the Hadoop SQL movement. The 2012 Cloudera paper is the academic foundation; the 2015 case study documents the LLVM codegen decision; the Apache Impala spec covers Kudu integration."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Cloudera 2012: "Impala: A Modern, Open-Source SQL Engine for HDFS":</strong> The origin paper by Marcel Kornacker et al. Described the MPP architecture (long-running daemons co-located with DataNodes, no MapReduce), the LLVM JIT codegen decision (compile per-fragment at runtime for native speed), and the rationale: Hive-on-MapReduce was 50-100× too slow for BI workloads. The paper is the academic foundation for Hadoop-era MPP SQL.
          </p>
          <p>
            <strong className="text-foreground/80">Cloudera 2015: "Impala: A Case Study for MPP SQL on Hadoop":</strong> Production case study covering 3 years of deployment at scale. Documents the LLVM codegen decision (originally chosen over Tungsten-style vectorised execution; both have trade-offs), the Kudu integration (Kudu was designed ground-up as the storage layer for Impala upserts), and the operational practices (admission control, COMPUTE STATS cadence, query profile tuning).
          </p>
          <p>
            <strong className="text-foreground/80">Apache Impala Spec (2017):</strong> The Apache top-level spec (graduated from incubator 2017) documents the LLVM codegen pipeline (per-fragment IR → machine code), the Kudu integration APIs (MERGE INTO with tablet-aware routing), the CBO (join order based on table statistics), and the admission control (per-pool memory + concurrency). The spec is the reference for Hadoop-era MPP SQL.
          </p>
          <p>
            <strong className="text-foreground/80">Cloudera Customer Case Studies (2015-2022):</strong> Numerous case studies of Cloudera CDW + Impala in production: financial services (JPMorgan, Citi), telecom (Verizon), healthcare (Mayo Clinic), government (NSA, DOD). The pattern: on-prem Hadoop clusters with PB-scale data + Impala for BI dashboards + Kudu for customer-profile + dimension tables. These deployments remain active — on-prem Hadoop is sticky.
          </p>
          <p>
            <strong className="text-foreground/80">A Comparison of Hadoop SQL Engines (2018 ACM):</strong> Academic comparison of Impala, Hive-on-Tez, Spark SQL, and Presto on the same Hadoop cluster. Impala wins on latency (5-10s vs 30s-3min) but loses on resource efficiency (long-running daemons hold memory even when idle). The trade-off: Impala for low-latency BI, Hive-on-Tez for batch ETL, Spark SQL for Spark-ecosystem analytics, Presto for federated SQL.
          </p>
          <p>
            <strong className="text-foreground/80">Apache Kudu Paper (2015):</strong> Todd Lipcon et al. described Kudu as the storage layer that combines columnar scans (Parquet) with upserts (HBase). The unique design: tablet-based Raft replication for upserts + columnar storage for scans. Kudu is unique to Cloudera — the only Hadoop storage that supports both fast scans AND fast upserts. Impala is the primary SQL layer; Kudu + Impala is the production pattern.
          </p>
        </div>
      </SectionCard>

      {/* Deeper-thought insight */}
      <SectionCard
        title="My deeper thought: Impala IS the MPP pattern applied to Hadoop — the same pattern as Teradata/Exadata on commodity hardware"
        description="The unifying view: Impala's MPP + LLVM JIT is structurally identical to the commercial MPP warehouses (Teradata, Exadata, Vertica) — but applied to commodity Hadoop clusters instead of proprietary hardware."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Impala IS Teradata on commodity hardware.</strong> The MPP (massively parallel processing) pattern is the same: shared-nothing cluster, parallel scan across local storage, native code execution, distributed aggregation with coordinator merge. Teradata/Exadata ran on proprietary hardware with custom interconnects; Impala runs on commodity Hadoop with HDFS + Ethernet. The economics differ by 10-100×, but the architecture is structurally identical. The deeper insight: MPP was never about hardware — it was about a query execution pattern. Impala made the pattern available on commodity clusters.
          </p>
          <p>
            <strong className="text-foreground/80">LLVM JIT codegen IS the same pattern as JVM JIT — applied to SQL.</strong> The HotSpot JVM has done JIT compilation since 1999 — interpreted first, hot methods compiled to native. Impala applies the same pattern to SQL: each query plan is a program; LLVM JIT compiles it to native at runtime. The deeper insight: query plans are programs; treating them as such (compile, not interpret) is structurally faster. The trade-off is the one-time codegen cost (~50ms per plan) amortised over a multi-second query. This is why Hive-on-MapReduce (interpreted) was 50-100× slower than Impala (JIT-compiled) on the same data.
          </p>
          <p>
            <strong className="text-foreground/80">Kudu IS the storage layer that HDFS Parquet always needed.</strong> HDFS Parquet is columnar + immutable — perfect for batch scans, broken for upserts. Kudu (Cloudera, 2015) is the structural fix: columnar for scans + tablet-based Raft replication for upserts. The deeper insight: Hadoop needed a storage layer that combined the two patterns. Kudu's design was unique at the time — Iceberg, Delta, and Hudi added upserts later via metadata layers, but Kudu was the first to combine them at the storage level. Impala is the SQL layer that exposes both.
          </p>
          <p>
            <strong className="text-foreground/80">Impala IS the trade-off of on-prem vs cloud.</strong> Impala's relevance in 2024 is the on-prem Hadoop market — enterprises that already have PB-scale HDFS data and don't want to move it to cloud warehouses. The trade-off: Impala is technically inferior to modern lakehouse engines (Trino, StarRocks, DuckDB) which run on object storage + open formats. But Impala remains the cheapest option for on-prem Hadoop + Kudu stacks where the data is already there. The deeper insight: technology adoption is path-dependent — once an enterprise has invested in Hadoop + Kudu, the switching cost to lakehouse exceeds the technical advantage. Impala will remain relevant until those Hadoop clusters are decommissioned, which may take another decade.
          </p>
        </div>
      </SectionCard>

      <DeeperThoughtSection pageTitle="Apache Impala">
        <DeeperThought title="Apache Impala IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about Apache Impala is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. Apache Impala connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where Apache Impala sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (Apache Impala) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
        { id: "pinot" as const, reason: "Real-time OLAP — Impala is the Hadoop-era equivalent" },
        { id: "starrocks" as const, reason: "Modern lakehouse query — successor to Impala's BI role" },
        { id: "iceberg" as const, reason: "Open table format — Impala's modern lakehouse path" },
        { id: "modern-big-data" as const, reason: "Hadoop vs cloud-native SQL landscape" },
        { id: "databricks" as const, reason: "Spark SQL as Impala's Hadoop SQL competitor" },
        { id: "hudi" as const, reason: "Apache Hudi — upsert specialist on HDFS (similar to Kudu role)" },
      ]} />
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "Trace this topic's connections across the platform's math graph" }, { id: "pinot" as const, reason: "Real-time OLAP — Impala is the Hadoop-era equivalent" }, { id: "starrocks" as const, reason: "Modern lakehouse query — successor to Impala's BI role" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("pinot")} className="text-sm text-primary hover:underline">
          &rarr; Apache Pinot (real-time OLAP)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("starrocks")} className="text-sm text-primary hover:underline">
          &rarr; StarRocks (modern lakehouse query)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("iceberg")} className="text-sm text-primary hover:underline">
          &rarr; Apache Iceberg (open table format)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("modern-big-data")} className="text-sm text-primary hover:underline">
          &rarr; Modern Big Data (Hadoop vs cloud landscape)
        </Link>
      </div>
    </div>
  );
}
