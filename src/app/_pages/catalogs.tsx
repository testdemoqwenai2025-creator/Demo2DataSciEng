"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { NextSteps } from "../_components/next-steps";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { PyodideRunner } from "../_components/pyodide-runner";
import { RelatedTopics } from "../_components/related-topics";
import { DatasetCards } from "../_components/dataset-cards";
import { CATALOG_EXAMPLES } from "../_components/_dataset_examples3";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Network, Database, Boxes, Atom, Zap, History, ShieldCheck,
  FileText, TrendingUp, Sparkles, Cpu, Layers, Activity,
  Server, Cloud,
} from "lucide-react";

// ============================================================
// Code snippets
// ============================================================

const POLARIS_CONFIG = `# ============================================================
# Snowflake Polaris Catalog — Apache-licensed REST catalog
# Configures Iceberg to use Polaris as its catalog service
# ============================================================

# Polaris catalog server config (polaris-server.yml)
server:
  port: 8181
  host: 0.0.0.0
  base_path: /api/catalog  # Iceberg REST catalog endpoint

# Storage credentials (cross-cloud: AWS + GCP + Azure)
storage:
  - name: aws-moderndatascieng
    type: S3
    role_arn: arn:aws:iam::123456789012:role/polaris-iceberg
    region: eu-west-1
  - name: gcp-moderndatascieng
    type: GCS
    project: moderndatascieng-prod
    service_account: polaris@moderndatascieng-prod.iam.gserviceaccount.com
  - name: azure-moderndatascieng
    type: AZURE
    tenant_id: abc-123
    storage_account: moderndatasciengprod

# Catalog namespaces (multi-tenant)
catalog:
  namespaces:
    - name: warehouse
      storage: aws-moderndatascieng
      location: s3://moderndatascieng-iceberg
    - name: ml_features
      storage: gcp-moderndatascieng
      location: gs://moderndatascieng-ml-iceberg
    - name: finance
      storage: azure-moderndatascieng
      location: abfss://finance@moderndatasciengprod.dfs.core.windows.net/

# Auth (OAuth2 — all clients must authenticate)
auth:
  type: oauth2
  issuer: https://auth.moderndatascieng.com
  client_id: polaris-iceberg
  scope: catalog_read_write

# Access control (RBAC + grants)
access:
  principals:
    - name: spark-emr-prod
      type: SERVICE
      grants: ["warehouse:USE_CATALOG", "warehouse:USE_NAMESPACE",
               "warehouse.orders_fct:SELECT", "ml_features:*:SELECT"]
    - name: trino-athena
      type: SERVICE
      grants: ["warehouse:USE_CATALOG", "warehouse:USE_NAMESPACE",
               "warehouse.orders_fct:SELECT", "warehouse.dim_customer:SELECT"]
    - name: duckdb-analysts
      type: GROUP
      grants: ["warehouse.orders_fct:SELECT"]
  roles:
    - name: reader
      grants: ["warehouse:USE_CATALOG", "warehouse:USE_NAMESPACE", "*:SELECT"]
    - name: writer
      grants: ["reader", "*:INSERT", "*:UPDATE", "*:DELETE"]

# Lineage + audit (every catalog call logged)
governance:
  lineage: true
  audit_log:
    destination: s3://moderndatascieng-audit/polaris/
    format: parquet
    partition_by: [date]
`;

const SPARK_MULTI_CATALOG = `# ============================================================
# Spark SQL — multi-catalog Iceberg reads (Glue + Nessie + Polaris)
# Join across catalogs in one federated query
# ============================================================

# Configure multiple catalogs in spark-defaults.conf
# spark.sql.catalog.glue_catalog    org.apache.iceberg.spark.SparkCatalog
# spark.sql.catalog.glue_catalog.catalog-impl org.apache.iceberg.aws.glue.GlueCatalog
# spark.sql.catalog.glue_catalog.warehouse s3://moderndatascieng-glue-iceberg/
#
# spark.sql.catalog.nessie_catalog  org.apache.iceberg.spark.SparkCatalog
# spark.sql.catalog.nessie_catalog.catalog-impl org.apache.iceberg.nessie.NessieCatalog
# spark.sql.catalog.nessie_catalog.uri http://nessie:19120/api/v1
# spark.sql.catalog.nessie_catalog.ref main
# spark.sql.catalog.nessie_catalog.warehouse s3://moderndatascieng-nessie/
#
# spark.sql.catalog.polaris_catalog org.apache.iceberg.spark.SparkCatalog
# spark.sql.catalog.polaris_catalog.catalog-impl org.apache.iceberg.rest.RESTCatalog
# spark.sql.catalog.polaris_catalog.uri https://polaris:8181/api/catalog
# spark.sql.catalog.polaris_catalog.warehouse s3://moderndatascieng-polaris/
# spark.sql.catalog.polaris_catalog.credential.mode PRIVILEGED

# Cross-catalog JOIN — read from 3 catalogs in one query
SELECT
    o.order_id,
    o.amount_usd,
    c.customer_email_hash,
    f.feature_value
FROM glue_catalog.warehouse.orders_fct        AS o
JOIN polaris_catalog.warehouse.dim_customer    AS c ON o.customer_id = c.customer_id
JOIN nessie_catalog.ml.features_user_activity  AS f ON o.customer_id = f.user_id
WHERE o.order_ts >= current_date - 7;

# Read from a Nessie branch (isolated experiment)
SELECT * FROM nessie_catalog.warehouse.orders_fct@dev_branch
WHERE ship_country = 'UK';

# Merge Nessie branch into main after experiment
ALTER nessie_catalog MERGE BRANCH dev_branch INTO main;

# Compare Polaris vs Glue catalog tables (table exists in both)
SELECT
    (SELECT count(*) FROM glue_catalog.warehouse.orders_fct) AS glue_rows,
    (SELECT count(*) FROM polaris_catalog.warehouse.orders_fct) AS polaris_rows,
    glue_rows = polaris_rows AS in_sync;`;

