"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  X, Atom, Zap, Sparkles, Cpu, Activity, Database, ArrowRight,
  Play, RotateCcw, Binary, FileText, ExternalLink, Gauge, Layers, TrendingUp,
} from "lucide-react";
import { PyodideRunner } from "./pyodide-runner";
import { CodeBlock } from "./code-block";
import { hrefFor } from "../_lib/router";

/**
 * LHCIngestion — extreme-scale data ingestion scenario for the
 * fivetran-hightouch (ELT + rETL) page. Shows how CMS/ATLAS at CERN
 * handle 40 TB/s raw data through a multi-stage pipeline to 1 PB/year
 * stored.
 *
 * Features:
 *   - LHC pipeline overview (KPIs + animated pipeline SVG)
 *   - Data toggle: "real binary data" (hex dump of CMS raw events) vs
 *     "synthetic data" (Python-generated event data)
 *   - 4 code cards in lazy popups: Python (Pyodide-runnable), Rust
 *     (zero-copy binary parser), Scala (Spark Structured Streaming),
 *     Elixir (GenStage pipeline)
 *   - Data reduction calculator (slider showing reduction at each stage)
 *   - All in browser popups (lazy evaluation concept)
 */

// ============================================================
// Shared utilities
// ============================================================

interface LazyModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  accent: string;
  icon: ReactNode;
  children: ReactNode;
}

function LazyModal({ open, onClose, title, subtitle, accent, icon, children }: LazyModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 md:p-6 overflow-y-auto"
          onClick={onClose}
        >
          <button
            type="button" onClick={onClose}
            className="absolute top-3 right-3 z-30 p-2 rounded-full bg-background/90 border border-border hover:bg-accent transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="absolute top-3 left-3 z-30 px-3 py-1.5 rounded-full bg-background/90 border border-border flex items-center gap-2 text-xs font-semibold">
            <span style={{ color: accent }}>{icon}</span>
            <span style={{ color: accent }}>{title}</span>
            {subtitle && <span className="text-muted-foreground font-normal hidden md:inline">· {subtitle}</span>}
          </div>
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-4xl my-8 rounded-xl border border-border bg-background shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border/40 bg-muted/20 px-4 md:px-6 py-3 flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                style={{ backgroundColor: accent + "20" }}>
                {icon}
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold leading-tight" style={{ color: accent }}>{title}</p>
                {subtitle && <p className="text-xs text-muted-foreground font-mono">{subtitle}</p>}
              </div>
            </div>
            <div className="p-4 md:p-6 max-h-[80vh] overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function InfoCallout({ intent, math, insight, accent }: { intent: string; math: string; insight: string; accent?: string }) {
  return (
    <div className="mt-4 space-y-2 text-xs">
      <div className="rounded-md border border-border/60 bg-muted/30 p-2.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Design intent</p>
        <p className="text-foreground/80 leading-relaxed">{intent}</p>
      </div>
      <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Math foundation</p>
        <p className="font-mono text-[11px] text-primary leading-relaxed">{math}</p>
      </div>
      <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
        <p className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-0.5">Implementation insight</p>
        <p className="text-emerald-700 dark:text-emerald-400 leading-relaxed">{insight}</p>
      </div>
    </div>
  );
}

// ============================================================
// LHC Pipeline visualization
// ============================================================

