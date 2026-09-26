"use client";

import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { MultiLangSamples } from "../_components/multi-lang-samples";
import { PyodideRunner } from "../_components/pyodide-runner";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Database, Cpu, Layers, Zap, Server, Cloud, Languages,
  Sparkles, TrendingUp, Boxes, GitBranch, ArrowRight,
  Terminal, Play,
} from "lucide-react";

// ============================================================
// Code samples (kept at top for readability)
// ============================================================

const DUCKDB_PY = `# ============================================================
# DuckDB + Python — the "just open a Parquet file" pattern
# Free: OSS (MIT). pip install duckdb. ~30MB binary.
# ============================================================
import duckdb
import pandas as pd

# Connect — in-process, no server. Single file or in-memory.
con = duckdb.connect("moderndatascieng.duckdb")  # file
# con = duckdb.connect()  # in-memory (zero persistence)

# Query a Parquet file directly — no COPY, no load
df = con.sql("""
    SELECT region_code,
           date_trunc('day', order_ts) AS day,
           count(*)                    AS orders,
           sum(order_total)            AS revenue
    FROM read_parquet('s3://moderndatascieng-bronze/shopify/orders/*.parquet')
    WHERE order_ts >= CURRENT_DATE - INTERVAL 7 DAY
    GROUP BY 1, 2
    ORDER BY revenue DESC
""").df()  # .df() → pandas DataFrame via Arrow zero-copy

# DuckDB writes Arrow; pandas receives Arrow; no row-by-row serialisation.
# The .df() call is ~100x faster than going through CSV.

# Streaming aggregations with SQL — DuckDB is single-process but uses
# all CPU cores via morsel-driven parallelism
con.sql("""
    CREATE OR REPLACE TABLE silver.customer AS
    SELECT
      customer_id,
      md5(email || '|' || loaded_at)              AS customer_sk,
      COALESCE(region, 'UNKNOWN')                  AS region_code,
      status = 'ACTIVE'                            AS is_active,
      CURRENT_TIMESTAMP                            AS loaded_at
    FROM read_parquet('s3://moderndatascieng-bronze/sfdc/account/*.parquet')
""")

# Type-safe via pyarrow extension types
print(con.sql("SELECT count(*) FROM silver.customer").fetchone()[0])
`;

const DUCKDB_SQL = `-- ============================================================
-- DuckDB SQL — analytical SQL on any file, no server
-- Extensions: httpfs (S3/HTTPS), parquet, json, excel, icu, tpch, tpcds
-- ============================================================

-- Install + load the httpfs extension to query S3 / HTTPS directly
INSTALL httpfs; LOAD httpfs;
SET s3_region = 'eu-west-1';
SET s3_access_key_id = 'AKIA...';
SET s3_secret_access_key = '...';

-- Query 100s of Parquet files on S3 without copying them locally
-- DuckDB pushes predicates into the Parquet reader (skips row groups)
CREATE VIEW bronze_orders AS
  SELECT * FROM read_parquet('s3://moderndatascieng-bronze/shopify/orders/*.parquet');

-- Tumbling window aggregation — 10x faster than Postgres on a single node
SELECT
  date_trunc('day', order_ts) AS day,
  count(*)                     AS orders,
  sum(order_total)             AS revenue
FROM bronze_orders
WHERE order_ts >= CURRENT_DATE - INTERVAL 7 DAY
GROUP BY 1
ORDER BY day DESC;

-- Native Apache Arrow support — read Parquet without deserialising
-- to row-format. Zero-copy handoff to pandas / polars / R / Python.
COPY (SELECT * FROM bronze_orders WHERE region_code = 'UK')
TO '/tmp/uk_orders.parquet' (FORMAT 'parquet', COMPRESSION 'zstd');

-- Connect to MotherDuck (managed DuckDB) — same SQL, no ops
-- ATTACH 'md:moderndatascieng?attach=true' AS motherduck (READ_ONLY);

-- JSON ingestion — DuckDB reads JSON natively (no jq needed)
SELECT
  json_extract_string(payload, '$.order_id')      AS order_id,
  json_extract(payload, '$.order_total')::double  AS total,
  json_extract_string(payload, '$.customer.id')   AS customer_id
FROM read_json_auto('s3://bucket/events/*.jsonl');

-- Iceberg tables via the iceberg extension (cross-format reads)
INSTALL iceberg; LOAD iceberg;
ATTACH 's3://moderndatascieng-iceberg/catalog' AS ice (TYPE iceberg);
SELECT * FROM ice.sales.fct_orders WHERE order_ts > now() - INTERVAL '1 day';
`;

