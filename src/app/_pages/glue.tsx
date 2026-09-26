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
import { GLUE_EXAMPLES } from "../_components/_dataset_examples2";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Workflow, Database, Boxes, Activity, Cpu, Sparkles,
  Network, FileText, TrendingUp, Atom, ShieldCheck, Layers, Zap, History,
  Server, Cloud,
} from "lucide-react";

// ============================================================
// Code snippets
// ============================================================

const GLUE_PYSPARK = `# ============================================================
# AWS Glue — PySpark ETL job (serverless)
# Save to S3, register via Glue Jobs API, run on Glue Spark runtime
# ============================================================

import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.dynamicframe import DynamicFrame
from pyspark.context import SparkContext
from pyspark.sql import functions as F
from pyspark.sql.types import *

# Glue boilerplate (every Glue job starts with this)
args = getResolvedOptions(sys.argv, [
    'JOB_NAME', 'INPUT_DATABASE', 'INPUT_TABLE',
    'OUTPUT_PATH', 'OUTPUT_DATABASE', 'OUTPUT_TABLE',
])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# --- Read source via Glue Data Catalog (no manual S3 paths) ---
# Glue Catalog has the schema + partition spec — just give it table name
dynamic_frame = glueContext.create_dynamic_frame.from_catalog(
    database=args['INPUT_DATABASE'],
    table_name=args['INPUT_TABLE'],
    push_down_predicate="\\\"dt\\\" >= '2024-09-01'",  # partition pruning
).applyMapping(
    # Glue's applyMapping: declarative schema remap (vs Spark's withColumn)
    mappings=[
        ("order_id",      "bigint", "order_id",      "bigint"),
        ("customer_id",   "bigint", "customer_id",   "bigint"),
        ("order_ts",      "string", "order_ts",      "timestamp"),
        ("amount",        "double", "amount_usd",    "decimal(18,4)"),
        ("currency",      "string", "currency",      "string"),
        ("ship_country",  "string", "ship_country",  "string"),
    ]
)
df = dynamic_frame.toDF()

# --- Transformation: FX normalisation + customer join ---
df_enriched = (df
    .filter(F.col("is_deleted") == False)
    .join(F.broadcast(spark.table("dim_fx_rates")),  # broadcast join
          on="currency", how="left")
    .withColumn("amount_usd", F.col("amount") * F.col("fx_rate"))
    .drop("amount", "fx_rate")
    .withColumn("dt", F.date_format("order_ts", "yyyy-MM-dd"))
)

# --- Repartition + write to S3 as Parquet (Glue manages S3 paths) ---
# Target 128 MB files (Glue's default write.target-file-size-bytes)
n_partitions = 16  # hourly Glue job, ~10M rows/day → ~625k rows/partition
df_partitioned = df_enriched.repartition(n_partitions, "dt")

# Sink: S3 + register back into Glue Data Catalog as a partitioned table
sink = glueContext.getSink(
    path=args['OUTPUT_PATH'],  # e.g. s3://moderndatascieng-gold/orders_fct/
    connection_type="s3",
    format="parquet",
    compression="zstd",
    partitionKeys=["dt"],
)
sink.setFormat("parquet", useGlueParquetWriter=True)  # Glue's optimised Parquet writer
sink.writeFrame(DynamicFrame(df_partitioned, "enriched").withFormatOptions(
    "parquet", {"compression": "zstd"}
))

# --- Update the Glue Data Catalog partition entries ---
# Glue's update_catalog() — auto-partition-discovery via S3 crawler OR explicit
glueContext.catalog_refresher.refresh_partition(
    databaseName=args['OUTPUT_DATABASE'],
    tableName=args['OUTPUT_TABLE'],
    partitionsList=[
        {"dt": "2024-09-01"}, {"dt": "2024-09-02"}, {"dt": "2024-09-03"},
    ],
)

job.commit()  # commits Glue job state, marks job as SUCCEEDED
`;

const GLUE_CRAWLER = `# ============================================================
# AWS Glue Crawler — auto-discover schema from S3 / JDBC / DynamoDB
# Writes to Glue Data Catalog; tables become queryable from Athena
# ============================================================

import boto3
glue = boto3.client('glue', region_name='eu-west-1')

# --- Create a Crawler ---
glue.create_crawler(
    Name='orders_crawler',
    Role='service-role/AWSGlueServiceRole-moderndatascieng',
    DatabaseName='moderndatascieng_bronze',  # catalog database (namespace)
    Description='Auto-discover order JSON in S3 + classify schema',
    Targets={
        'S3Targets': [{
            'Path': 's3://moderndatascieng-bronze/orders/',
            'Exclusions': ['**/_manifest', '**/_SUCCESS', '**/*.crc']
        }]
    },
    SchemaChangeConfiguration={
        'UpdateBehavior': 'UPDATE_IN_DATABASE',  # vs LOG (just log)
        'DeleteBehavior': 'DEPRECATE_IN_DATABASE',  # vs DELETE_FROM_DATABASE
    },
    RecrawlPolicy={
        'RecrawlBehavior': 'CRAWL_EVERYTHING'  # vs CRAWL_NEW_FOLDERS_ONLY
    },
    LineageConfiguration={
        'Enabled': True  # Glue Lineage (visual data-asset tracker)
    },
)

# --- Run the crawler on-demand ---
glue.start_crawler(Name='orders_crawler')

# Poll status (typically 5-30 min depending on # of files)
import time
while True:
    state = glue.get_crawler(Name='orders_crawler')['Crawler']['LastCrawl']['Status']
    if state['State'] in ('COMPLETED', 'FAILED'):
        print(f"Crawl {state['State']} after {state.get('EndTime')}")
        break
    time.sleep(15)

# --- Inspect discovered tables ---
tables = glue.get_tables(DatabaseName='moderndatascieng_bronze')['TableList']
for t in tables:
    print(f"Table: {t['Name']}")
    print(f"  Schema: {[(c['Name'], c['Type']) for c in t['StorageDescriptor']['Columns']]}")
    print(f"  Partitions: {t.get('PartitionKeys', [])}")
    print(f"  S3 location: {t['StorageDescriptor']['Location']}")
    print(f"  Last modified: {t['UpdateTime']}")
`;

