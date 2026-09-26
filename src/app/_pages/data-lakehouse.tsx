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
import { LAKEHOUSE_EXAMPLES } from "../_components/_dataset_examples3";
import { LAKEHOUSE_SCIENCE_EXAMPLES } from "../_components/_dataset_examples8";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Boxes, Layers, Database, Atom, Zap, Activity,
  FileText, TrendingUp, Sparkles, Cpu, ShieldCheck, Network, History,
  Server, Cloud,
} from "lucide-react";

// ============================================================
// Code snippets
// ============================================================

const EVOLUTION_SQL = `-- ============================================================
-- The data lake → lakehouse evolution in SQL (4 eras)
-- ============================================================

-- ERA 1 (2006-2014): Hadoop + Hive on HDFS
--   - Storage: HDFS (replicated blocks on commodity disks)
--   - Catalog: Hive Metastore (MySQL-backed)
--   - Compute: MapReduce → Tez → Spark
--   - Format: text/CSV/Parquet-on-HDFS
--   - Problem: HDFS is expensive (3x replication), schema is loose,
--              partition pruning is path-based (fragile)
CREATE EXTERNAL TABLE IF NOT EXISTS hive.orders (
  order_id BIGINT, customer_id BIGINT, order_ts STRING, amount DECIMAL(18,4)
)
PARTITIONED BY (dt STRING)  -- path-based: /user/hive/warehouse/orders/dt=2024-09-01/
ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
STORED AS TEXTFILE;
-- To query partition, MUST write: WHERE dt='2024-09-01' (exact match)
-- No time travel. No schema evolution. No ACID. No MERGE.

-- ERA 2 (2014-2020): S3 + Hive-on-S3 (cloud-native shift)
--   - Storage: S3 (object storage, 11 9s durability, $0.023/GB-month)
--   - Catalog: Hive Metastore (same, AWS Glue Catalog managed)
--   - Compute: Spark / EMR / Athena
--   - Format: Parquet on S3
--   - Problem: S3 is not POSIX (no rename atomicity), partition paths still path-based
CREATE EXTERNAL TABLE IF NOT EXISTS glue.orders (
  order_id BIGINT, customer_id BIGINT, order_ts TIMESTAMP, amount DECIMAL(18,4)
)
PARTITIONED BY (dt STRING)
STORED AS PARQUET
LOCATION 's3://moderndatascieng-bronze/orders/';
-- Still no ACID, no time travel, no schema evolution.
-- But: S3 is 10x cheaper than HDFS, AWS managed.

-- ERA 3 (2017-2024): Open table formats — Iceberg/Delta/Hudi
--   - Storage: S3 + open table format (Iceberg/Delta/Hudi)
--   - Catalog: REST/Glue/Nessie/Unity (Hive-compatible)
--   - Compute: Spark/Trino/Flink/DuckDB/Snowflake (vendor-neutral)
--   - Format: Parquet + manifest tree / transaction log
--   - ACID, time travel, schema evolution, hidden partitioning
CREATE TABLE iceberg.orders (
  order_id BIGINT, customer_id BIGINT, order_ts TIMESTAMP, amount DECIMAL(18,4)
) USING iceberg
PARTITIONED BY (days(order_ts))  -- HIDDEN partitioning — no WHERE clause match needed
TBLPROPERTIES ('format-version' = '2');
SELECT * FROM iceberg.orders VERSION AS OF 42;  -- time travel
ALTER TABLE iceberg.orders ADD COLUMN ship_country STRING;  -- schema evolution, no rewrite

-- ERA 4 (2024+): The lakehouse-as-platform convergence
--   - Catalogs: Glue (AWS) / Unity (Databricks) / Polaris (Snowflake, Apache)
--   - All formats converging on feature parity
--   - Compute engines interchangeable (Spark, Trino, Flink, DuckDB, Snowflake, Athena)
--   - Catalog is the new control plane
`;