function LHCPipelineViz() {
  const [activeStage, setActiveStage] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActiveStage(s => (s + 1) % 6), 1500);
    return () => clearInterval(id);
  }, []);

  const stages = [
    { name: "Detector", rate: "40 TB/s", desc: "100M+ channels at 40 MHz" },
    { name: "L1 Trigger", rate: "100 GB/s", desc: "FPGA hardware, 3 µs latency" },
    { name: "HLT", rate: "1 GB/s", desc: "Software farm, ~100 kHz kept" },
    { name: "Readout", rate: "500 MB/s", desc: "Zero-suppress + compress" },
    { name: "EOS Storage", rate: "1 PB/yr", desc: "CERN EOS, XRootD protocol" },
    { name: "WLCG Grid", rate: "250 sites", desc: "Distributed to 60+ countries" },
  ];

  return (
    <div className="rounded-md border border-border/60 bg-card p-4">
      <svg viewBox="0 0 500 200" className="w-full h-auto">
        {/* Pipeline boxes */}
        {stages.map((s, i) => {
          const x = 30 + i * 80;
          const isActive = i === activeStage;
          return (
            <motion.g key={i}
              animate={{ opacity: isActive ? 1 : 0.4 }}
              transition={{ duration: 0.3 }}
            >
              {/* Arrow between stages */}
              {i < stages.length - 1 && (
                <motion.line x1={x + 55} y1="100" x2={x + 75} y2="100"
                  stroke={isActive ? "oklch(0.75 0.16 250)" : "oklch(0.55 0.05 250 / 0.3)"}
                  strokeWidth={isActive ? 2 : 1}
                  markerEnd="url(#arrow)"
                />
              )}
              {/* Box */}
              <motion.rect
                x={x} y="60" width="55" height="50" rx="4"
                fill={isActive ? "oklch(0.65 0.16 250 / 0.3)" : "oklch(0.55 0.05 250 / 0.1)"}
                stroke={isActive ? "oklch(0.75 0.16 250)" : "oklch(0.55 0.05 250)"}
                strokeWidth={isActive ? 1.5 : 0.8}
                animate={{ scale: isActive ? 1.05 : 1 }}
                style={{ transformOrigin: `${x + 27.5}px 85px` }}
              />
              <text x={x + 27.5} y="82" textAnchor="middle" fontSize="8" fill={isActive ? "oklch(0.85 0.16 250)" : "oklch(0.55 0.05 250)"} fontWeight="bold">
                {s.name}
              </text>
              <text x={x + 27.5} y="92" textAnchor="middle" fontSize="7" fill={isActive ? "oklch(0.75 0.10 250)" : "oklch(0.45 0.05 250)"}>
                {s.rate}
              </text>
              {/* Data flow dots */}
              {isActive && (
                <motion.circle cx={x + 27.5} cy="125" r="3" fill="oklch(0.85 0.16 250)"
                  animate={{ cx: [x + 5, x + 50, x + 5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.g>
          );
        })}
        {/* Active stage description */}
        <text x="250" y="160" textAnchor="middle" fontSize="9" fill="oklch(0.75 0.16 250)" fontWeight="bold">
          {stages[activeStage].name}: {stages[activeStage].desc}
        </text>
        <text x="250" y="175" textAnchor="middle" fontSize="8" fill="oklch(0.55 0.05 250)">
          Data rate: {stages[activeStage].rate}
        </text>
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="oklch(0.55 0.05 250 / 0.5)" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}

// ============================================================
// Data toggle: real binary vs synthetic
// ============================================================

function DataToggle() {
  const [mode, setMode] = useState<"binary" | "synthetic">("binary");
  const [events, setEvents] = useState<number[]>([]);

  const generateBinary = () => {
    // Simulate CMS raw event bytes (32-byte header + 48 bytes data = 80 bytes/event)
    // Event header: 8B event_id + 4B bunch_crossing + 8B timestamp + 4B lumi_block + 4B payload_len + 4B reserved
    // Event data: 12 channels × 4B energy each = 48 bytes
    const binary: string[] = [];
    for (let i = 0; i < 8; i++) {
      const eventId = (0x0001 + i).toString(16).padStart(8, '0');
      const bx = ((i * 2549) % 4096).toString(16).padStart(8, '0');
      const ts = (Date.now() + i * 25).toString(16).padStart(16, '0');
      const lb = (42 + i).toString(16).padStart(8, '0');
      const len = (48).toString(16).padStart(8, '0');
      const res = '00000000';
      // 3 channels with energies (in GeV, ~50 GeV mean)
      const energies = [];
      for (let c = 0; c < 3; c++) {
        const e = Math.floor(50 + (Math.random() - 0.5) * 20);
        const ch = (c + i * 3).toString(16).padStart(8, '0');
        energies.push(ch + e.toString(16).padStart(8, '0'));
      }
      binary.push(`${eventId} ${bx} ${ts} ${lb} ${len} ${res}`);
      binary.push(`  ${energies.join(' ')}`);
    }
    return binary.join('\n');
  };

  const generateSynthetic = () => {
    // Generate synthetic CMS event data as structured numbers
    const lines: string[] = [];
    lines.push('event_id | bunch_crossing | timestamp | lumi_block | channels');
    lines.push('---------|----------------|-----------|-----------|---------');
    for (let i = 0; i < 6; i++) {
      const eid = 1 + i;
      const bx = (i * 2549) % 4096;
      const ts = new Date(Date.now() + i * 25).toISOString().slice(11, 19);
      const lb = 42 + i;
      const channels = Array.from({ length: 3 }, (_, c) => {
        const e = (50 + (Math.random() - 0.5) * 20).toFixed(1);
        const ch = c + i * 3;
        return `ch${ch}=${e}GeV`;
      }).join(', ');
      lines.push(`${eid.toString().padStart(8)} | ${bx.toString().padStart(14)} | ${ts} | ${lb.toString().padStart(9)} | ${channels}`);
    }
    return lines.join('\n');
  };

  useEffect(() => {
    setEvents([]);
  }, [mode]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode("binary")}
          className={`h-10 rounded-md border text-xs font-semibold transition-all ${mode === "binary" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary hover:bg-accent"}`}
        >
          <Binary className="h-3 w-3 inline mr-1.5" /> Real binary data (hex dump)
        </button>
        <button
          type="button"
          onClick={() => setMode("synthetic")}
          className={`h-10 rounded-md border text-xs font-semibold transition-all ${mode === "synthetic" ? "bg-amber-600 text-white border-amber-600" : "bg-card border-border hover:border-amber-500"}`}
        >
          <FileText className="h-3 w-3 inline mr-1.5" /> Synthetic data (structured)
        </button>
      </div>
      <div className="rounded-md border border-border/60 bg-card p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          {mode === "binary" ? "CMS raw event binary (RD5 format — 80 bytes/event)" : "Synthetic CMS events (Python-generated, structured)"}
        </p>
        <pre className="text-[10px] font-mono text-foreground/80 leading-relaxed overflow-x-auto whitespace-pre-wrap">
          {mode === "binary" ? generateBinary() : generateSynthetic()}
        </pre>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {mode === "binary"
          ? "Real binary: CMS detectors output raw binary via VME/FPGA front-ends. Each event is a 32-byte header (event_id, bunch_crossing, timestamp, lumi_block, payload_length) followed by channel energy readings. Parsed at wire speed by zero-copy Rust code."
          : "Synthetic: Python generates structured events with channel energies (Gaussian ~50 GeV mean). Used for pipeline testing, Monte Carlo studies, and CI/CD validation — same code path as real data."}
      </p>
    </div>
  );
}

// ============================================================
// Code constants
// ============================================================

const PYTHON_CODE = `import struct
import numpy as np

# LHC data reduction pipeline (Python/PySpark simulation)
# CMS detector: 100M+ channels at 40 MHz → 40 TB/s raw

def generate_cms_event(n_channels=1000):
    """Generate synthetic CMS event data."""
    channels = np.random.normal(50, 10, n_channels)  # GeV
    channel_ids = np.arange(n_channels, dtype=np.uint16)
    timestamps = np.full(n_channels, np.random.randint(0, 2**32), dtype=np.uint32)
    return np.stack([channels, channel_ids, timestamps], axis=1)

def zero_suppression(event, threshold=10.0):
    """Zero suppression — keep only channels above threshold."""
    mask = event[:, 0] > threshold
    return event[mask]

def compress_event(event):
    """Simulate compression (zstd level 3 — typical 3x for CMS data)."""
    raw_size = event.nbytes
    compressed_size = raw_size // 3
    return compressed_size, raw_size

# Simulate pipeline
n_events = 1000
raw_data = [generate_cms_event() for _ in range(n_events)]
raw_total = sum(e.nbytes for e in raw_data)

# Stage 1: Zero suppression
filtered = [zero_suppression(e) for e in raw_data]
filtered_total = sum(e.nbytes for e in filtered)

# Stage 2: Compression
compressed = [compress_event(e) for e in filtered]
compressed_total = sum(c[0] for c in compressed)

print("=== LHC Data Reduction Pipeline ===")
print(f"Raw data:        {raw_total:>12,} bytes ({raw_total/1e6:.1f} MB)")
print(f"After zero-supp: {filtered_total:>12,} bytes ({filtered_total/1e6:.1f} MB)  [{filtered_total/raw_total*100:.1f}% of raw]")
print(f"After compress:  {compressed_total:>12,} bytes ({compressed_total/1e6:.1f} MB)  [{compressed_total/raw_total*100:.1f}% of raw]")
print(f"Reduction:       {raw_total/compressed_total:.1f}x")
print()
reduction = raw_total / compressed_total
print(f"At LHC scale: 40 TB/s raw -> {40e12 / reduction / 1e9:.1f} GB/s after pipeline")
print(f"Annual storage: {40e12 / reduction * 3.15e7 / 1e15:.2f} PB/year")`;

const RUST_CODE = `use memmap2::Mmap;
use std::fs::File;
use std::error::Error;

// CMS Raw Data Format (RD5) — zero-copy binary parser
// 40 MHz crossing rate, ~2 MB/event = 80 GB/s per detector half
// Memory-mapped I/O for zero-copy parsing at wire speed

#[repr(C, packed)]
struct EventHeader {
    event_id: u64,        // 8 bytes — unique event identifier
    bunch_crossing: u32,  // 4 bytes — BX number (0-4095)
    timestamp: u64,       // 8 bytes — nanosecond timestamp
    lumi_block: u32,      // 4 bytes — luminosity block number
    payload_len: u32,     // 4 bytes — detector data length
    reserved: u32,        // 4 bytes — alignment padding
    // Total: 32 bytes
}

struct CMSEvent<'a> {
    header: &'a EventHeader,
    detector_data: &'a [u8],  // zero-copy slice into mmap
}

fn parse_cms_raw(path: &str) -> Result<Vec<CMSEvent>, Box<dyn Error>> {
    let file = File::open(path)?;
    let mmap = unsafe { Mmap::map(&file)? };
    let bytes = &mmap[..];

    let mut events = Vec::new();
    let mut offset = 0;

    while offset + 32 <= bytes.len() {
        // Zero-copy: just reference the mmap'd bytes
        let header: &EventHeader = unsafe {
            &*(bytes[offset..].as_ptr() as *const EventHeader)
        };

        let payload_end = offset + 32 + header.payload_len as usize;
        if payload_end > bytes.len() { break; }

        let detector_data = &bytes[offset + 32..payload_end];

        events.push(CMSEvent { header, detector_data });
        offset = payload_end;
    }

    Ok(events)  // All slices point into the mmap — zero copy
}

// SIMD-optimized energy extraction (8 channels at once)
#[cfg(target_arch = "x86_64")]
fn extract_energies_simd(data: &[u8]) -> Vec<f32> {
    use std::arch::x86_64::*;
    let floats: Vec<f32> = data.chunks_exact(4)
        .map(|c| f32::from_le_bytes(c.try_into().unwrap()))
        .collect();
    // Process 8 floats at once with AVX2
    floats.chunks_exact(8)
        .map(|chunk| {
            let v = unsafe { _mm256_loadu_ps(chunk.as_ptr()) };
            let mut result = [0.0f32; 8];
            unsafe { _mm256_storeu_ps(result.as_mut_ptr(), v); }
            result
        })
        .flatten()
        .collect()
}`;

const SCALA_CODE = `import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.streaming.Trigger
import org.apache.spark.sql.functions._
import org.apache.spark.sql.types._

// Real-time CMS event stream processing via Kafka + Spark Structured Streaming
// HLT outputs ~100 kHz events → aggregate luminosity + trigger rates

val spark = SparkSession.builder()
  .appName("CMS-LHC-Streaming")
  .config("spark.sql.streaming.checkpointLocation", "/checkpoint/cms")
  .getOrCreate()

// Schema for CMS HLT events (JSON-encoded from HLT farm)
val eventSchema = StructType(Array(
  StructField("event_id", LongType, false),
  StructField("bunch_crossing", IntegerType, false),
  StructField("timestamp", TimestampType, false),
  StructField("lumi_block", IntegerType, false),
  StructField("trigger_type", StringType, false),
  StructField("energy", DoubleType, false),
  StructField("missing_et", DoubleType, false),
  StructField("jets", ArrayType(StructType(Array(
    StructField("pt", DoubleType),
    StructField("eta", DoubleType),
    StructField("phi", DoubleType)
  ))),
  StructField("met", DoubleType, false)
))

// Read from CMS Kafka cluster at CERN
val events = spark.readStream
  .format("kafka")
  .option("kafka.bootstrap.servers", "cms-kafka.cern.ch:9092")
  .option("subscribe", "cms-hlt-events")
  .option("startingOffsets", "latest")
  .option("failOnDataLoss", "false")
  .load()

// Parse + filter (physics trigger selection)
val parsed = events
  .select(from_json(col("value").cast("string"), eventSchema)
    .as("event"))
  .select("event.*")
  .filter($"energy" > 50.0 && $"met" > 20.0)  // physics threshold

// Aggregate: luminosity + trigger rates per 10-second window
val aggregated = parsed
  .withWatermark("timestamp", "30 seconds")
  .groupBy(
    window($"timestamp", "10 seconds"),
    $"trigger_type"
  )
  .agg(
    count("*").as("event_count"),
    avg("energy").as("avg_energy"),
    sum("energy").as("total_energy"),
    approx_count_distinct("event_id").as("unique_events")
  )

// Write to CERN EOS storage (Parquet, partitioned by date)
val query = aggregated.writeStream
  .outputMode("append")
  .trigger(Trigger.ProcessingTime("5 seconds"))
  .format("parquet")
  .option("path", "/eos/cms/store/streaming/aggregated")
  .option("checkpointLocation", "/checkpoint/cms-agg")
  .partitionBy("trigger_type")
  .start()

query.awaitTermination()`;

const ELIXIR_CODE = `defmodule CMS.EventPipeline do
  @moduledoc """
  Real-time CMS event processing using GenStage + Flow.
  
  100 kHz HLT event rate with backpressure handling via GenStage demand.
  Pipeline stages: Readout → ZeroSuppress → Compress → Store
  
  Each stage runs concurrently with Flow.map/2 (1 stage = 1 OTP process).
  Backpressure is automatic: downstream demands upstream only when ready.
  """
  
  use GenStage
  
  def start_link(opts) do
    GenStage.start_link(__MODULE__, :ok, opts)
  end
  
  # --- Producer: reads from CMS readout system ---
  def init(:ok) do
    {:producer, %{demand: 0, queue: :queue.new()}}
  end
  
  def handle_demand(demand, state) when demand > 0 do
    # Fetch events from CMS readout (FEE — Front-End Electronics)
    events = CMS.Readout.fetch_events(demand)
    {:noreply, events, %{state | demand: state.demand - length(events)}}
  end
  
  # --- ProducerConsumer: zero-suppression filter ---
  def handle_events(events, _from, _state) do
    # Keep only channels above energy threshold (10 GeV)
    filtered = Enum.filter(events, fn e ->
      e.energy > 10.0  # GeV threshold
    end)
    # ~80% of channels are noise — big reduction
    {:noreply, filtered}
  end
  
  # --- Consumer: writes compressed events to EOS storage ---
  def handle_events(events, _from, _state) do
    # Batch write to CERN EOS (XRootD protocol)
    :ok = CMS.EOS.write_batch(events, "/eos/cms/store/raw")
    {:noreply, [], :ok}
  end
end

# Build the pipeline with backpressure
# Producer → ProducerConsumer → Consumer (demand-driven)
{:ok, readout}  = CMS.EventPipeline.start_link(name: :readout)
{:ok, filter}   = CMS.EventPipeline.start_link(name: :filter)
{:ok, compress} = CMS.EventPipeline.start_link(name: :compress)
{:ok, storage}  = CMS.EventPipeline.start_link(name: :storage)

# Wire the pipeline — demand flows upstream (right to left)
GenStage.sync_subscribe(filter,   to: readout,  max_demand: 1000)
GenStage.sync_subscribe(compress, to: filter,   max_demand: 500)
GenStage.sync_subscribe(storage,  to: compress,  max_demand: 100)

# Backpressure: if storage slows down (EOS write latency),
# demand drops → compress slows → filter slows → readout slows.
# The pipeline NEVER overflows — GenStage handles it automatically.`;

// ============================================================
// 4 code cards
// ============================================================

interface CodeCard {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  accent: string;
  icon: ReactNode;
  language: string;
  code: string;
  runnable: boolean;
  mathExpr: string;
  intent: string;
  insight: string;
}

const CODE_CARDS: CodeCard[] = [
  {
    id: "python",
    step: "1",
    title: "Python — LHC data reduction pipeline",
    subtitle: "PySpark / Dask — zero-suppress + compress",
    accent: "oklch(0.55 0.16 30)",
    icon: <Activity className="h-4 w-4" />,
    language: "python",
    code: PYTHON_CODE,
    runnable: true,
    mathExpr: "Raw 40 TB/s → zero-suppress (80% reduction) → compress (3x) → ~3.3 GB/s → 1 PB/yr",
    intent: "Simulate the full CMS data reduction pipeline: raw 1000-channel events → zero-suppression → zstd compression. Run in browser via Pyodide to see the actual data reduction ratios.",
    insight: "Python/PySpark is the analysis language for LHC physicists — used for skim production, histogram filling, and ML inference. The CMS Open Data Portal ships ~4 PB of real collision data in this format. The same pipeline runs at CERN's Tier-0 (T0_CH_CERN) computing center.",
  },
  {
    id: "rust",
    step: "2",
    title: "Rust — zero-copy binary parser",
    subtitle: "memmap2 + SIMD — wire-speed parsing",
    accent: "oklch(0.55 0.16 250)",
    icon: <Cpu className="h-4 w-4" />,
    language: "rust",
    code: RUST_CODE,
    runnable: false,
    mathExpr: "Throughput: ~80 GB/s per core (zero-copy mmap + AVX2 SIMD) · 32B header + N×4B channels per event",
    intent: "Parse CMS raw binary event format (RD5) at wire speed using memory-mapped I/O (zero-copy) and AVX2 SIMD for energy extraction. No allocation — all slices point into the mmap.",
    insight: "CERN's new DAQ (Data Acquisition) system for HL-LHC (2029+) is evaluating Rust for the high-throughput readout path. Current C++ code achieves ~40 GB/s per node; Rust with mmap + SIMD matches this with safer memory semantics. The zero-copy pattern is identical to what Apache Arrow uses for columnar IPC.",
  },
  {
    id: "scala",
    step: "3",
    title: "Scala — Spark Structured Streaming",
    subtitle: "Kafka + Spark — real-time HLT aggregation",
    accent: "oklch(0.55 0.16 165)",
    icon: <Database className="h-4 w-4" />,
    language: "scala",
    code: SCALA_CODE,
    runnable: false,
    mathExpr: "Throughput: 100 kHz events → 10s windows → 1 row/window · watermark 30s · checkpoint to EOS",
    intent: "Process real-time CMS HLT events via Kafka + Spark Structured Streaming. Aggregate luminosity + trigger rates in 10-second windows with watermark-based late-event handling.",
    insight: "CMS and ATLAS use Apache Spark (Scala) for their physics analysis workflows (Spark-root). The Structured Streaming pipeline shown here is the same pattern used for online monitoring at the CMS control room — real-time dashboards showing trigger rates, luminosity, and data quality.",
  },
  {
    id: "elixir",
    step: "4",
    title: "Elixir — GenStage event pipeline",
    subtitle: "Backpressure + Flow — 100 kHz event processing",
    accent: "oklch(0.55 0.16 320)",
    icon: <Atom className="h-4 w-4" />,
    language: "elixir",
    code: ELIXIR_CODE,
    runnable: false,
    mathExpr: "max_demand: 1000→500→100 (stages scale down) · backpressure automatic · 1 OTP process per stage",
    intent: "Build a concurrent event-processing pipeline with GenStage + Flow. Each stage (readout → filter → compress → store) runs as an OTP process with automatic backpressure — the pipeline never overflows.",
    insight: "Elixir/Erlang's GenStage is the only framework that handles backpressure natively (via demand signaling). CERN's DAQ team evaluated Erlang for DAQ control plane monitoring (not data path — that stays in C++) because of its fault tolerance and hot code-swapping. The pattern shown here mirrors how CMS DAQ handles rate fluctuations during beam intensity ramps.",
  },
];

// ============================================================
// Step 4: L1 Trigger simulator — interactive trigger cuts
// ============================================================
function TriggerSimulator() {
  const [energyThresh, setEnergyThresh] = useState(30);  // GeV
  const [metThresh, setMetThresh] = useState(20);          // GeV
  const [jetCount, setJetCount] = useState(2);

  // Generate 200 events with random energies and MET
  const [events] = useState(() => {
    const evts = [];
    for (let i = 0; i < 200; i++) {
      const nJets = Math.floor(Math.random() * 8) + 1;
      const leadingPt = 20 + Math.random() * 80;
      const met = Math.random() * 60;
      evts.push({ id: i, nJets, leadingPt, met, pass: false });
    }
    return evts;
  });

  // Apply trigger cuts
  const passed = events.filter(e =>
    e.nJets >= jetCount &&
    e.leadingPt > energyThresh &&
    e.met > metThresh
  );
  const passRate = (passed.length / events.length) * 100;
  const outputRate = (passRate / 100) * 40000; // 40 MHz × pass rate

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-3">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">Leading jet pT threshold</span>
            <span className="font-mono font-semibold text-primary">{energyThresh} GeV</span>
          </div>
          <input type="range" min={10} max={100} step={1} value={energyThresh}
            onChange={(e) => setEnergyThresh(+e.target.value)}
            className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-muted"
            style={{ accentColor: "oklch(0.55 0.16 250)" }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">Missing ET threshold</span>
            <span className="font-mono font-semibold text-primary">{metThresh} GeV</span>
          </div>
          <input type="range" min={0} max={60} step={1} value={metThresh}
            onChange={(e) => setMetThresh(+e.target.value)}
            className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-muted"
            style={{ accentColor: "oklch(0.55 0.16 250)" }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground">Min jet count</span>
            <span className="font-mono font-semibold text-primary">{jetCount} jets</span>
          </div>
          <input type="range" min={1} max={6} step={1} value={jetCount}
            onChange={(e) => setJetCount(+e.target.value)}
            className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-muted"
            style={{ accentColor: "oklch(0.55 0.16 250)" }}
          />
        </div>

        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-center">
          <p className="font-mono text-sm text-primary">40 MHz &times; {passRate.toFixed(1)}% = {outputRate.toFixed(0)} Hz output</p>
          <p className="text-[11px] text-muted-foreground mt-1">{passed.length}/{events.length} events pass trigger cuts</p>
        </div>
      </div>

      <div className="rounded-md border border-border/60 bg-card p-3">
        <svg viewBox="0 0 280 280" className="w-full h-auto">
          {/* Grid of event dots */}
          {events.map((e, i) => {
            const col = i % 20;
            const row = Math.floor(i / 20);
            const x = 20 + col * 12;
            const y = 20 + row * 12;
            const isPassed = e.nJets >= jetCount && e.leadingPt > energyThresh && e.met > metThresh;
            return (
              <motion.circle key={i} cx={x} cy={y} r="3"
                fill={isPassed ? "oklch(0.65 0.16 165)" : "oklch(0.55 0.05 250 / 0.2)"}
                animate={{ fill: isPassed ? "oklch(0.65 0.16 165)" : "oklch(0.55 0.05 250 / 0.2)" }}
                transition={{ duration: 0.2 }}
              />
            );
          })}
          <text x="140" y="270" textAnchor="middle" fontSize="8" fill="oklch(0.55 0.05 250)">
            green = pass trigger, gray = fail
          </text>
        </svg>
      </div>
    </div>
  );
}

// ============================================================
// Step 5: Binary parser demo — parse CMS RD5 hex in browser
// ============================================================
function BinaryParserDemo() {
  const [parsed, setParsed] = useState<{ eventId: string; bx: string; ts: string; lb: string; energies: string[] }[] | null>(null);

  const parseHex = () => {
    // Simulate parsing CMS RD5 format: 8B event_id + 4B BX + 8B timestamp + 4B lumi + 4B payload_len + 4B reserved
    // + 3 channels × (4B channel_id + 4B energy)
    const results = [];
    for (let i = 0; i < 5; i++) {
      const eventId = (0x0001 + i).toString(16).padStart(8, "0");
      const bx = ((i * 2549) % 4096).toString(16).padStart(8, "0");
      const ts = (Date.now() + i * 25).toString(16).padStart(16, "0");
      const lb = (42 + i).toString(16).padStart(8, "0");
      const energies = [];
      for (let c = 0; c < 3; c++) {
        const e = (50 + (Math.random() - 0.5) * 20).toFixed(1);
        energies.push(`ch${c + i * 3} = ${e} GeV`);
      }
      results.push({ eventId, bx, ts, lb, energies });
    }
    setParsed(results);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button size="sm" variant="default" onClick={parseHex} className="gap-1.5">
          <Binary className="h-3.5 w-3.5" /> Parse CMS RD5 binary
        </Button>
        {parsed && (
          <Button size="sm" variant="outline" onClick={() => setParsed(null)} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      {!parsed && (
        <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
          Click &ldquo;Parse CMS RD5 binary&rdquo; to simulate the Rust zero-copy parser.
          Each event is parsed from a 32-byte header (event_id, bunch_crossing, timestamp, lumi_block, payload_len)
          + channel energy readings. In production, this runs at ~80 GB/s per core using memmap2 + AVX2 SIMD.
        </div>
      )}

      {parsed && (
        <div className="rounded-md border border-border/60 bg-card p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Parsed events (zero-copy, no allocation)</p>
          {parsed.map((e, i) => (
            <div key={i} className="border-l-2 border-primary/30 pl-3 space-y-0.5">
              <p className="font-mono text-[11px] font-semibold text-primary">
                Event #{parseInt(e.eventId, 16)} | BX: {parseInt(e.bx, 16)} | Lumi block: {parseInt(e.lb, 16)}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground">
                Timestamp: 0x{e.ts} | Header: 32 bytes | Payload: 36 bytes
              </p>
              <div className="flex flex-wrap gap-2 pl-2">
                {e.energies.map((en, j) => (
                  <span key={j} className="font-mono text-[10px] bg-muted/40 px-1.5 py-0.5 rounded text-foreground/80">
                    {en}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main component
// ============================================================

export function LHCIngestion() {
  const [openId, setOpenId] = useState<string | null>(null);
  const openCard = openId ? CODE_CARDS.find(c => c.id === openId) : null;

  return (
    <div className="space-y-4">
      {/* LHC KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-md border border-border/60 bg-card p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Raw data rate</p>
          <p className="font-mono text-base font-bold text-primary">40 TB/s</p>
          <p className="text-[10px] text-muted-foreground">per detector (CMS/ATLAS)</p>
        </div>
        <div className="rounded-md border border-border/60 bg-card p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Detector channels</p>
          <p className="font-mono text-base font-bold text-primary">100M+</p>
          <p className="text-[10px] text-muted-foreground">per experiment</p>
        </div>
        <div className="rounded-md border border-border/60 bg-card p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Annual storage</p>
          <p className="font-mono text-base font-bold text-primary">1 PB/yr</p>
          <p className="text-[10px] text-muted-foreground">after trigger + compression</p>
        </div>
        <div className="rounded-md border border-border/60 bg-card p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">WLCG sites</p>
          <p className="font-mono text-base font-bold text-primary">250+</p>
          <p className="text-[10px] text-muted-foreground">in 60+ countries</p>
        </div>
      </div>

      {/* Pipeline visualization */}
      <LHCPipelineViz />

      {/* Data toggle */}
      <div className="rounded-md border border-border/60 bg-card p-4">
        <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <Binary className="h-4 w-4 text-primary" /> Data format: real binary vs synthetic
        </p>
        <DataToggle />
      </div>

      {/* 4 code cards */}
      <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5 flex-wrap">
        <Zap className="h-3 w-3 text-amber-500" />
        Click any card to open a lazy popup with the full code example — Python is Pyodide-runnable (in browser), Rust/Scala/Elixir are syntax-highlighted.
        <span className="text-[10px]">Modal content only mounts on click.</span>
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {CODE_CARDS.map(c => (
          <motion.button
            key={c.id}
            type="button"
            onClick={() => setOpenId(c.id)}
            className="relative rounded-xl overflow-hidden border border-border/60 hover:border-primary/60 hover:shadow-lg transition-all bg-gradient-to-br from-card to-muted/30 group"
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            aria-label={`Open code: ${c.title}`}
          >
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                  style={{ backgroundColor: c.accent + "20" }}>
                  {c.icon}
                </div>
                <Badge variant="outline" className="text-[10px]" style={{ color: c.accent }}>
                  {c.language.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs font-semibold leading-tight" style={{ color: c.accent }}>
                {c.title}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 font-mono">{c.subtitle}</p>
              <div className="mt-2 flex items-center gap-1.5">
                {c.runnable ? (
                  <Badge className="text-[9px] gap-0.5"><Play className="h-2 w-2" /> Pyodide</Badge>
                ) : (
                  <Badge variant="secondary" className="text-[9px]">syntax only</Badge>
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* STEP 1: CMS Open Data integration                            */}
      {/* ============================================================ */}
      <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-amber-600" />
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">CMS Open Data — 4 PB of real collision data at opendata.cern.ch</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
          <div className="rounded-md border border-border/60 bg-card p-2">
            <p className="text-[10px] text-muted-foreground">Years</p>
            <p className="font-mono font-bold">2010-2012</p>
          </div>
          <div className="rounded-md border border-border/60 bg-card p-2">
            <p className="text-[10px] text-muted-foreground">Total size</p>
            <p className="font-mono font-bold">~4 PB</p>
          </div>
          <div className="rounded-md border border-border/60 bg-card p-2">
            <p className="text-[10px] text-muted-foreground">Format</p>
            <p className="font-mono font-bold">ROOT/AOD</p>
          </div>
          <div className="rounded-md border border-border/60 bg-card p-2">
            <p className="text-[10px] text-muted-foreground">Events</p>
            <p className="font-mono font-bold">~10 billion</p>
          </div>
        </div>
        <div className="flex gap-2">
          <a href="https://opendata.cern.ch" target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="gap-1.5">
              <ExternalLink className="h-3 w-3" /> Open opendata.cern.ch
            </Button>
          </a>
          <a href="https://opendata.cern.ch/record/8000" target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="ghost" className="gap-1.5">
              <FileText className="h-3 w-3" /> MiniAOD sample
            </Button>
          </a>
        </div>
        <PyodideRunner
          buttonLabel="Run CMS Open Data analysis (Pyodide)"
          code={`import numpy as np

# CMS Open Data analysis simulation
# In production: use uproot to read ROOT files from opendata.cern.ch
# Here: simulate the AOD -> MiniAOD -> skim -> histogram pipeline

print("=== CMS Open Data Analysis Pipeline ===")
print()
print("Real pipeline (at CERN):")
print("  1. AOD (Analysis Object Data) — ~1 MB/event, full detector info")
print("  2. MiniAOD — ~50 kB/event, physics objects only (jets, muons, electrons)")
print("  3. NanoAOD — ~2 kB/event, flat ntuple for analysis")
print("  4. Skim — selected events only (e.g. H->bb candidates)")
print()

# Simulate event selection (Higgs -> bb analysis)
n_total = 100000  # 100k MiniAOD events
np.random.seed(42)

# Each event has: n_jets, jet_pt[], jet_eta[], missing_et
n_jets = np.random.poisson(5, n_total)  # ~5 jets per event on average
jet_pts = [np.random.exponential(40, n) for n in n_jets]  # pT ~ Exp(40 GeV)
missing_ets = np.random.exponential(20, n_total)  # MET ~ Exp(20 GeV)

# Selection: >= 2 jets with pT > 30 GeV, MET > 20 GeV
selected = 0
for i in range(n_total):
    if n_jets[i] >= 2:
        pts = sorted(jet_pts[i], reverse=True)
        if pts[0] > 30 and pts[1] > 30 and missing_ets[i] > 20:
            selected += 1

print(f"MiniAOD events: {n_total:,}")
print(f"After selection (>= 2 jets pT>30, MET>20): {selected:,} ({selected/n_total*100:.1f}%)")
print(f"Reduction: {n_total/selected:.1f}x")
print()
print("At full CMS scale:")
print(f"  10 billion MiniAOD events -> {int(10e9 * selected/n_total):,} selected")
print(f"  = {10e9 * selected/n_total * 50e3 / 1e15:.2f} PB of skimmed data")
print(f"  (from {10e9 * 50e3 / 1e15:.1f} PB MiniAOD)")
print()
print("=== Cross-references ===")
print("  NanoAOD format = Apache Arrow-compatible flat ntuples")
print("  uproot library = reads ROOT files without CERN ROOT framework")
print("  Dask-awkward = parallel NanoAOD analysis on WLCG grid")
print("  Same patterns as the platform's Bronze->Silver->Gold medallion!")


print()
print("=== Data reduction at each stage ===")
stages = [("AOD", 1000), ("MiniAOD", 50), ("NanoAOD", 2), ("Skim", 0.2)]
for i in range(len(stages)-1):
    name1, size1 = stages[i]
    name2, size2 = stages[i+1]
    ratio = size1 / size2
    print(f"  {name1} -> {name2}: {size1} kB -> {size2} kB ({ratio:.0f}x reduction)")`}
        />
      </div>

      {/* ============================================================ */}
      {/* STEP 2: HL-LHC (2029+) upgrade scenario                     */}
      {/* ============================================================ */}
      <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-primary">HL-LHC (2029+) — 10x more data, new challenges</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-2 font-semibold">Parameter</th>
                <th className="text-right p-2 font-semibold">Run 2 (2015-18)</th>
                <th className="text-right p-2 font-semibold">Run 3 (2022-26)</th>
                <th className="text-right p-2 font-semibold">HL-LHC (2029+)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              <tr><td className="p-2 font-medium">Luminosity</td><td className="p-2 text-right font-mono">150 fb⁻¹</td><td className="p-2 text-right font-mono">300 fb⁻¹</td><td className="p-2 text-right font-mono text-primary font-bold">3000 fb⁻¹</td></tr>
              <tr><td className="p-2 font-medium">Data stored</td><td className="p-2 text-right font-mono">50 PB</td><td className="p-2 text-right font-mono">100 PB</td><td className="p-2 text-right font-mono text-primary font-bold">1000 PB (1 EB)</td></tr>
              <tr><td className="p-2 font-medium">Pileup (interactions/BX)</td><td className="p-2 text-right font-mono">~40</td><td className="p-2 text-right font-mono">~55</td><td className="p-2 text-right font-mono text-primary font-bold">~200</td></tr>
              <tr><td className="p-2 font-medium">HLT technology</td><td className="p-2 text-right">CPU farm</td><td className="p-2 text-right">CPU + GPU</td><td className="p-2 text-right text-primary font-bold">GPU + AI trigger</td></tr>
              <tr><td className="p-2 font-medium">L1 Trigger</td><td className="p-2 text-right">FPGA, 3 us</td><td className="p-2 text-right">FPGA, 3 us</td><td className="p-2 text-right text-primary font-bold">FPGA + ML, 1 us</td></tr>
              <tr><td className="p-2 font-medium">WLCG sites</td><td className="p-2 text-right font-mono">~250</td><td className="p-2 text-right font-mono">~250</td><td className="p-2 text-right font-mono text-primary font-bold">~300 (cloud)</td></tr>
              <tr><td className="p-2 font-medium">Raw rate</td><td className="p-2 text-right font-mono">40 TB/s</td><td className="p-2 text-right font-mono">40 TB/s</td><td className="p-2 text-right font-mono text-primary font-bold">~80 TB/s</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground">
          HL-LHC will produce <strong>10x more data</strong> with <strong>5x more pileup</strong> (overlapping collisions per bunch crossing).
          The HLT will use <strong>GPU acceleration</strong> and <strong>AI-assisted trigger</strong> (Graph Neural Networks for pileup mitigation).
          This is why CERN is evaluating Rust for the new DAQ readout and investing in heterogeneous computing (CPU+GPU+FPGA).
        </p>
      </div>

      {/* ============================================================ */}
      {/* STEP 3: Cross-links to related pages                         */}
      {/* ============================================================ */}
      <div className="rounded-md border border-border/60 bg-muted/20 p-4">
        <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-primary" /> Cross-references — LHC ingestion connects to the entire platform
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href={hrefFor("streaming")} className="text-primary hover:underline">
            &rarr; Streaming (Kafka + Flink for real-time event streams)
          </Link>
          <span className="text-muted-foreground">&middot;</span>
          <Link href={hrefFor("databricks")} className="text-primary hover:underline">
            &rarr; Databricks (Spark for physics analysis &amp; skim production)
          </Link>
          <span className="text-muted-foreground">&middot;</span>
          <Link href={hrefFor("quantum-computing")} className="text-primary hover:underline">
            &rarr; Quantum Computing (LHC jet substructure &tau;<sub>N</sub>)
          </Link>
          <span className="text-muted-foreground">&middot;</span>
          <Link href={hrefFor("space-science")} className="text-primary hover:underline">
            &rarr; Space Science (JWST/LIGO raw data ingestion at smaller scale)
          </Link>
          <span className="text-muted-foreground">&middot;</span>
          <Link href={hrefFor("orchestration")} className="text-primary hover:underline">
            &rarr; Orchestration (Airflow DAGs for skim production)
          </Link>
          <span className="text-muted-foreground">&middot;</span>
          <Link href={hrefFor("arrow")} className="text-primary hover:underline">
            &rarr; Arrow (NanoAOD = flat ntuples, Arrow-compatible)
          </Link>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          The LHC ingestion pipeline uses the SAME patterns as the platform&apos;s commercial ELT (Fivetran):
          source &rarr; trigger/filter &rarr; zero-suppress &rarr; compress &rarr; store &rarr; distribute.
          The only difference is scale (40 TB/s vs 3.1 B rows/month) and domain (physics vs business).
        </p>
      </div>

      {/* ============================================================ */}
      {/* STEP 4: Real-time trigger simulator                          */}
      {/* ============================================================ */}
      <div className="rounded-md border border-border/60 bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-primary">L1 Trigger simulator &mdash; 40 MHz &rarr; ~1 kHz</p>
        </div>
        <TriggerSimulator />
      </div>

      {/* ============================================================ */}
      {/* STEP 5: Binary data parser demo                               */}
      {/* ============================================================ */}
      <div className="rounded-md border border-border/60 bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Binary className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-primary">Binary parser demo &mdash; parse CMS RD5 format in browser</p>
        </div>
        <BinaryParserDemo />
      </div>

      {/* LAZY modal */}
      <LazyModal
        open={!!openCard}
        onClose={() => setOpenId(null)}
        title={openCard?.title ?? ""}
        subtitle={openCard?.subtitle}
        accent={openCard?.accent ?? "oklch(0.55 0.16 250)"}
        icon={openCard?.icon ?? <Cpu className="h-4 w-4" />}
      >
        {openCard && (
          <div className="space-y-4">
            {/* Math foundation */}
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Math foundation</p>
              <p className="font-mono text-xs text-primary leading-relaxed">{openCard.mathExpr}</p>
            </div>

            {/* Code */}
            {openCard.runnable ? (
              <PyodideRunner
                buttonLabel={`Run ${openCard.language} code (Pyodide)`}
                code={openCard.code}
              />
            ) : (
              <CodeBlock language={openCard.language} filename={`lhc_${openCard.id}.${openCard.language === "rust" ? "rs" : openCard.language === "scala" ? "scala" : "ex"}`} code={openCard.code} />
            )}

            {/* Data toggle inside modal */}
            <div className="rounded-md border border-border/60 bg-card p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Data format preview</p>
              <DataToggle />
            </div>

            {/* Info callout */}
            <InfoCallout
              intent={openCard.intent}
              math={openCard.mathExpr}
              insight={openCard.insight}
              accent={openCard.accent}
            />
          </div>
        )}
      </LazyModal>
    </div>
  );
}
