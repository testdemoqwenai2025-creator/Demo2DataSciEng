"use client";

import Link from "next/link";
import { SectionCard, PageHeader, KpiCard } from "../_components/section-card";
import { NextSteps } from "../_components/next-steps";
import { CodeBlock, InlineCode } from "../_components/code-block";
import { MultiLangSamples } from "../_components/multi-lang-samples";
import { PyodideRunner } from "../_components/pyodide-runner";
import { WasmRunner } from "../_components/wasm-runner";
import { hrefFor } from "../_lib/router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeeperThought, DeeperThoughtSection } from "../_components/deeper-thought";
import {
  Boxes, Cpu, Layers, Zap, Server, Cloud, Languages,
  TrendingUp, ArrowRight, Terminal, Database, Activity,
} from "lucide-react";

const KPIS = [
  { label: "Languages with Arrow bindings", value: "12+", hint: "Python, Rust, Go, C, C++, Java, JS, R, Ruby, .NET, MATLAB, Julia", deltaTone: "flat" as const },
  { label: "Zero-copy transfer overhead", value: "0ms", hint: "Same memory, different engines — no serialisation", deltaTone: "flat" as const },
  { label: "In-memory vs Parquet (on-disk)", value: "IPC ↔ Parquet", hint: "Arrow = in-memory columnar; Parquet = on-disk columnar", deltaTone: "flat" as const },
  { label: "Arrow Flight throughput", value: "10× gRPC", hint: "Columnar binary protocol for data transfer", deltaTone: "flat" as const },
];

const ARROW_PY = `# ============================================================
# Apache Arrow (pyarrow) — zero-copy columnar data exchange
# Free: OSS (Apache 2.0). pip install pyarrow. ~30MB.
# ============================================================
import pyarrow as pa
import pyarrow.parquet as pq
import pyarrow.compute as pc

# Create an Arrow Table (columnar in-memory)
table = pa.table({
    "order_id":   ["ord_1", "ord_2", "ord_3", "ord_4"],
    "customer_id": ["cust_1", "cust_2", "cust_1", "cust_3"],
    "order_total": [42.50, 128.00, 15.99, 999.00],
    "region_code": ["UK", "EU", "UK", "NA"],
})

# Columnar operations — vectorised, zero-copy
total_revenue = pc.sum(table["order_total"]).as_py()
print(f"Total revenue: £{total_revenue:.2f}")

# Filter — predicate pushdown (no row-by-row scan)
uk_orders = table.filter(pc.equal(table["region_code"], "UK"))
print(f"UK orders: {uk_orders.num_rows} rows, £{pc.sum(uk_orders['order_total']).as_py():.2f}")

# Group by — Arrow Acero (in-memory compute engine)
grouped = table.group_by("customer_id").aggregate([
    ("order_total", "sum"),
    ("order_id", "count"),
])
print(f"\\nRevenue by customer:\\n{grouped}")

# Zero-copy to Parquet (Arrow → Parquet = same columnar layout, just disk format)
pq.write_table(table, "orders.parquet", compression="zstd")
print(f"\\nWrote {table.num_rows} rows to orders.parquet (Arrow → Parquet, zero-copy)")

# Zero-copy from DuckDB (DuckDB returns Arrow directly)
# import duckdb
# result = duckdb.sql("SELECT * FROM orders").arrow()  # Arrow Table, zero-copy
`;

const ARROW_RUST = `// ============================================================
// Apache Arrow (arrow-rs) — Rust bindings for columnar data
// Free: OSS (Apache 2.0). cargo add arrow. ~5MB binary.
// ============================================================
use arrow::array::{Int32Array, StringArray, Float64Array};
use arrow::record_batch::RecordBatch;
use arrow::compute::sum;

fn main() {
    // Create Arrow arrays (columnar, zero-copy across FFI)
    let order_ids = StringArray::from(vec!["ord_1", "ord_2", "ord_3", "ord_4"]);
    let totals = Float64Array::from(vec![42.50, 128.00, 15.99, 999.00]);
    let regions = StringArray::from(vec!["UK", "EU", "UK", "NA"]);

    // Group into a RecordBatch (Arrow's table-like structure)
    let batch = RecordBatch::try_from_iter(vec![
        ("order_id", Box::new(order_ids) as Box<dyn arrow::array::Array>),
        ("order_total", Box::new(totals)),
        ("region_code", Box::new(regions)),
    ]).unwrap();

    println!("Schema: {:?}", batch.schema());
    println!("Rows: {}", batch.num_rows());
    println!("Columns: {}", batch.num_columns());

    // Vectorised compute — sum the order_total column
    let totals: &Float64Array = batch.column(1).as_any().downcast_ref().unwrap();
    let total = sum(totals).unwrap_or(0.0);
    println!("Total revenue: £{:.2}", total);

    // Zero-copy handoff to Python via Arrow C Data Interface
    // (the same RecordBatch can be read by pyarrow without copying)
    let c_array = arrow::ffi::FFI_ArrowArray::empty();
    // ... export via Arrow C ABI (ABI-stable across all 12+ languages)
}

// Compile: cargo build --release
// The resulting binary uses Arrow's columnar format end-to-end.
// Same data structure readable by Python (pyarrow), Go, C, Java, JS.
`;