const MEDALLION_PYODIDE = `# ============================================================
# Lakehouse Medallion Architecture — Bronze / Silver / Gold
# A pure-Python simulation of the three-tier data flow.
# ============================================================

import random
import json
from datetime import datetime, timedelta

class S3Layer:
    """A logical S3 prefix — Bronze/Silver/Gold."""
    def __init__(self, name, prefix, format_type, validation_rules=None):
        self.name = name
        self.prefix = prefix
        self.format = format_type
        self.validation_rules = validation_rules or []
        self.tables = {}  # table_name → rows
        self.processed_count = 0
        self.failed_count = 0
        self.last_run_ts = None

    def write(self, table_name, rows):
        """Write to this layer with validation."""
        self.processed_count += len(rows)
        failed = []
        for rule_name, rule_fn in self.validation_rules:
            for row in rows:
                if not rule_fn(row):
                    failed.append((rule_name, row))
                    self.failed_count += 1
        if failed:
            print(f"  [{self.name}] {len(failed)} rows failed validation (rules: {set(r[0] for r in failed)})")
            # Send to DLQ (dead-letter queue) — Silver/Gold pattern
            rows = [r for r in rows if all(rule_fn(r) for _, rule_fn in self.validation_rules)]
        if table_name not in self.tables:
            self.tables[table_name] = []
        self.tables[table_name].extend(rows)
        self.last_run_ts = datetime.now()
        return len(rows)

    def read(self, table_name):
        return self.tables.get(table_name, [])

# --- Build the medallion architecture ---
bronze = S3Layer(
    name='Bronze',
    prefix='s3://moderndatascieng-bronze/',
    format_type='raw JSON / CSV / CDC events',
    validation_rules=[]  # Bronze is raw — no validation
)
silver = S3Layer(
    name='Silver',
    prefix='s3://moderndatascieng-silver/',
    format_type='Iceberg / Delta tables (cleansed + deduplicated)',
    validation_rules=[
        ('not_null_order_id', lambda r: r.get('order_id') is not None),
        ('amount_positive',   lambda r: r.get('amount', 0) > 0),
        ('currency_valid',    lambda r: r.get('currency') in ['USD', 'EUR', 'GBP']),
    ]
)
gold = S3Layer(
    name='Gold',
    prefix='s3://moderndatascieng-gold/',
    format_type='Aggregated business-ready tables (Star schema)',
    validation_rules=[
        ('customer_id_not_null', lambda r: r.get('customer_id') is not None),
        ('aggregation_check',    lambda r: r.get('total_orders', 0) > 0),
    ]
)

# --- Generate synthetic source data (raw CDC events) ---
random.seed(42)
currencies = ['USD', 'EUR', 'GBP', 'JPY']  # JPY is invalid — tests Silver validation
n_source = 100
source_events = []
for i in range(n_source):
    event = {
        'order_id': i + 1 if random.random() > 0.05 else None,  # 5% null (DLQ test)
        'customer_id': random.randint(1, 50) if random.random() > 0.1 else None,
        'order_ts': datetime(2024, 9, 1, 8, 0) + timedelta(minutes=i * 15),
        'amount': round(random.uniform(10, 500), 2) if random.random() > 0.05 else -1,
        'currency': random.choice(currencies),
        'op': random.choice(['INSERT', 'UPDATE', 'DELETE']),
    }
    source_events.append(event)

print("=== Bronze Layer (raw ingestion — no validation) ===")
print(f"  Source: {len(source_events)} synthetic CDC events from MySQL Debezium")
print(f"  Format: raw JSON on S3 (s3://bronze/orders/dt=2024-09-01/raw-001.json)")
bronze.write('orders_raw', source_events)
print(f"  Bronze tables: {list(bronze.tables.keys())}")
print(f"  Bronze rows: {sum(len(r) for r in bronze.tables.values())}")
print()

print("=== Bronze → Silver (transform + validate + deduplicate) ===")
print("  Actions: parse JSON, normalise currency, deduplicate by order_id, apply validation rules")
# Bronze → Silver transform
silver_rows = []
seen_order_ids = set()
for event in bronze.read('orders_raw'):
    # Deduplicate
    oid = event['order_id']
    if oid is None:
        silver_rows.append(event)  # send to DLQ via Silver validation
        continue
    if oid in seen_order_ids:
        continue  # dedupe
    seen_order_ids.add(oid)
    # Normalise: USD amount (skip FX for simplicity)
    fx = {'USD': 1.0, 'EUR': 1.09, 'GBP': 1.27, 'JPY': 0.0067}
    row = {**event, 'amount_usd': round(event['amount'] * fx.get(event['currency'], 1.0), 2)}
    silver_rows.append(row)
silver.write('orders_silver', silver_rows)
print(f"  Silver tables: {list(silver.tables.keys())}")
print(f"  Silver rows (passed validation): {sum(len(r) for r in silver.tables.values())}")
print(f"  Validation: {silver.failed_count} rows sent to DLQ (dead-letter queue)")
print()

print("=== Silver → Gold (aggregate + business-ready star schema) ===")
print("  Actions: aggregate by customer_id, compute total_orders + total_amount_usd")
# Silver → Gold aggregation
customer_agg = {}
for row in silver.read('orders_silver'):
    cid = row['customer_id']
    if cid is None:
        continue
    if cid not in customer_agg:
        customer_agg[cid] = {'customer_id': cid, 'total_orders': 0, 'total_amount_usd': 0.0, 'n_currencies': set()}
    customer_agg[cid]['total_orders'] += 1
    customer_agg[cid]['total_amount_usd'] += row.get('amount_usd', 0)
    customer_agg[cid]['n_currencies'].add(row['currency'])
gold_rows = []
for agg in customer_agg.values():
    agg['n_currencies'] = len(agg['n_currencies'])
    gold_rows.append(agg)
gold.write('dim_customer_agg', gold_rows)
print(f"  Gold tables: {list(gold.tables.keys())}")
print(f"  Gold rows: {sum(len(r) for r in gold.tables.values())}")
print()

print("=== Final Gold layer — business-ready analytics tables ===")
for table_name, rows in gold.tables.items():
    print(f"  Table: {table_name} ({len(rows)} rows)")
    for r in rows[:3]:
        print(f"    {r}")
    if len(rows) > 3:
        print(f"    ... ({len(rows) - 3} more)")
print()
print("Key insight: Medallion is the production pattern for lakehouse ETL.")
print("Bronze = raw (no validation, schema-on-read).")
print("Silver = cleansed + deduplicated + validated (schema-on-write, Iceberg/Delta).")
print("Gold = aggregated business-ready (star schema, BI-ready).")`;