const DUCKDB_RUST = `// ============================================================
// DuckDB + Rust — embed DuckDB as a Rust crate for native binaries
// Free: OSS (MIT). cargo add duckdb. ~30MB binary.
// ============================================================
use duckdb::{Connection, Result};
use arrow::array::RecordBatch;

fn silver_conform(conn: &Connection) -> Result<()> {
    // Run SQL via the embedded DuckDB engine — no IPC, zero-copy Arrow
    let mut stmt = conn.prepare("""
        SELECT
          customer_id,
          md5(email || '|' || loaded_at)              AS customer_sk,
          COALESCE(region, 'UNKNOWN')                  AS region_code,
          status = 'ACTIVE'                            AS is_active,
          CURRENT_TIMESTAMP                            AS loaded_at
        FROM read_parquet('s3://moderndatascieng-bronze/sfdc/account/*.parquet')
    """)?;

    // Get Arrow RecordBatch — zero-copy from DuckDB's columnar format
    let batches = stmt.query_arrow(())?;
    for batch in batches {
        // batch: &RecordBatch — Arrow columnar, no row-by-row conversion
        let customer_ids = batch
            .column(0)
            .as_string::<i32>();
        for cid in customer_ids {
            println!("customer_id: {}", cid);
        }
    }
    Ok(())
}

fn main() -> Result<()> {
    let conn = Connection::open_in_memory()?;
    conn.execute_batch("INSTALL httpfs; LOAD httpfs;")?;
    silver_conform(&conn)?;
    Ok(())
}

// Compile: cargo build --release
// Binary:  ~30MB (DuckDB embedded + Arrow runtime)
// Performance: ~10x faster than equivalent Postgres query
`;

const DUCKDB_GO = `// ============================================================
// DuckDB + Go — embed DuckDB as a Go module
// Free: OSS (MIT). go get github.com/marcboeker/go-duckdb
// ============================================================
package main

import (
        "database/sql"
        "fmt"
        "log"

        _ "github.com/marcboeker/go-duckdb"
)

func silverConform(db *sql.DB) error {
        // Run SQL — DuckDB pushes S3 reads through libcurl, predicate pushdown to Parquet
        rows, err := db.Query(\`
                SELECT
                  customer_id,
                  md5(email || '|' || loaded_at)              AS customer_sk,
                  COALESCE(region, 'UNKNOWN')                  AS region_code,
                  status = 'ACTIVE'                            AS is_active
                FROM read_parquet('s3://moderndatascieng-bronze/sfdc/account/*.parquet')
        \`)
        if err != nil {
                return err
        }
        defer rows.Close()

        for rows.Next() {
                var id, sk, region string
                var active bool
                if err := rows.Scan(&id, &sk, &region, &active); err != nil {
                        return err
                }
                fmt.Printf("customer_id=%s sk=%s region=%s active=%v\\n", id, sk, region, active)
        }
        return rows.Err()
}

func main() {
        // In-process DuckDB — no server, no IPC overhead
        db, err := sql.Open("duckdb", "?entrypoint=duckdb_open_ext")
        if err != nil {
                log.Fatal(err)
        }
        defer db.Close()

        if _, err := db.Exec("INSTALL httpfs; LOAD httpfs;"); err != nil {
                log.Fatal(err)
        }
        if err := silverConform(db); err != nil {
                log.Fatal(err)
        }
}

// Compile: go build -o silver_conform
// Binary:  ~35MB (DuckDB embedded + libcurl for S3)
// Performance: ~10x faster than equivalent Postgres query
`;

// ============================================================
// Page data
// ============================================================