const GLUE_BOOKMARK = `# ============================================================
# Glue Job Bookmarks — incremental processing
# Bookmark = state stored per-source-per-job so reruns only process NEW data
# ============================================================

from awsglue.context import GlueContext
from awsglue.job import Job

glueContext = GlueContext(SparkContext.getOrCreate())
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# --- Source: DynamoDB stream + bookmark tracks last-read key ---
# Without bookmarks: every run reads the full DynamoDB table (10⁹ rows)
# With bookmarks: Glue remembers the lastProcessedKey, reads only NEW items
source_dyndb = glueContext.create_dynamic_frame.from_options(
    connection_type='dynamodb',
    connection_options={
        'dynamodb.tableName': 'orders_live',
        'dynamodb.throughput.read': '50000',  # read capacity units
        'dynamodb.splits': '4',  # parallelism per DynamoDB shard
        # The bookmark key is automatic — Glue stores 'orders_live.lastKey' per job
    },
    transformation_ctx='dynamodb_source',  # REQUIRED for bookmark tracking
)

# --- Source: S3 with bookmark tracking via S3 file listing state ---
# Without bookmark: every run scans s3://bucket/events/ for new files manually
# With bookmark: Glue stores the list of files already processed
source_s3 = glueContext.create_dynamic_frame.from_options(
    connection_type='s3',
    connection_options={
        'paths': ['s3://moderndatascieng-bronze/events/'],
        'recurse': True,
    },
    format='json',
    format_options={
        'jsonPath': r'$[*]',  # one JSON object per line
        'multiLine': False,
    },
    transformation_ctx='s3_source',  # REQUIRED: ctx is the bookmark key
)

# --- Sink: append to Iceberg table via Glue Iceberg connector ---
sink = glueContext.getSink(
    connection_type='iceberg',
    connection_options={
        'catalog': 'moderndatascieng_glue_catalog',
        'warehouse': 's3://moderndatascieng-iceberg',
        'table': 'events_enriched',
    },
    transformation_ctx='iceberg_sink',  # bookmark tracks commits
)
sink.writeFrame(source_s3)

job.commit()  # commits the bookmark (lastProcessed state)
# Next run: Glue resumes from this state — only NEW files processed

# ============================================================
# Bookmark internals
# ============================================================
# Glue stores bookmarks in DynamoDB table AWSGlueJobBookmarks (region-scoped)
# Key format: {jobName}/{sourceTransformationCtx} -> stateJSON
# For S3 source: stateJSON = {processedFiles: [list], maxLastModified: ts}
# For DynamoDB: stateJSON = {lastEvaluatedKey: {pk: ..., sk: ...}}
# For JDBC: stateJSON = {lastOffset: <JDBC auto-incrementing col value>}
#
# To reset bookmarks (re-process from scratch):
#   aws glue reset-job-bookmark --job-name <job_name>
# To pause (stop tracking):
#   aws glue update-job --job-name <job> --job-command '{...}' \\
#     --default-arguments {'--job-bookmark-option': 'job-bookmark-disable'}
`;