const ARROW_GO = `// ============================================================
// Apache Arrow (arrow-go) — Go bindings for columnar data
// Free: OSS (Apache 2.0). go get github.com/apache/arrow/go/v17.
// ============================================================
package main

import (
	"fmt"
	"github.com/apache/arrow/go/v17/arrow"
	"github.com/apache/arrow/go/v17/arrow/array"
	"github.com/apache/arrow/go/v17/arrow/memory"
)

func main() {
	alloc := memory.NewGoAllocator()

	// Create Arrow arrays (columnar, zero-copy)
	orderIDs := arrow.BinaryFromStrings(alloc, []string{"ord_1", "ord_2", "ord_3", "ord_4"})
	defer orderIDs.Release()

	totals := array.NewFloat64(alloc, []float64{42.50, 128.00, 15.99, 999.00})
	defer totals.Release()

	regions := arrow.BinaryFromStrings(alloc, []string{"UK", "EU", "UK", "NA"})
	defer regions.Release()

	// Build a Record (Arrow's table-like structure)
	schema := arrow.NewSchema([]arrow.Field{
		{Name: "order_id", Type: arrow.BinaryTypes.String},
		{Name: "order_total", Type: arrow.PrimitiveTypes.Float64},
		{Name: "region_code", Type: arrow.BinaryTypes.String},
	}, nil)

	cols := []arrow.Column{
		{Field: schema.Field(0), Data: array.NewDataArray(orderIDs, alloc)},
		{Field: schema.Field(1), Data: array.NewDataArray(totals, alloc)},
		{Field: schema.Field(2), Data: array.NewDataArray(regions, alloc)},
	}

	rec := array.NewRecord(schema, cols, 4)
	defer rec.Release()

	fmt.Printf("Schema: %v\\n", rec.Schema())
	fmt.Printf("Rows: %d, Columns: %d\\n", rec.NumRows(), rec.NumCols())

	// Vectorised sum
	var total float64
	for i := 0; i < int(rec.NumRows()); i++ {
		total += rec.Column(1).(*array.Float64).Value(i)
	}
	fmt.Printf("Total revenue: £%.2f\\n", total)

	// Zero-copy to Parquet via arrow.parquet
	// Zero-copy to Python via Arrow C Data Interface
}

// Compile: go build -o arrow_demo
// Binary: ~35MB (Arrow runtime embedded)
`;

const ARROW_C = `// ============================================================
// Apache Arrow C Data Interface — ABI-stable across ALL languages
// Free: OSS (Apache 2.0). #include <arrow/c/abi.h>
// ============================================================
// This is THE contract that makes Arrow universal.
// The same struct layout is used by Python, Rust, Go, Java, JS, R.
// A function written in C can be called from any Arrow-aware language
// without recompilation — zero-copy, ABI-stable.

#include <arrow/c/abi.h>
#include <stdint.h>
#include <string.h>

// ArrowArray = the columnar data layout (offsets + buffers + null bitmap)
// ArrowSchema = the metadata (field names, types, nested structure)
// Both are passed by pointer across the FFI boundary — no copying.

// Example: a C function that processes an Arrow string column
// callable from Python, Rust, Go, Java — same binary, no recompilation
int count_non_null_strings(
    struct ArrowArray* column,     // the data (passed by pointer)
    int64_t length,
    int64_t* result
) {
    if (column->n_buffers < 3) return -1;  // string columns have 3 buffers

    // Null bitmap buffer (buffer 0)
    const uint8_t* validity = (const uint8_t*) column->buffers[0];

    // Offsets buffer (buffer 1) — int32 per row
    const int32_t* offsets = (const int32_t*) column->buffers[1];

    // Data buffer (buffer 2) — the actual bytes
    const char* data = (const char*) column->buffers[2];

    int64_t count = 0;
    for (int64_t i = 0; i < length; i++) {
        // Check null bitmap (bit i in validity buffer)
        int is_valid = (validity == NULL) || ((validity[i / 8] >> (i % 8)) & 1);
        if (is_valid) {
            int32_t str_len = offsets[i + 1] - offsets[i];
            if (str_len > 0) count++;
        }
    }

    *result = count;
    return 0;  // success
}

// Compile: gcc -O3 -shared -fPIC -o arrow_count.so arrow_count.c
// Load from Python:  import ctypes; lib = ctypes.CDLL("arrow_count.so")
//                     lib.count_non_null_strings(col._ptr, len(col), byref(result))
// Load from Rust:    use libloading; let lib = libloading::Library::new("arrow_count.so")?;
// Load from Go:      Load via cgo or plugin package
// Same .so, same struct layout, zero-copy, all languages.`;