// ============================================================
// Evolution timeline diagram
// ============================================================

function EvolutionTimelineDiagram() {
  const eras = [
    {
      year: "2006-2014",
      name: "Hadoop + Hive on HDFS",
      tech: ["HDFS", "Hive Metastore", "MapReduce", "Parquet-on-HDFS"],
      problems: ["3x replication cost", "Path-based partitions (fragile)", "No ACID", "Schema drift"],
      color: "var(--chart-3)",
    },
    {
      year: "2014-2020",
      name: "S3 + Hive-on-S3 (cloud-native shift)",
      tech: ["S3", "Glue Catalog", "Spark/EMR/Athena", "Parquet on S3"],
      problems: ["S3 not POSIX (no rename atomicity)", "Path-based partitions still", "No ACID", "Schema drift still"],
      color: "var(--chart-2)",
    },
    {
      year: "2017-2024",
      name: "Open table formats — Iceberg/Delta/Hudi",
      tech: ["S3 + Iceberg/Delta/Hudi", "REST/Glue/Nessie/Unity catalogs", "Spark/Trino/Flink/DuckDB/Snowflake", "Parquet + manifest/log"],
      problems: ["Solved: ACID ✓", "Solved: hidden partitioning ✓", "Solved: schema evolution ✓", "Solved: time travel ✓"],
      color: "var(--chart-1)",
    },
    {
      year: "2024+",
      name: "Lakehouse-as-platform convergence",
      tech: ["Catalogs: Glue/Unity/Polaris", "All formats feature-parity", "Compute engines interchangeable", "Catalog is control plane"],
      problems: ["Catalog battle (open vs closed)", "Liquid Clustering vs Z-Order vs Sort Order", "Streaming + batch convergence"],
      color: "var(--chart-4)",
    },
  ];
  const [activeEra, setActiveEra] = useState<number | null>(2);
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <History className="h-3.5 w-3.5 text-primary" />
          Data lake → lakehouse evolution timeline (2006 → 2024+)
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 420 200" className="w-full h-auto">
          {/* Timeline */}
          <line x1="20" y1="100" x2="400" y2="100" stroke="var(--border)" strokeWidth="2" />
          {eras.map((era, i) => {
            const x = 50 + i * 90;
            const isActive = activeEra === i;
            return (
              <motion.g key={i}
                onMouseEnter={() => setActiveEra(i)}
                onMouseLeave={() => setActiveEra(null)}
                animate={{ scale: isActive ? 1.05 : 1 }}
                style={{ cursor: "pointer" }}
              >
                {/* Marker */}
                <circle cx={x} cy="100" r={isActive ? 8 : 5}
                  fill={era.color} stroke="var(--background)" strokeWidth="2" />
                {/* Year label */}
                <text x={x} y={isActive ? 80 : 88} textAnchor="middle" fontSize="8"
                  fill={isActive ? era.color : "var(--muted-foreground)"}
                  fontWeight={isActive ? "bold" : "normal"}>
                  {era.year}
                </text>
                {/* Era name */}
                <text x={x} y={isActive ? 125 : 120} textAnchor="middle" fontSize="7"
                  fill={isActive ? era.color : "var(--foreground)"}>
                  {era.name.length > 30 ? era.name.substring(0, 28) + "..." : era.name}
                </text>
              </motion.g>
            );
          })}
        </svg>
        {activeEra !== null && (
          <div className="mt-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs space-y-2">
            <p className="font-semibold" style={{ color: eras[activeEra].color }}>
              {eras[activeEra].year}: {eras[activeEra].name}
            </p>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Stack</p>
              <p className="text-muted-foreground">{eras[activeEra].tech.join(" · ")}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Status</p>
              <p className="text-muted-foreground">{eras[activeEra].problems.join(" · ")}</p>
            </div>
          </div>
        )}
        {activeEra === null && (
          <p className="mt-2 text-[10px] text-muted-foreground text-center">
            Hover any era — the timeline shows 4 generations, each fixing the previous era's pain.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Medallion diagram
// ============================================================

function MedallionDiagram() {
  const layers = [
    { name: "Bronze", color: "var(--chart-3)", desc: "Raw ingestion — schema-on-read, no validation, append-only", format: "JSON/CSV/CDC" },
    { name: "Silver", color: "var(--muted-foreground)", desc: "Cleansed + deduplicated + validated — schema-on-write, Iceberg/Delta tables", format: "Iceberg/Delta" },
    { name: "Gold", color: "var(--chart-1)", desc: "Aggregated business-ready — star schema, BI-ready, reverse-ETL source", format: "Aggregated tables" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-primary" />
          Medallion architecture — Bronze → Silver → Gold
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 420 200" className="w-full h-auto">
          {/* Three medal-style circles + arrows */}
          {layers.map((layer, i) => {
            const x = 60 + i * 130;
            return (
              <g key={i}>
                {/* Medal outer ring */}
                <circle cx={x} cy="100" r="40"
                  fill={layer.color + "20"} stroke={layer.color} strokeWidth="2" />
                <text x={x} y="98" textAnchor="middle" fontSize="11"
                  fill={layer.color} fontWeight="bold">
                  {layer.name}
                </text>
                <text x={x} y="113" textAnchor="middle" fontSize="7"
                  fill={layer.color} opacity="0.7">
                  {layer.format}
                </text>
                {i < layers.length - 1 && (
                  <g>
                    <line x1={x + 42} y1="100" x2={x + 88} y2="100"
                      stroke="var(--border)" strokeWidth="1.5"
                      markerEnd="url(#medal-arrow)" />
                    <text x={x + 65} y="92" textAnchor="middle" fontSize="7"
                      fill="var(--muted-foreground)">transform</text>
                  </g>
                )}
              </g>
            );
          })}
          {/* Descriptions below */}
          {layers.map((layer, i) => {
            const x = 60 + i * 130;
            const lines = layer.desc.length > 35
              ? [layer.desc.substring(0, 33), layer.desc.substring(33)]
              : [layer.desc];
            return (
              <g key={`desc-${i}`}>
                {lines.map((line, j) => (
                  <text key={j} x={x} y={150 + j * 10} textAnchor="middle" fontSize="7"
                    fill="var(--muted-foreground)">{line}</text>
                ))}
              </g>
            );
          })}
          <defs>
            <marker id="medal-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="var(--muted-foreground)" opacity="0.5" />
            </marker>
          </defs>
        </svg>
      </div>
      <div className="px-3 py-2 bg-muted/30 border-t border-border/60">
        <p className="text-[10px] text-muted-foreground">
          Bronze = raw ingestion (no validation, schema-on-read).
          Silver = cleansed + deduplicated + validated (schema-on-write, Iceberg/Delta).
          Gold = aggregated business-ready (star schema, BI-ready, reverse-ETL source for CRM/ads/email).
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Main page component
// ============================================================

const KPIS = [
  { label: "Era started", value: "2017 (Iceberg + Delta)", hint: "Open table formats launched: Hudi (Uber 2016), Iceberg (Netflix 2017), Delta (Databricks 2017)", deltaTone: "up" as const },
  { label: "Academic foundation", value: "Armbrust 2020 (CIDR)", hint: "'Lakehouse: A New Generation of Open Platforms' — the paper that named the category", deltaTone: "flat" as const },
  { label: "Open formats", value: "3 (Iceberg, Delta, Hudi)", hint: "All open-source (Apache), converging on feature parity; choice driven by ecosystem fit", deltaTone: "flat" as const },
  { label: "Production scale", value: "EB-scale, 100s of enterprises", hint: "Netflix, Apple, Stripe (Iceberg); Uber, Walmart, ByteDance (Hudi); every Databricks customer (Delta)", deltaTone: "up" as const },
];

export function DataLakehousePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Data Lakehouse · concept anchor · Hadoop → S3 → Iceberg/Delta/Hudi · Armbrust 2020 · medallion"
        title="Data Lakehouse — the unification of data lake + warehouse"
        description="The lakehouse is the architectural pattern that unifies data lakes (cheap S3 storage, open formats, any compute) with data warehouses (ACID transactions, SQL semantics, schema enforcement, time travel). It emerged 2016-2020 across three independent origins — Uber (Hudi, 2016), Netflix (Iceberg, 2017), Databricks (Delta, 2017) — and was named academically by Armbrust et al. 2020 in 'Lakehouse: A New Generation of Open Platforms that Make Data-Pluralism the Norm' (CIDR). The unifying insight: 40-year-old database patterns (write-ahead logs, MVCC, B-trees, LSM-trees) work fine on object storage if you wrap Parquet files with a metadata layer. The three formats are converging on feature parity; the new frontier is the catalog battle (Glue vs Unity vs Polaris vs Nessie). This page is the concept anchor for the entire Data Lakehouse group — Iceberg, Delta, Hudi, Glue, Catalogs all build on this foundation."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Layers className="h-3 w-3" /> Concept anchor</Badge>
            <Badge variant="outline" className="gap-1.5"><History className="h-3 w-3" /> 4-era evolution</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* Evolution timeline */}
      <SectionCard
        title="Evolution timeline — 4 eras from Hadoop (2006) to lakehouse (2024+)"
        description="Four generations of data-lake architecture, each fixing the previous era's pain. Era 1 (Hadoop + Hive on HDFS): replicated blocks, path-based partitions, no ACID. Era 2 (S3 + Hive-on-S3): cloud-native storage, 10x cheaper than HDFS, but still path-based partitions and no ACID. Era 3 (open table formats — Iceberg/Delta/Hudi): ACID, time travel, hidden partitioning, schema evolution. Era 4 (2024+ lakehouse-as-platform): catalog battle (Glue vs Unity vs Polaris), Liquid Clustering, convergence on feature parity."
        icon={<History className="h-5 w-5" />}
        badge="evolution"
      >
        <EvolutionTimelineDiagram />
      </SectionCard>

      {/* SQL evolution */}
      <SectionCard
        title="Evolution in SQL — Hive-on-HDFS → Hive-on-S3 → Iceberg → lakehouse-as-platform"
        description="The same DDL/DML pattern across all four eras shows what each generation added. Era 1 Hive: external table, path-based partitions (s3://bucket/dt=2024-09-01/), no ACID, no time travel. Era 2 Hive-on-S3: same SQL, just S3 location instead of HDFS. Era 3 Iceberg: USING iceberg, days(order_ts) hidden partitioning, VERSION AS OF time travel, ADD COLUMN schema evolution. Era 4: catalog-managed cross-engine reads, the catalog is the control plane."
        icon={<Database className="h-5 w-5" />}
        badge="SQL"
      >
        <CodeBlock code={EVOLUTION_SQL} language="sql" filename="lakehouse_evolution.sql" highlight={[7, 8, 9, 10, 11, 19, 20, 21, 30, 31, 32, 41, 42, 43, 44, 45, 51, 52, 53, 54]} />
      </SectionCard>

      {/* Medallion architecture */}
      <SectionCard
        title="Medallion architecture — Bronze → Silver → Gold"
        description="Databricks coined 'medallion' for the three-tier ETL pattern that production lakehouses follow. Bronze = raw ingestion (no validation, schema-on-read, append-only). Silver = cleansed + deduplicated + validated (schema-on-write, Iceberg/Delta tables, MERGE upserts). Gold = aggregated business-ready (star schema, BI-ready, reverse-ETL source for CRM/ads/email). Each tier is an Iceberg/Delta table; the tiers are connected via Spark/Trino ETL jobs, scheduled via Airflow. The medallion is the production pattern — every Netflix, Apple, Stripe lakehouse follows it."
        icon={<Layers className="h-5 w-5" />}
        badge="medallion"
      >
        <MedallionDiagram />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: simulate Bronze → Silver → Gold in your browser (Pyodide)"
        description="Pure-Python simulation of the medallion ETL pattern. Generate 100 synthetic CDC events (with some null order_ids and negative amounts to test validation), ingest into Bronze (no validation), transform + validate + deduplicate into Silver (failed rows sent to DLQ), aggregate by customer into Gold (business-ready). See the medallion pattern end-to-end."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={MEDALLION_PYODIDE} buttonLabel="Run Medallion simulation (Pyodide)" />
      </SectionCard>

      {/* Why this evolved */}
      <SectionCard
        title="Why the lakehouse evolved — four eras of analytics platforms"
        description="The lakehouse is not a single invention but the convergence of four 5-year eras: Hadoop-on-HDFS (2006-2011), Hive-on-S3 (2012-2016), open table formats (2017-2022), and vendor-neutral catalogs (2023-2024). Each era fixed a structural shortfall of the prior — the lakehouse is the cumulative result."
        icon={<History className="h-5 w-5" />}
        badge="Why Lakehouse"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1 (Hadoop + HDFS, 2006-2011): Storage tied to compute.</strong> HDFS co-located data blocks with compute nodes — to scale storage you scaled compute, and vice versa. Petabyte-scale data on a 50-node HDFS cluster meant 50 nodes of idle compute during quiet hours. <strong className="text-foreground/80">Result:</strong> Object storage (S3, 2006; ADLS, 2015; GCS, 2010) decoupled them — storage is now ~$23/TB/mo flat, compute spins up on demand.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2 (Hive-on-S3, 2012-2016): No ACID, no schema enforcement.</strong> Customers moved Hive tables to S3 to decouple storage from compute — but S3 has no rename, so Hive commits were non-atomic (concurrent writers clobbered each other, schema drift broke readers silently). The lake had warehouse economics but no warehouse semantics. <strong className="text-foreground/80">Result:</strong> Iceberg/Delta/Hudi (2017) added transaction logs + schema-in-metadata, restoring ACID + schema on top of cheap S3.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3 (Open table formats, 2017-2022): No vendor-neutral control plane.</strong> Each format shipped its own catalog — Iceberg used HMS, Delta used Unity, Hudi used HMS. Multi-format, multi-cloud lakehouses required per-vendor integrations. <strong className="text-foreground/80">Result:</strong> Polaris (Snowflake, 2024) + Nessie (Dremio, 2020) + Unity (Databricks, 2021) converged on the Iceberg REST catalog spec — one protocol, multiple vendors, portability wins.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4 (Pre-lakehouse era): Warehouse + lake duplication.</strong> Companies ran a Snowflake/BigQuery warehouse for BI + a Spark-on-S3 lake for ML, duplicating data, schema, and governance across the two. Pipeline drift between warehouse and lake caused reconciliations daily. <strong className="text-foreground/80">Result:</strong> The lakehouse unifies them — one copy of data on S3, governed by one catalog, queried by SQL engines (Trino/Athena) and ML engines (Spark/Ray) on the same files.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique lakehouse features (vs warehouse + lake)"
        description="Four structural advantages of the lakehouse pattern — they make it qualitatively different from running a warehouse and a lake in parallel, not just an incremental improvement."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. Lake + warehouse unification</p>
            <p className="text-muted-foreground">One copy of data on cheap object storage, served by both BI engines (Trino, Snowflake, Athena) and ML engines (Spark, Ray) reading the same Parquet files. <strong>Pre-lakehouse required duplicated ETL into a warehouse + lake, with reconciliation pipelines in between.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Medallion pattern</p>
            <p className="text-muted-foreground">Bronze (raw) → Silver (cleansed) → Gold (curated) layers on the same storage, with one governance layer. <strong>Warehouses have no equivalent of the medallion — they have one curated layer and lose the raw data lineage.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Open-format vendor-neutrality</p>
            <p className="text-muted-foreground">Parquet + Iceberg/Delta/Hudi are Apache-licensed — tables on S3 are readable by any compliant engine. <strong>Snowflake + BigQuery + Redshift internal formats are closed and proprietary.</strong> The lakehouse gives customers exit options.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Catalog-as-control-plane</p>
            <p className="text-muted-foreground">Unity, Polaris, Nessie treat the catalog as the governance plane (RBAC, lineage, audit) above multiple compute engines. <strong>Pre-lakehouse catalogs were just metastores; lakehouse catalogs are the security + governance layer.</strong></p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples cards */}
      <SectionCard
        title="3 large-dataset examples — cards with 5-language code popups"
        description="Three production-style lakehouse scenarios (Bronze→Silver→Gold medallion, multi-engine query, cross-cloud catalog). Each is a clickable card opening a lazy popup with: scenario brief, dataset stats grid, computational tooling, multi-language code in Scala + Rust + Go + Elixir + Zig, and an implementation insight."
        icon={<Database className="h-5 w-5" />}
        badge="3 examples × 5 langs"
      >
        <DatasetCards
          examples={LAKEHOUSE_EXAMPLES}
          intro="Production-style lakehouse scenarios showing the unification pattern: Bronze→Silver→Gold medallion ETL, multi-engine (Trino + Spark + Flink) cross-query, and Polaris/Nessie/Unity cross-cloud catalogs. Each card has Scala/Rust/Go/Elixir/Zig code with lakehouse-specific primitives."
        />
      </SectionCard>

      {/* Scientific lakehouse examples — 6 more cards with science domain data */}
      <SectionCard
        title="Scientific lakehouse — the medallion pattern applied to science (6 examples)"
        description="The lakehouse is the starting point of everything — the medallion Bronze→Silver→Gold pattern applies universally beyond business data. These 6 examples show the pattern in action across life sciences (genomics, clinical trials, single-cell), environmental sensors, particle physics (CERN LHC), and pure mathematics (OEIS). Each demonstrates how Iceberg's hidden partitioning + time travel + schema evolution solve domain-specific big-data problems at petabyte scale."
        icon={<Atom className="h-5 w-5" />}
        badge="6 science examples × 5 langs"
      >
        <DatasetCards
          examples={LAKEHOUSE_SCIENCE_EXAMPLES}
          intro="Life sciences (1000 Genomes 100TB, FDA FAERS 15M reports, Single-cell 50TB) + Sensors (EPA AirNow 10TB) + Physics (CERN LHC 1PB) + Mathematics (OEIS 370k sequences). Each card has Scala/Rust/Go/Elixir/Zig code showing the Bronze→Silver→Gold medallion pipeline for that scientific domain."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the lakehouse ecosystem"
        description="The lakehouse is the union of three ecosystems: open table formats (Iceberg/Delta/Hudi), 8+ compute engines, and 5+ catalogs. No single vendor owns it — Databricks, Snowflake, AWS, Apache, and Dremio each ship pieces."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Compute engines (8+)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Apache Spark 3.5+</strong> — primary write engine across all 3 formats</li>
              <li>• <strong>Trino 425+</strong> — federated SQL reads (fastest lakehouse BI engine)</li>
              <li>• <strong>Apache Flink 1.18+</strong> — streaming CDC ingestion (Iceberg/Delta/Hudi)</li>
              <li>• <strong>DuckDB 0.10+</strong> — laptop-scale analytics on Iceberg + Delta</li>
              <li>• <strong>Apache Iceberg engines</strong> — Spark, Trino, Flink, DuckDB, Athena, Snowflake, Impala, BeeHyve (8+)</li>
              <li>• <strong>Databricks Photon</strong> — C++ rewrite of Spark, 4× faster on Delta</li>
              <li>• <strong>Snowflake (external tables)</strong> — Iceberg + Delta federation</li>
              <li>• <strong>Amazon Athena + Redshift</strong> — serverless reads via Glue Catalog</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cloud className="h-3.5 w-3.5 text-primary" /> Catalogs + formats (5)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Apache Iceberg</strong> — Netflix origin, vendor-neutral catalogs, hidden partitioning</li>
              <li>• <strong>Delta Lake</strong> — Databricks origin, Liquid Clustering, CDF, delta-rs</li>
              <li>• <strong>Apache Hudi</strong> — Uber origin, MOR LSM-tree, native CDC ingestion</li>
              <li>• <strong>Databricks Unity Catalog</strong> — Delta-native, column RBAC, lineage</li>
              <li>• <strong>Snowflake Polaris (2024)</strong> — Apache-licensed REST catalog, multi-cloud</li>
              <li>• <strong>Project Nessie (Dremio)</strong> — Git-for-data branching on Iceberg</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + the three independent origins"
        description="The lakehouse emerged independently at three companies in 2016-2017. The Armbrust 2020 paper named the category; the engineering blogs document the production pain that drove each format's design."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Armbrust et al. 2020 (CIDR):</strong> "Lakehouse: A New Generation of Open Platforms that Make Data-Pluralism the Norm." The foundational academic paper, written by Databricks founders (Michael Armbrust, Reynold Xin, Matei Zaharia et al.). Argued that the data lake + warehouse split was a historical accident — open table formats could give lakes the ACID + SQL + schema semantics of warehouses, while keeping cheap S3 storage. Named the category 'lakehouse' and is the academic reference for the entire movement. Validated empirically by Databricks customers migrating from warehouse-only (Snowflake) to lakehouse (Databricks + Delta).
          </p>
          <p>
            <strong className="text-foreground/80">Apache Hudi origin (Uber 2016):</strong> Vinoth Chandar et al. built Hudi internally at Uber to sync MySQL trip data to S3 for analytics. The pain: every CDC update required rewriting the entire Hive partition — too slow for petabyte-scale trip data. Hudi's UPSERT-first design (COW + MOR table types) solved this. Open-sourced 2016, joined Apache Foundation 2019. Hudi's distinctive contribution: the LSM-tree-on-S3 pattern (MOR tables with delta log files + async compaction).
          </p>
          <p>
            <strong className="text-foreground/80">Apache Iceberg origin (Netflix 2017):</strong> Ryan Blue et al. built Iceberg internally at Netflix to handle petabytes of page-view + engagement data on Hive. The pain: Hive's path-based partitions required exact WHERE clause match, schema evolution broke downstream queries, time travel required snapshot IDs in user code. Iceberg's distinctive contribution: hidden partitioning (partition transform stored in metadata, not in path) + the manifest tree (metadata.json → snapshot → manifest list → manifests → Parquet data files).
          </p>
          <p>
            <strong className="text-foreground/80">Delta Lake origin (Databricks 2017):</strong> Databricks built Delta internally (codename TACHYON) to fix Hive-on-S3 pain for their customers. The pain: no ACID, slow MERGE, schema evolution broke queries. Delta's distinctive contribution: the JSON transaction log (_delta_log/) with periodic Parquet checkpoints — structurally a PostgreSQL WAL. Open-sourced 2019, joined Apache Foundation 2023 (still incubating). Most widely-deployed because every Databricks customer uses it by default.
          </p>
          <p>
            <strong className="text-foreground/80">Trino / Presto origin (Facebook 2012):</strong> Facebook built Presto to query Hive-on-S3 federated across multiple data sources. Martin Traverso et al. forked to Trino in 2020 over governance disagreements. Trino is the gold-standard federated SQL engine — treats Iceberg/Delta/Hudi tables as first-class, can JOIN across catalogs (Iceberg on S3 + MySQL + Kafka in one query). Production at Netflix, LinkedIn, Uber.
          </p>
          <p>
            <strong className="text-foreground/80">Convergence 2024+:</strong> All three formats now support UPSERT, schema evolution, time travel, compaction, hidden partitioning (or its equivalent). Differentiators narrowing. The new battlefronts: catalogs (Glue vs Unity vs Polaris vs Nessie), clustering algorithms (Liquid Clustering vs Iceberg Sort Order vs Hudi Clustering Keys), and streaming-batch convergence (Flink + Iceberg + Hudi blurring the boundary).
          </p>
        </div>
      </SectionCard>

      {/* Insight */}
      <SectionCard
        title="My deeper thought: lakehouse IS the application of 40-year-old database patterns to object storage"
        description="The unifying view: every lakehouse 'innovation' is the recognition that database patterns (WAL, MVCC, B-trees, LSM-trees, logical replication) work on object storage if you wrap Parquet files with a metadata layer. The metadata layer is the innovation; the Parquet files are unchanged."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Lakehouse IS the application of 40-year-old database patterns to object storage.</strong> Write-ahead logs (PostgreSQL 1989), MVCC (PostgreSQL 1985), B-trees (Bayer-McCreight 1972), LSM-trees (O'Neil 1996), logical replication (PostgreSQL v10 2017) — all of these patterns predate the data lakehouse movement by decades. The lakehouse 'innovation' is not inventing these patterns; it's recognising that they work on object storage (S3/ADLS/GCS) if you wrap the immutable Parquet files with a metadata layer. Iceberg's manifest tree = WAL. Delta's _delta_log/ = WAL. Hudi's .hoodie/ timeline = WAL. All three are the same idea — apply the WAL pattern to a lake of Parquet files.
          </p>
          <p>
            <strong className="text-foreground/80">Medallion IS the layered storage hierarchy.</strong> Bronze (raw, schema-on-read) → Silver (cleansed, schema-on-write) → Gold (aggregated, business-ready) maps exactly to the classical data warehouse tiers: staging → integration → mart. The medallion is just the new name for the same three-tier pattern, applied to object storage. The innovation is that all three tiers are open Iceberg/Delta tables (interchangeable across compute engines), vs the warehouse-era where each tier was a vendor-specific table format. Open formats make the medallion portable.
          </p>
          <p>
            <strong className="text-foreground/80">Three formats converged because they all rediscovered the WAL.</strong> Uber, Netflix, and Databricks independently invented Hudi, Iceberg, and Delta in 2016-2017. All three rediscovered the same pattern: append-only log of commits + immutable Parquet files + periodic compaction. They could not have copied each other — they were built simultaneously at different companies. The convergence on the WAL pattern is evidence that the pattern is the natural solution to the problem (ACID on object storage), not a coincidence. The three formats differ in details (Hudi's LSM-tree focus vs Iceberg's hidden partitioning vs Delta's Databricks integration), but the structural pattern is identical.
          </p>
          <p>
            <strong className="text-foreground/80">Catalog battle IS the new frontier because the format battle is largely won.</strong> The format battle (Iceberg vs Delta vs Hudi) is mostly decided: Iceberg wins outside Databricks/Snowflake, Delta wins inside Databricks, Hudi wins for CDC-heavy workloads. The catalog battle (Glue vs Unity vs Polaris vs Nessie) is the new frontier because the catalog is the control plane — it governs access, lineage, audit, branching. Snowflake made Polaris open-source (2024) specifically to win this battle; the bet is that the catalog becomes the new 'database' — managed, centralised, multi-tenant, with compute engines as interchangeable clients. Whoever wins the catalog wins the next decade of lakehouse platform revenue.
          </p>
          <p>
            <strong className="text-foreground/80">The lakehouse IS the death of the warehouse-vs-lake split.</strong> The 2010s debate (warehouse for structured analytics vs lake for raw data) is over. The lakehouse won. Pure warehouses (Snowflake, BigQuery, Redshift) are pivoting to support Iceberg natively — Snowflake Polaris, BigQuery Iceberg, Redshift Spectrum all read external Iceberg tables. Pure lakes (Hadoop-on-S3) are adding warehouse semantics via Iceberg/Delta. The split that defined the 2010s has dissolved into a single architectural pattern: cheap S3 storage + open table format + open catalog + interchangeable compute engines. That's the lakehouse.
          </p>
        </div>
      </SectionCard>

      <DeeperThoughtSection pageTitle="Data Lakehouse">
        <DeeperThought title="Data Lakehouse IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about Data Lakehouse is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. Data Lakehouse connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where Data Lakehouse sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (Data Lakehouse) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
        { id: "iceberg" as const, reason: "Netflix-origin open table format — the most production-deployed outside Databricks" },
        { id: "delta-lake" as const, reason: "Databricks-origin open table format — the most production-deployed overall" },
        { id: "hudi" as const, reason: "Uber-origin open table format — UPSERT-first for CDC" },
        { id: "glue" as const, reason: "AWS-native catalog + ETL — the AWS on-ramp to lakehouse" },
        { id: "catalogs" as const, reason: "Glue vs Hive vs Nessie vs Unity vs Polaris — the new catalog battlefront" },
        { id: "databricks" as const, reason: "Spark + Delta + Unity = the Databricks lakehouse stack" },
        { id: "snowflake" as const, reason: "Snowflake Polaris + Iceberg = the open lakehouse alternative" },
        { id: "modern-big-data" as const, reason: "Modern big-data stack overview — big-picture context" },
      ]} />
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "Trace this topic's connections across the platform's math graph" }, { id: "iceberg" as const, reason: "Netflix-origin open table format — the most production-deployed outside Databricks" }, { id: "delta-lake" as const, reason: "Databricks-origin open table format — the most production-deployed overall" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("iceberg")} className="text-sm text-primary hover:underline">
          &rarr; Apache Iceberg (Netflix origin)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("delta-lake")} className="text-sm text-primary hover:underline">
          &rarr; Delta Lake (Databricks origin)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("hudi")} className="text-sm text-primary hover:underline">
          &rarr; Apache Hudi (Uber origin)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("glue")} className="text-sm text-primary hover:underline">
          &rarr; AWS Glue (catalog + ETL)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("catalogs")} className="text-sm text-primary hover:underline">
          &rarr; Catalogs comparison (Glue vs Hive vs Nessie vs Unity vs Polaris)
        </Link>
      </div>
    </div>
  );
}