const NESSIE_BRANCHING = `# ============================================================
# Project Nessie — Git-for-data semantics on Iceberg tables
# Branch + tag + commit semantics on tables, not just commits
# ============================================================

# Create a Nessie branch for an analytics experiment
nessie branch create experiment_br from main
# Now: SELECT * FROM warehouse.orders_fct@experiment_br — isolated view

# Modify tables on the branch (doesn't affect main)
INSERT INTO warehouse.orders_fct@experiment_br VALUES (...);
ALTER TABLE warehouse.orders_fct@experiment_br ADD COLUMN discount_code STRING;

# Other analysts work on main — they see the original state
SELECT * FROM warehouse.orders_fct;  # main branch, untouched
SELECT count(*) FROM warehouse.orders_fct@experiment_br
UNION ALL
SELECT count(*) FROM warehouse.orders_fct;
# Returns 1005 (experiment has 5 more rows) + 1000 (main unchanged)

# Diff between branches (Git-style)
nessie diff main experiment_br
# Output: tables changed, files added/removed per table, schemas evolved

# Tag a snapshot for reproducibility (immutable)
nessie tag create q3_2024_freeze from main
# Read as-of tag forever (Q3 2024 data locked for audit)
SELECT * FROM warehouse.orders_fct@q3_2024_freeze;

# Cherry-pick a single table change between branches
nessie cherry-pick warehouse.orders_fct@experiment_br INTO main
# Merges just the orders_fct changes (not other tables on the branch)

# Garbage-collect orphaned commits (after merge)
nessie gc --retain-hours 168
# Deletes unreferenced manifest files older than 7 days
# Production: run daily via Airflow`;

const CATALOGS_PYODIDE = `# ============================================================
# Catalog comparison simulation — in browser
# Simulate 6 catalogs (Glue, Hive, Nessie, Unity, Polaris, REST)
# registering + querying the same Iceberg table.
# ============================================================

import time
import random
from dataclasses import dataclass, field

@dataclass
class CatalogEntry:
    """One catalog entry — table_name → metadata_location."""
    table_name: str
    metadata_location: str
    last_updated: float
    properties: dict = field(default_factory=dict)

class Catalog:
    """Abstract catalog — all 6 implementations conform to this interface."""
    def __init__(self, name, features):
        self.name = name
        self.features = features  # set of supported features
        self.entries = {}  # catalog_namespace -> {table_name -> CatalogEntry}
        self.latency_ms = 0
        self.call_count = 0
    def register_table(self, namespace, table_name, metadata_location, properties=None):
        start = time.time()
        if namespace not in self.entries:
            self.entries[namespace] = {}
        self.entries[namespace][table_name] = CatalogEntry(
            table_name=table_name,
            metadata_location=metadata_location,
            last_updated=time.time(),
            properties=properties or {},
        )
        # Simulate catalog API latency (varies by catalog)
        time.sleep(self.features.get('latency_per_call_ms', 5) / 1000)
        self.latency_ms += (time.time() - start) * 1000
        self.call_count += 1
    def get_table(self, namespace, table_name):
        start = time.time()
        entry = self.entries.get(namespace, {}).get(table_name)
        time.sleep(self.features.get('latency_per_call_ms', 5) / 1000)
        self.latency_ms += (time.time() - start) * 1000
        self.call_count += 1
        return entry
    def list_tables(self, namespace):
        return list(self.entries.get(namespace, {}).keys())
    def __repr__(self):
        return f"Catalog({self.name}, features={self.features})"

# --- 6 catalogs: Glue, Hive, Nessie, Unity, Polaris, REST ---
catalogs = {
    'glue': Catalog('AWS Glue', {
        'vendor': 'AWS-managed',
        'open_source': False,
        'branching': False,
        'multi_region': True,
        'latency_per_call_ms': 12,  # AWS API Gateway adds latency
    }),
    'hive': Catalog('Hive Metastore', {
        'vendor': 'Apache (2010)',
        'open_source': True,
        'branching': False,
        'multi_region': False,
        'latency_per_call_ms': 8,  # direct MySQL-backed
    }),
    'nessie': Catalog('Nessie', {
        'vendor': 'Dremio (2020)',
        'open_source': True,
        'branching': True,
        'multi_region': True,
        'latency_per_call_ms': 6,
    }),
    'unity': Catalog('Unity Catalog', {
        'vendor': 'Databricks (2021)',
        'open_source': False,
        'branching': False,
        'multi_region': False,
        'latency_per_call_ms': 15,  # workspace-scoped
    }),
    'polaris': Catalog('Polaris', {
        'vendor': 'Snowflake (2024)',
        'open_source': True,
        'branching': False,
        'multi_region': True,
        'latency_per_call_ms': 10,
    }),
    'rest': Catalog('Iceberg REST Catalog', {
        'vendor': 'Apache (spec, any impl)',
        'open_source': True,
        'branching': False,
        'multi_region': True,
        'latency_per_call_ms': 4,  # lightweight REST
    }),
}

# --- Register the same Iceberg table in all 6 catalogs ---
print("=== Register Iceberg table in 6 catalogs ===")
namespace = 'warehouse'
table_name = 'orders_fct'
metadata_loc = 's3://moderndatascieng-iceberg/warehouse/orders_fct/metadata/v3.metadata.json'

for name, cat in catalogs.items():
    cat.register_table(namespace, table_name, metadata_loc,
                        properties={'format': 'iceberg-v2', 'n_files': 42})

print()
print("=== Query latency comparison — 100 get_table() calls per catalog ===")
for name, cat in catalogs.items():
    cat.latency_ms = 0
    cat.call_count = 0
    for _ in range(100):
        cat.get_table(namespace, table_name)
    avg_ms = cat.latency_ms / cat.call_count
    print(f"  {cat.name:20s}: avg {avg_ms:.2f}ms per call (100 calls total: {cat.latency_ms:.0f}ms)")

print()
print("=== Feature matrix ===")
print(f"{'Catalog':<22} | {'Vendor':<22} | {'Open':<5} | {'Branch':<7} | {'Multi-region'}")
print("-" * 90)
for name, cat in catalogs.items():
    f = cat.features
    print(f"{cat.name:<22} | {f['vendor']:<22} | {'✓' if f['open_source'] else '✗':<5} | "
          f"{'✓' if f['branching'] else '✗':<7} | {'✓' if f['multi_region'] else '✗'}")

print()
print("=== Branching demo (Nessie only) ===")
print("Scenario: analyst creates branch 'experiment_br', modifies table,")
print("         main stays untouched, branches can be merged like Git")
print()
print("  nessie branch create experiment_br from main")
print("  INSERT INTO warehouse.orders_fct@experiment_br VALUES (...)")
print("  -- main is untouched — other analysts see original state")
print("  nessie diff main experiment_br")
print("  -- shows: +1 row in experiment_br vs main")
print("  nessie cherry-pick warehouse.orders_fct@experiment_br INTO main")
print("  -- merges just this table's changes from experiment_br to main")

print()
print("Key insight: catalogs are the metadata layer — they all conform")
print("to the same interface (list_tables, get_table, register_table).")
print("Differences are in features (branching, multi-region), governance")
print("(RBAC, lineage, audit), and deployment (managed vs self-hosted).")
print("Snowflake's Polaris (2024, Apache-licensed) is the explicit")
print("counter-bet to Databricks' Unity Catalog — making the catalog")
print("open-source to win the next decade of lakehouse platform revenue.");`;