const COMPARE = [
  { aspect: "What it is", arrow: "In-memory columnar format", parquet: "On-disk columnar format" },
  { aspect: "Lifecycle", arrow: "Transient (compute)", parquet: "Persistent (storage)" },
  { aspect: "Compression", arrow: "None (fastest compute)", parquet: "Snappy/Zstd/LZ4 (storage-efficient)" },
  { aspect: "Zero-copy", arrow: "Native (pointer-pass)", parquet: "Needs decompression to Arrow" },
  { aspect: "Used by", arrow: "DuckDB, Polars, Pandas 2.0, Spark, Flink", parquet: "Same engines (for I/O)" },
  { aspect: "Transfer protocol", arrow: "Arrow Flight (gRPC + columnar)", parquet: "File transfer (S3, HDFS)" },
  { aspect: "Best for", arrow: "In-process + IPC", parquet: "Long-term storage + transport" },
];

export function ArrowPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Columnar · the lingua franca"
        title="Apache Arrow — the HTTP of data"
        description="Arrow is the zero-copy columnar in-memory format that makes DuckDB, Polars, Pandas, Spark, and Flink interchangeable. The Arrow C Data Interface is an ABI-stable contract — the same function written in C can be called from Python, Rust, Go, Java without recompilation. Arrow Flight is the gRPC-based columnar transfer protocol that's 10× faster than traditional row-based APIs."
        right={
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1.5"><Zap className="h-3 w-3" /> Zero-copy</Badge>
            <Badge variant="outline" className="gap-1.5"><Layers className="h-3 w-3" /> ABI-stable</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} hint={k.hint} deltaTone={k.deltaTone} />
        ))}
      </div>

      {/* Insight: Arrow is the HTTP of data */}
      <SectionCard
        title="My deeper thought: Arrow is the HTTP of data"
        description="HTTP made the web universal by being boring, standard, and good enough. Arrow is doing the same for data."
        icon={<TrendingUp className="h-5 w-5" />}
        badge="Insight"
      >
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Before HTTP, every application had its own protocol — FTP, Gopher, SMTP, custom TCP. The web was a mess of incompatible formats. HTTP fixed this by being boring: a simple request-response model, text headers, standardised methods. Not the fastest protocol, not the most feature-rich — but universal. Every browser, every server, every language speaks it. That universality is why the web won.
          </p>
          <p>
            <strong className="text-foreground/80">Arrow is the HTTP of data.</strong> Before Arrow, every data system had its own in-memory format — Spark had Tungsten, Pandas had NumPy arrays, DuckDB had its own vector format, Postgres had its row format. Converting between them was expensive (serialise → deserialise → serialise again). Arrow fixed this by being boring: a standardised columnar layout, ABI-stable across languages, zero-copy between engines. Not the only format — Parquet is for storage, Avro is for streaming — but the <em>universal in-memory contract</em>.
          </p>
          <p>
            The implication: <strong className="text-foreground/80">the engine is interchangeable; the format is sticky.</strong> Pick DuckDB for SQL ergonomics today, switch to Polars for Rust performance tomorrow, switch to Pandas for ecosystem — same Arrow data, zero conversion cost. This is why DuckDB&apos;s <InlineCode>.df()</InlineCode> call is free: it doesn&apos;t serialise to pandas&apos; row format; it hands pandas a pointer to the Arrow buffer. The whole stack is columnar end-to-end.
          </p>
          <p>
            The next move, when WASI matures, is that Arrow + Wasm run <strong className="text-foreground/80">in the browser</strong>. Big data in your browser tab. The laptop-scale pattern meets the universal format — and the boundary between &ldquo;big data&rdquo; and &ldquo;small data&rdquo; disappears entirely.
          </p>
        </div>
      </SectionCard>

      {/* Multi-language samples */}
      <SectionCard
        title="Multi-language: Arrow in Python, Rust, Go, C"
        description="Same columnar data, 4 languages, zero-copy between them. The C Data Interface makes them all interoperable. Click to open the drawer."
        icon={<Languages className="h-5 w-5" />}
        badge="5 languages · drawer"
      >
        <MultiLangSamples
          drawerMode
          drawerButtonLabel="View 5-language Arrow implementations"
          title="Apache Arrow — 4 idiomatic implementations"
          description="Python (pyarrow) · Rust (arrow-rs) · Go (arrow-go) · C (Arrow C Data Interface). The same RecordBatch is readable by all 4 without copying."
          samples={[
            {
              language: "python",
              filename: "arrow_demo.py",
              note: "pyarrow — the most mature Arrow binding. Create tables, vectorised compute, zero-copy to/from Parquet + DuckDB. File types: .py (source), interpreted.",
              code: ARROW_PY,
              highlight: [8, 9, 10, 11, 12, 13, 15, 16, 18, 19, 22, 23, 28, 29],
            },
            {
              language: "rust",
              filename: "arrow_demo.rs",
              note: "arrow-rs — Rust-native Arrow. Zero-copy RecordBatch, vectorised compute, FFI export to Python via C Data Interface. File types: .rs → binary.",
              code: ARROW_RUST,
              highlight: [8, 9, 10, 11, 14, 15, 16, 17, 18, 19, 25, 26, 27, 31],
            },
            {
              language: "go",
              filename: "arrow_demo.go",
              note: "arrow-go — Go-native Arrow. Same columnar format, same zero-copy. File types: .go → binary.",
              code: ARROW_GO,
              highlight: [12, 13, 14, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28, 40, 41],
            },
            {
              language: "c",
              filename: "arrow_c_interface.c",
              note: "Arrow C Data Interface — THE ABI-stable contract. Same struct layout used by ALL 12+ languages. A C function callable from Python/Rust/Go/Java without recompilation. File types: .c → .so shared library.",
              code: ARROW_C,
              highlight: [10, 11, 12, 13, 15, 16, 17, 18, 20, 21, 23, 24, 25, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42],
            },
          ]}
        />
      </SectionCard>

      {/* WasmRunner — Rust/C compiled to Wasm */}
      <SectionCard
        title="Try it: WebAssembly execution (Rust/C → Wasm)"
        description="The C code above, compiled to Wasm, would run in your browser. This demo uses a hand-assembled 41-byte Wasm module (exports `add(i32, i32) -> i32`). In production: cargo build --target wasm32-wasi (Rust) or emcc (C/C++)."
        icon={<Terminal className="h-5 w-5" />}
        badge="Wasm"
      >
        <WasmRunner
          sourceLanguage="Rust/C → wasm32-wasi"
          buttonLabel="Run Wasm module (41 bytes)"
          description="Hand-assembled WebAssembly binary. In production: compile the Rust/C code above with `cargo build --target wasm32-wasi` or `emcc -o module.wasm module.c`, then host the .wasm binary alongside the page. The WasmRunner loads it via WebAssembly.instantiate() and calls the exported function."
        />
      </SectionCard>

      {/* Arrow vs Parquet */}
      <SectionCard
        title="Arrow vs Parquet — in-memory vs on-disk"
        description="Both are columnar. Arrow is for compute (in-memory); Parquet is for storage (on-disk). They convert to each other with zero overhead (same columnar layout, different disk format)."
        icon={<Database className="h-5 w-5" />}
        contentClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Aspect</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Arrow</th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Parquet</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((c) => (
                <tr key={c.aspect} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 text-xs font-semibold">{c.aspect}</td>
                  <td className="px-3 py-2 text-[11px] text-foreground/80">{c.arrow}</td>
                  <td className="px-3 py-2 text-[11px] text-muted-foreground">{c.parquet}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Arrow Flight */}
      <SectionCard
        title="Arrow Flight — the 10× faster data transfer protocol"
        description="gRPC + columnar binary = 10× throughput vs row-based APIs. Used by Dremio, InfluxDB 3.0, Voltron Data for high-volume data serving."
        icon={<Activity className="h-5 w-5" />}
      >
        <CodeBlock
          language="python"
          filename="arrow_flight_demo.py"
          code={`# Arrow Flight — columnar data transfer over gRPC
# 10x faster than REST/JSON for bulk data transfer
import pyarrow.flight as fl

# Client: connect to a Flight server (e.g., Dremio, InfluxDB 3.0)
client = fl.connect("grpc://flight-server:9615")

# Send a SQL query — response comes back as Arrow RecordBatch stream
# (columnar binary, not JSON rows — zero deserialisation overhead)
reader = client.do_get(fl.CommandDescriptor(
    "SELECT * FROM moderndatascieng.sales.fct_orders WHERE order_ts > now() - interval '1 day'"
))

# Receive Arrow RecordBatches — already in columnar format
# No JSON parsing, no row-to-column conversion, zero-copy to pandas
total_rows = 0
for batch in reader:
    total_rows += batch.data.num_rows
    # batch.data is an Arrow RecordBatch — hand to DuckDB/Polars/Pandas instantly

print(f"Received {total_rows} rows via Arrow Flight (columnar binary, 10x faster than REST)")`}
          highlight={[5, 6, 9, 10, 11, 12, 16, 17, 18, 20]}
        />
      </SectionCard>

      <DeeperThoughtSection pageTitle="Arrow">
        <DeeperThought title="Arrow IS the columnar memory format — and it's the universal data interchange" connectedTo="ADR-022 (pgvector for variant embeddings)">
          <p>{"Apache Arrow's columnar format IS the lingua franca of data engineering. Every modern analytics engine (Spark, Databricks, Snowflake, DuckDB, Pandas) reads/writes Arrow in-memory. The columnar layout (values stored contiguously per column, not per row) enables vectorized SIMD execution — 10x faster than row-oriented processing. Arrow IS to data what UTF-8 is to text: a universal interchange format that eliminates serialization overhead between systems."}</p>
        </DeeperThought>
        <DeeperThought title="Arrow's zero-copy IPC IS the end of serialization" connectedTo="ADR-001 (platform architecture)">
          <p>{"Arrow's Inter-Process Communication (IPC) protocol enables zero-copy data transfer between processes. If Spark writes Arrow data to shared memory, DuckDB can read it without deserialization — no CPU spent on copying or parsing. This IS the same principle as memory-mapped files (mmap) — the data IS the message. The serialization tax (JSON → parse → object → serialize → parse) IS eliminated. Arrow IS the post-serialization era."}</p>
        </DeeperThought>
        <DeeperThought title="Arrow Flight IS gRPC for data — and it's the right transport" connectedTo="ADR-050 (fold-section architecture)">
          <p>{"Arrow Flight uses gRPC (HTTP/2 + Protocol Buffers) for columnar data transport. Unlike ODBC/JDBC (which add 3-5x overhead from row-oriented wire format + deserialization), Flight streams Arrow batches directly — zero-copy from sender to receiver. The 10Gbps+ throughput IS because the wire format IS the in-memory format. Arrow Flight IS to data what HTTP/2 is to web — a transport that doesn't tax the payload."}</p>
        </DeeperThought>
        <DeeperThought title="Arrow's C++ kernel IS the universal compute engine" connectedTo="ADR-034 (ESM-2 + AlphaFold2)">
          <p>{"Arrow's C++ kernel (Gandiva, compute functions, expression evaluation) is shared across all Arrow-compatible engines (Acero in Spark, DuckDB's execution engine, Polars' Rust bindings). When you call df.filter() in Pandas, Polars, or DuckDB — the SAME C++ code runs. The kernel IS the universal compute engine. Python/R/Java are just bindings. The math (columnar scan + predicate pushdown + vectorized execution) stays; the language binding changes."}</p>
        </DeeperThought>
        <DeeperThought title="Arrow IS to data what NumPy is to ML — the universal array format" connectedTo="ADR-022 (pgvector for variant embeddings)">
          <p>{"NumPy defined the N-dimensional array (ndarray) as the universal data structure for ML. Arrow defines the columnar table (RecordBatch) as the universal data structure for analytics. Both are: (1) memory-contiguous, (2) language-agnostic, (3) zero-copy, (4) SIMD-vectorized. NumPy IS for tensors; Arrow IS for tables. The pattern (define the in-memory format → every tool adopts it → zero-copy between tools) IS the same. Arrow IS NumPy for data engineering."}</p>
        </DeeperThought>
      </DeeperThoughtSection>
      <NextSteps relatedPages={[{ id: "connections" as const, reason: "Trace this topic's connections across the platform's math graph" }, { id: "duckdb" as const, reason: "Continue to duckdb — see also from this page" }, { id: "modern-big-data" as const, reason: "Continue to modern big data — see also from this page" }]} />

      <div className="flex flex-wrap gap-2">
        <Link href={hrefFor("duckdb")} className="text-sm text-primary hover:underline">
          → DuckDB (Arrow-native OLAP)
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("modern-big-data")} className="text-sm text-primary hover:underline">
          → Modern Big Data Stack
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={hrefFor("knowledge")} className="text-sm text-primary hover:underline">
          → See ADR-016 (Wasm as universal runtime)
        </Link>
      </div>
    </div>
  );
}