const KPIS = [
  { label: "Single-node perf vs Postgres", value: "10×", hint: "OLAP workloads (columnar vs row)", deltaTone: "flat" as const },
  { label: "Binary size", value: "~30MB", hint: "Embedded, no server", deltaTone: "flat" as const },
  { label: "File formats read", value: "Parquet, CSV, JSON, Arrow, Excel", hint: "Native, no COPY", deltaTone: "flat" as const },
  { label: "License", value: "MIT (OSS)", hint: "Free forever, including commercial", deltaTone: "flat" as const },
];

const USE_CASES = [
  {
    title: "Notebook analytics",
    desc: "Open a 5GB Parquet file in Jupyter, query it with SQL, get a pandas DataFrame back via Arrow zero-copy. No cluster, no server, no wait.",
    icon: "Boxes",
  },
  {
    title: "CI tests for dbt models",
    desc: "Run dbt build on a sample of data in CI — DuckDB is the local execution engine. No Snowflake credits burned for tests.",
    icon: "GitBranch",
  },
  {
    title: "Edge processing",
    desc: "Embed DuckDB in a Rust/Go binary running on edge nodes (IoT, store-edge). Process sensor data locally, ship aggregates upstream.",
    icon: "Server",
  },
  {
    title: "MotherDuck — managed DuckDB",
    desc: "Same SQL, no ops. MotherDuck hosts the DuckDB engine + storage; you query from any client. Free trial; production is metered.",
    icon: "Cloud",
  },
];

const COMPARE = [
  {
    aspect: "Architecture",
    duckdb: "In-process (embedded library)",
    postgres: "Server + client protocol",
    spark: "Cluster (driver + executors)",
  },
  {
    aspect: "Best for",
    duckdb: "OLAP on files < 1TB",
    postgres: "OLTP, transactional",
    spark: "OLAP at petabyte scale",
  },
  {
    aspect: "Setup time",
    duckdb: "30 seconds (pip install)",
    postgres: "5 minutes (server)",
    spark: "1 hour (cluster)",
  },
  {
    aspect: "Cost",
    duckdb: "Free (MIT OSS)",
    postgres: "Free (OSS) or managed ($)",
    spark: "Free (OSS) or Databricks ($$$)",
  },
  {
    aspect: "Single-node perf",
    duckdb: "~10× Postgres, ~3× Spark-on-1-node",
    postgres: "Baseline",
    spark: "Slower on small data (overhead)",
  },
  {
    aspect: "Concurrency",
    duckdb: "Single-writer, multi-reader",
    postgres: "Multi-writer, MVCC",
    spark: "Multi-writer (via table locks)",
  },
  {
    aspect: "When to skip",
    duckdb: "Petabyte scale; high-concurrency writes",
    postgres: "OLAP-heavy queries (slow on row format)",
    spark: "Single-node workloads (overhead dominates)",
  },
];