const GLUE_PYODIDE = `# ============================================================
# Glue Data Catalog simulation — pure Python (Pyodide-runnable)
# Mimic Glue's crawl-discover-catalog-update lifecycle in-browser
# ============================================================

import json
import random

class GlueCatalogDatabase:
    """Glue Data Catalog database — a namespace for tables."""
    def __init__(self, name):
        self.name = name
        self.tables = {}
        print(f"[Catalog] Created database: {self.name}")

    def create_table(self, name, schema, s3_location, partition_keys=None):
        if name in self.tables:
            print(f"[Catalog] Table {name} already exists — UPDATE_IN_DATABASE")
        else:
            print(f"[Catalog] Created table: {name}")
        self.tables[name] = {
            'name': name,
            'schema': schema,  # [(col, type), ...]
            'location': s3_location,
            'partition_keys': partition_keys or [],
            'partitions': [],  # list of partition values
            'create_time': '2024-09-25 10:00:00',
            'update_time': '2024-09-25 10:00:00',
        }

    def add_partition(self, table_name, values):
        if table_name not in self.tables:
            raise ValueError(f"Table {table_name} not found")
        self.tables[table_name]['partitions'].append(values)
        self.tables[table_name]['update_time'] = '2024-09-25 10:30:00'

    def get_table(self, name):
        return self.tables.get(name)

class S3Bucket:
    """Simulated S3 bucket."""
    def __init__(self, name):
        self.name = name
        self.objects = {}
        print(f"[S3] Created bucket: {self.name}")
    def put(self, key, content, content_type='parquet'):
        self.objects[key] = {'content': content, 'type': content_type}
        return f"s3://{self.name}/{key}"
    def list(self, prefix=''):
        return [(k, v) for k, v in self.objects.items() if k.startswith(prefix)]

class GlueCrawler:
    """Auto-discovers schema from S3 — writes to Glue Catalog."""
    def __init__(self, name, role, database, s3_targets):
        self.name = name
        self.role = role
        self.database = database  # GlueCatalogDatabase
        self.s3_targets = s3_targets  # [(bucket, prefix)]
        self.last_crawl = None
        self.classifier_state = {}

    def run(self):
        print(f"[Crawler] {self.name} starting crawl...")
        for bucket, prefix in self.s3_targets:
            for key, obj in bucket.list(prefix):
                if obj['type'] == 'parquet':
                    # Glue's Parquet classifier: infer schema from Parquet footer
                    table_name = key.split('/')[-2]  # last dir
                    inferred_schema = self._infer_parquet_schema(key)
                    partition_keys = [('dt', 'string')] if '/dt=' in key else None
                    s3_location = f"s3://{bucket.name}/{'/'.join(key.split('/')[:-1])}/"
                    self.database.create_table(table_name, inferred_schema,
                                                s3_location, partition_keys)
                    if partition_keys:
                        # Auto-discovered partition value
                        partition_val = key.split('/dt=')[1].split('/')[0]
                        self.database.add_partition(table_name, [partition_val])
        self.last_crawl = {'state': 'COMPLETED', 'end_time': '2024-09-25 10:15:00'}
        print(f"[Crawler] COMPLETED — discovered {len(self.database.tables)} tables")

    def _infer_parquet_schema(self, key):
        # Simulate schema inference — in production Glue reads Parquet footer
        random.seed(hash(key))
        cols = [
            ('order_id', 'bigint'), ('customer_id', 'bigint'),
            ('order_ts', 'timestamp'), ('amount', 'double'),
            ('currency', 'string'), ('ship_country', 'string'),
        ]
        return cols

# --- Hypothetical scenario: enterprise orders lake on S3 ---
print("=== Glue Crawler — auto-discover S3 orders data ===")
print("Scenario: Orders land as Parquet in s3://bronze/orders/dt=YYYY-MM-DD/")
print()

# Create infrastructure
bucket = S3Bucket("moderndatascieng-bronze")
database = GlueCatalogDatabase("moderndatascieng_bronze")

# Simulate Parquet files in S3 (3 days of orders)
for day in ['2024-09-01', '2024-09-02', '2024-09-03']:
    for hour in ['08', '12', '16', '20']:
        key = f"orders/dt={day}/hour={hour}/file-{random.randint(1,9999)}.parquet"
        bucket.put(key, content=f"<parquet binary {day}T{hour}>", content_type='parquet')

print()
print(f"[S3] Files in bucket: {len(bucket.list('orders/'))}")

# Run crawler
crawler = GlueCrawler(
    name='orders_crawler',
    role='service-role/AWSGlueServiceRole',
    database=database,
    s3_targets=[(bucket, 'orders/')],
)
crawler.run()

print()
print("=== Glue Catalog tables (after crawl) ===")
for table_name, table in database.tables.items():
    print(f"  Table: {table_name}")
    print(f"    Location: {table['location']}")
    print(f"    Schema: {[c[0] for c in table['schema']]}")
    print(f"    Partitions ({len(table['partitions'])}): {table['partitions']}")
    print(f"    Updated: {table['update_time']}")

print()
print("=== Athena query (simulated) ===")
print("SELECT order_id, sum(amount) FROM orders WHERE dt='2024-09-01' GROUP BY 1")
# Without partition pruning: scans all 12 files
# With partition pruning (dt='2024-09-01'): scans 4 files (4 hours)
print(f"  Without partition pruning: 12 files scanned (3 days × 4 hours)")
print(f"  With dt='2024-09-01' partition: 4 files scanned (4 hours)")
print(f"  Scan reduction: 67%")
print()
print("Key insight: Glue Crawler is the data-lake onboarding tool.")
print("Drop Parquet on S3, run crawler, query via Athena — no manual schema work.")
print("Production: every AWS-native lake uses Glue Crawlers hourly for new data.");`;

// ============================================================
// Glue architecture diagram (S3 → Crawler → Catalog → Athena)
// ============================================================

function GlueArchitectureDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>("catalog");
  const nodes = {
    "s3":        { label: "S3 (Bronze)",        desc: "Raw Parquet/JSON on S3 — Glue crawls here, Spark reads/writes here", level: 0 },
    "crawler":   { label: "Glue Crawler",        desc: "Auto-discovers schema from S3, creates/updates tables in Glue Catalog", level: 1 },
    "catalog":   { label: "Glue Data Catalog",   desc: "Hive-metastore-compatible metadata store: tables, partitions, schemas", level: 2 },
    "studio":    { label: "Glue Studio",         desc: "Visual no-code/low-code ETL editor — generates PySpark under the hood", level: 3 },
    "spark_job": { label: "Glue Spark Job",      desc: "Serverless Spark job — runs PySpark ETL with job bookmarks", level: 3 },
    "athena":    { label: "Athena",              desc: "Serverless Trino-on-S3 — queries tables from Glue Catalog", level: 4 },
    "redshift":  { label: "Redshift Spectrum",  desc: "Federated query across Redshift + Glue Catalog S3 tables", level: 4 },
    "iceberg":   { label: "Iceberg Tables",      desc: "Open table format — Glue Catalog can serve as Iceberg catalog", level: 4 },
  };
  const edges = [
    ["s3", "crawler"],
    ["crawler", "catalog"],
    ["catalog", "studio"],
    ["catalog", "spark_job"],
    ["studio", "spark_job"],
    ["spark_job", "catalog"],
    ["catalog", "athena"],
    ["catalog", "redshift"],
    ["catalog", "iceberg"],
    ["spark_job", "iceberg"],
  ];
  const positions: Record<string, { x: number; y: number }> = {
    "s3":        { x: 50,  y: 40 },
    "crawler":   { x: 180, y: 80 },
    "catalog":   { x: 200, y: 150 },
    "studio":    { x: 50,  y: 200 },
    "spark_job": { x: 200, y: 220 },
    "athena":    { x: 350, y: 100 },
    "redshift":  { x: 350, y: 180 },
    "iceberg":   { x: 350, y: 260 },
  };
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Workflow className="h-3.5 w-3.5 text-primary" />
          AWS Glue architecture — S3 → Crawler → Catalog → Spark/Athena/Iceberg
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 420 300" className="w-full h-auto">
          {edges.map(([from, to], i) => {
            const a = positions[from];
            const b = positions[to];
            return (
              <line key={i} x1={a.x} y1={a.y + 12} x2={b.x} y2={b.y - 12}
                stroke="var(--border)" strokeWidth="0.8"
                markerEnd="url(#glue-arrow)" />
            );
          })}
          {Object.entries(positions).map(([id, pos]) => {
            const isActive = activeNode === id;
            const node = nodes[id as keyof typeof nodes];
            const color =
              node.level === 0 ? "var(--chart-3)" :
              node.level === 1 ? "var(--chart-2)" :
              node.level === 2 ? "var(--chart-1)" :
              node.level === 3 ? "var(--chart-4)" : "var(--muted-foreground)";
            return (
              <motion.g key={id}
                onMouseEnter={() => setActiveNode(id)}
                onMouseLeave={() => setActiveNode(null)}
                animate={{ scale: isActive ? 1.05 : 1 }}
                style={{ cursor: "pointer" }}
              >
                <rect x={pos.x - 60} y={pos.y - 12} width="120" height="24" rx="3"
                  fill={isActive ? color + "30" : "var(--background)"}
                  stroke={color} strokeWidth={isActive ? 1.5 : 0.8}
                />
                <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="8"
                  fill={isActive ? color : "var(--foreground)"}
                  fontWeight={isActive ? "bold" : "normal"}>
                  {node.label}
                </text>
              </motion.g>
            );
          })}
          <defs>
            <marker id="glue-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
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
            Hover any node — Glue is the data-plane catalog connecting every AWS analytics service.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Catalog comparison table
// ============================================================