// ============================================================
// 6-catalog comparison diagram
// ============================================================

function CatalogsDiagram() {
  const [activeCatalog, setActiveCatalog] = useState<string | null>("polaris");
  const catalogs = {
    "glue":    { name: "Glue Catalog",      vendor: "AWS (managed)",      open: false, branch: false, multi: true,  color: "var(--chart-3)" },
    "hive":    { name: "Hive Metastore",    vendor: "Apache (self-hosted)", open: true,  branch: false, multi: false, color: "var(--muted-foreground)" },
    "nessie":  { name: "Nessie",            vendor: "Dremio → Apache",     open: true,  branch: true,  multi: true,  color: "var(--chart-2)" },
    "unity":   { name: "Unity Catalog",    vendor: "Databricks (managed)", open: false, branch: false, multi: false, color: "var(--chart-1)" },
    "polaris": { name: "Polaris Catalog",  vendor: "Snowflake → Apache",  open: true,  branch: false, multi: true,  color: "var(--chart-4)" },
    "rest":    { name: "REST Catalog",     vendor: "Apache (spec)",       open: true,  branch: false, multi: true,  color: "var(--chart-3)" },
  };
  const positions: Record<string, { x: number; y: number }> = {
    "glue":    { x: 80,  y: 60 },
    "hive":    { x: 180, y: 30 },
    "nessie":  { x: 280, y: 60 },
    "unity":   { x: 80,  y: 130 },
    "polaris": { x: 180, y: 160 },
    "rest":    { x: 280, y: 130 },
  };
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Network className="h-3.5 w-3.5 text-primary" />
          6 catalogs competing for the lakehouse metadata layer
        </p>
      </div>
      <div className="p-3">
        <svg viewBox="0 0 380 200" className="w-full h-auto">
          {/* Compute engines below */}
          <text x="190" y="195" textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">
            Compute engines (Spark / Trino / Flink / DuckDB / Snowflake / Athena)
          </text>
          {Object.entries(positions).map(([id, pos]) => {
            const cat = catalogs[id as keyof typeof catalogs];
            const isActive = activeCatalog === id;
            return (
              <motion.g key={id}
                onMouseEnter={() => setActiveCatalog(id)}
                onMouseLeave={() => setActiveCatalog(null)}
                animate={{ scale: isActive ? 1.05 : 1 }}
                style={{ cursor: "pointer" }}
              >
                <rect x={pos.x - 50} y={pos.y - 12} width="100" height="24" rx="3"
                  fill={isActive ? cat.color + "30" : "var(--background)"}
                  stroke={cat.color} strokeWidth={isActive ? 1.5 : 0.8}
                />
                <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="8"
                  fill={isActive ? cat.color : "var(--foreground)"}
                  fontWeight={isActive ? "bold" : "normal"}>
                  {cat.name}
                </text>
              </motion.g>
            );
          })}
          {/* Lines to compute layer */}
          {Object.entries(positions).map(([id, pos]) => (
            <line key={id} x1={pos.x} y1={pos.y + 12} x2={pos.x} y2="185"
              stroke={activeCatalog === id ? (catalogs[id as keyof typeof catalogs].color) : "var(--border)"}
              strokeWidth={activeCatalog === id ? 1.5 : 0.5}
              strokeDasharray="2,2"
              opacity={activeCatalog === id ? 0.8 : 0.3}
            />
          ))}
        </svg>
        {activeCatalog && (
          <div className="mt-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
            <p className="font-semibold" style={{ color: catalogs[activeCatalog as keyof typeof catalogs].color }}>
              {catalogs[activeCatalog as keyof typeof catalogs].name}
            </p>
            <p className="text-muted-foreground">
              Vendor: {catalogs[activeCatalog as keyof typeof catalogs].vendor} ·
              Open-source: {catalogs[activeCatalog as keyof typeof catalogs].open ? "Yes" : "No"} ·
              Branching: {catalogs[activeCatalog as keyof typeof catalogs].branch ? "Yes (Git-for-data)" : "No"} ·
              Multi-region: {catalogs[activeCatalog as keyof typeof catalogs].multi ? "Yes" : "No"}
            </p>
          </div>
        )}
        {!activeCatalog && (
          <p className="mt-2 text-[10px] text-muted-foreground text-center">
            Hover any catalog — all 6 conform to the same interface (list/get/register table);
            differences are in features, governance, and deployment model.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Full comparison table (15+ features)
// ============================================================

function FullComparisonTable() {
  const rows = [
    { feature: "Origin year",       glue: "2016 (AWS)",  hive: "2010 (Apache)",  nessie: "2020 (Dremio)", unity: "2021 (Databricks)", polaris: "2024 (Snowflake)", rest: "2022 (Apache spec)" },
    { feature: "Vendor",            glue: "AWS",          hive: "Apache",         nessie: "Dremio→Apache", unity: "Databricks",          polaris: "Snowflake→Apache",  rest: "Apache spec" },
    { feature: "Open-source",       glue: "No (managed)", hive: "Yes (Apache)",  nessie: "Yes (Apache)",  unity: "No (Databricks)",    polaris: "Yes (Apache)",     rest: "Yes (spec)" },
    { feature: "Self-host option",  glue: "No",            hive: "Yes",             nessie: "Yes",           unity: "No",                  polaris: "Yes",                rest: "Yes (any impl)" },
    { feature: "Multi-region",      glue: "Yes (cross-account)", hive: "Manual (multi-HMS)", nessie: "Yes (centralised)", unity: "No (workspace)", polaris: "Yes",         rest: "Yes" },
    { feature: "Branching",         glue: "No",            hive: "No",              nessie: "Yes (Git-for-data)", unity: "No",              polaris: "No",                 rest: "No" },
    { feature: "Tags (immutable)",  glue: "No",            hive: "No",              nessie: "Yes",           unity: "No",                  polaris: "No",                 rest: "No" },
    { feature: "RBAC",              glue: "Lake Formation", hive: "SQL grants",    nessie: "Yes",           unity: "Yes (column-level)", polaris: "Yes",                rest: "Implementer" },
    { feature: "Lineage",           glue: "Glue Lineage",  hive: "External (Atlas)", nessie: "Yes",        unity: "Yes (first-class)",  polaris: "Yes",                rest: "Implementer" },
    { feature: "Audit log",         glue: "CloudTrail",    hive: "External",        nessie: "Yes",           unity: "Yes",                 polaris: "Yes",                rest: "Implementer" },
    { feature: "Native compute",    glue: "Glue Spark, Athena, Redshift Spectrum, EMR", hive: "Hive, Spark, Impala", nessie: "Dremio, Spark, Flink, Trino", unity: "Databricks SQL, Spark", polaris: "Snowflake, Spark, Trino, DuckDB", rest: "Spark, Trino, Flink (any REST client)" },
    { feature: "Protocol",          glue: "Hive Metastore API + REST", hive: "Thrift", nessie: "REST",    unity: "REST (Databricks-specific)", polaris: "REST (Iceberg standard)", rest: "REST (Iceberg standard)" },
    { feature: "Storage",           glue: "S3",            hive: "HDFS/S3",         nessie: "S3/GCS/Azure", unity: "S3/Azure/GCS",      polaris: "Multi-cloud",        rest: "Multi-cloud" },
    { feature: "Best fit",          glue: "AWS-native lakes", hive: "Legacy Hadoop", nessie: "Branch-based dev", unity: "Databricks governance", polaris: "Cross-engine Iceberg", rest: "Custom impls" },
    { feature: "Production use",    glue: "100% AWS lakes", hive: "Legacy Hadoop", nessie: "Stripe, Adobe",  unity: "All Databricks customers", polaris: "Snowflake + 2024 launches", rest: "Tabular, custom impls" },
  ];
  return (
    <div className="rounded-md border border-border/60 bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-primary" />
          6 catalogs compared — 15 features across the metadata-layer battlefront
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="border-b border-border/60">
              <th className="text-left px-2 py-2 font-semibold">Feature</th>
              <th className="text-left px-2 py-2 font-semibold">Glue</th>
              <th className="text-left px-2 py-2 font-semibold">Hive MS</th>
              <th className="text-left px-2 py-2 font-semibold text-primary">Nessie</th>
              <th className="text-left px-2 py-2 font-semibold">Unity</th>
              <th className="text-left px-2 py-2 font-semibold text-primary">Polaris</th>
              <th className="text-left px-2 py-2 font-semibold">REST</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-2 py-2 font-medium">{r.feature}</td>
                <td className="px-2 py-2 text-muted-foreground">{r.glue}</td>
                <td className="px-2 py-2 text-muted-foreground">{r.hive}</td>
                <td className="px-2 py-2 text-primary/80">{r.nessie}</td>
                <td className="px-2 py-2 text-muted-foreground">{r.unity}</td>
                <td className="px-2 py-2 text-primary/80">{r.polaris}</td>
                <td className="px-2 py-2 text-muted-foreground">{r.rest}</td>
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
  { label: "Catalogs in production", value: "6", hint: "Glue (AWS) · Hive Metastore (Apache) · Nessie (Dremio) · Unity (Databricks) · Polaris (Snowflake) · REST (Apache spec)", deltaTone: "flat" as const },
  { label: "Open-source", value: "4 of 6", hint: "Hive, Nessie, Polaris, REST are Apache-licensed; Glue + Unity are vendor-managed", deltaTone: "up" as const },
  { label: "Branching", value: "Only Nessie", hint: "Git-for-data semantics — branch + tag + commit on tables. Stripe/Adobe production use", deltaTone: "flat" as const },
  { label: "Battlefront year", value: "2024+", hint: "Snowflake open-sourced Polaris (2024) explicitly to counter Databricks' Unity Catalog — the catalog is the new control plane", deltaTone: "up" as const },
];

export function CatalogsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Catalogs · Glue vs Hive vs Nessie vs Unity vs Polaris vs REST · metadata layer · control plane"
        title="Catalogs — the metadata layer battlefront of the lakehouse"
        description="Six catalog systems compete for the lakehouse metadata layer: AWS Glue Data Catalog (managed, AWS-native), Apache Hive Metastore (the original, 2010, self-hosted), Project Nessie (Dremio origin, 2020, Git-for-data semantics with branching), Databricks Unity Catalog (2021, governance-first, Databricks-locked), Snowflake Polaris Catalog (2024, Apache-licensed, Snowflake's open counter-bet to Unity), and Apache Iceberg REST Catalog (the spec — any vendor can implement). All 6 conform to the same interface (list_tables, get_table, register_table) and the same Iceberg REST API protocol — so compute engines (Spark, Trino, Flink, DuckDB, Snowflake, Athena) can swap between them with minimal config. The differences are in features (branching, lineage, audit), governance (column-level RBAC), deployment (managed vs self-hosted), and ecosystem fit. The catalog is the new control plane — whoever wins wins the next decade of lakehouse platform revenue."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Network className="h-3 w-3" /> 6 catalogs</Badge>
            <Badge variant="outline" className="gap-1.5"><History className="h-3 w-3" /> 2024 battlefront</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* 6-catalog overview diagram */}
      <SectionCard
        title="6 catalogs competing for the lakehouse metadata layer"
        description="Hover any catalog to see its features. All 6 sit between compute engines (Spark, Trino, Flink, DuckDB, Snowflake, Athena) and storage (S3/ADLS/GCS). They expose the same Iceberg REST API protocol — compute engines can swap between them. The battle is in features (branching, lineage, audit), governance (column-level RBAC), and deployment model (managed vs self-hosted). Snowflake's Polaris (2024, Apache) is the newest entry and is explicitly a counter-bet to Databricks' Unity (2021, closed)."
        icon={<Atom className="h-5 w-5" />}
        badge="architecture"
      >
        <CatalogsDiagram />
      </SectionCard>

      {/* Polaris config */}
      <SectionCard
        title="Snowflake Polaris — Apache-licensed REST catalog config"
        description="Polaris is Snowflake's open-source REST catalog (Apache-licensed 2024). Multi-cloud storage (S3 + GCS + Azure in one catalog). OAuth2 authentication for all clients. RBAC with principals (SERVICE for compute engines, GROUP for analysts) + roles (reader, writer). Lineage + audit logging by default. The config below is production-style — minimal changes from Snowflake's reference deployment."
        icon={<ShieldCheck className="h-5 w-5" />}
        badge="Polaris config"
      >
        <CodeBlock code={POLARIS_CONFIG} language="yaml" filename="polaris-server.yml" highlight={[7, 8, 9, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61]} />
      </SectionCard>

      {/* Spark multi-catalog */}
      <SectionCard
        title="Spark — multi-catalog federated JOIN across Glue + Nessie + Polaris"
        description="Spark 3.5+ supports multiple Iceberg catalogs simultaneously. Configure each in spark-defaults.conf (one per catalog-impl), then JOIN across them in one query — e.g. read orders from Glue, customers from Polaris, ML features from Nessie. The branching syntax (table@branch) only works for Nessie — the others don't have branches. ALTER CATALOG MERGE BRANCH is Nessie-specific Git-for-data semantics."
        icon={<Cpu className="h-5 w-5" />}
        badge="Spark SQL"
      >
        <CodeBlock code={SPARK_MULTI_CATALOG} language="sql" filename="spark_multi_catalog.sql" highlight={[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 33, 34, 35, 38, 39, 41, 42, 43, 44, 45]} />
      </SectionCard>

      {/* Nessie branching */}
      <SectionCard
        title="Project Nessie — Git-for-data semantics on Iceberg tables"
        description="Nessie is the only catalog that supports branching — analysts can create isolated branches for experiments, modify tables, merge or discard, without touching main. Tags provide immutable snapshots for audit. Cherry-pick lets you merge a single table's changes between branches. This is the 'Git-for-data' pattern that no other catalog supports — Stripe and Adobe production use it for analyst experimentation."
        icon={<History className="h-5 w-5" />}
        badge="Nessie CLI"
      >
        <CodeBlock code={NESSIE_BRANCHING} language="bash" filename="nessie_branching.sh" highlight={[3, 4, 7, 8, 11, 12, 13, 16, 17, 19, 20, 21, 22, 23, 25, 26, 27, 28, 30, 31, 32]} />
      </SectionCard>

      {/* Pyodide demo */}
      <SectionCard
        title="Try it: simulate 6 catalogs in your browser (Pyodide)"
        description="Pure-Python simulation of all 6 catalogs. Register the same Iceberg table in each, measure query latency (REST is fastest at ~4ms, Unity slowest at ~15ms), see the feature matrix (open-source, branching, multi-region), and run a Nessie branching scenario (branch + modify + diff + cherry-pick + merge)."
        icon={<Sparkles className="h-5 w-5" />}
        badge="executable"
      >
        <PyodideRunner code={CATALOGS_PYODIDE} buttonLabel="Run 6-catalog comparison simulation (Pyodide)" />
      </SectionCard>

      {/* Full comparison */}
      <SectionCard
        title="Full comparison — 15 features across the 6-catalog battlefront"
        description="Every feature side-by-side. The pattern: Glue (AWS-managed, mature, no branching) · Hive Metastore (legacy, self-hosted) · Nessie (only one with branching) · Unity (Databricks-locked, governance-first) · Polaris (Snowflake's 2024 open-source counter-bet, multi-cloud) · REST (Apache spec, any impl). The catalog is the new control plane — whoever wins this battle wins the next decade of lakehouse platform revenue."
        icon={<Boxes className="h-5 w-5" />}
      >
        <FullComparisonTable />
      </SectionCard>

      {/* Why this evolved */}
      <SectionCard
        title="Why catalogs evolved — shortfalls of Hive Metastore"
        description="The Hive Metastore (Apache, 2010) was the lakehouse catalog for a decade — self-hosted, single-region, no branching, no governance. The 2020-2024 catalog wave (Nessie, Unity, Polaris) fixed four structural shortfalls of HMS that broke multi-cloud, multi-tenant, governed lakehouses."
        icon={<History className="h-5 w-5" />}
        badge="Why Catalogs"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Shortfall 1: Legacy architecture, no cloud-native.</strong> HMS was designed in 2010 for on-prem Hadoop — it uses a relational backend (MySQL/Postgres) for table metadata and a Thrift API for clients. It has no native multi-cloud support, no S3-aware listing, and no incremental notification (clients must poll). <strong className="text-foreground/80">Result:</strong> Polaris (Snowflake, 2024) is cloud-native: REST API, multi-region, S3/ADLS/GCS abstraction, native event notifications.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 2: Single-region, no branching.</strong> HMS has no concept of "dev branch of the catalog" — analysts experimenting with schema changes had to copy tables, modify the copy, and rewire jobs. Production + dev catalogs were separate HMS instances with no shared lineage. <strong className="text-foreground/80">Result:</strong> Nessie (Dremio, 2020) adds Git-style branching to the catalog itself — analysts create branches, experiment, merge or discard, with full audit and rollback.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 3: No governance, no RBAC.</strong> HMS granted only database + table-level access — no column-level RBAC, no row-level security, no PII tagging. Governance had to be bolted on via Ranger/Atlas plugins, often inconsistent across engines. <strong className="text-foreground/80">Result:</strong> Unity (Databricks, 2021) provides column + row-level RBAC, PII tags, lineage, audit — enforced across all Databricks engines (Spark, Photon, SQL, ML) consistently.
          </p>
          <p>
            <strong className="text-foreground/80">Shortfall 4: No multi-vendor federation.</strong> HMS spoke one protocol (Thrift). To query across catalogs (Snowflake + HMS + Glue) required per-vendor connectors with different auth models. <strong className="text-foreground/80">Result:</strong> The Iceberg REST catalog spec (2023) provides a single protocol — Polaris, Tabular, Unity (via shim), Nessie all conform — any Iceberg engine can read from any REST-compliant catalog.
          </p>
        </div>
      </SectionCard>

      {/* Unique features */}
      <SectionCard
        title="Truly unique catalog features (vs HMS)"
        description="Four capabilities that distinguish the 2020-2024 catalog wave from HMS — each catalog owns one of them as its structural differentiator."
        icon={<Sparkles className="h-5 w-5" />}
        badge="Unique features"
      >
        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">1. Polaris multi-cloud</p>
            <p className="text-muted-foreground">Snowflake's Polaris (2024) is Apache-licensed and cloud-agnostic — same REST API on AWS, Azure, GCP, no vendor lock-in. <strong>HMS is single-region; Unity is Databricks-bound; Glue is AWS-only.</strong> Polaris is the only multi-cloud open catalog.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">2. Nessie Git-for-data</p>
            <p className="text-muted-foreground">Dremio's Nessie (2020) adds branching/merging to the catalog itself — analysts experiment on a branch, merge or discard. <strong>No other catalog has branches; tables are mutable singletons in HMS/Unity/Glue/Polaris.</strong> Git-for-data is structurally unique.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">3. Unity column-level RBAC</p>
            <p className="text-muted-foreground">Databricks Unity (2021) enforces column + row-level RBAC, PII tags, lineage across all Databricks engines consistently. <strong>HMS has database/table-level only; Glue RLS needs Lake Formation; Polaris is just REST.</strong> Unity is the governance-first catalog.</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-primary mb-1">4. REST catalog spec</p>
            <p className="text-muted-foreground">The Iceberg REST catalog spec (2023) is the open protocol — Polaris, Tabular, Nessie, Unity (via shim), custom all conform. <strong>HMS uses Thrift; Glue uses its own JSON API; Unity uses Databricks RPC.</strong> REST spec wins on interoperability.</p>
          </div>
        </div>
      </SectionCard>

      {/* Dataset examples cards */}
      <SectionCard
        title="3 large-dataset examples — cards with 5-language code popups"
        description="Three production-style catalog scenarios (Polaris multi-cloud setup, Nessie branch-and-merge, Unity column RBAC enforcement). Each is a clickable card opening a lazy popup with: scenario brief, dataset stats grid, computational tooling, multi-language code in Scala + Rust + Go + Elixir + Zig, and an implementation insight."
        icon={<Database className="h-5 w-5" />}
        badge="3 examples × 5 langs"
      >
        <DatasetCards
          examples={CATALOG_EXAMPLES}
          intro="Production-style catalog scenarios showing the 2020-2024 wave: Polaris multi-cloud setup on AWS+Azure+GCP, Nessie branch-and-merge for analyst experimentation, Unity column + row RBAC enforcement. Each card has Scala/Rust/Go/Elixir/Zig code with catalog-specific primitives."
        />
      </SectionCard>

      {/* Computational tooling */}
      <SectionCard
        title="Computational tooling — the catalog ecosystem"
        description="The catalog layer is the control plane of the lakehouse — it decides who can read what, which engines can access which tables, and how governance is enforced. Compute engines (6+) consume catalogs via the REST spec or Thrift; 5 catalog backends offer different trade-offs."
        icon={<Server className="h-5 w-5" />}
        badge="ecosystem"
      >
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-primary" /> Compute engines (6+)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Apache Spark 3.5+</strong> — REST catalog + Glue + HMS + Nessie + Unity clients</li>
              <li>• <strong>Trino 425+</strong> — Iceberg REST, Glue, HMS, Nessie, Unity federated</li>
              <li>• <strong>Apache Flink 1.18+</strong> — REST catalog + HMS for streaming ingest</li>
              <li>• <strong>DuckDB 0.10+</strong> — REST catalog + Glue + HMS (laptop-scale)</li>
              <li>• <strong>AWS Athena + Redshift</strong> — Glue Catalog native, REST catalog via federated query</li>
              <li>• <strong>Snowflake</strong> — Polaris + Glue + Unity federation (external tables)</li>
              <li>• <strong>Databricks Photon</strong> — Unity-native, REST catalog via Iceberg connector</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2 flex items-center gap-1.5"><Cloud className="h-3.5 w-3.5 text-primary" /> Catalog backends (5)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>Snowflake Polaris (2024)</strong> — Apache-licensed REST catalog, multi-cloud, OSS</li>
              <li>• <strong>Databricks Unity Catalog (2021)</strong> — Delta + Iceberg, column RBAC, lineage, audit</li>
              <li>• <strong>Project Nessie (Dremio 2020)</strong> — Git-for-data branching on Iceberg tables</li>
              <li>• <strong>AWS Glue Data Catalog (2016)</strong> — managed HMS-compatible, multi-tenant</li>
              <li>• <strong>Apache Hive Metastore (2010)</strong> — legacy, self-hosted, Thrift API</li>
              <li>• <strong>Tabular (acquired by Databricks 2024)</strong> — SaaS REST catalog on S3</li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Research */}
      <SectionCard
        title="Research + the catalog battlefront"
        description="The 2024 catalog battle is the current frontier of lakehouse platform revenue. Snowflake's open-sourcing of Polaris was the strategic move that escalated it."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">AWS Glue Data Catalog (2016):</strong> Launched at re:Invent 2016 as the AWS-native Hive Metastore replacement. Multi-tenant, free for Athena/Redshift Spectrum queries. Every AWS customer with &gt;1PB on S3 uses Glue Catalog as their metadata spine. Closed-source (AWS-managed), but exposes the standard Hive Metastore API + Iceberg REST API — clients can read it from anywhere.
          </p>
          <p>
            <strong className="text-foreground/80">Apache Hive Metastore (2010):</strong> The original catalog — every Hadoop cluster since 2010 ran Hive Metastore on MySQL. Self-hosted, Apache-licensed, no managed offering. Legacy deployments still exist (Cloudera customers, on-prem Hadoop). Being phased out in favour of Glue/Nessie/Polaris as customers move to cloud.
          </p>
          <p>
            <strong className="text-foreground/80">Project Nessie (Dremio 2020, Apache 2022):</strong> "Git-for-data" — branching + tagging + cherry-picking on Iceberg tables. Lets analysts create isolated branches for experiments without touching main. Production at Stripe (payments analytics experimentation), Adobe (Experience Platform feature engineering). The only catalog with branching — a unique feature that has driven adoption among analyst-heavy teams.
          </p>
          <p>
            <strong className="text-foreground/80">Databricks Unity Catalog (2021):</strong> Centralised governance layer for Delta tables — column-level access control, lineage tracking, audit logs. Replaces per-workspace IAM. Unity is closed-source (Databricks-only) but exposes Iceberg REST API so external engines can read (read-only). All Databricks customers use Unity — it's the default since DBR 11.3. Strong governance but limited portability.
          </p>
          <p>
            <strong className="text-foreground/80">Snowflake Polaris Catalog (2024, Apache-licensed):</strong> Snowflake's strategic counter-bet to Unity. Open-source, Apache-licensed, multi-cloud. Snowflake made it open-source specifically to win the catalog battle — betting that the catalog becomes the control plane and that customers will prefer open over closed. Production at Snowflake (obviously) + Tabular (the Iceberg company Snowflake acquired 2024) + early adopters.
          </p>
          <p>
            <strong className="text-foreground/80">Apache Iceberg REST Catalog (2022 spec):</strong> The Iceberg spec's REST catalog API — any vendor can implement. Tabular (pre-Snowflake-acquisition) launched a production REST catalog. AWS Glue implements the REST API (since 2023). Polaris is built on the spec. The REST catalog is the universal protocol — like how ODBC/JDBC standardised database access in the 1990s, the Iceberg REST spec is standardising lakehouse catalog access in the 2020s.
          </p>
          <p>
            <strong className="text-foreground/80">The 2024 catalog battle:</strong> Snowflake open-sourcing Polaris (May 2024) was the strategic escalation. Databricks had been winning the catalog battle via Unity (closed but powerful); Snowflake's counter was to make Polaris Apache-licensed, betting that customers will prefer open catalogs over closed. Tabular acquisition (June 2024) gave Snowflake the Iceberg founding team. The bet: if the catalog is open, the format battle (Iceberg vs Delta) becomes less relevant — customers pick catalog first, then format follows. This is the explicit inversion of Databricks' Unity strategy.
          </p>
        </div>
      </SectionCard>

      {/* Insight */}
      <SectionCard
        title="My deeper thought: the catalog IS the new database"
        description="The unifying view: the catalog is structurally a database — managed schema, multi-tenant, queryable, with access control. The same patterns that made databases the killer platform of the 1980s are now making catalogs the killer platform of the 2020s."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">The catalog IS the new database.</strong> Pre-1970s, every application had its own bespoke storage — no shared schema, no shared access control. The relational database (Codd 1970) introduced a managed layer with shared schema, SQL access, and transactional guarantees. The same pattern is now happening for the lakehouse: pre-2020s, every Spark/Trino/Flink job had its own table references (bespoke); catalogs (Glue/Unity/Polaris) introduce a managed layer with shared schema, REST access, and access control. The catalog IS the database of the lakehouse era — the metadata is the data, the catalog server is the database engine, the compute engines are the clients. Whoever wins the catalog battle wins the platform revenue.
          </p>
          <p>
            <strong className="text-foreground/80">Branching IS the catalog's killer feature that no warehouse had.</strong> Traditional databases don't support branching — you can't branch a PostgreSQL database, modify the branch, then merge. Nessie's Git-for-data is the first time this pattern reached the data layer. Why? Because in a database, the storage and the metadata are coupled — branching requires copying the data. In a lakehouse, they're decoupled — the catalog is just metadata, so branching only requires creating new metadata pointers, not copying Parquet files. The decoupling is what makes branching possible. This is why no warehouse has branching and why lakehouse is structurally superior for experimentation.
          </p>
          <p>
            <strong className="text-foreground/80">The catalog IS the control plane because it owns identity.</strong> In a database, the database server owns table identity (schema.table). In a lakehouse, the catalog owns table identity (catalog.namespace.table). Whoever owns identity owns the control plane — that's why Snowflake made Polaris open-source. The bet is: if Polaris is open and Polaris owns table identity for Snowflake + Spark + Trino + DuckDB customers, then those customers' primary storage identity is Snowflake-controlled. That's the same strategic position Databricks was reaching for with Unity. The catalog battle is the new database-vendor battle.
          </p>
          <p>
            <strong className="text-foreground/80">Open vs closed IS the strategy inversion.</strong> Databricks made Unity closed (Databricks-only) because they bet customers would buy the full Databricks stack (Unity + Delta + Spark + ML). Snowflake made Polaris open (Apache) because they bet customers would prefer open catalogs and that Polaris would become the universal catalog — with Snowflake as the reference deployment. The two strategies are explicit inversions. The market will decide which wins; my read is that open catalogs win in the long run because compute engines (Spark, Trino, Flink, DuckDB) are themselves open and prefer open catalogs. Databricks' Unity is the strong incumbent; Polaris is the open challenger.
          </p>
          <p>
            <strong className="text-foreground/80">The 2020s catalog battle IS the 1990s database battle redux.</strong> In the 1990s, Oracle won the database battle with a closed-source (but open-API) strategy — clients could connect via ODBC from anywhere. Microsoft SQL Server and PostgreSQL fought back with open strategies. In the 2020s, Databricks' Unity is the Oracle play (closed-source, open-API); Snowflake's Polaris is the Microsoft/PostgreSQL play (open-source, open-API). The 1990s saw Oracle dominate enterprise but PostgreSQL win the long tail. The 2020s may see Unity dominate Databricks-ecosystem but Polaris/Nessie win the open ecosystem. Same pattern, 30 years later.
          </p>
        </div>
      </SectionCard>

      <DeeperThoughtSection pageTitle="Catalogs">
        <DeeperThought title="Catalogs IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about Catalogs is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. Catalogs connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where Catalogs sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (Catalogs) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
        { id: "iceberg" as const, reason: "Open table format — all 6 catalogs serve Iceberg tables via REST" },
        { id: "delta-lake" as const, reason: "Databricks table format — Unity Catalog is the catalog for Delta" },
        { id: "hudi" as const, reason: "Apache Hudi table format — supported by Hive/Glue/Nessie/REST catalogs" },
        { id: "data-lakehouse" as const, reason: "Anchor concept page — lake→lakehouse evolution" },
        { id: "glue" as const, reason: "AWS-managed catalog — the most production-deployed catalog today" },
        { id: "databricks" as const, reason: "Unity Catalog is Databricks' catalog — competes with Polaris" },
        { id: "snowflake" as const, reason: "Polaris is Snowflake's catalog — competes with Unity" },
        { id: "modern-big-data" as const, reason: "Big-picture context for the catalog layer" },
      ]} />
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "Trace this topic's connections across the platform's math graph" }, { id: "iceberg" as const, reason: "Open table format — all 6 catalogs serve Iceberg tables via REST" }, { id: "delta-lake" as const, reason: "Databricks table format — Unity Catalog is the catalog for Delta" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("iceberg")} className="text-sm text-primary hover:underline">
          &rarr; Apache Iceberg (the table format all catalogs serve)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("glue")} className="text-sm text-primary hover:underline">
          &rarr; AWS Glue (AWS-managed catalog)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("delta-lake")} className="text-sm text-primary hover:underline">
          &rarr; Delta Lake (Databricks format, Unity Catalog)
        </Link>
        <span className="text-muted-foreground">&middot;</span>
        <Link href={hrefFor("data-lakehouse")} className="text-sm text-primary hover:underline">
          &rarr; Data Lakehouse (concept anchor)
        </Link>
      </div>
    </div>
  );
}