export function DuckdbPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Databases · in-process OLAP"
        title="DuckDB — Laptop-scale Big Data"
        description="The most disruptive piece of the modern data stack. DuckDB is an in-process analytical SQL engine — embed it in Python, Rust, Go, Node, R, or just use the CLI. No server, no cluster, no ops. Read Parquet / CSV / JSON / Arrow / Iceberg directly. ~30MB binary, ~10× faster than Postgres on a single node, 100% OSS (MIT)."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> 10× Postgres</Badge>
            <Badge variant="outline" className="gap-1.5"><Cloud className="h-3 w-3" /> ~30MB binary</Badge>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* Insight: laptop-scale big data */}
      <SectionCard
        title="My deeper thought: laptop-scale big data is the new normal"
        description="DuckDB is rewriting the assumption that analytical SQL needs a server. This changes where decisions get made — and who makes them."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Ten years ago, "big data" meant: Hadoop cluster, ops team, dedicated warehouse team. Analytical SQL was a server-side service — you asked the warehouse, the warehouse answered. The cost of asking was high enough that you batched your questions. Self-service analytics meant "request access to a tableau dashboard that someone else built".
          </p>
          <p>
            <strong className="text-foreground/80">DuckDB is the inversion of this assumption.</strong> Your laptop is now a credible analytical engine. A 5GB Parquet file is no longer "big data" — it's "data". A 50GB dataset fits on your SSD and queries in seconds. The cost of asking a question dropped from "open a ticket" to "type SQL in a notebook". Self-service analytics becomes actual self-service — anyone with Python + DuckDB can query, no infra required.
          </p>
          <p>
            The implication: <strong className="text-foreground/80">more decisions get made locally.</strong> Analysts prototype in DuckDB before promoting to Snowflake. CI tests run DuckDB on data samples instead of burning warehouse credits. Edge nodes (stores, IoT) run DuckDB to pre-aggregate before shipping upstream. The boundary between "big data" and "small data" has shifted — and the platform architecture has to follow.
          </p>
          <p>
            The next move, when DuckDB hits 1TB single-node performance (it&apos;s close), is that <strong className="text-foreground/80">most analytics workloads won&apos;t need a warehouse at all</strong>. Snowflake + BigQuery become the cold-storage + cross-team-shared-query layer; DuckDB becomes the hot analytical layer. MotherDuck is the bridge — managed DuckDB when you need shared access.
          </p>
        </div>
      </SectionCard>

      {/* Multi-language samples */}
      <SectionCard
        title="Multi-language: embed DuckDB in Python, SQL, Rust, Go"
        description="Same Silver conformance logic in 4 idioms. Python = analyst default. SQL = CLI / IDE. Rust = native binary. Go = ops tooling. Click to open the drawer."
        icon={<Languages className="h-5 w-5" />}
        badge="4 languages · drawer"
      >
        <MultiLangSamples
          drawerMode
          drawerButtonLabel="View 4-language DuckDB embed implementations"
          title="DuckDB embedded — 4 idiomatic implementations"
          description="Same Silver conformance logic in 4 languages. Each embeds DuckDB as a library — no IPC, zero-copy Arrow handoff. File types: .py / .sql / .rs / .go → ~30MB binary or interpreted."
          samples={[
            {
              language: "python",
              filename: "duckdb_silver.py",
              note: "DuckDB + Python — the analyst default. pip install duckdb. Read Parquet from S3, query with SQL, get a pandas DataFrame via Arrow zero-copy. File types: .py (source), interpreted.",
              code: DUCKDB_PY,
              highlight: [6, 7, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23],
            },
            {
              language: "sql",
              filename: "duckdb_conform.sql",
              note: "DuckDB SQL — runs via CLI or any IDE that speaks Postgres-wire. INSTALL/LOAD extensions for httpfs (S3), iceberg, json, excel. File types: .sql (source), interpreted by DuckDB engine.",
              code: DUCKDB_SQL,
              highlight: [7, 8, 9, 11, 12, 13, 14, 22, 23, 24, 28, 29, 30, 35, 36, 37, 41, 42, 43],
            },
            {
              language: "rust",
              filename: "duckdb_rust.rs",
              note: "DuckDB + Rust — embed DuckDB as a Rust crate. Zero-copy Arrow RecordBatch handoff (no row-by-row). ~30MB binary. For edge processing + native binaries. File types: .rs (source) → ~30MB binary.",
              code: DUCKDB_RUST,
              highlight: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 32, 33, 34, 35, 36],
            },
            {
              language: "go",
              filename: "duckdb_go.go",
              note: "DuckDB + Go — embed DuckDB as a Go module. Single static binary ~35MB (incl. libcurl for S3). For ops tooling + edge binaries. File types: .go (source) → ~35MB binary.",
              code: DUCKDB_GO,
              highlight: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 41, 42, 43, 44, 45, 46],
            },
          ]}
        />
      </SectionCard>

      {/* Use cases */}
      <SectionCard
        title="Where DuckDB wins — the four primary use cases"
        description="DuckDB isn't a replacement for warehouses — it's a new tier in the architecture. Here's where it shines."
        icon={<Boxes className="h-5 w-5" />}
      >
        <div className="grid md:grid-cols-2 gap-3">
          {USE_CASES.map((u) => {
            const Icon = u.icon === "Boxes" ? Boxes : u.icon === "GitBranch" ? GitBranch : u.icon === "Server" ? Server : Cloud;
            return (
              <div key={u.title} className="rounded-md border border-border/60 p-4 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">{u.title}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{u.desc}</p>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Comparison table */}
      <SectionCard
        title="DuckDB vs Postgres vs Spark — when to pick which"
        description="Each tool has a sweet spot. Use this matrix to pick the right engine for the job, not the one your team happens to know."
        icon={<Layers className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Aspect</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">DuckDB</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Postgres</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Spark</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((c) => (
                <tr key={c.aspect} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 text-xs font-semibold align-top">{c.aspect}</td>
                  <td className="px-3 py-2 text-[11px] text-foreground/80 align-top">{c.duckdb}</td>
                  <td className="px-3 py-2 text-[11px] text-muted-foreground align-top">{c.postgres}</td>
                  <td className="px-3 py-2 text-[11px] text-muted-foreground align-top">{c.spark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* File formats */}
      <SectionCard
        title="File formats DuckDB reads natively"
        description="The 'just open a file' pattern is real because DuckDB speaks the formats directly — no COPY, no LOAD, no ingest pipeline."
        icon={<Database className="h-5 w-5" />}
      >
        <div className="grid md:grid-cols-3 gap-3 text-xs">
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3">
            <p className="font-semibold text-sm mb-2 text-emerald-600 dark:text-emerald-400">Columnar (native)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <InlineCode>Parquet</InlineCode> — primary; predicate pushdown</li>
              <li>• <InlineCode>Arrow IPC</InlineCode> (.arrow / .feather) — zero-copy</li>
              <li>• <InlineCode>ORC</InlineCode> — Hive native</li>
            </ul>
          </div>
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
            <p className="font-semibold text-sm mb-2 text-amber-600 dark:text-amber-400">Text (auto-detected)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <InlineCode>CSV / TSV</InlineCode> — auto-schema inference</li>
              <li>• <InlineCode>JSON</InlineCode> (.jsonl / .ndjson) — native</li>
              <li>• <InlineCode>Excel</InlineCode> (.xlsx) — via extension</li>
            </ul>
          </div>
          <div className="rounded-md border border-violet-500/40 bg-violet-500/5 p-3">
            <p className="font-semibold text-sm mb-2 text-violet-600 dark:text-violet-400">Lakehouse (via extension)</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <InlineCode>Iceberg</InlineCode> — vendor-neutral open format</li>
              <li>• <InlineCode>Delta Lake</InlineCode> — Databricks native</li>
              <li>• <InlineCode>SQLite</InlineCode> — ATTACH existing .sqlite</li>
            </ul>
          </div>
        </div>
        <div className="mt-3 rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
          <p>
            <strong className="text-foreground/80">Wire formats:</strong> S3 / HTTPS via httpfs extension.
            Local files via <code className="font-mono">read_parquet(&apos;/path/to/file.parquet&apos;)</code>.
            MotherDuck via <code className="font-mono">ATTACH &apos;md:&lt;db&gt;&apos;</code>.
            Postgres-wire for IDEs (<code className="font-mono">psql</code>, DataGrip, DBeaver).
          </p>
        </div>
      </SectionCard>

      {/* Insight: Arrow is the lingua franca */}
      <SectionCard
        title="My deeper thought: Arrow is the lingua franca, DuckDB is the SQL layer"
        description="DuckDB is fast because it speaks Arrow natively. That's the deeper story."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            DuckDB's headline speed (10× Postgres) isn't magic — it&apos;s the consequence of speaking Apache Arrow natively. Postgres stores rows; analytical queries scan columns; the conversion cost dominates. DuckDB stores + processes in Arrow columnar format from start to finish: the Parquet reader produces Arrow, the SQL engine operates on Arrow, the Python/R/Go/Rust bindings receive Arrow. No row-to-column conversion anywhere.
          </p>
          <p>
            This is why <strong className="text-foreground/80">the .df() call in Python is free</strong>: DuckDB doesn&apos;t serialise to pandas&apos; row format — it hands pandas a pointer to the Arrow buffer. Pandas 2.0+ reads Arrow natively. The whole stack is columnar end-to-end.
          </p>
          <p>
            The implication: <strong className="text-foreground/80">Arrow is the lingua franca, not DuckDB.</strong> If your data is in Arrow format (Parquet is just Arrow-on-disk), any Arrow-aware engine can read it efficiently — DuckDB, Polars, Pandas 2.0, DataFusion, Acero (C++), even Rust&apos;s <InlineCode>arrow-rs</InlineCode>. The engine is interchangeable; the format is sticky. Pick DuckDB for the SQL ergonomics; switch to Polars for the Rust perf; switch to Pandas for ecosystem — same data, zero conversion cost.
          </p>
          <p>
            The next move, when WebAssembly System Interface (WASI) matures, is that DuckDB + Arrow compile to Wasm and run <strong className="text-foreground/80">in the browser</strong>. Big data in your browser tab. That&apos;s the endgame of the laptop-scale pattern — the laptop is everywhere the browser is.
          </p>
        </div>
      </SectionCard>

      {/* Closing — call to action */}
      <SectionCard
        title="Try DuckDB in 30 seconds"
        description="The fastest way to understand DuckDB is to use it. No signup, no install (if you have Python)."
        icon={<Zap className="h-5 w-5" />}
      >
        <CodeBlock
          language="bash"
          filename="try-duckdb.sh"
          code={`# Install
pip install duckdb

# Or: brew install duckdb  (CLI)
# Or: cargo add duckdb     (Rust)
# Or: go get github.com/marcboeker/go-duckdb  (Go)

# Query a remote Parquet file from S3 — no copy, no server
python -c "
import duckdb
print(duckdb.sql('''
  SELECT count(*), sum(trip_distance)
  FROM read_parquet('s3://voltrondata-labs/yellow_tripdata/2024/*.parquet')
''').fetchall())
"

# Or via CLI
duckdb -c "SELECT count(*) FROM read_parquet('data.parquet')"

# Or in a Jupyter notebook
# import duckdb
# duckdb.sql('SELECT * FROM read_parquet(...) LIMIT 5').df()`}
          highlight={[1, 4, 6, 11, 17, 18]}
        />

        {/* Try in browser — real Pyodide execution */}
        <div className="mt-4 rounded-md border border-primary/30 bg-primary/3 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Try it in your browser — no install</p>
            <Badge variant="outline" className="text-[10px] gap-1 ml-auto">
              <Play className="h-2.5 w-2.5" /> Pyodide (Python in Wasm)
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
            This is a simplified version of the Silver conformance logic — pure Python (stdlib only), runs
            in the browser via Pyodide. Click <strong>Run in browser</strong> — the first click loads the
            ~10MB Pyodide runtime from CDN (~3-5s); subsequent runs are instant. The full DuckDB SQL above
            needs a real DuckDB binary; this demo shows the same logic in pure Python.
          </p>
          <CodeBlock
            language="python"
            filename="duckdb_silver_demo.py"
            code={`# Pure-Python demo of Silver customer conformance logic
# Same logic as the PySpark sample — minus the Spark dependency.
# Runs in Pyodide (browser) using only stdlib.

import hashlib
import json
from datetime import datetime

# Synthetic Bronze data (in production: read from Kafka/Delta)
bronze_customers = [
    {"customer_id": "cust_1", "email": "alice@moderndatascieng.io", "status": "ACTIVE",   "region": "UK"},
    {"customer_id": "cust_2", "email": "bob@moderndatascieng.io",   "status": "ACTIVE",   "region": "EU"},
    {"customer_id": "cust_3", "email": "carol@moderndatascieng.io", "status": "INACTIVE", "region": None},
    {"customer_id": "cust_4", "email": "dave@moderndatascieng.io",  "status": "ACTIVE",   "region": "NA"},
]

# Silver conformance — generate surrogate keys, normalise, mask PII
loaded_at = datetime.utcnow().isoformat()
silver = []
for src in bronze_customers:
    email_hash = hashlib.md5(src["email"].lower().encode()).hexdigest()
    customer_sk = hashlib.md5(f"{email_hash}|{loaded_at}".encode()).hexdigest()[:16]
    silver.append({
        "customer_sk":  customer_sk,
        "customer_id":  src["customer_id"],
        "email_hash":   email_hash,
        "is_active":    src["status"] == "ACTIVE",
        "region_code":  src["region"] or "UNKNOWN",  # COALESCE
        "loaded_at":    loaded_at,
    })

# Print the conformed Silver table
print("=" * 78)
print("Silver.customer (conformed from Bronze)")
print("=" * 78)
print(f"{'customer_sk':<18} {'customer_id':<12} {'email_hash':<34} {'active':<8} {'region'}")
print("-" * 78)
for row in silver:
    print(f"{row['customer_sk']:<18} {row['customer_id']:<12} {row['email_hash']:<34} {str(row['is_active']):<8} {row['region_code']}")

print(f"\\nProcessed {len(silver)} customer rows. {sum(1 for r in silver if r['is_active'])} active.")
print(f"PII (email) redacted to MD5 hash: {silver[0]['email_hash'][:16]}...")
`}
          />
          <PyodideRunner
            code={`import hashlib
import json
from datetime import datetime

bronze_customers = [
    {"customer_id": "cust_1", "email": "alice@moderndatascieng.io", "status": "ACTIVE",   "region": "UK"},
    {"customer_id": "cust_2", "email": "bob@moderndatascieng.io",   "status": "ACTIVE",   "region": "EU"},
    {"customer_id": "cust_3", "email": "carol@moderndatascieng.io", "status": "INACTIVE", "region": None},
    {"customer_id": "cust_4", "email": "dave@moderndatascieng.io",  "status": "ACTIVE",   "region": "NA"},
]

loaded_at = datetime.utcnow().isoformat()
silver = []
for src in bronze_customers:
    email_hash = hashlib.md5(src["email"].lower().encode()).hexdigest()
    customer_sk = hashlib.md5(f"{email_hash}|{loaded_at}".encode()).hexdigest()[:16]
    silver.append({
        "customer_sk":  customer_sk,
        "customer_id":  src["customer_id"],
        "email_hash":   email_hash,
        "is_active":    src["status"] == "ACTIVE",
        "region_code":  src["region"] or "UNKNOWN",
        "loaded_at":    loaded_at,
    })

print("=" * 78)
print("Silver.customer (conformed from Bronze)")
print("=" * 78)
print(f"{'customer_sk':<18} {'customer_id':<12} {'email_hash':<34} {'active':<8} {'region'}")
print("-" * 78)
for row in silver:
    print(f"{row['customer_sk']:<18} {row['customer_id']:<12} {row['email_hash']:<34} {str(row['is_active']):<8} {row['region_code']}")

print(f"\\nProcessed {len(silver)} customer rows. {sum(1 for r in silver if r['is_active'])} active.")
print(f"PII (email) redacted to MD5 hash: {silver[0]['email_hash'][:16]}...")`}
            buttonLabel="Run in browser (Pyodide)"
          />
        </div>
      </SectionCard>


      <DeeperThoughtSection pageTitle="DuckDB">
        <DeeperThought title="DuckDB IS part of a larger system — no page stands alone" connectedTo="ADR-001 (platform architecture)">
          <p>{"This page about DuckDB is not an isolated reference — it's a node in a graph. The platform's thesis is that the same math appears across genomics, fintech, maritime, and audio. DuckDB connects to the elegant-code cards via shared equations, and to the living-equation pages via live demos. The reader who arrives here looking for facts leaves with a map of where DuckDB sits in the computational-science landscape."}</p>
        </DeeperThought>
        <DeeperThought title="The technology will change; the math won't" connectedTo="ADR-055 (cross-disciplinary scope)">
          <p>{"In a decade, the specific tools on this page (DuckDB) may be replaced. But the underlying mathematics — the equations, the distributions, the optimisation rules — will be the same. SVD was invented in 1873 and still runs on NumPy today. Attention was described in 2017 and will run on whatever replaces PyTorch. The platform invests in the MATH, not the tools, because the math is the part that survives technology turnover."}</p>
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
      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("modern-big-data")} className="text-sm text-primary hover:underline">
          → Continue to Modern Big Data Stack
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("databricks")} className="text-sm text-primary hover:underline">
          → Compare with Databricks Lakehouse
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">
          → See ADR-013 (Iceberg as primary format)
        </Link>
      </div>
    </div>
  );
}