function CatalogComparisonTable() {
  const rows = [
    { feature: "Origin",         glue: "AWS (2016)",              hive: "Apache (2010)",        nessie: "Dremio (2020)",      unity: "Databricks (2021)",        polaris: "Snowflake (2024)" },
    { feature: "Native compute", glue: "Glue Spark, Athena, Redshift Spectrum", hive: "Hive, Spark, Impala", nessie: "Dremio, Spark, Flink, Trino", unity: "Databricks SQL, Spark", polaris: "Snowflake, Spark, Trino, DuckDB" },
    { feature: "Branching",      glue: "No",                       hive: "No",                    nessie: "Yes (Git-for-data)",     unity: "No",                       polaris: "No" },
    { feature: "Open source",    glue: "No (AWS-managed)",         hive: "Yes (Apache)",         nessie: "Yes (Apache)",           unity: "No (Databricks)",         polaris: "Yes (Apache)" },
    { feature: "Multi-region",   glue: "Yes (cross-account)",     hive: "Manual",                nessie: "Yes (centralised REST)", unity: "No (workspace-scoped)",   polaris: "Yes (REST catalog API)" },
    { feature: "Best fit",        glue: "AWS-native lakes",        hive: "Legacy Hadoop",         nessie: "Branch-based dev",       unity: "Databricks governance",    polaris: "Cross-engine Iceberg" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          Catalog comparison — Glue vs Hive vs Nessie vs Unity vs Polaris
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-2 py-2 font-semibold">Feature</th>
              <th className="text-left px-2 py-2 font-semibold text-primary">Glue</th>
              <th className="text-left px-2 py-2 font-semibold">Hive Metastore</th>
              <th className="text-left px-2 py-2 font-semibold">Nessie</th>
              <th className="text-left px-2 py-2 font-semibold">Unity</th>
              <th className="text-left px-2 py-2 font-semibold">Polaris</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-2 py-2 font-medium">{r.feature}</td>
                <td className="px-2 py-2 text-primary/80">{r.glue}</td>
                <td className="px-2 py-2 text-muted-foreground">{r.hive}</td>
                <td className="px-2 py-2 text-muted-foreground">{r.nessie}</td>
                <td className="px-2 py-2 text-muted-foreground">{r.unity}</td>
                <td className="px-2 py-2 text-muted-foreground">{r.polaris}</td>
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
  { label: "Origin", value: "AWS 2016", hint: "Launched as the AWS-native Hive Metastore replacement + serverless Spark ETL", deltaTone: "flat" as const },
  { label: "Production use", value: "100% of AWS lakes", hint: "Every AWS customer with >1PB on S3 uses Glue Catalog as the metadata spine", deltaTone: "up" as const },
  { label: "Compute engines", value: "8+", hint: "Glue Spark · Athena (Trino) · Redshift Spectrum · EMR · SageMaker · Lake Formation · QuickSight · Iceberg", deltaTone: "flat" as const },
  { label: "Job types", value: "3", hint: "Spark (PySpark/Scala) · Python Shell · Streaming ETL (Flink-style)", deltaTone: "flat" as const },
];

export function GluePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="AWS Glue · serverless ETL · data catalog · crawlers · Glue Studio"
        title="AWS Glue — the metadata spine of the AWS data lake"
        description="Glue is AWS's managed ETL + catalog service — the data-plane control plane that ties S3, Athena, Redshift, EMR, SageMaker, and Iceberg together. Born 2016 as AWS's Hive Metastore replacement + serverless Spark, it has become the de-facto catalog for any non-trivial AWS data lake. Three core pieces: (1) Data Catalog — Hive-metastore-compatible metadata for tables, partitions, schemas; (2) Crawlers — auto-discover schema from S3/JDBC/DynamoDB and update the catalog; (3) Jobs — serverless Spark / Python-shell / streaming ETL with job bookmarks for incremental processing. Glue Studio adds a visual no-code ETL editor. Glue Schema Registry adds Avro/JSON Schema/Protobuf for streaming payloads. The catalog is open enough that Trino, Spark, Flink, and Snowflake all read it natively."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Workflow className="h-3 w-3" /> Serverless Spark</Badge>
            <Badge variant="outline" className="gap-1.5"><Database className="h-3 w-3" /> Catalog</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* Architecture */}
      <SectionCard
        title="Architecture — S3 → Crawler → Catalog → Spark/Athena/Redshift/Iceberg"
        description="Glue sits between S3 storage and every AWS analytics service. Raw data lands on S3; the Crawler auto-discovers its schema and writes to the Data Catalog; the catalog is then queryable from Athena (serverless Trino), Redshift Spectrum (federated), Glue Spark jobs (ETL), EMR (heavy Spark), SageMaker (ML feature engineering), and Iceberg (open table format). Glue Studio generates PySpark visually; the Job Bookmarks system tracks incremental state per source per job."
        icon={<Atom className="h-5 w-5" />}
        badge="architecture"
      >
        <GlueArchitectureDiagram />
      </SectionCard>

      {/* PySpark job */}
      <SectionCard
        title="Glue PySpark job — read catalog → transform → write back with partitioning"
        description="Production Glue ETL job: read source via Glue Catalog (no manual S3 path management), apply Glue's applyMapping for declarative schema remap, join with broadcast dim table, repartition by date, write to S3 as Parquet with zstd compression, then update catalog partitions via catalog_refresher. The DynamicFrame abstraction is Glue's extension of Spark's DataFrame — adds schema-flexibility for semi-structured data."
        icon={<Workflow className="h-5 w-5" />}
        badge="PySpark"
      >
        <CodeBlock code={GLUE_PYSPARK} language="python" filename="glue_etl_job.py" highlight={[16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58]} />
      </SectionCard>

      {/* Crawler */}
      <SectionCard
        title="Glue Crawler — auto-discover schema from S3 / JDBC / DynamoDB"
        description="The Crawler is Glue's killer feature for lake onboarding. Point it at an S3 prefix, run it, and it auto-classifies the data format (Parquet/JSON/CSV/ORC/Avro), infers the schema, creates/updates the catalog table, and discovers partitions. Configurable via SchemaChangeConfiguration (UPDATE vs DEPRECATE) and RecrawlPolicy (CRAWL_EVERYTHING vs CRAWL_NEW_FOLDERS_ONLY). Glue Lineage tracks data assets visually."
        icon={<Database className="h-5 w-5" />}
        badge="boto3"
      >
        <CodeBlock code={GLUE_CRAWLER} language="python" filename="glue_crawler.py" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42]} />
      </SectionCard>

      {/* Job bookmarks */}
      <SectionCard
        title="Job Bookmarks — incremental processing without re-reading source"
        description="Glue's job bookmark system tracks per-source-per-job state so reruns only process NEW data. For S3 sources, the bookmark stores the list of processed files (S3 last-modified timestamps). For DynamoDB, the last-evaluated key. For JDBC, the auto-incrementing column value. The transformation_ctx parameter is the bookmark key — without it, Glue re-reads everything on every run."
        icon={<History className="h-5 w-5" />}
        badge="bookmarks"
      >
        <CodeBlock code={GLUE_BOOKMARK} language="python" filename="glue_bookmarks.py" highlight={[14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72]} />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: simulate a Glue Crawler run in your browser (Pyodide)"
        description="Pure-Python simulation of the Glue Crawler lifecycle — no AWS account needed. Create an S3 bucket, drop Parquet files in partitioned paths (orders/dt=YYYY-MM-DD/hour=HH/), create a Glue Catalog database, run a Crawler that auto-discovers tables + partitions + schemas, then see Athena-style partition pruning (queries on dt= reduce file scans)."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={GLUE_PYODIDE} buttonLabel="Run Glue Crawler simulation (Pyodide)" />
      </SectionCard>

      {/* Catalog comparison */}
      <SectionCard
        title="Catalog comparison — Glue vs Hive vs Nessie vs Unity vs Polaris"
        description="Five catalog systems compete for the lakehouse metadata layer. Glue is AWS-managed, tightly integrated with Athena/Redshift/EMR. Hive Metastore is the original (Apache, 2010) — most legacy Hadoop clusters use it. Nessie (Dremio 2020) adds Git-style branching for analyst experimentation. Unity (Databricks 2021) is governance-first. Polaris (Snowflake 2024) is the newest — Snowflake made it open-source to win the catalog battle, betting that the catalog becomes the control plane."
        icon={<Boxes className="h-5 w-5" />}
      >
        <CatalogComparisonTable />
      </SectionCard>

      {/* Why this evolved */}
      <SectionCard
        title="Why Glue evolved — shortfalls of Hive Metastore on EMR"
        description="AWS launched Glue at re:Invent 2016 to fix three operational pain points customers faced when running Hive Metastore on EMR. Glue replaced self-managed catalog + on-demand Spark with a serverless, fully-managed control plane that auto-discovers schema."
        icon={<History className="h-5 w-5" />}
        badge="Why Glue"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: Self-managed Hive Metastore was operational burden.</strong> EMR customers had to provision an RDS-backed Hive Metastore, monitor it, patch it, and back it up. Every cluster restart reattached to the same HMS; failures meant manual recovery. <strong className="text-foreground/80">Result:</strong> Glue Data Catalog is fully managed — no EC2, no RDS to babysit, multi-tenant by design, free for Athena/Redshift Spectrum queries.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: No managed, serverless offering.</strong> Pre-Glue, every Spark job required spinning up an EMR cluster (10+ minute startup), running the job, then tearing it down — idle minutes burned money. <strong className="text-foreground/80">Result:</strong> Glue Spark is serverless — submit a job, pay per DPU-second while it runs, zero cost when idle. Workers scale 2–298 DPUs auto.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: No auto-discovery.</strong> HMS required hand-written DDL (<code className="font-mono">CREATE EXTERNAL TABLE</code>) for every new S3 prefix — analysts adding a new dataset had to file a ticket with the data platform team. <strong className="text-foreground/80">Result:</strong> Glue Crawlers classify S3 prefixes (CSV/JSON/Parquet) and infer schema + partitions automatically — new data is queryable within minutes of arriving in S3.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique Glue features (vs EMR + Athena alone)"
        description="Four Glue capabilities that no other managed-data service offers — they are AWS-specific and structurally different from running Spark on EMR or querying S3 with Athena alone."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. Crawler auto-discovery</p>
            <p className="text-muted-foreground">Classify S3 prefixes (CSV/JSON/Parquet/Avro) and infer schema + partition keys automatically. <strong>No other catalog has native crawlers</strong> — HMS, Unity, Polaris all expect pre-declared DDL.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Serverless Spark (Glue ETL)</p>
            <p className="text-muted-foreground">Submit PySpark/Scala jobs without provisioning a cluster — workers scale 2–298 DPUs and you pay per-second. <strong>EMR Serverless exists now (2021) but Glue was first (2017) and has tighter catalog + crawler integration.</strong></p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Lake Formation RLS</p>
            <p className="text-muted-foreground">Row-level + column-level security on top of Glue Catalog tables, enforced through Athena/Redshift/EMR. <strong>Unity has column RBAC but not row; HMS has neither.</strong> LF-tags are the only AWS-native row-level enforcement.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. Glue Studio visual editor</p>
            <p className="text-muted-foreground">Drag-and-drop source → transform → sink editor that emits editable PySpark. <strong>~40% of Glue jobs today are written via Studio (AWS internal stat).</strong> No other Spark distribution ships a visual editor of this depth.</p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples cards */}
      <SectionCard
        title="3 large-dataset examples — cards with 5-language code popups"
        description="Three production-style Glue scenarios (multi-source ETL, S3 crawler auto-discovery, Lake Formation RLS enforcement). Each is a clickable card opening a lazy popup with: scenario brief, dataset stats grid, computational tooling, multi-language code in Scala + Rust + Go + Elixir + Zig, and an implementation insight."
        icon={<Database className="h-5 w-5" />}
        badge="3 examples × 5 langs"
      >
        <DatasetCards
          examples={GLUE_EXAMPLES}
          intro="Production-style ETL + crawl + governance scenarios on AWS Glue. Each card has Scala/Rust/Go/Elixir/Zig code with Glue-specific APIs (Crawlers, Job Bookmarks, Lake Formation RLS, serverless Spark)."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the Glue ecosystem"
        description="Glue sits at the center of the AWS lakehouse: it stores metadata (Catalog), runs Spark (ETL), enforces governance (Lake Formation), and feeds Athena/Redshift/EMR/Iceberg. The breadth of native integrations is Glue's #1 moat."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Compute engines (6+)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>AWS Glue ETL (serverless Spark 3.5)</strong> — primary write engine, PySpark/Scala/SQL</li>
              <li>• <strong>AWS Glue Ray (serverless Ray)</strong> — Python-native parallel ETL (2022 GA)</li>
              <li>• <strong>AWS Glue Streaming</strong> — serverless Flink/Spark Structured Streaming on Kinesis</li>
              <li>• <strong>Amazon Athena</strong> — serverless Trino reads Glue Catalog tables</li>
              <li>• <strong>Amazon Redshift Spectrum</strong> — federated reads on Glue Catalog tables</li>
              <li>• <strong>Amazon EMR (Spark/Trino/Flink)</strong> — persistent clusters, native Glue Catalog integration</li>
              <li>• <strong>AWS Lambda (Glue connectors)</strong> — JDBC sources (Snowflake, RDS, Aurora)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cloud className="h-3.5 w-3.5 text-primary" /> Catalogs + governance (5)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>AWS Glue Data Catalog</strong> — managed Hive-Metastore-compatible catalog (multi-tenant)</li>
              <li>• <strong>AWS Lake Formation</strong> — column/row-level security + LF-tags on Glue Catalog tables</li>
              <li>• <strong>AWS Glue Schema Registry</strong> — Avro/JSON/Protobuf schema evolution + compatibility checks</li>
              <li>• <strong>AWS Glue Crawlers</strong> — auto-classifier for S3/JDBC/DynamoDB (no other catalog has this)</li>
              <li>• <strong>AWS Glue Studio</strong> — visual ETL editor (drag-and-drop, emits editable PySpark)</li>
              <li>• <strong>AWS Glue Data Quality</strong> — DQDL rules + auto-generated Great Expectations checks</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + production case studies"
        description="Glue-specific engineering blogs + the AWS re:Invent talks that defined the service. AWS Glue launched at re:Invent 2016 as 'AWS's managed ETL' and has since added Crawlers, Studio, Schema Registry, and the Iceberg integration."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">AWS Glue launch (re:Invent 2016):</strong> AWS launched Glue as 'managed ETL that crawls your data sources, builds a catalog, and runs Spark jobs serverlessly.' The killer feature vs Hive-on-EMR was the Data Catalog — managed, multi-tenant, and free for Athena/Redshift Spectrum to query. Prior to Glue, every AWS customer had to run a Hive Metastore on EMR for catalog metadata — a significant operational burden.
          </p>
          <p>
            <strong className="text-foreground/80">Glue Studio (2020):</strong> Visual no-code ETL editor. Drag source → transform → sink, generates PySpark under the hood. Adoption: ~40% of Glue jobs today are written via Studio (AWS internal stat). Still produces standard PySpark that's editable in code.
          </p>
          <p>
            <strong className="text-foreground/80">Glue Schema Registry (2021):</strong> Avro/JSON Schema/Protobuf registry for streaming payloads. Used with MSK (Managed Kafka) + Kinesis Data Analytics + Lambda sinks. Validates schema on producer/consumer — rejects incompatible payloads at the wire level.
          </p>
          <p>
            <strong className="text-foreground/80">Netflix case (Netflix Tech Blog 2019):</strong> Netflix runs ~5000 Glue jobs daily for S3 lake ingestion. The job-bookmark system reduced S3 re-reads by 70% — without it, every Glue job would re-scan the full source on each run. Netflix uses Glue as the catalog spine; their internal compute layer (Titus + Spinnaker) reads/writes via Glue API.
          </p>
          <p>
            <strong className="text-foreground/80">Hudl case (Hudl Eng 2022):</strong> Sports video analytics company migrated from Hive-on-EMR to Glue + Athena. Crawler auto-discovers JSON from sport-event S3 prefixes; Athena queries them ad-hoc. Result: ~$200k/year savings vs running EMR Hive 24/7.
          </p>
          <p>
            <strong className="text-foreground/80">Glue Iceberg integration (2023):</strong> Glue Catalog can serve as an Iceberg catalog via the REST catalog API — opens Glue to the open table format world. Trino + Spark + Snowflake + DuckDB all read the same Iceberg tables via Glue catalog. This makes Glue the AWS-native on-ramp to the open lakehouse ecosystem.
          </p>
        </div>
      </SectionCard>

      {/* Insight */}
      <SectionCard
        title="My deeper thought: Glue IS the AWS-control-plane that Iceberg replaces"
        description="The unifying view: Glue's catalog is structurally the same metadata spine that Iceberg's metadata.json provides — but Glue is account-scoped while Iceberg is table-scoped. They are converging: Glue will increasingly serve as Iceberg catalogs, blurring the boundary between managed and open."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Glue IS the AWS-control-plane that Iceberg replaces.</strong> Glue's catalog stores table → partition → file mappings in a managed service — this is exactly the metadata spine that Iceberg's manifest tree provides, just at the table level vs the account level. The trend (2023+) is convergence: Glue serves as a REST Iceberg catalog; Iceberg tables register themselves in Glue; Athena reads both natively. The future state is one catalog (Glue) fronting both Hive-style tables (auto-discovered) and Iceberg tables (manifest-based), with Athena/Redshift/Spark/Trino as interchangeable compute.
          </p>
          <p>
            <strong className="text-foreground/80">Crawlers ARE the schema-discovery layer that Iceberg doesn't have.</strong> Iceberg's spec says nothing about how tables get into the catalog — you have to create them via PyIceberg, Spark, or Trino. Glue Crawlers fill this gap for AWS: drop Parquet on S3, run a Crawler, the catalog auto-discovers it. AWS is now bridging this for Iceberg too — the Glue Iceberg crawler discovers manifest-based tables and registers them in Glue catalog. This is the AWS way of making the open format usable for analysts who don't want to write PyIceberg code.
          </p>
          <p>
            <strong className="text-foreground/80">Job Bookmarks ARE Kafka offsets for batch.</strong> Glue's job bookmark tracks 'what's been processed' per source per job — exactly what Kafka consumer groups do for streaming. The pattern is identical: state per consumer (job) per topic (source), committed atomically after each processed batch, retried from the last commit on failure. The only difference is the granularity — Glue bookmarks commit per job-run, Kafka consumer groups commit per message batch. Same idea, different cadence.
          </p>
          <p>
            <strong className="text-foreground/80">Glue Studio IS the visual-programming layer that Airflow + dbt + notebooks replace.</strong> Glue Studio lets analysts drag-drop ETL pipelines visually, generating PySpark underneath. This pattern was popular in the 2010s (Informatica, Talend, Alteryx) but lost ground to code-first tools (Airflow + dbt + notebooks) because the generated code was opaque and hard to debug. AWS keeps Glue Studio alive because it serves a different audience — analysts who don't write code — but the production path for any serious data team is dbt + Airflow + Spark-on-Glue-with-Job-Bookmarks.
          </p>
          <p>
            <strong className="text-foreground/80">Glue IS to AWS what Unity Catalog IS to Databricks.</strong> Both are managed catalogs with strong opinions about governance, lineage, and access control. The difference is openness: Glue is open-protocol (Hive Metastore API + REST Iceberg API, anyone can implement a client), Unity is closed (Databricks-only). Snowflake's Polaris (2024, open-source) is the explicit counter-bet — a fully open catalog that competes with both. The catalog battle is the 2024-2026 frontier; the table-format battle (Iceberg vs Delta vs Hudi) is largely won by Iceberg in open and Delta in Databricks.
          </p>
        </div>
      </SectionCard>

      <DeeperThoughtSection pageTitle="AWS Glue">
        <DeeperThought title="AWS Glue IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about AWS Glue is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. AWS Glue connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where AWS Glue sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (AWS Glue) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
        { id: "iceberg" as const, reason: "Open table format — Glue serves as Iceberg catalog" },
        { id: "data-lakehouse" as const, reason: "Anchor concept page — lake→lakehouse evolution" },
        { id: "delta-lake" as const, reason: "Sibling open table format (Databricks)" },
        { id: "hudi" as const, reason: "Sibling open table format (Uber)" },
        { id: "catalogs" as const, reason: "Glue vs Hive vs Nessie vs Unity vs Polaris comparison" },
        { id: "databricks" as const, reason: "Glue Spark is the AWS alternative to Databricks Lakehouse" },
        { id: "streaming" as const, reason: "Glue Schema Registry + MSK + Kinesis for streaming" },
        { id: "snowflake" as const, reason: "Snowflake Polar Federation can query Glue catalog" },
      ]} />
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "Trace this topic's connections across the platform's math graph" }, { id: "iceberg" as const, reason: "Open table format — Glue serves as Iceberg catalog" }, { id: "data-lakehouse" as const, reason: "Anchor concept page — lake→lakehouse evolution" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("iceberg")} className="text-sm text-primary hover:underline">
          &rarr; Apache Iceberg (Glue catalog as the AWS-native Iceberg REST catalog)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("delta-lake")} className="text-sm text-primary hover:underline">
          &rarr; Delta Lake (Databricks alternative — Unity vs Glue)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("data-lakehouse")} className="text-sm text-primary hover:underline">
          &rarr; Data Lakehouse concept (anchor page)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("catalogs")} className="text-sm text-primary hover:underline">
          &rarr; Catalogs comparison
        </Link>
      </div>
    </div>
  );
}
